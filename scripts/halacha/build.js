#!/usr/bin/env node
// pnpm halacha:build: the halacha add-on in docs/halacha, one folder per track (Kitzur Shulchan Aruch, Ben Ish Chai,
// Mishneh Torah) and one for Sefer Chofetz Chaim: content-addressed gzips of the text by unit, a manifest with each unit's title, the daily schedule and
// the festival portions, and an English folder for a track whose translation covers enough of it.
// `--rambam-cycle <YYYY-MM-DD>` instead rewrites schedules/rambam.json from Sefaria's "Daily Rambam" calendar, starting
// on that day, the first of a cycle.
const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');
const { createHash } = require('crypto');
const { gzipSync } = require('fflate');
const { gematriya } = require('@hebcal/core');
const { PARASHIYOT, assetSlug } = require('../chok/manifest');
const {
  SEFARIA,
  SITE_DIR,
  SCHEDULE_DIR,
  FORMAT,
  TRACKS,
  BOOK,
  KITZUR,
  BEN_ISH_CHAI,
  CHAFETZ_CHAIM,
  RAMBAM_HE,
  BANNED_SOURCE,
  RAMBAM_EMPTY,
  ENGLISH_LICENCES,
  ENGLISH_THRESHOLD,
  FESTIVALS,
  FESTIVAL_MATERIAL,
  BIH_NODE,
} = require('./tracks');

const CACHE_DIR = path.join(__dirname, '.cache');
const GZIP_OPTIONS = { level: 9, mtime: 0 };
const USER_AGENT = 'jew365-halacha-build/1.0 (https://github.com/jew-365/jew-365)';
const RAMBAM_CYCLE_DAYS = 1017;

const number = (n) => gematriya(n).replace(/[׳״]/g, '');
const slug = (text) => assetSlug(text.replace(/'/g, ''));

// ---------------------------------------------------------------------------------------------------------------
// Sources

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function cached(name, url) {
  const file = path.join(CACHE_DIR, `${name}.json`);
  if (!fs.existsSync(file)) {
    let lastError;
    let wait = 0;
    for (let attempt = 0; attempt < 8; attempt++) {
      if (attempt) await sleep(Math.min(Math.max(wait, 3000 * attempt), 60_000));
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': USER_AGENT },
          signal: AbortSignal.timeout(60_000),
        });
        // Sefaria rate-limits a shared address; wait as long as it asks.
        wait = Number(response.headers.get('retry-after') ?? 0) * 1000;
        if (response.status === 429 || response.status >= 500) throw new Error(`HTTP ${response.status}`);
        if (!response.ok) throw new Error(`download failed for ${name}: HTTP ${response.status}`);
        const text = await response.text();
        JSON.parse(text);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, text);
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (/download failed/.test(error.message)) break;
      }
    }
    if (lastError) throw new Error(`${name}: ${lastError.message}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const versionUrl = (title, language, version) =>
  `${SEFARIA}/download/version/${encodeURIComponent(`${title} - ${language} - ${version}`)}.json`;
const cacheName = (...parts) => parts.map((part) => slug(part)).join('/');

async function inPool(items, size, task) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await task(items[index], index);
      }
    }),
  );
  return results;
}

// The English versions of a text a credit may name: its own language (no "[pt]" tag) under an accepted licence.
function englishCandidates(versions) {
  return versions
    .filter((v) => v.language === 'en' && !/\[[a-z]{2}\]/.test(v.versionTitle))
    .filter((v) => ENGLISH_LICENCES.includes(v.license))
    .sort((a, b) => ENGLISH_LICENCES.indexOf(a.license) - ENGLISH_LICENCES.indexOf(b.license));
}

async function readText(title, language, version) {
  const data = await cached(cacheName(title, language, version), versionUrl(title, language, version));
  return { text: data.text, version: data.versionTitle, license: data.license, source: data.versionSource };
}

// ---------------------------------------------------------------------------------------------------------------
// Text cleanup

// A source string as paragraphs of runs: <br> splits paragraphs, <b> is bold, <small> a note, and with `notes` every
// parenthesis is a note (the references of the Kitzur and the Rambam).
function runsOf(html, { notes = false } = {}) {
  const paragraphs = String(html)
    .replace(/[‍‎‏]/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/''/g, '״')
    .split(/<br\s*\/?>/i);
  return paragraphs
    .map((paragraph) => {
      const runs = [];
      const push = (t, s) => {
        const text = t.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
        if (!text.trim()) {
          if (runs.length && text) runs[runs.length - 1].t += ' ';
          return;
        }
        const last = runs[runs.length - 1];
        if (last && last.s === s) last.t += text;
        else runs.push(s ? { t: text, s } : { t: text });
      };
      const pattern = notes ? /(<b>.*?<\/b>|<small>.*?<\/small>|\([^()]*\))/g : /(<b>.*?<\/b>|<small>.*?<\/small>)/g;
      for (const part of paragraph.split(pattern)) {
        if (!part) continue;
        if (part.startsWith('<b>')) push(part, 'b');
        else if (part.startsWith('<small>') || (notes && part.startsWith('('))) push(part, 'n');
        else push(part);
      }
      if (runs.length) {
        runs[0].t = runs[0].t.replace(/^\s+/, '');
        runs[runs.length - 1].t = runs[runs.length - 1].t.replace(/\s+$/, '');
      }
      return runs.filter((run) => run.t);
    })
    .filter((runs) => runs.length);
}

// Takes every <i class="footnote"> out, with the <i> elements nested inside it: the text left and each footnote's
// inner HTML, in order.
function splitFootnotes(html) {
  const open = '<i class="footnote">';
  let out = html;
  const notes = [];
  for (let start = out.indexOf(open); start !== -1; start = out.indexOf(open)) {
    const tags = /<i[\s>]|<\/i>/g;
    tags.lastIndex = start + 1;
    let depth = 1;
    let end = out.length;
    for (let tag = tags.exec(out); tag; tag = tags.exec(out)) {
      depth += tag[0] === '</i>' ? -1 : 1;
      if (!depth) {
        end = tag.index + 4;
        break;
      }
    }
    notes.push(out.slice(start + open.length, end - 4));
    out = out.slice(0, start) + out.slice(end);
  }
  return { text: out, notes };
}

const withoutFootnotes = (html) => splitFootnotes(html).text;

function englishOf(html) {
  const text = withoutFootnotes(String(html ?? ''))
    .replace(/<sup[^>]*>.*?<\/sup>/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
  return text || null;
}

// A segment: its number as a note run before the first paragraph.
function segment(key, label, paragraphs) {
  const [first, ...rest] = paragraphs;
  return { key, he: [[{ t: `(${label}) `, s: 'n' }, ...first], ...rest] };
}

// ---------------------------------------------------------------------------------------------------------------
// Tracks: each returns its units (sections of keyed segments, in book order) and a `seg` list in the same order,
// every item { key, unit, index, ... } with what its label needs.

function addUnit(track, units, list, unit) {
  units.push(unit);
  let index = 0;
  for (const section of unit.sections) {
    for (const s of section.segments) list.push({ ...s.meta, key: s.key, unit: unit.id, index: index++ });
  }
  for (const section of unit.sections) for (const s of section.segments) delete s.meta;
}

async function readKitzur() {
  const index = await cached('kitzur/index', `${SEFARIA}/api/v2/raw/index/${encodeURIComponent(KITZUR.index)}`);
  const he = await readText(KITZUR.index, 'he', KITZUR.he);
  const versions = await cached('kitzur/versions', `${SEFARIA}/api/texts/versions/${encodeURIComponent(KITZUR.index)}`);
  const english = [];
  for (const v of englishCandidates(versions)) english.push(await readText(KITZUR.index, 'en', v.versionTitle));
  return { index, he, english };
}

function kitzurTitles(index) {
  return index.alt_structs.Topic.nodes.map((node) => {
    const he = node.titles.find((t) => t.lang === 'he' && t.primary).text.trim();
    const en = node.titles.find((t) => t.lang === 'en' && t.primary).text.trim();
    return {
      he: he.replace(/^\[סימן ([^\]]+)\]\s*/, 'סימן $1: '),
      en: en.replace(/^Chapter (\d+)\s*/, 'Siman $1: '),
    };
  });
}

function buildKitzur({ index, he }) {
  const text = he.text;
  if (text.length !== KITZUR.simanim) throw new Error(`Kitzur: ${text.length} simanim, not ${KITZUR.simanim}`);
  const seifim = text.reduce((sum, siman) => sum + siman.length, 0);
  if (seifim !== KITZUR.seifim) throw new Error(`Kitzur: ${seifim} se'ifim, not ${KITZUR.seifim}`);
  const titles = kitzurTitles(index);
  const units = [];
  const list = [];
  for (let first = 1; first <= KITZUR.simanim; first += KITZUR.block) {
    const last = Math.min(first + KITZUR.block - 1, KITZUR.simanim);
    const id = `simanim-${String(first).padStart(3, '0')}-${String(last).padStart(3, '0')}`;
    const sections = [];
    for (let s = first; s <= last; s++) {
      sections.push({
        ref: `${s}`,
        title: titles[s - 1],
        segments: text[s - 1].map((source, i) => {
          const paragraphs = runsOf(source, { notes: true });
          if (!paragraphs.length) throw new Error(`Kitzur ${s}:${i + 1}: empty`);
          return { ...segment(`kitzur:${s}:${i + 1}`, number(i + 1), paragraphs), meta: { siman: s, seif: i + 1 } };
        }),
      });
    }
    addUnit('kitzur', units, list, {
      id,
      title:
        first === last
          ? { he: `סימן ${number(first)}`, en: `Siman ${first}` }
          : { he: `סימנים ${number(first)}–${number(last)}`, en: `Simanim ${first}–${last}` },
      sections,
    });
  }
  return { units, list };
}

