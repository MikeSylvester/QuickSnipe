const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (config) => ipcRenderer.invoke('set-config', config),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  searchAD: (pattern) => ipcRenderer.invoke('search-ad', pattern),
  toggleKioskMode: () => ipcRenderer.invoke('toggle-kiosk-mode'),
  exitApplication: () => ipcRenderer.invoke('exit-application'),
  exitKioskMode: () => ipcRenderer.invoke('exit-kiosk-mode')
}); 