// Extended translations for multi-language support (booking, payments, voice alerts, greetings).
// Merged with base translations in LanguageContext.

const MONTHS = {
  ru: ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  zh: ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'],
  es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
  ar: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
  fr: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  de: ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],
  hi: ['जनवरी','फ़रवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्टूबर','नवंबर','दिसंबर'],
};

const WEEKDAYS = {
  ru: ['Пн','Вт','Ср','Чт','Пт'],
  en: ['Mon','Tue','Wed','Thu','Fri'],
  zh: ['周一','周二','周三','周四','周五'],
  es: ['Lun','Mar','Mié','Jue','Vie'],
  ar: ['إثن','ثلا','أرب','خمي','جمع'],
  fr: ['Lun','Mar','Mer','Jeu','Ven'],
  de: ['Mo','Di','Mi','Do','Fr'],
  hi: ['सोम','मंगल','बुध','गुरु','शुक्र'],
};

// Greeting shown when voice is selected. Used both as chat message and as TTS text.
const GREETINGS = {
  ru: {
    male: 'Здравствуйте, я Мирон — ваш личный консультант.\nРасскажите в двух словах, что вас беспокоит, и мы вместе попробуем разобраться.\nКак мне к вам обращаться?',
    female: 'Здравствуйте, я Оксана — ваш личный консультант.\nРасскажите в двух словах, что вас беспокоит, и мы вместе попробуем разобраться.\nКак мне к вам обращаться?',
  },
  en: {
    male: 'Hello, I am Miron — your personal counselor.\nTell me briefly what is troubling you and we will try to work it out together.\nHow should I address you?',
    female: 'Hello, I am Oksana — your personal counselor.\nTell me briefly what is troubling you and we will try to work it out together.\nHow should I address you?',
  },
  zh: {
    male: '您好，我是米伦 — 您的个人心理顾问。\n请简要告诉我您的困扰，我们一起来面对。\n我该如何称呼您？',
    female: '您好，我是奥克萨娜 — 您的个人心理顾问。\n请简要告诉我您的困扰，我们一起来面对。\n我该如何称呼您？',
  },
  es: {
    male: 'Hola, soy Mirón — tu consejero personal.\nCuéntame brevemente qué te preocupa y lo resolveremos juntos.\n¿Cómo te puedo llamar?',
    female: 'Hola, soy Oksana — tu consejera personal.\nCuéntame brevemente qué te preocupa y lo resolveremos juntos.\n¿Cómo te puedo llamar?',
  },
  ar: {
    male: 'مرحبًا، أنا ميرون — مستشارك الشخصي.\nأخبرني باختصار عمَّا يُقلقك وسنحاول معًا حلَّه.\nكيف أناديك؟',
    female: 'مرحبًا، أنا أوكسانا — مستشارتك الشخصية.\nأخبرني باختصار عمَّا يُقلقك وسنحاول معًا حلَّه.\nكيف أناديك؟',
  },
  fr: {
    male: 'Bonjour, je suis Miron — votre conseiller personnel.\nDites-moi en quelques mots ce qui vous préoccupe et nous essaierons de le comprendre ensemble.\nComment dois-je vous appeler ?',
    female: 'Bonjour, je suis Oksana — votre conseillère personnelle.\nDites-moi en quelques mots ce qui vous préoccupe et nous essaierons de le comprendre ensemble.\nComment dois-je vous appeler ?',
  },
  de: {
    male: 'Hallo, ich bin Miron — Ihr persönlicher Berater.\nErzählen Sie mir kurz, was Sie beschäftigt, und wir versuchen gemeinsam, es zu klären.\nWie darf ich Sie ansprechen?',
    female: 'Hallo, ich bin Oksana — Ihre persönliche Beraterin.\nErzählen Sie mir kurz, was Sie beschäftigt, und wir versuchen gemeinsam, es zu klären.\nWie darf ich Sie ansprechen?',
  },
  hi: {
    male: 'नमस्ते, मैं मिरोन हूँ — आपका व्यक्तिगत सलाहकार।\nसंक्षेप में बताइए आपको क्या परेशान कर रहा है, हम साथ मिलकर समझने की कोशिश करेंगे।\nमैं आपको किस नाम से पुकारूँ?',
    female: 'नमस्ते, मैं ओक्साना हूँ — आपकी व्यक्तिगत सलाहकार।\nसंक्षेप में बताइए आपको क्या परेशान कर रहा है, हम साथ मिलकर समझने की कोशिश करेंगे।\nमैं आपको किस नाम से पुकारूँ?',
  },
};

