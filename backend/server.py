from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
from datetime import datetime, timezone
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

from database import client, db
from auth_utils import hash_password
from routes.auth import router as auth_router
from routes.chat import router as chat_router
from routes.tts import router as tts_router
from routes.payments import router as payments_router
from routes.bookings import router as bookings_router

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Miro.Care API")
api_router = APIRouter(prefix="/api")


# ---------- HEALTH CHECK (Kubernetes liveness/readiness) ----------
@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/api/v1/guest/comm/config")
async def guest_comm_config():
    return {"status": "ok"}

# Mount all route modules
api_router.include_router(auth_router)
api_router.include_router(chat_router)
api_router.include_router(tts_router)
api_router.include_router(payments_router)
api_router.include_router(bookings_router)


# ---------- STARTUP / SHUTDOWN ----------
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
            "selected_voice": None,
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


# ---------- CORS & ROUTER ----------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
