import {
  ADDON_SPACE_MARGIN_BYTES,
  AddonContent,
  AddonDownloadError,
  addonDownloadSupported,
  createAddonContent,
  isRecord,
} from '@/services/addons/addonContent';
import { HALACHA_DIRECTORY, HALACHA_SCHEDULE_FILE, halachaDirName } from '@/services/halachaFiles';
import { clearHalachaCache } from '@/services/SiddurService';
import { HALACHA_YOMIT_ID, HILCHOT_HACHAG_ID } from '@/data/halacha';
import { HALACHA_PACKS, HALACHA_STORES } from '@/stores/useHalachaStore';
import { canEnable, useMitzvotStore } from '@/stores/useMitzvotStore';
import { AddonManifest } from '@/types/addon';
import { HalachaManifest, HalachaPack, HalachaScheduleFile, HalachaTrack } from '@/types/halacha';

// The halacha add-on (.claude/specs/halacha-yomit.md, section 10): each track's Hebrew text, and the Kitzur's English,
// downloaded on request from GitHub Pages, one pack at a time, on the shared add-on core.
const HALACHA_SITE = 'https://jew-365.github.io/jew-365/halacha/';

export const HALACHA_BASE_URL: Readonly<Record<HalachaPack, string>> = {
  kitzur: `${HALACHA_SITE}kitzur/`,
  kitzur_en: `${HALACHA_SITE}kitzur/en/`,
  ben_ish_chai: `${HALACHA_SITE}ben_ish_chai/`,
  rambam: `${HALACHA_SITE}rambam/`,
};

export const HALACHA_FORMAT = 1;

// The download each pack costs before its manifest is fetched; a test pins them to the published manifests.
export const HALACHA_SIZE_ESTIMATE_MB: Readonly<Record<HalachaPack, number>> = {
  kitzur: 0.6,
  kitzur_en: 0.5,
  ben_ish_chai: 0.6,
  rambam: 2.4,
};

export const halachaSpaceNeededMb = (pack: HalachaPack): number =>
  HALACHA_SIZE_ESTIMATE_MB[pack] + ADDON_SPACE_MARGIN_BYTES / 1_000_000;

// The packs a track downloads in a language: its Hebrew, and the English of a track that has one in English.
export const HALACHA_ENGLISH_PACK: Readonly<Partial<Record<HalachaTrack, HalachaPack>>> = { kitzur: 'kitzur_en' };

export const halachaDownloadSupported = addonDownloadSupported;

// The enable prompt's yes after a first download: both halacha mitzvot on, each with its default reminder if it has none.
export function switchHalachaOn(): void {
  for (const id of [HALACHA_YOMIT_ID, HILCHOT_HACHAG_ID]) {
    if (!canEnable(id)) useMitzvotStore.getState().resetToDefault(id);
    useMitzvotStore.getState().setEnabled(id, true);
  }
}

const unavailable = () => new AddonDownloadError('unavailable');

const isLabel = (value: unknown): boolean =>
  isRecord(value) && typeof value.he === 'string' && typeof value.en === 'string';

// A Hebrew manifest's keys are its units; it must name the track it is for and carry a schedule of a known kind.
function trackKeys(track: HalachaTrack) {
  return (raw: Record<string, unknown>): readonly string[] => {
    const { units, schedule, festivals } = raw;
    if (raw.track !== track || !isLabel(raw.credit) || !isRecord(units) || !isRecord(festivals)) throw unavailable();
    if (!isRecord(schedule) || !['hebrew', 'cycle', 'parasha'].includes(schedule.kind as string)) throw unavailable();
    return Object.keys(units);
  };
}

const englishKeys = (raw: Record<string, unknown>): readonly string[] => {
  if (raw.track !== 'kitzur' || !isLabel(raw.credit) || !isRecord(raw.gz)) throw unavailable();
  return Object.keys(raw.gz);
};

// What a Hebrew install keeps of its manifest beside the units, for the windows and the reader.
function scheduleFile(manifest: AddonManifest): Record<string, string> {
  const { track, version, book, credit, credits, units, schedule, festivals } = manifest as HalachaManifest;
  const kept: HalachaScheduleFile = { track, version, book, credit, credits, units, schedule, festivals };
  return { [HALACHA_SCHEDULE_FILE]: JSON.stringify(kept) };
}

function createPack(pack: HalachaPack): AddonContent<AddonManifest> {
  const english = pack === 'kitzur_en';
  const store = HALACHA_STORES[pack];
  return createAddonContent<AddonManifest>({
    baseUrl: HALACHA_BASE_URL[pack],
    root: HALACHA_DIRECTORY[pack],
    format: HALACHA_FORMAT,
    keys: english ? englishKeys : trackKeys(pack as HalachaTrack),
    gzPath: /^[a-z0-9]+(-[a-z0-9]+)*\.[0-9a-f]{8}\.json\.gz$/,
    dirName: halachaDirName,
    extraFiles: english ? undefined : scheduleFile,
    store,
    clearCache: () => clearHalachaCache(pack),
    onInstalled: (previous) => {
      if (!english && previous === null) store.getState().setEnablePrompt(true);
    },
  });
}

const PACKS: Readonly<Record<HalachaPack, AddonContent<AddonManifest>>> = {
  kitzur: createPack('kitzur'),
  kitzur_en: createPack('kitzur_en'),
  ben_ish_chai: createPack('ben_ish_chai'),
  rambam: createPack('rambam'),
};

export const parseHalachaManifest = (pack: HalachaPack, raw: unknown) => PACKS[pack].parseManifest(raw);
export const prepareHalachaDownload = (pack: HalachaPack) => PACKS[pack].prepareDownload();
export const installHalacha = (pack: HalachaPack, manifest: AddonManifest) => PACKS[pack].install(manifest);
export const cancelHalachaDownload = (pack: HalachaPack) => PACKS[pack].cancel();
export const deleteHalacha = (pack: HalachaPack) => PACKS[pack].remove();
export const checkHalachaUpdate = (pack: HalachaPack, now?: number, force?: boolean) =>
  PACKS[pack].checkUpdate(now, force);
export const verifyHalachaInstall = (pack: HalachaPack, readError?: unknown) => PACKS[pack].verifyInstall(readError);

// At launch and after a restore: every pack forgets an install whose files are gone and clears its leftovers.
export function reconcileHalachaInstalls(): void {
  for (const pack of HALACHA_PACKS) PACKS[pack].reconcile();
}

export function cancelHalachaDownloads(): void {
  for (const pack of HALACHA_PACKS) PACKS[pack].cancel();
}
