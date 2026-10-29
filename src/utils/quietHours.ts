import { DateTime } from 'luxon';

export type QuietBound = { enabled: boolean; minutes: number };
export type QuietHours = { before: number | null; after: number | null };

export const QUIET_BEFORE_DEFAULT_MIN = 420;
export const QUIET_AFTER_DEFAULT_MIN = 1320;
export const QUIET_MIN_OPEN_MIN = 60;
export const NO_QUIET_HOURS: QuietHours = { before: null, after: null };
export const DEFAULT_QUIET_BEFORE: QuietBound = { enabled: false, minutes: QUIET_BEFORE_DEFAULT_MIN };
export const DEFAULT_QUIET_AFTER: QuietBound = { enabled: false, minutes: QUIET_AFTER_DEFAULT_MIN };

const LAST_MINUTE = 1439;
const DAY_MINUTES = 1440;

const isClockMinute = (v: unknown): v is number =>
  Number.isInteger(v) && (v as number) >= 0 && (v as number) <= LAST_MINUTE;

export function quietHoursValid(h: QuietHours): boolean {
  if ((h.before !== null && !isClockMinute(h.before)) || (h.after !== null && !isClockMinute(h.after))) return false;
  return (h.after ?? DAY_MINUTES) - (h.before ?? 0) >= QUIET_MIN_OPEN_MIN;
}

const boundsOf = (before: QuietBound, after: QuietBound): QuietHours => ({
  before: before.enabled ? before.minutes : null,
  after: after.enabled ? after.minutes : null,
});

export function quietBoundsValid(before: QuietBound, after: QuietBound): boolean {
  return quietHoursValid(boundsOf(before, after));
}

export function isQuietBound(v: unknown): v is QuietBound {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as QuietBound).enabled === 'boolean' &&
    isClockMinute((v as QuietBound).minutes)
  );
}

export function quietBoundOf(saved: unknown, fallback: QuietBound): QuietBound {
  if (typeof saved !== 'object' || saved === null) return fallback;
  const { enabled, minutes } = saved as { enabled?: unknown; minutes?: unknown };
  return { enabled: enabled === true, minutes: isClockMinute(minutes) ? minutes : fallback.minutes };
}

export function quietHoursOf(before: QuietBound, after: QuietBound): QuietHours {
  const hours = boundsOf(before, after);
  return quietHoursValid(hours) ? hours : NO_QUIET_HOURS;
}

const minuteOfDay = (d: DateTime) => d.hour * 60 + d.minute + (d.second * 1000 + d.millisecond) / 60_000;

export function inQuietHours(instant: Date, hours: QuietHours, zone: string): boolean {
  if (!quietHoursValid(hours)) return false;
  const minute = minuteOfDay(DateTime.fromJSDate(instant, { zone }));
  return (hours.before !== null && minute < hours.before) || (hours.after !== null && minute > hours.after);
}

export function quietHoursEdge(trigger: Date, hours: QuietHours, zone: string): Date | null {
  if (!inQuietHours(trigger, hours, zone)) return trigger;
  if (hours.before === null) return null;
  const local = DateTime.fromJSDate(trigger, { zone });
  const day = minuteOfDay(local) < hours.before ? local : local.plus({ days: 1 });
  return day
    .set({ hour: Math.floor(hours.before / 60), minute: hours.before % 60, second: 0, millisecond: 0 })
    .toJSDate();
}
