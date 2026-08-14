import { SearchableSelect } from "../common/SearchableSelect";
import React, { useMemo, useState } from 'react';
import {
  FileSpreadsheet, FileText, Printer, RefreshCw, Search, Settings2,
  CalendarRange, Download, BookOpenCheck,
} from 'lucide-react';
import {
  getDishes, getDishCostProfiles, getDocumentRegistry, getEaterCategories,
  getInstitutions, getInvoices, getMenuEntriesRange, getProducts,
  getPropertyWriteOffs, getRecipeComponents, registerDocument,
} from '../../services/db';
import { exportToExcel, exportToPDF, exportToWord } from '../../services/export';
import { DEFAULT_EATER_COUNTS } from '../../domain/nutritionCategories';
import { DocumentRegistryEntry } from '../../types';

type PrintDocumentType = 'menu' | 'products' | 'costs' | 'recipes' | 'invoices' | 'writeoffs';

const DOCUMENT_LABELS: Record<PrintDocumentType, string> = {
  menu: 'Меню-розкладка за період',
  products: 'Зведений розрахунок продуктів',
  costs: 'Калькуляція вартості страв',
  recipes: 'Реєстр технологічних карт',
  invoices: 'Реєстр приходних накладних',
  writeoffs: 'Реєстр актів списання майна',
};

interface PrintableData {
  headers: string[];
  rows: Array<Array<string | number>>;
}

const today = () => new Date().toISOString().slice(0, 10);

