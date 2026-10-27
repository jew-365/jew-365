import { Mitzvah, UserSettings } from '@/types/mitzvah';
import { Location } from '@/types/zmanim';
import { ZmanimService } from '@/services/ZmanimService';
import { isSkippedAt } from '@/utils/skipRules';
import { appDay, appDayEnd, locationNoon } from '@/utils/locationDay';
import { blockForDay, checkInPending, trackedOn, waitsInCheckIn } from '@/utils/checkIn';
import { ArchivedDays, CheckIns, Completions, dateKey, isArchivedDay } from '@/stores/useCompletionsStore';

export type HistoryStats = {
  streak: number;
  daily: { date: string; doneCount: number; totalCount: number; pendingCount: number }[];
  perMitzvah: Record<string, { done: number; eligible: number; pending: number; percent: number }>;
  missedYesterday: string[];
};

export function isTrackedInRange(stat: { eligible: number; pending: number }): boolean {
  return stat.eligible > 0 || stat.pending > 0;
}

export type HistoryInput = {
  mitzvot: Mitzvah[];
  completions: Completions;
  checkIns?: CheckIns;
  archivedDays?: ArchivedDays;
  skipped?: Completions;
  enabledSince?: Record<string, number>;
  location: Location;
  settings: UserSettings;
};

export type DayVerdict = { key: string; done: string[]; missed: string[]; pending: string[] };

export function addDays(day: Date, days: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() + days);
}

export type JudgedState = 'done' | 'missed' | 'skipped' | 'waiting' | 'open' | 'later';

export type JudgedItem = {
  id: string;
  state: JudgedState;
  window: { start: Date; end: Date };
  markedAt: number | null;
  inCheckIn: boolean;
};

export type JudgedDay = { key: string; items: JudgedItem[] };

export type DayJudge = (day: Date) => JudgedDay;

// Every mitzvah of one calendar day, judged done, missed or still open. An item stays open for as
// long as it can still be marked: until its day ends at the next alot, or — when its window reaches
// into a Shabbat / Yom Tov block — until that block's check-in is finished or its deadline passes.
// Only then can a missing mark count against the user. A skip settles it at once, and a mitzvah
// whose window ended unmarked before it was switched on is not judged on it, while a done mark always counts
// (`trackedOn()`), the install day's morning included.
export function judgeDayItems(day: Date, input: HistoryInput, now: Date, opts?: { checkInFlags?: boolean }): JudgedDay {
  const key = dateKey(day);
  const judged: JudgedDay = { key, items: [] };
  const { location, settings } = input;
  const noon = locationNoon(day, location);
  const zmanim = ZmanimService.getZmanim(noon, location);
  if (!zmanim) return judged;
  const dayEnd = appDayEnd(day, location);
  const doneMap = input.completions[key] ?? {};
  const skippedMap = input.skipped?.[key] ?? {};
  let block: ReturnType<typeof blockForDay> | undefined;
  const blockOfDay = () => {
    if (block === undefined) block = blockForDay(day, location);
    return block;
  };
  for (const mitzvah of input.mitzvot) {
    const window = mitzvah.computeWindow({ date: day, location, settings, zmanim });
    if (!window) continue;
    if (!trackedOn(mitzvah, window, input.enabledSince, Boolean(doneMap[mitzvah.id]))) continue;
    if (isSkippedAt(mitzvah, window.start, location, settings)) continue;
    const item = (state: JudgedState, markedAt: number | null, inCheckIn = false): void => {
      judged.items.push({ id: mitzvah.id, state, window, markedAt, inCheckIn });
    };
    if (doneMap[mitzvah.id]) {
      const inCheckIn = opts?.checkInFlags
        ? (() => {
            const found = blockOfDay();
            return found !== null && waitsInCheckIn(mitzvah, window, found);
          })()
        : false;
      item('done', doneMap[mitzvah.id], inCheckIn);
      continue;
    }
    if (skippedMap[mitzvah.id]) {
      item('skipped', skippedMap[mitzvah.id]);
      continue;
    }
    // Looked up only for a day with something unmarked: most days of a long streak never need it.
    const found = blockOfDay();
    const inBlock = found !== null && waitsInCheckIn(mitzvah, window, found);
    if (inBlock) {
      item(checkInPending(found, input.checkIns ?? {}, now, location) ? 'waiting' : 'missed', null, true);
      continue;
    }
    const open = now.getTime() < Math.max(dayEnd.getTime(), window.end.getTime());
    item(open ? (now.getTime() >= window.start.getTime() ? 'open' : 'later') : 'missed', null);
  }
  return judged;
}

