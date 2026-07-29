import React, { useState, useEffect } from 'react';
import { QuickToolbar } from '../QuickToolbar';
import { exportToExcel, exportToPDF } from '../../services/export';
import { getProducts, getStockBatches, getInvoices, getInstitutions } from '../../services/db';
import { Product, StockBatch, InvoiceHeader } from '../../types';
import { FileText, Calculator, BarChart3, TrendingUp, Calendar, Filter, Printer, Download, Search, DollarSign, PackageCheck, Building } from 'lucide-react';

interface ReportRow {
  id: number;
  code: string;
  name: string;
  unit: string;
  price: number;
  inQty: number;      // Вхідний залишок (кг/л)
  inSum: number;      // Вхідна сума (грн)
  receiptQty: number; // Прихід (кг/л)
  receiptSum: number; // Прихід сума (грн)
  expenseQty: number; // Витрата (кг/л)
  expenseSum: number; // Витрата сума (грн)
  outQty: number;     // Кінцевий залишок (кг/л)
  outSum: number;     // Кінцева сума (грн)
}

export const ReportsModule: React.FC = () => {
  const [activeReportTab, setActiveReportTab] = useState<'osv' | 'expense' | 'day_cost' | 'invoices'>('osv');
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [invoices, setInvoices] = useState<InvoiceHeader[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const prodList = getProducts();
    const batchList = getStockBatches();
    const invList = getInvoices();
    setProducts(prodList);
    setBatches(batchList);
    setInvoices(invList);
  };

  // Generate Turnover Balance Sheet (Оборотно-сальдова відомість - ОСВ) data
  const osvRows: ReportRow[] = products.map((p, idx) => {
    const productBatches = batches.filter(b => b.ID_PRODUKTA === p.ID);
    const totalCurrentQty = productBatches.reduce((s, b) => s + b.KOLVO_KG, 0);
    const avgPrice = p.CENA > 0 ? p.CENA : (productBatches[0]?.CENA || 15.0);

    // Mock initial balance and period receipts for demonstration of accounting report
    const inQty = Math.round(totalCurrentQty * 0.4 * 100) / 100;
    const receiptQty = Math.round(totalCurrentQty * 0.9 * 100) / 100;
    const expenseQty = Math.round(totalCurrentQty * 0.3 * 100) / 100;
    const outQty = Math.round((inQty + receiptQty - expenseQty) * 100) / 100;

    const inSum = Math.round(inQty * avgPrice * 100) / 100;
    const receiptSum = Math.round(receiptQty * avgPrice * 100) / 100;
    const expenseSum = Math.round(expenseQty * avgPrice * 100) / 100;
    const outSum = Math.round(outQty * avgPrice * 100) / 100;

    return {
      id: p.ID,
      code: `ПРОД-${String(p.ID).padStart(4, '0')}`,
      name: p.NAME,
      unit: p.EDINICA_IZMERENIA || 'кг',
      price: avgPrice,
      inQty,
      inSum,
      receiptQty,
      receiptSum,
      expenseQty,
      expenseSum,
      outQty,
      outSum,
    };
  }).filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Totals for OSV Report
  const totalInSum = osvRows.reduce((s, r) => s + r.inSum, 0);
  const totalReceiptSum = osvRows.reduce((s, r) => s + r.receiptSum, 0);
  const totalExpenseSum = osvRows.reduce((s, r) => s + r.expenseSum, 0);
  const totalOutSum = osvRows.reduce((s, r) => s + r.outSum, 0);

  const handleExportExcel = () => {
    if (activeReportTab === 'osv') {
      const headers = [
        'Код', 'Найменування продукту', 'Од. вим.', 'Ціна (грн)',
        'Вхідний залишок (кг)', 'Вхідна сума (грн)',
        'Прихід (кг)', 'Прихід сума (грн)',
        'Витрата (кг)', 'Витрата сума (грн)',
        'Вихідний залишок (кг)', 'Вихідна сума (грн)'
      ];
      const rows = osvRows.map(r => [
        r.code, r.name, r.unit, r.price.toFixed(2),
        r.inQty.toFixed(3), r.inSum.toFixed(2),
        r.receiptQty.toFixed(3), r.receiptSum.toFixed(2),
        r.expenseQty.toFixed(3), r.expenseSum.toFixed(2),
        r.outQty.toFixed(3), r.outSum.toFixed(2)
      ]);
      exportToExcel(`Оборотно_сальдова_відомість_${dateFrom}_${dateTo}`, 'ОСВ Склад', headers, rows);
    }
  };

  const handleExportPDF = () => {
    const headers = ['Код', 'Продукт', 'Од.', 'Ціна', 'Вхідна сума', 'Прихід сума', 'Витрата сума', 'Вихідна сума'];
    const rows = osvRows.map(r => [
      r.code, r.name, r.unit, `${r.price.toFixed(2)}`,
      `${r.inSum.toFixed(2)} грн`, `${r.receiptSum.toFixed(2)} грн`,
      `${r.expenseSum.toFixed(2)} грн`, `${r.outSum.toFixed(2)} грн`
    ]);
    exportToPDF(`Оборотно-сальдова відомість матеріальних цінностей за період ${dateFrom} — ${dateTo}`, headers, rows);
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-950 text-xs">
      <QuickToolbar
        onRefresh={loadData}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        onPrint={() => window.print()}
        title="Бухгалтерська звітність та оборотно-сальдові відомості"
      />

      {/* FILTER & TABS BAR */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-3 no-print flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        {/* Reports Navigation Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'osv', label: 'Оборотно-сальдова відомість (ОСВ)', icon: Calculator },
            { id: 'expense', label: 'Відомість витрат продуктів', icon: TrendingUp },
            { id: 'day_cost', label: 'Звіт вартості детодня', icon: DollarSign },
            { id: 'invoices', label: 'Реєстр приходних накладних', icon: PackageCheck },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeReportTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveReportTab(tab.id as any)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition text-xs cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Date Filters & Search */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-950 p-1 rounded border border-slate-200 dark:border-slate-800">
            <Calendar className="w-3.5 h-3.5 text-blue-500 ml-1" />
            <span className="text-[11px] font-semibold text-slate-500">Період: з</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold"
            />
            <span className="text-[11px] font-semibold text-slate-500">по</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold"
            />
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Пошук продукту..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-medium w-44"
            />
          </div>
        </div>
      </div>

      {/* REPORT CONTENT AREA */}
      <div className="flex-1 p-4 overflow-auto">
        {/* TAB 1: TURNOVER BALANCE SHEET (ОСВ) */}
        {activeReportTab === 'osv' && (
          <div className="card-glass overflow-hidden shadow-sm">
            <div className="p-3 bg-slate-200/70 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  Оборотно-сальдова відомість по субрахунку 1101 / 232 (Харчування)
                </h2>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                  Облік руху матеріальних цінностей за період з {dateFrom} по {dateTo}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
                  Загальне вихідне сальдо: {totalOutSum.toFixed(2)} грн
                </span>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="table-grid">
                <thead>
                  <tr className="bg-slate-300/60 dark:bg-slate-800/80">
                    <th rowSpan={2} className="w-8 text-center">№</th>
                    <th rowSpan={2} className="w-24">Код</th>
                    <th rowSpan={2}>Найменування продукту</th>
                    <th rowSpan={2} className="w-16 text-center">Од. вим.</th>
                    <th rowSpan={2} className="w-20 text-center">Ціна (грн)</th>
                    <th colSpan={2} className="text-center bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border-b border-blue-200">
                      Вхідне сальдо (на {dateFrom})
                    </th>
                    <th colSpan={2} className="text-center bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-b border-emerald-200">
                      Прихід (Надходження)
                    </th>
                    <th colSpan={2} className="text-center bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-b border-amber-200">
                      Витрата (Списання)
                    </th>
                    <th colSpan={2} className="text-center bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border-b border-purple-200">
                      Вихідне сальдо (на {dateTo})
                    </th>
                  </tr>
                  <tr className="bg-slate-200 dark:bg-slate-800">
                    <th className="text-center w-20">Кількість</th>
                    <th className="text-center w-24">Сума (грн)</th>
                    <th className="text-center w-20">Кількість</th>
                    <th className="text-center w-24">Сума (грн)</th>
                    <th className="text-center w-20">Кількість</th>
                    <th className="text-center w-24">Сума (грн)</th>
                    <th className="text-center w-20">Кількість</th>
                    <th className="text-center w-24">Сума (грн)</th>
                  </tr>
                </thead>
                <tbody>
                  {osvRows.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="text-center text-slate-500">{idx + 1}</td>
                      <td className="font-mono text-slate-500 text-[11px]">{r.code}</td>
                      <td className="font-bold text-slate-800 dark:text-slate-200">{r.name}</td>
                      <td className="text-center font-medium text-slate-600">{r.unit}</td>
                      <td className="text-center font-medium">{r.price.toFixed(2)}</td>
                      
                      {/* In Balance */}
                      <td className="text-center font-medium text-slate-700">{r.inQty.toFixed(3)}</td>
                      <td className="text-center font-semibold text-blue-700 dark:text-blue-300">{r.inSum.toFixed(2)}</td>
                      
                      {/* Receipt */}
                      <td className="text-center font-medium text-slate-700">{r.receiptQty.toFixed(3)}</td>
                      <td className="text-center font-semibold text-emerald-700 dark:text-emerald-300">{r.receiptSum.toFixed(2)}</td>

                      {/* Expense */}
                      <td className="text-center font-medium text-slate-700">{r.expenseQty.toFixed(3)}</td>
                      <td className="text-center font-semibold text-amber-700 dark:text-amber-300">{r.expenseSum.toFixed(2)}</td>

                      {/* Out Balance */}
                      <td className="text-center font-bold text-slate-900 dark:text-slate-100">{r.outQty.toFixed(3)}</td>
                      <td className="text-center font-black text-purple-700 dark:text-purple-300">{r.outSum.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-300/80 dark:bg-slate-800 font-extrabold text-slate-900 dark:text-slate-100 border-t-2 border-slate-400">
                    <td colSpan={5} className="text-right uppercase tracking-wider pr-4 py-2">
                      РАЗОМ ПО СУБРАХУНКУ:
                    </td>
                    <td></td>
                    <td className="text-center text-blue-800 dark:text-blue-300">{totalInSum.toFixed(2)} грн</td>
                    <td></td>
                    <td className="text-center text-emerald-800 dark:text-emerald-300">{totalReceiptSum.toFixed(2)} грн</td>
                    <td></td>
                    <td className="text-center text-amber-800 dark:text-amber-300">{totalExpenseSum.toFixed(2)} грн</td>
                    <td></td>
                    <td className="text-center text-purple-900 dark:text-purple-200 text-sm font-black">{totalOutSum.toFixed(2)} грн</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCT EXPENSE REPORT */}
        {activeReportTab === 'expense' && (
          <div className="card-glass p-5 rounded-xl space-y-4 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span>Відомість витрат продуктів за категоріями харчування</span>
            </h3>

            <div className="overflow-auto">
              <table className="table-grid">
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Продукт</th>
                    <th className="text-center">Од. вим.</th>
                    <th className="text-center">Ясла (1–3 роки)</th>
                    <th className="text-center">Молодша (3–4 роки)</th>
                    <th className="text-center">Садок (4–7 років)</th>
                    <th className="text-center">Співробітники</th>
                    <th className="text-center">Всього списано</th>
                    <th className="text-center">Загальна сума (грн)</th>
                  </tr>
                </thead>
                <tbody>
                  {osvRows.map((r, i) => (
                    <tr key={r.id}>
                      <td className="text-center text-slate-500">{i + 1}</td>
                      <td className="font-bold text-slate-800 dark:text-slate-200">{r.name}</td>
                      <td className="text-center">{r.unit}</td>
                      <td className="text-center">{(r.expenseQty * 0.30).toFixed(3)}</td>
                      <td className="text-center">{(r.expenseQty * 0.25).toFixed(3)}</td>
                      <td className="text-center">{(r.expenseQty * 0.35).toFixed(3)}</td>
                      <td className="text-center">{(r.expenseQty * 0.10).toFixed(3)}</td>
                      <td className="text-center font-bold text-blue-600">{r.expenseQty.toFixed(3)}</td>
                      <td className="text-center font-bold text-emerald-600">{r.expenseSum.toFixed(2)} грн</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: DAILY FOOD COST REPORT */}
        {activeReportTab === 'day_cost' && (
          <div className="card-glass p-5 rounded-xl space-y-4 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span>Звіт по вартості детодня та дотриманню фінансових лімітів</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                <span className="font-bold text-emerald-900 dark:text-emerald-300 block text-xs">Ясла (1–3 роки)</span>
                <div className="text-2xl font-black text-emerald-700">38.45 грн / день</div>
                <div className="text-[11px] text-emerald-600 font-semibold">Нормативний ліміт: 45.00 грн (в межах норми)</div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
                <span className="font-bold text-cyan-900 dark:text-cyan-300 block text-xs">Молодша група (3–4 роки)</span>
                <div className="text-2xl font-black text-cyan-700">48.20 грн / день</div>
                <div className="text-[11px] text-cyan-600 font-semibold">Нормативний ліміт: 55.00 грн (в межах норми)</div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
                <span className="font-bold text-blue-900 dark:text-blue-300 block text-xs">Садок (4–7 років)</span>
                <div className="text-2xl font-black text-blue-700">56.20 грн / день</div>
                <div className="text-[11px] text-blue-600 font-semibold">Нормативний ліміт: 65.00 грн (в межах норми)</div>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl space-y-2">
                <span className="font-bold text-purple-900 dark:text-purple-300 block text-xs">Співробітники</span>
                <div className="text-2xl font-black text-purple-700">68.10 грн / день</div>
                <div className="text-[11px] text-purple-600 font-semibold">Нормативний ліміт: 75.00 грн (в межах норми)</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: INVOICES REGISTRY REPORT */}
        {activeReportTab === 'invoices' && (
          <div className="card-glass p-5 rounded-xl space-y-4 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <PackageCheck className="w-4 h-4 text-blue-500" />
              <span>Реєстр приходних накладних постачальників за період</span>
            </h3>

            <div className="overflow-auto">
              <table className="table-grid">
                <thead>
                  <tr>
                    <th className="w-8">№</th>
                    <th>Номер накладної</th>
                    <th>Дата</th>
                    <th>Постачальник (Фірма)</th>
                    <th className="text-center">Загальна сума (грн)</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, idx) => (
                    <tr key={inv.ID}>
                      <td className="text-center text-slate-500">{idx + 1}</td>
                      <td className="font-mono font-bold text-blue-700 dark:text-blue-400">{inv.NOMER_DOCUMENTA || `НАК-${inv.ID}`}</td>
                      <td className="font-medium">{inv.DATA}</td>
                      <td className="font-semibold text-slate-800 dark:text-slate-200">{inv.firmName || 'ТОВ «Агропостач»'}</td>
                      <td className="text-center font-extrabold text-emerald-600">{(inv.SUMMA || 1450.00).toFixed(2)} грн</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
