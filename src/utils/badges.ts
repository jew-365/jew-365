import { HDate } from '@hebcal/core';
import {
  Achievements,
  BadgeId,
  BestWeek,
  Completions,
  DayRange,
  MarkCounts,
  RETENTION_DAYS,
  StreakRun,
  dateKey,
  isArchivedDay,
} from '@/stores/useCompletionsStore';
import { calendarDay } from '@/utils/checkIn';
import { DayJudge, HistoryInput, addDays, verdictOf } from '@/utils/historyStats';
import { appDay, appDayKey } from '@/utils/locationDay';
import { previousWeekEnd, weekEndOnOrBefore, weekStartFor } from '@/utils/weeklyReport';

export const STREAK_BADGE_DAYS = [7, 30, 100, 365] as const;
export const FOLD_LAG_DAYS = 7;
export const WEEK_RESCAN_DAYS = 14;

const HUNDRED_MARKS = 100;
const THOUSAND_MARKS = 1000;
const MAX_WEEK_SCAN = 80;

export type BadgeKind =
  | { kind: 'streak'; days: 7 | 30 | 100 | 365 }
  | { kind: 'fullWeek' }
  | { kind: 'fullMonth' }
  | { kind: 'thousand' }
  | { kind: 'hundred'; mitzvahId: string };

export function badgeKind(id: BadgeId): BadgeKind {
  if (id.startsWith('hundred:')) return { kind: 'hundred', mitzvahId: id.slice('hundred:'.length) };
  if (id.startsWith('streak')) return { kind: 'streak', days: Number(id.slice('streak'.length)) as 7 | 30 | 100 | 365 };
  if (id === 'fullWeek') return { kind: 'fullWeek' };
  if (id === 'fullMonth') return { kind: 'fullMonth' };
  return { kind: 'thousand' };
}

export type MarkTotals = { total: number; byMitzvah: Record<string, number> };

export function markTotals(completions: Completions, archived: MarkCounts): MarkTotals {
  const byMitzvah = { ...archived.byMitzvah };
  let total = archived.total;
  for (const day of Object.values(completions)) {
    for (const id of Object.keys(day)) {
      total += 1;
      byMitzvah[id] = (byMitzvah[id] ?? 0) + 1;
    }
  }
  return { total, byMitzvah };
}

export function markBadges(
  completions: Completions,
  archived: MarkCounts,
  fallbackKey: string = dateKey(),
  knownIds?: string[],
): Partial<Record<BadgeId, string>> {
  const keys = Object.keys(completions).sort();
  const earliest = keys[0] ?? fallbackKey;
  const badges: Partial<Record<BadgeId, string>> = {};
  const counts = { ...archived.byMitzvah };
  let total = archived.total;
  if (total >= THOUSAND_MARKS) badges.thousandMarks = earliest;
  const known = knownIds ? new Set(knownIds) : null;
  const counted = (id: string) => !known || known.has(id);
  for (const [id, count] of Object.entries(counts)) {
    if (count >= HUNDRED_MARKS && counted(id)) badges[`hundred:${id}`] = earliest;
  }
  for (const key of keys) {
    for (const id of Object.keys(completions[key])) {
      total += 1;
      counts[id] = (counts[id] ?? 0) + 1;
      if (total >= THOUSAND_MARKS && !badges.thousandMarks) badges.thousandMarks = key;
      if (counts[id] >= HUNDRED_MARKS && counted(id) && !badges[`hundred:${id}`]) badges[`hundred:${id}`] = key;
    }
  }
  return badges;
}

type Runs = { run: StreakRun; mitzvahRuns: Record<string, StreakRun> };

export type FoldResult = { next: Achievements; live: Runs };

const ZERO_RUN: StreakRun = { days: 0, from: null, to: null };

function emptyAchievements(): Achievements {
  return { badges: {}, bestStreak: null, bestWeek: null, mitzvahBest: {}, fold: null };
}

function nextKey(key: string): string {
  return dateKey(addDays(calendarDay(key), 1));
}

function daysBetweenKeys(first: string, last: string): number {
  return Math.round((calendarDay(last).getTime() - calendarDay(first).getTime()) / 86400000);
}

function advance(run: StreakRun, key: string): StreakRun {
  return { days: run.days + 1, from: run.days === 0 ? key : run.from, to: key };
}

