import {
  CHOK_COMMENTARY_LABELS,
  HAFTARAH_VARIANT,
  chokParashaName,
  chokPlaceOf,
  chokReaderPortion,
  chokSlotSections,
  chokText,
  chokWeekName,
  isChokCommentary,
} from '../chok';
import type { ChokPortion } from '../chok';
import { CITIES } from '@/data/cities';
import { dateKey } from '@/stores/useCompletionsStore';
import { at } from '@/testing/zmanim';
import { ChokAsset, ChokSection, ChokSectionKind, HaftarahVariant } from '@/types/chok';
import { pickerEntries } from '@/utils/siddur';

const { COMMENTARIES } = require('../../../scripts/chok/parse') as {
  COMMENTARIES: Readonly<Record<string, { he: string; en: string }>>;
};

const JERUSALEM = CITIES[0];
const LOS_ANGELES = CITIES.find((city) => city.nameEn === 'Los Angeles')!;
const KIND_NAMES: Record<ChokSectionKind, string> = {
  torah: 'Torah',
  neviim: 'Prophets',
  ketuvim: 'Writings',
  mishnah: 'Mishnah',
  gemara: 'Gemara',
  zohar: 'Zohar',
  halacha: 'Halacha',
  mussar: 'Mussar',
  haftarah: 'Haftarah',
};
const VARIANT_NAMES: Record<HaftarahVariant, string> = {
  sephardi: 'Haftarah (Sephardi)',
  ashkenazi: 'Haftarah (Ashkenazi)',
};
const CREDIT = { title: 'חוק לישראל השלם, רק תורה', license: 'באישור בעל האתר', url: 'http://example.org' };

const day = (year: number, month: number, date: number) => new Date(year, month - 1, date);
const view = (portion: ChokPortion) => ({
  parashiyot: portion.parashiyot,
  slot: portion.slot,
  shabbat: dateKey(portion.shabbat.greg()),
});
const section = (kind: ChokSectionKind, heading: string, variant?: 'sephardi' | 'ashkenazi'): ChokSection => ({
  kind,
  heading,
  ...(variant ? { variant } : {}),
  segments: [{ he: [[{ t: heading }]] }],
});
const asset = (parasha: string, dedication: string | null = null): ChokAsset => ({
  parasha,
  credit: CREDIT,
  dedication,
  slots: {
    sun: [section('torah', 'תורה'), section('neviim', 'נביאים - מלכים א - פרק ז')],
    fri: [
      section('torah', 'תורה'),
      section('haftarah', 'הפטרה כמנהג הספרדים', 'sephardi'),
      section('haftarah', 'הפטרה כמנהג האשכנזים', 'ashkenazi'),
      section('mishnah', 'משנה שבת פרק כב'),
    ],
  },
});
const VAYAKHEL = asset('Vayakhel');
const PEKUDEI = asset('Pekudei');

describe('HAFTARAH_VARIANT', () => {
  it('gives Edot HaMizrach the Sephardi haftarah and every other nusach the Ashkenazi one', () => {
    expect(HAFTARAH_VARIANT).toEqual({
      ashkenaz: 'ashkenazi',
      sefard: 'ashkenazi',
      edot_hamizrach: 'sephardi',
      chabad: 'ashkenazi',
    });
  });
});

describe('CHOK_COMMENTARY_LABELS', () => {
  it('names Rashi and Bartenura as the Chok build labels them, and leaves the Zohar translation out', () => {
    const built = Object.values(COMMENTARIES).map((label) => label.en);
    expect(CHOK_COMMENTARY_LABELS).toEqual(['Rashi', 'Bartenura']);
    expect(built.filter((en) => CHOK_COMMENTARY_LABELS.includes(en))).toEqual(['Rashi', 'Bartenura']);
    expect(built.filter((en) => !CHOK_COMMENTARY_LABELS.includes(en))).toEqual(['Zohar translation']);
  });

  it('tells a Rashi or Bartenura label from any other', () => {
    expect(isChokCommentary({ he: 'רש״י', en: 'Rashi' })).toBe(true);
    expect(isChokCommentary({ he: 'ברטנורה', en: 'Bartenura' })).toBe(true);
    expect(isChokCommentary({ he: 'תרגום הזוהר', en: 'Zohar translation' })).toBe(false);
    expect(isChokCommentary({ he: 'השלמה: יום שני', en: 'Make-up: Monday' })).toBe(false);
    expect(isChokCommentary(undefined)).toBe(false);
  });
});

