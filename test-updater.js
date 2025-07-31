// Test script for auto-updater debugging
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure logging
autoUpdater.logger = log;
log.transports.file.level = 'debug';

console.log('Testing auto-updater...');

// Set up event listeners
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info);
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available:', info);
});

autoUpdater.on('error', (err) => {
  console.log('Auto-updater error:', err);
});

// Test the update check
async function testUpdateCheck() {
  try {
    console.log('Starting update check...');
    await autoUpdater.checkForUpdates();
    console.log('Update check completed');
  } catch (error) {
    console.error('Error during update check:', error);
  }
}

testUpdateCheck(); 