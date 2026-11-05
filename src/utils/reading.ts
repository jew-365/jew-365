import type { SiddurSection } from '@/types/siddur';

// What the siddur reader counts as read (the owner's call, 2026-11-05: every siddur text, counted with no streak;
// "בצורה חכמה לפי כמה הוא קרא", never by scrolling to the bottom). A section is credited for the time it is on
// screen, in proportion to the share of the screen it fills, up to the time its letters take to read at a fast pace;
// a unit (the whole text, or one psalm) counts once its credited letters reach READ_SHARE of its letters.

// A fast reader's pace, in Hebrew letters per second: faster than this is skimming, and earns no more credit.
export const READ_LETTERS_PER_SEC = 25;
// The share of a unit's letters that must be credited for it to count.
export const READ_SHARE = 0.7;
// A tick longer than this (the app was in the background, a stalled frame) counts as this long.
export const READ_TICK_MAX_MS = 2000;
// The texts read chapter by chapter: each psalm counts toward the Tehillim total.
export const PSALM_TEXTS: ReadonlySet<string> = new Set(['tehillim', 'tikkun_haklali']);
// Tehillim is counted by chapter alone (the book as a whole comes from the chapters, `wholeBooks()`).
export const CHAPTER_ONLY_TEXTS: ReadonlySet<string> = new Set(['tehillim']);
export const PSALM_COUNT = 150;

const HEBREW_LETTER = /[א-ת]/g;

export function lettersOf(text: string): number {
  return text.match(HEBREW_LETTER)?.length ?? 0;
}

// The letters a reader reads in a section: folded passages (an optional or minyan label) and a minyan-only
// section are left out, since by default they are closed.
export function sectionLetters(section: SiddurSection): number {
  if (section.minyanOnly || section.optional) return 0;
  let letters = 0;
  for (const segment of section.segments) {
    if (segment.optional || segment.minyan) continue;
    for (const paragraph of segment.he) for (const run of paragraph) letters += lettersOf(run.t);
  }
  return letters;
}

export function psalmOf(section: SiddurSection): number | null {
  const match = /^Psalm (\d+)$/.exec(section.title.en.trim());
  const n = match ? Number(match[1]) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= PSALM_COUNT ? n : null;
}

export type ReadingUnit = { id: string; psalm: number | null; titles: string[] };

// The units a text is counted by: the whole text (`text`), and for a psalm text each psalm (`psalm:<n>`).
export function readingUnits(textId: string, sections: readonly SiddurSection[]): ReadingUnit[] {
  const units: ReadingUnit[] = [];
  if (!CHAPTER_ONLY_TEXTS.has(textId)) {
    units.push({ id: 'text', psalm: null, titles: sections.map((section) => section.title.he) });
  }
  if (PSALM_TEXTS.has(textId)) {
    for (const section of sections) {
      const psalm = psalmOf(section);
      if (psalm !== null) units.push({ id: `psalm:${psalm}`, psalm, titles: [section.title.he] });
    }
  }
  return units;
}

export type SectionView = { title: string; visiblePx: number };

// The sections on screen and how many of their pixels show, from the measured heights (by title, in order) and
// the visible band of the list's content, [top, bottom). A section never measured ends the walk.
export function visibleSections(
  sections: readonly SiddurSection[],
  sectionHeight: (title: string) => number | undefined,
  listTop: number,
  top: number,
  bottom: number,
): SectionView[] {
  const shown: SectionView[] = [];
  let start = listTop;
  for (const section of sections) {
    const height = sectionHeight(section.title.he);
    if (height === undefined) break;
    const end = start + height;
    const visiblePx = Math.min(end, bottom) - Math.max(start, top);
    if (visiblePx > 0) shown.push({ title: section.title.he, visiblePx });
    if (end >= bottom) break;
    start = end;
  }
  return shown;
}

// Credited reading time per section title, in ms.
export type ReadingCredit = ReadonlyMap<string, number>;

