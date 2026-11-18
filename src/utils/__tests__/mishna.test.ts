import { MishnaYomiIndex, mishnaYomiStart } from '@hebcal/learning';
import {
  MISHNAYOT,
  MISHNA_TRACTATES,
  markedBefore,
  mishnaAt,
  mishnaKey,
  mishnaLabel,
  mishnaPortion,
  mishnaYomitOn,
  twoMishnayotAfter,
} from '../mishna';
import type { TextUnit } from '../halachaText';

describe('the Mishnah schedule', () => {
  it('names the 63 tractates in the order of the cycle', () => {
    const cycle = new MishnaYomiIndex();
    const names: string[] = [];
    for (let day = 0; day < MISHNAYOT / 2; day++) {
      for (const { k } of cycle.lookup(mishnaYomiStart + day)) if (names[names.length - 1] !== k) names.push(k);
    }
    expect(MISHNA_TRACTATES).toEqual(names);
    expect(MISHNA_TRACTATES).toHaveLength(63);
  });

  it('reads Mishna Yomit by the cycle that began on 20 May 1947, two a day', () => {
    expect(mishnaYomitOn(new Date(1947, 4, 20)).refs).toEqual([
      { k: 'Berakhot', chapter: 1, mishnah: 1 },
      { k: 'Berakhot', chapter: 1, mishnah: 2 },
    ]);
    // Published for 18 November 2026 (Hebcal): Negaim 1:2-3.
    const today = mishnaYomitOn(new Date(2026, 10, 18));
    expect(today.refs).toEqual([
      { k: 'Negaim', chapter: 1, mishnah: 2 },
      { k: 'Negaim', chapter: 1, mishnah: 3 },
    ]);
    expect(today.label).toEqual({ he: 'נגעים א, ב–ג', en: 'Negaim 1:2–3' });
  });

  it('labels two mishnayot across a chapter or a tractate', () => {
    expect(
      mishnaLabel([
        { k: 'Berakhot', chapter: 9, mishnah: 5 },
        { k: 'Peah', chapter: 1, mishnah: 1 },
      ]),
    ).toEqual({ he: 'ברכות ט, ה – פאה א, א', en: 'Berakhot 9:5 – Peah 1:1' });
    expect(
      mishnaLabel([
        { k: 'Berakhot', chapter: 1, mishnah: 5 },
        { k: 'Berakhot', chapter: 2, mishnah: 1 },
      ]).en,
    ).toBe('Berakhot 1:5 – Berakhot 2:1');
  });

  it('counts the n-th mishnah of the Shas and wraps after the last', () => {
    expect(mishnaAt(0)).toEqual({ k: 'Berakhot', chapter: 1, mishnah: 1 });
    expect(mishnaAt(MISHNAYOT - 1)).toEqual({ k: 'Oktzin', chapter: 3, mishnah: 12 });
    expect(mishnaAt(MISHNAYOT)).toEqual(mishnaAt(0));
  });

  it('continues two mishnayot from the days marked before, the pruned ones counted', () => {
    expect(twoMishnayotAfter(0).label.he).toBe('ברכות א, א–ב');
    expect(twoMishnayotAfter(1).refs[0]).toEqual({ k: 'Berakhot', chapter: 1, mishnah: 3 });
    const completions = {
      '2026-11-10': { two_mishnayot: 1 },
      '2026-11-11': { other: 1 },
      '2026-11-12': { two_mishnayot: 1 },
      '2026-11-18': { two_mishnayot: 1 },
    };
    expect(markedBefore('two_mishnayot', '2026-11-18', completions, { two_mishnayot: 5 })).toBe(7);
    expect(markedBefore('two_mishnayot', '2026-11-10', completions, {})).toBe(0);
  });

  it("finds a reading's mishnayot and the Bartenura after each in the loaded tractate", () => {
    const seg = (key?: string) => ({ ...(key ? { key } : { optional: { he: 'ברטנורא', en: 'Bartenura' } }), he: [] });
    const unit: TextUnit = {
      unit: 'Peah',
      title: { he: 'פאה', en: 'Peah' },
      credits: [],
      sections: [
        {
          ref: 'Peah 1',
          title: { he: 'פאה, פרק א', en: 'Peah, chapter 1' },
          segments: [seg('mishna:peah:1:1'), seg()],
        },
        { ref: 'Peah 2', title: { he: 'פאה, פרק ב', en: 'Peah, chapter 2' }, segments: [seg('mishna:peah:2:1')] },
      ],
    };
    const refs = [
      { k: 'Peah', chapter: 1, mishnah: 1 },
      { k: 'Peah', chapter: 2, mishnah: 1 },
    ];
    expect(mishnaKey(refs[1])).toBe('mishna:peah:2:1');
    const portion = mishnaPortion({ label: mishnaLabel(refs), refs }, new Map([['Peah', unit]]));
    expect(portion.pieces).toEqual([
      { u: 'Peah', from: 0, to: 1 },
      { u: 'Peah', from: 2, to: 2 },
    ]);
    expect(() => mishnaPortion({ label: mishnaLabel(refs), refs }, new Map())).toThrow(/not loaded/);
  });
});
