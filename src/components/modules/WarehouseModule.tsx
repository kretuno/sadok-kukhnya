import React, { useState, useEffect } from 'react';
import { InvoiceHeader, StockBatch, SupplierFirm, Product } from '../../types';
import {
  getInvoices, getStockBatches, getSuppliers, getProducts,
  addInvoiceWithBatches, updateStockBatch, deleteStockBatch, deleteInvoice, addSupplier, updateSupplier, deleteSupplier, addProduct
} from '../../services/db';
import { QuickToolbar } from '../QuickToolbar';
import { exportToExcel, exportToPDF } from '../../services/export';
import { ProductHistoryModal } from '../modals/ProductHistoryModal';
import {
  Package, FileText, Building2, Plus, Edit, Trash2, Search,
  AlertTriangle, DollarSign, Calendar, Truck, CheckCircle2, History, Printer
} from 'lucide-react';

const formatQty = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '0';
  return Number(Math.round(num * 10000) / 10000).toString();
};

export const WarehouseModule: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceHeader[]>([]);
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierFirm[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'invoices' | 'suppliers'>('stock');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierFirm | null>(null);
  const [editingBatch, setEditingBatch] = useState<StockBatch | null>(null);
  const [selectedHistoryProductId, setSelectedHistoryProductId] = useState<number | null>(null);
  const [isQuickProductModalOpen, setIsQuickProductModalOpen] = useState<boolean>(false);
  const [quickProductTargetIndex, setQuickProductTargetIndex] = useState<number | null>(null);

  // Quick Product Form
  const [quickProdForm, setQuickProdForm] = useState({
    NAME: '',
    EDINICA_IZMERENIA: 'кг',
    CENA: 0,
    ID_GRUPPI_PRODUKTOV: 1,
    PROCENT_OTXODOV: 0
  });

  // New Invoice Form
  const [invForm, setInvForm] = useState({
    nomerDoc: '',
    date: new Date().toISOString().split('T')[0],
    firmId: 1,
    items: [
      { productId: 1, kolvoKg: 10, cena: 50, srokGodnosti: '2026-12-31' }
    ]
  });

  // New Supplier Form
  const [supForm, setSupForm] = useState({
    NAME: '',
    ADRES: '',
    TELEFON: '',
    INN: ''
  });

  // Batch Edit Form
  const [batchEditForm, setBatchEditForm] = useState({
    ostKg: 0,
    cena: 0,
    srokGodnosti: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setInvoices(getInvoices());
    setBatches(getStockBatches());
    setSuppliers(getSuppliers());
    setProducts(getProducts());
  };

  // Analytics totals
  const totalStockValue = batches.reduce((sum, b) => sum + (b.OST_KG * b.CENA), 0);
  const totalInvoicesValue = invoices.reduce((sum, i) => sum + i.SUMMA, 0);

  // Filtered lists
  const filteredBatches = batches.filter(b =>
    (b.productName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(b.ID).includes(searchQuery)
  );

  const filteredInvoices = invoices.filter(i =>
    (i.NOMER_DOCUMENTA || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.firmName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(s =>
    (s.NAME || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.INN || '').includes(searchQuery)
  );

  // Export actions
  const handleExportExcel = () => {
    if (activeSubTab === 'stock') {
      const headers = ['Код партії', 'Продукт', 'Од. вим.', 'Надійшло (кг)', 'Залишок (кг)', 'Ціна (грн)', 'Сума залишку (грн)', 'Термін придатності'];
      const rows = batches.map(b => [b.ID, b.productName, b.unit, formatQty(b.KOLVO_KG), formatQty(b.OST_KG), b.CENA, (b.OST_KG * b.CENA).toFixed(2), b.SROK_GODNOSTI]);
      exportToExcel('Залишки_на_складі', 'Склад', headers, rows);
    } else if (activeSubTab === 'invoices') {
      const headers = ['Код', 'Номер документа', 'Дата', 'Постачальник', 'Сума накладної (грн)'];
      const rows = invoices.map(i => [i.ID, i.NOMER_DOCUMENTA, i.DATA, i.firmName, i.SUMMA]);
      exportToExcel('Прибуткові_накладні', 'Накладні', headers, rows);
    } else {
      const headers = ['Код', 'Назва фірми', 'Адреса', 'Телефон', 'ЄДРПОУ/ІПН'];
      const rows = suppliers.map(s => [s.ID, s.NAME, s.ADRES, s.TELEFON, s.INN]);
      exportToExcel('Постачальники', 'Постачальники', headers, rows);
    }
  };

  const handleExportPDF = () => {
    if (activeSubTab === 'stock') {
      const headers = ['Код партії', 'Продукт', 'Залишок (кг)', 'Ціна', 'Сума залишку', 'Термін придатності'];
      const rows = batches.map(b => [b.ID, b.productName, `${formatQty(b.OST_KG)} ${b.unit}`, `${b.CENA} грн`, `${(b.OST_KG * b.CENA).toFixed(2)} грн`, b.SROK_GODNOSTI]);
      exportToPDF('Складська відомість залишків продуктів', headers, rows);
    } else if (activeSubTab === 'invoices') {
      const headers = ['Код', 'Номер документа', 'Дата', 'Постачальник', 'Сума'];
      const rows = invoices.map(i => [i.ID, i.NOMER_DOCUMENTA, i.DATA, i.firmName, `${i.SUMMA} грн`]);
      exportToPDF('Журнал прибуткових накладних складу', headers, rows);
    } else {
      const headers = ['Код', 'Назва фірми', 'Адреса', 'Телефон', 'ЄДРПОУ/ІПН'];
      const rows = suppliers.map(s => [s.ID, s.NAME, s.ADRES, s.TELEFON, s.INN]);
      exportToPDF('Довідник постачальників продуктів', headers, rows);
    }
  };

  // Handlers for Invoice creation
  const handleAddInvoiceItem = () => {
    setInvForm(prev => ({
      ...prev,
      items: [...prev.items, { productId: products[0]?.ID || 1, kolvoKg: 10, cena: 50, srokGodnosti: '2026-12-31' }]
    }));
  };

  const handleRemoveInvoiceItem = (index: number) => {
    setInvForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSaveInvoice = () => {
    if (!invForm.nomerDoc) {
      alert('Введіть номер прибуткової накладної!');
      return;
    }
    if (!invForm.items.length) {
      alert('Додайте хоча б один продукт до накладної!');
      return;
    }

    addInvoiceWithBatches(invForm.nomerDoc, invForm.date, Number(invForm.firmId), invForm.items);
    loadData();
    setIsInvoiceModalOpen(false);
    setInvForm({
      nomerDoc: '',
      date: new Date().toISOString().split('T')[0],
      firmId: suppliers[0]?.ID || 1,
      items: [{ productId: products[0]?.ID || 1, kolvoKg: 10, cena: 50, srokGodnosti: '2026-12-31' }]
    });
  };

  const [printInvoiceData, setPrintInvoiceData] = useState<{
    invoice: InvoiceHeader;
    supplier?: SupplierFirm;
    items: { productName: string; unit: string; KOLVO_KG: number; CENA: number; SROK_GODNOSTI: string }[];
  } | null>(null);

  const formatDateUK = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
    return dStr;
  };

  const handlePrintInvoice = (inv: InvoiceHeader) => {
    const supp = suppliers.find(s => s.ID === inv.ID_FIRMI);
    const invBatches = batches.filter(b => b.ID_NAKLADNOJ === inv.ID);
    const items = invBatches.map(b => ({
      productName: b.productName || '—',
      unit: b.unit || 'кг',
      KOLVO_KG: b.KOLVO_KG,
      CENA: b.CENA,
      SROK_GODNOSTI: formatDateUK(b.SROK_GODNOSTI)
    }));

    setPrintInvoiceData({
      invoice: inv,
      supplier: supp,
      items
    });

    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Handlers for Supplier Creation / Editing / Deleting
  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setSupForm({ NAME: '', ADRES: '', TELEFON: '', INN: '' });
    setIsSupplierModalOpen(true);
  };

  const handleEditSupplier = (sup: SupplierFirm) => {
    setEditingSupplier(sup);
    setSupForm({
      NAME: sup.NAME,
      ADRES: sup.ADRES || '',
      TELEFON: sup.TELEFON || '',
      INN: sup.INN || ''
    });
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = () => {
    if (!supForm.NAME.trim()) {
      alert('Введіть назву фірми-постачальника!');
      return;
    }

    if (editingSupplier) {
      updateSupplier({
        ...editingSupplier,
        NAME: supForm.NAME,
        ADRES: supForm.ADRES,
        TELEFON: supForm.TELEFON,
        INN: supForm.INN
      });
    } else {
      addSupplier(supForm);
    }

    loadData();
    const updatedSuppliers = getSuppliers();
    const newFirm = updatedSuppliers.find(s => s.NAME === supForm.NAME);
    if (newFirm) {
      setInvForm(prev => ({ ...prev, firmId: newFirm.ID }));
    }

    setIsSupplierModalOpen(false);
    setEditingSupplier(null);
    setSupForm({ NAME: '', ADRES: '', TELEFON: '', INN: '' });
  };

  const handleDeleteSupplier = (id: number, name: string) => {
    if (confirm(`Видалити постачальника «${name}» з довідника?`)) {
      deleteSupplier(id);
      loadData();
    }
  };

  // Handlers for Quick Product Creation
  const handleOpenQuickProductModal = (itemIdx: number) => {
    setQuickProductTargetIndex(itemIdx);
    setQuickProdForm({ NAME: '', EDINICA_IZMERENIA: 'кг', CENA: 0, ID_GRUPPI_PRODUKTOV: 1, PROCENT_OTXODOV: 0 });
    setIsQuickProductModalOpen(true);
  };

  const handleSaveQuickProduct = () => {
    if (!quickProdForm.NAME) {
      alert('Введіть назву нового продукту!');
      return;
    }
    const newProdId = addProduct(quickProdForm);
    const updatedProds = getProducts();
    setProducts(updatedProds);

    if (quickProductTargetIndex !== null && newProdId) {
      const newItems = [...invForm.items];
      newItems[quickProductTargetIndex].productId = newProdId;
      if (quickProdForm.CENA > 0) {
        newItems[quickProductTargetIndex].cena = quickProdForm.CENA;
      }
      setInvForm({ ...invForm, items: newItems });
    }

    setIsQuickProductModalOpen(false);
    setQuickProductTargetIndex(null);
  };

  // Handlers for Batch Editing / Write-off
  const handleOpenBatchEdit = (batch: StockBatch) => {
    setEditingBatch(batch);
    setBatchEditForm({
      ostKg: batch.OST_KG,
      cena: batch.CENA,
      srokGodnosti: batch.SROK_GODNOSTI
    });
  };

  const handleSaveBatchEdit = () => {
    if (!editingBatch) return;
    updateStockBatch(editingBatch.ID, batchEditForm.ostKg, batchEditForm.cena, batchEditForm.srokGodnosti);
    loadData();
    setEditingBatch(null);
  };

  const handleDeleteBatch = (id: number) => {
    if (confirm(`Вилучити партію #${id} зі складу?`)) {
      deleteStockBatch(id);
      loadData();
    }
  };

  const handleDeleteInvoice = (id: number) => {
    if (confirm(`Видалити прибуткову накладну #${id} та всі її партії зі складу?`)) {
      deleteInvoice(id);
      loadData();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-950 text-xs">
      <QuickToolbar
        onAdd={() => {
          if (activeSubTab === 'suppliers') handleOpenAddSupplier();
          else setIsInvoiceModalOpen(true);
        }}
        onRefresh={loadData}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        onPrint={() => window.print()}
        title="Складський облік продуктів та прихід накладних"
      />

      {/* Analytics Summary Banner */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-3 grid grid-cols-1 md:grid-cols-4 gap-3 shadow-sm no-print">
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-2.5 rounded-lg flex items-center space-x-3">
          <div className="p-2 bg-emerald-600 text-white rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Вартість залишків на складі</span>
            <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">{totalStockValue.toFixed(2)} грн</span>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-slate-800 p-2.5 rounded-lg flex items-center space-x-3">
          <div className="p-2 bg-blue-600 text-white rounded-lg">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Активних партій продуктів</span>
            <span className="text-base font-bold text-blue-700 dark:text-blue-300">{batches.length} партій</span>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 p-2.5 rounded-lg flex items-center space-x-3">
          <div className="p-2 bg-amber-600 text-white rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Прибуткові накладні</span>
            <span className="text-base font-bold text-amber-700 dark:text-amber-300">{invoices.length} накладних ({totalInvoicesValue.toFixed(2)} грн)</span>
          </div>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 p-2.5 rounded-lg flex items-center space-x-3">
          <div className="p-2 bg-indigo-600 text-white rounded-lg">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Постачальники (Фірми)</span>
            <span className="text-base font-bold text-indigo-700 dark:text-indigo-300">{suppliers.length} фірм</span>
          </div>
        </div>
      </div>

      {/* Sub Tabs & Search */}
      <div className="p-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between no-print overflow-x-auto">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveSubTab('stock')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
              activeSubTab === 'stock'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Залишки на складі та партії ({batches.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('invoices')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
              activeSubTab === 'invoices'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Прибуткові накладні ({invoices.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('suppliers')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
              activeSubTab === 'suppliers'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Постачальники / Фірми ({suppliers.length})</span>
          </button>
        </div>

        {/* Live Search & Action Button */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Пошук за назвою або номером..."
              className="pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 w-64"
            />
          </div>

          <button
            onClick={() => {
              if (activeSubTab === 'suppliers') setIsSupplierModalOpen(true);
              else setIsInvoiceModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{activeSubTab === 'suppliers' ? 'Додати фірму' : '+ Прихід товару'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-3 overflow-auto">
        <div className="card-glass overflow-hidden">
          {/* TAB 1: STOCK BATCHES */}
          {activeSubTab === 'stock' && (
            <table className="table-grid">
              <thead>
                <tr>
                  <th className="w-16">Партія #</th>
                  <th>Найменування продукту</th>
                  <th>Од. вим.</th>
                  <th>Надійшло (кг)</th>
                  <th>Залишок на складі</th>
                  <th>Ціна за од.</th>
                  <th>Вартість залишку</th>
                  <th>Термін придатності</th>
                  <th className="w-28 text-center no-print">Дії</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400 italic">
                      Залишки партій на складі відсутні. Натисніть «+ Прихід товару» для проведення прибуткової накладної.
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map(b => {
                    const val = b.OST_KG * b.CENA;
                    return (
                      <tr key={b.ID}>
                        <td className="font-mono text-slate-500">#{b.ID}</td>
                        <td>
                          <button
                            onClick={() => setSelectedHistoryProductId(b.ID_PRODUKTA)}
                            className="font-bold text-blue-700 dark:text-blue-400 hover:underline text-left cursor-pointer"
                            title="Натисніть для перегляду історії приходу та витрат продукту"
                          >
                            {b.productName}
                          </button>
                        </td>
                        <td className="text-blue-600 dark:text-blue-400 font-medium">{b.unit}</td>
                        <td>{formatQty(b.KOLVO_KG)} {b.unit}</td>
                        <td className="font-bold text-emerald-600 dark:text-emerald-400">{formatQty(b.OST_KG)} {b.unit}</td>
                        <td>{b.CENA.toFixed(2)} грн</td>
                        <td className="font-semibold text-slate-800 dark:text-slate-200">{val.toFixed(2)} грн</td>
                        <td>
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded text-[11px] font-semibold whitespace-nowrap">
                            до {formatDateUK(b.SROK_GODNOSTI)}
                          </span>
                        </td>
                        <td className="text-center no-print whitespace-nowrap min-w-[100px]">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => setSelectedHistoryProductId(b.ID_PRODUKTA)}
                              className="p-1 text-slate-500 hover:text-blue-600 rounded transition"
                              title="Історія руху продукту"
                            >
                              <History className="w-3.5 h-3.5 text-blue-500" />
                            </button>
                            <button
                              onClick={() => handleOpenBatchEdit(b)}
                              className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition"
                              title="Коригувати залишок/ціну партії"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBatch(b.ID)}
                              className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition"
                              title="Видалити партію"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* TAB 2: RECEIVING INVOICES */}
          {activeSubTab === 'invoices' && (
            <table className="table-grid">
              <thead>
                <tr>
                  <th className="w-16">Код</th>
                  <th>Номер документа</th>
                  <th>Дата накладної</th>
                  <th>Постачальник (Фірма)</th>
                  <th>Сума накладної</th>
                  <th className="w-20 text-center no-print">Дії</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 italic">
                      Журнал прибуткових накладних порожній.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map(inv => (
                    <tr key={inv.ID}>
                      <td className="font-mono text-slate-500">#{inv.ID}</td>
                      <td className="font-semibold text-slate-800 dark:text-slate-100">{inv.NOMER_DOCUMENTA}</td>
                      <td className="text-slate-600 dark:text-slate-400">{inv.DATA}</td>
                      <td className="font-medium text-slate-700 dark:text-slate-300">{inv.firmName}</td>
                      <td className="font-bold text-emerald-600 dark:text-emerald-400">{inv.SUMMA.toFixed(2)} грн</td>
                      <td className="text-center no-print space-x-1">
                        <button
                          onClick={() => handlePrintInvoice(inv)}
                          className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition"
                          title="Друк офіційної прибуткової накладної"
                        >
                          <Printer className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(inv.ID)}
                          className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition"
                          title="Видалити накладну та її партії"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TAB 3: SUPPLIERS */}
          {activeSubTab === 'suppliers' && (
            <table className="table-grid">
              <thead>
                <tr>
                  <th className="w-16">Код</th>
                  <th>Назва постачальника (Фірми)</th>
                  <th>Адреса</th>
                  <th>Телефон</th>
                  <th>ЄДРПОУ / ІПН</th>
                  <th className="w-20 text-center no-print">Дії</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 italic">
                      Список постачальників порожній. Натисніть «+ Додати фірму».
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map(s => (
                    <tr key={s.ID}>
                      <td className="font-mono text-slate-500">#{s.ID}</td>
                      <td className="font-bold text-slate-800 dark:text-slate-100">{s.NAME}</td>
                      <td className="text-slate-600 dark:text-slate-400">{s.ADRES || '—'}</td>
                      <td className="text-slate-600 dark:text-slate-400">{s.TELEFON || '—'}</td>
                      <td className="font-mono text-slate-700 dark:text-slate-300">{s.INN || '—'}</td>
                      <td className="text-center no-print space-x-1">
                        <button
                          onClick={() => handleEditSupplier(s)}
                          className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition cursor-pointer"
                          title="Редагувати реквізити постачальника"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(s.ID, s.NAME)}
                          className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition cursor-pointer"
                          title="Видалити постачальника з довідника"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL: ADD INVOICE & STOCK ARRIVAL */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div className="flex items-center space-x-2 font-bold text-slate-800 dark:text-slate-100">
                <Package className="w-5 h-5 text-blue-600" />
                <span>Проведення прибуткової накладної та прихід товарів</span>
              </div>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="p-4 overflow-auto space-y-4 flex-1">
              {/* Document Header Fields */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Номер накладної</label>
                  <input
                    type="text"
                    value={invForm.nomerDoc}
                    onChange={(e) => setInvForm({ ...invForm, nomerDoc: e.target.value })}
                    placeholder="Прихід №1042"
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Дата накладної</label>
                  <input
                    type="date"
                    value={invForm.date}
                    onChange={(e) => setInvForm({ ...invForm, date: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Постачальник (Фірма) *</label>
                  <div className="flex space-x-1">
                    <select
                      value={invForm.firmId}
                      onChange={(e) => setInvForm({ ...invForm, firmId: Number(e.target.value) })}
                      className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-semibold text-slate-800 dark:text-slate-100 truncate"
                    >
                      {suppliers.map(s => (
                        <option key={s.ID} value={s.ID}>{s.NAME}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsSupplierModalOpen(true)}
                      className="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs transition flex items-center justify-center flex-shrink-0 shadow-sm"
                      title="Додати нову фірму-постачальника (Заповнити реквізити)"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Items List Header */}
              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3">
                <span className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide">Список продуктів у накладній</span>
                <button
                  onClick={handleAddInvoiceItem}
                  className="flex items-center space-x-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded font-semibold text-xs hover:bg-blue-100 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Додати позицію</span>
                </button>
              </div>

              {/* Column Titles Header */}
              <div className="grid grid-cols-12 gap-2 bg-slate-200 dark:bg-slate-800 p-2 rounded-t-lg font-bold text-slate-700 dark:text-slate-200 text-[11px] items-center">
                <div className="col-span-4">Найменування продукту</div>
                <div className="col-span-2 text-center">Кількість (кг/л/шт)</div>
                <div className="col-span-2 text-center">Ціна за 1 од. (грн)</div>
                <div className="col-span-2 text-center text-emerald-700 dark:text-emerald-300">Сума (грн)</div>
                <div className="col-span-2 text-center">Термін придатності</div>
              </div>

              {/* Items Table */}
              <div className="space-y-1.5 border border-t-0 border-slate-200 dark:border-slate-800 p-1.5 rounded-b-lg bg-slate-100/50 dark:bg-slate-900/50">
                {invForm.items.map((item, idx) => {
                  const itemTotal = item.kolvoKg * item.cena;
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
                      {/* Product Select + '+' Button */}
                      <div className="col-span-4 flex space-x-1">
                        <select
                          value={item.productId}
                          onChange={(e) => {
                            const newItems = [...invForm.items];
                            const pId = Number(e.target.value);
                            const prd = products.find(p => p.ID === pId);
                            newItems[idx].productId = pId;
                            if (prd?.CENA && newItems[idx].cena === 0) {
                              newItems[idx].cena = prd.CENA;
                            }
                            setInvForm({ ...invForm, items: newItems });
                          }}
                          className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-semibold text-slate-800 dark:text-slate-100 truncate"
                        >
                          {products.map(p => (
                            <option key={p.ID} value={p.ID}>{p.NAME} ({p.EDINICA_IZMERENIA})</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleOpenQuickProductModal(idx)}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs transition flex items-center justify-center flex-shrink-0"
                          title="Створити новий продукт у довіднику"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Quantity */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={item.kolvoKg}
                          onChange={(e) => {
                            const newItems = [...invForm.items];
                            newItems[idx].kolvoKg = Number(e.target.value);
                            setInvForm({ ...invForm, items: newItems });
                          }}
                          placeholder="0"
                          className="w-full px-2 py-1 text-center bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold"
                        />
                      </div>

                      {/* Price */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.cena}
                          onChange={(e) => {
                            const newItems = [...invForm.items];
                            newItems[idx].cena = Number(e.target.value);
                            setInvForm({ ...invForm, items: newItems });
                          }}
                          placeholder="0.00"
                          className="w-full px-2 py-1 text-center bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold text-blue-600"
                        />
                      </div>

                      {/* Dynamic Calculated Total Sum */}
                      <div className="col-span-2 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 rounded text-center text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                        {itemTotal.toFixed(2)} грн
                      </div>

                      {/* Expiry Date & Delete */}
                      <div className="col-span-2 flex space-x-1 items-center">
                        <input
                          type="date"
                          value={item.srokGodnosti}
                          onChange={(e) => {
                            const newItems = [...invForm.items];
                            newItems[idx].srokGodnosti = e.target.value;
                            setInvForm({ ...invForm, items: newItems });
                          }}
                          className="w-full px-1 py-1 text-center bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-[11px] font-semibold text-slate-800 dark:text-slate-200 min-w-0"
                        />
                        <button
                          onClick={() => handleRemoveInvoiceItem(idx)}
                          className="p-1 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950 rounded transition flex-shrink-0"
                          title="Видалити позицію"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                Загальна сума накладної: {invForm.items.reduce((s, i) => s + (i.kolvoKg * i.cena), 0).toFixed(2)} грн
              </span>
              <div className="flex space-x-2">
                <button onClick={() => setIsInvoiceModalOpen(false)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium text-xs">
                  Скасувати
                </button>
                <button onClick={handleSaveInvoice} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs">
                  Провести прихід
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SUPPLIER */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {editingSupplier ? 'Редагувати реквізити постачальника' : 'Додати фірму-постачальника'}
              </h3>
              <button onClick={() => setIsSupplierModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Назва фірми *</label>
                <input
                  type="text"
                  value={supForm.NAME}
                  onChange={(e) => setSupForm({ ...supForm, NAME: e.target.value })}
                  placeholder="ТОВ Наша Ферма"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Адреса</label>
                <input
                  type="text"
                  value={supForm.ADRES}
                  onChange={(e) => setSupForm({ ...supForm, ADRES: e.target.value })}
                  placeholder="м. Київ, вул. Заводська, 10"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Телефон</label>
                <input
                  type="text"
                  value={supForm.TELEFON}
                  onChange={(e) => setSupForm({ ...supForm, TELEFON: e.target.value })}
                  placeholder="+380 (50) 123-45-67"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">ЄДРПОУ / ІПН</label>
                <input
                  type="text"
                  value={supForm.INN}
                  onChange={(e) => setSupForm({ ...supForm, INN: e.target.value })}
                  placeholder="12345678"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                />
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
              <button onClick={() => setIsSupplierModalOpen(false)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-medium">
                Скасувати
              </button>
              <button onClick={handleSaveSupplier} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold">
                {editingSupplier ? 'Зберегти зміни' : 'Додати фірму'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT BATCH / WRITE-OFF ADJUSTMENT */}
      {editingBatch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">Коригування / Списання партії #{editingBatch.ID}</h3>
              <button onClick={() => setEditingBatch(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <p className="font-bold text-blue-600 dark:text-blue-400">{editingBatch.productName}</p>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Залишок на складі (кг/л)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={batchEditForm.ostKg}
                  onChange={(e) => setBatchEditForm({ ...batchEditForm, ostKg: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold text-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Ціна за 1 од. (грн)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={batchEditForm.cena}
                  onChange={(e) => setBatchEditForm({ ...batchEditForm, cena: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Термін придатності</label>
                <input
                  type="date"
                  value={batchEditForm.srokGodnosti}
                  onChange={(e) => setBatchEditForm({ ...batchEditForm, srokGodnosti: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-medium"
                />
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
              <button onClick={() => setEditingBatch(null)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-medium">
                Скасувати
              </button>
              <button onClick={handleSaveBatchEdit} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold">
                Зберегти зміни
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QUICK ADD NEW PRODUCT */}
      {isQuickProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 no-print">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-1.5">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Створення нового продукту у довіднику</span>
              </h3>
              <button onClick={() => setIsQuickProductModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Найменування продукту *</label>
                <input
                  type="text"
                  value={quickProdForm.NAME}
                  onChange={(e) => setQuickProdForm({ ...quickProdForm, NAME: e.target.value })}
                  placeholder="наприклад: Борошно житнє"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Одиниця виміру</label>
                  <select
                    value={quickProdForm.EDINICA_IZMERENIA}
                    onChange={(e) => setQuickProdForm({ ...quickProdForm, EDINICA_IZMERENIA: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-semibold text-blue-600"
                  >
                    <option value="кг">кг (кілограм)</option>
                    <option value="л">л (літр)</option>
                    <option value="шт">шт (штук)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Початкова ціна (грн)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={quickProdForm.CENA}
                    onChange={(e) => setQuickProdForm({ ...quickProdForm, CENA: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Відсоток відходів (%)</label>
                <input
                  type="number"
                  value={quickProdForm.PROCENT_OTXODOV}
                  onChange={(e) => setQuickProdForm({ ...quickProdForm, PROCENT_OTXODOV: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs"
                />
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
              <button onClick={() => setIsQuickProductModalOpen(false)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs">
                Скасувати
              </button>
              <button onClick={handleSaveQuickProduct} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold">
                Створити та вибрати
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product History Modal */}
      <ProductHistoryModal
        productId={selectedHistoryProductId}
        onClose={() => setSelectedHistoryProductId(null)}
      />

      {/* PRINT-ONLY OFFICIAL RECEIVING INVOICE DOCUMENT TEMPLATE FOR STATE INSTITUTIONS */}
      {printInvoiceData && (
        <div className="print-only fixed inset-0 bg-white text-black p-8 text-xs font-sans">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-3 mb-4">
            <div>
              <h2 className="font-extrabold text-sm uppercase tracking-wide">Державний заклад дошкільної освіти №105</h2>
              <p className="text-[11px]">Адреса: м. Київ, вул. Освітня, 12 | Тел: (044) 234-56-78</p>
              <p className="text-[11px] font-bold">Код ЄДРПОУ: 12345678</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-700">ЗАТВЕРДЖУЮ</p>
              <p className="font-bold text-xs">Директор ЗДО №105</p>
              <p className="text-[11px] mt-6">___________ /___________________/</p>
              <p className="text-[10px] text-slate-500 mt-1">«_____» ____________ 20___ р.</p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center my-6">
            <h1 className="text-lg font-black uppercase tracking-wider">ПРИБУТКОВА НАКЛАДНА № {printInvoiceData.invoice.NOMER_DOCUMENTA}</h1>
            <p className="text-xs font-bold text-slate-800">від {formatDateUK(printInvoiceData.invoice.DATA)} року</p>
          </div>

          {/* Requisitions Grid */}
          <div className="grid grid-cols-2 gap-4 border border-black p-3 mb-4 bg-slate-50 text-xs">
            <div>
              <span className="font-extrabold block uppercase text-[10px] text-slate-600">Постачальник (Фірма):</span>
              <p className="font-bold text-sm text-slate-900">{printInvoiceData.supplier?.NAME || '—'}</p>
              <p>Адреса: {printInvoiceData.supplier?.ADRES || 'м. Київ'}</p>
              <p>Тел: {printInvoiceData.supplier?.TELEFON || '—'} | ЄДРПОУ/ІПН: {printInvoiceData.supplier?.INN || '—'}</p>
            </div>
            <div>
              <span className="font-extrabold block uppercase text-[10px] text-slate-600">Одержувач (Отримувач):</span>
              <p className="font-bold text-sm text-slate-900">Центральний харчоблок / склад ЗДО №105</p>
              <p>Особа, що приймає: Сестра медична старша / Комірник</p>
            </div>
          </div>

          {/* Goods Table */}
          <table className="w-full border-collapse border border-black text-xs mb-4">
            <thead>
              <tr className="bg-slate-200 text-black font-bold border-b border-black">
                <th className="border border-black px-2 py-1.5 text-center w-8">№</th>
                <th className="border border-black px-2 py-1.5 text-left">Найменування товару / продукту</th>
                <th className="border border-black px-2 py-1.5 text-center w-16">Од. вим.</th>
                <th className="border border-black px-2 py-1.5 text-right w-24">Кількість</th>
                <th className="border border-black px-2 py-1.5 text-right w-24">Ціна (грн)</th>
                <th className="border border-black px-2 py-1.5 text-right w-28">Сума (грн)</th>
                <th className="border border-black px-2 py-1.5 text-center w-28">Придатність</th>
              </tr>
            </thead>
            <tbody>
              {printInvoiceData.items.map((item, i) => (
                <tr key={i} className="border-b border-black">
                  <td className="border border-black px-2 py-1 text-center font-mono">{i + 1}</td>
                  <td className="border border-black px-2 py-1 font-bold">{item.productName}</td>
                  <td className="border border-black px-2 py-1 text-center">{item.unit}</td>
                  <td className="border border-black px-2 py-1 text-right font-semibold">{item.KOLVO_KG} {item.unit}</td>
                  <td className="border border-black px-2 py-1 text-right">{item.CENA.toFixed(2)}</td>
                  <td className="border border-black px-2 py-1 text-right font-black">{(item.KOLVO_KG * item.CENA).toFixed(2)}</td>
                  <td className="border border-black px-2 py-1 text-center font-medium">до {item.SROK_GODNOSTI}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-black bg-slate-100">
                <td colSpan={5} className="border border-black px-2 py-1.5 text-right uppercase">ВСЬОГО ДО СПЛАТИ:</td>
                <td className="border border-black px-2 py-1.5 text-right text-sm">{printInvoiceData.invoice.SUMMA.toFixed(2)} грн</td>
                <td className="border border-black px-2 py-1.5"></td>
              </tr>
            </tfoot>
          </table>

          {/* Text summary */}
          <div className="mb-8 text-xs space-y-1">
            <p>Всього найменувань: <span className="font-bold">{printInvoiceData.items.length}</span> позицій.</p>
            <p className="font-semibold">Загальна сума до сплати: <span className="font-extrabold text-sm">{printInvoiceData.invoice.SUMMA.toFixed(2)} грн</span>.</p>
          </div>

          {/* Official Signatures Block */}
          <div className="grid grid-cols-2 gap-12 pt-6 border-t-2 border-black text-xs">
            <div>
              <p className="font-bold mb-8">Відпустив (Постачальник):</p>
              <p className="border-b border-black pb-1">___________________________ /_____________________/</p>
              <p className="text-[10px] text-slate-500 mt-1">М.П. підпис, П.І.Б.</p>
            </div>

            <div>
              <p className="font-bold mb-8">Прийняв (Матеріально відповідальна особа):</p>
              <p className="border-b border-black pb-1">___________________________ /_____________________/</p>
              <p className="text-[10px] text-slate-500 mt-1">підпис, П.І.Б.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
