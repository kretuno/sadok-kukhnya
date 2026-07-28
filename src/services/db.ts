import { getEmbeddedDbBytes } from './db_data';
import {
  Product, ProductCategory, Dish, DishCategory,
  RecipeComponent, EaterCategory, MenuHeader,
  InvoiceHeader, StockBatch, Institution, SupplierFirm,
  ProductHistoryData, ProductHistoryBatch, ProductHistoryUsage, PropertyItem, PropertyWriteOffRecord,
  SadokGroup, SadokEmployee, SadokChild
} from '../types';
import {
  planFifoDeductions,
  applyPropertyWriteOff,
  restorePropertyWriteOff,
  validateMenuEntryInput,
} from '../domain/operations';
import {
  Permission,
  archiveRecord,
  assertDateOpen,
  getArchiveEntry,
  getCurrentUser,
  getGovernanceStorageKeys,
  markArchiveRestored,
  recordAudit,
  requirePermission,
} from './governance';

// -----------------------------------------------------------------
// Singleton DB instance (sql.js Database object)
// -----------------------------------------------------------------
let db: any = null;
export const CURRENT_DATABASE_SCHEMA_VERSION = 4;

interface SadokBackupEnvelope {
  format: 'sadok-backup';
  formatVersion: 1;
  schemaVersion: number;
  createdAt: string;
  trigger: 'automatic' | 'manual';
  createdBy: string;
  sqliteBase64: string;
  localStorage: Record<string, string>;
  checksum: string;
  verification: {
    sqliteIntegrity: 'ok';
    checkedAt: string;
  };
}

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
        await prepareDatabase();
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
      await prepareDatabase();
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

  await prepareDatabase();
  return db;
}

async function prepareDatabase() {
  runDatabaseMigrations();
  saveDatabaseToDisk();
  await ensureAutomaticBackup();
}

export function getDatabaseSchemaVersion(): number {
  if (!db) return 0;
  try {
    const result = db.exec('SELECT MAX(VERSION) FROM SADOK_SCHEMA_MIGRATIONS');
    return Number(result[0]?.values[0]?.[0] || 0);
  } catch {
    return 0;
  }
}

export function runDatabaseMigrations(): number {
  if (!db) return 0;

  db.run(`
    CREATE TABLE IF NOT EXISTS SADOK_SCHEMA_MIGRATIONS (
      VERSION INTEGER PRIMARY KEY,
      NAME TEXT NOT NULL,
      APPLIED_AT TEXT NOT NULL
    )
  `);

  const applied = new Set<number>(
    (db.exec('SELECT VERSION FROM SADOK_SCHEMA_MIGRATIONS')[0]?.values || [])
      .map((row: any[]) => Number(row[0]))
  );
  const migrations: Array<{ version: number; name: string; sql: string[] }> = [
    {
      version: 1,
      name: 'Governance and backup history',
      sql: [
        `CREATE TABLE IF NOT EXISTS SADOK_BACKUP_CHECKS (
          ID INTEGER PRIMARY KEY AUTOINCREMENT,
          CREATED_AT TEXT NOT NULL,
          TRIGGER_TYPE TEXT NOT NULL,
          STATUS TEXT NOT NULL,
          CHECKSUM TEXT NOT NULL
        )`,
      ],
    },
    {
      version: 2,
      name: 'Operational query indexes',
      sql: [
        'CREATE INDEX IF NOT EXISTS IDX_SADOK_MENU_DATE ON MENU(DATA)',
        'CREATE INDEX IF NOT EXISTS IDX_SADOK_BATCH_PRODUCT ON PARTII_NOW(ID_PRODUKTA, ID)',
        'CREATE INDEX IF NOT EXISTS IDX_SADOK_INVOICE_DATE ON NAKLADNIE_PRIXODA(DATA)',
      ],
    },
    {
      version: 3,
      name: 'Future synchronization operation ledger',
      sql: [
        `CREATE TABLE IF NOT EXISTS SADOK_OPERATION_LEDGER (
          OPERATION_ID TEXT PRIMARY KEY,
          CREATED_AT TEXT NOT NULL,
          DEVICE_ID TEXT NOT NULL,
          USER_ID TEXT NOT NULL,
          ENTITY_TYPE TEXT NOT NULL,
          ENTITY_ID TEXT,
          ACTION TEXT NOT NULL,
          PAYLOAD_JSON TEXT,
          SYNC_STATUS TEXT NOT NULL DEFAULT 'pending'
        )`,
        'CREATE INDEX IF NOT EXISTS IDX_SADOK_LEDGER_SYNC ON SADOK_OPERATION_LEDGER(SYNC_STATUS, CREATED_AT)',
      ],
    },
    {
      version: 4,
      name: 'Four nutrition categories',
      sql: [
        `UPDATE KATEGORII_DETOK SET NAME = 'Ясла (1–3 роки)', NOMER_PP = 1 WHERE ID = 1`,
        `UPDATE KATEGORII_DETOK SET NAME = 'Молодша група (3–4 роки)', NOMER_PP = 2 WHERE ID = 2`,
        `UPDATE KATEGORII_DETOK SET NAME = 'Садок (4–7 років)', NOMER_PP = 3 WHERE ID = 3`,
        `INSERT OR REPLACE INTO KATEGORII_DETOK (ID, NAME, NOMER_PP) VALUES (4, 'Співробітники', 4)`,
        `UPDATE KATEGORII_EDOKOV SET NAME = 'Ясла (1–3 роки)', NOMER_PP = 1 WHERE ID = 1`,
        `UPDATE KATEGORII_EDOKOV SET NAME = 'Молодша група (3–4 роки)', NOMER_PP = 2 WHERE ID = 2`,
        `UPDATE KATEGORII_EDOKOV SET NAME = 'Садок (4–7 років)', NOMER_PP = 3 WHERE ID = 3`,
        `INSERT OR REPLACE INTO KATEGORII_EDOKOV (ID, NAME, NOMER_PP) VALUES (4, 'Співробітники', 4)`,
      ],
    },
  ];

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    db.run('BEGIN');
    try {
      migration.sql.forEach(sql => db.run(sql));
      db.run(
        `INSERT INTO SADOK_SCHEMA_MIGRATIONS (VERSION, NAME, APPLIED_AT)
         VALUES (?, ?, ?)`,
        [migration.version, migration.name, new Date().toISOString()]
      );
      db.run('COMMIT');
    } catch (error) {
      db.run('ROLLBACK');
      throw new Error(`Ошибка миграции БД v${migration.version}: ${String(error)}`);
    }
  }

  return getDatabaseSchemaVersion();
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

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function checksumText(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function collectBackupLocalStorage(): Record<string, string> {
  const selected: Record<string, string> = {};
  const governanceKeys = new Set(getGovernanceStorageKeys());
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (!key) continue;
    if (
      key.startsWith('sadok_')
      || key.startsWith('medsestra_')
      || governanceKeys.has(key)
    ) {
      const value = localStorage.getItem(key);
      if (value !== null && key !== 'sadok_sqlite_db_b64') selected[key] = value;
    }
  }
  return selected;
}

