# Miro.Care — PRD

## Original Problem Statement
Build Miro.Care, a hybrid psychological help platform featuring an AI-psychologist (Miron/Oksana) utilizing voice/text, live specialist integration, Stripe-based tariffs, DuckDuckGo live search for crisis info, specialist booking calendar, and OpenRouter (Claude Sonnet 4.5) / Fish Audio (TTS) integrations.

## Architecture
- Frontend: React (CRA + CRACO), dark glassmorphism UI
- Backend: FastAPI, Python
- Database: MongoDB
- Integrations: OpenRouter (Claude Sonnet 4.5), Fish Audio (TTS), Stripe, DuckDuckGo Search
- Auth: JWT-based, centralized apiClient.js with getAuthToken/setAuthToken/removeAuthToken

## What's Been Implemented
- Full AI psychologist chat with SSE streaming
- Fish Audio TTS voice streaming
- DuckDuckGo live search for crisis info
- Stripe payments with webhooks and tariff management
- Specialist booking calendar
- Landing page (desktop + mobile) with custom photo positioning
- AI personality tuning (calm, professional tone with pauses)
- **[2026-04-17] Fixed deployment blocker: removed duplicate .env-blocking entries from .gitignore**
- **[2026-04-17] Code quality refactoring:**
  - Centralized localStorage token access via getAuthToken/setAuthToken/removeAuthToken in apiClient.js
  - Extracted streaming logic in useAudioStream.js (fetchAndStreamTTS, pumpStream, appendChunk)
  - Extracted loadChatHistory from useChat.js
  - Refactored BurgerMenu into data-driven MENU_ITEMS structure with extracted LanguageGrid/ThemeOptions
  - Refactored chat.py endpoints into _process_chat_message/_process_image_message/_build_dialogue_text
  - Refactored bookings.py into _compute_date_range/_fetch_booked_slots/_build_calendar

## Prioritized Backlog
### P0 (Critical)
- (None — all critical issues resolved)
- **[2026-04-17] Fixed deployment blockers:**
  - Added `/health` endpoint for Kubernetes liveness/readiness probes (was returning 404)
  - Added `/api/v1/guest/comm/config` endpoint (Emergent platform requirement)
  - Fixed cookie `secure` flag to be environment-aware (HTTPS in production)
  - **Fixed `.gitignore` blocking `.env` files** — removed duplicate sections (lines 84-109) that prevented env files from being deployed, causing blank page on production

### P1 (High)
- Google Sign-In integration (Emergent-managed Google Auth)
- Notification system (email/push) 1 day before specialist consultation

### P2 (Medium)
- YuKassa / Telegram Stars (Russian payment alternatives)
- Language detection by IP
- PWA implementation
- WebSockets for chat

### P3 (Low)
- Admin panel and analytics

## Design Lock
A strict design lock (DESIGN_LOCK.md) is in place. Do NOT modify `.landing-photo` or `.landing-brand` CSS rules unless explicitly requested by user.

## Key Files
- `/app/backend/server.py` — Main FastAPI app
- `/app/backend/config.py` — System prompt, AI config
- `/app/backend/routes/` — auth.py, bookings.py, chat.py, payments.py, tts.py
- `/app/frontend/src/lib/apiClient.js` — Centralized Axios client with token functions
- `/app/frontend/src/pages/LandingPage.jsx` — Landing page
- `/app/frontend/src/App.css` — Strict design rules

## Test Reports
- iteration_11.json — Full feature test
- iteration_12.json — Payments test
- iteration_13.json — Regression post-refactor
- iteration_14.json — Regression after code quality refactoring (100% pass)
