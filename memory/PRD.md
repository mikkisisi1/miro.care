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
- **AI (Primary)**: Claude Sonnet 4.5 via OpenRouter
- **AI (Fallback)**: Mistral Small 3.1 via OpenRouter
- **Payments**: Stripe (test mode)
- **TTS**: Fish Audio (Miron's voice, streaming)
- **Voice**: Web Speech API (browser-based STT)
- **Radio**: YouTube IFrame Player API

## AI Methodology
- КПТ (Бек), ДБТ (Лайнен), ACT (Хэррис), гештальт (Перлз), экзистенциальная терапия (Ялом), логотерапия (Франкл), майндфулнес (Кабат-Зинн)
- Подход MindThera.ai: персонализированные планы, адаптивные ответы, практические упражнения, фокус на рефлексии и устойчивости

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
- AI chat with psychologist (structured plan generation)
- Tariff system with Stripe checkout integration
- Timer in chat header showing remaining minutes
- Full burger menu
- Miro Radio (YouTube background player)
- Specialists page with Miron Shakira
- About page, Profile page
- Dark/Light/System theme toggle (persisted)
- 8-language support
- Payment success page with polling
- Fish Audio TTS streaming with waveform animation

### Phase 2 — Code Quality Refactoring (2026-04-16)
- Context memoization (useMemo/useCallback)
- Empty catch blocks → proper error logging
- ChatPage refactored: useChat + useAudioStream hooks, sub-components
- Server.py refactored: extracted helper functions
- Stable React keys, nested ternaries fixed, console.log removed
- Test file credentials moved to env vars with type hints

### Phase 3 — LLM Upgrade (2026-04-16)
- Switched from Mistral to Claude Sonnet 4.5 (OpenRouter) as primary LLM
- Mistral Small 3.1 as fallback (instead of Emergent GPT-4o)
- MindThera.ai methodology integrated into system prompt
- OpenRouter API key updated and verified working

## Prioritized Backlog

### P0 (Complete)
- Auth, Problem selection, Voice, AI Chat, Tariffs, Stripe, Timer, Menu, Radio, Specialists, Theme, Languages, TTS, Code Quality, LLM Upgrade

### P1 (Next)
- [ ] Female voice TTS (needs Fish Audio voice ID)
- [ ] Google Sign-In integration
- [ ] Real-time timer countdown
- [ ] Chat history persistence across sessions

### P2 (Upcoming)
- [ ] Live specialist booking calendar
- [ ] YuKassa / Telegram Stars payment alternatives
- [ ] IP-based language detection
- [ ] Push notifications

### P3 (Future)
- [ ] Mobile PWA optimization
- [ ] WebSocket for real-time chat streaming
- [ ] Admin dashboard
- [ ] Analytics

## 3rd Party Integrations
- **OpenRouter** — Claude Sonnet 4.5 (primary) + Mistral Small 3.1 (fallback)
- **Fish Audio TTS** — Miron's voice streaming
- **Stripe** — Payment processing
- **YouTube IFrame API** — Miro Radio
- **Web Speech API** — Browser STT
