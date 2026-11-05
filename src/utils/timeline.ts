import { DateTime } from 'luxon';
import type { LastChance, ManualNag, NagKind, Reminder } from '@/types/mitzvah';
import { manualNagFor, type Interval } from './nagging';

// The mitzvah screen's notification timeline (the owner's pick of 2026-11-05, direction א of
// design/lab/studies/2026-11-04-timeline-dots): every send of the window as a dot on its axis. The rules a drag, a step,
// an add and a zoom follow, pure, so the screen draws and the suite pins them.

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

// The step of the values panel's -5 / +5.
export const TIMELINE_STEP_MIN = 5;
// The zoom opens this long before the critical zone.
export const ZOOM_LEAD_MIN = 30;

// An instant held to the window, on a whole minute.
export function clampToWindow(at: number, window: Interval): Date {
  const minute = Math.round(at / MIN) * MIN;
  return new Date(Math.min(window.end.getTime(), Math.max(window.start.getTime(), minute)));
}

// Whether a reminder's dot drags along the axis: one counted from the window's start or end, and a set time while the
// window lasts less than a day (a set time fires at its first hour in the window, so on a longer one it could not stay
// where it is dropped). A follow-up comes after the window and an exit of Shabbat reminder by the block: their dots open
// the editor instead.
export function reminderDraggable(reminder: Reminder, window: Interval): boolean {
  if (reminder.anchor === 'start' || reminder.anchor === 'end') return true;
  return reminder.anchor === 'clock' && window.end.getTime() - window.start.getTime() < DAY;
}

// The reminder moved to `at` (held to the window), keeping its kind of anchor: minutes from the start, minutes before
// the end, or the hour on the location's clock. Its rotating bodies are dropped, as the reminder editor drops them on
// an edit; everything else stays.
export function reminderMovedTo(reminder: Reminder, at: Date, window: Interval, tz: string): Reminder {
  const held = clampToWindow(at.getTime(), window);
  const { bodyVariants: _variants, ...rest } = reminder;
  if (reminder.anchor === 'clock') {
    const local = DateTime.fromJSDate(held, { zone: tz });
    return { ...rest, offsetMin: local.hour * 60 + local.minute };
  }
  if (reminder.anchor === 'end') {
    // `|| 0` keeps an offset at the end itself a plain 0, never -0.
    return { ...rest, offsetMin: -Math.round((window.end.getTime() - held.getTime()) / MIN) || 0 };
  }
  return { ...rest, offsetMin: Math.round((held.getTime() - window.start.getTime()) / MIN) };
}

// A new reminder at `at`, counted from the edge it is nearer to, labelled `label` (the mitzvah's name, as the reminder
// editor saves an empty label).
export function reminderAt(at: Date, window: Interval, label: string): Reminder {
  const held = clampToWindow(at.getTime(), window);
  const fromStart = Math.round((held.getTime() - window.start.getTime()) / MIN);
  const toEnd = Math.round((window.end.getTime() - held.getTime()) / MIN);
  return fromStart <= toEnd
    ? { anchor: 'start', offsetMin: fromStart, label }
    : { anchor: 'end', offsetMin: -toEnd || 0, label };
}

export type TimelineNag = { at: number; kind: NagKind; lastChance?: LastChance };

// The window's nags as the user's own list, `moved` (by its instant) taken to `to`, or left out when `to` is null:
// what a drag, a step or a delete of a nag saves. The first such change turns the smart nag's nags into the user's.
export function nagsEdited(
  nags: readonly TimelineNag[],
  window: Interval,
  moved: number,
  to: Date | null,
): ManualNag[] {
  return nags.flatMap((nag) => {
    if (nag.at !== moved) return [manualNagFor(new Date(nag.at), window, nag.kind, nag.lastChance)];
    if (!to) return [];
    return [manualNagFor(clampToWindow(to.getTime(), window), window, nag.kind, nag.lastChance)];
  });
}

// The stretch of time the axis shows: the whole window, or zoomed on the critical time, from `ZOOM_LEAD_MIN` before
// the zone to as long after it, held to the window: the end of a day window, where the zone and its last-chance points
// are, and up to half an hour past chatzot for a night one, whose zone opens it.
export function timelineView(window: Interval, zone: readonly Interval[], zoomed: boolean): Interval {
  if (!zoomed || !zone.length) return window;
  const lead = ZOOM_LEAD_MIN * MIN;
  const from = Math.max(window.start.getTime(), zone[0].start.getTime() - lead);
  const to = Math.min(window.end.getTime(), zone[zone.length - 1].end.getTime() + lead);
  return { start: new Date(from), end: new Date(to) };
}

// Where an instant sits along a view, 0 at its start and 1 at its end; outside the view below 0 or above 1.
export function shareOf(at: number, view: Interval): number {
  const length = view.end.getTime() - view.start.getTime();
  return length > 0 ? (at - view.start.getTime()) / length : 0;
}

// The instant at a share of a view, the share held to 0..1.
export function timeAtShare(share: number, view: Interval): Date {
  const held = Math.min(1, Math.max(0, share));
  return new Date(view.start.getTime() + held * (view.end.getTime() - view.start.getTime()));
}
