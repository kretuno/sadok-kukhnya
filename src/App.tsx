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
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('menu_planner');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('sadok_dark_mode') === 'true';
  });
  const [fontScale, setFontScale] = useState<number>(1);
  const [dbStatus, setDbStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [dbError, setDbError] = useState<string>('');

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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F1') { e.preventDefault(); setActiveTab('about'); }
      else if (e.key === 'F2') { e.preventDefault(); setActiveTab('menu_planner'); }
      else if (e.key === 'F3') { e.preventDefault(); setActiveTab('recipes'); }
      else if (e.key === 'F4') { e.preventDefault(); setActiveTab('products'); }
      else if (e.key === 'F5') { e.preventDefault(); setActiveTab('warehouse'); }
      else if (e.key === 'F6') { e.preventDefault(); setActiveTab('sanpin'); }
      else if (e.key === 'F7') { e.preventDefault(); setActiveTab('reports'); }
      else if (e.key === 'F9') { e.preventDefault(); setActiveTab('settings'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Read institution name from localStorage if set
  const instData = (() => {
    try { return JSON.parse(localStorage.getItem('sadok_institution') || '{}'); } catch { return {}; }
  })();
  const instName = instData.name || 'SADOK Кухня';

  return (
    <div
      className={`flex flex-col h-screen overflow-hidden ${darkMode ? 'dark' : ''}`}
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

      <main className="flex-1 overflow-hidden relative bg-slate-100 dark:bg-slate-950">
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
            <p className="text-xs text-slate-400">Перевірте підключення до інтернету та оновіть сторінку</p>
          </div>
        )}

        {dbStatus === 'ready' && (
          <>
            {activeTab === 'menu_planner' && <MenuPlannerModule />}
            {activeTab === 'recipes' && <RecipeCatalogModule />}
            {activeTab === 'products' && <ProductsModule />}
            {activeTab === 'sanpin' && <SanpinNormsModule />}
            {activeTab === 'warehouse' && <WarehouseModule />}
            {activeTab === 'reports' && <ReportsModule />}
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
          <span>Гарячі клавіші: F2-F9</span>
          <span>Win32 / Win64 / macOS</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
