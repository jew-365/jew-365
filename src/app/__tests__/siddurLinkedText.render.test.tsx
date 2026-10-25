const mockParams: Record<string, string | undefined> = {};
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
  dismissAll: jest.fn(),
  setParams: jest.fn(),
  canGoBack: () => true,
  canDismiss: () => false,
};

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Stack = Object.assign(
    ({ children }: { children?: unknown }) => React.createElement(View, { testID: 'stack' }, children),
    { Screen: () => null },
  );
  return {
    Stack,
    useRouter: () => mockRouter,
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (effect: () => void) => React.useEffect(effect, [effect]),
  };
});
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: () => Promise.resolve(),
  deactivateKeepAwake: () => Promise.resolve(),
}));
const mockLoadText = jest.fn((nusach: string, id: string) =>
  Promise.resolve({
    nusach,
    id,
    sections: [{ title: { he: 'קטע', en: 'Part' }, segments: [{ he: [[{ t: `נוסח ${id}` }]] }] }],
    credits: [],
  }),
);
jest.mock('@/services/SiddurService', () => ({
  loadSiddurText: (...args: [string, string]) => mockLoadText(...args),
  loadChokParasha: () => Promise.reject(new Error('no chok')),
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
jest.mock('react-native-safe-area-context', () => ({
  ...(jest.requireActual('react-native-safe-area-context') as object),
  SafeAreaProvider: ({ children }: { children?: unknown }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

import { HDate, months } from '@hebcal/core';
import { screen, fireEvent } from '@testing-library/react-native';
import SiddurReaderScreen from '../siddur/[id]';
import { CITIES } from '@/data/cities';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { installSelichotFixture } from '@/testing/selichot';
import { at } from '@/testing/zmanim';

jest.setTimeout(30000);

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

function open(params: Record<string, string>, wallClock: string) {
  jest.useFakeTimers({ now: at(JERUSALEM, wallClock), doNotFake: [...ONLY_DATE] });
  Object.assign(mockParams, params);
  renderWithTheme(<SiddurReaderScreen />);
}

afterEach(() => {
  useSelichotStore.getState().reset();
});

function resetReader() {
  useUserStore.getState().reset();
  useUserStore.setState({ language: 'he', location: JERUSALEM, inIsrael: true, nusach: 'ashkenaz' });
  useCompletionsStore.getState().reset();
  useMitzvotStore.getState().reset();
  for (const key of Object.keys(mockParams)) delete mockParams[key];
  mockLoadText.mockClear();
}

describe('the reader for a mitzvah linked to a standalone text', () => {
  beforeEach(resetReader);
  afterEach(() => jest.useRealTimers());

  it("reads the bedtime Shema's standalone text for the mitzvah's date, and its done button marks the mitzvah", async () => {
    open({ id: 'krias_shma_al_hamita', date: '2026-10-28' }, '2026-10-28T21:00');

    expect(await screen.findByText('נוסח kriat_shema_al_hamita')).toBeOnTheScreen();
    expect(mockLoadText).toHaveBeenCalledWith('ashkenaz', 'kriat_shema_al_hamita');

    fireEvent.press(screen.getByText('סיימתי'));

    expect(useCompletionsStore.getState().completions['2026-10-28'].krias_shma_al_hamita).toBeTruthy();
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
  });

  it("reads Selichot for the mitzvah's night after midnight, and its done button files the mark under that night's day", async () => {
    installSelichotFixture();
    open({ id: 'selichot', date: '2025-09-15' }, '2025-09-16T02:00');

    expect(await screen.findByText('נוסח selichot')).toBeOnTheScreen();
    expect(mockLoadText).toHaveBeenCalledWith('ashkenaz', 'selichot');

    fireEvent.press(screen.getByText('סיימתי'));

    const { completions } = useCompletionsStore.getState();
    expect(completions['2025-09-15'].selichot).toBeTruthy();
    expect(completions['2025-09-16']).toBeUndefined();
  });

  it('shows the download for a nusach not installed', async () => {
    open({ id: 'selichot', date: '2025-09-15' }, '2025-09-16T02:00');

    expect(await screen.findByText('הסליחות בנוסח אשכנז עוד לא הורדו למכשיר.')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('למסך ההורדה'));
    expect(mockRouter.push).toHaveBeenCalledWith('/mitzvah/selichot');
    expect(mockLoadText).not.toHaveBeenCalled();
  });

  it('opens the standalone text of the same id without a date, with no done button and the text own name', async () => {
    open({ id: 'chanukah_candles' }, '2026-12-07T19:00');

    expect(await screen.findByText('נוסח chanukah_candles')).toBeOnTheScreen();
    expect(screen.getByText('הדלקת נרות חנוכה')).toBeOnTheScreen();
    expect(screen.queryByText('סיימתי')).toBeNull();
    expect(screen.queryByText('נרות חנוכה')).toBeNull();
  });

  it('opens the mitzvah of the same id with a date, under the mitzvah name and with its done button', async () => {
    open({ id: 'chanukah_candles', date: '2026-12-07' }, '2026-12-07T19:00');

    expect(await screen.findByText('נוסח chanukah_candles')).toBeOnTheScreen();
    expect(screen.getByText('נרות חנוכה')).toBeOnTheScreen();
    expect(screen.getByText('סיימתי')).toBeOnTheScreen();
  });

  it("opens Kiddush Levana's text without a date until the period's end, and not between the end and alot", async () => {
    open({ id: 'kiddush_levana' }, '2026-10-26T03:00');

    expect(await screen.findByText('נוסח kiddush_levana')).toBeOnTheScreen();
    expect(mockLoadText).toHaveBeenCalledWith('ashkenaz', 'kiddush_levana');
  });

  it("opens no Kiddush Levana text on the night after the period's end, as the siddur tab greys it", async () => {
    open({ id: 'kiddush_levana' }, '2026-10-26T04:00');

    expect(await screen.findByText('אין נוסח לתאריך הזה.')).toBeOnTheScreen();
    expect(mockLoadText).not.toHaveBeenCalled();
  });

  it("still opens Kiddush Levana's text after that moment for the nusach whose period runs on", async () => {
    useUserStore.setState({ nusach: 'edot_hamizrach' });
    open({ id: 'kiddush_levana' }, '2026-10-26T04:00');

    expect(await screen.findByText('נוסח kiddush_levana')).toBeOnTheScreen();
    expect(mockLoadText).toHaveBeenCalledWith('edot_hamizrach', 'kiddush_levana');
  });

  it('loads nothing on a date whose night is not on Chanukah', async () => {
    open({ id: 'chanukah_candles', date: '2026-10-28' }, '2026-10-28T19:00');

    expect(await screen.findByText('אין נוסח לתאריך הזה.')).toBeOnTheScreen();
    expect(mockLoadText).not.toHaveBeenCalled();
  });
});

const header = (hebrewDate: HDate, ...occasions: string[]) =>
  ['אשכנז', hebrewDate.renderGematriya(true), ...occasions].join(' · ');
const englishHeader = (hebrewDate: HDate, ...occasions: string[]) =>
  ['Ashkenaz', hebrewDate.render('en'), ...occasions].join(' · ');
const kislev = (day: number) => new HDate(day, months.KISLEV, 5787);

describe("the reader header's Chanukah candle", () => {
  beforeEach(resetReader);
  afterEach(() => jest.useRealTimers());

  it('names the first candle on the evening of 2026-12-04, the night the reminder names', async () => {
    open({ id: 'chanukah_candles', date: '2026-12-04' }, '2026-12-04T15:00');

    expect(await screen.findByText('נוסח chanukah_candles')).toBeOnTheScreen();
    expect(screen.getByText(header(kislev(25), 'חנוכה: הנר ה־1'))).toBeOnTheScreen();
  });

  it('names the fourth candle on the evening of 2026-12-07', async () => {
    open({ id: 'chanukah_candles', date: '2026-12-07' }, '2026-12-07T19:00');

    expect(await screen.findByText('נוסח chanukah_candles')).toBeOnTheScreen();
    expect(screen.getByText(header(kislev(28), 'חנוכה: הנר ה־4'))).toBeOnTheScreen();
  });

  it('prints every occasion in the header without nikud, hebcal labels included', async () => {
    open({ id: 'chanukah_candles', date: '2026-12-10' }, '2026-12-10T19:00');

    expect(await screen.findByText('נוסח chanukah_candles')).toBeOnTheScreen();
    const line = String(screen.getByText(/חנוכה: הנר ה־7/).props.children);
    expect(line).toContain('ראש חודש טבת');
    expect(
      [...line].some(
        (char) => char.charCodeAt(0) >= 0x5b0 && char.charCodeAt(0) <= 0x5c7 && char !== String.fromCharCode(0x5be),
      ),
    ).toBe(false);
  });

  it('names the night in English', async () => {
    useUserStore.setState({ language: 'en' });
    open({ id: 'chanukah_candles', date: '2026-12-04' }, '2026-12-04T15:00');

    expect(await screen.findByText('נוסח chanukah_candles')).toBeOnTheScreen();
    expect(screen.getByText(englishHeader(kislev(25), 'Chanukah: night 1'))).toBeOnTheScreen();
  });

  it("names the eighth night once, without hebcal's eighth day beside it", async () => {
    useUserStore.setState({ language: 'en' });
    open({ id: 'chanukah_candles', date: '2026-12-11' }, '2026-12-11T12:00');

    expect(await screen.findByText('נוסח chanukah_candles')).toBeOnTheScreen();
    expect(screen.getByText(englishHeader(new HDate(2, months.TEVET, 5787), 'Chanukah: night 8'))).toBeOnTheScreen();
  });

  it("keeps hebcal's eighth day by day, when no candle is named", async () => {
    useUserStore.setState({ language: 'en' });
    open({ id: 'birkat_hamazon' }, '2026-12-12T10:00');

    expect(await screen.findByText('נוסח birkat_hamazon')).toBeOnTheScreen();
    expect(screen.getByText(englishHeader(new HDate(2, months.TEVET, 5787), 'Chanukah: 8th Day'))).toBeOnTheScreen();
  });

  it("names the evening's candle with no date in the evening", async () => {
    open({ id: 'chanukah_candles' }, '2026-12-07T19:00');

    expect(await screen.findByText('נוסח chanukah_candles')).toBeOnTheScreen();
    expect(screen.getByText(header(kislev(28), 'חנוכה: הנר ה־4'))).toBeOnTheScreen();
  });

  it("keeps the evening's candle with no date after midnight", async () => {
    open({ id: 'chanukah_candles' }, '2026-12-08T02:00');

    expect(await screen.findByText('נוסח chanukah_candles')).toBeOnTheScreen();
    expect(screen.getByText(header(kislev(28), 'חנוכה: הנר ה־4'))).toBeOnTheScreen();
  });

  it('names no candle on the evening before Chanukah', async () => {
    open({ id: 'maariv', date: '2026-12-03' }, '2026-12-03T19:00');

    expect(await screen.findByText('נוסח maariv')).toBeOnTheScreen();
    expect(screen.getByText(header(kislev(24)))).toBeOnTheScreen();
  });

  it("a daytime text after shkia names the evening's candle", async () => {
    open({ id: 'birkat_hamazon' }, '2026-12-07T19:00');

    expect(await screen.findByText('נוסח birkat_hamazon')).toBeOnTheScreen();
    expect(screen.getByText(header(kislev(28), 'חנוכה: הנר ה־4'))).toBeOnTheScreen();
  });

  it("a daytime text by day names tonight's candle", async () => {
    open({ id: 'birkat_hamazon' }, '2026-12-08T10:00');

    expect(await screen.findByText('נוסח birkat_hamazon')).toBeOnTheScreen();
    expect(screen.getByText(header(kislev(28), 'חנוכה: הנר ה־5'))).toBeOnTheScreen();
  });
});
