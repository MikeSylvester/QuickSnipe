const { app, BrowserWindow, ipcMain, shell, Menu, session } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ENCRYPTION_KEY = crypto.createHash('sha256').update('QuicksnipeSuperSecretKey').digest(); // 32 bytes for AES-256
const IV_LENGTH = 16; // AES block size
const { exec, spawn } = require('child_process');

// Shared config for all users
const CONFIG_PATH = path.join('C:', 'ProgramData', 'Quicksnipe', 'config.json');
const configDir = path.dirname(CONFIG_PATH);
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return iv.toString('base64') + ':' + encrypted;
}

function decrypt(text) {
  const [ivBase64, encrypted] = text.split(':');
  const iv = Buffer.from(ivBase64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function createWindow() {
  // Determine the correct icon path
  const iconPath = path.join(__dirname, 'assets', 'icons', 'icon.ico');
  console.log('Icon path:', iconPath);
  
  // Check if icon file exists
  const iconExists = fs.existsSync(iconPath);
  console.log('Icon exists:', iconExists);
  
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreen: true,
    kiosk: true,
    autoHideMenuBar: true,
    icon: iconExists ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.maximize();

  // Enable menu for debugging
  // Menu.setApplicationMenu(null);
  
  // Create menu for debugging
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Developer Tools',
          accelerator: 'F12',
          click: () => {
            win.webContents.openDevTools();
          }
        },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            win.reload();
          }
        },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

ipcMain.handle('get-config', async () => {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const encrypted = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const plain = decrypt(encrypted);
      return JSON.parse(plain);
    }
    return {};
  } catch (e) {
    return {};
  }
});

ipcMain.handle('set-config', async (event, config) => {
  const plain = JSON.stringify(config, null, 2);
  const encrypted = encrypt(plain);
  fs.writeFileSync(CONFIG_PATH, encrypted, 'utf-8');
  return true;
});

ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('search-ad', async (event, serial) => {
  function runADQuery(pattern) {
    return new Promise((resolve) => {
      const ps = `Get-ADComputer -Filter \"Name -like '*${pattern}*'\" -Properties * | Select-Object * | ConvertTo-Json`;
      const child = spawn('powershell.exe', ['-NoProfile', '-Command', ps]);
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', data => { stdout += data; });
      child.stderr.on('data', data => { stderr += data; });
      child.on('close', code => {
        if (code !== 0) return resolve({ error: stderr || `Exited with code ${code}` });
        try {
          const results = JSON.parse(stdout);
          resolve(Array.isArray(results) ? results : [results]);
        } catch (e) {
          resolve({ error: 'Failed to parse AD results.' });
        }
      });
    });
  }

  if (!serial || typeof serial !== 'string' || serial.length < 3) {
    return { error: 'Please enter at least 3 characters.' };
  }

  // Try first 3, 4, 5 chars
  for (let len = 3; len <= 5; len++) {
    if (serial.length >= len) {
      const pattern = serial.substring(0, len);
      const results = await runADQuery(pattern);
      if (results && !results.error && results.length === 1) return results;
    }
  }
  // Try last 3, 4, 5 chars
  for (let len = 3; len <= 5; len++) {
    if (serial.length >= len) {
      const pattern = serial.substring(serial.length - len);
      const results = await runADQuery(pattern);
      if (results && !results.error && results.length === 1) return results;
    }
  }
  return { error: 'No unique computer found for this serial pattern.' };
});

ipcMain.handle('toggle-kiosk-mode', async () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    if (win.isFullScreen()) {
      win.setFullScreen(false);
      win.maximize();
    } else {
      win.setFullScreen(true);
    }
  }
});

// Handle escape key to exit kiosk mode
ipcMain.handle('exit-kiosk-mode', async () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win && win.isFullScreen()) {
    win.setFullScreen(false);
    win.maximize();
  }
});

ipcMain.handle('exit-application', async () => {
  app.quit();
});

// Auto-updater configuration
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Configure logging
autoUpdater.logger = log;
log.transports.file.level = 'debug';
log.info('Auto-updater initialized');

// Set GitHub token for private repository access
if (process.env.GITHUB_TOKEN) {
  log.info('GitHub token found, configuring for private repo access');
  // Note: For private repos, the token needs to be embedded in the app
  // This is not recommended for security reasons
}

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  log.info('Checking for updates...');
  console.log('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info);
  console.log('Update available:', info);
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-not-available', (info) => {
  log.info('Update not available:', info);
  console.log('Update not available:', info);
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.webContents.send('update-not-available', info);
  }
});

autoUpdater.on('error', (err) => {
  log.error('Auto-updater error:', err);
  console.log('Auto-updater error:', err);
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.webContents.send('update-error', err.message);
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  console.log('Download progress:', progressObj);
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.webContents.send('update-download-progress', progressObj);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info);
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.webContents.send('update-downloaded', info);
  }
});

// IPC handlers for auto-updater
ipcMain.handle('check-for-updates', async () => {
  try {
    await autoUpdater.checkForUpdates();
    return { success: true };
  } catch (error) {
    console.error('Error checking for updates:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    console.error('Error downloading update:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('install-update', async () => {
  try {
    autoUpdater.quitAndInstall();
    return { success: true };
  } catch (error) {
    console.error('Error installing update:', error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true); // Approve camera/microphone access
    } else {
      callback(false);
    }
  });
  
  // Set the application icon explicitly
  const iconPath = path.join(__dirname, 'assets', 'icons', 'icon.ico');
  if (fs.existsSync(iconPath)) {
    app.setAppUserModelId('com.yourcompany.quicksnipe');
  }
  
  createWindow();
  
  // Check for updates on startup (after a short delay)
  setTimeout(() => {
    if (process.env.NODE_ENV !== 'development') {
      console.log('Checking for updates on startup...');
      autoUpdater.checkForUpdates().catch(err => {
        console.log('Startup update check failed:', err.message);
      });
    }
  }, 3000); // Wait 3 seconds after app starts
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
}); 