interface StatusIndicatorProps {
  isActive: boolean;
}

export default function StatusIndicator({ isActive }: StatusIndicatorProps) {
  return (
    <div className="status-indicator">
      <div className={`status-dot ${isActive ? 'active' : 'inactive'}`} />
      <span className="status-text">
        {isActive ? 'Monitoring Active' : 'Monitoring Paused'}
      </span>

      <style jsx>{`
        .status-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 20px;
          align-self: center;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          transition: var(--transition);
        }

        .status-dot.active {
          background: var(--success);
          box-shadow: 0 0 8px var(--success);
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .status-dot.inactive {
          background: var(--text-secondary);
        }

        .status-text {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 8px var(--success);
          }
          50% {
            box-shadow: 0 0 16px var(--success);
          }
        }
      `}</style>
    </div>
  );
}
