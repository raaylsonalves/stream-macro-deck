const { app, BrowserWindow } = require('electron');
const { fork } = require('child_process');
const path = require('path');

let serverProcess;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "MacroStudio",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Determines if running in production (packaged) or development
  const isDev = process.env.VITE_DEV === 'true';

  if (isDev) {
    // Wait slightly for Vite to boot manually or expect user is running it
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built Vite index.html
    mainWindow.loadFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  const backendPath = path.join(__dirname, 'backend', 'server', 'index.js');
  
  // When packaged, __dirname is inside app.asar. SQLite needs a writable path outside.
  // We'll give the backend access to the Electron appData folder.
  const writableDataPath = path.join(app.getPath('userData'), 'MacroData');
  
  console.log('[Electron] Starting backend via fork...');
  console.log('[Electron] Assigning Writable Path to Backend:', writableDataPath);

  serverProcess = fork(backendPath, [], {
    env: { 
      ...process.env, 
      MACRO_WRITABLE_PATH: writableDataPath,
      PORT: 3001
    }
  });

  serverProcess.on('error', (err) => {
    console.error('[Electron] Backend Process Error:', err);
  });
}

app.whenReady().then(() => {
  startBackend();
  // Wait a little bit for backend to bind port 3001
  setTimeout(createWindow, 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    console.log('[Electron] Terminating background server...');
    serverProcess.kill();
  }
});
