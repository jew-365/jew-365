const mockPush = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

import { fireEvent, screen, within } from '@testing-library/react-native';
import HistoryScreen from '../(tabs)/history';
import { Landscape } from '@/components/Landscape';
import { StreakRing } from '@/components/StreakRing';
import { CITIES } from '@/data/cities';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';
import { THEMES } from '@/theme/colors';

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

const keyOfOctober = (day: number) => `2026-10-${String(day).padStart(2, '0')}`;

const lastTwoDays = {
  '2026-10-26': { tefillin: 1, shacharit: 1 },
  '2026-10-27': { tefillin: 1 },
};

const NEW_CAPTION = 'חדש · עוד לא נספר יום';

function enableMinchaThisMorning() {
  useMitzvotStore.setState({
    activeMitzvot: {
      tefillin: { enabled: true },
      shacharit: { enabled: true },
      mincha: { enabled: true, enabledAt: at(JERUSALEM, '2026-10-28T09:00').getTime() },
    },
  });
}

function renderHistory(completions: Record<string, Record<string, number>>) {
  useCompletionsStore.setState({ completions });
  return renderWithTheme(<HistoryScreen />);
}

describe('history', () => {
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
    useMitzvotStore.setState({ activeMitzvot: { tefillin: { enabled: true }, shacharit: { enabled: true } } });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the streak in the ring and the way to the next goal', async () => {
    const fifteenDays = Object.fromEntries(
      Array.from({ length: 15 }, (_, index) => [keyOfOctober(14 + index), { tefillin: 1 }]),
    );
    renderHistory(fifteenDays);
    expect(await screen.findByText('עוד 15 ימים ליעד 30')).toBeOnTheScreen();
    expect(screen.getByLabelText('15 ימים ברצף')).toBeOnTheScreen();
    expect(screen.UNSAFE_getByType(Landscape).props.height).toBe(320);
    expect(screen.UNSAFE_getByType(StreakRing).props.size).toBe(220);
  });

  it('draws the 30 days as six rows of five, oldest first', async () => {
    renderHistory({});
    const cells = await screen.findAllByTestId(/^history-day-/);
    expect(cells).toHaveLength(30);
    expect(cells[0].props.testID).toBe('history-day-2026-09-29');
    expect(cells[29].props.testID).toBe('history-day-2026-10-28');
    expect(screen.getByTestId('history-grid').children).toHaveLength(6);
  });

  it('fills a day by how much of it was done and rings today', async () => {
    renderHistory(lastTwoDays);
    await screen.findAllByTestId(/^history-day-/);
    expect(screen.getByTestId('history-day-2026-10-26')).toHaveStyle({ backgroundColor: THEMES.gold.gold });
    expect(screen.getByTestId('history-day-2026-10-27')).toHaveStyle({ backgroundColor: THEMES.gold.goldLight });
    expect(screen.getByTestId('history-day-2026-10-25')).toHaveStyle({ backgroundColor: THEMES.gold.surface2 });
    expect(screen.getByTestId('history-day-2026-10-28')).toHaveStyle({
      borderColor: THEMES.gold.gold,
      borderWidth: 1.5,
    });
  });

  it('opens the day view from a cell', async () => {
    renderHistory(lastTwoDays);
    await screen.findAllByTestId(/^history-day-/);
    fireEvent.press(screen.getByTestId('history-day-2026-10-26'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/day/[date]', params: { date: '2026-10-26' } });
  });

  it('draws each tracked mitzvah with its percent and a bar of that width', async () => {
    renderHistory(lastTwoDays);
    await screen.findAllByTestId(/^history-day-/);
    const row = screen.getByRole('button', { name: /^הנחת תפילין, \d+%$/ });
    const percent = Number(
      within(row)
        .getByText(/^\d+%$/)
        .props.children.toString()
        .replace('%', ''),
    );
    expect(percent).toBeGreaterThan(0);
    expect(screen.getByTestId('history-bar-tefillin')).toHaveStyle({ width: `${percent}%` });
  });

  it('captions a mitzvah switched on today as new, with no percent or bar, after the rows with a percent', async () => {
    enableMinchaThisMorning();
    renderHistory(lastTwoDays);
    await screen.findAllByTestId(/^history-day-/);
    const row = screen.getByRole('button', { name: `תפילת מנחה, ${NEW_CAPTION}` });
    expect(within(row).getByText(NEW_CAPTION).props.testID).toBe('history-new-mincha');
    expect(within(row).queryByText(/%$/)).toBeNull();
    expect(screen.queryByTestId('history-bar-mincha')).toBeNull();
    expect(
      screen
        .getAllByRole('button', { name: /^(הנחת תפילין|תפילת שחרית|תפילת מנחה), / })
        .map((r) => r.props.accessibilityLabel),
    ).toEqual(['תפילת שחרית, 3%', 'הנחת תפילין, 10%', `תפילת מנחה, ${NEW_CAPTION}`]);
  });

  it('gives the new mitzvah its percent once a day of it is decided', async () => {
    enableMinchaThisMorning();
    jest.setSystemTime(at(JERUSALEM, '2026-10-29T10:00'));
    renderHistory({ '2026-10-29': { mincha: 1 } });
    await screen.findAllByTestId(/^history-day-/);
    const row = screen.getByRole('button', { name: 'תפילת מנחה, 50%' });
    expect(within(row).getByText('50%')).toBeOnTheScreen();
    expect(screen.getByTestId('history-bar-mincha')).toHaveStyle({ width: '50%' });
    expect(screen.queryByTestId('history-new-mincha')).toBeNull();
  });

  it('captions the new mitzvah in English too', async () => {
    enableMinchaThisMorning();
    useUserStore.setState({ language: 'en' });
    renderHistory({});
    await screen.findAllByTestId(/^history-day-/);
    expect(screen.getByRole('button', { name: 'Mincha, New · no day counted yet' })).toBeOnTheScreen();
  });

  it('keeps the Reports pill', async () => {
    renderHistory({});
    await screen.findAllByTestId(/^history-day-/);
    fireEvent.press(screen.getByRole('button', { name: 'דוחות' }));
    expect(mockPush).toHaveBeenCalledWith('/report');
  });
});
