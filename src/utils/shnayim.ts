import { SHNAYIM_TEXT_ID, hasShnayimContent, shnayimAsset } from '@/data/shnayim';
import { ChokAsset, ChokSection, ChokSlot } from '@/types/chok';
import { SiddurSegment } from '@/types/siddur';
import { ShnayimAsset } from '@/types/shnayim';
import type { LearningProgram } from '@/utils/chok';

// Shnayim Mikra ve'Echad Targum, an aliyah a day (the owner's call, 2026-11-09): Sunday the first to Thursday the fifth,
// and Friday the sixth and the seventh, since the app is closed on Shabbat. No ליל שישי.
export const SHNAYIM_SLOTS: readonly ChokSlot[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri'];

export const SHNAYIM_ALIYOT_OF_SLOT: Readonly<Partial<Record<ChokSlot, readonly number[]>>> = {
  sun: [0],
  mon: [1],
  tue: [2],
  wed: [3],
  thu: [4],
  fri: [5, 6],
};

const ALIYAH_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שביעי'];

export const SHNAYIM_PROGRAM: LearningProgram = {
  id: SHNAYIM_TEXT_ID,
  slotsOf: () => SHNAYIM_SLOTS,
  asset: shnayimAsset,
  installed: hasShnayimContent,
};

// Each verse twice in the Torah's words, then once in Onkelos: the asset's first paragraph (number and verse), the
// verse again without its number, then the targum. A Rashi segment (an optional one) is left as it is.
export function shnayimVerse(segment: SiddurSegment): SiddurSegment {
  if (segment.optional) return segment;
  const [verse, ...targum] = segment.he;
  return { ...segment, he: [verse, verse.filter((run) => run.s !== 'n'), ...targum] };
}

export function shnayimAsChok(asset: ShnayimAsset): ChokAsset {
  const section = (aliyah: number): ChokSection => ({
    kind: 'torah',
    heading: ALIYAH_NAMES[aliyah],
    en: `Aliyah ${aliyah + 1}`,
    segments: (asset.aliyot[aliyah] ?? []).map(shnayimVerse),
  });
  const slots = Object.fromEntries(
    SHNAYIM_SLOTS.map((slot) => [slot, (SHNAYIM_ALIYOT_OF_SLOT[slot] ?? []).map(section)]),
  ) as ChokAsset['slots'];
  return { parasha: asset.parasha, credit: asset.credits[0], credits: asset.credits, dedication: null, slots };
}