// Extra UI keys (payments, booking, voice alerts)
export const TRANSLATIONS_EXTRA = {
  ru: {
    available: 'Свободно', booked: 'Занято', yours: 'Ваше',
    perHour: 'час', timeLabel: 'Время: Москва (UTC+3)',
    paymentExpired: 'Сессия оплаты истекла. Попробуйте снова.',
    paymentTimeout: 'Не удалось подтвердить оплату. Если деньги списались — не волнуйтесь, тариф активируется автоматически.',
    paymentError: 'Ошибка проверки оплаты.',
    goToChat: 'Перейти в чат',
    browserNoSpeech: 'Браузер не поддерживает распознавание речи. Используйте Chrome или Safari.',
    micDenied: 'Доступ к микрофону запрещён. Разрешите в настройках браузера.',
    micUnavailable: 'Микрофон недоступен.',
  },
  en: {
    available: 'Available', booked: 'Booked', yours: 'Yours',
    perHour: 'hr', timeLabel: 'Time: Moscow (UTC+3)',
    paymentExpired: 'Payment session expired. Please try again.',
    paymentTimeout: 'Could not confirm payment. If money was charged, the plan will activate automatically.',
    paymentError: 'Payment verification error.',
    goToChat: 'Go to chat',
    browserNoSpeech: 'Your browser does not support speech recognition. Please use Chrome or Safari.',
    micDenied: 'Microphone access denied. Please allow it in browser settings.',
    micUnavailable: 'Microphone unavailable.',
  },
  zh: {
    available: '可预约', booked: '已预约', yours: '您的',
    perHour: '小时', timeLabel: '时区：莫斯科 (UTC+3)',
    paymentExpired: '支付会话已过期，请重试。',
    paymentTimeout: '无法确认支付。如已扣款，套餐将自动激活。',
    paymentError: '支付验证错误。',
    goToChat: '进入聊天',
    browserNoSpeech: '浏览器不支持语音识别，请使用 Chrome 或 Safari。',
    micDenied: '麦克风访问被拒绝，请在浏览器设置中允许。',
    micUnavailable: '麦克风不可用。',
  },
  es: {
    available: 'Disponible', booked: 'Reservado', yours: 'Tuyo',
    perHour: 'h', timeLabel: 'Hora: Moscú (UTC+3)',
    paymentExpired: 'La sesión de pago ha expirado. Inténtalo de nuevo.',
    paymentTimeout: 'No se pudo confirmar el pago. Si se cobró, el plan se activará automáticamente.',
    paymentError: 'Error al verificar el pago.',
    goToChat: 'Ir al chat',
    browserNoSpeech: 'Tu navegador no admite reconocimiento de voz. Usa Chrome o Safari.',
    micDenied: 'Acceso al micrófono denegado. Permítelo en la configuración del navegador.',
    micUnavailable: 'Micrófono no disponible.',
  },
  ar: {
    available: 'متاح', booked: 'محجوز', yours: 'حجزك',
    perHour: 'ساعة', timeLabel: 'الوقت: موسكو (UTC+3)',
    paymentExpired: 'انتهت جلسة الدفع. الرجاء المحاولة مرة أخرى.',
    paymentTimeout: 'تعذَّر تأكيد الدفع. إذا تمَّ الخصم فسيتم تفعيل الباقة تلقائيًا.',
    paymentError: 'خطأ في التحقق من الدفع.',
    goToChat: 'الانتقال إلى الدردشة',
    browserNoSpeech: 'المتصفح لا يدعم التعرف على الصوت. استخدم Chrome أو Safari.',
    micDenied: 'تمَّ رفض الوصول إلى الميكروفون. اسمح به من إعدادات المتصفح.',
    micUnavailable: 'الميكروفون غير متاح.',
  },
  fr: {
    available: 'Disponible', booked: 'Réservé', yours: 'À vous',
    perHour: 'h', timeLabel: 'Heure : Moscou (UTC+3)',
    paymentExpired: 'La session de paiement a expiré. Veuillez réessayer.',
    paymentTimeout: "Impossible de confirmer le paiement. Si le montant a été débité, le forfait sera activé automatiquement.",
    paymentError: 'Erreur de vérification du paiement.',
    goToChat: 'Aller au chat',
    browserNoSpeech: "Votre navigateur ne prend pas en charge la reconnaissance vocale. Utilisez Chrome ou Safari.",
    micDenied: "Accès au microphone refusé. Autorisez-le dans les paramètres du navigateur.",
    micUnavailable: 'Microphone indisponible.',
  },
  de: {
    available: 'Frei', booked: 'Belegt', yours: 'Ihr Termin',
    perHour: 'Std', timeLabel: 'Zeit: Moskau (UTC+3)',
    paymentExpired: 'Die Zahlungssitzung ist abgelaufen. Bitte versuchen Sie es erneut.',
    paymentTimeout: 'Zahlung konnte nicht bestätigt werden. Falls abgebucht, wird der Tarif automatisch aktiviert.',
    paymentError: 'Fehler bei der Zahlungsprüfung.',
    goToChat: 'Zum Chat',
    browserNoSpeech: 'Ihr Browser unterstützt keine Spracherkennung. Bitte verwenden Sie Chrome oder Safari.',
    micDenied: 'Mikrofonzugriff verweigert. Bitte in den Browser-Einstellungen erlauben.',
    micUnavailable: 'Mikrofon nicht verfügbar.',
  },
  hi: {
    available: 'उपलब्ध', booked: 'बुक्ड', yours: 'आपका',
    perHour: 'घंटा', timeLabel: 'समय: मॉस्को (UTC+3)',
    paymentExpired: 'भुगतान सत्र समाप्त हो गया। कृपया पुनः प्रयास करें।',
    paymentTimeout: 'भुगतान की पुष्टि नहीं हो सकी। यदि राशि कट गई है, तो प्लान स्वतः सक्रिय हो जाएगा।',
    paymentError: 'भुगतान सत्यापन त्रुटि।',
    goToChat: 'चैट पर जाएँ',
    browserNoSpeech: 'ब्राउज़र वाक् पहचान का समर्थन नहीं करता। कृपया Chrome या Safari का उपयोग करें।',
    micDenied: 'माइक्रोफ़ोन की अनुमति अस्वीकृत। ब्राउज़र सेटिंग्स में अनुमति दें।',
    micUnavailable: 'माइक्रोफ़ोन उपलब्ध नहीं है।',
  },
};

