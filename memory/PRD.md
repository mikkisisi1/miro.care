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

### ✅ Новое: ЗАЩИЩЁННАЯ ГОЛОСОВАЯ КОНФИГУРАЦИЯ (18 апреля 2026)
🔒 **КРИТИЧНО: НЕ ИЗМЕНЯТЬ БЕЗ СОГЛАСОВАНИЯ** 🔒

**Реализовано:**
- **Эмоциональный контроль Fish Audio** — автоматическое добавление маркеров `(calm)(soft tone)` для эмпатичной манеры речи
- **Prosody управление** — speed=0.88 (медленнее на 12% для спокойной речи), volume=4 dB
- **Естественные паузы** — автоматическое добавление `(sighing)` перед междометиями (хм, ох, эх)
- **Задумчивость** — `(thoughtful)` для многоточий "..."
- **Защита конфигурации** — создан `/app/backend/voice_config.py` (защищённый от изменений)
- **Обновлён System Prompt** — добавлены правила для генерации текста, совместимого с эмоциями Fish Audio
- **Стриминг TTS** — сохранён полный функционал потоковой озвучки

**Характеристики голоса (достигнуты):**
- ✅ Профессиональный (через calm + медленную скорость)
- ✅ Спокойный (через calm + soft tone)
- ✅ Живой (через междометия с sighing)
- ✅ Внимательный (через thoughtful)
- ✅ Естественные паузы (через sighing + многоточия)
- ✅ Эмпатичный (через warm + gentle)
- ✅ Тёплый (через soft tone + warm)

**Защищённые файлы:**
- `/app/backend/voice_config.py` 🔒 (конфигурация голосов, Prosody, эмоций)
- `/app/backend/routes/tts.py` 🔒 (логика TTS с эмоциями и Prosody)
- `/app/backend/config.py` 🔒 (SYSTEM_PROMPT с правилами для TTS)
- `/app/VOICE_CONFIG_README.md` 📖 (полная документация)

**Тестирование:**
- ✅ Мужской голос (Мирон) с эмоциями — работает
- ✅ Женский голос (Оксана) с эмоциями — работает
- ✅ Prosody (speed=0.88, volume=4) — применяется
- ✅ Автоматические паузы для "Хм...", "Эх..." — добавляются
- ✅ Полный флоу: Чат → LLM → TTS с эмоциями — работает

### ✓ Добавлено 2026-02-18
- **Индикатор "думает/отвечает"** — маленькая неоновая cyan точка пульсирует на ободке активного аватара (Miron/Oksana), пока `loading || playingTTS`.
  - Файлы: `ChatPage.jsx` (пропс `isBusy`), `ChatHeader.jsx` (рендер `.xc-chat-thinking-dot`), `App.css` (keyframes `thinkingNeonPulse`).
  - Проверено вживую в превью: точка появляется при отправке сообщения и исчезает после ответа.
- **Fix (Feb 2026): Fish emotion-маркеры в тексте ответа** — LLM иногда вставлял `(calm)`, `(soft tone)`, `(warm)(gentle)`, `(sighing)`, `(thoughtful)` в видимый текст. Добавлен `strip_emotion_markers()` в `routes/chat.py`, который вырезает короткие ASCII-маркеры в скобках из `ai_response` перед сохранением в историю/БД и возвратом на фронт. TTS продолжает добавлять свои маркеры независимо через `tts.py`. Русские/многословные вставки в скобках не затрагиваются.
- **Убрана статическая зелёная точка** `.xc-status-online` с ободка аватара в `ChatHeader.jsx`. Осталась только пульсирующая неоновая cyan точка «думает/отвечает».

### ✓ Полный регресс-тест 2026-02-19
Прошло **29/29 тестов** (19 iteration15 + 10 strip_emotion_markers). Подтверждено:
- AI-ответы без emotion-маркеров в видимом тексте (strip_emotion_markers работает)
- Мультиязычность чата: ru/en/es/de/fr/zh подтверждены (ответ на языке запроса)
- Whisper STT: LANG_MAP на 8 языков (ru/en/zh/es/ar/fr/de/hi) пробрасывается корректно
- Empathic Engine: валидация → эмпатия → один вопрос-маяк, ≤250 симв., без списков/звёздочек
- Этический фильтр: кризисные сообщения триггерят упоминание горячей линии 8-800-2000-122
- Multi-turn session context сохраняется между сообщениями
- TTS (Fish Audio) возвращает audio/mpeg
- Responsive: 375x667 (mobile), 768x1024 (tablet), 1920x1080 (desktop)
- LOCKED файлы (`voice_config.py`, landing page в `App.css`) не тронуты
- Test report: `/app/test_reports/iteration_15.json`

### Backlog (P1)
- Google Sign-In через Emergent Auth
- Email/push-нотификации за сутки до консультации

### Backlog (P2)
- YuKassa / Telegram Stars платежи
- PWA
- WebSockets для чата
- Admin-панель
