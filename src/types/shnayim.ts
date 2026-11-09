import { AddonManifest } from './addon';
import { SiddurCredit, SiddurSegment } from './siddur';

// One parasha of the Shnayim Mikra add-on (scripts/shnayim/build.js): its seven aliyot, each a segment per verse holding
// the verse once (with its number as a note run) and Targum Onkelos; the reader says the verse twice.
export type ShnayimAsset = {
  parasha: string;
  credits: SiddurCredit[];
  aliyot: SiddurSegment[][];
};

export type ShnayimManifest = AddonManifest & { credit: { he: string; en: string } };
