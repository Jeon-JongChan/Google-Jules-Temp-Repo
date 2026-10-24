const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startAutomation: (config) => ipcRenderer.send('start-automation', config),
  stopAutomation: () => ipcRenderer.send('stop-automation'),
  onLogMessage: (callback) => ipcRenderer.on('log-message', callback),
  onAutomationStopped: (callback) => ipcRenderer.on('automation-stopped', callback)
});
