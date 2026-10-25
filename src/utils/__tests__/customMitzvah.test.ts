import { CustomMitzvah, ScheduleEntry, Weekday } from '@/types/mitzvah';
import {
  ALL_DAY_MIN,
  DraftBlock,
  NIGHT_END_MIN,
  SCHEDULE_ORIGIN,
  STREAK_DEFAULT_DAYS,
  STREAK_MAX_DAYS,
  WEEKDAYS,
  addDaysToKey,
  appliesOn,
  categoryForWindow,
  cleanContentBlock,
  cleanContentBlocks,
  currentSchedule,
  customEndedOn,
  customStartsOn,
  endedCustomIds,
  isActiveOn,
  isCustomEnded,
  reminderClock,
  scheduleDateLabel,
  scheduleOnSave,
  siddurTextName,
  streakEndedOnSave,
  streakStartOnSave,
  validStreakDays,
  windowMinutes,
} from '../customMitzvah';

const w = (from: string, days: Weekday[]): ScheduleEntry => ({ from, schedule: { mode: 'weekdays', days } });

describe('windowMinutes', () => {
  it.each([
    ['08:00', '12:00', 240],
    ['08:00', '08:01', 1],
    ['00:00', '23:59', 1439],
    ['22:00', '01:00', 180],
    ['23:59', '00:00', 1],
    ['08:30', '08:29', 1439],
    ['20:00', '06:30', 630],
  ])('%s to %s lasts %i minutes', (start, end, expected) => {
    expect(windowMinutes(start, end)).toBe(expected);
  });

  it.each(['00:00', '08:00', '12:34', '23:59'])('equal times at %s are a full 24 hours', (time) => {
    expect(windowMinutes(time, time)).toBe(1440);
  });
});

describe('categoryForWindow', () => {
  it.each([
    ['08:00', '12:00', 'daily-morning'],
    ['10:00', '13:00', 'daily-morning'],
    ['11:00', '14:00', 'daily-afternoon'],
    ['15:00', '18:00', 'daily-afternoon'],
    ['17:00', '19:00', 'daily-evening'],
    ['20:00', '23:00', 'daily-evening'],
    ['06:00', '14:00', 'daily-allday'],
    ['07:00', '14:59', 'daily-morning'],
  ])('%s to %s is %s', (start, end, expected) => {
    expect(categoryForWindow(start, end)).toBe(expected);
  });

  it('turns all-day exactly at the threshold', () => {
    expect(ALL_DAY_MIN).toBe(480);
    expect(categoryForWindow('01:00', '08:59')).toBe('daily-morning');
    expect(categoryForWindow('01:00', '09:00')).toBe('daily-allday');
    expect(categoryForWindow('18:00', '01:59')).toBe('daily-evening');
    expect(categoryForWindow('18:00', '02:00')).toBe('daily-allday');
  });

  it.each([
    ['23:00', '01:00', 'daily-evening'],
    ['22:00', '02:00', 'daily-evening'],
    ['20:00', '03:00', 'daily-evening'],
    ['00:00', '03:00', 'daily-evening'],
    ['01:00', '05:00', 'daily-evening'],
    ['02:00', '07:00', 'daily-morning'],
    ['23:30', '04:00', 'daily-evening'],
    ['22:00', '08:00', 'daily-allday'],
    ['21:00', '06:00', 'daily-allday'],
  ])('the overnight window %s to %s is %s', (start, end, expected) => {
    expect(categoryForWindow(start, end)).toBe(expected);
  });

  it('reads a midpoint before 04:00 as a night window and 04:00 itself as the morning', () => {
    expect(NIGHT_END_MIN).toBe(240);
    expect(categoryForWindow('03:00', '04:58')).toBe('daily-evening');
    expect(categoryForWindow('03:00', '05:00')).toBe('daily-morning');
    expect(categoryForWindow('03:00', '04:59')).toBe('daily-evening');
  });

  it.each(['00:00', '08:00', '17:30', '23:59'])('equal times at %s are all-day', (time) => {
    expect(categoryForWindow(time, time)).toBe('daily-allday');
  });
});

describe('isActiveOn', () => {
  it('is active every day when no days are set', () => {
    expect(WEEKDAYS.map((day) => isActiveOn(undefined, day))).toEqual([true, true, true, true, true, true, true]);
  });

  it('is active only on the listed days', () => {
    expect(isActiveOn([0, 1], 1)).toBe(true);
    expect(isActiveOn([0, 1], 6)).toBe(false);
  });

  it('is never active with an empty list', () => {
    expect(WEEKDAYS.some((day) => isActiveOn([], day))).toBe(false);
  });
});

