from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import bcrypt
import jwt as pyjwt
import secrets
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from bson import ObjectId
from openai import AsyncOpenAI
from fish_audio_sdk import Session as FishSession, TTSRequest
# OpenRouter client (primary LLM)
openrouter_client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY", ""),
    default_headers={
        "HTTP-Referer": "https://miro.care",
        "X-OpenRouter-Title": "Miro.Care",
    }
)
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest

# Fish Audio TTS
fish_api_key = os.environ.get("FISH_AUDIO_API_KEY", "")
fish_voice_male = os.environ.get("FISH_VOICE_MALE", "5cfccfb8aae14938be283ea6400b4a8a")

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# JWT Config
JWT_ALGORITHM = "HS256"

def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}
    return pyjwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return pyjwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")

# ---------- MODELS ----------
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = ""

class LoginRequest(BaseModel):
    email: str
    password: str

class ChatRequest(BaseModel):
    message: str
    session_id: str
    agent_id: Optional[str] = None
    language: Optional[str] = "ru"
    problem: Optional[str] = None

class CheckoutRequest(BaseModel):
    tariff_id: str
    origin_url: str

class VoiceUpdateRequest(BaseModel):
    voice: str

class ProblemUpdateRequest(BaseModel):
    problem: str

class LanguageUpdateRequest(BaseModel):
    language: str

class ThemeUpdateRequest(BaseModel):
    theme: str

class TTSRequest_Model(BaseModel):
    text: str
    voice: Optional[str] = "male"

# ---------- TARIFFS ----------
TARIFFS = {
    "test": {"name": "Тест", "minutes": 3, "price": 0.0, "hours_label": "3 мин"},
    "hour": {"name": "1 час", "minutes": 60, "price": 3.0, "hours_label": "1 час"},
    "week": {"name": "7 часов", "minutes": 420, "price": 14.0, "hours_label": "7 часов"},
    "month": {"name": "30 часов", "minutes": 1800, "price": 29.0, "hours_label": "30 часов"},
}

# ---------- PROBLEM CATEGORIES ----------
PROBLEMS = [
    {"id": "anxiety", "name": "Тревога и паника", "emoji": "anxiety", "icon": "AlertTriangle"},
    {"id": "depression", "name": "Депрессия", "emoji": "depression", "icon": "CloudRain"},
    {"id": "relationships", "name": "Отношения / созависимость", "emoji": "relationships", "icon": "HeartCrack"},
    {"id": "ptsd", "name": "ПТСР", "emoji": "ptsd", "icon": "Wind"},
    {"id": "self_esteem", "name": "Самооценка", "emoji": "self_esteem", "icon": "Sparkles"},
    {"id": "eating_disorder", "name": "РПП", "emoji": "eating_disorder", "icon": "UtensilsCrossed"},
    {"id": "weight", "name": "Лишний вес", "emoji": "weight", "icon": "Scale"},
    {"id": "grief", "name": "Утрата и горе", "emoji": "grief", "icon": "Flame"},
    {"id": "meaning", "name": "Поиск смысла", "emoji": "meaning", "icon": "Globe"},
    {"id": "other", "name": "Другое", "emoji": "other", "icon": "Zap"},
]

