import fs from 'fs';
import path from 'path';
import { HDate, HebrewCalendar, months } from '@hebcal/core';
import { FESTIVAL_KEYS, FESTIVAL_PERIOD_DAYS, defaultHalachaTrack, effectiveHalachaTrack } from '@/data/halacha';
import { FestivalKey, HalachaManifest, HalachaPortion, HalachaTrack } from '@/types/halacha';
import { chokParashiyot } from '@/utils/chok';
import { benIshChaiYearOf, festivalDays, festivalPeriodsOn, festivalPortion, halachaPortion } from '@/utils/halacha';

// The schedules are the published add-on's (docs/halacha), so these cases read what the app downloads.
const manifest = (track: HalachaTrack): HalachaManifest =>
  JSON.parse(fs.readFileSync(path.join(__dirname, '../../../docs/halacha', track, 'manifest.json'), 'utf8'));
const kitzur = manifest('kitzur');
const rambam = manifest('rambam');
const bih = manifest('ben_ish_chai');

const hd = (day: number, month: number, year: number) => new HDate(day, month, year);
const civil = (y: number, m: number, d: number) => new HDate(new Date(y, m - 1, d));
const luach = kitzur.schedule as Extract<HalachaManifest['schedule'], { kind: 'hebrew' }>;

// Every segment a portion reads, as `<unit>#<index>`.
const read = (portion: HalachaPortion | null) =>
  (portion?.pieces ?? []).flatMap(({ u, from, to }) =>
    Array.from({ length: to - from + 1 }, (_, i) => `${u}#${from + i}`),
  );

const yearDays = (year: number) => {
  const first = hd(1, months.TISHREI, year).abs();
  const last = hd(1, months.TISHREI, year + 1).abs();
  return Array.from({ length: last - first }, (_, i) => new HDate(first + i));
};

describe('the track of a nusach', () => {
  it('maps each nusach to its book and lets a choice override it', () => {
    expect(defaultHalachaTrack('ashkenaz')).toBe('kitzur');
    expect(defaultHalachaTrack('sefard')).toBe('kitzur');
    expect(defaultHalachaTrack('edot_hamizrach')).toBe('ben_ish_chai');
    expect(defaultHalachaTrack('chabad')).toBe('rambam');
    expect(defaultHalachaTrack('teiman')).toBe('rambam');
    expect(effectiveHalachaTrack(null, 'chabad')).toBe('rambam');
    expect(effectiveHalachaTrack('kitzur', 'chabad')).toBe('kitzur');
  });
});

describe('the Kitzur luach', () => {
  it('reads a plain day and a Shabbat by Hebrew month and day', () => {
    expect(halachaPortion(hd(1, months.KISLEV, 5787), kitzur, true)).toEqual(luach.months.Kislev[0]);
    const shabbat = civil(2026, 11, 14);
    expect(shabbat.getDay()).toBe(6);
    expect(halachaPortion(shabbat, kitzur, true)).toEqual(luach.months.Kislev[shabbat.getDate() - 1]);
    expect(halachaPortion(hd(1, months.TISHREI, 5787), kitzur, true)?.label.he).toBe('סימן קלג, סעיפים טז–כא');
  });

  it('reads nothing on a long Cheshvan 30 (2026-11-10) and on 15 Elul', () => {
    expect(civil(2026, 11, 10).toString()).toBe('30 Cheshvan 5787');
    expect(halachaPortion(civil(2026, 11, 10), kitzur, true)).toBeNull();
    expect(halachaPortion(hd(15, months.ELUL, 5786), kitzur, true)).toBeNull();
  });

  it('reads the review in Adar I of a leap year and the luach Adar in Adar II', () => {
    expect(HDate.isLeapYear(5787)).toBe(true);
    expect(halachaPortion(hd(1, months.ADAR_I, 5787), kitzur, true)).toEqual(luach.leapReview[0]);
    expect(halachaPortion(hd(1, months.ADAR_I, 5787), kitzur, true)?.label.he).toBe('סימן ו, סעיפים א–ד');
    expect(halachaPortion(hd(30, months.ADAR_I, 5787), kitzur, true)).toBeNull();
    expect(halachaPortion(hd(14, months.ADAR_II, 5787), kitzur, true)).toEqual(luach.months.Adar[13]);
    expect(halachaPortion(hd(14, months.ADAR_I, 5788), kitzur, true)).toEqual(luach.months.Adar[13]);
  });

  it('reads days 29 and 30 together on the 29th of a short Kislev', () => {
    expect(HDate.daysInMonth(months.KISLEV, 5781)).toBe(29);
    const portion = halachaPortion(hd(29, months.KISLEV, 5781), kitzur, true);
    expect(read(portion)).toEqual([...read(luach.months.Kislev[28]), ...read(luach.months.Kislev[29])]);
    expect(portion?.pieces).toHaveLength(1);
    expect(portion?.label.he).toContain('; ');
  });

  it.each([5781, 5786, 5788])("reads every se'if exactly once in the common year %i", (year) => {
    const segments = yearDays(year).flatMap((day) => read(halachaPortion(day, kitzur, true)));
    expect(segments).toHaveLength(2765);
    expect(new Set(segments).size).toBe(2765);
  });

  it("reads every se'if in the leap year 5787, the review's twice", () => {
    const segments = yearDays(5787).flatMap((day) => read(halachaPortion(day, kitzur, true)));
    const review = luach.leapReview.flatMap(read);
    expect(segments).toHaveLength(2765 + review.length);
    expect(new Set(segments).size).toBe(2765);
  });
});

