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
});

// Type definitions for the exposed API
export interface ElectronAPI {
  getConfig: () => Promise<{
    idleThreshold: number;
    startupEnabled: boolean;
    isActive: boolean;
  }>;
  setIdleThreshold: (minutes: number) => Promise<boolean>;
  toggleStartup: (enabled: boolean) => Promise<boolean>;
  toggleActive: (active: boolean) => Promise<boolean>;
  getRemainingTime: () => Promise<number>;
  minimizeWindow: () => void;
  closeWindow: () => void;
  onCountdownUpdate: (callback: (remaining: number) => void) => () => void;
  onStartupChanged: (callback: (enabled: boolean) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
