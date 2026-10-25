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
let mockLoadedText: SiddurText | null = null;

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
jest.mock('@/services/SiddurService', () => {
  const { readSiddurText } = require('@/testing/siddur');
  return {
    loadSiddurText: (nusach: string, id: string) => Promise.resolve(mockLoadedText ?? readSiddurText(nusach, id)),
    loadChokParasha: () => Promise.reject(new Error('no chok text in a reader render')),
  };
});
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

import { AppState, FlatList, StyleSheet } from 'react-native';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import SiddurReaderScreen from '../siddur/[id]';
import { MitzvahIcon } from '@/components/MitzvahIcon';
import { CITIES } from '@/data/cities';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { useSiddurBookmarksStore } from '@/stores/useSiddurBookmarksStore';
import { useUserStore } from '@/stores/useUserStore';
import { readSiddurText } from '@/testing/siddur';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';
import { THEMES } from '@/theme/colors';
import type { CustomMitzvah, Nusach } from '@/types/mitzvah';
import type { SiddurLastPosition, SiddurSection, SiddurText, SiddurVoice } from '@/types/siddur';

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
const FIRST_LINE = 'מוֹדֶה אֲנִי';

async function openShacharit() {
  jest.useFakeTimers({ now: at(JERUSALEM, '2026-10-28T07:00'), doNotFake: [...ONLY_DATE] });
  useUserStore.getState().reset();
  useUserStore.setState({ language: 'he', location: JERUSALEM, inIsrael: true, nusach: 'ashkenaz' });
  for (const key of Object.keys(mockParams)) delete mockParams[key];
  Object.assign(mockParams, { id: 'shacharit', date: '2026-10-28' });
  renderWithTheme(<SiddurReaderScreen />);
  await screen.findAllByText(FIRST_LINE);
}

async function openAt(section?: string) {
  jest.useFakeTimers({ now: at(JERUSALEM, '2026-10-28T07:00'), doNotFake: [...ONLY_DATE] });
  useUserStore.getState().reset();
  useUserStore.setState({ language: 'he', location: JERUSALEM, inIsrael: true, nusach: 'ashkenaz' });
  for (const key of Object.keys(mockParams)) delete mockParams[key];
  Object.assign(mockParams, { id: 'shacharit', ...(section ? { section } : {}) });
  renderWithTheme(<SiddurReaderScreen />);
  await screen.findAllByText(FIRST_LINE);
}

const VOICED: SiddurText = {
  nusach: 'ashkenaz',
  id: 'shacharit',
  credits: [],
  sections: [
    {
      title: { he: 'ברכות השחר', en: 'Morning blessings' },
      segments: [
        {
          he: [
            [{ t: 'מוֹדֶה', voice: ['male', 'unset'] }, { t: 'מוֹדָה', voice: ['female'] }, { t: ' אֲנִי לְפָנֶיךָ' }],
          ],
        },
        {
          he: [[{ t: 'שֶׁעָשַׂנִי כִּרְצוֹנוֹ' }]],
          optional: { he: 'נשים אומרות', en: 'Women say', voice: 'female' },
        },
      ],
    },
  ],
};
const MALE_LINE = 'מוֹדֶה אֲנִי לְפָנֶיךָ';
const FEMALE_LINE = 'מוֹדָה אֲנִי לְפָנֶיךָ';
const WOMEN_LABEL = 'נשים אומרות';
const WOMEN_PASSAGE = 'שֶׁעָשַׂנִי כִּרְצוֹנוֹ';

function openVoiced(voice: SiddurVoice | null) {
  jest.useFakeTimers({ now: at(JERUSALEM, '2026-10-28T07:00'), doNotFake: [...ONLY_DATE] });
  useUserStore.getState().reset();
  useUserStore.setState({
    language: 'he',
    location: JERUSALEM,
    inIsrael: true,
    nusach: 'ashkenaz',
    siddurVoice: voice,
  });
  mockLoadedText = VOICED;
  for (const key of Object.keys(mockParams)) delete mockParams[key];
  Object.assign(mockParams, { id: 'shacharit', date: '2026-10-28' });
  renderWithTheme(<SiddurReaderScreen />);
}

