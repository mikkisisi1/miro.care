# Miro.Care — PRD

## Original Problem Statement
Hybrid AI-psychologist platform (React + FastAPI/MongoDB) with voice synthesis (Fish Audio s1 streaming), emotional markers, locked landing page CSS, multi-language support, responsive UI, and "thinking/replying" indicator.

Recent refinement: Replace Oksana's voice ID with new "Girl" voice (`fd40a0d632964604b26c5be764da3ea2`).

## User's Preferred Language
Russian (RU). Always respond in Russian.

## Key Architecture
- `/app/backend/` — FastAPI entry (`server.py`), `config.py` (SYSTEM_PROMPT), `voice_config.py` (Fish Audio settings, DESIGN-LOCKED), `routes/chat.py`, `routes/tts.py`
- `/app/frontend/` — React, locked landing CSS in `App.css`, `pages/ChatPage.jsx`, `hooks/useAudioStream.js` (MediaSource API streaming)

## Locked Areas (DO NOT MODIFY)
- `/app/frontend/src/App.css` landing page styles
- `voice_config.py` voice IDs, prosody, emotion markers

## DB Schema
- `users`: {_id, email, hashed_password, role, minutes_left, free_messages_count, user_display_name, session_notes}
- `chat_messages`: {user_id, session_id, user_message, ai_response, timestamp, problem}

## 3rd-Party Integrations
- OpenRouter (Claude Sonnet 4.5) — `OPENROUTER_API_KEY`
- Fish Audio (voice synthesis, s1 model) — `FISH_AUDIO_API_KEY`
- Stripe (test key in env)
- Emergent LLM key (universal)

## Completed (Feb 2026)
- [2026-02] Fish Audio female voice ID changed from Oksana to "Girl" (`fd40a0d632964604b26c5be764da3ea2`) in `voice_config.py` + `.env`. TTS verified via curl.
- [2026-02] **DEPLOYMENT FIX**: Cleaned `/app/.gitignore` — removed 9 duplicate blocks that were blocking `.env` files from being deployed, causing Cloudflare 520 errors on miro.care. User needs to redeploy.

## Known Notes
- UI still shows "Оксана" name — user decided to keep the name unchanged, only the voice was swapped.
- `routes/chat.py` has high cyclomatic complexity; postpone refactor to avoid regressions.

## Backlog / Future Tasks (P2)
- Email/push notifications 24h before consultation
- YuKassa / Telegram Stars payments
- PWA support
- WebSockets for chat
- Admin panel

## Testing
- `test_credentials.md`: see `/app/memory/test_credentials.md`
- Backend smoke test: `curl $REACT_APP_BACKEND_URL/api/chat ...`
- Preview URL (from frontend/.env `REACT_APP_BACKEND_URL`)
