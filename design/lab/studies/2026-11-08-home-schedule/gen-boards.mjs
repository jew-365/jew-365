// Writes the four direction boards from boards/HomeNow.html: each is a copy with its title and
// `const SCHED` changed (a, b, c; `none` in HomeNow). Never edit the generated boards by hand.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const now = readFileSync(join(here, 'boards', 'HomeNow.html'), 'utf8');
const variants = [
  { board: 'BoardCard', sched: 'a', title: 'לוח בכרטיס מתחת לקשת' },
  { board: 'BoardStrip', sched: 'b', title: 'לוח ברצועת הקשת' },
  { board: 'BoardTop', sched: 'c', title: 'לוח בראש האפליקציה' },
];
for (const v of variants) {
  let out = now;
  for (const [from, to] of [
    ['<!--board title="היום · כמו באפליקציה"-->', '<!--board title="' + v.title + '"-->'],
    ["const SCHED = 'none';", "const SCHED = '" + v.sched + "';"],
  ]) {
    if (!out.includes(from)) throw new Error('HomeNow.html lost its marker: ' + from);
    out = out.replace(from, () => to);
  }
  writeFileSync(join(here, 'boards', v.board + '.html'), out);
  console.log('wrote boards/' + v.board + '.html');
}
