# DESIGN LOCK — MIRO.CARE
# ЗАПРЕТ НА ИЗМЕНЕНИЕ ДИЗАЙНА БЕЗ ПРЯМОГО ЗАПРОСА ПОЛЬЗОВАТЕЛЯ

## ПРАВИЛО: НЕ МЕНЯТЬ БЕЗ ЗАПРОСА
Агент НЕ имеет права менять ЛЮБЫЕ параметры дизайна по своей инициативе.
Если пользователь не просил — НЕ ТРОГАТЬ. Никакой "самодеятельности".

---

## LANDING PAGE — LOCKED

### Фото Miron Shakira
- Desktop: width 55%, height 100%, object-fit cover, object-position top center, opacity 1
- Mobile (max-width 768px): width 100%, opacity 0.7
- ЗАПРЕЩЕНО: менять размер, позицию, opacity

### Бренд MIRO CARE
- position absolute, z-index 5, left 40px, top 50%
- font-weight 800, font-size clamp(4rem, 10vw, 8rem)
- color #FFFFFF, letter-spacing 0.06em
- Mobile: left 20px, bottom 280px
- translate="no" — НЕ УДАЛЯТЬ (защита от Chrome auto-translate)

### Стеклянная панель (.landing-glass)
- background: rgba(255, 255, 255, 0.08)
- backdrop-filter: blur(8px)
- border: 0.5px solid var(--accent)
- border-radius: 20px
- padding: 28px 32px 24px
- Mobile: left/right 16px, bottom 16px, padding 20px
- ЗАПРЕЩЕНО: менять фон, блюр, прозрачность, градиенты

### Кнопка "Психолог" (.landing-glass-cta)
- background: #0B1A35
- border: 0.5px solid var(--accent)
- border-radius: 50px
- padding: 14px 40px
- letter-spacing: 0.2em, text-transform uppercase

### Свечение кнопки (.landing-cta-glow)
- radial-gradient: rgba(60, 150, 255, 0.6) center
- animation: ctaBreathe 4s ease-in-out infinite
- opacity: 0.2 → 1, scale: 0.8 → 1.15
- ЗАПРЕЩЕНО: убирать или ослаблять

### Бургер-кнопка
- УДАЛЕНА с лендинга. НЕ ВОЗВРАЩАТЬ.

---

## CHAT PAGE — LOCKED

### Шапка чата (.xc-chat-header)
- Содержит: стрелка назад, аватары Miron/Oksana, MIRO.CARE, статус, TTS toggle, кнопка меню (Menu icon)
- Кнопка меню открывает BurgerMenu

---

## CSS VARIABLES — LOCKED
- --bg: #1C1C1E
- --bg-end: #262629
- --accent: #3C8CFF
- --font-heading: 'Outfit'
- --font-body: 'Manrope'
- --glass-blur: 20px
- --border: rgba(255, 255, 255, 0.15)

---

## NAVIGATION FLOW — LOCKED
- Landing → /problems → /chat (мгновенный переход, API в фоне)
- Меню доступно ТОЛЬКО из шапки чата (кнопка Menu)
- Меню НЕ доступно с лендинга

---

Дата блокировки: 2026-04-17
