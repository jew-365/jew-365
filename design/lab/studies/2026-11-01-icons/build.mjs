// Writes the gallery page into the build output from icons.mjs (the coloured set), icons-line.mjs (the
// line set), today.json (today's drawings, from gen-today.mjs) and site-template.html.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICONS } from './icons.mjs';
import { LINE_ICONS } from './icons-line.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const today = JSON.parse(readFileSync(join(here, 'today.json'), 'utf8'));
const data = ICONS.map((i) => {
  if (!today[i.id]) throw new Error(`${i.id}: not an icon of MitzvahIcon.tsx`);
  if (!LINE_ICONS[i.id]) throw new Error(`${i.id}: no line drawing`);
  for (const k of ['he', 'idea']) if (!i[k]) throw new Error(`${i.id}: missing ${k}`);
  return { id: i.id, he: i.he, idea: i.idea, now: today[i.id], next: i.draw('__UID__').trim(), line: LINE_ICONS[i.id]('__FILL__').trim() };
});
// The app's six palettes, read from src/theme/colors.ts, as one class each on the root, named as Settings names them.
const colors = readFileSync(join(here, '../../../../src/theme/colors.ts'), 'utf8');
const he = JSON.parse(readFileSync(join(here, '../../../../src/i18n/he.json'), 'utf8'));
const PALETTES = { gold: 'T_LIGHT', pink: 'T_PINK', purple: 'T_PURPLE', blue: 'T_BLUE', dark: 'T_DARK', plum: 'T_PLUM' };
const VARS = { bg: 'bg', surface: 'surface', surface2: 'surface2', text: 'text', sub: 'textSub', border: 'border', gold: 'gold', 'on-gold': 'onGold', 'gold-light': 'goldLight', 'gold-text': 'goldText', muted: 'textMuted' };
const paletteCss = Object.entries(PALETTES)
  .map(([name, constant]) => {
    const block = colors.slice(colors.indexOf(`export const ${constant}:`));
    const token = (key) => block.match(new RegExp(`\\n  ${key}: '([^']+)'`))[1];
    const dark = name === 'dark' || name === 'plum';
    return `.pal-${name} { ${Object.entries(VARS).map(([v, k]) => `--${v}: ${token(k)};`).join(' ')} color-scheme: ${dark ? 'dark' : 'light'}; }`;
  })
  .join('\n');
const buttons = Object.keys(PALETTES)
  .map((name, i) => `      <button type="button" data-palette="${name}" aria-pressed="${i === 0}">${he[`settings.theme.${name}`]}</button>`)
  .join('\n');
const html = readFileSync(join(here, 'site-template.html'), 'utf8')
  .replace('__ICONS__', JSON.stringify(data))
  .replace('__PALETTE_CSS__', paletteCss)
  .replace('__PALETTE_BUTTONS__', buttons);
mkdirSync(join(here, 'out', 'site'), { recursive: true });
writeFileSync(join(here, 'out', 'site', 'index.html'), html);
console.log(`wrote out/site/index.html with ${data.length} icons`);
