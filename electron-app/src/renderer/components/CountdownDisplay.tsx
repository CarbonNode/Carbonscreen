import { useMemo } from 'react';

interface CountdownDisplayProps {
  remainingTime: number;
  totalTime: number;
  isActive: boolean;
}

export default function CountdownDisplay({
  remainingTime,
  totalTime,
  isActive,
}: CountdownDisplayProps) {
  const progress = useMemo(() => {
    if (totalTime === 0) return 100;
    return (remainingTime / totalTime) * 100;
  }, [remainingTime, totalTime]);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    return {
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0'),
    };
  }, [remainingTime]);

  const progressColor = useMemo(() => {
    if (!isActive) return 'var(--text-secondary)';
    if (progress > 50) return 'var(--success)';
    if (progress > 20) return 'var(--warning)';
    return 'var(--accent)';
  }, [progress, isActive]);

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="countdown-container">
      <div className="countdown-ring">
        <svg viewBox="0 0 100 100" className="progress-ring">
          {/* Background ring */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="6"
          />
          {/* Progress ring */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={progressColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 50 50)"
            className="progress-circle"
          />
        </svg>
        <div className="time-display">
          <span className="time-value">{formattedTime.minutes}</span>
          <span className="time-separator">:</span>
          <span className="time-value">{formattedTime.seconds}</span>
        </div>
      </div>
      <p className="countdown-label">
        {isActive ? 'until screensaver' : 'monitoring paused'}
      </p>

      <style jsx>{`
        .countdown-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .countdown-ring {
          position: relative;
          width: 140px;
          height: 140px;
        }

        .progress-ring {
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 0 10px ${progressColor}40);
        }

        .progress-circle {
          transition: stroke-dashoffset 0.5s ease-out, stroke 0.3s ease;
        }

        .time-display {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'SF Mono', 'Fira Code', monospace;
        }

        .time-value {
          font-size: 28px;
          font-weight: 600;
          color: var(--text-primary);
          min-width: 36px;
          text-align: center;
        }

        .time-separator {
          font-size: 28px;
          font-weight: 600;
          color: var(--text-secondary);
          margin: 0 2px;
          animation: ${isActive ? 'pulse 1s ease-in-out infinite' : 'none'};
        }

        .countdown-label {
          font-size: 13px;
          color: var(--text-secondary);
          text-transform: lowercase;
          letter-spacing: 0.5px;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
