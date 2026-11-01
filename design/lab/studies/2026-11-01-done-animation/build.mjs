// Writes the build output's site/index.html: home's "open now" cards with the current "done" stamp and five other
// completion animations, on the app's own data: the palettes of src/theme/colors.ts, the strings of
// src/i18n/he.json and the icons of src/components/jewishIcons.generated.ts, all read at build time.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..', '..');
const read = (p) => readFileSync(join(repo, p), 'utf8');

const icons = read('src/components/jewishIcons.generated.ts');
const literal = (marker) => {
  const start = icons.indexOf(marker) + marker.length;
  return new Function(`return ${icons.slice(start, icons.indexOf('};', start) + 1)}`)();
};
const ICONS = literal('JewishIconNode[]> = ');
const TONES = literal('{ share: number; with: string }> = ');
const USED = ['tefillin', 'mincha', 'shema', 'shacharit', 'maariv', 'siddur'];

const colors = read('src/theme/colors.ts');
const CONSTANTS = { gold: 'T_LIGHT', pink: 'T_PINK', purple: 'T_PURPLE', blue: 'T_BLUE', dark: 'T_DARK', plum: 'T_PLUM' };
const KEYS = ['bg', 'surface', 'surface2', 'text', 'textSub', 'textMuted', 'border', 'gold', 'onGold', 'goldLight', 'goldText', 'safe', 'urgent'];
const PALETTES = Object.fromEntries(
  Object.entries(CONSTANTS).map(([name, constant]) => {
    const block = colors.slice(colors.indexOf(`export const ${constant}:`));
    return [name, Object.fromEntries(KEYS.map((k) => [k, block.match(new RegExp(`\\n  ${k}: '([^']+)'`))[1]]))];
  }),
);

const he = JSON.parse(read('src/i18n/he.json'));
const STRINGS = Object.fromEntries(
  ['notifications.markDone', 'home.now.openText', 'home.openNow', 'home.myDay', 'state.stamped', 'home.undo', 'time.unit.hours', 'home.greeting.afternoonNeutral']
    .map((k) => [k, he[k]])
    .concat(PALETTES ? Object.keys(PALETTES).map((p) => [`settings.theme.${p}`, he[`settings.theme.${p}`]]) : []),
);
for (const [k, v] of Object.entries(STRINGS)) if (!v) throw new Error(`missing string ${k}`);

const html = readFileSync(join(here, 'site-template.html'), 'utf8')
  .replace('__ICONS__', JSON.stringify(Object.fromEntries(USED.map((id) => [id, ICONS[id]]))))
  .replace('__TONES__', JSON.stringify(TONES))
  .replace('__PALETTES__', JSON.stringify(PALETTES))
  .replace('__STRINGS__', JSON.stringify(STRINGS));
mkdirSync(join(here, 'out', 'site'), { recursive: true });
writeFileSync(join(here, 'out', 'site', 'index.html'), html);
console.log('wrote out/site/index.html');
