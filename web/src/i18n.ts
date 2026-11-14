export type UiLanguage = "uz" | "cyr" | "ru" | "en";

export const UI_LANGUAGE_KEY = "huquqiy-yordam.lang.v1";

export const languages: Array<{ id: UiLanguage; label: string; locale: string }> = [
  { id: "uz", label: "Oʻzbek (lotin)", locale: "uz-Latn-UZ" },
  { id: "cyr", label: "Ўзбек (кирилл)", locale: "uz-Cyrl-UZ" },
  { id: "ru", label: "Русский", locale: "ru-RU" },
  { id: "en", label: "English", locale: "en-US" },
];

type Dict = Record<string, string>;

const uz: Dict = {
  "app.name": "Huquqiy yordam",
  "app.tagline": "AI huquqiy maʼlumot",
  "app.title": "Huquqiy yordam — AI huquqiy maʼlumot",
  "app.description": "Oʻzbekiston qonunlari asosida huquqiy maʼlumot va keyingi amaliy qadamlar.",
  "skip.link": "Asosiy mazmunga oʻtish",
  "aria.sidebar": "Suhbatlar",
  "aria.history": "Saqlangan suhbatlar",
  "aria.closeSidebar": "Suhbatlar panelini yopish",
  "aria.openHistory": "Saqlangan suhbatlarni ochish",
  "aria.chat": "Suhbat",
  "aria.question": "Huquqiy savolingiz",
  "aria.send": "Xabarni yuborish",
  "aria.stop": "Javob tayyorlashni toʻxtatish",
  "aria.deleteConversation": "suhbatini oʻchirish",
  "aria.renameConversation": "suhbat nomini oʻzgartirish",
  "aria.exportConversation": "suhbatini fayl sifatida saqlash",
  "aria.openLex": "Lex.uzda ochish",
  "aria.theme": "Tema almashtirish",
  "aria.export": "Suhbatni matn fayl qilib yuklab olish",
  "aria.searchHistory": "Suhbatlardan qidirish",
  "aria.scrollBottom": "Eng pastga oʻtish",
  "aria.typing": "Javob tayyorlanmoqda",
  "chat.new": "Yangi suhbat",
  "chat.searchPlaceholder": "Suhbatlardan qidirish...",
  "chat.historyHeading": "SUHBATLAR",
  "chat.localNote": "Suhbatlar faqat shu qurilmada saqlanadi",
  "chat.clearHistory": "Barcha tarixni tozalash",
  "chat.themeLabel": "Tungi rejim",
  "chat.themeLight": "Kunduzgi rejim",
  "chat.export": "Yuklab olish",
  "chat.topTitle": "Huquqiy suhbat",
  "chat.snapshotPill": "Korpus: 2026-yil iyul",
  "chat.legalNotice":
    "Bu AI huquqiy maʼlumot beradi, advokat emas. Javoblar yuridik maslahat yoki ish natijasi kafolati emas. Qonunning amaldagi tahririni lex.uzdan tekshiring.",
  "chat.placeholder": "Vaziyatingizni oddiy tilda tushuntiring...",
  "chat.privacyHint": "Pasport, JShShIR, karta yoki maxfiy hujjat maʼlumotlarini yubormang.",
  "chat.snapshotNote":
    "Manbalar 2026-yil iyul snapshotidan. Qonun oʻzgargan boʻlishi mumkin — amaldagi holatni lex.uzdan tekshiring.",
  "chat.confirmDelete": "suhbatini oʻchirasizmi?",
  "chat.confirmClearAll": "Barcha saqlangan suhbatlarni ushbu qurilmadan oʻchirasizmi?",
  "chat.renamePrompt": "Yangi nom:",
  "chat.assistant": "Huquqiy yordam",
  "chat.you": "Siz",
  "chat.avatarAssistant": "H",
  "chat.avatarUser": "S",
  "chat.sources": "Manbalar",
  "chat.source": "Manba",
  "chat.copy": "Nusxa olish",
  "chat.retry": "Qayta urinish",
  "chat.retrieval": "Qidiruv",
  "welcome.eyebrow": "HUQUQIY MAʼLUMOT, SODDA TILDA",
  "welcome.headingLine1": "Vaziyatingizni",
  "welcome.headingEm": "birgalikda",
  "welcome.headingLine2": "koʻrib chiqamiz",
  "welcome.intro":
    "Nima boʻlganini oʻz soʻzlaringiz bilan yozing. Zarur boʻlsa, avval muhim bir-ikki narsani aniqlashtiramiz.",
  "welcome.examplesTitle": "Qayerdan boshlash mumkin",
  "welcome.example1": "Ish beruvchim ikki oydan beri maosh bermayapti. Qanday yoʻl tutsam boʻladi?",
  "welcome.example2": "Uy egasi ijara shartnomasini bekor qilmoqchi. Huquqlarim qanday?",
  "welcome.example3": "Meros masalasida aka-ukalar bilan kelisha olmayapmiz.",
  "welcome.snapshot":
    "Javoblar 2026-yil iyul oyidagi 25 ta qonun va kodeks matniga tayangan holda beriladi.",
  "notice.historyBroken":
    "Saqlangan tarixni oʻqib boʻlmadi. Uni tozalab, yangi suhbat boshlashingiz mumkin.",
  "notice.storageFull": "Brauzer xotirasi toʻldi. Eski suhbatlarni oʻchiring yoki tarixni tozalang.",
  "notice.noDeleteable": "Oʻchiriladigan suhbat yoʻq.",
  "notice.cleared": "Suhbatlar tarixi oʻchirildi.",
  "notice.noActiveExport": "Yuklab olish uchun ochiq suhbat yoʻq. Avval savol bering.",
  "notice.exported": "Suhbat matn fayl sifatida yuklab olindi.",
  "notice.copyFail": "Nusxa olishning iloji boʻlmadi. Matnni belgilang va qoʻlda nusxalang.",
  "notice.copied": "Javob nusxalandi.",
  "notice.searchEmpty": "Qidiruvga mos suhbat topilmadi.",
  "notice.historyEmpty": "Hozircha saqlangan suhbat yoʻq.",
  "notice.interrupted":
    "Javob brauzer yopilgani yoki qayta yuklangani sabab toʻxtagan. Qayta urinishingiz mumkin.",
  "error.unexpected": "Kutilmagan xatolik yuz berdi. Qayta urinib koʻring.",
  "error.cancelled": "Soʻrov bekor qilindi.",
  "export.filePrefix": "huquqiy-suhbat",
  "export.sources": "Manbalar:",
  "export.date": "Sana",
};

