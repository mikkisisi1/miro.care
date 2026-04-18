"""
Chat routes: /chat, /chat/image, /chat/history, /chat/sessions
Includes AI logic (OpenRouter + DuckDuckGo search).
"""
import os
import re
import asyncio
import logging
from collections import OrderedDict
from datetime import datetime, timezone
from typing import Optional, Dict
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from bson import ObjectId
from openai import AsyncOpenAI

from database import db
from auth_utils import get_current_user
from config import SYSTEM_PROMPT, PROBLEMS

logger = logging.getLogger(__name__)

router = APIRouter()

# ---------- OPENROUTER CLIENT ----------
openrouter_client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY", ""),
    default_headers={
        "HTTP-Referer": "https://miro.care",
        "X-OpenRouter-Title": "Miro.Care",
    }
)

# ---------- IN-MEMORY SESSION HISTORIES (LRU-capped) ----------
MAX_SESSIONS = 500
chat_histories: "OrderedDict[str, list]" = OrderedDict()


def _touch_session(session_id: str) -> None:
    """Mark session as most-recently-used and evict oldest if over cap."""
    if session_id in chat_histories:
        chat_histories.move_to_end(session_id)
    while len(chat_histories) > MAX_SESSIONS:
        chat_histories.popitem(last=False)

# ---------- MODELS ----------
class ChatRequest(BaseModel):
    message: str
    session_id: str
    agent_id: Optional[str] = None
    language: Optional[str] = "ru"
    problem: Optional[str] = None


class ChatImageRequest(BaseModel):
    session_id: str
    image: str
    language: Optional[str] = "ru"
    problem: Optional[str] = None


# ---------- HELPERS ----------
SEARCH_TAG_RE = re.compile(r'\[SEARCH:\s*(.+?)\]')

# Маркеры эмоций Fish Audio (`(calm)`, `(soft tone)`, `(warm)(gentle)`, ...),
# которые LLM иногда вставляет в ответ, хотя это служебные теги для TTS.
# Вырезаем их из текста, который уходит пользователю — TTS добавит свои в tts.py.
# Матчит только короткие ASCII-фразы в скобках (1-3 слова, буквы+пробел+дефис),
# чтобы не задеть легитимные русские/английские вставки с заглавными буквами или цифрами.
EMOTION_MARKER_RE = re.compile(r'\(\s*[a-z][a-z\s\-]{0,30}\)', re.IGNORECASE)


def strip_emotion_markers(text: str) -> str:
    """Убирает Fish Audio emotion-маркеры из текста для пользователя."""
    if not text:
        return text
    cleaned = EMOTION_MARKER_RE.sub('', text)
    # Схлопываем лишние пробелы, появившиеся после удаления маркеров
    cleaned = re.sub(r'[ \t]{2,}', ' ', cleaned)
    cleaned = re.sub(r' +([.,!?…:;])', r'\1', cleaned)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    return cleaned.strip()

SEARCH_INSTRUCTION = """

ИНСТРУМЕНТ ПОИСКА:
Если тебе нужна актуальная информация из интернета (телефон доверия, горячая линия, конкретный факт, ресурс помощи) — напиши в ответе тег:
[SEARCH: запрос]
Например: [SEARCH: телефон доверия Россия]
Система выполнит поиск и даст тебе результаты. После этого ты дашь финальный ответ пользователю.
Используй поиск ТОЛЬКО когда действительно нужна актуальная информация. Не используй для обычного разговора."""


def find_problem_context(problem: Optional[str]) -> str:
    if not problem:
        return ""
    for p in PROBLEMS:
        if p["id"] == problem:
            return f"\n\nПользователь выбрал проблему: {p['name']}. Учитывай это в диалоге."
    return ""


async def load_personal_context(user_id: Optional[str]) -> str:
    if not user_id:
        return ""
    try:
        user_doc = await db.users.find_one(
            {"_id": ObjectId(user_id)},
            {"user_display_name": 1, "session_notes": 1}
        )
        if not user_doc:
            return ""
        parts = []
        name = user_doc.get("user_display_name")
        if name:
            parts.append(f"\n\nИмя пользователя: {name}. Обращайся по имени.")
        notes = user_doc.get("session_notes")
        if notes:
            parts.append(f"\n\nКонтекст из прошлых сессий: {notes}")
        return "".join(parts)
    except Exception:
        return ""


def extract_user_name(message: str) -> Optional[str]:
    msg_lower = message.lower().strip()
    for pattern in ["меня зовут ", "я — ", "я - ", "зовите меня ", "my name is ", "i'm ", "i am "]:
        if pattern in msg_lower:
            after = message[msg_lower.index(pattern) + len(pattern):].strip()
            candidate = after.split()[0].strip(".,!?;:") if after else None
            if candidate and 1 < len(candidate) < 30:
                return candidate.capitalize()
    return None


