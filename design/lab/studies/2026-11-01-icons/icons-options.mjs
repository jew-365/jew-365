// Round 5 of the icon study (2026-11-01): the owner liked pack ב but not its siddur and prayer icons, so this file
// draws other options for them, in pack ב's style (48-unit box, colour roles of roles.css). SIDDUR_OPTIONS replace
// the `siddur` icon; PRAYER_OPTIONS replace the three prayers together, `shacharit`, `mincha` and `maariv`.
import { ICONS, c, crescent, flame, star } from './icons.mjs';

const current = (id) => ICONS.find((icon) => icon.id === id).draw;

// The three times of the prayers as a small sky motif placed at (x, y) with size s: sunrise, the sun of the afternoon,
// the moon and a star.
const sky = {
  shacharit: (x, y, s) => `
    <circle cx="${x}" cy="${y + s * 0.35}" r="${s * 0.95}" fill="${c('flame')}" opacity="0.3"/>
    <path d="M${x - s * 0.62},${y + s * 0.35}A${s * 0.62},${s * 0.62} 0 0 1 ${x + s * 0.62},${y + s * 0.35}Z" fill="${c('flame2')}"/>
    <path d="M${x},${y - s * 0.55}V${y - s * 0.85}M${x - s * 0.7},${y - s * 0.2}L${x - s * 0.92},${y - s * 0.42}M${x + s * 0.7},${y - s * 0.2}L${x + s * 0.92},${y - s * 0.42}" stroke="${c('flame2')}" stroke-width="${s * 0.16}" stroke-linecap="round"/>`,
  mincha: (x, y, s) => `
    <circle cx="${x}" cy="${y}" r="${s * 0.95}" fill="${c('flame')}" opacity="0.3"/>
    <circle cx="${x}" cy="${y}" r="${s * 0.6}" fill="${c('flame')}"/>
    <circle cx="${x}" cy="${y}" r="${s * 0.6}" fill="${c('flame2')}" opacity="0.45"/>`,
  maariv: (x, y, s) => `
    ${crescent(x, y, s * 0.72, x + s * 0.36, y - s * 0.26, s * 0.62, c('gold'))}
    ${star(x + s * 1.05, y - s * 0.55, s * 0.32, c('gold'))}`,
};

// An open siddur, its pages at `top`, `w` half-width, centred on x = 24.
const openSiddur = (top, w, h, magen = false) => {
  const l = 24 - w;
  const rr = 24 + w;
  const b = top + h;
  return `<path d="M${l - 1},${top + 2}V${b + 2}Q${24 - w / 2},${b - 1} 24,${b + 3}Q${24 + w / 2},${b - 1} ${rr + 1},${b + 2}V${top + 2}Z" fill="${c('ink')}"/>
    <path d="M${l},${top}Q${24 - w / 2},${top - 3} 24,${top + 1}V${b}Q${24 - w / 2},${b - 3.5} ${l},${b - 1}Z" fill="${c('paper')}"/>
    <path d="M${rr},${top}Q${24 + w / 2},${top - 3} 24,${top + 1}V${b}Q${24 + w / 2},${b - 3.5} ${rr},${b - 1}Z" fill="${c('white')}"/>
    <path d="M24,${top + 1}V${b}" stroke="${c('paper2')}" stroke-width="1"/>
    <g stroke="${c('line')}" stroke-width="1.3" stroke-linecap="round" fill="none">
      ${[0, 3.6, 7.2].map((o) => `<path d="M${l + 3},${top + 4.5 + o}Q${24 - w / 2},${top + 3.6 + o} ${24 - 3},${top + 5 + o}"/>`).join('')}
      ${magen ? '' : [0, 3.6, 7.2].map((o) => `<path d="M${24 + 3},${top + 5 + o}Q${24 + w / 2},${top + 3.6 + o} ${rr - 3},${top + 4.5 + o}"/>`).join('')}
    </g>
    ${magen ? `<path d="M${24 + w / 2},${top + 3.6}L${24 + w / 2 + 3.3},${top + 9.3}H${24 + w / 2 - 3.3}Z M${24 + w / 2},${top + 11.2}L${24 + w / 2 - 3.3},${top + 5.5}H${24 + w / 2 + 3.3}Z" stroke="${c('gold2')}" stroke-width="1.3" stroke-linejoin="round" fill="none"/>` : ''}`;
};

