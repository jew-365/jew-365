const mockParams: { id: string; date?: string; slot?: string; from?: string } = { id: 'chok_leyisrael' };
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
let mockCanGoBack = false;
const loadAsset = (parasha: string) => Promise.resolve(mockAsset(parasha));
const mockLoad = jest.fn(loadAsset);

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
    back: mockBack,
    canDismiss: () => false,
    canGoBack: () => mockCanGoBack,
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

import { AppState, FlatList } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import SiddurScreen from '../siddur/[id]';
import { CITIES } from '@/data/cities';
import { verifyChokInstall } from '@/services/ChokContentService';
import { buildPlan } from '@/services/notifications/plan';
import { readPlanInput } from '@/services/notifications/snapshot';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useChokStore } from '@/stores/useChokStore';
import { useSiddurBookmarksStore } from '@/stores/useSiddurBookmarksStore';
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

const WEEK_PICKER = 'פרשת השבוע · ויצא';
const DOUBLE_PICKER = 'פרשת השבוע · ויקהל־פקודי';
const NOTE = 'זו לא פרשת השבוע, ולכן אין כאן סימון של ״סיימתי״';
const BACK = 'חזרה לפרשת השבוע';
const openPicker = () => fireEvent.press(screen.getByRole('button', { name: /^בחירת פרשה: / }));
const pickerTitled = (title: string) => screen.queryByRole('button', { name: `בחירת פרשה: ${title}` });
const shows = async (title: string, slot = 'יום רביעי') => {
  await waitFor(() => expect(pickerTitled(title)).toBeOnTheScreen());
  expect(screen.getByRole('radio', { name: slot })).toBeSelected();
};
const pickParasha = async (name: string, slot = 'יום רביעי') => {
  openPicker();
  fireEvent.press(screen.getByRole('button', { name }));
  await shows(`פרשת ${name}`, slot);
  await screen.findByText(/^פסוק /);
};

const SECTION_HEIGHT = 2000;
const scrollEvent = (y: number) => ({
  nativeEvent: {
    contentOffset: { x: 0, y },
    contentSize: { width: 360, height: 8000 },
    layoutMeasurement: { width: 360, height: 640 },
  },
});
const measureSections = () => {
  for (const title of ['תורה', 'משנה', 'זוהר']) {
    fireEvent(screen.getByTestId(`siddur-section-${title}`), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 360, height: SECTION_HEIGHT } },
    });
  }
};
const scrollTo = (y: number) => fireEvent.scroll(screen.getByTestId('siddur-list'), scrollEvent(y));
const autoScrolledTo = (): number | undefined =>
  screen.getByTestId('siddur-list').props.jestAnimatedProps?.value?.contentOffset?.y;
const runFrames = async (count: number) => {
  for (let frame = 0; frame < count; frame++) {
    jest.advanceTimersByTime(100);
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
  }
};

