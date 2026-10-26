import { HDate, months } from '@hebcal/core';
import { ContentBlock, Mitzvah, Nusach, UserSettings } from '@/types/mitzvah';
import { Location, Zmanim } from '@/types/zmanim';
import { HebcalService } from '@/services/HebcalService';
import { ZmanimService, isJerusalem } from '@/services/ZmanimService';
import { useUserStore } from '@/stores/useUserStore';
import {
  Condition,
  DayFeatures,
  DayFlag,
  MitzvahTextId,
  Place,
  SiddurGroup,
  SiddurText,
  SiddurTextId,
  StandaloneTextId,
} from '@/types/siddur';
import { CHOK_TEXT_ID } from './chok';
import { DayWindow, dayWindow } from '@/utils/buildDayTimeline';
import { SELICHOT_NUSCHAOT, SELICHOT_TEXT_ID, hasSelichotContent } from './selichot';
import { chokDayHasText } from '@/utils/chok';
import { appDay, locationNoon } from '@/utils/locationDay';
import {
  KIDDUSH_LEVANA_FLAGS,
  dayFeatures,
  kiddushLevanaPeriod,
  liturgicalDay,
  matchesCondition,
} from '@/utils/siddur';
import { SIDDUR_ASSETS } from './siddurAssets.generated';

// The first Hebrew day on which a text's season can open in a Hebrew year: it only narrows the search for the
// next day the text is said, never decides whether a day has it.
type SeasonStart = (year: number) => HDate;

// `availableLabel` tells the catalog when a text with no window today can be said.
type SiddurEntry = {
  evening: boolean;
  available?: Condition;
  availableLabel?: { he: string; en: string };
  season?: SeasonStart;
};

export const SIDDUR_TEXTS: Record<MitzvahTextId, SiddurEntry> = {
  tefillin: { evening: false },
  birchot_hashachar: { evening: false },
  krias_shma_shacharit: { evening: false },
  candle_lighting: { evening: true },
  havdalah: { evening: true, available: { none: ['yomTov'] } },
  sefirat_haomer: {
    evening: true,
    availableLabel: { he: 'מליל שני של פסח עד ערב שבועות', en: 'From the second night of Pesach to Erev Shavuot' },
    season: (year) => new HDate(15, months.NISAN, year),
  },
  shacharit: { evening: false, available: { none: ['shabbat', 'yomTov', 'yomKippur'] } },
  mincha: { evening: false, available: { none: ['shabbat', 'yomTov', 'yomKippur'] } },
  maariv: { evening: true, available: { none: ['shabbat', 'yomTov', 'yomKippur'] } },
};

type Availability = { available?: Condition; availableLabel?: { he: string; en: string } };

// The hours of a day a text with a time of its own is said, from that day's zmanim and the next day's.
type TextHours = (day: Zmanim, next: Zmanim, location: Location) => { start: Date; end: Date };

// `evening` texts are said at night and resolve for the night in effect or coming next;
// `availableLabel` tells the catalog when a text whose `available` fails today can be said, and
// `availableIn` replaces both for a nusach whose minhag sets other days. `hours` puts a text in the
// catalog's "now" card while they hold, and `'mitzvah'` reads them from the window of the mitzvah that
// `MITZVAH_STANDALONE_TEXT` links to the text; a text without them has no time of its own. `periodEnd` is the
// instant after which a night's text is no longer said, even where the night's hours run on.
export type StandaloneEntry = Availability & {
  name: { he: string; en: string };
  group: SiddurGroup;
  evening?: boolean;
  availableIn?: Partial<Record<Nusach, Availability>>;
  hours?: TextHours | 'mitzvah';
  periodEnd?: (night: HDate, nusach: Nusach, location: Location) => Date;
  season?: SeasonStart;
};

const TONIGHT_TO_DAWN: TextHours = (day, next, location) => ({
  start: HebcalService.nightfall(day, location),
  end: next.alotHaShachar,
});
export const MIDNIGHT_TO_MORNING_PRAYER: TextHours = (day, next) => ({
  start: day.chatzotLayla,
  end: next.sofZmanTfilaGra,
});

const HOLY_NIGHTS: DayFlag[] = ['shabbat', 'yomTov', 'yomKippur'];

const kiddushLevanaOn = (nusach: Nusach, he: string, en: string): Availability => ({
  available: { all: [KIDDUSH_LEVANA_FLAGS[nusach]], none: HOLY_NIGHTS },
  availableLabel: { he, en },
});

