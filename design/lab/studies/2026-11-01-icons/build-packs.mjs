// Writes out/packs/index.html: the real app's screens (shot by shoot-packs.cjs with the Jewish icons hidden and
// their boxes recorded) with a switch that draws every icon in any pack: today's, א colour, ב theme tones,
// ג lines and ד lines with a soft fill (the one in the app), in the light and the dark palette.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICONS } from './icons.mjs';
import { LINE_ICONS } from './icons-line.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const today = JSON.parse(readFileSync(join(here, 'today.json'), 'utf8'));
const SCREENS = [
  ['_home', 'בית'],
  ['_siddur', 'סידור'],
  ['_mitzvot', 'המצוות שלי'],
  ['_more', 'עוד'],
  ['_mitzvah_tefillin', 'הנחת תפילין'],
];
const screens = [];
for (const theme of ['light', 'dark']) {
  for (const [file, title] of SCREENS) {
    const base = `/tmp/packs/${file}-${theme}`;
    if (!existsSync(`${base}.png`)) throw new Error(`missing ${base}.png: run shoot-packs.cjs first`);
    const small = `${base}.1x.png`;
    execFileSync('python3', ['-c', `from PIL import Image; im=Image.open('${base}.png'); im.resize((390, 844)).save('${small}', optimize=True)`]);
    screens.push({ theme, title, img: readFileSync(small).toString('base64'), icons: JSON.parse(readFileSync(`${base}.json`, 'utf8')) });
  }
}
const ids = [...new Set(screens.flatMap((s) => s.icons.map((i) => i.id)))];
const art = Object.fromEntries(
  ids.map((id) => [id, { today: today[id], color: ICONS.find((i) => i.id === id).draw('__UID__'), line: LINE_ICONS[id]('__FILL__') }]),
);
mkdirSync(join(here, 'out', 'packs'), { recursive: true });
writeFileSync(
  join(here, 'out', 'packs', 'index.html'),
  `<!DOCTYPE html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>חבילות האייקונים על מסכי יהודי 365</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700&display=swap">
<style>
${readFileSync(join(here, 'roles.css'), 'utf8')}
:root { --page: #F6F1E8; --card: #FFFDF9; --ink: #1D2240; --sub: #69645D; --line: #EBE3D6; --accent: #F08A3C; --on-accent: #2B1608; color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--page); color: var(--ink); font-family: "Rubik", system-ui, sans-serif; }
.wrap { max-width: 1320px; margin: 0 auto; padding: 24px 20px 60px; display: grid; gap: 18px; }
h1 { margin: 0; font-size: 28px; text-wrap: balance; } p { margin: 0; color: var(--sub); line-height: 1.6; max-width: 74ch; }
.bars { position: sticky; top: 0; z-index: 5; background: var(--page); padding: 10px 0; display: grid; gap: 8px; border-bottom: 1px solid var(--line); }
.bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.bar > span { min-width: 64px; font-size: 14px; color: var(--sub); }
.bar button { font: 600 15px "Rubik", sans-serif; min-height: 44px; padding: 0 16px; border-radius: 999px; border: 1.5px solid var(--line); background: var(--card); color: var(--ink); cursor: pointer; }
.bar button[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
button:focus-visible { outline: 3px solid #A04A0C; outline-offset: 2px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 22px; }
figure { margin: 0; display: grid; gap: 8px; justify-items: center; }
.phone { position: relative; width: 100%; max-width: 390px; aspect-ratio: 390 / 844; border-radius: 30px; border: 6px solid var(--ink); overflow: hidden; container-type: inline-size; }
.phone img { position: absolute; inset: 0; width: 100%; height: 100%; }
.icon { position: absolute; overflow: hidden; }
.icon svg { display: block; width: 100%; }
figcaption { font-weight: 600; }
</style></head><body><div class="wrap">
<h1>חבילות האייקונים על מסכי האפליקציה</h1>
<p>אלה המסכים האמיתיים של האפליקציה, צולמו מגרסת הדפדפן עם רוביק. כל אייקון יהודי מצויר במקומו המדויק ובצבע שהאפליקציה נותנת לו, לפי החבילה שבוחרים. ד׳ היא החבילה שכבר נמצאת באפליקציה.</p>
<div class="bars">
  <div class="bar" role="group" aria-label="חבילת אייקונים"><span>חבילה</span>
    <button type="button" data-pack="today" aria-pressed="false">היום (הישנה)</button>
    <button type="button" data-pack="color" aria-pressed="false">א. צבעוני</button>
    <button type="button" data-pack="tonal" aria-pressed="false">ב. בגווני הערכה</button>
    <button type="button" data-pack="line" aria-pressed="false">ג. קווים</button>
    <button type="button" data-pack="lineFill" aria-pressed="true">ד. קווים עם מילוי עדין</button>
  </div>
  <div class="bar" role="group" aria-label="ערכת צבעים"><span>צבעים</span>
    <button type="button" data-palette="light" aria-pressed="true">זהב (בהיר)</button>
    <button type="button" data-palette="dark" aria-pressed="false">לילה (כהה)</button>
  </div>
</div>
<div class="grid" id="grid"></div>
</div>
<script>
const SCREENS = ${JSON.stringify(screens)};
const ART = ${JSON.stringify(art)};
let pack = 'lineFill', theme = 'light', uid = 0;
const svg = (box, inner, extra = '') => \`<svg viewBox="\${box}" fill="none" aria-hidden="true" \${extra}>\${inner}</svg>\`;
function draw(id, color) {
  const a = ART[id];
  const g = (sw, inner) => \`<g stroke="\${color}" stroke-width="\${sw}" stroke-linecap="round" stroke-linejoin="round" fill="none">\${inner}</g>\`;
  if (pack === 'today') return svg('0 0 24 24', g(1.8, a.today.replaceAll('__FILL__', 'none')));
  if (pack === 'color' || pack === 'tonal') return svg('2 2 44 44', a.color.replaceAll('__UID__', 'u' + uid++));
  const soft = pack === 'lineFill' ? \`color-mix(in srgb, \${color} 26%, transparent)\` : 'none';
  return svg('3.5 3.5 41 41', g(2, a.line.replaceAll('__FILL__', soft)));
}
function render() {
  document.getElementById('grid').innerHTML = SCREENS.filter((s) => s.theme === theme).map((s) => \`
    <figure><div class="phone"><img src="data:image/png;base64,\${s.img}" alt="\${s.title}">
      \${s.icons.map((i) => \`<span class="icon\${pack === 'tonal' ? ' tonal' : ''}" style="--gold:\${i.color};left:\${i.x / 3.9}%;top:\${i.y / 8.44}%;width:\${i.size / 3.9}%;height:\${i.shown / 8.44}%">\${draw(i.id, i.color)}</span>\`).join('')}
    </div><figcaption>\${s.title}</figcaption></figure>\`).join('');
  document.querySelectorAll('[data-pack]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pack === pack)));
  document.querySelectorAll('[data-palette]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.palette === theme)));
}
document.querySelectorAll('[data-pack]').forEach((b) => (b.onclick = () => { pack = b.dataset.pack; render(); }));
document.querySelectorAll('[data-palette]').forEach((b) => (b.onclick = () => { theme = b.dataset.palette; render(); }));
render();
</script></body></html>
`,
);
console.log(`wrote out/packs/index.html: ${screens.length} screens, ${ids.length} icons`);
