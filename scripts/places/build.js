#!/usr/bin/env node
// Builds assets/places/world.places, the places the location picker searches: every locality of Israel
// and of Judea and Samaria from the Central Bureau of Statistics' list of localities (2024: Hebrew and
// English names, population, ITM coordinates, average height), and every other city of 15,000 people or
// more from GeoNames (cities15000, CC BY 4.0, https://www.geonames.org/) with its Hebrew name there.
// Usage: node scripts/places/build.js [--offline]  (--offline reuses the cached downloads only)
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const CACHE = path.join(__dirname, '.cache');
const OUT = path.join(ROOT, 'assets', 'places', 'world.places');
const GEONAMES = 'https://download.geonames.org/export/dump/';
const FILES = {
  'cities15000.zip': GEONAMES,
  'countryInfo.txt': GEONAMES,
  'admin1CodesASCII.txt': GEONAMES,
  'alternateNamesV2.zip': GEONAMES,
  'bycode2024.xlsx': 'https://www.cbs.gov.il/he/publications/doclib/2019/ishuvim/',
};
const HEBREW = /[א-ת]/;
// The Central Bureau of Statistics covers Israel; GeoNames' Israeli entries are left out.
const CBS_COUNTRY = 'IL';
const CBS_ZONE = 'Asia/Jerusalem';

function download(file) {
  const target = path.join(CACHE, file);
  if (fs.existsSync(target)) return target;
  if (process.argv.includes('--offline')) throw new Error(`missing ${target}`);
  console.log(`downloading ${file}`);
  execFileSync('curl', ['-sSfL', '-m', '900', '-o', target, FILES[file] + file], { stdio: 'inherit' });
  return target;
}

function unzip(zip, name) {
  const target = path.join(CACHE, name);
  if (!fs.existsSync(target)) execFileSync('unzip', ['-oq', zip, name, '-d', CACHE], { stdio: 'inherit' });
  return target;
}

async function eachLine(file, visit) {
  const lines = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity });
  for await (const line of lines) if (line && !line.startsWith('#')) visit(line.split('\t'));
}

const round = (value, places) => Number(Number(value).toFixed(places));
const DUPLICATE_KM = 3;

function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const x = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.hypot(x, y) * 6371;
}

const xmlText = (value) =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

// The first sheet of an xlsx as rows of cell values keyed by column letter.
function xlsxRows(file) {
  const read = (name) => execFileSync('unzip', ['-p', file, name], { maxBuffer: 1 << 28 }).toString('utf8');
  const shared = [...read('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((si) =>
    xmlText([...si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')),
  );
  return [...read('xl/worksheets/sheet1.xml').matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((row) => {
    const cells = {};
    for (const cell of row[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const value = /<v>([\s\S]*?)<\/v>/.exec(cell[3] ?? '')?.[1];
      const inline = /<t[^>]*>([\s\S]*?)<\/t>/.exec(cell[3] ?? '')?.[1];
      if (/t="s"/.test(cell[2]) && value !== undefined) cells[cell[1]] = shared[Number(value)];
      else if (inline !== undefined) cells[cell[1]] = xmlText(inline);
      else if (value !== undefined) cells[cell[1]] = xmlText(value);
    }
    return cells;
  });
}

// ITM (Israeli Transverse Mercator, GRS80) to WGS84; the two datums differ by about a metre.
function itmToWgs84(e, n) {
  const a = 6378137;
  const f = 1 / 298.257222101;
  const k0 = 1.0000067;
  const lat0 = (31.7343936111111 * Math.PI) / 180;
  const lng0 = (35.2045169444444 * Math.PI) / 180;
  const e2 = f * (2 - f);
  const ep2 = e2 / (1 - e2);
  const m0 = 1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256;
  const meridian = (phi) =>
    a *
    (m0 * phi -
      ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * phi) +
      ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * phi) -
      ((35 * e2 ** 3) / 3072) * Math.sin(6 * phi));
  const mu = (meridian(lat0) + (n - 626907.39) / k0) / (a * m0);
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
  const c1 = ep2 * Math.cos(phi1) ** 2;
  const t1 = Math.tan(phi1) ** 2;
  const n1 = a / Math.sqrt(1 - e2 * Math.sin(phi1) ** 2);
  const r1 = (a * (1 - e2)) / (1 - e2 * Math.sin(phi1) ** 2) ** 1.5;
  const d = (e - 219529.584) / (n1 * k0);
  const lat =
    phi1 -
    ((n1 * Math.tan(phi1)) / r1) *
      (d ** 2 / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * ep2) * d ** 4) / 24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 252 * ep2 - 3 * c1 ** 2) * d ** 6) / 720);
  const lng =
    lng0 +
    (d -
      ((1 + 2 * t1 + c1) * d ** 3) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * ep2 + 24 * t1 ** 2) * d ** 5) / 120) /
      Math.cos(phi1);
  return { lat: (lat * 180) / Math.PI, lng: (lng * 180) / Math.PI };
}