async function readBenIshChai() {
  const index = await cached(
    'ben-ish-chai/index',
    `${SEFARIA}/api/v2/raw/index/${encodeURIComponent(BEN_ISH_CHAI.index)}`,
  );
  const he = await readText(BEN_ISH_CHAI.index, 'he', BEN_ISH_CHAI.he);
  const versions = await cached(
    'ben-ish-chai/versions',
    `${SEFARIA}/api/texts/versions/${encodeURIComponent(BEN_ISH_CHAI.index)}`,
  );
  const english = [];
  for (const v of englishCandidates(versions)) {
    english.push(await readText(BEN_ISH_CHAI.index, 'en', v.versionTitle));
  }
  return { index, he, english };
}

const YEAR_TITLE = { 1: { he: 'שנה ראשונה', en: 'First year' }, 2: { he: 'שנה שנייה', en: 'Second year' } };

// A node's Hebrew name from the parashiyot's (a combined node joins its two); Sefaria titles these nodes by a shared
// term the raw index does not spell out.
function bihNodeHebrew(key) {
  if (key === 'Chanukah') return 'חנוכה';
  const parts = Object.keys(BIH_NODE[1]).filter((parasha) => BIH_NODE[1][parasha] === key);
  return (parts.length ? parts : [key])
    .map((name) => {
      const found = PARASHIYOT.find((p) => bihName(p.parasha) === bihName(name));
      if (!found) throw new Error(`Ben Ish Chai: no Hebrew name for ${key}`);
      return found.heading;
    })
    .join('-');
}

function bihNodes(index) {
  const years = index.schema.nodes.filter((node) => BEN_ISH_CHAI.years.includes(node.key));
  return years.map((year) => year.nodes.map((node) => ({ key: node.key, he: bihNodeHebrew(node.key), en: node.key })));
}

// The halachot of a node: each halacha's paragraphs, empty ones dropped.
const bihHalachot = (he, y, key) => he.text[BEN_ISH_CHAI.years[y - 1]][key]?.[''] ?? [];

function buildBenIshChai({ index, he }) {
  const units = [];
  const list = [];
  bihNodes(index).forEach((nodes, i) => {
    const y = i + 1;
    for (const node of nodes) {
      if (BEN_ISH_CHAI.skip.some(([year, key]) => year === y && key === node.key)) continue;
      const halachot = bihHalachot(he, y, node.key)
        .map((paragraphs, source) => ({ paragraphs: runsOf([].concat(paragraphs).join('<br>')), source }))
        .filter(({ paragraphs }) => paragraphs.length);
      if (!halachot.length) continue;
      const nodeSlug = slug(node.key);
      const title = {
        he: `${YEAR_TITLE[y].he}, ${node.key === 'Chanukah' ? '' : 'פרשת '}${node.he}`,
        en: `${YEAR_TITLE[y].en}, ${node.en}`,
      };
      addUnit('ben_ish_chai', units, list, {
        id: `y${y}-${nodeSlug}`,
        title,
        sections: [
          {
            ref: `${y}:${node.key}`,
            title,
            segments: halachot.map(({ paragraphs, source }, n) => ({
              ...segment(`ben_ish_chai:${y}:${nodeSlug}:${n + 1}`, number(n + 1), paragraphs),
              meta: { year: y, node: node.key, nodeHe: node.he, halacha: n + 1, source },
            })),
          },
        ],
      });
    }
  });
  return { units, list };
}

