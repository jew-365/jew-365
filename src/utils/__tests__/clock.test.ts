import { TIME_PATTERN, clockOf, clockRange, fireTimeText, formatRemaining, timeToMinutes } from '../clock';
import { translate } from '@/i18n';

const he = (scope: string) => translate(scope, undefined, 'he');
const en = (scope: string) => translate(scope, undefined, 'en');
const MINUTE = 60_000;

describe('TIME_PATTERN', () => {
  it.each(['00:00', '08:05', '12:00', '19:59', '23:59'])('accepts %s', (value) => {
    expect(TIME_PATTERN.test(value)).toBe(true);
  });

  it.each(['24:00', '12:60', '8:00', '08:5', '0800', '08:00:00', ' 08:00', '', 'ab:cd'])('rejects "%s"', (value) => {
    expect(TIME_PATTERN.test(value)).toBe(false);
  });
});

describe('timeToMinutes', () => {
  it('counts minutes since midnight', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('00:01')).toBe(1);
    expect(timeToMinutes('08:30')).toBe(510);
    expect(timeToMinutes('23:59')).toBe(1439);
  });

  it('orders a window the way the custom mitzvah form compares it', () => {
    expect(timeToMinutes('12:00')).toBeGreaterThan(timeToMinutes('08:00'));
    expect(timeToMinutes('09:59')).toBeLessThan(timeToMinutes('10:00'));
  });
});

describe('formatRemaining', () => {
  it.each([
    [0, "0 דק'"],
    [29_000, "0 דק'"],
    [31_000, "1 דק'"],
    [59 * MINUTE, "59 דק'"],
    [60 * MINUTE, '1:00 שעות'],
    [125 * MINUTE, '2:05 שעות'],
    [600 * MINUTE, '10:00 שעות'],
    [48 * 60 * MINUTE - MINUTE, '47:59 שעות'],
    [48 * 60 * MINUTE, '2 ימים'],
    [(10 * 1440 + 300) * MINUTE, '10 ימים'],
  ])('writes %d ms as "%s"', (ms, expected) => {
    expect(formatRemaining(ms, he)).toBe(expected);
  });

  it('floors a window that already closed at zero', () => {
    expect(formatRemaining(-5 * MINUTE, he)).toBe("0 דק'");
  });

  it('takes its unit words from the translator it is given', () => {
    expect(formatRemaining(59 * MINUTE, en)).toBe('59 min');
    expect(formatRemaining(125 * MINUTE, en)).toBe('2:05 h');
    expect(formatRemaining((10 * 1440 + 300) * MINUTE, en)).toBe('10 days');
  });
});

describe('clockOf', () => {
  const instant = new Date('2026-05-06T08:30:00Z');
  const pad = (value: number) => String(value).padStart(2, '0');

  it('reads the device clock when no zone is given', () => {
    expect(clockOf(instant)).toBe(`${pad(instant.getHours())}:${pad(instant.getMinutes())}`);
  });

  it.each([
    ['UTC', '08:30'],
    ['Asia/Jerusalem', '11:30'],
    ['America/Los_Angeles', '01:30'],
    ['Pacific/Kiritimati', '22:30'],
  ])('reads the clock of %s as %s', (zone, expected) => {
    expect(clockOf(instant, zone)).toBe(expected);
  });

  it('pads single digits on both parts', () => {
    expect(clockOf(new Date('2026-05-06T00:05:00Z'), 'UTC')).toBe('00:05');
  });
});

describe('fireTimeText', () => {
  const instant = new Date('2026-05-06T08:30:00Z');

  it.each([
    ['UTC', '06/05 08:30'],
    ['Asia/Jerusalem', '06/05 11:30'],
    ['America/Los_Angeles', '06/05 01:30'],
    ['Pacific/Kiritimati', '06/05 22:30'],
  ])('writes the day and the clock of %s as %s', (zone, expected) => {
    expect(fireTimeText(instant, zone)).toBe(expected);
  });

  it('moves to the previous date in a zone behind UTC when the clock has not reached midnight there', () => {
    const earlyMorning = new Date('2026-05-06T02:00:00Z');
    expect(fireTimeText(earlyMorning, 'UTC')).toBe('06/05 02:00');
    expect(fireTimeText(earlyMorning, 'America/Los_Angeles')).toBe('05/05 19:00');
  });

  it('agrees with the clock of the same zone', () => {
    expect(fireTimeText(instant, 'Asia/Jerusalem')).toBe(`06/05 ${clockOf(instant, 'Asia/Jerusalem')}`);
  });

  it('moves to the next date in a zone ahead of the device when the clock passes midnight there', () => {
    const lateEvening = new Date('2026-05-06T21:30:00Z');
    expect(fireTimeText(lateEvening, 'UTC')).toBe('06/05 21:30');
    expect(fireTimeText(lateEvening, 'Asia/Jerusalem')).toBe('07/05 00:30');
    expect(fireTimeText(lateEvening, 'America/Los_Angeles')).toBe('06/05 14:30');
  });

  it('pads single digits on the day, the month and the clock', () => {
    expect(fireTimeText(new Date('2026-01-02T03:04:00Z'), 'UTC')).toBe('02/01 03:04');
  });
});

