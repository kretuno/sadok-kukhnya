import { describe, expect, it } from 'vitest';
import { classifyDeviceActivity, formatActivityAge } from './systemHealth';

describe('system device health', () => {
  const now = new Date('2026-08-17T12:00:00.000Z').getTime();

  it('classifies active and recently connected devices', () => {
    expect(classifyDeviceActivity('2026-08-17T11:50:00.000Z', now)).toBe('online');
    expect(classifyDeviceActivity('2026-08-17T10:00:00.000Z', now)).toBe('recent');
  });

  it('raises attention after one day and stale after one week', () => {
    expect(classifyDeviceActivity('2026-08-15T12:00:00.000Z', now)).toBe('attention');
    expect(classifyDeviceActivity('2026-08-01T12:00:00.000Z', now)).toBe('stale');
  });

  it('formats readable relative activity age', () => {
    expect(formatActivityAge('2026-08-17T11:52:00.000Z', now)).toBe('8 хв тому');
    expect(formatActivityAge('2026-08-14T12:00:00.000Z', now)).toBe('3 дн тому');
  });
});
