import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen } from 'electron';
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
  let widgetWindow: BrowserWindow | null = null;
  let tray: Tray | null = null;
  let idleChecker: IdleChecker | null = null;
  const config = new ConfigStore();

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  // Floating widget window dimensions. The window is larger than the visible
  // pill (220x76) so its soft shadow/green glow has transparent room and isn't
  // clipped at the window edge; the surrounding margin is part of the drag area.
  const WIDGET_WIDTH = 268;
  const WIDGET_HEIGHT = 120;

  function getResourcePath(filename: string): string {
    if (isDev) {
      return path.join(__dirname, '../../resources', filename);
    }
    return path.join(process.resourcesPath, 'resources', filename);
  }

  // Send a message to every live renderer (main window + floating widget).
  function broadcast(channel: string, ...args: any[]): void {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, ...args);
      }
    });
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

  // True when the widget's centre would land on a currently-connected display, so a
  // stale saved position (e.g. from an unplugged monitor) falls back to the default.
  function isOnScreen(x: number, y: number, w: number, h: number): boolean {
    const cx = x + w / 2;
    const cy = y + h / 2;
    return screen.getAllDisplays().some((display) => {
      const area = display.workArea;
      return cx >= area.x && cx <= area.x + area.width && cy >= area.y && cy <= area.y + area.height;
    });
  }

  function createWidgetWindow(): void {
    const iconPath = getResourcePath('icon.ico');
    const primary = screen.getPrimaryDisplay().workArea;
    const defaultX = primary.x + primary.width - WIDGET_WIDTH - 24;
    const defaultY = primary.y + primary.height - WIDGET_HEIGHT - 24;

    const saved = config.get('widgetPosition', null);
    const useSaved = saved !== null && isOnScreen(saved.x, saved.y, WIDGET_WIDTH, WIDGET_HEIGHT);

    widgetWindow = new BrowserWindow({
      width: WIDGET_WIDTH,
      height: WIDGET_HEIGHT,
      x: useSaved ? saved!.x : defaultX,
      y: useSaved ? saved!.y : defaultY,
      frame: false,
      transparent: true,
      resizable: false,
      movable: true,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      hasShadow: false,
      icon: iconPath,
      title: 'CarbonScreen Widget',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      show: false,
    });

    // Float above normal windows without climbing onto the screensaver layer.
    widgetWindow.setAlwaysOnTop(true, 'floating');

    if (isDev) {
      widgetWindow.loadURL('http://localhost:3456/widget');
    } else {
      widgetWindow.loadFile(path.join(__dirname, '../renderer/widget/index.html'));
    }

    // Persist position as the user drags the frameless window around.
    widgetWindow.on('moved', () => {
      if (!widgetWindow || widgetWindow.isDestroyed()) return;
      const [x, y] = widgetWindow.getPosition();
      config.set('widgetPosition', { x, y });
    });

    // Closing the widget (e.g. Alt+F4) just hides it unless the app is quitting.
    widgetWindow.on('close', (event) => {
      if (!isQuitting) {
        event.preventDefault();
        hideWidget();
      }
    });

    widgetWindow.on('closed', () => {
      widgetWindow = null;
    });
  }

  function showWidget(): void {
    if (!widgetWindow || widgetWindow.isDestroyed()) {
      createWidgetWindow();
    }
    widgetWindow?.show();
    config.set('widgetEnabled', true);
    notifyWidgetVisibility(true);
    refreshTrayMenu();
  }

  function hideWidget(): void {
    widgetWindow?.hide();
    config.set('widgetEnabled', false);
    notifyWidgetVisibility(false);
    refreshTrayMenu();
  }

  function notifyWidgetVisibility(visible: boolean): void {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('widget-visibility-changed', visible);
    }
  }

  function buildTrayMenu(): Menu {
    return Menu.buildFromTemplate([
      {
        label: 'Show',
        click: () => {
          mainWindow?.show();
          mainWindow?.focus();
        },
      },
      {
        label: 'Floating Widget',
        type: 'checkbox',
        checked: config.get('widgetEnabled', false),
        click: (menuItem) => {
          if (menuItem.checked) {
            showWidget();
          } else {
            hideWidget();
          }
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
  }

  function refreshTrayMenu(): void {
    tray?.setContextMenu(buildTrayMenu());
  }

  function createTray(): void {
    const iconPath = getResourcePath('icon.ico');
    const icon = nativeImage.createFromPath(iconPath);

    tray = new Tray(icon.resize({ width: 16, height: 16 }));
    tray.setToolTip("Carbon Screen");
    tray.setContextMenu(buildTrayMenu());

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
        widgetEnabled: config.get('widgetEnabled', false),
      };
    });

    // Set idle threshold
    ipcMain.handle('set-idle-threshold', (_event, minutes: number) => {
      config.set('idleThreshold', minutes);
      idleChecker?.setThreshold(minutes);
      broadcast('threshold-changed', minutes);
      return true;
    });

    // Toggle startup
    ipcMain.handle('toggle-startup', (_event, enabled: boolean) => {
      const success = setStartup(enabled);
      if (success) {
        config.set('startupEnabled', enabled);
        // Update tray menu checkbox
        refreshTrayMenu();
      }
      return success;
    });

    // Toggle active state
    ipcMain.handle('toggle-active', (_event, active: boolean) => {
      config.set('isActive', active);
      idleChecker?.setActive(active);
      broadcast('active-changed', active);
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

    // Floating widget — initial state for its first render
    ipcMain.handle('widget:get-state', () => {
      const threshold = config.get('idleThreshold', 1) as number;
      return {
        remainingTime: idleChecker?.getRemainingTime() ?? threshold * 60,
        totalTime: threshold * 60,
        isActive: config.get('isActive', true),
      };
    });

    // Show/hide the floating widget (from the main window toggle)
    ipcMain.handle('toggle-widget', (_event, enabled: boolean) => {
      if (enabled) {
        showWidget();
      } else {
        hideWidget();
      }
      return enabled;
    });

    // Hide the widget (from its own close affordance)
    ipcMain.on('widget:hide', () => {
      hideWidget();
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
      broadcast('countdown-update', remaining);
    });

    idleChecker.setActive(isActive);

    // Restore the floating widget if it was left enabled last session
    if (config.get('widgetEnabled', false)) {
      showWidget();
    }
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
