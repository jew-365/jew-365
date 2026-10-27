import { CITIES } from '@/data/cities';
import { findMitzvah } from '@/data/mitzvot';
import { at } from '@/testing/zmanim';
import { calendarDay } from '../checkIn';
import { computeStats, createDayJudge, type HistoryInput } from '../historyStats';
import {
  type CalendarMonth,
  type MitzvahTrend,
  type WeekPoint,
  calendarInsight,
  calendarMonth,
  civilRangeLabel,
  formatCount,
  hebrewDayLabel,
  hebrewRangeLabel,
  holyDayName,
  leaderInsight,
  mitzvahTrends,
  periodPercents,
  trendInsight,
  weekName,
  weekSeries,
  weekdayChart,
  weekdayInsight,
  weeksInsight,
} from '../historyTrends';
import { weekSummary } from '../weeklyReport';

const J = CITIES[0];
const settings = { nusach: 'ashkenaz' as const, halachicOpinions: { ksSofZman: 'GRA' as const }, inIsrael: true };
const MARKED = [11, 12, 13, 14, 15, 16, 18, 19, 21, 22, 23, 25, 26, 27];
const now = at(J, '2026-10-28T10:00');

const input: HistoryInput = {
  mitzvot: [findMitzvah('tefillin')!],
  completions: Object.fromEntries(MARKED.map((day) => [`2026-10-${day}`, { tefillin: 1 }])),
  location: J,
  settings,
  enabledSince: { tefillin: at(J, '2026-10-11T00:00').getTime() },
};

function setup() {
  const judge = createDayJudge(input, now);
  return { judge, weeks: weekSeries(input, now, judge) };
}

function point(percent: number | null, over: Partial<WeekPoint> = {}): WeekPoint {
  return {
    weekStart: '',
    weekEnd: '',
    current: false,
    name: { kind: 'parasha', he: 'x', en: 'x' },
    done: percent ?? 0,
    due: percent === null ? 0 : 100,
    waiting: 0,
    percent,
    ...over,
  };
}

function trend(id: string, current: number, previous: number | null): MitzvahTrend {
  return {
    id,
    current: { done: current, eligible: 100, percent: current },
    previous: previous === null ? null : { done: previous, eligible: 100, percent: previous },
  };
}

