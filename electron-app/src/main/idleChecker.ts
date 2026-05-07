import { exec } from 'child_process';
import * as path from 'path';
import { uIOhook, UiohookMouseEvent, UiohookKeyboardEvent, UiohookWheelEvent } from 'uiohook-napi';

export class IdleChecker {
  private thresholdSeconds: number;
  private lastActivityTime: number;
  private isActive: boolean;
  private screensaverRunning: boolean;
  private checkInterval: NodeJS.Timeout | null = null;
  private fullscreenCheckInterval: NodeJS.Timeout | null = null;
  private onCountdownUpdate: (remaining: number) => void;
  private inputListenersStarted: boolean = false;

  constructor(thresholdMinutes: number, onCountdownUpdate: (remaining: number) => void) {
    this.thresholdSeconds = thresholdMinutes * 60;
    this.lastActivityTime = Date.now();
    this.isActive = true;
    this.screensaverRunning = false;
    this.onCountdownUpdate = onCountdownUpdate;

    this.startInputListeners();
    this.startIdleCheck();
    this.startFullscreenCheck();
  }

  private startInputListeners(): void {
    if (this.inputListenersStarted) return;

    try {
      // Mouse events
      uIOhook.on('mousemove', (_e: UiohookMouseEvent) => {
        this.updateActivity();
      });

      uIOhook.on('mousedown', (_e: UiohookMouseEvent) => {
        this.updateActivity();
      });

      uIOhook.on('mouseup', (_e: UiohookMouseEvent) => {
        this.updateActivity();
      });

      uIOhook.on('wheel', (_e: UiohookWheelEvent) => {
        this.updateActivity();
      });

      // Keyboard events
      uIOhook.on('keydown', (_e: UiohookKeyboardEvent) => {
        this.updateActivity();
      });

      uIOhook.on('keyup', (_e: UiohookKeyboardEvent) => {
        this.updateActivity();
      });

      // Start the hook
      uIOhook.start();
      this.inputListenersStarted = true;
      console.log('Global input listeners started');
    } catch (error) {
      console.error('Failed to start input listeners:', error);
      // Fallback: just use timer-based checking
      this.startFallbackActivityCheck();
    }
  }

  private startFallbackActivityCheck(): void {
    // Fallback using PowerShell to get last input time
    setInterval(() => {
      this.checkLastInputTime();
    }, 1000);
  }

