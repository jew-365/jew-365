import { DateTime } from 'luxon';
import { clockOf, formatRemaining } from '@/utils/clock';
import type { Translate } from '@/utils/dayArc';

export type DayEntryStatus = 'active' | 'upcoming' | 'done' | 'late' | 'skipped' | 'missed';

export type DayEntry = {
  id: string;
  status: DayEntryStatus;
  start: Date | null;
  end: Date | null;
  markedAt: number | null;
  date: Date;
};

const RANK: Record<DayEntryStatus, number> = { active: 0, upcoming: 1, done: 2, late: 2, skipped: 2, missed: 3 };

const isMarked = (status: DayEntryStatus) => status === 'done' || status === 'late' || status === 'skipped';

const sortKey = (e: DayEntry): number => {
  const ms = isMarked(e.status) ? e.markedAt : (e.start?.getTime() ?? null);
  return ms ?? Number.POSITIVE_INFINITY;
};

export function orderDayEntries(entries: readonly DayEntry[]): DayEntry[] {
  return [...entries].sort((a, b) => {
    const rank = RANK[a.status] - RANK[b.status];
    if (rank !== 0) return rank;
    const key = sortKey(a);
    const other = sortKey(b);
    if (key !== other) return key < other ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

const timeOf = (e: DayEntry): number =>
  (e.start ?? (e.markedAt !== null ? new Date(e.markedAt) : null))?.getTime() ?? Number.POSITIVE_INFINITY;

export function timeOrderDayEntries<T extends DayEntry>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => {
    const diff = timeOf(a) - timeOf(b);
    if (diff !== 0 && !Number.isNaN(diff)) return diff < 0 ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function dayRingCounts(entries: readonly DayEntry[]): {
  done: number;
  open: number;
  missed: number;
  total: number;
} {
  const count = (...statuses: DayEntryStatus[]) => entries.filter((e) => statuses.includes(e.status)).length;
  // Home counts a late mark as done; only history scores it as a miss.
  const done = count('done', 'late');
  const open = count('active', 'upcoming');
  const missed = count('missed');
  return { done, open, missed, total: done + open + missed };
}

export function ringDashOffset(circumference: number, fraction: number): number {
  return circumference * (1 - Math.min(1, Math.max(0, fraction)));
}

export function miniRingFraction(e: DayEntry, now: Date): number {
  if (e.status === 'upcoming') return 0;
  if (e.status !== 'active') return 1;
  if (!e.start || !e.end) return 0.03;
  const span = e.end.getTime() - e.start.getTime();
  return Math.min(1, Math.max(0.03, (now.getTime() - e.start.getTime()) / span));
}

export function railNowIndex(entries: readonly DayEntry[], now: Date): number | null {
  if (!entries.some((e) => e.status === 'active' || e.status === 'upcoming')) return null;
  const index = entries.findIndex((e) => timeOf(e) > now.getTime());
  return index === -1 ? entries.length : index;
}

export function dayEntryStatusText(e: DayEntry, now: Date, tz: string, t: Translate): string {
  const end = e.end ?? now;
  const start = e.start ?? now;
  switch (e.status) {
    case 'active':
      return t('home.day.status.active', { left: formatRemaining(end.getTime() - now.getTime(), t) });
    case 'upcoming':
      return t('home.day.status.upcoming', { time: clockOf(start, tz) });
    case 'done':
      return t('home.day.status.done', { time: clockOf(new Date(e.markedAt ?? now.getTime()), tz) });
    case 'late':
      return t('home.day.status.late', { time: clockOf(new Date(e.markedAt ?? now.getTime()), tz) });
    case 'skipped':
      return t('state.skipped');
    case 'missed':
      return t('home.day.status.missed', { time: clockOf(end, tz) });
  }
}

export function greetingKey(now: Date, tz: string, named: boolean): string {
  const h = DateTime.fromJSDate(now, { zone: tz }).hour;
  const part = h >= 4 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'afternoon' : h >= 17 && h < 21 ? 'evening' : 'night';
  return `home.greeting.${part}${named ? '' : 'Neutral'}`;
}

export function firstName(profileName: string): string {
  return profileName.trim().split(/\s+/)[0] ?? '';
}

export function heroCaption(
  open: { name: string; end: Date } | null,
  next: { name: string; start: Date } | null,
  allMarked: boolean,
  now: Date,
  tz: string,
  t: Translate,
): string {
  if (open) {
    return t('home.arc.caption.open', {
      name: open.name,
      left: formatRemaining(open.end.getTime() - now.getTime(), t),
    });
  }
  if (next) return t('home.arc.caption.next', { name: next.name, time: clockOf(next.start, tz) });
  return allMarked ? t('home.arc.caption.allDone') : '';
}
