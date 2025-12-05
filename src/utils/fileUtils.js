const fs = require('fs-extra');
const path = require('path');
const mime = require('mime-types');

/**
 * File type categories
 */
const FILE_CATEGORIES = {
  images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico'],
  documents: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.xls', '.xlsx', '.ppt', '.pptx'],
  videos: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm'],
  audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'],
  archives: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'],
  code: ['.js', '.py', '.java', '.cpp', '.c', '.h', '.cs', '.php', '.rb', '.go', '.rs', '.swift']
};

/**
 * Get file category based on extension
 */
function getFileCategory(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  for (const [category, extensions] of Object.entries(FILE_CATEGORIES)) {
    if (extensions.includes(ext)) {
      return category;
    }
  }
  
  return 'other';
}

/**
 * Get file size in human-readable format
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get all files in a directory recursively
 */
async function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = await fs.readdir(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = await fs.stat(filePath);

    if (stat.isDirectory()) {
      arrayOfFiles = await getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push({
        path: filePath,
        name: file,
        size: stat.size,
        category: getFileCategory(filePath),
        extension: path.extname(filePath)
      });
    }
  }

  return arrayOfFiles;
}

/**
 * Group files by category
 */
function groupFilesByCategory(files) {
  const grouped = {};
  
  files.forEach(file => {
    if (!grouped[file.category]) {
      grouped[file.category] = [];
    }
    grouped[file.category].push(file);
  });
  
  return grouped;
}

module.exports = {
  FILE_CATEGORIES,
  getFileCategory,
  formatFileSize,
  getAllFiles,
  groupFilesByCategory
};