def ddg_search(query: str, max_results: int = 3) -> str:
    try:
        from duckduckgo_search import DDGS
        results = DDGS().text(query, max_results=max_results)
        if not results:
            return "Поиск не дал результатов."
        return "\n".join(f"- {r.get('title', '')}: {r.get('body', '')}" for r in results)
    except Exception as e:
        logger.warning(f"DDG search error: {e}")
        return "Не удалось выполнить поиск."


async def call_openrouter(messages: list, model: str = "anthropic/claude-sonnet-4.5") -> str:
    try:
        response = await openrouter_client.chat.completions.create(
            model=model, messages=messages, max_tokens=1500, temperature=0.7,
        )
        return response.choices[0].message.content
    except Exception as e:
        if model == "anthropic/claude-sonnet-4.5":
            logger.warning(f"Claude Sonnet error, falling back to Mistral: {e}")
            response = await openrouter_client.chat.completions.create(
                model="mistralai/mistral-small-3.1-24b-instruct",
                messages=messages, max_tokens=1500, temperature=0.7,
            )
            return response.choices[0].message.content
        raise


def _trim_messages(messages: list, max_len: int = 31) -> list:
    """Keep system message + last N messages to stay within context window."""
    if len(messages) > max_len:
        return [messages[0]] + messages[-max_len + 1:]
    return messages


async def _handle_search_tag(session_id: str, ai_text: str) -> str:
    """If AI response contains [SEARCH: ...], execute search and get final answer."""
    search_match = SEARCH_TAG_RE.search(ai_text)
    if not search_match:
        return ai_text

    search_query = search_match.group(1).strip()
    logger.info(f"AI requested search: '{search_query}'")
    search_results = ddg_search(search_query)

    chat_histories[session_id].append({"role": "assistant", "content": ai_text})
    chat_histories[session_id].append({
        "role": "user",
        "content": (
            f"[Результаты поиска по запросу '{search_query}']\n{search_results}\n\n"
            "[Используй эти данные чтобы дать финальный ответ пользователю. "
            "НЕ показывай тег [SEARCH]. Дай готовый ответ.]"
        ),
    })

    messages = _trim_messages(chat_histories[session_id])
    return await call_openrouter(messages)


async def _init_session(session_id: str, problem: Optional[str], language: str, user_id: Optional[str]) -> None:
    """Initialize or update chat session with system prompt."""
    language = language or "ru"
    problem_context = find_problem_context(problem)
    personal_context = await load_personal_context(user_id)
    lang_instruction = f"\n\nОтвечай на языке: {language}"
    system_msg = SYSTEM_PROMPT + SEARCH_INSTRUCTION + problem_context + personal_context + lang_instruction

    if session_id in chat_histories:
        # Update system prompt if language changed
        chat_histories[session_id][0] = {"role": "system", "content": system_msg}
        _touch_session(session_id)
        return

    chat_histories[session_id] = [{"role": "system", "content": system_msg}]
    _touch_session(session_id)


async def _save_name_if_found(user_id: str, message: str, free_count: int) -> None:
    """Extract and save user name from message if not already set."""
    name_extracted = extract_user_name(message)
    if not name_extracted and len(message.split()) <= 2 and free_count >= 1:
        candidate = message.strip().strip(".,!?;:")
        if candidate and 1 < len(candidate) < 30 and candidate[0].isupper():
            name_extracted = candidate.split()[0]
    if name_extracted:
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"user_display_name": name_extracted}}
        )


# ---------- SESSION NOTES (cross-session memory) ----------
NOTES_SUMMARY_PROMPT = """Ты — психологический ассистент. На основе диалога создай краткий контекст для следующей сессии.

Напиши 4-6 предложений, включая:
— ключевые темы и проблемы, которые обсуждались
— эмоциональное состояние пользователя (тревога, апатия, норма и т.д.)
— что было предложено или попробовано
— любые важные личные детали, упомянутые пользователем

Пиши лаконично, только факты. Без приветствий и заголовков. Это внутренние заметки для следующего сеанса."""


