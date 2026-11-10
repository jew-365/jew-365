import { create } from 'zustand';
import { persist, createJSONStorage } from './zustandMiddleware';
import { createZustandStorage } from '@/services/StorageService';
import { halachaInstallPresent } from '@/services/halachaFiles';
import { HalachaPack } from '@/types/halacha';
import { AddonStoreState, IDLE_DOWNLOAD, mergeSavedAddonState, selectAddonUpdateAvailable } from './addonState';
import { STORE_VERSION, migrate, onRehydrateStorage } from './persistOptions';

type HalachaPackState = AddonStoreState & {
  enablePrompt: boolean;
  setEnablePrompt: (pending: boolean) => void;
  reset: () => void;
};

export const selectHalachaUpdateAvailable = selectAddonUpdateAvailable;

export const HALACHA_PACKS: readonly HalachaPack[] = ['kitzur', 'kitzur_en', 'ben_ish_chai', 'rambam'];

// One pack of the halacha add-on, device-only like chok-store (`halacha-<pack>-store`): what is installed, the latest
// version seen and when it was checked; the download and the post-download enable prompt live in memory only. Each
// pack has its own store, so the shared add-on core drives it as it drives Chok LeYisrael's.
function createHalachaPackStore(pack: HalachaPack) {
  const name = `halacha-${pack.replace(/_/g, '-')}-store`;
  return create<HalachaPackState>()(
    persist(
      (set) => ({
        installed: null,
        latestVersion: null,
        checkedAt: null,
        download: IDLE_DOWNLOAD,
        enablePrompt: false,
        setInstalled: (installed) => set({ installed }),
        clearInstalled: () => set({ installed: null, enablePrompt: false }),
        setChecked: (latestVersion, checkedAt) => set({ latestVersion, checkedAt }),
        setDownload: (download) => set({ download }),
        setEnablePrompt: (enablePrompt) => set({ enablePrompt }),
        reset: () =>
          set({ installed: null, latestVersion: null, checkedAt: null, download: IDLE_DOWNLOAD, enablePrompt: false }),
      }),
      {
        name,
        storage: createJSONStorage(() => createZustandStorage()),
        version: STORE_VERSION,
        migrate,
        onRehydrateStorage: onRehydrateStorage(name),
        partialize: ({ installed, latestVersion, checkedAt }) => ({ installed, latestVersion, checkedAt }),
        merge: (persisted, current) => ({
          ...mergeSavedAddonState(persisted, current, (install) => halachaInstallPresent(pack, install)),
          enablePrompt: false,
        }),
      },
    ),
  );
}

export type HalachaPackStore = ReturnType<typeof createHalachaPackStore>;

export const HALACHA_STORES: Readonly<Record<HalachaPack, HalachaPackStore>> = {
  kitzur: createHalachaPackStore('kitzur'),
  kitzur_en: createHalachaPackStore('kitzur_en'),
  ben_ish_chai: createHalachaPackStore('ben_ish_chai'),
  rambam: createHalachaPackStore('rambam'),
};

export function resetHalachaStores(): void {
  for (const pack of HALACHA_PACKS) HALACHA_STORES[pack].getState().reset();
}
