import { describe, expect, it } from 'vitest';
import { parseCloudMembership } from './cloudIdentity';

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
});
