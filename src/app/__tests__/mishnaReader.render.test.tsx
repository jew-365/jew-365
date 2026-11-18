const mockParams: { id: string; date?: string } = { id: 'mishna_yomit' };
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
jest.mock('@/services/MishnaContentService', () => ({
  ...jest.requireActual('@/services/MishnaContentService'),
  verifyMishnaInstall: jest.fn(() => true),
}));
// The published tractates of docs/mishna, read as the installed files would be.
jest.mock('@/services/SiddurService', () => {
  const fs = jest.requireActual('fs');
  const path = jest.requireActual('path');
  const { gunzipSync, strFromU8 } = jest.requireActual('fflate');
  const { mishnaUnit } = jest.requireActual('@/utils/mishna');
  const base = path.join(__dirname, '..', '..', '..', 'docs', 'mishna');
  const manifest = JSON.parse(fs.readFileSync(path.join(base, 'manifest.json'), 'utf8'));
  return {
    loadMishnaTractate: (k: string) =>
      Promise.resolve(
        mishnaUnit(JSON.parse(strFromU8(gunzipSync(fs.readFileSync(path.join(base, manifest.gz[k].path)))))),
      ),
    loadHalachaUnit: jest.fn(),
    loadHalachaEnglish: jest.fn(),
    loadChokParasha: jest.fn(),
    loadShnayimParasha: jest.fn(),
    loadSiddurText: jest.fn(),
  };
});

import { act, fireEvent, screen } from '@testing-library/react-native';
import { HDate } from '@hebcal/core';
import SiddurScreen from '../siddur/[id]';
import { formatDate } from '@/i18n';
import { CITIES } from '@/data/cities';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useMishnaStore } from '@/stores/useMishnaStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useSiddurBookmarksStore } from '@/stores/useSiddurBookmarksStore';
import { useUserStore } from '@/stores/useUserStore';
import { installMishnaFixture } from '@/testing/mishna';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';
import { MishnaRef, mishnaKey, mishnaYomitOn, twoMishnayotAfter } from '@/utils/mishna';

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
const yomit = (iso: string) => mishnaYomitOn(day(iso)).label.he;
// A mishnah's segment as the published tractate holds it.
async function segmentOf(ref: MishnaRef) {
  const { loadMishnaTractate } = jest.requireMock('@/services/SiddurService');
  const unit = await loadMishnaTractate(ref.k);
  return unit.sections
    .flatMap((section: { segments: { key?: string; he: { t: string }[][]; en?: string }[] }) => section.segments)
    .find((segment: { key?: string }) => segment.key === mishnaKey(ref));
}
const marked = (key: string, id: string) => Boolean(useCompletionsStore.getState().completions[key]?.[id]);
const dayName = (iso: string) => `${formatDate(day(iso), 'cccc', 'he')}, ${new HDate(day(iso)).renderGematriya(true)}`;

