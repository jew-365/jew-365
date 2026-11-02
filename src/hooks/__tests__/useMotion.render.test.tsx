import React from 'react';
import Animated, { getAnimatedStyle, useAnimatedStyle, useReducedMotion } from 'react-native-reanimated';
import { act, render, screen } from '@testing-library/react-native';
import { useEntrance, usePop } from '../useMotion';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  __esModule: true,
  useReducedMotion: jest.fn(() => false),
}));

type Props = { delay: number; duration: number; active?: boolean; playKey?: number };

function Entrance({ delay, duration, active = true, playKey = 0 }: Props) {
  const progress = useEntrance(delay, duration, active, playKey);
  const style = useAnimatedStyle(() => ({ opacity: progress.value }));
  return <Animated.View testID="motion" style={style} />;
}

function Pop({ delay, duration, active = true, playKey = 0 }: Props) {
  return <Animated.View testID="motion" style={usePop(delay, duration / 1000, active, playKey)} />;
}

const opacity = () => Number(getAnimatedStyle(screen.getByTestId('motion')).opacity);
const advance = (ms: number) => act(() => jest.advanceTimersByTime(ms));

describe.each([
  ['useEntrance', Entrance],
  ['usePop', Pop],
] as const)('%s', (_name, Subject) => {
  beforeEach(() => {
    jest.useFakeTimers();
    (useReducedMotion as jest.Mock).mockReturnValue(false);
  });
  afterEach(() => jest.useRealTimers());

  // A stagger follows a list index: an item that moves up the list must not play its entrance again.
  it('keeps a played entrance when only its delay or timing changes', () => {
    const view = render(<Subject delay={40} duration={500} />);
    advance(2000);
    expect(opacity()).toBe(1);
    view.rerender(<Subject delay={0} duration={300} />);
    advance(16);
    expect(opacity()).toBe(1);
  });

  it('plays again on a new playKey, with the delay it has then', () => {
    const view = render(<Subject delay={40} duration={500} />);
    advance(2000);
    view.rerender(<Subject delay={400} duration={500} playKey={1} />);
    advance(200);
    expect(opacity()).toBe(0);
    advance(2000);
    expect(opacity()).toBe(1);
  });

  it('waits for active and starts then with the delay it has then', () => {
    const view = render(<Subject delay={0} duration={500} active={false} />);
    advance(2000);
    expect(opacity()).toBe(0);
    view.rerender(<Subject delay={400} duration={500} active />);
    advance(200);
    expect(opacity()).toBe(0);
    advance(2000);
    expect(opacity()).toBe(1);
  });

  it('is final at once under reduced motion', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    render(<Subject delay={400} duration={500} active={false} />);
    expect(opacity()).toBe(1);
  });
});
