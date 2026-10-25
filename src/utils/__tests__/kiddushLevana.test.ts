import { HDate, months } from '@hebcal/core';
import { JewishCalendar } from 'kosher-zmanim';
import { CITIES, findCityById } from '@/data/cities';
import { HebcalService } from '@/services/HebcalService';
import { at, zmanimFor } from '@/testing/zmanim';
import type { Nusach } from '@/types/mitzvah';
import type { Place } from '@/types/siddur';
import type { Location } from '@/types/zmanim';
import {
  KIDDUSH_LEVANA_FLAGS,
  dayFeatures,
  kiddushLevanaFirstNight,
  kiddushLevanaNightOpen,
  kiddushLevanaPeriod,
  moladOf,
} from '@/utils/siddur';

const JERUSALEM = CITIES[0];
const LOS_ANGELES = findCityById('los-angeles')!;
const NUSCHAOT: Nusach[] = ['ashkenaz', 'sefard', 'edot_hamizrach', 'chabad'];
const placeJ: Place = { inIsrael: true, jerusalem: true, location: JERUSALEM };

const nightfallOn = (location: Location, iso: string) =>
  HebcalService.nightfall(zmanimFor(at(location, `${iso}T12:00`), location), location);
const blockEndOn = (location: Location, iso: string) =>
  HebcalService.holyBlockOn(at(location, `${iso}T12:00`), location)!.end;
const iso = (instant: Date) => instant.toISOString();
const periodOf = (month: HDate, nusach: Nusach, location: Location) => {
  const { start, end } = kiddushLevanaPeriod(month, nusach, location);
  return { start: iso(start), end: iso(end) };
};

describe('moladOf', () => {
  it('reads the molad of Av 5786, Tishrei 5787 and Cheshvan 5787 as published, on Jerusalem mean time', () => {
    expect(iso(moladOf(new HDate(1, months.AV, 5786)))).toBe('2026-07-14T17:10:00.171Z');
    expect(iso(moladOf(new HDate(1, months.TISHREI, 5787)))).toBe('2026-09-11T18:38:06.837Z');
    expect(iso(moladOf(new HDate(1, months.CHESHVAN, 5787)))).toBe('2026-10-11T07:22:10.171Z');
    expect(iso(moladOf(new HDate(17, months.CHESHVAN, 5787)))).toBe('2026-10-11T07:22:10.171Z');
  });

  it("agrees with kosher-zmanim's molad for every month of 5780-5800", () => {
    let checked = 0;
    for (let year = 5780; year <= 5800; year++) {
      const monthCount = HDate.isLeapYear(year) ? 13 : 12;
      for (let month = 1; month <= monthCount; month++) {
        const published = new JewishCalendar(year, month, 1).getMoladAsDate().toMillis();
        expect(Math.abs(moladOf(new HDate(1, month, year)).getTime() - published)).toBeLessThanOrEqual(1);
        checked++;
      }
    }
    expect(checked).toBe(21 * 12 + 7);
  });
});

describe('kiddushLevanaPeriod', () => {
  it.each([
    ['Jerusalem', JERUSALEM],
    ['Los Angeles', LOS_ANGELES],
  ])("sets each nusach's period from the molad in Cheshvan 5787, in %s", (_name, location) => {
    const month = new HDate(1, months.CHESHVAN, 5787);
    const toMidMonth = '2026-10-26T01:44:10.171Z';
    expect(periodOf(month, 'ashkenaz', location)).toEqual({ start: '2026-10-14T07:22:10.171Z', end: toMidMonth });
    for (const nusach of ['sefard', 'chabad'] as const) {
      expect(periodOf(month, nusach, location)).toEqual({ start: '2026-10-18T07:22:10.171Z', end: toMidMonth });
    }
    expect(periodOf(month, 'edot_hamizrach', location)).toEqual({
      start: '2026-10-18T07:22:10.171Z',
      end: '2026-10-26T07:22:10.171Z',
    });
  });

  it.each([
    ['Jerusalem', JERUSALEM],
    ['Los Angeles', LOS_ANGELES],
  ])('starts no earlier than the exit of Yom Kippur in Tishrei 5787, in %s', (_name, location) => {
    const month = new HDate(1, months.TISHREI, 5787);
    const exit = blockEndOn(location, '2026-09-21');
    expect(exit.getTime()).toBeGreaterThan(moladOf(month).getTime() + 7 * 86_400_000);
    for (const nusach of NUSCHAOT) {
      const { start, end } = kiddushLevanaPeriod(month, nusach, location);
      expect(start).toEqual(exit);
      expect(iso(end)).toBe(nusach === 'edot_hamizrach' ? '2026-09-26T18:38:06.837Z' : '2026-09-26T13:00:06.837Z');
    }
  });

  it.each([
    ['Jerusalem', JERUSALEM],
    ['Los Angeles', LOS_ANGELES],
  ])(
    "starts no earlier than the night after Tisha B'Av, deferred when the 9th is Shabbat, in %s",
    (_name, location) => {
      const av = new HDate(1, months.AV, 5786);
      for (const nusach of NUSCHAOT) {
        const { start, end } = kiddushLevanaPeriod(av, nusach, location);
        expect(start).toEqual(nightfallOn(location, '2026-07-23'));
        expect(iso(end)).toBe(nusach === 'edot_hamizrach' ? '2026-07-29T17:10:00.171Z' : '2026-07-29T11:32:00.171Z');
      }
      const deferred = new HDate(1, months.AV, 5789);
      expect(new HDate(9, months.AV, 5789).getDay()).toBe(6);
      for (const nusach of NUSCHAOT) {
        expect(kiddushLevanaPeriod(deferred, nusach, location).start).toEqual(nightfallOn(location, '2029-07-22'));
      }
    },
  );
});

