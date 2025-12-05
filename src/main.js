const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  // Open DevTools in development
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle directory selection
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Handle compression process
ipcMain.handle('compress-files', async (event, inputDir, outputDir) => {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '..', 'compress.py');
    
    // Try to find Python executable
    const pythonCommands = ['python3', 'python'];
    let pythonExe = null;
    
    for (const cmd of pythonCommands) {
      try {
        const testProcess = spawn(cmd, ['--version']);
        testProcess.on('close', (code) => {
          if (code === 0) {
            pythonExe = cmd;
          }
        });
      } catch (e) {
        continue;
      }
    }
    
    if (!pythonExe) {
      pythonExe = 'python3'; // Default fallback
    }
    
    const process = spawn(pythonExe, [pythonScript, inputDir, outputDir]);
    
    let outputData = '';
    let errorData = '';
    
    process.stdout.on('data', (data) => {
      const dataStr = data.toString();
      outputData += dataStr;
      
      // Send progress updates to renderer
      const lines = dataStr.split('\n');
      for (const line of lines) {
        if (line.trim() && !line.startsWith('{') && !line.startsWith('[')) {
          event.sender.send('compression-progress', line);
        }
      }
    });
    
    process.stderr.on('data', (data) => {
      errorData += data.toString();
      event.sender.send('compression-progress', data.toString());
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        try {
          // Extract JSON from output
          const jsonMatch = outputData.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const results = JSON.parse(jsonMatch[0]);
            resolve(results);
          } else {
            resolve({ error: 'No results returned', output: outputData });
          }
        } catch (e) {
          reject(new Error(`Failed to parse results: ${e.message}\n${outputData}`));
        }
      } else {
        reject(new Error(`Process exited with code ${code}\n${errorData}`));
      }
    });
    
    process.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
});

// Check if Python is installed
ipcMain.handle('check-python', async () => {
  return new Promise((resolve) => {
    const pythonCommands = ['python3', 'python'];
    let found = false;
    
    for (const cmd of pythonCommands) {
      try {
        const proc = spawn(cmd, ['--version']);
        proc.on('close', (code) => {
          if (code === 0 && !found) {
            found = true;
            resolve({ installed: true, command: cmd });
          }
        });
      } catch (e) {
        continue;
      }
    }
    
    setTimeout(() => {
      if (!found) {
        resolve({ installed: false });
      }
    }, 2000);
  });
});
