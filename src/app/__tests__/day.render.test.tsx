const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
const mockParams: { date?: string } = {};

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace, canGoBack: () => mockCanGoBack }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/services/NotificationScheduler', () => ({
  NotificationScheduler: {
    cancelForMitzvah: async () => {},
    settleCheckIn: async () => {},
    rebuild: async () => {},
  },
  syncNotificationPermissionStatus: async () => {},
  dismissCompletedPresentedNotifications: async () => {},
  refreshSchedulingOnForeground: async () => {},
}));

import { fireEvent, screen } from '@testing-library/react-native';
import { DateTime } from 'luxon';
import DayRoute from '../day/[date]';
import { MitzvahCard } from '@/components/MitzvahCard';
import { CITIES } from '@/data/cities';
import { formatDate } from '@/i18n';
import { RETENTION_DAYS, useCompletionsStore } from '@/stores/useCompletionsStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { useUserStore } from '@/stores/useUserStore';
import { HIDDEN_INTL_NAMES, hideIntlDateNames } from '@/testing/intl';
import { renderWithTheme } from '@/testing/render';
import { installSelichotFixture } from '@/testing/selichot';
import { at, zmanimFor } from '@/testing/zmanim';

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

const october = (day: number) => DateTime.fromObject({ year: 2026, month: 10, day });
const title = (day: number) => formatDate(october(day), 'cccc d LLLL yyyy', 'he');
const label = (day: number) => formatDate(october(day), 'cccc d LLLL', 'he');

