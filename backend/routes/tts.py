"""
TTS route: /tts — Fish Audio streaming synthesis with emotion control.

🔒 ЗАЩИЩЕНО ОТ ИЗМЕНЕНИЙ 🔒
Этот файл содержит критичную логику для голосовой озвучки.
Все настройки (эмоции, скорость, голоса) хранятся в voice_config.py
⚠️ НЕ ИЗМЕНЯТЬ БЕЗ СОГЛАСОВАНИЯ ⚠️
"""
import os
import re
import time
import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from auth_utils import get_current_user
from metrics import record_tts_ok, record_tts_err
# 🔒 ЗАЩИЩЁННЫЙ ИМПОРТ: Все голосовые настройки из voice_config.py
from voice_config import (
    FISH_API_KEY,
    FISH_BACKEND,
    FISH_LATENCY,
    VOICE_IDS,
    PROSODY_CONFIG,
    EMOTION_MARKERS,
    MAX_TTS_LENGTH,
    validate_voice_id,
    get_emotion_prefix,
)

logger = logging.getLogger(__name__)
router = APIRouter()


class TTSRequestModel(BaseModel):
    text: str
    voice: Optional[str] = "male"


def clean_text_for_tts(text: str) -> str:
    """
    Очистка текста для TTS озвучки.
    
    🔒 НЕ ИЗМЕНЯТЬ: Правила оптимизированы для Fish Audio.
    Удаляем только то, что ломает озвучку (markdown, списки).
    Сохраняем эмоциональные маркеры в скобках: (calm), (soft tone) и т.д.
    """
    # Убираем маркеры форматирования, но СОХРАНЯЕМ содержимое
    text = re.sub(r'\*+', '', text)                          # **bold** / *italic* → текст остаётся
    text = re.sub(r'^(Нежно|Мягко|Шёпотом|Тихо|Уверенно)\s*,?\s*', '', text)
    text = re.sub(r'ПЛАН РАБОТЫ:', '', text)
    text = re.sub(r'^\d+\.\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'[#_~`>]', '', text)                      # markdown символы
    text = re.sub(r'\n{3,}', '\n\n', text)                   # лишние переносы
    
    # 🔒 Ограничение длины для стабильной озвучки
    if len(text) > MAX_TTS_LENGTH:
        text = text[:MAX_TTS_LENGTH] + "..."
    
    return text.strip()


def add_emotion_markers(text: str) -> str:
    """
    Добавляет эмоциональные маркеры Fish Audio к тексту.
    
    🔒 НЕ ИЗМЕНЯТЬ: Автоматическая эмоциональная окраска для эмпатичной речи.
    
    Логика:
    - Базовая эмоция (calm)(soft tone) добавляется в начало
    - Если есть "хм", "эх", "ох" → добавляем (sighing) для естественных пауз
    - Если есть многоточие (...) → добавляем (thoughtful) для задумчивости
    """
    # Если уже есть эмоциональные маркеры, не дублируем
    if text.startswith("(") and ")" in text[:30]:
        return text
    
    # Базовая эмоция: спокойный, мягкий тон (всегда)
    base_emotion = get_emotion_prefix("base")
    
    # Добавляем паузы для междометий
    if any(word in text.lower() for word in ["хм", "эх", "ох", "ну"]):
        # Вставляем (sighing) перед междометием
        text = re.sub(r'\b(Хм|Эх|Ох|Ну)\b', r'(sighing) \1', text, count=1, flags=re.IGNORECASE)
    
    # Добавляем задумчивость для многоточий
    if "..." in text:
        text = text.replace("...", " (thoughtful) ...", 1)
    
    # Добавляем базовую эмоцию в начало
    return f"{base_emotion} {text}"


@router.post("/tts")
async def text_to_speech(req: TTSRequestModel, request: Request):
    """
    Потоковая TTS озвучка с Fish Audio.
    
    🔒 ЗАЩИЩЕНО: Используется стриминг + Prosody (speed, volume) + эмоции.
    ⚠️ НЕ ИЗМЕНЯТЬ параметры без тестирования на реальных пользователях.
    """
    # Auth optional — как в Xicon.online
    try:
        await get_current_user(request)
    except Exception:
        pass

    if not FISH_API_KEY:
        raise HTTPException(500, "Fish Audio API key not configured")

    # 🔒 Очистка текста для TTS
    text = clean_text_for_tts(req.text)
    if not text:
        raise HTTPException(400, "No text to synthesize")

    # 🔒 Добавление эмоциональных маркеров
    text = add_emotion_markers(text)

    # 🔒 Валидация voice ID
    voice_id = validate_voice_id(req.voice or "male")

    logger.info(f"TTS Request | Voice: {req.voice} | Text length: {len(text)} | Backend: {FISH_BACKEND} | Latency: {FISH_LATENCY} | Speed: {PROSODY_CONFIG['speed']}")

    def generate_audio():
        """
        Генератор стриминга аудио с Fish Audio.
        
        🔒 НЕ ИЗМЕНЯТЬ: Использует Prosody для контроля скорости и громкости.
        """
        t0 = time.perf_counter()
        first_chunk_sent = False
        try:
            # Lazy import — fish_audio_sdk takes ~400ms to import; deferring
            # keeps uvicorn cold-start under the deploy health-check window.
            from fish_audio_sdk import Session as FishSession, TTSRequest, Prosody
            # 🔒 Создание сессии Fish Audio
            fish_session = FishSession(FISH_API_KEY)
            
            # 🔒 КРИТИЧНО: Создание объекта Prosody для контроля речи
            prosody = Prosody(
                speed=PROSODY_CONFIG["speed"],    # 0.88 = медленнее для спокойной речи
                volume=PROSODY_CONFIG["volume"]   # 4 dB для комфортной громкости
            )
            
            # 🔒 Создание TTS запроса с эмоциями и Prosody
            tts_request = TTSRequest(
                text=text,
                reference_id=voice_id,
                prosody=prosody,      # 🔒 ЗАЩИЩЕНО: параметры из voice_config.py
                format="mp3",
                latency=FISH_LATENCY,  # "balanced" для низкой задержки стриминга
            )
            
            # Стриминг аудио чанков (backend=s1-mini поддерживает (calm)(soft tone))
            for chunk in fish_session.tts(tts_request, backend=FISH_BACKEND):
                if chunk:
                    if not first_chunk_sent:
                        record_tts_ok(int((time.perf_counter() - t0) * 1000))
                        first_chunk_sent = True
                    yield chunk
                    
        except Exception as e:
            record_tts_err()
            logger.error(f"Fish Audio TTS streaming error: {e}")
            # В случае ошибки возвращаем пустой чанк (чтобы не ломать стрим)

    return StreamingResponse(
        generate_audio(),
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": "inline; filename=tts.mp3",
            "Cache-Control": "no-cache, no-store",
            "Transfer-Encoding": "chunked",
            "X-Accel-Buffering": "no",  # отключаем буферизацию в nginx/ingress для мгновенного стриминга
            # 🔒 Заголовки для отладки
            "X-Voice-Config": f"backend={FISH_BACKEND},latency={FISH_LATENCY},speed={PROSODY_CONFIG['speed']},volume={PROSODY_CONFIG['volume']}",
            "X-Emotion-Mode": "empathic-psychologist",
        },
    )