export const STANDALONE_TEXTS: Record<StandaloneTextId, StandaloneEntry> = {
  birkat_hamazon: { name: { he: 'ברכת המזון', en: 'Grace After Meals' }, group: 'meals' },
  al_hamichya: { name: { he: 'ברכה מעין שלוש', en: "Me'ein Shalosh" }, group: 'meals' },
  borei_nefashot: { name: { he: 'בורא נפשות', en: 'Borei Nefashot' }, group: 'meals' },
  tikkun_haklali: { name: { he: 'תיקון הכללי', en: 'Tikkun HaKlali' }, group: 'general' },
  tehillim: { name: { he: 'תהילים', en: 'Tehillim' }, group: 'general' },
  nishmat: { name: { he: 'נשמת כל חי', en: 'Nishmat Kol Chai' }, group: 'general' },
  kriat_shema_al_hamita: {
    name: { he: 'קריאת שמע על המיטה', en: 'Bedtime Shema' },
    group: 'general',
    evening: true,
    hours: TONIGHT_TO_DAWN,
  },
  tefilat_haderech: { name: { he: 'תפילת הדרך', en: "The Traveler's Prayer" }, group: 'general' },
  asher_yatzar: { name: { he: 'אשר יצר', en: 'Asher Yatzar' }, group: 'general' },
  birchot_hanehenin: { name: { he: 'ברכות הנהנין', en: 'Blessings on Food and Fragrance' }, group: 'general' },
  birchot_hareiya: { name: { he: 'ברכות הראייה', en: 'Blessings on Sights and Sounds' }, group: 'general' },
  mezuzah: { name: { he: 'קביעת מזוזה', en: 'Affixing a Mezuzah' }, group: 'general' },
  kiddush_levana: {
    name: { he: 'קידוש לבנה', en: 'Kiddush Levana' },
    group: 'general',
    evening: true,
    ...kiddushLevanaOn(
      'ashkenaz',
      'משלושה ימים אחרי המולד עד חצי החודש',
      'From three days after the molad to mid-month',
    ),
    availableIn: {
      sefard: kiddushLevanaOn(
        'sefard',
        'משבעה ימים אחרי המולד עד חצי החודש',
        'From seven days after the molad to mid-month',
      ),
      edot_hamizrach: kiddushLevanaOn(
        'edot_hamizrach',
        'משבעה עד חמישה עשר ימים אחרי המולד',
        'From seven to fifteen days after the molad',
      ),
      chabad: kiddushLevanaOn(
        'chabad',
        'משבעה ימים אחרי המולד עד חצי החודש',
        'From seven days after the molad to mid-month',
      ),
    },
    hours: TONIGHT_TO_DAWN,
    periodEnd: (night, nusach, location) => kiddushLevanaPeriod(night, nusach, location).end,
  },
  sheva_berachot: { name: { he: 'שבע ברכות', en: 'Sheva Berachot' }, group: 'occasions' },
  chanukah_candles: {
    name: { he: 'הדלקת נרות חנוכה', en: 'Chanukah Candle Lighting' },
    group: 'occasions',
    evening: true,
    available: { all: ['chanukah'] },
    availableLabel: { he: 'בחנוכה', en: 'On Chanukah' },
    hours: 'mitzvah',
    season: (year) => new HDate(25, months.KISLEV, year),
  },
  selichot: {
    name: { he: 'סליחות', en: 'Selichot' },
    group: 'occasions',
    available: { all: ['selichotAshkenazi'] },
    hours: MIDNIGHT_TO_MORNING_PRAYER,
    availableLabel: { he: 'ממוצאי שבת הסליחות עד ערב יום הכיפורים', en: 'From Leil Selichot to Erev Yom Kippur' },
    availableIn: {
      edot_hamizrach: {
        available: { all: ['selichotSephardi'] },
        availableLabel: { he: 'מב׳ באלול עד ערב יום הכיפורים', en: 'From 2 Elul to Erev Yom Kippur' },
      },
    },
    season: (year) => new HDate(1, months.ELUL, year),
  },
  ushpizin: {
    name: { he: 'אושפיזין', en: 'Ushpizin' },
    group: 'occasions',
    evening: true,
    available: { all: ['sukkotNight'] },
    availableLabel: { he: 'בלילות סוכות', en: 'On the nights of Sukkot' },
    hours: TONIGHT_TO_DAWN,
    season: (year) => new HDate(15, months.TISHREI, year),
  },
};

