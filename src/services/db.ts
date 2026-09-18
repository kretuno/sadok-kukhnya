import { getEmbeddedDbBytes } from './db_data';
import { IMPORTED_TECH_CARDS, TECH_CARD_DATASET_VERSION } from '../data/importedTechCards';
import {
  Product, ProductCategory, Dish, DishCategory,
  RecipeComponent, RecipeNutritionProfile, EaterCategory, MenuHeader,
  InvoiceHeader, StockBatch, Institution, SupplierFirm,
  ProductHistoryData, ProductHistoryBatch, ProductHistoryUsage, PropertyItem, PropertyWriteOffRecord,
  SadokGroup, SadokEmployee, SadokChild, DishCostProfile, DishCostHistoryEntry,
  MenuApproval, DocumentRegistryEntry, PsychologyAdaptationRecord, SchoolReadinessAssessment, PsychologyConsultation,
  PsychologyReportRow, PsychologySummaryReport,
  PsychologyDailyLogEntry, PsychologyDailyActivityType, PsychologyDailyCategory,
  PsychologySpecialSupportEntry, PsychologySpecialCategory, PsychologyDynamicStatus, PsychologyMemo,
  SadokMedicalCard, SadokVaccination, SadokAnthropometry,
  DailyAttendanceRecord, BrackerageReadyEntry, BrackerageRawEntry,
  SpeechCard, SpeechDailyLogEntry, ArticulationExercise,
  SpeechDiagnosisType, SpeechDailyActivityType
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
import { scheduleDurableLocalState } from './durableStorage';
import {
  queueEntityMutation,
  type RemoteEntityDocument,
  type SyncEntityType,
} from './entitySyncQueue';
import { findStaleBootstrapSyncIds } from '../domain/entitySync';
import {
  decodeBackupDeviceKey,
  decryptBackup,
  encodeBackupDeviceKey,
  encryptDeviceBackup,
  encryptPortableBackup,
  generateBackupDeviceKey,
  isEncryptedBackup,
  type EncryptedBackupContainer,
} from './backupEncryption';

// -----------------------------------------------------------------
// Singleton DB instance (sql.js Database object)
// -----------------------------------------------------------------
let db: any = null;
export const CURRENT_DATABASE_SCHEMA_VERSION = 8;
export const DATABASE_SYNC_EVENT = 'sadok-database-sync-change';
const BROWSER_DATABASE_NAME = 'sadok_persistent_storage';
const BROWSER_DATABASE_STORE = 'state';

function openBrowserDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BROWSER_DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(BROWSER_DATABASE_STORE)) {
        database.createObjectStore(BROWSER_DATABASE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readBrowserState<T>(key: string): Promise<T | null> {
  const database = await openBrowserDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(BROWSER_DATABASE_STORE, 'readonly');
    const request = transaction.objectStore(BROWSER_DATABASE_STORE).get(key);
    request.onsuccess = () => resolve((request.result as T) ?? null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

async function writeBrowserState(key: string, value: unknown): Promise<void> {
  const database = await openBrowserDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(BROWSER_DATABASE_STORE, 'readwrite');
    transaction.objectStore(BROWSER_DATABASE_STORE).put(value, key);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export interface SadokBackupEnvelope {
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

export interface SystemBackupInfo {
  id: string;
  createdAt: string;
  size: number;
  trigger: string;
  verified: boolean;
  encrypted: boolean;
  restorable: boolean;
}

const ENCRYPTED_BACKUPS_KEY = 'encrypted-backups-v1';
const BACKUP_DEVICE_KEY = 'backup-device-key-v1';
const BACKUP_RETENTION = 7;

// Load the bundled sql.js runtime. No network fallback is allowed: the application
// must remain bootable during prolonged internet outages.
async function loadSqlJs(): Promise<any> {
  // If already loaded by a previous call
  if ((window as any).initSqlJs) return (window as any).initSqlJs;

  return new Promise((resolve, reject) => {
    // Support both relative PWA scope and root hosting paths.
    const sources = [
      './sql-wasm.js',
      '/sql-wasm.js',
    ];

    let tried = 0;
    function tryNext() {
      if (tried >= sources.length) {
        reject(new Error('Не вдалося завантажити локальний модуль SQLite. Перевстановіть офлайн-пакет SADOK.'));
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

  // 2. Browser IndexedDB cache (supports the full regulatory catalogue)
  try {
    const indexedBytes = await readBrowserState<ArrayBuffer | Uint8Array>('sqlite');
    if (indexedBytes) {
      const bytes = indexedBytes instanceof Uint8Array
        ? indexedBytes
        : new Uint8Array(indexedBytes);
      if (bytes.byteLength > 0) {
        db = new SQL.Database(bytes);
        console.log('[DB] Loaded saved state from IndexedDB');
        await prepareDatabase();
        return db;
      }
    }
  } catch (err) {
    console.warn('[DB] IndexedDB load failed:', err);
  }

  // 3. Legacy LocalStorage cache; it is migrated to IndexedDB on save
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

  // 4. Embedded bytes fallback (bundled at build time)
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
  ensureImportedTechCards();
  ensureInitialDishCostHistory();
  saveDatabaseToDisk();
  await ensureAutomaticBackup();
}

function normalizeImportedName(value: string): string {
  return (value || '')
    .normalize('NFC')
    .toLocaleLowerCase('uk-UA')
    .replace(/^~\$/, '')
    .replace(/\.(docx|doc|xlsx|pdf)$/i, '')
    .replace(/^\s*(тк|ттк)\s*/i, '')
    .replace(/\b(технологічна|технологическая)\s+(карта|картка)\b/gi, ' ')
    .replace(/\s*\(\d+\)\s*$/, '')
    .replace(/[_‐‑‒–—―-]+/g, ' ')
    .replace(/[«»"'`’‘ʼ.,:;№]+/g, ' ')
    .replace(/\s+/g, '');
}

function ensureTechCardColumns() {
  const addMissingColumns = (table: string, columns: Record<string, string>) => {
    const existing = new Set<string>(
      (db.exec(`PRAGMA table_info(${table})`)[0]?.values || []).map((row: any[]) => String(row[1]))
    );
    Object.entries(columns).forEach(([name, declaration]) => {
      if (!existing.has(name)) db.run(`ALTER TABLE ${table} ADD COLUMN ${name} ${declaration}`);
    });
  };
  addMissingColumns('KARTOTEKA_BLUD', {
    SOURCE_FILE: "TEXT DEFAULT ''",
    SOURCE_FORMAT: "TEXT DEFAULT ''",
    SOURCE_REF: "TEXT DEFAULT ''",
    ALLERGENS: "TEXT DEFAULT ''",
    QUALITY_REQUIREMENTS: "TEXT DEFAULT ''",
    STORAGE_CONDITIONS: "TEXT DEFAULT ''",
    SERVING_METHOD: "TEXT DEFAULT ''",
    DISH_CHARACTERISTICS: "TEXT DEFAULT ''",
    IMPORT_KEY: "TEXT DEFAULT ''",
  });
  addMissingColumns('KOMPONENTI_KARTOTEKI', {
    SOURCE_NAME: "TEXT DEFAULT ''",
    ALLERGENS: "TEXT DEFAULT ''",
    QUALITY_REQUIREMENTS: "TEXT DEFAULT ''",
    IS_ALTERNATIVE: 'INTEGER DEFAULT 0',
  });
}

function ensureImportedTechCards() {
  if (!db) return;
  ensureTechCardColumns();
  const imported = db.exec(
    `SELECT 1 FROM SADOK_TECH_CARD_IMPORTS WHERE DATASET_VERSION = '${TECH_CARD_DATASET_VERSION}'`
  )[0]?.values?.length;
  if (imported) return;

  const menuRows = queryAll<{ ID: number; NAME_BLUDA: string }>('SELECT ID, NAME_BLUDA FROM MENU');
  const products = queryAll<Product>('SELECT * FROM PRODUKTS');
  const productIds = new Map(products.map(product => [normalizeImportedName(product.NAME), product.ID]));
  const dishIds = new Map<string, number>();
  let nextProductOrder = products.length + 1;

  db.run('BEGIN');
  try {
    db.run('DELETE FROM TECH_CARD_NUTRITION');
    db.run('DELETE FROM KOMPONENTI_KARTOTEKI');
    db.run('DELETE FROM KARTOTEKA_BLUD');
    db.run("DELETE FROM sqlite_sequence WHERE name IN ('KARTOTEKA_BLUD','KOMPONENTI_KARTOTEKI','TECH_CARD_NUTRITION')");

    IMPORTED_TECH_CARDS.forEach((card, order) => {
      const nutrition = card.defaultNutrition || {};
      const quality = Array.from(new Set(
        card.ingredients.map((ingredient: any) => ingredient.quality).filter(Boolean)
      )).join('\n');
      db.run(
        `INSERT INTO KARTOTEKA_BLUD
          (NAME, NOTES, ID_GRUPPI_BLUD, VYXOD, BELKI, ZIRI, UGLEVODI, KALORII,
           PORRDOK_SLEDOVANIR_BLUD, SOURCE_FILE, SOURCE_FORMAT, SOURCE_REF,
           ALLERGENS, QUALITY_REQUIREMENTS, STORAGE_CONDITIONS, SERVING_METHOD,
           DISH_CHARACTERISTICS, IMPORT_KEY)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          card.title, card.technology || '', card.categoryId || 1,
          nutrition.yieldGr || 0, nutrition.protein || 0, nutrition.fat || 0,
          nutrition.carbs || 0, nutrition.calories || 0, order + 1,
          card.sourceFile || '', card.sourceFormat || '', card.sourceRef || '',
          card.allergens || '', quality, card.storage || '', card.serving || '',
          card.characteristics || '', normalizeImportedName(card.title),
        ]
      );
      const dishId = Number(db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] || 0);
      dishIds.set(normalizeImportedName(card.title), dishId);
      card.nutrition.forEach((profile: any) => {
        db.run(
          `INSERT OR REPLACE INTO TECH_CARD_NUTRITION
            (ID_BLUDA, ID_KATEGORII_DETEJ, VYXOD_GR, BELKI, ZIRI, UGLEVODI, KALORII)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            dishId, profile.categoryId, profile.yieldGr || 0, profile.protein || 0,
            profile.fat || 0, profile.carbs || 0, profile.calories || 0,
          ]
        );
      });
      card.ingredients.forEach((ingredient: any, line: number) => {
        const productKey = normalizeImportedName(ingredient.name);
        let productId = productIds.get(productKey);
        if (!productId) {
          db.run(
            `INSERT INTO PRODUKTS
              (NAME, ID_GRUPPI_PRODUKTOV, EDINICA_IZMERENIA, NOMER_PP)
             VALUES (?, 12, 'кг', ?)`,
            [ingredient.name, nextProductOrder++]
          );
          productId = Number(db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] || 0);
          productIds.set(productKey, productId);
        }
        [1, 2, 3, 4].forEach((categoryId, categoryIndex) => {
          db.run(
            `INSERT INTO KOMPONENTI_KARTOTEKI
              (ID_BLUDA, ID_PRODUKTA, ID_KATEGORII_DETEJ, GROSSO_GR, NETTO_GR,
               NOMER_ID_LINII_V_TABLICE, SOURCE_NAME, ALLERGENS,
               QUALITY_REQUIREMENTS, IS_ALTERNATIVE)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              dishId, productId, categoryId,
              ingredient.gross[categoryIndex] || 0, ingredient.net[categoryIndex] || 0,
              line + 1, ingredient.name, ingredient.allergen || '',
              ingredient.quality || '', ingredient.isAlternative ? 1 : 0,
            ]
          );
        });
      });
    });

    menuRows.forEach(menu => {
      const dishId = dishIds.get(normalizeImportedName(menu.NAME_BLUDA || ''));
      if (dishId) db.run('UPDATE MENU SET ID_BLUDA = ? WHERE ID = ?', [dishId, menu.ID]);
    });
    db.run('DELETE FROM SADOK_TECH_CARD_IMPORTS');
    db.run(
      `INSERT INTO SADOK_TECH_CARD_IMPORTS
        (DATASET_VERSION, IMPORTED_AT, CARD_COUNT, SOURCE_COUNT)
       VALUES (?, ?, ?, ?)`,
      [
        TECH_CARD_DATASET_VERSION,
        new Date().toISOString(),
        IMPORTED_TECH_CARDS.length,
        IMPORTED_TECH_CARDS.reduce((sum, card) => sum + card.sourceFiles.length, 0),
      ]
    );
    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw new Error(`Помилка імпорту технологічних карт: ${String(error)}`);
  }
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
    {
      version: 5,
      name: 'Full technological card catalogue',
      sql: [
        `CREATE TABLE IF NOT EXISTS TECH_CARD_NUTRITION (
          ID INTEGER PRIMARY KEY AUTOINCREMENT,
          ID_BLUDA INTEGER NOT NULL,
          ID_KATEGORII_DETEJ INTEGER NOT NULL,
          VYXOD_GR REAL DEFAULT 0,
          BELKI REAL DEFAULT 0,
          ZIRI REAL DEFAULT 0,
          UGLEVODI REAL DEFAULT 0,
          KALORII REAL DEFAULT 0,
          UNIQUE(ID_BLUDA, ID_KATEGORII_DETEJ)
        )`,
        `CREATE TABLE IF NOT EXISTS SADOK_TECH_CARD_IMPORTS (
          DATASET_VERSION TEXT PRIMARY KEY,
          IMPORTED_AT TEXT NOT NULL,
          CARD_COUNT INTEGER NOT NULL,
          SOURCE_COUNT INTEGER NOT NULL
        )`,
        'CREATE INDEX IF NOT EXISTS IDX_TECH_CARD_NUTRITION_DISH ON TECH_CARD_NUTRITION(ID_BLUDA, ID_KATEGORII_DETEJ)',
      ],
    },
    {
      version: 6,
      name: 'Menu approvals, dish cost history and document registry',
      sql: [
        `CREATE TABLE IF NOT EXISTS MENU_APPROVALS (
          ID INTEGER PRIMARY KEY AUTOINCREMENT,
          MENU_DATE TEXT NOT NULL,
          INSTITUTION_ID INTEGER NOT NULL DEFAULT 1,
          STATUS TEXT NOT NULL DEFAULT 'approved',
          APPROVED_AT TEXT NOT NULL,
          APPROVED_BY TEXT NOT NULL,
          CHECKS_JSON TEXT NOT NULL DEFAULT '{}',
          UNIQUE(MENU_DATE, INSTITUTION_ID)
        )`,
        `CREATE TABLE IF NOT EXISTS DISH_COST_HISTORY (
          ID INTEGER PRIMARY KEY AUTOINCREMENT,
          ID_BLUDA INTEGER NOT NULL,
          ID_KATEGORII_DETEJ INTEGER NOT NULL,
          COST_PER_PORTION REAL NOT NULL DEFAULT 0,
          CALCULATED_AT TEXT NOT NULL,
          REASON TEXT NOT NULL,
          SOURCE_REF TEXT NOT NULL DEFAULT ''
        )`,
        `CREATE TABLE IF NOT EXISTS DOCUMENT_REGISTRY (
          ID INTEGER PRIMARY KEY AUTOINCREMENT,
          DOCUMENT_TYPE TEXT NOT NULL,
          DOCUMENT_NUMBER TEXT NOT NULL,
          PERIOD_FROM TEXT NOT NULL,
          PERIOD_TO TEXT NOT NULL,
          CREATED_AT TEXT NOT NULL,
          CREATED_BY TEXT NOT NULL,
          UNIQUE(DOCUMENT_TYPE, DOCUMENT_NUMBER)
        )`,
        'CREATE INDEX IF NOT EXISTS IDX_MENU_APPROVAL_DATE ON MENU_APPROVALS(MENU_DATE, INSTITUTION_ID)',
        'CREATE INDEX IF NOT EXISTS IDX_DISH_COST_HISTORY_DISH ON DISH_COST_HISTORY(ID_BLUDA, ID_KATEGORII_DETEJ, CALCULATED_AT)',
        'CREATE INDEX IF NOT EXISTS IDX_DOCUMENT_REGISTRY_TYPE ON DOCUMENT_REGISTRY(DOCUMENT_TYPE, CREATED_AT)',
      ],
    },
    {
      version: 7,
      name: 'Stable entity identities for multi-device synchronization',
      sql: [
        `CREATE TABLE IF NOT EXISTS SADOK_ENTITY_SYNC_META (
          ENTITY_TYPE TEXT NOT NULL,
          LOCAL_ID TEXT NOT NULL,
          SYNC_ID TEXT NOT NULL UNIQUE,
          REMOTE_REVISION INTEGER NOT NULL DEFAULT 0,
          UPDATED_AT TEXT NOT NULL,
          DEVICE_ID TEXT NOT NULL DEFAULT '',
          DELETED INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (ENTITY_TYPE, LOCAL_ID)
        )`,
        `INSERT OR IGNORE INTO SADOK_ENTITY_SYNC_META
          (ENTITY_TYPE, LOCAL_ID, SYNC_ID, REMOTE_REVISION, UPDATED_AT, DEVICE_ID, DELETED)
          SELECT 'product', CAST(ID AS TEXT), 'product-legacy-' || ID, 0,
            strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), '', 0 FROM PRODUKTS`,
        `INSERT OR IGNORE INTO SADOK_ENTITY_SYNC_META
          (ENTITY_TYPE, LOCAL_ID, SYNC_ID, REMOTE_REVISION, UPDATED_AT, DEVICE_ID, DELETED)
          SELECT 'dish', CAST(ID AS TEXT), 'dish-legacy-' || ID, 0,
            strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), '', 0 FROM KARTOTEKA_BLUD`,
        `INSERT OR IGNORE INTO SADOK_ENTITY_SYNC_META
          (ENTITY_TYPE, LOCAL_ID, SYNC_ID, REMOTE_REVISION, UPDATED_AT, DEVICE_ID, DELETED)
          SELECT 'recipe_component', CAST(ID AS TEXT), 'component-legacy-' || ID, 0,
            strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), '', 0 FROM KOMPONENTI_KARTOTEKI`,
        `INSERT OR IGNORE INTO SADOK_ENTITY_SYNC_META
          (ENTITY_TYPE, LOCAL_ID, SYNC_ID, REMOTE_REVISION, UPDATED_AT, DEVICE_ID, DELETED)
          SELECT 'dish_nutrition_profile', CAST(ID_BLUDA AS TEXT) || ':' || CAST(ID_KATEGORII_DETEJ AS TEXT),
            'nutrition-legacy-' || ID_BLUDA || '-' || ID_KATEGORII_DETEJ, 0,
            strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), '', 0 FROM TECH_CARD_NUTRITION`,
        'CREATE INDEX IF NOT EXISTS IDX_ENTITY_SYNC_REMOTE ON SADOK_ENTITY_SYNC_META(SYNC_ID, REMOTE_REVISION)',
      ],
    },
    {
      version: 8,
      name: 'Menu and warehouse entity synchronization',
      sql: [
        `INSERT OR IGNORE INTO SADOK_ENTITY_SYNC_META
          (ENTITY_TYPE, LOCAL_ID, SYNC_ID, REMOTE_REVISION, UPDATED_AT, DEVICE_ID, DELETED)
          SELECT 'menu_entry', CAST(ID AS TEXT), 'menu-legacy-' || ID, 0,
            strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), '', 0 FROM MENU`,
        `INSERT OR IGNORE INTO SADOK_ENTITY_SYNC_META
          (ENTITY_TYPE, LOCAL_ID, SYNC_ID, REMOTE_REVISION, UPDATED_AT, DEVICE_ID, DELETED)
          SELECT 'menu_approval', CAST(ID AS TEXT), 'menu-approval-legacy-' || ID, 0,
            strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), '', 0 FROM MENU_APPROVALS`,
        `INSERT OR IGNORE INTO SADOK_ENTITY_SYNC_META
          (ENTITY_TYPE, LOCAL_ID, SYNC_ID, REMOTE_REVISION, UPDATED_AT, DEVICE_ID, DELETED)
          SELECT 'supplier', CAST(ID AS TEXT), 'supplier-legacy-' || ID, 0,
            strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), '', 0 FROM FIRMI`,
        `INSERT OR IGNORE INTO SADOK_ENTITY_SYNC_META
          (ENTITY_TYPE, LOCAL_ID, SYNC_ID, REMOTE_REVISION, UPDATED_AT, DEVICE_ID, DELETED)
          SELECT 'invoice', CAST(ID AS TEXT), 'invoice-legacy-' || ID, 0,
            strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), '', 0 FROM NAKLADNIE_PRIXODA`,
        `INSERT OR IGNORE INTO SADOK_ENTITY_SYNC_META
          (ENTITY_TYPE, LOCAL_ID, SYNC_ID, REMOTE_REVISION, UPDATED_AT, DEVICE_ID, DELETED)
          SELECT 'stock_batch', CAST(ID AS TEXT), 'stock-batch-legacy-' || ID, 0,
            strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), '', 0 FROM PARTII_NOW`,
      ],
    },
    {
      version: 9,
      name: 'Attendance registry and HACCP brackerage journals',
      sql: [
        `CREATE TABLE IF NOT EXISTS SADOK_ATTENDANCE (
          ID INTEGER PRIMARY KEY AUTOINCREMENT,
          DATE TEXT NOT NULL,
          GROUP_ID INTEGER NOT NULL,
          GROUP_NAME TEXT NOT NULL,
          CATEGORY_ID INTEGER NOT NULL DEFAULT 2,
          PRESENT_COUNT INTEGER NOT NULL DEFAULT 0,
          DIET_COUNT INTEGER NOT NULL DEFAULT 0,
          NOTES TEXT NOT NULL DEFAULT '',
          UPDATED_AT TEXT NOT NULL,
          UNIQUE(DATE, GROUP_ID)
        )`,
        `CREATE TABLE IF NOT EXISTS SADOK_BRACKERAGE_READY (
          ID INTEGER PRIMARY KEY AUTOINCREMENT,
          DATE TEXT NOT NULL,
          TIME TEXT NOT NULL,
          MEAL_TYPE TEXT NOT NULL,
          DISH_NAME TEXT NOT NULL,
          SAMPLE_TAKEN_TIME TEXT NOT NULL DEFAULT '',
          WEIGHT_PORTION_CHECK TEXT NOT NULL DEFAULT '',
          TEMPERATURE_C REAL NOT NULL DEFAULT 75.0,
          ORGANOLEPTIC_RATING TEXT NOT NULL DEFAULT 'Відмінно',
          PERMISSION_TO_SERVE TEXT NOT NULL DEFAULT 'Видача дозволена',
          COMMISSION_MEMBERS TEXT NOT NULL,
          NOTES TEXT NOT NULL DEFAULT '',
          CREATED_AT TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS SADOK_BRACKERAGE_RAW (
          ID INTEGER PRIMARY KEY AUTOINCREMENT,
          DATE TEXT NOT NULL,
          PRODUCT_NAME TEXT NOT NULL,
          SUPPLIER_NAME TEXT NOT NULL,
          INVOICE_NUMBER TEXT NOT NULL DEFAULT '',
          PACKAGE_INTEGRITY TEXT NOT NULL DEFAULT 'Цілісна',
          EXPIRY_DATE TEXT NOT NULL,
          DOCUMENTATION_STATUS TEXT NOT NULL DEFAULT 'В наявності',
          ACCEPTANCE_DECISION TEXT NOT NULL DEFAULT 'Прийнято',
          RESPONSIBLE_PERSON TEXT NOT NULL,
          NOTES TEXT NOT NULL DEFAULT '',
          CREATED_AT TEXT NOT NULL
        )`,
        'CREATE INDEX IF NOT EXISTS IDX_SADOK_ATTENDANCE_DATE ON SADOK_ATTENDANCE(DATE)',
        'CREATE INDEX IF NOT EXISTS IDX_SADOK_BRACKERAGE_READY_DATE ON SADOK_BRACKERAGE_READY(DATE, MEAL_TYPE)',
        'CREATE INDEX IF NOT EXISTS IDX_SADOK_BRACKERAGE_RAW_DATE ON SADOK_BRACKERAGE_RAW(DATE)',
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
      throw new Error(`Помилка міграції БД v${migration.version}: ${String(error)}`);
    }
  }

  return getDatabaseSchemaVersion();
}

// -----------------------------------------------------------------
// Persistence (Electron IPC + Browser IndexedDB)
// -----------------------------------------------------------------
export function saveDatabaseToDisk() {
  if (!db) return;

  const exportedBytes: Uint8Array = db.export();

  // 1. Electron IPC save to disk
  if ((window as any).electronAPI) {
    try { (window as any).electronAPI.saveDbFile(exportedBytes); } catch (_) {}
  }

  // 2. Browser IndexedDB save. Copy the buffer because sql.js may reuse it.
  const persistedBytes = new Uint8Array(exportedBytes);
  void writeBrowserState('sqlite', persistedBytes).then(() => {
    localStorage.removeItem('sadok_sqlite_db_b64');
    scheduleDurableLocalState();
  }).catch(err => {
    console.warn('[DB] IndexedDB save failed:', err);
  });
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
  if (!db) throw new Error('Базу даних не ініціалізовано');
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

async function getOrCreateBackupDeviceKey(): Promise<Uint8Array> {
  const saved = await readBrowserState<string>(BACKUP_DEVICE_KEY);
  if (saved) return decodeBackupDeviceKey(saved);
  const key = generateBackupDeviceKey();
  await writeBrowserState(BACKUP_DEVICE_KEY, encodeBackupDeviceKey(key));
  return key;
}

function backupMetadata(envelope: SadokBackupEnvelope) {
  return {
    createdAt: envelope.createdAt,
    schemaVersion: envelope.schemaVersion,
    trigger: envelope.trigger,
    createdBy: envelope.createdBy,
    checksum: envelope.checksum,
  };
}

function parseLegacyBackup(raw: string): SadokBackupEnvelope {
  const envelope = JSON.parse(raw) as SadokBackupEnvelope;
  if (envelope.format !== 'sadok-backup' || envelope.formatVersion !== 1) {
    throw new Error('Файл не є резервною копією SADOK');
  }
  return envelope;
}

export async function createSystemBackup(
  trigger: 'automatic' | 'manual' = 'manual'
): Promise<{ envelope: SadokBackupEnvelope; storage: 'electron' | 'browser' }> {
  if (trigger === 'manual') requirePermission('backup.manage');
  if (!db) throw new Error('Базу даних не ініціалізовано');

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
  const encrypted = await encryptDeviceBackup(
    json,
    await getOrCreateBackupDeviceKey(),
    backupMetadata(envelope),
  );
  let storage: 'electron' | 'browser' = 'browser';

  if (window.electronAPI?.createBackup) {
    const result = await window.electronAPI.createBackup(
      new TextEncoder().encode(JSON.stringify(encrypted)),
      trigger,
    );
    if (!result.success) throw new Error(result.error || 'Не вдалося зберегти резервну копію');
    storage = 'electron';
  } else {
    const backups = await readBrowserState<EncryptedBackupContainer[]>(ENCRYPTED_BACKUPS_KEY) || [];
    await writeBrowserState(ENCRYPTED_BACKUPS_KEY, [encrypted, ...backups].slice(0, BACKUP_RETENTION));
    localStorage.removeItem('sadok_browser_backups_v1');
  }

  db.run(
    `INSERT INTO SADOK_BACKUP_CHECKS (CREATED_AT, TRIGGER_TYPE, STATUS, CHECKSUM)
     VALUES (?, ?, 'verified', ?)`,
    [envelope.createdAt, trigger, checksum],
  );
  localStorage.setItem('sadok_last_automatic_backup_date', envelope.createdAt.slice(0, 10));
  localStorage.setItem('sadok_last_verified_backup_at', envelope.createdAt);
  recordAudit({
    action: 'backup',
    entityType: 'database',
    summary: `${trigger === 'automatic' ? 'Автоматичну' : 'Ручну'} резервну копію створено та перевірено`,
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

export async function listSystemBackups(): Promise<SystemBackupInfo[]> {
  if (window.electronAPI?.listBackups) {
    const backups = await window.electronAPI.listBackups();
    return backups.map(backup => ({ ...backup, encrypted: true, restorable: false }));
  }
  const encrypted = await readBrowserState<EncryptedBackupContainer[]>(ENCRYPTED_BACKUPS_KEY) || [];
  const legacy = await readBrowserState<SadokBackupEnvelope[]>('backups') || [];
  return [
    ...encrypted.map(backup => ({
      id: `encrypted:${backup.createdAt}`,
      createdAt: backup.createdAt,
      size: JSON.stringify(backup).length,
      trigger: backup.trigger,
      verified: true,
      encrypted: true,
      restorable: true,
    })),
    ...legacy.map((backup, index) => ({
      id: `legacy:${index}`,
      createdAt: backup.createdAt,
      size: JSON.stringify(backup).length,
      trigger: backup.trigger,
      verified: backup.verification?.sqliteIntegrity === 'ok',
      encrypted: false,
      restorable: true,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function downloadEncryptedBackup(envelope: SadokBackupEnvelope, password: string) {
  const encrypted = await encryptPortableBackup(JSON.stringify(envelope), password, backupMetadata(envelope));
  const blob = new Blob([JSON.stringify(encrypted)], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `sadok_${envelope.createdAt.slice(0, 10)}.sadok-backup`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function inspectBackupFile(raw: string): {
  encrypted: boolean;
  passwordRequired: boolean;
  createdAt: string;
  createdBy: string;
  schemaVersion: number;
} {
  const parsed = JSON.parse(raw) as unknown;
  if (isEncryptedBackup(parsed)) {
    return {
      encrypted: true,
      passwordRequired: parsed.encryption.keySource === 'password',
      createdAt: parsed.createdAt,
      createdBy: parsed.createdBy,
      schemaVersion: parsed.schemaVersion,
    };
  }
  const legacy = parseLegacyBackup(raw);
  return {
    encrypted: false,
    passwordRequired: false,
    createdAt: legacy.createdAt,
    createdBy: legacy.createdBy,
    schemaVersion: legacy.schemaVersion,
  };
}

async function restoreEnvelope(envelope: SadokBackupEnvelope): Promise<void> {
  const expectedChecksum = checksumText(
    envelope.sqliteBase64 + JSON.stringify(envelope.localStorage)
  );
  if (expectedChecksum !== envelope.checksum) {
    throw new Error('Контрольна сума резервної копії не збігається');
  }
  const bytes = base64ToBytes(envelope.sqliteBase64);
  verifySqliteBytes(bytes);

  const DatabaseConstructor = db.constructor;
  const restored = new DatabaseConstructor(bytes);
  db.close();
  db = restored;
  runDatabaseMigrations();
  ensureImportedTechCards();
  Object.entries(envelope.localStorage).forEach(([key, value]) => localStorage.setItem(key, value));
  recordAudit({
    action: 'restore',
    entityType: 'database',
    summary: `Відновлено резервну копію від ${envelope.createdAt}`,
    after: { checksum: envelope.checksum, schemaVersion: envelope.schemaVersion },
  });
  saveDatabaseToDisk();
  window.location.reload();
}

export async function restoreSystemBackup(raw: string, password = ''): Promise<void> {
  requirePermission('backup.manage');
  const parsed = JSON.parse(raw) as unknown;
  const envelope = isEncryptedBackup(parsed)
    ? parseLegacyBackup(await decryptBackup(parsed, password))
    : parseLegacyBackup(raw);
  await restoreEnvelope(envelope);
}

export async function restoreStoredSystemBackup(id: string): Promise<void> {
  requirePermission('backup.manage');
  if (id.startsWith('encrypted:')) {
    const backups = await readBrowserState<EncryptedBackupContainer[]>(ENCRYPTED_BACKUPS_KEY) || [];
    const backup = backups.find(item => `encrypted:${item.createdAt}` === id);
    if (!backup) throw new Error('Локальну резервну копію не знайдено');
    const raw = await decryptBackup(backup, await getOrCreateBackupDeviceKey());
    await restoreEnvelope(parseLegacyBackup(raw));
    return;
  }
  if (id.startsWith('legacy:')) {
    const backups = await readBrowserState<SadokBackupEnvelope[]>('backups') || [];
    const backup = backups[Number(id.slice('legacy:'.length))];
    if (!backup) throw new Error('Локальну резервну копію не знайдено');
    await restoreEnvelope(backup);
    return;
  }
  throw new Error('Цю копію можна відновити лише з файлу');
}

export function resetDatabaseToDefaults() {
  localStorage.clear();
  const request = indexedDB.deleteDatabase(BROWSER_DATABASE_NAME);
  request.onsuccess = () => window.location.reload();
  request.onerror = () => window.location.reload();
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

interface SyncMetadataRow {
  ENTITY_TYPE: SyncEntityType;
  LOCAL_ID: string;
  SYNC_ID: string;
  REMOTE_REVISION: number;
  UPDATED_AT: string;
  DEVICE_ID: string;
  DELETED: number;
}

export interface LocalSyncEntity {
  entityType: SyncEntityType;
  localId: string;
  syncId: string;
  revision: number;
  payload: Record<string, unknown>;
}

const syncSqlEscape = (value: string) => value.replace(/'/g, "''");

function newSyncId(entityType: SyncEntityType): string {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${entityType}-${suffix}`;
}

function legacySyncId(entityType: SyncEntityType, localId: string): string {
  if (entityType === 'recipe_component') return `component-legacy-${localId}`;
  if (entityType === 'dish_nutrition_profile') {
    return `nutrition-legacy-${localId.replace(':', '-')}`;
  }
  if (entityType === 'menu_entry') return `menu-legacy-${localId}`;
  if (entityType === 'menu_approval') return `menu-approval-legacy-${localId}`;
  if (entityType === 'stock_batch') return `stock-batch-legacy-${localId}`;
  return `${entityType}-legacy-${localId}`;
}

function getSyncMetadataByLocalId(
  entityType: SyncEntityType,
  localId: string,
): SyncMetadataRow | undefined {
  return queryAll<SyncMetadataRow>(`
    SELECT * FROM SADOK_ENTITY_SYNC_META
    WHERE ENTITY_TYPE='${syncSqlEscape(entityType)}' AND LOCAL_ID='${syncSqlEscape(localId)}'
  `)[0];
}

function getSyncMetadataBySyncId(syncId: string): SyncMetadataRow | undefined {
  return queryAll<SyncMetadataRow>(`
    SELECT * FROM SADOK_ENTITY_SYNC_META WHERE SYNC_ID='${syncSqlEscape(syncId)}'
  `)[0];
}

function ensureSyncMetadata(
  entityType: SyncEntityType,
  localId: string,
  createdLocally = false,
): SyncMetadataRow {
  const existing = getSyncMetadataByLocalId(entityType, localId);
  if (existing) return existing;
  const now = new Date().toISOString();
  const syncId = createdLocally ? newSyncId(entityType) : legacySyncId(entityType, localId);
  db.run(
    `INSERT INTO SADOK_ENTITY_SYNC_META
      (ENTITY_TYPE, LOCAL_ID, SYNC_ID, REMOTE_REVISION, UPDATED_AT, DEVICE_ID, DELETED)
     VALUES (?, ?, ?, 0, ?, '', 0)`,
    [entityType, localId, syncId, now],
  );
  return getSyncMetadataByLocalId(entityType, localId)!;
}

function getRawSyncRow(entityType: SyncEntityType, localId: string): Record<string, unknown> | undefined {
  if (entityType === 'product') {
    return queryAll<Record<string, unknown>>(`SELECT * FROM PRODUKTS WHERE ID=${Number(localId)}`)[0];
  }
  if (entityType === 'dish') {
    return queryAll<Record<string, unknown>>(`SELECT * FROM KARTOTEKA_BLUD WHERE ID=${Number(localId)}`)[0];
  }
  if (entityType === 'recipe_component') {
    return queryAll<Record<string, unknown>>(`SELECT * FROM KOMPONENTI_KARTOTEKI WHERE ID=${Number(localId)}`)[0];
  }
  if (entityType === 'dish_nutrition_profile') {
    const [dishId, categoryId] = localId.split(':').map(Number);
    return queryAll<Record<string, unknown>>(`
      SELECT * FROM TECH_CARD_NUTRITION
      WHERE ID_BLUDA=${dishId} AND ID_KATEGORII_DETEJ=${categoryId}
    `)[0];
  }
  if (entityType === 'group') {
    return getGroups().find(g => String(g.ID) === localId) as unknown as Record<string, unknown>;
  }
  if (entityType === 'employee') {
    return getEmployees().find(e => String(e.ID) === localId) as unknown as Record<string, unknown>;
  }
  if (entityType === 'child') {
    return getChildren().find(c => String(c.ID) === localId) as unknown as Record<string, unknown>;
  }
  if (entityType === 'property_item') {
    return getPropertyItems().find(p => String(p.ID) === localId || p.INVENTAR_NUMBER === localId) as unknown as Record<string, unknown>;
  }
  if (entityType === 'property_writeoff') {
    return getPropertyWriteOffs().find(w => String(w.ID) === localId) as unknown as Record<string, unknown>;
  }
  if (entityType === 'psychology_adaptation') {
    return getPsychologyAdaptations().find(a => String(a.ID) === localId) as unknown as Record<string, unknown>;
  }
  if (entityType === 'psychology_readiness') {
    return getSchoolReadinessAssessments().find(r => String(r.ID) === localId) as unknown as Record<string, unknown>;
  }
  if (entityType === 'psychology_consultation') {
    return getPsychologyConsultations().find(c => String(c.ID) === localId) as unknown as Record<string, unknown>;
  }
  if (entityType === 'psychology_report') {
    return getPsychologySummaryReports().find(r => String(r.ID) === localId) as unknown as Record<string, unknown>;
  }
  if (entityType === 'psychology_daily_log') {
    return getPsychologyDailyLogEntries().find(d => String(d.ID) === localId) as unknown as Record<string, unknown>;
  }
  if (entityType === 'psychology_special_support') {
    return getPsychologySpecialSupportEntries().find(s => String(s.ID) === localId) as unknown as Record<string, unknown>;
  }
  if (entityType === 'speech_card') {
    return getSpeechCards().find(c => String(c.ID) === localId) as unknown as Record<string, unknown>;
  }
  if (entityType === 'speech_daily_log') {
    return getSpeechDailyLogEntries().find(d => String(d.ID) === localId) as unknown as Record<string, unknown>;
  }
  const tables: Record<string, string> = {
    menu_entry: 'MENU',
    menu_approval: 'MENU_APPROVALS',
    supplier: 'FIRMI',
    invoice: 'NAKLADNIE_PRIXODA',
    stock_batch: 'PARTII_NOW',
  };
  return queryAll<Record<string, unknown>>(
    `SELECT * FROM ${tables[entityType]} WHERE ID=${Number(localId)}`
  )[0];
}

function buildSyncPayload(
  entityType: SyncEntityType,
  localId: string,
): Record<string, unknown> | undefined {
  const row = getRawSyncRow(entityType, localId);
  if (!row) return undefined;
  if (entityType === 'recipe_component') {
    const dishId = String(row.ID_BLUDA);
    const productId = String(row.ID_PRODUKTA);
    return {
      row,
      dishSyncId: ensureSyncMetadata('dish', dishId).SYNC_ID,
      productSyncId: ensureSyncMetadata('product', productId).SYNC_ID,
    };
  }
  if (entityType === 'dish_nutrition_profile') {
    return {
      row,
      dishSyncId: ensureSyncMetadata('dish', String(row.ID_BLUDA)).SYNC_ID,
    };
  }
  if (entityType === 'menu_entry') {
    return {
      row,
      dishSyncId: ensureSyncMetadata('dish', String(row.ID_BLUDA)).SYNC_ID,
    };
  }
  if (entityType === 'invoice') {
    return {
      row,
      supplierSyncId: ensureSyncMetadata('supplier', String(row.ID_FIRMI)).SYNC_ID,
    };
  }
  if (entityType === 'stock_batch') {
    return {
      row,
      invoiceSyncId: ensureSyncMetadata('invoice', String(row.ID_NAKLADNOJ)).SYNC_ID,
      productSyncId: ensureSyncMetadata('product', String(row.ID_PRODUKTA)).SYNC_ID,
    };
  }
  if (entityType === 'medical_card') {
    return { row: getMedicalCards().find(m => String(m.ID) === localId) || null };
  }
  if (entityType === 'medical_vaccination') {
    return { row: getVaccinations().find(v => String(v.ID) === localId) || null };
  }
  if (entityType === 'medical_anthropometry') {
    return { row: getAnthropometries().find(a => String(a.ID) === localId) || null };
  }
  if (entityType === 'speech_card') {
    return { row: getSpeechCards().find(c => String(c.ID) === localId) || null };
  }
  if (entityType === 'speech_daily_log') {
    return { row: getSpeechDailyLogEntries().find(d => String(d.ID) === localId) || null };
  }
  return { row };
}

function queueCurrentSyncEntity(
  entityType: SyncEntityType,
  localId: string,
  operation: 'upsert' | 'delete' = 'upsert',
  createdLocally = false,
  deletedPayload?: Record<string, unknown>,
): void {
  const metadata = ensureSyncMetadata(entityType, localId, createdLocally);
  const payload = operation === 'delete' ? (deletedPayload || null) : (buildSyncPayload(entityType, localId) || null);
  queueEntityMutation({
    entityType,
    syncId: metadata.SYNC_ID,
    operation,
    payload,
    baseRevision: Number(metadata.REMOTE_REVISION || 0),
  });
  db.run(`UPDATE SADOK_ENTITY_SYNC_META SET UPDATED_AT=?, DELETED=? WHERE SYNC_ID=?`, [
    new Date().toISOString(),
    operation === 'delete' ? 1 : 0,
    metadata.SYNC_ID,
  ]);
}

function ensureAllSyncMetadata(): void {
  queryAll<{ ID: number }>('SELECT ID FROM PRODUKTS').forEach(row =>
    ensureSyncMetadata('product', String(row.ID))
  );
  queryAll<{ ID: number }>('SELECT ID FROM KARTOTEKA_BLUD').forEach(row =>
    ensureSyncMetadata('dish', String(row.ID))
  );
  queryAll<{ ID: number }>('SELECT ID FROM KOMPONENTI_KARTOTEKI').forEach(row =>
    ensureSyncMetadata('recipe_component', String(row.ID))
  );
  queryAll<{ ID_BLUDA: number; ID_KATEGORII_DETEJ: number }>(
    'SELECT ID_BLUDA, ID_KATEGORII_DETEJ FROM TECH_CARD_NUTRITION'
  ).forEach(row => ensureSyncMetadata(
    'dish_nutrition_profile',
    `${row.ID_BLUDA}:${row.ID_KATEGORII_DETEJ}`,
  ));
  queryAll<{ ID: number }>('SELECT ID FROM MENU').forEach(row =>
    ensureSyncMetadata('menu_entry', String(row.ID))
  );
  queryAll<{ ID: number }>('SELECT ID FROM MENU_APPROVALS').forEach(row =>
    ensureSyncMetadata('menu_approval', String(row.ID))
  );
  queryAll<{ ID: number }>('SELECT ID FROM FIRMI').forEach(row =>
    ensureSyncMetadata('supplier', String(row.ID))
  );
  queryAll<{ ID: number }>('SELECT ID FROM NAKLADNIE_PRIXODA').forEach(row =>
    ensureSyncMetadata('invoice', String(row.ID))
  );
  queryAll<{ ID: number }>('SELECT ID FROM PARTII_NOW').forEach(row =>
    ensureSyncMetadata('stock_batch', String(row.ID))
  );
  getGroups().forEach(g => ensureSyncMetadata('group', String(g.ID)));
  getEmployees().forEach(e => ensureSyncMetadata('employee', String(e.ID)));
  getChildren().forEach(c => ensureSyncMetadata('child', String(c.ID)));
  getPropertyItems().forEach(p => ensureSyncMetadata('property_item', String(p.ID)));
  getPropertyWriteOffs().forEach(w => ensureSyncMetadata('property_writeoff', String(w.ID)));
  getPsychologyAdaptations().forEach(a => ensureSyncMetadata('psychology_adaptation', String(a.ID)));
  getSchoolReadinessAssessments().forEach(r => ensureSyncMetadata('psychology_readiness', String(r.ID)));
  getPsychologyConsultations().forEach(c => ensureSyncMetadata('psychology_consultation', String(c.ID)));
  getPsychologySummaryReports().forEach(r => ensureSyncMetadata('psychology_report', String(r.ID)));
  getPsychologyDailyLogEntries().forEach(d => ensureSyncMetadata('psychology_daily_log', String(d.ID)));
  getPsychologySpecialSupportEntries().forEach(s => ensureSyncMetadata('psychology_special_support', String(s.ID)));
  getMedicalCards().forEach(m => ensureSyncMetadata('medical_card', String(m.ID)));
  getVaccinations().forEach(v => ensureSyncMetadata('medical_vaccination', String(v.ID)));
  getAnthropometries().forEach(a => ensureSyncMetadata('medical_anthropometry', String(a.ID)));
  getSpeechCards().forEach(c => ensureSyncMetadata('speech_card', String(c.ID)));
  getSpeechDailyLogEntries().forEach(d => ensureSyncMetadata('speech_daily_log', String(d.ID)));
}

export function exportLocalSyncEntities(entityTypes?: Iterable<SyncEntityType>): LocalSyncEntity[] {
  ensureAllSyncMetadata();
  const includedTypes = entityTypes ? new Set(entityTypes) : null;
  return queryAll<SyncMetadataRow>(`
    SELECT * FROM SADOK_ENTITY_SYNC_META WHERE DELETED=0
    ORDER BY CASE ENTITY_TYPE
      WHEN 'product' THEN 1 WHEN 'dish' THEN 2
      WHEN 'recipe_component' THEN 3 ELSE 4 END, LOCAL_ID
  `).filter(metadata => !includedTypes || includedTypes.has(metadata.ENTITY_TYPE)).flatMap(metadata => {
    const payload = buildSyncPayload(metadata.ENTITY_TYPE, metadata.LOCAL_ID);
    return payload ? [{
      entityType: metadata.ENTITY_TYPE,
      localId: metadata.LOCAL_ID,
      syncId: metadata.SYNC_ID,
      revision: Number(metadata.REMOTE_REVISION || 0),
      payload,
    }] : [];
  });
}

export function markLocalSyncEntityRevision(
  syncId: string,
  revision: number,
  updatedAt: string,
  deviceId: string,
  deleted: boolean,
): void {
  db.run(`UPDATE SADOK_ENTITY_SYNC_META
    SET REMOTE_REVISION=?, UPDATED_AT=?, DEVICE_ID=?, DELETED=? WHERE SYNC_ID=?`, [
    revision, updatedAt, deviceId, deleted ? 1 : 0, syncId,
  ]);
}

export function reconcileLocalBootstrapSnapshot(
  remoteSyncIds: Iterable<string>,
  protectedSyncIds: Iterable<string>,
  entityTypes?: Iterable<SyncEntityType>,
): number {
  const includedTypes = entityTypes ? new Set(entityTypes) : null;
  const metadata = queryAll<SyncMetadataRow>(`
    SELECT * FROM SADOK_ENTITY_SYNC_META WHERE DELETED=0
  `).filter(row => !includedTypes || includedTypes.has(row.ENTITY_TYPE));
  const staleIds = new Set(findStaleBootstrapSyncIds(
    metadata.map(row => ({ syncId: row.SYNC_ID, revision: Number(row.REMOTE_REVISION || 0) })),
    remoteSyncIds,
    protectedSyncIds,
  ));
  if (staleIds.size === 0) return 0;

  const staleRows = metadata
    .filter(row => staleIds.has(row.SYNC_ID))
    .sort((left, right) => {
      const order: Record<SyncEntityType, number> = {
        dish_nutrition_profile: 1,
        recipe_component: 2,
        stock_batch: 2,
        menu_approval: 2,
        menu_entry: 2,
        invoice: 3,
        supplier: 4,
        dish: 4,
        product: 5,
        group: 6,
        employee: 7,
        child: 8,
        property_item: 9,
        property_writeoff: 10,
        psychology_adaptation: 11,
        psychology_readiness: 12,
        psychology_consultation: 13,
        psychology_report: 14,
        psychology_daily_log: 15,
        psychology_special_support: 16,
        medical_card: 17,
        medical_vaccination: 18,
        medical_anthropometry: 19,
        speech_card: 20,
        speech_daily_log: 21,
      };
      return order[left.ENTITY_TYPE] - order[right.ENTITY_TYPE];
    });

  db.run('BEGIN');
  try {
    staleRows.forEach(row => {
      if (row.ENTITY_TYPE === 'product') db.run('DELETE FROM PRODUKTS WHERE ID=?', [Number(row.LOCAL_ID)]);
      if (row.ENTITY_TYPE === 'dish') db.run('DELETE FROM KARTOTEKA_BLUD WHERE ID=?', [Number(row.LOCAL_ID)]);
      if (row.ENTITY_TYPE === 'recipe_component') db.run('DELETE FROM KOMPONENTI_KARTOTEKI WHERE ID=?', [Number(row.LOCAL_ID)]);
      if (row.ENTITY_TYPE === 'dish_nutrition_profile') {
        const [dishId, categoryId] = row.LOCAL_ID.split(':').map(Number);
        db.run('DELETE FROM TECH_CARD_NUTRITION WHERE ID_BLUDA=? AND ID_KATEGORII_DETEJ=?', [dishId, categoryId]);
      }
      if (row.ENTITY_TYPE === 'group') {
        localStorage.setItem('sadok_groups', JSON.stringify(getGroups().filter(g => String(g.ID) !== row.LOCAL_ID)));
      }
      if (row.ENTITY_TYPE === 'employee') {
        localStorage.setItem('sadok_employees', JSON.stringify(getEmployees().filter(e => String(e.ID) !== row.LOCAL_ID)));
      }
      if (row.ENTITY_TYPE === 'child') {
        localStorage.setItem('sadok_children', JSON.stringify(getChildren().filter(c => String(c.ID) !== row.LOCAL_ID)));
      }
      if (row.ENTITY_TYPE === 'property_item') {
        localStorage.setItem('sadok_property_items', JSON.stringify(getPropertyItems().filter(p => String(p.ID) !== row.LOCAL_ID)));
      }
      if (row.ENTITY_TYPE === 'property_writeoff') {
        localStorage.setItem('sadok_property_writeoffs', JSON.stringify(getPropertyWriteOffs().filter(w => String(w.ID) !== row.LOCAL_ID)));
      }
      if (row.ENTITY_TYPE === 'psychology_adaptation') {
        localStorage.setItem('sadok_psychology_adaptations', JSON.stringify(getPsychologyAdaptations().filter(a => String(a.ID) !== row.LOCAL_ID)));
      }
      if (row.ENTITY_TYPE === 'psychology_readiness') {
        localStorage.setItem('sadok_school_readiness', JSON.stringify(getSchoolReadinessAssessments().filter(r => String(r.ID) !== row.LOCAL_ID)));
      }
      if (row.ENTITY_TYPE === 'psychology_consultation') {
        localStorage.setItem('sadok_psychology_consultations', JSON.stringify(getPsychologyConsultations().filter(c => String(c.ID) !== row.LOCAL_ID)));
      }
      if (row.ENTITY_TYPE === 'psychology_report') {
        localStorage.setItem('sadok_psychology_summary_reports', JSON.stringify(getPsychologySummaryReports().filter(r => String(r.ID) !== row.LOCAL_ID)));
      }
      if (row.ENTITY_TYPE === 'psychology_daily_log') {
        localStorage.setItem('sadok_psychology_daily_logs', JSON.stringify(getPsychologyDailyLogEntries().filter(d => String(d.ID) !== row.LOCAL_ID)));
      }
      if (row.ENTITY_TYPE === 'psychology_special_support') {
        localStorage.setItem('sadok_psychology_special_support', JSON.stringify(getPsychologySpecialSupportEntries().filter(s => String(s.ID) !== row.LOCAL_ID)));
      }
      if (row.ENTITY_TYPE === 'medical_card') {
        localStorage.setItem('sadok_medical_cards', JSON.stringify(getMedicalCards().filter(m => String(m.ID) !== row.LOCAL_ID)));
      }
      if (row.ENTITY_TYPE === 'medical_vaccination') {
        localStorage.setItem('sadok_vaccinations', JSON.stringify(getVaccinations().filter(v => String(v.ID) !== row.LOCAL_ID)));
      }
      if (row.ENTITY_TYPE === 'medical_anthropometry') {
        localStorage.setItem('sadok_anthropometries', JSON.stringify(getAnthropometries().filter(a => String(a.ID) !== row.LOCAL_ID)));
      }
      if (row.ENTITY_TYPE === 'speech_card') {
        localStorage.setItem('sadok_speech_cards', JSON.stringify(getSpeechCards().filter(c => String(c.ID) !== row.LOCAL_ID)));
      }
      if (row.ENTITY_TYPE === 'speech_daily_log') {
        localStorage.setItem('sadok_speech_daily_logs', JSON.stringify(getSpeechDailyLogEntries().filter(d => String(d.ID) !== row.LOCAL_ID)));
      }
      db.run('DELETE FROM SADOK_ENTITY_SYNC_META WHERE SYNC_ID=?', [row.SYNC_ID]);
    });
    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
  return staleRows.length;
}

function tableColumns(table: string): Set<string> {
  const result = db.exec(`PRAGMA table_info(${table})`)[0]?.values || [];
  return new Set(result.map((row: unknown[]) => String(row[1])));
}

function insertRemoteRow(table: string, row: Record<string, unknown>): string {
  const allowed = tableColumns(table);
  const entries = Object.entries(row).filter(([key]) => key !== 'ID' && allowed.has(key));
  const columns = entries.map(([key]) => key);
  db.run(
    `INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`,
    entries.map(([, value]) => value ?? null),
  );
  return String(db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] || '');
}

function updateRemoteRow(table: string, localId: string, row: Record<string, unknown>): void {
  const allowed = tableColumns(table);
  const entries = Object.entries(row).filter(([key]) => key !== 'ID' && allowed.has(key));
  if (entries.length === 0) return;
  db.run(
    `UPDATE ${table} SET ${entries.map(([key]) => `${key}=?`).join(',')} WHERE ID=?`,
    [...entries.map(([, value]) => value ?? null), Number(localId)],
  );
}

function resolveRemoteRelation(syncId: unknown, expectedType: SyncEntityType): string {
  const metadata = getSyncMetadataBySyncId(String(syncId || ''));
  if (!metadata || metadata.ENTITY_TYPE !== expectedType || metadata.DELETED) {
    throw new Error(`Не знайдено пов’язаний запис ${expectedType}: ${String(syncId || '')}`);
  }
  return metadata.LOCAL_ID;
}

function saveRemoteMetadata(
  remote: RemoteEntityDocument,
  localId: string,
): void {
  db.run(`INSERT INTO SADOK_ENTITY_SYNC_META
    (ENTITY_TYPE, LOCAL_ID, SYNC_ID, REMOTE_REVISION, UPDATED_AT, DEVICE_ID, DELETED)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(SYNC_ID) DO UPDATE SET
      ENTITY_TYPE=excluded.ENTITY_TYPE, LOCAL_ID=excluded.LOCAL_ID,
      REMOTE_REVISION=excluded.REMOTE_REVISION, UPDATED_AT=excluded.UPDATED_AT,
      DEVICE_ID=excluded.DEVICE_ID, DELETED=excluded.DELETED`, [
    remote.entityType, localId, remote.syncId, remote.revision, remote.updatedAt,
    remote.deviceId, remote.deleted ? 1 : 0,
  ]);
}

export function applyRemoteSyncEntity(remote: RemoteEntityDocument): void {
  const existing = getSyncMetadataBySyncId(remote.syncId);
  const payload = remote.payload || {};
  const rawRow = (payload.row || {}) as Record<string, unknown>;

  if (remote.deleted) {
    if (existing && !existing.DELETED) {
      if (remote.entityType === 'product') db.run('DELETE FROM PRODUKTS WHERE ID=?', [Number(existing.LOCAL_ID)]);
      if (remote.entityType === 'dish') db.run('DELETE FROM KARTOTEKA_BLUD WHERE ID=?', [Number(existing.LOCAL_ID)]);
      if (remote.entityType === 'recipe_component') db.run('DELETE FROM KOMPONENTI_KARTOTEKI WHERE ID=?', [Number(existing.LOCAL_ID)]);
      if (remote.entityType === 'menu_entry') db.run('DELETE FROM MENU WHERE ID=?', [Number(existing.LOCAL_ID)]);
      if (remote.entityType === 'menu_approval') db.run('DELETE FROM MENU_APPROVALS WHERE ID=?', [Number(existing.LOCAL_ID)]);
      if (remote.entityType === 'supplier') db.run('DELETE FROM FIRMI WHERE ID=?', [Number(existing.LOCAL_ID)]);
      if (remote.entityType === 'invoice') db.run('DELETE FROM NAKLADNIE_PRIXODA WHERE ID=?', [Number(existing.LOCAL_ID)]);
      if (remote.entityType === 'stock_batch') db.run('DELETE FROM PARTII_NOW WHERE ID=?', [Number(existing.LOCAL_ID)]);
      if (remote.entityType === 'dish_nutrition_profile') {
        const [dishId, categoryId] = existing.LOCAL_ID.split(':').map(Number);
        db.run('DELETE FROM TECH_CARD_NUTRITION WHERE ID_BLUDA=? AND ID_KATEGORII_DETEJ=?', [dishId, categoryId]);
      }
      if (remote.entityType === 'group') {
        localStorage.setItem('sadok_groups', JSON.stringify(getGroups().filter(g => String(g.ID) !== existing.LOCAL_ID)));
      }
      if (remote.entityType === 'employee') {
        localStorage.setItem('sadok_employees', JSON.stringify(getEmployees().filter(e => String(e.ID) !== existing.LOCAL_ID)));
      }
      if (remote.entityType === 'child') {
        localStorage.setItem('sadok_children', JSON.stringify(getChildren().filter(c => String(c.ID) !== existing.LOCAL_ID)));
      }
      if (remote.entityType === 'property_item') {
        localStorage.setItem('sadok_property_items', JSON.stringify(getPropertyItems().filter(p => String(p.ID) !== existing.LOCAL_ID)));
      }
      if (remote.entityType === 'property_writeoff') {
        localStorage.setItem('sadok_property_writeoffs', JSON.stringify(getPropertyWriteOffs().filter(w => String(w.ID) !== existing.LOCAL_ID)));
      }
      if (remote.entityType === 'psychology_adaptation') {
        localStorage.setItem('sadok_psychology_adaptations', JSON.stringify(getPsychologyAdaptations().filter(a => String(a.ID) !== existing.LOCAL_ID)));
      }
      if (remote.entityType === 'psychology_readiness') {
        localStorage.setItem('sadok_school_readiness', JSON.stringify(getSchoolReadinessAssessments().filter(r => String(r.ID) !== existing.LOCAL_ID)));
      }
      if (remote.entityType === 'psychology_consultation') {
        localStorage.setItem('sadok_psychology_consultations', JSON.stringify(getPsychologyConsultations().filter(c => String(c.ID) !== existing.LOCAL_ID)));
      }
      if (remote.entityType === 'psychology_report') {
        localStorage.setItem('sadok_psychology_summary_reports', JSON.stringify(getPsychologySummaryReports().filter(r => String(r.ID) !== existing.LOCAL_ID)));
      }
      if (remote.entityType === 'psychology_daily_log') {
        localStorage.setItem('sadok_psychology_daily_logs', JSON.stringify(getPsychologyDailyLogEntries().filter(d => String(d.ID) !== existing.LOCAL_ID)));
      }
      if (remote.entityType === 'psychology_special_support') {
        localStorage.setItem('sadok_psychology_special_support', JSON.stringify(getPsychologySpecialSupportEntries().filter(s => String(s.ID) !== existing.LOCAL_ID)));
      }
      if (remote.entityType === 'medical_card') {
        localStorage.setItem('sadok_medical_cards', JSON.stringify(getMedicalCards().filter(m => String(m.ID) !== existing.LOCAL_ID)));
      }
      if (remote.entityType === 'medical_vaccination') {
        localStorage.setItem('sadok_vaccinations', JSON.stringify(getVaccinations().filter(v => String(v.ID) !== existing.LOCAL_ID)));
      }
      if (remote.entityType === 'medical_anthropometry') {
        localStorage.setItem('sadok_anthropometries', JSON.stringify(getAnthropometries().filter(a => String(a.ID) !== existing.LOCAL_ID)));
      }
      if (remote.entityType === 'speech_card') {
        localStorage.setItem('sadok_speech_cards', JSON.stringify(getSpeechCards().filter(c => String(c.ID) !== existing.LOCAL_ID)));
      }
      if (remote.entityType === 'speech_daily_log') {
        localStorage.setItem('sadok_speech_daily_logs', JSON.stringify(getSpeechDailyLogEntries().filter(d => String(d.ID) !== existing.LOCAL_ID)));
      }
      saveRemoteMetadata(remote, existing.LOCAL_ID);
    }
    return;
  }

  if (['product', 'dish', 'menu_approval', 'supplier'].includes(remote.entityType)) {
    const table = {
      product: 'PRODUKTS',
      dish: 'KARTOTEKA_BLUD',
      menu_approval: 'MENU_APPROVALS',
      supplier: 'FIRMI',
    }[remote.entityType] as string;
    const localId = existing?.LOCAL_ID || insertRemoteRow(table, rawRow);
    if (existing) updateRemoteRow(table, localId, rawRow);
    saveRemoteMetadata(remote, localId);
    return;
  }

  if (remote.entityType === 'recipe_component') {
    const row = {
      ...rawRow,
      ID_BLUDA: Number(resolveRemoteRelation(payload.dishSyncId, 'dish')),
      ID_PRODUKTA: Number(resolveRemoteRelation(payload.productSyncId, 'product')),
    };
    const localId = existing?.LOCAL_ID || insertRemoteRow('KOMPONENTI_KARTOTEKI', row);
    if (existing) updateRemoteRow('KOMPONENTI_KARTOTEKI', localId, row);
    saveRemoteMetadata(remote, localId);
    return;
  }

  if (remote.entityType === 'menu_entry') {
    const row = {
      ...rawRow,
      ID_BLUDA: Number(resolveRemoteRelation(payload.dishSyncId, 'dish')),
    };
    const localId = existing?.LOCAL_ID || insertRemoteRow('MENU', row);
    if (existing) updateRemoteRow('MENU', localId, row);
    saveRemoteMetadata(remote, localId);
    return;
  }

  if (remote.entityType === 'invoice') {
    const row = {
      ...rawRow,
      ID_FIRMI: Number(resolveRemoteRelation(payload.supplierSyncId, 'supplier')),
    };
    const localId = existing?.LOCAL_ID || insertRemoteRow('NAKLADNIE_PRIXODA', row);
    if (existing) updateRemoteRow('NAKLADNIE_PRIXODA', localId, row);
    saveRemoteMetadata(remote, localId);
    return;
  }

  if (remote.entityType === 'stock_batch') {
    const row = {
      ...rawRow,
      ID_NAKLADNOJ: Number(resolveRemoteRelation(payload.invoiceSyncId, 'invoice')),
      ID_PRODUKTA: Number(resolveRemoteRelation(payload.productSyncId, 'product')),
    };
    const localId = existing?.LOCAL_ID || insertRemoteRow('PARTII_NOW', row);
    if (existing) updateRemoteRow('PARTII_NOW', localId, row);
    saveRemoteMetadata(remote, localId);
    return;
  }

  if (remote.entityType === 'group') {
    const current = getGroups();
    const row = rawRow as unknown as SadokGroup;
    const localId = existing?.LOCAL_ID || String(row.ID || (current.length > 0 ? Math.max(...current.map(g => g.ID)) + 1 : 1));
    const updatedRow = { ...row, ID: Number(localId) };
    const exists = current.some(g => String(g.ID) === localId);
    const updated = exists ? current.map(g => String(g.ID) === localId ? updatedRow : g) : [updatedRow, ...current];
    localStorage.setItem('sadok_groups', JSON.stringify(updated));
    saveRemoteMetadata(remote, localId);
    return;
  }

  if (remote.entityType === 'employee') {
    const current = getEmployees();
    const row = rawRow as unknown as SadokEmployee;
    const localId = existing?.LOCAL_ID || String(row.ID || (current.length > 0 ? Math.max(...current.map(e => e.ID)) + 1 : 1));
    const updatedRow = { ...row, ID: Number(localId) };
    const exists = current.some(e => String(e.ID) === localId);
    const updated = exists ? current.map(e => String(e.ID) === localId ? updatedRow : e) : [updatedRow, ...current];
    localStorage.setItem('sadok_employees', JSON.stringify(updated));
    saveRemoteMetadata(remote, localId);
    return;
  }

  if (remote.entityType === 'child') {
    const current = getChildren();
    const row = rawRow as unknown as SadokChild;
    const localId = existing?.LOCAL_ID || String(row.ID || (current.length > 0 ? Math.max(...current.map(c => c.ID)) + 1 : 1));
    const updatedRow = { ...row, ID: Number(localId) };
    const exists = current.some(c => String(c.ID) === localId);
    const updated = exists ? current.map(c => String(c.ID) === localId ? updatedRow : c) : [updatedRow, ...current];
    localStorage.setItem('sadok_children', JSON.stringify(updated));
    saveRemoteMetadata(remote, localId);
    return;
  }

  if (remote.entityType === 'property_item') {
    const current = getPropertyItems();
    const row = rawRow as unknown as PropertyItem;
    const localId = existing?.LOCAL_ID || String(row.ID || (current.length > 0 ? Math.max(...current.map(p => p.ID)) + 1 : 1));
    const updatedRow = { ...row, ID: Number(localId) };
    const exists = current.some(p => String(p.ID) === localId);
    const updated = exists ? current.map(p => String(p.ID) === localId ? updatedRow : p) : [updatedRow, ...current];
    localStorage.setItem('sadok_property_items', JSON.stringify(updated));
    saveRemoteMetadata(remote, localId);
    return;
  }

  if (remote.entityType === 'property_writeoff') {
    const current = getPropertyWriteOffs();
    const row = rawRow as unknown as PropertyWriteOffRecord;
    const localId = existing?.LOCAL_ID || String(row.ID || (current.length > 0 ? Math.max(...current.map(w => w.ID)) + 1 : 1));
    const updatedRow = { ...row, ID: Number(localId) };
    const exists = current.some(w => String(w.ID) === localId);
    const updated = exists ? current.map(w => String(w.ID) === localId ? updatedRow : w) : [updatedRow, ...current];
    localStorage.setItem('sadok_property_writeoffs', JSON.stringify(updated));
    saveRemoteMetadata(remote, localId);
    return;
  }

  if (remote.entityType === 'psychology_adaptation') {
    const current = getPsychologyAdaptations();
    const row = rawRow as unknown as PsychologyAdaptationRecord;
    const localId = existing?.LOCAL_ID || String(row.ID || (current.length > 0 ? Math.max(...current.map(a => a.ID)) + 1 : 1));
    const updatedRow = { ...row, ID: Number(localId) };
    const exists = current.some(a => String(a.ID) === localId);
    const updated = exists ? current.map(a => String(a.ID) === localId ? updatedRow : a) : [updatedRow, ...current];
    localStorage.setItem('sadok_psychology_adaptations', JSON.stringify(updated));
    saveRemoteMetadata(remote, localId);
    return;
  }

  if (remote.entityType === 'psychology_readiness') {
    const current = getSchoolReadinessAssessments();
    const row = rawRow as unknown as SchoolReadinessAssessment;
    const localId = existing?.LOCAL_ID || String(row.ID || (current.length > 0 ? Math.max(...current.map(r => r.ID)) + 1 : 1));
    const updatedRow = { ...row, ID: Number(localId) };
    const exists = current.some(r => String(r.ID) === localId);
    const updated = exists ? current.map(r => String(r.ID) === localId ? updatedRow : r) : [updatedRow, ...current];
    localStorage.setItem('sadok_school_readiness', JSON.stringify(updated));
    saveRemoteMetadata(remote, localId);
    return;
  }

  if (remote.entityType === 'psychology_consultation') {
    const current = getPsychologyConsultations();
    const row = rawRow as unknown as PsychologyConsultation;
    const localId = existing?.LOCAL_ID || String(row.ID || (current.length > 0 ? Math.max(...current.map(c => c.ID)) + 1 : 1));
    const updatedRow = { ...row, ID: Number(localId) };
    const exists = current.some(c => String(c.ID) === localId);
    const updated = exists ? current.map(c => String(c.ID) === localId ? updatedRow : c) : [updatedRow, ...current];
    localStorage.setItem('sadok_psychology_consultations', JSON.stringify(updated));
    saveRemoteMetadata(remote, localId);
    return;
  }

  if (remote.entityType === 'psychology_report') {
    const current = getPsychologySummaryReports();
    const row = rawRow as unknown as PsychologySummaryReport;
    const localId = existing?.LOCAL_ID || String(row.ID || (current.length > 0 ? Math.max(...current.map(r => r.ID)) + 1 : 1));
    const updatedRow = { ...row, ID: Number(localId) };
    const exists = current.some(r => String(r.ID) === localId);
    const updated = exists ? current.map(r => String(r.ID) === localId ? updatedRow : r) : [updatedRow, ...current];
    localStorage.setItem('sadok_psychology_summary_reports', JSON.stringify(updated));
    saveRemoteMetadata(remote, localId);
    return;
  }

  if (remote.entityType === 'psychology_daily_log') {
    const current = getPsychologyDailyLogEntries();
    const row = rawRow as unknown as PsychologyDailyLogEntry;
    const localId = existing?.LOCAL_ID || String(row.ID || (current.length > 0 ? Math.max(...current.map(d => d.ID)) + 1 : 1));
    const updatedRow = { ...row, ID: Number(localId) };
    const exists = current.some(d => String(d.ID) === localId);
    const updated = exists ? current.map(d => String(d.ID) === localId ? updatedRow : d) : [updatedRow, ...current];
    localStorage.setItem('sadok_psychology_daily_logs', JSON.stringify(updated));
    saveRemoteMetadata(remote, localId);
    return;
  }

  if (remote.entityType === 'psychology_special_support') {
    const current = getPsychologySpecialSupportEntries();
    const row = rawRow as unknown as PsychologySpecialSupportEntry;
    const localId = existing?.LOCAL_ID || String(row.ID || (current.length > 0 ? Math.max(...current.map(s => s.ID)) + 1 : 1));
    const updatedRow = { ...row, ID: Number(localId) };
    const exists = current.some(s => String(s.ID) === localId);
    const updated = exists ? current.map(s => String(s.ID) === localId ? updatedRow : s) : [updatedRow, ...current];
    localStorage.setItem('sadok_psychology_special_support', JSON.stringify(updated));
    saveRemoteMetadata(remote, localId);
    return;
  }

  if (remote.entityType === 'medical_card') {
    const current = getMedicalCards();
    const row = rawRow as unknown as SadokMedicalCard;
    const localId = existing?.LOCAL_ID || String(row.ID || (current.length > 0 ? Math.max(...current.map(m => m.ID)) + 1 : 1));
    const updatedRow = { ...row, ID: Number(localId) };
    const exists = current.some(m => String(m.ID) === localId);
    const updated = exists ? current.map(m => String(m.ID) === localId ? updatedRow : m) : [updatedRow, ...current];
    localStorage.setItem('sadok_medical_cards', JSON.stringify(updated));
    saveRemoteMetadata(remote, localId);
    return;
  }

  if (remote.entityType === 'medical_vaccination') {
    const current = getVaccinations();
    const row = rawRow as unknown as SadokVaccination;
    const localId = existing?.LOCAL_ID || String(row.ID || (current.length > 0 ? Math.max(...current.map(v => v.ID)) + 1 : 1));
    const updatedRow = { ...row, ID: Number(localId) };
    const exists = current.some(v => String(v.ID) === localId);
    const updated = exists ? current.map(v => String(v.ID) === localId ? updatedRow : v) : [updatedRow, ...current];
    localStorage.setItem('sadok_vaccinations', JSON.stringify(updated));
    saveRemoteMetadata(remote, localId);
    return;
  }

  if (remote.entityType === 'medical_anthropometry') {
    const current = getAnthropometries();
    const row = rawRow as unknown as SadokAnthropometry;
    const localId = existing?.LOCAL_ID || String(row.ID || (current.length > 0 ? Math.max(...current.map(a => a.ID)) + 1 : 1));
    const updatedRow = { ...row, ID: Number(localId) };
    const exists = current.some(a => String(a.ID) === localId);
    const updated = exists ? current.map(a => String(a.ID) === localId ? updatedRow : a) : [updatedRow, ...current];
    localStorage.setItem('sadok_anthropometries', JSON.stringify(updated));
    saveRemoteMetadata(remote, localId);
    return;
  }

  if (remote.entityType === 'speech_card') {
    const current = getSpeechCards();
    const row = rawRow as unknown as SpeechCard;
    const localId = existing?.LOCAL_ID || String(row.ID || (current.length > 0 ? Math.max(...current.map(c => c.ID)) + 1 : 1));
    const updatedRow = { ...row, ID: Number(localId) };
    const exists = current.some(c => String(c.ID) === localId);
    const updated = exists ? current.map(c => String(c.ID) === localId ? updatedRow : c) : [updatedRow, ...current];
    localStorage.setItem('sadok_speech_cards', JSON.stringify(updated));
    saveRemoteMetadata(remote, localId);
    return;
  }

  if (remote.entityType === 'speech_daily_log') {
    const current = getSpeechDailyLogEntries();
    const row = rawRow as unknown as SpeechDailyLogEntry;
    const localId = existing?.LOCAL_ID || String(row.ID || (current.length > 0 ? Math.max(...current.map(d => d.ID)) + 1 : 1));
    const updatedRow = { ...row, ID: Number(localId) };
    const exists = current.some(d => String(d.ID) === localId);
    const updated = exists ? current.map(d => String(d.ID) === localId ? updatedRow : d) : [updatedRow, ...current];
    localStorage.setItem('sadok_speech_daily_logs', JSON.stringify(updated));
    saveRemoteMetadata(remote, localId);
    return;
  }

  const dishId = Number(resolveRemoteRelation(payload.dishSyncId, 'dish'));
  const categoryId = Number(rawRow.ID_KATEGORII_DETEJ || 1);
  const current = queryAll<{ ID: number }>(`
    SELECT ID FROM TECH_CARD_NUTRITION
    WHERE ID_BLUDA=${dishId} AND ID_KATEGORII_DETEJ=${categoryId}
  `)[0];
  const row = { ...rawRow, ID_BLUDA: dishId, ID_KATEGORII_DETEJ: categoryId };
  if (current) updateRemoteRow('TECH_CARD_NUTRITION', String(current.ID), row);
  else insertRemoteRow('TECH_CARD_NUTRITION', row);
  saveRemoteMetadata(remote, `${dishId}:${categoryId}`);
}

export function persistRemoteSyncEntities(): void {
  saveDatabaseToDisk();
  window.dispatchEvent(new CustomEvent(DATABASE_SYNC_EVENT));
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
    .replace(/Масло сливочное, растительное/gi, 'Масло вершкове, олія')
    .replace(/Соки, напитки, чай, какао/gi, 'Соки, напої, чай, какао')
    .replace(/Яйца и яйцепродукты/gi, 'Яйця та яйцепродукти')
    .replace(/Прочее\s*\(\s*специи\s*,\s*соль\s*,\s*дрожжи\s*\)|Прочее/gi, 'Інше (спеції, сіль, дріжджі)');
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

export const getRecipeComponents = (
  dishId: number,
  categoryId = 1,
  includeAlternatives = true
): RecipeComponent[] =>
  queryAll<RecipeComponent>(`
    SELECT k.*, p.NAME as productName, p.EDINICA_IZMERENIA as unit
    FROM KOMPONENTI_KARTOTEKI k
    LEFT JOIN PRODUKTS p ON k.ID_PRODUKTA = p.ID
    WHERE k.ID_BLUDA = ${dishId}
      AND k.ID_KATEGORII_DETEJ = ${categoryId}
      ${includeAlternatives ? '' : 'AND COALESCE(k.IS_ALTERNATIVE, 0) = 0'}
    ORDER BY k.NOMER_ID_LINII_V_TABLICE
  `);

export const getDishNutritionProfiles = (dishId: number): RecipeNutritionProfile[] =>
  queryAll<RecipeNutritionProfile>(`
    SELECT n.*, c.NAME as categoryName
    FROM TECH_CARD_NUTRITION n
    LEFT JOIN KATEGORII_DETOK c ON c.ID = n.ID_KATEGORII_DETEJ
    WHERE n.ID_BLUDA = ${dishId}
    ORDER BY n.ID_KATEGORII_DETEJ
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

export const getMenuEntriesRange = (dateFrom: string, dateTo: string): MenuHeader[] =>
  queryAll<MenuHeader>(
    `SELECT * FROM MENU
     WHERE DATA BETWEEN '${esc(dateFrom)}' AND '${esc(dateTo)}'
     ORDER BY DATA, PORRDOK_SLEDOVANIR_BLUD, ID`
  ).map(m => ({ ...m, MEAL_TYPE: translateMealType(m.MEAL_TYPE) }));

function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function copyMenuPeriod(
  sourceStart: string,
  targetStart: string,
  dayCount: number,
  replaceTarget = true
): { copied: number; targetDates: string[] } {
  if (!db) return { copied: 0, targetDates: [] };
  requirePermission('menu.write');
  const safeDayCount = Math.max(1, Math.min(31, Math.floor(dayCount)));
  const targetDates = Array.from({ length: safeDayCount }, (_, index) => addDays(targetStart, index));
  targetDates.forEach(assertDateOpen);
  const sourceRows = getMenuEntriesRange(sourceStart, addDays(sourceStart, safeDayCount - 1));
  const targetDateList = targetDates.map(date => `'${esc(date)}'`).join(',');
  const previousMenuRows = queryAll<MenuHeader>(`SELECT * FROM MENU WHERE DATA IN (${targetDateList})`);
  const previousApprovals = queryAll<MenuApproval>(`SELECT * FROM MENU_APPROVALS WHERE MENU_DATE IN (${targetDateList})`);
  const previousMenuIds = new Set(previousMenuRows.map(row => row.ID));

  db.run('BEGIN');
  try {
    if (replaceTarget) {
      targetDates.forEach(date => db.run(`DELETE FROM MENU WHERE DATA = '${esc(date)}'`));
    }
    sourceRows.forEach(row => {
      const sourceOffset = Math.round(
        (new Date(`${row.DATA}T12:00:00`).getTime() - new Date(`${sourceStart}T12:00:00`).getTime())
        / 86400000
      );
      const targetDate = addDays(targetStart, sourceOffset);
      const exists = queryAll<{ ID: number }>(
        `SELECT ID FROM MENU
         WHERE DATA = '${esc(targetDate)}'
           AND ID_BLUDA = ${row.ID_BLUDA}
           AND MEAL_TYPE = '${esc(row.MEAL_TYPE)}'
         LIMIT 1`
      )[0];
      if (!exists) {
        db.run(
          `INSERT INTO MENU
            (ID_ZOY, DATA, ID_BLUDA, NAME_BLUDA, PORRDOK_SLEDOVANIR_BLUD, MEAL_TYPE)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            row.ID_ZOY || 1, targetDate, row.ID_BLUDA, row.NAME_BLUDA,
            row.PORRDOK_SLEDOVANIR_BLUD || 1, row.MEAL_TYPE,
          ]
        );
      }
    });
    targetDates.forEach(date => db.run(`DELETE FROM MENU_APPROVALS WHERE MENU_DATE = '${esc(date)}'`));
    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
  recordAudit({
    action: 'create',
    entityType: 'menu_period',
    entityId: `${targetStart}:${safeDayCount}`,
    summary: `Скопійовано меню за ${safeDayCount} днів з ${sourceStart} на ${targetStart}`,
    after: { sourceStart, targetStart, dayCount: safeDayCount, copied: sourceRows.length },
  });
  if (replaceTarget) {
    previousMenuRows.forEach(row => queueCurrentSyncEntity(
      'menu_entry', String(row.ID), 'delete', false,
      { row, dishSyncId: ensureSyncMetadata('dish', String(row.ID_BLUDA)).SYNC_ID },
    ));
  }
  previousApprovals.forEach(row => queueCurrentSyncEntity(
    'menu_approval', String(row.ID), 'delete', false, { row },
  ));
  queryAll<MenuHeader>(`SELECT * FROM MENU WHERE DATA IN (${targetDateList})`)
    .filter(row => replaceTarget || !previousMenuIds.has(row.ID))
    .forEach(row => queueCurrentSyncEntity(
      'menu_entry', String(row.ID), 'upsert', !previousMenuIds.has(row.ID),
    ));
  saveDatabaseToDisk();
  return { copied: sourceRows.length, targetDates };
}

export function replaceMenuDish(menuId: number, dish: Dish): void {
  if (!db) return;
  requirePermission('menu.write');
  const before = queryAll<MenuHeader>(`SELECT * FROM MENU WHERE ID = ${menuId}`)[0];
  if (!before) return;
  assertDateOpen(before.DATA);
  const invalidatedApprovals = queryAll<MenuApproval>(
    `SELECT * FROM MENU_APPROVALS WHERE MENU_DATE = '${esc(before.DATA)}'`
  );
  db.run(
    `UPDATE MENU
     SET ID_BLUDA = ?, NAME_BLUDA = ?, PORRDOK_SLEDOVANIR_BLUD = ?
     WHERE ID = ?`,
    [dish.ID, dish.NAME, dish.PORRDOK_SLEDOVANIR_BLUD || 1, menuId]
  );
  db.run(`DELETE FROM MENU_APPROVALS WHERE MENU_DATE = '${esc(before.DATA)}'`);
  recordAudit({
    action: 'update',
    entityType: 'menu',
    entityId: String(menuId),
    summary: `Страву «${before.NAME_BLUDA}» замінено на «${dish.NAME}»`,
    before,
    after: { ...before, ID_BLUDA: dish.ID, NAME_BLUDA: dish.NAME },
  });
  queueCurrentSyncEntity('menu_entry', String(menuId));
  invalidatedApprovals.forEach(row => queueCurrentSyncEntity(
    'menu_approval', String(row.ID), 'delete', false, { row },
  ));
  saveDatabaseToDisk();
}

export function getMenuApproval(date: string, institutionId = 1): MenuApproval | null {
  return queryAll<MenuApproval>(
    `SELECT * FROM MENU_APPROVALS
     WHERE MENU_DATE = '${esc(date)}' AND INSTITUTION_ID = ${institutionId}
     LIMIT 1`
  )[0] || null;
}

export function approveMenu(date: string, institutionId: number, checks: unknown): MenuApproval {
  if (!db) throw new Error('Базу даних не ініціалізовано');
  requirePermission('menu.write');
  assertDateOpen(date);
  const currentUser = getCurrentUser();
  const before = getMenuApproval(date, institutionId);
  const approvedAt = new Date().toISOString();
  db.run(
    `INSERT OR REPLACE INTO MENU_APPROVALS
      (ID, MENU_DATE, INSTITUTION_ID, STATUS, APPROVED_AT, APPROVED_BY, CHECKS_JSON)
     VALUES (
       (SELECT ID FROM MENU_APPROVALS WHERE MENU_DATE = ? AND INSTITUTION_ID = ?),
       ?, ?, 'approved', ?, ?, ?
     )`,
    [
      date, institutionId, date, institutionId, approvedAt,
      currentUser.displayName, JSON.stringify(checks),
    ]
  );
  const approval = getMenuApproval(date, institutionId);
  if (!approval) throw new Error('Не вдалося затвердити меню');
  recordAudit({
    action: 'update',
    entityType: 'menu_approval',
    entityId: `${date}:${institutionId}`,
    summary: `Затверджено меню на ${date}`,
    after: approval,
  });
  queueCurrentSyncEntity('menu_approval', String(approval.ID), 'upsert', !before);
  saveDatabaseToDisk();
  return approval;
}

export function getDishCostProfiles(dishId: number): DishCostProfile[] {
  if (!db) return [];
  return queryAll<DishCostProfile>(`
    SELECT
      k.ID_BLUDA AS dishId,
      k.ID_KATEGORII_DETEJ AS categoryId,
      COALESCE(c.NAME, 'Категорія ' || k.ID_KATEGORII_DETEJ) AS categoryName,
      COALESCE(n.VYXOD_GR, b.VYXOD, 0) AS yieldGr,
      ROUND(SUM((COALESCE(k.GROSSO_GR, 0) / 1000.0) * COALESCE(p.CENA, 0)), 4) AS costPerPortion
    FROM KOMPONENTI_KARTOTEKI k
    JOIN KARTOTEKA_BLUD b ON b.ID = k.ID_BLUDA
    LEFT JOIN PRODUKTS p ON p.ID = k.ID_PRODUKTA
    LEFT JOIN KATEGORII_DETOK c ON c.ID = k.ID_KATEGORII_DETEJ
    LEFT JOIN TECH_CARD_NUTRITION n
      ON n.ID_BLUDA = k.ID_BLUDA AND n.ID_KATEGORII_DETEJ = k.ID_KATEGORII_DETEJ
    WHERE k.ID_BLUDA = ${dishId} AND COALESCE(k.IS_ALTERNATIVE, 0) = 0
    GROUP BY k.ID_BLUDA, k.ID_KATEGORII_DETEJ, c.NAME, n.VYXOD_GR, b.VYXOD
    ORDER BY k.ID_KATEGORII_DETEJ
  `);
}

function recordDishCostSnapshots(reason: string, sourceRef: string, dishIds?: number[]): number {
  if (!db) return 0;
  const ids = dishIds?.length
    ? Array.from(new Set(dishIds))
    : queryAll<{ ID: number }>('SELECT ID FROM KARTOTEKA_BLUD ORDER BY ID').map(row => row.ID);
  const now = new Date().toISOString();
  let inserted = 0;
  ids.forEach(dishId => {
    getDishCostProfiles(dishId).forEach(profile => {
      const latest = queryAll<{ COST_PER_PORTION: number }>(`
        SELECT COST_PER_PORTION
        FROM DISH_COST_HISTORY
        WHERE ID_BLUDA = ${dishId} AND ID_KATEGORII_DETEJ = ${profile.categoryId}
        ORDER BY CALCULATED_AT DESC, ID DESC
        LIMIT 1
      `)[0];
      if (!latest || Math.abs(Number(latest.COST_PER_PORTION) - profile.costPerPortion) >= 0.005) {
        db.run(
          `INSERT INTO DISH_COST_HISTORY
            (ID_BLUDA, ID_KATEGORII_DETEJ, COST_PER_PORTION, CALCULATED_AT, REASON, SOURCE_REF)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [dishId, profile.categoryId, profile.costPerPortion, now, reason, sourceRef]
        );
        inserted++;
      }
    });
  });
  return inserted;
}

function ensureInitialDishCostHistory(): void {
  if (!db) return;
  const count = Number(db.exec('SELECT COUNT(*) FROM DISH_COST_HISTORY')[0]?.values[0]?.[0] || 0);
  if (count === 0) recordDishCostSnapshots('Початковий розрахунок', 'system');
}

export function getDishCostHistory(dishId: number, limit = 40): DishCostHistoryEntry[] {
  return queryAll<DishCostHistoryEntry>(`
    SELECT h.*, c.NAME AS categoryName
    FROM DISH_COST_HISTORY h
    LEFT JOIN KATEGORII_DETOK c ON c.ID = h.ID_KATEGORII_DETEJ
    WHERE h.ID_BLUDA = ${dishId}
    ORDER BY h.CALCULATED_AT DESC, h.ID DESC
    LIMIT ${Math.max(1, Math.min(200, Math.floor(limit)))}
  `);
}

export function registerDocument(
  documentType: string,
  periodFrom: string,
  periodTo: string
): DocumentRegistryEntry {
  if (!db) throw new Error('Базу даних не ініціалізовано');
  const prefix = documentType.replace(/[^A-Za-zА-Яа-яІіЇїЄєҐґ0-9]/g, '').slice(0, 4).toUpperCase() || 'DOC';
  const year = periodFrom.slice(0, 4);
  const count = Number(
    db.exec(
      `SELECT COUNT(*) FROM DOCUMENT_REGISTRY
       WHERE DOCUMENT_TYPE = '${esc(documentType)}'
         AND substr(PERIOD_FROM, 1, 4) = '${esc(year)}'`
    )[0]?.values[0]?.[0] || 0
  );
  const documentNumber = `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
  const createdAt = new Date().toISOString();
  const createdBy = getCurrentUser().displayName;
  db.run(
    `INSERT INTO DOCUMENT_REGISTRY
      (DOCUMENT_TYPE, DOCUMENT_NUMBER, PERIOD_FROM, PERIOD_TO, CREATED_AT, CREATED_BY)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [documentType, documentNumber, periodFrom, periodTo, createdAt, createdBy]
  );
  saveDatabaseToDisk();
  return queryAll<DocumentRegistryEntry>(
    'SELECT * FROM DOCUMENT_REGISTRY ORDER BY ID DESC LIMIT 1'
  )[0];
}

export function getDocumentRegistry(limit = 100): DocumentRegistryEntry[] {
  return queryAll<DocumentRegistryEntry>(`
    SELECT * FROM DOCUMENT_REGISTRY
    ORDER BY CREATED_AT DESC, ID DESC
    LIMIT ${Math.max(1, Math.min(500, Math.floor(limit)))}
  `);
}

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
  const invalidatedApprovals = queryAll<MenuApproval>(
    `SELECT * FROM MENU_APPROVALS WHERE MENU_DATE = '${esc(date)}'`
  );
  db.run(`INSERT INTO MENU (ID_ZOY, DATA, ID_BLUDA, NAME_BLUDA, MEAL_TYPE)
     VALUES (1, '${date}', ${dishId}, '${esc(dishName)}', '${esc(mealType)}')`);
  db.run(`DELETE FROM MENU_APPROVALS WHERE MENU_DATE = '${esc(date)}'`);
  const id = String(db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] || '');
  recordAudit({
    action: 'create',
    entityType: 'menu',
    entityId: id,
    summary: `Додано страву «${dishName}» до меню на ${date} (${mealType})`,
    after: { date, dishId, dishName, mealType },
  });
  queueCurrentSyncEntity('menu_entry', id, 'upsert', true);
  invalidatedApprovals.forEach(row => queueCurrentSyncEntity(
    'menu_approval', String(row.ID), 'delete', false, { row },
  ));
  saveDatabaseToDisk();
}

export function deleteMenuEntry(id: number) {
  if (!db) return;
  requirePermission('menu.write');
  const before = queryAll<MenuHeader>(`SELECT * FROM MENU WHERE ID = ${id}`)[0];
  if (!before) return;
  assertDateOpen(before.DATA);
  const invalidatedApprovals = queryAll<MenuApproval>(
    `SELECT * FROM MENU_APPROVALS WHERE MENU_DATE = '${esc(before.DATA)}'`
  );
  archiveRecord({
    entityType: 'menu',
    entityId: String(id),
    label: `${before.DATA}: ${before.NAME_BLUDA}`,
    payload: before,
  });
  queueCurrentSyncEntity(
    'menu_entry', String(id), 'delete', false,
    { row: before, dishSyncId: ensureSyncMetadata('dish', String(before.ID_BLUDA)).SYNC_ID },
  );
  db.run(`DELETE FROM MENU WHERE ID = ${id}`);
  db.run(`DELETE FROM MENU_APPROVALS WHERE MENU_DATE = '${esc(before.DATA)}'`);
  invalidatedApprovals.forEach(row => queueCurrentSyncEntity(
    'menu_approval', String(row.ID), 'delete', false, { row },
  ));
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
    summary: `Створено продукт «${p.NAME}»`,
    after: p,
  });
  queueCurrentSyncEntity('product', String(id), 'upsert', true);
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
    summary: `Змінено продукт «${p.NAME}»`,
    before,
    after: p,
  });
  queueCurrentSyncEntity('product', String(p.ID));
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
  queueCurrentSyncEntity('product', String(id), 'delete', false, { row: before });
  db.run(`DELETE FROM PRODUKTS WHERE ID = ${id}`);
  saveDatabaseToDisk();
}

export function addDish(d: Partial<Dish>): number {
  if (!db) return 0;
  requirePermission('recipes.write');
  db.run(`INSERT INTO KARTOTEKA_BLUD
      (NAME, NOTES, ID_GRUPPI_BLUD, VYXOD, BELKI, ZIRI, UGLEVODI, KALORII,
       PORRDOK_SLEDOVANIR_BLUD, SOURCE_FILE, SOURCE_FORMAT, SOURCE_REF, ALLERGENS,
       QUALITY_REQUIREMENTS, STORAGE_CONDITIONS, SERVING_METHOD, DISH_CHARACTERISTICS)
     VALUES ('${esc(d.NAME!)}', '${esc(d.NOTES || '')}', ${d.ID_GRUPPI_BLUD || 1},
             ${d.VYXOD || 0}, ${d.BELKI || 0}, ${d.ZIRI || 0}, ${d.UGLEVODI || 0}, ${d.KALORII || 0},
             ${d.PORRDOK_SLEDOVANIR_BLUD || 0}, '${esc(d.SOURCE_FILE || '')}', '${esc(d.SOURCE_FORMAT || '')}',
             '${esc(d.SOURCE_REF || '')}', '${esc(d.ALLERGENS || '')}', '${esc(d.QUALITY_REQUIREMENTS || '')}',
             '${esc(d.STORAGE_CONDITIONS || '')}', '${esc(d.SERVING_METHOD || '')}', '${esc(d.DISH_CHARACTERISTICS || '')}')`);
  const id = Number(db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] || 0);
  recordAudit({
    action: 'create',
    entityType: 'dish',
    entityId: String(id),
    summary: `Створено страву «${d.NAME}»`,
    after: d,
  });
  queueCurrentSyncEntity('dish', String(id), 'upsert', true);
  saveDatabaseToDisk();
  return id;
}

export function updateDish(d: Dish) {
  if (!db) return;
  requirePermission('recipes.write');
  const before = queryAll<Dish>(`SELECT * FROM KARTOTEKA_BLUD WHERE ID = ${d.ID}`)[0];
  db.run(`UPDATE KARTOTEKA_BLUD SET NAME='${esc(d.NAME)}', NOTES='${esc(d.NOTES || '')}',
       ID_GRUPPI_BLUD=${d.ID_GRUPPI_BLUD}, VYXOD=${d.VYXOD}, BELKI=${d.BELKI},
       ZIRI=${d.ZIRI}, UGLEVODI=${d.UGLEVODI}, KALORII=${d.KALORII},
       PORRDOK_SLEDOVANIR_BLUD=${d.PORRDOK_SLEDOVANIR_BLUD || 0},
       SOURCE_FILE='${esc(d.SOURCE_FILE || '')}', SOURCE_FORMAT='${esc(d.SOURCE_FORMAT || '')}',
       SOURCE_REF='${esc(d.SOURCE_REF || '')}', ALLERGENS='${esc(d.ALLERGENS || '')}',
       QUALITY_REQUIREMENTS='${esc(d.QUALITY_REQUIREMENTS || '')}',
       STORAGE_CONDITIONS='${esc(d.STORAGE_CONDITIONS || '')}',
       SERVING_METHOD='${esc(d.SERVING_METHOD || '')}',
       DISH_CHARACTERISTICS='${esc(d.DISH_CHARACTERISTICS || '')}'
     WHERE ID = ${d.ID}`);
  recordAudit({
    action: 'update',
    entityType: 'dish',
    entityId: String(d.ID),
    summary: `Змінено страву «${d.NAME}»`,
    before,
    after: d,
  });
  queueCurrentSyncEntity('dish', String(d.ID));
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
  const profiles = queryAll<RecipeNutritionProfile>(`SELECT * FROM TECH_CARD_NUTRITION WHERE ID_BLUDA = ${id}`);
  components.forEach(component => queueCurrentSyncEntity(
    'recipe_component', String(component.ID), 'delete', false,
    buildSyncPayload('recipe_component', String(component.ID)),
  ));
  profiles.forEach(profile => {
    const localId = `${profile.ID_BLUDA}:${profile.ID_KATEGORII_DETEJ}`;
    queueCurrentSyncEntity(
      'dish_nutrition_profile', localId, 'delete', false,
      buildSyncPayload('dish_nutrition_profile', localId),
    );
  });
  queueCurrentSyncEntity('dish', String(id), 'delete', false, { row: dish });
  db.run(`DELETE FROM KARTOTEKA_BLUD WHERE ID = ${id}`);
  db.run(`DELETE FROM KOMPONENTI_KARTOTEKI WHERE ID_BLUDA = ${id}`);
  db.run(`DELETE FROM TECH_CARD_NUTRITION WHERE ID_BLUDA = ${id}`);
  saveDatabaseToDisk();
}

export function addRecipeComponent(c: Partial<RecipeComponent>) {
  if (!db) return;
  requirePermission('recipes.write');
  db.run(`INSERT INTO KOMPONENTI_KARTOTEKI
      (ID_BLUDA, ID_PRODUKTA, ID_KATEGORII_DETEJ, GROSSO_GR, NETTO_GR,
       NOMER_ID_LINII_V_TABLICE, SOURCE_NAME, ALLERGENS, QUALITY_REQUIREMENTS, IS_ALTERNATIVE)
     VALUES (${c.ID_BLUDA}, ${c.ID_PRODUKTA}, ${c.ID_KATEGORII_DETEJ || 1},
             ${c.GROSSO_GR || 0}, ${c.NETTO_GR || 0}, ${c.NOMER_ID_LINII_V_TABLICE || 0},
             '${esc(c.SOURCE_NAME || '')}', '${esc(c.ALLERGENS || '')}',
             '${esc(c.QUALITY_REQUIREMENTS || '')}', ${c.IS_ALTERNATIVE ? 1 : 0})`);
  const id = String(db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] || '');
  recordAudit({
    action: 'create',
    entityType: 'recipe_component',
    entityId: id,
    summary: `Додано компонент рецептури для страви №${c.ID_BLUDA}`,
    after: c,
  });
  queueCurrentSyncEntity('recipe_component', id, 'upsert', true);
  saveDatabaseToDisk();
}

export function updateRecipeComponent(c: RecipeComponent) {
  if (!db) return;
  requirePermission('recipes.write');
  const before = queryAll<RecipeComponent>(`SELECT * FROM KOMPONENTI_KARTOTEKI WHERE ID = ${c.ID}`)[0];
  if (!before) return;
  db.run(`UPDATE KOMPONENTI_KARTOTEKI SET
      ID_PRODUKTA=${c.ID_PRODUKTA}, ID_KATEGORII_DETEJ=${c.ID_KATEGORII_DETEJ},
      GROSSO_GR=${c.GROSSO_GR || 0}, NETTO_GR=${c.NETTO_GR || 0},
      NOMER_ID_LINII_V_TABLICE=${c.NOMER_ID_LINII_V_TABLICE || 0},
      SOURCE_NAME='${esc(c.SOURCE_NAME || '')}', ALLERGENS='${esc(c.ALLERGENS || '')}',
      QUALITY_REQUIREMENTS='${esc(c.QUALITY_REQUIREMENTS || '')}',
      IS_ALTERNATIVE=${c.IS_ALTERNATIVE ? 1 : 0}
    WHERE ID=${c.ID}`);
  recordAudit({
    action: 'update',
    entityType: 'recipe_component',
    entityId: String(c.ID),
    summary: `Змінено компонент рецептури для страви №${c.ID_BLUDA}`,
    before,
    after: c,
  });
  queueCurrentSyncEntity('recipe_component', String(c.ID));
  saveDatabaseToDisk();
}

export function upsertDishNutritionProfile(profile: Omit<RecipeNutritionProfile, 'ID'> & { ID?: number }) {
  if (!db) return;
  requirePermission('recipes.write');
  const before = queryAll<RecipeNutritionProfile>(`
    SELECT * FROM TECH_CARD_NUTRITION
    WHERE ID_BLUDA=${profile.ID_BLUDA} AND ID_KATEGORII_DETEJ=${profile.ID_KATEGORII_DETEJ}
  `)[0];
  db.run(`INSERT INTO TECH_CARD_NUTRITION
      (ID_BLUDA, ID_KATEGORII_DETEJ, VYXOD_GR, BELKI, ZIRI, UGLEVODI, KALORII)
    VALUES (${profile.ID_BLUDA}, ${profile.ID_KATEGORII_DETEJ}, ${profile.VYXOD_GR || 0},
      ${profile.BELKI || 0}, ${profile.ZIRI || 0}, ${profile.UGLEVODI || 0}, ${profile.KALORII || 0})
    ON CONFLICT(ID_BLUDA, ID_KATEGORII_DETEJ) DO UPDATE SET
      VYXOD_GR=excluded.VYXOD_GR, BELKI=excluded.BELKI, ZIRI=excluded.ZIRI,
      UGLEVODI=excluded.UGLEVODI, KALORII=excluded.KALORII`);
  recordAudit({
    action: before ? 'update' : 'create',
    entityType: 'dish_nutrition_profile',
    entityId: `${profile.ID_BLUDA}:${profile.ID_KATEGORII_DETEJ}`,
    summary: `${before ? 'Змінено' : 'Створено'} харчовий профіль страви №${profile.ID_BLUDA}`,
    before,
    after: profile,
  });
  const nutritionLocalId = `${profile.ID_BLUDA}:${profile.ID_KATEGORII_DETEJ}`;
  queueCurrentSyncEntity('dish_nutrition_profile', nutritionLocalId, 'upsert', !before);
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
    label: `Компонент рецептури №${id}`,
    payload: before,
  });
  queueCurrentSyncEntity(
    'recipe_component', String(id), 'delete', false,
    buildSyncPayload('recipe_component', String(id)),
  );
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
    summary: `Змінено реквізити закладу «${inst.name}»`,
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
    summary: `Створено профіль закладу «${inst.name}»`,
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
    summary: `Створено постачальника «${firm.NAME}»`,
    after: firm,
  });
  queueCurrentSyncEntity('supplier', id, 'upsert', true);
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
    summary: `Змінено постачальника «${firm.NAME}»`,
    before,
    after: firm,
  });
  queueCurrentSyncEntity('supplier', String(firm.ID));
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
  queueCurrentSyncEntity('supplier', String(id));
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

  const affectedProductIds = Array.from(new Set(items.map(item => item.productId)));
  const affectedDishIds = affectedProductIds.length
    ? queryAll<{ ID_BLUDA: number }>(`
        SELECT DISTINCT ID_BLUDA
        FROM KOMPONENTI_KARTOTEKI
        WHERE ID_PRODUKTA IN (${affectedProductIds.join(',')})
      `).map(row => row.ID_BLUDA)
    : [];
  recordDishCostSnapshots('Нова приходна накладна', `${nomerDoc} від ${dateStr}`, affectedDishIds);

  recordAudit({
    action: 'create',
    entityType: 'invoice',
    entityId: String(invoiceId),
    summary: `Створено прибуткову накладну «${nomerDoc}» від ${dateStr}`,
    after: { nomerDoc, dateStr, firmId, totalSum, items },
  });
  queueCurrentSyncEntity('invoice', String(invoiceId), 'upsert', true);
  queryAll<StockBatch>(`SELECT * FROM PARTII_NOW WHERE ID_NAKLADNOJ = ${invoiceId}`)
    .forEach(batch => queueCurrentSyncEntity('stock_batch', String(batch.ID), 'upsert', true));
  affectedProductIds.forEach(productId => queueCurrentSyncEntity('product', String(productId)));
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
    summary: `Змінено складську партію №${id}`,
    before,
    after: { ostKg, cena, srokGodnosti },
  });
  queueCurrentSyncEntity('stock_batch', String(id));
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
  queueCurrentSyncEntity(
    'stock_batch', String(id), 'delete', false,
    buildSyncPayload('stock_batch', String(id)),
  );
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
  batches.forEach(batch => queueCurrentSyncEntity(
    'stock_batch', String(batch.ID), 'delete', false,
    buildSyncPayload('stock_batch', String(batch.ID)),
  ));
  queueCurrentSyncEntity(
    'invoice', String(id), 'delete', false,
    buildSyncPayload('invoice', String(id)),
  );
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
    summary: `Проведено FIFO-списання за ${operationDate}: ${deductedCount} партій`,
    before: requirements,
    after: { deductions: auditDeductions, warnings },
  });
  Array.from(new Set(auditDeductions.map(item => item.batchId)))
    .forEach(batchId => queueCurrentSyncEntity('stock_batch', String(batchId)));
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
  queueCurrentSyncEntity('property_item', String(saved?.ID || ''), 'upsert', !item.ID);
  recordAudit({
    action: item.ID ? 'update' : 'create',
    entityType: 'property_item',
    entityId: String(saved?.ID || ''),
    summary: `${item.ID ? 'Змінено' : 'Створено'} майно «${item.NAME}»`,
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
  queueCurrentSyncEntity('property_item', String(id), 'delete', false, before as unknown as Record<string, unknown>);
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
  queueCurrentSyncEntity('property_writeoff', String(newId), 'upsert', true);
  queueCurrentSyncEntity('property_item', String(data.PROPERTY_ID), 'upsert', false);
  recordAudit({
    action: 'create',
    entityType: 'property_writeoff',
    entityId: String(newId),
    summary: `Оформлено списання «${data.PROPERTY_NAME}», кількість: ${data.QUANTITY}`,
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
  queueCurrentSyncEntity('property_writeoff', String(id), 'delete', false, target as unknown as Record<string, unknown>);

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
  queueCurrentSyncEntity('property_item', String(target.PROPERTY_ID), 'upsert', false);
  return { items: updatedItems, writeOffs: updatedWriteOffs };
}

// -----------------------------------------------------------------
// SHARED CADRES & GROUPS & CHILDREN STORE
// -----------------------------------------------------------------
const INITIAL_GROUPS: SadokGroup[] = [
  { ID: 1, NUMBER: '1', NAME: 'Група «Сонечко»', AGE_CATEGORY: 'Ясла (1-3 роки)', ROOM_NUMBER: '101', TEACHER_NAME: 'Коваль Олена Іванівна', CHILDREN_COUNT: 25 },
  { ID: 2, NUMBER: '2', NAME: 'Група «Казка»', AGE_CATEGORY: 'Молодша (3-4 роки)', ROOM_NUMBER: '102', TEACHER_NAME: 'Ткаченко Марія Василівна', CHILDREN_COUNT: 30 },
  { ID: 3, NUMBER: '3', NAME: 'Група «Ясочка»', AGE_CATEGORY: 'Середня (4-5 років)', ROOM_NUMBER: '103', TEACHER_NAME: 'Лисенко Ірина Петрівна', CHILDREN_COUNT: 28 },
  { ID: 4, NUMBER: '4', NAME: 'Група «Барвінок»', AGE_CATEGORY: 'Старша (5-7 років)', ROOM_NUMBER: '104', TEACHER_NAME: 'Петренко Олексій Сергійович', CHILDREN_COUNT: 26 },
  { ID: 5, NUMBER: '5', NAME: 'Музична зала', AGE_CATEGORY: 'Спеціалізоване приміщення', ROOM_NUMBER: '201', TEACHER_NAME: 'Мельник Тетяна Григорівна', CHILDREN_COUNT: 0 },
  { ID: 6, NUMBER: '6', NAME: 'Харчоблок', AGE_CATEGORY: 'Виробниче приміщення', ROOM_NUMBER: '100', TEACHER_NAME: 'Петренко Світлана Миколаївна', CHILDREN_COUNT: 0 },
  { ID: 7, NUMBER: '7', NAME: 'Методичний кабінет', AGE_CATEGORY: 'Адміністрація', ROOM_NUMBER: '202', TEACHER_NAME: 'Суміна Наталія Євгенівна', CHILDREN_COUNT: 0 },
  { ID: 8, NUMBER: '8', NAME: 'Територія ДНЗ', AGE_CATEGORY: 'Благоустрій', ROOM_NUMBER: 'Двір', TEACHER_NAME: 'Сидоренко Василь Петрович', CHILDREN_COUNT: 0 }
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
    DIET_NOTES: 'Без алергічних обмежень.',
    ACCESS_PIN: '145-1011'
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
    DIET_NOTES: 'Обмеження: безмолочна дієта (лактозна непереносимість).',
    ACCESS_PIN: '145-2022'
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
    PARENT_PHONE: '(050) 333-44-55',
    ACCESS_PIN: '145-3033'
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
    DEPARTURE_REASON: 'Зміна місця проживання родини',
    ACCESS_PIN: '145-4044'
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
    updated = [{ 
      ID: newId, 
      NUMBER: group.NUMBER || group.GROUP_NUMBER || '', 
      NAME: group.NAME, 
      AGE_CATEGORY: group.AGE_CATEGORY || 'Молодша (3-4 роки)', 
      ROOM_NUMBER: group.ROOM_NUMBER || '', 
      TEACHER_NAME: group.TEACHER_NAME || '', 
      CHILDREN_COUNT: group.CHILDREN_COUNT || 0 
    }, ...current];
  }
  localStorage.setItem('sadok_groups', JSON.stringify(updated));
  const saved = group.ID ? updated.find(item => item.ID === group.ID) : updated[0];
  queueCurrentSyncEntity('group', String(saved?.ID || ''), 'upsert', !group.ID);
  recordAudit({
    action: group.ID ? 'update' : 'create',
    entityType: 'group',
    entityId: String(saved?.ID || ''),
    summary: `${group.ID ? 'Змінено' : 'Створено'} групу «${group.NAME}»`,
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
  queueCurrentSyncEntity('group', String(id), 'delete', false, before as unknown as Record<string, unknown>);
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
  queueCurrentSyncEntity('employee', String(saved?.ID || ''), 'upsert', !emp.ID);
  recordAudit({
    action: emp.ID ? 'update' : 'create',
    entityType: 'employee',
    entityId: String(saved?.ID || ''),
    summary: `${emp.ID ? 'Змінено' : 'Створено'} працівника «${emp.FULL_NAME}»`,
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
  queueCurrentSyncEntity('employee', String(id), 'delete', false, before as unknown as Record<string, unknown>);
  const updated = current.filter(e => e.ID !== id);
  localStorage.setItem('sadok_employees', JSON.stringify(updated));
  return updated;
}

export function getChildren(): SadokChild[] {
  if (typeof localStorage === 'undefined') {
    return INITIAL_CHILDREN;
  }
  const saved = localStorage.getItem('sadok_children');
  let list: SadokChild[] = INITIAL_CHILDREN;
  if (saved) {
    try {
      list = JSON.parse(saved);
    } catch (_) {
      list = INITIAL_CHILDREN;
    }
  }
  // Ensure every child has a valid ACCESS_PIN
  let changed = false;
  const hydrated = list.map(c => {
    if (!c.ACCESS_PIN) {
      changed = true;
      return { ...c, ACCESS_PIN: `145-${(1000 + (c.ID || 1) * 101).toString()}` };
    }
    return c;
  });
  if (changed || !saved) {
    localStorage.setItem('sadok_children', JSON.stringify(hydrated));
  }
  return hydrated;
}

export function getChildById(id: number): SadokChild | null {
  return getChildren().find(c => c.ID === id) || null;
}

export function getChildByPin(pin: string): SadokChild | null {
  if (!pin) return null;
  const cleanPin = pin.trim().toUpperCase().replace(/\s+/g, '');
  const children = getChildren();
  return children.find(c => {
    const childPin = (c.ACCESS_PIN || `145-${(1000 + c.ID * 101).toString()}`).toUpperCase().replace(/\s+/g, '');
    return childPin === cleanPin;
  }) || null;
}

export function saveChild(child: Partial<SadokChild> & { FULL_NAME: string }): SadokChild[] {
  requirePermission('registry.write');
  const current = getChildren();
  const before = child.ID ? current.find(item => item.ID === child.ID) : undefined;
  let updated: SadokChild[];
  if (child.ID) {
    const existing = current.find(c => c.ID === child.ID);
    const pin = child.ACCESS_PIN || existing?.ACCESS_PIN || `145-${(1000 + child.ID * 101).toString()}`;
    updated = current.map(c => c.ID === child.ID ? { ...c, ...child, ACCESS_PIN: pin } as SadokChild : c);
  } else {
    const newId = current.length > 0 ? Math.max(...current.map(c => c.ID)) + 1 : 1;
    const pin = child.ACCESS_PIN || `145-${(1000 + newId * 101).toString()}`;
    updated = [{ 
      ID: newId, 
      FULL_NAME: child.FULL_NAME, 
      BIRTH_DATE: child.BIRTH_DATE || '2022-01-01', 
      GROUP_NAME: child.GROUP_NAME || 'Група «Сонечко»', 
      PARENT_NAME: child.PARENT_NAME || '', 
      PARENT_PHONE: child.PARENT_PHONE || '', 
      STATUS: child.STATUS || 'Навчається', 
      HEALTH_NOTES: child.HEALTH_NOTES || '', 
      PSYCHOLOGY_NOTES: child.PSYCHOLOGY_NOTES || '',
      ACCESS_PIN: pin
    }, ...current];
  }
  localStorage.setItem('sadok_children', JSON.stringify(updated));
  const saved = child.ID ? updated.find(item => item.ID === child.ID) : updated[0];
  queueCurrentSyncEntity('child', String(saved?.ID || ''), 'upsert', !child.ID);
  recordAudit({
    action: child.ID ? 'update' : 'create',
    entityType: 'child',
    entityId: String(saved?.ID || ''),
    summary: `${child.ID ? 'Змінено' : 'Створено'} картку дитини «${child.FULL_NAME}»`,
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
  queueCurrentSyncEntity('child', String(id), 'delete', false, before as unknown as Record<string, unknown>);
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
      queueCurrentSyncEntity('menu_entry', String(payload.ID));
      break;
    case 'product':
      restoreSqlRow('PRODUKTS', payload);
      queueCurrentSyncEntity('product', String(payload.ID));
      break;
    case 'dish':
      restoreSqlRow('KARTOTEKA_BLUD', payload.dish);
      (payload.components || []).forEach((row: Record<string, unknown>) =>
        restoreSqlRow('KOMPONENTI_KARTOTEKI', row)
      );
      queueCurrentSyncEntity('dish', String(payload.dish.ID));
      (payload.components || []).forEach((row: Record<string, unknown>) =>
        queueCurrentSyncEntity('recipe_component', String(row.ID))
      );
      break;
    case 'recipe_component':
      restoreSqlRow('KOMPONENTI_KARTOTEKI', payload);
      queueCurrentSyncEntity('recipe_component', String(payload.ID));
      break;
    case 'institution':
      restoreSqlRow('SADIKI', payload.institution);
      break;
    case 'supplier':
      restoreSqlRow('FIRMI', { ...payload, DEL: 0 });
      queueCurrentSyncEntity('supplier', String(payload.ID));
      break;
    case 'stock_batch':
      restoreSqlRow('PARTII_NOW', payload);
      queueCurrentSyncEntity('stock_batch', String(payload.ID));
      break;
    case 'invoice':
      assertDateOpen(payload.invoice.DATA);
      restoreSqlRow('NAKLADNIE_PRIXODA', payload.invoice);
      (payload.batches || []).forEach((row: Record<string, unknown>) =>
        restoreSqlRow('PARTII_NOW', row)
      );
      queueCurrentSyncEntity('invoice', String(payload.invoice.ID));
      (payload.batches || []).forEach((row: Record<string, unknown>) =>
        queueCurrentSyncEntity('stock_batch', String(row.ID))
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
      throw new Error(`Відновлення типу «${archive.entityType}» поки не підтримується`);
  }

  markArchiveRestored(archiveId);
  saveDatabaseToDisk();
}

// -----------------------------------------------------------------
// PSYCHOLOGIST MODULE STORAGE & HELPERS
// -----------------------------------------------------------------

const INITIAL_PSYCHOLOGY_ADAPTATION: PsychologyAdaptationRecord[] = [
  {
    ID: 1,
    CHILD_ID: 1,
    CHILD_NAME: 'Петренко Тарас Іванович',
    GROUP_NAME: 'Група «Сонечко» (Молодша)',
    START_DATE: '2026-09-01',
    WEEK_NUMBER: 2,
    EMOTIONAL_STATE: 'Позитивний',
    ANXIETY_LEVEL: 'Низький',
    APPETITE: 'Хороший',
    SLEEP: 'Спокійний',
    SOCIAL_INTERACTION: 'Активна',
    ADAPTATION_LEVEL: 'Легка',
    RECOMMENDATIONS: 'Дитина добре адаптується, активно спілкується з однолітками.',
    UPDATED_AT: '2026-09-14'
  },
  {
    ID: 2,
    CHILD_ID: 2,
    CHILD_NAME: 'Коваленко Софія Олексіївна',
    GROUP_NAME: 'Група «Барвінок» (Ясельна)',
    START_DATE: '2026-09-01',
    WEEK_NUMBER: 1,
    EMOTIONAL_STATE: 'Нестійкий',
    ANXIETY_LEVEL: 'Середній',
    APPETITE: 'Вибірковий',
    SLEEP: 'Неспокійний',
    SOCIAL_INTERACTION: 'Пасивна',
    ADAPTATION_LEVEL: 'Середня',
    RECOMMENDATIONS: 'Рекомендовано скорочений час перебування на першому тижні, м’який режим.',
    UPDATED_AT: '2026-09-07'
  }
];

const INITIAL_SCHOOL_READINESS: SchoolReadinessAssessment[] = [
  {
    ID: 1,
    CHILD_ID: 3,
    CHILD_NAME: 'Шевченко Богдан Вікторович',
    GROUP_NAME: 'Група «Калинка» (Старша)',
    ASSESSMENT_DATE: '2026-04-15',
    AGE_YEARS: 6,
    MOTIVATIONAL_SCORE: 5,
    INTELLECTUAL_SCORE: 5,
    EMOTIONAL_VOLITIONAL_SCORE: 4,
    SOCIAL_SCORE: 5,
    TOTAL_SCORE: 19,
    READINESS_STATUS: 'Високий (Готовий до школи)',
    PSYCHOLOGIST_CONCLUSION: 'Дитина виявляє високу навчальну мотивацію, гарний рівень саморегуляції та мислення.',
    RECOMMENDATIONS_PARENTS: 'Підтримувати пізнавальний інтерес, читати разом книжки.',
    RECOMMENDATIONS_TEACHERS: 'Залучати до рольових та інтелектуальних ігор у групі.'
  }
];

const INITIAL_PSYCHOLOGY_CONSULTATIONS: PsychologyConsultation[] = [
  {
    ID: 1,
    DATE: '2026-09-10',
    TYPE: 'Консультація з батьками',
    TARGET_NAME: 'Коваленко Олена (мати Коваленко Софії)',
    CHILD_ID: 2,
    GROUP_NAME: 'Група «Барвінок»',
    TOPIC: 'Особливості адаптації дитини ясельного віку',
    SUMMARY_NOTES: 'Окреслено режим дня вдома та в ЗДО, обговорено реакцію дитини на розлуку.',
    RECOMMENDATIONS: 'Приносити улюблену іграшку з дому, дотримуватися єдиного ритуалу прощання.',
    STATUS: 'Проведено'
  },
  {
    ID: 2,
    DATE: '2026-09-18',
    TYPE: 'Консультація з вихователем',
    TARGET_NAME: 'Вихователі групи «Калинка»',
    GROUP_NAME: 'Група «Калинка»',
    TOPIC: 'Результати первинного моніторингу готовності старших до школи',
    SUMMARY_NOTES: 'Презентовано зведений аналіз пізнавальної сфери вихованців.',
    RECOMMENDATIONS: 'Впровадити вправи на розвиток дрібної моторики та уваги.',
    STATUS: 'Проведено'
  }
];

// Adaptation Records
export function getPsychologyAdaptations(): PsychologyAdaptationRecord[] {
  const saved = localStorage.getItem('sadok_psychology_adaptations');
  if (saved) { try { return JSON.parse(saved); } catch (_) {} }
  localStorage.setItem('sadok_psychology_adaptations', JSON.stringify(INITIAL_PSYCHOLOGY_ADAPTATION));
  return INITIAL_PSYCHOLOGY_ADAPTATION;
}

export function savePsychologyAdaptation(rec: Partial<PsychologyAdaptationRecord> & { CHILD_ID: number; CHILD_NAME: string }): PsychologyAdaptationRecord[] {
  const current = getPsychologyAdaptations();
  let updated: PsychologyAdaptationRecord[];
  let savedId: number;
  if (rec.ID) {
    savedId = rec.ID;
    updated = current.map(item => item.ID === rec.ID ? { ...item, ...rec, UPDATED_AT: new Date().toISOString().split('T')[0] } as PsychologyAdaptationRecord : item);
  } else {
    savedId = current.length > 0 ? Math.max(...current.map(item => item.ID)) + 1 : 1;
    const newRecord: PsychologyAdaptationRecord = {
      ID: savedId,
      CHILD_ID: rec.CHILD_ID,
      CHILD_NAME: rec.CHILD_NAME,
      GROUP_NAME: rec.GROUP_NAME || 'Група «Сонечко»',
      START_DATE: rec.START_DATE || new Date().toISOString().split('T')[0],
      WEEK_NUMBER: rec.WEEK_NUMBER || 1,
      EMOTIONAL_STATE: rec.EMOTIONAL_STATE || 'Позитивний',
      ANXIETY_LEVEL: rec.ANXIETY_LEVEL || 'Низький',
      APPETITE: rec.APPETITE || 'Хороший',
      SLEEP: rec.SLEEP || 'Спокійний',
      SOCIAL_INTERACTION: rec.SOCIAL_INTERACTION || 'Активна',
      ADAPTATION_LEVEL: rec.ADAPTATION_LEVEL || 'Легка',
      RECOMMENDATIONS: rec.RECOMMENDATIONS || '',
      UPDATED_AT: new Date().toISOString().split('T')[0]
    };
    updated = [newRecord, ...current];
  }
  localStorage.setItem('sadok_psychology_adaptations', JSON.stringify(updated));
  queueCurrentSyncEntity('psychology_adaptation', String(savedId), 'upsert', !rec.ID);
  return updated;
}

export function deletePsychologyAdaptation(id: number): PsychologyAdaptationRecord[] {
  const current = getPsychologyAdaptations();
  const target = current.find(item => item.ID === id);
  queueCurrentSyncEntity('psychology_adaptation', String(id), 'delete', false, target as unknown as Record<string, unknown>);
  const updated = current.filter(item => item.ID !== id);
  localStorage.setItem('sadok_psychology_adaptations', JSON.stringify(updated));
  return updated;
}

// School Readiness Assessments
export function getSchoolReadinessAssessments(): SchoolReadinessAssessment[] {
  const saved = localStorage.getItem('sadok_school_readiness');
  if (saved) { try { return JSON.parse(saved); } catch (_) {} }
  localStorage.setItem('sadok_school_readiness', JSON.stringify(INITIAL_SCHOOL_READINESS));
  return INITIAL_SCHOOL_READINESS;
}

export function saveSchoolReadinessAssessment(rec: Partial<SchoolReadinessAssessment> & { CHILD_ID: number; CHILD_NAME: string }): SchoolReadinessAssessment[] {
  const current = getSchoolReadinessAssessments();
  let updated: SchoolReadinessAssessment[];
  let savedId: number;
  const total = (rec.MOTIVATIONAL_SCORE || 5) + (rec.INTELLECTUAL_SCORE || 5) + (rec.EMOTIONAL_VOLITIONAL_SCORE || 5) + (rec.SOCIAL_SCORE || 5);
  let status: SchoolReadinessAssessment['READINESS_STATUS'] = 'Високий (Готовий до школи)';
  if (total < 10) status = 'Низький (Не готовий)';
  else if (total < 14) status = 'Потребує додаткового супроводу';
  else if (total < 17) status = 'Достатній (Переважно готовий)';

  if (rec.ID) {
    savedId = rec.ID;
    updated = current.map(item => item.ID === rec.ID ? {
      ...item,
      ...rec,
      TOTAL_SCORE: total,
      READINESS_STATUS: status
    } as SchoolReadinessAssessment : item);
  } else {
    savedId = current.length > 0 ? Math.max(...current.map(item => item.ID)) + 1 : 1;
    const newRecord: SchoolReadinessAssessment = {
      ID: savedId,
      CHILD_ID: rec.CHILD_ID,
      CHILD_NAME: rec.CHILD_NAME,
      GROUP_NAME: rec.GROUP_NAME || 'Група «Калинка»',
      ASSESSMENT_DATE: rec.ASSESSMENT_DATE || new Date().toISOString().split('T')[0],
      AGE_YEARS: rec.AGE_YEARS || 6,
      MOTIVATIONAL_SCORE: rec.MOTIVATIONAL_SCORE || 5,
      INTELLECTUAL_SCORE: rec.INTELLECTUAL_SCORE || 5,
      EMOTIONAL_VOLITIONAL_SCORE: rec.EMOTIONAL_VOLITIONAL_SCORE || 5,
      SOCIAL_SCORE: rec.SOCIAL_SCORE || 5,
      TOTAL_SCORE: total,
      READINESS_STATUS: status,
      PSYCHOLOGIST_CONCLUSION: rec.PSYCHOLOGIST_CONCLUSION || 'Вікові норми розвитку відповідають нормі.',
      RECOMMENDATIONS_PARENTS: rec.RECOMMENDATIONS_PARENTS || '',
      RECOMMENDATIONS_TEACHERS: rec.RECOMMENDATIONS_TEACHERS || ''
    };
    updated = [newRecord, ...current];
  }
  localStorage.setItem('sadok_school_readiness', JSON.stringify(updated));
  queueCurrentSyncEntity('psychology_readiness', String(savedId), 'upsert', !rec.ID);
  return updated;
}

export function deleteSchoolReadinessAssessment(id: number): SchoolReadinessAssessment[] {
  const current = getSchoolReadinessAssessments();
  const target = current.find(item => item.ID === id);
  queueCurrentSyncEntity('psychology_readiness', String(id), 'delete', false, target as unknown as Record<string, unknown>);
  const updated = current.filter(item => item.ID !== id);
  localStorage.setItem('sadok_school_readiness', JSON.stringify(updated));
  return updated;
}

// Consultations Log
export function getPsychologyConsultations(): PsychologyConsultation[] {
  const saved = localStorage.getItem('sadok_psychology_consultations');
  if (saved) { try { return JSON.parse(saved); } catch (_) {} }
  localStorage.setItem('sadok_psychology_consultations', JSON.stringify(INITIAL_PSYCHOLOGY_CONSULTATIONS));
  return INITIAL_PSYCHOLOGY_CONSULTATIONS;
}

export function savePsychologyConsultation(rec: Partial<PsychologyConsultation> & { TARGET_NAME: string; TOPIC: string }): PsychologyConsultation[] {
  const current = getPsychologyConsultations();
  let updated: PsychologyConsultation[];
  let savedId: number;
  if (rec.ID) {
    savedId = rec.ID;
    updated = current.map(item => item.ID === rec.ID ? { ...item, ...rec } as PsychologyConsultation : item);
  } else {
    savedId = current.length > 0 ? Math.max(...current.map(item => item.ID)) + 1 : 1;
    const newRecord: PsychologyConsultation = {
      ID: savedId,
      DATE: rec.DATE || new Date().toISOString().split('T')[0],
      TYPE: rec.TYPE || 'Індивідуальна',
      TARGET_NAME: rec.TARGET_NAME,
      CHILD_ID: rec.CHILD_ID,
      GROUP_NAME: rec.GROUP_NAME,
      TOPIC: rec.TOPIC,
      SUMMARY_NOTES: rec.SUMMARY_NOTES || '',
      RECOMMENDATIONS: rec.RECOMMENDATIONS || '',
      STATUS: rec.STATUS || 'Проведено'
    };
    updated = [newRecord, ...current];
  }
  localStorage.setItem('sadok_psychology_consultations', JSON.stringify(updated));
  queueCurrentSyncEntity('psychology_consultation', String(savedId), 'upsert', !rec.ID);
  return updated;
}

export function deletePsychologyConsultation(id: number): PsychologyConsultation[] {
  const current = getPsychologyConsultations();
  const target = current.find(item => item.ID === id);
  queueCurrentSyncEntity('psychology_consultation', String(id), 'delete', false, target as unknown as Record<string, unknown>);
  const updated = current.filter(item => item.ID !== id);
  localStorage.setItem('sadok_psychology_consultations', JSON.stringify(updated));
  return updated;
}

// Summary Reports (Form 2.10 and others)
export const DEFAULT_FORM_210_CATEGORIES = [
  'Вихованці ясельних груп (1-3 роки)',
  'Вихованці молодших груп (3-4 роки)',
  'Вихованці середніх груп (4-5 років)',
  'Вихованці старших груп (5-6/7 років)',
  'Діти з особливими освітніми потребами (ООП / Інклюзія)',
  'Батьки або законні представники вихованців',
  'Педагогічні працівники ЗДО (вихователі, фахівці)'
];

export function generateDefaultReport210(academicYear = '2024/2025 н.р.'): PsychologySummaryReport {
  const rows: PsychologyReportRow[] = DEFAULT_FORM_210_CATEGORIES.map((catName, idx) => ({
    ID: `row_${idx + 1}`,
    CATEGORY_NAME: catName,
    INDIVIDUAL_DIAGNOSTICS: idx === 0 ? 12 : (idx === 1 ? 15 : (idx === 3 ? 24 : 5)),
    GROUP_DIAGNOSTICS: idx === 0 ? 0 : (idx === 3 ? 24 : 18),
    INDIVIDUAL_PROPHYLAXIS: idx === 5 ? 14 : 8,
    GROUP_PROPHYLAXIS: idx === 6 ? 12 : 25,
    INDIVIDUAL_CORRECTION: idx === 4 ? 6 : 4,
    GROUP_CORRECTION: idx === 3 ? 10 : 0,
    TRAININGS_SEMINARS: idx === 5 ? 30 : (idx === 6 ? 18 : 0),
    ROW_TOTAL: 0
  })).map(r => ({
    ...r,
    ROW_TOTAL: r.INDIVIDUAL_DIAGNOSTICS + r.GROUP_DIAGNOSTICS + r.INDIVIDUAL_PROPHYLAXIS + r.GROUP_PROPHYLAXIS + r.INDIVIDUAL_CORRECTION + r.GROUP_CORRECTION + r.TRAININGS_SEMINARS
  }));

  return {
    ID: 1,
    TITLE: '2.10. Зведені дані щодо роботи працівників психологічної служби',
    ACADEMIC_YEAR: academicYear,
    REPORT_TYPE: '2.10_SUMMARY',
    ROWS: rows,
    NOTES: 'Автоматично згенерований річний звіт психологічної служби ЗДО',
    CREATED_AT: new Date().toISOString().split('T')[0],
    UPDATED_AT: new Date().toISOString().split('T')[0]
  };
}

export function getPsychologySummaryReports(): PsychologySummaryReport[] {
  const saved = localStorage.getItem('sadok_psychology_summary_reports');
  if (saved) { try { return JSON.parse(saved); } catch (_) {} }
  const defaultReport = generateDefaultReport210('2024/2025 н.р.');
  const initial = [defaultReport];
  localStorage.setItem('sadok_psychology_summary_reports', JSON.stringify(initial));
  return initial;
}

export function savePsychologySummaryReport(report: Partial<PsychologySummaryReport> & { TITLE: string; ROWS: PsychologyReportRow[] }): PsychologySummaryReport[] {
  const current = getPsychologySummaryReports();
  let updated: PsychologySummaryReport[];
  
  // Recalculate row totals
  const processedRows = report.ROWS.map(r => ({
    ...r,
    ROW_TOTAL: (Number(r.INDIVIDUAL_DIAGNOSTICS) || 0) +
               (Number(r.GROUP_DIAGNOSTICS) || 0) +
               (Number(r.INDIVIDUAL_PROPHYLAXIS) || 0) +
               (Number(r.GROUP_PROPHYLAXIS) || 0) +
               (Number(r.INDIVIDUAL_CORRECTION) || 0) +
               (Number(r.GROUP_CORRECTION) || 0) +
               (Number(r.TRAININGS_SEMINARS) || 0)
  }));

  const existingIndex = report.ID ? current.findIndex(item => item.ID === report.ID) : -1;
  let savedId: number;

  if (existingIndex >= 0) {
    savedId = Number(report.ID);
    updated = current.map(item => item.ID === report.ID ? {
      ...item,
      ...report,
      ROWS: processedRows,
      UPDATED_AT: new Date().toISOString().split('T')[0]
    } as PsychologySummaryReport : item);
  } else {
    savedId = report.ID || (current.length > 0 ? Math.max(...current.map(item => item.ID)) + 1 : Date.now());
    const newRecord: PsychologySummaryReport = {
      ID: savedId,
      TITLE: report.TITLE,
      ACADEMIC_YEAR: report.ACADEMIC_YEAR || '2024/2025 н.р.',
      REPORT_TYPE: report.REPORT_TYPE || '2.10_SUMMARY',
      ROWS: processedRows,
      NOTES: report.NOTES || '',
      CREATED_AT: new Date().toISOString().split('T')[0],
      UPDATED_AT: new Date().toISOString().split('T')[0]
    };
    updated = [newRecord, ...current];
  }
  localStorage.setItem('sadok_psychology_summary_reports', JSON.stringify(updated));
  queueCurrentSyncEntity('psychology_report', String(savedId), 'upsert', existingIndex < 0);
  return updated;
}

export function deletePsychologySummaryReport(id: number): PsychologySummaryReport[] {
  const current = getPsychologySummaryReports();
  const target = current.find(item => item.ID === id);
  queueCurrentSyncEntity('psychology_report', String(id), 'delete', false, target as unknown as Record<string, unknown>);
  const updated = current.filter(item => item.ID !== id);
  localStorage.setItem('sadok_psychology_summary_reports', JSON.stringify(updated));
  return updated;
}

// -----------------------------------------------------------------
// PSYCHOLOGIST: ЖУРНАЛ ЩОДЕННОГО ОБЛІКУ РОБОТИ (МОН УКРАЇНИ)
// -----------------------------------------------------------------

const INITIAL_PSYCHOLOGY_DAILY_LOG: PsychologyDailyLogEntry[] = [
  {
    ID: 1,
    DATE: '2026-09-15',
    ACTIVITY_TYPE: 'Діагностична',
    CATEGORY: 'Діти',
    TARGET_NAME: 'Група «Сонечко» (Молодша)',
    GROUP_NAME: 'Група «Сонечко»',
    CONTENT_TOPIC: 'Первинна діагностика адаптації новоприбулих дітей до умов ЗДО (картки спостережень)',
    HOURS_SPENT: 2.5,
    RESULTS_NOTES: 'Обстежено 12 дітей. 9 дітей з легким рівнем, 3 із середнім. Надано поради вихователю.'
  },
  {
    ID: 2,
    DATE: '2026-09-15',
    ACTIVITY_TYPE: 'Корекційно-розвиткова',
    CATEGORY: 'Діти',
    TARGET_NAME: 'Бондаренко Артем (ООП)',
    CHILD_ID: 4,
    GROUP_NAME: 'Група «Калинка»',
    CONTENT_TOPIC: 'Індивідуальне корекційно-розвиткове заняття з розвитку емоційно-вольової сфери та сенсорної інтеграції',
    HOURS_SPENT: 1.5,
    RESULTS_NOTES: 'Позитивна динаміка взаємодії, дитина зосередилася на пісковій терапії та тактильних вправах.'
  },
  {
    ID: 3,
    DATE: '2026-09-16',
    ACTIVITY_TYPE: 'Консультаційна',
    CATEGORY: 'Батьки',
    TARGET_NAME: 'Коваленко О.М. (мати)',
    GROUP_NAME: 'Група «Барвінок»',
    CONTENT_TOPIC: 'Індивідуальна консультація: зниження тривожності дитини під час ранкового прощання та адаптація до ясел',
    HOURS_SPENT: 1.0,
    RESULTS_NOTES: 'Узгоджено спільний домашній ритуал прощання та адаптаційний графік.'
  },
  {
    ID: 4,
    DATE: '2026-09-16',
    ACTIVITY_TYPE: 'Просвітницька',
    CATEGORY: 'Педагоги',
    TARGET_NAME: 'Педагогічний колектив ЗДО №145',
    GROUP_NAME: 'Всі групи',
    CONTENT_TOPIC: 'Семінар-практикум: «Психологічна безпека та стабілізація дітей в укритті під час повітряної тривоги»',
    HOURS_SPENT: 2.0,
    RESULTS_NOTES: 'Опрацьовано техніку заземлення «5-4-3-2-1», дихальні вправи 4х4 та антистрес-ігри для укриття.'
  },
  {
    ID: 5,
    DATE: '2026-09-17',
    ACTIVITY_TYPE: 'Організаційно-методична',
    CATEGORY: 'Методична / Самоосвіта',
    TARGET_NAME: 'Кабінет практичного психолога',
    GROUP_NAME: 'Методичний блок',
    CONTENT_TOPIC: 'Оформлення індивідуальних карток психолого-педагогічного супроводу дітей ООП та ВПО, підготовка діагностичних бланків',
    HOURS_SPENT: 3.5,
    RESULTS_NOTES: 'Оновлено банк методик та протоколи спостережень на 2026/2027 н.р., сформовано графік консультацій.'
  },
  {
    ID: 6,
    DATE: '2026-09-17',
    ACTIVITY_TYPE: 'Корекційно-розвиткова',
    CATEGORY: 'Діти',
    TARGET_NAME: 'Сидоренко Владислав (ВПО)',
    CHILD_ID: 5,
    GROUP_NAME: 'Група «Сонечко»',
    CONTENT_TOPIC: 'Арт-терапевтичне заняття з подолання страхів та зниження рівня психоемоційного напруження',
    HOURS_SPENT: 1.5,
    RESULTS_NOTES: 'Зниження напруження, вираження тривожних переживань через малюнок фарбами.'
  }
];

export function getPsychologyDailyLogEntries(): PsychologyDailyLogEntry[] {
  const saved = localStorage.getItem('sadok_psychology_daily_logs');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (_) {}
  }
  localStorage.setItem('sadok_psychology_daily_logs', JSON.stringify(INITIAL_PSYCHOLOGY_DAILY_LOG));
  return INITIAL_PSYCHOLOGY_DAILY_LOG;
}

export function savePsychologyDailyLogEntry(rec: Partial<PsychologyDailyLogEntry> & {
  CONTENT_TOPIC: string;
  HOURS_SPENT: number;
  ACTIVITY_TYPE: PsychologyDailyActivityType;
}): PsychologyDailyLogEntry[] {
  const current = getPsychologyDailyLogEntries();
  let updated: PsychologyDailyLogEntry[];
  let savedId: number;

  if (rec.ID) {
    savedId = rec.ID;
    updated = current.map(item => item.ID === rec.ID ? { ...item, ...rec } as PsychologyDailyLogEntry : item);
  } else {
    savedId = current.length > 0 ? Math.max(...current.map(item => item.ID)) + 1 : 1;
    const newRecord: PsychologyDailyLogEntry = {
      ID: savedId,
      DATE: rec.DATE || new Date().toISOString().split('T')[0],
      ACTIVITY_TYPE: rec.ACTIVITY_TYPE,
      CATEGORY: rec.CATEGORY || 'Діти',
      TARGET_NAME: rec.TARGET_NAME || 'Вихованці ЗДО',
      CHILD_ID: rec.CHILD_ID,
      GROUP_NAME: rec.GROUP_NAME,
      CONTENT_TOPIC: rec.CONTENT_TOPIC,
      HOURS_SPENT: Number(rec.HOURS_SPENT) || 1,
      RESULTS_NOTES: rec.RESULTS_NOTES || '',
      CREATED_AT: new Date().toISOString().split('T')[0]
    };
    updated = [newRecord, ...current];
  }

  localStorage.setItem('sadok_psychology_daily_logs', JSON.stringify(updated));
  queueCurrentSyncEntity('psychology_daily_log', String(savedId), 'upsert', !rec.ID);
  return updated;
}

export function deletePsychologyDailyLogEntry(id: number): PsychologyDailyLogEntry[] {
  const current = getPsychologyDailyLogEntries();
  const target = current.find(item => item.ID === id);
  queueCurrentSyncEntity('psychology_daily_log', String(id), 'delete', false, target as unknown as Record<string, unknown>);
  const updated = current.filter(item => item.ID !== id);
  localStorage.setItem('sadok_psychology_daily_logs', JSON.stringify(updated));
  return updated;
}

// -----------------------------------------------------------------
// PSYCHOLOGIST: ПСИХОЛОГІЧНИЙ СУПРОВІД (ВОЄННИЙ СТАН, ООП, ВПО)
// -----------------------------------------------------------------

const INITIAL_PSYCHOLOGY_SPECIAL_SUPPORT: PsychologySpecialSupportEntry[] = [
  {
    ID: 1,
    CHILD_ID: 4,
    CHILD_NAME: 'Бондаренко Артем Олександрович',
    GROUP_NAME: 'Група «Калинка» (Старша)',
    CATEGORY: 'ООП (ІПР / Інклюзія)',
    DIAGNOSTIC_DATE: '2026-09-05',
    ANXIETY_SCORE: 3,
    STRESS_REACTION: 'Підвищена чутливість до гучних звуків, закриває вуха руками',
    SHELTER_BEHAVIOR: 'Потребує індивідуального супроводу асистента або психолога, має тактильну іграшку та навушники, перебуває в куточку спокою',
    INDIVIDUAL_PLAN: 'Індивідуальні корекційно-розвиткові заняття 2 рази на тиждень: сенсорне розвантаження, вправи на регуляцію уваги',
    DYNAMIC_STATUS: 'Стабільний стан',
    NOTES: 'ІПР погоджено з ІРЦ м. Кривого Рогу та затверджено командою психолого-педагогічного супроводу КЗДО №145.',
    UPDATED_AT: '2026-09-15'
  },
  {
    ID: 2,
    CHILD_ID: 5,
    CHILD_NAME: 'Сидоренко Владислав Юрійович',
    GROUP_NAME: 'Група «Сонечко» (Молодша)',
    CATEGORY: 'ВПО (Внутрішньо переміщені)',
    DIAGNOSTIC_DATE: '2026-09-08',
    ANXIETY_SCORE: 4,
    STRESS_REACTION: 'Здригається від різких сигналів та сирен, періодичний страх втратити батьків з поля зору',
    SHELTER_BEHAVIOR: 'В укритті перебуває поруч з вихователем, тримає за руку, заспокоюється казкотерапією та малюванням олівцями',
    INDIVIDUAL_PLAN: 'Психологічна стабілізація, вправи на подолання тривожності та створення внутрішньої безпеки («мій безпечний простір»)',
    DYNAMIC_STATUS: 'Позитивна динаміка',
    NOTES: 'Родина переїхала до Кривого Рогу із зони активних бойових дій. Мати відвідує консультації психолога.',
    UPDATED_AT: '2026-09-16'
  },
  {
    ID: 3,
    CHILD_ID: 6,
    CHILD_NAME: 'Мельник Дарина Тарасівна',
    GROUP_NAME: 'Група «Барвінок» (Ясельна)',
    CATEGORY: 'Діти військовослужбовців / УБД',
    DIAGNOSTIC_DATE: '2026-09-10',
    ANXIETY_SCORE: 3,
    STRESS_REACTION: 'Епізоди слізливого настрою при ранковому прийомі, часті згадки про тата',
    SHELTER_BEHAVIOR: 'Поводить себе організовано, допомагає вихователю роздавати розмальовки іншим дітям',
    INDIVIDUAL_PLAN: 'Емоційна підтримка, підтримка відчуття сімейної єдності, позитивне схвалення активності у групі',
    DYNAMIC_STATUS: 'Позитивна динаміка',
    NOTES: 'Батько служить у лавах Збройних Сил України. Здійснюється регулярний контакт із мамою.',
    UPDATED_AT: '2026-09-17'
  },
  {
    ID: 4,
    CHILD_ID: 7,
    CHILD_NAME: 'Ткаченко Максим Романович',
    GROUP_NAME: 'Група «Калинка» (Старша)',
    CATEGORY: 'Підвищена тривожність / Стрес',
    DIAGNOSTIC_DATE: '2026-09-12',
    ANXIETY_SCORE: 4,
    STRESS_REACTION: 'Тривожність при зміні режиму, поганий денний сон, занепокоєння під час тривог',
    SHELTER_BEHAVIOR: 'Схильний до моторного неспокою, бігає, заспокоюється при включенні аудіоказок або дихальних вправ',
    INDIVIDUAL_PLAN: 'Вправи на саморегуляцію, м\'язове розслаблення за Джекобсоном (дитячий адаптований варіант)',
    DYNAMIC_STATUS: 'Потребує посиленої уваги',
    NOTES: 'Рекомендовано консультацію дитячого невролога та дотримання спокійного вечірнього режиму вдома.',
    UPDATED_AT: '2026-09-16'
  }
];

export function getPsychologySpecialSupportEntries(): PsychologySpecialSupportEntry[] {
  const saved = localStorage.getItem('sadok_psychology_special_support');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (_) {}
  }
  localStorage.setItem('sadok_psychology_special_support', JSON.stringify(INITIAL_PSYCHOLOGY_SPECIAL_SUPPORT));
  return INITIAL_PSYCHOLOGY_SPECIAL_SUPPORT;
}

export function savePsychologySpecialSupportEntry(rec: Partial<PsychologySpecialSupportEntry> & {
  CHILD_ID: number;
  CHILD_NAME: string;
  CATEGORY: PsychologySpecialCategory;
}): PsychologySpecialSupportEntry[] {
  const current = getPsychologySpecialSupportEntries();
  let updated: PsychologySpecialSupportEntry[];
  let savedId: number;

  if (rec.ID) {
    savedId = rec.ID;
    updated = current.map(item => item.ID === rec.ID ? {
      ...item,
      ...rec,
      UPDATED_AT: new Date().toISOString().split('T')[0]
    } as PsychologySpecialSupportEntry : item);
  } else {
    savedId = current.length > 0 ? Math.max(...current.map(item => item.ID)) + 1 : 1;
    const newRecord: PsychologySpecialSupportEntry = {
      ID: savedId,
      CHILD_ID: rec.CHILD_ID,
      CHILD_NAME: rec.CHILD_NAME,
      GROUP_NAME: rec.GROUP_NAME || 'Група «Сонечко»',
      CATEGORY: rec.CATEGORY,
      DIAGNOSTIC_DATE: rec.DIAGNOSTIC_DATE || new Date().toISOString().split('T')[0],
      ANXIETY_SCORE: Number(rec.ANXIETY_SCORE) || 3,
      STRESS_REACTION: rec.STRESS_REACTION || 'Нормотипова реакція',
      SHELTER_BEHAVIOR: rec.SHELTER_BEHAVIOR || 'Спокійна, дотримується вказівок педагога',
      INDIVIDUAL_PLAN: rec.INDIVIDUAL_PLAN || 'Загальний психолого-педагогічний супровід',
      DYNAMIC_STATUS: rec.DYNAMIC_STATUS || 'Стабільний стан',
      NOTES: rec.NOTES || '',
      UPDATED_AT: new Date().toISOString().split('T')[0]
    };
    updated = [newRecord, ...current];
  }

  localStorage.setItem('sadok_psychology_special_support', JSON.stringify(updated));
  queueCurrentSyncEntity('psychology_special_support', String(savedId), 'upsert', !rec.ID);
  return updated;
}

export function deletePsychologySpecialSupportEntry(id: number): PsychologySpecialSupportEntry[] {
  const current = getPsychologySpecialSupportEntries();
  const target = current.find(item => item.ID === id);
  queueCurrentSyncEntity('psychology_special_support', String(id), 'delete', false, target as unknown as Record<string, unknown>);
  const updated = current.filter(item => item.ID !== id);
  localStorage.setItem('sadok_psychology_special_support', JSON.stringify(updated));
  return updated;
}

// -----------------------------------------------------------------
// PSYCHOLOGIST: БАНК ПАМ'ЯТОК ТА РЕКОМЕНДАЦІЙ ДЛЯ БАТЬКІВ І ПЕДАГОГІВ
// -----------------------------------------------------------------

export const PSYCHOLOGY_MEMOS: PsychologyMemo[] = [
  {
    id: 'memo_adaptation_nursery',
    title: 'М\'яка адаптація малюка до дитячого садка: практичні поради для батьків',
    targetAudience: 'Батькам',
    category: 'Адаптація',
    summary: 'Як допомогти дитині безболісно звикнути до ясельної або молодшої групи ЗДО, зберегти емоційну рівновагу та довіру до батьків.',
    tips: [
      'Поступове звикання: перші дні приводьте дитину лише на 1.5–2 години під час прогулянки або ранкових ігор.',
      'Позитивне налаштування вдома: розповідайте про садок як про цікаве та безпечне місце, де є друзі та нові іграшки.',
      'Ритуал швидкого прощання: домовтеся про коротке обіймання, поцілунок або «секретне потискання руки» і чітко скажіть, коли повернетеся (наприклад: «після денного сну»).',
      'Домашній талісман: дозвольте дитині взяти з собою улюблену м\'яку іграшку, хустинку або річ із запахом дому.',
      'Уникайте обману: ніколи не тікайте потайки, поки дитина відволіклася — це формує глибокий страх раптової втрати батьків.',
      'Спокій батьків — спокій дитини: діти миттєво зчитують тривогу мами. Якщо ви впевнені та спокійні — малюк почуватиметься у безпеці.'
    ]
  },
  {
    id: 'memo_shelter_air_raid',
    title: 'Психологічна допомога та стабілізація дітей в укритті під час повітряної тривоги',
    targetAudience: 'Для укриття (ДСНС/Психолог)',
    category: 'Безпека і тривожність',
    summary: 'Алгоритм швидкого заспокоєння, зняття паніки та переключення уваги дошкільнят під час сигналу сирени в укритті ЗДО №145.',
    tips: [
      'Спокійний голос та впевнені рухи вихователя: діти реагують не на звук сирени, а на міміку та інтонацію дорослого поряд.',
      'Дихальна гра «Здуй пушинку / задми свічку»: глибокий вдих через носик на 4 рахунки, затримка на 2, повільний плавний видих ротиком на 4.',
      'Техніка заземлення «5-4-3-2-1»: знайти очима 5 предметів синього кольору, доторкнутися до 4 різних фактур, почути 3 звуки, відчути 2 запахи, випити ковток води.',
      'Вправа тілесної релаксації «Черепашка»: плечі міцно підняти до вушок (черепашка сховалася від вітру), потримати 5 секунд і м\'яко скинути вниз («сонечко зігріло»).',
      'Сенсорний валізку укриття: використовуйте кінетичний пісок, м\'які м\'ячики-антистрес, прості пазли, аудіоказки та розмальовки.',
      'Легалізація почуттів: не кажіть «не бійся, це пусте». Скажіть: «Я бачу, що тобі страшно. Це нормально. Я поруч, ми в безпечному укритті, я тебе захищаю».'
    ]
  },
  {
    id: 'memo_adhd_support',
    title: 'Як створити комфортне середовище для дитини з гіперактивністю (СДУГ) у групі',
    targetAudience: 'Вихователям',
    category: 'Особливості поведінки',
    summary: 'Методичні прийоми організації простору, комунікації та зміни видів діяльності для дітей з надлишковою активністю та імпульсивністю.',
    tips: [
      'Чіткий візуальний розпорядок дня: картки-піктограми з послідовністю дій допомагають дитині передбачувати переходи між заняттями.',
      'Короткі та однозначні інструкції: давайте не більше однієї дії за раз (наприклад: «Поклади олівець у склянку», а не довгий ланцюжок завдань).',
      'Зміна діяльності кожні 10-12 хвилин: чергуйте сидіння за столиками з рухливими хвилинками («ми — дерева на вітрі», пальчикові гімнастики).',
      'Легалізація рухової потреби: призначайте дитину помічником — роздати зошити, змочити губку, розставити стільці.',
      'Зона сенсорного розвантаження: облаштуйте куточок з м\'яким килимком, пуфом та обтяженою подушкою або пледом.',
      'Позитивне підкріплення успіху: фіксуйте кожен випадок, коли дитина впоралася із завданням чи дочекалася своєї черги.'
    ]
  },
  {
    id: 'memo_crisis_3_years',
    title: 'Криза 3-х років («Я сам!»): як пережити впертість, бунти та істерики без травм',
    targetAudience: 'Батькам',
    category: 'Особливості поведінки',
    summary: 'Психологічні особливості віку самоствердження: чому дитина бунтує та як дорослим зберегти терпіння і контакт.',
    tips: [
      'Усвідомте нормальність кризи: впертість та протести у 3 роки — це не погане виховання, а природний стрибок формування особистості дитини.',
      'Ілюзія вибору: замість наказу «одягайся» запропонуйте: «Ти одягнеш синю кофтинку чи зелену?», «Підемо до ванної як ведмедики чи як кошенята?».',
      'Заохочуйте безпечну самостійність: дозвольте дитині самій натягнути черевики (навіть якщо це займе 5 зайвих хвилин), насипати корм котику чи помити яблуко.',
      'Дії під час істерики: забезпечте фізичну безпеку, не кричіть і не соромте перед чужими людьми. Сядьте поруч на рівні очей, будьте тихою гаванню.',
      'Називайте почуття: «Ти дуже сердишся, що ми йдемо з майданчика. Я розумію твоє розчарування. Ми обов\'язково прийдемо сюди завтра».',
      'Тверді непорушні межі: питання безпеки (дорога, гаряче, розетки) не обговорюються, але всі інші побутові моменти можуть бути гнучкими.'
    ]
  },
  {
    id: 'memo_childhood_fears',
    title: 'Дитячі страхи (темряви, голосних звуків, самотності): методи психологічної допомоги',
    targetAudience: 'Батькам',
    category: 'Безпека і тривожність',
    summary: 'Дієві арт-терапевтичні та ігрові методики подолання дитячих страхів у домашніх умовах.',
    tips: [
      'Арт-терапевтична техніка «Малюємо та перетворюємо страх»: намалювати фарбами те, що лякає, а потім домлювати йому смішний капелюх, бантик або чарівні крильця.',
      'Гра в темряву «Чарівний ліхтарик»: грайтеся в безпечній кімнаті у світлові хованки з ліхтариком, досліджуючи веселі тіні на стіні.',
      'Казкотерапія: вигадуйте казки про хороброго зайчика чи котика, який спочатку боявся грому/темряви, а потім знайшов свій чарівний захисний щит.',
      'Нічний режим спокою: мінімізуйте екранний час за 1.5 години до сну; використовуйте теплий нічник та тактильне читання у ліжку.',
      'Ніколи не висміюйте страх: фрази «ти ж великий хлопчик» або «там нікого нема, не вигадуй» лише поглиблюють відчуття самотності дитини у своїй біді.',
      'Тілесний контакт: міцні теплі обійми на 20-30 секунд активізують вироблення окситоцину, знижуючи рівень кортизолу.'
    ]
  },
  {
    id: 'memo_school_readiness',
    title: 'Психологічна готовність дитини до школи (НУШ): на що звернути увагу батькам',
    targetAudience: 'Батькам',
    category: 'Підготовка до школи',
    summary: 'Чому вміння читати і писати — це лише малий відсоток успіху, та як розвинути емоційну зрілість і мотивацію майбутнього першокласника.',
    tips: [
      'Мотиваційна готовність: бажання дитини дізнаватися нове, інтерес до пізнання, а не лише «гарний новий рюкзак».',
      'Емоційно-вольова регуляція: здатність утримувати увагу 15–20 хвилин, дослухати завдання до кінця та спокійно приймати дрібні невдачі.',
      'Соціальна адаптація: навички взаємодії з ровесниками, вміння домовитися про правила гри, звернутися за допомогою до вчителя.',
      'Дрібна моторика та зорово-моторна координація: ліплення з пластиліну, робота з ножицями, шнурування, орієнтація на аркуші в клітинку.',
      'Побутова самостійність: швидке самостійне переодягання, складання своїх речей, дотримання особистої гігієни.',
      'Підтримка впевненості: не лякайте дитину «от підеш до школи — там тобі покажуть!». Створюйте образ школи як цікавого простору дорослішання.'
    ]
  }
];

export function getPsychologyMemos(): PsychologyMemo[] {
  return PSYCHOLOGY_MEMOS;
}


// ==========================================
// 1 ВЕРЕСНЯ: МАСОВЕ ПЕРЕВЕДЕННЯ КОНТИНГЕНТУ
// ==========================================
export interface ChildGroupTransferItem {
  childId: number;
  targetGroupName: string;
  targetStatus?: 'Навчається' | 'Випускник' | 'Вибув';
}

export function batchTransferChildren(transfers: ChildGroupTransferItem[]): SadokChild[] {
  requirePermission('registry.write');
  const current = getChildren();
  const transferMap = new Map(transfers.map(t => [t.childId, t]));

  const updated = current.map(c => {
    const t = transferMap.get(c.ID);
    if (!t) return c;
    return {
      ...c,
      GROUP_NAME: t.targetGroupName,
      STATUS: t.targetStatus || c.STATUS,
    };
  });

  localStorage.setItem('sadok_children', JSON.stringify(updated));
  transfers.forEach(t => {
    queueCurrentSyncEntity('child', String(t.childId), 'upsert', false);
  });

  recordAudit({
    action: 'update',
    entityType: 'child',
    entityId: 'batch-transfer',
    summary: `Масове переведення «1 Вересня»: переведено ${transfers.length} вихованців`,
    after: { transferredCount: transfers.length },
  });

  return updated;
}

// ==========================================
// SADOK МЕДИЧНИЙ: КАРТКИ, ЩЕПЛЕННЯ, АНТРОПОМЕТРІЯ
// ==========================================

const INITIAL_MEDICAL_CARDS: SadokMedicalCard[] = [
  {
    ID: 1,
    CHILD_ID: 1,
    CHILD_NAME: 'Коваленко Данило Олександрович',
    GROUP_NAME: 'Група «Сонечко» (Ясельна)',
    BIRTH_DATE: '2022-05-14',
    HEALTH_GROUP: 'I (Здорові)',
    PHYSICAL_GROUP: 'Основна',
    DESK_FURNITURE_SIZE: '1 (85-100 см)',
    DIET_PRECAUTIONS: 'Безлактозна дієта',
    CHRONIC_CONDITIONS: 'Немає',
    VISION_HEARING_NOTES: 'Зір 1.0, слух у нормі',
    DOCTOR_CONCLUSION: 'Соматично здоровий. Допущений до відвідування ЗДО.',
    UPDATED_AT: '2026-09-01'
  },
  {
    ID: 2,
    CHILD_ID: 2,
    CHILD_NAME: 'Шевченко Марія Вікторівна',
    GROUP_NAME: 'Група «Сонечко» (Ясельна)',
    BIRTH_DATE: '2022-08-20',
    HEALTH_GROUP: 'I (Здорові)',
    PHYSICAL_GROUP: 'Основна',
    DESK_FURNITURE_SIZE: '1 (85-100 см)',
    DIET_PRECAUTIONS: 'Звичайне харчування',
    CHRONIC_CONDITIONS: 'Немає',
    VISION_HEARING_NOTES: 'У нормі',
    DOCTOR_CONCLUSION: 'Практично здорова.',
    UPDATED_AT: '2026-09-01'
  }
];

const INITIAL_VACCINATIONS: SadokVaccination[] = [
  {
    ID: 1,
    CHILD_ID: 1,
    CHILD_NAME: 'Коваленко Данило Олександрович',
    GROUP_NAME: 'Група «Сонечко» (Ясельна)',
    VACCINE_TYPE: 'БЦЖ',
    DOSE_STAGE: 'V (В пологовому)',
    ADMINISTERED_DATE: '2022-05-17',
    SERIES_NUMBER: 'BCG-4491',
    REACTION: 'Звичайна',
    STATUS: 'Зроблено',
    NOTES: 'Рубчик 5 мм'
  },
  {
    ID: 2,
    CHILD_ID: 1,
    CHILD_NAME: 'Коваленко Данило Олександрович',
    GROUP_NAME: 'Група «Сонечко» (Ясельна)',
    VACCINE_TYPE: 'КПК',
    DOSE_STAGE: 'V1 (12 місяців)',
    ADMINISTERED_DATE: '2023-05-20',
    SERIES_NUMBER: 'MMR-9021',
    REACTION: 'Звичайна',
    STATUS: 'Зроблено',
    NOTES: 'Вакцина Пріорикс'
  },
  {
    ID: 3,
    CHILD_ID: 1,
    CHILD_NAME: 'Коваленко Данило Олександрович',
    GROUP_NAME: 'Група «Сонечко» (Ясельна)',
    VACCINE_TYPE: 'АКДП / АДП-м',
    DOSE_STAGE: 'R1 (18 місяців)',
    ADMINISTERED_DATE: '2023-11-15',
    SERIES_NUMBER: 'DTP-3011',
    REACTION: 'Звичайна',
    STATUS: 'Зроблено',
    NOTES: 'Гексаксим'
  },
  {
    ID: 4,
    CHILD_ID: 2,
    CHILD_NAME: 'Шевченко Марія Вікторівна',
    GROUP_NAME: 'Група «Сонечко» (Ясельна)',
    VACCINE_TYPE: 'БЦЖ',
    DOSE_STAGE: 'V (В пологовому)',
    ADMINISTERED_DATE: '2022-08-23',
    SERIES_NUMBER: 'BCG-5002',
    REACTION: 'Звичайна',
    STATUS: 'Зроблено',
    NOTES: 'Рубчик 4 мм'
  }
];

const INITIAL_ANTHROPOMETRY: SadokAnthropometry[] = [
  {
    ID: 1,
    CHILD_ID: 1,
    CHILD_NAME: 'Коваленко Данило Олександрович',
    GROUP_NAME: 'Група «Сонечко» (Ясельна)',
    DATE: '2026-09-02',
    SEASON: 'Осінь',
    HEIGHT_CM: 98,
    WEIGHT_KG: 15.2,
    CHEST_CM: 52,
    EVALUATION: 'Нормальний розвиток',
    NOTES: 'Відповідає віковій нормі'
  },
  {
    ID: 2,
    CHILD_ID: 2,
    CHILD_NAME: 'Шевченко Марія Вікторівна',
    GROUP_NAME: 'Група «Сонечко» (Ясельна)',
    DATE: '2026-09-02',
    SEASON: 'Осінь',
    HEIGHT_CM: 95,
    WEIGHT_KG: 14.1,
    CHEST_CM: 50,
    EVALUATION: 'Нормальний розвиток',
    NOTES: 'Гармонійний розвиток'
  }
];

// Medical Cards
export function getMedicalCards(): SadokMedicalCard[] {
  const saved = localStorage.getItem('sadok_medical_cards');
  if (saved) { try { return JSON.parse(saved); } catch (_) {} }
  localStorage.setItem('sadok_medical_cards', JSON.stringify(INITIAL_MEDICAL_CARDS));
  return INITIAL_MEDICAL_CARDS;
}

export function saveMedicalCard(card: Partial<SadokMedicalCard> & { CHILD_ID: number; CHILD_NAME: string }): SadokMedicalCard[] {
  requirePermission('registry.write');
  const current = getMedicalCards();
  let updated: SadokMedicalCard[];
  let savedId: number;

  const existing = current.find(item => (card.ID && item.ID === card.ID) || item.CHILD_ID === card.CHILD_ID);
  if (existing) {
    savedId = existing.ID;
    updated = current.map(item => item.ID === existing.ID ? {
      ...item,
      ...card,
      UPDATED_AT: new Date().toISOString().split('T')[0]
    } as SadokMedicalCard : item);
  } else {
    savedId = card.ID || (current.length > 0 ? Math.max(...current.map(item => item.ID)) + 1 : 1);
    const newRecord: SadokMedicalCard = {
      ID: savedId,
      CHILD_ID: card.CHILD_ID,
      CHILD_NAME: card.CHILD_NAME,
      GROUP_NAME: card.GROUP_NAME || 'Група «Сонечко»',
      BIRTH_DATE: card.BIRTH_DATE || '2022-01-01',
      HEALTH_GROUP: card.HEALTH_GROUP || 'I (Здорові)',
      PHYSICAL_GROUP: card.PHYSICAL_GROUP || 'Основна',
      DESK_FURNITURE_SIZE: card.DESK_FURNITURE_SIZE || '1 (85-100 см)',
      DIET_PRECAUTIONS: card.DIET_PRECAUTIONS || 'Звичайне харчування',
      CHRONIC_CONDITIONS: card.CHRONIC_CONDITIONS || 'Немає',
      VISION_HEARING_NOTES: card.VISION_HEARING_NOTES || 'У нормі',
      DOCTOR_CONCLUSION: card.DOCTOR_CONCLUSION || 'Допущений до відвідування ЗДО',
      UPDATED_AT: new Date().toISOString().split('T')[0]
    };
    updated = [newRecord, ...current];
  }

  localStorage.setItem('sadok_medical_cards', JSON.stringify(updated));
  queueCurrentSyncEntity('medical_card', String(savedId), 'upsert', !existing);
  return updated;
}

export function deleteMedicalCard(id: number): SadokMedicalCard[] {
  requirePermission('registry.write');
  const current = getMedicalCards();
  const target = current.find(item => item.ID === id);
  if (target) {
    queueCurrentSyncEntity('medical_card', String(id), 'delete', false, target as unknown as Record<string, unknown>);
  }
  const updated = current.filter(item => item.ID !== id);
  localStorage.setItem('sadok_medical_cards', JSON.stringify(updated));
  return updated;
}

// Vaccinations
export function getVaccinations(): SadokVaccination[] {
  const saved = localStorage.getItem('sadok_vaccinations');
  if (saved) { try { return JSON.parse(saved); } catch (_) {} }
  localStorage.setItem('sadok_vaccinations', JSON.stringify(INITIAL_VACCINATIONS));
  return INITIAL_VACCINATIONS;
}

export function saveVaccination(vac: Partial<SadokVaccination> & { CHILD_ID: number; CHILD_NAME: string; VACCINE_TYPE: SadokVaccination['VACCINE_TYPE'] }): SadokVaccination[] {
  requirePermission('registry.write');
  const current = getVaccinations();
  let updated: SadokVaccination[];
  let savedId: number;

  if (vac.ID) {
    savedId = vac.ID;
    updated = current.map(item => item.ID === vac.ID ? { ...item, ...vac } as SadokVaccination : item);
  } else {
    savedId = current.length > 0 ? Math.max(...current.map(item => item.ID)) + 1 : 1;
    const newRecord: SadokVaccination = {
      ID: savedId,
      CHILD_ID: vac.CHILD_ID,
      CHILD_NAME: vac.CHILD_NAME,
      GROUP_NAME: vac.GROUP_NAME || 'Група «Сонечко»',
      VACCINE_TYPE: vac.VACCINE_TYPE,
      DOSE_STAGE: vac.DOSE_STAGE || 'V1',
      ADMINISTERED_DATE: vac.ADMINISTERED_DATE || new Date().toISOString().split('T')[0],
      SERIES_NUMBER: vac.SERIES_NUMBER || '',
      REACTION: vac.REACTION || 'Звичайна',
      EXEMPTION_REASON: vac.EXEMPTION_REASON || '',
      STATUS: vac.STATUS || 'Зроблено',
      NOTES: vac.NOTES || ''
    };
    updated = [newRecord, ...current];
  }

  localStorage.setItem('sadok_vaccinations', JSON.stringify(updated));
  queueCurrentSyncEntity('medical_vaccination', String(savedId), 'upsert', !vac.ID);
  return updated;
}

export function deleteVaccination(id: number): SadokVaccination[] {
  requirePermission('registry.write');
  const current = getVaccinations();
  const target = current.find(item => item.ID === id);
  if (target) {
    queueCurrentSyncEntity('medical_vaccination', String(id), 'delete', false, target as unknown as Record<string, unknown>);
  }
  const updated = current.filter(item => item.ID !== id);
  localStorage.setItem('sadok_vaccinations', JSON.stringify(updated));
  return updated;
}

// Anthropometry
export function getAnthropometries(): SadokAnthropometry[] {
  const saved = localStorage.getItem('sadok_anthropometries');
  if (saved) { try { return JSON.parse(saved); } catch (_) {} }
  localStorage.setItem('sadok_anthropometries', JSON.stringify(INITIAL_ANTHROPOMETRY));
  return INITIAL_ANTHROPOMETRY;
}

export function saveAnthropometry(rec: Partial<SadokAnthropometry> & { CHILD_ID: number; CHILD_NAME: string }): SadokAnthropometry[] {
  requirePermission('registry.write');
  const current = getAnthropometries();
  let updated: SadokAnthropometry[];
  let savedId: number;

  if (rec.ID) {
    savedId = rec.ID;
    updated = current.map(item => item.ID === rec.ID ? { ...item, ...rec } as SadokAnthropometry : item);
  } else {
    savedId = current.length > 0 ? Math.max(...current.map(item => item.ID)) + 1 : 1;
    const newRecord: SadokAnthropometry = {
      ID: savedId,
      CHILD_ID: rec.CHILD_ID,
      CHILD_NAME: rec.CHILD_NAME,
      GROUP_NAME: rec.GROUP_NAME || 'Група «Сонечко»',
      DATE: rec.DATE || new Date().toISOString().split('T')[0],
      SEASON: rec.SEASON || (new Date().getMonth() >= 8 ? 'Осінь' : 'Весна'),
      HEIGHT_CM: Number(rec.HEIGHT_CM) || 100,
      WEIGHT_KG: Number(rec.WEIGHT_KG) || 16,
      CHEST_CM: rec.CHEST_CM ? Number(rec.CHEST_CM) : undefined,
      EVALUATION: rec.EVALUATION || 'Нормальний розвиток',
      NOTES: rec.NOTES || ''
    };
    updated = [newRecord, ...current];
  }

  localStorage.setItem('sadok_anthropometries', JSON.stringify(updated));
  queueCurrentSyncEntity('medical_anthropometry', String(savedId), 'upsert', !rec.ID);
  return updated;
}

export function deleteAnthropometry(id: number): SadokAnthropometry[] {
  requirePermission('registry.write');
  const current = getAnthropometries();
  const target = current.find(item => item.ID === id);
  if (target) {
    queueCurrentSyncEntity('medical_anthropometry', String(id), 'delete', false, target as unknown as Record<string, unknown>);
  }
  const updated = current.filter(item => item.ID !== id);
  localStorage.setItem('sadok_anthropometries', JSON.stringify(updated));
  return updated;
}

// -----------------------------------------------------------------
// Daily Attendance Registry (Табель відвідуваності на харчування)
// -----------------------------------------------------------------
export function getDailyAttendance(date: string): DailyAttendanceRecord[] {
  if (!db) return [];
  try {
    return queryAll<DailyAttendanceRecord>(
      `SELECT * FROM SADOK_ATTENDANCE WHERE DATE = '${esc(date)}' ORDER BY GROUP_NAME ASC`
    );
  } catch (_) {
    return [];
  }
}

export function saveDailyAttendance(records: DailyAttendanceRecord[]): void {
  if (!db || records.length === 0) return;
  const now = new Date().toISOString();
  db.run('BEGIN');
  try {
    for (const r of records) {
      db.run(
        `INSERT INTO SADOK_ATTENDANCE (DATE, GROUP_ID, GROUP_NAME, CATEGORY_ID, PRESENT_COUNT, DIET_COUNT, NOTES, UPDATED_AT)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(DATE, GROUP_ID) DO UPDATE SET
           GROUP_NAME=excluded.GROUP_NAME,
           CATEGORY_ID=excluded.CATEGORY_ID,
           PRESENT_COUNT=excluded.PRESENT_COUNT,
           DIET_COUNT=excluded.DIET_COUNT,
           NOTES=excluded.NOTES,
           UPDATED_AT=excluded.UPDATED_AT`,
        [
          r.DATE,
          r.GROUP_ID,
          r.GROUP_NAME,
          r.CATEGORY_ID || 2,
          r.PRESENT_COUNT || 0,
          r.DIET_COUNT || 0,
          r.NOTES || '',
          now
        ]
      );
    }
    db.run('COMMIT');
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }
  saveDatabaseToDisk();
}

export function getAttendanceEaterCounts(date: string): { [catId: number]: number } {
  const records = getDailyAttendance(date);
  const counts: { [catId: number]: number } = {};
  records.forEach(r => {
    const cat = r.CATEGORY_ID || 2;
    counts[cat] = (counts[cat] || 0) + (r.PRESENT_COUNT || 0);
  });
  return counts;
}

// -----------------------------------------------------------------
// HACCP Brackerage Journals (Журнали бракеражу НАССР)
// -----------------------------------------------------------------
export function getBrackerageReadyEntries(dateFrom?: string, dateTo?: string): BrackerageReadyEntry[] {
  if (!db) return [];
  try {
    if (dateFrom && dateTo) {
      return queryAll<BrackerageReadyEntry>(
        `SELECT * FROM SADOK_BRACKERAGE_READY WHERE DATE >= '${esc(dateFrom)}' AND DATE <= '${esc(dateTo)}' ORDER BY DATE DESC, TIME DESC`
      );
    }
    return queryAll<BrackerageReadyEntry>(
      `SELECT * FROM SADOK_BRACKERAGE_READY ORDER BY DATE DESC, TIME DESC LIMIT 200`
    );
  } catch (_) {
    return [];
  }
}

export function addBrackerageReadyEntry(entry: Omit<BrackerageReadyEntry, 'ID'>): number {
  if (!db) return 0;
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO SADOK_BRACKERAGE_READY
      (DATE, TIME, MEAL_TYPE, DISH_NAME, SAMPLE_TAKEN_TIME, WEIGHT_PORTION_CHECK, TEMPERATURE_C,
       ORGANOLEPTIC_RATING, PERMISSION_TO_SERVE, COMMISSION_MEMBERS, NOTES, CREATED_AT)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.DATE,
      entry.TIME,
      entry.MEAL_TYPE,
      entry.DISH_NAME,
      entry.SAMPLE_TAKEN_TIME || entry.TIME,
      entry.WEIGHT_PORTION_CHECK || '',
      entry.TEMPERATURE_C || 75.0,
      entry.ORGANOLEPTIC_RATING || 'Відмінно',
      entry.PERMISSION_TO_SERVE || 'Видача дозволена',
      entry.COMMISSION_MEMBERS || 'Бракеражна комісія ЗДО',
      entry.NOTES || '',
      now
    ]
  );
  saveDatabaseToDisk();
  return Number(db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] || 0);
}

export function deleteBrackerageReadyEntry(id: number): void {
  if (!db) return;
  db.run(`DELETE FROM SADOK_BRACKERAGE_READY WHERE ID = ?`, [id]);
  saveDatabaseToDisk();
}

export function getBrackerageRawEntries(dateFrom?: string, dateTo?: string): BrackerageRawEntry[] {
  if (!db) return [];
  try {
    if (dateFrom && dateTo) {
      return queryAll<BrackerageRawEntry>(
        `SELECT * FROM SADOK_BRACKERAGE_RAW WHERE DATE >= '${esc(dateFrom)}' AND DATE <= '${esc(dateTo)}' ORDER BY DATE DESC, ID DESC`
      );
    }
    return queryAll<BrackerageRawEntry>(
      `SELECT * FROM SADOK_BRACKERAGE_RAW ORDER BY DATE DESC, ID DESC LIMIT 200`
    );
  } catch (_) {
    return [];
  }
}

export function addBrackerageRawEntry(entry: Omit<BrackerageRawEntry, 'ID'>): number {
  if (!db) return 0;
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO SADOK_BRACKERAGE_RAW
      (DATE, PRODUCT_NAME, SUPPLIER_NAME, INVOICE_NUMBER, PACKAGE_INTEGRITY, EXPIRY_DATE,
       DOCUMENTATION_STATUS, ACCEPTANCE_DECISION, RESPONSIBLE_PERSON, NOTES, CREATED_AT)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.DATE,
      entry.PRODUCT_NAME,
      entry.SUPPLIER_NAME,
      entry.INVOICE_NUMBER || '',
      entry.PACKAGE_INTEGRITY,
      entry.EXPIRY_DATE,
      entry.DOCUMENTATION_STATUS,
      entry.ACCEPTANCE_DECISION,
      entry.RESPONSIBLE_PERSON,
      entry.NOTES || '',
      now
    ]
  );
  saveDatabaseToDisk();
  return Number(db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] || 0);
}

export function deleteBrackerageRawEntry(id: number): void {
  if (!db) return;
  db.run(`DELETE FROM SADOK_BRACKERAGE_RAW WHERE ID = ?`, [id]);
  saveDatabaseToDisk();
}

// -----------------------------------------------------------------
// Real OSV (Оборотно-сальдова відомість) Calculation
// -----------------------------------------------------------------
export interface RealOsvProductRow {
  id: number;
  code: string;
  name: string;
  unit: string;
  price: number;
  inQty: number;
  inSum: number;
  receiptQty: number;
  receiptSum: number;
  expenseQty: number;
  expenseSum: number;
  outQty: number;
  outSum: number;
}

export function calculateRealTurnoverSheet(dateFrom: string, dateTo: string): RealOsvProductRow[] {
  if (!db) return [];
  const products = getProducts();
  const batches = getStockBatches();
  const invoices = getInvoices();

  // 1. Group invoices by date range
  const periodInvoices = invoices.filter(inv => inv.DATA >= dateFrom && inv.DATA <= dateTo);
  const priorInvoices = invoices.filter(inv => inv.DATA < dateFrom);

  return products.map(p => {
    const pBatches = batches.filter(b => b.ID_PRODUKTA === p.ID);
    const avgPrice = p.CENA > 0 ? p.CENA : (pBatches[0]?.CENA || 25.0);
    const currentBatchQty = pBatches.reduce((sum, b) => sum + (b.OST_KG || 0), 0);

    // Period receipts
    const periodBatchReceipt = pBatches
      .filter(b => {
        const inv = invoices.find(i => i.ID === b.ID_NAKLADNOJ);
        return inv ? (inv.DATA >= dateFrom && inv.DATA <= dateTo) : false;
      })
      .reduce((sum, b) => sum + (b.KOLVO_KG || 0), 0);

    const receiptQty = Math.round(periodBatchReceipt * 100) / 100;
    const receiptSum = Math.round(receiptQty * avgPrice * 100) / 100;

    // Current in stock
    const outQty = Math.round(currentBatchQty * 100) / 100;
    const outSum = Math.round(outQty * avgPrice * 100) / 100;

    // Deductions during period (if any recorded in batches or estimation)
    const totalDeductedFromBatches = pBatches.reduce((sum, b) => sum + Math.max(0, (b.KOLVO_KG || 0) - (b.OST_KG || 0)), 0);
    const expenseQty = Math.min(
      Math.round(totalDeductedFromBatches * 100) / 100,
      receiptQty > 0 ? receiptQty : Math.round(outQty * 0.2 * 100) / 100
    );
    const expenseSum = Math.round(expenseQty * avgPrice * 100) / 100;

    // Opening balance = Closing - Receipts + Expenses
    const calculatedIn = outQty - receiptQty + expenseQty;
    const inQty = Math.max(0, Math.round(calculatedIn * 100) / 100);
    const inSum = Math.round(inQty * avgPrice * 100) / 100;

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
  });
}

// -----------------------------------------------------------------
// SPEECH THERAPY (SADOK ЛОГОПЕД / ДЕФЕКТОЛОГ)
// Криворізький КЗДО КТ №145 КМР
// -----------------------------------------------------------------

const INITIAL_SPEECH_CARDS: SpeechCard[] = [
  {
    ID: 1,
    CHILD_ID: 4,
    CHILD_NAME: 'Бондаренко Артем Олександрович',
    GROUP_NAME: 'Група «Калинка» (Старша логопедична)',
    BIRTH_DATE: '2020-04-15',
    ENROLLMENT_DATE: '2024-09-01',
    DIAGNOSIS: 'ФФНМ',
    ARTICULATION_APPARATUS: 'Прикус правильний, під\'язикова вуздечка помірно вкорочена, рухливість кінчика язика обмежена при підйомі вгору.',
    PHONEMIC_HEARING: 'Труднощі диференціації опозиційних звуків [С]-[Ш], [Р]-[Л], заміна сонора [Р] на [Л] у спонтанному мовленні.',
    SOUND_STATUSES: [
      { sound: '[С]', group: 'свистячі', stage: 'Введено в мовлення (Норма)' },
      { sound: '[З]', group: 'свистячі', stage: 'Введено в мовлення (Норма)' },
      { sound: '[Ц]', group: 'свистячі', stage: 'Введено в мовлення (Норма)' },
      { sound: '[Ш]', group: 'шиплячі', stage: 'Автоматизація в реченнях', notes: 'Міжзубний сигматизм подолано, закріплюється у фразах' },
      { sound: '[Ж]', group: 'шиплячі', stage: 'Автоматизація в словах', notes: 'Чітка вимова у відкритих складах' },
      { sound: '[Ч]', group: 'шиплячі', stage: 'Автоматизація в складах' },
      { sound: '[Щ]', group: 'шиплячі', stage: 'Постановка звука' },
      { sound: '[Л]', group: 'сонори', stage: 'Автоматизація в словах', notes: 'Звук чистий, закріплюється твердий [Л]' },
      { sound: '[Р]', group: 'сонори', stage: 'Постановка звука', notes: 'Горловий ротацизм, викликається вібрація від звука [Д]' }
    ],
    VOCABULARY_LEVEL: 'Словниковий запас у межах вікової норми, впевнено володіє узагальнюючими поняттями («професії», «транспорт», «посуд»).',
    GRAMMAR_STRUCTURE: 'Сформована задовільно. Поодинокі аграматизми при узгодженні числівників з іменниками (напр. «п\'ять олівців»).',
    COHERENT_SPEECH: 'Складає розповідь за сюжетною картиною за навідними запитаннями, переказує знайомі казки близько до тексту.',
    INDIVIDUAL_PLAN: '1) Артикуляційна гімнастика («Грибок», «Маляр», «Конячка»); 2) Автоматизація шиплячих [Ш], [Ж] у чистомовках та віршах; 3) Вібрація кінчика язика для звука [Р]; 4) Диференціація звуків [С]-[Ш]; 5) Розвиток фонематичного аналізу слів.',
    DYNAMICS: 'Позитивна динаміка',
    LOGOPED_CONCLUSION: 'Фонетико-фонематичний недорозвиток мовлення (ФФНМ). Міжзубний сигматизм шиплячих (етап фразової автоматизації), горловий ротацизм (етап постановки вібрації). Прогноз корекції сприятливий.',
    UPDATED_AT: '2026-09-15'
  },
  {
    ID: 2,
    CHILD_ID: 2,
    CHILD_NAME: 'Коваленко Софія Дмитрівна',
    GROUP_NAME: 'Група «Казка» (Старша комбінована)',
    BIRTH_DATE: '2022-08-19',
    ENROLLMENT_DATE: '2024-09-01',
    DIAGNOSIS: 'Дислалія',
    ARTICULATION_APPARATUS: 'Анатомічна будова артикуляційного апарату без патологій, обсяг та точність рухів язика і губ повні.',
    PHONEMIC_HEARING: 'Фонематичний слух повністю збережений, безпомилково розрізняє близькі за звучанням слова-квазіомоніми.',
    SOUND_STATUSES: [
      { sound: '[С]', group: 'свистячі', stage: 'Введено в мовлення (Норма)' },
      { sound: '[З]', group: 'свистячі', stage: 'Введено в мовлення (Норма)' },
      { sound: '[Ш]', group: 'шиплячі', stage: 'Введено в мовлення (Норма)' },
      { sound: '[Ж]', group: 'шиплячі', stage: 'Введено в мовлення (Норма)' },
      { sound: '[Л]', group: 'сонори', stage: 'Введено в мовлення (Норма)', notes: 'Пом\'якшення звука повністю усунуто' },
      { sound: '[Р]', group: 'сонори', stage: 'Введено в мовлення (Норма)', notes: 'Звук поставлено та автоматизовано у вільному мовленні' }
    ],
    VOCABULARY_LEVEL: 'Багатий словниковий запас, активна пізнавальна та мовленнєва ініціатива, вживає образні вислови та синоніми.',
    GRAMMAR_STRUCTURE: 'Граматичні категорії сформовані бездоганно відповідно до віку.',
    COHERENT_SPEECH: 'Зв\'язне мовлення високо розвинене, самостійно будує складні речення, переказує оповідання логічно та емоційно.',
    INDIVIDUAL_PLAN: '1) Закріплення сонорних звуків [Р], [Л] у скоромовках; 2) Самоконтроль мовлення; 3) Підготовка до випуску з логопункту.',
    DYNAMICS: 'Звуки автоматизовано (Норма)',
    LOGOPED_CONCLUSION: 'Мономорфна функціональна дислалія (ротацизм). Звуковимову сонорів [Р], [Л] повністю відновлено та автоматизовано у спонтанному мовленні. Рекомендовано випуск з логопедичного обліку.',
    UPDATED_AT: '2026-09-17'
  },
  {
    ID: 3,
    CHILD_ID: 5,
    CHILD_NAME: 'Сидоренко Владислав Юрійович',
    GROUP_NAME: 'Група «Сонечко» (Молодша інклюзивна)',
    BIRTH_DATE: '2021-06-10',
    ENROLLMENT_DATE: '2025-09-01',
    DIAGNOSIS: 'ЗНМ III рівень',
    ARTICULATION_APPARATUS: 'Високе тверде піднебіння, гіпотонус кінчика язика, помірна салівація під час тривалого мовленнєвого навантаження.',
    PHONEMIC_HEARING: 'Знижене фонематичне сприймання складних звукокомплексів, змішування дзвінких та глухих фонем.',
    SOUND_STATUSES: [
      { sound: '[С]', group: 'свистячі', stage: 'Автоматизація в словах', notes: 'Вимовляє у відкритих складах са-, со-' },
      { sound: '[З]', group: 'свистячі', stage: 'Постановка звука', notes: 'Оглушення звука, перехід від [С] з голосом' },
      { sound: '[Ш]', group: 'шиплячі', stage: 'Підготовчий (гімнастика)', notes: 'Відпрацювання підйому бічних країв язика («Чашечка»)' },
      { sound: '[Ж]', group: 'шиплячі', stage: 'Підготовчий (гімнастика)' },
      { sound: '[Л]', group: 'сонори', stage: 'Постановка звука', notes: 'Міжзубна вимова звука [Л]' },
      { sound: '[Р]', group: 'сонори', stage: 'Підготовчий (гімнастика)' }
    ],
    VOCABULARY_LEVEL: 'Обмежений активний словник побутовими темами, труднощі у називанні ознак предметів та професій.',
    GRAMMAR_STRUCTURE: 'Труднощі узгодження прикметників з іменниками у роді, пропуски простих прийменників («м\'яч стіл» замість «м\'яч на столі»).',
    COHERENT_SPEECH: 'Фразове мовлення спрощене (речення з 2-3 слів), переказ тексту можливий лише за навідними запитаннями та ілюстраціями.',
    INDIVIDUAL_PLAN: '1) Логопедичний масаж язика та артикуляційна гімнастика на тонізування м\'язів; 2) Постановка свистячих [С], [З]; 3) Збагачення словника лексичними темами («Осінь», «Овочі», «Сім\'я»); 4) Вправи на формування граматичних форм множини; 5) Розвиток дрібної моторики рук.',
    DYNAMICS: 'Повільний поступ',
    LOGOPED_CONCLUSION: 'Загальний недорозвиток мовлення (ЗНМ III рівня) у дитини з особливими освітніми потребами (ООП). Поліморфне порушення звуковимови свистячих, шиплячих та сонорних звуків, несформованість граматичного ладу. Потребує тривалого корекційного супроводу.',
    UPDATED_AT: '2026-09-16'
  },
  {
    ID: 4,
    CHILD_ID: 3,
    CHILD_NAME: 'Шевченко Максим Ігорович',
    GROUP_NAME: 'Група «Ясочка» (Середня комбінована)',
    BIRTH_DATE: '2021-02-05',
    ENROLLMENT_DATE: '2024-09-01',
    DIAGNOSIS: 'ФФНМ',
    ARTICULATION_APPARATUS: 'Будова без відхилень, рухи язика точні, достатня амплітуда рухів нижньої щелепи.',
    PHONEMIC_HEARING: 'Фонематичні уявлення недостатньо диференційовані відносно африкатів ([Ц]-[С], [Ч]-[Т\']).',
    SOUND_STATUSES: [
      { sound: '[С]', group: 'свистячі', stage: 'Введено в мовлення (Норма)' },
      { sound: '[Ц]', group: 'свистячі', stage: 'Автоматизація в словах', notes: 'Закріплення у відкритих і закритих складах' },
      { sound: '[Ч]', group: 'шиплячі', stage: 'Автоматизація в реченнях' },
      { sound: '[Щ]', group: 'шиплячі', stage: 'Постановка звука' },
      { sound: '[Л]', group: 'сонори', stage: 'Введено в мовлення (Норма)' },
      { sound: '[Р]', group: 'сонори', stage: 'Автоматизація в словах', notes: 'Звук викликано механічним способом, автоматизується' }
    ],
    VOCABULARY_LEVEL: 'Словниковий запас повністю відповідає віковим нормативам, добре орієнтується у просторі та часі.',
    GRAMMAR_STRUCTURE: 'Граматичний лад сформований задовільно, вживає прийменниково-відмінкові конструкції.',
    COHERENT_SPEECH: 'Зв\'язне мовлення зрозуміле, будує послідовні висловлювання, охоче вступає в діалог з однолітками та дорослими.',
    INDIVIDUAL_PLAN: '1) Автоматизація [Ц], [Ч], [Щ] у скоромовках; 2) Введення [Р] у самостійне мовлення; 3) Диференціаційні ігри на розрізнення свистячих та шиплячих.',
    DYNAMICS: 'Позитивна динаміка',
    LOGOPED_CONCLUSION: 'ФФНМ. Порушення вимови складних свистячих та сонорних звуків. Динаміка позитивна, планується повна автоматизація до кінця навчального півріччя.',
    UPDATED_AT: '2026-09-18'
  }
];

const INITIAL_SPEECH_DAILY_LOG: SpeechDailyLogEntry[] = [
  {
    ID: 1,
    DATE: '2026-09-18',
    ACTIVITY_TYPE: 'Індивідуальне заняття',
    CATEGORY: 'Діти',
    TARGET_NAME: 'Бондаренко Артем',
    CHILD_ID: 4,
    GROUP_NAME: 'Група «Калинка»',
    SOUND_TARGET: '[Р], [Рь]',
    TOPIC: 'Постановка звука [Р] механічним способом. Відпрацювання вібрації кінчика язика за допомогою зонда/шпателя від звука [Д].',
    HOURS_SPENT: 0.5,
    RESULTS_NOTES: 'Отримано короткочасну вібрацію кінчика язика під час швидкої вимови звуків д-д-д-д.',
    CREATED_AT: '2026-09-18'
  },
  {
    ID: 2,
    DATE: '2026-09-18',
    ACTIVITY_TYPE: 'Підгрупове заняття',
    CATEGORY: 'Діти',
    TARGET_NAME: 'Підгрупа «Звукарики» (4 дітей)',
    GROUP_NAME: 'Група «Калинка»',
    SOUND_TARGET: '[Ш], [Ж]',
    TOPIC: 'Диференціація звуків [С] – [Ш] у словах і чистомовках. Гра «Впіймай звук чарівним дзвіночком».',
    HOURS_SPENT: 0.67,
    RESULTS_NOTES: 'Діти успішно розрізняють звуки за артикуляційним укладом (губи посмішкою / трубочкою).',
    CREATED_AT: '2026-09-18'
  },
  {
    ID: 3,
    DATE: '2026-09-18',
    ACTIVITY_TYPE: 'Консультація батьків',
    CATEGORY: 'Батьки',
    TARGET_NAME: 'Коваленко О. М. (мати Софії)',
    CHILD_ID: 2,
    GROUP_NAME: 'Група «Казка»',
    SOUND_TARGET: '[Р]',
    TOPIC: 'Рекомендації щодо закріплення звука [Р] у домашньому спілкуванні. Пам\'ятка чистомовок для сімейного читання.',
    HOURS_SPENT: 0.5,
    RESULTS_NOTES: 'Матері передано бланк домашніх логопедичних вправ, узгоджено самоконтроль вимови.',
    CREATED_AT: '2026-09-18'
  },
  {
    ID: 4,
    DATE: '2026-09-17',
    ACTIVITY_TYPE: 'Індивідуальне заняття',
    CATEGORY: 'Діти',
    TARGET_NAME: 'Сидоренко Владислав',
    CHILD_ID: 5,
    GROUP_NAME: 'Група «Сонечко»',
    SOUND_TARGET: '[С]',
    TOPIC: 'Артикуляційна гімнастика для свистячих («Посмішка», «Лопатка», «Вітерець»). Автоматизація [С] у прямих складах СА, СО, СУ.',
    HOURS_SPENT: 0.33,
    RESULTS_NOTES: 'Покращився видих по серединці язика. Звук вимовляється чітко за наслідуванням логопеда.',
    CREATED_AT: '2026-09-17'
  },
  {
    ID: 5,
    DATE: '2026-09-17',
    ACTIVITY_TYPE: 'Логопедичне обстеження (скринінг)',
    CATEGORY: 'Діти',
    TARGET_NAME: 'Вихованці середньої групи «Ясочка»',
    GROUP_NAME: 'Група «Ясочка»',
    SOUND_TARGET: 'Усі групи звуків',
    TOPIC: 'Плановий осінній скринінг звуковимови дітей 4-5 років. Заповнення мовленнєвих карток.',
    HOURS_SPENT: 1.5,
    RESULTS_NOTES: 'Обстежено 6 дітей. Виявлено 2 дітей з порушенням вимови сонорів [Р], [Л], призначено консультації з батьками.',
    CREATED_AT: '2026-09-17'
  },
  {
    ID: 6,
    DATE: '2026-09-16',
    ACTIVITY_TYPE: 'Консультація вихователів',
    CATEGORY: 'Педагоги',
    TARGET_NAME: 'Вихователі групи «Калинка»',
    GROUP_NAME: 'Група «Калинка»',
    TOPIC: 'Включення артикуляційної гімнастики та дихальних пауз у щоденні ранкові зустрічі вихованців.',
    HOURS_SPENT: 0.5,
    RESULTS_NOTES: 'Передано комплекс наочних матеріалів для логопедичного куточка в груповому осередку.',
    CREATED_AT: '2026-09-16'
  },
  {
    ID: 7,
    DATE: '2026-09-15',
    ACTIVITY_TYPE: 'Індивідуальне заняття',
    CATEGORY: 'Діти',
    TARGET_NAME: 'Шевченко Максим',
    CHILD_ID: 3,
    GROUP_NAME: 'Група «Ясочка»',
    SOUND_TARGET: '[Р]',
    TOPIC: 'Автоматизація звука [Р] у реченнях та зв\'язному тексті. Описування іграшок з використанням звука.',
    HOURS_SPENT: 0.5,
    RESULTS_NOTES: 'Впевнено вимовляє звук у фразах: «У Роми червона ракета», «Риба пливе у річці».',
    CREATED_AT: '2026-09-15'
  }
];

const INITIAL_ARTICULATION_EXERCISES: ArticulationExercise[] = [
  {
    id: 'lips_smile',
    title: '«Посмішка» / «Парканчик»',
    category: 'lips',
    purpose: 'Розвиток рухливості губ, формування навички утримувати куточки рота розтягнутими.',
    targetSounds: ['С', 'З', 'Ц'],
    description: 'Усміхнутися без напруження, щоб було видно верхні й нижні зуби (парканчик). Утримувати губи в такому положенні.',
    instructions: [
      'Посміхнись широко й весело!',
      'Покажи рівні зубки, як білий парканчик.',
      'Утримуй посмішку під лічбу до 5 (потім до 10).',
      'Розслаб губки та повтори ще 3 рази.'
    ],
    repetition: '5-7 разів по 5-10 секунд',
    icon: 'Smile'
  },
  {
    id: 'lips_tube',
    title: '«Трубочка» / «Хоботок»',
    category: 'lips',
    purpose: 'Вироблення кругового звуження губ, необхідного для правильної вимови шиплячих звуків.',
    targetSounds: ['Ш', 'Ж', 'Ч', 'Щ'],
    description: 'Витягнути зімкнуті губи вперед довгою трубочкою, як хобот слоненяти.',
    instructions: [
      'Зімкни зубки, але не стискай міцно.',
      'Витягни губки вперед, ніби тягнешся поцілувати маму або п\'єш сік через соломинку.',
      'Утримуй трубочку нерухомо під лічбу до 5-10.',
      'Чергуй вправу «Посмішка» – «Трубочка».'
    ],
    repetition: '6-8 разів по 5 секунд',
    icon: 'Volume2'
  },
  {
    id: 'tongue_spatula',
    title: '«Лопатка» (Млинець)',
    category: 'tongue',
    purpose: 'Розслаблення м\'язів язика, розпластування його передньої частини на нижній губі.',
    targetSounds: ['С', 'З', 'Ш', 'Ж', 'Л'],
    description: 'Рот відкритий, широкий розслаблений язик покласти на нижню губу. Утримувати спокійно.',
    instructions: [
      'Відкрий ротик, ніби говориш звук [А].',
      'Поклади широкий спокійний язичок на нижню губу, як млинець на сковорідку.',
      'Язичок не повинен тремтіти або тікати назад.',
      'Утримуй під лічбу від 1 до 10.'
    ],
    repetition: '4-5 разів по 8-10 секунд',
    icon: 'Layers'
  },
  {
    id: 'tongue_cup',
    title: '«Чашечка»',
    category: 'tongue',
    purpose: 'Підйом переднього та бокових країв язика у формі чаші для правильного видиху при шиплячих та сонорах.',
    targetSounds: ['Ш', 'Ж', 'Ч', 'Щ', 'Р'],
    description: 'Рот широко відкритий. Передній та бічні краї широкого язика підняті догори, середина прогнута вниз.',
    instructions: [
      'Широко відкрий рот.',
      'Поклади язик широкою лопаткою, а потім загни його кінчик та боки вгору.',
      'Утвори глибоку чашечку, щоб з неї не вилилася водичка.',
      'Утримуй біля верхніх зубів, не торкаючись їх, рахуючи до 5-8.'
    ],
    repetition: '5-6 разів по 6-8 секунд',
    icon: 'Coffee'
  },
  {
    id: 'tongue_horse',
    title: '«Конячка»',
    category: 'tongue',
    purpose: 'Зміцнення м\'язів підйому язика, розтягування під\'язикової зв\'язки (вуздечки).',
    targetSounds: ['Р', 'Рь', 'Л', 'Ль'],
    description: 'Клацати язиком об тверде піднебіння, наслідуючи цокіт копит конячки. Нижня щелепа не рухається.',
    instructions: [
      'Посміхнись і злегка відкрий ротик.',
      'Присмокчи широкий язичок до піднебіння і дзвінко цокни.',
      'Стеж, щоб рухався тільки язик, а підборіддя залишалося нерухомим!',
      'Цокай спочатку повільно, потім швидше.'
    ],
    repetition: '15-20 разів підряд',
    icon: 'Sparkles'
  },
  {
    id: 'tongue_mushroom',
    title: '«Грибок»',
    category: 'tongue',
    purpose: 'Вироблення підйому язика вгору та максимальне натягування під\'язикової вуздечки для вимови [Р].',
    targetSounds: ['Р', 'Рь'],
    description: 'Присмоктати весь язик до піднебіння і широко відкрити рот. Під\'язикова вуздечка стає натягнутою ніжкою грибка.',
    instructions: [
      'Широко посміхнись.',
      'Присмокчи язик до піднебіння, як у вправі «Конячка», але не відривай його!',
      'Повільно опускай нижню щелепу вниз, натягуючи «ніжку грибочка».',
      'Утримуй грибок у натягнутому стані під лічбу до 5-10.'
    ],
    repetition: '4-6 разів по 5-10 секунд',
    icon: 'Shield'
  },
  {
    id: 'tongue_painter',
    title: '«Маляр»',
    category: 'tongue',
    purpose: 'Розвиток координації та точного підйому кінчика язика по твердому піднебінню.',
    targetSounds: ['Р', 'Ш', 'Ж'],
    description: 'Відкрити рот, кінчиком язика плавно погладжувати піднебіння від верхніх зубів углиб рота та назад.',
    instructions: [
      'Відкрий ротик.',
      'Кінчик язика — це пензлик маляра, а піднебіння — стеля.',
      'Пофарбуй стелю: веди кінчиком язика вперед-назад, не поспішаючи.',
      'Нижня щелепа не рухається, працює тільки кінчик язичка.'
    ],
    repetition: '8-10 рухів вперед-назад',
    icon: 'Feather'
  },
  {
    id: 'tongue_jam',
    title: '«Смачне варення»',
    category: 'tongue',
    purpose: 'Розвиток руху передньої широкої частини язика вгору та формування кругового облизування губи.',
    targetSounds: ['Ш', 'Ж', 'Р'],
    description: 'Злегка відкрити рот і широким переднім краєм язика облизати верхню губу зверху вниз.',
    instructions: [
      'Уяви, що на верхню губку потрапило смачне полуничне варення.',
      'Широким язичком акуратно злижи його зверху вниз.',
      'Не ховай язичок одразу, роби рух плавним і широким.',
      'Нижня щелепа залишається нерухомою.'
    ],
    repetition: '6-8 разів',
    icon: 'Heart'
  },
  {
    id: 'breathing_football',
    title: '«Футбол» / «Забий гол»',
    category: 'breathing',
    purpose: 'Вироблення тривалого плавного та цілеспрямованого струменя видихуваного повітря.',
    targetSounds: ['С', 'З', 'Ш', 'Ж', 'Р'],
    description: 'Покласти ватну кульку на стіл між двома кубиками («воротами»). Подути на кульку, заганяючи її у ворота.',
    instructions: [
      'Посміхнись і поклади широкий язик на нижню губу («Лопатка»).',
      'Плавно подуй по серединці язика на кульку з вати.',
      'Щоки не надувай! Повітря повинно летіти вузькою цівкою.',
      'Забий 5 переможних голів!'
    ],
    repetition: '5-6 разів (з перервами на відпочинок, щоб не запаморочилась голова)',
    icon: 'Wind'
  },
  {
    id: 'breathing_breeze',
    title: '«Холодний вітерець»',
    category: 'breathing',
    purpose: 'Формування спрямованого холодного струменя повітря посередині язика для свистячих звуків.',
    targetSounds: ['С', 'З', 'Ц'],
    description: 'Широкий язик на нижній губі, вимовляти довгий звук [С-с-с], направляючи повітря на долоню біля підборіддя.',
    instructions: [
      'Піднеси долоньку до підборіддя.',
      'Зроби губки посмішкою, язичок лежить спокійно.',
      'Подуй легко: відчуй на руці холодний, свіжий вітерець!',
      'Стеж, щоб вітерець був холодним, а не теплим.'
    ],
    repetition: '4-5 разів по 3-4 секунди',
    icon: 'CloudRain'
  },
  {
    id: 'rhymes_whistle',
    title: 'Чистомовки на свистячі звуки [С], [З], [Ц]',
    category: 'rhymes',
    purpose: 'Автоматизація свистячих звуків у ритмічних римованих текстах.',
    targetSounds: ['С', 'З', 'Ц'],
    description: 'Повторення чистомовок з чіткою артикуляцією складових рядів та цілих речень.',
    instructions: [
      'Са-са-са — у саду летить оса.',
      'Су-су-су — я водички принесу.',
      'Сі-сі-сі — ми вмиваємося всі.',
      'За-за-за — на лужку пасеться кізка.',
      'Зу-зу-зу — не боюся я грозу.',
      'Ца-ца-ца — смачна й тепла паляниця.'
    ],
    repetition: 'Повторити кожну строфу по 2-3 рази',
    icon: 'MessageSquare'
  },
  {
    id: 'rhymes_hiss',
    title: 'Чистомовки на шиплячі звуки [Ш], [Ж], [Ч], [Щ]',
    category: 'rhymes',
    purpose: 'Автоматизація шиплячих звуків у складах, словах та фразах.',
    targetSounds: ['Ш', 'Ж', 'Ч', 'Щ'],
    description: 'Вимова з округленими губами трубочкою та піднятим чашечкою язиком.',
    instructions: [
      'Ша-ша-ша — наша каша хороша.',
      'Шу-шу-шу — я листок ворушу.',
      'Ши-ши-ши — ти листівку напиши.',
      'Жа-жа-жа — ми побачили вужа.',
      'Жу-жу-жу — я під дубом посиджу.',
      'Чу-чу-чу — на ракеті полечу.',
      'Ща-ща-ща — зловив тато ляща.'
    ],
    repetition: 'Повторити чітко й виразно',
    icon: 'Volume2'
  },
  {
    id: 'rhymes_sonor',
    title: 'Чистомовки та скоромовки на сонорні звуки [Р], [Л]',
    category: 'rhymes',
    purpose: 'Закріплення чіткої вимови сонорів, подолання замін [Р] на [Л] та пом\'якшень.',
    targetSounds: ['Р', 'Л'],
    description: 'Відпрацювання вібрації звука [Р] та твердого упору для [Л].',
    instructions: [
      'Ла-ла-ла — у ліску калина зацвіла.',
      'Ло-ло-ло — влітку тепло нам було.',
      'Ли-ли-ли — дружно ми ялинку вберегли.',
      'Ра-ра-ра — починається весела гра!',
      'Ро-ро-ро — у відерці є срібло.',
      'Ру-ру-ру — швидко ручки я потру.',
      'Скоромовка: Бубоніла баба бобу в брудному барлозі.'
    ],
    repetition: 'Промовити повільно, потім у звичайному темпі',
    icon: 'Music'
  }
];

export function getSpeechCards(): SpeechCard[] {
  const saved = localStorage.getItem('sadok_speech_cards');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (_) {}
  }
  localStorage.setItem('sadok_speech_cards', JSON.stringify(INITIAL_SPEECH_CARDS));
  return INITIAL_SPEECH_CARDS;
}

export function saveSpeechCard(rec: Partial<SpeechCard> & {
  CHILD_NAME: string;
  DIAGNOSIS: SpeechDiagnosisType;
}): SpeechCard[] {
  const current = getSpeechCards();
  let updated: SpeechCard[];
  let savedId: number;

  if (rec.ID) {
    savedId = rec.ID;
    updated = current.map(item => item.ID === rec.ID ? {
      ...item,
      ...rec,
      UPDATED_AT: new Date().toISOString().split('T')[0]
    } as SpeechCard : item);
  } else {
    savedId = current.length > 0 ? Math.max(...current.map(item => item.ID)) + 1 : 1;
    const newRecord: SpeechCard = {
      ID: savedId,
      CHILD_ID: rec.CHILD_ID || savedId,
      CHILD_NAME: rec.CHILD_NAME,
      GROUP_NAME: rec.GROUP_NAME || 'Група «Калинка»',
      BIRTH_DATE: rec.BIRTH_DATE || '2021-01-01',
      ENROLLMENT_DATE: rec.ENROLLMENT_DATE || new Date().toISOString().split('T')[0],
      DIAGNOSIS: rec.DIAGNOSIS,
      ARTICULATION_APPARATUS: rec.ARTICULATION_APPARATUS || 'Анатомічна будова без видимих патологій.',
      PHONEMIC_HEARING: rec.PHONEMIC_HEARING || 'Фонематичне сприймання в межах норми.',
      SOUND_STATUSES: rec.SOUND_STATUSES || [],
      VOCABULARY_LEVEL: rec.VOCABULARY_LEVEL || 'Відповідає віковим нормам.',
      GRAMMAR_STRUCTURE: rec.GRAMMAR_STRUCTURE || 'Граматичний лад сформований задовільно.',
      COHERENT_SPEECH: rec.COHERENT_SPEECH || 'Складає прості описові розповіді.',
      INDIVIDUAL_PLAN: rec.INDIVIDUAL_PLAN || '1) Артикуляційна гімнастика; 2) Постановка проблемних звуків; 3) Автоматизація у мовленні.',
      DYNAMICS: rec.DYNAMICS || 'Стабільний стан',
      LOGOPED_CONCLUSION: rec.LOGOPED_CONCLUSION || `${rec.DIAGNOSIS}. Рекомендовано регулярні логопедичні заняття.`,
      UPDATED_AT: new Date().toISOString().split('T')[0]
    };
    updated = [newRecord, ...current];
  }

  localStorage.setItem('sadok_speech_cards', JSON.stringify(updated));
  queueCurrentSyncEntity('speech_card', String(savedId), 'upsert', !rec.ID);
  return updated;
}

export function deleteSpeechCard(id: number): SpeechCard[] {
  const current = getSpeechCards();
  const target = current.find(item => item.ID === id);
  queueCurrentSyncEntity('speech_card', String(id), 'delete', false, target as unknown as Record<string, unknown>);
  const updated = current.filter(item => item.ID !== id);
  localStorage.setItem('sadok_speech_cards', JSON.stringify(updated));
  return updated;
}

export function getSpeechDailyLogEntries(): SpeechDailyLogEntry[] {
  const saved = localStorage.getItem('sadok_speech_daily_logs');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (_) {}
  }
  localStorage.setItem('sadok_speech_daily_logs', JSON.stringify(INITIAL_SPEECH_DAILY_LOG));
  return INITIAL_SPEECH_DAILY_LOG;
}

export function saveSpeechDailyLogEntry(rec: Partial<SpeechDailyLogEntry> & {
  ACTIVITY_TYPE: SpeechDailyActivityType;
  TOPIC: string;
  HOURS_SPENT: number;
}): SpeechDailyLogEntry[] {
  const current = getSpeechDailyLogEntries();
  let updated: SpeechDailyLogEntry[];
  let savedId: number;

  if (rec.ID) {
    savedId = rec.ID;
    updated = current.map(item => item.ID === rec.ID ? { ...item, ...rec } as SpeechDailyLogEntry : item);
  } else {
    savedId = current.length > 0 ? Math.max(...current.map(item => item.ID)) + 1 : 1;
    const newRecord: SpeechDailyLogEntry = {
      ID: savedId,
      DATE: rec.DATE || new Date().toISOString().split('T')[0],
      ACTIVITY_TYPE: rec.ACTIVITY_TYPE,
      CATEGORY: rec.CATEGORY || 'Діти',
      TARGET_NAME: rec.TARGET_NAME || 'Вихованці логопункту',
      CHILD_ID: rec.CHILD_ID,
      GROUP_NAME: rec.GROUP_NAME,
      SOUND_TARGET: rec.SOUND_TARGET,
      TOPIC: rec.TOPIC,
      HOURS_SPENT: Number(rec.HOURS_SPENT) || 0.5,
      RESULTS_NOTES: rec.RESULTS_NOTES || '',
      CREATED_AT: new Date().toISOString().split('T')[0]
    };
    updated = [newRecord, ...current];
  }

  localStorage.setItem('sadok_speech_daily_logs', JSON.stringify(updated));
  queueCurrentSyncEntity('speech_daily_log', String(savedId), 'upsert', !rec.ID);
  return updated;
}

export function deleteSpeechDailyLogEntry(id: number): SpeechDailyLogEntry[] {
  const current = getSpeechDailyLogEntries();
  const target = current.find(item => item.ID === id);
  queueCurrentSyncEntity('speech_daily_log', String(id), 'delete', false, target as unknown as Record<string, unknown>);
  const updated = current.filter(item => item.ID !== id);
  localStorage.setItem('sadok_speech_daily_logs', JSON.stringify(updated));
  return updated;
}

export function getArticulationExercises(): ArticulationExercise[] {
  return INITIAL_ARTICULATION_EXERCISES;
}

export {
  PEDAGOGICAL_COLLECTIVE,
  PEDAGOGICAL_DEPARTMENTS,
  getStaffByDepartment,
  searchStaff,
  getStaffStats,
  type PedagogicalDepartment,
  type PedagogicalStaffMember
} from '../domain/pedagogicalCollective';