const cyr: Dict = {
  "app.name": "Ҳуқуқий ёрдам",
  "app.tagline": "AI ҳуқуқий маълумот",
  "app.title": "Ҳуқуқий ёрдам — AI ҳуқуқий маълумот",
  "app.description": "Ўзбекистон қонунлари асосида ҳуқуқий маълумот ва кейинги амалий қадамлар.",
  "skip.link": "Асосий мазмунга ўтиш",
  "aria.sidebar": "Суҳбатлар",
  "aria.history": "Сақланган суҳбатлар",
  "aria.closeSidebar": "Суҳбатлар panelини ёпиш",
  "aria.openHistory": "Сақланган суҳбатларни очиш",
  "aria.chat": "Суҳбат",
  "aria.question": "Ҳуқуқий саволингиз",
  "aria.send": "Хабарни юбориш",
  "aria.stop": "Жавоб тайёрлашни тўхтатиш",
  "aria.deleteConversation": "суҳбатини ўчириш",
  "aria.renameConversation": "суҳбат номини ўзгартириш",
  "aria.exportConversation": "суҳбатини файл сифатида сақлаш",
  "aria.openLex": "Lex.uzда очиш",
  "aria.theme": "Тема алмаштириш",
  "aria.export": "Суҳбатни матн файл қилиб юклаб олиш",
  "aria.searchHistory": "Суҳбатлардан қидириш",
  "aria.scrollBottom": "Энг пастга ўтиш",
  "aria.typing": "Жавоб тайёрланмоқда",
  "chat.new": "Янги суҳбат",
  "chat.searchPlaceholder": "Суҳбатлардан қидириш...",
  "chat.historyHeading": "СУҲБАТЛАР",
  "chat.localNote": "Суҳбатлар фақат шу қурилмада сақланади",
  "chat.clearHistory": "Барча тарихни тозалаш",
  "chat.themeLabel": "Тунги режим",
  "chat.themeLight": "Кундузги режим",
  "chat.export": "Юклаб олиш",
  "chat.topTitle": "Ҳуқуқий суҳбат",
  "chat.snapshotPill": "Корпус: 2026-йил июл",
  "chat.legalNotice":
    "Бу AI ҳуқуқий маълумот беради, адвокат эмас. Жавоблар юридик маслаҳат ёки иш натижаси кафолати эмас. Қонуннинг амалдаги таҳририни lex.uzдан текширинг.",
  "chat.placeholder": "Вазиятингизни оддий тилда тушунтиринг...",
  "chat.privacyHint": "Паспорт, ЖШШИР, карта ёки махфий ҳужжат маълумотларини юборманг.",
  "chat.snapshotNote":
    "Манбалар 2026-йил июл snapshotидан. Қонун ўзгарган бўлиши мумкин — амалдаги ҳолатни lex.uzдан текширинг.",
  "chat.confirmDelete": "суҳбатини ўчирасизми?",
  "chat.confirmClearAll": "Барча сақланган суҳбатларни ушбу қурилмадан ўчирасизми?",
  "chat.renamePrompt": "Янги ном:",
  "chat.assistant": "Ҳуқуқий ёрдам",
  "chat.you": "Сиз",
  "chat.avatarAssistant": "Ҳ",
  "chat.avatarUser": "С",
  "chat.sources": "Манбалар",
  "chat.source": "Манба",
  "chat.copy": "Нусха олиш",
  "chat.retry": "Қайта уриниш",
  "chat.retrieval": "Қидирув",
  "welcome.eyebrow": "ҲУҚУҚИЙ МАЪЛУМОТ, СОДДА ТИЛДА",
  "welcome.headingLine1": "Вазиятингизни",
  "welcome.headingEm": "биргаликда",
  "welcome.headingLine2": "кўриб чиқамиз",
  "welcome.intro":
    "Нима бўлганини ўз сўзларингиз билан ёзинг. Зарур бўлса, аввал муҳим бир-икки нарсани аниқлаштирамиз.",
  "welcome.examplesTitle": "Қayerдан бошлаш мумкин",
  "welcome.example1": "Иш берувчим икки ойдан бери маош бермаяпти. Қандай йўл тутсам бўлади?",
  "welcome.example2": "Уй эгаси ижара шартномасини бекор қилмоқчи. Ҳуқуқларим қандай?",
  "welcome.example3": "Мерос масаласида ака-укалар билан келиша олмаяпмиз.",
  "welcome.snapshot":
    "Жавоблар 2026-йил июл ойидаги 25 та қонун ва кодекс матнига таянган ҳолда берилади.",
  "notice.historyBroken":
    "Сақланган тарихни ўқиб бўлмади. Уни тозалаб, янги суҳбат бошлашингиз мумкин.",
  "notice.storageFull": "Браузер хотираси тўлди. Эски суҳбатларни ўчиринг ёки тарихни тозаланг.",
  "notice.noDeleteable": "Ўчириладиган суҳбат йўқ.",
  "notice.cleared": "Суҳбатлар тарихи ўчирилди.",
  "notice.noActiveExport": "Юклаб олиш учун очиқ суҳбат йўқ. Аввал савол беринг.",
  "notice.exported": "Суҳбат матн файл сифатида юклаб олинди.",
  "notice.copyFail": "Нусха олишнинг иложи бўлмади. Матнни белгиланг ва қўлда нусхаланг.",
  "notice.copied": "Жавоб нусхаланди.",
  "notice.searchEmpty": "Қидирувга мос суҳбат топилмади.",
  "notice.historyEmpty": "Ҳозирча сақланган суҳбат йўқ.",
  "notice.interrupted":
    "Жавоб браузер ёпилгани ёки қайта юклангани сабаб тўхтаган. Қайта уринишингиз мумкин.",
  "error.unexpected": "Кутилмаган хатолик юз берди. Қайта уриниб кўринг.",
  "error.cancelled": "Сўров бекор қилинди.",
  "export.filePrefix": "huquqiy-suhbat",
  "export.sources": "Манбалар:",
  "export.date": "Сана",
};

