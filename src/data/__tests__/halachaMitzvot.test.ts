jest.mock('@/services/notifications/ids', () => ({
  ...jest.requireActual('@/services/notifications/ids'),
  HORIZON_MAX_DAYS: 2,
}));
jest.mock('@/services/notifications/planners/horizonEnd', () => ({ planHorizonEnd: () => [] }));
jest.mock('@/services/halachaFiles', () => ({
  ...jest.requireActual('@/services/halachaFiles'),
  readHalachaScheduleSync: (pack: 'kitzur' | 'ben_ish_chai' | 'rambam' | 'chafetz_chaim') =>
    require('@/testing/halacha').publishedHalachaSchedule(pack),
}));

import { HDate, months } from '@hebcal/core';
import { DateTime } from 'luxon';
import { setLocale } from '@/i18n';
import { CITIES } from '@/data/cities';
import { HALACHA_YOMIT, HILCHOT_HACHAG, LASHON_HARA, MITZVOT, findMitzvah } from '@/data/mitzvot';
import { rulesFor } from '@/data/taharahPresets';
import { HebcalService } from '@/services/HebcalService';
import { buildPlan } from '@/services/notifications/plan';
import type { PlanInput } from '@/services/notifications/types';
import { DEFAULT_ON_MITZVOT } from '@/stores/useMitzvotStore';
import { resetHalachaStores } from '@/stores/useHalachaStore';
import { DEFAULT_HILULA_NOTICES, DEFAULT_ROSH_CHODESH_NOTICES, useUserStore } from '@/stores/useUserStore';
import { installHalachaFixture, publishedHalachaManifest } from '@/testing/halacha';
import { messageOf } from '@/testing/notifications';
import { at, zmanimFor } from '@/testing/zmanim';
import type { Mitzvah, UserSettings } from '@/types/mitzvah';
import type { Location } from '@/types/zmanim';
import { checkInFor } from '@/utils/checkIn';
import { festivalDays } from '@/utils/halacha';
import { performMinOf, nagZoneKindOf, nagVerbKey } from '@/utils/nagging';

const JERUSALEM = CITIES[0];
const NEW_YORK = CITIES.find((city) => city.cityId === 'new-york')!;
const ASHKENAZ: UserSettings = { nusach: 'ashkenaz', halachicOpinions: { ksSofZman: 'GRA' }, inIsrael: true };
const KITZUR = publishedHalachaManifest('kitzur');
const CHAFETZ_CHAIM = publishedHalachaManifest('chafetz_chaim');

const day = (iso: string) => {
  const [year, month, date] = iso.split('-').map(Number);
  return new Date(year, month - 1, date);
};
const isoOf = (date: Date) => DateTime.fromJSDate(date).toISODate()!;
// A calendar day `days` away, by Hebrew day number, so a DST change in the device's zone cannot move it.
const shift = (date: Date, days: number) => isoOf(new HDate(new HDate(date).abs() + days).greg());
const clock = (instant: Date, location: Location) =>
  DateTime.fromJSDate(instant).setZone(location.tz).toFormat('yyyy-MM-dd HH:mm');
const ctxFor = (location: Location, iso: string, settings: UserSettings) => ({
  date: day(iso),
  location,
  settings,
  zmanim: zmanimFor(at(location, `${iso}T12:00`), location),
});
const windowOn = (mitzvah: Mitzvah, iso: string, settings = ASHKENAZ, location: Location = JERUSALEM) =>
  mitzvah.computeWindow(ctxFor(location, iso, settings));
const paramsOn = (mitzvah: Mitzvah, iso: string, settings = ASHKENAZ) =>
  mitzvah.bodyParams!(ctxFor(JERUSALEM, iso, settings));