function reset(enabled: boolean) {
  mockParams.date = undefined;
  mockParams.slot = undefined;
  mockParams.from = undefined;
  mockCanGoBack = false;
  mockReplace.mockReset();
  mockPush.mockReset();
  mockBack.mockReset();
  installChokFixture();
  useSiddurBookmarksStore.getState().reset();
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
  await act(async () => {});
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
    expect(marked('2026-11-16')).toBe(false);
    fireEvent.press(screen.getByText('עשיתי אחרי שעבר הזמן'));
    expect(marked('2026-11-16')).toBe(true);
    expect(useCompletionsStore.getState().late['2026-11-16']?.chok_leyisrael).toBeTruthy();
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
    fireEvent.press(screen.getByText('עשיתי בזמן ולא סימנתי'));
    expect(marked('2026-11-16')).toBe(true);
    expect(useCompletionsStore.getState().late).toEqual({});
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

describe('the Chok LeYisrael reader parasha choice', () => {
  beforeEach(() => {
    reset(true);
    mockLoad.mockClear();
    mockLoad.mockImplementation((parasha) => Promise.resolve(commentaryAsset(parasha)));
  });
  afterEach(() => {
    jest.useRealTimers();
    mockLoad.mockImplementation(loadAsset);
  });

  it('opens on this week, titled by it, with the books and "השבוע" in the sheet', async () => {
    await openAt('2026-11-18T12:00');
    await shows(WEEK_PICKER);
    expect(screen.getByRole('button', { name: 'בחירת פרשה: פרשת השבוע · ויצא' })).toBeOnTheScreen();
    expect(screen.getByText('פרשת השבוע · ויצא')).toBeOnTheScreen();
    expect(screen.queryByText(NOTE)).toBeNull();
    openPicker();
    const books = screen.getAllByRole('header').map((node) => node.props.children);
    expect(books.slice(-5)).toEqual(['בראשית', 'שמות', 'ויקרא', 'במדבר', 'דברים']);
    expect(books).toHaveLength(6);
    expect(screen.getByRole('button', { name: 'ויצא · השבוע' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'בראשית' })).not.toBeSelected();
  });

  it('offers only the parashiyot of the installed add-on', async () => {
    installChokFixture(['Vayetzei', 'Bereshit', 'Vayikra']);
    await openAt('2026-11-18T12:00');
    openPicker();
    expect(screen.getByRole('button', { name: 'בראשית' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'ויקרא' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'נח' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'שמות' })).toBeNull();
  });

  it('reads another parasha read only: its title, a note and a way back, no done and no make-ups', async () => {
    await openAt('2026-11-18T12:00');
    expect(screen.getByText('סיימתי')).toBeOnTheScreen();
    expect(closedFold('השלמה: יום שני')).toBeOnTheScreen();

    await pickParasha('בראשית');
    expect(mockLoad).toHaveBeenCalledWith('Bereshit');
    expect(pickerTitled(WEEK_PICKER)).toBeNull();
    expect(screen.getByRole('button', { name: 'בחירת פרשה: פרשת בראשית' })).toBeOnTheScreen();
    expect(screen.queryByText('סיימתי')).toBeNull();
    expect(closedFold(/^השלמה/)).toBeNull();
    expect(screen.getByText(NOTE)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: BACK })).toBeOnTheScreen();
    expect(useCompletionsStore.getState().completions).toEqual({});
  });

  it('goes back to this week from the button, with its done and make-ups again', async () => {
    await openAt('2026-11-18T12:00');
    await pickParasha('בראשית');
    fireEvent.press(screen.getByRole('button', { name: BACK }));
    await shows(WEEK_PICKER);
    await screen.findByText(/^פסוק /);
    expect(screen.queryByText(NOTE)).toBeNull();
    expect(screen.queryByRole('button', { name: BACK })).toBeNull();
    expect(screen.getByText('סיימתי')).toBeOnTheScreen();
    expect(closedFold('השלמה: יום שני')).toBeOnTheScreen();
  });

  it("goes back to this week on today's day after a day was picked in another parasha", async () => {
    await openAt('2026-11-18T12:00');
    await pickParasha('בראשית');
    fireEvent.press(screen.getByRole('radio', { name: 'יום ראשון' }));
    await shows('פרשת בראשית', 'יום ראשון');
    fireEvent.press(screen.getByRole('button', { name: BACK }));
    await shows(WEEK_PICKER);
    await screen.findByText(/^פסוק /);
    expect(screen.getByText('סיימתי')).toBeOnTheScreen();
    expect(closedFold('השלמה: יום שני')).toBeOnTheScreen();
  });

  it('goes back to this week when a parasha of this week is chosen', async () => {
    await openAt('2026-11-18T12:00');
    await pickParasha('בראשית');
    openPicker();
    expect(screen.getByRole('button', { name: 'בראשית' })).toBeSelected();
    fireEvent.press(screen.getByRole('button', { name: 'ויצא · השבוע' }));
    await shows(WEEK_PICKER);
    await screen.findByText(/^פסוק /);
    expect(screen.getByText('סיימתי')).toBeOnTheScreen();
  });

  it('keeps the slot chosen on a switch, and falls back to the last slot where Vezot Haberakhah has no Friday', async () => {
    await openAt('2026-11-18T12:00');
    fireEvent.press(screen.getByRole('radio', { name: 'יום שני' }));
    await pickParasha('בראשית', 'יום שני');
    expect(screen.getByRole('radio', { name: 'יום שני' })).toBeSelected();

    fireEvent.press(screen.getByRole('radio', { name: 'יום שישי' }));
    await shows('פרשת בראשית', 'יום שישי');
    await pickParasha('וזאת הברכה', 'ליל שישי');
    expect(screen.queryByRole('radio', { name: 'יום שישי' })).toBeNull();
    expect(screen.getByRole('radio', { name: 'ליל שישי' })).toBeSelected();

    await pickParasha('שמות', 'יום שישי');
    expect(screen.getByRole('radio', { name: 'יום שישי' })).toBeSelected();
  });

  it("takes the week's own slot when no slot was chosen", async () => {
    await openAt('2026-11-18T12:00');
    await pickParasha('שמות');
    expect(screen.getByRole('radio', { name: 'יום רביעי' })).toBeSelected();
  });

  it('closes the folds tapped and starts again from the top on another parasha', async () => {
    reset(false);
    await openAt('2026-11-18T12:00');
    fireEvent.press(closedFold('תרגום הזוהר')!);
    expect(screen.getByText('תרגום wed')).toBeOnTheScreen();
    await pickParasha('בראשית');
    expect(screen.queryByText('תרגום wed')).toBeNull();
    expect(closedFold('תרגום הזוהר')).toBeOnTheScreen();
  });

  it('starts again from the top when the day changes in another parasha', async () => {
    reset(false);
    await openAt('2026-11-18T12:00');
    await pickParasha('בראשית');
    const scrollToOffset = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => {});
    fireEvent.press(closedFold('תרגום הזוהר')!);
    expect(screen.getByText('תרגום wed')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('radio', { name: 'יום שני' }));
    await shows('פרשת בראשית', 'יום שני');
    expect(scrollToOffset).toHaveBeenCalledWith({ offset: 0, animated: false });
    expect(screen.queryByText('תרגום mon')).toBeNull();
    expect(closedFold('תרגום הזוהר')).toBeOnTheScreen();
    scrollToOffset.mockRestore();
  });

  it('bookmarks the top of the new parasha after a long scroll in the old one', async () => {
    reset(false);
    await openAt('2026-11-18T12:00');
    measureSections();
    scrollTo(3000);
    fireEvent.press(screen.getByRole('button', { name: 'הוסף סימנייה' }));
    expect(useSiddurBookmarksStore.getState().bookmarks.map((saved) => saved.segmentKey)).toEqual([
      'Vayetzei:wed:משנה:0',
    ]);
    useSiddurBookmarksStore.getState().reset();

    await pickParasha('בראשית');
    fireEvent.press(screen.getByRole('button', { name: 'הוסף סימנייה' }));
    expect(useSiddurBookmarksStore.getState().bookmarks.map((saved) => saved.segmentKey)).toEqual([
      'Bereshit:wed:תורה:0',
    ]);
  });

  it('saves no last place in the new parasha for a scroll made in the old one', async () => {
    reset(false);
    await openAt('2026-11-18T12:00');
    measureSections();
    scrollTo(3000);
    await pickParasha('בראשית');
    await act(() => new Promise((resolve) => setTimeout(resolve, 1100)));
    expect(useSiddurBookmarksStore.getState().lastPositions).toEqual({});
  });

  it('keeps the saved place of this week when the reader is left right after a switch to another parasha', async () => {
    reset(false);
    jest.mocked(AppState.addEventListener).mockClear();
    await openAt('2026-11-18T12:00');
    measureSections();
    scrollTo(3000);
    await act(() => new Promise((resolve) => setTimeout(resolve, 1100)));
    const weekPlace = useSiddurBookmarksStore.getState().lastPositions.chok_leyisrael;
    expect(weekPlace.segmentKey).toBe('Vayetzei:wed:משנה:0');

    await pickParasha('בראשית');
    act(() => {
      for (const [event, listener] of jest.mocked(AppState.addEventListener).mock.calls) {
        if (event === 'change') (listener as (state: string) => void)('background');
      }
    });

    expect(useSiddurBookmarksStore.getState().lastPositions.chok_leyisrael).toEqual(weekPlace);
  });

  it('starts auto-scroll on the new parasha from its top, not from where the old one was left', async () => {
    useUserStore.setState({ siddurAutoScroll: true });
    await openAt('2026-11-18T12:00');
    scrollTo(3000);
    await pickParasha('בראשית');
    await runFrames(60);
    const scrolled = autoScrolledTo();
    expect(scrolled).toBeGreaterThan(0);
    expect(scrolled).toBeLessThan(500);
  });

  it('opens on this week each time, whatever was read before', async () => {
    await openAt('2026-11-18T12:00');
    await pickParasha('בראשית');
    screen.unmount();
    await openAt('2026-11-18T12:00');
    await shows(WEEK_PICKER);
    expect(screen.queryByText(NOTE)).toBeNull();
  });

  it('shows the choice of the two parashiyot of a double week, and none once one parasha is browsed', async () => {
    await openAt('2028-03-22T12:00');
    await shows(DOUBLE_PICKER);
    expect(screen.getByLabelText('פרשות מחוברות')).toBeOnTheScreen();
    openPicker();
    expect(screen.getByRole('button', { name: 'ויקהל · השבוע' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'פקודי · השבוע' })).not.toBeSelected();
    fireEvent.press(screen.getByRole('button', { name: 'בראשית' }));
    await shows('פרשת בראשית');
    expect(screen.queryByLabelText('פרשות מחוברות')).toBeNull();
  });
});

