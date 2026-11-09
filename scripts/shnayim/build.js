#!/usr/bin/env node
// pnpm shnayim:build: the Shnayim Mikra add-on in docs/shnayim, one gzip per parasha of the Torah verses (Tanach with
// Nikkud) and Targum Onkelos (Torat Emet), cut into the seven aliyot of Sefaria's parasha structure, and a manifest.
const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');
const { createHash } = require('crypto');
const { gzipSync } = require('fflate');
const { gematriya } = require('@hebcal/core');
const { PARASHIYOT, assetSlug } = require('../chok/manifest');

const SEFARIA = 'https://www.sefaria.org';
const BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'];
const CACHE_DIR = path.join(__dirname, '.cache');
const SITE_DIR = path.join(__dirname, '..', '..', 'docs', 'shnayim');
const MANIFEST_FILE = path.join(SITE_DIR, 'manifest.json');
const FORMAT = 1;
const ALIYOT = 7;
const GZIP_OPTIONS = { level: 9, mtime: 0 };

const torahVersion = (book) => `${book} - he - Tanach with Nikkud`;
const onkelosVersion = (book) => `Onkelos ${book} - he - Onkelos ${book}`;

const CREDITS = [
  {
    title: 'תנ״ך מנוקד, Westminster Leningrad Codex (tanach.us), דרך ספריא',
    license: 'Public Domain',
    url: `${SEFARIA}/Genesis`,
  },
  { title: 'תרגום אונקלוס, מאגר תורת אמת, דרך ספריא', license: 'Public Domain', url: `${SEFARIA}/Onkelos_Genesis` },
];

const MANIFEST_CREDIT = {
  he: 'נוסח התורה: תנ״ך מנוקד (Westminster Leningrad Codex); תרגום אונקלוס: מאגר תורת אמת. שניהם נחלת הכלל, דרך ספריא',
  en: 'Torah: Tanach with Nikkud (Westminster Leningrad Codex); Targum Onkelos: the Torat Emet database. Both public domain, via Sefaria',
};

// The qere replaces the unpointed ketiv before it, as the siddur build reads Tehillim (scripts/siddur/manifest.js).
function torahReading(text) {
  return text
    .replace(/(^|\s|־)[א-ת]+־? ?((?:\[[^\]]+\] ?)+)/g, (_, lead, qere) => {
      const words = [...qere.matchAll(/\[([^\]]+)\]/g)].map(([, word]) => word.trim()).join(' ');
      return lead + words + (qere.endsWith(' ') && !words.endsWith('־') ? ' ' : '');
    })
    .replace(/[‍‎]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/(יְ?)ה(וָה)/g, '$1הֹ$2')
    .replace(/\s+/g, ' ')
    .trim();
}

// Onkelos as targum runs, its bracketed variant readings (נ״א, ס״א) as note runs.
function onkelosRuns(text) {
  const clean = text
    .replace(/[‍‎]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/''/g, '״')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/:$/, '');
  return clean
    .split(/(\([^)]*\))/)
    .filter((part) => part.trim())
    .map((part) => (part.startsWith('(') ? { t: part, s: 'n' } : { t: part, s: 't' }));
}

const number = (n) => gematriya(n).replace(/[׳״]/g, '');

function verseLabel(chapter, verse, first) {
  return first || verse === 1 ? `${number(chapter)} (${number(verse)}) ` : `(${number(verse)}) `;
}

// "Genesis 1:1-2:3" → { book, from: [1, 1], to: [2, 3] }
function parseRef(ref) {
  const match = /^([A-Za-z]+) (\d+):(\d+)[-–](?:(\d+):)?(\d+)$/.exec(ref);
  if (!match) throw new Error(`unreadable aliyah ref "${ref}"`);
  const [, book, c1, v1, c2, v2] = match;
  return { book, from: [Number(c1), Number(v1)], to: [Number(c2 ?? c1), Number(v2)] };
}

function aliyahSegments(ref, torah, onkelos) {
  const { book, from, to } = parseRef(ref);
  const segments = [];
  for (let chapter = from[0]; chapter <= to[0]; chapter++) {
    const verses = torah[book][chapter - 1];
    if (!verses) throw new Error(`${ref}: no chapter ${chapter}`);
    const first = chapter === from[0] ? from[1] : 1;
    const last = chapter === to[0] ? to[1] : verses.length;
    for (let verse = first; verse <= last; verse++) {
      const text = torahReading(verses[verse - 1] ?? '');
      const targum = onkelosRuns(onkelos[book][chapter - 1]?.[verse - 1] ?? '');
      if (!text || !targum.length) throw new Error(`${book} ${chapter}:${verse}: empty verse or targum`);
      segments.push({
        he: [[{ t: verseLabel(chapter, verse, segments.length === 0), s: 'n' }, { t: text }], targum],
      });
    }
  }
  return segments;
}

