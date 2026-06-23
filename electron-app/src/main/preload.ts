import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Configuration
  getConfig: () => ipcRenderer.invoke('get-config'),
  setIdleThreshold: (minutes: number) => ipcRenderer.invoke('set-idle-threshold', minutes),
  toggleStartup: (enabled: boolean) => ipcRenderer.invoke('toggle-startup', enabled),
  toggleActive: (active: boolean) => ipcRenderer.invoke('toggle-active', active),
  getRemainingTime: () => ipcRenderer.invoke('get-remaining-time'),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),

  // Floating widget
  getWidgetState: () => ipcRenderer.invoke('widget:get-state'),
  toggleWidget: (enabled: boolean) => ipcRenderer.invoke('toggle-widget', enabled),
  hideWidget: () => ipcRenderer.send('widget:hide'),

  // Event listeners
  onCountdownUpdate: (callback: (remaining: number) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, remaining: number) => callback(remaining);
    ipcRenderer.on('countdown-update', handler);
    return () => ipcRenderer.removeListener('countdown-update', handler);
  },

  onStartupChanged: (callback: (enabled: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, enabled: boolean) => callback(enabled);
    ipcRenderer.on('startup-changed', handler);
    return () => ipcRenderer.removeListener('startup-changed', handler);
  },

  onActiveChanged: (callback: (active: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, active: boolean) => callback(active);
    ipcRenderer.on('active-changed', handler);
    return () => ipcRenderer.removeListener('active-changed', handler);
  },

  onThresholdChanged: (callback: (minutes: number) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, minutes: number) => callback(minutes);
    ipcRenderer.on('threshold-changed', handler);
    return () => ipcRenderer.removeListener('threshold-changed', handler);
  },

  onWidgetVisibilityChanged: (callback: (visible: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, visible: boolean) => callback(visible);
    ipcRenderer.on('widget-visibility-changed', handler);
    return () => ipcRenderer.removeListener('widget-visibility-changed', handler);
  },
});

// Type definitions for the exposed API
export interface ElectronAPI {
  getConfig: () => Promise<{
    idleThreshold: number;
    startupEnabled: boolean;
    isActive: boolean;
    widgetEnabled: boolean;
  }>;
  setIdleThreshold: (minutes: number) => Promise<boolean>;
  toggleStartup: (enabled: boolean) => Promise<boolean>;
  toggleActive: (active: boolean) => Promise<boolean>;
  getRemainingTime: () => Promise<number>;
  minimizeWindow: () => void;
  closeWindow: () => void;
  getWidgetState: () => Promise<{
    remainingTime: number;
    totalTime: number;
    isActive: boolean;
  }>;
  toggleWidget: (enabled: boolean) => Promise<boolean>;
  hideWidget: () => void;
  onCountdownUpdate: (callback: (remaining: number) => void) => () => void;
  onStartupChanged: (callback: (enabled: boolean) => void) => () => void;
  onActiveChanged: (callback: (active: boolean) => void) => () => void;
  onThresholdChanged: (callback: (minutes: number) => void) => () => void;
  onWidgetVisibilityChanged: (callback: (visible: boolean) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