function planInput(overrides: Partial<PlanInput> = {}): PlanInput {
  const now = overrides.now ?? at(JERUSALEM, '2026-12-17T04:00');
  return {
    now,
    fromDate: now,
    platform: 'android',
    hasPermission: true,
    language: 'he',
    location: JERUSALEM,
    settings: ASHKENAZ,
    mitzvot: [HALACHA_YOMIT],
    reminderOverrides: {},
    completions: {},
    skipped: {},
    checkIns: {},
    enabledSince: {},
    hilulotEnabled: false,
    roshChodeshEnabled: false,
    hilulaNotices: DEFAULT_HILULA_NOTICES,
    roshChodeshNotices: DEFAULT_ROSH_CHODESH_NOTICES,
    weeklyReportEnabled: false,
    taharahEnabled: false,
    taharah: {
      events: [],
      settings: { preset: 'ashkenaz', rules: rulesFor('ashkenaz'), role: 'woman' },
      discreet: true,
      leads: { hefsekLeadMin: 90, bedikaEveningLeadMin: 60, tevilaPrepLeadMin: 180 },
    },
    ...overrides,
  };
}

const reminders = (input: PlanInput, id: string) =>
  buildPlan(input).filter((candidate) => candidate.id.startsWith(`${id}__`) && !candidate.data.nag);

beforeEach(() => {
  resetHalachaStores();
  useUserStore.getState().reset();
});

afterEach(() => setLocale('he'));

describe('the two registry entries', () => {
  it('sit between Kiddush Levana and Shnayim Mikra, learning mitzvot of every nusach, off by default', () => {
    const ids = MITZVOT.map((mitzvah) => mitzvah.id);
    expect(ids.slice(ids.indexOf('kiddush_levana'), ids.indexOf('kiddush_levana') + 5)).toEqual([
      'kiddush_levana',
      'halacha_yomit',
      'hilchot_hachag',
      'lashon_hara',
      'shnayim_mikra',
    ]);
    for (const mitzvah of [HALACHA_YOMIT, HILCHOT_HACHAG]) {
      expect(findMitzvah(mitzvah.id)).toBe(mitzvah);
      expect(mitzvah).toMatchObject({ category: 'learning', group: 'other', icon: 'chok', skipOn: [] });
      expect(mitzvah.nuschaotSupported).toHaveLength(5);
      expect(DEFAULT_ON_MITZVOT).not.toContain(mitzvah.id);
      expect(performMinOf(mitzvah)).toEqual({ alone: 10 });
      expect(nagZoneKindOf(mitzvah.id)).toBe('learning');
      expect(nagVerbKey(mitzvah.id)).toBe(`nag.verb.${mitzvah.id}`);
    }
  });

  it('remind once, the daily halacha at 08:00 and the festival at 19:00, each with three bodies', () => {
    expect(HALACHA_YOMIT.defaultReminders).toEqual([
      expect.objectContaining({ anchor: 'clock', offsetMin: 8 * 60, label: 'זמן ההלכה היומית' }),
    ]);
    expect(HILCHOT_HACHAG.defaultReminders).toEqual([
      expect.objectContaining({ anchor: 'clock', offsetMin: 19 * 60, label: 'זמן הלכות החג' }),
    ]);
    for (const mitzvah of [HALACHA_YOMIT, HILCHOT_HACHAG]) {
      expect(mitzvah.defaultReminders[0].bodyVariants).toHaveLength(3);
    }
  });
});

