const assert = require('assert');
const path = require('path');
const { 
  getFileCategory, 
  formatFileSize,
  groupFilesByCategory 
} = require('../src/utils/fileUtils');

console.log('Running fileUtils tests...\n');

// Test getFileCategory
console.log('Test 1: getFileCategory');
assert.strictEqual(getFileCategory('test.jpg'), 'images', 'JPG should be images');
assert.strictEqual(getFileCategory('test.pdf'), 'documents', 'PDF should be documents');
assert.strictEqual(getFileCategory('test.mp4'), 'videos', 'MP4 should be videos');
assert.strictEqual(getFileCategory('test.mp3'), 'audio', 'MP3 should be audio');
assert.strictEqual(getFileCategory('test.zip'), 'archives', 'ZIP should be archives');
assert.strictEqual(getFileCategory('test.js'), 'code', 'JS should be code');
assert.strictEqual(getFileCategory('test.xyz'), 'other', 'Unknown extension should be other');
console.log('✓ getFileCategory tests passed\n');

// Test formatFileSize
console.log('Test 2: formatFileSize');
assert.strictEqual(formatFileSize(0), '0 Bytes', 'Zero bytes');
assert.strictEqual(formatFileSize(1024), '1 KB', '1 KB');
assert.strictEqual(formatFileSize(1048576), '1 MB', '1 MB');
assert.strictEqual(formatFileSize(1073741824), '1 GB', '1 GB');
console.log('✓ formatFileSize tests passed\n');

// Test groupFilesByCategory
console.log('Test 3: groupFilesByCategory');
const testFiles = [
  { path: '/test/file1.jpg', category: 'images' },
  { path: '/test/file2.jpg', category: 'images' },
  { path: '/test/file3.pdf', category: 'documents' },
  { path: '/test/file4.mp3', category: 'audio' }
];
const grouped = groupFilesByCategory(testFiles);
assert.strictEqual(grouped.images.length, 2, 'Should have 2 images');
assert.strictEqual(grouped.documents.length, 1, 'Should have 1 document');
assert.strictEqual(grouped.audio.length, 1, 'Should have 1 audio file');
console.log('✓ groupFilesByCategory tests passed\n');

console.log('All tests passed! ✓');