async function main() {
  fs.mkdirSync(CACHE, { recursive: true });
  const paths = Object.fromEntries(Object.keys(FILES).map((file) => [file, download(file)]));

  const rows = new Map();
  const hebrew = new Map();
  // GeoNames' Israeli cities lend their common English name ("Bnei Brak" for the CBS "Bene Beraq").
  const israeliNames = [];
  await eachLine(unzip(paths['cities15000.zip'], 'cities15000.txt'), (cols) => {
    if (cols[8] === CBS_COUNTRY) {
      // Only a plain spelling: "El‘ad" keeps the CBS "El'ad".
      if (/^[A-Za-z -]+$/.test(cols[1])) israeliNames.push({ en: cols[1], lat: Number(cols[4]), lng: Number(cols[5]) });
      return;
    }
    const elevation = Number(cols[16]) > -500 ? Number(cols[16]) : Number(cols[15]) || 0;
    rows.set(`g${cols[0]}`, {
      id: `g${cols[0]}`,
      en: cols[1],
      cc: cols[8],
      admin: cols[10],
      lat: round(cols[4], 4),
      lng: round(cols[5], 4),
      tz: cols[17],
      elevation: Math.max(0, Math.round(elevation)),
      population: Number(cols[14]) || 0,
    });
  });

  const [header, ...localities] = xlsxRows(paths['bycode2024.xlsx']);
  const column = (title) => {
    const key = Object.keys(header).find((letter) => String(header[letter]).trim() === title);
    if (!key) throw new Error(`no column ${title}`);
    return key;
  };
  const cbs = {
    he: column('שם יישוב'),
    code: column('סמל יישוב'),
    en: column('שם יישוב באנגלית'),
    population: column('סך הכל אוכלוסייה 2024'),
    coordinates: column('קואורדינטות'),
    height: column('גובה ממוצע'),
  };
  for (const row of localities) {
    const itm = String(row[cbs.coordinates] ?? '').trim();
    if (!/^\d{12}$/.test(itm) || !row[cbs.he]) continue;
    const { lat, lng } = itmToWgs84(Number(itm.slice(0, 6)), Number(itm.slice(6)));
    const id = `c${row[cbs.code]}`;
    const cbsEn = String(row[cbs.en] ?? '').trim();
    const common = israeliNames
      .filter((other) => distanceKm(other, { lat, lng }) < DUPLICATE_KM)
      .sort((a, b) => distanceKm(a, { lat, lng }) - distanceKm(b, { lat, lng }))[0]?.en;
    rows.set(id, {
      id,
      en: common ?? cbsEn,
      aka: common && common !== cbsEn ? cbsEn : '',
      cc: CBS_COUNTRY,
      admin: '',
      lat: round(lat, 4),
      lng: round(lng, 4),
      tz: CBS_ZONE,
      elevation: Math.max(0, Math.round(Number(row[cbs.height]) || 0)),
      population: Math.round(Number(row[cbs.population]) || 0),
    });
    hebrew.set(id, { name: String(row[cbs.he]).trim(), rank: -1 });
  }

  // A GeoNames place beside a CBS locality is the same place under another name (Battir beside Betar
  // Illit, labelled with its Hebrew name there): the CBS entry stands for both.
  const local = [...rows.values()].filter((row) => row.id.startsWith('c'));
  for (const row of [...rows.values()]) {
    if (row.id.startsWith('g') && local.some((other) => distanceKm(row, other) < DUPLICATE_KM)) rows.delete(row.id);
  }

  const countries = new Map();
  await eachLine(paths['countryInfo.txt'], (cols) => countries.set(cols[16], { cc: cols[0], en: cols[4] }));
  const admins = {};
  await eachLine(paths['admin1CodesASCII.txt'], (cols) => {
    admins[cols[0]] = cols[1];
  });

  // A GeoNames place's Hebrew name: its preferred one, else its short one, else the first; never a
  // historic or colloquial one. A CBS name always wins.
  const rank = (cols) => (cols[4] === '1' ? 0 : cols[5] === '1' ? 1 : 2);
  const countryHe = new Map();
  await eachLine(unzip(paths['alternateNamesV2.zip'], 'alternateNamesV2.txt'), (cols) => {
    if (cols[2] !== 'he' || cols[6] === '1' || cols[7] === '1' || !HEBREW.test(cols[3])) return;
    const place = `g${cols[1]}`;
    const [target, key] = rows.has(place) ? [hebrew, place] : countries.has(cols[1]) ? [countryHe, cols[1]] : [];
    if (!target) return;
    const known = target.get(key);
    if (!known || rank(cols) < known.rank) target.set(key, { name: cols[3], rank: rank(cols) });
  });

  const zones = [...new Set([...rows.values()].map((row) => row.tz))].sort();
  const zoneIndex = new Map(zones.map((zone, index) => [zone, index]));
  const countryNames = {};
  for (const [id, country] of countries) countryNames[country.cc] = [countryHe.get(id)?.name ?? '', country.en];
  const usedAdmins = {};
  const places = [...rows.values()]
    .sort((a, b) => b.population - a.population || a.id.localeCompare(b.id))
    .map((row) => {
      const adminKey = `${row.cc}.${row.admin}`;
      if (admins[adminKey]) usedAdmins[adminKey] = admins[adminKey];
      return [
        row.id,
        hebrew.get(row.id)?.name ?? '',
        row.en,
        row.cc,
        admins[adminKey] ? row.admin : '',
        row.lat,
        row.lng,
        zoneIndex.get(row.tz),
        row.elevation,
        row.population,
        row.aka ?? '',
      ];
    });
  const usedCountries = Object.fromEntries(
    [...new Set(places.map((place) => place[3]))].sort().map((cc) => [cc, countryNames[cc] ?? ['', cc]]),
  );
  const data = {
    source:
      'Israel: Central Bureau of Statistics, localities 2024; elsewhere: GeoNames (https://www.geonames.org/), CC BY 4.0',
    fields: ['id', 'he', 'en', 'cc', 'admin1', 'lat', 'lng', 'tz', 'elevation', 'population', 'aka'],
    zones,
    countries: usedCountries,
    admins: usedAdmins,
    places,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(data));
  const withHebrew = places.filter((place) => place[1]).length;
  console.log(`${places.length} places (${withHebrew} with a Hebrew name), ${fs.statSync(OUT).size} bytes`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
