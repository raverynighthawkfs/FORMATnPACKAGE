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
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
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
    
    // Use python3 as default, will fail gracefully if not available
    const pythonExe = process.platform === 'win32' ? 'python' : 'python3';
    
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
  const pythonCommands = process.platform === 'win32' ? ['python', 'python3'] : ['python3', 'python'];
  
  for (const cmd of pythonCommands) {
    try {
      const result = await new Promise((resolve) => {
        const proc = spawn(cmd, ['--version']);
        proc.on('close', (code) => {
          resolve(code === 0);
        });
        proc.on('error', () => {
          resolve(false);
        });
        // Timeout after 2 seconds
        setTimeout(() => resolve(false), 2000);
      });
      
      if (result) {
        return { installed: true, command: cmd };
      }
    } catch (e) {
      continue;
    }
  }
  
  return { installed: false };
});
