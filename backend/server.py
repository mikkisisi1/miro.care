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

ТВОЙ АЛГОРИТМ В ДИАЛОГЕ:

1. ПРИВЕТСТВИЕ:
   "Здравствуйте. Я ваш ИИ-психолог. Расскажите, что вас беспокоит?"

2. АКТИВНОЕ СЛУШАНИЕ (до 5-7 обменов):
   - Задавай уточняющие вопросы
   - Отражай эмоции: "Я слышу, что это вызывает у вас боль/стыд/тревогу"
   - Никогда не обесценивай

3. СОСТАВЛЕНИЕ ПЛАНА (4-6 пунктов):
   Формат:
   ПЛАН РАБОТЫ:
   1. [Техника/упражнение]
   2. [Техника/упражнение]
   3. [Техника/упражнение]
   4. [Техника/упражнение]

4. ПРЕДЛОЖЕНИЕ ТАРИФА:
   "Чтобы продолжить работу по этому плану, выберите тариф: 1 час — 3$, 7 часов — 14$, 30 часов — 29$. Также доступен тест 3 минуты бесплатно."

5. ПОСЛЕ ОПЛАТЫ:
   - Продолжай диалог строго по плану
   - Отслеживай прогресс
   - В конце каждого блока спрашивай: "Как вам этот этап? Готовы двигаться дальше?"

ОСОБЫЙ БЛОК ДЛЯ ПРОБЛЕМЫ "ЛИШНИЙ ВЕС" (weight):
- Скажи: "Эта тема требует особой бережности. Лишний вес — это не слабая воля, а психологическая травма."
- Работай со стыдом, виной, эмоциональным заеданием
- Всегда добавляй в план пункт с рекомендацией Мирона Шакиры

ОГРАНИЧЕНИЯ:
- Я не ставлю медицинские диагнозы
- При суицидальных мыслях: "Пожалуйста, позвоните на горячую линию помощи в вашей стране"
- Я не заменяю живого психолога в кризисных ситуациях

О ПРОЕКТЕ:
miro.care | Эксперт: Мирон Шакира (shakiramiron.taplink.ws)

ВАЖНО: Отвечай на том языке, на котором пишет пользователь. Если указан язык интерфейса — используй его."""

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
            model="mistralai/mistral-small-3.1-24b-instruct:free",
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
@api_router.post("/chat")
async def chat_endpoint(req: ChatRequest, request: Request):
    user = await get_current_user(request)
    user_id = user["_id"]

    # Check free messages limit or paid session
    free_count = user.get("free_messages_count", 0)
    has_minutes = (user.get("minutes_left", 0) or 0) > 0
    is_free_phase = free_count < 12  # ~5-7 exchanges = ~10-14 messages

    if not is_free_phase and not has_minutes:
        return {"message": "Ваши бесплатные сообщения закончились. Пожалуйста, выберите тариф для продолжения.", "type": "tariff_prompt", "needs_tariff": True}

    # Get or create chat session
    session_id = f"{user_id}_{req.session_id}"

    try:
        ai_response = await get_ai_response(session_id, req.message, req.problem or user.get("selected_problem"), req.language or user.get("selected_language", "ru"))

        # Save to chat history in DB
        msg_doc = {
            "user_id": user_id,
            "session_id": req.session_id,
            "user_message": req.message,
            "ai_response": ai_response,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "problem": req.problem or user.get("selected_problem"),
        }
        await db.chat_messages.insert_one(msg_doc)

        # Update counters
        update_fields = {}
        if is_free_phase:
            update_fields["free_messages_count"] = free_count + 2  # user + AI
        else:
            # Deduct ~1 minute per exchange
            new_used = (user.get("minutes_used", 0) or 0) + 1
            new_left = max(0, (user.get("minutes_left", 0) or 0) - 1)
            update_fields["minutes_used"] = new_used
            update_fields["minutes_left"] = new_left

        # Check if AI generated a plan
        if "ПЛАН РАБОТЫ" in ai_response or "PLAN" in ai_response.upper():
            update_fields["last_plan"] = ai_response

        if update_fields:
            await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})

        # Check if needs tariff
        needs_tariff = not is_free_phase and not has_minutes
        remaining = user.get("minutes_left", 0) if has_minutes else None

        return {
            "message": ai_response,
            "type": "ai_response",
            "needs_tariff": free_count + 2 >= 12 and not has_minutes,
            "minutes_left": remaining,
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

# ---------- TTS (Fish Audio) ----------
@api_router.post("/tts")
async def text_to_speech(req: TTSRequest_Model, request: Request):
    """Convert text to speech using Fish Audio"""
    user = await get_current_user(request)

    if not fish_api_key:
        raise HTTPException(500, "Fish Audio API key not configured")

    # Clean text for TTS (remove markdown markers, emotion markers)
    import re
    text = req.text
    text = re.sub(r'\*[^*]+\*', '', text)  # Remove *markers*
    text = re.sub(r'\([^)]+\)', '', text)  # Remove (emotions)
    text = re.sub(r'^(Нежно|Мягко|Шёпотом|Тихо|Уверенно)\s*,?\s*', '', text)
    text = text.strip()

    if not text:
        raise HTTPException(400, "No text to synthesize")

    # Select voice based on user preference
    voice_id = fish_voice_male  # Male = Miron voice

    try:
        fish_session = FishSession(fish_api_key)

        # Collect all audio chunks first, then return as single response
        import io
        audio_buffer = io.BytesIO()
        for chunk in fish_session.tts(TTSRequest(
            text=text,
            reference_id=voice_id,
        )):
            audio_buffer.write(chunk)

        audio_buffer.seek(0)
        audio_data = audio_buffer.read()

        if not audio_data:
            raise HTTPException(500, "No audio data generated")

        return Response(
            content=audio_data,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=tts.mp3"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fish Audio TTS error: {e}")
        raise HTTPException(500, f"TTS error: {str(e)}")

# ---------- STRIPE PAYMENTS ----------
@api_router.post("/payments/create-checkout")
async def create_checkout(req: CheckoutRequest, request: Request):
    user = await get_current_user(request)
    tariff = TARIFFS.get(req.tariff_id)
    if not tariff:
        raise HTTPException(400, "Invalid tariff")

    if req.tariff_id == "test":
        if user.get("test_used"):
            raise HTTPException(400, "Test tariff already used")
        # Activate test directly without payment
        await db.users.update_one(
            {"_id": ObjectId(user["_id"])},
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

    # Stripe checkout for paid tariffs
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(
        api_key=os.environ["STRIPE_API_KEY"],
        webhook_url=webhook_url
    )

    success_url = f"{req.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{req.origin_url}/tariffs"

    checkout_req = CheckoutSessionRequest(
        amount=float(tariff["price"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user["_id"],
            "tariff_id": req.tariff_id,
            "email": user.get("email", ""),
        }
    )

    session = await stripe_checkout.create_checkout_session(checkout_req)

    # Save payment transaction
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": user["_id"],
        "tariff_id": req.tariff_id,
        "amount": tariff["price"],
        "currency": "usd",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"url": session.url, "session_id": session.session_id}

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
            tariff_id = tx["tariff_id"]
            tariff = TARIFFS[tariff_id]

            expires = timedelta(days=1)
            if tariff_id == "week":
                expires = timedelta(days=7)
            elif tariff_id == "month":
                expires = timedelta(days=30)

            await db.users.update_one(
                {"_id": ObjectId(user["_id"])},
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
