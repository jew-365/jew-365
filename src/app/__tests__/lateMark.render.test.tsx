const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace, canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));
jest.mock('@/services/ChokContentService', () => ({
  ...jest.requireActual('@/services/ChokContentService'),
  checkChokUpdate: jest.fn(async () => {}),
}));
jest.mock('@/services/SelichotContentService', () => ({
  ...jest.requireActual('@/services/SelichotContentService'),
  checkSelichotUpdate: jest.fn(async () => {}),
}));
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  getPresentedNotificationsAsync: jest.fn(async () => []),
  dismissNotificationAsync: jest.fn(async () => {}),
  dismissAllNotificationsAsync: jest.fn(async () => {}),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => ({})),
  setNotificationCategoryAsync: jest.fn(async () => ({})),
  registerTaskAsync: jest.fn(async () => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  AndroidImportance: { HIGH: 'high', DEFAULT: 'default', LOW: 'low' },
  AndroidNotificationVisibility: { PUBLIC: 'public', PRIVATE: 'private' },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(async () => false),
  unregisterTaskAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-background-task', () => ({
  registerTaskAsync: jest.fn(),
  unregisterTaskAsync: jest.fn(),
  getStatusAsync: jest.fn(),
  BackgroundTaskResult: { Success: 1, Failed: 2 },
  BackgroundTaskStatus: { Restricted: 1, Available: 2 },
}));

import { act, fireEvent, screen, within } from '@testing-library/react-native';
import DayRoute from '../day/[date]';
import LateMarksScreen from '../late-marks';
import MitzvahDetailScreen from '../mitzvah/[id]';
import ReportScreen from '../report';
import { DayLooks } from '@/components/DayLooks';
import { MitzvahCard } from '@/components/MitzvahCard';
import { CITIES } from '@/data/cities';
import { findMitzvah } from '@/data/mitzvot';
import { t } from '@/i18n';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';
import { dayWindow } from '@/utils/buildDayTimeline';
import { dayEntryStatusText } from '@/utils/homeDay';
import { ON_TIME_LEAD_MS } from '@/utils/lateMarks';

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
const SETTINGS = { nusach: 'ashkenaz' as const, halachicOpinions: { ksSofZman: 'GRA' as const }, inIsrael: true };
const SHACHARIT = findMitzvah('shacharit')!;
const TEFILLIN = findMitzvah('tefillin')!;
const ASK = 'מתי עשית?';
const ON_TIME = 'עשיתי בזמן ולא סימנתי';
const LATE = 'עשיתי אחרי שעבר הזמן';
const windowOn = (day: Date) => dayWindow(SHACHARIT, day, JERUSALEM, SETTINGS)!;
const state = () => useCompletionsStore.getState();

function setUp(wallClock: string) {
  jest.useFakeTimers({ now: at(JERUSALEM, wallClock), doNotFake: [...ONLY_DATE] });
  mockPush.mockClear();
  mockParams = {};
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
}

afterEach(() => jest.useRealTimers());

