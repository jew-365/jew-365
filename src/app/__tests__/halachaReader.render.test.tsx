const mockParams: { id: string; date?: string } = { id: 'halacha_yomit' };
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('@/utils/afterPaint', () => ({
  afterPaint: (task: () => void) => {
    queueMicrotask(task);
    return { cancel: () => undefined };
  },
}));
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useFocusEffect: () => {},
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({
    back: jest.fn(),
    canDismiss: () => false,
    canGoBack: () => false,
    dismissAll: jest.fn(),
    navigate: jest.fn(),
    replace: mockReplace,
    push: mockPush,
  }),
}));
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: () => Promise.resolve(),
  deactivateKeepAwake: () => Promise.resolve(),
}));
jest.mock('@/services/halachaFiles', () => ({
  ...jest.requireActual('@/services/halachaFiles'),
  readHalachaScheduleSync: (pack: 'kitzur' | 'ben_ish_chai' | 'rambam' | 'chafetz_chaim') =>
    require('@/testing/halacha').publishedHalachaSchedule(pack),
}));
jest.mock('@/services/HalachaContentService', () => ({
  ...jest.requireActual('@/services/HalachaContentService'),
  verifyHalachaInstall: jest.fn(() => true),
}));
// The published units of docs/halacha, read as the installed files would be.
jest.mock('@/services/SiddurService', () => {
  const fs = jest.requireActual('fs');
  const path = jest.requireActual('path');
  const { gunzipSync, strFromU8 } = jest.requireActual('fflate');
  const read = (dir: string, unit: string) => {
    const base = path.join(__dirname, '..', '..', '..', 'docs', 'halacha', dir);
    const manifest = JSON.parse(fs.readFileSync(path.join(base, 'manifest.json'), 'utf8'));
    return Promise.resolve(JSON.parse(strFromU8(gunzipSync(fs.readFileSync(path.join(base, manifest.gz[unit].path))))));
  };
  return {
    loadHalachaUnit: (track: string, unit: string) => read(track, unit),
    loadHalachaEnglish: (pack: string, unit: string) => read(pack.replace(/_en$/, '/en'), unit),
    loadChokParasha: jest.fn(),
    loadShnayimParasha: jest.fn(),
    loadSiddurText: jest.fn(),
  };
});

import { act, fireEvent, screen } from '@testing-library/react-native';
import { HDate } from '@hebcal/core';
import SiddurScreen from '../siddur/[id]';
import { formatDayLine } from '@/components/DayStepper';
import { formatDate } from '@/i18n';
import { CITIES } from '@/data/cities';
import { halachaReadingsOn } from '@/data/halachaContent';
import { IDLE_DOWNLOAD } from '@/stores/addonState';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { HALACHA_STORES, resetHalachaStores } from '@/stores/useHalachaStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useSiddurBookmarksStore } from '@/stores/useSiddurBookmarksStore';
import { useUserStore } from '@/stores/useUserStore';
import { installHalachaFixture } from '@/testing/halacha';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';

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

const day = (iso: string) => {
  const [year, month, date] = iso.split('-').map(Number);
  return new Date(year, month - 1, date);
};
const readingsOn = (id: string, iso: string) => halachaReadingsOn(id, day(iso), 'ashkenaz', true);
const labelOn = (id: string, iso: string) => readingsOn(id, iso)[0].portion.label.he;
const marked = (key: string, id = 'halacha_yomit') => Boolean(useCompletionsStore.getState().completions[key]?.[id]);
const closedFold = (name: string | RegExp) => screen.queryByRole('button', { name, expanded: false });
const dayName = (iso: string) => `${formatDate(day(iso), 'cccc', 'he')}, ${new HDate(day(iso)).renderGematriya(true)}`;

function reset({ id = 'halacha_yomit', installed = true, enabledSince = '' } = {}) {
  mockParams.id = id;
  mockParams.date = undefined;
  mockPush.mockReset();
  mockReplace.mockReset();
  resetHalachaStores();
  if (installed) installHalachaFixture('kitzur');
  useSiddurBookmarksStore.getState().reset();
  useUserStore.getState().reset();
  useUserStore.setState({ location: JERUSALEM, inIsrael: true, nusach: 'ashkenaz', language: 'he' });
  useCompletionsStore.getState().reset();
  useMitzvotStore.getState().reset();
  if (enabledSince) {
    useMitzvotStore.setState({
      activeMitzvot: {
        ...useMitzvotStore.getState().activeMitzvot,
        [id]: { enabled: true, enabledAt: at(JERUSALEM, enabledSince).getTime() },
      },
    });
  }
}

// Waits for a text of the drawn portion, or with make-up folds, which come first, for the first fold.
async function openAt(wallClock: string, waitFor: string | RegExp) {
  jest.useFakeTimers({ now: at(JERUSALEM, wallClock), doNotFake: [...ONLY_DATE] });
  renderWithTheme(<SiddurScreen />);
  if (typeof waitFor === 'string') await screen.findByText(waitFor);
  else await screen.findAllByRole('button', { name: waitFor, expanded: false });
  await act(async () => {});
}

