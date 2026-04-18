from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import asyncio
import logging
import time
from datetime import datetime, timezone
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

from database import client, db
from auth_utils import hash_password
from metrics import stats as metrics_stats, uptime_s
from routes.auth import router as auth_router
from routes.chat import router as chat_router
from routes.tts import router as tts_router
from routes.payments import router as payments_router
from routes.bookings import router as bookings_router
from routes.stt import router as stt_router

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Miro.Care API")
api_router = APIRouter(prefix="/api")

# Mount all route modules
api_router.include_router(auth_router)
api_router.include_router(chat_router)
api_router.include_router(tts_router)
api_router.include_router(payments_router)
api_router.include_router(bookings_router)
api_router.include_router(stt_router)


# ---------- HEALTH CHECK ENDPOINTS ----------
# Lightweight health endpoints for Kubernetes / Cloudflare probes.
# MUST be bulletproof: no DB, no network, no external deps.
# Served at BOTH `/health` and `/api/health` so deployments can hit either.
@app.get("/health")
@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ---------- DETAILED METRICS (separate endpoint, may touch DB) ----------
@app.get("/api/metrics")
async def metrics_endpoint():
    # Ping Mongo with a short timeout; never let it break the response.
    db_ms = None
    db_ok = False
    try:
        t0 = time.perf_counter()
        await asyncio.wait_for(client.admin.command("ping"), timeout=1.5)
        db_ms = int((time.perf_counter() - t0) * 1000)
        db_ok = True
    except Exception:
        pass
    return {
        "status": "ok",
        "uptime_s": uptime_s(),
        "db_ok": db_ok,
        "db_ms": db_ms,
        "chat": {
            "ok": metrics_stats["chat_ok"],
            "err": metrics_stats["chat_err"],
            "last_ok": metrics_stats["chat_last_ok"],
            "last_ms": metrics_stats["chat_last_ms"],
        },
        "tts": {
            "ok": metrics_stats["tts_ok"],
            "err": metrics_stats["tts_err"],
            "last_ok": metrics_stats["tts_last_ok"],
            "last_ms": metrics_stats["tts_last_ms"],
        },
    }


# ---------- STARTUP / SHUTDOWN ----------
@app.on_event("startup")
async def startup():
    # Run DB init in the background so the server becomes ready immediately.
    # In production (Mongo Atlas) the first connection can take 10-60s due to
    # DNS/SRV lookup + TLS; blocking on it caused Cloudflare 520 on health checks.
    asyncio.create_task(_init_db_background())
    logger.info("Miro.Care backend started")


async def _init_db_background():
    try:
        await db.users.create_index("email", unique=True)
        await seed_admin()
        logger.info("Background DB init complete")
    except Exception as e:
        logger.error(f"Background DB init failed: {e}")


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

cors_origins = os.environ.get("CORS_ORIGINS", "*").split(",")
frontend_url = os.environ.get("FRONTEND_URL", "")
if frontend_url and frontend_url not in cors_origins:
    cors_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
