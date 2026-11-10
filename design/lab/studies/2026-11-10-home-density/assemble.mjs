// Writes the gallery into out/site from the captures of build.mjs: each capture as a JPEG beside the page, the
// height of each variant's hero measured off its capture (the first row of the page colour under the land),
// and the size table from variants.mjs. Needs python3 with Pillow for the JPEGs and the measure.
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NOW, VARIANTS } from './variants.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'out');
const SITE = join(OUT, 'site');
const SETS = [
  { id: 'play-he', label: '400 × 800', scale: 2.7, h: 800 },
  { id: 'appstore-he', label: '402 × 874', scale: 3, h: 874 },
];

rmSync(SITE, { recursive: true, force: true });
mkdirSync(join(SITE, 'shots'), { recursive: true });
const py = `
import json, sys
from PIL import Image
out = {}
for job in json.loads(sys.argv[1]):
    im = Image.open(job['src']).convert('RGB')
    W, H = im.size
    x = int(W * 0.01)
    y = next(y for y in range(int(H * 0.3), H) if all(abs(a - b) < 6 for a, b in zip(im.getpixel((x, y)), (246, 241, 232))))
    im.resize((W * 2 // 3, H * 2 // 3), Image.LANCZOS).save(job['dst'], quality=84)
    out[job['key']] = round(y / job['scale'])
print(json.dumps(out))
`;
const jobs = VARIANTS.flatMap((v) =>
  SETS.map((s) => ({
    key: `${v.id}/${s.id}`,
    src: join(OUT, 'shots', v.id, s.id, '1-home.png'),
    dst: join(SITE, 'shots', `${v.id}-${s.id}.jpg`),
    scale: s.scale,
  })),
);
const r = spawnSync('python3', ['-c', py, JSON.stringify(jobs)], { encoding: 'utf8' });
if (r.status !== 0) throw new Error(r.stderr);
const hero = JSON.parse(r.stdout);

