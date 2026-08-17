import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, CloudOff, CloudUpload, Download, HardDrive,
  Loader2, LogIn, LogOut, ShieldCheck, Wifi, WifiOff,
} from 'lucide-react';
import { SearchableSelect } from '../common/SearchableSelect';
import type { SyncState } from '../../services/governance';
import { saveSyncState } from '../../services/governance';
import {
  ensurePersistentBrowserStorage,
  type StorageDurabilityStatus,
} from '../../services/durableStorage';
import {
  canInstallApplication,
  installApplication,
  isApplicationInstalled,
  isServiceWorkerActive,
  OFFLINE_READY_EVENT,
} from '../../services/offlineSupport';
import {
  getFirebaseCapability,
  getFirebaseUser,
  signInToFirebase,
  signOutFromFirebase,
  resolveEntitySyncConflict,
  synchronizeAllPending,
} from '../../services/firebaseSync';
import {
  getEntitySyncConflicts,
  getPendingEntityMutationCount,
  isEntityBootstrapComplete,
  isOperationalBootstrapComplete,
  subscribeEntitySyncState,
} from '../../services/entitySyncQueue';

interface AutonomousSyncPanelProps {
  pendingCount: number;
  syncState: SyncState;
  onSyncStateChange: (state: SyncState) => void;
  onRefresh: () => void;
}

function formatDate(value?: string | null): string {
  return value ? new Date(value).toLocaleString('uk-UA') : '—';
}

