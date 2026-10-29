import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Reveal } from '../Reveal';
import { useEntrance } from '@/hooks/useMotion';
import { ViewportHarness, mockWindowRects, scrollViewport } from '@/testing/viewport';
import { motion } from '@/theme/tokens';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  __esModule: true,
  useReducedMotion: jest.fn(() => false),
}));
jest.mock('@/hooks/useMotion', () => {
  const actual = jest.requireActual('@/hooks/useMotion');
  return { ...actual, useEntrance: jest.fn(actual.useEntrance), usePop: jest.fn(actual.usePop) };
});

const calls = () => (useEntrance as jest.Mock).mock.calls;
const lastArgs = () => calls()[calls().length - 1];

describe('Reveal', () => {
  let rects: ReturnType<typeof mockWindowRects>;
  beforeEach(() => {
    jest.useFakeTimers();
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    (useEntrance as jest.Mock).mockClear();
    rects = mockWindowRects(800);
  });
  afterEach(() => {
    rects.restore();
    jest.useRealTimers();
  });

  const child = <Text>x</Text>;

  it('plays at once outside a provider', () => {
    render(<Reveal>{child}</Reveal>);
    expect(lastArgs()[2]).toBe(true);
  });

  it('holds until seen inside a provider', () => {
    rects.set({ y: 5000, height: 50 });
    render(
      <ViewportHarness>
        <Reveal>{child}</Reveal>
      </ViewportHarness>,
    );
    expect(lastArgs()[2]).toBe(false);
    rects.set({ y: 100, height: 50 });
    scrollViewport();
    expect(lastArgs()[2]).toBe(true);
  });

  it('passes delay, duration and playKey to useEntrance', () => {
    rects.set({ y: 100, height: 50 });
    render(
      <ViewportHarness>
        <Reveal delay={40} duration={280} shift={25} playKey={3}>
          {child}
        </Reveal>
      </ViewportHarness>,
    );
    expect(lastArgs()).toEqual([40, 280, true, 3]);
  });

  it('defaults to motion.lineMs', () => {
    rects.set({ y: 100, height: 50 });
    render(
      <ViewportHarness>
        <Reveal>{child}</Reveal>
      </ViewportHarness>,
    );
    expect(lastArgs()).toEqual([0, motion.lineMs, true, 0]);
  });

  it("keeps the caller's active", () => {
    rects.set({ y: 100, height: 50 });
    render(
      <ViewportHarness>
        <Reveal active={false}>{child}</Reveal>
      </ViewportHarness>,
    );
    expect(lastArgs()[2]).toBe(false);
  });

  it('restarts the gate when playKey changes', () => {
    rects.set({ y: 100, height: 50 });
    const view = render(
      <ViewportHarness>
        <Reveal playKey={0}>{child}</Reveal>
      </ViewportHarness>,
    );
    expect(lastArgs()[2]).toBe(true);
    rects.set({ y: 5000, height: 50 });
    view.rerender(
      <ViewportHarness>
        <Reveal playKey={1}>{child}</Reveal>
      </ViewportHarness>,
    );
    expect(lastArgs()[2]).toBe(false);
    rects.set({ y: 100, height: 50 });
    scrollViewport();
    expect(lastArgs()[2]).toBe(true);
  });
});
