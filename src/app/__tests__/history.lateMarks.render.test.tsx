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

  it('counts a late mark as done and opens the late marks report from the To improve card', async () => {
    useCompletionsStore.setState({ completions: marks, late: { '2026-10-27': { shacharit: 1 } } });
    renderWithTheme(<HistoryScreen />);
    const card = await screen.findByTestId('history-improve-card');
    expect(screen.queryByTestId('history-late-link')).toBeNull();
    expect(within(card).getByText('תפילת שחרית: איחור אחד ב-30 הימים האחרונים')).toBeOnTheScreen();
    expect(within(card).getByText('סך הכל סימון אחד באיחור')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^תפילת שחרית, 100% · איחור אחד$/ })).toBeOnTheScreen();
    expect(screen.getByTestId('history-late-shacharit')).toHaveTextContent('איחור אחד');
    expect(screen.getByTestId('history-period-ontime-week')).toHaveTextContent('בזמן 75% · איחור אחד');
    expect(screen.queryByTestId('history-period-ontime-day')).toBeNull();
    fireEvent.press(within(card).getByRole('button'));
    expect(mockPush).toHaveBeenCalledWith('/late-marks');
  });

  it('places the To improve card after the consistency per mitzvah, not above the calendar', async () => {
    useCompletionsStore.setState({ completions: marks, late: { '2026-10-27': { shacharit: 1 } } });
    renderWithTheme(<HistoryScreen />);
    await screen.findByTestId('history-improve-card');
    const order = screen.UNSAFE_root.findAll(
      (node: { type: unknown; props: { testID?: string } }) =>
        typeof node.type === 'string' && /^history-(calendar|bar-|improve-card)/.test(String(node.props.testID ?? '')),
    ).map((node: { props: { testID?: string } }) => String(node.props.testID).replace(/^history-bar-.*/, 'bar'));
    expect(order.indexOf('history-calendar')).toBeLessThan(order.indexOf('bar'));
    expect(order.lastIndexOf('bar')).toBeLessThan(order.indexOf('history-improve-card'));
  });

  it('shows no To improve card while nothing was marked late', async () => {
    useCompletionsStore.setState({ completions: marks });
    renderWithTheme(<HistoryScreen />);
    await screen.findByTestId('history-achievements-link');
    expect(screen.queryByTestId('history-improve-card')).toBeNull();
    expect(screen.getByRole('button', { name: /^תפילת שחרית, 100%$/ })).toBeOnTheScreen();
    expect(screen.getByTestId('history-period-ontime-week')).toHaveTextContent('בזמן 100%');
  });

  it('names a late mark in the day sheet', async () => {
    useCompletionsStore.setState({ completions: marks, late: { '2026-10-27': { shacharit: 1 } } });
    renderWithTheme(<HistoryScreen />);
    fireEvent.press(await screen.findByTestId('history-day-2026-10-27'));
    expect(within(screen.getByTestId('history-day-item-shacharit')).getByText(/^באיחור · /)).toBeOnTheScreen();
    expect(within(screen.getByTestId('history-day-item-tefillin')).getByText(/^בוצע · /)).toBeOnTheScreen();
  });

  it('charts the late marks of the last 12 weeks in Trends', async () => {
    useCompletionsStore.setState({ completions: marks, late: { '2026-10-27': { shacharit: 1 } } });
    renderWithTheme(<HistoryScreen />);
    await screen.findByTestId('history-improve-card');
    fireEvent.press(screen.getAllByRole('radio', { name: 'מגמות' })[0]);
    expect(await screen.findByTestId('history-late-chart')).toBeOnTheScreen();
    expect(screen.getByTestId('history-late-week-label-2026-10-31')).toHaveTextContent('1');
    expect(screen.getByText('סימון אחד באיחור ב-12 השבועות האחרונים')).toBeOnTheScreen();
  });
});
