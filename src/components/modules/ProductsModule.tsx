import React, { useState, useEffect } from 'react';
import { Product, ProductCategory } from '../../types';
import { getProducts, getProductCategories, addProduct, updateProduct, deleteProduct } from '../../services/db';
import { QuickToolbar } from '../QuickToolbar';
import { exportToExcel, exportToPDF } from '../../services/export';
import { ProductHistoryModal } from '../modals/ProductHistoryModal';
import { BookOpen, Layers, Edit, Trash2, History } from 'lucide-react';

export const ProductsModule: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
  const [selectedHistoryProductId, setSelectedHistoryProductId] = useState<number | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    setProducts(getProducts());
    setCategories(getProductCategories());
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCatId === 0 || p.ID_GRUPPI_PRODUKTOV === selectedCatId;
    const matchesSearch = p.NAME.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleSave = () => {
    if (!editingProduct.NAME) return;
    if (editingProduct.ID) { updateProduct(editingProduct as Product); }
    else { addProduct(editingProduct); }
    loadData();
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    if (confirm('Ви впевнені, що хочете видалити цей продукт з довідника?')) {
      deleteProduct(id);
      loadData();
    }
  };

  const handleExportExcel = () => {
    const headers = ['Код', 'Продукт', 'Категорія', 'Од. вим.', 'Білки (г)', 'Жири (г)', 'Вуглеводи (г)', 'Ккал', 'Ціна (грн)', 'Відходи (%)'];
    const rows = filteredProducts.map(p => [
      p.ID, p.NAME, categories.find(c => c.ID === p.ID_GRUPPI_PRODUKTOV)?.NAME || '',
      p.EDINICA_IZMERENIA, p.BELKI, p.ZIRI, p.UGLEVODI, p.KALORII, p.CENA, p.PROCENT_OTXODOV
    ]);
    exportToExcel('Довідник_продуктів', 'Продукти', headers, rows);
  };

  const handleExportPDF = () => {
    const headers = ['Код', 'Продукт', 'Од. вим.', 'Білки', 'Жири', 'Вугл.', 'Ккал', 'Ціна', 'Відходи %'];
    const rows = filteredProducts.map(p => [p.ID, p.NAME, p.EDINICA_IZMERENIA, p.BELKI, p.ZIRI, p.UGLEVODI, p.KALORII, `${p.CENA} грн`, `${p.PROCENT_OTXODOV}%`]);
    exportToPDF('Довідник продуктів харчування та норм відходів', headers, rows);
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-950">
      <QuickToolbar
        onAdd={() => {
          setEditingProduct({ ID_GRUPPI_PRODUKTOV: selectedCatId || 1, EDINICA_IZMERENIA: 'кг', CENA: 0, PROCENT_OTXODOV: 0 });
          setIsModalOpen(true);
        }}
        onRefresh={loadData}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        title="Довідник продуктів харчування та норм відходів"
      />

      <div className="flex-1 flex overflow-hidden p-3 gap-3">
        {/* Categories Sidebar */}
        <div className="w-64 card-glass flex flex-col overflow-hidden">
          <div className="p-2.5 bg-slate-200/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-xs text-slate-700 dark:text-slate-200 flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>Групи продуктів</span>
          </div>
          <div className="flex-1 overflow-auto p-1.5 space-y-0.5">
            <button
              onClick={() => setSelectedCatId(0)}
              className={`w-full text-left px-3 py-1.5 rounded text-xs font-medium transition flex items-center justify-between ${
                selectedCatId === 0 ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span>Всі групи</span>
              <span className="text-[10px] opacity-70">({products.length})</span>
            </button>
            {categories.map(cat => {
              const count = products.filter(p => p.ID_GRUPPI_PRODUKTOV === cat.ID).length;
              return (
                <button
                  key={cat.ID}
                  onClick={() => setSelectedCatId(cat.ID)}
                  className={`w-full text-left px-3 py-1.5 rounded text-xs transition flex items-center justify-between ${
                    selectedCatId === cat.ID ? 'bg-blue-600 text-white font-medium' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="truncate">{cat.NAME}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Products Table */}
        <div className="flex-1 card-glass flex flex-col overflow-hidden">
          <div className="p-2.5 bg-slate-200/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-xs text-slate-700 dark:text-slate-200">
            Список продуктів ({filteredProducts.length})
          </div>
          <div className="flex-1 overflow-auto">
            <table className="table-grid">
              <thead>
                <tr>
                  <th className="w-12">Код</th>
                  <th>Найменування продукту</th>
                  <th>Група</th>
                  <th>Од. вим.</th>
                  <th>Білки</th>
                  <th>Жири</th>
                  <th>Вугл.</th>
                  <th>Ккал</th>
                  <th>Ціна</th>
                  <th>Відходи (%)</th>
                  <th className="w-16 text-center">Дії</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => (
                  <tr key={p.ID}>
                    <td>{p.ID}</td>
                    <td>
                      <button
                        onClick={() => setSelectedHistoryProductId(p.ID)}
                        className="font-bold text-blue-700 dark:text-blue-400 hover:underline text-left cursor-pointer flex items-center space-x-1"
                        title="Натисніть для перегляду історії приходу та витрат"
                      >
                        <span>{p.NAME}</span>
                      </button>
                    </td>
                    <td className="text-slate-600 dark:text-slate-400">
                      {categories.find(c => c.ID === p.ID_GRUPPI_PRODUKTOV)?.NAME || '—'}
                    </td>
                    <td className="font-medium text-blue-600 dark:text-blue-400">{p.EDINICA_IZMERENIA}</td>
                    <td>{p.BELKI}</td>
                    <td>{p.ZIRI}</td>
                    <td>{p.UGLEVODI}</td>
                    <td className="font-semibold text-amber-600 dark:text-amber-400">{p.KALORII}</td>
                    <td className="text-emerald-600 font-semibold">{p.CENA} грн</td>
                    <td className="text-rose-600 font-medium">{p.PROCENT_OTXODOV}%</td>
                    <td className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => setSelectedHistoryProductId(p.ID)}
                          className="p-1 text-slate-500 hover:text-blue-600"
                          title="Історія приходу та витрат"
                        >
                          <History className="w-3.5 h-3.5 text-blue-500" />
                        </button>
                        <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="p-1 text-slate-500 hover:text-blue-600" title="Редагувати">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(p.ID)} className="p-1 text-slate-500 hover:text-rose-600" title="Видалити">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Product Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {editingProduct.ID ? 'Редагування продукту' : 'Додавання нового продукту'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Найменування продукту</label>
                <input
                  type="text"
                  value={editingProduct.NAME || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, NAME: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Група продуктів</label>
                  <select
                    value={editingProduct.ID_GRUPPI_PRODUKTOV || 1}
                    onChange={(e) => setEditingProduct({ ...editingProduct, ID_GRUPPI_PRODUKTOV: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs"
                  >
                    {categories.map(c => <option key={c.ID} value={c.ID}>{c.NAME}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Одиниця виміру</label>
                  <select
                    value={editingProduct.EDINICA_IZMERENIA || 'кг'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, EDINICA_IZMERENIA: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-semibold text-blue-600"
                  >
                    <option value="кг">кг (кілограм)</option>
                    <option value="л">л (літр)</option>
                    <option value="шт">шт (штук)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500">Білки (г)</label>
                  <input type="number" step="0.1" value={editingProduct.BELKI || 0} onChange={(e) => setEditingProduct({ ...editingProduct, BELKI: Number(e.target.value) })} className="w-full p-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500">Жири (г)</label>
                  <input type="number" step="0.1" value={editingProduct.ZIRI || 0} onChange={(e) => setEditingProduct({ ...editingProduct, ZIRI: Number(e.target.value) })} className="w-full p-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500">Вуглеводи (г)</label>
                  <input type="number" step="0.1" value={editingProduct.UGLEVODI || 0} onChange={(e) => setEditingProduct({ ...editingProduct, UGLEVODI: Number(e.target.value) })} className="w-full p-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500">Калорії (ккал)</label>
                  <input type="number" value={editingProduct.KALORII || 0} onChange={(e) => setEditingProduct({ ...editingProduct, KALORII: Number(e.target.value) })} className="w-full p-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold text-amber-600" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Планова ціна (грн)</label>
                  <input
                    type="number" step="0.5"
                    value={editingProduct.CENA || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, CENA: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-semibold text-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Відсоток відходів/втрат (%)</label>
                  <input
                    type="number"
                    value={editingProduct.PROCENT_OTXODOV || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, PROCENT_OTXODOV: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-semibold text-rose-600"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
              <button onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs">Скасувати</button>
              <button onClick={handleSave} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold">Зберегти</button>
            </div>
          </div>
        </div>
      )}

      {/* Product History Modal */}
      <ProductHistoryModal
        productId={selectedHistoryProductId}
        onClose={() => setSelectedHistoryProductId(null)}
      />
    </div>
  );
};
