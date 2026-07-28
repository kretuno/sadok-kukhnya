const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDbPath: () => ipcRenderer.invoke('get-db-path'),
  readDbFile: () => ipcRenderer.invoke('read-db-file'),
  saveDbFile: (buffer) => ipcRenderer.invoke('save-db-file', buffer),
  createBackup: (buffer, trigger) => ipcRenderer.invoke('create-backup', buffer, trigger),
  listBackups: () => ipcRenderer.invoke('list-backups')
});
