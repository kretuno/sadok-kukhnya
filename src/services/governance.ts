import { isDateInClosedPeriod } from '../domain/operations';
import { scheduleDurableLocalState } from './durableStorage';

export type UserRole =
  | 'director'
  | 'nurse'
  | 'warehouse'
  | 'cook'
  | 'custodian'
  | 'admin';

export type Permission =
  | 'menu.write'
  | 'recipes.write'
  | 'products.write'
  | 'stock.write'
  | 'property.write'
  | 'registry.write'
  | 'settings.write'
  | 'audit.read'
  | 'backup.manage'
  | 'periods.manage'
  | 'users.manage';

export interface AppUser {
  id: string;
  displayName: string;
  role: UserRole;
  active: boolean;
}

export interface AuditEntry {
  id: string;
  occurredAt: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: 'create' | 'update' | 'archive' | 'restore' | 'backup' | 'period' | 'login';
  entityType: string;
  entityId?: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  deviceId: string;
  syncStatus: 'pending' | 'synced';
}

export interface ArchiveEntry {
  id: string;
  archivedAt: string;
  archivedBy: string;
  entityType: string;
  entityId: string;
  label: string;
  payload: unknown;
  restoredAt?: string;
  restoredBy?: string;
}

export interface ClosedPeriod {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  closedAt: string;
  closedBy: string;
  reopenedAt?: string;
  reopenedBy?: string;
}

export interface SyncState {
  mode: 'local-only' | 'firebase';
  endpoint: string;
  lastSuccessfulSync: string | null;
  lastAttempt: string | null;
  lastError: string | null;
}

export class GovernanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GovernanceError';
  }
}

export const ROLE_LABELS: Record<UserRole, string> = {
  director: 'Директор',
  nurse: 'Медична сестра',
  warehouse: 'Комірник',
  cook: 'Кухар',
  custodian: 'Завідувач господарства',
  admin: 'Адміністратор',
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  'menu.write': 'Меню',
  'recipes.write': 'Рецептури',
  'products.write': 'Продукти',
  'stock.write': 'Склад',
  'property.write': 'Майно',
  'registry.write': 'Контингент і кадри',
  'settings.write': 'Налаштування закладу',
  'audit.read': 'Журнал дій',
  'backup.manage': 'Резервні копії',
  'periods.manage': 'Закриття періодів',
  'users.manage': 'Користувачі та ролі',
};

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: Object.keys(PERMISSION_LABELS) as Permission[],
  director: [
    'menu.write', 'recipes.write', 'products.write', 'stock.write',
    'property.write', 'registry.write', 'settings.write', 'audit.read',
    'backup.manage', 'periods.manage',
  ],
  nurse: ['menu.write', 'recipes.write', 'products.write', 'registry.write'],
  warehouse: ['products.write', 'stock.write'],
  cook: ['menu.write', 'recipes.write'],
  custodian: ['property.write', 'registry.write'],
};

const USERS_KEY = 'sadok_governance_users_v1';
const CURRENT_USER_KEY = 'sadok_current_user_id';
const AUDIT_KEY = 'sadok_audit_log_v1';
const ARCHIVE_KEY = 'sadok_archive_v1';
const PERIODS_KEY = 'sadok_closed_periods_v1';
const SYNC_KEY = 'sadok_sync_state_v1';
const DEVICE_KEY = 'sadok_device_id';
const CLOUD_USER_KEY = 'sadok_cloud_current_user_v1';
const CHANGE_EVENT = 'sadok-governance-change';

const DEFAULT_USERS: AppUser[] = [
  { id: 'admin-default', displayName: 'Администратор SADOK', role: 'admin', active: true },
  { id: 'director-default', displayName: 'Директор', role: 'director', active: true },
  { id: 'nurse-default', displayName: 'Медсестра', role: 'nurse', active: true },
  { id: 'warehouse-default', displayName: 'Кладовщик', role: 'warehouse', active: true },
  { id: 'cook-default', displayName: 'Повар', role: 'cook', active: true },
  { id: 'custodian-default', displayName: 'Завхоз', role: 'custodian', active: true },
];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
  scheduleDurableLocalState();
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