describe('the Daily Rambam', () => {
  it('reads Forbidden Intercourse 22 on 2026-11-10, whatever the zone', () => {
    expect(halachaPortion(civil(2026, 11, 10), rambam, true)?.label).toEqual({
      he: 'הלכות איסורי ביאה, פרק כב',
      en: 'Forbidden Intercourse, chapter 22',
    });
  });

  it('turns a cycle at its anchor, before and after', () => {
    const anchor = civil(2026, 2, 3);
    expect(halachaPortion(anchor, rambam, true)?.label.en).toBe('Transmission of the Oral Law 1–21');
    expect(halachaPortion(new HDate(anchor.abs() - 1), rambam, true)?.label.en).toBe('Kings and Wars, chapter 12');
    expect(halachaPortion(new HDate(anchor.abs() + 1016), rambam, true)?.label.en).toBe('Kings and Wars, chapter 12');
    expect(halachaPortion(new HDate(anchor.abs() + 1017), rambam, true)).toEqual(halachaPortion(anchor, rambam, true));
  });
});

describe('Ben Ish Chai by the week', () => {
  const shabbatOf = (parasha: string[], year: number, inIsrael = true) =>
    yearDays(year).find((day) => day.getDay() === 6 && chokParashiyot(day, inIsrael).join() === parasha.join())!;
  const week = (shabbat: HDate) => Array.from({ length: 7 }, (_, i) => new HDate(shabbat.abs() - 6 + i));

  it('alternates the years by the Hebrew year, an odd one the first, and swaps them on request (Q30)', () => {
    expect(benIshChaiYearOf(shabbatOf(['Tzav'], 5787))).toBe(1);
    expect(benIshChaiYearOf(shabbatOf(['Tzav'], 5786))).toBe(2);
    expect(benIshChaiYearOf(shabbatOf(['Tzav'], 5786), true)).toBe(1);
    // A week is the year of its Shabbat: the Sunday before Bereshit 5787 reads 5787's.
    const bereshit = shabbatOf(['Bereshit'], 5787);
    expect(benIshChaiYearOf(new HDate(bereshit.abs() - 6))).toBe(1);
    expect(halachaPortion(shabbatOf(['Tzav'], 5787), bih, true)?.pieces[0].u).toBe('y1-tzav');
    expect(halachaPortion(shabbatOf(['Tzav'], 5786), bih, true)?.pieces[0].u).toBe('y2-tzav');
    expect(halachaPortion(shabbatOf(['Tzav'], 5786), bih, true, true)?.pieces[0].u).toBe('y1-tzav');
  });

  it("spreads the parasha's halachot over Sunday to Shabbat, every one once, in order", () => {
    const portions = week(shabbatOf(['Tzav'], 5787)).map((day) => halachaPortion(day, bih, true));
    const all = portions.flatMap(read);
    expect(all).toEqual(Array.from({ length: bih.units['y1-tzav'].count }, (_, i) => `y1-tzav#${i}`));
    expect(portions[0]?.label.he).toBe('שנה ראשונה, פרשת צו, הלכות א–ח');
    expect(portions[6]?.label.en).toBe('First year, Tzav, halachot 50–58');
  });

  it('reads both parashiyot of a double week, the combined first-year node once', () => {
    const shabbat = shabbatOf(['Tazria', 'Metzora'], 5786);
    expect(week(shabbat).flatMap((day) => read(halachaPortion(day, bih, true, true)))).toHaveLength(
      bih.units['y1-tazria-metzora'].count,
    );
    const second = week(shabbat).flatMap((day) => read(halachaPortion(day, bih, true)));
    expect(second).toHaveLength(bih.units['y2-tazria'].count + bih.units['y2-metzora'].count);
    expect(new Set(second.map((key) => key.split('#')[0]))).toEqual(new Set(['y2-tazria', 'y2-metzora']));
  });

  it("reads the first year's halachot when the second year has none for the parasha", () => {
    const portion = halachaPortion(week(shabbatOf(['Devarim'], 5786))[0], bih, true);
    expect(portion?.pieces[0].u).toBe('y1-devarim');
  });

  it('follows Israel or abroad where their parashiyot differ', () => {
    const shabbat = [5786, 5787, 5788]
      .flatMap(yearDays)
      .find((day) => day.getDay() === 6 && chokParashiyot(day, true).join() !== chokParashiyot(day, false).join())!;
    const sunday = new HDate(shabbat.abs() - 6);
    expect(halachaPortion(sunday, bih, true)?.pieces[0].u).not.toBe(halachaPortion(sunday, bih, false)?.pieces[0].u);
  });
});

