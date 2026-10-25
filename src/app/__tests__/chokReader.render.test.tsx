const mockParams: { id: string; date?: string; slot?: string } = { id: 'chok_leyisrael' };
const mockReplace = jest.fn();
const mockPush = jest.fn();
const loadAsset = (parasha: string) => Promise.resolve(mockAsset(parasha));
const mockLoad = jest.fn(loadAsset);

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
jest.mock('@/services/ChokContentService', () => ({ verifyChokInstall: jest.fn(() => true) }));
jest.mock('@/services/SiddurService', () => ({
  loadChokParasha: (parasha: string) => mockLoad(parasha),
  loadSiddurText: jest.fn(),
}));

import { act, fireEvent, screen } from '@testing-library/react-native';
import SiddurScreen from '../siddur/[id]';
import { CITIES } from '@/data/cities';
import { verifyChokInstall } from '@/services/ChokContentService';
import { buildPlan } from '@/services/notifications/plan';
import { readPlanInput } from '@/services/notifications/snapshot';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useChokStore } from '@/stores/useChokStore';
import { useUserStore } from '@/stores/useUserStore';
import { installChokFixture } from '@/testing/chok';
import { renderWithTheme } from '@/testing/render';
import { at, zmanimFor } from '@/testing/zmanim';
import type { ChokAsset, ChokSection, ChokSlot } from '@/types/chok';

const JERUSALEM = CITIES[0];
const SLOTS: ChokSlot[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'thuNight', 'fri'];
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

function mockAsset(parasha: string): ChokAsset {
  return {
    parasha,
    credit: { title: 'מקור', license: 'רשות', url: 'http://example.org' },
    dedication: null,
    slots: Object.fromEntries(
      SLOTS.map((slot) => [
        slot,
        [
          {
            kind: 'torah',
            heading: 'תורה',
            segments: [
              { he: [[{ t: `פסוק ${slot}` }]] },
              { he: [[{ t: `פירוש ${slot}` }]], optional: { he: 'רש״י', en: 'Rashi' } },
            ],
          },
        ],
      ]),
    ),
  };
}

const RASHI = { he: 'רש״י', en: 'Rashi' };
const BARTENURA = { he: 'ברטנורה', en: 'Bartenura' };
const ZOHAR_TRANSLATION = { he: 'תרגום הזוהר', en: 'Zohar translation' };
const verse = (slot: ChokSlot): ChokSection => ({
  kind: 'torah',
  heading: 'תורה',
  segments: [{ he: [[{ t: `פסוק ${slot}` }]] }, { he: [[{ t: `פירוש רש״י ${slot}` }]], optional: RASHI }],
});
const mishnah = (slot: ChokSlot): ChokSection => ({
  kind: 'mishnah',
  heading: 'משנה',
  segments: [{ he: [[{ t: `משנה ${slot}` }]] }, { he: [[{ t: `פירוש ברטנורה ${slot}` }]], optional: BARTENURA }],
});
const zohar = (slot: ChokSlot): ChokSection => ({
  kind: 'zohar',
  heading: 'זוהר',
  segments: [{ he: [[{ t: `זוהר ${slot}` }]] }, { he: [[{ t: `תרגום ${slot}` }]], optional: ZOHAR_TRANSLATION }],
});
const commentaryAsset = (parasha: string): ChokAsset => ({
  ...mockAsset(parasha),
  slots: Object.fromEntries(SLOTS.map((slot) => [slot, [verse(slot), mishnah(slot), zohar(slot)]])),
});
const zoharOnlyAsset = (parasha: string): ChokAsset => ({
  ...mockAsset(parasha),
  slots: Object.fromEntries(
    SLOTS.map((slot) => [
      slot,
      [{ kind: 'torah', heading: 'תורה', segments: [{ he: [[{ t: `פסוק ${slot}` }]] }] }, zohar(slot)],
    ]),
  ),
});

