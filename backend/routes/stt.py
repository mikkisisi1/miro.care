"""
STT route: /stt — Whisper-based speech-to-text transcription.
Fallback for browsers that don't support Web Speech API.
"""
import os
import logging
import tempfile
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from typing import Optional

from auth_utils import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

LANG_MAP = {
    "ru": "ru", "en": "en", "zh": "zh", "es": "es",
    "ar": "ar", "fr": "fr", "de": "de", "hi": "hi",
}


@router.post("/stt")
async def speech_to_text(
    request: Request,
    audio: UploadFile = File(...),
    language: Optional[str] = Form("ru"),
):
    # Auth optional — как в Xicon.online
    try:
        await get_current_user(request)
    except Exception:
        pass

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(500, "STT API key not configured")

    # Read uploaded audio
    audio_bytes = await audio.read()
    if len(audio_bytes) == 0:
        raise HTTPException(400, "Empty audio file")
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(400, "Audio file too large (max 25MB)")

    # Determine file extension from content type
    content_type = audio.content_type or ""
    ext = ".webm"
    if "mp3" in content_type or "mpeg" in content_type:
        ext = ".mp3"
    elif "wav" in content_type:
        ext = ".wav"
    elif "mp4" in content_type:
        ext = ".mp4"
    elif "ogg" in content_type:
        ext = ".ogg"

    whisper_lang = LANG_MAP.get(language, "ru")

    try:
        # Lazy import — avoids paying the ~1.7s `emergentintegrations.llm.openai`
        # cost on every server cold start.
        from emergentintegrations.llm.openai import OpenAISpeechToText
        stt = OpenAISpeechToText(api_key=api_key)

        # Write to temp file for Whisper
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        with open(tmp_path, "rb") as audio_file:
            response = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                response_format="json",
                language=whisper_lang,
                temperature=0.0,
            )

        # Clean up temp file
        os.unlink(tmp_path)

        text = response.text.strip() if response and response.text else ""
        return {"text": text}

    except Exception as e:
        logger.error(f"Whisper STT error: {e}")
        # Clean up temp file on error
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
        raise HTTPException(500, f"Transcription failed: {str(e)}")
