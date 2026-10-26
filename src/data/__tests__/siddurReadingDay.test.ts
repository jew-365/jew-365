jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

import { HDate, months } from '@hebcal/core';
import { DateTime } from 'luxon';
import { CITIES, findCityById } from '@/data/cities';
import { findMitzvah } from '@/data/mitzvot';
import {
  NEXT_TEXT_SCAN_DAYS,
  hasSiddurText,
  hasStandaloneText,
  nextMitzvahTextWindow,
  siddurPlace,
  standalonePeriodEnded,
  standaloneReadingDay,
  standaloneTextDay,
} from '@/data/siddur';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { installSelichotFixture } from '@/testing/selichot';
import { at } from '@/testing/zmanim';
import type { Mitzvah, Nusach, UserSettings } from '@/types/mitzvah';
import type { StandaloneTextId } from '@/types/siddur';
import type { Location } from '@/types/zmanim';
import { appDay } from '@/utils/locationDay';
import { currentOrNextWindow } from '@/utils/buildDayTimeline';
import * as siddurUtils from '@/utils/siddur';
import { dayFeatures, kiddushLevanaPeriod } from '@/utils/siddur';

const JERUSALEM = CITIES[0];
const NEW_YORK = findCityById('new-york')!;
const NUSCHAOT: Nusach[] = ['ashkenaz', 'sefard', 'edot_hamizrach', 'chabad'];
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const BRUTE_FORCE_DAYS = 400;
const SPAN_START = new HDate(1, months.TISHREI, 5787).abs();
const SPAN_YEARS_END = new HDate(1, months.TISHREI, 5789).abs();
const MAX_FEATURE_CALLS = 2 * NEXT_TEXT_SCAN_DAYS + 1;

const placeOf = (location: Location) => siddurPlace(location, location.inIsrael);
const settingsFor = (nusach: Nusach, location: Location): UserSettings => ({
  nusach,
  halachicOpinions: { ksSofZman: 'GRA' },
  inIsrael: location.inIsrael,
});
const hdate = (day: number, month: number, year: number) => new HDate(day, month, year);
const hasOn = (id: StandaloneTextId, nusach: Nusach, location: Location, day: HDate) =>
  hasStandaloneText(id, nusach, dayFeatures(day, placeOf(location)));
const isoOf = (day: HDate) => DateTime.fromJSDate(day.greg()).toISODate()!;
const reading = (id: StandaloneTextId, nusach: Nusach, location: Location, today: HDate, periodEnded = false) => {
  const result = standaloneReadingDay(id, nusach, today, periodEnded, placeOf(location));
  return result && { abs: result.day.abs(), offSeason: result.offSeason };
};
const offSeasonOn = (day: HDate) => ({ abs: day.abs(), offSeason: true });

const featureCalls = jest.spyOn(siddurUtils, 'dayFeatures');

afterEach(() => {
  useSelichotStore.getState().reset();
});

type Combination = [string, StandaloneTextId, Nusach, Location];
const COMBINATIONS: Combination[] = [
  ['Chanukah candles in Jerusalem', 'chanukah_candles', 'ashkenaz', JERUSALEM],
  ['Chanukah candles in New York', 'chanukah_candles', 'ashkenaz', NEW_YORK],
  ['Ushpizin in Jerusalem', 'ushpizin', 'sefard', JERUSALEM],
  ['Ushpizin in New York', 'ushpizin', 'sefard', NEW_YORK],
  ['Selichot of Ashkenaz in Jerusalem', 'selichot', 'ashkenaz', JERUSALEM],
  ['Selichot of Edot HaMizrach in Jerusalem', 'selichot', 'edot_hamizrach', JERUSALEM],
  ...NUSCHAOT.map((nusach): Combination => [
    `Kiddush Levana of ${nusach} in Jerusalem`,
    'kiddush_levana',
    nusach,
    JERUSALEM,
  ]),
];

describe('standaloneReadingDay against a day-by-day search', () => {
  it.each(COMBINATIONS)('%s', (_label, id, nusach, location) => {
    installSelichotFixture();
    const place = placeOf(location);
    const span = SPAN_YEARS_END + BRUTE_FORCE_DAYS - SPAN_START;
    const has = Array.from({ length: span + 1 }, (_, index) =>
      hasStandaloneText(id, nusach, dayFeatures(new HDate(SPAN_START + index), place)),
    );
    expect(has.some(Boolean)).toBe(true);
    let mostFeatureCalls = 0;
    for (let from = SPAN_START; from < SPAN_YEARS_END; from += 5) {
      const index = from - SPAN_START;
      let expected: { abs: number; offSeason: boolean } | null = null;
      if (has[index]) expected = { abs: from, offSeason: false };
      else {
        const next = has.findIndex((present, later) => later > index && later <= index + BRUTE_FORCE_DAYS && present);
        if (next !== -1) expected = { abs: SPAN_START + next, offSeason: true };
      }
      featureCalls.mockClear();
      const actual = standaloneReadingDay(id, nusach, new HDate(from), false, place);
      mostFeatureCalls = Math.max(mostFeatureCalls, featureCalls.mock.calls.length);
      expect(actual && { abs: actual.day.abs(), offSeason: actual.offSeason }).toEqual(expected);
    }
    expect(mostFeatureCalls).toBeLessThanOrEqual(MAX_FEATURE_CALLS);
  });
});

