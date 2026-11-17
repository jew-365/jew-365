const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { Buffer } = require('buffer');
const { createHash } = require('crypto');
const {
  applyTextPatches,
  readSources,
  readParashiyot,
  buildOutputs,
  nextContentVersion,
  licenseText,
} = require('../build');
const { PARASHIYOT, SITE_DIR, TEXT_PATCHES, assetGzFileName, sourceFiles } = require('../manifest');
const { SLOTS } = require('../validate');

jest.setTimeout(120000);

describe('nextContentVersion', () => {
  it('starts at 1 without a previous manifest', () => {
    expect(nextContentVersion(null, { Noach: { sha256: 'a' } })).toBe(1);
  });

  it('keeps the version while every hash is unchanged and raises it when one changes', () => {
    const previous = { version: 3, files: { Noach: { sha256: 'a' }, Bo: { sha256: 'b' } } };
    expect(nextContentVersion(previous, { Noach: { sha256: 'a' }, Bo: { sha256: 'b' } })).toBe(3);
    expect(nextContentVersion(previous, { Noach: { sha256: 'a' }, Bo: { sha256: 'c' } })).toBe(4);
  });
});

describe('licenseText', () => {
  it('states the license and the processing, in Hebrew and English', () => {
    const text = licenseText();
    expect(text).toContain('בניקוד, בלי טעמים');
    expect(text).toContain('CC BY-NC-SA 2.5');
    expect(text).toContain('קובצי ה-JSON בתיקייה זו, הרגילים והדחוסים ב-gzip,');
    expect(text).toContain('The JSON files in this folder, plain and gzipped, are');
    expect(text).toContain('נוסח הרישיון: https://creativecommons.org/licenses/by-nc-sa/2.5/\n');
    expect(text.endsWith('License: https://creativecommons.org/licenses/by-nc-sa/2.5/\n')).toBe(true);
  });

  it('names the cantillation marks when the te amim files are used', () => {
    expect(licenseText(true)).toContain('בניקוד ובטעמים');
  });
});

describe('readSources', () => {
  it('names the missing te amim files', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chok-'));
    expect(() => readSources(true, dir)).toThrow(
      /^te'amim source files missing: y_hok11\.txt, y_hok21\.txt, y_hok31\.txt, y_hok41\.txt, y_hok51\.txt\./,
    );
  });

  it('names the missing nikud files', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chok-'));
    expect(() => readSources(false, dir)).toThrow(/^source files missing: y_hok10\.txt/);
  });
});

describe('applyTextPatches', () => {
  const patches = [
    { file: 'a.txt', ref: 'one', find: 'abc', replace: 'abd' },
    { file: 'b.txt', ref: 'two', find: 'xyz', replace: 'xy' },
  ];

  it('replaces the text of the patches of its own file only', () => {
    expect(applyTextPatches('1 abc 2 xyz', 'a.txt', patches)).toBe('1 abd 2 xyz');
    expect(applyTextPatches('1 abc 2 xyz', 'c.txt', patches)).toBe('1 abc 2 xyz');
  });

  it('fails when the text is absent or appears twice, naming the file and the verse', () => {
    expect(() => applyTextPatches('nothing', 'a.txt', patches)).toThrow(
      'a.txt: the text patch of one found its text 0 times, not once',
    );
    expect(() => applyTextPatches('abc abc', 'a.txt', patches)).toThrow('found its text 2 times, not once');
  });

  it('leaves no defect in the committed source as the build reads it, and counts them in the license note', () => {
    const names = sourceFiles();
    const texts = readSources();
    expect(TEXT_PATCHES).toHaveLength(85);
    expect(licenseText()).toContain('The processing corrects 85 typing errors in Targum Onkelos');
    expect(licenseText()).toContain('בעיבוד תוקנו 85 שגיאות הקלדה בתרגום אונקלוס');
    for (const { file, find, replace } of TEXT_PATCHES) {
      const text = texts[names.indexOf(file)];
      expect(text.includes(find)).toBe(false);
      expect(text.includes(replace)).toBe(true);
    }
  });
});

describe('the committed source', () => {
  let outputs;

  beforeAll(() => {
    outputs = buildOutputs();
  });

  it('parses into the 54 parashiyot with all seven days in the first', () => {
    const parashiyot = readParashiyot();
    expect(parashiyot).toHaveLength(54);
    expect(parashiyot.map((entry) => entry.parasha)).toEqual(PARASHIYOT.map((entry) => entry.parasha));
    expect(parashiyot[0].heading).toBe('בראשית');
    expect(Object.keys(parashiyot[0].slots)).toEqual(SLOTS);
  });

  it('is what docs/chok holds', () => {
    for (const [file, content] of outputs) {
      if (Buffer.isBuffer(content)) expect(fs.readFileSync(file).equals(content)).toBe(true);
      else expect(fs.readFileSync(file, 'utf8')).toBe(content);
    }
  });

  it('gzips every asset reproducibly, under its own hash, beside the plain file', () => {
    const manifest = JSON.parse(outputs.get(path.join(SITE_DIR, 'manifest.json')));
    expect(Object.keys(manifest.gz)).toEqual(Object.keys(manifest.files));
    let sum = 0;
    for (const [parasha, entry] of Object.entries(manifest.gz)) {
      const gz = outputs.get(path.join(SITE_DIR, entry.path));
      expect(Buffer.isBuffer(gz)).toBe(true);
      expect(entry.path).toBe(assetGzFileName(parasha, entry.sha256.slice(0, 8)));
      expect(createHash('sha256').update(gz).digest('hex')).toBe(entry.sha256);
      expect(entry.bytes).toBe(gz.length);
      expect([...gz.subarray(0, 10)]).toEqual([0x1f, 0x8b, 8, 0, 0, 0, 0, 0, 2, 3]);
      expect(zlib.gunzipSync(gz).toString('utf8')).toBe(outputs.get(path.join(SITE_DIR, manifest.files[parasha].path)));
      sum += entry.bytes;
    }
    expect(manifest.gzipBytes).toBe(sum);
    const published = fs.readdirSync(SITE_DIR).filter((name) => name.endsWith('.gz'));
    expect(published.sort()).toEqual(
      Object.values(manifest.gz)
        .map((entry) => entry.path)
        .sort(),
    );
  });
});
