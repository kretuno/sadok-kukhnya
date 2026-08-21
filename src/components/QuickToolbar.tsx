import React from 'react';
import { Plus, Printer, FileSpreadsheet, Download, RefreshCw, Search, HelpCircle } from 'lucide-react';

interface QuickToolbarProps {
  onAdd?: () => void;
  onRefresh?: () => void;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  onPrint?: () => void;
  onShowGuide?: () => void;
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  title?: string;
}

export const QuickToolbar: React.FC<QuickToolbarProps> = ({
  onAdd,
  onRefresh,
  onExportExcel,
  onExportPDF,
  onPrint,
  onShowGuide,
  searchTerm,
  setSearchTerm,
  title
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-slate-200/80 dark:bg-slate-900/80 border-b border-slate-300 dark:border-slate-800 text-xs no-print flex-wrap gap-2">
      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Додати</span>
          </button>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded transition"
            title="Оновити дані"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Оновити</span>
          </button>
        )}

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

        {onExportExcel && (
          <button
            onClick={onExportExcel}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium shadow-sm transition"
            title="Вивантажити в Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
        )}

        {onExportPDF && (
          <button
            onClick={onExportPDF}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-medium shadow-sm transition"
            title="Зберегти в PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
        )}

        {onPrint && (
          <button
            onClick={onPrint}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded font-medium shadow-sm transition"
            title="Друк"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Друк</span>
          </button>
        )}

        {title && <span className="font-semibold text-slate-700 dark:text-slate-200 ml-2">{title}</span>}

        {onShowGuide && (
          <button
            onClick={onShowGuide}
            className="p-1 rounded-full bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 transition flex items-center justify-center shadow-xs hover:scale-105 ml-1"
            title="Покрокова інструкція: з чого почати та як заповнювати"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {setSearchTerm !== undefined && (
        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
          <input
            type="text"
            value={searchTerm || ''}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Пошук..."
            className="w-full pl-8 pr-3 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  );
};
