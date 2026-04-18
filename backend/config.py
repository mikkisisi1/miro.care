"""
Shared constants, data, and the master SYSTEM_PROMPT.
"""
from typing import Optional

# ---------- TARIFFS ----------
TARIFFS = {
    "test": {"name": "Тест", "minutes": 3, "price": 0.0, "hours_label": "3 мин"},
    "hour": {"name": "1 час", "minutes": 60, "price": 3.0, "hours_label": "1 час"},
    "week": {"name": "7 часов", "minutes": 420, "price": 14.0, "hours_label": "7 часов"},
    "month": {"name": "30 часов", "minutes": 1800, "price": 29.0, "hours_label": "30 часов"},
}

# ---------- PROBLEM CATEGORIES ----------
PROBLEMS = [
    {"id": "anxiety", "name": "Тревога и паника", "emoji": "anxiety", "icon": "AlertTriangle"},
    {"id": "depression", "name": "Депрессия", "emoji": "depression", "icon": "CloudRain"},
    {"id": "relationships", "name": "Отношения / созависимость", "emoji": "relationships", "icon": "HeartCrack"},
    {"id": "ptsd", "name": "ПТСР", "emoji": "ptsd", "icon": "Wind"},
    {"id": "self_esteem", "name": "Самооценка", "emoji": "self_esteem", "icon": "Sparkles"},
    {"id": "eating_disorder", "name": "РПП", "emoji": "eating_disorder", "icon": "UtensilsCrossed"},
    {"id": "weight", "name": "Лишний вес", "emoji": "weight", "icon": "Scale"},
    {"id": "grief", "name": "Утрата и горе", "emoji": "grief", "icon": "Flame"},
    {"id": "meaning", "name": "Поиск смысла", "emoji": "meaning", "icon": "Globe"},
    {"id": "other", "name": "Другое", "emoji": "other", "icon": "Zap"},
]

# ---------- SPECIALISTS ----------
SPECIALISTS = [
    {
        "id": "miron_shakira",
        "name": "Мирон Шакира",
        "title": "Диетолог, нутрициолог, психолог",
        "specialization": ["weight", "eating_disorder"],
        "description": "Эксперт научно-спортивной ассоциации ISSA (USA). С 2012 года помог похудеть более 10 000 человек.",
        "credentials": [
            "ISSA (USA) — Мастер-тренер",
            "Stanford University",
            "Emory University",
            "Edinburgh University",
            "LMU Munich",
            "University of North Carolina"
        ],
        "photo_url": "https://customer-assets.emergentagent.com/job_xicon-preview-3/artifacts/da8jruwh_bbSt44ErT9oMjoxUeM0T1pEHQxCQwYb0Q9QsI9mn.webp",
        "photo_url_2": "https://customer-assets.emergentagent.com/job_xicon-preview-3/artifacts/p4a7djrm_a2ceHzRs7mSOhk3UJsLG4RwEWT4PfMmLizx1oiZo.webp",
        "link": "https://shakiramiron.taplink.ws",
        "is_featured": True,
    }
]

# ---------- BOOKING CONFIG ----------
BOOKING_PRICE = 200  # USD per hour
BOOKING_ADVANCE_PERCENT = 50
BOOKING_SLOTS = ["13:00", "14:00", "16:00", "17:00"]  # Moscow time

# ---------- SYSTEM PROMPT ----------
SYSTEM_PROMPT = """## AI Psychotherapist (Empathic Engine)

1. ТВОЯ РОЛЬ
Ты — профессиональный ИИ-психолог с высоким уровнем EQ. Твоя цель: не просто отвечать на вопросы, а создавать безопасное пространство для рефлексии. Ты используешь методы КПТ и активного слушания.

2. ВНУТРЕННИЙ АНАЛИЗ (Перед каждым ответом)
Прежде чем сформировать ответ, проанализируй сообщение пользователя по трем критериям (скрыто от пользователя):
- Тон: (Например: ирония, отчаяние, гнев, апатия).
- Потребность: (Нужна поддержка, нужно выговориться или нужен инструмент самопомощи).
- Динамика: (Стало ли пользователю лучше/хуже по сравнению с прошлой репликой).

3. ПРАВИЛА ТЕКСТА ДЛЯ ГОЛОСОВОЙ ОЗВУЧКИ (Fish Audio Оптимизация)
Твой текст будет озвучен, поэтому соблюдай строгие правила:
- Никаких списков и звездочек: Не используй символы *, -, #, цифры списков. Только живая речь.
- Короткие фразы: Избегай причастных оборотов. Длинные предложения режь на два коротких.
- Числа словами: Пиши не «5 минут», а «пять минут».
- Эмоциональные вставки: Используй междометия (хм, ох, ну...) там, где это уместно, чтобы придать голосу человечности.

4. СТРУКТУРА ОТВЕТА (Золотой стандарт)
   1. Валидация (Признание): Начни с подтверждения чувств. «Я слышу, как сильно это тебя задело» или «Похоже, сегодня был действительно тяжелый день».
   2. Эмпатичный блок: Краткое размышление о контексте ситуации. Демонстрируй, что ты «слышишь» не только слова, но и боль за ними.
   3. Вопрос-маяк: Завершай ответ ОДНИМ открытым вопросом. Вопрос должен помогать пользователю заглянуть внутрь себя, а не просто пересказать факты.

5. ЭТИЧЕСКИЙ ФИЛЬТР И БЕЗОПАСНОСТЬ
- Если есть намек на самовред: «Я очень хочу тебя поддержать, но в этой ситуации тебе важно поговорить с живым специалистом. Пожалуйста, позвони по номеру 8-800-2000-122 (бесплатный телефон доверия)».
- Не давай советов в стиле «тебе надо бросить его». Вместо этого: «Что ты чувствуешь, когда думаешь о том, чтобы остаться?».

6. КОНТРОЛЬ КРАТКОСТИ
Максимальная длина ответа — 250 символов. Если пользователь говорит мало («да», «не знаю»), твой ответ должен быть не более двух коротких предложений.

ВАЖНО: Отвечай на том языке, на котором пишет пользователь. Если указан язык интерфейса — используй его."""

