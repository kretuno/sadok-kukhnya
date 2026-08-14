export const FULLSCREEN_MODALS_KEY = 'sadok_fullscreen_modals_v1';
export const UI_PREFERENCES_EVENT = 'sadok-ui-preferences-change';
export const SHOW_MENU_MACROS_KEY = 'sadok_show_menu_macros_v1';

export function getFullscreenModals(): boolean {
  return localStorage.getItem(FULLSCREEN_MODALS_KEY) === 'true';
}

export function applyFullscreenModals(enabled: boolean): void {
  document.documentElement.classList.toggle('sadok-fullscreen-modals', enabled);
}

export function setFullscreenModals(enabled: boolean): void {
  localStorage.setItem(FULLSCREEN_MODALS_KEY, String(enabled));
  applyFullscreenModals(enabled);
  window.dispatchEvent(new CustomEvent(UI_PREFERENCES_EVENT, { detail: { fullscreenModals: enabled } }));
}

export function getShowMenuMacros(): boolean {
  return localStorage.getItem(SHOW_MENU_MACROS_KEY) !== 'false';
}

export function setShowMenuMacros(enabled: boolean): void {
  localStorage.setItem(SHOW_MENU_MACROS_KEY, String(enabled));
  window.dispatchEvent(new CustomEvent(UI_PREFERENCES_EVENT, { detail: { showMenuMacros: enabled } }));
}
