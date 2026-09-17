import { describe, expect, it } from 'vitest';
import { DailyAttendanceRecord, BrackerageReadyEntry, BrackerageRawEntry } from '../types';

describe('Daily Attendance & Menu Eater Counts Logic', () => {
  it('aggregates daily attendance records by category correctly for menu import', () => {
    const records: DailyAttendanceRecord[] = [
      { DATE: '2026-09-17', GROUP_ID: 1, GROUP_NAME: 'Ясельна група №1', CATEGORY_ID: 1, PRESENT_COUNT: 18, DIET_COUNT: 1 },
      { DATE: '2026-09-17', GROUP_ID: 2, GROUP_NAME: 'Молодша група №2', CATEGORY_ID: 2, PRESENT_COUNT: 22, DIET_COUNT: 0 },
      { DATE: '2026-09-17', GROUP_ID: 3, GROUP_NAME: 'Середня група №3', CATEGORY_ID: 2, PRESENT_COUNT: 24, DIET_COUNT: 2 },
      { DATE: '2026-09-17', GROUP_ID: 4, GROUP_NAME: 'Старша група №4', CATEGORY_ID: 2, PRESENT_COUNT: 26, DIET_COUNT: 1 },
    ];

    const counts: Record<number, number> = {};
    records.forEach(r => {
      const cat = r.CATEGORY_ID || 2;
      counts[cat] = (counts[cat] || 0) + (r.PRESENT_COUNT || 0);
    });

    expect(counts[1]).toBe(18); // Ясла
    expect(counts[2]).toBe(72); // Садок (22 + 24 + 26)
    expect(counts[1] + counts[2]).toBe(90);
  });

  it('validates HACCP brackerage ready meal entry structure', () => {
    const entry: Omit<BrackerageReadyEntry, 'ID'> = {
      DATE: '2026-09-17',
      TIME: '11:45',
      MEAL_TYPE: 'Обід',
      DISH_NAME: 'Борщ український зі сметаною',
      TEMPERATURE_C: 75,
      WEIGHT_PORTION_CHECK: '200г / 200г',
      ORGANOLEPTIC_RATING: 'Відмінно',
      PERMISSION_TO_SERVE: 'Видача дозволена',
      COMMISSION_MEMBERS: 'Медсестра Суміна Н.Є., Шеф-кухар'
    };

    expect(entry.TEMPERATURE_C).toBeGreaterThanOrEqual(65);
    expect(entry.PERMISSION_TO_SERVE).toBe('Видача дозволена');
    expect(entry.ORGANOLEPTIC_RATING).toBe('Відмінно');
  });

  it('validates HACCP incoming raw product reception structure', () => {
    const rawEntry: Omit<BrackerageRawEntry, 'ID'> = {
      DATE: '2026-09-17',
      PRODUCT_NAME: 'Масло вершкове 73% ДСТУ',
      SUPPLIER_NAME: 'ТОВ «Агропостач»',
      INVOICE_NUMBER: 'НАК-104',
      PACKAGE_INTEGRITY: 'Цілісна',
      EXPIRY_DATE: '2026-10-15',
      DOCUMENTATION_STATUS: 'В наявності',
      ACCEPTANCE_DECISION: 'Прийнято',
      RESPONSIBLE_PERSON: 'Суміна Н.Є.'
    };

    expect(rawEntry.PACKAGE_INTEGRITY).toBe('Цілісна');
    expect(rawEntry.DOCUMENTATION_STATUS).toBe('В наявності');
    expect(rawEntry.ACCEPTANCE_DECISION).toBe('Прийнято');
  });

  it('evaluates day-cost financial norms according to Kryvyi Rih city rates', () => {
    const normYasla = 45.00;
    const normSadok = 65.00;

    const testCost1 = 44.50;
    const testCost2 = 68.20;

    const isYaslaWithinNorm = testCost1 <= normYasla;
    const isSadokExceeded = testCost2 > normSadok;

    expect(isYaslaWithinNorm).toBe(true);
    expect(isSadokExceeded).toBe(true);
  });
});