describe('the siddur reader toolbar and section cards', () => {
  afterEach(() => jest.useRealTimers());

  it('draws the toolbar on light surfaces', async () => {
    await openShacharit();
    const picker = screen.getByRole('button', { name: /^בחר חלק: / });
    expect(picker).toHaveStyle({ backgroundColor: THEMES.gold.surface, borderRadius: 20 });
    expect(within(picker).UNSAFE_getByType(MitzvahIcon).props.name).toBe('chevronDown');
    expect(screen.getByRole('switch', { name: 'גלילה אוטומטית' })).toHaveStyle({
      backgroundColor: THEMES.gold.surface2,
      width: 34,
    });
    expect(screen.getByRole('button', { name: 'הגדל טקסט' })).toHaveStyle({ backgroundColor: THEMES.gold.surface2 });
    expect(screen.getByText('A+')).toHaveStyle({ color: THEMES.gold.text });
  });

  it('orders the controls: prayer mode, A+, A−, speed, play', async () => {
    await openShacharit();
    const all = screen.getAllByRole(/^(radio|button|switch)$/);
    const indexes = [
      screen.getByRole('radio', { name: 'במניין' }),
      screen.getByRole('radio', { name: 'ביחיד' }),
      screen.getByRole('button', { name: 'הגדל טקסט' }),
      screen.getByRole('button', { name: 'הקטן טקסט' }),
      screen.getByRole('button', { name: 'האט גלילה' }),
      screen.getByRole('button', { name: 'האץ גלילה' }),
      screen.getByRole('switch', { name: 'גלילה אוטומטית' }),
    ].map((control) => all.indexOf(control));
    expect(indexes.every((index) => index >= 0)).toBe(true);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
    expect(new Set(indexes).size).toBe(indexes.length);
    expect(screen.queryByRole('radio', { name: 'מקופלים' })).toBeNull();
  });

  it('titles each section in goldText at the title size', async () => {
    await openShacharit();
    const first = readSiddurText('ashkenaz', 'shacharit').sections[0].title.he;
    const styles = screen.getAllByText(first).map((node) => StyleSheet.flatten(node.props.style));
    expect(styles.some((style) => style.color === THEMES.gold.goldText && style.fontSize === 22)).toBe(true);
  });

  it('turns auto-scroll on from the play switch and fills it with the accent', async () => {
    await openShacharit();
    fireEvent.press(screen.getByRole('switch', { name: 'גלילה אוטומטית' }));
    expect(useUserStore.getState().siddurAutoScroll).toBe(true);
    expect(screen.getByRole('switch', { name: 'גלילה אוטומטית' })).toHaveStyle({ backgroundColor: THEMES.gold.gold });
  });
});

describe('the siddur reader voice', () => {
  afterEach(() => {
    jest.useRealTimers();
    mockLoadedText = null;
  });

  it('reads the printed wording and keeps the voiced passage folded with no voice', async () => {
    openVoiced(null);
    expect(await screen.findByText(MALE_LINE)).toBeOnTheScreen();
    expect(screen.getByText(WOMEN_LABEL)).toBeOnTheScreen();
    expect(screen.queryByText(WOMEN_PASSAGE)).toBeNull();
  });

  it("reads a woman's wording and her passage open for the female voice", async () => {
    openVoiced('female');
    expect(await screen.findByText(FEMALE_LINE)).toBeOnTheScreen();
    expect(screen.getByText(WOMEN_PASSAGE)).toBeOnTheScreen();
    expect(screen.queryByText(WOMEN_LABEL)).toBeNull();
  });

  it("hides the women's passage for the male voice", async () => {
    openVoiced('male');
    expect(await screen.findByText(MALE_LINE)).toBeOnTheScreen();
    expect(screen.queryByText(WOMEN_LABEL)).toBeNull();
    expect(screen.queryByText(WOMEN_PASSAGE)).toBeNull();
  });

  it('follows a voice chosen while the reader is open', async () => {
    openVoiced(null);
    await screen.findByText(MALE_LINE);
    act(() => useUserStore.getState().setSiddurVoice('female'));
    expect(await screen.findByText(FEMALE_LINE)).toBeOnTheScreen();
  });
});

