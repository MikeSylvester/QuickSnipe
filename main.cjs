const { app, BrowserWindow, ipcMain, shell, Menu, session } = require('electron');
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
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreen: false,
    kiosk: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'icons', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.maximize();

  // Disable menu
  Menu.setApplicationMenu(null);

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
      win.setKioskMode(false);
    } else {
      win.setFullScreen(true);
      win.setKioskMode(true);
    }
  }
});

// Handle escape key to exit kiosk mode
ipcMain.handle('exit-kiosk-mode', async () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win && (win.isFullScreen() || win.isKioskMode())) {
    win.setFullScreen(false);
    win.setKioskMode(false);
  }
});

ipcMain.handle('exit-application', async () => {
  app.quit();
});

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true); // Approve camera/microphone access
    } else {
      callback(false);
    }
  });
  createWindow();
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