describe('standaloneReadingDay', () => {
  it('opens Chanukah on its first night from Cheshvan, and on the next year after its last night', () => {
    expect(reading('chanukah_candles', 'ashkenaz', JERUSALEM, hdate(1, months.CHESHVAN, 5787))).toEqual(
      offSeasonOn(hdate(25, months.KISLEV, 5787)),
    );
    expect(reading('chanukah_candles', 'ashkenaz', JERUSALEM, hdate(3, months.TEVET, 5787))).toEqual(
      offSeasonOn(hdate(25, months.KISLEV, 5788)),
    );
  });

  it('is today on a night of Chanukah, in season', () => {
    const today = hdate(26, months.KISLEV, 5787);
    expect(reading('chanukah_candles', 'ashkenaz', JERUSALEM, today)).toEqual({ abs: today.abs(), offSeason: false });
  });

  it('opens Ushpizin on the first night of the next Sukkot after the last night', () => {
    expect(reading('ushpizin', 'sefard', JERUSALEM, hdate(22, months.TISHREI, 5787))).toEqual(
      offSeasonOn(hdate(15, months.TISHREI, 5788)),
    );
  });

  it.each<Nusach>(['edot_hamizrach', 'ashkenaz'])(
    'opens Selichot for %s on the first day its nusach says them',
    (nusach) => {
      installSelichotFixture();
      const result = standaloneReadingDay('selichot', nusach, hdate(1, months.AV, 5787), false, placeOf(JERUSALEM));
      expect(result?.offSeason).toBe(true);
      const day = result!.day;
      expect(day.getMonth()).toBe(months.ELUL);
      expect(day.getFullYear()).toBe(5787);
      expect(hasOn('selichot', nusach, JERUSALEM, day)).toBe(true);
      expect(hasOn('selichot', nusach, JERUSALEM, day.prev())).toBe(false);
    },
  );

  it('opens Selichot for Edot HaMizrach before Leil Selichot of Ashkenaz', () => {
    installSelichotFixture();
    const today = hdate(1, months.AV, 5787);
    const edot = standaloneReadingDay('selichot', 'edot_hamizrach', today, false, placeOf(JERUSALEM))!;
    const ashkenaz = standaloneReadingDay('selichot', 'ashkenaz', today, false, placeOf(JERUSALEM))!;
    expect(edot.day.abs()).toBeLessThan(ashkenaz.day.abs());
  });

  it('skips the last night of a Kiddush Levana period once its end has passed, to a night of the next period', () => {
    const place = placeOf(JERUSALEM);
    const nusach: Nusach = 'ashkenaz';
    const months5787 = Array.from({ length: 12 }, (_, index) => new HDate(15, months.CHESHVAN, 5787).add(29 * index));
    const found = months5787
      .map((month) => {
        const { end } = kiddushLevanaPeriod(month, nusach, JERUSALEM);
        const after = new Date(end.getTime() + MINUTE);
        return { end, after, last: standaloneTextDay('kiddush_levana', after, JERUSALEM) };
      })
      .find(
        ({ after, last }) =>
          standalonePeriodEnded('kiddush_levana', nusach, after, JERUSALEM) &&
          hasOn('kiddush_levana', nusach, JERUSALEM, last),
      );
    expect(found).toBeDefined();
    const { end, last } = found!;
    expect(standaloneReadingDay('kiddush_levana', nusach, last, false, place)).toEqual({ day: last, offSeason: false });
    const next = standaloneReadingDay('kiddush_levana', nusach, last, true, place)!;
    expect(next.offSeason).toBe(true);
    expect(next.day.abs()).toBeGreaterThan(last.abs());
    expect(hasOn('kiddush_levana', nusach, JERUSALEM, next.day)).toBe(true);
    expect(kiddushLevanaPeriod(next.day, nusach, JERUSALEM).start.getTime()).toBeGreaterThan(end.getTime());
  });

  it('finds no day for Selichot without an installed file, and none for Ushpizin in Chabad', () => {
    expect(reading('selichot', 'ashkenaz', JERUSALEM, hdate(1, months.AV, 5787))).toBeNull();
    expect(reading('ushpizin', 'chabad', JERUSALEM, hdate(1, months.CHESHVAN, 5787))).toBeNull();
  });
});

