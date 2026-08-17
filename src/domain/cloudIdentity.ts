export const CLOUD_USER_ROLES = [
  'director', 'nurse', 'warehouse', 'cook', 'custodian', 'admin',
] as const;

export type CloudUserRole = typeof CLOUD_USER_ROLES[number];

export interface CloudAppIdentity {
  id: string;
  displayName: string;
  role: CloudUserRole;
  active: true;
}

export function parseCloudMembership(
  uid: string,
  email: string | null,
  value: unknown,
): CloudAppIdentity {
  const membership = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};
  if (membership.active !== true) {
    throw new Error('Обліковий запис не активований для цього закладу');
  }
  const role = String(membership.role || '');
  if (!CLOUD_USER_ROLES.includes(role as CloudUserRole)) {
    throw new Error('Для облікового запису не призначено коректну роль');
  }
  const displayName = String(membership.displayName || membership.name || email || uid).trim();
  return {
    id: `firebase-${uid}`,
    displayName: displayName || uid,
    role: role as CloudUserRole,
    active: true,
  };
}
