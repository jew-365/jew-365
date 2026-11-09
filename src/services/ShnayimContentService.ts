import {
  ADDON_SPACE_MARGIN_BYTES,
  AddonDownloadError,
  addonDownloadSupported,
  createAddonContent,
  isRecord,
} from '@/services/addons/addonContent';
import { SHNAYIM_DIRECTORY, shnayimDirName } from '@/services/shnayimFiles';
import { clearShnayimCache } from '@/services/SiddurService';
import { CHOK_PARASHIYOT } from '@/data/chok';
import { SHNAYIM_TEXT_ID } from '@/data/shnayim';
import { canEnable, selectActive, useMitzvotStore } from '@/stores/useMitzvotStore';
import { useShnayimStore } from '@/stores/useShnayimStore';
import { ShnayimManifest } from '@/types/shnayim';

export const SHNAYIM_BASE_URL = 'https://jew-365.github.io/jew-365/shnayim/';
export const SHNAYIM_FORMAT = 1;
export const SHNAYIM_SIZE_ESTIMATE_MB = 0.6;
export const SHNAYIM_SPACE_NEEDED_MB = SHNAYIM_SIZE_ESTIMATE_MB + ADDON_SPACE_MARGIN_BYTES / 1_000_000;

export const shnayimDownloadSupported = addonDownloadSupported;

function parseShnayimExtra(raw: Record<string, unknown>): void {
  const { credit } = raw;
  if (!isRecord(credit) || typeof credit.he !== 'string' || typeof credit.en !== 'string') {
    throw new AddonDownloadError('unavailable');
  }
}

function switchShnayimOff(): void {
  if (selectActive(SHNAYIM_TEXT_ID)(useMitzvotStore.getState()).enabled) {
    useMitzvotStore.getState().setEnabled(SHNAYIM_TEXT_ID, false);
  }
}

export function switchShnayimOn(): void {
  if (!canEnable(SHNAYIM_TEXT_ID)) useMitzvotStore.getState().resetToDefault(SHNAYIM_TEXT_ID);
  useMitzvotStore.getState().setEnabled(SHNAYIM_TEXT_ID, true);
}

const shnayim = createAddonContent<ShnayimManifest>({
  baseUrl: SHNAYIM_BASE_URL,
  root: SHNAYIM_DIRECTORY,
  format: SHNAYIM_FORMAT,
  keys: CHOK_PARASHIYOT,
  gzPath: /^[a-z0-9]+(-[a-z0-9]+)*\.[0-9a-f]{8}\.json\.gz$/,
  parseExtra: parseShnayimExtra,
  dirName: shnayimDirName,
  store: useShnayimStore,
  clearCache: clearShnayimCache,
  onForget: switchShnayimOff,
  onNothingInstalled: switchShnayimOff,
  onInstalled: (previous) => {
    if (previous === null && !selectActive(SHNAYIM_TEXT_ID)(useMitzvotStore.getState()).enabled) {
      useShnayimStore.getState().setEnablePrompt(true);
    }
  },
});

export const parseShnayimManifest = shnayim.parseManifest;
export const prepareShnayimDownload = shnayim.prepareDownload;
export const cancelShnayimDownload = shnayim.cancel;
export const deleteShnayim = shnayim.remove;
export const checkShnayimUpdate = shnayim.checkUpdate;
export const verifyShnayimInstall = shnayim.verifyInstall;
export const reconcileShnayimInstall = shnayim.reconcile;

export function installShnayim(manifest: ShnayimManifest): Promise<boolean> {
  return shnayim.install(manifest);
}
