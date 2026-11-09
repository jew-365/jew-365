import { HDate, Locale, getSedra, months } from '@hebcal/core';
import { CHOK_PARASHIYOT, CHOK_TEXT_ID, chokAsset, hasChokContent } from '@/data/chok';
import { HebcalService } from '@/services/HebcalService';
import { ZmanimService } from '@/services/ZmanimService';
import { Completions, dateKey } from '@/stores/useCompletionsStore';
import {
  ChokAsset,
  ChokDoubleChoice,
  ChokSection,
  ChokSectionKind,
  ChokSlot,
  ChokThuNightDay,
  HaftarahVariant,
} from '@/types/chok';
import { Nusach } from '@/types/mitzvah';
import { PassageLabel, SiddurSection, SiddurText } from '@/types/siddur';
import { Location } from '@/types/zmanim';
import { calendarDay } from '@/utils/checkIn';
import { appDayEnd, locationNoon } from '@/utils/locationDay';
import { quietBlockAt } from '@/utils/skipRules';
import { civilHebrewDayAt, dayNoon, hebrewDay } from '@/utils/taharah/onot';

export type { ChokSlot };

export type ChokPortion = { parashiyot: string[]; slot: ChokSlot; shabbat: HDate };

export type ChokMakeUp = { dateKey: string; slot: ChokSlot; holy: boolean };

export type ChokMakeUpFold = { dateKey: string; slot: ChokSlot; label: { he: string; en: string } };

export type ChokReaderRequest = { now: Date; date?: Date | null; slot?: ChokSlot | null };

export type ChokTextOptions = {
  id?: string;
  slot: ChokSlot;
  choice: ChokDoubleChoice;
  variant: HaftarahVariant;
  kindNames: Readonly<Record<ChokSectionKind, string>>;
  variantNames: Readonly<Record<HaftarahVariant, string>>;
  makeUps?: readonly ChokMakeUpFold[];
};

type ChokTitles = Pick<ChokTextOptions, 'variant' | 'kindNames' | 'variantNames'>;

export const CHOK_SLOTS: readonly ChokSlot[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'thuNight', 'fri'];

export const CHOK_SECTION_KINDS: readonly ChokSectionKind[] = [
  'torah',
  'neviim',
  'ketuvim',
  'mishnah',
  'gemara',
  'zohar',
  'halacha',
  'mussar',
  'haftarah',
];

export const VEZOT_HABERACHA = 'Vezot Haberakhah';

export const HAFTARAH_VARIANT: Readonly<Record<Nusach, HaftarahVariant>> = {
  ashkenaz: 'ashkenazi',
  sefard: 'ashkenazi',
  edot_hamizrach: 'sephardi',
  chabad: 'ashkenazi',
  teiman: 'sephardi',
};

export const CHOK_COMMENTARY_LABELS: readonly string[] = ['Rashi', 'Bartenura'];

export function isChokCommentary(label: PassageLabel | undefined): boolean {
  return label !== undefined && CHOK_COMMENTARY_LABELS.includes(label.en);
}

const VEZOT_SLOTS: readonly ChokSlot[] = CHOK_SLOTS.filter((slot) => slot !== 'fri');
const SLOT_OF_WEEKDAY: readonly (ChokSlot | null)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', null];
const SLOT_POSITION: Readonly<Record<ChokSlot, number>> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  thuNight: 4.5,
  fri: 5,
};
const THURSDAY = 4;
const SATURDAY = 6;
const WEEK_DAYS = 7;
const LAST_DAY_OF_ROSH_HASHANA = 2;
const SIMCHAT_TORAH_IN_ISRAEL = 22;
const SIMCHAT_TORAH_ABROAD = 23;
const MAX_FESTIVAL_WEEKS = 4;

