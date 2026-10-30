import { CITIES } from '@/data/cities';
import { LATE_BADGE, THEMES, THEME_NAMES, contrastRatio, lateTone } from '@/theme/colors';
import { Mitzvah } from '@/types/mitzvah';
import { at } from '@/testing/zmanim';
import { FOLD_RULE, foldAchievements, markBadges, markTotals } from '../badges';
import { dayWindow } from '../buildDayTimeline';
import { calendarDay } from '../checkIn';
import {
  computeStats,
  computeStreak,
  countsAsDone,
  createDayJudge,
  judgeDayItems,
  verdictOf,
  type HistoryInput,
} from '../historyStats';
import { DayEntry, dayEntryStatusText, dayRingCounts, orderDayEntries } from '../homeDay';
import { ON_TIME_LEAD_MS, countLateMarks, lateImprove, lateMarkReport, onTimeMarkAt, windowClosed } from '../lateMarks';
import { weekSummary } from '../weeklyReport';
import { HDate, months } from '@hebcal/core';
import { EMPTY_MARK_COUNTS, dateKey, type Achievements, type Completions } from '@/stores/useCompletionsStore';

const JERUSALEM = CITIES[0];
const settings = { nusach: 'ashkenaz' as const, halachicOpinions: { ksSofZman: 'GRA' as const }, inIsrael: true };

function morning(id: string): Mitzvah {
  return {
    id,
    name: { he: id },
    icon: id,
    timeType: 'range-within-day',
    category: 'daily-morning',
    group: 'daily',
    skipOn: [],
    nuschaotSupported: ['ashkenaz'],
    defaultReminders: [],
    computeWindow: ({ zmanim }) => ({ start: zmanim.netzHaChama, end: zmanim.sofZmanShmaGra }),
  };
}

const DAILY = morning('daily');
const OTHER = morning('other');

function input(completions: Completions, late: Completions): HistoryInput {
  return { mitzvot: [DAILY], completions, late, location: JERUSALEM, settings };
}

const keysFrom = (first: string, count: number) =>
  Array.from({ length: count }, (_, index) => {
    const day = calendarDay(first, index);
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  });

const marked = (keys: string[], id = 'daily'): Completions => Object.fromEntries(keys.map((key) => [key, { [id]: 1 }]));

describe('windowClosed and onTimeMarkAt', () => {
  const start = at(JERUSALEM, '2026-05-06T06:00');
  const end = at(JERUSALEM, '2026-05-06T09:00');

  it('closes a window only after its end', () => {
    expect(windowClosed({ end }, end)).toBe(false);
    expect(windowClosed({ end }, new Date(end.getTime() + 1))).toBe(true);
  });

  it('files a mark made in time one minute before the end, never before the start', () => {
    expect(onTimeMarkAt({ start, end })).toBe(end.getTime() - ON_TIME_LEAD_MS);
    const short = { start, end: new Date(start.getTime() + 30_000) };
    expect(onTimeMarkAt(short)).toBe(start.getTime());
  });
});

describe('judging a late mark', () => {
  const day = new Date(2026, 4, 6);
  const now = at(JERUSALEM, '2026-05-07T12:00');

  it('is late, and counts as done', () => {
    const judged = judgeDayItems(day, input({ '2026-05-06': { daily: 5 } }, { '2026-05-06': { daily: 5 } }), now);
    expect(judged.items.map((item) => [item.id, item.state, item.markedAt])).toEqual([['daily', 'late', 5]]);
    expect(verdictOf(judged)).toEqual({ key: '2026-05-06', done: ['daily'], missed: [], pending: [] });
  });

  it('is done when no late flag sits beside the mark', () => {
    const judged = judgeDayItems(day, input({ '2026-05-06': { daily: 5 } }, {}), now);
    expect(judged.items[0].state).toBe('done');
  });

  it('tells which states count as done', () => {
    const states = ['done', 'late', 'missed', 'skipped', 'waiting', 'open', 'later'] as const;
    expect(states.map(countsAsDone)).toEqual([true, true, false, false, false, false, false]);
  });

  it('counts toward the percentage and keeps the day in the streak', () => {
    const completions = marked(['2026-05-05', '2026-05-06', '2026-05-07']);
    const late = { '2026-05-06': { daily: 1 } };
    const stats = computeStats([DAILY], completions, JERUSALEM, settings, 3, now, { late });
    expect(stats.perMitzvah.daily).toEqual({ done: 3, eligible: 3, pending: 0, percent: 100 });
    expect(stats.streak).toBe(3);
    expect(computeStreak(input(marked(['2026-05-06']), { '2026-05-06': { daily: 1 } }), now)).toBe(1);
    expect(computeStreak(input(marked(['2026-05-06', '2026-05-07']), { '2026-05-06': { daily: 1 } }), now)).toBe(2);
  });
});

