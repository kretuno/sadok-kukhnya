import React, { useState, useEffect } from 'react';
import { QuickToolbar } from '../QuickToolbar';
import { exportToExcel, exportToPDF } from '../../services/export';
import { BarChart3, CheckCircle, AlertTriangle, FileText, Info, Edit2, Save, RotateCcw, Plus, Trash2 } from 'lucide-react';

interface NormItem {
  id: string;
  category: string;
  normGrams: number;
  actualAvgGrams: number;
  unit: string;
}

const DEFAULT_NORMS_1_3: NormItem[] = [
  { id: '1', category: 'Молоко та кисломолочні продукти', normGrams: 390, actualAvgGrams: 405, unit: 'г' },
  { id: '2', category: 'Масло вершкове', normGrams: 18, actualAvgGrams: 17.5, unit: 'г' },
  { id: '3', category: 'Хліб пшеничний', normGrams: 60, actualAvgGrams: 58, unit: 'г' },
  { id: '4', category: 'Хліб житній', normGrams: 30, actualAvgGrams: 28, unit: 'г' },
  { id: '5', category: 'Картопля', normGrams: 120, actualAvgGrams: 125, unit: 'г' },
  { id: '6', category: 'Овочі та зелень', normGrams: 200, actualAvgGrams: 190, unit: 'г' },
  { id: '7', category: 'Фрукти свіжі', normGrams: 95, actualAvgGrams: 100, unit: 'г' },
  { id: '8', category: 'М\'ясо (яловичина, птиця)', normGrams: 50, actualAvgGrams: 52, unit: 'г' },
  { id: '9', category: 'Риба (філе)', normGrams: 32, actualAvgGrams: 30, unit: 'г' },
  { id: '10', category: 'Крупи, макаронні вироби', normGrams: 30, actualAvgGrams: 31, unit: 'г' },
  { id: '11', category: 'Цукор', normGrams: 30, actualAvgGrams: 29, unit: 'г' },
  { id: '12', category: 'Яйце (шт / 10 днів)', normGrams: 4, actualAvgGrams: 4, unit: 'шт' },
];

const DEFAULT_NORMS_3_7: NormItem[] = [
  { id: '1', category: 'Молоко та кисломолочні продукти', normGrams: 450, actualAvgGrams: 460, unit: 'г' },
  { id: '2', category: 'Масло вершкове', normGrams: 21, actualAvgGrams: 20.5, unit: 'г' },
  { id: '3', category: 'Хліб пшеничний', normGrams: 80, actualAvgGrams: 82, unit: 'г' },
  { id: '4', category: 'Хліб житній', normGrams: 50, actualAvgGrams: 48, unit: 'г' },
  { id: '5', category: 'Картопля', normGrams: 140, actualAvgGrams: 142, unit: 'г' },
  { id: '6', category: 'Овочі та зелень', normGrams: 260, actualAvgGrams: 250, unit: 'г' },
  { id: '7', category: 'Фрукти свіжі', normGrams: 100, actualAvgGrams: 105, unit: 'г' },
  { id: '8', category: 'М\'ясо (яловичина, птиця)', normGrams: 60, actualAvgGrams: 61, unit: 'г' },
  { id: '9', category: 'Риба (філе)', normGrams: 37, actualAvgGrams: 35, unit: 'г' },
  { id: '10', category: 'Крупи, макаронні вироби', normGrams: 43, actualAvgGrams: 42, unit: 'г' },
  { id: '11', category: 'Цукор', normGrams: 37, actualAvgGrams: 36, unit: 'г' },
  { id: '12', category: 'Яйце (шт / 10 днів)', normGrams: 5, actualAvgGrams: 5, unit: 'шт' },
];

