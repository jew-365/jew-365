import { clockOf, formatRemaining, fireTimeText } from './clock';

type Translate = (scope: string, options?: Record<string, unknown>) => string;

// A notification's stage: green, orange or red (the owner's picks of 2026-11-04 in the study
// design/lab/studies/2026-11-04-time-and-nag, by the notification's place in its window since the same evening).
export type TimeStage = 'green' | 'orange' | 'red';

// Android's accent colour by stage, direction ז's: it tints the notification's small icon where the phone draws it
// (stock Android; Samsung's One UI shows the app icon untinted), and on Android 11 and older the app name.
export const TIME_STAGE_COLOR: Record<TimeStage, string> = { green: '#13804A', orange: '#B85F00', red: '#C5221F' };

// A notification's stage in its window (the owner's rule of 2026-11-05, built 2026-11-08): exactly one red and one
// orange per window. The last-chance point alone is red, the minyan point or the `soon` point before it orange, and
// every other notification, reminder or nag, green (plain, no mark). A window without a red point (Kiddush Levana, or
// one the quiet hours dropped) takes its last notification as the red: `lastWithoutRed`.
export type SendKind = 'reminder' | 'nag' | 'warning' | 'lastChanceAlone';

export function sendStage(kind: SendKind, lastWithoutRed: boolean): TimeStage {
  if (kind === 'lastChanceAlone' || lastWithoutRed) return 'red';
  return kind === 'warning' ? 'orange' : 'green';
}

// The mark that opens the line of a red or orange notification, on every phone (an emoji draws its own colour, which
// no phone strips): a red exclamation mark, a warning sign.
export const STAGE_MARK: Record<TimeStage, string> = { green: '', orange: '⚠️', red: '❗' };

// The time a line names, as UTF-16 offsets into the line (the units of a Java string): the end time when the line
// has one, else the time left before the window opens. Android's notification builder, patched in the binary
// (patches/expo-notifications*.patch), draws that range in the stage colour.
export type TimeSpan = { start: number; end: number };

export type TimeLeftParts = { line: string; span: TimeSpan };

// A placeholder no translation holds, put in the time's place to find where the time sits in the worded line.
const TIME_SLOT = '\u0000';

// The time-left line with its time's place. `coloured` is for a phone that colours that range itself (an Android
// binary with the patched builder): the line then carries no stage mark. Otherwise the line is timeLeftLine()'s.
export function timeLeftParts(
  trigger: Date,
  window: { start: Date; end: Date },
  tz: string,
  t: Translate,
  stage?: TimeStage,
  coloured = false,
): TimeLeftParts {
  const at = trigger.getTime();
  const start = window.start.getTime();
  const end = window.end.getTime();
  const worded = (key: string, params: Record<string, string>, slot: string): TimeLeftParts => {
    const text = t(key, params);
    const index = t(key, { ...params, [slot]: TIME_SLOT }).indexOf(TIME_SLOT);
    const mark = !coloured && stage && STAGE_MARK[stage] ? `${STAGE_MARK[stage]} ` : '';
    return { line: mark + text, span: { start: mark.length + index, end: mark.length + index + params[slot].length } };
  };
  if (at < start) return worded('notifications.timeLeft.startsIn', { left: formatRemaining(start - at, t) }, 'left');
  const endText = end - at >= 24 * 60 * 60 * 1000 ? fireTimeText(window.end, tz) : clockOf(window.end, tz);
  if (at > end) return worded('notifications.timeLeft.ended', { end: endText }, 'end');
  return worded('notifications.timeLeft.line', { end: endText, left: formatRemaining(end - at, t) }, 'end');
}

export function timeLeftLine(
  trigger: Date,
  window: { start: Date; end: Date },
  tz: string,
  t: Translate,
  stage?: TimeStage,
): string {
  return timeLeftParts(trigger, window, tz, t, stage).line;
}