export function verdictOf(judged: JudgedDay): DayVerdict {
  const verdict: DayVerdict = { key: judged.key, done: [], missed: [], pending: [] };
  for (const { id, state } of judged.items) {
    if (state === 'done') verdict.done.push(id);
    else if (state === 'missed' || state === 'skipped') verdict.missed.push(id);
    else verdict.pending.push(id);
  }
  return verdict;
}

export function judgeDay(day: Date, input: HistoryInput, now: Date): DayVerdict {
  return verdictOf(judgeDayItems(day, input, now));
}

export function createDayJudge(input: HistoryInput, now: Date): DayJudge {
  const memo = new Map<string, JudgedDay>();
  return (day) => {
    const key = dateKey(day);
    const known = memo.get(key);
    if (known) return known;
    const judged = judgeDayItems(day, input, now);
    memo.set(key, judged);
    return judged;
  };
}

function earliestKey(input: HistoryInput): string | null {
  const keys = [...Object.keys(input.completions), ...(input.archivedDays ?? []).map(([first]) => first)];
  return keys.length ? keys.reduce((min, key) => (key < min ? key : min)) : null;
}

// Consecutive days, back from today, each with at least one mitzvah marked. A day that can still
// be marked (today, or a Shabbat / Yom Tov whose check-in is open) neither counts nor breaks, nor
// does a day with nothing to do. Shabbat and Yom Tov are ordinary days here: kept when marked in
// the check-in, broken when not. A multi-day item that is still open does not hold its day, which
// is judged by its other items, so a miss is not hidden until the whole period ends. The walk is not
// bounded by the stats window — past retention the archive still knows which days were kept — and
// stops at the oldest day anything was recorded.
export function computeStreak(input: HistoryInput, now: Date = new Date(), judge = judgeDay): number {
  const floor = earliestKey(input);
  if (!floor) return 0;
  let streak = 0;
  for (let day = appDay(now, input.location); dateKey(day) >= floor; day = addDays(day, -1)) {
    const key = dateKey(day);
    if (Object.keys(input.completions[key] ?? {}).length || isArchivedDay(input.archivedDays ?? [], key)) {
      streak += 1;
      continue;
    }
    // With nothing enabled every day is empty, and walking past them would count every day ever kept.
    if (!input.mitzvot.length) break;
    const verdict = judge(day, input, now);
    const holdsDay = verdict.pending.some((id) => !input.mitzvot.find((mitzvah) => mitzvah.id === id)?.multiDay);
    if (holdsDay || !verdict.missed.length) continue;
    break;
  }
  return streak;
}

export function computeStats(
  mitzvot: Mitzvah[],
  completions: Completions,
  location: Location,
  settings: UserSettings,
  daysBack = 30,
  now: Date = new Date(),
  extra: Pick<HistoryInput, 'checkIns' | 'archivedDays' | 'skipped' | 'enabledSince'> & { judge?: DayJudge } = {},
): HistoryStats {
  const { judge = (day: Date) => judgeDayItems(day, input, now), ...inputExtra } = extra;
  const input: HistoryInput = { mitzvot, completions, location, settings, ...inputExtra };
  const today = appDay(now, location);
  const yesterdayKey = dateKey(addDays(today, -1));
  const perMitzvah: HistoryStats['perMitzvah'] = Object.fromEntries(
    mitzvot.map((mitzvah) => [mitzvah.id, { done: 0, eligible: 0, pending: 0, percent: 0 }]),
  );
  const daily: HistoryStats['daily'] = [];
  const verdicts = new Map<string, DayVerdict>();
  let missedYesterday: string[] = [];

  for (let offset = daysBack - 1; offset >= 0; offset--) {
    const day = addDays(today, -offset);
    const verdict = verdictOf(judge(day));
    verdicts.set(verdict.key, verdict);
    // An item counts toward its percentage once it is decided; an open one would read as missed
    // all morning, and all of Sunday for Shabbat.
    for (const id of verdict.done) {
      perMitzvah[id].done += 1;
      perMitzvah[id].eligible += 1;
    }
    for (const id of verdict.missed) perMitzvah[id].eligible += 1;
    for (const id of verdict.pending) perMitzvah[id].pending += 1;
    daily.push({
      date: verdict.key,
      doneCount: verdict.done.length,
      totalCount: verdict.done.length + verdict.missed.length + verdict.pending.length,
      pendingCount: verdict.pending.length,
    });
    if (verdict.key === yesterdayKey) missedYesterday = verdict.missed;
  }

  for (const stat of Object.values(perMitzvah)) {
    stat.percent = stat.eligible > 0 ? Math.round((stat.done / stat.eligible) * 100) : 0;
  }

  const streak = computeStreak(input, now, (day) => verdicts.get(dateKey(day)) ?? verdictOf(judge(day)));
  return { streak, daily, perMitzvah, missedYesterday };
}
