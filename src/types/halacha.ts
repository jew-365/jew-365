import { AddonManifest } from './addon';
import { SiddurCredit, SiddurSegment } from './siddur';

// The daily-halacha tracks (.claude/specs/halacha-yomit.md, section 3): the book a user learns, one choice for both
// halacha mitzvot.
export type HalachaTrack = 'kitzur' | 'ben_ish_chai' | 'rambam';

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

// What a track's manifest says each day reads (spec 6): by Hebrew month and day, by a cycle from an anchor date, or by
// the week's parasha, divided over the week by the app.
export type HalachaSchedule =
  | {
      kind: 'hebrew';
      months: Readonly<Record<string, readonly (HalachaPortion | null)[]>>;
      leapReview: readonly (HalachaPortion | null)[];
    }
  | { kind: 'cycle'; anchor: string; days: readonly HalachaPortion[] }
  | { kind: 'parasha'; parashiyot: Readonly<Record<string, Readonly<Partial<Record<'1' | '2', string>>>>> };

export type HalachaUnitInfo = { he: string; en: string; count: number };

export type HalachaManifest = AddonManifest & {
  track: HalachaTrack;
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
  track: HalachaTrack;
  unit: string;
  title: HalachaLabel;
  credits: SiddurCredit[];
  sections: { ref: string; title: HalachaLabel; segments: SiddurSegment[] }[];
};

// The days of a festival's period a day falls in (spec 7.1): its 0-based index in the period and the days left until
// the festival (1 on the erev).
export type FestivalPeriod = { festival: FestivalKey; day: number; days: number; daysLeft: number };
