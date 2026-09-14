import React, { useState, useEffect, useMemo } from 'react';
import { 
  Heart, 
  Sparkles, 
  Utensils, 
  Calendar, 
  Clock, 
  Phone, 
  MapPin, 
  ArrowLeft, 
  CheckCircle2, 
  Send, 
  FileText, 
  Info, 
  Users, 
  ShieldCheck,
  Smile,
  SunMedium,
  Sun,
  Moon
} from 'lucide-react';
import { getMenuEntries, getDishes } from '../../services/db';
import { MenuHeader, Dish } from '../../types';

interface ParentSpaceViewProps {
  onBackToLanding: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const ParentSpaceView: React.FC<ParentSpaceViewProps> = ({ 
  onBackToLanding,
  darkMode = false,
  onToggleDarkMode
}) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'schedule' | 'services' | 'contacts'>('menu');
  const [todayDate] = useState(new Date().toISOString().split('T')[0]);
  const [menuEntries, setMenuEntries] = useState<MenuHeader[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);

  // Feedback form state for parents
  const [parentName, setParentName] = useState('');
  const [childGroup, setChildGroup] = useState('');
  const [parentMessage, setParentMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    try {
      const entries = getMenuEntries(todayDate);
      const allDishes = getDishes();
      setMenuEntries(entries);
      setDishes(allDishes);
    } catch (_) {}
  }, [todayDate]);

  // Group today's menu by meal type (Сніданок, 2-й сніданок, Обід, Полуденок, Вечеря)
  const mealsGrouped = useMemo(() => {
    const map = new Map<string, Array<{ dishName: string; yieldStr: string; calories?: number }>>();
    const dishMap = new Map(dishes.map(d => [d.ID, d]));

    const MEAL_ORDER = ['Сніданок', '2-й сніданок', 'Обід', 'Полуденок', 'Вечеря'];
    MEAL_ORDER.forEach(m => map.set(m, []));

    menuEntries.forEach(entry => {
      const meal = entry.MEAL_TYPE || 'Обід';
      const dish = dishMap.get(entry.ID_BLUDA);
      const name = entry.NAME_BLUDA || dish?.NAME || 'Страва меню';
      const yieldStr = dish?.VYXOD ? `${dish.VYXOD} г` : '150 г';
      const calories = dish?.KALORII;
      
      const list = map.get(meal) || [];
      if (!list.some(item => item.dishName === name)) {
        list.push({ dishName: name, yieldStr, calories });
        map.set(meal, list);
      }
    });

    return map;
  }, [menuEntries, dishes]);

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentMessage.trim()) return;

    try {
      const existing = JSON.parse(localStorage.getItem('sadok_parent_feedback') || '[]');
      const newEntry = {
        id: Date.now(),
        date: new Date().toLocaleDateString('uk-UA') + ' ' + new Date().toLocaleTimeString('uk-UA'),
        parentName: parentName || 'Батьки вихованця',
        childGroup: childGroup || 'Не вказано',
        message: parentMessage
      };
      localStorage.setItem('sadok_parent_feedback', JSON.stringify([newEntry, ...existing]));
    } catch (_) {}

    setSubmitted(true);
    setParentName('');
    setChildGroup('');
    setParentMessage('');
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/40 via-slate-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-white">
      {/* TOP HEADER */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-amber-200/60 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBackToLanding}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition flex items-center space-x-1.5 text-xs font-bold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">На головну</span>
            </button>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md">
                <Heart className="w-5 h-5 fill-white" />
              </div>
              <div>
                <h1 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                  Батьківський простір
                </h1>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block">
                  КЗДО (ясла-садок) КТ №145 КМР
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 font-bold">
              <SunMedium className="w-3.5 h-3.5 text-amber-600" />
              <span>Сьогодні: {new Date().toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'long' })}</span>
            </div>

            {onToggleDarkMode && (
              <button
                onClick={onToggleDarkMode}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition cursor-pointer flex items-center justify-center shadow-xs"
                title={darkMode ? 'Перемкнути на світлу тему' : 'Перемкнути на темну тему'}
                aria-label="Перемикач теми оформлення"
              >
                {darkMode ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-700" />
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO BANNER */}
      <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white py-10 px-4 shadow-xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center space-y-3 relative z-10">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-black uppercase tracking-wider text-white">
            <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
            <span>Офіційний інформаційний портал для батьків</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight drop-shadow-sm">
            Все про день вашої дитини в садочку
          </h2>
          <p className="text-xs sm:text-sm text-amber-100 max-w-xl mx-auto font-medium leading-relaxed">
            Щоденне збалансоване меню, режим дня, рекомендації педагогів та електронні сервіси зв'язку з адміністрацією ЗДО №145.
          </p>
        </div>
      </div>

      {/* SUB-NAV TABS */}
      <div className="max-w-4xl w-full mx-auto px-4 -mt-6 z-20">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-1.5 shadow-xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
              activeTab === 'menu'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Меню на сьогодні</span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Режим дня</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
              activeTab === 'services'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Е-сервіси (В розробці)</span>
          </button>

          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
              activeTab === 'contacts'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Phone className="w-4 h-4" />
            <span>Контакти садка</span>
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* TAB 1: MENU TODAY */}
        {activeTab === 'menu' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                  <Utensils className="w-5 h-5 text-amber-500" />
                  <span>Що їсть ваша дитина сьогодні ({todayDate})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Складено відповідно до норм КМУ № 305 та затверджено медичною сестрою
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Затверджено</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['Сніданок', '2-й сніданок', 'Обід', 'Полуденок'].map((mealName) => {
                const mealDishes = mealsGrouped.get(mealName) || [];
                const isLunch = mealName === 'Обід';

                return (
                  <div 
                    key={mealName}
                    className={`card-glass p-5 rounded-2xl border transition-all ${
                      isLunch 
                        ? 'border-amber-300/80 dark:border-amber-600/40 bg-gradient-to-br from-amber-500/5 to-rose-500/5' 
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-3">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${
                          mealName === 'Сніданок' ? 'bg-amber-400' :
                          mealName === '2-й сніданок' ? 'bg-emerald-400' :
                          mealName === 'Обід' ? 'bg-rose-500' : 'bg-purple-500'
                        }`} />
                        <h4 className="font-black text-sm text-slate-900 dark:text-white">
                          {mealName}
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-400 font-semibold">
                        {mealName === 'Сніданок' ? '08:30 – 09:00' :
                         mealName === '2-й сніданок' ? '10:30 – 10:45' :
                         mealName === 'Обід' ? '12:00 – 12:45' : '15:30 – 16:00'}
                      </span>
                    </div>

                    {mealDishes.length === 0 ? (
                      <div className="text-xs text-slate-400 py-4 text-center italic">
                        {mealName === '2-й сніданок' ? 'Свіжі сезонні фрукти / сік' : 'Страви формуються черговим кухарем'}
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {mealDishes.map((d, idx) => (
                          <li key={idx} className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {idx + 1}. {d.dishName}
                            </span>
                            <span className="font-mono text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                              {d.yieldStr}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start space-x-3 text-xs text-blue-900 dark:text-blue-200">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <b>Особливі дієтичні потреби:</b> Для дітей з підтвердженою алергією (на лактозу, глютен, цитрусові тощо) щодня готуються індивідуальні страви за призначенням медичної сестри та довідкою педіатра.
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SCHEDULE */}
        {activeTab === 'schedule' && (
          <div className="card-glass p-6 rounded-3xl space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Clock className="w-5 h-5 text-rose-500" />
              <span>Орієнтовний розпорядок дня вихованців</span>
            </h3>

            <div className="space-y-3 text-xs">
              {[
                { time: '07:00 – 08:30', title: 'Прийом дітей, ранковий огляд, самостійна ігрова діяльність', icon: '☀️' },
                { time: '08:30 – 08:45', title: 'Ранкова гімнастика', icon: '🤸' },
                { time: '08:45 – 09:15', title: 'Підготовка до сніданку, Сніданок', icon: '🥣' },
                { time: '09:15 – 10:30', title: 'Організована навчально-пізнавальна діяльність (заняття за віковими підгрупами)', icon: '🎨' },
                { time: '10:30 – 10:45', title: 'Другий сніданок (вітамінна пауза, фрукти)', icon: '🍎' },
                { time: '10:45 – 12:00', title: 'Підготовка до прогулянки, прогулянка на свіжому повітрі, рухливі ігри', icon: '🌳' },
                { time: '12:00 – 12:45', title: 'Повернення з прогулянки, гігієнічні процедури, Обід', icon: '🍲' },
                { time: '13:00 – 15:00', title: 'Денний сон (тиха година)', icon: '💤' },
                { time: '15:00 – 15:30', title: 'Поступовий підйом, гімнастика пробудження, загартовувальні процедури', icon: '🛏️' },
                { time: '15:30 – 16:00', title: 'Полуденок', icon: '🥛' },
                { time: '16:00 – 17:30', title: 'Ігрова діяльність, гурткова робота, прогулянка, зустріч з батьками', icon: '👋' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-3">
                    <span className="text-base">{item.icon}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.title}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-700 px-2 py-1 rounded-md text-[11px] shrink-0 ml-2">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SERVICES IN DEVELOPMENT */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <span>Електронні сервіси для батьків (В розробці)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Команда SADOK готує корисні цифрові інструменти для вашого максимального комфорту:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  title: 'Онлайн-заява на оздоровлення та відпустку',
                  desc: 'Можливість подати заяву про тимчасову відсутність дитини в 1 клік зі збереженням місця в групі.',
                  badge: 'Очікується у v1.0.67'
                },
                {
                  title: 'Прямий зв\'язок зі старшою медсестрою',
                  desc: 'Повідомлення про щеплення, прикріплення фото довідки після хвороби та оновлення дієти.',
                  badge: 'Очікується у v1.0.68'
                },
                {
                  title: 'Опитування якості харчування',
                  desc: 'Анонімні відгуки батьків щодо страв меню для постійного вдосконалення раціону кухні.',
                  badge: 'Очікується незабаром'
                },
                {
                  title: 'Фотогалерея та свята групи',
                  desc: 'Безпечний захищений перегляд фотографій з ранків та відкритих занять вашої вікової групи.',
                  badge: 'В планах'
                }
              ].map((s, idx) => (
                <div key={idx} className="card-glass p-5 rounded-2xl border border-purple-200/60 dark:border-purple-900/40 space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{s.title}</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.desc}</p>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold text-[10px]">
                    {s.badge}
                  </span>
                </div>
              ))}
            </div>

            {/* Parent Feedback form */}
            <div className="card-glass p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="font-black text-sm text-slate-800 dark:text-white flex items-center space-x-2">
                <Send className="w-4 h-4 text-blue-600" />
                <span>Залишити побажання або запитання адміністрації садка</span>
              </h4>
              <p className="text-xs text-slate-500">
                Ваше повідомлення потрапить безпосередньо до керівництва закладу та розробників платформи.
              </p>

              {submitted ? (
                <div className="p-4 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Дякуємо! Ваше звернення успішно передано.</span>
                </div>
              ) : (
                <form onSubmit={handleSendFeedback} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Ваше ім'я</label>
                      <input
                        type="text"
                        value={parentName}
                        onChange={e => setParentName(e.target.value)}
                        placeholder="Оксана Сергіївна"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Група дитини</label>
                      <input
                        type="text"
                        value={childGroup}
                        onChange={e => setChildGroup(e.target.value)}
                        placeholder="Група «Сонечко»"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Текст звернення</label>
                    <textarea
                      rows={3}
                      value={parentMessage}
                      onChange={e => setParentMessage(e.target.value)}
                      placeholder="Напишіть ваші пропозиції або запитання..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold rounded-xl shadow-md transition cursor-pointer"
                  >
                    Надіслати звернення
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CONTACTS */}
        {activeTab === 'contacts' && (
          <div className="card-glass p-6 rounded-3xl space-y-5">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Phone className="w-5 h-5 text-emerald-600" />
              <span>Контактні дані закладу дошкільної освіти</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="font-bold text-slate-800 dark:text-white text-sm">Адміністрація ЗДО</div>
                <div className="space-y-1 text-slate-600 dark:text-slate-300">
                  <div><b>Заклад:</b> Криворізький КЗДО (ясла-садок) КТ №145 КМР</div>
                  <div><b>Директор:</b> Павлухіна Наталія Григорівна</div>
                  <div><b>Вихователь-методист:</b> Суміна Н. Є.</div>
                  <div><b>Телефон:</b> +380 (67) 569-47-04</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="font-bold text-slate-800 dark:text-white text-sm">Адреса та графік прийому</div>
                <div className="space-y-1 text-slate-600 dark:text-slate-300">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>вул. Перлинна 23А, м. Кривий Ріг, Дніпропетровська обл.</span>
                  </div>
                  <div><b>Графік роботи:</b> Понеділок – П'ятниця, 07:00 – 17:30</div>
                  <div><b>Прийом батьків директором:</b> Вівторок 09:00 – 12:00, Четвер 14:00 – 17:00</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
