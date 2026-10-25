import { DateTime } from 'luxon';
import type { BodyParams, ComputeContext, Mitzvah, Reminder, UserSettings } from '@/types/mitzvah';
import type { Location } from '@/types/zmanim';
import { hasSiddurText, siddurPlace } from '@/data/siddur';
import { ZmanimService } from '@/services/ZmanimService';
import {
  HEADS_UP_MAX_MIN,
  blockExitsWithin,
  isSkippedAt,
  opensQuietBlock,
  reminderFires,
  skipsIfDone,
} from '@/utils/skipRules';
import { MULTI_DAY_LOOKAHEAD_DAYS } from '@/utils/buildDayTimeline';
import { locationNoon } from '@/utils/locationDay';
import { interpolate, t, translate } from '@/i18n';
import { reminderLabel } from '@/utils/mitzvahName';
import { dateKey, type Completions } from '@/stores/useCompletionsStore';
import { MITZVAH_REMINDER_CATEGORY, MITZVAH_TEXT_CATEGORY, buildId } from '@/services/notifications/ids';
import type { PlanInput, ScheduleCandidate } from '@/services/notifications/types';
import { horizonDays, type Horizon } from '@/services/notifications/planners/horizon';

const NEXT_REMINDER_LOOKAHEAD_DAYS = 10;
const PAST_WINDOW_DAYS = 2;
const PLACEHOLDER = /%\{\w+\}/;

export type ReminderScope = Pick<PlanInput, 'now' | 'location' | 'settings' | 'completions' | 'skipped'>;

export type WindowTrigger = { index: number; occurrence: number; reminder: Reminder; trigger: Date };

// `date` is a calendar day as every day-level surface holds it: the device-local midnight of the
// location's date, whose zmanim are read at the location's own noon.
function contextFor(date: Date, location: Location, settings: UserSettings): ComputeContext | null {
  const zmanim = ZmanimService.getZmanim(locationNoon(date, location), location);
  return zmanim ? { date, location, settings, zmanim } : null;
}

function bodyParamsOn(mitzvah: Mitzvah, date: Date, location: Location, settings: UserSettings): BodyParams | null {
  const { bodyParams } = mitzvah;
  if (!bodyParams) return null;
  const ctx = contextFor(date, location, settings);
  return ctx ? bodyParams(ctx) : null;
}

// The first instant at that wall-clock time on the location's clock at or after `from`. A time a
// spring-forward day skips resolves the way Luxon resolves it, an hour later.
function clockTriggerAfter(from: Date, minutesAfterMidnight: number, zone: string): Date {
  const first = DateTime.fromJSDate(from, { zone }).set({
    hour: Math.floor(minutesAfterMidnight / 60),
    minute: minutesAfterMidnight % 60,
    second: 0,
    millisecond: 0,
  });
  return (first.toMillis() < from.getTime() ? first.plus({ days: 1 }) : first).toJSDate();
}

export function buildTriggerTime(
  reminder: Reminder,
  window: { start: Date; end: Date },
  location: Pick<Location, 'tz'>,
): Date {
  if (reminder.anchor === 'clock') {
    const inWindow = clockTriggerAfter(window.start, reminder.offsetMin, location.tz);
    if (inWindow.getTime() <= window.end.getTime()) return inWindow;
    return clockTriggerAfter(
      new Date(window.start.getTime() - HEADS_UP_MAX_MIN * 60_000),
      reminder.offsetMin,
      location.tz,
    );
  }
  const anchor = reminder.anchor === 'start' ? window.start : window.end;
  return new Date(anchor.getTime() + reminder.offsetMin * 60_000);
}

export function buildTriggerTimes(reminder: Reminder, window: { start: Date; end: Date }, location: Location): Date[] {
  if (reminder.anchor === 'blockExit') {
    return blockExitsWithin(window, location).map((exit) => new Date(exit.getTime() + reminder.offsetMin * 60_000));
  }
  return [buildTriggerTime(reminder, window, location)];
}

function mitzvahTitle(mitzvah: Mitzvah, english: boolean): string {
  return english && mitzvah.name.en ? mitzvah.name.en : mitzvah.name.he;
}

