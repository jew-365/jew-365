#!/usr/bin/env node
// pnpm mishna:build: the Mishnah add-on in docs/mishna, one gzip per tractate of the vocalized Mishnah (Torat Emet 357),
// Bartenura (On Your Way) folded after each mishnah and Kulp's English (Mishnah Yomit, CC-BY), and a manifest. The
// tractates, their order and their chapter lengths are those of the Mishna Yomit cycle of @hebcal/learning, which the
// build reads back and checks the text against: every mishnah of the cycle has its Hebrew, none is left over.
const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');
const { createHash } = require('crypto');
const { gzipSync } = require('fflate');
const { gematriya } = require('@hebcal/core');
const { MishnaYomiIndex, mishnaYomiStart } = require('@hebcal/learning');
const { assetSlug } = require('../chok/manifest');
const { rashiRuns } = require('../shnayim/build');

const SEFARIA = 'https://www.sefaria.org';
const CACHE_DIR = path.join(__dirname, '.cache');
const SITE_DIR = path.join(__dirname, '..', '..', 'docs', 'mishna');
const MANIFEST_FILE = path.join(SITE_DIR, 'manifest.json');
const FORMAT = 1;
const MISHNAYOT = 4192;
const GZIP_OPTIONS = { level: 9, mtime: 0 };
const USER_AGENT = 'jew365-mishna-build/1.0 (https://github.com/jew-365/jew-365)';

// The pinned Sefaria versions (the owner's calls of 2026-11-18, Q39 and Q41).
const HEBREW = 'Torat Emet 357';
const BARTENURA = 'On Your Way';
const ENGLISH = 'Mishnah Yomit by Dr. Joshua Kulp';
// Torat Emet 357 (and Romm) print Bikkurim without its fourth chapter, the five mishnayot of the androginos, which the
// Mishna Yomit cycle and Kulp count; that chapter is read from Sefaria's vocalized Mishnah of the Gemara (NLI, Public
// Domain), the only vocalized version that has it. Read on 2026-11-18: Torat Emet [11, 11, 12], that version [0, 0, 0, 5].
const SUPPLEMENT = { tractate: 'Bikkurim', chapter: 4, version: 'Version of the Gemara - vocalized' };
const BARTENURA_LABEL = { he: 'ברטנורא', en: 'Bartenura' };

const CREDITS = [
  {
    title: 'משנה מנוקדת, תורת אמת 357, דרך ספריא. כל הזכויות שמורות לר׳ פנחס ראובן שליט״א',
    url: `${SEFARIA}/Mishnah_Berakhot`,
  },
  {
    title: 'ביכורים פרק ד: משנה מנוקדת מנוסח הגמרא (הספרייה הלאומית), דרך ספריא',
    license: 'Public Domain',
    url: `${SEFARIA}/Mishnah_Bikkurim.4`,
  },
  {
    title: 'פירוש ר׳ עובדיה מברטנורא, On Your Way (tora.ws), דרך ספריא',
    license: 'Public Domain',
    url: `${SEFARIA}/Bartenura_on_Mishnah_Berakhot`,
  },
  {
    title: 'English: Mishnah Yomit by Dr. Joshua Kulp, via Sefaria',
    license: 'CC-BY',
    url: `${SEFARIA}/Mishnah_Berakhot`,
  },
];

const MANIFEST_CREDIT = {
  he: 'המשנה: תורת אמת 357 (כל הזכויות שמורות לר׳ פנחס ראובן); ביכורים פרק ד מנוסח הגמרא; ברטנורא: On Your Way, נחלת הכלל; אנגלית: Mishnah Yomit מאת ד״ר יהושע קולפ, CC-BY. דרך ספריא',
  en: "The Mishnah: Torat Emet 357 (all rights reserved to R' Pinchas Reuven); Bikkurim chapter 4 from the Gemara's version; Bartenura: On Your Way, public domain; English: Mishnah Yomit by Dr. Joshua Kulp, CC-BY. Via Sefaria",
};

const number = (n) => gematriya(n).replace(/[׳״]/g, '');

