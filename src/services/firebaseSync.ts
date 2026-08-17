import type { AuditEntry } from './governance';
import {
  getPendingAuditEntries,
  markAuditEntriesSynced,
  saveSyncState,
  getSyncState,
} from './governance';
import {
  applyRemoteSyncEntity,
  exportLocalSyncEntities,
  markLocalSyncEntityRevision,
  persistRemoteSyncEntities,
} from './db';
import {
  getEntitySyncConflicts,
  getEntitySyncCursor,
  getPendingEntityMutations,
  isEntityBootstrapComplete,
  markEntityBootstrapComplete,
  markEntityMutationsSynced,
  removeEntityMutationsForSyncId,
  removeEntitySyncConflict,
  replaceEntityMutation,
  saveEntitySyncConflict,
  saveEntitySyncCursor,
  type EntitySyncConflict,
  type RemoteEntityDocument,
} from './entitySyncQueue';
import { entityTypeOrder, hasEntityRevisionConflict } from '../domain/entitySync';

export interface FirebaseCapability {
  configured: boolean;
  projectId: string;
  organizationId: string;
}

interface FirebaseContext {
  auth: import('firebase/auth').Auth;
  db: import('firebase/firestore').Firestore;
  organizationId: string;
}

export interface FullSyncResult {
  auditUploaded: number;
  entitiesUploaded: number;
  entitiesDownloaded: number;
  conflicts: number;
  bootstrapped: number;
}

let contextPromise: Promise<FirebaseContext> | null = null;

function readFirebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    organizationId: import.meta.env.VITE_FIREBASE_ORGANIZATION_ID || '',
  };
}

export function getFirebaseCapability(): FirebaseCapability {
  const config = readFirebaseConfig();
  return {
    configured: Boolean(config.apiKey && config.authDomain && config.projectId && config.appId && config.organizationId),
    projectId: config.projectId,
    organizationId: config.organizationId,
  };
}

async function getFirebaseContext(): Promise<FirebaseContext> {
  if (contextPromise) return contextPromise;
  contextPromise = (async () => {
    const config = readFirebaseConfig();
    if (!getFirebaseCapability().configured) {
      throw new Error('Firebase ще не налаштовано для цього закладу');
    }

    const [appModule, authModule, firestoreModule] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]);
    const app = appModule.getApps()[0] || appModule.initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket || undefined,
      messagingSenderId: config.messagingSenderId || undefined,
      appId: config.appId,
    });
    const auth = authModule.getAuth(app);
    const db = firestoreModule.initializeFirestore(app, {
      localCache: firestoreModule.persistentLocalCache({
        tabManager: firestoreModule.persistentMultipleTabManager(),
      }),
    });
    return { auth, db, organizationId: config.organizationId };
  })();
  return contextPromise;
}

function isRemoteEntityDocument(value: unknown): value is RemoteEntityDocument {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<RemoteEntityDocument>;
  return ['product', 'dish', 'recipe_component', 'dish_nutrition_profile'].includes(String(candidate.entityType))
    && typeof candidate.syncId === 'string'
    && typeof candidate.revision === 'number'
    && typeof candidate.updatedAt === 'string';
}

function remoteFromSnapshot(snapshot: { id: string; data(): unknown }): RemoteEntityDocument | null {
  const value = snapshot.data();
  if (!isRemoteEntityDocument(value)) return null;
  return { ...value, syncId: value.syncId || snapshot.id };
}

function maxUpdatedAt(documents: RemoteEntityDocument[]): string {
  return documents.reduce((latest, document) => (
    document.updatedAt > latest ? document.updatedAt : latest
  ), getEntitySyncCursor());
}

async function bootstrapEntityCollection(
  context: FirebaseContext,
  firestoreModule: typeof import('firebase/firestore'),
  authUid: string,
): Promise<number> {
  if (isEntityBootstrapComplete()) return 0;
  const collectionReference = firestoreModule.collection(
    context.db, 'organizations', context.organizationId, 'entities',
  );
  const cloudSnapshot = await firestoreModule.getDocs(collectionReference);
  const cloudDocuments = cloudSnapshot.docs
    .map(remoteFromSnapshot)
    .filter((value): value is RemoteEntityDocument => Boolean(value));

  if (cloudDocuments.length > 0) {
    cloudDocuments
      .sort((left, right) => entityTypeOrder(left.entityType, left.deleted) - entityTypeOrder(right.entityType, right.deleted))
      .forEach(applyRemoteSyncEntity);
    persistRemoteSyncEntities();
    saveEntitySyncCursor(maxUpdatedAt(cloudDocuments));
    markEntityBootstrapComplete();
    return 0;
  }

  const localEntities = exportLocalSyncEntities();
  const updatedAt = new Date().toISOString();
  const deviceId = localStorage.getItem('sadok_device_id') || '';
  for (let offset = 0; offset < localEntities.length; offset += 350) {
    const batch = firestoreModule.writeBatch(context.db);
    const chunk = localEntities.slice(offset, offset + 350);
    chunk.forEach(entity => {
      const reference = firestoreModule.doc(collectionReference, entity.syncId);
      batch.set(reference, {
        entityType: entity.entityType,
        syncId: entity.syncId,
        payload: entity.payload,
        deleted: false,
        revision: 1,
        updatedAt,
        updatedBy: authUid,
        deviceId,
      });
    });
    await batch.commit();
    chunk.forEach(entity => markLocalSyncEntityRevision(entity.syncId, 1, updatedAt, deviceId, false));
  }
  markEntityMutationsSynced(getPendingEntityMutations().map(item => item.id));
  persistRemoteSyncEntities();
  saveEntitySyncCursor(updatedAt);
  markEntityBootstrapComplete();
  return localEntities.length;
}

