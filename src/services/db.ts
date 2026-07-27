import { getEmbeddedDbBytes } from './db_data';
import {
  Product, ProductCategory, Dish, DishCategory,
  RecipeComponent, EaterCategory, MenuHeader,
  InvoiceHeader, StockBatch, Institution, SupplierFirm,
  ProductHistoryData, ProductHistoryBatch, ProductHistoryUsage
} from '../types';

// -----------------------------------------------------------------
// Singleton DB instance (sql.js Database object)
// -----------------------------------------------------------------
let db: any = null;

// Load sql.js via <script> tag from CDN — bypasses all Vite bundling issues
async function loadSqlJs(): Promise<any> {
  // If already loaded by a previous call
  if ((window as any).initSqlJs) return (window as any).initSqlJs;

  return new Promise((resolve, reject) => {
    // Try local /sql-wasm.js first (for offline support), then CDN
    const sources = [
      './sql-wasm.js',
      '/sql-wasm.js',
      'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.js',
      'https://unpkg.com/sql.js@1.12.0/dist/sql-wasm.js',
    ];

    let tried = 0;
    function tryNext() {
      if (tried >= sources.length) {
        reject(new Error('Не вдалося завантажити sql.js. Перевірте локальні файли або підключення до інтернету.'));
        return;
      }
      const src = sources[tried++];
      const existing = document.getElementById('sqljs-script');
      if (existing) existing.remove();

      const script = document.createElement('script');
      script.id = 'sqljs-script';
      script.src = src;
      script.onload = () => {
        if ((window as any).initSqlJs) {
          resolve((window as any).initSqlJs);
        } else {
          tryNext();
        }
      };
      script.onerror = () => tryNext();
      document.head.appendChild(script);
    }
    tryNext();
  });
}

// -----------------------------------------------------------------
// Public initializer — await this ONCE from App.tsx
// -----------------------------------------------------------------
export async function initDatabase(): Promise<any> {
  if (db) return db;

  const initSqlJs = await loadSqlJs();

  const SQL = await initSqlJs({
    locateFile: (f: string) => {
      if (f.endsWith('.wasm')) {
        return './sql-wasm.wasm';
      }
      return f;
    }
  });

  // 1. Electron IPC path
  if ((window as any).electronAPI) {
    try {
      const buf: ArrayBuffer = await (window as any).electronAPI.readDbFile();
      if (buf && buf.byteLength > 0) {
        db = new SQL.Database(new Uint8Array(buf));
        console.log('[DB] Loaded from Electron IPC');
        return db;
      }
    } catch (_) {}
  }

  // 2. Browser LocalStorage cache fallback (for web dev mode / browser HMR)
  try {
    const localBase64 = localStorage.getItem('sadok_sqlite_db_b64');
    if (localBase64) {
      const binStr = atob(localBase64);
      const len = binStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binStr.charCodeAt(i);
      }
      db = new SQL.Database(bytes);
      console.log('[DB] Loaded saved state from LocalStorage');
      return db;
    }
  } catch (err) {
    console.warn('[DB] LocalStorage load failed:', err);
  }

  // 3. Embedded bytes fallback (bundled at build time)
  const bytes = getEmbeddedDbBytes();
  db = new SQL.Database(bytes);

  const prodCount = db.exec('SELECT count(*) FROM PRODUKTS')[0]?.values[0]?.[0] ?? 0;
  const dishCount = db.exec('SELECT count(*) FROM KARTOTEKA_BLUD')[0]?.values[0]?.[0] ?? 0;
  console.log(`[DB] Initialized default database — ${prodCount} products, ${dishCount} dishes`);

  return db;
}

