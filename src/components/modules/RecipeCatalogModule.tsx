import { SearchableSelect } from "../common/SearchableSelect";
import React, { useState, useEffect } from 'react';
import { Dish, DishCategory, RecipeComponent, RecipeNutritionProfile, EaterCategory, Product, DishCostProfile, DishCostHistoryEntry } from '../../types';
import { getDishes, getDishCategories, getRecipeComponents, getDishNutritionProfiles, getEaterCategories, getProducts, addDish, updateDish, deleteDish, addRecipeComponent, updateRecipeComponent, deleteRecipeComponent, upsertDishNutritionProfile, getDishCostProfiles, getDishCostHistory } from '../../services/db';
import { QuickToolbar } from '../QuickToolbar';
import { exportToExcel, exportToPDF } from '../../services/export';
import { Utensils, Plus, Trash2, Edit, Layers, Coins, TrendingUp, AlertTriangle } from 'lucide-react';

export const RecipeCatalogModule: React.FC = () => {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<DishCategory[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number>(0);
  const [selectedDishId, setSelectedDishId] = useState<number | null>(null);
  const [components, setComponents] = useState<RecipeComponent[]>([]);
  const [nutritionProfiles, setNutritionProfiles] = useState<RecipeNutritionProfile[]>([]);
  const [eaterCategories, setEaterCategories] = useState<EaterCategory[]>([]);
  const [selectedEaterCategoryId, setSelectedEaterCategoryId] = useState<number>(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [costProfiles, setCostProfiles] = useState<DishCostProfile[]>([]);
  const [costHistory, setCostHistory] = useState<DishCostHistoryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [isDishModalOpen, setIsDishModalOpen] = useState<boolean>(false);
  const [editingDish, setEditingDish] = useState<Partial<Dish>>({});
  const [editingNutritionProfiles, setEditingNutritionProfiles] = useState<RecipeNutritionProfile[]>([]);
  const [isCompModalOpen, setIsCompModalOpen] = useState<boolean>(false);
  const [editingComponent, setEditingComponent] = useState<Partial<RecipeComponent>>({});

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    if (selectedDishId) {
      setComponents(getRecipeComponents(selectedDishId, selectedEaterCategoryId));
      setNutritionProfiles(getDishNutritionProfiles(selectedDishId));
      setCostProfiles(getDishCostProfiles(selectedDishId));
      setCostHistory(getDishCostHistory(selectedDishId));
    } else {
      setComponents([]);
      setNutritionProfiles([]);
      setCostProfiles([]);
      setCostHistory([]);
    }
  }, [selectedDishId, selectedEaterCategoryId]);

  const loadData = () => {
    const dList = getDishes();
    setDishes(dList);
    setCategories(getDishCategories());
    setEaterCategories(getEaterCategories());
    setProducts(getProducts());
    if (dList.length > 0 && !selectedDishId) setSelectedDishId(dList[0].ID);
  };

  const filteredDishes = dishes.filter(d => {
    const matchesCat = selectedCatId === 0 || d.ID_GRUPPI_BLUD === selectedCatId;
    const matchesSearch = d.NAME.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const selectedDish = dishes.find(d => d.ID === selectedDishId);
  const selectedNutrition = nutritionProfiles.find(
    profile => profile.ID_KATEGORII_DETEJ === selectedEaterCategoryId
  );
  const selectedCost = costProfiles.find(profile => profile.categoryId === selectedEaterCategoryId);
  const costLimits = (() => {
    try {
      return JSON.parse(localStorage.getItem('medsestra_cost_limits') || '{}') as Record<string, number>;
    } catch {
      return {};
    }
  })();
  const costLimitKeyByCategory: Record<number, string> = { 1: 'yasla', 2: 'junior', 3: 'sad', 4: 'staff' };
  const selectedCostLimit = Number(costLimits[costLimitKeyByCategory[selectedEaterCategoryId]] || 0);
  const exceedsCostLimit = Boolean(
    selectedCost && selectedCostLimit > 0 && selectedCost.costPerPortion > selectedCostLimit
  );

  const openDishEditor = (dish?: Dish) => {
    const draft: Partial<Dish> = dish || {
      ID_GRUPPI_BLUD: selectedCatId || 1,
      VYXOD: 200,
      BELKI: 0,
      ZIRI: 0,
      UGLEVODI: 0,
      KALORII: 0,
      PORRDOK_SLEDOVANIR_BLUD: dishes.length + 1,
      NOTES: '',
      SOURCE_FILE: '',
      SOURCE_FORMAT: '',
      SOURCE_REF: '',
      ALLERGENS: '',
      QUALITY_REQUIREMENTS: '',
      STORAGE_CONDITIONS: '',
      SERVING_METHOD: '',
      DISH_CHARACTERISTICS: '',
    };
    const existingProfiles = dish ? getDishNutritionProfiles(dish.ID) : [];
    setEditingDish(draft);
    setEditingNutritionProfiles(eaterCategories.map(category => {
      const existing = existingProfiles.find(profile => profile.ID_KATEGORII_DETEJ === category.ID);
      return existing || {
        ID: 0,
        ID_BLUDA: dish?.ID || 0,
        ID_KATEGORII_DETEJ: category.ID,
        VYXOD_GR: draft.VYXOD || 0,
        BELKI: draft.BELKI || 0,
        ZIRI: draft.ZIRI || 0,
        UGLEVODI: draft.UGLEVODI || 0,
        KALORII: draft.KALORII || 0,
        categoryName: category.NAME,
      };
    }));
    setIsDishModalOpen(true);
  };

  const handleSaveDish = () => {
    if (!editingDish.NAME) return;
    const dishId = editingDish.ID
      ? (updateDish(editingDish as Dish), editingDish.ID)
      : addDish(editingDish);
    editingNutritionProfiles.forEach(profile => upsertDishNutritionProfile({
      ...profile,
      ID_BLUDA: dishId,
    }));
    loadData();
    setSelectedDishId(dishId);
    setIsDishModalOpen(false);
  };

  const handleDeleteDish = (id: number) => {
    if (confirm('Ви впевнені, що хочете видалити цю страву з картотеки?')) {
      deleteDish(id);
      setSelectedDishId(null);
      loadData();
    }
  };

  const openComponentEditor = (component?: RecipeComponent) => {
    setEditingComponent(component || {
      ID_BLUDA: selectedDishId || 0,
      ID_PRODUKTA: products[0]?.ID || 1,
      ID_KATEGORII_DETEJ: selectedEaterCategoryId,
      GROSSO_GR: 20,
      NETTO_GR: 16,
      NOMER_ID_LINII_V_TABLICE: components.length + 1,
      SOURCE_NAME: '',
      ALLERGENS: '',
      QUALITY_REQUIREMENTS: '',
      IS_ALTERNATIVE: 0,
    });
    setIsCompModalOpen(true);
  };

  const handleSaveComp = () => {
    if (!selectedDishId) return;
    const component = {
      ...editingComponent,
      ID_BLUDA: selectedDishId,
      ID_PRODUKTA: Number(editingComponent.ID_PRODUKTA),
      ID_KATEGORII_DETEJ: Number(editingComponent.ID_KATEGORII_DETEJ || selectedEaterCategoryId),
      GROSSO_GR: Number(editingComponent.GROSSO_GR || 0),
      NETTO_GR: Number(editingComponent.NETTO_GR || 0),
    };
    if (component.ID) updateRecipeComponent(component as RecipeComponent);
    else addRecipeComponent(component);
    setComponents(getRecipeComponents(selectedDishId, selectedEaterCategoryId));
    setIsCompModalOpen(false);
  };

  const handleDeleteComp = (id: number) => {
    deleteRecipeComponent(id);
    if (selectedDishId) setComponents(getRecipeComponents(selectedDishId, selectedEaterCategoryId));
  };

  const handleExportExcel = () => {
    const headers = ['Код', 'Найменування страви', 'Категорія', 'Вихід (г)', 'Білки', 'Жири', 'Вуглеводи', 'Калорії'];
    const rows = filteredDishes.map(d => [d.ID, d.NAME, categories.find(c => c.ID === d.ID_GRUPPI_BLUD)?.NAME || '', d.VYXOD, d.BELKI, d.ZIRI, d.UGLEVODI, d.KALORII]);
    exportToExcel('Картотека_страв', 'Рецептура', headers, rows);
  };

  const handleExportPDF = () => {
    const headers = ['Код', 'Найменування страви', 'Вихід (г)', 'Білки', 'Жири', 'Вуглеводи', 'Калорії'];
    const rows = filteredDishes.map(d => [d.ID, d.NAME, d.VYXOD, d.BELKI, d.ZIRI, d.UGLEVODI, d.KALORII]);
    exportToPDF('Картотека страв та рецептур', headers, rows);
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-950">
      <QuickToolbar
        onAdd={() => openDishEditor()}
        onRefresh={loadData}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        title="Технологічні карти страв та рецептура"
      />

      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden p-3 gap-3">
        {/* Left Sidebar: Categories */}
        <div className="w-full lg:w-64 card-glass flex flex-col shrink-0 max-lg:max-h-48 overflow-y-auto">
          <div className="p-2.5 bg-slate-200/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-xs text-slate-700 dark:text-slate-200 flex items-center space-x-1.5 sticky top-0 bg-white dark:bg-slate-900 z-10">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>Категорії страв</span>
          </div>
          <div className="flex-1 overflow-auto p-1.5 space-y-0.5">
            <button
              onClick={() => setSelectedCatId(0)}
              className={`w-full text-left px-3 py-1.5 rounded text-xs font-medium transition flex items-center justify-between ${
                selectedCatId === 0 ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span>Всі категорії</span>
              <span className="text-[10px] opacity-70">({dishes.length})</span>
            </button>
            {categories.map(cat => {
              const count = dishes.filter(d => d.ID_GRUPPI_BLUD === cat.ID).length;
              return (
                <button key={cat.ID} onClick={() => setSelectedCatId(cat.ID)}
                  className={`w-full text-left px-3 py-1.5 rounded text-xs transition flex items-center justify-between ${
                    selectedCatId === cat.ID ? 'bg-blue-600 text-white font-medium' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="truncate">{cat.NAME}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Dishes Grid */}
        <div className="flex-1 w-full min-w-0 card-glass flex flex-col overflow-hidden min-h-[300px]">
          <div className="p-2.5 bg-slate-200/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-xs text-slate-700 dark:text-slate-200">
            Список страв ({filteredDishes.length})
          </div>
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <table className="table-grid min-w-[500px]">
              <thead>
                <tr>
                  <th className="w-12">Код</th>
                  <th>Найменування страви</th>
                  <th>Вихід</th>
                  <th>Білки</th>
                  <th>Жири</th>
                  <th>Вугл.</th>
                  <th>Ккал</th>
                  <th className="w-16 text-center">Дії</th>
                </tr>
              </thead>
              <tbody>
                {filteredDishes.map(d => (
                  <tr key={d.ID} onClick={() => setSelectedDishId(d.ID)} className={`cursor-pointer ${selectedDishId === d.ID ? 'selected' : ''}`}>
                    <td>{d.ID}</td>
                    <td className="font-semibold">{d.NAME}</td>
                    <td>{d.VYXOD} г</td>
                    <td>{d.BELKI}</td>
                    <td>{d.ZIRI}</td>
                    <td>{d.UGLEVODI}</td>
                    <td className="font-semibold text-amber-600 dark:text-amber-400">{d.KALORII}</td>
                    <td className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button onClick={(e) => { e.stopPropagation(); openDishEditor(d); }} className="p-1 text-slate-500 hover:text-blue-600" title="Редагувати всю технологічну карту">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteDish(d.ID); }} className="p-1 text-slate-500 hover:text-rose-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Full technological card */}
        <div className="w-full lg:w-[34rem] card-glass flex flex-col shrink-0 min-h-[250px] overflow-hidden">
          <div className="p-2.5 bg-slate-200/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
              {selectedDish ? `Склад: ${selectedDish.NAME}` : 'Оберіть страву'}
            </span>
            {selectedDish && (
              <div className="flex items-center gap-1">
                <button onClick={() => openDishEditor(selectedDish)} className="flex items-center gap-1 rounded bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100">
                  <Edit className="h-3 w-3" /> Картка
                </button>
                <button onClick={() => openComponentEditor()} className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-medium flex items-center space-x-1">
                  <Plus className="w-3 h-3" />
                  <span>Інгредієнт</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto p-2">
            {selectedDish ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {eaterCategories.map(category => (
                    <button
                      key={category.ID}
                      onClick={() => setSelectedEaterCategoryId(category.ID)}
                      className={`rounded px-2 py-1 text-[10px] font-medium transition ${
                        selectedEaterCategoryId === category.ID
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {category.NAME}
                    </button>
                  ))}
                </div>

                {selectedNutrition ? (
                  <div className="grid grid-cols-5 gap-1 text-center">
                    {[
                      ['Вихід', `${selectedNutrition.VYXOD_GR} г`],
                      ['Білки', `${selectedNutrition.BELKI} г`],
                      ['Жири', `${selectedNutrition.ZIRI} г`],
                      ['Вугл.', `${selectedNutrition.UGLEVODI} г`],
                      ['Ккал', selectedNutrition.KALORII],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
                        <div className="text-[9px] uppercase tracking-wide text-slate-400">{label}</div>
                        <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100">{value}</div>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className={`rounded border p-2 ${
                  exceedsCostLimit
                    ? 'border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30'
                    : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Coins className={`h-4 w-4 ${exceedsCostLimit ? 'text-rose-600' : 'text-emerald-600'}`} />
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Собівартість однієї порції
                        </div>
                        <div className={`text-base font-black ${exceedsCostLimit ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                          {(selectedCost?.costPerPortion || 0).toFixed(2)} грн
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-slate-500">
                      <div>Вихід: {selectedCost?.yieldGr || selectedNutrition?.VYXOD_GR || selectedDish.VYXOD} г</div>
                      {selectedCostLimit > 0 ? <div>Денний ліміт: {selectedCostLimit.toFixed(2)} грн</div> : null}
                    </div>
                  </div>
                  {exceedsCostLimit ? (
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Вартість порції перевищує встановлений ліміт категорії
                    </div>
                  ) : null}
                  <details className="mt-2 border-t border-current/10 pt-1.5">
                    <summary className="flex cursor-pointer items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                      <TrendingUp className="h-3.5 w-3.5" /> Історія зміни собівартості
                    </summary>
                    <div className="mt-1 max-h-28 overflow-auto">
                      <table className="w-full text-[9px]">
                        <thead><tr><th className="text-left">Дата</th><th className="text-left">Причина</th><th className="text-right">Вартість</th></tr></thead>
                        <tbody>
                          {costHistory
                            .filter(item => item.ID_KATEGORII_DETEJ === selectedEaterCategoryId)
                            .map(item => (
                              <tr key={item.ID} className="border-t border-slate-200/70 dark:border-slate-800">
                                <td>{new Date(item.CALCULATED_AT).toLocaleDateString('uk-UA')}</td>
                                <td>{item.REASON}{item.SOURCE_REF ? ` · ${item.SOURCE_REF}` : ''}</td>
                                <td className="text-right font-bold">{Number(item.COST_PER_PORTION).toFixed(2)} грн</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>

                <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-0.5">Технологія приготування:</span>
                  {selectedDish.NOTES || 'Інструкція з приготування не вказана.'}
                </div>
                {selectedDish.ALLERGENS ? (
                  <div className="rounded border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                    <span className="font-semibold">Алергени: </span>{selectedDish.ALLERGENS}
                  </div>
                ) : null}
                <table className="table-grid">
                  <thead>
                    <tr>
                      <th>Інгредієнт</th>
                      <th>Брутто (г)</th>
                      <th>Нетто (г)</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {components.map(c => (
                      <tr key={c.ID} className={c.IS_ALTERNATIVE ? 'opacity-65' : ''}>
                        <td className="font-medium text-slate-800 dark:text-slate-200">
                          {c.SOURCE_NAME || c.productName}
                          {c.IS_ALTERNATIVE ? <span className="ml-1 text-[9px] text-amber-600">(альтернатива)</span> : null}
                          {c.ALLERGENS ? <span className="block text-[9px] text-rose-500">Алергени: {c.ALLERGENS}</span> : null}
                        </td>
                        <td className="font-bold text-blue-600 dark:text-blue-400">{c.GROSSO_GR} г</td>
                        <td className="text-slate-600 dark:text-slate-400">{c.NETTO_GR} г</td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openComponentEditor(c)} className="text-blue-500 hover:text-blue-700" title="Редагувати інгредієнт">
                              <Edit className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleDeleteComp(c.ID)} className="text-rose-500 hover:text-rose-700" title="Видалити інгредієнт">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {[
                  ['Умови зберігання', selectedDish.STORAGE_CONDITIONS],
                  ['Спосіб подачі', selectedDish.SERVING_METHOD],
                  ['Характеристика готової страви', selectedDish.DISH_CHARACTERISTICS],
                  ['Вимоги до якості сировини', selectedDish.QUALITY_REQUIREMENTS],
                  ['Нормативне джерело', selectedDish.SOURCE_REF],
                ].filter(([, value]) => value).map(([label, value]) => (
                  <details key={String(label)} className="rounded border border-slate-200 bg-slate-50 p-2 text-[11px] dark:border-slate-800 dark:bg-slate-950">
                    <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">{label}</summary>
                    <div className="mt-1 whitespace-pre-line text-slate-600 dark:text-slate-400">{value}</div>
                  </details>
                ))}
                {selectedDish.SOURCE_FILE ? (
                  <div className="text-[9px] text-slate-400">
                    Джерело: {selectedDish.SOURCE_FILE} · {selectedDish.SOURCE_FORMAT}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 italic text-xs">
                Оберіть страву зі списку зліва для перегляду рецептури.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dish Add/Edit Modal */}
      {isDishModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="p-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {editingDish.ID ? 'Редагування страви' : 'Створення нової страви'}
              </h3>
              <button onClick={() => setIsDishModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <h4 className="font-bold text-slate-800 dark:text-slate-100">Основні дані</h4>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Найменування страви</label>
                <input type="text" value={editingDish.NAME || ''} onChange={(e) => setEditingDish({ ...editingDish, NAME: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-medium" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Категорія</label>
                  <SearchableSelect value={editingDish.ID_GRUPPI_BLUD || 1} onChange={(e) => setEditingDish({ ...editingDish, ID_GRUPPI_BLUD: Number(e.target.value) })} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs">
                    {categories.map(c => <option key={c.ID} value={c.ID}>{c.NAME}</option>)}
                  </SearchableSelect>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Вихід страви (грам)</label>
                  <input type="number" min="0" step="0.01" value={editingDish.VYXOD ?? 200} onChange={(e) => setEditingDish({ ...editingDish, VYXOD: Number(e.target.value) })} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-medium" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div><label className="block text-[10px] text-slate-500">Білки (г)</label><input type="number" min="0" step="0.01" value={editingDish.BELKI ?? 0} onChange={(e) => setEditingDish({ ...editingDish, BELKI: Number(e.target.value) })} className="w-full p-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs" /></div>
                <div><label className="block text-[10px] text-slate-500">Жири (г)</label><input type="number" min="0" step="0.01" value={editingDish.ZIRI ?? 0} onChange={(e) => setEditingDish({ ...editingDish, ZIRI: Number(e.target.value) })} className="w-full p-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs" /></div>
                <div><label className="block text-[10px] text-slate-500">Вуглеводи (г)</label><input type="number" min="0" step="0.01" value={editingDish.UGLEVODI ?? 0} onChange={(e) => setEditingDish({ ...editingDish, UGLEVODI: Number(e.target.value) })} className="w-full p-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs" /></div>
                <div><label className="block text-[10px] text-slate-500">Калорії (ккал)</label><input type="number" min="0" step="0.01" value={editingDish.KALORII ?? 0} onChange={(e) => setEditingDish({ ...editingDish, KALORII: Number(e.target.value) })} className="w-full p-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold text-amber-600" /></div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Технологія приготування</label>
                <textarea rows={3} value={editingDish.NOTES || ''} onChange={(e) => setEditingDish({ ...editingDish, NOTES: e.target.value })} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs" />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Алергени</label><textarea rows={2} value={editingDish.ALLERGENS || ''} onChange={e => setEditingDish({ ...editingDish, ALLERGENS: e.target.value })} className="w-full rounded border border-slate-300 bg-slate-50 p-2 text-xs dark:border-slate-700 dark:bg-slate-950" /></div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Характеристика готової страви</label><textarea rows={2} value={editingDish.DISH_CHARACTERISTICS || ''} onChange={e => setEditingDish({ ...editingDish, DISH_CHARACTERISTICS: e.target.value })} className="w-full rounded border border-slate-300 bg-slate-50 p-2 text-xs dark:border-slate-700 dark:bg-slate-950" /></div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Вимоги до якості сировини</label><textarea rows={3} value={editingDish.QUALITY_REQUIREMENTS || ''} onChange={e => setEditingDish({ ...editingDish, QUALITY_REQUIREMENTS: e.target.value })} className="w-full rounded border border-slate-300 bg-slate-50 p-2 text-xs dark:border-slate-700 dark:bg-slate-950" /></div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Умови зберігання</label><textarea rows={3} value={editingDish.STORAGE_CONDITIONS || ''} onChange={e => setEditingDish({ ...editingDish, STORAGE_CONDITIONS: e.target.value })} className="w-full rounded border border-slate-300 bg-slate-50 p-2 text-xs dark:border-slate-700 dark:bg-slate-950" /></div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Спосіб подачі</label><textarea rows={3} value={editingDish.SERVING_METHOD || ''} onChange={e => setEditingDish({ ...editingDish, SERVING_METHOD: e.target.value })} className="w-full rounded border border-slate-300 bg-slate-50 p-2 text-xs dark:border-slate-700 dark:bg-slate-950" /></div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Нормативне джерело</label><textarea rows={3} value={editingDish.SOURCE_REF || ''} onChange={e => setEditingDish({ ...editingDish, SOURCE_REF: e.target.value })} className="w-full rounded border border-slate-300 bg-slate-50 p-2 text-xs dark:border-slate-700 dark:bg-slate-950" /></div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Файл-джерело</label><input value={editingDish.SOURCE_FILE || ''} onChange={e => setEditingDish({ ...editingDish, SOURCE_FILE: e.target.value })} className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950" /></div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Формат джерела</label><input value={editingDish.SOURCE_FORMAT || ''} onChange={e => setEditingDish({ ...editingDish, SOURCE_FORMAT: e.target.value })} className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950" /></div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Порядок у довіднику</label><input type="number" min="0" value={editingDish.PORRDOK_SLEDOVANIR_BLUD ?? 0} onChange={e => setEditingDish({ ...editingDish, PORRDOK_SLEDOVANIR_BLUD: Number(e.target.value) })} className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950" /></div>
              </div>
              </section>

              <section className="space-y-3 rounded-xl border border-blue-200 p-4 dark:border-blue-900">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100">Вихід і харчова цінність за віковими категоріями</h4>
                  <p className="text-[10px] text-slate-500">Кожен профіль зберігається окремо та записується до журналу змін.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-xs">
                    <thead className="bg-slate-100 text-slate-600 dark:bg-slate-950 dark:text-slate-300"><tr><th className="p-2 text-left">Категорія</th><th>Вихід, г</th><th>Білки</th><th>Жири</th><th>Вуглеводи</th><th>Ккал</th></tr></thead>
                    <tbody>
                      {editingNutritionProfiles.map((profile, profileIndex) => (
                        <tr key={profile.ID_KATEGORII_DETEJ} className="border-t border-slate-200 dark:border-slate-800">
                          <td className="p-2 font-semibold">{profile.categoryName || eaterCategories.find(category => category.ID === profile.ID_KATEGORII_DETEJ)?.NAME}</td>
                          {(['VYXOD_GR', 'BELKI', 'ZIRI', 'UGLEVODI', 'KALORII'] as const).map(field => (
                            <td key={field} className="p-1">
                              <input type="number" min="0" step="0.01" value={profile[field] ?? 0} onChange={event => setEditingNutritionProfiles(current => current.map((item, index) => index === profileIndex ? { ...item, [field]: Number(event.target.value) } : item))} className="w-full min-w-24 rounded border border-slate-300 bg-white px-2 py-1.5 text-right dark:border-slate-700 dark:bg-slate-950" />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
              <button onClick={() => setIsDishModalOpen(false)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs">Скасувати</button>
              <button onClick={handleSaveDish} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold">Зберегти</button>
            </div>
          </div>
        </div>
      )}

      {/* Ingredient Add/Edit Modal */}
      {isCompModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="p-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {editingComponent.ID ? 'Редагувати інгредієнт' : 'Додати інгредієнт'}
              </h3>
              <button onClick={() => setIsCompModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Продукт</label>
                <SearchableSelect value={editingComponent.ID_PRODUKTA || products[0]?.ID || 1} onChange={(e) => setEditingComponent({ ...editingComponent, ID_PRODUKTA: Number(e.target.value) })} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs">
                  {products.map(p => <option key={p.ID} value={p.ID}>{p.NAME} ({p.EDINICA_IZMERENIA})</option>)}
                </SearchableSelect>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Вікова категорія</label>
                <SearchableSelect value={editingComponent.ID_KATEGORII_DETEJ || selectedEaterCategoryId} onChange={(e) => setEditingComponent({ ...editingComponent, ID_KATEGORII_DETEJ: Number(e.target.value) })} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs">
                  {eaterCategories.map(category => <option key={category.ID} value={category.ID}>{category.NAME}</option>)}
                </SearchableSelect>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Брутто (г)</label>
                  <input type="number" min="0" step="0.01" value={editingComponent.GROSSO_GR ?? 0} onChange={(e) => setEditingComponent({ ...editingComponent, GROSSO_GR: Number(e.target.value) })} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-semibold text-blue-600" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Нетто (г)</label>
                  <input type="number" min="0" step="0.01" value={editingComponent.NETTO_GR ?? 0} onChange={(e) => setEditingComponent({ ...editingComponent, NETTO_GR: Number(e.target.value) })} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-semibold" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Назва у джерелі</label>
                  <input value={editingComponent.SOURCE_NAME || ''} onChange={e => setEditingComponent({ ...editingComponent, SOURCE_NAME: e.target.value })} className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Порядок у рецептурі</label>
                  <input type="number" min="0" value={editingComponent.NOMER_ID_LINII_V_TABLICE ?? 0} onChange={e => setEditingComponent({ ...editingComponent, NOMER_ID_LINII_V_TABLICE: Number(e.target.value) })} className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Алергени</label>
                <textarea rows={2} value={editingComponent.ALLERGENS || ''} onChange={e => setEditingComponent({ ...editingComponent, ALLERGENS: e.target.value })} className="w-full rounded border border-slate-300 bg-slate-50 p-2 text-xs dark:border-slate-700 dark:bg-slate-950" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Вимоги до якості</label>
                <textarea rows={3} value={editingComponent.QUALITY_REQUIREMENTS || ''} onChange={e => setEditingComponent({ ...editingComponent, QUALITY_REQUIREMENTS: e.target.value })} className="w-full rounded border border-slate-300 bg-slate-50 p-2 text-xs dark:border-slate-700 dark:bg-slate-950" />
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded border border-slate-200 p-2 text-xs dark:border-slate-800">
                <input type="checkbox" checked={Boolean(editingComponent.IS_ALTERNATIVE)} onChange={e => setEditingComponent({ ...editingComponent, IS_ALTERNATIVE: e.target.checked ? 1 : 0 })} />
                Альтернативний інгредієнт
              </label>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
              <button onClick={() => setIsCompModalOpen(false)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs">Скасувати</button>
              <button onClick={handleSaveComp} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold">
                {editingComponent.ID ? 'Зберегти' : 'Додати'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
