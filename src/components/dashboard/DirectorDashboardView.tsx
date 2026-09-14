import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Users,
  Utensils,
  Package,
  HeartPulse,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Printer,
  Sparkles,
  Calendar,
  Layers,
  FileText,
  DollarSign,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import {
  DATABASE_SYNC_EVENT,
  getChildren,
  getGroups,
  getEmployees,
  getMedicalCards,
  getVaccinations,
  getStockBatches,
  getProducts,
  getPropertyItems,
  getMenuApproval
} from '../../services/db';
import { exportToPDF } from '../../services/export';
import { SadokChild, SadokGroup, SadokEmployee, StockBatch, SadokMedicalCard, SadokVaccination } from '../../types';

interface DirectorDashboardViewProps {
  onNavigateTab: (tabId: string) => void;
}

export const DirectorDashboardView: React.FC<DirectorDashboardViewProps> = ({ onNavigateTab }) => {
  const [children, setChildren] = useState<SadokChild[]>([]);
  const [groups, setGroups] = useState<SadokGroup[]>([]);
  const [employees, setEmployees] = useState<SadokEmployee[]>([]);
  const [medicalCards, setMedicalCards] = useState<SadokMedicalCard[]>([]);
  const [vaccinations, setVaccinations] = useState<SadokVaccination[]>([]);
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [propertyCount, setPropertyCount] = useState<number>(0);
  const [todayDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadDashboardData();
    window.addEventListener(DATABASE_SYNC_EVENT, loadDashboardData);
    return () => window.removeEventListener(DATABASE_SYNC_EVENT, loadDashboardData);
  }, []);

  const loadDashboardData = () => {
    try {
      const c = getChildren();
      const g = getGroups();
      const e = getEmployees();
      const m = getMedicalCards();
      const v = getVaccinations();
      const b = getStockBatches();
      const p = getPropertyItems();
      setChildren(c);
      setGroups(g);
      setEmployees(e);
      setMedicalCards(m);
      setVaccinations(v);
      setBatches(b);
      setPropertyCount(p.length);
    } catch (_) {}
  };

  // KPIs
  const activeChildren = useMemo(() => children.filter(c => c.STATUS === 'Навчається'), [children]);
  const departedChildren = useMemo(() => children.filter(c => c.STATUS === 'Вибув' || c.STATUS === 'Випускник'), [children]);

  // Special diet
  const specialDietChildren = useMemo(() => {
    return activeChildren.filter(c => {
      const card = medicalCards.find(m => m.CHILD_ID === c.ID);
      const diet = card?.DIET_PRECAUTIONS || c.DIET_NOTES || '';
      return diet && diet !== 'Загальний стіл' && diet !== 'Звичайне харчування' && diet !== 'Немає' && diet !== '-';
    });
  }, [activeChildren, medicalCards]);

  // Warehouse total value & low stock
  const warehouseStats = useMemo(() => {
    let totalValueUah = 0;
    let lowStockCount = 0;
    const now = new Date();

    batches.forEach(b => {
      const ost = Number(b.OST_KG) || 0;
      const price = Number(b.CENA) || 0;
      totalValueUah += ost * price;
      if (ost > 0 && ost < 5) {
        lowStockCount++;
      }
    });

    return {
      totalValueUah: Math.round(totalValueUah * 100) / 100,
      lowStockCount,
      totalBatches: batches.filter(b => (Number(b.OST_KG) || 0) > 0).length
    };
  }, [batches]);

  // Medical stats
  const medicalStats = useMemo(() => {
    const totalEnrolled = activeChildren.length || 1;
    let group1 = 0;
    activeChildren.forEach(c => {
      const card = medicalCards.find(m => m.CHILD_ID === c.ID);
      const hg = card?.HEALTH_GROUP || 'I (Здорові)';
      if (hg.startsWith('I ')) group1++;
    });

    const totalVacs = vaccinations.length;
    const completedVacs = vaccinations.filter(v => v.STATUS === 'Зроблено').length;
    const overdueVacs = vaccinations.filter(v => v.STATUS === 'Прострочено').length;
    const vacCoverage = totalVacs > 0 ? Math.round((completedVacs / totalVacs) * 100) : 95;

    return {
      group1Pct: Math.round((group1 / totalEnrolled) * 100),
      vacCoverage,
      overdueVacs
    };
  }, [activeChildren, medicalCards, vaccinations]);

  // Menu approval status
  const menuApproval = useMemo(() => {
    return getMenuApproval(todayDate, 1);
  }, [todayDate]);

  // Staff stats
  const mvoCount = useMemo(() => {
    return employees.filter(e => e.IS_MVO).length;
  }, [employees]);

  // Export PDF Report for Director
  const handlePrintReport = () => {
    const headers = ['Показник', 'Значення', 'Норматив / Примітка'];
    const data = [
      ['Зараховано вихованців', `${activeChildren.length} дітей`, 'ЗДО №145 проектна місткість 160'],
      ['Функціонуючих груп', `${groups.length} груп`, 'Вікові та спеціальні'],
      ['Діти на спеціальній дієті', `${specialDietChildren.length} дітей`, 'Контроль шеф-кухаря'],
      ['Балансова вартість залишків на складі', `${warehouseStats.totalValueUah.toLocaleString('uk-UA')} грн`, `${warehouseStats.totalBatches} найменувань`],
      ['Позицій складу з низьким залишком', `${warehouseStats.lowStockCount}`, 'Менше 5 кг/л (потрібно замовлення)'],
      ['Охоплення щепленнями', `${medicalStats.vacCoverage}%`, 'Календар МОЗ України'],
      ['Вихованці I групи здоров\'я', `${medicalStats.group1Pct}%`, 'Основна фізкультурна група'],
      ['Штат співробітників', `${employees.length} працівників`, `${mvoCount} матеріально-відповідальні особи`],
      ['Одиниць майна на балансі', `${propertyCount} од.`, 'Інвентарний облік'],
      ['Статус щоденного меню на сьогодні', menuApproval?.STATUS === 'approved' ? 'ЗАТВЕРДЖЕНО' : 'На погодженні', todayDate]
    ];

    exportToPDF('ОПЕРАТИВНИЙ ЗВІТ КЕРІВНИКА ЗДО №145', headers, data, {
      institution: 'КЗДО (Ясла-садок) КТ №145 КМР',
      period: `Станом на ${new Date().toLocaleDateString('uk-UA')}`,
      director: 'Н. Г. Павлухіна'
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-xs font-bold text-blue-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Аналітичний Центр Керівника ЗДО</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Садок на одній долоні
            </h1>
            <p className="text-xs md:text-sm text-blue-200/80 max-w-2xl leading-relaxed">
              Оперативні показники харчоблоку, складських запасів, контингенту вихованців, медичного кабінету та майна КЗДО № 145 у режимі реального часу.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 text-xs">
              <div className="text-slate-400 text-[10px] font-semibold">Сьогоднішній день</div>
              <div className="font-mono font-black text-white">{new Date().toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>

            <button
              onClick={handlePrintReport}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-xs transition flex items-center space-x-2 shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Звіт керівника (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* TOP 5 METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Children */}
        <div 
          onClick={() => onNavigateTab('cadres')}
          className="card-glass p-4 rounded-2xl cursor-pointer hover:border-blue-500/50 hover:scale-[1.02] transition shadow-md group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Контингент</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 dark:text-white leading-none">
              {activeChildren.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{groups.length} груп</span>
              <span>•</span>
              <span>{departedChildren.length} в архіві</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-blue-600 dark:text-blue-400 font-bold">
            <span>Відкрити групи та дітей</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </div>

        {/* Metric 2: Nutrition */}
        <div 
          onClick={() => onNavigateTab('menu_planner')}
          className="card-glass p-4 rounded-2xl cursor-pointer hover:border-amber-500/50 hover:scale-[1.02] transition shadow-md group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Харчування</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition">
              <Utensils className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center space-x-2">
              <div className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                {specialDietChildren.length > 0 ? `${specialDietChildren.length}` : '0'}
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                дієти
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1.5">
              <span>Меню на день:</span>
              <span className={`font-bold ${menuApproval?.STATUS === 'approved' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {menuApproval?.STATUS === 'approved' ? 'Затверджено' : 'На погодженні'}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-bold">
            <span>Меню-вимога та норми</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </div>

        {/* Metric 3: Warehouse */}
        <div 
          onClick={() => onNavigateTab('warehouse')}
          className="card-glass p-4 rounded-2xl cursor-pointer hover:border-emerald-500/50 hover:scale-[1.02] transition shadow-md group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Склад товарів</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
              {warehouseStats.totalValueUah.toLocaleString('uk-UA')} <span className="text-xs font-normal">грн</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1.5">
              <span>{warehouseStats.totalBatches} партій</span>
              <span>•</span>
              <span className={warehouseStats.lowStockCount > 0 ? 'text-amber-600 font-bold' : ''}>
                {warehouseStats.lowStockCount} низьких залишків
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
            <span>Складські залишки</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </div>

        {/* Metric 4: Medical */}
        <div 
          onClick={() => onNavigateTab('medical')}
          className="card-glass p-4 rounded-2xl cursor-pointer hover:border-teal-500/50 hover:scale-[1.02] transition shadow-md group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Медкабінет</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 group-hover:bg-teal-600 group-hover:text-white transition">
              <HeartPulse className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 dark:text-white leading-none">
              {medicalStats.vacCoverage}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1.5">
              <span>Щеплення (Ф. 063/о)</span>
              <span>•</span>
              <span className="text-emerald-600 font-bold">{medicalStats.group1Pct}% I гр.</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-teal-600 dark:text-teal-400 font-bold">
            <span>Листок здоров'я</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </div>

        {/* Metric 5: Property & Staff */}
        <div 
          onClick={() => onNavigateTab('property')}
          className="card-glass p-4 rounded-2xl cursor-pointer hover:border-purple-500/50 hover:scale-[1.02] transition shadow-md group relative overflow-hidden sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Майно та Кадри</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 dark:text-white leading-none">
              {propertyCount} <span className="text-xs font-normal text-slate-400">од.</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1.5">
              <span className="font-bold">{employees.length} працівників</span>
              <span>•</span>
              <span>{mvoCount} МВО</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-purple-600 dark:text-purple-400 font-bold">
            <span>Інвентарний облік</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </div>
      </div>

      {/* ALERTS SECTION (SMART NOTIFICATIONS) */}
      {(warehouseStats.lowStockCount > 0 || medicalStats.overdueVacs > 0 || menuApproval?.STATUS !== 'approved') && (
        <div className="card-glass p-4 rounded-2xl border-l-4 border-l-amber-500 space-y-2">
          <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>Зверніть увагу керівника:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {menuApproval?.STATUS !== 'approved' && (
              <div 
                onClick={() => onNavigateTab('menu_planner')}
                className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 cursor-pointer transition flex items-start space-x-2.5"
              >
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">Меню-вимога очікує затвердження</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Щоденне меню на {todayDate} ще не підписано директором.</div>
                </div>
              </div>
            )}

            {warehouseStats.lowStockCount > 0 && (
              <div 
                onClick={() => onNavigateTab('warehouse')}
                className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 cursor-pointer transition flex items-start space-x-2.5"
              >
                <Package className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">Закінчуються залишки продуктів</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{warehouseStats.lowStockCount} найменувань на складі мають залишок менше 5 кг.</div>
                </div>
              </div>
            )}

            {medicalStats.overdueVacs > 0 && (
              <div 
                onClick={() => onNavigateTab('medical')}
                className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 cursor-pointer transition flex items-start space-x-2.5"
              >
                <HeartPulse className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">Прострочені щеплення вихованців</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{medicalStats.overdueVacs} дітям потрібно провести планову ревакцинацію.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TWO COLUMNS: GROUPS OCCUPANCY & WAREHOUSE TOP-5 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GROUPS OCCUPANCY (2 COLUMNS) */}
        <div className="lg:col-span-2 card-glass p-5 rounded-2xl shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-black text-sm text-slate-800 dark:text-white flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Наповнюваність вікових груп ЗДО</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Моніторинг фактичної кількості дітей та проектної місткості приміщень
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('cadres')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center space-x-1"
            >
              <span>Всі групи</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {groups.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">Груп не знайдено</div>
            ) : (
              groups.map(g => {
                const groupChildren = activeChildren.filter(c => c.GROUP_NAME === g.NAME);
                const capacity = g.CHILDREN_COUNT || 25;
                const percentage = Math.min(Math.round((groupChildren.length / capacity) * 100), 120);

                return (
                  <div key={g.ID} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{g.NAME}</span>
                        <span className="text-[10px] text-slate-400 ml-2">({g.AGE_CATEGORY})</span>
                      </div>
                      <div className="font-mono text-xs">
                        <span className="font-bold text-blue-600 dark:text-blue-400">{groupChildren.length}</span>
                        <span className="text-slate-400"> / {capacity} місць</span>
                        <span className="ml-2 font-bold text-slate-600 dark:text-slate-300">({percentage}%)</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          percentage > 100 
                            ? 'bg-rose-500' 
                            : percentage >= 80 
                            ? 'bg-blue-600' 
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span>Вихователь: {g.TEACHER_NAME || 'Не закріплено'}</span>
                      <span>Кімната №: {g.ROOM_NUMBER || '—'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: QUICK ACTIONS & INVENTORY VALUE */}
        <div className="space-y-6">
          {/* QUICK ACTIONS */}
          <div className="card-glass p-5 rounded-2xl shadow-md space-y-3">
            <h3 className="font-black text-sm text-slate-800 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Швидкі дії керівника</span>
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => onNavigateTab('cadres')}
                className="w-full p-3 rounded-xl bg-gradient-to-r from-purple-600/10 to-indigo-600/10 hover:from-purple-600/20 hover:to-indigo-600/20 border border-purple-200 dark:border-purple-800/40 text-left transition flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-purple-600 text-white shadow-sm">
                    <Calendar className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">1 Вересня (Переведення)</div>
                    <div className="text-[10px] text-slate-500">Масовий перехід груп та випуск</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-600 group-hover:translate-x-1 transition" />
              </button>

              <button
                onClick={() => onNavigateTab('medical')}
                className="w-full p-3 rounded-xl bg-gradient-to-r from-emerald-600/10 to-teal-600/10 hover:from-emerald-600/20 hover:to-teal-600/20 border border-emerald-200 dark:border-emerald-800/40 text-left transition flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-sm">
                    <HeartPulse className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Медичний кабінет</div>
                    <div className="text-[10px] text-slate-500">Листок здоров'я, Форма № 063/о</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition" />
              </button>

              <button
                onClick={() => onNavigateTab('menu_planner')}
                className="w-full p-3 rounded-xl bg-gradient-to-r from-amber-600/10 to-orange-600/10 hover:from-amber-600/20 hover:to-orange-600/20 border border-amber-200 dark:border-amber-800/40 text-left transition flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-amber-600 text-white shadow-sm">
                    <Utensils className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Затвердити меню-вимогу</div>
                    <div className="text-[10px] text-slate-500">Контроль норм КМУ № 305</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-1 transition" />
              </button>

              <button
                onClick={() => onNavigateTab('property')}
                className="w-full p-3 rounded-xl bg-gradient-to-r from-blue-600/10 to-cyan-600/10 hover:from-blue-600/20 hover:to-cyan-600/20 border border-blue-200 dark:border-blue-800/40 text-left transition flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-600 text-white shadow-sm">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Інвентаризація майна</div>
                    <div className="text-[10px] text-slate-500">Баланс, локації та закріплення МВО</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-600 group-hover:translate-x-1 transition" />
              </button>
            </div>
          </div>

          {/* TOP PRODUCTS BY VALUE */}
          <div className="card-glass p-5 rounded-2xl shadow-md space-y-3">
            <h3 className="font-black text-sm text-slate-800 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Топ-5 залишків складу за вартістю</span>
            </h3>

            <div className="space-y-2 text-xs">
              {batches
                .slice()
                .sort((a, b) => ((b.OST_KG || 0) * (b.CENA || 0)) - ((a.OST_KG || 0) * (a.CENA || 0)))
                .slice(0, 5)
                .map(b => (
                  <div key={b.ID} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{b.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{b.OST_KG} {b.unit} по {b.CENA} грн</div>
                    </div>
                    <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {Math.round((b.OST_KG || 0) * (b.CENA || 0)).toLocaleString('uk-UA')} грн
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