describe('the Chok LeYisrael reader places in another parasha', () => {
  const RESUME = 'להמשיך מהמקום שבו עצרת? (פרשת בראשית · יום רביעי)';
  const keyOf = (parasha: string, slot: ChokSlot, heading: string) => `${parasha}:${slot}:${heading}:0`;
  const lastPlace = (parasha: string, slot: ChokSlot, heading = 'משנה') => ({
    nusach: null,
    sectionTitle: heading,
    segmentKey: keyOf(parasha, slot, heading),
    appDay: '2026-11-17',
    savedAt: 0,
  });
  const bookmark = (id: string, parasha: string, slot: ChokSlot, heading = 'משנה') => ({
    id,
    textId: 'chok_leyisrael',
    nusach: null,
    sectionTitle: heading,
    segmentKey: keyOf(parasha, slot, heading),
    label: `${heading} · ${id}`,
    createdAt: 1,
  });
  const openBookmarks = () => fireEvent.press(screen.getByRole('button', { name: 'סימניות' }));
  const landed = async () => {
    await screen.findByText(/^פסוק /);
    await act(async () => {});
  };
  let scrollToIndex: jest.SpyInstance;

  beforeEach(() => {
    reset(true);
    mockLoad.mockClear();
    mockLoad.mockImplementation((parasha) => Promise.resolve(commentaryAsset(parasha)));
    scrollToIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => {});
  });
  afterEach(() => {
    scrollToIndex.mockRestore();
    jest.useRealTimers();
    mockLoad.mockImplementation(loadAsset);
  });

  it('stores a bookmark added while browsing under the browsed parasha', async () => {
    await openAt('2026-11-18T12:00');
    await pickParasha('בראשית');
    fireEvent.press(screen.getByRole('button', { name: 'הוסף סימנייה' }));
    const [saved] = useSiddurBookmarksStore.getState().bookmarks;
    expect(saved.textId).toBe('chok_leyisrael');
    expect(saved.nusach).toBeNull();
    expect(saved.segmentKey.startsWith('Bereshit:wed:')).toBe(true);
  });

  it('offers the last place of another parasha on a fresh open of this week, naming it', async () => {
    useSiddurBookmarksStore.setState({ lastPositions: { chok_leyisrael: lastPlace('Bereshit', 'wed') } });
    await openAt('2026-11-18T12:00');
    await shows(WEEK_PICKER);
    expect(screen.getByText(RESUME)).toBeOnTheScreen();
    expect(screen.queryByText('להמשיך מהמקום שבו עצרת?')).toBeNull();
  });

  it('shows that parasha and lands on its section when "המשך" is pressed', async () => {
    useSiddurBookmarksStore.setState({ lastPositions: { chok_leyisrael: lastPlace('Bereshit', 'wed') } });
    await openAt('2026-11-18T12:00');
    fireEvent.press(screen.getByRole('button', { name: 'המשך' }));
    expect(screen.queryByText(RESUME)).toBeNull();
    await shows('פרשת בראשית');
    await landed();
    expect(mockLoad).toHaveBeenCalledWith('Bereshit');
    expect(scrollToIndex).toHaveBeenCalledTimes(1);
    expect(scrollToIndex.mock.calls[0][0]).toEqual({ index: 1, animated: false });
    expect(screen.getByText(NOTE)).toBeOnTheScreen();
  });

  it('leaves it at the top, with no jump, when the parasha no longer holds the place', async () => {
    useSiddurBookmarksStore.setState({
      lastPositions: { chok_leyisrael: lastPlace('Bereshit', 'wed', 'נעלם') },
    });
    await openAt('2026-11-18T12:00');
    fireEvent.press(screen.getByRole('button', { name: 'המשך' }));
    await shows('פרשת בראשית');
    await landed();
    expect(scrollToIndex).not.toHaveBeenCalled();
  });

  it('returns to this week when the place is in a parasha of it, from a browsed one', async () => {
    useSiddurBookmarksStore.setState({ bookmarks: [bookmark('b1', 'Vayetzei', 'wed')] });
    await openAt('2026-11-18T12:00');
    await pickParasha('בראשית');
    openBookmarks();
    fireEvent.press(screen.getByText('משנה · b1'));
    await shows(WEEK_PICKER);
    await landed();
    expect(screen.getByText('סיימתי')).toBeOnTheScreen();
    expect(scrollToIndex).toHaveBeenCalledTimes(1);
    expect(scrollToIndex.mock.calls[0][0]).toEqual({ index: 3, animated: false });
  });

  it("switches only the slot for a place in another day of this week's parasha", async () => {
    useSiddurBookmarksStore.setState({ bookmarks: [bookmark('b1', 'Vayetzei', 'thu')] });
    await openAt('2026-11-18T12:00');
    openBookmarks();
    expect(screen.getByText('פרשת ויצא · יום חמישי')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('משנה · b1'));
    await shows(WEEK_PICKER, 'יום חמישי');
    await landed();
    expect(screen.getByRole('radio', { name: 'יום חמישי' })).toBeSelected();
    expect(screen.queryByText(NOTE)).toBeNull();
    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(scrollToIndex).toHaveBeenCalledTimes(1);
    expect(scrollToIndex.mock.calls[0][0]).toEqual({ index: 1, animated: false });
  });

  it('captions each bookmark with its place and switches to it when pressed', async () => {
    useSiddurBookmarksStore.setState({
      bookmarks: [bookmark('b1', 'Bereshit', 'tue'), bookmark('b2', 'Shemot', 'wed')],
    });
    await openAt('2026-11-18T12:00');
    openBookmarks();
    expect(screen.getByText('פרשת בראשית · יום שלישי')).toBeOnTheScreen();
    expect(screen.getByText('פרשת שמות · יום רביעי')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('משנה · b1'));
    await shows('פרשת בראשית', 'יום שלישי');
    await landed();
    expect(mockLoad).toHaveBeenCalledWith('Bereshit');
    expect(screen.getByRole('radio', { name: 'יום שלישי' })).toBeSelected();
    expect(scrollToIndex).toHaveBeenCalledTimes(1);
  });

  it('captions the last place of another parasha and switches to it', async () => {
    useSiddurBookmarksStore.setState({ lastPositions: { chok_leyisrael: lastPlace('Shemot', 'thu') } });
    await openAt('2026-11-18T12:00');
    openBookmarks();
    expect(screen.getByText('המקום האחרון')).toBeOnTheScreen();
    expect(screen.getByText('פרשת שמות · יום חמישי')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('המקום האחרון'));
    await shows('פרשת שמות', 'יום חמישי');
    await landed();
    expect(scrollToIndex).toHaveBeenCalledTimes(1);
  });

  it('disables a place whose parasha is not installed, and offers no resume to it', async () => {
    installChokFixture(['Vayetzei', 'Bereshit']);
    useSiddurBookmarksStore.setState({
      bookmarks: [bookmark('b1', 'Noach', 'wed'), bookmark('b2', 'Bereshit', 'wed')],
      lastPositions: { chok_leyisrael: lastPlace('Noach', 'wed') },
    });
    await openAt('2026-11-18T12:00');
    expect(screen.queryByRole('button', { name: 'המשך' })).toBeNull();
    openBookmarks();
    expect(screen.getByRole('button', { name: /^משנה · b1/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^משנה · b2/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^המקום האחרון/ })).toBeDisabled();
  });

  it('keeps the place of a make-up fold working in the text on screen', async () => {
    useSiddurBookmarksStore.setState({
      bookmarks: [{ ...bookmark('b1', 'Vayetzei', 'mon'), segmentKey: 'makeUp:mon:משנה' }],
    });
    await openAt('2026-11-18T12:00');
    openBookmarks();
    expect(screen.getByRole('button', { name: /^משנה · b1/ })).toBeEnabled();
    expect(screen.queryByText('פרשת ויצא · יום שני')).toBeNull();
  });

  it('keeps the plain resume line for a place in the text on screen', async () => {
    useSiddurBookmarksStore.setState({ lastPositions: { chok_leyisrael: lastPlace('Vayetzei', 'wed') } });
    await openAt('2026-11-18T12:00');
    expect(screen.getByText('להמשיך מהמקום שבו עצרת?')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'המשך' }));
    await act(async () => {});
    expect(screen.queryByText(NOTE)).toBeNull();
    expect(scrollToIndex).toHaveBeenCalledTimes(1);
  });

  it('browses the second parasha of a double week when the choice shows only the first', async () => {
    useUserStore.setState({ chokDoubleChoice: 'first' });
    useSiddurBookmarksStore.setState({ bookmarks: [bookmark('b1', 'Pekudei', 'wed')] });
    await openAt('2028-03-22T12:00');
    await shows(DOUBLE_PICKER);
    expect(screen.getByRole('radio', { name: 'ויקהל' })).toBeSelected();
    openBookmarks();
    fireEvent.press(screen.getByText('משנה · b1'));
    await shows('פרשת פקודי');
    await landed();
    expect(screen.getByText(NOTE)).toBeOnTheScreen();
  });

  it('browses the second parasha of a double week from the sheet when the choice shows only the first', async () => {
    useUserStore.setState({ chokDoubleChoice: 'first' });
    await openAt('2028-03-22T12:00');
    await shows(DOUBLE_PICKER);
    openPicker();
    expect(screen.getByRole('button', { name: 'ויקהל · השבוע' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'פקודי · השבוע' })).not.toBeSelected();
    fireEvent.press(screen.getByRole('button', { name: 'פקודי · השבוע' }));
    await shows('פרשת פקודי');
    expect(mockLoad).toHaveBeenCalledWith('Pekudei');
    expect(await screen.findByText(NOTE)).toBeOnTheScreen();
  });

  it('stays on the week for the second parasha of a double week when the choice is both', async () => {
    useUserStore.setState({ chokDoubleChoice: 'both' });
    useSiddurBookmarksStore.setState({ bookmarks: [bookmark('b1', 'Pekudei', 'wed')] });
    await openAt('2028-03-22T12:00');
    openBookmarks();
    fireEvent.press(screen.getByText('משנה · b1'));
    await landed();
    expect(screen.queryByText(NOTE)).toBeNull();
    await shows(DOUBLE_PICKER);
    expect(scrollToIndex).toHaveBeenCalledTimes(1);
  });
});

