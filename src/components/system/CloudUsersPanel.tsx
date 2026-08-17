import React, { useCallback, useEffect, useState } from 'react';
import { Check, KeyRound, Loader2, RefreshCw, UserPlus, Users } from 'lucide-react';
import { SearchableSelect } from '../common/SearchableSelect';
import { CLOUD_USER_ROLES, type CloudUserRole } from '../../domain/cloudIdentity';
import { generateTemporaryPassword, type CloudUserDraft } from '../../domain/cloudUserProvisioning';
import { getCloudCurrentUser, ROLE_LABELS } from '../../services/governance';
import {
  createOrganizationMember,
  getFirebaseUser,
  listOrganizationMembers,
  sendOrganizationPasswordReset,
  updateOrganizationMember,
  type OrganizationMember,
} from '../../services/firebaseSync';

const EMPTY_FORM: CloudUserDraft = {
  displayName: '',
  email: '',
  role: 'nurse',
  password: '',
  active: true,
  sendPasswordReset: true,
};

function accountError(error: unknown): string {
  const code = String((error as { code?: unknown })?.code || '');
  if (code.includes('email-already-in-use')) return 'Ця електронна адреса вже зареєстрована';
  if (code.includes('invalid-email')) return 'Некоректна електронна адреса';
  if (code.includes('weak-password')) return 'Тимчасовий пароль недостатньо надійний';
  if (code.includes('permission-denied')) return 'Firebase відхилив дію: перевірте права адміністратора';
  return error instanceof Error ? error.message : String(error);
}

