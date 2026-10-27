const mockPush = jest.fn();

jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({}), useRouter: () => ({ push: mockPush }) }));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => true),
}));

import { AppState } from 'react-native';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
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

const FIXTURE_DAYS = [11, 12, 13, 14, 15, 16, 18, 19, 21, 22, 23, 25, 26, 27];
const fixtureCompletions = Object.fromEntries(FIXTURE_DAYS.map((day) => [`2026-10-${day}`, { tefillin: 1 }]));

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
      profileName: 'אברהם כהן',
    });
    useCompletionsStore.getState().reset();
    useMitzvotStore.setState({ activeMitzvot: { tefillin: { enabled: true }, shacharit: { enabled: true } } });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('on the reference fixture', () => {
    beforeEach(() => {
      useMitzvotStore.setState({
        activeMitzvot: { tefillin: { enabled: true, enabledAt: at(JERUSALEM, '2026-10-11T00:00').getTime() } },
      });
    });

    async function renderFixture() {
      renderHistory(fixtureCompletions);
      await screen.findByTestId('history-calendar');
    }

    function openTab(name: string) {
      fireEvent.press(screen.getByRole('radio', { name }));
    }

    it('greets by first name, shows the streak ring, the goal and the explanation', async () => {
      await renderFixture();
      expect(screen.getByText('שלום, אברהם')).toBeOnTheScreen();
      expect(screen.getByLabelText('6 ימים ברצף')).toBeOnTheScreen();
      expect(screen.getByText('עוד יום אחד ליעד 7')).toBeOnTheScreen();
      expect(screen.getByText('רצף = ימים רצופים שבכל אחד מהם סימנת לפחות מצווה אחת')).toBeOnTheScreen();
      expect(screen.UNSAFE_getByType(Landscape).props.height).toBe(360);
      const streakRing = screen.UNSAFE_getAllByType(StreakRing).find((ring) => ring.props.streak !== undefined);
      expect(streakRing?.props.size).toBe(200);
    });

    it('greets a user with no name neutrally', async () => {
      useUserStore.setState({ profileName: '' });
      await renderFixture();
      expect(screen.getByText('שלום וברוכים הבאים')).toBeOnTheScreen();
    });

    it('offers three tabs and switches between them', async () => {
      await renderFixture();
      expect(screen.getAllByRole('radio')).toHaveLength(3);
      openTab('מגמות');
      expect(await screen.findByText('12 השבועות האחרונים')).toBeOnTheScreen();
      expect(screen.queryByTestId('history-calendar')).toBeNull();
    });

    it('pins a switcher of its own past the hero, which switches tabs, and drops it back at the hero', async () => {
      await renderFixture();
      const scroll = (y: number) =>
        fireEvent.scroll(screen.getByTestId('history-scroll'), {
          nativeEvent: {
            contentOffset: { x: 0, y },
            contentSize: { width: 360, height: 3000 },
            layoutMeasurement: { width: 360, height: 640 },
          },
        });
      expect(screen.queryByTestId('history-tabs-pinned')).toBeNull();
      scroll(900);
      const pinned = await screen.findByTestId('history-tabs-pinned');
      fireEvent.press(within(pinned).getByRole('radio', { name: 'הישגים' }));
      expect(await screen.findByText('שיאים אישיים')).toBeOnTheScreen();
      scroll(100);
      expect(screen.queryByTestId('history-tabs-pinned')).toBeNull();
    });

    it('draws the three period rings', async () => {
      await renderFixture();
      expect(within(screen.getByTestId('history-period-month')).getByLabelText('87%, 13 מתוך 15')).toBeOnTheScreen();
      expect(within(screen.getByTestId('history-period-week')).getByLabelText('75%, 3 מתוך 4')).toBeOnTheScreen();
      expect(within(screen.getByTestId('history-period-day')).getByLabelText('0%, 0 מתוך 1')).toBeOnTheScreen();
    });

    it('shades the calendar by how much of each day was done', async () => {
      await renderFixture();
      const cells = screen.getAllByTestId(/^history-day-/);
      expect(cells.length).toBeGreaterThanOrEqual(29);
      expect(cells.length).toBeLessThanOrEqual(30);
      expect(screen.getByTestId('history-day-2026-10-16')).toHaveStyle({ backgroundColor: THEMES.gold.gold });
      expect(screen.getByTestId('history-day-2026-10-20')).toHaveStyle({ backgroundColor: THEMES.gold.surface2 });
      expect(screen.getByTestId('history-day-2026-10-29')).toBeDisabled();
    });

    it('opens a day sheet and the full day from it', async () => {
      await renderFixture();
      fireEvent.press(screen.getByTestId('history-day-2026-10-27'));
      expect(await screen.findByText('יום שלישי, ט״ז בחשון תשפ״ז')).toBeOnTheScreen();
      expect(screen.getByText(/^בוצע · \d\d:\d\d$/)).toBeOnTheScreen();
      fireEvent.press(screen.getByText('לפרטים מלאים'));
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/day/[date]', params: { date: '2026-10-27' } });
    });

    it('moves to the previous month and keeps the next one off on the current', async () => {
      await renderFixture();
      expect(screen.getByRole('button', { name: 'החודש הבא' })).toBeDisabled();
      fireEvent.press(screen.getByRole('button', { name: 'החודש הקודם' }));
      expect(await screen.findByText('תשרי תשפ״ז')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'החודש הבא' })).toBeEnabled();
    });

    it('states the calendar insight, the leader and the consistency row', async () => {
      await renderFixture();
      expect(screen.getByText('ב־13 מתוך 15 הימים שעברו בחשון סימנת לפחות מצווה אחת')).toBeOnTheScreen();
      expect(screen.getByText('הנחת תפילין מובילה: 93% ב־30 הימים האחרונים')).toBeOnTheScreen();
      const row = screen.getByRole('button', { name: 'הנחת תפילין, 93%' });
      expect(within(row).getByText('6 ברצף')).toBeOnTheScreen();
      expect(screen.getByTestId('history-bar-tefillin')).toHaveStyle({ width: '93%' });
    });

    it('links to the achievements tab with the count and the best streak', async () => {
      await renderFixture();
      const link = within(screen.getByTestId('history-achievements-link'));
      expect(link.getByText('2 הישגים · השיא שלך 8 ימים')).toBeOnTheScreen();
      fireEvent.press(link.getByRole('button'));
      expect(await screen.findByTestId('history-badge-streak7')).toBeOnTheScreen();
    });

    it('shows the 12 weeks, the strongest weekday, the mitzvah trend and the reports', async () => {
      await renderFixture();
      openTab('מגמות');
      expect(await screen.findByTestId('history-week-2026-10-17')).toBeOnTheScreen();
      expect(screen.getAllByText('פרשת נח').length).toBeGreaterThan(0);
      expect(screen.getByText(/ · הטוב ביותר$/)).toBeOnTheScreen();
      expect(screen.getByTestId('history-weekday-0')).toHaveProp('accessibilityLabel', 'יום ראשון 100%');
      expect(screen.getByText('יום ראשון הוא היום החזק שלך: 100% ב־12 השבועות האחרונים')).toBeOnTheScreen();
      expect(screen.getByTestId('history-trend-tefillin')).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'דוחות' })).toBeNull();
    });

    it('opens a finished week report and leaves the current week closed', async () => {
      await renderFixture();
      openTab('מגמות');
      fireEvent.press(await screen.findByTestId('history-report-2026-10-24'));
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/report', params: { week: '2026-10-24' } });
      const current = screen.getByTestId('history-report-2026-10-31');
      expect(current.props.onPress).toBeUndefined();
      expect(within(current).getByText('ייסגר במוצאי שבת')).toBeOnTheScreen();
    });

    it('selects a week bar and shows its parasha', async () => {
      await renderFixture();
      openTab('מגמות');
      fireEvent.press(await screen.findByTestId('history-week-2026-10-24'));
      expect((await screen.findAllByText('פרשת לך־לך')).length).toBeGreaterThan(1);
      expect(screen.queryByText(/ · הטוב ביותר$/)).toBeNull();
    });

    it('lists the earned badges, the next ones and the records', async () => {
      await renderFixture();
      openTab('הישגים');
      expect(await screen.findByTestId('history-badge-streak7')).toBeOnTheScreen();
      expect(screen.getByTestId('history-badge-fullWeek')).toBeOnTheScreen();
      expect(screen.getByTestId('history-next-thousandMarks')).toBeOnTheScreen();
      expect(
        within(screen.getByTestId('history-record-streak')).getByText('הרצף הארוך ביותר: ל׳ בתשרי עד ח׳ בחשון'),
      ).toBeOnTheScreen();
      expect(screen.getByTestId('history-record-tefillin')).toBeOnTheScreen();
    });

    it('opens a badge sheet with the date it was earned', async () => {
      await renderFixture();
      openTab('הישגים');
      fireEvent.press(await screen.findByTestId('history-badge-streak7'));
      expect(await screen.findByText(/^הושג ב־/)).toBeOnTheScreen();
    });

    it('opens the mitzvah from a row of the day sheet', async () => {
      await renderFixture();
      fireEvent.press(screen.getByTestId('history-day-2026-10-27'));
      fireEvent.press(await screen.findByTestId('history-day-item-tefillin'));
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/mitzvah/[id]', params: { id: 'tefillin' } });
    });

    it('moves to the new app day when the app returns to the foreground after alot', async () => {
      let onChange: (state: string) => void = () => {};
      jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
        onChange = listener as (state: string) => void;
        return { remove: jest.fn() };
      });
      jest.setSystemTime(at(JERUSALEM, '2026-10-29T03:00'));
      await renderFixture();
      expect(screen.getByText('יום רביעי, י״ח חֶשְׁוָן תשפ״ז')).toBeOnTheScreen();
      jest.setSystemTime(at(JERUSALEM, '2026-10-29T06:00'));
      act(() => onChange('active'));
      expect(await screen.findByText('יום חמישי, י״ח חֶשְׁוָן תשפ״ז')).toBeOnTheScreen();
    });

    it('shows the current month again after leaving the tab and coming back', async () => {
      await renderFixture();
      fireEvent.press(screen.getByRole('button', { name: 'החודש הקודם' }));
      expect(await screen.findByText('תשרי תשפ״ז')).toBeOnTheScreen();
      openTab('מגמות');
      await screen.findByText('12 השבועות האחרונים');
      openTab('סיכום');
      expect(await screen.findByText('חשון תשפ״ז')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'החודש הבא' })).toBeDisabled();
    });

    it('keeps the content mounted while the stats recompute after a store change', async () => {
      await renderFixture();
      act(() => {
        useCompletionsStore.setState({
          completions: { ...fixtureCompletions, '2026-10-28': { tefillin: 1 } },
        });
      });
      expect(screen.getByTestId('history-calendar')).toBeOnTheScreen();
      expect(await screen.findByLabelText('7 ימים ברצף')).toBeOnTheScreen();
    });

    it('draws the selected week label on one line', async () => {
      await renderFixture();
      openTab('מגמות');
      await screen.findByTestId('history-week-2026-10-17');
      expect(screen.getByTestId('history-week-label-2026-10-17')).toHaveProp('numberOfLines', 1);
      fireEvent.press(screen.getByTestId('history-week-2026-10-24'));
      expect(await screen.findByTestId('history-week-label-2026-10-24')).toHaveProp('numberOfLines', 1);
    });

    it('persists the achievements it computed', async () => {
      await renderFixture();
      expect(useCompletionsStore.getState().achievements?.badges.streak7).toBe('2026-10-18');
    });
  });

  it('shows the streak in the ring and the way to the next goal', async () => {
    const fifteenDays = Object.fromEntries(
      Array.from({ length: 15 }, (_, index) => [`2026-10-${14 + index}`, { tefillin: 1 }]),
    );
    renderHistory(fifteenDays);
    expect(await screen.findByText('עוד 15 ימים ליעד 30')).toBeOnTheScreen();
    expect(screen.getByLabelText('15 ימים ברצף')).toBeOnTheScreen();
  });

  it('opens the mitzvah from its consistency row', async () => {
    renderHistory(lastTwoDays);
    await screen.findByTestId('history-calendar');
    fireEvent.press(screen.getByRole('button', { name: /^הנחת תפילין, \d+%$/ }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/mitzvah/[id]', params: { id: 'tefillin' } });
  });

  it('draws each tracked mitzvah with its percent and a bar of that width', async () => {
    renderHistory(lastTwoDays);
    await screen.findByTestId('history-calendar');
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
    await screen.findByTestId('history-calendar');
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
    await screen.findByTestId('history-calendar');
    const row = screen.getByRole('button', { name: 'תפילת מנחה, 50%' });
    expect(within(row).getByText('50%')).toBeOnTheScreen();
    expect(screen.getByTestId('history-bar-mincha')).toHaveStyle({ width: '50%' });
    expect(screen.queryByTestId('history-new-mincha')).toBeNull();
  });

  it('captions the new mitzvah in English too', async () => {
    enableMinchaThisMorning();
    useUserStore.setState({ language: 'en' });
    renderHistory({});
    await screen.findByTestId('history-calendar');
    expect(screen.getByRole('button', { name: 'Mincha, New · no day counted yet' })).toBeOnTheScreen();
  });
});
