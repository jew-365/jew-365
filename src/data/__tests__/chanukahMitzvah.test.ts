import { DateTime } from 'luxon';
import { CITIES } from '@/data/cities';
import { findMitzvah } from '@/data/mitzvot';
import { MITZVAH_STANDALONE_TEXT, hasSiddurText, siddurPlace, standaloneHoursAt } from '@/data/siddur';
import { HebcalService } from '@/services/HebcalService';
import { candleLightingMinutes, holyBlockExit } from '@/services/ZmanimService';
import { at, zmanimFor } from '@/testing/zmanim';
import type { Nusach, UserSettings } from '@/types/mitzvah';
import type { Location } from '@/types/zmanim';
import { appDayWindow } from '@/utils/buildDayTimeline';
import { calendarDay, checkInDeadline, checkInFor } from '@/utils/checkIn';
import { judgeDay } from '@/utils/historyStats';
import { appDayKey } from '@/utils/locationDay';

const JERUSALEM = CITIES[0];
const NEW_YORK = CITIES.find((city) => city.cityId === 'new-york')!;
const NUSCHAOT: Nusach[] = ['ashkenaz', 'sefard', 'edot_hamizrach', 'chabad'];
const FROM_TZEIT: Nusach[] = ['ashkenaz', 'sefard', 'edot_hamizrach'];
const MINUTE = 60_000;
const MAQAF = '־';

const settingsFor = (nusach: Nusach, inIsrael = true): UserSettings => ({
  nusach,
  halachicOpinions: { ksSofZman: 'GRA' },
  inIsrael,
});
const ASHKENAZ = settingsFor('ashkenaz');

const CANDLES = findMitzvah('chanukah_candles')!;
const PLACES = [
  ['Jerusalem', JERUSALEM, true],
  ['New York', NEW_YORK, false],
] as const;

const ctxFor = (location: Location, iso: string, settings: UserSettings, clock = '12:00') => ({
  date: calendarDay(iso),
  location,
  settings,
  zmanim: zmanimFor(at(location, `${iso}T${clock}`), location),
});
const windowOn = (location: Location, iso: string, settings: UserSettings, clock?: string) =>
  CANDLES.computeWindow(ctxFor(location, iso, settings, clock));
const daysFrom = (iso: string, count: number) =>
  Array.from({ length: count }, (_, i) => DateTime.fromISO(iso).plus({ days: i }).toISODate()!);
const windowDays = (location: Location, settings: UserSettings, from: string, count: number) =>
  daysFrom(from, count).filter((iso) => windowOn(location, iso, settings) !== null);
const zmanimOn = (location: Location, iso: string) => zmanimFor(at(location, `${iso}T12:00`), location);
const blockOn = (location: Location, iso: string) => HebcalService.holyBlockOn(at(location, `${iso}T12:00`), location)!;

