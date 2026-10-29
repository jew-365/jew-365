import { DateTime } from 'luxon';
import {
  DEFAULT_QUIET_BEFORE,
  NO_QUIET_HOURS,
  inQuietHours,
  isQuietBound,
  quietBoundOf,
  quietHoursEdge,
  quietHoursOf,
  quietHoursValid,
  type QuietBound,
  type QuietHours,
} from '../quietHours';
import { isQuietAt, quietHoursTrigger } from '../skipRules';
import { appDayEnd, calendarDayEnd } from '../locationDay';
import { CITIES } from '@/data/cities';
import { at } from '@/testing/zmanim';

const J = CITIES[0];
const NY = CITIES.find((city) => city.cityId === 'new-york')!;
const H: QuietHours = { before: 420, after: 1320 };
const FAR = at(J, '2026-11-20T00:00');
const bound = (enabled: boolean, minutes: number): QuietBound => ({ enabled, minutes });

describe('quietHoursValid', () => {
  it.each([
    [null, null, true],
    [420, 1320, true],
    [420, 480, true],
    [420, 479, false],
    [1320, 420, false],
    [1380, null, true],
    [1381, null, false],
    [null, 60, true],
    [null, 59, false],
    [-1, null, false],
    [420.5, null, false],
    [null, 1440, false],
  ])('before %s, after %s: %s', (before, after, expected) => {
    expect(quietHoursValid({ before, after })).toBe(expected);
  });
});

describe('quietHoursOf', () => {
  it('is no hours when both bounds are off', () => {
    expect(quietHoursOf(bound(false, 420), bound(false, 1320))).toEqual({ before: null, after: null });
  });

  it('keeps one bound alone', () => {
    expect(quietHoursOf(bound(true, 420), bound(false, 1320))).toEqual({ before: 420, after: null });
  });

  it('keeps both bounds', () => {
    expect(quietHoursOf(bound(true, 420), bound(true, 1320))).toEqual({ before: 420, after: 1320 });
  });

  it('gives no hours for a pair that leaves less than an hour open', () => {
    expect(quietHoursOf(bound(true, 600), bound(true, 630))).toEqual({ before: null, after: null });
  });
});

describe('quietBoundOf', () => {
  it.each([
    [undefined, { enabled: false, minutes: 420 }],
    [
      { enabled: true, minutes: 480 },
      { enabled: true, minutes: 480 },
    ],
    [
      { enabled: 'yes', minutes: 480 },
      { enabled: false, minutes: 480 },
    ],
    [
      { enabled: true, minutes: 2000 },
      { enabled: true, minutes: 420 },
    ],
    ['x', { enabled: false, minutes: 420 }],
  ])('%j gives %j', (saved, expected) => {
    expect(quietBoundOf(saved, DEFAULT_QUIET_BEFORE)).toEqual(expected);
  });
});

describe('isQuietBound', () => {
  it('rejects a minute outside the day', () => {
    expect(isQuietBound({ enabled: false, minutes: 9999 })).toBe(false);
  });

  it('accepts midnight', () => {
    expect(isQuietBound({ enabled: true, minutes: 0 })).toBe(true);
  });
});

describe('inQuietHours', () => {
  it.each([
    ['06:59:59', true],
    ['07:00', false],
    ['22:00', false],
    ['22:00:01', true],
  ])('%s: %s', (time, expected) => {
    expect(inQuietHours(at(J, `2026-11-11T${time}`), H, J.tz)).toBe(expected);
  });

  it('is never quiet without hours', () => {
    expect(inQuietHours(at(J, '2026-11-11T03:00'), NO_QUIET_HOURS, J.tz)).toBe(false);
  });
});

describe('quietHoursEdge', () => {
  it('resolves a wall time that a spring-forward day skips to the hour after', () => {
    expect(quietHoursEdge(at(NY, '2027-03-14T01:00'), { before: 150, after: null }, NY.tz)).toEqual(
      DateTime.fromISO('2027-03-14T03:30', { zone: NY.tz }).toJSDate(),
    );
  });
});

describe('quietHoursTrigger', () => {
  it('moves a trigger before the first hour to that hour of the same date', () => {
    expect(quietHoursTrigger(at(J, '2026-11-11T05:30'), H, FAR, J)).toEqual(at(J, '2026-11-11T07:00'));
  });

  it('returns the very same object at the first hour', () => {
    const trigger = at(J, '2026-11-11T07:00');
    expect(quietHoursTrigger(trigger, H, FAR, J)).toBe(trigger);
  });

  it('returns the very same object at the last hour', () => {
    const trigger = at(J, '2026-11-11T22:00');
    expect(quietHoursTrigger(trigger, H, FAR, J)).toBe(trigger);
  });

  it('moves a trigger after the last hour to the first hour of the next date', () => {
    expect(quietHoursTrigger(at(J, '2026-11-11T22:00:30'), H, FAR, J)).toEqual(at(J, '2026-11-12T07:00'));
  });

  it('drops a trigger after the last hour when there is no first hour', () => {
    expect(quietHoursTrigger(at(J, '2026-11-11T23:15'), { before: null, after: 1320 }, FAR, J)).toBeNull();
  });

  it('leaves a morning trigger alone when there is no first hour', () => {
    const trigger = at(J, '2026-11-11T05:30');
    expect(quietHoursTrigger(trigger, { before: null, after: 1320 }, FAR, J)).toBe(trigger);
  });

  it('drops a trigger whose moved time is past the latest', () => {
    expect(quietHoursTrigger(at(J, '2026-11-11T05:30'), H, at(J, '2026-11-11T06:59'), J)).toBeNull();
  });

  it('keeps a trigger whose moved time is exactly the latest', () => {
    expect(quietHoursTrigger(at(J, '2026-11-11T05:30'), H, at(J, '2026-11-11T07:00'), J)).toEqual(
      at(J, '2026-11-11T07:00'),
    );
  });

  it('leaves a trigger inside a holy block as it is', () => {
    const trigger = at(J, '2026-11-14T06:00');
    expect(quietHoursTrigger(trigger, H, FAR, J)).toBe(trigger);
  });

  it('drops a trigger whose moved time falls inside a holy block', () => {
    expect(isQuietAt(at(J, '2026-11-13T17:00'), J)).toBe(true);
    expect(quietHoursTrigger(at(J, '2026-11-13T05:00'), { before: 1020, after: null }, FAR, J)).toBeNull();
  });

  it('ignores an invalid pair', () => {
    const trigger = at(J, '2026-11-11T05:00');
    expect(quietHoursTrigger(trigger, { before: 600, after: 630 }, FAR, J)).toBe(trigger);
  });
});

describe('calendarDayEnd', () => {
  it("is the alot that ends the trigger's location date", () => {
    const end = calendarDayEnd(at(J, '2026-11-11T02:00'), J);
    expect(end).toEqual(appDayEnd(new Date(2026, 10, 11), J));
    expect(end.getTime()).toBeGreaterThan(at(J, '2026-11-12T04:00').getTime());
    expect(end.getTime()).toBeLessThan(at(J, '2026-11-12T06:00').getTime());
  });
});