describe('parasha names', () => {
  it("takes the Hebrew name from hebcal's locale and keeps the English one", () => {
    expect(chokParashaName('Vayetzei', 'he')).toBe('ויצא');
    expect(chokParashaName('Vayetzei', 'en')).toBe('Vayetzei');
    expect(chokParashaName('Vezot Haberakhah', 'he')).toBe('וזאת הברכה');
  });

  it('joins a double week with a maqaf in Hebrew and a hyphen in English', () => {
    expect(chokWeekName(['Vayakhel', 'Pekudei'], 'he')).toBe('ויקהל־פקודי');
    expect(chokWeekName(['Vayakhel', 'Pekudei'], 'en')).toBe('Vayakhel-Pekudei');
    expect(chokWeekName(['Noach'], 'he')).toBe('נח');
  });
});

describe('chokSlotSections', () => {
  it('keeps the shared sections and the haftarah of the variant', () => {
    expect(chokSlotSections(VAYAKHEL, 'fri', 'sephardi').map((s) => s.heading)).toEqual([
      'תורה',
      'הפטרה כמנהג הספרדים',
      'משנה שבת פרק כב',
    ]);
    expect(chokSlotSections(VAYAKHEL, 'fri', 'ashkenazi').map((s) => s.heading)).toEqual([
      'תורה',
      'הפטרה כמנהג האשכנזים',
      'משנה שבת פרק כב',
    ]);
    expect(chokSlotSections(VAYAKHEL, 'mon', 'ashkenazi')).toEqual([]);
  });
});

