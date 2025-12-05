const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  compressFiles: (inputDir, outputDir) => ipcRenderer.invoke('compress-files', inputDir, outputDir),
  checkPython: () => ipcRenderer.invoke('check-python'),
  onCompressionProgress: (callback) => {
    const subscription = (event, message) => callback(message);
    ipcRenderer.on('compression-progress', subscription);
    // Return unsubscribe function
    return () => ipcRenderer.removeListener('compression-progress', subscription);
  }
});