// "Mishneh Torah, Sabbath 22" → { book: 'Sabbath', range: '22' }
function rambamRef(ref) {
  const match = /^Mishneh Torah, (.+) ([\d:]+(?:-[\d:]+)?)$/.exec(ref);
  if (!match) throw new Error(`unreadable Rambam ref "${ref}"`);
  return { book: match[1], range: match[2] };
}

function rambamBooks(cycle) {
  const books = [];
  for (const ref of cycle.days) {
    const { book } = rambamRef(ref);
    if (books[books.length - 1] !== book) {
      if (books.includes(book)) throw new Error(`Rambam cycle: ${book} read twice`);
      books.push(book);
    }
  }
  return books;
}

async function readRambam(cycle) {
  const books = rambamBooks(cycle);
  return {
    books: await inPool(books, 4, async (book) => {
      const title = `Mishneh Torah, ${book}`;
      const index = await cached(
        cacheName('rambam', book, 'index'),
        `${SEFARIA}/api/v2/raw/index/${encodeURIComponent(title)}`,
      );
      const versions = await cached(
        cacheName('rambam', book, 'versions'),
        `${SEFARIA}/api/texts/versions/${encodeURIComponent(title)}`,
      );
      // The first preferred Hebrew version that holds every chapter of the book (every halacha of a one-level book):
      // Torat Emet's Leavened and Unleavened Bread lacks chapter 9, the Haggadah, read by the calendar. A version
      // whose source is Mechon Mamre is skipped whatever its title (BANNED_SOURCE). Sefaria's halacha totals are off by one in a few
      // books, so only the chapters are counted.
      let he = null;
      for (const name of RAMBAM_HE.filter((n) => versions.some((v) => v.language === 'he' && v.versionTitle === n))) {
        const candidate = await readText(title, 'he', name);
        if (BANNED_SOURCE.test(candidate.source ?? '')) continue;
        if (candidate.text.length === index.schema.lengths[0]) {
          he = candidate;
          break;
        }
      }
      if (!he) throw new Error(`${title}: no Hebrew version of ${RAMBAM_HE.join(', ')} holds the whole book`);
      const english = [];
      for (const v of englishCandidates(versions)) english.push(await readText(title, 'en', v.versionTitle));
      return { book, index, he, english };
    }),
  };
}

function buildRambam({ books }) {
  const units = [];
  const list = [];
  for (const { book, index, he } of books) {
    const bookHe = index.schema.titles.find((t) => t.lang === 'he' && t.primary).text.replace(/^משנה תורה,\s*/, '');
    const id = slug(book);
    const depth = index.schema.depth;
    const chapters = depth === 1 ? [he.text] : he.text;
    const sections = chapters.map((halachot, c) => ({
      ref: depth === 1 ? book : `${book} ${c + 1}`,
      title:
        depth === 1
          ? { he: bookHe, en: book }
          : { he: `${bookHe}, פרק ${number(c + 1)}`, en: `${book}, chapter ${c + 1}` },
      segments: halachot.flatMap((source, h) => {
        const paragraphs = runsOf(source, { notes: true });
        const address = depth === 1 ? `${book} ${h + 1}` : `${book} ${c + 1}:${h + 1}`;
        if (!paragraphs.length && RAMBAM_EMPTY.includes(address)) return [];
        if (!paragraphs.length) throw new Error(`Rambam ${address}: empty`);
        const key = depth === 1 ? `rambam:${id}:${h + 1}` : `rambam:${id}:${c + 1}:${h + 1}`;
        return [
          {
            ...segment(key, number(h + 1), paragraphs),
            meta: { book, bookHe, depth, chapter: depth === 1 ? null : c + 1, halacha: h + 1 },
          },
        ];
      }),
    }));
    if (sections.some((section) => !section.segments.length)) throw new Error(`Rambam ${book}: an empty chapter`);
    addUnit('rambam', units, list, { id, title: { he: bookHe, en: book }, sections, credits: [credit(he)] });
  }
  return { units, list };
}

async function readChafetzChaim() {
  const he = await readText(CHAFETZ_CHAIM.index, 'he', CHAFETZ_CHAIM.he);
  const versions = await cached(
    'chafetz-chaim/versions',
    `${SEFARIA}/api/texts/versions/${encodeURIComponent(CHAFETZ_CHAIM.index)}`,
  );
  const english = [];
  for (const v of englishCandidates(versions)) english.push(await readText(CHAFETZ_CHAIM.index, 'en', v.versionTitle));
  return { he, english };
}

// The parts of the book a day reads by paragraph, as the luach names them, with their place in the text and title.
const CC_SECTIONS = {
  opening: { node: 'Opening Comments', he: 'פתיחה', en: 'Introduction' },
  negative: { node: 'Negative Commandments', he: 'פתיחה, לאוין', en: 'Introduction, negative commandments' },
  positive: { node: 'Positive Commandments', he: 'פתיחה, עשין', en: 'Introduction, positive commandments' },
  curses: { node: 'Curses', he: 'פתיחה, ארורין', en: 'Introduction, curses' },
};
const CC_PARTS = {
  lashonHara: { he: 'הלכות לשון הרע', en: 'Lashon hara', unit: 'lashon-hara' },
  rechilut: { he: 'הלכות רכילות', en: 'Rechilut', unit: 'rechilut' },
};

// A paragraph of the Chofetz Chaim's Hebrew: its runs, then each of its footnotes (the author's glosses) as a
// paragraph of its own opened by the asterisk the text marks it with.
// The letters in parentheses the text carries, "(א)" or "(ח-ט)", point into the Be'er Mayim Chaim, which the add-on
// does not ship, so they are dropped. Every other parenthesis stays in the text: the author writes halacha in them too.
const BMC_MARKER = /\s*\((?:[קרשת]?(?:[יכלמנסעפצ]|טו|טז)?[א-ט]?)(?:-[קרשת]?(?:[יכלמנסעפצ]|טו|טז)?[א-ט]?)?\)/g;

