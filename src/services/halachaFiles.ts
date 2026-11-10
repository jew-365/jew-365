import { File } from 'expo-file-system';
import {
  addonInstallDirectory,
  addonInstallPresent,
  deleteAddonFiles,
  readAddonJson,
} from '@/services/addons/addonFiles';
import { AddonInstall } from '@/types/addon';
import { HalachaEnglishUnit, HalachaPack, HalachaScheduleFile, HalachaUnit } from '@/types/halacha';

// Where each pack of the halacha add-on lives on the device: its own folder under the documents directory, because
// the shared core clears every other entry of a pack's root after an install.
export const HALACHA_DIRECTORY: Readonly<Record<HalachaPack, string>> = {
  kitzur: 'halacha-kitzur',
  kitzur_en: 'halacha-kitzur-en',
  ben_ish_chai: 'halacha-ben-ish-chai',
  rambam: 'halacha-rambam',
  chafetz_chaim: 'halacha-chafetz-chaim',
  chafetz_chaim_en: 'halacha-chafetz-chaim-en',
  shemirat_halashon: 'halacha-shemirat-halashon',
  shemirat_halashon_en: 'halacha-shemirat-halashon-en',
};

export const HALACHA_SCHEDULE_FILE = 'schedule.json';

export const halachaDirName = (version: number): string => `v${version}`;

const installDirectory = (pack: HalachaPack, install: AddonInstall) =>
  addonInstallDirectory(HALACHA_DIRECTORY[pack], halachaDirName(install.version));

export function halachaUnitFile(pack: HalachaPack, install: AddonInstall, unit: string): File | null {
  const path = install.files[unit];
  return path ? new File(installDirectory(pack, install), path) : null;
}

export function readHalachaUnit(file: File): Promise<HalachaUnit> {
  return readAddonJson<HalachaUnit>(file);
}

export function readHalachaEnglish(file: File): Promise<HalachaEnglishUnit> {
  return readAddonJson<HalachaEnglishUnit>(file);
}

// The schedule an install wrote beside its units, read at once (a window needs it while a plan is built); `null` when
// it cannot be read.
export function readHalachaScheduleSync(pack: HalachaPack, install: AddonInstall): HalachaScheduleFile | null {
  try {
    const file = new File(installDirectory(pack, install), HALACHA_SCHEDULE_FILE);
    return file.exists ? (JSON.parse(file.textSync()) as HalachaScheduleFile) : null;
  } catch {
    return null;
  }
}

export function halachaInstallPresent(pack: HalachaPack, install: AddonInstall): boolean {
  return addonInstallPresent(HALACHA_DIRECTORY[pack], halachaDirName(install.version), install);
}

export function deleteHalachaFiles(pack: HalachaPack): void {
  deleteAddonFiles(HALACHA_DIRECTORY[pack]);
}