describe('the Chanukah candles mitzvah', () => {
  it('is a seasonal mitzvah of every nusach in the seasonal group, with one reminder at its start that names the night', () => {
    expect(CANDLES).toMatchObject({
      name: { he: 'נרות חנוכה', en: 'Chanukah candles' },
      icon: 'chanukiah',
      timeType: 'annual-seasonal',
      category: 'seasonal',
      group: 'seasonal',
      skipOn: [],
      nuschaotSupported: NUSCHAOT,
      bodyKey: 'notifications.chanukahNight',
    });
    expect(CANDLES.description).toBeUndefined();
    expect(CANDLES.contentBlocks).toBeUndefined();
    expect(CANDLES.defaultReminders).toEqual([
      {
        anchor: 'start',
        offsetMin: 0,
        label: 'זמן הדלקת נרות חנוכה',
        bodyVariants: [
          `זמן הדלקת נרות חנוכה: הנר ה${MAQAF}%{n}`,
          `הלילה מדליקים את הנר ה${MAQAF}%{n}`,
          `חנוכה שמח, זה הזמן להדליק את הנר ה${MAQAF}%{n}`,
        ],
      },
    ]);
    for (const variant of CANDLES.defaultReminders[0].bodyVariants!) expect(variant).toContain(`הנר ה${MAQAF}%{n}`);
    expect(MITZVAH_STANDALONE_TEXT.chanukah_candles).toBe('chanukah_candles');
  });

  it.each(NUSCHAOT)('%s lights on the eight nights of 5786 and 5787 in Jerusalem and New York', (nusach) => {
    for (const [, location, inIsrael] of PLACES) {
      const settings = settingsFor(nusach, inIsrael);
      expect(windowDays(location, settings, '2025-12-08', 20)).toEqual(daysFrom('2025-12-14', 8));
      expect(windowDays(location, settings, '2026-11-28', 20)).toEqual(daysFrom('2026-12-04', 8));
    }
  });

  it('keeps the eighth night when Kislev has 29 days, and across 1 January', () => {
    expect(windowDays(JERUSALEM, ASHKENAZ, '2023-12-01', 20)).toEqual(daysFrom('2023-12-07', 8));
    expect(windowDays(JERUSALEM, ASHKENAZ, '2024-12-20', 15)).toEqual(daysFrom('2024-12-25', 8));
  });

  it('names the night through bodyParams, and nothing outside Chanukah', () => {
    expect(daysFrom('2026-12-04', 8).map((iso) => CANDLES.bodyParams!(ctxFor(JERUSALEM, iso, ASHKENAZ)))).toEqual(
      [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ n })),
    );
    for (const iso of ['2026-12-03', '2026-12-12', '2026-10-28']) {
      expect(CANDLES.bodyParams!(ctxFor(JERUSALEM, iso, ASHKENAZ))).toBeNull();
    }
    expect(CANDLES.bodyParams!(ctxFor(JERUSALEM, '2023-12-14', ASHKENAZ))).toEqual({ n: 8 });
  });

  describe.each(PLACES)('in %s', (_name, location, inIsrael) => {
    const settings = (nusach: Nusach) => settingsFor(nusach, inIsrael);

    it.each(FROM_TZEIT)('%s lights a weeknight from tzeit to the next alot', (nusach) => {
      for (const [day, next] of [
        ['2025-12-15', '2025-12-16'],
        ['2026-12-08', '2026-12-09'],
      ]) {
        expect(windowOn(location, day, settings(nusach))).toEqual({
          start: zmanimOn(location, day).tzeitHakochavim,
          end: zmanimOn(location, next).alotHaShachar,
        });
      }
    });

    it('chabad lights a weeknight from shkia to the next alot', () => {
      for (const [day, next] of [
        ['2025-12-15', '2025-12-16'],
        ['2026-12-08', '2026-12-09'],
      ]) {
        expect(windowOn(location, day, settings('chabad'))).toEqual({
          start: zmanimOn(location, day).shkia,
          end: zmanimOn(location, next).alotHaShachar,
        });
      }
    });

    it.each(NUSCHAOT)('%s lights on Friday from plag hamincha to candle lighting', (nusach) => {
      for (const [friday, saturday] of [
        ['2025-12-19', '2025-12-20'],
        ['2026-12-04', '2026-12-05'],
        ['2026-12-11', '2026-12-12'],
      ]) {
        const block = blockOn(location, saturday);
        expect(block.start.getTime()).toBe(
          zmanimOn(location, friday).shkia.getTime() - candleLightingMinutes(location) * MINUTE,
        );
        expect(windowOn(location, friday, settings(nusach))).toEqual({
          start: zmanimOn(location, friday).plagHaMincha,
          end: block.start,
        });
      }
    });

    it.each(NUSCHAOT)('%s lights on motzaei Shabbat from the exit of the block', (nusach) => {
      for (const [saturday, next] of [
        ['2025-12-20', '2025-12-21'],
        ['2026-12-05', '2026-12-06'],
      ]) {
        const block = blockOn(location, saturday);
        expect(block.end).toEqual(holyBlockExit(zmanimOn(location, saturday)));
        expect(windowOn(location, saturday, settings(nusach))).toEqual({
          start: block.end,
          end: zmanimOn(location, next).alotHaShachar,
        });
      }
    });
  });

  it('depends only on the day, not on the clock time of ctx.date', () => {
    const noon = windowOn(JERUSALEM, '2025-12-15', ASHKENAZ, '12:00');
    expect(noon).not.toBeNull();
    expect(windowOn(JERUSALEM, '2025-12-15', ASHKENAZ, '00:30')).toEqual(noon);
    expect(windowOn(JERUSALEM, '2025-12-15', ASHKENAZ, '23:30')).toEqual(noon);
  });

  it('stays on home past alot until its end, under the day whose evening opened it', () => {
    const w = windowOn(JERUSALEM, '2025-12-15', ASHKENAZ)!;
    const late = at(JERUSALEM, '2025-12-16T02:00');
    expect(appDayKey(late, JERUSALEM)).toBe('2025-12-15');
    expect(appDayWindow(CANDLES, JERUSALEM, ASHKENAZ, late)).toMatchObject({
      start: w.start,
      end: w.end,
      date: calendarDay('2025-12-15'),
    });
    expect(appDayWindow(CANDLES, JERUSALEM, ASHKENAZ, new Date(w.end.getTime() + MINUTE))).toMatchObject({
      date: calendarDay('2025-12-16'),
    });
  });

  it('is open in history until its end, then missed, and done when marked', () => {
    const w = windowOn(JERUSALEM, '2025-12-15', ASHKENAZ)!;
    const input = { mitzvot: [CANDLES], completions: {}, location: JERUSALEM, settings: ASHKENAZ };
    const day = calendarDay('2025-12-15');
    expect(judgeDay(day, input, new Date(w.end.getTime() - MINUTE)).pending).toEqual(['chanukah_candles']);
    expect(judgeDay(day, input, new Date(w.end.getTime() + MINUTE)).missed).toEqual(['chanukah_candles']);
    const marked = { ...input, completions: { '2025-12-15': { chanukah_candles: 1 } } };
    expect(judgeDay(day, marked, new Date(w.end.getTime() + MINUTE)).done).toEqual(['chanukah_candles']);
  });

  it('waits in the Shabbat check-in on Friday, and not on motzaei Shabbat', () => {
    const block = blockOn(JERUSALEM, '2025-12-20');
    const input = { mitzvot: [CANDLES], completions: {}, checkIns: {}, location: JERUSALEM, settings: ASHKENAZ };
    const afterExit = new Date(block.end.getTime() + MINUTE);
    expect(checkInFor(block, input, afterExit)!.days.map((d) => [d.key, d.items.map((i) => i.mitzvah.id)])).toEqual([
      ['2025-12-19', ['chanukah_candles']],
    ]);
    expect(judgeDay(calendarDay('2025-12-19'), input, afterExit).pending).toEqual(['chanukah_candles']);
    const afterDeadline = new Date(checkInDeadline(block, JERUSALEM).getTime() + MINUTE);
    expect(judgeDay(calendarDay('2025-12-19'), input, afterDeadline).missed).toEqual(['chanukah_candles']);
  });

  it.each(NUSCHAOT)('%s: offers the text on the eight nights only', (nusach) => {
    const place = siddurPlace(JERUSALEM, true);
    for (const iso of daysFrom('2026-12-04', 8)) {
      expect(hasSiddurText(CANDLES, nusach, calendarDay(iso), place)).toBe(true);
    }
    for (const iso of ['2026-12-03', '2026-12-12']) {
      expect(hasSiddurText(CANDLES, nusach, calendarDay(iso), place)).toBe(false);
    }
  });

  describe.each(PLACES)('the siddur tab’s hours for its text in %s', (_name, location, inIsrael) => {
    const place = siddurPlace(location, inIsrael);
    const hoursAt = (nusach: Nusach, instant: Date) =>
      standaloneHoursAt('chanukah_candles', nusach, instant, location, place);
    const plus = (instant: Date, minutes: number) => new Date(instant.getTime() + minutes * MINUTE);

    it.each(NUSCHAOT)('%s: are the mitzvah’s own window on weeknights, Fridays and motzaei Shabbat', (nusach) => {
      for (const day of ['2025-12-15', '2025-12-19', '2025-12-20', '2026-12-04', '2026-12-05', '2026-12-08']) {
        const w = windowOn(location, day, settingsFor(nusach, inIsrael))!;
        expect(w).not.toBeNull();
        expect(hoursAt(nusach, plus(w.start, 1))).toEqual({ start: w.start, end: w.end });
        expect(hoursAt(nusach, plus(w.end, -1))).toEqual({ start: w.start, end: w.end });
        expect(hoursAt(nusach, plus(w.start, -1))).toBeNull();
        expect(hoursAt(nusach, w.end)).toBeNull();
      }
    });

    it.each(NUSCHAOT)('%s: are closed at 13:00 on a Chanukah Friday and weekday', (nusach) => {
      for (const day of ['2026-12-04', '2026-12-08']) expect(hoursAt(nusach, at(location, `${day}T13:00`))).toBeNull();
    });

    it('open on Friday at plag hamincha + 10 min and close at candle lighting, not at the next alot', () => {
      const friday = zmanimOn(location, '2026-12-04');
      const lighting = blockOn(location, '2026-12-05').start;
      for (const nusach of NUSCHAOT) {
        expect(hoursAt(nusach, plus(friday.plagHaMincha, 10))).toEqual({ start: friday.plagHaMincha, end: lighting });
        expect(hoursAt(nusach, plus(friday.tzeitHakochavim, 5))).toBeNull();
      }
    });

    it('open at shkia + 5 min on a weekday for Chabad only, and at tzeit + 5 min for the others', () => {
      const weekday = zmanimOn(location, '2026-12-08');
      expect(hoursAt('chabad', plus(weekday.shkia, 5))).toMatchObject({ start: weekday.shkia });
      for (const nusach of FROM_TZEIT) {
        expect(hoursAt(nusach, plus(weekday.shkia, 5))).toBeNull();
        expect(hoursAt(nusach, plus(weekday.tzeitHakochavim, 5))).toMatchObject({ start: weekday.tzeitHakochavim });
      }
    });
  });
});
