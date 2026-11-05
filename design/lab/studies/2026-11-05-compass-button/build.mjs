// Writes the build output's site/index.html: the siddur reader at the end of Ashrei and the start of the Amidah in
// Mincha (nusach Ashkenaz), with the "מצפן תפילה" button in seven designs. Everything shown is the app's own: the
// palettes of src/theme/colors.ts, the strings of src/i18n/he.json, the Mincha asset's text and the compass icon of
// src/components/MitzvahIcon.tsx, read at build time; the dial option's bearing and distance are computed with the
// formulas of src/utils/compass.ts from Tel Aviv (src/data/cities.ts) to the KOTEL point.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..', '..');
const read = (p) => readFileSync(join(repo, p), 'utf8');

const colors = read('src/theme/colors.ts');
const CONSTANTS = { gold: 'T_LIGHT', pink: 'T_PINK', purple: 'T_PURPLE', blue: 'T_BLUE', dark: 'T_DARK', plum: 'T_PLUM' };
const KEYS = ['bg', 'surface', 'surface2', 'text', 'textSub', 'textMuted', 'border', 'gold', 'onGold', 'goldLight', 'goldText', 'safe'];
const PALETTES = Object.fromEntries(
  Object.entries(CONSTANTS).map(([name, constant]) => {
    const block = colors.slice(colors.indexOf(`export const ${constant}:`));
    return [name, Object.fromEntries(KEYS.map((k) => [k, block.match(new RegExp(`\\n  ${k}: '([^']+)'`))[1]]))];
  }),
);

const he = JSON.parse(read('src/i18n/he.json'));
const STRINGS = Object.fromEntries(
  ['siddur.compassButton', 'compass.title', 'compass.kotel', 'compass.north', ...Object.keys(PALETTES).map((p) => `settings.theme.${p}`)].map((k) => [k, he[k]]),
);
for (const [k, v] of Object.entries(STRINGS)) if (!v) throw new Error(`missing string ${k}`);

// The Mincha text: the last paragraph of Ashrei and the first of the Amidah, as the reader resolves them on a
// weekday (only runs with no day condition are kept).
const mincha = JSON.parse(read('assets/siddur/ashkenaz/mincha.siddur'));
const textOf = (segment) =>
  segment.he
    .map((p) => p.filter((r) => !r.when).map((r) => r.t).join(''))
    .join(' ')
    .trim();
const section = (title) => mincha.sections.find((s) => s.title.he === title);
const ashrei = section('אשרי');
const amidah = section('תפילת העמידה');
const plain = (s) => s.segments.filter((g) => !g.optional && !g.minyan && !g.when);
const TEXT = {
  before: { title: ashrei.title.he, text: textOf(plain(ashrei).at(-1)) },
  // The prayer's own words: the segments that carry nikud, so the halachic note that opens the section is left out.
  amidah: {
    title: amidah.title.he,
    text: plain(amidah).map(textOf).filter((t) => /[\u05B0-\u05BC]/.test(t)).slice(0, 3).join(' '),
  },
};

// The compass icon as MitzvahIcon draws it (24-unit view box).
const icon = read('src/components/MitzvahIcon.tsx');
const compass = icon.slice(icon.indexOf('  compass: ({ fill }) =>'));
const ICON = {
  circle: compass.match(/<Circle cx=\{(\d+)\} cy=\{(\d+)\} r=\{([\d.]+)\}/).slice(1).map(Number),
  needle: compass.match(/<Path d="([^"]+)"/)[1],
};

// The dial option: the bearing and distance from Tel Aviv, by the formulas of src/utils/compass.ts.
const cities = read('src/data/cities.ts');
const tlv = cities.slice(cities.indexOf("cityId: 'tel-aviv'"));
const from = { lat: Number(tlv.match(/lat: ([\d.]+)/)[1]), lng: Number(tlv.match(/lng: ([\d.]+)/)[1]) };
const comp = read('src/utils/compass.ts');
const kotel = comp.match(/KOTEL: GeoPoint = \{ lat: ([\d.]+), lng: ([\d.]+) \}/);
const to = { lat: Number(kotel[1]), lng: Number(kotel[2]) };
const rad = (d) => (d * Math.PI) / 180;
const dLng = rad(to.lng - from.lng);
const y = Math.sin(dLng) * Math.cos(rad(to.lat));
const x = Math.cos(rad(from.lat)) * Math.sin(rad(to.lat)) - Math.sin(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.cos(dLng);
const bearing = (((Math.atan2(y, x) * 180) / Math.PI) % 360 + 360) % 360;
const dLat = rad(to.lat - from.lat);
const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.sin(dLng / 2) ** 2;
const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
const DIAL = { city: 'תל אביב', bearing: Math.round(bearing), km: Math.round(km) };

const html = readFileSync(join(here, 'site-template.html'), 'utf8')
  .replace('__PALETTES__', JSON.stringify(PALETTES))
  .replace('__STRINGS__', JSON.stringify(STRINGS))
  .replace('__TEXT__', JSON.stringify(TEXT))
  .replace('__ICON__', JSON.stringify(ICON))
  .replace('__DIAL__', JSON.stringify(DIAL));
mkdirSync(join(here, 'out', 'site'), { recursive: true });
writeFileSync(join(here, 'out', 'site', 'index.html'), html);
console.log('wrote out/site/index.html', DIAL);
