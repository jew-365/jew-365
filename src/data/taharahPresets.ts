import { Nusach } from '@/types/mitzvah';
import { TaharahPresetId, TaharahRules } from '@/types/taharah';

// Raised whenever a preset value changes, so a store can tell that its rules predate the change.
export const TAHARAH_RULES_VERSION = 1;

// Initial values pending the rav's review (docs/taharah-review.html lists each with its source).
// Ashkenaz: five days by the Rema, onah beinonit on days 30 and 31 as most contemporary Ashkenazi
// authorities hold, ohr zarua left to the stricter. Chassidic communities add ohr zarua. Chabad
// follows the Alter Rebbe: day 30 only, kept for the whole Hebrew date, haflaga counted in onot
// from the hefsek. Sephardim keep day 30 only and no ohr zarua; Rav Ovadia Yosef allows the hefsek
// from the fourth day, Rav Mordechai Eliyahu keeps the five-day custom.
export const TAHARAH_PRESETS: Record<TaharahPresetId, TaharahRules> = {
  ashkenaz: {
    hefsekEarliestDay: 5,
    mochDachuk: 'recommended',
    onahBeinonitDays: [30, 31],
    onahBeinonitSpan: 'onah',
    ohrZarua: false,
    haflagaMethod: 'days',
  },
  chassidic: {
    hefsekEarliestDay: 5,
    mochDachuk: 'required',
    onahBeinonitDays: [30, 31],
    onahBeinonitSpan: 'onah',
    ohrZarua: true,
    haflagaMethod: 'days',
  },
  chabad: {
    hefsekEarliestDay: 5,
    mochDachuk: 'required',
    onahBeinonitDays: [30],
    onahBeinonitSpan: 'fullDay',
    ohrZarua: true,
    haflagaMethod: 'onot',
  },
  sephardi_ovadia: {
    hefsekEarliestDay: 4,
    mochDachuk: 'optional',
    onahBeinonitDays: [30],
    onahBeinonitSpan: 'onah',
    ohrZarua: false,
    haflagaMethod: 'days',
  },
  sephardi_eliyahu: {
    hefsekEarliestDay: 5,
    mochDachuk: 'recommended',
    onahBeinonitDays: [30],
    onahBeinonitSpan: 'onah',
    ohrZarua: false,
    haflagaMethod: 'days',
  },
};

export const TAHARAH_PRESET_IDS = Object.keys(TAHARAH_PRESETS) as TaharahPresetId[];

// The prayer nusach only suggests a starting point: nusach Sefard is the chassidic rite, and the
// Edot HaMizrach default follows Rav Ovadia Yosef as the most widely followed Sephardi posek, as
// Teiman's does until the rav answers (R14.6).
export function presetForNusach(nusach: Nusach): TaharahPresetId {
  switch (nusach) {
    case 'ashkenaz':
      return 'ashkenaz';
    case 'sefard':
      return 'chassidic';
    case 'chabad':
      return 'chabad';
    case 'edot_hamizrach':
    case 'teiman':
      return 'sephardi_ovadia';
  }
}

export function rulesFor(preset: TaharahPresetId): TaharahRules {
  return { ...TAHARAH_PRESETS[preset], onahBeinonitDays: [...TAHARAH_PRESETS[preset].onahBeinonitDays] };
}
