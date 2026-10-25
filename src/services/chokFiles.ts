import { Directory, File } from 'expo-file-system';
import {
  ADDON_GZIP_SUFFIX,
  AddonFileCorruptError,
  addonInstallDirectory,
  addonInstallPresent,
  addonRootDirectory,
  deleteAddonFiles,
  readAddonJson,
} from '@/services/addons/addonFiles';
import { ChokAsset, ChokInstall } from '@/types/chok';

export const CHOK_DIRECTORY = 'chok';

export const chokDirName = (version: number): string => `v${version}`;

export function chokRootDirectory(): Directory {
  return addonRootDirectory(CHOK_DIRECTORY);
}

export function chokVersionDirectory(version: number): Directory {
  return addonInstallDirectory(CHOK_DIRECTORY, chokDirName(version));
}

export function chokParashaFile(install: ChokInstall, parasha: string): File | null {
  const path = install.files[parasha];
  return path ? new File(chokVersionDirectory(install.version), path) : null;
}

export const CHOK_GZIP_SUFFIX = ADDON_GZIP_SUFFIX;

export { AddonFileCorruptError as ChokFileCorruptError };

export function readChokAsset(file: File): Promise<ChokAsset> {
  return readAddonJson<ChokAsset>(file);
}

export function chokInstallPresent(install: ChokInstall): boolean {
  return addonInstallPresent(CHOK_DIRECTORY, chokDirName(install.version), install);
}

export function deleteChokFiles(): void {
  deleteAddonFiles(CHOK_DIRECTORY);
}
