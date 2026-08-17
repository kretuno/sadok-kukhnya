import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Cloud, Database, HardDrive, Laptop,
  Loader2, RefreshCw, Save, ShieldAlert, Wifi, WifiOff,
} from 'lucide-react';
import { classifyDeviceActivity, formatActivityAge, type DeviceActivityState } from '../../domain/systemHealth';
import { APP_VERSION } from '../../config/version';
import { ensurePersistentBrowserStorage, type StorageDurabilityStatus } from '../../services/durableStorage';
import {
  getCloudCurrentUser, getDeviceId, getPendingSyncCount, getSyncState, ROLE_LABELS,
} from '../../services/governance';
import {
  getEntitySyncConflicts, getPendingEntityMutationCount,
  isEntityBootstrapComplete, isOperationalBootstrapComplete,
} from '../../services/entitySyncQueue';
import {
  getFirebaseCapability, getFirebaseUser, getLocalDeviceName, listOrganizationDevices,
  refreshCurrentDevicePresence, setLocalDeviceName, type OrganizationDevice,
} from '../../services/firebaseSync';
import { isApplicationInstalled, isServiceWorkerActive } from '../../services/offlineSupport';

const ACTIVITY_STYLE: Record<DeviceActivityState, { label: string; className: string }> = {
  online: { label: 'Активний', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  recent: { label: 'Нещодавно', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  attention: { label: 'Потрібна увага', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  stale: { label: 'Давно не в мережі', className: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
  unknown: { label: 'Немає даних', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
};

function formatDate(value?: string | null): string {
  return value ? new Date(value).toLocaleString('uk-UA') : '—';
}

export const SystemStatusPanel: React.FC = () => {
  const capability = getFirebaseCapability();
  const cloudIdentity = getCloudCurrentUser();
  const [online, setOnline] = useState(() => navigator.onLine);
  const [storage, setStorage] = useState<StorageDurabilityStatus | null>(null);
  const [devices, setDevices] = useState<OrganizationDevice[]>([]);
  const [deviceName, setDeviceName] = useState(getLocalDeviceName);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async (forceHeartbeat = false) => {
    setLoading(true);
    setError('');
    try {
      const storagePromise = ensurePersistentBrowserStorage();
      if (capability.configured && navigator.onLine) {
        const user = await getFirebaseUser();
        if (user) {
          await refreshCurrentDevicePresence(forceHeartbeat);
          setDevices(await listOrganizationDevices());
        }
      }
      setStorage(await storagePromise);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : String(refreshError));
    } finally {
      setLoading(false);
    }
  }, [capability.configured]);

  useEffect(() => {
    const updateNetwork = () => setOnline(navigator.onLine);
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    void refresh(false);
    return () => {
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
    };
  }, [refresh]);

  const syncState = getSyncState();
  const pendingAudit = getPendingSyncCount();
  const pendingEntities = getPendingEntityMutationCount();
  const conflicts = getEntitySyncConflicts().length;
  const currentDeviceId = getDeviceId();
  const deviceStates = useMemo(() => devices.map(device => ({
    device,
    activity: classifyDeviceActivity(device.lastSeenAt),
  })), [devices]);
  const warningDevices = deviceStates.filter(item => ['attention', 'stale', 'unknown'].includes(item.activity));
  const localReady = isServiceWorkerActive() && Boolean(storage?.persisted);
  const cloudReady = capability.configured && Boolean(cloudIdentity);
  const dataReady = isEntityBootstrapComplete() && isOperationalBootstrapComplete();
  const healthy = online && localReady && cloudReady && dataReady
    && pendingAudit === 0 && pendingEntities === 0 && conflicts === 0
    && warningDevices.length === 0 && !syncState.lastError;

  const saveName = async () => {
    setMessage('');
    setError('');
    try {
      const saved = setLocalDeviceName(deviceName);
      setDeviceName(saved);
      if (navigator.onLine && cloudIdentity) {
        await refreshCurrentDevicePresence(true);
        setDevices(await listOrganizationDevices());
      }
      setMessage('Назву цього пристрою збережено.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    }
  };

  const statusCards = [
    {
      label: 'Робота без інтернету',
      value: localReady ? 'Готова' : 'Потрібне налаштування',
      detail: `${isServiceWorkerActive() ? 'офлайн-пакет' : 'кеш очікує'} · ${storage?.persisted ? 'захищене сховище' : 'звичайне сховище'}`,
      ready: localReady,
      icon: HardDrive,
    },
    {
      label: 'Хмарний обліковий запис',
      value: cloudIdentity ? ROLE_LABELS[cloudIdentity.role] : 'Не виконано вхід',
      detail: cloudIdentity?.displayName || (capability.configured ? 'відкрийте вкладку «Синхронізація»' : 'Firebase не налаштовано'),
      ready: cloudReady,
      icon: Cloud,
    },
    {
      label: 'Копії даних',
      value: dataReady ? 'Готові' : 'Очікують',
      detail: `каталоги: ${isEntityBootstrapComplete() ? 'так' : 'ні'} · меню і склад: ${isOperationalBootstrapComplete() ? 'так' : 'ні'}`,
      ready: dataReady,
      icon: Database,
    },
    {
      label: 'Черга синхронізації',
      value: pendingAudit + pendingEntities === 0 ? 'Порожня' : `${pendingAudit + pendingEntities} змін`,
      detail: `журнал: ${pendingAudit} · дані: ${pendingEntities} · конфлікти: ${conflicts}`,
      ready: pendingAudit + pendingEntities + conflicts === 0,
      icon: RefreshCw,
    },
  ];

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-4 ${
        healthy
          ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
          : 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {healthy
              ? <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              : <ShieldAlert className="h-7 w-7 text-amber-600" />}
            <div>
              <h4 className="font-black text-slate-900 dark:text-white">
                {healthy ? 'Система працює нормально' : 'Є пункти, які потребують уваги'}
              </h4>
              <p className="text-[10px] text-slate-600 dark:text-slate-400">
                SADOK v{APP_VERSION} · остання успішна синхронізація {formatDate(syncState.lastSuccessfulSync)}
              </p>
            </div>
          </div>
          <button
            data-testid="refresh-system-status"
            onClick={() => void refresh(true)}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Перевірити зараз
          </button>
        </div>
      </div>

      {(message || error || syncState.lastError) ? (
        <div className={`rounded-lg border px-4 py-2 text-[11px] font-semibold ${
          error || syncState.lastError
            ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
            : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
        }`}>
          {error || syncState.lastError || message}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statusCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2">
                <Icon className={`h-5 w-5 ${card.ready ? 'text-emerald-500' : 'text-amber-500'}`} />
                {card.ready ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
              </div>
              <div className="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">{card.label}</div>
              <div className="mt-1 font-black text-slate-900 dark:text-white">{card.value}</div>
              <div className="mt-1 text-[10px] text-slate-500">{card.detail}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <Laptop className="h-5 w-5 text-indigo-600" />
            <div>
              <h4 className="font-black">Цей пристрій</h4>
              <p className="text-[10px] text-slate-500">Назва допомагає розрізняти робочі місця</p>
            </div>
          </div>
          <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
            Назва пристрою
            <input
              data-testid="device-name-input"
              value={deviceName}
              onChange={event => setDeviceName(event.target.value)}
              placeholder="Наприклад: Комп’ютер медсестри"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <button
            onClick={() => void saveName()}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 dark:border-indigo-800 dark:text-indigo-300"
          >
            <Save className="h-4 w-4" /> Зберегти назву
          </button>
          <dl className="mt-4 space-y-2 text-[10px]">
            <div className="flex justify-between gap-2"><dt className="text-slate-500">Ідентифікатор</dt><dd className="max-w-[60%] truncate font-mono">{currentDeviceId}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Застосунок</dt><dd className="font-bold">{isApplicationInstalled() ? 'встановлено' : 'відкрито в браузері'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Мережа</dt><dd className={`flex items-center gap-1 font-bold ${online ? 'text-emerald-600' : 'text-amber-600'}`}>{online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}{online ? 'онлайн' : 'автономно'}</dd></div>
          </dl>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <h4 className="font-black">Пристрої закладу</h4>
            <p className="text-[10px] text-slate-500">Попередження з’являється, якщо пристрій не синхронізувався понад добу</p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {deviceStates.map(({ device, activity }) => {
              const style = ACTIVITY_STYLE[activity];
              const queue = device.pendingAudit + device.pendingEntities;
              return (
                <div key={device.deviceId} className="grid gap-2 p-4 md:grid-cols-[1fr_170px_150px] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{device.deviceName}</span>
                      {device.deviceId === currentDeviceId ? <span className="text-[9px] font-bold text-indigo-600">цей пристрій</span> : null}
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${style.className}`}>{style.label}</span>
                    </div>
                    <div className="mt-1 truncate text-[10px] text-slate-500">
                      {device.userName || device.userEmail || 'Користувач невідомий'} · {device.platform || 'платформа невідома'} · v{device.appVersion || '—'}
                    </div>
                  </div>
                  <div className="text-[10px]">
                    <div className="font-bold">{formatActivityAge(device.lastSeenAt)}</div>
                    <div className="text-slate-500">синхр. {formatDate(device.lastSyncAt)}</div>
                  </div>
                  <div className="text-[10px]">
                    <div className={`font-bold ${queue || device.conflicts ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {queue} у черзі · {device.conflicts} конфл.
                    </div>
                    <div className="truncate text-rose-500">{device.lastError || 'помилок немає'}</div>
                  </div>
                </div>
              );
            })}
            {!loading && deviceStates.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                {cloudIdentity ? 'Пристрої ще не зареєстровані. Натисніть «Перевірити зараз».' : 'Увійдіть до Firebase у вкладці «Синхронізація».'}
              </div>
            ) : null}
            {loading ? <div className="flex items-center justify-center gap-2 p-6 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Перевірка стану…</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
};
