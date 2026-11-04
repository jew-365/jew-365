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
import { TIME_STAGE_COLOR, sendStage, timeLeftLine, type SendKind } from '@/utils/timeLeft';
import {
  customNagZone,
  hasLastChance,
  hasSparseTail,
  nagZoneKindOf,
  performMinOf,
  smartNagTimes,
  type Interval,
  type LastChance,
  type NagKind,
  type NagLevel,
  type NagZoneKind,
} from '@/utils/nagging';
import { HebcalService } from '@/services/HebcalService';
import { dateKey, type Completions } from '@/stores/useCompletionsStore';
import { MITZVAH_REMINDER_CATEGORY, MITZVAH_TEXT_CATEGORY, buildId, buildNagId } from '@/services/notifications/ids';
import type { PlanInput, ScheduleCandidate } from '@/services/notifications/types';
import { horizonDays, type Horizon } from '@/services/notifications/planners/horizon';

const NEXT_REMINDER_LOOKAHEAD_DAYS = 10;
const PAST_WINDOW_DAYS = 2;
const PLACEHOLDER = /%\{\w+\}/;

// `nagLevel` is the resolved nagging level of the mitzvah asked about (its own, else the app's); absent means level 1,
// the last-chance points alone.
export type ReminderScope = Pick<
  PlanInput,
  'now' | 'location' | 'settings' | 'completions' | 'skipped' | 'quietHours'
> & {
  nagLevel?: NagLevel;
};

// A window's reminder trigger, or one of its nags (the smart nag, .claude/specs/smart-nag.md): the k-th of the
// window's `of` nags, of a `kind`, a last-chance point naming which.
export type ReminderTrigger = {
  type: 'reminder';
  index: number;
  occurrence: number;
  reminder: Reminder;
  trigger: Date;
  moved: boolean;
};
export type NagTrigger = {
  type: 'nag';
  k: number;
  of: number;
  kind: NagKind;
  lastChance?: LastChance;
  trigger: Date;
  moved: boolean;
};
export type WindowTrigger = ReminderTrigger | NagTrigger;

type PlannedCandidate = { candidate: ScheduleCandidate; moved: boolean };

// The rules of `reminderFires()` without the past: a reminder already sent still keeps the nags their distance,
// and the stages read the whole window.
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
  // Only a reminder is compared: the nags are never before their window.
  const isHeadsUp = (entry: WindowTrigger) =>
    entry.type === 'reminder' &&
    entry.reminder.anchor === 'clock' &&
    entry.trigger.getTime() < own.window.start.getTime();
  if (!own.triggers.some(isHeadsUp)) return own;
  const earlier = ownTriggers(mitzvah, reminders, dayBefore(date), { ...scope, now: NO_PAST })?.triggers ?? [];
  const heldEarlier = (entry: WindowTrigger) =>
    entry.type === 'reminder' &&
    earlier.some(
      (other) =>
        other.type === 'reminder' && other.index === entry.index && other.trigger.getTime() === entry.trigger.getTime(),
    );
  return { ...own, triggers: own.triggers.filter((entry) => !(isHeadsUp(entry) && heldEarlier(entry))) };
}

// The critical zone of `date`'s window (spec 2.3), by the mitzvah's kind, and whether a sparse tail follows it;
// `smartNagTimes()` clips it to the window.
function nagZone(mitzvah: Mitzvah, window: Interval, ctx: ComputeContext): { zone: Interval[]; sparse: boolean } {
  const kind = nagZoneKindOf(mitzvah.id);
  if (kind === 'custom') {
    const startDay = DateTime.fromJSDate(window.start, { zone: ctx.location.tz }).toISODate();
    const crossesMidnight = startDay !== DateTime.fromJSDate(window.end, { zone: ctx.location.tz }).toISODate();
    const lastChance = new Date(window.end.getTime() - performMinOf(mitzvah).alone * 60_000);
    return customNagZone(window, lastChance, { crossesMidnight, chatzotLayla: ctx.zmanim.chatzotLayla });
  }
  return { zone: kindZone(kind, window, ctx), sparse: hasSparseTail(kind) };
}

