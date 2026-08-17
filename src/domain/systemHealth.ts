export type DeviceActivityState = 'online' | 'recent' | 'attention' | 'stale' | 'unknown';

export function classifyDeviceActivity(lastSeenAt?: string, now = Date.now()): DeviceActivityState {
  if (!lastSeenAt) return 'unknown';
  const seenAt = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(seenAt)) return 'unknown';
  const ageMinutes = Math.max(0, (now - seenAt) / 60000);
  if (ageMinutes <= 15) return 'online';
  if (ageMinutes <= 24 * 60) return 'recent';
  if (ageMinutes <= 7 * 24 * 60) return 'attention';
  return 'stale';
}

export function formatActivityAge(lastSeenAt?: string, now = Date.now()): string {
  if (!lastSeenAt) return 'ще не підключався';
  const seenAt = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(seenAt)) return 'час невідомий';
  const ageMinutes = Math.max(0, Math.floor((now - seenAt) / 60000));
  if (ageMinutes < 1) return 'щойно';
  if (ageMinutes < 60) return `${ageMinutes} хв тому`;
  const ageHours = Math.floor(ageMinutes / 60);
  if (ageHours < 24) return `${ageHours} год тому`;
  const ageDays = Math.floor(ageHours / 24);
  return `${ageDays} дн тому`;
}