async def update_session_notes(user_id: str, session_id: str) -> None:
    """Background task: summarise conversation and persist to users.session_notes."""
    try:
        msgs = await db.chat_messages.find(
            {"user_id": user_id, "session_id": session_id},
            {"_id": 0, "user_message": 1, "ai_response": 1, "timestamp": 1},
        ).sort("timestamp", -1).limit(30).to_list(30)

        if not msgs:
            return

        msgs.reverse()
        dialogue_lines = []
        for m in msgs:
            if m.get("user_message") and m["user_message"] != "[image]":
                dialogue_lines.append(f"Пользователь: {m['user_message']}")
            if m.get("ai_response"):
                dialogue_lines.append(f"Ассистент: {m['ai_response'][:300]}")

        if not dialogue_lines:
            return

        dialogue_text = "\n".join(dialogue_lines)
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        user_doc = await db.users.find_one({"_id": ObjectId(user_id)}, {"session_notes": 1})
        prev_notes = (user_doc or {}).get("session_notes") or ""

        summarise_messages = [
            {"role": "system", "content": NOTES_SUMMARY_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Дата сессии: {today}\n\n"
                    f"Диалог:\n{dialogue_text}\n\n"
                    + (f"Контекст предыдущих сессий:\n{prev_notes}\n\n" if prev_notes else "")
                    + "Напиши обновлённые заметки, включая новую информацию из этого диалога."
                ),
            },
        ]

        new_notes = await call_openrouter(summarise_messages, model="anthropic/claude-sonnet-4.5")
        new_notes = new_notes.strip()[:1500]

        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {
                "session_notes": new_notes,
                "session_notes_updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        logger.info(f"Session notes updated for user {user_id} (session {session_id})")
    except Exception as e:
        logger.warning(f"Session notes update failed for user {user_id}: {e}")


def check_user_access(user: dict) -> tuple:
    free_count = user.get("free_messages_count", 0)
    has_minutes = (user.get("minutes_left", 0) or 0) > 0
    is_free_phase = free_count < 12
    return is_free_phase, has_minutes, free_count


def build_counter_updates(user: dict, is_free_phase: bool, free_count: int, ai_response: str) -> dict:
    update_fields = {}
    if is_free_phase:
        update_fields["free_messages_count"] = free_count + 2
    else:
        new_used = (user.get("minutes_used", 0) or 0) + 1
        new_left = max(0, (user.get("minutes_left", 0) or 0) - 1)
        update_fields["minutes_used"] = new_used
        update_fields["minutes_left"] = new_left
    if "ПЛАН РАБОТЫ" in ai_response or "PLAN" in ai_response.upper():
        update_fields["last_plan"] = ai_response
    return update_fields


# ---------- ENDPOINTS ----------
@router.post("/chat")
async def chat_endpoint(req: ChatRequest, request: Request):
    # Мягкая авторизация — как в Xicon.online
    try:
        user = await get_current_user(request)
    except Exception:
        # Без токена — работаем анонимно
        user = {"_id": None, "free_messages_count": 0, "minutes_left": 999, "is_paid_session_active": True, "selected_language": "ru"}
    user_id = user["_id"]

    is_free_phase, has_minutes, free_count = check_user_access(user)
    if not is_free_phase and not has_minutes:
        return {
            "message": "Ваши бесплатные сообщения закончились. Пожалуйста, выберите тариф для продолжения.",
            "type": "tariff_prompt",
            "needs_tariff": True,
        }

    session_id = f"{user_id or 'anon'}_{req.session_id}"
    try:
        await _init_session(
            session_id,
            req.problem or user.get("selected_problem"),
            req.language or user.get("selected_language", "ru"),
            user_id,
        )

        chat_histories[session_id].append({"role": "user", "content": req.message})
        messages = _trim_messages(chat_histories[session_id])
        ai_response = await call_openrouter(messages)
        ai_response = await _handle_search_tag(session_id, ai_response)
        ai_response = strip_emotion_markers(ai_response)
        chat_histories[session_id].append({"role": "assistant", "content": ai_response})

        # DB операции только для авторизованных (не анонимов)
        if user_id:
            await db.chat_messages.insert_one({
                "user_id": user_id,
                "session_id": req.session_id,
                "user_message": req.message,
                "ai_response": ai_response,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "problem": req.problem or user.get("selected_problem"),
            })

            if not user.get("user_display_name"):
                await _save_name_if_found(user_id, req.message, free_count)

            update_fields = build_counter_updates(user, is_free_phase, free_count, ai_response)
            if update_fields:
                await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})

            user_msg_count = sum(1 for m in chat_histories.get(session_id, []) if m.get("role") == "user")
            if user_msg_count > 0 and user_msg_count % 6 == 0:
                asyncio.create_task(update_session_notes(user_id, req.session_id))

        # Determine fresh minutes_left for response (post-update value)
        if is_free_phase:
            minutes_left_out = None
        else:
            minutes_left_out = max(0, (user.get("minutes_left", 0) or 0) - 1)

        return {
            "message": ai_response,
            "type": "ai_response",
            "needs_tariff": free_count + 2 >= 12 and not has_minutes,
            "minutes_left": minutes_left_out,
            "is_free_phase": is_free_phase,
        }
    except Exception as e:
        logger.error(f"Chat error: {e}")
        err_str = str(e)
        # Bubble up a cleaner message for unconfigured/invalid provider keys
        if "401" in err_str or "No cookie auth credentials" in err_str or "Unauthorized" in err_str:
            raise HTTPException(503, "AI provider key not configured. Please set OPENROUTER_API_KEY.")
        raise HTTPException(500, f"Chat error: {err_str}")


