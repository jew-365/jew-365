import { clockOf, formatRemaining, fireTimeText } from './clock';

type Translate = (scope: string, options?: Record<string, unknown>) => string;

// How close a mitzvah's time is to its end when a reminder goes out (the owner's pick of 2026-11-04, direction ז of the
// study design/lab/studies/2026-11-04-time-and-nag, kept exactly as it was after round 2): red at 15 minutes or under a
// fifth of the window, orange at an hour or half of it, green before that.
export type TimeStage = 'green' | 'orange' | 'red';

// Android's accent colour by stage, direction ז's: it tints the notification's small icon (and on Android 11 and
// older its app name). The text carries no mark; an iPhone banner takes no colour.
export const TIME_STAGE_COLOR: Record<TimeStage, string> = { green: '#13804A', orange: '#B85F00', red: '#C5221F' };

const RED_MIN = 15;
const RED_SHARE = 0.2;
const ORANGE_MIN = 60;
const ORANGE_SHARE = 0.5;

export function timeStage(at: number, start: number, end: number): TimeStage {
  const leftMin = (end - at) / 60000;
  const share = end > start ? (end - at) / (end - start) : 0;
  if (leftMin <= RED_MIN || share < RED_SHARE) return 'red';
  if (leftMin <= ORANGE_MIN || share <= ORANGE_SHARE) return 'orange';
  return 'green';
}

// The accent colour of a reminder at `trigger`: the stage's, red after the window, none before it.
export function timeLeftColor(trigger: Date, window: { start: Date; end: Date }): string | undefined {
  const at = trigger.getTime();
  const start = window.start.getTime();
  const end = window.end.getTime();
  if (at < start) return undefined;
  return TIME_STAGE_COLOR[at > end ? 'red' : timeStage(at, start, end)];
}

// The urgency mark of the iPhone, which takes no colour (the owner's pick of 2026-11-04, round 3 direction א of the
// study): it opens the line in the red stage and after the window. Android keeps ז's line and shows the stage in colour.
export const URGENT_MARK = '⚠️';

// The line a mitzvah reminder carries under its title (the notification's subtitle: the iPhone's bold second
// line, Android's subText beside the app name). It is worded at the instant the reminder goes out and never
// changes, so it leads with the end time, which stays true, and the time left beside it. Before the window it
// says when the time starts; after it (a follow-up), when it ended. The end time carries its date when it is a
// day or more away (a multi-day window). With `urgentMark` (the iPhone) a red-stage line opens with URGENT_MARK.
export function timeLeftLine(
  trigger: Date,
  window: { start: Date; end: Date },
  tz: string,
  t: Translate,
  urgentMark = false,
): string {
  const at = trigger.getTime();
  const start = window.start.getTime();
  const end = window.end.getTime();
  if (at < start) return t('notifications.timeLeft.startsIn', { left: formatRemaining(start - at, t) });
  const endText = end - at >= 24 * 60 * 60 * 1000 ? fireTimeText(window.end, tz) : clockOf(window.end, tz);
  const mark = (line: string, red: boolean) => (urgentMark && red ? `${URGENT_MARK} ${line}` : line);
  if (at > end) return mark(t('notifications.timeLeft.ended', { end: endText }), true);
  const line = t('notifications.timeLeft.line', { end: endText, left: formatRemaining(end - at, t) });
  return mark(line, timeStage(at, start, end) === 'red');
}