function verifySqliteBytes(bytes: Uint8Array) {
  if (!db) throw new Error('База данных не инициализирована');
  const TestDatabase = db.constructor;
  const testDb = new TestDatabase(bytes);
  try {
    const result = testDb.exec('PRAGMA integrity_check');
    const status = String(result[0]?.values[0]?.[0] || '').toLowerCase();
    if (status !== 'ok') throw new Error(`SQLite integrity_check: ${status || 'unknown'}`);
  } finally {
    testDb.close();
  }
}

export async function createSystemBackup(
  trigger: 'automatic' | 'manual' = 'manual'
): Promise<{ envelope: SadokBackupEnvelope; storage: 'electron' | 'browser' }> {
  if (trigger === 'manual') requirePermission('backup.manage');
  if (!db) throw new Error('База данных не инициализирована');

  const sqliteBytes = db.export() as Uint8Array;
  verifySqliteBytes(sqliteBytes);
  const sqliteBase64 = bytesToBase64(sqliteBytes);
  const localStorageSnapshot = collectBackupLocalStorage();
  const checksum = checksumText(sqliteBase64 + JSON.stringify(localStorageSnapshot));
  const envelope: SadokBackupEnvelope = {
    format: 'sadok-backup',
    formatVersion: 1,
    schemaVersion: getDatabaseSchemaVersion(),
    createdAt: new Date().toISOString(),
    trigger,
    createdBy: getCurrentUser().displayName,
    sqliteBase64,
    localStorage: localStorageSnapshot,
    checksum,
    verification: {
      sqliteIntegrity: 'ok',
      checkedAt: new Date().toISOString(),
    },
  };
  const json = JSON.stringify(envelope);
  let storage: 'electron' | 'browser' = 'browser';

  if (window.electronAPI?.createBackup) {
    const result = await window.electronAPI.createBackup(
      new TextEncoder().encode(json),
      trigger,
    );
    if (!result.success) throw new Error(result.error || 'Не удалось сохранить резервную копию');
    storage = 'electron';
  } else {
    const backups = JSON.parse(localStorage.getItem('sadok_browser_backups_v1') || '[]') as SadokBackupEnvelope[];
    localStorage.setItem('sadok_browser_backups_v1', JSON.stringify([envelope, ...backups].slice(0, 3)));
  }

  db.run(
    `INSERT INTO SADOK_BACKUP_CHECKS (CREATED_AT, TRIGGER_TYPE, STATUS, CHECKSUM)
     VALUES (?, ?, 'verified', ?)`,
    [envelope.createdAt, trigger, checksum],
  );
  localStorage.setItem('sadok_last_automatic_backup_date', envelope.createdAt.slice(0, 10));
  recordAudit({
    action: 'backup',
    entityType: 'database',
    summary: `${trigger === 'automatic' ? 'Автоматическая' : 'Ручная'} резервная копия создана и проверена`,
    after: { checksum, schemaVersion: envelope.schemaVersion, storage },
  });
  saveDatabaseToDisk();
  return { envelope, storage };
}

export async function ensureAutomaticBackup(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem('sadok_last_automatic_backup_date') === today) return;
  try {
    await createSystemBackup('automatic');
  } catch (error) {
    console.warn('[Backup] Automatic backup failed:', error);
  }
}

export async function listSystemBackups(): Promise<Array<{
  id: string;
  createdAt: string;
  size: number;
  trigger: string;
  verified: boolean;
}>> {
  if (window.electronAPI?.listBackups) return window.electronAPI.listBackups();
  const backups = JSON.parse(localStorage.getItem('sadok_browser_backups_v1') || '[]') as SadokBackupEnvelope[];
  return backups.map((backup, index) => ({
    id: `browser-${index}`,
    createdAt: backup.createdAt,
    size: JSON.stringify(backup).length,
    trigger: backup.trigger,
    verified: backup.verification?.sqliteIntegrity === 'ok',
  }));
}