describe('the festival periods', () => {
  // The observed days hebcal gives each fast.
  const HEBCAL_FAST: Partial<Record<FestivalKey, string>> = {
    tisha_bav: "Tish'a B'Av",
    tzom_gedaliah: 'Tzom Gedaliah',
    asara_betevet: "Asara B'Tevet",
    taanit_esther: "Ta'anit Esther",
    shiva_asar_betammuz: 'Tzom Tammuz',
  };

  it.each([5785, 5786, 5787, 5788, 5789, 5790])('agrees with hebcal on the observed fasts of %i', (year) => {
    const events = HebrewCalendar.calendar({ year, isHebrewYear: true, il: true });
    const days = festivalDays(year);
    for (const [festival, desc] of Object.entries(HEBCAL_FAST)) {
      // A deferred Tisha B'Av is "Tish'a B'Av (observed)".
      const event = events.find((e) => e.getDesc() === desc || e.getDesc() === `${desc} (observed)`)!;
      expect(days[festival as FestivalKey].abs()).toBe(event.getDate().abs());
    }
  });

  it("defers a fast off Shabbat and brings Ta'anit Esther forward", () => {
    expect(hd(9, months.AV, 5789).getDay()).toBe(6);
    expect(festivalDays(5789).tisha_bav.getDate()).toBe(10);
    expect(festivalDays(5789).shiva_asar_betammuz.getDate()).toBe(18);
    expect(festivalDays(5785).tzom_gedaliah.getDate()).toBe(4);
    // The period moves with the fast: 21 days before 10 Av opens on 18 Tammuz.
    expect(festivalPeriodsOn(hd(18, months.TAMUZ, 5789)).find((p) => p.festival === 'tisha_bav')?.day).toBe(0);
    expect(festivalPeriodsOn(hd(17, months.TAMUZ, 5789)).map((p) => p.festival)).not.toContain('tisha_bav');
    expect(festivalDays(5788).taanit_esther.getDate()).toBe(11);
  });

  it.each([5787, 5788])('opens each period its days before the festival and ends it on the erev, in %i', (year) => {
    const days = festivalDays(year);
    for (const festival of FESTIVAL_KEYS) {
      const length = FESTIVAL_PERIOD_DAYS[festival];
      const at = (offset: number) =>
        festivalPeriodsOn(new HDate(days[festival].abs() + offset)).find((p) => p.festival === festival);
      expect(at(-length)).toEqual({ festival, day: 0, days: length, daysLeft: length });
      expect(at(-1)).toEqual({ festival, day: length - 1, days: length, daysLeft: 1 });
      expect(at(-length - 1)).toBeUndefined();
      expect(at(0)).toBeUndefined();
    }
  });

  it('starts Pesach on 14 Adar and Purim on 30 Adar I in a leap year', () => {
    expect(festivalPeriodsOn(hd(14, months.ADAR_II, 5787)).map((p) => p.festival)).toContain('pesach');
    expect(festivalPeriodsOn(hd(13, months.ADAR_II, 5787)).map((p) => p.festival)).not.toContain('pesach');
    expect(festivalPeriodsOn(hd(30, months.ADAR_I, 5787)).find((p) => p.festival === 'purim')?.day).toBe(0);
    expect(festivalPeriodsOn(hd(14, months.ADAR_I, 5788)).map((p) => p.festival)).toEqual(['pesach']);
  });

  it('lists overlapping periods nearest festival first', () => {
    expect(festivalPeriodsOn(hd(20, months.ELUL, 5786)).map((p) => [p.festival, p.daysLeft])).toEqual([
      ['rosh_hashanah', 10],
      ['sukkot', 24],
    ]);
    expect(festivalPeriodsOn(hd(5, months.TISHREI, 5787)).map((p) => p.festival)).toEqual(['yom_kippur', 'sukkot']);
  });

  it("gives a track's portion of the day, its short material at the period's end", () => {
    expect(festivalPortion(hd(3, months.ELUL, 5786), bih)).toEqual([]);
    expect(bih.festivals.rosh_hashanah).toHaveLength(25);
    expect(festivalPortion(hd(5, months.ELUL, 5786), bih)).toEqual([
      expect.objectContaining({ portion: bih.festivals.rosh_hashanah![0] }),
    ]);
    const erevPesach = festivalPortion(hd(14, months.NISAN, 5787), kitzur);
    expect(erevPesach).toEqual([
      { period: { festival: 'pesach', day: 29, days: 30, daysLeft: 1 }, portion: kitzur.festivals.pesach![29] },
    ]);
  });

  it('has no portion of the minor fasts in Ben Ish Chai, and one in the Kitzur', () => {
    const before = new HDate(festivalDays(5787).asara_betevet.abs() - 1);
    expect(festivalPortion(before, bih)).toEqual([]);
    expect(festivalPortion(before, kitzur).map((p) => p.period.festival)).toEqual(['asara_betevet']);
  });
});