function ccParagraphs(html) {
  const { text, notes: glosses } = splitFootnotes(
    String(html)
      .replace(/<sup class="footnote-marker">(.*?)<\/sup>/g, '$1')
      .replace(BMC_MARKER, (marker) => (/\(\)/.test(marker) ? marker : '')),
  );
  return [...runsOf(text), ...glosses.flatMap((gloss) => runsOf(`* ${gloss}`))];
}

function ccSegment(key, label, sources, meta, where) {
  const paragraphs = [].concat(sources).flatMap((source) => ccParagraphs(source));
  if (!paragraphs.length) throw new Error(`Chafetz Chaim ${where}: empty`);
  return { ...segment(key, label, paragraphs), meta };
}

function buildChafetzChaim({ he }) {
  const text = he.text;
  const units = [];
  const list = [];
  const add = (unit) => addUnit('chafetz_chaim', units, list, unit);
  const preface = { he: 'הקדמה', en: 'Preface' };
  add({
    id: 'preface',
    title: preface,
    sections: [
      {
        ref: CHAFETZ_CHAIM.preface,
        title: preface,
        segments: text[CHAFETZ_CHAIM.preface].map((source, i) =>
          ccSegment(
            `chafetz_chaim:preface:${i + 1}`,
            number(i + 1),
            source,
            { part: 'preface', n: i + 1 },
            `preface ${i + 1}`,
          ),
        ),
      },
    ],
  });
  const introduction = text[CHAFETZ_CHAIM.introduction];
  add({
    id: 'introduction',
    title: { he: 'פתיחה', en: 'Introduction' },
    sections: Object.entries(CC_SECTIONS).map(([part, { node, ...title }]) => ({
      ref: `${CHAFETZ_CHAIM.introduction}, ${node}`,
      title,
      segments: introduction[node].flatMap((source, i) =>
        CHAFETZ_CHAIM.empty.includes(`${part} ${i + 1}`)
          ? []
          : [
              ccSegment(
                `chafetz_chaim:${part}:${i + 1}`,
                number(i + 1),
                source,
                { part, n: i + 1 },
                `${part} ${i + 1}`,
              ),
            ],
      ),
    })),
  });
  for (const [part, name] of Object.entries(CC_PARTS)) {
    const principles = text[CHAFETZ_CHAIM.parts[part]];
    Object.keys(principles).forEach((node, p) => {
      const principle = p + 1;
      if (node !== `Principle ${principle}`) throw new Error(`Chafetz Chaim: ${node} is not principle ${principle}`);
      const title = { he: `${name.he}, כלל ${number(principle)}`, en: `${name.en}, principle ${principle}` };
      const meta = (seif) => ({ part, principle, seif });
      add({
        id: `${name.unit}-${String(principle).padStart(2, '0')}`,
        title,
        sections: [
          {
            ref: `${CHAFETZ_CHAIM.parts[part]}, ${node}`,
            title,
            segments: [
              ccSegment(
                `chafetz_chaim:${part}:${principle}:0`,
                'פתיחה',
                principles[node]['Opening Comments'],
                meta(0),
                `${part} ${principle} opening`,
              ),
              ...principles[node][''].map((seif, i) =>
                ccSegment(
                  `chafetz_chaim:${part}:${principle}:${i + 1}`,
                  number(i + 1),
                  seif,
                  meta(i + 1),
                  `${part} ${principle}:${i + 1}`,
                ),
              ),
            ],
          },
        ],
      });
    });
  }
  const illustrations = { he: 'ציורים', en: 'Illustrations' };
  add({
    id: 'illustrations',
    title: illustrations,
    sections: [
      {
        ref: CHAFETZ_CHAIM.illustrations,
        title: illustrations,
        segments: Object.entries(text[CHAFETZ_CHAIM.illustrations]).map(([node, source], i) => {
          if (node !== `Illustration ${i + 1}`) throw new Error(`Chafetz Chaim: ${node} is not illustration ${i + 1}`);
          return ccSegment(
            `chafetz_chaim:illustrations:${i + 1}`,
            number(i + 1),
            source,
            { part: 'illustrations', n: i + 1 },
            node,
          );
        }),
      },
    ],
  });
  return { units, list };
}

// ---------------------------------------------------------------------------------------------------------------
// Portions: a run of segments in book order as the pieces of units it reads, with a label.

// "1, 3–5" of numbers, in gematriya for Hebrew.
function numberRanges(numbers, he) {
  const runs = [];
  for (const n of numbers) {
    const run = runs[runs.length - 1];
    if (run && run[1] === n - 1) run[1] = n;
    else runs.push([n, n]);
  }
  const show = (n) => (he ? number(n) : `${n}`);
  return runs.map(([a, b]) => (a === b ? show(a) : `${show(a)}–${show(b)}`)).join(', ');
}

// A Chofetz Chaim portion's place: each part or principle it reads, with its paragraphs, se'ifim or illustrations
// unless it reads the whole of it.
function chafetzChaimLabel(segments, list) {
  const groups = [];
  for (const s of segments) {
    const id = s.principle ? `${s.part}:${s.principle}` : s.part;
    const group = groups[groups.length - 1];
    if (group && group.id === id) group.items.push(s);
    else groups.push({ id, items: [s] });
  }
  const one = (group, he) => {
    const s = group.items[0];
    const whole =
      group.items.length ===
      list.filter((x) => (x.principle ? `${x.part}:${x.principle}` : x.part) === group.id).length;
    if (s.principle) {
      const name = he
        ? `${CC_PARTS[s.part].he}, כלל ${number(s.principle)}`
        : `${CC_PARTS[s.part].en}, principle ${s.principle}`;
      if (whole) return name;
      const opening = group.items[0].seif === 0;
      const seifim = group.items.map((x) => x.seif).filter(Boolean);
      const noun = he ? (seifim.length === 1 ? 'סעיף' : 'סעיפים') : seifim.length === 1 ? "se'if" : "se'ifim";
      const parts = [
        opening ? (he ? 'פתיחה' : 'opening') : null,
        seifim.length ? `${noun} ${numberRanges(seifim, he)}` : null,
      ];
      return `${name}, ${parts.filter(Boolean).join(he ? ' ו' : ' and ')}`;
    }
    const title =
      s.part === 'preface'
        ? { he: 'הקדמה', en: 'Preface' }
        : s.part === 'illustrations'
          ? { he: 'ציורים', en: 'Illustrations' }
          : CC_SECTIONS[s.part];
    const name = he ? title.he : title.en;
    return whole
      ? name
      : `${name} ${numberRanges(
          group.items.map((x) => x.n),
          he,
        )}`;
  };
  return {
    he: groups.map((group) => one(group, true)).join('; '),
    en: groups.map((group) => one(group, false)).join('; '),
  };
}

