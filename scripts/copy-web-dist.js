#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const destDir = path.join('daemon', 'web-dist');
const srcDir = path.join('web', 'dist');

// Create destination directory if it doesn't exist
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  console.log(`Created directory: ${destDir}`);
}

// Copy files if source directory exists
if (fs.existsSync(srcDir)) {
  const items = fs.readdirSync(srcDir);
  items.forEach(item => {
    const srcPath = path.join(srcDir, item);
    const destPath = path.join(destDir, item);

    try {
      if (fs.statSync(srcPath).isDirectory()) {
        fs.cpSync(srcPath, destPath, { recursive: true, force: true });
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
      console.log(`Copied: ${srcPath} -> ${destPath}`);
    } catch (error) {
      console.error(`Failed to copy ${srcPath}:`, error.message);
    }
  });
  console.log(`Copied ${items.length} items from ${srcDir} to ${destDir}`);
} else {
  console.log(`Source directory ${srcDir} does not exist, skipping copy`);
}