@router.post("/chat/image")
async def chat_image_endpoint(req: ChatImageRequest, request: Request):
    try:
        user = await get_current_user(request)
    except Exception:
        user = {"_id": None, "free_messages_count": 0, "minutes_left": 999, "is_paid_session_active": True, "selected_language": "ru"}
    user_id = user["_id"]

    is_free_phase, has_minutes, free_count = check_user_access(user)
    if not is_free_phase and not has_minutes:
        return {
            "response": "Ваши бесплатные сообщения закончились. Пожалуйста, выберите тариф.",
            "type": "tariff_prompt",
            "needs_tariff": True,
        }

    session_id = f"{user_id or 'anon'}_{req.session_id}"
    lang = req.language or user.get("selected_language", "ru")

    await _init_session(session_id, req.problem or user.get("selected_problem"), lang, user_id)
    chat_histories[session_id].append({"role": "user", "content": "[Пользователь отправил фото]"})

    vision_msg = {
        "role": "user",
        "content": [
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{req.image}"}},
            {"type": "text", "text": f"Пользователь отправил фото. Опиши что видишь и дай психологический комментарий. Отвечай на языке: {lang}"},
        ],
    }

    messages = chat_histories[session_id][:-1] + [vision_msg]
    messages = _trim_messages(messages)

    try:
        ai_text = await call_openrouter(messages)
    except Exception as e:
        logger.error(f"Image chat error: {e}")
        try:
            fallback_msgs = [m for m in chat_histories[session_id] if isinstance(m.get("content"), str)]
            fallback_msgs.append({
                "role": "user",
                "content": f"Пользователь отправил фото. Поблагодари за доверие и спроси, что на фото. Отвечай на языке: {lang}",
            })
            ai_text = await call_openrouter(fallback_msgs[-20:], model="mistralai/mistral-small-3.1-24b-instruct")
        except Exception as e2:
            logger.error(f"Image chat fallback error: {e2}")
            raise HTTPException(500, f"Image analysis error: {str(e)}")

    ai_text = strip_emotion_markers(ai_text)
    chat_histories[session_id].append({"role": "assistant", "content": ai_text})

    if user_id:
        await db.chat_messages.insert_one({
            "user_id": user_id,
            "session_id": req.session_id,
            "user_message": "[image]",
            "ai_response": ai_text,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "problem": req.problem or user.get("selected_problem"),
        })

        update_fields = build_counter_updates(user, is_free_phase, free_count, ai_text)
        if update_fields:
            await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})

    return {
        "response": ai_text,
        "type": "ai_response",
        "needs_tariff": free_count + 2 >= 12 and not has_minutes,
    }


@router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str, request: Request):
    user = await get_current_user(request)
    messages = await db.chat_messages.find(
        {"user_id": user["_id"], "session_id": session_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(200)
    return {"messages": messages}


@router.get("/chat/notes")
async def get_session_notes(request: Request):
    user = await get_current_user(request)
    doc = await db.users.find_one(
        {"_id": ObjectId(user["_id"])},
        {"_id": 0, "session_notes": 1, "session_notes_updated_at": 1},
    )
    return {
        "notes": (doc or {}).get("session_notes") or "",
        "updated_at": (doc or {}).get("session_notes_updated_at") or None,
    }


@router.delete("/chat/notes")
async def clear_session_notes(request: Request):
    user = await get_current_user(request)
    await db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$unset": {"session_notes": "", "session_notes_updated_at": ""}},
    )
    return {"message": "Session notes cleared"}


@router.get("/chat/sessions")
async def get_chat_sessions(request: Request):
    user = await get_current_user(request)
    pipeline = [
        {"$match": {"user_id": user["_id"]}},
        {"$sort": {"timestamp": -1}},
        {"$group": {
            "_id": "$session_id",
            "last_timestamp": {"$first": "$timestamp"},
            "last_message": {"$first": "$user_message"},
            "message_count": {"$sum": 1},
        }},
        {"$sort": {"last_timestamp": -1}},
        {"$limit": 10},
    ]
    sessions = await db.chat_messages.aggregate(pipeline).to_list(10)
    return {"sessions": [
        {
            "session_id": s["_id"],
            "last_timestamp": s["last_timestamp"],
            "preview": (s.get("last_message") or "")[:60],
            "count": s["message_count"],
        }
        for s in sessions
    ]}
