import React, { useState, useEffect } from 'react';
import { PropertyItem, PropertyLocationDistribution, PropertyWriteOffRecord } from '../../types';
import { 
  getPropertyItems, 
  savePropertyItem, 
  deletePropertyItem, 
  getGroups, 
  getEmployees,
  getPropertyWriteOffs,
  createPropertyWriteOff,
  deletePropertyWriteOff
} from '../../services/db';
import { QuickToolbar } from '../QuickToolbar';
import { exportToExcel, exportToPDF } from '../../services/export';
import { 
  Building2, 
  Package, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Printer, 
  MapPin, 
  UserCheck, 
  AlertCircle, 
  Calendar, 
  Tag, 
  Boxes, 
  CheckCircle2,
  X,
  Layers,
  Sparkles,
  TreePine,
  Tv,
  UtensilsCrossed,
  Gamepad2,
  Armchair,
  Activity,
  FileText,
  FileCheck,
  ShieldAlert,
  Archive,
  FileSpreadsheet
} from 'lucide-react';

const PROPERTY_CATEGORIES = [
  'Всі категорії',
  'Меблі та м\'який інвентар',
  'Іграшки та методичні матеріали',
  'Оргтехніка та прилади',
  'Зелені насадження та благоустрій',
  'Спортивний інвентар',
  'Посуд та кухонне обладнання',
  'Інше'
];

const PROPERTY_CONDITIONS = [
  'Відмінний',
  'Задовільний',
  'Потребує ремонту',
  'Підлягає списанню'
];

const WRITE_OFF_REASONS = [
  'Повний фізичний та моральний знос',
  'Поломка / Непіддатливість ремонту',
  'Закінчення терміну корисної експлуатації',
  'Пошкодження через форс-мажорні обставини',
  'Захист безпеки вихованців та персоналу'
];

