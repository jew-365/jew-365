jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

import { textBookmarks, textLastPosition, useSiddurBookmarksStore } from '../useSiddurBookmarksStore';
import type { SiddurBookmark, SiddurLastPosition } from '@/types/siddur';

const ENTRY = {
  textId: 'tehillim',
  nusach: null,
  sectionTitle: 'ליום ראשון',
  segmentKey: 'abcdefghij',
  label: 'ליום ראשון · אַשְׁרֵי הָאִישׁ',
};
const POSITION = (segmentKey: string): SiddurLastPosition => ({
  nusach: null,
  sectionTitle: 'ליום ראשון',
  segmentKey,
  appDay: '2026-10-28',
  savedAt: 1,
});

const state = () => useSiddurBookmarksStore.getState();

describe('the siddur bookmarks store', () => {
  beforeEach(() => state().reset());

  it('adds a bookmark with an id and a creation time, newest first', () => {
    state().addBookmark(ENTRY, 1000);
    state().addBookmark({ ...ENTRY, segmentKey: 'klmnopqrst' }, 2000);
    expect(state().bookmarks.map((b) => b.createdAt)).toEqual([2000, 1000]);
    expect(state().bookmarks[0].id).toMatch(/^bookmark_2000_[a-z0-9]+$/);
  });

  it('replaces a bookmark at the same text, nusach and segment', () => {
    state().addBookmark(ENTRY, 1000);
    state().addBookmark(ENTRY, 2000);
    expect(state().bookmarks).toHaveLength(1);
    expect(state().bookmarks[0].createdAt).toBe(2000);
    state().addBookmark({ ...ENTRY, nusach: 'sefard' }, 3000);
    expect(state().bookmarks).toHaveLength(2);
  });

  it('moves a bookmark to a new place under its id, newest first, absorbing one already there', () => {
    const moved = state().addBookmark(ENTRY, 1000);
    const there = state().addBookmark({ ...ENTRY, segmentKey: 'klmnopqrst', label: 'שם' }, 2000);
    const other = state().addBookmark({ ...ENTRY, segmentKey: 'uvwxyzabcd' }, 3000);
    state().replaceBookmark(moved.id, { ...ENTRY, segmentKey: 'klmnopqrst', label: 'חדש' }, 4000);
    expect(state().bookmarks).toEqual([
      { ...ENTRY, segmentKey: 'klmnopqrst', label: 'חדש', id: moved.id, createdAt: 4000 },
      other,
    ]);
    expect(state().bookmarks.some((b) => b.id === there.id)).toBe(false);
  });

  it('ignores a move of a bookmark that no longer exists', () => {
    const kept = state().addBookmark(ENTRY, 1000);
    state().replaceBookmark('bookmark_gone', { ...ENTRY, segmentKey: 'klmnopqrst' }, 2000);
    expect(state().bookmarks).toEqual([kept]);
  });

  it('removes only the bookmark named', () => {
    const first = state().addBookmark(ENTRY, 1000);
    const second = state().addBookmark({ ...ENTRY, segmentKey: 'klmnopqrst' }, 2000);
    state().removeBookmark(first.id);
    expect(state().bookmarks).toEqual([second]);
  });

  it('keeps one last position per text and clears it', () => {
    const first = POSITION('abcdefghij');
    const second = POSITION('klmnopqrst');
    state().saveLastPosition('tehillim', first);
    state().saveLastPosition('tehillim', second);
    expect(state().lastPositions).toEqual({ tehillim: second });
    state().clearLastPosition('tehillim');
    expect(state().lastPositions).toEqual({});
    const before = state();
    state().clearLastPosition('maariv');
    expect(state()).toBe(before);
  });

  it('matches a text by id and nusach', () => {
    const bookmark = (textId: string, nusach: SiddurBookmark['nusach'], createdAt: number): SiddurBookmark => ({
      ...ENTRY,
      id: `bookmark_${createdAt}`,
      textId,
      nusach,
      createdAt,
    });
    const list = [
      bookmark('tehillim', null, 1),
      bookmark('tehillim', 'ashkenaz', 2),
      bookmark('tehillim', null, 3),
      bookmark('maariv', null, 4),
    ];
    expect(textBookmarks(list, 'tehillim', null).map((b) => b.createdAt)).toEqual([3, 1]);
    expect(textBookmarks(list, 'tehillim', 'ashkenaz').map((b) => b.createdAt)).toEqual([2]);
    const position = POSITION('abcdefghij');
    expect(textLastPosition({ tehillim: position }, 'tehillim', 'ashkenaz')).toBeNull();
    expect(textLastPosition({ tehillim: position }, 'tehillim', null)).toBe(position);
    expect(textLastPosition({ tehillim: position }, 'maariv', null)).toBeNull();
  });

  it('resets both', () => {
    state().addBookmark(ENTRY, 1000);
    state().saveLastPosition('tehillim', POSITION('abcdefghij'));
    state().reset();
    expect(state().bookmarks).toEqual([]);
    expect(state().lastPositions).toEqual({});
  });
});
