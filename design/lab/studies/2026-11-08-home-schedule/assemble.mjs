import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dirs = JSON.parse(readFileSync(join(here, 'dirs.json'), 'utf8'));
const built = join(here, 'out', 'project');
const siteDir = join(here, 'out', 'site');
const siteBoards = join(siteDir, 'boards');
const canvasDir = join(here, 'out', 'canvas', 'project');
mkdirSync(siteBoards, { recursive: true });
mkdirSync(canvasDir, { recursive: true });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

for (const d of dirs) {
  const src = join(built, `${d.board}.dc.html`);
  if (!existsSync(src)) throw new Error(`missing build for ${d.board}`);
  for (const k of ['id', 'letter', 'name', 'board', 'idea', 'fit', 'note']) if (!d[k]) throw new Error(`${d.board}: missing ${k}`);
  if (!Array.isArray(d.try) || d.try.length < 3) throw new Error(`${d.board}: needs 3+ try items`);
  copyFileSync(src, join(siteBoards, `${d.board}.dc.html`));
  copyFileSync(src, join(canvasDir, `${d.board}.dc.html`));
}
copyFileSync(join(built, 'support.js'), join(siteBoards, 'support.js'));
copyFileSync(join(built, 'support.js'), join(canvasDir, 'support.js'));

const stall = (d) => `  <section class="stall" id="${d.id}" aria-labelledby="h-${d.id}">
    <div class="info">
      <div class="head"><span class="letter" aria-hidden="true">${esc(d.letter)}</span><span class="badge${d.isNew ? '' : ' kept'}">${esc(d.badge || '')}</span></div>
      <h2 id="h-${d.id}">${esc(d.name)}</h2>
      <p class="idea">${esc(d.idea)}</p>
      <ul class="try">
${d.try.map((t) => `        <li>${esc(t)}</li>`).join('\n')}
      </ul>
      <p class="fit"><b>מה שונה</b> ${esc(d.fit)}</p>
    </div>
    <div class="device" data-id="${d.id}" data-label="${esc(d.letter + ' · ' + d.name)}">
      <div class="screen"><iframe data-src="boards/${d.board}.dc.html" title="${esc('טלפון ' + d.letter + ' · ' + d.name)}" loading="lazy"></iframe></div>
      <button class="close">סגירה</button>
      <div class="actions"><button class="ghost full">מסך מלא</button></div>
    </div>
  </section>
`;

let page = readFileSync(join(here, 'site-template.html'), 'utf8');
page = page
  .replace('<!--STALLS-->', dirs.map(stall).join('\n'))
  .replace('<!--JUMP-->', dirs.map((d) => `      <a href="#${d.id}"><b>${esc(d.letter)}</b>${esc(d.name)}</a>`).join('\n'))
  .replace('/*DATA*/null', readFileSync(join(here, 'data.json'), 'utf8').trim());
for (const k of ['<!--STALLS-->', '<!--JUMP-->', '/*DATA*/']) if (page.includes(k)) throw new Error(`unfilled ${k}`);
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

const W = 390;
const H = 844;
const GX = 80;
const boards = {};
const notes = {
  title1: { x: 0, y: -300, text: 'מסך הבית · לוח זמנים מצומצם וחכם לפי תקופה', kind: 'title1', maxW: dirs.length * (W + GX) },
  howto: { x: dirs.length * (W + GX), y: 0, w: 320, size: 's', fill: 'gray', text: 'בכל לוח: Play כדי ללחוץ ולגרור. הלוח נפתח על השעה של עכשיו בירושלים. Tweaks: יום (ראש חודש, ערב שבת, מוצאי שבת, קידוש לבנה, חנוכה, ערב שבת חנוכה, עשרה בטבת), שעה קבועה ופלטה.' },
};
dirs.forEach((d, i) => {
  const x = i * (W + GX);
  boards[`${d.board}.dc.html`] = { x, y: 0, w: W, h: H, title: d.letter + ' · ' + d.name, is_interactive: true, radius: 36 };
  notes[`n${d.board}`] = { x, y: H + 40, w: W, size: 's', fill: 'orange', text: d.letter + ' · ' + d.name + ': ' + d.fit };
});
const canvas = {
  v: 3,
  createdOnFiles: { v: 1, at: '2026-11-08T08:00:00Z' },
  title: 'לוח זמנים חכם במסך הבית',
  launch: { view: 'canvas' },
  pages: [],
  boards,
  order: dirs.map((d) => `${d.board}.dc.html`),
  notes,
  designSystems: [],
};
writeFileSync(join(canvasDir, 'canvas.json'), JSON.stringify(canvas, null, 2) + '\n');
console.log('site + canvas assembled:', dirs.map((d) => d.board).join(', '));
