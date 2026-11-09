import { File } from 'expo-file-system';
import {
  addonInstallDirectory,
  addonInstallPresent,
  deleteAddonFiles,
  readAddonJson,
} from '@/services/addons/addonFiles';
import { AddonInstall } from '@/types/addon';
import { ShnayimAsset } from '@/types/shnayim';

export const SHNAYIM_DIRECTORY = 'shnayim';

export const shnayimDirName = (version: number): string => `v${version}`;

export function shnayimParashaFile(install: AddonInstall, parasha: string): File | null {
  const path = install.files[parasha];
  return path ? new File(addonInstallDirectory(SHNAYIM_DIRECTORY, shnayimDirName(install.version)), path) : null;
}

export function readShnayimAsset(file: File): Promise<ShnayimAsset> {
  return readAddonJson<ShnayimAsset>(file);
}

export function shnayimInstallPresent(install: AddonInstall): boolean {
  return addonInstallPresent(SHNAYIM_DIRECTORY, shnayimDirName(install.version), install);
}

export function deleteShnayimFiles(): void {
  deleteAddonFiles(SHNAYIM_DIRECTORY);
}
