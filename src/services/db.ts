import { getEmbeddedDbBytes } from './db_data';
import {
  Product, ProductCategory, Dish, DishCategory,
  RecipeComponent, EaterCategory, MenuHeader,
  InvoiceHeader, StockBatch, Institution, SupplierFirm,
  ProductHistoryData, ProductHistoryBatch, ProductHistoryUsage, PropertyItem, PropertyWriteOffRecord,
  SadokGroup, SadokEmployee, SadokChild
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

export const getInvoices = (): InvoiceHeader[] => {
  if (db) {
    try {
      db.run(`
        UPDATE FIRMI SET
          NAME = 'ПрАТ «Криворізький Міськмолокозавод №1»',
          ADRES = 'м. Кривий Ріг, вул. Каховська, 40',
          TELEFON = '(056) 409-52-30',
          INN = '00443421'
        WHERE NAME LIKE '%Молокозавод%' OR NAME LIKE '%ООО%' OR ADRES LIKE '%Москва%' OR INN LIKE '77%' OR ID = 1;
      `);
      db.run(`
        UPDATE FIRMI SET
          NAME = 'ТОВ «Птахофабрика Зарічна»',
          ADRES = 'Дніпропетровська обл., м. Кривий Ріг, вул. Польова, 5',
          TELEFON = '(056) 404-12-88',
          INN = '32984105'
        WHERE NAME LIKE '%Птицефабрика%' OR NAME LIKE '%Северная%' OR NAME LIKE '%ЗАО%' OR ADRES LIKE '%Московская%' OR INN LIKE '50%' OR ID = 2;
      `);
    } catch (_) {}
  }
  return queryAll<InvoiceHeader>(`
    SELECT n.*, f.NAME as firmName
    FROM NAKLADNIE_PRIXODA n
    LEFT JOIN FIRMI f ON n.ID_FIRMI = f.ID
    ORDER BY n.DATA DESC
  `).map(inv => {
    let fname = inv.firmName || '';
    if (fname.includes('Молокозавод') || fname.includes('ООО') || fname.includes('Москва') || fname.includes('Городской')) {
      fname = 'ПрАТ «Криворізький Міськмолокозавод №1»';
    } else if (fname.includes('Птицефабрика') || fname.includes('Северная') || fname.includes('ЗАО')) {
      fname = 'ТОВ «Птахофабрика Зарічна»';
    }
    return { ...inv, firmName: fname };
  });
};

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

    // Auto-migrate old default records to Kryvyi Rih KZDO KT #145 KMR
    try {
      db.run(`
        UPDATE SADIKI SET
          NAME = 'Криворізький КЗДО КТ №145 КМР',
          ADRES = 'Дніпропетровська область, м. Кривий Ріг, Тернівський район, вул. Перлинна 23А',
          TELEFON = '(098) 816-05-37',
          EDRPOU = '26136748',
          DIRECTOR = 'Павлухіна Наталія Георгіївна',
          NURSE = 'Суміна Наталія Євгенівна'
        WHERE NAME LIKE '%ГБОУ%' OR NAME LIKE '%Москва%' OR NAME LIKE '%Сказка%' OR NAME LIKE '%105%' OR ID = 1
      `);
    } catch (_) {}
  }
  return queryAll<Institution>('SELECT * FROM SADIKI ORDER BY ID').map(i => {
    let name = i.NAME || '';
    if (name.includes('ГБОУ') || name.includes('Сказка') || name.includes('105') || name.includes('Москва')) {
      name = 'Криворізький КЗДО КТ №145 КМР';
    }
    return {
      ...i,
      NAME: name,
      ADRES: i.ADRES || 'Дніпропетровська область, м. Кривий Ріг, Тернівський район, вул. Перлинна 23А',
      TELEFON: i.TELEFON || '(098) 816-05-37',
      EDRPOU: i.EDRPOU || '26136748',
      DIRECTOR: i.DIRECTOR || 'Павлухіна Наталія Георгіївна',
      NURSE: i.NURSE || 'Суміна Наталія Євгенівна',
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

export const getSuppliers = (): SupplierFirm[] => {
  if (db) {
    try {
      db.run(`
        UPDATE FIRMI SET
          NAME = 'ПрАТ «Криворізький Міськмолокозавод №1»',
          ADRES = 'м. Кривий Ріг, вул. Каховська, 40',
          TELEFON = '(056) 409-52-30',
          INN = '00443421'
        WHERE NAME LIKE '%Молокозавод%' OR NAME LIKE '%ООО%' OR ADRES LIKE '%Москва%' OR INN LIKE '77%' OR ID = 1;
      `);
      db.run(`
        UPDATE FIRMI SET
          NAME = 'ТОВ «Птахофабрика Зарічна»',
          ADRES = 'Дніпропетровська обл., м. Кривий Ріг, вул. Польова, 5',
          TELEFON = '(056) 404-12-88',
          INN = '32984105'
        WHERE NAME LIKE '%Птицефабрика%' OR NAME LIKE '%Северная%' OR NAME LIKE '%ЗАО%' OR ADRES LIKE '%Московская%' OR INN LIKE '50%' OR ID = 2;
      `);
    } catch (_) {}
  }
  return queryAll<SupplierFirm>('SELECT * FROM FIRMI WHERE DEL = 0 ORDER BY NAME').map(s => {
    let name = s.NAME || '';
    let adres = s.ADRES || '';
    let phone = s.TELEFON || '';
    let inn = s.INN || '';

    if (name.includes('Молокозавод') || name.includes('ООО') || adres.includes('Москва') || inn.startsWith('77') || name.includes('Городской')) {
      name = 'ПрАТ «Криворізький Міськмолокозавод №1»';
      adres = 'м. Кривий Ріг, вул. Каховська, 40';
      phone = '(056) 409-52-30';
      inn = '00443421';
    } else if (name.includes('Птицефабрика') || name.includes('Северная') || name.includes('ЗАО') || adres.includes('Московская') || inn.startsWith('50')) {
      name = 'ТОВ «Птахофабрика Зарічна»';
      adres = 'Дніпропетровська обл., м. Кривий Ріг, вул. Польова, 5';
      phone = '(056) 404-12-88';
      inn = '32984105';
    }

    return { ...s, NAME: name, ADRES: adres, TELEFON: phone, INN: inn };
  });
};

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

const INITIAL_PROPERTY_ITEMS: PropertyItem[] = [
  {
    ID: 1,
    INVENTAR_NUMBER: '10114001',
    NAME: 'Стіл дитячий регульований (4-місний)',
    CATEGORY: 'Меблі та м\'який інвентар',
    CONDITION: 'Відмінний',
    YEAR_COMMISSIONED: 2022,
    INITIAL_COST: 1850.00,
    TOTAL_QUANTITY: 25,
    LOCATIONS: [
      { id: '1-1', locationName: 'Група «Сонечко»', responsiblePerson: 'Коваль О. І. (вихователь)', quantity: 8 },
      { id: '1-2', locationName: 'Група «Казка»', responsiblePerson: 'Ткаченко М. В. (вихователь)', quantity: 10 },
      { id: '1-3', locationName: 'Група «Ясочка»', responsiblePerson: 'Лисенко І. П. (вихователь)', quantity: 7 },
    ],
    NOTES: 'Екологічні дерев\'яні столи з регулюванням висоти'
  },
  {
    ID: 2,
    INVENTAR_NUMBER: '10114002',
    NAME: 'Стільчик дитячий дерев\'яний',
    CATEGORY: 'Меблі та м\'який інвентар',
    CONDITION: 'Задовільний',
    YEAR_COMMISSIONED: 2021,
    INITIAL_COST: 450.00,
    TOTAL_QUANTITY: 80,
    LOCATIONS: [
      { id: '2-1', locationName: 'Група «Сонечко»', responsiblePerson: 'Коваль О. І. (вихователь)', quantity: 25 },
      { id: '2-2', locationName: 'Група «Казка»', responsiblePerson: 'Ткаченко М. В. (вихователь)', quantity: 30 },
      { id: '2-3', locationName: 'Група «Ясочка»', responsiblePerson: 'Лисенко І. П. (вихователь)', quantity: 25 },
    ],
    NOTES: 'Лаковане букове дерево'
  },
  {
    ID: 3,
    INVENTAR_NUMBER: '10114003',
    NAME: 'Конструктор розвивальний "LEGO Education"',
    CATEGORY: 'Іграшки та методичні матеріали',
    CONDITION: 'Відмінний',
    YEAR_COMMISSIONED: 2023,
    INITIAL_COST: 4200.00,
    TOTAL_QUANTITY: 6,
    LOCATIONS: [
      { id: '3-1', locationName: 'Методичний кабінет', responsiblePerson: 'Суміна Н. Є. (методист)', quantity: 2 },
      { id: '3-2', locationName: 'Група «Казка»', responsiblePerson: 'Ткаченко М. В.', quantity: 2 },
      { id: '3-3', locationName: 'Група «Сонечко»', responsiblePerson: 'Коваль О. І.', quantity: 2 },
    ]
  },
  {
    ID: 4,
    INVENTAR_NUMBER: '10114004',
    NAME: 'Мультимедійний проектор EPSON EB-X06',
    CATEGORY: 'Оргтехніка та прилади',
    CONDITION: 'Відмінний',
    YEAR_COMMISSIONED: 2023,
    INITIAL_COST: 18500.00,
    TOTAL_QUANTITY: 2,
    LOCATIONS: [
      { id: '4-1', locationName: 'Музична зала', responsiblePerson: 'Мельник Т. Г. (музкерівник)', quantity: 1 },
      { id: '4-2', locationName: 'Кабінет завідувача', responsiblePerson: 'Павлухіна Н. Г. (директор)', quantity: 1 },
    ]
  },
  {
    ID: 5,
    INVENTAR_NUMBER: '10114005',
    NAME: 'Шафа виробнича харчоблоку (нержавіюча сталь)',
    CATEGORY: 'Посуд та кухонне обладнання',
    CONDITION: 'Задовільний',
    YEAR_COMMISSIONED: 2020,
    INITIAL_COST: 12400.00,
    TOTAL_QUANTITY: 3,
    LOCATIONS: [
      { id: '5-1', locationName: 'Харчоблок', responsiblePerson: 'Петренко С. М. (шеф-кухар)', quantity: 3 },
    ]
  },
  {
    ID: 6,
    INVENTAR_NUMBER: '10114006',
    NAME: 'Туя західна "Smaragd" (декоративні дерева)',
    CATEGORY: 'Зелені насадження та благоустрій',
    CONDITION: 'Відмінний',
    YEAR_COMMISSIONED: 2021,
    INITIAL_COST: 650.00,
    TOTAL_QUANTITY: 14,
    LOCATIONS: [
      { id: '6-1', locationName: 'Територія ДНЗ (центральна алея)', responsiblePerson: 'Завгосп', quantity: 14 },
    ]
  },
  {
    ID: 7,
    INVENTAR_NUMBER: '10114007',
    NAME: 'Шведська стінка гімнастична дитяча',
    CATEGORY: 'Спортивний інвентар',
    CONDITION: 'Задовільний',
    YEAR_COMMISSIONED: 2019,
    INITIAL_COST: 6800.00,
    TOTAL_QUANTITY: 4,
    LOCATIONS: [
      { id: '7-1', locationName: 'Спортивна зала', responsiblePerson: 'Інструктор з фізкультури', quantity: 4 },
    ]
  }
];

export function getPropertyItems(): PropertyItem[] {
  const saved = localStorage.getItem('sadok_property_items');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (_) {}
  }
  localStorage.setItem('sadok_property_items', JSON.stringify(INITIAL_PROPERTY_ITEMS));
  return INITIAL_PROPERTY_ITEMS;
}

export function savePropertyItem(item: Partial<PropertyItem> & { NAME: string; INVENTAR_NUMBER: string }): PropertyItem[] {
  const current = getPropertyItems();
  let updated: PropertyItem[];

  if (item.ID) {
    updated = current.map(i => i.ID === item.ID ? { ...i, ...item } as PropertyItem : i);
  } else {
    const newId = current.length > 0 ? Math.max(...current.map(i => i.ID)) + 1 : 1;
    const newItem: PropertyItem = {
      ID: newId,
      INVENTAR_NUMBER: item.INVENTAR_NUMBER || `1011400${newId}`,
      NAME: item.NAME,
      CATEGORY: item.CATEGORY || 'Меблі та м\'який інвентар',
      CONDITION: item.CONDITION || 'Відмінний',
      YEAR_COMMISSIONED: item.YEAR_COMMISSIONED || new Date().getFullYear(),
      INITIAL_COST: Number(item.INITIAL_COST) || 0,
      TOTAL_QUANTITY: Number(item.TOTAL_QUANTITY) || 1,
      LOCATIONS: item.LOCATIONS || [{ id: Date.now().toString(), locationName: 'Загальна територія', responsiblePerson: 'Завгосп', quantity: Number(item.TOTAL_QUANTITY) || 1 }],
      NOTES: item.NOTES || ''
    };
    updated = [newItem, ...current];
  }

  localStorage.setItem('sadok_property_items', JSON.stringify(updated));
  return updated;
}

export function deletePropertyItem(id: number): PropertyItem[] {
  const current = getPropertyItems();
  const updated = current.filter(i => i.ID !== id);
  localStorage.setItem('sadok_property_items', JSON.stringify(updated));
  return updated;
}

// Property Write-Off Records Persistence
const INITIAL_PROPERTY_WRITEOFFS: PropertyWriteOffRecord[] = [
  {
    ID: 1,
    ACT_NUMBER: 'Акт № 01/2026',
    DATE: '2026-03-15',
    PROPERTY_ID: 1,
    INVENTAR_NUMBER: '10114001',
    PROPERTY_NAME: 'Дитячий стілець дерев\'яний',
    CATEGORY: 'Меблі та м\'який інвентар',
    QUANTITY: 3,
    LOCATION_NAME: 'Група «Сонечко»',
    RESPONSIBLE_PERSON: 'Коваль Олена Іванівна (Вихователь)',
    REASON: 'Повний фізичний знос, поломка спинки, непіддатливість ремонту',
    COMMISSION_HEAD: 'Павлухіна Н. Г. (Директор)',
    COMMISSION_MEMBERS: 'Суміна Н. Є. (Вихователь-методист), Завгосп Сидоренко В. П.',
    INITIAL_COST: 450,
    TOTAL_COST: 1350,
    NOTES: 'Списано за рішенням комісії інвентаризації'
  }
];

export function getPropertyWriteOffs(): PropertyWriteOffRecord[] {
  const saved = localStorage.getItem('sadok_property_writeoffs');
  if (saved) {
    try { return JSON.parse(saved); } catch (_) {}
  }
  localStorage.setItem('sadok_property_writeoffs', JSON.stringify(INITIAL_PROPERTY_WRITEOFFS));
  return INITIAL_PROPERTY_WRITEOFFS;
}

export function createPropertyWriteOff(data: Omit<PropertyWriteOffRecord, 'ID'>): { items: PropertyItem[]; writeOffs: PropertyWriteOffRecord[] } {
  const currentWriteOffs = getPropertyWriteOffs();
  const newId = currentWriteOffs.length > 0 ? Math.max(...currentWriteOffs.map(w => w.ID)) + 1 : 1;
  
  const newRecord: PropertyWriteOffRecord = {
    ...data,
    ID: newId
  };
  const updatedWriteOffs = [newRecord, ...currentWriteOffs];
  localStorage.setItem('sadok_property_writeoffs', JSON.stringify(updatedWriteOffs));

  // Deduct quantity from PropertyItem location
  const currentItems = getPropertyItems();
  const updatedItems = currentItems.map(item => {
    if (item.ID === data.PROPERTY_ID) {
      let updatedLocations = (item.LOCATIONS || []).map(loc => {
        if (loc.locationName === data.LOCATION_NAME) {
          const newQty = Math.max(0, loc.quantity - data.QUANTITY);
          return { ...loc, quantity: newQty };
        }
        return loc;
      });

      const newTotalQty = updatedLocations.reduce((sum, l) => sum + l.quantity, 0);
      let newCondition = item.CONDITION;
      if (newTotalQty === 0) {
        newCondition = 'Підлягає списанню';
      }

      return {
        ...item,
        TOTAL_QUANTITY: newTotalQty,
        LOCATIONS: updatedLocations,
        CONDITION: newCondition
      };
    }
    return item;
  });

  localStorage.setItem('sadok_property_items', JSON.stringify(updatedItems));
  return { items: updatedItems, writeOffs: updatedWriteOffs };
}

export function deletePropertyWriteOff(id: number): { items: PropertyItem[]; writeOffs: PropertyWriteOffRecord[] } {
  const currentWriteOffs = getPropertyWriteOffs();
  const target = currentWriteOffs.find(w => w.ID === id);
  if (!target) return { items: getPropertyItems(), writeOffs: currentWriteOffs };

  const updatedWriteOffs = currentWriteOffs.filter(w => w.ID !== id);
  localStorage.setItem('sadok_property_writeoffs', JSON.stringify(updatedWriteOffs));

  // Restore quantity to PropertyItem location
  const currentItems = getPropertyItems();
  const updatedItems = currentItems.map(item => {
    if (item.ID === target.PROPERTY_ID) {
      let found = false;
      let updatedLocations = (item.LOCATIONS || []).map(loc => {
        if (loc.locationName === target.LOCATION_NAME) {
          found = true;
          return { ...loc, quantity: loc.quantity + target.QUANTITY };
        }
        return loc;
      });

      if (!found) {
        updatedLocations.push({
          id: Date.now().toString(),
          locationName: target.LOCATION_NAME,
          responsiblePerson: target.RESPONSIBLE_PERSON,
          quantity: target.QUANTITY
        });
      }

      const newTotalQty = updatedLocations.reduce((sum, l) => sum + l.quantity, 0);
      return {
        ...item,
        TOTAL_QUANTITY: newTotalQty,
        LOCATIONS: updatedLocations
      };
    }
    return item;
  });

  localStorage.setItem('sadok_property_items', JSON.stringify(updatedItems));
  return { items: updatedItems, writeOffs: updatedWriteOffs };
}

// -----------------------------------------------------------------
// SHARED CADRES & GROUPS & CHILDREN STORE
// -----------------------------------------------------------------
const INITIAL_GROUPS: SadokGroup[] = [
  { ID: 1, NAME: 'Група «Сонечко»', AGE_CATEGORY: 'Ясла (1-3 роки)', ROOM_NUMBER: '101', TEACHER_NAME: 'Коваль Олена Іванівна', CHILDREN_COUNT: 25 },
  { ID: 2, NAME: 'Група «Казка»', AGE_CATEGORY: 'Молодша (3-4 роки)', ROOM_NUMBER: '102', TEACHER_NAME: 'Ткаченко Марія Василівна', CHILDREN_COUNT: 30 },
  { ID: 3, NAME: 'Група «Ясочка»', AGE_CATEGORY: 'Середня (4-5 років)', ROOM_NUMBER: '103', TEACHER_NAME: 'Лисенко Ірина Петрівна', CHILDREN_COUNT: 28 },
  { ID: 4, NAME: 'Група «Барвінок»', AGE_CATEGORY: 'Старша (5-7 років)', ROOM_NUMBER: '104', TEACHER_NAME: 'Петренко Олексій Сергійович', CHILDREN_COUNT: 26 },
  { ID: 5, NAME: 'Музична зала', AGE_CATEGORY: 'Спеціалізоване приміщення', ROOM_NUMBER: '201', TEACHER_NAME: 'Мельник Тетяна Григорівна', CHILDREN_COUNT: 0 },
  { ID: 6, NAME: 'Харчоблок', AGE_CATEGORY: 'Виробниче приміщення', ROOM_NUMBER: '100', TEACHER_NAME: 'Петренко Світлана Миколаївна', CHILDREN_COUNT: 0 },
  { ID: 7, NAME: 'Методичний кабінет', AGE_CATEGORY: 'Адміністрація', ROOM_NUMBER: '202', TEACHER_NAME: 'Суміна Наталія Євгенівна', CHILDREN_COUNT: 0 },
  { ID: 8, NAME: 'Територія ДНЗ', AGE_CATEGORY: 'Благоустрій', ROOM_NUMBER: 'Двір', TEACHER_NAME: 'Сидоренко Василь Петрович', CHILDREN_COUNT: 0 }
];

const INITIAL_EMPLOYEES: SadokEmployee[] = [
  { ID: 1, FULL_NAME: 'Павлухіна Наталія Георгіївна', POSITION: 'Директор ЗДО', PHONE: '(098) 816-05-37', IS_MVO: true, GROUP_NAME: 'Методичний кабінет' },
  { ID: 2, FULL_NAME: 'Суміна Наталія Євгенівна', POSITION: 'Методист / Вихователь-методист', PHONE: '(063) 127-26-43', IS_MVO: true, GROUP_NAME: 'Методичний кабінет' },
  { ID: 3, FULL_NAME: 'Коваль Олена Іванівна', POSITION: 'Вихователь', PHONE: '(097) 123-45-67', IS_MVO: false, GROUP_NAME: 'Група «Сонечко»' },
  { ID: 4, FULL_NAME: 'Ткаченко Марія Василівна', POSITION: 'Вихователь', PHONE: '(050) 234-56-78', IS_MVO: false, GROUP_NAME: 'Група «Казка»' },
  { ID: 5, FULL_NAME: 'Лисенко Ірина Петрівна', POSITION: 'Вихователь', PHONE: '(067) 345-67-89', IS_MVO: false, GROUP_NAME: 'Група «Ясочка»' },
  { ID: 6, FULL_NAME: 'Петренко Олексій Сергійович', POSITION: 'Вихователь / Фізінструктор', PHONE: '(093) 456-78-90', IS_MVO: false, GROUP_NAME: 'Група «Барвінок»' },
  { ID: 7, FULL_NAME: 'Петренко Світлана Миколаївна', POSITION: 'Шеф-кухар харчоблоку', PHONE: '(098) 567-89-01', IS_MVO: true, GROUP_NAME: 'Харчоблок' },
  { ID: 8, FULL_NAME: 'Мельник Тетяна Григорівна', POSITION: 'Музичний керівник', PHONE: '(066) 678-90-12', IS_MVO: false, GROUP_NAME: 'Музична зала' },
  { ID: 9, FULL_NAME: 'Сидоренко Василь Петрович', POSITION: 'Завідувач господарства (Завгосп)', PHONE: '(097) 789-01-23', IS_MVO: true, GROUP_NAME: 'Територія ДНЗ' }
];

const INITIAL_CHILDREN: SadokChild[] = [
  { 
    ID: 1, 
    FULL_NAME: 'Іваненко Артем Олександрович', 
    BIRTH_DATE: '2023-04-12', 
    GENDER: 'Чоловіча',
    BIRTH_CERTIFICATE: '1-КР № 458921',
    GROUP_NAME: 'Група «Сонечко»', 
    STATUS: 'Навчається',
    BENEFIT_CATEGORY: 'Багатодітна сім’я',
    ADDRESS: 'м. Кривий Ріг, вул. Перлинна 12, кв. 4',
    MOTHER_NAME: 'Іваненко Олена Олександрівна',
    MOTHER_PHONE: '(097) 111-22-33',
    FATHER_NAME: 'Іваненко Олександр Васильович',
    FATHER_PHONE: '(050) 999-88-77',
    PARENT_NAME: 'Іваненко О. О.', 
    PARENT_PHONE: '(097) 111-22-33', 
    ENROLLMENT_DATE: '2025-09-01',
    ENROLLMENT_ORDER: 'Наказ № 42-У',
    HEALTH_NOTES: 'Група здоров’я: 1-А. Щеплення за віком.',
    DIET_NOTES: 'Без алергічних обмежень.'
  },
  { 
    ID: 2, 
    FULL_NAME: 'Коваленко Софія Дмитрівна', 
    BIRTH_DATE: '2022-08-19', 
    GENDER: 'Жіноча',
    BIRTH_CERTIFICATE: '1-КР № 883412',
    GROUP_NAME: 'Група «Казка»', 
    STATUS: 'Навчається',
    BENEFIT_CATEGORY: 'Діти УБД',
    ADDRESS: 'м. Кривий Ріг, вул. Сергія Колачевського 54',
    MOTHER_NAME: 'Коваленко Ольга Миколаївна',
    MOTHER_PHONE: '(067) 222-33-44',
    PARENT_NAME: 'Коваленко О. М.', 
    PARENT_PHONE: '(067) 222-33-44', 
    ENROLLMENT_DATE: '2024-09-01',
    ENROLLMENT_ORDER: 'Наказ № 18-У',
    DIET_NOTES: 'Обмеження: безмолочна дієта (лактозна непереносимість).'
  },
  { 
    ID: 3, 
    FULL_NAME: 'Шевченко Максим Ігорович', 
    BIRTH_DATE: '2021-02-05', 
    GENDER: 'Чоловіча',
    GROUP_NAME: 'Група «Ясочка»', 
    STATUS: 'Навчається',
    BENEFIT_CATEGORY: 'ВПО (Внутрішньо переміщена особа)',
    ADDRESS: 'м. Кривий Ріг, вул. Миру 10',
    MOTHER_NAME: 'Шевченко Тетяна Петрівна',
    MOTHER_PHONE: '(050) 333-44-55',
    PARENT_NAME: 'Шевченко Т. П.', 
    PARENT_PHONE: '(050) 333-44-55'
  },
  { 
    ID: 4, 
    FULL_NAME: 'Мельник Аліна Романівна', 
    BIRTH_DATE: '2020-11-30', 
    GENDER: 'Жіноча',
    GROUP_NAME: 'Група «Барвінок»', 
    STATUS: 'Вибув',
    BENEFIT_CATEGORY: 'Норма',
    ADDRESS: 'м. Кривий Ріг, вул. Зелена 5',
    MOTHER_NAME: 'Мельник Наталія Вікторівна',
    MOTHER_PHONE: '(063) 444-55-66',
    PARENT_NAME: 'Мельник Н. В.', 
    PARENT_PHONE: '(063) 444-55-66',
    DEPARTURE_DATE: '2026-01-15',
    DEPARTURE_REASON: 'Зміна місця проживання родини'
  }
];

export function getGroups(): SadokGroup[] {
  const saved = localStorage.getItem('sadok_groups');
  if (saved) { try { return JSON.parse(saved); } catch (_) {} }
  localStorage.setItem('sadok_groups', JSON.stringify(INITIAL_GROUPS));
  return INITIAL_GROUPS;
}

export function saveGroup(group: Partial<SadokGroup> & { NAME: string }): SadokGroup[] {
  const current = getGroups();
  let updated: SadokGroup[];
  if (group.ID) {
    updated = current.map(g => g.ID === group.ID ? { ...g, ...group } as SadokGroup : g);
  } else {
    const newId = current.length > 0 ? Math.max(...current.map(g => g.ID)) + 1 : 1;
    updated = [{ ID: newId, NAME: group.NAME, AGE_CATEGORY: group.AGE_CATEGORY || 'Молодша', ROOM_NUMBER: group.ROOM_NUMBER || '', TEACHER_NAME: group.TEACHER_NAME || '', CHILDREN_COUNT: group.CHILDREN_COUNT || 0 }, ...current];
  }
  localStorage.setItem('sadok_groups', JSON.stringify(updated));
  return updated;
}

export function deleteGroup(id: number): SadokGroup[] {
  const current = getGroups();
  const updated = current.filter(g => g.ID !== id);
  localStorage.setItem('sadok_groups', JSON.stringify(updated));
  return updated;
}

export function getEmployees(): SadokEmployee[] {
  const saved = localStorage.getItem('sadok_employees');
  if (saved) { try { return JSON.parse(saved); } catch (_) {} }
  localStorage.setItem('sadok_employees', JSON.stringify(INITIAL_EMPLOYEES));
  return INITIAL_EMPLOYEES;
}

export function saveEmployee(emp: Partial<SadokEmployee> & { FULL_NAME: string }): SadokEmployee[] {
  const current = getEmployees();
  let updated: SadokEmployee[];
  if (emp.ID) {
    updated = current.map(e => e.ID === emp.ID ? { ...e, ...emp } as SadokEmployee : e);
  } else {
    const newId = current.length > 0 ? Math.max(...current.map(e => e.ID)) + 1 : 1;
    updated = [{ ID: newId, FULL_NAME: emp.FULL_NAME, POSITION: emp.POSITION || 'Вихователь', PHONE: emp.PHONE || '', IS_MVO: Boolean(emp.IS_MVO), GROUP_NAME: emp.GROUP_NAME || '', NOTES: emp.NOTES || '' }, ...current];
  }
  localStorage.setItem('sadok_employees', JSON.stringify(updated));
  return updated;
}

export function deleteEmployee(id: number): SadokEmployee[] {
  const current = getEmployees();
  const updated = current.filter(e => e.ID !== id);
  localStorage.setItem('sadok_employees', JSON.stringify(updated));
  return updated;
}

export function getChildren(): SadokChild[] {
  const saved = localStorage.getItem('sadok_children');
  if (saved) { try { return JSON.parse(saved); } catch (_) {} }
  localStorage.setItem('sadok_children', JSON.stringify(INITIAL_CHILDREN));
  return INITIAL_CHILDREN;
}

export function saveChild(child: Partial<SadokChild> & { FULL_NAME: string }): SadokChild[] {
  const current = getChildren();
  let updated: SadokChild[];
  if (child.ID) {
    updated = current.map(c => c.ID === child.ID ? { ...c, ...child } as SadokChild : c);
  } else {
    const newId = current.length > 0 ? Math.max(...current.map(c => c.ID)) + 1 : 1;
    updated = [{ ID: newId, FULL_NAME: child.FULL_NAME, BIRTH_DATE: child.BIRTH_DATE || '2022-01-01', GROUP_NAME: child.GROUP_NAME || 'Група «Сонечко»', PARENT_NAME: child.PARENT_NAME || '', PARENT_PHONE: child.PARENT_PHONE || '', STATUS: child.STATUS || 'Навчається', HEALTH_NOTES: child.HEALTH_NOTES || '', PSYCHOLOGY_NOTES: child.PSYCHOLOGY_NOTES || '' }, ...current];
  }
  localStorage.setItem('sadok_children', JSON.stringify(updated));
  return updated;
}

export function deleteChild(id: number): SadokChild[] {
  const current = getChildren();
  const updated = current.filter(c => c.ID !== id);
  localStorage.setItem('sadok_children', JSON.stringify(updated));
  return updated;
}






