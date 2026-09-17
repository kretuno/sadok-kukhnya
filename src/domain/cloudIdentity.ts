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

const TEMPORARY_CLOUD_ERROR_CODES = new Set([
  'unavailable',
  'failed-precondition',
  'auth/network-request-failed',
]);

const CLOUD_IDENTITY_MAX_OFFLINE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface CachedCloudIdentityMetadata {
  identityId: string;
  scope: string;
  verifiedAt: number;
}

export function canReuseCachedCloudIdentity(
  errorCode: string,
  cache: CachedCloudIdentityMetadata | null,
  firebaseUid: string,
  expectedScope: string,
  now: number,
): boolean {
  return TEMPORARY_CLOUD_ERROR_CODES.has(errorCode)
    && cache?.identityId === `firebase-${firebaseUid}`
    && cache.scope === expectedScope
    && now - cache.verifiedAt <= CLOUD_IDENTITY_MAX_OFFLINE_AGE_MS;
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
