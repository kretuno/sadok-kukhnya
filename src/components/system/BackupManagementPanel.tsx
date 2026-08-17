import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Clock3, Download, FileKey2, HardDrive,
  KeyRound, Loader2, LockKeyhole, RotateCcw, ShieldCheck, X,
} from 'lucide-react';
import { getBackupHealth } from '../../domain/backupHealth';
import {
  createSystemBackup, downloadEncryptedBackup, inspectBackupFile, listSystemBackups,
  restoreStoredSystemBackup, restoreSystemBackup, type SystemBackupInfo,
} from '../../services/db';

type Dialog = 'transfer' | 'restore-file' | 'restore-local' | null;

function formatDate(value?: string | null): string {
  return value ? new Date(value).toLocaleString('uk-UA') : '—';
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
  return `${(bytes / 1024).toFixed(1)} КБ`;
}

export const BackupManagementPanel: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [backups, setBackups] = useState<SystemBackupInfo[]>([]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string; raw: string; info: ReturnType<typeof inspectBackupFile> } | null>(null);
  const [selectedBackup, setSelectedBackup] = useState<SystemBackupInfo | null>(null);
  const [restoreConfirmed, setRestoreConfirmed] = useState(false);

  const refresh = useCallback(async () => {
    setBackups(await listSystemBackups());
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const latest = backups[0]?.createdAt || localStorage.getItem('sadok_last_verified_backup_at');
  const health = useMemo(() => getBackupHealth(latest), [latest]);
  const closeDialog = () => {
    if (busy) return;
    setDialog(null);
    setPassword('');
    setPasswordRepeat('');
    setSelectedFile(null);
    setSelectedBackup(null);
    setRestoreConfirmed(false);
    if (fileInput.current) fileInput.current.value = '';
  };

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await action();
      setMessage(success);
      await refresh();
      onChanged?.();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : String(actionError));
    } finally {
      setBusy(false);
    }
  };

  const createLocal = () => run(async () => {
    await createSystemBackup('manual');
  }, 'Зашифровану резервну версію створено та перевірено.');

  const exportPortable = () => run(async () => {
    if (password.length < 10) throw new Error('Пароль має містити щонайменше 10 символів');
    if (password !== passwordRepeat) throw new Error('Паролі не збігаються');
    const { envelope } = await createSystemBackup('manual');
    await downloadEncryptedBackup(envelope, password);
    closeDialog();
  }, 'Зашифрований файл переносу завантажено. Збережіть пароль окремо.');

  const chooseFile = async (file?: File) => {
    if (!file) return;
    setError('');
    try {
      const raw = await file.text();
      setSelectedFile({ name: file.name, raw, info: inspectBackupFile(raw) });
      setDialog('restore-file');
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : 'Не вдалося прочитати файл');
    }
  };

  const restoreFile = () => run(async () => {
    if (!selectedFile) throw new Error('Оберіть файл резервної копії');
    if (!restoreConfirmed) throw new Error('Підтвердьте заміну поточних даних');
    await restoreSystemBackup(selectedFile.raw, password);
  }, 'Дані відновлено.');

  const restoreLocal = () => run(async () => {
    if (!selectedBackup) throw new Error('Оберіть резервну версію');
    if (!restoreConfirmed) throw new Error('Підтвердьте заміну поточних даних');
    await restoreStoredSystemBackup(selectedBackup.id);
  }, 'Дані відновлено.');

  const healthClasses = health.state === 'fresh'
    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
    : health.state === 'warning'
      ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200'
      : 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200';

  return (
    <div className="space-y-4">
      {(message || error) ? (
        <div className={`rounded-lg border px-4 py-3 text-xs font-semibold ${error ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-emerald-300 bg-emerald-50 text-emerald-700'}`}>
          {error || message}
        </div>
      ) : null}

      <div className={`rounded-xl border p-4 ${healthClasses}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {health.state === 'fresh' ? <ShieldCheck className="h-7 w-7" /> : <AlertTriangle className="h-7 w-7" />}
            <div>
              <h4 className="font-black">{health.label}</h4>
              <p className="text-[11px] opacity-80">Остання перевірена копія: {formatDate(latest)} · зберігається до 7 версій</p>
            </div>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-[10px] font-bold dark:bg-slate-950/40">
            <LockKeyhole className="h-3.5 w-3.5" /> AES-256-GCM
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <button data-testid="create-backup" disabled={busy} onClick={() => void createLocal()} className="rounded-xl border border-emerald-200 bg-white p-4 text-left hover:border-emerald-400 disabled:opacity-50 dark:border-emerald-900 dark:bg-slate-900">
          <HardDrive className="h-6 w-6 text-emerald-600" />
          <div className="mt-3 font-black">Створити версію зараз</div>
          <p className="mt-1 text-[10px] text-slate-500">Зашифрована копія залишиться на цьому пристрої.</p>
        </button>
        <button data-testid="open-transfer-backup" disabled={busy} onClick={() => setDialog('transfer')} className="rounded-xl border border-indigo-200 bg-white p-4 text-left hover:border-indigo-400 disabled:opacity-50 dark:border-indigo-900 dark:bg-slate-900">
          <FileKey2 className="h-6 w-6 text-indigo-600" />
          <div className="mt-3 font-black">Перенести на інший комп’ютер</div>
          <p className="mt-1 text-[10px] text-slate-500">Файл захищається вашим окремим паролем.</p>
        </button>
        <button data-testid="open-restore-backup" disabled={busy} onClick={() => fileInput.current?.click()} className="rounded-xl border border-amber-200 bg-white p-4 text-left hover:border-amber-400 disabled:opacity-50 dark:border-amber-900 dark:bg-slate-900">
          <RotateCcw className="h-6 w-6 text-amber-600" />
          <div className="mt-3 font-black">Відновити з файлу</div>
          <p className="mt-1 text-[10px] text-slate-500">Спочатку файл буде прочитано та перевірено.</p>
        </button>
        <input ref={fileInput} type="file" accept=".json,.sadok-backup" className="hidden" onChange={event => void chooseFile(event.target.files?.[0])} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <h4 className="font-black">Версії на цьому пристрої</h4>
          <p className="text-[10px] text-slate-500">Щоденна версія створюється автоматично, навіть без інтернету.</p>
        </div>
        {backups.map(backup => (
          <div key={backup.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 last:border-0 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800"><Clock3 className="h-4 w-4 text-slate-500" /></div>
              <div>
                <div className="font-bold">{formatDate(backup.createdAt)}</div>
                <div className="text-[10px] text-slate-500">{backup.trigger === 'automatic' ? 'Автоматична' : 'Ручна'} · {formatSize(backup.size)} · {backup.encrypted ? 'зашифрована' : 'стара версія'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Перевірено</span>
              {backup.restorable ? (
                <button onClick={() => { setSelectedBackup(backup); setDialog('restore-local'); }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-[10px] font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Відновити</button>
              ) : null}
            </div>
          </div>
        ))}
        {backups.length === 0 ? <div className="p-8 text-center text-xs text-slate-400">Резервних версій поки немає.</div> : null}
      </div>

      {dialog ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center gap-2 font-black">
                {dialog === 'transfer' ? <Download className="h-5 w-5 text-indigo-600" /> : <RotateCcw className="h-5 w-5 text-amber-600" />}
                {dialog === 'transfer' ? 'Перенесення SADOK' : 'Відновлення даних'}
              </div>
              <button aria-label="Закрити" disabled={busy} onClick={closeDialog} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 p-5">
              {dialog === 'transfer' ? (
                <>
                  <div className="rounded-lg bg-indigo-50 p-3 text-xs text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200">
                    Буде створено один файл із повною базою, налаштуваннями та журналом змін. Скопіюйте його на флешку або інший безпечний носій.
                  </div>
                  <label className="block text-xs font-bold">Пароль до файлу
                    <div className="relative mt-1"><KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input data-testid="backup-password" type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 font-normal dark:border-slate-700 dark:bg-slate-950" placeholder="Не менше 10 символів" /></div>
                  </label>
                  <label className="block text-xs font-bold">Повторіть пароль
                    <input data-testid="backup-password-repeat" type="password" autoComplete="new-password" value={passwordRepeat} onChange={event => setPasswordRepeat(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal dark:border-slate-700 dark:bg-slate-950" />
                  </label>
                  <p className="text-[10px] font-semibold text-rose-600">SADOK не зберігає цей пароль. Без нього файл неможливо відновити.</p>
                  <button data-testid="download-encrypted-backup" disabled={busy || password.length < 10 || password !== passwordRepeat} onClick={() => void exportPortable()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Створити та завантажити файл</button>
                </>
              ) : (
                <>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                    <div className="font-black">Поточні дані буде замінено</div>
                    <p className="mt-1 text-[10px]">Перед відновленням SADOK перевірить шифрування, контрольну суму та цілісність SQLite.</p>
                  </div>
                  {selectedFile ? (
                    <dl className="grid grid-cols-[130px_1fr] gap-2 rounded-lg bg-slate-50 p-3 text-[11px] dark:bg-slate-950">
                      <dt className="text-slate-500">Файл</dt><dd className="truncate font-bold">{selectedFile.name}</dd>
                      <dt className="text-slate-500">Створено</dt><dd>{formatDate(selectedFile.info.createdAt)}</dd>
                      <dt className="text-slate-500">Захист</dt><dd>{selectedFile.info.encrypted ? 'Зашифровано' : 'Старий незашифрований формат'}</dd>
                    </dl>
                  ) : selectedBackup ? (
                    <div className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-950"><span className="font-bold">Локальна версія:</span> {formatDate(selectedBackup.createdAt)}</div>
                  ) : null}
                  {selectedFile?.info.passwordRequired ? (
                    <label className="block text-xs font-bold">Пароль до файлу<input data-testid="restore-backup-password" type="password" value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal dark:border-slate-700 dark:bg-slate-950" /></label>
                  ) : null}
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-800">
                    <input data-testid="confirm-backup-restore" type="checkbox" checked={restoreConfirmed} onChange={event => setRestoreConfirmed(event.target.checked)} className="mt-0.5" />
                    <span>Я розумію, що поточна база буде замінена вибраною резервною копією.</span>
                  </label>
                  <button data-testid="restore-backup-confirm" disabled={busy || !restoreConfirmed || Boolean(selectedFile?.info.passwordRequired && !password)} onClick={() => void (dialog === 'restore-file' ? restoreFile() : restoreLocal())} className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Перевірити та відновити</button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