describe('chokText', () => {
  const options = {
    slot: 'sun' as const,
    choice: 'both' as const,
    variant: 'ashkenazi' as const,
    kindNames: KIND_NAMES,
    variantNames: VARIANT_NAMES,
  };

  it('titles a single parasha by the printed heading and the English kind name', () => {
    const text = chokText([VAYAKHEL], options);
    expect(text.id).toBe('chok_leyisrael');
    expect(text).not.toHaveProperty('nusach');
    expect(text).not.toHaveProperty('dedication');
    expect(text.credits).toEqual([CREDIT]);
    expect(text.sections).toEqual([
      { title: { he: 'תורה', en: 'Torah' }, segments: [{ key: 'Vayakhel:sun:תורה:0', he: [[{ t: 'תורה' }]] }] },
      {
        title: { he: 'נביאים - מלכים א - פרק ז', en: 'Prophets' },
        segments: [{ key: 'Vayakhel:sun:נביאים - מלכים א - פרק ז:0', he: [[{ t: 'נביאים - מלכים א - פרק ז' }]] }],
      },
    ]);
    expect(pickerEntries(text.sections).map((entry) => entry.title.he)).toEqual(['תורה', 'נביאים - מלכים א - פרק ז']);
  });

  it('reads one parasha of a double week by the choice', () => {
    expect(chokText([VAYAKHEL, PEKUDEI], { ...options, choice: 'first' }).sections.map((s) => s.title.he)).toEqual([
      'תורה',
      'נביאים - מלכים א - פרק ז',
    ]);
    const second = chokText([VAYAKHEL, PEKUDEI], { ...options, choice: 'second' });
    expect(second.sections[0].segments).toEqual([{ key: 'Pekudei:sun:תורה:0', he: [[{ t: 'תורה' }]] }]);
    expect(second.sections.every((s) => s.chapter === undefined)).toBe(true);
  });

  it('reads both parashiyot one after the other, each a chapter, with unique titles', () => {
    const text = chokText([VAYAKHEL, PEKUDEI], options);
    expect(text.sections.map((s) => s.title)).toEqual([
      { he: 'ויקהל · תורה', en: 'Vayakhel · Torah' },
      { he: 'ויקהל · נביאים - מלכים א - פרק ז', en: 'Vayakhel · Prophets' },
      { he: 'פקודי · תורה', en: 'Pekudei · Torah' },
      { he: 'פקודי · נביאים - מלכים א - פרק ז', en: 'Pekudei · Prophets' },
    ]);
    expect(pickerEntries(text.sections)).toEqual([
      { index: 0, title: { he: 'ויקהל', en: 'Vayakhel' } },
      { index: 2, title: { he: 'פקודי', en: 'Pekudei' } },
    ]);
    expect(new Set(text.sections.map((s) => s.title.he)).size).toBe(text.sections.length);
    expect(text.credits).toEqual([CREDIT]);
  });

  it('takes the haftarah of the variant and the dedication from the asset', () => {
    const text = chokText([asset('Vayakhel', 'לעילוי נשמה')], { ...options, slot: 'fri', variant: 'sephardi' });
    expect(text.sections.map((s) => s.title)).toEqual([
      { he: 'תורה', en: 'Torah' },
      { he: 'הפטרה כמנהג הספרדים', en: 'Haftarah (Sephardi)' },
      { he: 'משנה שבת פרק כב', en: 'Mishnah' },
    ]);
    expect(text.dedication).toBe('לעילוי נשמה');
  });

  it('names the haftarah of the variant in effect in English and leaves Hebrew as printed', () => {
    const titleOf = (variant: HaftarahVariant) =>
      chokText([VAYAKHEL], { ...options, slot: 'fri', variant }).sections.map((s) => s.title);
    expect(titleOf('sephardi')[1]).toEqual({ he: 'הפטרה כמנהג הספרדים', en: 'Haftarah (Sephardi)' });
    expect(titleOf('ashkenazi')[1]).toEqual({ he: 'הפטרה כמנהג האשכנזים', en: 'Haftarah (Ashkenazi)' });
    expect(titleOf('ashkenazi').map((title) => title.he)).toEqual(['תורה', 'הפטרה כמנהג האשכנזים', 'משנה שבת פרק כב']);
  });

  it('keeps the plain kind name for a haftarah the source prints in one variant only', () => {
    const single: ChokAsset = {
      ...VAYAKHEL,
      slots: { fri: [section('torah', 'תורה'), section('haftarah', 'הפטרה')] },
    };
    for (const variant of ['sephardi', 'ashkenazi'] as const) {
      expect(chokText([single], { ...options, slot: 'fri', variant }).sections.map((s) => s.title)).toEqual([
        { he: 'תורה', en: 'Torah' },
        { he: 'הפטרה', en: 'Haftarah' },
      ]);
    }
  });

  it('carries the variant into the English titles of a double week and of a make-up fold', () => {
    const text = chokText([VAYAKHEL, PEKUDEI], { ...options, slot: 'fri', variant: 'sephardi' });
    expect(text.sections.map((s) => s.title.en)).toEqual([
      'Vayakhel · Torah',
      'Vayakhel · Haftarah (Sephardi)',
      'Vayakhel · Mishnah',
      'Pekudei · Torah',
      'Pekudei · Haftarah (Sephardi)',
      'Pekudei · Mishnah',
    ]);
    const label = { he: 'השלמה: יום שישי', en: 'Make-up: Friday' };
    const fold = chokText([VAYAKHEL], {
      ...options,
      slot: 'sun',
      variant: 'ashkenazi',
      makeUps: [{ dateKey: '2028-03-24', slot: 'fri', label }],
    }).sections[0];
    expect(fold.segments.filter((segment) => segment.he[0][0].s === 'b').map((segment) => segment.en)).toEqual([
      'Torah',
      'Haftarah (Ashkenazi)',
      'Mishnah',
    ]);
  });

  it('has no sections for a slot the parasha does not carry', () => {
    expect(chokText([VAYAKHEL], { ...options, slot: 'tue' }).sections).toEqual([]);
  });

  it('puts one closed fold per make-up day before the portion, its sections headed inside it', () => {
    const label = { he: 'השלמה: יום ראשון', en: 'Make-up: Sunday' };
    const text = chokText([VAYAKHEL], {
      ...options,
      slot: 'fri',
      variant: 'sephardi',
      makeUps: [{ dateKey: '2028-03-19', slot: 'sun', label }],
    });
    expect(text.sections.map((s) => s.title.he)).toEqual([
      'השלמה: יום ראשון',
      'תורה',
      'הפטרה כמנהג הספרדים',
      'משנה שבת פרק כב',
    ]);
    expect(text.sections[0]).toEqual({
      title: label,
      optional: label,
      segments: [
        { key: 'makeUp:sun:תורה', he: [[{ t: 'תורה', s: 'b' }]], en: 'Torah' },
        { key: 'Vayakhel:sun:תורה:0', he: [[{ t: 'תורה' }]] },
        {
          key: 'makeUp:sun:נביאים - מלכים א - פרק ז',
          he: [[{ t: 'נביאים - מלכים א - פרק ז', s: 'b' }]],
          en: 'Prophets',
        },
        { key: 'Vayakhel:sun:נביאים - מלכים א - פרק ז:0', he: [[{ t: 'נביאים - מלכים א - פרק ז' }]] },
      ],
    });
  });

  it('builds a make-up day with the choice and the variant of the week, and no chapter of its own', () => {
    const label = { he: 'השלמה: יום שישי', en: 'Make-up: Friday' };
    const text = chokText([VAYAKHEL, PEKUDEI], {
      ...options,
      slot: 'sun',
      makeUps: [{ dateKey: '2028-03-24', slot: 'fri', label }],
    });
    const fold = text.sections[0];
    expect(fold.chapter).toBeUndefined();
    expect(fold.segments.filter((segment) => segment.he[0][0].s === 'b').map((segment) => segment.he[0][0].t)).toEqual([
      'ויקהל · תורה',
      'ויקהל · הפטרה כמנהג האשכנזים',
      'ויקהל · משנה שבת פרק כב',
      'פקודי · תורה',
      'פקודי · הפטרה כמנהג האשכנזים',
      'פקודי · משנה שבת פרק כב',
    ]);
    expect(pickerEntries(text.sections)).toEqual([
      { index: 1, title: { he: 'ויקהל', en: 'Vayakhel' } },
      { index: 3, title: { he: 'פקודי', en: 'Pekudei' } },
    ]);
  });

  it('keys every segment by parasha, slot, heading and index, unique in the text', () => {
    const text = chokText([VAYAKHEL, PEKUDEI], {
      ...options,
      makeUps: [{ dateKey: '2028-03-24', slot: 'fri', label: { he: 'השלמה: יום שישי', en: 'Make-up: Friday' } }],
    });
    const keys = text.sections.flatMap((s) => s.segments.map((segment) => segment.key));
    const friday = (he: string, en: string) => [
      `makeUp:fri:${he} · תורה`,
      `${en}:fri:תורה:0`,
      `makeUp:fri:${he} · הפטרה כמנהג האשכנזים`,
      `${en}:fri:הפטרה כמנהג האשכנזים:0`,
      `makeUp:fri:${he} · משנה שבת פרק כב`,
      `${en}:fri:משנה שבת פרק כב:0`,
    ];
    expect(keys).toEqual([
      ...friday('ויקהל', 'Vayakhel'),
      ...friday('פקודי', 'Pekudei'),
      'Vayakhel:sun:תורה:0',
      'Vayakhel:sun:נביאים - מלכים א - פרק ז:0',
      'Pekudei:sun:תורה:0',
      'Pekudei:sun:נביאים - מלכים א - פרק ז:0',
    ]);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives a place to every key of a parasha and none to a make-up heading', () => {
    const text = chokText([VAYAKHEL, PEKUDEI], {
      ...options,
      makeUps: [{ dateKey: '2028-03-24', slot: 'fri', label: { he: 'השלמה: יום שישי', en: 'Make-up: Friday' } }],
    });
    const keys = text.sections.flatMap((s) => s.segments.map((segment) => segment.key ?? ''));
    const places = keys.map((key) => chokPlaceOf(key));
    expect(places.filter((place) => place !== null)).toEqual([
      { parasha: 'Vayakhel', slot: 'fri' },
      { parasha: 'Vayakhel', slot: 'fri' },
      { parasha: 'Vayakhel', slot: 'fri' },
      { parasha: 'Pekudei', slot: 'fri' },
      { parasha: 'Pekudei', slot: 'fri' },
      { parasha: 'Pekudei', slot: 'fri' },
      { parasha: 'Vayakhel', slot: 'sun' },
      { parasha: 'Vayakhel', slot: 'sun' },
      { parasha: 'Pekudei', slot: 'sun' },
      { parasha: 'Pekudei', slot: 'sun' },
    ]);
    expect(keys.filter((key) => key.startsWith('makeUp:')).every((key) => chokPlaceOf(key) === null)).toBe(true);
  });
});

