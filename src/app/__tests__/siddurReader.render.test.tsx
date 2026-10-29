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
let mockLoadGate: Promise<void> | null = null;

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
jest.mock('@/utils/afterPaint', () => ({
  afterPaint: (task: () => void) => {
    queueMicrotask(task);
    return { cancel: () => undefined };
  },
}));
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: () => Promise.resolve(),
  deactivateKeepAwake: () => Promise.resolve(),
}));
jest.mock('@/services/SiddurService', () => {
  const { readSiddurText } = require('@/testing/siddur');
  return {
    loadSiddurText: (nusach: string, id: string) =>
      (mockLoadGate ?? Promise.resolve()).then(() => mockLoadedText ?? readSiddurText(nusach, id)),
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

import { AccessibilityInfo, AppState, FlatList, Platform, StyleSheet } from 'react-native';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { getAnimatedStyle } from 'react-native-reanimated';
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
  useUserStore.setState({
    language: 'he',
    location: JERUSALEM,
    inIsrael: true,
    nusach: 'ashkenaz',
    siddurCompassPrompt: false,
  });
  for (const key of Object.keys(mockParams)) delete mockParams[key];
  Object.assign(mockParams, { id: 'shacharit', date: '2026-10-28' });
  renderWithTheme(<SiddurReaderScreen />);
  await screen.findAllByText(FIRST_LINE);
  await act(async () => {});
}

async function openAt(section?: string) {
  jest.useFakeTimers({ now: at(JERUSALEM, '2026-10-28T07:00'), doNotFake: [...ONLY_DATE] });
  useUserStore.getState().reset();
  useUserStore.setState({
    language: 'he',
    location: JERUSALEM,
    inIsrael: true,
    nusach: 'ashkenaz',
    siddurCompassPrompt: false,
  });
  for (const key of Object.keys(mockParams)) delete mockParams[key];
  Object.assign(mockParams, { id: 'shacharit', ...(section ? { section } : {}) });
  renderWithTheme(<SiddurReaderScreen />);
  await screen.findAllByText(FIRST_LINE);
  await act(async () => {});
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
    siddurCompassPrompt: false,
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
    expect(picker).toHaveStyle({ backgroundColor: THEMES.gold.surface, borderRadius: 20, flexGrow: 1 });
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
    expect(screen.queryByRole('radio', { name: 'עם פירושים' })).toBeNull();
  });

  it('lets the second toolbar row wrap onto a second line when the controls do not fit', async () => {
    await openShacharit();
    let row = screen.getByRole('button', { name: 'הגדל טקסט' }).parent;
    while (row && (typeof row.type !== 'string' || StyleSheet.flatten(row.props.style)?.flexDirection !== 'row')) {
      row = row.parent;
    }
    expect(row).not.toBeNull();
    expect(row).toHaveStyle({ flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 8 });
    expect(screen.getByLabelText('תפילה')).toHaveStyle({ flex: 1 });
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

describe('the siddur reader header while the text loads', () => {
  afterEach(() => {
    jest.useRealTimers();
    mockLoadGate = null;
  });

  it('draws every control row before the text arrives, so nothing moves when it does', async () => {
    jest.useFakeTimers({ now: at(JERUSALEM, '2026-10-28T07:00'), doNotFake: [...ONLY_DATE] });
    useUserStore.getState().reset();
    useUserStore.setState({
      language: 'he',
      location: JERUSALEM,
      inIsrael: true,
      nusach: 'ashkenaz',
      siddurCompassPrompt: false,
    });
    for (const key of Object.keys(mockParams)) delete mockParams[key];
    Object.assign(mockParams, { id: 'shacharit', date: '2026-10-28' });
    let release: () => void = () => {};
    mockLoadGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    renderWithTheme(<SiddurReaderScreen />);
    await act(async () => {});

    expect(screen.queryByText(FIRST_LINE)).toBeNull();
    expect(screen.getByText('טוען את הנוסח…')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'בחר חלק: …' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'במניין' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'ביחיד' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'הוסף סימנייה' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'סימניות' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'גלילה אוטומטית' })).toBeOnTheScreen();

    await act(async () => release());
    await screen.findAllByText(FIRST_LINE);
    await act(async () => {});
    expect(screen.queryByRole('button', { name: 'בחר חלק: …' })).toBeNull();
    expect(screen.getByRole('button', { name: /^בחר חלק: / })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'במניין' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'הוסף סימנייה' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'סימניות' })).toBeEnabled();
  });
});

