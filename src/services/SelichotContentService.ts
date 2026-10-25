import { SELICHOT_NUSCHAOT, SELICHOT_TEXT_ID } from '@/data/selichot';
import { ADDON_SPACE_MARGIN_BYTES, addonDownloadSupported, createAddonContent } from '@/services/addons/addonContent';
import { SELICHOT_DIRECTORY, selichotDirName } from '@/services/selichotFiles';
import { clearSelichotCache } from '@/services/SiddurService';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { AddonManifest } from '@/types/addon';
import { Nusach } from '@/types/mitzvah';

export const SELICHOT_BASE_URL = 'https://jew-365.github.io/jew-365/selichot/';
export const SELICHOT_MANIFEST_URL = `${SELICHOT_BASE_URL}manifest.json`;
export const SELICHOT_FORMAT = 1;
export const SELICHOT_SIZE_ESTIMATE_MB = 1;
export const SELICHOT_SPACE_NEEDED_MB = SELICHOT_SIZE_ESTIMATE_MB + ADDON_SPACE_MARGIN_BYTES / 1_000_000;

const selichot = createAddonContent<AddonManifest>({
  baseUrl: SELICHOT_BASE_URL,
  root: SELICHOT_DIRECTORY,
  format: SELICHOT_FORMAT,
  keys: SELICHOT_NUSCHAOT,
  gzPath: /^[a-z]+(_[a-z]+)*\.[0-9a-f]{8}\.siddur\.gz$/,
  dirName: selichotDirName,
  store: useSelichotStore,
  clearCache: clearSelichotCache,
  onInstalled: (previous, current) => {
    const [nusach] = Object.keys(current.files);
    if (previous?.files[nusach] === undefined) useMitzvotStore.getState().stampEnabledNow(SELICHOT_TEXT_ID);
  },
});

export const selichotDownloadSupported = addonDownloadSupported;

export const parseSelichotManifest = selichot.parseManifest;
export const fetchSelichotManifest = selichot.fetchManifest;
export const prepareSelichotDownload = selichot.prepareDownload;
export const cancelSelichotDownload = selichot.cancel;
export const deleteSelichot = selichot.remove;
export const checkSelichotUpdate = selichot.checkUpdate;
export const verifySelichotInstall = selichot.verifyInstall;
export const reconcileSelichotInstall = selichot.reconcile;

export function installSelichot(manifest: AddonManifest, nusach: Nusach): Promise<boolean> {
  return selichot.install(manifest, [nusach]);
}
