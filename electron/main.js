const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const fsp = fs.promises;

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

async function walkDir(root){
  const out = [];
  async function walk(dir){
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for(const e of entries){
      const abs = path.join(dir, e.name);
      if(e.isDirectory()){
        await walk(abs);
      } else if(e.isFile()){
        try{
          const st = await fsp.stat(abs);
          const rel = path.relative(root, abs).replace(/\\/g, '/');
          const dot = e.name.lastIndexOf('.');
          const ext = dot>-1 ? e.name.slice(dot).toLowerCase() : '(no ext)';
          out.push({ name: e.name, size: st.size, relPath: rel, absPath: abs, ext });
        }catch(err){ /* ignore individual errors */ }
      }
    }
  }
  await walk(root);
  return out;
}

ipcMain.handle('scan-folder', async (event, folderPath)=>{
  if(!folderPath) return { success:false, files:[] };
  try{
    const files = await walkDir(folderPath);
    return { success:true, files };
  }catch(err){
    return { success:false, error: err && err.message, files: [] };
  }
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
