# Miro.Care — Product Requirements Document

## Original Problem Statement
Hybrid AI-psychologist platform (React + FastAPI + MongoDB) with Fish Audio S2-Pro streaming TTS, emotional markers, multi-language and responsive support. Voice selection (male "Мирон" / female "Оксана") with locked prosody and emotional control.

## Core Requirements
- Voice synthesis via Fish Audio S2-Pro (streaming, balanced latency, bracket emotion syntax)
- LLM chat via OpenRouter (Claude Sonnet 4.5) with Anthropic prompt-caching
- Protected voice configuration in `voice_config.py` (no unauthorized edits)
- Protected landing-page CSS (`App.css` lines 70–240, clearly marked 🔒 LOCKED SECTION)
- At-rest encryption of chat messages & session notes (Fernet AES-128 + HMAC, key in `CHAT_ENCRYPTION_KEY`)
- Confidentiality-aware system prompt (§7): Мирон/Оксана честно отвечают что разговор защищён
- Agent switch in chat: click other avatar → new session, full fresh greeting, new voice
- Typing indicator: avatar + 3-dot animation + localized "печатает…" label
- Multi-language (ru/en/zh/es/ar/fr/de/hi), responsive mobile + desktop UI
- Deployment to Emergent platform (K8s + Cloudflare) — currently blocked by platform wrapper timeout

## Locked / Protected
- `voice_config.py` — Fish Audio voice IDs, prosody, emotion markers, cleanup rules
- Landing-page CSS (`App.css` lines 70–240) — marked with 🔒 LOCKED SECTION banner
- AI names: **Мирон** (male), **Оксана** (female)
- Male voice ID: `5cfccfb8aae14938be283ea6400b4a8a`
- Female voice ID: `7a98513e3a7d439682fa68f8d4da34c0`
- Confidentiality contract: диалог зашифрован at-rest; доступ только у пользователя через его личный кабинет

## Changelog
- 2026-04-18: Replaced female voice ID → `7a98513e3a7d439682fa68f8d4da34c0` (kept name "Оксана")
- 2026-04-18: Rolled back unauthorized deployment fixes (metrics, lazy loading) at user's request
- 2026-04-18: Added `/health` and `/api/health` for K8s readiness, moved DB init to background task, lazy SDK imports (33s → 0.45s cold start)
- 2026-04-19: **Bug fix** — chat responses no longer truncate mid-word. Raised max_tokens (short 80→160, medium 220→400, long 600→900) and added `_truncate_to_sentence()` fallback on `finish_reason=='length'`
- 2026-04-19: **Confidentiality** — at-rest Fernet encryption for `chat_messages.user_message`, `chat_messages.ai_response`, `users.session_notes`. New module `crypto_utils.py` with `ENC1::` prefix for backward compatibility. API endpoints auto-decrypt. SYSTEM_PROMPT §7 added.
- 2026-04-19: **Agent switch mid-dialog** — both avatars always clickable; clicking other agent starts a new `session_id`, clears history, plays full greeting in current language with new voice
- 2026-04-19: **Typing indicator** enhanced — avatar + 3-dot animation + localized label (`typingMiron`/`typingOksana` in 8 languages)
- 2026-04-19: **TTS stability** — rewrote `useAudioStream.js` with clean MSE→blob fallback, handlers cleanup, silenced benign `AbortError`/`DataCloneError` from CRA HMR. Also reduced cyclomatic complexity.
- 2026-04-19: **Landing CSS lock** — wrapped lines 70–240 in explicit 🔒 LOCKED SECTION banner
- 2026-04-19: **i18n pass #2** — fixed hardcoded Russian strings: ChatPage alert & greeting pre-cache (now uses current `lang`), useChat error message, useSpeechRecognition alerts (3 places), PaymentSuccess fallback strings, BookingCalendar (legend/tz/price unit/month/weekday names). Added translation keys: `errorTryAgain`, `bookingFailed` in all 8 languages. `ChatInputArea` now accepts `unsupportedTitle` prop.

## Testing Status
- Iteration 17 (backend+frontend): **100% pass** — 12/12 scenarios including 8 languages, gender switching, encryption, TTS, UI flows
- Console warnings: **0** after useAudioStream rewrite

## Known Issues / Blocked
- 🔴 Production deployment: Cloudflare 520 / 120s wrapper timeout — **Emergent infra bug**, escalated to support. Do NOT attempt code fixes.

## Backlog (P2)
- Streaming Claude text → streaming TTS via SSE with barge-in
- Crisis-escalation logic (suicide risk detection)
- RAG / embeddings for `session_notes`
- Email/push notifications 24h before consultation
- YuKassa / Telegram Stars payments
- PWA support
- Admin panel
- Refactor: move API routes to `/app/backend/routes`, models to `/app/backend/models`, tests to `/app/backend/tests`

## Technical Debt (P1, optional)
- Remove hardcoded secret in `tests/test_iteration16_tts_streaming.py:20`
- Fix missing React hook dependencies: `useSpeechRecognition.js`, `useImageUpload.js`, `PaymentSuccess.jsx`, `useCountdown.js`
- Move auth token from `localStorage` to `httpOnly` cookie (security)

## Integrations
- OpenRouter (Claude Sonnet 4.5) — user API key
- Fish Audio S2-Pro (streaming TTS) — user API key
- Stripe (payments) — test key
- Emergent Universal LLM Key (configured as fallback)