const LABEL = {
  kitzur(first, last) {
    if (first.siman === last.siman) {
      const he =
        first.seif === last.seif
          ? `סימן ${number(first.siman)}, סעיף ${number(first.seif)}`
          : `סימן ${number(first.siman)}, סעיפים ${number(first.seif)}–${number(last.seif)}`;
      const en = `Siman ${first.siman}:${first.seif}${first.seif === last.seif ? '' : `–${last.seif}`}`;
      return { he, en };
    }
    return {
      he: `סימן ${number(first.siman)}:${number(first.seif)} – סימן ${number(last.siman)}:${number(last.seif)}`,
      en: `Siman ${first.siman}:${first.seif}–${last.siman}:${last.seif}`,
    };
  },
  ben_ish_chai(first, last) {
    const place = (s) => ({
      he: `${YEAR_TITLE[s.year].he}, ${s.node === 'Chanukah' ? '' : 'פרשת '}${s.nodeHe}`,
      en: `${YEAR_TITLE[s.year].en}, ${s.node}`,
    });
    const a = place(first);
    if (first.node === last.node && first.year === last.year) {
      const one = first.halacha === last.halacha;
      return {
        he: `${a.he}, ${one ? 'הלכה' : 'הלכות'} ${number(first.halacha)}${one ? '' : `–${number(last.halacha)}`}`,
        en: `${a.en}, ${one ? 'halacha' : 'halachot'} ${first.halacha}${one ? '' : `–${last.halacha}`}`,
      };
    }
    const b = place(last);
    return {
      he: `${a.he} ${number(first.halacha)} – ${b.he} ${number(last.halacha)}`,
      en: `${a.en} ${first.halacha} – ${b.en} ${last.halacha}`,
    };
  },
  rambam(first, last) {
    const at = (s, he) =>
      s.depth === 1
        ? he
          ? number(s.halacha)
          : `${s.halacha}`
        : he
          ? `${number(s.chapter)}:${number(s.halacha)}`
          : `${s.chapter}:${s.halacha}`;
    const lastOfChapter = last.lastInChapter;
    if (first.book === last.book) {
      if (first.depth === 2 && first.halacha === 1 && lastOfChapter) {
        const one = first.chapter === last.chapter;
        return {
          he: `${first.bookHe}, ${one ? 'פרק' : 'פרקים'} ${number(first.chapter)}${one ? '' : `–${number(last.chapter)}`}`,
          en: `${first.book}, ${one ? 'chapter' : 'chapters'} ${first.chapter}${one ? '' : `–${last.chapter}`}`,
        };
      }
      const one = first.key === last.key;
      return {
        he: `${first.bookHe} ${at(first, true)}${one ? '' : `–${at(last, true)}`}`,
        en: `${first.book} ${at(first, false)}${one ? '' : `–${at(last, false)}`}`,
      };
    }
    return {
      he: `${first.bookHe} ${at(first, true)} – ${last.bookHe} ${at(last, true)}`,
      en: `${first.book} ${at(first, false)} – ${last.book} ${at(last, false)}`,
    };
  },
};

// Segments (from the track's list) as a portion: consecutive segments of one unit become one piece. The Chofetz
// Chaim's label reads every segment, against the whole list (`list`).
function portionOf(track, segments, list) {
  if (!segments.length) throw new Error(`${track}: an empty portion`);
  const pieces = [];
  for (const s of segments) {
    const last = pieces[pieces.length - 1];
    if (last && last.u === s.unit && last.to === s.index - 1) last.to = s.index;
    else pieces.push({ u: s.unit, from: s.index, to: s.index });
  }
  const label =
    track === 'chafetz_chaim'
      ? chafetzChaimLabel(segments, list)
      : LABEL[track](segments[0], segments[segments.length - 1]);
  return { label, pieces };
}

function positions(list) {
  return new Map(list.map((s, i) => [s.key, i]));
}

// ---- Kitzur schedule ("107:1-108:E" by Hebrew month and day, from schedules/kitzur.json)

function kitzurRange(entry, text) {
  const match = /^(\d+):(\d+)-(\d+):(\d+|E)$/.exec(entry);
  if (!match) throw new Error(`Kitzur luach: unreadable entry "${entry}"`);
  const [, s1, i1, s2, i2] = match;
  const end = i2 === 'E' ? text[Number(s2) - 1].length : Number(i2);
  return [`kitzur:${s1}:${i1}`, `kitzur:${s2}:${end}`];
}

function slice(list, at, from, to, where) {
  const a = at.get(from);
  const b = at.get(to);
  if (a === undefined || b === undefined) throw new Error(`${where}: ${from}–${to} is outside the text`);
  if (a > b) throw new Error(`${where}: ${from}–${to} runs backwards`);
  return list.slice(a, b + 1);
}

function kitzurSchedule(luach, built, text) {
  const at = positions(built.list);
  const day = (entry, where) =>
    entry === 'Klalim' ? null : portionOf('kitzur', slice(built.list, at, ...kitzurRange(entry, text), where));
  return {
    kind: 'hebrew',
    months: Object.fromEntries(
      Object.entries(luach.months).map(([month, days]) => [
        month,
        days.map((entry, i) => day(entry, `Kitzur luach ${month} ${i + 1}`)),
      ]),
    ),
    leapReview: luach.leapReview.map((entry, i) => day(entry, `Kitzur leap review ${i + 1}`)),
  };
}

// ---- Chofetz Chaim schedule ("lashonHara 1.1-1.2" by Hebrew month and day of a common or a leap year, from
// schedules/chafetz_chaim.json)

const CC_PARAGRAPH_PARTS = ['preface', 'opening', 'negative', 'positive', 'curses', 'illustrations'];