describe('day view', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: at(JERUSALEM, '2026-10-28T10:00'), doNotFake: [...ONLY_DATE] });
    mockPush.mockClear();
    mockBack.mockClear();
    mockReplace.mockClear();
    mockCanGoBack = true;
    for (const key of Object.keys(mockParams)) delete mockParams[key as keyof typeof mockParams];
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
    useSelichotStore.getState().reset();
    useMitzvotStore.setState({ activeMitzvot: { tefillin: { enabled: true }, shacharit: { enabled: true } } });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('counts the done mitzvot of the day in its header', () => {
    useCompletionsStore.setState({ completions: { '2026-10-28': { tefillin: Date.now() } } });
    mockParams.date = '2026-10-28';
    renderWithTheme(<DayRoute />);
    expect(screen.getByText('1/2')).toBeOnTheScreen();
    expect(screen.getByLabelText('בוצעו 1 מתוך 2')).toBeOnTheScreen();
  });

  it('steps to the previous and the next day in place', () => {
    mockParams.date = '2026-10-28';
    renderWithTheme(<DayRoute />);

    fireEvent.press(screen.getByRole('button', { name: `היום הקודם, ${label(27)}` }));
    expect(screen.getByText(title(27))).toBeOnTheScreen();
    expect(screen.getByText('תצוגה היסטורית — לא ניתן לסמן')).toBeOnTheScreen();
    expect(screen.queryByText('המצוות של היום')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: `היום הבא, ${label(28)}` }));
    expect(screen.getByText(title(28))).toBeOnTheScreen();
    expect(screen.getByText('המצוות של היום')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: `היום הבא, ${label(29)}` }));
    expect(screen.getByText(title(29))).toBeOnTheScreen();
    expect(screen.getByText('תצוגה עתידית — אפשר לסמן רק ביום עצמו')).toBeOnTheScreen();

    expect(mockPush).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('stops the previous arrow at the retention limit', () => {
    const oldest = DateTime.fromISO('2026-10-28').minus({ days: RETENTION_DAYS });
    mockParams.date = oldest.toISODate() ?? '';
    const first = renderWithTheme(<DayRoute />);
    expect(screen.getByRole('button', { name: /^היום הקודם/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^היום הבא/ })).not.toBeDisabled();
    first.unmount();

    mockParams.date = oldest.plus({ days: 1 }).toISODate() ?? '';
    renderWithTheme(<DayRoute />);
    expect(screen.getByRole('button', { name: /^היום הקודם/ })).not.toBeDisabled();
  });

  it('shows no arrows and no counter for an invalid date', () => {
    mockParams.date = 'not-a-date';
    renderWithTheme(<DayRoute />);
    expect(screen.getByText('תאריך לא תקין.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^היום הקודם/ })).toBeNull();
    expect(screen.queryByLabelText(/^בוצעו/)).toBeNull();
  });

  it('leaves for home when there is nothing to go back to', () => {
    mockParams.date = '2026-10-28';
    mockCanGoBack = false;
    const first = renderWithTheme(<DayRoute />);
    fireEvent.press(screen.getByRole('button', { name: 'חזור' }));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/home');
    expect(mockBack).not.toHaveBeenCalled();
    first.unmount();

    mockReplace.mockClear();
    mockCanGoBack = true;
    renderWithTheme(<DayRoute />);
    fireEvent.press(screen.getByRole('button', { name: 'חזור' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('draws each card with its mitzvah icon', () => {
    mockParams.date = '2026-10-28';
    renderWithTheme(<DayRoute />);
    const icons = screen.UNSAFE_getAllByType(MitzvahCard).map((card) => card.props.icon);
    expect(icons.sort()).toEqual(['shacharit', 'tefillin']);
  });

  it("does not call a past day's item missed while its window is open", () => {
    useMitzvotStore.setState({ activeMitzvot: { kiddush_levana: { enabled: true } } });
    mockParams.date = '2026-10-14';
    jest.setSystemTime(at(JERUSALEM, '2026-10-18T20:00'));
    const open = renderWithTheme(<DayRoute />);
    expect(screen.getByText('קידוש לבנה')).toBeOnTheScreen();
    expect(screen.queryByText('לא בוצע')).toBeNull();
    open.unmount();
    jest.setSystemTime(at(JERUSALEM, '2026-10-27T12:00'));
    renderWithTheme(<DayRoute />);
    expect(screen.getByText('לא בוצע')).toBeOnTheScreen();
  });

  it('leaves out of a past day the mitzvot switched on after it ended, as history does', () => {
    const switchedOn = at(JERUSALEM, '2026-10-28T09:00').getTime();
    useMitzvotStore.setState({
      activeMitzvot: {
        tefillin: { enabled: true, enabledAt: switchedOn },
        shacharit: { enabled: true, enabledAt: switchedOn },
      },
    });
    mockParams.date = '2026-10-27';
    const past = renderWithTheme(<DayRoute />);
    expect(screen.UNSAFE_queryAllByType(MitzvahCard)).toHaveLength(0);
    expect(screen.queryByText('לא בוצע')).toBeNull();
    expect(screen.getByText('אין מצוות ליום זה.')).toBeOnTheScreen();
    past.unmount();

    mockParams.date = '2026-10-28';
    renderWithTheme(<DayRoute />);
    expect(screen.UNSAFE_getAllByType(MitzvahCard)).toHaveLength(2);
  });

  it('shows a done mark made before the mitzvah was switched on again, and no miss beside it', () => {
    const switchedOnAgain = at(JERUSALEM, '2026-10-28T09:00').getTime();
    useMitzvotStore.setState({
      activeMitzvot: {
        tefillin: { enabled: true, enabledAt: switchedOnAgain },
        shacharit: { enabled: true, enabledAt: switchedOnAgain },
      },
    });
    useCompletionsStore.setState({
      completions: { '2026-10-27': { tefillin: at(JERUSALEM, '2026-10-27T07:30').getTime() } },
    });
    mockParams.date = '2026-10-27';
    renderWithTheme(<DayRoute />);
    const cards = screen.UNSAFE_getAllByType(MitzvahCard);
    expect(cards.map((card) => [card.props.icon, card.props.done])).toEqual([['tefillin', true]]);
    expect(screen.getByText('1/1')).toBeOnTheScreen();
    expect(screen.queryByText('לא בוצע')).toBeNull();
  });

  it("prints a future day's Selichot window on the location's clock, both ends the next day", () => {
    installSelichotFixture();
    jest.setSystemTime(at(JERUSALEM, '2025-09-14T10:00'));
    useMitzvotStore.setState({ activeMitzvot: { selichot: { enabled: true } } });
    const clock = (instant: Date) => DateTime.fromJSDate(instant, { zone: JERUSALEM.tz }).toFormat('HH:mm');
    const start = clock(zmanimFor(at(JERUSALEM, '2025-09-15T12:00'), JERUSALEM).chatzotLayla);
    const end = clock(zmanimFor(at(JERUSALEM, '2025-09-16T12:00'), JERUSALEM).sofZmanTfilaGra);
    mockParams.date = '2025-09-15';
    renderWithTheme(<DayRoute />);
    expect(screen.getByText(`${start} עד ${end} למחרת`)).toBeOnTheScreen();
  });

  describe.each(HIDDEN_INTL_NAMES)('without Intl weekday and month names (%s, Hermes on iOS)', (mode) => {
    let restore: () => void;
    beforeAll(() => {
      restore = hideIntlDateNames(mode);
    });
    afterAll(() => restore());

    it('titles the day and names both arrows in Hebrew and English, never "null"', () => {
      mockParams.date = '2026-10-28';
      const hebrew = renderWithTheme(<DayRoute />);
      expect(screen.getByText('יום רביעי 28 אוקטובר 2026')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'היום הקודם, יום שלישי 27 אוקטובר' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'היום הבא, יום חמישי 29 אוקטובר' })).toBeOnTheScreen();
      expect(screen.queryByText(/null/)).toBeNull();
      hebrew.unmount();

      useUserStore.setState({ language: 'en' });
      renderWithTheme(<DayRoute />);
      expect(screen.getByText('Wednesday, Oct 28 2026')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Previous day, Tuesday, Oct 27' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Next day, Thursday, Oct 29' })).toBeOnTheScreen();
      expect(screen.queryByText(/null/)).toBeNull();
    });
  });
});