export function creditTick(
  credit: ReadingCredit,
  shown: readonly SectionView[],
  viewportPx: number,
  dtMs: number,
  lettersByTitle: ReadonlyMap<string, number>,
): Map<string, number> {
  const next = new Map(credit);
  const dt = Math.min(Math.max(dtMs, 0), READ_TICK_MAX_MS);
  if (viewportPx <= 0 || dt === 0) return next;
  for (const view of shown) {
    const letters = lettersByTitle.get(view.title) ?? 0;
    if (letters === 0) continue;
    const cap = (letters / READ_LETTERS_PER_SEC) * 1000;
    const earned = dt * Math.min(1, view.visiblePx / viewportPx);
    next.set(view.title, Math.min(cap, (next.get(view.title) ?? 0) + earned));
  }
  return next;
}

// Whether a unit counts as read: its credited letters reach READ_SHARE of its letters (a unit with none never does).
export function unitRead(
  unit: ReadingUnit,
  credit: ReadingCredit,
  lettersByTitle: ReadonlyMap<string, number>,
): boolean {
  let total = 0;
  let read = 0;
  for (const title of unit.titles) {
    const letters = lettersByTitle.get(title) ?? 0;
    if (letters === 0) continue;
    total += letters;
    const cap = (letters / READ_LETTERS_PER_SEC) * 1000;
    read += letters * Math.min(1, (credit.get(title) ?? 0) / cap);
  }
  return total > 0 && read >= READ_SHARE * total;
}

export function lettersByTitle(sections: readonly SiddurSection[]): Map<string, number> {
  return new Map(sections.map((section) => [section.title.he, sectionLetters(section)]));
}

// The persisted counts: `texts[day][textId]` reads of a whole text, `psalms[day][n]` reads of a psalm, each day the
// app day of the read (`appDayKey()`).
export type ReadingCounts = {
  texts: Record<string, Record<string, number>>;
  psalms: Record<string, Record<string, number>>;
};

export type ReadingTotals = { total: number; week: number; month: number };

const inRange = (key: string, fromKey: string) => key >= fromKey;

function totalsOf(
  days: Record<string, Record<string, number>>,
  pick: (day: Record<string, number>) => number,
  weekKey: string,
  monthKey: string,
): ReadingTotals {
  const totals = { total: 0, week: 0, month: 0 };
  for (const [key, day] of Object.entries(days)) {
    const n = pick(day);
    totals.total += n;
    if (inRange(key, weekKey)) totals.week += n;
    if (inRange(key, monthKey)) totals.month += n;
  }
  return totals;
}

const sum = (day: Record<string, number>) => Object.values(day).reduce((a, b) => a + b, 0);

export type ReadingSummary = {
  psalms: ReadingTotals & { books: number; distinct: number };
  texts: { id: string; totals: ReadingTotals }[];
};

// How many times every psalm 1 to 150 was read: the least count over the chapters.
export function wholeBooks(perPsalm: ReadonlyMap<number, number>): number {
  let least = Infinity;
  for (let n = 1; n <= PSALM_COUNT; n += 1) least = Math.min(least, perPsalm.get(n) ?? 0);
  return least === Infinity ? 0 : least;
}

// The Tracking card's figures: the psalms read (all, since `weekKey`, since `monthKey`), the distinct chapters and
// the whole books, and each text read at least once, most read first (ties by id).
export function readingSummary(counts: ReadingCounts, weekKey: string, monthKey: string): ReadingSummary {
  const perPsalm = new Map<number, number>();
  for (const day of Object.values(counts.psalms)) {
    for (const [n, count] of Object.entries(day)) perPsalm.set(Number(n), (perPsalm.get(Number(n)) ?? 0) + count);
  }
  const ids = new Set<string>();
  for (const day of Object.values(counts.texts)) for (const id of Object.keys(day)) ids.add(id);
  const texts = [...ids]
    .map((id) => ({ id, totals: totalsOf(counts.texts, (day) => day[id] ?? 0, weekKey, monthKey) }))
    .filter((entry) => entry.totals.total > 0)
    .sort((a, b) => b.totals.total - a.totals.total || a.id.localeCompare(b.id));
  return {
    psalms: {
      ...totalsOf(counts.psalms, sum, weekKey, monthKey),
      distinct: [...perPsalm.values()].filter((count) => count > 0).length,
      books: wholeBooks(perPsalm),
    },
    texts,
  };
}
