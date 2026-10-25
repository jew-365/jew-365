import { DateTime } from 'luxon';
import { findMitzvah } from '@/data/mitzvot';
import { STANDALONE_TEXTS, isSiddurTextId, standaloneTextId } from '@/data/siddur';
import { formatDate } from '@/i18n';
import { TIME_PATTERN, minutesToTime, timeToMinutes } from '@/utils/clock';
import { mitzvahName } from '@/utils/mitzvahName';
import { FOLLOW_UP_MAX_MIN, HEADS_UP_MAX_MIN } from '@/utils/skipRules';
import {
  ContentBlock,
  CustomMitzvah,
  CustomSchedule,
  MitzvahCategory,
  Reminder,
  ScheduleEntry,
  Weekday,
} from '@/types/mitzvah';

export type DraftBlock = ContentBlock | { type: 'siddur'; he: string; en?: string; textId: null };

export const WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6];
export const ALL_DAY_MIN = 480;
export const NIGHT_END_MIN = 4 * 60;

const DAY_MIN = 24 * 60;
const DAY_MS = 24 * 60 * 60_000;
const NOON_MIN = 12 * 60;
const AFTERNOON_END_MIN = 17 * 60;

export function windowMinutes(startHHMM: string, endHHMM: string): number {
  const span = timeToMinutes(endHHMM) - timeToMinutes(startHHMM);
  return span > 0 ? span : span + DAY_MIN;
}

export function categoryForWindow(startHHMM: string, endHHMM: string): MitzvahCategory {
  const duration = windowMinutes(startHHMM, endHHMM);
  if (duration >= ALL_DAY_MIN) return 'daily-allday';
  const midpoint = (timeToMinutes(startHHMM) + duration / 2) % DAY_MIN;
  if (midpoint < NIGHT_END_MIN) return 'daily-evening';
  if (midpoint < NOON_MIN) return 'daily-morning';
  return midpoint < AFTERNOON_END_MIN ? 'daily-afternoon' : 'daily-evening';
}

export function isActiveOn(activeDays: Weekday[] | undefined, weekday: Weekday): boolean {
  return activeDays === undefined || activeDays.includes(weekday);
}

type ScheduleSource = Pick<CustomMitzvah, 'activeDays' | 'schedules'>;

export const SCHEDULE_ORIGIN = '0000-01-01';
export const STREAK_MAX_DAYS = 365;
export const STREAK_DEFAULT_DAYS = 40;

const SCHEDULE_DATE_PATTERN = { he: 'd LLLL yyyy', en: 'LLL d, yyyy' } as const;

