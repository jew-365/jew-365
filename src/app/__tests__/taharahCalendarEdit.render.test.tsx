const mockPush = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
}));

import { HDate } from '@hebcal/core';
import { act, fireEvent, screen } from '@testing-library/react-native';
import TaharahCalendar from '../taharah/calendar';
import TaharahLog from '../taharah/log';
import { formatDayLine } from '@/components/DayStepper';
import { CITIES } from '@/data/cities';
import { translate } from '@/i18n';
import { chooseGender, chooseMaritalStatus, setTaharahTracking } from '@/stores/taharahOptIn';
import { useTaharahStore } from '@/stores/useTaharahStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';

const ONLY_DATE = [
  'nextTick',
  'queueMicrotask',
  'setImmediate',
  'clearImmediate',
  'setInterval',
  'clearInterval',
  'setTimeout',
  'clearTimeout',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'requestIdleCallback',
  'cancelIdleCallback',
] as const;

const JERUSALEM = CITIES[0];
const he = (key: string, options?: Record<string, unknown>) => translate(key, options, 'he', 'female');
const absOf = (y: number, m: number, d: number) => new HDate(new Date(y, m - 1, d)).abs();
// Tuesday 20 October 2026, eight days before the pinned Wednesday.
const PAST = new Date(2026, 9, 20);
// 10:30 in Jerusalem is the 28th on the device clock of every zone `pnpm test:tz` runs (Los Angeles 01:30, Kiritimati 22:30).

describe('taharah: recording on any past day', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: [...ONLY_DATE] });
    jest.setSystemTime(at(JERUSALEM, '2026-10-28T10:30'));
    mockPush.mockClear();
    mockParams = {};
    useUserStore.getState().reset();
    useTaharahStore.getState().reset();
    useUserStore.getState().setLocation(JERUSALEM);
    useUserStore.getState().setLanguage('he');
    chooseGender('female');
    chooseMaritalStatus('married');
    setTaharahTracking(true);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('opens the log on the day the calendar sent, and saves it there', () => {
    mockParams = { type: 'onset', date: '2026-10-20' };
    renderWithTheme(<TaharahLog />);
    expect(screen.getByText(formatDayLine(PAST, 'he'))).toBeTruthy();
    fireEvent(screen.getByRole('switch'), 'valueChange', true);
    fireEvent.press(screen.getByText(he('common.save')));
    const [event] = useTaharahStore.getState().events;
    expect(event).toMatchObject({ type: 'onset', onah: { abs: absOf(2026, 10, 20), kind: 'day' } });
  });

  it('ignores a date param in the future', () => {
    mockParams = { type: 'onset', date: '2026-11-03' };
    renderWithTheme(<TaharahLog />);
    expect(screen.getByText(formatDayLine(new Date(2026, 9, 28), 'he'))).toBeTruthy();
  });

  it('picks a day from the calendar sheet in one tap', () => {
    renderWithTheme(<TaharahLog />);
    fireEvent.press(screen.getByText(he('taharah.log.pickDate')));
    fireEvent.press(screen.getByTestId('calendar-day-2026-10-20'));
    expect(screen.getByText(formatDayLine(PAST, 'he'))).toBeTruthy();
    expect(screen.queryByTestId('calendar-day-2026-10-20')).toBeNull();
  });

  it('pages back to an earlier month and never past today', () => {
    renderWithTheme(<TaharahLog />);
    fireEvent.press(screen.getByText(he('taharah.log.pickDate')));
    expect(screen.getByTestId('calendar-day-2026-10-29')).toBeDisabled();
    fireEvent.press(screen.getByLabelText('ספטמבר 2026'));
    fireEvent.press(screen.getByTestId('calendar-day-2026-09-02'));
    expect(screen.getByText(formatDayLine(new Date(2026, 8, 2), 'he'))).toBeTruthy();
  });

  it('offers to record on an empty past day of the calendar, opening the log on it', async () => {
    renderWithTheme(<TaharahCalendar />);
    fireEvent.press(await screen.findByLabelText(formatDayLine(PAST, 'he')));
    expect(screen.getByText(he('taharah.calendar.addOnDay'))).toBeTruthy();
    fireEvent.press(screen.getByText(he('taharah.log.onset')));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/taharah/log', params: { type: 'onset', date: '2026-10-20' } });
  });

  it('offers nothing to record on a future day', async () => {
    renderWithTheme(<TaharahCalendar />);
    fireEvent.press(await screen.findByLabelText(formatDayLine(new Date(2026, 9, 30), 'he')));
    expect(screen.queryByText(he('taharah.calendar.addOnDay'))).toBeNull();
    expect(screen.getByText(he('taharah.calendar.futureDay'))).toBeTruthy();
  });

  it("lists a day's entries and deletes one after the confirmation", async () => {
    useTaharahStore.getState().addEvent({ type: 'onset', onah: { abs: absOf(2026, 10, 20), kind: 'day' } });
    renderWithTheme(<TaharahCalendar />);
    fireEvent.press(await screen.findByLabelText(formatDayLine(PAST, 'he')));
    expect(screen.getByText(he('taharah.calendar.recorded'))).toBeTruthy();
    fireEvent.press(screen.getByLabelText(he('taharah.calendar.deleteEntry', { entry: he('taharah.event.onset') })));
    expect(screen.getByText(he('taharah.calendar.deleteTitle'))).toBeTruthy();
    expect(useTaharahStore.getState().events).toHaveLength(1);
    const confirms = screen.getAllByText(he('common.delete'));
    await act(async () => fireEvent.press(confirms[confirms.length - 1]));
    expect(useTaharahStore.getState().events).toHaveLength(0);
  });
});