function reset({ id = 'mishna_yomit', installed = true, enabledSince = '' } = {}) {
  mockParams.id = id;
  mockParams.date = undefined;
  mockPush.mockReset();
  mockReplace.mockReset();
  useMishnaStore.getState().reset();
  if (installed) installMishnaFixture();
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

async function openAt(wallClock: string, waitFor: string | RegExp) {
  jest.useFakeTimers({ now: at(JERUSALEM, wallClock), doNotFake: [...ONLY_DATE] });
  renderWithTheme(<SiddurScreen />);
  if (typeof waitFor === 'string') await screen.findAllByText(waitFor);
  else await screen.findAllByRole('button', { name: waitFor, expanded: false });
  await act(async () => {});
}

describe('the Mishna Yomit reader', () => {
  afterEach(() => jest.useRealTimers());

  it("reads the day's two mishnayot under their label, Bartenura folded, with the sources", async () => {
    reset();
    await openAt('2026-11-18T19:00', yomit('2026-11-18'));
    expect(screen.getByText('משנה יומית')).toBeOnTheScreen();
    expect(screen.getByText('נגעים, פרק א')).toBeOnTheScreen();
    // Bartenura is closed by default, under the shared commentary control.
    expect(screen.getAllByRole('button', { name: /ברטנורא/, expanded: false }).length).toBeGreaterThan(0);
    expect(screen.getByText('בלי פירושים')).toBeOnTheScreen();
    expect(screen.getByText(/תורת אמת 357/)).toBeOnTheScreen();
    expect(screen.getByText(/Mishnah Yomit by Dr. Joshua Kulp/)).toBeOnTheScreen();
    // Off, the mitzvah offers no done.
    expect(screen.queryByText('סיימתי')).toBeNull();
  });

  it('marks the day, and folds the unmarked days of the week before it, Shabbat included', async () => {
    reset({ enabledSince: '2026-11-19T08:00' });
    await openAt('2026-11-22T19:00', /^השלמה: /);
    const folds = screen.getAllByRole('button', { name: /^השלמה: /, expanded: false });
    expect(folds).toHaveLength(3);
    expect(folds[0]).toHaveAccessibleName(`השלמה: ${dayName('2026-11-21')}`);
    fireEvent.press(folds[0]);
    const [first] = mishnaYomitOn(day('2026-11-21')).refs;
    expect(screen.getByText((await segmentOf(first)).he[0][1].t)).toBeOnTheScreen();
    // Shabbat had no window, so its make-up is marked at once, with no question of time.
    fireEvent.press(screen.getByText(`סיימתי את ${dayName('2026-11-21')}`));
    expect(screen.queryByText('עשיתי אחרי שעבר הזמן')).toBeNull();
    expect(marked('2026-11-21', 'mishna_yomit')).toBe(true);
    // Thursday had one, so it asks.
    fireEvent.press(screen.getAllByRole('button', { name: `השלמה: ${dayName('2026-11-19')}`, expanded: false })[0]);
    fireEvent.press(screen.getByText(`סיימתי את ${dayName('2026-11-19')}`));
    fireEvent.press(screen.getByText('עשיתי אחרי שעבר הזמן'));
    expect(useCompletionsStore.getState().late['2026-11-19']?.mishna_yomit).toBeTruthy();
    fireEvent.press(screen.getByText('סיימתי'));
    expect(marked('2026-11-22', 'mishna_yomit')).toBe(true);
  });

  it('reads Kulp’s English under each mishnah in English', async () => {
    reset();
    useUserStore.setState({ language: 'en' });
    await openAt('2026-11-18T19:00', mishnaYomitOn(day('2026-11-18')).label.en);
    const [first] = mishnaYomitOn(day('2026-11-18')).refs;
    const english = (await segmentOf(first)).en;
    expect(english).toBeTruthy();
    expect(screen.getByText(english)).toBeOnTheScreen();
    expect(screen.queryByText('This book is available in the app in Hebrew only')).toBeNull();
  });

  it('sends to the download while the Mishnah is missing', () => {
    reset({ installed: false });
    renderWithTheme(<SiddurScreen />);
    expect(screen.getByText('המשנה עוד לא הורדה למכשיר.')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('למסך ההורדה'));
    expect(mockPush).toHaveBeenCalledWith('/mitzvah/mishna_yomit');
  });
});

describe('the two mishnayot reader', () => {
  afterEach(() => jest.useRealTimers());

  it('continues from the days marked before, with no day row and no make-ups', async () => {
    reset({ id: 'two_mishnayot', enabledSince: '2026-11-01T08:00' });
    useCompletionsStore.setState({
      completions: { '2026-11-16': { two_mishnayot: 1 }, '2026-11-17': { two_mishnayot: 1 } },
    });
    await openAt('2026-11-18T07:00', twoMishnayotAfter(2).label.he);
    expect(screen.getByText('ברכות, פרק ב')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^השלמה: / })).toBeNull();
    fireEvent.press(screen.getByText('סיימתי'));
    expect(marked('2026-11-18', 'two_mishnayot')).toBe(true);
  });
});
