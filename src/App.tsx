import React, { useState, useEffect, Suspense, lazy } from 'react';
import { HeaderNavbar } from './components/HeaderNavbar';
import { initDatabase } from './services/db';
import { CheckCircle2, Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { GovernanceError } from './services/governance';
import { applyFullscreenModals, getFullscreenModals, UI_PREFERENCES_EVENT } from './services/uiPreferences';
import { PwaUpdateNotification } from './components/common/PwaUpdateNotification';
import { MainPortalLanding } from './components/landing/MainPortalLanding';
import { ParentSpaceView } from './components/landing/ParentSpaceView';
import { 
  getCurrentPortalRole, 
  clearPortalRole, 
  PORTAL_ROLE_EVENT, 
  PortalRole 
} from './services/portalSecurity';

// Lazy-loaded modules for lightning-fast startup and memory efficiency
const PortalHubModule = lazy(() => import('./components/modules/PortalHubModule').then(m => ({ default: m.PortalHubModule })));
const MenuPlannerModule = lazy(() => import('./components/modules/MenuPlannerModule').then(m => ({ default: m.MenuPlannerModule })));
const PropertyManagementModule = lazy(() => import('./components/modules/PropertyManagementModule').then(m => ({ default: m.PropertyManagementModule })));
const StructureRegistryModule = lazy(() => import('./components/modules/StructureRegistryModule').then(m => ({ default: m.StructureRegistryModule })));
const PsychologistModule = lazy(() => import('./components/modules/PsychologistModule').then(m => ({ default: m.PsychologistModule })));
const RecipeCatalogModule = lazy(() => import('./components/modules/RecipeCatalogModule').then(m => ({ default: m.RecipeCatalogModule })));
const ProductsModule = lazy(() => import('./components/modules/ProductsModule').then(m => ({ default: m.ProductsModule })));
const SanpinNormsModule = lazy(() => import('./components/modules/SanpinNormsModule').then(m => ({ default: m.SanpinNormsModule })));
const WarehouseModule = lazy(() => import('./components/modules/WarehouseModule').then(m => ({ default: m.WarehouseModule })));
const ReportsModule = lazy(() => import('./components/modules/ReportsModule').then(m => ({ default: m.ReportsModule })));
const PrintCenterModule = lazy(() => import('./components/modules/PrintCenterModule').then(m => ({ default: m.PrintCenterModule })));
const AboutModule = lazy(() => import('./components/modules/AboutModule').then(m => ({ default: m.AboutModule })));
const SettingsModule = lazy(() => import('./components/modules/SettingsModule').then(m => ({ default: m.SettingsModule })));
const MedicalModule = lazy(() => import('./components/modules/MedicalModule').then(m => ({ default: m.MedicalModule })));

function ModuleLoadingFallback() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[350px] p-6 text-slate-500 dark:text-slate-400">
      <div className="p-3 bg-blue-50 dark:bg-blue-950/60 rounded-2xl border border-blue-200 dark:border-blue-900/50 mb-3 shadow-sm animate-pulse">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
        Завантаження розділу…
      </span>
      <span className="text-[11px] text-slate-400 mt-1">Оптимізація пам'яті для швидкої роботи</span>
    </div>
  );
}

export function App() {
  const [activeTab, setActiveTab] = useState<string>('portal');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('sadok_dark_mode') === 'true';
  });
  const [fontScale, setFontScale] = useState<number>(1);
  const [dbStatus, setDbStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [dbError, setDbError] = useState<string>('');
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [portalRole, setPortalRole] = useState<PortalRole>(() => getCurrentPortalRole());

  useEffect(() => {
    const handleRoleChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ role: PortalRole }>;
      if (customEvent.detail?.role) {
        setPortalRole(customEvent.detail.role);
      } else {
        setPortalRole(getCurrentPortalRole());
      }
    };
    window.addEventListener(PORTAL_ROLE_EVENT, handleRoleChange);
    return () => window.removeEventListener(PORTAL_ROLE_EVENT, handleRoleChange);
  }, []);

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
      if (portalRole !== 'director' && portalRole !== 'staff') return;
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
  }, [portalRole]);

  // Read institution name from localStorage if set
  const instData = (() => {
    try { return JSON.parse(localStorage.getItem('sadok_institution') || '{}'); } catch { return {}; }
  })();
  const instName = instData.name || 'SADOK Екосистема';

  // Role: Guest (Mother Landing Page with 3 Doors)
  if (portalRole === 'guest') {
    return (
      <div
        className={`min-h-screen ${darkMode ? 'dark' : ''}`}
        style={{ fontSize: `${fontScale * 100}%` }}
      >
        <MainPortalLanding
          onSelectRole={(role) => {
            setPortalRole(role);
            if (role === 'director') {
              setActiveTab('portal');
            }
          }}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(prev => !prev)}
        />
        <PwaUpdateNotification />
      </div>
    );
  }

  // Role: Parent (Open Parent Space with Menu, Schedule, Services)
  if (portalRole === 'parent') {
    return (
      <div
        className={`min-h-screen ${darkMode ? 'dark' : ''}`}
        style={{ fontSize: `${fontScale * 100}%` }}
      >
        <ParentSpaceView
          onBackToLanding={() => {
            clearPortalRole();
            setPortalRole('guest');
          }}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(prev => !prev)}
        />
        <PwaUpdateNotification />
      </div>
    );
  }

  // Role: Director or Staff (Full application workspace)
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
        portalRole={portalRole}
        onExitToLanding={() => {
          clearPortalRole();
          setPortalRole('guest');
        }}
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
          <Suspense fallback={<ModuleLoadingFallback />}>
            {activeTab === 'portal' && <PortalHubModule onSelectModule={(tab) => setActiveTab(tab)} portalRole={portalRole} />}
            {activeTab === 'menu_planner' && <MenuPlannerModule />}
            {activeTab === 'property' && <PropertyManagementModule />}
            {activeTab === 'cadres' && <StructureRegistryModule />}
            {activeTab === 'medical' && <MedicalModule />}
            {activeTab === 'psychologist' && <PsychologistModule />}
            {activeTab === 'recipes' && <RecipeCatalogModule />}
            {activeTab === 'products' && <ProductsModule />}
            {activeTab === 'sanpin' && <SanpinNormsModule />}
            {activeTab === 'warehouse' && <WarehouseModule />}
            {activeTab === 'reports' && <ReportsModule />}
            {activeTab === 'print_center' && <PrintCenterModule />}
            {activeTab === 'about' && <AboutModule />}
            {activeTab === 'settings' && <SettingsModule />}
          </Suspense>
        )}
      </main>

      {/* PWA Update Toast Notification */}
      <PwaUpdateNotification />

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
