import { create } from 'zustand';
import { persist, createJSONStorage } from './zustandMiddleware';
import { createZustandStorage } from '@/services/StorageService';
import { STORE_VERSION, migrate, onRehydrateStorage } from './persistOptions';
import { useUserStore } from './useUserStore';
import { MITZVOT } from '@/data/mitzvot';
import { findAnyMitzvah } from '@/data/customMitzvotAdapter';
import { Mitzvah, Reminder } from '@/types/mitzvah';

export type ActiveMitzvahState = {
  enabled: boolean;
  customReminders?: Reminder[];
  // When it was last switched on. Missing means since before this was recorded, so a history that
  // predates it is judged as before; a later switch-on never turns earlier days into misses.
  enabledAt?: number;
};

function switchedTo(current: ActiveMitzvahState | undefined, enabled: boolean): ActiveMitzvahState {
  const turnedOn = enabled && !current?.enabled;
  return { ...(current ?? {}), enabled, ...(turnedOn ? { enabledAt: Date.now() } : {}) };
}

// A missing entry reads as switched off. One frozen object, because a zustand selector that returns a
// fresh `{ enabled: false }` on every snapshot makes useSyncExternalStore re-render without end.
export const INACTIVE: ActiveMitzvahState = Object.freeze({ enabled: false });

export const selectActive =
  (id: string) =>
  (state: { activeMitzvot: Record<string, ActiveMitzvahState> }): ActiveMitzvahState =>
    state.activeMitzvot[id] ?? INACTIVE;

// The switch-on time of every mitzvah that has one, for the history and the check-in.
export function enabledSinceOf(active: Record<string, ActiveMitzvahState>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(active).flatMap(([id, state]) => (state.enabledAt ? [[id, state.enabledAt]] : [])),
  );
}

type MitzvotState = {
  activeMitzvot: Record<string, ActiveMitzvahState>;
  setEnabled: (id: string, enabled: boolean) => void;
  stampEnabledNow: (id: string) => void;
  toggleEnabled: (id: string) => void;
  setReminders: (id: string, reminders: Reminder[]) => void;
  resetToDefault: (id: string) => void;
  getEnabledIds: () => string[];
  removeMitzvah: (id: string) => void;
  reset: () => void;
};

export const DEFAULT_ON_MITZVOT: readonly string[] = [
  'tefillin',
  'krias_shma_shacharit',
  'shacharit',
  'mincha',
  'maariv',
  'krias_shma_al_hamita',
  'kiddush_levana',
  'selichot',
  'chanukah_candles',
  'ushpizin',
];

const DEFAULT_ACTIVE: Record<string, ActiveMitzvahState> = Object.fromEntries(
  MITZVOT.filter((m) => DEFAULT_ON_MITZVOT.includes(m.id)).map((m) => [m.id, { enabled: true }]),
);

// An onboarded install that never wrote this store (a man or an unanswered gender, who touched nothing
// in the library) ran exactly these defaults, so its hydrate starts from them and stamps only the newer
// default-on ids; a fresh install starts from nothing, so every default-on id is stamped with its first launch.
const INSTALLED_DEFAULTS: Record<string, ActiveMitzvahState> = Object.fromEntries(
  ['tefillin', 'krias_shma_shacharit', 'shacharit', 'mincha', 'maariv'].map((id) => [id, { enabled: true }]),
);

const unsavedStart = (): Record<string, ActiveMitzvahState> =>
  useUserStore.getState().isOnboarded ? INSTALLED_DEFAULTS : {};

const RETIRED_MITZVOT = ['tzitzit'];

const withoutRetired = (active: Record<string, ActiveMitzvahState>) =>
  Object.fromEntries(Object.entries(active).filter(([id]) => !RETIRED_MITZVOT.includes(id)));

const withoutEmptyReminders = (active: Record<string, ActiveMitzvahState>) =>
  Object.fromEntries(
    Object.entries(active).map(([id, { customReminders, ...state }]) => [
      id,
      customReminders?.length ? { ...state, customReminders } : state,
    ]),
  );

for (const m of MITZVOT) {
  if (!(m.id in DEFAULT_ACTIVE)) DEFAULT_ACTIVE[m.id] = { enabled: false };
}

let addedOnHydrate: string[] = [];

