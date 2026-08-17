import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { persistDurableLocalState, restoreDurableLocalState } from './services/durableStorage';
import { initializeInstallPrompt, OFFLINE_READY_EVENT } from './services/offlineSupport';

async function startApplication() {
  initializeInstallPrompt();
  try {
    await restoreDurableLocalState();
  } catch (error) {
    console.warn('[Storage] Durable state restore failed:', error);
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  registerSW({
    immediate: true,
    onOfflineReady: () => window.dispatchEvent(new CustomEvent(OFFLINE_READY_EVENT)),
    onRegisteredSW: () => window.dispatchEvent(new CustomEvent(OFFLINE_READY_EVENT)),
    onRegisterError: error => console.warn('[PWA] Service worker registration failed:', error),
  });

  window.addEventListener('pagehide', () => {
    void persistDurableLocalState();
  });
  window.setInterval(() => {
    void persistDurableLocalState().catch(() => undefined);
  }, 30_000);
}

void startApplication();
