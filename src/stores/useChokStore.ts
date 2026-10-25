import { create } from 'zustand';
import { persist, createJSONStorage } from './zustandMiddleware';
import { createZustandStorage } from '@/services/StorageService';
import { chokInstallPresent } from '@/services/chokFiles';
import { IDLE_DOWNLOAD, mergeSavedAddonState, selectAddonUpdateAvailable } from './addonState';
import { STORE_VERSION, migrate, onRehydrateStorage } from './persistOptions';
import { ChokDownload, ChokInstall } from '@/types/chok';

export { IDLE_DOWNLOAD };

type ChokState = {
  installed: ChokInstall | null;
  latestVersion: number | null;
  checkedAt: number | null;
  download: ChokDownload;
  enablePrompt: boolean;
  setInstalled: (install: ChokInstall) => void;
  clearInstalled: () => void;
  setChecked: (version: number, at: number) => void;
  setDownload: (download: ChokDownload) => void;
  setEnablePrompt: (pending: boolean) => void;
  reset: () => void;
};

export const selectChokUpdateAvailable = selectAddonUpdateAvailable;

export const mergeSavedChokState = (persisted: unknown, current: ChokState): ChokState => ({
  ...mergeSavedAddonState(persisted, current, chokInstallPresent),
  enablePrompt: false,
});

export const useChokStore = create<ChokState>()(
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
      name: 'chok-store',
      storage: createJSONStorage(() => createZustandStorage()),
      version: STORE_VERSION,
      migrate,
      onRehydrateStorage: onRehydrateStorage('chok-store'),
      partialize: ({ installed, latestVersion, checkedAt }) => ({ installed, latestVersion, checkedAt }),
      merge: mergeSavedChokState,
    },
  ),
);
