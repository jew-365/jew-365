const mockPush = jest.fn();

jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({}), useRouter: () => ({ push: mockPush }) }));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => true),
}));

import { fireEvent, screen, within } from '@testing-library/react-native';
import HistoryScreen from '../(tabs)/history';
import { CITIES } from '@/data/cities';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';

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

const marks = {
  '2026-10-26': { tefillin: 1, shacharit: 1 },
  '2026-10-27': { tefillin: 1, shacharit: 1 },
};

describe('history with late marks', () => {
  beforeEach(() => {
    mockPush.mockClear();
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
    // Switched on the morning of the first marked day, so only the two marked days are judged.
    const enabledAt = at(JERUSALEM, '2026-10-26T00:30').getTime();
    useMitzvotStore.setState({
      activeMitzvot: { tefillin: { enabled: true, enabledAt }, shacharit: { enabled: true, enabledAt } },
    });
  });

  afterEach(() => jest.useRealTimers());

  it('scores a late mark as a miss and opens the late marks report from Summary', async () => {
    useCompletionsStore.setState({ completions: marks, late: { '2026-10-27': { shacharit: 1 } } });
    renderWithTheme(<HistoryScreen />);
    const link = await screen.findByTestId('history-late-link');
    expect(within(link).getByText('מצווה אחת סומנה אחרי שעבר הזמן')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^תפילת שחרית, 50%$/ })).toBeOnTheScreen();
    fireEvent.press(within(link).getByRole('button'));
    expect(mockPush).toHaveBeenCalledWith('/late-marks');
  });

  it('shows no link while nothing was marked late', async () => {
    useCompletionsStore.setState({ completions: marks });
    renderWithTheme(<HistoryScreen />);
    await screen.findByTestId('history-achievements-link');
    expect(screen.queryByTestId('history-late-link')).toBeNull();
    expect(screen.getByRole('button', { name: /^תפילת שחרית, 100%$/ })).toBeOnTheScreen();
  });

  it('names a late mark in the day sheet', async () => {
    useCompletionsStore.setState({ completions: marks, late: { '2026-10-27': { shacharit: 1 } } });
    renderWithTheme(<HistoryScreen />);
    fireEvent.press(await screen.findByTestId('history-day-2026-10-27'));
    expect(within(screen.getByTestId('history-day-item-shacharit')).getByText(/^באיחור · /)).toBeOnTheScreen();
    expect(within(screen.getByTestId('history-day-item-tefillin')).getByText(/^בוצע · /)).toBeOnTheScreen();
  });
});
