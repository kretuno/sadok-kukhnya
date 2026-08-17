export function hasEntityRevisionConflict(input: {
  baseRevision: number;
  remoteRevision: number;
  localDeviceId: string;
  remoteDeviceId: string;
}): boolean {
  return input.remoteRevision > input.baseRevision
    && Boolean(input.remoteDeviceId)
    && input.remoteDeviceId !== input.localDeviceId;
}

export function entityTypeOrder(entityType: string, deleted = false): number {
  const normalOrder: Record<string, number> = {
    product: 1,
    dish: 2,
    recipe_component: 3,
    dish_nutrition_profile: 4,
  };
  const order = normalOrder[entityType] || 99;
  return deleted ? 100 - order : order;
}
