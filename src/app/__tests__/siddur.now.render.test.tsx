const mockNavigation = {
  isFocused: () => true,
  getState: () => ({ index: 0, routes: [{ key: 'siddur' }] }),
  addListener: () => () => {},
};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useNavigation: () => mockNavigation,
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));

import { fireEvent, screen, within } from '@testing-library/react-native';
import SiddurScreen from '../(tabs)/siddur';
import { Card } from '@/components/Card';
import { ListRow } from '@/components/ListRow';
import { SettingsSection } from '@/components/SettingsSection';
import { CITIES } from '@/data/cities';
import { HebcalService } from '@/services/HebcalService';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { installSelichotFixture } from '@/testing/selichot';
import { at, zmanimFor } from '@/testing/zmanim';
import type { Nusach } from '@/types/mitzvah';
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

const BIRCHOT = 'ברכות השחר';
const SHACHARIT = 'תפילת שחרית';
const MINCHA = 'תפילת מנחה';
const MAARIV = 'תפילת ערבית';
const BEDTIME = 'קריאת שמע על המיטה';
const LEVANA = 'קידוש לבנה';
const SELICHOT = 'סליחות';
const NAMES = [
  BIRCHOT,
  'הנחת תפילין',
  'קריאת שמע שחרית',
  SHACHARIT,
  MINCHA,
  MAARIV,
  BEDTIME,
  LEVANA,
  SELICHOT,
  'הדלקת נרות חנוכה',
];
const EXCLUSIVE: [string, string][] = [
  [SHACHARIT, MINCHA],
  [MINCHA, MAARIV],
  [SHACHARIT, MAARIV],
  [BIRCHOT, BEDTIME],
  [BIRCHOT, MAARIV],
  [SHACHARIT, BEDTIME],
];

function openAllGroups() {
  for (const header of screen.queryAllByRole('button', { expanded: false })) fireEvent.press(header);
}

function nowCard(wallClock: string | Date, nusach: Nusach = 'ashkenaz'): string[] {
  useUserStore.setState({ nusach });
  const now = typeof wallClock === 'string' ? at(JERUSALEM, wallClock) : wallClock;
  jest.useFakeTimers({ now, doNotFake: [...ONLY_DATE] });
  const view = renderWithTheme(<SiddurScreen />);
  const card = screen.queryByTestId('siddur-now');
  const names = card ? NAMES.filter((name) => within(card).queryByText(name)) : [];
  view.unmount();
  jest.useRealTimers();
  return names;
}

