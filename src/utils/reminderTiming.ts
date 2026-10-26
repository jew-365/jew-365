import type { Reminder } from '@/types/mitzvah';
import { minutesToTime } from '@/utils/clock';
import { BLOCK_EXIT_DEFAULT_MIN, FOLLOW_UP_DEFAULT_MIN, FOLLOW_UP_MAX_MIN, HEADS_UP_MAX_MIN } from '@/utils/skipRules';

type Translate = (scope: string, options?: Record<string, unknown>) => string;

export type ReminderTiming = 'beforeStart' | 'fromStart' | 'beforeEnd' | 'clock' | 'followUp' | 'blockExit';

type MinutesTiming = Exclude<ReminderTiming, 'clock'>;

type Timed = Pick<Reminder, 'anchor' | 'offsetMin'>;

export const MAX_OFFSET_MIN = 720;
export const HEADS_UP_DEFAULT_MIN = 10;

export const TIMING_MINUTES: Readonly<Record<MinutesTiming, { min: number; max: number }>> = {
  beforeStart: { min: 0, max: HEADS_UP_MAX_MIN },
  fromStart: { min: 0, max: MAX_OFFSET_MIN },
  beforeEnd: { min: 0, max: MAX_OFFSET_MIN },
  followUp: { min: 1, max: FOLLOW_UP_MAX_MIN },
  blockExit: { min: 0, max: MAX_OFFSET_MIN },
};

const RANGE_ERROR_KEY = {
  beforeStart: 'reminder.errors.headsUpRange',
  fromStart: 'reminder.errors.offsetRange',
  beforeEnd: 'reminder.errors.offsetRange',
  followUp: 'reminder.errors.followUpRange',
  blockExit: 'reminder.errors.blockExitRange',
} as const;

const MINUTES_PATTERN = /^[0-9]+$/;

export function timingKinds({ custom, multiDay }: { custom: boolean; multiDay: boolean }): ReminderTiming[] {
  return [
    'beforeStart',
    'fromStart',
    'beforeEnd',
    'clock',
    ...(custom ? (['followUp'] as const) : []),
    ...(multiDay ? (['blockExit'] as const) : []),
  ];
}

export function timingOf({ anchor, offsetMin }: Timed): ReminderTiming {
  if (anchor === 'start') return offsetMin < 0 ? 'beforeStart' : 'fromStart';
  if (anchor === 'end') return 'beforeEnd';
  return anchor;
}

export function timingMinutes({ anchor, offsetMin }: Timed): number {
  return anchor === 'start' || anchor === 'end' ? Math.abs(offsetMin) : offsetMin;
}

export function withTiming(timing: ReminderTiming, minutes: number): Timed {
  switch (timing) {
    case 'beforeStart':
      return { anchor: 'start', offsetMin: minutes === 0 ? 0 : -minutes };
    case 'fromStart':
      return { anchor: 'start', offsetMin: minutes };
    case 'beforeEnd':
      return { anchor: 'end', offsetMin: minutes === 0 ? 0 : -minutes };
    default:
      return { anchor: timing, offsetMin: minutes };
  }
}

export function switchTiming(
  current: ReminderTiming,
  minutes: number,
  next: ReminderTiming,
  clockMinutes: number,
): number {
  if (next === current) return minutes;
  if (next === 'followUp') return FOLLOW_UP_DEFAULT_MIN;
  if (next === 'blockExit') return BLOCK_EXIT_DEFAULT_MIN;
  if (next === 'clock') return clockMinutes;
  const fromTimed = current === 'beforeStart' || current === 'fromStart' || current === 'beforeEnd';
  const kept = fromTimed ? Math.min(minutes, TIMING_MINUTES[next].max) : 0;
  return next === 'beforeStart' && kept === 0 ? HEADS_UP_DEFAULT_MIN : kept;
}

export function parseMinutes(raw: string): number | null {
  const typed = raw.trim();
  return MINUTES_PATTERN.test(typed) ? Number(typed) : null;
}

export function minutesError(
  timing: MinutesTiming,
  minutes: number,
): { key: (typeof RANGE_ERROR_KEY)[MinutesTiming]; max: number } | null {
  const { min, max } = TIMING_MINUTES[timing];
  return minutes >= min && minutes <= max ? null : { key: RANGE_ERROR_KEY[timing], max };
}

export function timingSummary(reminder: Timed, t: Translate): string {
  const timing = timingOf(reminder);
  if (timing === 'clock') return t('reminder.summary.clock', { time: minutesToTime(reminder.offsetMin) });
  const n = timingMinutes(reminder);
  if (n === 0) {
    if (timing === 'beforeStart' || timing === 'fromStart') return t('reminder.summary.atStart');
    if (timing === 'beforeEnd') return t('reminder.summary.atEnd');
    if (timing === 'blockExit') return t('reminder.summary.atBlockExit');
  }
  return t(`reminder.summary.${timing}`, { n });
}
