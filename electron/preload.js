const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDbPath: () => ipcRenderer.invoke('get-db-path'),
  readDbFile: (path) => ipcRenderer.invoke('read-db-file', path),
  saveDbFile: (buffer, path) => ipcRenderer.invoke('save-db-file', buffer, path)
});