describe('the Chok LeYisrael reader header pill', () => {
  const SETTINGS = 'הגדרות המצווה';
  const pill = () => screen.getByRole('button', { name: SETTINGS });

  beforeEach(() => reset(true));
  afterEach(() => jest.useRealTimers());

  it('opens the mitzvah screen', async () => {
    await openAt('2026-11-18T12:00');
    fireEvent.press(pill());
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/mitzvah/[id]', params: { id: 'chok_leyisrael' } });
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('goes back instead when the mitzvah screen opened the reader', async () => {
    mockParams.from = 'chok_leyisrael';
    mockCanGoBack = true;
    await openAt('2026-11-18T12:00');
    fireEvent.press(pill());
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('opens the mitzvah screen when the reader opened from elsewhere, or cannot go back', async () => {
    mockParams.from = 'shacharit';
    mockCanGoBack = true;
    await openAt('2026-11-18T12:00');
    fireEvent.press(pill());
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('sits before the star and the bookmarks', async () => {
    await openAt('2026-11-18T12:00');
    const all = screen.getAllByRole('button');
    const order = [
      pill(),
      screen.getByRole('button', { name: 'הוסף סימנייה' }),
      screen.getByRole('button', { name: 'סימניות' }),
    ];
    const indexes = order.map((control) => all.indexOf(control));
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
    expect(new Set(indexes).size).toBe(3);
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

  it('folds Rashi, Bartenura and the Zohar translation by default under "בלי פירושים"', async () => {
    await openAt('2026-11-18T12:00');
    expect(screen.getByLabelText('פירושים')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'בלי פירושים' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'עם פירושים' })).not.toBeSelected();
    expect(closedFold('רש״י')).toBeOnTheScreen();
    expect(closedFold('ברטנורה')).toBeOnTheScreen();
    expect(closedFold('תרגום הזוהר')).toBeOnTheScreen();
    expect(screen.queryByText('פירוש רש״י wed')).toBeNull();
    expect(screen.queryByText('פירוש ברטנורה wed')).toBeNull();
    expect(screen.queryByText('תרגום wed')).toBeNull();
    expect(screen.queryByRole('radio', { name: 'במניין' })).toBeNull();
  });

  it('"עם פירושים" opens every Rashi and Bartenura passage, saves the choice and leaves the Zohar translation folded', async () => {
    await openAt('2026-11-18T12:00');
    fireEvent.press(screen.getByRole('radio', { name: 'עם פירושים' }));
    expect(useUserStore.getState().chokCommentaryOpen).toBe(true);
    expect(screen.getByRole('radio', { name: 'עם פירושים' })).toBeSelected();
    expect(screen.getByText('פירוש רש״י wed')).toBeOnTheScreen();
    expect(screen.getByText('פירוש ברטנורה wed')).toBeOnTheScreen();
    expect(openFold('רש״י')).toBeOnTheScreen();
    expect(openFold('ברטנורה')).toBeOnTheScreen();
    expect(closedFold('תרגום הזוהר')).toBeOnTheScreen();
    expect(screen.queryByText('תרגום wed')).toBeNull();
  });

  it('closes only the tapped passage when one commentary is tapped', async () => {
    await openAt('2026-11-18T12:00');
    fireEvent.press(screen.getByRole('radio', { name: 'עם פירושים' }));
    fireEvent.press(openFold('רש״י')!);
    expect(screen.queryByText('פירוש רש״י wed')).toBeNull();
    expect(closedFold('רש״י')).toBeOnTheScreen();
    expect(screen.getByText('פירוש ברטנורה wed')).toBeOnTheScreen();
  });

  it('clears the passages tapped against the setting when the setting changes', async () => {
    await openAt('2026-11-18T12:00');
    fireEvent.press(closedFold('ברטנורה')!);
    fireEvent.press(screen.getByRole('radio', { name: 'עם פירושים' }));
    expect(screen.getByText('פירוש רש״י wed')).toBeOnTheScreen();
    expect(screen.getByText('פירוש ברטנורה wed')).toBeOnTheScreen();
    fireEvent.press(openFold('רש״י')!);
    fireEvent.press(screen.getByRole('radio', { name: 'בלי פירושים' }));
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
    fireEvent.press(screen.getByRole('radio', { name: 'עם פירושים' }));
    expect(screen.getByText('תרגום wed')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('radio', { name: 'בלי פירושים' }));
    expect(screen.getByText('תרגום wed')).toBeOnTheScreen();
  });

  it('opens with the commentaries open when Settings turned them on, and writes the toolbar choice back', async () => {
    useUserStore.setState({ chokCommentaryOpen: true });
    await openAt('2026-11-18T12:00');
    expect(screen.getByRole('radio', { name: 'עם פירושים' })).toBeSelected();
    expect(screen.getByText('פירוש רש״י wed')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('radio', { name: 'בלי פירושים' }));
    expect(useUserStore.getState().chokCommentaryOpen).toBe(false);
    expect(screen.queryByText('פירוש רש״י wed')).toBeNull();
  });

  it('orders the controls: parasha picker, section picker with the commentaries beside it, A+, A−, speed, play', async () => {
    await openAt('2026-11-18T12:00');
    const all = screen.getAllByRole(/^(radio|button|switch)$/);
    const indexes = [
      screen.getByRole('button', { name: /^בחירת פרשה: / }),
      screen.getByRole('button', { name: /^בחר חלק: / }),
      screen.getByRole('radio', { name: 'עם פירושים' }),
      screen.getByRole('radio', { name: 'בלי פירושים' }),
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

  it('keeps the commentary control out of the toolbar row: no share of its width', async () => {
    await openAt('2026-11-18T12:00');
    expect(screen.getByLabelText('פירושים')).not.toHaveStyle({ flex: 1 });
    expect(screen.getByLabelText('פירושים')).not.toHaveStyle({ minWidth: 104 });
  });

  it('names the commentary control in English', async () => {
    useUserStore.setState({ language: 'en' });
    await openAt('2026-11-18T12:00');
    expect(screen.getByLabelText('Commentaries')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Text only' })).toBeSelected();
    fireEvent.press(screen.getByRole('radio', { name: 'Commentary' }));
    expect(useUserStore.getState().chokCommentaryOpen).toBe(true);
    expect(openFold('Rashi')).toBeOnTheScreen();
  });

  it('shows no commentary control for a portion with neither Rashi nor Bartenura', async () => {
    mockLoad.mockImplementation((parasha) => Promise.resolve(zoharOnlyAsset(parasha)));
    await openAt('2026-11-18T12:00');
    expect(screen.queryByLabelText('פירושים')).toBeNull();
    expect(screen.queryByRole('radio', { name: 'בלי פירושים' })).toBeNull();
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

  it('still offers the mitzvah settings, and no parasha choice', () => {
    jest.useFakeTimers({ now: at(JERUSALEM, '2026-11-18T12:00'), doNotFake: [...ONLY_DATE] });
    renderWithTheme(<SiddurScreen />);
    expect(screen.getByRole('button', { name: 'הגדרות המצווה' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^בחירת פרשה: / })).toBeNull();
    expect(screen.queryByRole('button', { name: 'הוסף סימנייה' })).toBeNull();
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
