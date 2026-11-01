// Writes out/more/index.html, round 7's page: the real app's screens (shot by shoot-packs.cjs with the Kriat Shema,
// Birchot HaShachar, Ushpizin, meals and general icons hidden) with pickers that draw icons-more.mjs's options in their
// place, in pack ב's theme tones, in each of the app's six palettes; every text of the general group takes the icon
// chosen for it, and below the screens every option is drawn large.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICONS } from './icons.mjs';
import { TOPICS, GENERAL, artOf } from './icons-more.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const app = (path) => readFileSync(join(here, '../../../../src', path), 'utf8');
const he = JSON.parse(app('i18n/he.json'));
const PALETTES = ['gold', 'pink', 'purple', 'blue', 'dark', 'plum'];
const SCREENS = [
  ['/siddur+עכשיו+כללי@siddur-row-tikkun_haklali', 'סידור: כללי'],
  ['/siddur+עכשיו+כללי@siddur-row-asher_yatzar', 'סידור: כללי, ההמשך'],
  ['/siddur+עכשיו+מצוות', 'סידור: מצוות'],
  ['/siddur+עכשיו+סעודה', 'סידור: סעודה'],
  ['/mitzvot', 'המצוות שלי'],
  ['/mitzvot@library-group-seasonal', 'המצוות שלי: עונתיות'],
  ['/mitzvah/krias_shma_shacharit', 'קריאת שמע של שחרית'],
  ['/mitzvah/ushpizin', 'אושפיזין'],
];
const screens = [];
for (const theme of PALETTES) {
  for (const [spec, title] of SCREENS) {
    const base = `${process.env.SHOTS_DIR || '/tmp/packs-more'}/${spec.replace(/[/?=@+]/g, '_')}-${theme}`;
    if (!existsSync(`${base}.png`)) throw new Error(`missing ${base}.png: run shoot-packs.cjs first`);
    const small = `${base}.1x.jpg`;
    execFileSync('python3', ['-c', `from PIL import Image; Image.open('${base}.png').convert('RGB').resize((390, 844), Image.LANCZOS).save('${small}', quality=88)`]);
    screens.push({ theme, title, img: readFileSync(small).toString('base64'), icons: JSON.parse(readFileSync(`${base}.json`, 'utf8')) });
  }
}
// The names of the general group's texts, as the app's registry gives them.
const NAMES = Object.fromEntries([...app('data/siddur.ts').matchAll(/(\w+): \{\s*name: \{ he: '([^']+)'/g)].map(([, id, name]) => [id, name]));
const option = (o) => ({
  key: o.key,
  he: o.he,
  idea: o.idea,
  art: artOf(o),
  ...(o.byText ? { byText: Object.fromEntries(Object.entries(o.byText).map(([id, draw]) => [id, draw('__UID__')])) } : {}),
});
const topics = TOPICS.map((t) => ({ icon: t.icon, he: t.he, options: t.options.map(option) }));
const general = GENERAL.map((g) => {
  if (!NAMES[g.text]) throw new Error(`no registry name for ${g.text}`);
  return { text: g.text, he: NAMES[g.text], options: g.options.map(option) };
});
const headerArt = ICONS.find((icon) => icon.id === 'general').draw('__UID__');
// The tile and accent colours of each palette, for the chips and the large drawings.
const colors = app('theme/colors.ts');
const CONSTANTS = { gold: 'T_LIGHT', pink: 'T_PINK', purple: 'T_PURPLE', blue: 'T_BLUE', dark: 'T_DARK', plum: 'T_PLUM' };
const tiles = Object.fromEntries(
  PALETTES.map((p) => {
    const block = colors.slice(colors.indexOf(`export const ${CONSTANTS[p]}:`));
    const token = (k) => block.match(new RegExp(`\\n  ${k}: '([^']+)'`))[1];
    return [p, { tile: token('goldLight'), gold: token('gold') }];
  }),
);
mkdirSync(join(here, 'out', 'more'), { recursive: true });
writeFileSync(
  join(here, 'out', 'more', 'index.html'),
  `<!DOCTYPE html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>אייקונים חדשים: קריאת שמע, ברכות השחר, אושפיזין, סעודה והכללי</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700&display=swap">
<style>
${readFileSync(join(here, 'roles.css'), 'utf8')}
:root { --page: #F6F1E8; --card: #FFFDF9; --ink: #1D2240; --sub: #69645D; --line: #EBE3D6; --accent: #F08A3C; --on-accent: #2B1608; color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--page); color: var(--ink); font-family: "Rubik", system-ui, sans-serif; }
.wrap { max-width: 1320px; margin: 0 auto; padding: 24px 20px 60px; display: grid; gap: 18px; }
h1 { margin: 0; font-size: 28px; text-wrap: balance; } h2 { margin: 8px 0 0; font-size: 20px; } p { margin: 0; color: var(--sub); line-height: 1.6; max-width: 76ch; }
.bars { position: sticky; top: 0; z-index: 5; background: var(--page); padding: 10px 0; display: grid; gap: 8px; border-bottom: 1px solid var(--line); }
.bar { display: flex; flex-wrap: nowrap; gap: 8px; align-items: center; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
.bar::-webkit-scrollbar { display: none; }
.bar > * { flex: none; white-space: nowrap; }
/* On a phone the controls would cover the screens, so each row is one swipeable line and the block scrolls away. */
@media (max-width: 900px) { .bars { position: static; } }
.group { display: contents; }
.bar > .label { min-width: 104px; font-size: 14px; color: var(--sub); }
.bar button { font: 600 15px "Rubik", sans-serif; min-height: 44px; padding: 0 14px 0 8px; border-radius: 999px; border: 1.5px solid var(--line); background: var(--card); color: var(--ink); cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
.bar button[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
.bar button .t { width: 32px; height: 32px; border-radius: 12px; display: grid; place-items: center; }
.bar button .t svg { width: 22px; height: 22px; }
button:focus-visible { outline: 3px solid #A04A0C; outline-offset: 2px; }
.general { display: grid; gap: 6px; background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 12px 14px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 22px; }
figure { margin: 0; display: grid; gap: 8px; justify-items: center; }
.phone { position: relative; width: 100%; max-width: 390px; aspect-ratio: 390 / 844; border-radius: 30px; border: 6px solid var(--ink); overflow: hidden; }
.phone img { position: absolute; inset: 0; width: 100%; height: 100%; }
.icon { position: absolute; overflow: hidden; } .icon svg { display: block; width: 100%; }
figcaption { font-weight: 600; }
.ideas { display: grid; gap: 4px; font-size: 14px; color: var(--sub); }
.big { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px; }
.big h3 { grid-column: 1 / -1; margin: 10px 0 0; font-size: 17px; }
.big article { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 14px; display: grid; gap: 8px; justify-items: center; text-align: center; }
.big .tile { width: 112px; height: 112px; border-radius: 30px; display: grid; place-items: center; }
.big .tile svg { width: 84px; height: 84px; }
.big b { font-size: 15px; } .big small { color: var(--sub); font-size: 13px; line-height: 1.5; }
</style></head><body><div class="wrap">
<h1>אייקונים חדשים: קריאת שמע, ברכות השחר, אושפיזין, סעודה והכללי</h1>
<p>אותו סגנון של חבילה ב׳, בגווני ערכת הצבעים. השורות למעלה בוחרות אייקון לקריאת שמע של שחרית, לברכות השחר, לאושפיזין ולסעודה; האפשרות הראשונה בכל שורה היא האייקון של היום, להשוואה. מתחתן, לכל טקסט בקבוצה ״כללי״ בסידור אייקון משלו במקום המגילה. כל בחירה מוצגת במקומה המדויק על המסכים האמיתיים, בכל שש ערכות הצבעים, ובסוף העמוד כל האפשרויות בגדול.</p>
<div class="bars">
${topics.map((t) => `  <div class="bar" role="group" aria-label="${t.he}"><span class="label">${t.he}</span><span id="bar-${t.icon}" class="group"></span></div>`).join('\n')}
  <div class="bar" role="group" aria-label="ערכת צבעים"><span class="label">צבעים</span>
${PALETTES.map((p, i) => `    <button type="button" data-palette="${p}" aria-pressed="${i === 0}">${he[`settings.theme.${p}`]}</button>`).join('\n')}
  </div>
</div>
<div class="ideas" id="ideas"></div>
<h2>״כללי״: אייקון לכל טקסט</h2>
<div class="general" id="general"></div>
<div class="grid" id="grid"></div>
<h2>כל האפשרויות בגדול</h2>
<div class="big" id="big"></div>
</div>
<script>
const SCREENS = ${JSON.stringify(screens)};
const TOPICS = ${JSON.stringify(topics)};
const GENERAL = ${JSON.stringify(general)};
const HEADER = ${JSON.stringify(headerArt)};
const TILES = ${JSON.stringify(tiles)};
// The first new option of each topic, and the first option of each text.
const chosen = Object.fromEntries([...TOPICS.map((t) => [t.icon, t.options[1].key]), ...GENERAL.map((g) => [g.text, g.options[0].key])]);
let theme = 'gold', uid = 0;
const svg = (inner) => \`<svg viewBox="2 2 44 44" aria-hidden="true">\${inner.replaceAll('__UID__', 'u' + uid++)}</svg>\`;
const pick = (list, key) => list.find((o) => o.key === key);
const tile = (art, cls = 't') => \`<span class="\${cls} tonal" style="--gold:\${TILES[theme].gold};background:\${TILES[theme].tile}">\${svg(art)}</span>\`;
// What a recorded icon shows: a general text's own icon, the group's scroll on its header, else the topic's choice
// (a meals choice may give each blessing its own).
function artFor(icon) {
  const text = icon.row && GENERAL.find((g) => g.text === icon.row);
  if (text) return pick(text.options, chosen[text.text]).art;
  if (icon.id === 'general') return HEADER;
  const option = pick(TOPICS.find((t) => t.icon === icon.id).options, chosen[icon.id]);
  return (icon.row && option.byText && option.byText[icon.row]) || option.art;
}
const buttons = (key, options) => options.map((o) => \`<button type="button" data-key="\${key}" data-option="\${o.key}" aria-pressed="\${o.key === chosen[key]}">\${tile(o.art)}\${o.he}</button>\`).join('');
function render() {
  TOPICS.forEach((t) => (document.getElementById('bar-' + t.icon).innerHTML = buttons(t.icon, t.options)));
  document.getElementById('ideas').innerHTML = TOPICS.map((t) => \`<div>\${t.he}: \${pick(t.options, chosen[t.icon]).idea}</div>\`).join('');
  document.getElementById('general').innerHTML = GENERAL.map((g) => \`<div class="bar" role="group" aria-label="\${g.he}"><span class="label">\${g.he}</span>\${buttons(g.text, g.options)}</div>\`).join('');
  document.getElementById('grid').innerHTML = SCREENS.filter((s) => s.theme === theme).map((s) => \`
    <figure><div class="phone"><img src="data:image/jpeg;base64,\${s.img}" alt="\${s.title}">
      \${s.icons.map((i) => \`<span class="icon tonal" style="--gold:\${i.color};left:\${i.x / 3.9}%;top:\${i.y / 8.44}%;width:\${i.size / 3.9}%;height:\${i.shown / 8.44}%">\${svg(artFor(i))}</span>\`).join('')}
    </div><figcaption>\${s.title}</figcaption></figure>\`).join('');
  const card = (o, name) => \`<article>\${tile(o.art, 'tile')}<b>\${name}</b><small>\${o.idea}</small></article>\`;
  document.getElementById('big').innerHTML = [
    ...TOPICS.map((t) => \`<h3>\${t.he}</h3>\${t.options.map((o) => card(o, o.he)).join('')}\`),
    \`<h3>״כללי״</h3>\${GENERAL.flatMap((g) => g.options.map((o) => card(o, \`\${g.he}: \${o.he}\`))).join('')}\`,
  ].join('');
  document.querySelectorAll('[data-option]').forEach((b) => (b.onclick = () => { chosen[b.dataset.key] = b.dataset.option; render(); }));
  document.querySelectorAll('[data-palette]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.palette === theme)));
}
document.querySelectorAll('[data-palette]').forEach((b) => (b.onclick = () => { theme = b.dataset.palette; render(); }));
render();
</script></body></html>
`,
);
console.log(`wrote out/more/index.html: ${screens.length} screens, ${topics.map((t) => `${t.options.length} ${t.icon}`).join(', ')}, ${general.length} general texts`);
