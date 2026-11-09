const fs = require('fs');
const path = require('path');
const { gunzipSync, strFromU8 } = require('fflate');
const { createHash } = require('crypto');
const { torahReading, onkelosRuns, verseLabel, parseRef, aliyahSegments, validate } = require('../build');
const { PARASHIYOT } = require('../../chok/manifest');

const SITE = path.join(__dirname, '..', '..', '..', 'docs', 'shnayim');

describe('the source cleanup', () => {
  it('reads the qere for the ketiv, points the Divine Name and drops markup', () => {
    expect(torahReading('ויצא חלכאים [חֵיל] [כָּאִים׃]')).toBe('ויצא חֵיל כָּאִים׃');
    expect(torahReading('אָמַר יְהוָה <b>אֶל</b>')).toBe('אָמַר יְהֹוָה אֶל');
  });

  it('keeps Onkelos as targum runs and its variant readings as notes', () => {
    expect(onkelosRuns("קָרְתָּא (נ''א רְחוֹבֵי) וְיָת:")).toEqual([
      { t: 'קָרְתָּא ', s: 't' },
      { t: '(נ״א רְחוֹבֵי)', s: 'n' },
      { t: ' וְיָת', s: 't' },
    ]);
  });

  it('numbers a verse, with its chapter at a chapter start or an aliyah start', () => {
    expect(verseLabel(5, 1, false)).toBe('ה (א) ');
    expect(verseLabel(15, 16, true)).toBe('טו (טז) ');
    expect(verseLabel(15, 16, false)).toBe('(טז) ');
  });

  it('reads an aliyah reference with a hyphen or an en dash, across chapters', () => {
    expect(parseRef('Genesis 1:1-2:3')).toEqual({ book: 'Genesis', from: [1, 1], to: [2, 3] });
    expect(parseRef('Deuteronomy 33:1–7')).toEqual({ book: 'Deuteronomy', from: [33, 1], to: [33, 7] });
    expect(() => parseRef('Genesis 1')).toThrow();
  });

  it('builds a segment per verse, failing on a missing verse or targum', () => {
    const torah = { Genesis: [['א׃', 'ב׃'], ['ג׃']] };
    const onkelos = { Genesis: [['a', 'b'], ['c']] };
    expect(aliyahSegments('Genesis 1:2-2:1', torah, onkelos).map((s) => s.he[0][0].t)).toEqual(['א (ב) ', 'ב (א) ']);
    expect(() => aliyahSegments('Genesis 1:1-1:2', torah, { Genesis: [['a', ''], ['c']] })).toThrow(/empty/);
  });

  it('fails when the aliyot skip a verse', () => {
    const torah = Object.fromEntries(
      ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'].map((b) => [b, [['x', 'y']]]),
    );
    expect(() => validate([{ sharedTitle: 'X', refs: ['Genesis 1:2-1:2'] }], torah)).toThrow(/does not follow/);
  });
});

describe('the published add-on', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(SITE, 'manifest.json'), 'utf8'));

  it('holds the 54 parashiyot in order, each file the bytes and hash its entry names', () => {
    expect(Object.keys(manifest.gz)).toEqual(PARASHIYOT.map((p) => p.parasha));
    let total = 0;
    for (const entry of Object.values(manifest.gz)) {
      const bytes = fs.readFileSync(path.join(SITE, entry.path));
      expect(bytes.length).toBe(entry.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);
      total += entry.bytes;
    }
    expect(manifest.gzipBytes).toBe(total);
    expect(fs.readdirSync(SITE).filter((name) => name.endsWith('.gz'))).toHaveLength(54);
  });

  it('reads every verse of the Torah once, seven aliyot a parasha, each with its targum', () => {
    let verses = 0;
    for (const entry of Object.values(manifest.gz)) {
      const asset = JSON.parse(strFromU8(gunzipSync(fs.readFileSync(path.join(SITE, entry.path)))));
      expect(asset.aliyot).toHaveLength(7);
      for (const segment of asset.aliyot.flat()) {
        expect(segment.he).toHaveLength(2);
        expect(segment.he[1].some((run) => run.s === 't' && run.t.trim())).toBe(true);
        verses++;
      }
    }
    expect(verses).toBe(5846);
  });
});
