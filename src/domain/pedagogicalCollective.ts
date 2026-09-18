// Pedagogical Staff Registry for KZDO №145 "Perlynka"
// Extracted from official kindergarten portal:
// https://zdo145perlinka.wixsite.com/my-site/педагогічний-колектив

export type PedagogicalDepartment = 'administration' | 'specialists' | 'special_groups' | 'general_groups';

export interface PedagogicalStaffMember {
  id: string;
  fullName: string;
  position: string;
  department: PedagogicalDepartment;
  education: string;
  qualificationCategory: string;
  pedagogicalRank?: string;
  experienceYears: number;
  experience: string;
  credo: string;
  methodologicalTopic?: string;
  receptionHours?: string;
  photoUrl: string;
  originalProfileUrl: string;
}

export const PEDAGOGICAL_DEPARTMENTS: { key: PedagogicalDepartment; label: string; count: number; badgeColor: string }[] = [
  { key: 'administration', label: 'Адміністрація закладу', count: 2, badgeColor: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300' },
  { key: 'specialists', label: 'Фахівці та спеціалісти (психологи, логопеди, дефектологи, музика, фізкультура)', count: 11, badgeColor: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300' },
  { key: 'special_groups', label: 'Вихователі спеціальних груп', count: 9, badgeColor: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300' },
  { key: 'general_groups', label: 'Вихователі груп загального розвитку', count: 6, badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300' },
];

export const PEDAGOGICAL_COLLECTIVE: PedagogicalStaffMember[] = [
  {
    "id": "pedagog-1",
    "fullName": "Павлухіна Наталія Георгіївна",
    "position": "Директор ЗДО №145",
    "department": "administration",
    "education": "Вища педагогічна",
    "qualificationCategory": "Спеціаліст вищої категорії",
    "pedagogicalRank": "Старший учитель",
    "experienceYears": 31,
    "experience": "31 рік",
    "credo": "«Любити життя і цінувати кожну його хвилину, нести радість, у книгах — шукати істину, у людях — мудрість»",
    "methodologicalTopic": "Створення матеріально-технічної бази дошкільного навчального закладу для всебічного розвитку дитини",
    "receptionHours": "Понеділок 14:00 - 17:00, Середа 09:00 - 12:00",
    "photoUrl": "https://static.wixstatic.com/media/97833a_e3a2648f29ab4b7895c0dcda0f4cf74b~mv2.jpg/v1/fill/w_406,h_580,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/97833a_e3a2648f29ab4b7895c0dcda0f4cf74b~mv2.jpg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/статут-здо-145"
  },
  {
    "id": "pedagog-2",
    "fullName": "Єфімова Олена Олексіївна",
    "position": "Вихователь-методист",
    "department": "administration",
    "education": "КВНЗ «Жовтоводський педагогічний коледж» ДОР",
    "qualificationCategory": "10 тарифний розряд",
    "pedagogicalRank": "Вихователь-методист",
    "experienceYears": 5,
    "experience": "5 років",
    "credo": "«Методична підтримка педагога — це шлях до успіху кожної дитини та гармонійного розвитку закладу»",
    "methodologicalTopic": "Координація освітньо-виховного процесу та впровадження інноваційних методик",
    "receptionHours": "П’ятниця 14:30 - 16:30",
    "photoUrl": "https://static.wixstatic.com/media/97833a_c03f06e6afd84cfb8f3285b20ee631e8~mv2.jpg/v1/fill/w_422,h_580,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/%D0%84%D1%84%D1%96%D0%BC%D0%BE%D0%B2%D0%B0%20%D0%9E.jpg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/єфімова-о-о"
  },
  {
    "id": "pedagog-3",
    "fullName": "Біла Віра Іванівна",
    "position": "Практичний психолог",
    "department": "specialists",
    "education": "Криворізький державний педагогічний університет",
    "qualificationCategory": "Спеціаліст вищої категорії",
    "pedagogicalRank": "Практичний психолог-методист",
    "experienceYears": 24,
    "experience": "24 роки",
    "credo": "«Допомогти дитині пізнати себе, розкрити її внутрішній світ і підтримати впевненість у власних силах»",
    "methodologicalTopic": "Психологічний супровід адаптації дітей до умов ЗДО та корекція тривожності",
    "receptionHours": "Вівторок, Четвер 13:00 - 15:00",
    "photoUrl": "https://static.wixstatic.com/media/97833a_9ff31ab2ce9343138a05d612bc8dd312~mv2.jpg/v1/fill/w_422,h_580,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/%D0%91%D1%96%D0%BB%D0%B0%20%D0%92_%D0%86_.jpg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/біла-в-і"
  },
  {
    "id": "pedagog-4",
    "fullName": "Созанська Тетяна Степанівна",
    "position": "Практичний психолог",
    "department": "specialists",
    "education": "Криворізький державний педагогічний університет, 2011 рік",
    "qualificationCategory": "Спеціаліст І категорії",
    "pedagogicalRank": "Практичний психолог",
    "experienceYears": 13,
    "experience": "13 років",
    "credo": "«У кожній дитині є сонце, тільки дайте йому світити» (Ш. Амонашвілі)",
    "methodologicalTopic": "Розвиток емоційного інтелекту та психологічна стійкість дітей в кризових ситуаціях",
    "receptionHours": "Понеділок, Середа 13:00 - 15:00",
    "photoUrl": "https://static.wixstatic.com/media/97833a_37e0a9d482b249a88904ed2e882ab14d~mv2.jpg/v1/fill/w_422,h_580,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/%D0%A1%D0%BE%D0%B7%D0%B0%D0%BD%D1%81%D1%8C%D0%BA%D0%B0.jpg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/созанська-т-с"
  },
  {
    "id": "pedagog-5",
    "fullName": "Дерипаска Тетяна Олександрівна",
    "position": "Вчитель-логопед",
    "department": "specialists",
    "education": "ДВНЗ «КНУ» (2015), НПУ ім. М.П. Драгоманова (2022, Олігофренопедагогіка)",
    "qualificationCategory": "Спеціаліст ІІ категорії",
    "pedagogicalRank": "Вчитель-логопед, дефектолог",
    "experienceYears": 16,
    "experience": "16 років (вчителем-дефектологом — 3 роки)",
    "credo": "«Якщо твої плани розраховані на рік — сій жито, якщо на десятиліття — саджай дерево, якщо на віки — виховуй дітей»",
    "methodologicalTopic": "Застосування нейрогімнастики у логопедичній роботі з дітьми дошкільного віку",
    "receptionHours": "Вівторок 15:00 - 17:00",
    "photoUrl": "https://static.wixstatic.com/media/97833a_a961f0aadc2c4d2aa6483e26bd11bd04~mv2.jpg/v1/fill/w_326,h_472,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/IMG_20241025_115222_141.jpg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/дерипаска-т-о"
  },
  {
    "id": "pedagog-6",
    "fullName": "Гомон Лариса Олексіївна",
    "position": "Вчитель-логопед",
    "department": "specialists",
    "education": "Слов'янський державний педагогічний інститут",
    "qualificationCategory": "Спеціаліст вищої категорії",
    "pedagogicalRank": "Старший учитель",
    "experienceYears": 33,
    "experience": "33 роки",
    "credo": "«Красиве й правильне мовлення — запорука впевненого старту дитини у велике життя»",
    "methodologicalTopic": "Корекція важких вад мовлення засобами арт-терапії та логоритміки",
    "receptionHours": "Середа 15:00 - 17:00",
    "photoUrl": "https://static.wixstatic.com/media/97833a_a7f61272373d4c89bca966cbb8d2dc75~mv2.jpg/v1/fill/w_324,h_472,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/97833a_a7f61272373d4c89bca966cbb8d2dc75~mv2.jpg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/гомон-л-о"
  },
  {
    "id": "pedagog-7",
    "fullName": "Гладуш Наталія Вікторівна",
    "position": "Вчитель-логопед",
    "department": "specialists",
    "education": "КДПУ, спеціальність «Дефектологія. Логопедія»",
    "qualificationCategory": "Спеціаліст вищої категорії",
    "pedagogicalRank": "Вчитель-логопед",
    "experienceYears": 20,
    "experience": "20 років",
    "credo": "«Слово — найтонший різець, здатний доторкнутися до найпотаємніших куточків дитячого серця»",
    "methodologicalTopic": "Розвиток фонематичного слуху та звуковимови у дітей зі ЗНМ",
    "receptionHours": "Четвер 14:00 - 16:00",
    "photoUrl": "https://static.wixstatic.com/media/97833a_c41cf7c468fc4772aa4f490af8a736f5~mv2.jpeg/v1/fill/w_332,h_468,al_c,lg_1,q_80,enc_avif,quality_auto/97833a_c41cf7c468fc4772aa4f490af8a736f5~mv2.jpeg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/гладуш-н-в"
  },
  {
    "id": "pedagog-8",
    "fullName": "Суміна Марина Володимирівна",
    "position": "Вчитель-логопед",
    "department": "specialists",
    "education": "НПУ ім. М.П. Драгоманова, логопедія і спеціальна психологія",
    "qualificationCategory": "Спеціаліст І категорії",
    "pedagogicalRank": "Вчитель-логопед",
    "experienceYears": 12,
    "experience": "12 років",
    "credo": "«Маленькими кроками до великих перемог: кожне чисте слово дитини — наша спільна радість»",
    "methodologicalTopic": "Інтерактивні цифрові вправи та дидактичні ігри у подоланні мовленнєвих бар’єрів",
    "receptionHours": "Понеділок 15:00 - 17:00",
    "photoUrl": "https://static.wixstatic.com/media/97833a_008eb2815b894d83924987a3a1b3aecc~mv2.png/v1/crop/x_31,y_0,w_992,h_1416/fill/w_334,h_468,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/FaceMakeup_2024101100134198_save.png",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/суміна-м-в"
  },
  {
    "id": "pedagog-9",
    "fullName": "Чернокур Наталія Олександрівна",
    "position": "Вчитель-дефектолог",
    "department": "specialists",
    "education": "ДВНЗ «Криворізький національний університет»",
    "qualificationCategory": "Спеціаліст І категорії",
    "pedagogicalRank": "Вчитель-дефектолог",
    "experienceYears": 14,
    "experience": "14 років",
    "credo": "«Бачити у кожній дитині особистість, вірити в її сили і допомагати долати будь-які труднощі»",
    "methodologicalTopic": "Сенсорна інтеграція та пізнавальний розвиток дітей з особливими освітніми потребами",
    "receptionHours": "Вівторок 14:00 - 16:00",
    "photoUrl": "https://static.wixstatic.com/media/97833a_7531d0cdb93f4e24b1014186ee1bb6b7~mv2.jpg/v1/fill/w_326,h_472,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/97833a_7531d0cdb93f4e24b1014186ee1bb6b7~mv2.jpg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/чернокур-н-о"
  },
  {
    "id": "pedagog-10",
    "fullName": "Хребтова Наталія Михайлівна",
    "position": "Вчитель-дефектолог",
    "department": "specialists",
    "education": "Криворізький державний педагогічний інститут",
    "qualificationCategory": "Спеціаліст вищої категорії",
    "pedagogicalRank": "Вчитель-методист",
    "experienceYears": 28,
    "experience": "28 років",
    "credo": "«Любов, терпіння і професіоналізм — ключ до розкриття потенціалу особливої дитини»",
    "methodologicalTopic": "Комплексний корекційно-розвитковий супровід вихованців спеціальних груп",
    "receptionHours": "Четвер 15:00 - 17:00",
    "photoUrl": "https://static.wixstatic.com/media/97833a_04b305a7cc3a49b993ae83a09e04335f~mv2.png/v1/fill/w_326,h_472,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/%D0%A5%D1%80%D0%B5%D0%B1%D1%82%D0%BE%D0%B2%D0%B0%20%D0%9D%D0%B0%D1%82%D0%B0%D0%BB%D1%96%D1%8F.png",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/хребтова-н-м"
  },
  {
    "id": "pedagog-11",
    "fullName": "Бортнікова Любов Миколаївна",
    "position": "Музичний керівник",
    "department": "specialists",
    "education": "Криворізьке державне музичне училище",
    "qualificationCategory": "Спеціаліст вищої категорії",
    "pedagogicalRank": "Музичний керівник-методист",
    "experienceYears": 45,
    "experience": "45 років",
    "credo": "«Музика відкриває серця, надихає дитячу фантазію і навчає любити прекрасне»",
    "methodologicalTopic": "Музично-ритмічне виховання як основа гармонійного розвитку особистості дошкільника",
    "receptionHours": "Середа 13:00 - 14:30",
    "photoUrl": "https://static.wixstatic.com/media/97833a_5465de1d9f624016963fe255a2e55fa6~mv2.jpg/v1/fill/w_382,h_490,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/20211224_115859.jpg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/бортнікова-л-м"
  },
  {
    "id": "pedagog-12",
    "fullName": "Рєзнік Олена Олександрівна",
    "position": "Музичний керівник",
    "department": "specialists",
    "education": "Київський Національний педагогічний університет імені М.П. Драгоманова",
    "qualificationCategory": "Спеціаліст ІІ категорії",
    "pedagogicalRank": "Музичний керівник",
    "experienceYears": 32,
    "experience": "32 роки",
    "credo": "«Ми не здатні створювати геніїв... Ми можемо тільки дати дитині шанс розкрити свої крила»",
    "methodologicalTopic": "Розвиток музично-сенсорних здібностей та вокальних навичок дошкільнят",
    "receptionHours": "П’ятниця 13:00 - 14:30",
    "photoUrl": "https://static.wixstatic.com/media/97833a_aad4f2cb80a446beb9566718bd98d8ec~mv2.jpg/v1/crop/x_29,y_344,w_2319,h_2826/fill/w_382,h_490,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/97833a_aad4f2cb80a446beb9566718bd98d8ec~mv2.jpg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/рєзнік-о-о"
  },
  {
    "id": "pedagog-13",
    "fullName": "Терещенко Єлизавета Іванівна",
    "position": "Інструктор з фізкультури",
    "department": "specialists",
    "education": "Криворізький державний педагогічний університет, 2011 рік",
    "qualificationCategory": "Спеціаліст І категорії",
    "pedagogicalRank": "Інструктор з фізичної культури",
    "experienceYears": 15,
    "experience": "15 років",
    "credo": "«Здоров'я дітей — майбутнє нації! Рух — це життя, бадьорість і радість»",
    "methodologicalTopic": "Загартування та профілактика порушень постави у дошкільнят засобами динамічних ігор",
    "receptionHours": "Понеділок 13:30 - 15:00",
    "photoUrl": "https://static.wixstatic.com/media/97833a_e1f3b163963b4eef9bb792173ad8a959~mv2.jpg/v1/fill/w_380,h_492,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/IMG_20241024_162151_877.jpg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/терещенко-є-і"
  },
  {
    "id": "pedagog-14",
    "fullName": "Жир Надія Василівна",
    "position": "Вихователь спеціальної групи",
    "department": "special_groups",
    "education": "Жовтоводське педагогічне училище, 1985 рік",
    "qualificationCategory": "Спеціаліст І категорії",
    "pedagogicalRank": "Вихователь",
    "experienceYears": 27,
    "experience": "27 років",
    "credo": "«Навчаючи інших, навчаюся сама; віддаючи серце дітям, відчуваю сенс життя»",
    "methodologicalTopic": "Корекційно-розвиткова робота в спеціальних групах засобами казкотерапії",
    "receptionHours": "За розкладом групи",
    "photoUrl": "https://static.wixstatic.com/media/97833a_418c392a22e246d1b0c21477098a6149~mv2.jpg/v1/crop/x_0,y_43,w_253,h_366/fill/w_316,h_460,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/97833a_418c392a22e246d1b0c21477098a6149~mv2.jpg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/жир-н-в"
  },
  {
    "id": "pedagog-15",
    "fullName": "Кочервей Валентина Василівна",
    "position": "Вихователь спеціальної групи",
    "department": "special_groups",
    "education": "Жовтоводське педагогічне училище, 1993 рік",
    "qualificationCategory": "11 тарифний розряд",
    "pedagogicalRank": "Вихователь-методист",
    "experienceYears": 35,
    "experience": "35 років",
    "credo": "«До кожної дитини ключ знайти, у світ добра й любові повести»",
    "methodologicalTopic": "Формування комунікативних навичок у дітей спеціальних груп",
    "receptionHours": "За розкладом групи",
    "photoUrl": "https://static.wixstatic.com/media/97833a_e4ce871cb2724235b95fa612f5c46adf~mv2.jpg/v1/crop/x_26,y_0,w_384,h_491/fill/w_358,h_460,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/97833a_e4ce871cb2724235b95fa612f5c46adf~mv2.jpg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/кочервей-в-в"
  },
  {
    "id": "pedagog-16",
    "fullName": "Шкута Надія Олександрівна",
    "position": "Вихователь спеціальної групи",
    "department": "special_groups",
    "education": "КЗ «Жовтоводський педагогічний коледж» ДОР, 2023 рік",
    "qualificationCategory": "10 тарифний розряд",
    "pedagogicalRank": "Вихователь",
    "experienceYears": 2,
    "experience": "2 роки",
    "credo": "«Те, що ми вкладаємо в дитину, стане міцною основою її щасливого майбутнього»",
    "methodologicalTopic": "Розвиток творчої уяви та пізнавальної активності молодших дошкільнят",
    "receptionHours": "За розкладом групи",
    "photoUrl": "https://static.wixstatic.com/media/97833a_aba53ea84cbd4575a050905f799e447f~mv2.jpg/v1/crop/x_105,y_0,w_982,h_1256/fill/w_358,h_460,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/%D0%B7%D0%BE%D0%B1%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%BD%D1%8F_viber_2024-12-08_18-23-12-754.jpg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/оголь-н-в"
  },
  {
    "id": "pedagog-17",
    "fullName": "Бабишкіна Ольга Анатоліївна",
    "position": "Вихователь спеціальної групи",
    "department": "special_groups",
    "education": "ДВНЗ «Криворізький національний університет»",
    "qualificationCategory": "Спеціаліст І категорії",
    "pedagogicalRank": "Вихователь",
    "experienceYears": 18,
    "experience": "18 років",
    "credo": "«Дитина — неповторна і дивовижна краплинка чистої, живої, допитливої енергії»",
    "methodologicalTopic": "Організація ігрової діяльності як засобу корекції та соціалізації",
    "receptionHours": "За розкладом групи",
    "photoUrl": "https://static.wixstatic.com/media/97833a_fbad41e6193f474c8921d73185999798~mv2.jpg/v1/fill/w_364,h_460,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/97833a_fbad41e6193f474c8921d73185999798~mv2.jpg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/бабишкына-о-а"
  },
  {
    "id": "pedagog-18",
    "fullName": "Осадча Альона Володимирівна",
    "position": "Вихователь спеціальної групи",
    "department": "special_groups",
    "education": "Жовтоводський педагогічний коледж, 2010 рік",
    "qualificationCategory": "11 тарифний розряд",
    "pedagogicalRank": "Вихователь",
    "experienceYears": 12,
    "experience": "12 років",
    "credo": "«Віддай дитині крихітку себе — за це душа наповнюється світом і теплом»",
    "methodologicalTopic": "Формування навичок самообслуговування та соціальної компетентності",
    "receptionHours": "За розкладом групи",
    "photoUrl": "https://static.wixstatic.com/media/97833a_ba967336d37b4006bea72606d1a6f735~mv2.jpg/v1/crop/x_31,y_0,w_228,h_330/fill/w_316,h_460,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/%D0%9E%D1%81%D0%B0%D0%B4%D1%87%D0%B0.jpg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/осадча-а-в"
  },
  {
    "id": "pedagog-19",
    "fullName": "Півень Наталія Володимирівна",
    "position": "Вихователь спеціальної групи",
    "department": "special_groups",
    "education": "ДВНЗ «Криворізький національний університет»",
    "qualificationCategory": "11 тарифний розряд",
    "pedagogicalRank": "Вихователь",
    "experienceYears": 8,
    "experience": "8 років",
    "credo": "«Знай дитину, розумій, поважай, будь частиною радісного життя дитини»",
    "methodologicalTopic": "Екологічне виховання та розвиток спостережливості у дошкільників",
    "receptionHours": "За розкладом групи",
    "photoUrl": "https://static.wixstatic.com/media/97833a_8655d59a4bdf47fc81dc0404e18cb1b9~mv2.jpg/v1/fill/w_398,h_452,al_c,lg_1,q_80,enc_avif,quality_auto/%D0%9F%D1%96%D0%B2%D0%B5%D0%BD%D1%8C.jpg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/півень-н-в"
  },
  {
    "id": "pedagog-20",
    "fullName": "Ковалевська Світлана Володимирівна",
    "position": "Вихователь спеціальної групи",
    "department": "special_groups",
    "education": "Жовтоводське педагогічне училище, 1987 рік",
    "qualificationCategory": "11 тарифний розряд",
    "pedagogicalRank": "Вихователь",
    "experienceYears": 36,
    "experience": "36 років",
    "credo": "«До кожної дитини ключ знайти, з любов’ю серце їй віддати» (В.О. Сухомлинський)",
    "methodologicalTopic": "Впровадження педагогічної спадщини В.О. Сухомлинського у виховний процес",
    "receptionHours": "За розкладом групи",
    "photoUrl": "https://static.wixstatic.com/media/97833a_70da41ec65f0481dbae00fea0236c4dc~mv2.jpg/v1/fill/w_362,h_460,al_c,lg_1,q_80,enc_avif,quality_auto/97833a_70da41ec65f0481dbae00fea0236c4dc~mv2.jpg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/ковалевська-с-в"
  },
  {
    "id": "pedagog-21",
    "fullName": "Степаненкова Єлизавета Василівна",
    "position": "Вихователь спеціальної групи",
    "department": "special_groups",
    "education": "Жовтоводське педагогічне училище",
    "qualificationCategory": "11 тарифний розряд",
    "pedagogicalRank": "Вихователь",
    "experienceYears": 45,
    "experience": "45 років",
    "credo": "«Професія вихователя дитячого садка — покликання для щирих і терплячих сердець»",
    "methodologicalTopic": "Виховання доброзичливості та взаємодопомоги у дитячому колективі",
    "receptionHours": "За розкладом групи",
    "photoUrl": "https://static.wixstatic.com/media/97833a_7d1fa48cb3614db3b06aff50a6bddc49~mv2.jpg/v1/fill/w_390,h_448,al_c,lg_1,q_80,enc_avif,quality_auto/97833a_7d1fa48cb3614db3b06aff50a6bddc49~mv2.jpg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/степаненкова-є-і"
  },
  {
    "id": "pedagog-22",
    "fullName": "Гребенюк Тамара Іллівна",
    "position": "Вихователь спеціальної групи",
    "department": "special_groups",
    "education": "Жовтоводський педагогічний технікум, 1979 рік",
    "qualificationCategory": "Спеціаліст ІІ категорії",
    "pedagogicalRank": "Вихователь",
    "experienceYears": 47,
    "experience": "47 років",
    "credo": "«Любити, творити, прощати! Дарувати дітям тепло і віру в добро»",
    "methodologicalTopic": "Розвиток мовленнєвого спілкування та моторики у дітей старшого віку",
    "receptionHours": "За розкладом групи",
    "photoUrl": "https://static.wixstatic.com/media/97833a_644a6258db8c499e84a7d89538ae19a9~mv2.jpg/v1/fill/w_382,h_460,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/97833a_644a6258db8c499e84a7d89538ae19a9~mv2.jpg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/гребенюк-т-і"
  },
  {
    "id": "pedagog-23",
    "fullName": "Ковальова Світлана Миколаївна",
    "position": "Вихователь групи загального розвитку",
    "department": "general_groups",
    "education": "Жовтоводське педучилище, 2010 рік",
    "qualificationCategory": "11 тарифний розряд",
    "pedagogicalRank": "Вихователь",
    "experienceYears": 14,
    "experience": "14 років",
    "credo": "«Розвивати дитину як неповторну індивідуальність, формувати любов до знань у спільній діяльності»",
    "methodologicalTopic": "Формування елементарних математичних уявлень через дидактичну гру",
    "receptionHours": "За розкладом групи",
    "photoUrl": "https://static.wixstatic.com/media/97833a_76201752dd3b4e279b9589474f1d1f5d~mv2.jpg/v1/crop/x_0,y_8,w_213,h_262/fill/w_298,h_367,al_c,lg_1,q_80,enc_avif,quality_auto/97833a_76201752dd3b4e279b9589474f1d1f5d~mv2.jpg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/ковальова-с-м"
  },
  {
    "id": "pedagog-24",
    "fullName": "Бояринова Ольга Юріївна",
    "position": "Вихователь групи загального розвитку",
    "department": "general_groups",
    "education": "Кіровоградський державний педагогічний університет ім. В. Винниченка",
    "qualificationCategory": "10 тарифний розряд",
    "pedagogicalRank": "Вихователь",
    "experienceYears": 2,
    "experience": "2 роки",
    "credo": "«Поважай дитину і тоді вона відповість тобі щирістю, довірою та теплом»",
    "methodologicalTopic": "Адаптація малюків раннього віку до дитячого садка через ігрові форми",
    "receptionHours": "За розкладом групи",
    "photoUrl": "https://static.wixstatic.com/media/97833a_6eb8ad638c394dc0a86336f14f83706f~mv2.png/v1/crop/x_0,y_0,w_581,h_698/fill/w_374,h_452,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/97833a_6eb8ad638c394dc0a86336f14f83706f~mv2.png",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/бояринова-о-ю"
  },
  {
    "id": "pedagog-25",
    "fullName": "Бегма Ірина Віталіївна",
    "position": "Вихователь групи загального розвитку",
    "department": "general_groups",
    "education": "Вища педагогічна освіта",
    "qualificationCategory": "Спеціаліст",
    "pedagogicalRank": "Вихователь",
    "experienceYears": 6,
    "experience": "6 років",
    "credo": "«Кожен день разом із дітьми — це нова подорож у світ дивовижних відкриттів та радості»",
    "methodologicalTopic": "Художньо-естетичний розвиток та образотворча діяльність дітей дошкільного віку",
    "receptionHours": "За розкладом групи",
    "photoUrl": "https://static.wixstatic.com/media/97833a_613c122822074b988a9bf310c286ed21~mv2.jpg/v1/fill/w_366,h_452,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/20241025_212322_edited.jpg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/about-5-1"
  },
  {
    "id": "pedagog-26",
    "fullName": "Смукович Катерина Андріївна",
    "position": "Вихователь групи загального розвитку",
    "department": "general_groups",
    "education": "ДВНЗ «Криворізький національний університет»",
    "qualificationCategory": "Спеціаліст ІІ категорії",
    "pedagogicalRank": "Вихователь",
    "experienceYears": 7,
    "experience": "7 років",
    "credo": "«Дорогу подолає той, хто йде вперед з відкритим серцем і вірою у дітей»",
    "methodologicalTopic": "Розвиток мовленнєвої ініціативи та комунікативної активності дошкільників",
    "receptionHours": "За розкладом групи",
    "photoUrl": "https://static.wixstatic.com/media/97833a_647ebc10557047bcbc2fdd0be3cf9d38~mv2.jpg/v1/crop/x_6,y_0,w_173,h_199/fill/w_392,h_452,al_c,lg_1,q_80,enc_avif,quality_auto/97833a_647ebc10557047bcbc2fdd0be3cf9d38~mv2.jpg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/смукович-к-а"
  },
  {
    "id": "pedagog-27",
    "fullName": "Чулкова Альона Валеріївна",
    "position": "Вихователь групи загального розвитку",
    "department": "general_groups",
    "education": "КЗ «Жовтоводський педагогічний коледж» ДОР, 2023 рік",
    "qualificationCategory": "10 тарифний розряд",
    "pedagogicalRank": "Вихователь",
    "experienceYears": 3,
    "experience": "3 роки",
    "credo": "«Любов і підтримка — ключ до серця дитини. Кожен день — можливість допомогти їй рости, мріяти і пізнавати світ»",
    "methodologicalTopic": "Сенсорний розвиток дітей раннього віку засобами природного матеріалу",
    "receptionHours": "За розкладом групи",
    "photoUrl": "https://static.wixstatic.com/media/97833a_48c577f86f8241759094e0f324b91934~mv2.jpg/v1/fill/w_336,h_450,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/IMG-0b61c92f6be3c0ef2ae016acbf9ae392-V_e.jpg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/about-5"
  },
  {
    "id": "pedagog-28",
    "fullName": "Кочубей Антоніна Володимирівна",
    "position": "Вихователь групи загального розвитку",
    "department": "general_groups",
    "education": "КЗ «Жовтоводський фаховий педагогічний коледж» ДОР, 2023 рік",
    "qualificationCategory": "10 тарифний розряд",
    "pedagogicalRank": "Вихователь",
    "experienceYears": 3,
    "experience": "3 роки",
    "credo": "«Люби, вір, знай, поважай, розумій кожну дитину. Постав себе на її місце, подивись на світ її очима»",
    "methodologicalTopic": "Розвиток дрібної моторики та підготовка руки до письма через нетрадиційні техніки",
    "receptionHours": "За розкладом групи",
    "photoUrl": "https://static.wixstatic.com/media/97833a_7668b57a22854d188ff57bc39dd36a4f~mv2.jpg/v1/fill/w_372,h_450,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/20241022_145656.jpg",
    "originalProfileUrl": "https://zdo145perlinka.wixsite.com/my-site-1/кочубей-а-в"
  }
];

export function getStaffByDepartment(dept: PedagogicalDepartment | 'all'): PedagogicalStaffMember[] {
  if (dept === 'all') return PEDAGOGICAL_COLLECTIVE;
  return PEDAGOGICAL_COLLECTIVE.filter(s => s.department === dept);
}

export function searchStaff(query: string, dept: PedagogicalDepartment | 'all' = 'all'): PedagogicalStaffMember[] {
  const q = query.toLowerCase().trim();
  const list = getStaffByDepartment(dept);
  if (!q) return list;
  return list.filter(s => 
    s.fullName.toLowerCase().includes(q) ||
    s.position.toLowerCase().includes(q) ||
    s.credo.toLowerCase().includes(q) ||
    s.qualificationCategory.toLowerCase().includes(q) ||
    (s.methodologicalTopic && s.methodologicalTopic.toLowerCase().includes(q))
  );
}

export function getStaffStats() {
  const total = PEDAGOGICAL_COLLECTIVE.length;
  const higherCategory = PEDAGOGICAL_COLLECTIVE.filter(s => 
    s.qualificationCategory.includes('вищої') || s.qualificationCategory.includes('І категорії')
  ).length;
  const avgExp = Math.round(
    PEDAGOGICAL_COLLECTIVE.reduce((acc, s) => acc + s.experienceYears, 0) / total
  );
  return {
    total,
    higherCategory,
    avgExp,
    specialistsCount: PEDAGOGICAL_COLLECTIVE.filter(s => s.department === 'specialists').length,
    educatorsCount: PEDAGOGICAL_COLLECTIVE.filter(s => s.department === 'special_groups' || s.department === 'general_groups').length
  };
}