describe('historyTrends on the fixture month', () => {
  it('periodPercents counts due as done, missed, skipped and open', () => {
    const { judge } = setup();
    expect(periodPercents(input, now, judge)).toEqual({
      day: { done: 0, due: 1, percent: 0 },
      week: { done: 3, due: 4, percent: 75 },
      month: { done: 13, due: 15, percent: 87 },
    });
  });

  it('calendarMonth lays out the current Hebrew month', () => {
    const { judge } = setup();
    const month = calendarMonth(null, input, now, judge);
    const cell = (key: string) => month.days.find((day) => day.key === key)!;
    expect(month.startKey).toBe('2026-10-12');
    expect(month.leading).toBe(1);
    expect(cell('2026-10-20').level).toBe('none');
    expect(cell('2026-10-17').level).toBe('empty');
    expect(cell('2026-10-16').level).toBe('full');
    expect(cell('2026-10-28')).toMatchObject({ level: 'none', today: true });
    expect(cell('2026-10-29').level).toBe('future');
    expect(month.past).toBe(15);
    expect(month.marked).toBe(13);
    expect(month.title.he).toBe('חשון תשפ״ז');
    expect(month.isCurrent).toBe(true);
    expect(month.nextStartKey).toBeNull();
  });

  it('calendarMonth reads an earlier month', () => {
    const { judge } = setup();
    const month = calendarMonth('2026-09-12', input, now, judge);
    expect(month.title.he).toBe('תשרי תשפ״ז');
    expect(month.days.find((day) => day.key === '2026-10-11')!.level).toBe('full');
    expect(month.isCurrent).toBe(false);
    expect(month.nextStartKey).toBe('2026-10-12');
  });

  it('weekSeries lists twelve weeks, oldest first, the current one last', () => {
    const { weeks } = setup();
    expect(weeks).toHaveLength(12);
    expect(weeks[11]).toEqual({
      weekStart: '2026-10-25',
      weekEnd: '2026-10-31',
      current: true,
      done: 3,
      due: 4,
      waiting: 0,
      percent: 75,
      name: { kind: 'parasha', he: 'וירא', en: 'Vayera' },
    });
    expect(weeks[10]).toMatchObject({
      weekStart: '2026-10-18',
      weekEnd: '2026-10-24',
      done: 5,
      due: 6,
      percent: 83,
      name: { he: 'לך־לך', en: 'Lech-Lecha' },
    });
    expect(weeks[9]).toMatchObject({
      weekStart: '2026-10-11',
      weekEnd: '2026-10-17',
      done: 6,
      due: 6,
      percent: 100,
      name: { he: 'נח' },
    });
    expect(weeks[8]).toMatchObject({ weekEnd: '2026-10-10', percent: null });
    expect(weeks[7]).toMatchObject({
      weekEnd: '2026-10-03',
      percent: null,
      name: { kind: 'festival', he: 'שמיני עצרת', en: 'Shmini Atzeret' },
    });
    const summary = weekSummary(input, new Date(2026, 9, 11), new Date(2026, 9, 17), now);
    expect(weeks[9].done).toBe(summary.done);
    expect(weeks[9].due).toBe(summary.done + summary.missed);
  });

  it.each([
    ['Saturday afternoon', '2026-10-24T15:00', '2026-10-18', '2026-10-24', '2026-10-17'],
    ['motzaei Shabbat after the exit', '2026-10-24T21:00', '2026-10-25', '2026-10-31', '2026-10-24'],
    ['Saturday 23:59', '2026-10-24T23:59', '2026-10-25', '2026-10-31', '2026-10-24'],
    ['Sunday before alot', '2026-10-25T01:00', '2026-10-25', '2026-10-31', '2026-10-24'],
    ['Sunday after alot', '2026-10-25T06:00', '2026-10-25', '2026-10-31', '2026-10-24'],
  ])('weekSeries on %s keeps one current week and unique keys', (_name, wallClock, start, end, previousEnd) => {
    const moment = at(J, wallClock);
    const judge = createDayJudge(input, moment);
    const weeks = weekSeries(input, moment, judge);
    expect(weeks.filter((week) => week.current)).toHaveLength(1);
    expect(weeks[weeks.length - 1]).toMatchObject({ current: true, weekStart: start, weekEnd: end });
    expect(weeks[weeks.length - 2].weekEnd).toBe(previousEnd);
    expect(new Set(weeks.map((week) => week.weekEnd)).size).toBe(weeks.length);
    const ring = periodPercents(input, moment, judge).week;
    const current = weeks[weeks.length - 1];
    expect({ done: ring.done, due: ring.due }).toEqual({ done: current.done, due: current.due });
  });

  it('a week closed by the exit has no judged days in the new current week', () => {
    const moment = at(J, '2026-10-24T21:00');
    const judge = createDayJudge(input, moment);
    expect(periodPercents(input, moment, judge).week).toEqual({ done: 0, due: 0, percent: null });
    expect(weekSeries(input, moment, judge).at(-1)).toMatchObject({ done: 0, due: 0, percent: null });
  });

  it.each([
    ['Rosh Hashana, Sunday noon', '2026-09-13T12:00', '2026-09-06', '2026-09-13', '2026-09-05'],
    ['Rosh Hashana, Sunday after the exit', '2026-09-13T21:00', '2026-09-14', '2026-09-19', '2026-09-13'],
    ['Monday after Rosh Hashana', '2026-09-14T12:00', '2026-09-14', '2026-09-19', '2026-09-13'],
  ])('weekSeries around a Sunday Yom Tov: %s', (_name, wallClock, start, end, previousEnd) => {
    const early: HistoryInput = {
      ...input,
      completions: Object.fromEntries(
        [6, 7, 8, 9, 10].map((day) => [`2026-09-${String(day).padStart(2, '0')}`, { tefillin: 1 }]),
      ),
      enabledSince: { tefillin: at(J, '2026-09-01T00:00').getTime() },
    };
    const moment = at(J, wallClock);
    const judge = createDayJudge(early, moment);
    const weeks = weekSeries(early, moment, judge);
    const current = weeks[weeks.length - 1];
    expect(weeks.filter((week) => week.current)).toHaveLength(1);
    expect(current).toMatchObject({ weekStart: start, weekEnd: end });
    expect(weeks[weeks.length - 2].weekEnd).toBe(previousEnd);
    expect(new Set(weeks.map((week) => week.weekEnd)).size).toBe(weeks.length);
    const ring = periodPercents(early, moment, judge).week;
    expect({ done: ring.done, due: ring.due }).toEqual({ done: current.done, due: current.due });
    if (end === '2026-09-13') {
      expect(weeks[weeks.length - 2].weekStart).toBe('2026-08-30');
      expect(current.name.kind).toBe('festival');
    } else {
      expect(weeks[weeks.length - 2]).toMatchObject({ weekStart: '2026-09-06', weekEnd: '2026-09-13' });
    }
  });

  it('stops the calendar at the first month inside the retention window', () => {
    const { judge } = setup();
    let month = calendarMonth(null, input, now, judge);
    let steps = 0;
    while (month.previousStartKey && steps < 40) {
      month = calendarMonth(month.previousStartKey, input, now, judge);
      steps += 1;
    }
    const cutoff = new Date(2026, 9, 28 - 400);
    expect(month.previousStartKey).toBeNull();
    expect(calendarDay(month.startKey).getTime()).toBeGreaterThanOrEqual(cutoff.getTime());
    expect(steps).toBeGreaterThan(10);
  });

  it('weekdayChart buckets days and keeps holy days apart', () => {
    const { weeks, judge } = setup();
    const chart = weekdayChart(weeks, input, now, judge);
    expect(chart.days.map((day) => [day.done, day.due, day.percent])).toEqual([
      [3, 3, 100],
      [3, 3, 100],
      [2, 3, 67],
      [2, 2, 100],
      [2, 2, 100],
      [2, 2, 100],
    ]);
    expect(chart.holy).toEqual({ done: 0, due: 0, percent: null });
    expect(weekdayInsight(chart)).toEqual({ kind: 'strong', weekday: 0, percent: 100 });
  });

  it('mitzvahTrends and trendInsight read the last thirty days', () => {
    const { judge } = setup();
    const stats = computeStats(input.mitzvot, input.completions, J, settings, 30, now, {
      enabledSince: input.enabledSince,
      judge,
    });
    const trends = mitzvahTrends(input, now, judge, stats.perMitzvah);
    expect(trends).toEqual([{ id: 'tefillin', current: { done: 14, eligible: 15, percent: 93 }, previous: null }]);
    expect(trendInsight(trends)).toEqual({ kind: 'average', percent: 93 });
  });
});

