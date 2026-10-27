import { HDate, HebrewCalendar, Locale, flags, getSedra, gematriya } from '@hebcal/core';
import { roshChodeshLabel } from '@/data/roshChodesh';
import { HebcalService } from '@/services/HebcalService';
import { RETENTION_DAYS, dateKey } from '@/stores/useCompletionsStore';
import type { Location } from '@/types/zmanim';
import { calendarDay } from '@/utils/checkIn';
import { chokWeekName } from '@/utils/chok';
import { DayJudge, HistoryInput, HistoryStats, JudgedDay, addDays, verdictOf } from '@/utils/historyStats';
import { appDay, locationNoon } from '@/utils/locationDay';
import { previousWeekEnd, shabbatOf, weekEndFor, weekStartFor } from '@/utils/weeklyReport';

type Language = 'he' | 'en';

export type DayTally = { key: string; done: number; due: number; waiting: number; later: number };

export function tallyOf(judged: JudgedDay): DayTally {
  const tally: DayTally = { key: judged.key, done: 0, due: 0, waiting: 0, later: 0 };
  for (const { state } of judged.items) {
    if (state === 'waiting') tally.waiting += 1;
    else if (state === 'later') tally.later += 1;
    else {
      tally.due += 1;
      if (state === 'done') tally.done += 1;
    }
  }
  return tally;
}

export type PeriodTally = { done: number; due: number; percent: number | null };
export type PeriodPercents = { day: PeriodTally; week: PeriodTally; month: PeriodTally };

function percentOf(done: number, due: number): number | null {
  return due > 0 ? Math.round((done / due) * 100) : null;
}

function pooled(parts: { done: number; due: number }[]): number {
  const done = parts.reduce((sum, part) => sum + part.done, 0);
  const due = parts.reduce((sum, part) => sum + part.due, 0);
  return Math.round((done / due) * 100);
}

function daysBetween(first: Date, last: Date): Date[] {
  const days: Date[] = [];
  for (let day = first; day.getTime() <= last.getTime(); day = addDays(day, 1)) days.push(day);
  return days;
}

function sumRange(first: Date, last: Date, judge: DayJudge): { done: number; due: number; waiting: number } {
  const sum = { done: 0, due: 0, waiting: 0 };
  for (const day of daysBetween(first, last)) {
    const tally = tallyOf(judge(day));
    sum.done += tally.done;
    sum.due += tally.due;
    sum.waiting += tally.waiting;
  }
  return sum;
}

function periodOf(first: Date, last: Date, judge: DayJudge): PeriodTally {
  const { done, due } = sumRange(first, last, judge);
  return { done, due, percent: percentOf(done, due) };
}

function hebrewMonthStart(day: Date): Date {
  const hd = new HDate(day);
  const first = new HDate(1, hd.getMonth(), hd.getFullYear()).greg();
  return new Date(first.getFullYear(), first.getMonth(), first.getDate());
}

function weekBlock(day: Date, location: Location) {
  return HebcalService.holyBlockOn(locationNoon(day, location), location);
}

function weekEndOfDay(day: Date, location: Location): Date {
  const containing = weekBlock(day, location);
  const saturday = addDays(day, 6 - day.getDay());
  const closing = containing ? weekEndFor(containing) : null;
  if (closing) return closing;
  const following = weekBlock(saturday, location);
  return (following && weekEndFor(following)) ?? saturday;
}

function currentWeekSpan(today: Date, location: Location, now: Date): { start: Date; end: Date } {
  let end = weekEndOfDay(today, location);
  const closing = weekBlock(end, location);
  if (closing && closing.end.getTime() <= now.getTime()) end = weekEndOfDay(addDays(end, 1), location);
  return { start: weekStartFor(end, location, now), end };
}

export function periodPercents(input: HistoryInput, now: Date, judge: DayJudge): PeriodPercents {
  const today = appDay(now, input.location);
  return {
    day: periodOf(today, today, judge),
    week: periodOf(currentWeekSpan(today, input.location, now).start, today, judge),
    month: periodOf(hebrewMonthStart(today), today, judge),
  };
}

export type WeekName = { kind: 'parasha' | 'festival'; he: string; en: string };

function festivalName(hd: HDate, inIsrael: boolean): { he: string; en: string } | null {
  const events = HebrewCalendar.getHolidaysOnDate(hd, inIsrael) ?? [];
  const event = events.find((candidate) => candidate.getFlags() & (flags.CHAG | flags.CHOL_HAMOED));
  if (!event) return null;
  return { he: Locale.gettext(event.basename(), 'he-x-NoNikud'), en: event.basename() };
}