const defaultsOnMissingFrom = (saved: Record<string, ActiveMitzvahState>): string[] =>
  Object.keys(DEFAULT_ACTIVE).filter((id) => DEFAULT_ACTIVE[id].enabled && !(id in saved));

export const useMitzvotStore = create<MitzvotState>()(
  persist(
    (set, get) => ({
      activeMitzvot: DEFAULT_ACTIVE,
      setEnabled: (id, enabled) =>
        set((s) =>
          enabled && !s.activeMitzvot[id]?.enabled && !canEnable(id)
            ? s
            : { activeMitzvot: { ...s.activeMitzvot, [id]: switchedTo(s.activeMitzvot[id], enabled) } },
        ),
      stampEnabledNow: (id) =>
        set((s) =>
          s.activeMitzvot[id]?.enabled
            ? { activeMitzvot: { ...s.activeMitzvot, [id]: { ...s.activeMitzvot[id], enabledAt: Date.now() } } }
            : s,
        ),
      toggleEnabled: (id) => get().setEnabled(id, !get().activeMitzvot[id]?.enabled),
      setReminders: (id, reminders) =>
        set((s) =>
          reminders.length === 0 && s.activeMitzvot[id]?.enabled
            ? s
            : {
                activeMitzvot: {
                  ...s.activeMitzvot,
                  [id]: { ...(s.activeMitzvot[id] ?? { enabled: false }), customReminders: reminders },
                },
              },
        ),
      resetToDefault: (id) =>
        set((s) => {
          const next = { ...s.activeMitzvot };
          next[id] = { enabled: next[id]?.enabled ?? false, enabledAt: next[id]?.enabledAt };
          return { activeMitzvot: next };
        }),
      getEnabledIds: () =>
        Object.entries(get().activeMitzvot)
          .filter(([, v]) => v.enabled)
          .map(([id]) => id),
      removeMitzvah: (id) =>
        set((s) => {
          const next = { ...s.activeMitzvot };
          delete next[id];
          return { activeMitzvot: next };
        }),
      reset: () => set({ activeMitzvot: { ...DEFAULT_ACTIVE } }),
    }),
    {
      name: 'mitzvot-store',
      storage: createJSONStorage(() => createZustandStorage()),
      version: STORE_VERSION,
      migrate,
      onRehydrateStorage: onRehydrateStorage('mitzvot-store'),
      // A mitzvah shipped in a later release has no key in a persisted map, so `active[id]?.enabled`
      // is undefined forever and the mitzvah is invisible. Union the defaults back in on hydrate; a
      // default-on one is stamped now, so the days before this hydrate are never judged as missed.
      merge: (persisted: unknown, current: MitzvotState): MitzvotState => {
        const saved = persisted as Partial<MitzvotState> | undefined;
        const kept = withoutEmptyReminders(withoutRetired(saved?.activeMitzvot ?? unsavedStart()));
        addedOnHydrate = defaultsOnMissingFrom(kept);
        const stampedAt = Date.now();
        const added = Object.fromEntries(addedOnHydrate.map((id) => [id, { enabled: true, enabledAt: stampedAt }]));
        return { ...current, ...saved, activeMitzvot: { ...DEFAULT_ACTIVE, ...added, ...kept } };
      },
    },
  ),
);

export function remindersOf(
  state: ActiveMitzvahState | undefined,
  mitzvah: Pick<Mitzvah, 'defaultReminders'> | undefined,
): Reminder[] {
  return state?.customReminders ?? mitzvah?.defaultReminders ?? [];
}

export function effectiveReminders(id: string): Reminder[] {
  return remindersOf(useMitzvotStore.getState().activeMitzvot[id], findAnyMitzvah(id));
}

export function canEnable(id: string): boolean {
  return effectiveReminders(id).length > 0;
}

// A hydrate writes nothing while the saved version matches, so the stamps are saved here, once
// `applyGenderDefaultsToNew()` takes them as the native scheduler module loads (the root layout on web).
export function takeAddedOnHydrate(): string[] {
  const added = addedOnHydrate;
  addedOnHydrate = [];
  if (added.length) useMitzvotStore.setState({ activeMitzvot: { ...useMitzvotStore.getState().activeMitzvot } });
  return added;
}
