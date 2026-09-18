import React, { useState, useEffect, useMemo } from 'react';
import { SearchableSelect } from '../common/SearchableSelect';
import { WorkflowGuideModal, WorkflowStep } from '../common/WorkflowGuideModal';
import {
  MessageSquare,
  Plus,
  Search,
  FileText,
  Printer,
  Sparkles,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Layers,
  Smile,
  Volume2,
  Coffee,
  Shield,
  Feather,
  Heart,
  Wind,
  CloudRain,
  Music,
  Download,
  Edit2,
  Trash2,
  X,
  Save,
  HelpCircle,
  Eye,
  BarChart3,
  Award,
  BookOpen
} from 'lucide-react';
import {
  DATABASE_SYNC_EVENT,
  getChildren,
  getGroups,
  getSpeechCards,
  saveSpeechCard,
  deleteSpeechCard,
  getSpeechDailyLogEntries,
  saveSpeechDailyLogEntry,
  deleteSpeechDailyLogEntry,
  getArticulationExercises
} from '../../services/db';
import { exportToExcel } from '../../services/export';
import {
  SadokChild,
  SadokGroup,
  SpeechCard,
  SpeechDailyLogEntry,
  SpeechDiagnosisType,
  SoundCorrectionStage,
  SpeechSoundStatus,
  ArticulationExercise,
  ArticulationExerciseCategory
} from '../../types';
import {
  calculateLogopedWeeklyWorkload,
  tallySpeechDiagnostics,
  calculateCorrectionRate,
  generateSpeechAnnualReportText
} from '../../domain/logoped';

const SOUND_LIST: Array<{ sound: string; group: 'свистячі' | 'шиплячі' | 'сонори' | 'задньоязикові' | 'інші' }> = [
  { sound: '[С]', group: 'свистячі' },
  { sound: '[Сь]', group: 'свистячі' },
  { sound: '[З]', group: 'свистячі' },
  { sound: '[Зь]', group: 'свистячі' },
  { sound: '[Ц]', group: 'свистячі' },
  { sound: '[Ць]', group: 'свистячі' },
  { sound: '[Ш]', group: 'шиплячі' },
  { sound: '[Ж]', group: 'шиплячі' },
  { sound: '[Ч]', group: 'шиплячі' },
  { sound: '[Щ]', group: 'шиплячі' },
  { sound: '[Л]', group: 'сонори' },
  { sound: '[Ль]', group: 'сонори' },
  { sound: '[Р]', group: 'сонори' },
  { sound: '[Рь]', group: 'сонори' },
  { sound: '[К]', group: 'задньоязикові' },
  { sound: '[Г]', group: 'задньоязикові' },
  { sound: '[Х]', group: 'задньоязикові' }
];

const CORRECTION_STAGES: SoundCorrectionStage[] = [
  'Обстеження',
  'Підготовчий (гімнастика)',
  'Постановка звука',
  'Автоматизація в складах',
  'Автоматизація в словах',
  'Автоматизація в реченнях',
  'Диференціація',
  'Введено в мовлення (Норма)'
];