describe('clockRange', () => {
  const heWith = (scope: string, options?: Record<string, unknown>) => translate(scope, options, 'he');
  const enWith = (scope: string, options?: Record<string, unknown>) => translate(scope, options, 'en');

  it('prints a window within one calendar day as two clocks', () => {
    const start = new Date(2026, 9, 12, 5, 27);
    const end = new Date(2026, 9, 12, 18, 5);
    expect(clockRange(start, end, heWith)).toBe('05:27 עד 18:05');
    expect(clockRange(start, end, enWith)).toBe('05:27 to 18:05');
    expect(clockRange(new Date(2026, 9, 12, 20, 15), new Date(2026, 9, 12, 23, 59), heWith)).toBe('20:15 עד 23:59');
  });

  it('says the end falls on the next day when it does, as the Chok LeYisrael day and a night window do', () => {
    const start = new Date(2026, 9, 12, 5, 27);
    const end = new Date(2026, 9, 13, 5, 28);
    expect(clockRange(start, end, heWith)).toBe('05:27 עד 05:28 למחרת');
    expect(clockRange(start, end, enWith)).toBe('05:27 to 05:28 the next day');
    expect(clockRange(new Date(2026, 9, 12, 20, 15), new Date(2026, 9, 13), heWith)).toBe('20:15 עד 00:00 למחרת');
  });

  it('says the next day for a window that falls entirely after the day it was computed for, as the Selichot night does', () => {
    const start = new Date(2025, 8, 16, 0, 42);
    const end = new Date(2025, 8, 16, 9, 31);
    expect(clockRange(start, end, heWith)).toBe('00:42 עד 09:31');
    expect(clockRange(start, end, heWith, undefined, new Date(2025, 8, 15))).toBe('00:42 עד 09:31 למחרת');
    expect(clockRange(start, end, enWith, undefined, new Date(2025, 8, 15))).toBe('00:42 to 09:31 the next day');
    expect(clockRange(start, end, heWith, undefined, new Date(2025, 8, 16))).toBe('00:42 עד 09:31');
  });

  it('keeps a window inside its own day plain, and a window that ends the day after its start next-day, when the day is given', () => {
    const day = new Date(2026, 9, 12);
    expect(clockRange(new Date(2026, 9, 12, 5, 27), new Date(2026, 9, 12, 18, 5), heWith, undefined, day)).toBe(
      '05:27 עד 18:05',
    );
    expect(clockRange(new Date(2026, 9, 12, 20, 15), new Date(2026, 9, 13, 4, 0), heWith, undefined, day)).toBe(
      '20:15 עד 04:00 למחרת',
    );
    expect(clockRange(new Date(2026, 9, 11, 22, 0), new Date(2026, 9, 12, 3, 0), heWith, undefined, day)).toBe(
      '22:00 עד 03:00 למחרת',
    );
  });

  it('prints both dates for a window that spans two days or more, as the Kiddush Levana period does', () => {
    const start = new Date(2026, 9, 14, 18, 37);
    expect(clockRange(start, new Date(2026, 9, 26, 3, 44), heWith)).toBe('14/10 18:37 עד 26/10 03:44');
    expect(clockRange(start, new Date(2026, 9, 26, 3, 44), enWith)).toBe('14/10 18:37 to 26/10 03:44');
    expect(clockRange(start, new Date(2026, 9, 16, 1, 0), heWith)).toBe('14/10 18:37 עד 16/10 01:00');
    expect(
      clockRange(new Date('2026-10-14T15:37:57Z'), new Date('2026-10-26T01:44:10Z'), heWith, 'Asia/Jerusalem'),
    ).toBe('14/10 18:37 עד 26/10 03:44');
  });

  it('reads the day it was computed for in the zone it is given', () => {
    const start = new Date('2025-09-15T21:42:00Z');
    const end = new Date('2025-09-16T06:31:00Z');
    expect(clockRange(start, end, heWith, 'Asia/Jerusalem', new Date(2025, 8, 15))).toBe('00:42 עד 09:31 למחרת');
    expect(clockRange(start, end, heWith, 'Asia/Jerusalem', new Date(2025, 8, 16))).toBe('00:42 עד 09:31');
    expect(clockRange(start, end, heWith, 'UTC', new Date(2025, 8, 15))).toBe('21:42 עד 06:31 למחרת');
  });

  it('reads both clocks, and the calendar day between them, in the zone it is given', () => {
    const start = new Date('2026-05-06T20:00:00Z');
    const end = new Date('2026-05-06T22:30:00Z');
    expect(clockRange(start, end, heWith, 'UTC')).toBe('20:00 עד 22:30');
    expect(clockRange(start, end, heWith, 'Asia/Jerusalem')).toBe('23:00 עד 01:30 למחרת');
    expect(clockRange(start, end, enWith, 'America/Los_Angeles')).toBe('13:00 to 15:30');
  });
});