const ru: Dict = {
  "app.name": "Юридическая помощь",
  "app.tagline": "ИИ-информация по праву",
  "app.title": "Юридическая помощь — ИИ-информация по праву",
  "app.description":
    "Правовая информация и практические шаги на основе законов Узбекистана.",
  "skip.link": "Перейти к основному содержанию",
  "aria.sidebar": "Диалоги",
  "aria.history": "Сохранённые диалоги",
  "aria.closeSidebar": "Закрыть панель диалогов",
  "aria.openHistory": "Открыть сохранённые диалоги",
  "aria.chat": "Диалог",
  "aria.question": "Ваш правовой вопрос",
  "aria.send": "Отправить сообщение",
  "aria.stop": "Остановить подготовку ответа",
  "aria.deleteConversation": "удалить диалог",
  "aria.renameConversation": "переименовать диалог",
  "aria.exportConversation": "сохранить диалог как файл",
  "aria.openLex": "Открыть на Lex.uz",
  "aria.theme": "Переключить тему",
  "aria.export": "Скачать диалог в текстовый файл",
  "aria.searchHistory": "Поиск по диалогам",
  "aria.scrollBottom": "Прокрутить вниз",
  "aria.typing": "Ответ готовится",
  "chat.new": "Новый диалог",
  "chat.searchPlaceholder": "Поиск по диалогам...",
  "chat.historyHeading": "ДИАЛОГИ",
  "chat.localNote": "Диалоги хранятся только на этом устройстве",
  "chat.clearHistory": "Очистить всю историю",
  "chat.themeLabel": "Ночной режим",
  "chat.themeLight": "Дневной режим",
  "chat.export": "Скачать",
  "chat.topTitle": "Правовой диалог",
  "chat.snapshotPill": "Корпус: июль 2026",
  "chat.legalNotice":
    "Это ИИ-информация по праву, а не адвокат. Ответы не являются юридической консультацией или гарантией результата дела. Действующую редакцию закона проверяйте на lex.uz.",
  "chat.placeholder": "Опишите вашу ситуацию простыми словами...",
  "chat.privacyHint":
    "Не отправляйте паспорт, ПИНФЛ, данные карты или конфиденциальные документы.",
  "chat.snapshotNote":
    "Источники из среза за июль 2026. Закон мог измениться — проверяйте действующую версию на lex.uz.",
  "chat.confirmDelete": "удалить этот диалог?",
  "chat.confirmClearAll": "Удалить все сохранённые диалоги с этого устройства?",
  "chat.renamePrompt": "Новое название:",
  "chat.assistant": "Юридическая помощь",
  "chat.you": "Вы",
  "chat.avatarAssistant": "Ю",
  "chat.avatarUser": "В",
  "chat.sources": "Источники",
  "chat.source": "Источник",
  "chat.copy": "Копировать",
  "chat.retry": "Повторить",
  "chat.retrieval": "Поиск",
  "welcome.eyebrow": "ПРАВОВАЯ ИНФОРМАЦИЯ, ПРОСТЫМ ЯЗЫКОМ",
  "welcome.headingLine1": "Вашу ситуацию",
  "welcome.headingEm": "вместе",
  "welcome.headingLine2": "разберём",
  "welcome.intro":
    "Опишите, что произошло, своими словами. При необходимости сначала уточним пару важных моментов.",
  "welcome.examplesTitle": "С чего начать",
  "welcome.example1": "Работодатель два месяца не платит зарплату. Что мне делать?",
  "welcome.example2": "Арендодатель хочет расторгнуть договор аренды. Каковы мои права?",
  "welcome.example3": "Мы не можем договориться с братьями о наследстве.",
  "welcome.snapshot":
    "Ответы опираются на тексты 25 законов и кодексов по состоянию на июль 2026 года.",
  "notice.historyBroken":
    "Не удалось прочитать сохранённую историю. Очистите её и начните новый диалог.",
  "notice.storageFull":
    "Хранилище браузера заполнено. Удалите старые диалоги или очистите историю.",
  "notice.noDeleteable": "Нет диалогов для удаления.",
  "notice.cleared": "История диалогов удалена.",
  "notice.noActiveExport": "Нет открытого диалога для скачивания. Сначала задайте вопрос.",
  "notice.exported": "Диалог скачан как текстовый файл.",
  "notice.copyFail": "Не удалось скопировать. Выделите текст и скопируйте вручную.",
  "notice.copied": "Ответ скопирован.",
  "notice.searchEmpty": "Подходящих диалогов не найдено.",
  "notice.historyEmpty": "Пока нет сохранённых диалогов.",
  "notice.interrupted":
    "Ответ был прерван из-за закрытия или перезагрузки браузера. Попробуйте снова.",
  "error.unexpected": "Произошла непредвиденная ошибка. Попробуйте ещё раз.",
  "error.cancelled": "Запрос отменён.",
  "export.filePrefix": "yuridik-dialog",
  "export.sources": "Источники:",
  "export.date": "Дата",
};