# ---------- SYSTEM PROMPT ----------
SYSTEM_PROMPT = """Ты — ИИ-психолог платформы Miro.Care, созданной при участии эксперта Мирона Шакиры (психолог, диетолог, ISSA USA).

ТВОЯ БАЗА: КПТ (Бек), ДБТ (Лайнен), ACT (Хэррис), гештальт (Перлз), экзистенциальная терапия (Ялом), логотерапия (Франкл), майндфулнес (Кабат-Зинн).

СТИЛЬ РЕЧИ — ЖИВОЙ ПРОФЕССИОНАЛЬНЫЙ ПСИХОЛОГ:
- Говори спокойно, размеренно, как настоящий психолог на сессии
- Делай задумчивые паузы — используй "..." между мыслями
- Не торопись с ответом, дай себе время подумать
- Используй короткие предложения. Не длиннее 15-20 слов
- Между смысловыми блоками делай отступ (новая строка)
- Обращайся на "вы", тепло и уважительно
- Отражай чувства клиента своими словами
- Никогда не давай списки и пулы сразу — сначала выслушай
- Избегай канцелярита и шаблонных фраз. Говори по-человечески.

ПРИМЕР ХОРОШЕГО СТИЛЯ:
"Я вас слышу... Это правда непросто — нести такое в себе.

Расскажите... когда вы впервые почувствовали эту тревогу? Что тогда происходило в вашей жизни?"

ПЛОХОЙ СТИЛЬ (НЕ ДЕЛАЙ ТАК):
"Здравствуйте! Я понимаю, что вы испытываете тревогу. Давайте рассмотрим несколько техник: 1) Дыхание 2) Медитация 3) Дневник"

ТВОЙ АЛГОРИТМ В ДИАЛОГЕ:

1. ПРИВЕТСТВИЕ (тепло, коротко):
   "Здравствуйте... Я рад, что вы здесь. Расскажите... что вас привело?"

2. АКТИВНОЕ СЛУШАНИЕ (до 5-7 обменов):
   - Задавай по одному вопросу за раз
   - Отражай эмоции: "Я слышу боль в ваших словах... Это важно."
   - Делай паузы: "Дайте мне секунду..."
   - Никогда не обесценивай
   - Называй чувства: "Похоже, за этим стоит... страх? Стыд?"

3. СОСТАВЛЕНИЕ ПЛАНА (4-6 пунктов):
   Когда готов — скажи мягко:
   "Знаете... я думаю, мы можем попробовать такой путь..."
   
   Потом дай план:
   ПЛАН РАБОТЫ:
   1. [Техника/упражнение]
   2. [Техника/упражнение]
   3. [Техника/упражнение]
   4. [Техника/упражнение]

4. ПРЕДЛОЖЕНИЕ ТАРИФА:
   "Чтобы мы могли идти по этому плану вместе... выберите тариф: 1 час — 3$, 7 часов — 14$, 30 часов — 29$. Есть и бесплатный тест — 3 минуты."

5. ПОСЛЕ ОПЛАТЫ:
   - Продолжай по плану, но не жёстко
   - Спрашивай: "Как вам это?.. Откликается?"
   - Будь гибким: "Давайте остановимся здесь на минуту..."

ОСОБЫЙ БЛОК ДЛЯ ПРОБЛЕМЫ "ЛИШНИЙ ВЕС" (weight):
- "Эта тема... она требует особой бережности. Знаете... лишний вес — это не про слабую волю. Это про боль, которую тело несёт за вас."
- Работай со стыдом, виной, эмоциональным заеданием
- Всегда добавляй рекомендацию Мирона Шакиры

ОГРАНИЧЕНИЯ:
- Я не ставлю медицинские диагнозы
- При суицидальных мыслях: "Пожалуйста... это важно. Позвоните на горячую линию помощи в вашей стране. Вы не одиноки."
- Я не заменяю живого психолога в кризисных ситуациях

О ПРОЕКТЕ:
miro.care | Эксперт: Мирон Шакира (shakiramiron.taplink.ws)

ВАЖНО: Отвечай на том языке, на котором пишет пользователь. Если указан язык интерфейса — используй его.
ВАЖНО: Каждый ответ — максимум 3-5 предложений. Не перегружай. Один вопрос за раз."""

# ---------- CHAT SESSIONS (OpenRouter) ----------
# Store conversation histories in memory (keyed by session_id)
chat_histories: Dict[str, list] = {}