function formatBytes(value: number): string {
  if (!value) return '—';
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} КБ`;
  return `${(value / 1024 / 1024).toFixed(1)} МБ`;
}

export const AutonomousSyncPanel: React.FC<AutonomousSyncPanelProps> = ({
  pendingCount,
  syncState,
  onSyncStateChange,
  onRefresh,
}) => {
  const capability = getFirebaseCapability();
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [storage, setStorage] = useState<StorageDurabilityStatus | null>(null);
  const [installed, setInstalled] = useState(() => isApplicationInstalled());
  const [installAvailable, setInstallAvailable] = useState(() => canInstallApplication());
  const [workerActive, setWorkerActive] = useState(() => isServiceWorkerActive());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cloudUser, setCloudUser] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [entityRevision, setEntityRevision] = useState(0);

  const refreshReadiness = useCallback(() => {
    setInstalled(isApplicationInstalled());
    setInstallAvailable(canInstallApplication());
    setWorkerActive(isServiceWorkerActive());
    void ensurePersistentBrowserStorage().then(setStorage).catch(() => {
      setStorage({ supported: false, persisted: false, usageBytes: 0, quotaBytes: 0 });
    });
  }, []);

  useEffect(() => {
    const updateNetwork = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    window.addEventListener(OFFLINE_READY_EVENT, refreshReadiness);
    refreshReadiness();

    if (capability.configured) {
      void getFirebaseUser().then(user => setCloudUser(user?.email || user?.uid || '')).catch(() => undefined);
    }
    return () => {
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
      window.removeEventListener(OFFLINE_READY_EVENT, refreshReadiness);
    };
  }, [capability.configured, refreshReadiness]);

  useEffect(() => subscribeEntitySyncState(() => {
    setEntityRevision(value => value + 1);
  }), []);

  const pendingEntities = getPendingEntityMutationCount();
  const conflicts = getEntitySyncConflicts();
  const bootstrapComplete = isEntityBootstrapComplete();
  const operationalBootstrapComplete = isOperationalBootstrapComplete();
  void entityRevision;

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      setMessage(await action());
      onRefresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : String(actionError));
    } finally {
      setBusy(false);
    }
  };

  const readinessRows = [
    { label: 'Локальний SQLite', ready: true, detail: 'IndexedDB' },
    { label: 'Офлайн-пакет', ready: workerActive, detail: workerActive ? 'кеш активний' : 'активується після оновлення' },
    { label: 'Захищене сховище', ready: Boolean(storage?.persisted), detail: storage?.persisted ? 'браузер не очищатиме автоматично' : 'залежить від дозволу браузера' },
    { label: 'Встановлення на пристрій', ready: installed, detail: installed ? 'встановлено' : 'доступне як PWA' },
  ];

  return (
    <div className="space-y-4">
      {(message || error) && (
        <div className={`rounded-lg border px-4 py-2 text-xs font-semibold ${
          error
            ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
            : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
        }`}>
          {error || message}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <HardDrive className="h-6 w-6 text-indigo-600" />
              <div>
                <h4 className="font-black">Автономна готовність</h4>
                <p className="text-[10px] text-slate-500">Основна робота не залежить від хмарного сервера</p>
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
              isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {isOnline ? 'Онлайн' : 'Без інтернету'}
            </span>
          </div>

          <div className="space-y-2">
            {readinessRows.map(row => (
              <div key={row.label} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950">
                <span className="flex items-center gap-2 text-[11px] font-semibold">
                  {row.ready
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    : <CloudOff className="h-4 w-4 text-amber-500" />}
                  {row.label}
                </span>
                <span className="text-right text-[10px] text-slate-500">{row.detail}</span>
              </div>
            ))}
          </div>

          {storage && (
            <p className="mt-3 text-[10px] text-slate-500">
              Зайнято {formatBytes(storage.usageBytes)} із доступних {formatBytes(storage.quotaBytes)}.
            </p>
          )}

          {!installed && installAvailable && (
            <button
              data-testid="install-offline-app"
              onClick={() => run(async () => (
                await installApplication() ? 'SADOK встановлено на пристрій.' : 'Встановлення скасовано.'
              ))}
              className="mt-3 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
            >
              <Download className="h-4 w-4" /> Встановити SADOK на цей пристрій
            </button>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-3">
            {isOnline ? <Wifi className="h-6 w-6 text-emerald-500" /> : <WifiOff className="h-6 w-6 text-amber-500" />}
            <div>
              <h4 className="font-black">Локальна черга змін</h4>
              <p className="text-[10px] text-slate-500">Накопичується незалежно від стану мережі</p>
            </div>
          </div>
          <dl className="space-y-2 text-[11px]">
            <div className="flex justify-between"><dt>Записи журналу</dt><dd className="font-bold text-amber-600">{pendingCount}</dd></div>
            <div className="flex justify-between"><dt>Зміни даних у черзі</dt><dd className="font-bold text-blue-600">{pendingEntities}</dd></div>
            <div className="flex justify-between"><dt>Каталоги й техкарти</dt><dd className={`font-bold ${bootstrapComplete ? 'text-emerald-600' : 'text-amber-600'}`}>{bootstrapComplete ? 'копія готова' : 'очікує'}</dd></div>
            <div className="flex justify-between"><dt>Меню та склад</dt><dd className={`font-bold ${operationalBootstrapComplete ? 'text-emerald-600' : 'text-amber-600'}`}>{operationalBootstrapComplete ? 'копія готова' : 'очікує'}</dd></div>
            <div className="flex justify-between"><dt>Конфлікти редагування</dt><dd className="font-bold text-rose-600">{conflicts.length}</dd></div>
            <div className="flex justify-between"><dt>Остання синхронізація</dt><dd className="font-bold">{formatDate(syncState.lastSuccessfulSync)}</dd></div>
            <div className="flex justify-between"><dt>Остання помилка</dt><dd className="max-w-[60%] text-right font-bold text-rose-600">{syncState.lastError || '—'}</dd></div>
          </dl>
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-[10px] text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
            Вимкнення світла або інтернету не блокує введення даних. Після відновлення зв’язку черга залишається на пристрої та може бути відправлена повторно.
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
            <div>
              <h4 className="font-black">Firebase — додатковий канал синхронізації</h4>
              <p className="text-[10px] text-slate-500">
                {capability.configured
                  ? `Проєкт: ${capability.projectId} · заклад: ${capability.organizationId}`
                  : 'Код і правила готові; проєкт закладу ще не підключено'}
              </p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${
            capability.configured ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
          }`}>
            {capability.configured ? 'Налаштовано' : 'Очікує конфігурацію'}
          </span>
        </div>

        <SearchableSelect
          value={syncState.mode}
          onChange={event => onSyncStateChange({ ...syncState, mode: event.target.value as SyncState['mode'] })}
          className="mb-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
        >
          <option value="local-only">Лише автономна робота</option>
          <option value="firebase" disabled={!capability.configured}>Автономно + Firebase</option>
        </SearchableSelect>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => run(async () => {
              const next = capability.configured ? syncState : { ...syncState, mode: 'local-only' as const };
              saveSyncState(next);
              onSyncStateChange(next);
              return 'Режим роботи збережено.';
            })}
            className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700"
          >
            {syncState.mode === 'firebase' ? <CloudUpload className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
            Зберегти режим
          </button>
        </div>

        {capability.configured && (
          <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            {cloudUser ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-semibold">Підключено: {cloudUser}</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy || !isOnline || syncState.mode !== 'firebase'}
                    onClick={() => run(async () => {
                      const result = await synchronizeAllPending();
                      const uploaded = result.auditUploaded + result.entitiesUploaded + result.bootstrapped;
                      return `Готово: відправлено ${uploaded}, отримано ${result.entitiesDownloaded}, конфліктів ${result.conflicts}.`;
                    })}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
                    Синхронізувати зараз
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => run(async () => {
                      await signOutFromFirebase();
                      setCloudUser('');
                      return 'Вихід із Firebase виконано.';
                    })}
                    className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold"
                  >
                    <LogOut className="h-4 w-4" /> Вийти
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                <input
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="Електронна пошта"
                  autoComplete="username"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
                <input
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="Пароль"
                  autoComplete="current-password"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
                <button
                  disabled={busy || !email || !password || !isOnline}
                  onClick={() => run(async () => {
                    const identity = await signInToFirebase(email, password);
                    setCloudUser(identity);
                    setPassword('');
                    return `Вхід виконано: ${identity}.`;
                  })}
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  <LogIn className="h-4 w-4" /> Увійти
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {conflicts.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
          <div className="mb-3 flex items-center gap-2 text-rose-700 dark:text-rose-300">
            <AlertTriangle className="h-5 w-5" />
            <h4 className="font-black">Потрібне рішення щодо одночасних змін</h4>
          </div>
          <div className="space-y-2">
            {conflicts.map(conflict => (
              <div key={conflict.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-white p-3 dark:border-rose-900 dark:bg-slate-950">
                <div>
                  <div className="text-xs font-bold">{conflict.entityType} · {conflict.syncId}</div>
                  <div className="text-[10px] text-slate-500">
                    Інший пристрій зберіг новішу версію {formatDate(conflict.remote.updatedAt)}.
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={busy}
                    onClick={() => run(async () => {
                      await resolveEntitySyncConflict(conflict, 'cloud');
                      return 'Застосовано хмарну версію.';
                    })}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-[10px] font-bold dark:border-slate-700"
                  >
                    Взяти з хмари
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => run(async () => {
                      await resolveEntitySyncConflict(conflict, 'local');
                      return 'Локальну версію поставлено в чергу повторно.';
                    })}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-[10px] font-bold text-white"
                  >
                    Залишити локальну
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
