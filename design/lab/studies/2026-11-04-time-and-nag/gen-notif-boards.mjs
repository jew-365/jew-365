// Writes boards/notif/<Name>.html: one board per direction for the time left in a reminder, each a copy of
// notif-base.html with its `const STYLE` and title. The wording of every direction lives in dirText() of
// core/notif.js. Never edit the generated boards; edit notif-base.html, the core or this list and run it again.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const base = readFileSync(join(here, 'notif-base.html'), 'utf8');

export const NOTIF_DIRS = [
  ['NotifCombo', 'combo', 'השילוב המומלץ'],
  ['NotifDot', 'dot', 'נקודה צבעונית'],
  ['NotifMeter', 'meter', 'מד צבעוני'],
  ['NotifQuiet', 'quiet', 'מד שקט'],
  ['NotifWords', 'words', 'מילים במקום צבע'],
  ['NotifHourglass', 'hourglass', 'שעון חול'],
  ['NotifAccent', 'accent', 'צבע ההתראה בלבד'],
  ['NotifInTitle', 'inTitle', 'הזמן בכותרת'],
  ['NotifDeadline', 'deadline', 'רק שעת הסיום'],
  ['NotifPercent', 'percent', 'אחוז מהזמן'],
];

mkdirSync(join(here, 'boards', 'notif'), { recursive: true });
for (const [name, style, title] of NOTIF_DIRS) {
  const s = base.split('__STYLE__').join(style).split('__TITLE__').join('זמן בהתראה · ' + title);
  writeFileSync(join(here, 'boards', 'notif', `${name}.html`), s);
  console.log('notif board', name);
}
