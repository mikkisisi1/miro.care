# 🔒 ЗАЩИЩЁННАЯ КОНФИГУРАЦИЯ ГОЛОСОВЫХ НАСТРОЕК FISH AUDIO

## ⚠️ КРИТИЧНО: НЕ ИЗМЕНЯТЬ БЕЗ СОГЛАСОВАНИЯ

Эта конфигурация оптимизирована для **профессиональной психологической консультации** с эмпатичной манерой речи.

---

## 📁 ЗАЩИЩЁННЫЕ ФАЙЛЫ

### 1. `/app/backend/voice_config.py`
**Статус:** 🔒 ЗАЩИЩЕНО ОТ ИЗМЕНЕНИЙ

**Содержит:**
- Voice IDs для агентов (Мирон, Оксана)
- Prosody параметры (speed=0.88, volume=4)
- Эмоциональные маркеры Fish Audio
- Правила очистки текста
- Ограничения длины текста

**Параметры:**
```python
PROSODY_CONFIG = {
    "speed": 0.88,    # 0.88 = медленнее на 12% для спокойной, вдумчивой речи
    "volume": 4,      # +4 dB для комфортной громкости
}

EMOTION_MARKERS = {
    "base": "(calm)(soft tone)",     # Спокойный, мягкий тон (всегда)
    "empathy": "(warm)(gentle)",     # Тёплый, деликатный
    "thoughtful": "(thoughtful)",    # Задумчивый
    "pause": "(sighing)",            # Естественные паузы
}
```

### 2. `/app/backend/routes/tts.py`
**Статус:** 🔒 ЗАЩИЩЕНО ОТ ИЗМЕНЕНИЙ

**Функционал:**
- Стриминг TTS с Fish Audio
- Автоматическое добавление эмоций к тексту
- Контроль Prosody (speed, volume)
- Очистка текста от markdown и форматирования

**Ключевые функции:**
- `clean_text_for_tts()` — очистка от markdown, списков, символов
- `add_emotion_markers()` — автоматическое добавление (calm)(soft tone) + паузы для междометий
- `text_to_speech()` — эндпоинт с Prosody и стримингом

### 3. `/app/backend/config.py`
**Статус:** 🔒 ЗАЩИЩЕНО ОТ ИЗМЕНЕНИЙ (SYSTEM_PROMPT)

