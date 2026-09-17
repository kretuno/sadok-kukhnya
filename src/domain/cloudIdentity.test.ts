import { describe, expect, it } from 'vitest';
import { canReuseCachedCloudIdentity, parseCloudMembership } from './cloudIdentity';

describe('Firebase membership identity', () => {
  it('maps an active membership to the local governance identity', () => {
    expect(parseCloudMembership('uid-1', 'nurse@example.com', {
      active: true,
      role: 'nurse',
      displayName: 'Медична сестра',
    })).toEqual({
      id: 'firebase-uid-1',
      displayName: 'Медична сестра',
      role: 'nurse',
      active: true,
    });
  });

  it('rejects inactive and unknown memberships', () => {
    expect(() => parseCloudMembership('uid-2', null, { active: false, role: 'admin' })).toThrow('не активований');
    expect(() => parseCloudMembership('uid-3', null, { active: true, role: 'owner' })).toThrow('роль');
  });

  it('reuses a cached identity only for the same user during a temporary network failure', () => {
    const cache = {
      identityId: 'firebase-uid-1',
      scope: 'project-1/organization-1',
      verifiedAt: 1_000,
    };
    expect(canReuseCachedCloudIdentity('unavailable', cache, 'uid-1', cache.scope, 2_000)).toBe(true);
    expect(canReuseCachedCloudIdentity('auth/network-request-failed', cache, 'uid-1', cache.scope, 2_000)).toBe(true);
    expect(canReuseCachedCloudIdentity('permission-denied', cache, 'uid-1', cache.scope, 2_000)).toBe(false);
    expect(canReuseCachedCloudIdentity('unavailable', cache, 'another-user', cache.scope, 2_000)).toBe(false);
    expect(canReuseCachedCloudIdentity('unavailable', cache, 'uid-1', 'project-2/organization-1', 2_000)).toBe(false);
    expect(canReuseCachedCloudIdentity('unavailable', cache, 'uid-1', cache.scope, 8 * 24 * 60 * 60 * 1000)).toBe(false);
  });
});
