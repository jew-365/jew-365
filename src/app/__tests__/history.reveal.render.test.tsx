jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({}), useRouter: () => ({ push: jest.fn() }) }));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => false),
}));
jest.mock('@/hooks/useMotion', () => {
  const actual = jest.requireActual('@/hooks/useMotion');
  return { ...actual, useEntrance: jest.fn(actual.useEntrance), usePop: jest.fn(actual.usePop) };
});

import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import HistoryScreen from '../(tabs)/history';
import { CITIES } from '@/data/cities';
import { useEntrance, usePop } from '@/hooks/useMotion';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { mockWindowRects } from '@/testing/viewport';
import { at } from '@/testing/zmanim';
import { motion } from '@/theme/tokens';

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

const FIXTURE_DAYS = [11, 12, 13, 14, 15, 16, 18, 19, 21, 22, 23, 25, 26, 27];
const fixtureCompletions = Object.fromEntries(FIXTURE_DAYS.map((day) => [`2026-10-${day}`, { tefillin: 1 }]));

const entranceCalls = () => (useEntrance as jest.Mock).mock.calls;
const popCalls = () => (usePop as jest.Mock).mock.calls;

describe('history reveals', () => {
  let rects: ReturnType<typeof mockWindowRects>;

  beforeEach(async () => {
    jest.useFakeTimers({ now: at(JERUSALEM, '2026-10-28T10:00'), doNotFake: [...ONLY_DATE] });
    useUserStore.getState().reset();
    useUserStore.setState({
      language: 'he',
      location: JERUSALEM,
      inIsrael: true,
      nusach: 'ashkenaz',
      isOnboarded: true,
      locationStatus: 'ready',
      profileName: 'אברהם כהן',
    });
    useCompletionsStore.getState().reset();
    useMitzvotStore.setState({
      activeMitzvot: { tefillin: { enabled: true, enabledAt: at(JERUSALEM, '2026-10-11T00:00').getTime() } },
    });
    rects = mockWindowRects(800);
    rects.set({ y: 5000, height: 80 });
    useCompletionsStore.setState({ completions: fixtureCompletions });
    renderWithTheme(<HistoryScreen />);
    await screen.findByTestId('history-calendar');
  });

  afterEach(() => {
    rects.restore();
    jest.useRealTimers();
  });

  const scrollIntoView = async () => {
    rects.set({ y: 100, height: 80 });
    fireEvent.scroll(screen.getByTestId('history-scroll'), { nativeEvent: { contentOffset: { y: 0 } } });
  };

  it('pops the earned badges only once they are on screen', async () => {
    const start = popCalls().length;
    fireEvent.press(screen.getByRole('radio', { name: 'הישגים' }));
    await screen.findByTestId('history-badge-streak7');
    const seen = popCalls().slice(start);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((args) => args[2] === false)).toBe(true);
    await scrollIntoView();
    await waitFor(() => {
      const calls = popCalls();
      expect(calls[calls.length - 1][2]).toBe(true);
    });
  });

  it('grows the week bars only once they are on screen', async () => {
    const start = entranceCalls().length;
    fireEvent.press(screen.getByRole('radio', { name: 'מגמות' }));
    await screen.findByText('12 השבועות האחרונים');
    const bars = () =>
      entranceCalls()
        .slice(start)
        .filter((args) => args[1] === motion.barMs);
    expect(bars().length).toBeGreaterThan(0);
    expect(bars().every((args) => args[2] === false)).toBe(true);
    await scrollIntoView();
    await waitFor(() => expect(bars().some((args) => args[2] === true)).toBe(true));
  });
});