describe('the siddur tab’s "now" card', () => {
  beforeEach(() => {
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
  });

  afterEach(() => jest.useRealTimers());

  it('is titled "now" and lists only what is said at that hour, never a later window', () => {
    expect(nowCard('2027-06-15T05:00')).toEqual([BIRCHOT, 'הנחת תפילין']);
    expect(nowCard('2027-06-15T07:30')).toEqual([BIRCHOT, 'הנחת תפילין', 'קריאת שמע שחרית', SHACHARIT]);
    expect(nowCard('2027-06-15T14:00')).toEqual(['הנחת תפילין', MINCHA]);
    expect(nowCard('2027-06-15T21:30')).toEqual([MAARIV, BEDTIME, LEVANA]);
    expect(nowCard('2027-06-16T02:00')).toEqual([MAARIV, BEDTIME, LEVANA]);
    jest.useFakeTimers({ now: at(JERUSALEM, '2027-06-15T07:30'), doNotFake: [...ONLY_DATE] });
    renderWithTheme(<SiddurScreen />);
    expect(screen.getByText('עכשיו')).toBeOnTheScreen();
    expect(screen.queryByText('היום')).toBeNull();
    expect(within(screen.getByTestId('siddur-now')).queryByText(/^מ-/)).toBeNull();
  });

  it('leaves the tefillin text out of the tab for a female siddur voice only', () => {
    useUserStore.setState({ siddurVoice: 'female' });
    expect(nowCard('2027-06-15T05:00')).toEqual([BIRCHOT]);
    for (const siddurVoice of ['male', null] as const) {
      useUserStore.setState({ siddurVoice });
      expect(nowCard('2027-06-15T05:00')).toEqual([BIRCHOT, 'הנחת תפילין']);
    }
  });

  it('drops a mitzvah already marked done for its window, and keeps the texts that have no mark', () => {
    useCompletionsStore.setState({ completions: { '2027-06-15': { shacharit: 1, tefillin: 1 } } });
    expect(nowCard('2027-06-15T07:30')).toEqual([BIRCHOT, 'קריאת שמע שחרית']);
    useCompletionsStore.setState({ completions: { '2027-06-15': { maariv: 1 } } });
    expect(nowCard('2027-06-16T00:30')).toEqual([BEDTIME, LEVANA]);
    expect(nowCard('2027-06-16T21:30')).toEqual([MAARIV, BEDTIME, LEVANA]);
  });

  it('draws every row of the tab as its own card', () => {
    jest.useFakeTimers({ now: at(JERUSALEM, '2027-06-15T07:30'), doNotFake: [...ONLY_DATE] });
    renderWithTheme(<SiddurScreen />);
    openAllGroups();
    const rows = screen.UNSAFE_getAllByType(ListRow);
    expect(rows.length).toBeGreaterThan(0);
    expect(screen.UNSAFE_getAllByType(Card)).toHaveLength(
      rows.length + screen.UNSAFE_getAllByType(SettingsSection).length,
    );
  });

  it('is absent while nothing is said', () => {
    useUserStore.setState({ nusach: 'ashkenaz' });
    jest.useFakeTimers({ now: at(JERUSALEM, '2027-06-23T20:05'), doNotFake: [...ONLY_DATE] });
    renderWithTheme(<SiddurScreen />);
    expect(screen.queryByTestId('siddur-now')).toBeNull();
    expect(screen.queryByText('עכשיו')).toBeNull();
  });

  it('offers Selichot from midnight through the morning prayer in its season, by each nusach’s first day', () => {
    installSelichotFixture();
    expect(nowCard('2027-09-08T01:30', 'edot_hamizrach')).toEqual([MAARIV, BEDTIME, SELICHOT]);
    expect(nowCard('2027-09-08T07:00', 'edot_hamizrach')).toEqual(
      expect.arrayContaining([BIRCHOT, SHACHARIT, SELICHOT]),
    );
    expect(nowCard('2027-09-08T23:00', 'edot_hamizrach')).not.toContain(SELICHOT);
    expect(nowCard('2027-09-08T01:30', 'ashkenaz')).not.toContain(SELICHOT);
    expect(nowCard('2027-09-27T01:30', 'ashkenaz')).toEqual([MAARIV, BEDTIME, SELICHOT]);
    expect(nowCard('2027-09-27T05:30', 'ashkenaz')).toEqual(expect.arrayContaining([BIRCHOT, SELICHOT]));
    expect(nowCard('2027-09-27T05:30', 'ashkenaz')).not.toContain(BEDTIME);
    useSelichotStore.getState().reset();
  });

  it('never shows two prayers that cannot both be said, at any hour of a week', () => {
    for (const [day, nusach] of [
      ['2027-06-14', 'ashkenaz'],
      ['2027-09-27', 'ashkenaz'],
      ['2027-12-27', 'sefard'],
      ['2027-09-08', 'edot_hamizrach'],
    ] as const) {
      for (let hour = 0; hour < 24; hour++) {
        for (const minute of ['00', '30']) {
          const shown = nowCard(`${day}T${String(hour).padStart(2, '0')}:${minute}`, nusach);
          for (const [a, b] of EXCLUSIVE) {
            expect({ day, hour, minute, both: shown.includes(a) && shown.includes(b), a, b }).toMatchObject({
              both: false,
            });
          }
        }
      }
    }
  });
});

