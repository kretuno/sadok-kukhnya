import { describe, expect, it } from 'vitest';
import {
  applyPropertyWriteOff,
  isDateInClosedPeriod,
  planFifoDeductions,
  restorePropertyWriteOff,
  validateMenuEntryInput,
} from './operations';

describe('planFifoDeductions', () => {
  it('списывает сначала самую старую партию', () => {
    const plan = planFifoDeductions([
      { id: 10, availableKg: 2 },
      { id: 11, availableKg: 5 },
    ], 4);

    expect(plan.deductions).toEqual([
      { batchId: 10, takeKg: 2, remainingKg: 0 },
      { batchId: 11, takeKg: 2, remainingKg: 3 },
    ]);
    expect(plan.shortageKg).toBe(0);
  });

  it('фиксирует нехватку и не создаёт отрицательные остатки', () => {
    const plan = planFifoDeductions([
      { id: 1, availableKg: 1.25 },
      { id: 2, availableKg: 0.75 },
    ], 3);

    expect(plan.deductions.map(item => item.remainingKg)).toEqual([0, 0]);
    expect(plan.shortageKg).toBe(1);
  });

  it('игнорирует нулевые и отрицательные остатки', () => {
    const plan = planFifoDeductions([
      { id: 1, availableKg: -4 },
      { id: 2, availableKg: 0 },
      { id: 3, availableKg: 2 },
    ], 1);

    expect(plan.deductions).toEqual([
      { batchId: 3, takeKg: 1, remainingKg: 1 },
    ]);
  });
});

describe('имущественные списания', () => {
  const item = {
    ID: 1,
    TOTAL_QUANTITY: 5,
    CONDITION: 'Відмінний',
    LOCATIONS: [
      { id: 'a', locationName: 'Группа А', responsiblePerson: 'Завхоз', quantity: 5 },
    ],
  };

  it('уменьшает количество без ухода ниже нуля', () => {
    const result = applyPropertyWriteOff(item, 'Группа А', 7);
    expect(result.TOTAL_QUANTITY).toBe(0);
    expect(result.LOCATIONS[0].quantity).toBe(0);
    expect(result.CONDITION).toBe('Підлягає списанню');
  });

  it('возвращает количество при отмене списания', () => {
    const writtenOff = applyPropertyWriteOff(item, 'Группа А', 2);
    const restored = restorePropertyWriteOff(
      writtenOff,
      'Группа А',
      'Завхоз',
      2,
      'restored',
    );
    expect(restored.TOTAL_QUANTITY).toBe(5);
    expect(restored.LOCATIONS[0].quantity).toBe(5);
  });
});

describe('закрытые периоды и меню', () => {
  const periods = [
    { startDate: '2026-06-01', endDate: '2026-06-30' },
    { startDate: '2026-05-01', endDate: '2026-05-31', reopenedAt: '2026-07-01T10:00:00Z' },
  ];

  it('блокирует дату активного закрытого периода', () => {
    expect(isDateInClosedPeriod('2026-06-15', periods)).toBe(true);
    expect(isDateInClosedPeriod('2026-05-15', periods)).toBe(false);
    expect(isDateInClosedPeriod('2026-07-01', periods)).toBe(false);
  });

  it('принимает корректную запись меню', () => {
    expect(validateMenuEntryInput({
      date: '2026-07-28',
      dishId: 15,
      dishName: 'Борщ',
      mealType: 'Обід',
    })).toEqual([]);
  });

  it('отклоняет неполную запись меню', () => {
    expect(validateMenuEntryInput({
      date: '28.07.2026',
      dishId: 0,
      dishName: ' ',
      mealType: '',
    })).toHaveLength(4);
  });
});
