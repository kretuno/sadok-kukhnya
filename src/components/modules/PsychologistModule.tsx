import { SearchableSelect } from "../common/SearchableSelect";
import { WorkflowGuideModal, WorkflowStep } from "../common/WorkflowGuideModal";
import React, { useState, useEffect } from 'react';
import { APP_VERSION } from '../../config/version';
import {
  Brain,
  Plus,
  Search,
  FileText,
  Printer,
  Smile,
  GraduationCap,
  Users,
  MessageSquare,
  BarChart3,
  ChevronRight,
  X,
  Edit2,
  Trash2,
  Download,
  Save,
  Sparkles,
  FolderOpen,
  Layout,
  Maximize2,
  HelpCircle,
  Clock,
  ShieldAlert,
  BookOpen,
  HeartPulse,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Award,
  FileCheck,
  Eye
} from 'lucide-react';
import {
  DATABASE_SYNC_EVENT,
  getChildren,
  getPsychologyAdaptations,
  savePsychologyAdaptation,
  deletePsychologyAdaptation,
  getSchoolReadinessAssessments,
  saveSchoolReadinessAssessment,
  deleteSchoolReadinessAssessment,
  getPsychologyConsultations,
  savePsychologyConsultation,
  deletePsychologyConsultation,
  getPsychologySummaryReports,
  savePsychologySummaryReport,
  deletePsychologySummaryReport,
  generateDefaultReport210,
  getPsychologyDailyLogEntries,
  savePsychologyDailyLogEntry,
  deletePsychologyDailyLogEntry,
  getPsychologySpecialSupportEntries,
  savePsychologySpecialSupportEntry,
  deletePsychologySpecialSupportEntry,
  getPsychologyMemos
} from '../../services/db';
import { exportToExcel } from '../../services/export';
import {
  SadokChild,
  PsychologyAdaptationRecord,
  SchoolReadinessAssessment,
  PsychologyConsultation,
  PsychologySummaryReport,
  PsychologyReportRow,
  PsychologyDailyLogEntry,
  PsychologyDailyActivityType,
  PsychologyDailyCategory,
  PsychologySpecialSupportEntry,
  PsychologySpecialCategory,
  PsychologyDynamicStatus,
  PsychologyMemo
} from '../../types';
import {
  calculateWeeklyWorkload,
  tallySpecialSupport
} from '../../domain/psychologist';