// -----------------------------------------------------------------
// Persistence (Electron IPC + Browser LocalStorage)
// -----------------------------------------------------------------
export function saveDatabaseToDisk() {
  if (!db) return;

  const exportedBytes: Uint8Array = db.export();

  // 1. Electron IPC save to disk
  if ((window as any).electronAPI) {
    try { (window as any).electronAPI.saveDbFile(exportedBytes); } catch (_) {}
  }

  // 2. Browser LocalStorage save (btoa chunked for performance)
  try {
    let binary = '';
    const len = exportedBytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(exportedBytes[i]);
    }
    const base64 = btoa(binary);
    localStorage.setItem('sadok_sqlite_db_b64', base64);
  } catch (err) {
    console.warn('[DB] LocalStorage save failed:', err);
  }
}

export function resetDatabaseToDefaults() {
  localStorage.removeItem('sadok_sqlite_db_b64');
  localStorage.clear();
  window.location.reload();
}

export function exportSqliteFile() {
  if (!db) return;
  const exportedBytes: Uint8Array = db.export();
  const blob = new Blob([exportedBytes.buffer as ArrayBuffer], { type: 'application/x-sqlite3' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sadok_kukhnya_db_${new Date().toISOString().split('T')[0]}.sqlite`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importSqliteFile(file: File): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer;
        const bytes = new Uint8Array(arrayBuffer);
        // Verify valid sqlite format using initSqlJs
        if (db) db.close();
        const initSqlJs = (window as any).initSqlJs;
        if (!initSqlJs) {
          throw new Error('sql.js is not initialized');
        }
        initSqlJs({
          locateFile: (f: string) => f.endsWith('.wasm') ? './sql-wasm.wasm' : f
        }).then((SQL: any) => {
          db = new SQL.Database(bytes);
          saveDatabaseToDisk();
          window.location.reload();
          resolve(true);
        }).catch((err: any) => reject(err));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

// -----------------------------------------------------------------
// Generic query helper
// -----------------------------------------------------------------
function queryAll<T>(sql: string): T[] {
  if (!db) return [];
  const res = db.exec(sql);
  if (!res.length) return [];
  const { columns, values } = res[0];
  return values.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col: string, i: number) => (obj[col] = row[i]));
    return obj as T;
  });
}

// -----------------------------------------------------------------
// Ukrainian Translation Helpers for raw DB strings
// -----------------------------------------------------------------
export const translateCatName = (name: string): string => {
  if (!name) return '';
  if (name.includes('Ясла') || name.includes('Ясли')) return 'Ясла (1-3 роки)';
  if (name.includes('Садок') || name.includes('Сад') || name.includes('Садокок')) return 'Садок (3-7 років)';
  if (name.includes('Персонал') || name.includes('Співробітники') || name.includes('Сотрудники')) return 'Співробітники';
  return name.replace(/\s*\([^)]*лет[^)]*\)/gi, '').replace(/\s*\([^)]*года[^)]*\)/gi, '').trim();
};

export const translateDishCategoryName = (name: string): string => {
  if (!name) return '';
  return name
    .replace(/Первые блюда \(Супы, Борщи, Рассольники\)|Первые блюда/gi, 'Перші страви (Супи, Борщі, Розсольники)')
    .replace(/Вторые мясные\/рыбные блюда|Вторые блюда/gi, 'Другі м\'ясні та рибні страви')
    .replace(/Гарниры \(Каши, Макароны, Овощи\)|Гарниры/gi, 'Гарніри (Каші, Макарони, Овочі)')
    .replace(/Запеканки, оладьи, сырники/gi, 'Запіканки, оладки, сирники')
    .replace(/Салаты и холодные закуски/gi, 'Салати та холодні закуски')
    .replace(/Напитки \(Чай, Какао, Компот, Соки\)|Напитки/gi, 'Напої (Чай, Какао, Компот, Соки)')
    .replace(/Выпечка и десерты/gi, 'Випічка та десерти');
};

export const translateProdCategoryName = (name: string): string => {
  if (!name) return '';
  return name
    .replace(/Хлеб и хлебобулочные изделия/gi, 'Хліб та хлібобулочні вироби')
    .replace(/Крупы, макаронные изделия, бобовые/gi, 'Крупи, макаронні вироби, бобові')
    .replace(/Молоко и молочные продукты/gi, 'Молоко та молочні продукти')
    .replace(/Мясо и мясопродукты/gi, 'М\'ясо та м\'ясопродукти')
    .replace(/Рыба и рыбопродукты/gi, 'Риба та рибопродукти')
    .replace(/Овощи, зелень, картофель/gi, 'Овочі, зелень, картопля')
    .replace(/Фрукты и ягоды/gi, 'Фрукти та ягоди')
    .replace(/Кондитерские изделия, сахар/gi, 'Кондитерські вироби, цукор')
    .replace(/Масло сливочное, растительное/gi, 'Масло вершкове, олія');
};

export const translateMealType = (name: string): string => {
  if (!name) return '';
  return name
    .replace(/Завтрак/gi, 'Сніданок')
    .replace(/2-й Завтрак|2-й сніданок/gi, '2-й сніданок')
    .replace(/Обед/gi, 'Обід')
    .replace(/Полдник/gi, 'Полуденок')
    .replace(/Ужин/gi, 'Вечеря');
};

// -----------------------------------------------------------------
// READ Queries
// -----------------------------------------------------------------
export const getProducts = (): Product[] =>
  queryAll<Product>('SELECT * FROM PRODUKTS ORDER BY NAME');

export const getProductCategories = (): ProductCategory[] =>
  queryAll<ProductCategory>('SELECT * FROM GRUPPI_PRODUKTOV ORDER BY NOMER_PP').map(c => ({
    ...c,
    NAME: translateProdCategoryName(c.NAME)
  }));

export const getDishes = (): Dish[] =>
  queryAll<Dish>('SELECT * FROM KARTOTEKA_BLUD ORDER BY PORRDOK_SLEDOVANIR_BLUD, NAME');

export const getDishCategories = (): DishCategory[] =>
  queryAll<DishCategory>('SELECT * FROM GRUPPI_BLUD ORDER BY PORRDOK_SLEDOVANIR').map(c => ({
    ...c,
    NAME: translateDishCategoryName(c.NAME)
  }));

export const getRecipeComponents = (dishId: number): RecipeComponent[] =>
  queryAll<RecipeComponent>(`
    SELECT k.*, p.NAME as productName, p.EDINICA_IZMERENIA as unit
    FROM KOMPONENTI_KARTOTEKI k
    LEFT JOIN PRODUKTS p ON k.ID_PRODUKTA = p.ID
    WHERE k.ID_BLUDA = ${dishId}
    ORDER BY k.NOMER_ID_LINII_V_TABLICE
  `);

export const getEaterCategories = (): EaterCategory[] =>
  queryAll<EaterCategory>('SELECT * FROM KATEGORII_DETOK ORDER BY NOMER_PP').map(c => ({
    ...c,
    NAME: translateCatName(c.NAME)
  }));

export const getMenuEntries = (date: string): MenuHeader[] =>
  queryAll<MenuHeader>(
    `SELECT * FROM MENU WHERE DATA = '${date}' ORDER BY PORRDOK_SLEDOVANIR_BLUD, ID`
  ).map(m => ({
    ...m,
    MEAL_TYPE: translateMealType(m.MEAL_TYPE)
  }));

export const getInvoices = (): InvoiceHeader[] =>
  queryAll<InvoiceHeader>(`
    SELECT n.*, f.NAME as firmName
    FROM NAKLADNIE_PRIXODA n
    LEFT JOIN FIRMI f ON n.ID_FIRMI = f.ID
    ORDER BY n.DATA DESC
  `);

export const getStockBatches = (): StockBatch[] =>
  queryAll<StockBatch>(`
    SELECT p.*, pr.NAME as productName, pr.EDINICA_IZMERENIA as unit
    FROM PARTII_NOW p
    LEFT JOIN PRODUKTS pr ON p.ID_PRODUKTA = pr.ID
    ORDER BY p.ID DESC
  `);

export const getInstitutions = (): Institution[] => {
  if (db) {
    try { db.run("ALTER TABLE SADIKI ADD COLUMN EDRPOU TEXT"); } catch (_) {}
    try { db.run("ALTER TABLE SADIKI ADD COLUMN DIRECTOR TEXT"); } catch (_) {}
    try { db.run("ALTER TABLE SADIKI ADD COLUMN NURSE TEXT"); } catch (_) {}
    try { db.run("ALTER TABLE SADIKI ADD COLUMN COOK TEXT"); } catch (_) {}
    try { db.run("ALTER TABLE SADIKI ADD COLUMN IS_SEPARATE_WAREHOUSE INTEGER DEFAULT 0"); } catch (_) {}
  }
  return queryAll<Institution>('SELECT * FROM SADIKI ORDER BY ID').map(i => {
    let name = i.NAME || '';
    if (name.includes('ГБОУ') || name.includes('Сказка')) {
      name = 'ЗДО № 105 «Казка»';
    }
    return {
      ...i,
      NAME: name,
      IS_SEPARATE_WAREHOUSE: i.IS_SEPARATE_WAREHOUSE || 0
    };
  });
};

// -----------------------------------------------------------------
// WRITE helpers
// -----------------------------------------------------------------
const esc = (s: string) => (s || '').replace(/'/g, "''");

export function addMenuEntry(date: string, dishId: number, dishName: string, mealType: string) {
  if (!db) return;
  db.run(`INSERT INTO MENU (ID_ZOY, DATA, ID_BLUDA, NAME_BLUDA, MEAL_TYPE)
     VALUES (1, '${date}', ${dishId}, '${esc(dishName)}', '${esc(mealType)}')`);
  saveDatabaseToDisk();
}

export function deleteMenuEntry(id: number) {
  if (!db) return;
  db.run(`DELETE FROM MENU WHERE ID = ${id}`);
  saveDatabaseToDisk();
}

export function addProduct(p: Partial<Product>): number {
  if (!db) return 0;
  db.run(`INSERT INTO PRODUKTS (NAME, ID_GRUPPI_PRODUKTOV, BELKI, ZIRI, UGLEVODI, KALORII, EDINICA_IZMERENIA, CENA, PROCENT_OTXODOV)
     VALUES ('${esc(p.NAME!)}', ${p.ID_GRUPPI_PRODUKTOV || 1}, ${p.BELKI || 0}, ${p.ZIRI || 0},
             ${p.UGLEVODI || 0}, ${p.KALORII || 0}, '${esc(p.EDINICA_IZMERENIA || 'кг')}',
             ${p.CENA || 0}, ${p.PROCENT_OTXODOV || 0})`);
  const res = db.exec("SELECT last_insert_rowid()");
  saveDatabaseToDisk();
  return (res[0]?.values[0]?.[0] as number) || 0;
}

export function updateProduct(p: Product) {
  if (!db) return;
  db.run(`UPDATE PRODUKTS SET NAME='${esc(p.NAME)}', ID_GRUPPI_PRODUKTOV=${p.ID_GRUPPI_PRODUKTOV},
       BELKI=${p.BELKI}, ZIRI=${p.ZIRI}, UGLEVODI=${p.UGLEVODI}, KALORII=${p.KALORII},
       EDINICA_IZMERENIA='${esc(p.EDINICA_IZMERENIA)}', CENA=${p.CENA}, PROCENT_OTXODOV=${p.PROCENT_OTXODOV}
     WHERE ID = ${p.ID}`);
  saveDatabaseToDisk();
}

export function deleteProduct(id: number) {
  if (!db) return;
  db.run(`DELETE FROM PRODUKTS WHERE ID = ${id}`);
  saveDatabaseToDisk();
}

export function addDish(d: Partial<Dish>) {
  if (!db) return;
  db.run(`INSERT INTO KARTOTEKA_BLUD (NAME, NOTES, ID_GRUPPI_BLUD, VYXOD, BELKI, ZIRI, UGLEVODI, KALORII)
     VALUES ('${esc(d.NAME!)}', '${esc(d.NOTES || '')}', ${d.ID_GRUPPI_BLUD || 1},
             ${d.VYXOD || 0}, ${d.BELKI || 0}, ${d.ZIRI || 0}, ${d.UGLEVODI || 0}, ${d.KALORII || 0})`);
  saveDatabaseToDisk();
}

export function updateDish(d: Dish) {
  if (!db) return;
  db.run(`UPDATE KARTOTEKA_BLUD SET NAME='${esc(d.NAME)}', NOTES='${esc(d.NOTES || '')}',
       ID_GRUPPI_BLUD=${d.ID_GRUPPI_BLUD}, VYXOD=${d.VYXOD}, BELKI=${d.BELKI},
       ZIRI=${d.ZIRI}, UGLEVODI=${d.UGLEVODI}, KALORII=${d.KALORII}
     WHERE ID = ${d.ID}`);
  saveDatabaseToDisk();
}

export function deleteDish(id: number) {
  if (!db) return;
  db.run(`DELETE FROM KARTOTEKA_BLUD WHERE ID = ${id}`);
  db.run(`DELETE FROM KOMPONENTI_KARTOTEKI WHERE ID_BLUDA = ${id}`);
  saveDatabaseToDisk();
}

export function addRecipeComponent(c: Partial<RecipeComponent>) {
  if (!db) return;
  db.run(`INSERT INTO KOMPONENTI_KARTOTEKI (ID_BLUDA, ID_PRODUKTA, ID_KATEGORII_DETEJ, GROSSO_GR, NETTO_GR)
     VALUES (${c.ID_BLUDA}, ${c.ID_PRODUKTA}, ${c.ID_KATEGORII_DETEJ || 1}, ${c.GROSSO_GR || 0}, ${c.NETTO_GR || 0})`);
  saveDatabaseToDisk();
}

export function deleteRecipeComponent(id: number) {
  if (!db) return;
  db.run(`DELETE FROM KOMPONENTI_KARTOTEKI WHERE ID = ${id}`);
  saveDatabaseToDisk();
}

export function updateInstitution(id: number, inst: {
  name: string;
  adres?: string;
  telefon?: string;
  edrpou?: string;
  director?: string;
  nurse?: string;
  cook?: string;
  isSeparateWarehouse?: boolean;
}) {
  if (!db) return;
  const isSep = inst.isSeparateWarehouse ? 1 : 0;
  db.run(`UPDATE SADIKI SET 
            NAME='${esc(inst.name)}', 
            ADRES='${esc(inst.adres || '')}', 
            TELEFON='${esc(inst.telefon || '')}',
            EDRPOU='${esc(inst.edrpou || '')}',
            DIRECTOR='${esc(inst.director || '')}',
            NURSE='${esc(inst.nurse || '')}',
            COOK='${esc(inst.cook || '')}',
            IS_SEPARATE_WAREHOUSE=${isSep}
          WHERE ID = ${id}`);
  saveDatabaseToDisk();
}

export function addInstitution(inst: {
  name: string;
  adres?: string;
  telefon?: string;
  edrpou?: string;
  director?: string;
  nurse?: string;
  cook?: string;
  isSeparateWarehouse?: boolean;
}): number {
  if (!db) return 0;
  const isSep = inst.isSeparateWarehouse ? 1 : 0;
  db.run(`INSERT INTO SADIKI (NAME, ID_SADIKA, ADRES, TELEFON, EDRPOU, DIRECTOR, NURSE, COOK, IS_SEPARATE_WAREHOUSE) 
          VALUES ('${esc(inst.name)}', 1, '${esc(inst.adres || '')}', '${esc(inst.telefon || '')}', '${esc(inst.edrpou || '')}', '${esc(inst.director || '')}', '${esc(inst.nurse || '')}', '${esc(inst.cook || '')}', ${isSep})`);
  const res = db.exec("SELECT last_insert_rowid()");
  saveDatabaseToDisk();
  return (res[0]?.values[0]?.[0] as number) || 0;
}

export function deleteInstitution(id: number, purgeWarehouse: boolean = false) {
  if (!db) return;
  db.run(`DELETE FROM SADIKI WHERE ID = ${id}`);
  if (purgeWarehouse) {
    try {
      db.run(`DELETE FROM PARTII_NOW WHERE ID_NAKLADNOJ IN (SELECT ID FROM PRICHOD_NAKLADNIES WHERE ID_SADIKA = ${id})`);
      db.run(`DELETE FROM PRICHOD_NAKLADNIES WHERE ID_SADIKA = ${id}`);
    } catch (_) {}
  }
  saveDatabaseToDisk();
}

export const getSuppliers = (): SupplierFirm[] =>
  queryAll<SupplierFirm>('SELECT * FROM FIRMI WHERE DEL = 0 ORDER BY NAME');

export function addSupplier(firm: Partial<SupplierFirm>) {
  if (!db) return;
  db.run(`INSERT INTO FIRMI (NAME, ADRES, TELEFON, INN) VALUES ('${esc(firm.NAME!)}', '${esc(firm.ADRES || '')}', '${esc(firm.TELEFON || '')}', '${esc(firm.INN || '')}')`);
  saveDatabaseToDisk();
}

export function updateSupplier(firm: SupplierFirm) {
  if (!db) return;
  db.run(`UPDATE FIRMI SET NAME='${esc(firm.NAME)}', ADRES='${esc(firm.ADRES || '')}', TELEFON='${esc(firm.TELEFON || '')}', INN='${esc(firm.INN || '')}' WHERE ID = ${firm.ID}`);
  saveDatabaseToDisk();
}

export function deleteSupplier(id: number) {
  if (!db) return;
  db.run(`UPDATE FIRMI SET DEL = 1 WHERE ID = ${id}`);
  saveDatabaseToDisk();
}

export function addInvoiceWithBatches(
  nomerDoc: string,
  dateStr: string,
  firmId: number,
  items: Array<{ productId: number; kolvoKg: number; cena: number; srokGodnosti: string }>
) {
  if (!db) return;
  const totalSum = items.reduce((sum, item) => sum + (item.kolvoKg * item.cena), 0);

  // 1. Insert Invoice
  db.run(`INSERT INTO NAKLADNIE_PRIXODA (ID_FIRMI, NOMER_DOCUMENTA, DATA, SUMMA)
     VALUES (${firmId || 1}, '${esc(nomerDoc)}', '${esc(dateStr)}', ${totalSum})`);

  // Get inserted invoice ID
  const invRes = db.exec("SELECT last_insert_rowid()");
  const invoiceId = invRes[0]?.values[0]?.[0] || 1;

  // 2. Insert Stock Batches & Update product baseline prices
  items.forEach(item => {
    const itemSum = item.kolvoKg * item.cena;
    db.run(`INSERT INTO PARTII_NOW (ID_NAKLADNOJ, ID_PRODUKTA, KOLVO_KG, CENA, SUMMA, SROK_GODNOSTI, OST_KG)
       VALUES (${invoiceId}, ${item.productId}, ${item.kolvoKg}, ${item.cena}, ${itemSum}, '${esc(item.srokGodnosti)}', ${item.kolvoKg})`);

    // Update baseline price in PRODUKTS table
    db.run(`UPDATE PRODUKTS SET CENA = ${item.cena} WHERE ID = ${item.productId}`);
  });

  saveDatabaseToDisk();
}

export function updateStockBatch(id: number, ostKg: number, cena: number, srokGodnosti: string) {
  if (!db) return;
  const itemSum = ostKg * cena;
  db.run(`UPDATE PARTII_NOW SET OST_KG = ${ostKg}, CENA = ${cena}, SUMMA = ${itemSum}, SROK_GODNOSTI = '${esc(srokGodnosti)}' WHERE ID = ${id}`);
  saveDatabaseToDisk();
}

export function deleteStockBatch(id: number) {
  if (!db) return;
  db.run(`DELETE FROM PARTII_NOW WHERE ID = ${id}`);
  saveDatabaseToDisk();
}

export function deleteInvoice(id: number) {
  if (!db) return;
  db.run(`DELETE FROM NAKLADNIE_PRIXODA WHERE ID = ${id}`);
  db.run(`DELETE FROM PARTII_NOW WHERE ID_NAKLADNOJ = ${id}`);
  saveDatabaseToDisk();
}

export function deductStockFIFO(
  requirements: Array<{ productId: number; productName: string; totalGrams: number }>
): { success: boolean; deductedCount: number; warnings: string[] } {
  if (!db) return { success: false, deductedCount: 0, warnings: ['БД не підключено'] };

  const warnings: string[] = [];
  let deductedCount = 0;

  requirements.forEach(req => {
    let neededKg = req.totalGrams / 1000;
    if (neededKg <= 0) return;

    // Fetch active batches for this product ordered by ID ASC (oldest first - FIFO)
    const batches = queryAll<StockBatch>(
      `SELECT * FROM PARTII_NOW WHERE ID_PRODUKTA = ${req.productId} AND OST_KG > 0 ORDER BY ID ASC`
    );

    let currentNeeded = neededKg;

    for (const batch of batches) {
      if (currentNeeded <= 0) break;

      const takeKg = Math.min(batch.OST_KG, currentNeeded);
      const newOst = Math.max(0, batch.OST_KG - takeKg);
      const newSum = newOst * batch.CENA;

      db.run(`UPDATE PARTII_NOW SET OST_KG = ${newOst}, SUMMA = ${newSum} WHERE ID = ${batch.ID}`);
      currentNeeded -= takeKg;
      deductedCount++;
    }

    if (currentNeeded > 0.001) {
      warnings.push(`«${req.productName}»: нестача ${currentNeeded.toFixed(3)} кг/л`);
    }
  });

  saveDatabaseToDisk();
  return { success: true, deductedCount, warnings };
}

export function getProductHistory(productId: number): ProductHistoryData | null {
  if (!db) return null;
  const products = queryAll<Product>(`SELECT * FROM PRODUKTS WHERE ID = ${productId}`);
  if (!products.length) return null;
  const product = products[0];

  const categories = queryAll<ProductCategory>(`SELECT * FROM GRUPPI_PRODUKTOV WHERE ID = ${product.ID_GRUPPI_PRODUKTOV}`);
  const categoryName = categories[0]?.NAME || 'Продукти харчування';

  const batches = queryAll<ProductHistoryBatch>(`
    SELECT p.*, n.NOMER_DOCUMENTA, n.DATA as INVOICE_DATE, f.NAME as firmName
    FROM PARTII_NOW p
    LEFT JOIN NAKLADNIE_PRIXODA n ON p.ID_NAKLADNOJ = n.ID
    LEFT JOIN FIRMI f ON n.ID_FIRMI = f.ID
    WHERE p.ID_PRODUKTA = ${productId}
    ORDER BY n.DATA DESC, p.ID DESC
  `);

  const usages = queryAll<ProductHistoryUsage>(`
    SELECT k.*, b.NAME as dishName, m.DATA as menuDate, m.MEAL_TYPE
    FROM KOMPONENTI_KARTOTEKI k
    JOIN KARTOTEKA_BLUD b ON k.ID_BLUDA = b.ID
    JOIN MENU m ON m.ID_BLUDA = b.ID
    WHERE k.ID_PRODUKTA = ${productId}
    ORDER BY m.DATA DESC
  `);

  const totalStockKg = batches.reduce((sum, b) => sum + (b.OST_KG || 0), 0);
  const totalStockCost = batches.reduce((sum, b) => sum + ((b.OST_KG || 0) * b.CENA), 0);

  return {
    product,
    categoryName,
    totalStockKg,
    totalStockCost,
    batches,
    usages
  };
}