describe('the daily halacha', () => {
  it("has no window while the user's track is not installed, another track's install included", () => {
    expect(windowOn(HALACHA_YOMIT, '2026-12-17')).toBeNull();
    installHalachaFixture('rambam');
    expect(windowOn(HALACHA_YOMIT, '2026-12-17')).toBeNull();
    expect(windowOn(HALACHA_YOMIT, '2026-12-17', { ...ASHKENAZ, nusach: 'chabad' })).not.toBeNull();
  });

  it('runs from alot to the next alot on a weekday and on Shabbat', () => {
    installHalachaFixture('kitzur');
    for (const iso of ['2026-12-17', '2026-12-19']) {
      const window = windowOn(HALACHA_YOMIT, iso)!;
      const zmanim = zmanimFor(at(JERUSALEM, `${iso}T12:00`), JERUSALEM);
      expect(window.start).toEqual(zmanim.alotHaShachar);
      expect(clock(window.end, JERUSALEM).slice(0, 10)).toBe(shift(day(iso), 1));
    }
    expect(windowOn(HALACHA_YOMIT, '2026-12-19', ASHKENAZ, NEW_YORK)).not.toBeNull();
  });

  it('has none on a day the luach reads nothing: 30 Cheshvan 5787 (2026-11-10)', () => {
    installHalachaFixture('kitzur');
    expect(windowOn(HALACHA_YOMIT, '2026-11-10')).toBeNull();
    expect(windowOn(HALACHA_YOMIT, '2026-11-11')).not.toBeNull();
  });

  it("follows the user's track over the nusach's", () => {
    installHalachaFixture('rambam');
    useUserStore.getState().setHalachaTrack('rambam');
    expect(paramsOn(HALACHA_YOMIT, '2026-11-10')).toEqual({
      portion: {
        he: 'משנה תורה לרמב״ם, הלכות איסורי ביאה, פרק כב',
        en: "Rambam's Mishneh Torah, Forbidden Intercourse, chapter 22",
      },
    });
  });

  it("names the day's portion in the reminder's body, in Hebrew and in English", () => {
    installHalachaFixture('kitzur');
    const label = KITZUR.schedule.kind === 'hebrew' ? KITZUR.schedule.months.Tevet[6]!.label : null;
    expect(paramsOn(HALACHA_YOMIT, '2026-12-17')).toEqual({
      portion: { he: `קיצור שולחן ערוך, ${label!.he}`, en: `Kitzur Shulchan Aruch, ${label!.en}` },
    });
    const [he] = reminders(planInput(), 'halacha_yomit');
    expect(messageOf(he)).toContain(`קיצור שולחן ערוך, ${label!.he}`);
    setLocale('en');
    const [en] = reminders(planInput({ language: 'en' }), 'halacha_yomit');
    expect(messageOf(en)).toBe(`Time for Daily Halacha: Kitzur Shulchan Aruch, ${label!.en}`);
  });

  it('plans its 08:00 reminder on weekdays and none inside Shabbat', () => {
    installHalachaFixture('kitzur');
    expect(reminders(planInput(), 'halacha_yomit').map((c) => [c.id, clock(c.trigger, JERUSALEM)])).toEqual([
      ['halacha_yomit__2026-12-17__0', '2026-12-17 08:00'],
      ['halacha_yomit__2026-12-18__0', '2026-12-18 08:00'],
      ['halacha_yomit__2026-12-20__0', '2026-12-20 08:00'],
    ]);
  });

  it("asks about Friday's and Shabbat's portions in the check-in after Shabbat", () => {
    installHalachaFixture('kitzur');
    const block = HebcalService.holyBlockOn(at(JERUSALEM, '2026-12-19T12:00'), JERUSALEM)!;
    const checkIn = checkInFor(
      block,
      { mitzvot: [HALACHA_YOMIT], completions: {}, checkIns: {}, location: JERUSALEM, settings: ASHKENAZ },
      block.end,
    )!;
    expect(checkIn.days.map((entry) => [entry.key, entry.items.map((item) => item.mitzvah.id)])).toEqual([
      ['2026-12-18', ['halacha_yomit']],
      ['2026-12-19', ['halacha_yomit']],
    ]);
  });

  it('asks about both days of a two-day Yom Tov abroad', () => {
    installHalachaFixture('kitzur');
    const ABROAD = { ...ASHKENAZ, inIsrael: false };
    const shavuot = festivalDays(5787).shavuot.greg();
    const block = HebcalService.holyBlockOn(at(NEW_YORK, `${isoOf(shavuot)}T12:00`), NEW_YORK)!;
    const checkIn = checkInFor(
      block,
      { mitzvot: [HALACHA_YOMIT], completions: {}, checkIns: {}, location: NEW_YORK, settings: ABROAD },
      block.end,
    )!;
    const keys = checkIn.days.map((entry) => entry.key);
    expect(keys).toContain(isoOf(shavuot));
    expect(keys).toContain(shift(shavuot, 1));
  });
});

