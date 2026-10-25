import { DateTime } from 'luxon';
import { CITIES } from '@/data/cities';
import { findMitzvah } from '@/data/mitzvot';
import {
  MITZVAH_STANDALONE_TEXT,
  selichotOfferOn,
  selichotSeason,
  siddurPlace,
  standaloneHoursAt,
} from '@/data/siddur';
import { HebcalService } from '@/services/HebcalService';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { installSelichotFixture } from '@/testing/selichot';
import { at, zmanimFor } from '@/testing/zmanim';
import type { Mitzvah, Nusach, UserSettings } from '@/types/mitzvah';
import type { Location } from '@/types/zmanim';
import { appDayWindow } from '@/utils/buildDayTimeline';
import { calendarDay, checkInFor } from '@/utils/checkIn';
import { judgeDay } from '@/utils/historyStats';
import { appDayKey } from '@/utils/locationDay';

const JERUSALEM = CITIES[0];
const NEW_YORK = CITIES.find((city) => city.cityId === 'new-york')!;
const NUSCHAOT: Nusach[] = ['ashkenaz', 'sefard', 'edot_hamizrach', 'chabad'];
const MINUTE = 60_000;

const settingsFor = (nusach: Nusach, inIsrael = true): UserSettings => ({
  nusach,
  halachicOpinions: { ksSofZman: 'GRA' },
  inIsrael,
});
const ASHKENAZ = settingsFor('ashkenaz');
const EDOT = settingsFor('edot_hamizrach');

const SELICHOT: Mitzvah = findMitzvah('selichot')!;

const ctxFor = (location: Location, iso: string, settings: UserSettings, clock = '12:00') => ({
  date: calendarDay(iso),
  location,
  settings,
  zmanim: zmanimFor(at(location, `${iso}T${clock}`), location),
});
const windowOn = (location: Location, iso: string, settings: UserSettings, clock?: string) =>
  SELICHOT.computeWindow(ctxFor(location, iso, settings, clock));
const daysFrom = (iso: string, count: number) =>
  Array.from({ length: count }, (_, i) => DateTime.fromISO(iso).plus({ days: i }).toISODate()!);
const windowDays = (location: Location, settings: UserSettings, from: string, count: number) =>
  daysFrom(from, count).filter((iso) => windowOn(location, iso, settings) !== null);
const zmanimOn = (location: Location, iso: string) => zmanimFor(at(location, `${iso}T12:00`), location);

const A_2025 = [
  '2025-09-13',
  '2025-09-14',
  '2025-09-15',
  '2025-09-16',
  '2025-09-17',
  '2025-09-18',
  '2025-09-20',
  '2025-09-21',
  '2025-09-24',
  '2025-09-25',
  '2025-09-27',
  '2025-09-28',
  '2025-09-29',
  '2025-09-30',
];
const E_2025 = [
  '2025-08-25',
  '2025-08-26',
  '2025-08-27',
  '2025-08-28',
  '2025-08-30',
  '2025-08-31',
  '2025-09-01',
  '2025-09-02',
  '2025-09-03',
  '2025-09-04',
  '2025-09-06',
  '2025-09-07',
  '2025-09-08',
  '2025-09-09',
  '2025-09-10',
  '2025-09-11',
  ...A_2025,
];
const A_2024 = [
  '2024-09-28',
  '2024-09-29',
  '2024-09-30',
  '2024-10-01',
  '2024-10-05',
  '2024-10-06',
  '2024-10-07',
  '2024-10-08',
  '2024-10-09',
  '2024-10-10',
];

