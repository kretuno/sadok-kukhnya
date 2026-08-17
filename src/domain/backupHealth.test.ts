import { describe, expect, it } from 'vitest';
import { getBackupHealth } from './backupHealth';

describe('getBackupHealth', () => {
  const now = new Date('2026-08-17T12:00:00.000Z');

  it('reports a fresh backup from today', () => {
    expect(getBackupHealth('2026-08-17T08:00:00.000Z', now).state).toBe('fresh');
  });

  it('warns after one day and becomes critical after three days', () => {
    expect(getBackupHealth('2026-08-16T08:00:00.000Z', now).state).toBe('warning');
    expect(getBackupHealth('2026-08-14T08:00:00.000Z', now).state).toBe('critical');
  });

  it('reports a missing backup', () => {
    expect(getBackupHealth(null, now).state).toBe('missing');
  });
});