const en: Dict = {
  "app.name": "Legal Help",
  "app.tagline": "AI legal information",
  "app.title": "Legal Help — AI legal information",
  "app.description": "Legal information and practical next steps based on the laws of Uzbekistan.",
  "skip.link": "Skip to main content",
  "aria.sidebar": "Conversations",
  "aria.history": "Saved conversations",
  "aria.closeSidebar": "Close conversations panel",
  "aria.openHistory": "Open saved conversations",
  "aria.chat": "Chat",
  "aria.question": "Your legal question",
  "aria.send": "Send message",
  "aria.stop": "Stop generating the answer",
  "aria.deleteConversation": "delete conversation",
  "aria.renameConversation": "rename conversation",
  "aria.exportConversation": "save conversation as a file",
  "aria.openLex": "Open on Lex.uz",
  "aria.theme": "Switch theme",
  "aria.export": "Download conversation as a text file",
  "aria.searchHistory": "Search conversations",
  "aria.scrollBottom": "Scroll to bottom",
  "aria.typing": "Answer is being prepared",
  "chat.new": "New conversation",
  "chat.searchPlaceholder": "Search conversations...",
  "chat.historyHeading": "CONVERSATIONS",
  "chat.localNote": "Conversations are stored only on this device",
  "chat.clearHistory": "Clear all history",
  "chat.themeLabel": "Dark mode",
  "chat.themeLight": "Light mode",
  "chat.export": "Download",
  "chat.topTitle": "Legal chat",
  "chat.snapshotPill": "Corpus: July 2026",
  "chat.legalNotice":
    "This is AI legal information, not a lawyer. Answers are not legal advice or a guarantee of any case outcome. Verify the current version of the law at lex.uz.",
  "chat.placeholder": "Describe your situation in plain words...",
  "chat.privacyHint": "Do not send passport, PINFL, card or confidential document details.",
  "chat.snapshotNote":
    "Sources come from the July 2026 snapshot. The law may have changed — verify the current version at lex.uz.",
  "chat.confirmDelete": "Delete this conversation?",
  "chat.confirmClearAll": "Delete all saved conversations from this device?",
  "chat.renamePrompt": "New name:",
  "chat.assistant": "Legal Help",
  "chat.you": "You",
  "chat.avatarAssistant": "L",
  "chat.avatarUser": "Y",
  "chat.sources": "Sources",
  "chat.source": "Source",
  "chat.copy": "Copy",
  "chat.retry": "Retry",
  "chat.retrieval": "Search",
  "welcome.eyebrow": "LEGAL INFORMATION, IN PLAIN LANGUAGE",
  "welcome.headingLine1": "Let's look at your situation",
  "welcome.headingEm": "together",
  "welcome.headingLine2": "",
  "welcome.intro":
    "Describe what happened in your own words. If needed, we will first clarify one or two important details.",
  "welcome.examplesTitle": "Where to start",
  "welcome.example1": "My employer hasn't paid wages for two months. What should I do?",
  "welcome.example2": "My landlord wants to terminate the lease. What are my rights?",
  "welcome.example3": "My brothers and I disagree about an inheritance.",
  "welcome.snapshot":
    "Answers are based on the texts of 25 laws and codes as of July 2026.",
  "notice.historyBroken": "Saved history could not be read. Clear it and start a new conversation.",
  "notice.storageFull": "Browser storage is full. Delete old conversations or clear the history.",
  "notice.noDeleteable": "No conversations to delete.",
  "notice.cleared": "Conversation history cleared.",
  "notice.noActiveExport": "No open conversation to download. Ask a question first.",
  "notice.exported": "Conversation downloaded as a text file.",
  "notice.copyFail": "Could not copy. Select the text and copy it manually.",
  "notice.copied": "Answer copied.",
  "notice.searchEmpty": "No conversations match your search.",
  "notice.historyEmpty": "No saved conversations yet.",
  "notice.interrupted": "The answer stopped because the browser was closed or reloaded. You can retry.",
  "error.unexpected": "An unexpected error occurred. Please try again.",
  "error.cancelled": "Request cancelled.",
  "export.filePrefix": "legal-conversation",
  "export.sources": "Sources:",
  "export.date": "Date",
};

