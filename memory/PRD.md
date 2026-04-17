# Miro.Care - PRD (Product Requirements Document)

## Original Problem Statement
MIRO.CARE — гибридная платформа психологической помощи, объединяющая:
- ИИ-психолога (голосовой + текстовый чат, экспертный промпт)
- Живых специалистов (запись на консультацию)
- Miro Radio (YouTube-микс для расслабления)
- Эксперта проекта — Мирон Шакира (психолог, диетолог, нутрициолог, ISSA USA)

## Architecture
- **Frontend**: React + Tailwind CSS + Custom CSS (Outfit + Manrope fonts)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI (Primary)**: Claude Sonnet 4.5 via OpenRouter
- **AI (Fallback)**: Mistral Small 3.1 via OpenRouter
- **Payments**: Stripe (test mode)
- **TTS**: Fish Audio (Miron's voice, streaming)
- **Radio**: YouTube IFrame Player API

## Design System
- **Theme**: Dark Glassmorphism (#1C1C1E -> #262629 gradient)
- **Glass panels**: backdrop-filter blur(20px), rgba(255,255,255,0.05), border rgba(255,255,255,0.15)
- **Accent**: #3C8CFF (blue)
- **Typography**: Outfit (headings), Manrope (body)
- **Hero**: Miron Shakira photo with gradient
- **Buttons**: Pill-shaped with blue accent borders

## What's Been Implemented

### Phase 1 — MVP (2026-04-16)
- Full auth (register/login/logout/me) with JWT
- 10 problem categories, voice selection, AI chat
- Tariffs + Stripe, timer, burger menu, radio, specialists
- Fish Audio TTS streaming, 8 languages, dark/light theme

### Phase 2 — Code Quality (2026-04-16)
- Context memoization (useMemo/useCallback)
- ChatPage refactored into hooks + sub-components
- Server.py refactored into helper functions
- Stable keys, proper error handling, console.log removed

### Phase 3 — LLM + Design (2026-04-16)
- Claude Sonnet 4.5 (primary) + Mistral (fallback) via OpenRouter
- **Complete dark glassmorphism redesign**: all pages transformed

### Phase 3.1 — UI Polish (2026-04-16)
- Thin blue border (0.5px, #3C8CFF) on glass panel and CTA button
- Bold font-weight (800) for "MIRO CARE" brand title

### Phase 3.2 — Xicon-Style Chat Dialog (2026-04-17)
- Full-screen chat modal with mountain wallpaper background
- Header with 2 photo avatars (Miron + Oksana) + green online dots
- Exact xicon input area: mic | input+camera | send
- Image upload + AI visual analysis via /api/chat/image

### Phase 3.3 — Inline Voice Selection + Greeting (2026-04-17)
- ProblemSelection -> Chat directly (skip VoiceSelect page)
- Two large avatar cards in chat area for voice selection
- Header avatars clickable with pulsing animation
- Cached TTS greeting on voice select
- Input disabled until voice chosen

### Phase 4 — AI Agent Implementation (2026-04-17)
- Complete SYSTEM_PROMPT rewrite with psychological knowledge base
- 4-level thinking architecture: State -> Thinking -> Emotion -> Action
- 6-step dialog algorithm
- Personalization & Memory (name extraction, session notes)

### Phase 4.1 — Final System Prompt (2026-04-17)
- Expanded knowledge base: CBT, Porges, ACT, DBT, Mindfulness, etc.
- Enhanced crisis protocol: 6-step structured response
- Acute state handling: panic/dissociation -> grounding, breathing

### Phase 5 — UI Refinements (2026-04-17)
- Landing page: Miron Shakira qualifications in glass panel
- Chat header: cleaned up text
- Chat avatars: 50% larger with 0.3px stroke
- Chat background: removed dark overlay for visible wallpaper
- Chat bubbles: glassmorphism (transparency + blur)
- Microphone: 3-second silence auto-stop + auto-send

### Phase 5.1 — Full Feature Testing (2026-04-17)
- Comprehensive testing: 29/29 backend tests PASSED, 25/25 frontend features VERIFIED
- 100% pass rate across all endpoints and UI flows

## Prioritized Backlog

### P0 (Critical)
- [ ] Implement actual Stripe Webhooks for payment verification

### P1 (Next)
- [x] Real-time timer countdown in chat (last 5 min)
- [x] Female voice TTS (Fish Audio voice ID: fd40a0d632964604b26c5be764da3ea2)
- [x] Chat history persistence across sessions (auto-loads last session)
- [ ] Google Sign-In integration
- [ ] Notification system (email/push) 1 day before consultation

### P2 (Upcoming)
- [x] Live specialist booking calendar
- [x] Session Notes auto-summary (cross-session memory via users.session_notes)
- [ ] YuKassa / Telegram Stars payments
- [ ] IP-based language detection

### P3 (Future)
- [ ] Mobile PWA, WebSocket chat, Admin dashboard, Analytics

## Refactoring Completed
- [x] ChatPage.jsx split: 463 -> 219 lines (53% reduction)
- [x] server.py split: 1246 -> 84 lines (93% reduction)
- [x] Route modules: auth.py, chat.py, tts.py, payments.py, bookings.py
- [x] CORS env var support
- [x] .dockerignore created

## Deployment Fixes (2026-05-xx)
- [x] CORS: now reads CORS_ORIGINS env var (wildcard fallback)
- [x] .gitignore: removed 5 duplicate .env-blocking entries
- [x] .dockerignore: created to protect test_credentials.md
