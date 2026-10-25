import { create } from 'zustand';
import { persist, createJSONStorage } from './zustandMiddleware';
import { createZustandStorage } from '@/services/StorageService';
import { STORE_VERSION, migrate, onRehydrateStorage } from './persistOptions';
import { Nusach } from '@/types/mitzvah';
import { SiddurBookmark, SiddurLastPosition } from '@/types/siddur';

type NewBookmark = Omit<SiddurBookmark, 'id' | 'createdAt'>;

type SiddurBookmarksState = {
  bookmarks: SiddurBookmark[];
  lastPositions: Record<string, SiddurLastPosition>;
  addBookmark: (bookmark: NewBookmark, now?: number) => SiddurBookmark;
  removeBookmark: (id: string) => void;
  saveLastPosition: (textId: string, position: SiddurLastPosition) => void;
  clearLastPosition: (textId: string) => void;
  reset: () => void;
};

export function makeBookmarkId(now: number): string {
  return `bookmark_${now}_${Math.random().toString(36).slice(2, 8)}`;
}

const sameText = (entry: { textId: string; nusach: Nusach | null }, textId: string, nusach: Nusach | null) =>
  entry.textId === textId && entry.nusach === nusach;

export function textBookmarks(
  bookmarks: readonly SiddurBookmark[],
  textId: string,
  nusach: Nusach | null,
): SiddurBookmark[] {
  return bookmarks.filter((bookmark) => sameText(bookmark, textId, nusach)).sort((a, b) => b.createdAt - a.createdAt);
}

export function textLastPosition(
  lastPositions: Readonly<Record<string, SiddurLastPosition>>,
  textId: string,
  nusach: Nusach | null,
): SiddurLastPosition | null {
  const position = lastPositions[textId];
  return position && position.nusach === nusach ? position : null;
}

export const useSiddurBookmarksStore = create<SiddurBookmarksState>()(
  persist(
    (set) => ({
      bookmarks: [],
      lastPositions: {},
      addBookmark: (entry, now = Date.now()) => {
        const bookmark: SiddurBookmark = { ...entry, id: makeBookmarkId(now), createdAt: now };
        set((s) => ({
          bookmarks: [
            bookmark,
            ...s.bookmarks.filter(
              (b) => !(sameText(b, entry.textId, entry.nusach) && b.segmentKey === entry.segmentKey),
            ),
          ],
        }));
        return bookmark;
      },
      removeBookmark: (id) => set((s) => ({ bookmarks: s.bookmarks.filter((bookmark) => bookmark.id !== id) })),
      saveLastPosition: (textId, position) =>
        set((s) => ({ lastPositions: { ...s.lastPositions, [textId]: position } })),
      clearLastPosition: (textId) =>
        set((s) => {
          if (s.lastPositions[textId] === undefined) return s;
          const next = { ...s.lastPositions };
          delete next[textId];
          return { lastPositions: next };
        }),
      reset: () => set({ bookmarks: [], lastPositions: {} }),
    }),
    {
      name: 'siddur-bookmarks-store',
      storage: createJSONStorage(() => createZustandStorage()),
      version: STORE_VERSION,
      migrate,
      onRehydrateStorage: onRehydrateStorage('siddur-bookmarks-store'),
    },
  ),
);
