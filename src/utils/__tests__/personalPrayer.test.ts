import { HDate } from '@hebcal/core';
import { NUSACH_IDS } from '@/data/nuschaot';
import { CITIES } from '@/data/cities';
import { readSiddurText } from '@/testing/siddur';
import type { ChokAsset } from '@/types/chok';
import type { SiddurSection, SiddurTextId } from '@/types/siddur';
import {
  amidahPrayerOf,
  amidahVersesOf,
  chokVerses,
  MAX_AMIDAH_VERSES,
  plainHebrew,
  tehillimVerses,
  verseEdges,
  verseHoldsName,
  versesFor,
  versesForName,
  withPersonalPrayer,
  type PersonalInsert,
} from '../personalPrayer';
import { dayFeatures, forVoice, resolveSiddurText } from '../siddur';

const LABELS = {
  verses: { he: 'פסוק לשמי', en: 'My name verse' },
  prayer: { he: 'תפילה אישית', en: 'Personal prayer' },
};
const INSERT: PersonalInsert = { verses: ['יוֹסֵף פָּרָת', 'חַיִּים'], prayer: 'רפא נא\nושמור', labels: LABELS };

const plainOf = (sections: readonly SiddurSection[]) =>
  plainHebrew(
    sections.flatMap((s) => s.segments.flatMap((g) => g.he.map((p) => p.map((r) => r.t).join('')))).join(' '),
  ).replace(/\s+/g, ' ');

// A plain weekday at a place where every Amidah is said: Wednesday 2026-11-11 in Jerusalem.
const WEEKDAY = dayFeatures(new HDate(new Date(2026, 10, 11)), {
  inIsrael: true,
  jerusalem: true,
  location: CITIES[0],
});

describe('the personal insert in each Amidah', () => {
  const cases = NUSACH_IDS.flatMap((nusach) =>
    (['shacharit', 'mincha', 'maariv'] as SiddurTextId[]).map((id) => [nusach, id] as const),
  );

  it.each(cases)(
    '%s %s: lands right before the "יהיו לרצון" that follows Elokai Netzor, once per Amidah',
    (nusach, id) => {
      const sections = forVoice(resolveSiddurText(readSiddurText(nusach, id), WEEKDAY), null);
      const plain = plainOf(sections);
      const amidot = (plain.match(/אלהי[ ,.]+נצו?ר לשוני/g) ?? []).length;
      expect(amidot).toBeGreaterThan(0);
      const { sections: withInsert, points } = withPersonalPrayer(sections, INSERT);
      expect(points.size).toBeGreaterThan(0);
      const segments = withInsert.flatMap((s) => s.segments);
      const at = segments.flatMap((g, i) => (g.key?.endsWith(':verses') ? [i] : []));
      expect(at).toHaveLength(amidot);
      at.forEach((i) => {
        // Elokai Netzor said before it, "יהיו לרצון" opening what follows the free prayer.
        expect(plainOf([{ title: { he: '', en: '' }, segments: segments.slice(0, i) }])).toMatch(/אלהי[\s,.]+נצו?ר/);
        expect(segments[i + 1].key).toMatch(/:prayer$/);
        const next = plainHebrew(
          segments[i + 2].he
            .flat()
            .map((r) => r.t)
            .join(''),
        ).trim();
        expect(next.startsWith('יהיו לרצון')).toBe(true);
      });
      // Nothing of the text is lost or moved: removing the insert gives the text back word for word.
      const without = withInsert.map((s) => ({
        ...s,
        segments: s.segments.filter((g) => !g.key?.startsWith('personal:')),
      }));
      expect(plainOf(without)).toBe(plain);
      // Every key stays unique, so bookmarks still point at one place.
      const keys = segments.map((g) => g.key).filter(Boolean);
      expect(new Set(keys).size).toBe(keys.length);
    },
  );

  it('returns the same sections with nothing to insert, still naming where the insert would go', () => {
    const sections = forVoice(resolveSiddurText(readSiddurText('sefard', 'mincha'), WEEKDAY), null);
    const empty = withPersonalPrayer(sections, { verses: [], prayer: '  ', labels: LABELS });
    expect(empty.sections).toBe(sections);
    expect([...empty.points]).toEqual(['תפילת העמידה']);
    expect(withPersonalPrayer(sections, null).sections).toBe(sections);
  });

  it('adds only the verses, or only the prayer, when only one is set', () => {
    const sections = forVoice(resolveSiddurText(readSiddurText('ashkenaz', 'maariv'), WEEKDAY), null);
    const verses = withPersonalPrayer(sections, { verses: ['א'], prayer: '', labels: LABELS }).sections;
    const keys = verses.flatMap((s) => s.segments.map((g) => g.key)).filter((k) => k?.startsWith('personal:'));
    expect(keys).toEqual(['personal:0:verses']);
    const prayer = withPersonalPrayer(sections, { verses: [], prayer: 'תודה', labels: LABELS }).sections;
    const added = prayer.flatMap((s) => s.segments).filter((g) => g.key?.startsWith('personal:'));
    expect(added.map((g) => g.key)).toEqual(['personal:0:prayer']);
    expect(added[0].he).toEqual([[{ t: 'תפילה אישית', s: 'n' }], [{ t: 'תודה' }]]);
  });
});

