import React from 'react';
import { act } from '@testing-library/react-native';
import { Dimensions, View } from 'react-native';
import { ViewportContext, useViewport } from '@/hooks/useInView';
import { motion } from '@/theme/tokens';

export type WindowRect = { y: number; height: number };

type Measurable = { measureInWindow: jest.Mock };

let notifyViewport: () => void = () => {};

export function mockWindowRects(viewportHeight = 800): {
  set(rect: WindowRect | null): void;
  measure: jest.Mock;
  restore(): void;
} {
  let current: WindowRect | null = { y: 0, height: 100 };
  const spy = jest
    .spyOn(Dimensions, 'get')
    .mockReturnValue({ width: 400, height: viewportHeight, scale: 2, fontScale: 1 });
  const measure = (View.prototype as unknown as Measurable).measureInWindow;
  measure.mockReset();
  measure.mockImplementation((callback: (x: number, y: number, width: number, height: number) => void) => {
    if (current) callback(0, current.y, 100, current.height);
  });
  return {
    set(rect) {
      current = rect;
    },
    measure,
    restore() {
      measure.mockReset();
      spy.mockRestore();
    },
  };
}

export function ViewportHarness({ children }: { children: React.ReactNode }) {
  const { bus, notify } = useViewport();
  notifyViewport = notify;
  return <ViewportContext.Provider value={bus}>{children}</ViewportContext.Provider>;
}

export function scrollViewport(): void {
  act(() => {
    notifyViewport();
    jest.advanceTimersByTime(motion.inViewThrottleMs);
  });
}