function isRegistryText(mitzvah: Mitzvah, text: string): boolean {
  const value = text.trim();
  if (!value) return true;
  const own = [
    mitzvah.name.he,
    mitzvah.name.en,
    ...mitzvah.defaultReminders.flatMap((reminder) => [reminder.label, ...(reminder.bodyVariants ?? [])]),
  ];
  return own.some((entry) => entry?.trim() === value);
}

function paramsIn(params: BodyParams | null, language: 'he' | 'en'): Record<string, string | number> | undefined {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, typeof value === 'object' ? value[language] : value]),
  );
}

export function bodyForReminder(
  reminder: Reminder,
  mitzvah: Mitzvah,
  trigger: Date,
  englishUi: boolean,
  params: BodyParams | null = null,
): string {
  // Registry labels and bodyVariants are Hebrew-only. Rather than deliver unreadable text to an
  // English user, fall back to a translated line built from the English mitzvah name.
  const english = englishUi && mitzvah.name.en;
  const variants = reminder.bodyVariants?.filter((value) => value.trim().length > 0) ?? [];
  const label = reminderLabel(reminder, mitzvahTitle(mitzvah, englishUi));
  const source = variants.length ? variants : [label];
  const idx = Math.floor(trigger.getTime() / 86_400_000) % source.length;
  const chosen = source[idx] ?? label;
  const followUp = reminder.anchor === 'followUp';
  const key = followUp ? 'reminder.followUp.label' : (mitzvah.bodyKey ?? 'notifications.timeFor');
  const hebrewFromKey =
    params !== null &&
    !followUp &&
    mitzvah.bodyKey !== undefined &&
    !PLACEHOLDER.test(chosen) &&
    isRegistryText(mitzvah, chosen);
  const base = english
    ? t(key, { ...paramsIn(params, 'en'), name: mitzvah.name.en })
    : hebrewFromKey
      ? translate(key, { ...paramsIn(params, 'he'), name: mitzvah.name.he }, 'he')
      : interpolate(chosen, paramsIn(params, 'he'));
  if (!reminder.includeContentInBody || !mitzvah.contentBlocks?.length) return base;
  const content = mitzvah.contentBlocks
    .filter((block) => block.type === 'text' || block.type === 'blessing')
    .map((block) => (english ? (block.en ?? block.he) : block.he).trim())
    .filter(Boolean)
    .join('\n');
  return content ? `${base}\n${content}` : base;
}

function isMarked(marks: Completions, mitzvahId: string, date: Date): boolean {
  return Boolean(marks[dateKey(date)]?.[mitzvahId]);
}

type WindowTriggers = { window: { start: Date; end: Date }; triggers: WindowTrigger[] };

// The one place the per-window rules live, for the plan and for the mitzvah screen's next-reminder
// preview alike: `date` has a window, it is not skipped or marked, and each trigger that fires. A
// clock heads-up that the day before's window already fires at that instant (a 03:00 reminder that
// the day before's window, running past 03:00, holds) stays with that earlier window.
export function windowTriggers(
  mitzvah: Mitzvah,
  reminders: Reminder[],
  date: Date,
  scope: ReminderScope,
): WindowTriggers | null {
  const own = ownTriggers(mitzvah, reminders, date, scope);
  if (!own) return null;
  const isHeadsUp = ({ reminder, trigger }: WindowTrigger) =>
    reminder.anchor === 'clock' && trigger.getTime() < own.window.start.getTime();
  if (!own.triggers.some(isHeadsUp)) return own;
  const earlier = ownTriggers(mitzvah, reminders, dayBefore(date), scope)?.triggers ?? [];
  const heldEarlier = ({ index, trigger }: WindowTrigger) =>
    earlier.some((other) => other.index === index && other.trigger.getTime() === trigger.getTime());
  return { ...own, triggers: own.triggers.filter((entry) => !(isHeadsUp(entry) && heldEarlier(entry))) };
}