// A shtender (lectern): a slanted wooden top, a column and a base.
const shtender = (top) => `
  <path d="M7,${top}H41L38,${top + 4}H10Z" fill="${c('wood')}"/>
  <rect x="21.4" y="${top + 4}" width="5.2" height="${43 - top - 4}" fill="${c('wood2')}"/>
  <rect x="13" y="42" width="22" height="3.5" rx="1.75" fill="${c('wood')}"/>`;

// The Kotel: rows of large stones under `top`, each in one of three tones so the courses read apart.
const kotel = (top) => {
  const stones = [];
  for (let y = top, i = 0; y < 44; y += 5.4, i += 1) {
    const offset = i % 2 ? -4.5 : 0;
    for (let x = 3 + offset, j = 0; x < 45; x += 9, j += 1) {
      const x0 = Math.max(3, x);
      const x1 = Math.min(45, x + 8.2);
      const tone = ['gold', 'gold2', 'wood'][(i * 2 + j) % 3];
      if (x1 - x0 > 1) stones.push(`<rect x="${x0}" y="${y}" width="${(x1 - x0).toFixed(2)}" height="4.6" rx="1.2" fill="${c(tone)}"/>`);
    }
  }
  return stones.join('');
};

// A synagogue: a gabled front with a Magen David, an arched door and two windows.
const synagogue = `
  <path d="M8,44V23L24,12L40,23V44Z" fill="${c('paper')}" stroke="${c('paper2')}" stroke-width="1"/>
  <path d="M6,24L24,11.5L42,24" stroke="${c('ink')}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M24,16.4L26.6,20.9H21.4Z M24,22.4L21.4,17.9H26.6Z" stroke="${c('gold2')}" stroke-width="1.2" stroke-linejoin="round" fill="none"/>
  <path d="M19.5,44V36A4.5,4.5 0 0 1 28.5,36V44Z" fill="${c('wood')}"/>
  <path d="M11.5,34V29A2.5,2.5 0 0 1 16.5,29V34Z M31.5,34V29A2.5,2.5 0 0 1 36.5,29V34Z" fill="${c('ink2')}"/>
  <rect x="5" y="43.4" width="38" height="2.4" rx="1.2" fill="${c('ink')}"/>`;

// Hills under the sky of each prayer time.
const hills = `
  <path d="M3,36Q13,28 24,33Q34,27 45,32V45H3Z" fill="${c('leaf')}"/>
  <path d="M3,40Q16,34 28,39Q37,35 45,37V45H3Z" fill="${c('leaf2')}"/>`;

