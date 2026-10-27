const mockPush = jest.fn();
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

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }), useNavigation: () => mockNavigation }));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => true),
}));

import { act, screen, waitFor } from '@testing-library/react-native';
import HistoryScreen from '../(tabs)/history';
import { CITIES } from '@/data/cities';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';
import * as stats from '@/utils/historyStats';

const JERUSALEM = CITIES[0];
const ONLY_DATE = [
  'nextTick',
  'queueMicrotask',
  'setImmediate',
  'clearImmediate',
  'setInterval',
  'clearInterval',
  'setTimeout',
  'clearTimeout',
] as const;

function emit(event: 'focus' | 'blur') {
  mockFocused = event === 'focus';
  act(() => {
    mockListeners.filter((entry) => entry.event === event).forEach((entry) => entry.listener());
  });
}

describe('history stats and focus', () => {
  beforeEach(() => {
    mockFocused = true;
    mockListeners.length = 0;
    jest.useFakeTimers({ now: at(JERUSALEM, '2026-10-28T10:00'), doNotFake: [...ONLY_DATE] });
    useUserStore.getState().reset();
    useUserStore.setState({
      language: 'he',
      location: JERUSALEM,
      inIsrael: true,
      nusach: 'ashkenaz',
      isOnboarded: true,
      locationStatus: 'ready',
    });
    useCompletionsStore.getState().reset();
    useMitzvotStore.setState({ activeMitzvot: { tefillin: { enabled: true } } });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('computes once on open, skips changes while unfocused and recomputes once on focus', async () => {
    const compute = jest.spyOn(stats, 'computeStats');
    renderWithTheme(<HistoryScreen />);
    await waitFor(() => expect(compute).toHaveBeenCalledTimes(1));

    emit('blur');
    act(() => {
      useCompletionsStore.setState({ completions: { '2026-10-27': { tefillin: 1 } } });
    });
    await act(async () => {});
    expect(compute).toHaveBeenCalledTimes(1);

    emit('focus');
    await waitFor(() => expect(compute).toHaveBeenCalledTimes(2));
  });

  it('does not recompute on a focus that follows no change', async () => {
    const compute = jest.spyOn(stats, 'computeStats');
    renderWithTheme(<HistoryScreen />);
    await waitFor(() => expect(compute).toHaveBeenCalledTimes(1));

    emit('blur');
    emit('focus');
    await act(async () => {});
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('saves the achievements once per compute and not on a focus with no change', async () => {
    const save = jest.fn();
    useCompletionsStore.setState({ saveAchievements: save });
    const compute = jest.spyOn(stats, 'computeStats');
    renderWithTheme(<HistoryScreen />);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));

    emit('blur');
    emit('focus');
    await act(async () => {});
    expect(compute).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('does not remount the body in the frame that focus returns, only after the paint', async () => {
    renderWithTheme(<HistoryScreen />);
    const before = await screen.findByTestId('history-calendar');

    emit('blur');
    emit('focus');
    expect(screen.getByTestId('history-calendar')).toBe(before);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });
    expect(screen.getByTestId('history-calendar')).not.toBe(before);
  });
});
