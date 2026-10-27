import { HDate, HebrewCalendar, Molad, flags as hebcalFlags, months } from '@hebcal/core';
import { DateTime } from 'luxon';
import {
  Condition,
  DayFeatures,
  DayFlag,
  KiddushLevanaFlag,
  PassageLabel,
  Place,
  Run,
  SegmentBlock,
  SiddurChapterTitle,
  SiddurPlace,
  SiddurSection,
  SiddurSegment,
  SiddurText,
  SiddurTextId,
  SiddurVoice,
  VoiceAudience,
} from '@/types/siddur';
import type { Nusach } from '@/types/mitzvah';
import type { Location } from '@/types/zmanim';
import type { MaritalStatus, PrayerMode } from '@/stores/useUserStore';
import { HebcalService } from '@/services/HebcalService';
import { ZmanimService } from '@/services/ZmanimService';

const SHEHECHEYANU_DAYS: readonly (readonly [month: number, day: number])[] = [
  [months.TISHREI, 1],
  [months.TISHREI, 2],
  [months.TISHREI, 10],
  [months.TISHREI, 15],
  [months.TISHREI, 22],
  [months.NISAN, 15],
  [months.SIVAN, 6],
];
const DIASPORA_SHEHECHEYANU_DAYS: readonly (readonly [month: number, day: number])[] = [
  [months.TISHREI, 16],
  [months.TISHREI, 23],
  [months.NISAN, 16],
  [months.SIVAN, 7],
];
const NAMED_FASTS: readonly (readonly [desc: string, flag: DayFlag])[] = [
  ['Tzom Gedaliah', 'tzomGedaliah'],
  ["Asara B'Tevet", 'asaraBTevet'],
  ["Ta'anit Esther", 'taanitEsther'],
  ['Tzom Tammuz', 'tzomTammuz'],
];
const PUBLIC_FASTS = [...NAMED_FASTS.map(([desc]) => desc), "Tish'a B'Av"];
const WEEKDAYS: readonly DayFlag[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DISPUTED_HALLEL_DAYS = ["Yom HaAtzma'ut", 'Yom Yerushalayim'];
const SUKKOT_OFFERING_DAYS = [2, 3, 4, 5, 6, 7] as const;

function isOneOf(hd: HDate, days: readonly (readonly [number, number])[]): boolean {
  return days.some(([month, day]) => hd.getMonth() === month && hd.getDate() === day);
}

function omerDayOf(hd: HDate): number | null {
  const day = hd.abs() - new HDate(15, months.NISAN, hd.getFullYear()).abs();
  return day >= 1 && day <= 49 ? day : null;
}

function isGregorianLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function rainRequestStart(year: number, inIsrael: boolean): HDate {
  if (inIsrael) return new HDate(7, months.CHESHVAN, year);
  const civilYear = new HDate(1, months.TISHREI, year).greg().getFullYear();
  return new HDate(new Date(civilYear, 11, isGregorianLeapYear(civilYear + 1) ? 6 : 5));
}

function within(hd: HDate, from: HDate, to: HDate): boolean {
  return hd.abs() >= from.abs() && hd.abs() <= to.abs();
}

function observances(hd: HDate, inIsrael: boolean) {
  const events = HebrewCalendar.calendar({ start: hd, end: hd, il: inIsrael });
  const descs = events.map((event) => event.getDesc());
  const yomKippur = descs.includes('Yom Kippur');
  const yomTov = events.some((event) => {
    const mask = event.getFlags();
    return Boolean(mask & hebcalFlags.CHAG) && !(mask & hebcalFlags.CHOL_HAMOED) && event.getDesc() !== 'Yom Kippur';
  });
  const cholHamoed = events
    .filter((event) => event.getFlags() & hebcalFlags.CHOL_HAMOED)
    .map((event) => event.getDesc());
  return { descs, yomKippur, yomTov, cholHamoed, shabbat: hd.getDay() === 6 };
}

const CHANUKAH_DAYS = 8;

export function chanukahDay(hd: HDate): number | null {
  const day = hd.abs() - new HDate(25, months.KISLEV, hd.getFullYear()).abs() + 1;
  return day >= 1 && day <= CHANUKAH_DAYS ? day : null;
}

function isChanukah(hd: HDate): boolean {
  return chanukahDay(hd) !== null;
}

const USHPIZIN_NIGHTS = [1, 2, 3, 4, 5, 6, 7] as const;

export function ushpizinNight(hd: HDate): number | null {
  const night = hd.getMonth() === months.TISHREI ? hd.getDate() - 14 : 0;
  return night >= 1 && night <= USHPIZIN_NIGHTS.length ? night : null;
}

function observedTishaBav(year: number): HDate {
  const ninth = new HDate(9, months.AV, year);
  return ninth.getDay() === 6 ? ninth.next() : ninth;
}

// The molad is reckoned on Jerusalem mean solar time, UTC+2:20:56.496 (longitude 35.2354°).
const MOLAD_UTC_OFFSET_MS = 8_456_496;
const DAY_MS = 86_400_000;
const HALF_MONTH_MS = ((14 * 24 + 18) * 60 + 22) * 60_000;
const MOLAD_SEARCH_DAYS_BEFORE = 3;
const FIRST_NIGHT_SEARCH_NIGHTS = 16;
const FIRST_NIGHT_CACHE_LIMIT = 64;
const KIDDUSH_LEVANA_START_DAYS: Record<Nusach, number> = { ashkenaz: 3, sefard: 7, edot_hamizrach: 7, chabad: 7 };
const KIDDUSH_LEVANA_END_MS: Record<Nusach, number> = {
  ashkenaz: HALF_MONTH_MS,
  sefard: HALF_MONTH_MS,
  edot_hamizrach: 15 * DAY_MS,
  chabad: HALF_MONTH_MS,
};

export const KIDDUSH_LEVANA_FLAGS: Readonly<Record<Nusach, KiddushLevanaFlag>> = {
  ashkenaz: 'kiddushLevanaAshkenaz',
  sefard: 'kiddushLevanaSefard',
  edot_hamizrach: 'kiddushLevanaEdotHamizrach',
  chabad: 'kiddushLevanaChabad',
};

export type KiddushLevanaPeriod = { start: Date; end: Date };

function noonAt(hd: HDate, location: Location): Date {
  const greg = hd.greg();
  return DateTime.fromObject(
    { year: greg.getFullYear(), month: greg.getMonth() + 1, day: greg.getDate(), hour: 12 },
    { zone: location.tz },
  ).toJSDate();
}

function nightfallOpening(night: HDate, location: Location): Date | null {
  const zmanim = ZmanimService.getZmanim(noonAt(night.prev(), location), location);
  return zmanim ? HebcalService.nightfall(zmanim, location) : null;
}

function nightOfEvening(instant: Date, location: Location): HDate {
  const { year, month, day } = DateTime.fromJSDate(instant).setZone(location.tz);
  return new HDate(new Date(year, month - 1, day)).next();
}

export function moladOf(hebrewMonth: HDate): Date {
  const year = hebrewMonth.getFullYear();
  const month = hebrewMonth.getMonth();
  const molad = new Molad(year, month);
  let abs = new HDate(1, month, year).abs() - MOLAD_SEARCH_DAYS_BEFORE;
  while (new HDate(abs).getDay() !== molad.getDow()) abs += 1;
  const greg = new HDate(abs).greg();
  return new Date(
    Date.UTC(greg.getFullYear(), greg.getMonth(), greg.getDate(), molad.getHour(), molad.getMinutes()) +
      Math.round((molad.getChalakim() * 10_000) / 3) -
      MOLAD_UTC_OFFSET_MS,
  );
}

export function kiddushLevanaPeriod(hebrewMonth: HDate, nusach: Nusach, location: Location): KiddushLevanaPeriod {
  const year = hebrewMonth.getFullYear();
  const molad = moladOf(hebrewMonth).getTime();
  let start = molad + KIDDUSH_LEVANA_START_DAYS[nusach] * DAY_MS;
  if (hebrewMonth.getMonth() === months.TISHREI) {
    const yomKippur = HebcalService.holyBlockOn(noonAt(new HDate(10, months.TISHREI, year), location), location);
    if (yomKippur) start = Math.max(start, yomKippur.end.getTime());
  }
  if (hebrewMonth.getMonth() === months.AV) {
    const zmanim = ZmanimService.getZmanim(noonAt(observedTishaBav(year), location), location);
    if (zmanim) start = Math.max(start, HebcalService.nightfall(zmanim, location).getTime());
  }
  return { start: new Date(start), end: new Date(molad + KIDDUSH_LEVANA_END_MS[nusach]) };
}

export function kiddushLevanaNightOpen(night: HDate, nusach: Nusach, location: Location): boolean {
  const opens = nightfallOpening(night, location);
  const period = kiddushLevanaPeriod(night, nusach, location);
  return opens !== null && opens.getTime() >= period.start.getTime() && opens.getTime() < period.end.getTime();
}

const firstNightCache = new Map<string, number | null>();

function searchFirstNight(hebrewMonth: HDate, nusach: Nusach, inIsrael: boolean, location: Location): number | null {
  const period = kiddushLevanaPeriod(hebrewMonth, nusach, location);
  let night = nightOfEvening(period.start, location);
  for (let step = 0; step < FIRST_NIGHT_SEARCH_NIGHTS; step++, night = night.next()) {
    const opens = nightfallOpening(night, location);
    if (!opens) continue;
    if (opens.getTime() >= period.end.getTime()) return null;
    if (opens.getTime() < period.start.getTime()) continue;
    const { shabbat, yomTov, yomKippur } = observances(night, inIsrael);
    if (!shabbat && !yomTov && !yomKippur) return night.abs();
  }
  return null;
}

export function kiddushLevanaFirstNight(hebrewMonth: HDate, nusach: Nusach, place: Place): HDate | null {
  const location = place.location;
  if (!location) return null;
  const key = [
    hebrewMonth.getFullYear(),
    hebrewMonth.getMonth(),
    nusach,
    place.inIsrael,
    location.lat,
    location.lng,
    location.tz,
    location.elevation ?? '',
    location.inIsrael,
  ].join('|');
  let abs = firstNightCache.get(key);
  if (abs === undefined) {
    abs = searchFirstNight(hebrewMonth, nusach, place.inIsrael, location);
    if (firstNightCache.size >= FIRST_NIGHT_CACHE_LIMIT) {
      const oldest = firstNightCache.keys().next().value;
      if (oldest !== undefined) firstNightCache.delete(oldest);
    }
    firstNightCache.set(key, abs);
  }
  return abs === null ? null : new HDate(abs);
}

const SEPHARDI_SELICHOT_FROM_ELUL = 2;

// Leil Selichot opens the Sunday that leaves at least four selichot days before Rosh Hashana,
// Erev Rosh Hashana included.
function leilSelichot(roshHashana: HDate): number {
  const sunday = roshHashana.abs() - roshHashana.getDay();
  return roshHashana.abs() - sunday < 4 ? sunday - 7 : sunday;
}

function weekdaysFrom(from: number, to: number): number {
  let count = 0;
  for (let abs = from; abs <= to; abs++) if (new HDate(abs).getDay() !== 6) count++;
  return count;
}

function selichotFlags(hd: HDate, holy: boolean): DayFlag[] {
  if (holy) return [];
  const month = hd.getMonth();
  const date = hd.getDate();
  if (month === months.ELUL) {
    const roshHashana = new HDate(1, months.TISHREI, hd.getFullYear() + 1);
    const sephardi: DayFlag[] = date >= SEPHARDI_SELICHOT_FROM_ELUL ? ['selichotSephardi'] : [];
    if (hd.abs() === roshHashana.abs() - 1) return [...sephardi, 'selichotAshkenazi', 'erevRoshHashana'];
    const start = leilSelichot(roshHashana);
    if (hd.abs() < start) return sephardi;
    return [...sephardi, 'selichotAshkenazi', `selichotDay${weekdaysFrom(start, hd.abs())}` as DayFlag];
  }
  if (month !== months.TISHREI || date < 3 || date > 9) return [];
  if (date === 9) return ['selichotSephardi', 'selichotAshkenazi'];
  const nth = weekdaysFrom(new HDate(3, months.TISHREI, hd.getFullYear()).abs(), hd.abs());
  return ['selichotSephardi', 'selichotAshkenazi', ...(nth > 1 ? [`selichotTeshuva${nth}` as DayFlag] : [])];
}

function purimName(place: Place): string {
  return place.jerusalem ? 'Shushan Purim' : 'Purim';
}

export function liturgicalDay(windowDate: Date, evening: boolean): HDate {
  const base = new HDate(new Date(windowDate.getFullYear(), windowDate.getMonth(), windowDate.getDate()));
  return evening ? base.next() : base;
}

export function chanukahNightOn(day: Date): number | null {
  return chanukahDay(liturgicalDay(day, true));
}

const DAY_FEATURES_CACHE_LIMIT = 400;
const dayFeaturesCache = new Map<string, DayFeatures>();

function placeKey(place: Place): string {
  const location = place.location;
  return [
    place.inIsrael,
    place.jerusalem,
    location ? [location.lat, location.lng, location.tz, location.elevation ?? '', location.inIsrael].join(',') : '',
  ].join('|');
}

export function dayFeatures(hd: HDate, place: Place): DayFeatures {
  const key = `${hd.abs()}|${placeKey(place)}`;
  const cached = dayFeaturesCache.get(key);
  if (cached) return cached;
  const features = computeDayFeatures(hd, place);
  if (dayFeaturesCache.size >= DAY_FEATURES_CACHE_LIMIT) {
    const oldest = dayFeaturesCache.keys().next().value;
    if (oldest !== undefined) dayFeaturesCache.delete(oldest);
  }
  dayFeaturesCache.set(key, features);
  return features;
}

function computeDayFeatures(hd: HDate, place: Place): DayFeatures {
  const today = observances(hd, place.inIsrael);
  const year = hd.getFullYear();
  const month = hd.getMonth();
  const date = hd.getDate();
  const flags = new Set<DayFlag>();
  const add = (flag: DayFlag, when: boolean) => when && flags.add(flag);
  const flagged = (...names: DayFlag[]) => names.some((name) => flags.has(name));

  const weekday = WEEKDAYS[hd.getDay()];
  if (weekday) flags.add(weekday);
  add('shabbat', today.shabbat);
  add('yomTov', today.yomTov);
  add('yomKippur', today.yomKippur);
  add(
    'tishaBav',
    today.descs.some((desc) => desc.startsWith("Tish'a B'Av")),
  );
  add('shehecheyanu', isOneOf(hd, SHEHECHEYANU_DAYS) || (!place.inIsrael && isOneOf(hd, DIASPORA_SHEHECHEYANU_DAYS)));
  add(
    'roshChodesh',
    today.descs.some((desc) => desc.startsWith('Rosh Chodesh')),
  );
  add(
    'cholHamoedPesach',
    today.cholHamoed.some((desc) => desc.startsWith('Pesach')),
  );
  add(
    'cholHamoedSukkot',
    today.cholHamoed.some((desc) => desc.startsWith('Sukkot')),
  );
  add('inIsrael', place.inIsrael);
  add('omer', omerDayOf(hd) !== null);
  add('winter', within(hd, new HDate(22, months.TISHREI, year), new HDate(14, months.NISAN, year)));
  add('talUmatar', within(hd, rainRequestStart(year, place.inIsrael), new HDate(14, months.NISAN, year)));
  add('aseretYemeiTeshuva', month === months.TISHREI && date <= 10);
  add('erevYomKippur', month === months.TISHREI && date === 9);
  for (const flag of selichotFlags(hd, today.shabbat || today.yomTov || today.yomKippur)) flags.add(flag);
  add(
    'ledavidSeason',
    month === months.ELUL || (month === months.AV && date === 30) || (month === months.TISHREI && date <= 21),
  );
  add('chanukah', isChanukah(hd));
  add('chanukahFirstNight', month === months.KISLEV && date === 25);
  if (place.location) {
    for (const [nusach, flag] of Object.entries(KIDDUSH_LEVANA_FLAGS) as [Nusach, KiddushLevanaFlag][]) {
      add(flag, kiddushLevanaNightOpen(hd, nusach, place.location));
    }
  }
  add('avBeforeTishaBav', month === months.AV && hd.abs() <= observedTishaBav(year).abs());
  add('purim', today.descs.includes(purimName(place)));
  add('purimOrShushan', today.descs.includes('Purim') || today.descs.includes('Shushan Purim'));
  add('purimKatan', today.descs.includes('Purim Katan') || today.descs.includes('Shushan Purim Katan'));
  add(
    'publicFast',
    today.descs.some((desc) => PUBLIC_FASTS.some((fast) => desc.startsWith(fast))),
  );
  for (const [desc, flag] of NAMED_FASTS) add(flag, today.descs.includes(desc));
  add('dayAfterYomKippur', month === months.TISHREI && date === 11);
  add('hoshanaRabba', month === months.TISHREI && date === 21);
  add('erevPesach', month === months.NISAN && date === 14);
  add('musaf', flagged('roshChodesh', 'cholHamoedPesach', 'cholHamoedSukkot'));
  add('torahReading', flagged('monday', 'thursday', 'musaf', 'chanukah', 'purim', 'publicFast'));
  add(
    'ulechaparatPesha',
    HDate.isLeapYear(year) && (month >= months.CHESHVAN || (month === months.TISHREI && date === 30)),
  );

  const hallel = HebrewCalendar.hallel(hd, place.inIsrael);
  const disputedHallel = today.descs.some((desc) => DISPUTED_HALLEL_DAYS.includes(desc));
  add('hallelWhole', hallel === 2 && !disputedHallel);
  add('hallelHalf', hallel === 1);
  add('hallelDisputed', hallel > 0 && disputedHallel);

  const sukkotDay = month === months.TISHREI ? date - 14 : 0;
  add('lulavShehecheyanu', place.inIsrael && sukkotDay === 2 && hd.prev().getDay() === 6);
  for (const day of SUKKOT_OFFERING_DAYS) {
    add(`sukkotOffering${day}`, sukkotDay === day || (!place.inIsrael && sukkotDay === day + 1));
  }
  const ushpiz = ushpizinNight(hd);
  add('sukkotNight', ushpiz !== null);
  for (const night of USHPIZIN_NIGHTS) add(`ushpizinNight${night}`, ushpiz === night);

  const tachanun = HebrewCalendar.tachanun(hd, place.inIsrael);
  add('tachanunShacharit', tachanun.shacharit);
  add('tachanunMincha', tachanun.mincha);
  add('tachanunDisputed', !tachanun.allCongs);

  const yesterday = observances(hd.prev(), place.inIsrael);
  add('motzaei', yesterday.shabbat || yesterday.yomTov || yesterday.yomKippur);
  // A meal begun before sunset keeps yesterday's inserts, so the day after names what yesterday was,
  // but only when today carries no insert of the same kind of its own.
  const noYaalehVeyavoToday = !flagged('roshChodesh', 'cholHamoedPesach', 'cholHamoedSukkot');
  add('roshChodeshYesterday', noYaalehVeyavoToday && yesterday.descs.some((desc) => desc.startsWith('Rosh Chodesh')));
  add(
    'cholHamoedPesachYesterday',
    noYaalehVeyavoToday && yesterday.cholHamoed.some((desc) => desc.startsWith('Pesach')),
  );
  add(
    'cholHamoedSukkotYesterday',
    noYaalehVeyavoToday && yesterday.cholHamoed.some((desc) => desc.startsWith('Sukkot')),
  );
  const noAlHanissimToday = !flagged('chanukah', 'purim');
  add('chanukahYesterday', noAlHanissimToday && isChanukah(hd.prev()));
  add('purimYesterday', noAlHanissimToday && yesterday.descs.includes(purimName(place)));
  if (yesterday.shabbat) {
    flags.add('motzaeiShabbat');
    const weekAhead = [0, 1, 2, 3, 4, 5].map((offset) => observances(hd.add(offset), place.inIsrael));
    add('viHiNoam', !flags.has('tishaBav') && !weekAhead.some((day) => day.yomTov || day.yomKippur));
  }

  return { flags, omerDay: omerDayOf(hd) };
}

export function matchesCondition(condition: Condition | undefined, features: DayFeatures): boolean {
  if (!condition) return true;
  if (condition.all?.some((flag) => !features.flags.has(flag))) return false;
  if (condition.any && !condition.any.some((flag) => features.flags.has(flag))) return false;
  if (condition.none?.some((flag) => features.flags.has(flag))) return false;
  if (condition.omerDay !== undefined && condition.omerDay !== features.omerDay) return false;
  return true;
}

function trimEdges(runs: Run[]): Run[] {
  const first = runs.findIndex((run) => run.t.trim());
  if (first < 0) return [];
  const last = runs.findLastIndex((run) => run.t.trim());
  return runs.slice(first, last + 1).map((run, index, kept) => {
    let t = index === 0 ? run.t.trimStart() : run.t;
    if (index === kept.length - 1) t = t.trimEnd();
    return t === run.t ? run : { ...run, t };
  });
}

function collapseJoins(runs: Run[]): Run[] {
  const kept: Run[] = [];
  for (const run of runs) {
    const previous = kept[kept.length - 1];
    const t = previous && /\s$/.test(previous.t) ? run.t.trimStart() : run.t;
    if (t) kept.push(t === run.t ? run : { ...run, t });
  }
  return kept;
}

type Labeled = { optional?: PassageLabel; minyan?: PassageLabel };

function dropLabelsNotDue<T extends Labeled>(item: T, features: DayFeatures): T {
  const due = { ...item };
  for (const field of ['optional', 'minyan'] as const) {
    if (due[field] && !matchesCondition(due[field].when, features)) delete due[field];
  }
  return due;
}

function resolveSegment(segment: SiddurSegment, features: DayFeatures): SiddurSegment | null {
  if (!matchesCondition(segment.when, features)) return null;
  const he = segment.he
    .map((runs) => trimEdges(collapseJoins(runs.filter((run) => matchesCondition(run.when, features)))))
    .filter((runs) => runs.length > 0);
  return he.length ? dropLabelsNotDue({ ...segment, he }, features) : null;
}

export function resolveSiddurText(text: SiddurText, features: DayFeatures): SiddurSection[] {
  return text.sections
    .map((section) =>
      dropLabelsNotDue(
        {
          ...section,
          segments: section.segments
            .map((segment) => resolveSegment(segment, features))
            .filter((segment): segment is SiddurSegment => segment !== null),
        },
        features,
      ),
    )
    .filter((section) => section.segments.length > 0);
}

function sameCondition(a?: Condition, b?: Condition): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function mergeRuns(runs: Run[]): Run[] {
  const merged: Run[] = [];
  for (const run of runs) {
    const last = merged[merged.length - 1];
    if (
      last &&
      ((last.s === run.s && sameCondition(last.when, run.when)) || (!run.t.trim() && !run.when && !last.when))
    )
      merged[merged.length - 1] = { ...last, t: last.t + run.t };
    else merged.push(run);
  }
  return merged;
}

function singleRuns(runs: Run[]): Run[] {
  const kept = runs.filter((run) => !run.marriedOnly);
  return kept.length === runs.length ? runs : trimEdges(collapseJoins(kept));
}

function singleSegment(segment: SiddurSegment): SiddurSegment | null {
  if (segment.optional?.marriedOnly) return null;
  const he = segment.he.map(singleRuns).filter((runs) => runs.length > 0);
  if (!he.length) return null;
  return he.length === segment.he.length && he.every((runs, index) => runs === segment.he[index])
    ? segment
    : { ...segment, he };
}

export function forMaritalStatus(sections: SiddurSection[], status: MaritalStatus | null): SiddurSection[] {
  if (status !== 'single') return sections;
  return sections.flatMap((section) => {
    if (section.optional?.marriedOnly) return [];
    const segments = section.segments
      .map(singleSegment)
      .filter((segment): segment is SiddurSegment => segment !== null);
    if (!segments.length) return [];
    const same =
      segments.length === section.segments.length &&
      segments.every((segment, index) => segment === section.segments[index]);
    return [same ? section : { ...section, segments }];
  });
}

function voicedRuns(runs: Run[], audience: VoiceAudience): Run[] {
  if (!runs.some((run) => run.voice)) return runs;
  const kept = runs
    .filter((run) => !run.voice || run.voice.includes(audience))
    .map(({ voice, marriedOnly, ...run }) => run);
  return kept.length === runs.length ? kept : trimEdges(mergeRuns(collapseJoins(kept)));
}

function unfolds(label: PassageLabel | undefined, voice: SiddurVoice | null): boolean {
  return Boolean((label?.voice && voice) || (label?.foldsFor && label.foldsFor !== voice));
}

export const FEMALE_HIDDEN_TEXTS: readonly SiddurTextId[] = ['tefillin'];

export function catalogListsText(id: SiddurTextId, voice: SiddurVoice | null): boolean {
  return voice !== 'female' || !FEMALE_HIDDEN_TEXTS.includes(id);
}

function voicedSegment(segment: SiddurSegment, voice: SiddurVoice | null): SiddurSegment | null {
  const own = segment.optional?.voice;
  if (own && voice && own !== voice) return null;
  const he = segment.he.map((runs) => voicedRuns(runs, voice ?? 'unset')).filter((runs) => runs.length > 0);
  if (!he.length) return null;
  const opened = unfolds(segment.optional, voice);
  if (!opened && he.length === segment.he.length && he.every((runs, index) => runs === segment.he[index]))
    return segment;
  const next: SiddurSegment = { ...segment, he };
  if (opened) delete next.optional;
  return next;
}

export function forVoice(sections: SiddurSection[], voice: SiddurVoice | null): SiddurSection[] {
  const next = sections.flatMap((section) => {
    const own = section.optional?.voice;
    if (own && voice && own !== voice) return [];
    const segments = section.segments
      .map((segment) => voicedSegment(segment, voice))
      .filter((segment): segment is SiddurSegment => segment !== null);
    if (!segments.length) return [];
    const opened = unfolds(section.optional, voice);
    if (
      !opened &&
      segments.length === section.segments.length &&
      segments.every((segment, index) => segment === section.segments[index])
    )
      return [section];
    const kept: SiddurSection = { ...section, segments };
    if (opened) delete kept.optional;
    return [kept];
  });
  return next.length === sections.length && next.every((section, index) => section === sections[index])
    ? sections
    : next;
}

export type PickerEntry = { index: number; title: { he: string; en: string } };

// What the reader's section picker lists for a resolved text: its chapters, each at the section that
// opens it, or every section when the text has no chapters (the short texts).
export function pickerEntries(sections: SiddurSection[]): PickerEntry[] {
  const chapters = sections.flatMap((section, index) => (section.chapter ? [{ index, title: section.chapter }] : []));
  return chapters.length ? chapters : sections.map((section, index) => ({ index, title: section.title }));
}

// The picker entry the section at `index` belongs to: the last entry at or before it, or, before the
// first chapter, the section itself.
export function pickerEntryAt(entries: PickerEntry[], sections: SiddurSection[], index: number): PickerEntry | null {
  const section = sections[index];
  if (!section) return null;
  const owner = entries.filter((entry) => entry.index <= index).pop();
  return owner ?? { index, title: section.title };
}

export function chapterVisible(
  chapter: SiddurChapterTitle,
  voice: SiddurVoice | null,
  status: MaritalStatus | null,
): boolean {
  if (chapter.marriedOnly && status === 'single') return false;
  return !chapter.voices || chapter.voices.includes(voice ?? 'unset');
}

export function siddurLineHeight(fontSize: number): number {
  return Math.round(fontSize * 1.75);
}

// Auto-scroll keeps its pace in lines of Hebrew text, so a larger text size scrolls more pixels.
export function autoScrollPixelsPerSecond(linesPerMinute: number, fontSize: number): number {
  return (linesPerMinute * siddurLineHeight(fontSize)) / 60;
}

export function segmentBlocks(segments: SiddurSegment[], field: keyof Labeled, offset = 0): SegmentBlock[] {
  const blocks: SegmentBlock[] = [];
  segments.forEach((segment, index) => {
    const label = segment[field];
    const previous = blocks[blocks.length - 1];
    if (previous && previous.label?.he === label?.he) previous.segments.push(segment);
    else blocks.push({ start: offset + index, ...(label ? { label } : {}), segments: [segment] });
  });
  return blocks;
}

export type MinyanBlock = SegmentBlock & { folded: boolean };
export type OptionalBlock = SegmentBlock & { openByDefault: boolean; minyanBlocks: MinyanBlock[] };
export type SectionFolds = { minyanFolded: boolean; optionalOpen: boolean; blocks: OptionalBlock[] };

// What the reader folds in a section for a prayer mode: grouped by optional label first, then each block
// by minyan label, as the reader draws it. Praying alone folds the minyan-only section and every minyan
// block, and opens an optional passage that is said when praying alone; with a minyan nothing is folded.
export function aloneFolds(section: SiddurSection, mode: PrayerMode): SectionFolds {
  const alone = mode === 'alone';
  return {
    minyanFolded: alone && Boolean(section.minyanOnly),
    optionalOpen: alone && Boolean(section.optional?.alone),
    blocks: segmentBlocks(section.segments, 'optional').map((block) => ({
      ...block,
      openByDefault: alone && Boolean(block.label?.alone),
      minyanBlocks: segmentBlocks(block.segments, 'minyan', block.start).map((inner) => ({
        ...inner,
        folded: alone && Boolean(inner.label),
      })),
    })),
  };
}

const PLACE_SLOP_PX = 1;
const LEAD_WORDS = 3;

export type PlaceTarget = { index: number; segmentKey: string | null };

export function segmentLead(segment: SiddurSegment, count = LEAD_WORDS): string {
  const textOf = (keep: (run: Run) => boolean) =>
    segment.he
      .map((runs) =>
        runs
          .filter(keep)
          .map((run) => run.t)
          .join(''),
      )
      .join(' ');
  const said = textOf((run) => run.s !== 'n');
  return (said.trim() ? said : textOf(() => true)).split(/\s+/).filter(Boolean).slice(0, count).join(' ');
}

export function firstPlace(section: SiddurSection): SiddurPlace | null {
  const key = section.segments.find((segment) => segment.key)?.key;
  return key ? { sectionTitle: section.title.he, segmentKey: key } : null;
}

export function isTextStart(sections: readonly SiddurSection[], place: SiddurPlace): boolean {
  for (const section of sections) {
    const first = firstPlace(section);
    if (first) return first.segmentKey === place.segmentKey;
  }
  return false;
}

export function placeAt(
  sections: readonly SiddurSection[],
  sectionHeight: (title: string) => number | undefined,
  segmentOffset: (key: string) => number | undefined,
  listTop: number,
  viewportTop: number,
): SiddurPlace | null {
  let top = listTop;
  for (const section of sections) {
    const height = sectionHeight(section.title.he);
    if (height === undefined) return null;
    if (viewportTop < top + height) {
      const within = viewportTop - top + PLACE_SLOP_PX;
      let place = firstPlace(section);
      for (const segment of section.segments) {
        const offset = segment.key ? segmentOffset(segment.key) : undefined;
        if (segment.key && offset !== undefined && offset <= within) {
          place = { sectionTitle: section.title.he, segmentKey: segment.key };
        }
      }
      return place;
    }
    top += height;
  }
  return null;
}

export function placeTarget(sections: readonly SiddurSection[], place: SiddurPlace): PlaceTarget | null {
  const byKey = sections.findIndex((section) => section.segments.some((segment) => segment.key === place.segmentKey));
  if (byKey >= 0) return { index: byKey, segmentKey: place.segmentKey };
  const byTitle = sections.findIndex((section) => section.title.he === place.sectionTitle);
  return byTitle >= 0 ? { index: byTitle, segmentKey: null } : null;
}
