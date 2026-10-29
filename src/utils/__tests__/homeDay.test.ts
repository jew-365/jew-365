import {
  dayEntryStatusText,
  dayRingCounts,
  firstName,
  greetingKey,
  heroCaption,
  miniRingFraction,
  orderDayEntries,
  railNowIndex,
  timeOrderDayEntries,
  ringDashOffset,
  type DayEntry,
} from '../homeDay';
import { CITIES } from '@/data/cities';
import { at } from '@/testing/zmanim';
import { t } from '@/i18n';

const J = CITIES[0];
const T = (clock: string, date = '2026-10-29') => at(J, `${date}T${clock}`);
const d = T('00:00');
const entry = (
  id: string,
  status: DayEntry['status'],
  start: Date | null,
  end: Date | null,
  markedAt: number | null = null,
): DayEntry => ({ id, status, start, end, markedAt, date: d });

const A = entry('A', 'active', T('05:53'), T('08:38'));
const B = entry('B', 'active', T('11:50'), T('16:52'));
const U = entry('U', 'upcoming', T('17:23'), T('04:40', '2026-10-30'));
const D2 = entry('D2', 'done', T('05:53'), T('08:38'), T('09:00').getTime());
const D1 = entry('D1', 'done', T('05:53'), T('08:38'), T('07:00').getTime());
const S = entry('S', 'skipped', T('05:53'), T('08:38'), T('08:00').getTime());
const M = entry('M', 'missed', T('05:53'), T('09:33'));
const ordered = orderDayEntries([M, D2, U, S, B, D1, A]);
const NOW = T('12:30');

describe('homeDay', () => {
  it('orders the entries', () => {
    expect(ordered.map((e) => e.id)).toEqual(['A', 'B', 'U', 'D1', 'S', 'D2', 'M']);
  });

  it('counts the rings without skipped', () => {
    expect(dayRingCounts(ordered)).toEqual({ done: 2, open: 3, missed: 1, total: 6 });
  });

  it('offsets a ring dash', () => {
    expect(ringDashOffset(163.4, 0.25)).toBeCloseTo(122.55, 2);
    expect(ringDashOffset(163.4, -1)).toBe(163.4);
    expect(ringDashOffset(163.4, 2)).toBe(0);
  });

  it('measures the mini ring', () => {
    expect(miniRingFraction(A, T('07:12'))).toBeCloseTo(0.5, 1);
    expect(miniRingFraction(A, T('05:54'))).toBe(0.03);
    expect([D1, S, M].map((e) => miniRingFraction(e, NOW))).toEqual([1, 1, 1]);
    expect(miniRingFraction(U, NOW)).toBe(0);
  });

  it('finds the rail now row', () => {
    expect(railNowIndex(timeOrderDayEntries(ordered), NOW)).toBe(6);
    expect(railNowIndex([D1, M], NOW)).toBeNull();
    expect(railNowIndex([A], NOW)).toBe(1);
  });

  it('orders the rail by time alone', () => {
    expect(timeOrderDayEntries(ordered).map((e) => e.id)).toEqual(['A', 'D1', 'D2', 'M', 'S', 'B', 'U']);
  });

  it('words the status', () => {
    const text = (e: DayEntry) => dayEntryStatusText(e, NOW, 'Asia/Jerusalem', t);
    expect(text(B)).toBe('פתוח · נשארו 4:22 שעות');
    expect(text(U)).toBe('נפתח ב-17:23');
    expect(text(D1)).toBe('בוצע ב-07:00');
    expect(text(S)).toBe('דולג להיום');
    expect(text(M)).toBe('פוספס · נגמר ב-09:33');
  });

  it('picks the greeting', () => {
    expect(greetingKey(T('08:15'), J.tz, true)).toBe('home.greeting.morning');
    expect(greetingKey(NOW, J.tz, false)).toBe('home.greeting.afternoonNeutral');
    expect(greetingKey(T('20:15'), J.tz, true)).toBe('home.greeting.evening');
    expect(greetingKey(T('00:20'), J.tz, true)).toBe('home.greeting.night');
  });

  it('takes the first name', () => {
    expect(firstName('  דוד לוי ')).toBe('דוד');
    expect(firstName('')).toBe('');
  });

  it('words the hero caption', () => {
    const open = { name: 'תפילת מנחה', end: T('16:52') };
    const next = { name: 'תפילת ערבית', start: T('17:23') };
    expect(heroCaption(open, null, false, NOW, J.tz, t)).toBe('תפילת מנחה · עוד 4:22 שעות');
    expect(heroCaption(null, next, false, NOW, J.tz, t)).toBe('הבא: תפילת ערבית ב-17:23');
    expect(heroCaption(null, null, true, NOW, J.tz, t)).toBe('הכול סומן להיום');
    expect(heroCaption(null, null, false, NOW, J.tz, t)).toBe('');
  });
});
