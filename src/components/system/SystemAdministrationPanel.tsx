import { SearchableSelect } from "../common/SearchableSelect";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive, CheckCircle2, CloudUpload, DatabaseBackup,
  Download, FileClock, History, LockKeyhole, RefreshCw, RotateCcw,
  ShieldCheck, UserCog, UserPlus,
} from 'lucide-react';
import {
  AppUser,
  ClosedPeriod,
  PERMISSION_LABELS,
  Permission,
  ROLE_LABELS,
  SyncState,
  UserRole,
  closePeriod,
  getArchive,
  getAuditLog,
  getClosedPeriods,
  getCloudCurrentUser,
  getCurrentUser,
  getPendingSyncCount,
  getRolePermissions,
  getSyncState,
  getUsers,
  hasPermission,
  reopenPeriod,
  saveUser,
  setCurrentUser,
  subscribeGovernance,
} from '../../services/governance';
import {
  CURRENT_DATABASE_SCHEMA_VERSION,
  createSystemBackup,
  downloadBackup,
  getDatabaseSchemaVersion,
  listSystemBackups,
  restoreArchivedRecord,
  restoreSystemBackup,
} from '../../services/db';
import { AutonomousSyncPanel } from './AutonomousSyncPanel';

type Section = 'roles' | 'audit' | 'backup' | 'sync' | 'archive' | 'periods';

const SECTION_ITEMS = [
  { id: 'roles' as const, label: 'Ролі', icon: UserCog },
  { id: 'audit' as const, label: 'Журнал', icon: History },
  { id: 'backup' as const, label: 'Резервне копіювання', icon: DatabaseBackup },
  { id: 'sync' as const, label: 'Синхронізація', icon: CloudUpload },
  { id: 'archive' as const, label: 'Архів', icon: Archive },
  { id: 'periods' as const, label: 'Закриті періоди', icon: LockKeyhole },
];

const ALL_ROLES = Object.keys(ROLE_LABELS) as UserRole[];
const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as Permission[];

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('uk-UA');
}

