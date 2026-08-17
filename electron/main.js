const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function getDatabasePath() {
  return path.join(app.getPath('userData'), 'medsestra.db');
}

function ensureUserDatabase() {
  const target = getDatabasePath();
  if (fs.existsSync(target)) return target;
  const bundled = path.join(__dirname, '../medsestra.db');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(bundled)) fs.copyFileSync(bundled, target);
  return target;
}

function getBackupDirectory() {
  const directory = path.join(app.getPath('userData'), 'backups');
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

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
  return ensureUserDatabase();
});

ipcMain.handle('read-db-file', async () => {
  try {
    const p = ensureUserDatabase();
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

ipcMain.handle('save-db-file', async (event, buffer) => {
  try {
    const p = ensureUserDatabase();
    const temporary = `${p}.tmp`;
    fs.writeFileSync(temporary, Buffer.from(buffer));
    fs.renameSync(temporary, p);
    return true;
  } catch (err) {
    console.error('Error saving DB file:', err);
    return false;
  }
});

ipcMain.handle('create-backup', async (event, buffer, trigger) => {
  try {
    const directory = getBackupDirectory();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeTrigger = trigger === 'automatic' ? 'automatic' : 'manual';
    const filename = `sadok-${safeTrigger}-${stamp}.sadok-backup`;
    const target = path.join(directory, filename);
    const temporary = `${target}.tmp`;
    fs.writeFileSync(temporary, Buffer.from(buffer));
    fs.renameSync(temporary, target);

    const files = fs.readdirSync(directory)
      .filter(name => name.endsWith('.sadok-backup'))
      .map(name => ({
        name,
        path: path.join(directory, name),
        mtime: fs.statSync(path.join(directory, name)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);
    files.slice(7).forEach(file => fs.unlinkSync(file.path));

    return { success: true, id: filename };
  } catch (err) {
    console.error('Error creating backup:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('list-backups', async () => {
  try {
    const directory = getBackupDirectory();
    return fs.readdirSync(directory)
      .filter(name => name.endsWith('.sadok-backup'))
      .map(name => {
        const stat = fs.statSync(path.join(directory, name));
        return {
          id: name,
          createdAt: stat.mtime.toISOString(),
          size: stat.size,
          trigger: name.includes('-automatic-') ? 'automatic' : 'manual',
          verified: true,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (err) {
    console.error('Error listing backups:', err);
    return [];
  }
});
