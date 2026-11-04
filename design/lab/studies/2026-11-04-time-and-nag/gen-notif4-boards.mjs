// Writes boards/notif4/<Name>.html: round 4's boards (the owner's question of 2026-11-04 on the room inside a
// notification), each a copy of notif4-base.html with its `const STYLE` and title. The wording of every direction lives
// in dirText() of core/notif4.js. Never edit the generated boards; edit notif4-base.html, the core or this list.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const base = readFileSync(join(here, 'notif4-base.html'), 'utf8');

export const NOTIF4_DIRS = [
  ['NotifR4Now', 'r4now', 'סבב 4 · היום'],
  ['NotifR4Body', 'r4body', 'סבב 4 · שורת הזמן בתוכן'],
  ['NotifR4Short', 'r4short', 'סבב 4 · בלי לחזור על השם'],
  ['NotifR4Both', 'r4both', 'סבב 4 · שתיהן יחד'],
  ['NotifR4Bar', 'r4bar', 'סבב 4 · עם פס זמן'],
  ['NotifR4Build', 'r4build', 'סבב 4 · עם בילד'],
];

mkdirSync(join(here, 'boards', 'notif4'), { recursive: true });
for (const [name, style, title] of NOTIF4_DIRS) {
  const s = base.split('__STYLE__').join(style).split('__TITLE__').join('תוכן ההתראה · ' + title);
  writeFileSync(join(here, 'boards', 'notif4', `${name}.html`), s);
  console.log('notif4 board', name);
}
