import { describe, expect, it } from 'vitest';
import { entityTypeOrder, findStaleBootstrapSyncIds, hasEntityRevisionConflict } from './entitySync';

describe('entity synchronization conflict rules', () => {
  it('detects a newer revision written by another device', () => {
    expect(hasEntityRevisionConflict({
      baseRevision: 2,
      remoteRevision: 3,
      localDeviceId: 'device-a',
      remoteDeviceId: 'device-b',
    })).toBe(true);
  });

  it('allows consecutive local mutations from the same device', () => {
    expect(hasEntityRevisionConflict({
      baseRevision: 2,
      remoteRevision: 3,
      localDeviceId: 'device-a',
      remoteDeviceId: 'device-a',
    })).toBe(false);
  });

  it('orders dependencies before recipe components and reverses deletes', () => {
    expect(entityTypeOrder('product')).toBeLessThan(entityTypeOrder('recipe_component'));
    expect(entityTypeOrder('recipe_component', true)).toBeLessThan(entityTypeOrder('product', true));
  });

  it('removes only untouched seed records absent from the authoritative cloud snapshot', () => {
    expect(findStaleBootstrapSyncIds([
      { syncId: 'keep-remote', revision: 0 },
      { syncId: 'remove-seed', revision: 0 },
      { syncId: 'keep-pending', revision: 0 },
      { syncId: 'keep-synced', revision: 2 },
    ], ['keep-remote'], ['keep-pending'])).toEqual(['remove-seed']);
  });
});
