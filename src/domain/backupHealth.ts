export type BackupHealthState = 'fresh' | 'warning' | 'critical' | 'missing';

export interface BackupHealth {
  state: BackupHealthState;
  ageDays: number | null;
  label: string;
}

export function getBackupHealth(lastBackupAt?: string | null, now = new Date()): BackupHealth {
  if (!lastBackupAt) return { state: 'missing', ageDays: null, label: 'Копій ще немає' };
  const timestamp = new Date(lastBackupAt).getTime();
  if (!Number.isFinite(timestamp)) return { state: 'missing', ageDays: null, label: 'Дата копії невідома' };
  const ageDays = Math.max(0, Math.floor((now.getTime() - timestamp) / 86_400_000));
  if (ageDays >= 3) return { state: 'critical', ageDays, label: `Копія застаріла: ${ageDays} дн.` };
  if (ageDays >= 1) return { state: 'warning', ageDays, label: ageDays === 1 ? 'Копія створена вчора' : `Копії ${ageDays} дн.` };
  return { state: 'fresh', ageDays, label: 'Сьогоднішня копія готова' };
}
