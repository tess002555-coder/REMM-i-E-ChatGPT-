const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const appIconPath = path.join(__dirname, '..', 'app-icon.png');
if (fs.existsSync(appIconPath)) {
  console.log('Generating official Tauri icons from app-icon.png...');
  try {
    execSync('npx tauri icon app-icon.png', { stdio: 'inherit' });
    console.log('Tauri icons generated successfully!');
  } catch (err) {
    console.error('Failed to run npx tauri icon app-icon.png:', err.message);
  }
} else {
  console.warn('app-icon.png not found at root directory.');
}

