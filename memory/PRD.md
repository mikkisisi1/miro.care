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
- **Theme**: Dark Glassmorphism (#1C1C1E → #262629 gradient)
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
- MindThera.ai methodology in system prompt
- **Complete dark glassmorphism redesign**: all pages transformed
- Miron's photo on auth page with gradient mask
- Glass cards, dark inputs, blue accent system (#3C8CFF)

### Phase 3.1 — UI Polish (2026-04-16)
- Thin blue border (0.5px, #3C8CFF) on glass panel and CTA button
- Bold font-weight (800) for "MIRO CARE" brand title
- Background gradient on bottom 2/3 of pages

### Phase 3.2 — Xicon-Style Chat Dialog (2026-04-17)
- **Complete chat page redesign** based on Xicon.online dialog window:
  - Full-screen black background chat modal
  - Header with round avatar (M letter) + green online dot + agent name
  - User messages: right-aligned, glassmorphism backdrop, blue border
  - AI messages: left-aligned, dark background, blue border, speaker button for TTS
  - Typing indicator with animated dots
  - Input area: round mic button + input field with blue border + round send button
  - Wave visualizer SVG animation for voice recording
  - Running text (marquee) for speech recognition feedback
  - All CSS prefixed with xc- to avoid conflicts

## Prioritized Backlog

### P0 (Critical)
- [ ] Implement actual Stripe Webhooks for payment verification

### P1 (Next)
- [ ] Real-time timer countdown in chat
- [ ] Google Sign-In integration
- [ ] Chat history persistence across sessions
- [ ] Female voice TTS (needs Fish Audio voice ID)

### P2 (Upcoming)
- [ ] Live specialist booking calendar
- [ ] YuKassa / Telegram Stars payments
- [ ] IP-based language detection

### P3 (Future)
- [ ] Mobile PWA, WebSocket chat, Admin dashboard, Analytics

## Refactoring Needed
- [ ] Split server.py (~750 lines) into: auth.py, chat.py, tts.py, payments.py
