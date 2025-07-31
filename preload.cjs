const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (config) => ipcRenderer.invoke('set-config', config),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  searchAD: (pattern) => ipcRenderer.invoke('search-ad', pattern),
  toggleKioskMode: () => ipcRenderer.invoke('toggle-kiosk-mode'),
  exitApplication: () => ipcRenderer.invoke('exit-application'),
  exitKioskMode: () => ipcRenderer.invoke('exit-kiosk-mode'),
  // Auto-updater functions
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  // Auto-updater event listeners
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', callback),
  onUpdateError: (callback) => ipcRenderer.on('update-error', callback),
  onUpdateDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback)
}); 