describe('the siddur reader opened at a section', () => {
  const CHAPTER = 'אשרי ובא לציון';
  let scrollToIndex: jest.SpyInstance;

  beforeEach(() => {
    scrollToIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => {});
  });

  afterEach(() => {
    scrollToIndex.mockRestore();
    jest.useRealTimers();
  });

  it('lands on the chapter the search opened', async () => {
    await openAt(CHAPTER);
    expect(scrollToIndex).toHaveBeenCalledTimes(1);
    const { index } = scrollToIndex.mock.calls[0][0];
    expect(scrollToIndex).toHaveBeenCalledWith({ index, animated: false });
    expect(index).toBeGreaterThan(0);
    expect(screen.UNSAFE_getByType(FlatList).props.data[index].chapter.he).toBe(CHAPTER);
    expect(screen.getByRole('button', { name: `בחר חלק: ${CHAPTER}` })).toBeOnTheScreen();
  });

  it('opens at the top without a section', async () => {
    await openAt();
    expect(scrollToIndex).not.toHaveBeenCalled();
  });

  it('opens at the top when the day has no such chapter', async () => {
    await openAt('הלל');
    expect(scrollToIndex).not.toHaveBeenCalled();
  });

  it('lands only once, even when the text is rebuilt', async () => {
    await openAt(CHAPTER);
    const before = screen.UNSAFE_getByType(FlatList).props.data;
    act(() => useUserStore.getState().setSiddurVoice('male'));
    expect(screen.UNSAFE_getByType(FlatList).props.data).not.toBe(before);
    expect(scrollToIndex).toHaveBeenCalledTimes(1);
  });
});

