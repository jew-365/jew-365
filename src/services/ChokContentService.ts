import {
  ADDON_CHECK_INTERVAL_MS,
  ADDON_FILE_ATTEMPTS,
  ADDON_REQUEST_TIMEOUT_MS,
  ADDON_RETRY_DELAY_MS,
  ADDON_SPACE_MARGIN_BYTES,
  AddonDownloadError,
  addonDownloadSupported,
  addonEntriesBytes,
  addonMegabytes,
  createAddonContent,
  isRecord,
} from '@/services/addons/addonContent';
import { CHOK_DIRECTORY, chokDirName } from '@/services/chokFiles';
import { clearChokCache } from '@/services/SiddurService';
import { CHOK_PARASHIYOT, CHOK_TEXT_ID } from '@/data/chok';
import { useChokStore } from '@/stores/useChokStore';
import { canEnable, selectActive, useMitzvotStore } from '@/stores/useMitzvotStore';
import { ChokManifest } from '@/types/chok';

export const CHOK_BASE_URL = 'https://jew-365.github.io/jew-365/chok/';
export const CHOK_MANIFEST_URL = `${CHOK_BASE_URL}manifest.json`;
export const CHOK_FORMAT = 1;
export const CHOK_FILE_ATTEMPTS = ADDON_FILE_ATTEMPTS;
export const CHOK_RETRY_DELAY_MS = ADDON_RETRY_DELAY_MS;
export const CHOK_REQUEST_TIMEOUT_MS = ADDON_REQUEST_TIMEOUT_MS;
export const CHOK_CHECK_INTERVAL_MS = ADDON_CHECK_INTERVAL_MS;
export const CHOK_SPACE_MARGIN_BYTES = ADDON_SPACE_MARGIN_BYTES;
export const CHOK_SIZE_ESTIMATE_MB = 5;
export const CHOK_SPACE_NEEDED_MB = CHOK_SIZE_ESTIMATE_MB + CHOK_SPACE_MARGIN_BYTES / 1_000_000;

const PATH_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*\.[0-9a-f]{8}\.json$/;
const GZ_PATH_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*\.[0-9a-f]{8}\.json\.gz$/;

export { AddonDownloadError as ChokDownloadError };

export const chokDownloadSupported = addonDownloadSupported;

export const chokMegabytes = addonMegabytes;

function parseChokExtra(raw: Record<string, unknown>): void {
  const unavailable = () => new AddonDownloadError('unavailable');
  const { credit, license, bytes, files } = raw;
  if (!isRecord(credit) || typeof credit.he !== 'string' || typeof credit.en !== 'string') throw unavailable();
  if (
    !isRecord(license) ||
    typeof license.name !== 'string' ||
    typeof license.url !== 'string' ||
    typeof license.urlHe !== 'string'
  ) {
    throw unavailable();
  }
  if (files !== undefined && bytes !== addonEntriesBytes(files, CHOK_PARASHIYOT, PATH_PATTERN)) throw unavailable();
}

function switchChokOff(): void {
  if (selectActive(CHOK_TEXT_ID)(useMitzvotStore.getState()).enabled) {
    useMitzvotStore.getState().setEnabled(CHOK_TEXT_ID, false);
  }
}

export function switchChokOn(): void {
  if (!canEnable(CHOK_TEXT_ID)) useMitzvotStore.getState().resetToDefault(CHOK_TEXT_ID);
  useMitzvotStore.getState().setEnabled(CHOK_TEXT_ID, true);
}

function askToEnableChok(): void {
  if (!selectActive(CHOK_TEXT_ID)(useMitzvotStore.getState()).enabled) useChokStore.getState().setEnablePrompt(true);
}

const chok = createAddonContent<ChokManifest>({
  baseUrl: CHOK_BASE_URL,
  root: CHOK_DIRECTORY,
  format: CHOK_FORMAT,
  keys: CHOK_PARASHIYOT,
  gzPath: GZ_PATH_PATTERN,
  parseExtra: parseChokExtra,
  dirName: chokDirName,
  store: useChokStore,
  clearCache: clearChokCache,
  onForget: switchChokOff,
  onNothingInstalled: switchChokOff,
  onInstalled: (previous) => {
    if (previous === null) askToEnableChok();
  },
});

export const parseChokManifest = chok.parseManifest;
export const fetchChokManifest = chok.fetchManifest;
export const prepareChokDownload = chok.prepareDownload;
export const cancelChokDownload = chok.cancel;
export const deleteChok = chok.remove;
export const checkChokUpdate = chok.checkUpdate;
export const verifyChokInstall = chok.verifyInstall;
export const reconcileChokInstall = chok.reconcile;

export function installChok(manifest: ChokManifest): Promise<boolean> {
  return chok.install(manifest);
}
