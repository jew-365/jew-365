import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Dimensions, type ScrollView, type View } from 'react-native';
import { useReduceMotion } from '@/hooks/useMotion';
import { motion } from '@/theme/tokens';

export type ViewportBounds = { top: number; height: number };
export type ViewportBus = {
  tracked: boolean;
  subscribe: (listener: () => void) => () => void;
  measure: (callback: (bounds: ViewportBounds) => void) => void;
};
export type InViewOptions = { share?: number; resetKey?: unknown; enabled?: boolean };
export type InView = { ref: RefObject<View | null>; inView: boolean; onLayout: (() => void) | undefined };

const windowBounds = (): ViewportBounds => ({ top: 0, height: Dimensions.get('window').height });
const UNTRACKED: ViewportBus = {
  tracked: false,
  subscribe: () => () => {},
  measure: (callback) => callback(windowBounds()),
};
export const ViewportContext = createContext<ViewportBus>(UNTRACKED);

export function isInViewport(top: number, height: number, viewport: number, share: number): boolean {
  if (height <= 0) return false;
  const needed = Math.min(height, viewport) * share;
  return top + needed <= viewport && top + height - needed >= 0;
}

export function isOutOfViewport(top: number, height: number, viewport: number): boolean {
  return height <= 0 || top >= viewport || top + height <= 0;
}

export function useViewport(): { bus: ViewportBus; notify: () => void; ref: RefObject<ScrollView | null> } {
  const container = useRef<ScrollView>(null);
  const listeners = useRef(new Set<() => void>());
  const last = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useCallback(() => {
    timer.current = null;
    last.current = Date.now();
    [...listeners.current].forEach((listener) => listener());
  }, []);
  const notify = useCallback(() => {
    if (timer.current !== null) return;
    const wait = motion.inViewThrottleMs - (Date.now() - last.current);
    if (wait <= 0) flush();
    else timer.current = setTimeout(flush, wait);
  }, [flush]);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );
  const bus = useMemo<ViewportBus>(
    () => ({
      tracked: true,
      subscribe: (listener) => {
        listeners.current.add(listener);
        return () => {
          listeners.current.delete(listener);
        };
      },
      measure: (callback) => {
        const node = container.current as unknown as View | null;
        if (!node) {
          callback(windowBounds());
          return;
        }
        node.measureInWindow((_x, y, _width, height) => callback(height > 0 ? { top: y, height } : windowBounds()));
      },
    }),
    [],
  );
  return { bus, notify, ref: container };
}

export function useInView({ share = motion.visibleShare, resetKey = 0, enabled = true }: InViewOptions = {}): InView {
  const ref = useRef<View>(null);
  const bus = useContext(ViewportContext);
  const reduce = useReduceMotion();
  const [seen, setSeen] = useState<{ key: unknown; visible: boolean } | null>(null);
  const keyRef = useRef(resetKey);
  keyRef.current = resetKey;
  const free = !bus.tracked || reduce;
  const inView = enabled && (free || (seen !== null && seen.visible && Object.is(seen.key, resetKey)));
  const check = useCallback(() => {
    const key = keyRef.current;
    bus.measure((bounds) => {
      ref.current?.measureInWindow((_x, y, _width, height) => {
        const top = y - bounds.top;
        const visible = isInViewport(top, height, bounds.height, share)
          ? true
          : isOutOfViewport(top, height, bounds.height)
            ? false
            : null;
        if (visible === null) return;
        setSeen((previous) =>
          previous !== null && previous.visible === visible && Object.is(previous.key, key)
            ? previous
            : { key, visible },
        );
      });
    });
  }, [share, bus]);
  const watching = enabled && !free;
  useEffect(() => {
    if (!watching) return;
    check();
    const timer = setTimeout(check, motion.inViewSettleMs);
    const unsubscribe = bus.subscribe(check);
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [watching, resetKey, bus, check]);
  return { ref, inView, onLayout: watching ? check : undefined };
}