export const SanpinNormsModule: React.FC = () => {
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('1-3');
  const [isEditingMode, setIsEditingMode] = useState<boolean>(false);

  const [norms13, setNorms13] = useState<NormItem[]>(() => {
    const saved = localStorage.getItem('medsestra_sanpin_1_3');
    return saved ? JSON.parse(saved) : DEFAULT_NORMS_1_3;
  });

  const [norms37, setNorms37] = useState<NormItem[]>(() => {
    const saved = localStorage.getItem('medsestra_sanpin_3_7');
    return saved ? JSON.parse(saved) : DEFAULT_NORMS_3_7;
  });

  const currentNorms = selectedAgeGroup === '1-3' ? norms13 : norms37;

  const saveToStorage = (updated13: NormItem[], updated37: NormItem[]) => {
    localStorage.setItem('medsestra_sanpin_1_3', JSON.stringify(updated13));
    localStorage.setItem('medsestra_sanpin_3_7', JSON.stringify(updated37));
  };

  const handleUpdateItem = (index: number, field: keyof NormItem, value: any) => {
    if (selectedAgeGroup === '1-3') {
      const updated = [...norms13];
      updated[index] = { ...updated[index], [field]: value };
      setNorms13(updated);
      saveToStorage(updated, norms37);
    } else {
      const updated = [...norms37];
      updated[index] = { ...updated[index], [field]: value };
      setNorms37(updated);
      saveToStorage(norms13, updated);
    }
  };

  const handleAddItem = () => {
    const newItem: NormItem = {
      id: Date.now().toString(),
      category: 'Нова категорія',
      normGrams: 50,
      actualAvgGrams: 50,
      unit: 'г'
    };
    if (selectedAgeGroup === '1-3') {
      const updated = [...norms13, newItem];
      setNorms13(updated);
      saveToStorage(updated, norms37);
    } else {
      const updated = [...norms37, newItem];
      setNorms37(updated);
      saveToStorage(norms13, updated);
    }
  };

  const handleDeleteItem = (index: number) => {
    if (selectedAgeGroup === '1-3') {
      const updated = norms13.filter((_, i) => i !== index);
      setNorms13(updated);
      saveToStorage(updated, norms37);
    } else {
      const updated = norms37.filter((_, i) => i !== index);
      setNorms37(updated);
      saveToStorage(norms13, updated);
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Скинути норми харчування до стандартних значень КМУ №1124?')) {
      setNorms13(DEFAULT_NORMS_1_3);
      setNorms37(DEFAULT_NORMS_3_7);
      saveToStorage(DEFAULT_NORMS_1_3, DEFAULT_NORMS_3_7);
    }
  };

  const handleExportExcel = () => {
    const headers = ['Група продуктів', 'Норма (г)', 'Фактично (г)', 'Виконання (%)'];
    const rows = currentNorms.map(item => {
      const pct = item.normGrams > 0 ? (item.actualAvgGrams / item.normGrams) * 100 : 0;
      return [item.category, `${item.normGrams} ${item.unit}`, `${item.actualAvgGrams} ${item.unit}`, `${pct.toFixed(1)}%`];
    });
    exportToExcel(`Накопичувальна_відомість_${selectedAgeGroup}`, 'Норми харчування', headers, rows);
  };

  const handleExportPDF = () => {
    const headers = ['Група продуктів', 'Норма', 'Фактично', 'Виконання %'];
    const rows = currentNorms.map(item => {
      const pct = item.normGrams > 0 ? (item.actualAvgGrams / item.normGrams) * 100 : 0;
      return [item.category, `${item.normGrams} ${item.unit}`, `${item.actualAvgGrams} ${item.unit}`, `${pct.toFixed(1)}%`];
    });
    exportToPDF(`Накопичувальна відомість норм харчування (${selectedAgeGroup} роки)`, headers, rows);
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-950">
      <QuickToolbar
        onRefresh={() => {}}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        onPrint={() => window.print()}
        title="Норми харчування — Постанова КМУ №1124 від 17.11.2021"
      />

      <div className="flex-1 p-4 overflow-auto">
        {/* Regulation reference info */}
        <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start space-x-2 text-xs text-blue-800 dark:text-blue-300">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Правова основа:</span> Постанова Кабінету Міністрів України № 1124 від 17.11.2021
            «Про затвердження норм та порядку організації харчування у закладах освіти та дитячих закладах оздоровлення та відпочинку».
            Ви можете редагувати нормативні показники нижче для вашого закладу.
          </div>
        </div>

        {/* Age Group Selector & Control Buttons */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Вікова група:</span>
            <div className="flex rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700">
              {[
                { id: '1-3', label: 'Ясла (1–3 роки)' },
                { id: '3-7', label: 'Сад (3–7 років)' },
              ].map(grp => (
                <button
                  key={grp.id}
                  onClick={() => setSelectedAgeGroup(grp.id)}
                  className={`px-4 py-1.5 text-xs font-bold transition ${
                    selectedAgeGroup === grp.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {grp.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2 no-print">
            <button
              onClick={() => setIsEditingMode(!isEditingMode)}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                isEditingMode
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isEditingMode ? <Save className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
              <span>{isEditingMode ? 'Завершити редагування' : 'Редагувати норми'}</span>
            </button>

            {isEditingMode && (
              <button
                onClick={handleAddItem}
                className="flex items-center space-x-1 px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>Додати категорію</span>
              </button>
            )}

            <button
              onClick={handleResetDefaults}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition"
              title="Скинути до стандартних норм КМУ"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Скинути</span>
            </button>
          </div>
        </div>

        {/* Norms Table */}
        <div className="card-glass overflow-hidden shadow-sm">
          <div className="p-2.5 bg-slate-200/70 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Норми харчування на одну дитину на день — вікова група {selectedAgeGroup === '1-3' ? 'Ясла (1-3 роки)' : 'Садок (3-7 років)'}
            </span>
            {isEditingMode && (
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                ✏️ Режим редагування активний — змінюйте значення у таблиці
              </span>
            )}
          </div>
          <div className="overflow-auto">
            <table className="table-grid">
              <thead>
                <tr>
                  <th className="w-8">№</th>
                  <th>Група продуктів</th>
                  <th className="text-center w-36">Норма (г/шт)</th>
                  <th className="text-center w-36">Фактично (г)</th>
                  <th className="text-center w-40">Виконання</th>
                  <th className="text-center w-28">Статус</th>
                  {isEditingMode && <th className="w-12 text-center no-print">Дії</th>}
                </tr>
              </thead>
              <tbody>
                {currentNorms.map((item, idx) => {
                  const pct = item.normGrams > 0 ? (item.actualAvgGrams / item.normGrams) * 100 : 0;
                  const ok = pct >= 90;
                  const warn = pct >= 75 && pct < 90;
                  return (
                    <tr key={item.id || idx}>
                      <td className="text-center text-slate-500">{idx + 1}</td>
                      <td>
                        {isEditingMode ? (
                          <input
                            type="text"
                            value={item.category}
                            onChange={(e) => handleUpdateItem(idx, 'category', e.target.value)}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold"
                          />
                        ) : (
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{item.category}</span>
                        )}
                      </td>
                      <td className="text-center">
                        {isEditingMode ? (
                          <div className="flex items-center space-x-1 justify-center">
                            <input
                              type="number"
                              step="0.1"
                              value={item.normGrams}
                              onChange={(e) => handleUpdateItem(idx, 'normGrams', Number(e.target.value))}
                              className="w-20 px-2 py-1 text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold text-blue-600"
                            />
                            <span className="text-xs text-slate-500 font-medium">{item.unit}</span>
                          </div>
                        ) : (
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{item.normGrams} {item.unit}</span>
                        )}
                      </td>
                      <td className="text-center">
                        {isEditingMode ? (
                          <div className="flex items-center space-x-1 justify-center">
                            <input
                              type="number"
                              step="0.1"
                              value={item.actualAvgGrams}
                              onChange={(e) => handleUpdateItem(idx, 'actualAvgGrams', Number(e.target.value))}
                              className="w-20 px-2 py-1 text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold text-emerald-600"
                            />
                            <span className="text-xs text-slate-500 font-medium">{item.unit}</span>
                          </div>
                        ) : (
                          <span className={`font-bold ${ok ? 'text-emerald-600 dark:text-emerald-400' : warn ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600'}`}>
                            {item.actualAvgGrams} {item.unit}
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${ok ? 'bg-emerald-500' : warn ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${ok ? 'text-emerald-600' : warn ? 'text-amber-600' : 'text-rose-600'}`}>
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="text-center">
                        {ok ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-bold">Норма</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-bold">{warn ? 'Увага' : 'Нижче норми'}</span>
                          </span>
                        )}
                      </td>
                      {isEditingMode && (
                        <td className="text-center no-print">
                          <button
                            onClick={() => handleDeleteItem(idx)}
                            className="p-1 text-rose-500 hover:bg-rose-100 rounded transition"
                            title="Видалити категорію"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: 'Виконано (≥90%)', count: currentNorms.filter(n => n.normGrams > 0 && (n.actualAvgGrams / n.normGrams) >= 0.9).length, color: 'emerald' },
            { label: 'Увага (75–90%)', count: currentNorms.filter(n => { if (n.normGrams === 0) return false; const p = n.actualAvgGrams / n.normGrams; return p >= 0.75 && p < 0.9; }).length, color: 'amber' },
            { label: 'Нижче норми (<75%)', count: currentNorms.filter(n => n.normGrams > 0 && (n.actualAvgGrams / n.normGrams) < 0.75).length, color: 'rose' },
          ].map(s => (
            <div key={s.label} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center shadow-sm">
              <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{s.count}</div>
              <div className="text-xs text-slate-500 font-semibold">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