// The festival-week rule follows hebcal's findParshaHaShavua() (@hebcal/leyning).
export function chokParashiyot(shabbat: HDate, inIsrael: boolean): string[] {
  const reading = getSedra(shabbat.getFullYear(), inIsrael).lookup(shabbat);
  if (!reading.chag) return reading.parsha;
  const date = shabbat.getDate();
  const simchatTorah = inIsrael ? SIMCHAT_TORAH_IN_ISRAEL : SIMCHAT_TORAH_ABROAD;
  if (shabbat.getMonth() === months.TISHREI && date > LAST_DAY_OF_ROSH_HASHANA && date <= simchatTorah) {
    return [VEZOT_HABERACHA];
  }
  for (let week = 1; week <= MAX_FESTIVAL_WEEKS; week++) {
    const next = new HDate(shabbat.abs() + week * WEEK_DAYS);
    const later = getSedra(next.getFullYear(), inIsrael).lookup(next);
    if (!later.chag) return later.parsha;
  }
  throw new Error(`no parasha after ${shabbat.toString()} (${inIsrael ? 'il' : 'abroad'})`);
}

export function chokSlotsOf(parasha: string): readonly ChokSlot[] {
  return parasha === VEZOT_HABERACHA ? VEZOT_SLOTS : CHOK_SLOTS;
}

// A weekly learning program read by the same week, slots and reader as Chok LeYisrael: its mitzvah and reader id, the
// slots each parasha has, and its installed add-on. Shnayim Mikra is the other one (../utils/shnayim.ts).
export type LearningProgram = {
  id: string;
  slotsOf: (parasha: string) => readonly ChokSlot[];
  asset: (parasha: string) => string | undefined;
  installed: () => boolean;
};

export const CHOK_PROGRAM: LearningProgram = {
  id: CHOK_TEXT_ID,
  slotsOf: chokSlotsOf,
  asset: chokAsset,
  installed: hasChokContent,
};

function isHoly(day: HDate, location: Location): boolean {
  return HebcalService.isHolyDay(dayNoon(day.abs(), location), location);
}

function portionOf(day: HDate, slot: ChokSlot | null, inIsrael: boolean, program: LearningProgram): ChokPortion | null {
  if (!slot) return null;
  const shabbat = day.onOrAfter(SATURDAY);
  const parashiyot = chokParashiyot(shabbat, inIsrael);
  return program.slotsOf(parashiyot[0]).includes(slot) ? { parashiyot, slot, shabbat } : null;
}

function afterNightfall(instant: Date, day: HDate, location: Location): boolean {
  const zmanim = ZmanimService.getZmanim(dayNoon(day.abs(), location), location);
  if (!zmanim) return civilHebrewDayAt(instant, location).abs() > day.abs();
  return instant.getTime() >= HebcalService.nightfall(zmanim, location).getTime();
}

export function chokPortionAt(
  instant: Date,
  location: Location,
  inIsrael: boolean,
  program: LearningProgram = CHOK_PROGRAM,
): ChokPortion | null {
  if (quietBlockAt(instant, location)) return null;
  const night = HebcalService.hebrewNightAt(instant, location);
  const today = night.prev();
  // A program without ליל שישי (Shnayim Mikra) keeps Thursday's portion through Thursday night.
  if (today.getDay() === THURSDAY && afterNightfall(instant, today, location)) {
    const thuNight = portionOf(today, 'thuNight', inIsrael, program);
    if (thuNight) return thuNight;
  }
  const day = isHoly(today, location) ? night : today;
  return isHoly(day, location) ? null : portionOf(day, SLOT_OF_WEEKDAY[day.getDay()], inIsrael, program);
}

export function chokPortionOn(
  day: Date,
  location: Location,
  inIsrael: boolean,
  program: LearningProgram = CHOK_PROGRAM,
): ChokPortion | null {
  const hd = civilHebrewDayAt(locationNoon(day, location), location);
  return isHoly(hd, location) ? null : portionOf(hd, SLOT_OF_WEEKDAY[hd.getDay()], inIsrael, program);
}