async function uploadPendingEntities(
  context: FirebaseContext,
  firestoreModule: typeof import('firebase/firestore'),
  authUid: string,
): Promise<number> {
  const pending = getPendingEntityMutations();
  const completed: string[] = [];
  let uploaded = 0;

  for (const mutation of pending) {
    const reference = firestoreModule.doc(
      context.db, 'organizations', context.organizationId, 'entities', mutation.syncId,
    );
    const result = await firestoreModule.runTransaction(context.db, async transaction => {
      const snapshot = await transaction.get(reference);
      const remote = snapshot.exists() ? remoteFromSnapshot(snapshot) : null;
      if (remote && hasEntityRevisionConflict({
        baseRevision: mutation.baseRevision,
        remoteRevision: remote.revision,
        localDeviceId: mutation.deviceId,
        remoteDeviceId: remote.deviceId,
      })) {
        return { conflict: remote } as const;
      }
      const revision = (remote?.revision || 0) + 1;
      const updatedAt = new Date().toISOString();
      const document: RemoteEntityDocument = {
        entityType: mutation.entityType,
        syncId: mutation.syncId,
        payload: mutation.payload,
        deleted: mutation.operation === 'delete',
        revision,
        updatedAt,
        updatedBy: authUid,
        deviceId: mutation.deviceId,
      };
      transaction.set(reference, document);
      return { document } as const;
    });

    if ('conflict' in result) {
      saveEntitySyncConflict(mutation, result.conflict);
      continue;
    }
    completed.push(mutation.id);
    uploaded += 1;
    markLocalSyncEntityRevision(
      mutation.syncId,
      result.document.revision,
      result.document.updatedAt,
      result.document.deviceId,
      result.document.deleted,
    );
    if (result.document.updatedAt > getEntitySyncCursor()) {
      saveEntitySyncCursor(result.document.updatedAt);
    }
  }

  if (completed.length > 0) {
    markEntityMutationsSynced(completed);
    persistRemoteSyncEntities();
  }
  return uploaded;
}

async function downloadRemoteEntities(
  context: FirebaseContext,
  firestoreModule: typeof import('firebase/firestore'),
): Promise<number> {
  const collectionReference = firestoreModule.collection(
    context.db, 'organizations', context.organizationId, 'entities',
  );
  const cursor = getEntitySyncCursor();
  const remoteQuery = cursor
    ? firestoreModule.query(
      collectionReference,
      firestoreModule.where('updatedAt', '>', cursor),
      firestoreModule.orderBy('updatedAt'),
    )
    : firestoreModule.query(collectionReference, firestoreModule.orderBy('updatedAt'));
  const snapshot = await firestoreModule.getDocs(remoteQuery);
  const documents = snapshot.docs
    .map(remoteFromSnapshot)
    .filter((value): value is RemoteEntityDocument => Boolean(value))
    .sort((left, right) => entityTypeOrder(left.entityType, left.deleted) - entityTypeOrder(right.entityType, right.deleted));
  const pendingBySyncId = new Map(getPendingEntityMutations().map(item => [item.syncId, item]));
  let applied = 0;

  documents.forEach(remote => {
    const pending = pendingBySyncId.get(remote.syncId);
    if (pending && hasEntityRevisionConflict({
      baseRevision: pending.baseRevision,
      remoteRevision: remote.revision,
      localDeviceId: pending.deviceId,
      remoteDeviceId: remote.deviceId,
    })) {
      saveEntitySyncConflict(pending, remote);
      return;
    }
    applyRemoteSyncEntity(remote);
    applied += 1;
  });

  if (documents.length > 0) {
    persistRemoteSyncEntities();
    saveEntitySyncCursor(maxUpdatedAt(documents));
  }
  return applied;
}

export async function getFirebaseUser(): Promise<import('firebase/auth').User | null> {
  const { auth } = await getFirebaseContext();
  await auth.authStateReady();
  return auth.currentUser;
}

export async function signInToFirebase(email: string, password: string): Promise<string> {
  const [{ auth }, authModule] = await Promise.all([getFirebaseContext(), import('firebase/auth')]);
  const credential = await authModule.signInWithEmailAndPassword(auth, email, password);
  return credential.user.email || credential.user.uid;
}

