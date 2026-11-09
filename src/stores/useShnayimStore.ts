import { create } from 'zustand';
import { persist, createJSONStorage } from './zustandMiddleware';
import { createZustandStorage } from '@/services/StorageService';
import { shnayimInstallPresent } from '@/services/shnayimFiles';
import { AddonStoreState, IDLE_DOWNLOAD, mergeSavedAddonState, selectAddonUpdateAvailable } from './addonState';
import { STORE_VERSION, migrate, onRehydrateStorage } from './persistOptions';

type ShnayimState = AddonStoreState & {
  enablePrompt: boolean;
  setEnablePrompt: (pending: boolean) => void;
  reset: () => void;
};

export const selectShnayimUpdateAvailable = selectAddonUpdateAvailable;

export const mergeSavedShnayimState = (persisted: unknown, current: ShnayimState): ShnayimState => ({
  ...mergeSavedAddonState(persisted, current, shnayimInstallPresent),
  enablePrompt: false,
});

// The Shnayim Mikra add-on, device-only like chok-store: what is installed, the latest version seen and when it was
// checked; the download and the post-download enable prompt live in memory only.
export const useShnayimStore = create<ShnayimState>()(
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
      name: 'shnayim-store',
      storage: createJSONStorage(() => createZustandStorage()),
      version: STORE_VERSION,
      migrate,
      onRehydrateStorage: onRehydrateStorage('shnayim-store'),
      partialize: ({ installed, latestVersion, checkedAt }) => ({ installed, latestVersion, checkedAt }),
      merge: mergeSavedShnayimState,
    },
  ),
);
