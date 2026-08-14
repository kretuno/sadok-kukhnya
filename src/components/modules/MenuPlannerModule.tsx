import { SearchableSelect } from "../common/SearchableSelect";
import React, { useState, useEffect } from 'react';
import { MenuHeader, Dish, EaterCategory, Product, RecipeComponent, Institution, MenuApproval } from '../../types';
import { getMenuEntries, addMenuEntry, deleteMenuEntry, getDishes, getEaterCategories, getProducts, getRecipeComponents, getDishNutritionProfiles, getInstitutions, updateDish, deductStockFIFO, getMenuEntriesRange, copyMenuPeriod, replaceMenuDish, getStockBatches, approveMenu, getMenuApproval, getDishCostProfiles } from '../../services/db';
import { QuickToolbar } from '../QuickToolbar';
import { exportToExcel, exportToPDF } from '../../services/export';
import { ProductHistoryModal } from '../modals/ProductHistoryModal';
import { Trash2, Calendar as CalendarIcon, Users, Calculator, Scale, PackageMinus, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, Copy, CalendarDays, Printer, WandSparkles, ShieldCheck, Repeat2, X } from 'lucide-react';
import { DEFAULT_EATER_COUNTS, getDefaultDishYield } from '../../domain/nutritionCategories';
import {
  PlanningPeriod,
  MenuValidationIssue,
  addCalendarDays,
  buildMenuValidationIssues,
  chooseDishReplacement,
  getPeriodDates,
  getPeriodLength,
  isDishAvailable,
  matchesNutritionNorm,
} from '../../domain/menuPlanning';
import { getShowMenuMacros, UI_PREFERENCES_EVENT } from '../../services/uiPreferences';
import { parseNonNegativeDecimalDraft } from '../../domain/decimalInput';

const MEAL_TYPES = ['Сніданок', '2-й сніданок', 'Обід', 'Полуденок', 'Вечеря'];

// Translate Eater category names to Ukrainian
const translateCatName = (name: string) => {
  if (name.includes('Співробіт') || name.includes('Сотрудники') || name.includes('Персонал')) return 'Співробітники';
  if (name.includes('Молодша') || /3\s*[-–]\s*4/.test(name)) return 'Молодша група (3–4 роки)';
  if (name.includes('Ясла') || name.includes('Ясли')) return 'Ясла (1–3 роки)';
  if (name.includes('Садок') || name.includes('Сад')) return 'Садок (4–7 років)';
  return name;
};

const formatQty = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '0';
  return Number(Math.round(num * 10000) / 10000).toString();
};

interface ProductRequirementItem {
  name: string;
  unit: string;
  totalGrams: number;
  price: number;
  gramsPerCat: { [catId: number]: number };
  costPerCat: { [catId: number]: number };
}