describe('verses by their first and last letter', () => {
  it('reads the edges without nikud, a final letter as its regular one', () => {
    expect(verseEdges('יְהוָה רֹעִי לֹא אֶחְסָר׃')).toEqual({ first: 'י', last: 'ר' });
    expect(verseEdges('אֲנִי שָׁלוֹם')).toEqual({ first: 'א', last: 'מ' });
    expect(verseEdges('...')).toBeNull();
  });

  it('finds the Tehillim verses of a pair, each once', () => {
    const verses = tehillimVerses(readSiddurText('ashkenaz', 'tehillim'));
    // Every verse of the book, Psalm 119 in its 22 sections included.
    expect(verses).toHaveLength(2527);
    // Psalm 23:6, "אך טוב וחסד ירדפוני… לארך ימים", opens with א and closes with ם, read as מ.
    const am = versesFor(verses, 'א', 'מ');
    const goodness = am.find((v) => plainHebrew(v.text).startsWith('אך טוב וחסד ירדפוני'))!;
    expect(plainHebrew(goodness.text).endsWith('לארך ימים')).toBe(true);
    expect(goodness.source).toEqual({ he: 'תהלים, פרק כג', en: 'Psalms 23' });
    am.forEach((v) => expect(verseEdges(v.text)).toEqual({ first: 'א', last: 'מ' }));
    expect(versesFor(verses, 'א', 'ם')).toEqual(am);
    expect(versesFor([...verses, ...verses], 'א', 'מ')).toHaveLength(am.length);
  });

  it('takes the Chok LeYisrael Tanakh verses only, never a note, a targum or a commentary', () => {
    const asset: ChokAsset = {
      parasha: 'Balak',
      credit: { title: '', license: '', url: '' },
      dedication: null,
      slots: {
        sun: [
          {
            kind: 'torah',
            heading: 'תורה',
            segments: [
              { he: [[{ t: 'יכוין בקריאה:', s: 'n' }]] },
              {
                he: [
                  [{ t: '(ב) ', s: 'n' }, { t: 'וַיַּרְא בָּלָק בֶּן צִפּוֹר:' }],
                  [{ t: 'וַחֲזָא בָּלָק:', s: 't' }],
                ],
              },
              { he: [[{ t: 'וירא בלק' }]], optional: { he: 'רש״י', en: 'Rashi' } },
            ],
          },
          { kind: 'mishnah', heading: 'משנה', segments: [{ he: [[{ t: '(א) ', s: 'n' }, { t: 'משנה ראשונה' }]] }] },
        ],
      },
    } as unknown as ChokAsset;
    expect(chokVerses(asset, { he: 'בלק', en: 'Balak' })).toEqual([
      { text: 'וַיַּרְא בָּלָק בֶּן צִפּוֹר', source: { he: 'חק לישראל, בלק, תורה', en: 'Chok LeYisrael, Balak' } },
    ]);
  });
});

describe('the saved values', () => {
  it('keeps at most three trimmed verses and a string prayer', () => {
    expect(amidahVersesOf([' א ', '', 3, 'ב', 'ג', 'ד'])).toEqual(['א', 'ב', 'ג']);
    expect(amidahVersesOf('x')).toEqual([]);
    expect(MAX_AMIDAH_VERSES).toBe(3);
    expect(amidahPrayerOf(5)).toBe('');
    expect(amidahPrayerOf('שלום')).toBe('שלום');
  });
});

describe('verses by a name', () => {
  const verses = [
    { text: 'יְהוָה רֹעִי לֹא אֶחְסָף', source: { he: 'א', en: 'a' } },
    { text: 'וַיֹּאמֶר יוֹסֵף אֶל אֶחָיו הַאֵין לָנוּ סוֹף', source: { he: 'ב', en: 'b' } },
    { text: 'יַעֲקֹב קָרָא לְיוֹסֵף וַיַּעֲנֵהוּ בַּסּוֹף', source: { he: 'ג', en: 'c' } },
    { text: 'אַשְׁרֵי יוֹסֵף', source: { he: 'ד', en: 'd' } },
  ];

  it('finds the name as a word, with a prefix letter, never inside another word', () => {
    expect(verseHoldsName('וַיֹּאמֶר יוֹסֵף אֶל אֶחָיו', 'יוסף')).toBe(true);
    expect(verseHoldsName('קָרָא לְיוֹסֵף', 'יוֹסֵף')).toBe(true);
    expect(verseHoldsName('יוֹסֵפוֹת', 'יוסף')).toBe(false);
    expect(verseHoldsName('חַיִּים וְשָׁלוֹם', 'חיים')).toBe(true);
    expect(verseHoldsName('יוֹסֵף וְחַיִּים', 'יוסף חיים')).toBe(true);
    expect(verseHoldsName('יוֹסֵף', '')).toBe(false);
  });

  it('lists the verses of the name’s first and last letter, those holding the name first and recommended', () => {
    const found = versesForName(verses, 'יוסף');
    expect(found.map((v) => v.source.he)).toEqual(['ג', 'א']);
    expect(found.map((v) => v.recommended)).toEqual([true, false]);
    expect(versesForName(verses, '...')).toEqual([]);
  });

  it('recommends the real Tehillim verses that hold the name', () => {
    const all = tehillimVerses(readSiddurText('ashkenaz', 'tehillim'));
    const david = versesForName(all, 'דוד');
    expect(david.length).toBeGreaterThan(0);
    david.forEach((v) => expect(verseEdges(v.text)).toEqual({ first: 'ד', last: 'ד' }));
    const firstPlain = david.findIndex((v) => !v.recommended);
    david.forEach((v, i) => expect(v.recommended).toBe(firstPlain === -1 || i < firstPlain));
    david.filter((v) => v.recommended).forEach((v) => expect(verseHoldsName(v.text, 'דוד')).toBe(true));
  });
});