export const PropertyManagementModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'writeoffs'>('inventory');
  
  const [items, setItems] = useState<PropertyItem[]>([]);
  const [writeOffs, setWriteOffs] = useState<PropertyWriteOffRecord[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Всі категорії');
  const [selectedLocation, setSelectedLocation] = useState('Всі локації');
  const [selectedCondition, setSelectedCondition] = useState('Всі стани');

  // Modal State for Add/Edit Property Item
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<PropertyItem> | null>(null);

  // Form State for Property Item
  const [formInventar, setFormInventar] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState(PROPERTY_CATEGORIES[1]);
  const [formCondition, setFormCondition] = useState<'Відмінний' | 'Задовільний' | 'Потребує ремонту' | 'Підлягає списанню'>('Відмінний');
  const [formYear, setFormYear] = useState<number>(new Date().getFullYear());
  const [formCost, setFormCost] = useState<number>(0);
  const [formNotes, setFormNotes] = useState('');
  const [formLocations, setFormLocations] = useState<PropertyLocationDistribution[]>([
    { id: 'loc-1', locationName: 'Група «Сонечко»', responsiblePerson: 'Завгосп', quantity: 1 }
  ]);

  // Modal State for Write-Off Action
  const [isWriteOffModalOpen, setIsWriteOffModalOpen] = useState(false);
  const [isJournalWriteOff, setIsJournalWriteOff] = useState(false);
  const [targetWriteOffItem, setTargetWriteOffItem] = useState<PropertyItem | null>(null);
  const [woLocation, setWoLocation] = useState<string>('');
  const [woQuantity, setWoQuantity] = useState<number>(1);
  const [woReason, setWoReason] = useState<string>(WRITE_OFF_REASONS[0]);
  const [woCommissionHead, setWoCommissionHead] = useState<string>('Павлухіна Н. Г. (Директор)');
  const [woCommissionMembers, setWoCommissionMembers] = useState<string>('Суміна Н. Є. (Вихователь-методист), Завгосп Сидоренко В. П.');
  const [woNotes, setWoNotes] = useState<string>('');
  const [woActNumber, setWoActNumber] = useState<string>('');
  const [woDate, setWoDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // View Act Modal State
  const [viewingAct, setViewingAct] = useState<PropertyWriteOffRecord | null>(null);

  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const list = getPropertyItems();
    setItems(list);
    const woList = getPropertyWriteOffs();
    setWriteOffs(woList);
    const gList = getGroups().map(g => g.NAME);
    const eList = getEmployees().map(e => `${e.FULL_NAME} (${e.POSITION})`);
    setAvailableGroups(gList);
    setAvailableEmployees(eList);
  };

  // Get distinct location names for filter dropdown
  const allLocations = Array.from(
    new Set([
      ...availableGroups,
      ...items.flatMap(item => (item.LOCATIONS || []).map(l => l.locationName))
    ])
  ).filter(Boolean);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormInventar(`1011${Math.floor(1000 + Math.random() * 9000)}`);
    setFormName('');
    setFormCategory('Меблі та м\'який інвентар');
    setFormCondition('Відмінний');
    setFormYear(new Date().getFullYear());
    setFormCost(0);
    setFormNotes('');
    setFormLocations([
      { id: Date.now().toString(), locationName: 'Група «Сонечко»', responsiblePerson: 'Завгосп / Вихователь', quantity: 1 }
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: PropertyItem) => {
    setEditingItem(item);
    setFormInventar(item.INVENTAR_NUMBER);
    setFormName(item.NAME);
    setFormCategory(item.CATEGORY);
    setFormCondition(item.CONDITION);
    setFormYear(item.YEAR_COMMISSIONED);
    setFormCost(item.INITIAL_COST);
    setFormNotes(item.NOTES || '');
    setFormLocations(
      item.LOCATIONS && item.LOCATIONS.length > 0
        ? JSON.parse(JSON.stringify(item.LOCATIONS))
        : [{ id: Date.now().toString(), locationName: 'Загальна територія', responsiblePerson: 'Завгосп', quantity: item.TOTAL_QUANTITY || 1 }]
    );
    setIsModalOpen(true);
  };

  const handleAddLocationRow = () => {
    setFormLocations([
      ...formLocations,
      { id: Date.now().toString(), locationName: '', responsiblePerson: '', quantity: 1 }
    ]);
  };

  const handleRemoveLocationRow = (id: string) => {
    if (formLocations.length <= 1) return;
    setFormLocations(formLocations.filter(l => l.id !== id));
  };

  const handleLocationChange = (id: string, field: keyof PropertyLocationDistribution, value: any) => {
    setFormLocations(
      formLocations.map(l => l.id === id ? { ...l, [field]: value } : l)
    );
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const totalQty = formLocations.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);

    const saved = savePropertyItem({
      ID: editingItem?.ID,
      INVENTAR_NUMBER: formInventar || `1011${Date.now().toString().slice(-4)}`,
      NAME: formName.trim(),
      CATEGORY: formCategory,
      CONDITION: formCondition,
      YEAR_COMMISSIONED: Number(formYear) || new Date().getFullYear(),
      INITIAL_COST: Number(formCost) || 0,
      TOTAL_QUANTITY: totalQty > 0 ? totalQty : 1,
      LOCATIONS: formLocations.map(l => ({
        ...l,
        quantity: Number(l.quantity) || 1,
        locationName: l.locationName.trim() || 'Головний корпус',
        responsiblePerson: l.responsiblePerson.trim() || 'Завгосп'
      })),
      NOTES: formNotes.trim()
    });

    setItems(saved);
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Ви дійсно бажаєте вилучити цей об\'єкт майна з обліку?')) {
      const updated = deletePropertyItem(id);
      setItems(updated);
    }
  };

  // WRITE-OFF HANDLERS
  const getNextWriteOffActNumber = (date: string) => {
    const year = new Date(`${date}T00:00:00`).getFullYear();
    const highestNumber = writeOffs.reduce((maxNumber, act) => {
      if (!act.ACT_NUMBER.endsWith(`/${year}`)) return maxNumber;
      const match = act.ACT_NUMBER.match(/(\d+)\s*\/\s*\d{4}$/);
      return match ? Math.max(maxNumber, Number(match[1])) : maxNumber;
    }, 0);
    return `Акт № ${String(highestNumber + 1).padStart(2, '0')}/${year}`;
  };

  const prepareWriteOffForm = (
    item: PropertyItem,
    initialLocName?: string,
    openedFromJournal = false,
  ) => {
    setTargetWriteOffItem(item);
    const validLocations = (item.LOCATIONS || []).filter(l => l.quantity > 0);
    const defaultLoc = initialLocName || (validLocations.length > 0 ? validLocations[0].locationName : 'Загальна територія');
    const defaultMaxQty = validLocations.find(l => l.locationName === defaultLoc)?.quantity || item.TOTAL_QUANTITY || 1;
    const currentDate = new Date().toISOString().split('T')[0];

    setWoLocation(defaultLoc);
    setWoQuantity(Math.min(1, defaultMaxQty));
    setWoReason(WRITE_OFF_REASONS[0]);
    setWoCommissionHead('Павлухіна Н. Г. (Директор)');
    setWoCommissionMembers('Суміна Н. Є. (Вихователь-методист), Завгосп Сидоренко В. П.');
    setWoNotes('');
    setWoActNumber(getNextWriteOffActNumber(currentDate));
    setWoDate(currentDate);
    setIsJournalWriteOff(openedFromJournal);
    setIsWriteOffModalOpen(true);
  };

  const handleOpenWriteOffModal = (item: PropertyItem, initialLocName?: string) => {
    prepareWriteOffForm(item, initialLocName, false);
  };

  const handleOpenJournalWriteOffModal = () => {
    const firstAvailableItem = items.find(item =>
      item.TOTAL_QUANTITY > 0
      && (item.LOCATIONS || []).some(location => location.quantity > 0)
    );
    if (!firstAvailableItem) {
      alert('У реєстрі немає майна з доступним залишком для списання.');
      return;
    }
    prepareWriteOffForm(firstAvailableItem, undefined, true);
  };

  const handleWriteOffItemChange = (propertyId: number) => {
    const nextItem = items.find(item => item.ID === propertyId);
    if (!nextItem) return;
    setTargetWriteOffItem(nextItem);
    const firstLocation = (nextItem.LOCATIONS || []).find(location => location.quantity > 0);
    setWoLocation(firstLocation?.locationName || 'Загальна територія');
    setWoQuantity(1);
  };

  const handleConfirmWriteOff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetWriteOffItem) return;

    const locObj = (targetWriteOffItem.LOCATIONS || []).find(l => l.locationName === woLocation);
    const maxAvailable = locObj ? locObj.quantity : targetWriteOffItem.TOTAL_QUANTITY;

    if (woQuantity <= 0 || woQuantity > maxAvailable) {
      alert(`Кількість для списання не може перевищувати наявну на локації (${maxAvailable} шт)!`);
      return;
    }

    const respPerson = locObj?.responsiblePerson || 'Завгосп';
    const totalMonetaryCost = targetWriteOffItem.INITIAL_COST * woQuantity;

    const normalizedActNumber = woActNumber.trim() || getNextWriteOffActNumber(woDate);
    if (writeOffs.some(act => act.ACT_NUMBER.trim().toLocaleLowerCase('uk-UA') === normalizedActNumber.toLocaleLowerCase('uk-UA'))) {
      alert(`Акт з номером «${normalizedActNumber}» вже існує. Вкажіть інший номер.`);
      return;
    }

    let result;
    try {
      result = createPropertyWriteOff({
        ACT_NUMBER: normalizedActNumber,
        DATE: woDate,
        PROPERTY_ID: targetWriteOffItem.ID,
        INVENTAR_NUMBER: targetWriteOffItem.INVENTAR_NUMBER,
        PROPERTY_NAME: targetWriteOffItem.NAME,
        CATEGORY: targetWriteOffItem.CATEGORY,
        QUANTITY: Number(woQuantity),
        LOCATION_NAME: woLocation,
        RESPONSIBLE_PERSON: respPerson,
        REASON: woReason,
        COMMISSION_HEAD: woCommissionHead,
        COMMISSION_MEMBERS: woCommissionMembers,
        INITIAL_COST: targetWriteOffItem.INITIAL_COST,
        TOTAL_COST: totalMonetaryCost,
        NOTES: woNotes
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
      return;
    }

    setItems(result.items);
    setWriteOffs(result.writeOffs);
    setIsWriteOffModalOpen(false);
    setActiveSubTab('writeoffs');
    setViewingAct(result.writeOffs[0]);
  };

  const handleDeleteWriteOffRecord = (id: number) => {
    if (confirm('Ви дійсно бажаєте скасувати це списання та повернути майно на баланс?')) {
      const result = deletePropertyWriteOff(id);
      setItems(result.items);
      setWriteOffs(result.writeOffs);
    }
  };

  // Filtering
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.INVENTAR_NUMBER.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.LOCATIONS || []).some(l => 
        l.locationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.responsiblePerson.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesCat = selectedCategory === 'Всі категорії' || item.CATEGORY === selectedCategory;
    const matchesLoc = selectedLocation === 'Всі локації' || (item.LOCATIONS || []).some(l => l.locationName === selectedLocation);
    const matchesCond = selectedCondition === 'Всі стани' || item.CONDITION === selectedCondition;

    return matchesSearch && matchesCat && matchesLoc && matchesCond;
  });

  const filteredWriteOffs = writeOffs.filter(w => {
    const matchesSearch = 
      w.ACT_NUMBER.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.PROPERTY_NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.INVENTAR_NUMBER.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.LOCATION_NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.RESPONSIBLE_PERSON.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // KPI Computations
  const totalTitles = filteredItems.length;
  const totalQuantitySum = filteredItems.reduce((acc, i) => acc + (i.TOTAL_QUANTITY || 0), 0);
  const totalBalanceCost = filteredItems.reduce((acc, i) => acc + ((i.INITIAL_COST || 0) * (i.TOTAL_QUANTITY || 0)), 0);
  const itemsNeedingAttention = filteredItems.filter(i => i.CONDITION === 'Потребує ремонту' || i.CONDITION === 'Підлягає списанню').length;

  const totalWriteOffsCount = filteredWriteOffs.reduce((acc, w) => acc + w.QUANTITY, 0);
  const totalWriteOffsSum = filteredWriteOffs.reduce((acc, w) => acc + w.TOTAL_COST, 0);

  // Category Icon helper
  const getCategoryIcon = (category: string) => {
    if (category.includes('Меблі')) return <Armchair className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    if (category.includes('Іграшки')) return <Gamepad2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    if (category.includes('Оргтехніка')) return <Tv className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    if (category.includes('Зелені')) return <TreePine className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    if (category.includes('Спортивний')) return <Activity className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
    if (category.includes('Посуд')) return <UtensilsCrossed className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
    return <Boxes className="w-4 h-4 text-slate-600 dark:text-slate-400" />;
  };

  // Condition Badge Helper
  const getConditionBadge = (condition: string) => {
    switch (condition) {
      case 'Відмінний':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">🟢 Відмінний</span>;
      case 'Задовільний':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">🔵 Задовільний</span>;
      case 'Потребує ремонту':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">🟡 Ремонт</span>;
      case 'Підлягає списанню':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">🔴 До списання</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{condition}</span>;
    }
  };

  // Exports
  const handleExportExcel = () => {
    if (activeSubTab === 'inventory') {
      const headers = ['Інв. №', 'Назва майна', 'Категорія', 'Заг. кількість (шт)', 'Розподіл по локаціях / МВО', 'Первинна ціна (грн)', 'Балансова вартість (грн)', 'Стан', 'Рік введення'];
      const rows = filteredItems.map(i => [
        i.INVENTAR_NUMBER,
        i.NAME,
        i.CATEGORY,
        i.TOTAL_QUANTITY,
        (i.LOCATIONS || []).map(l => `${l.locationName} (${l.responsiblePerson}): ${l.quantity} шт`).join('; '),
        i.INITIAL_COST.toFixed(2),
        (i.INITIAL_COST * i.TOTAL_QUANTITY).toFixed(2),
        i.CONDITION,
        i.YEAR_COMMISSIONED
      ]);
      exportToExcel('SADOK_Майно_Реєстр', 'Реєстр майна', headers, rows);
    } else {
      const headers = ['№ Акта', 'Дата', 'Інв. №', 'Об\'єкт майна', 'Категорія', 'Списана к-сть', 'Локація/МВО', 'Сума списання (грн)', 'Причина списання'];
      const rows = filteredWriteOffs.map(w => [
        w.ACT_NUMBER,
        w.DATE,
        w.INVENTAR_NUMBER,
        w.PROPERTY_NAME,
        w.CATEGORY,
        w.QUANTITY,
        `${w.LOCATION_NAME} (${w.RESPONSIBLE_PERSON})`,
        w.TOTAL_COST.toFixed(2),
        w.REASON
      ]);
      exportToExcel('SADOK_Майно_Акти_Списання', 'Журнал списання', headers, rows);
    }
  };

  const handleExportPDF = () => {
    if (activeSubTab === 'inventory') {
      const headers = ['Інв. №', 'Назва майна', 'Категорія', 'К-сть', 'Локація / МВО', 'Вартість (грн)', 'Стан'];
      const rows = filteredItems.map(i => [
        i.INVENTAR_NUMBER,
        i.NAME,
        i.CATEGORY,
        `${i.TOTAL_QUANTITY} шт`,
        (i.LOCATIONS || []).map(l => `${l.locationName} (${l.quantity} шт)`).join(', '),
        (i.INITIAL_COST * i.TOTAL_QUANTITY).toFixed(2),
        i.CONDITION
      ]);
      exportToPDF('Інвентаризаційний опис наявного майна SADOK', headers, rows);
    } else {
      const headers = ['№ Акта', 'Дата', 'Інв. №', 'Об\'єкт майна', 'К-сть', 'Локація', 'Сума (грн)', 'Причина'];
      const rows = filteredWriteOffs.map(w => [
        w.ACT_NUMBER,
        w.DATE,
        w.INVENTAR_NUMBER,
        w.PROPERTY_NAME,
        `${w.QUANTITY} шт`,
        w.LOCATION_NAME,
        w.TOTAL_COST.toFixed(2),
        w.REASON
      ]);
      exportToPDF('Реєстр актів списання майна ЗДО №145', headers, rows);
    }
  };

  return (
    <>
      {/* SCREEN UI (Hidden on Print) */}
      <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-950 no-print">
        {/* QUICK TOOLBAR */}
        <QuickToolbar
          onAdd={activeSubTab === 'inventory' ? handleOpenAddModal : handleOpenJournalWriteOffModal}
          onRefresh={loadData}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
          onPrint={() => window.print()}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          title="SADOK Майно — Облік майна, інвентаризація та списання ДНЗ"
        />

        <div className="flex-1 overflow-x-auto overflow-y-auto p-4 space-y-4">
          {/* SUB-TAB NAVIGATION BAR */}
          <div className="card-glass p-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveSubTab('inventory')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                  activeSubTab === 'inventory'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                }`}
              >
                <Boxes className="w-4 h-4 text-amber-300" />
                <span>📦 Реєстр наявного майна ({items.length})</span>
              </button>

              <button
                onClick={() => setActiveSubTab('writeoffs')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                  activeSubTab === 'writeoffs'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                }`}
              >
                <Archive className="w-4 h-4 text-amber-300" />
                <span>📋 Журнал актів списання ({writeOffs.length})</span>
              </button>
            </div>

            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {activeSubTab === 'inventory' ? (
                <span>Активних об'єктів: <b>{totalTitles}</b> | Баланс: <b className="text-emerald-600 dark:text-emerald-400">{totalBalanceCost.toFixed(2)} грн</b></span>
              ) : (
                <span>Списаних предметів: <b>{totalWriteOffsCount} шт</b> | Сума списання: <b className="text-rose-600 dark:text-rose-400">{totalWriteOffsSum.toFixed(2)} грн</b></span>
              )}
            </div>
          </div>

          {/* TAB 1: INVENTORY REGISTER */}
          {activeSubTab === 'inventory' && (
            <>
              {/* KPI SUMMARY HEADER */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="card-glass p-3.5 flex items-center space-x-3.5 border-l-4 border-blue-500">
                  <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
                    <Boxes className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Найменувань майна</div>
                    <div className="text-xl font-black text-slate-800 dark:text-slate-100">{totalTitles} об'єктів</div>
                  </div>
                </div>

                <div className="card-glass p-3.5 flex items-center space-x-3.5 border-l-4 border-indigo-500">
                  <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Загальна кількість</div>
                    <div className="text-xl font-black text-slate-800 dark:text-slate-100">{totalQuantitySum} одиниць</div>
                  </div>
                </div>

                <div className="card-glass p-3.5 flex items-center space-x-3.5 border-l-4 border-emerald-500">
                  <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
                    <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center text-2xl font-black leading-none">₴</span>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Балансова вартість</div>
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{totalBalanceCost.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} грн</div>
                  </div>
                </div>

                <div className="card-glass p-3.5 flex items-center space-x-3.5 border-l-4 border-amber-500">
                  <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ремонт / Списання</div>
                    <div className="text-xl font-black text-amber-600 dark:text-amber-400">{itemsNeedingAttention} предметів</div>
                  </div>
                </div>
              </div>

              {/* CATEGORY & LOCATION FILTERS BAR */}
              <div className="card-glass p-3 flex flex-wrap items-center justify-between gap-3">
                {/* Category Tabs */}
                <div className="flex items-center space-x-1 overflow-x-auto pb-1 max-w-full">
                  {PROPERTY_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${
                        selectedCategory === cat
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>{cat}</span>
                    </button>
                  ))}
                </div>

                {/* Location & Condition Dropdown Filters */}
                <div className="flex items-center space-x-2">
                  {/* Filter by Location */}
                  <div className="flex items-center space-x-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                    >
                      <option value="Всі локації">Всі локації (групи/приміщення)</option>
                      {allLocations.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filter by Condition */}
                  <div className="flex items-center space-x-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <select
                      value={selectedCondition}
                      onChange={(e) => setSelectedCondition(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                    >
                      <option value="Всі стани">Всі стани майна</option>
                      {PROPERTY_CONDITIONS.map(cond => (
                        <option key={cond} value={cond}>{cond}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* PROPERTY MAIN DATA TABLE */}
              <div className="card-glass overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="table-grid w-full">
                    <thead>
                      <tr>
                        <th className="w-28 text-center">Інв. №</th>
                        <th>Назва об'єкта майна</th>
                        <th className="w-44">Категорія</th>
                        <th className="w-20 text-center">Кількість</th>
                        <th>Розподіл по локаціях & МВО</th>
                        <th className="w-24 text-right">Ціна (грн)</th>
                        <th className="w-28 text-right">Сума (грн)</th>
                        <th className="w-28 text-center">Стан</th>
                        <th className="w-16 text-center">Рік</th>
                        <th className="w-28 text-center">Дії</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center py-12 text-slate-400 italic">
                            За обраними фільтрами майна не знайдено. Натисніть «Додати» для реєстрації нового майна.
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map(item => {
                          const totalCost = (item.INITIAL_COST || 0) * (item.TOTAL_QUANTITY || 0);

                          return (
                            <tr key={item.ID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                              {/* INVENTAR NUMBER BADGE */}
                              <td className="text-center">
                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-mono font-bold text-xs rounded border border-blue-200 dark:border-blue-800">
                                  #{item.INVENTAR_NUMBER}
                                </span>
                              </td>

                              {/* PROPERTY NAME & NOTES */}
                              <td>
                                <div className="font-bold text-slate-800 dark:text-slate-100 text-xs">{item.NAME}</div>
                                {item.NOTES && (
                                  <div className="text-[11px] text-slate-400 dark:text-slate-500 italic mt-0.5">{item.NOTES}</div>
                                )}
                              </td>

                              {/* CATEGORY WITH ICON */}
                              <td>
                                <div className="flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                                  {getCategoryIcon(item.CATEGORY)}
                                  <span className="truncate">{item.CATEGORY}</span>
                                </div>
                              </td>

                              {/* TOTAL QUANTITY */}
                              <td className="text-center">
                                <span className={`px-2 py-1 font-black text-xs rounded-md ${item.TOTAL_QUANTITY > 0 ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'}`}>
                                  {item.TOTAL_QUANTITY} шт
                                </span>
                              </td>

                              {/* LOCATIONS & RESPONSIBLE PERSONS BREAKDOWN */}
                              <td>
                                <div className="flex flex-wrap gap-1 py-1">
                                  {item.LOCATIONS && item.LOCATIONS.length > 0 ? (
                                    item.LOCATIONS.map((loc, idx) => (
                                      <div 
                                        key={idx}
                                        className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-[11px]"
                                      >
                                        <MapPin className="w-3 h-3 text-rose-500" />
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{loc.locationName}</span>
                                        {loc.responsiblePerson && (
                                          <span className="text-slate-500 dark:text-slate-400">({loc.responsiblePerson})</span>
                                        )}
                                        <span className="font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-1 rounded">
                                          {loc.quantity} шт
                                        </span>

                                        {loc.quantity > 0 && (
                                          <button
                                            onClick={() => handleOpenWriteOffModal(item, loc.locationName)}
                                            className="ml-1 text-[10px] text-rose-600 dark:text-rose-400 hover:underline font-bold"
                                            title="Списати з цієї локації"
                                          >
                                            [Списати]
                                          </button>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">Загальна територія садка</span>
                                  )}
                                </div>
                              </td>

                              {/* INITIAL COST */}
                              <td className="text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                                {item.INITIAL_COST.toFixed(2)}
                              </td>

                              {/* TOTAL BALANCE COST */}
                              <td className="text-right font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                                {totalCost.toFixed(2)}
                              </td>

                              {/* CONDITION */}
                              <td className="text-center">
                                {getConditionBadge(item.CONDITION)}
                              </td>

                              {/* YEAR */}
                              <td className="text-center font-mono text-xs text-slate-500">
                                {item.YEAR_COMMISSIONED}
                              </td>

                              {/* ACTIONS */}
                              <td className="text-center">
                                <div className="flex items-center justify-center space-x-1">
                                  <button
                                    onClick={() => handleOpenWriteOffModal(item)}
                                    className="px-2 py-1 text-xs bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 font-bold rounded flex items-center space-x-1 transition"
                                    title="Списати об'єкт з балансу"
                                  >
                                    <Archive className="w-3 h-3 text-rose-500" />
                                    <span>Списати</span>
                                  </button>

                                  <button
                                    onClick={() => handleOpenEditModal(item)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition"
                                    title="Редагувати майно"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(item.ID)}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition"
                                    title="Вилучити з обліку"
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
            </>
          )}

          {/* TAB 2: WRITE-OFFS JOURNAL */}
          {activeSubTab === 'writeoffs' && (
            <div className="space-y-4">
              {/* WRITE OFF STATS HEADER */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="card-glass p-3.5 flex items-center space-x-3.5 border-l-4 border-rose-500">
                  <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400">
                    <Archive className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Всього актів списання</div>
                    <div className="text-xl font-black text-slate-800 dark:text-slate-100">{filteredWriteOffs.length} актів</div>
                  </div>
                </div>

                <div className="card-glass p-3.5 flex items-center space-x-3.5 border-l-4 border-amber-500">
                  <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Списано предметів</div>
                    <div className="text-xl font-black text-amber-600 dark:text-amber-400">{totalWriteOffsCount} одиниць</div>
                  </div>
                </div>

                <div className="card-glass p-3.5 flex items-center space-x-3.5 border-l-4 border-purple-500">
                  <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400">
                    <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center text-2xl font-black leading-none">₴</span>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Загальна сума списання</div>
                    <div className="text-xl font-black text-rose-600 dark:text-rose-400">{totalWriteOffsSum.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} грн</div>
                  </div>
                </div>
              </div>

              {/* WRITE-OFF TABLE */}
              <div className="card-glass overflow-hidden">
                <div className="p-3 bg-slate-200/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                    <FileText className="w-4 h-4 text-rose-500" />
                    <span>Журнал офіційних актів списання майна ЗДО №145 ({filteredWriteOffs.length})</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="hidden md:inline text-[11px] text-slate-500">Офіційні акти комісії з інвентаризації</span>
                    <button
                      type="button"
                      onClick={handleOpenJournalWriteOffModal}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-rose-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Створити акт</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="table-grid w-full">
                    <thead>
                      <tr>
                        <th className="w-28 text-center">№ Акта</th>
                        <th className="w-24 text-center">Дата</th>
                        <th className="w-24 text-center">Інв. №</th>
                        <th>Найменування об'єкта</th>
                        <th className="w-20 text-center">Списано</th>
                        <th>Локація & МВО</th>
                        <th className="w-28 text-right">Сума (грн)</th>
                        <th>Причина списання</th>
                        <th className="w-32 text-center">Дії / Друк</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWriteOffs.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-12 text-slate-400 italic">
                            Журнал списання порожній. Натисніть «Створити акт», щоб оформити перше списання.
                          </td>
                        </tr>
                      ) : (
                        filteredWriteOffs.map(act => (
                          <tr key={act.ID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                            <td className="text-center">
                              <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-mono font-bold text-xs rounded border border-rose-200 dark:border-rose-800">
                                {act.ACT_NUMBER}
                              </span>
                            </td>
                            <td className="text-center font-mono text-xs">{act.DATE}</td>
                            <td className="text-center font-mono text-xs font-bold text-blue-600">#{act.INVENTAR_NUMBER}</td>
                            <td>
                              <div className="font-bold text-slate-800 dark:text-slate-100 text-xs">{act.PROPERTY_NAME}</div>
                              <div className="text-[10px] text-slate-400">{act.CATEGORY}</div>
                            </td>
                            <td className="text-center">
                              <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-black text-xs rounded">
                                {act.QUANTITY} шт
                              </span>
                            </td>
                            <td>
                              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{act.LOCATION_NAME}</div>
                              <div className="text-[10px] text-slate-500">МВО: {act.RESPONSIBLE_PERSON}</div>
                            </td>
                            <td className="text-right font-mono font-bold text-xs text-rose-600 dark:text-rose-400">
                              {act.TOTAL_COST.toFixed(2)}
                            </td>
                            <td>
                              <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">{act.REASON}</div>
                              {act.NOTES && <div className="text-[10px] text-slate-400 italic">{act.NOTES}</div>}
                            </td>
                            <td className="text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => setViewingAct(act)}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold rounded flex items-center space-x-1 transition shadow-sm"
                                  title="Переглянути та роздрукувати офіційний Акт списання"
                                >
                                  <Printer className="w-3 h-3 text-amber-400" />
                                  <span>Акт</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteWriteOffRecord(act.ID)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                  title="Скасувати списання (Повернути майно)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {!viewingAct && (
        <div className="print-only font-serif text-black bg-white">
          <div className="print-header">
            <div className="text-xs font-bold uppercase">Криворізький КЗДО (ясла-садок) КТ №145 КМР</div>
            <h1 className="text-base font-bold uppercase mt-1">
              {activeSubTab === 'inventory'
                ? 'Інвентаризаційний опис наявного майна'
                : 'Журнал актів списання майна'}
            </h1>
            <div className="text-xs mt-1">Дата формування: {new Date().toLocaleDateString('uk-UA')}</div>
          </div>

          {activeSubTab === 'inventory' ? (
            <table className="print-table">
              <thead>
                <tr>
                  <th>№</th>
                  <th>Інв. №</th>
                  <th>Найменування</th>
                  <th>Категорія</th>
                  <th>Кількість</th>
                  <th>Ціна, грн</th>
                  <th>Балансова вартість, грн</th>
                  <th>Стан</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => (
                  <tr key={item.ID}>
                    <td className="text-center">{index + 1}</td>
                    <td className="text-center font-mono">{item.INVENTAR_NUMBER}</td>
                    <td className="font-bold">{item.NAME}</td>
                    <td>{item.CATEGORY}</td>
                    <td className="text-center">{item.TOTAL_QUANTITY}</td>
                    <td className="text-right">{item.INITIAL_COST.toFixed(2)}</td>
                    <td className="text-right font-bold">{(item.INITIAL_COST * item.TOTAL_QUANTITY).toFixed(2)}</td>
                    <td>{item.CONDITION}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="print-table">
              <thead>
                <tr>
                  <th>№ акта</th>
                  <th>Дата</th>
                  <th>Інв. №</th>
                  <th>Найменування</th>
                  <th>К-сть</th>
                  <th>Локація</th>
                  <th>Сума, грн</th>
                  <th>Причина</th>
                </tr>
              </thead>
              <tbody>
                {filteredWriteOffs.map(act => (
                  <tr key={act.ID}>
                    <td className="text-center font-bold">{act.ACT_NUMBER}</td>
                    <td className="text-center">{act.DATE}</td>
                    <td className="text-center font-mono">{act.INVENTAR_NUMBER}</td>
                    <td className="font-bold">{act.PROPERTY_NAME}</td>
                    <td className="text-center">{act.QUANTITY}</td>
                    <td>{act.LOCATION_NAME}</td>
                    <td className="text-right font-bold">{act.TOTAL_COST.toFixed(2)}</td>
                    <td>{act.REASON}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="print-signatures-block">
            <div>Голова комісії: ____________________ /_________________/</div>
            <div>Матеріально відповідальна особа: ____________________ /_________________/</div>
          </div>
        </div>
      )}

      {/* ADD / EDIT PROPERTY ITEM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-base">
                <Boxes className="w-5 h-5 text-blue-400" />
                <span>{editingItem ? 'Редагування об\'єкта майна' : 'Реєстрація нового майна ДНЗ'}</span>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveItem} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Inventar Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Інвентарний номер *
                  </label>
                  <input
                    type="text"
                    required
                    value={formInventar}
                    onChange={(e) => setFormInventar(e.target.value)}
                    placeholder="Наприклад: 10114022"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Назва предмета / майна *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Наприклад: Шафа дитяча для роздягальні"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Категорія майна
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PROPERTY_CATEGORIES.filter(c => c !== 'Всі категорії').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Condition */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Стан експлуатації
                  </label>
                  <select
                    value={formCondition}
                    onChange={(e) => setFormCondition(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PROPERTY_CONDITIONS.map(cond => (
                      <option key={cond} value={cond}>{cond}</option>
                    ))}
                  </select>
                </div>

                {/* Year Commissioned */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Рік введення в експлуатацію
                  </label>
                  <input
                    type="number"
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    min={1970}
                    max={2030}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Cost */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Первинна балансова вартість 1 одиниці (грн)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formCost}
                  onChange={(e) => setFormCost(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* DYNAMIC LOCATIONS SECTION */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    <span>Розподіл по групуваннях, приміщеннях та МВО</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLocationRow}
                    className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 text-blue-600 dark:text-blue-300 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition border border-blue-200 dark:border-blue-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Додати приміщення / МВО</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {formLocations.map((loc, idx) => (
                    <div key={loc.id} className="grid grid-cols-12 gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 items-center">
                      <div className="col-span-5">
                        <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Група / Приміщення</label>
                        <select
                          value={loc.locationName}
                          onChange={(e) => handleLocationChange(loc.id, 'locationName', e.target.value)}
                          className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold text-slate-800 dark:text-slate-200"
                        >
                          <option value="">Оберіть локацію або введіть custom</option>
                          {availableGroups.map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                          <option value="Харчоблок">Харчоблок</option>
                          <option value="Музична зала">Музична зала</option>
                          <option value="Методичний кабінет">Методичний кабінет</option>
                          <option value="Загальна територія ДНЗ">Загальна територія ДНЗ</option>
                        </select>
                      </div>

                      <div className="col-span-5">
                        <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Матеріально відповідальна особа (МВО)</label>
                        <select
                          value={loc.responsiblePerson}
                          onChange={(e) => handleLocationChange(loc.id, 'responsiblePerson', e.target.value)}
                          className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-medium text-slate-800 dark:text-slate-200"
                        >
                          <option value="Завгосп">Завгосп Сидоренко В. П.</option>
                          {availableEmployees.map(e => (
                            <option key={e} value={e}>{e}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2 flex items-center space-x-1">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">К-сть (шт)</label>
                          <input
                            type="number"
                            min={1}
                            value={loc.quantity}
                            onChange={(e) => handleLocationChange(loc.id, 'quantity', Number(e.target.value))}
                            className="w-full px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold text-center"
                          />
                        </div>
                        {formLocations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLocationRow(loc.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded mt-4"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Примітки / Додатковий опис
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Додаткові відомості про предмет..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  {editingItem ? 'Зберегти зміни' : 'Зареєструвати майно'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE WRITE-OFF ACT MODAL */}
      {isWriteOffModalOpen && targetWriteOffItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-rose-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-base">
                <Archive className="w-5 h-5 text-rose-300" />
                <span>Оформлення Акта списання майна з балансу</span>
              </div>
              <button 
                onClick={() => setIsWriteOffModalOpen(false)}
                className="p-1 text-rose-200 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmWriteOff} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              {isJournalWriteOff && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Об'єкт майна для списання *
                  </label>
                  <select
                    value={targetWriteOffItem.ID}
                    onChange={(e) => handleWriteOffItemChange(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                  >
                    {items
                      .filter(item =>
                        item.TOTAL_QUANTITY > 0
                        && (item.LOCATIONS || []).some(location => location.quantity > 0)
                      )
                      .map(item => (
                        <option key={item.ID} value={item.ID}>
                          #{item.INVENTAR_NUMBER} — {item.NAME} (наявність: {item.TOTAL_QUANTITY} шт)
                        </option>
                      ))}
                  </select>
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                    Після проведення акта кількість автоматично зменшиться у вибраній локації та в реєстрі майна.
                  </p>
                </div>
              )}

              {/* Target Item Overview Header */}
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-900 flex justify-between items-center text-xs">
                <div>
                  <div className="font-black text-rose-900 dark:text-rose-200 text-sm">{targetWriteOffItem.NAME}</div>
                  <div className="text-slate-500 font-mono">Інв. №: #{targetWriteOffItem.INVENTAR_NUMBER} | Категорія: {targetWriteOffItem.CATEGORY}</div>
                </div>
                <div className="text-right font-mono font-bold text-rose-700 dark:text-rose-300">
                  {targetWriteOffItem.INITIAL_COST.toFixed(2)} грн / 1 шт
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">№ Акта списання</label>
                  <input
                    type="text"
                    required
                    value={woActNumber}
                    onChange={(e) => setWoActNumber(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Дата складання акта</label>
                  <input
                    type="date"
                    required
                    value={woDate}
                    onChange={(e) => setWoDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Списати з локації *</label>
                  <select
                    value={woLocation}
                    onChange={(e) => {
                      setWoLocation(e.target.value);
                      const locObj = (targetWriteOffItem.LOCATIONS || []).find(l => l.locationName === e.target.value);
                      if (locObj) setWoQuantity(Math.min(1, locObj.quantity));
                    }}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                  >
                    {(targetWriteOffItem.LOCATIONS || []).filter(l => l.quantity > 0).map(l => (
                      <option key={l.id || l.locationName} value={l.locationName}>
                        {l.locationName} (Наявність: {l.quantity} шт)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Кількість для списання (шт) *</label>
                  <input
                    type="number"
                    min={1}
                    max={(targetWriteOffItem.LOCATIONS || []).find(l => l.locationName === woLocation)?.quantity || targetWriteOffItem.TOTAL_QUANTITY || 1}
                    value={woQuantity}
                    onChange={(e) => setWoQuantity(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black text-rose-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Причина списання з балансу *</label>
                <select
                  value={woReason}
                  onChange={(e) => setWoReason(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium"
                >
                  {WRITE_OFF_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Склад інвентаризаційної комісії ЗДО №145</label>
                <div>
                  <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">Голова комісії:</span>
                  <input
                    type="text"
                    value={woCommissionHead}
                    onChange={(e) => setWoCommissionHead(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">Члени комісії:</span>
                  <input
                    type="text"
                    value={woCommissionMembers}
                    onChange={(e) => setWoCommissionMembers(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Додаткові примітки комісії</label>
                <textarea
                  rows={2}
                  value={woNotes}
                  onChange={(e) => setWoNotes(e.target.value)}
                  placeholder="Деталі візуального огляду або рішення комісії..."
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div className="text-xs font-bold text-rose-700 dark:text-rose-400">
                  Загальна сума списання: {(targetWriteOffItem.INITIAL_COST * woQuantity).toFixed(2)} грн
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsWriteOffModalOpen(false)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-1"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Провести списання</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW / PRINT OFFICIAL WRITE-OFF ACT MODAL */}
      {viewingAct && (
        <div className="print-preview-shell fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="print-preview-panel bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900">
            <div className="px-6 py-3 bg-slate-900 text-white flex items-center justify-between no-print">
              <span className="font-bold text-sm flex items-center space-x-2">
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Офіційний Акт списання майна {viewingAct.ACT_NUMBER}</span>
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Роздрукувати Акт</span>
                </button>
                <button
                  onClick={() => setViewingAct(null)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable State Document Container */}
            <div className="print-only print-preview print-portrait p-8 overflow-y-auto font-serif text-black space-y-4 bg-white">
              {/* Header Header */}
              <div className="flex justify-between items-start border-b-2 border-black pb-3">
                <div>
                  <div className="text-xs font-bold uppercase">УКРАЇНА | ДНІПРОПЕТРОВСЬКА ОБЛАСТЬ</div>
                  <div className="text-sm font-bold uppercase mt-0.5">КРИВОРІЗЬКИЙ КЗДО (ЯСЛА-САДОК) КТ №145 КМР</div>
                  <div className="text-[11px] text-slate-700 mt-0.5">ЄДРПОУ: 26136748 | вул. Перлинна 23А, м. Кривий Ріг</div>
                </div>
                <div className="text-right text-xs">
                  <div><b>ЗАТВЕРДЖУЮ</b></div>
                  <div>Директор КЗДО № 145</div>
                  <div className="mt-4">________________ / {viewingAct.COMMISSION_HEAD.split(' ')[0]} {viewingAct.COMMISSION_HEAD.split(' ')[1]}</div>
                  <div className="text-[11px] mt-1 font-sans">«_____» ____________ 2026 р.</div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center py-2">
                <h2 className="text-base font-bold uppercase tracking-wide">
                  АКТ № {viewingAct.ACT_NUMBER.replace(/[^\d/]+/g, '')}
                </h2>
                <h3 className="text-xs font-bold uppercase mt-0.5">
                  про списання з балансу майна та інвентарю ЗДО
                </h3>
                <div className="text-xs italic mt-1 font-sans">
                  від {viewingAct.DATE} р. | Локація: <b>{viewingAct.LOCATION_NAME}</b>
                </div>
              </div>

              <div className="text-xs leading-relaxed font-sans">
                Комісія у складі Голови комісії: <b>{viewingAct.COMMISSION_HEAD}</b> та членів комісії: <b>{viewingAct.COMMISSION_MEMBERS}</b>, діюча на підставі наказу по КЗДО № 145, провела огляд об'єкта майна та встановила його непридатність до подальшого використання.
              </div>

              {/* Table */}
              <table className="w-full border-collapse border border-black text-xs font-sans">
                <thead>
                  <tr className="bg-slate-100 border-b border-black font-bold">
                    <th className="border border-black p-1.5 text-center">Інв. №</th>
                    <th className="border border-black p-1.5 text-left">Найменування об'єкта майна</th>
                    <th className="border border-black p-1.5 text-center">К-сть</th>
                    <th className="border border-black p-1.5 text-right">Первинна ціна (грн)</th>
                    <th className="border border-black p-1.5 text-right">Загальна сума (грн)</th>
                    <th className="border border-black p-1.5 text-left">Причина списання</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-1.5 text-center font-mono font-bold">#{viewingAct.INVENTAR_NUMBER}</td>
                    <td className="border border-black p-1.5 font-bold">{viewingAct.PROPERTY_NAME}</td>
                    <td className="border border-black p-1.5 text-center font-bold">{viewingAct.QUANTITY} шт</td>
                    <td className="border border-black p-1.5 text-right font-mono">{viewingAct.INITIAL_COST.toFixed(2)}</td>
                    <td className="border border-black p-1.5 text-right font-mono font-bold">{viewingAct.TOTAL_COST.toFixed(2)}</td>
                    <td className="border border-black p-1.5">{viewingAct.REASON}</td>
                  </tr>
                </tbody>
              </table>

              <div className="text-xs font-sans pt-2">
                <b>Висновок комісії:</b> Зазначений предмет підлягає вилученню з балансу та утилізації. 
                {viewingAct.NOTES && <span> Примітки: {viewingAct.NOTES}</span>}
              </div>

              {/* Signatures */}
              <div className="pt-8 space-y-4 text-xs font-sans">
                <div className="flex justify-between items-center">
                  <span>Голова комісії:</span>
                  <span>_____________________ / {viewingAct.COMMISSION_HEAD}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Члени комісії:</span>
                  <span>_____________________ / {viewingAct.COMMISSION_MEMBERS.split(',')[0] || ''}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Матеріально відповідальна особа:</span>
                  <span>_____________________ / {viewingAct.RESPONSIBLE_PERSON}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