describe('nextMitzvahTextWindow', () => {
  const OMER = findMitzvah('sefirat_haomer')!;
  const SHACHARIT = findMitzvah('shacharit')!;
  const settings = settingsFor('ashkenaz', JERUSALEM);
  const place = placeOf(JERUSALEM);
  const windowFor = (mitzvah: Mitzvah, now: Date) =>
    nextMitzvahTextWindow(mitzvah, 'ashkenaz', JERUSALEM, settings, place, now);

  it('opens the Omer on the civil day of 15 Nisan, whose evening opens the first count, from 1 Tammuz', () => {
    const now = at(JERUSALEM, `${isoOf(hdate(1, months.TAMUZ, 5787))}T12:00`);
    const window = windowFor(OMER, now)!;
    expect(window.date.getTime()).toBe(hdate(15, months.NISAN, 5788).greg().getTime());
    expect(window.end.getTime()).toBeGreaterThan(now.getTime());
    expect(hasSiddurText(OMER, 'ashkenaz', window.date, place)).toBe(true);
  });

  it('is the current window inside the Omer', () => {
    const now = at(JERUSALEM, `${isoOf(hdate(10, months.IYYAR, 5787))}T12:00`);
    const window = windowFor(OMER, now)!;
    expect(window).toEqual(currentOrNextWindow(OMER, JERUSALEM, settings, now));
    expect(window.date.getTime()).toBe(appDay(now, JERUSALEM).getTime());
  });

  it("is today's window for a weekday service on a weekday", () => {
    const now = at(JERUSALEM, '2026-10-28T08:00');
    const window = windowFor(SHACHARIT, now)!;
    expect(window.date.getTime()).toBe(new Date(2026, 9, 28).getTime());
    expect(window.end.getTime()).toBeGreaterThan(now.getTime());
  });

  it('skips a Shabbat for a weekday service, to the next weekday', () => {
    const now = at(JERUSALEM, '2026-10-31T08:00');
    expect(windowFor(SHACHARIT, now)!.date.getTime()).toBe(new Date(2026, 10, 1).getTime());
  });

  const windowIn = (mitzvah: Mitzvah, nusach: Nusach, now: Date) =>
    nextMitzvahTextWindow(mitzvah, nusach, JERUSALEM, settingsFor(nusach, JERUSALEM), place, now);
  const civilDay = (day: HDate) => day.greg().getTime();

  it('is the window still open in the middle of a Kiddush Levana period, as currentOrNextWindow finds it', () => {
    const levana = findMitzvah('kiddush_levana')!;
    const { start, end } = kiddushLevanaPeriod(hdate(15, months.CHESHVAN, 5787), 'ashkenaz', JERUSALEM);
    const now = new Date(start.getTime() + 5 * DAY);
    const open = windowFor(levana, now)!;
    expect(open).toEqual(currentOrNextWindow(levana, JERUSALEM, settings, now));
    expect(open.date.getTime()).toBeLessThan(appDay(now, JERUSALEM).getTime());
    expect(open.start.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(open.end.getTime()).toBeGreaterThan(now.getTime());
    const after = new Date(end.getTime() + 12 * 60 * MINUTE);
    const next = windowFor(levana, after)!;
    expect(next.date.getTime()).toBeGreaterThan(open.date.getTime());
    expect(next.start.getTime()).toBeGreaterThan(after.getTime());
  });

  it('opens the Chanukah candles on the civil day of 24 Kislev, whose evening is the first night, from Tammuz', () => {
    const now = at(JERUSALEM, `${isoOf(hdate(1, months.TAMUZ, 5787))}T12:00`);
    const window = windowIn(findMitzvah('chanukah_candles')!, 'ashkenaz', now)!;
    expect(window.date.getTime()).toBe(civilDay(hdate(24, months.KISLEV, 5788)));
    expect(window.end.getTime()).toBeGreaterThan(now.getTime());
  });

  it('opens Ushpizin of Sefard on the first night of the next Sukkot from Cheshvan', () => {
    const now = at(JERUSALEM, `${isoOf(hdate(1, months.CHESHVAN, 5787))}T12:00`);
    const window = windowIn(findMitzvah('ushpizin')!, 'sefard', now)!;
    expect(window.date.getTime()).toBe(civilDay(hdate(14, months.TISHREI, 5788)));
  });

  it('opens Selichot on the first window of the next season, with the file installed', () => {
    installSelichotFixture();
    const today = hdate(1, months.AV, 5787);
    const now = at(JERUSALEM, `${isoOf(today)}T12:00`);
    const firstDay = standaloneReadingDay('selichot', 'ashkenaz', today, false, place)!.day;
    const window = windowIn(findMitzvah('selichot')!, 'ashkenaz', now)!;
    expect(window.date.getTime()).toBe(civilDay(firstDay.prev()));
    expect(window.end.getTime()).toBeGreaterThan(now.getTime());
  });

  it('finds no Selichot window without the installed file', () => {
    const now = at(JERUSALEM, `${isoOf(hdate(1, months.AV, 5787))}T12:00`);
    expect(windowIn(findMitzvah('selichot')!, 'ashkenaz', now)).toBeNull();
  });

  it('is null for a custom mitzvah and for Chok LeYisrael', () => {
    const now = at(JERUSALEM, '2026-10-28T08:00');
    expect(windowFor({ ...SHACHARIT, id: 'custom_1_a', isCustom: true }, now)).toBeNull();
    expect(windowFor(findMitzvah('chok_leyisrael')!, now)).toBeNull();
  });
});