function ownTriggers(mitzvah: Mitzvah, reminders: Reminder[], date: Date, scope: ReminderScope): WindowTriggers | null {
  const { location, settings, now } = scope;
  const ctx = contextFor(date, location, settings);
  if (!ctx) return null;
  const window = mitzvah.computeWindow(ctx);
  if (!window) return null;
  if (isSkippedAt(mitzvah, window.start, location, settings)) return null;
  if (isMarked(scope.completions, mitzvah.id, date) || isMarked(scope.skipped, mitzvah.id, date)) return null;

  const triggers: WindowTrigger[] = [];
  reminders.forEach((reminder, index) => {
    // The reminder editor rejects out-of-window offsets up front; this is the backstop for
    // already-persisted ones, and the same rule drops anything inside a Shabbat / Yom Tov block.
    buildTriggerTimes(reminder, window, location).forEach((trigger, occurrence) => {
      if (reminderFires(trigger, window, location, now, reminder.anchor)) {
        triggers.push({ index, occurrence, reminder, trigger });
      }
    });
  });
  return { window, triggers };
}

// Yesterday's window may still be open after midnight (a custom mitzvah set across midnight).
function dayBefore(day: Date): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1);
}

const plannedDaysBack = (mitzvah: Mitzvah) => Math.max(PAST_WINDOW_DAYS, mitzvah.multiDay?.maxDays ?? 0);

function pastDays(first: Date, count: number): Date[] {
  return Array.from(
    { length: count },
    (_, index) => new Date(first.getFullYear(), first.getMonth(), first.getDate() - count + index),
  );
}

export function nextReminderAt(mitzvah: Mitzvah, reminders: Reminder[], scope: ReminderScope): Date | null {
  const [today] = horizonDays(scope.now, scope.location);
  let earliest: number | null = null;
  const ahead = mitzvah.multiDay ? MULTI_DAY_LOOKAHEAD_DAYS : NEXT_REMINDER_LOOKAHEAD_DAYS;
  for (let offset = -plannedDaysBack(mitzvah); offset < ahead; offset++) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    for (const { trigger } of windowTriggers(mitzvah, reminders, date, scope)?.triggers ?? []) {
      if (earliest === null || trigger.getTime() < earliest) earliest = trigger.getTime();
    }
  }
  return earliest === null ? null : new Date(earliest);
}

function candidatesFor(mitzvah: Mitzvah, date: Date, input: PlanInput): ScheduleCandidate[] {
  const { location, settings } = input;
  const reminders = input.reminderOverrides[mitzvah.id] ?? mitzvah.defaultReminders;
  const planned = windowTriggers(mitzvah, reminders, date, input);
  if (!planned?.triggers.length) return [];

  const english = input.language === 'en';
  const hasText = hasSiddurText(mitzvah, settings.nusach, date, siddurPlace(location, settings.inIsrael));
  const params = bodyParamsOn(mitzvah, date, location, settings);
  return planned.triggers.map(({ index, occurrence, reminder, trigger }) => {
    // Candle lighting fires on the block's opening edge: its text would open only the Shabbat screen.
    const offersText = hasText && !opensQuietBlock(trigger, location);
    const id = buildId(mitzvah.id, date, index, occurrence);
    return {
      id,
      trigger,
      channel: 'mitzvot',
      categoryIdentifier: offersText ? MITZVAH_TEXT_CATEGORY : MITZVAH_REMINDER_CATEGORY,
      title: mitzvahTitle(mitzvah, english),
      body: bodyForReminder(reminder, mitzvah, trigger, english, params),
      data: {
        mitzvahId: mitzvah.id,
        windowEnd: planned.window.end.toISOString(),
        dateKey: dateKey(date),
        reminderIndex: index,
        customId: id,
        skipIfDone: skipsIfDone(reminder),
        hasText: offersText,
        fullContent: mitzvah.contentBlocks ?? null,
      },
    };
  });
}

export function planMitzvot(input: PlanInput, horizon: Horizon): ScheduleCandidate[] {
  const candidates: ScheduleCandidate[] = [];
  const back = Math.max(PAST_WINDOW_DAYS, ...input.mitzvot.map(plannedDaysBack));
  [...pastDays(horizon.days[0], back), ...horizon.days].forEach((day, position) => {
    for (const mitzvah of input.mitzvot) {
      if (position < back - plannedDaysBack(mitzvah)) continue;
      // Isolate per mitzvah: one failure must never abort the rest of the batch, or a single
      // bad computation leaves the user with an empty schedule (cancelAll already ran).
      try {
        candidates.push(...candidatesFor(mitzvah, day, input));
      } catch (err) {
        if (__DEV__) console.warn('[notifications] scheduling failed', mitzvah.id, err);
      }
    }
  });
  return candidates;
}