describe('the siddur reader bookmarks and last place', () => {
  const SHACHARIT = { id: 'shacharit', date: '2026-10-28' };
  const NOW = at(JERUSALEM, '2026-10-28T07:00').getTime();
  const MID_2 = 'שְׁמַע יִשְׂרָאֵל יְהוָה אֱלֹהֵינוּ';
  const KEYED: SiddurSection[] = [
    {
      title: { he: 'פתיחה', en: 'Opening' },
      segments: [
        { key: 'k-open-1', he: [[{ t: 'אֶחָד שְׁנַיִם שְׁלֹשָׁה אַרְבַּע' }]] },
        { key: 'k-open-2', he: [[{ t: 'חֲמִשָּׁה שִׁשָּׁה שִׁבְעָה' }]] },
      ],
    },
    {
      title: { he: 'אמצע', en: 'Middle' },
      segments: [
        { key: 'k-mid-1', he: [[{ t: 'הוראה ', s: 'n' }, { t: 'בָּרוּךְ אַתָּה יְהוָה אֱלֹהֵינוּ' }]] },
        { key: 'k-mid-2', he: [[{ t: MID_2 }]] },
      ],
    },
  ];
  const keyedText = (id: string, nusach?: Nusach): SiddurText => ({
    ...(nusach ? { nusach } : {}),
    id,
    credits: [],
    sections: KEYED,
  });
  const MIDDLE_REACHED = { index: 1, animated: false, viewOffset: -150 };
  let scrollSpy: jest.SpyInstance;

  async function openKeyed(params: Record<string, string>, nusach?: Nusach) {
    jest.useFakeTimers({ now: at(JERUSALEM, '2026-10-28T07:00'), doNotFake: [...ONLY_DATE] });
    useUserStore.getState().reset();
    useUserStore.setState({ language: 'he', location: JERUSALEM, inIsrael: true, nusach: 'ashkenaz' });
    mockLoadedText = keyedText(params.id, nusach);
    for (const key of Object.keys(mockParams)) delete mockParams[key];
    Object.assign(mockParams, params);
    renderWithTheme(<SiddurReaderScreen />);
    await screen.findByText(MID_2);
  }

  const layout = (testID: string, y: number, height: number) =>
    fireEvent(screen.getByTestId(testID), 'layout', { nativeEvent: { layout: { x: 0, y, width: 360, height } } });
  function measureKeyed() {
    layout('siddur-section-פתיחה', 0, 300);
    layout('siddur-section-אמצע', 0, 400);
    layout('siddur-segment-k-mid-1', 60, 80);
    layout('siddur-segment-k-mid-2', 150, 80);
  }

  const scrollEvent = (y: number) => ({
    nativeEvent: {
      contentOffset: { x: 0, y },
      contentSize: { width: 360, height: 2000 },
      layoutMeasurement: { width: 360, height: 640 },
    },
  });
  async function scrollList(y: number) {
    fireEvent.scroll(screen.getByTestId('siddur-list'), scrollEvent(y));
    await act(async () => {});
  }

  const lastScroll = () => scrollSpy.mock.calls[scrollSpy.mock.calls.length - 1][0];
  const seedPosition = (textId: string, position: Partial<SiddurLastPosition>) =>
    useSiddurBookmarksStore.setState({
      lastPositions: {
        [textId]: {
          nusach: 'ashkenaz',
          sectionTitle: 'אמצע',
          segmentKey: 'k-mid-2',
          appDay: '2026-10-28',
          savedAt: 0,
          ...position,
        },
      },
    });
  const bookmark = (label: string, textId: string, nusach: Nusach, createdAt: number, segmentKey = 'k-mid-2') => ({
    id: `bookmark_${createdAt}`,
    textId,
    nusach,
    sectionTitle: 'אמצע',
    segmentKey,
    label,
    createdAt,
  });
  const openBookmarks = () => fireEvent.press(screen.getByRole('button', { name: 'סימניות' }));
  const resumeBanner = () => screen.queryByText('להמשיך מהמקום שבו עצרת?');
  const saved = () => useSiddurBookmarksStore.getState().lastPositions;

  const liveChangeListeners = () => {
    const { calls, results } = jest.mocked(AppState.addEventListener).mock;
    return results.filter(
      (result, index) => calls[index][0] === 'change' && jest.mocked(result.value.remove).mock.calls.length === 0,
    ).length;
  };
  const pause = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));

  beforeEach(() => {
    useSiddurBookmarksStore.getState().reset();
    useCompletionsStore.getState().reset();
    scrollSpy = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => {});
    jest.mocked(AppState.addEventListener).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    mockLoadedText = null;
  });

  it('adds a bookmark at the top segment, lists it, jumps to it and deletes it', async () => {
    await openKeyed(SHACHARIT, 'ashkenaz');
    measureKeyed();
    await scrollList(476);
    fireEvent.press(screen.getByRole('button', { name: 'הוסף סימנייה' }));
    expect(useSiddurBookmarksStore.getState().bookmarks).toEqual([
      {
        id: expect.stringMatching(/^bookmark_\d+_[a-z0-9]+$/),
        textId: 'shacharit',
        nusach: 'ashkenaz',
        sectionTitle: 'אמצע',
        segmentKey: 'k-mid-2',
        label: 'אמצע · שְׁמַע יִשְׂרָאֵל יְהוָה',
        createdAt: NOW,
      },
    ]);
    expect(screen.getByText('נוספה סימנייה')).toBeOnTheScreen();

    openBookmarks();
    fireEvent.press(screen.getByText('אמצע · שְׁמַע יִשְׂרָאֵל יְהוָה'));
    expect(lastScroll()).toEqual(MIDDLE_REACHED);

    openBookmarks();
    fireEvent.press(screen.getByLabelText('מחק סימנייה'));
    expect(useSiddurBookmarksStore.getState().bookmarks).toEqual([]);
    expect(screen.getByText('אין עדיין סימניות בטקסט הזה')).toBeOnTheScreen();
  });

  it('lists only this text and nusach, newest first', async () => {
    useSiddurBookmarksStore.setState({
      bookmarks: [
        bookmark('ישנה', 'shacharit', 'ashkenaz', 1),
        bookmark('חדשה', 'shacharit', 'ashkenaz', 2),
        bookmark('מנחה', 'mincha', 'ashkenaz', 3),
        bookmark('ספרד', 'shacharit', 'sefard', 4),
      ],
    });
    await openKeyed(SHACHARIT, 'ashkenaz');
    openBookmarks();
    expect(screen.getAllByText(/^(ישנה|חדשה|מנחה|ספרד)$/).map((node) => node.props.children)).toEqual(['חדשה', 'ישנה']);
  });

  it('shows the last place after a scroll settles and returns to that segment', async () => {
    await openKeyed(SHACHARIT, 'ashkenaz');
    measureKeyed();
    await scrollList(476);
    await act(() => new Promise((resolve) => setTimeout(resolve, 1100)));
    expect(saved().shacharit).toEqual({
      nusach: 'ashkenaz',
      sectionTitle: 'אמצע',
      segmentKey: 'k-mid-2',
      appDay: '2026-10-28',
      savedAt: NOW,
    });
    openBookmarks();
    fireEvent.press(screen.getByText('המקום האחרון'));
    expect(lastScroll()).toEqual(MIDDLE_REACHED);
  });

  it('saves the place when the reader closes, and clears it when it closes at the top', async () => {
    await openKeyed(SHACHARIT, 'ashkenaz');
    measureKeyed();
    await scrollList(476);
    screen.unmount();
    expect(saved().shacharit.segmentKey).toBe('k-mid-2');

    seedPosition('shacharit', { appDay: '2026-10-27' });
    await openKeyed(SHACHARIT, 'ashkenaz');
    measureKeyed();
    await scrollList(476);
    await scrollList(0);
    screen.unmount();
    expect(saved().shacharit).toBeUndefined();
  });

  it('keeps no place for a text that never moved', async () => {
    await openKeyed(SHACHARIT, 'ashkenaz');
    measureKeyed();
    screen.unmount();
    expect(saved()).toEqual({});
  });

  it('saves the place when the app leaves the foreground', async () => {
    await openKeyed(SHACHARIT, 'ashkenaz');
    measureKeyed();
    await scrollList(476);
    act(() => {
      for (const [event, listener] of jest.mocked(AppState.addEventListener).mock.calls) {
        if (event === 'change') (listener as (state: string) => void)('background');
      }
    });
    expect(saved().shacharit.segmentKey).toBe('k-mid-2');
  });

  it('offers to resume Tehillim the next day but not Shacharit', async () => {
    seedPosition('tehillim', { nusach: null, appDay: '2026-10-27' });
    await openKeyed({ id: 'tehillim' });
    expect(resumeBanner()).toBeOnTheScreen();
    measureKeyed();
    fireEvent.press(screen.getByRole('button', { name: 'המשך' }));
    expect(lastScroll()).toEqual(MIDDLE_REACHED);
    expect(resumeBanner()).toBeNull();
    screen.unmount();

    seedPosition('shacharit', { appDay: '2026-10-27' });
    await openKeyed(SHACHARIT, 'ashkenaz');
    expect(resumeBanner()).toBeNull();
  });

  it('offers to resume Shacharit on the same app day, and מההתחלה only hides it', async () => {
    seedPosition('shacharit', { appDay: '2026-10-28' });
    await openKeyed(SHACHARIT, 'ashkenaz');
    expect(resumeBanner()).toBeOnTheScreen();
    const before = saved().shacharit;
    fireEvent.press(screen.getByRole('button', { name: 'מההתחלה' }));
    expect(resumeBanner()).toBeNull();
    expect(scrollSpy).not.toHaveBeenCalled();
    expect(saved().shacharit).toEqual(before);
  });

  it('hides the resume offer when the reader drags the text', async () => {
    seedPosition('shacharit', { appDay: '2026-10-28' });
    await openKeyed(SHACHARIT, 'ashkenaz');
    expect(resumeBanner()).toBeOnTheScreen();
    fireEvent(screen.getByTestId('siddur-list'), 'scrollBeginDrag', scrollEvent(0));
    await act(async () => {});
    expect(resumeBanner()).toBeNull();
  });

  it('skips the resume offer when opened at a section', async () => {
    seedPosition('tehillim', { nusach: null, appDay: '2026-10-27' });
    await openKeyed({ id: 'tehillim', section: 'אמצע' });
    expect(resumeBanner()).toBeNull();
  });

  it('offers no resume for another nusach', async () => {
    seedPosition('shacharit', { nusach: 'sefard', appDay: '2026-10-28' });
    await openKeyed(SHACHARIT, 'ashkenaz');
    expect(resumeBanner()).toBeNull();
    openBookmarks();
    expect(screen.queryByText('המקום האחרון')).toBeNull();
  });

  it('falls back to the section top when the key is gone, and disables a place whose section is gone', async () => {
    useSiddurBookmarksStore.setState({
      bookmarks: [
        bookmark('בלי מפתח', 'shacharit', 'ashkenaz', 2, 'gone'),
        { ...bookmark('נעלמה', 'shacharit', 'ashkenaz', 1, 'gone-too'), sectionTitle: 'נעלם' },
      ],
    });
    await openKeyed(SHACHARIT, 'ashkenaz');
    openBookmarks();
    fireEvent.press(screen.getByText('בלי מפתח'));
    expect(lastScroll()).toEqual({ index: 1, animated: false });
    expect(scrollSpy.mock.calls.every(([params]) => params.viewOffset === undefined)).toBe(true);

    openBookmarks();
    expect(screen.getByText('נעלמה')).toBeDisabled();
    expect(screen.getByText('לא מופיע בנוסח של היום')).toBeOnTheScreen();
  });

  it('keeps each bookmark row and its delete button side by side as separate buttons', async () => {
    useSiddurBookmarksStore.setState({
      bookmarks: [
        bookmark('מקום', 'shacharit', 'ashkenaz', 2),
        { ...bookmark('נעלמה', 'shacharit', 'ashkenaz', 1, 'gone-too'), sectionTitle: 'נעלם' },
      ],
    });
    await openKeyed(SHACHARIT, 'ashkenaz');
    openBookmarks();

    const shown = within(screen.getByTestId('siddur-bookmark-bookmark_2'));
    const row = shown.getByRole('button', { name: 'מקום' });
    expect(shown.getByRole('button', { name: 'מחק סימנייה' })).toBeOnTheScreen();
    expect(within(row).queryByRole('button', { name: 'מחק סימנייה' })).toBeNull();

    const gone = within(screen.getByTestId('siddur-bookmark-bookmark_1'));
    expect(gone.getByRole('button', { name: /^נעלמה/ })).toBeDisabled();
    const goneRemove = gone.getByRole('button', { name: 'מחק סימנייה' });
    expect(goneRemove).toBeEnabled();
    fireEvent.press(goneRemove);
    expect(useSiddurBookmarksStore.getState().bookmarks.map(({ id }) => id)).toEqual(['bookmark_2']);
    expect(screen.queryByTestId('siddur-bookmark-bookmark_1')).toBeNull();
    expect(screen.getByTestId('siddur-bookmark-bookmark_2')).toBeOnTheScreen();
  });

  it('adds the measured wrappers above a segment to its offset', async () => {
    useSiddurBookmarksStore.setState({ bookmarks: [bookmark('מקום', 'shacharit', 'ashkenaz', 1)] });
    await openKeyed(SHACHARIT, 'ashkenaz');
    measureKeyed();
    fireEvent(within(screen.getByTestId('siddur-section-אמצע')).getByText('אמצע'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 40, width: 360, height: 400 } },
    });
    openBookmarks();
    fireEvent.press(screen.getByText('מקום'));
    expect(lastScroll()).toEqual({ ...MIDDLE_REACHED, viewOffset: -190 });
  });

  it('lands on the section first and re-aims at the segment once it is measured', async () => {
    useSiddurBookmarksStore.setState({ bookmarks: [bookmark('מקום', 'shacharit', 'ashkenaz', 1)] });
    await openKeyed(SHACHARIT, 'ashkenaz');
    openBookmarks();
    fireEvent.press(screen.getByText('מקום'));
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(lastScroll()).toEqual({ index: 1, animated: false });

    measureKeyed();
    await pause(200);
    expect(scrollSpy).toHaveBeenCalledTimes(2);
    expect(lastScroll()).toEqual(MIDDLE_REACHED);
  });

  it('clears the place on סיימתי and saves nothing more while the reader stays open', async () => {
    await openKeyed(SHACHARIT, 'ashkenaz');
    measureKeyed();
    await scrollList(476);
    await pause(1100);
    expect(saved().shacharit.segmentKey).toBe('k-mid-2');

    fireEvent.press(screen.getByRole('button', { name: 'סיימתי' }));
    expect(saved().shacharit).toBeUndefined();
    screen.unmount();
    expect(saved().shacharit).toBeUndefined();
  });

  it('holds auto-scroll while the resume offer or the bookmarks sheet shows', async () => {
    seedPosition('shacharit', { appDay: '2026-10-28' });
    await openKeyed(SHACHARIT, 'ashkenaz');
    const idle = liveChangeListeners();
    act(() => useUserStore.getState().setSiddurAutoScroll(true));
    expect(resumeBanner()).toBeOnTheScreen();
    expect(liveChangeListeners()).toBe(idle);

    fireEvent.press(screen.getByRole('button', { name: 'מההתחלה' }));
    expect(liveChangeListeners()).toBe(idle + 1);

    openBookmarks();
    expect(liveChangeListeners()).toBe(idle);

    measureKeyed();
    fireEvent.press(screen.getByText('המקום האחרון'));
    expect(liveChangeListeners()).toBe(idle + 1);
  });
});