export const CloudUsersPanel: React.FC = () => {
  const manageableRoles = getCloudCurrentUser()?.role === 'admin'
    ? CLOUD_USER_ROLES
    : CLOUD_USER_ROLES.filter(role => role !== 'admin');
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [currentUid, setCurrentUid] = useState('');
  const [form, setForm] = useState<CloudUserDraft>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [user, list] = await Promise.all([getFirebaseUser(), listOrganizationMembers()]);
      setCurrentUid(user?.uid || '');
      setMembers(list);
    } catch (loadError) {
      setError(accountError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadMembers(); }, [loadMembers]);

  const createMember = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy('create');
    setMessage('');
    setError('');
    try {
      const created = await createOrganizationMember(form);
      setForm(EMPTY_FORM);
      await loadMembers();
      setMessage(created.passwordResetSent
        ? `Обліковий запис ${created.email} створено. Лист для встановлення пароля надіслано.`
        : `Обліковий запис ${created.email} створено. Передайте співробітнику тимчасовий пароль.`);
    } catch (createError) {
      setError(accountError(createError));
    } finally {
      setBusy('');
    }
  };

  const saveMember = async (member: OrganizationMember) => {
    setBusy(`save:${member.uid}`);
    setMessage('');
    setError('');
    try {
      await updateOrganizationMember(member.uid, { role: member.role, active: member.active });
      setMessage(`Доступ для «${member.displayName}» оновлено.`);
      await loadMembers();
    } catch (saveError) {
      setError(accountError(saveError));
    } finally {
      setBusy('');
    }
  };

  const sendReset = async (member: OrganizationMember) => {
    setBusy(`reset:${member.uid}`);
    setMessage('');
    setError('');
    try {
      await sendOrganizationPasswordReset(member.email);
      setMessage(`Лист для зміни пароля надіслано на ${member.email}.`);
    } catch (resetError) {
      setError(accountError(resetError));
    } finally {
      setBusy('');
    }
  };

  const updateMemberDraft = (uid: string, update: Partial<OrganizationMember>) => {
    setMembers(current => current.map(member => member.uid === uid ? { ...member, ...update } : member));
  };

  return (
    <div className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900 dark:bg-indigo-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-600" />
          <div>
            <h4 className="font-black text-slate-800 dark:text-white">Облікові записи співробітників</h4>
            <p className="text-[10px] text-slate-500">Реальні входи Firebase та ролі закладу</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadMembers()}
          disabled={loading}
          className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-[10px] font-bold text-indigo-700 disabled:opacity-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Оновити список
        </button>
      </div>

      {(message || error) && (
        <div className={`rounded-lg border px-3 py-2 text-[11px] font-semibold ${
          error
            ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
            : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
        }`}>
          {error || message}
        </div>
      )}

      <form onSubmit={createMember} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-2">
        <label className="space-y-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
          ПІБ співробітника
          <input
            data-testid="cloud-user-name"
            value={form.displayName}
            onChange={event => setForm(current => ({ ...current, displayName: event.target.value }))}
            placeholder="Наприклад: Наталія Іваненко"
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </label>
        <label className="space-y-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
          Електронна адреса для входу
          <input
            data-testid="cloud-user-email"
            type="email"
            value={form.email}
            onChange={event => setForm(current => ({ ...current, email: event.target.value }))}
            placeholder="employee@example.com"
            autoComplete="off"
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </label>
        <label className="space-y-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
          Роль
          <SearchableSelect
            data-testid="cloud-user-role"
            value={form.role}
            onChange={event => setForm(current => ({ ...current, role: event.target.value as CloudUserRole }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            {manageableRoles.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
          </SearchableSelect>
        </label>
        <label className="space-y-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
          Тимчасовий пароль
          <div className="flex gap-2">
            <input
              data-testid="cloud-user-password"
              type="text"
              value={form.password}
              onChange={event => setForm(current => ({ ...current, password: event.target.value }))}
              placeholder="Не менше 10 символів"
              autoComplete="new-password"
              required
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setForm(current => ({ ...current, password: generateTemporaryPassword() }))}
              className="rounded-lg border border-slate-300 px-3 text-[10px] font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Згенерувати
            </button>
          </div>
        </label>
        <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={form.active}
            onChange={event => setForm(current => ({ ...current, active: event.target.checked }))}
          />
          Одразу дозволити вхід
        </label>
        <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={form.sendPasswordReset}
            onChange={event => setForm(current => ({ ...current, sendPasswordReset: event.target.checked }))}
          />
          Надіслати лист для встановлення власного пароля
        </label>
        <button
          data-testid="create-cloud-user"
          type="submit"
          disabled={busy === 'create'}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 lg:col-span-2"
        >
          {busy === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Створити обліковий запис
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[760px] text-[10px]">
          <thead className="bg-slate-100 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
            <tr>
              <th className="p-2 text-left">Співробітник</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Роль</th>
              <th className="p-2 text-center">Вхід</th>
              <th className="p-2 text-right">Дії</th>
            </tr>
          </thead>
          <tbody>
            {members.map(member => {
              const isCurrent = member.uid === currentUid;
              return (
                <tr key={member.uid} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-2 font-bold">
                    {member.displayName}
                    {isCurrent ? <span className="ml-2 text-[9px] text-emerald-600">це ви</span> : null}
                  </td>
                  <td className="p-2 text-slate-500">{member.email || '—'}</td>
                  <td className="p-2">
                    <SearchableSelect
                      value={member.role}
                      disabled={isCurrent}
                      onChange={event => updateMemberDraft(member.uid, { role: event.target.value as CloudUserRole })}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950"
                    >
                      {manageableRoles.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                    </SearchableSelect>
                  </td>
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      aria-label={`Дозволити вхід: ${member.displayName}`}
                      checked={member.active}
                      disabled={isCurrent}
                      onChange={event => updateMemberDraft(member.uid, { active: event.target.checked })}
                    />
                  </td>
                  <td className="p-2">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        disabled={!member.email || busy === `reset:${member.uid}`}
                        onClick={() => void sendReset(member)}
                        className="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 font-bold disabled:opacity-40 dark:border-slate-700"
                      >
                        <KeyRound className="h-3.5 w-3.5" /> Змінити пароль
                      </button>
                      <button
                        type="button"
                        disabled={isCurrent || busy === `save:${member.uid}`}
                        onClick={() => void saveMember(member)}
                        className="flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1.5 font-bold text-white disabled:opacity-40"
                      >
                        <Check className="h-3.5 w-3.5" /> Зберегти
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-5 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Завантаження…</div>
        ) : members.length === 0 ? (
          <div className="p-5 text-center text-slate-400">Облікових записів поки немає.</div>
        ) : null}
      </div>
    </div>
  );
};
