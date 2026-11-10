// Writes the four direction boards from boards/HomeNow.html: each is a copy with its title and
// `const SCHED` changed (a to o; `none` in HomeNow). Never edit the generated boards by hand.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const now = readFileSync(join(here, 'boards', 'HomeNow.html'), 'utf8');
const variants = [
  { board: 'BoardCard', sched: 'a', title: 'לוח בכרטיס מתחת לקשת' },
  { board: 'BoardStrip', sched: 'b', title: 'לוח ברצועת הקשת' },
  { board: 'BoardTop', sched: 'c', title: 'לוח בראש האפליקציה' },
  { board: 'R3Curtain', sched: 'd', title: 'וילון שיורד מלמעלה' },
  { board: 'R3Island', sched: 'e', title: 'אי דינמי' },
  { board: 'R3Stack', sched: 'f', title: 'ערימת שכבות' },
  { board: 'R3Bento', sched: 'g', title: 'בנטו' },
  { board: 'R3Shul', sched: 'h', title: 'לוח בית הכנסת' },
  { board: 'R3Collapse', sched: 'i', title: 'כותרת שמתכווצת בגלילה' },
  { board: 'R3Ticker', sched: 'j', title: 'טיקר מתחלף' },
  { board: 'R3Wallet', sched: 'k', title: 'ארנק כרטיסים' },
  { board: 'R3Drawer', sched: 'l', title: 'מגירה מלמטה' },
  { board: 'R3Snap', sched: 'm', title: 'קרוסלת שכבות' },
  { board: 'R3Ribbon', sched: 'n', title: 'סרגל הזמן של היום' },
  { board: 'R3Flip', sched: 'o', title: 'כרטיס מתהפך' },
  { board: 'R4Bento', sched: 'p', title: 'בנטו בתוך הקשת', k: '156 / 216' },
  { board: 'R6Glance', sched: 'q', title: 'שורה אחת חכמה' },
  { board: 'R6Weather', sched: 'r', title: 'כרטיס זכוכית' },
  { board: 'R6Stack', sched: 's', title: 'ערימה חכמה' },
  { board: 'R6Live', sched: 't', title: 'הצ׳יפ החי' },
  { board: 'R6Week', sched: 'u', title: 'השבוע במבט' },
  { board: 'R6Arc', sched: 'v', title: 'הכול בתוך הקשת' },
  { board: 'R7Glass', sched: 'A', title: 'ערימה חכמה עם עכשיו' },
  { board: 'R7Split', sched: 'B', title: 'טבעת וכרטיס' },
  { board: 'R7Tone', sched: 'C', title: 'גוון התקופה' },
  { board: 'R7Dark', sched: 'D', title: 'ערימה כהה' },
  { board: 'R7Lanes', sched: 'E', title: 'שלוש שורות' },
  { board: 'R7Native', sched: 'F', title: 'מחוץ לאפליקציה' },
  { board: 'R8Tone', sched: 'G', title: 'גוון התקופה, קרוסלה חיה', k: '168 / 216' },
  { board: 'R8Pill', sched: 'H', title: 'גלולת התקופה', k: '160 / 216' },
  { board: 'R8Inset', sched: 'I', title: 'כרטיס בתוך השמיים', k: '176 / 216' },
  { board: 'R8NoArc', sched: 'J', title: 'בלי קשת' },
  { board: 'R8Sticky', sched: 'K', title: 'נשאר למעלה בגלילה', k: '168 / 216' },
];
for (const v of variants) {
  let out = now;
  for (const [from, to] of [
    ['<!--board title="היום · כמו באפליקציה"-->', '<!--board title="' + v.title + '"-->'],
    ["const SCHED = 'none';", "const SCHED = '" + v.sched + "';"],
    ...(v.k ? [['const K = 192 / 216;', 'const K = ' + v.k + ';']] : []),
  ]) {
    if (!out.includes(from)) throw new Error('HomeNow.html lost its marker: ' + from);
    out = out.replace(from, () => to);
  }
  writeFileSync(join(here, 'boards', v.board + '.html'), out);
  console.log('wrote boards/' + v.board + '.html');
}
