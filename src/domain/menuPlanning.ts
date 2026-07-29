import { Dish, MenuHeader, RecipeComponent } from '../types';

export type PlanningPeriod = 'week' | 'month';

export interface MenuValidationIssue {
  severity: 'error' | 'warning' | 'success';
  code: 'empty-day' | 'missing-card' | 'stock-shortage' | 'repeat' | 'cost-limit' | 'nutrition-norm' | 'ready';
  date?: string;
  dishId?: number;
  message: string;
}

export function matchesNutritionNorm(productName: string, normCategory: string): boolean {
  const product = productName.toLocaleLowerCase('uk-UA');
  const category = normCategory.toLocaleLowerCase('uk-UA');
  const groups: Array<[string[], string[]]> = [
    [['молоко', 'кисломолоч'], ['молок', 'кефір', 'йогурт', 'сметан', 'сир кисломолоч']],
    [['масло вершков'], ['масло вершков']],
    [['хліб пшенич'], ['хліб пшенич']],
    [['хліб житн'], ['хліб житн']],
    [['картоп'], ['картоп']],
    [['овоч', 'зелень'], ['капуст', 'морк', 'буряк', 'цибул', 'томат', 'огір', 'кабач', 'гарбуз', 'зелень']],
    [['фрукт'], ['яблу', 'банан', 'груш', 'слив', 'персик', 'апельс', 'ягод']],
    [['м’яс', "м'яс", 'птиц'], ['м’яс', "м'яс", 'кур', 'індич', 'ялович', 'свинин']],
    [['риба'], ['риб', 'хек', 'минтай']],
    [['круп', 'макарон'], ['круп', 'рис', 'греч', 'пшон', 'макарон', 'булгур']],
    [['цукор'], ['цукор']],
    [['яйце'], ['яйце']],
  ];
  const match = groups.find(([categoryTerms]) => categoryTerms.some(term => category.includes(term)));
  return Boolean(match?.[1].some(term => product.includes(term)));
}

export function addCalendarDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function getPeriodLength(period: PlanningPeriod, startDate: string): number {
  if (period === 'week') return 7;
  const [year, month] = startDate.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

export function getPeriodDates(period: PlanningPeriod, startDate: string): string[] {
  const count = getPeriodLength(period, startDate);
  return Array.from({ length: count }, (_, index) => addCalendarDays(startDate, index));
}

export function getRepeatedDishIds(entries: MenuHeader[], minimumOccurrences = 2): Map<number, MenuHeader[]> {
  const grouped = new Map<number, MenuHeader[]>();
  entries.forEach(entry => {
    const current = grouped.get(entry.ID_BLUDA) || [];
    current.push(entry);
    grouped.set(entry.ID_BLUDA, current);
  });
  return new Map(
    Array.from(grouped.entries()).filter(([, rows]) => rows.length >= minimumOccurrences)
  );
}

export function isDishAvailable(
  dishId: number,
  categoryIds: number[],
  getComponents: (dishId: number, categoryId: number) => RecipeComponent[],
  stockByProduct: Map<number, number>
): boolean {
  return categoryIds.every(categoryId => {
    const components = getComponents(dishId, categoryId).filter(item => !item.IS_ALTERNATIVE);
    return components.length > 0 && components.every(component => {
      const availableKg = stockByProduct.get(component.ID_PRODUKTA) || 0;
      return availableKg + 0.000001 >= component.GROSSO_GR / 1000;
    });
  });
}

export function chooseDishReplacement(
  sourceDish: Dish,
  candidates: Dish[],
  usedDishIds: Set<number>,
  isAvailable: (dishId: number) => boolean
): Dish | null {
  const ranked = candidates
    .filter(candidate =>
      candidate.ID !== sourceDish.ID
      && candidate.ID_GRUPPI_BLUD === sourceDish.ID_GRUPPI_BLUD
      && !usedDishIds.has(candidate.ID)
      && isAvailable(candidate.ID)
    )
    .sort((left, right) => {
      const leftDistance = Math.abs((left.KALORII || 0) - (sourceDish.KALORII || 0));
      const rightDistance = Math.abs((right.KALORII || 0) - (sourceDish.KALORII || 0));
      return leftDistance - rightDistance || left.NAME.localeCompare(right.NAME, 'uk');
    });
  return ranked[0] || null;
}

export function buildMenuValidationIssues(input: {
  dates: string[];
  entries: MenuHeader[];
  dishIdsWithCards: Set<number>;
  unavailableDishIds: Set<number>;
  costPerPersonByDate: Map<string, number>;
  dailyCostLimit: number;
}): MenuValidationIssue[] {
  const issues: MenuValidationIssue[] = [];
  input.dates.forEach(date => {
    if (!input.entries.some(entry => entry.DATA === date)) {
      issues.push({ severity: 'warning', code: 'empty-day', date, message: `${date}: меню не заповнене` });
    }
  });
  input.entries.forEach(entry => {
    if (!input.dishIdsWithCards.has(entry.ID_BLUDA)) {
      issues.push({
        severity: 'error', code: 'missing-card', date: entry.DATA, dishId: entry.ID_BLUDA,
        message: `${entry.DATA}: у страви «${entry.NAME_BLUDA}» немає повної технологічної карти`,
      });
    }
    if (input.unavailableDishIds.has(entry.ID_BLUDA)) {
      issues.push({
        severity: 'error', code: 'stock-shortage', date: entry.DATA, dishId: entry.ID_BLUDA,
        message: `${entry.DATA}: недостатньо продуктів для «${entry.NAME_BLUDA}»`,
      });
    }
  });
  getRepeatedDishIds(input.entries).forEach(rows => {
    issues.push({
      severity: 'warning', code: 'repeat', dishId: rows[0].ID_BLUDA,
      message: `Страва «${rows[0].NAME_BLUDA}» повторюється ${rows.length} рази за період`,
    });
  });
  if (input.dailyCostLimit > 0) {
    input.costPerPersonByDate.forEach((cost, date) => {
      if (cost > input.dailyCostLimit) {
        issues.push({
          severity: 'error', code: 'cost-limit', date,
          message: `${date}: вартість ${cost.toFixed(2)} грн перевищує ліміт ${input.dailyCostLimit.toFixed(2)} грн`,
        });
      }
    });
  }
  if (!issues.some(issue => issue.severity === 'error')) {
    issues.unshift({
      severity: 'success', code: 'ready',
      message: 'Критичних помилок не виявлено — меню можна затвердити',
    });
  }
  return issues;
}
