import { DateTime } from 'luxon';
import type { BodyParams, ComputeContext, Mitzvah, Reminder, UserSettings } from '@/types/mitzvah';
import type { Location } from '@/types/zmanim';
import { hasSiddurText, siddurPlace } from '@/data/siddur';
import { ZmanimService } from '@/services/ZmanimService';
import {
  FOLLOW_UP_MAX_MIN,
  HEADS_UP_MAX_MIN,
  blockExitsWithin,
  isSkippedAt,
  opensQuietBlock,
  quietHoursTrigger,
  reminderFires,
  skipsIfDone,
} from '@/utils/skipRules';
import { MULTI_DAY_LOOKAHEAD_DAYS } from '@/utils/buildDayTimeline';
import { locationNoon } from '@/utils/locationDay';
import { interpolate, t, translate } from '@/i18n';
import { reminderLabel } from '@/utils/mitzvahName';
import { timeLeftColor, timeLeftLine } from '@/utils/timeLeft';
import { nagFor, repeatOffsets, type NagLevel } from '@/utils/nagging';
import { dateKey, type Completions } from '@/stores/useCompletionsStore';
import { MITZVAH_REMINDER_CATEGORY, MITZVAH_TEXT_CATEGORY, buildId } from '@/services/notifications/ids';
import type { PlanInput, ScheduleCandidate } from '@/services/notifications/types';
import { horizonDays, type Horizon } from '@/services/notifications/planners/horizon';

const NEXT_REMINDER_LOOKAHEAD_DAYS = 10;
const PAST_WINDOW_DAYS = 2;
const PLACEHOLDER = /%\{\w+\}/;

// `nagLevel` is the resolved nagging level of the mitzvah asked about (its own, else the app's);
// absent means level 1, no repeats beyond the reminders' own nags.
export type ReminderScope = Pick<
  PlanInput,
  'now' | 'location' | 'settings' | 'completions' | 'skipped' | 'quietHours'
> & {
  nagLevel?: NagLevel;
};

// `repeat` is 0 for the reminder's own notification (the main) and k for the k-th of the `of` repeats
// of its nag; `main` is the instant the main goes out, which a repeat counts from and words its body by.
export type WindowTrigger = {
  index: number;
  occurrence: number;
  reminder: Reminder;
  trigger: Date;
  moved: boolean;
  repeat: number;
  of: number;
  main: Date;
};

// A repeat of a nag as the preview shows it: `fires` false when the plan drops it, `afterEnd` when that
// is because it falls after the end of the time.
export type NagPreviewEntry = { trigger: Date; fires: boolean; afterEnd: boolean };
export type NagChain = { main: Date; repeats: NagPreviewEntry[] };

type PlannedCandidate = { candidate: ScheduleCandidate; moved: boolean };

// The rules of `reminderFires()` without the past: whether a main is alive, so that its repeats still
// due are planned after the main itself has gone out.
const NO_PAST = new Date(0);

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
  // Only a main is compared; a main left to the earlier window takes its repeats with it.
  const isHeadsUp = ({ reminder, main }: WindowTrigger) =>
    reminder.anchor === 'clock' && main.getTime() < own.window.start.getTime();
  if (!own.triggers.some(isHeadsUp)) return own;
  const earlier = ownTriggers(mitzvah, reminders, dayBefore(date), scope)?.triggers ?? [];
  const heldEarlier = ({ index, main }: WindowTrigger) =>
    earlier.some((other) => other.index === index && other.main.getTime() === main.getTime());
  return { ...own, triggers: own.triggers.filter((entry) => !(isHeadsUp(entry) && heldEarlier(entry))) };
}

type ChainEntry = { repeat: number; planned: Date; trigger: Date | null; fires: boolean };

