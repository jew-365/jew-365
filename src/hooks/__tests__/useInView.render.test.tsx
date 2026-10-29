import React from 'react';
import { Text, View } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';
import {
  isInViewport,
  isOutOfViewport,
  useInView,
  useViewport,
  type InViewOptions,
  type ViewportBus,
} from '../useInView';
import { useReplayKey } from '../useIsFocused';
import { ViewportHarness, mockWindowRects, scrollViewport } from '@/testing/viewport';

const mockListeners: { event: string; listener: () => void }[] = [];
let mockFocused = true;
let mockRoutes = [{ key: 'home' }, { key: 'history' }];
let mockIndex = 0;
const mockNavigation = {
  isFocused: () => mockFocused,
  getState: () => ({ index: mockIndex, routes: mockRoutes }),
  addListener: (event: string, listener: () => void) => {
    const entry = { event, listener };
    mockListeners.push(entry);
    return () => {
      const index = mockListeners.indexOf(entry);
      if (index >= 0) mockListeners.splice(index, 1);
    };
  },
};

jest.mock('expo-router', () => ({ useNavigation: () => mockNavigation }));
jest.mock('@/utils/afterPaint', () => ({
  afterPaint: (task: () => void) => {
    queueMicrotask(task);
    return { cancel: () => undefined };
  },
}));
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  __esModule: true,
  useReducedMotion: jest.fn(() => false),
}));

function Probe(options: InViewOptions) {
  const view = useInView(options);
  return (
    <View ref={view.ref} onLayout={view.onLayout}>
      <Text>{view.inView ? 'in' : 'out'}</Text>
    </View>
  );
}

describe('isInViewport', () => {
  it.each([
    [100, 50, 800, 0.5, true],
    [760, 100, 800, 0.5, false],
    [750, 100, 800, 0.5, true],
    [-60, 100, 800, 0.5, false],
    [-50, 100, 800, 0.5, true],
    [0, 2000, 800, 0.5, true],
    [500, 2000, 800, 0.5, false],
    [790, 2000, 800, 0, true],
    [801, 10, 800, 0, false],
    [100, 0, 800, 0.5, false],
  ])('(%d, %d, %d, %d) is %s', (top, height, viewport, share, expected) => {
    expect(isInViewport(top, height, viewport, share)).toBe(expected);
  });
});

describe('isOutOfViewport', () => {
  it.each([
    [800, 50, 800, true],
    [799, 50, 800, false],
    [-50, 50, 800, true],
    [-49, 50, 800, false],
    [100, 0, 800, true],
  ])('(%d, %d, %d) is %s', (top, height, viewport, expected) => {
    expect(isOutOfViewport(top, height, viewport)).toBe(expected);
  });
});

describe('useInView', () => {
  let rects: ReturnType<typeof mockWindowRects>;
  beforeEach(() => {
    jest.useFakeTimers();
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    rects = mockWindowRects(800);
  });
  afterEach(() => {
    rects.restore();
    jest.useRealTimers();
  });

  it('is in view at once outside a provider and measures nothing', () => {
    render(<Probe />);
    expect(screen.getByText('in')).toBeOnTheScreen();
    expect(rects.measure).toHaveBeenCalledTimes(0);
  });

  it('is in view at once under reduced motion', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    rects.set({ y: 5000, height: 50 });
    render(
      <ViewportHarness>
        <Probe />
      </ViewportHarness>,
    );
    expect(screen.getByText('in')).toBeOnTheScreen();
    expect(rects.measure).toHaveBeenCalledTimes(0);
  });

  it('is in view when half of it is on screen at mount', () => {
    rects.set({ y: 100, height: 50 });
    render(
      <ViewportHarness>
        <Probe />
      </ViewportHarness>,
    );
    expect(screen.getByText('in')).toBeOnTheScreen();
  });

  it('waits off screen and turns in view on a scroll', () => {
    rects.set({ y: 5000, height: 50 });
    render(
      <ViewportHarness>
        <Probe />
      </ViewportHarness>,
    );
    expect(screen.getByText('out')).toBeOnTheScreen();
    rects.set({ y: 300, height: 50 });
    scrollViewport();
    expect(screen.getByText('in')).toBeOnTheScreen();
  });

  it('goes out once wholly off screen and comes back in on the next entry', () => {
    rects.set({ y: 300, height: 50 });
    render(
      <ViewportHarness>
        <Probe />
      </ViewportHarness>,
    );
    expect(screen.getByText('in')).toBeOnTheScreen();
    rects.set({ y: 5000, height: 50 });
    scrollViewport();
    expect(screen.getByText('out')).toBeOnTheScreen();
    rects.set({ y: 300, height: 50 });
    scrollViewport();
    expect(screen.getByText('in')).toBeOnTheScreen();
    rects.set({ y: -100, height: 50 });
    scrollViewport();
    expect(screen.getByText('out')).toBeOnTheScreen();
  });

  it('stays in view while a sliver of it is still on screen', () => {
    rects.set({ y: 300, height: 50 });
    render(
      <ViewportHarness>
        <Probe />
      </ViewportHarness>,
    );
    rects.set({ y: 790, height: 50 });
    scrollViewport();
    expect(screen.getByText('in')).toBeOnTheScreen();
  });

  it('stays out while only a sliver of it has come on screen', () => {
    rects.set({ y: 5000, height: 50 });
    render(
      <ViewportHarness>
        <Probe />
      </ViewportHarness>,
    );
    rects.set({ y: 790, height: 50 });
    scrollViewport();
    expect(screen.getByText('out')).toBeOnTheScreen();
  });

  it('measures nothing while disabled', () => {
    rects.set({ y: 100, height: 50 });
    render(
      <ViewportHarness>
        <Probe enabled={false} />
      </ViewportHarness>,
    );
    expect(screen.getByText('out')).toBeOnTheScreen();
    expect(rects.measure).toHaveBeenCalledTimes(0);
  });

  it('starts over when resetKey changes', () => {
    rects.set({ y: 100, height: 50 });
    const view = render(
      <ViewportHarness>
        <Probe resetKey={0} />
      </ViewportHarness>,
    );
    expect(screen.getByText('in')).toBeOnTheScreen();
    rects.set({ y: 5000, height: 50 });
    view.rerender(
      <ViewportHarness>
        <Probe resetKey={1} />
      </ViewportHarness>,
    );
    expect(screen.getByText('out')).toBeOnTheScreen();
    rects.set({ y: 100, height: 50 });
    scrollViewport();
    expect(screen.getByText('in')).toBeOnTheScreen();
  });

  it('never counts an element with no height', () => {
    rects.set({ y: 100, height: 0 });
    render(
      <ViewportHarness>
        <Probe />
      </ViewportHarness>,
    );
    expect(screen.getByText('out')).toBeOnTheScreen();
  });
});

