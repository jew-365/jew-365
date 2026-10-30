import { CITIES } from '@/data/cities';
import { findMitzvah } from '@/data/mitzvot';
import type { Mitzvah } from '@/types/mitzvah';
import { EMPTY_MARK_COUNTS, dateKey, mergeAchievements } from '@/stores/useCompletionsStore';
import { at } from '@/testing/zmanim';
import { earnedBadgeList, foldAchievements, markBadges, markTotals, nextBadges } from '../badges';
import { addDays, createDayJudge, type HistoryInput } from '../historyStats';

const J = CITIES[0];
const settings = { nusach: 'ashkenaz' as const, halachicOpinions: { ksSofZman: 'GRA' as const }, inIsrael: true };
const MARKED = [11, 12, 13, 14, 15, 16, 18, 19, 21, 22, 23, 25, 26, 27];

function inputOf(days: number[]): HistoryInput {
  return {
    mitzvot: [findMitzvah('tefillin')!],
    completions: Object.fromEntries(days.map((day) => [`2026-10-${day}`, { tefillin: 1 }])),
    location: J,
    settings,
    enabledSince: { tefillin: at(J, '2026-10-11T00:00').getTime() },
  };
}

function run(input: HistoryInput, stored: Parameters<typeof foldAchievements>[1], hero: number, wallClock: string) {
  const now = at(J, wallClock);
  return foldAchievements(input, stored, EMPTY_MARK_COUNTS, hero, now, createDayJudge(input, now));
}

describe('foldAchievements', () => {
  const first = run(inputOf(MARKED), null, 6, '2026-10-28T10:00');

  it('seeds the records and badges from the kept history', () => {
    expect(first.next.bestStreak).toEqual({ days: 8, from: '2026-10-11', to: '2026-10-19' });
    expect(first.next.mitzvahBest.tefillin).toEqual({ days: 8, from: '2026-10-11', to: '2026-10-19' });
    expect(first.next.badges).toEqual({ streak7: '2026-10-18', fullWeek: '2026-10-17', punctualWeek: '2026-10-17' });
    expect(first.next.bestWeek).toEqual({
      weekStart: '2026-10-11',
      weekEnd: '2026-10-17',
      done: 6,
      due: 6,
      percent: 100,
    });
    expect(first.next.fold).toMatchObject({
      through: '2026-10-21',
      run: { days: 1, from: '2026-10-21', to: '2026-10-21' },
    });
    expect(first.live.run).toEqual({ days: 6, from: '2026-10-21', to: '2026-10-27' });
  });

  it('resumes from the fold and keeps the best streak', () => {
    const stored = mergeAchievements(null, first.next);
    const second = run(inputOf([...MARKED, 28]), stored, 7, '2026-10-29T10:00');
    expect(second.live.run.days).toBe(7);
    expect(second.next.fold?.through).toBe('2026-10-22');
    expect(mergeAchievements(stored, second.next).bestStreak?.days).toBe(8);
  });

  it('keeps an earned badge after the marks are removed', () => {
    const without = run(inputOf(MARKED.filter((day) => day !== 18 && day !== 19)), null, 0, '2026-10-28T10:00');
    expect(without.next.badges.streak7).toBeUndefined();
    expect(mergeAchievements(first.next, without.next).badges.streak7).toBe('2026-10-18');
  });

  it('returns the stored value and zero runs when nothing was ever marked', () => {
    const empty = run({ ...inputOf([]), completions: {} }, null, 0, '2026-10-28T10:00');
    expect(empty.next).toEqual({ badges: {}, bestStreak: null, bestWeek: null, mitzvahBest: {}, fold: null });
    expect(empty.live.run.days).toBe(0);
  });
});