const radius = (p, h) => Math.round((112 * Math.min(286, Math.max(p.scene.min, h * p.scene.frac - p.scene.minus))) / 286);
const TYPE = { title: 22, heading: 17, bodyBold: 15, caption: 13, small: 12 };
const rows = [
  ['כותרת: הברכה', (p) => `${TYPE[p.greet]}`],
  ['כותרת: התאריך', (p) => `${TYPE[p.date]}`],
  ['כותרת: רקע', (p) => (p.chipBg ? 'זכוכית' : 'בלי, על השמיים')],
  ['האייקון', (p) => `${p.logo}`],
  ['מעל הכותרת', (p) => `${p.topPad}`],
  ['מהכותרת לקשת', (p) => `${p.gap}${p.crop ? `, והשמיים הריקים קוצרו` : ''}`],
  ['רדיוס הקשת (800 / 874)', (p) => `${radius(p, 800)} / ${radius(p, 874)}`],
  ['השעה בתוך הקשת', (p) => (p.plate ? `${Math.round(p.plate.clock * 100)}% מהרדיוס, בלי רקע` : '40, על רקע זכוכית')],
  ['"חזרה לעכשיו"', (p) => (p.backInside ? 'בתוך הקשת, מתחת לשעה' : 'מעל הקשת')],
  ['כרטיס התקופה', (p) => (p.card ? 'שתי שורות, לשוניות בשורת הכותרת' : 'שלוש שורות, לשוניות בעמודה')],
  ['קרוסלה: גובה צ׳יפ', (p) => `${p.chips.oneLine ? 'שורה אחת, ' : ''}${p.chips.tight ? (p.chips.oneLine ? p.chips.min : 44) : 52}`],
  ['עד "פתוח עכשיו"', (p) => `${p.open}`],
  ['סרגל תחתון: גלולה', (p) => (p.tabs ? `${p.tabs.pillW}×${p.tabs.pillH}, בלי קו תחתון` : '48×32, עם קו תחתון')],
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const phones = (set) =>
  VARIANTS.map((v) => {
    const h = hero[`${v.id}/${set.id}`];
    const base = hero[`now/${set.id}`];
    const saved = base - h;
    return `<figure class="phone${v.id === 'now' ? ' base' : ''}">
  <img src="shots/${v.id}-${set.id}.jpg" alt="מסך הבית, ${esc(v.name)}, ${set.label}" loading="eager" width="400" height="${set.h}">
  <figcaption>
    <h3>${esc(v.name)}</h3>
    <p class="nums"><span>גובה החלק העליון <b>${h}</b></span>${v.id === 'now' ? '' : `<span class="gain">${saved >= 0 ? '−' : '+'}${Math.abs(saved)}</span>`}<span>רדיוס הקשת <b>${radius(v.p, set.h)}</b></span></p>
    <p class="blurb">${esc(v.blurb)}</p>
  </figcaption>
</figure>`;
  }).join('\n');

const html = `<title>גדלים בדף הבית</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700;800&display=swap">
<style>
/* The app's own palette (gold): cream page, warm card, orange accent. Phones in a row that scrolls sideways. */
:root{--bg:#F6F1E8;--card:#FFFDF9;--line:#E9DFCF;--text:#1D2240;--sub:#6A655E;--accent:#F08A3C;--accentText:#A04A0C;--wash:#FDE9D5;--good:#0F7A52;
--ui:'Rubik',system-ui,'Segoe UI',Arial,sans-serif}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0E1626;--card:#172238;--line:#26324A;--text:#EEF1F7;--sub:#A3AEC3;--accent:#F59A4A;--accentText:#F7A65E;--wash:#3A2D26;--good:#34D399;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#0E1626;--card:#172238;--line:#26324A;--text:#EEF1F7;--sub:#A3AEC3;--accent:#F59A4A;--accentText:#F7A65E;--wash:#3A2D26;--good:#34D399;color-scheme:dark}
[hidden]{display:none!important}
body{background:var(--bg);color:var(--text);font-family:var(--ui);font-size:15px;line-height:1.5}
.wrap{max-width:1500px;margin:0 auto;padding-block:24px 48px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:flex;flex-direction:column;gap:20px}
h1{margin:0;font-size:28px;line-height:1.2;font-weight:800;text-wrap:balance}
.lead{margin:0;max-width:68ch;color:var(--sub)}
.bar{display:flex;gap:8px;align-items:center;overflow-x:auto;white-space:nowrap}
.bar span{color:var(--sub);font-size:13px}
.bar button{font:inherit;font-size:14px;font-weight:500;min-height:44px;padding:0 16px;border-radius:999px;border:1.5px solid var(--line);background:var(--card);color:var(--text);cursor:pointer}
.bar button[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:#2B1608;font-weight:700}
.bar button:focus-visible{outline:3px solid var(--accentText);outline-offset:2px}
.row{display:flex;gap:16px;overflow-x:auto;padding-bottom:8px;scroll-snap-type:x mandatory}
.phone{flex:none;width:min(300px,78vw);margin:0;display:flex;flex-direction:column;gap:10px;scroll-snap-align:start}
.phone img{display:block;width:100%;height:auto;border-radius:22px;border:1px solid var(--line);background:var(--card)}
.phone.base img{opacity:.92}
figcaption{display:flex;flex-direction:column;gap:6px;min-width:0}
h3{margin:0;font-size:17px;font-weight:700}
.nums{margin:0;display:flex;flex-wrap:wrap;gap:4px 12px;font-size:13px;color:var(--sub);font-variant-numeric:tabular-nums}
.nums b{color:var(--text)}
.gain{color:var(--good);font-weight:700}
.blurb{margin:0;font-size:13px;color:var(--sub)}
h2{margin:8px 0 0;font-size:20px;font-weight:700}
.tbl{overflow-x:auto;border:1px solid var(--line);border-radius:16px;background:var(--card)}
table{border-collapse:collapse;min-width:760px;width:100%;font-size:13px;font-variant-numeric:tabular-nums}
th,td{padding:10px 12px;text-align:start;border-bottom:1px solid var(--line);vertical-align:top}
tr:last-child td{border-bottom:0}
thead th{font-weight:700;background:var(--wash)}
tbody th{font-weight:500;color:var(--sub);white-space:nowrap}
.note{margin:0;max-width:72ch;font-size:13px;color:var(--sub)}
</style>
<div class="wrap" dir="rtl" lang="he">
<h1>גדלים בדף הבית</h1>
<p class="lead">ארבעה סידורים של הגדלים מול מה שיש היום. כל תמונה היא האפליקציה עצמה, ביום רביעי בשעה 15:40 בירושלים, בגרסת הדפדפן. ליד כל אחת: כמה נקודות (pt) גובה תופס החלק העליון של המסך, מהברכה ועד סוף הקרוסלה, כמה זה פחות ממה שיש היום, ומה רדיוס הקשת.</p>
<div class="bar" role="group" aria-label="גודל המסך"><span>גודל המסך:</span>
${SETS.map((s, i) => `<button type="button" id="set-${s.id}" data-set="${s.id}" aria-pressed="${i === 0}">${s.label}</button>`).join('')}
</div>
${SETS.map((s, i) => `<div class="row" data-row="${s.id}"${i ? ' hidden' : ''}>\n${phones(s)}\n</div>`).join('\n')}
<h2>הגדלים, אחד ליד השני</h2>
<div class="tbl"><table>
<thead><tr><th>מה</th>${VARIANTS.map((v) => `<th>${esc(v.name)}</th>`).join('')}</tr></thead>
<tbody>
${rows.map(([name, f]) => `<tr><th>${esc(name)}</th>${VARIANTS.map((v) => `<td>${esc(f(v.p))}</td>`).join('')}</tr>`).join('\n')}
</tbody></table></div>
<p class="note">בכל ארבע ההצעות השעה בתוך הקשת בלי רקע, בגודל שגדל ומתכווץ עם העיגול, והשורה שמתחתיה ("תפילת מנחה") ברוחב של העיגול, כך ששום דבר לא עולה על הקשת או על השמש. "גררו את השמש" יורד לחצי התחתון, שהוא ריק. כש"חזרה לעכשיו" נכנס לתוך הקשת, מתחת לשעה, אפשר לקצר את השמיים הריקים שמעל העיגול. בתמונות זה לא נראה, כי הוא מופיע רק בזמן גרירה.</p>
</div>
<script>
document.querySelectorAll('[data-set]').forEach(function (b) {
  b.addEventListener('click', function () {
    document.querySelectorAll('[data-set]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    document.querySelectorAll('[data-row]').forEach(function (r) { r.hidden = r.dataset.row !== b.dataset.set; });
  });
});
</script>
`;
writeFileSync(join(SITE, 'index.html'), html);
console.log(JSON.stringify(hero));