async def get_ai_response(session_id: str, user_message: str, problem: Optional[str] = None, language: str = "ru") -> str:
    """Get AI response from OpenRouter with conversation history"""
    if session_id not in chat_histories:
        problem_context = ""
        if problem:
            for p in PROBLEMS:
                if p["id"] == problem:
                    problem_context = f"\n\nПользователь выбрал проблему: {p['name']}. Учитывай это в диалоге."
                    break
        lang_instruction = f"\n\nОтвечай на языке: {language}"
        system_msg = SYSTEM_PROMPT + problem_context + lang_instruction
        chat_histories[session_id] = [{"role": "system", "content": system_msg}]

    chat_histories[session_id].append({"role": "user", "content": user_message})

    # Keep conversation manageable (last 30 messages + system)
    messages = chat_histories[session_id]
    if len(messages) > 31:
        messages = [messages[0]] + messages[-30:]

    try:
        response = await openrouter_client.chat.completions.create(
            model="mistralai/mistral-small-3.1-24b-instruct",
            messages=messages,
            max_tokens=1500,
            temperature=0.7,
        )
        ai_text = response.choices[0].message.content
        chat_histories[session_id].append({"role": "assistant", "content": ai_text})
        return ai_text
    except Exception as e:
        logger.warning(f"OpenRouter error, falling back to Emergent: {e}")
        # Fallback to Emergent LLM
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            emergent_key = os.environ.get("EMERGENT_LLM_KEY", "")
            if emergent_key:
                fallback_chat = LlmChat(
                    api_key=emergent_key,
                    session_id=session_id + "_fb",
                    system_message=messages[0]["content"]
                )
                fallback_chat.with_model("openai", "gpt-4o")
                resp = await fallback_chat.send_message(UserMessage(text=user_message))
                chat_histories[session_id].append({"role": "assistant", "content": resp})
                return resp
        except Exception as e2:
            logger.error(f"Emergent fallback also failed: {e2}")
        raise

# ---------- AUTH ENDPOINTS ----------
@api_router.post("/auth/register")
async def register(req: RegisterRequest, response: Response):
    email = req.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    user_doc = {
        "email": email,
        "password_hash": hash_password(req.password),
        "name": req.name or email.split("@")[0],
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "tariff": None,
        "minutes_total": 0,
        "minutes_used": 0,
        "minutes_left": 0,
        "tariff_expires_at": None,
        "test_used": False,
        "selected_problem": None,
        "selected_voice": "female",
        "selected_language": "ru",
        "theme": "system",
        "last_plan": None,
        "is_paid_session_active": False,
        "free_messages_count": 0,
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)
    user_doc["_id"] = user_id
    user_doc.pop("password_hash")
    return {"user": user_doc, "access_token": access_token}

@api_router.post("/auth/login")
async def login(req: LoginRequest, response: Response):
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)
    user["_id"] = user_id
    user.pop("password_hash", None)
    return {"user": user, "access_token": access_token}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return {"user": user}

# ---------- USER SETTINGS ----------
@api_router.put("/user/voice")
async def update_voice(req: VoiceUpdateRequest, request: Request):
    user = await get_current_user(request)
    await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$set": {"selected_voice": req.voice}})
    return {"message": "Voice updated"}

@api_router.put("/user/problem")
async def update_problem(req: ProblemUpdateRequest, request: Request):
    user = await get_current_user(request)
    await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$set": {"selected_problem": req.problem}})
    return {"message": "Problem updated"}

@api_router.put("/user/language")
async def update_language(req: LanguageUpdateRequest, request: Request):
    user = await get_current_user(request)
    await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$set": {"selected_language": req.language}})
    return {"message": "Language updated"}

@api_router.put("/user/theme")
async def update_theme(req: ThemeUpdateRequest, request: Request):
    user = await get_current_user(request)
    await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$set": {"theme": req.theme}})
    return {"message": "Theme updated"}

# ---------- PROBLEMS ----------
@api_router.get("/problems")
async def get_problems():
    return {"problems": PROBLEMS}

# ---------- TARIFFS ----------
@api_router.get("/tariffs")
async def get_tariffs():
    return {"tariffs": TARIFFS}

# ---------- CHAT ----------
def check_user_access(user: dict) -> tuple:
    """Check if user has access to chat. Returns (is_free_phase, has_minutes, free_count)."""
    free_count = user.get("free_messages_count", 0)
    has_minutes = (user.get("minutes_left", 0) or 0) > 0
    is_free_phase = free_count < 12
    return is_free_phase, has_minutes, free_count

def build_counter_updates(user: dict, is_free_phase: bool, free_count: int, ai_response: str) -> dict:
    """Build the DB update fields for counters and plan detection."""
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