export const MITZVAH_STANDALONE_TEXT: Partial<Record<string, StandaloneTextId>> = {
  krias_shma_al_hamita: 'kriat_shema_al_hamita',
  kiddush_levana: 'kiddush_levana',
  selichot: 'selichot',
  chanukah_candles: 'chanukah_candles',
  ushpizin: 'ushpizin',
};

const CHOK_DAYS: Condition = { none: ['shabbat', 'yomTov', 'yomKippur'] };

export const SIDDUR_GROUPS: readonly SiddurGroup[] = ['meals', 'general', 'occasions'];

export const SIDDUR_TEXT_IDS: readonly SiddurTextId[] = [
  ...(Object.keys(SIDDUR_TEXTS) as MitzvahTextId[]),
  ...(Object.keys(STANDALONE_TEXTS) as StandaloneTextId[]),
];

export function isSiddurTextId(id: string): id is SiddurTextId {
  return (SIDDUR_TEXT_IDS as readonly string[]).includes(id);
}

const ASSETS: Record<Nusach, Partial<Record<SiddurTextId, number>>> = SIDDUR_ASSETS;

export function mitzvahTextId(mitzvahId: string): MitzvahTextId | null {
  return mitzvahId in SIDDUR_TEXTS ? (mitzvahId as MitzvahTextId) : null;
}

// A mitzvah linked to a standalone text is a night mitzvah keyed on the civil day whose evening it opens.
export function mitzvahTextEvening(mitzvahId: string): boolean {
  const own = mitzvahTextId(mitzvahId);
  return own ? SIDDUR_TEXTS[own].evening : mitzvahId in MITZVAH_STANDALONE_TEXT;
}

export function standaloneTextId(id: string): StandaloneTextId | null {
  return id in STANDALONE_TEXTS ? (id as StandaloneTextId) : null;
}

export function siddurAsset(nusach: Nusach, id: SiddurTextId): number | undefined {
  return ASSETS[nusach]?.[id];
}

export function standaloneTextsIn(group: SiddurGroup, nusach?: Nusach): StandaloneTextId[] {
  return (Object.keys(STANDALONE_TEXTS) as StandaloneTextId[]).filter(
    (id) => STANDALONE_TEXTS[id].group === group && (!nusach || siddurTextBuiltFor(nusach, id)),
  );
}

export function standaloneAvailability(id: StandaloneTextId, nusach: Nusach): Availability {
  const { available, availableLabel, availableIn } = STANDALONE_TEXTS[id];
  return availableIn?.[nusach] ?? { available, availableLabel };
}

export function hasStandaloneText(id: StandaloneTextId, nusach: Nusach, features: DayFeatures): boolean {
  return siddurTextPresent(nusach, id) && matchesCondition(standaloneAvailability(id, nusach).available, features);
}

// The Hebrew day a standalone text opened with no date resolves for at this instant.
export function standaloneTextDay(id: StandaloneTextId, instant: Date, location: Location): HDate {
  return STANDALONE_TEXTS[id].evening
    ? HebcalService.hebrewNightAt(instant, location)
    : HebcalService.hebrewDayAt(instant, location);
}

function periodEndAt(id: StandaloneTextId, nusach: Nusach, instant: Date, location: Location): number | null {
  const { periodEnd } = STANDALONE_TEXTS[id];
  return periodEnd ? periodEnd(standaloneTextDay(id, instant, location), nusach, location).getTime() : null;
}

// Whether the night in effect at `instant` has run past the end of its text's period, as the last night
// of Kiddush Levana does between the period's end and the next alot.
export function standalonePeriodEnded(
  id: StandaloneTextId,
  nusach: Nusach,
  instant: Date,
  location: Location,
): boolean {
  const end = periodEndAt(id, nusach, instant, location);
  return end !== null && instant.getTime() >= end;
}

export const NEXT_TEXT_SCAN_DAYS = 45;

export type ReadingDay = { day: HDate; offSeason: boolean };

