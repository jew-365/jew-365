const mockPush = jest.fn();
const mockCancel = jest.fn(async (..._args: unknown[]) => {});
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

jest.mock('@/utils/afterPaint', () => ({
  afterPaint: (task: () => void) => {
    queueMicrotask(task);
    return { cancel: () => undefined };
  },
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }), useNavigation: () => mockNavigation }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));
jest.mock('@/services/NotificationScheduler', () => ({
  NotificationScheduler: {
    cancelForMitzvah: (...args: unknown[]) => mockCancel(...args),
    settleCheckIn: async () => {},
    rebuild: async () => {},
  },
  syncNotificationPermissionStatus: async () => {},
  dismissCompletedPresentedNotifications: async () => {},
  refreshSchedulingOnForeground: async () => {},
}));

import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { DateTime } from 'luxon';
import Animated, { FadeInDown } from 'react-native-reanimated';
import HomeScreen from '../(tabs)/home';
import { AppLogo } from '@/components/AppLogo';
import { MitzvahCard } from '@/components/MitzvahCard';
import { CITIES } from '@/data/cities';
import { formatDate } from '@/i18n';
import { useChokStore } from '@/stores/useChokStore';
import { useCompletionsStore, dateKey } from '@/stores/useCompletionsStore';
import { useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { installChokFixture } from '@/testing/chok';
import { HIDDEN_INTL_NAMES, hideIntlDateNames } from '@/testing/intl';
import { renderWithTheme } from '@/testing/render';
import { at, zmanimFor } from '@/testing/zmanim';
import { THEMES } from '@/theme/colors';
import type { CustomMitzvah } from '@/types/mitzvah';
import { chokReaderPortion } from '@/utils/chok';
import { clockOf } from '@/utils/clock';

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

const NIGHT_OF_THE_14TH = '2027-06-15T00:20';
const AFTER_CHATZOT = '2027-06-15T01:30';
const AFTER_ALOT = '2027-06-15T04:30';

const MIDNIGHT_ID = 'custom_1800000000000_tikkun';
const MIDNIGHT_NAME = 'תיקון חצות';
const LATE_ID = 'custom_1800000000001_late';
const LATE_NAME = 'לימוד לילה';
const NIGHT_ID = 'custom_1800000000002_night';
const NIGHT_NAME = 'לימוד לפני עלות השחר';

const customWindow = (id: string, name: string, startHHMM: string, endHHMM: string): CustomMitzvah => ({
  id,
  name,
  startHHMM,
  endHHMM,
  reminders: [],
  skipOn: [],
  createdAt: 1800000000000,
});

function enableOnly(...ids: string[]) {
  useMitzvotStore.setState({ activeMitzvot: Object.fromEntries(ids.map((id) => [id, { enabled: true }])) });
}

function renderAt(wallClock: string) {
  jest.useFakeTimers({ now: at(JERUSALEM, wallClock), doNotFake: [...ONLY_DATE] });
  return renderWithTheme(<HomeScreen />);
}

const completeButton = (name: string) => screen.getByRole('button', { name: `סמן ${name} כהושלם` });
const completions = () => useCompletionsStore.getState().completions;
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const dayLabel = (day: number) => formatDate(DateTime.fromObject({ year: 2027, month: 6, day }), 'cccc · d LLLL', 'he');

const cardWrappers = () =>
  screen
    .UNSAFE_getAllByType(Animated.View)
    .filter((view) => within(view).UNSAFE_queryAllByType(MitzvahCard).length > 0);

function emitNavigation(event: 'focus' | 'blur') {
  mockFocused = event === 'focus';
  act(() => {
    mockListeners.filter((entry) => entry.event === event).forEach((entry) => entry.listener());
  });
}

describe('home between midnight and alot', () => {
  beforeEach(() => {
    mockFocused = true;
    mockPush.mockClear();
    mockCancel.mockClear();
    useUserStore.getState().reset();
    useUserStore.setState({
      language: 'he',
      location: JERUSALEM,
      inIsrael: true,
      nusach: 'ashkenaz',
      isOnboarded: true,
      locationStatus: 'ready',
      locationSource: 'manual',
      notificationsEnabled: true,
      notificationPermission: 'granted',
      gender: 'male',
      maritalStatus: 'single',
    });
    useCompletionsStore.getState().reset();
    useCustomMitzvotStore.getState().reset();
    enableOnly('maariv');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("keeps last night's maariv current and files its done under the evening's day", async () => {
    renderAt(NIGHT_OF_THE_14TH);
    expect(screen.getByText('עכשיו — לפי דחיפות')).toBeOnTheScreen();
    fireEvent.press(completeButton('תפילת ערבית'));
    expect(Object.keys(completions())).toEqual(['2027-06-14']);
    expect(completions()['2027-06-14'].maariv).toBeGreaterThan(0);
    await waitFor(() => expect(mockCancel).toHaveBeenCalledTimes(1));
    const [id, date] = mockCancel.mock.calls[0] as [string, Date];
    expect(id).toBe('maariv');
    expect(dateKey(date)).toBe('2027-06-14');
  });

  it('does not call missed a window that closed before the install, and keeps the evening one', () => {
    const installedAt = at(JERUSALEM, '2027-06-14T21:30').getTime();
    useMitzvotStore.setState({
      activeMitzvot: {
        shacharit: { enabled: true, enabledAt: installedAt },
        maariv: { enabled: true, enabledAt: installedAt },
      },
    });
    renderAt('2027-06-14T21:35');
    expect(screen.queryByText('לא בוצע')).toBeNull();
    expect(screen.queryByRole('button', { name: 'סמן תפילת שחרית כהושלם' })).toBeNull();
    expect(completeButton('תפילת ערבית')).toBeOnTheScreen();
  });

  it('counts a mark made before the mitzvah was switched on again as done', () => {
    const switchedOnAgain = at(JERUSALEM, '2027-06-14T21:30').getTime();
    useMitzvotStore.setState({
      activeMitzvot: {
        shacharit: { enabled: true, enabledAt: switchedOnAgain },
        maariv: { enabled: true, enabledAt: switchedOnAgain },
      },
    });
    useCompletionsStore.setState({
      completions: { '2027-06-14': { shacharit: at(JERUSALEM, '2027-06-14T08:00').getTime() } },
    });
    renderAt('2027-06-14T21:35');
    expect(screen.getByText('1/2')).toBeOnTheScreen();
    expect(screen.queryByText('לא בוצע')).toBeNull();
  });

  it("files an undo under the window's day", () => {
    useCompletionsStore.setState({ completions: { '2027-06-14': { maariv: Date.now() } } });
    renderAt(NIGHT_OF_THE_14TH);
    expect(screen.getByText('בוצעו (1)')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'בטל' }));
    expect(completions()['2027-06-14']).toBeUndefined();
    expect(screen.queryByText('בוצעו (1)')).toBeNull();
  });

  it("files a skip under the window's day", async () => {
    renderAt(NIGHT_OF_THE_14TH);
    fireEvent(screen.getByRole('button', { name: /^תפילת ערבית/ }), 'longPress');
    fireEvent.press(screen.getByText('דלג היום'));
    await act(async () => {});
    const skipped = useCompletionsStore.getState().skipped;
    expect(Object.keys(skipped)).toEqual(['2027-06-14']);
    expect(Object.keys(completions())).toEqual([]);
  });

  it("opens the text on the window's day", () => {
    renderAt(NIGHT_OF_THE_14TH);
    fireEvent.press(screen.getByRole('button', { name: 'פתח נוסח' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/siddur/[id]',
      params: { id: 'maariv', date: '2027-06-14' },
    });
  });

  it('keeps maariv current between chatzot and alot, then moves on to the next evening', () => {
    const chatzot = zmanimFor(at(JERUSALEM, '2027-06-14T12:00'), JERUSALEM).chatzotLayla;
    expect(at(JERUSALEM, AFTER_CHATZOT).getTime()).toBeGreaterThan(chatzot.getTime());
    const night = renderAt(AFTER_CHATZOT);
    expect(completeButton('תפילת ערבית')).toBeOnTheScreen();
    expect(screen.queryByText('אין מצווה פתוחה ברגע זה')).toBeNull();
    expect(screen.queryByText(/^לא בוצע/)).toBeNull();
    expect(screen.queryByText(/^עבר הזמן ב-/)).toBeNull();
    expect(screen.queryByText('הבא בתור')).toBeNull();
    night.unmount();
    jest.useRealTimers();

    renderAt(AFTER_ALOT);
    expect(screen.queryByText(/^לא בוצע/)).toBeNull();
    expect(screen.getByText('הבא בתור')).toBeOnTheScreen();
  });

  it("files a maariv marked after chatzot under the evening's day", async () => {
    renderAt(AFTER_CHATZOT);
    fireEvent.press(completeButton('תפילת ערבית'));
    expect(Object.keys(completions())).toEqual(['2027-06-14']);
    await waitFor(() => expect(mockCancel).toHaveBeenCalledTimes(1));
    expect(dateKey(mockCancel.mock.calls[0][1] as Date)).toBe('2027-06-14');
  });

  it('names the evening date in the subtitle until alot and the new date after it', () => {
    const night = renderAt(NIGHT_OF_THE_14TH);
    expect(screen.getByText(new RegExp(`^${escapeRegExp(dayLabel(14))}`))).toBeOnTheScreen();
    expect(screen.queryByText(new RegExp(escapeRegExp(dayLabel(15))))).toBeNull();
    night.unmount();
    jest.useRealTimers();

    renderAt(AFTER_ALOT);
    expect(screen.getByText(new RegExp(`^${escapeRegExp(dayLabel(15))}`))).toBeOnTheScreen();
  });

  describe.each(HIDDEN_INTL_NAMES)('without Intl weekday and month names (%s, Hermes on iOS)', (mode) => {
    let restore: () => void;
    beforeAll(() => {
      restore = hideIntlDateNames(mode);
    });
    afterAll(() => restore());

    it('names the day in the subtitle in Hebrew and English, never "null"', () => {
      const hebrew = renderAt(AFTER_ALOT);
      expect(screen.getByText(/^יום שלישי · 15 יוני · /)).toBeOnTheScreen();
      expect(screen.queryByText(/null/)).toBeNull();
      hebrew.unmount();
      jest.useRealTimers();

      useUserStore.setState({ language: 'en' });
      renderAt(AFTER_ALOT);
      expect(screen.getByText(/^Tuesday · Jun 15 · /)).toBeOnTheScreen();
      expect(screen.queryByText(/null/)).toBeNull();
    });
  });

  it('counts a mark of last night as the evening day, not the new one', () => {
    useCompletionsStore.setState({ completions: { '2027-06-14': { maariv: 1 } } });
    const night = renderAt(AFTER_CHATZOT);
    expect(screen.getByText('1/1')).toBeOnTheScreen();
    night.unmount();
    jest.useRealTimers();

    renderAt(AFTER_ALOT);
    expect(screen.getByText('0/1')).toBeOnTheScreen();
    expect(screen.queryByText(/^בוצעו/)).toBeNull();
  });

  it('puts the wordmark on its own brand row and keeps the done counter in the header', () => {
    useCompletionsStore.setState({ completions: { '2027-06-14': { maariv: 1 } } });
    renderAt(AFTER_CHATZOT);
    const brand = screen.getByTestId('home-brand');
    expect(brand).toHaveStyle({ flexDirection: 'row', justifyContent: 'flex-end' });
    expect(screen.UNSAFE_getAllByType(AppLogo)).toHaveLength(1);
    expect(within(brand).UNSAFE_getByType(AppLogo).props).toMatchObject({ variant: 'wordmark', size: 34 });
    expect(within(brand).queryByLabelText('בוצעו 1 מתוך 1')).toBeNull();
    expect(screen.getByLabelText('בוצעו 1 מתוך 1')).toHaveStyle({ backgroundColor: THEMES.gold.goldLight });
    expect(screen.getByText('1/1')).toHaveStyle({ color: THEMES.gold.goldText });
  });

  describe('a custom mitzvah whose window starts after midnight', () => {
    beforeEach(() => {
      useCustomMitzvotStore.getState().add(customWindow(MIDNIGHT_ID, MIDNIGHT_NAME, '00:30', '01:30'));
      enableOnly(MIDNIGHT_ID);
    });

    it('is next up the evening before, with the start of the coming window', () => {
      renderAt('2027-06-14T23:00');
      expect(screen.getByText('הבא בתור')).toBeOnTheScreen();
      const start = clockOf(at(JERUSALEM, '2027-06-15T00:30'));
      expect(screen.getByText(`${MIDNIGHT_NAME} · ${start}`)).toBeOnTheScreen();
    });

    it("is filed under the evening's day when done inside the window", () => {
      renderAt('2027-06-15T00:45');
      fireEvent.press(completeButton(MIDNIGHT_NAME));
      expect(Object.keys(completions())).toEqual(['2027-06-14']);
      expect(completions()['2027-06-14'][MIDNIGHT_ID]).toBeGreaterThan(0);
    });

    it('is missed after its window, until alot', () => {
      renderAt('2027-06-15T02:00');
      expect(screen.getByText('לא בוצע (1)')).toBeOnTheScreen();
    });

    it("is next up for the following night's window once alot has passed", () => {
      renderAt(AFTER_ALOT);
      const start = clockOf(at(JERUSALEM, '2027-06-16T00:30'));
      expect(screen.getByText(`${MIDNIGHT_NAME} · ${start}`)).toBeOnTheScreen();
    });
  });

  describe('a custom mitzvah whose window runs past midnight', () => {
    beforeEach(() => {
      useCustomMitzvotStore.getState().add(customWindow(LATE_ID, LATE_NAME, '22:00', '01:00'));
      enableOnly(LATE_ID);
    });

    it("is filed under the evening's day when done after midnight", () => {
      renderAt('2027-06-15T00:30');
      fireEvent.press(completeButton(LATE_NAME));
      expect(Object.keys(completions())).toEqual(['2027-06-14']);
      expect(completions()['2027-06-14'][LATE_ID]).toBeGreaterThan(0);
    });
  });

  describe('a custom mitzvah between midnight and alot', () => {
    beforeEach(() => {
      useCustomMitzvotStore.getState().add(customWindow(NIGHT_ID, NIGHT_NAME, '03:29', '03:31'));
      enableOnly(NIGHT_ID);
    });

    it("files a mark before alot under the evening's day, and shows the next night's window after alot", async () => {
      const night = renderAt('2026-10-28T03:30');
      fireEvent.press(completeButton(NIGHT_NAME));
      expect(Object.keys(completions())).toEqual(['2026-10-27']);
      await waitFor(() => expect(mockCancel).toHaveBeenCalledTimes(1));
      expect(dateKey(mockCancel.mock.calls[0][1] as Date)).toBe('2026-10-27');
      night.unmount();
      jest.useRealTimers();

      renderAt('2026-10-28T05:00');
      expect(screen.getByText('הבא בתור')).toBeOnTheScreen();
      expect(screen.getByText(`${NIGHT_NAME} · ${clockOf(at(JERUSALEM, '2026-10-29T03:29'))}`)).toBeOnTheScreen();
      expect(screen.queryByText('בוצעו (1)')).toBeNull();
    });
  });

  describe('Chok LeYisrael', () => {
    const CHOK_NAME = 'חק לישראל';

    beforeEach(() => {
      installChokFixture();
      enableOnly('chok_leyisrael');
    });
    afterEach(() => {
      useChokStore.getState().reset();
    });

    it('stays current in the evening, after shkia', () => {
      renderAt('2026-12-16T20:00');
      expect(completeButton(CHOK_NAME)).toBeOnTheScreen();
      expect(screen.queryByText(/^לא בוצע/)).toBeNull();
      expect(screen.queryByText('אין מצווה פתוחה ברגע זה')).toBeNull();
    });

    it("files a mark made after midnight, before alot, under the evening's day", () => {
      renderAt('2026-12-17T02:00');
      fireEvent.press(completeButton(CHOK_NAME));
      expect(Object.keys(completions())).toEqual(['2026-12-16']);
    });

    it('opens the reader with no date on Thursday night, on ליל שישי', () => {
      const thursdayNight = at(JERUSALEM, '2026-12-17T21:00');
      renderAt('2026-12-17T21:00');
      fireEvent.press(screen.getByRole('button', { name: 'פתח נוסח' }));
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush.mock.calls[0][0]).toStrictEqual({ pathname: '/siddur/[id]', params: { id: 'chok_leyisrael' } });
      expect(chokReaderPortion({ now: thursdayNight }, JERUSALEM, true).slot).toBe('thuNight');
    });
  });

  describe('entering animations follow focus', () => {
    it('fades the live card in while home is focused', () => {
      renderAt(NIGHT_OF_THE_14TH);
      const wrappers = cardWrappers();
      expect(wrappers).toHaveLength(1);
      expect(wrappers[0].props.entering).toBeInstanceOf(FadeInDown);
    });

    it('mounts the live card with no entering animation while home is not focused', () => {
      mockFocused = false;
      renderAt(NIGHT_OF_THE_14TH);
      const wrappers = cardWrappers();
      expect(wrappers).toHaveLength(1);
      expect(wrappers[0].props.entering).toBeUndefined();
    });

    it("sets the missed card's entering prop only while home is focused", () => {
      useCustomMitzvotStore.getState().add(customWindow(MIDNIGHT_ID, MIDNIGHT_NAME, '00:30', '01:30'));
      enableOnly(MIDNIGHT_ID);
      mockFocused = false;
      renderAt('2027-06-15T02:00');
      expect(screen.getByText('לא בוצע (1)')).toBeOnTheScreen();
      expect(cardWrappers()).toHaveLength(1);
      expect(cardWrappers()[0].props.entering).toBeUndefined();
      emitNavigation('focus');
      expect(cardWrappers()[0].props.entering).toBeInstanceOf(FadeInDown);
    });

    it('follows blur and focus and unsubscribes on unmount', () => {
      const view = renderAt(NIGHT_OF_THE_14TH);
      expect(mockListeners.map((entry) => entry.event).sort()).toEqual(['blur', 'blur', 'focus', 'focus']);
      emitNavigation('blur');
      expect(cardWrappers()[0].props.entering).toBeUndefined();
      emitNavigation('focus');
      expect(cardWrappers()[0].props.entering).toBeInstanceOf(FadeInDown);
      view.unmount();
      expect(mockListeners).toEqual([]);
    });
  });
});
