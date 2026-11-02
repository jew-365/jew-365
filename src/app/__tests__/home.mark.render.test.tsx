const mockPush = jest.fn();
const mockNavigation = { isFocused: () => true, addListener: () => () => {} };

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }), useNavigation: () => mockNavigation }));
jest.mock('expo-status-bar', () => ({ setStatusBarStyle: jest.fn() }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));
jest.mock('@/services/NotificationScheduler', () => ({
  NotificationScheduler: { cancelForMitzvah: async () => {}, settleCheckIn: async () => {}, rebuild: async () => {} },
  syncNotificationPermissionStatus: async () => {},
  dismissCompletedPresentedNotifications: async () => {},
  refreshSchedulingOnForeground: async () => {},
}));
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  __esModule: true,
  useReducedMotion: jest.fn(() => false),
}));

import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { getAnimatedStyle, useReducedMotion } from 'react-native-reanimated';
import HomeScreen from '../(tabs)/home';
import { CITIES } from '@/data/cities';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { HomeLook, useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { mockWindowRects } from '@/testing/viewport';
import { at } from '@/testing/zmanim';
import { durations } from '@/theme/tokens';
import * as timeline from '@/utils/buildDayTimeline';

type Node = ReturnType<typeof screen.getByTestId>;

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

function seedStores(enabled: string[]) {
  useUserStore.getState().reset();
  useUserStore.setState({
    language: 'he',
    location: JERUSALEM,
    inIsrael: true,
    nusach: 'ashkenaz',
    isOnboarded: true,
    locationStatus: 'ready',
    locationSource: 'manual',
    notificationsEnabled: true,
    notificationPermission: 'granted',
    gender: 'male',
    maritalStatus: 'single',
  });
  useCompletionsStore.getState().reset();
  useCustomMitzvotStore.getState().reset();
  useMitzvotStore.setState({ activeMitzvot: Object.fromEntries(enabled.map((id) => [id, { enabled: true }])) });
}

describe('home on a mark', () => {
  beforeEach(() => {
    seedStores(['maariv']);
    jest.useFakeTimers({ now: at(JERUSALEM, '2027-06-15T00:20'), doNotFake: [...ONLY_DATE] });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('computes the day model once for a mark, the stamp start and the stamp end included', async () => {
    const windows = jest.spyOn(timeline, 'appDayWindow');
    renderWithTheme(<HomeScreen />);
    const settled = windows.mock.calls.length;
    expect(settled).toBeGreaterThan(0);

    fireEvent.press(screen.getByRole('button', { name: 'סמן תפילת ערבית כהושלם' }));
    expect(screen.getByTestId('now-card-done-button')).toBeOnTheScreen();
    expect(windows.mock.calls.length - settled).toBe(1);

    await waitFor(() => expect(screen.queryByTestId('now-card-done-button')).toBeNull(), { timeout: 3000 });
    expect(windows.mock.calls.length - settled).toBe(1);
    expect(screen.getByRole('button', { name: 'ביטול סימון - תפילת ערבית' })).toBeOnTheScreen();
  });
});

// The owner's recording of 2026-11-02: two open cards, the first marked. Animations run on the real clock here, so a
// replayed entrance shows as an opacity under 1.
describe('home when its two open cards are marked', () => {
  const KS = 'krias_shma_shacharit';
  const NEXT = 'shacharit';
  const TWO_OPEN = 'פתוח עכשיו (2)';
  const ONE_OPEN = 'פתוח עכשיו (1)';
  const NONE_OPEN = 'פתוח עכשיו (0)';
  const ANIMATED = [...ONLY_DATE, 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] as const;
  let rects: ReturnType<typeof mockWindowRects>;

  type Sample = {
    heading: string;
    card: boolean;
    next: number;
    day: 'active' | 'done' | 'absent';
    dayOpacity: number;
    nextDayOpacity: number;
  };

  const pause = (ms: number) => act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  // The opacity of the Reveal around an element: its nearest host ancestor animated with a rise.
  function revealOpacity(testID: string): number {
    let node: Node | null = screen.getByTestId(testID).parent;
    while (node && !(typeof node.type === 'string' && node.props.jestAnimatedStyle?.value?.transform)) {
      node = node.parent;
    }
    if (!node) throw new Error(`no Reveal around ${testID}`);
    return Number(getAnimatedStyle(node).opacity);
  }

  function dayState(id = KS): Sample['day'] {
    const entry = screen.queryByTestId(`home-day-${id}`);
    if (!entry) return 'absent';
    return within(entry).queryByText(/^בוצע ב-/) ? 'done' : within(entry).queryByText(/^פתוח · /) ? 'active' : 'absent';
  }

  function sample(): Sample {
    const day = dayState();
    return {
      heading: String(screen.getByText(/^פתוח עכשיו/).props.children),
      card: screen.queryByTestId(`home-now-${KS}`) !== null,
      next: revealOpacity(`home-now-${NEXT}`),
      day,
      dayOpacity: day === 'absent' ? 0 : revealOpacity(`home-day-${KS}`),
      nextDayOpacity: revealOpacity(`home-day-${NEXT}`),
    };
  }

  const changes = <T,>(values: T[]) => values.filter((value, index) => index === 0 || value !== values[index - 1]);
  const markCard = (id: string) =>
    fireEvent.press(within(screen.getByTestId(`home-now-${id}`)).getByRole('button', { name: /^סמן .* כהושלם$/ }));
  const markFirst = () => markCard(KS);

  async function markAndWatch(look: HomeLook): Promise<Sample[]> {
    useUserStore.setState({ homeLook: look });
    renderWithTheme(<HomeScreen />);
    await waitFor(
      () =>
        expect(sample()).toEqual({
          heading: TWO_OPEN,
          card: true,
          next: 1,
          day: 'active',
          dayOpacity: 1,
          nextDayOpacity: 1,
        }),
      { timeout: 3000 },
    );
    const tapped = performance.now();
    markFirst();
    const samples = [sample()];
    const watching = () => {
      const waited = performance.now() - tapped;
      return waited < 5000 && (waited < durations.stamp + 500 || samples[samples.length - 1].card);
    };
    while (watching()) {
      await pause(25);
      samples.push(sample());
    }
    return samples;
  }

  beforeEach(() => {
    seedStores([KS, NEXT]);
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    rects = mockWindowRects(800);
    rects.set({ y: 100, height: 100 });
    jest.useFakeTimers({ now: at(JERUSALEM, '2027-06-15T07:00'), doNotFake: [...ANIMATED] });
  });

  afterEach(() => {
    rects.restore();
    jest.useRealTimers();
  });

  it.each<HomeLook>(['rail', 'cards', 'rings'])(
    '%s: the card leaves once, with the count and My day, and nothing else enters again',
    async (look) => {
      const samples = await markAndWatch(look);
      expect(changes(samples.map((s) => s.heading))).toEqual([TWO_OPEN, ONE_OPEN]);
      expect(samples.every((s) => s.card === (s.heading === TWO_OPEN))).toBe(true);
      expect(changes(samples.map((s) => s.day))).toEqual(['active', 'done']);
      expect(samples.every((s) => (s.day === 'done') === !s.card)).toBe(true);
      expect(Math.min(...samples.map((s) => s.next))).toBe(1);
      expect(Math.min(...samples.map((s) => s.dayOpacity))).toBe(1);
      expect(Math.min(...samples.map((s) => s.nextDayOpacity))).toBe(1);
    },
  );

  it('under reduced motion updates the count, the card and My day in one step, with no entrance', async () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    const samples = await markAndWatch('rail');
    expect(changes(samples.map((s) => s.heading))).toEqual([TWO_OPEN, ONE_OPEN]);
    expect(samples.every((s) => s.card === (s.heading === TWO_OPEN))).toBe(true);
    expect(samples.every((s) => (s.day === 'done') === !s.card)).toBe(true);
    expect(changes(samples.map((s) => s.day))).toEqual(['active', 'done']);
    expect(Math.min(...samples.map((s) => Math.min(s.next, s.dayOpacity, s.nextDayOpacity)))).toBe(1);
  });

  it('ends the stamp one hold after the commit that starts the close, however often the card is tapped', () => {
    jest.useFakeTimers({ now: at(JERUSALEM, '2027-06-15T07:00') });
    renderWithTheme(<HomeScreen />);
    const openCount = () => screen.getByText(/^פתוח עכשיו/).props.children;
    markFirst();
    act(() => jest.advanceTimersByTime(600));
    markFirst();
    act(() => jest.advanceTimersByTime(durations.stamp - 600 - 1));
    expect(screen.getByTestId(`home-now-${KS}`)).toBeOnTheScreen();
    expect(openCount()).toBe(TWO_OPEN);
    act(() => jest.advanceTimersByTime(1));
    expect(screen.queryByTestId(`home-now-${KS}`)).toBeNull();
    expect(openCount()).toBe(ONE_OPEN);
  });

  // Marking the second card while the first still closes must not cut the first short: each card holds for its own
  // stamp, and the count and My day follow each one's end.
  it.each([false, true])('two cards marked 400 ms apart each close on their own (reduced motion: %s)', (reduce) => {
    (useReducedMotion as jest.Mock).mockReturnValue(reduce);
    jest.useFakeTimers({ now: at(JERUSALEM, '2027-06-15T07:00') });
    renderWithTheme(<HomeScreen />);
    const STEP = 10;
    const SECOND = 400;
    type Row = { t: number; heading: string; first: boolean; second: boolean; firstDay: string; secondDay: string };
    const rows: (Row & { firstOpacity: number; secondOpacity: number })[] = [];
    const cardOpacity = (id: string) => {
      const card = screen.queryByTestId(`home-now-${id}`);
      return card ? Number(card.props.jestAnimatedStyle.value.opacity) : 0;
    };
    const record = (t: number) =>
      rows.push({
        t,
        heading: String(screen.getByText(/^פתוח עכשיו/).props.children),
        first: screen.queryByTestId(`home-now-${KS}`) !== null,
        second: screen.queryByTestId(`home-now-${NEXT}`) !== null,
        firstDay: dayState(KS),
        secondDay: dayState(NEXT),
        firstOpacity: cardOpacity(KS),
        secondOpacity: cardOpacity(NEXT),
      });
    const rowAt = (t: number) => rows.find((row) => row.t === t);
    markCard(KS);
    record(0);
    for (let t = STEP; t <= durations.stamp + SECOND + 300; t += STEP) {
      act(() => jest.advanceTimersByTime(STEP));
      if (t === SECOND) {
        markCard(KS);
        markCard(NEXT);
      }
      record(t);
    }
    expect(rows.every((row) => row.first === row.t < durations.stamp)).toBe(true);
    expect(rows.every((row) => row.second === row.t < durations.stamp + SECOND)).toBe(true);
    expect(changes(rows.map((row) => row.heading))).toEqual([TWO_OPEN, ONE_OPEN, NONE_OPEN]);
    expect(rows.every((row) => row.firstDay === (row.first ? 'active' : 'done'))).toBe(true);
    expect(rows.every((row) => row.secondDay === (row.second ? 'active' : 'done'))).toBe(true);
    // Each card's own close runs on its own clock: the first is nearly gone while the second has not begun closing.
    expect(rowAt(durations.stamp - 50)).toMatchObject({ first: true, second: true, secondOpacity: 1 });
    expect(rowAt(durations.stamp - 50)?.firstOpacity).toBeLessThan(0.5);
    expect(rowAt(durations.stamp + SECOND - 50)?.secondOpacity).toBeLessThan(0.5);
  });
});