// The Hebrew day a standalone text opens for: `today` (from standaloneTextDay()) when the text is said on it
// and its period has not ended, else the first later day it is said, found by scanning windows of
// NEXT_TEXT_SCAN_DAYS days (those a `season` names, else the days right after today); null when no day has it.
export function standaloneReadingDay(
  id: StandaloneTextId,
  nusach: Nusach,
  today: HDate,
  periodEnded: boolean,
  place: Place,
): ReadingDay | null {
  if (!siddurTextPresent(nusach, id)) return null;
  const has = (day: HDate) => hasStandaloneText(id, nusach, dayFeatures(day, place));
  if (!periodEnded && has(today)) return { day: today, offSeason: false };
  const from = today.abs() + 1;
  const { season } = STANDALONE_TEXTS[id];
  const windows = season ? [-1, 0, 1].map((shift) => season(today.getFullYear() + shift).abs()) : [from];
  for (const start of windows) {
    for (let abs = Math.max(start, from); abs < start + NEXT_TEXT_SCAN_DAYS; abs++) {
      const day = new HDate(abs);
      if (has(day)) return { day, offSeason: true };
    }
  }
  return null;
}

function linkedMitzvahWindow(
  id: StandaloneTextId,
  date: Date,
  nusach: Nusach,
  location: Location,
  place: Place,
): { start: Date; end: Date } | null {
  const mitzvahId = Object.keys(MITZVAH_STANDALONE_TEXT).find((key) => MITZVAH_STANDALONE_TEXT[key] === id);
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy: the registry imports this module
  const { findMitzvah } = require('./mitzvot') as typeof import('./mitzvot');
  const mitzvah = mitzvahId ? findMitzvah(mitzvahId) : undefined;
  if (!mitzvah) return null;
  const { halachicOpinions } = useUserStore.getState();
  const window = dayWindow(mitzvah, date, location, { nusach, halachicOpinions, inIsrael: place.inIsrael });
  return window && { start: window.start, end: window.end };
}

// The hours of `id` open at `instant` (from the evening before through the next morning), when its
// day offers it in `nusach`, else null: what the catalog's "now" card lists for a standalone text.
// A text with a `periodEnd` closes there, even when its hours run on to the next morning.
export function standaloneHoursAt(
  id: StandaloneTextId,
  nusach: Nusach,
  instant: Date,
  location: Location,
  place: Place,
): { start: Date; end: Date } | null {
  const { hours } = STANDALONE_TEXTS[id];
  if (!hours) return null;
  if (!hasStandaloneText(id, nusach, dayFeatures(standaloneTextDay(id, instant, location), place))) return null;
  const periodEnd = periodEndAt(id, nusach, instant, location);
  const today = appDay(instant, location);
  const dateOn = (offset: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
  const zmanimOn = (offset: number) => ZmanimService.getZmanim(locationNoon(dateOn(offset), location), location);
  for (const offset of [-1, 0]) {
    const day = zmanimOn(offset);
    const next = zmanimOn(offset + 1);
    const open =
      hours === 'mitzvah'
        ? linkedMitzvahWindow(id, dateOn(offset), nusach, location, place)
        : day && next
          ? hours(day, next, location)
          : null;
    if (!open) continue;
    const end = new Date(Math.min(open.end.getTime(), periodEnd ?? Number.POSITIVE_INFINITY));
    if (open.start.getTime() <= instant.getTime() && instant.getTime() < end.getTime()) return { ...open, end };
  }
  return null;
}

export function customSiddurText(mitzvah: Mitzvah, nusach: Nusach): SiddurText | null {
  const blocks = (mitzvah.contentBlocks ?? []).filter(
    (block): block is Extract<ContentBlock, { type: 'text' | 'blessing' }> =>
      block.type === 'text' || block.type === 'blessing',
  );
  if (!blocks.length) return null;
  return {
    nusach,
    id: mitzvah.id,
    sections: [
      {
        title: { he: mitzvah.name.he, en: mitzvah.name.en ?? mitzvah.name.he },
        segments: blocks.map((block) => ({
          he: [[{ t: block.he, ...(block.type === 'blessing' ? { s: 'b' as const } : {}) }]],
          ...(block.en ? { en: block.en } : {}),
        })),
      },
    ],
    credits: [],
  };
}

export function siddurPlace(location: Location, inIsrael: boolean): Place {
  return { inIsrael, jerusalem: isJerusalem(location), location };
}

export function hasSiddurText(mitzvah: Mitzvah, nusach: Nusach, windowDate: Date, place: Place): boolean {
  if (mitzvah.isCustom) return customSiddurText(mitzvah, nusach) !== null;
  if (mitzvah.id === CHOK_TEXT_ID) {
    const day = liturgicalDay(windowDate, false);
    return chokDayHasText(day, place.inIsrael) && matchesCondition(CHOK_DAYS, dayFeatures(day, place));
  }
  const linked = MITZVAH_STANDALONE_TEXT[mitzvah.id];
  if (linked) {
    return hasStandaloneText(
      linked,
      nusach,
      dayFeatures(liturgicalDay(windowDate, mitzvahTextEvening(mitzvah.id)), place),
    );
  }
  const id = mitzvahTextId(mitzvah.id);
  if (!id || siddurAsset(nusach, id) === undefined) return false;
  const { evening, available } = SIDDUR_TEXTS[id];
  return matchesCondition(available, dayFeatures(liturgicalDay(windowDate, evening), place));
}

// The first window of a registry mitzvah with a text that has not ended at `now` and carries the text: over the
// NEXT_TEXT_SCAN_DAYS app days from today (a `multiDay` mitzvah also looks back its `maxDays`, for the window
// still open), else over those its `season` names, the text's own or the linked text's; null for a custom
// mitzvah, Chok LeYisrael, or when no such window is found.
export function nextMitzvahTextWindow(
  mitzvah: Mitzvah,
  nusach: Nusach,
  location: Location,
  settings: UserSettings,
  place: Place,
  now: Date,
): DayWindow | null {
  const own = mitzvahTextId(mitzvah.id);
  const linked = MITZVAH_STANDALONE_TEXT[mitzvah.id];
  if (mitzvah.isCustom || mitzvah.id === CHOK_TEXT_ID || !(own || linked)) return null;
  const dayFrom = (base: Date, offset: number) =>
    new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset);
  const today = appDay(now, location);
  const back = mitzvah.multiDay?.maxDays ?? 0;
  const earliest = dayFrom(today, -back).getTime();
  const firstFrom = (start: Date, days: number): DayWindow | null => {
    for (let k = 0; k < days; k++) {
      const date = dayFrom(start, k);
      if (date.getTime() < earliest) continue;
      const window = dayWindow(mitzvah, date, location, settings);
      if (window && window.end.getTime() > now.getTime() && hasSiddurText(mitzvah, nusach, window.date, place)) {
        return window;
      }
    }
    return null;
  };
  const found = firstFrom(dayFrom(today, -back), back + NEXT_TEXT_SCAN_DAYS);
  const season = own ? SIDDUR_TEXTS[own].season : linked && STANDALONE_TEXTS[linked].season;
  if (found || !season) return found;
  const lead = own ? 0 : -1;
  const year = new HDate(today).getFullYear();
  for (const shift of [-1, 0, 1]) {
    const window = firstFrom(dayFrom(season(year + shift).greg(), lead), NEXT_TEXT_SCAN_DAYS);
    if (window) return window;
  }
  return null;
}

