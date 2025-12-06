const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

function createWindow(){
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  const indexPath = path.join(__dirname, '..', 'ui', 'preview', 'index.html');
  win.loadFile(indexPath);
}

app.whenReady().then(()=>{
  createWindow();
  app.on('activate', ()=>{ if(BrowserWindow.getAllWindows().length===0) createWindow(); });
});

app.on('window-all-closed', ()=>{ if(process.platform !== 'darwin') app.quit(); });

ipcMain.handle('pick-folder', async (event)=>{
  const res = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if(res.canceled || !res.filePaths.length) return null;
  return res.filePaths[0];
});

ipcMain.handle('run-repack', async (event, rootDir, options={})=>{
  // If no rootDir provided, open dialog
  let dir = rootDir;
  if(!dir){
    const res = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if(res.canceled || !res.filePaths.length) return { success:false, message:'No folder selected' };
    dir = res.filePaths[0];
  }

  const args = [ path.join(__dirname, '..', 'repack_by_type.js'), dir ];
  if(options.dryRun) args.push('--dry-run');
  if(options.move) args.push('--move');

  return await new Promise((resolve)=>{
    const child = spawn(process.execPath, args, { cwd: path.join(__dirname, '..') });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d.toString(); event.sender.send('repack-log', d.toString()); });
    child.stderr.on('data', d => { stderr += d.toString(); event.sender.send('repack-log', d.toString()); });
    child.on('close', code => {
      const success = code === 0;
      resolve({ success, code, stdout, stderr });
    });
    child.on('error', err => { resolve({ success:false, error: err.message }); });
  });
});
