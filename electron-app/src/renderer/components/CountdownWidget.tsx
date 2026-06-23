import { useMemo } from 'react';

interface CountdownWidgetProps {
  remaining: number;
  total: number;
  isActive: boolean;
  onClose: () => void;
}

export default function CountdownWidget({
  remaining,
  total,
  isActive,
  onClose,
}: CountdownWidgetProps) {
  const progress = useMemo(() => {
    if (total <= 0) return 0;
    return Math.min(100, Math.max(0, (remaining / total) * 100));
  }, [remaining, total]);

  const time = useMemo(() => {
    const safe = Math.max(0, remaining);
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return {
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0'),
    };
  }, [remaining]);

  // Green is the widget's identity; it warms to amber/red as the timer runs out,
  // and goes muted when monitoring is paused.
  const ringColor = useMemo(() => {
    if (!isActive) return '#8a94a6';
    if (progress > 50) return '#34d399';
    if (progress > 20) return '#fbbf24';
    return '#f87171';
  }, [progress, isActive]);

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="widget-root">
      <div className={`pill ${isActive ? '' : 'paused'}`}>
        <button
          className="close-btn"
          onClick={onClose}
          aria-label="Hide widget"
          title="Hide widget"
        >
          <svg width="8" height="8" viewBox="0 0 8 8">
            <path
              d="M1 1L7 7M1 7L7 1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="ring">
          <svg viewBox="0 0 48 48" className="ring-svg">
            <circle
              cx="24"
              cy="24"
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="4"
            />
            <circle
              cx="24"
              cy="24"
              r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashoffset}
              transform="rotate(-90 24 24)"
              className="ring-progress"
            />
          </svg>
        </div>

        <div className="readout">
          <div className="time">
            <span className="seg">{time.minutes}</span>
            <span className="colon">:</span>
            <span className="seg">{time.seconds}</span>
          </div>
          <div className="label">
            {isActive ? 'until screensaver' : 'monitoring paused'}
          </div>
        </div>
      </div>

      <style jsx>{`
        .widget-root {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 16px;
          background: transparent;
          -webkit-app-region: drag;
          cursor: grab;
        }

        .widget-root:active {
          cursor: grabbing;
        }

        .pill {
          position: relative;
          display: flex;
          align-items: center;
          gap: 14px;
          width: 220px;
          height: 76px;
          padding: 0 20px;
          border-radius: 22px;
          background: linear-gradient(
            135deg,
            rgba(22, 32, 28, 0.72) 0%,
            rgba(13, 20, 18, 0.64) 100%
          );
          border: 1px solid rgba(120, 230, 170, 0.16);
          box-shadow:
            0 6px 20px rgba(0, 0, 0, 0.5),
            0 0 20px rgba(52, 211, 153, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.07);
          -webkit-backdrop-filter: blur(22px) saturate(150%);
          backdrop-filter: blur(22px) saturate(150%);
          transition: border-color 0.4s ease, box-shadow 0.4s ease, opacity 0.4s ease;
        }

        .pill.paused {
          opacity: 0.82;
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow:
            0 6px 18px rgba(0, 0, 0, 0.45),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .ring {
          width: 48px;
          height: 48px;
          flex-shrink: 0;
        }

        .ring-svg {
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 0 6px ${ringColor}55);
        }

        .ring-progress {
          transition: stroke-dashoffset 0.6s ease-out, stroke 0.4s ease;
        }

        .readout {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }

        .time {
          display: flex;
          align-items: baseline;
          font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
          font-size: 26px;
          font-weight: 600;
          line-height: 1;
          letter-spacing: 0.5px;
          color: ${isActive ? '#eef3f0' : '#9aa4ad'};
          font-variant-numeric: tabular-nums;
          transition: color 0.4s ease;
        }

        .seg {
          min-width: 32px;
          text-align: center;
        }

        .colon {
          margin: 0 1px;
          color: ${ringColor};
          transition: color 0.4s ease;
          animation: ${isActive ? 'blink 1s ease-in-out infinite' : 'none'};
        }

        .label {
          font-size: 10.5px;
          font-weight: 500;
          letter-spacing: 0.6px;
          color: rgba(185, 205, 195, 0.5);
          white-space: nowrap;
        }

        .close-btn {
          position: absolute;
          top: 9px;
          right: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          padding: 0;
          border: none;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.06);
          color: rgba(235, 245, 240, 0.65);
          cursor: pointer;
          opacity: 0;
          transform: scale(0.85);
          transition: opacity 0.2s ease, transform 0.2s ease, background 0.2s ease,
            color 0.2s ease;
          -webkit-app-region: no-drag;
        }

        .widget-root:hover .close-btn {
          opacity: 1;
          transform: scale(1);
        }

        .close-btn:hover {
          background: rgba(248, 113, 113, 0.85);
          color: #fff;
        }

        .close-btn:active {
          transform: scale(0.9);
        }

        @keyframes blink {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.35;
          }
        }
      `}</style>
    </div>
  );
}