describe('the Ushpizin row', () => {
  const USHPIZIN = 'אושפיזין';

  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ language: 'he', location: JERUSALEM, inIsrael: true, isOnboarded: true });
    useCompletionsStore.setState({ completions: {}, skipped: {} });
  });

  afterEach(() => jest.useRealTimers());

  function rows(wallClock: string, nusach: Nusach) {
    useUserStore.setState({ nusach });
    jest.useFakeTimers({ now: at(JERUSALEM, wallClock), doNotFake: [...ONLY_DATE] });
    const view = renderWithTheme(<SiddurScreen />);
    openAllGroups();
    const card = screen.queryByTestId('siddur-now');
    const result = {
      listed: screen.queryAllByText(USHPIZIN).length > 0,
      now: card !== null && within(card).queryByText(USHPIZIN) !== null,
      offSeason: screen.queryByText('בלילות סוכות') !== null,
    };
    view.unmount();
    jest.useRealTimers();
    return result;
  }

  it('lists Ushpizin under the occasions in every nusach but Chabad, greyed out off season', () => {
    for (const nusach of ['ashkenaz', 'sefard', 'edot_hamizrach'] as const) {
      expect(rows('2026-10-28T15:00', nusach)).toEqual({ listed: true, now: false, offSeason: true });
    }
    expect(rows('2026-10-28T15:00', 'chabad')).toEqual({ listed: false, now: false, offSeason: false });
  });

  it('joins the now card from nightfall on a night of Sukkot, and never for Chabad', () => {
    expect(rows('2026-09-28T21:00', 'ashkenaz')).toEqual({ listed: true, now: true, offSeason: false });
    expect(rows('2026-09-28T14:00', 'ashkenaz').now).toBe(false);
    expect(rows('2026-09-28T21:00', 'chabad')).toEqual({ listed: false, now: false, offSeason: false });
  });
});

describe('the Chanukah candle-lighting text in the now card', () => {
  const CANDLES = 'הדלקת נרות חנוכה';
  const FRIDAY = '2026-12-04';
  const WEEKDAY = '2026-12-08';
  const NUSCHAOT: Nusach[] = ['ashkenaz', 'sefard', 'edot_hamizrach', 'chabad'];
  const zmanimOn = (iso: string) => zmanimFor(at(JERUSALEM, `${iso}T12:00`), JERUSALEM);
  const plus = (instant: Date, minutes: number) => new Date(instant.getTime() + minutes * 60_000);

  beforeEach(() => {
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
  });

  afterEach(() => jest.useRealTimers());

  it.each(NUSCHAOT)('%s: lists it on a Chanukah Friday at plag hamincha + 10 min, and not at 13:00', (nusach) => {
    expect(nowCard(plus(zmanimOn(FRIDAY).plagHaMincha, 10), nusach)).toContain(CANDLES);
    expect(nowCard(`${FRIDAY}T13:00`, nusach)).not.toContain(CANDLES);
  });

  it('lists it for Chabad on a Chanukah weekday at shkia + 5 min, and not at 13:00', () => {
    expect(nowCard(plus(zmanimOn(WEEKDAY).shkia, 5), 'chabad')).toContain(CANDLES);
    expect(nowCard(`${WEEKDAY}T13:00`, 'chabad')).not.toContain(CANDLES);
  });

  it('waits for tzeit on a weekday for the other nuschaot, as their mitzvah does', () => {
    for (const nusach of ['ashkenaz', 'sefard', 'edot_hamizrach'] as const) {
      expect(nowCard(plus(zmanimOn(WEEKDAY).shkia, 5), nusach)).not.toContain(CANDLES);
      expect(nowCard(plus(zmanimOn(WEEKDAY).tzeitHakochavim, 5), nusach)).toContain(CANDLES);
    }
  });

  it('captions it until candle lighting on Friday', () => {
    const lighting = HebcalService.holyBlockOn(at(JERUSALEM, '2026-12-05T12:00'), JERUSALEM)!.start;
    useUserStore.setState({ nusach: 'ashkenaz' });
    jest.useFakeTimers({ now: plus(zmanimOn(FRIDAY).plagHaMincha, 10), doNotFake: [...ONLY_DATE] });
    renderWithTheme(<SiddurScreen />);
    const row = within(screen.getByTestId('siddur-now'))
      .UNSAFE_getAllByType(ListRow)
      .find((entry) => entry.props.title === CANDLES)!;
    expect(row.props.caption).toBe(`עד ${clockOf(lighting)}`);
  });

  it('leaves it out after candle lighting on Friday, though the night runs on to alot', () => {
    expect(nowCard(plus(zmanimOn(FRIDAY).tzeitHakochavim, 5))).not.toContain(CANDLES);
  });
});

