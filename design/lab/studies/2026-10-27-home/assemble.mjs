import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dirs = JSON.parse(readFileSync(join(here, 'dirs.json'), 'utf8'));
const built = join(here, 'out', 'project');
const siteDir = join(here, 'out', 'site');
const siteBoards = join(siteDir, 'boards');
const canvasDir = join(here, 'out', 'canvas', 'project');
mkdirSync(canvasDir, { recursive: true });
mkdirSync(siteBoards, { recursive: true });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/></svg>';

for (const d of dirs) {
  const src = join(built, `${d.board}.dc.html`);
  if (!existsSync(src)) throw new Error(`missing build for ${d.board}`);
  for (const k of ['id', 'letter', 'name', 'board', 'idea', 'fit', 'note']) if (!d[k]) throw new Error(`${d.board}: missing ${k}`);
  if (!Array.isArray(d.try) || d.try.length < 3) throw new Error(`${d.board}: needs 3+ try items`);
  copyFileSync(src, join(siteBoards, `${d.board}.dc.html`));
  copyFileSync(src, join(canvasDir, `${d.board}.dc.html`));
}
copyFileSync(join(built, 'support.js'), join(siteBoards, 'support.js'));

const stall = (d) => `  <section class="stall" id="${d.id}" aria-labelledby="h-${d.id}">
    <div class="info">
      <div class="head"><span class="letter" aria-hidden="true">${esc(d.letter)}</span><span class="badge${d.isNew ? '' : ' kept'}">${d.isNew ? 'חדש' : 'מהסבב הקודם, משודרג'}</span></div>
      <h2 id="h-${d.id}">${esc(d.name)}</h2>
      <p class="idea">${esc(d.idea)}</p>
      <ul class="try">
${d.try.map((t) => `        <li>${esc(t)}</li>`).join('\n')}
      </ul>
      <p class="fit"><b>מתאים אם</b> ${esc(d.fit)}</p>
    </div>
    <div class="device" data-id="${d.id}" data-label="${esc(d.letter + ' · ' + d.name)}">
      <div class="screen"><iframe data-src="boards/${d.board}.dc.html" title="${esc('כיוון ' + d.letter + ' · ' + d.name)}" loading="lazy"></iframe></div>
      <button class="close">סגירה</button>
      <div class="actions">
        <button class="pick" aria-pressed="false"><span class="rank" aria-hidden="true"></span>${HEART}<span class="lbl">הכי יפה בעיני</span></button>
        <button class="ghost full">מסך מלא</button>
      </div>
    </div>
  </section>
`;

let page = readFileSync(join(here, 'site-template.html'), 'utf8');
page = page
  .replace('<!--STALLS-->', dirs.map(stall).join('\n'))
  .replace('<!--JUMP-->', dirs.map((d) => `      <a href="#${d.id}"><b>${esc(d.letter)}</b>${esc(d.name)}</a>`).join('\n'))
  .replace('/*LABELS*/', JSON.stringify(Object.fromEntries(dirs.map((d) => [d.id, d.letter + ' · ' + d.name]))))
  .replace('/*DATA*/null', readFileSync(join(here, 'data.json'), 'utf8').trim());
for (const k of ['<!--STALLS-->', '<!--JUMP-->', '/*LABELS*/', '/*DATA*/']) if (page.includes(k)) throw new Error(`unfilled ${k}`);
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
const ROW = H + 520;
const boards = {};
const notes = {
  title1: { x: 0, y: -300, text: 'מסך הבית · סבב 3 · חי ואינטראקטיבי', kind: 'title1', maxW: 5 * (W + GX) },
  five: { x: 5 * (W + GX), y: 0, w: 320, size: 's', fill: 'blue', text: 'בכל לוח חמשת הדברים: זמני היום · הודעות אישיות וכלליות · מה פתוח עכשיו, מתי התחיל ומתי נגמר · מה עשית היום · מה פספסת היום.' },
  howto: { x: 5 * (W + GX), y: 280, w: 320, size: 's', fill: 'gray', text: 'בכל לוח: Play כדי ללחוץ ולגרור. הלוח נפתח על השעה של עכשיו בירושלים, עם זמנים, תאריך עברי והודעות אמיתיים להיום. גוררים בו את הזמן במחווה שלו, ו"חזרה לעכשיו" מחזיר. Tweaks: שעה קבועה, פלטה (זהב · ורוד · לילה), טקסט גדול ושם. בשבת ובחג מסך השבת, עם הצצה ליום חול.' },
};
dirs.forEach((d, i) => {
  const x = (i % 5) * (W + GX);
  const y = Math.floor(i / 5) * ROW;
  boards[`${d.board}.dc.html`] = { x, y, w: W, h: H, title: d.letter + ' · ' + d.name, is_interactive: true, radius: 36 };
  notes[`n${d.board}`] = { x, y: y + H + 40, w: W, size: 's', fill: 'orange', text: d.letter + ' · ' + d.name + ': ' + d.note };
});
const canvas = {
  v: 3,
  createdOnFiles: { v: 1, at: '2026-10-27T08:00:00Z' },
  title: 'מסך בית חדש — כיוונים',
  launch: { view: 'canvas' },
  pages: [],
  boards,
  order: dirs.map((d) => `${d.board}.dc.html`),
  notes,
  designSystems: [],
};
writeFileSync(join(canvasDir, 'canvas.json'), JSON.stringify(canvas, null, 2) + '\n');
console.log('site + canvas assembled:', dirs.map((d) => d.board).join(', '));
