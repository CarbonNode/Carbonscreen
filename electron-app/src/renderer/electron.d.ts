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
