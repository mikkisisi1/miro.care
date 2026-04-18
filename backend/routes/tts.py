"""
TTS route: /tts — Fish Audio streaming synthesis.
"""
import os
import re
import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from fish_audio_sdk import Session as FishSession, TTSRequest

from auth_utils import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

fish_api_key = os.environ.get("FISH_AUDIO_API_KEY", "")
fish_voice_male = os.environ.get("FISH_VOICE_MALE", "5cfccfb8aae14938be283ea6400b4a8a")
fish_voice_female = os.environ.get("FISH_VOICE_FEMALE", "6745990b975d4041a23ad713bcee69f5")


class TTSRequestModel(BaseModel):
    text: str
    voice: Optional[str] = "male"


def clean_text_for_tts(text: str) -> str:
    # Убираем маркеры форматирования, но СОХРАНЯЕМ содержимое
    text = re.sub(r'\*+', '', text)                          # **bold** / *italic* → текст остаётся
    text = re.sub(r'^(Нежно|Мягко|Шёпотом|Тихо|Уверенно)\s*,?\s*', '', text)
    text = re.sub(r'ПЛАН РАБОТЫ:', '', text)
    text = re.sub(r'^\d+\.\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'[#_~`>]', '', text)                      # markdown символы
    text = re.sub(r'\n{3,}', '\n\n', text)                   # лишние переносы
    return text.strip()


@router.post("/tts")
async def text_to_speech(req: TTSRequestModel, request: Request):
    # Auth optional — как в Xicon.online
    try:
        await get_current_user(request)
    except Exception:
        pass

    if not fish_api_key:
        raise HTTPException(500, "Fish Audio API key not configured")

    text = clean_text_for_tts(req.text)
    if not text:
        raise HTTPException(400, "No text to synthesize")

    voice_id = fish_voice_female if req.voice == "female" else fish_voice_male

    def generate_audio():
        try:
            fish_session = FishSession(fish_api_key)
            for chunk in fish_session.tts(TTSRequest(text=text, reference_id=voice_id)):
                if chunk:
                    yield chunk
        except Exception as e:
            logger.error(f"Fish Audio TTS streaming error: {e}")

    return StreamingResponse(
        generate_audio(),
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": "inline; filename=tts.mp3",
            "Cache-Control": "no-cache",
            "Transfer-Encoding": "chunked",
        },
    )
