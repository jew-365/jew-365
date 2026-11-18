const fs = require('fs');
const path = require('path');
const { gunzipSync, strFromU8 } = require('fflate');
const { createHash } = require('crypto');
const { cycleTractates, englishOf, tractateChapters, validate, MISHNAYOT } = require('../build');

const SITE = path.join(__dirname, '..', '..', '..', 'docs', 'mishna');

describe('the build', () => {
  it('reads the Mishna Yomit cycle: 63 tractates in order and 4,192 mishnayot', () => {
    const tractates = cycleTractates();
    expect(tractates).toHaveLength(63);
    expect(tractates[0].k).toBe('Berakhot');
    expect(tractates[62].k).toBe('Oktzin');
    expect(tractates.find((t) => t.k === 'Bikkurim').chapters).toEqual([11, 11, 12, 5]);
    expect(tractates.reduce((sum, t) => sum + t.chapters.reduce((a, b) => a + b, 0), 0)).toBe(MISHNAYOT);
  });

  it("keeps Kulp's English as plain text, without footnotes", () => {
    expect(englishOf('One <b>who</b> reads<sup>1</sup><i class="footnote">a note</i>.Then')).toBe(
      'One who reads. Then',
    );
    expect(englishOf('')).toBeUndefined();
  });

  it('builds a segment per mishnah with its number, English and Bartenura folded after it', () => {
    const [chapter] = tractateChapters('Peah', [2], {
      he: [['אֵלּוּ דְבָרִים', 'שֵׁנִית']],
      bartenura: [[['<b>אלו דברים.</b> פירוש'], []]],
      en: [['These are the things', '']],
    });
    expect(chapter.map((s) => s.key ?? s.optional.en)).toEqual(['mishna:peah:1:1', 'Bartenura', 'mishna:peah:1:2']);
    expect(chapter[0].he[0]).toEqual([{ t: '(א) ', s: 'n' }, { t: 'אֵלּוּ דְבָרִים' }]);
    expect(chapter[0].en).toBe('These are the things');
    expect(chapter[1].he[0][0]).toEqual({ t: 'אלו דברים.', s: 'b' });
    expect(chapter[2].en).toBeUndefined();
  });

  it('fails a chapter whose mishnayot differ from the cycle', () => {
    expect(validate('Peah', [2, 1], [['a', 'b'], ['c']])).toEqual([]);
    expect(validate('Peah', [2, 1], [['a'], ['c']])).toEqual(['Peah 1: 1 mishnayot, the cycle 2']);
    expect(() => tractateChapters('Peah', [2], { he: [['a', '']], bartenura: [], en: [] })).toThrow(/no Hebrew/);
  });
});

describe('the published add-on', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(SITE, 'manifest.json'), 'utf8'));
  const assets = Object.values(manifest.gz).map((entry) =>
    JSON.parse(strFromU8(gunzipSync(fs.readFileSync(path.join(SITE, entry.path))))),
  );

  it('holds the 63 tractates in the order of the cycle, each file the bytes and hash its entry names', () => {
    expect(Object.keys(manifest.gz)).toEqual(cycleTractates().map((t) => t.k));
    let total = 0;
    for (const entry of Object.values(manifest.gz)) {
      const bytes = fs.readFileSync(path.join(SITE, entry.path));
      expect(bytes.length).toBe(entry.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);
      total += entry.bytes;
    }
    expect(manifest.gzipBytes).toBe(total);
    expect(fs.readdirSync(SITE).filter((name) => name.endsWith('.gz'))).toHaveLength(63);
  });

  it('reads every mishnah of the cycle once, in Hebrew, with English and Bartenura on almost all', () => {
    const cycle = cycleTractates();
    let mishnayot = 0;
    let english = 0;
    let bartenura = 0;
    assets.forEach((asset, t) => {
      expect(asset.tractate).toBe(cycle[t].k);
      expect(asset.title.he).toMatch(/^[א-ת ]+$/);
      expect(asset.chapters.map((c) => c.filter((s) => !s.optional).length)).toEqual(cycle[t].chapters);
      for (const segment of asset.chapters.flat()) {
        if (segment.optional) {
          expect(segment.optional).toEqual({ he: 'ברטנורא', en: 'Bartenura' });
          bartenura++;
          continue;
        }
        expect(segment.he[0][1].t).toMatch(/[ְ-ּ]/);
        if (segment.en) english++;
        mishnayot++;
      }
    });
    expect(mishnayot).toBe(MISHNAYOT);
    expect(english).toBeGreaterThan(MISHNAYOT * 0.99);
    expect(bartenura).toBeGreaterThan(MISHNAYOT * 0.9);
  });

  it('carries Bikkurim chapter 4, vocalized, from the supplement', () => {
    const bikkurim = assets.find((asset) => asset.tractate === 'Bikkurim');
    const chapter = bikkurim.chapters[3].filter((s) => !s.optional);
    expect(chapter).toHaveLength(5);
    expect(chapter[0].he[0][1].t).toMatch(/[\u05b0-\u05bc]/);
    expect(chapter[0].he[0][1].t.replace(/[\u0591-\u05c7]/g, '')).toMatch(/^אנדרוגינוס יש בו דרכים/);
    expect(bikkurim.credits.map((c) => c.title).join()).toMatch(/ביכורים פרק ד/);
  });
});
