jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

jest.setTimeout(60000);

import { SIDDUR_CHAPTERS } from '../siddurChapters.generated';
import { SIDDUR_TEXT_IDS } from '../siddur';
import { readSiddurText, shippedTextIds, shipsText } from '@/testing/siddur';
import { chapterVisible, forMaritalStatus, forVoice, pickerEntries } from '@/utils/siddur';
import type { Nusach } from '@/types/mitzvah';
import type { SiddurSection } from '@/types/siddur';

const NUSCHAOT: Nusach[] = ['ashkenaz', 'sefard', 'edot_hamizrach', 'chabad'];

function titles(sections: SiddurSection[]): { he: string; en: string }[] {
  const seen = new Set<string>();
  return pickerEntries(sections)
    .filter((entry) => !seen.has(entry.title.he) && seen.add(entry.title.he))
    .map((entry) => ({ he: entry.title.he, en: entry.title.en }));
}

describe('the generated siddur chapter index', () => {
  it('has an entry for every text in every nusach that ships it, and none where it does not', () => {
    for (const id of SIDDUR_TEXT_IDS) {
      for (const nusach of NUSCHAOT) expect(SIDDUR_CHAPTERS[id]?.[nusach] !== undefined).toBe(shipsText(nusach, id));
    }
  });

  it.each(NUSCHAOT)('lists what the picker lists for every %s text', (nusach) => {
    for (const id of shippedTextIds(nusach, SIDDUR_TEXT_IDS)) {
      expect(SIDDUR_CHAPTERS[id]![nusach]!.map(({ he, en }) => ({ he, en }))).toEqual(
        titles(readSiddurText(nusach, id).sections),
      );
    }
  });

  it.each(NUSCHAOT)('shows each %s entry to exactly the readers whose text keeps it', (nusach) => {
    for (const id of shippedTextIds(nusach, SIDDUR_TEXT_IDS)) {
      const sections = readSiddurText(nusach, id).sections;
      for (const status of [null, 'married', 'single'] as const) {
        for (const voice of [null, 'male', 'female'] as const) {
          expect(
            SIDDUR_CHAPTERS[id]![nusach]!.filter((chapter) => chapterVisible(chapter, voice, status)).map(
              (chapter) => chapter.he,
            ),
          ).toEqual(titles(forVoice(forMaritalStatus(sections, status), voice)).map((title) => title.he));
        }
      }
    }
  });

  it('hides the tallit and tefillin chapter from a woman in every nusach', () => {
    for (const nusach of NUSCHAOT) {
      const entry = SIDDUR_CHAPTERS.shacharit![nusach]!.find((chapter) => chapter.he === 'עטיפת טלית והנחת תפילין');
      expect(entry?.voices).toEqual(['male', 'unset']);
    }
    expect(
      SIDDUR_CHAPTERS.birchot_hashachar!.ashkenaz!.find((chapter) => chapter.he === 'מודה אני')?.voices,
    ).toBeUndefined();
  });

  it("marks only Chabad's passage before marital relations as married-only", () => {
    const marked = SIDDUR_TEXT_IDS.flatMap((id) =>
      NUSCHAOT.flatMap((nusach) =>
        (SIDDUR_CHAPTERS[id]![nusach] ?? [])
          .filter((chapter) => chapter.marriedOnly)
          .map((chapter) => ({
            id,
            nusach,
            he: chapter.he,
          })),
      ),
    );
    expect(marked).toEqual([{ id: 'kriat_shema_al_hamita', nusach: 'chabad', he: 'לפני תשמיש המטה' }]);
  });

  it('chapterVisible keeps an entry for the readers it names', () => {
    expect(chapterVisible({ he: 'a', en: 'a' }, 'female', 'single')).toBe(true);
    const voiced = { he: 'a', en: 'a', voices: ['male', 'unset'] as ('male' | 'female' | 'unset')[] };
    expect(chapterVisible(voiced, 'female', null)).toBe(false);
    expect(chapterVisible(voiced, null, null)).toBe(true);
    expect(chapterVisible(voiced, 'male', null)).toBe(true);
    const married = { he: 'a', en: 'a', marriedOnly: true as const };
    expect(chapterVisible(married, null, 'single')).toBe(false);
    expect(chapterVisible(married, null, 'married')).toBe(true);
    expect(chapterVisible(married, null, null)).toBe(true);
  });
});
