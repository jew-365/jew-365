import { AddonDownload, AddonInstall } from '@/types/addon';

export type AddonStoreState = {
  installed: AddonInstall | null;
  latestVersion: number | null;
  checkedAt: number | null;
  download: AddonDownload;
  setInstalled: (install: AddonInstall) => void;
  clearInstalled: () => void;
  setChecked: (version: number, at: number) => void;
  setDownload: (download: AddonDownload) => void;
};

export type AddonStoreApi = { getState: () => AddonStoreState };

export const IDLE_DOWNLOAD: AddonDownload = Object.freeze({ status: 'idle' });

export const selectAddonUpdateAvailable = (s: Pick<AddonStoreState, 'installed' | 'latestVersion'>): boolean =>
  s.installed !== null && s.latestVersion !== null && s.latestVersion > s.installed.version;

// An Android restore carries a store in the main MMKV file but not the add-on files under files/<root>,
// so an install whose files are gone is dropped on hydrate.
export function mergeSavedAddonState<S extends AddonStoreState>(
  persisted: unknown,
  current: S,
  present: (install: AddonInstall) => boolean,
): S {
  const saved = persisted as Partial<S> | undefined;
  return {
    ...current,
    ...saved,
    installed: saved?.installed && present(saved.installed) ? saved.installed : null,
    download: IDLE_DOWNLOAD,
  };
}