function makeId(prefix: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = makeId('device');
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function getUsers(): AppUser[] {
  const users = readJson<AppUser[]>(USERS_KEY, []);
  if (users.length > 0) return users;
  writeJson(USERS_KEY, DEFAULT_USERS);
  return DEFAULT_USERS;
}

export function saveUser(user: Omit<AppUser, 'id'> & { id?: string }): AppUser {
  const users = getUsers();
  const saved: AppUser = { ...user, id: user.id || makeId('user') };
  const next = users.some(item => item.id === saved.id)
    ? users.map(item => item.id === saved.id ? saved : item)
    : [...users, saved];
  writeJson(USERS_KEY, next);
  recordAudit({
    action: user.id ? 'update' : 'create',
    entityType: 'user',
    entityId: saved.id,
    summary: `${user.id ? 'Змінено' : 'Створено'} користувача «${saved.displayName}»`,
    after: saved,
  });
  return saved;
}

export function getCurrentUser(): AppUser {
  const cloudUser = getCloudCurrentUser();
  if (cloudUser) return cloudUser;
  const users = getUsers();
  const selectedId = localStorage.getItem(CURRENT_USER_KEY);
  return users.find(user => user.id === selectedId && user.active)
    || users.find(user => user.role === 'admin' && user.active)
    || users[0];
}

export function getCloudCurrentUser(): AppUser | null {
  const user = readJson<AppUser | null>(CLOUD_USER_KEY, null);
  return user?.active ? user : null;
}

export function setCloudCurrentUser(user: AppUser, recordLogin = false): void {
  writeJson(CLOUD_USER_KEY, user);
  if (recordLogin) {
    recordAudit({
      action: 'login',
      entityType: 'session',
      entityId: user.id,
      summary: `Вхід через Firebase: «${user.displayName}» (${ROLE_LABELS[user.role]})`,
    });
  }
}

export function clearCloudCurrentUser(): void {
  localStorage.removeItem(CLOUD_USER_KEY);
  scheduleDurableLocalState();
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function setCurrentUser(userId: string) {
  if (getCloudCurrentUser()) {
    throw new GovernanceError('Роль визначається обліковим записом Firebase. Спочатку вийдіть із хмарного облікового запису.');
  }
  const user = getUsers().find(item => item.id === userId && item.active);
  if (!user) throw new Error('Користувача не знайдено або вимкнено');
  localStorage.setItem(CURRENT_USER_KEY, user.id);
  recordAudit({
    action: 'login',
    entityType: 'session',
    entityId: user.id,
    summary: `Вибрано користувача «${user.displayName}»`,
  });
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(permission: Permission): boolean {
  return getRolePermissions(getCurrentUser().role).includes(permission);
}

export function requirePermission(permission: Permission) {
  if (!hasPermission(permission)) {
    throw new GovernanceError(`Недостаточно прав: ${PERMISSION_LABELS[permission]}`);
  }
}

export function recordAudit(input: Omit<AuditEntry,
  'id' | 'occurredAt' | 'userId' | 'userName' | 'role' | 'deviceId' | 'syncStatus'
>): AuditEntry {
  const user = getCurrentUser();
  const entry: AuditEntry = {
    ...input,
    id: makeId('audit'),
    occurredAt: new Date().toISOString(),
    userId: user.id,
    userName: user.displayName,
    role: user.role,
    deviceId: getDeviceId(),
    syncStatus: 'pending',
  };
  const log = readJson<AuditEntry[]>(AUDIT_KEY, []);
  writeJson(AUDIT_KEY, [entry, ...log].slice(0, 5000));
  return entry;
}

export function getAuditLog(): AuditEntry[] {
  return readJson<AuditEntry[]>(AUDIT_KEY, []);
}

export function archiveRecord(input: Omit<ArchiveEntry,
  'id' | 'archivedAt' | 'archivedBy'
>): ArchiveEntry {
  const user = getCurrentUser();
  const entry: ArchiveEntry = {
    ...input,
    id: makeId('archive'),
    archivedAt: new Date().toISOString(),
    archivedBy: user.displayName,
  };
  writeJson(ARCHIVE_KEY, [entry, ...getArchive()]);
  recordAudit({
    action: 'archive',
    entityType: input.entityType,
    entityId: input.entityId,
    summary: `Переміщено до архіву: ${input.label}`,
    before: input.payload,
  });
  return entry;
}

export function getArchive(): ArchiveEntry[] {
  return readJson<ArchiveEntry[]>(ARCHIVE_KEY, []);
}

export function getArchiveEntry(id: string): ArchiveEntry | undefined {
  return getArchive().find(entry => entry.id === id);
}

export function markArchiveRestored(id: string) {
  const user = getCurrentUser();
  const entries = getArchive();
  const target = entries.find(entry => entry.id === id);
  if (!target) return;
  writeJson(ARCHIVE_KEY, entries.map(entry => entry.id === id ? {
    ...entry,
    restoredAt: new Date().toISOString(),
    restoredBy: user.displayName,
  } : entry));
  recordAudit({
    action: 'restore',
    entityType: target.entityType,
    entityId: target.entityId,
    summary: `Відновлено з архіву: ${target.label}`,
    after: target.payload,
  });
}

export function getClosedPeriods(): ClosedPeriod[] {
  return readJson<ClosedPeriod[]>(PERIODS_KEY, []);
}

export function closePeriod(startDate: string, endDate: string, reason: string): ClosedPeriod {
  requirePermission('periods.manage');
  if (!startDate || !endDate || startDate > endDate) {
    throw new Error('Некоректний діапазон періоду для закриття');
  }
  const user = getCurrentUser();
  const period: ClosedPeriod = {
    id: makeId('period'),
    startDate,
    endDate,
    reason: reason.trim() || 'Період закрито',
    closedAt: new Date().toISOString(),
    closedBy: user.displayName,
  };
  writeJson(PERIODS_KEY, [period, ...getClosedPeriods()]);
  recordAudit({
    action: 'period',
    entityType: 'closed_period',
    entityId: period.id,
    summary: `Закрито період ${startDate} — ${endDate}: ${period.reason}`,
    after: period,
  });
  return period;
}

export function reopenPeriod(id: string) {
  requirePermission('periods.manage');
  const user = getCurrentUser();
  const periods = getClosedPeriods();
  const target = periods.find(period => period.id === id);
  if (!target) return;
  writeJson(PERIODS_KEY, periods.map(period => period.id === id ? {
    ...period,
    reopenedAt: new Date().toISOString(),
    reopenedBy: user.displayName,
  } : period));
  recordAudit({
    action: 'period',
    entityType: 'closed_period',
    entityId: id,
    summary: `Період ${target.startDate} — ${target.endDate} повторно відкрито`,
    before: target,
  });
}

export function assertDateOpen(date: string) {
  if (isDateInClosedPeriod(date, getClosedPeriods())) {
    throw new GovernanceError(`Період для дати ${date} закрито. Зміни заборонені.`);
  }
}

export function getSyncState(): SyncState {
  const stored = readJson<Omit<SyncState, 'mode'> & { mode: SyncState['mode'] | 'server' }>(SYNC_KEY, {
    mode: 'local-only',
    endpoint: '',
    lastSuccessfulSync: null,
    lastAttempt: null,
    lastError: null,
  });
  return {
    ...stored,
    mode: stored.mode === 'server' ? 'local-only' : stored.mode,
  };
}

export function saveSyncState(state: SyncState) {
  writeJson(SYNC_KEY, state);
}

export function getPendingSyncCount(): number {
  return getAuditLog().filter(entry => entry.syncStatus === 'pending').length;
}

export function getPendingAuditEntries(): AuditEntry[] {
  return getAuditLog().filter(entry => entry.syncStatus === 'pending');
}

export function markAuditEntriesSynced(ids: string[]) {
  const syncedIds = new Set(ids);
  writeJson(AUDIT_KEY, getAuditLog().map(entry => (
    syncedIds.has(entry.id) ? { ...entry, syncStatus: 'synced' as const } : entry
  )));
}

export function markAllChangesSynced() {
  const now = new Date().toISOString();
  writeJson(AUDIT_KEY, getAuditLog().map(entry => ({ ...entry, syncStatus: 'synced' })));
  saveSyncState({
    ...getSyncState(),
    lastAttempt: now,
    lastSuccessfulSync: now,
    lastError: null,
  });
}

export function subscribeGovernance(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
}

export function getGovernanceStorageKeys(): string[] {
  return [
    USERS_KEY, CURRENT_USER_KEY, AUDIT_KEY, ARCHIVE_KEY,
    PERIODS_KEY, SYNC_KEY, DEVICE_KEY, CLOUD_USER_KEY,
  ];
}
