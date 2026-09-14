import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { PWA_UPDATE_EVENT, isPwaUpdateAvailable, triggerPwaUpdate } from '../../services/offlineSupport';
import { APP_VERSION } from '../../config/version';

export const PwaUpdateNotification: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (isPwaUpdateAvailable()) {
      setShowPrompt(true);
    }

    const handleUpdateAvailable = () => {
      setShowPrompt(true);
    };

    window.addEventListener(PWA_UPDATE_EVENT, handleUpdateAvailable);
    return () => {
      window.removeEventListener(PWA_UPDATE_EVENT, handleUpdateAvailable);
    };
  }, []);

  const handleUpdate = () => {
    setIsUpdating(true);
    triggerPwaUpdate();
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <aside
      aria-label="Сповіщення про оновлення системи"
      className="fixed bottom-10 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border-2 border-blue-500/80 shadow-2xl shadow-blue-500/20 flex items-start gap-3.5 transition-all duration-300 no-print"
    >
      <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl shadow-md shrink-0 mt-0.5">
        <Sparkles className="w-5 h-5 animate-pulse" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Доступне оновлення SADOK!
          </h4>
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded text-[10px] font-bold">
            v{APP_VERSION}
          </span>
        </div>

        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-snug">
          Опубліковано свіжу версію з оптимізаціями та виправленнями. Оновіть в 1 клік без втрати даних.
        </p>

        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            onClick={handleUpdate}
            disabled={isUpdating}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'Оновлюємо…' : 'Оновити зараз'}</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="px-2.5 py-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Пізніше
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
        title="Закрити сповіщення"
      >
        <X className="w-4 h-4" />
      </button>
    </aside>
  );
};