export function downloadBackup(envelope: SadokBackupEnvelope) {
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `sadok_backup_${envelope.createdAt.replace(/[:.]/g, '-')}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function restoreSystemBackup(raw: string): Promise<void> {
  requirePermission('backup.manage');
  const envelope = JSON.parse(raw) as SadokBackupEnvelope;
  if (envelope.format !== 'sadok-backup' || envelope.formatVersion !== 1) {
    throw new Error('Файл не является резервной копией SADOK');
  }
  const expectedChecksum = checksumText(
    envelope.sqliteBase64 + JSON.stringify(envelope.localStorage)
  );
  if (expectedChecksum !== envelope.checksum) {
    throw new Error('Контрольная сумма резервной копии не совпадает');
  }
  const bytes = base64ToBytes(envelope.sqliteBase64);
  verifySqliteBytes(bytes);

  const DatabaseConstructor = db.constructor;
  const restored = new DatabaseConstructor(bytes);
  db.close();
  db = restored;
  runDatabaseMigrations();
  Object.entries(envelope.localStorage).forEach(([key, value]) => localStorage.setItem(key, value));
  recordAudit({
    action: 'restore',
    entityType: 'database',
    summary: `Восстановлена резервная копия от ${envelope.createdAt}`,
    after: { checksum: envelope.checksum, schemaVersion: envelope.schemaVersion },
  });
  saveDatabaseToDisk();
  window.location.reload();
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
  if (name.includes('Ясла') || name.includes('Ясли')) return 'Ясла (1–3 роки)';
  if (name.includes('Молодша') || name.includes('3-4') || name.includes('3–4')) return 'Молодша група (3–4 роки)';
  if (name.includes('Садок') || name.includes('Сад') || name.includes('Садокок')) return 'Садок (4–7 років)';
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
  requirePermission('menu.write');
  assertDateOpen(date);
  const validationErrors = validateMenuEntryInput({ date, dishId, dishName, mealType });
  if (validationErrors.length > 0) throw new Error(validationErrors.join('. '));
  db.run(`INSERT INTO MENU (ID_ZOY, DATA, ID_BLUDA, NAME_BLUDA, MEAL_TYPE)
     VALUES (1, '${date}', ${dishId}, '${esc(dishName)}', '${esc(mealType)}')`);
  const id = String(db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] || '');
  recordAudit({
    action: 'create',
    entityType: 'menu',
    entityId: id,
    summary: `Добавлено блюдо «${dishName}» в меню на ${date} (${mealType})`,
    after: { date, dishId, dishName, mealType },
  });
  saveDatabaseToDisk();
}

export function deleteMenuEntry(id: number) {
  if (!db) return;
  requirePermission('menu.write');
  const before = queryAll<MenuHeader>(`SELECT * FROM MENU WHERE ID = ${id}`)[0];
  if (!before) return;
  assertDateOpen(before.DATA);
  archiveRecord({
    entityType: 'menu',
    entityId: String(id),
    label: `${before.DATA}: ${before.NAME_BLUDA}`,
    payload: before,
  });
  db.run(`DELETE FROM MENU WHERE ID = ${id}`);
  saveDatabaseToDisk();
}

export function addProduct(p: Partial<Product>): number {
  if (!db) return 0;
  requirePermission('products.write');
  db.run(`INSERT INTO PRODUKTS (NAME, ID_GRUPPI_PRODUKTOV, BELKI, ZIRI, UGLEVODI, KALORII, EDINICA_IZMERENIA, CENA, PROCENT_OTXODOV)
     VALUES ('${esc(p.NAME!)}', ${p.ID_GRUPPI_PRODUKTOV || 1}, ${p.BELKI || 0}, ${p.ZIRI || 0},
             ${p.UGLEVODI || 0}, ${p.KALORII || 0}, '${esc(p.EDINICA_IZMERENIA || 'кг')}',
             ${p.CENA || 0}, ${p.PROCENT_OTXODOV || 0})`);
  const res = db.exec("SELECT last_insert_rowid()");
  const id = (res[0]?.values[0]?.[0] as number) || 0;
  recordAudit({
    action: 'create',
    entityType: 'product',
    entityId: String(id),
    summary: `Создан продукт «${p.NAME}»`,
    after: p,
  });
  saveDatabaseToDisk();
  return id;
}

export function updateProduct(p: Product) {
  if (!db) return;
  requirePermission('products.write');
  const before = queryAll<Product>(`SELECT * FROM PRODUKTS WHERE ID = ${p.ID}`)[0];
  db.run(`UPDATE PRODUKTS SET NAME='${esc(p.NAME)}', ID_GRUPPI_PRODUKTOV=${p.ID_GRUPPI_PRODUKTOV},
       BELKI=${p.BELKI}, ZIRI=${p.ZIRI}, UGLEVODI=${p.UGLEVODI}, KALORII=${p.KALORII},
       EDINICA_IZMERENIA='${esc(p.EDINICA_IZMERENIA)}', CENA=${p.CENA}, PROCENT_OTXODOV=${p.PROCENT_OTXODOV}
     WHERE ID = ${p.ID}`);
  recordAudit({
    action: 'update',
    entityType: 'product',
    entityId: String(p.ID),
    summary: `Изменён продукт «${p.NAME}»`,
    before,
    after: p,
  });
  saveDatabaseToDisk();
}

export function deleteProduct(id: number) {
  if (!db) return;
  requirePermission('products.write');
  const before = queryAll<Product>(`SELECT * FROM PRODUKTS WHERE ID = ${id}`)[0];
  if (!before) return;
  archiveRecord({
    entityType: 'product',
    entityId: String(id),
    label: before.NAME,
    payload: before,
  });
  db.run(`DELETE FROM PRODUKTS WHERE ID = ${id}`);
  saveDatabaseToDisk();
}

export function addDish(d: Partial<Dish>) {
  if (!db) return;
  requirePermission('recipes.write');
  db.run(`INSERT INTO KARTOTEKA_BLUD (NAME, NOTES, ID_GRUPPI_BLUD, VYXOD, BELKI, ZIRI, UGLEVODI, KALORII)
     VALUES ('${esc(d.NAME!)}', '${esc(d.NOTES || '')}', ${d.ID_GRUPPI_BLUD || 1},
             ${d.VYXOD || 0}, ${d.BELKI || 0}, ${d.ZIRI || 0}, ${d.UGLEVODI || 0}, ${d.KALORII || 0})`);
  const id = String(db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] || '');
  recordAudit({
    action: 'create',
    entityType: 'dish',
    entityId: id,
    summary: `Создано блюдо «${d.NAME}»`,
    after: d,
  });
  saveDatabaseToDisk();
}

export function updateDish(d: Dish) {
  if (!db) return;
  requirePermission('recipes.write');
  const before = queryAll<Dish>(`SELECT * FROM KARTOTEKA_BLUD WHERE ID = ${d.ID}`)[0];
  db.run(`UPDATE KARTOTEKA_BLUD SET NAME='${esc(d.NAME)}', NOTES='${esc(d.NOTES || '')}',
       ID_GRUPPI_BLUD=${d.ID_GRUPPI_BLUD}, VYXOD=${d.VYXOD}, BELKI=${d.BELKI},
       ZIRI=${d.ZIRI}, UGLEVODI=${d.UGLEVODI}, KALORII=${d.KALORII}
     WHERE ID = ${d.ID}`);
  recordAudit({
    action: 'update',
    entityType: 'dish',
    entityId: String(d.ID),
    summary: `Изменено блюдо «${d.NAME}»`,
    before,
    after: d,
  });
  saveDatabaseToDisk();
}

export function deleteDish(id: number) {
  if (!db) return;
  requirePermission('recipes.write');
  const dish = queryAll<Dish>(`SELECT * FROM KARTOTEKA_BLUD WHERE ID = ${id}`)[0];
  if (!dish) return;
  const components = queryAll<RecipeComponent>(`SELECT * FROM KOMPONENTI_KARTOTEKI WHERE ID_BLUDA = ${id}`);
  archiveRecord({
    entityType: 'dish',
    entityId: String(id),
    label: dish.NAME,
    payload: { dish, components },
  });
  db.run(`DELETE FROM KARTOTEKA_BLUD WHERE ID = ${id}`);
  db.run(`DELETE FROM KOMPONENTI_KARTOTEKI WHERE ID_BLUDA = ${id}`);
  saveDatabaseToDisk();
}

export function addRecipeComponent(c: Partial<RecipeComponent>) {
  if (!db) return;
  requirePermission('recipes.write');
  db.run(`INSERT INTO KOMPONENTI_KARTOTEKI (ID_BLUDA, ID_PRODUKTA, ID_KATEGORII_DETEJ, GROSSO_GR, NETTO_GR)
     VALUES (${c.ID_BLUDA}, ${c.ID_PRODUKTA}, ${c.ID_KATEGORII_DETEJ || 1}, ${c.GROSSO_GR || 0}, ${c.NETTO_GR || 0})`);
  const id = String(db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] || '');
  recordAudit({
    action: 'create',
    entityType: 'recipe_component',
    entityId: id,
    summary: `Добавлен компонент рецептуры для блюда №${c.ID_BLUDA}`,
    after: c,
  });
  saveDatabaseToDisk();
}

export function deleteRecipeComponent(id: number) {
  if (!db) return;
  requirePermission('recipes.write');
  const before = queryAll<RecipeComponent>(`SELECT * FROM KOMPONENTI_KARTOTEKI WHERE ID = ${id}`)[0];
  if (!before) return;
  archiveRecord({
    entityType: 'recipe_component',
    entityId: String(id),
    label: `Компонент рецептуры №${id}`,
    payload: before,
  });
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
  requirePermission('settings.write');
  const before = queryAll<Institution>(`SELECT * FROM SADIKI WHERE ID = ${id}`)[0];
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
  recordAudit({
    action: 'update',
    entityType: 'institution',
    entityId: String(id),
    summary: `Изменены реквизиты учреждения «${inst.name}»`,
    before,
    after: inst,
  });
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
  requirePermission('settings.write');
  const isSep = inst.isSeparateWarehouse ? 1 : 0;
  db.run(`INSERT INTO SADIKI (NAME, ID_SADIKA, ADRES, TELEFON, EDRPOU, DIRECTOR, NURSE, COOK, IS_SEPARATE_WAREHOUSE) 
          VALUES ('${esc(inst.name)}', 1, '${esc(inst.adres || '')}', '${esc(inst.telefon || '')}', '${esc(inst.edrpou || '')}', '${esc(inst.director || '')}', '${esc(inst.nurse || '')}', '${esc(inst.cook || '')}', ${isSep})`);
  const res = db.exec("SELECT last_insert_rowid()");
  const id = (res[0]?.values[0]?.[0] as number) || 0;
  recordAudit({
    action: 'create',
    entityType: 'institution',
    entityId: String(id),
    summary: `Создан профиль учреждения «${inst.name}»`,
    after: inst,
  });
  saveDatabaseToDisk();
  return id;
}

export function deleteInstitution(id: number, purgeWarehouse: boolean = false) {
  if (!db) return;
  requirePermission('settings.write');
  const institution = queryAll<Institution>(`SELECT * FROM SADIKI WHERE ID = ${id}`)[0];
  if (!institution) return;
  archiveRecord({
    entityType: 'institution',
    entityId: String(id),
    label: institution.NAME,
    payload: { institution, purgeWarehouse },
  });
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
  requirePermission('stock.write');
  db.run(`INSERT INTO FIRMI (NAME, ADRES, TELEFON, INN) VALUES ('${esc(firm.NAME!)}', '${esc(firm.ADRES || '')}', '${esc(firm.TELEFON || '')}', '${esc(firm.INN || '')}')`);
  const id = String(db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] || '');
  recordAudit({
    action: 'create',
    entityType: 'supplier',
    entityId: id,
    summary: `Создан поставщик «${firm.NAME}»`,
    after: firm,
  });
  saveDatabaseToDisk();
}

export function updateSupplier(firm: SupplierFirm) {
  if (!db) return;
  requirePermission('stock.write');
  const before = queryAll<SupplierFirm>(`SELECT * FROM FIRMI WHERE ID = ${firm.ID}`)[0];
  db.run(`UPDATE FIRMI SET NAME='${esc(firm.NAME)}', ADRES='${esc(firm.ADRES || '')}', TELEFON='${esc(firm.TELEFON || '')}', INN='${esc(firm.INN || '')}' WHERE ID = ${firm.ID}`);
  recordAudit({
    action: 'update',
    entityType: 'supplier',
    entityId: String(firm.ID),
    summary: `Изменён поставщик «${firm.NAME}»`,
    before,
    after: firm,
  });
  saveDatabaseToDisk();
}

export function deleteSupplier(id: number) {
  if (!db) return;
  requirePermission('stock.write');
  const before = queryAll<SupplierFirm>(`SELECT * FROM FIRMI WHERE ID = ${id}`)[0];
  if (!before) return;
  archiveRecord({
    entityType: 'supplier',
    entityId: String(id),
    label: before.NAME,
    payload: before,
  });
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
  requirePermission('stock.write');
  assertDateOpen(dateStr);
  const totalSum = items.reduce((sum, item) => sum + (item.kolvoKg * item.cena), 0);
  let invoiceId: number;

  db.run('BEGIN');
  try {
    // 1. Insert Invoice
    db.run(`INSERT INTO NAKLADNIE_PRIXODA (ID_FIRMI, NOMER_DOCUMENTA, DATA, SUMMA)
       VALUES (${firmId || 1}, '${esc(nomerDoc)}', '${esc(dateStr)}', ${totalSum})`);

    // Get inserted invoice ID
    const invRes = db.exec("SELECT last_insert_rowid()");
    invoiceId = Number(invRes[0]?.values[0]?.[0] || 1);

    // 2. Insert Stock Batches & Update product baseline prices
    items.forEach(item => {
      const itemSum = item.kolvoKg * item.cena;
      db.run(`INSERT INTO PARTII_NOW (ID_NAKLADNOJ, ID_PRODUKTA, KOLVO_KG, CENA, SUMMA, SROK_GODNOSTI, OST_KG)
         VALUES (${invoiceId}, ${item.productId}, ${item.kolvoKg}, ${item.cena}, ${itemSum}, '${esc(item.srokGodnosti)}', ${item.kolvoKg})`);

      // Update baseline price in PRODUKTS table
      db.run(`UPDATE PRODUKTS SET CENA = ${item.cena} WHERE ID = ${item.productId}`);
    });
    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }

  recordAudit({
    action: 'create',
    entityType: 'invoice',
    entityId: String(invoiceId),
    summary: `Создана приходная накладная «${nomerDoc}» от ${dateStr}`,
    after: { nomerDoc, dateStr, firmId, totalSum, items },
  });
  saveDatabaseToDisk();
}

export function updateStockBatch(id: number, ostKg: number, cena: number, srokGodnosti: string) {
  if (!db) return;
  requirePermission('stock.write');
  const before = queryAll<StockBatch>(`SELECT * FROM PARTII_NOW WHERE ID = ${id}`)[0];
  const invoiceDate = queryAll<{ DATA: string }>(`
    SELECT n.DATA FROM PARTII_NOW p
    JOIN NAKLADNIE_PRIXODA n ON n.ID = p.ID_NAKLADNOJ
    WHERE p.ID = ${id}
  `)[0]?.DATA;
  if (invoiceDate) assertDateOpen(invoiceDate);
  const itemSum = ostKg * cena;
  db.run(`UPDATE PARTII_NOW SET OST_KG = ${ostKg}, CENA = ${cena}, SUMMA = ${itemSum}, SROK_GODNOSTI = '${esc(srokGodnosti)}' WHERE ID = ${id}`);
  recordAudit({
    action: 'update',
    entityType: 'stock_batch',
    entityId: String(id),
    summary: `Изменена складская партия №${id}`,
    before,
    after: { ostKg, cena, srokGodnosti },
  });
  saveDatabaseToDisk();
}

export function deleteStockBatch(id: number) {
  if (!db) return;
  requirePermission('stock.write');
  const before = queryAll<StockBatch>(`SELECT * FROM PARTII_NOW WHERE ID = ${id}`)[0];
  if (!before) return;
  const invoiceDate = queryAll<{ DATA: string }>(`
    SELECT n.DATA FROM NAKLADNIE_PRIXODA n WHERE n.ID = ${before.ID_NAKLADNOJ}
  `)[0]?.DATA;
  if (invoiceDate) assertDateOpen(invoiceDate);
  archiveRecord({
    entityType: 'stock_batch',
    entityId: String(id),
    label: `Складская партия №${id}`,
    payload: before,
  });
  db.run(`DELETE FROM PARTII_NOW WHERE ID = ${id}`);
  saveDatabaseToDisk();
}

export function deleteInvoice(id: number) {
  if (!db) return;
  requirePermission('stock.write');
  const invoice = queryAll<InvoiceHeader>(`SELECT * FROM NAKLADNIE_PRIXODA WHERE ID = ${id}`)[0];
  if (!invoice) return;
  assertDateOpen(invoice.DATA);
  const batches = queryAll<StockBatch>(`SELECT * FROM PARTII_NOW WHERE ID_NAKLADNOJ = ${id}`);
  archiveRecord({
    entityType: 'invoice',
    entityId: String(id),
    label: `Накладная ${invoice.NOMER_DOCUMENTA}`,
    payload: { invoice, batches },
  });
  db.run(`DELETE FROM NAKLADNIE_PRIXODA WHERE ID = ${id}`);
  db.run(`DELETE FROM PARTII_NOW WHERE ID_NAKLADNOJ = ${id}`);
  saveDatabaseToDisk();
}

export function deductStockFIFO(
  requirements: Array<{ productId: number; productName: string; totalGrams: number }>,
  operationDate: string = new Date().toISOString().slice(0, 10),
): { success: boolean; deductedCount: number; warnings: string[] } {
  if (!db) return { success: false, deductedCount: 0, warnings: ['БД не підключено'] };
  requirePermission('stock.write');
  assertDateOpen(operationDate);

  const warnings: string[] = [];
  let deductedCount = 0;
  const auditDeductions: Array<{
    productId: number;
    productName: string;
    batchId: number;
    takeKg: number;
    remainingKg: number;
  }> = [];

  db.run('BEGIN');
  try {
    requirements.forEach(req => {
      const neededKg = req.totalGrams / 1000;
      if (neededKg <= 0) return;

      // Fetch active batches for this product ordered by ID ASC (oldest first - FIFO)
      const batches = queryAll<StockBatch>(
        `SELECT * FROM PARTII_NOW WHERE ID_PRODUKTA = ${req.productId} AND OST_KG > 0 ORDER BY ID ASC`
      );

      const plan = planFifoDeductions(
        batches.map(batch => ({ id: batch.ID, availableKg: batch.OST_KG })),
        neededKg,
      );

      for (const deduction of plan.deductions) {
        const batch = batches.find(item => item.ID === deduction.batchId)!;
        const newSum = deduction.remainingKg * batch.CENA;
        db.run(`UPDATE PARTII_NOW SET OST_KG = ${deduction.remainingKg}, SUMMA = ${newSum} WHERE ID = ${batch.ID}`);
        deductedCount++;
        auditDeductions.push({
          productId: req.productId,
          productName: req.productName,
          batchId: batch.ID,
          takeKg: deduction.takeKg,
          remainingKg: deduction.remainingKg,
        });
      }

      if (plan.shortageKg > 0.001) {
        warnings.push(`«${req.productName}»: нестача ${plan.shortageKg.toFixed(3)} кг/л`);
      }
    });
    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }

  recordAudit({
    action: 'update',
    entityType: 'stock_fifo',
    entityId: operationDate,
    summary: `Проведено FIFO-списание за ${operationDate}: ${deductedCount} партий`,
    before: requirements,
    after: { deductions: auditDeductions, warnings },
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
  requirePermission('property.write');
  const current = getPropertyItems();
  const before = item.ID ? current.find(existing => existing.ID === item.ID) : undefined;
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
  const saved = item.ID
    ? updated.find(existing => existing.ID === item.ID)
    : updated[0];
  recordAudit({
    action: item.ID ? 'update' : 'create',
    entityType: 'property_item',
    entityId: String(saved?.ID || ''),
    summary: `${item.ID ? 'Изменено' : 'Создано'} имущество «${item.NAME}»`,
    before,
    after: saved,
  });
  return updated;
}

export function deletePropertyItem(id: number): PropertyItem[] {
  requirePermission('property.write');
  const current = getPropertyItems();
  const before = current.find(item => item.ID === id);
  if (!before) return current;
  archiveRecord({
    entityType: 'property_item',
    entityId: String(id),
    label: before.NAME,
    payload: before,
  });
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
  requirePermission('property.write');
  assertDateOpen(data.DATE);
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
      return applyPropertyWriteOff(item, data.LOCATION_NAME, data.QUANTITY);
    }
    return item;
  });

  localStorage.setItem('sadok_property_items', JSON.stringify(updatedItems));
  recordAudit({
    action: 'create',
    entityType: 'property_writeoff',
    entityId: String(newId),
    summary: `Оформлено списание «${data.PROPERTY_NAME}», количество: ${data.QUANTITY}`,
    before: currentItems.find(item => item.ID === data.PROPERTY_ID),
    after: newRecord,
  });
  return { items: updatedItems, writeOffs: updatedWriteOffs };
}

export function deletePropertyWriteOff(id: number): { items: PropertyItem[]; writeOffs: PropertyWriteOffRecord[] } {
  requirePermission('property.write');
  const currentWriteOffs = getPropertyWriteOffs();
  const target = currentWriteOffs.find(w => w.ID === id);
  if (!target) return { items: getPropertyItems(), writeOffs: currentWriteOffs };
  assertDateOpen(target.DATE);
  archiveRecord({
    entityType: 'property_writeoff',
    entityId: String(id),
    label: target.ACT_NUMBER,
    payload: target,
  });

  const updatedWriteOffs = currentWriteOffs.filter(w => w.ID !== id);
  localStorage.setItem('sadok_property_writeoffs', JSON.stringify(updatedWriteOffs));

  // Restore quantity to PropertyItem location
  const currentItems = getPropertyItems();
  const updatedItems = currentItems.map(item => {
    if (item.ID === target.PROPERTY_ID) {
      return restorePropertyWriteOff(
        item,
        target.LOCATION_NAME,
        target.RESPONSIBLE_PERSON,
        target.QUANTITY,
        Date.now().toString(),
      );
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
  requirePermission('registry.write');
  const current = getGroups();
  const before = group.ID ? current.find(item => item.ID === group.ID) : undefined;
  let updated: SadokGroup[];
  if (group.ID) {
    updated = current.map(g => g.ID === group.ID ? { ...g, ...group } as SadokGroup : g);
  } else {
    const newId = current.length > 0 ? Math.max(...current.map(g => g.ID)) + 1 : 1;
    updated = [{ ID: newId, NAME: group.NAME, AGE_CATEGORY: group.AGE_CATEGORY || 'Молодша', ROOM_NUMBER: group.ROOM_NUMBER || '', TEACHER_NAME: group.TEACHER_NAME || '', CHILDREN_COUNT: group.CHILDREN_COUNT || 0 }, ...current];
  }
  localStorage.setItem('sadok_groups', JSON.stringify(updated));
  const saved = group.ID ? updated.find(item => item.ID === group.ID) : updated[0];
  recordAudit({
    action: group.ID ? 'update' : 'create',
    entityType: 'group',
    entityId: String(saved?.ID || ''),
    summary: `${group.ID ? 'Изменена' : 'Создана'} группа «${group.NAME}»`,
    before,
    after: saved,
  });
  return updated;
}

export function deleteGroup(id: number): SadokGroup[] {
  requirePermission('registry.write');
  const current = getGroups();
  const before = current.find(item => item.ID === id);
  if (!before) return current;
  archiveRecord({
    entityType: 'group',
    entityId: String(id),
    label: before.NAME,
    payload: before,
  });
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
  requirePermission('registry.write');
  const current = getEmployees();
  const before = emp.ID ? current.find(item => item.ID === emp.ID) : undefined;
  let updated: SadokEmployee[];
  if (emp.ID) {
    updated = current.map(e => e.ID === emp.ID ? { ...e, ...emp } as SadokEmployee : e);
  } else {
    const newId = current.length > 0 ? Math.max(...current.map(e => e.ID)) + 1 : 1;
    updated = [{ ID: newId, FULL_NAME: emp.FULL_NAME, POSITION: emp.POSITION || 'Вихователь', PHONE: emp.PHONE || '', IS_MVO: Boolean(emp.IS_MVO), GROUP_NAME: emp.GROUP_NAME || '', NOTES: emp.NOTES || '' }, ...current];
  }
  localStorage.setItem('sadok_employees', JSON.stringify(updated));
  const saved = emp.ID ? updated.find(item => item.ID === emp.ID) : updated[0];
  recordAudit({
    action: emp.ID ? 'update' : 'create',
    entityType: 'employee',
    entityId: String(saved?.ID || ''),
    summary: `${emp.ID ? 'Изменён' : 'Создан'} сотрудник «${emp.FULL_NAME}»`,
    before,
    after: saved,
  });
  return updated;
}

export function deleteEmployee(id: number): SadokEmployee[] {
  requirePermission('registry.write');
  const current = getEmployees();
  const before = current.find(item => item.ID === id);
  if (!before) return current;
  archiveRecord({
    entityType: 'employee',
    entityId: String(id),
    label: before.FULL_NAME,
    payload: before,
  });
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
  requirePermission('registry.write');
  const current = getChildren();
  const before = child.ID ? current.find(item => item.ID === child.ID) : undefined;
  let updated: SadokChild[];
  if (child.ID) {
    updated = current.map(c => c.ID === child.ID ? { ...c, ...child } as SadokChild : c);
  } else {
    const newId = current.length > 0 ? Math.max(...current.map(c => c.ID)) + 1 : 1;
    updated = [{ ID: newId, FULL_NAME: child.FULL_NAME, BIRTH_DATE: child.BIRTH_DATE || '2022-01-01', GROUP_NAME: child.GROUP_NAME || 'Група «Сонечко»', PARENT_NAME: child.PARENT_NAME || '', PARENT_PHONE: child.PARENT_PHONE || '', STATUS: child.STATUS || 'Навчається', HEALTH_NOTES: child.HEALTH_NOTES || '', PSYCHOLOGY_NOTES: child.PSYCHOLOGY_NOTES || '' }, ...current];
  }
  localStorage.setItem('sadok_children', JSON.stringify(updated));
  const saved = child.ID ? updated.find(item => item.ID === child.ID) : updated[0];
  recordAudit({
    action: child.ID ? 'update' : 'create',
    entityType: 'child',
    entityId: String(saved?.ID || ''),
    summary: `${child.ID ? 'Изменена' : 'Создана'} карточка ребёнка «${child.FULL_NAME}»`,
    before,
    after: saved,
  });
  return updated;
}

export function deleteChild(id: number): SadokChild[] {
  requirePermission('registry.write');
  const current = getChildren();
  const before = current.find(item => item.ID === id);
  if (!before) return current;
  archiveRecord({
    entityType: 'child',
    entityId: String(id),
    label: before.FULL_NAME,
    payload: before,
  });
  const updated = current.filter(c => c.ID !== id);
  localStorage.setItem('sadok_children', JSON.stringify(updated));
  return updated;
}

function restoreSqlRow(table: string, row: Record<string, unknown>) {
  const schema = db.exec(`PRAGMA table_info(${table})`)[0]?.values || [];
  const allowed = new Set(schema.map((item: any[]) => String(item[1])));
  const columns = Object.keys(row).filter(column => allowed.has(column));
  const values = columns.map(column => row[column]);
  db.run(
    `INSERT OR REPLACE INTO ${table} (${columns.join(', ')})
     VALUES (${columns.map(() => '?').join(', ')})`,
    values,
  );
}

function restoreLocalRecord<T extends { ID: number }>(key: string, record: T) {
  const records = JSON.parse(localStorage.getItem(key) || '[]') as T[];
  const next = records.some(item => item.ID === record.ID)
    ? records.map(item => item.ID === record.ID ? record : item)
    : [record, ...records];
  localStorage.setItem(key, JSON.stringify(next));
}

export function restoreArchivedRecord(archiveId: string): void {
  const archive = getArchiveEntry(archiveId);
  if (!archive || archive.restoredAt) return;

  const permissionByEntity: Partial<Record<string, Permission>> = {
    menu: 'menu.write',
    product: 'products.write',
    dish: 'recipes.write',
    recipe_component: 'recipes.write',
    institution: 'settings.write',
    supplier: 'stock.write',
    stock_batch: 'stock.write',
    invoice: 'stock.write',
    property_item: 'property.write',
    property_writeoff: 'property.write',
    group: 'registry.write',
    employee: 'registry.write',
    child: 'registry.write',
  };
  const permission = permissionByEntity[archive.entityType];
  if (permission) requirePermission(permission);

  const payload = archive.payload as any;
  switch (archive.entityType) {
    case 'menu':
      assertDateOpen(payload.DATA);
      restoreSqlRow('MENU', payload);
      break;
    case 'product':
      restoreSqlRow('PRODUKTS', payload);
      break;
    case 'dish':
      restoreSqlRow('KARTOTEKA_BLUD', payload.dish);
      (payload.components || []).forEach((row: Record<string, unknown>) =>
        restoreSqlRow('KOMPONENTI_KARTOTEKI', row)
      );
      break;
    case 'recipe_component':
      restoreSqlRow('KOMPONENTI_KARTOTEKI', payload);
      break;
    case 'institution':
      restoreSqlRow('SADIKI', payload.institution);
      break;
    case 'supplier':
      restoreSqlRow('FIRMI', { ...payload, DEL: 0 });
      break;
    case 'stock_batch':
      restoreSqlRow('PARTII_NOW', payload);
      break;
    case 'invoice':
      assertDateOpen(payload.invoice.DATA);
      restoreSqlRow('NAKLADNIE_PRIXODA', payload.invoice);
      (payload.batches || []).forEach((row: Record<string, unknown>) =>
        restoreSqlRow('PARTII_NOW', row)
      );
      break;
    case 'property_item':
      restoreLocalRecord('sadok_property_items', payload as PropertyItem);
      break;
    case 'property_writeoff': {
      const writeOff = payload as PropertyWriteOffRecord;
      assertDateOpen(writeOff.DATE);
      restoreLocalRecord('sadok_property_writeoffs', writeOff);
      const items = getPropertyItems().map(item =>
        item.ID === writeOff.PROPERTY_ID
          ? applyPropertyWriteOff(item, writeOff.LOCATION_NAME, writeOff.QUANTITY)
          : item
      );
      localStorage.setItem('sadok_property_items', JSON.stringify(items));
      break;
    }
    case 'group':
      restoreLocalRecord('sadok_groups', payload as SadokGroup);
      break;
    case 'employee':
      restoreLocalRecord('sadok_employees', payload as SadokEmployee);
      break;
    case 'child':
      restoreLocalRecord('sadok_children', payload as SadokChild);
      break;
    default:
      throw new Error(`Восстановление типа «${archive.entityType}» пока не поддерживается`);
  }

  markArchiveRestored(archiveId);
  saveDatabaseToDisk();
}