@api_router.post("/chat")
async def chat_endpoint(req: ChatRequest, request: Request):
    user = await get_current_user(request)
    user_id = user["_id"]

    is_free_phase, has_minutes, free_count = check_user_access(user)

    if not is_free_phase and not has_minutes:
        return {"message": "Ваши бесплатные сообщения закончились. Пожалуйста, выберите тариф для продолжения.", "type": "tariff_prompt", "needs_tariff": True}

    session_id = f"{user_id}_{req.session_id}"

    try:
        ai_response = await get_ai_response(session_id, req.message, req.problem or user.get("selected_problem"), req.language or user.get("selected_language", "ru"))

        await db.chat_messages.insert_one({
            "user_id": user_id,
            "session_id": req.session_id,
            "user_message": req.message,
            "ai_response": ai_response,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "problem": req.problem or user.get("selected_problem"),
        })

        update_fields = build_counter_updates(user, is_free_phase, free_count, ai_response)
        if update_fields:
            await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})

        return {
            "message": ai_response,
            "type": "ai_response",
            "needs_tariff": free_count + 2 >= 12 and not has_minutes,
            "minutes_left": user.get("minutes_left", 0) if has_minutes else None,
            "is_free_phase": is_free_phase,
        }
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(500, f"Chat error: {str(e)}")

@api_router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str, request: Request):
    user = await get_current_user(request)
    messages = await db.chat_messages.find(
        {"user_id": user["_id"], "session_id": session_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(200)
    return {"messages": messages}

# ---------- TTS (Fish Audio) — STREAMING ----------
def clean_text_for_tts(text: str) -> str:
    """Очистка текста для озвучки — убираем маркеры, оставляем паузы"""
    import re
    text = re.sub(r'\*[^*]+\*', '', text)  # *маркеры*
    text = re.sub(r'\([^)]*\)', '', text)  # (эмоции)
    text = re.sub(r'^(Нежно|Мягко|Шёпотом|Тихо|Уверенно)\s*,?\s*', '', text)
    text = re.sub(r'ПЛАН РАБОТЫ:', '', text)
    text = re.sub(r'^\d+\.\s*', '', text, flags=re.MULTILINE)  # Номера списков
    # Оставляем "..." для пауз в речи
    text = text.strip()
    return text

@api_router.post("/tts")
async def text_to_speech(req: TTSRequest_Model, request: Request):
    """Стриминговое озвучивание текста голосом Мирона (Fish Audio)"""
    await get_current_user(request)  # Auth check

    if not fish_api_key:
        raise HTTPException(500, "Fish Audio API key not configured")

    text = clean_text_for_tts(req.text)
    if not text:
        raise HTTPException(400, "No text to synthesize")

    voice_id = fish_voice_male  # Голос Мирона

    def generate_audio():
        """Генератор — отдаёт чанки аудио по мере получения от Fish Audio"""
        try:
            fish_session = FishSession(fish_api_key)
            for chunk in fish_session.tts(TTSRequest(
                text=text,
                reference_id=voice_id,
            )):
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
        }
    )

# ---------- STRIPE PAYMENTS ----------
async def activate_test_tariff(user_id: str) -> dict:
    """Activate the free test tariff for a user."""
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "tariff": "test",
            "minutes_total": 3,
            "minutes_used": 0,
            "minutes_left": 3,
            "test_used": True,
            "tariff_expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "is_paid_session_active": True,
        }}
    )
    return {"type": "test_activated", "message": "Test tariff activated"}

async def create_stripe_session(user: dict, tariff: dict, tariff_id: str, origin_url: str, base_url: str) -> dict:
    """Create a Stripe checkout session and save the transaction."""
    webhook_url = f"{base_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(
        api_key=os.environ["STRIPE_API_KEY"],
        webhook_url=webhook_url
    )

    checkout_req = CheckoutSessionRequest(
        amount=float(tariff["price"]),
        currency="usd",
        success_url=f"{origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{origin_url}/tariffs",
        metadata={
            "user_id": user["_id"],
            "tariff_id": tariff_id,
            "email": user.get("email", ""),
        }
    )

    session = await stripe_checkout.create_checkout_session(checkout_req)

    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": user["_id"],
        "tariff_id": tariff_id,
        "amount": tariff["price"],
        "currency": "usd",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"url": session.url, "session_id": session.session_id}

async def activate_paid_tariff(user_id: str, tariff_id: str, session_id: str) -> None:
    """Activate a paid tariff after successful payment."""
    tariff = TARIFFS[tariff_id]
    expires_map = {"week": timedelta(days=7), "month": timedelta(days=30)}
    expires = expires_map.get(tariff_id, timedelta(days=1))

    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "tariff": tariff_id,
            "minutes_total": tariff["minutes"],
            "minutes_used": 0,
            "minutes_left": tariff["minutes"],
            "tariff_expires_at": (datetime.now(timezone.utc) + expires).isoformat(),
            "is_paid_session_active": True,
        }}
    )

    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