describe('marking a closed window on the day view', () => {
  const TODAY = new Date(2026, 9, 28);
  const card = (name: string) => screen.UNSAFE_getAllByType(MitzvahCard).find((node) => node.props.name === name)!;

  beforeEach(() => {
    setUp('2026-10-28T10:00');
    mockParams = { date: '2026-10-28' };
  });

  it('asks when it was done, and files "in time" one minute before the window closed', () => {
    expect(windowOn(TODAY).end.getTime()).toBeLessThan(Date.now());
    renderWithTheme(<DayRoute />);
    act(() => card(SHACHARIT.name.he).props.onComplete());
    expect(screen.getByText(ASK)).toBeOnTheScreen();
    expect(state().completions).toEqual({});
    fireEvent.press(screen.getByText(ON_TIME));
    expect(state().completions['2026-10-28'].shacharit).toBe(windowOn(TODAY).end.getTime() - ON_TIME_LEAD_MS);
    expect(state().late).toEqual({});
    expect(card(SHACHARIT.name.he).props).toMatchObject({ done: true, late: false });
  });

  it('files "after the time" as late and says so on the card', () => {
    renderWithTheme(<DayRoute />);
    act(() => card(SHACHARIT.name.he).props.onComplete());
    fireEvent.press(screen.getByText(LATE));
    expect(state().completions['2026-10-28'].shacharit).toBe(Date.now());
    expect(state().late['2026-10-28'].shacharit).toBe(Date.now());
    expect(card(SHACHARIT.name.he).props).toMatchObject({ done: true, late: true });
    expect(screen.getByText('סומן באיחור')).toBeOnTheScreen();
  });

  it('marks nothing when the sheet is closed, and marks an open window without asking', () => {
    renderWithTheme(<DayRoute />);
    act(() => card(SHACHARIT.name.he).props.onComplete());
    fireEvent.press(screen.getByText('סגור'));
    expect(state().completions).toEqual({});
    act(() => card(TEFILLIN.name.he).props.onComplete());
    expect(screen.queryByText(ASK)).toBeNull();
    expect(state().completions['2026-10-28'].tefillin).toBe(Date.now());
  });
});

describe("today's mark on the mitzvah screen", () => {
  it('offers the mark of a closed window through the question, then an undo', () => {
    setUp('2026-10-28T10:00');
    mockParams = { id: 'shacharit' };
    renderWithTheme(<MitzvahDetailScreen />);
    const today = () => within(screen.getByTestId('mitzvah-today-mark'));
    expect(today().getByText(/^הזמן נגמר ב-.* ועוד לא סימנת$/)).toBeOnTheScreen();
    fireEvent.press(today().getByText('עשיתי'));
    fireEvent.press(screen.getByText(LATE));
    expect(state().late['2026-10-28'].shacharit).toBeTruthy();
    expect(today().getByText(/^סומן באיחור ב-/)).toBeOnTheScreen();
    fireEvent.press(today().getByText('בטל'));
    expect(state().completions).toEqual({});
    expect(state().late).toEqual({});
  });

  it('marks an open window at once', () => {
    setUp('2026-10-28T08:00');
    mockParams = { id: 'shacharit' };
    renderWithTheme(<MitzvahDetailScreen />);
    const today = within(screen.getByTestId('mitzvah-today-mark'));
    expect(today.getByText(/^פתוח עד /)).toBeOnTheScreen();
    fireEvent.press(today.getByText('עשיתי'));
    expect(screen.queryByText(ASK)).toBeNull();
    expect(state().completions['2026-10-28'].shacharit).toBe(Date.now());
    expect(today.getByText(/^סומן ב-/)).toBeOnTheScreen();
  });

  it("keeps yesterday's closed window until alot, shows none before today's opens, and none while off", () => {
    setUp('2026-10-28T03:00');
    mockParams = { id: 'shacharit' };
    const night = renderWithTheme(<MitzvahDetailScreen />);
    expect(within(screen.getByTestId('mitzvah-today-mark')).getByText(/ועוד לא סימנת$/)).toBeOnTheScreen();
    night.unmount();
    setUp('2026-10-28T05:45');
    expect(windowOn(new Date(2026, 9, 28)).start.getTime()).toBeGreaterThan(Date.now());
    mockParams = { id: 'shacharit' };
    const { unmount } = renderWithTheme(<MitzvahDetailScreen />);
    expect(screen.queryByTestId('mitzvah-today-mark')).toBeNull();
    unmount();
    setUp('2026-10-28T10:00');
    mockParams = { id: 'shacharit' };
    useMitzvotStore.setState({ activeMitzvot: { shacharit: { enabled: false } } });
    renderWithTheme(<MitzvahDetailScreen />);
    expect(screen.queryByTestId('mitzvah-today-mark')).toBeNull();
  });
});