export const PrintCenterModule: React.FC = () => {
  const [documentType, setDocumentType] = useState<PrintDocumentType>('menu');
  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(today());
  const [institutionId, setInstitutionId] = useState(1);
  const [documentNumber, setDocumentNumber] = useState('');
  const [registry, setRegistry] = useState<DocumentRegistryEntry[]>(() => getDocumentRegistry(30));
  const [search, setSearch] = useState('');

  const institutions = getInstitutions();
  const institution = institutions.find(item => item.ID === institutionId) || institutions[0];

  const printable = useMemo<PrintableData>(() => {
    const entries = getMenuEntriesRange(dateFrom, dateTo);
    const products = getProducts();
    const dishes = getDishes();
    const categories = getEaterCategories();

    if (documentType === 'menu') {
      return {
        headers: ['Дата', 'Прийом їжі', 'Страва', ...categories.map(category => category.NAME)],
        rows: entries.map(entry => [
          entry.DATA,
          entry.MEAL_TYPE,
          entry.NAME_BLUDA,
          ...categories.map(category => {
            const profile = getDishCostProfiles(entry.ID_BLUDA)
              .find(item => item.categoryId === category.ID);
            return profile?.yieldGr || dishes.find(dish => dish.ID === entry.ID_BLUDA)?.VYXOD || 0;
          }),
        ]),
      };
    }

    if (documentType === 'products') {
      const totals = new Map<number, number>();
      entries.forEach(entry => {
        categories.forEach(category => {
          const count = DEFAULT_EATER_COUNTS[category.ID] || 0;
          getRecipeComponents(entry.ID_BLUDA, category.ID, false).forEach(component => {
            totals.set(
              component.ID_PRODUKTA,
              (totals.get(component.ID_PRODUKTA) || 0) + component.GROSSO_GR * count
            );
          });
        });
      });
      return {
        headers: ['Продукт', 'Кількість, кг/л', 'Ціна, грн', 'Сума, грн'],
        rows: Array.from(totals.entries()).map(([productId, grams]) => {
          const product = products.find(item => item.ID === productId);
          const qty = grams / 1000;
          const price = product?.CENA || 0;
          return [product?.NAME || `Продукт №${productId}`, qty.toFixed(3), price.toFixed(2), (qty * price).toFixed(2)];
        }),
      };
    }

    if (documentType === 'costs') {
      const uniqueDishIds = Array.from(new Set(entries.map(entry => entry.ID_BLUDA)));
      return {
        headers: ['Страва', 'Вікова категорія', 'Вихід, г', 'Вартість порції, грн'],
        rows: uniqueDishIds.flatMap(dishId => {
          const dish = dishes.find(item => item.ID === dishId);
          return getDishCostProfiles(dishId).map(profile => [
            dish?.NAME || `Страва №${dishId}`,
            profile.categoryName,
            profile.yieldGr,
            profile.costPerPortion.toFixed(2),
          ]);
        }),
      };
    }

    if (documentType === 'recipes') {
      return {
        headers: ['Код', 'Назва страви', 'Вихід, г', 'Білки', 'Жири', 'Вуглеводи', 'Ккал', 'Джерело'],
        rows: dishes.map(dish => [
          dish.ID, dish.NAME, dish.VYXOD, dish.BELKI, dish.ZIRI, dish.UGLEVODI,
          dish.KALORII, dish.SOURCE_FILE || '',
        ]),
      };
    }

    if (documentType === 'invoices') {
      return {
        headers: ['Дата', 'Номер', 'Постачальник', 'Сума, грн'],
        rows: getInvoices()
          .filter(invoice => invoice.DATA >= dateFrom && invoice.DATA <= dateTo)
          .map(invoice => [invoice.DATA, invoice.NOMER_DOCUMENTA, invoice.firmName || '', invoice.SUMMA.toFixed(2)]),
      };
    }

    return {
      headers: ['Дата', 'Номер акта', 'Майно', 'Кількість', 'Сума, грн', 'Причина'],
      rows: getPropertyWriteOffs()
        .filter(item => item.DATE >= dateFrom && item.DATE <= dateTo)
        .map(item => [item.DATE, item.ACT_NUMBER, item.PROPERTY_NAME, item.QUANTITY, item.TOTAL_COST.toFixed(2), item.REASON]),
    };
  }, [dateFrom, dateTo, documentType]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('uk-UA');
    return query
      ? printable.rows.filter(row => row.some(value => String(value).toLocaleLowerCase('uk-UA').includes(query)))
      : printable.rows;
  }, [printable.rows, search]);

  const ensureNumber = () => {
    if (documentNumber) return documentNumber;
    const entry = registerDocument(DOCUMENT_LABELS[documentType], dateFrom, dateTo);
    setDocumentNumber(entry.DOCUMENT_NUMBER);
    setRegistry(getDocumentRegistry(30));
    return entry.DOCUMENT_NUMBER;
  };

  const metadata = (number: string) => ({
    documentNumber: number,
    institution: institution?.NAME,
    director: institution?.DIRECTOR,
    nurse: institution?.NURSE,
    cook: institution?.COOK,
    period: `Період: ${dateFrom} — ${dateTo}`,
  });

  const exportFilename = () => `SADOK_${documentType}_${dateFrom}_${dateTo}`;

  const handleExcel = () => {
    ensureNumber();
    exportToExcel(exportFilename(), DOCUMENT_LABELS[documentType].slice(0, 31), printable.headers, filteredRows);
  };

  const handlePdf = () => {
    const number = ensureNumber();
    return exportToPDF(
      `${DOCUMENT_LABELS[documentType]} № ${number}`,
      printable.headers,
      filteredRows,
      metadata(number)
    );
  };

  const handleWord = () => {
    const number = ensureNumber();
    exportToWord(exportFilename(), DOCUMENT_LABELS[documentType], printable.headers, filteredRows, metadata(number));
  };

  const handlePrint = () => {
    ensureNumber();
    window.print();
  };

  return (
    <div className="flex h-full flex-col bg-slate-100 text-xs dark:bg-slate-950">
      <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-slate-200/80 px-4 py-2 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-center gap-2">
          <BookOpenCheck className="h-4 w-4 text-blue-600" />
          <span className="font-bold text-slate-800 dark:text-slate-100">Єдиний центр друку</span>
          <button onClick={handleExcel} className="rounded bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700">
            <FileSpreadsheet className="mr-1 inline h-3.5 w-3.5" /> Excel
          </button>
          <button onClick={handlePdf} className="rounded bg-rose-600 px-3 py-1.5 font-bold text-white hover:bg-rose-700">
            <Download className="mr-1 inline h-3.5 w-3.5" /> PDF
          </button>
          <button onClick={handleWord} className="rounded bg-blue-600 px-3 py-1.5 font-bold text-white hover:bg-blue-700">
            <FileText className="mr-1 inline h-3.5 w-3.5" /> Word
          </button>
          <button onClick={handlePrint} className="rounded bg-slate-800 px-3 py-1.5 font-bold text-white hover:bg-slate-950">
            <Printer className="mr-1 inline h-3.5 w-3.5" /> Друк
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Пошук у документі..."
            className="w-56 rounded border border-slate-300 bg-white py-1.5 pl-8 pr-3 dark:border-slate-700 dark:bg-slate-950"
          />
        </div>
      </div>

      <div className="no-print grid grid-cols-1 gap-3 border-b border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-4">
        <label className="space-y-1">
          <span className="flex items-center gap-1 font-semibold text-slate-500"><Settings2 className="h-3.5 w-3.5" /> Документ</span>
          <SearchableSelect
            value={documentType}
            onChange={event => { setDocumentType(event.target.value as PrintDocumentType); setDocumentNumber(''); }}
            className="w-full rounded border border-slate-300 bg-slate-50 p-2 font-semibold dark:border-slate-700 dark:bg-slate-950"
          >
            {Object.entries(DOCUMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </SearchableSelect>
        </label>
        <label className="space-y-1">
          <span className="flex items-center gap-1 font-semibold text-slate-500"><CalendarRange className="h-3.5 w-3.5" /> Період з</span>
          <input type="date" value={dateFrom} onChange={event => { setDateFrom(event.target.value); setDocumentNumber(''); }} className="w-full rounded border border-slate-300 bg-slate-50 p-2 font-bold dark:border-slate-700 dark:bg-slate-950" />
        </label>
        <label className="space-y-1">
          <span className="font-semibold text-slate-500">по</span>
          <input type="date" value={dateTo} onChange={event => { setDateTo(event.target.value); setDocumentNumber(''); }} className="w-full rounded border border-slate-300 bg-slate-50 p-2 font-bold dark:border-slate-700 dark:bg-slate-950" />
        </label>
        <label className="space-y-1">
          <span className="font-semibold text-slate-500">Заклад і підписанти</span>
          <SearchableSelect value={institutionId} onChange={event => setInstitutionId(Number(event.target.value))} className="w-full rounded border border-slate-300 bg-slate-50 p-2 font-semibold dark:border-slate-700 dark:bg-slate-950">
            {institutions.map(item => <option key={item.ID} value={item.ID}>{item.NAME}</option>)}
          </SearchableSelect>
        </label>
      </div>

      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-2 dark:border-slate-800 dark:bg-slate-800">
            <div>
              <div className="font-bold">{DOCUMENT_LABELS[documentType]}</div>
              <div className="text-[10px] text-slate-500">Попередній перегляд · {filteredRows.length} рядків</div>
            </div>
            <div className="font-mono font-bold text-blue-700 dark:text-blue-300">
              № {documentNumber || 'буде присвоєно при формуванні'}
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="mx-auto min-w-[760px] max-w-6xl bg-white text-black">
              <div className="mb-4 flex justify-between border-b-2 border-black pb-3">
                <div>
                  <div className="font-bold uppercase">{institution?.NAME || 'Заклад дошкільної освіти'}</div>
                  <div className="text-[10px]">{institution?.ADRES}</div>
                </div>
                <div className="text-right text-[10px]">
                  <div>ЗАТВЕРДЖУЮ</div>
                  <div>Директор {institution?.DIRECTOR || '________________'}</div>
                </div>
              </div>
              <h1 className="mb-1 text-center text-base font-black uppercase">{DOCUMENT_LABELS[documentType]}</h1>
              <div className="mb-4 text-center text-[10px]">за період {dateFrom} — {dateTo}</div>
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-slate-200">
                    <th className="border border-black p-1">№</th>
                    {printable.headers.map(header => <th key={header} className="border border-black p-1">{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => (
                    <tr key={`${index}-${row[0]}`}>
                      <td className="border border-black p-1 text-center">{index + 1}</td>
                      {row.map((cell, cellIndex) => <td key={cellIndex} className="border border-black p-1">{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-8 flex justify-between text-[10px]">
                <span>Директор: ____________ {institution?.DIRECTOR}</span>
                <span>Медична сестра: ____________ {institution?.NURSE}</span>
                <span>Кухар: ____________ {institution?.COOK}</span>
              </div>
            </div>
          </div>
        </section>

        <aside className="no-print hidden w-72 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:flex xl:flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-3 py-2 font-bold dark:border-slate-800 dark:bg-slate-800">
            <span>Журнал документів</span>
            <button onClick={() => setRegistry(getDocumentRegistry(30))} title="Оновити"><RefreshCw className="h-3.5 w-3.5" /></button>
          </div>
          <div className="flex-1 space-y-1 overflow-auto p-2">
            {registry.map(entry => (
              <div key={entry.ID} className="rounded border border-slate-200 p-2 dark:border-slate-800">
                <div className="font-bold text-blue-700 dark:text-blue-300">{entry.DOCUMENT_NUMBER}</div>
                <div className="truncate text-[10px]">{entry.DOCUMENT_TYPE}</div>
                <div className="text-[9px] text-slate-500">{entry.PERIOD_FROM} — {entry.PERIOD_TO}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className="print-only bg-white p-4 text-black">
        <h1 className="text-center text-lg font-bold">{DOCUMENT_LABELS[documentType]} № {documentNumber}</h1>
        <p className="text-center text-xs">{institution?.NAME} · {dateFrom} — {dateTo}</p>
        <table className="print-table mt-4 w-full border-collapse text-xs">
          <thead><tr><th>№</th>{printable.headers.map(header => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>{filteredRows.map((row, index) => <tr key={index}><td>{index + 1}</td>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
  );
};