describe('the halachot of the festival', () => {
  const pesach = festivalDays(5787).pesach.greg();
  const before = (days: number) => shift(pesach, -days);

  it("has a window on each day of a period the user's track covers, and none outside it", () => {
    installHalachaFixture('kitzur');
    // Shavuot's period overlaps no other; Pesach's begins on Purim, whose own period runs before it.
    const shavuot = festivalDays(5787).shavuot.greg();
    const ahead = (days: number) => shift(shavuot, -days);
    expect(windowOn(HILCHOT_HACHAG, ahead(31))).toBeNull();
    expect(windowOn(HILCHOT_HACHAG, ahead(30))).not.toBeNull();
    expect(windowOn(HILCHOT_HACHAG, ahead(1))).not.toBeNull();
    expect(windowOn(HILCHOT_HACHAG, isoOf(shavuot))).toBeNull();
    expect(windowOn(HILCHOT_HACHAG, before(1))).not.toBeNull();
    expect(windowOn(HILCHOT_HACHAG, isoOf(pesach))).toBeNull();
  });

  it('names the festival and the days left, tomorrow on the erev', () => {
    installHalachaFixture('kitzur');
    expect(paramsOn(HILCHOT_HACHAG, before(30))).toEqual({
      chag: { he: 'פסח', en: 'Pesach' },
      when: { he: 'בעוד 30 ימים', en: 'in 30 days' },
    });
    expect(paramsOn(HILCHOT_HACHAG, before(1))).toEqual({
      chag: { he: 'פסח', en: 'Pesach' },
      when: { he: 'מחר', en: 'tomorrow' },
    });
  });

  it('names the nearer festival of an overlap: Rosh Hashanah before Sukkot in Elul', () => {
    installHalachaFixture('kitzur');
    const roshHashanah = festivalDays(5787).rosh_hashanah.greg();
    const iso = shift(roshHashanah, -10);
    expect(paramsOn(HILCHOT_HACHAG, iso)).toMatchObject({ chag: { he: 'ראש השנה' } });
  });

  it('has no window before a minor fast in Ben Ish Chai, which has no halachot of it', () => {
    installHalachaFixture('ben_ish_chai');
    const edot = { ...ASHKENAZ, nusach: 'edot_hamizrach' as const };
    const fast = festivalDays(5787).asara_betevet.greg();
    expect(windowOn(HILCHOT_HACHAG, shift(fast, -1), edot)).toBeNull();
    installHalachaFixture('kitzur');
    expect(windowOn(HILCHOT_HACHAG, shift(fast, -1))).not.toBeNull();
  });

  it('plans its 19:00 reminder with the festival in the body', () => {
    installHalachaFixture('kitzur');
    const now = at(JERUSALEM, `${before(10)}T04:00`);
    const [first] = reminders(planInput({ now, mitzvot: [HILCHOT_HACHAG] }), 'hilchot_hachag');
    expect(clock(first.trigger, JERUSALEM)).toBe(`${before(10)} 19:00`);
    expect(messageOf(first)).toContain('פסח');
    setLocale('en');
    const [en] = reminders(planInput({ now, mitzvot: [HILCHOT_HACHAG], language: 'en' }), 'hilchot_hachag');
    expect(messageOf(en)).toBe('Time for Halachot of the Festival: Pesach, in 10 days');
  });
});