// Every problem fails the build: the 54 parashiyot in order, seven aliyot each, contiguous over each book, and every
// verse of the Torah read exactly once.
function validate(parashiyot, torah) {
  const problems = [];
  if (parashiyot.length !== PARASHIYOT.length)
    problems.push(`${parashiyot.length} parashiyot, not ${PARASHIYOT.length}`);
  const next = Object.fromEntries(BOOKS.map((book) => [book, [1, 1]]));
  for (const { sharedTitle, refs } of parashiyot) {
    if (refs.length !== ALIYOT) problems.push(`${sharedTitle}: ${refs.length} aliyot`);
    for (const ref of refs) {
      const { book, from, to } = parseRef(ref);
      if (from[0] !== next[book][0] || from[1] !== next[book][1]) problems.push(`${ref} does not follow ${next[book]}`);
      const chapter = torah[book][to[0] - 1];
      next[book] = to[1] === chapter.length ? [to[0] + 1, 1] : [to[0], to[1] + 1];
    }
  }
  for (const book of BOOKS) {
    if (next[book][0] !== torah[book].length + 1) problems.push(`${book} ends at ${next[book]}`);
  }
  if (problems.length) throw new Error(`validation failed:\n${problems.join('\n')}`);
}

const USER_AGENT = 'jew365-shnayim-build/1.0 (https://github.com/jew-365/jew-365; 365jew@gmail.com)';

async function cached(name, url) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, `${name}.json`);
  if (!fs.existsSync(file)) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) throw new Error(`download failed for ${name}: HTTP ${response.status}`);
    fs.writeFileSync(file, await response.text());
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function readSources() {
  const torah = {};
  const onkelos = {};
  const parashiyot = [];
  for (const book of BOOKS) {
    const version = (name) => `${SEFARIA}/download/version/${encodeURIComponent(name)}.json`;
    torah[book] = (await cached(`torah-${book}`, version(torahVersion(book)))).text;
    onkelos[book] = (await cached(`onkelos-${book}`, version(onkelosVersion(book)))).text;
    const index = await cached(`index-${book}`, `${SEFARIA}/api/v2/raw/index/${book}`);
    parashiyot.push(...index.alt_structs.Parasha.nodes);
    const shape = (text) => text.map((chapter) => chapter.length).join();
    if (shape(torah[book]) !== shape(onkelos[book])) throw new Error(`${book}: Torah and Onkelos verse counts differ`);
  }
  return { torah, onkelos, parashiyot };
}

function buildOutputs({ torah, onkelos, parashiyot }, previousVersion = 0, previousGz = {}) {
  validate(parashiyot, torah);
  const gz = {};
  const files = new Map();
  parashiyot.forEach((node, index) => {
    const { parasha } = PARASHIYOT[index];
    const asset = {
      parasha,
      credits: CREDITS,
      aliyot: node.refs.map((ref) => aliyahSegments(ref, torah, onkelos)),
    };
    const bytes = Buffer.from(gzipSync(Buffer.from(JSON.stringify(asset)), GZIP_OPTIONS));
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const name = `${assetSlug(parasha)}.${sha256.slice(0, 8)}.json.gz`;
    gz[parasha] = { path: name, sha256, bytes: bytes.length };
    files.set(name, bytes);
  });
  const changed = Object.keys(gz).some((parasha) => previousGz[parasha]?.sha256 !== gz[parasha].sha256);
  const version = changed || previousVersion < 1 ? previousVersion + 1 : previousVersion;
  const gzipBytes = Object.values(gz).reduce((sum, entry) => sum + entry.bytes, 0);
  const manifest = { format: FORMAT, version, credit: MANIFEST_CREDIT, gzipBytes, gz };
  files.set('manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
  return files;
}

async function main() {
  const previous = fs.existsSync(MANIFEST_FILE) ? JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8')) : null;
  const sources = await readSources();
  const files = buildOutputs(sources, previous?.version ?? 0, previous?.gz ?? {});
  fs.mkdirSync(SITE_DIR, { recursive: true });
  let wrote = 0;
  for (const [name, content] of files) {
    if (name === 'manifest.json') continue;
    const file = path.join(SITE_DIR, name);
    if (fs.existsSync(file)) continue;
    fs.writeFileSync(file, content);
    wrote++;
  }
  for (const name of fs.readdirSync(SITE_DIR)) {
    if (name.endsWith('.json.gz') && !files.has(name)) fs.unlinkSync(path.join(SITE_DIR, name));
  }
  const manifest = files.get('manifest.json');
  if (!fs.existsSync(MANIFEST_FILE) || fs.readFileSync(MANIFEST_FILE, 'utf8') !== manifest) {
    fs.writeFileSync(MANIFEST_FILE, manifest);
    wrote++;
  }
  const parsed = JSON.parse(manifest);
  console.log(
    `${Object.keys(parsed.gz).length} parashiyot, ${(parsed.gzipBytes / 1e6).toFixed(2)} MB gzipped, version ${parsed.version}; wrote ${wrote} files`,
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  torahReading,
  onkelosRuns,
  verseLabel,
  parseRef,
  aliyahSegments,
  validate,
  buildOutputs,
  BOOKS,
  FORMAT,
};
