import { AddonDownload, AddonFailureReason, AddonInstall, AddonManifest, AddonManifestFile } from './addon';
import { SiddurCredit, SiddurSegment } from './siddur';

export type ChokSlot = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'thuNight' | 'fri';

export type ChokSectionKind =
  'torah' | 'neviim' | 'ketuvim' | 'mishnah' | 'gemara' | 'zohar' | 'halacha' | 'mussar' | 'haftarah';

export type HaftarahVariant = 'sephardi' | 'ashkenazi';

export type ChokDoubleChoice = 'first' | 'second' | 'both';

export type ChokThuNightDay = 'thu' | 'fri';

export type ChokSection = {
  kind: ChokSectionKind;
  heading: string;
  // The English title when it is not the kind's (Shnayim Mikra's aliyot).
  en?: string;
  variant?: HaftarahVariant;
  segments: SiddurSegment[];
};

export type ChokAsset = {
  parasha: string;
  credit: SiddurCredit;
  // Every credit of an asset built from more than one source (Shnayim Mikra: the Torah and Onkelos).
  credits?: SiddurCredit[];
  dedication: string | null;
  slots: Partial<Record<ChokSlot, ChokSection[]>>;
};

export type ChokManifestFile = AddonManifestFile;

export type ChokManifest = AddonManifest & {
  credit: { he: string; en: string };
  license: { name: string; url: string; urlHe: string };
  bytes?: number;
  files?: Record<string, ChokManifestFile>;
};

export type ChokInstall = AddonInstall;

export type ChokFailureReason = AddonFailureReason;

export type ChokDownload = AddonDownload;