describe('insights', () => {
  it('weeksInsight names the best last week', () => {
    const empty = Array.from({ length: 8 }, () => point(null));
    const weeks = [...empty, point(70), point(75), point(90), point(50, { current: true })];
    expect(weeksInsight(weeks)).toMatchObject({ kind: 'bestLast', percent: 90 });
  });

  it('weeksInsight counts a run of 80 and over', () => {
    const weeks = [point(95), point(60), point(80), point(85), point(82), point(10, { current: true })];
    expect(weeksInsight(weeks)).toEqual({ kind: 'run', weeks: 3 });
  });

  it('weeksInsight reports a rise over the four weeks before', () => {
    const percents = [60, 60, 60, 60, 70, 70, 70, 70];
    const weeks = [
      ...percents.map((percent) => point(percent, { due: 10, done: percent / 10 })),
      point(5, { current: true }),
    ];
    expect(weeksInsight(weeks)).toEqual({ kind: 'rising', percent: 70, delta: 10 });
  });

  it('weeksInsight falls back to the average, and is null without finished weeks', () => {
    expect(weeksInsight([point(60), point(50), point(1, { current: true })])).toEqual({
      kind: 'average',
      percent: 55,
    });
    expect(weeksInsight([point(null), point(40, { current: true })])).toBeNull();
  });

  it('trendInsight names a rise, a steady row, or the average', () => {
    expect(trendInsight([trend('a', 80, 70), trend('b', 90, 88)])).toEqual({
      kind: 'rise',
      id: 'a',
      delta: 10,
      percent: 80,
    });
    expect(trendInsight([trend('a', 80, 79), trend('b', 90, 88)])).toEqual({ kind: 'steady', id: 'b', percent: 90 });
    expect(trendInsight([trend('a', 60, 90)])).toEqual({ kind: 'average', percent: 60 });
    expect(trendInsight([])).toBeNull();
  });

  it('leaderInsight takes the highest percent, ties to the earlier id', () => {
    const perMitzvah = {
      tefillin: { done: 14, eligible: 15, pending: 0, percent: 93 },
      shacharit: { done: 9, eligible: 10, pending: 0, percent: 93 },
    };
    expect(leaderInsight(perMitzvah, ['shacharit', 'tefillin'])).toEqual({ id: 'shacharit', percent: 93 });
    expect(leaderInsight(perMitzvah, [])).toBeNull();
  });

  it('calendarInsight is null without past days', () => {
    expect(calendarInsight({ past: 0, marked: 0, isCurrent: true } as CalendarMonth)).toBeNull();
    expect(calendarInsight({ past: 15, marked: 13, isCurrent: true } as CalendarMonth)).toEqual({
      marked: 13,
      past: 15,
      current: true,
    });
  });
});

describe('labels', () => {
  it('writes Hebrew days and ranges', () => {
    expect(hebrewDayLabel('2026-10-28', 'he', true)).toBe('י״ז בחשון תשפ״ז');
    expect(hebrewDayLabel('2026-10-28', 'en', false)).toBe('17 Cheshvan');
    expect(hebrewRangeLabel('2026-10-18', '2026-10-24', 'he')).toBe('ז׳–י״ג בחשון');
    expect(hebrewRangeLabel('2026-10-11', '2026-10-17', 'he')).toBe('ל׳ בתשרי–ו׳ בחשון');
  });

  it('writes civil ranges and counts', () => {
    expect(civilRangeLabel('2026-10-12', '2026-11-09', true)).toBe('12.10–9.11.2026');
    expect(civilRangeLabel('2026-10-12', '2026-11-09', false)).toBe('12.10–9.11');
    expect(formatCount(1000)).toBe('1,000');
    expect(formatCount(812)).toBe('812');
  });

  it('names a Shabbat by its parasha and a festival week by the festival', () => {
    expect(weekName(new Date(2027, 3, 24), J)).toMatchObject({ kind: 'festival', he: 'פסח', en: 'Pesach' });
    expect(holyDayName(new Date(2026, 9, 24), J)).toMatchObject({ kind: 'shabbat', name: { en: 'Lech-Lecha' } });
    expect(holyDayName(new Date(2026, 9, 28), J)).toBeNull();
  });
});
