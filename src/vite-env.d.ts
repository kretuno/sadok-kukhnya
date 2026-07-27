/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    getDbPath: () => Promise<string>;
    readDbFile: (path?: string) => Promise<Uint8Array | null>;
    saveDbFile: (buffer: Uint8Array, path?: string) => Promise<boolean>;
  };
}