describe('the siddur reader mitzvah settings pill', () => {
  const SETTINGS = 'הגדרות המצווה';

  beforeEach(() => {
    mockRouter.push.mockClear();
    mockRouter.back.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it("opens the mitzvah's screen from a mitzvah text", async () => {
    await openShacharit();
    fireEvent.press(screen.getByRole('button', { name: SETTINGS }));
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/mitzvah/[id]', params: { id: 'shacharit' } });
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('sits first in the header actions, before the star and the bookmarks', async () => {
    await openShacharit();
    const all = screen.getAllByRole('button');
    const indexes = [
      screen.getByRole('button', { name: SETTINGS }),
      screen.getByRole('button', { name: 'הוסף סימנייה' }),
      screen.getByRole('button', { name: 'סימניות' }),
    ].map((control) => all.indexOf(control));
    expect(indexes[0]).toBeGreaterThanOrEqual(0);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
    expect(new Set(indexes).size).toBe(3);
  });

  it('goes back to the mitzvah screen that opened the reader, and pushes it for any other opener', async () => {
    await openShacharit();
    mockParams.from = 'shacharit';
    screen.rerender(<SiddurReaderScreen />);
    fireEvent.press(screen.getByRole('button', { name: SETTINGS }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).not.toHaveBeenCalled();

    mockParams.from = 'mincha';
    screen.rerender(<SiddurReaderScreen />);
    fireEvent.press(screen.getByRole('button', { name: SETTINGS }));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/mitzvah/[id]', params: { id: 'shacharit' } });
  });

  it('has none for a text no mitzvah links to', async () => {
    jest.useFakeTimers({ now: at(JERUSALEM, '2026-10-28T13:00'), doNotFake: [...ONLY_DATE] });
    useUserStore.getState().reset();
    useUserStore.setState({
      language: 'he',
      location: JERUSALEM,
      inIsrael: true,
      nusach: 'ashkenaz',
      siddurCompassPrompt: false,
    });
    for (const key of Object.keys(mockParams)) delete mockParams[key];
    Object.assign(mockParams, { id: 'birkat_hamazon' });
    renderWithTheme(<SiddurReaderScreen />);
    await screen.findByRole('button', { name: 'הוסף סימנייה' });
    expect(screen.queryByRole('button', { name: SETTINGS })).toBeNull();
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
    expect(await screen.findByRole('button', { name: `בחר חלק: ${CHAPTER}` })).toBeOnTheScreen();
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

  async function openKeyed(params: Record<string, string>, nusach?: Nusach, compassPrompt = false) {
    jest.useFakeTimers({ now: at(JERUSALEM, '2026-10-28T07:00'), doNotFake: [...ONLY_DATE] });
    useUserStore.getState().reset();
    useUserStore.setState({
      language: 'he',
      location: JERUSALEM,
      inIsrael: true,
      nusach: 'ashkenaz',
      siddurCompassPrompt: compassPrompt,
    });
    mockLoadedText = keyedText(params.id, nusach);
    for (const key of Object.keys(mockParams)) delete mockParams[key];
    Object.assign(mockParams, params);
    renderWithTheme(<SiddurReaderScreen />);
    await screen.findByText(MID_2);
    await act(async () => {});
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

  it('asks, when the text has bookmarks, whether to add a new one or move one here', async () => {
    useSiddurBookmarksStore.setState({
      bookmarks: [bookmark('ישנה', 'shacharit', 'ashkenaz', 1, 'k-open-1'), bookmark('מנחה', 'mincha', 'ashkenaz', 2)],
    });
    await openKeyed(SHACHARIT, 'ashkenaz');
    measureKeyed();
    await scrollList(476);
    fireEvent.press(screen.getByRole('button', { name: 'הוסף סימנייה' }));
    expect(screen.getByText('שמירת סימנייה')).toBeOnTheScreen();
    expect(screen.getByText('סימנייה חדשה')).toBeOnTheScreen();
    expect(screen.getByText('ישנה')).toBeOnTheScreen();
    expect(screen.queryByText('מנחה')).toBeNull();
    expect(useSiddurBookmarksStore.getState().bookmarks).toHaveLength(2);

    fireEvent.press(screen.getByText('ישנה'));
    expect(useSiddurBookmarksStore.getState().bookmarks).toEqual([
      {
        id: 'bookmark_1',
        textId: 'shacharit',
        nusach: 'ashkenaz',
        sectionTitle: 'אמצע',
        segmentKey: 'k-mid-2',
        label: 'אמצע · שְׁמַע יִשְׂרָאֵל יְהוָה',
        createdAt: NOW,
      },
      bookmark('מנחה', 'mincha', 'ashkenaz', 2),
    ]);
    expect(screen.getByText('הסימנייה הועברה')).toBeOnTheScreen();
    expect(screen.queryByText('שמירת סימנייה')).toBeNull();
  });

  it('adds a new bookmark from the save sheet and keeps the others', async () => {
    useSiddurBookmarksStore.setState({ bookmarks: [bookmark('ישנה', 'shacharit', 'ashkenaz', 1, 'k-open-1')] });
    await openKeyed(SHACHARIT, 'ashkenaz');
    measureKeyed();
    await scrollList(476);
    fireEvent.press(screen.getByRole('button', { name: 'הוסף סימנייה' }));
    fireEvent.press(screen.getByText('סימנייה חדשה'));
    const { bookmarks } = useSiddurBookmarksStore.getState();
    expect(bookmarks.map((entry) => entry.segmentKey)).toEqual(['k-mid-2', 'k-open-1']);
    expect(screen.getByText('נוספה סימנייה')).toBeOnTheScreen();
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

  it('lands on the passage a search result names by its segment key, with no resume offer', async () => {
    seedPosition('tehillim', { nusach: null, appDay: '2026-10-27' });
    await openKeyed({ id: 'tehillim', segment: 'k-mid-2' });
    expect(resumeBanner()).toBeNull();
    expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ index: 1, animated: false }));
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

  it('holds auto-scroll while the compass offer shows', async () => {
    await openKeyed(SHACHARIT, undefined, true);
    const idle = liveChangeListeners();
    act(() => useUserStore.getState().setSiddurAutoScroll(true));
    expect(liveChangeListeners()).toBe(idle);

    fireEvent.press(screen.getByRole('button', { name: 'לא' }));
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
    useUserStore.setState({
      language,
      location: JERUSALEM,
      inIsrael: true,
      nusach: 'ashkenaz',
      siddurCompassPrompt: false,
    });
    useCompletionsStore.getState().reset();
    useCustomMitzvotStore.getState().reset();
    useCustomMitzvotStore.getState().add(nightStudy(...hours));
    for (const key of Object.keys(mockParams)) delete mockParams[key];
    Object.assign(mockParams, { id: CUSTOM_ID, ...(date ? { date } : {}) });
    renderWithTheme(<SiddurReaderScreen />);
    await screen.findByText(CUSTOM_TEXT);
    await act(async () => {});
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

  it("opens the custom mitzvah's own screen from its text, which draws no bookmark pills", async () => {
    mockRouter.push.mockClear();
    await openCustom(['10:00', '11:00'], '2027-06-14T10:15', '2027-06-14');
    expect(screen.queryByRole('button', { name: 'הוסף סימנייה' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'הגדרות המצווה' }));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/mitzvah/[id]', params: { id: CUSTOM_ID } });
  });

  it("still files סיימתי under the evening's date", async () => {
    await openCustom(['00:30', '01:30'], '2027-06-15T00:45', '2027-06-14');
    fireEvent.press(screen.getByRole('button', { name: 'סיימתי' }));
    const { completions } = useCompletionsStore.getState();
    expect(completions['2027-06-14'][CUSTOM_ID]).toBeGreaterThan(0);
    expect(completions['2027-06-15']).toBeUndefined();
  });
});

describe('the siddur reader folds its controls while the user reads', () => {
  const FULL = 300;
  const COMPACT = 56;
  const MID_2 = 'שְׁמַע יִשְׂרָאֵל יְהוָה אֱלֹהֵינוּ';
  const EXPAND = 'הצג את כלי הקריאה';
  const RESUME = 'להמשיך מהמקום שבו עצרת?';
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
        { key: 'k-mid-1', he: [[{ t: 'בָּרוּךְ אַתָּה יְהוָה אֱלֹהֵינוּ' }]] },
        { key: 'k-mid-2', he: [[{ t: MID_2 }]] },
      ],
    },
  ];
  let scrollSpy: jest.SpyInstance;
  let offsetSpy: jest.SpyInstance;

  const layout = (testID: string, y: number, height: number) =>
    fireEvent(screen.getByTestId(testID, { hidden: true }), 'layout', {
      nativeEvent: { layout: { x: 0, y, width: 360, height } },
    });
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
  async function dragTo(y: number) {
    fireEvent(screen.getByTestId('siddur-list'), 'scrollBeginDrag', scrollEvent(y));
    await scrollList(y);
    fireEvent(screen.getByTestId('siddur-list'), 'scrollEndDrag', scrollEvent(y));
  }
  async function openTools() {
    fireEvent.press(
      within(screen.getByTestId('siddur-header-compact', { hidden: true })).getByRole('button', { name: EXPAND }),
    );
    await act(async () => {});
  }
  const animated = (testID: string) => getAnimatedStyle(screen.getByTestId(testID, { hidden: true }));
  const folded = () => screen.getByTestId('siddur-header-compact', { hidden: true }).props.pointerEvents === 'auto';
  const pause = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));
  const later = (ms: number) => act(() => jest.setSystemTime(Date.now() + ms));
  const saved = () => useSiddurBookmarksStore.getState().lastPositions;
  const seed = () =>
    useSiddurBookmarksStore.setState({
      lastPositions: {
        shacharit: {
          nusach: 'ashkenaz',
          sectionTitle: 'אמצע',
          segmentKey: 'k-mid-2',
          appDay: '2026-10-28',
          savedAt: 0,
        },
      },
    });

  async function open() {
    jest.useFakeTimers({ now: at(JERUSALEM, '2026-10-28T07:00'), doNotFake: [...ONLY_DATE] });
    useUserStore.getState().reset();
    useUserStore.setState({
      language: 'he',
      location: JERUSALEM,
      inIsrael: true,
      nusach: 'ashkenaz',
      siddurCompassPrompt: false,
    });
    mockLoadedText = { nusach: 'ashkenaz', id: 'shacharit', credits: [], sections: KEYED };
    for (const key of Object.keys(mockParams)) delete mockParams[key];
    Object.assign(mockParams, { id: 'shacharit', date: '2026-10-28' });
    renderWithTheme(<SiddurReaderScreen />);
    await screen.findByText(MID_2);
    await act(async () => {});
    layout('siddur-header-full', 0, FULL);
    layout('siddur-header-compact', 0, COMPACT);
    layout('siddur-section-פתיחה', 0, 300);
    layout('siddur-section-אמצע', 0, 400);
    layout('siddur-segment-k-mid-1', 60, 80);
    layout('siddur-segment-k-mid-2', 150, 80);
  }

  beforeEach(() => {
    useSiddurBookmarksStore.getState().reset();
    scrollSpy = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => {});
    offsetSpy = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    mockLoadedText = null;
  });

  it('opens with every control and no compact bar', async () => {
    await open();
    expect(folded()).toBe(false);
    expect(screen.getByTestId('siddur-header-full').props.pointerEvents).toBe('auto');
    expect(screen.getByRole('switch', { name: 'גלילה אוטומטית' })).toBeOnTheScreen();
    expect(screen.queryByHintText(EXPAND)).toBeNull();
  });

  it('draws the overlay inside the safe area, not on its border', async () => {
    await open();
    const hostParent = (node: ReturnType<typeof screen.getByTestId>) => {
      let current = node.parent;
      while (current && typeof current.type !== 'string') current = current.parent;
      return current!;
    };
    const stage = hostParent(screen.getByTestId('siddur-header-overlay'));
    expect(stage.type).not.toBe('RNCSafeAreaView');
    expect(hostParent(stage).type).toBe('RNCSafeAreaView');
    expect(hostParent(screen.getByTestId('siddur-list'))).toBe(stage);
    expect(StyleSheet.flatten(screen.getByTestId('siddur-header-overlay').props.style)).toMatchObject({
      position: 'absolute',
      top: 0,
    });
  });

  it('stays open within the height of the full block, however far the text scrolls', async () => {
    await open();
    await scrollList(100);
    await scrollList(200);
    await scrollList(FULL - 1);
    expect(folded()).toBe(false);
  });

  it('scrolls the full block away with the text from the first point', async () => {
    await open();
    await scrollList(40);
    expect(folded()).toBe(false);
    expect(animated('siddur-header-full')).toMatchObject({
      opacity: 1,
      transform: [{ translateY: -40 }],
    });
    expect(animated('siddur-header-overlay')).toMatchObject({ height: FULL - 40 });
    await scrollList(FULL - 20);
    expect(animated('siddur-header-overlay')).toMatchObject({ height: COMPACT });
  });

  it('folds as soon as the text scrolls past the full block', async () => {
    await open();
    await scrollList(FULL - 1);
    expect(folded()).toBe(false);
    await scrollList(FULL);
    expect(folded()).toBe(true);
    expect(screen.getByTestId('siddur-header-full', { hidden: true }).props.pointerEvents).toBe('none');
    const bar = screen.getByHintText(EXPAND);
    expect(bar).toBeOnTheScreen();
    expect(bar).toHaveProp('accessibilityLabel', 'תפילת שחרית');
    expect(
      within(screen.getByTestId('siddur-header-compact', { hidden: true })).getByRole('button', { name: 'חזור' }),
    ).toBeOnTheScreen();
  });

  it('never unfolds on a scroll up, slow or fast', async () => {
    await open();
    await scrollList(600);
    expect(folded()).toBe(true);
    await dragTo(580);
    await dragTo(450);
    fireEvent(screen.getByTestId('siddur-list'), 'scrollBeginDrag', scrollEvent(450));
    for (const y of [440, 430, 420, 410]) {
      await later(80);
      await scrollList(y);
    }
    expect(folded()).toBe(true);
  });

  it('opens every control from the tools button and folds them again on a scroll down', async () => {
    await open();
    await scrollList(600);
    const tools = within(screen.getByTestId('siddur-header-compact', { hidden: true })).getByRole('button', {
      name: EXPAND,
    });
    expect(tools).toHaveTextContent('כלים');
    fireEvent.press(tools);
    await act(async () => {});
    expect(folded()).toBe(false);
    await dragTo(606);
    expect(folded()).toBe(false);
    await dragTo(620);
    expect(folded()).toBe(true);
  });

  it('folds the opened controls again on a scroll up too', async () => {
    await open();
    await scrollList(600);
    await openTools();
    await dragTo(594);
    expect(folded()).toBe(false);
    await dragTo(580);
    expect(folded()).toBe(true);
  });

  it('opens and folds the controls on a quick double tap on the text', async () => {
    await open();
    const list = screen.getByTestId('siddur-list');
    const tap = (x: number, y: number) => {
      fireEvent(list, 'touchStart', { nativeEvent: { pageX: x, pageY: y, touches: [{}] } });
      fireEvent(list, 'touchEnd', { nativeEvent: { pageX: x, pageY: y, touches: [] } });
    };
    tap(180, 400);
    tap(182, 402);
    await act(async () => {});
    expect(folded()).toBe(false);
    await scrollList(600);
    expect(folded()).toBe(true);
    tap(180, 400);
    await act(async () => {});
    expect(folded()).toBe(true);
    tap(182, 402);
    await act(async () => {});
    expect(folded()).toBe(false);
    tap(180, 400);
    tap(180, 400);
    await act(async () => {});
    expect(folded()).toBe(true);
    tap(100, 300);
    tap(260, 520);
    await act(async () => {});
    expect(folded()).toBe(true);
  });

  it('turns auto-scroll on and off from the compact bar', async () => {
    await open();
    await scrollList(600);
    const bar = within(screen.getByTestId('siddur-header-compact', { hidden: true }));
    expect(useUserStore.getState().siddurAutoScroll).toBe(false);
    fireEvent.press(bar.getByRole('switch', { name: 'גלילה אוטומטית' }));
    expect(useUserStore.getState().siddurAutoScroll).toBe(true);
    fireEvent.press(bar.getByRole('switch', { name: 'גלילה אוטומטית' }));
    expect(useUserStore.getState().siddurAutoScroll).toBe(false);
  });

  it('does not unfold on a fast flick up, however far it goes', async () => {
    await open();
    await scrollList(1200);
    fireEvent(screen.getByTestId('siddur-list'), 'scrollBeginDrag', scrollEvent(1200));
    for (const y of [1160, 1100, 1020, 940]) {
      await later(16);
      await scrollList(y);
    }
    fireEvent(screen.getByTestId('siddur-list'), 'scrollEndDrag', scrollEvent(940));
    expect(folded()).toBe(true);
  });

  it('does not unfold during the momentum of a fling up', async () => {
    await open();
    await scrollList(1200);
    fireEvent(screen.getByTestId('siddur-list'), 'momentumScrollBegin', scrollEvent(1200));
    for (const y of [1180, 1150, 1120, 1100]) {
      await later(100);
      await scrollList(y);
    }
    expect(folded()).toBe(true);
  });

  it('does not unfold when the list corrects its height mid-fling', async () => {
    await open();
    await scrollList(600);
    fireEvent(screen.getByTestId('siddur-list'), 'momentumScrollBegin', scrollEvent(600));
    await scrollList(700);
    fireEvent.scroll(screen.getByTestId('siddur-list'), {
      nativeEvent: {
        contentOffset: { x: 0, y: 640 },
        contentSize: { width: 360, height: 1940 },
        layoutMeasurement: { width: 360, height: 640 },
      },
    });
    await act(async () => {});
    expect(folded()).toBe(true);
  });

  it('does not unfold on the small reverse move of a finger lifting', async () => {
    await open();
    await scrollList(600);
    fireEvent(screen.getByTestId('siddur-list'), 'scrollBeginDrag', scrollEvent(600));
    await scrollList(700);
    await scrollList(694);
    fireEvent(screen.getByTestId('siddur-list'), 'scrollEndDrag', scrollEvent(694));
    expect(folded()).toBe(true);
  });

  it('does not unfold on an upward move nobody dragged', async () => {
    await open();
    await scrollList(600);
    await scrollList(560);
    expect(folded()).toBe(true);
  });

  it('does not unfold on the bounce back from the end of the text', async () => {
    await open();
    await scrollList(600);
    fireEvent(screen.getByTestId('siddur-list'), 'momentumScrollBegin', scrollEvent(1300));
    await scrollList(1400);
    await scrollList(1360);
    await scrollList(1361);
    await scrollList(1360);
    expect(folded()).toBe(true);
    await dragTo(1320);
    expect(folded()).toBe(true);
  });

  it('unfolds on a tap on the compact bar', async () => {
    await open();
    await scrollList(600);
    fireEvent.press(screen.getByHintText(EXPAND));
    await act(async () => {});
    expect(folded()).toBe(false);
  });

  it('unfolds when the text scrolls back into the height of the full block', async () => {
    await open();
    await scrollList(600);
    await scrollList(FULL - 10);
    expect(folded()).toBe(false);
  });

  it('never stays folded at the top, even during a freeze', async () => {
    await open();
    await scrollList(600);
    layout('siddur-header-full', 0, FULL + 40);
    await act(async () => {});
    expect(folded()).toBe(true);
    await scrollList(0);
    expect(folded()).toBe(false);
    expect(animated('siddur-header-overlay')).toMatchObject({ height: FULL + 40 });
  });

  it('keeps a full block brought back mid-text over the text until the top', async () => {
    await open();
    await scrollList(600);
    await openTools();
    expect(folded()).toBe(false);
    await dragTo(100);
    expect(folded()).toBe(false);
    expect(animated('siddur-header-full')).toMatchObject({
      transform: [{ translateY: 0 }],
    });
    await dragTo(0);
    await dragTo(60);
    expect(animated('siddur-header-full')).toMatchObject({
      transform: [{ translateY: -60 }],
    });
  });

  it('keeps its state through a jump to a place until the freeze ends', async () => {
    seed();
    await open();
    fireEvent.press(screen.getByText('המשך'));
    expect(scrollSpy).toHaveBeenCalledWith({ index: 1, animated: false, viewOffset: FULL - 150 });
    await scrollList(900);
    expect(folded()).toBe(false);
    await scrollList(FULL + 100);
    expect(folded()).toBe(false);
    await later(700);
    await scrollList(FULL + 150);
    expect(folded()).toBe(true);
  });

  it('lands a place under the full block when unfolded and under the bar when folded', async () => {
    await open();
    await scrollList(766 - COMPACT);
    expect(folded()).toBe(true);
    await pause(1100);
    expect(saved().shacharit.segmentKey).toBe('k-mid-2');
    await dragTo(766 - FULL);
    await openTools();
    await dragTo(766 - FULL - 4);
    await dragTo(766 - FULL);
    expect(folded()).toBe(false);
    await pause(1100);
    expect(saved().shacharit.segmentKey).toBe('k-mid-2');
  });

  it('names the section under the cover in the picker once the controls come back', async () => {
    await open();
    await scrollList(400);
    expect(folded()).toBe(true);
    await later(300);
    await dragTo(360);
    await openTools();
    expect(folded()).toBe(false);
    expect(screen.getByRole('button', { name: 'בחר חלק: אמצע' })).toBeOnTheScreen();
  });

  it('moves the list neither for a sub-point change of the full block nor in the middle of a drag', async () => {
    await open();
    await scrollList(600);
    offsetSpy.mockClear();
    layout('siddur-header-full', 0, FULL + 0.4);
    await act(async () => {});
    expect(offsetSpy).not.toHaveBeenCalled();
    fireEvent(screen.getByTestId('siddur-list'), 'scrollBeginDrag', scrollEvent(600));
    layout('siddur-header-full', 0, FULL + 40);
    await act(async () => {});
    expect(offsetSpy).not.toHaveBeenCalled();
  });

  it('keeps the text where it is when the full block grows or shrinks while scrolled', async () => {
    await open();
    await scrollList(600);
    layout('siddur-header-full', 0, FULL + 40);
    await act(async () => {});
    expect(offsetSpy).toHaveBeenCalledWith({ offset: 640, animated: false });
    offsetSpy.mockClear();
    await scrollList(640);
    layout('siddur-header-full', 0, FULL);
    await act(async () => {});
    expect(offsetSpy).toHaveBeenCalledWith({ offset: 600, animated: false });
  });

  it('leaves the offset alone when the full block changes near the top', async () => {
    await open();
    await scrollList(100);
    layout('siddur-header-full', 0, FULL + 40);
    await act(async () => {});
    expect(offsetSpy).not.toHaveBeenCalled();
  });

  it('shows the resume offer under the full block, hides it when folded and brings it back', async () => {
    seed();
    await open();
    expect(within(screen.getByTestId('siddur-header-full')).getByText(RESUME)).toBeOnTheScreen();
    await scrollList(600);
    expect(folded()).toBe(true);
    expect(screen.getByTestId('siddur-header-full', { hidden: true }).props.pointerEvents).toBe('none');
    expect(screen.queryByText(RESUME)).toBeNull();
    fireEvent.press(screen.getByHintText(EXPAND));
    await act(async () => {});
    expect(folded()).toBe(false);
    expect(screen.getByText(RESUME)).toBeOnTheScreen();
  });
});

describe('the siddur reader compass offer', () => {
  const TITLE = 'לפתוח מצפן תפילה?';
  const BODY = 'אם הודעה זאת מפריעה לך, אפשר לכבות אותה בהגדרות בחלק של הסידור';
  const PILL = 'פתח מצפן תפילה';

  async function openPrayer(params: Record<string, string>, prompt = true) {
    jest.useFakeTimers({ now: at(JERUSALEM, '2026-10-28T07:00'), doNotFake: [...ONLY_DATE] });
    useUserStore.getState().reset();
    useUserStore.setState({
      language: 'he',
      location: JERUSALEM,
      inIsrael: true,
      nusach: 'ashkenaz',
      siddurCompassPrompt: prompt,
    });
    mockLoadedText = null;
    for (const key of Object.keys(mockParams)) delete mockParams[key];
    Object.assign(mockParams, params);
    renderWithTheme(<SiddurReaderScreen />);
    await screen.findByTestId('siddur-list');
    await act(async () => {});
  }

  beforeEach(() => mockRouter.push.mockClear());
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it.each(['shacharit', 'mincha', 'maariv'])('offers the compass on opening %s', async (id) => {
    await openPrayer({ id, date: '2026-10-28' });
    expect(screen.getByText(TITLE)).toBeOnTheScreen();
    expect(screen.getByText(BODY)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'כן' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'לא' })).toBeOnTheScreen();
    expect(screen.getByTestId('confirm-dialog-countdown', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('לא closes the offer at once and opens nothing', async () => {
    await openPrayer({ id: 'shacharit', date: '2026-10-28' });
    fireEvent.press(screen.getByRole('button', { name: 'לא' }));
    expect(screen.queryByText(TITLE)).toBeNull();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('כן opens the compass with the prayer and its date', async () => {
    await openPrayer({ id: 'shacharit', date: '2026-10-28' });
    fireEvent.press(screen.getByRole('button', { name: 'כן' }));
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/compass',
      params: { prayer: 'shacharit', date: '2026-10-28' },
    });
    expect(screen.queryByText(TITLE)).toBeNull();
  });

  it('opened without a date, כן sends the prayer alone', async () => {
    await openPrayer({ id: 'shacharit' });
    fireEvent.press(screen.getByRole('button', { name: 'כן' }));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/compass', params: { prayer: 'shacharit' } });
  });

  it('offers nothing when the setting is off, and keeps the pill', async () => {
    await openPrayer({ id: 'shacharit', date: '2026-10-28' }, false);
    expect(screen.queryByText(TITLE)).toBeNull();
    expect(screen.getByRole('button', { name: PILL })).toBeOnTheScreen();
  });

  it('the pill opens the compass', async () => {
    await openPrayer({ id: 'shacharit', date: '2026-10-28' }, false);
    fireEvent.press(screen.getByRole('button', { name: PILL }));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/compass',
      params: { prayer: 'shacharit', date: '2026-10-28' },
    });
  });

  it('offers nothing and draws no pill for another text', async () => {
    await openPrayer({ id: 'tefillin', date: '2026-10-28' });
    expect(screen.queryByText(TITLE)).toBeNull();
    expect(screen.queryByRole('button', { name: PILL })).toBeNull();
  });

  it('offers nothing when the compass sent the reader back', async () => {
    await openPrayer({ id: 'shacharit', date: '2026-10-28', fromCompass: '1' });
    expect(screen.queryByText(TITLE)).toBeNull();
    expect(screen.getByRole('button', { name: PILL })).toBeOnTheScreen();
  });

  it('runs no countdown with a screen reader on', async () => {
    jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(true);
    await openPrayer({ id: 'shacharit', date: '2026-10-28' });
    expect(screen.getByText(TITLE)).toBeOnTheScreen();
    expect(screen.queryByTestId('confirm-dialog-countdown', { includeHiddenElements: true })).toBeNull();
  });

  it('offers nothing and draws no pill on the web', async () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });
    try {
      await openPrayer({ id: 'shacharit', date: '2026-10-28' });
      expect(screen.queryByText(TITLE)).toBeNull();
      expect(screen.queryByRole('button', { name: PILL })).toBeNull();
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original });
    }
  });
});
