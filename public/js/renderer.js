const { ipcRenderer } = require('electron');
const fs = require('fs-extra');
const path = require('path');
const mime = require('mime-types');

// DOM Elements
const selectDirBtn = document.getElementById('select-dir-btn');
const selectedPath = document.getElementById('selected-path');
const selectOutputBtn = document.getElementById('select-output-btn');
const outputPath = document.getElementById('output-path');
const outputType = document.getElementById('output-type');
const startBtn = document.getElementById('start-btn');
const cancelBtn = document.getElementById('cancel-btn');
const clearBtn = document.getElementById('clear-btn');
const progressFill = document.getElementById('progress-fill');
const statusText = document.getElementById('status-text');
const fileList = document.getElementById('file-list');

// State
let selectedDirectory = null;
let outputDirectory = null;
let isProcessing = false;

// Event Listeners
selectDirBtn.addEventListener('click', async () => {
  try {
    const paths = await ipcRenderer.invoke('select-directory');
    if (paths && paths.length > 0) {
      selectedDirectory = paths[0];
      selectedPath.textContent = selectedDirectory;
      updateStatus('Directory selected. Ready to process.');
    }
  } catch (error) {
    console.error('Error selecting directory:', error);
    updateStatus('Error selecting directory', 'error');
  }
});

selectOutputBtn.addEventListener('click', async () => {
  try {
    const paths = await ipcRenderer.invoke('select-directory');
    if (paths && paths.length > 0) {
      outputDirectory = paths[0];
      outputPath.textContent = `Output: ${outputDirectory}`;
    }
  } catch (error) {
    console.error('Error selecting output directory:', error);
    updateStatus('Error selecting output directory', 'error');
  }
});

outputType.addEventListener('change', () => {
  if (outputType.value === 'same') {
    outputDirectory = null;
    outputPath.textContent = 'Output: Same as source';
    selectOutputBtn.disabled = true;
  } else {
    selectOutputBtn.disabled = false;
  }
});

startBtn.addEventListener('click', async () => {
  if (!selectedDirectory) {
    updateStatus('Please select a directory first', 'error');
    return;
  }

  isProcessing = true;
  startBtn.disabled = true;
  cancelBtn.disabled = false;
  
  await processFiles();
  
  isProcessing = false;
  startBtn.disabled = false;
  cancelBtn.disabled = true;
});

cancelBtn.addEventListener('click', () => {
  isProcessing = false;
  cancelBtn.disabled = true;
  startBtn.disabled = false;
  updateStatus('Processing cancelled');
  updateProgress(0);
});

clearBtn.addEventListener('click', () => {
  selectedDirectory = null;
  outputDirectory = null;
  selectedPath.textContent = 'No directory selected';
  outputPath.textContent = 'Output: Same as source';
  fileList.innerHTML = '';
  updateProgress(0);
  updateStatus('Ready to process files');
  outputType.value = 'same';
});

// Helper Functions
function updateStatus(message, type = 'info') {
  statusText.textContent = message;
  statusText.style.color = type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#666';
}

function updateProgress(percent) {
  progressFill.style.width = `${percent}%`;
  progressFill.textContent = `${Math.round(percent)}%`;
}

function addFileToList(filename, status) {
  const fileItem = document.createElement('div');
  fileItem.className = 'file-item';
  fileItem.style.padding = '0.5rem';
  fileItem.style.borderBottom = '1px solid #eee';
  fileItem.innerHTML = `
    <span style="color: #333;">${filename}</span>
    <span style="color: ${status === 'success' ? '#28a745' : '#dc3545'}; float: right;">
      ${status === 'success' ? '✓' : '✗'} ${status}
    </span>
  `;
  fileList.appendChild(fileItem);
  fileList.scrollTop = fileList.scrollHeight;
}

async function processFiles() {
  try {
    updateStatus('Scanning directory...');
    updateProgress(10);

    // Get selected file filters
    const filters = Array.from(document.querySelectorAll('input[name="filter"]:checked'))
      .map(cb => cb.value);

    // Get processing options
    const options = {
      optimizeImages: document.getElementById('optimize-images').checked,
      compressFiles: document.getElementById('compress-files').checked,
      createSubfolders: document.getElementById('create-subfolders').checked,
      preserveStructure: document.getElementById('preserve-structure').checked
    };

    updateProgress(30);
    updateStatus('Processing files...');

    // Get all files in directory
    const files = await getAllFiles(selectedDirectory);
    
    updateProgress(50);
    
    if (files.length === 0) {
      updateStatus('No files found in directory', 'error');
      return;
    }

    updateStatus(`Found ${files.length} files. Processing...`);
    
    // Process each file
    for (let i = 0; i < files.length; i++) {
      if (!isProcessing) break;
      
      const file = files[i];
      const fileName = path.basename(file);
      
      try {
        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 100));
        addFileToList(fileName, 'success');
        updateProgress(50 + (50 * (i + 1) / files.length));
      } catch (error) {
        addFileToList(fileName, 'error');
      }
    }

    if (isProcessing) {
      updateProgress(100);
      updateStatus(`Successfully processed ${files.length} files`, 'success');
    }
    
  } catch (error) {
    console.error('Error processing files:', error);
    updateStatus('Error processing files: ' + error.message, 'error');
  }
}

async function getAllFiles(dirPath, arrayOfFiles = []) {
  try {
    const files = await fs.readdir(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = await fs.stat(filePath);

      if (stat.isDirectory()) {
        arrayOfFiles = await getAllFiles(filePath, arrayOfFiles);
      } else {
        arrayOfFiles.push(filePath);
      }
    }

    return arrayOfFiles;
  } catch (error) {
    console.error('Error reading directory:', error);
    return arrayOfFiles;
  }
}

// Initialize
updateStatus('Ready to process files');
selectOutputBtn.disabled = true;