const marked = (key: string) => Boolean(useCompletionsStore.getState().completions[key]?.chok_leyisrael);
const closedFold = (name: string | RegExp) => screen.queryByRole('button', { name, expanded: false });
const openFold = (name: string) => screen.queryByRole('button', { name, expanded: true });

function reset(enabled: boolean) {
  mockParams.date = undefined;
  mockParams.slot = undefined;
  mockReplace.mockReset();
  mockPush.mockReset();
  installChokFixture();
  useUserStore.getState().reset();
  useUserStore.setState({ location: JERUSALEM, inIsrael: true, nusach: 'ashkenaz', language: 'he' });
  useCompletionsStore.getState().reset();
  useMitzvotStore.getState().reset();
  if (!enabled) return;
  useMitzvotStore.setState({
    activeMitzvot: {
      ...useMitzvotStore.getState().activeMitzvot,
      chok_leyisrael: { enabled: true, enabledAt: at(JERUSALEM, '2026-11-16T08:00').getTime() },
    },
  });
}

async function openAt(wallClock: string) {
  jest.useFakeTimers({ now: at(JERUSALEM, wallClock), doNotFake: [...ONLY_DATE] });
  renderWithTheme(<SiddurScreen />);
  await screen.findByText(/^פסוק /);
}

describe('the Chok LeYisrael reader with the mitzvah switched on', () => {
  beforeEach(() => reset(true));
  afterEach(() => jest.useRealTimers());

  it('puts a closed fold before the portion for each missed day since the switch-on', async () => {
    useCompletionsStore.setState({ completions: { '2026-11-17': { chok_leyisrael: 1 } } });
    await openAt('2026-11-18T12:00');
    expect(screen.getByText('פסוק wed')).toBeOnTheScreen();
    expect(closedFold('השלמה: יום שני')).toBeOnTheScreen();
    expect(closedFold('השלמה: יום ראשון')).toBeNull();
    expect(closedFold('השלמה: יום שלישי')).toBeNull();
    expect(screen.queryByText('פסוק mon')).toBeNull();
    expect(screen.queryByText('סיימתי את יום שני')).toBeNull();
  });

  it('opens a make-up with its commentary closed, and its done marks that day and drops the fold', async () => {
    await openAt('2026-11-18T12:00');
    fireEvent.press(closedFold('השלמה: יום שני')!);
    expect(screen.getByText('פסוק mon')).toBeOnTheScreen();
    expect(screen.queryByText('פירוש mon')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'רש״י', expanded: false })).toHaveLength(2);
    fireEvent.press(screen.getByText('סיימתי את יום שני'));
    expect(marked('2026-11-16')).toBe(true);
    expect(screen.queryByText('פסוק mon')).toBeNull();
    expect(screen.queryByText('סיימתי את יום שני')).toBeNull();
    expect(closedFold('השלמה: יום שלישי')).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('opens the commentary inside a make-up fold when the setting is on, and keeps the fold itself closed', async () => {
    useUserStore.setState({ chokCommentaryOpen: true });
    await openAt('2026-11-18T12:00');
    expect(closedFold('השלמה: יום שני')).toBeOnTheScreen();
    expect(screen.getByText('פירוש wed')).toBeOnTheScreen();
    fireEvent.press(closedFold('השלמה: יום שני')!);
    expect(screen.getByText('פירוש mon')).toBeOnTheScreen();
  });

  it('marks today from its done button and lands on home', async () => {
    await openAt('2026-11-18T12:00');
    fireEvent.press(screen.getByText('סיימתי'));
    expect(marked('2026-11-18')).toBe(true);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/home');
  });

  it.each(['2026-11-18T21:00', '2026-11-19T02:00'])(
    "marks today's portion after shkia under its day, at %s",
    async (wallClock) => {
      expect(at(JERUSALEM, wallClock).getTime()).toBeGreaterThan(
        zmanimFor(at(JERUSALEM, '2026-11-18T12:00'), JERUSALEM).shkia.getTime(),
      );
      await openAt(wallClock);
      expect(screen.getByText('פסוק wed')).toBeOnTheScreen();
      fireEvent.press(screen.getByText('סיימתי'));
      expect(marked('2026-11-18')).toBe(true);
      expect(marked('2026-11-19')).toBe(false);
    },
  );

  it('credits the Torat Emet database under its license once a portion has loaded', async () => {
    await openAt('2026-11-18T12:00');
    expect(
      screen.getByText(
        "זכויות היוצרים שמורות לר' פנחס ראובן שליט״א, ר' שגיב מחפוד שליט״א ומרכז J. Alan Groves. הטקסט מתוך מאגר תורת אמת, תחת רישיון CC BY-NC-SA 2.5",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('העיבוד של יהודי 365 מפורסם תחת אותו רישיון.')).toBeOnTheScreen();
    expect(screen.getByText('לנוסח הרישיון')).toBeOnTheScreen();
    expect(screen.queryByText('© תורת אמת · CC BY-NC-SA 2.5')).toBeNull();
  });

  it('shows a day already marked as done', async () => {
    useCompletionsStore.setState({ completions: { '2026-11-18': { chok_leyisrael: 1 } } });
    await openAt('2026-11-18T12:00');
    expect(screen.getByText('סומן כבוצע')).toBeOnTheScreen();
    expect(screen.queryByText('סיימתי')).toBeNull();
  });

  it('marks an earlier day of the week opened by date, with no make-up folds', async () => {
    mockParams.date = '2026-11-16';
    await openAt('2026-11-18T12:00');
    expect(screen.getByText('פסוק mon')).toBeOnTheScreen();
    expect(closedFold(/^השלמה/)).toBeNull();
    fireEvent.press(screen.getByText('סיימתי'));
    expect(marked('2026-11-16')).toBe(true);
  });

  describe('on Thursday night', () => {
    const THU_NIGHT = '2026-11-19T21:00';
    const ASK = 'לאיזה יום לרשום את ליל שישי?';
    const fridayPlanned = () =>
      buildPlan(readPlanInput(new Date())).some((candidate) => candidate.id.startsWith('chok_leyisrael__2026-11-20__'));
    const choice = (name: string) => screen.getByRole('button', { name });

    it('offers the done action and the make-ups', async () => {
      await openAt(THU_NIGHT);
      expect(screen.getByText('פסוק thuNight')).toBeOnTheScreen();
      expect(screen.getByText('סיימתי')).toBeOnTheScreen();
      expect(closedFold('השלמה: יום רביעי')).toBeOnTheScreen();
    });

    it('asks which day it counts for on the first done, then files under Thursday and lands on home', async () => {
      await openAt(THU_NIGHT);
      fireEvent.press(screen.getByText('סיימתי'));
      expect(screen.getByText(ASK)).toBeOnTheScreen();
      expect(marked('2026-11-19')).toBe(false);
      expect(marked('2026-11-20')).toBe(false);
      expect(mockReplace).not.toHaveBeenCalled();
      fireEvent.press(choice('יום חמישי'));
      expect(useUserStore.getState().chokThuNightDay).toBe('thu');
      expect(marked('2026-11-19')).toBe(true);
      expect(marked('2026-11-20')).toBe(false);
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/home');
    });

    it("files under Friday when asked for Friday, and Friday's reminders drop", async () => {
      await openAt(THU_NIGHT);
      expect(fridayPlanned()).toBe(true);
      fireEvent.press(screen.getByText('סיימתי'));
      fireEvent.press(choice('יום שישי'));
      expect(useUserStore.getState().chokThuNightDay).toBe('fri');
      expect(marked('2026-11-20')).toBe(true);
      expect(marked('2026-11-19')).toBe(false);
      expect(fridayPlanned()).toBe(false);
    });

    it('does not ask again once answered', async () => {
      await openAt(THU_NIGHT);
      fireEvent.press(screen.getByText('סיימתי'));
      fireEvent.press(choice('יום חמישי'));
      act(() => useCompletionsStore.getState().reset());
      mockReplace.mockReset();
      fireEvent.press(screen.getByText('סיימתי'));
      expect(screen.queryByText(ASK)).toBeNull();
      expect(marked('2026-11-19')).toBe(true);
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/home');
    });

    it.each([
      ['thu', '2026-11-19', '2026-11-20'],
      ['fri', '2026-11-20', '2026-11-19'],
    ] as const)('files straight under the saved day, %s', async (saved, filed, other) => {
      useUserStore.getState().setChokThuNightDay(saved);
      await openAt(THU_NIGHT);
      fireEvent.press(screen.getByText('סיימתי'));
      expect(screen.queryByText(ASK)).toBeNull();
      expect(marked(filed)).toBe(true);
      expect(marked(other)).toBe(false);
    });

    it('marks nothing and saves nothing when the question is closed', async () => {
      await openAt(THU_NIGHT);
      fireEvent.press(screen.getByText('סיימתי'));
      fireEvent.press(choice('סגור'));
      expect(screen.queryByText(ASK)).toBeNull();
      expect(useUserStore.getState().chokThuNightDay).toBeNull();
      expect(marked('2026-11-19')).toBe(false);
      expect(marked('2026-11-20')).toBe(false);
      expect(screen.getByText('סיימתי')).toBeOnTheScreen();
    });

    it('leaves the Thursday daytime slot on Thursday whatever day is saved', async () => {
      useUserStore.getState().setChokThuNightDay('fri');
      mockParams.slot = 'thu';
      await openAt(THU_NIGHT);
      expect(screen.getByText('פסוק thu')).toBeOnTheScreen();
      fireEvent.press(screen.getByText('סיימתי'));
      expect(marked('2026-11-19')).toBe(true);
      expect(marked('2026-11-20')).toBe(false);
    });

    it('shows ליל שישי as done when its saved day is already marked', async () => {
      useUserStore.getState().setChokThuNightDay('fri');
      useCompletionsStore.setState({ completions: { '2026-11-20': { chok_leyisrael: 1 } } });
      await openAt(THU_NIGHT);
      expect(screen.getByText('סומן כבוצע')).toBeOnTheScreen();
      expect(screen.queryByText('סיימתי')).toBeNull();
    });
  });

  it('has no done action for a later day of the week', async () => {
    mockParams.date = '2026-11-20';
    await openAt('2026-11-18T12:00');
    expect(screen.getByText('פסוק fri')).toBeOnTheScreen();
    expect(screen.queryByText('סיימתי')).toBeNull();
  });

  it('names the folds and their done in English', async () => {
    useUserStore.setState({ language: 'en' });
    await openAt('2026-11-18T12:00');
    fireEvent.press(closedFold('Make-up: Monday')!);
    expect(screen.getByText('Done with Monday')).toBeOnTheScreen();
    expect(screen.getByText('Done')).toBeOnTheScreen();
  });
});

describe('the Chok LeYisrael reader with the mitzvah switched off', () => {
  beforeEach(() => reset(false));
  afterEach(() => jest.useRealTimers());

  it('shows the portion with no done action and no make-up folds', async () => {
    await openAt('2026-11-18T12:00');
    expect(screen.getByText('פסוק wed')).toBeOnTheScreen();
    expect(screen.queryByText('סיימתי')).toBeNull();
    expect(closedFold(/^השלמה/)).toBeNull();
  });
});

describe('the Chok LeYisrael commentary setting', () => {
  beforeEach(() => {
    reset(false);
    mockLoad.mockImplementation((parasha) => Promise.resolve(commentaryAsset(parasha)));
  });
  afterEach(() => {
    jest.useRealTimers();
    mockLoad.mockImplementation(loadAsset);
  });

  it('folds Rashi, Bartenura and the Zohar translation by default under "מקופלים"', async () => {
    await openAt('2026-11-18T12:00');
    expect(screen.getByLabelText('פירושים')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'מקופלים' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'פתוחים' })).not.toBeSelected();
    expect(closedFold('רש״י')).toBeOnTheScreen();
    expect(closedFold('ברטנורה')).toBeOnTheScreen();
    expect(closedFold('תרגום הזוהר')).toBeOnTheScreen();
    expect(screen.queryByText('פירוש רש״י wed')).toBeNull();
    expect(screen.queryByText('פירוש ברטנורה wed')).toBeNull();
    expect(screen.queryByText('תרגום wed')).toBeNull();
    expect(screen.queryByRole('radio', { name: 'במניין' })).toBeNull();
  });

  it('"פתוחים" opens every Rashi and Bartenura passage, saves the choice and leaves the Zohar translation folded', async () => {
    await openAt('2026-11-18T12:00');
    fireEvent.press(screen.getByRole('radio', { name: 'פתוחים' }));
    expect(useUserStore.getState().chokCommentaryOpen).toBe(true);
    expect(screen.getByRole('radio', { name: 'פתוחים' })).toBeSelected();
    expect(screen.getByText('פירוש רש״י wed')).toBeOnTheScreen();
    expect(screen.getByText('פירוש ברטנורה wed')).toBeOnTheScreen();
    expect(openFold('רש״י')).toBeOnTheScreen();
    expect(openFold('ברטנורה')).toBeOnTheScreen();
    expect(closedFold('תרגום הזוהר')).toBeOnTheScreen();
    expect(screen.queryByText('תרגום wed')).toBeNull();
  });

  it('closes only the tapped passage when one commentary is tapped', async () => {
    await openAt('2026-11-18T12:00');
    fireEvent.press(screen.getByRole('radio', { name: 'פתוחים' }));
    fireEvent.press(openFold('רש״י')!);
    expect(screen.queryByText('פירוש רש״י wed')).toBeNull();
    expect(closedFold('רש״י')).toBeOnTheScreen();
    expect(screen.getByText('פירוש ברטנורה wed')).toBeOnTheScreen();
  });

  it('clears the passages tapped against the setting when the setting changes', async () => {
    await openAt('2026-11-18T12:00');
    fireEvent.press(closedFold('ברטנורה')!);
    fireEvent.press(screen.getByRole('radio', { name: 'פתוחים' }));
    expect(screen.getByText('פירוש רש״י wed')).toBeOnTheScreen();
    expect(screen.getByText('פירוש ברטנורה wed')).toBeOnTheScreen();
    fireEvent.press(openFold('רש״י')!);
    fireEvent.press(screen.getByRole('radio', { name: 'מקופלים' }));
    expect(screen.queryByText('פירוש רש״י wed')).toBeNull();
    expect(screen.queryByText('פירוש ברטנורה wed')).toBeNull();
    expect(useUserStore.getState().chokCommentaryOpen).toBe(false);
    expect(closedFold('רש״י')).toBeOnTheScreen();
    expect(closedFold('ברטנורה')).toBeOnTheScreen();
  });

  it('keeps a Zohar translation opened by tap across a change of the setting', async () => {
    await openAt('2026-11-18T12:00');
    fireEvent.press(closedFold('תרגום הזוהר')!);
    expect(screen.getByText('תרגום wed')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('radio', { name: 'פתוחים' }));
    expect(screen.getByText('תרגום wed')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('radio', { name: 'מקופלים' }));
    expect(screen.getByText('תרגום wed')).toBeOnTheScreen();
  });

  it('opens with the commentaries open when Settings turned them on, and writes the toolbar choice back', async () => {
    useUserStore.setState({ chokCommentaryOpen: true });
    await openAt('2026-11-18T12:00');
    expect(screen.getByRole('radio', { name: 'פתוחים' })).toBeSelected();
    expect(screen.getByText('פירוש רש״י wed')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('radio', { name: 'מקופלים' }));
    expect(useUserStore.getState().chokCommentaryOpen).toBe(false);
    expect(screen.queryByText('פירוש רש״י wed')).toBeNull();
  });

  it('orders the controls: commentaries, A+, A−, speed, play', async () => {
    await openAt('2026-11-18T12:00');
    const all = screen.getAllByRole(/^(radio|button|switch)$/);
    const indexes = [
      screen.getByRole('radio', { name: 'מקופלים' }),
      screen.getByRole('radio', { name: 'פתוחים' }),
      screen.getByRole('button', { name: 'הגדל טקסט' }),
      screen.getByRole('button', { name: 'הקטן טקסט' }),
      screen.getByRole('button', { name: 'האט גלילה' }),
      screen.getByRole('button', { name: 'האץ גלילה' }),
      screen.getByRole('switch', { name: 'גלילה אוטומטית' }),
    ].map((control) => all.indexOf(control));
    expect(indexes.every((index) => index >= 0)).toBe(true);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
    expect(new Set(indexes).size).toBe(indexes.length);
  });

  it('names the commentary control in English', async () => {
    useUserStore.setState({ language: 'en' });
    await openAt('2026-11-18T12:00');
    expect(screen.getByLabelText('Commentaries')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Folded' })).toBeSelected();
    fireEvent.press(screen.getByRole('radio', { name: 'Open' }));
    expect(useUserStore.getState().chokCommentaryOpen).toBe(true);
    expect(openFold('Rashi')).toBeOnTheScreen();
  });

  it('shows no commentary control for a portion with neither Rashi nor Bartenura', async () => {
    mockLoad.mockImplementation((parasha) => Promise.resolve(zoharOnlyAsset(parasha)));
    await openAt('2026-11-18T12:00');
    expect(screen.queryByLabelText('פירושים')).toBeNull();
    expect(screen.queryByRole('radio', { name: 'מקופלים' })).toBeNull();
    expect(closedFold('תרגום הזוהר')).toBeOnTheScreen();
  });
});

