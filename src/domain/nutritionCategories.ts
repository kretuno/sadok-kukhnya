export const EATER_CATEGORIES = [
  { id: 1, key: 'nursery', name: 'Ясла (1–3 роки)', defaultCount: 45, yieldFactor: 0.85 },
  { id: 2, key: 'junior', name: 'Молодша група (3–4 роки)', defaultCount: 40, yieldFactor: 0.95 },
  { id: 3, key: 'preschool', name: 'Садок (4–7 років)', defaultCount: 45, yieldFactor: 1 },
  { id: 4, key: 'staff', name: 'Співробітники', defaultCount: 12, yieldFactor: 1.25 },
] as const;

export const DEFAULT_EATER_COUNTS: Record<number, number> = Object.fromEntries(
  EATER_CATEGORIES.map(category => [category.id, category.defaultCount]),
);

export function getDefaultDishYield(baseYield: number, categoryId: number): number {
  const category = EATER_CATEGORIES.find(item => item.id === categoryId);
  return Math.round(baseYield * (category?.yieldFactor ?? 1));
}