export const MenuPlannerModule: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [menuItems, setMenuItems] = useState<MenuHeader[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<EaterCategory[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<number>(1);
  const [selectedMealType, setSelectedMealType] = useState<string>('Всі');
  const [products, setProducts] = useState<Product[]>([]);
  const [showCategoryCost, setShowCategoryCost] = useState<boolean>(false);
  const [showMenuMacros, setShowMenuMacros] = useState(getShowMenuMacros);
  const [isConstructorOpen, setIsConstructorOpen] = useState(false);
  const [planningPeriod, setPlanningPeriod] = useState<PlanningPeriod>('week');
  const [approval, setApproval] = useState<MenuApproval | null>(null);
  const [constructorMessage, setConstructorMessage] = useState('');
  const [selectedHistoryProductId, setSelectedHistoryProductId] = useState<number | null>(null);
  const [deductedDates, setDeductedDates] = useState<string[]>(() => {
    const saved = localStorage.getItem('medsestra_deducted_dates');
    return saved ? JSON.parse(saved) : [];
  });

  // Per-category dish yields: dishCatYields[dishId][catId] = portion weight in grams
  const [dishCatYields, setDishCatYields] = useState<{ [dishId: number]: { [catId: number]: number } }>({});
  const [dishCatYieldInputs, setDishCatYieldInputs] = useState<{ [dishId: number]: { [catId: number]: string } }>({});

  const [counts, setCounts] = useState<{ [catId: number]: number }>(DEFAULT_EATER_COUNTS);

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newDishId, setNewDishId] = useState<number>(1);
  const [newMealType, setNewMealType] = useState<string>('Обід');

  useEffect(() => { loadData(); }, [selectedDate, selectedInstitution]);
  useEffect(() => {
    const refreshPreference = () => setShowMenuMacros(getShowMenuMacros());
    window.addEventListener(UI_PREFERENCES_EVENT, refreshPreference);
    return () => window.removeEventListener(UI_PREFERENCES_EVENT, refreshPreference);
  }, []);

  const loadData = () => {
    setMenuItems(getMenuEntries(selectedDate));
    setDishes(getDishes());
    setCategories(getEaterCategories());
    setInstitutions(getInstitutions());
    setProducts(getProducts());
    setApproval(getMenuApproval(selectedDate, selectedInstitution));
  };

  const handleAddDish = () => {
    const dish = dishes.find(d => d.ID === Number(newDishId));
    if (dish) {
      try {
        addMenuEntry(selectedDate, dish.ID, dish.NAME, newMealType);
        loadData();
        setIsAddModalOpen(false);
      } catch (error) {
        alert(error instanceof Error ? error.message : String(error));
      }
    }
  };

  const handleDeleteItem = (id: number) => {
    try {
      deleteMenuEntry(id);
      loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    }
  };

  // Helper to get dish portion weight for a specific eater category
  const getDishYieldForCat = (dishId: number, catId: number): number => {
    if (dishCatYields[dishId]?.[catId] !== undefined) {
      return dishCatYields[dishId][catId];
    }
    const importedProfile = getDishNutritionProfiles(dishId)
      .find(profile => profile.ID_KATEGORII_DETEJ === catId);
    if (importedProfile?.VYXOD_GR) return importedProfile.VYXOD_GR;
    const dish = dishes.find(d => d.ID === dishId);
    const base = dish?.VYXOD || 200;
    return getDefaultDishYield(base, catId);
  };

  // Dish weight / yield update handler PER CATEGORY for tuning menu cost
  const handleCatYieldChange = (dishId: number, catId: number, rawValue: string) => {
    const parsed = parseNonNegativeDecimalDraft(rawValue);
    if (!parsed.accepted) return;
    setDishCatYieldInputs(prev => ({
      ...prev,
      [dishId]: { ...(prev[dishId] || {}), [catId]: rawValue },
    }));
    if (!parsed.complete || parsed.value === undefined) return;
    const newYield = parsed.value;
    setDishCatYields(prev => ({
      ...prev,
      [dishId]: {
        ...(prev[dishId] || {}),
        [catId]: newYield
      }
    }));
  };

  const handleCatYieldCommit = (dishId: number, catId: number) => {
    const rawValue = dishCatYieldInputs[dishId]?.[catId];
    if (rawValue === undefined || rawValue === '' || rawValue.endsWith('.') || rawValue.endsWith(',')) {
      setDishCatYieldInputs(prev => ({ ...prev, [dishId]: { ...(prev[dishId] || {}), [catId]: String(getDishYieldForCat(dishId, catId)) } }));
      return;
    }
    const newYield = Number(rawValue.replace(',', '.'));
    if (catId === 3 && Number.isFinite(newYield) && newYield >= 0) {
      const dish = dishes.find(d => d.ID === dishId);
      if (dish) updateDish({ ...dish, VYXOD: newYield });
    }
  };

  const filteredMenuItems = selectedMealType === 'Всі'
    ? menuItems
    : menuItems.filter(m => m.MEAL_TYPE === selectedMealType);

  // Calculate product requirements and costs PER EATER CATEGORY
  const productRequirements: { [prodId: number]: ProductRequirementItem } = {};

  menuItems.forEach(menu => {
    const dish = dishes.find(d => d.ID === menu.ID_BLUDA);
    const profiles = getDishNutritionProfiles(menu.ID_BLUDA);

    categories.forEach(cat => {
      const catCount = counts[cat.ID] || 0;
      if (catCount <= 0) return;
      const profileYield = profiles.find(profile => profile.ID_KATEGORII_DETEJ === cat.ID)?.VYXOD_GR
        || dish?.VYXOD
        || 200;
      const curYield = getDishYieldForCat(menu.ID_BLUDA, cat.ID);
      const yieldRatio = profileYield > 0 ? curYield / profileYield : 1;
      const recipeComps = getRecipeComponents(menu.ID_BLUDA, cat.ID, false);

      recipeComps.forEach(comp => {
        const pid = comp.ID_PRODUKTA;
        const prod = products.find(p => p.ID === pid);
        const price = prod?.CENA || 0;
        if (!productRequirements[pid]) {
          productRequirements[pid] = {
            name: comp.SOURCE_NAME || comp.productName || prod?.NAME || `Продукт №${pid}`,
            unit: comp.unit || prod?.EDINICA_IZMERENIA || 'кг',
            totalGrams: 0,
            price,
            gramsPerCat: {},
            costPerCat: {}
          };
        }
        const totalGramsForCat = comp.GROSSO_GR * catCount * yieldRatio;
        const costForCat = (totalGramsForCat / 1000) * price;

        productRequirements[pid].totalGrams += totalGramsForCat;
        productRequirements[pid].gramsPerCat[cat.ID] = (productRequirements[pid].gramsPerCat[cat.ID] || 0) + totalGramsForCat;
        productRequirements[pid].costPerCat[cat.ID] = (productRequirements[pid].costPerCat[cat.ID] || 0) + costForCat;
      });
    });
  });

  const totalCost = Object.values(productRequirements).reduce((sum, item) => sum + (item.totalGrams / 1000) * item.price, 0);

  // Total cost per eater category
  const totalCostPerCat: { [catId: number]: number } = {};
  categories.forEach(cat => {
    totalCostPerCat[cat.ID] = Object.values(productRequirements).reduce((sum, req) => sum + (req.costPerCat[cat.ID] || 0), 0);
  });

  const configuredCostLimits = (() => {
    try {
      return JSON.parse(localStorage.getItem('medsestra_cost_limits') || '{}') as Record<string, number>;
    } catch {
      return {};
    }
  })();
  const costLimitKeyByCategory: Record<number, string> = { 1: 'yasla', 2: 'junior', 3: 'sad', 4: 'staff' };
  const exceededCategories = categories.filter(category => {
    const count = counts[category.ID] || 0;
    const perPerson = count > 0 ? (totalCostPerCat[category.ID] || 0) / count : 0;
    const limit = Number(configuredCostLimits[costLimitKeyByCategory[category.ID]] || 0);
    return limit > 0 && perPerson > limit;
  });

  const handleDeductStock = () => {
    const reqList = Object.entries(productRequirements).map(([pid, req]) => ({
      productId: Number(pid),
      productName: req.name,
      totalGrams: req.totalGrams
    }));

    if (reqList.length === 0) {
      alert('Немає продуктів для списання. Додайте страви до меню!');
      return;
    }

    if (confirm(`Ви дійсно бажаєте провести списання продуктів зі складу за ${formatDate(selectedDate)} (метод FIFO)?`)) {
      let res;
      try {
        res = deductStockFIFO(reqList, selectedDate);
      } catch (error) {
        alert(error instanceof Error ? error.message : String(error));
        return;
      }
      if (res.success) {
        if (res.warnings.length > 0) {
          alert(`Списання проведено! Зауваження по нестачі на складі:\n\n` + res.warnings.join('\n'));
        } else {
          alert(`Списання продуктів за ${formatDate(selectedDate)} успішно проведено зі складських партій (FIFO)!`);
        }
        const updated = Array.from(new Set([...deductedDates, selectedDate]));
        setDeductedDates(updated);
        localStorage.setItem('medsestra_deducted_dates', JSON.stringify(updated));
        loadData();
      }
    }
  };

  const institution = institutions.find(i => i.ID === selectedInstitution);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Week navigation calculation helpers
  const getMonday = (dStr: string) => {
    const parts = dStr.split('-');
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const currentMonday = getMonday(selectedDate);

  const toIsoDate = (date: Date) => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
  const periodStart = planningPeriod === 'week'
    ? toIsoDate(currentMonday)
    : `${selectedDate.slice(0, 7)}-01`;
  const periodDates = getPeriodDates(planningPeriod, periodStart);
  const periodEnd = periodDates[periodDates.length - 1];
  const periodEntries = getMenuEntriesRange(periodStart, periodEnd);
  const stockByProduct = new Map<number, number>();
  getStockBatches().forEach(batch => {
    stockByProduct.set(batch.ID_PRODUKTA, (stockByProduct.get(batch.ID_PRODUKTA) || 0) + (batch.OST_KG || 0));
  });
  const activeCategoryIds = categories.filter(category => (counts[category.ID] || 0) > 0).map(category => category.ID);
  const dishIsAvailable = (dishId: number) => isDishAvailable(
    dishId,
    activeCategoryIds.length ? activeCategoryIds : [1],
    (id, categoryId) => getRecipeComponents(id, categoryId, false),
    stockByProduct,
  );
  const unavailableDishIds = new Set(
    periodEntries.filter(entry => !dishIsAvailable(entry.ID_BLUDA)).map(entry => entry.ID_BLUDA)
  );
  const periodDishIds = Array.from(new Set(periodEntries.map(entry => entry.ID_BLUDA)));
  const dishIdsWithCards = new Set(
    periodDishIds.filter(dishId =>
      activeCategoryIds.every(categoryId => getRecipeComponents(dishId, categoryId, false).length > 0)
    )
  );
  const costPerPersonByDate = new Map<string, number>();
  periodDates.forEach(date => {
    const dateEntries = periodEntries.filter(entry => entry.DATA === date);
    const averageCost = dateEntries.reduce((sum, entry) => {
      const profiles = getDishCostProfiles(entry.ID_BLUDA);
      return sum + (
        profiles.length
          ? profiles.reduce((value, profile) => value + profile.costPerPortion, 0) / profiles.length
          : 0
      );
    }, 0);
    costPerPersonByDate.set(date, averageCost);
  });
  const dailyLimits = Object.values(configuredCostLimits).map(Number).filter(value => value > 0);
  const baseValidationIssues = buildMenuValidationIssues({
    dates: periodDates,
    entries: periodEntries,
    dishIdsWithCards,
    unavailableDishIds,
    costPerPersonByDate,
    dailyCostLimit: dailyLimits.length ? Math.max(...dailyLimits) : 0,
  });
  const storedNorms = (() => {
    try {
      return JSON.parse(localStorage.getItem('medsestra_sanpin_norms_by_group') || '{}') as Record<
        string,
        Array<{ category: string; normGrams: number; unit: string }>
      >;
    } catch {
      return {};
    }
  })();
  const normGroupByCategory: Record<number, string> = { 1: '1-3', 2: '3-4', 3: '4-7', 4: 'staff' };
  const filledDays = Math.max(1, new Set(periodEntries.map(entry => entry.DATA)).size);
  const nutritionNormIssues: MenuValidationIssue[] = activeCategoryIds.flatMap(categoryId => {
    const norms = storedNorms[normGroupByCategory[categoryId]] || [];
    return norms.flatMap(norm => {
      if (norm.unit === 'шт') return [];
      const totalGrams = periodEntries.reduce((sum, entry) => {
        return sum + getRecipeComponents(entry.ID_BLUDA, categoryId, false).reduce((componentSum, component) => {
          const product = products.find(item => item.ID === component.ID_PRODUKTA);
          return componentSum + (
            product && matchesNutritionNorm(product.NAME, norm.category) ? component.GROSSO_GR : 0
          );
        }, 0);
      }, 0);
      const actualAverage = totalGrams / filledDays;
      const ratio = norm.normGrams > 0 ? actualAverage / norm.normGrams : 1;
      if (actualAverage <= 0 || (ratio >= 0.8 && ratio <= 1.2)) return [];
      const category = categories.find(item => item.ID === categoryId);
      return [{
        severity: 'warning',
        code: 'nutrition-norm',
        message: `${translateCatName(category?.NAME || String(categoryId))}: «${norm.category}» — ${actualAverage.toFixed(1)} г/день при нормі ${norm.normGrams} г`,
      }];
    });
  });
  const validationIssues = [...baseValidationIssues, ...nutritionNormIssues];
  const hasBlockingIssues = validationIssues.some(issue => issue.severity === 'error');

  const handleCopyPreviousPeriod = () => {
    const length = getPeriodLength(planningPeriod, periodStart);
    const sourceStart = addCalendarDays(periodStart, -length);
    if (!confirm(`Замінити меню за ${periodStart} — ${periodEnd} копією попереднього періоду?`)) return;
    const result = copyMenuPeriod(sourceStart, periodStart, length, true);
    setConstructorMessage(`Скопійовано ${result.copied} позицій меню.`);
    loadData();
  };

  const handleAutoReplace = () => {
    const usedIds = new Set(periodEntries.map(entry => entry.ID_BLUDA));
    let replaced = 0;
    periodEntries
      .filter(entry => unavailableDishIds.has(entry.ID_BLUDA))
      .forEach(entry => {
        const sourceDish = dishes.find(dish => dish.ID === entry.ID_BLUDA);
        if (!sourceDish) return;
        const replacement = chooseDishReplacement(sourceDish, dishes, usedIds, dishIsAvailable);
        if (!replacement) return;
        replaceMenuDish(entry.ID, replacement);
        usedIds.add(replacement.ID);
        replaced++;
      });
    setConstructorMessage(
      replaced
        ? `Автоматично замінено ${replaced} недоступних страв.`
        : 'Безпечних автоматичних замін не знайдено.'
    );
    loadData();
  };

  const handleApproveMenu = () => {
    if (hasBlockingIssues) return;
    const saved = approveMenu(selectedDate, selectedInstitution, validationIssues);
    setApproval(saved);
    setConstructorMessage(`Меню на ${selectedDate} затверджено.`);
  };

  const getDayDateStr = (mondayDate: Date, dayOffset: number) => {
    const d = new Date(mondayDate);
    d.setDate(mondayDate.getDate() + dayOffset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const weekDayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
  const weekDays = [0, 1, 2, 3, 4, 5, 6].map(i => {
    const isoDate = getDayDateStr(currentMonday, i);
    const d = new Date(isoDate);
    const formattedDay = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
    const count = getMenuEntries(isoDate).length;
    return {
      isoDate,
      dayName: weekDayNames[i],
      formattedDay,
      count,
      isSelected: isoDate === selectedDate
    };
  });

  const handleShiftWeek = (weeks: number) => {
    const newMonday = new Date(currentMonday);
    newMonday.setDate(currentMonday.getDate() + weeks * 7);
    const yyyy = newMonday.getFullYear();
    const mm = String(newMonday.getMonth() + 1).padStart(2, '0');
    const dd = String(newMonday.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleExportExcel = () => {
    const headers = ['Прийом їжі', 'Найменування страви', ...categories.map(c => `Вихід ${translateCatName(c.NAME)} (г)`), ...(showMenuMacros ? ['Білки (г)', 'Жири (г)', 'Вуглеводи (г)'] : []), 'Калорії (ккал)'];
    const rows = menuItems.map(m => {
      const d = dishes.find(dish => dish.ID === m.ID_BLUDA);
      const catYields = categories.map(c => getDishYieldForCat(m.ID_BLUDA, c.ID));
      return [m.MEAL_TYPE, m.NAME_BLUDA, ...catYields, ...(showMenuMacros ? [d?.BELKI || 0, d?.ZIRI || 0, d?.UGLEVODI || 0] : []), d?.KALORII || 0];
    });
    exportToExcel(`Меню_розкладка_${selectedDate}`, 'Меню', headers, rows);
  };

  const handleExportPDF = () => {
    const headers = ['Прийом їжі', 'Найменування страви', ...categories.map(c => `Вихід ${translateCatName(c.NAME)} (г)`), ...(showMenuMacros ? ['Білки (г)', 'Жири (г)', 'Вуглеводи (г)'] : []), 'Калорії (ккал)'];
    const rows = menuItems.map(m => {
      const d = dishes.find(dish => dish.ID === m.ID_BLUDA);
      const catYields = categories.map(c => getDishYieldForCat(m.ID_BLUDA, c.ID));
      return [m.MEAL_TYPE, m.NAME_BLUDA, ...catYields, ...(showMenuMacros ? [d?.BELKI || 0, d?.ZIRI || 0, d?.UGLEVODI || 0] : []), d?.KALORII || 0];
    });
    exportToPDF(`Меню-розкладка на ${formatDate(selectedDate)}`, headers, rows);
  };

  const handlePrint = () => window.print();

  // Group menu items by meal type for print
  const menuByMealType: { [meal: string]: MenuHeader[] } = {};
  menuItems.forEach(item => {
    if (!menuByMealType[item.MEAL_TYPE]) menuByMealType[item.MEAL_TYPE] = [];
    menuByMealType[item.MEAL_TYPE].push(item);
  });

  const totalPeople = Object.values(counts).reduce((a, b) => a + b, 0);

  function activeCatCount() {
    return categories.filter(c => (counts[c.ID] || 0) > 0).length;
  }

  // Nutritional totals considering per-category yields
  const totalCalories = menuItems.reduce((sum, item) => {
    const d = dishes.find(dish => dish.ID === item.ID_BLUDA);
    const baseYield = d?.VYXOD || 200;
    let menuCatCalories = 0;
    categories.forEach(c => {
      const cnt = counts[c.ID] || 0;
      if (cnt > 0) {
        const y = getDishYieldForCat(item.ID_BLUDA, c.ID);
        const ratio = baseYield > 0 ? y / baseYield : 1;
        menuCatCalories += (d?.KALORII || 0) * ratio;
      }
    });
    return sum + (activeCatCount() > 0 ? menuCatCalories / activeCatCount() : 0);
  }, 0);

  const totalProteins = menuItems.reduce((sum, item) => {
    const d = dishes.find(dish => dish.ID === item.ID_BLUDA);
    const baseYield = d?.VYXOD || 200;
    let val = 0;
    categories.forEach(c => {
      if ((counts[c.ID] || 0) > 0) {
        const y = getDishYieldForCat(item.ID_BLUDA, c.ID);
        val += (d?.BELKI || 0) * (baseYield > 0 ? y / baseYield : 1);
      }
    });
    return sum + (activeCatCount() > 0 ? val / activeCatCount() : 0);
  }, 0);

  const totalFats = menuItems.reduce((sum, item) => {
    const d = dishes.find(dish => dish.ID === item.ID_BLUDA);
    const baseYield = d?.VYXOD || 200;
    let val = 0;
    categories.forEach(c => {
      if ((counts[c.ID] || 0) > 0) {
        const y = getDishYieldForCat(item.ID_BLUDA, c.ID);
        val += (d?.ZIRI || 0) * (baseYield > 0 ? y / baseYield : 1);
      }
    });
    return sum + (activeCatCount() > 0 ? val / activeCatCount() : 0);
  }, 0);

  const totalCarbs = menuItems.reduce((sum, item) => {
    const d = dishes.find(dish => dish.ID === item.ID_BLUDA);
    const baseYield = d?.VYXOD || 200;
    let val = 0;
    categories.forEach(c => {
      if ((counts[c.ID] || 0) > 0) {
        const y = getDishYieldForCat(item.ID_BLUDA, c.ID);
        val += (d?.UGLEVODI || 0) * (baseYield > 0 ? y / baseYield : 1);
      }
    });
    return sum + (activeCatCount() > 0 ? val / activeCatCount() : 0);
  }, 0);

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-950">
      {/* SCREEN TOOLBAR */}
      <div className="no-print">
        <QuickToolbar
          onAdd={() => setIsAddModalOpen(true)}
          onRefresh={loadData}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
          onPrint={handlePrint}
          title="Складання меню-розкладки"
        />
      </div>

      {/* SCREEN CONTROL PANEL */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-3 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-sm no-print">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center space-x-1">
              <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
              <span>Дата та заклад</span>
            </label>
            <div className="flex items-center space-x-1.5 text-xs">
              <button
                onClick={() => handleShiftWeek(-1)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 transition"
                title="Попередній тиждень"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              </button>
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded text-[11px] font-bold transition"
                title="Перейти на сьогодні"
              >
                Сьогодні
              </button>
              <button
                onClick={() => handleShiftWeek(1)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 transition"
                title="Наступний тиждень"
              >
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
          </div>

          <div className="flex space-x-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-36 min-w-[140px] px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs focus:ring-1 focus:ring-blue-500 font-bold text-slate-800 dark:text-slate-100"
            />
            <SearchableSelect
              value={selectedInstitution}
              onChange={(e) => setSelectedInstitution(Number(e.target.value))}
              className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-semibold text-slate-800 dark:text-slate-100 truncate"
            >
              {institutions.map(inst => (
                <option key={inst.ID} value={inst.ID}>{inst.NAME}</option>
              ))}
            </SearchableSelect>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsConstructorOpen(true)}
              className="flex items-center gap-1.5 rounded bg-violet-600 px-3 py-1.5 text-[11px] font-extrabold text-white shadow-sm transition hover:bg-violet-700"
            >
              <WandSparkles className="h-3.5 w-3.5" />
              Конструктор тижня / місяця
            </button>
            {approval ? (
              <span className="flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" /> Затверджено
              </span>
            ) : (
              <span className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                Не затверджено
              </span>
            )}
          </div>

          {/* 7 DAYS OF THE WEEK STRIP WITH FILLED & DEDUCTION STATUS BADGES */}
          <div className="flex items-center space-x-1 pt-1 overflow-x-auto">
            {weekDays.map(day => {
              const isDeducted = deductedDates.includes(day.isoDate);
              const isFilled = day.count > 0;
              return (
                <button
                  key={day.isoDate}
                  onClick={() => setSelectedDate(day.isoDate)}
                  className={`flex-1 py-1 px-1 rounded text-center transition flex flex-col items-center justify-between min-h-[46px] border cursor-pointer ${
                    day.isSelected
                      ? 'bg-blue-600 text-white font-extrabold border-blue-700 shadow-sm'
                      : isDeducted
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                      : isFilled
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-800 hover:bg-amber-100'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700'
                  }`}
                  title={`${day.dayName} (${day.formattedDay}) — ${isFilled ? `${day.count} страв` : 'не заповнено'} | ${isDeducted ? '✓ Списано зі складу' : '⏳ Не списано зі складу'}`}
                >
                  <span className="text-[11px] font-black leading-none">{day.dayName}</span>
                  <span className={`text-[9px] font-medium leading-none ${day.isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>{day.formattedDay}</span>
                  
                  {/* Status Badge */}
                  <div className="w-full flex items-center justify-center mt-0.5">
                    {isFilled ? (
                      <span className={`text-[8.5px] px-1 py-0.2 rounded font-extrabold leading-tight ${
                        day.isSelected
                          ? (isDeducted ? 'bg-emerald-800 text-emerald-100' : 'bg-amber-700 text-amber-100')
                          : (isDeducted ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white')
                      }`}>
                        {isDeducted ? `✓ ${day.count} (списано)` : `${day.count} (не списано)`}
                      </span>
                    ) : (
                      <span className={`text-[8.5px] font-medium ${day.isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                        порожньо
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col space-y-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center space-x-1">
            <Users className="w-3.5 h-3.5 text-emerald-500" />
            <span>Кількість харчуючихся дітей / співробітників</span>
          </label>
          <div className="flex space-x-2">
            {categories.map(cat => (
              <div key={cat.ID} className="flex-1 bg-slate-50 dark:bg-slate-950 p-1.5 rounded border border-slate-200 dark:border-slate-800 text-center">
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate" title={translateCatName(cat.NAME)}>
                  {translateCatName(cat.NAME)}
                </span>
                <input
                  type="number"
                  min="0"
                  value={counts[cat.ID] || 0}
                  onChange={(e) => setCounts({ ...counts, [cat.ID]: Number(e.target.value) })}
                  className="w-full text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5"
                />
              </div>
            ))}
          </div>
        </div>

        {/* SUMMARY CARD WITH TOTAL & PER-PERSON COST BREAKDOWN */}
        <div className="bg-blue-50/70 dark:bg-slate-800/60 border border-blue-200 dark:border-slate-700 p-2.5 rounded-lg flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] text-blue-700 dark:text-slate-300 font-medium">Загальна вартість продуктів</span>
              <div className="text-lg font-bold text-blue-900 dark:text-blue-300 flex items-baseline space-x-2">
                <span>{totalCost.toFixed(2)} грн</span>
                {totalPeople > 0 && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    ({(totalCost / totalPeople).toFixed(2)} грн / 1 чол.)
                  </span>
                )}
              </div>
            </div>
            <Calculator className="w-7 h-7 text-blue-500 opacity-60 flex-shrink-0" />
          </div>

          {exceededCategories.length > 0 ? (
            <div className="flex items-center gap-1 rounded border border-rose-300 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              Перевищено ліміт: {exceededCategories.map(category => translateCatName(category.NAME)).join(', ')}
            </div>
          ) : null}

          {/* Cost per category & Cost PER 1 PERSON breakdown cards */}
          <div className="pt-1.5 border-t border-blue-200/80 dark:border-slate-700/80 grid grid-cols-2 xl:grid-cols-4 gap-1.5 text-[10px]">
            {categories.map(cat => {
              const catTotal = totalCostPerCat[cat.ID] || 0;
              const cnt = counts[cat.ID] || 0;
              const perPerson = cnt > 0 ? catTotal / cnt : 0;
              return (
                <div key={cat.ID} className="px-2 py-1 bg-white dark:bg-slate-900 rounded border border-blue-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex flex-col justify-between">
                  <div className="flex items-center justify-between truncate">
                    <span className="font-medium text-slate-500 text-[9.5px] truncate">{translateCatName(cat.NAME)}</span>
                  </div>
                  <div className="font-bold text-blue-700 dark:text-blue-300 text-xs">
                    {catTotal.toFixed(2)} грн
                  </div>
                  <div className="text-[9.5px] font-semibold text-emerald-600 dark:text-emerald-400 border-t border-slate-100 dark:border-slate-800 pt-0.5 mt-0.5">
                    {cnt > 0 ? `${perPerson.toFixed(2)} грн/чол.` : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SCREEN MAIN CONTENT SPLIT */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-3 gap-3 no-print">
        {/* Dishes Table (Screen) */}
        <div className="flex-1 flex flex-col card-glass overflow-hidden">
          <div className="p-2.5 bg-slate-200/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Обрані страви ({filteredMenuItems.length})
              </span>
              <button
                onClick={handlePrint}
                className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[11px] rounded transition shadow-sm cursor-pointer border border-slate-700"
                title="Роздрукувати офіційну меню-розкладку для кухні (Шеф-кухаря)"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>Друк розкладки для кухні</span>
              </button>
            </div>

            <div className="flex items-center space-x-1 overflow-x-auto">
              {['Всі', ...MEAL_TYPES].map(meal => (
                <button
                  key={meal}
                  onClick={() => setSelectedMealType(meal)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded cursor-pointer ${
                    selectedMealType === meal
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                  }`}
                >
                  {meal}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="table-grid">
              <thead>
                <tr>
                  <th>Прийом їжі</th>
                  <th>Найменування страви</th>
                  {categories.map(cat => (
                    <th key={cat.ID} className="text-center">{translateCatName(cat.NAME)} (г) ✏️</th>
                  ))}
                  {showMenuMacros && <><th>Білки</th><th>Жири</th><th>Вуглеводи</th></>}
                  <th>Ккал</th>
                  <th className="w-12 text-center">Дії</th>
                </tr>
              </thead>
              <tbody>
                {filteredMenuItems.length === 0 ? (
                  <tr>
                    <td colSpan={categories.length + (showMenuMacros ? 7 : 4)} className="text-center py-8 text-slate-400 italic">
                      На обрану дату меню не сформовано. Натисніть «Додати» для вибору страв з технологічної карти.
                    </td>
                  </tr>
                ) : (
                  (() => {
                    // Group menu items by MEAL_TYPE
                    const getMealIcon = (type: string) => {
                      if (type.includes('Сніданок') || type.includes('1')) return '🍳';
                      if (type.includes('2-й') || type.includes('Другий')) return '🍎';
                      if (type.includes('Обід')) return '🍲';
                      if (type.includes('Полуденок') || type.includes('Підвечірок')) return '🫖';
                      if (type.includes('Вечеря')) return '🥗';
                      return '🍴';
                    };

                    const groups: { mealType: string; items: MenuHeader[]; totalB: number; totalZ: number; totalU: number; totalKcal: number }[] = [];

                    MEAL_TYPES.forEach(meal => {
                      const itemsInMeal = filteredMenuItems.filter(m => m.MEAL_TYPE === meal);
                      if (itemsInMeal.length > 0) {
                        let totalB = 0;
                        let totalZ = 0;
                        let totalU = 0;
                        let totalKcal = 0;

                        itemsInMeal.forEach(item => {
                          const dish = dishes.find(d => d.ID === item.ID_BLUDA);
                          const baseYield = dish?.VYXOD || 200;
                          let totalNutrientRatio = 0;
                          let activeCount = 0;
                          categories.forEach(c => {
                            if ((counts[c.ID] || 0) > 0) {
                              const y = getDishYieldForCat(item.ID_BLUDA, c.ID);
                              totalNutrientRatio += (baseYield > 0 ? y / baseYield : 1);
                              activeCount++;
                            }
                          });
                          const avgRatio = activeCount > 0 ? totalNutrientRatio / activeCount : 1;

                          totalB += (dish?.BELKI || 0) * avgRatio;
                          totalZ += (dish?.ZIRI || 0) * avgRatio;
                          totalU += (dish?.UGLEVODI || 0) * avgRatio;
                          totalKcal += Math.round((dish?.KALORII || 0) * avgRatio);
                        });

                        groups.push({ mealType: meal, items: itemsInMeal, totalB, totalZ, totalU, totalKcal });
                      }
                    });

                    // Any other custom meal types
                    const otherItems = filteredMenuItems.filter(m => !MEAL_TYPES.includes(m.MEAL_TYPE));
                    if (otherItems.length > 0) {
                      groups.push({ mealType: 'Інше', items: otherItems, totalB: 0, totalZ: 0, totalU: 0, totalKcal: 0 });
                    }

                    return groups.map(group => (
                      <React.Fragment key={`group-${group.mealType}`}>
                        {/* MEAL SECTION HEADER ROW WITH SUBTOTALS */}
                        <tr className="bg-blue-50/80 dark:bg-slate-800/90 font-bold border-t border-b border-blue-200 dark:border-slate-700">
                          <td colSpan={2 + categories.length} className="py-1.5 px-3 text-xs text-blue-900 dark:text-blue-200">
                            <div className="flex items-center space-x-2">
                              <span className="text-base">{getMealIcon(group.mealType)}</span>
                              <span className="font-black text-xs uppercase tracking-wider text-blue-700 dark:text-blue-300">
                                {group.mealType}
                              </span>
                              <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                                ({group.items.length} {group.items.length === 1 ? 'страва' : 'страв'})
                              </span>
                            </div>
                          </td>
                          {showMenuMacros && <>
                            <td className="text-xs text-blue-900 dark:text-blue-200 font-extrabold">{group.totalB.toFixed(1)}</td>
                            <td className="text-xs text-blue-900 dark:text-blue-200 font-extrabold">{group.totalZ.toFixed(1)}</td>
                            <td className="text-xs text-blue-900 dark:text-blue-200 font-extrabold">{group.totalU.toFixed(1)}</td>
                          </>}
                          <td className="text-xs text-amber-600 dark:text-amber-400 font-black">{group.totalKcal}</td>
                          <td></td>
                        </tr>

                        {/* INDIVIDUAL DISH ROWS */}
                        {group.items.map(item => {
                          const dish = dishes.find(d => d.ID === item.ID_BLUDA);
                          const baseYield = dish?.VYXOD || 200;

                          let totalNutrientRatio = 0;
                          let activeCount = 0;
                          categories.forEach(c => {
                            if ((counts[c.ID] || 0) > 0) {
                              const y = getDishYieldForCat(item.ID_BLUDA, c.ID);
                              totalNutrientRatio += (baseYield > 0 ? y / baseYield : 1);
                              activeCount++;
                            }
                          });
                          const avgRatio = activeCount > 0 ? totalNutrientRatio / activeCount : 1;

                          return (
                            <tr key={item.ID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                              <td className="text-center text-slate-400 font-bold text-xs">
                                •
                              </td>
                              <td className="font-semibold text-slate-800 dark:text-slate-100 pl-4">{item.NAME_BLUDA}</td>

                              {/* EDITABLE PORTION WEIGHT INPUT FOR EACH EATER CATEGORY */}
                              {categories.map(cat => {
                                const yieldVal = getDishYieldForCat(item.ID_BLUDA, cat.ID);
                                return (
                                  <td key={cat.ID} className="text-center">
                                    <div className="flex items-center justify-center space-x-0.5">
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={dishCatYieldInputs[item.ID_BLUDA]?.[cat.ID] ?? String(yieldVal)}
                                        onChange={(e) => handleCatYieldChange(item.ID_BLUDA, cat.ID, e.target.value)}
                                        onBlur={() => handleCatYieldCommit(item.ID_BLUDA, cat.ID)}
                                        className="w-14 px-1 py-0.5 text-center bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded text-xs font-bold text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500"
                                        title={`Змінити вагу виходу для ${translateCatName(cat.NAME)}`}
                                      />
                                      <span className="text-[10px] text-slate-400">г</span>
                                    </div>
                                  </td>
                                );
                              })}

                              {showMenuMacros && <>
                                <td>{((dish?.BELKI || 0) * avgRatio).toFixed(1)}</td>
                                <td>{((dish?.ZIRI || 0) * avgRatio).toFixed(1)}</td>
                                <td>{((dish?.UGLEVODI || 0) * avgRatio).toFixed(1)}</td>
                              </>}
                              <td className="font-semibold text-amber-600 dark:text-amber-400">{Math.round((dish?.KALORII || 0) * avgRatio)}</td>
                              <td className="text-center">
                                <button
                                  onClick={() => handleDeleteItem(item.ID)}
                                  className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition"
                                  title="Видалити з меню"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ));
                  })()
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product Requirements Table (Screen) */}
        <div className={`flex flex-col card-glass overflow-hidden transition-all ${showCategoryCost ? 'w-full md:w-1/2' : 'w-full md:w-[460px]'}`}>
          <div className="p-2 bg-slate-200/70 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex flex-col space-y-2">
            {/* Row 1: Title & Status Badge */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                <PackageMinus className="w-3.5 h-3.5 text-blue-500" />
                <span>Зведений розрахунок продуктів (Брутто)</span>
              </span>

              {/* DEDUCTION STATUS BADGE */}
              {deductedDates.includes(selectedDate) ? (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-extrabold text-[10.5px] rounded border border-emerald-300 dark:border-emerald-700 whitespace-nowrap">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>СПИСАНО (FIFO)</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold text-[10.5px] rounded border border-amber-300 dark:border-amber-700 whitespace-nowrap">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span>НЕ СПИСАНО</span>
                </span>
              )}
            </div>

            {/* Row 2: Action Controls */}
            <div className="flex items-center justify-between space-x-2 pt-1 border-t border-slate-300/60 dark:border-slate-700/60">
              {/* DEDUCT FROM WAREHOUSE BUTTON */}
              <button
                onClick={handleDeductStock}
                className={`flex-1 flex items-center justify-center space-x-1 px-2.5 py-1 font-bold text-[11px] rounded transition shadow-sm cursor-pointer whitespace-nowrap ${
                  deductedDates.includes(selectedDate)
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                title="Автоматично списати необхідну кількість брутто продуктів зі складу за методом FIFO"
              >
                <PackageMinus className="w-3.5 h-3.5" />
                <span>{deductedDates.includes(selectedDate) ? 'Повторно списати' : 'Списати зі складу (FIFO)'}</span>
              </button>

              {/* TOGGLE FOR CATEGORY COST BREAKDOWN */}
              <label className="flex items-center space-x-1.5 text-[11px] text-blue-700 dark:text-blue-400 font-semibold cursor-pointer select-none bg-blue-50 dark:bg-blue-950/60 px-2 py-1 rounded border border-blue-200 dark:border-blue-800 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={showCategoryCost}
                  onChange={(e) => setShowCategoryCost(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Деталізувати</span>
              </label>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="table-grid">
              <thead>
                <tr>
                  <th>Продукт</th>
                  {showCategoryCost && categories.map(cat => (
                    <th key={cat.ID} className="text-center">{translateCatName(cat.NAME)} (грн)</th>
                  ))}
                  <th className="text-center">Всього (кг/л)</th>
                  <th className="text-center">Сума (грн)</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(productRequirements).length === 0 ? (
                  <tr>
                    <td colSpan={showCategoryCost ? 3 + categories.length : 3} className="text-center py-8 text-slate-400 italic">
                      Додайте страви до меню для автоматичного розрахунку списання продуктів.
                    </td>
                  </tr>
                ) : (
                  Object.entries(productRequirements).map(([pid, req]) => {
                    const totalKg = req.totalGrams / 1000;
                    const cost = totalKg * req.price;
                    return (
                      <tr key={pid}>
                        <td>
                          <button
                            onClick={() => setSelectedHistoryProductId(Number(pid))}
                            className="font-bold text-blue-700 dark:text-blue-400 hover:underline text-left cursor-pointer"
                            title="Натисніть для перегляду історії приходу та витрат продукту"
                          >
                            {req.name}
                          </button>
                        </td>
                        {showCategoryCost && categories.map(cat => {
                          const catCost = req.costPerCat[cat.ID] || 0;
                          return (
                            <td key={cat.ID} className="text-center font-medium text-slate-600 dark:text-slate-400">
                              {catCost > 0 ? `${catCost.toFixed(2)}` : '—'}
                            </td>
                          );
                        })}
                        <td className="text-center font-bold text-blue-600 dark:text-blue-400">{totalKg.toFixed(3)} {req.unit}</td>
                        <td className="text-center text-emerald-600 dark:text-emerald-400 font-semibold">{cost.toFixed(2)} грн</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {showCategoryCost && Object.keys(productRequirements).length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t border-slate-300">
                    <td className="text-right">Разом по закладу:</td>
                    {categories.map(cat => (
                      <td key={cat.ID} className="text-center text-blue-700 dark:text-blue-300 font-bold">
                        {(totalCostPerCat[cat.ID] || 0).toFixed(2)} грн
                      </td>
                    ))}
                    <td></td>
                    <td className="text-center text-emerald-700 dark:text-emerald-300 font-bold">{totalCost.toFixed(2)} грн</td>
                  </tr>
                  <tr className="bg-emerald-50/80 dark:bg-emerald-950/40 text-[11px] font-bold border-t border-emerald-200 dark:border-emerald-800">
                    <td className="text-right text-emerald-800 dark:text-emerald-300">На 1 чоловіка:</td>
                    {categories.map(cat => {
                      const cnt = counts[cat.ID] || 0;
                      const catCost = totalCostPerCat[cat.ID] || 0;
                      const perP = cnt > 0 ? catCost / cnt : 0;
                      return (
                        <td key={cat.ID} className="text-center text-emerald-700 dark:text-emerald-300 font-bold">
                          {cnt > 0 ? `${perP.toFixed(2)} грн/чол.` : '—'}
                        </td>
                      );
                    })}
                    <td></td>
                    <td className="text-center text-emerald-800 dark:text-emerald-300 font-bold">
                      {(totalPeople > 0 ? totalCost / totalPeople : 0).toFixed(2)} грн/чол.
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* PRINT-ONLY SECTION — CLEAN HORIZONTAL LAYOUT LIKE SCREENSHOT 1  */}
      {/* ================================================================ */}
      <div className="print-only">
        {/* Header Document Information */}
        <div className="print-header">
          <p className="text-center text-sm font-bold text-black uppercase">{institution?.NAME || 'Заклад дошкільної освіти'}</p>
          {institution?.ADRES && <p className="text-center text-xs text-gray-700">{institution.ADRES}</p>}
          <h1 className="text-center text-xl font-bold mt-1 tracking-wider text-black">МЕНЮ-РОЗКЛАДКА</h1>
          <p className="text-center text-xs italic text-gray-800">на {formatDate(selectedDate)}</p>

          {/* SINGLE CLEAN HORIZONTAL BAR FOR EATER COUNTS */}
          <div className="print-counts-bar flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-xs font-semibold mt-2 pt-1 border-t border-black px-2">
            {categories.map(cat => (
              <span key={cat.ID} className="whitespace-nowrap">
                {translateCatName(cat.NAME)}: <strong>{counts[cat.ID] || 0} осіб</strong>
              </span>
            ))}
            <span className="whitespace-nowrap font-bold border-l border-black pl-3">
              Усього: <strong>{totalPeople} осіб</strong>
            </span>
          </div>
        </div>

        {/* Meals and Dishes Breakdown */}
        {MEAL_TYPES.map(meal => {
          const mealDishes = menuByMealType[meal] || [];
          if (!mealDishes.length) return null;
          return (
            <div key={meal} className="print-meal-block mb-3">
              <div className="print-meal-header font-bold text-xs uppercase border-b-2 border-black pb-0.5 mb-1">{meal}</div>
              <table className="print-table w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-1 text-left">Найменування страви</th>
                    {categories.map(cat => (
                      <th key={cat.ID} className="border border-black p-1 text-center font-bold">
                        Вихід {translateCatName(cat.NAME)} (г)
                      </th>
                    ))}
                    {showMenuMacros && <>
                      <th className="border border-black p-1 text-center w-16">Білки (г)</th>
                      <th className="border border-black p-1 text-center w-16">Жири (г)</th>
                      <th className="border border-black p-1 text-center w-16">Вуглеводи (г)</th>
                    </>}
                    <th className="border border-black p-1 text-center w-16 font-bold">Ккал</th>
                  </tr>
                </thead>
                <tbody>
                  {mealDishes.map(item => {
                    const d = dishes.find(dish => dish.ID === item.ID_BLUDA);
                    const baseYield = d?.VYXOD || 200;
                    let totalRatio = 0;
                    let cntActive = 0;
                    categories.forEach(c => {
                      if ((counts[c.ID] || 0) > 0) {
                        const y = getDishYieldForCat(item.ID_BLUDA, c.ID);
                        totalRatio += (baseYield > 0 ? y / baseYield : 1);
                        cntActive++;
                      }
                    });
                    const avgRatio = cntActive > 0 ? totalRatio / cntActive : 1;

                    return (
                      <tr key={item.ID}>
                        <td className="border border-black p-1 font-semibold">{item.NAME_BLUDA}</td>
                        {categories.map(cat => (
                          <td key={cat.ID} className="border border-black p-1 text-center font-bold">
                            {getDishYieldForCat(item.ID_BLUDA, cat.ID)} г
                          </td>
                        ))}
                        {showMenuMacros && <>
                          <td className="border border-black p-1 text-center">{((d?.BELKI || 0) * avgRatio).toFixed(1)}</td>
                          <td className="border border-black p-1 text-center">{((d?.ZIRI || 0) * avgRatio).toFixed(1)}</td>
                          <td className="border border-black p-1 text-center">{((d?.UGLEVODI || 0) * avgRatio).toFixed(1)}</td>
                        </>}
                        <td className="border border-black p-1 text-center font-bold">{Math.round((d?.KALORII || 0) * avgRatio)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* Daily Summary Totals — CLEAN 6-COLUMN TABLE */}
        <div className="print-summary-block mb-3">
          <table className="print-table w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-200 font-bold">
                <th className="border border-black p-1 text-left">Разом за день</th>
                {showMenuMacros && <>
                  <th className="border border-black p-1 text-center w-16">Білки (г)</th>
                  <th className="border border-black p-1 text-center w-16">Жири (г)</th>
                  <th className="border border-black p-1 text-center w-16">Вуглеводи (г)</th>
                </>}
                <th className="border border-black p-1 text-center w-16">Калорії (ккал)</th>
                <th className="border border-black p-1 text-center w-28">Вартість (грн)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="font-bold">
                <td className="border border-black p-1">ПІДСУМОК</td>
                {showMenuMacros && <>
                  <td className="border border-black p-1 text-center">{totalProteins.toFixed(1)}</td>
                  <td className="border border-black p-1 text-center">{totalFats.toFixed(1)}</td>
                  <td className="border border-black p-1 text-center">{totalCarbs.toFixed(1)}</td>
                </>}
                <td className="border border-black p-1 text-center">{totalCalories.toFixed(0)}</td>
                <td className="border border-black p-1 text-center text-sm font-extrabold">{totalCost.toFixed(2)}</td>
              </tr>
              <tr className="font-semibold text-[11px] bg-gray-50">
                <td className="border border-black p-1 font-bold">НА 1 ЧОЛОВІКА (ВАРТІСТЬ)</td>
                <td colSpan={showMenuMacros ? 4 : 1} className="border border-black p-1 text-center">
                  {categories.map(c => {
                    const cnt = counts[c.ID] || 0;
                    const cCost = totalCostPerCat[c.ID] || 0;
                    const pCost = cnt > 0 ? cCost / cnt : 0;
                    return `${translateCatName(c.NAME)}: ${pCost.toFixed(2)} грн`;
                  }).join('  |  ')}
                </td>
                <td className="border border-black p-1 text-center font-bold">
                  {(totalPeople > 0 ? totalCost / totalPeople : 0).toFixed(2)} грн
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Product Requirements Breakdown Table (Print — ALWAYS SHOW DETAILED CATEGORY COLUMNS) */}
        {Object.keys(productRequirements).length > 0 && (
          <div className="print-products-block mb-3">
            <div className="print-meal-header font-bold text-xs uppercase border-b-2 border-black pb-0.5 mb-1">
              ЗВЕДЕНИЙ РОЗРАХУНОК ПРОДУКТІВ (БРУТТО) — ДЕТАЛІЗАЦІЯ ЗА КАТЕГОРІЯМИ
            </div>
            <table className="print-table w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100 font-bold">
                  <th className="border border-black p-1 w-8 text-center">№</th>
                  <th className="border border-black p-1 text-left">Найменування продукту</th>
                  {categories.map(cat => (
                    <th key={cat.ID} className="border border-black p-1 text-center">
                      {translateCatName(cat.NAME)}
                    </th>
                  ))}
                  <th className="border border-black p-1 w-24 text-center">Усього (кг/л)</th>
                  <th className="border border-black p-1 w-20 text-center">Ціна (грн)</th>
                  <th className="border border-black p-1 w-24 text-center">Сума (грн)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(productRequirements).map(([pid, req], idx) => {
                  const totalKg = req.totalGrams / 1000;
                  const cost = totalKg * req.price;
                  return (
                    <tr key={pid}>
                      <td className="border border-black p-1 text-center">{idx + 1}</td>
                      <td className="border border-black p-1 font-semibold">{req.name}</td>
                      {categories.map(cat => {
                        const catGrams = req.gramsPerCat[cat.ID] || 0;
                        const catCost = req.costPerCat[cat.ID] || 0;
                        const catKg = catGrams / 1000;
                        return (
                          <td key={cat.ID} className="border border-black p-1 text-center">
                            {catKg > 0 ? (
                              <span>
                                <strong>{formatQty(catKg)} {req.unit}</strong>
                                <span className="text-[10px] block text-gray-700">({catCost.toFixed(2)} грн)</span>
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        );
                      })}
                      <td className="border border-black p-1 text-center font-bold">{formatQty(totalKg)} {req.unit}</td>
                      <td className="border border-black p-1 text-center">{req.price.toFixed(2)}</td>
                      <td className="border border-black p-1 text-center font-bold">{cost.toFixed(2)}</td>
                    </tr>
                  );
                })}
                <tr className="border border-black p-1 font-bold bg-gray-100">
                  <td colSpan={2} className="border border-black p-1 text-right">Загальна вартість продуктів:</td>
                  {categories.map(cat => (
                    <td key={cat.ID} className="border border-black p-1 text-center font-bold">
                      {(totalCostPerCat[cat.ID] || 0).toFixed(2)} грн
                    </td>
                  ))}
                  <td colSpan={3} className="border border-black p-1 text-center font-extrabold">{totalCost.toFixed(2)} грн</td>
                </tr>
                <tr className="border border-black p-1 font-bold bg-gray-100">
                  <td colSpan={2} className="border border-black p-1 text-right">Вартість харчування на 1 чоловіка:</td>
                  {categories.map(cat => {
                    const cnt = counts[cat.ID] || 0;
                    const cCost = totalCostPerCat[cat.ID] || 0;
                    const pCost = cnt > 0 ? cCost / cnt : 0;
                    return (
                      <td key={cat.ID} className="border border-black p-1 text-center font-bold">
                        {cnt > 0 ? `${pCost.toFixed(2)} грн/чол.` : '—'}
                      </td>
                    );
                  })}
                  <td colSpan={3} className="border border-black p-1 text-center font-bold">
                    {(totalPeople > 0 ? totalCost / totalPeople : 0).toFixed(2)} грн/чол.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Official Signatures */}
        <div className="print-signatures-block flex justify-between items-center text-xs mt-6 pt-2">
          <div>Завідувач: ____________________ /_________________/</div>
          <div>Медична сестра: _______________ /_________________/</div>
          <div>Кухар: _______________________ /_________________/</div>
        </div>
      </div>

      {/* Week / Month Menu Constructor */}
      {isConstructorOpen && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-5 py-3 dark:border-slate-800 dark:bg-slate-800">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                  <WandSparkles className="h-4 w-4 text-violet-600" />
                  Конструктор меню на тиждень або місяць
                </h3>
                <p className="text-[10px] text-slate-500">
                  {periodStart} — {periodEnd} · {periodEntries.length} позицій меню
                </p>
              </div>
              <button onClick={() => setIsConstructorOpen(false)} className="rounded p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700" title="Закрити">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
              <div className="flex rounded-lg border border-slate-300 p-0.5 dark:border-slate-700">
                {([
                  ['week', 'Тиждень'],
                  ['month', 'Місяць'],
                ] as Array<[PlanningPeriod, string]>).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setPlanningPeriod(value)}
                    className={`rounded-md px-4 py-1.5 text-xs font-bold ${
                      planningPeriod === value
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={handleCopyPreviousPeriod} className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700">
                  <Copy className="h-3.5 w-3.5" /> Копіювати попередній {planningPeriod === 'week' ? 'тиждень' : 'місяць'}
                </button>
                <button
                  onClick={handleAutoReplace}
                  disabled={unavailableDishIds.size === 0}
                  className="flex items-center gap-1.5 rounded bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Repeat2 className="h-3.5 w-3.5" /> Замінити відсутні автоматично
                </button>
                <button
                  onClick={handleApproveMenu}
                  disabled={hasBlockingIssues}
                  className="flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                  title={hasBlockingIssues ? 'Спочатку усуньте критичні помилки' : 'Затвердити обраний день'}
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Затвердити меню на {selectedDate}
                </button>
              </div>
            </div>

            {constructorMessage ? (
              <div className="border-b border-blue-200 bg-blue-50 px-5 py-2 text-[11px] font-bold text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                {constructorMessage}
              </div>
            ) : null}

            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1.4fr_1fr]">
              <section className="overflow-auto border-r border-slate-200 p-4 dark:border-slate-800">
                <div className={`grid gap-2 ${planningPeriod === 'week' ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4 xl:grid-cols-7'}`}>
                  {periodDates.map(date => {
                    const entries = periodEntries.filter(entry => entry.DATA === date);
                    const dateCost = costPerPersonByDate.get(date) || 0;
                    const unavailable = entries.filter(entry => unavailableDishIds.has(entry.ID_BLUDA));
                    return (
                      <button
                        key={date}
                        onClick={() => { setSelectedDate(date); if (planningPeriod === 'week') setIsConstructorOpen(false); }}
                        className={`min-h-24 rounded-lg border p-2 text-left transition ${
                          date === selectedDate
                            ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500 dark:bg-violet-950/30'
                            : unavailable.length
                              ? 'border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/20'
                              : entries.length
                                ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20'
                                : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black">{new Date(`${date}T12:00:00`).toLocaleDateString('uk-UA', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
                          <span className="rounded bg-white/80 px-1 text-[9px] font-bold dark:bg-slate-900">{entries.length}</span>
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {entries.slice(0, planningPeriod === 'week' ? 5 : 2).map(entry => (
                            <div key={entry.ID} className="truncate text-[9px]" title={entry.NAME_BLUDA}>
                              {unavailableDishIds.has(entry.ID_BLUDA) ? '⚠ ' : ''}{entry.NAME_BLUDA}
                            </div>
                          ))}
                          {entries.length > (planningPeriod === 'week' ? 5 : 2) ? <div className="text-[9px] text-slate-400">+ ще</div> : null}
                        </div>
                        <div className="mt-1 border-t border-current/10 pt-1 text-[9px] font-bold text-blue-700 dark:text-blue-300">
                          ≈ {dateCost.toFixed(2)} грн/особу
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <aside className="overflow-auto p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wide">Перевірка перед затвердженням</h4>
                  <span className={`rounded px-2 py-1 text-[10px] font-bold ${
                    hasBlockingIssues
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}>
                    {hasBlockingIssues ? 'Є критичні помилки' : 'Готово до затвердження'}
                  </span>
                </div>
                <div className="space-y-2">
                  {validationIssues.map((issue, index) => (
                    <div key={`${issue.code}-${issue.dishId || issue.date || index}`} className={`rounded-lg border p-2.5 text-[10px] ${
                      issue.severity === 'error'
                        ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300'
                        : issue.severity === 'warning'
                          ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
                    }`}>
                      <div className="flex items-start gap-2">
                        {issue.severity === 'success'
                          ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                        <span className="font-semibold">{issue.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}

      {/* Add Dish Modal (Screen) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Додати страву до меню-розкладки</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Прийом їжі</label>
                <SearchableSelect
                  value={newMealType}
                  onChange={(e) => setNewMealType(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-medium"
                >
                  {MEAL_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                </SearchableSelect>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Оберіть страву з технологічної карти</label>
                <SearchableSelect
                  value={newDishId}
                  onChange={(e) => setNewDishId(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-medium"
                >
                  {dishes.map(d => (
                    <option key={d.ID} value={d.ID}>{d.NAME} ({d.VYXOD}г - {d.KALORII} ккал)</option>
                  ))}
                </SearchableSelect>
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
              <button onClick={() => setIsAddModalOpen(false)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-medium">
                Скасувати
              </button>
              <button onClick={handleAddDish} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold">
                Додати до меню
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product History Modal */}
      <ProductHistoryModal
        productId={selectedHistoryProductId}
        onClose={() => setSelectedHistoryProductId(null)}
      />
    </div>
  );
};
