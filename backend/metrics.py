"""
Lightweight in-memory runtime metrics for /api/health diagnostics.
Non-persistent, resets on process restart.
"""
import time
from datetime import datetime, timezone

_started_at = time.monotonic()

stats = {
    "chat_ok": 0,
    "chat_err": 0,
    "chat_last_ok": None,        # ISO timestamp of last successful chat response
    "chat_last_ms": None,        # latency in ms of last successful chat response
    "tts_ok": 0,
    "tts_err": 0,
    "tts_last_ok": None,
    "tts_last_ms": None,
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def uptime_s() -> int:
    return int(time.monotonic() - _started_at)


def record_chat_ok(ms: int) -> None:
    stats["chat_ok"] += 1
    stats["chat_last_ok"] = now_iso()
    stats["chat_last_ms"] = ms


def record_chat_err() -> None:
    stats["chat_err"] += 1


def record_tts_ok(ms: int) -> None:
    stats["tts_ok"] += 1
    stats["tts_last_ok"] = now_iso()
    stats["tts_last_ms"] = ms


def record_tts_err() -> None:
    stats["tts_err"] += 1