export const LogopedModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'speech_cards' | 'daily_log' | 'exercises' | 'reports'
  >('overview');

  // Database State
  const [children, setChildren] = useState<SadokChild[]>([]);
  const [groups, setGroups] = useState<SadokGroup[]>([]);
  const [speechCards, setSpeechCards] = useState<SpeechCard[]>([]);
  const [dailyLogs, setDailyLogs] = useState<SpeechDailyLogEntry[]>([]);
  const [exercises, setExercises] = useState<ArticulationExercise[]>([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedDiagnosis, setSelectedDiagnosis] = useState('all');
  const [dailyLogFilterType, setDailyLogFilterType] = useState('all');
  const [exerciseCategoryFilter, setExerciseCategoryFilter] = useState<string>('all');
  const [academicYear, setAcademicYear] = useState('2024/2025 н.р.');

  // Modals & Selection State
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Partial<SpeechCard> | null>(null);
  const [selectedCardForPrint, setSelectedCardForPrint] = useState<SpeechCard | null>(null);

  const [isDailyLogModalOpen, setIsDailyLogModalOpen] = useState(false);
  const [editingDailyLog, setEditingDailyLog] = useState<Partial<SpeechDailyLogEntry> | null>(null);

  const [selectedExerciseForPrint, setSelectedExerciseForPrint] = useState<ArticulationExercise | null>(null);
  const [isAnnualReportPrintOpen, setIsAnnualReportPrintOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Load Data
  const loadData = () => {
    setChildren(getChildren());
    setGroups(getGroups());
    setSpeechCards(getSpeechCards());
    setDailyLogs(getSpeechDailyLogEntries());
    setExercises(getArticulationExercises());
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener(DATABASE_SYNC_EVENT, handleSync);
    return () => window.removeEventListener(DATABASE_SYNC_EVENT, handleSync);
  }, []);

  // Calculated Metrics
  const workload = useMemo(() => calculateLogopedWeeklyWorkload(dailyLogs), [dailyLogs]);
  const diagnosticsSummary = useMemo(() => tallySpeechDiagnostics(speechCards), [speechCards]);
  const correctionRate = useMemo(() => calculateCorrectionRate(speechCards), [speechCards]);

  // Filtered Cards
  const filteredCards = useMemo(() => {
    return speechCards.filter(card => {
      const matchSearch = card.CHILD_NAME.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.GROUP_NAME.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.LOGOPED_CONCLUSION.toLowerCase().includes(searchQuery.toLowerCase());
      const matchGroup = selectedGroup === 'all' || card.GROUP_NAME.includes(selectedGroup);
      const matchDiag = selectedDiagnosis === 'all' || card.DIAGNOSIS === selectedDiagnosis;
      return matchSearch && matchGroup && matchDiag;
    });
  }, [speechCards, searchQuery, selectedGroup, selectedDiagnosis]);

  // Filtered Daily Logs
  const filteredDailyLogs = useMemo(() => {
    return dailyLogs.filter(log => {
      const matchSearch = log.TARGET_NAME.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.TOPIC.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.SOUND_TARGET && log.SOUND_TARGET.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchType = dailyLogFilterType === 'all' || log.ACTIVITY_TYPE === dailyLogFilterType;
      return matchSearch && matchType;
    });
  }, [dailyLogs, searchQuery, dailyLogFilterType]);

  // Filtered Exercises
  const filteredExercises = useMemo(() => {
    if (exerciseCategoryFilter === 'all') return exercises;
    return exercises.filter(e => e.category === exerciseCategoryFilter);
  }, [exercises, exerciseCategoryFilter]);

  // Handler: Save Speech Card
  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard?.CHILD_NAME) {
      alert('Будь ласка, вкажіть ПІБ дитини');
      return;
    }

    const updated = saveSpeechCard({
      ...editingCard,
      CHILD_NAME: editingCard.CHILD_NAME,
      DIAGNOSIS: editingCard.DIAGNOSIS || 'ФФНМ'
    });
    setSpeechCards(updated);
    setIsCardModalOpen(false);
    setEditingCard(null);
  };

  // Handler: Delete Speech Card
  const handleDeleteCard = (id: number) => {
    if (window.confirm('Ви впевнені, що хочете видалити мовленнєву картку цієї дитини?')) {
      const updated = deleteSpeechCard(id);
      setSpeechCards(updated);
    }
  };

  // Handler: Save Daily Log Entry
  const handleSaveDailyLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDailyLog?.TOPIC || !editingDailyLog.ACTIVITY_TYPE) {
      alert('Вкажіть тему та тип діяльності');
      return;
    }

    const updated = saveSpeechDailyLogEntry({
      ...editingDailyLog,
      ACTIVITY_TYPE: editingDailyLog.ACTIVITY_TYPE,
      TOPIC: editingDailyLog.TOPIC,
      HOURS_SPENT: Number(editingDailyLog.HOURS_SPENT) || 0.5
    });
    setDailyLogs(updated);
    setIsDailyLogModalOpen(false);
    setEditingDailyLog(null);
  };

  // Handler: Delete Daily Log Entry
  const handleDeleteDailyLog = (id: number) => {
    if (window.confirm('Видалити запис щоденного обліку?')) {
      const updated = deleteSpeechDailyLogEntry(id);
      setDailyLogs(updated);
    }
  };

  // Handler: Excel Export
  const handleExportDailyLogExcel = () => {
    const headers = [
      'Дата',
      'Вид діяльності',
      'Категорія',
      'Цільова група / Дитина',
      'Група',
      'Звуки в роботі',
      'Тема / Зміст роботи',
      'Години (тривалість)',
      'Результати / Примітки'
    ];
    const rows = filteredDailyLogs.map(item => [
      item.DATE,
      item.ACTIVITY_TYPE,
      item.CATEGORY,
      item.TARGET_NAME,
      item.GROUP_NAME || '',
      item.SOUND_TARGET || '',
      item.TOPIC,
      item.HOURS_SPENT,
      item.RESULTS_NOTES || ''
    ]);
    exportToExcel(
      `Журнал_логопеда_КЗДО_145_${new Date().toISOString().split('T')[0]}`,
      'Журнал логопеда',
      headers,
      rows
    );
  };

  // Workflow steps
  const logopedWorkflowSteps: WorkflowStep[] = [
    {
      number: 1,
      title: 'Первинне логопедичне обстеження (скринінг)',
      description: 'У вересні вчитель-логопед обстежує стан мовлення вихованців комбінованого садка (будова артикуляційного апарату, фонематичний слух, вимова звуків).',
      details: [
        'Оцініть усі групи звуків: свистячі, шиплячі, сонори [Р], [Л], задньоязикові',
        'Створіть «Мовленнєву картку дитини» з початковим діагнозом (ФФНМ, ЗНМ, дислалія тощо)'
      ]
    },
    {
      number: 2,
      title: 'Складання індивідуального плану корекційної роботи',
      description: 'Визначте послідовність етапів для кожного дефектного звука: підготовчий (гімнастика), постановка, автоматизація у складах/словах/фразах, диференціація.',
      details: [
        'Оберіть вправи з «Банку артикуляційної гімнастики» для зміцнення язика та губ',
        'Сформуйте підгрупи дітей зі схожими дефектами для ефективних спільних занять'
      ]
    },
    {
      number: 3,
      title: 'Щоденний облік та взаємодія з батьками',
      description: 'Фіксуйте кожне індивідуальне та підгрупове заняття у щоденному журналі. Норма тижневого навантаження за Законом України — 20 годин прямої роботи.',
      details: [
        'Друкуйте бланки домашніх логопедичних завдань для батьків у форматі А4',
        'Контролюйте прогрес автоматизації звуків за шкалою динаміки'
      ]
    },
    {
      number: 4,
      title: 'Підсумкова діагностика та річний звіт',
      description: 'У травні підбийте підсумки результативності: кількість виправлених звуків, випуск дітей з чистою вимовою або продовження корекції на наступний рік.',
      details: [
        'Згенеруйте та роздрукуйте офіційний «Річний звіт» на ім\'я директора Павлухіної Н.Г.',
        'Експортуйте щоденний журнал до Excel для передачі в архів закладу'
      ]
    }
  ];

  const getExerciseIcon = (iconName: string) => {
    switch (iconName) {
      case 'Smile': return <Smile className="w-5 h-5 text-amber-500" />;
      case 'Volume2': return <Volume2 className="w-5 h-5 text-blue-500" />;
      case 'Layers': return <Layers className="w-5 h-5 text-emerald-500" />;
      case 'Coffee': return <Coffee className="w-5 h-5 text-indigo-500" />;
      case 'Sparkles': return <Sparkles className="w-5 h-5 text-purple-500" />;
      case 'Shield': return <Shield className="w-5 h-5 text-rose-500" />;
      case 'Feather': return <Feather className="w-5 h-5 text-teal-500" />;
      case 'Heart': return <Heart className="w-5 h-5 text-pink-500" />;
      case 'Wind': return <Wind className="w-5 h-5 text-cyan-500" />;
      case 'CloudRain': return <CloudRain className="w-5 h-5 text-sky-500" />;
      case 'Music': return <Music className="w-5 h-5 text-violet-500" />;
      default: return <MessageSquare className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-y-auto min-h-0">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-slate-900 text-white p-5 shadow-lg shrink-0 border-b border-teal-700/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Логопедичний кабінет • КЗДО КТ №145 КМР</span>
              </span>
              <span className="text-xs text-teal-200/80">ЄДРПОУ: 26136748</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
              <MessageSquare className="w-7 h-7 text-teal-300" />
              <span>SADOK Логопед та корекційна педагогіка</span>
            </h1>
            <p className="text-xs text-teal-100/80 max-w-2xl">
              Облік дітей з порушеннями мовлення (ФФНМ, ЗНМ, дислалія), індивідуальні мовленнєві картки дитини за стандартами МОН України, трекінг корекції звуків, щоденний журнал та банк артикуляційних вправ.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold backdrop-blur-sm transition border border-white/20 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Алгоритм роботи</span>
            </button>
            <button
              onClick={() => {
                setEditingCard({
                  CHILD_NAME: '',
                  GROUP_NAME: 'Група «Калинка» (Старша логопедична)',
                  BIRTH_DATE: '2020-05-10',
                  ENROLLMENT_DATE: new Date().toISOString().split('T')[0],
                  DIAGNOSIS: 'ФФНМ',
                  ARTICULATION_APPARATUS: 'Будова без патологій, рухливість задовільна.',
                  PHONEMIC_HEARING: 'Труднощі розрізнення опозиційних звуків.',
                  SOUND_STATUSES: [
                    { sound: '[С]', group: 'свистячі', stage: 'Введено в мовлення (Норма)' },
                    { sound: '[Ш]', group: 'шиплячі', stage: 'Постановка звука' },
                    { sound: '[Р]', group: 'сонори', stage: 'Підготовчий (гімнастика)' }
                  ],
                  VOCABULARY_LEVEL: 'Відповідає віку.',
                  GRAMMAR_STRUCTURE: 'Сформований задовільно.',
                  COHERENT_SPEECH: 'Складає прості описові розповіді.',
                  INDIVIDUAL_PLAN: '1) Артикуляційна гімнастика; 2) Постановка звуків [Ш], [Р]; 3) Автоматизація.',
                  DYNAMICS: 'Позитивна динаміка',
                  LOGOPED_CONCLUSION: 'ФФНМ. Потребує логопедичної корекції.'
                });
                setIsCardModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Мовленнєва картка</span>
            </button>
          </div>
        </div>

        {/* Workload and Quick Stats Ribbon */}
        <div className="max-w-7xl mx-auto mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15">
            <div className="text-[11px] font-semibold text-teal-200">Дітей на логопункті</div>
            <div className="text-xl font-black text-white mt-0.5">{speechCards.length} вихованців</div>
            <div className="text-[10px] text-teal-100/70">Комбіновані та спецгрупи</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15">
            <div className="text-[11px] font-semibold text-teal-200">Автоматизовано звуків</div>
            <div className="text-xl font-black text-emerald-300 mt-0.5">
              {correctionRate.automatedSounds} / {correctionRate.totalSounds} ({correctionRate.ratePct}%)
            </div>
            <div className="text-[10px] text-teal-100/70">Чиста звуковимова</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15">
            <div className="text-[11px] font-semibold text-teal-200">Тижневе навантаження</div>
            <div className="text-xl font-black text-white mt-0.5">
              {workload.directHours} / {workload.directNorm} год
            </div>
            <div className="text-[10px] text-teal-100/70">
              Виконано норму: {workload.directProgressPct}%
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15">
            <div className="text-[11px] font-semibold text-teal-200">Випущено з нормою</div>
            <div className="text-xl font-black text-amber-300 mt-0.5">
              {diagnosticsSummary.dynamicsBreakdown.completed} дітей
            </div>
            <div className="text-[10px] text-teal-100/70">Повна корекція мовлення</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 shrink-0">
        <div className="max-w-7xl mx-auto flex space-x-1 sm:space-x-3 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Огляд та аналітика</span>
          </button>
          <button
            onClick={() => setActiveTab('speech_cards')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'speech_cards'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Мовленнєві картки дітей ({speechCards.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('daily_log')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'daily_log'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Журнал щоденного обліку ({dailyLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('exercises')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'exercises'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Банк артикуляційних вправ ({exercises.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Звіти результативності</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Workload Progress Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-teal-600" />
                    <span>Тижневе педагогічне навантаження вчителя-логопеда</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Норма прямої корекційної, діагностичної та консультативної роботи: 20 годин на тиждень (ставка).
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-teal-600 dark:text-teal-400">
                    {workload.directHours} з {workload.directNorm} год ({workload.directProgressPct}%)
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${workload.directProgressPct}%` }}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-400 text-[10px]">Індивідуальні</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{workload.breakdown.individualCount} занять</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-400 text-[10px]">Підгрупові</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{workload.breakdown.subgroupCount} занять</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-400 text-[10px]">Скринінги</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{workload.breakdown.screeningCount} обстежень</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-400 text-[10px]">Консультації</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{workload.breakdown.consultationCount} консультацій</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-400 text-[10px]">Метод. робота</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{workload.methodologicalHours} год</div>
                </div>
              </div>
            </div>

            {/* Diagnostic Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Diagnoses Breakdown */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <h3 className="text-sm font-black text-slate-900 dark:text-white mb-3 flex items-center space-x-2">
                  <Award className="w-4 h-4 text-indigo-600" />
                  <span>Розподіл контингенту за мовленнєвими висновками</span>
                </h3>
                <div className="space-y-2 text-xs">
                  {Object.entries(diagnosticsSummary.diagnosesBreakdown).map(([diag, count]) => (
                    <div key={diag} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{diag}</span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-bold">
                        {count} {count === 1 ? 'дитина' : count >= 2 && count <= 4 ? 'дитини' : 'дітей'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 2: Defective Sound Groups in Correction */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <h3 className="text-sm font-black text-slate-900 dark:text-white mb-3 flex items-center space-x-2">
                  <Volume2 className="w-4 h-4 text-teal-600" />
                  <span>Звукові групи в активній корекції (неавтоматизовані)</span>
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/40">
                    <div className="text-teal-800 dark:text-teal-300 font-bold">Свистячі [С, З, Ц]</div>
                    <div className="text-2xl font-black text-teal-900 dark:text-teal-100 mt-1">
                      {diagnosticsSummary.soundGroupsInCorrection.whistling}
                    </div>
                    <div className="text-[10px] text-teal-600 dark:text-teal-400 mt-0.5">порушень звуковимови</div>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40">
                    <div className="text-blue-800 dark:text-blue-300 font-bold">Шиплячі [Ш, Ж, Ч, Щ]</div>
                    <div className="text-2xl font-black text-blue-900 dark:text-blue-100 mt-1">
                      {diagnosticsSummary.soundGroupsInCorrection.hissing}
                    </div>
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">порушень звуковимови</div>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40">
                    <div className="text-purple-800 dark:text-purple-300 font-bold">Сонори [Р, Л]</div>
                    <div className="text-2xl font-black text-purple-900 dark:text-purple-100 mt-1">
                      {diagnosticsSummary.soundGroupsInCorrection.sonors}
                    </div>
                    <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">ротацизм / ламбдацизм</div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40">
                    <div className="text-amber-800 dark:text-amber-300 font-bold">Задньоязикові [К, Г, Х]</div>
                    <div className="text-2xl font-black text-amber-900 dark:text-amber-100 mt-1">
                      {diagnosticsSummary.soundGroupsInCorrection.guttural}
                    </div>
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">каппацизм / гаммацизм</div>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      Загальний показник чистоти мовлення
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      Частка автоматизованих звуків серед усіх обстежених
                    </div>
                  </div>
                  <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                    {correctionRate.ratePct}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SPEECH CARDS */}
        {/* ========================================================================= */}
        {activeTab === 'speech_cards' && (
          <div className="space-y-4">
            {/* Filters bar */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Пошук за ПІБ дитини, групою чи висновком..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedDiagnosis}
                  onChange={e => setSelectedDiagnosis(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden"
                >
                  <option value="all">Всі діагнози</option>
                  <option value="ФФНМ">ФФНМ</option>
                  <option value="ЗНМ III рівень">ЗНМ III рівень</option>
                  <option value="Дислалія">Дислалія</option>
                  <option value="Дизартрія">Дизартрія</option>
                  <option value="Норма">Норма</option>
                </select>

                <select
                  value={selectedGroup}
                  onChange={e => setSelectedGroup(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden"
                >
                  <option value="all">Всі групи</option>
                  {groups.map(g => (
                    <option key={g.ID} value={g.NAME}>{g.NAME}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCards.map(card => (
                <div
                  key={card.ID}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                            {card.DIAGNOSIS}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            card.DYNAMICS === 'Звуки автоматизовано (Норма)'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : card.DYNAMICS === 'Позитивна динаміка'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {card.DYNAMICS}
                          </span>
                        </div>
                        <h4 className="text-base font-black text-slate-900 dark:text-white mt-1.5">
                          {card.CHILD_NAME}
                        </h4>
                        <p className="text-xs text-slate-500">{card.GROUP_NAME} • Народження: {card.BIRTH_DATE}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setSelectedCardForPrint(card)}
                          title="Друк Мовленнєвої картки А4"
                          className="p-1.5 text-slate-500 hover:text-teal-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingCard(card);
                            setIsCardModalOpen(true);
                          }}
                          title="Редагувати картку"
                          className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCard(card.ID)}
                          title="Видалити картку"
                          className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Sound statuses tags */}
                    <div className="mt-3">
                      <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                        Стан звуковимови:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {card.SOUND_STATUSES.map(s => (
                          <span
                            key={s.sound}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center space-x-1 ${
                              s.stage === 'Введено в мовлення (Норма)'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : s.stage.includes('Автоматизація')
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            <span>{s.sound}</span>
                            <span className="opacity-75 font-normal">({s.stage})</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
                      <div>
                        <span className="font-bold text-slate-700 dark:text-slate-300">Висновок: </span>
                        <span className="text-slate-600 dark:text-slate-400">{card.LOGOPED_CONCLUSION}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-700 dark:text-slate-300">План: </span>
                        <span className="text-slate-600 dark:text-slate-400 line-clamp-2">{card.INDIVIDUAL_PLAN}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>Оновлено: {card.UPDATED_AT}</span>
                    <button
                      onClick={() => setSelectedCardForPrint(card)}
                      className="text-teal-600 hover:text-teal-700 font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Повна картка (А4)</span>
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: DAILY LOG */}
        {/* ========================================================================= */}
        {activeTab === 'daily_log' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  <span>Журнал щоденного обліку роботи вчителя-логопеда</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Фіксація індивідуальних, підгрупових занять та консультацій за нормами МОН України.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportDailyLogExcel}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Експорт в Excel</span>
                </button>
                <button
                  onClick={() => {
                    setEditingDailyLog({
                      DATE: new Date().toISOString().split('T')[0],
                      ACTIVITY_TYPE: 'Індивідуальне заняття',
                      CATEGORY: 'Діти',
                      TARGET_NAME: '',
                      GROUP_NAME: 'Група «Калинка»',
                      SOUND_TARGET: '[Р]',
                      TOPIC: 'Постановка та автоматизація звука у складах',
                      HOURS_SPENT: 0.5,
                      RESULTS_NOTES: ''
                    });
                    setIsDailyLogModalOpen(true);
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Додати запис</span>
                </button>
              </div>
            </div>

            {/* Daily Log Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Дата</th>
                      <th className="p-3">Вид діяльності</th>
                      <th className="p-3">Цільова група / Дитина</th>
                      <th className="p-3">Звук</th>
                      <th className="p-3">Тема та зміст роботи</th>
                      <th className="p-3 text-center">Тривалість</th>
                      <th className="p-3">Результати</th>
                      <th className="p-3 text-right">Дії</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredDailyLogs.map(entry => (
                      <tr key={entry.ID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {entry.DATE}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            entry.ACTIVITY_TYPE === 'Індивідуальне заняття'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : entry.ACTIVITY_TYPE === 'Підгрупове заняття'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : entry.ACTIVITY_TYPE === 'Логопедичне обстеження (скринінг)'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {entry.ACTIVITY_TYPE}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                          {entry.TARGET_NAME}
                          {entry.GROUP_NAME && (
                            <span className="block text-[10px] text-slate-400">{entry.GROUP_NAME}</span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-teal-700 dark:text-teal-300">
                          {entry.SOUND_TARGET || '—'}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300 max-w-xs">
                          {entry.TOPIC}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {entry.HOURS_SPENT} год
                          <span className="block text-[10px] text-slate-400 font-normal">
                            ({Math.round(entry.HOURS_SPENT * 60)} хв)
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 text-[11px] max-w-xs">
                          {entry.RESULTS_NOTES || '—'}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              setEditingDailyLog(entry);
                              setIsDailyLogModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded transition cursor-pointer mr-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDailyLog(entry.ID)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: ARTICULATION EXERCISES & RHYMES */}
        {/* ========================================================================= */}
        {activeTab === 'exercises' && (
          <div className="space-y-4">
            {/* Header & Filter */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span>Банк артикуляційних вправ та чистомовок</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Покрокові методики розвитку мовленнєвого апарату для занять у садку та домашніх завдань батькам.
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setExerciseCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    exerciseCategoryFilter === 'all'
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Всі ({exercises.length})
                </button>
                <button
                  onClick={() => setExerciseCategoryFilter('tongue')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    exerciseCategoryFilter === 'tongue'
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Для язика
                </button>
                <button
                  onClick={() => setExerciseCategoryFilter('lips')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    exerciseCategoryFilter === 'lips'
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Для губ
                </button>
                <button
                  onClick={() => setExerciseCategoryFilter('breathing')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    exerciseCategoryFilter === 'breathing'
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Дихання
                </button>
                <button
                  onClick={() => setExerciseCategoryFilter('rhymes')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    exerciseCategoryFilter === 'rhymes'
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Чистомовки
                </button>
              </div>
            </div>

            {/* Exercises Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExercises.map(ex => (
                <div
                  key={ex.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-teal-400/60 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                          {getExerciseIcon(ex.icon)}
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          {ex.category === 'lips' ? 'Вправи для губ'
                            : ex.category === 'tongue' ? 'Вправи для язика'
                            : ex.category === 'breathing' ? 'Дихальні вправи'
                            : 'Чистомовки'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {ex.targetSounds.map(snd => (
                          <span key={snd} className="px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold text-[10px]">
                            [{snd}]
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-base font-black text-slate-900 dark:text-white">
                        {ex.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">{ex.purpose}</p>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed">
                      {ex.description}
                    </p>

                    <div>
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Покрокова інструкція:
                      </div>
                      <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400 list-disc list-inside">
                        {ex.instructions.map((step, idx) => (
                          <li key={idx} className="leading-snug">{step}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
                      Повтор: {ex.repetition}
                    </span>
                    <button
                      onClick={() => setSelectedExerciseForPrint(ex)}
                      className="flex items-center space-x-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 rounded-lg font-bold transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Друк для батьків</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: ANNUAL SPEECH REPORT */}
        {/* ========================================================================= */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-teal-600" />
                  <span>Річний звіт результативності корекційно-розвиткової роботи</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Офіційний документ учителю-логопеду для подачі директору КЗДО КТ №145 КМР Павлухіній Н.Г.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <select
                  value={academicYear}
                  onChange={e => setAcademicYear(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                >
                  <option value="2024/2025 н.р.">2024/2025 н.р.</option>
                  <option value="2025/2026 н.р.">2025/2026 н.р.</option>
                  <option value="2026/2027 н.р.">2026/2027 н.р.</option>
                </select>
                <button
                  onClick={() => setIsAnnualReportPrintOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Друкувати звіт А4</span>
                </button>
              </div>
            </div>

            {/* Document Preview Container */}
            <div className="bg-white text-slate-900 p-8 rounded-2xl border border-slate-300 shadow-md font-serif text-xs space-y-6">
              {/* Header Letterhead */}
              <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                <div>
                  <div className="font-bold">УКРАЇНА</div>
                  <div>МІНІСТЕРСТВО ОСВІТИ І НАУКИ УКРАЇНИ</div>
                  <div className="font-bold uppercase text-teal-950">
                    КОМУНАЛЬНИЙ ЗАКЛАД ДОШКІЛЬНОЇ ОСВІТИ (ЯСЛА-САДОК) КОМБІНОВАНОГО ТИПУ №145 КРИВОРІЗЬКОЇ МІСЬКОЇ РАДИ
                  </div>
                  <div className="text-[10px] text-slate-600 font-sans">
                    ЄДРПОУ: 26136748 | м. Кривий Ріг, вул. Перлинна 23А
                  </div>
                </div>
                <div className="text-right">
                  <div><b>ЗАТВЕРДЖУЮ</b></div>
                  <div>Директор КЗДО №145</div>
                  <div className="mt-1">________________ / Павлухіна Н. Г.</div>
                  <div className="text-[10px] text-slate-500 font-sans">«_____» ____________ 2026 р.</div>
                </div>
              </div>

              <div className="text-center pt-2">
                <h2 className="text-base font-bold uppercase tracking-wider">
                  ЗВІТ ПРО РЕЗУЛЬТАТИВНІСТЬ КОРЕКЦІЙНО-РОЗВИТКОВОЇ РОБОТИ ВЧИТЕЛЯ-ЛОГОПЕДА
                </h2>
                <div className="font-sans text-xs text-slate-600 mt-0.5">
                  за підсумками {academicYear} навчального року
                </div>
              </div>

              {/* Section 1 */}
              <div className="space-y-2">
                <h3 className="font-bold uppercase border-b pb-1 text-slate-800">
                  1. Кількісний аналіз контингенту дітей із порушеннями мовлення:
                </h3>
                <div className="font-sans grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-3 bg-slate-50 rounded-xl border">
                    <div className="text-[10px] text-slate-500">Всього на обліку:</div>
                    <div className="text-lg font-bold">{diagnosticsSummary.total} дітей</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border">
                    <div className="text-[10px] text-slate-500">Автоматизовано (випуск):</div>
                    <div className="text-lg font-bold text-emerald-700">{diagnosticsSummary.dynamicsBreakdown.completed} дітей</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border">
                    <div className="text-[10px] text-slate-500">Позитивна динаміка:</div>
                    <div className="text-lg font-bold text-blue-700">{diagnosticsSummary.dynamicsBreakdown.positive} дітей</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border">
                    <div className="text-[10px] text-slate-500">Продовжують корекцію:</div>
                    <div className="text-lg font-bold text-amber-700">{diagnosticsSummary.dynamicsBreakdown.slow} дітей</div>
                  </div>
                </div>
              </div>

              {/* Section 2 */}
              <div className="space-y-2">
                <h3 className="font-bold uppercase border-b pb-1 text-slate-800">
                  2. Результативність подолання дефектів звуковимови:
                </h3>
                <p className="font-sans leading-relaxed">
                  Протягом року корекційній роботі підлягало <b>{correctionRate.totalSounds}</b> дефектних звуків.
                  У результаті систематичних індивідуальних та підгрупових занять повністю відновлено та введено у вільне мовлення <b>{correctionRate.automatedSounds}</b> звуків (<b>{correctionRate.ratePct}%</b> успішності).
                </p>
              </div>

              {/* Signatures */}
              <div className="pt-8 flex justify-between items-center text-xs font-sans">
                <div>
                  Вчитель-логопед: ____________________ / ____________________ /
                </div>
                <div>
                  Директор КЗДО №145: ____________________ / Павлухіна Н. Г. /
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: EDIT / CREATE SPEECH CARD */}
      {/* ========================================================================= */}
      {isCardModalOpen && editingCard && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs p-3 z-50 flex items-center justify-center overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-teal-600" />
                <span>{editingCard.ID ? 'Редагування мовленнєвої картки' : 'Нова мовленнєва картка дитини'}</span>
              </h3>
              <button
                onClick={() => setIsCardModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ПІБ дитини *</label>
                  <input
                    type="text"
                    required
                    value={editingCard.CHILD_NAME || ''}
                    onChange={e => setEditingCard(prev => ({ ...prev, CHILD_NAME: e.target.value }))}
                    placeholder="Наприклад: Коваленко Софія Дмитрівна"
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Група ДНЗ *</label>
                  <input
                    type="text"
                    value={editingCard.GROUP_NAME || ''}
                    onChange={e => setEditingCard(prev => ({ ...prev, GROUP_NAME: e.target.value }))}
                    placeholder="Група «Калинка»"
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Дата народження</label>
                  <input
                    type="date"
                    value={editingCard.BIRTH_DATE || ''}
                    onChange={e => setEditingCard(prev => ({ ...prev, BIRTH_DATE: e.target.value }))}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Мовленнєвий діагноз / висновок *</label>
                  <select
                    value={editingCard.DIAGNOSIS || 'ФФНМ'}
                    onChange={e => setEditingCard(prev => ({ ...prev, DIAGNOSIS: e.target.value as SpeechDiagnosisType }))}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="ФФНМ">ФФНМ</option>
                    <option value="ЗНМ I рівень">ЗНМ I рівень</option>
                    <option value="ЗНМ II рівень">ЗНМ II рівень</option>
                    <option value="ЗНМ III рівень">ЗНМ III рівень</option>
                    <option value="Дислалія">Дислалія</option>
                    <option value="Дизартрія">Дизартрія</option>
                    <option value="Заїкання">Заїкання</option>
                    <option value="Ринолалія">Ринолалія</option>
                    <option value="Норма">Норма</option>
                  </select>
                </div>
              </div>

              {/* Sound statuses editor */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Статус звуковимови (налаштування етапу корекції для кожного звука):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto">
                  {SOUND_LIST.map(({ sound, group }) => {
                    const existing = editingCard.SOUND_STATUSES?.find(s => s.sound === sound);
                    const currentStage: SoundCorrectionStage = existing?.stage || 'Введено в мовлення (Норма)';

                    return (
                      <div key={sound} className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex flex-col justify-between space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-teal-700 dark:text-teal-300">{sound}</span>
                          <span className="text-[9px] text-slate-400">{group}</span>
                        </div>
                        <select
                          value={currentStage}
                          onChange={e => {
                            const newStage = e.target.value as SoundCorrectionStage;
                            const rest = (editingCard.SOUND_STATUSES || []).filter(s => s.sound !== sound);
                            setEditingCard(prev => ({
                              ...prev,
                              SOUND_STATUSES: [...rest, { sound, group, stage: newStage }]
                            }));
                          }}
                          className="w-full text-[10px] p-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        >
                          {CORRECTION_STAGES.map(stg => (
                            <option key={stg} value={stg}>{stg}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Будова артикуляційного апарату</label>
                <textarea
                  rows={2}
                  value={editingCard.ARTICULATION_APPARATUS || ''}
                  onChange={e => setEditingCard(prev => ({ ...prev, ARTICULATION_APPARATUS: e.target.value }))}
                  placeholder="Стан прикусу, зубів, під'язикової зв'язки, язика та губ..."
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Фонематичний слух</label>
                  <textarea
                    rows={2}
                    value={editingCard.PHONEMIC_HEARING || ''}
                    onChange={e => setEditingCard(prev => ({ ...prev, PHONEMIC_HEARING: e.target.value }))}
                    placeholder="Сприймання фонем, розрізнення звуків..."
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Динаміка корекції</label>
                  <select
                    value={editingCard.DYNAMICS || 'Стабільний стан'}
                    onChange={e => setEditingCard(prev => ({ ...prev, DYNAMICS: e.target.value as any }))}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="Позитивна динаміка">Позитивна динаміка</option>
                    <option value="Повільний поступ">Повільний поступ</option>
                    <option value="Стабільний стан">Стабільний стан</option>
                    <option value="Звуки автоматизовано (Норма)">Звуки автоматизовано (Норма)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Індивідуальний план корекційної роботи</label>
                <textarea
                  rows={2}
                  value={editingCard.INDIVIDUAL_PLAN || ''}
                  onChange={e => setEditingCard(prev => ({ ...prev, INDIVIDUAL_PLAN: e.target.value }))}
                  placeholder="Заходи артикуляційної гімнастики, постановки звуків, розвитку мовлення..."
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Розгорнутий висновок логопеда</label>
                <textarea
                  rows={2}
                  value={editingCard.LOGOPED_CONCLUSION || ''}
                  onChange={e => setEditingCard(prev => ({ ...prev, LOGOPED_CONCLUSION: e.target.value }))}
                  placeholder="Висновки та рекомендації вчителя-логопеда..."
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCardModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="flex items-center space-x-1 px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-md transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Зберегти картку</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT / CREATE DAILY LOG ENTRY */}
      {/* ========================================================================= */}
      {isDailyLogModalOpen && editingDailyLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs p-3 z-50 flex items-center justify-center overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-teal-600" />
                <span>{editingDailyLog.ID ? 'Редагувати запис журналу' : 'Новий запис щоденного журналу'}</span>
              </h3>
              <button
                onClick={() => setIsDailyLogModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDailyLog} className="space-y-3.5 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Дата *</label>
                  <input
                    type="date"
                    required
                    value={editingDailyLog.DATE || ''}
                    onChange={e => setEditingDailyLog(prev => ({ ...prev, DATE: e.target.value }))}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Тип діяльності *</label>
                  <select
                    value={editingDailyLog.ACTIVITY_TYPE || 'Індивідуальне заняття'}
                    onChange={e => setEditingDailyLog(prev => ({ ...prev, ACTIVITY_TYPE: e.target.value as any }))}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="Індивідуальне заняття">Індивідуальне заняття</option>
                    <option value="Підгрупове заняття">Підгрупове заняття</option>
                    <option value="Логопедичне обстеження (скринінг)">Логопедичне обстеження (скринінг)</option>
                    <option value="Консультація батьків">Консультація батьків</option>
                    <option value="Консультація вихователів">Консультація вихователів</option>
                    <option value="Організаційно-методична робота">Організаційно-методична робота</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Цільова група / Дитина *</label>
                  <input
                    type="text"
                    required
                    value={editingDailyLog.TARGET_NAME || ''}
                    onChange={e => setEditingDailyLog(prev => ({ ...prev, TARGET_NAME: e.target.value }))}
                    placeholder="ПІБ дитини або підгрупа"
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Звуки в роботі</label>
                  <input
                    type="text"
                    value={editingDailyLog.SOUND_TARGET || ''}
                    onChange={e => setEditingDailyLog(prev => ({ ...prev, SOUND_TARGET: e.target.value }))}
                    placeholder="Наприклад: [Р], [Рь] або [Ш]"
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Тема та зміст проведеної роботи *</label>
                <textarea
                  rows={2}
                  required
                  value={editingDailyLog.TOPIC || ''}
                  onChange={e => setEditingDailyLog(prev => ({ ...prev, TOPIC: e.target.value }))}
                  placeholder="Опишіть вправи, прийоми постановки чи диференціації звуків..."
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Тривалість (години) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    max="8"
                    required
                    value={editingDailyLog.HOURS_SPENT ?? 0.5}
                    onChange={e => setEditingDailyLog(prev => ({ ...prev, HOURS_SPENT: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                  <span className="text-[10px] text-slate-400">0.33 = 20 хв, 0.5 = 30 хв, 0.67 = 40 хв</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Група ДНЗ</label>
                  <input
                    type="text"
                    value={editingDailyLog.GROUP_NAME || ''}
                    onChange={e => setEditingDailyLog(prev => ({ ...prev, GROUP_NAME: e.target.value }))}
                    placeholder="Група «Калинка»"
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Результати, висновки, примітки</label>
                <input
                  type="text"
                  value={editingDailyLog.RESULTS_NOTES || ''}
                  onChange={e => setEditingDailyLog(prev => ({ ...prev, RESULTS_NOTES: e.target.value }))}
                  placeholder="Результат засвоєння пози або чистомовки..."
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDailyLogModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="flex items-center space-x-1 px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-md transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Зберегти запис</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PRINTABLE SPEECH CARD (А4 З БЛАНКОМ ЗДО №145) */}
      {/* ========================================================================= */}
      {selectedCardForPrint && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs p-2 sm:p-6 z-50 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center py-4">
            <div className="bg-white text-slate-900 rounded-2xl max-w-3xl w-full p-8 shadow-2xl border border-slate-300 flex flex-col font-serif relative">
              {/* No-print Action Controls */}
              <div className="flex items-center justify-between pb-4 mb-6 border-b no-print">
                <div className="text-xs font-sans text-slate-500">
                  Перегляд Мовленнєвої картки дитини у форматі друку А4
                </div>
                <div className="flex items-center space-x-2 font-sans">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Друкувати А4</span>
                  </button>
                  <button
                    onClick={() => setSelectedCardForPrint(null)}
                    className="p-2 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* A4 Letterhead */}
              <div className="border-b-2 border-slate-900 pb-3 mb-6">
                <div className="flex justify-between items-start text-xs mb-3">
                  <div>
                    <div className="font-bold">УКРАЇНА</div>
                    <div>МІНІСТЕРСТВО ОСВІТИ І НАУКИ УКРАЇНИ</div>
                    <div className="font-bold uppercase text-teal-950">
                      КОМУНАЛЬНИЙ ЗАКЛАД ДОШКІЛЬНОЇ ОСВІТИ (ЯСЛА-САДОК) КОМБІНОВАНОГО ТИПУ №145 КРИВОРІЗЬКОЇ МІСЬКОЇ РАДИ
                    </div>
                    <div className="text-[10px] text-slate-600 font-sans">
                      ЄДРПОУ: 26136748 | м. Кривий Ріг, вул. Перлинна 23А
                    </div>
                  </div>
                  <div className="text-right font-sans text-xs">
                    <div><b>ЗАТВЕРДЖУЮ</b></div>
                    <div>Директор КЗДО №145</div>
                    <div className="mt-1">________________ / Павлухіна Н. Г.</div>
                    <div className="text-[10px] text-slate-500">«_____» ____________ 2026 р.</div>
                  </div>
                </div>
                <div className="text-center pt-2">
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 inline-block mb-1">
                    Логопедична служба • Форма первинного обліку
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 leading-snug">
                    МОВЛЕННЄВА КАРТКА ДИТИНИ
                  </h2>
                </div>
              </div>

              {/* Child Info Block */}
              <div className="grid grid-cols-2 gap-4 text-xs font-sans pb-4 border-b border-slate-200">
                <div>
                  <span className="text-slate-500">ПІБ дитини: </span>
                  <span className="font-bold text-slate-900 text-sm">{selectedCardForPrint.CHILD_NAME}</span>
                </div>
                <div>
                  <span className="text-slate-500">Група: </span>
                  <span className="font-bold text-slate-900">{selectedCardForPrint.GROUP_NAME}</span>
                </div>
                <div>
                  <span className="text-slate-500">Дата народження: </span>
                  <span className="font-bold text-slate-900">{selectedCardForPrint.BIRTH_DATE}</span>
                </div>
                <div>
                  <span className="text-slate-500">Дата зарахування: </span>
                  <span className="font-bold text-slate-900">{selectedCardForPrint.ENROLLMENT_DATE}</span>
                </div>
              </div>

              {/* Main Diagnostic Data */}
              <div className="space-y-4 pt-4 text-xs">
                <div>
                  <span className="font-bold uppercase text-slate-800">1. Мовленнєвий діагноз / висновок: </span>
                  <span className="font-sans font-bold text-teal-900 text-sm ml-2 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {selectedCardForPrint.DIAGNOSIS}
                  </span>
                </div>

                <div>
                  <div className="font-bold uppercase text-slate-800 mb-1">2. Будова артикуляційного апарату:</div>
                  <div className="font-sans p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    {selectedCardForPrint.ARTICULATION_APPARATUS}
                  </div>
                </div>

                <div>
                  <div className="font-bold uppercase text-slate-800 mb-1">3. Фонематичне сприймання та слух:</div>
                  <div className="font-sans p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    {selectedCardForPrint.PHONEMIC_HEARING}
                  </div>
                </div>

                {/* Sounds Matrix Table */}
                <div>
                  <div className="font-bold uppercase text-slate-800 mb-1">4. Стан звуковимови та етапи корекції:</div>
                  <table className="w-full text-left font-sans text-xs border border-slate-300">
                    <thead className="bg-slate-100 font-bold border-b border-slate-300">
                      <tr>
                        <th className="p-2 border-r border-slate-300">Звук</th>
                        <th className="p-2 border-r border-slate-300">Група</th>
                        <th className="p-2 border-r border-slate-300">Етап корекційно-розвиткової роботи</th>
                        <th className="p-2">Примітки</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedCardForPrint.SOUND_STATUSES.map(s => (
                        <tr key={s.sound}>
                          <td className="p-2 border-r border-slate-300 font-bold text-teal-800">{s.sound}</td>
                          <td className="p-2 border-r border-slate-300">{s.group}</td>
                          <td className="p-2 border-r border-slate-300 font-semibold">{s.stage}</td>
                          <td className="p-2 text-slate-500">{s.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <div className="font-bold uppercase text-slate-800 mb-1">5. Індивідуальна програма корекції:</div>
                  <div className="font-sans p-2 bg-slate-50 border border-slate-200 rounded-lg whitespace-pre-wrap">
                    {selectedCardForPrint.INDIVIDUAL_PLAN}
                  </div>
                </div>

                <div>
                  <div className="font-bold uppercase text-slate-800 mb-1">6. Висновок учителя-логопеда та рекомендації:</div>
                  <div className="font-sans p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    {selectedCardForPrint.LOGOPED_CONCLUSION}
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-8 flex justify-between items-center text-xs font-sans border-t border-slate-200 mt-6">
                <div>
                  Вчитель-логопед: ____________________ / ____________________ /
                </div>
                <div>
                  Директор КЗДО №145: ____________________ / Павлухіна Н. Г. /
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PRINTABLE EXERCISE FOR PARENTS */}
      {/* ========================================================================= */}
      {selectedExerciseForPrint && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs p-2 sm:p-6 z-50 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center py-4">
            <div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full p-8 shadow-2xl border border-slate-300 flex flex-col font-serif relative">
              <div className="flex items-center justify-between pb-4 mb-4 border-b no-print">
                <div className="text-xs font-sans text-slate-500">
                  Друк логопедичного домашнього завдання для батьків А4
                </div>
                <div className="flex items-center space-x-2 font-sans">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center space-x-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Друкувати А4</span>
                  </button>
                  <button
                    onClick={() => setSelectedExerciseForPrint(null)}
                    className="p-2 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Letterhead */}
              <div className="border-b-2 border-slate-900 pb-2 mb-4 text-center">
                <div className="text-[10px] uppercase font-bold text-teal-900">
                  Комунальний заклад дошкільної освіти (ясла-садок) комбінованого типу №145 КМР
                </div>
                <div className="text-[9px] text-slate-500 font-sans">
                  м. Кривий Ріг, вул. Перлинна 23А • Логопедичний кабінет
                </div>
                <h3 className="text-base font-bold uppercase mt-2">
                  ДОМАШНЄ ЛОГОПЕДИЧНЕ ЗАВДАННЯ ДЛЯ БАТЬКІВ
                </h3>
              </div>

              <div className="space-y-4 text-xs font-sans">
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
                  <div className="font-bold text-teal-950 text-sm flex items-center justify-between">
                    <span>{selectedExerciseForPrint.title}</span>
                    <span className="text-xs font-semibold text-teal-700">
                      Звуки: {selectedExerciseForPrint.targetSounds.map(s => `[${s}]`).join(', ')}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1">{selectedExerciseForPrint.purpose}</p>
                </div>

                <div>
                  <div className="font-bold text-slate-800 mb-1">Опис та техніка виконання:</div>
                  <p className="p-3 bg-slate-50 border rounded-xl leading-relaxed text-slate-700">
                    {selectedExerciseForPrint.description}
                  </p>
                </div>

                <div>
                  <div className="font-bold text-slate-800 mb-1">Покрокова інструкція для дитини:</div>
                  <ol className="p-3 bg-slate-50 border rounded-xl space-y-1 list-decimal list-inside text-slate-700">
                    {selectedExerciseForPrint.instructions.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                  <b>Рекомендований режим занять: </b>
                  {selectedExerciseForPrint.repetition}. Займайтеся перед дзеркалом щодня по 5-7 хвилин у формі гри!
                </div>

                <div className="pt-6 flex justify-between items-center text-[11px] text-slate-500 border-t mt-4">
                  <div>Вчитель-логопед КЗДО №145</div>
                  <div>Підпис батьків про ознайомлення: ______________</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PRINTABLE ANNUAL REPORT */}
      {/* ========================================================================= */}
      {isAnnualReportPrintOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs p-2 sm:p-6 z-50 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center py-4">
            <div className="bg-white text-slate-900 rounded-2xl max-w-3xl w-full p-8 shadow-2xl border border-slate-300 flex flex-col font-serif relative">
              <div className="flex items-center justify-between pb-4 mb-4 border-b no-print">
                <div className="text-xs font-sans text-slate-500">
                  Друк Річного звіту вчителя-логопеда А4
                </div>
                <div className="flex items-center space-x-2 font-sans">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center space-x-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Друкувати А4</span>
                  </button>
                  <button
                    onClick={() => setIsAnnualReportPrintOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Content */}
              <div className="space-y-6 text-xs font-sans">
                <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start font-serif">
                  <div>
                    <div className="font-bold">УКРАЇНА</div>
                    <div>МІНІСТЕРСТВО ОСВІТИ І НАУКИ УКРАЇНИ</div>
                    <div className="font-bold uppercase text-teal-950">
                      КОМУНАЛЬНИЙ ЗАКЛАД ДОШКІЛЬНОЇ ОСВІТИ (ЯСЛА-САДОК) КОМБІНОВАНОГО ТИПУ №145 КРИВОРІЗЬКОЇ МІСЬКОЇ РАДИ
                    </div>
                    <div className="text-[10px] text-slate-600 font-sans">
                      ЄДРПОУ: 26136748 | м. Кривий Ріг, вул. Перлинна 23А
                    </div>
                  </div>
                  <div className="text-right">
                    <div><b>ЗАТВЕРДЖУЮ</b></div>
                    <div>Директор КЗДО №145</div>
                    <div className="mt-1">________________ / Павлухіна Н. Г.</div>
                    <div className="text-[10px] text-slate-500">«_____» ____________ 2026 р.</div>
                  </div>
                </div>

                <div className="text-center pt-2">
                  <h2 className="text-base font-bold uppercase tracking-wider font-serif">
                    ЗВІТ ПРО РЕЗУЛЬТАТИВНІСТЬ КОРЕКЦІЙНО-РОЗВИТКОВОЇ РОБОТИ ВЧИТЕЛЯ-ЛОГОПЕДА
                  </h2>
                  <div className="text-xs text-slate-600 mt-0.5">
                    за {academicYear}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border rounded-xl leading-relaxed whitespace-pre-wrap font-mono text-[11px]">
                  {generateSpeechAnnualReportText({
                    cards: speechCards,
                    academicYear,
                    institutionName: 'Криворізький заклад дошкільної освіти комбінованого типу №145 КМР',
                    directorName: 'Павлухіна Н.Г.'
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Workflow Guide Modal */}
      <WorkflowGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        title="Алгоритм роботи вчителя-логопеда в системі SADOK"
        steps={logopedWorkflowSteps}
      />
    </div>
  );
};
