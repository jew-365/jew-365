import { AddonManifest } from './addon';
import { SiddurCredit, SiddurSegment } from './siddur';

// One tractate of the Mishnah add-on (scripts/mishna/build.js): its chapters, each a keyed segment per mishnah
// (`mishna:<tractate slug>:<chapter>:<mishnah>`, its number as a note run, Kulp's English as `en`) with Bartenura's
// comments on it as one optional segment right after it.
export type MishnaAsset = {
  tractate: string;
  title: { he: string; en: string };
  credits: SiddurCredit[];
  chapters: SiddurSegment[][];
};

export type MishnaManifest = AddonManifest & { credit: { he: string; en: string } };
