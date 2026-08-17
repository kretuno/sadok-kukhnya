import type { AuditEntry } from './governance';
import {
  clearCloudCurrentUser,
  getCloudCurrentUser,
  getPendingAuditEntries,
  markAuditEntriesSynced,
  recordAudit,
  setCloudCurrentUser,
  saveSyncState,
  getSyncState,
} from './governance';
import {
  applyRemoteSyncEntity,
  exportLocalSyncEntities,
  markLocalSyncEntityRevision,
  persistRemoteSyncEntities,
  reconcileLocalBootstrapSnapshot,
} from './db';
import {
  getEntitySyncConflicts,
  getEntitySyncCursor,
  getPendingEntityMutations,
  isEntityBootstrapComplete,
  isOperationalBootstrapComplete,
  markEntityBootstrapComplete,
  markOperationalBootstrapComplete,
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
import type { SyncEntityType } from './entitySyncQueue';
import { parseCloudMembership } from '../domain/cloudIdentity';
import type { CloudUserRole } from '../domain/cloudIdentity';
import { validateCloudUserDraft, type CloudUserDraft } from '../domain/cloudUserProvisioning';

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

export interface OrganizationMember {
  uid: string;
  displayName: string;
  email: string;
  role: CloudUserRole;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

let contextPromise: Promise<FirebaseContext> | null = null;

const CATALOG_ENTITY_TYPES: SyncEntityType[] = [
  'product', 'dish', 'recipe_component', 'dish_nutrition_profile',
];
const OPERATIONAL_ENTITY_TYPES: SyncEntityType[] = [
  'menu_entry', 'menu_approval', 'supplier', 'invoice', 'stock_batch',
];
const ALL_ENTITY_TYPES = [...CATALOG_ENTITY_TYPES, ...OPERATIONAL_ENTITY_TYPES];

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
  return ALL_ENTITY_TYPES.includes(String(candidate.entityType) as SyncEntityType)
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
  const cloudSnapshot = await firestoreModule.getDocs(firestoreModule.query(
    collectionReference,
    firestoreModule.where('entityType', 'in', CATALOG_ENTITY_TYPES),
  ));
  const cloudDocuments = cloudSnapshot.docs
    .map(remoteFromSnapshot)
    .filter((value): value is RemoteEntityDocument => Boolean(value));

  if (cloudDocuments.length > 0) {
    reconcileLocalBootstrapSnapshot(
      cloudDocuments.map(document => document.syncId),
      getPendingEntityMutations().map(mutation => mutation.syncId),
      CATALOG_ENTITY_TYPES,
    );
    cloudDocuments
      .sort((left, right) => entityTypeOrder(left.entityType, left.deleted) - entityTypeOrder(right.entityType, right.deleted))
      .forEach(applyRemoteSyncEntity);
    persistRemoteSyncEntities();
    markEntityBootstrapComplete();
    return 0;
  }

  const localEntities = exportLocalSyncEntities(CATALOG_ENTITY_TYPES);
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
  markEntityMutationsSynced(getPendingEntityMutations()
    .filter(item => CATALOG_ENTITY_TYPES.includes(item.entityType))
    .map(item => item.id));
  persistRemoteSyncEntities();
  markEntityBootstrapComplete();
  return localEntities.length;
}

async function bootstrapOperationalCollection(
  context: FirebaseContext,
  firestoreModule: typeof import('firebase/firestore'),
  authUid: string,
): Promise<number> {
  if (isOperationalBootstrapComplete()) return 0;
  const collectionReference = firestoreModule.collection(
    context.db, 'organizations', context.organizationId, 'entities',
  );
  const cloudSnapshot = await firestoreModule.getDocs(firestoreModule.query(
    collectionReference,
    firestoreModule.where('entityType', 'in', OPERATIONAL_ENTITY_TYPES),
  ));
  const cloudDocuments = cloudSnapshot.docs
    .map(remoteFromSnapshot)
    .filter((value): value is RemoteEntityDocument => Boolean(value));

  if (cloudDocuments.length > 0) {
    reconcileLocalBootstrapSnapshot(
      cloudDocuments.map(document => document.syncId),
      getPendingEntityMutations().map(mutation => mutation.syncId),
      OPERATIONAL_ENTITY_TYPES,
    );
    cloudDocuments
      .sort((left, right) => entityTypeOrder(left.entityType, left.deleted) - entityTypeOrder(right.entityType, right.deleted))
      .forEach(applyRemoteSyncEntity);
    persistRemoteSyncEntities();
    markOperationalBootstrapComplete();
    return 0;
  }

  const localEntities = exportLocalSyncEntities(OPERATIONAL_ENTITY_TYPES);
  const updatedAt = new Date().toISOString();
  const deviceId = localStorage.getItem('sadok_device_id') || '';
  for (let offset = 0; offset < localEntities.length; offset += 350) {
    const batch = firestoreModule.writeBatch(context.db);
    const chunk = localEntities.slice(offset, offset + 350);
    chunk.forEach(entity => {
      batch.set(firestoreModule.doc(collectionReference, entity.syncId), {
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
  markEntityMutationsSynced(getPendingEntityMutations()
    .filter(item => OPERATIONAL_ENTITY_TYPES.includes(item.entityType))
    .map(item => item.id));
  persistRemoteSyncEntities();
  markOperationalBootstrapComplete();
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

async function activateFirebaseMembership(
  user: import('firebase/auth').User,
  recordLogin: boolean,
): Promise<void> {
  const [{ db, organizationId }, firestoreModule] = await Promise.all([
    getFirebaseContext(),
    import('firebase/firestore'),
  ]);
  const membershipReference = firestoreModule.doc(
    db, 'organizations', organizationId, 'members', user.uid,
  );
  try {
    const membership = await firestoreModule.getDoc(membershipReference);
    if (!membership.exists()) {
      clearCloudCurrentUser();
      throw new Error('Обліковий запис не додано до цього закладу');
    }
    const identity = parseCloudMembership(user.uid, user.email, membership.data());
    setCloudCurrentUser(identity, recordLogin);
  } catch (error) {
    const code = String((error as { code?: unknown })?.code || '');
    const cached = getCloudCurrentUser();
    const canUseOfflineIdentity = ['unavailable', 'failed-precondition', 'auth/network-request-failed'].includes(code);
    if (canUseOfflineIdentity && cached?.id === `firebase-${user.uid}`) return;
    clearCloudCurrentUser();
    throw error;
  }
}

export async function getFirebaseUser(): Promise<import('firebase/auth').User | null> {
  const { auth } = await getFirebaseContext();
  await auth.authStateReady();
  if (!auth.currentUser) {
    clearCloudCurrentUser();
    return null;
  }
  await activateFirebaseMembership(auth.currentUser, false);
  return auth.currentUser;
}

export async function signInToFirebase(email: string, password: string): Promise<string> {
  const [{ auth }, authModule] = await Promise.all([getFirebaseContext(), import('firebase/auth')]);
  const credential = await authModule.signInWithEmailAndPassword(auth, email, password);
  try {
    await activateFirebaseMembership(credential.user, true);
  } catch (error) {
    await authModule.signOut(auth);
    clearCloudCurrentUser();
    throw error;
  }
  return credential.user.email || credential.user.uid;
}

export async function signOutFromFirebase(): Promise<void> {
  const [{ auth }, authModule] = await Promise.all([getFirebaseContext(), import('firebase/auth')]);
  await authModule.signOut(auth);
  clearCloudCurrentUser();
}

function assertCanManageCloudUsers(): void {
  const identity = getCloudCurrentUser();
  if (!identity || !['admin', 'director'].includes(identity.role)) {
    throw new Error('Керування хмарними користувачами доступне лише адміністратору або директору');
  }
}

function assertCanAssignCloudRole(role: CloudUserRole): void {
  const identity = getCloudCurrentUser();
  if (identity?.role === 'director' && role === 'admin') {
    throw new Error('Директор не може призначати роль адміністратора');
  }
}

export async function listOrganizationMembers(): Promise<OrganizationMember[]> {
  assertCanManageCloudUsers();
  const [{ db, organizationId }, firestoreModule] = await Promise.all([
    getFirebaseContext(),
    import('firebase/firestore'),
  ]);
  const snapshot = await firestoreModule.getDocs(firestoreModule.collection(
    db, 'organizations', organizationId, 'members',
  ));
  return snapshot.docs.map(document => {
    const value = document.data();
    return {
      uid: document.id,
      displayName: String(value.displayName || value.name || value.email || document.id),
      email: String(value.email || ''),
      role: String(value.role || 'nurse') as CloudUserRole,
      active: value.active === true,
      createdAt: value.createdAt ? String(value.createdAt) : undefined,
      updatedAt: value.updatedAt ? String(value.updatedAt) : undefined,
    };
  }).sort((left, right) => left.displayName.localeCompare(right.displayName, 'uk'));
}

export async function createOrganizationMember(
  draft: CloudUserDraft,
): Promise<OrganizationMember & { passwordResetSent: boolean }> {
  assertCanManageCloudUsers();
  assertCanAssignCloudRole(draft.role);
  const validationErrors = validateCloudUserDraft(draft);
  if (validationErrors.length > 0) throw new Error(validationErrors.join('. '));
  if (!navigator.onLine) throw new Error('Для створення облікового запису потрібен інтернет');

  const [{ auth, db, organizationId }, appModule, authModule, firestoreModule] = await Promise.all([
    getFirebaseContext(),
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ]);
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error('Увійдіть до Firebase як адміністратор');

  const config = readFirebaseConfig();
  const secondaryApp = appModule.initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket || undefined,
    messagingSenderId: config.messagingSenderId || undefined,
    appId: config.appId,
  }, `sadok-user-provision-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const secondaryAuth = authModule.getAuth(secondaryApp);
  await authModule.setPersistence(secondaryAuth, authModule.inMemoryPersistence);
  let credential: import('firebase/auth').UserCredential | null = null;
  let membershipCreated = false;
  try {
    credential = await authModule.createUserWithEmailAndPassword(
      secondaryAuth, draft.email.trim().toLowerCase(), draft.password,
    );
    await authModule.updateProfile(credential.user, { displayName: draft.displayName.trim() });
    const createdAt = new Date().toISOString();
    const member: OrganizationMember = {
      uid: credential.user.uid,
      displayName: draft.displayName.trim(),
      email: draft.email.trim().toLowerCase(),
      role: draft.role,
      active: draft.active,
      createdAt,
    };
    await firestoreModule.setDoc(firestoreModule.doc(
      db, 'organizations', organizationId, 'members', member.uid,
    ), {
      displayName: member.displayName,
      email: member.email,
      role: member.role,
      active: member.active,
      createdAt,
      createdBy: auth.currentUser.uid,
    });
    membershipCreated = true;
    const passwordResetSent = draft.sendPasswordReset
      ? await authModule.sendPasswordResetEmail(auth, member.email).then(() => true).catch(() => false)
      : false;
    recordAudit({
      action: 'create',
      entityType: 'cloud_user',
      entityId: member.uid,
      summary: `Створено хмарний обліковий запис «${member.displayName}» (${member.role})`,
      after: { ...member, passwordResetSent },
    });
    return { ...member, passwordResetSent };
  } catch (error) {
    if (credential && !membershipCreated) await credential.user.delete().catch(() => undefined);
    throw error;
  } finally {
    await authModule.signOut(secondaryAuth).catch(() => undefined);
    await appModule.deleteApp(secondaryApp).catch(() => undefined);
  }
}

export async function updateOrganizationMember(
  uid: string,
  updates: Pick<OrganizationMember, 'role' | 'active'>,
): Promise<void> {
  assertCanManageCloudUsers();
  assertCanAssignCloudRole(updates.role);
  const [{ auth, db, organizationId }, firestoreModule] = await Promise.all([
    getFirebaseContext(),
    import('firebase/firestore'),
  ]);
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error('Увійдіть до Firebase як адміністратор');
  if (auth.currentUser.uid === uid) throw new Error('Не можна змінити роль або вимкнути власний обліковий запис');
  await firestoreModule.updateDoc(firestoreModule.doc(
    db, 'organizations', organizationId, 'members', uid,
  ), {
    role: updates.role,
    active: updates.active,
    updatedAt: new Date().toISOString(),
    updatedBy: auth.currentUser.uid,
  });
  recordAudit({
    action: 'update',
    entityType: 'cloud_user',
    entityId: uid,
    summary: `Оновлено роль або стан доступу хмарного користувача`,
    after: updates,
  });
}

export async function sendOrganizationPasswordReset(email: string): Promise<void> {
  assertCanManageCloudUsers();
  if (!email) throw new Error('Для користувача не вказано email');
  const [{ auth }, authModule] = await Promise.all([getFirebaseContext(), import('firebase/auth')]);
  await authModule.sendPasswordResetEmail(auth, email);
  recordAudit({
    action: 'update',
    entityType: 'cloud_user_password',
    summary: `Надіслано лист для зміни пароля: ${email}`,
  });
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
    const catalogBootstrapped = await bootstrapEntityCollection(context, firestoreModule, authUid);
    const operationalBootstrapped = await bootstrapOperationalCollection(context, firestoreModule, authUid);
    const bootstrapped = catalogBootstrapped + operationalBootstrapped;
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
