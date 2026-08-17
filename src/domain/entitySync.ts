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
    supplier: 2,
    recipe_component: 3,
    dish_nutrition_profile: 4,
    invoice: 4,
    menu_entry: 4,
    stock_batch: 5,
    menu_approval: 5,
  };
  const order = normalOrder[entityType] || 99;
  return deleted ? 100 - order : order;
}

export function findStaleBootstrapSyncIds(
  local: Array<{ syncId: string; revision: number }>,
  remoteSyncIds: Iterable<string>,
  protectedSyncIds: Iterable<string>,
): string[] {
  const remote = new Set(remoteSyncIds);
  const protectedIds = new Set(protectedSyncIds);
  return local
    .filter(entity => entity.revision === 0)
    .filter(entity => !remote.has(entity.syncId) && !protectedIds.has(entity.syncId))
    .map(entity => entity.syncId);
}