describe('the late marks report', () => {
  const HOUR = 3_600_000;
  const seed = () => {
    const monday = windowOn(new Date(2026, 9, 26)).end.getTime() + 2 * HOUR;
    const tuesday = windowOn(new Date(2026, 9, 27)).end.getTime() + HOUR;
    useCompletionsStore.setState({
      completions: { '2026-10-26': { shacharit: monday }, '2026-10-27': { shacharit: tuesday } },
      late: { '2026-10-26': { shacharit: monday }, '2026-10-27': { shacharit: tuesday } },
    });
  };

  beforeEach(() => setUp('2026-10-28T10:00'));

  it('lists every late mark with its day and delay, and sums them per mitzvah', () => {
    seed();
    renderWithTheme(<LateMarksScreen />);
    expect(screen.getByText('2 סימונים באיחור')).toBeOnTheScreen();
    expect(screen.getByText('2 מהם ב-30 הימים האחרונים')).toBeOnTheScreen();
    expect(screen.getByText('הכי הרבה באיחור: תפילת שחרית')).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('late-mitzvah-shacharit')).getByText(/^2 פעמים · איחור ממוצע 1:30/),
    ).toBeOnTheScreen();
    const tuesday = within(screen.getByTestId('late-entry-2026-10-27-shacharit'));
    expect(tuesday.getByText(/^יום שלישי 27 אוקטובר · .*, 1:00 שעות אחרי$/)).toBeOnTheScreen();
    fireEvent.press(tuesday.getByRole('button'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/day/[date]', params: { date: '2026-10-27' } });
  });

  it('explains itself when nothing was marked late', () => {
    renderWithTheme(<LateMarksScreen />);
    expect(screen.getByText(/^עוד לא סימנת מצווה באיחור/)).toBeOnTheScreen();
    expect(screen.queryByText('כל הסימונים')).toBeNull();
  });

  it('is reached from the weekly report, which counts the late mark apart', () => {
    useCompletionsStore.setState({
      completions: { '2026-10-21': { shacharit: 1, tefillin: 1 } },
      late: { '2026-10-21': { shacharit: 1 } },
    });
    renderWithTheme(<ReportScreen />);
    const line = screen.getByText('אחת סומנה באיחור ולא נספרה');
    fireEvent.press(line);
    expect(mockPush).toHaveBeenCalledWith('/late-marks');
  });
});

describe("a late entry in home's My day", () => {
  it.each(['rail', 'cards', 'rings'] as const)('is drawn late in the %s look, with an undo', (look) => {
    setUp('2026-10-28T10:00');
    const base = {
      id: 'shacharit',
      status: 'late' as const,
      start: at(JERUSALEM, '2026-10-28T06:10'),
      end: at(JERUSALEM, '2026-10-28T09:20'),
      markedAt: at(JERUSALEM, '2026-10-28T09:50').getTime(),
      date: new Date(2026, 9, 28),
    };
    const onUndo = jest.fn();
    const onMark = jest.fn();
    renderWithTheme(
      <DayLooks
        look={look}
        entries={[
          {
            ...base,
            name: SHACHARIT.name.he,
            icon: 'shacharit',
            statusText: dayEntryStatusText(base, new Date(), JERUSALEM.tz, t),
            range: null,
            startLabel: null,
            endLabel: null,
          },
        ]}
        now={new Date()}
        nowLabel="10:00"
        playKey={0}
        onPress={jest.fn()}
        onLongPress={jest.fn()}
        onMark={onMark}
        onUndo={onUndo}
      />,
    );
    const card = within(screen.getByTestId('home-day-shacharit'));
    expect(card.getByText('באיחור · סומן ב-09:50')).toBeOnTheScreen();
    fireEvent.press(card.getByText('בטל'));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onMark).not.toHaveBeenCalled();
    if (look === 'rings') {
      expect(screen.getByLabelText('בוצעו 1, פתוחות 0, פוספסו 0, מתוך 1')).toBeOnTheScreen();
    }
  });
});
