const mockParams: { id: string; date?: string } = { id: 'shnayim_mikra' };
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockLoad = jest.fn();

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
jest.mock('@/services/ShnayimContentService', () => ({ verifyShnayimInstall: jest.fn(() => true) }));
jest.mock('@/services/SiddurService', () => ({
  loadShnayimParasha: (parasha: string) => mockLoad(parasha),
  loadChokParasha: jest.fn(),
  loadSiddurText: jest.fn(),
}));

import { act, fireEvent, screen, within } from '@testing-library/react-native';
import SiddurScreen from '../siddur/[id]';
import { CHOK_PARASHIYOT } from '@/data/chok';
import { CITIES } from '@/data/cities';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { IDLE_DOWNLOAD } from '@/stores/addonState';
import { useShnayimStore } from '@/stores/useShnayimStore';
import { useSiddurBookmarksStore } from '@/stores/useSiddurBookmarksStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';
import type { ShnayimAsset } from '@/types/shnayim';
import { shnayimAsChok } from '@/utils/shnayim';

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

// Each aliyah one verse, named by the parasha and the aliyah, with its targum.
const asset = (parasha: string): ShnayimAsset => ({
  parasha,
  credits: [{ title: 'מקור', license: 'Public Domain', url: 'http://example.org' }],
  aliyot: Array.from({ length: 7 }, (_, n) => [
    {
      he: [[{ t: '(א) ', s: 'n' }, { t: `פסוק ${parasha} ${n + 1}` }], [{ t: `תרגום ${parasha} ${n + 1}`, s: 't' }]],
    },
    { he: [[{ t: `רש״י ${parasha} ${n + 1}` }]], optional: { he: 'רש״י', en: 'Rashi' } },
  ]),
});

const marked = (key: string) => Boolean(useCompletionsStore.getState().completions[key]?.shnayim_mikra);

function reset({ installed = true, enabled = false } = {}) {
  mockParams.date = undefined;
  mockPush.mockReset();
  mockReplace.mockReset();
  mockLoad.mockReset();
  mockLoad.mockImplementation((parasha: string) => Promise.resolve(shnayimAsChok(asset(parasha))));
  useShnayimStore.setState({
    installed: installed
      ? {
          version: 1,
          bytes: 600_000,
          installedAt: 0,
          files: Object.fromEntries(CHOK_PARASHIYOT.map((parasha, n) => [parasha, `p-${n}.json.gz`])),
        }
      : null,
    download: IDLE_DOWNLOAD,
  });
  useSiddurBookmarksStore.getState().reset();
  useUserStore.getState().reset();
  useUserStore.setState({ location: JERUSALEM, inIsrael: true, nusach: 'ashkenaz', language: 'he' });
  useCompletionsStore.getState().reset();
  useMitzvotStore.getState().reset();
  if (enabled) {
    useMitzvotStore.setState({
      activeMitzvot: {
        ...useMitzvotStore.getState().activeMitzvot,
        shnayim_mikra: { enabled: true, enabledAt: at(JERUSALEM, '2026-11-16T08:00').getTime() },
      },
    });
  }
}

async function openAt(wallClock: string) {
  jest.useFakeTimers({ now: at(JERUSALEM, wallClock), doNotFake: [...ONLY_DATE] });
  renderWithTheme(<SiddurScreen />);
  await screen.findAllByText(/^פסוק /);
  await act(async () => {});
}