describe('the siddur reader header for a custom mitzvah', () => {
  const CUSTOM_ID = 'custom_1800000000000_night';
  const CUSTOM_TEXT = 'שיר המעלות';
  const NIGHT_OF_10_SIVAN = 'אשכנז · י׳ סיון תשפ״ז';
  const DAY_OF_9_SIVAN = 'אשכנז · ט׳ סיון תשפ״ז';

  const nightStudy = (startHHMM: string, endHHMM: string): CustomMitzvah => ({
    id: CUSTOM_ID,
    name: 'לימוד לילה',
    startHHMM,
    endHHMM,
    reminders: [],
    skipOn: [],
    contentBlocks: [{ type: 'text', he: CUSTOM_TEXT }],
    createdAt: 1800000000000,
  });

  async function openCustom(
    hours: [string, string],
    wallClock: string,
    date: string | null,
    language: 'he' | 'en' = 'he',
  ) {
    jest.useFakeTimers({ now: at(JERUSALEM, wallClock), doNotFake: [...ONLY_DATE] });
    useUserStore.getState().reset();
    useUserStore.setState({ language, location: JERUSALEM, inIsrael: true, nusach: 'ashkenaz' });
    useCompletionsStore.getState().reset();
    useCustomMitzvotStore.getState().reset();
    useCustomMitzvotStore.getState().add(nightStudy(...hours));
    for (const key of Object.keys(mockParams)) delete mockParams[key];
    Object.assign(mockParams, { id: CUSTOM_ID, ...(date ? { date } : {}) });
    renderWithTheme(<SiddurReaderScreen />);
    await screen.findByText(CUSTOM_TEXT);
  }

  afterEach(() => {
    jest.useRealTimers();
    useCustomMitzvotStore.getState().reset();
  });

  it("names the night's Hebrew date at 00:45 in a window set between midnight and alot", async () => {
    await openCustom(['00:30', '01:30'], '2027-06-15T00:45', '2027-06-14');
    expect(screen.getByText(NIGHT_OF_10_SIVAN)).toBeOnTheScreen();
    expect(screen.queryByText(DAY_OF_9_SIVAN)).toBeNull();
  });

  it("names the night's Hebrew date in English", async () => {
    await openCustom(['00:30', '01:30'], '2027-06-15T00:45', '2027-06-14', 'en');
    expect(screen.getByText('Ashkenaz · 10th of Sivan, 5787')).toBeOnTheScreen();
    expect(screen.queryByText('Ashkenaz · 9th of Sivan, 5787')).toBeNull();
  });

  it('turns the Hebrew date at sunset for a window that starts in the evening', async () => {
    await openCustom(['22:00', '23:00'], '2027-06-14T22:30', '2027-06-14');
    expect(screen.getByText(NIGHT_OF_10_SIVAN)).toBeOnTheScreen();
    expect(screen.queryByText(DAY_OF_9_SIVAN)).toBeNull();
  });

  it("keeps the day's Hebrew date for a window by day", async () => {
    await openCustom(['10:00', '11:00'], '2027-06-14T10:15', '2027-06-14');
    expect(screen.getByText(DAY_OF_9_SIVAN)).toBeOnTheScreen();
    expect(screen.queryByText(NIGHT_OF_10_SIVAN)).toBeNull();
  });

  it("still files סיימתי under the evening's date", async () => {
    await openCustom(['00:30', '01:30'], '2027-06-15T00:45', '2027-06-14');
    fireEvent.press(screen.getByRole('button', { name: 'סיימתי' }));
    const { completions } = useCompletionsStore.getState();
    expect(completions['2027-06-14'][CUSTOM_ID]).toBeGreaterThan(0);
    expect(completions['2027-06-15']).toBeUndefined();
  });
});