export function weekName(saturday: Date, location: Location): WeekName {
  const hd = new HDate(saturday);
  const reading = getSedra(hd.getFullYear(), location.inIsrael).lookup(hd);
  if (!reading.chag) {
    return {
      kind: 'parasha',
      he: chokWeekName(reading.parsha, 'he'),
      en: chokWeekName(reading.parsha, 'en'),
    };
  }
  const festival = festivalName(hd, location.inIsrael);
  if (festival) return { kind: 'festival', ...festival };
  const name = reading.parsha[0];
  return { kind: 'festival', he: Locale.gettext(name, 'he-x-NoNikud'), en: name };
}

export type WeekPoint = {
  weekStart: string;
  weekEnd: string;
  current: boolean;
  name: WeekName;
  done: number;
  due: number;
  waiting: number;
  percent: number | null;
};

export function weekSeries(input: HistoryInput, now: Date, judge: DayJudge, count = 12): WeekPoint[] {
  const { location } = input;
  const today = appDay(now, location);
  const point = (start: Date, sumEnd: Date, weekEnd: Date, name: WeekName, current: boolean): WeekPoint => {
    const { done, due, waiting } = sumRange(start, sumEnd, judge);
    return {
      weekStart: dateKey(start),
      weekEnd: dateKey(weekEnd),
      current,
      name,
      done,
      due,
      waiting,
      percent: percentOf(done, due),
    };
  };
  const span = currentWeekSpan(today, location, now);
  const series = [point(span.start, today, span.end, weekName(shabbatOf(span.end), location), true)];
  let end = previousWeekEnd(span.end, location, now);
  while (end && series.length < count) {
    series.unshift(point(weekStartFor(end, location, now), end, end, weekName(shabbatOf(end), location), false));
    end = previousWeekEnd(end, location, now);
  }
  return series;
}

export type WeekdayChart = {
  days: { weekday: number; done: number; due: number; percent: number | null }[];
  holy: { done: number; due: number; percent: number | null };
};

export function weekdayChart(weeks: WeekPoint[], input: HistoryInput, now: Date, judge: DayJudge): WeekdayChart {
  const { location } = input;
  const today = appDay(now, location);
  const buckets = Array.from({ length: 6 }, (_, weekday) => ({ weekday, done: 0, due: 0 }));
  const holy = { done: 0, due: 0 };
  if (weeks.length) {
    for (const day of daysBetween(calendarDay(weeks[0].weekStart), addDays(today, -1))) {
      const tally = tallyOf(judge(day));
      const isHoly = HebcalService.isHolyDay(locationNoon(day, location), location) || day.getDay() === 6;
      const target = isHoly ? holy : buckets[day.getDay()];
      target.done += tally.done;
      target.due += tally.due;
    }
  }
  return {
    days: buckets.map((bucket) => ({ ...bucket, percent: percentOf(bucket.done, bucket.due) })),
    holy: { ...holy, percent: percentOf(holy.done, holy.due) },
  };
}

export type CalendarLevel = 'full' | 'p3' | 'p2' | 'p1' | 'none' | 'waiting' | 'empty' | 'future';
export type CalendarCell = {
  key: string;
  date: Date;
  hebrewDay: number;
  civilDay: number;
  weekday: number;
  level: CalendarLevel;
  today: boolean;
  holy: boolean;
  done: number;
  due: number;
  waiting: number;
};
export type CalendarMonth = {
  startKey: string;
  title: { he: string; en: string };
  monthName: { he: string; en: string };
  civilRange: string;
  leading: number;
  days: CalendarCell[];
  past: number;
  marked: number;
  isCurrent: boolean;
  previousStartKey: string | null;
  nextStartKey: string | null;
};

function levelOf(tally: { done: number; due: number; waiting: number }): CalendarLevel {
  if (tally.waiting > 0) return 'waiting';
  if (tally.due === 0) return 'empty';
  if (tally.done === 0) return 'none';
  if (tally.done === tally.due) return 'full';
  const share = tally.done / tally.due;
  return share < 0.4 ? 'p1' : share < 0.75 ? 'p2' : 'p3';
}

export function civilRangeLabel(fromKey: string, toKey: string, withYear: boolean): string {
  const from = calendarDay(fromKey);
  const to = calendarDay(toKey);
  const base = `${from.getDate()}.${from.getMonth() + 1}–${to.getDate()}.${to.getMonth() + 1}`;
  return withYear ? `${base}.${to.getFullYear()}` : base;
}