export function chokMakeUpsBefore(
  day: Date,
  location: Location,
  inIsrael: boolean,
  program: LearningProgram = CHOK_PROGRAM,
): ChokMakeUp[] {
  const today = civilHebrewDayAt(locationNoon(day, location), location);
  const slots = program.slotsOf(chokParashiyot(today.onOrAfter(SATURDAY), inIsrael)[0]);
  const makeUps: ChokMakeUp[] = [];
  for (let back = today.getDay(); back > 0; back--) {
    const earlier = hebrewDay(today.abs() - back);
    const slot = SLOT_OF_WEEKDAY[earlier.getDay()];
    if (slot && slots.includes(slot)) {
      makeUps.push({ dateKey: dateKey(earlier.greg()), slot, holy: isHoly(earlier, location) });
    }
  }
  return makeUps;
}

function slotDay(portion: ChokPortion): HDate {
  return hebrewDay(portion.shabbat.abs() - SATURDAY + Math.floor(SLOT_POSITION[portion.slot]));
}

export function chokSlotDay(portion: ChokPortion): Date {
  return slotDay(portion).greg();
}

export function chokToday(
  now: Date,
  location: Location,
  inIsrael: boolean,
  program: LearningProgram = CHOK_PROGRAM,
): Date {
  const portion = chokPortionAt(now, location, inIsrael, program);
  return portion ? chokSlotDay(portion) : civilHebrewDayAt(now, location).greg();
}

export function chokDoneDay(portion: ChokPortion, today: Date, thuNightDay: ChokThuNightDay): Date | null {
  const day = slotDay(portion);
  const current = new HDate(today);
  const sameWeek = portion.shabbat.abs() === current.onOrAfter(SATURDAY).abs();
  if (!sameWeek || day.abs() > current.abs()) return null;
  const toFriday =
    portion.slot === 'thuNight' && thuNightDay === 'fri' && chokSlotsOf(portion.parashiyot[0]).includes('fri');
  return toFriday ? hebrewDay(day.abs() + 1).greg() : day.greg();
}

export function chokOpenMakeUps(
  today: Date,
  location: Location,
  inIsrael: boolean,
  completions: Completions,
  enabledAt: number | undefined,
  program: LearningProgram = CHOK_PROGRAM,
): ChokMakeUp[] {
  return chokMakeUpsBefore(today, location, inIsrael, program).filter(
    (makeUp) =>
      !completions[makeUp.dateKey]?.[program.id] &&
      (enabledAt === undefined || enabledAt < appDayEnd(calendarDay(makeUp.dateKey), location).getTime()),
  );
}

export function chokDayHasText(day: HDate, inIsrael: boolean, program: LearningProgram = CHOK_PROGRAM): boolean {
  if (!program.installed()) return false;
  const portion = portionOf(day, SLOT_OF_WEEKDAY[day.getDay()], inIsrael, program);
  return portion !== null && portion.parashiyot.every((parasha) => program.asset(parasha) !== undefined);
}

function latestPortionBefore(day: HDate, inIsrael: boolean, program: LearningProgram): ChokPortion {
  const shabbat = day.onOrAfter(SATURDAY);
  const parashiyot = chokParashiyot(shabbat, inIsrael);
  const earlier = program.slotsOf(parashiyot[0]).filter((slot) => SLOT_POSITION[slot] < day.getDay());
  return { parashiyot, slot: earlier[earlier.length - 1] ?? 'sun', shabbat };
}

export function chokReaderPortion(
  request: ChokReaderRequest,
  location: Location,
  inIsrael: boolean,
  program: LearningProgram = CHOK_PROGRAM,
): ChokPortion {
  const { now, date, slot } = request;
  const found = date
    ? chokPortionOn(date, location, inIsrael, program)
    : chokPortionAt(now, location, inIsrael, program);
  const day = date
    ? civilHebrewDayAt(locationNoon(date, location), location)
    : HebcalService.hebrewNightAt(now, location).prev();
  const portion = found ?? latestPortionBefore(day, inIsrael, program);
  return slot && program.slotsOf(portion.parashiyot[0]).includes(slot) ? { ...portion, slot } : portion;
}

