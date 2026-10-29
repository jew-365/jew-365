import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const now = readFileSync(join(here, 'boards', 'HomeNow.html'), 'utf8');

const variants = [
  { board: 'HomeEllipse', shape: 'ellipse', title: 'אליפסה · יום ולילה מחוברים' },
  { board: 'HomeCircle', shape: 'circle', title: 'עיגול · יום ולילה מחוברים' },
];

for (const v of variants) {
  const swaps = [
    ['<!--board title="היום · כמו באפליקציה"-->', '<!--board title="' + v.title + '"-->'],
    ["const SHAPE = 'now';", "const SHAPE = '" + v.shape + "';"],
  ];
  let out = now;
  for (const [from, to] of swaps) {
    if (!out.includes(from)) throw new Error('HomeNow.html lost its marker: ' + from);
    out = out.replace(from, () => to);
  }
  writeFileSync(join(here, 'boards', v.board + '.html'), out);
  console.log('wrote boards/' + v.board + '.html from boards/HomeNow.html');
}
