import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell } from 'electron';
import * as path from 'path';
import { IdleChecker } from './idleChecker';
import { ConfigStore } from './config';
import { setStartup, isInStartup } from './startup';

// Track if app is quitting (for close vs minimize-to-tray behavior)
let isQuitting = false;

// Set app name + AppUserModelID so taskbar/tray show "CarbonScreen" with our icon
// instead of the generic "Electron" identity.
app.setName('CarbonScreen');
app.setAppUserModelId('com.carbon.screen');

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  let mainWindow: BrowserWindow | null = null;
  let tray: Tray | null = null;
  let idleChecker: IdleChecker | null = null;
  const config = new ConfigStore();

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  function getResourcePath(filename: string): string {
    if (isDev) {
      return path.join(__dirname, '../../resources', filename);
    }
    return path.join(process.resourcesPath, 'resources', filename);
  }

  function createWindow(): void {
    const iconPath = getResourcePath('icon.ico');

    mainWindow = new BrowserWindow({
      width: 400,
      height: 540,
      minWidth: 350,
      minHeight: 480,
      resizable: true,
      frame: false,
      transparent: false,
      backgroundColor: '#1a1a2e',
      icon: iconPath,
      title: 'CarbonScreen',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      show: false,
    });

    // Load the renderer
    if (isDev) {
      mainWindow.loadURL('http://localhost:3456');
      // mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
      mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    // Start hidden — the app lives in the system tray. Users open the window
    // via the tray icon (double-click or "Show" menu item). The --show flag
    // can be used to force the window open at launch.
    mainWindow.once('ready-to-show', () => {
      if (process.argv.includes('--show')) {
        mainWindow?.show();
      }
    });

    // Minimize to tray instead of closing
    mainWindow.on('close', (event) => {
      if (!isQuitting) {
        event.preventDefault();
        mainWindow?.hide();
      }
    });
  }

  function createTray(): void {
    const iconPath = getResourcePath('icon.ico');
    const icon = nativeImage.createFromPath(iconPath);

    tray = new Tray(icon.resize({ width: 16, height: 16 }));
    tray.setToolTip("Carbon Screen");

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show',
        click: () => {
          mainWindow?.show();
          mainWindow?.focus();
        },
      },
      {
        label: 'Start with Windows',
        type: 'checkbox',
        checked: isInStartup(),
        click: (menuItem) => {
          const success = setStartup(menuItem.checked);
          if (!success) {
            menuItem.checked = !menuItem.checked;
          }
          config.set('startupEnabled', menuItem.checked);
          mainWindow?.webContents.send('startup-changed', menuItem.checked);
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
      mainWindow?.show();
      mainWindow?.focus();
    });
  }

  function setupIPC(): void {
    // Get configuration
    ipcMain.handle('get-config', () => {
      return {
        idleThreshold: config.get('idleThreshold', 1),
        startupEnabled: isInStartup(),
        isActive: config.get('isActive', true),
      };
    });

    // Set idle threshold
    ipcMain.handle('set-idle-threshold', (_event, minutes: number) => {
      config.set('idleThreshold', minutes);
      idleChecker?.setThreshold(minutes);
      return true;
    });

    // Toggle startup
    ipcMain.handle('toggle-startup', (_event, enabled: boolean) => {
      const success = setStartup(enabled);
      if (success) {
        config.set('startupEnabled', enabled);
        // Update tray menu
        createTray();
      }
      return success;
    });

    // Toggle active state
    ipcMain.handle('toggle-active', (_event, active: boolean) => {
      config.set('isActive', active);
      idleChecker?.setActive(active);
      return true;
    });

    // Window controls
    ipcMain.on('minimize-window', () => {
      mainWindow?.minimize();
    });

    ipcMain.on('close-window', () => {
      mainWindow?.hide();
    });

    // Get remaining time
    ipcMain.handle('get-remaining-time', () => {
      return idleChecker?.getRemainingTime() ?? 0;
    });
  }

  app.whenReady().then(() => {
    createWindow();
    createTray();
    setupIPC();

    // Initialize idle checker with saved settings
    const threshold = config.get('idleThreshold', 1) as number;
    const isActive = config.get('isActive', true) as boolean;

    idleChecker = new IdleChecker(threshold, (remaining) => {
      mainWindow?.webContents.send('countdown-update', remaining);
    });

    idleChecker.setActive(isActive);
  });

  app.on('second-instance', () => {
    // If user tries to open another instance, focus the existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.on('window-all-closed', () => {
    // Don't quit on macOS when windows are closed
    if (process.platform !== 'darwin') {
      // On Windows, we still don't want to quit - app runs in tray
    }
  });

  app.on('before-quit', () => {
    isQuitting = true;
    idleChecker?.stop();
  });
}
