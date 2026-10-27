jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

import {
  type Achievements,
  EMPTY_MARK_COUNTS,
  archiveMarkCounts,
  dateKey,
  mergeAchievements,
  useCompletionsStore,
} from '../useCompletionsStore';

const empty: Achievements = { badges: {}, bestStreak: null, bestWeek: null, mitzvahBest: {}, fold: null };
const range = (days: number) => ({ days, from: '2026-01-01', to: '2026-01-02' });
const week = (percent: number, due: number) => ({ weekStart: 'a', weekEnd: 'b', done: percent, due, percent });

describe('achievements in the completions store', () => {
  beforeEach(() => useCompletionsStore.getState().reset());

  it('stores the merge, and an identical save keeps the same reference', () => {
    const next = { ...empty, badges: { streak7: '2026-10-18' as const }, bestStreak: range(8) };
    useCompletionsStore.getState().saveAchievements(next);
    const saved = useCompletionsStore.getState().achievements;
    expect(saved).toEqual(next);
    useCompletionsStore.getState().saveAchievements(next);
    expect(useCompletionsStore.getState().achievements).toBe(saved);
  });

  it('reset clears the achievements and the archived marks', () => {
    useCompletionsStore.getState().saveAchievements({ ...empty, bestStreak: range(3) });
    useCompletionsStore.setState({ archivedMarks: { lastKey: '2025-01-01', total: 2, byMitzvah: { a: 2 } } });
    useCompletionsStore.getState().reset();
    expect(useCompletionsStore.getState().achievements).toBeNull();
    expect(useCompletionsStore.getState().archivedMarks).toEqual(EMPTY_MARK_COUNTS);
  });
});

describe('archiveMarkCounts', () => {
  const completions = {
    '2025-01-01': { a: 1, b: 1 },
    '2025-01-02': { a: 1 },
    '2026-11-15': { a: 1 },
  };
  const today = new Date(2026, 10, 15);

  it('counts the pruned days once', () => {
    const counted = archiveMarkCounts(EMPTY_MARK_COUNTS, completions, today);
    expect(counted).toEqual({ lastKey: '2025-01-02', total: 3, byMitzvah: { a: 2, b: 1 } });
    expect(archiveMarkCounts(counted, completions, today)).toBe(counted);
  });

  it('returns the same counts when nothing is pruned', () => {
    expect(archiveMarkCounts(EMPTY_MARK_COUNTS, { '2026-11-15': { a: 1 } }, today)).toBe(EMPTY_MARK_COUNTS);
  });
});

describe('mergeAchievements', () => {
  it('keeps the longer streak and loses to a lower one', () => {
    const merged = mergeAchievements({ ...empty, bestStreak: range(8) }, { ...empty, bestStreak: range(5) });
    expect(merged.bestStreak?.days).toBe(8);
  });

  it('keeps a badge only the previous value has, and the previous date when both have one', () => {
    const merged = mergeAchievements(
      { ...empty, badges: { streak7: '2026-01-01', fullWeek: '2026-01-05' } },
      { ...empty, badges: { streak7: '2026-02-01' } },
    );
    expect(merged.badges).toEqual({ streak7: '2026-01-01', fullWeek: '2026-01-05' });
  });

  it('takes the fold of the next value', () => {
    const fold = { through: '2026-10-21', run: range(1), mitzvahRuns: {} };
    expect(mergeAchievements({ ...empty, fold: { ...fold, through: '2026-10-01' } }, { ...empty, fold }).fold).toBe(
      fold,
    );
  });

  it('prefers a higher due at an equal best-week percent, and the best streak of each mitzvah', () => {
    const merged = mergeAchievements(
      { ...empty, bestWeek: week(90, 5), mitzvahBest: { a: range(3) } },
      { ...empty, bestWeek: week(90, 9), mitzvahBest: { a: range(2), b: range(4) } },
    );
    expect(merged.bestWeek?.due).toBe(9);
    expect(merged.mitzvahBest.a.days).toBe(3);
    expect(merged.mitzvahBest.b.days).toBe(4);
  });
});

describe('completions store hydrate', () => {
  const merge = () => useCompletionsStore.persist.getOptions().merge!;
  const current = () => useCompletionsStore.getState();
  const todayKey = () => dateKey(new Date());
  const oldPayload = () => ({
    completions: {
      '2020-01-01': { a: 1 },
      '2020-01-02': { a: 1, b: 1 },
      [todayKey()]: { a: 1 },
    },
  });

  it('reads an old payload as no achievements and counts the pruned marks once, before pruning', () => {
    const hydrated = merge()(oldPayload(), current()) as ReturnType<typeof current>;
    expect(hydrated.achievements).toBeNull();
    expect(hydrated.archivedMarks).toEqual({ lastKey: '2020-01-02', total: 3, byMitzvah: { a: 2, b: 1 } });
    expect(Object.keys(hydrated.completions)).toEqual([todayKey()]);
    expect(hydrated.archivedDays).toEqual([['2020-01-01', '2020-01-02']]);
  });

  it('does not count a day twice when the same payload is hydrated again', () => {
    const first = merge()(oldPayload(), current()) as ReturnType<typeof current>;
    const unrewritten = merge()({ ...oldPayload(), archivedMarks: first.archivedMarks }, current()) as ReturnType<
      typeof current
    >;
    expect(unrewritten.archivedMarks).toEqual(first.archivedMarks);
    const rewritten = merge()(
      { completions: first.completions, archivedDays: first.archivedDays, archivedMarks: first.archivedMarks },
      current(),
    ) as ReturnType<typeof current>;
    expect(rewritten.archivedMarks).toEqual(first.archivedMarks);
  });
});
