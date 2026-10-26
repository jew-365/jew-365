import {
  HEADS_UP_DEFAULT_MIN,
  MAX_OFFSET_MIN,
  TIMING_MINUTES,
  ReminderTiming,
  minutesError,
  parseMinutes,
  switchTiming,
  timingKinds,
  timingMinutes,
  timingOf,
  timingSummary,
  withTiming,
} from '../reminderTiming';
import { translate } from '@/i18n';
import { Reminder } from '@/types/mitzvah';
import { BLOCK_EXIT_DEFAULT_MIN, FOLLOW_UP_DEFAULT_MIN, FOLLOW_UP_MAX_MIN, HEADS_UP_MAX_MIN } from '../skipRules';

const he = (scope: string, options?: Record<string, unknown>) => translate(scope, options, 'he');
const en = (scope: string, options?: Record<string, unknown>) => translate(scope, options, 'en');

type Timed = Pick<Reminder, 'anchor' | 'offsetMin'>;

const CASES: { timing: ReminderTiming; minutes: number; reminder: Timed }[] = [
  { timing: 'beforeStart', minutes: 30, reminder: { anchor: 'start', offsetMin: -30 } },
  { timing: 'fromStart', minutes: 15, reminder: { anchor: 'start', offsetMin: 15 } },
  { timing: 'beforeEnd', minutes: 20, reminder: { anchor: 'end', offsetMin: -20 } },
  { timing: 'clock', minutes: 570, reminder: { anchor: 'clock', offsetMin: 570 } },
  { timing: 'followUp', minutes: 60, reminder: { anchor: 'followUp', offsetMin: 60 } },
  { timing: 'blockExit', minutes: 15, reminder: { anchor: 'blockExit', offsetMin: 15 } },
];

describe('the constants', () => {
  it('moves the 720 minute cap here and sets the heads-up default to ten minutes', () => {
    expect(MAX_OFFSET_MIN).toBe(720);
    expect(HEADS_UP_DEFAULT_MIN).toBe(10);
  });

  it('gives each timing its own range', () => {
    expect(TIMING_MINUTES).toEqual({
      beforeStart: { min: 0, max: HEADS_UP_MAX_MIN },
      fromStart: { min: 0, max: 720 },
      beforeEnd: { min: 0, max: 720 },
      followUp: { min: 1, max: FOLLOW_UP_MAX_MIN },
      blockExit: { min: 0, max: 720 },
    });
    expect(HEADS_UP_MAX_MIN).toBe(180);
    expect(FOLLOW_UP_MAX_MIN).toBe(720);
  });
});

describe('timingKinds', () => {
  it('lists the four basic kinds for a registry mitzvah', () => {
    expect(timingKinds({ custom: false, multiDay: false })).toEqual(['beforeStart', 'fromStart', 'beforeEnd', 'clock']);
  });

  it('adds the follow-up for a custom mitzvah', () => {
    expect(timingKinds({ custom: true, multiDay: false })).toEqual([
      'beforeStart',
      'fromStart',
      'beforeEnd',
      'clock',
      'followUp',
    ]);
  });

  it('adds the exit of Shabbat and Yom Tov for a multi-day mitzvah', () => {
    expect(timingKinds({ custom: false, multiDay: true })).toEqual([
      'beforeStart',
      'fromStart',
      'beforeEnd',
      'clock',
      'blockExit',
    ]);
  });

  it('adds both, follow-up first', () => {
    expect(timingKinds({ custom: true, multiDay: true })).toEqual([
      'beforeStart',
      'fromStart',
      'beforeEnd',
      'clock',
      'followUp',
      'blockExit',
    ]);
  });
});

