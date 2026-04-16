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
- **AI**: OpenAI GPT-4o via Emergent LLM key
- **Payments**: Stripe (test mode)
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

## What's Been Implemented (2026-04-16)
- ✅ Full authentication (register/login/logout/me) with JWT + httpOnly cookies
- ✅ Problem selection screen (10 categories with icons)
- ✅ Voice selection (Male/Female)
- ✅ AI chat with GPT-4o psychologist (structured plan generation)
- ✅ Tariff system with Stripe checkout integration
- ✅ Timer in chat header showing remaining minutes
- ✅ Full burger menu (Profile, Voice, Language, Theme, Radio, Specialists, About, Book)
- ✅ Miro Radio (YouTube background player)
- ✅ Specialists page with Miron Shakira photos and credentials
- ✅ About page with project info and contacts
- ✅ Profile page with user stats
- ✅ Dark/Light/System theme toggle (persisted)
- ✅ 8-language support (RU, EN, ZH, ES, AR, FR, DE, HI)
- ✅ Payment success page with polling
- ✅ Responsive design
- ✅ Admin seeding on startup

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

## Prioritized Backlog

### P0 (Complete) ✅
- Auth, Problem selection, Voice, AI Chat, Tariffs, Stripe, Timer, Menu, Radio, Specialists, Theme, Languages

### P1 (Next)
- [ ] Fish Audio TTS integration (requires API key)
- [ ] Google Sign-In integration
- [ ] Real-time timer countdown (deducting seconds during conversation)
- [ ] Chat history persistence across sessions

### P2 (Upcoming)
- [ ] Live specialist booking calendar
- [ ] ЮKassa / Telegram Stars payment alternatives
- [ ] IP-based language detection
- [ ] Push notifications for session reminders

### P3 (Future)
- [ ] Mobile PWA optimization
- [ ] WebSocket for real-time chat streaming
- [ ] Admin dashboard for managing specialists
- [ ] Analytics and user engagement tracking

## 3rd Party Integrations
- **OpenRouter** (Mistral) — Primary LLM for AI psychologist chat (with Emergent LLM GPT-4o as fallback)
- **Fish Audio TTS** — Text-to-speech with Miron's voice (Voice ID: 5cfccfb8aae14938be283ea6400b4a8a)
- **Stripe** — Payment processing
- **YouTube IFrame API** — Miro Radio background music
- **Web Speech API** — Browser-based speech recognition (STT)

## Documents
- `/app/memory/test_credentials.md` — Auth credentials
- `/app/design_guidelines.json` — UI/UX design guidelines