function cloneRuns(runs: Runs): Runs {
  return {
    run: { ...runs.run },
    mitzvahRuns: Object.fromEntries(Object.entries(runs.mitzvahRuns).map(([id, run]) => [id, { ...run }])),
  };
}

export function foldAchievements(
  input: HistoryInput,
  stored: Achievements | null,
  archived: MarkCounts,
  heroStreak: number,
  now: Date,
  judge: DayJudge,
  knownIds?: string[],
): FoldResult {
  const { location } = input;
  const keys = [...Object.keys(input.completions), ...Object.keys(input.skipped ?? {})].sort();
  if (!keys.length) return { next: stored ?? emptyAchievements(), live: { run: ZERO_RUN, mitzvahRuns: {} } };
  const earliest = keys[0];
  const today = appDay(now, location);
  const todayKey = dateKey(today);
  const floor = [earliest, dateKey(addDays(today, -RETENTION_DAYS))].reduce((a, b) => (a > b ? a : b));
  const fold = stored?.fold ?? null;
  const resumeKey = fold ? nextKey(fold.through) : null;
  const resumed = fold !== null && resumeKey !== null && resumeKey >= floor;
  const startKey = resumed ? resumeKey! : floor;
  let runs: Runs = resumed ? cloneRuns(fold!) : { run: { ...ZERO_RUN }, mitzvahRuns: {} };
  if (!resumed) {
    const beforeStart = dateKey(addDays(calendarDay(startKey), -1));
    const archivedRun = (input.archivedDays ?? []).find(([first, last]) => beforeStart >= first && beforeStart <= last);
    if (archivedRun) {
      runs.run = { days: daysBetweenKeys(archivedRun[0], beforeStart) + 1, from: archivedRun[0], to: beforeStart };
    }
  }
  const badges: Partial<Record<BadgeId, string>> = {};
  let bestStreak: DayRange | null = stored?.bestStreak ?? null;
  const mitzvahBest: Record<string, DayRange> = { ...(stored?.mitzvahBest ?? {}) };
  const lagKey = dateKey(addDays(today, -FOLD_LAG_DAYS));
  const mitzvahById = new Map(input.mitzvot.map((mitzvah) => [mitzvah.id, mitzvah]));
  let pendingSeen = false;
  let snapshot: { through: string; runs: Runs } | null = null;

  const settled = (days: Date[]): boolean => {
    let due = 0;
    for (const day of days) {
      for (const { state } of judge(day).items) {
        if (state === 'waiting' || state === 'open' || state === 'later' || state === 'missed' || state === 'skipped') {
          return false;
        }
        due += 1;
      }
    }
    return due > 0;
  };
  const rangeDays = (end: Date, length: number) =>
    Array.from({ length }, (_, index) => addDays(end, index - length + 1));

  for (let day = calendarDay(startKey); dateKey(day) <= todayKey; day = addDays(day, 1)) {
    const key = dateKey(day);
    const judged = judge(day);
    const verdict = verdictOf(judged);
    if (Object.keys(input.completions[key] ?? {}).length || isArchivedDay(input.archivedDays ?? [], key)) {
      runs.run = advance(runs.run, key);
    } else if (!input.mitzvot.length) {
      runs.run = { ...ZERO_RUN };
    } else {
      const holdsDay = verdict.pending.some((id) => !mitzvahById.get(id)?.multiDay);
      if (!holdsDay && verdict.missed.length) runs.run = { ...ZERO_RUN };
    }
    for (const id of verdict.done) {
      runs.mitzvahRuns[id] = advance(runs.mitzvahRuns[id] ?? ZERO_RUN, key);
      if (runs.mitzvahRuns[id].days > (mitzvahBest[id]?.days ?? 0)) {
        mitzvahBest[id] = { days: runs.mitzvahRuns[id].days, from: runs.mitzvahRuns[id].from!, to: key };
      }
    }
    for (const id of verdict.missed) runs.mitzvahRuns[id] = { ...ZERO_RUN };
    if (runs.run.days > (bestStreak?.days ?? 0)) {
      bestStreak = { days: runs.run.days, from: runs.run.from!, to: key };
    }
    for (const goal of STREAK_BADGE_DAYS) {
      if (runs.run.days === goal && !badges[`streak${goal}`]) badges[`streak${goal}`] = key;
    }
    if (day.getDay() === 6 && dateKey(addDays(day, -6)) >= earliest && settled(rangeDays(day, 7))) {
      badges.fullWeek ??= key;
    }
    const hd = new HDate(day);
    if (hd.next().getDate() === 1) {
      const length = hd.getDate();
      if (dateKey(addDays(day, 1 - length)) >= earliest && settled(rangeDays(day, length))) badges.fullMonth ??= key;
    }
    if (verdict.pending.length) pendingSeen = true;
    else if (!pendingSeen && key <= lagKey) snapshot = { through: key, runs: cloneRuns(runs) };
  }

  for (const goal of STREAK_BADGE_DAYS) {
    if (heroStreak >= goal && !badges[`streak${goal}`]) badges[`streak${goal}`] = appDayKey(now, location);
  }

  if (heroStreak > (bestStreak?.days ?? 0)) {
    bestStreak = { days: heroStreak, from: dateKey(addDays(today, 1 - heroStreak)), to: todayKey };
  }

  const weeksFromKey = fold ? dateKey(addDays(calendarDay(fold.through), -WEEK_RESCAN_DAYS)) : earliest;
  let bestWeek: BestWeek | null = null;
  let end = weekEndOnOrBefore(today, location, now);
  for (let scanned = 0; end && dateKey(end) >= weeksFromKey && scanned < MAX_WEEK_SCAN; scanned++) {
    const start = weekStartFor(end, location, now);
    let done = 0;
    let due = 0;
    let unsettled = 0;
    for (let day = start; day.getTime() <= end.getTime(); day = addDays(day, 1)) {
      for (const { state } of judge(day).items) {
        if (state === 'waiting' || state === 'later' || state === 'open') unsettled += 1;
        else {
          due += 1;
          if (state === 'done') done += 1;
        }
      }
    }
    if (unsettled === 0 && due > 0) {
      const percent = Math.round((done / due) * 100);
      if (!bestWeek || percent > bestWeek.percent || (percent === bestWeek.percent && due > bestWeek.due)) {
        bestWeek = { weekStart: dateKey(start), weekEnd: dateKey(end), done, due, percent };
      }
    }
    end = previousWeekEnd(end, location, now);
  }

  const nextFold = snapshot
    ? { through: snapshot.through, run: snapshot.runs.run, mitzvahRuns: snapshot.runs.mitzvahRuns }
    : (stored?.fold ?? null);
  return {
    next: {
      badges: { ...badges, ...markBadges(input.completions, archived, appDayKey(now, location), knownIds) },
      bestStreak,
      bestWeek,
      mitzvahBest,
      fold: nextFold,
    },
    live: runs,
  };
}