describe('the Chok LeYisrael reader without the add-on', () => {
  beforeEach(() => {
    reset(true);
    useChokStore.getState().reset();
  });
  afterEach(() => jest.useRealTimers());

  it('says the text is not on the device and leads to the download', () => {
    jest.useFakeTimers({ now: at(JERUSALEM, '2026-11-18T12:00'), doNotFake: [...ONLY_DATE] });
    renderWithTheme(<SiddurScreen />);
    expect(screen.getByText('הטקסט של חק לישראל עוד לא הורד למכשיר.')).toBeOnTheScreen();
    expect(screen.queryByText(/^פסוק /)).toBeNull();
    fireEvent.press(screen.getByText('למסך ההורדה'));
    expect(mockPush).toHaveBeenCalledWith('/mitzvah/chok_leyisrael');
  });
});

describe('the Chok LeYisrael reader when a read fails', () => {
  const failure = new Error('corrupt');

  beforeEach(() => {
    reset(true);
    jest.mocked(verifyChokInstall).mockClear();
    mockLoad.mockImplementation(() => Promise.reject(failure));
  });
  afterEach(() => {
    jest.useRealTimers();
    mockLoad.mockImplementation(loadAsset);
  });

  it('hands the error to verifyChokInstall and offers a retry', async () => {
    jest.useFakeTimers({ now: at(JERUSALEM, '2026-11-18T12:00'), doNotFake: [...ONLY_DATE] });
    renderWithTheme(<SiddurScreen />);
    await screen.findByText('לא הצלחנו לטעון את הנוסח.');
    expect(verifyChokInstall).toHaveBeenCalledWith(failure);
    expect(screen.getByText('נסה שוב')).toBeOnTheScreen();
  });
});