@api_router.post("/payments/create-checkout")
async def create_checkout(req: CheckoutRequest, request: Request):
    user = await get_current_user(request)
    tariff = TARIFFS.get(req.tariff_id)
    if not tariff:
        raise HTTPException(400, "Invalid tariff")

    if req.tariff_id == "test":
        if user.get("test_used"):
            raise HTTPException(400, "Test tariff already used")
        return await activate_test_tariff(user["_id"])

    host_url = str(request.base_url).rstrip("/")
    return await create_stripe_session(user, tariff, req.tariff_id, req.origin_url, host_url)

@api_router.get("/payments/status/{session_id}")
async def check_payment_status(session_id: str, request: Request):
    user = await get_current_user(request)

    tx = await db.payment_transactions.find_one({"session_id": session_id, "user_id": user["_id"]}, {"_id": 0})
    if not tx:
        raise HTTPException(404, "Transaction not found")

    if tx.get("payment_status") == "paid":
        return {"status": "paid", "payment_status": "paid"}

    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(
        api_key=os.environ["STRIPE_API_KEY"],
        webhook_url=webhook_url
    )

    try:
        status = await stripe_checkout.get_checkout_status(session_id)

        if status.payment_status == "paid" and tx.get("payment_status") != "paid":
            await activate_paid_tariff(user["_id"], tx["tariff_id"], session_id)

        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
        }
    except Exception as e:
        logger.error(f"Payment status error: {e}")
        raise HTTPException(500, str(e))

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    try:
        host_url = str(request.base_url).rstrip("/")
        webhook_url = f"{host_url}api/webhook/stripe"
        stripe_checkout = StripeCheckout(
            api_key=os.environ["STRIPE_API_KEY"],
            webhook_url=webhook_url
        )
        event = await stripe_checkout.handle_webhook(body, signature)
        logger.info(f"Stripe webhook: {event.event_type}")
        return {"received": True}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"received": False}

# ---------- SPECIALISTS ----------
SPECIALISTS = [
    {
        "id": "miron_shakira",
        "name": "Мирон Шакира",
        "title": "Диетолог, нутрициолог, психолог",
        "specialization": ["weight", "eating_disorder"],
        "description": "Эксперт научно-спортивной ассоциации ISSA (USA). С 2012 года помог похудеть более 10 000 человек.",
        "credentials": [
            "ISSA (USA) — Мастер-тренер",
            "Stanford University",
            "Emory University",
            "Edinburgh University",
            "LMU Munich",
            "University of North Carolina"
        ],
        "photo_url": "https://customer-assets.emergentagent.com/job_xicon-preview-3/artifacts/da8jruwh_bbSt44ErT9oMjoxUeM0T1pEHQxCQwYb0Q9QsI9mn.webp",
        "photo_url_2": "https://customer-assets.emergentagent.com/job_xicon-preview-3/artifacts/p4a7djrm_a2ceHzRs7mSOhk3UJsLG4RwEWT4PfMmLizx1oiZo.webp",
        "link": "https://shakiramiron.taplink.ws",
        "is_featured": True,
    }
]

@api_router.get("/specialists")
async def get_specialists(problem: Optional[str] = None):
    if problem:
        filtered = [s for s in SPECIALISTS if problem in s.get("specialization", [])]
        return {"specialists": filtered if filtered else SPECIALISTS}
    return {"specialists": SPECIALISTS}

# ---------- STARTUP ----------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await seed_admin()
    logger.info("Miro.Care backend started")

async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@miro.care")
    admin_password = os.environ.get("ADMIN_PASSWORD", "MiroCare2026!")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "tariff": "month",
            "minutes_total": 99999,
            "minutes_used": 0,
            "minutes_left": 99999,
            "test_used": False,
            "selected_problem": None,
            "selected_voice": "female",
            "selected_language": "ru",
            "theme": "system",
            "last_plan": None,
            "is_paid_session_active": True,
            "free_messages_count": 0,
        })
        logger.info(f"Admin user created: {admin_email}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Include router and CORS
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
