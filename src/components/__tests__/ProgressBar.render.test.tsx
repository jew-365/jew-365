import { Platform, StyleSheet } from 'react-native';
import { screen } from '@testing-library/react-native';
import { ProgressBar } from '../ProgressBar';
import { renderWithTheme } from '@/testing/render';
import { THEMES } from '@/theme/colors';
import { useUserStore } from '@/stores/useUserStore';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  __esModule: true,
  useReducedMotion: jest.fn(() => true),
}));

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
});
