import type { ChokAsset } from '@/types/chok';
import type { Run, SiddurSection, SiddurSegment, SiddurText } from '@/types/siddur';

// The personal verses and free prayer said at the end of Elokai Netzor, before its "יהיו לרצון" (the owner's
// call, 2026-11-09): up to three verses, one per name of a person with more than one, each found by the
// letter it opens and the letter it closes with, or typed.

export const MAX_AMIDAH_VERSES = 3;
export const AMIDAH_PRAYER_MAX = 1000;
export const AMIDAH_VERSE_MAX = 400;

// The texts whose Amidah takes the insert.
export const PERSONAL_PRAYER_TEXTS: ReadonlySet<string> = new Set(['shacharit', 'mincha', 'maariv']);

// The 22 letters a verse is searched by, final forms read as their regular letter.
export const HEBREW_LETTERS = [...'אבגדהוזחטיכלמנסעפצקרשת'] as const;

const FINAL: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };
const MARKS = /[֑-ֽֿ-ׇ]/;
const MAQAF = '־';
const LETTER = /[א-ת]/;

const baseLetter = (ch: string): string => FINAL[ch] ?? ch;

// The text without nikud and te'amim, a maqaf read as a space.
export function plainHebrew(text: string): string {
  let out = '';
  for (const ch of text) {
    if (ch === MAQAF) out += ' ';
    else if (!MARKS.test(ch)) out += ch;
  }
  return out;
}

// The first and the last Hebrew letter of a verse, final forms read as regular ones.
export function verseEdges(text: string): { first: string; last: string } | null {
  const letters = [...plainHebrew(text)].filter((ch) => LETTER.test(ch));
  if (!letters.length) return null;
  return { first: baseLetter(letters[0]), last: baseLetter(letters[letters.length - 1]) };
}

export type PersonalVerse = { text: string; source: { he: string; en: string } };

// A verse's own words: the runs of its first paragraph that are not a note or a targum, its closing mark dropped.
function verseText(segment: SiddurSegment): string {
  const words = (segment.he[0] ?? [])
    .filter((run) => run.s !== 'n' && run.s !== 't')
    .map((run) => run.t)
    .join('')
    .trim();
  return words.replace(/[\s:׃]+$/u, '').trim();
}

const PSALM_TITLE = /^Psalm (\d+)(?: · .+)?$/;

// Every verse of the bundled Tehillim: one segment per verse in each psalm's section.
export function tehillimVerses(text: SiddurText): PersonalVerse[] {
  return text.sections.flatMap((section) => {
    const psalm = PSALM_TITLE.exec(section.title.en)?.[1];
    if (!psalm) return [];
    const source = { he: `תהלים, ${section.title.he}`, en: `Psalms ${psalm}` };
    return section.segments.flatMap((segment) => {
      const verse = verseText(segment);
      return verse && verseEdges(verse) ? [{ text: verse, source }] : [];
    });
  });
}

const TANAKH_KINDS: ReadonlySet<string> = new Set(['torah', 'neviim', 'ketuvim', 'haftarah']);
const VERSE_NUMBER = /^\(([^)]+)\)\s*$/;

// Every verse of a Chok LeYisrael parasha's Tanakh sections (Torah, Nevi'im, Ketuvim and the haftarah): a segment
// whose first paragraph opens with its printed verse number; notes and commentary are left out.
export function chokVerses(asset: ChokAsset, parashaName: { he: string; en: string }): PersonalVerse[] {
  return Object.values(asset.slots).flatMap((sections) =>
    (sections ?? []).flatMap((section) => {
      if (!TANAKH_KINDS.has(section.kind)) return [];
      const source = {
        he: `חק לישראל, ${parashaName.he}, ${section.heading}`,
        en: `Chok LeYisrael, ${parashaName.en}`,
      };
      return section.segments.flatMap((segment) => {
        const first = segment.he[0]?.[0];
        if (segment.optional || !first || first.s !== 'n' || !VERSE_NUMBER.test(first.t)) return [];
        const verse = verseText(segment);
        return verse && verseEdges(verse) ? [{ text: verse, source }] : [];
      });
    }),
  );
}