describe('the Selichot mitzvah', () => {
  beforeEach(() => {
    installSelichotFixture();
  });

  afterEach(() => {
    useSelichotStore.getState().reset();
  });

  it('is a seasonal mitzvah of every nusach in the seasonal group, reading the Selichot text, with one reminder at its start', () => {
    expect(SELICHOT).toMatchObject({
      name: { he: 'סליחות', en: 'Selichot' },
      icon: 'shofar',
      timeType: 'annual-seasonal',
      category: 'seasonal',
      group: 'seasonal',
      skipOn: [],
      nuschaotSupported: NUSCHAOT,
    });
    expect(SELICHOT.description).toBeUndefined();
    expect(SELICHOT.defaultReminders).toEqual([
      {
        anchor: 'start',
        offsetMin: 0,
        label: 'זמן אמירת סליחות',
        bodyVariants: ['זמן אמירת סליחות', 'הגיע הזמן לומר סליחות', 'סליחות לפני תפילת שחרית'],
      },
    ]);
    expect(MITZVAH_STANDALONE_TEXT.selichot).toBe('selichot');
  });

  it.each([
    ['ashkenaz', A_2025],
    ['sefard', A_2025],
    ['chabad', A_2025],
    ['edot_hamizrach', E_2025],
  ])('%s keeps the 2025 nights, none into Shabbat or Yom Tov', (nusach, expected) => {
    for (const [location, inIsrael] of [
      [JERUSALEM, true],
      [NEW_YORK, false],
    ] as const) {
      expect(windowDays(location, settingsFor(nusach as Nusach, inIsrael), '2025-08-20', 47)).toEqual(expected);
    }
  });

  it('has no window on any season night while its nusach file is missing', () => {
    installSelichotFixture(['sefard']);
    expect(windowDays(JERUSALEM, ASHKENAZ, '2025-08-20', 47)).toEqual([]);
    expect(windowDays(JERUSALEM, settingsFor('sefard'), '2025-08-20', 47)).toEqual(A_2025);
  });

  it("the season helper names the mitzvah's first and last nights", () => {
    for (const nusach of NUSCHAOT) {
      for (const [location, inIsrael] of [
        [JERUSALEM, true],
        [NEW_YORK, false],
      ] as const) {
        const nights = windowDays(location, settingsFor(nusach, inIsrael), '2025-08-20', 47);
        expect(selichotSeason(5786, nusach, siddurPlace(location, inIsrael))).toEqual({
          year: 5786,
          first: calendarDay(nights[0]),
          last: calendarDay(nights[nights.length - 1]),
        });
        expect(nights[0]).toBe(nusach === 'edot_hamizrach' ? '2025-08-25' : '2025-09-13');
        expect(nights[nights.length - 1]).toBe('2025-09-30');
      }
    }
  });

  it('offers the download from seven days before the season through its last night', () => {
    const place = siddurPlace(JERUSALEM, true);
    const offerOn = (nusach: Nusach, iso: string) => selichotOfferOn(calendarDay(iso), nusach, place);
    expect(offerOn('ashkenaz', '2025-09-05')).toBeNull();
    expect(offerOn('ashkenaz', '2025-09-06')).toEqual({
      year: 5786,
      first: calendarDay('2025-09-13'),
      last: calendarDay('2025-09-30'),
      begun: false,
    });
    expect(offerOn('ashkenaz', '2025-09-13')).toMatchObject({ begun: true });
    expect(offerOn('ashkenaz', '2025-09-30')).toMatchObject({ begun: true });
    expect(offerOn('ashkenaz', '2025-10-01')).toBeNull();
    expect(offerOn('edot_hamizrach', '2025-08-17')).toBeNull();
    expect(offerOn('edot_hamizrach', '2025-08-18')).toEqual({
      year: 5786,
      first: calendarDay('2025-08-25'),
      last: calendarDay('2025-09-30'),
      begun: false,
    });
  });

  it('follows Rosh Hashana on a Thursday in 2024, with Tzom Gedaliah deferred past the Shabbat after it', () => {
    expect(windowDays(JERUSALEM, ASHKENAZ, '2024-09-25', 19)).toEqual(A_2024);
  });

  describe.each([
    ['Jerusalem', JERUSALEM, true],
    ['New York', NEW_YORK, false],
  ] as const)('in %s', (_name, location, inIsrael) => {
    it.each([
      ...(['ashkenaz', 'sefard', 'chabad'] as const).flatMap((nusach) => [
        [`${nusach} first, motzaei Shabbat of Leil Selichot`, nusach, '2025-09-13', '2025-09-14'],
        [`${nusach} last`, nusach, '2025-09-30', '2025-10-01'],
      ]),
      ['edot first, the night of 2 Elul', 'edot_hamizrach', '2025-08-25', '2025-08-26'],
      ['edot last', 'edot_hamizrach', '2025-09-30', '2025-10-01'],
    ])(
      "%s runs from chatzot halayla to the next morning's end of the time for Shacharit",
      (_label, nusach, day, next) => {
        expect(windowOn(location, day, settingsFor(nusach as Nusach, inIsrael))).toEqual({
          start: zmanimOn(location, day).chatzotLayla,
          end: zmanimOn(location, next).sofZmanTfilaGra,
        });
      },
    );

    it.each(NUSCHAOT)(
      "%s: at chatzot halayla the siddur tab offers Selichot on exactly the mitzvah's nights, with the same hours",
      (nusach) => {
        const settings = settingsFor(nusach, inIsrael);
        const nights = daysFrom('2025-08-20', 47).filter((iso) => {
          const instant = new Date(zmanimOn(location, iso).chatzotLayla.getTime() + MINUTE);
          const offered = standaloneHoursAt('selichot', nusach, instant, location, siddurPlace(location, inIsrael));
          expect(offered).toEqual(windowOn(location, iso, settings));
          return offered !== null;
        });
        expect(nights).toEqual(nusach === 'edot_hamizrach' ? E_2025 : A_2025);
      },
    );
  });

  it('has no window on the night that opens Shabbat, and opens after the exit on motzaei Shabbat', () => {
    const block = HebcalService.holyBlockOn(at(JERUSALEM, '2025-09-20T12:00'), JERUSALEM)!;
    for (const nusach of NUSCHAOT) {
      const settings = settingsFor(nusach);
      expect(windowOn(JERUSALEM, '2025-09-19', settings)).toBeNull();
      expect(windowOn(JERUSALEM, '2025-09-20', settings)!.start.getTime()).toBeGreaterThan(block.end.getTime());
    }
    expect(windowOn(JERUSALEM, '2025-08-29', EDOT)).toBeNull();
  });

  it('depends only on the day, not on the clock time of ctx.date', () => {
    const noon = windowOn(JERUSALEM, '2025-09-15', ASHKENAZ, '12:00');
    expect(noon).not.toBeNull();
    expect(windowOn(JERUSALEM, '2025-09-15', ASHKENAZ, '00:30')).toEqual(noon);
    expect(windowOn(JERUSALEM, '2025-09-15', ASHKENAZ, '23:30')).toEqual(noon);
  });

  it('stays on home past alot until the end of the time for Shacharit, under the day whose night opened it', () => {
    const w = windowOn(JERUSALEM, '2025-09-15', ASHKENAZ)!;
    expect(appDayWindow(SELICHOT, JERUSALEM, ASHKENAZ, new Date(w.start.getTime() + MINUTE))).toMatchObject({
      start: w.start,
      end: w.end,
      date: calendarDay('2025-09-15'),
    });
    const late = new Date(w.end.getTime() - MINUTE);
    expect(appDayKey(late, JERUSALEM)).toBe('2025-09-16');
    expect(appDayWindow(SELICHOT, JERUSALEM, ASHKENAZ, late)!.date).toEqual(calendarDay('2025-09-15'));
    expect(appDayWindow(SELICHOT, JERUSALEM, ASHKENAZ, new Date(w.end.getTime() + MINUTE))).toMatchObject({
      start: windowOn(JERUSALEM, '2025-09-16', ASHKENAZ)!.start,
      date: calendarDay('2025-09-16'),
    });
  });

  it('is open in history until its end, then missed, and done when marked', () => {
    const w = windowOn(JERUSALEM, '2025-09-15', ASHKENAZ)!;
    const input = { mitzvot: [SELICHOT], completions: {}, location: JERUSALEM, settings: ASHKENAZ };
    const day = calendarDay('2025-09-15');
    expect(judgeDay(day, input, new Date(w.end.getTime() - MINUTE)).pending).toEqual(['selichot']);
    expect(judgeDay(day, input, new Date(w.end.getTime() + MINUTE)).missed).toEqual(['selichot']);
    const marked = { ...input, completions: { '2025-09-15': { selichot: 1 } } };
    expect(judgeDay(day, marked, new Date(w.end.getTime() + MINUTE)).done).toEqual(['selichot']);
  });

  it('never waits in a check-in', () => {
    for (const noon of ['2025-09-20T12:00', '2025-09-24T12:00', '2024-10-05T12:00']) {
      const block = HebcalService.holyBlockAt(at(JERUSALEM, noon), JERUSALEM)!;
      for (const settings of [ASHKENAZ, EDOT]) {
        const input = { mitzvot: [SELICHOT], completions: {}, checkIns: {}, location: JERUSALEM, settings };
        expect(checkInFor(block, input, new Date(block.end.getTime() + MINUTE))).toBeNull();
        const opens = windowOn(JERUSALEM, block.days[block.days.length - 1], settings)!.start;
        expect(opens.getTime()).toBeGreaterThan(block.end.getTime());
      }
    }
  });
});