// Sefaria's title of a tractate where it differs from @hebcal/learning's name.
// Bartenura's index keeps "Mishnah Taanit".
const SEFARIA_TITLE = { Taanit: "Mishnah Ta'anit", Avot: 'Pirkei Avot' };
const sefariaTitle = (k) => SEFARIA_TITLE[k] ?? `Mishnah ${k}`;
const bartenuraTitle = (k) => `Bartenura on ${k === 'Avot' ? 'Pirkei Avot' : `Mishnah ${k}`}`;

// The cycle's tractates in order with their chapter lengths, read back from @hebcal/learning's public lookup.
function cycleTractates() {
  const index = new MishnaYomiIndex();
  const tractates = [];
  for (let day = 0; day < MISHNAYOT / 2; day++) {
    for (const { k, v } of index.lookup(mishnaYomiStart + day)) {
      const [chapter, mishnah] = v.split(':').map(Number);
      if (tractates[tractates.length - 1]?.k !== k) tractates.push({ k, chapters: [] });
      const { chapters } = tractates[tractates.length - 1];
      chapters[chapter - 1] = Math.max(chapters[chapter - 1] ?? 0, mishnah);
    }
  }
  return tractates;
}

const clean = (text) =>
  String(text ?? '')
    .replace(/[‍‎‏]/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/''/g, '״')
    .replace(/\s+/g, ' ')
    .trim();

