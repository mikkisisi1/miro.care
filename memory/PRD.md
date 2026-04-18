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
- **STT**: Web Speech API (Chrome) + Whisper fallback (WebView)
- **Radio**: YouTube IFrame Player API

## Design System
- **Theme**: Dark Glassmorphism (#1C1C1E -> #262629 gradient)
- **Glass panels**: backdrop-filter blur(20px), rgba(255,255,255,0.05), border rgba(255,255,255,0.15)
- **Accent**: #3C8CFF (blue)
- **Typography**: Outfit (headings), Manrope (body)
- **Hero**: Miron Shakira photo with gradient
- **Buttons**: Pill-shaped with blue accent borders

## What's Been Implemented

### Phase 1-5 — MVP + Polish (2026-04-16 to 2026-04-17)
- Full auth (register/login/logout/guest), JWT
- 10 problem categories, voice selection, AI chat
- Tariffs + Stripe, timer, burger menu, radio, specialists
- Fish Audio TTS streaming, 8 languages, dark/light theme
- Claude Sonnet 4.5 + Mistral fallback via OpenRouter
- Complete dark glassmorphism redesign
- Xicon-style chat dialog with mountain wallpaper
- AI psychological knowledge base (CBT, ACT, DBT, Mindfulness)
- Session notes, personalization, crisis protocol
- Code quality refactoring, 29/29 backend tests PASSED

### Phase 6 — Voice & Language Fix (2026-04-17)
- **Microphone fix**: Emergent badge (z-index 9999) was overlapping mic button → fixed with z-index 10000
- **Whisper fallback**: MediaRecorder → /api/stt for WebView where Web Speech API unavailable
- **Russian default**: Language forced to 'ru', all users updated in DB
- **Soft auth (Xicon pattern)**: Chat/TTS/STT work WITHOUT token — no more "Not authenticated"
- **Session language update**: System prompt updates language on every request
- **Burger menu restored** on landing page
- **Emergent badge hidden** via CSS
- **Message duplication fix**: sentTranscriptRef prevents double-send
- **401 auto-retry**: Frontend auto-creates guest on auth failure

## LOCKED — НЕ МЕНЯТЬ
- Русский язык по умолчанию
- Приветствие Мирона/Оксаны на русском
- Мягкая авторизация (chat/tts/stt без токена)
- Кнопка микрофона inline в ChatPage.jsx
- z-index input area: 10000
- Значок Emergent скрыт
- Бургер-меню на лендинге

## Prioritized Backlog

### P1 (Next)
- [ ] Google Sign-In integration
- [ ] Notification system (email/push) 1 day before consultation

### P2 (Upcoming)
- [ ] YuKassa / Telegram Stars payments
- [ ] PWA implementation

### P3 (Future)
- [ ] WebSockets for chat
- [ ] Admin panel
- [ ] Analytics
