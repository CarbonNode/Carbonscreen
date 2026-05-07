import { useCallback } from 'react';

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  accentColor?: 'default' | 'success';
}

export default function ToggleSwitch({
  label,
  checked,
  onChange,
  accentColor = 'default',
}: ToggleSwitchProps) {
  const handleToggle = useCallback(() => {
    onChange(!checked);
  }, [checked, onChange]);

  return (
    <div className="toggle-switch" onClick={handleToggle}>
      <span className="toggle-label">{label}</span>
      <div className={`toggle-track ${checked ? 'active' : ''} ${accentColor}`}>
        <div className="toggle-thumb" />
      </div>

      <style jsx>{`
        .toggle-switch {
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          padding: 4px 0;
          transition: var(--transition);
        }

        .toggle-switch:hover .toggle-label {
          color: var(--text-primary);
        }

        .toggle-label {
          font-size: 14px;
          color: var(--text-secondary);
          transition: var(--transition);
        }

        .toggle-track {
          position: relative;
          width: 44px;
          height: 24px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          transition: var(--transition);
        }

        .toggle-track.active.default {
          background: var(--accent);
        }

        .toggle-track.active.success {
          background: var(--success);
        }

        .toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: var(--transition);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .toggle-track.active .toggle-thumb {
          left: calc(100% - 22px);
        }

        .toggle-switch:active .toggle-thumb {
          width: 24px;
        }

        .toggle-track.active:active .toggle-thumb {
          left: calc(100% - 26px);
        }
      `}</style>
    </div>
  );
}
