import { describe, expect, it } from 'vitest';
import { ensureAuditSyncScope } from './governance';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    values,
  };
}

describe('audit synchronization scope', () => {
  it('keeps legacy audit locally but prevents uploading it into the first cloud organization', () => {
    const storage = memoryStorage({
      sadok_audit_log_v1: JSON.stringify([{ id: 'legacy', syncStatus: 'pending' }]),
    });
    expect(ensureAuditSyncScope('project-1/org-1', storage)).toBe('initialized');
    expect(JSON.parse(storage.values.get('sadok_audit_log_v1') || '[]')[0].syncStatus).toBe('synced');
    expect(storage.values.get('sadok_audit_sync_scope_v1')).toBe('project-1/org-1');
  });

  it('blocks a scope change while scoped audit events are pending', () => {
    const storage = memoryStorage({
      sadok_audit_sync_scope_v1: 'project-1/org-1',
      sadok_audit_log_v1: JSON.stringify([{ id: 'pending', syncStatus: 'pending' }]),
    });
    expect(() => ensureAuditSyncScope('project-2/org-2', storage)).toThrow('журналу');
  });
});