describe('chokReaderPortion', () => {
  const portion = (request: Parameters<typeof chokReaderPortion>[0], location = JERUSALEM, inIsrael = true) =>
    view(chokReaderPortion(request, location, inIsrael));

  it('opens the portion of this moment', () => {
    expect(portion({ now: at(JERUSALEM, '2026-11-19T12:00') })).toEqual({
      parashiyot: ['Vayetzei'],
      slot: 'thu',
      shabbat: '2026-11-21',
    });
    expect(portion({ now: at(LOS_ANGELES, '2027-06-17T12:00') }, LOS_ANGELES, false)).toEqual({
      parashiyot: ['Nasso'],
      slot: 'thu',
      shabbat: '2027-06-19',
    });
  });

  it('opens Thursday night on the Friday of Vezot Haberakhah, which has no portion', () => {
    expect(portion({ now: at(JERUSALEM, '2026-10-02T08:00') })).toEqual({
      parashiyot: ['Vezot Haberakhah'],
      slot: 'thuNight',
      shabbat: '2026-10-03',
    });
    expect(portion({ now: new Date(), date: day(2026, 10, 2) })).toEqual({
      parashiyot: ['Vezot Haberakhah'],
      slot: 'thuNight',
      shabbat: '2026-10-03',
    });
  });

  it('opens the day a date names, Friday for a Shabbat, and a requested slot of the same week', () => {
    const now = at(JERUSALEM, '2026-11-19T12:00');
    expect(portion({ now, date: day(2026, 11, 16) })).toEqual({
      parashiyot: ['Vayetzei'],
      slot: 'mon',
      shabbat: '2026-11-21',
    });
    expect(portion({ now, date: day(2026, 11, 21) })).toEqual({
      parashiyot: ['Vayetzei'],
      slot: 'fri',
      shabbat: '2026-11-21',
    });
    expect(portion({ now, date: day(2026, 11, 16), slot: 'thuNight' })).toEqual({
      parashiyot: ['Vayetzei'],
      slot: 'thuNight',
      shabbat: '2026-11-21',
    });
    expect(portion({ now: at(JERUSALEM, '2026-11-16T12:00'), slot: 'sun' })).toEqual({
      parashiyot: ['Vayetzei'],
      slot: 'sun',
      shabbat: '2026-11-21',
    });
  });

  it('ignores a requested slot the week does not have', () => {
    expect(portion({ now: new Date(), date: day(2026, 9, 28), slot: 'fri' })).toEqual({
      parashiyot: ['Vezot Haberakhah'],
      slot: 'mon',
      shabbat: '2026-10-03',
    });
  });

  it('names both parashiyot of a double week', () => {
    expect(portion({ now: new Date(), date: day(2028, 3, 19) })).toEqual({
      parashiyot: ['Vayakhel', 'Pekudei'],
      slot: 'sun',
      shabbat: '2028-03-25',
    });
  });
});