export function chokBrowsePortion(
  parasha: string,
  week: ChokPortion,
  slot: ChokSlot | null,
  program: LearningProgram = CHOK_PROGRAM,
): ChokPortion {
  const slots = program.slotsOf(parasha);
  const shown =
    [slot, week.slot].find((candidate) => candidate && slots.includes(candidate)) ?? slots[slots.length - 1];
  return { parashiyot: [parasha], slot: shown, shabbat: week.shabbat };
}

export function chokPlaceOf(
  segmentKey: string,
  program: LearningProgram = CHOK_PROGRAM,
): { parasha: string; slot: ChokSlot } | null {
  const [parasha, slotName] = segmentKey.split(':');
  const slot = CHOK_SLOTS.find((candidate) => candidate === slotName);
  return slot && CHOK_PARASHIYOT.includes(parasha) && program.slotsOf(parasha).includes(slot)
    ? { parasha, slot }
    : null;
}

export function chokChosen<T>(parashiyot: readonly T[], choice: ChokDoubleChoice): readonly T[] {
  return parashiyot.length < 2 || choice === 'both' ? parashiyot : [parashiyot[choice === 'first' ? 0 : 1]];
}

export function chokParashaName(parasha: string, language: 'he' | 'en'): string {
  return language === 'en' ? parasha : Locale.gettext(parasha, 'he-x-NoNikud');
}

export function chokWeekName(parashiyot: readonly string[], language: 'he' | 'en'): string {
  return parashiyot.map((parasha) => chokParashaName(parasha, language)).join(language === 'en' ? '-' : '־');
}

export function chokSlotSections(asset: ChokAsset, slot: ChokSlot, variant: HaftarahVariant): ChokSection[] {
  return (asset.slots[slot] ?? []).filter((section) => !section.variant || section.variant === variant);
}

function slotText(chosen: readonly ChokAsset[], slot: ChokSlot, titles: ChokTitles): SiddurSection[] {
  const { variant, kindNames, variantNames } = titles;
  const prefixed = chosen.length > 1;
  return chosen.flatMap((asset) => {
    const he = chokParashaName(asset.parasha, 'he');
    return chokSlotSections(asset, slot, variant).map((section, index): SiddurSection => {
      const kind = section.variant ? variantNames[section.variant] : (section.en ?? kindNames[section.kind]);
      return {
        title: prefixed
          ? { he: `${he} · ${section.heading}`, en: `${asset.parasha} · ${kind}` }
          : { he: section.heading, en: kind },
        ...(prefixed && index === 0 ? { chapter: { he, en: asset.parasha } } : {}),
        segments: section.segments.map((segment, segmentIndex) => ({
          ...segment,
          key: `${asset.parasha}:${slot}:${section.heading}:${segmentIndex}`,
        })),
      };
    });
  });
}

function makeUpSection(sections: readonly SiddurSection[], makeUp: ChokMakeUpFold): SiddurSection {
  return {
    title: makeUp.label,
    optional: makeUp.label,
    segments: sections.flatMap((section) => [
      {
        key: `makeUp:${makeUp.slot}:${section.title.he}`,
        he: [[{ t: section.title.he, s: 'b' as const }]],
        en: section.title.en,
      },
      ...section.segments,
    ]),
  };
}

export function chokText(assets: readonly ChokAsset[], options: ChokTextOptions): SiddurText {
  const { id = CHOK_TEXT_ID, slot, choice, makeUps = [], ...titles } = options;
  const chosen = chokChosen(assets, choice);
  const sections = [
    ...makeUps.map((makeUp) => makeUpSection(slotText(chosen, makeUp.slot, titles), makeUp)),
    ...slotText(chosen, slot, titles),
  ];
  const credits = [
    ...new Map(
      chosen.flatMap((asset) => asset.credits ?? [asset.credit]).map((credit) => [credit.title, credit]),
    ).values(),
  ];
  const dedication = chosen.find((asset) => asset.dedication)?.dedication;
  return { id, sections, credits, ...(dedication ? { dedication } : {}) };
}
