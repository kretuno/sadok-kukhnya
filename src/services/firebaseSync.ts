import type { AuditEntry } from './governance';
import {
  getPendingAuditEntries,
  markAuditEntriesSynced,
  saveSyncState,
  getSyncState,
} from './governance';

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