describe('the laws of lashon hara', () => {
  const portionOf = (iso: string) => {
    const hd = new HDate(day(iso));
    const table = CHAFETZ_CHAIM.schedule.kind === 'hebrewYear' ? CHAFETZ_CHAIM.schedule : null;
    return (hd.isLeapYear() ? table!.leap : table!.common)[hd.getMonthName()][hd.getDate() - 1]!;
  };

  it('is a learning mitzvah of every nusach after the halachot of the festival, off by default', () => {
    expect(findMitzvah('lashon_hara')).toBe(LASHON_HARA);
    expect(LASHON_HARA).toMatchObject({ category: 'learning', group: 'other', icon: 'chok', skipOn: [] });
    expect(LASHON_HARA.nuschaotSupported).toHaveLength(5);
    expect(DEFAULT_ON_MITZVOT).not.toContain('lashon_hara');
    expect(performMinOf(LASHON_HARA)).toEqual({ alone: 5 });
    expect(nagZoneKindOf('lashon_hara')).toBe('learning');
    expect(nagVerbKey('lashon_hara')).toBe('nag.verb.lashon_hara');
    const [reminder] = LASHON_HARA.defaultReminders;
    expect(LASHON_HARA.defaultReminders).toHaveLength(1);
    expect(reminder).toMatchObject({ anchor: 'clock', offsetMin: 13 * 60 });
    expect(reminder.bodyVariants).toHaveLength(3);
  });

  it('has no window until the Chofetz Chaim is installed, whatever track is', () => {
    installHalachaFixture('kitzur');
    expect(windowOn(LASHON_HARA, '2026-12-17')).toBeNull();
    installHalachaFixture('chafetz_chaim');
    expect(windowOn(LASHON_HARA, '2026-12-17')).not.toBeNull();
  });

  it('runs from alot to the next alot every day, Shabbat and 30 Cheshvan included, for every nusach', () => {
    installHalachaFixture('chafetz_chaim');
    for (const iso of ['2026-11-10', '2026-12-17', '2026-12-19']) {
      const window = windowOn(LASHON_HARA, iso)!;
      expect(window.start).toEqual(zmanimFor(at(JERUSALEM, `${iso}T12:00`), JERUSALEM).alotHaShachar);
      expect(clock(window.end, JERUSALEM).slice(0, 10)).toBe(shift(day(iso), 1));
    }
    const chabad = { ...ASHKENAZ, nusach: 'chabad' as const };
    expect(paramsOn(LASHON_HARA, '2026-12-17', chabad)).toEqual(paramsOn(LASHON_HARA, '2026-12-17'));
  });

  it("names the day's portion of the leap-year table in 5787, in Hebrew and in English", () => {
    installHalachaFixture('chafetz_chaim');
    expect(new HDate(day('2026-12-17')).isLeapYear()).toBe(true);
    const { label } = portionOf('2026-12-17');
    expect(paramsOn(LASHON_HARA, '2026-12-17')).toEqual({
      portion: { he: `ספר חפץ חיים, ${label.he}`, en: `Sefer Chofetz Chaim, ${label.en}` },
    });
  });

  it("reads the 30th's portion too on the 29th of a short Kislev", () => {
    installHalachaFixture('chafetz_chaim');
    const year = [5786, 5787, 5788, 5789, 5790].find((y) => HDate.daysInMonth(months.KISLEV, y) === 29)!;
    const iso = isoOf(new HDate(29, months.KISLEV, year).greg());
    const table = CHAFETZ_CHAIM.schedule.kind === 'hebrewYear' ? CHAFETZ_CHAIM.schedule : null;
    const list = (HDate.isLeapYear(year) ? table!.leap : table!.common).Kislev;
    expect(paramsOn(LASHON_HARA, iso)).toEqual({
      portion: {
        he: `ספר חפץ חיים, ${list[28]!.label.he}; ${list[29]!.label.he}`,
        en: `Sefer Chofetz Chaim, ${list[28]!.label.en}; ${list[29]!.label.en}`,
      },
    });
  });

  it('plans its 13:00 reminder with the portion in the body, and none inside Shabbat', () => {
    installHalachaFixture('chafetz_chaim');
    const input = planInput({ mitzvot: [LASHON_HARA] });
    expect(reminders(input, 'lashon_hara').map((c) => [c.id, clock(c.trigger, JERUSALEM)])).toEqual([
      ['lashon_hara__2026-12-17__0', '2026-12-17 13:00'],
      ['lashon_hara__2026-12-18__0', '2026-12-18 13:00'],
      ['lashon_hara__2026-12-20__0', '2026-12-20 13:00'],
    ]);
    setLocale('en');
    const [en] = reminders(planInput({ mitzvot: [LASHON_HARA], language: 'en' }), 'lashon_hara');
    expect(messageOf(en)).toBe(
      `Time for Laws of Lashon Hara: Sefer Chofetz Chaim, ${portionOf('2026-12-17').label.en}`,
    );
  });
});
