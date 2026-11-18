import { create } from 'zustand';
import { persist, createJSONStorage } from './zustandMiddleware';
import { createZustandStorage } from '@/services/StorageService';
import { mishnaInstallPresent } from '@/services/mishnaFiles';
import { AddonStoreState, IDLE_DOWNLOAD, mergeSavedAddonState, selectAddonUpdateAvailable } from './addonState';
import { STORE_VERSION, migrate, onRehydrateStorage } from './persistOptions';

type MishnaState = AddonStoreState & {
  // The Mishnah mitzvah whose screen downloaded the add-on while it was off, until asked whether to switch it on.
  enablePrompt: string | null;
  setEnablePrompt: (mitzvahId: string | null) => void;
  reset: () => void;
};

export const selectMishnaUpdateAvailable = selectAddonUpdateAvailable;

export const mergeSavedMishnaState = (persisted: unknown, current: MishnaState): MishnaState => ({
  ...mergeSavedAddonState(persisted, current, mishnaInstallPresent),
  enablePrompt: null,
});

// The Mishnah add-on, device-only like shnayim-store: what is installed, the latest version seen and when it was
// checked; the download and the post-download enable prompt live in memory only.
export const useMishnaStore = create<MishnaState>()(
  persist(
    (set) => ({
      installed: null,
      latestVersion: null,
      checkedAt: null,
      download: IDLE_DOWNLOAD,
      enablePrompt: null,
      setInstalled: (installed) => set({ installed }),
      clearInstalled: () => set({ installed: null, enablePrompt: null }),
      setChecked: (latestVersion, checkedAt) => set({ latestVersion, checkedAt }),
      setDownload: (download) => set({ download }),
      setEnablePrompt: (enablePrompt) => set({ enablePrompt }),
      reset: () =>
        set({ installed: null, latestVersion: null, checkedAt: null, download: IDLE_DOWNLOAD, enablePrompt: null }),
    }),
    {
      name: 'mishna-store',
      storage: createJSONStorage(() => createZustandStorage()),
      version: STORE_VERSION,
      migrate,
      onRehydrateStorage: onRehydrateStorage('mishna-store'),
      partialize: ({ installed, latestVersion, checkedAt }) => ({ installed, latestVersion, checkedAt }),
      merge: mergeSavedMishnaState,
    },
  ),
);
