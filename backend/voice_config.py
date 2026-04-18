"""
🔒 ЗАЩИЩЁННЫЙ КОНФИГ ГОЛОСОВЫХ НАСТРОЕК FISH AUDIO 🔒

⚠️ КРИТИЧНО: НЕ ИЗМЕНЯТЬ БЕЗ СОГЛАСОВАНИЯ ⚠️
Эти параметры оптимизированы для психологической консультации.
Любые изменения могут сломать эмпатичную манеру речи агентов.

ЗАПРЕЩЕНО ИЗМЕНЯТЬ:
- Voice IDs (Мирон и Оксана)
- Prosody параметры (speed, volume)
- Эмоциональные маркеры
- Правила очистки текста
"""

import os

# ========== FISH AUDIO API ==========
# 🔒 НЕ ИЗМЕНЯТЬ: API ключ из переменных окружения
FISH_API_KEY = os.environ.get("FISH_AUDIO_API_KEY", "")

# ========== FISH AUDIO BACKEND MODEL ==========
# 🔒 КРИТИЧНО: модель, поддерживающая эмоциональные маркеры (calm)(soft tone).
# speech-1.5 (default) читает маркеры как текст — НЕЛЬЗЯ.
# s1-mini — быстрая, поддерживает natural-language emotion control.
FISH_BACKEND = os.environ.get("FISH_BACKEND", "s1")

# Latency mode: "balanced" (~300ms TTFB) для стриминга / "normal" (~500ms, выше качество).
FISH_LATENCY = os.environ.get("FISH_LATENCY", "balanced")

# ========== ГОЛОСА АГЕНТОВ ==========
# 🔒 НЕ ИЗМЕНЯТЬ: ID референсных голосов для агентов
VOICE_IDS = {
    "male": os.environ.get("FISH_VOICE_MALE", "5cfccfb8aae14938be283ea6400b4a8a"),      # Мирон (мужской)
    "female": os.environ.get("FISH_VOICE_FEMALE", "fd40a0d632964604b26c5be764da3ea2"),  # Девушка (женский)
}

# ========== PROSODY НАСТРОЙКИ ==========
# 🔒 НЕ ИЗМЕНЯТЬ: Оптимизировано для профессионального, спокойного психолога
PROSODY_CONFIG = {
    "speed": 0.92,          # Живой темп с лёгким замедлением для вдумчивости (−8% от нормы)
    "volume": 4,            # Комфортная громкость (диапазон: -20 до 20)
}

# ========== ЭМОЦИОНАЛЬНЫЕ МАРКЕРЫ ==========
# 🔒 НЕ ИЗМЕНЯТЬ: Базовая эмоциональная настройка — «профессиональный, внимательный, спокойный, живой»
# Эти маркеры автоматически добавляются к тексту для создания эмпатичной манеры
EMOTION_MARKERS = {
    "base": "(calm)(professional)(confident)(attentive)",  # Профессиональный, уверенный, внимательный, спокойный
    "empathy": "(warm)(gentle)",           # Тёплый, деликатный (для валидации)
    "thoughtful": "(thoughtful)",          # Задумчивый (для рефлексии)
    "pause": "(sighing)",                  # Естественные паузы (с "хм...", "эх...")
}

# ========== ПРАВИЛА ОЧИСТКИ ТЕКСТА ==========
# 🔒 НЕ ИЗМЕНЯТЬ: Регулярные выражения для подготовки текста к TTS
# Удаляются только элементы, которые ломают озвучку (markdown, списки, и т.д.)
TEXT_CLEANUP_RULES = {
    "remove_markdown": True,        # Убрать *, #, _, ~, `, >
    "remove_numbering": True,       # Убрать нумерацию списков (1., 2., и т.д.)
    "remove_emotion_prefixes": True,  # Убрать префиксы типа "Нежно,", "Мягко,"
    "normalize_newlines": True,     # Убрать лишние переносы строк
}

# ========== МАКСИМАЛЬНАЯ ДЛИНА ТЕКСТА ==========
# 🔒 НЕ ИЗМЕНЯТЬ: Ограничение для стабильной озвучки
MAX_TTS_LENGTH = 1000  # символов (Fish Audio рекомендует до 1000 для стриминга)


def get_emotion_prefix(context: str = "base") -> str:
    """
    Получить эмоциональный префикс для текста.
    
    Args:
        context: Тип контекста ("base", "empathy", "thoughtful", "pause")
    
    Returns:
        Строка с эмоциональными маркерами
    
    🔒 НЕ ИЗМЕНЯТЬ ЭТУ ФУНКЦИЮ
    """
    return EMOTION_MARKERS.get(context, EMOTION_MARKERS["base"])


def validate_voice_id(voice: str) -> str:
    """
    Валидация и получение Voice ID.
    
    Args:
        voice: "male" или "female"
    
    Returns:
        Voice ID для Fish Audio API
    
    🔒 НЕ ИЗМЕНЯТЬ ЭТУ ФУНКЦИЮ
    """
    if voice not in VOICE_IDS:
        return VOICE_IDS["male"]  # Мирон по умолчанию
    return VOICE_IDS[voice]
