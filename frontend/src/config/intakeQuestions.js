// Weight-loss intake questionnaire (RU). Sequential Q2..Q14 per TЗ.
// type: 'single' | 'single_custom' | 'multi' | 'multi_custom' | 'data'
export const INTAKE_QUESTIONS = [
  { id: 'q2', text: 'Вы хотите снизить вес для себя или помочь кому-то из близких?', type: 'single', options: ['Для себя', 'Для близкого человека'] },
  { id: 'q3', text: 'На сколько килограмм хотите снизить?', type: 'single', options: ['До 5 кг', '5–10 кг', '10–20 кг', 'Более 20 кг'] },
  { id: 'q4', text: 'Укажите ваши данные:', type: 'data', fields: [
    { key: 'age', label: 'Возраст' },
    { key: 'weight', label: 'Вес сейчас (кг)' },
    { key: 'height', label: 'Рост (см)' },
  ] },
  { id: 'q5', text: 'Раньше удавалось снижать вес?', type: 'single', options: ['Да, получалось', 'Пробовал(а), но без результата', 'Никогда не пробовал(а)'] },
  { id: 'q6', text: 'Если да — вес потом возвращался?', type: 'single_custom', options: ['Да, возвращался весь', 'Возвращалась часть', 'Держался долго'], skipIf: (a) => a.q5 === 'Никогда не пробовал(а)' },
  { id: 'q7', text: 'Как сейчас меняется ваш вес?', type: 'single_custom', options: ['Постепенно растёт', 'Стоит на месте', 'Гуляет туда-сюда'] },
  { id: 'q8', text: 'Бывает сложно остановиться в еде?', type: 'single', options: ['Да, часто', 'Иногда', 'Редко', 'Нет'] },
  { id: 'q9', text: 'Когда это чаще всего происходит?', type: 'single_custom', options: ['Утром', 'Днём', 'Вечером', 'Ночью'], skipIf: (a) => a.q8 === 'Нет' },
  { id: 'q10', text: 'Что обычно запускает переедание?', type: 'multi_custom', options: ['Усталость', 'Стресс', 'Скука', 'Просто привычка', 'Компания/застолье'], skipIf: (a) => a.q8 === 'Нет' },
  { id: 'q11', text: 'Уровень физической активности?', type: 'single', options: ['Почти нет движения', 'Лёгкая активность (прогулки)', 'Умеренная (3–4 раза в неделю)', 'Высокая (спорт регулярно)'] },
  { id: 'q12', text: 'Как со сном?', type: 'single_custom', options: ['Сплю меньше 6 часов', '6–7 часов', '7–8 часов'] },
  { id: 'q13', text: 'Есть ли ограничения по здоровью? (можно выбрать несколько)', type: 'multi_custom', options: ['Давление', 'Сахарный диабет', 'Щитовидная железа', 'Суставы', 'Сердце', 'Нет ограничений'] },
  { id: 'q14', text: 'Насколько важно решить это сейчас?', type: 'single', options: ['1–3: Пока просто смотрю', '4–6: Хочу, но не горит', '7–8: Важно, готов(а) действовать', '9–10: Приоритет номер один'] },
];

export const INTAKE_INTRO = (name) =>
  `Приятно познакомиться, ${name}! Чтобы сразу работать точно под вашу ситуацию, задам несколько коротких вопросов. Это займёт 2–3 минуты.`;

export const INTAKE_OUTRO = (name) =>
  `Спасибо, ${name}. Картина понятна. Теперь расскажите своими словами — что сейчас происходит и что пробовали раньше?`;

export function nextIntakeStep(answers, currentIdx) {
  for (let i = currentIdx + 1; i < INTAKE_QUESTIONS.length; i++) {
    const q = INTAKE_QUESTIONS[i];
    if (q.skipIf && q.skipIf(answers)) continue;
    return i;
  }
  return -1;
}

export function buildIntakeSummary(name, answers) {
  const q = (id) => answers[id] || '—';
  const weight = parseFloat(answers.q4_weight);
  const height = parseFloat(answers.q4_height);
  let bmi = '';
  if (weight > 0 && height > 0) {
    const m = height / 100;
    bmi = (weight / (m * m)).toFixed(1);
  }
  const lines = [
    `[АНКЕТА]`,
    `Имя: ${name}`,
    `Для кого: ${q('q2')}`,
    `Цель снизить: ${q('q3')}`,
    `Возраст: ${answers.q4_age || '—'}, Вес: ${answers.q4_weight || '—'} кг, Рост: ${answers.q4_height || '—'} см${bmi ? ` (ИМТ ${bmi})` : ''}`,
    `Опыт похудения: ${q('q5')}`,
    answers.q6 ? `Возвращался ли вес: ${q('q6')}` : null,
    `Текущая динамика: ${q('q7')}`,
    `Сложно остановиться в еде: ${q('q8')}`,
    answers.q9 ? `Когда переедание: ${q('q9')}` : null,
    answers.q10 ? `Триггеры переедания: ${q('q10')}` : null,
    `Активность: ${q('q11')}`,
    `Сон: ${q('q12')}`,
    `Ограничения здоровья: ${q('q13')}`,
    `Мотивация: ${q('q14')}`,
  ].filter(Boolean);
  return lines.join('\n');
}