export function siddurTextBuiltFor(nusach: Nusach, id: SiddurTextId): boolean {
  return id === SELICHOT_TEXT_ID ? SELICHOT_NUSCHAOT.includes(nusach) : siddurAsset(nusach, id) !== undefined;
}

export function siddurTextPresent(nusach: Nusach, id: SiddurTextId): boolean {
  return id === SELICHOT_TEXT_ID ? hasSelichotContent(nusach) : siddurAsset(nusach, id) !== undefined;
}

export const SELICHOT_OFFER_LEAD_DAYS = 7;

export type SelichotSeason = { year: number; first: Date; last: Date };

export type SelichotOffer = SelichotSeason & { begun: boolean };

export function selichotSeason(year: number, nusach: Nusach, place: Place): SelichotSeason | null {
  const { available } = standaloneAvailability(SELICHOT_TEXT_ID, nusach);
  const days: number[] = [];
  const end = new HDate(9, months.TISHREI, year).abs();
  for (let abs = new HDate(1, months.ELUL, year - 1).abs(); abs <= end; abs++) {
    if (matchesCondition(available, dayFeatures(new HDate(abs), place))) days.push(abs);
  }
  if (!days.length) return null;
  return { year, first: new HDate(days[0] - 1).greg(), last: new HDate(days[days.length - 1] - 1).greg() };
}

export function selichotOfferOn(today: Date, nusach: Nusach, place: Place): SelichotOffer | null {
  const hd = new HDate(today);
  const season = selichotSeason(
    hd.getMonth() === months.TISHREI ? hd.getFullYear() : hd.getFullYear() + 1,
    nusach,
    place,
  );
  if (!season) return null;
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const from = new Date(
    season.first.getFullYear(),
    season.first.getMonth(),
    season.first.getDate() - SELICHOT_OFFER_LEAD_DAYS,
  ).getTime();
  if (day < from || day > season.last.getTime()) return null;
  return { ...season, begun: day >= season.first.getTime() };
}
