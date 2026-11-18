import {
  ADDON_SPACE_MARGIN_BYTES,
  AddonDownloadError,
  addonDownloadSupported,
  createAddonContent,
  isRecord,
} from '@/services/addons/addonContent';
import { MISHNA_DIRECTORY, mishnaDirName } from '@/services/mishnaFiles';
import { clearMishnaCache } from '@/services/SiddurService';
import { MISHNA_MITZVOT } from '@/data/mishna';
import { canEnable, selectActive, useMitzvotStore } from '@/stores/useMitzvotStore';
import { useMishnaStore } from '@/stores/useMishnaStore';
import { MishnaManifest } from '@/types/mishna';
import { MISHNA_TRACTATES } from '@/utils/mishna';

export const MISHNA_BASE_URL = 'https://jew-365.github.io/jew-365/mishna/';
export const MISHNA_FORMAT = 1;
export const MISHNA_SIZE_ESTIMATE_MB = 3;
export const MISHNA_SPACE_NEEDED_MB = MISHNA_SIZE_ESTIMATE_MB + ADDON_SPACE_MARGIN_BYTES / 1_000_000;

export const mishnaDownloadSupported = addonDownloadSupported;

function parseMishnaExtra(raw: Record<string, unknown>): void {
  const { credit } = raw;
  if (!isRecord(credit) || typeof credit.he !== 'string' || typeof credit.en !== 'string') {
    throw new AddonDownloadError('unavailable');
  }
}

const enabled = (id: string) => selectActive(id)(useMitzvotStore.getState()).enabled;

function switchMishnaOff(): void {
  for (const id of MISHNA_MITZVOT) if (enabled(id)) useMitzvotStore.getState().setEnabled(id, false);
}

export function switchMishnaOn(id: string): void {
  if (!canEnable(id)) useMitzvotStore.getState().resetToDefault(id);
  useMitzvotStore.getState().setEnabled(id, true);
}

// The mitzvah whose screen started the download, asked about once a first install lands while it is off.
let downloadingFor: string | null = null;

const mishna = createAddonContent<MishnaManifest>({
  baseUrl: MISHNA_BASE_URL,
  root: MISHNA_DIRECTORY,
  format: MISHNA_FORMAT,
  keys: MISHNA_TRACTATES,
  gzPath: /^[a-z0-9]+(-[a-z0-9]+)*\.[0-9a-f]{8}\.json\.gz$/,
  parseExtra: parseMishnaExtra,
  dirName: mishnaDirName,
  store: useMishnaStore,
  clearCache: clearMishnaCache,
  onForget: switchMishnaOff,
  onNothingInstalled: switchMishnaOff,
  onInstalled: (previous) => {
    if (previous === null && downloadingFor && !enabled(downloadingFor)) {
      useMishnaStore.getState().setEnablePrompt(downloadingFor);
    }
  },
});

export const parseMishnaManifest = mishna.parseManifest;
export const prepareMishnaDownload = mishna.prepareDownload;
export const cancelMishnaDownload = mishna.cancel;
export const deleteMishna = mishna.remove;
export const checkMishnaUpdate = mishna.checkUpdate;
export const verifyMishnaInstall = mishna.verifyInstall;
export const reconcileMishnaInstall = mishna.reconcile;

// `forMitzvah` is the mitzvah whose screen asked for the download, offered to be switched on when it lands.
export function installMishna(manifest: MishnaManifest, forMitzvah: string | null = null): Promise<boolean> {
  downloadingFor = forMitzvah;
  return mishna.install(manifest);
}