function chafetzChaimSegments(entry, list) {
  const match = /^([a-zA-Z]+)(?: (.+))?$/.exec(entry);
  const part = match?.[1];
  const inPart = list.filter((s) => s.part === part);
  if (!match || !inPart.length) throw new Error(`Chafetz Chaim luach: unreadable entry "${entry}"`);
  const spec = match[2];
  if (!spec) return inPart;
  if (CC_PARAGRAPH_PARTS.includes(part)) {
    const wanted = spec.split(',').flatMap((range) => {
      const [a, b = a] = range.split('-').map(Number);
      if (!(a >= 1 && b >= a)) throw new Error(`Chafetz Chaim luach: unreadable range in "${entry}"`);
      return Array.from({ length: b - a + 1 }, (_, i) => a + i);
    });
    const picked = wanted
      .filter((n) => !CHAFETZ_CHAIM.empty.includes(`${part} ${n}`))
      .map((n) => inPart.find((s) => s.n === n));
    if (picked.some((s) => !s)) throw new Error(`Chafetz Chaim luach: "${entry}" is outside the text`);
    return picked;
  }
  // principle.se'if to principle.se'if; a range opened at a principle's first se'if reads its opening comments first.
  const [from, to = from] = spec.split('-').map((at) => at.split('.').map(Number));
  if (from.length !== 2 || to.length !== 2) throw new Error(`Chafetz Chaim luach: unreadable range in "${entry}"`);
  const at = (principle, seif) => inPart.findIndex((s) => s.principle === principle && s.seif === seif);
  const a = at(from[0], from[1] === 1 ? 0 : from[1]);
  const b = at(to[0], to[1]);
  if (a === -1 || b === -1 || a > b) throw new Error(`Chafetz Chaim luach: "${entry}" is outside the text`);
  return inPart.slice(a, b + 1);
}

function chafetzChaimSchedule(luach, built) {
  const table = (months, year) =>
    Object.fromEntries(
      Object.entries(months).map(([month, days]) => [
        month,
        days.map((entry) =>
          entry ? portionOf('chafetz_chaim', chafetzChaimSegments(entry, built.list), built.list) : null,
        ),
      ]),
    );
  return { kind: 'hebrewYear', common: table(luach.simple, 'common'), leap: table(luach.leap, 'leap') };
}

// ---- Rambam schedule (a cycle of days from an anchor date)

function rambamDay(ref, built, at) {
  const { book, range } = rambamRef(ref);
  const id = slug(book);
  const inBook = built.list.filter((s) => s.unit === id);
  if (!inBook.length) throw new Error(`Rambam cycle: no unit for ${book}`);
  const depth = inBook[0].depth;
  const [from, to = from] = range.split('-');
  let keys;
  if (depth === 1) keys = [`rambam:${id}:${from}`, `rambam:${id}:${to}`];
  else if (!from.includes(':')) {
    const lastOf = (c) => inBook.filter((s) => s.chapter === Number(c)).at(-1);
    keys = [`rambam:${id}:${from}:1`, lastOf(to)?.key ?? `rambam:${id}:${to}:?`];
  } else keys = [`rambam:${id}:${from}`, `rambam:${id}:${to.includes(':') ? to : `${from.split(':')[0]}:${to}`}`];
  return portionOf('rambam', slice(built.list, at, ...keys, `Rambam cycle ${ref}`));
}

function rambamSchedule(cycle, built) {
  const at = positions(built.list);
  return { kind: 'cycle', anchor: cycle.anchor, days: cycle.days.map((ref) => rambamDay(ref, built, at)) };
}

// ---- Ben Ish Chai schedule (the unit of each parasha per year; the app divides it over the week)

const bihName = (name) => name.toLowerCase().replace(/[^a-z]/g, '');

function bihSchedule(built) {
  const parashiyot = {};
  for (const { parasha } of PARASHIYOT) {
    const entry = {};
    for (const y of [1, 2]) {
      const node = BIH_NODE[y][parasha] ?? parasha;
      // A node only the first year has (Chanukah) serves the second year too.
      const unit = [y, 1].map((year) => built.units.find((u) => u.id === `y${year}-${slug(node)}`)).find(Boolean);
      if (unit && (unit.id.startsWith(`y${y}-`) || BIH_NODE[y][parasha])) entry[y] = unit.id;
    }
    if (!entry[1]) throw new Error(`Ben Ish Chai: no first-year halachot for ${parasha}`);
    parashiyot[parasha] = entry;
  }
  return { kind: 'parasha', parashiyot };
}

// ---- Festivals: each festival's material divided into as many portions as its period has days

function festivalSegments(track, material, built) {
  const list = built.list;
  return material.flatMap((item) => {
    let picked;
    if (track === 'kitzur') {
      const [from, to] = item;
      picked = list.filter((s) => s.siman >= from && s.siman <= to);
    } else if (track === 'rambam') {
      const [book, from, to] = item;
      picked = list.filter((s) => s.book === book && (from === undefined || (s.chapter >= from && s.chapter <= to)));
    } else {
      const [year, node, fromHalacha = 1] = item;
      picked = list.filter((s) => s.year === year && s.node === node && s.halacha >= fromHalacha);
    }
    if (!picked.length) throw new Error(`${track}: no text for festival material ${JSON.stringify(item)}`);
    return picked;
  });
}

// A festival's segments over its days, in order and evenly. Material shorter than the period fills its last days, one
// segment a day: the portions are then fewer than the days, and the app starts the period that much later.
function divide(segments, periodDays) {
  if (!segments.length) throw new Error('no segments to divide');
  const days = Math.min(periodDays, segments.length);
  return Array.from({ length: days }, (_, d) =>
    segments.slice(Math.floor((d * segments.length) / days), Math.floor(((d + 1) * segments.length) / days)),
  );
}

function festivalPortions(track, built) {
  return Object.fromEntries(
    Object.entries(FESTIVAL_MATERIAL[track] ?? {}).map(([festival, material]) => {
      const days = divide(festivalSegments(track, material, built), FESTIVALS[festival].days);
      return [festival, days.map((segments) => portionOf(track, segments))];
    }),
  );
}

// ---------------------------------------------------------------------------------------------------------------
// English: a version's translation of each Hebrew segment, by the segment's address in that text.

