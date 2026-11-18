import { useEffect, useState } from 'react';
import { liveEngine } from './liveEngine';

const EMPTY = { live: [], history: [], stats: null, rows: [], connected: 0, status: {} };

/**
 * Subscribes to the browser-side exchange engine while `enabled`.
 * Signals refresh every second, market rows every two seconds.
 */
export default function useLiveMarket({ enabled, sensitivity, timeframe }) {
  const [data, setData] = useState(EMPTY);

  useEffect(() => {
    if (!enabled) return undefined;
    liveEngine.start();
    return () => liveEngine.stop();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    liveEngine.setTimeframe(timeframe);
    let tick = 0;
    let rows = [];
    const pull = () => {
      const v = liveEngine.view(sensitivity, timeframe);
      if (tick % 2 === 0) rows = liveEngine.rows();
      tick += 1;
      setData({ ...v, rows, connected: liveEngine.connected(), status: { ...liveEngine.status } });
    };
    pull();
    const id = setInterval(pull, 1000);
    return () => clearInterval(id);
  }, [enabled, sensitivity, timeframe]);

  return enabled ? data : EMPTY;
}
