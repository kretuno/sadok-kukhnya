/// <reference types="vite/client" />

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
