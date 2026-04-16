# Miro.Care - PRD (Product Requirements Document)

## Original Problem Statement
MIRO.CARE — гибридная платформа психологической помощи, объединяющая:
- ИИ-психолога (голосовой + текстовый чат, экспертный промпт)
- Живых специалистов (запись на консультацию)
- Miro Radio (YouTube-микс для расслабления)
- Эксперта проекта — Мирон Шакира (психолог, диетолог, нутрициолог, ISSA USA)

Key specialization: работа с психологической травмой лишнего веса и пищевого поведения.

## Architecture
- **Frontend**: React + Tailwind CSS + Custom CSS (Manrope + Figtree fonts)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: OpenAI GPT-4o via Emergent LLM key (fallback from OpenRouter)
- **Payments**: Stripe (test mode)
- **TTS**: Fish Audio (Miron's voice, streaming)
- **Voice**: Web Speech API (browser-based STT)
- **Radio**: YouTube IFrame Player API

## User Personas
1. **Primary**: Adults 25-55 seeking psychological help for anxiety, depression, weight issues
2. **Specialized**: People struggling with weight-related psychological trauma
3. **Professional**: Those seeking live specialist consultations

## Core Requirements
- User authentication (email + password with JWT)
- 10 psychological problem categories
- Male/Female voice selection for AI psychologist
- AI chat with structured work plan generation
- Tariff system ($0 test, $3/hr, $14/7hrs, $29/30hrs)
- Stripe payment integration
- Timer/counter showing remaining minutes
- Burger menu with all sections
- Miro Radio (YouTube background music)
- Specialists page with Miron Shakira expert card
- Dark/Light/System theme toggle
- 8-language localization (RU, EN, ZH, ES, AR, FR, DE, HI)

## What's Been Implemented

### Phase 1 — MVP (2026-04-16)
- Full authentication (register/login/logout/me) with JWT + httpOnly cookies
- Problem selection screen (10 categories with icons)
- Voice selection (Male/Female)
- AI chat with GPT-4o psychologist (structured plan generation)
- Tariff system with Stripe checkout integration
- Timer in chat header showing remaining minutes
- Full burger menu (Profile, Voice, Language, Theme, Radio, Specialists, About, Book)
- Miro Radio (YouTube background player)
- Specialists page with Miron Shakira photos and credentials
- About page with project info and contacts
- Profile page with user stats
- Dark/Light/System theme toggle (persisted)
- 8-language support (RU, EN, ZH, ES, AR, FR, DE, HI)
- Payment success page with polling
- Responsive design
- Admin seeding on startup
- Fish Audio TTS streaming with waveform animation
- Enhanced AI psychologist personality (CBT, DBT, ACT, empathetic pauses)

### Phase 2 — Code Quality Refactoring (2026-04-16)
- Context memoization (AuthContext, ThemeContext, LanguageContext) with useMemo/useCallback
- Empty catch blocks replaced with proper error logging
- Console.log statements removed from production code
- ChatPage refactored: extracted useChat + useAudioStream hooks, ChatHeader/MessageList/ChatInputArea sub-components
- Server.py refactored: extracted check_user_access, build_counter_updates, activate_test_tariff, create_stripe_session, activate_paid_tariff helper functions
- Nested ternaries replaced with lookup objects (speech recognition langs) and render functions
- Stable React keys (message IDs, composite keys) instead of array indices
- Test file credentials moved to environment variables with type hints
- PaymentSuccess polling fixed with useRef for attempts counter

## API Endpoints
- POST /api/auth/register — Register new user
- POST /api/auth/login — Login
- POST /api/auth/logout — Logout
- GET /api/auth/me — Get current user
- GET /api/problems — List 10 problem categories
- GET /api/tariffs — List tariff plans
- POST /api/chat — Send message to AI psychologist
- GET /api/chat/history/{session_id} — Get chat history
- PUT /api/user/voice — Update voice preference
- PUT /api/user/problem — Update problem selection
- PUT /api/user/language — Update language
- PUT /api/user/theme — Update theme
- POST /api/payments/create-checkout — Create Stripe checkout
- GET /api/payments/status/{session_id} — Check payment status
- POST /api/webhook/stripe — Stripe webhook
- GET /api/specialists — List specialists
- POST /api/tts — Fish Audio TTS streaming

## Prioritized Backlog

### P0 (Complete)
- Auth, Problem selection, Voice, AI Chat, Tariffs, Stripe, Timer, Menu, Radio, Specialists, Theme, Languages
- Fish Audio TTS streaming
- Code quality refactoring

### P1 (Next)
- [ ] Female voice TTS (needs Fish Audio voice ID from user)
- [ ] OpenRouter fix (currently 401, falling back to Emergent GPT-4o)
- [ ] Google Sign-In integration
- [ ] Real-time timer countdown (deducting seconds during conversation)
- [ ] Chat history persistence across sessions

### P2 (Upcoming)
- [ ] Live specialist booking calendar
- [ ] YuKassa / Telegram Stars payment alternatives
- [ ] IP-based language detection
- [ ] Push notifications for session reminders

### P3 (Future)
- [ ] Mobile PWA optimization
- [ ] WebSocket for real-time chat streaming
- [ ] Admin dashboard for managing specialists
- [ ] Analytics and user engagement tracking

## 3rd Party Integrations
- **OpenRouter** (Mistral) — Primary LLM (with Emergent GPT-4o fallback)
- **Fish Audio TTS** — Text-to-speech with Miron's voice
- **Stripe** — Payment processing
- **YouTube IFrame API** — Miro Radio
- **Web Speech API** — Browser-based STT

## Code Structure
```
/app/
├── backend/
│   ├── server.py              # Main FastAPI app (Auth, Chat, TTS, Stripe)
│   ├── tests/test_miro_care_api.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/        # BurgerMenu, UI components
│   │   ├── contexts/          # AuthContext, ThemeContext, LanguageContext (memoized)
│   │   ├── hooks/             # useChat, useAudioStream (extracted)
│   │   ├── pages/             # AuthPage, ChatPage, ProblemSelection, etc.
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.css
│   ├── package.json
│   └── .env
└── memory/
    ├── PRD.md
    └── test_credentials.md
```