export function calendarMonth(startKey: string | null, input: HistoryInput, now: Date, judge: DayJudge): CalendarMonth {
  const { location } = input;
  const today = appDay(now, location);
  const todayKey = dateKey(today);
  const start = startKey ? calendarDay(startKey) : hebrewMonthStart(today);
  const hd = new HDate(start);
  const month = hd.getMonth();
  const year = hd.getFullYear();
  const length = HDate.daysInMonth(month, year);
  const monthFirst = new HDate(1, month, year);
  const days: CalendarCell[] = [];
  for (let offset = 0; offset < length; offset++) {
    const date = addDays(start, offset);
    const key = dateKey(date);
    const future = key > todayKey;
    const tally = future ? { done: 0, due: 0, waiting: 0 } : tallyOf(judge(date));
    days.push({
      key,
      date,
      hebrewDay: offset + 1,
      civilDay: date.getDate(),
      weekday: date.getDay(),
      level: future ? 'future' : levelOf(tally),
      today: key === todayKey,
      holy: HebcalService.isHolyDay(locationNoon(date, location), location),
      done: tally.done,
      due: tally.due,
      waiting: tally.waiting,
    });
  }
  const past = days.filter((cell) => !['future', 'waiting', 'empty'].includes(cell.level));
  const monthName = { he: roshChodeshLabel(monthFirst, 'he'), en: roshChodeshLabel(monthFirst, 'en') };
  const firstKey = days[0].key;
  const lastKey = days[days.length - 1].key;
  const previousLast = addDays(start, -1);
  const previousFirst = hebrewMonthStart(previousLast);
  const nextFirst = addDays(calendarDay(lastKey), 1);
  const currentFirstKey = dateKey(hebrewMonthStart(today));
  return {
    startKey: firstKey,
    title: { he: `${monthName.he} ${gematriya(year % 1000)}`, en: `${monthName.en} ${year}` },
    monthName,
    civilRange: civilRangeLabel(firstKey, lastKey, true),
    leading: days[0].weekday,
    days,
    past: past.length,
    marked: past.filter((cell) => cell.done > 0).length,
    isCurrent: todayKey >= firstKey && todayKey <= lastKey,
    previousStartKey:
      previousFirst.getTime() >= addDays(today, -RETENTION_DAYS).getTime() ? dateKey(previousFirst) : null,
    nextStartKey: dateKey(nextFirst) <= currentFirstKey ? dateKey(nextFirst) : null,
  };
}

export type MitzvahWindowStat = { done: number; eligible: number; percent: number };
export type MitzvahTrend = { id: string; current: MitzvahWindowStat; previous: MitzvahWindowStat | null };

export function mitzvahTrends(
  input: HistoryInput,
  now: Date,
  judge: DayJudge,
  current: HistoryStats['perMitzvah'],
): MitzvahTrend[] {
  const today = appDay(now, input.location);
  const previous = new Map<string, { done: number; eligible: number }>();
  for (const day of daysBetween(addDays(today, -59), addDays(today, -30))) {
    const verdict = verdictOf(judge(day));
    const bump = (id: string, isDone: boolean) => {
      const entry = previous.get(id) ?? { done: 0, eligible: 0 };
      entry.eligible += 1;
      if (isDone) entry.done += 1;
      previous.set(id, entry);
    };
    verdict.done.forEach((id) => bump(id, true));
    verdict.missed.forEach((id) => bump(id, false));
  }
  const rows = input.mitzvot
    .filter((mitzvah) => (current[mitzvah.id]?.eligible ?? 0) > 0)
    .map((mitzvah): MitzvahTrend => {
      const stat = current[mitzvah.id];
      const before = previous.get(mitzvah.id);
      return {
        id: mitzvah.id,
        current: { done: stat.done, eligible: stat.eligible, percent: stat.percent },
        previous: before ? { ...before, percent: Math.round((before.done / before.eligible) * 100) } : null,
      };
    });
  const delta = (row: MitzvahTrend) => row.current.percent - (row.previous?.percent ?? 0);
  return [
    ...rows.filter((row) => row.previous).sort((a, b) => delta(b) - delta(a)),
    ...rows.filter((row) => !row.previous).sort((a, b) => b.current.percent - a.current.percent),
  ];
}

export type WeeksInsight =
  | { kind: 'bestLast'; percent: number; name: WeekName }
  | { kind: 'run'; weeks: number }
  | { kind: 'rising'; percent: number; delta: number }
  | { kind: 'average'; percent: number }
  | null;

export function weeksInsight(weeks: WeekPoint[]): WeeksInsight {
  const finished = weeks.filter((week) => !week.current && week.percent !== null);
  if (!finished.length) return null;
  const last = finished[finished.length - 1];
  if (finished.length >= 2 && finished.slice(0, -1).every((week) => last.percent! > week.percent!)) {
    return { kind: 'bestLast', percent: last.percent!, name: last.name };
  }
  let run = 0;
  for (let index = finished.length - 1; index >= 0 && finished[index].percent! >= 80; index--) run += 1;
  if (run >= 3) return { kind: 'run', weeks: run };
  if (finished.length >= 8) {
    const recent = pooled(finished.slice(-4));
    const delta = recent - pooled(finished.slice(-8, -4));
    if (delta >= 5) return { kind: 'rising', percent: recent, delta };
  }
  return { kind: 'average', percent: pooled(finished) };
}