describe('kiddushLevanaNightOpen', () => {
  const openNights = (nusach: Nusach, location: Location) =>
    Array.from({ length: 30 }, (_, index) => index + 1).filter((day) =>
      kiddushLevanaNightOpen(new HDate(day, months.CHESHVAN, 5787), nusach, location),
    );
  const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => from + index);

  it.each([
    ['Jerusalem', JERUSALEM],
    ['Los Angeles', LOS_ANGELES],
  ])('opens the nights whose nightfall lies in the period, in %s', (_name, location) => {
    expect(openNights('ashkenaz', location)).toEqual(range(4, 15));
    for (const nusach of ['sefard', 'edot_hamizrach', 'chabad'] as const) {
      expect(openNights(nusach, location)).toEqual(range(8, 15));
    }
  });
});

describe('kiddushLevanaFirstNight', () => {
  const first = (month: number, year: number, nusach: Nusach) =>
    kiddushLevanaFirstNight(new HDate(1, month, year), nusach, placeJ);
  const label = (hd: HDate | null) => hd && [hd.getDate(), hd.getMonth(), hd.getFullYear()];

  it('names the first night that is not a Shabbat, Yom Tov or Yom Kippur night', () => {
    expect(label(first(months.CHESHVAN, 5787, 'ashkenaz'))).toEqual([4, months.CHESHVAN, 5787]);
    expect(label(first(months.CHESHVAN, 5787, 'sefard'))).toEqual([8, months.CHESHVAN, 5787]);
    for (const nusach of NUSCHAOT) {
      expect(label(first(months.TISHREI, 5787, nusach))).toEqual([11, months.TISHREI, 5787]);
      expect(label(first(months.AV, 5786, nusach))).toEqual([10, months.AV, 5786]);
    }
    expect(label(first(months.KISLEV, 5787, 'ashkenaz'))).toEqual([5, months.KISLEV, 5787]);
  });

  it('gives the same answer from the cache and finds none without a location', () => {
    const month = new HDate(9, months.KISLEV, 5787);
    expect(label(kiddushLevanaFirstNight(month, 'ashkenaz', placeJ))).toEqual([5, months.KISLEV, 5787]);
    expect(label(kiddushLevanaFirstNight(month, 'ashkenaz', placeJ))).toEqual([5, months.KISLEV, 5787]);
    expect(kiddushLevanaFirstNight(month, 'ashkenaz', { inIsrael: true, jerusalem: true })).toBeNull();
  });
});

describe('the Kiddush Levana day flags', () => {
  const flagsOf = (hd: HDate, place: Place) =>
    Object.values(KIDDUSH_LEVANA_FLAGS).filter((flag) => dayFeatures(hd, place).flags.has(flag));

  it('are set only for a place with a location', () => {
    expect(flagsOf(new HDate(10, months.CHESHVAN, 5787), placeJ)).toEqual(Object.values(KIDDUSH_LEVANA_FLAGS));
    expect(flagsOf(new HDate(10, months.CHESHVAN, 5787), { inIsrael: true, jerusalem: true })).toEqual([]);
    expect(flagsOf(new HDate(5, months.CHESHVAN, 5787), placeJ)).toEqual(['kiddushLevanaAshkenaz']);
  });
});