function utcOfKey(key: string): number {
  const [year, month, day] = key.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function weekdayOfKey(key: string): Weekday {
  return new Date(utcOfKey(key)).getUTCDay() as Weekday;
}

export function addDaysToKey(key: string, days: number): string {
  return new Date(utcOfKey(key) + days * DAY_MS).toISOString().slice(0, 10);
}

export function schedulesOf(custom: ScheduleSource): ScheduleEntry[] {
  return custom.schedules?.length
    ? custom.schedules
    : [{ from: SCHEDULE_ORIGIN, schedule: { mode: 'weekdays', days: custom.activeDays ?? [...WEEKDAYS] } }];
}

export function scheduleInForce(custom: ScheduleSource, dayKey: string): CustomSchedule | null {
  let found: ScheduleEntry | null = null;
  for (const entry of schedulesOf(custom)) {
    if (entry.from <= dayKey && (!found || entry.from >= found.from)) found = entry;
  }
  return found?.schedule ?? null;
}

export function currentSchedule(custom: ScheduleSource): CustomSchedule {
  return schedulesOf(custom).reduce((last, entry) => (entry.from >= last.from ? entry : last)).schedule;
}

function lastDayOf(schedule: CustomSchedule): string | null {
  if (schedule.mode === 'range') return schedule.end;
  if (schedule.mode === 'streak') return addDaysToKey(schedule.start, schedule.days - 1);
  return null;
}

export function appliesOn(custom: ScheduleSource, dayKey: string): boolean {
  const schedule = scheduleInForce(custom, dayKey);
  if (!schedule) return false;
  if (schedule.mode === 'weekdays') return isActiveOn(schedule.days, weekdayOfKey(dayKey));
  const last = lastDayOf(schedule);
  return schedule.start <= dayKey && last !== null && dayKey <= last;
}

export function customEndedOn(custom: ScheduleSource, todayKey: string): string | null {
  const last = lastDayOf(currentSchedule(custom));
  return last !== null && last < todayKey ? last : null;
}

export function isCustomEnded(custom: ScheduleSource, todayKey: string): boolean {
  return customEndedOn(custom, todayKey) !== null;
}

export function customStartsOn(custom: ScheduleSource, todayKey: string): string | null {
  const schedule = currentSchedule(custom);
  return schedule.mode !== 'weekdays' && schedule.start > todayKey ? schedule.start : null;
}

export function endedCustomIds(
  customs: CustomMitzvah[],
  active: Record<string, { enabled: boolean }>,
  todayKey: string,
): string[] {
  return customs
    .filter((custom) => active[custom.id]?.enabled && isCustomEnded(custom, todayKey))
    .map((custom) => custom.id);
}

function sameSchedule(a: CustomSchedule, b: CustomSchedule): boolean {
  if (a.mode === 'weekdays' && b.mode === 'weekdays') {
    return [...a.days].sort((x, y) => x - y).join() === [...b.days].sort((x, y) => x - y).join();
  }
  if (a.mode === 'range' && b.mode === 'range') return a.start === b.start && a.end === b.end;
  if (a.mode === 'streak' && b.mode === 'streak') return a.days === b.days;
  return false;
}

export function scheduleOnSave(
  custom: ScheduleSource | undefined,
  next: CustomSchedule,
  todayKey: string,
): ScheduleEntry[] {
  const schedule: CustomSchedule =
    next.mode === 'weekdays'
      ? { mode: 'weekdays', days: [...next.days].sort((a, b) => a - b) }
      : next.mode === 'streak'
        ? { mode: 'streak', start: todayKey, days: next.days }
        : { mode: 'range', start: next.start, end: next.end };
  if (!custom) return [{ from: todayKey, schedule }];
  const entries = schedulesOf(custom);
  if (sameSchedule(currentSchedule(custom), schedule)) return entries;
  return [...entries.filter((entry) => entry.from < todayKey), { from: todayKey, schedule }];
}

export function validStreakDays(days: number): boolean {
  return Number.isInteger(days) && days >= 1 && days <= STREAK_MAX_DAYS;
}

export function streakStartOnSave(custom: ScheduleSource | undefined, days: number, todayKey: string): string {
  const saved = currentSchedule({
    schedules: scheduleOnSave(custom, { mode: 'streak', start: todayKey, days }, todayKey),
  });
  return saved.mode === 'streak' ? saved.start : todayKey;
}

export function streakEndedOnSave(custom: ScheduleSource | undefined, days: number, todayKey: string): string | null {
  return customEndedOn(
    { schedules: scheduleOnSave(custom, { mode: 'streak', start: todayKey, days }, todayKey) },
    todayKey,
  );
}

export function scheduleDateLabel(key: string, language: 'he' | 'en'): string {
  return formatDate(DateTime.fromISO(key), SCHEDULE_DATE_PATTERN[language], language);
}

export function reminderClock(
  startHHMM: string,
  endHHMM: string,
  reminder: Pick<Reminder, 'anchor' | 'offsetMin'>,
): string | null {
  if (!TIME_PATTERN.test(startHHMM) || !TIME_PATTERN.test(endHHMM)) return null;
  const start = timeToMinutes(startHHMM);
  const duration = windowMinutes(startHHMM, endHHMM);
  const fromStart =
    reminder.anchor === 'clock'
      ? clockFromStart(reminder.offsetMin, start, duration)
      : (reminder.anchor === 'start' ? 0 : duration) + reminder.offsetMin;
  const [earliest, latest] =
    reminder.anchor === 'followUp' ? [duration + 1, duration + FOLLOW_UP_MAX_MIN] : [-HEADS_UP_MAX_MIN, duration];
  if (!(fromStart >= earliest && fromStart <= latest)) return null;
  return minutesToTime((((start + fromStart) % DAY_MIN) + DAY_MIN) % DAY_MIN);
}

function clockFromStart(minutesAfterMidnight: number, start: number, duration: number): number {
  if (!Number.isInteger(minutesAfterMidnight) || minutesAfterMidnight < 0 || minutesAfterMidnight >= DAY_MIN) {
    return Number.NaN;
  }
  const after = (minutesAfterMidnight - start + DAY_MIN) % DAY_MIN;
  return after > duration && after >= DAY_MIN - HEADS_UP_MAX_MIN ? after - DAY_MIN : after;
}

export function siddurTextName(id: string, language: 'he' | 'en'): string | null {
  const standalone = standaloneTextId(id);
  if (standalone) return STANDALONE_TEXTS[standalone].name[language];
  const mitzvah = findMitzvah(id);
  return mitzvah ? mitzvahName(mitzvah, language) : null;
}

export function cleanContentBlock(block: DraftBlock): ContentBlock | null {
  const he = block.he.trim();
  if (!he) return null;
  if (block.type === 'link') {
    const url = block.url.trim();
    return url ? { type: 'link', he, en: block.en, url } : null;
  }
  if (block.type === 'siddur') {
    return block.textId && isSiddurTextId(block.textId)
      ? { type: 'siddur', he, en: block.en, textId: block.textId }
      : null;
  }
  return { ...block, he };
}

export function cleanContentBlocks(blocks: DraftBlock[]): ContentBlock[] | undefined {
  const cleaned = blocks.map(cleanContentBlock).filter((block): block is ContentBlock => block !== null);
  return cleaned.length ? cleaned : undefined;
}
