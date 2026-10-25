import { Directory, File } from 'expo-file-system';
import { addonInstallDirectory, addonInstallPresent, deleteAddonFiles } from '@/services/addons/addonFiles';
import { AddonInstall } from '@/types/addon';
import { Nusach } from '@/types/mitzvah';

export const SELICHOT_DIRECTORY = 'selichot';

export const selichotDirName = (version: number, keys: readonly string[]): string => `${keys[0]}-v${version}`;

export function selichotInstallDirectory(install: AddonInstall): Directory {
  return addonInstallDirectory(SELICHOT_DIRECTORY, selichotDirName(install.version, Object.keys(install.files)));
}

export function selichotTextFile(install: AddonInstall, nusach: Nusach): File | null {
  const path = install.files[nusach];
  return path ? new File(selichotInstallDirectory(install), path) : null;
}

export function selichotInstallPresent(install: AddonInstall): boolean {
  return addonInstallPresent(SELICHOT_DIRECTORY, selichotDirName(install.version, Object.keys(install.files)), install);
}

export function deleteSelichotFiles(): void {
  deleteAddonFiles(SELICHOT_DIRECTORY);
}
