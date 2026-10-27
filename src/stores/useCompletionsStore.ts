import { create } from 'zustand';
import { persist, createJSONStorage } from './zustandMiddleware';
import { createZustandStorage } from '@/services/StorageService';
import { afterPaint } from '@/utils/afterPaint';
import { STORE_VERSION, migrate, onRehydrateStorage } from './persistOptions';

export type Completions = Record<string, Record<string, number>>;
// A finished check-in per Shabbat / Yom Tov block, keyed by the block's first holy day.
export type CheckIns = Record<string, number>;
// Runs of consecutive days, [first, last] date keys, that had a completion when retention pruned
// them. The detail is gone, but the streak still knows those days were kept.
export type ArchivedDays = [string, string][];

export type BadgeId =
  'streak7' | 'streak30' | 'streak100' | 'streak365' | 'fullWeek' | 'fullMonth' | 'thousandMarks' | `hundred:${string}`;
export type StreakRun = { days: number; from: string | null; to: string | null };
export type DayRange = { days: number; from: string; to: string };
export type BestWeek = { weekStart: string; weekEnd: string; done: number; due: number; percent: number };
export type AchievementFold = { through: string; run: StreakRun; mitzvahRuns: Record<string, StreakRun> };
export type Achievements = {
  badges: Partial<Record<BadgeId, string>>;
  bestStreak: DayRange | null;
  bestWeek: BestWeek | null;
  mitzvahBest: Record<string, DayRange>;
  fold: AchievementFold | null;
};
export type MarkCounts = { lastKey: string | null; total: number; byMitzvah: Record<string, number> };

export const EMPTY_MARK_COUNTS: MarkCounts = Object.freeze({
  lastKey: null,
  total: 0,
  byMitzvah: Object.freeze({}) as Record<string, number>,
}) as MarkCounts;

type CompletionsState = {
  completions: Completions;
  skipped: Completions;
  checkIns: CheckIns;
  archivedDays: ArchivedDays;
  achievements: Achievements | null;
  archivedMarks: MarkCounts;
  saveAchievements: (next: Achievements) => void;
  markDone: (id: string, date?: Date) => void;
  markSkipped: (id: string, date?: Date) => void;
  unmark: (id: string, date?: Date) => void;
  finishCheckIn: (blockId: string) => void;
  isDone: (id: string, date?: Date) => boolean;
  isSkipped: (id: string, date?: Date) => boolean;
  countForDate: (date?: Date) => number;
  completionsForDate: (date?: Date) => Record<string, number>;
  skippedForDate: (date?: Date) => Record<string, number>;
  reset: () => void;
};

export const RETENTION_DAYS = 400;

// Returns the ORIGINAL map when nothing changes. The old version returned `{}` for a missing day,
// which made every markDone write an empty `"YYYY-MM-DD": {}` bucket into the sibling map — pure
// noise that still had to be serialised on every tap.
function withoutMark(source: Record<string, number> | undefined, id: string): Record<string, number> | undefined {
  if (!source?.[id]) return source;
  const next = { ...source };
  delete next[id];
  return Object.keys(next).length ? next : undefined;
}

function setDay(map: Completions, key: string, value: Record<string, number> | undefined): Completions {
  if (!value) {
    if (!(key in map)) return map;
    const next = { ...map };
    delete next[key];
    return next;
  }
  return { ...map, [key]: value };
}

function retentionCutoffKey(today: Date): string {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  return dateKey(cutoff);
}

// The maps are rewritten to MMKV on every single tap, so they cannot grow without bound. The UI
// never reads further back than the history window, except the streak, which reads the archive.
export function pruneCompletions(map: Completions, today: Date = new Date()): Completions {
  const cutoffKey = retentionCutoffKey(today);
  const entries = Object.entries(map).filter(([key, value]) => key >= cutoffKey && Object.keys(value).length);
  return entries.length === Object.keys(map).length ? map : Object.fromEntries(entries);
}