export const SystemAdministrationPanel: React.FC = () => {
  const [section, setSection] = useState<Section>('roles');
  const [revision, setRevision] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [backups, setBackups] = useState<Array<{
    id: string;
    createdAt: string;
    size: number;
    trigger: string;
    verified: boolean;
  }>>([]);
  const [auditQuery, setAuditQuery] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('nurse');
  const [periodForm, setPeriodForm] = useState({
    startDate: new Date().toISOString().slice(0, 8) + '01',
    endDate: new Date().toISOString().slice(0, 10),
    reason: 'Місяць закрито після перевірки документів',
  });
  const [syncForm, setSyncForm] = useState<SyncState>(() => getSyncState());

  const refresh = useCallback(() => {
    setRevision(value => value + 1);
    setSyncForm(getSyncState());
    listSystemBackups().then(setBackups).catch(() => setBackups([]));
  }, []);

  useEffect(() => {
    refresh();
    return subscribeGovernance(refresh);
  }, [refresh]);

  const users = useMemo(() => getUsers(), [revision]);
  const currentUser = useMemo(() => getCurrentUser(), [revision]);
  const cloudIdentity = useMemo(() => getCloudCurrentUser(), [revision]);
  const audit = useMemo(() => getAuditLog(), [revision]);
  const archive = useMemo(() => getArchive(), [revision]);
  const periods = useMemo(() => getClosedPeriods(), [revision]);
  const pendingCount = useMemo(() => getPendingSyncCount(), [revision]);
  const canManageUsers = hasPermission('users.manage');
  const canReadAudit = hasPermission('audit.read');
  const canManageBackup = hasPermission('backup.manage');
  const canManagePeriods = hasPermission('periods.manage');

  const filteredAudit = useMemo(() => {
    const query = auditQuery.trim().toLowerCase();
    if (!query) return audit.slice(0, 250);
    return audit.filter(entry =>
      `${entry.userName} ${entry.summary} ${entry.entityType}`.toLowerCase().includes(query)
    ).slice(0, 250);
  }, [audit, auditQuery]);

  const runAction = async (action: () => void | Promise<void>, success: string) => {
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(success);
      refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : String(actionError));
    }
  };

  const handleCreateBackup = () => runAction(async () => {
    const result = await createSystemBackup('manual');
    downloadBackup(result.envelope);
  }, 'Резервну копію створено, перевірено та збережено.');

  const handleRestoreFile = (file?: File) => {
    if (!file) return;
    runAction(async () => {
      const raw = await file.text();
      await restoreSystemBackup(raw);
    }, 'Резервну копію відновлено.');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-600 p-2.5 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Керування та безпека</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Користувач: {currentUser.displayName} · {ROLE_LABELS[currentUser.role]} · схема БД {getDatabaseSchemaVersion()}/{CURRENT_DATABASE_SCHEMA_VERSION}
              </p>
            </div>
          </div>
          <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${
            navigator.onLine
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
          }`}>
            {navigator.onLine ? 'Мережа доступна' : 'Автономний режим'} · {pendingCount} очікують синхронізації
          </div>
        </div>
      </div>

      {(message || error) && (
        <div className={`rounded-lg border px-4 py-2 text-xs font-semibold ${
          error
            ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
            : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
        }`}>
          {error || message}
        </div>
      )}

      <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800">
        {SECTION_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              data-testid={`system-section-${item.id}`}
              onClick={() => setSection(item.id)}
              className={`flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-[11px] font-bold ${
                section === item.id
                  ? 'border-indigo-600 bg-white text-indigo-700 dark:bg-slate-900 dark:text-indigo-300'
                  : 'border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {section === 'roles' && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h4 className="mb-2 font-black text-slate-800 dark:text-white">Поточний користувач</h4>
              {cloudIdentity ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                    <ShieldCheck className="h-4 w-4" /> Роль підтверджено Firebase
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                    {cloudIdentity.displayName} — {ROLE_LABELS[cloudIdentity.role]}
                  </p>
                  <p className="mt-2 text-[10px] text-slate-500">
                    Локальне перемикання ролей вимкнено до виходу з хмарного облікового запису.
                  </p>
                </div>
              ) : (
                <>
                  <p className="mb-3 text-[10px] text-amber-700 dark:text-amber-300">
                    Локальний автономний режим: користувача можна перемикати без пароля.
                  </p>
                  <SearchableSelect
                    data-testid="current-user-select"
                    value={currentUser.id}
                    onChange={event => runAction(
                      () => setCurrentUser(event.target.value),
                      'Поточного користувача змінено.',
                    )}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                  >
                    {users.filter(user => user.active).map(user => (
                      <option key={user.id} value={user.id}>
                        {user.displayName} — {ROLE_LABELS[user.role]}
                      </option>
                    ))}
                  </SearchableSelect>
                </>
              )}

              {!cloudIdentity && canManageUsers && (
                <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                  <input
                    value={newUserName}
                    onChange={event => setNewUserName(event.target.value)}
                    placeholder="ПІБ нового користувача"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                  <SearchableSelect
                    value={newUserRole}
                    onChange={event => setNewUserRole(event.target.value as UserRole)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                  >
                    {ALL_ROLES.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                  </SearchableSelect>
                  <button
                    onClick={() => runAction(() => {
                      if (!newUserName.trim()) throw new Error('Введіть ім’я користувача');
                      saveUser({ displayName: newUserName.trim(), role: newUserRole, active: true });
                      setNewUserName('');
                    }, 'Користувача створено.')}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 font-bold text-white hover:bg-indigo-700"
                  >
                    <UserPlus className="h-4 w-4" /> Додати користувача
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-[10px]">
                <thead className="bg-slate-100 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  <tr>
                    <th className="p-2 text-left">Дозвіл</th>
                    {ALL_ROLES.map(role => <th key={role} className="p-2 text-center">{ROLE_LABELS[role]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {ALL_PERMISSIONS.map(permission => (
                    <tr key={permission} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="p-2 font-semibold">{PERMISSION_LABELS[permission]}</td>
                      {ALL_ROLES.map(role => (
                        <td key={role} className="p-2 text-center">
                          {getRolePermissions(role).includes(permission)
                            ? <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-500" />
                            : <span className="text-slate-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {section === 'audit' && (
        <div className="space-y-3">
          {!canReadAudit ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">Ця роль не має доступу до журналу дій.</div>
          ) : (
            <>
              <input
                value={auditQuery}
                onChange={event => setAuditQuery(event.target.value)}
                placeholder="Пошук за користувачем, об’єктом або дією…"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
              />
              <div className="max-h-[480px] overflow-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                {filteredAudit.map(entry => (
                  <details key={entry.id} className="group border-b border-slate-100 last:border-0 dark:border-slate-800">
                    <summary className="grid cursor-pointer list-none gap-1 p-3 md:grid-cols-[150px_180px_1fr_90px]">
                      <span className="text-[10px] text-slate-500">{formatDate(entry.occurredAt)}</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{entry.userName}</span>
                      <span>{entry.summary}</span>
                      <span className={`text-right text-[10px] font-bold ${entry.syncStatus === 'synced' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {entry.syncStatus === 'synced' ? 'Синхр.' : 'Очікує'}
                      </span>
                    </summary>
                    <div className="grid gap-2 px-3 pb-3 md:grid-cols-2">
                      <div className="min-w-0 rounded-lg bg-slate-50 p-2 dark:bg-slate-950">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">До зміни</div>
                        <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-[10px] text-slate-600 dark:text-slate-300">{entry.before === undefined ? '—' : JSON.stringify(entry.before, null, 2)}</pre>
                      </div>
                      <div className="min-w-0 rounded-lg bg-slate-50 p-2 dark:bg-slate-950">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Після зміни</div>
                        <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-[10px] text-slate-600 dark:text-slate-300">{entry.after === undefined ? '—' : JSON.stringify(entry.after, null, 2)}</pre>
                      </div>
                    </div>
                  </details>
                ))}
                {filteredAudit.length === 0 && <div className="p-6 text-center text-slate-400">Записів поки немає.</div>}
              </div>
            </>
          )}
        </div>
      )}

      {section === 'backup' && (
        <div className="space-y-4">
          {!canManageBackup ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">Ця роль не має доступу до резервних копій.</div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <button data-testid="create-backup" onClick={handleCreateBackup} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700">
                  <Download className="h-4 w-4" /> Створити та перевірити копію
                </button>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700">
                  <RotateCcw className="h-4 w-4" /> Перевірити та відновити
                  <input
                    type="file"
                    accept=".json,.sadok-backup"
                    className="hidden"
                    onChange={event => handleRestoreFile(event.target.files?.[0])}
                  />
                </label>
              </div>
              <p className="text-[11px] text-slate-500">
                Автоматична копія створюється раз на день. Перед збереженням і відновленням виконується SQLite integrity_check та перевірка контрольної суми.
              </p>
              <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                {backups.map(backup => (
                  <div key={backup.id} className="flex items-center justify-between border-b border-slate-100 p-3 last:border-0 dark:border-slate-800">
                    <div>
                      <div className="font-bold">{formatDate(backup.createdAt)}</div>
                      <div className="text-[10px] text-slate-500">
                        {backup.trigger === 'automatic' ? 'Автоматична' : 'Ручна'} · {(backup.size / 1024).toFixed(1)} КБ
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" /> Перевірено
                    </span>
                  </div>
                ))}
                {backups.length === 0 && <div className="p-6 text-center text-slate-400">Резервних копій поки немає.</div>}
              </div>
            </>
          )}
        </div>
      )}

      {section === 'sync' && (
        <AutonomousSyncPanel
          pendingCount={pendingCount}
          syncState={syncForm}
          onSyncStateChange={setSyncForm}
          onRefresh={refresh}
        />
      )}

      {section === 'archive' && (
        <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          {archive.map(entry => (
            <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3 last:border-0 dark:border-slate-800">
              <div>
                <div className="font-bold">{entry.label}</div>
                <div className="text-[10px] text-slate-500">
                  {entry.entityType} · {formatDate(entry.archivedAt)} · {entry.archivedBy}
                </div>
              </div>
              {entry.restoredAt ? (
                <span className="text-[10px] font-bold text-emerald-600">Відновлено {formatDate(entry.restoredAt)}</span>
              ) : (
                <button
                  onClick={() => runAction(
                    () => restoreArchivedRecord(entry.id),
                    'Запис відновлено з архіву.',
                  )}
                  className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 font-bold text-white hover:bg-slate-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Відновити
                </button>
              )}
            </div>
          ))}
          {archive.length === 0 && <div className="p-6 text-center text-slate-400">Архів поки порожній.</div>}
        </div>
      )}

      {section === 'periods' && (
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h4 className="mb-3 flex items-center gap-2 font-black"><FileClock className="h-4 w-4" /> Закрити період</h4>
            <div className="space-y-2">
              <input type="date" value={periodForm.startDate} onChange={event => setPeriodForm(current => ({ ...current, startDate: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
              <input type="date" value={periodForm.endDate} onChange={event => setPeriodForm(current => ({ ...current, endDate: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
              <textarea value={periodForm.reason} onChange={event => setPeriodForm(current => ({ ...current, reason: event.target.value }))} rows={3} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
              <button
                disabled={!canManagePeriods}
                onClick={() => runAction(
                  () => { closePeriod(periodForm.startDate, periodForm.endDate, periodForm.reason); },
                  'Період закрито для змін.',
                )}
                className="w-full rounded-lg bg-rose-600 px-4 py-2 font-bold text-white hover:bg-rose-700 disabled:opacity-40"
              >
                Закрити період
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {periods.map((period: ClosedPeriod) => (
              <div key={period.id} className="flex items-center justify-between gap-3 border-b border-slate-100 p-3 last:border-0 dark:border-slate-800">
                <div>
                  <div className="font-bold">{period.startDate} — {period.endDate}</div>
                  <div className="text-[10px] text-slate-500">{period.reason} · {period.closedBy}</div>
                </div>
                {period.reopenedAt ? (
                  <span className="text-[10px] font-bold text-emerald-600">Повторно відкрито</span>
                ) : (
                  <button
                    disabled={!canManagePeriods}
                    onClick={() => runAction(() => reopenPeriod(period.id), 'Період повторно відкрито.')}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Відкрити
                  </button>
                )}
              </div>
            ))}
            {periods.length === 0 && <div className="p-6 text-center text-slate-400">Закритих періодів поки немає.</div>}
          </div>
        </div>
      )}
    </div>
  );
};