function englishAt(track, version, s) {
  const text = version.text;
  if (track === 'kitzur') return englishOf(text[s.siman - 1]?.[s.seif - 1]);
  if (track === 'ben_ish_chai') {
    const halacha = text[BEN_ISH_CHAI.years[s.year - 1]]?.[s.node]?.['']?.[s.source];
    return englishOf([].concat(halacha ?? []).join('<br>'));
  }
  if (track === 'chafetz_chaim') {
    const joined = (value) => englishOf([].concat(value ?? []).join('<br>'));
    if (s.part === 'preface') return joined(text[CHAFETZ_CHAIM.preface]?.[s.n - 1]);
    if (s.part === 'illustrations') return joined(text[CHAFETZ_CHAIM.illustrations]?.[`Illustration ${s.n}`]);
    if (CC_SECTIONS[s.part]) return joined(text[CHAFETZ_CHAIM.introduction]?.[CC_SECTIONS[s.part].node]?.[s.n - 1]);
    const principle = text[CHAFETZ_CHAIM.parts[s.part]]?.[`Principle ${s.principle}`];
    return joined(s.seif ? principle?.['']?.[s.seif - 1] : principle?.['Opening Comments']);
  }
  return englishOf(s.depth === 1 ? text[s.halacha - 1] : text[s.chapter - 1]?.[s.halacha - 1]);
}

// Each segment's English from the best covering version of its book (the Rambam per book, the others per track).
function englishFor(track, sources, built) {
  const groups =
    track === 'rambam'
      ? sources.books.map(({ book, english }) => ({ english, list: built.list.filter((s) => s.book === book) }))
      : [{ english: sources.english, list: built.list }];
  const en = new Map();
  const used = [];
  for (const { english, list } of groups) {
    let best = null;
    for (const version of english) {
      const texts = list.map((s) => englishAt(track, version, s));
      const covered = texts.filter(Boolean).length;
      if (!best || covered > best.covered) best = { version, texts, covered };
    }
    if (!best || !best.covered) continue;
    list.forEach((s, i) => best.texts[i] && en.set(s.key, best.texts[i]));
    if (!used.some((v) => v.version === best.version.version)) used.push(best.version);
  }
  const coverage = built.list.length ? en.size / built.list.length : 0;
  return { en, coverage, versions: used };
}

// ---------------------------------------------------------------------------------------------------------------
// Outputs

const credit = (v) => ({
  title: `${v.version}, via Sefaria`,
  license: v.license || 'unknown',
  url: v.source || SEFARIA,
});

const SCHEDULE_CREDIT = {
  kitzur: {
    he: 'לוח הלימוד: קיצור שולחן ערוך היומי כפי ש־Hebcal מפרסם (BSD)',
    en: 'Schedule: the Kitzur Shulchan Aruch Yomi as Hebcal publishes it (BSD)',
  },
  ben_ish_chai: { he: 'לוח הלימוד: הלכות פרשת השבוע', en: "Schedule: the halachot of the week's parasha" },
  rambam: {
    he: 'לוח הלימוד: הרמב״ם היומי, פרק אחד ליום, כפי שספריא מפרסמת',
    en: 'Schedule: the Daily Rambam, one chapter a day, as Sefaria publishes it',
  },
  chafetz_chaim: {
    he: 'לוח הלימוד: חפץ חיים היומי, שלושה מחזורים בשנה, כפי ש־Hebcal מפרסם (BSD)',
    en: 'Schedule: the daily Chofetz Chaim, three cycles a year, as Hebcal publishes it (BSD)',
  },
};

function trackCredit(track, versions) {
  const named = versions.map((v) => `${v.version} (${v.license})`).join('; ');
  return {
    he: `${BOOK[track].he}: ${named}, דרך ספריא. ${SCHEDULE_CREDIT[track].he}`,
    en: `${BOOK[track].en}: ${named}, via Sefaria. ${SCHEDULE_CREDIT[track].en}`,
  };
}

function gzipFile(dir, id, content) {
  const bytes = Buffer.from(gzipSync(Buffer.from(JSON.stringify(content)), GZIP_OPTIONS));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const name = `${id}.${sha256.slice(0, 8)}.json.gz`;
  return { name: dir ? `${dir}/${name}` : name, bytes, entry: { path: name, sha256, bytes: bytes.length } };
}

// The manifest's version rises when anything in it but the version changes.
function versioned(body, previous) {
  const same =
    previous && JSON.stringify({ ...previous, version: 0 }) === JSON.stringify({ format: FORMAT, version: 0, ...body });
  const version = same ? previous.version : (previous?.version ?? 0) + 1;
  return { format: FORMAT, version, ...body };
}