export type WeekdayInsight =
  { kind: 'strong'; weekday: number; percent: number } | { kind: 'balanced'; min: number; max: number } | null;

export function weekdayInsight(chart: WeekdayChart): WeekdayInsight {
  const days = chart.days.filter((day) => day.percent !== null);
  if (!days.length) return null;
  const best = days.reduce((top, day) => (day.percent! > top.percent! ? day : top));
  if (best.percent! - pooled(days) >= 5) return { kind: 'strong', weekday: best.weekday, percent: best.percent! };
  const percents = days.map((day) => day.percent!);
  return { kind: 'balanced', min: Math.min(...percents), max: Math.max(...percents) };
}

export type TrendInsight =
  | { kind: 'rise'; id: string; delta: number; percent: number }
  | { kind: 'steady'; id: string; percent: number }
  | { kind: 'average'; percent: number }
  | null;

export function trendInsight(trends: MitzvahTrend[]): TrendInsight {
  if (!trends.length) return null;
  const withPrevious = trends.filter((row) => row.previous);
  const delta = (row: MitzvahTrend) => row.current.percent - row.previous!.percent;
  const rise = withPrevious.reduce<MitzvahTrend | null>(
    (top, row) => (!top || delta(row) > delta(top) ? row : top),
    null,
  );
  if (rise && delta(rise) >= 5) {
    return { kind: 'rise', id: rise.id, delta: delta(rise), percent: rise.current.percent };
  }
  const steady = withPrevious
    .filter((row) => Math.abs(delta(row)) < 5)
    .reduce<MitzvahTrend | null>((top, row) => (!top || row.current.percent > top.current.percent ? row : top), null);
  if (steady) return { kind: 'steady', id: steady.id, percent: steady.current.percent };
  const done = trends.reduce((sum, row) => sum + row.current.done, 0);
  const eligible = trends.reduce((sum, row) => sum + row.current.eligible, 0);
  return { kind: 'average', percent: Math.round((done / eligible) * 100) };
}

export function leaderInsight(
  perMitzvah: HistoryStats['perMitzvah'],
  order: string[],
): { id: string; percent: number } | null {
  let leader: { id: string; percent: number } | null = null;
  for (const id of order) {
    const stat = perMitzvah[id];
    if (stat && stat.eligible > 0 && (!leader || stat.percent > leader.percent)) leader = { id, percent: stat.percent };
  }
  return leader;
}

export function calendarInsight(month: CalendarMonth): { marked: number; past: number; current: boolean } | null {
  return month.past === 0 ? null : { marked: month.marked, past: month.past, current: month.isCurrent };
}

export function hebrewDayLabel(key: string, language: Language, withYear: boolean): string {
  const hd = new HDate(calendarDay(key));
  if (language === 'en') return `${hd.getDate()} ${hd.getMonthName()}${withYear ? ` ${hd.getFullYear()}` : ''}`;
  const base = `${gematriya(hd.getDate())} ב${roshChodeshLabel(hd, 'he')}`;
  return withYear ? `${base} ${gematriya(hd.getFullYear() % 1000)}` : base;
}

export function hebrewRangeLabel(fromKey: string, toKey: string, language: Language): string {
  const from = new HDate(calendarDay(fromKey));
  const to = new HDate(calendarDay(toKey));
  if (from.getMonth() !== to.getMonth() || from.getFullYear() !== to.getFullYear()) {
    return `${hebrewDayLabel(fromKey, language, false)}–${hebrewDayLabel(toKey, language, false)}`;
  }
  if (language === 'en') return `${from.getDate()}–${to.getDate()} ${from.getMonthName()}`;
  return `${gematriya(from.getDate())}–${gematriya(to.getDate())} ב${roshChodeshLabel(from, 'he')}`;
}

export function holyDayName(
  day: Date,
  location: Location,
): { kind: 'shabbat'; name: WeekName } | { kind: 'yomTov'; he: string; en: string } | null {
  if (!HebcalService.isHolyDay(locationNoon(day, location), location)) return null;
  if (day.getDay() === 6) return { kind: 'shabbat', name: weekName(day, location) };
  const hd = new HDate(day);
  const festival = festivalName(hd, location.inIsrael);
  return { kind: 'yomTov', ...(festival ?? { he: hd.render('he-x-NoNikud'), en: hd.render('en') }) };
}

export function formatCount(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
