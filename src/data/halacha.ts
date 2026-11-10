import { FestivalKey, HalachaTrack } from '@/types/halacha';
import { Nusach } from '@/types/mitzvah';

// The two halacha mitzvot (.claude/specs/halacha-yomit.md): the daily portion and the halachot before a festival.
export const HALACHA_YOMIT_ID = 'halacha_yomit';
export const HILCHOT_HACHAG_ID = 'hilchot_hachag';

export const HALACHA_TRACKS: readonly HalachaTrack[] = ['kitzur', 'ben_ish_chai', 'rambam'];

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
