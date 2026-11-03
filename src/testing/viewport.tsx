import React from 'react';
import { act } from '@testing-library/react-native';
import { Dimensions, ScrollView, View } from 'react-native';
import { ViewportContext, useViewport } from '@/hooks/useInView';
import { motion } from '@/theme/tokens';

export type WindowRect = { y: number; height: number };

type Measurable = { measureInWindow: jest.Mock };

let notifyViewport: () => void = () => {};

export function mockWindowRects(viewportHeight = 800): {
  set(rect: WindowRect | null): void;
  setContainer(rect: WindowRect): void;
  measure: jest.Mock;
  restore(): void;
} {
  let current: WindowRect | null = { y: 0, height: 100 };
  let container: WindowRect = { y: 0, height: viewportHeight };
  const spy = jest
    .spyOn(Dimensions, 'get')
    .mockReturnValue({ width: 400, height: viewportHeight, scale: 2, fontScale: 1 });
  const measure = (View.prototype as unknown as Measurable).measureInWindow;
  const mocks = [...new Set([measure, (ScrollView.prototype as unknown as Measurable).measureInWindow])];
  for (const mock of mocks) {
    mock.mockReset();
    mock.mockImplementation(function (
      this: unknown,
      callback: (x: number, y: number, width: number, height: number) => void,
    ) {
      const rect = this instanceof ScrollView ? container : current;
      if (rect) callback(0, rect.y, 100, rect.height);
    });
  }
  return {
    set(rect) {
      current = rect;
    },
    setContainer(rect) {
      container = rect;
    },
    measure,
    restore() {
      for (const mock of mocks) mock.mockReset();
      spy.mockRestore();
    },
  };
}

export function ViewportHarness({ children, scroll = false }: { children: React.ReactNode; scroll?: boolean }) {
  const { bus, notify, ref } = useViewport();
  notifyViewport = notify;
  return (
    <ViewportContext.Provider value={bus}>
      {scroll ? <ScrollView ref={ref}>{children}</ScrollView> : children}
    </ViewportContext.Provider>
  );
}

export function scrollViewport(): void {
  act(() => {
    notifyViewport();
    jest.advanceTimersByTime(motion.inViewThrottleMs);
  });
}
