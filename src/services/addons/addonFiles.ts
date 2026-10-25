import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { gunzipSync, strFromU8 } from 'fflate';
import { AddonInstall } from '@/types/addon';

export const ADDON_GZIP_SUFFIX = '.gz';

export class AddonFileCorruptError extends Error {
  constructor(readonly uri: string) {
    super(`add-on file corrupt: ${uri}`);
    this.name = 'AddonFileCorruptError';
  }
}

export function addonRootDirectory(root: string): Directory {
  return new Directory(Paths.document, root);
}

export function addonInstallDirectory(root: string, name: string): Directory {
  return new Directory(Paths.document, root, name);
}

export async function readAddonJson<T>(file: File): Promise<T> {
  const raw = file.uri.endsWith(ADDON_GZIP_SUFFIX) ? await file.bytes() : await file.text();
  try {
    return JSON.parse(typeof raw === 'string' ? raw : strFromU8(gunzipSync(raw))) as T;
  } catch {
    throw new AddonFileCorruptError(file.uri);
  }
}

export function addonInstallPresent(root: string, name: string, install: AddonInstall): boolean {
  if (Platform.OS === 'web') return false;
  try {
    const paths = Object.values(install.files);
    if (paths.length === 0) return false;
    const directory = addonInstallDirectory(root, name);
    return directory.exists && paths.every((path) => new File(directory, path).exists);
  } catch {
    return false;
  }
}

export function deleteAddonFiles(root: string): void {
  const directory = addonRootDirectory(root);
  if (directory.exists) directory.delete();
}
