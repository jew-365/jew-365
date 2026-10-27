const mockPush = jest.fn();
const mockTabs = { index: 0 };
const mockBlurListeners = new Set<() => void>();
const mockNavigation = {
  isFocused: () => true,
  getState: () => ({ index: mockTabs.index, routes: [{ key: 'siddur' }, { key: 'home' }] }),
  addListener: (_event: string, listener: () => void) => {
    mockBlurListeners.add(listener);
    return () => mockBlurListeners.delete(listener);
  },
};
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: mockPush }),
  useNavigation: () => mockNavigation,
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));

import { DateTime } from 'luxon';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import SiddurScreen from '../(tabs)/siddur';
import { ListRow } from '@/components/ListRow';
import { CITIES } from '@/data/cities';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { at, zmanimFor } from '@/testing/zmanim';
import type { Nusach } from '@/types/mitzvah';
import { locationNoon } from '@/utils/locationDay';

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

const WEDNESDAY = '2027-06-16T14:00';
const SHABBAT = '2027-06-19T12:00';
const MITZVOT_ROWS = [
  'tefillin',
  'krias_shma_shacharit',
  'birchot_hashachar',
  'candle_lighting',
  'havdalah',
  'sefirat_haomer',
];

function openAllGroups() {
  for (const header of screen.queryAllByRole('button', { expanded: false })) fireEvent.press(header);
}

function openClosed(wallClock: string, nusach: Nusach = 'ashkenaz') {
  useUserStore.setState({ nusach });
  jest.useFakeTimers({ now: at(JERUSALEM, wallClock), doNotFake: [...ONLY_DATE] });
  return renderWithTheme(<SiddurScreen />);
}

function open(wallClock: string, nusach: Nusach = 'ashkenaz') {
  const view = openClosed(wallClock, nusach);
  openAllGroups();
  return view;
}

const rowOf = (id: string) => screen.getByTestId(`siddur-row-${id}`);
const listRowOf = (id: string) => within(rowOf(id)).UNSAFE_getByType(ListRow);
const idsIn = (testID: string) =>
  within(screen.getByTestId(testID))
    .getAllByTestId(/^siddur-row-/)
    .map((node) => node.props.testID.replace('siddur-row-', ''));