function trackOutputs(track, { built, heVersions, schedule, festivals, english }, previous = {}) {
  const files = new Map();
  const gz = {};
  const credits = heVersions.map(credit);
  for (const unit of built.units) {
    // A unit names the version it was built from (the Rambam's books come from different versions).
    const file = gzipFile('', unit.id, {
      track,
      unit: unit.id,
      title: unit.title,
      credits: unit.credits ?? credits,
      sections: unit.sections,
    });
    files.set(`${track}/${file.name}`, file.bytes);
    gz[unit.id] = file.entry;
  }
  const units = Object.fromEntries(
    built.units.map((unit) => [
      unit.id,
      { he: unit.title.he, en: unit.title.en, count: unit.sections.reduce((n, s) => n + s.segments.length, 0) },
    ]),
  );
  const shipsEnglish = english.coverage >= ENGLISH_THRESHOLD;
  const manifest = versioned(
    {
      track,
      book: BOOK[track],
      credit: trackCredit(track, heVersions),
      credits,
      gzipBytes: Object.values(gz).reduce((sum, e) => sum + e.bytes, 0),
      gz,
      units,
      schedule,
      festivals,
      english: { coverage: Math.round(english.coverage * 1000) / 1000, ships: shipsEnglish },
    },
    previous.he,
  );
  files.set(`${track}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
  if (shipsEnglish) {
    const enGz = {};
    const enCredits = english.versions.map(credit);
    for (const unit of built.units) {
      const keys = unit.sections.flatMap((s) => s.segments.map((seg) => seg.key));
      const file = gzipFile('', unit.id, {
        track,
        unit: unit.id,
        credits: enCredits,
        en: keys.map((key) => english.en.get(key) ?? null),
      });
      files.set(`${track}/en/${file.name}`, file.bytes);
      enGz[unit.id] = file.entry;
    }
    const enManifest = versioned(
      {
        track,
        credit: {
          he: `תרגום לאנגלית: ${english.versions.map((v) => `${v.version} (${v.license})`).join('; ')}, דרך ספריא`,
          en: `English: ${english.versions.map((v) => `${v.version} (${v.license})`).join('; ')}, via Sefaria`,
        },
        credits: enCredits,
        gzipBytes: Object.values(enGz).reduce((sum, e) => sum + e.bytes, 0),
        gz: enGz,
      },
      previous.en,
    );
    files.set(`${track}/en/manifest.json`, `${JSON.stringify(enManifest, null, 2)}\n`);
  }
  return files;
}

function readSchedule(name) {
  return JSON.parse(fs.readFileSync(path.join(SCHEDULE_DIR, `${name}.json`), 'utf8'));
}

async function buildTrack(track) {
  if (track === 'kitzur') {
    const sources = await readKitzur();
    const built = buildKitzur(sources);
    return {
      built,
      heVersions: [sources.he],
      schedule: kitzurSchedule(readSchedule('kitzur'), built, sources.he.text),
      festivals: festivalPortions(track, built),
      english: englishFor(track, sources, built),
    };
  }
  if (track === 'ben_ish_chai') {
    const sources = await readBenIshChai();
    const built = buildBenIshChai(sources);
    return {
      built,
      heVersions: [sources.he],
      schedule: bihSchedule(built),
      festivals: festivalPortions(track, built),
      english: englishFor(track, sources, built),
    };
  }
  if (track === 'chafetz_chaim') {
    const sources = await readChafetzChaim();
    const built = buildChafetzChaim(sources);
    return {
      built,
      heVersions: [sources.he],
      schedule: chafetzChaimSchedule(readSchedule('chafetz_chaim'), built),
      festivals: {},
      english: englishFor(track, sources, built),
    };
  }
  const cycle = readSchedule('rambam');
  const sources = await readRambam(cycle);
  const built = buildRambam(sources);
  // A chapter's last halacha, so a whole chapter is labelled by its number.
  built.list.forEach((s, i) => {
    const next = built.list[i + 1];
    s.lastInChapter = !next || next.book !== s.book || next.chapter !== s.chapter;
  });
  const heVersions = [];
  for (const { he } of sources.books) if (!heVersions.some((v) => v.version === he.version)) heVersions.push(he);
  return {
    built,
    heVersions,
    schedule: rambamSchedule(cycle, built),
    festivals: festivalPortions(track, built),
    english: englishFor(track, sources, built),
  };
}

function readPrevious(track) {
  const read = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : undefined);
  return {
    he: read(path.join(SITE_DIR, track, 'manifest.json')),
    en: read(path.join(SITE_DIR, track, 'en', 'manifest.json')),
  };
}

function writeOutputs(track, files) {
  let wrote = 0;
  const manifests = [];
  for (const [name, content] of files) {
    if (name.endsWith('manifest.json')) {
      manifests.push([name, content]);
      continue;
    }
    const file = path.join(SITE_DIR, name);
    if (fs.existsSync(file)) continue;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    wrote++;
  }
  for (const dir of [path.join(SITE_DIR, track), path.join(SITE_DIR, track, 'en')]) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const relative = path.relative(SITE_DIR, path.join(dir, name)).split(path.sep).join('/');
      if (name.endsWith('.json.gz') && !files.has(relative)) fs.unlinkSync(path.join(dir, name));
    }
  }
  if (![...files.keys()].some((name) => name.startsWith(`${track}/en/`))) {
    fs.rmSync(path.join(SITE_DIR, track, 'en'), { recursive: true, force: true });
  }
  for (const [name, content] of manifests) {
    const file = path.join(SITE_DIR, name);
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
      wrote++;
    }
  }
  return wrote;
}

// ---------------------------------------------------------------------------------------------------------------
// The Rambam cycle from Sefaria's calendar

async function writeRambamCycle(anchor) {
  const start = new Date(`${anchor}T12:00:00Z`);
  const dayOf = (i) => new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10);
  const refs = await inPool(
    Array.from({ length: RAMBAM_CYCLE_DAYS + 1 }, (_, i) => dayOf(i)),
    4,
    async (date) => {
      const [y, m, d] = date.split('-').map(Number);
      const data = await cached(`calendar/${date}`, `${SEFARIA}/api/calendars?year=${y}&month=${m}&day=${d}`);
      const items = data.calendar_items.filter((item) => item.title.en === 'Daily Rambam');
      if (items.length !== 1) throw new Error(`${date}: ${items.length} Daily Rambam items`);
      return items[0].ref;
    },
  );
  if (refs[0] !== 'Mishneh Torah, Transmission of the Oral Law 1-21') {
    throw new Error(`${anchor} is not the first day of a cycle: ${refs[0]}`);
  }
  if (refs[RAMBAM_CYCLE_DAYS] !== refs[0]) throw new Error(`the cycle is not ${RAMBAM_CYCLE_DAYS} days long`);
  const days = refs.slice(0, RAMBAM_CYCLE_DAYS);
  if (new Set(days).size !== days.length) throw new Error('a day of the cycle repeats');
  const out = {
    about:
      "The Daily Rambam, one chapter a day: the reading of each day of one cycle from Sefaria's calendar (/api/calendars, 'Daily Rambam'), from its first day, the anchor. Day n of any date is (date - anchor) mod length. Written by `node scripts/halacha/build.js --rambam-cycle <anchor>`; never edited by hand.",
    anchor,
    length: RAMBAM_CYCLE_DAYS,
    days,
  };
  fs.writeFileSync(path.join(SCHEDULE_DIR, 'rambam.json'), `${JSON.stringify(out, null, 2)}\n`);
  console.log(`rambam.json: ${days.length} days from ${anchor}`);
}

async function main(argv) {
  const cycleAt = argv.indexOf('--rambam-cycle');
  if (cycleAt !== -1) return writeRambamCycle(argv[cycleAt + 1]);
  const only = argv.filter((arg) => TRACKS.includes(arg));
  for (const track of only.length ? only : TRACKS) {
    const result = await buildTrack(track);
    const files = trackOutputs(track, result, readPrevious(track));
    const wrote = writeOutputs(track, files);
    const manifest = JSON.parse(files.get(`${track}/manifest.json`));
    console.log(
      `${track}: ${result.built.units.length} units, ${result.built.list.length} segments, ${(manifest.gzipBytes / 1e6).toFixed(2)} MB gzipped, English ${(result.english.coverage * 100).toFixed(1)}%${manifest.english.ships ? ' (ships)' : ''}, version ${manifest.version}; wrote ${wrote} files`,
    );
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  runsOf,
  englishOf,
  splitFootnotes,
  numberRanges,
  BMC_MARKER,
  chafetzChaimSegments,
  rambamRef,
  kitzurRange,
  divide,
  portionOf,
  LABEL,
  versioned,
  bihName,
};