export async function signOutFromFirebase(): Promise<void> {
  const [{ auth }, authModule] = await Promise.all([getFirebaseContext(), import('firebase/auth')]);
  await authModule.signOut(auth);
}

function cloudAuditPayload(entry: AuditEntry, authUid: string) {
  return {
    ...entry,
    authUid,
    schemaVersion: 1,
  };
}

export async function synchronizePendingAudit(): Promise<number> {
  if (!navigator.onLine) throw new Error('Немає інтернету. Зміни залишилися в локальній черзі.');
  const state = getSyncState();
  const attemptAt = new Date().toISOString();

  try {
    const [{ auth, db, organizationId }, firestoreModule] = await Promise.all([
      getFirebaseContext(),
      import('firebase/firestore'),
    ]);
    await auth.authStateReady();
    if (!auth.currentUser) throw new Error('Увійдіть до Firebase перед синхронізацією');

    const pending = getPendingAuditEntries().slice(0, 400);
    if (pending.length === 0) {
      saveSyncState({ ...state, lastAttempt: attemptAt, lastSuccessfulSync: attemptAt, lastError: null });
      return 0;
    }

    const batch = firestoreModule.writeBatch(db);
    pending.forEach(entry => {
      const reference = firestoreModule.doc(
        db,
        'organizations', organizationId,
        'auditEvents', entry.id,
      );
      batch.set(reference, cloudAuditPayload(entry, auth.currentUser!.uid));
    });
    await batch.commit();
    markAuditEntriesSynced(pending.map(entry => entry.id));
    saveSyncState({ ...state, lastAttempt: attemptAt, lastSuccessfulSync: attemptAt, lastError: null });
    return pending.length;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    saveSyncState({ ...state, lastAttempt: attemptAt, lastError: message });
    throw error;
  }
}

async function performFullSynchronization(): Promise<FullSyncResult> {
  if (!navigator.onLine) throw new Error('Немає інтернету. Зміни безпечно залишилися на пристрої.');
  const state = getSyncState();
  const attemptAt = new Date().toISOString();
  try {
    const [context, firestoreModule] = await Promise.all([
      getFirebaseContext(),
      import('firebase/firestore'),
    ]);
    await context.auth.authStateReady();
    if (!context.auth.currentUser) throw new Error('Увійдіть до Firebase перед синхронізацією');
    const authUid = context.auth.currentUser.uid;
    const bootstrapped = await bootstrapEntityCollection(context, firestoreModule, authUid);
    const entitiesUploaded = await uploadPendingEntities(context, firestoreModule, authUid);
    const entitiesDownloaded = await downloadRemoteEntities(context, firestoreModule);
    const auditUploaded = await synchronizePendingAudit();
    const completedAt = new Date().toISOString();
    saveSyncState({
      ...state,
      lastAttempt: attemptAt,
      lastSuccessfulSync: completedAt,
      lastError: null,
    });
    return {
      auditUploaded,
      entitiesUploaded,
      entitiesDownloaded,
      conflicts: getEntitySyncConflicts().length,
      bootstrapped,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    saveSyncState({ ...state, lastAttempt: attemptAt, lastError: message });
    throw error;
  }
}

let activeFullSync: Promise<FullSyncResult> | null = null;

export function synchronizeAllPending(): Promise<FullSyncResult> {
  if (activeFullSync) return activeFullSync;
  const execute = () => performFullSynchronization();
  const promise: Promise<FullSyncResult> = navigator.locks
    ? navigator.locks.request('sadok-firebase-full-sync', execute) as unknown as Promise<FullSyncResult>
    : execute();
  activeFullSync = promise.finally(() => {
    activeFullSync = null;
  });
  return activeFullSync;
}

export async function resolveEntitySyncConflict(
  conflict: EntitySyncConflict,
  strategy: 'cloud' | 'local',
): Promise<void> {
  if (strategy === 'cloud') {
    applyRemoteSyncEntity(conflict.remote);
    persistRemoteSyncEntities();
    removeEntityMutationsForSyncId(conflict.syncId);
    removeEntitySyncConflict(conflict.id);
    return;
  }
  replaceEntityMutation({
    ...conflict.local,
    baseRevision: conflict.remote.revision,
    occurredAt: new Date().toISOString(),
    status: 'pending',
  });
  removeEntitySyncConflict(conflict.id);
}

export function startAutomaticFirebaseSync(): () => void {
  let stopped = false;
  let running = false;
  const run = async () => {
    if (stopped || running || !navigator.onLine || getSyncState().mode !== 'firebase') return;
    running = true;
    try {
      const user = await getFirebaseUser();
      if (user) await synchronizeAllPending();
    } catch (error) {
      console.warn('[Sync] Automatic synchronization postponed:', error);
    } finally {
      running = false;
    }
  };
  const timer = window.setInterval(() => void run(), 60_000);
  const onlineHandler = () => void run();
  window.addEventListener('online', onlineHandler);
  window.setTimeout(() => void run(), 2_000);
  return () => {
    stopped = true;
    window.clearInterval(timer);
    window.removeEventListener('online', onlineHandler);
  };
}
