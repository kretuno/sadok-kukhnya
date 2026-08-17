const DURABILITY_DATABASE = 'sadok_durability_v1';
const DURABILITY_STORE = 'state';
const LOCAL_STATE_KEY = 'local-storage-mirror';

export interface StorageDurabilityStatus {
  supported: boolean;
  persisted: boolean;
  usageBytes: number;
  quotaBytes: number;
}

function openDurabilityDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DURABILITY_DATABASE, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DURABILITY_STORE)) {
        database.createObjectStore(DURABILITY_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readDurableValue<T>(key: string): Promise<T | null> {
  const database = await openDurabilityDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(DURABILITY_STORE, 'readonly');
    const request = transaction.objectStore(DURABILITY_STORE).get(key);
    request.onsuccess = () => resolve((request.result as T) ?? null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

async function writeDurableValue(key: string, value: unknown): Promise<void> {
  const database = await openDurabilityDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(DURABILITY_STORE, 'readwrite');
    transaction.objectStore(DURABILITY_STORE).put(value, key);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

function collectApplicationLocalStorage(): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || (!key.startsWith('sadok_') && !key.startsWith('medsestra_'))) continue;
    const value = localStorage.getItem(key);
    if (value !== null && key !== 'sadok_sqlite_db_b64') snapshot[key] = value;
  }
  return snapshot;
}

export async function restoreDurableLocalState(): Promise<number> {
  if (typeof indexedDB === 'undefined') return 0;
  const snapshot = await readDurableValue<Record<string, string>>(LOCAL_STATE_KEY);
  if (!snapshot) return 0;

  let restored = 0;
  Object.entries(snapshot).forEach(([key, value]) => {
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, value);
      restored += 1;
    }
  });
  return restored;
}

export async function persistDurableLocalState(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  await writeDurableValue(LOCAL_STATE_KEY, collectApplicationLocalStorage());
  localStorage.setItem('sadok_local_mirror_at', new Date().toISOString());
}

let mirrorTimer: number | undefined;

export function scheduleDurableLocalState(): void {
  window.clearTimeout(mirrorTimer);
  mirrorTimer = window.setTimeout(() => {
    void persistDurableLocalState().catch(error => {
      console.warn('[Storage] Local state mirror failed:', error);
    });
  }, 350);
}

export async function ensurePersistentBrowserStorage(): Promise<StorageDurabilityStatus> {
  const storage = navigator.storage;
  if (!storage) {
    return { supported: false, persisted: false, usageBytes: 0, quotaBytes: 0 };
  }

  let persisted = await storage.persisted?.() ?? false;
  if (!persisted && storage.persist) persisted = await storage.persist();
  const estimate = await storage.estimate();
  return {
    supported: true,
    persisted,
    usageBytes: estimate.usage ?? 0,
    quotaBytes: estimate.quota ?? 0,
  };
}
