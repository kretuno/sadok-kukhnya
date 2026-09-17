import {
  clearCloudCurrentUser,
  ensureAuditSyncScope,
  getCloudCurrentUser,
  getCloudIdentityCache,
  getDeviceId,
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
  ensureEntitySyncScope,
  isEntityBootstrapComplete,
  isOperationalBootstrapComplete,
  isStructureBootstrapComplete,
  markEntityBootstrapComplete,
  markOperationalBootstrapComplete,
  markStructureBootstrapComplete,
  markEntityMutationsSynced,
  removeEntityMutationsForSyncId,
  removeEntitySyncConflict,
  resetEntityBootstrapState,
  replaceEntityMutation,
  saveEntitySyncConflict,
  saveEntitySyncCursor,
  type EntitySyncConflict,
  type RemoteEntityDocument,
} from './entitySyncQueue';
import { entityTypeOrder, hasEntityRevisionConflict } from '../domain/entitySync';
import type { SyncEntityType } from './entitySyncQueue';
import { canReuseCachedCloudIdentity, parseCloudMembership } from '../domain/cloudIdentity';
import type { CloudUserRole } from '../domain/cloudIdentity';
import { validateCloudUserDraft, type CloudUserDraft } from '../domain/cloudUserProvisioning';
import {
  assertCloudBootstrapAllowed,
  buildAuthoritativeBootstrapDocuments,
  decideCloudInitialization,
  selectBootstrapSource,
  type CloudInitializationDecision,
  type CloudInitializationMetadata,
} from '../domain/cloudBootstrap';
import { APP_VERSION } from '../config/version';
import { scheduleDurableLocalState } from './durableStorage';

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

export interface OrganizationDevice {
  deviceId: string;
  deviceName: string;
  authUid: string;
  userEmail: string;
  userName: string;
  role: string;
  platform: string;
  appVersion: string;
  lastSeenAt: string;
  lastSyncAt: string | null;
  lastError: string | null;
  pendingAudit: number;
  pendingEntities: number;
  conflicts: number;
}

let contextPromise: Promise<FirebaseContext> | null = null;

const CATALOG_ENTITY_TYPES: SyncEntityType[] = [
  'product', 'dish', 'recipe_component', 'dish_nutrition_profile',
];
const OPERATIONAL_ENTITY_TYPES: SyncEntityType[] = [
  'menu_entry', 'menu_approval', 'supplier', 'invoice', 'stock_batch',
];
const STRUCTURE_ENTITY_TYPES: SyncEntityType[] = [
  'group', 'employee', 'child', 'property_item', 'property_writeoff',
  'psychology_adaptation', 'psychology_readiness', 'psychology_consultation', 'psychology_report',
  'medical_card', 'medical_vaccination', 'medical_anthropometry',
];
const ALL_ENTITY_TYPES: SyncEntityType[] = [
  ...CATALOG_ENTITY_TYPES,
  ...OPERATIONAL_ENTITY_TYPES,
  ...STRUCTURE_ENTITY_TYPES,
];
const DEVICE_NAME_KEY = 'sadok_device_name_v1';
const DEVICE_HEARTBEAT_KEY = 'sadok_device_heartbeat_at_v1';
const DEVICE_HEARTBEAT_INTERVAL_MS = 15 * 60 * 1000;
const ORGANIZATION_INITIALIZATION_LEASE_MS = 30 * 60 * 1000;

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

function getFirebaseScope(): string {
  const config = readFirebaseConfig();
  return `${config.projectId}/${config.organizationId}`;
}

function defaultDeviceName(): string {
  const extendedNavigator = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = extendedNavigator.userAgentData?.platform || navigator.platform || 'Пристрій';
  return `${platform} · ${getDeviceId().slice(-6)}`;
}

export function getLocalDeviceName(): string {
  return localStorage.getItem(DEVICE_NAME_KEY) || defaultDeviceName();
}

