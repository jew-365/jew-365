import { useEffect, useRef, useState } from 'react';
import { useIsFocused } from './useIsFocused';

const MINUTE_MS = 60_000;

export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  const focused = useIsFocused();
  const stale = useRef(false);

  useEffect(() => {
    if (!focused) {
      stale.current = true;
      return;
    }
    if (stale.current) {
      stale.current = false;
      setNow(new Date());
    }
    let interval: ReturnType<typeof setInterval> | null = null;
    const align = setTimeout(
      () => {
        setNow(new Date());
        interval = setInterval(() => setNow(new Date()), intervalMs);
      },
      MINUTE_MS - (Date.now() % MINUTE_MS),
    );
    return () => {
      clearTimeout(align);
      if (interval) clearInterval(interval);
    };
  }, [intervalMs, focused]);

  return now;
}
