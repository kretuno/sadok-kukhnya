import React, { useState, useEffect } from 'react';
import { ProductHistoryData } from '../../types';
import { getProductHistory } from '../../services/db';
import { Package, FileText, Calendar, Utensils, DollarSign, Clock, Tag, X, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface ProductHistoryModalProps {
  productId: number | null;
  onClose: () => void;
}

const formatQty = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '0';
  return Number(Math.round(num * 10000) / 10000).toString();
};

export const ProductHistoryModal: React.FC<ProductHistoryModalProps> = ({ productId, onClose }) => {
  const [data, setData] = useState<ProductHistoryData | null>(null);
  const [activeTab, setActiveTab] = useState<'batches' | 'usages'>('batches');

  useEffect(() => {
    if (productId !== null) {
      setData(getProductHistory(productId));
    } else {
      setData(null);
    }
  }, [productId]);

  if (!productId || !data) return null;

  const { product, categoryName, totalStockKg, totalStockCost, batches, usages } = data;

  const formatDate = (dStr: string) => {
    if (!dStr) return '—';
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? dStr : d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-800 text-white dark:bg-slate-950 flex justify-between items-center border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">{product.NAME}</h2>
                <span className="px-2 py-0.5 bg-blue-900/80 text-blue-300 border border-blue-700 rounded-full text-[10px] font-semibold">
                  {categoryName}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Картка руху продукту • Базова ціна: <strong>{product.CENA} грн/{product.EDINICA_IZMERENIA}</strong> • Відходи: <strong>{product.PROCENT_OTXODOV}%</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metrics Banner */}
        <div className="grid grid-cols-4 gap-3 p-3 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center space-x-2.5">
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-lg">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Залишок на складі</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">{formatQty(totalStockKg)} {product.EDINICA_IZMERENIA}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center space-x-2.5">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-950 text-blue-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Вартість залишків</span>
              <span className="font-bold text-blue-600 dark:text-blue-400 text-xs">{totalStockCost.toFixed(2)} грн</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center space-x-2.5">
            <div className="p-1.5 bg-amber-100 dark:bg-amber-950 text-amber-600 rounded-lg">
              <ArrowDownRight className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Партій приходу</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 text-xs">{batches.length} партій</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center space-x-2.5">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 rounded-lg">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Використань у меню</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">{usages.length} запозичень</span>
            </div>
          </div>
        </div>

        {/* Sub Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 pt-2 bg-white dark:bg-slate-900 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('batches')}
            className={`px-4 py-2 flex items-center space-x-1.5 border-b-2 transition ${
              activeTab === 'batches'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Історія приходу та складських партій ({batches.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('usages')}
            className={`px-4 py-2 flex items-center space-x-1.5 border-b-2 transition ${
              activeTab === 'usages'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Використання у меню та стравах ({usages.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-auto flex-1 bg-slate-50 dark:bg-slate-950 text-xs">
          {activeTab === 'batches' ? (
            <table className="table-grid bg-white dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
              <thead>
                <tr>
                  <th className="w-16">Партія #</th>
                  <th>Номер документа</th>
                  <th>Дата приходу</th>
                  <th>Постачальник</th>
                  <th>Надійшло</th>
                  <th>Залишок</th>
                  <th>Ціна</th>
                  <th>Термін придатності</th>
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400 italic">
                      Історія приходу для цього продукту відсутня.
                    </td>
                  </tr>
                ) : (
                  batches.map(b => (
                    <tr key={b.ID}>
                      <td className="font-mono text-slate-500">#{b.ID}</td>
                      <td className="font-semibold text-slate-800 dark:text-slate-100">{b.NOMER_DOCUMENTA || '—'}</td>
                      <td>{formatDate(b.INVOICE_DATE)}</td>
                      <td className="font-medium text-slate-700 dark:text-slate-300">{b.firmName || '—'}</td>
                      <td>{formatQty(b.KOLVO_KG)} {product.EDINICA_IZMERENIA}</td>
                      <td className="font-bold text-emerald-600 dark:text-emerald-400">{formatQty(b.OST_KG)} {product.EDINICA_IZMERENIA}</td>
                      <td className="font-semibold">{b.CENA.toFixed(2)} грн</td>
                      <td>
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded text-[11px]">
                          до {formatDate(b.SROK_GODNOSTI)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="table-grid bg-white dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
              <thead>
                <tr>
                  <th>Дата меню</th>
                  <th>Прийом їжі</th>
                  <th>Страва</th>
                  <th>Норма брутто (г)</th>
                  <th>Норма нетто (г)</th>
                </tr>
              </thead>
              <tbody>
                {usages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400 italic">
                      Цей продукт ще не використовувався у зафіксованих меню.
                    </td>
                  </tr>
                ) : (
                  usages.map(u => (
                    <tr key={u.ID}>
                      <td className="font-semibold text-slate-800 dark:text-slate-100">{formatDate(u.menuDate)}</td>
                      <td>
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded text-[11px] font-semibold">
                          {u.MEAL_TYPE}
                        </span>
                      </td>
                      <td className="font-bold text-slate-800 dark:text-slate-200">{u.dishName}</td>
                      <td className="font-bold text-blue-600 dark:text-blue-400">{u.GROSSO_GR} г</td>
                      <td className="text-slate-600 dark:text-slate-400">{u.NETTO_GR} г</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
          >
            Закрити
          </button>
        </div>
      </div>
    </div>
  );
};
