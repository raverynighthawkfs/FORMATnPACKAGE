const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs-extra');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/images/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, '../public/index.html'));

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for file operations
ipcMain.handle('select-directory', async (event) => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.filePaths;
});

ipcMain.handle('get-files', async (event, directory) => {
  const { getAllFiles } = require('./utils/fileUtils');
  try {
    const files = await getAllFiles(directory);
    return { success: true, files };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('process-files', async (event, directory, options) => {
  const { getAllFiles, groupFilesByCategory } = require('./utils/fileUtils');
  try {
    const files = await getAllFiles(directory);
    const grouped = groupFilesByCategory(files);
    
    // Here we would integrate with Python scripts for actual processing
    // For now, return the categorized files
    return { 
      success: true, 
      message: 'Processing complete',
      filesProcessed: files.length,
      categories: Object.keys(grouped)
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
