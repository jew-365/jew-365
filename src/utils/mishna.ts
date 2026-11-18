// Which mishnayot a day reads (.claude/specs/habit-texts.md, section 4): Mishna Yomit by the cycle of
// @hebcal/learning (BSD-2-Clause: from 20 May 1947, 4,192 mishnayot, two a day, in the order of the Shas), and the two
// mishnayot of `two_mishnayot`, which continue from the user's own place: two for every day marked before.
import { Locale, gematriya } from '@hebcal/core';
import { MishnaYomiIndex, mishnaYomiStart } from '@hebcal/learning';

import type { SiddurSegment } from '@/types/siddur';
import type { MishnaAsset } from '@/types/mishna';
import type { HalachaLabel, HalachaPortion } from '@/types/halacha';
import type { TextUnit } from '@/utils/halachaText';

export const MISHNAYOT = 4192;

// The 63 tractates in the order of the Shas and of the cycle, by @hebcal/learning's names: the add-on's keys.
export const MISHNA_TRACTATES: readonly string[] = [
  'Berakhot',
  'Peah',
  'Demai',
  'Kilayim',
  'Sheviit',
  'Terumot',
  'Maasrot',
  'Maaser Sheni',
  'Challah',
  'Orlah',
  'Bikkurim',
  'Shabbat',
  'Eruvin',
  'Pesachim',
  'Shekalim',
  'Yoma',
  'Sukkah',
  'Beitzah',
  'Rosh Hashanah',
  'Taanit',
  'Megillah',
  'Moed Katan',
  'Chagigah',
  'Yevamot',
  'Ketubot',
  'Nedarim',
  'Nazir',
  'Sotah',
  'Gittin',
  'Kiddushin',
  'Bava Kamma',
  'Bava Metzia',
  'Bava Batra',
  'Sanhedrin',
  'Makkot',
  'Shevuot',
  'Eduyot',
  'Avodah Zarah',
  'Avot',
  'Horayot',
  'Zevachim',
  'Menachot',
  'Chullin',
  'Bekhorot',
  'Arakhin',
  'Temurah',
  'Keritot',
  'Meilah',
  'Tamid',
  'Middot',
  'Kinnim',
  'Kelim',
  'Oholot',
  'Negaim',
  'Parah',
  'Tahorot',
  'Mikvaot',
  'Niddah',
  'Makhshirin',
  'Zavim',
  'Tevul Yom',
  'Yadayim',
  'Oktzin',
];

// A mishnah: the tractate by @hebcal/learning's name (the add-on's key), its chapter and number.
export type MishnaRef = { k: string; chapter: number; mishnah: number };

// The two mishnayot of a day, under the label the reader heads them with.
export type MishnaReading = { label: HalachaLabel; refs: MishnaRef[] };

let index: MishnaYomiIndex | null = null;
const cycle = (): MishnaYomiIndex => (index ??= new MishnaYomiIndex());

const refOf = ({ k, v }: { k: string; v: string }): MishnaRef => {
  const [chapter, mishnah] = v.split(':').map(Number);
  return { k, chapter, mishnah };
};

const number = (n: number) => gematriya(n).replace(/[׳״]/g, '');

export const tractateName = (k: string): HalachaLabel => ({ he: Locale.gettext(k, 'he'), en: k });

export const tractateSlug = (k: string): string =>
  k
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const mishnaKey = (ref: MishnaRef): string => `mishna:${tractateSlug(ref.k)}:${ref.chapter}:${ref.mishnah}`;

// "ברכות ט, ה – פאה א, א" / "Berakhot 9:5 – Peah 1:1"; one chapter reads "ברכות א, א–ב" / "Berakhot 1:1–2".
export function mishnaLabel(refs: readonly MishnaRef[]): HalachaLabel {
  const [first, last] = [refs[0], refs[refs.length - 1]];
  const he = (r: MishnaRef) => `${tractateName(r.k).he} ${number(r.chapter)}, ${number(r.mishnah)}`;
  const en = (r: MishnaRef) => `${r.k} ${r.chapter}:${r.mishnah}`;
  if (first === last) return { he: he(first), en: en(first) };
  if (first.k === last.k && first.chapter === last.chapter) {
    return { he: `${he(first)}–${number(last.mishnah)}`, en: `${en(first)}–${last.mishnah}` };
  }
  return { he: `${he(first)} – ${he(last)}`, en: `${en(first)} – ${en(last)}` };
}

// The n-th mishnah of the order of the Shas, from 0, wrapping after the last.
export function mishnaAt(n: number): MishnaRef {
  const i = ((n % MISHNAYOT) + MISHNAYOT) % MISHNAYOT;
  return refOf(cycle().lookup(mishnaYomiStart + Math.floor(i / 2))[i % 2]);
}

// Mishna Yomit on a location date held as a device-local day (`appDay()`), which the cycle counts by.
export function mishnaYomitOn(day: Date): MishnaReading {
  const refs = cycle().lookup(day).map(refOf);
  return { label: mishnaLabel(refs), refs };
}

// The two mishnayot `two_mishnayot` reads after `marked` days were marked before the day.
export function twoMishnayotAfter(marked: number): MishnaReading {
  const refs = [mishnaAt(marked * 2), mishnaAt(marked * 2 + 1)];
  return { label: mishnaLabel(refs), refs };
}

// The days marked for a mitzvah before a date key: the archived count of the days retention pruned and the kept ones.
export function markedBefore(
  id: string,
  dayKey: string,
  completions: Readonly<Record<string, Readonly<Record<string, number>>>>,
  archived: Readonly<Record<string, number>>,
): number {
  let count = archived[id] ?? 0;
  for (const [key, marks] of Object.entries(completions)) if (key < dayKey && marks[id]) count++;
  return count;
}

// A tractate as a halacha unit, so the halacha reader's text builder reads it: a section per chapter.
export function mishnaUnit(asset: MishnaAsset): TextUnit {
  return {
    unit: asset.tractate,
    title: asset.title,
    credits: asset.credits,
    sections: asset.chapters.map((segments, c) => ({
      ref: `${asset.tractate} ${c + 1}`,
      title: { he: `${asset.title.he}, פרק ${number(c + 1)}`, en: `${asset.title.en}, chapter ${c + 1}` },
      segments,
    })),
  };
}

// A reading as a halacha portion over the loaded tractates: each mishnah's segment and the Bartenura that follows it.
export function mishnaPortion(reading: MishnaReading, units: ReadonlyMap<string, TextUnit>): HalachaPortion {
  const pieces = reading.refs.map((ref) => {
    const unit = units.get(ref.k);
    const flat: SiddurSegment[] = unit ? unit.sections.flatMap((section) => section.segments) : [];
    const from = flat.findIndex((segment) => segment.key === mishnaKey(ref));
    if (from < 0) throw new Error(`mishnah ${mishnaKey(ref)} is not loaded`);
    let to = from;
    while (flat[to + 1] && !flat[to + 1].key) to++;
    return { u: ref.k, from, to };
  });
  return { label: reading.label, pieces };
}
