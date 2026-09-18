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
  Moon,
  Star,
  Printer,
  Copy,
  AlertTriangle,
  Baby,
  ChevronRight,
  Calculator,
  FileCheck,
  HelpCircle,
  Eye,
  Award,
  BookOpen,
  MessageSquare,
  X,
  QrCode,
  Lock,
  LogOut,
  Volume2,
  HeartPulse,
  Brain,
  GraduationCap,
  Search,
  Briefcase,
  Quote,
  ExternalLink
} from 'lucide-react';
import {
  PEDAGOGICAL_COLLECTIVE,
  PEDAGOGICAL_DEPARTMENTS,
  getStaffByDepartment,
  searchStaff,
  getStaffStats,
  PedagogicalDepartment,
  PedagogicalStaffMember
} from '../../domain/pedagogicalCollective';
import { 
  getMenuEntries, 
  getDishes, 
  getGroups, 
  getPsychologyMemos, 
  getArticulationExercises,
  getChildByPin,
  getChildren
} from '../../services/db';
import { 
  MenuHeader, 
  Dish, 
  SadokGroup, 
  PsychologyMemo, 
  ArticulationExercise,
  SadokChild,
  UnifiedChildDossier
} from '../../types';
import { 
  calculateParentPayment, 
  getCurrentRoutineStage, 
  ROUTINE_STAGES,
  generateVacationApplicationText,
  saveParentAbsenceNotification,
  getParentAbsenceNotifications,
  saveParentFeedback,
  getParentFeedbacks,
  ParentAbsenceNotification,
  ParentFeedbackMessage
} from '../../domain/parentPortal';
import { buildUnifiedChildDossier, INSTITUTION_INFO } from '../../domain/childDossier';

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
  const [activeTab, setActiveTab] = useState<'my_child' | 'menu' | 'schedule' | 'safety' | 'services' | 'advice' | 'team' | 'contacts'>('menu');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<PedagogicalDepartment | 'all'>('all');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [selectedStaffMember, setSelectedStaffMember] = useState<PedagogicalStaffMember | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [menuEntries, setMenuEntries] = useState<MenuHeader[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [groups, setGroups] = useState<SadokGroup[]>([]);
  const [memos, setMemos] = useState<PsychologyMemo[]>([]);

  // Child Personal Portal (PIN / QR Authentication)
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticatedChild, setAuthenticatedChild] = useState<SadokChild | null>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlPin = urlParams.get('childPin') || urlParams.get('pin');
      if (urlPin) {
        const child = getChildByPin(urlPin);
        if (child) return child;
      }
      const savedPin = sessionStorage.getItem('sadok_parent_pin');
      if (savedPin) {
        return getChildByPin(savedPin);
      }
    }
    return null;
  });

  // If URL has childPin or saved in session, auto-select 'my_child' tab
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlPin = urlParams.get('childPin') || urlParams.get('pin');
      if (urlPin) {
        const child = getChildByPin(urlPin);
        if (child) {
          setAuthenticatedChild(child);
          setActiveTab('my_child');
          sessionStorage.setItem('sadok_parent_pin', urlPin);
        }
      }
    }
  }, []);

  const handleLoginWithPin = (e?: React.FormEvent, directPin?: string) => {
    if (e) e.preventDefault();
    const pinToTest = directPin || pinInput;
    setAuthError(null);
    const matched = getChildByPin(pinToTest);
    if (matched) {
      setAuthenticatedChild(matched);
      setActiveTab('my_child');
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('sadok_parent_pin', matched.ACCESS_PIN || pinToTest);
      }
    } else {
      setAuthError('Не знайдено вихованця з таким кодом. Перевірте PIN або відскануйте QR-код з картки дитини.');
    }
  };

  const handleLogoutChild = () => {
    setAuthenticatedChild(null);
    setPinInput('');
    setAuthError(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('sadok_parent_pin');
    }
  };

  // Unified dossier for authenticated child
  const childDossier: UnifiedChildDossier | null = useMemo(() => {
    if (!authenticatedChild) return null;
    return buildUnifiedChildDossier(authenticatedChild.ID);
  }, [authenticatedChild]);

  // Menu Rating State
  const [menuRating, setMenuRating] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Routine stage state
  const [routineAgeCategory, setRoutineAgeCategory] = useState<'nursery' | 'middle' | 'senior'>('middle');
  const currentStage = useMemo(() => getCurrentRoutineStage(), []);

  // Vacation Application Form
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [childName, setChildName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [vacationFrom, setVacationFrom] = useState('');
  const [vacationTo, setVacationTo] = useState('');
  const [vacationReason, setVacationReason] = useState('оздоровчий період дитини влітку');
  const [generatedApplicationText, setGeneratedApplicationText] = useState<string | null>(null);
  const [copiedApp, setCopiedApp] = useState(false);

  // Quick Absence Report
  const [absenceChild, setAbsenceChild] = useState('');
  const [absenceGroup, setAbsenceGroup] = useState('');
  const [absenceDate, setAbsenceDate] = useState(new Date().toISOString().split('T')[0]);
  const [absenceReason, setAbsenceReason] = useState<'illness' | 'family' | 'sanatorium' | 'other'>('illness');
  const [absenceComment, setAbsenceComment] = useState('');
  const [absenceReportedBy, setAbsenceReportedBy] = useState('Мама');
  const [absenceSubmitted, setAbsenceSubmitted] = useState(false);
  const [absenceList, setAbsenceList] = useState<ParentAbsenceNotification[]>([]);

  // Payment Calculator State
  const [calcDays, setCalcDays] = useState<number>(21);
  const [calcAgeGroup, setCalcAgeGroup] = useState<'nursery' | 'kindergarten'>('kindergarten');
  const [calcBenefit, setCalcBenefit] = useState<'none' | 'large_family_50' | 'full_100_vpo_ubd'>('none');

  // Advice & Memos State
  const [selectedMemo, setSelectedMemo] = useState<PsychologyMemo | null>(null);
  const [speechExercises, setSpeechExercises] = useState<ArticulationExercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<ArticulationExercise | null>(null);
  const [memoCategoryFilter, setMemoCategoryFilter] = useState<string>('all');

  // Direct Contact & Feedback State
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackContact, setFeedbackContact] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('Харчування');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackList, setFeedbackList] = useState<ParentFeedbackMessage[]>([]);

  // Load Initial Data
  useEffect(() => {
    try {
      setDishes(getDishes());
      setGroups(getGroups());
      setMemos(getPsychologyMemos());
      setSpeechExercises(getArticulationExercises());
      setAbsenceList(getParentAbsenceNotifications());
      setFeedbackList(getParentFeedbacks());
    } catch (_) {}
  }, []);

  // Fetch Menu on Date Change
  useEffect(() => {
    try {
      const entries = getMenuEntries(selectedDate);
      setMenuEntries(entries);
    } catch (_) {
      setMenuEntries([]);
    }
  }, [selectedDate]);

  // Group dishes for the selected date
  const mealsGrouped = useMemo(() => {
    const map = new Map<string, Array<{ 
      dishName: string; 
      yieldNursery: string; 
      yieldGarden: string; 
      calories?: number;
      belki?: number;
      ziri?: number;
      uglevodi?: number;
      allergens?: string;
    }>>();

    const dishMap = new Map(dishes.map(d => [d.ID, d]));
    const MEAL_ORDER = ['Сніданок', '2-й сніданок', 'Обід', 'Полуденок'];
    MEAL_ORDER.forEach(m => map.set(m, []));

    menuEntries.forEach(entry => {
      const meal = entry.MEAL_TYPE || 'Обід';
      const dish = dishMap.get(entry.ID_BLUDA);
      const name = entry.NAME_BLUDA || dish?.NAME || 'Страва меню';
      
      const yieldBase = dish?.VYXOD || 150;
      const yieldNursery = `${Math.round(yieldBase * 0.8)} г`;
      const yieldGarden = `${yieldBase} г`;

      const list = map.get(meal) || [];
      if (!list.some(item => item.dishName === name)) {
        list.push({ 
          dishName: name, 
          yieldNursery, 
          yieldGarden, 
          calories: dish?.KALORII,
          belki: dish?.BELKI,
          ziri: dish?.ZIRI,
          uglevodi: dish?.UGLEVODI,
          allergens: dish?.ALLERGENS
        });
        map.set(meal, list);
      }
    });

    return map;
  }, [menuEntries, dishes]);

  // Date navigation handlers
  const handleShiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleResetToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Menu Rating submit
  const handleSaveMenuRating = (e: React.FormEvent) => {
    e.preventDefault();
    if (menuRating === 0) return;
    try {
      const existing = JSON.parse(localStorage.getItem('sadok_menu_ratings') || '[]');
      const newRating = {
        id: Date.now(),
        date: selectedDate,
        rating: menuRating,
        comment: ratingComment,
        timestamp: new Date().toLocaleDateString('uk-UA') + ' ' + new Date().toLocaleTimeString('uk-UA')
      };
      localStorage.setItem('sadok_menu_ratings', JSON.stringify([newRating, ...existing]));
      setRatingSubmitted(true);
      setTimeout(() => setRatingSubmitted(false), 5000);
    } catch (_) {}
  };

  // Generate Application
  const handleGenerateApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentName.trim() || !childName.trim()) {
      alert('Будь ласка, заповніть ПІБ батьків та дитини');
      return;
    }
    const text = generateVacationApplicationText({
      parentFullName: parentName,
      childFullName: childName,
      groupName: selectedGroup || 'Чергова група',
      fromDate: vacationFrom || new Date().toISOString().split('T')[0],
      toDate: vacationTo || new Date().toISOString().split('T')[0],
      reason: vacationReason,
      date: new Date().toISOString().split('T')[0],
      phone: parentPhone
    });
    setGeneratedApplicationText(text);
  };

  const handleCopyApplication = () => {
    if (!generatedApplicationText) return;
    navigator.clipboard.writeText(generatedApplicationText);
    setCopiedApp(true);
    setTimeout(() => setCopiedApp(false), 3000);
  };

  // Submit Absence
  const handleSubmitAbsence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!absenceChild.trim() || !absenceGroup.trim()) {
      alert('Будь ласка, вкажіть прізвище дитини та групу');
      return;
    }
    const saved = saveParentAbsenceNotification({
      date: absenceDate,
      childName: absenceChild.trim(),
      groupName: absenceGroup.trim(),
      reason: absenceReason,
      comment: absenceComment.trim(),
      reportedBy: absenceReportedBy.trim()
    });
    setAbsenceList([saved, ...absenceList]);
    setAbsenceSubmitted(true);
    setAbsenceChild('');
    setAbsenceComment('');
    setTimeout(() => setAbsenceSubmitted(false), 6000);
  };

  // Submit Feedback
  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;

    const saved = saveParentFeedback({
      parentName: feedbackName.trim() || 'Батьки вихованця',
      contact: feedbackContact.trim() || 'Не вказано',
      category: feedbackCategory,
      message: feedbackMessage.trim()
    });

    setFeedbackList([saved, ...feedbackList]);
    setFeedbackSubmitted(true);
    setFeedbackName('');
    setFeedbackContact('');
    setFeedbackMessage('');
    setTimeout(() => setFeedbackSubmitted(false), 5000);
  };

  // Payment computation
  const paymentDetails = useMemo(() => {
    return calculateParentPayment(calcDays, calcAgeGroup, calcBenefit);
  }, [calcDays, calcAgeGroup, calcBenefit]);

  // Filtered Memos
  const filteredMemos = useMemo(() => {
    return memos.filter(m => {
      if (memoCategoryFilter === 'all') return true;
      return m.category === memoCategoryFilter || m.targetAudience === memoCategoryFilter;
    });
  }, [memos, memoCategoryFilter]);

  // Filtered Pedagogical Collective
  const filteredStaffList = useMemo(() => {
    return searchStaff(staffSearchQuery, selectedDeptFilter);
  }, [staffSearchQuery, selectedDeptFilter]);

  const staffStats = useMemo(() => {
    return getStaffStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/40 via-slate-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-white pb-16">
      
      {/* TOP HEADER */}
      <header className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-amber-200/60 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
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
                  Криворізький КЗДО КТ №145 КМР • Відкрита зона
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
      <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white py-9 px-4 shadow-xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center space-y-2.5 relative z-10">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-black uppercase tracking-wider text-white">
            <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
            <span>Офіційний інформаційний портал для родин вихованців</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight drop-shadow-sm">
            Все про життя вашої дитини в садочку №145
          </h2>
          <p className="text-xs sm:text-sm text-amber-100 max-w-2xl mx-auto font-medium leading-relaxed">
            Прозоре щоденне харчування за нормами КМУ №305, безпека в укритті на вул. Перлинній 23А, генератор офіційних заяв на відпустку та фахові поради педагогів.
          </p>
        </div>
      </div>

      {/* NAVIGATION TABS (8 TABS) */}
      <div className="max-w-5xl w-full mx-auto px-4 -mt-6 z-20">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-1.5 shadow-xl border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1">
          <button
            onClick={() => setActiveTab('my_child')}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'my_child'
                ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white shadow-md'
                : (authenticatedChild 
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800')
            }`}
          >
            <QrCode className="w-4 h-4 shrink-0 text-amber-400" />
            <span className="truncate">{authenticatedChild ? `Кабінет: ${authenticatedChild.FULL_NAME.split(' ')[0]}` : 'Моя дитина (PIN)'}</span>
          </button>

          <button
            onClick={() => setActiveTab('menu')}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'menu'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Utensils className="w-4 h-4 shrink-0" />
            <span className="truncate">Меню та їжа</span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span className="truncate">Режим дня</span>
          </button>

          <button
            onClick={() => setActiveTab('safety')}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'safety'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="truncate">Укриття й безпека</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'services'
                ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calculator className="w-4 h-4 shrink-0" />
            <span className="truncate">Е-Заяви та сплата</span>
          </button>

          <button
            onClick={() => setActiveTab('advice')}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'advice'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span className="truncate">Поради фахівців</span>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'team'
                ? 'bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4 shrink-0" />
            <span className="truncate">Педагоги (28)</span>
          </button>

          <button
            onClick={() => setActiveTab('contacts')}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'contacts'
                ? 'bg-gradient-to-r from-slate-800 to-slate-950 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Phone className="w-4 h-4 shrink-0" />
            <span className="truncate">Контакти садка</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* ========================================================================= */}
        {/* TAB 0: MY CHILD PERSONAL CABINET (ЗАКРИТИЙ КАБІНЕТ ДИТИНИ ЗА PIN / QR) */}
        {/* ========================================================================= */}
        {activeTab === 'my_child' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {!authenticatedChild ? (
              /* LOGIN CARD WHEN NOT AUTHENTICATED */
              <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-indigo-100 dark:border-slate-800 shadow-xl space-y-6 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Lock className="w-8 h-8" />
                </div>
                
                <div className="space-y-2">
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Захищений доступ родин вихованців</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    Особистий кабінет моєї дитини
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    Введіть цифровий PIN-код з персональної картки вихованця (виданої вихователем або завідувачем) або відскануйте QR-код камерою телефону.
                  </p>
                </div>

                {/* PIN Input Form */}
                <form onSubmit={(e) => handleLoginWithPin(e)} className="max-w-md mx-auto space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={pinInput}
                      onChange={(e) => {
                        setPinInput(e.target.value);
                        if (authError) setAuthError(null);
                      }}
                      placeholder="Наприклад: 145-1011"
                      className="w-full text-center font-mono text-xl sm:text-2xl font-black tracking-widest px-4 py-3.5 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 transition uppercase shadow-inner"
                      autoFocus
                    />
                  </div>

                  {authError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/25 transition cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <span>Увійти в кабінет</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </form>

                {/* Quick Demo Selector for fast inspection */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Демонстраційні зразки карток (для швидкої перевірки):
                  </span>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleLoginWithPin(undefined, '145-1011')}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold transition border border-slate-200 dark:border-slate-700"
                    >
                      👦 Артем Іваненко (145-1011)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoginWithPin(undefined, '145-2022')}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 text-xs font-bold transition border border-slate-200 dark:border-slate-700"
                    >
                      👧 Софія Коваленко (145-2022, Безмолочна дієта)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoginWithPin(undefined, '145-3033')}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-bold transition border border-slate-200 dark:border-slate-700"
                    >
                      👦 Максим Шевченко (145-3033, Ясла / ВПО)
                    </button>
                  </div>
                </div>

                {/* Privacy Guarantee Box */}
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-left text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                  <div className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Принцип суворої ізоляції та приватності КЗДО №145</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Особистий кабінет відкриває доступ <b>виключно до даних вашої дитини</b>. Списки інших дітей закладу, їхні медичні записи чи телефони батьків надійно захищені та ніколи не відображаються у вашому сеансі.
                  </p>
                </div>
              </div>
            ) : (
              /* AUTHENTICATED CHILD DASHBOARD */
              <div className="space-y-6">
                {/* Child Header Card */}
                <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex items-center space-x-4 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner border border-white/30">
                      {authenticatedChild.GENDER === 'Жіноча' ? '👧' : '👦'}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200 bg-white/15 px-2.5 py-0.5 rounded-full">
                          Особистий кабінет вихованця
                        </span>
                        <span className="font-mono text-xs bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-black">
                          PIN {authenticatedChild.ACCESS_PIN || '145-....'}
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-3xl font-black">{authenticatedChild.FULL_NAME}</h2>
                      <div className="text-xs text-blue-100 flex flex-wrap items-center gap-3 font-medium">
                        <span>Група: <b className="text-white font-bold">{authenticatedChild.GROUP_NAME}</b></span>
                        <span>•</span>
                        <span>Народження: <b className="text-white font-mono">{authenticatedChild.BIRTH_DATE}</b></span>
                        <span>•</span>
                        <span>Пільга: <b className="text-amber-300 font-bold">{authenticatedChild.BENEFIT_CATEGORY || 'Загальна'}</b></span>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 flex items-center space-x-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={handleLogoutChild}
                      className="px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer backdrop-blur-xs"
                      title="Вийти з кабінету дитини"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Вийти</span>
                    </button>
                  </div>
                </div>

                {/* MAIN DASHBOARD TILES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* TILE 1: TODAY IN KINDERGARTEN & DIET MENU */}
                  <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
                        <Utensils className="w-4 h-4 text-amber-500" />
                        <span>Сьогоднішній раціон & Безпека</span>
                      </h3>
                      <span className="text-[11px] font-bold text-slate-500">
                        {new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    {/* Diet Notice Banner */}
                    <div className={`p-3.5 rounded-2xl border text-xs ${
                      childDossier?.dietInfo.hasDietRestrictions
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
                    }`}>
                      <div className="flex items-center space-x-2 font-bold mb-1">
                        {childDossier?.dietInfo.hasDietRestrictions ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        <span>{childDossier?.dietInfo.hasDietRestrictions ? 'Персональне дієтичне меню НАССР' : 'Стандартний збалансований раціон'}</span>
                      </div>
                      <p className="text-[11px] font-medium leading-relaxed">
                        {childDossier?.dietInfo.hasDietRestrictions
                          ? `Особливості харчування дитини: ${childDossier.dietInfo.dietNotes}. Кухня забезпечує належну кулінарну обробку та вилучення заборонених інгредієнтів.`
                          : 'Спеціальних алергічних протипоказань немає. Меню складено за сезонними нормами споживання (КМУ №305).'}
                      </p>
                    </div>

                    {/* Sample of Today's Meals */}
                    <div className="space-y-2 text-xs">
                      <div className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px]">
                        Основні прийоми їжі дитини сьогодні:
                      </div>
                      <div className="space-y-1.5">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                          <span className="font-semibold">🥣 Сніданок: Каша вівсяна з маслом / сезонні фрукти</span>
                          <span className="text-[10px] text-slate-500 font-mono">08:45</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                          <span className="font-semibold">🍲 Обід: Борщ український, тюфтельки курячі, пюре</span>
                          <span className="text-[10px] text-slate-500 font-mono">12:00</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                          <span className="font-semibold">🥛 Полуденок: Запіканка сирна з ягідним соусом, чай</span>
                          <span className="text-[10px] text-slate-500 font-mono">15:40</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab('menu')}
                      className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1"
                    >
                      <span>Переглянути повне розгорнуте меню на день</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* TILE 2: MEDICAL CARD & FORM 063/O */}
                  <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
                        <HeartPulse className="w-4 h-4 text-emerald-500" />
                        <span>Медичний паспорт & Щеплення (ф. 063/о)</span>
                      </h3>
                      <span className="text-[11px] font-bold text-emerald-600">
                        ✓ Медсестра: Суміна Н.Є.
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Група здоров'я</span>
                        <span className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                          {childDossier?.medicalCard?.HEALTH_GROUP || 'I (Здорові)'}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Фізкультура</span>
                        <span className="font-extrabold text-xs text-blue-600 dark:text-blue-400 mt-0.5 block">
                          {childDossier?.medicalCard?.PHYSICAL_GROUP || 'Основна'}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Меблі ДБН</span>
                        <span className="font-extrabold text-xs text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                          № {childDossier?.medicalCard?.DESK_FURNITURE_SIZE || '1 (85-100)'}
                        </span>
                      </div>
                    </div>

                    {/* Vaccinations summary */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Календар обов'язкових щеплень:</span>
                        <span className="text-[10px] text-emerald-600 font-bold">
                          {childDossier?.vaccinations.length || 0} зафіксовано
                        </span>
                      </div>

                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
                        {(childDossier?.vaccinations && childDossier.vaccinations.length > 0) ? (
                          childDossier.vaccinations.map(v => (
                            <div key={v.ID} className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-800 dark:text-slate-200">{v.VACCINE_TYPE} ({v.DOSE_STAGE})</span>
                              <span className="font-mono text-slate-500">{v.ADMINISTERED_DATE}</span>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center text-slate-400 text-xs">
                            Карту щеплень ф. 063/о актуалізовано за віком вихованця
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* TILE 3: LOGOPED HOME WORKOUTS */}
                  <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
                        <Volume2 className="w-4 h-4 text-rose-500" />
                        <span>Логопедичні вправи для дому</span>
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded-full font-bold">
                        {childDossier?.speechCard?.DIAGNOSIS || 'Мовлення в нормі'}
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      {childDossier?.speechCard ? (
                        <>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                              Звуки, над якими дитина працює з логопедом:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {childDossier.speechCard.SOUND_STATUSES.map(s => (
                                <span key={s.sound} className="px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 font-bold flex items-center space-x-1 text-xs">
                                  <span className="font-mono font-black">{s.sound}</span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400">• {s.stage}</span>
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900 text-[11px] space-y-1">
                            <span className="font-bold text-rose-900 dark:text-rose-200 block">Порада логопеда батькам:</span>
                            <p className="text-slate-700 dark:text-slate-300">
                              {childDossier.speechCard.LOGOPED_CONCLUSION || 'Виконуйте артикуляційну гімнастику щодня по 5–7 хвилин перед дзеркалом.'}
                            </p>
                          </div>
                        </>
                      ) : (
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-xs">
                          У дитини вікова норма звуковимови. Для підтримки чіткої дикції рекомендуємо веселі чистомовки та дихальні вправи.
                        </p>
                      )}

                      <button
                        onClick={() => setActiveTab('advice')}
                        className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-rose-500" />
                        <span>Відкрити ігровий тренажер артикуляції</span>
                      </button>
                    </div>
                  </div>

                  {/* TILE 4: PSYCHOLOGY & SHELTER COMFORT */}
                  <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
                        <Brain className="w-4 h-4 text-purple-500" />
                        <span>Психолог & Безпека в укритті</span>
                      </h3>
                      <span className="text-[10px] text-purple-600 font-bold">вул. Перлинна 23А</span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="p-3 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 text-[11px] space-y-1">
                        <span className="font-bold text-purple-900 dark:text-purple-200 block">Адаптація та емоційний стан:</span>
                        <p className="text-slate-700 dark:text-slate-300">
                          {authenticatedChild.PSYCHOLOGY_NOTES || 'Адаптація в групі проходить позитивно. Дитина легко залучається до спільних ігор та занять.'}
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-[11px] space-y-1">
                        <span className="font-bold text-blue-900 dark:text-blue-200 block">Перебування в укритті під час сирен:</span>
                        <p className="text-slate-700 dark:text-slate-300">
                          {childDossier?.psychologySpecialSupport?.SHELTER_BEHAVIOR || 'Дитина спокійно спускається в обладнане укриття закладу разом із вихователем, бавиться з іграшками або слухає казки.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* TILE 5: PAYMENT CALCULATION & BENEFIT */}
                  <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
                        <Calculator className="w-4 h-4 text-blue-500" />
                        <span>Батьківська плата за харчування</span>
                      </h3>
                      <span className="text-[10px] font-bold text-blue-600 uppercase">
                        {childDossier?.dietInfo.categoryName}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400">Базова вартість дня харчування:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{childDossier?.dietInfo.standardDailyRate.toFixed(2)} грн</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400">Пільгова категорія:</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{childDossier?.dietInfo.benefitCategory}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400">Відсоток оплати батьками:</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{childDossier?.dietInfo.parentPaymentSharePercent}%</span>
                      </div>
                      <div className="pt-2 border-t border-blue-200 dark:border-blue-800 flex justify-between items-center text-sm">
                        <span className="font-extrabold text-slate-900 dark:text-white">Орієнтовно до сплати за місяць:</span>
                        <span className="font-mono font-black text-blue-700 dark:text-blue-300 text-base">
                          {((childDossier?.dietInfo.standardDailyRate || 65) * (childDossier?.dietInfo.parentPaymentSharePercent || 100) / 100 * (childDossier?.attendanceStats.presentDays || 18)).toFixed(2)} грн
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* TILE 6: QUICK ACTIONS (ABSENCE / VACATION) */}
                  <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Швидкі дії без дзвінків</span>
                      </h3>
                    </div>

                    <div className="space-y-2 text-xs">
                      <button
                        onClick={() => {
                          setAbsenceChild(authenticatedChild.FULL_NAME);
                          setAbsenceGroup(authenticatedChild.GROUP_NAME);
                          setActiveTab('services');
                        }}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold transition flex items-center justify-between cursor-pointer shadow-sm"
                      >
                        <span>Повідомити про відсутність / хворобу дитини</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          setChildName(authenticatedChild.FULL_NAME);
                          setSelectedGroup(authenticatedChild.GROUP_NAME);
                          setParentName(authenticatedChild.MOTHER_NAME || authenticatedChild.PARENT_NAME || '');
                          setParentPhone(authenticatedChild.MOTHER_PHONE || authenticatedChild.PARENT_PHONE || '');
                          setActiveTab('services');
                        }}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold transition flex items-center justify-between cursor-pointer shadow-sm"
                      >
                        <span>Сформувати заяву на збереження місця / відпустку</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: MENU & NUTRITION */}
        {/* ========================================================================= */}
        {activeTab === 'menu' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header with Date Navigation */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                  <Utensils className="w-5 h-5 text-amber-500" />
                  <span>Щоденне меню харчоблоку ЗДО №145</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Відповідність Постанові КМУ № 305 • Затверджено сестрою медичною старшою
                </p>
              </div>

              {/* Date controls */}
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
                <button
                  onClick={() => handleShiftDate(-1)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
                  title="Попередній день"
                >
                  ◀ Вчора
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold font-mono text-slate-800 dark:text-white shadow-xs focus:ring-2 focus:ring-amber-500"
                />
                <button
                  onClick={() => handleShiftDate(1)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
                  title="Наступний день"
                >
                  Завтра ▶
                </button>
                <button
                  onClick={handleResetToToday}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 text-xs font-bold hover:bg-amber-500/20 transition"
                  title="Сьогоднішнє меню"
                >
                  Сьогодні
                </button>
              </div>
            </div>

            {/* Meal Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {[
                { name: 'Сніданок', time: '08:45 – 09:15', color: 'bg-amber-500', border: 'border-amber-300/80 dark:border-amber-600/40' },
                { name: '2-й сніданок', time: '10:30 – 10:45', color: 'bg-emerald-500', border: 'border-emerald-300/80 dark:border-emerald-600/40' },
                { name: 'Обід', time: '12:00 – 12:45', color: 'bg-rose-500', border: 'border-rose-300/80 dark:border-rose-600/40' },
                { name: 'Полуденок', time: '15:30 – 16:00', color: 'bg-purple-500', border: 'border-purple-300/80 dark:border-purple-600/40' }
              ].map(mealConfig => {
                const mealDishes = mealsGrouped.get(mealConfig.name) || [];

                return (
                  <div 
                    key={mealConfig.name}
                    className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border ${mealConfig.border} shadow-sm flex flex-col justify-between space-y-4`}
                  >
                    <div>
                      {/* Header of meal */}
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${mealConfig.color}`} />
                          <h4 className="font-black text-sm text-slate-900 dark:text-white">
                            {mealConfig.name}
                          </h4>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                          {mealConfig.time}
                        </span>
                      </div>

                      {/* Dishes List */}
                      {mealDishes.length === 0 ? (
                        <div className="text-xs text-slate-400 py-6 text-center italic">
                          {mealConfig.name === '2-й сніданок' 
                            ? 'Свіжі сезонні фрукти (яблука, банани) або натуральний сік' 
                            : 'Меню формується черговою зміною кухарів та медичною сестрою'}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {mealDishes.map((d, idx) => (
                            <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                  {d.dishName}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 px-1.5 py-0.5 rounded-md" title="Вихід для ясельної групи">
                                    Ясла: {d.yieldNursery}
                                  </span>
                                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 px-1.5 py-0.5 rounded-md" title="Вихід для дошкільної групи">
                                    Садок: {d.yieldGarden}
                                  </span>
                                </div>
                              </div>

                              {/* Calories and macros */}
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                                {d.calories ? <span>Калорійність: <strong className="text-slate-700 dark:text-slate-200">{d.calories} ккал</strong></span> : null}
                                {d.belki ? <span>Б: {d.belki}г</span> : null}
                                {d.ziri ? <span>Ж: {d.ziri}г</span> : null}
                                {d.uglevodi ? <span>В: {d.uglevodi}г</span> : null}
                              </div>

                              {/* Allergens warning */}
                              {d.allergens && (
                                <div className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1 pt-0.5">
                                  <AlertTriangle className="w-3 h-3 shrink-0" />
                                  <span>Алергени: {d.allergens}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span>Приготовано на харчоблоці ЗДО</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Бракераж пройдено
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Special Diets Notification */}
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start space-x-3 text-xs text-blue-900 dark:text-blue-200">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed">
                <p className="font-bold">Індивідуальні дієтичні потреби та заміна страв:</p>
                <p>
                  Для дітей з лактозною недостатністю, алергією на глютен чи цитрусові здійснюється щоденна заміна страв згідно з медичною довідкою ЛКК або педіатра. Будь ласка, своєчасно передавайте оновлені медичні довідки сестрі медичній старшій.
                </p>
              </div>
            </div>

            {/* Parent Feedback & Rating for Today's Food */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Оцінка раціону харчування батьками</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Як ваша дитина оцінює сьогоднішні страви? Ваша думка допомагає нам удосконалювати смак та презентацію страв.
              </p>

              {ratingSubmitted ? (
                <div className="p-3.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Щиро дякуємо за оцінку! Ваші побажання передано шеф-кухарю закладу.</span>
                </div>
              ) : (
                <form onSubmit={handleSaveMenuRating} className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Ваша оцінка:</span>
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setMenuRating(star)}
                          className="p-1 text-slate-300 hover:text-amber-400 transition cursor-pointer"
                        >
                          <Star className={`w-6 h-6 ${star <= menuRating ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-700'}`} />
                        </button>
                      ))}
                    </div>
                    {menuRating > 0 && (
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 ml-2">
                        {menuRating === 5 ? 'Відмінно! Дитині дуже подобається' :
                         menuRating === 4 ? 'Добре, їсть із задоволенням' :
                         menuRating === 3 ? 'Задовільно, є зауваження' : 'Потребує вдосконалення'}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ratingComment}
                      onChange={e => setRatingComment(e.target.value)}
                      placeholder="Коментар або улюблена страва дитини (необов'язково)..."
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={menuRating === 0}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                    >
                      Надіслати
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: DAILY SCHEDULE & ROUTINE */}
        {/* ========================================================================= */}
        {activeTab === 'schedule' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Realtime Stage Indicator Card */}
            {currentStage && (
              <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shrink-0 shadow-inner">
                  {currentStage.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-white text-rose-600 text-[10px] font-black uppercase tracking-wider">
                      Зараз у садочку
                    </span>
                    <span className="text-xs font-bold text-amber-100 font-mono">
                      {currentStage.timeRange}
                    </span>
                  </div>
                  <h4 className="text-base font-black mt-1">
                    {currentStage.title}
                  </h4>
                  <p className="text-xs text-amber-100/90 mt-0.5">
                    {currentStage.description}
                  </p>
                </div>
              </div>
            )}

            {/* Age Category Selector */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Оберіть вікову групу для перегляду розкладу:
              </span>
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <button
                  onClick={() => setRoutineAgeCategory('nursery')}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    routineAgeCategory === 'nursery'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  👶 Ясла (1.5 – 3 роки)
                </button>
                <button
                  onClick={() => setRoutineAgeCategory('middle')}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    routineAgeCategory === 'middle'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  🧒 Молодша / Середня (3 – 5 р.)
                </button>
                <button
                  onClick={() => setRoutineAgeCategory('senior')}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    routineAgeCategory === 'senior'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  🎒 Старша (5 – 6(7) років)
                </button>
              </div>
            </div>

            {/* Stages Timetable */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Clock className="w-5 h-5 text-rose-500" />
                <span>
                  Режим життєдіяльності вихованців ({
                    routineAgeCategory === 'nursery' ? 'Ранній вік / Ясла' :
                    routineAgeCategory === 'middle' ? 'Дошкільний вік / 3–5 років' : 'Підготовка до школи / 5–6(7) років'
                  })
                </span>
              </h3>

              <div className="space-y-3">
                {ROUTINE_STAGES.map((stage) => {
                  const isCurrent = currentStage?.id === stage.id;

                  return (
                    <div 
                      key={stage.id} 
                      className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        isCurrent 
                          ? 'border-amber-400 bg-amber-500/10 shadow-md' 
                          : 'border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl shrink-0 mt-0.5">{stage.icon}</span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {stage.title}
                            </span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider animate-pulse">
                                Зараз
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {stage.description}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 px-2.5 py-1 rounded-xl text-xs shrink-0 shadow-xs">
                        {stage.timeRange}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weekly Activity Grid */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Calendar className="w-5 h-5 text-indigo-500" />
                <span>Тижнева сітка розвивальних занять ЗДО №145</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                {[
                  { day: 'Понеділок', tag: 'Рух і музика', items: ['Музичне виховання', 'Фізична культура на свіжому повітрі', 'Ранкове коло емоцій'] },
                  { day: 'Вівторок', tag: 'Логіка і мова', items: ['Розвиток мовлення і грамота', 'Сенсорно-пізнавальний розвиток', 'Малювання'] },
                  { day: 'Середа', tag: 'Наука і простір', items: ['Логіко-математичний розвиток', 'Конструювання та лего-клуб', 'Фізкультура в залі'] },
                  { day: 'Четвер', tag: 'Природа і світ', items: ['Ознайомлення з довкіллям та природою', 'Музична казка / ритміка', 'Безпека життєдіяльності'] },
                  { day: 'П\'ятниця', tag: 'Творчість і театр', items: ['Ліплення / Аплікація', 'Театралізована діяльність', 'Психологічні тренінги дружби'] }
                ].map(col => (
                  <div key={col.day} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white block">
                        {col.day}
                      </span>
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                        {col.tag}
                      </span>
                      <ul className="mt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                        {col.items.map((it, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-indigo-500">•</span>
                            <span>{it}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SAFETY & SHELTER */}
        {/* ========================================================================= */}
        {activeTab === 'safety' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Shelter Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-950 text-white shadow-xl space-y-3 relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl" />
              <div className="flex items-center space-x-2 text-xs font-bold text-blue-300 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>Безпека та цивільний захист</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black">
                Найпростіше укриття Криворізького КЗДО КТ №145 КМР
              </h3>
              <p className="text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed">
                Заклад за адресою <strong>м. Кривий Ріг, вул. Перлинна 23А</strong> забезпечений сертифікованим захисним укриттям, перевіреним державною комісією ДСНС України та міською владою.
              </p>
            </div>

            {/* Protocol Steps During Siren */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>Чіткий алгоритм дій персоналу при сигналі «Повітряна тривога»</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-2">
                  <span className="w-7 h-7 rounded-xl bg-amber-500 text-white font-black flex items-center justify-center">1</span>
                  <h4 className="font-black text-slate-900 dark:text-white">Миттєве реагування (1–2 хв)</h4>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Звучить сигнал сирени або внутрішній голосовий сигнал. Педагог зупиняє заняття, діти взуваються, беруть тривожні рюкзачки.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-2">
                  <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center">2</span>
                  <h4 className="font-black text-slate-900 dark:text-white">Організований спуск (3–5 хв)</h4>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Вихователь і помічник вихователя парами супроводжують групу через призначений евакуаційний вихід у сховище. Медсестра бере аптечку.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-2">
                  <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center">3</span>
                  <h4 className="font-black text-slate-900 dark:text-white">Перебування в укритті</h4>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Поіменна звірка дітей за журналом присутності. Проведення спокійних ігор, читання, перекус, психологічне розвантаження.
                  </p>
                </div>
              </div>
            </div>

            {/* Shelter Provision Cards */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Чим повністю забезпечене укриття садка №145:</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-xl">💧</span>
                  <span className="font-bold text-slate-900 dark:text-white block">Водний баланс</span>
                  <span className="text-slate-500 text-[11px]">Запас бутильованої питної та технічної води на 48+ годин</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-xl">💡</span>
                  <span className="font-bold text-slate-900 dark:text-white block">Світло й повітря</span>
                  <span className="text-slate-500 text-[11px]">Примусова вентиляція, генератор, ліхтарі та акумуляторні лампи</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-xl">💊</span>
                  <span className="font-bold text-slate-900 dark:text-white block">Медпункт</span>
                  <span className="text-slate-500 text-[11px]">Укомплектована аптечка, засоби першої допомоги, постійний нагляд медсестри</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-xl">🧸</span>
                  <span className="font-bold text-slate-900 dark:text-white block">Ігровий простір</span>
                  <span className="text-slate-500 text-[11px]">Індивідуальні пледи, каремати, розмальовки, книжки, іграшки</span>
                </div>
              </div>
            </div>

            {/* Crucial Instructions for Parents */}
            <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 space-y-3 text-xs text-amber-950 dark:text-amber-200">
              <h4 className="font-black text-sm text-amber-900 dark:text-amber-300 flex items-center space-x-2">
                <Info className="w-4 h-4 text-amber-600" />
                <span>Правила для батьків під час повітряної тривоги:</span>
              </h4>
              <ul className="space-y-1.5 list-disc list-inside leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                <li><strong>Не біжіть до садка під час активної тривоги:</strong> перебуваючи на відкритій вулиці чи в авто, ви наражаєте на небезпеку себе. Діти в цей час уже перебувають у безпечному залізобетонному сховищі.</li>
                <li><strong>Якщо ви прибули до садка під час тривоги:</strong> спускайтесь одразу в найпростіше укриття за вказівниками.</li>
                <li><strong>Передача дитини під час сирени:</strong> дитина видається батькам безпосередньо в укритті під особистий розпис у журналі передачі, відповідальність за подальше переміщення бере на себе родина.</li>
              </ul>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: E-SERVICES, APPLICATIONS & FEE CALCULATOR */}
        {/* ========================================================================= */}
        {activeTab === 'services' && (
          <div className="space-y-6 animate-in fade-in duration-200">

            {/* SECTION 1: VACATION APPLICATION GENERATOR */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                  Електронний документообіг
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2 mt-0.5">
                  <FileText className="w-5 h-5 text-purple-500" />
                  <span>Генератор заяви на відпустку / оздоровлення зі збереженням місця</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Заповніть форму, і система автоматично сформує юридично правильну офіційну заяву на ім'я директора Павлухіної Н.Г. з можливістю роздрукувати бланк формату А4.
                </p>
              </div>

              <form onSubmit={handleGenerateApplication} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    ПІБ батька / матері (заявника) *
                  </label>
                  <input
                    type="text"
                    required
                    value={parentName}
                    onChange={e => setParentName(e.target.value)}
                    placeholder="наприклад: Коваленко Марина Олексіївна"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Контактний телефон *
                  </label>
                  <input
                    type="tel"
                    required
                    value={parentPhone}
                    onChange={e => setParentPhone(e.target.value)}
                    placeholder="+38 (067) 123-45-67"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    ПІБ дитини *
                  </label>
                  <input
                    type="text"
                    required
                    value={childName}
                    onChange={e => setChildName(e.target.value)}
                    placeholder="наприклад: Коваленко Данило Олександрович"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Група закладу *
                  </label>
                  <select
                    value={selectedGroup}
                    onChange={e => setSelectedGroup(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">-- Оберіть групу садка --</option>
                    {groups.map(g => (
                      <option key={g.ID} value={g.NAME}>
                        {g.NAME} ({g.AGE_CATEGORY})
                      </option>
                    ))}
                    {groups.length === 0 && (
                      <>
                        <option value="Група «Сонечко» (Ясла)">Група «Сонечко» (Ясла)</option>
                        <option value="Група «Калинка» (Молодша)">Група «Калинка» (Молодша)</option>
                        <option value="Група «Бджілка» (Середня)">Група «Бджілка» (Середня)</option>
                        <option value="Група «Веселка» (Старша)">Група «Веселка» (Старша)</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Період відпустки з *
                  </label>
                  <input
                    type="date"
                    required
                    value={vacationFrom}
                    onChange={e => setVacationFrom(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Період відпустки по *
                  </label>
                  <input
                    type="date"
                    required
                    value={vacationTo}
                    onChange={e => setVacationTo(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Причина збереження місця *
                  </label>
                  <select
                    value={vacationReason}
                    onChange={e => setVacationReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="оздоровчий період дитини влітку">Літній оздоровчий період (до 75 днів згідно зі статутом)</option>
                    <option value="щорічна відпустка батьків">Щорічна відпустка батьків</option>
                    <option value="санаторно-курортне лікування дитини">Санаторно-курортне лікування дитини за рекомендацією лікаря</option>
                    <option value="сімейні обставини за заявою батьків">Сімейні обставини</option>
                  </select>
                </div>

                <div className="sm:col-span-2 pt-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Згенерувати офіційний бланк заяви А4</span>
                  </button>
                </div>
              </form>
            </div>

            {/* SECTION 2: QUICK ABSENCE REPORT TO THE NURSE */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                  Оперативне табелювання харчування
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2 mt-0.5">
                  <FileCheck className="w-5 h-5 text-rose-500" />
                  <span>Швидке сповіщення: «Дитина сьогодні буде відсутня»</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Повідомте вихователя та старшу медсестру до <strong>08:30 ранку</strong>. Це гарантує, що на дитину не списуватимуться зайві порції продуктів у щоденній меню-вимозі.
                </p>
              </div>

              {absenceSubmitted ? (
                <div className="p-4 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Дякуємо! Сповіщення зафіксовано в системі та передано сестрі медичній старшій для щоденного табеля.</span>
                </div>
              ) : (
                <form onSubmit={handleSubmitAbsence} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Прізвище та ім'я дитини *
                    </label>
                    <input
                      type="text"
                      required
                      value={absenceChild}
                      onChange={e => setAbsenceChild(e.target.value)}
                      placeholder="Мельник Софія"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Група дитини *
                    </label>
                    <input
                      type="text"
                      required
                      value={absenceGroup}
                      onChange={e => setAbsenceGroup(e.target.value)}
                      placeholder="Група «Калинка»"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Дата відсутності
                    </label>
                    <input
                      type="date"
                      value={absenceDate}
                      onChange={e => setAbsenceDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Причина відсутності
                    </label>
                    <select
                      value={absenceReason}
                      onChange={e => setAbsenceReason(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
                    >
                      <option value="illness">Хвороба (буде довідка лікаря)</option>
                      <option value="family">Сімейні обставини (1-2 дні)</option>
                      <option value="sanatorium">Санаторій / Оздоровлення</option>
                      <option value="other">Інша поважна причина</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Хто сповіщає
                    </label>
                    <input
                      type="text"
                      value={absenceReportedBy}
                      onChange={e => setAbsenceReportedBy(e.target.value)}
                      placeholder="Мама / Тато"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Коментар (необов'язково)
                    </label>
                    <input
                      type="text"
                      value={absenceComment}
                      onChange={e => setAbsenceComment(e.target.value)}
                      placeholder="Температура / Поїхали до бабусі..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-3 pt-1">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-xs cursor-pointer flex items-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Надіслати повідомлення вихователю та медсестрі</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* SECTION 3: PARENTAL FOOD FEE CALCULATOR */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                  Фінансова прозорість та норми Кривого Рогу
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2 mt-0.5">
                  <Calculator className="w-5 h-5 text-indigo-500" />
                  <span>Калькулятор батьківської плати за харчування</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Плата нараховується <strong>виключно за фактичні дні відвідування</strong> дитиною садка з урахуванням затверджених міською радою пільг.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Inputs */}
                <div className="md:col-span-2 space-y-4 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-bold text-slate-700 dark:text-slate-300">
                        Фактична кількість днів відвідування за місяць:
                      </label>
                      <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400 text-sm">
                        {calcDays} {calcDays === 1 ? 'день' : calcDays < 5 ? 'дні' : 'днів'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={23}
                      value={calcDays}
                      onChange={e => setCalcDays(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                      <span>0 днів</span>
                      <span>10 днів</span>
                      <span>20 днів</span>
                      <span>23 дні (повний місяць)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Вікова група закладу:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCalcAgeGroup('nursery')}
                          className={`p-2.5 rounded-xl border text-center font-bold transition cursor-pointer ${
                            calcAgeGroup === 'nursery'
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <Baby className="w-4 h-4 mx-auto mb-0.5" />
                          <span>Ясла (45.00 ₴/день)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCalcAgeGroup('kindergarten')}
                          className={`p-2.5 rounded-xl border text-center font-bold transition cursor-pointer ${
                            calcAgeGroup === 'kindergarten'
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <Smile className="w-4 h-4 mx-auto mb-0.5" />
                          <span>Садок (65.00 ₴/день)</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Пільгова категорія родини:
                      </label>
                      <select
                        value={calcBenefit}
                        onChange={e => setCalcBenefit(e.target.value as any)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
                      >
                        <option value="none">Повна оплата (без пільг) — 0%</option>
                        <option value="large_family_50">Багатодітна родина (3+ дітей) — знижка 50%</option>
                        <option value="full_100_vpo_ubd">ВПО / Діти захисників УБД / Малозабезпечені — 100% безкоштовно</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Calculation Summary Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-indigo-950/50 border border-indigo-200 dark:border-indigo-900/60 flex flex-col justify-between space-y-3">
                  <div className="space-y-2 text-xs">
                    <span className="font-bold text-indigo-900 dark:text-indigo-200 block uppercase tracking-wider text-[11px]">
                      Розрахунок до сплати
                    </span>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Тариф за 1 діто-день:</span>
                      <strong className="font-mono">{paymentDetails.dailyRate.toFixed(2)} ₴</strong>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Нараховано за {calcDays} днів:</span>
                      <strong className="font-mono">{paymentDetails.rawTotal.toFixed(2)} ₴</strong>
                    </div>
                    {paymentDetails.discountPercent > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                        <span>Пільгова знижка ({paymentDetails.discountPercent}%):</span>
                        <strong className="font-mono">- {paymentDetails.discountAmount.toFixed(2)} ₴</strong>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-indigo-200 dark:border-indigo-800/80">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">
                      Підсумкова сума до сплати:
                    </span>
                    <div className="text-2xl font-black text-indigo-900 dark:text-white font-mono">
                      {paymentDetails.finalTotal.toFixed(2)} ₴
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Оплата здійснюється за квитанцією через банк або інтернет-банкінг до 10 числа кожного місяця.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: EXPERT ADVICE (PSYCHOLOGIST & NURSE MEMOS) */}
        {/* ========================================================================= */}
        {activeTab === 'advice' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                  <span>Банк порад та пам'яток психолога і медсестри</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Офіційні методичні рекомендації фахівців Криворізького КЗДО КТ №145 КМР
                </p>
              </div>

              {/* Filter */}
              <div className="flex items-center gap-1.5 text-xs flex-wrap">
                <button
                  onClick={() => setMemoCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    memoCategoryFilter === 'all'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Всі ({memos.length})
                </button>
                <button
                  onClick={() => setMemoCategoryFilter('Батькам')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    memoCategoryFilter === 'Батькам'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Батькам
                </button>
                <button
                  onClick={() => setMemoCategoryFilter('Адаптація')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    memoCategoryFilter === 'Адаптація'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Адаптація
                </button>
                <button
                  onClick={() => setMemoCategoryFilter('Безпека і тривожність')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    memoCategoryFilter === 'Безпека і тривожність'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Тривожність
                </button>
                <button
                  onClick={() => setMemoCategoryFilter('Логопед')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center space-x-1 ${
                    memoCategoryFilter === 'Логопед'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Логопед ({speechExercises.length})</span>
                </button>
              </div>
            </div>

            {/* If Logoped filter selected: Speech Therapy exercises grid */}
            {memoCategoryFilter === 'Логопед' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {speechExercises.map(ex => (
                  <div
                    key={ex.id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-teal-400/80 transition flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-bold text-[10px]">
                          {ex.category === 'lips' ? 'Вправа для губ'
                            : ex.category === 'tongue' ? 'Вправа для язика'
                            : ex.category === 'breathing' ? 'Дихальна гімнастика'
                            : 'Чистомовка'}
                        </span>
                        <div className="flex items-center gap-1">
                          {ex.targetSounds.map(snd => (
                            <span key={snd} className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-bold text-[10px]">
                              [{snd}]
                            </span>
                          ))}
                        </div>
                      </div>

                      <h4 className="font-black text-sm text-slate-900 dark:text-white leading-snug">
                        {ex.title}
                      </h4>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {ex.description}
                      </p>

                      <div className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold bg-teal-50 dark:bg-teal-950/40 p-2 rounded-xl border border-teal-100 dark:border-teal-800/40">
                        Режим: {ex.repetition}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Логопедична служба</span>
                      <button
                        onClick={() => setSelectedExercise(ex)}
                        className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Інструкція та друк</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Memos Cards Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMemos.map(memo => (
                  <div
                    key={memo.id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-400/80 transition flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                          {memo.targetAudience}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {memo.category}
                        </span>
                      </div>

                      <h4 className="font-black text-sm text-slate-900 dark:text-white leading-snug">
                        {memo.title}
                      </h4>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                        {memo.summary}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Психологічна служба</span>
                      <button
                        onClick={() => setSelectedMemo(memo)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Читати повністю</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Health & Medical Nurse Guidelines */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Heart className="w-5 h-5 text-rose-500" />
                <span>Медичний довідник: здоров'я дитини в садочку</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-slate-800/60 border border-rose-100 dark:border-slate-700 space-y-2">
                  <h4 className="font-black text-rose-800 dark:text-rose-300">Календар щеплень (Форма 063/о)</h4>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Згідно зі ст. 15 Закону України «Про захист населення від інфекційних хвороб», діти допускаються до закладу за наявності обов'язкових профілактичних щеплень (БЦЖ, КПК, АКДП, поліомієліт, ХІБ, гепатит B).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-slate-800/60 border border-amber-100 dark:border-slate-700 space-y-2">
                  <h4 className="font-black text-amber-800 dark:text-amber-300">Ранковий огляд (фільтр)</h4>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Щоранку медична сестра проводить термометрію та візуальний огляд. При температурі ≥ 37.2°C, нежиті, висипу або кашлі дитина ізолюється до приходу батьків для запобігання інфікування групи.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-slate-800/60 border border-emerald-100 dark:border-slate-700 space-y-2">
                  <h4 className="font-black text-emerald-800 dark:text-emerald-300">Повернення після хвороби</h4>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Після відсутності більше 3 робочих днів через хворобу допуск здійснюється виключно за наявності офіційної довідки сімейного лікаря-педіатра про одужання та епідемічне оточення.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: PEDAGOGICAL COLLECTIVE (ПЕДАГОГІЧНИЙ КОЛЕКТИВ ЗДО №145) */}
        {/* ========================================================================= */}
        {activeTab === 'team' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* HERO CARD & STATS */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-cyan-500/10 border border-teal-200/80 dark:border-teal-900/40 shadow-sm space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-lg shrink-0">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 text-[10px] font-black uppercase tracking-wider mb-1">
                      <Sparkles className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                      <span>Офіційний кадровий реєстр КЗДО №145 «Перлинка»</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                      Педагогічний колектив закладу
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
                      Команда з 28 кваліфікованих вихователів, психологів, дефектологів, логопедів та музичних керівників, об’єднаних любов’ю до дітей та високими стандартами сучасної дошкільної освіти.
                    </p>
                  </div>
                </div>

                <a
                  href="https://zdo145perlinka.wixsite.com/my-site/педагогічний-колектив"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="self-start md:self-center px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700 hover:bg-teal-50 text-xs font-bold transition shadow-xs flex items-center space-x-2 cursor-pointer"
                >
                  <span>Оригінал сайту ЗДО</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* QUICK STATS CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-teal-100 dark:border-slate-800 shadow-xs">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Всього педагогів</div>
                  <div className="text-2xl font-black text-teal-700 dark:text-teal-400 mt-0.5">{staffStats.total}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Вихователі та фахівці</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 shadow-xs">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Вища та І категорія</div>
                  <div className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-0.5">{staffStats.higherCategory}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Високий рівень атестації</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-800 shadow-xs">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Середній стаж</div>
                  <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-0.5">{staffStats.avgExp} р.</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Багаторічний практичний досвід</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-slate-800 shadow-xs">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Спеціалісти</div>
                  <div className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-0.5">{staffStats.specialistsCount}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Логопеди, психологи, дефектологи</div>
                </div>
              </div>
            </div>

            {/* TOOLBAR: DEPT TABS + SEARCH INPUT */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Department filter pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-bold scrollbar-none">
                  <button
                    onClick={() => setSelectedDeptFilter('all')}
                    className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
                      selectedDeptFilter === 'all'
                        ? 'bg-slate-900 text-white dark:bg-teal-500 dark:text-slate-950 shadow-xs font-black'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Всі фахівці ({staffStats.total})
                  </button>
                  {PEDAGOGICAL_DEPARTMENTS.map(dept => (
                    <button
                      key={dept.key}
                      onClick={() => setSelectedDeptFilter(dept.key)}
                      className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
                        selectedDeptFilter === dept.key
                          ? 'bg-teal-600 text-white shadow-xs font-black'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {dept.key === 'administration' && '🏛️ '}
                      {dept.key === 'specialists' && '🧠 '}
                      {dept.key === 'special_groups' && '🌟 '}
                      {dept.key === 'general_groups' && '🌿 '}
                      {dept.key === 'administration' ? 'Адміністрація (2)' :
                       dept.key === 'specialists' ? 'Спеціалісти (11)' :
                       dept.key === 'special_groups' ? 'Вихователі спецгруп (9)' :
                       'Вихователі загальних (6)'}
                    </button>
                  ))}
                </div>

                {/* Live Search input */}
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={staffSearchQuery}
                    onChange={(e) => setStaffSearchQuery(e.target.value)}
                    placeholder="Пошук за прізвищем, посадою, кредо..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                  />
                  {staffSearchQuery && (
                    <button
                      onClick={() => setStaffSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between px-1">
                <span>Відображається: <strong className="text-slate-700 dark:text-slate-200">{filteredStaffList.length}</strong> з 28 педагогів</span>
                {staffSearchQuery && (
                  <span>Фільтр за запитом: «{staffSearchQuery}»</span>
                )}
              </div>
            </div>

            {/* STAFF GRID */}
            {filteredStaffList.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                <Users className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Педагогів за вашим запитом не знайдено</h3>
                <p className="text-xs text-slate-500">Спробуйте змінити фільтр підрозділу або очистити пошуковий рядок.</p>
                <button
                  onClick={() => { setStaffSearchQuery(''); setSelectedDeptFilter('all'); }}
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 cursor-pointer transition"
                >
                  Скинути фільтри
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredStaffList.map((member) => (
                  <div
                    key={member.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
                  >
                    <div className="space-y-3.5">
                      {/* Top info: Avatar + Badges */}
                      <div className="flex items-start space-x-3.5">
                        <div className="relative shrink-0">
                          <img
                            src={member.photoUrl}
                            alt={member.fullName}
                            className="w-20 h-24 sm:w-22 sm:h-28 rounded-2xl object-cover border-2 border-slate-100 dark:border-slate-700 shadow-md group-hover:scale-102 transition-transform duration-200 bg-slate-100 dark:bg-slate-800"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLElement).style.opacity = '0.7';
                            }}
                          />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-xs text-[10px] font-black">
                            ✓
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          {/* Department Badge */}
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            member.department === 'administration'
                              ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800'
                              : member.department === 'specialists'
                              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
                              : member.department === 'special_groups'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                          }`}>
                            {member.department === 'administration' ? 'Адміністрація' :
                             member.department === 'specialists' ? 'Спеціаліст' :
                             member.department === 'special_groups' ? 'Спецгрупа' :
                             'Загальна група'}
                          </span>

                          <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                            {member.fullName}
                          </h3>

                          <div className="text-xs font-bold text-teal-700 dark:text-teal-400 flex items-center space-x-1">
                            <Briefcase className="w-3.5 h-3.5 shrink-0 text-teal-600" />
                            <span className="truncate">{member.position}</span>
                          </div>

                          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>Стаж: {member.experience}</span>
                          </div>
                        </div>
                      </div>

                      {/* Badges: Category & Rank */}
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 flex items-center space-x-1">
                          <Award className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>{member.qualificationCategory}</span>
                        </span>
                        {member.pedagogicalRank && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800 flex items-center space-x-1">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />
                            <span>{member.pedagogicalRank}</span>
                          </span>
                        )}
                      </div>

                      {/* Education snippet */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                        <span className="font-bold text-slate-700 dark:text-slate-200 block text-[10px] uppercase tracking-wider mb-0.5">Освіта:</span>
                        <span className="line-clamp-2">{member.education}</span>
                      </div>

                      {/* Inspiring Credo */}
                      <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 relative text-[11px] italic text-amber-950 dark:text-amber-200 leading-relaxed">
                        <Quote className="w-3 h-3 text-amber-500 absolute -top-1.5 -left-1.5 bg-white dark:bg-slate-900 rounded-full p-0.5 border border-amber-300" />
                        "{member.credo.replace(/^[«"'\s]+|[»"'\s]+$/g, '')}"
                      </div>

                      {/* Methodological topic snippet if available */}
                      {member.methodologicalTopic && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                          <strong className="text-slate-600 dark:text-slate-300">Тема: </strong>
                          {member.methodologicalTopic}
                        </div>
                      )}
                    </div>

                    {/* Footer action buttons */}
                    <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedStaffMember(member)}
                        className="flex-1 py-2 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Досьє педагога</span>
                      </button>

                      <a
                        href={member.originalProfileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Відкрити офіційну сторінку на сайті"
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: CONTACTS & FEEDBACK DIALOGUE */}
        {/* ========================================================================= */}
        {activeTab === 'contacts' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Institution Passport */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <MapPin className="w-5 h-5 text-rose-500" />
                <span>Офіційні реквізити та контактні дані закладу</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="font-black text-slate-800 dark:text-white text-sm">Адміністрація закладу</div>
                  <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
                    <div><strong>Повна назва:</strong> Комунальний заклад дошкільної освіти (ясла-садок) комбінованого типу №145 Криворізької міської ради</div>
                    <div><strong>Скорочено:</strong> Криворізький КЗДО КТ №145 КМР</div>
                    <div><strong>Код ЄДРПОУ:</strong> <span className="font-mono font-bold">26136748</span></div>
                    <div><strong>Директор:</strong> Павлухіна Наталія Георгіївна</div>
                    <div><strong>Вихователь-методист:</strong> Єфімова Олена Олексіївна</div>
                    <div><strong>Телефон гарячої лінії:</strong> <a href="tel:+380675694704" className="font-bold text-amber-600 hover:underline">+380 (67) 569-47-04</a></div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="font-black text-slate-800 dark:text-white text-sm">Адреса та прийом громадян</div>
                  <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
                    <div><strong>Адреса:</strong> 50064, м. Кривий Ріг, вул. Перлинна 23А</div>
                    <div><strong>Режим роботи садка:</strong> Понеділок – П'ятниця, 07:00 – 17:30</div>
                    <div><strong>Особистий прийом директора Павлухіної Н.Г.:</strong></div>
                    <ul className="list-disc list-inside pl-2 space-y-0.5">
                      <li>Вівторок: 09:00 – 12:00</li>
                      <li>Четвер: 14:00 – 17:00</li>
                    </ul>
                    <div className="text-[11px] text-slate-500 pt-1">
                      Зустрічі можливі за попереднім записом або в порядку черги.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Feedback Form */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                  Зворотний зв'язок
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2 mt-0.5">
                  <Send className="w-5 h-5 text-blue-600" />
                  <span>Електронне звернення до директора та адміністрації</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Надішліть пропозицію, запитання чи відгук. Ваше повідомлення надходить безпосередньо в кабінет керівника Павлухіної Н.Г.
                </p>
              </div>

              {feedbackSubmitted ? (
                <div className="p-4 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Дякуємо за довіру! Ваше звернення успішно зареєстровано в системі та передано директору закладу.</span>
                </div>
              ) : (
                <form onSubmit={handleSendFeedback} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Ваше ім'я та по батькові *
                      </label>
                      <input
                        type="text"
                        required
                        value={feedbackName}
                        onChange={e => setFeedbackName(e.target.value)}
                        placeholder="Оксана Сергіївна"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Контактний телефон / Email *
                      </label>
                      <input
                        type="text"
                        required
                        value={feedbackContact}
                        onChange={e => setFeedbackContact(e.target.value)}
                        placeholder="+38 (067) 000-00-00"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Тематика звернення
                      </label>
                      <select
                        value={feedbackCategory}
                        onChange={e => setFeedbackCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
                      >
                        <option value="Харчування">Харчування та раціон меню</option>
                        <option value="Освітній процес">Розвивальні заняття та вихователі</option>
                        <option value="Безпека та укриття">Безпека та укриття</option>
                        <option value="Оплата">Батьківська плата та пільги</option>
                        <option value="Подяка">Подяка педагогам і закладу</option>
                        <option value="Інше">Інше запитання</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Текст повідомлення *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={feedbackMessage}
                      onChange={e => setFeedbackMessage(e.target.value)}
                      placeholder="Опишіть ваше запитання, пропозицію чи побажання..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold transition shadow-sm cursor-pointer"
                  >
                    Надіслати звернення директору
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL: VACATION APPLICATION A4 PREVIEW & PRINT */}
      {/* ========================================================================= */}
      {generatedApplicationText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col justify-between space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Офіційний бланк заяви на збереження місця (Формат А4)
                </h3>
              </div>
              <button
                onClick={() => setGeneratedApplicationText(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document preview area */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 font-serif text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">
              {generatedApplicationText}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={handleCopyApplication}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>{copiedApp ? 'Скопійовано!' : 'Копіювати текст'}</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-sm flex items-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Роздрукувати А4</span>
                </button>
                <button
                  onClick={() => setGeneratedApplicationText(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  Закрити
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FULL PSYCHOLOGY MEMO VIEW & PRINT */}
      {/* ========================================================================= */}
      {selectedMemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col justify-between space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Пам'ятка психологічної служби ЗДО №145
                </h3>
              </div>
              <button
                onClick={() => setSelectedMemo(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 text-xs sm:text-sm">
              <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                    {selectedMemo.targetAudience}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold text-[10px]">
                    {selectedMemo.category}
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-1.5">
                  {selectedMemo.title}
                </h2>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 leading-relaxed text-slate-700 dark:text-slate-200 font-medium">
                {selectedMemo.summary}
              </div>

              {selectedMemo.tips && selectedMemo.tips.length > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 space-y-2">
                  <h4 className="font-bold text-emerald-800 dark:text-emerald-300">
                    💡 Практичні поради та рекомендації:
                  </h4>
                  <ul className="space-y-1.5 text-slate-700 dark:text-slate-300">
                    {selectedMemo.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold shrink-0">✓</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Криворізький КЗДО КТ №145 КМР</span>
                <span>Психологічна служба • вул. Перлинна 23А</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm flex items-center space-x-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Роздрукувати пам'ятку А4</span>
              </button>
              <button
                onClick={() => setSelectedMemo(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SPEECH EXERCISE FOR PARENTS */}
      {selectedExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col justify-between space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-teal-600" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Домашнє логопедичне завдання • КЗДО №145
                </h3>
              </div>
              <button
                onClick={() => setSelectedExercise(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 text-xs sm:text-sm">
              <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-bold text-[10px]">
                    {selectedExercise.category === 'lips' ? 'Вправа для губ'
                      : selectedExercise.category === 'tongue' ? 'Вправа для язика'
                      : selectedExercise.category === 'breathing' ? 'Дихальна гімнастика'
                      : 'Чистомовка'}
                  </span>
                  <span className="text-[10px] text-teal-700 dark:text-teal-300 font-bold">
                    Звуки: {selectedExercise.targetSounds.map(s => `[${s}]`).join(', ')}
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-1.5">
                  {selectedExercise.title}
                </h2>
                <p className="text-xs text-slate-500 mt-1">{selectedExercise.purpose}</p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 leading-relaxed text-slate-700 dark:text-slate-200 font-medium">
                {selectedExercise.description}
              </div>

              <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/50 space-y-2">
                <h4 className="font-bold text-teal-800 dark:text-teal-300">
                  📋 Як правильно виконувати з дитиною вдома:
                </h4>
                <ol className="space-y-1.5 text-slate-700 dark:text-slate-300 list-decimal list-inside">
                  {selectedExercise.instructions.map((step, idx) => (
                    <li key={idx} className="leading-snug">{step}</li>
                  ))}
                </ol>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                <b>Рекомендований режим: </b>
                {selectedExercise.repetition}. Займайтеся перед дзеркалом щодня по 5-7 хвилин у формі веселої гри!
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Криворізький КЗДО КТ №145 КМР</span>
                <span>Логопедичний кабінет • вул. Перлинна 23А</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-sm flex items-center space-x-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Роздрукувати завдання А4</span>
              </button>
              <button
                onClick={() => setSelectedExercise(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SELECTED PEDAGOGICAL STAFF MEMBER FULL DOSSIER */}
      {selectedStaffMember && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-cyan-500/10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Картка педагогічного працівника
                  </h3>
                  <span className="text-xs text-slate-500">
                    Криворізький КЗДО КТ №145 КМР • Персональне портфоліо
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedStaffMember(null)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs sm:text-sm">
              {/* Profile Top Bar */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <img
                  src={selectedStaffMember.photoUrl}
                  alt={selectedStaffMember.fullName}
                  className="w-28 h-36 rounded-2xl object-cover shadow-md border-2 border-white dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800"
                />
                <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 font-bold text-xs">
                      {selectedStaffMember.department === 'administration' ? 'Адміністрація закладу' :
                       selectedStaffMember.department === 'specialists' ? 'Фахівець / Спеціаліст' :
                       selectedStaffMember.department === 'special_groups' ? 'Спеціальна група' :
                       'Група загального розвитку'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold text-xs">
                      {selectedStaffMember.qualificationCategory}
                    </span>
                    {selectedStaffMember.pedagogicalRank && (
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 font-bold text-xs">
                        {selectedStaffMember.pedagogicalRank}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {selectedStaffMember.fullName}
                  </h2>
                  <div className="text-sm font-bold text-teal-700 dark:text-teal-400">
                    {selectedStaffMember.position}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-center sm:justify-start space-x-1.5">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span><strong>Педагогічний стаж:</strong> {selectedStaffMember.experience}</span>
                  </div>
                </div>
              </div>

              {/* Credo Box */}
              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 relative space-y-1">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                  <Quote className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Педагогічне кредо:</span>
                </div>
                <p className="text-xs sm:text-sm italic text-amber-950 dark:text-amber-100 leading-relaxed font-medium">
                  {selectedStaffMember.credo}
                </p>
              </div>

              {/* Detailed Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">Освіта та навчальний заклад:</span>
                  <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">{selectedStaffMember.education}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">Кваліфікаційна категорія:</span>
                  <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">{selectedStaffMember.qualificationCategory}</p>
                  {selectedStaffMember.pedagogicalRank && (
                    <p className="text-amber-600 dark:text-amber-400 font-bold text-[11px]">Звання: {selectedStaffMember.pedagogicalRank}</p>
                  )}
                </div>

                {selectedStaffMember.methodologicalTopic && (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1 sm:col-span-2">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">Індивідуальна науково-методична проблема / тема:</span>
                    <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">{selectedStaffMember.methodologicalTopic}</p>
                  </div>
                )}

                {selectedStaffMember.receptionHours && (
                  <div className="p-3.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/50 space-y-1 sm:col-span-2">
                    <span className="font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider text-[10px] block">Години прийому та консультацій для батьків:</span>
                    <p className="text-slate-800 dark:text-slate-200 font-bold">{selectedStaffMember.receptionHours}</p>
                  </div>
                )}
              </div>

              {/* Verification & Official Link */}
              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
                <span>Дані підтверджено атестаційною комісією ЗДО №145</span>
                <a
                  href={selectedStaffMember.originalProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-teal-700 dark:text-teal-300 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <span>Офіційне портфоліо на сайті садка</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2 bg-slate-50 dark:bg-slate-900">
              <button
                onClick={() => setSelectedStaffMember(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                Закрити картку
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