function kindZone(kind: NagZoneKind, window: Interval, ctx: ComputeContext): Interval[] {
  const { start, end } = window;
  const third = (until: Date): Interval[] => [
    { start: new Date(until.getTime() - (until.getTime() - start.getTime()) / 3), end: until },
  ];
  switch (kind) {
    case 'night':
    case 'evening':
      return [{ start, end: ctx.zmanim.chatzotLayla }];
    case 'firstHour':
      return [{ start, end: new Date(start.getTime() + 60 * 60_000) }];
    case 'lastMinutes':
      return [{ start: new Date(end.getTime() - 20 * 60_000), end }];
    case 'learning':
      return [{ start: ctx.zmanim.shkia, end: ctx.zmanim.chatzotLayla }];
    case 'preDawn': {
      const alot = ZmanimService.getZmanim(end, ctx.location)?.alotHaShachar;
      return third(alot && alot.getTime() < end.getTime() && alot.getTime() > start.getTime() ? alot : end);
    }
    case 'nights':
      return lastNights(window, ctx.location, 3);
    default:
      return third(end);
  }
}

// Nightfall to chatzot halayla of the last `count` nights that open inside the window, in order.
function lastNights(window: Interval, location: Location, count: number): Interval[] {
  const last = DateTime.fromJSDate(window.end, { zone: location.tz });
  const nights: Interval[] = [];
  for (let back = 0; back <= count + 2 && nights.length < count; back++) {
    const day = new Date(last.year, last.month - 1, last.day - back);
    const zmanim = ZmanimService.getZmanim(locationNoon(day, location), location);
    if (!zmanim) continue;
    const start = new Date(Math.max(HebcalService.nightfall(zmanim, location).getTime(), window.start.getTime()));
    const end = new Date(Math.min(zmanim.chatzotLayla.getTime(), window.end.getTime()));
    if (end.getTime() > start.getTime()) nights.unshift({ start, end });
  }
  return nights;
}