export function setLocalDeviceName(value: string): string {
  const name = value.trim();
  if (name.length < 2) throw new Error('Вкажіть зрозумілу назву пристрою');
  localStorage.setItem(DEVICE_NAME_KEY, name);
  scheduleDurableLocalState();
  return name;
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

function entityAuditId(document: RemoteEntityDocument): string {
  return `${document.syncId}__${document.updatedAt}`;
}

function entityAuditPayload(document: RemoteEntityDocument, authUid: string) {
  const identity = getCloudCurrentUser();
  if (!identity) throw new Error('Хмарна особа користувача не підтверджена');
  const action = document.deleted ? 'archive' : document.revision === 1 ? 'create' : 'update';
  const id = entityAuditId(document);
  return {
    id,
    occurredAt: document.updatedAt,
    userId: `firebase-${authUid}`,
    userName: identity.displayName,
    role: identity.role,
    action,
    entityType: document.entityType,
    entityId: document.syncId,
    summary: `${action}: ${document.entityType}/${document.syncId}`,
    after: document.payload,
    deviceId: document.deviceId,
    syncStatus: 'synced',
    authUid,
    schemaVersion: 1,
  };
}

async function ensureOrganizationInitialization(
  context: FirebaseContext,
  firestoreModule: typeof import('firebase/firestore'),
  authUid: string,
): Promise<CloudInitializationDecision> {
  const identity = getCloudCurrentUser();
  if (!identity) throw new Error('Увійдіть до Firebase перед синхронізацією закладу');
  const deviceId = getDeviceId();
  const organizationReference = firestoreModule.doc(
    context.db, 'organizations', context.organizationId,
  );
  return firestoreModule.runTransaction(context.db, async transaction => {
    const snapshot = await transaction.get(organizationReference);
    const now = Date.now();
    const decision = decideCloudInitialization({
      metadata: snapshot.exists()
        ? snapshot.data() as CloudInitializationMetadata
        : null,
      role: identity.role as CloudUserRole,
      userId: authUid,
      deviceId,
      now,
    });
    if (decision !== 'ready') {
      transaction.set(organizationReference, {
        syncStatus: 'initializing',
        initializedBy: authUid,
        initializedByDevice: deviceId,
        initializationLeaseUntil: now + ORGANIZATION_INITIALIZATION_LEASE_MS,
        initializationStartedAt: new Date(now).toISOString(),
        schemaVersion: 1,
      }, { merge: true });
    }
    return decision;
  });
}

async function markOrganizationInitialized(
  context: FirebaseContext,
  firestoreModule: typeof import('firebase/firestore'),
  authUid: string,
): Promise<void> {
  await firestoreModule.setDoc(firestoreModule.doc(
    context.db, 'organizations', context.organizationId,
  ), {
    syncStatus: 'ready',
    initializedAt: new Date().toISOString(),
    initializedBy: authUid,
    initializedByDevice: getDeviceId(),
    schemaVersion: 1,
  }, { merge: true });
}

async function bootstrapEntityCollection(
  context: FirebaseContext,
  firestoreModule: typeof import('firebase/firestore'),
  authUid: string,
  initializationDecision: CloudInitializationDecision,
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

  if (selectBootstrapSource(initializationDecision, cloudDocuments.length) === 'cloud') {
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
  const cloudIdentity = getCloudCurrentUser();
  if (!cloudIdentity) throw new Error('Увійдіть до Firebase перед першою синхронізацією закладу');
  assertCloudBootstrapAllowed(cloudIdentity.role as CloudUserRole, localEntities.length);
  const updatedAt = new Date().toISOString();
  const deviceId = localStorage.getItem('sadok_device_id') || '';
  const bootstrapDocuments: RemoteEntityDocument[] = buildAuthoritativeBootstrapDocuments(
    localEntities, cloudDocuments,
  ).map(document => ({ ...document, revision: 1, updatedAt, updatedBy: authUid, deviceId }));
  for (let offset = 0; offset < bootstrapDocuments.length; offset += 5) {
    const batch = firestoreModule.writeBatch(context.db);
    const chunk = bootstrapDocuments.slice(offset, offset + 5);
    chunk.forEach(document => {
      batch.set(firestoreModule.doc(collectionReference, document.syncId), document);
      batch.set(firestoreModule.doc(
        context.db, 'organizations', context.organizationId, 'auditEvents', entityAuditId(document),
      ), entityAuditPayload(document, authUid));
    });
    await batch.commit();
    chunk.forEach(document => markLocalSyncEntityRevision(
      document.syncId, 1, updatedAt, deviceId, document.deleted,
    ));
  }
  markEntityMutationsSynced(getPendingEntityMutations()
    .filter(item => CATALOG_ENTITY_TYPES.includes(item.entityType))
    .map(item => item.id));
  persistRemoteSyncEntities();
  markEntityBootstrapComplete();
  return bootstrapDocuments.length;
}

async function bootstrapOperationalCollection(
  context: FirebaseContext,
  firestoreModule: typeof import('firebase/firestore'),
  authUid: string,
  initializationDecision: CloudInitializationDecision,
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

  if (selectBootstrapSource(initializationDecision, cloudDocuments.length) === 'cloud') {
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
  const cloudIdentity = getCloudCurrentUser();
  if (!cloudIdentity) throw new Error('Увійдіть до Firebase перед першою синхронізацією закладу');
  assertCloudBootstrapAllowed(cloudIdentity.role as CloudUserRole, localEntities.length);
  const updatedAt = new Date().toISOString();
  const deviceId = localStorage.getItem('sadok_device_id') || '';
  const bootstrapDocuments: RemoteEntityDocument[] = buildAuthoritativeBootstrapDocuments(
    localEntities, cloudDocuments,
  ).map(document => ({ ...document, revision: 1, updatedAt, updatedBy: authUid, deviceId }));
  for (let offset = 0; offset < bootstrapDocuments.length; offset += 5) {
    const batch = firestoreModule.writeBatch(context.db);
    const chunk = bootstrapDocuments.slice(offset, offset + 5);
    chunk.forEach(document => {
      batch.set(firestoreModule.doc(collectionReference, document.syncId), document);
      batch.set(firestoreModule.doc(
        context.db, 'organizations', context.organizationId, 'auditEvents', entityAuditId(document),
      ), entityAuditPayload(document, authUid));
    });
    await batch.commit();
    chunk.forEach(document => markLocalSyncEntityRevision(
      document.syncId, 1, updatedAt, deviceId, document.deleted,
    ));
  }
  markEntityMutationsSynced(getPendingEntityMutations()
    .filter(item => OPERATIONAL_ENTITY_TYPES.includes(item.entityType))
    .map(item => item.id));
  persistRemoteSyncEntities();
  markOperationalBootstrapComplete();
  return bootstrapDocuments.length;
}

async function bootstrapStructureCollection(
  context: FirebaseContext,
  firestoreModule: typeof import('firebase/firestore'),
  authUid: string,
  initializationDecision: CloudInitializationDecision,
): Promise<number> {
  if (isStructureBootstrapComplete()) return 0;
  const collectionReference = firestoreModule.collection(
    context.db, 'organizations', context.organizationId, 'entities',
  );
  const cloudSnapshot = await firestoreModule.getDocs(firestoreModule.query(
    collectionReference,
    firestoreModule.where('entityType', 'in', STRUCTURE_ENTITY_TYPES),
  ));
  const cloudDocuments = cloudSnapshot.docs
    .map(remoteFromSnapshot)
    .filter((value): value is RemoteEntityDocument => Boolean(value));

  if (selectBootstrapSource(initializationDecision, cloudDocuments.length) === 'cloud') {
    reconcileLocalBootstrapSnapshot(
      cloudDocuments.map(document => document.syncId),
      getPendingEntityMutations().map(mutation => mutation.syncId),
      STRUCTURE_ENTITY_TYPES,
    );
    cloudDocuments
      .sort((left, right) => entityTypeOrder(left.entityType, left.deleted) - entityTypeOrder(right.entityType, right.deleted))
      .forEach(applyRemoteSyncEntity);
    persistRemoteSyncEntities();
    markStructureBootstrapComplete();
    return 0;
  }

  const localEntities = exportLocalSyncEntities(STRUCTURE_ENTITY_TYPES);
  const cloudIdentity = getCloudCurrentUser();
  if (!cloudIdentity) throw new Error('Увійдіть до Firebase перед першою синхронізацією закладу');
  assertCloudBootstrapAllowed(cloudIdentity.role as CloudUserRole, localEntities.length);
  const updatedAt = new Date().toISOString();
  const deviceId = localStorage.getItem('sadok_device_id') || '';
  const bootstrapDocuments: RemoteEntityDocument[] = buildAuthoritativeBootstrapDocuments(
    localEntities, cloudDocuments,
  ).map(document => ({ ...document, revision: 1, updatedAt, updatedBy: authUid, deviceId }));
  for (let offset = 0; offset < bootstrapDocuments.length; offset += 5) {
    const batch = firestoreModule.writeBatch(context.db);
    const chunk = bootstrapDocuments.slice(offset, offset + 5);
    chunk.forEach(document => {
      batch.set(firestoreModule.doc(collectionReference, document.syncId), document);
      batch.set(firestoreModule.doc(
        context.db, 'organizations', context.organizationId, 'auditEvents', entityAuditId(document),
      ), entityAuditPayload(document, authUid));
    });
    await batch.commit();
    chunk.forEach(document => markLocalSyncEntityRevision(
      document.syncId, 1, updatedAt, deviceId, document.deleted,
    ));
  }
  markEntityMutationsSynced(getPendingEntityMutations()
    .filter(item => STRUCTURE_ENTITY_TYPES.includes(item.entityType))
    .map(item => item.id));
  persistRemoteSyncEntities();
  markStructureBootstrapComplete();
  return bootstrapDocuments.length;
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
      transaction.set(firestoreModule.doc(
        context.db, 'organizations', context.organizationId, 'auditEvents', entityAuditId(document),
      ), entityAuditPayload(document, authUid));
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
    const identity = parseCloudMembership(user.uid, user.email, membership.data());
    const scope = getFirebaseScope();
    ensureEntitySyncScope(scope);
    ensureAuditSyncScope(scope);
    setCloudCurrentUser(identity, recordLogin, scope);
  } catch (error) {
    const code = String((error as { code?: unknown })?.code || '');
    const cached = getCloudIdentityCache();
    if (canReuseCachedCloudIdentity(
      code,
      cached ? {
        identityId: cached.user.id,
        scope: cached.scope,
        verifiedAt: cached.verifiedAt,
      } : null,
      user.uid,
      getFirebaseScope(),
      Date.now(),
    )) return;
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

function mapOrganizationDevice(
  document: import('firebase/firestore').QueryDocumentSnapshot,
): OrganizationDevice {
  const value = document.data();
  return {
    deviceId: document.id,
    deviceName: String(value.deviceName || `Пристрій ${document.id.slice(-6)}`),
    authUid: String(value.authUid || ''),
    userEmail: String(value.userEmail || ''),
    userName: String(value.userName || value.userEmail || ''),
    role: String(value.role || ''),
    platform: String(value.platform || ''),
    appVersion: String(value.appVersion || ''),
    lastSeenAt: String(value.lastSeenAt || ''),
    lastSyncAt: value.lastSyncAt ? String(value.lastSyncAt) : null,
    lastError: value.lastError ? String(value.lastError) : null,
    pendingAudit: Number(value.pendingAudit || 0),
    pendingEntities: Number(value.pendingEntities || 0),
    conflicts: Number(value.conflicts || 0),
  };
}

async function writeCurrentDeviceHeartbeat(
  context: FirebaseContext,
  firestoreModule: typeof import('firebase/firestore'),
  force = false,
): Promise<boolean> {
  const now = Date.now();
  const previous = Number(localStorage.getItem(DEVICE_HEARTBEAT_KEY) || 0);
  if (!force && now - previous < DEVICE_HEARTBEAT_INTERVAL_MS) return false;
  await context.auth.authStateReady();
  const authUser = context.auth.currentUser;
  if (!authUser) return false;
  const identity = getCloudCurrentUser();
  const syncState = getSyncState();
  const extendedNavigator = navigator as Navigator & { userAgentData?: { platform?: string } };
  const deviceId = getDeviceId();
  await firestoreModule.setDoc(firestoreModule.doc(
    context.db, 'organizations', context.organizationId, 'devices', deviceId,
  ), {
    deviceId,
    deviceName: getLocalDeviceName(),
    authUid: authUser.uid,
    userEmail: authUser.email || '',
    userName: identity?.displayName || authUser.displayName || authUser.email || '',
    role: identity?.role || '',
    platform: extendedNavigator.userAgentData?.platform || navigator.platform || '',
    appVersion: APP_VERSION,
    lastSeenAt: new Date(now).toISOString(),
    lastSyncAt: syncState.lastSuccessfulSync,
    lastError: syncState.lastError,
    pendingAudit: getPendingAuditEntries().length,
    pendingEntities: getPendingEntityMutations().length,
    conflicts: getEntitySyncConflicts().length,
  }, { merge: true });
  localStorage.setItem(DEVICE_HEARTBEAT_KEY, String(now));
  scheduleDurableLocalState();
  return true;
}

export async function refreshCurrentDevicePresence(force = true): Promise<boolean> {
  if (!navigator.onLine) throw new Error('Немає інтернету. Локальний стан доступний нижче.');
  const [context, firestoreModule] = await Promise.all([
    getFirebaseContext(),
    import('firebase/firestore'),
  ]);
  return writeCurrentDeviceHeartbeat(context, firestoreModule, force);
}

export async function listOrganizationDevices(): Promise<OrganizationDevice[]> {
  const [{ db, organizationId }, firestoreModule] = await Promise.all([
    getFirebaseContext(),
    import('firebase/firestore'),
  ]);
  const snapshot = await firestoreModule.getDocs(firestoreModule.collection(
    db, 'organizations', organizationId, 'devices',
  ));
  return snapshot.docs
    .map(mapOrganizationDevice)
    .sort((left, right) => (right.lastSeenAt || '').localeCompare(left.lastSeenAt || ''));
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

export async function synchronizePendingAudit(): Promise<number> {
  const state = getSyncState();
  const attemptAt = new Date().toISOString();
  const pending = getPendingAuditEntries();
  markAuditEntriesSynced(pending.map(entry => entry.id));
  saveSyncState({ ...state, lastAttempt: attemptAt, lastSuccessfulSync: attemptAt, lastError: null });
  return 0;
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
    const user = await getFirebaseUser();
    if (!user) throw new Error('Не вдалося ініціалізувати сесію синхронізації');
    const authUid = user.uid;
    const initializationDecision = await ensureOrganizationInitialization(
      context, firestoreModule, authUid,
    );
    if (initializationDecision === 'acquire' || initializationDecision === 'takeover') {
      resetEntityBootstrapState();
    }
    const catalogBootstrapped = await bootstrapEntityCollection(
      context, firestoreModule, authUid, initializationDecision,
    );
    const operationalBootstrapped = await bootstrapOperationalCollection(
      context, firestoreModule, authUid, initializationDecision,
    );
    const structureBootstrapped = await bootstrapStructureCollection(
      context, firestoreModule, authUid, initializationDecision,
    );
    if (initializationDecision !== 'ready') {
      await markOrganizationInitialized(context, firestoreModule, authUid);
    }
    const bootstrapped = catalogBootstrapped + operationalBootstrapped + structureBootstrapped;
    const entitiesUploaded = await uploadPendingEntities(context, firestoreModule, authUid);
    const entitiesDownloaded = await downloadRemoteEntities(context, firestoreModule);
    const auditUploaded = await synchronizePendingAudit();
    const completedAt = new Date().toISOString();
    saveSyncState({
      ...state,
      mode: 'firebase',
      lastAttempt: attemptAt,
      lastSuccessfulSync: completedAt,
      lastError: null,
    });
    await writeCurrentDeviceHeartbeat(context, firestoreModule).catch(error => {
      console.warn('[Sync] Device status update postponed:', error);
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

let liveEntityUnsubscribe: (() => void) | null = null;

export function startLiveEntitySubscription(): () => void {
  if (liveEntityUnsubscribe) return liveEntityUnsubscribe;
  let active = true;

  (async () => {
    try {
      const [context, firestoreModule] = await Promise.all([
        getFirebaseContext(),
        import('firebase/firestore'),
      ]);
      const user = await getFirebaseUser();
      if (!user || !active) return;

      const collectionReference = firestoreModule.collection(
        context.db, 'organizations', context.organizationId, 'entities',
      );
      
      const unsubscribe = firestoreModule.onSnapshot(collectionReference, snapshot => {
        let hasChanges = false;
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
            const remote = remoteFromSnapshot(change.doc);
            if (remote && remote.deviceId !== getDeviceId()) {
              applyRemoteSyncEntity(remote);
              hasChanges = true;
            }
          }
        });
        if (hasChanges) {
          persistRemoteSyncEntities();
        }
      }, error => {
        console.warn('[Sync] Live listener note:', error);
      });

      if (!active) {
        unsubscribe();
      } else {
        liveEntityUnsubscribe = unsubscribe;
      }
    } catch (err) {
      console.warn('[Sync] Failed to start live listener:', err);
    }
  })();

  return () => {
    active = false;
    if (liveEntityUnsubscribe) {
      liveEntityUnsubscribe();
      liveEntityUnsubscribe = null;
    }
  };
}

export function startAutomaticFirebaseSync(): () => void {
  let stopped = false;
  let running = false;

  if (getFirebaseCapability().configured && getSyncState().mode === 'local-only') {
    saveSyncState({ ...getSyncState(), mode: 'firebase' });
  }

  const liveUnsub = startLiveEntitySubscription();

  const run = async () => {
    if (stopped || running || !navigator.onLine) return;
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

  const timer = window.setInterval(() => void run(), 30_000);
  const onlineHandler = () => void run();
  const visibilityHandler = () => {
    if (document.visibilityState === 'visible') void run();
  };

  window.addEventListener('online', onlineHandler);
  document.addEventListener('visibilitychange', visibilityHandler);
  window.setTimeout(() => void run(), 1_000);

  return () => {
    stopped = true;
    window.clearInterval(timer);
    window.removeEventListener('online', onlineHandler);
    document.removeEventListener('visibilitychange', visibilityHandler);
    liveUnsub();
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('sadok-entity-sync-change', () => {
    if (navigator.onLine && getFirebaseCapability().configured && !activeFullSync) {
      window.setTimeout(() => {
        if (getPendingEntityMutations().length > 0 || getPendingAuditEntries().length > 0) {
          void synchronizeAllPending().catch(() => {});
        }
      }, 500);
    }
  });
}
