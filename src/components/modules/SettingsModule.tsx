import React, { useState, useEffect } from 'react';
import { Database, Building, HardDrive, CheckCircle2, ShieldCheck, Monitor, Trash2, AlertTriangle, Save, User, Phone, MapPin, Hash, Clock, DollarSign, PackageCheck, Download, Upload, Sliders, Utensils, Plus, Layers, ToggleLeft, ToggleRight, AlertCircle, FileText } from 'lucide-react';
import { getInstitutions, updateInstitution, addInstitution, deleteInstitution, resetDatabaseToDefaults, exportSqliteFile, importSqliteFile } from '../../services/db';
import { Institution } from '../../types';
import { SystemAdministrationPanel } from '../system/SystemAdministrationPanel';
import { recordAudit } from '../../services/governance';

export const SettingsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'nutrition' | 'warehouse' | 'database' | 'system'>('general');
  const [insts, setInsts] = useState<Institution[]>([]);
  const [selectedInstId, setSelectedInstId] = useState<number>(1);
  const [instForm, setInstForm] = useState({
    name: 'Криворізький КЗДО КТ №145 КМР',
    adres: 'Дніпропетровська область, м. Кривий Ріг, Тернівський район, вул. Перлинна 23А',
    telefon: '(098) 816-05-37',
    director: 'Павлухіна Наталія Георгіївна',
    nurse: 'Суміна Наталія Євгенівна',
    cook: 'Сидоренко Віра Петрівна',
    edrpou: '26136748',
    email: 'kzdo145@kr.gov.ua',
    isSeparateWarehouse: false,
  });

  const [deleteProfileModal, setDeleteProfileModal] = useState<{ open: boolean; inst: Institution | null }>({
    open: false,
    inst: null,
  });

  const [costLimits, setCostLimits] = useState({
    yasla: 45.0,
    junior: 55.0,
    sad: 65.0,
    staff: 75.0,
  });

  const [mealSchedule, setMealSchedule] = useState({
    breakfast: '08:30',
    breakfast2: '10:30',
    lunch: '12:30',
    snack: '15:30',
    dinner: '17:30',
  });

  const [warehouseRules, setWarehouseRules] = useState({
    method: 'FIFO',
    expiryDaysAlert: 3,
    minStockAlert: true,
  });

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    loadData();
    const savedLimits = localStorage.getItem('medsestra_cost_limits');
    if (savedLimits) setCostLimits(current => ({ ...current, ...JSON.parse(savedLimits) }));

    const savedSchedule = localStorage.getItem('medsestra_meal_schedule');
    if (savedSchedule) setMealSchedule(JSON.parse(savedSchedule));

    const savedWarehouse = localStorage.getItem('medsestra_warehouse_rules');
    if (savedWarehouse) setWarehouseRules(JSON.parse(savedWarehouse));
  }, []);

  const loadData = () => {
    const list = getInstitutions();
    setInsts(list);
    if (list.length > 0) {
      const active = list.find(i => i.ID === selectedInstId) || list[0];
      setSelectedInstId(active.ID);
      setInstForm({
        name: active.NAME || 'Криворізький КЗДО КТ №145 КМР',
        adres: active.ADRES || 'Дніпропетровська область, м. Кривий Ріг, Тернівський район, вул. Перлинна 23А',
        telefon: active.TELEFON || '(098) 816-05-37',
        director: active.DIRECTOR || 'Павлухіна Наталія Георгіївна',
        nurse: active.NURSE || 'Суміна Наталія Євгенівна',
        cook: active.COOK || 'Петренко С. М.',
        edrpou: active.EDRPOU || '26136748',
        email: 'zdo145@ukr.net',
        isSeparateWarehouse: Boolean(active.IS_SEPARATE_WAREHOUSE),
      });
    }
  };

  const handleSelectProfile = (id: number) => {
    setSelectedInstId(id);
    const inst = insts.find(i => i.ID === id);
    if (inst) {
      setInstForm({
        name: inst.NAME,
        adres: inst.ADRES || 'Дніпропетровська область, м. Кривий Ріг, Тернівський район, вул. Перлинна 23А',
        telefon: inst.TELEFON || '(098) 816-05-37',
        director: inst.DIRECTOR || 'Павлухіна Наталія Георгіївна',
        nurse: inst.NURSE || 'Суміна Наталія Євгенівна',
        cook: inst.COOK || '',
        edrpou: inst.EDRPOU || '26136748',
        email: 'zdo145@ukr.net',
        isSeparateWarehouse: Boolean(inst.IS_SEPARATE_WAREHOUSE),
      });
    }
  };

  const handleCreateNewProfile = () => {
    const newId = addInstitution({
      name: `Новий ЗДО № ${insts.length + 1}`,
      adres: 'м. Кривий Ріг, вул. Перлинна 23А',
      telefon: '+380 (98) 816-05-37',
      isSeparateWarehouse: false,
    });
    const updated = getInstitutions();
    setInsts(updated);
    if (newId) handleSelectProfile(newId);
  };

  const handleDeleteProfileConfirm = () => {
    if (!deleteProfileModal.inst) return;
    const targetId = deleteProfileModal.inst.ID;
    const isSep = Boolean(deleteProfileModal.inst.IS_SEPARATE_WAREHOUSE);

    deleteInstitution(targetId, isSep);
    setDeleteProfileModal({ open: false, inst: null });

    const updated = getInstitutions();
    setInsts(updated);
    if (updated.length > 0) {
      handleSelectProfile(updated[0].ID);
    }
  };

  const handleSaveAll = () => {
    if (selectedInstId && insts.some(i => i.ID === selectedInstId)) {
      updateInstitution(selectedInstId, {
        name: instForm.name,
        adres: instForm.adres,
        telefon: instForm.telefon,
        edrpou: instForm.edrpou,
        director: instForm.director,
        nurse: instForm.nurse,
        cook: instForm.cook,
        isSeparateWarehouse: instForm.isSeparateWarehouse,
      });
    } else {
      addInstitution({
        name: instForm.name,
        adres: instForm.adres,
        telefon: instForm.telefon,
        edrpou: instForm.edrpou,
        director: instForm.director,
        nurse: instForm.nurse,
        cook: instForm.cook,
        isSeparateWarehouse: instForm.isSeparateWarehouse,
      });
    }
    localStorage.setItem('sadok_institution', JSON.stringify(instForm));
    localStorage.setItem('medsestra_cost_limits', JSON.stringify(costLimits));
    localStorage.setItem('medsestra_meal_schedule', JSON.stringify(mealSchedule));
    localStorage.setItem('medsestra_warehouse_rules', JSON.stringify(warehouseRules));
    recordAudit({
      action: 'update',
      entityType: 'application_settings',
      summary: 'Змінено параметри харчування, розкладу та складських правил',
      after: { costLimits, mealSchedule, warehouseRules },
    });

    loadData();
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 2500);
  };

  const handleExportBackup = () => {
    const backupData = {
      institution: instForm,
      costLimits,
      mealSchedule,
      warehouseRules,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medsestra_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetDatabase = () => {
    resetDatabaseToDefaults();
  };

  return (
    <div className="flex-1 p-6 overflow-auto bg-slate-100 dark:bg-slate-950 text-xs">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* System Header Banner */}
        <div className="card-glass p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                SADOK v1.0.44 (Налаштування системи)
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Параметри закладу дошкільної освіти, реквізити, ліміти вартості та складські правила
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSaveAll}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Зберегти налаштування</span>
            </button>
            {savedOk && (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1 animate-pulse">
                <CheckCircle2 className="w-4 h-4" />
                <span>Збережено!</span>
              </span>
            )}
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1">
          {[
            { id: 'general', label: 'Заклад та реквізити', icon: Building },
            { id: 'nutrition', label: 'Харчування та ліміти', icon: Utensils },
            { id: 'warehouse', label: 'Складські правила', icon: PackageCheck },
            { id: 'database', label: 'База даних та резервування', icon: HardDrive },
            { id: 'system', label: 'Доступ і контроль', icon: ShieldCheck },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-lg font-bold transition border-b-2 text-xs cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 border-blue-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'bg-transparent border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: GENERAL INSTITUTION REQUISITES & PROFILES */}
        {activeTab === 'general' && (
          <div className="card-glass p-5 rounded-xl space-y-5 shadow-sm">
            {/* PROFILE SWITCHER & MANAGEMENT BAR */}
            <div className="p-4 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm block">
                      Профілі закладів (Мульти-садок)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Оберіть або додайте профіль іншого садка для незалежного обліку
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  {/* SELECT PROFILE DROPDOWN */}
                  <select
                    value={selectedInstId}
                    onChange={(e) => handleSelectProfile(Number(e.target.value))}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-lg text-xs font-bold text-blue-900 dark:text-blue-200 focus:ring-2 focus:ring-blue-500 cursor-pointer flex-1 sm:w-60"
                  >
                    {insts.map(inst => (
                      <option key={inst.ID} value={inst.ID}>
                        {inst.NAME} {inst.IS_SEPARATE_WAREHOUSE ? ' (Окремий склад)' : ' (Спільний склад)'}
                      </option>
                    ))}
                  </select>

                  {/* ADD NEW PROFILE BUTTON */}
                  <button
                    onClick={handleCreateNewProfile}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition shadow-sm cursor-pointer whitespace-nowrap"
                    title="Створити новий профіль садка"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Новий профіль</span>
                  </button>

                  {/* DELETE PROFILE BUTTON */}
                  {insts.length > 1 && (
                    <button
                      onClick={() => {
                        const target = insts.find(i => i.ID === selectedInstId);
                        if (target) setDeleteProfileModal({ open: true, inst: target });
                      }}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-rose-100 dark:bg-rose-950/80 hover:bg-rose-200 text-rose-700 dark:text-rose-300 font-bold text-xs rounded-lg border border-rose-300 dark:border-rose-800 transition cursor-pointer whitespace-nowrap"
                      title="Видалити обраний профіль садка"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Видалити</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* WAREHOUSE SCOPE TOGGLE SWITCH */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="font-extrabold text-slate-800 dark:text-slate-100 text-xs flex items-center space-x-1.5">
                  <PackageCheck className="w-4 h-4 text-emerald-500" />
                  <span>Режим продуктового складу для {instForm.name}</span>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {instForm.isSeparateWarehouse
                    ? 'Окремий власний склад: прихідні накладні та залишки обліковуються автономно тільки для цього садка.'
                    : 'Спільний склад: продуктовий склад та приходи спільні для всіх садків у системі.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInstForm({ ...instForm, isSeparateWarehouse: !instForm.isSeparateWarehouse })}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-xs transition border cursor-pointer ${
                  instForm.isSeparateWarehouse
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-sm'
                    : 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                }`}
              >
                {instForm.isSeparateWarehouse ? (
                  <>
                    <ToggleRight className="w-5 h-5 text-emerald-600" />
                    <span>Окремий власний склад</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5 text-blue-500" />
                    <span>Спільний склад (Загальний)</span>
                  </>
                )}
              </button>
            </div>

            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <Building className="w-4 h-4 text-blue-500" />
              <span>Офіційні реквізити обраного закладу</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="flex items-center space-x-1.5 font-semibold text-slate-600 dark:text-slate-400">
                  <Building className="w-3.5 h-3.5 text-blue-500" />
                  <span>Повна назва закладу</span>
                </label>
                <input
                  type="text"
                  value={instForm.name}
                  onChange={(e) => setInstForm({ ...instForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="flex items-center space-x-1.5 font-semibold text-slate-600 dark:text-slate-400">
                  <Hash className="w-3.5 h-3.5 text-blue-500" />
                  <span>Код ЄДРПОУ</span>
                </label>
                <input
                  type="text"
                  value={instForm.edrpou}
                  onChange={(e) => setInstForm({ ...instForm, edrpou: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="flex items-center space-x-1.5 font-semibold text-slate-600 dark:text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  <span>Юридична адреса</span>
                </label>
                <input
                  type="text"
                  value={instForm.adres}
                  onChange={(e) => setInstForm({ ...instForm, adres: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="flex items-center space-x-1.5 font-semibold text-slate-600 dark:text-slate-400">
                  <Phone className="w-3.5 h-3.5 text-blue-500" />
                  <span>Контактний телефон</span>
                </label>
                <input
                  type="text"
                  value={instForm.telefon}
                  onChange={(e) => setInstForm({ ...instForm, telefon: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-medium"
                />
              </div>
            </div>

            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2 pt-4">
              <User className="w-4 h-4 text-emerald-500" />
              <span>Відповідальні особи закладу (для підписів у документах)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 dark:text-slate-400 block">ПІБ Директора (Завідувача)</label>
                <input
                  type="text"
                  value={instForm.director}
                  onChange={(e) => setInstForm({ ...instForm, director: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 dark:text-slate-400 block">ПІБ Старшої медичної сестри</label>
                <input
                  type="text"
                  value={instForm.nurse}
                  onChange={(e) => setInstForm({ ...instForm, nurse: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 dark:text-slate-400 block">ПІБ Шеф-кухаря / Комірника</label>
                <input
                  type="text"
                  value={instForm.cook}
                  onChange={(e) => setInstForm({ ...instForm, cook: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: NUTRITION & COST LIMITS */}
        {activeTab === 'nutrition' && (
          <div className="space-y-6">
            {/* Daily Cost Limits */}
            <div className="card-glass p-5 rounded-xl space-y-4 shadow-sm">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span>Гранична вартість харчування на 1 дитину в день (грн)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-1">
                  <label className="font-bold text-emerald-900 dark:text-emerald-300 block">Ясла (1–3 роки)</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="0.5"
                      value={costLimits.yasla}
                      onChange={(e) => setCostLimits({ ...costLimits, yasla: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded text-sm font-black text-emerald-700"
                    />
                    <span className="font-bold text-slate-600">грн/день</span>
                  </div>
                </div>

                <div className="p-3 bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800 rounded-lg space-y-1">
                  <label className="font-bold text-cyan-900 dark:text-cyan-300 block">Молодша група (3–4 роки)</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="0.5"
                      value={costLimits.junior}
                      onChange={(e) => setCostLimits({ ...costLimits, junior: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-cyan-300 dark:border-cyan-700 rounded text-sm font-black text-cyan-700"
                    />
                    <span className="font-bold text-slate-600">грн/день</span>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-1">
                  <label className="font-bold text-blue-900 dark:text-blue-300 block">Садок (4–7 років)</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="0.5"
                      value={costLimits.sad}
                      onChange={(e) => setCostLimits({ ...costLimits, sad: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded text-sm font-black text-blue-700"
                    />
                    <span className="font-bold text-slate-600">грн/день</span>
                  </div>
                </div>

                <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg space-y-1">
                  <label className="font-bold text-purple-900 dark:text-purple-300 block">Співробітники</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="0.5"
                      value={costLimits.staff}
                      onChange={(e) => setCostLimits({ ...costLimits, staff: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded text-sm font-black text-purple-700"
                    />
                    <span className="font-bold text-slate-600">грн/день</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Meal Schedule */}
            <div className="card-glass p-5 rounded-xl space-y-4 shadow-sm">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>Розклад прийомів їжі (Графік видачі)</span>
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { key: 'breakfast', label: 'Сніданок' },
                  { key: 'breakfast2', label: '2-й сніданок' },
                  { key: 'lunch', label: 'Обід' },
                  { key: 'snack', label: 'Полуденок' },
                  { key: 'dinner', label: 'Вечеря' },
                ].map(meal => (
                  <div key={meal.key} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-center space-y-1">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block text-xs">{meal.label}</span>
                    <input
                      type="time"
                      value={(mealSchedule as any)[meal.key]}
                      onChange={(e) => setMealSchedule({ ...mealSchedule, [meal.key]: e.target.value })}
                      className="w-full text-center px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold text-blue-600"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: WAREHOUSE RULES */}
        {activeTab === 'warehouse' && (
          <div className="card-glass p-5 rounded-xl space-y-4 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <PackageCheck className="w-4 h-4 text-emerald-500" />
              <span>Складські правила та метод списання</span>
            </h3>

            <div className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">Метод бухгалтерського оцінювання списання запасу:</label>
                <div className="flex space-x-4">
                  {[
                    { id: 'FIFO', label: 'FIFO (First In, First Out — першим прийшов, першим списаний)', recommended: true },
                    { id: 'AVERAGE', label: 'Середньозважена ціна', recommended: false },
                  ].map(m => (
                    <label key={m.id} className="flex items-start space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="wh_method"
                        checked={warehouseRules.method === m.id}
                        onChange={() => setWarehouseRules({ ...warehouseRules, method: m.id })}
                        className="mt-0.5 text-blue-600"
                      />
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">{m.label}</span>
                        {m.recommended && <span className="text-[10px] text-emerald-600 font-semibold">Рекомендовано для ЗДО КМУ</span>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block">Попереджати про термін придатності за (днів):</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={warehouseRules.expiryDaysAlert}
                    onChange={(e) => setWarehouseRules({ ...warehouseRules, expiryDaysAlert: Number(e.target.value) })}
                    className="w-32 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold text-blue-600"
                  />
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block">Авто-сповіщення про мінімальний залишок:</label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={warehouseRules.minStockAlert}
                      onChange={(e) => setWarehouseRules({ ...warehouseRules, minStockAlert: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Підсвічувати продукти з критичним залишком (&lt; 2 кг)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DATABASE & BACKUPS */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            <div className="card-glass p-5 rounded-xl space-y-4 shadow-sm">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <HardDrive className="w-4 h-4 text-blue-500" />
                <span>Резервне копіювання та відновлення бази даних</span>
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Ви можете зберегти повну резервну копію бази даних (з усіма створеними меню, приходами продуктів, накладними та профілями садків) у файл <strong>.sqlite</strong> на комп'ютер чи флешку, а також відновити її на іншому пристрої у 1 клік.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {/* Export SQLite File */}
                <button
                  onClick={exportSqliteFile}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-md cursor-pointer text-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>📥 Завантажити резервну копію (Файл .sqlite)</span>
                </button>

                {/* Import SQLite File */}
                <label className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-md cursor-pointer text-xs">
                  <Upload className="w-4 h-4" />
                  <span>📤 Відновити з файлу резервної копії (.sqlite)</span>
                  <input
                    type="file"
                    accept=".sqlite,.db"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (confirm(`Відновити базу даних з файлу "${file.name}"? Поточні дані будуть замінені!`)) {
                          importSqliteFile(file)
                            .then(() => alert('Базу даних успішно відновлено!'))
                            .catch(err => alert(`Помилка відновлення файлу: ${err.message}`));
                        }
                      }
                    }}
                  />
                </label>

                {/* Export JSON Backup */}
                <button
                  onClick={handleExportBackup}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition cursor-pointer text-xs"
                >
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>Експорт налаштувань (JSON)</span>
                </button>
              </div>
            </div>

            {/* Danger Zone — Reset Database */}
            <div className="card-glass p-5 rounded-xl border border-rose-200 dark:border-rose-900 space-y-4 shadow-sm">
              <h3 className="font-bold text-rose-700 dark:text-rose-400 text-sm flex items-center space-x-2 border-b border-rose-200 dark:border-rose-900 pb-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Небезпечна зона — Скидання бази даних</span>
              </h3>

              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Ця дія <strong className="text-rose-600">незворотно видалить</strong> усі створені меню-розкладки, приходні накладні та списання продуктів.
                Картотека страв та складські продукти будуть скинуті до базових стандартних значень.
              </p>

              {!showResetConfirm ? (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Скинути всі дані БД</span>
                </button>
              ) : (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-lg space-y-3">
                  <p className="text-rose-700 dark:text-rose-300 font-bold">
                    ⚠️ Ви впевнені? Усі дані будуть очищені!
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleResetDatabase}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold transition"
                    >
                      Так, скинути все
                    </button>
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-bold transition"
                    >
                      Скасувати
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'system' && <SystemAdministrationPanel />}

      </div>

      {/* DELETE PROFILE CONFIRMATION MODAL */}
      {deleteProfileModal.open && deleteProfileModal.inst && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/60 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  Видалення профілю закладу
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                  {deleteProfileModal.inst.NAME}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Ви дійсно бажаєте видалити профіль закладу <strong className="text-slate-800 dark:text-slate-100">«{deleteProfileModal.inst.NAME}»</strong> з системи?
            </p>

            {Boolean(deleteProfileModal.inst.IS_SEPARATE_WAREHOUSE) && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl text-xs text-amber-800 dark:text-amber-200 space-y-1">
                <span className="font-bold block flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>УВАГА: Окремий склад продуктів!</span>
                </span>
                <p className="text-[11px]">
                  У цього садка було ввімкнено режим <strong>Окремого продуктового складу</strong>. При видаленні профілю буде також очищено його індивідуальні приходні накладні та партії товарів!
                </p>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setDeleteProfileModal({ open: false, inst: null })}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Скасувати
              </button>

              <button
                onClick={handleDeleteProfileConfirm}
                className="flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition shadow-md cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Так, видалити профіль</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
