import { describe, expect, it, beforeEach } from 'vitest';
import {
  getDirectorPin,
  setDirectorPin,
  verifyDirectorPin,
  getStaffPin,
  setStaffPin,
  verifyStaffPin,
  getCurrentPortalRole,
  setCurrentPortalRole,
  clearPortalRole
} from './portalSecurity';

class StorageMock implements Storage {
  private store: Record<string, string> = {};
  get length() { return Object.keys(this.store).length; }
  clear() { this.store = {}; }
  getItem(key: string) { return this.store[key] ?? null; }
  setItem(key: string, value: string) { this.store[key] = String(value); }
  removeItem(key: string) { delete this.store[key]; }
  key(index: number) { return Object.keys(this.store)[index] ?? null; }
}

describe('portalSecurity service', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = new StorageMock();
    (globalThis as any).sessionStorage = new StorageMock();
    (globalThis as any).window = globalThis;
  });

  it('provides default PIN 145 for Director and Staff', () => {
    expect(getDirectorPin()).toBe('145');
    expect(getStaffPin()).toBe('145');
    expect(verifyDirectorPin('145')).toBe(true);
    expect(verifyStaffPin('145')).toBe(true);
    expect(verifyDirectorPin('wrong')).toBe(false);
  });

  it('allows updating Director PIN with minimum length validation', () => {
    expect(setDirectorPin('12')).toBe(false); // too short
    expect(setDirectorPin('2026')).toBe(true);
    expect(getDirectorPin()).toBe('2026');
    expect(verifyDirectorPin('2026')).toBe(true);
    expect(verifyDirectorPin('145')).toBe(false);
  });

  it('allows updating Staff PIN', () => {
    expect(setStaffPin('secret777')).toBe(true);
    expect(getStaffPin()).toBe('secret777');
    expect(verifyStaffPin('secret777')).toBe(true);
  });

  it('manages active portal session role', () => {
    expect(getCurrentPortalRole()).toBe('guest');
    setCurrentPortalRole('director');
    expect(getCurrentPortalRole()).toBe('director');
    setCurrentPortalRole('parent');
    expect(getCurrentPortalRole()).toBe('parent');
    clearPortalRole();
    expect(getCurrentPortalRole()).toBe('guest');
  });
});
