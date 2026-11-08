import { CITIES } from '@/data/cities';
import { setLocale, t } from '@/i18n';
import { at } from '@/testing/zmanim';
import { STAGE_MARK, TIME_STAGE_COLOR, sendStage, timeLeftLine } from '../timeLeft';

const J = CITIES[0];
// Shacharit on Wednesday 2026-11-04 in Jerusalem: 05:58 to 09:32.
const window = { start: at(J, '2026-11-04T05:58'), end: at(J, '2026-11-04T09:32') };

describe('sendStage', () => {
  it('makes only the warning orange and only the last-chance point alone red; every other send is plain', () => {
    expect(sendStage('reminder', false)).toBe('green');
    expect(sendStage('nag', false)).toBe('green');
    expect(sendStage('warning', false)).toBe('orange');
    expect(sendStage('lastChanceAlone', false)).toBe('red');
  });

  it("makes the window's last notification red only when the window has no red point", () => {
    expect(sendStage('reminder', true)).toBe('red');
    expect(sendStage('nag', true)).toBe('red');
    expect(sendStage('warning', true)).toBe('red');
  });

  it("keeps direction ז's colours and the two marks", () => {
    expect(TIME_STAGE_COLOR).toEqual({ green: '#13804A', orange: '#B85F00', red: '#C5221F' });
    expect(STAGE_MARK).toEqual({ green: '', orange: '⚠️', red: '❗' });
  });
});

describe('timeLeftLine', () => {
  afterEach(() => setLocale('he'));

  it('leads with the time left and then the end time on the location clock', () => {
    setLocale('he');
    expect(timeLeftLine(window.start, window, J.tz, t)).toBe('נשארו 3:34 שעות · עד 09:32');
    expect(timeLeftLine(at(J, '2026-11-04T08:47'), window, J.tz, t)).toBe("נשארו 45 דק' · עד 09:32");
  });

  it('opens with the mark of its stage: an exclamation mark on the last, a warning sign on the one before, none on the rest', () => {
    setLocale('he');
    const at0847 = at(J, '2026-11-04T08:47');
    expect(timeLeftLine(at0847, window, J.tz, t, 'red')).toBe("❗ נשארו 45 דק' · עד 09:32");
    expect(timeLeftLine(at0847, window, J.tz, t, 'orange')).toBe("⚠️ נשארו 45 דק' · עד 09:32");
    expect(timeLeftLine(at0847, window, J.tz, t, 'green')).toBe("נשארו 45 דק' · עד 09:32");
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
    expect(timeLeftLine(window.start, long, J.tz, t)).toBe('נשארו 7 ימים · עד 12/11 03:40');
  });

  it('reads in English', () => {
    setLocale('en');
    expect(timeLeftLine(at(J, '2026-11-04T08:47'), window, J.tz, t, 'red')).toBe('❗ 45 min left · until 09:32');
  });
});