// Kulp's English as plain text: footnotes and markup dropped, a missing joint space restored.
function englishOf(html) {
  const text = String(html ?? '')
    .replace(/<sup[^>]*>.*?<\/sup>\s*<i class="footnote">.*?<\/i>/g, '')
    .replace(/<i class="footnote">.*?<\/i>/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/([.;:?!])(?=[A-Z])/g, '$1 ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
  return text || undefined;
}

// A tractate as its chapters, each a segment per mishnah (its number as a note run, Kulp's English), with Bartenura's
// comments on it as one optional segment right after it.
function tractateChapters(k, chapters, { he, bartenura, en }) {
  return chapters.map((count, c) =>
    Array.from({ length: count }, (_, m) => {
      const text = clean(he[c]?.[m]);
      if (!text) throw new Error(`${k} ${c + 1}:${m + 1}: no Hebrew`);
      const segment = {
        key: `mishna:${assetSlug(k)}:${c + 1}:${m + 1}`,
        he: [[{ t: `(${number(m + 1)}) `, s: 'n' }, { t: text }]],
      };
      const english = englishOf(en[c]?.[m]);
      if (english) segment.en = english;
      const comments = (bartenura[c]?.[m] ?? []).map((comment) => rashiRuns(String(comment))).filter((r) => r.length);
      return comments.length ? [segment, { he: comments, optional: BARTENURA_LABEL }] : [segment];
    }).flat(),
  );
}

// Every chapter of the text holds exactly the mishnayot the cycle counts.
function validate(k, chapters, he) {
  const problems = [];
  if (he.length !== chapters.length) problems.push(`${k}: ${he.length} chapters, the cycle ${chapters.length}`);
  chapters.forEach((count, c) => {
    const found = (he[c] ?? []).filter((m) => clean(m)).length;
    if (found !== count) problems.push(`${k} ${c + 1}: ${found} mishnayot, the cycle ${count}`);
  });
  return problems;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Each URL is tried in turn, the next one only after the one before kept failing.
async function cached(name, ...urls) {
  const file = path.join(CACHE_DIR, `${name}.json`);
  if (!fs.existsSync(file)) {
    let lastError;
    let wait = 0;
    const attempts = urls.flatMap((url) => Array.from({ length: urls.length > 1 ? 4 : 8 }, () => url));
    for (const [attempt, url] of attempts.entries()) {
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
        try {
          JSON.parse(text);
        } catch {
          throw new Error(`download failed for ${name}: not JSON`);
        }
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

// Sefaria's export bucket holds the same versions by category and answers when the download endpoint times out
// (a 504 on Yadayim's English, 2026-11-18).
const EXPORT = 'https://storage.googleapis.com/sefaria-export/json';
const SEDARIM = ['Zeraim', 'Moed', 'Nashim', 'Nezikin', 'Kodashim', 'Tahorot'];
const SEDER_SIZES = [11, 12, 7, 10, 11, 12];
const sederOf = (k, tractates) => {
  let index = tractates.findIndex((t) => t.k === k);
  const seder = SEDER_SIZES.findIndex((size) => (index -= size) < 0);
  return `Seder ${SEDARIM[seder]}`;
};

const version = (title, language, name, categories) =>
  cached(
    `${assetSlug(`${title} ${language} ${name}`)}`,
    `${SEFARIA}/download/version/${encodeURIComponent(`${title} - ${language} - ${name}`)}.json`,
    `${EXPORT}/${[...categories, title, language === 'he' ? 'Hebrew' : 'English', name].map(encodeURIComponent).join('/')}.json`,
  );

async function readSources(tractates) {
  const sources = {};
  for (const { k } of tractates) {
    const title = sefariaTitle(k);
    const seder = sederOf(k, tractates);
    const [he, bartenura, en] = [
      await version(title, 'he', HEBREW, ['Mishnah', seder]),
      await version(bartenuraTitle(k), 'he', BARTENURA, ['Mishnah', 'Rishonim on Mishnah', 'Bartenura', seder]),
      await version(title, 'en', ENGLISH, ['Mishnah', seder]),
    ];
    if (he.versionTitle !== HEBREW || bartenura.versionTitle !== BARTENURA || en.versionTitle !== ENGLISH) {
      throw new Error(`${k}: an unexpected version`);
    }
    sources[k] = {
      heTitle: he.heTitle.replace(/^(משנה|פרקי)\s+/, ''),
      he: he.text,
      bartenura: bartenura.text,
      en: en.text,
    };
  }
  const supplement = await version(sefariaTitle(SUPPLEMENT.tractate), 'he', SUPPLEMENT.version, [
    'Mishnah',
    sederOf(SUPPLEMENT.tractate, tractates),
  ]);
  const c = SUPPLEMENT.chapter - 1;
  const target = sources[SUPPLEMENT.tractate].he;
  if ((target[c] ?? []).some((m) => clean(m))) throw new Error(`${SUPPLEMENT.tractate} ${c + 1} is no longer missing`);
  target[c] = supplement.text[c];
  return sources;
}

function buildOutputs(tractates, sources, previousVersion = 0, previousGz = {}) {
  const problems = tractates.flatMap(({ k, chapters }) => validate(k, chapters, sources[k].he));
  const total = tractates.reduce((sum, t) => sum + t.chapters.reduce((a, b) => a + b, 0), 0);
  if (tractates.length !== 63) problems.push(`${tractates.length} tractates, not 63`);
  if (total !== MISHNAYOT) problems.push(`${total} mishnayot, not ${MISHNAYOT}`);
  if (problems.length) throw new Error(`validation failed:\n${problems.join('\n')}`);
  const gz = {};
  const files = new Map();
  for (const { k, chapters } of tractates) {
    const asset = {
      tractate: k,
      title: { he: sources[k].heTitle, en: k },
      // The supplement's credit only where its chapter is read.
      credits: CREDITS.filter((credit) => k === SUPPLEMENT.tractate || credit !== CREDITS[1]),
      chapters: tractateChapters(k, chapters, sources[k]),
    };
    const bytes = Buffer.from(gzipSync(Buffer.from(JSON.stringify(asset)), GZIP_OPTIONS));
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const name = `${assetSlug(k)}.${sha256.slice(0, 8)}.json.gz`;
    gz[k] = { path: name, sha256, bytes: bytes.length };
    files.set(name, bytes);
  }
  const changed = Object.keys(gz).some((k) => previousGz[k]?.sha256 !== gz[k].sha256);
  const nextVersion = changed || previousVersion < 1 ? previousVersion + 1 : previousVersion;
  const gzipBytes = Object.values(gz).reduce((sum, entry) => sum + entry.bytes, 0);
  const manifest = { format: FORMAT, version: nextVersion, credit: MANIFEST_CREDIT, gzipBytes, gz };
  files.set('manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
  return files;
}

async function main() {
  const previous = fs.existsSync(MANIFEST_FILE) ? JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8')) : null;
  const tractates = cycleTractates();
  const files = buildOutputs(tractates, await readSources(tractates), previous?.version ?? 0, previous?.gz ?? {});
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
    `${Object.keys(parsed.gz).length} tractates, ${(parsed.gzipBytes / 1e6).toFixed(2)} MB gzipped, version ${parsed.version}; wrote ${wrote} files`,
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { cycleTractates, englishOf, tractateChapters, validate, buildOutputs, MISHNAYOT, FORMAT };