**Empathic Engine System Prompt:**
- Оптимизирован для Fish Audio TTS
- Правила генерации текста с междометиями (хм, ох, эх)
- Контроль краткости (максимум 250 символов)
- Числа прописью ("пять минут", не "5 минут")
- Запрет на markdown символы (*, #, -, списки)

---

## 🎯 КАК ЭТО РАБОТАЕТ

### Пример обработки текста:

**1. Текст от LLM (Claude):**
```
"Хм... я понимаю, как это тяжело для тебя. Похоже, сегодня был действительно сложный день."
```

**2. После `clean_text_for_tts()`:**
```
"Хм... я понимаю, как это тяжело для тебя. Похоже, сегодня был действительно сложный день."
```
(Никаких изменений, т.к. текст уже чистый)

**3. После `add_emotion_markers()`:**
```
"(calm)(soft tone) (sighing) Хм... я понимаю, как это тяжело для тебя. Похоже, сегодня был действительно сложный день."
```

**4. Отправка в Fish Audio API:**
```python
TTSRequest(
    text="(calm)(soft tone) (sighing) Хм...",
    reference_id="5cfccfb8aae14938be283ea6400b4a8a",  # Мирон (мужской)
    prosody=Prosody(speed=0.88, volume=4),
    format="mp3"
)
```

**5. Результат:**
- ✅ Спокойный, мягкий тон голоса `(calm)(soft tone)`
- ✅ Естественная пауза перед "Хм..." `(sighing)`
- ✅ Медленная речь (0.88x скорости) для вдумчивости
- ✅ Комфортная громкость (+4 dB)

---

## 🎤 ХАРАКТЕРИСТИКИ ГОЛОСА

### Целевая манера (достигнута):
- ✅ **Профессиональный** — через (calm) и медленную скорость (0.88)
- ✅ **Спокойный** — через (calm) и (soft tone)
- ✅ **Живой** — через междометия (хм, ох, эх) с (sighing)
- ✅ **Внимательный** — через (thoughtful) для многоточий
- ✅ **Естественные паузы** — через (sighing) и "..."
- ✅ **Эмпатичный** — через (warm)(gentle)
- ✅ **Тёплый** — через (soft tone) и (warm)

---

## ⚠️ ЧТО НЕЛЬЗЯ ДЕЛАТЬ

### ❌ ЗАПРЕЩЕНО:
1. **Изменять PROSODY_CONFIG** в `voice_config.py` без тестирования на реальных пользователях
2. **Удалять эмоциональные маркеры** из `EMOTION_MARKERS`
3. **Изменять Voice IDs** (Мирон/Оксана) без согласования
4. **Удалять функцию `add_emotion_markers()`** из tts.py
5. **Изменять System Prompt** без понимания влияния на TTS
6. **Ускорять речь** (speed > 1.0) — это сломает спокойную манеру
7. **Добавлять markdown** в System Prompt (звездочки, списки)

### ✅ РАЗРЕШЕНО (с осторожностью):
1. Тестировать новые эмоции Fish Audio (только в dev окружении)
2. Добавлять новые правила очистки текста в `clean_text_for_tts()`
3. Настраивать volume (+/- 2 dB от текущего значения)
4. Добавлять новые контексты в `EMOTION_MARKERS` (например, для кризисных ситуаций)

---

## 🧪 ТЕСТИРОВАНИЕ

### Тест 1: Базовая озвучка с эмоциями
```bash
API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)

curl -X POST "$API_URL/api/tts" \
  -H "Content-Type: application/json" \
  -d '{"text": "Хм... я понимаю, как это тяжело.", "voice": "male"}' \
  --output test_male.mp3
```

### Тест 2: Женский голос
```bash
curl -X POST "$API_URL/api/tts" \
  -H "Content-Type: application/json" \
  -d '{"text": "Это действительно сложная ситуация...", "voice": "female"}' \
  --output test_female.mp3
```

### Проверка логов:
```bash
tail -f /var/log/supervisor/backend.*.log | grep "TTS Request"
```

Ожидаемый вывод:
```
INFO - TTS Request | Voice: male | Text length: 131 | Emotion-enhanced: Yes | Speed: 0.88
```

---

## 📊 МОНИТОРИНГ

### Проверка заголовков ответа:
```bash
curl -I -X POST "$API_URL/api/tts" \
  -H "Content-Type: application/json" \
  -d '{"text": "Тест", "voice": "male"}'
```

Ожидаемые заголовки:
```
X-Voice-Config: speed=0.88,volume=4
X-Emotion-Mode: empathic-psychologist
Content-Type: audio/mpeg
Transfer-Encoding: chunked
```

---

## 🔧 ВОССТАНОВЛЕНИЕ ПРИ ПОЛОМКЕ

Если кто-то случайно изменил конфигурацию:

1. **Восстановить `voice_config.py`:**
   ```bash
   git checkout /app/backend/voice_config.py
   ```

2. **Восстановить `tts.py`:**
   ```bash
   git checkout /app/backend/routes/tts.py
   ```

3. **Перезапустить backend:**
   ```bash
   sudo supervisorctl restart backend
   ```

4. **Проверить работоспособность:**
   ```bash
   curl -X POST "$API_URL/api/tts" \
     -H "Content-Type: application/json" \
     -d '{"text": "Тест", "voice": "male"}' \
     --output test.mp3
   ```

---

## 📞 КОНТАКТЫ

При возникновении проблем с голосовыми настройками:
1. Проверить логи: `tail -f /var/log/supervisor/backend.*.log`
2. Проверить .env файл: `cat /app/backend/.env | grep FISH`
3. НЕ ИЗМЕНЯТЬ конфигурацию самостоятельно
4. Обратиться к разработчику, создавшему эту защиту

---

**Дата создания:** 18 апреля 2026  
**Версия:** 1.0 (Protected)  
**Статус:** 🔒 PRODUCTION-READY