describe('the Shnayim Mikra reader', () => {
  afterEach(() => jest.useRealTimers());

  it("reads the day's aliyah of the week's parasha, each verse twice and then its targum", async () => {
    reset();
    await openAt('2026-11-18T12:00');
    expect(mockLoad).toHaveBeenCalledWith('Vayetzei');
    expect(screen.getByText('שניים מקרא ואחד תרגום')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'יום רביעי' })).toBeSelected();
    expect(screen.getAllByText('פסוק Vayetzei 4')).toHaveLength(2);
    expect(screen.getByText('תרגום Vayetzei 4')).toBeOnTheScreen();
    expect(screen.queryByText('פסוק Vayetzei 3')).toBeNull();
    // Six days, no ליל שישי, and no licence notice of Chok LeYisrael.
    expect(within(screen.getByLabelText('יום הלימוד')).getAllByRole('radio')).toHaveLength(6);
    expect(screen.queryByRole('radio', { name: 'ליל שישי' })).toBeNull();
    expect(screen.queryByText(/תורת אמת/)).toBeNull();
  });

  it('folds Rashi by the commentary choice it shares with Chok LeYisrael', async () => {
    reset();
    await openAt('2026-11-18T12:00');
    expect(screen.queryByText('רש״י Vayetzei 4')).toBeNull();
    expect(screen.getByLabelText('פירושים')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'בלי פירושים' })).toBeSelected();
    fireEvent.press(screen.getByRole('radio', { name: 'עם פירושים' }));
    expect(screen.getByText('רש״י Vayetzei 4')).toBeOnTheScreen();
    expect(useUserStore.getState().chokCommentaryOpen).toBe(true);
    // Each verse is still read twice; Rashi once.
    expect(screen.getAllByText('פסוק Vayetzei 4')).toHaveLength(2);
  });

  it('offers the commentary choice over the published asset, its Rashi folded', async () => {
    reset();
    const fs = jest.requireActual('fs');
    const path = jest.requireActual('path');
    const { gunzipSync, strFromU8 } = jest.requireActual('fflate');
    const dir = path.join(__dirname, '..', '..', '..', 'docs', 'shnayim');
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
    mockLoad.mockImplementation((parasha: string) =>
      Promise.resolve(
        shnayimAsChok(JSON.parse(strFromU8(gunzipSync(fs.readFileSync(path.join(dir, manifest.gz[parasha].path)))))),
      ),
    );
    jest.useFakeTimers({ now: at(JERUSALEM, '2026-11-18T12:00'), doNotFake: [...ONLY_DATE] });
    renderWithTheme(<SiddurScreen />);
    await screen.findAllByText(/^רביעי$/);
    await act(async () => {});
    expect(screen.getByLabelText('פירושים')).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: 'רש״י', expanded: false }).length).toBeGreaterThan(0);
  });

  it('keeps Thursday through Thursday night, and reads the sixth and seventh aliyot on Friday', async () => {
    reset();
    await openAt('2026-11-19T22:30');
    expect(screen.getByRole('radio', { name: 'יום חמישי' })).toBeSelected();
    expect(screen.getAllByText('פסוק Vayetzei 5')).toHaveLength(2);
    fireEvent.press(screen.getByRole('radio', { name: 'יום שישי' }));
    await screen.findAllByText('פסוק Vayetzei 7');
    expect(screen.getAllByText('פסוק Vayetzei 6')).toHaveLength(2);
  });

  it('reads both parashiyot of a double week and offers no choice between them', async () => {
    reset();
    await openAt('2028-03-22T12:00');
    expect(screen.getAllByText('פסוק Vayakhel 4')).toHaveLength(2);
    expect(screen.getAllByText('פסוק Pekudei 4')).toHaveLength(2);
    expect(screen.queryByRole('radiogroup', { name: 'פרשות מחוברות' })).toBeNull();
    expect(screen.queryByText('השבוע שתי פרשיות')).toBeNull();
  });

  it('marks the day done and offers the missed days of the week as make-ups, while the mitzvah is on', async () => {
    reset({ enabled: true });
    useCompletionsStore.setState({ completions: { '2026-11-17': { shnayim_mikra: 1 } } });
    await openAt('2026-11-18T12:00');
    expect(screen.getByRole('button', { name: 'השלמה: יום שני', expanded: false })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'השלמה: יום שלישי', expanded: false })).toBeNull();
    fireEvent.press(screen.getByText('סיימתי'));
    expect(marked('2026-11-18')).toBe(true);
  });

  it('offers no done while the mitzvah is off', async () => {
    reset();
    await openAt('2026-11-18T12:00');
    expect(screen.queryByText('סיימתי')).toBeNull();
  });

  it('sends to the download while the add-on is missing', () => {
    reset({ installed: false });
    renderWithTheme(<SiddurScreen />);
    expect(screen.getByText('הטקסט של שניים מקרא ואחד תרגום עוד לא הורד למכשיר.')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('למסך ההורדה'));
    expect(mockPush).toHaveBeenCalledWith('/mitzvah/shnayim_mikra');
  });
});