export const SIDDUR_OPTIONS = [
  { key: 'now', he: 'היום באפליקציה', idea: 'סידור סגור עם מגן דוד', draw: current('siddur') },
  {
    key: 'shtender',
    he: 'סידור פתוח על סטנדר',
    idea: 'סידור פתוח מונח על סטנדר מעץ',
    draw: () => `${openSiddur(10, 17, 16, true)}${shtender(30)}`,
  },
  {
    key: 'leather',
    he: 'סידור עור מעוטר',
    idea: 'כריכת עור עם פינות זהב, מגן דוד וסימנייה',
    draw: () => `
      <rect x="10.5" y="7" width="28" height="35" rx="2" fill="${c('paper')}" stroke="${c('paper2')}" stroke-width="1"/>
      <rect x="8.5" y="4.5" width="28" height="36" rx="3" fill="${c('ink')}"/>
      <rect x="8.5" y="4.5" width="5" height="36" rx="2.2" fill="${c('ink3')}"/>
      <path d="M36.5,10.5V4.5H30.5Z M36.5,34.5V40.5H30.5Z" fill="${c('gold')}"/>
      <rect x="16.5" y="8.5" width="16.5" height="28" rx="1.4" stroke="${c('gold2')}" stroke-width="1" fill="none"/>
      <path d="M24.75,14.5L30.4,24.3H19.1Z M24.75,27.5L19.1,17.7H30.4Z" fill="${c('gold')}" opacity="0.25"/>
      <path d="M24.75,14.5L30.4,24.3H19.1Z M24.75,27.5L19.1,17.7H30.4Z" stroke="${c('gold')}" stroke-width="1.6" stroke-linejoin="round" fill="none"/>
      <path d="M27.5,40V46L29.3,44.4L31.1,46V40Z" fill="${c('acc')}"/>`,
  },
  {
    key: 'open',
    he: 'סידור פתוח',
    idea: 'סידור פתוח, שורות תפילה ומגן דוד על הדף',
    draw: () => openSiddur(13, 19.5, 22, true),
  },
  {
    key: 'standing',
    he: 'סידור עומד',
    idea: 'סידור עומד בזווית, עם הגב ודפי הזהב',
    draw: () => `
      <path d="M9,10.5L14.5,8.5V43L9,41Z" fill="${c('ink3')}"/>
      <path d="M14.5,8.5L36.5,5.5L33.5,4L11.5,7Z" fill="${c('gold')}"/>
      <path d="M36.5,5.5V40L33.5,41.6V7.2Z" fill="${c('paper')}"/>
      <path d="M14.5,8.5L36.5,5.5V40L14.5,43Z" fill="${c('ink')}"/>
      <path d="M25.5,15.2L30.7,24.2H20.3Z M25.5,27.2L20.3,18.2H30.7Z" stroke="${c('gold')}" stroke-width="1.6" stroke-linejoin="round" fill="none"/>
      <path d="M18.2,33.6L32.8,31.6" stroke="${c('gold2')}" stroke-width="1.2" stroke-linecap="round"/>`,
  },
];

export const PRAYER_OPTIONS = [
  {
    key: 'now',
    he: 'היום באפליקציה',
    idea: 'טלית לשחרית, סידור פתוח עם שמש למנחה ועם ירח לערבית',
    draw: { shacharit: current('shacharit'), mincha: current('mincha'), maariv: current('maariv') },
  },
  {
    key: 'kotel',
    he: 'הכותל',
    idea: 'אבני הכותל, עם זריחה, שמש של אחר הצהריים או ירח מעליהן',
    draw: Object.fromEntries(
      [['shacharit', 24, 17, 10], ['mincha', 31, 12, 9], ['maariv', 22, 13, 10]].map(([id, x, y, s]) => [id, () => `${sky[id](x, y, s)}${kotel(23)}`]),
    ),
  },
  {
    key: 'shtender',
    he: 'סטנדר עם סידור',
    idea: 'סידור פתוח על סטנדר, ושמש או ירח לפי זמן התפילה',
    draw: Object.fromEntries(
      [['shacharit', 37, 9, 7], ['mincha', 38, 8.5, 6.5], ['maariv', 36, 9, 7]].map(([id, x, y, s]) => [
        id,
        () => `${sky[id](x, y, s)}${openSiddur(16, 15, 12)}${shtender(31)}`,
      ]),
    ),
  },
  {
    key: 'synagogue',
    he: 'בית כנסת',
    idea: 'בית כנסת עם מגן דוד, ושמש או ירח לפי זמן התפילה',
    draw: Object.fromEntries(
      [['shacharit', 38, 9, 6.5], ['mincha', 38.5, 8, 6], ['maariv', 37, 8.5, 6.5]].map(([id, x, y, s]) => [id, () => `${sky[id](x, y, s)}${synagogue}`]),
    ),
  },
  {
    key: 'sky',
    he: 'זמני היום',
    idea: 'נוף עם זריחה, שמש גבוהה, וירח וכוכבים',
    draw: Object.fromEntries(
      [['shacharit', 24, 27, 13], ['mincha', 30, 15, 12], ['maariv', 22, 16, 13]].map(([id, x, y, s]) => [id, () => `${sky[id](x, y, s)}${hills}`]),
    ),
  },
];
