# Miro.Care — PRD

## Problem Statement
Приложение «ИИ-психолог онлайн» (Miro.Care) — гибридная платформа психологической помощи: ИИ-ассистент (Мирон/Оксана) + живые специалисты, голосовой ввод/вывод, тарифы через Stripe, бронирование консультаций.

## Stack
- Frontend: React 19 + Craco + Tailwind + shadcn/ui + react-router-dom 7
- Backend: FastAPI + Motor (MongoDB)
- LLM: OpenRouter (Claude Sonnet 4.5 / Mistral fallback) — **требует OPENROUTER_API_KEY**
- TTS: Fish Audio — **требует FISH_AUDIO_API_KEY**
- STT: Whisper через `emergentintegrations` + `EMERGENT_LLM_KEY` ✓
- Payments: Stripe через `emergentintegrations` (test key задан)
- Web search: duckduckgo_search (для кризисных запросов)

## Status (2026-04-18)
### ✓ Сделано в этой сессии
- Клонирован репо `mikkisisi1/miro.care` в рабочее окружение
- Установлены зависимости (requirements.txt + yarn)
- Прописаны `JWT_SECRET`, `EMERGENT_LLM_KEY`, `STRIPE_API_KEY`, `OPENROUTER_API_KEY`, `FISH_AUDIO_API_KEY` в `backend/.env`
- Fixed: дублированный блок `check_user_access`/`session_id` в `/api/chat` (мёртвый код)
- Fixed: устаревшее значение `minutes_left` в ответе `/api/chat` (теперь возвращается post-update)
- Fixed: утечка памяти в `chat_histories` (теперь LRU-cap на 500 сессий через `OrderedDict`)
- Fixed: невнятная 500-ка при отсутствии ключа LLM — теперь чистый 503 "AI provider key not configured"
- **Обновлён SYSTEM_PROMPT** на «Empathic Engine» (валидация → эмпатия → один вопрос-маяк, правила для Fish Audio TTS: числа словами, без списков/звёздочек, эмоциональные междометия, лимит ~250 симв.)
- Проверено вживую: нормальный диалог, короткий «не знаю», кризис/самовред — все три кейса обрабатываются по ТЗ
- Админ-сид проверен, логин `admin@miro.care` работает
- E2E подтверждено curl'ом: Claude Sonnet 4.5 отвечает, Fish Audio отдаёт MP3

### Backlog (P1)
- Google Sign-In через Emergent Auth
- Email/push-нотификации за сутки до консультации

### Backlog (P2)
- YuKassa / Telegram Stars платежи
- PWA
- WebSockets для чата
- Admin-панель
