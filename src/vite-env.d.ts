/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_ORGANIZATION_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  electronAPI?: {
    getDbPath: () => Promise<string>;
    readDbFile: () => Promise<Uint8Array | null>;
    saveDbFile: (buffer: Uint8Array) => Promise<boolean>;
    createBackup: (
      buffer: Uint8Array,
      trigger: 'automatic' | 'manual',
    ) => Promise<{ success: boolean; id?: string; error?: string }>;
    listBackups: () => Promise<Array<{
      id: string;
      createdAt: string;
      size: number;
      trigger: string;
      verified: boolean;
    }>>;
  };
}
