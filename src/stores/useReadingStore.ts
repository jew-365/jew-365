import { create } from 'zustand';
import { persist, createJSONStorage } from './zustandMiddleware';
import { createZustandStorage } from '@/services/StorageService';
import { STORE_VERSION, migrate, onRehydrateStorage } from './persistOptions';
import { PSALM_COUNT, type ReadingCounts } from '@/utils/reading';

type ReadingState = ReadingCounts & {
  // One read of a whole text on an app day (`YYYY-MM-DD`).
  addTextRead: (day: string, textId: string) => void;
  // One read of psalm `n` (1 to 150) on an app day.
  addPsalmRead: (day: string, n: number) => void;
  reset: () => void;
};

const bump = (days: Record<string, Record<string, number>>, day: string, key: string) => ({
  ...days,
  [day]: { ...days[day], [key]: (days[day]?.[key] ?? 0) + 1 },
});

const isCountMap = (value: unknown): value is Record<string, Record<string, number>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Keeps only positive whole counts under day keys, so a damaged payload never reaches the card.
function cleanDays(value: unknown): Record<string, Record<string, number>> {
  if (!isCountMap(value)) return {};
  const out: Record<string, Record<string, number>> = {};
  for (const [day, entries] of Object.entries(value)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !isCountMap(entries)) continue;
    const kept: Record<string, number> = {};
    for (const [key, count] of Object.entries(entries)) {
      if (Number.isInteger(count) && (count as number) > 0) kept[key] = count as number;
    }
    if (Object.keys(kept).length) out[day] = kept;
  }
  return out;
}

export const useReadingStore = create<ReadingState>()(
  persist(
    (set) => ({
      texts: {},
      psalms: {},
      addTextRead: (day, textId) => set((s) => ({ texts: bump(s.texts, day, textId) })),
      addPsalmRead: (day, n) => {
        if (!Number.isInteger(n) || n < 1 || n > PSALM_COUNT) return;
        set((s) => ({ psalms: bump(s.psalms, day, String(n)) }));
      },
      reset: () => set({ texts: {}, psalms: {} }),
    }),
    {
      name: 'reading-store',
      storage: createJSONStorage(() => createZustandStorage()),
      version: STORE_VERSION,
      migrate,
      partialize: (s) => ({ texts: s.texts, psalms: s.psalms }),
      merge: (saved, current) => {
        const state = (saved ?? {}) as Partial<ReadingCounts>;
        return { ...current, texts: cleanDays(state.texts), psalms: cleanDays(state.psalms) };
      },
      onRehydrateStorage: onRehydrateStorage('reading-store'),
    },
  ),
);
