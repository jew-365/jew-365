import { CITIES } from '@/data/cities';
import { setLocale, t } from '@/i18n';
import { at } from '@/testing/zmanim';
import { TIME_STAGE_DOT, timeLeftLine, timeStage } from '../timeLeft';

const J = CITIES[0];
const MIN = 60_000;
// Shacharit on Wednesday 2026-11-04 in Jerusalem: 05:58 to 09:32.
const window = { start: at(J, '2026-11-04T05:58'), end: at(J, '2026-11-04T09:32') };

describe('timeStage', () => {
  const start = 0;
  const end = 214 * MIN;
  it('is green while more than half the time and more than an hour are left', () => {
    expect(timeStage(0, start, end)).toBe('green');
    expect(timeStage(end - 108 * MIN, start, end)).toBe('green');
  });
  it('turns orange at half the time or at an hour left', () => {
    expect(timeStage(end - 107 * MIN, start, end)).toBe('orange');
    expect(timeStage(end - 60 * MIN, start, end)).toBe('orange');
    // A short window is orange from its start: an hour or less is left.
    expect(timeStage(0, 0, 50 * MIN)).toBe('orange');
    // A long window is already red at an hour left, because under a fifth of it is.
    expect(timeStage(9 * 60 * MIN, 0, 10 * 60 * MIN)).toBe('red');
  });
  it('turns red under a fifth of the time or at 15 minutes left', () => {
    expect(timeStage(end - 42 * MIN, start, end)).toBe('red');
    expect(timeStage(0, 0, 15 * MIN)).toBe('red');
    expect(timeStage(end - 43 * MIN, start, end)).toBe('orange');
  });
});

describe('timeLeftLine', () => {
  afterEach(() => setLocale('he'));

  it('leads with the end time on the location clock and the time left, with the stage dot', () => {
    setLocale('he');
    expect(timeLeftLine(window.start, window, J.tz, t)).toBe(`${TIME_STAGE_DOT.green} עד 09:32 · נשארו 3:34 שעות`);
    expect(timeLeftLine(at(J, '2026-11-04T08:47'), window, J.tz, t)).toBe(
      `${TIME_STAGE_DOT.orange} עד 09:32 · נשארו 45 דק'`,
    );
    expect(timeLeftLine(at(J, '2026-11-04T09:22'), window, J.tz, t)).toBe(
      `${TIME_STAGE_DOT.red} עד 09:32 · נשארו 10 דק'`,
    );
  });

  it('says when the time starts before the window and when it ended after it', () => {
    setLocale('he');
    expect(timeLeftLine(at(J, '2026-11-04T05:48'), window, J.tz, t)).toBe("מתחיל בעוד 10 דק'");
    expect(timeLeftLine(at(J, '2026-11-04T10:02'), window, J.tz, t)).toBe('הזמן נגמר ב־09:32');
  });

  it('dates the end of a window a day or more away', () => {
    setLocale('he');
    const long = { start: window.start, end: at(J, '2026-11-12T03:40') };
    expect(timeLeftLine(window.start, long, J.tz, t)).toBe(`${TIME_STAGE_DOT.green} עד 12/11 03:40 · נשארו 7 ימים`);
  });

  it('reads in English', () => {
    setLocale('en');
    expect(timeLeftLine(at(J, '2026-11-04T08:47'), window, J.tz, t)).toBe(
      `${TIME_STAGE_DOT.orange} until 09:32 · 45 min left`,
    );
  });
});