function ownTriggers(mitzvah: Mitzvah, reminders: Reminder[], date: Date, scope: ReminderScope): WindowTriggers | null {
  const { location, settings, now, quietHours } = scope;
  const ctx = contextFor(date, location, settings);
  if (!ctx) return null;
  const window = mitzvah.computeWindow(ctx);
  if (!window) return null;
  if (isSkippedAt(mitzvah, window.start, location, settings)) return null;
  if (isMarked(scope.completions, mitzvah.id, date) || isMarked(scope.skipped, mitzvah.id, date)) return null;

  const triggers: WindowTrigger[] = [];
  const sent: Date[] = [];
  reminders.forEach((reminder, index) => {
    const latest =
      reminder.anchor === 'followUp' ? new Date(window.end.getTime() + FOLLOW_UP_MAX_MIN * 60_000) : window.end;
    // The reminder editor rejects out-of-window offsets up front; this is the backstop for
    // already-persisted ones, and the same rule drops anything inside a Shabbat / Yom Tov block.
    buildTriggerTimes(reminder, window, location).forEach((planned, occurrence) => {
      const trigger = quietHours ? quietHoursTrigger(planned, quietHours, latest, location) : planned;
      // Judged without the past, so a reminder already sent still keeps the nags their distance.
      if (!trigger || !reminderFires(trigger, window, location, NO_PAST, reminder.anchor)) return;
      sent.push(trigger);
      if (trigger.getTime() <= now.getTime()) return;
      const moved = trigger.getTime() !== planned.getTime();
      triggers.push({ type: 'reminder', index, occurrence, reminder, trigger, moved });
    });
  });

  // The smart nag (spec 2): the window's last-chance points and its level's nags in the critical zone, judged by the
  // quiet hours and the holy blocks as a reminder is, and never before the window or after its end.
  const kind = nagZoneKindOf(mitzvah.id);
  const perform = performMinOf(mitzvah);
  const before = (minutes: number | undefined) =>
    minutes && hasLastChance(kind) ? new Date(window.end.getTime() - minutes * 60_000) : null;
  const moves = new Map<number, number>();
  const { zone, sparse } = nagZone(mitzvah, window, ctx);
  const nags = smartNagTimes({
    level: scope.nagLevel,
    window,
    zone,
    sparseUntil: sparse ? window.end : null,
    lastChance: { alone: before(perform.alone), minyan: before(perform.minyan) },
    taken: sent,
    accept: (planned) => {
      const at = quietHours ? quietHoursTrigger(planned, quietHours, window.end, location) : planned;
      if (!at || at.getTime() < window.start.getTime() || !reminderFires(at, window, location, NO_PAST, 'start')) {
        return null;
      }
      moves.set(at.getTime(), planned.getTime());
      return at;
    },
  });
  nags.forEach(({ at, kind: nagKind, lastChance }, i) => {
    if (at.getTime() <= now.getTime()) return;
    const moved = moves.get(at.getTime()) !== at.getTime();
    triggers.push({ type: 'nag', k: i + 1, of: nags.length, kind: nagKind, lastChance, trigger: at, moved });
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
    for (const entry of windowTriggers(mitzvah, reminders, date, scope)?.triggers ?? []) {
      // The mitzvah's own reminders: the smart nag's notifications come on top of them and are not named here.
      if (entry.type !== 'reminder') continue;
      const { trigger } = entry;
      if (earliest === null || trigger.getTime() < earliest) earliest = trigger.getTime();
    }
  }
  return earliest === null ? null : new Date(earliest);
}

// Thinning keeps reminders only: the nags are the first thing a full schedule gives up.
function thinned(planned: WindowTriggers): WindowTrigger[] {
  const end = planned.window.end.getTime();
  const mains = planned.triggers.filter((entry): entry is ReminderTrigger => entry.type === 'reminder');
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

const sendKindOf = (entry: WindowTrigger): SendKind =>
  entry.type === 'reminder' ? 'reminder' : entry.lastChance === 'alone' ? 'lastChanceAlone' : 'nag';

function nagBody(entry: NagTrigger, name: string): string {
  if (entry.lastChance)
    return t(entry.lastChance === 'alone' ? 'notifications.nag.lastChance' : 'notifications.nag.lastChanceMinyan');
  return t('notifications.nag.notMarked', { name });
}

function candidatesFor(mitzvah: Mitzvah, date: Date, input: PlanInput, thin: Thinning | null): PlannedCandidate[] {
  const { location, settings } = input;
  const reminders = input.reminderOverrides[mitzvah.id] ?? mitzvah.defaultReminders;
  const nagLevel = input.nagLevels?.[mitzvah.id] ?? input.nagLevel;
  const planned = windowTriggers(mitzvah, reminders, date, { ...input, nagLevel });
  if (!planned?.triggers.length) return [];
  // The stage by the window's sends from its first one, whatever is already past or marked (spec 2.5): the last red.
  const sends = windowSendTimes(mitzvah, reminders, date, { ...input, nagLevel }) ?? [];
  const lastAt = sends.length ? sends[sends.length - 1].at : null;
  const stageOf = (entry: WindowTrigger) => sendStage(sendKindOf(entry), entry.trigger.getTime() === lastAt);

  const english = input.language === 'en';
  const title = mitzvahTitle(mitzvah, english);
  const hasText = hasSiddurText(mitzvah, settings.nusach, date, siddurPlace(location, settings.inIsrael));
  const params = bodyParamsOn(mitzvah, date, location, settings);
  const kept =
    thin === 'one'
      ? thinned(planned)
      : thin === 'nags'
        ? planned.triggers.filter((entry) => entry.type === 'reminder')
        : planned.triggers;
  return kept.map((entry) => {
    const { trigger, moved } = entry;
    // Candle lighting fires on the block's opening edge: its text would open only the Shabbat screen.
    const offersText = hasText && !opensQuietBlock(trigger, location);
    const stage = stageOf(entry);
    const id =
      entry.type === 'reminder'
        ? buildId(mitzvah.id, date, entry.index, entry.occurrence)
        : buildNagId(mitzvah.id, date, entry.k);
    const body =
      entry.type === 'reminder'
        ? bodyForReminder(entry.reminder, mitzvah, trigger, english, params)
        : nagBody(entry, title);
    return {
      candidate: {
        id,
        trigger,
        channel: 'mitzvot',
        categoryIdentifier: offersText ? MITZVAH_TEXT_CATEGORY : MITZVAH_REMINDER_CATEGORY,
        title,
        subtitle: timeLeftLine(trigger, planned.window, location.tz, t, stage),
        color: TIME_STAGE_COLOR[stage],
        body,
        data: {
          mitzvahId: mitzvah.id,
          windowEnd: planned.window.end.toISOString(),
          dateKey: dateKey(date),
          ...(entry.type === 'reminder'
            ? { reminderIndex: entry.index }
            : {
                nag: {
                  k: entry.k,
                  of: entry.of,
                  kind: entry.kind,
                  ...(entry.lastChance ? { lastChance: entry.lastChance } : {}),
                },
              }),
          customId: id,
          skipIfDone: entry.type === 'reminder' ? skipsIfDone(entry.reminder) : true,
          hasText: offersText,
          fullContent: mitzvah.contentBlocks ?? null,
        },
      },
      moved,
    };
  });
}

// One notification per instant per mitzvah: a group that holds a moved trigger or a nag keeps one,
// a reminder before a nag, then the later day, the lower reminder index and the lower nag. Two
// unmoved reminders that coincide stay, as they always did.
function withoutDuplicates(planned: PlannedCandidate[]): ScheduleCandidate[] {
  const groups = new Map<string, PlannedCandidate[]>();
  for (const entry of planned) {
    const key = `${entry.candidate.data.mitzvahId}|${entry.candidate.trigger.getTime()}`;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  const repeatOf = (c: ScheduleCandidate) => c.data.nag?.k ?? 0;
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

// How a day from `thinFrom` on is thinned: `nags` keeps every reminder and drops the window's nags, `one` keeps one
// trigger per window (see `thinned()`).
export type Thinning = 'nags' | 'one';

// With `thinFrom`, every day from that one on is thinned by `thinning`.
export function planMitzvot(
  input: PlanInput,
  horizon: Horizon,
  thinFrom?: Date,
  thinning: Thinning = 'one',
): ScheduleCandidate[] {
  const candidates: PlannedCandidate[] = [];
  const back = Math.max(PAST_WINDOW_DAYS, ...input.mitzvot.map(plannedDaysBack));
  [...pastDays(horizon.days[0], back), ...horizon.days].forEach((day, position) => {
    for (const mitzvah of input.mitzvot) {
      if (position < back - plannedDaysBack(mitzvah)) continue;
      // Isolate per mitzvah: one failure must never abort the rest of the batch, or a single
      // bad computation leaves the user with an empty schedule (cancelAll already ran).
      try {
        const thin = thinFrom !== undefined && day.getTime() >= thinFrom.getTime() ? thinning : null;
        candidates.push(...candidatesFor(mitzvah, day, input, thin));
      } catch (err) {
        if (__DEV__) console.warn('[notifications] scheduling failed', mitzvah.id, err);
      }
    }
  });
  return withoutDuplicates(candidates);
}

// What `date`'s window of `mitzvah` sends, in order, from its first trigger and whatever is marked: every reminder and
// nag the plan lets through (the end of the time, the holy blocks and the quiet hours), one per instant where the plan
// keeps one (`withoutDuplicates()`). `null` when the day has no window or skips it. Settings' example draws it.
export type WindowSend = { at: number; kind: 'reminder' | NagKind; lastChance?: LastChance };

export function windowSends(
  mitzvah: Mitzvah,
  reminders: Reminder[],
  date: Date,
  scope: Omit<ReminderScope, 'now' | 'completions' | 'skipped'>,
): WindowSend[] | null {
  const planned = windowTriggers(mitzvah, reminders, date, { ...scope, now: NO_PAST, completions: {}, skipped: {} });
  if (!planned) return null;
  const atInstant = new Map<number, WindowTrigger[]>();
  for (const entry of planned.triggers) {
    const key = entry.trigger.getTime();
    atInstant.set(key, [...(atInstant.get(key) ?? []), entry]);
  }
  const sends: WindowSend[] = [];
  for (const [at, group] of atInstant) {
    const collapses = group.length > 1 && group.some((entry) => entry.moved || entry.type === 'nag');
    const kept = collapses ? [group.find((entry) => entry.type === 'reminder') ?? group[0]] : group;
    for (const entry of kept) {
      sends.push(
        entry.type === 'reminder'
          ? { at, kind: 'reminder' }
          : { at, kind: entry.kind, ...(entry.lastChance ? { lastChance: entry.lastChance } : {}) },
      );
    }
  }
  return sends.sort((a, b) => a.at - b.at);
}

const windowSendTimes = windowSends;

// How many notifications `date`'s window sends in all (`windowSends()`), and how many of them are nags.
// Home's bell prints `total` while the mitzvah's level adds nags.
export type WindowNotificationCount = { total: number; nags: number };

export function windowNotificationCount(
  mitzvah: Mitzvah,
  reminders: Reminder[],
  date: Date,
  scope: Omit<ReminderScope, 'now' | 'completions' | 'skipped'>,
): WindowNotificationCount | null {
  const sends = windowSends(mitzvah, reminders, date, scope);
  if (!sends) return null;
  return { total: sends.length, nags: sends.filter(({ kind }) => kind !== 'reminder').length };
}
