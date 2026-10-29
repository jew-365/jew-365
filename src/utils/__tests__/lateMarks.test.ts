import { CITIES } from '@/data/cities';
import { THEMES, THEME_NAMES, contrastRatio, lateTone } from '@/theme/colors';
import { Mitzvah } from '@/types/mitzvah';
import { at } from '@/testing/zmanim';
import { foldAchievements, markBadges, markTotals } from '../badges';
import { dayWindow } from '../buildDayTimeline';
import { calendarDay } from '../checkIn';
import {
  computeStats,
  computeStreak,
  createDayJudge,
  judgeDayItems,
  verdictOf,
  type HistoryInput,
} from '../historyStats';
import { DayEntry, dayEntryStatusText, dayRingCounts, orderDayEntries } from '../homeDay';
import { ON_TIME_LEAD_MS, countLateMarks, lateMarkReport, onTimeMarkAt, windowClosed } from '../lateMarks';
import { weekSummary } from '../weeklyReport';
import { EMPTY_MARK_COUNTS, type Completions } from '@/stores/useCompletionsStore';

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

  it('is late, and scores as a miss', () => {
    const judged = judgeDayItems(day, input({ '2026-05-06': { daily: 5 } }, { '2026-05-06': { daily: 5 } }), now);
    expect(judged.items.map((item) => [item.id, item.state, item.markedAt])).toEqual([['daily', 'late', 5]]);
    expect(verdictOf(judged)).toEqual({ key: '2026-05-06', done: [], missed: ['daily'], pending: [] });
  });

  it('is done when no late flag sits beside the mark', () => {
    const judged = judgeDayItems(day, input({ '2026-05-06': { daily: 5 } }, {}), now);
    expect(judged.items[0].state).toBe('done');
  });

  it('counts against the percentage but keeps the day in the streak', () => {
    const completions = marked(['2026-05-05', '2026-05-06', '2026-05-07']);
    const late = { '2026-05-06': { daily: 1 } };
    const stats = computeStats([DAILY], completions, JERUSALEM, settings, 3, now, { late });
    expect(stats.perMitzvah.daily).toEqual({ done: 2, eligible: 3, pending: 0, percent: 67 });
    expect(stats.streak).toBe(3);
    expect(computeStreak(input(marked(['2026-05-06']), { '2026-05-06': { daily: 1 } }), now)).toBe(1);
    expect(computeStreak(input(marked(['2026-05-06', '2026-05-07']), { '2026-05-06': { daily: 1 } }), now)).toBe(2);
  });
});

describe('badges and records', () => {
  it('leaves a late mark out of the mark totals', () => {
    const totals = markTotals({ '2026-05-05': { a: 1, b: 1 }, '2026-05-06': { a: 1 } }, EMPTY_MARK_COUNTS, {
      '2026-05-05': { a: 1 },
    });
    expect(totals).toEqual({ total: 2, byMitzvah: { a: 1, b: 1 } });
  });

  it('needs a hundred marks in time for the hundred badge', () => {
    const keys = keysFrom('2026-01-01', 100);
    expect(markBadges(marked(keys), EMPTY_MARK_COUNTS, '2026-05-06')['hundred:daily']).toBe(keys[99]);
    expect(
      markBadges(marked(keys), EMPTY_MARK_COUNTS, '2026-05-06', undefined, { [keys[10]]: { daily: 1 } })[
        'hundred:daily'
      ],
    ).toBeUndefined();
  });

  it('breaks the mitzvah run and the full week, and keeps the day streak', () => {
    const week = keysFrom('2026-05-03', 7);
    const now = at(JERUSALEM, '2026-05-20T12:00');
    const fold = (late: Completions) => {
      const history = input(marked(week), late);
      return foldAchievements(history, null, EMPTY_MARK_COUNTS, 0, now, createDayJudge(history, now)).next;
    };
    const onTime = fold({});
    expect(onTime.badges.fullWeek).toBe('2026-05-09');
    expect(onTime.mitzvahBest.daily.days).toBe(7);
    expect(onTime.bestStreak?.days).toBe(7);

    const withLate = fold({ '2026-05-06': { daily: 1 } });
    expect(withLate.badges.fullWeek).toBeUndefined();
    expect(withLate.mitzvahBest.daily.days).toBe(3);
    expect(withLate.bestStreak?.days).toBe(7);
  });
});

describe('the weekly report', () => {
  it('scores a late mark as a miss and counts it as late', () => {
    const week = keysFrom('2026-05-03', 7);
    const summary = weekSummary(
      input(marked(week), { '2026-05-06': { daily: 1 } }),
      calendarDay(week[0]),
      calendarDay(week[6]),
      at(JERUSALEM, '2026-05-20T12:00'),
    );
    expect(summary).toMatchObject({ done: 6, missed: 1, late: 1, improve: { id: 'daily', missed: 1 } });
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

  it('words a late entry as late', () => {
    const t = (key: string) => key;
    expect(dayEntryStatusText(entry('a', 'late', 10), new Date(), 'Asia/Jerusalem', t)).toBe('home.day.status.late');
  });
});

describe('lateTone', () => {
  it.each(THEME_NAMES)('reads at 4.5:1 or more on its own fill in the %s palette', (name) => {
    const tone = lateTone(THEMES[name]);
    expect(contrastRatio(tone.ink, tone.fill)).toBeGreaterThanOrEqual(4.5);
  });
});
