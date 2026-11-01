// Writes the gallery site into out/site (index.html and boards/) and the Design canvas into out/canvas/project
// (canvas.json beside every board), both from dirs.json and the boards build.mjs wrote.
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dirs = JSON.parse(readFileSync(join(here, 'dirs.json'), 'utf8'));
const DATA = JSON.parse(readFileSync(join(here, 'data.json'), 'utf8'));
const built = join(here, 'out', 'project');
const siteDir = join(here, 'out', 'site');
const siteBoards = join(siteDir, 'boards');
const canvasDir = join(here, 'out', 'canvas', 'project');
mkdirSync(canvasDir, { recursive: true });
mkdirSync(siteBoards, { recursive: true });

// The five surfaces of spec section 4, in its order. Settings has three directions to pick one from; every other
// surface has one board to approve or send back.
const SURFACES = [
  { id: 'settings', title: 'הגדרות: רמת הנודניקיות של האפליקציה', spec: '4.1', lede: 'שלושה כיוונים לאותה בקרה, במכשיר והתראות, מיד אחרי מתג ההתראות. בוחרים אחד.', pick: 'one' },
  { id: 'mitzvah', title: 'מסך המצווה: רמה משלה ושורת נודניק', spec: '4.2', lede: 'הרמה של מצווה אחת והשורה שכל תזכורת מקבלת.', pick: 'ok' },
  { id: 'editor', title: 'עורך התזכורת: בלוק הנודניק', spec: '4.3', lede: 'נודניק לתזכורת אחת, עם השעות המדויקות של החזרות.', pick: 'ok' },
  { id: 'form', title: 'מצווה אישית: הטופס', spec: '4.4', lede: 'אותו בלוק בכל כרטיס התראה, ורמה למצווה כולה.', pick: 'ok' },
  { id: 'tray', title: 'מגש ההתראות: שרשרת אחת, "עשיתי" אחד', spec: '4.5', lede: 'כך החזרות נראות בטלפון, וכך הן נעלמות.', pick: 'ok' },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

for (const d of dirs) {
  const src = join(built, `${d.board}.dc.html`);
  if (!existsSync(src)) throw new Error(`missing build for ${d.board}`);
  for (const k of ['id', 'surface', 'letter', 'name', 'board', 'idea', 'note']) if (!d[k]) throw new Error(`${d.board}: missing ${k}`);
  if (!SURFACES.some((s) => s.id === d.surface)) throw new Error(`${d.board}: unknown surface ${d.surface}`);
  if (!Array.isArray(d.try) || d.try.length < 3) throw new Error(`${d.board}: needs 3+ try items`);
  copyFileSync(src, join(siteBoards, `${d.board}.dc.html`));
  copyFileSync(src, join(canvasDir, `${d.board}.dc.html`));
}
copyFileSync(join(built, 'support.js'), join(siteBoards, 'support.js'));

const pickButton = (s, d) =>
  s.pick === 'one'
    ? `<button class="pick" data-pick="${d.id}" aria-pressed="false"><span class="dot" aria-hidden="true"></span><span class="lbl">זה הכיוון שלי</span></button>`
    : `<div class="verdict" role="group" aria-label="${esc('ההחלטה על ' + d.name)}"><button class="pick" data-ok="${d.id}" data-v="ok" aria-pressed="false"><span class="dot" aria-hidden="true"></span><span>מאשר</span></button><button class="pick alt" data-ok="${d.id}" data-v="change" aria-pressed="false"><span class="dot" aria-hidden="true"></span><span>רוצה שינוי</span></button></div>`;

const stall = (s, d) => `  <article class="stall" id="${d.id}" aria-labelledby="h-${d.id}">
    <div class="info">
      <div class="head"><span class="letter" aria-hidden="true">${esc(d.letter)}</span><span class="badge">${esc(d.badge || '')}</span></div>
      <h3 id="h-${d.id}">${esc(d.name)}</h3>
      <p class="idea">${esc(d.idea)}</p>
      <ul class="try">
${d.try.map((t) => `        <li>${esc(t)}</li>`).join('\n')}
      </ul>
${d.demos && d.demos.length ? `      <div class="demos" role="group" aria-label="${esc('מה הטלפון מראה')}">\n        <span>מה הטלפון מראה</span>\n        <div class="row">${d.demos.map((x, i) => `<button class="demo" data-demo="${esc(x.hash)}" aria-pressed="${i === 0}">${esc(x.label)}</button>`).join('')}</div>\n      </div>` : ''}
${d.fit ? `      <p class="fit"><b>מתאים אם</b> ${esc(d.fit)}</p>` : ''}
    </div>
    <div class="device" data-id="${d.id}" data-surface="${s.id}">
      <div class="screen"><iframe data-src="boards/${d.board}.dc.html" data-extra="${esc((d.demos && d.demos[0] && d.demos[0].hash) || '')}" title="${esc(d.letter + ' · ' + d.name)}"></iframe></div>
      <button class="close">סגירה</button>
      <div class="actions">
        ${pickButton(s, d)}
        <button class="ghost full">מסך מלא</button>
      </div>
    </div>
  </article>
`;

const sections = SURFACES.map((s, i) => {
  const items = dirs.filter((d) => d.surface === s.id);
  if (!items.length) throw new Error(`surface ${s.id} has no board`);
  return `<section class="surface" id="s-${s.id}" aria-labelledby="h-s-${s.id}">
  <header class="surface-h"><p class="eyebrow num">${i + 1} · סעיף ${s.spec} באפיון</p><h2 id="h-s-${s.id}">${esc(s.title)}</h2><p class="lede">${esc(s.lede)}</p></header>
${items.map((d) => stall(s, d)).join('\n')}
</section>`;
}).join('\n\n');

const labels = Object.fromEntries(dirs.map((d) => [d.id, d.letter + ' · ' + d.name]));
const surfaceOf = Object.fromEntries(SURFACES.map((s) => [s.id, { title: s.title, pick: s.pick, items: dirs.filter((d) => d.surface === s.id).map((d) => d.id) }]));
const facts = {
  dateLine: DATA.dateLine,
  hebDate: DATA.hebDate,
  city: DATA.city,
  now: DATA.now,
  shacharit: DATA.mitzvot.shacharit.timeRange,
  maariv: DATA.mitzvot.maariv.timeRange,
  mains: DATA.mainsPerDay,
};

let page = readFileSync(join(here, 'site-template.html'), 'utf8');
page = page
  .replace('<!--SURFACES-->', sections)
  .replace('<!--JUMP-->', SURFACES.map((s, i) => `      <a href="#s-${s.id}"><b class="num">${i + 1}</b>${esc(s.title.split(':')[0])}</a>`).join('\n'))
  .replace('/*LABELS*/', JSON.stringify(labels))
  .replace('/*SURFACES*/', JSON.stringify(surfaceOf))
  .replace(/\{\{(\w+)\}\}/g, (m, k) => (k in facts ? esc(facts[k]) : m));
for (const k of ['<!--SURFACES-->', '<!--JUMP-->', '/*LABELS*/', '/*SURFACES*/']) if (page.includes(k)) throw new Error(`unfilled ${k}`);
const leftover = page.match(/\{\{\w+\}\}/);
if (leftover) throw new Error(`unfilled ${leftover[0]}`);
writeFileSync(join(siteDir, 'index.html'), page);

const keep = new Set(dirs.map((d) => `${d.board}.dc.html`));
const stale = [];
for (const [dir, prefix] of [[siteBoards, 'boards/'], [canvasDir, 'project/']]) {
  for (const file of readdirSync(dir)) {
    if (file.endsWith('.dc.html') && !keep.has(file)) {
      rmSync(join(dir, file));
      stale.push(prefix + file);
    }
  }
}
if (stale.length) console.log('removed from out (pass null for these on the next publish):', stale.join(', '));

// The canvas: the three Settings directions on the first row, the other four surfaces on the second.
const W = 390;
const H = 844;
const GX = 80;
const ROW = H + 460;
const boards = {};
const notes = {
  title1: { x: 0, y: -300, text: 'רמת נודניקיות ותזכורות חוזרות · חמשת המסכים של סעיף 4 באפיון', kind: 'title1', maxW: 4 * (W + GX) },
  data: {
    x: 4 * (W + GX),
    y: 0,
    w: 320,
    size: 's',
    fill: 'blue',
    text: `הנתונים אמיתיים: ${facts.dateLine} (${facts.hebDate}), ${facts.city}, בשעה ${facts.now}. שחרית ${facts.shacharit}, ערבית ${facts.maariv}. התזכורות הן של המאגר באפליקציה, והשעות חושבו בספריות של האפליקציה עצמה.`,
  },
  howto: {
    x: 4 * (W + GX),
    y: 300,
    w: 320,
    size: 's',
    fill: 'gray',
    text: 'בכל לוח: Play כדי ללחוץ. Tweaks: ערכה (זהב או לילה), הרמה של האפליקציה (1 עד 4) והמצווה במסך המצווה ובעורך. בשורה הראשונה שלושה כיוונים לבקרה בהגדרות, בוחרים אחד; בשורה השנייה מסך המצווה, העורך, הטופס והמגש.',
  },
};
const rows = [dirs.filter((d) => d.surface === 'settings'), dirs.filter((d) => d.surface !== 'settings')];
rows.forEach((row, r) => {
  row.forEach((d, i) => {
    const x = i * (W + GX);
    const y = r * ROW;
    boards[`${d.board}.dc.html`] = { x, y, w: W, h: H, title: d.letter + ' · ' + d.name, is_interactive: true, radius: 36 };
    notes[`n${d.board}`] = { x, y: y + H + 40, w: W, size: 's', fill: d.surface === 'settings' ? 'orange' : 'yellow', text: d.letter + ' · ' + d.name + ': ' + d.note };
  });
});
const canvas = {
  v: 3,
  createdOnFiles: { v: 1, at: '2026-11-01T20:00:00Z' },
  title: 'רמת נודניקיות',
  launch: { view: 'canvas' },
  pages: [],
  boards,
  order: dirs.map((d) => `${d.board}.dc.html`),
  notes,
  designSystems: [],
};
writeFileSync(join(canvasDir, 'canvas.json'), JSON.stringify(canvas, null, 2) + '\n');
console.log('site + canvas assembled:', dirs.map((d) => d.board).join(', '));
