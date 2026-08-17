import { describe, expect, it } from 'vitest';
import { generateTemporaryPassword, validateCloudUserDraft } from './cloudUserProvisioning';

describe('cloud user provisioning', () => {
  it('validates a complete employee account form', () => {
    expect(validateCloudUserDraft({
      displayName: 'Наталія Іваненко',
      email: 'nurse@example.com',
      role: 'nurse',
      password: 'StrongPass7!',
      active: true,
      sendPasswordReset: true,
    })).toEqual([]);
  });

  it('rejects incomplete identity and weak passwords', () => {
    const errors = validateCloudUserDraft({
      displayName: 'Н',
      email: 'wrong',
      role: 'cook',
      password: 'simple',
      active: true,
      sendPasswordReset: false,
    });
    expect(errors).toHaveLength(4);
  });

  it('generates a password with all required character groups', () => {
    const password = generateTemporaryPassword(Uint32Array.from([0, 1, 2, 0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]));
    expect(password).toHaveLength(14);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/\d/);
    expect(password).toMatch(/[-_!]/);
  });
});
