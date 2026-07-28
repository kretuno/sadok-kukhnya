export interface FifoBatch {
  id: number;
  availableKg: number;
}

export interface FifoDeduction {
  batchId: number;
  takeKg: number;
  remainingKg: number;
}

export interface FifoPlan {
  deductions: FifoDeduction[];
  shortageKg: number;
}

export function planFifoDeductions(batches: FifoBatch[], requiredKg: number): FifoPlan {
  let remainingNeed = Math.max(0, requiredKg);
  const deductions: FifoDeduction[] = [];

  for (const batch of batches) {
    if (remainingNeed <= 0) break;
    const availableKg = Math.max(0, batch.availableKg);
    const takeKg = Math.min(availableKg, remainingNeed);
    if (takeKg <= 0) continue;

    deductions.push({
      batchId: batch.id,
      takeKg,
      remainingKg: availableKg - takeKg,
    });
    remainingNeed -= takeKg;
  }

  return {
    deductions,
    shortageKg: Math.max(0, remainingNeed),
  };
}

export interface DateRange {
  startDate: string;
  endDate: string;
  reopenedAt?: string | null;
}

export function isDateInClosedPeriod(date: string, periods: DateRange[]): boolean {
  return periods.some(period =>
    !period.reopenedAt && date >= period.startDate && date <= period.endDate
  );
}

export function validateMenuEntryInput(input: {
  date: string;
  dishId: number;
  dishName: string;
  mealType: string;
}): string[] {
  const errors: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) errors.push('Некорректная дата меню');
  if (!Number.isInteger(input.dishId) || input.dishId <= 0) errors.push('Не выбрано блюдо');
  if (!input.dishName.trim()) errors.push('Название блюда обязательно');
  if (!input.mealType.trim()) errors.push('Не выбран приём пищи');
  return errors;
}

export interface PropertyLocationLike {
  id: string;
  locationName: string;
  responsiblePerson: string;
  quantity: number;
}

export interface PropertyItemLike {
  ID: number;
  TOTAL_QUANTITY: number;
  CONDITION: string;
  LOCATIONS: PropertyLocationLike[];
}

export function applyPropertyWriteOff<T extends PropertyItemLike>(
  item: T,
  locationName: string,
  quantity: number,
): T {
  const safeQuantity = Math.max(0, quantity);
  const locations = item.LOCATIONS.map(location =>
    location.locationName === locationName
      ? { ...location, quantity: Math.max(0, location.quantity - safeQuantity) }
      : location
  );
  const total = locations.reduce((sum, location) => sum + location.quantity, 0);

  return {
    ...item,
    LOCATIONS: locations,
    TOTAL_QUANTITY: total,
    CONDITION: total === 0 ? 'Підлягає списанню' : item.CONDITION,
  };
}

export function restorePropertyWriteOff<T extends PropertyItemLike>(
  item: T,
  locationName: string,
  responsiblePerson: string,
  quantity: number,
  locationId: string,
): T {
  const safeQuantity = Math.max(0, quantity);
  let found = false;
  const locations = item.LOCATIONS.map(location => {
    if (location.locationName !== locationName) return location;
    found = true;
    return { ...location, quantity: location.quantity + safeQuantity };
  });

  if (!found) {
    locations.push({
      id: locationId,
      locationName,
      responsiblePerson,
      quantity: safeQuantity,
    });
  }

  return {
    ...item,
    LOCATIONS: locations,
    TOTAL_QUANTITY: locations.reduce((sum, location) => sum + location.quantity, 0),
  };
}
