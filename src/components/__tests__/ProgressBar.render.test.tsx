import { Platform, StyleSheet } from 'react-native';
import { screen } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { ProgressBar } from '../ProgressBar';
import { renderWithTheme } from '@/testing/render';
import { THEMES } from '@/theme/colors';
import { useUserStore } from '@/stores/useUserStore';
import { useEntrance } from '@/hooks/useMotion';
import { ViewportHarness, mockWindowRects, scrollViewport } from '@/testing/viewport';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  __esModule: true,
  useReducedMotion: jest.fn(() => true),
}));

jest.mock('@/hooks/useMotion', () => {
  const actual = jest.requireActual('@/hooks/useMotion');
  return { ...actual, useEntrance: jest.fn(actual.useEntrance), usePop: jest.fn(actual.usePop) };
});

const gates = () => (useEntrance as jest.Mock).mock.calls.slice(-2).map((call) => call[2]);

const fill = () => StyleSheet.flatten(screen.getByTestId('bar').props.style);

describe('ProgressBar', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ language: 'en' });
  });

  it('draws a gold fill as wide as the percent', () => {
    renderWithTheme(<ProgressBar percent={40} testID="bar" />);
    expect(fill().width).toBe('40%');
    expect(fill().backgroundColor).toBe(THEMES.gold.gold);
  });

  it('clamps the percent to 0-100', () => {
    renderWithTheme(<ProgressBar percent={140} testID="bar" />);
    expect(fill().width).toBe('100%');
  });

  it('draws a dashed outline without a fill', () => {
    renderWithTheme(<ProgressBar percent={50} dashed testID="bar" />);
    expect(fill().borderStyle).toBe('dashed');
    expect(fill().backgroundColor).toBeUndefined();
  });

  it('draws the tick layer only for a tick value', () => {
    const { unmount } = renderWithTheme(<ProgressBar percent={50} tick={30} testID="bar" />);
    expect(screen.getByTestId('progress-bar-tick')).toBeOnTheScreen();
    unmount();
    renderWithTheme(<ProgressBar percent={50} tick={null} testID="bar" />);
    expect(screen.queryByTestId('progress-bar-tick')).toBeNull();
  });

  describe('growth origin on web', () => {
    const original = Platform.OS;
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });
    });
    afterEach(() => {
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original });
    });

    it('grows from the right in Hebrew', () => {
      useUserStore.setState({ language: 'he' });
      renderWithTheme(<ProgressBar percent={50} testID="bar" />);
      expect(fill().transformOrigin).toBe('right');
    });

    it('grows from the left in English', () => {
      renderWithTheme(<ProgressBar percent={50} testID="bar" />);
      expect(fill().transformOrigin).toBe('left');
    });
  });

  describe('starts when seen', () => {
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
      (useReducedMotion as jest.Mock).mockReturnValue(true);
    });

    it('holds the fill and the tick until the bar is on screen', () => {
      rects.set({ y: 5000, height: 6 });
      renderWithTheme(
        <ViewportHarness>
          <ProgressBar percent={50} tick={30} testID="bar" />
        </ViewportHarness>,
      );
      expect(gates()).toEqual([false, false]);
      rects.set({ y: 100, height: 6 });
      scrollViewport();
      expect(gates()).toEqual([true, true]);
    });

    it('grows again each time it comes back on screen', () => {
      rects.set({ y: 100, height: 6 });
      renderWithTheme(
        <ViewportHarness>
          <ProgressBar percent={50} tick={30} testID="bar" />
        </ViewportHarness>,
      );
      expect(gates()).toEqual([true, true]);
      rects.set({ y: 5000, height: 6 });
      scrollViewport();
      expect(gates()).toEqual([false, false]);
      rects.set({ y: 100, height: 6 });
      scrollViewport();
      expect(gates()).toEqual([true, true]);
    });

    it('starts at once outside a viewport provider', () => {
      renderWithTheme(<ProgressBar percent={50} tick={30} testID="bar" />);
      expect(gates()).toEqual([true, true]);
      expect(rects.measure).toHaveBeenCalledTimes(0);
    });

    it('stays still while the caller holds active false', () => {
      rects.set({ y: 100, height: 6 });
      renderWithTheme(
        <ViewportHarness>
          <ProgressBar percent={50} tick={30} active={false} testID="bar" />
        </ViewportHarness>,
      );
      expect(gates()).toEqual([false, false]);
      expect(rects.measure).toHaveBeenCalledTimes(0);
    });
  });
});
