import { clockOf, formatRemaining, fireTimeText } from './clock';

type Translate = (scope: string, options?: Record<string, unknown>) => string;

// A notification's stage: green, orange or red (the owner's picks of 2026-11-04 in the study
// design/lab/studies/2026-11-04-time-and-nag, by the notification's place in its window since the same evening).
export type TimeStage = 'green' | 'orange' | 'red';

// Android's accent colour by stage, direction ז's: it tints the notification's small icon where the phone draws it
// (stock Android; Samsung's One UI shows the app icon untinted), and on Android 11 and older the app name.
export const TIME_STAGE_COLOR: Record<TimeStage, string> = { green: '#13804A', orange: '#B85F00', red: '#C5221F' };

// A notification's stage by its place among all the notifications its mitzvah's window sends (the owner's rule of
// 2026-11-04, after Samsung's One UI drew no accent colour): the last is red, the one before it orange, the rest
// green; a single notification is red. An index not found (-1) reads as green.
export function sendStage(index: number, count: number): TimeStage {
  if (index < 0) return 'green';
  if (index === count - 1) return 'red';
  return index === count - 2 ? 'orange' : 'green';
}

// The mark that opens the line of the last two notifications, on every phone (an emoji draws its own colour, which
// no phone strips): a red exclamation mark on the last, a warning sign on the one before it.
export const STAGE_MARK: Record<TimeStage, string> = { green: '', orange: '⚠️', red: '❗' };

export function timeLeftLine(
  trigger: Date,
  window: { start: Date; end: Date },
  tz: string,
  t: Translate,
  stage?: TimeStage,
): string {
  const at = trigger.getTime();
  const start = window.start.getTime();
  const end = window.end.getTime();
  const mark = (line: string) => (stage && STAGE_MARK[stage] ? `${STAGE_MARK[stage]} ${line}` : line);
  if (at < start) return mark(t('notifications.timeLeft.startsIn', { left: formatRemaining(start - at, t) }));
  const endText = end - at >= 24 * 60 * 60 * 1000 ? fireTimeText(window.end, tz) : clockOf(window.end, tz);
  if (at > end) return mark(t('notifications.timeLeft.ended', { end: endText }));
  return mark(t('notifications.timeLeft.line', { end: endText, left: formatRemaining(end - at, t) }));
}
