const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  processFiles: (directory, options) => ipcRenderer.invoke('process-files', directory, options),
  getFiles: (directory) => ipcRenderer.invoke('get-files', directory)
});
