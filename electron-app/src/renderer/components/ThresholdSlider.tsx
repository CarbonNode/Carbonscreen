import { useCallback, useState } from 'react';

interface ThresholdSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export default function ThresholdSlider({
  value,
  onChange,
  disabled = false,
}: ThresholdSliderProps) {
  const [localValue, setLocalValue] = useState(value);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    setLocalValue(newValue);
  }, []);

  const handleChangeEnd = useCallback(() => {
    onChange(localValue);
  }, [localValue, onChange]);

  // Sync local value when prop changes
  if (value !== localValue && document.activeElement?.tagName !== 'INPUT') {
    setLocalValue(value);
  }

  const percentage = ((localValue - 1) / (120 - 1)) * 100;

  return (
    <div className={`threshold-slider ${disabled ? 'disabled' : ''}`}>
      <div className="slider-header">
        <label className="slider-label">Idle Threshold</label>
        <span className="slider-value">
          {localValue} {localValue === 1 ? 'minute' : 'minutes'}
        </span>
      </div>
      <div className="slider-container">
        <input
          type="range"
          min="1"
          max="120"
          value={localValue}
          onChange={handleChange}
          onMouseUp={handleChangeEnd}
          onTouchEnd={handleChangeEnd}
          onKeyUp={handleChangeEnd}
          disabled={disabled}
          className="slider-input"
        />
        <div
          className="slider-track-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="slider-ticks">
        <span>1m</span>
        <span>30m</span>
        <span>60m</span>
        <span>90m</span>
        <span>120m</span>
      </div>

      <style jsx>{`
        .threshold-slider {
          padding: 16px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--border-radius);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: var(--transition);
        }

        .threshold-slider.disabled {
          opacity: 0.5;
          pointer-events: none;
        }

        .slider-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .slider-label {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .slider-value {
          font-size: 14px;
          font-weight: 600;
          color: var(--accent);
          font-family: 'SF Mono', 'Fira Code', monospace;
        }

        .slider-container {
          position: relative;
          height: 8px;
          margin-bottom: 8px;
        }

        .slider-input {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          outline: none;
          cursor: pointer;
          position: relative;
          z-index: 2;
        }

        .slider-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: var(--accent);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(233, 69, 96, 0.4);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .slider-input::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 2px 12px rgba(233, 69, 96, 0.6);
        }

        .slider-input::-webkit-slider-thumb:active {
          transform: scale(0.95);
        }

        .slider-track-fill {
          position: absolute;
          top: 0;
          left: 0;
          height: 8px;
          background: linear-gradient(90deg, var(--accent) 0%, var(--accent-hover) 100%);
          border-radius: 4px;
          pointer-events: none;
          z-index: 1;
        }

        .slider-ticks {
          display: flex;
          justify-content: space-between;
          padding: 0 4px;
        }

        .slider-ticks span {
          font-size: 10px;
          color: var(--text-secondary);
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
}
