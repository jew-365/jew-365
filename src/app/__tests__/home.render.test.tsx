const mockPush = jest.fn();
const mockCancel = jest.fn(async (..._args: unknown[]) => {});
const mockListeners: { event: string; listener: () => void }[] = [];
let mockFocused = true;
let mockTabIndex = 0;
const mockNavigation = {
  isFocused: () => mockFocused,
  getState: () => ({ index: mockTabIndex, routes: [{ key: 'this-tab' }, { key: 'other-tab' }] }),
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
jest.mock('expo-status-bar', () => ({ setStatusBarStyle: jest.fn() }));
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
import { Reveal } from '@/components/Reveal';
import HomeScreen from '../(tabs)/home';
import { AppLogo } from '@/components/AppLogo';
import { CounterPill } from '@/components/ScreenHeader';
import { CITIES } from '@/data/cities';
import { useChokStore } from '@/stores/useChokStore';
import { useCompletionsStore, dateKey } from '@/stores/useCompletionsStore';
import { useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { installChokFixture } from '@/testing/chok';
import { HIDDEN_INTL_NAMES, hideIntlDateNames } from '@/testing/intl';
import { renderWithTheme } from '@/testing/render';
import { at, zmanimFor } from '@/testing/zmanim';
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
const nowCard = (id: string) => screen.getByTestId(`home-now-${id}`);
const dayCard = (id: string) => screen.getByTestId(`home-day-${id}`);

const cardWrappers = () =>
  screen
    .UNSAFE_getAllByType(Reveal)
    .filter(
      (view) =>
        view.findAll(
          (node: { props: { testID?: unknown } }) =>
            typeof node.props.testID === 'string' && node.props.testID.startsWith('home-now-'),
        ).length > 0,
    );
const dayWrappers = () =>
  screen
    .UNSAFE_getAllByType(Reveal)
    .filter(
      (view) =>
        view.findAll(
          (node: { props: { testID?: unknown } }) =>
            typeof node.props.testID === 'string' && node.props.testID.startsWith('home-day-'),
        ).length > 0,
    );

function emitNavigation(event: 'focus' | 'blur') {
  mockFocused = event === 'focus';
  act(() => {
    mockListeners.filter((entry) => entry.event === event).forEach((entry) => entry.listener());
  });
}

describe('home between midnight and alot', () => {
  beforeEach(() => {
    mockFocused = true;
    mockTabIndex = 0;
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
      homeLook: 'rings',
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
    expect(screen.getByText(/^פתוח עכשיו/)).toBeOnTheScreen();
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
    expect(screen.queryByTestId('home-day-shacharit')).toBeNull();
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
    const summary = within(screen.getByTestId('home-rings-summary'));
    expect(summary.getAllByText('1')[0]).toBeOnTheScreen();
    expect(summary.getByText('מתוך 2')).toBeOnTheScreen();
    expect(screen.queryByText(/^פוספס · /)).toBeNull();
  });

  it("files an undo under the window's day", () => {
    useCompletionsStore.setState({ completions: { '2027-06-14': { maariv: Date.now() } } });
    renderAt(NIGHT_OF_THE_14TH);
    expect(within(dayCard('maariv')).getByText(/^בוצע ב-/)).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'ביטול סימון — תפילת ערבית' }));
    expect(completions()['2027-06-14']).toBeUndefined();
    expect(within(dayCard('maariv')).getByText(/^פתוח · נשארו/)).toBeOnTheScreen();
  });

  it("files a skip under the window's day", async () => {
    renderAt(NIGHT_OF_THE_14TH);
    fireEvent(within(nowCard('maariv')).getByRole('button', { name: /^תפילת ערבית/ }), 'longPress');
    fireEvent.press(screen.getByText('דלג היום'));
    await act(async () => {});
    const skipped = useCompletionsStore.getState().skipped;
    expect(Object.keys(skipped)).toEqual(['2027-06-14']);
    expect(Object.keys(completions())).toEqual([]);
  });

  it("opens the text on the window's day", () => {
    renderAt(NIGHT_OF_THE_14TH);
    fireEvent.press(screen.getByRole('button', { name: 'נוסח — תפילת ערבית' }));
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
    expect(screen.queryByText(/^פוספס · /)).toBeNull();
    night.unmount();
    jest.useRealTimers();

    renderAt(AFTER_ALOT);
    expect(screen.queryByText(/^פוספס · /)).toBeNull();
    expect(within(dayCard('maariv')).getByText(/^נפתח ב-/)).toBeOnTheScreen();
  });

  it("files a maariv marked after chatzot under the evening's day", async () => {
    renderAt(AFTER_CHATZOT);
    fireEvent.press(completeButton('תפילת ערבית'));
    expect(Object.keys(completions())).toEqual(['2027-06-14']);
    await waitFor(() => expect(mockCancel).toHaveBeenCalledTimes(1));
    expect(dateKey(mockCancel.mock.calls[0][1] as Date)).toBe('2027-06-14');
  });

  it('names the evening date in the date line until alot and the new date after it', () => {
    const night = renderAt(NIGHT_OF_THE_14TH);
    expect(screen.getByText(/^יום שני · /)).toBeOnTheScreen();
    expect(screen.queryByText(/^יום שלישי · /)).toBeNull();
    night.unmount();
    jest.useRealTimers();

    renderAt(AFTER_ALOT);
    expect(screen.getByText(/^יום שלישי · /)).toBeOnTheScreen();
  });

  describe.each(HIDDEN_INTL_NAMES)('without Intl weekday and month names (%s, Hermes on iOS)', (mode) => {
    let restore: () => void;
    beforeAll(() => {
      restore = hideIntlDateNames(mode);
    });
    afterAll(() => restore());

    it('names the day in the date line in Hebrew and English, never "null"', () => {
      const hebrew = renderAt(AFTER_ALOT);
      expect(screen.getByText(/^יום שלישי · /)).toBeOnTheScreen();
      expect(screen.queryByText(/null/)).toBeNull();
      hebrew.unmount();
      jest.useRealTimers();

      useUserStore.setState({ language: 'en' });
      renderAt(AFTER_ALOT);
      expect(screen.getByText(/^Tuesday · /)).toBeOnTheScreen();
      expect(screen.queryByText(/null/)).toBeNull();
    });
  });

  it('counts a mark of last night as the evening day, not the new one', () => {
    useCompletionsStore.setState({ completions: { '2027-06-14': { maariv: 1 } } });
    const night = renderAt(AFTER_CHATZOT);
    const first = within(screen.getByTestId('home-rings-summary'));
    expect(first.getAllByText('1')[0]).toBeOnTheScreen();
    expect(first.getByText('מתוך 1')).toBeOnTheScreen();
    night.unmount();
    jest.useRealTimers();

    renderAt(AFTER_ALOT);
    const second = within(screen.getByTestId('home-rings-summary'));
    expect(second.getAllByText('0')[0]).toBeOnTheScreen();
    expect(second.getByText('מתוך 1')).toBeOnTheScreen();
    expect(screen.queryByText(/^בוצע ב-/)).toBeNull();
  });

  it('draws the hero with the icon in the top chip and the greeting', () => {
    renderAt(NIGHT_OF_THE_14TH);
    expect(screen.getByTestId('home-hero')).toBeOnTheScreen();
    expect(screen.UNSAFE_getAllByType(AppLogo)).toHaveLength(1);
    expect(screen.UNSAFE_getByType(AppLogo).props).toMatchObject({ variant: 'icon', size: 40 });
    expect(screen.UNSAFE_queryAllByType(CounterPill)).toHaveLength(0);
    expect(screen.getByText('לילה טוב')).toBeOnTheScreen();
    act(() => useUserStore.setState({ profileName: 'דוד לוי' }));
    expect(screen.getByText('לילה טוב, דוד')).toBeOnTheScreen();
  });

  describe('a custom mitzvah whose window starts after midnight', () => {
    beforeEach(() => {
      useCustomMitzvotStore.getState().add(customWindow(MIDNIGHT_ID, MIDNIGHT_NAME, '00:30', '01:30'));
      enableOnly(MIDNIGHT_ID);
    });

    it('is next up the evening before, with the start of the coming window', () => {
      renderAt('2027-06-14T23:00');
      const start = clockOf(at(JERUSALEM, '2027-06-15T00:30'), JERUSALEM.tz);
      expect(within(dayCard(MIDNIGHT_ID)).getByText(`נפתח ב-${start}`)).toBeOnTheScreen();
    });

    it("is filed under the evening's day when done inside the window", () => {
      renderAt('2027-06-15T00:45');
      fireEvent.press(completeButton(MIDNIGHT_NAME));
      expect(Object.keys(completions())).toEqual(['2027-06-14']);
      expect(completions()['2027-06-14'][MIDNIGHT_ID]).toBeGreaterThan(0);
    });

    it('keeps a missed entry on My day through the stamp when it is marked', async () => {
      renderAt('2027-06-15T02:00');
      expect(within(dayCard(MIDNIGHT_ID)).getByText(/^פוספס · /)).toBeOnTheScreen();
      fireEvent.press(completeButton(MIDNIGHT_NAME));
      fireEvent.press(screen.getByText('עשיתי בזמן ולא סימנתי'));
      expect(Object.keys(completions())).toEqual(['2027-06-14']);
      let gap = false;
      await waitFor(
        () => {
          if (!screen.queryByTestId(`home-day-${MIDNIGHT_ID}`)) gap = true;
          expect(within(dayCard(MIDNIGHT_ID)).getByText(/^בוצע ב-/)).toBeOnTheScreen();
        },
        { timeout: 3000 },
      );
      expect(gap).toBe(false);
    });

    it('does not call everything marked while a missed entry is still open', () => {
      useCustomMitzvotStore.getState().add(customWindow(LATE_ID, LATE_NAME, '22:00', '01:00'));
      enableOnly(MIDNIGHT_ID, LATE_ID);
      useCompletionsStore.setState({ completions: { '2027-06-14': { [LATE_ID]: Date.now() } } });
      renderAt('2027-06-15T02:00');
      expect(within(dayCard(MIDNIGHT_ID)).getByText(/^פוספס · /)).toBeOnTheScreen();
      expect(within(dayCard(LATE_ID)).getByText(/^בוצע ב-/)).toBeOnTheScreen();
      expect(screen.queryByText('הכול סומן להיום')).toBeNull();
      fireEvent.press(completeButton(MIDNIGHT_NAME));
      fireEvent.press(screen.getByText('עשיתי אחרי שעבר הזמן'));
      expect(screen.getByText('הכול סומן להיום')).toBeOnTheScreen();
    });

    it('is missed after its window, until alot', () => {
      renderAt('2027-06-15T02:00');
      const end = clockOf(at(JERUSALEM, '2027-06-15T01:30'), JERUSALEM.tz);
      expect(within(dayCard(MIDNIGHT_ID)).getByText(`פוספס · נגמר ב-${end}`)).toBeOnTheScreen();
    });

    it("is next up for the following night's window once alot has passed", () => {
      renderAt(AFTER_ALOT);
      const start = clockOf(at(JERUSALEM, '2027-06-16T00:30'), JERUSALEM.tz);
      expect(within(dayCard(MIDNIGHT_ID)).getByText(`נפתח ב-${start}`)).toBeOnTheScreen();
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
      expect(
        within(dayCard(NIGHT_ID)).getByText(`נפתח ב-${clockOf(at(JERUSALEM, '2026-10-29T03:29'), JERUSALEM.tz)}`),
      ).toBeOnTheScreen();
      expect(screen.queryByText(/^בוצע ב-/)).toBeNull();
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
      expect(screen.queryByText(/^פוספס · /)).toBeNull();
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
      fireEvent.press(screen.getByRole('button', { name: 'נוסח — חק לישראל' }));
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush.mock.calls[0][0]).toStrictEqual({ pathname: '/siddur/[id]', params: { id: 'chok_leyisrael' } });
      expect(chokReaderPortion({ now: thursdayNight }, JERUSALEM, true).slot).toBe('thuNight');
    });
  });

  describe('cards reveal when seen', () => {
    it('wraps the live card in a Reveal with its stagger', () => {
      renderAt(NIGHT_OF_THE_14TH);
      const wrappers = cardWrappers();
      expect(wrappers).toHaveLength(1);
      expect(wrappers[0].props).toMatchObject({ delay: 0, duration: 280, shift: 25, playKey: 0 });
    });

    it('wraps the missed card with the missed stagger', () => {
      useCustomMitzvotStore.getState().add(customWindow(MIDNIGHT_ID, MIDNIGHT_NAME, '00:30', '01:30'));
      enableOnly(MIDNIGHT_ID);
      renderAt('2027-06-15T02:00');
      expect(within(dayCard(MIDNIGHT_ID)).getByText(/^פוספס · /)).toBeOnTheScreen();
      const wrappers = dayWrappers().filter(
        (view) =>
          view.findAll((node: { props: { testID?: unknown } }) => node.props.testID === `home-day-${MIDNIGHT_ID}`)
            .length > 0,
      );
      expect(wrappers).toHaveLength(1);
      expect(wrappers[0].props).toMatchObject({ delay: 0, duration: 260, shift: 25 });
    });

    it('replays after a return from another tab, not on a blur', async () => {
      renderAt(NIGHT_OF_THE_14TH);
      mockTabIndex = 1;
      emitNavigation('blur');
      await act(async () => {});
      expect(cardWrappers()[0].props.playKey).toBe(0);
      mockTabIndex = 0;
      emitNavigation('focus');
      await act(async () => {});
      expect(cardWrappers()[0].props.playKey).toBe(1);
    });

    it('does not replay when a pushed stack screen is popped back over home', async () => {
      renderAt(NIGHT_OF_THE_14TH);
      emitNavigation('blur');
      emitNavigation('focus');
      await act(async () => {});
      expect(cardWrappers()[0].props.playKey).toBe(0);
    });

    it('follows blur and focus and unsubscribes on unmount', () => {
      const view = renderAt(NIGHT_OF_THE_14TH);
      expect(mockListeners.map((entry) => entry.event).sort()).toEqual([
        'blur',
        'blur',
        'blur',
        'blur',
        'blur',
        'focus',
        'focus',
        'focus',
        'focus',
      ]);
      view.unmount();
      expect(mockListeners).toEqual([]);
    });
  });
});
