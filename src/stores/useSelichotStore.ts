import { create } from 'zustand';
import { persist, createJSONStorage } from './zustandMiddleware';
import { createZustandStorage } from '@/services/StorageService';
import { selichotInstallPresent } from '@/services/selichotFiles';
import { AddonStoreState, IDLE_DOWNLOAD, mergeSavedAddonState } from './addonState';
import { STORE_VERSION, migrate, onRehydrateStorage } from './persistOptions';
import { Nusach } from '@/types/mitzvah';

export type SelichotState = AddonStoreState & {
  dismissedSeason: number | null;
  dismissSeason: (year: number) => void;
  reset: () => void;
};

export const selectSelichotInstalledFor =
  (nusach: Nusach) =>
  (s: Pick<SelichotState, 'installed'>): boolean =>
    s.installed?.files[nusach] !== undefined;

export const selectSelichotNusach = (s: Pick<SelichotState, 'installed'>): Nusach | null =>
  (Object.keys(s.installed?.files ?? {})[0] as Nusach | undefined) ?? null;

export const mergeSavedSelichotState = (persisted: unknown, current: SelichotState): SelichotState =>
  mergeSavedAddonState(persisted, current, selichotInstallPresent);

export const useSelichotStore = create<SelichotState>()(
  persist(
    (set) => ({
      installed: null,
      latestVersion: null,
      checkedAt: null,
      download: IDLE_DOWNLOAD,
      dismissedSeason: null,
      setInstalled: (installed) => set({ installed }),
      clearInstalled: () => set({ installed: null }),
      setChecked: (latestVersion, checkedAt) => set({ latestVersion, checkedAt }),
      setDownload: (download) => set({ download }),
      dismissSeason: (dismissedSeason) => set({ dismissedSeason }),
      reset: () =>
        set({ installed: null, latestVersion: null, checkedAt: null, download: IDLE_DOWNLOAD, dismissedSeason: null }),
    }),
    {
      name: 'selichot-store',
      storage: createJSONStorage(() => createZustandStorage()),
      version: STORE_VERSION,
      migrate,
      onRehydrateStorage: onRehydrateStorage('selichot-store'),
      partialize: ({ installed, latestVersion, checkedAt, dismissedSeason }) => ({
        installed,
        latestVersion,
        checkedAt,
        dismissedSeason,
      }),
      merge: mergeSavedSelichotState,
    },
  ),
);
