import { CLOUD_USER_ROLES, type CloudUserRole } from './cloudIdentity';

export interface CloudUserDraft {
  displayName: string;
  email: string;
  role: CloudUserRole;
  password: string;
  active: boolean;
  sendPasswordReset: boolean;
}

export function validateCloudUserDraft(draft: CloudUserDraft): string[] {
  const errors: string[] = [];
  if (draft.displayName.trim().length < 3) errors.push('Вкажіть повне ім’я співробітника');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) errors.push('Вкажіть коректну електронну адресу');
  if (!CLOUD_USER_ROLES.includes(draft.role)) errors.push('Оберіть коректну роль');
  if (draft.password.length < 10) errors.push('Тимчасовий пароль має містити щонайменше 10 символів');
  if (!/[A-Z]/.test(draft.password) || !/[a-z]/.test(draft.password) || !/\d/.test(draft.password)) {
    errors.push('Пароль має містити великі й малі латинські літери та цифру');
  }
  return errors;
}

export function generateTemporaryPassword(randomValues?: Uint32Array): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '-_!';
  const alphabet = `${uppercase}${lowercase}${digits}${symbols}`;
  const values = randomValues || crypto.getRandomValues(new Uint32Array(14));
  const required = [uppercase, lowercase, digits, symbols].map((group, index) => (
    group[values[index] % group.length]
  ));
  const rest = Array.from(values.slice(4), value => alphabet[value % alphabet.length]);
  const characters = [...required, ...rest];
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = values[index % values.length] % (index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }
  return characters.join('');
}