export function pruneCheckIns(checkIns: CheckIns, today: Date = new Date()): CheckIns {
  const cutoffKey = retentionCutoffKey(today);
  const entries = Object.entries(checkIns).filter(([key]) => key >= cutoffKey);
  return entries.length === Object.keys(checkIns).length ? checkIns : Object.fromEntries(entries);
}

function nextDayKey(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  return dateKey(new Date(year, month - 1, day + 1));
}

// Folds the days retention is about to drop into the archive's runs, merging touching runs.
export function archiveMarkedDays(
  archive: ArchivedDays,
  completions: Completions,
  today: Date = new Date(),
): ArchivedDays {
  const cutoffKey = retentionCutoffKey(today);
  const dropped = Object.entries(completions)
    .filter(([key, value]) => key < cutoffKey && Object.keys(value).length)
    .map(([key]) => key);
  if (!dropped.length) return archive;
  const runs = [...archive, ...dropped.map((key): [string, string] => [key, key])].sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  const merged: ArchivedDays = [];
  for (const [first, last] of runs) {
    const previous = merged[merged.length - 1];
    if (previous && first <= nextDayKey(previous[1])) {
      if (last > previous[1]) previous[1] = last;
    } else {
      merged.push([first, last]);
    }
  }
  return merged;
}

function longerRange<T extends { days: number }>(prev: T | null | undefined, next: T | null | undefined): T | null {
  if (!next) return prev ?? null;
  if (!prev) return next;
  return next.days > prev.days ? next : prev;
}

function betterWeek(prev: BestWeek | null, next: BestWeek | null): BestWeek | null {
  if (!next) return prev;
  if (!prev) return next;
  if (next.percent !== prev.percent) return next.percent > prev.percent ? next : prev;
  return next.due > prev.due ? next : prev;
}

export function mergeAchievements(prev: Achievements | null, next: Achievements): Achievements {
  if (!prev) return next;
  const mitzvahBest: Record<string, DayRange> = { ...prev.mitzvahBest };
  for (const [id, range] of Object.entries(next.mitzvahBest)) {
    mitzvahBest[id] = longerRange(prev.mitzvahBest[id], range) ?? range;
  }
  return {
    badges: { ...next.badges, ...prev.badges },
    bestStreak: longerRange(prev.bestStreak, next.bestStreak),
    bestWeek: betterWeek(prev.bestWeek, next.bestWeek),
    mitzvahBest,
    fold: next.fold,
  };
}

export function archiveMarkCounts(counts: MarkCounts, completions: Completions, today: Date = new Date()): MarkCounts {
  const cutoffKey = retentionCutoffKey(today);
  const keys = Object.keys(completions)
    .filter((key) => key < cutoffKey && (counts.lastKey === null || key > counts.lastKey))
    .sort();
  if (!keys.length) return counts;
  const byMitzvah = { ...counts.byMitzvah };
  let total = counts.total;
  for (const key of keys) {
    for (const id of Object.keys(completions[key])) {
      total += 1;
      byMitzvah[id] = (byMitzvah[id] ?? 0) + 1;
    }
  }
  return { lastKey: keys[keys.length - 1], total, byMitzvah };
}

export function isArchivedDay(archive: ArchivedDays, key: string): boolean {
  return archive.some(([first, last]) => key >= first && key <= last);
}

