// Writes out/options/index.html: the real app's screens (shot by shoot-packs.cjs with the siddur and prayer icons
// hidden) with pickers that draw icons-options.mjs's options in their place, in pack ב's theme tones, in each of
// the app's six palettes, beside a strip of every option as a tile.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SIDDUR_OPTIONS, PRAYER_OPTIONS } from './icons-options.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const he = JSON.parse(readFileSync(join(here, '../../../../src/i18n/he.json'), 'utf8'));
const PALETTES = ['gold', 'pink', 'purple', 'blue', 'dark', 'plum'];
const SCREENS = [
  ['_siddur', 'סידור'],
  ['_mitzvot', 'המצוות שלי'],
  ['_home', 'בית'],
  ['_mitzvah_shacharit', 'תפילת שחרית'],
];
const screens = [];
for (const theme of PALETTES) {
  for (const [file, title] of SCREENS) {
    const base = `/tmp/packs/${file}-${theme}`;
    if (!existsSync(`${base}.png`)) throw new Error(`missing ${base}.png: run shoot-packs.cjs first`);
    const small = `${base}.1x.png`;
    execFileSync('python3', ['-c', `from PIL import Image; im=Image.open('${base}.png'); im.resize((390, 844)).save('${small}', optimize=True)`]);
    screens.push({ theme, title, img: readFileSync(small).toString('base64'), icons: JSON.parse(readFileSync(`${base}.json`, 'utf8')) });
  }
}
const siddur = SIDDUR_OPTIONS.map((o) => ({ key: o.key, he: o.he, idea: o.idea, art: { siddur: o.draw('__UID__') } }));
const prayers = PRAYER_OPTIONS.map((o) => ({
  key: o.key,
  he: o.he,
  idea: o.idea,
  art: Object.fromEntries(['shacharit', 'mincha', 'maariv'].map((id) => [id, o.draw[id]('__UID__')])),
}));
// The tile and accent colours of each palette, for the option strip.
const colors = readFileSync(join(here, '../../../../src/theme/colors.ts'), 'utf8');
const CONSTANTS = { gold: 'T_LIGHT', pink: 'T_PINK', purple: 'T_PURPLE', blue: 'T_BLUE', dark: 'T_DARK', plum: 'T_PLUM' };
const tiles = Object.fromEntries(
  PALETTES.map((p) => {
    const block = colors.slice(colors.indexOf(`export const ${CONSTANTS[p]}:`));
    const token = (k) => block.match(new RegExp(`\\n  ${k}: '([^']+)'`))[1];
    return [p, { tile: token('goldLight'), gold: token('gold'), bg: token('bg'), card: token('surface'), text: token('text'), sub: token('textSub') }];
  }),
);
mkdirSync(join(here, 'out', 'options'), { recursive: true });
writeFileSync(
  join(here, 'out', 'options', 'index.html'),
  `<!DOCTYPE html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>אייקוני הסידור והתפילות</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700&display=swap">
<style>
${readFileSync(join(here, 'roles.css'), 'utf8')}
:root { --page: #F6F1E8; --card: #FFFDF9; --ink: #1D2240; --sub: #69645D; --line: #EBE3D6; --accent: #F08A3C; --on-accent: #2B1608; color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--page); color: var(--ink); font-family: "Rubik", system-ui, sans-serif; }
.wrap { max-width: 1320px; margin: 0 auto; padding: 24px 20px 60px; display: grid; gap: 18px; }
h1 { margin: 0; font-size: 28px; text-wrap: balance; } h2 { margin: 0; font-size: 19px; } p { margin: 0; color: var(--sub); line-height: 1.6; max-width: 76ch; }
.bars { position: sticky; top: 0; z-index: 5; background: var(--page); padding: 10px 0; display: grid; gap: 8px; border-bottom: 1px solid var(--line); }
.bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.bar > span { min-width: 64px; font-size: 14px; color: var(--sub); }
.bar button { font: 600 15px "Rubik", sans-serif; min-height: 44px; padding: 0 14px; border-radius: 999px; border: 1.5px solid var(--line); background: var(--card); color: var(--ink); cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
.bar button[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
.bar button .t { width: 32px; height: 32px; border-radius: 12px; display: grid; place-items: center; }
button:focus-visible { outline: 3px solid #A04A0C; outline-offset: 2px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 22px; }
figure { margin: 0; display: grid; gap: 8px; justify-items: center; }
.phone { position: relative; width: 100%; max-width: 390px; aspect-ratio: 390 / 844; border-radius: 30px; border: 6px solid var(--ink); overflow: hidden; }
.phone img { position: absolute; inset: 0; width: 100%; height: 100%; }
.icon { position: absolute; overflow: hidden; } .icon svg { display: block; width: 100%; }
figcaption { font-weight: 600; }
.ideas { display: grid; gap: 4px; font-size: 14px; color: var(--sub); }
</style></head><body><div class="wrap">
<h1>אייקוני הסידור והתפילות</h1>
<p>כל האייקונים נשארים בחבילה ב׳. כאן אפשר לבחור אייקון אחר לסידור ואייקונים אחרים לשלוש התפילות, ולראות אותם במקומם המדויק על המסכים האמיתיים, בכל שש ערכות הצבעים.</p>
<div class="bars">
  <div class="bar" role="group" aria-label="אייקון הסידור"><span>סידור</span><span id="siddur-bar" class="bar"></span></div>
  <div class="bar" role="group" aria-label="אייקוני התפילות"><span>תפילות</span><span id="prayer-bar" class="bar"></span></div>
  <div class="bar" role="group" aria-label="ערכת צבעים"><span>צבעים</span>
${PALETTES.map((p, i) => `    <button type="button" data-palette="${p}" aria-pressed="${i === 0}">${he[`settings.theme.${p}`]}</button>`).join('\n')}
  </div>
</div>
<div class="ideas" id="ideas"></div>
<div class="grid" id="grid"></div>
</div>
<script>
const SCREENS = ${JSON.stringify(screens)};
const SIDDUR = ${JSON.stringify(siddur)};
const PRAYERS = ${JSON.stringify(prayers)};
const TILES = ${JSON.stringify(tiles)};
let siddur = 'now', prayer = 'now', theme = 'gold', uid = 0;
const svg = (inner) => \`<svg viewBox="2 2 44 44" aria-hidden="true">\${inner.replaceAll('__UID__', 'u' + uid++)}</svg>\`;
const artFor = (id) => (id === 'siddur' ? SIDDUR.find((o) => o.key === siddur) : PRAYERS.find((o) => o.key === prayer)).art[id];
const chip = (art) => \`<span class="t tonal" style="--gold:\${TILES[theme].gold};background:\${TILES[theme].tile}">\${svg(art)}</span>\`;
function render() {
  document.getElementById('siddur-bar').innerHTML = SIDDUR.map((o) => \`<button type="button" data-siddur="\${o.key}" aria-pressed="\${o.key === siddur}">\${chip(o.art.siddur)}\${o.he}</button>\`).join('');
  document.getElementById('prayer-bar').innerHTML = PRAYERS.map((o) => \`<button type="button" data-prayer="\${o.key}" aria-pressed="\${o.key === prayer}">\${chip(o.art.shacharit)}\${chip(o.art.mincha)}\${chip(o.art.maariv)}\${o.he}</button>\`).join('');
  document.getElementById('ideas').innerHTML = \`<div>סידור: \${SIDDUR.find((o) => o.key === siddur).idea}</div><div>תפילות: \${PRAYERS.find((o) => o.key === prayer).idea}</div>\`;
  document.getElementById('grid').innerHTML = SCREENS.filter((s) => s.theme === theme).map((s) => \`
    <figure><div class="phone"><img src="data:image/png;base64,\${s.img}" alt="\${s.title}">
      \${s.icons.map((i) => \`<span class="icon tonal" style="--gold:\${i.color};left:\${i.x / 3.9}%;top:\${i.y / 8.44}%;width:\${i.size / 3.9}%;height:\${i.shown / 8.44}%">\${svg(artFor(i.id))}</span>\`).join('')}
    </div><figcaption>\${s.title}</figcaption></figure>\`).join('');
  document.querySelectorAll('[data-siddur]').forEach((b) => (b.onclick = () => { siddur = b.dataset.siddur; render(); }));
  document.querySelectorAll('[data-prayer]').forEach((b) => (b.onclick = () => { prayer = b.dataset.prayer; render(); }));
  document.querySelectorAll('[data-palette]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.palette === theme)));
}
document.querySelectorAll('[data-palette]').forEach((b) => (b.onclick = () => { theme = b.dataset.palette; render(); }));
render();
</script></body></html>
`,
);
console.log(`wrote out/options/index.html: ${screens.length} screens, ${siddur.length} siddur and ${prayers.length} prayer options`);