describe('foldAchievements edge cases', () => {
  it('seeds a streak older than the retention window from the archive and never undercounts it', () => {
    const now = at(J, '2026-10-28T10:00');
    const today = new Date(2026, 9, 28);
    const completions = Object.fromEntries(
      Array.from({ length: 400 }, (_, back) => [dateKey(addDays(today, -back)), { tefillin: 1 }]),
    );
    const input: HistoryInput = {
      mitzvot: [findMitzvah('tefillin')!],
      completions,
      archivedDays: [[dateKey(addDays(today, -526)), dateKey(addDays(today, -400))]],
      location: J,
      settings,
    };
    const result = foldAchievements(input, null, EMPTY_MARK_COUNTS, 527, now, createDayJudge(input, now));
    expect(result.live.run).toEqual({ days: 527, from: dateKey(addDays(today, -526)), to: '2026-10-28' });
    expect(result.next.bestStreak?.days).toBe(527);
    expect(result.next.badges.streak365).toBeDefined();
  });

  it('raises the best streak to the hero streak when the walk counted less', () => {
    const result = run(inputOf(MARKED), null, 40, '2026-10-28T10:00');
    expect(result.next.bestStreak).toMatchObject({ days: 40, to: '2026-10-28' });
  });

  it('does not count a week that still holds an open item', () => {
    const night: Mitzvah = {
      id: 'night',
      name: { he: 'night' },
      icon: 'night',
      timeType: 'range-within-day',
      category: 'daily-evening',
      group: 'daily',
      skipOn: [],
      nuschaotSupported: ['ashkenaz'],
      defaultReminders: [],
      computeWindow: ({ date }) => ({
        start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 20),
        end: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 3),
      }),
    };
    const input: HistoryInput = {
      mitzvot: [night],
      completions: Object.fromEntries([18, 19, 20, 21, 22, 23].map((day) => [`2026-10-${day}`, { night: 1 }])),
      location: J,
      settings,
    };
    const result = run({ ...input, mitzvot: [night] }, null, 0, '2026-10-25T01:00');
    expect(result.next.bestWeek).toBeNull();
    const later = run({ ...input, mitzvot: [night] }, null, 0, '2026-10-26T10:00');
    expect(later.next.bestWeek).toMatchObject({ weekEnd: '2026-10-24', done: 6, due: 7 });
  });
});

describe('mark badges', () => {
  const completions = inputOf(MARKED).completions;

  it('earns the thousandth mark and the hundredth of a mitzvah on the day reached', () => {
    const archived = { lastKey: '2025-09-01', total: 990, byMitzvah: { tefillin: 95 } };
    expect(markBadges(completions, archived)).toEqual({
      thousandMarks: '2026-10-22',
      'hundred:tefillin': '2026-10-15',
    });
  });

  it('leaves out the hundred of an id that is no longer known', () => {
    const archived = { lastKey: null, total: 0, byMitzvah: { tzitzit: 120, tefillin: 100 } };
    expect(Object.keys(markBadges({}, archived, '2026-10-28')).sort()).toEqual(['hundred:tefillin', 'hundred:tzitzit']);
    expect(Object.keys(markBadges({}, archived, '2026-10-28', ['tefillin']))).toEqual(['hundred:tefillin']);
  });

  it('adds the archived counts to the kept marks', () => {
    const archived = { lastKey: '2025-09-01', total: 990, byMitzvah: { tefillin: 95 } };
    expect(markTotals(completions, archived)).toEqual({ total: 1004, byMitzvah: { tefillin: 109 } });
  });
});

describe('nextBadges and earnedBadgeList', () => {
  const totals = { total: 812, byMitzvah: { tefillin: 74, shacharit: 50 } };
  const enabled = ['tefillin', 'shacharit'];

  it('lists the hundred, the thousand and the first unearned streak', () => {
    expect(nextBadges(null, totals, 12, enabled)).toEqual([
      { id: 'hundred:tefillin', done: 74, goal: 100 },
      { id: 'thousandMarks', done: 812, goal: 1000 },
      { id: 'streak7', done: 7, goal: 7 },
    ]);
  });

  it('skips the earned streaks', () => {
    const achievements = {
      badges: { streak7: '2026-10-01', streak30: '2026-10-02' },
      bestStreak: null,
      bestWeek: null,
      mitzvahBest: {},
      fold: null,
    };
    expect(nextBadges(achievements, totals, 12, enabled)[2]).toEqual({ id: 'streak100', done: 12, goal: 100 });
  });

  it('orders earned badges by day, then by kind', () => {
    const achievements = {
      badges: { streak30: '2026-09-30', fullWeek: '2026-09-14', streak7: '2026-09-14', punctualWeek: '2026-09-14' },
      bestStreak: null,
      bestWeek: null,
      mitzvahBest: {},
      fold: null,
    };
    expect(earnedBadgeList(achievements).map((badge) => badge.id)).toEqual([
      'streak7',
      'fullWeek',
      'punctualWeek',
      'streak30',
    ]);
  });
});
