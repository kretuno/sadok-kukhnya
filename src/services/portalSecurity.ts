export type PortalRole = 'guest' | 'parent' | 'director' | 'staff';

const DIRECTOR_PIN_KEY = 'sadok_director_pin';
const STAFF_PIN_KEY = 'sadok_staff_pin';
const PORTAL_ROLE_KEY = 'sadok_portal_active_role';
export const PORTAL_ROLE_EVENT = 'sadok_portal_role_changed';

const DEFAULT_DIRECTOR_PIN = '145';
const DEFAULT_STAFF_PIN = '145';

export function getDirectorPin(): string {
  try {
    const saved = localStorage.getItem(DIRECTOR_PIN_KEY);
    return saved && saved.trim().length > 0 ? saved.trim() : DEFAULT_DIRECTOR_PIN;
  } catch (_) {
    return DEFAULT_DIRECTOR_PIN;
  }
}

export function setDirectorPin(newPin: string): boolean {
  if (!newPin || newPin.trim().length < 3) return false;
  try {
    localStorage.setItem(DIRECTOR_PIN_KEY, newPin.trim());
    return true;
  } catch (_) {
    return false;
  }
}

export function verifyDirectorPin(inputPin: string): boolean {
  if (!inputPin) return false;
  return inputPin.trim() === getDirectorPin();
}

export function getStaffPin(): string {
  try {
    const saved = localStorage.getItem(STAFF_PIN_KEY);
    return saved && saved.trim().length > 0 ? saved.trim() : DEFAULT_STAFF_PIN;
  } catch (_) {
    return DEFAULT_STAFF_PIN;
  }
}

export function setStaffPin(newPin: string): boolean {
  if (!newPin || newPin.trim().length < 3) return false;
  try {
    localStorage.setItem(STAFF_PIN_KEY, newPin.trim());
    return true;
  } catch (_) {
    return false;
  }
}

export function verifyStaffPin(inputPin: string): boolean {
  if (!inputPin) return false;
  return inputPin.trim() === getStaffPin();
}

export function getCurrentPortalRole(): PortalRole {
  try {
    const saved = sessionStorage.getItem(PORTAL_ROLE_KEY);
    if (saved === 'parent' || saved === 'director' || saved === 'staff') {
      return saved;
    }
  } catch (_) {}
  return 'guest';
}

export function setCurrentPortalRole(role: PortalRole): void {
  try {
    if (role === 'guest') {
      sessionStorage.removeItem(PORTAL_ROLE_KEY);
    } else {
      sessionStorage.setItem(PORTAL_ROLE_KEY, role);
    }
    window.dispatchEvent(new CustomEvent(PORTAL_ROLE_EVENT, { detail: { role } }));
  } catch (_) {}
}

export function clearPortalRole(): void {
  setCurrentPortalRole('guest');
}