export type NextBadge = { id: BadgeId; done: number; goal: number };

export function nextBadges(
  achievements: Achievements | null,
  totals: MarkTotals,
  heroStreak: number,
  enabledIds: string[],
): NextBadge[] {
  const earned = achievements?.badges ?? {};
  const next: NextBadge[] = [];
  let top: { id: string; marks: number } | null = null;
  for (const id of enabledIds) {
    const marks = totals.byMitzvah[id] ?? 0;
    if (marks >= 1 && !earned[`hundred:${id}`] && (!top || marks > top.marks)) top = { id, marks };
  }
  if (top) next.push({ id: `hundred:${top.id}`, done: Math.min(top.marks, HUNDRED_MARKS), goal: HUNDRED_MARKS });
  if (!earned.thousandMarks)
    next.push({ id: 'thousandMarks', done: Math.min(totals.total, THOUSAND_MARKS), goal: THOUSAND_MARKS });
  const goal = STREAK_BADGE_DAYS.find((days) => !earned[`streak${days}`]);
  if (goal) next.push({ id: `streak${goal}`, done: Math.min(heroStreak, goal), goal });
  return next.slice(0, 3);
}

const KIND_ORDER: BadgeId[] = [
  'streak7',
  'streak30',
  'streak100',
  'streak365',
  'fullWeek',
  'fullMonth',
  'thousandMarks',
];

function orderOf(id: BadgeId): number {
  const index = KIND_ORDER.indexOf(id);
  return index === -1 ? KIND_ORDER.length : index;
}

export function earnedBadgeList(achievements: Achievements | null): { id: BadgeId; on: string }[] {
  return (Object.entries(achievements?.badges ?? {}) as [BadgeId, string][])
    .map(([id, on]) => ({ id, on }))
    .sort((a, b) => {
      if (a.on !== b.on) return a.on < b.on ? -1 : 1;
      if (orderOf(a.id) !== orderOf(b.id)) return orderOf(a.id) - orderOf(b.id);
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
}
