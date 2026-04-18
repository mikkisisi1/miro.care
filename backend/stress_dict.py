"""
Мини-словарь ударений для Fish Audio TTS (русский).
Добавляет Unicode-combining acute accent U+0301 (`́`) после ударной гласной.

Работает только при TTSRequest(normalize=False).
Применяется как регулярное post-processing перед отправкой текста в Fish.

Пополнять словарь по мере обнаружения проблемных слов.
"""
import re

ACUTE = "\u0301"  # Combining acute accent — после ударной гласной


# key — слово БЕЗ ударения (lowercase), value — то же слово с ударением (Unicode acute).
# Добавляем только те слова, где ударение критично и Fish его ставит неверно.
STRESS_MAP = {
    # Глаголы
    "начать":    f"нача{ACUTE}ть",
    "начал":     f"на{ACUTE}чал",
    "начала":    f"начала{ACUTE}",
    "понял":     f"по{ACUTE}нял",
    "поняла":    f"поняла{ACUTE}",
    "звонит":    f"звони{ACUTE}т",
    "звонят":    f"звоня{ACUTE}т",
    "позвонит":  f"позвони{ACUTE}т",
    "включит":   f"включи{ACUTE}т",
    "включат":   f"включа{ACUTE}т",
    "облегчить": f"облегчи{ACUTE}ть",
    "облегчит":  f"облегчи{ACUTE}т",
    "углубить":  f"углуби{ACUTE}ть",
    "принял":    f"при{ACUTE}нял",
    "приняла":   f"приняла{ACUTE}",
    "занял":     f"за{ACUTE}нял",
    "заняла":    f"заняла{ACUTE}",
    "создал":    f"созда{ACUTE}л",
    "создала":   f"создала{ACUTE}",

    # Существительные
    "договор":   f"догово{ACUTE}р",
    "квартал":   f"кварта{ACUTE}л",
    "каталог":   f"катало{ACUTE}г",
    "средства":  f"сре{ACUTE}дства",
    "средствах": f"сре{ACUTE}дствах",
    "намерение": f"наме{ACUTE}рение",
    "досуг":     f"досу{ACUTE}г",
    "эксперт":   f"экспе{ACUTE}рт",
    "торты":     f"то{ACUTE}рты",
    "банты":     f"ба{ACUTE}нты",
    "свекла":    f"свё{ACUTE}кла",
    "шарфы":     f"ша{ACUTE}рфы",

    # Часто в психологической беседе
    "облегчение": f"облегче{ACUTE}ние",
    "чувствую":   f"чу{ACUTE}вствую",
    "чувствует":  f"чу{ACUTE}вствует",
    "сострадание": f"сострада{ACUTE}ние",
    "рефлексия":   f"рефле{ACUTE}ксия",
    "давящий":     f"давя{ACUTE}щий",
    "давящее":     f"давя{ACUTE}щее",
}


# Скомпилированный regex со всеми ключами, для эффективной замены целых слов.
_WORD_RE = re.compile(r"\b(" + "|".join(map(re.escape, STRESS_MAP.keys())) + r")\b", re.IGNORECASE)


def apply_stress(text: str) -> str:
    """
    Расставляет ударения по словарю, сохраняя регистр первой буквы.
    Пример: "Начал" → "На́чал", "начал" → "на́чал".
    """
    if not text:
        return text

    def _sub(m: re.Match) -> str:
        original = m.group(0)
        key = original.lower()
        replacement = STRESS_MAP.get(key)
        if not replacement:
            return original
        # Сохраняем регистр первой буквы
        if original[0].isupper():
            replacement = replacement[0].upper() + replacement[1:]
        return replacement

    return _WORD_RE.sub(_sub, text)