const dictionaries: Record<UiLanguage, Dict> = { uz, cyr, ru, en };

let current: UiLanguage = "uz";

export function getLanguage(): UiLanguage {
  return current;
}

export function getLocale(): string {
  return languages.find((item) => item.id === current)?.locale ?? "uz-Latn-UZ";
}

export function initLanguage(): UiLanguage {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(UI_LANGUAGE_KEY);
  } catch {
    stored = null;
  }
  current = (["uz", "cyr", "ru", "en"] as const).includes(stored as UiLanguage)
    ? (stored as UiLanguage)
    : "uz";
  document.documentElement.lang = current === "cyr" ? "uz-Cyrl" : current === "ru" ? "ru" : current === "en" ? "en" : "uz-Latn";
  return current;
}

export function setLanguage(language: UiLanguage, onChange?: (language: UiLanguage) => void): void {
  current = language;
  document.documentElement.lang = language === "cyr" ? "uz-Cyrl" : language === "ru" ? "ru" : language === "en" ? "en" : "uz-Latn";
  try {
    localStorage.setItem(UI_LANGUAGE_KEY, language);
  } catch {
    /* storage unavailable */
  }
  onChange?.(language);
}

export function t(key: string): string {
  return dictionaries[current][key] ?? dictionaries.uz[key] ?? key;
}

/** Localized date-time formatting used across chat and export. */
export function formatDateTime(date: number, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(getLocale(), options).format(date);
}

export { dictionaries };
