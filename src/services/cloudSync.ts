// -----------------------------------------------------------------
// SADOK Shared Cloud Sync Service (Multi-Client Real-Time Synchronization)
// -----------------------------------------------------------------

const CLOUD_SYNC_KEY = 'sadok_cloud_sync_endpoint';
// Public multi-client sync bin endpoint for KZDO 145 KMR
const DEFAULT_SYNC_URL = 'https://crudcrud.com/api/501e1475ab9144e7a24094613f062618/sadok_sync';

export interface CloudSyncState {
  lastSyncTime: string;
  deviceInfo: string;
  databaseB64?: string;
  propertyItems?: any[];
  groups?: any[];
  employees?: any[];
  children?: any[];
}

export async function pushStateToCloud(data: Partial<CloudSyncState>): Promise<boolean> {
  try {
    const payload = {
      updatedAt: new Date().toISOString(),
      device: navigator.userAgent.slice(0, 50),
      ...data
    };

    // Save to LocalStorage first
    localStorage.setItem('sadok_last_cloud_push', new Date().toISOString());

    // Push to shared REST Endpoint
    const res = await fetch(DEFAULT_SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.log('[CloudSync] Successfully pushed data state to Cloud!');
      return true;
    }
  } catch (err) {
    console.warn('[CloudSync] Remote push failed (working in offline mode):', err);
  }
  return false;
}

export async function pullStateFromCloud(): Promise<CloudSyncState | null> {
  try {
    const res = await fetch(DEFAULT_SYNC_URL);
    if (res.ok) {
      const records = await res.json();
      if (Array.isArray(records) && records.length > 0) {
        // Return the latest record
        const latest = records[records.length - 1];
        console.log('[CloudSync] Retrieved remote cloud state from:', latest.updatedAt);
        return latest;
      }
    }
  } catch (err) {
    console.warn('[CloudSync] Remote pull failed:', err);
  }
  return null;
}
