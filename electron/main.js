const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'SADOK Кухня v1.0.10',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    icon: path.join(__dirname, '../public/icon.png')
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:3001');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers for database path & files
ipcMain.handle('get-db-path', async () => {
  const defaultPath = path.join(__dirname, '../medsestra.db');
  return defaultPath;
});

ipcMain.handle('read-db-file', async (event, dbPath) => {
  try {
    const p = dbPath || path.join(__dirname, '../medsestra.db');
    if (fs.existsSync(p)) {
      const buffer = fs.readFileSync(p);
      return buffer;
    }
    return null;
  } catch (err) {
    console.error('Error reading DB file:', err);
    return null;
  }
});

ipcMain.handle('save-db-file', async (event, buffer, dbPath) => {
  try {
    const p = dbPath || path.join(__dirname, '../medsestra.db');
    fs.writeFileSync(p, Buffer.from(buffer));
    return true;
  } catch (err) {
    console.error('Error saving DB file:', err);
    return false;
  }
});
