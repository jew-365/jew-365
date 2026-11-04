import { clockOf, formatRemaining, fireTimeText } from './clock';

type Translate = (scope: string, options?: Record<string, unknown>) => string;

// A notification's stage: green, orange or red (the owner's picks of 2026-11-04 in the study
// design/lab/studies/2026-11-04-time-and-nag, by the notification's place in its window since the same evening).
export type TimeStage = 'green' | 'orange' | 'red';

// Android's accent colour by stage, direction ז's: it tints the notification's small icon where the phone draws it
// (stock Android; Samsung's One UI shows the app icon untinted), and on Android 11 and older the app name.
export const TIME_STAGE_COLOR: Record<TimeStage, string> = { green: '#13804A', orange: '#B85F00', red: '#C5221F' };

// A notification's stage in its window (the smart nag, spec 2.5): the window's last notification and the last-chance
// point alone are red, every other nag orange, every other reminder green.
export type SendKind = 'reminder' | 'nag' | 'lastChanceAlone';

export function sendStage(kind: SendKind, last: boolean): TimeStage {
  if (last || kind === 'lastChanceAlone') return 'red';
  return kind === 'nag' ? 'orange' : 'green';
}

// The mark that opens the line of a red or orange notification, on every phone (an emoji draws its own colour, which
// no phone strips): a red exclamation mark, a warning sign.
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
