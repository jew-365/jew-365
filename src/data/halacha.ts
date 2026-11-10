import { FestivalKey, HalachaBook, HalachaTrack } from '@/types/halacha';
import { Nusach } from '@/types/mitzvah';

// The two halacha mitzvot (.claude/specs/halacha-yomit.md): the daily portion and the halachot before a festival.
export const HALACHA_YOMIT_ID = 'halacha_yomit';
export const HILCHOT_HACHAG_ID = 'hilchot_hachag';

// The daily lashon hara halachot (the owner's request of 2026-11-10): Sefer Chofetz Chaim by its daily luach, for every
// nusach, whatever the track; and Sefer Shemirat HaLashon by its own luach (the owner's call of the same day).
export const LASHON_HARA_ID = 'lashon_hara';
export const SHEMIRAT_HALASHON_ID = 'shemirat_halashon';

// The mitzvot that read a book of their own, whatever the track.
const OWN_BOOK: Readonly<Record<string, HalachaBook>> = {
  [LASHON_HARA_ID]: 'chafetz_chaim',
  [SHEMIRAT_HALASHON_ID]: 'shemirat_halashon',
};

export const HALACHA_TRACKS: readonly HalachaTrack[] = ['kitzur', 'ben_ish_chai', 'rambam'];

// Every book of the halacha add-on: the tracks, then the books of their own mitzvot.
export const HALACHA_BOOKS: readonly HalachaBook[] = [...HALACHA_TRACKS, 'chafetz_chaim', 'shemirat_halashon'];

// The book of a mitzvah that reads one of its own, else `undefined`.
export const ownBookOf = (id: string): HalachaBook | undefined => OWN_BOOK[id];

// The mitzvot that read a halacha book: the two of the user's track and those with a book of their own.
export const isHalachaMitzvah = (id: string): boolean =>
  id === HALACHA_YOMIT_ID || id === HILCHOT_HACHAG_ID || ownBookOf(id) !== undefined;

// The book a halacha mitzvah reads: its own book, else the user's track.
export const halachaBookOf = (id: string, track: HalachaTrack): HalachaBook => ownBookOf(id) ?? track;

// The mitzvot a book's download serves, which its enable prompt switches on.
export const halachaMitzvotOf = (book: HalachaBook): readonly string[] => {
  const own = Object.keys(OWN_BOOK).filter((id) => OWN_BOOK[id] === book);
  return own.length ? own : [HALACHA_YOMIT_ID, HILCHOT_HACHAG_ID];
};

// The book each nusach learns by default (spec 3, the owner's table of 2026-11-10; R17.1 for the rav).
const DEFAULT_TRACK: Readonly<Record<Nusach, HalachaTrack>> = {
  ashkenaz: 'kitzur',
  sefard: 'kitzur',
  edot_hamizrach: 'ben_ish_chai',
  chabad: 'rambam',
  teiman: 'rambam',
};

export function defaultHalachaTrack(nusach: Nusach): HalachaTrack {
  return DEFAULT_TRACK[nusach];
}

// The user's choice, else the nusach's default, so a user who never chose follows a change of nusach.
export function effectiveHalachaTrack(chosen: HalachaTrack | null, nusach: Nusach): HalachaTrack {
  return chosen ?? defaultHalachaTrack(nusach);
}

// Each festival's period length, in days before it (spec 7.1, D11; R17.4 for the rav).
export const FESTIVAL_PERIOD_DAYS: Readonly<Record<FestivalKey, number>> = {
  pesach: 30,
  shavuot: 30,
  sukkot: 30,
  rosh_hashanah: 29,
  yom_kippur: 7,
  chanukah: 14,
  purim: 14,
  tisha_bav: 21,
  tzom_gedaliah: 3,
  asara_betevet: 3,
  taanit_esther: 3,
  shiva_asar_betammuz: 3,
};

export const FESTIVAL_KEYS = Object.keys(FESTIVAL_PERIOD_DAYS) as FestivalKey[];

// Each festival's name, as the reminders and the reader name it.
export const FESTIVAL_NAMES: Readonly<Record<FestivalKey, { he: string; en: string }>> = {
  pesach: { he: 'פסח', en: 'Pesach' },
  shavuot: { he: 'שבועות', en: 'Shavuot' },
  sukkot: { he: 'סוכות', en: 'Sukkot' },
  rosh_hashanah: { he: 'ראש השנה', en: 'Rosh Hashanah' },
  yom_kippur: { he: 'יום הכיפורים', en: 'Yom Kippur' },
  chanukah: { he: 'חנוכה', en: 'Chanukah' },
  purim: { he: 'פורים', en: 'Purim' },
  tisha_bav: { he: 'תשעה באב', en: "Tisha B'Av" },
  tzom_gedaliah: { he: 'צום גדליה', en: 'Tzom Gedaliah' },
  asara_betevet: { he: 'עשרה בטבת', en: 'Asara BeTevet' },
  taanit_esther: { he: 'תענית אסתר', en: "Ta'anit Esther" },
  shiva_asar_betammuz: { he: 'שבעה עשר בתמוז', en: 'Shiva Asar BeTammuz' },
};