// The repeats of one main (spec 3.5): each counted from the main's final instant, moved by the quiet
// hours and judged by the same `reminderFires()` as the main.
function repeatsOf(
  mitzvahId: string,
  reminder: Reminder,
  main: Date,
  window: { start: Date; end: Date },
  latest: Date,
  scope: ReminderScope,
): ChainEntry[] {
  const nag = nagFor(mitzvahId, reminder, scope.nagLevel);
  if (!nag) return [];
  const { location, now, quietHours } = scope;
  return repeatOffsets(nag).map((offset, i) => {
    const planned = new Date(main.getTime() + offset * 60_000);
    const trigger = quietHours ? quietHoursTrigger(planned, quietHours, latest, location) : planned;
    const fires = trigger !== null && reminderFires(trigger, window, location, now, reminder.anchor);
    return { repeat: i + 1, planned, trigger, fires };
  });
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
    const latest =
      reminder.anchor === 'followUp' ? new Date(window.end.getTime() + FOLLOW_UP_MAX_MIN * 60_000) : window.end;
    // The reminder editor rejects out-of-window offsets up front; this is the backstop for
    // already-persisted ones, and the same rule drops anything inside a Shabbat / Yom Tov block.
    buildTriggerTimes(reminder, window, location).forEach((planned, occurrence) => {
      const main = scope.quietHours ? quietHoursTrigger(planned, scope.quietHours, latest, location) : planned;
      // No main, no repeats; a main that has already gone out keeps the repeats still due.
      if (!main || !reminderFires(main, window, location, NO_PAST, reminder.anchor)) return;
      const chain = repeatsOf(mitzvah.id, reminder, main, window, latest, scope);
      const of = chain.length;
      const entry = { index, occurrence, reminder, of, main };
      if (main.getTime() > now.getTime()) {
        triggers.push({ ...entry, trigger: main, moved: main.getTime() !== planned.getTime(), repeat: 0 });
      }
      for (const { repeat, planned: at, trigger, fires } of chain) {
        if (fires && trigger) triggers.push({ ...entry, trigger, moved: trigger.getTime() !== at.getTime(), repeat });
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

// Thinning keeps mains only: a nag's repeats are the first thing a full schedule gives up.
function thinned(planned: WindowTriggers): WindowTrigger[] {
  const end = planned.window.end.getTime();
  const mains = planned.triggers.filter(({ repeat }) => repeat === 0);
  const eligible = mains.filter(
    ({ reminder, trigger }) =>
      reminder.anchor !== 'followUp' && reminder.anchor !== 'blockExit' && trigger.getTime() <= end,
  );
  if (!eligible.length) {
    return mains.length
      ? [mains.reduce((earliest, entry) => (entry.trigger.getTime() < earliest.trigger.getTime() ? entry : earliest))]
      : [];
  }
  return [eligible.reduce((latest, entry) => (entry.trigger.getTime() > latest.trigger.getTime() ? entry : latest))];
}

function candidatesFor(mitzvah: Mitzvah, date: Date, input: PlanInput, thin: boolean): PlannedCandidate[] {
  const { location, settings } = input;
  const reminders = input.reminderOverrides[mitzvah.id] ?? mitzvah.defaultReminders;
  const nagLevel = input.nagLevels?.[mitzvah.id] ?? input.nagLevel;
  const planned = windowTriggers(mitzvah, reminders, date, { ...input, nagLevel });
  if (!planned?.triggers.length) return [];

  const english = input.language === 'en';
  const hasText = hasSiddurText(mitzvah, settings.nusach, date, siddurPlace(location, settings.inIsrael));
  const params = bodyParamsOn(mitzvah, date, location, settings);
  return (thin ? thinned(planned) : planned.triggers).map(
    ({ index, occurrence, reminder, trigger, moved, repeat, of, main }) => {
      // Candle lighting fires on the block's opening edge: its text would open only the Shabbat screen.
      // A repeat follows its main: the same category, text button and wording.
      const offersText = hasText && !opensQuietBlock(main, location);
      const id = buildId(mitzvah.id, date, index, occurrence, repeat);
      const body = bodyForReminder(reminder, mitzvah, main, english, params);
      return {
        candidate: {
          id,
          trigger,
          channel: 'mitzvot',
          categoryIdentifier: offersText ? MITZVAH_TEXT_CATEGORY : MITZVAH_REMINDER_CATEGORY,
          title: mitzvahTitle(mitzvah, english),
          subtitle: timeLeftLine(trigger, planned.window, location.tz, t),
          ...(timeLeftColor(trigger, planned.window) ? { color: timeLeftColor(trigger, planned.window) } : {}),
          body: repeat ? `${body} · ${t('notifications.nag.repeat', { k: repeat, n: of })}` : body,
          data: {
            mitzvahId: mitzvah.id,
            windowEnd: planned.window.end.toISOString(),
            dateKey: dateKey(date),
            reminderIndex: index,
            ...(repeat ? { repeat: { k: repeat, of } } : {}),
            customId: id,
            skipIfDone: skipsIfDone(reminder),
            hasText: offersText,
            fullContent: mitzvah.contentBlocks ?? null,
          },
        },
        moved,
      };
    },
  );
}

// One notification per instant per mitzvah: a group that holds a moved trigger or a repeat keeps one,
// a main before a repeat, then the later day, the lower reminder index and the lower repeat. Two
// unmoved mains that coincide stay, as they always did.
function withoutDuplicates(planned: PlannedCandidate[]): ScheduleCandidate[] {
  const groups = new Map<string, PlannedCandidate[]>();
  for (const entry of planned) {
    const key = `${entry.candidate.data.mitzvahId}|${entry.candidate.trigger.getTime()}`;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  const repeatOf = (c: ScheduleCandidate) => c.data.repeat?.k ?? 0;
  const beats = (a: ScheduleCandidate, b: ScheduleCandidate) => {
    if (Boolean(repeatOf(a)) !== Boolean(repeatOf(b))) return !repeatOf(a);
    const [dayA, dayB] = [a.data.dateKey ?? '', b.data.dateKey ?? ''];
    if (dayA !== dayB) return dayA > dayB;
    const [indexA, indexB] = [a.data.reminderIndex ?? 0, b.data.reminderIndex ?? 0];
    return indexA !== indexB ? indexA < indexB : repeatOf(a) < repeatOf(b);
  };
  const dropped = new Set<ScheduleCandidate>();
  for (const group of groups.values()) {
    if (group.length < 2 || !group.some(({ moved, candidate }) => moved || repeatOf(candidate))) continue;
    const kept = group.reduce((best, entry) => (beats(entry.candidate, best.candidate) ? entry : best));
    group.forEach(({ candidate }) => candidate !== kept.candidate && dropped.add(candidate));
  }
  return planned.map(({ candidate }) => candidate).filter((candidate) => !dropped.has(candidate));
}

// With `thinFrom`, every day from that one on keeps one trigger per window (see `thinned()`).
export function planMitzvot(input: PlanInput, horizon: Horizon, thinFrom?: Date): ScheduleCandidate[] {
  const candidates: PlannedCandidate[] = [];
  const back = Math.max(PAST_WINDOW_DAYS, ...input.mitzvot.map(plannedDaysBack));
  [...pastDays(horizon.days[0], back), ...horizon.days].forEach((day, position) => {
    for (const mitzvah of input.mitzvot) {
      if (position < back - plannedDaysBack(mitzvah)) continue;
      // Isolate per mitzvah: one failure must never abort the rest of the batch, or a single
      // bad computation leaves the user with an empty schedule (cancelAll already ran).
      try {
        const thin = thinFrom !== undefined && day.getTime() >= thinFrom.getTime();
        candidates.push(...candidatesFor(mitzvah, day, input, thin));
      } catch (err) {
        if (__DEV__) console.warn('[notifications] scheduling failed', mitzvah.id, err);
      }
    }
  });
  return withoutDuplicates(candidates);
}

// The chain of `draft`'s next main as the plan would send it: the first main after `scope.now` over the
// same days `nextReminderAt()` walks, and its repeats, each flagged when the plan drops it (outside the
// time, in a holy block, or folded into the main or an earlier repeat by the quiet hours). `null` when the
// draft never fires. The reminder editor previews its repeats and Settings' example the whole chain.
export function nagChain(mitzvah: Mitzvah, draft: Reminder, scope: ReminderScope): NagChain | null {
  const [today] = horizonDays(scope.now, scope.location);
  const ahead = mitzvah.multiDay ? MULTI_DAY_LOOKAHEAD_DAYS : NEXT_REMINDER_LOOKAHEAD_DAYS;
  let next: { main: WindowTrigger; window: { start: Date; end: Date } } | null = null;
  for (let offset = -plannedDaysBack(mitzvah); offset < ahead; offset++) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    const planned = windowTriggers(mitzvah, [draft], date, scope);
    for (const entry of planned?.triggers ?? []) {
      if (entry.repeat === 0 && (!next || entry.trigger.getTime() < next.main.trigger.getTime())) {
        next = { main: entry, window: planned!.window };
      }
    }
  }
  if (!next) return null;
  const { main, window } = next;
  const latest = draft.anchor === 'followUp' ? new Date(window.end.getTime() + FOLLOW_UP_MAX_MIN * 60_000) : window.end;
  const seen = new Set([main.trigger.getTime()]);
  const repeats = repeatsOf(mitzvah.id, draft, main.trigger, window, latest, scope).map(
    ({ planned, trigger, fires }) => {
      const at = trigger ?? planned;
      const kept = fires && !seen.has(at.getTime());
      if (kept) seen.add(at.getTime());
      const afterEnd = at.getTime() > latest.getTime();
      return { trigger: at, fires: kept, afterEnd };
    },
  );
  return { main: main.trigger, repeats };
}

export const nagPreview = (mitzvah: Mitzvah, draft: Reminder, scope: ReminderScope): NagPreviewEntry[] =>
  nagChain(mitzvah, draft, scope)?.repeats ?? [];