// The verses that open with `first` and close with `last`, each text once, in the order given.
export function versesFor(verses: readonly PersonalVerse[], first: string, last: string): PersonalVerse[] {
  const seen = new Set<string>();
  return verses.filter((verse) => {
    const edges = verseEdges(verse.text);
    if (!edges || edges.first !== baseLetter(first) || edges.last !== baseLetter(last)) return false;
    const key = plainHebrew(verse.text).replace(/\s+/g, ' ').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const PREFIXES = /^[והבלמשכ]{1,2}/u;
const wordsOf = (text: string): string[] =>
  plainHebrew(text)
    .replace(/[^\u05D0-\u05EA\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => [...word].map(baseLetter).join(''));

// Whether a verse holds every word of a name, as a word of its own or after up to two prefix letters (ויוסף, ליוסף).
export function verseHoldsName(verse: string, name: string): boolean {
  const words = wordsOf(verse);
  const named = wordsOf(name);
  return named.length > 0 && named.every((n) => words.some((w) => w === n || w.replace(PREFIXES, '') === n));
}

export type NameMatch = PersonalVerse & { recommended: boolean };

// The verses for a name: those that open with its first letter and close with its last, the ones that also hold the
// name first and marked recommended (the owner's call, 2026-11-09), each group in the order given.
export function versesForName(verses: readonly PersonalVerse[], name: string): NameMatch[] {
  const edges = verseEdges(name);
  if (!edges) return [];
  const all = versesFor(verses, edges.first, edges.last).map((verse) => ({
    ...verse,
    recommended: verseHoldsName(verse.text, name),
  }));
  return [...all.filter((v) => v.recommended), ...all.filter((v) => !v.recommended)];
}

// A saved list cleaned: trimmed non-empty strings of at most AMIDAH_VERSE_MAX, at most MAX_AMIDAH_VERSES.
export function amidahVersesOf(saved: unknown): string[] {
  if (!Array.isArray(saved)) return [];
  return saved
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim().slice(0, AMIDAH_VERSE_MAX))
    .filter(Boolean)
    .slice(0, MAX_AMIDAH_VERSES);
}

export const amidahPrayerOf = (saved: unknown): string =>
  typeof saved === 'string' ? saved.slice(0, AMIDAH_PRAYER_MAX) : '';

type Place = { paragraph: number; run: number; char: number };

// The plain text of a segment's paragraphs joined by a space, and where each of its characters comes from.
function plainWithPlaces(segment: SiddurSegment): { text: string; places: Place[] } {
  let text = '';
  const places: Place[] = [];
  segment.he.forEach((paragraph, p) => {
    if (p > 0) {
      text += ' ';
      places.push({ paragraph: p, run: 0, char: 0 });
    }
    paragraph.forEach((run, r) => {
      let char = 0;
      for (const ch of run.t) {
        if (ch === MAQAF || !MARKS.test(ch)) {
          text += ch === MAQAF ? ' ' : ch;
          places.push({ paragraph: p, run: r, char });
        }
        char += ch.length;
      }
    });
  });
  return { text, places };
}

const trimRuns = (runs: Run[], end: 'start' | 'end'): Run[] => {
  const out = runs.filter((run) => run.t.length > 0).map((run) => ({ ...run }));
  if (end === 'end' && out.length) out[out.length - 1].t = out[out.length - 1].t.replace(/\s+$/u, '');
  if (end === 'start' && out.length) out[0].t = out[0].t.replace(/^\s+/u, '');
  return out.filter((run) => run.t.length > 0);
};

// The segment cut before a place: the part before it (null when nothing is said there) and the part from it on.
function splitAt(segment: SiddurSegment, at: Place): [SiddurSegment | null, SiddurSegment] {
  const before = segment.he.slice(0, at.paragraph);
  const paragraph = segment.he[at.paragraph];
  const head = trimRuns(
    [...paragraph.slice(0, at.run), { ...paragraph[at.run], t: paragraph[at.run].t.slice(0, at.char) }],
    'end',
  );
  const tail = trimRuns(
    [{ ...paragraph[at.run], t: paragraph[at.run].t.slice(at.char) }, ...paragraph.slice(at.run + 1)],
    'start',
  );
  const left = [...before, ...(head.length ? [head] : [])];
  const right = [tail, ...segment.he.slice(at.paragraph + 1)];
  const key = segment.key;
  return [
    left.length ? { ...segment, he: left } : null,
    { ...segment, he: right, ...(key ? { key: `${key}~yihyu` } : {}), en: left.length ? undefined : segment.en },
  ];
}

const NETZOR = /אלהי[\s,.]+נצו?ר\s+לשוני/u;
const YIHYU = /יהיו\s+לרצון/u;

export type PersonalInsert = {
  verses: readonly string[];
  prayer: string;
  labels: { verses: { he: string; en: string }; prayer: { he: string; en: string } };
};

const label = (text: { he: string; en: string }): Run => ({ t: text.he, s: 'n' });

// The segments the insert adds at one point, keyed `personal:<point>:<part>`.
export function personalSegments(insert: PersonalInsert, point: number): SiddurSegment[] {
  const verses = amidahVersesOf(insert.verses);
  const prayer = insert.prayer.trim();
  const out: SiddurSegment[] = [];
  if (verses.length)
    out.push({
      key: `personal:${point}:verses`,
      he: [[label(insert.labels.verses)], ...verses.map((verse): Run[] => [{ t: verse }])],
      en: insert.labels.verses.en,
    });
  if (prayer)
    out.push({
      key: `personal:${point}:prayer`,
      he: [[label(insert.labels.prayer)], ...prayer.split(/\n+/).map((line): Run[] => [{ t: line.trim() }])].filter(
        (p) => p.some((run) => run.t),
      ),
      en: insert.labels.prayer.en,
    });
  return out;
}

// Each Elokai Netzor's place: the "יהיו לרצון" that follows it, in this section or a later one of the same text. The
// result is the sections with the insert placed before each such "יהיו לרצון" (the same array when there is none or
// nothing to insert), and the titles of the sections that hold one, where the reader offers its settings link.
export function withPersonalPrayer(
  sections: SiddurSection[],
  insert: PersonalInsert | null,
): { sections: SiddurSection[]; points: ReadonlySet<string> } {
  const points = new Set<string>();
  let changed = false;
  let pending = false;
  let count = 0;
  const out = sections.map((section) => {
    const segments: SiddurSegment[] = [];
    let touched = false;
    for (const segment of section.segments) {
      let rest: SiddurSegment | null = segment;
      while (rest) {
        const { text, places } = plainWithPlaces(rest);
        let from = 0;
        if (!pending) {
          const netzor = NETZOR.exec(text);
          if (!netzor) break;
          pending = true;
          from = netzor.index + netzor[0].length;
        }
        const yihyu = YIHYU.exec(text.slice(from));
        if (!yihyu) break;
        pending = false;
        points.add(section.title.he);
        const added = insert ? personalSegments(insert, count++) : [];
        if (!added.length) {
          // Nothing to insert: look on for the next Netzor after this "יהיו לרצון".
          const after = from + yihyu.index + yihyu[0].length;
          if (!NETZOR.test(text.slice(after))) break;
          const [head, tail] = splitAt(rest, places[after]);
          if (head) segments.push(head);
          rest = tail;
          touched = true;
          continue;
        }
        const [head, tail] = splitAt(rest, places[from + yihyu.index]);
        if (head) segments.push(head);
        segments.push(...added);
        rest = tail;
        touched = true;
        changed = true;
        // The remainder starts at this "יהיו לרצון": look on for another Netzor in it.
        const again = plainWithPlaces(rest).text;
        if (!NETZOR.test(again)) break;
      }
      if (rest) segments.push(rest);
    }
    return touched && changed ? { ...section, segments } : section;
  });
  return { sections: changed ? out : sections, points };
}
