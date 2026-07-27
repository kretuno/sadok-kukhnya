import React, { useState, useEffect } from 'react';
import { PropertyItem, PropertyLocationDistribution } from '../../types';
import { getPropertyItems, savePropertyItem, deletePropertyItem, getGroups, getEmployees } from '../../services/db';
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
  DollarSign, 
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
  Activity
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

export const PropertyManagementModule: React.FC = () => {
  const [items, setItems] = useState<PropertyItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Всі категорії');
  const [selectedLocation, setSelectedLocation] = useState('Всі локації');
  const [selectedCondition, setSelectedCondition] = useState('Всі стани');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<PropertyItem> | null>(null);

  // Form State
  const [formInventar, setFormInventar] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState(PROPERTY_CATEGORIES[1]);
  const [formCondition, setFormCondition] = useState<'Відмінний' | 'Задовільний' | 'Потребує ремонту' | 'Підлягає списанню'>('Відмінний');
  const [formYear, setFormYear] = useState<number>(new Date().getFullYear());
  const [formCost, setFormCost] = useState<number>(0);
  const [formNotes, setFormNotes] = useState('');
  
  // Dynamic Locations State inside Form
  const [formLocations, setFormLocations] = useState<PropertyLocationDistribution[]>([
    { id: 'loc-1', locationName: 'Група «Сонечко»', responsiblePerson: 'Завгосп', quantity: 1 }
  ]);

  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const list = getPropertyItems();
    setItems(list);
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

  // KPI Computations
  const totalTitles = filteredItems.length;
  const totalQuantitySum = filteredItems.reduce((acc, i) => acc + (i.TOTAL_QUANTITY || 0), 0);
  const totalBalanceCost = filteredItems.reduce((acc, i) => acc + ((i.INITIAL_COST || 0) * (i.TOTAL_QUANTITY || 0)), 0);
  const itemsNeedingAttention = filteredItems.filter(i => i.CONDITION === 'Потребує ремонту' || i.CONDITION === 'Підлягає списанню').length;

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
  };

  const handleExportPDF = () => {
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
    exportToPDF('Інвентаризаційний опис майна SADOK', headers, rows);
  };

  return (
    <>
      {/* SCREEN UI (Hidden on Print) */}
      <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-950 no-print">
      {/* QUICK TOOLBAR */}
      <QuickToolbar
        onAdd={handleOpenAddModal}
        onRefresh={loadData}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        onPrint={() => window.print()}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        title="SADOK Майно — Облік майна та інвентаризація ДНЗ"
      />

      <div className="flex-1 overflow-auto p-4 space-y-4">
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
              <DollarSign className="w-6 h-6" />
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
                  <th className="w-48">Категорія</th>
                  <th className="w-24 text-center">Кількість</th>
                  <th>Розподіл по локаціях & МВО</th>
                  <th className="w-28 text-right">Ціна (грн)</th>
                  <th className="w-32 text-right">Сума (грн)</th>
                  <th className="w-32 text-center">Стан</th>
                  <th className="w-20 text-center">Рік</th>
                  <th className="w-20 text-center">Дії</th>
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
                            <span>{item.CATEGORY}</span>
                          </div>
                        </td>

                        {/* TOTAL QUANTITY */}
                        <td className="text-center">
                          <span className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-black text-xs rounded-md">
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
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition"
                              title="Редагувати майно"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.ID)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition"
                              title="Вилучити з обліку"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* ADD / EDIT PROPERTY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-base">
                <Building2 className="w-5 h-5 text-amber-400" />
                <span>{editingItem ? 'Редагувати об\'єкт майна' : 'Зареєструвати нове майно'}</span>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveItem} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Інвентарний номер *</label>
                  <input
                    type="text"
                    required
                    value={formInventar}
                    onChange={(e) => setFormInventar(e.target.value)}
                    placeholder="Наприклад: 10114008"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Назва майна / об'єкта *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Наприклад: Шафа дитяча 5-секційна"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Категорія майна</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-medium"
                  >
                    {PROPERTY_CATEGORIES.filter(c => c !== 'Всі категорії').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Стан майна</label>
                  <select
                    value={formCondition}
                    onChange={(e) => setFormCondition(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-medium"
                  >
                    {PROPERTY_CONDITIONS.map(cond => (
                      <option key={cond} value={cond}>{cond}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Рік введення в експлуатацію</label>
                  <input
                    type="number"
                    min="1980"
                    max="2030"
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Первинна вартість 1 шт (грн)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formCost}
                    onChange={(e) => setFormCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Примітки / Характеристики</label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Наприклад: Серійний номер, матеріал, колір..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* DYNAMIC LOCATIONS & QUANTITY BREAKDOWN */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center space-x-1.5">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span>Розподіл кількості по локаціях (групи / приміщення / МВО)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLocationRow}
                    className="px-2.5 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold rounded-lg text-[11px] hover:bg-blue-200 transition flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Додати локацію</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {formLocations.map((loc, idx) => (
                    <div key={loc.id || idx} className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          list="groups-list"
                          placeholder="Локація / Група ДНЗ"
                          value={loc.locationName}
                          onChange={(e) => handleLocationChange(loc.id, 'locationName', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100"
                        />
                        <datalist id="groups-list">
                          {availableGroups.map((g, i) => <option key={i} value={g} />)}
                        </datalist>
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          list="employees-list"
                          placeholder="МВО / Відповідальний"
                          value={loc.responsiblePerson}
                          onChange={(e) => handleLocationChange(loc.id, 'responsiblePerson', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100"
                        />
                        <datalist id="employees-list">
                          {availableEmployees.map((e, i) => <option key={i} value={e} />)}
                        </datalist>
                      </div>
                      <div className="w-24">
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            min="1"
                            required
                            value={loc.quantity}
                            onChange={(e) => handleLocationChange(loc.id, 'quantity', Number(e.target.value))}
                            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-center text-blue-600 dark:text-blue-400"
                          />
                          <span className="text-[10px] text-slate-400">шт</span>
                        </div>
                      </div>
                      {formLocations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLocationRow(loc.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition"
                          title="Видалити рядок локації"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-right text-[11px] font-bold text-slate-500">
                  Загальна підсумкова кількість: <span className="text-blue-600 dark:text-blue-400 font-black">{formLocations.reduce((s, l) => s + (Number(l.quantity) || 0), 0)} шт</span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-300 transition"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Зберегти майно</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      {/* FORMAL STATE PRINT LAYOUT (A4 Landscape) */}
      <div className="print-only p-4 font-serif text-black bg-white">
        {/* State Official Document Header */}
        <div className="flex justify-between items-start mb-3 border-b-2 border-black pb-2">
          <div>
            <div className="font-bold text-xs">УКРАЇНА</div>
            <div className="text-[11px]">ДНІПРОПЕТРОВСЬКА ОБЛАСТЬ</div>
            <div className="font-bold text-xs uppercase">КРИВОРІЗЬКИЙ КОМУНАЛЬНИЙ ЗАКЛАД ДОШКІЛЬНОЇ ОСВІТИ №145 КМР</div>
            <div className="text-[10px] text-slate-700">Код ЄДРПОУ: 26136748 | вул. Перлинна 23А, м. Кривий Ріг</div>
          </div>
          <div className="text-right text-xs">
            <div><b>ЗАТВЕРДЖУЮ</b></div>
            <div>Директор КЗДО № 145 КМР</div>
            <div className="mt-4">________________ / Н. Г. Павлухіна</div>
            <div className="text-[10px] mt-1">«_____» ________________ 2026 р.</div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center my-3">
          <h1 className="text-sm font-bold uppercase tracking-wide">
            ІНВЕНТАРИЗАЦІЙНИЙ ОПИС МАТЕРІАЛЬНИХ ЦІННОСТЕЙ ТА БАЛАНСОВОГО МАЙНА
          </h1>
          <div className="text-[11px] mt-1">
            <b>Категорія:</b> {selectedCategory} &nbsp;|&nbsp;
            <b>Локація:</b> {selectedLocation} &nbsp;|&nbsp;
            <b>Дата формування:</b> {new Date().toLocaleDateString('uk-UA')}
          </div>
        </div>

        {/* Strict Grid Table */}
        <table className="w-full border-collapse border border-black text-[11px] my-2">
          <thead>
            <tr className="bg-slate-100 border-b border-black font-bold text-center">
              <th className="border border-black p-1 w-8">№</th>
              <th className="border border-black p-1 w-20">Інв. №</th>
              <th className="border border-black p-1 text-left">Найменування об'єкта майна</th>
              <th className="border border-black p-1 text-left w-36">Категорія</th>
              <th className="border border-black p-1 w-14 text-center">К-сть (шт)</th>
              <th className="border border-black p-1 text-left">Розподіл по приміщеннях & МВО</th>
              <th className="border border-black p-1 w-24 text-right">Первинна ціна (грн)</th>
              <th className="border border-black p-1 w-28 text-right">Балансова сума (грн)</th>
              <th className="border border-black p-1 w-20 text-center">Стан</th>
              <th className="border border-black p-1 w-12 text-center">Рік</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item, idx) => {
              const itemTotalCost = (item.INITIAL_COST || 0) * (item.TOTAL_QUANTITY || 0);
              return (
                <tr key={item.ID} className="border-b border-black">
                  <td className="border border-black p-1 text-center font-mono">{idx + 1}</td>
                  <td className="border border-black p-1 text-center font-bold font-mono">#{item.INVENTAR_NUMBER}</td>
                  <td className="border border-black p-1 font-bold">
                    {item.NAME}
                    {item.NOTES && <span className="block text-[10px] font-normal italic">({item.NOTES})</span>}
                  </td>
                  <td className="border border-black p-1">{item.CATEGORY}</td>
                  <td className="border border-black p-1 text-center font-bold">{item.TOTAL_QUANTITY}</td>
                  <td className="border border-black p-1 text-[10px]">
                    {(item.LOCATIONS || []).map(l => `${l.locationName} (${l.responsiblePerson}): ${l.quantity} шт`).join('; ')}
                  </td>
                  <td className="border border-black p-1 text-right font-mono">{item.INITIAL_COST.toFixed(2)}</td>
                  <td className="border border-black p-1 text-right font-mono font-bold">{itemTotalCost.toFixed(2)}</td>
                  <td className="border border-black p-1 text-center">{item.CONDITION}</td>
                  <td className="border border-black p-1 text-center font-mono">{item.YEAR_COMMISSIONED}</td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-black font-bold bg-slate-100">
              <td colSpan={4} className="border border-black p-1.5 text-right uppercase">Разом за описом:</td>
              <td className="border border-black p-1.5 text-center font-bold">{totalQuantitySum} шт</td>
              <td className="border border-black p-1.5 font-bold">{totalTitles} найменувань</td>
              <td className="border border-black p-1.5 text-right font-mono">X</td>
              <td className="border border-black p-1.5 text-right font-mono text-xs">{totalBalanceCost.toFixed(2)} грн</td>
              <td colSpan={2} className="border border-black p-1.5"></td>
            </tr>
          </tbody>
        </table>

        {/* Official Commission Signatures */}
        <div className="mt-6 text-xs space-y-3 page-break-inside-avoid">
          <p className="italic">
            Усі цінності, пойменовані в цьому інвентаризаційному описі з № 1 по № {filteredItems.length}, перевірені інвентаризаційною комісією в натурі за моєї присутності та внесені до опису. Претензій до комісії не маю.
          </p>

          <div className="flex justify-between items-end pt-2">
            <div className="space-y-2">
              <div><b>Голова комісії:</b> ____________________ / Н. Г. Павлухіна</div>
              <div><b>Члени комісії:</b> ____________________ / Н. Є. Суміна</div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ____________________ / О. І. Коваль</div>
            </div>
            <div className="space-y-2 text-right">
              <div><b>Матеріально-відповідальна особа (МВО):</b> ____________________ / (Підпис)</div>
              <div>«_____» ________________ 2026 р.</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