export const PsychologistModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'daily_log' | 'mental_health' | 'adaptation' | 'readiness' | 'consultations' | 'recommendations' | 'reports' | 'conclusions'
  >('overview');
  
  // Data state
  const [children, setChildren] = useState<SadokChild[]>([]);
  const [adaptations, setAdaptations] = useState<PsychologyAdaptationRecord[]>([]);
  const [readinessList, setReadinessList] = useState<SchoolReadinessAssessment[]>([]);
  const [consultations, setConsultations] = useState<PsychologyConsultation[]>([]);
  const [reportsList, setReportsList] = useState<PsychologySummaryReport[]>([]);
  const [dailyLogs, setDailyLogs] = useState<PsychologyDailyLogEntry[]>([]);
  const [specialSupports, setSpecialSupports] = useState<PsychologySpecialSupportEntry[]>([]);
  const [memos, setMemos] = useState<PsychologyMemo[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [dailyActivityFilter, setDailyActivityFilter] = useState<string>('all');
  const [specialSupportFilter, setSpecialSupportFilter] = useState<string>('all');
  const [memoAudienceFilter, setMemoAudienceFilter] = useState<string>('all');

  // Reports state
  const [selectedReportId, setSelectedReportId] = useState<number>(1);
  const [activeReportYear, setActiveReportYear] = useState<string>('2024/2025 н.р.');
  const [currentReport, setCurrentReport] = useState<PsychologySummaryReport | null>(null);

  // Print settings state
  const [printOrientation, setPrintOrientation] = useState<'landscape' | 'portrait'>('landscape');

  // Modals state
  const [isDailyLogModalOpen, setIsDailyLogModalOpen] = useState(false);
  const [editingDailyLog, setEditingDailyLog] = useState<Partial<PsychologyDailyLogEntry> | null>(null);

  const [isSpecialSupportModalOpen, setIsSpecialSupportModalOpen] = useState(false);
  const [editingSpecialSupport, setEditingSpecialSupport] = useState<Partial<PsychologySpecialSupportEntry> | null>(null);

  const [selectedMemoForPrint, setSelectedMemoForPrint] = useState<PsychologyMemo | null>(null);

  const [isAdaptationModalOpen, setIsAdaptationModalOpen] = useState(false);
  const [editingAdaptation, setEditingAdaptation] = useState<Partial<PsychologyAdaptationRecord> | null>(null);

  const [isReadinessModalOpen, setIsReadinessModalOpen] = useState(false);
  const [editingReadiness, setEditingReadiness] = useState<Partial<SchoolReadinessAssessment> | null>(null);

  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [editingConsultation, setEditingConsultation] = useState<Partial<PsychologyConsultation> | null>(null);

  const [selectedChildForReport, setSelectedChildForReport] = useState<SadokChild | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Load initial data
  const loadData = () => {
    const ch = getChildren();
    setChildren(ch);
    const ad = getPsychologyAdaptations();
    setAdaptations(ad);
    const rd = getSchoolReadinessAssessments();
    setReadinessList(rd);
    const cs = getPsychologyConsultations();
    setConsultations(cs);
    const dl = getPsychologyDailyLogEntries();
    setDailyLogs(dl);
    const ss = getPsychologySpecialSupportEntries();
    setSpecialSupports(ss);
    const mm = getPsychologyMemos();
    setMemos(mm);
    
    const rps = getPsychologySummaryReports();
    setReportsList(rps);
    if (rps.length > 0) {
      setCurrentReport(rps[0]);
      setSelectedReportId(rps[0].ID);
      setActiveReportYear(rps[0].ACADEMIC_YEAR);
    } else {
      const def = generateDefaultReport210('2024/2025 н.р.');
      setCurrentReport(def);
    }

    if (ch.length > 0 && !selectedChildForReport) {
      setSelectedChildForReport(ch[0]);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener(DATABASE_SYNC_EVENT, loadData);
    return () => window.removeEventListener(DATABASE_SYNC_EVENT, loadData);
  }, []);

  // Unique groups list
  const groupsList = Array.from(new Set(children.map(c => c.GROUP_NAME).filter(Boolean)));

  // Filtered lists
  const filteredDailyLogs = dailyLogs.filter(d => {
    const matchesSearch = d.CONTENT_TOPIC.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.TARGET_NAME.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (d.GROUP_NAME && d.GROUP_NAME.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesGroup = selectedGroup === 'all' || d.GROUP_NAME === selectedGroup;
    const matchesActivity = dailyActivityFilter === 'all' || d.ACTIVITY_TYPE === dailyActivityFilter;
    return matchesSearch && matchesGroup && matchesActivity;
  });

  const filteredSpecialSupports = specialSupports.filter(s => {
    const matchesSearch = s.CHILD_NAME.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.GROUP_NAME.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.SHELTER_BEHAVIOR.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.INDIVIDUAL_PLAN.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.CATEGORY.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = selectedGroup === 'all' || s.GROUP_NAME === selectedGroup;
    const matchesCat = specialSupportFilter === 'all' || s.CATEGORY === specialSupportFilter;
    return matchesSearch && matchesGroup && matchesCat;
  });

  const filteredMemos = memos.filter(m => {
    const matchesAudience = memoAudienceFilter === 'all' || m.targetAudience === memoAudienceFilter;
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAudience && matchesSearch;
  });

  const filteredAdaptations = adaptations.filter(a => {
    const matchesSearch = a.CHILD_NAME.toLowerCase().includes(searchQuery.toLowerCase()) || a.GROUP_NAME.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = selectedGroup === 'all' || a.GROUP_NAME === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  const filteredReadiness = readinessList.filter(r => {
    const matchesSearch = r.CHILD_NAME.toLowerCase().includes(searchQuery.toLowerCase()) || r.GROUP_NAME.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = selectedGroup === 'all' || r.GROUP_NAME === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  const filteredConsultations = consultations.filter(c => {
    const matchesSearch = c.TARGET_NAME.toLowerCase().includes(searchQuery.toLowerCase()) || c.TOPIC.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = selectedGroup === 'all' || c.GROUP_NAME === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  // Workload calculations (МОН України)
  const workload = calculateWeeklyWorkload(dailyLogs);
  const supportTally = tallySpecialSupport(specialSupports);

  // Handlers for Adaptation
  const handleSaveAdaptation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdaptation?.CHILD_ID) {
      alert('Будь ласка, оберіть дитину');
      return;
    }
    const targetChild = children.find(c => c.ID === editingAdaptation.CHILD_ID);
    if (!targetChild) return;

    savePsychologyAdaptation({
      ...editingAdaptation,
      CHILD_NAME: targetChild.FULL_NAME,
      GROUP_NAME: targetChild.GROUP_NAME
    } as any);

    setAdaptations(getPsychologyAdaptations());
    setIsAdaptationModalOpen(false);
    setEditingAdaptation(null);
  };

  const handleDeleteAdaptation = (id: number) => {
    if (confirm('Видалити картку адаптації?')) {
      deletePsychologyAdaptation(id);
      setAdaptations(getPsychologyAdaptations());
    }
  };

  // Handlers for Readiness Assessment
  const handleSaveReadiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReadiness?.CHILD_ID) {
      alert('Будь ласка, оберіть дитину');
      return;
    }
    const targetChild = children.find(c => c.ID === editingReadiness.CHILD_ID);
    if (!targetChild) return;

    saveSchoolReadinessAssessment({
      ...editingReadiness,
      CHILD_NAME: targetChild.FULL_NAME,
      GROUP_NAME: targetChild.GROUP_NAME
    } as any);

    setReadinessList(getSchoolReadinessAssessments());
    setIsReadinessModalOpen(false);
    setEditingReadiness(null);
  };

  const handleDeleteReadiness = (id: number) => {
    if (confirm('Видалити картку готовності до школи?')) {
      deleteSchoolReadinessAssessment(id);
      setReadinessList(getSchoolReadinessAssessments());
    }
  };

  // Handlers for Consultations
  const handleSaveConsultation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConsultation?.TARGET_NAME || !editingConsultation?.TOPIC) {
      alert('Будь ласка, заповніть тему та учасників консультації');
      return;
    }

    savePsychologyConsultation(editingConsultation as any);
    setConsultations(getPsychologyConsultations());
    setIsConsultationModalOpen(false);
    setEditingConsultation(null);
  };

  const handleDeleteConsultation = (id: number) => {
    if (confirm('Видалити запис про консультацію?')) {
      deletePsychologyConsultation(id);
      setConsultations(getPsychologyConsultations());
    }
  };

  // Handlers for Daily Log
  const handleSaveDailyLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDailyLog?.CONTENT_TOPIC || !editingDailyLog?.HOURS_SPENT || !editingDailyLog?.ACTIVITY_TYPE) {
      alert('Будь ласка, заповніть зміст роботи, тривалість у годинах та вид діяльності');
      return;
    }
    savePsychologyDailyLogEntry(editingDailyLog as any);
    setDailyLogs(getPsychologyDailyLogEntries());
    setIsDailyLogModalOpen(false);
    setEditingDailyLog(null);
  };

  const handleDeleteDailyLog = (id: number) => {
    if (confirm('Видалити запис щоденного обліку?')) {
      deletePsychologyDailyLogEntry(id);
      setDailyLogs(getPsychologyDailyLogEntries());
    }
  };

  const handleExportDailyLogExcel = () => {
    const headers = ['ID', 'Дата', 'Напрям діяльності', 'Категорія', 'Об\'єкт / Учасники', 'Група', 'Зміст роботи', 'Години', 'Результати / Примітки'];
    const rows = filteredDailyLogs.map(d => [
      d.ID,
      d.DATE,
      d.ACTIVITY_TYPE,
      d.CATEGORY,
      d.TARGET_NAME,
      d.GROUP_NAME || '—',
      d.CONTENT_TOPIC,
      d.HOURS_SPENT,
      d.RESULTS_NOTES || ''
    ]);
    exportToExcel(
      `Журнал_щоденного_обліку_роботи_психолога_${new Date().toISOString().split('T')[0]}`,
      'Щоденний облік',
      headers,
      rows
    );
  };

  // Handlers for Special Support
  const handleSaveSpecialSupport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpecialSupport?.CHILD_ID || !editingSpecialSupport?.CATEGORY) {
      alert('Будь ласка, оберіть вихованця та категорію супроводу');
      return;
    }
    const child = children.find(c => c.ID === editingSpecialSupport.CHILD_ID);
    savePsychologySpecialSupportEntry({
      ...editingSpecialSupport,
      CHILD_NAME: child ? child.FULL_NAME : (editingSpecialSupport.CHILD_NAME || 'Невідомо'),
      GROUP_NAME: child ? child.GROUP_NAME : (editingSpecialSupport.GROUP_NAME || 'Група')
    } as any);
    setSpecialSupports(getPsychologySpecialSupportEntries());
    setIsSpecialSupportModalOpen(false);
    setEditingSpecialSupport(null);
  };

  const handleDeleteSpecialSupport = (id: number) => {
    if (confirm('Видалити картку спеціального психологічного супроводу?')) {
      deletePsychologySpecialSupportEntry(id);
      setSpecialSupports(getPsychologySpecialSupportEntries());
    }
  };

  // Report 2.10 Editing Handlers
  const handleCellChange = (rowIndex: number, field: keyof PsychologyReportRow, value: string | number) => {
    if (!currentReport) return;
    const updatedRows = [...currentReport.ROWS];
    const row = { ...updatedRows[rowIndex] };

    if (field === 'CATEGORY_NAME') {
      row.CATEGORY_NAME = String(value);
    } else {
      const numVal = Math.max(0, Number(value) || 0);
      (row as any)[field] = numVal;
      row.ROW_TOTAL = (row.INDIVIDUAL_DIAGNOSTICS || 0) +
                      (row.GROUP_DIAGNOSTICS || 0) +
                      (row.INDIVIDUAL_PROPHYLAXIS || 0) +
                      (row.GROUP_PROPHYLAXIS || 0) +
                      (row.INDIVIDUAL_CORRECTION || 0) +
                      (row.GROUP_CORRECTION || 0) +
                      (row.TRAININGS_SEMINARS || 0);
    }

    updatedRows[rowIndex] = row;
    setCurrentReport({ ...currentReport, ROWS: updatedRows });
  };

  const handleAddReportRow = () => {
    if (!currentReport) return;
    const newRow: PsychologyReportRow = {
      ID: `row_${Date.now()}`,
      CATEGORY_NAME: 'Новий напрям роботи',
      INDIVIDUAL_DIAGNOSTICS: 0,
      GROUP_DIAGNOSTICS: 0,
      INDIVIDUAL_PROPHYLAXIS: 0,
      GROUP_PROPHYLAXIS: 0,
      INDIVIDUAL_CORRECTION: 0,
      GROUP_CORRECTION: 0,
      TRAININGS_SEMINARS: 0,
      ROW_TOTAL: 0
    };
    setCurrentReport({ ...currentReport, ROWS: [...currentReport.ROWS, newRow] });
  };

  const handleDeleteReportRow = (index: number) => {
    if (!currentReport) return;
    if (currentReport.ROWS.length <= 1) {
      alert('Звіт має містити щонайменше один рядок.');
      return;
    }
    const updatedRows = currentReport.ROWS.filter((_, idx) => idx !== index);
    setCurrentReport({ ...currentReport, ROWS: updatedRows });
  };

  const handleAutoFillReport = () => {
    if (!currentReport) return;
    const updatedRows = currentReport.ROWS.map(row => {
      let indDiag = row.INDIVIDUAL_DIAGNOSTICS;
      let grpDiag = row.GROUP_DIAGNOSTICS;
      let indProph = row.INDIVIDUAL_PROPHYLAXIS;
      let grpProph = row.GROUP_PROPHYLAXIS;
      let indCorr = row.INDIVIDUAL_CORRECTION;
      let grpCorr = row.GROUP_CORRECTION;
      let train = row.TRAININGS_SEMINARS;

      if (row.CATEGORY_NAME.includes('ясельн') || row.CATEGORY_NAME.includes('1-3')) {
        indDiag = adaptations.filter(a => a.GROUP_NAME.includes('Ясельн') || a.GROUP_NAME.includes('Барвінок')).length;
        indProph = consultations.filter(c => c.TYPE === 'Консультація з батьками').length;
      } else if (row.CATEGORY_NAME.includes('старш') || row.CATEGORY_NAME.includes('5-6')) {
        indDiag = readinessList.length;
        grpDiag = readinessList.length;
        grpCorr = adaptations.filter(a => a.ADAPTATION_LEVEL === 'Важка').length;
      } else if (row.CATEGORY_NAME.includes('Батьки')) {
        indProph = consultations.filter(c => c.TYPE === 'Консультація з батьками').length;
        train = consultations.filter(c => c.TYPE === 'Групова').length * 10;
      } else if (row.CATEGORY_NAME.includes('Педагогічні')) {
        grpProph = consultations.filter(c => c.TYPE === 'Консультація з вихователем').length;
        train = consultations.filter(c => c.TYPE === 'Психопрофілактична робота').length * 8;
      }

      const total = indDiag + grpDiag + indProph + grpProph + indCorr + grpCorr + train;

      return {
        ...row,
        INDIVIDUAL_DIAGNOSTICS: indDiag,
        GROUP_DIAGNOSTICS: grpDiag,
        INDIVIDUAL_PROPHYLAXIS: indProph,
        GROUP_PROPHYLAXIS: grpProph,
        INDIVIDUAL_CORRECTION: indCorr,
        GROUP_CORRECTION: grpCorr,
        TRAININGS_SEMINARS: train,
        ROW_TOTAL: total
      };
    });

    setCurrentReport({ ...currentReport, ROWS: updatedRows });
    alert('Дані таблиці оновлено на основі журналів психологічної служби!');
  };

  const handleSaveCurrentReport = () => {
    if (!currentReport) return;
    const reportToSave: PsychologySummaryReport = {
      ...currentReport,
      ACADEMIC_YEAR: activeReportYear
    };
    const updatedList = savePsychologySummaryReport(reportToSave);
    setReportsList(updatedList);
    setCurrentReport(reportToSave);
    setSelectedReportId(reportToSave.ID);
    alert(`Звіт «${reportToSave.TITLE}» успішно збережено!`);
  };

  const handleDeleteSelectedReport = () => {
    if (!currentReport) return;
    if (reportsList.length <= 1) {
      alert('Неможливо видалити єдиний звіт.');
      return;
    }
    if (confirm(`Ви впевнені, що хочете видалити звіт «${currentReport.TITLE}»?`)) {
      const updated = deletePsychologySummaryReport(currentReport.ID);
      setReportsList(updated);
      if (updated.length > 0) {
        setCurrentReport(updated[0]);
        setSelectedReportId(updated[0].ID);
        setActiveReportYear(updated[0].ACADEMIC_YEAR);
      }
    }
  };

  const handleExportReportExcel = () => {
    if (!currentReport) return;
    const headers = [
      'Напрями роботи Фахівців',
      'Індивідуальна діагностика, охоплено осіб',
      'Групова діагностика соціально-психологічні/педагогічні дослідження, охоплено осіб',
      'Профілактика (індивідуальна), охоплено осіб',
      'Профілактика (групова), охоплено осіб',
      'Корекційна (індивідуальна), охоплено осіб',
      'Корекційна (групова), охоплено осіб',
      'Проведення ділових ігор, тренінгів, охоплено осіб'
    ];

    const dataRows = currentReport.ROWS.map(r => [
      r.CATEGORY_NAME,
      r.INDIVIDUAL_DIAGNOSTICS,
      r.GROUP_DIAGNOSTICS,
      r.INDIVIDUAL_PROPHYLAXIS,
      r.GROUP_PROPHYLAXIS,
      r.INDIVIDUAL_CORRECTION,
      r.GROUP_CORRECTION,
      r.TRAININGS_SEMINARS
    ]);

    // Totals row
    dataRows.push([
      'УСЬОГО',
      currentReport.ROWS.reduce((s, r) => s + r.INDIVIDUAL_DIAGNOSTICS, 0),
      currentReport.ROWS.reduce((s, r) => s + r.GROUP_DIAGNOSTICS, 0),
      currentReport.ROWS.reduce((s, r) => s + r.INDIVIDUAL_PROPHYLAXIS, 0),
      currentReport.ROWS.reduce((s, r) => s + r.GROUP_PROPHYLAXIS, 0),
      currentReport.ROWS.reduce((s, r) => s + r.INDIVIDUAL_CORRECTION, 0),
      currentReport.ROWS.reduce((s, r) => s + r.GROUP_CORRECTION, 0),
      currentReport.ROWS.reduce((s, r) => s + r.TRAININGS_SEMINARS, 0)
    ]);

    exportToExcel(`Zvit_2.10_${activeReportYear.replace('/', '_')}`, 'Звіт 2.10 ГОРОНО', headers, dataRows);
  };

  const handleCreateNewReport = () => {
    const title = prompt('Введіть назву нового звіту:', `Форма 2.10 (Звіт №${reportsList.length + 1})`);
    if (!title) return;
    const year = prompt('Введіть навчальний рік:', activeReportYear) || activeReportYear;
    
    // First, auto-save the current report if modified
    if (currentReport) {
      savePsychologySummaryReport(currentReport);
    }

    const newRep = generateDefaultReport210(year);
    newRep.ID = Date.now();
    newRep.TITLE = title;

    const updated = savePsychologySummaryReport(newRep);
    setReportsList(updated);
    setCurrentReport(newRep);
    setSelectedReportId(newRep.ID);
    setActiveReportYear(year);
    alert(`Створено новий звіт «${title}»! Всі ваші попередні звіти збережені у списку.`);
  };

  // Print helper
  const handlePrintReport = () => {
    window.print();
  };

  // Stats calculation
  const totalTracked = adaptations.length;
  const easyAdaptationCount = adaptations.filter(a => a.ADAPTATION_LEVEL === 'Легка').length;
  const mediumAdaptationCount = adaptations.filter(a => a.ADAPTATION_LEVEL === 'Середня').length;
  const hardAdaptationCount = adaptations.filter(a => a.ADAPTATION_LEVEL === 'Важка').length;
  const readyForSchoolCount = readinessList.filter(r => r.READINESS_STATUS.includes('Готовий')).length;

  const psychologistWorkflowSteps: WorkflowStep[] = [
    {
      number: 1,
      title: 'Крок 1. Перевірка контингенту дітей (у модулі Кадри)',
      description: 'Усі діти підтягуються з єдиного реєстру «Контингент». Переконайтеся, що вихованці внесені до закладу та розподілені по групах.',
      details: [
        'Для карток адаптації потрібні діти раннього віку (ясла/молодша група)',
        'Для діагностики готовності до школи потрібні діти старших груп (5-7 років)'
      ]
    },
    {
      number: 2,
      title: 'Крок 2. Моніторинг адаптації та готовності до школи',
      description: 'Створюйте щотижневі спостереження адаптації новоприбулих дітей (тижні 1–8) та оцінюйте мотиваційну, інтелектуальну й соціальну готовність випускників.',
      details: [
        'Автоматичний розрахунок відсотка легкої, середньої та важкої адаптації',
        'Формування персонального висновку психолога для батьків та вихователів'
      ]
    },
    {
      number: 3,
      title: 'Крок 3. Журнал консультацій та звіт 2.10 (ГОРОНО)',
      description: 'Фіксуйте індивідуальні та групові бесіди з батьками/педагогами та формуйте річний аналітичний звіт.',
      details: [
        'Кнопка «Автозаповнення звіту» автоматично підраховує кількість діагностик і консультацій',
        'Експорт у формат Excel та офіційний друк для атестації'
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Dynamic Page Print Orientation CSS Injection */}
      <style dangerouslySetInnerHTML={{
        __html: `@media print { @page { size: A4 ${printOrientation}; margin: 6mm 8mm; } }`
      }} />

      {/* Module Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print shrink-0 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-600/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-2xl border border-purple-200 dark:border-purple-800/50">
            <Brain className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                SADOK Психолог
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                v{APP_VERSION}
              </span>
              <button
                onClick={() => setIsGuideOpen(true)}
                className="p-1 rounded-full bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/60 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 transition flex items-center justify-center shadow-xs hover:scale-105"
                title="Покрокова інструкція: з чого почати та як заповнювати"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Моніторинг адаптації, готовність до школи, журнал консультацій та офіційні звіти (ГОРОНО)
            </p>
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex items-center space-x-2">
          {activeTab === 'daily_log' && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportDailyLogExcel}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
              <button
                onClick={() => {
                  setEditingDailyLog({
                    DATE: new Date().toISOString().split('T')[0],
                    ACTIVITY_TYPE: 'Діагностична',
                    CATEGORY: 'Діти',
                    TARGET_NAME: '',
                    CONTENT_TOPIC: '',
                    HOURS_SPENT: 1.5,
                    RESULTS_NOTES: ''
                  });
                  setIsDailyLogModalOpen(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium text-xs shadow-md transition"
              >
                <Plus className="w-4 h-4" />
                <span>Записати щоденну роботу</span>
              </button>
            </div>
          )}

          {activeTab === 'mental_health' && (
            <button
              onClick={() => {
                setEditingSpecialSupport({
                  CHILD_ID: children[0]?.ID || 0,
                  CATEGORY: 'ООП (ІПР / Інклюзія)',
                  DIAGNOSTIC_DATE: new Date().toISOString().split('T')[0],
                  ANXIETY_SCORE: 3,
                  STRESS_REACTION: '',
                  SHELTER_BEHAVIOR: '',
                  INDIVIDUAL_PLAN: '',
                  DYNAMIC_STATUS: 'Стабільний стан'
                });
                setIsSpecialSupportModalOpen(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium text-xs shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Додати картку супроводу</span>
            </button>
          )}

          {activeTab === 'adaptation' && (
            <button
              onClick={() => {
                setEditingAdaptation({
                  CHILD_ID: children[0]?.ID || 0,
                  START_DATE: new Date().toISOString().split('T')[0],
                  WEEK_NUMBER: 1,
                  EMOTIONAL_STATE: 'Позитивний',
                  ANXIETY_LEVEL: 'Низький',
                  APPETITE: 'Хороший',
                  SLEEP: 'Спокійний',
                  SOCIAL_INTERACTION: 'Активна',
                  ADAPTATION_LEVEL: 'Легка'
                });
                setIsAdaptationModalOpen(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium text-xs shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Додати карту адаптації</span>
            </button>
          )}

          {activeTab === 'readiness' && (
            <button
              onClick={() => {
                setEditingReadiness({
                  CHILD_ID: children[0]?.ID || 0,
                  ASSESSMENT_DATE: new Date().toISOString().split('T')[0],
                  AGE_YEARS: 6,
                  MOTIVATIONAL_SCORE: 5,
                  INTELLECTUAL_SCORE: 5,
                  EMOTIONAL_VOLITIONAL_SCORE: 5,
                  SOCIAL_SCORE: 5
                });
                setIsReadinessModalOpen(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium text-xs shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Провести діагностику готовності</span>
            </button>
          )}

          {activeTab === 'consultations' && (
            <button
              onClick={() => {
                setEditingConsultation({
                  DATE: new Date().toISOString().split('T')[0],
                  TYPE: 'Консультація з батьками',
                  STATUS: 'Проведено'
                });
                setIsConsultationModalOpen(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium text-xs shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Записати консультацію</span>
            </button>
          )}

          {activeTab === 'reports' && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Orientation selector */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setPrintOrientation('landscape')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                    printOrientation === 'landscape'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  title="Альбомна орієнтація (Landscape) - Рекомендовано для 8 колонок"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Альбомна</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintOrientation('portrait')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                    printOrientation === 'portrait'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  title="Книжна орієнтація (Portrait)"
                >
                  <Layout className="w-3.5 h-3.5" />
                  <span>Книжна</span>
                </button>
              </div>

              <button
                onClick={handleCreateNewReport}
                className="flex items-center space-x-1.5 px-3 py-2 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 rounded-xl font-bold text-xs hover:bg-purple-200 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Новий звіт</span>
              </button>
              <button
                onClick={handleAutoFillReport}
                className="flex items-center space-x-1.5 px-3 py-2 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 rounded-xl font-bold text-xs hover:bg-purple-200 transition"
                title="Автоматично розрахувати з даних журналів психолога"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Автозаповнення</span>
              </button>
              <button
                onClick={handleSaveCurrentReport}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Зберегти</span>
              </button>
              <button
                onClick={handleExportReportExcel}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
              <button
                onClick={handlePrintReport}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs shadow-md transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Друкувати А4</span>
              </button>
            </div>
          )}

          {activeTab === 'conclusions' && (
            <button
              onClick={handlePrintReport}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium text-xs shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              <span>Друкувати А4</span>
            </button>
          )}
        </div>
      </header>

      {/* Sub-navbar / Navigation Tabs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-2 flex items-center justify-between no-print shrink-0 overflow-x-auto gap-4">
        <div className="flex space-x-1 shrink-0">
          {[
            { id: 'overview', label: 'Огляд & Баланс часу', icon: BarChart3 },
            { id: 'daily_log', label: 'Щоденний облік роботи', icon: Clock, badge: dailyLogs.length },
            { id: 'mental_health', label: 'Супровід: Воєнний стан / ООП', icon: ShieldAlert, badge: specialSupports.length },
            { id: 'adaptation', label: 'Картки Адаптації', icon: Smile, badge: adaptations.length },
            { id: 'readiness', label: 'Готовність до Школи', icon: GraduationCap, badge: readinessList.length },
            { id: 'consultations', label: 'Журнал Консультацій', icon: MessageSquare, badge: consultations.length },
            { id: 'recommendations', label: 'Банк пам\'яток та порад', icon: BookOpen, badge: memos.length },
            { id: 'reports', label: 'Звіти (Форма 2.10)', icon: FileText, badge: reportsList.length },
            { id: 'conclusions', label: 'Психологічні Висновки', icon: Brain }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isActive ? 'bg-purple-800 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        {activeTab !== 'overview' && activeTab !== 'conclusions' && activeTab !== 'reports' && (
          <div className="flex items-center space-x-3 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Пошук..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 w-44"
              />
            </div>

            {/* Daily Log Activity Filter */}
            {activeTab === 'daily_log' && (
              <SearchableSelect
                value={dailyActivityFilter}
                onChange={e => setDailyActivityFilter(e.target.value)}
                className="py-1.5 px-3 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">Усі напрями роботи</option>
                <option value="Діагностична">Діагностична</option>
                <option value="Корекційно-розвиткова">Корекційно-розвиткова</option>
                <option value="Консультаційна">Консультаційна</option>
                <option value="Просвітницька">Просвітницька</option>
                <option value="Організаційно-методична">Організаційно-методична</option>
              </SearchableSelect>
            )}

            {/* Special Support Category Filter */}
            {activeTab === 'mental_health' && (
              <SearchableSelect
                value={specialSupportFilter}
                onChange={e => setSpecialSupportFilter(e.target.value)}
                className="py-1.5 px-3 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">Усі категорії вихованців</option>
                <option value="ООП (ІПР / Інклюзія)">ООП (ІПР / Інклюзія)</option>
                <option value="ВПО (Внутрішньо переміщені)">ВПО (Внутрішньо переміщені)</option>
                <option value="Діти військовослужбовців / УБД">Діти військовослужбовців / УБД</option>
                <option value="Підвищена тривожність / Стрес">Підвищена тривожність / Стрес</option>
                <option value="Діти з кризових сімей / СЖО">Діти з кризових сімей / СЖО</option>
              </SearchableSelect>
            )}

            {/* Recommendations Audience Filter */}
            {activeTab === 'recommendations' && (
              <SearchableSelect
                value={memoAudienceFilter}
                onChange={e => setMemoAudienceFilter(e.target.value)}
                className="py-1.5 px-3 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">Усі адресати</option>
                <option value="Батькам">Батькам</option>
                <option value="Вихователям">Вихователям</option>
                <option value="Для укриття (ДСНС/Психолог)">Для укриття (ДСНС/Психолог)</option>
              </SearchableSelect>
            )}

            {/* Group Filter (when relevant) */}
            {activeTab !== 'recommendations' && (
              <SearchableSelect
                value={selectedGroup}
                onChange={e => setSelectedGroup(e.target.value)}
                className="py-1.5 px-3 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">Усі групи</option>
                {groupsList.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </SearchableSelect>
            )}
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* TAB 1: OVERVIEW & STATS */}
        {activeTab === 'overview' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Вихованців під наглядом</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{children.length}</div>
                  <div className="text-[11px] text-purple-600 dark:text-purple-400 mt-0.5">у {groupsList.length} групах ЗДО</div>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Супровід (ООП / ВПО / СЖО)</div>
                  <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{supportTally.total}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{supportTally.oopCount} ООП • {supportTally.vpoCount} ВПО • {supportTally.militaryFamilyCount} сім'ї ЗСУ</div>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl">
                  <ShieldAlert className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Легка адаптація</div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{easyAdaptationCount}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">з {totalTracked} оцінених дітей</div>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Smile className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Готові до школи</div>
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{readyForSchoolCount}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">з {readinessList.length} випускників</div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
                  <GraduationCap className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Workload Balance Widget (МОН України: 20 год / 20 год) */}
            <div className="p-6 bg-gradient-to-br from-purple-900 to-slate-900 text-white rounded-3xl shadow-lg border border-purple-800/40">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-purple-800/60 pb-4 mb-5">
                <div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-purple-300" />
                    <h2 className="text-base font-bold tracking-tight">Тижневий баланс навантаження практичного психолога</h2>
                  </div>
                  <p className="text-xs text-purple-200/80 mt-1">
                    Норматив МОН України: ставка 40 год/тиждень (20 год практичної роботи + 20 год організаційно-методичної)
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('daily_log')}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white rounded-xl text-xs font-bold transition shadow flex items-center space-x-1.5 self-start md:self-auto"
                >
                  <span>Відкрити щоденний журнал</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Practical Work Block (20h norm) */}
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-purple-200">1. Практична робота з дітьми та учасниками</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      workload.isPracticalFulfilled ? 'bg-emerald-500 text-white' : 'bg-purple-700 text-purple-100'
                    }`}>
                      {workload.practicalHours} / 20 год
                    </span>
                  </div>
                  <div className="w-full bg-purple-950/60 rounded-full h-3 overflow-hidden mb-2">
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${workload.practicalProgressPct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-purple-200/70">
                    Діагностика, корекційно-розвиткові заняття, консультації батьків та просвітницька робота з вихователями.
                  </p>
                </div>

                {/* Methodological Work Block (20h norm) */}
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-purple-200">2. Організаційно-методична діяльність</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      workload.isMethodologicalFulfilled ? 'bg-emerald-500 text-white' : 'bg-purple-700 text-purple-100'
                    }`}>
                      {workload.methodologicalHours} / 20 год
                    </span>
                  </div>
                  <div className="w-full bg-purple-950/60 rounded-full h-3 overflow-hidden mb-2">
                    <div
                      className="bg-blue-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${workload.methodologicalProgressPct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-purple-200/70">
                    Оформлення документації, ведення ІПР дітей з ООП, підготовка стимульного матеріалу, психолого-педагогічні консиліуми.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions & Sections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Special support (ООП / ВПО / Укриття) */}
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-bold mb-3">
                    <ShieldAlert className="w-5 h-5" />
                    <span>Супровід в умовах воєнного стану</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                    Психологічний супровід дітей ООП, ВПО, сімей захисників та алгоритми стабілізації в укритті ЗДО №145 під час тривоги.
                  </p>
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                      <span>Інклюзія / ООП (ІПР):</span>
                      <span className="font-bold text-purple-600">{supportTally.oopCount}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                      <span>Внутрішньо переміщені (ВПО):</span>
                      <span className="font-bold text-blue-600">{supportTally.vpoCount}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1">
                      <span>Діти військовослужбовців:</span>
                      <span className="font-bold text-amber-600">{supportTally.militaryFamilyCount}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('mental_health')}
                  className="w-full py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold rounded-xl text-xs hover:bg-rose-100 transition flex items-center justify-center space-x-1"
                >
                  <span>Перейти до супроводу</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Card 2: Memos Bank */}
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 font-bold mb-3">
                    <BookOpen className="w-5 h-5" />
                    <span>Банк пам'яток та порад</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                    Готові практичні рекомендації для батьків та вихователів з можливістю друку на офіційному бланку закладу.
                  </p>
                  <div className="space-y-1.5 mb-4">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs border border-purple-200 dark:border-purple-900">
                      <div className="font-semibold text-purple-900 dark:text-purple-200">6 готових пам'яток</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Адаптація, поведінка в укритті, СДУГ, криза 3 років, дитячі страхи</div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('recommendations')}
                  className="w-full py-2 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold rounded-xl text-xs hover:bg-purple-100 transition flex items-center justify-center space-x-1"
                >
                  <span>Відкрити банк пам'яток</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Card 3: Official Reports (ГОРОНО) */}
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold mb-3">
                    <FileText className="w-5 h-5" />
                    <span>Звіти (Форма 2.10 ГОРОНО)</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                    Зведені дані щодо роботи працівників психологічної служби за навчальний рік.
                  </p>
                  <div className="space-y-1.5 mb-4">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs border border-indigo-200 dark:border-indigo-900">
                      <div className="font-semibold text-indigo-900 dark:text-indigo-200">Офіційна Форма 2.10</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">8 нормативних колонок з автопідрахунком та друком А4</div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('reports')}
                  className="w-full py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold rounded-xl text-xs hover:bg-indigo-100 transition flex items-center justify-center space-x-1"
                >
                  <span>Відкрити розділ Звіти</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ЖУРНАЛ ЩОДЕННОГО ОБЛІКУ РОБОТИ (МОН УКРАЇНИ) */}
        {activeTab === 'daily_log' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            {/* Top Summary Banner */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span>Журнал щоденного обліку роботи практичного психолога</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Офіційна фіксація діяльності за напрямами: Діагностична, Корекційно-розвиткова, Консультаційна, Просвітницька, Організаційно-методична
                </p>
              </div>
              <div className="flex items-center space-x-3 text-xs">
                <div className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 rounded-xl border border-purple-200 dark:border-purple-800">
                  <span className="font-bold">Практична: </span>
                  <span>{workload.practicalHours} / 20 год</span>
                </div>
                <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-xl border border-blue-200 dark:border-blue-800">
                  <span className="font-bold">Методична: </span>
                  <span>{workload.methodologicalHours} / 20 год</span>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Дата</th>
                      <th className="py-3 px-4">Вид діяльності</th>
                      <th className="py-3 px-4">Категорія</th>
                      <th className="py-3 px-4">Об'єкт / Учасники</th>
                      <th className="py-3 px-4">Зміст проведеної роботи</th>
                      <th className="py-3 px-4 text-center">Години</th>
                      <th className="py-3 px-4">Результати / примітки</th>
                      <th className="py-3 px-4 text-right">Дії</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredDailyLogs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                          Записів не знайдено за обраними фільтрами. Натисніть «Записати щоденну роботу», щоб додати.
                        </td>
                      </tr>
                    ) : (
                      filteredDailyLogs.map(item => {
                        const activityBadgeColor =
                          item.ACTIVITY_TYPE === 'Діагностична' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                          item.ACTIVITY_TYPE === 'Корекційно-розвиткова' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                          item.ACTIVITY_TYPE === 'Консультаційна' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          item.ACTIVITY_TYPE === 'Просвітницька' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';

                        return (
                          <tr key={item.ID} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                              {item.DATE}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-block whitespace-nowrap ${activityBadgeColor}`}>
                                {item.ACTIVITY_TYPE}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {item.CATEGORY}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                              <div>{item.TARGET_NAME}</div>
                              {item.GROUP_NAME && (
                                <div className="text-[10px] text-slate-400">{item.GROUP_NAME}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-xs sm:max-w-sm">
                              {item.CONTENT_TOPIC}
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              {item.HOURS_SPENT} год
                            </td>
                            <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px] max-w-xs">
                              {item.RESULTS_NOTES || '—'}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end space-x-1">
                                <button
                                  onClick={() => {
                                    setEditingDailyLog(item);
                                    setIsDailyLogModalOpen(true);
                                  }}
                                  className="p-1 text-slate-400 hover:text-purple-600 transition"
                                  title="Редагувати"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteDailyLog(item.ID)}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition"
                                  title="Видалити"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ПСИХОЛОГІЧНИЙ СУПРОВІД (ВОЄННИЙ СТАН, ООП ТА ВПО) */}
        {activeTab === 'mental_health' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Shelter Emergency Protocol Banner */}
            <div className="p-5 bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-purple-500/15 rounded-2xl border border-amber-300 dark:border-amber-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-300 font-bold text-sm">
                  <ShieldAlert className="w-5 h-5" />
                  <span>Протокол психологічної безпеки в укритті ЗДО №145 (Кривий Ріг)</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-3xl">
                  Під час сигналу повітряної тривоги: 1) Спокій дорослого • 2) Заземлення «5-4-3-2-1» • 3) Дихання «Здуй свічку» 4х4 • 4) Тактильний куточок релаксу та аудіоказки
                </p>
              </div>
              <button
                onClick={() => {
                  const shelterMemo = memos.find(m => m.id === 'memo_shelter_air_raid');
                  if (shelterMemo) setSelectedMemoForPrint(shelterMemo);
                }}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow shrink-0 flex items-center space-x-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Пам'ятка укриття А4</span>
              </button>
            </div>

            {/* Special Support Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSpecialSupports.length === 0 ? (
                <div className="col-span-2 py-12 text-center text-slate-400 italic bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  Карток спеціального супроводу за обраними критеріями не знайдено.
                </div>
              ) : (
                filteredSpecialSupports.map(item => {
                  const dynamicColor =
                    item.DYNAMIC_STATUS === 'Позитивна динаміка' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                    item.DYNAMIC_STATUS === 'Стабільний стан' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                    item.DYNAMIC_STATUS === 'Потребує посиленої уваги' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                    'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';

                  return (
                    <div
                      key={item.ID}
                      className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-purple-300 dark:hover:border-purple-800 transition"
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{item.CHILD_NAME}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{item.GROUP_NAME}</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 whitespace-nowrap">
                            {item.CATEGORY}
                          </span>
                        </div>

                        {/* Anxiety & Reactions */}
                        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Рівень тривожності:</span>
                            <div className="flex items-center space-x-1 mt-0.5">
                              {[1, 2, 3, 4, 5].map(score => (
                                <span
                                  key={score}
                                  className={`w-2.5 h-2.5 rounded-full ${
                                    score <= item.ANXIETY_SCORE
                                      ? (item.ANXIETY_SCORE >= 4 ? 'bg-rose-500' : item.ANXIETY_SCORE === 3 ? 'bg-amber-500' : 'bg-emerald-500')
                                      : 'bg-slate-200 dark:bg-slate-700'
                                  }`}
                                />
                              ))}
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 ml-1.5">
                                {item.ANXIETY_SCORE} / 5
                              </span>
                            </div>
                          </div>

                          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Динаміка стану:</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 inline-block ${dynamicColor}`}>
                              {item.DYNAMIC_STATUS}
                            </span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100">Реакція на стрес / сирени: </span>
                            <span>{item.STRESS_REACTION}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100">Поведінка в укритті: </span>
                            <span className="text-purple-700 dark:text-purple-300">{item.SHELTER_BEHAVIOR}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100">Індивідуальний план / ІПР: </span>
                            <span>{item.INDIVIDUAL_PLAN}</span>
                          </div>
                          {item.NOTES && (
                            <div className="text-[11px] text-slate-500 italic mt-1">
                              Примітка: {item.NOTES}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Оновлено: {item.UPDATED_AT}</span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => {
                              setEditingSpecialSupport(item);
                              setIsSpecialSupportModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-purple-600 transition"
                            title="Редагувати"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSpecialSupport(item.ID)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                            title="Видалити"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ADAPTATION CARDS */}
        {activeTab === 'adaptation' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAdaptations.map(item => (
                <div key={item.ID} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">{item.CHILD_NAME}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.GROUP_NAME}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        item.ADAPTATION_LEVEL === 'Легка' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        item.ADAPTATION_LEVEL === 'Середня' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {item.ADAPTATION_LEVEL} адаптація
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="text-slate-400 block text-[10px]">Емоційний стан:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{item.EMOTIONAL_STATE}</span>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="text-slate-400 block text-[10px]">Рівень тривожності:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{item.ANXIETY_LEVEL}</span>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="text-slate-400 block text-[10px]">Апетит:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{item.APPETITE}</span>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="text-slate-400 block text-[10px]">Сон:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{item.SLEEP}</span>
                      </div>
                    </div>

                    {item.RECOMMENDATIONS && (
                      <div className="mt-3 p-2.5 bg-purple-50 dark:bg-purple-950/30 rounded-xl text-xs text-purple-900 dark:text-purple-200 border border-purple-100 dark:border-purple-900/50">
                        <span className="font-bold">Рекомендації: </span>
                        {item.RECOMMENDATIONS}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>Тиждень {item.WEEK_NUMBER} (початок {item.START_DATE})</span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => { setEditingAdaptation(item); setIsAdaptationModalOpen(true); }}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"
                        title="Редагувати"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAdaptation(item.ID)}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg text-rose-600"
                        title="Видалити"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredAdaptations.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
                Картки адаптації за заданими критеріями не знайдені.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SCHOOL READINESS */}
        {activeTab === 'readiness' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredReadiness.map(item => (
                <div key={item.ID} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">{item.CHILD_NAME}</h3>
                        <p className="text-xs text-slate-500">{item.GROUP_NAME} • {item.AGE_YEARS} років</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-purple-600 dark:text-purple-400">{item.TOTAL_SCORE}/20</span>
                        <div className="text-[10px] font-bold text-slate-400">Загальний бал</div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        item.READINESS_STATUS.includes('Високий') ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        item.READINESS_STATUS.includes('Достатній') ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                        'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {item.READINESS_STATUS}
                      </span>
                    </div>

                    {/* Spheres breakdown */}
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg flex justify-between">
                        <span>Мотиваційна:</span>
                        <span className="font-bold">{item.MOTIVATIONAL_SCORE}/5</span>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg flex justify-between">
                        <span>Інтелектуальна:</span>
                        <span className="font-bold">{item.INTELLECTUAL_SCORE}/5</span>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg flex justify-between">
                        <span>Емоційно-вольова:</span>
                        <span className="font-bold">{item.EMOTIONAL_VOLITIONAL_SCORE}/5</span>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg flex justify-between">
                        <span>Соціальна:</span>
                        <span className="font-bold">{item.SOCIAL_SCORE}/5</span>
                      </div>
                    </div>

                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">Психологічний висновок:</div>
                      <p className="text-slate-600 dark:text-slate-400">{item.PSYCHOLOGIST_CONCLUSION}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>Дата діагностики: {item.ASSESSMENT_DATE}</span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => { setEditingReadiness(item); setIsReadinessModalOpen(true); }}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteReadiness(item.ID)}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredReadiness.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
                Записи про готовність до школи не знайдені.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CONSULTATIONS LOG */}
        {activeTab === 'consultations' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Дата</th>
                    <th className="px-4 py-3">Тип</th>
                    <th className="px-4 py-3">Учасник / Група</th>
                    <th className="px-4 py-3">Тема консультації</th>
                    <th className="px-4 py-3">Рекомендації</th>
                    <th className="px-4 py-3">Статус</th>
                    <th className="px-4 py-3 text-right">Дії</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredConsultations.map(c => (
                    <tr key={c.ID} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">{c.DATE}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          {c.TYPE}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{c.TARGET_NAME}</td>
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-medium max-w-xs truncate">{c.TOPIC}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{c.RECOMMENDATIONS || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.STATUS === 'Проведено' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {c.STATUS}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                        <button
                          onClick={() => { setEditingConsultation(c); setIsConsultationModalOpen(true); }}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteConsultation(c.ID)}
                          className="p-1 hover:bg-rose-50 rounded text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredConsultations.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-sm">
                  Журнал консультацій порожній.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: БАНК ПАМ'ЯТОК ТА ПОРАД ДЛЯ БАТЬКІВ І ПЕДАГОГІВ */}
        {activeTab === 'recommendations' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header info banner */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  <span>Банк практичних пам'яток та порад психологічної служби</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Офіційні розробки практичного психолога Криворізького КЗДО КТ №145 КМР для батьків та вихователів. Будь-яку пам'ятку можна роздрукувати на бланку закладу або зберегти у PDF.
                </p>
              </div>
              <div className="text-xs font-semibold px-3 py-1.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-xl border border-purple-200 dark:border-purple-800">
                Всього пам'яток у банку: {memos.length}
              </div>
            </div>

            {/* Memos Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredMemos.map(memo => (
                <div
                  key={memo.id}
                  className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-purple-400 dark:hover:border-purple-700 transition"
                >
                  <div>
                    {/* Tags */}
                    <div className="flex items-center space-x-2 mb-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        memo.targetAudience === 'Батькам' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                        memo.targetAudience === 'Вихователям' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                        'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {memo.targetAudience}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {memo.category}
                      </span>
                    </div>

                    {/* Title & Summary */}
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2 leading-snug">
                      {memo.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">
                      {memo.summary}
                    </p>

                    {/* Preview of tips */}
                    <div className="space-y-1.5 mb-4 text-xs">
                      {memo.tips.slice(0, 3).map((tip, idx) => (
                        <div key={idx} className="flex items-start space-x-1.5 text-slate-700 dark:text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 text-[11px]">{tip}</span>
                        </div>
                      ))}
                      {memo.tips.length > 3 && (
                        <p className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold pl-5">
                          + ще {memo.tips.length - 3} практичні рекомендації у повному тексті
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Формат: А4</span>
                    <button
                      onClick={() => setSelectedMemoForPrint(memo)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Читати та друкувати А4</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: REPORTS (ЗВІТИ) - EXACT 1 IN 1 GORONO FORMAT WITH COMPACT PRINT FIT */}
        {activeTab === 'reports' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header selector for reports catalog & academic year */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-2">
                  <FolderOpen className="w-4 h-4 text-purple-600" />
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Реєстр збережених звітів ({reportsList.length}):
                  </label>
                  <SearchableSelect
                    value={selectedReportId}
                    onChange={e => {
                      const id = Number(e.target.value);
                      setSelectedReportId(id);
                      const rep = reportsList.find(r => r.ID === id);
                      if (rep) {
                        setCurrentReport(rep);
                        setActiveReportYear(rep.ACADEMIC_YEAR);
                      }
                    }}
                    className="py-1.5 px-3 text-xs bg-slate-100 dark:bg-slate-800 border rounded-xl font-bold text-purple-900 dark:text-purple-200 max-w-md"
                  >
                    {reportsList.map(r => (
                      <option key={r.ID} value={r.ID}>{r.TITLE} ({r.ACADEMIC_YEAR})</option>
                    ))}
                  </SearchableSelect>
                </div>

                <div className="flex items-center space-x-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Навчальний рік:
                  </label>
                  <SearchableSelect
                    value={activeReportYear}
                    onChange={e => {
                      setActiveReportYear(e.target.value);
                      if (currentReport) {
                        setCurrentReport({ ...currentReport, ACADEMIC_YEAR: e.target.value });
                      }
                    }}
                    className="py-1.5 px-3 text-xs bg-slate-100 dark:bg-slate-800 border rounded-xl font-bold text-slate-800 dark:text-slate-200"
                  >
                    <option value="2024/2025 н.р.">2024/2025 н.р.</option>
                    <option value="2025/2026 н.р.">2025/2026 н.р.</option>
                    <option value="2026/2027 н.р.">2026/2027 н.р.</option>
                  </SearchableSelect>
                </div>

                {reportsList.length > 1 && (
                  <button
                    onClick={handleDeleteSelectedReport}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-900 transition"
                    title="Видалити цей звіт із реєстру"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
                <span>✓ Повний захист від розриву сторінок при друку</span>
              </div>
            </div>

            {/* Editable & Printable Table Form 2.10 - EXACT REPLICA 1 IN 1 WITH SINGLE PAGE FIT */}
            {currentReport && (
              <div className="bg-white text-slate-900 p-6 md:p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 print:shadow-none print:border-none print:p-0 print-single-page">
                
                {/* Official 1-in-1 Header from DOCX */}
                <div className="mb-4 print:mb-2 border-b pb-3 print:pb-1.5 print:border-b-2 print:border-black">
                  <div className="text-xs font-bold text-slate-600 print:text-black mb-0.5">
                    ЗВЕДЕНИЙ ЗВІТ ПСИХОЛОГІЧНОЇ СЛУЖБИ ЗДО
                  </div>
                  <h2 className="text-base md:text-lg font-bold text-slate-900 print:text-black leading-tight print:text-sm">
                    2.10. Зведені дані щодо роботи працівників психологічної служби у {currentReport.ACADEMIC_YEAR} з дітьми
                  </h2>
                </div>

                {/* Table 1 in 1 as in docx file */}
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full text-left text-xs border-collapse border border-black font-sans print:font-serif">
                    <thead>
                      <tr className="bg-slate-100 print:bg-slate-200 text-slate-900 font-bold text-center border-b border-black">
                        <th className="border border-black px-2 py-2 print:py-1 font-bold text-left min-w-[200px]">
                          Напрями роботи Фахівців
                        </th>
                        <th className="border border-black px-1 py-2 print:py-1 font-bold text-center max-w-[120px]">
                          Індивідуальна діагностика, охоплено осіб
                        </th>
                        <th className="border border-black px-1 py-2 print:py-1 font-bold text-center max-w-[150px]">
                          Групова діагностика соціально-психологічні/педагогічні дослідження, охоплено осіб
                        </th>
                        <th className="border border-black px-1 py-2 print:py-1 font-bold text-center max-w-[120px]">
                          Профілактика (індивідуальна), охоплено осіб
                        </th>
                        <th className="border border-black px-1 py-2 print:py-1 font-bold text-center max-w-[120px]">
                          Профілактика (групова), охоплено осіб
                        </th>
                        <th className="border border-black px-1 py-2 print:py-1 font-bold text-center max-w-[120px]">
                          Корекційна (індивідуальна), охоплено осіб
                        </th>
                        <th className="border border-black px-1 py-2 print:py-1 font-bold text-center max-w-[120px]">
                          Корекційна (групова), охоплено осіб
                        </th>
                        <th className="border border-black px-1 py-2 print:py-1 font-bold text-center max-w-[140px]">
                          Проведення ділових ігор, тренінгів, охоплено осіб
                        </th>
                        <th className="border border-black px-2 py-2 text-center font-bold bg-purple-50 text-purple-950 w-24 no-print">
                          Разом осіб
                        </th>
                        <th className="border border-black px-2 py-2 text-center no-print w-10">Дії</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentReport.ROWS.map((row, idx) => {
                        const rowSum = (Number(row.INDIVIDUAL_DIAGNOSTICS) || 0) +
                                       (Number(row.GROUP_DIAGNOSTICS) || 0) +
                                       (Number(row.INDIVIDUAL_PROPHYLAXIS) || 0) +
                                       (Number(row.GROUP_PROPHYLAXIS) || 0) +
                                       (Number(row.INDIVIDUAL_CORRECTION) || 0) +
                                       (Number(row.GROUP_CORRECTION) || 0) +
                                       (Number(row.TRAININGS_SEMINARS) || 0);

                        return (
                          <tr key={row.ID || idx} className="hover:bg-purple-50/20">
                            <td className="border border-black px-2 py-1 print:py-0.5">
                              <span className="hidden print:inline font-semibold">{row.CATEGORY_NAME}</span>
                              <input
                                type="text"
                                value={row.CATEGORY_NAME}
                                onChange={e => handleCellChange(idx, 'CATEGORY_NAME', e.target.value)}
                                className="w-full bg-transparent border-b border-transparent hover:border-slate-400 focus:border-purple-600 focus:bg-white px-1 py-0.5 font-medium text-slate-900 no-print"
                              />
                            </td>
                            <td className="border border-black px-1 py-1 print:py-0.5 text-center font-semibold">
                              <span className="hidden print:inline">{row.INDIVIDUAL_DIAGNOSTICS || 0}</span>
                              <input
                                type="number"
                                min={0}
                                value={row.INDIVIDUAL_DIAGNOSTICS || ''}
                                onChange={e => handleCellChange(idx, 'INDIVIDUAL_DIAGNOSTICS', e.target.value)}
                                className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-400 focus:border-purple-600 focus:bg-white font-semibold no-print"
                              />
                            </td>
                            <td className="border border-black px-1 py-1 print:py-0.5 text-center font-semibold">
                              <span className="hidden print:inline">{row.GROUP_DIAGNOSTICS || 0}</span>
                              <input
                                type="number"
                                min={0}
                                value={row.GROUP_DIAGNOSTICS || ''}
                                onChange={e => handleCellChange(idx, 'GROUP_DIAGNOSTICS', e.target.value)}
                                className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-400 focus:border-purple-600 focus:bg-white font-semibold no-print"
                              />
                            </td>
                            <td className="border border-black px-1 py-1 print:py-0.5 text-center font-semibold">
                              <span className="hidden print:inline">{row.INDIVIDUAL_PROPHYLAXIS || 0}</span>
                              <input
                                type="number"
                                min={0}
                                value={row.INDIVIDUAL_PROPHYLAXIS || ''}
                                onChange={e => handleCellChange(idx, 'INDIVIDUAL_PROPHYLAXIS', e.target.value)}
                                className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-400 focus:border-purple-600 focus:bg-white font-semibold no-print"
                              />
                            </td>
                            <td className="border border-black px-1 py-1 print:py-0.5 text-center font-semibold">
                              <span className="hidden print:inline">{row.GROUP_PROPHYLAXIS || 0}</span>
                              <input
                                type="number"
                                min={0}
                                value={row.GROUP_PROPHYLAXIS || ''}
                                onChange={e => handleCellChange(idx, 'GROUP_PROPHYLAXIS', e.target.value)}
                                className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-400 focus:border-purple-600 focus:bg-white font-semibold no-print"
                              />
                            </td>
                            <td className="border border-black px-1 py-1 print:py-0.5 text-center font-semibold">
                              <span className="hidden print:inline">{row.INDIVIDUAL_CORRECTION || 0}</span>
                              <input
                                type="number"
                                min={0}
                                value={row.INDIVIDUAL_CORRECTION || ''}
                                onChange={e => handleCellChange(idx, 'INDIVIDUAL_CORRECTION', e.target.value)}
                                className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-400 focus:border-purple-600 focus:bg-white font-semibold no-print"
                              />
                            </td>
                            <td className="border border-black px-1 py-1 print:py-0.5 text-center font-semibold">
                              <span className="hidden print:inline">{row.GROUP_CORRECTION || 0}</span>
                              <input
                                type="number"
                                min={0}
                                value={row.GROUP_CORRECTION || ''}
                                onChange={e => handleCellChange(idx, 'GROUP_CORRECTION', e.target.value)}
                                className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-400 focus:border-purple-600 focus:bg-white font-semibold no-print"
                              />
                            </td>
                            <td className="border border-black px-1 py-1 print:py-0.5 text-center font-semibold">
                              <span className="hidden print:inline">{row.TRAININGS_SEMINARS || 0}</span>
                              <input
                                type="number"
                                min={0}
                                value={row.TRAININGS_SEMINARS || ''}
                                onChange={e => handleCellChange(idx, 'TRAININGS_SEMINARS', e.target.value)}
                                className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-400 focus:border-purple-600 focus:bg-white font-semibold no-print"
                              />
                            </td>
                            <td className="border border-black px-2 py-1.5 text-center font-extrabold text-purple-950 bg-purple-50/50 no-print">
                              {rowSum}
                            </td>
                            <td className="border border-black px-1 py-1 text-center no-print">
                              <button
                                onClick={() => handleDeleteReportRow(idx)}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                                title="Видалити рядок"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Column totals */}
                    <tfoot>
                      <tr className="bg-slate-200 print:bg-slate-300 font-extrabold text-slate-900 border-t-2 border-black">
                        <td className="border border-black px-2 py-1.5 print:py-1 text-right uppercase tracking-wider">
                          УСЬОГО:
                        </td>
                        <td className="border border-black px-1 py-1.5 print:py-1 text-center">
                          {currentReport.ROWS.reduce((s, r) => s + (Number(r.INDIVIDUAL_DIAGNOSTICS) || 0), 0)}
                        </td>
                        <td className="border border-black px-1 py-1.5 print:py-1 text-center">
                          {currentReport.ROWS.reduce((s, r) => s + (Number(r.GROUP_DIAGNOSTICS) || 0), 0)}
                        </td>
                        <td className="border border-black px-1 py-1.5 print:py-1 text-center">
                          {currentReport.ROWS.reduce((s, r) => s + (Number(r.INDIVIDUAL_PROPHYLAXIS) || 0), 0)}
                        </td>
                        <td className="border border-black px-1 py-1.5 print:py-1 text-center">
                          {currentReport.ROWS.reduce((s, r) => s + (Number(r.GROUP_PROPHYLAXIS) || 0), 0)}
                        </td>
                        <td className="border border-black px-1 py-1.5 print:py-1 text-center">
                          {currentReport.ROWS.reduce((s, r) => s + (Number(r.INDIVIDUAL_CORRECTION) || 0), 0)}
                        </td>
                        <td className="border border-black px-1 py-1.5 print:py-1 text-center">
                          {currentReport.ROWS.reduce((s, r) => s + (Number(r.GROUP_CORRECTION) || 0), 0)}
                        </td>
                        <td className="border border-black px-1 py-1.5 print:py-1 text-center">
                          {currentReport.ROWS.reduce((s, r) => s + (Number(r.TRAININGS_SEMINARS) || 0), 0)}
                        </td>
                        <td className="border border-black px-2 py-1.5 text-center text-purple-950 bg-purple-100 font-black no-print">
                          {currentReport.ROWS.reduce((s, r) => {
                            return s + (Number(r.INDIVIDUAL_DIAGNOSTICS) || 0) +
                                       (Number(r.GROUP_DIAGNOSTICS) || 0) +
                                       (Number(r.INDIVIDUAL_PROPHYLAXIS) || 0) +
                                       (Number(r.GROUP_PROPHYLAXIS) || 0) +
                                       (Number(r.INDIVIDUAL_CORRECTION) || 0) +
                                       (Number(r.GROUP_CORRECTION) || 0) +
                                       (Number(r.TRAININGS_SEMINARS) || 0);
                          }, 0)}
                        </td>
                        <td className="border border-black no-print"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Button to add row */}
                <div className="mt-4 no-print flex justify-start">
                  <button
                    onClick={handleAddReportRow}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 transition"
                  >
                    <Plus className="w-4 h-4 text-purple-600" />
                    <span>Додати напрям / категорію</span>
                  </button>
                </div>

                {/* Printable Signatures footer */}
                <div className="mt-6 print:mt-4 pt-4 print:pt-2 border-t border-slate-400 flex justify-between text-xs font-bold font-serif">
                  <div>Практичний психолог ЗДО: ____________________</div>
                  <div>Директор КЗДО №145: ____________________ / Н. Г. Павлухіна</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: PRINTABLE PSYCHOLOGICAL CONCLUSION */}
        {activeTab === 'conclusions' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Child selector */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between no-print">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Оберіть вихованця для формування Картки психологічного супроводу:
              </label>
              <SearchableSelect
                value={selectedChildForReport?.ID || ''}
                onChange={e => {
                  const ch = children.find(c => c.ID === Number(e.target.value));
                  if (ch) setSelectedChildForReport(ch);
                }}
                className="py-1.5 px-3 text-xs bg-slate-100 dark:bg-slate-800 border rounded-xl font-bold text-purple-600 dark:text-purple-400"
              >
                {children.map(c => (
                  <option key={c.ID} value={c.ID}>{c.FULL_NAME} ({c.GROUP_NAME})</option>
                ))}
              </SearchableSelect>
            </div>

            {/* A4 Printable Document Area */}
            {selectedChildForReport && (() => {
              const childAdaptation = adaptations.find(a => a.CHILD_ID === selectedChildForReport.ID);
              const childReadiness = readinessList.find(r => r.CHILD_ID === selectedChildForReport.ID);
              const childSpecialSupport = specialSupports.find(s => s.CHILD_ID === selectedChildForReport.ID);
              const childConsultations = consultations.filter(c => c.CHILD_ID === selectedChildForReport.ID || c.TARGET_NAME.includes(selectedChildForReport.FULL_NAME));

              return (
                <div className="bg-white text-slate-900 p-8 rounded-2xl shadow-xl border border-slate-300 font-serif print:shadow-none print:border-none print:p-0">
                  {/* Header A4 */}
                  <div className="border-b-2 border-slate-900 pb-3 mb-5">
                    <div className="flex justify-between items-start text-xs mb-3">
                      <div>
                        <div className="font-bold">УКРАЇНА</div>
                        <div>МІНІСТЕРСТВО ОСВІТИ І НАУКИ УКРАЇНИ</div>
                        <div className="font-bold uppercase text-purple-950">КОМУНАЛЬНИЙ ЗАКЛАД ДОШКІЛЬНОЇ ОСВІТИ (ЯСЛА-САДОК) КОМБІНОВАНОГО ТИПУ №145 КРИВОРІЗЬКОЇ МІСЬКОЇ РАДИ</div>
                        <div className="text-[10px] text-slate-600">ЄДРПОУ: 26136748 | м. Кривий Ріг, вул. Перлинна 23А</div>
                      </div>
                      <div className="text-right">
                        <div><b>ЗАТВЕРДЖУЮ</b></div>
                        <div>Директор КЗДО №145</div>
                        <div className="mt-1">________________ / Н. Г. Павлухіна</div>
                        <div className="text-[10px] text-slate-500">«_____» ____________ 2026 р.</div>
                      </div>
                    </div>
                    <div className="text-center pt-2">
                      <h2 className="text-base font-bold uppercase tracking-wider">Картка Психолого-Педагогічного Супроводу Вихованця</h2>
                      <p className="text-[11px] italic text-slate-600">Психологічна служба закладу</p>
                    </div>
                  </div>

                  {/* Child Metadata */}
                  <div className="grid grid-cols-2 gap-4 text-xs mb-6 border p-4 rounded-lg bg-slate-50">
                    <div>
                      <span className="font-bold">Прізвище, ім'я вихованця: </span>
                      <span className="font-semibold text-purple-900">{selectedChildForReport.FULL_NAME}</span>
                    </div>
                    <div>
                      <span className="font-bold">Дата народження: </span>
                      <span>{selectedChildForReport.BIRTH_DATE}</span>
                    </div>
                    <div>
                      <span className="font-bold">Вікова група: </span>
                      <span>{selectedChildForReport.GROUP_NAME}</span>
                    </div>
                    <div>
                      <span className="font-bold">Батьки / Опікуни: </span>
                      <span>{selectedChildForReport.PARENT_NAME || 'Зазначено в реєстрі'}</span>
                    </div>
                  </div>

                  {/* Section 1: Adaptation */}
                  <div className="mb-6">
                    <h3 className="text-sm font-bold uppercase border-b pb-1 mb-2 text-purple-900">1. Перебіг Адаптації до ЗДО</h3>
                    {childAdaptation ? (
                      <div className="text-xs space-y-1">
                        <p><span className="font-bold">Рівень адаптації:</span> {childAdaptation.ADAPTATION_LEVEL} (Тиждень спостереження #{childAdaptation.WEEK_NUMBER})</p>
                        <p><span className="font-bold">Емоційний стан:</span> {childAdaptation.EMOTIONAL_STATE} | <span className="font-bold">Рівень тривожності:</span> {childAdaptation.ANXIETY_LEVEL}</p>
                        <p><span className="font-bold">Сон та Апетит:</span> {childAdaptation.SLEEP}, {childAdaptation.APPETITE}</p>
                        {childAdaptation.RECOMMENDATIONS && <p className="italic text-slate-700 mt-1"><span className="font-bold">Рекомендації:</span> {childAdaptation.RECOMMENDATIONS}</p>}
                      </div>
                    ) : (
                      <p className="text-xs italic text-slate-500">Первинна карта адаптації ще не заповнена.</p>
                    )}
                  </div>

                  {/* Section 2: School Readiness Assessment */}
                  <div className="mb-6">
                    <h3 className="text-sm font-bold uppercase border-b pb-1 mb-2 text-purple-900">2. Психологічна Готовність до Школи</h3>
                    {childReadiness ? (
                      <div className="text-xs space-y-2">
                        <div className="grid grid-cols-4 gap-2 text-center border p-2 bg-slate-50 rounded">
                          <div><span className="block font-bold">Мотиваційна</span>{childReadiness.MOTIVATIONAL_SCORE}/5</div>
                          <div><span className="block font-bold">Інтелектуальна</span>{childReadiness.INTELLECTUAL_SCORE}/5</div>
                          <div><span className="block font-bold">Емоц.-вольова</span>{childReadiness.EMOTIONAL_VOLITIONAL_SCORE}/5</div>
                          <div><span className="block font-bold">Соціальна</span>{childReadiness.SOCIAL_SCORE}/5</div>
                        </div>
                        <p><span className="font-bold">Загальний рівень:</span> {childReadiness.READINESS_STATUS} ({childReadiness.TOTAL_SCORE} балів з 20)</p>
                        <p><span className="font-bold">Психологічний висновок:</span> {childReadiness.PSYCHOLOGIST_CONCLUSION}</p>
                      </div>
                    ) : (
                      <p className="text-xs italic text-slate-500">Діагностика готовності до школи не проводилась.</p>
                    )}
                  </div>

                  {/* Section 3: Special support (Воєнний стан / ООП) */}
                  {childSpecialSupport && (
                    <div className="mb-6">
                      <h3 className="text-sm font-bold uppercase border-b pb-1 mb-2 text-rose-900">3. Супровід в умовах воєнного стану та ООП</h3>
                      <div className="text-xs space-y-1.5 p-3 bg-rose-50/50 rounded-lg border border-rose-200">
                        <p><span className="font-bold">Категорія:</span> {childSpecialSupport.CATEGORY} | <span className="font-bold">Динаміка стану:</span> {childSpecialSupport.DYNAMIC_STATUS}</p>
                        <p><span className="font-bold">Реакція на стрес/сирени:</span> {childSpecialSupport.STRESS_REACTION}</p>
                        <p><span className="font-bold">Поведінка в укритті ЗДО №145:</span> {childSpecialSupport.SHELTER_BEHAVIOR}</p>
                        <p><span className="font-bold">Індивідуальна програма розвитку (ІПР):</span> {childSpecialSupport.INDIVIDUAL_PLAN}</p>
                        {childSpecialSupport.NOTES && <p className="italic text-slate-600"><span className="font-bold">Примітка:</span> {childSpecialSupport.NOTES}</p>}
                      </div>
                    </div>
                  )}

                  {/* Section 4: Consultation Summary */}
                  <div className="mb-8">
                    <h3 className="text-sm font-bold uppercase border-b pb-1 mb-2 text-purple-900">
                      {childSpecialSupport ? '4. Проведені Консультації та Супровід' : '3. Проведені Консультації та Супровід'}
                    </h3>
                    {childConsultations.length > 0 ? (
                      <ul className="list-disc pl-5 text-xs space-y-1">
                        {childConsultations.map(c => (
                          <li key={c.ID}>
                            <span className="font-bold">{c.DATE} ({c.TYPE}):</span> {c.TOPIC} — {c.RECOMMENDATIONS}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs italic text-slate-500">Записи про індивідуальні консультації відсутні.</p>
                    )}
                  </div>

                  {/* Signatures */}
                  <div className="pt-8 border-t flex justify-between text-xs font-bold">
                    <div>Практичний психолог ЗДО: ___________________</div>
                    <div>Директор КЗДО №145: ___________________ / Н. Г. Павлухіна</div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* MODAL: ADAPTATION RECORD */}
      {isAdaptationModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center py-2 sm:py-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[calc(100vh-2rem)] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="flex justify-between items-center px-5 py-3.5 border-b bg-slate-900 text-white shrink-0">
                <h3 className="font-bold text-sm">
                  {editingAdaptation?.ID ? 'Редагувати картку адаптації' : 'Створити картку адаптації'}
                </h3>
                <button onClick={() => setIsAdaptationModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAdaptation} className="p-4 sm:p-6 space-y-3.5 text-xs overflow-y-auto flex-1 flex flex-col justify-between">
                <div className="space-y-3.5">
                  <div>
                    <label className="block font-bold mb-1">Вихованець</label>
                    <SearchableSelect
                      value={editingAdaptation?.CHILD_ID || ''}
                      onChange={e => setEditingAdaptation(prev => ({ ...prev, CHILD_ID: Number(e.target.value) }))}
                      className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                      required
                    >
                      {children.map(c => (
                        <option key={c.ID} value={c.ID}>{c.FULL_NAME} ({c.GROUP_NAME})</option>
                      ))}
                    </SearchableSelect>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">Тиждень спостереження</label>
                      <input
                        type="number"
                        min={1}
                        max={8}
                        value={editingAdaptation?.WEEK_NUMBER || 1}
                        onChange={e => setEditingAdaptation(prev => ({ ...prev, WEEK_NUMBER: Number(e.target.value) }))}
                        className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Рівень адаптації</label>
                      <SearchableSelect
                        value={editingAdaptation?.ADAPTATION_LEVEL || 'Легка'}
                        onChange={e => setEditingAdaptation(prev => ({ ...prev, ADAPTATION_LEVEL: e.target.value as any }))}
                        className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl font-bold"
                      >
                        <option value="Легка">Легка</option>
                        <option value="Середня">Середня</option>
                        <option value="Важка">Важка</option>
                      </SearchableSelect>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">Емоційний стан</label>
                      <SearchableSelect
                        value={editingAdaptation?.EMOTIONAL_STATE || 'Позитивний'}
                        onChange={e => setEditingAdaptation(prev => ({ ...prev, EMOTIONAL_STATE: e.target.value as any }))}
                        className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                      >
                        <option value="Позитивний">Позитивний</option>
                        <option value="Нестійкий">Нестійкий</option>
                        <option value="Негативний">Негативний</option>
                        <option value="Агресивний / Пригнічений">Агресивний / Пригнічений</option>
                      </SearchableSelect>
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Рівень тривожності</label>
                      <SearchableSelect
                        value={editingAdaptation?.ANXIETY_LEVEL || 'Низький'}
                        onChange={e => setEditingAdaptation(prev => ({ ...prev, ANXIETY_LEVEL: e.target.value as any }))}
                        className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                      >
                        <option value="Низький">Низький</option>
                        <option value="Середній">Середній</option>
                        <option value="Високий">Високий</option>
                      </SearchableSelect>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Рекомендації для вихователів та батьків</label>
                    <textarea
                      rows={3}
                      value={editingAdaptation?.RECOMMENDATIONS || ''}
                      onChange={e => setEditingAdaptation(prev => ({ ...prev, RECOMMENDATIONS: e.target.value }))}
                      className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                      placeholder="М'який режим входу, підтримка емоційного контакту..."
                    />
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2 shrink-0 sticky bottom-0 bg-white dark:bg-slate-900 z-10">
                  <button
                    type="button"
                    onClick={() => setIsAdaptationModalOpen(false)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-300 transition"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition"
                  >
                    Зберегти
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SCHOOL READINESS */}
      {isReadinessModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center py-2 sm:py-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[calc(100vh-2rem)] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="flex justify-between items-center px-5 py-3.5 border-b bg-slate-900 text-white shrink-0">
                <h3 className="font-bold text-sm">
                  Оцінка готовності до школи
                </h3>
                <button onClick={() => setIsReadinessModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveReadiness} className="p-4 sm:p-6 space-y-3.5 text-xs overflow-y-auto flex-1 flex flex-col justify-between">
                <div className="space-y-3.5">
                  <div>
                    <label className="block font-bold mb-1">Вихованець</label>
                    <SearchableSelect
                      value={editingReadiness?.CHILD_ID || ''}
                      onChange={e => setEditingReadiness(prev => ({ ...prev, CHILD_ID: Number(e.target.value) }))}
                      className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                      required
                    >
                      {children.map(c => (
                        <option key={c.ID} value={c.ID}>{c.FULL_NAME} ({c.GROUP_NAME})</option>
                      ))}
                    </SearchableSelect>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">Мотиваційна сфера (1-5)</label>
                      <input
                        type="number" min={1} max={5}
                        value={editingReadiness?.MOTIVATIONAL_SCORE || 5}
                        onChange={e => setEditingReadiness(prev => ({ ...prev, MOTIVATIONAL_SCORE: Number(e.target.value) }))}
                        className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Інтелектуальна (1-5)</label>
                      <input
                        type="number" min={1} max={5}
                        value={editingReadiness?.INTELLECTUAL_SCORE || 5}
                        onChange={e => setEditingReadiness(prev => ({ ...prev, INTELLECTUAL_SCORE: Number(e.target.value) }))}
                        className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Емоційно-вольова (1-5)</label>
                      <input
                        type="number" min={1} max={5}
                        value={editingReadiness?.EMOTIONAL_VOLITIONAL_SCORE || 5}
                        onChange={e => setEditingReadiness(prev => ({ ...prev, EMOTIONAL_VOLITIONAL_SCORE: Number(e.target.value) }))}
                        className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Соціальна сфера (1-5)</label>
                      <input
                        type="number" min={1} max={5}
                        value={editingReadiness?.SOCIAL_SCORE || 5}
                        onChange={e => setEditingReadiness(prev => ({ ...prev, SOCIAL_SCORE: Number(e.target.value) }))}
                        className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Психологічний висновок</label>
                    <textarea
                      rows={2}
                      value={editingReadiness?.PSYCHOLOGIST_CONCLUSION || ''}
                      onChange={e => setEditingReadiness(prev => ({ ...prev, PSYCHOLOGIST_CONCLUSION: e.target.value }))}
                      className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                      placeholder="Високий рівень мотивації, розвинене абстрактне мислення..."
                    />
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2 shrink-0 sticky bottom-0 bg-white dark:bg-slate-900 z-10">
                  <button
                    type="button"
                    onClick={() => setIsReadinessModalOpen(false)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-300 transition"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition"
                  >
                    Зберегти
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONSULTATION LOG */}
      {isConsultationModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center py-2 sm:py-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[calc(100vh-2rem)] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="flex justify-between items-center px-5 py-3.5 border-b bg-slate-900 text-white shrink-0">
                <h3 className="font-bold text-sm">
                  Запис у журнал консультацій
                </h3>
                <button onClick={() => setIsConsultationModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveConsultation} className="p-4 sm:p-6 space-y-3.5 text-xs overflow-y-auto flex-1 flex flex-col justify-between">
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">Дата</label>
                      <input
                        type="date"
                        value={editingConsultation?.DATE || ''}
                        onChange={e => setEditingConsultation(prev => ({ ...prev, DATE: e.target.value }))}
                        className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Тип консультації</label>
                      <SearchableSelect
                        value={editingConsultation?.TYPE || 'Індивідуальна'}
                        onChange={e => setEditingConsultation(prev => ({ ...prev, TYPE: e.target.value as any }))}
                        className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                      >
                        <option value="Індивідуальна">Індивідуальна</option>
                        <option value="Групова">Групова</option>
                        <option value="Консультація з батьками">Консультація з батьками</option>
                        <option value="Консультація з вихователем">Консультація з вихователем</option>
                        <option value="Психопрофілактична робота">Психопрофілактична робота</option>
                      </SearchableSelect>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Учасники / ФІО батьків / Назва групи</label>
                    <input
                      type="text"
                      value={editingConsultation?.TARGET_NAME || ''}
                      onChange={e => setEditingConsultation(prev => ({ ...prev, TARGET_NAME: e.target.value }))}
                      placeholder="напр. Петренко О. М. (мати Петренка Т.)"
                      className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Тема консультації</label>
                    <input
                      type="text"
                      value={editingConsultation?.TOPIC || ''}
                      onChange={e => setEditingConsultation(prev => ({ ...prev, TOPIC: e.target.value }))}
                      placeholder="напр. Подолання дитячих страхів та трівожності"
                      className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Рекомендації</label>
                    <textarea
                      rows={2}
                      value={editingConsultation?.RECOMMENDATIONS || ''}
                      onChange={e => setEditingConsultation(prev => ({ ...prev, RECOMMENDATIONS: e.target.value }))}
                      className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                    />
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2 shrink-0 sticky bottom-0 bg-white dark:bg-slate-900 z-10">
                  <button
                    type="button"
                    onClick={() => setIsConsultationModalOpen(false)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-300 transition"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition"
                  >
                    Зберегти
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DAILY LOG ENTRY (МОН УКРАЇНИ) */}
      {isDailyLogModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center py-2 sm:py-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[calc(100vh-2rem)] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="flex justify-between items-center px-5 py-3.5 border-b bg-purple-900 text-white shrink-0">
                <h3 className="font-bold text-sm flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>{editingDailyLog?.ID ? 'Редагувати щоденний запис' : 'Записати щоденну роботу (МОН)'}</span>
                </h3>
                <button onClick={() => setIsDailyLogModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveDailyLog} className="p-4 sm:p-6 space-y-3.5 text-xs overflow-y-auto flex-1 flex flex-col justify-between">
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">Дата проведення</label>
                      <input
                        type="date"
                        value={editingDailyLog?.DATE || new Date().toISOString().split('T')[0]}
                        onChange={e => setEditingDailyLog(prev => ({ ...prev, DATE: e.target.value }))}
                        className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Тривалість (годин)</label>
                      <input
                        type="number"
                        step="0.25"
                        min="0.25"
                        max="10"
                        value={editingDailyLog?.HOURS_SPENT || 1.5}
                        onChange={e => setEditingDailyLog(prev => ({ ...prev, HOURS_SPENT: Number(e.target.value) }))}
                        className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">Напрям діяльності (МОН)</label>
                      <SearchableSelect
                        value={editingDailyLog?.ACTIVITY_TYPE || 'Діагностична'}
                        onChange={e => setEditingDailyLog(prev => ({ ...prev, ACTIVITY_TYPE: e.target.value as any }))}
                        className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl font-bold"
                      >
                        <option value="Діагностична">Діагностична</option>
                        <option value="Корекційно-розвиткова">Корекційно-розвиткова</option>
                        <option value="Консультаційна">Консультаційна</option>
                        <option value="Просвітницька">Просвітницька</option>
                        <option value="Організаційно-методична">Організаційно-методична</option>
                      </SearchableSelect>
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Категорія учасників</label>
                      <SearchableSelect
                        value={editingDailyLog?.CATEGORY || 'Діти'}
                        onChange={e => setEditingDailyLog(prev => ({ ...prev, CATEGORY: e.target.value as any }))}
                        className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                      >
                        <option value="Діти">Діти</option>
                        <option value="Батьки">Батьки</option>
                        <option value="Педагоги">Педагоги</option>
                        <option value="Методична / Самоосвіта">Методична / Самоосвіта</option>
                      </SearchableSelect>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">Об'єкт / Учасники (ФІО чи назва)</label>
                      <input
                        type="text"
                        value={editingDailyLog?.TARGET_NAME || ''}
                        onChange={e => setEditingDailyLog(prev => ({ ...prev, TARGET_NAME: e.target.value }))}
                        placeholder="напр. Група «Сонечко» або ПІБ дитини"
                        className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Вікова група (опціонально)</label>
                      <SearchableSelect
                        value={editingDailyLog?.GROUP_NAME || ''}
                        onChange={e => setEditingDailyLog(prev => ({ ...prev, GROUP_NAME: e.target.value }))}
                        className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                      >
                        <option value="">Не вказано / Всі групи</option>
                        {groupsList.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </SearchableSelect>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Зміст проведеної роботи</label>
                    <textarea
                      rows={3}
                      value={editingDailyLog?.CONTENT_TOPIC || ''}
                      onChange={e => setEditingDailyLog(prev => ({ ...prev, CONTENT_TOPIC: e.target.value }))}
                      placeholder="Опишіть проведене заняття, бесіду або методичний захід..."
                      className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Результати, висновки, примітки</label>
                    <textarea
                      rows={2}
                      value={editingDailyLog?.RESULTS_NOTES || ''}
                      onChange={e => setEditingDailyLog(prev => ({ ...prev, RESULTS_NOTES: e.target.value }))}
                      placeholder="Короткі підсумки або рекомендації..."
                      className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                    />
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2 shrink-0 sticky bottom-0 bg-white dark:bg-slate-900 z-10">
                  <button
                    type="button"
                    onClick={() => setIsDailyLogModalOpen(false)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-300 transition"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition"
                  >
                    Зберегти в журнал
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SPECIAL SUPPORT ENTRY (ВОЄННИЙ СТАН, ООП, ВПО) */}
      {isSpecialSupportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center py-2 sm:py-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[calc(100vh-2rem)] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="flex justify-between items-center px-5 py-3.5 border-b bg-rose-900 text-white shrink-0">
                <h3 className="font-bold text-sm flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4" />
                  <span>{editingSpecialSupport?.ID ? 'Редагувати картку супроводу' : 'Нова картка супроводу (ООП / ВПО / Воєнний стан)'}</span>
                </h3>
                <button onClick={() => setIsSpecialSupportModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSpecialSupport} className="p-4 sm:p-6 space-y-3.5 text-xs overflow-y-auto flex-1 flex flex-col justify-between">
                <div className="space-y-3.5">
                  <div>
                    <label className="block font-bold mb-1">Вихованець</label>
                    <SearchableSelect
                      value={editingSpecialSupport?.CHILD_ID || ''}
                      onChange={e => {
                        const childId = Number(e.target.value);
                        const ch = children.find(c => c.ID === childId);
                        setEditingSpecialSupport(prev => ({
                          ...prev,
                          CHILD_ID: childId,
                          CHILD_NAME: ch ? ch.FULL_NAME : '',
                          GROUP_NAME: ch ? ch.GROUP_NAME : ''
                        }));
                      }}
                      className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl font-bold"
                      required
                    >
                      {children.map(c => (
                        <option key={c.ID} value={c.ID}>{c.FULL_NAME} ({c.GROUP_NAME})</option>
                      ))}
                    </SearchableSelect>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">Категорія супроводу</label>
                      <SearchableSelect
                        value={editingSpecialSupport?.CATEGORY || 'ООП (ІПР / Інклюзія)'}
                        onChange={e => setEditingSpecialSupport(prev => ({ ...prev, CATEGORY: e.target.value as any }))}
                        className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl font-bold"
                      >
                        <option value="ООП (ІПР / Інклюзія)">ООП (ІПР / Інклюзія)</option>
                        <option value="ВПО (Внутрішньо переміщені)">ВПО (Внутрішньо переміщені)</option>
                        <option value="Діти військовослужбовців / УБД">Діти військовослужбовців / УБД</option>
                        <option value="Підвищена тривожність / Стрес">Підвищена тривожність / Стрес</option>
                        <option value="Діти з кризових сімей / СЖО">Діти з кризових сімей / СЖО</option>
                      </SearchableSelect>
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Рівень тривожності (1 - 5)</label>
                      <SearchableSelect
                        value={editingSpecialSupport?.ANXIETY_SCORE || 3}
                        onChange={e => setEditingSpecialSupport(prev => ({ ...prev, ANXIETY_SCORE: Number(e.target.value) }))}
                        className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl font-bold"
                      >
                        <option value={1}>1 - Дуже низький (спокійна)</option>
                        <option value={2}>2 - Помірний (адекватний)</option>
                        <option value={3}>3 - Середній (вибіркова напруга)</option>
                        <option value={4}>4 - Високий (страх, здригання)</option>
                        <option value={5}>5 - Критичний (паніка, плач)</option>
                      </SearchableSelect>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Динаміка стану вихованця</label>
                    <SearchableSelect
                      value={editingSpecialSupport?.DYNAMIC_STATUS || 'Стабільний стан'}
                      onChange={e => setEditingSpecialSupport(prev => ({ ...prev, DYNAMIC_STATUS: e.target.value as any }))}
                      className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl font-bold"
                    >
                      <option value="Позитивна динаміка">Позитивна динаміка</option>
                      <option value="Стабільний стан">Стабільний стан</option>
                      <option value="Потребує посиленої уваги">Потребує посиленої уваги</option>
                      <option value="Критичний стан / Направлено до фахівців">Критичний стан / Направлено до фахівців</option>
                    </SearchableSelect>
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Реакція на стрес, гучні звуки, сирени</label>
                    <input
                      type="text"
                      value={editingSpecialSupport?.STRESS_REACTION || ''}
                      onChange={e => setEditingSpecialSupport(prev => ({ ...prev, STRESS_REACTION: e.target.value }))}
                      placeholder="напр. Закриває вуха руками, плач при зміні режиму"
                      className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Поведінка в укритті ЗДО №145</label>
                    <input
                      type="text"
                      value={editingSpecialSupport?.SHELTER_BEHAVIOR || ''}
                      onChange={e => setEditingSpecialSupport(prev => ({ ...prev, SHELTER_BEHAVIOR: e.target.value }))}
                      placeholder="напр. Потребує тактильної іграшки, заспокоюється малюванням"
                      className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Індивідуальний план супроводу / ІПР</label>
                    <textarea
                      rows={2}
                      value={editingSpecialSupport?.INDIVIDUAL_PLAN || ''}
                      onChange={e => setEditingSpecialSupport(prev => ({ ...prev, INDIVIDUAL_PLAN: e.target.value }))}
                      placeholder="Корекційні сесії 2 рази на тиждень, вправи на заземлення..."
                      className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Додаткові примітки (ІРЦ, лікарі, сім'я)</label>
                    <input
                      type="text"
                      value={editingSpecialSupport?.NOTES || ''}
                      onChange={e => setEditingSpecialSupport(prev => ({ ...prev, NOTES: e.target.value }))}
                      placeholder="Висновок ІРЦ №..., рекомендації батькам..."
                      className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                    />
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2 shrink-0 sticky bottom-0 bg-white dark:bg-slate-900 z-10">
                  <button
                    type="button"
                    onClick={() => setIsSpecialSupportModalOpen(false)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-300 transition"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition"
                  >
                    Зберегти картку
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRINTABLE MEMO (А4 З БЛАНКОМ ЗДО №145) */}
      {selectedMemoForPrint && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm p-2 sm:p-6 z-50 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center py-4">
            <div className="bg-white text-slate-900 rounded-2xl max-w-3xl w-full p-8 shadow-2xl border border-slate-300 flex flex-col font-serif relative">
              {/* No-print Action Controls */}
              <div className="flex items-center justify-between pb-4 mb-6 border-b no-print">
                <div className="text-xs font-sans text-slate-500">
                  Перегляд пам'ятки у форматі друку А4
                </div>
                <div className="flex items-center space-x-2 font-sans">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Друкувати А4</span>
                  </button>
                  <button
                    onClick={() => setSelectedMemoForPrint(null)}
                    className="p-2 text-slate-400 hover:text-slate-700 rounded-xl transition"
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
                    <div className="font-bold uppercase text-purple-950">КОМУНАЛЬНИЙ ЗАКЛАД ДОШКІЛЬНОЇ ОСВІТИ (ЯСЛА-САДОК) КОМБІНОВАНОГО ТИПУ №145 КРИВОРІЗЬКОЇ МІСЬКОЇ РАДИ</div>
                    <div className="text-[10px] text-slate-600">ЄДРПОУ: 26136748 | м. Кривий Ріг, вул. Перлинна 23А</div>
                  </div>
                  <div className="text-right">
                    <div><b>ЗАТВЕРДЖУЮ</b></div>
                    <div>Директор КЗДО №145</div>
                    <div className="mt-1">________________ / Н. Г. Павлухіна</div>
                    <div className="text-[10px] text-slate-500">«_____» ____________ 2026 р.</div>
                  </div>
                </div>
                <div className="text-center pt-2">
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 inline-block mb-1">
                    Психологічна служба • Пам'ятка ({selectedMemoForPrint.targetAudience})
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 leading-snug">
                    {selectedMemoForPrint.title}
                  </h2>
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6 text-xs italic text-slate-700">
                {selectedMemoForPrint.summary}
              </div>

              {/* Tips list */}
              <div className="space-y-3 mb-8 text-xs leading-relaxed">
                <h3 className="font-bold text-sm uppercase tracking-wide border-b pb-1 text-purple-900 font-sans">
                  Практичні рекомендації практичного психолога:
                </h3>
                <ul className="space-y-2.5 pt-2">
                  {selectedMemoForPrint.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="font-bold font-sans text-purple-700 shrink-0">{idx + 1}.</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Letterhead Signatures footer */}
              <div className="mt-8 pt-4 border-t flex justify-between text-xs font-bold">
                <div>Практичний психолог ЗДО: ____________________</div>
                <div>Директор КЗДО №145: ____________________ / Н. Г. Павлухіна</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WORKFLOW GUIDE MODAL */}
      <WorkflowGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        title="Покрокова інструкція: Психологічний супровід ЗДО"
        subtitle="Порядок роботи: Перевірка дітей ➔ Моніторинг адаптації та готовності ➔ Журнал консультацій та звіт"
        steps={psychologistWorkflowSteps}
        importantNotes={[
          'Усі діти та групи автоматично підтягуються з модуля «Контингент та Кадри».',
          'Кнопка «Автозаповнення звіту» у вкладці «Звіт 2.10» самостійно підраховує кількість індивідуальних і групових діагностик.',
          'Картки адаптації та протоколи готовності до школи можна роздрукувати на окремих аркушах А4.'
        ]}
      />
    </div>
  );
};
