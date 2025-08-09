#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Keep console.error for error handling, remove others
const consoleMethodsToRemove = 'log|warn|info|debug|trace|group|groupEnd|time|timeEnd|assert|clear|count|dir|dirxml|table';

// More sophisticated regex patterns for different console formats
const consolePatterns = [
  // Single line console statements
  new RegExp(`console\\.(${consoleMethodsToRemove})\\s*\\([^)]*\\)\\s*;?`, 'g'),
  
  // Multi-line console statements (handles nested parentheses)
  new RegExp(`console\\.(${consoleMethodsToRemove})\\s*\\([\\s\\S]*?\\)(?=\\s*(?:;|\\n|$))`, 'gm'),
  
  // Console statements with template literals
  new RegExp(`console\\.(${consoleMethodsToRemove})\\s*\\(\`[\\s\\S]*?\`\\)\\s*;?`, 'gm'),
  
  // Console statements with object/array destructuring
  new RegExp(`console\\.(${consoleMethodsToRemove})\\s*\\(\\{[\\s\\S]*?\\}\\)\\s*;?`, 'gm'),
  new RegExp(`console\\.(${consoleMethodsToRemove})\\s*\\(\\[[\\s\\S]*?\\]\\)\\s*;?`, 'gm'),
];

// Directories to process
const directories = ['app', 'components', 'hooks', 'lib'];

// Extensions to process
const extensions = ['.ts', '.tsx', '.js', '.jsx'];

// Files to exclude
const excludeFiles = ['remove-console-logs.js'];
const excludeDirs = ['node_modules', '.next', 'dist', 'build', 'scripts'];

let totalRemoved = 0;
let filesProcessed = 0;
let filesWithConsoleError = [];

function removeConsoleLogs(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let removedCount = 0;

    // First, check if file has console.error statements
    if (content.includes('console.error')) {
      filesWithConsoleError.push(filePath);
    }

    // Remove console statements
    consolePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        removedCount += matches.length;
        content = content.replace(pattern, '');
      }
    });

    // Clean up extra blank lines (more than 2 consecutive)
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Clean up trailing whitespace
    content = content.replace(/[ \t]+$/gm, '');

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Processed ${filePath} - Removed ${removedCount} console statements`);
      totalRemoved += removedCount;
      filesProcessed++;
    }
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

function processDirectory(dir, depth = 0) {
  if (!fs.existsSync(dir)) return;
  if (depth > 10) return; // Prevent infinite recursion

  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      const basename = path.basename(filePath);
      if (!excludeDirs.includes(basename)) {
        processDirectory(filePath, depth + 1);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(file);
      const basename = path.basename(file);
      
      if (extensions.includes(ext) && !excludeFiles.includes(basename)) {
        removeConsoleLogs(filePath);
      }
    }
  });
}

console.log('🧹 Starting to clean console statements...');
console.log('📝 Note: console.error statements are preserved for error handling\n');

// Process all directories
directories.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`📁 Processing ${dir} directory...`);
    processDirectory(dir);
  }
});

console.log('\n✨ Cleaning complete!');
console.log(`📊 Total console statements removed: ${totalRemoved}`);
console.log(`📁 Files processed: ${filesProcessed}`);

if (filesWithConsoleError.length > 0) {
  console.log(`\n⚠️  Files with console.error statements (preserved):`);
  filesWithConsoleError.forEach(file => {
    console.log(`   - ${file}`);
  });
}