describe('timingOf, timingMinutes and withTiming', () => {
  it.each(CASES)('round-trips $timing', ({ timing, minutes, reminder }) => {
    expect(timingOf(reminder)).toBe(timing);
    expect(timingMinutes(reminder)).toBe(minutes);
    expect(withTiming(timing, minutes)).toEqual(reminder);
  });

  it('reads a start reminder with a negative offset as before the start and any other as from it', () => {
    expect(timingOf({ anchor: 'start', offsetMin: -1 })).toBe('beforeStart');
    expect(timingOf({ anchor: 'start', offsetMin: 0 })).toBe('fromStart');
    expect(timingOf({ anchor: 'start', offsetMin: 1 })).toBe('fromStart');
  });

  it('reads an end reminder as before the end whatever the sign of its offset', () => {
    expect(timingOf({ anchor: 'end', offsetMin: -45 })).toBe('beforeEnd');
    expect(timingOf({ anchor: 'end', offsetMin: 45 })).toBe('beforeEnd');
    expect(timingOf({ anchor: 'end', offsetMin: 0 })).toBe('beforeEnd');
    expect(timingMinutes({ anchor: 'end', offsetMin: 45 })).toBe(45);
    expect(timingMinutes({ anchor: 'end', offsetMin: -45 })).toBe(45);
    expect(withTiming(timingOf({ anchor: 'end', offsetMin: 45 }), 45)).toEqual({ anchor: 'end', offsetMin: -45 });
  });

  it('takes the size of a start offset without its sign', () => {
    expect(timingMinutes({ anchor: 'start', offsetMin: -90 })).toBe(90);
    expect(timingMinutes({ anchor: 'start', offsetMin: 90 })).toBe(90);
  });

  it('keeps zero as zero, never negative zero', () => {
    expect(Object.is(withTiming('beforeStart', 0).offsetMin, 0)).toBe(true);
    expect(Object.is(withTiming('beforeEnd', 0).offsetMin, 0)).toBe(true);
    expect(withTiming('fromStart', 0)).toEqual({ anchor: 'start', offsetMin: 0 });
  });

  it('reads the clock time as minutes after midnight', () => {
    expect(timingMinutes({ anchor: 'clock', offsetMin: 0 })).toBe(0);
    expect(timingMinutes({ anchor: 'clock', offsetMin: 1439 })).toBe(1439);
    expect(withTiming('clock', 1230)).toEqual({ anchor: 'clock', offsetMin: 1230 });
  });
});

describe('switchTiming', () => {
  it('keeps the minutes when the timing does not change', () => {
    expect(switchTiming('beforeStart', 45, 'beforeStart', 480)).toBe(45);
    expect(switchTiming('followUp', 90, 'followUp', 480)).toBe(90);
    expect(switchTiming('clock', 600, 'clock', 480)).toBe(600);
  });

  it('starts a follow-up on its default, from any timing', () => {
    const kinds: ReminderTiming[] = ['beforeStart', 'fromStart', 'beforeEnd', 'clock', 'blockExit'];
    kinds.forEach((from) => expect(switchTiming(from, 7, 'followUp', 480)).toBe(FOLLOW_UP_DEFAULT_MIN));
    expect(FOLLOW_UP_DEFAULT_MIN).toBe(60);
  });

  it('starts the exit of Shabbat and Yom Tov on its default, from any timing', () => {
    const kinds: ReminderTiming[] = ['beforeStart', 'fromStart', 'beforeEnd', 'clock', 'followUp'];
    kinds.forEach((from) => expect(switchTiming(from, 7, 'blockExit', 480)).toBe(BLOCK_EXIT_DEFAULT_MIN));
    expect(BLOCK_EXIT_DEFAULT_MIN).toBe(15);
  });

  it('starts a set time on the clock minutes it is given, from any timing', () => {
    const kinds: ReminderTiming[] = ['beforeStart', 'fromStart', 'beforeEnd', 'followUp', 'blockExit'];
    kinds.forEach((from) => expect(switchTiming(from, 7, 'clock', 485)).toBe(485));
    expect(switchTiming('fromStart', 7, 'clock', 0)).toBe(0);
  });

  it.each([
    ['beforeStart', 'fromStart', 45, 45],
    ['beforeStart', 'beforeEnd', 45, 45],
    ['fromStart', 'beforeEnd', 30, 30],
    ['beforeEnd', 'fromStart', 30, 30],
    ['fromStart', 'beforeStart', 45, 45],
    ['beforeEnd', 'beforeStart', 45, 45],
    ['fromStart', 'beforeEnd', 0, 0],
    ['beforeStart', 'fromStart', 0, 0],
  ] as const)('keeps the minutes going from %s to %s (%d)', (from, to, minutes, expected) => {
    expect(switchTiming(from, minutes, to, 480)).toBe(expected);
  });

  it('clamps the kept minutes to the heads-up range going to before the start', () => {
    expect(switchTiming('fromStart', 500, 'beforeStart', 480)).toBe(180);
    expect(switchTiming('beforeEnd', 181, 'beforeStart', 480)).toBe(180);
    expect(switchTiming('fromStart', 180, 'beforeStart', 480)).toBe(180);
  });

  it('keeps up to 720 minutes between the two long timings', () => {
    expect(switchTiming('fromStart', 720, 'beforeEnd', 480)).toBe(720);
    expect(switchTiming('beforeEnd', 700, 'fromStart', 480)).toBe(700);
  });

  it('starts before the start on ten minutes when the minutes are zero', () => {
    expect(switchTiming('fromStart', 0, 'beforeStart', 480)).toBe(HEADS_UP_DEFAULT_MIN);
    expect(switchTiming('beforeEnd', 0, 'beforeStart', 480)).toBe(10);
  });

  it('starts before the start on ten minutes, and the others on zero, coming from a set time, a follow-up or the exit', () => {
    const from: ReminderTiming[] = ['clock', 'followUp', 'blockExit'];
    from.forEach((kind) => {
      expect(switchTiming(kind, 600, 'beforeStart', 480)).toBe(10);
      expect(switchTiming(kind, 600, 'fromStart', 480)).toBe(0);
      expect(switchTiming(kind, 600, 'beforeEnd', 480)).toBe(0);
    });
  });
});

