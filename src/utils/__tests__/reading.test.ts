import type { SiddurSection } from '@/types/siddur';
import {
  READ_LETTERS_PER_SEC,
  READ_SHARE,
  READ_TICK_MAX_MS,
  creditTick,
  lettersByTitle,
  lettersOf,
  psalmOf,
  readingSummary,
  readingUnits,
  sectionLetters,
  unitRead,
  visibleSections,
  wholeBooks,
} from '@/utils/reading';

const section = (he: string, en: string, text: string, extra: Partial<SiddurSection> = {}): SiddurSection => ({
  title: { he, en },
  segments: [{ he: [[{ t: text }]] }],
  ...extra,
});

// 100 Hebrew letters: 4 seconds at READ_LETTERS_PER_SEC.
const HUNDRED = 'אבגדה '.repeat(20);
const MS_FOR_HUNDRED = (100 / READ_LETTERS_PER_SEC) * 1000;

describe('letters', () => {
  it('counts Hebrew letters only, not nikud, spaces or punctuation', () => {
    expect(lettersOf('בָּרוּךְ אַתָּה, ה׳')).toBe(8);
    expect(lettersOf('Psalm 1')).toBe(0);
  });

  it('leaves out folded passages and a minyan-only section', () => {
    const s: SiddurSection = {
      title: { he: 'א', en: 'A' },
      segments: [
        { he: [[{ t: HUNDRED }]] },
        { he: [[{ t: HUNDRED }]], optional: { he: 'x', en: 'x' } },
        { he: [[{ t: HUNDRED }]], minyan: { he: 'x', en: 'x' } },
      ],
    };
    expect(sectionLetters(s)).toBe(100);
    expect(sectionLetters({ ...s, minyanOnly: true })).toBe(0);
  });
});

describe('readingUnits', () => {
  const psalms = [
    section('תפילה לפני', 'Prayer Before Tehillim', HUNDRED),
    section('פרק א', 'Psalm 1', HUNDRED),
    section('מזמור טז', 'Psalm 16', HUNDRED),
  ];

  it('reads the psalm number from the English title', () => {
    expect(psalms.map(psalmOf)).toEqual([null, 1, 16]);
    expect(psalmOf(section('x', 'Psalm 151', ''))).toBeNull();
  });

  it('counts Tehillim by chapter alone, Tikkun HaKlali as a text and by chapter, anything else as a text', () => {
    expect(readingUnits('tehillim', psalms).map((u) => u.id)).toEqual(['psalm:1', 'psalm:16']);
    expect(readingUnits('tikkun_haklali', psalms).map((u) => u.id)).toEqual(['text', 'psalm:1', 'psalm:16']);
    expect(readingUnits('birkat_hamazon', psalms).map((u) => u.id)).toEqual(['text']);
  });
});

describe('visibleSections', () => {
  const sections = [section('א', 'A', ''), section('ב', 'B', ''), section('ג', 'C', '')];
  const heights = new Map([
    ['א', 300],
    ['ב', 500],
  ]);

  it('gives each section on screen its visible pixels, from the list top', () => {
    expect(visibleSections(sections, (t) => heights.get(t), 20, 200, 800)).toEqual([
      { title: 'א', visiblePx: 120 },
      { title: 'ב', visiblePx: 480 },
    ]);
  });

  it('stops at a section never measured', () => {
    expect(visibleSections(sections, (t) => heights.get(t), 0, 700, 1200)).toEqual([{ title: 'ב', visiblePx: 100 }]);
  });
});

describe('credit and read', () => {
  const sections = [section('א', 'Psalm 1', HUNDRED), section('ב', 'Psalm 2', HUNDRED)];
  const letters = lettersByTitle(sections);
  const [unit] = readingUnits('birkat_hamazon', sections);

  it('credits time in proportion to the share of the screen, up to the time the letters take', () => {
    let credit = creditTick(new Map(), [{ title: 'א', visiblePx: 400 }], 800, 1000, letters);
    expect(credit.get('א')).toBe(500);
    for (let i = 0; i < 20; i += 1) credit = creditTick(credit, [{ title: 'א', visiblePx: 800 }], 800, 1000, letters);
    expect(credit.get('א')).toBe(MS_FOR_HUNDRED);
  });

  it('caps a long tick, so time in the background is not reading', () => {
    const credit = creditTick(new Map(), [{ title: 'א', visiblePx: 800 }], 800, 60_000, letters);
    expect(credit.get('א')).toBe(READ_TICK_MAX_MS);
  });

  it('counts a text only once READ_SHARE of its letters are credited, never by a quick scroll', () => {
    const quick = creditTick(
      new Map(),
      [
        { title: 'א', visiblePx: 400 },
        { title: 'ב', visiblePx: 400 },
      ],
      800,
      1000,
      letters,
    );
    expect(unitRead(unit, quick, letters)).toBe(false);
    const half = new Map([['א', MS_FOR_HUNDRED]]);
    expect(READ_SHARE).toBeGreaterThan(0.5);
    expect(unitRead(unit, half, letters)).toBe(false);
    const most = new Map([
      ['א', MS_FOR_HUNDRED],
      ['ב', MS_FOR_HUNDRED * 0.5],
    ]);
    expect(unitRead(unit, most, letters)).toBe(true);
  });

  it('staying long on one screen never reads the sections off it', () => {
    let credit: ReadonlyMap<string, number> = new Map();
    for (let i = 0; i < 600; i += 1) credit = creditTick(credit, [{ title: 'א', visiblePx: 800 }], 800, 1000, letters);
    expect(unitRead(unit, credit, letters)).toBe(false);
  });
});

describe('readingSummary', () => {
  const counts = {
    texts: {
      '2026-10-01': { birkat_hamazon: 2, nishmat: 1 },
      '2026-11-02': { birkat_hamazon: 1 },
      '2026-11-04': { tikkun_haklali: 1, birkat_hamazon: 1 },
    },
    psalms: {
      '2026-10-01': { '1': 1, '2': 1 },
      '2026-11-04': { '1': 1, '16': 1 },
    },
  };

  it('totals all, since the week and since the month, most read first', () => {
    const summary = readingSummary(counts, '2026-11-01', '2026-10-23');
    expect(summary.texts).toEqual([
      { id: 'birkat_hamazon', totals: { total: 4, week: 2, month: 2 } },
      { id: 'nishmat', totals: { total: 1, week: 0, month: 0 } },
      { id: 'tikkun_haklali', totals: { total: 1, week: 1, month: 1 } },
    ]);
    expect(summary.psalms).toEqual({ total: 4, week: 2, month: 2, distinct: 3, books: 0 });
  });

  it('counts a whole book by the least read chapter', () => {
    const all = new Map<number, number>(Array.from({ length: 150 }, (_, i) => [i + 1, 2]));
    expect(wholeBooks(all)).toBe(2);
    all.set(77, 1);
    expect(wholeBooks(all)).toBe(1);
    all.delete(150);
    expect(wholeBooks(all)).toBe(0);
  });
});