describe('the siddur tab’s catalog', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockTabs.index = 0;
    useUserStore.getState().reset();
    useUserStore.setState({
      language: 'he',
      location: JERUSALEM,
      inIsrael: true,
      isOnboarded: true,
      locationStatus: 'ready',
      locationSource: 'manual',
    });
    useCompletionsStore.setState({ completions: {}, skipped: {} });
    useSelichotStore.getState().reset();
  });

  afterEach(() => jest.useRealTimers());

  describe('the groups', () => {
    const TITLES = ['עכשיו', 'סעודה', 'תפילות', 'מצוות', 'כללי', 'מועדים ושמחות'];
    const headersInOrder = () => {
      const tree = JSON.stringify(screen.toJSON());
      return TITLES.filter((title) => tree.includes(`"${title}"`)).sort(
        (a, b) => tree.indexOf(`"${a}"`) - tree.indexOf(`"${b}"`),
      );
    };

    it('lists meals right under now, then the prayers, the mitzvot, general and the occasions', () => {
      openClosed('2027-06-16T09:00');
      expect(headersInOrder()).toEqual(TITLES);
    });

    it('lists meals first when nothing is said now', () => {
      openClosed('2027-06-23T20:05');
      expect(screen.queryByText('עכשיו')).toBeNull();
      expect(headersInOrder()).toEqual(TITLES.slice(1));
    });

    it('opens only the now group, and holds no row of a closed group', () => {
      openClosed('2027-06-16T09:00');
      expect(screen.getByTestId('siddur-now')).toBeOnTheScreen();
      expect(screen.queryByTestId('siddur-mitzvot')).toBeNull();
      expect(screen.queryByTestId('siddur-row-shacharit')).toBeNull();
      expect(screen.queryByTestId('siddur-row-birkat_hamazon')).toBeNull();
      expect(screen.queryByTestId('siddur-row-tikkun_haklali')).toBeNull();
    });

    it('says under each closed group what it holds', () => {
      openClosed(WEDNESDAY);
      expect(screen.getByText(/^תפילת שחרית · תפילת מנחה · תפילת ערבית$/)).toBeOnTheScreen();
      expect(screen.getByText('ברכת המזון · ברכה מעין שלוש · בורא נפשות')).toBeOnTheScreen();
      expect(screen.getByText(/^תיקון הכללי · תהילים · נשמת כל חי ועוד \d+$/)).toBeOnTheScreen();
    });

    it('opens and closes a group on a tap of its header', () => {
      openClosed(WEDNESDAY);
      fireEvent.press(screen.getByText('תפילות'));
      expect(rowOf('shacharit')).toBeOnTheScreen();
      fireEvent.press(screen.getByText('תפילות'));
      expect(screen.queryByTestId('siddur-row-shacharit')).toBeNull();
    });

    it('keeps several groups open together', () => {
      openClosed(WEDNESDAY);
      fireEvent.press(screen.getByText('תפילות'));
      fireEvent.press(screen.getByText('סעודה'));
      fireEvent.press(screen.getByText('מצוות'));
      expect(rowOf('shacharit')).toBeOnTheScreen();
      expect(rowOf('birkat_hamazon')).toBeOnTheScreen();
      expect(screen.getByTestId('siddur-mitzvot')).toBeOnTheScreen();
    });

    it('opens the row of an open group like before', () => {
      openClosed('2027-06-16T09:00');
      fireEvent.press(screen.getByText('תפילות'));
      fireEvent.press(within(rowOf('shacharit')).getByText('תפילת שחרית'));
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/siddur/[id]',
        params: { id: 'shacharit', date: '2027-06-16' },
      });
    });

    const blur = (tabIndex: number) => {
      mockTabs.index = tabIndex;
      act(() => mockBlurListeners.forEach((listener) => listener()));
      mockTabs.index = 0;
    };

    it('keeps the open groups when a screen pushed over the tab is left', () => {
      openClosed('2027-06-16T09:00');
      fireEvent.press(screen.getByText('תפילות'));
      blur(0);
      expect(rowOf('shacharit')).toBeOnTheScreen();
      expect(screen.getByTestId('siddur-now')).toBeOnTheScreen();
    });

    it('resets to now alone when the user moves to another tab', () => {
      openClosed('2027-06-16T09:00');
      fireEvent.press(screen.getByText('תפילות'));
      fireEvent.press(screen.getByText('עכשיו'));
      expect(screen.queryByTestId('siddur-now')).toBeNull();
      expect(rowOf('shacharit')).toBeOnTheScreen();
      blur(1);
      expect(screen.getByTestId('siddur-now')).toBeOnTheScreen();
      expect(screen.queryByTestId('siddur-row-shacharit')).toBeNull();
    });
  });

  describe('the mitzvot group', () => {
    it('lists the mitzvah texts that are not prayers, in registry order, right after the prayers', () => {
      open(WEDNESDAY);
      const group = screen.getByTestId('siddur-mitzvot');
      expect(group).toBeOnTheScreen();
      expect(screen.getByText('מצוות')).toBeOnTheScreen();
      expect(idsIn('siddur-mitzvot')).toEqual(MITZVOT_ROWS);
      const tree = JSON.stringify(screen.toJSON());
      const position = (testID: string) => tree.indexOf(`"testID":"${testID}"`);
      expect(position('siddur-row-maariv')).toBeGreaterThan(-1);
      expect(position('siddur-mitzvot')).toBeGreaterThan(position('siddur-row-maariv'));
      expect(position('siddur-row-tikkun_haklali')).toBeGreaterThan(position('siddur-mitzvot'));
    });

    it('keeps the prayers out of it', () => {
      open(WEDNESDAY);
      for (const prayer of ['shacharit', 'mincha', 'maariv']) {
        expect(within(screen.getByTestId('siddur-mitzvot')).queryByTestId(`siddur-row-${prayer}`)).toBeNull();
        expect(rowOf(prayer)).toBeOnTheScreen();
      }
    });

    it.each(['ashkenaz', 'sefard', 'edot_hamizrach', 'chabad'] as const)('is the same in %s', (nusach) => {
      open(WEDNESDAY, nusach);
      expect(idsIn('siddur-mitzvot')).toEqual(MITZVOT_ROWS);
    });

    it('leaves the tefillin out for a female siddur voice only', () => {
      useUserStore.setState({ siddurVoice: 'female' });
      open(WEDNESDAY);
      expect(idsIn('siddur-mitzvot')).toEqual(MITZVOT_ROWS.filter((id) => id !== 'tefillin'));
    });

    it('names the days of a text that has no window ahead and opens it with no date', () => {
      open(WEDNESDAY);
      const row = listRowOf('sefirat_haomer');
      expect(row.props.caption).toBe('מליל שני של פסח עד ערב שבועות');
      expect(row.props.iconTone).toBe('muted');
      expect(row.props.chevron).toBe(true);
      expect(row.props.disabled).toBeFalsy();
      fireEvent.press(within(rowOf('sefirat_haomer')).getByText('ספירת העומר'));
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/siddur/[id]', params: { id: 'sefirat_haomer' } });
    });

    it('names the day of a window ahead and opens it with no date, for the reader to find the day', () => {
      open(WEDNESDAY);
      const row = listRowOf('candle_lighting');
      expect(row.props.caption).toMatch(/ מ-\d\d:\d\d$/);
      expect(row.props.iconTone).toBe('accent');
      fireEvent.press(within(rowOf('candle_lighting')).getByText('הדלקת נרות שבת'));
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/siddur/[id]', params: { id: 'candle_lighting' } });
    });

    it('opens havdalah of a Sunday with no date, as its window is the coming Saturday night', () => {
      open('2027-06-20T14:00');
      fireEvent.press(within(rowOf('havdalah')).getByText('הבדלה'));
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/siddur/[id]', params: { id: 'havdalah' } });
    });

    it('opens a prayer whose window is open now at that window’s date', () => {
      open('2027-06-16T09:00');
      expect(listRowOf('shacharit').props.caption).toBe('פתוח עכשיו');
      fireEvent.press(within(rowOf('shacharit')).getByText('תפילת שחרית'));
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/siddur/[id]',
        params: { id: 'shacharit', date: '2027-06-16' },
      });
    });

    it('opens a prayer whose window opens later today at today’s date', () => {
      open('2027-06-16T04:30');
      fireEvent.press(within(rowOf('shacharit')).getByText('תפילת שחרית'));
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/siddur/[id]',
        params: { id: 'shacharit', date: '2027-06-16' },
      });
    });
  });

  describe('the opening time of a window ahead', () => {
    const netzOn = (day: Date) => zmanimFor(locationNoon(day, JERUSALEM), JERUSALEM).netzHaChama;
    const clock = (instant: Date) => DateTime.fromJSDate(instant, { zone: JERUSALEM.tz }).toFormat('HH:mm');

    it('says tomorrow and prints the opening time on the location’s clock, in any device zone', () => {
      open(WEDNESDAY);
      expect(listRowOf('shacharit').props.caption).toBe(`מחר מ-${clock(netzOn(new Date(2027, 5, 17)))}`);
    });

    it('names the weekday of a window more than a day ahead, in the location’s calendar', () => {
      open(WEDNESDAY);
      expect(listRowOf('candle_lighting').props.caption).toMatch(/^יום שישי מ-\d\d:\d\d$/);
    });

    it('prints a window that opens later today without a day, on the location’s clock', () => {
      open('2027-06-16T04:30');
      expect(listRowOf('shacharit').props.caption).toBe(`מ-${clock(netzOn(new Date(2027, 5, 16)))}`);
    });
  });

  describe('no row is disabled for the day', () => {
    it.each([
      ['a weekday afternoon', WEDNESDAY],
      ['Shabbat', SHABBAT],
      ['a Chanukah night', '2026-12-08T20:00'],
      ['a night of Sukkot', '2026-09-28T21:00'],
      ['the middle of the night', '2027-06-16T02:00'],
    ])('on %s every row is enabled and has a chevron', (_name, wallClock) => {
      open(wallClock);
      const rows = screen.UNSAFE_getAllByType(ListRow);
      expect(rows.length).toBeGreaterThan(10);
      for (const row of rows) {
        expect({ title: row.props.title, disabled: Boolean(row.props.disabled) }).toEqual({
          title: row.props.title,
          disabled: false,
        });
        expect({ title: row.props.title, chevron: row.props.chevron }).toEqual({
          title: row.props.title,
          chevron: true,
        });
      }
    });

    it('opens a prayer on Shabbat with no date, as its next window is on another day', () => {
      open(SHABBAT);
      const row = listRowOf('shacharit');
      expect(row.props.caption).toMatch(/ מ-\d\d:\d\d$/);
      fireEvent.press(within(rowOf('shacharit')).getByText('תפילת שחרית'));
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/siddur/[id]', params: { id: 'shacharit' } });
    });

    it('lists a text not said today with its availability caption, muted, and opens it', () => {
      open('2026-10-28T12:00');
      const row = listRowOf('chanukah_candles');
      expect(row.props.caption).toBe('בחנוכה');
      expect(row.props.iconTone).toBe('muted');
      expect(row.props.chevron).toBe(true);
      expect(row.props.disabled).toBeFalsy();
      fireEvent.press(within(rowOf('chanukah_candles')).getByText('הדלקת נרות חנוכה'));
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/siddur/[id]', params: { id: 'chanukah_candles' } });
    });

    it('captions a text not said today in English', () => {
      useUserStore.setState({ language: 'en' });
      open('2026-10-28T12:00');
      expect(listRowOf('chanukah_candles').props.caption).toBe('On Chanukah');
      expect(listRowOf('sefirat_haomer').props.caption).toBe('From the second night of Pesach to Erev Shavuot');
    });

    it('gives a text said today no caption and the accent tone', () => {
      open('2026-10-28T12:00');
      const row = listRowOf('birkat_hamazon');
      expect(row.props.caption).toBeUndefined();
      expect(row.props.iconTone).toBe('accent');
    });

    it('gives the Chanukah candles no caption and the accent tone on a night of Chanukah', () => {
      open('2026-12-08T20:00');
      const row = listRowOf('chanukah_candles');
      expect(row.props.caption).toBeUndefined();
      expect(row.props.iconTone).toBe('accent');
    });
  });
});