describe('the Kiddush Levana row', () => {
  const FROM_THREE = 'משלושה ימים אחרי המולד עד חצי החודש';
  const FROM_SEVEN = 'משבעה ימים אחרי המולד עד חצי החודש';
  const FROM_SEVEN_TO_FIFTEEN = 'משבעה עד חמישה עשר ימים אחרי המולד';

  beforeEach(() => {
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
  });

  afterEach(() => jest.useRealTimers());

  function levanaRow(wallClock: string, nusach: Nusach) {
    useUserStore.setState({ nusach });
    jest.useFakeTimers({ now: at(JERUSALEM, wallClock), doNotFake: [...ONLY_DATE] });
    const view = renderWithTheme(<SiddurScreen />);
    openAllGroups();
    const rows = screen.UNSAFE_getAllByType(ListRow).filter((row) => row.props.title === LEVANA);
    const { caption, disabled, chevron } = rows[rows.length - 1].props;
    view.unmount();
    jest.useRealTimers();
    return { caption, disabled: Boolean(disabled), chevron };
  }

  it.each([
    ['2026-10-13T20:00', 'ashkenaz', { caption: FROM_THREE, disabled: false, chevron: true }],
    ['2026-10-14T20:00', 'ashkenaz', { caption: undefined, disabled: false, chevron: true }],
    ['2026-10-14T20:00', 'sefard', { caption: FROM_SEVEN, disabled: false, chevron: true }],
    ['2026-10-14T20:00', 'chabad', { caption: FROM_SEVEN, disabled: false, chevron: true }],
    ['2026-10-14T20:00', 'edot_hamizrach', { caption: FROM_SEVEN_TO_FIFTEEN, disabled: false, chevron: true }],
    ['2026-10-18T20:00', 'sefard', { caption: undefined, disabled: false, chevron: true }],
    ['2026-10-18T20:00', 'edot_hamizrach', { caption: undefined, disabled: false, chevron: true }],
    ['2026-10-18T20:00', 'chabad', { caption: undefined, disabled: false, chevron: true }],
    ['2026-10-16T12:00', 'ashkenaz', { caption: FROM_THREE, disabled: false, chevron: true }],
    ['2026-10-26T03:00', 'ashkenaz', { caption: undefined, disabled: false, chevron: true }],
    ['2026-10-26T04:00', 'ashkenaz', { caption: FROM_THREE, disabled: false, chevron: true }],
    ['2026-10-26T04:00', 'sefard', { caption: FROM_SEVEN, disabled: false, chevron: true }],
    ['2026-10-26T04:00', 'chabad', { caption: FROM_SEVEN, disabled: false, chevron: true }],
    ['2026-10-26T04:00', 'edot_hamizrach', { caption: undefined, disabled: false, chevron: true }],
  ] as const)(
    'at %s in %s the row reads %j, never disabled and always with a chevron',
    (wallClock, nusach, expected) => {
      expect(levanaRow(wallClock, nusach)).toEqual(expected);
    },
  );

  it('joins the now card on the first night for the nusach whose period is open, and only then', () => {
    expect(nowCard('2026-10-14T21:00', 'ashkenaz')).toContain(LEVANA);
    expect(nowCard('2026-10-14T21:00', 'sefard')).not.toContain(LEVANA);
  });

  it('leaves the now card when the period ends, though the night runs on to alot', () => {
    expect(nowCard('2026-10-26T03:00', 'ashkenaz')).toContain(LEVANA);
    expect(nowCard('2026-10-26T04:00', 'ashkenaz')).not.toContain(LEVANA);
    expect(nowCard('2026-10-26T04:00', 'sefard')).not.toContain(LEVANA);
    expect(nowCard('2026-10-26T04:00', 'edot_hamizrach')).toContain(LEVANA);
  });

  it("names the period's end on the last night's now card, not the next alot", () => {
    useUserStore.setState({ nusach: 'ashkenaz' });
    jest.useFakeTimers({ now: at(JERUSALEM, '2026-10-25T22:00'), doNotFake: [...ONLY_DATE] });
    renderWithTheme(<SiddurScreen />);
    const row = within(screen.getByTestId('siddur-now'))
      .UNSAFE_getAllByType(ListRow)
      .find((entry) => entry.props.title === LEVANA)!;
    expect(row.props.caption).toBe(`עד ${clockOf(new Date('2026-10-26T01:44:10.171Z'))}`);
  });
});
