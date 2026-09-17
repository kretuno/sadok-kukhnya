import { describe, expect, it } from 'vitest';
import { ensureEntitySyncScope, resetEntityBootstrapState } from './entitySyncQueue';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    values,
  };
}

describe('entity bootstrap state', () => {
  it('clears every local bootstrap marker before an authoritative first sync', () => {
    const removed: string[] = [];
    resetEntityBootstrapState({ removeItem: key => removed.push(key) });
    expect(removed).toEqual([
      'sadok_entity_sync_bootstrap_v1',
      'sadok_operational_sync_bootstrap_v1',
      'sadok_structure_sync_bootstrap_v1',
      'sadok_entity_sync_cursor_v1',
    ]);
  });

  it('resets completed synchronization metadata when the cloud scope changes', () => {
    const storage = memoryStorage({
      sadok_entity_sync_scope_v1: 'project-1/org-1',
      sadok_entity_sync_queue_v1: '[]',
      sadok_entity_sync_bootstrap_v1: 'complete',
      sadok_entity_sync_cursor_v1: '2026-01-01',
    });
    expect(ensureEntitySyncScope('project-2/org-2', storage)).toBe('reset');
    expect(storage.values.get('sadok_entity_sync_scope_v1')).toBe('project-2/org-2');
    expect(storage.values.has('sadok_entity_sync_bootstrap_v1')).toBe(false);
    expect(storage.values.has('sadok_entity_sync_cursor_v1')).toBe(false);
  });

  it('clears unscoped legacy queue and bootstrap state before assigning the first cloud scope', () => {
    const storage = memoryStorage({
      sadok_entity_sync_queue_v1: '[{"id":"legacy-pending"}]',
      sadok_entity_sync_bootstrap_v1: 'complete',
      sadok_entity_sync_cursor_v1: '2026-01-01',
    });
    expect(ensureEntitySyncScope('project-1/org-1', storage)).toBe('initialized');
    expect(storage.values.get('sadok_entity_sync_scope_v1')).toBe('project-1/org-1');
    expect(storage.values.has('sadok_entity_sync_queue_v1')).toBe(false);
    expect(storage.values.has('sadok_entity_sync_bootstrap_v1')).toBe(false);
    expect(storage.values.has('sadok_entity_sync_cursor_v1')).toBe(false);
  });

  it('refuses to change cloud scope while unsent mutations exist', () => {
    const storage = memoryStorage({
      sadok_entity_sync_scope_v1: 'project-1/org-1',
      sadok_entity_sync_queue_v1: '[{"id":"pending-1"}]',
    });
    expect(() => ensureEntitySyncScope('project-2/org-2', storage)).toThrow('невідправлені');
    expect(storage.values.get('sadok_entity_sync_scope_v1')).toBe('project-1/org-1');
  });
});
