import { CITIES } from '@/data/cities';
import { setLocale, t } from '@/i18n';
import { at } from '@/testing/zmanim';
import { STAGE_MARK, TIME_STAGE_COLOR, sendStage, timeLeftLine } from '../timeLeft';

const J = CITIES[0];
// Shacharit on Wednesday 2026-11-04 in Jerusalem: 05:58 to 09:32.
const window = { start: at(J, '2026-11-04T05:58'), end: at(J, '2026-11-04T09:32') };

describe('sendStage', () => {
  it('makes the last notification red, the one before it orange and the rest green', () => {
    expect([0, 1, 2, 3, 4, 5].map((i) => sendStage(i, 6))).toEqual([
      'green',
      'green',
      'green',
      'green',
      'orange',
      'red',
    ]);
    expect([0, 1, 2].map((i) => sendStage(i, 3))).toEqual(['green', 'orange', 'red']);
    expect([0, 1].map((i) => sendStage(i, 2))).toEqual(['orange', 'red']);
  });

  it('makes a single notification red, and one not found green', () => {
    expect(sendStage(0, 1)).toBe('red');
    expect(sendStage(-1, 4)).toBe('green');
  });

  it("keeps direction ז's colours and the two marks", () => {
    expect(TIME_STAGE_COLOR).toEqual({ green: '#13804A', orange: '#B85F00', red: '#C5221F' });
    expect(STAGE_MARK).toEqual({ green: '', orange: '⚠️', red: '❗' });
  });
});

describe('timeLeftLine', () => {
  afterEach(() => setLocale('he'));

  it('leads with the end time on the location clock and the time left', () => {
    setLocale('he');
    expect(timeLeftLine(window.start, window, J.tz, t)).toBe('עד 09:32 · נשארו 3:34 שעות');
    expect(timeLeftLine(at(J, '2026-11-04T08:47'), window, J.tz, t)).toBe("עד 09:32 · נשארו 45 דק'");
  });

  it('opens with the mark of its stage: an exclamation mark on the last, a warning sign on the one before, none on the rest', () => {
    setLocale('he');
    const at0847 = at(J, '2026-11-04T08:47');
    expect(timeLeftLine(at0847, window, J.tz, t, 'red')).toBe("❗ עד 09:32 · נשארו 45 דק'");
    expect(timeLeftLine(at0847, window, J.tz, t, 'orange')).toBe("⚠️ עד 09:32 · נשארו 45 דק'");
    expect(timeLeftLine(at0847, window, J.tz, t, 'green')).toBe("עד 09:32 · נשארו 45 דק'");
    expect(timeLeftLine(at(J, '2026-11-04T10:02'), window, J.tz, t, 'red')).toBe('❗ הזמן נגמר ב־09:32');
    expect(timeLeftLine(at(J, '2026-11-04T05:48'), window, J.tz, t, 'orange')).toBe("⚠️ מתחיל בעוד 10 דק'");
  });

  it('says when the time starts before the window and when it ended after it', () => {
    setLocale('he');
    expect(timeLeftLine(at(J, '2026-11-04T05:48'), window, J.tz, t)).toBe("מתחיל בעוד 10 דק'");
    expect(timeLeftLine(at(J, '2026-11-04T10:02'), window, J.tz, t)).toBe('הזמן נגמר ב־09:32');
  });

  it('dates the end of a window a day or more away', () => {
    setLocale('he');
    const long = { start: window.start, end: at(J, '2026-11-12T03:40') };
    expect(timeLeftLine(window.start, long, J.tz, t)).toBe('עד 12/11 03:40 · נשארו 7 ימים');
  });

  it('reads in English', () => {
    setLocale('en');
    expect(timeLeftLine(at(J, '2026-11-04T08:47'), window, J.tz, t, 'red')).toBe('❗ Until 09:32 · 45 min left');
  });
});
