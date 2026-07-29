import React, { useState } from 'react';
import {
  Utensils,
  Package,
  Brain,
  Users,
  User,
  Heart,
  HeartPulse,
  BarChart3,
  Sparkles,
  ArrowRight,
  Clock,
  ShieldCheck,
  Building,
  Building2,
  CheckCircle2,
  X,
  MessageSquare,
  Send,
  Globe,
  ExternalLink,
  Mail,
  Phone
} from 'lucide-react';

interface PortalHubModuleProps {
  onSelectModule: (tabId: string) => void;
}

interface ProjectModuleItem {
  id: string;
  name: string;
  subtitle: string;
  badgeLetter: string;
  gradient: string;
  icon: React.ElementType;
  status: 'active' | 'in_dev';
  description: string;
  features: string[];
}

export const PortalHubModule: React.FC<PortalHubModuleProps> = ({ onSelectModule }) => {
  const [selectedInDevModule, setSelectedInDevModule] = useState<ProjectModuleItem | null>(null);

  // Feedback Form State
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackContact, setFeedbackContact] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('Запитання по роботі системи');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;

    const newEntry = {
      id: Date.now(),
      date: new Date().toLocaleDateString('uk-UA') + ' ' + new Date().toLocaleTimeString('uk-UA'),
      name: feedbackName.trim() || 'Користувач ЗДО',
      contact: feedbackContact.trim() || 'Не вказано',
      category: feedbackCategory,
      message: feedbackMessage.trim()
    };

    try {
      const existing = JSON.parse(localStorage.getItem('sadok_developer_feedback') || '[]');
      localStorage.setItem('sadok_developer_feedback', JSON.stringify([newEntry, ...existing]));
    } catch (_) {}

    setFeedbackSubmitted(true);
    setFeedbackName('');
    setFeedbackContact('');
    setFeedbackMessage('');
    setTimeout(() => setFeedbackSubmitted(false), 7000);
  };

  const projects: ProjectModuleItem[] = [
    {
      id: 'menu_planner',
      name: 'SADOK',
      subtitle: 'Кухня',
      badgeLetter: 'S',
      gradient: 'from-blue-600 to-blue-500 shadow-blue-500/30',
      icon: Utensils,
      status: 'active',
      description: 'Професійна автоматизована система меню-розкладки, складського обліку продуктів харчування та дотримання норм КМУ № 305.',
      features: [
        'Автоматичний розрахунок БЖУ та калорійності',
        'Списання товарів зі складу за методом FIFO',
        'Друк офіційної меню-розкладки для кухні A4',
        'Оборотно-сальдова відомість та аналіз норм СанПіН'
      ]
    },
    {
      id: 'property',
      name: 'SADOK',
      subtitle: 'Майно',
      badgeLetter: 'S',
      gradient: 'from-amber-500 to-orange-600 shadow-orange-500/30',
      icon: Building2,
      status: 'active',
      description: 'Облік матеріально-технічних цінностей, інвентаризація обладнання, меблів, білизни та балансового майна ЗДО.',
      features: [
        'Інвентарні номери, категорії та первинна вартість',
        'Розподіл кількості одного майна по локаціях та МВО',
        'Облік зносу, стану та року введення в експлуатацію',
        'Друк інвентаризаційних описів A4 та експорт в Excel'
      ]
    },
    {
      id: 'psychologist',
      name: 'SADOK',
      subtitle: 'Психолог',
      badgeLetter: 'S',
      gradient: 'from-slate-950 via-slate-900 to-black shadow-slate-900/50',
      icon: Brain,
      status: 'in_dev',
      description: 'Моніторинг психологічного розвитку вихованців, діагностичні картки спостереження та рекомендації для батьків і вихователів.',
      features: [
        'Карти психологічної готовності дитини до школи',
        'Журнал індивідуальних та групових консультацій',
        'Тестові методики та адаптаційні карти груп',
        'Автоматичне формування психологічних висновків'
      ]
    },
    {
      id: 'cadres',
      name: 'SADOK',
      subtitle: 'Контингент',
      badgeLetter: 'S',
      gradient: 'from-indigo-600 to-purple-700 shadow-indigo-500/30',
      icon: Users,
      status: 'active',
      description: 'Облік груп ДНЗ, кадрового складу (МВО) та контингенту вихованців. Інтеграція з Майно та Психолог.',
      features: [
        'Структура груп ДНЗ, приміщення та вікові категорії',
        'Персональний кадровий облік та закріплення МВО',
        'Реєстр вихованців (дітей) з прив\'язкою до груп',
        'Автоматична інтеграція з SADOK Майно та Психолог'
      ]
    },
    {
      id: 'medical',
      name: 'SADOK',
      subtitle: 'Медичний',
      badgeLetter: 'S',
      gradient: 'from-emerald-500 to-teal-600 shadow-emerald-500/30',
      icon: HeartPulse,
      status: 'in_dev',
      description: 'Медична карта дитини, антропометрія, журнал профілактичних щеплень, медогляди та контроль соматичного здоров’я.',
      features: [
        'Картка профілактичних щеплень (Форма № 063/о)',
        'Журнал обліку захворюваності та відвідуваності',
        'Журнал антропометричних вимірювань та загартовування',
        'Облік диспансерної групи та дієтичного харчування'
      ]
    },
    {
      id: 'reports',
      name: 'SADOK',
      subtitle: 'Звіти',
      badgeLetter: 'S',
      gradient: 'from-cyan-500 to-teal-600 shadow-cyan-500/30',
      icon: BarChart3,
      status: 'in_dev',
      description: 'Зведена аналітична та фінансова звітність для Департаменту освіти, статистичні діаграми та показники ЗДО.',
      features: [
        'Річний звіт закладу дошкільної освіти (Форма 85-К)',
        'Аналітика виконання грошових норм харчування',
        'Статистика відвідуваності та моніторинг контингенту',
        'Інтерактивні дашборди для керівника та бухгалтерії'
      ]
    }
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-y-auto selection:bg-blue-500 selection:text-white pb-36 transition-colors duration-200">
      {/* TOP HERO BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 dark:from-blue-950 dark:via-slate-950 dark:to-indigo-950 text-white border-b border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-xl shrink-0">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-20 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-blue-600/30 via-amber-500/20 to-blue-500/30 border border-blue-400/40 rounded-full text-xs font-extrabold text-white shadow-sm">
              <span className="text-sm animate-flag-wave">🇺🇦</span>
              <span className="flex items-center space-x-1">
                <span>Made with</span>
                <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400 inline animate-pulse" />
                <span>in Ukraine</span>
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-sm">
              Платформа <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-300">SADOK</span>
            </h1>
            <p className="text-blue-100 dark:text-slate-300 text-xs md:text-sm max-w-xl font-medium leading-relaxed">
              Оберіть необхідний спеціалізований модуль для роботи. Універсальний комплекс автоматизації меню, майна, медичного обліку, кадрів та аналітики ЗДО.
            </p>
          </div>

          <div className="flex items-center space-x-3.5 bg-white/10 dark:bg-slate-800/80 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 dark:border-slate-700/80 shadow-xl shrink-0 text-white">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-xl text-white shadow-md border border-white/20">
              S
            </div>
            <div>
              <div className="text-[10px] font-bold text-blue-200 dark:text-slate-400 uppercase tracking-wider">Платформа для ЗДО</div>
              <div className="text-xs font-black text-white">Універсальний онлайн-комплекс</div>
              <div className="text-[10px] font-bold text-emerald-300 dark:text-emerald-400 flex items-center space-x-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3" />
                <span>Версія системи v1.0.40</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODULES GRID SECTION */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
          <div className="flex items-center space-x-2">
            <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-extrabold text-slate-800 dark:text-white tracking-wide uppercase">
              Модулі та субсистеми SADOK
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
            6 Спеціалізованих модулів
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => {
            const Icon = proj.icon;
            const isActive = proj.status === 'active';

            return (
              <div
                key={proj.id}
                onClick={() => {
                  if (isActive) {
                    onSelectModule(proj.id);
                  } else {
                    setSelectedInDevModule(proj);
                  }
                }}
                className={`group relative flex flex-col justify-between p-4 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${
                  isActive
                    ? 'bg-white dark:bg-slate-900/90 border-blue-500/60 dark:border-blue-500/50 hover:border-blue-600 dark:hover:border-blue-400 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 -translate-y-1'
                    : 'bg-white/90 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900/80 hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Background Accent Glow */}
                <div className={`absolute -right-12 -top-12 w-32 h-32 rounded-full blur-2xl transition-opacity duration-300 opacity-20 group-hover:opacity-40 bg-gradient-to-tr ${proj.gradient}`} />

                <div className="space-y-3 relative z-10">
                  {/* Card Header: Badge Logo & Status Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      {/* Logo Badge */}
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${proj.gradient} text-white font-black text-lg flex items-center justify-center shadow-lg border border-white/20 transition-transform duration-300 group-hover:scale-105`}>
                        {proj.badgeLetter}
                      </div>

                      <div>
                        <div className="flex items-baseline space-x-1.5">
                          <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{proj.name}</span>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{proj.subtitle}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Модуль системи</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {isActive ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 rounded-full text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        <span>Активний</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-amber-50 dark:bg-slate-800/80 border border-amber-200 dark:border-amber-700/60 rounded-full text-[10px] font-bold text-amber-800 dark:text-amber-300">
                        <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        <span>В розробці</span>
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium min-h-[42px]">
                    {proj.description}
                  </p>
                </div>

                {/* Card Footer Button */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 mt-3 flex items-center justify-between relative z-10">
                  <div className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-white transition-colors">
                    <Icon className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                    <span>{isActive ? 'Відкрити модуль' : 'Детальніше про модуль'}</span>
                  </div>

                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? 'bg-blue-600 text-white group-hover:bg-blue-500 group-hover:translate-x-1'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-600'
                  }`}>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* DEVELOPER FEEDBACK & CONTACT SECTION */}
        <div className="card-glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-md bg-gradient-to-br from-white via-slate-50 to-blue-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/30">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>Зворотний зв'язок з розробником ПЗ</span>
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold rounded-full border border-blue-200 dark:border-blue-800">
                    Поддержка 24/7
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Маєте запитання, пропозицію чи побажання щодо розвитку програми SADOK? Напишіть розробнику!
                </p>
              </div>
            </div>

            {/* Direct Requisites */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <a
                href="https://osipov.pp.ua"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-bold rounded-xl border border-purple-200 dark:border-purple-800 flex items-center space-x-1.5 transition"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>osipov.pp.ua</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>

              <a
                href="mailto:edosipov@gmail.com"
                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold rounded-xl border border-blue-200 dark:border-blue-800 flex items-center space-x-1.5 transition"
              >
                <Mail className="w-3.5 h-3.5 text-blue-500" />
                <span>edosipov@gmail.com</span>
              </a>

              <a
                href="tel:0675694704"
                className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1.5 transition"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                <span>+380 (67) 569-47-04</span>
              </a>
            </div>
          </div>

          {/* Feedback Form */}
          <form onSubmit={handleSendFeedback} className="space-y-3 pt-1">
            {feedbackSubmitted && (
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Повідомлення успішно надіслано розробнику (Osipov Eduard)! Дякуємо за зворотний зв'язок. Я зв'яжуся з Вами найближчим часом.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Ваше ім'я / Заклад ЗДО
                </label>
                <input
                  type="text"
                  value={feedbackName}
                  onChange={(e) => setFeedbackName(e.target.value)}
                  placeholder="Наприклад: Марія Іванівна (КЗДО №145)"
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Телефон або E-mail для відповіді
                </label>
                <input
                  type="text"
                  value={feedbackContact}
                  onChange={(e) => setFeedbackContact(e.target.value)}
                  placeholder="+380... або email@domain.com"
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Тема звернення
                </label>
                <select
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Запитання по роботі системи">Запитання по роботі системи</option>
                  <option value="Пропозиція щодо покращення">Пропозиція щодо покращення</option>
                  <option value="Повідомити про помилку">Повідомити про помилку</option>
                  <option value="Консультація розробника">Консультація розробника</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Текст запитання чи повідомлення *
              </label>
              <textarea
                required
                rows={2}
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Опишіть Ваше запитання або побажання щодо програми SADOK..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Надіслати розробнику</span>
              </button>
            </div>
          </form>
        </div>

        {/* DEVELOPER CREDIT & UKRAINIAN IDENTITY FOOTER */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-3 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xl animate-flag-wave">🇺🇦</span>
            <div>
              <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center space-x-1">
                <span>Made with</span>
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline animate-pulse" />
                <span>in Ukraine</span>
              </span>
              <span className="block text-[10px] text-slate-500 dark:text-slate-400">Створено з любов'ю в Україні для закладів дошкільної освіти</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Розробник ПЗ</span>
              <span className="font-black text-slate-900 dark:text-white">Eduard Osipov (Осіпов Едуард)</span>
            </div>
            <a 
              href="https://osipov.pp.ua" 
              target="_blank" 
              rel="noreferrer"
              className="text-purple-600 dark:text-purple-400 hover:underline text-[11px] font-bold pl-2 border-l border-slate-200 dark:border-slate-700 flex items-center space-x-1"
            >
              <span>osipov.pp.ua</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* MODAL: IN DEVELOPMENT ANNOUNCEMENT */}
      {selectedInDevModule && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-900 dark:text-white">
            {/* Background Glow */}
            <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl opacity-30 bg-gradient-to-tr ${selectedInDevModule.gradient}`} />

            {/* Close Button */}
            <button
              onClick={() => setSelectedInDevModule(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center space-x-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${selectedInDevModule.gradient} text-white font-black text-2xl flex items-center justify-center shadow-xl border border-white/20 shrink-0`}>
                {selectedInDevModule.badgeLetter}
              </div>
              <div>
                <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 rounded-full text-[10px] font-bold text-amber-800 dark:text-amber-300 mb-1">
                  <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>Модуль знаходиться в розробці</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-baseline space-x-1.5">
                  <span>{selectedInDevModule.name}</span>
                  <span className="text-slate-700 dark:text-slate-300 font-bold">{selectedInDevModule.subtitle}</span>
                </h3>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {selectedInDevModule.description}
            </p>

            {/* Planned Features List */}
            <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Заплановані можливості модуля:</span>
              </div>
              <ul className="space-y-2">
                {selectedInDevModule.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start space-x-2 text-xs text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => {
                  alert(`Ви підписалися на сповіщення про реліз модуля «${selectedInDevModule.name} ${selectedInDevModule.subtitle}»!`);
                  setSelectedInDevModule(null);
                }}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition text-xs shadow-lg cursor-pointer text-center"
              >
                🔔 Повідомити про вихід релізу
              </button>

              <button
                onClick={() => setSelectedInDevModule(null)}
                className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition text-xs cursor-pointer"
              >
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
