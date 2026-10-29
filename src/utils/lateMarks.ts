import { Mitzvah, UserSettings } from '@/types/mitzvah';
import { Location } from '@/types/zmanim';
import { Completions, dateKey } from '@/stores/useCompletionsStore';
import { dayWindow } from '@/utils/buildDayTimeline';
import { calendarDay } from '@/utils/checkIn';
import { addDays } from '@/utils/historyStats';
import { appDay } from '@/utils/locationDay';

// "I did it in time and did not mark it" is filed one minute before the window closed, never before it opened.
export const ON_TIME_LEAD_MS = 60_000;
export const LATE_RECENT_DAYS = 30;

export function windowClosed(window: { end: Date }, now: Date): boolean {
  return now.getTime() > window.end.getTime();
}

export function onTimeMarkAt(window: { start: Date; end: Date }): number {
  return Math.max(window.start.getTime(), window.end.getTime() - ON_TIME_LEAD_MS);
}

export type LateMarkEntry = {
  key: string;
  date: Date;
  id: string;
  markedAt: number;
  windowEnd: Date | null;
  delayMs: number | null;
};

export type LateMitzvahStat = { id: string; count: number; averageDelayMs: number | null; lastKey: string };

export type LateMarkReport = {
  entries: LateMarkEntry[];
  byMitzvah: LateMitzvahStat[];
  total: number;
  recent: number;
  averageDelayMs: number | null;
};

export type LateMarkInput = {
  // A registry or custom mitzvah by id, whatever the nusach (`findAnyMitzvah()`).
  find: (id: string) => Mitzvah | undefined;
  completions: Completions;
  late: Completions;
  location: Location;
  settings: UserSettings;
};

function averageOf(values: number[]): number | null {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

// The late marks the report lists: a done mark beside them, and a mitzvah the app still knows.
export function countLateMarks(input: Pick<LateMarkInput, 'find' | 'completions' | 'late'>): number {
  return Object.entries(input.late).reduce(
    (sum, [key, day]) => sum + Object.keys(day).filter((id) => input.completions[key]?.[id] && input.find(id)).length,
    0,
  );
}

// Every late mark still on record whose mitzvah the app still knows, newest first, with how long
// after its window it was marked (unknown when the window can no longer be computed).
export function lateMarkReport(input: LateMarkInput, now: Date): LateMarkReport {
  const { find, completions, late, location, settings } = input;
  const entries: LateMarkEntry[] = [];
  for (const [key, day] of Object.entries(late)) {
    for (const [id, markedAt] of Object.entries(day)) {
      const mitzvah = find(id);
      if (!mitzvah || !completions[key]?.[id]) continue;
      const date = calendarDay(key);
      const windowEnd = dayWindow(mitzvah, date, location, settings)?.end ?? null;
      entries.push({
        key,
        date,
        id,
        markedAt,
        windowEnd,
        delayMs: windowEnd ? Math.max(0, markedAt - windowEnd.getTime()) : null,
      });
    }
  }
  entries.sort((a, b) => (a.key !== b.key ? (a.key < b.key ? 1 : -1) : b.markedAt - a.markedAt));
  const recentFrom = dateKey(addDays(appDay(now, location), 1 - LATE_RECENT_DAYS));
  const stats = new Map<string, { count: number; delays: number[]; lastKey: string }>();
  for (const entry of entries) {
    const stat = stats.get(entry.id) ?? { count: 0, delays: [], lastKey: entry.key };
    stat.count += 1;
    if (entry.delayMs !== null) stat.delays.push(entry.delayMs);
    stats.set(entry.id, stat);
  }
  const byMitzvah = [...stats.entries()]
    .map(([id, stat]) => ({ id, count: stat.count, averageDelayMs: averageOf(stat.delays), lastKey: stat.lastKey }))
    .sort((a, b) => b.count - a.count || (a.lastKey !== b.lastKey ? (a.lastKey < b.lastKey ? 1 : -1) : 0));
  return {
    entries,
    byMitzvah,
    total: entries.length,
    recent: entries.filter((entry) => entry.key >= recentFrom).length,
    averageDelayMs: averageOf(entries.flatMap((entry) => (entry.delayMs === null ? [] : [entry.delayMs]))),
  };
}