describe('useViewport', () => {
  let api: { bus: ViewportBus; notify: () => void };
  function Exposer() {
    api = useViewport();
    return null;
  }
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('calls listeners at once, then at most once per throttle window', () => {
    render(<Exposer />);
    const listener = jest.fn();
    api.bus.subscribe(listener);
    act(() => {
      for (let i = 0; i < 5; i++) api.notify();
    });
    expect(listener).toHaveBeenCalledTimes(1);
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('drops the pending call on unmount', () => {
    const view = render(<Exposer />);
    const listener = jest.fn();
    api.bus.subscribe(listener);
    act(() => {
      api.notify();
      api.notify();
    });
    expect(listener).toHaveBeenCalledTimes(1);
    view.unmount();
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('useReplayKey', () => {
  const onReplay = jest.fn();
  function Replay() {
    const key = useReplayKey(onReplay);
    return <Text testID="key">{String(key)}</Text>;
  }
  const emit = (event: 'focus' | 'blur') => {
    mockFocused = event === 'focus';
    act(() => {
      mockListeners.filter((entry) => entry.event === event).forEach((entry) => entry.listener());
    });
  };
  beforeEach(() => {
    mockFocused = true;
    mockIndex = 0;
    onReplay.mockClear();
  });

  it('starts at 0 and does not change on blur', async () => {
    render(<Replay />);
    emit('blur');
    await act(async () => {});
    expect(screen.getByTestId('key').props.children).toBe('0');
    expect(onReplay).toHaveBeenCalledTimes(0);
  });

  it('bumps after paint on a return from another tab and runs onReplay once', async () => {
    render(<Replay />);
    mockIndex = 1;
    emit('blur');
    mockIndex = 0;
    emit('focus');
    await act(async () => {});
    expect(screen.getByTestId('key').props.children).toBe('1');
    expect(onReplay).toHaveBeenCalledTimes(1);
  });

  it('does not bump when a pushed stack screen is popped back', async () => {
    render(<Replay />);
    emit('blur');
    emit('focus');
    await act(async () => {});
    expect(screen.getByTestId('key').props.children).toBe('0');
    expect(onReplay).not.toHaveBeenCalled();
  });

  it('bumps on every tab switch but never on a stack round trip in between', async () => {
    render(<Replay />);
    mockIndex = 1;
    emit('blur');
    mockIndex = 0;
    emit('focus');
    await act(async () => {});
    emit('blur');
    emit('focus');
    await act(async () => {});
    expect(screen.getByTestId('key').props.children).toBe('1');
    mockIndex = 1;
    emit('blur');
    mockIndex = 0;
    emit('focus');
    await act(async () => {});
    expect(screen.getByTestId('key').props.children).toBe('2');
  });
});
