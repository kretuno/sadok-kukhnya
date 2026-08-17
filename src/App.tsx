import React, { useState, useEffect } from 'react';
import { HeaderNavbar } from './components/HeaderNavbar';
import { MenuPlannerModule } from './components/modules/MenuPlannerModule';
import { RecipeCatalogModule } from './components/modules/RecipeCatalogModule';
import { ProductsModule } from './components/modules/ProductsModule';
import { SanpinNormsModule } from './components/modules/SanpinNormsModule';
import { WarehouseModule } from './components/modules/WarehouseModule';
import { ReportsModule } from './components/modules/ReportsModule';
import { AboutModule } from './components/modules/AboutModule';
import { SettingsModule } from './components/modules/SettingsModule';
import { initDatabase } from './services/db';
import { CheckCircle2, Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react';

import { PortalHubModule } from './components/modules/PortalHubModule';
import { PropertyManagementModule } from './components/modules/PropertyManagementModule';
import { StructureRegistryModule } from './components/modules/StructureRegistryModule';
import { PrintCenterModule } from './components/modules/PrintCenterModule';
import { PsychologistModule } from './components/modules/PsychologistModule';
import { GovernanceError } from './services/governance';
import { applyFullscreenModals, getFullscreenModals, UI_PREFERENCES_EVENT } from './services/uiPreferences';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('portal');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('sadok_dark_mode') === 'true';
  });
  const [fontScale, setFontScale] = useState<number>(1);
  const [dbStatus, setDbStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [dbError, setDbError] = useState<string>('');
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const updateNetwork = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    return () => {
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
    };
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('sadok_dark_mode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const applyPreference = () => applyFullscreenModals(getFullscreenModals());
    applyPreference();
    window.addEventListener(UI_PREFERENCES_EVENT, applyPreference);
    return () => window.removeEventListener(UI_PREFERENCES_EVENT, applyPreference);
  }, []);

  useEffect(() => {
    let cancelled = false;
    initDatabase()
      .then(() => { if (!cancelled) setDbStatus('ready'); })
      .catch((err) => {
        console.error('[App] DB init error:', err);
        if (!cancelled) { setDbError(String(err)); setDbStatus('error'); }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (dbStatus !== 'ready') return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    void import('./services/firebaseSync').then(module => {
      if (!cancelled) cleanup = module.startAutomaticFirebaseSync();
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [dbStatus]);

  useEffect(() => {
    const handleGovernanceError = (event: ErrorEvent) => {
      if (event.error instanceof GovernanceError) {
        event.preventDefault();
        alert(event.error.message);
      }
    };
    const handleGovernanceRejection = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof GovernanceError) {
        event.preventDefault();
        alert(event.reason.message);
      }
    };
    window.addEventListener('error', handleGovernanceError);
    window.addEventListener('unhandledrejection', handleGovernanceRejection);
    return () => {
      window.removeEventListener('error', handleGovernanceError);
      window.removeEventListener('unhandledrejection', handleGovernanceRejection);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F1') { e.preventDefault(); setActiveTab('about'); }
      else if (e.key === 'F2') { e.preventDefault(); setActiveTab('menu_planner'); }
      else if (e.key === 'F3') { e.preventDefault(); setActiveTab('recipes'); }
      else if (e.key === 'F4') { e.preventDefault(); setActiveTab('products'); }
      else if (e.key === 'F5') { e.preventDefault(); setActiveTab('warehouse'); }
      else if (e.key === 'F6') { e.preventDefault(); setActiveTab('sanpin'); }
      else if (e.key === 'F7') { e.preventDefault(); setActiveTab('reports'); }
      else if (e.key === 'F8') { e.preventDefault(); setActiveTab('property'); }
      else if (e.key === 'F9') { e.preventDefault(); setActiveTab('settings'); }
      else if (e.key === 'F10') { e.preventDefault(); setActiveTab('cadres'); }
      else if (e.key === 'F11') { e.preventDefault(); setActiveTab('print_center'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Read institution name from localStorage if set
  const instData = (() => {
    try { return JSON.parse(localStorage.getItem('sadok_institution') || '{}'); } catch { return {}; }
  })();
  const instName = instData.name || 'SADOK Екосистема';

  return (
    <div
      className={`flex flex-col min-h-screen md:h-screen md:overflow-hidden ${darkMode ? 'dark' : ''}`}
      style={{ fontSize: `${fontScale * 100}%` }}
    >
      <HeaderNavbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        fontScale={fontScale}
        setFontScale={setFontScale}
      />

      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto md:overflow-hidden relative bg-slate-100 dark:bg-slate-950">
        {dbStatus === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-slate-950 z-50 gap-3">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Завантаження бази даних…
            </span>
            <span className="text-xs text-slate-400">Зачекайте, будь ласка</span>
          </div>
        )}

        {dbStatus === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-slate-950 z-50 gap-3">
            <AlertCircle className="w-10 h-10 text-rose-500" />
            <span className="text-sm font-semibold text-rose-600">Помилка завантаження бази даних</span>
            <pre className="text-xs text-slate-500 max-w-lg text-center whitespace-pre-wrap">{dbError}</pre>
            <p className="text-xs text-slate-400">Перевстановіть офлайн-пакет SADOK або відновіть резервну копію</p>
          </div>
        )}

        {dbStatus === 'ready' && (
          <>
            {activeTab === 'portal' && <PortalHubModule onSelectModule={(tab) => setActiveTab(tab)} />}
            {activeTab === 'menu_planner' && <MenuPlannerModule />}
            {activeTab === 'property' && <PropertyManagementModule />}
            {activeTab === 'cadres' && <StructureRegistryModule />}
            {activeTab === 'psychologist' && <PsychologistModule />}
            {activeTab === 'recipes' && <RecipeCatalogModule />}
            {activeTab === 'products' && <ProductsModule />}
            {activeTab === 'sanpin' && <SanpinNormsModule />}
            {activeTab === 'warehouse' && <WarehouseModule />}
            {activeTab === 'reports' && <ReportsModule />}
            {activeTab === 'print_center' && <PrintCenterModule />}
            {activeTab === 'about' && <AboutModule />}
            {activeTab === 'settings' && <SettingsModule />}
          </>
        )}
      </main>

      {/* Status bar */}
      <footer className="bg-slate-800 text-slate-300 dark:bg-slate-950 px-4 py-1 border-t border-slate-700 text-[11px] flex justify-between items-center no-print">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-1.5 ${dbStatus === 'ready' ? 'text-emerald-400' : 'text-yellow-400'}`}>
            {dbStatus === 'ready'
              ? <CheckCircle2 className="w-3.5 h-3.5" />
              : <Loader2 className="w-3.5 h-3.5 animate-spin" />
            }
            <span className="font-semibold">
              {dbStatus === 'ready' ? 'База даних: SQLite (medsestra.db)' : 'Завантаження бази даних…'}
            </span>
          </div>
          <div className="h-3 w-px bg-slate-700" />
          <span>{instName}</span>
        </div>
        <div className="flex items-center space-x-4 text-slate-400">
          <span className={`flex items-center gap-1 ${isOnline ? 'text-emerald-400' : 'text-amber-300'}`}>
            {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {isOnline ? 'Онлайн' : 'Автономно'}
          </span>
          <span>Гарячі клавіші: F2-F9</span>
          <span>Win32 / Win64 / macOS</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
