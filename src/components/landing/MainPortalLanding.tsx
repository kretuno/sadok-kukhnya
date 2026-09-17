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
                <span>Криворізький КЗДО КТ №145 КМР</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Комунальний заклад дошкільної освіти (ясла-садок) комбінованого типу №145 Криворізької міської ради
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

      {/* Hero Welcome Showcase with Kindergarten Architecture Banner */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-4">
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-900 group">
          {/* Background Kindergarten Hero Photo */}
          <div className="relative h-64 sm:h-80 md:h-96 w-full overflow-hidden">
            <img 
              src="./images/kindergarten_hero.jpg" 
              alt="Криворізький КЗДО КТ №145 КМР"
              className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700 ease-out brightness-[0.80] dark:brightness-[0.70]"
            />
            {/* Soft modern gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent" />
          </div>

          {/* Hero Content positioned over banner */}
          <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 md:p-12 z-10">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-400/40 text-amber-300 text-xs font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                <span>Головний материнський портал закладу</span>
              </div>

              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                Ласкаво просимо до{' '}
                <span className="bg-gradient-to-r from-amber-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                  SADOK Екосистеми
                </span>
              </h1>

              <p className="text-xs sm:text-base text-slate-200/90 max-w-2xl font-normal leading-relaxed drop-shadow-sm">
                Єдиний цифровий простір: <strong>Криворізький КЗДО КТ №145 КМР</strong>. Оберіть свій кабінет: відкритий простір для батьків вихованців, аналітичний кабінет директора або фаховий комплекс персоналу.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main 3 Role Door Cards */}
      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4 pb-12 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          
          {/* CARD 1: БАТЬКАМ */}
          <div className="group relative flex flex-col justify-between rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-amber-300/80 dark:border-amber-500/30 hover:border-amber-500 dark:hover:border-amber-400/80 shadow-xl shadow-amber-500/5 hover:shadow-2xl hover:shadow-amber-500/15 hover:-translate-y-1.5 transition-all duration-300">
            {/* Top Preview Image */}
            <div className="relative h-48 w-full overflow-hidden bg-amber-100 dark:bg-slate-800">
              <img 
                src="./images/parent_space.jpg" 
                alt="Батьківський простір закладу"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent dark:from-slate-900 dark:via-slate-900/40 dark:to-transparent" />
              
              {/* Badges on image */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                <div className="w-10 h-10 rounded-xl bg-amber-500/90 backdrop-blur-md text-white flex items-center justify-center shadow-md">
                  <Heart className="w-5 h-5 fill-white/30" />
                </div>
                <span className="px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-amber-300 dark:border-amber-400/40 text-amber-800 dark:text-amber-300 text-xs font-black flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Вільний доступ
                </span>
              </div>
            </div>

            <div className="p-6 sm:p-7 pt-2 flex-1 flex flex-col justify-between space-y-5">
              <div>
                <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 tracking-wider uppercase block">
                  Для родин вихованців
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition">
                  Батьківський простір
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  Відкрита інформаційна зона без пароля. Щоденне меню харчоблоку з розрахунком калорій, режим дня та контакти закладу.
                </p>
              </div>

              {/* Feature Points */}
              <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <Utensils className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span><strong>Меню на сьогодні:</strong> сніданок, обід, полуденок з калоріями та виходом</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span><strong>Розпорядок дня:</strong> режим сну, прогулянок та занять для груп</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span><strong>Е-сервіси:</strong> електронний запис, черга та зворотний зв'язок</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <Phone className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span><strong>Контакти:</strong> вул. Перлинна 23А, прийом директора, телефони</span>
                </div>
              </div>

              {/* Bottom Button */}
              <div className="pt-2">
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
          </div>

          {/* CARD 2: КЕРІВНИК (Featured Center) */}
          <div className="group relative flex flex-col justify-between rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border-2 border-indigo-300 dark:border-indigo-500/50 hover:border-indigo-500 dark:hover:border-indigo-400 shadow-2xl shadow-indigo-500/10 hover:shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-2 transition-all duration-300">
            {/* Top Preview Image Container */}
            <div className="relative h-48 w-full overflow-hidden bg-indigo-100 dark:bg-slate-800">
              <img 
                src="./images/director_space.jpg" 
                alt="Кабінет керівника"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent dark:from-slate-900 dark:via-slate-900/40 dark:to-transparent" />
              
              {/* Badges on image - neatly positioned without covering the person */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/90 backdrop-blur-md text-white flex items-center justify-center shadow-md">
                    <Crown className="w-5 h-5 text-amber-300" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-indigo-600/90 backdrop-blur-md border border-indigo-400/40 text-white text-[11px] font-black uppercase tracking-wide shadow-md flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-300" />
                    <span>Контроль</span>
                  </span>
                </div>
                <span className="px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-indigo-300 dark:border-indigo-400/40 text-indigo-900 dark:text-indigo-300 text-xs font-black flex items-center gap-1.5 shadow-sm">
                  <Lock className="w-3 h-3 text-indigo-600 dark:text-indigo-300" />
                  Захищено PIN
                </span>
              </div>
            </div>

            <div className="p-6 sm:p-7 pt-2 flex-1 flex flex-col justify-between space-y-5">
              <div>
                <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase block">
                  Директор та адміністрація
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition">
                  Кабінет керівника
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  Аналітичний моніторинг, фінансово-господарський контроль, погодження харчування за 1 клік та оперативний дашборд показників.
                </p>
              </div>

              {/* Feature Points */}
              <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <Activity className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span><strong>«Садок на долоні»:</strong> оперативний дашборд показників у реальному часі</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span><strong>Затвердження меню:</strong> погодження щоденного харчування за 1 клік</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span><strong>Контроль норм КМУ №305:</strong> аналіз виконання білків, жирів, калорій</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <Users className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span><strong>Контингент закладу:</strong> відвідуваність, пільгові категорії та дієти</span>
                </div>
              </div>

              {/* Bottom Button */}
              <div className="pt-2">
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
          </div>

          {/* CARD 3: УПРАВЛІННЯ ТА ПЕРСОНАЛ */}
          <div className="group relative flex flex-col justify-between rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-emerald-300/80 dark:border-emerald-500/30 hover:border-emerald-500 dark:hover:border-emerald-400/80 shadow-xl shadow-emerald-500/5 hover:shadow-2xl hover:shadow-emerald-500/15 hover:-translate-y-1.5 transition-all duration-300">
            {/* Top Visual Showcase: Modern Cohesive Team & Modules Showcase */}
            <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-950 flex flex-col justify-between p-4">
              {/* Subtle background mesh glow */}
              <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-teal-500/20 blur-2xl pointer-events-none" />

              {/* Decorative geometric network pattern */}
              <svg className="absolute inset-0 w-full h-full opacity-15 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="staff-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1.5" fill="currentColor" className="text-emerald-300" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#staff-grid)" />
              </svg>

              {/* Top Row: Icon + Security Badge */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-900/40 border border-emerald-400/30">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300">13 Модулів</span>
                    <span className="text-[10px] text-emerald-100/70 font-medium">Комплекс ЗДО</span>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-emerald-400/40 text-emerald-300 text-xs font-black flex items-center gap-1.5 shadow-sm">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  Захищено PIN
                </span>
              </div>

              {/* Middle Row: Specialists Badges */}
              <div className="relative z-10 grid grid-cols-4 gap-2 my-auto">
                <div className="p-2 rounded-xl bg-slate-900/70 backdrop-blur-md border border-emerald-500/30 flex flex-col items-center justify-center text-center group-hover:border-emerald-400/60 transition shadow-sm">
                  <Utensils className="w-4 h-4 text-amber-300 mb-1" />
                  <span className="text-[10px] font-extrabold text-white">Харчоблок</span>
                  <span className="text-[8px] text-slate-300">Кухарі</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/70 backdrop-blur-md border border-sky-500/30 flex flex-col items-center justify-center text-center group-hover:border-sky-400/60 transition shadow-sm">
                  <Package className="w-4 h-4 text-sky-300 mb-1" />
                  <span className="text-[10px] font-extrabold text-white">Склад</span>
                  <span className="text-[8px] text-slate-300">FIFO</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/70 backdrop-blur-md border border-rose-500/30 flex flex-col items-center justify-center text-center group-hover:border-rose-400/60 transition shadow-sm">
                  <HeartPulse className="w-4 h-4 text-rose-300 mb-1" />
                  <span className="text-[10px] font-extrabold text-white">Медицина</span>
                  <span className="text-[8px] text-slate-300">Сестра</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/70 backdrop-blur-md border border-purple-500/30 flex flex-col items-center justify-center text-center group-hover:border-purple-400/60 transition shadow-sm">
                  <Building2 className="w-4 h-4 text-purple-300 mb-1" />
                  <span className="text-[10px] font-extrabold text-white">Майно</span>
                  <span className="text-[8px] text-slate-300">Завгосп</span>
                </div>
              </div>

              {/* Bottom Row: Status indicator */}
              <div className="relative z-10 flex items-center justify-between text-[11px] text-emerald-200/90 pt-1 border-t border-emerald-500/20">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Робочі місця персоналу
                </span>
                <span className="text-emerald-300/80 font-mono text-[10px]">КЗДО №145</span>
              </div>
            </div>

            <div className="p-6 sm:p-7 pt-2 flex-1 flex flex-col justify-between space-y-5">
              <div>
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase block">
                  Співробітники та спеціалісти
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition">
                  Управління та персонал
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  Повнофункціональний робочий простір з 13 модулями для щоденної фахової діяльності медсестри, завскладу, кухарів та завгоспа.
                </p>
              </div>

              {/* Feature Points */}
              <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <Utensils className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Харчоблок:</strong> меню-розкладка, 400+ технологічних карт страв</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <Package className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Склад:</strong> прихід накладних, списання FIFO, залишки наживо</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <Building2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Реєстр майна:</strong> 18 локацій, 280+ позицій, інвентаризація A4</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <HeartPulse className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Медкабінет:</strong> вакцинація, форма 063/о, «1 Вересня» переведення</span>
                </div>
              </div>

              {/* Bottom Button */}
              <div className="pt-2">
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

        </div>

        {/* Highlight trust banner */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">100% Конфіденційність</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Локальне зберігання SQLite без передачі третім особам</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">Повна автономність</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Працює стабільно навіть без інтернету на Windows 7-11 та macOS</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">Стандарти МОН та МОЗ</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Відповідність нормам КМУ №305, НАССР та СанПіН</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 text-xs py-5 px-4 sm:px-8 mt-auto relative z-10 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800 dark:text-slate-300">Криворізький КЗДО КТ №145 КМР</span>
            <span>•</span>
            <span className="text-slate-500 dark:text-slate-400">вул. Перлинна 23А, м. Кривий Ріг</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px] text-slate-500 dark:text-slate-400">
            <span>SADOK Unified Platform v{APP_VERSION}</span>
            <span>•</span>
            <span>ЄДРПОУ 26136748</span>
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