describe('addDaysToKey', () => {
  it.each([
    ['2026-10-31', 1, '2026-11-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2028-02-28', 1, '2028-02-29'],
    ['2026-03-27', 1, '2026-03-28'],
    ['2026-10-13', -1, '2026-10-12'],
    ['2026-10-13', 0, '2026-10-13'],
  ])('%s plus %i days is %s', (key, days, expected) => {
    expect(addDaysToKey(key, days)).toBe(expected);
  });
});

describe('appliesOn', () => {
  it('reads a mitzvah without schedules through its legacy activeDays', () => {
    const weekdaysOnly = { activeDays: [0, 1, 2, 3, 4] as Weekday[] };
    expect(appliesOn(weekdaysOnly, '2026-10-15')).toBe(true);
    expect(appliesOn(weekdaysOnly, '2026-10-16')).toBe(false);
    expect(appliesOn(weekdaysOnly, '2026-10-17')).toBe(false);
    expect(appliesOn(weekdaysOnly, '2026-10-18')).toBe(true);
    const everyDay = ['2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17'];
    expect([...everyDay, '1990-01-01'].map((key) => appliesOn({}, key))).toEqual(Array(8).fill(true));
    expect(appliesOn({ activeDays: [] }, '2026-10-15')).toBe(false);
  });

  it('applies a weekdays schedule on its days from its first day', () => {
    const custom = { schedules: [w('2026-10-11', [0, 6])] };
    expect(appliesOn(custom, '2026-10-10')).toBe(false);
    expect(appliesOn(custom, '2026-10-11')).toBe(true);
    expect(appliesOn(custom, '2026-10-12')).toBe(false);
    expect(appliesOn(custom, '2026-10-17')).toBe(true);
  });

  it('reads each weekday from the key alone', () => {
    WEEKDAYS.forEach((day) => {
      const custom = { schedules: [w('2026-10-11', [day])] };
      expect(appliesOn(custom, addDaysToKey('2026-10-11', day))).toBe(true);
      expect(appliesOn(custom, addDaysToKey('2026-10-11', day + 1))).toBe(false);
    });
  });

  it('applies a range from its first through its last day', () => {
    const custom: Pick<CustomMitzvah, 'schedules'> = {
      schedules: [{ from: '2026-10-13', schedule: { mode: 'range', start: '2026-10-20', end: '2026-10-22' } }],
    };
    expect(
      ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'].map((key) => appliesOn(custom, key)),
    ).toEqual([false, true, true, true, false]);
    expect(appliesOn(custom, '2026-10-12')).toBe(false);
  });

  it('runs a range across a year end', () => {
    const custom: Pick<CustomMitzvah, 'schedules'> = {
      schedules: [{ from: '2026-12-01', schedule: { mode: 'range', start: '2026-12-30', end: '2027-01-02' } }],
    };
    expect(
      ['2026-12-29', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03'].map((key) => appliesOn(custom, key)),
    ).toEqual([false, true, true, true, false]);
  });

  it('applies a streak for its days, then ends', () => {
    const custom: Pick<CustomMitzvah, 'schedules'> = {
      schedules: [{ from: '2026-10-13', schedule: { mode: 'streak', start: '2026-10-13', days: 3 } }],
    };
    expect(
      ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'].map((key) => appliesOn(custom, key)),
    ).toEqual([false, true, true, true, false]);
  });

  it('counts a streak across a month end and a leap day', () => {
    const monthEnd: Pick<CustomMitzvah, 'schedules'> = {
      schedules: [{ from: '2027-02-27', schedule: { mode: 'streak', start: '2027-02-27', days: 3 } }],
    };
    expect(appliesOn(monthEnd, '2027-03-01')).toBe(true);
    expect(appliesOn(monthEnd, '2027-03-02')).toBe(false);
    const leapDay: Pick<CustomMitzvah, 'schedules'> = {
      schedules: [{ from: '2028-02-28', schedule: { mode: 'streak', start: '2028-02-28', days: 2 } }],
    };
    expect(appliesOn(leapDay, '2028-02-29')).toBe(true);
    expect(appliesOn(leapDay, '2028-03-01')).toBe(false);
  });

  it('keeps the old answer before a schedule changed mid-week', () => {
    const custom = { schedules: [w(SCHEDULE_ORIGIN, [0, 1, 2, 3, 4, 5, 6]), w('2026-10-14', [0])] };
    expect(
      ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-18'].map((key) => appliesOn(custom, key)),
    ).toEqual([true, true, false, false, true]);
  });

  it('follows each entry on its own days', () => {
    const custom: Pick<CustomMitzvah, 'schedules'> = {
      schedules: [
        w(SCHEDULE_ORIGIN, [1]),
        { from: '2026-10-14', schedule: { mode: 'streak', start: '2026-10-14', days: 2 } },
        w('2026-10-20', [3]),
      ],
    };
    expect(
      ['2026-10-12', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-19', '2026-10-21'].map((key) =>
        appliesOn(custom, key),
      ),
    ).toEqual([true, true, true, false, false, true]);
  });

  it('takes the later of two entries saved the same day', () => {
    const custom = { schedules: [w('2026-10-14', [3]), w('2026-10-14', [4])] };
    expect(appliesOn(custom, '2026-10-14')).toBe(false);
    expect(appliesOn(custom, '2026-10-15')).toBe(true);
  });
});

describe('customEndedOn, isCustomEnded, customStartsOn and currentSchedule', () => {
  const rangeEnding = (end: string): Pick<CustomMitzvah, 'schedules'> => ({
    schedules: [{ from: '2026-10-01', schedule: { mode: 'range', start: '2026-10-01', end } }],
  });
  const streakOf = (days: number): Pick<CustomMitzvah, 'schedules'> => ({
    schedules: [{ from: '2026-10-13', schedule: { mode: 'streak', start: '2026-10-13', days } }],
  });

  it('names the last day of a current range or streak only once it is before today', () => {
    expect(customEndedOn({}, '2026-10-28')).toBeNull();
    expect(customEndedOn({ schedules: [w('2026-10-01', [1])] }, '2027-01-01')).toBeNull();
    expect(customEndedOn(rangeEnding('2026-10-15'), '2026-10-15')).toBeNull();
    expect(customEndedOn(rangeEnding('2026-10-15'), '2026-10-16')).toBe('2026-10-15');
    expect(customEndedOn(streakOf(3), '2026-10-15')).toBeNull();
    expect(customEndedOn(streakOf(3), '2026-10-16')).toBe('2026-10-15');
    expect(customEndedOn(streakOf(1), '2026-10-14')).toBe('2026-10-13');
    expect(
      customEndedOn(
        {
          schedules: [
            { from: '2026-10-01', schedule: { mode: 'range', start: '2026-10-01', end: '2026-10-05' } },
            w('2026-10-10', [1]),
          ],
        },
        '2026-10-28',
      ),
    ).toBeNull();
    expect(
      customEndedOn(
        {
          schedules: [{ from: '2026-10-28', schedule: { mode: 'range', start: '2026-11-20', end: '2026-11-25' } }],
        },
        '2026-10-28',
      ),
    ).toBeNull();
  });

  it('ends a range the day after its last day', () => {
    expect(isCustomEnded(rangeEnding('2026-10-15'), '2026-10-15')).toBe(false);
    expect(isCustomEnded(rangeEnding('2026-10-15'), '2026-10-16')).toBe(true);
    expect(isCustomEnded({ schedules: [w('2026-10-01', [1])] }, '2027-01-01')).toBe(false);
  });

  it('names the start of a current schedule that begins after today', () => {
    const later: Pick<CustomMitzvah, 'schedules'> = {
      schedules: [{ from: '2026-10-28', schedule: { mode: 'range', start: '2026-11-20', end: '2026-11-25' } }],
    };
    expect(customStartsOn(later, '2026-10-28')).toBe('2026-11-20');
    expect(customStartsOn(later, '2026-11-20')).toBeNull();
    expect(
      customStartsOn(
        { schedules: [{ from: '2026-10-28', schedule: { mode: 'streak', start: '2026-10-28', days: 5 } }] },
        '2026-10-28',
      ),
    ).toBeNull();
    expect(customStartsOn({}, '2026-10-28')).toBeNull();
  });

  it('takes the entry with the latest from as the current schedule', () => {
    expect(currentSchedule({ activeDays: [2] })).toEqual({ mode: 'weekdays', days: [2] });
    expect(currentSchedule({})).toEqual({ mode: 'weekdays', days: [0, 1, 2, 3, 4, 5, 6] });
    expect(currentSchedule({ schedules: [w('2026-10-20', [1]), w('2026-10-01', [2])] })).toEqual({
      mode: 'weekdays',
      days: [1],
    });
  });
});

describe('endedCustomIds', () => {
  const base = { startHHMM: '08:00', endHHMM: '09:00', reminders: [], skipOn: [], createdAt: 1 };
  const ended: ScheduleEntry[] = [
    { from: '2026-10-01', schedule: { mode: 'range', start: '2026-10-10', end: '2026-10-20' } },
  ];
  const running: ScheduleEntry[] = [
    { from: '2026-10-01', schedule: { mode: 'range', start: '2026-10-10', end: '2026-11-30' } },
  ];

  it('lists only the enabled customs whose current range or streak ended before today', () => {
    const customs: CustomMitzvah[] = [
      { ...base, id: 'A', name: 'A', schedules: ended },
      { ...base, id: 'B', name: 'B', schedules: ended },
      { ...base, id: 'C', name: 'C', schedules: running },
      { ...base, id: 'D', name: 'D', activeDays: [1] },
    ];
    const active = { A: { enabled: true }, B: { enabled: false }, C: { enabled: true }, D: { enabled: true } };
    expect(endedCustomIds(customs, active, '2026-10-28')).toEqual(['A']);
  });
});

describe('scheduleOnSave', () => {
  const TODAY = '2026-10-28';

  it('gives a new mitzvah one weekdays entry from today, days sorted', () => {
    expect(scheduleOnSave(undefined, { mode: 'weekdays', days: [3, 1] }, TODAY)).toEqual([
      { from: TODAY, schedule: { mode: 'weekdays', days: [1, 3] } },
    ]);
  });

  it('keeps the entries of an unchanged legacy mitzvah', () => {
    expect(scheduleOnSave({ activeDays: [0, 1, 2, 3, 4] }, { mode: 'weekdays', days: [4, 3, 2, 1, 0] }, TODAY)).toEqual(
      [{ from: SCHEDULE_ORIGIN, schedule: { mode: 'weekdays', days: [0, 1, 2, 3, 4] } }],
    );
  });

  it('appends an entry from today to a legacy mitzvah whose days changed', () => {
    expect(scheduleOnSave({}, { mode: 'weekdays', days: [0, 1, 2, 3, 4, 5] }, TODAY)).toEqual([
      w(SCHEDULE_ORIGIN, [0, 1, 2, 3, 4, 5, 6]),
      w(TODAY, [0, 1, 2, 3, 4, 5]),
    ]);
  });

  it('replaces an entry saved today instead of stacking a second one', () => {
    expect(
      scheduleOnSave(
        { schedules: [w('2026-10-20', [1]), w('2026-10-28', [2])] },
        { mode: 'weekdays', days: [3] },
        TODAY,
      ),
    ).toEqual([w('2026-10-20', [1]), w('2026-10-28', [3])]);
  });

  it('starts a streak on the day it is saved', () => {
    expect(scheduleOnSave(undefined, { mode: 'streak', start: '1999-01-01', days: 10 }, TODAY)).toEqual([
      { from: TODAY, schedule: { mode: 'streak', start: TODAY, days: 10 } },
    ]);
  });

  it('keeps a streak saved with the same length and restarts it from today when the length changes', () => {
    const stored: ScheduleEntry[] = [
      { from: '2026-10-20', schedule: { mode: 'streak', start: '2026-10-20', days: 10 } },
    ];
    expect(scheduleOnSave({ schedules: stored }, { mode: 'streak', start: TODAY, days: 10 }, TODAY)).toEqual(stored);
    expect(scheduleOnSave({ schedules: stored }, { mode: 'streak', start: TODAY, days: 12 }, TODAY)).toEqual([
      ...stored,
      { from: TODAY, schedule: { mode: 'streak', start: TODAY, days: 12 } },
    ]);
  });

  it('keeps an ended streak saved at its length, and restarts it from today when the length or the mode changes', () => {
    const ended: ScheduleEntry[] = [
      { from: '2026-10-01', schedule: { mode: 'streak', start: '2026-10-01', days: 10 } },
    ];
    expect(scheduleOnSave({ schedules: ended }, { mode: 'streak', start: TODAY, days: 10 }, TODAY)).toEqual(ended);
    expect(scheduleOnSave({ schedules: ended }, { mode: 'streak', start: TODAY, days: 12 }, TODAY)).toEqual([
      ...ended,
      { from: TODAY, schedule: { mode: 'streak', start: TODAY, days: 12 } },
    ]);
    expect(scheduleOnSave({ schedules: ended }, { mode: 'weekdays', days: [1] }, TODAY)).toEqual([
      ...ended,
      w(TODAY, [1]),
    ]);
  });

  it('keeps a streak on its last day, which has not ended yet', () => {
    const lastDay: ScheduleEntry[] = [
      { from: '2026-10-19', schedule: { mode: 'streak', start: '2026-10-19', days: 10 } },
    ];
    expect(scheduleOnSave({ schedules: lastDay }, { mode: 'streak', start: TODAY, days: 10 }, TODAY)).toEqual(lastDay);
  });

  it('keeps an unchanged range and appends a changed schedule', () => {
    const stored: ScheduleEntry[] = [
      { from: '2026-10-20', schedule: { mode: 'range', start: '2026-10-20', end: '2026-11-01' } },
    ];
    expect(
      scheduleOnSave({ schedules: stored }, { mode: 'range', start: '2026-10-20', end: '2026-11-01' }, TODAY),
    ).toEqual(stored);
    expect(scheduleOnSave({ schedules: stored }, { mode: 'weekdays', days: [1] }, TODAY)).toEqual([
      ...stored,
      w(TODAY, [1]),
    ]);
  });

  it('drops an entry dated after today when the schedule changes', () => {
    expect(
      scheduleOnSave(
        { schedules: [w('2026-10-20', [1]), w('2026-10-29', [2])] },
        { mode: 'weekdays', days: [3] },
        TODAY,
      ),
    ).toEqual([w('2026-10-20', [1]), w(TODAY, [3])]);
  });
});

describe('validStreakDays', () => {
  it.each([
    [1, true],
    [40, true],
    [365, true],
    [0, false],
    [366, false],
    [1.5, false],
    [Number.NaN, false],
  ])('%s days is %s', (days, expected) => {
    expect(validStreakDays(days)).toBe(expected);
  });

  it('pins the longest streak and the default one a new mitzvah starts on', () => {
    expect(STREAK_MAX_DAYS).toBe(365);
    expect(STREAK_DEFAULT_DAYS).toBe(40);
  });
});

describe('streakStartOnSave', () => {
  const TODAY = '2026-10-28';
  const stored: ScheduleEntry[] = [{ from: '2026-10-20', schedule: { mode: 'streak', start: '2026-10-20', days: 10 } }];

  it('starts a new streak today', () => {
    expect(streakStartOnSave(undefined, 10, TODAY)).toBe(TODAY);
  });

  it('keeps the stored start while the length matches the current streak', () => {
    expect(streakStartOnSave({ schedules: stored }, 10, TODAY)).toBe('2026-10-20');
  });

  it('restarts from today when the length changes', () => {
    expect(streakStartOnSave({ schedules: stored }, 12, TODAY)).toBe(TODAY);
  });

  it('keeps the start of an ended streak at its length and restarts from today at another', () => {
    const ended: ScheduleEntry[] = [
      { from: '2026-10-01', schedule: { mode: 'streak', start: '2026-10-01', days: 10 } },
    ];
    expect(streakStartOnSave({ schedules: ended }, 10, TODAY)).toBe('2026-10-01');
    expect(streakStartOnSave({ schedules: ended }, 12, TODAY)).toBe(TODAY);
  });

  it('starts today when the current schedule is not a streak', () => {
    expect(streakStartOnSave({ activeDays: [1] }, 10, TODAY)).toBe(TODAY);
  });
});

describe('streakEndedOnSave', () => {
  const TODAY = '2026-10-28';

  it('is null for a new streak', () => {
    expect(streakEndedOnSave(undefined, 10, TODAY)).toBeNull();
  });

  it('is null while the stored streak runs, its last day included', () => {
    const running: ScheduleEntry[] = [
      { from: '2026-10-20', schedule: { mode: 'streak', start: '2026-10-20', days: 10 } },
    ];
    const lastDay: ScheduleEntry[] = [
      { from: '2026-10-19', schedule: { mode: 'streak', start: '2026-10-19', days: 10 } },
    ];
    expect(streakEndedOnSave({ schedules: running }, 10, TODAY)).toBeNull();
    expect(streakEndedOnSave({ schedules: running }, 12, TODAY)).toBeNull();
    expect(streakEndedOnSave({ schedules: lastDay }, 10, TODAY)).toBeNull();
  });

  it('names the last day of an ended streak kept at its length, and is null once the length changes', () => {
    const ended: ScheduleEntry[] = [
      { from: '2026-10-01', schedule: { mode: 'streak', start: '2026-10-01', days: 10 } },
    ];
    expect(streakEndedOnSave({ schedules: ended }, 10, TODAY)).toBe('2026-10-10');
    expect(streakEndedOnSave({ schedules: ended }, 12, TODAY)).toBeNull();
  });

  it('is null when the current schedule is not a streak', () => {
    const ended: ScheduleEntry[] = [
      { from: '2026-10-01', schedule: { mode: 'range', start: '2026-10-01', end: '2026-10-05' } },
    ];
    expect(streakEndedOnSave({ activeDays: [1] }, 10, TODAY)).toBeNull();
    expect(streakEndedOnSave({ schedules: ended }, 10, TODAY)).toBeNull();
  });
});

describe('scheduleDateLabel', () => {
  it.each([
    ['2026-11-20', 'he', '20 נובמבר 2026'],
    ['2026-11-20', 'en', 'Nov 20, 2026'],
    ['2027-01-01', 'he', '1 ינואר 2027'],
    ['2027-01-01', 'en', 'Jan 1, 2027'],
  ] as const)('%s in %s reads %s', (key, language, expected) => {
    expect(scheduleDateLabel(key, language)).toBe(expected);
  });
});

describe('reminderClock', () => {
  it('counts forward from the start', () => {
    expect(reminderClock('08:00', '12:00', { anchor: 'start', offsetMin: 15 })).toBe('08:15');
    expect(reminderClock('08:00', '12:00', { anchor: 'start', offsetMin: 0 })).toBe('08:00');
  });

  it('counts back from the end', () => {
    expect(reminderClock('08:00', '12:00', { anchor: 'end', offsetMin: -30 })).toBe('11:30');
    expect(reminderClock('08:00', '12:00', { anchor: 'end', offsetMin: 0 })).toBe('12:00');
  });

  it('is null when the trigger falls outside the window', () => {
    expect(reminderClock('08:00', '12:00', { anchor: 'start', offsetMin: 300 })).toBeNull();
    expect(reminderClock('08:00', '09:00', { anchor: 'end', offsetMin: -241 })).toBeNull();
    expect(reminderClock('08:00', '12:00', { anchor: 'start', offsetMin: -181 })).toBeNull();
    expect(reminderClock('08:00', '12:00', { anchor: 'end', offsetMin: 1 })).toBeNull();
  });

  it('reaches a heads-up up to 180 minutes before the start', () => {
    expect(reminderClock('08:00', '12:00', { anchor: 'start', offsetMin: -1 })).toBe('07:59');
    expect(reminderClock('08:00', '12:00', { anchor: 'start', offsetMin: -180 })).toBe('05:00');
    expect(reminderClock('08:00', '12:00', { anchor: 'end', offsetMin: -420 })).toBe('05:00');
    expect(reminderClock('08:00', '12:00', { anchor: 'end', offsetMin: -421 })).toBeNull();
    expect(reminderClock('01:00', '03:00', { anchor: 'start', offsetMin: -120 })).toBe('23:00');
  });

  it('puts a clock reminder at its own time inside the hours or up to 180 minutes before them', () => {
    expect(reminderClock('08:00', '12:00', { anchor: 'clock', offsetMin: 600 })).toBe('10:00');
    expect(reminderClock('08:00', '12:00', { anchor: 'clock', offsetMin: 720 })).toBe('12:00');
    expect(reminderClock('08:00', '12:00', { anchor: 'clock', offsetMin: 721 })).toBeNull();
    expect(reminderClock('08:00', '12:00', { anchor: 'clock', offsetMin: 300 })).toBe('05:00');
    expect(reminderClock('08:00', '12:00', { anchor: 'clock', offsetMin: 299 })).toBeNull();
    expect(reminderClock('08:00', '12:00', { anchor: 'clock', offsetMin: 1440 })).toBeNull();
    expect(reminderClock('08:00', '12:00', { anchor: 'clock', offsetMin: -1 })).toBeNull();
    expect(reminderClock('08:00', '12:00', { anchor: 'clock', offsetMin: 600.5 })).toBeNull();
  });

  it('is null when either time is not a valid HH:MM', () => {
    expect(reminderClock('8:00', '12:00', { anchor: 'start', offsetMin: 0 })).toBeNull();
    expect(reminderClock('08:00', '24:00', { anchor: 'end', offsetMin: 0 })).toBeNull();
    expect(reminderClock('', '', { anchor: 'start', offsetMin: 0 })).toBeNull();
  });

  it('is null for an offset that is not a number', () => {
    expect(reminderClock('08:00', '12:00', { anchor: 'start', offsetMin: Number.NaN })).toBeNull();
  });

  describe('a follow-up after the end', () => {
    it.each([
      ['10:00', '11:00', 60, '12:00'],
      ['10:00', '11:00', 1, '11:01'],
      ['10:00', '11:00', 720, '23:00'],
      ['10:00', '11:00', 0, null],
      ['10:00', '11:00', -30, null],
      ['10:00', '11:00', 721, null],
      ['22:00', '01:00', 120, '03:00'],
      ['20:00', '23:00', 120, '01:00'],
      ['08:00', '08:00', 60, '09:00'],
    ])('%s-%s with %i minutes fires at %s', (start, end, offsetMin, expected) => {
      expect(reminderClock(start, end, { anchor: 'followUp', offsetMin })).toBe(expected);
    });
  });

  describe('across midnight', () => {
    it('counts forward from the start past midnight', () => {
      expect(reminderClock('22:00', '01:00', { anchor: 'start', offsetMin: 0 })).toBe('22:00');
      expect(reminderClock('22:00', '01:00', { anchor: 'start', offsetMin: 120 })).toBe('00:00');
      expect(reminderClock('22:00', '01:00', { anchor: 'start', offsetMin: 150 })).toBe('00:30');
      expect(reminderClock('22:00', '01:00', { anchor: 'start', offsetMin: 180 })).toBe('01:00');
    });

    it('counts back from the end on the other side of midnight', () => {
      expect(reminderClock('22:00', '01:00', { anchor: 'end', offsetMin: 0 })).toBe('01:00');
      expect(reminderClock('22:00', '01:00', { anchor: 'end', offsetMin: -30 })).toBe('00:30');
      expect(reminderClock('22:00', '01:00', { anchor: 'end', offsetMin: -90 })).toBe('23:30');
      expect(reminderClock('22:00', '01:00', { anchor: 'end', offsetMin: -180 })).toBe('22:00');
    });

    it('is null outside the overnight window', () => {
      expect(reminderClock('22:00', '01:00', { anchor: 'start', offsetMin: 181 })).toBeNull();
      expect(reminderClock('22:00', '01:00', { anchor: 'start', offsetMin: -181 })).toBeNull();
      expect(reminderClock('22:00', '01:00', { anchor: 'end', offsetMin: -361 })).toBeNull();
      expect(reminderClock('22:00', '01:00', { anchor: 'end', offsetMin: 1 })).toBeNull();
      expect(reminderClock('22:00', '01:00', { anchor: 'start', offsetMin: -1 })).toBe('21:59');
      expect(reminderClock('22:00', '01:00', { anchor: 'end', offsetMin: -181 })).toBe('21:59');
    });

    it('puts a clock reminder on either side of midnight', () => {
      expect(reminderClock('22:00', '01:00', { anchor: 'clock', offsetMin: 30 })).toBe('00:30');
      expect(reminderClock('22:00', '01:00', { anchor: 'clock', offsetMin: 1140 })).toBe('19:00');
      expect(reminderClock('22:00', '01:00', { anchor: 'clock', offsetMin: 1139 })).toBeNull();
      expect(reminderClock('22:00', '01:00', { anchor: 'clock', offsetMin: 61 })).toBeNull();
    });

    it('a window that ends the morning after reaches every hour in between', () => {
      expect(reminderClock('20:00', '06:30', { anchor: 'start', offsetMin: 600 })).toBe('06:00');
      expect(reminderClock('20:00', '06:30', { anchor: 'end', offsetMin: -600 })).toBe('20:30');
    });
  });

  describe('a full 24-hour window', () => {
    it('reaches from the start to the same clock time the next day', () => {
      expect(reminderClock('08:00', '08:00', { anchor: 'start', offsetMin: 0 })).toBe('08:00');
      expect(reminderClock('08:00', '08:00', { anchor: 'start', offsetMin: 960 })).toBe('00:00');
      expect(reminderClock('08:00', '08:00', { anchor: 'start', offsetMin: 1440 })).toBe('08:00');
    });

    it('counts back from the end a day after the start', () => {
      expect(reminderClock('08:00', '08:00', { anchor: 'end', offsetMin: 0 })).toBe('08:00');
      expect(reminderClock('08:00', '08:00', { anchor: 'end', offsetMin: -60 })).toBe('07:00');
      expect(reminderClock('08:00', '08:00', { anchor: 'end', offsetMin: -1440 })).toBe('08:00');
    });

    it('is null past the day', () => {
      expect(reminderClock('08:00', '08:00', { anchor: 'start', offsetMin: 1441 })).toBeNull();
      expect(reminderClock('08:00', '08:00', { anchor: 'end', offsetMin: -1621 })).toBeNull();
      expect(reminderClock('08:00', '08:00', { anchor: 'start', offsetMin: -181 })).toBeNull();
      expect(reminderClock('08:00', '08:00', { anchor: 'start', offsetMin: -1 })).toBe('07:59');
      expect(reminderClock('08:00', '08:00', { anchor: 'clock', offsetMin: 479 })).toBe('07:59');
    });
  });
});

const storedSiddurBlock = (he: string, textId: string) => ({ type: 'siddur', he, textId }) as unknown as DraftBlock;

describe('cleanContentBlock', () => {
  it('drops a siddur block whose text id was retired', () => {
    expect(cleanContentBlock(storedSiddurBlock('ציצית', 'tzitzit'))).toBeNull();
  });

  it('keeps a siddur block for a standalone text', () => {
    expect(cleanContentBlock(storedSiddurBlock('תיקון הכללי', 'tikkun_haklali'))).toEqual({
      type: 'siddur',
      he: 'תיקון הכללי',
      textId: 'tikkun_haklali',
    });
  });

  it('keeps a siddur block for a mitzvah text', () => {
    expect(cleanContentBlock(storedSiddurBlock('הנחת תפילין', 'tefillin'))).toEqual({
      type: 'siddur',
      he: 'הנחת תפילין',
      textId: 'tefillin',
    });
  });

  it('drops a siddur block that has no text chosen yet', () => {
    expect(cleanContentBlock({ type: 'siddur', he: 'x', textId: null })).toBeNull();
  });

  it('drops a text or blessing block whose Hebrew is only whitespace', () => {
    expect(cleanContentBlock({ type: 'text', he: '   ' })).toBeNull();
    expect(cleanContentBlock({ type: 'blessing', he: '\n\t ' })).toBeNull();
  });

  it('trims the Hebrew of a text block', () => {
    expect(cleanContentBlock({ type: 'text', he: '  שלום  ', en: 'Hello' })).toEqual({
      type: 'text',
      he: 'שלום',
      en: 'Hello',
    });
  });

  it('keeps a link only with a url, trimmed', () => {
    expect(cleanContentBlock({ type: 'link', he: 'אתר', url: '   ' })).toBeNull();
    expect(cleanContentBlock({ type: 'link', he: 'אתר', url: ' https://example.com ' })).toEqual({
      type: 'link',
      he: 'אתר',
      url: 'https://example.com',
    });
  });
});

describe('cleanContentBlocks', () => {
  it('keeps the complete blocks in order and drops the rest', () => {
    expect(
      cleanContentBlocks([
        { type: 'text', he: 'א' },
        storedSiddurBlock('ציצית', 'tzitzit'),
        { type: 'siddur', he: '', textId: null },
        storedSiddurBlock('אשר יצר', 'asher_yatzar'),
      ]),
    ).toEqual([
      { type: 'text', he: 'א' },
      { type: 'siddur', he: 'אשר יצר', textId: 'asher_yatzar' },
    ]);
  });

  it('is undefined when nothing is left', () => {
    expect(cleanContentBlocks([])).toBeUndefined();
    expect(cleanContentBlocks([storedSiddurBlock('ציצית', 'tzitzit'), { type: 'text', he: ' ' }])).toBeUndefined();
  });
});

describe('siddurTextName', () => {
  it('names a standalone text in each language', () => {
    expect(siddurTextName('asher_yatzar', 'he')).toBe('אשר יצר');
    expect(siddurTextName('asher_yatzar', 'en')).toBe('Asher Yatzar');
  });

  it('names a mitzvah text in each language', () => {
    expect(siddurTextName('tefillin', 'he')).toBe('הנחת תפילין');
    expect(siddurTextName('tefillin', 'en')).toBe('Tefillin');
  });

  it('is null for a retired text id', () => {
    expect(siddurTextName('tzitzit', 'he')).toBeNull();
    expect(siddurTextName('tzitzit', 'en')).toBeNull();
  });
});
