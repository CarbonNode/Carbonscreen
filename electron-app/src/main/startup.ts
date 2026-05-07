import { app } from 'electron';
import { exec } from 'child_process';
import * as path from 'path';

const APP_NAME = 'CarbonScreen';
const REG_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';

export function isInStartup(): boolean {
  try {
    // Use synchronous check via registry query
    const { execSync } = require('child_process');
    const result = execSync(`reg query "${REG_KEY}" /v "${APP_NAME}"`, {
      encoding: 'utf8',
      windowsHide: true,
    });
    return result.includes(APP_NAME);
  } catch {
    return false;
  }
}

export function setStartup(enable: boolean): boolean {
  try {
    if (enable) {
      // Get the executable path
      const exePath = app.isPackaged
        ? process.execPath
        : path.join(__dirname, '../../node_modules/electron/dist/electron.exe');

      // Build the command with --startup flag
      const command = app.isPackaged
        ? `"${exePath}" --startup`
        : `"${exePath}" "${path.join(__dirname, '../..')}" --startup`;

      // Add to registry
      const { execSync } = require('child_process');
      execSync(`reg add "${REG_KEY}" /v "${APP_NAME}" /t REG_SZ /d "${command}" /f`, {
        windowsHide: true,
      });

      console.log('Added to Windows startup');
      return true;
    } else {
      // Remove from registry
      const { execSync } = require('child_process');
      try {
        execSync(`reg delete "${REG_KEY}" /v "${APP_NAME}" /f`, {
          windowsHide: true,
        });
        console.log('Removed from Windows startup');
      } catch {
        // Key might not exist, that's fine
      }
      return true;
    }
  } catch (error) {
    console.error('Failed to modify startup setting:', error);
    return false;
  }
}

// Alternative method using Electron's built-in API (for packaged apps)
export function setStartupElectron(enable: boolean): boolean {
  try {
    app.setLoginItemSettings({
      openAtLogin: enable,
      openAsHidden: true,
      args: ['--startup'],
    });
    return true;
  } catch (error) {
    console.error('Failed to set login item:', error);
    return false;
  }
}
