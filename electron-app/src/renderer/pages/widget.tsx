import { useEffect, useState } from 'react';
import CountdownWidget from '@/components/CountdownWidget';

export default function WidgetPage() {
  const [remaining, setRemaining] = useState(60);
  const [total, setTotal] = useState(60);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI) return;
    const api = window.electronAPI;
    let mounted = true;

    api
      .getWidgetState()
      .then((state) => {
        if (!mounted) return;
        setRemaining(state.remainingTime);
        setTotal(state.totalTime);
        setIsActive(state.isActive);
      })
      .catch(() => {
        /* main process not ready yet — live events will catch us up */
      });

    const offCountdown = api.onCountdownUpdate((value) => setRemaining(value));
    const offActive = api.onActiveChanged((value) => setIsActive(value));
    const offThreshold = api.onThresholdChanged((minutes) => setTotal(minutes * 60));

    return () => {
      mounted = false;
      offCountdown();
      offActive();
      offThreshold();
    };
  }, []);

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.hideWidget();
    }
  };

  return (
    <>
      <CountdownWidget
        remaining={remaining}
        total={total}
        isActive={isActive}
        onClose={handleClose}
      />
      <style jsx global>{`
        html,
        body,
        #__next {
          background: transparent !important;
        }
        body {
          overflow: hidden;
        }
      `}</style>
    </>
  );
}
