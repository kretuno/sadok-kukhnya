import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Sparkles, 
  Utensils, 
  Calendar, 
  Clock, 
  Lock, 
  ShieldCheck, 
  Users, 
  Building2, 
  ArrowRight, 
  ChevronRight,
  Baby,
  Activity,
  Package,
  FileSpreadsheet,
  HeartPulse,
  Brain,
  Crown,
  CheckCircle2,
  Phone,
  MapPin,
  HelpCircle,
  KeyRound,
  Sun,
  Moon
} from 'lucide-react';
import { SadokLogo } from '../SadokLogo';
import { APP_VERSION } from '../../config/version';
import { PinEntryModal } from './PinEntryModal';
import { PortalRole, setCurrentPortalRole } from '../../services/portalSecurity';

interface MainPortalLandingProps {
  onSelectRole: (role: PortalRole) => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const MainPortalLanding: React.FC<MainPortalLandingProps> = ({ 
  onSelectRole,
  darkMode = false,
  onToggleDarkMode
}) => {
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<'director' | 'staff'>('director');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOpenPin = (role: 'director' | 'staff') => {
    setTargetRole(role);
    setPinModalOpen(true);
  };

  const handlePinSuccess = () => {
    setPinModalOpen(false);
    onSelectRole(targetRole);
  };

  const handleOpenParent = () => {
    setCurrentPortalRole('parent');
    onSelectRole('parent');
  };

  const formattedDate = currentTime.toLocaleDateString('uk-UA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const formattedTime = currentTime.toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-amber-50/20 to-sky-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white relative overflow-x-hidden font-sans transition-colors duration-200">
      {/* Background Ambient Glow Lights */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[500px] h-[500px] bg-amber-400/10 dark:bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[650px] h-[500px] bg-indigo-400/10 dark:bg-indigo-600/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-0 right-1/4 translate-x-1/2 w-[500px] h-[500px] bg-emerald-400/10 dark:bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <SadokLogo size="md" subtitle={`v${APP_VERSION}`} />
            <div className="hidden sm:block h-6 w-px bg-slate-300 dark:bg-slate-700/80" />
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-200 tracking-wide flex items-center gap-1.5">
                <span>🇺🇦</span>
                <span>КЗДО (ясла-садок) КТ №145 КМР «Півник»</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Єдина автоматизована цифрова система закладу
              </span>
            </div>
          </div>

          {/* Right Status / Clock / Theme Toggle */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 capitalize">
                {formattedDate}
              </span>
              <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-bold">
                {formattedTime}
              </span>
            </div>

            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">Офлайн-система</span>
              <span>100% Ready</span>
            </div>

            {/* Theme Toggle (Light / Dark) */}
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

      {/* Hero Welcome Banner */}
      <section className="relative z-10 max-w-5xl mx-auto text-center px-4 sm:px-6 pt-10 pb-6 sm:pt-14 sm:pb-10">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm text-xs text-amber-700 dark:text-amber-300 font-bold mb-4">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Головний материнський портал закладу</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-4 leading-tight">
          Ласкаво просимо до{' '}
          <span className="bg-gradient-to-r from-amber-600 via-sky-600 to-indigo-600 dark:from-amber-300 dark:via-sky-300 dark:to-indigo-300 bg-clip-text text-transparent">
            SADOK Екосистеми
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
          Оберіть свій кабінет: відкритий інформаційний простір для батьків вихованців, 
          аналітичний центр директора або повнофункціональне робоче місце персоналу.
        </p>
      </section>

      {/* Main 3 Role Door Cards */}
      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-12 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          
          {/* CARD 1: БАТЬКАМ */}
          <div className="group relative flex flex-col justify-between rounded-3xl p-6 sm:p-7 bg-gradient-to-b from-amber-500/5 via-white to-amber-50/50 dark:from-amber-500/10 dark:via-slate-900/90 dark:to-slate-900/95 border border-amber-300 dark:border-amber-500/30 hover:border-amber-500 dark:hover:border-amber-400/80 shadow-xl shadow-amber-500/5 hover:shadow-2xl hover:shadow-amber-500/15 hover:-translate-y-1.5 transition-all duration-300">
            {/* Top Glow Accent */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-5 relative z-10">
              {/* Badge & Icon */}
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Heart className="w-7 h-7 fill-white/20" />
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-400/40 text-amber-900 dark:text-amber-300 text-xs font-extrabold flex items-center gap-1.5 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Вільний доступ
                </span>
              </div>

              <div>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 tracking-wide uppercase block">
                  Для родин вихованців
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1 group-hover:text-amber-600 dark:group-hover:text-amber-200 transition">
                  Батьківський простір
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                  Відкрита інформаційна зона без пароля. Щоденне меню харчоблоку, режим дня та зворотний зв'язок.
                </p>
              </div>

              {/* Feature Points */}
              <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <Utensils className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Меню на сьогодні:</strong> страви сніданку, обіду, полуденка та вечері з калоріями</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Розпорядок дня:</strong> режим сну, прогулянок та занять вікових груп</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Е-сервіси (в розробці):</strong> електронний запис, статус черги, опитування</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <Phone className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Контакти садка:</strong> години прийому керівництва, адреса, телефони</span>
                </div>
              </div>
            </div>

            {/* Bottom Button */}
            <div className="pt-6 relative z-10">
              <button
                onClick={handleOpenParent}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center space-x-2 transition-all transform active:scale-95 cursor-pointer"
              >
                <span>Увійти в кабінет батьків</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </button>
              <span className="block text-center text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-2 font-medium">
                Відкрито для всіх • Без введення PIN
              </span>
            </div>
          </div>

          {/* CARD 2: КЕРІВНИК (Featured Center) */}
          <div className="group relative flex flex-col justify-between rounded-3xl p-6 sm:p-7 bg-gradient-to-b from-indigo-500/5 via-white to-indigo-50/50 dark:from-indigo-600/20 dark:via-slate-900/90 dark:to-slate-900/95 border-2 border-indigo-300 dark:border-indigo-500/50 hover:border-indigo-500 dark:hover:border-indigo-400 shadow-2xl shadow-indigo-500/10 hover:shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-2 transition-all duration-300">
            {/* Crown Top Ribbon */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 border border-indigo-300/40 text-white text-[11px] font-black uppercase tracking-wider shadow-md flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span>Головний контроль</span>
            </div>

            {/* Top Glow Accent */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-5 relative z-10 pt-2">
              {/* Badge & Icon */}
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 border border-white/20">
                  <Crown className="w-7 h-7 text-amber-300" />
                </div>
                <span className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-300 dark:border-indigo-400/40 text-indigo-900 dark:text-indigo-300 text-xs font-extrabold flex items-center gap-1.5 shadow-xs">
                  <Lock className="w-3 h-3 text-indigo-700 dark:text-indigo-300" />
                  Захищено PIN
                </span>
              </div>

              <div>
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 tracking-wide uppercase block">
                  Директор та адміністрація
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-200 transition">
                  Кабінет керівника
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                  Аналітичний моніторинг, фінансово-господарський контроль, погодження харчування та оперативний дашборд.
                </p>
              </div>

              {/* Feature Points */}
              <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>«Садок на долоні»:</strong> оперативний дашборд показників у реальному часі</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>Затвердження меню:</strong> погодження щоденного харчування за 1 клік</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>Контроль норм КМУ №305:</strong> аналіз виконання білків, жирів, калорій</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>Контингент закладу:</strong> відвідуваність, пільгові категорії та дієти</span>
                </div>
              </div>
            </div>

            {/* Bottom Button */}
            <div className="pt-6 relative z-10">
              <button
                onClick={() => handleOpenPin('director')}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all transform active:scale-95 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Вхід для керівника</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </button>
              <span className="block text-center text-[11px] text-indigo-800/80 dark:text-indigo-300/80 mt-2 font-medium">
                PIN-код за замовчуванням: <strong className="text-indigo-900 dark:text-amber-300 font-mono">145</strong> (можна змінити)
              </span>
            </div>
          </div>

          {/* CARD 3: УПРАВЛІННЯ ТА ПЕРСОНАЛ */}
          <div className="group relative flex flex-col justify-between rounded-3xl p-6 sm:p-7 bg-gradient-to-b from-emerald-500/5 via-white to-emerald-50/50 dark:from-emerald-600/10 dark:via-slate-900/90 dark:to-slate-900/95 border border-emerald-300 dark:border-emerald-500/30 hover:border-emerald-500 dark:hover:border-emerald-400/80 shadow-xl shadow-emerald-500/5 hover:shadow-2xl hover:shadow-emerald-500/15 hover:-translate-y-1.5 transition-all duration-300">
            {/* Top Glow Accent */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-5 relative z-10">
              {/* Badge & Icon */}
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Building2 className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-400/40 text-emerald-900 dark:text-emerald-300 text-xs font-extrabold flex items-center gap-1.5 shadow-xs">
                  <Lock className="w-3 h-3 text-emerald-700 dark:text-emerald-300" />
                  Захищено PIN
                </span>
              </div>

              <div>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tracking-wide uppercase block">
                  Співробітники та спеціалісти
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-200 transition">
                  Управління та персонал
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                  Повнофункціональний робочий простір з 13 модулями для щоденної фахової діяльності персоналу.
                </p>
              </div>

              {/* Feature Points */}
              <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <Utensils className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Харчоблок:</strong> меню-розкладка, 400+ технологічних карт страв</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Склад:</strong> прихід накладних, списання FIFO, залишки наживо</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Реєстр майна:</strong> 18 локацій, 280+ позицій, інвентаризація A4</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <HeartPulse className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Медкабінет:</strong> вакцинація, форма 063/о, «1 Вересня» переведення</span>
                </div>
              </div>
            </div>

            {/* Bottom Button */}
            <div className="pt-6 relative z-10">
              <button
                onClick={() => handleOpenPin('staff')}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2 transition-all transform active:scale-95 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Вхід для співробітників</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </button>
              <span className="block text-center text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-2 font-medium">
                PIN-код за замовчуванням: <strong className="text-emerald-900 dark:text-amber-300 font-mono">145</strong> (можна змінити)
              </span>
            </div>
          </div>

        </div>

        {/* Highlight trust banner */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xs flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">100% Конфіденційність</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Локальне зберігання без передачі третім особам</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xs flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">Повна автономність</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Працює стабільно навіть без доступу до інтернету</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xs flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">Стандарти МОН та МОЗ</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Відповідність нормам КМУ №305 та СанПіН</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 text-xs py-5 px-4 sm:px-8 mt-auto relative z-10 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800 dark:text-slate-300">КЗДО №145 КМР «Півник»</span>
            <span>•</span>
            <span className="text-slate-500 dark:text-slate-400">м. Кривий Ріг</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px] text-slate-500 dark:text-slate-400">
            <span>SADOK Unified Platform v{APP_VERSION}</span>
            <span>•</span>
            <span>Автор і розробник: Осіпов Едуард</span>
          </div>
        </div>
      </footer>

      {/* PIN Entry & Security Modal */}
      <PinEntryModal
        isOpen={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        targetRole={targetRole}
        onSuccess={handlePinSuccess}
      />
    </div>
  );
};
