import { useEffect, useState } from 'react';
import { useIsFocused } from '@/hooks/useIsFocused';
import { afterPaint } from '@/utils/afterPaint';

// The tabs mount at launch (`lazy: false`), and the splash screen stays until that first commit ends:
// rendering all five at once held it for seconds on a phone (the owner's recording of 2026-11-13). A tab
// that is not the one shown renders nothing at first and mounts after the shown screen has painted, one
// tab per frame, or at once the moment it gains focus.
const waiting: (() => void)[] = [];
let draining = false;

function drain(): void {
  const next = waiting.shift();
  draining = next !== undefined;
  if (next) afterPaint(() => (next(), drain()));
}

export function useDeferredTab(): boolean {
  const focused = useIsFocused();
  const [ready, setReady] = useState(focused);
  useEffect(() => {
    if (ready) return undefined;
    if (focused) {
      setReady(true);
      return undefined;
    }
    const mount = () => setReady(true);
    waiting.push(mount);
    if (!draining) drain();
    return () => {
      const at = waiting.indexOf(mount);
      if (at >= 0) waiting.splice(at, 1);
    };
  }, [focused, ready]);
  return ready || focused;
}
