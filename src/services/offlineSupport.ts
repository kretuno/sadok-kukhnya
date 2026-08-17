export const OFFLINE_READY_EVENT = 'sadok-offline-ready';

let installPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function initializeInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent(OFFLINE_READY_EVENT));
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    window.dispatchEvent(new CustomEvent(OFFLINE_READY_EVENT));
  });
}

export function canInstallApplication(): boolean {
  return installPrompt !== null;
}

export function isApplicationInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export async function installApplication(): Promise<boolean> {
  if (!installPrompt) return false;
  await installPrompt.prompt();
  const choice = await installPrompt.userChoice;
  if (choice.outcome === 'accepted') installPrompt = null;
  window.dispatchEvent(new CustomEvent(OFFLINE_READY_EVENT));
  return choice.outcome === 'accepted';
}

export function isServiceWorkerActive(): boolean {
  return Boolean(navigator.serviceWorker?.controller);
}
