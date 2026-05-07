import { useCallback } from 'react';

export default function TitleBar() {
  const handleMinimize = useCallback(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.minimizeWindow();
    }
  }, []);

  const handleClose = useCallback(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.closeWindow();
    }
  }, []);

  return (
    <div className="title-bar">
      <div className="title-bar-drag">
        <span className="app-title">Carbon Screen</span>
      </div>
      <div className="window-controls">
        <button
          className="control-btn minimize"
          onClick={handleMinimize}
          aria-label="Minimize"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect y="5" width="12" height="2" fill="currentColor" />
          </svg>
        </button>
        <button
          className="control-btn close"
          onClick={handleClose}
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path
              d="M1 1L11 11M1 11L11 1"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <style jsx>{`
        .title-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 36px;
          padding: 0 8px 0 16px;
          background: rgba(0, 0, 0, 0.2);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          -webkit-app-region: drag;
        }

        .title-bar-drag {
          flex: 1;
          display: flex;
          align-items: center;
        }

        .app-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          letter-spacing: 0.3px;
        }

        .window-controls {
          display: flex;
          gap: 4px;
          -webkit-app-region: no-drag;
        }

        .control-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: var(--transition);
        }

        .control-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-primary);
        }

        .control-btn.close:hover {
          background: var(--accent);
          color: white;
        }

        .control-btn:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
}
