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
    group: 1,
    employee: 2,
    child: 3,
    product: 4,
    dish: 5,
    supplier: 5,
    recipe_component: 6,
    dish_nutrition_profile: 7,
    invoice: 7,
    menu_entry: 7,
    stock_batch: 8,
    menu_approval: 8,
    property_item: 9,
    property_writeoff: 10,
    psychology_adaptation: 11,
    psychology_readiness: 12,
    psychology_consultation: 13,
    psychology_report: 14,
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