export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const useCompletionsStore = create<CompletionsState>()(
  persist(
    (set, get) => ({
      completions: {},
      skipped: {},
      checkIns: {},
      archivedDays: [],
      achievements: null,
      archivedMarks: EMPTY_MARK_COUNTS,
      saveAchievements: (next) =>
        set((s) => {
          const merged = mergeAchievements(s.achievements, next);
          return JSON.stringify(merged) === JSON.stringify(s.achievements) ? s : { achievements: merged };
        }),
      markDone: (id, date = new Date()) => {
        const key = dateKey(date);
        set((s) => ({
          completions: { ...s.completions, [key]: { ...(s.completions[key] ?? {}), [id]: Date.now() } },
          skipped: setDay(s.skipped, key, withoutMark(s.skipped[key], id)),
        }));
        afterPaint(() => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy: the scheduler imports this store
            const { NotificationScheduler } = require('@/services/NotificationScheduler');
            NotificationScheduler.cancelForMitzvah(id, date).catch(() => {});
            NotificationScheduler.settleCheckIn(date).catch(() => {});
          } catch {}
        });
      },
      markSkipped: (id, date = new Date()) => {
        const key = dateKey(date);
        set((s) => ({
          completions: setDay(s.completions, key, withoutMark(s.completions[key], id)),
          skipped: { ...s.skipped, [key]: { ...(s.skipped[key] ?? {}), [id]: Date.now() } },
        }));
        afterPaint(() => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy: the scheduler imports this store
            const { NotificationScheduler } = require('@/services/NotificationScheduler');
            NotificationScheduler.cancelForMitzvah(id, date).catch(() => {});
            NotificationScheduler.settleCheckIn(date).catch(() => {});
          } catch {}
        });
      },
      unmark: (id, date = new Date()) => {
        const key = dateKey(date);
        set((s) => ({
          completions: setDay(s.completions, key, withoutMark(s.completions[key], id)),
          skipped: setDay(s.skipped, key, withoutMark(s.skipped[key], id)),
        }));
        queueMicrotask(() => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy: the scheduler imports this store
            const { NotificationScheduler } = require('@/services/NotificationScheduler');
            NotificationScheduler.rebuild().catch(() => {});
          } catch {}
        });
      },
      finishCheckIn: (blockId) => {
        if (get().checkIns[blockId]) return;
        set((s) => ({ checkIns: { ...s.checkIns, [blockId]: Date.now() } }));
        queueMicrotask(() => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy: the scheduler imports this store
            const { NotificationScheduler } = require('@/services/NotificationScheduler');
            NotificationScheduler.cancelCheckIn(blockId).catch(() => {});
          } catch {}
        });
      },
      isDone: (id, date = new Date()) => {
        const key = dateKey(date);
        return Boolean(get().completions[key]?.[id]);
      },
      isSkipped: (id, date = new Date()) => {
        const key = dateKey(date);
        return Boolean(get().skipped[key]?.[id]);
      },
      countForDate: (date = new Date()) => {
        const key = dateKey(date);
        return Object.keys(get().completions[key] ?? {}).length;
      },
      completionsForDate: (date = new Date()) => {
        const key = dateKey(date);
        return get().completions[key] ?? {};
      },
      skippedForDate: (date = new Date()) => {
        const key = dateKey(date);
        return get().skipped[key] ?? {};
      },
      reset: () =>
        set({
          completions: {},
          skipped: {},
          checkIns: {},
          archivedDays: [],
          achievements: null,
          archivedMarks: EMPTY_MARK_COUNTS,
        }),
    }),
    {
      name: 'completions-store',
      storage: createJSONStorage(() => createZustandStorage()),
      version: STORE_VERSION,
      migrate,
      onRehydrateStorage: onRehydrateStorage('completions-store'),
      merge: (persisted: unknown, current: CompletionsState): CompletionsState => {
        const saved = persisted as Partial<CompletionsState> | undefined;
        const completions = saved?.completions ?? {};
        return {
          ...current,
          ...saved,
          archivedMarks: archiveMarkCounts(saved?.archivedMarks ?? EMPTY_MARK_COUNTS, completions),
          archivedDays: archiveMarkedDays(saved?.archivedDays ?? [], completions),
          completions: pruneCompletions(completions),
          skipped: pruneCompletions(saved?.skipped ?? {}),
          checkIns: pruneCheckIns(saved?.checkIns ?? {}),
        };
      },
    },
  ),
);
