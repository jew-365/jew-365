const fs = require('fs');
const path = require('path');
const { gunzipSync, strFromU8 } = require('fflate');
const { createHash } = require('crypto');
const { runsOf, englishOf, rambamRef, kitzurRange, divide, portionOf, versioned, bihName } = require('../build');
const { TRACKS, FESTIVALS, FESTIVAL_MATERIAL, MINOR_FASTS, KITZUR, BANNED_SOURCE } = require('../tracks');
const { PARASHIYOT } = require('../../chok/manifest');

const SITE = path.join(__dirname, '..', '..', '..', 'docs', 'halacha');
const SCHEDULES = path.join(__dirname, '..', 'schedules');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const unzip = (file) => JSON.parse(strFromU8(gunzipSync(fs.readFileSync(file))));

describe('the source cleanup', () => {
  it('splits paragraphs at <br>, keeps bold and makes small print and references notes', () => {
    expect(runsOf('אָסוּר <b>לֵאמֹר</b> (סִימָן מ"ט)<br>וְכֵן <small>הגה</small>', { notes: true })).toEqual([
      [{ t: 'אָסוּר ' }, { t: 'לֵאמֹר ', s: 'b' }, { t: '(סִימָן מ"ט)', s: 'n' }],
      [{ t: 'וְכֵן ' }, { t: 'הגה', s: 'n' }],
    ]);
  });

  it('keeps a parenthesis as text when references are not notes, and drops empty paragraphs', () => {
    expect(runsOf('משקה של (קפה)<br> <br>', {})).toEqual([[{ t: 'משקה של (קפה)' }]]);
    expect(runsOf("נ''א")).toEqual([[{ t: 'נ״א' }]]);
  });

  it('reads English without its footnotes and markup', () => {
    expect(englishOf('One <b>must</b><sup>1</sup><i class="footnote">a note</i> wash.')).toBe('One must wash.');
    expect(englishOf('')).toBeNull();
    expect(englishOf(undefined)).toBeNull();
  });

  it('reads a Rambam calendar reference and a Kitzur luach entry', () => {
    expect(rambamRef('Mishneh Torah, Forbidden Intercourse 22')).toEqual({
      book: 'Forbidden Intercourse',
      range: '22',
    });
    expect(rambamRef('Mishneh Torah, Overview of Mishneh Torah Contents 1:1-4:8')).toEqual({
      book: 'Overview of Mishneh Torah Contents',
      range: '1:1-4:8',
    });
    expect(() => rambamRef('Forbidden Intercourse')).toThrow();
    const text = [[], [], ['a', 'b', 'c']];
    expect(kitzurRange('2:5-3:E', text)).toEqual(['kitzur:2:5', 'kitzur:3:3']);
    expect(() => kitzurRange('17-8:18-2', text)).toThrow(/unreadable/);
  });

  it('divides a festival evenly in order, one segment a day when it has fewer than the period', () => {
    expect(divide([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([
      [1, 2],
      [3, 4],
      [5, 6, 7],
    ]);
    expect(divide([1, 2], 3)).toEqual([[1], [2]]);
    expect(() => divide([], 3)).toThrow();
  });

  it('cuts a portion into one piece per run of a unit', () => {
    const seg = (unit, index, siman, seif) => ({ key: `kitzur:${siman}:${seif}`, unit, index, siman, seif });
    const portion = portionOf('kitzur', [seg('a', 4, 10, 5), seg('a', 5, 10, 6), seg('b', 0, 11, 1)]);
    expect(portion.pieces).toEqual([
      { u: 'a', from: 4, to: 5 },
      { u: 'b', from: 0, to: 0 },
    ]);
    expect(portion.label).toEqual({ he: 'סימן י:ה – סימן יא:א', en: 'Siman 10:5–11:1' });
  });

  it('raises a manifest version only when its content changes', () => {
    const first = versioned({ a: 1 }, undefined);
    expect(first.version).toBe(1);
    expect(versioned({ a: 1 }, first).version).toBe(1);
    expect(versioned({ a: 2 }, first).version).toBe(2);
  });

  it('matches a Ben Ish Chai node to a parasha whatever its spelling', () => {
    expect(bihName('lech-lecha')).toBe(bihName('Lech Lecha'));
    expect(bihName('ha-azinu')).toBe(bihName("Ha'azinu"));
  });
});

describe('the schedules', () => {
  const kitzur = readJson(path.join(SCHEDULES, 'kitzur.json'));
  const rambam = readJson(path.join(SCHEDULES, 'rambam.json'));

  it('keeps each Kitzur month at its length and lists every correction with the published value', () => {
    const lengths = Object.fromEntries(Object.entries(kitzur.months).map(([m, days]) => [m, days.length]));
    expect(lengths).toEqual({
      Tishrei: 30,
      Cheshvan: 29,
      Kislev: 30,
      Tevet: 29,
      "Sh'vat": 30,
      Adar: 29,
      Nisan: 30,
      Iyyar: 29,
      Sivan: 30,
      Tamuz: 29,
      Av: 30,
      Elul: 29,
    });
    expect(kitzur.leapReview).toHaveLength(29);
    for (const c of kitzur.corrections) {
      const list = c.month === 'Leap Option B' ? kitzur.leapReview : kitzur.months[c.month];
      expect(list[c.day - 1]).toBe(c.used);
      expect(c.published).not.toBe(c.used);
    }
    expect(kitzur.source.license).toMatch(/BSD 2-Clause/);
  });

  it('holds one Rambam cycle of 1017 days from 3 Feb 2026, every day once', () => {
    expect(rambam.anchor).toBe('2026-02-03');
    expect(rambam.length).toBe(1017);
    expect(new Set(rambam.days).size).toBe(1017);
    expect(rambam.days[0]).toBe('Mishneh Torah, Transmission of the Oral Law 1-21');
    expect(rambam.days[1016]).toBe('Mishneh Torah, Kings and Wars 12');
    const day = (date) => (Date.parse(date) - Date.parse(rambam.anchor)) / 86_400_000;
    expect(rambam.days[day('2026-11-10')]).toBe('Mishneh Torah, Forbidden Intercourse 22');
  });
});

describe('the published add-on', () => {
  const manifests = Object.fromEntries(
    TRACKS.map((track) => [track, readJson(path.join(SITE, track, 'manifest.json'))]),
  );
  const units = {};
  for (const track of TRACKS) {
    units[track] = Object.fromEntries(
      Object.entries(manifests[track].gz).map(([id, entry]) => [id, unzip(path.join(SITE, track, entry.path))]),
    );
  }
  const keysOf = (track, id) => units[track][id].sections.flatMap((s) => s.segments.map((seg) => seg.key));
  const portionKeys = (track, portion) =>
    portion.pieces.flatMap(({ u, from, to }) => keysOf(track, u).slice(from, to + 1));
  const allKeys = (track) => Object.keys(manifests[track].gz).flatMap((id) => keysOf(track, id));

  it.each(TRACKS)('%s: every file is the bytes and hash its entry names, and no other file is there', (track) => {
    for (const [dir, manifest] of [
      [path.join(SITE, track), manifests[track]],
      ...(manifests[track].english.ships
        ? [[path.join(SITE, track, 'en'), readJson(path.join(SITE, track, 'en', 'manifest.json'))]]
        : []),
    ]) {
      let total = 0;
      for (const entry of Object.values(manifest.gz)) {
        const bytes = fs.readFileSync(path.join(dir, entry.path));
        expect(bytes.length).toBe(entry.bytes);
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);
        total += entry.bytes;
      }
      expect(manifest.gzipBytes).toBe(total);
      const files = fs.readdirSync(dir).filter((name) => name.endsWith('.gz'));
      expect(files.sort()).toEqual(
        Object.values(manifest.gz)
          .map((e) => e.path)
          .sort(),
      );
    }
  });

  it.each(TRACKS)('%s: every segment has a unique key and Hebrew text, and each unit its count', (track) => {
    const keys = allKeys(track);
    expect(new Set(keys).size).toBe(keys.length);
    for (const [id, unit] of Object.entries(units[track])) {
      const segments = unit.sections.flatMap((s) => s.segments);
      expect(segments).toHaveLength(manifests[track].units[id].count);
      // Text beyond its number: plain, or bold (the Overview's book headings).
      for (const seg of segments) expect(seg.he.flat().some((run) => run.s !== 'n' && run.t.trim())).toBe(true);
    }
  });

  it("reads every se'if of the Kitzur once in a year of the luach, in order", () => {
    const keys = allKeys('kitzur');
    expect(keys).toHaveLength(KITZUR.seifim);
    const read = Object.values(manifests.kitzur.schedule.months)
      .flat()
      .filter(Boolean)
      .flatMap((portion) => portionKeys('kitzur', portion));
    expect(read).toHaveLength(KITZUR.seifim);
    expect(new Set(read)).toEqual(new Set(keys));
    expect(manifests.kitzur.schedule.months.Elul[14]).toBeNull();
    expect(manifests.kitzur.schedule.leapReview.every(Boolean)).toBe(true);
  });

  it("labels a Kitzur day by its siman and se'ifim", () => {
    const { months } = manifests.kitzur.schedule;
    expect(months.Nisan[20].label).toEqual({ he: 'סימן קה:א – סימן קו:ח', en: 'Siman 105:1–106:8' });
    expect(months.Tishrei[0].label).toEqual({ he: 'סימן קלג, סעיפים טז–כא', en: 'Siman 133:16–21' });
  });

  it('reads the Mishneh Torah in book order over a Rambam cycle, each halacha at most once', () => {
    const { schedule } = manifests.rambam;
    expect(schedule.anchor).toBe('2026-02-03');
    expect(schedule.days).toHaveLength(1017);
    const read = schedule.days.flatMap((portion) => portionKeys('rambam', portion));
    const keys = allKeys('rambam');
    expect(read).toEqual(keys.filter((key) => read.includes(key)));
    // The calendar leaves out Wikisource's five Negative Mitzvot past 365 and the Order of Prayer's fifth chapter.
    expect(keys.filter((key) => !read.includes(key))).toEqual([
      ...[366, 367, 368, 369, 370].map((n) => `rambam:negative-mitzvot:${n}`),
      ...[1, 2, 3, 4, 5, 6, 7].map((n) => `rambam:the-order-of-prayer:5:${n}`),
    ]);
    expect(schedule.days[280].label).toEqual({
      he: 'הלכות איסורי ביאה, פרק כב',
      en: 'Forbidden Intercourse, chapter 22',
    });
    expect(schedule.days[0].pieces).toEqual([{ u: 'transmission-of-the-oral-law', from: 0, to: 20 }]);
    expect(schedule.days[1016].label).toEqual({ he: 'הלכות מלכים ומלחמות, פרק יב', en: 'Kings and Wars, chapter 12' });
  });

  it('names in each Rambam unit the Hebrew version it was built from', () => {
    expect(units.rambam.sabbath.credits).toEqual([expect.objectContaining({ license: 'Public Domain' })]);
    expect(units.rambam.blessings.credits).toEqual([expect.objectContaining({ license: 'CC-BY-SA' })]);
    expect(manifests.rambam.credit.he).toMatch(/CC-BY-SA/);
  });

  it('publishes no text whose source is Mechon Mamre, whatever title Sefaria gives it', () => {
    expect(BANNED_SOURCE.test('http://www.mechon-mamre.org/i/0001n.htm')).toBe(true);
    for (const track of TRACKS) {
      for (const unit of Object.values(units[track])) {
        for (const credit of unit.credits) expect(credit.url).not.toMatch(BANNED_SOURCE);
      }
      for (const credit of manifests[track].credits) expect(credit.url).not.toMatch(BANNED_SOURCE);
    }
    expect(units.rambam['positive-mitzvot'].credits).toEqual([
      expect.objectContaining({ title: 'Wikisource Mishneh Torah, via Sefaria', license: 'CC-BY-SA' }),
    ]);
  });

  it('has first-year Ben Ish Chai halachot for every parasha', () => {
    const { parashiyot } = manifests.ben_ish_chai.schedule;
    expect(Object.keys(parashiyot)).toEqual(PARASHIYOT.map((p) => p.parasha));
    for (const entry of Object.values(parashiyot)) {
      expect(units.ben_ish_chai[entry[1]]).toBeDefined();
      if (entry[2]) expect(units.ben_ish_chai[entry[2]]).toBeDefined();
    }
    expect(parashiyot.Tazria[1]).toBe(parashiyot.Metzora[1]);
    expect(parashiyot.Tazria[2]).not.toBe(parashiyot.Metzora[2]);
    expect(parashiyot.Vayeshev[2]).toBe('y1-chanukah');
    expect(parashiyot.Devarim[2]).toBeUndefined();
  });

  it.each(TRACKS)('%s: a non-empty portion for every day of every festival it covers', (track) => {
    const { festivals } = manifests[track];
    expect(Object.keys(festivals).sort()).toEqual(Object.keys(FESTIVAL_MATERIAL[track]).sort());
    for (const [festival, days] of Object.entries(festivals)) {
      // Material shorter than the period fills its last days.
      expect(days.length).toBe(
        Math.min(FESTIVALS[festival].days, days.flatMap((portion) => portionKeys(track, portion)).length),
      );
      for (const portion of days) expect(portionKeys(track, portion).length).toBeGreaterThan(0);
    }
  });

  it('reports the festivals Ben Ish Chai does not cover: the minor fasts', () => {
    const missing = Object.keys(FESTIVALS).filter((f) => !manifests.ben_ish_chai.festivals[f]);
    expect(missing).toEqual(MINOR_FASTS);
  });

  it('ships English only for a track whose translation covers enough of it, aligned with its Hebrew', () => {
    const ships = TRACKS.filter((track) => manifests[track].english.ships);
    expect(ships).toEqual(['kitzur']);
    for (const track of ships) {
      const en = readJson(path.join(SITE, track, 'en', 'manifest.json'));
      expect(Object.keys(en.gz)).toEqual(Object.keys(manifests[track].gz));
      for (const [id, entry] of Object.entries(en.gz)) {
        const file = unzip(path.join(SITE, track, 'en', entry.path));
        expect(file.en).toHaveLength(keysOf(track, id).length);
      }
    }
    for (const track of TRACKS.filter((t) => !ships.includes(t))) {
      expect(fs.existsSync(path.join(SITE, track, 'en'))).toBe(false);
    }
  });
});
