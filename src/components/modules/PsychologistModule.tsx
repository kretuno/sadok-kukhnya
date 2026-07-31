import React, { useState, useEffect } from 'react';
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
  FolderOpen
} from 'lucide-react';
import {
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
  generateDefaultReport210
} from '../../services/db';
import { exportToExcel } from '../../services/export';
import {
  SadokChild,
  PsychologyAdaptationRecord,
  SchoolReadinessAssessment,
  PsychologyConsultation,
  PsychologySummaryReport,
  PsychologyReportRow
} from '../../types';

export const PsychologistModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'adaptation' | 'readiness' | 'consultations' | 'reports' | 'conclusions'>('overview');
  
  // Data state
  const [children, setChildren] = useState<SadokChild[]>([]);
  const [adaptations, setAdaptations] = useState<PsychologyAdaptationRecord[]>([]);
  const [readinessList, setReadinessList] = useState<SchoolReadinessAssessment[]>([]);
  const [consultations, setConsultations] = useState<PsychologyConsultation[]>([]);
  const [reportsList, setReportsList] = useState<PsychologySummaryReport[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  // Reports state
  const [selectedReportId, setSelectedReportId] = useState<number>(1);
  const [activeReportYear, setActiveReportYear] = useState<string>('2024/2025 н.р.');
  const [currentReport, setCurrentReport] = useState<PsychologySummaryReport | null>(null);

  // Modals state
  const [isAdaptationModalOpen, setIsAdaptationModalOpen] = useState(false);
  const [editingAdaptation, setEditingAdaptation] = useState<Partial<PsychologyAdaptationRecord> | null>(null);

  const [isReadinessModalOpen, setIsReadinessModalOpen] = useState(false);
  const [editingReadiness, setEditingReadiness] = useState<Partial<SchoolReadinessAssessment> | null>(null);

  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [editingConsultation, setEditingConsultation] = useState<Partial<PsychologyConsultation> | null>(null);

  const [selectedChildForReport, setSelectedChildForReport] = useState<SadokChild | null>(null);

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
  }, []);

  // Unique groups list
  const groupsList = Array.from(new Set(children.map(c => c.GROUP_NAME).filter(Boolean)));

  // Filtered lists
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

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-y-auto md:overflow-hidden">
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
                v1.0.43
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Моніторинг адаптації, готовність до школи, журнал консультацій та офіційні звіти (ГОРОНО)
            </p>
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex items-center space-x-2">
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
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCreateNewReport}
                className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border rounded-xl font-bold text-xs hover:bg-slate-200 transition"
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
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-2 flex items-center justify-between no-print shrink-0 overflow-x-auto">
        <div className="flex space-x-1">
          {[
            { id: 'overview', label: 'Огляд & Статистика', icon: BarChart3 },
            { id: 'adaptation', label: 'Картки Адаптації', icon: Smile, badge: adaptations.length },
            { id: 'readiness', label: 'Готовність до Школи', icon: GraduationCap, badge: readinessList.length },
            { id: 'consultations', label: 'Журнал Консультацій', icon: MessageSquare, badge: consultations.length },
            { id: 'reports', label: 'Звіти', icon: FileText, badge: reportsList.length },
            { id: 'conclusions', label: 'Психологічні Висновки', icon: Brain }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
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
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Пошук вихованця чи теми..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 w-48"
              />
            </div>
            <select
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
              className="py-1.5 px-3 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Усі групи</option>
              {groupsList.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
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
                  <div className="text-[11px] text-slate-400 mt-0.5">з {readinessList.length} вихованців старших груп</div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
                  <GraduationCap className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Проведено консультацій</div>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{consultations.length}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">з батьками та вихователями</div>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
                  <MessageSquare className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Quick Actions & Sections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Adaptation overview */}
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 font-bold mb-3">
                    <Smile className="w-5 h-5" />
                    <span>Карти адаптації</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                    Моніторинг емоційного стану, рівня тривожності, апетиту та сну новоприбулих дітей ясельних і молодших груп.
                  </p>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                      <span>Легка адаптація:</span>
                      <span className="font-bold text-emerald-600">{easyAdaptationCount}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                      <span>Середня адаптація:</span>
                      <span className="font-bold text-amber-600">{mediumAdaptationCount}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1">
                      <span>Важка адаптація (під контролем):</span>
                      <span className="font-bold text-rose-600">{hardAdaptationCount}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('adaptation')}
                  className="w-full py-2 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold rounded-xl text-xs hover:bg-purple-100 transition flex items-center justify-center space-x-1"
                >
                  <span>Перейти до адаптацій</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Card 2: School Readiness */}
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-bold mb-3">
                    <GraduationCap className="w-5 h-5" />
                    <span>Готовність до школи</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                    Оцінка 4 сфер розвитку (мотиваційна, інтелектуальна, емоційно-вольова, соціальна) перед вступом до 1 класу.
                  </p>
                  <div className="bg-blue-50/50 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50 mb-4">
                    <div className="text-xs font-semibold text-blue-900 dark:text-blue-200">Автоматичний висновок</div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      Формування психолого-педагогічного резюме та рекомендацій вихователям та батькам.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('readiness')}
                  className="w-full py-2 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold rounded-xl text-xs hover:bg-blue-100 transition flex items-center justify-center space-x-1"
                >
                  <span>Перейти до готовності</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Card 3: Official Reports (ГОРОНО) */}
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 font-bold mb-3">
                    <FileText className="w-5 h-5" />
                    <span>Офіційні Звіти (ГОРОНО)</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                    Форма 2.10: Зведені дані щодо роботи працівників психологічної служби за навчальний рік.
                  </p>
                  <div className="space-y-1.5 mb-4">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs border border-purple-200 dark:border-purple-900">
                      <div className="font-semibold text-purple-900 dark:text-purple-200">Форма 2.10 (Точно 1 в 1 ГОРОНО)</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">8 нормативних колонок з автопідрахунком та друком А4</div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('reports')}
                  className="w-full py-2 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold rounded-xl text-xs hover:bg-purple-100 transition flex items-center justify-center space-x-1"
                >
                  <span>Відкрити розділ Звіти</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
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

        {/* TAB 5: REPORTS (ЗВІТИ) - EXACT 1 IN 1 GORONO FORMAT WITH MULTI-REPORT STORAGE */}
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
                  <select
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
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Навчальний рік:
                  </label>
                  <select
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
                  </select>
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
                <span>✓ Всі звіти надійно збережені в базі</span>
              </div>
            </div>

            {/* Editable & Printable Table Form 2.10 - EXACT REPLICA 1 IN 1 */}
            {currentReport && (
              <div className="bg-white text-slate-900 p-6 md:p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 print:shadow-none print:border-none print:p-0">
                
                {/* Official 1-in-1 Header from DOCX */}
                <div className="mb-6 border-b pb-4 print:border-b-2 print:border-black">
                  <div className="text-xs font-bold text-slate-600 print:text-black mb-1">
                    ЗВЕДЕНИЙ ЗВІТ ПСИХОЛОГІЧНОЇ СЛУЖБИ ЗДО
                  </div>
                  <h2 className="text-base md:text-lg font-bold text-slate-900 print:text-black leading-tight">
                    2.10. Зведені дані щодо роботи працівників психологічної служби у {currentReport.ACADEMIC_YEAR} з дітьми
                  </h2>
                </div>

                {/* Table 1 in 1 as in docx file */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse border border-black font-sans print:font-serif">
                    <thead>
                      <tr className="bg-slate-100 print:bg-slate-200 text-slate-900 font-bold text-center border-b border-black">
                        <th className="border border-black px-3 py-3 font-bold text-left min-w-[220px]">
                          Напрями роботи Фахівців
                        </th>
                        <th className="border border-black px-2 py-3 font-bold text-center max-w-[130px]">
                          Індивідуальна діагностика, охоплено осіб
                        </th>
                        <th className="border border-black px-2 py-3 font-bold text-center max-w-[170px]">
                          Групова діагностика соціально-психологічні/педагогічні дослідження, охоплено осіб
                        </th>
                        <th className="border border-black px-2 py-3 font-bold text-center max-w-[130px]">
                          Профілактика (індивідуальна), охоплено осіб
                        </th>
                        <th className="border border-black px-2 py-3 font-bold text-center max-w-[130px]">
                          Профілактика (групова), охоплено осіб
                        </th>
                        <th className="border border-black px-2 py-3 font-bold text-center max-w-[130px]">
                          Корекційна (індивідуальна), охоплено осіб
                        </th>
                        <th className="border border-black px-2 py-3 font-bold text-center max-w-[130px]">
                          Корекційна (групова), охоплено осіб
                        </th>
                        <th className="border border-black px-2 py-3 font-bold text-center max-w-[150px]">
                          Проведення ділових ігор, тренінгів, охоплено осіб
                        </th>
                        <th className="border border-black px-2 py-3 text-center font-bold bg-purple-50 text-purple-950 w-24 no-print">
                          Разом осіб
                        </th>
                        <th className="border border-black px-2 py-3 text-center no-print w-10">Дії</th>
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
                            <td className="border border-black px-2 py-1.5">
                              <span className="hidden print:inline font-semibold">{row.CATEGORY_NAME}</span>
                              <input
                                type="text"
                                value={row.CATEGORY_NAME}
                                onChange={e => handleCellChange(idx, 'CATEGORY_NAME', e.target.value)}
                                className="w-full bg-transparent border-b border-transparent hover:border-slate-400 focus:border-purple-600 focus:bg-white px-1 py-0.5 font-medium text-slate-900 no-print"
                              />
                            </td>
                            <td className="border border-black px-1 py-1 text-center font-semibold">
                              <span className="hidden print:inline">{row.INDIVIDUAL_DIAGNOSTICS || 0}</span>
                              <input
                                type="number"
                                min={0}
                                value={row.INDIVIDUAL_DIAGNOSTICS || ''}
                                onChange={e => handleCellChange(idx, 'INDIVIDUAL_DIAGNOSTICS', e.target.value)}
                                className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-400 focus:border-purple-600 focus:bg-white font-semibold no-print"
                              />
                            </td>
                            <td className="border border-black px-1 py-1 text-center font-semibold">
                              <span className="hidden print:inline">{row.GROUP_DIAGNOSTICS || 0}</span>
                              <input
                                type="number"
                                min={0}
                                value={row.GROUP_DIAGNOSTICS || ''}
                                onChange={e => handleCellChange(idx, 'GROUP_DIAGNOSTICS', e.target.value)}
                                className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-400 focus:border-purple-600 focus:bg-white font-semibold no-print"
                              />
                            </td>
                            <td className="border border-black px-1 py-1 text-center font-semibold">
                              <span className="hidden print:inline">{row.INDIVIDUAL_PROPHYLAXIS || 0}</span>
                              <input
                                type="number"
                                min={0}
                                value={row.INDIVIDUAL_PROPHYLAXIS || ''}
                                onChange={e => handleCellChange(idx, 'INDIVIDUAL_PROPHYLAXIS', e.target.value)}
                                className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-400 focus:border-purple-600 focus:bg-white font-semibold no-print"
                              />
                            </td>
                            <td className="border border-black px-1 py-1 text-center font-semibold">
                              <span className="hidden print:inline">{row.GROUP_PROPHYLAXIS || 0}</span>
                              <input
                                type="number"
                                min={0}
                                value={row.GROUP_PROPHYLAXIS || ''}
                                onChange={e => handleCellChange(idx, 'GROUP_PROPHYLAXIS', e.target.value)}
                                className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-400 focus:border-purple-600 focus:bg-white font-semibold no-print"
                              />
                            </td>
                            <td className="border border-black px-1 py-1 text-center font-semibold">
                              <span className="hidden print:inline">{row.INDIVIDUAL_CORRECTION || 0}</span>
                              <input
                                type="number"
                                min={0}
                                value={row.INDIVIDUAL_CORRECTION || ''}
                                onChange={e => handleCellChange(idx, 'INDIVIDUAL_CORRECTION', e.target.value)}
                                className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-400 focus:border-purple-600 focus:bg-white font-semibold no-print"
                              />
                            </td>
                            <td className="border border-black px-1 py-1 text-center font-semibold">
                              <span className="hidden print:inline">{row.GROUP_CORRECTION || 0}</span>
                              <input
                                type="number"
                                min={0}
                                value={row.GROUP_CORRECTION || ''}
                                onChange={e => handleCellChange(idx, 'GROUP_CORRECTION', e.target.value)}
                                className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-400 focus:border-purple-600 focus:bg-white font-semibold no-print"
                              />
                            </td>
                            <td className="border border-black px-1 py-1 text-center font-semibold">
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
                      <tr className="bg-slate-100 print:bg-slate-200 font-extrabold text-slate-900 border-t-2 border-black">
                        <td className="border border-black px-3 py-2 text-right uppercase tracking-wider">
                          УСЬОГО:
                        </td>
                        <td className="border border-black px-2 py-2 text-center">
                          {currentReport.ROWS.reduce((s, r) => s + (Number(r.INDIVIDUAL_DIAGNOSTICS) || 0), 0)}
                        </td>
                        <td className="border border-black px-2 py-2 text-center">
                          {currentReport.ROWS.reduce((s, r) => s + (Number(r.GROUP_DIAGNOSTICS) || 0), 0)}
                        </td>
                        <td className="border border-black px-2 py-2 text-center">
                          {currentReport.ROWS.reduce((s, r) => s + (Number(r.INDIVIDUAL_PROPHYLAXIS) || 0), 0)}
                        </td>
                        <td className="border border-black px-2 py-2 text-center">
                          {currentReport.ROWS.reduce((s, r) => s + (Number(r.GROUP_PROPHYLAXIS) || 0), 0)}
                        </td>
                        <td className="border border-black px-2 py-2 text-center">
                          {currentReport.ROWS.reduce((s, r) => s + (Number(r.INDIVIDUAL_CORRECTION) || 0), 0)}
                        </td>
                        <td className="border border-black px-2 py-2 text-center">
                          {currentReport.ROWS.reduce((s, r) => s + (Number(r.GROUP_CORRECTION) || 0), 0)}
                        </td>
                        <td className="border border-black px-2 py-2 text-center">
                          {currentReport.ROWS.reduce((s, r) => s + (Number(r.TRAININGS_SEMINARS) || 0), 0)}
                        </td>
                        <td className="border border-black px-2 py-2 text-center text-purple-950 bg-purple-100 font-black no-print">
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
                <div className="mt-12 pt-6 border-t border-slate-400 flex justify-between text-xs font-bold font-serif">
                  <div>Практичний психолог ЗДО: ____________________</div>
                  <div>Завідувач ЗДО: ____________________</div>
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
              <select
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
              </select>
            </div>

            {/* A4 Printable Document Area */}
            {selectedChildForReport && (() => {
              const childAdaptation = adaptations.find(a => a.CHILD_ID === selectedChildForReport.ID);
              const childReadiness = readinessList.find(r => r.CHILD_ID === selectedChildForReport.ID);
              const childConsultations = consultations.filter(c => c.CHILD_ID === selectedChildForReport.ID || c.TARGET_NAME.includes(selectedChildForReport.FULL_NAME));

              return (
                <div className="bg-white text-slate-900 p-8 rounded-2xl shadow-xl border border-slate-300 font-serif print:shadow-none print:border-none print:p-0">
                  {/* Header A4 */}
                  <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                    <h2 className="text-lg font-bold uppercase tracking-wider">Картка Психолого-Педагогічного Супроводу Вихованця</h2>
                    <p className="text-xs italic text-slate-600 mt-1">Заклад дошкільної освіти (ясла-садок) • Психологічна служба</p>
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

                  {/* Section 3: Consultation Summary */}
                  <div className="mb-8">
                    <h3 className="text-sm font-bold uppercase border-b pb-1 mb-2 text-purple-900">3. Проведені Консультації та Супровід</h3>
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
                    <div>Завідувач ЗДО: ___________________</div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* MODAL: ADAPTATION RECORD */}
      {isAdaptationModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center pb-3 border-b mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {editingAdaptation?.ID ? 'Редагувати картку адаптації' : 'Створити картку адаптації'}
              </h3>
              <button onClick={() => setIsAdaptationModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdaptation} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Вихованець</label>
                <select
                  value={editingAdaptation?.CHILD_ID || ''}
                  onChange={e => setEditingAdaptation(prev => ({ ...prev, CHILD_ID: Number(e.target.value) }))}
                  className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                  required
                >
                  {children.map(c => (
                    <option key={c.ID} value={c.ID}>{c.FULL_NAME} ({c.GROUP_NAME})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  <select
                    value={editingAdaptation?.ADAPTATION_LEVEL || 'Легка'}
                    onChange={e => setEditingAdaptation(prev => ({ ...prev, ADAPTATION_LEVEL: e.target.value as any }))}
                    className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl font-bold"
                  >
                    <option value="Легка">Легка</option>
                    <option value="Середня">Середня</option>
                    <option value="Важка">Важка</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Емоційний стан</label>
                  <select
                    value={editingAdaptation?.EMOTIONAL_STATE || 'Позитивний'}
                    onChange={e => setEditingAdaptation(prev => ({ ...prev, EMOTIONAL_STATE: e.target.value as any }))}
                    className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                  >
                    <option value="Позитивний">Позитивний</option>
                    <option value="Нестійкий">Нестійкий</option>
                    <option value="Негативний">Негативний</option>
                    <option value="Агресивний / Пригнічений">Агресивний / Пригнічений</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Рівень тривожності</label>
                  <select
                    value={editingAdaptation?.ANXIETY_LEVEL || 'Низький'}
                    onChange={e => setEditingAdaptation(prev => ({ ...prev, ANXIETY_LEVEL: e.target.value as any }))}
                    className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                  >
                    <option value="Низький">Низький</option>
                    <option value="Середній">Середній</option>
                    <option value="Високий">Високий</option>
                  </select>
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

              <div className="pt-3 flex justify-end space-x-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAdaptationModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 font-bold rounded-xl"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 text-white font-bold rounded-xl shadow-md"
                >
                  Зберегти
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SCHOOL READINESS */}
      {isReadinessModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center pb-3 border-b mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Оцінка готовності до школи
              </h3>
              <button onClick={() => setIsReadinessModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReadiness} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Вихованець</label>
                <select
                  value={editingReadiness?.CHILD_ID || ''}
                  onChange={e => setEditingReadiness(prev => ({ ...prev, CHILD_ID: Number(e.target.value) }))}
                  className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                  required
                >
                  {children.map(c => (
                    <option key={c.ID} value={c.ID}>{c.FULL_NAME} ({c.GROUP_NAME})</option>
                  ))}
                </select>
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

              <div className="pt-3 flex justify-end space-x-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsReadinessModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 font-bold rounded-xl"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 text-white font-bold rounded-xl shadow-md"
                >
                  Зберегти
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONSULTATION LOG */}
      {isConsultationModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center pb-3 border-b mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Запис у журнал консультацій
              </h3>
              <button onClick={() => setIsConsultationModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConsultation} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
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
                  <select
                    value={editingConsultation?.TYPE || 'Індивідуальна'}
                    onChange={e => setEditingConsultation(prev => ({ ...prev, TYPE: e.target.value as any }))}
                    className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
                  >
                    <option value="Індивідуальна">Індивідуальна</option>
                    <option value="Групова">Групова</option>
                    <option value="Консультація з батьками">Консультація з батьками</option>
                    <option value="Консультація з вихователем">Консультація з вихователем</option>
                    <option value="Психопрофілактична робота">Психопрофілактична робота</option>
                  </select>
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

              <div className="pt-3 flex justify-end space-x-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAdaptationModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 font-bold rounded-xl"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 text-white font-bold rounded-xl shadow-md"
                >
                  Зберегти
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
