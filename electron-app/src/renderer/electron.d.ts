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
