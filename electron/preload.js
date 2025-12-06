const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  runRepack: (rootDir, options) => ipcRenderer.invoke('run-repack', rootDir, options),
  onRepackLog: (cb) => ipcRenderer.on('repack-log', (e, msg) => cb(msg)),
  scanFolder: (folderPath) => ipcRenderer.invoke('scan-folder', folderPath),
});
