import React from 'react';
import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { useNow } from '../useNow';

const mockListeners: { event: string; listener: () => void }[] = [];
let mockFocused = true;
const mockNavigation = {
  isFocused: () => mockFocused,
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

const MINUTE = 60_000;
let renders = 0;

function Clock() {
  const now = useNow();
  renders++;
  return <Text testID="clock">{now.toISOString()}</Text>;
}

function setFocus(next: boolean) {
  mockFocused = next;
  act(() => {
    for (const { event, listener } of [...mockListeners]) if (event === (next ? 'focus' : 'blur')) listener();
  });
}

const shown = () => screen.getByTestId('clock').props.children as string;

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-10-28T10:00:10Z'), doNotFake: ['queueMicrotask'] });
  mockFocused = true;
  mockListeners.length = 0;
  renders = 0;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useNow', () => {
  it('ticks at the next whole minute and then every 30 seconds while focused', () => {
    render(<Clock />);
    expect(shown()).toBe('2026-10-28T10:00:10.000Z');
    act(() => {
      jest.advanceTimersByTime(50_000);
    });
    expect(shown()).toBe('2026-10-28T10:01:00.000Z');
    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    expect(shown()).toBe('2026-10-28T10:01:30.000Z');
  });

  it('does not tick while its screen is not focused', () => {
    render(<Clock />);
    setFocus(false);
    const before = renders;
    act(() => {
      jest.advanceTimersByTime(5 * MINUTE);
    });
    expect(renders).toBe(before);
    expect(shown()).toBe('2026-10-28T10:00:10.000Z');
  });

  it('ticks once on focus, then resumes the cadence', () => {
    render(<Clock />);
    setFocus(false);
    act(() => {
      jest.advanceTimersByTime(5 * MINUTE);
    });
    setFocus(true);
    expect(shown()).toBe('2026-10-28T10:05:10.000Z');
    act(() => {
      jest.advanceTimersByTime(50_000);
    });
    expect(shown()).toBe('2026-10-28T10:06:00.000Z');
  });

  it('ticks once on the first focus of a screen that mounted in the background', () => {
    mockFocused = false;
    render(<Clock />);
    act(() => {
      jest.advanceTimersByTime(3 * MINUTE);
    });
    expect(shown()).toBe('2026-10-28T10:00:10.000Z');
    setFocus(true);
    expect(shown()).toBe('2026-10-28T10:03:10.000Z');
  });
});
