# Miro.Care — Product Requirements Document

## Original Problem Statement
Hybrid AI-psychologist platform (React + FastAPI + MongoDB) with Fish Audio s1 streaming TTS, emotional markers, multi-language and responsive support. Voice selection (male "Мирон" / female "Девушка") with locked prosody and emotional control.

## Core Requirements
- Voice synthesis via Fish Audio s1 (streaming, balanced latency)
- LLM chat via OpenRouter (Claude)
- Protected voice configuration in `voice_config.py` (no unauthorized edits)
- Multi-language, responsive UI
- Deployment to Emergent platform (K8s + Cloudflare)

## Locked / Protected
- `voice_config.py` voice IDs, prosody, emotion markers
- Landing page CSS (`App.css`)
- AI name "Оксана" in UI (user explicitly wants to keep)
- Female voice ID: `fd40a0d632964604b26c5be764da3ea2` ("Девушка")
- Male voice ID: `5cfccfb8aae14938be283ea6400b4a8a` ("Мирон")

## Changelog
- 2026-04-18: Replaced female voice ID → `fd40a0d632964604b26c5be764da3ea2` ("Девушка")
- 2026-04-18: Rolled back unauthorized deployment fixes (metrics, lazy loading) at user's request
- 2026-04-18: Added minimal `/health` and `/api/health` endpoints (5 lines) to fix K8s readiness probe / Cloudflare 520 on deploy. TTS verified working (200, valid MP3).
- 2026-04-18: Moved DB init (`create_index`, `seed_admin`) into a background task via `asyncio.create_task` so uvicorn signals "Application startup complete" immediately. This fixes the Cloudflare 520 during deploy where Atlas connection at startup was blocking readiness past the 120s wrapper timeout. Verified: all health endpoints return 200 locally and on preview URL.

## Backlog (P2)
- Email/push notifications 24h before consultation
- YuKassa / Telegram Stars payments
- PWA support
- WebSockets for chat
- Admin panel

## Integrations
- OpenRouter (Claude) — user API key
- Fish Audio TTS — user API key
- Emergent LLM Key (configured)