export function getMonthName(lang, monthIdx) {
  return (MONTHS[lang] || MONTHS.en)[monthIdx] || '';
}

export function getWeekdayLabels(lang) {
  return WEEKDAYS[lang] || WEEKDAYS.en;
}

export function getGreeting(lang, voice) {
  const langGreets = GREETINGS[lang] || GREETINGS.en;
  return langGreets[voice] || langGreets.male;
}

// Приветствие при переключении агента посреди диалога — без повторного запроса имени,
// коротко, с намёком что контекст сохранён и можно продолжать.
const SWITCH_GREETINGS = {
  ru: {
    male: 'Здравствуйте, теперь с вами я — Мирон. Я вижу наш разговор. О чём продолжим?',
    female: 'Здравствуйте, теперь с вами я — Оксана. Я вижу наш разговор. О чём продолжим?',
  },
  en: {
    male: "Hello, I'm Miron — I'll be with you now. I can see our conversation. Where would you like to continue?",
    female: "Hello, I'm Oksana — I'll be with you now. I can see our conversation. Where would you like to continue?",
  },
  zh: {
    male: '您好，现在由我 — 米伦 — 来陪您。我已了解之前的对话，想从哪里继续？',
    female: '您好，现在由我 — 奥克萨娜 — 来陪您。我已了解之前的对话，想从哪里继续？',
  },
  es: {
    male: 'Hola, ahora estaré yo contigo — soy Mirón. Ya estoy al tanto de nuestra conversación. ¿Por dónde seguimos?',
    female: 'Hola, ahora estaré yo contigo — soy Oksana. Ya estoy al tanto de nuestra conversación. ¿Por dónde seguimos?',
  },
  ar: {
    male: 'مرحبًا، أنا ميرون — سأكون معك الآن. أطَّلعت على حديثنا، من أين نكمل؟',
    female: 'مرحبًا، أنا أوكسانا — سأكون معك الآن. أطَّلعت على حديثنا، من أين نكمل؟',
  },
  fr: {
    male: "Bonjour, c'est moi qui prends la suite — Miron. Je vois notre conversation. Par où continuons-nous ?",
    female: "Bonjour, c'est moi qui prends la suite — Oksana. Je vois notre conversation. Par où continuons-nous ?",
  },
  de: {
    male: 'Hallo, jetzt bin ich bei Ihnen — Miron. Ich kenne unser Gespräch. Wo machen wir weiter?',
    female: 'Hallo, jetzt bin ich bei Ihnen — Oksana. Ich kenne unser Gespräch. Wo machen wir weiter?',
  },
  hi: {
    male: 'नमस्ते, अब मैं — मिरोन — आपके साथ हूँ। हमारी बातचीत मेरे सामने है, कहाँ से जारी रखें?',
    female: 'नमस्ते, अब मैं — ओक्साना — आपके साथ हूँ। हमारी बातचीत मेरे सामने है, कहाँ से जारी रखें?',
  },
};

export function getSwitchGreeting(lang, voice) {
  const langGreets = SWITCH_GREETINGS[lang] || SWITCH_GREETINGS.en;
  return langGreets[voice] || langGreets.male;
}
