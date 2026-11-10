import { AddonManifest } from './addon';
import { SiddurCredit, SiddurSegment } from './siddur';

// The daily-halacha tracks (.claude/specs/halacha-yomit.md, section 3): the book a user learns, one choice for both
// halacha mitzvot.
export type HalachaTrack = 'kitzur' | 'ben_ish_chai' | 'rambam';

// Every book the halacha add-on ships: the tracks, and the two books a mitzvah of its own reads whatever the track
// (the owner's requests of 2026-11-10): Sefer Chofetz Chaim (`lashon_hara`) and Sefer Shemirat HaLashon
// (`shemirat_halashon`).
export type HalachaBook = HalachaTrack | 'chafetz_chaim' | 'shemirat_halashon';

// The festivals `hilchot_hachag` learns before (spec 7.1).
export type FestivalKey =
  | 'pesach'
  | 'shavuot'
  | 'sukkot'
  | 'rosh_hashanah'
  | 'yom_kippur'
  | 'chanukah'
  | 'purim'
  | 'tisha_bav'
  | 'tzom_gedaliah'
  | 'asara_betevet'
  | 'taanit_esther'
  | 'shiva_asar_betammuz';

export type HalachaLabel = { he: string; en: string };

// A run of a unit's segments, both ends inclusive, as scripts/halacha/build.js writes it.
export type HalachaPiece = { u: string; from: number; to: number };

export type HalachaPortion = { label: HalachaLabel; pieces: HalachaPiece[] };

// What a book's manifest says each day reads (spec 6): by Hebrew month and day, by a cycle from an anchor date, by the
// week's parasha, divided over the week by the app, or by Hebrew month and day with a table of its own for a leap year
// (the Chofetz Chaim).
export type HalachaSchedule =
  | {
      kind: 'hebrew';
      months: Readonly<Record<string, readonly (HalachaPortion | null)[]>>;
      leapReview: readonly (HalachaPortion | null)[];
    }
  | { kind: 'cycle'; anchor: string; days: readonly HalachaPortion[] }
  | { kind: 'parasha'; parashiyot: Readonly<Record<string, Readonly<Partial<Record<'1' | '2', string>>>>> }
  | {
      kind: 'hebrewYear';
      common: Readonly<Record<string, readonly (HalachaPortion | null)[]>>;
      leap: Readonly<Record<string, readonly (HalachaPortion | null)[]>>;
    };

export type HalachaUnitInfo = { he: string; en: string; count: number };

export type HalachaManifest = AddonManifest & {
  track: HalachaBook;
  book: HalachaLabel;
  credit: HalachaLabel;
  credits: SiddurCredit[];
  units: Readonly<Record<string, HalachaUnitInfo>>;
  schedule: HalachaSchedule;
  festivals: Readonly<Partial<Record<FestivalKey, readonly HalachaPortion[]>>>;
  english: { coverage: number; ships: boolean };
};

// One unit file of a track: its sections of keyed segments.
export type HalachaUnit = {
  track: HalachaBook;
  unit: string;
  title: HalachaLabel;
  credits: SiddurCredit[];
  sections: { ref: string; title: HalachaLabel; segments: SiddurSegment[] }[];
};

// The days of a festival's period a day falls in (spec 7.1): its 0-based index in the period and the days left until
// the festival (1 on the erev).
export type FestivalPeriod = { festival: FestivalKey; day: number; days: number; daysLeft: number };

// What the device downloads: a book's Hebrew text, and the English beside it of the books that ship one (the Kitzur,
// the Chofetz Chaim and Shemirat HaLashon, scripts/halacha/build.js).
export type HalachaPack = HalachaBook | 'kitzur_en' | 'chafetz_chaim_en' | 'shemirat_halashon_en';

// The English of one unit: a translation or `null` per Hebrew segment, in order.
export type HalachaEnglishUnit = { track: HalachaBook; unit: string; credits: SiddurCredit[]; en: (string | null)[] };

// What an install keeps of its manifest beside the units (`schedule.json`), so a window can read its day at once.
export type HalachaScheduleFile = Pick<
  HalachaManifest,
  'track' | 'version' | 'book' | 'credit' | 'credits' | 'units' | 'schedule' | 'festivals'
>;
