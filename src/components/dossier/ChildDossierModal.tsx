import React, { useState, useEffect, useMemo } from 'react';
import { 
  SadokChild, 
  UnifiedChildDossier 
} from '../../types';
import { 
  buildUnifiedChildDossier, 
  INSTITUTION_INFO, 
  generateParentAccessUrl 
} from '../../domain/childDossier';
import { generateQrCodeSvg, generateQrCodeDataUrl, getFallbackQrSvg } from '../../utils/qrGenerator';
import { 
  X, 
  Baby, 
  QrCode, 
  Printer, 
  FileText, 
  HeartPulse, 
  Brain, 
  Volume2, 
  Utensils, 
  UserCheck, 
  Phone, 
  Calendar, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  ExternalLink,
  Lock,
  Award,
  BookOpen,
  Edit3
} from 'lucide-react';

interface ChildDossierModalProps {
  child: SadokChild;
  onClose: () => void;
  onEditChild?: (child: SadokChild) => void;
}

export const ChildDossierModal: React.FC<ChildDossierModalProps> = ({
  child,
  onClose,
  onEditChild
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'medical' | 'psychology' | 'speech' | 'nutrition' | 'card'>('overview');
  const [cardPrintFormat, setCardPrintFormat] = useState<'a4' | 'badge'>('a4');
  const [qrSvg, setQrSvg] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Build unified dossier
  const dossier: UnifiedChildDossier | null = useMemo(() => {
    return buildUnifiedChildDossier(child.ID);
  }, [child]);

  const accessPin = dossier?.accessCredentials.pin || child.ACCESS_PIN || `145-${child.ID}`;
  const accessUrl = useMemo(() => {
    return generateParentAccessUrl(accessPin);
  }, [accessPin]);

  // Load QR code SVG asynchronously
  useEffect(() => {
    let isMounted = true;
    generateQrCodeSvg(accessUrl, { size: 220, margin: 1 })
      .then(svg => {
        if (isMounted) setQrSvg(svg);
      })
      .catch(() => {
        if (isMounted) setQrSvg(getFallbackQrSvg(accessUrl, 220));
      });
    return () => { isMounted = false; };
  }, [accessUrl]);

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(accessUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handlePrint = (format: 'a4' | 'badge' = cardPrintFormat) => {
    setCardPrintFormat(format);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const getStatusBadge = (status: SadokChild['STATUS']) => {
    switch (status) {
      case 'Навчається':
        return <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 rounded-full text-xs font-black border border-emerald-300">🟢 Навчається</span>;
      case 'Вибув':
        return <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 rounded-full text-xs font-black border border-rose-300">🔴 Вибув</span>;
      case 'Тимчасово відсутній':
        return <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 rounded-full text-xs font-black border border-amber-300">🟡 Відсутній</span>;
      default:
        return <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 rounded-full text-xs font-black border border-purple-300">🎓 Випускник</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm p-2 sm:p-4 flex items-center justify-center">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl overflow-hidden max-h-[96vh] flex flex-col">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white flex items-center justify-between font-bold shrink-0 no-print">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
              <Baby className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase tracking-wider text-blue-200 font-bold">Єдине цифрове досьє вихованця</span>
                <span className="text-xs px-2 py-0.5 bg-blue-500/40 rounded-full text-white font-mono">ID #{child.ID}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black">{child.FULL_NAME}</h2>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onEditChild && (
              <button 
                onClick={() => onEditChild(child)}
                className="px-3 py-1.5 bg-amber-400 text-slate-950 rounded-xl font-extrabold hover:bg-amber-300 transition text-xs flex items-center space-x-1 shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Редагувати анкету</span>
              </button>
            )}
            <button 
              onClick={() => {
                setActiveTab('card');
                handlePrint('a4');
              }}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold transition text-xs flex items-center space-x-1"
              title="Швидкий друк картки доступу батьків з QR-кодом"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-300" />
              <span>Друк картки з QR</span>
            </button>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* SUBHEADER META BAR */}
        <div className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 no-print">
          <div className="flex items-center flex-wrap gap-3">
            <span>Група: <b className="text-blue-600 dark:text-blue-400 font-bold">{child.GROUP_NAME}</b></span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>Народження: <b className="font-mono text-slate-800 dark:text-slate-200">{child.BIRTH_DATE}</b></span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>Пільга: <b className="text-amber-600 dark:text-amber-400 font-bold">{child.BENEFIT_CATEGORY || 'Загальна підстава'}</b></span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="flex items-center space-x-1">
              <Lock className="w-3 h-3 text-indigo-500" />
              <span>PIN безпеки: <b className="font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md font-bold">{accessPin}</b></span>
            </span>
          </div>
          <div>{getStatusBadge(child.STATUS)}</div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 overflow-x-auto no-print">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3.5 font-bold text-xs border-b-2 flex items-center space-x-2 shrink-0 transition ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>1. Загальні відомості</span>
          </button>
          <button 
            onClick={() => setActiveTab('nutrition')}
            className={`py-3 px-3.5 font-bold text-xs border-b-2 flex items-center space-x-2 shrink-0 transition ${
              activeTab === 'nutrition'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>2. Харчування & Стіл</span>
          </button>
          <button 
            onClick={() => setActiveTab('medical')}
            className={`py-3 px-3.5 font-bold text-xs border-b-2 flex items-center space-x-2 shrink-0 transition ${
              activeTab === 'medical'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            <span>3. Медична ф. 063/о</span>
          </button>
          <button 
            onClick={() => setActiveTab('psychology')}
            className={`py-3 px-3.5 font-bold text-xs border-b-2 flex items-center space-x-2 shrink-0 transition ${
              activeTab === 'psychology'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>4. Психолог & Укриття</span>
          </button>
          <button 
            onClick={() => setActiveTab('speech')}
            className={`py-3 px-3.5 font-bold text-xs border-b-2 flex items-center space-x-2 shrink-0 transition ${
              activeTab === 'speech'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>5. Логопед (Звуки)</span>
          </button>
          <button 
            onClick={() => setActiveTab('card')}
            className={`py-3 px-3.5 font-bold text-xs border-b-2 flex items-center space-x-2 shrink-0 transition ${
              activeTab === 'card'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                : 'border-transparent text-indigo-600 hover:text-indigo-800 dark:text-indigo-400'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>6. Картка доступу (QR-код)</span>
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Personal Details */}
              <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span>Анкета вихованця</span>
                  </h3>
                  <span className="text-xs text-slate-500">Заклад: КЗДО №145 КМР</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Повне ім'я</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">{child.FULL_NAME}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Дата народження</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100 text-sm">{child.BIRTH_DATE}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Стать</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{child.GENDER || 'Чоловіча'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Свідоцтво про народження</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{child.BIRTH_CERTIFICATE || 'Не заповнено'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Адреса проживання</span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{child.ADDRESS || 'м. Кривий Ріг'}</span>
                  </div>
                </div>
              </div>

              {/* Parents Contacts */}
              <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span>Батьки та законні представники</span>
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Мати</span>
                    <div className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-0.5">{child.MOTHER_NAME || child.PARENT_NAME || 'Не вказано'}</div>
                    <div className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs mt-1 flex items-center space-x-1">
                      <Phone className="w-3 h-3" />
                      <span>{child.MOTHER_PHONE || child.PARENT_PHONE || 'Телефон не вказано'}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Батько</span>
                    <div className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-0.5">{child.FATHER_NAME || 'Не вказано'}</div>
                    <div className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs mt-1 flex items-center space-x-1">
                      <Phone className="w-3 h-3" />
                      <span>{child.FATHER_PHONE || 'Телефон не вказано'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admission & Movement */}
              <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span>Рух контингенту та накази</span>
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Дата зарахування</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{child.ENROLLMENT_DATE || '01.09.2025'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Наказ про зарахування</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{child.ENROLLMENT_ORDER || 'Наказ № 145-У'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Поточна група</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{child.GROUP_NAME}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Статус</span>
                    <div>{getStatusBadge(child.STATUS)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NUTRITION & ATTENDANCE */}
          {activeTab === 'nutrition' && dossier && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-300 dark:border-amber-800/60">
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">Категорія харчування</div>
                  <div className="text-2xl font-black text-amber-900 dark:text-amber-100 mt-1">{dossier.dietInfo.categoryName}</div>
                  <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Базова вартість: <b>{dossier.dietInfo.standardDailyRate.toFixed(2)} грн / день</b>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-300 dark:border-blue-800/60">
                  <div className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider">Пільгова категорія</div>
                  <div className="text-base font-extrabold text-blue-900 dark:text-blue-100 mt-1">{dossier.dietInfo.benefitCategory}</div>
                  <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Частка оплати батьків: <b>{dossier.dietInfo.parentPaymentSharePercent}%</b> ({dossier.dietInfo.parentPaymentSharePercent === 0 ? '100% звільнення' : `${(dossier.dietInfo.standardDailyRate * dossier.dietInfo.parentPaymentSharePercent / 100).toFixed(2)} грн/день`})
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-300 dark:border-emerald-800/60">
                  <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">Відвідуваність періоду</div>
                  <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mt-1">{dossier.attendanceStats.presentDays} / {dossier.attendanceStats.totalRecordedDays} днів</div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                    Показник присутності: <b>{dossier.attendanceStats.attendanceRatePercent}%</b>
                  </div>
                </div>
              </div>

              {/* Diet Precautions & Kitchen Instructions */}
              <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                  <Utensils className="w-4 h-4 text-amber-500" />
                  <span>Дієтичні обмеження та вказівки для харчоблоку (НАССР)</span>
                </h3>
                <div className={`p-4 rounded-xl border ${
                  dossier.dietInfo.hasDietRestrictions 
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-900 dark:text-rose-200'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200'
                }`}>
                  <div className="flex items-center space-x-2 font-bold text-sm mb-1">
                    {dossier.dietInfo.hasDietRestrictions ? <AlertCircle className="w-5 h-5 text-rose-600" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                    <span>{dossier.dietInfo.hasDietRestrictions ? 'Увага! Спеціальний дієтичний стіл' : 'Загальний раціон харчування'}</span>
                  </div>
                  <div className="text-xs font-medium">
                    {dossier.dietInfo.dietNotes}
                  </div>
                  {dossier.dietInfo.hasDietRestrictions && (
                    <div className="mt-2 text-[11px] font-bold bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg text-rose-800 dark:text-rose-300">
                      ⚠️ Інформація враховується кухарями під час видачі страв за меню-вимогою. Для батьків у додатку відображаються безпечні страви та персональні заміни.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MEDICAL & FORM 063/O */}
          {activeTab === 'medical' && dossier && (
            <div className="space-y-6">
              {/* Health Group & Furniture Size */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Група здоров'я</span>
                  <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {dossier.medicalCard?.HEALTH_GROUP || 'I (Здорові)'}
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-1">Фізкультурна група: <b>{dossier.medicalCard?.PHYSICAL_GROUP || 'Основна'}</b></span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Розмір меблів (ДБН В.2.2-4)</span>
                  <div className="text-base font-black text-blue-600 dark:text-blue-400 mt-1">
                    Група № {dossier.medicalCard?.DESK_FURNITURE_SIZE || '1 (85-100 см)'}
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-1">Стіл 460 мм / Стілець 260 мм (маркування)</span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Останній медогляд</span>
                  <div className="text-base font-black text-slate-800 dark:text-slate-100 mt-1">
                    {dossier.medicalCard?.UPDATED_AT || '01.09.2025'}
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-1">Висновок: <b>{dossier.medicalCard?.DOCTOR_CONCLUSION || 'Допущено до ЗДО'}</b></span>
                </div>
              </div>

              {/* Form 063/o Vaccinations */}
              <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Карта профілактичних щеплень (Форма № 063/о)</span>
                  </h3>
                  <span className="text-xs font-bold text-slate-500">Зареєстровано щеплень: {dossier.vaccinations.length}</span>
                </div>

                {dossier.vaccinations.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    Відомості про щеплення дитини ще не внесені медсестрою в модуль SADOK Медицина.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-2.5">Вакцина</th>
                          <th className="p-2.5">Етап / Доза</th>
                          <th className="p-2.5">Дата проведення</th>
                          <th className="p-2.5">Серія препарату</th>
                          <th className="p-2.5">Реакція</th>
                          <th className="p-2.5">Статус</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {dossier.vaccinations.map(vac => (
                          <tr key={vac.ID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{vac.VACCINE_TYPE}</td>
                            <td className="p-2.5 font-mono">{vac.DOSE_STAGE}</td>
                            <td className="p-2.5 font-mono">{vac.ADMINISTERED_DATE}</td>
                            <td className="p-2.5 font-mono text-slate-500">{vac.SERIES_NUMBER || '—'}</td>
                            <td className="p-2.5">{vac.REACTION}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-md font-bold text-[10px]">
                                ✓ {vac.STATUS}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PSYCHOLOGY & SHELTER */}
          {activeTab === 'psychology' && dossier && (
            <div className="space-y-6">
              {/* Adaptation Profile */}
              <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                    <Brain className="w-4 h-4 text-purple-600" />
                    <span>Карта психологічної адаптації</span>
                  </h3>
                  <span className="text-xs text-purple-600 font-bold">МОН України / Практичний психолог</span>
                </div>

                {dossier.psychologyAdaptations.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {dossier.psychologyAdaptations.map(ad => (
                      <div key={ad.ID} className="p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-800/40 text-xs space-y-2">
                        <div className="flex justify-between items-center font-bold">
                          <span>Тиждень {ad.WEEK_NUMBER} (від {ad.START_DATE})</span>
                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-md">
                            Рівень: {ad.ADAPTATION_LEVEL}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>Емоційний стан: <b>{ad.EMOTIONAL_STATE}</b></div>
                          <div>Тривожність: <b>{ad.ANXIETY_LEVEL}</b></div>
                          <div>Апетит: <b>{ad.APPETITE}</b></div>
                          <div>Сон: <b>{ad.SLEEP}</b></div>
                        </div>
                        {ad.RECOMMENDATIONS && (
                          <div className="text-slate-600 dark:text-slate-400 border-t border-purple-200/60 dark:border-purple-800/40 pt-2 text-[11px]">
                            Порада психолога: {ad.RECOMMENDATIONS}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-xs text-slate-600 dark:text-slate-400">
                    {child.PSYCHOLOGY_NOTES || 'Адаптація в групі проходить сприятливо, взаємодія з однолітками та вихователями стабільна.'}
                  </div>
                )}
              </div>

              {/* Behavior in Shelter during Alerts */}
              <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Поведінка та психологічний комфорт в укритті ЗДО</span>
                </h3>
                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800 text-xs space-y-2">
                  <div className="font-bold text-blue-900 dark:text-blue-200">
                    Реакція на повітряну тривогу та перебування в укритті:
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {dossier.psychologySpecialSupport?.SHELTER_BEHAVIOR || 'Дитина спокійно реагує на сигнал тривоги, дотримується вказівок вихователя під час спуску в укриття, залучається до спокійних розвивальних ігор та читання казок.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SPEECH THERAPY */}
          {activeTab === 'speech' && dossier && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                    <Volume2 className="w-4 h-4 text-rose-600" />
                    <span>Індивідуальна мовленнєва картка дитини</span>
                  </h3>
                  <span className="text-xs px-2.5 py-1 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 rounded-lg font-bold">
                    Діагноз: {dossier.speechCard?.DIAGNOSIS || 'Фонетико-фонематичний розвиток у нормі'}
                  </span>
                </div>

                {dossier.speechCard ? (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Артикуляційний апарат</span>
                        <div className="font-bold text-slate-800 dark:text-slate-100 mt-1">{dossier.speechCard.ARTICULATION_APPARATUS}</div>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Фонематичний слух</span>
                        <div className="font-bold text-slate-800 dark:text-slate-100 mt-1">{dossier.speechCard.PHONEMIC_HEARING}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-2">Стан звуковимови та етапи корекції:</div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {dossier.speechCard.SOUND_STATUSES.map(s => (
                          <div key={s.sound} className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                            <div className="font-mono font-black text-sm text-rose-600 dark:text-rose-400">{s.sound}</div>
                            <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">{s.stage}</div>
                            <div className="text-[9px] text-slate-400 mt-0.5">{s.group}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-800 text-xs">
                      <div className="font-bold text-rose-900 dark:text-rose-200">Висновок та індивідуальний план вчителя-логопеда:</div>
                      <div className="text-slate-700 dark:text-slate-300 mt-1">{dossier.speechCard.LOGOPED_CONCLUSION}</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    Мовленнєва картка дитини на стадії планового скринінгу. Грубих дефектів звуковимови не виявлено.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: PARENT ACCESS CARD WITH QR-CODE */}
          {activeTab === 'card' && (
            <div className="space-y-6">
              {/* Controls Bar */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs no-print">
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Формат друку:</span>
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                    <button 
                      onClick={() => setCardPrintFormat('a4')} 
                      className={`px-3 py-1.5 rounded-lg font-bold transition ${
                        cardPrintFormat === 'a4' 
                          ? 'bg-blue-600 text-white shadow-xs' 
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      📄 Офіційне повідомлення А4
                    </button>
                    <button 
                      onClick={() => setCardPrintFormat('badge')} 
                      className={`px-3 py-1.5 rounded-lg font-bold transition ${
                        cardPrintFormat === 'badge' 
                          ? 'bg-blue-600 text-white shadow-xs' 
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      🪪 Бейдж / Картка А6
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button 
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 transition flex items-center space-x-1.5"
                  >
                    {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Посилання скопійовано!' : 'Скопіювати лінк доступу'}</span>
                  </button>
                  <button 
                    onClick={() => handlePrint(cardPrintFormat)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition flex items-center space-x-1.5 shadow-md shadow-blue-500/20"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Друкувати картку</span>
                  </button>
                </div>
              </div>

              {/* LIVE PREVIEW / PRINTABLE CONTAINER */}
              <div className="flex justify-center p-2 sm:p-6 bg-slate-200/70 dark:bg-slate-950/70 rounded-2xl border border-slate-300 dark:border-slate-800">
                {cardPrintFormat === 'a4' ? (
                  /* FORMAT A4: OFFICIAL INSTITUTIONAL NOTICE FOR PARENTS */
                  <div className="printable-a4 bg-white text-slate-900 w-full max-w-[210mm] min-h-[260mm] p-8 sm:p-12 rounded-xl shadow-xl border border-slate-300 space-y-6 text-xs font-sans">
                    {/* Header with emblem and institution info */}
                    <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">КРИВОРІЗЬКА МІСЬКА РАДА • ДЕПАРТАМЕНТ ОСВІТИ І НАУКИ</div>
                      <h1 className="text-sm sm:text-base font-black uppercase text-slate-950 leading-tight">
                        {INSTITUTION_INFO.fullName}
                      </h1>
                      <div className="text-[10px] text-slate-600 font-medium">
                        Код ЄДРПОУ: <b>{INSTITUTION_INFO.edrpou}</b> • {INSTITUTION_INFO.address} • Тел.: {INSTITUTION_INFO.phone}
                      </div>
                    </div>

                    {/* Notice Title */}
                    <div className="text-center py-2">
                      <div className="inline-block px-4 py-1 bg-slate-100 border border-slate-300 rounded-full font-mono text-[10px] font-bold uppercase tracking-widest text-slate-700">
                        ОФІЦІЙНЕ ПОВІДОМЛЕННЯ-ПЕРЕМУСТКА БАТЬКАМ
                      </div>
                      <h2 className="text-lg sm:text-xl font-black uppercase mt-2 tracking-tight">
                        ПЕРСОНАЛЬНА КАРТКА БЕЗПЕЧНОГО ДОСТУПУ ДО «SADOK БАТЬКАМ»
                      </h2>
                      <p className="text-[11px] text-slate-600 mt-1 max-w-lg mx-auto">
                        Ця картка містить індивідуальний зашифрований QR-код та цифровий PIN для конфіденційного перегляду інформації виключно про Вашу дитину.
                      </p>
                    </div>

                    {/* Child Profile Box */}
                    <div className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-5 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">ПІБ Вихованця:</span>
                          <div className="text-base font-black text-slate-950">{child.FULL_NAME}</div>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Вікова група:</span>
                          <div className="text-base font-black text-blue-700">{child.GROUP_NAME}</div>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Дата народження:</span>
                          <div className="text-xs font-mono font-bold text-slate-800">{child.BIRTH_DATE}</div>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Пільгова категорія:</span>
                          <div className="text-xs font-bold text-amber-700">{child.BENEFIT_CATEGORY || 'Загальна'}</div>
                        </div>
                      </div>
                    </div>

                    {/* QR Code & PIN Code Showcase Block */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center p-6 bg-blue-50/50 border-2 border-dashed border-blue-400 rounded-2xl">
                      {/* Left: Big QR Code */}
                      <div className="flex flex-col items-center justify-center text-center space-y-2">
                        <div 
                          className="bg-white p-3 rounded-2xl shadow-md border border-slate-300 w-[200px] h-[200px] flex items-center justify-center"
                          dangerouslySetInnerHTML={{ __html: qrSvg || getFallbackQrSvg(accessUrl, 180) }}
                        />
                        <span className="text-[10px] font-extrabold text-blue-900 uppercase tracking-wider">
                          Наведіть камеру смартфона для миттєвого входу
                        </span>
                      </div>

                      {/* Right: Digital Access Code & Instructions */}
                      <div className="space-y-4">
                        <div className="p-4 bg-white rounded-xl border border-blue-200 shadow-xs text-center space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Персональний цифровий PIN-код:</span>
                          <div className="font-mono text-3xl font-black tracking-widest text-indigo-700">
                            {accessPin}
                          </div>
                          <span className="text-[9px] text-slate-500 block">Використовується для ручного входу в Особистий кабінет</span>
                        </div>

                        <div className="space-y-1.5 text-[11px] text-slate-700">
                          <div className="font-bold text-slate-900 uppercase text-[10px]">Що доступно батькам у кабінеті:</div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>Щоденне меню зі стравами та перевіркою дієти дитини</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>Електронна карта щеплень (ф. 063/о) та група здоров'я</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>Домашні логопедичні вправи під проблемні звуки дитини</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>Швидка подача повідомлення про хворобу/відсутність без дзвінків</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>Сувора конфіденційність: чужі батьки не мають доступу до даних</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer / Signatures / Stamp */}
                    <div className="pt-8 border-t border-slate-300 flex justify-between items-end text-xs">
                      <div>
                        <div className="font-bold text-slate-900">Директор КЗДО КТ №145 КМР</div>
                        <div className="text-[10px] text-slate-500">м.п. (печатка закладу)</div>
                      </div>
                      <div className="text-center font-serif italic text-slate-400">
                        [ Електронний підпис ]
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-slate-950 font-serif">{INSTITUTION_INFO.director}</div>
                        <div className="text-[10px] text-slate-500">Дата видачі: {new Date().toLocaleDateString('uk-UA')}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* FORMAT BADGE / A6: COMPACT PLASTIC CARD FOR LAMINATING */
                  <div className="printable-badge bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white w-[105mm] h-[148mm] p-5 rounded-3xl shadow-2xl border-2 border-indigo-400/40 flex flex-col justify-between text-xs font-sans relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                    
                    {/* Badge Header */}
                    <div className="border-b border-white/20 pb-2 flex items-center justify-between">
                      <div>
                        <div className="text-[8px] uppercase tracking-widest text-blue-200 font-bold">КЗДО КТ №145 КМР</div>
                        <div className="text-[11px] font-black uppercase text-amber-300">Картка вихованця</div>
                      </div>
                      <div className="text-right font-mono text-[9px] text-blue-300 font-bold">
                        ЄДРПОУ {INSTITUTION_INFO.edrpou}
                      </div>
                    </div>

                    {/* Child Name & Group */}
                    <div className="py-2 text-center">
                      <div className="text-base font-black text-white leading-tight">
                        {child.FULL_NAME}
                      </div>
                      <div className="text-xs text-amber-300 font-extrabold mt-0.5">
                        {child.GROUP_NAME}
                      </div>
                    </div>

                    {/* Center QR Code in White Box */}
                    <div className="flex justify-center my-1">
                      <div 
                        className="bg-white p-2 rounded-2xl shadow-xl w-[140px] h-[140px] flex items-center justify-center"
                        dangerouslySetInnerHTML={{ __html: qrSvg || getFallbackQrSvg(accessUrl, 130) }}
                      />
                    </div>

                    {/* Digital PIN Code Display */}
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-2 text-center border border-white/20">
                      <span className="text-[9px] uppercase tracking-wider text-blue-200 block font-bold">Код доступу для батьків:</span>
                      <div className="font-mono text-xl font-black text-amber-300 tracking-widest mt-0.5">
                        {accessPin}
                      </div>
                    </div>

                    {/* Footer / Instructions */}
                    <div className="pt-2 border-t border-white/10 flex justify-between items-center text-[8px] text-slate-300">
                      <span>Скануйте для входу в кабінет</span>
                      <span>Директор: Павлухіна Н.Г.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 bg-slate-100 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs shrink-0 no-print">
          <div className="text-slate-500">
            Особова справа № <b>145-Д{child.ID}</b> • Захищений протокол доступу
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => {
                setActiveTab('card');
                handlePrint('a4');
              }}
              className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-700 transition flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Друк картки батьків</span>
            </button>
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-300 transition"
            >
              Закрити
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