  private checkLastInputTime(): void {
    // Use PowerShell to get actual Windows idle time
    const script = `
      Add-Type @'
        using System;
        using System.Runtime.InteropServices;
        public class IdleTime {
          [DllImport("user32.dll")]
          static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

          [StructLayout(LayoutKind.Sequential)]
          struct LASTINPUTINFO {
            public uint cbSize;
            public uint dwTime;
          }

          public static uint GetIdleTime() {
            LASTINPUTINFO lastInput = new LASTINPUTINFO();
            lastInput.cbSize = (uint)Marshal.SizeOf(lastInput);
            GetLastInputInfo(ref lastInput);
            return (uint)Environment.TickCount - lastInput.dwTime;
          }
        }
'@
      [IdleTime]::GetIdleTime()
    `;

    exec(`powershell.exe -Command "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, (error, stdout) => {
      if (!error && stdout) {
        const idleMs = parseInt(stdout.trim(), 10);
        if (!isNaN(idleMs) && idleMs < 1000) {
          // Activity detected in last second
          this.updateActivity();
        }
      }
    });
  }

  private updateActivity(): void {
    this.lastActivityTime = Date.now();
    if (this.screensaverRunning) {
      this.screensaverRunning = false;
    }
  }

  private startIdleCheck(): void {
    this.checkInterval = setInterval(() => {
      this.checkIdle();
    }, 1000);
  }

  private startFullscreenCheck(): void {
    this.fullscreenCheckInterval = setInterval(() => {
      // If fullscreen app is running, don't trigger screensaver
      // but we might want to still track for other purposes
    }, 5000);
  }

  private checkIdle(): void {
    if (!this.isActive) {
      this.onCountdownUpdate(this.thresholdSeconds);
      return;
    }

    const currentTime = Date.now();
    const idleTimeSeconds = (currentTime - this.lastActivityTime) / 1000;
    const remainingTime = Math.max(0, Math.floor(this.thresholdSeconds - idleTimeSeconds));

    this.onCountdownUpdate(remainingTime);

    // Check if we should trigger screensaver
    if (idleTimeSeconds >= this.thresholdSeconds && !this.screensaverRunning) {
      this.isFullscreen().then((isFullscreen) => {
        if (!isFullscreen && !this.screensaverRunning) {
          console.log('Idle threshold exceeded. Launching screensaver.');
          this.startScreensaver();
          this.screensaverRunning = true;
        }
      });
    }
  }

  private async isFullscreen(): Promise<boolean> {
    return new Promise((resolve) => {
      // PowerShell script to check if foreground window is fullscreen
      const script = `
        Add-Type @'
          using System;
          using System.Runtime.InteropServices;
          public class FullscreenCheck {
            [DllImport("user32.dll")]
            public static extern IntPtr GetForegroundWindow();

            [DllImport("user32.dll")]
            [return: MarshalAs(UnmanagedType.Bool)]
            public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

            [DllImport("user32.dll")]
            public static extern int GetSystemMetrics(int nIndex);

            [StructLayout(LayoutKind.Sequential)]
            public struct RECT {
              public int Left, Top, Right, Bottom;
            }

            public static bool IsFullscreen() {
              IntPtr hwnd = GetForegroundWindow();
              if (hwnd == IntPtr.Zero) return false;

              RECT rect;
              GetWindowRect(hwnd, out rect);

              int screenWidth = GetSystemMetrics(0);
              int screenHeight = GetSystemMetrics(1);

              return rect.Left <= 0 && rect.Top <= 0 &&
                     rect.Right >= screenWidth && rect.Bottom >= screenHeight;
            }
          }
'@
        [FullscreenCheck]::IsFullscreen()
      `;

      exec(`powershell.exe -Command "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, (error, stdout) => {
        if (error) {
          resolve(false);
          return;
        }
        resolve(stdout.trim().toLowerCase() === 'true');
      });
    });
  }

  private startScreensaver(): void {
    const screensaverPath = path.join(
      process.env.WINDIR || 'C:\\Windows',
      'System32',
      'scrnsave.scr'
    );

    exec(`"${screensaverPath}" /s`, (error) => {
      if (error) {
        console.error('Failed to start screensaver:', error);
        // Try alternative method
        exec('rundll32.exe user32.dll,LockWorkStation', (err) => {
          if (err) {
            console.error('Alternative screensaver method also failed:', err);
          }
        });
      }
    });
  }

  public setThreshold(minutes: number): void {
    this.thresholdSeconds = minutes * 60;
    console.log(`Updated idle threshold to ${this.thresholdSeconds} seconds`);
  }

  public setActive(active: boolean): void {
    this.isActive = active;
    console.log(`IdleChecker is now ${active ? 'active' : 'inactive'}`);
    if (active) {
      this.screensaverRunning = false;
      this.lastActivityTime = Date.now();
    }
  }

  public getRemainingTime(): number {
    if (!this.isActive) return this.thresholdSeconds;
    const idleTimeSeconds = (Date.now() - this.lastActivityTime) / 1000;
    return Math.max(0, Math.floor(this.thresholdSeconds - idleTimeSeconds));
  }

  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    if (this.fullscreenCheckInterval) {
      clearInterval(this.fullscreenCheckInterval);
      this.fullscreenCheckInterval = null;
    }
    if (this.inputListenersStarted) {
      try {
        uIOhook.stop();
      } catch (e) {
        console.error('Error stopping uIOhook:', e);
      }
    }
  }
}