describe('the daily halacha reader', () => {
  afterEach(() => jest.useRealTimers());

  it("reads the day's portion of the user's track under its label, with the book and the sources", async () => {
    reset();
    await openAt('2026-11-18T12:00', labelOn('halacha_yomit', '2026-11-18'));
    expect(screen.getByText('הלכה יומית')).toBeOnTheScreen();
    expect(screen.getByText('קיצור שולחן ערוך')).toBeOnTheScreen();
    const [reading] = readingsOn('halacha_yomit', '2026-11-18');
    expect(reading.portion.pieces.length).toBeGreaterThan(0);
    expect(screen.getByText(/^Torat Emet 357, via Sefaria · Public Domain$/)).toBeOnTheScreen();
    // The day row names the day shown.
    expect(screen.getByText(formatDayLine(day('2026-11-18'), 'he'))).toBeOnTheScreen();
  });

  it('offers no done while the mitzvah is off', async () => {
    reset();
    await openAt('2026-11-18T12:00', labelOn('halacha_yomit', '2026-11-18'));
    expect(screen.queryByText('סיימתי')).toBeNull();
    expect(closedFold(/^השלמה: /)).toBeNull();
  });

  it('folds each of the last seven unmarked days as a make-up, newest first, each with its own done', async () => {
    reset({ enabledSince: '2026-11-01T08:00' });
    useCompletionsStore.setState({ completions: { '2026-11-16': { halacha_yomit: 1 } } });
    await openAt('2026-11-18T12:00', /^השלמה: /);
    // The list draws its first sections at once: the folds, newest first, the marked day left out.
    const folds = screen.getAllByRole('button', { name: /^השלמה: /, expanded: false });
    const expected = ['2026-11-17', '2026-11-15', '2026-11-14', '2026-11-13', '2026-11-12', '2026-11-11']
      .filter((iso) => readingsOn('halacha_yomit', iso).length > 0)
      .map((iso) => `השלמה: ${dayName(iso)}`);
    expect(folds.length).toBeGreaterThanOrEqual(3);
    expected.slice(0, folds.length).forEach((name, n) => expect(folds[n]).toHaveAccessibleName(name));
    expect(closedFold(`השלמה: ${dayName('2026-11-16')}`)).toBeNull();
    // Yesterday's portion is closed until its fold opens.
    expect(screen.queryByText(labelOn('halacha_yomit', '2026-11-17'))).toBeNull();
    fireEvent.press(folds[0]);
    const done = `סיימתי את ${dayName('2026-11-17')}`;
    fireEvent.press(screen.getByText(done));
    fireEvent.press(screen.getByText('עשיתי אחרי שעבר הזמן'));
    expect(marked('2026-11-17')).toBe(true);
    expect(useCompletionsStore.getState().late['2026-11-17']?.halacha_yomit).toBeTruthy();
    expect(screen.queryByText(done)).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('folds no day before the mitzvah was switched on', async () => {
    reset({ enabledSince: '2026-11-17T08:00' });
    await openAt('2026-11-18T12:00', /^השלמה: /);
    expect(screen.getAllByRole('button', { name: /^השלמה: /, expanded: false })).toHaveLength(1);
  });

  it('browses another day from the day row, read only, and comes back to mark the day', async () => {
    reset({ enabledSince: '2026-11-17T08:00' });
    await openAt('2026-11-18T12:00', /^השלמה: /);
    fireEvent.press(screen.getByLabelText(formatDayLine(day('2026-11-19'), 'he')));
    await screen.findByText(labelOn('halacha_yomit', '2026-11-19'));
    await act(async () => {});
    expect(screen.queryByText('סיימתי')).toBeNull();
    expect(closedFold(/^השלמה: /)).toBeNull();
    expect(screen.getByText('זה לא יום הלימוד, ולכן אין כאן סימון של ״סיימתי״')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('חזרה ליום הלימוד'));
    expect(await screen.findByText('סיימתי')).toBeOnTheScreen();
    expect(closedFold(/^השלמה: /)).toBeOnTheScreen();
    fireEvent.press(screen.getByText('סיימתי'));
    expect(marked('2026-11-18')).toBe(true);
  });

  it('opens the day a notification names', async () => {
    reset();
    mockParams.date = '2026-11-20';
    await openAt('2026-11-18T12:00', labelOn('halacha_yomit', '2026-11-20'));
    expect(screen.queryByText(labelOn('halacha_yomit', '2026-11-18'))).toBeNull();
  });

  it('reads the English beside the Hebrew in English, when the English is installed', async () => {
    reset();
    const installed = installHalachaFixture('kitzur');
    HALACHA_STORES.kitzur_en.setState({ installed: { ...installed }, download: IDLE_DOWNLOAD });
    useUserStore.setState({ language: 'en' });
    await openAt('2026-11-18T12:00', readingsOn('halacha_yomit', '2026-11-18')[0].portion.label.en);
    expect(screen.queryByText('This book is available in the app in Hebrew only')).toBeNull();
    const [piece] = readingsOn('halacha_yomit', '2026-11-18')[0].portion.pieces;
    const { loadHalachaEnglish } = jest.requireMock('@/services/SiddurService');
    const english: string = (await loadHalachaEnglish('kitzur_en', piece.u)).en[piece.from];
    expect(screen.getByText(english)).toBeOnTheScreen();
  });

  it('says the book is in Hebrew only, in English, without its English', async () => {
    reset();
    useUserStore.setState({ language: 'en' });
    await openAt('2026-11-18T12:00', readingsOn('halacha_yomit', '2026-11-18')[0].portion.label.en);
    expect(screen.getByText('This book is available in the app in Hebrew only')).toBeOnTheScreen();
  });

  it('sends to the download while the track is missing', () => {
    reset({ installed: false });
    renderWithTheme(<SiddurScreen />);
    expect(screen.getByText('הטקסט של קיצור שולחן ערוך עוד לא הורד למכשיר.')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('למסך ההורדה'));
    expect(mockPush).toHaveBeenCalledWith('/mitzvah/halacha_yomit');
  });
});

describe('the lashon hara reader', () => {
  afterEach(() => jest.useRealTimers());

  it("reads the day's Chofetz Chaim under its label, whatever the track, with done while it is on", async () => {
    reset({ id: 'lashon_hara', enabledSince: '2026-11-18T08:00' });
    installHalachaFixture('chafetz_chaim');
    await openAt('2026-11-18T12:00', labelOn('lashon_hara', '2026-11-18'));
    expect(screen.getByText('הלכות לשון הרע')).toBeOnTheScreen();
    expect(screen.getByText('ספר חפץ חיים')).toBeOnTheScreen();
    expect(screen.getByText(/^Chofetz Chaim, via Sefaria/)).toBeOnTheScreen();
    fireEvent.press(screen.getByText('סיימתי'));
    expect(marked('2026-11-18', 'lashon_hara')).toBe(true);
  });

  it('reads its English beside the Hebrew in English, when the English is installed', async () => {
    reset({ id: 'lashon_hara' });
    const installed = installHalachaFixture('chafetz_chaim');
    HALACHA_STORES.chafetz_chaim_en.setState({ installed: { ...installed }, download: IDLE_DOWNLOAD });
    useUserStore.setState({ language: 'en' });
    await openAt('2026-11-18T12:00', readingsOn('lashon_hara', '2026-11-18')[0].portion.label.en);
    const [piece] = readingsOn('lashon_hara', '2026-11-18')[0].portion.pieces;
    const { loadHalachaEnglish } = jest.requireMock('@/services/SiddurService');
    const english: string = (await loadHalachaEnglish('chafetz_chaim_en', piece.u)).en[piece.from];
    expect(screen.getByText(english)).toBeOnTheScreen();
  });

  it('sends to its own download while the Chofetz Chaim is missing, the track installed or not', () => {
    reset({ id: 'lashon_hara' });
    renderWithTheme(<SiddurScreen />);
    expect(screen.getByText('הטקסט של ספר חפץ חיים עוד לא הורד למכשיר.')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('למסך ההורדה'));
    expect(mockPush).toHaveBeenCalledWith('/mitzvah/lashon_hara');
  });
});

describe('the festival halachot reader', () => {
  afterEach(() => jest.useRealTimers());

  it('reads each festival of an overlap day under its own heading, nearest first', async () => {
    reset({ id: 'hilchot_hachag' });
    let iso = '2026-11-10';
    while (readingsOn('hilchot_hachag', iso).length < 2) {
      const next = day(iso);
      next.setDate(next.getDate() + 1);
      iso = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
    }
    mockParams.date = iso;
    const [first, second] = readingsOn('hilchot_hachag', iso);
    await openAt('2026-11-18T12:00', first.portion.label.he);
    expect(screen.getByText(second.portion.label.he)).toBeOnTheScreen();
    const headings = screen.getAllByText(/^לקראת /).map((node) => node.props.children);
    expect(headings).toHaveLength(2);
  });

  it('opens the next period off season when no period is on, with no done', async () => {
    reset({ id: 'hilchot_hachag', enabledSince: '2026-11-01T08:00' });
    // 8 Kislev 5787 is before Chanukah's fourteen days, which open on 11 Kislev (2026-11-21).
    expect(readingsOn('hilchot_hachag', '2026-11-18')).toHaveLength(0);
    await openAt('2026-11-18T12:00', labelOn('hilchot_hachag', '2026-11-21'));
    expect(screen.getByText('הנוסח הזה לא נאמר עכשיו. מוצג הנוסח של הפעם הבאה שבה אומרים אותו')).toBeOnTheScreen();
    expect(screen.getByText('לקראת חנוכה')).toBeOnTheScreen();
    expect(screen.queryByText('סיימתי')).toBeNull();
  });
});
