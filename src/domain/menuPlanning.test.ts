import { describe, expect, it } from 'vitest';
import {
  addCalendarDays,
  buildMenuValidationIssues,
  chooseDishReplacement,
  getPeriodLength,
  getRepeatedDishIds,
  matchesNutritionNorm,
} from './menuPlanning';
import { Dish, MenuHeader } from '../types';

const menu = (id: number, date: string, dishId: number, name: string): MenuHeader => ({
  ID: id, ID_ZOY: 1, DATA: date, ID_BLUDA: dishId, NAME_BLUDA: name,
  PORRDOK_SLEDOVANIR_BLUD: id, MEAL_TYPE: 'Обід',
});

const dish = (id: number, category: number, calories: number, name: string): Dish => ({
  ID: id, NAME: name, NOTES: '', ID_GRUPPI_BLUD: category, VYXOD: 100,
  BELKI: 0, ZIRI: 0, UGLEVODI: 0, KALORII: calories, PORRDOK_SLEDOVANIR_BLUD: id,
});

describe('конструктор меню', () => {
  it('коректно будує календарні періоди', () => {
    expect(addCalendarDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(getPeriodLength('week', '2026-07-27')).toBe(7);
    expect(getPeriodLength('month', '2024-02-01')).toBe(29);
  });

  it('знаходить повтори страв', () => {
    const repetitions = getRepeatedDishIds([
      menu(1, '2026-07-27', 10, 'Борщ'),
      menu(2, '2026-07-29', 10, 'Борщ'),
      menu(3, '2026-07-30', 11, 'Суп'),
    ]);
    expect(repetitions.get(10)).toHaveLength(2);
    expect(repetitions.has(11)).toBe(false);
  });

  it('зіставляє продукти з групами норм харчування', () => {
    expect(matchesNutritionNorm('Кефір 2,5%', 'Молоко та кисломолочні продукти')).toBe(true);
    expect(matchesNutritionNorm('Філе куряче', 'М’ясо (яловичина, птиця)')).toBe(true);
    expect(matchesNutritionNorm('Цукор білий', 'Риба (філе)')).toBe(false);
  });

  it('підбирає доступну заміну тієї самої категорії без повтору', () => {
    const source = dish(1, 2, 150, 'Котлета');
    const result = chooseDishReplacement(
      source,
      [dish(2, 2, 170, 'Тефтелі'), dish(3, 2, 151, 'Гуляш'), dish(4, 1, 150, 'Суп')],
      new Set([3]),
      id => id !== 4,
    );
    expect(result?.ID).toBe(2);
  });

  it('блокує затвердження при нестачі та перевищенні ліміту', () => {
    const entries = [menu(1, '2026-07-27', 10, 'Борщ')];
    const issues = buildMenuValidationIssues({
      dates: ['2026-07-27'],
      entries,
      dishIdsWithCards: new Set([10]),
      unavailableDishIds: new Set([10]),
      costPerPersonByDate: new Map([['2026-07-27', 85]]),
      dailyCostLimit: 70,
    });
    expect(issues.filter(issue => issue.severity === 'error')).toHaveLength(2);
  });
});
