import { File } from 'expo-file-system';
import {
  addonInstallDirectory,
  addonInstallPresent,
  deleteAddonFiles,
  readAddonJson,
} from '@/services/addons/addonFiles';
import { AddonInstall } from '@/types/addon';
import { MishnaAsset } from '@/types/mishna';

export const MISHNA_DIRECTORY = 'mishna';

export const mishnaDirName = (version: number): string => `v${version}`;

export function mishnaTractateFile(install: AddonInstall, tractate: string): File | null {
  const path = install.files[tractate];
  return path ? new File(addonInstallDirectory(MISHNA_DIRECTORY, mishnaDirName(install.version)), path) : null;
}

export function readMishnaAsset(file: File): Promise<MishnaAsset> {
  return readAddonJson<MishnaAsset>(file);
}

export function mishnaInstallPresent(install: AddonInstall): boolean {
  return addonInstallPresent(MISHNA_DIRECTORY, mishnaDirName(install.version), install);
}

export function deleteMishnaFiles(): void {
  deleteAddonFiles(MISHNA_DIRECTORY);
}