describe('parseMinutes', () => {
  it.each([
    ['0', 0],
    ['15', 15],
    [' 7 ', 7],
    ['007', 7],
    ['720', 720],
  ])('reads %j as %d', (typed, minutes) => {
    expect(parseMinutes(typed)).toBe(minutes);
  });

  it.each(['', '   ', '-5', '+5', '1.5', '-60-600', '1e2', '0x10', '6O', '60 0'])('reads %j as no number', (typed) => {
    expect(parseMinutes(typed)).toBeNull();
  });
});

describe('minutesError', () => {
  it.each([
    ['beforeStart', 0, null],
    ['beforeStart', 180, null],
    ['beforeStart', 181, { key: 'reminder.errors.headsUpRange', max: 180 }],
    ['fromStart', 0, null],
    ['fromStart', 720, null],
    ['fromStart', 721, { key: 'reminder.errors.offsetRange', max: 720 }],
    ['beforeEnd', 0, null],
    ['beforeEnd', 720, null],
    ['beforeEnd', 721, { key: 'reminder.errors.offsetRange', max: 720 }],
    ['followUp', 0, { key: 'reminder.errors.followUpRange', max: 720 }],
    ['followUp', 1, null],
    ['followUp', 720, null],
    ['followUp', 721, { key: 'reminder.errors.followUpRange', max: 720 }],
    ['blockExit', 0, null],
    ['blockExit', 720, null],
    ['blockExit', 721, { key: 'reminder.errors.blockExitRange', max: 720 }],
  ] as const)('%s at %d', (timing, minutes, expected) => {
    expect(minutesError(timing, minutes)).toEqual(expected);
  });

  it('words every error key in both languages with the max filled', () => {
    const keys = [
      'reminder.errors.headsUpRange',
      'reminder.errors.offsetRange',
      'reminder.errors.followUpRange',
      'reminder.errors.blockExitRange',
    ];
    keys.forEach((key) => {
      expect(he(key, { max: 720 })).toContain('720');
      expect(en(key, { max: 720 })).toContain('720');
      expect(he(key, { max: 720 })).not.toContain('%{');
      expect(en(key, { max: 720 })).not.toContain('%{');
    });
  });
});

describe('timingSummary', () => {
  it.each([
    [{ anchor: 'start', offsetMin: -30 }, '30 דק׳ לפני תחילת הזמן', '30 min before the start'],
    [{ anchor: 'start', offsetMin: 15 }, '15 דק׳ אחרי תחילת הזמן', '15 min after the start'],
    [{ anchor: 'start', offsetMin: 0 }, 'בתחילת הזמן', 'At the start'],
    [{ anchor: 'end', offsetMin: -20 }, '20 דק׳ לפני סוף הזמן', '20 min before the end'],
    [{ anchor: 'end', offsetMin: 0 }, 'בסוף הזמן', 'At the end'],
    [{ anchor: 'clock', offsetMin: 570 }, 'בשעה 09:30', 'At 09:30'],
    [{ anchor: 'clock', offsetMin: 0 }, 'בשעה 00:00', 'At 00:00'],
    [{ anchor: 'followUp', offsetMin: 60 }, '60 דק׳ אחרי סוף הזמן, אם לא סימנת', '60 min after the end, if not marked'],
    [{ anchor: 'blockExit', offsetMin: 15 }, '15 דק׳ אחרי צאת שבת או חג', '15 min after Shabbat or Yom Tov ends'],
    [{ anchor: 'blockExit', offsetMin: 0 }, 'בצאת שבת או חג', 'When Shabbat or Yom Tov ends'],
  ] as const)('reads %j in both languages', (reminder, hebrew, english) => {
    expect(timingSummary(reminder, he)).toBe(hebrew);
    expect(timingSummary(reminder, en)).toBe(english);
  });
});
