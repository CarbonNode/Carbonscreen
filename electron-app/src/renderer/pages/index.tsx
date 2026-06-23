import { useState, useEffect, useCallback } from 'react';
import TitleBar from '@/components/TitleBar';
import CountdownDisplay from '@/components/CountdownDisplay';
import ThresholdSlider from '@/components/ThresholdSlider';
import ToggleSwitch from '@/components/ToggleSwitch';
import StatusIndicator from '@/components/StatusIndicator';

interface Config {
  idleThreshold: number;
  startupEnabled: boolean;
  isActive: boolean;
  widgetEnabled: boolean;
}

export default function Home() {
  const [config, setConfig] = useState<Config>({
    idleThreshold: 1,
    startupEnabled: false,
    isActive: true,
    widgetEnabled: false,
  });
  const [remainingTime, setRemainingTime] = useState<number>(60);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load initial configuration
  useEffect(() => {
    const loadConfig = async () => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        try {
          const savedConfig = await window.electronAPI.getConfig();
          setConfig(savedConfig);
          setRemainingTime(savedConfig.idleThreshold * 60);
          setIsLoaded(true);
        } catch (error) {
          console.error('Failed to load config:', error);
          setIsLoaded(true);
        }
      } else {
        // Development fallback
        setIsLoaded(true);
      }
    };

    loadConfig();
  }, []);

  // Subscribe to countdown updates
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const unsubscribe = window.electronAPI.onCountdownUpdate((remaining) => {
        setRemainingTime(remaining);
      });

      return () => unsubscribe();
    }
  }, []);

  // Subscribe to startup changes from tray
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const unsubscribe = window.electronAPI.onStartupChanged((enabled) => {
        setConfig((prev) => ({ ...prev, startupEnabled: enabled }));
      });

      return () => unsubscribe();
    }
  }, []);

  // Keep the toggle in sync when the widget is shown/hidden from the tray
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const unsubscribe = window.electronAPI.onWidgetVisibilityChanged((visible) => {
        setConfig((prev) => ({ ...prev, widgetEnabled: visible }));
      });

      return () => unsubscribe();
    }
  }, []);

  const handleThresholdChange = useCallback(async (minutes: number) => {
    setConfig((prev) => ({ ...prev, idleThreshold: minutes }));
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.setIdleThreshold(minutes);
    }
  }, []);

  const handleStartupToggle = useCallback(async (enabled: boolean) => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const success = await window.electronAPI.toggleStartup(enabled);
      if (success) {
        setConfig((prev) => ({ ...prev, startupEnabled: enabled }));
      }
    } else {
      setConfig((prev) => ({ ...prev, startupEnabled: enabled }));
    }
  }, []);

  const handleActiveToggle = useCallback(async (active: boolean) => {
    setConfig((prev) => ({ ...prev, isActive: active }));
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.toggleActive(active);
    }
  }, []);

  const handleWidgetToggle = useCallback(async (enabled: boolean) => {
    setConfig((prev) => ({ ...prev, widgetEnabled: enabled }));
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.toggleWidget(enabled);
    }
  }, []);

  if (!isLoaded) {
    return (
      <div className="app-container loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="app-container">
      <TitleBar />

      <main className="main-content">
        <div className="content-wrapper animate-slide-in">
          <StatusIndicator isActive={config.isActive} />

          <CountdownDisplay
            remainingTime={remainingTime}
            totalTime={config.idleThreshold * 60}
            isActive={config.isActive}
          />

          <div className="controls-section">
            <ThresholdSlider
              value={config.idleThreshold}
              onChange={handleThresholdChange}
              disabled={!config.isActive}
            />

            <div className="toggle-group">
              <ToggleSwitch
                label="Floating Widget"
                checked={config.widgetEnabled}
                onChange={handleWidgetToggle}
                accentColor="success"
              />

              <ToggleSwitch
                label="Start with Windows"
                checked={config.startupEnabled}
                onChange={handleStartupToggle}
              />

              <ToggleSwitch
                label="Monitoring Active"
                checked={config.isActive}
                onChange={handleActiveToggle}
                accentColor="success"
              />
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .app-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
        }

        .app-container.loading {
          justify-content: center;
          align-items: center;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--bg-tertiary);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 16px 24px 24px;
          overflow: hidden;
        }

        .content-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .controls-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .toggle-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--border-radius);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
}