describe('badges and records', () => {
  const week = keysFrom('2026-05-03', 7);
  const now = at(JERUSALEM, '2026-05-20T12:00');
  const foldOf = (completions: Completions, late: Completions, when = now, stored: Achievements | null = null) => {
    const history = input(completions, late);
    return foldAchievements(history, stored, EMPTY_MARK_COUNTS, 0, when, createDayJudge(history, when)).next;
  };

  it('counts a late mark in the mark totals', () => {
    const totals = markTotals({ '2026-05-05': { a: 1, b: 1 }, '2026-05-06': { a: 1 } }, EMPTY_MARK_COUNTS);
    expect(totals).toEqual({ total: 3, byMitzvah: { a: 2, b: 1 } });
  });

  it('counts every mark toward the hundred badge', () => {
    const keys = keysFrom('2026-01-01', 100);
    expect(markBadges(marked(keys), EMPTY_MARK_COUNTS, '2026-05-06')['hundred:daily']).toBe(keys[99]);
  });

  it('keeps the mitzvah run and the full week, and takes the week on time away', () => {
    const onTime = foldOf(marked(week), {});
    expect(onTime.badges.fullWeek).toBe('2026-05-09');
    expect(onTime.badges.punctualWeek).toBe('2026-05-09');
    expect(onTime.mitzvahBest.daily.days).toBe(7);
    expect(onTime.bestStreak?.days).toBe(7);

    const withLate = foldOf(marked(week), { '2026-05-06': { daily: 1 } });
    expect(withLate.badges.fullWeek).toBe('2026-05-09');
    expect(withLate.badges.punctualWeek).toBeUndefined();
    expect(withLate.mitzvahBest.daily.days).toBe(7);
    expect(withLate.bestStreak?.days).toBe(7);
    if (withLate.fold) expect(withLate.fold.rule).toBe(FOLD_RULE);
  });

  it('gives the month on time only when no mark of the month was late', () => {
    const first = new HDate(1, months.IYYAR, 5786).greg();
    const length = HDate.daysInMonth(months.IYYAR, 5786);
    const keys = keysFrom(dateKey(first), length);
    const last = keys[length - 1];
    const when = at(JERUSALEM, `${keysFrom(last, 11)[10]}T12:00`);
    const onTime = foldOf(marked(keys), {}, when);
    expect(onTime.badges.fullMonth).toBe(last);
    expect(onTime.badges.punctualMonth).toBe(last);
    const withLate = foldOf(marked(keys), { [keys[14]]: { daily: 1 } }, when);
    expect(withLate.badges.fullMonth).toBe(last);
    expect(withLate.badges.punctualMonth).toBeUndefined();
  });

  it('gives fewer late marks for a week with fewer late marks than the week before', () => {
    const keys = keysFrom('2026-05-03', 14);
    const lateOn = (...days: string[]) => Object.fromEntries(days.map((key) => [key, { daily: 1 }]));
    expect(foldOf(marked(keys), lateOn('2026-05-05', '2026-05-06', '2026-05-12')).badges.fewerLate).toBe('2026-05-16');
    expect(foldOf(marked(keys), lateOn('2026-05-05', '2026-05-12', '2026-05-13')).badges.fewerLate).toBeUndefined();
    expect(foldOf(marked(keys), {}).badges.fewerLate).toBeUndefined();
  });

  it('rescans a checkpoint saved under another rule', () => {
    const stored = (rule?: number): Achievements => ({
      badges: {},
      bestStreak: null,
      bestWeek: null,
      mitzvahBest: { daily: { days: 3, from: '2026-05-03', to: '2026-05-05' } },
      fold: {
        through: '2026-05-08',
        run: { days: 6, from: '2026-05-03', to: '2026-05-08' },
        mitzvahRuns: { daily: { days: 0, from: null, to: null } },
        ...(rule === undefined ? {} : { rule }),
      },
    });
    const late = { '2026-05-06': { daily: 1 } };
    expect(foldOf(marked(week), late, now, stored()).mitzvahBest.daily.days).toBe(7);
    expect(foldOf(marked(week), late, now, stored(FOLD_RULE)).mitzvahBest.daily.days).toBe(3);
  });
});

describe('the weekly report', () => {
  const week = keysFrom('2026-05-03', 7);
  const report = (late: Completions) =>
    weekSummary(
      input(marked(week), late),
      calendarDay(week[0]),
      calendarDay(week[6]),
      at(JERUSALEM, '2026-05-20T12:00'),
    );

  it('counts a late mark as done and names the mitzvah marked late', () => {
    expect(report({ '2026-05-06': { daily: 1 } })).toMatchObject({
      done: 7,
      missed: 0,
      late: 1,
      improve: null,
      lateTop: { id: 'daily', late: 1 },
    });
    expect(report({}).lateTop).toBeNull();
  });
});

