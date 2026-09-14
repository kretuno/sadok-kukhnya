import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { persistDurableLocalState, restoreDurableLocalState } from './services/durableStorage';
import { initializeInstallPrompt, OFFLINE_READY_EVENT, notifyPwaUpdateAvailable } from './services/offlineSupport';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[RootErrorBoundary] Uncaught application error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHardReset = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(r => r.unregister());
      });
    }
    sessionStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#0f172a',
          color: '#f8fafc',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            padding: '16px',
            borderRadius: '16px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            marginBottom: '16px',
            color: '#f87171',
            fontSize: '28px'
          }}>
            ⚠️
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>
            Помилка завантаження інтерфейсу
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '420px', marginBottom: '20px', lineHeight: 1.5 }}>
            Виникла помилка під час рендерингу. База даних SQLite та всі ваші дані збережені у безпеці.
          </p>
          <pre style={{
            fontSize: '11px',
            color: '#cbd5e1',
            background: '#1e293b',
            padding: '12px',
            borderRadius: '10px',
            maxWidth: '500px',
            overflowX: 'auto',
            marginBottom: '24px',
            border: '1px solid #334155'
          }}>
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              🔄 Оновити сторінку
            </button>
            <button
              onClick={this.handleHardReset}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                background: 'transparent',
                color: '#94a3b8',
                border: '1px solid #475569',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Очистити кеш та перезапустити
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

async function startApplication() {
  initializeInstallPrompt();
  try {
    // 250ms race timeout ensures IndexedDB will NEVER block React rendering
    await Promise.race([
      restoreDurableLocalState(),
      new Promise(resolve => setTimeout(resolve, 250))
    ]);
  } catch (error) {
    console.warn('[Storage] Durable state restore failed:', error);
  }

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('[App] Root element #root not found');
    return;
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </React.StrictMode>
  );

  // When new Service Worker activates, inform user via gentle notification toast instead of harsh instant reload
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    notifyPwaUpdateAvailable(() => {
      window.location.reload();
    });
  });

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () => {
      notifyPwaUpdateAvailable(() => {
        void updateSW(true);
      });
    },
    onOfflineReady: () => window.dispatchEvent(new CustomEvent(OFFLINE_READY_EVENT)),
    onRegisteredSW: (_swUrl, r) => {
      if (r) {
        void r.update().catch(() => undefined);
        window.setInterval(() => {
          void r.update().catch(() => undefined);
        }, 60 * 1000);
        window.addEventListener('focus', () => {
          void r.update().catch(() => undefined);
        });
      }
      window.dispatchEvent(new CustomEvent(OFFLINE_READY_EVENT));
    },
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
