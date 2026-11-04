import { clockOf, formatRemaining, fireTimeText } from './clock';

type Translate = (scope: string, options?: Record<string, unknown>) => string;

// How close a mitzvah's time is to its end when a reminder goes out (the owner's pick of 2026-11-04, the study
// design/lab/studies/2026-11-04-time-and-nag): red at 15 minutes or under a fifth of the window, orange at an
// hour or half of it, green before that.
export type TimeStage = 'green' | 'orange' | 'red';

export const TIME_STAGE_DOT: Record<TimeStage, string> = { green: '🟢', orange: '🟠', red: '🔴' };

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

// The line a mitzvah reminder carries under its title (the notification's subtitle: the iPhone's bold second
// line, Android's subText beside the app name). It is worded at the instant the reminder goes out and never
// changes, so it leads with the end time, which stays true, and the time left beside it. Before the window it
// says when the time starts; after it (a follow-up), when it ended. The end time carries its date when it is a
// day or more away (a multi-day window).
export function timeLeftLine(trigger: Date, window: { start: Date; end: Date }, tz: string, t: Translate): string {
  const at = trigger.getTime();
  const start = window.start.getTime();
  const end = window.end.getTime();
  if (at < start) return t('notifications.timeLeft.startsIn', { left: formatRemaining(start - at, t) });
  const endText = end - at >= 24 * 60 * 60 * 1000 ? fireTimeText(window.end, tz) : clockOf(window.end, tz);
  if (at > end) return t('notifications.timeLeft.ended', { end: endText });
  return t('notifications.timeLeft.line', {
    dot: TIME_STAGE_DOT[timeStage(at, start, end)],
    end: endText,
    left: formatRemaining(end - at, t),
  });
}