describe('lateImprove', () => {
  const now = at(JERUSALEM, '2026-05-07T12:00');
  const find = (id: string) => ({ daily: DAILY, other: OTHER })[id as 'daily' | 'other'];
  const run = (late: Completions) => {
    const completions: Completions = {};
    for (const [key, day] of Object.entries(late)) {
      completions[key] = Object.fromEntries(Object.keys(day).map((id) => [id, 1]));
    }
    return lateImprove({ find, completions, late, location: JERUSALEM }, now);
  };

  it('names the mitzvah marked late most often in the recent days', () => {
    expect(
      run({
        '2026-05-01': { daily: 1 },
        '2026-05-02': { daily: 1 },
        '2026-05-05': { other: 1 },
        '2026-03-01': { daily: 1, other: 1 },
        '2026-05-06': { gone: 1 },
      }),
    ).toEqual({ top: { id: 'daily', count: 2 }, total: 5, days: 30 });
  });

  it('breaks a tie toward the later day', () => {
    expect(run({ '2026-05-01': { daily: 1 }, '2026-05-03': { other: 1 } })?.top?.id).toBe('other');
  });

  it('has no top when every late mark is old, and nothing without any', () => {
    expect(run({ '2026-03-01': { daily: 1 } })).toEqual({ top: null, total: 1, days: 30 });
    expect(run({})).toBeNull();
  });
});

describe('the late marks report', () => {
  const now = at(JERUSALEM, '2026-05-07T12:00');
  const find = (id: string) => (id === 'daily' ? DAILY : undefined);
  const endOf = (key: string) => dayWindow(DAILY, calendarDay(key), JERUSALEM, settings)!.end.getTime();
  const HOUR = 3_600_000;

  it('lists every known late mark newest first, with its delay, per mitzvah and in total', () => {
    const completions: Completions = {
      '2026-05-06': { daily: 1, gone: 1 },
      '2026-05-05': { daily: 1 },
      '2026-03-01': { daily: 1 },
      '2026-05-04': {},
    };
    const late: Completions = {
      '2026-05-06': { daily: endOf('2026-05-06') + HOUR, gone: 1 },
      '2026-05-05': { daily: endOf('2026-05-05') + 3 * HOUR },
      '2026-03-01': { daily: endOf('2026-03-01') + 2 * HOUR },
      '2026-05-04': { daily: 1 },
    };
    const report = lateMarkReport({ find, completions, late, location: JERUSALEM, settings }, now);
    expect(report.entries.map((entry) => [entry.key, entry.id, entry.delayMs])).toEqual([
      ['2026-05-06', 'daily', HOUR],
      ['2026-05-05', 'daily', 3 * HOUR],
      ['2026-03-01', 'daily', 2 * HOUR],
    ]);
    expect(report.entries[0].windowEnd?.getTime()).toBe(endOf('2026-05-06'));
    expect(report).toMatchObject({ total: 3, recent: 2, averageDelayMs: 2 * HOUR });
    expect(report.byMitzvah).toEqual([{ id: 'daily', count: 3, averageDelayMs: 2 * HOUR, lastKey: '2026-05-06' }]);
    expect(countLateMarks({ find, completions, late })).toBe(3);
  });

  it('has no delay for a mark whose window can no longer be computed, and none before the end', () => {
    const skipped = { ...DAILY, computeWindow: () => null };
    const report = lateMarkReport(
      {
        find: () => skipped,
        completions: { '2026-05-06': { daily: 1 } },
        late: { '2026-05-06': { daily: 1 } },
        location: JERUSALEM,
        settings,
      },
      now,
    );
    expect(report.entries[0]).toMatchObject({ windowEnd: null, delayMs: null });
    expect(report.averageDelayMs).toBeNull();
  });
});

describe("home's My day", () => {
  const entry = (id: string, status: DayEntry['status'], markedAt: number | null): DayEntry => ({
    id,
    status,
    start: null,
    end: null,
    markedAt,
    date: new Date(2026, 4, 6),
  });

  it('orders a late mark with the done ones by mark time and counts it as done', () => {
    const entries = [entry('missed', 'missed', null), entry('b', 'done', 20), entry('a', 'late', 10)];
    expect(orderDayEntries(entries).map((item) => item.id)).toEqual(['a', 'b', 'missed']);
    expect(dayRingCounts(entries)).toEqual({ done: 2, open: 0, missed: 1, total: 3 });
  });

  it('words a late entry as done; My day adds the late label', () => {
    const t = (key: string) => key;
    expect(dayEntryStatusText(entry('a', 'late', 10), new Date(), 'Asia/Jerusalem', t)).toBe('home.day.status.done');
  });
});

describe('lateTone', () => {
  it.each(THEME_NAMES)('reads at 4.5:1 or more on its own fill in the %s palette', (name) => {
    const tone = lateTone(THEMES[name]);
    expect(contrastRatio(tone.ink, tone.fill)).toBeGreaterThanOrEqual(4.5);
  });

  it("My day's orange late label reads at 4.5:1 or more", () => {
    expect(contrastRatio(LATE_BADGE.ink, LATE_BADGE.fill)).toBeGreaterThanOrEqual(4.5);
  });
});
