// Round 7 of the icon study (2026-11-01), on the owner's word: a new icon for Kriat Shema of Shacharit (a mezuzah does
// not fit it), a new one for Birchot HaShachar, more options for Ushpizin and for the meals, and an icon of its own for
// every text of the siddur tab's general group, which all show the group's Torah scroll today. Each drawing is in
// pack ב's style: a 48-unit box whose every colour is a role of roles.css, so it follows every palette's tones.
import { ICONS, c, r, crescent, star, flame } from './icons.mjs';

const today = (id) => ICONS.find((icon) => icon.id === id).draw;

// Hebrew letters as ink strokes in an s-unit box from (x, y): enough for שמע and the enlarged ע and ד of the Shema.
const LETTERS = {
  ש: (x, y, s) =>
    `M${r(x)},${r(y)}V${r(y + s * 0.6)}Q${r(x)},${r(y + s)} ${r(x + s * 0.4)},${r(y + s)}H${r(x + s * 0.6)}Q${r(x + s)},${r(y + s)} ${r(x + s)},${r(y + s * 0.6)}V${r(y)}M${r(x + s * 0.5)},${r(y + s * 0.08)}V${r(y + s * 0.95)}`,
  מ: (x, y, s) =>
    `M${r(x + s * 0.16)},${r(y)}H${r(x + s * 0.68)}Q${r(x + s)},${r(y)} ${r(x + s)},${r(y + s * 0.32)}V${r(y + s)}H${r(x + s * 0.46)}M${r(x + s * 0.02)},${r(y - s * 0.08)}L${r(x + s * 0.18)},${r(y + s * 0.1)}V${r(y + s * 0.96)}`,
  ע: (x, y, s) =>
    `M${r(x + s)},${r(y)}V${r(y + s * 0.58)}Q${r(x + s)},${r(y + s)} ${r(x + s * 0.5)},${r(y + s)}H${r(x)}M${r(x + s * 0.12)},${r(y)}Q${r(x + s * 0.24)},${r(y + s * 0.56)} ${r(x + s)},${r(y + s * 0.62)}`,
  ד: (x, y, s) => `M${r(x)},${r(y)}H${r(x + s)}M${r(x + s * 0.84)},${r(y)}V${r(y + s)}`,
};
const letters = (list, width = 2.1) =>
  `<path d="${list.map(([ch, x, y, s]) => LETTERS[ch](x, y, s)).join('')}" stroke="${c('ink')}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
// A sheet of parchment from top `t` to bottom `b`, its long edges bowed a little.
const klaf = (x1, t, x2, b) =>
  `<path d="M${x1},${t}Q24,${t - 2.4} ${x2},${t}V${b}Q24,${b + 2.4} ${x1},${b}Z" fill="${c('paper')}" stroke="${c('paper2')}" stroke-width="1.2"/>`;
const textLines = (rows) =>
  `<path d="${rows.map(([x1, x2, y]) => `M${x1},${y}H${x2}`).join('')}" stroke="${c('line')}" stroke-width="1.4" stroke-linecap="round"/>`;
// The word שמע read right to left, its ע enlarged as in the Torah, standing on the baseline `base`.
const shema = (right, base, s, big = 1.2) => {
  const gap = s * 0.2;
  const b = s * big;
  return letters([
    ['ש', right - s, base - s, s],
    ['מ', right - 2 * s - gap, base - s, s],
    ['ע', right - 2 * s - 2 * gap - b, base - b, b],
  ]);
};
// A rising sun: a glow, the half disc on the line y and five rays.
const risingSun = (x, y, R, rays = true) => `
  <circle cx="${x}" cy="${y}" r="${r(R * 1.55)}" fill="${c('flame')}" opacity="0.3"/>
  <path d="M${r(x - R)},${y}A${R},${R} 0 0 1 ${r(x + R)},${y}Z" fill="${c('flame2')}"/>
  ${rays ? `<path d="${[-150, -120, -90, -60, -30].map((deg) => { const a = (deg * Math.PI) / 180; return `M${r(x + (R + 2.2) * Math.cos(a))},${r(y + (R + 2.2) * Math.sin(a))}L${r(x + (R + 5.2) * Math.cos(a))},${r(y + (R + 5.2) * Math.sin(a))}`; }).join('')}" stroke="${c('flame2')}" stroke-width="1.7" stroke-linecap="round"/>` : ''}`;
// The sukkah of today's drawing, reused: schach of leaves over a wooden frame from x 7 to 41.
const schach = (y) =>
  [[10.5, y - 2, 6.5, 4.2, 'leaf'], [20, y - 3.9, 7.5, 4.8, 'leaf2'], [29, y - 3.5, 7.5, 4.6, 'leaf'], [38, y - 1.9, 6.5, 4.2, 'leaf2'], [24.5, y - 1.1, 6, 2.8, 'leaf']]
    .map(([cx, cy, rx, ry, role]) => `<ellipse cx="${cx}" cy="${r(cy)}" rx="${rx}" ry="${ry}" fill="${c(role)}"/>`)
    .join('');
const sukkahFrame = (y, walls = true) => `
  ${walls ? `<rect x="9.5" y="${y + 2.5}" width="29" height="${41.5 - y}" fill="${c('paper')}"/>` : ''}
  <rect x="7" y="${y + 1}" width="3.4" height="${42.5 - y}" rx="1" fill="${c('wood')}"/>
  <rect x="37.6" y="${y + 1}" width="3.4" height="${42.5 - y}" rx="1" fill="${c('wood')}"/>
  <rect x="4" y="42" width="40" height="3.4" rx="1.7" fill="${c('wood2')}"/>
  <rect x="5.5" y="${y}" width="37" height="2.8" rx="1" fill="${c('wood')}"/>
  ${schach(y)}`;
// An apple, its body centred on (x, y) at scale k.
const apple = (x, y, k = 1) => {
  const p = (dx, dy) => `${r(x + dx * k)},${r(y + dy * k)}`;
  return `<path d="M${p(0, -10)}C${p(-4, -14)} ${p(-15, -13)} ${p(-15, 0)}C${p(-15, 10)} ${p(-8, 18)} ${p(-3, 17)}C${p(-1, 16.5)} ${p(1, 16.5)} ${p(3, 17)}C${p(8, 18)} ${p(15, 10)} ${p(15, 0)}C${p(15, -13)} ${p(4, -14)} ${p(0, -10)}Z" fill="${c('wine')}"/>
    <ellipse cx="${r(x - 7.5 * k)}" cy="${r(y - 3 * k)}" rx="${r(2.6 * k)}" ry="${r(4.4 * k)}" transform="rotate(20 ${r(x - 7.5 * k)} ${r(y - 3 * k)})" fill="${c('white')}" opacity="0.35"/>
    <path d="M${p(0, -10)}Q${p(0, -15)} ${p(2.5, -18.5)}" stroke="${c('wood2')}" stroke-width="${r(1.8 * k)}" stroke-linecap="round" fill="none"/>
    <path d="M${p(2, -14.5)}Q${p(8, -20.5)} ${p(14, -17.5)}Q${p(9, -12)} ${p(2, -14.5)}Z" fill="${c('leaf')}"/>`;
};

const SHEMA = [
  { key: 'today', he: 'היום: מזוזה', idea: 'המזוזה של היום, להשוואה', draw: today('shema') },
  {
    key: 'klaf',
    he: 'שמע על קלף',
    idea: 'המילה שמע כתובה על קלף, עם ע׳ גדולה כמו בספר התורה, ושורות הפסוק מתחתיה',
    draw: () => `${klaf(7, 10, 41, 38)}${shema(38.5, 25.5, 8)}${textLines([[11, 37, 31], [17, 37, 34.8]])}`,
  },
  {
    key: 'ad',
    he: 'ע׳ וד׳ רבתי',
    idea: 'האותיות הגדולות של שמע ישראל, ע׳ של שמע וד׳ של אחד, בשורה של הפסוק על קלף',
    draw: () =>
      `${klaf(7, 9, 41, 39)}${textLines([[11, 37, 13.4], [11, 37, 33], [16, 37, 36.6]])}${letters([['ע', 28.5, 17.4, 9.6], ['ד', 9.8, 18, 9]], 2.3)}${textLines([[21.6, 26.6, 26.2]])}`,
  },
  {
    key: 'crown',
    he: 'כתר מלכות',
    idea: 'כתר מעל המילה שמע: קבלת עול מלכות שמיים',
    draw: () => `
      <path d="M13.5,18L11.2,7L18,11.8L24,4.5L30,11.8L36.8,7L34.5,18Z" fill="${c('gold')}"/>
      <rect x="13" y="15.6" width="22" height="4.2" rx="1.6" fill="${c('gold2')}"/>
      <circle cx="11.2" cy="7" r="1.7" fill="${c('gold2')}"/><circle cx="24" cy="4.5" r="1.7" fill="${c('gold2')}"/><circle cx="36.8" cy="7" r="1.7" fill="${c('gold2')}"/>
      <circle cx="24" cy="17.7" r="1.3" fill="${c('wine')}"/>
      ${klaf(8, 24, 40, 42)}${shema(37, 36, 7.4)}`,
  },
  {
    key: 'sunrise',
    he: 'שמע בזריחה',
    idea: 'השמש עולה מאחורי הקלף: קריאת שמע של הבוקר',
    draw: () => `${risingSun(24, 17, 7)}${klaf(8, 18, 40, 42)}${shema(37.5, 32, 7.8)}${textLines([[12, 36, 37.4]])}`,
  },
];

// A rooster facing right: tail, body and neck in one, wing, comb, wattle, beak, eye and legs.
const rooster = (body = 'acc', wing = 'acc2', tail = ['ink', 'ink2', 'acc2']) => `
  <path d="M15,30C7,28 4,19 6.5,11C9,19 13,22 19,24Z" fill="${c(tail[0])}"/>
  <path d="M16,32.5C8.5,33.5 3.6,27.5 3.5,20.5C7,26 11.5,27.6 18,27.4Z" fill="${c(tail[1])}"/>
  <path d="M15.5,27C11,19.5 12,11.5 15.8,7C16,14.5 18,19 21.5,22Z" fill="${c(tail[2])}"/>
  <path d="M14,27.5C14,20.5 20.5,18.6 26.4,20.4L28.6,13.4C29.2,8.6 36.6,8.4 36.8,13.8C37,18.4 34.6,21.8 34.6,27.4C34.6,35 29,38.6 23,38.6C17.6,38.6 14,34 14,27.5Z" fill="${c(body)}"/>
  <path d="M17.6,28C19.6,22.8 27,22.6 30.2,26.8C28.4,32.2 21.6,33.8 17.6,28Z" fill="${c(wing)}"/>
  <path d="M29.4,10.2Q28.8,5.8 31.4,6.6Q32.4,3.4 34.6,5.8Q37.2,4.6 37,9.4Z" fill="${c('wine')}"/>
  <path d="M36.6,12.4L41,14.2L36.6,15.8Z" fill="${c('gold2')}"/>
  <ellipse cx="35.6" cy="18" rx="1.5" ry="2.3" fill="${c('wine')}"/>
  <circle cx="33.6" cy="12.6" r="1.1" fill="${c('ink3')}"/>
  <path d="M21,38V43.6M27.4,38V43.6M18,43.6H24M24.4,43.6H30.4" stroke="${c('gold2')}" stroke-width="1.8" stroke-linecap="round"/>`;

const BRACHOT = [
  { key: 'today', he: 'היום: נטלה', idea: 'הנטלה של היום, להשוואה', draw: today('brachot') },
  { key: 'rooster', he: 'תרנגול', idea: 'תרנגול: ״הנותן לשכוי בינה להבחין בין יום ובין לילה״, הברכה הראשונה', draw: () => rooster() },
  {
    key: 'roosterSun',
    he: 'תרנגול בזריחה',
    idea: 'התרנגול על רקע השמש העולה',
    draw: () => `
      <circle cx="24" cy="24" r="19.5" fill="${c('flame')}" opacity="0.45"/>
      <circle cx="26" cy="22" r="12" fill="${c('flame2')}" opacity="0.55"/>
      ${rooster('ink', 'ink2', ['ink3', 'ink2', 'ink3'])}`,
  },
  {
    key: 'window',
    he: 'חלון של שחר',
    idea: 'חלון מקושת והשמש עולה בו מעל ההרים',
    draw: () => `
      <path d="M9.5,43V20Q9.5,5.5 24,5.5Q38.5,5.5 38.5,20V43Z" fill="${c('wood')}"/>
      <path d="M13,42V20.4Q13,9 24,9Q35,9 35,20.4V42Z" fill="${c('paper')}"/>
      <circle cx="24" cy="33" r="9.6" fill="${c('flame')}" opacity="0.4"/>
      <path d="M17.4,33A6.6,6.6 0 0 1 30.6,33Z" fill="${c('flame2')}"/>
      <path d="M13,42V35.4Q18.6,30.8 24,34Q29.4,30.6 35,35.2V42Z" fill="${c('leaf')}"/>
      <path d="M24,9V42M13,22.6H35" stroke="${c('wood')}" stroke-width="1.8"/>
      <rect x="6.5" y="41.6" width="35" height="3.6" rx="1.6" fill="${c('wood2')}"/>`,
  },
  {
    key: 'dawn',
    he: 'עלות השחר',
    idea: 'השמש עולה בין ההרים וכוכב השחר עוד מאיר',
    draw: () => `
      ${risingSun(24, 31, 8.4)}
      ${star(38.5, 9.5, 3.4, c('gold'))}
      ${star(9.5, 12.5, 1.8, c('gold'))}
      <path d="M3,44V38.5Q11.5,28.6 21.6,35.4Q31,27.8 45,37V44Z" fill="${c('leaf')}"/>
      <path d="M3,44V41.6Q15,35.4 27,41Q36,37.4 45,41.4V44Z" fill="${c('leaf2')}"/>`,
  },
];

const USHPIZIN = [
  { key: 'today', he: 'היום: סוכה', idea: 'הסוכה של היום, להשוואה', draw: today('sukkah') },
  {
    key: 'table',
    he: 'שולחן וכיסא לאורח',
    idea: 'בתוך הסוכה שולחן ערוך עם נרות וכיסא פנוי שמחכה לאושפיז',
    draw: () => `
      ${sukkahFrame(15.6)}
      <path d="M11,31H27.4L26.6,36.4H11.8Z" fill="${c('white')}" stroke="${c('paper2')}" stroke-width="1"/>
      <path d="M13.4,36.4V42M25,36.4V42" stroke="${c('wood2')}" stroke-width="1.8" stroke-linecap="round"/>
      <rect x="15" y="25.4" width="1.8" height="5.6" rx="0.6" fill="${c('white')}" stroke="${c('paper2')}" stroke-width="0.8"/>
      <rect x="21.6" y="25.4" width="1.8" height="5.6" rx="0.6" fill="${c('white')}" stroke="${c('paper2')}" stroke-width="0.8"/>
      ${flame(15.9, 20.2, 5)}${flame(22.5, 20.2, 5)}
      <rect x="33" y="24.4" width="2.6" height="17.6" rx="1.2" fill="${c('wood2')}"/>
      <rect x="28.6" y="32.4" width="7" height="2.8" rx="1" fill="${c('wood')}"/>
      <path d="M29.8,35V42" stroke="${c('wood2')}" stroke-width="1.8" stroke-linecap="round"/>`,
  },
  {
    key: 'stars',
    he: 'שבעה כוכבים',
    idea: 'שבעה כוכבים מעל הסוכה בלילה, אחד לכל אושפיז',
    draw: () => {
      const stars = Array.from({ length: 7 }, (_, i) => {
        const a = ((-162 + i * 24) * Math.PI) / 180;
        return star(r(24 + 18 * Math.cos(a)), r(23 + 17.5 * Math.sin(a)), i === 3 ? 3.2 : 2.4, c('gold'));
      }).join('');
      return `${stars}
        <rect x="9.5" y="27.5" width="29" height="14.5" fill="${c('paper')}"/>
        <rect x="7" y="25" width="3.4" height="18" rx="1" fill="${c('wood')}"/>
        <rect x="37.6" y="25" width="3.4" height="18" rx="1" fill="${c('wood')}"/>
        <rect x="4" y="42" width="40" height="3.4" rx="1.7" fill="${c('wood2')}"/>
        <rect x="5.5" y="24.6" width="37" height="2.8" rx="1" fill="${c('wood')}"/>
        ${schach(24.6)}
        <path d="M17,27.4V31M31,27.4V30.4" stroke="${c('wood2')}" stroke-width="1"/>
        <circle cx="17" cy="33" r="2.2" fill="${c('wine')}"/><circle cx="31" cy="32.4" r="2.2" fill="${c('gold')}"/>`;
    },
  },
  {
    key: 'plaque',
    he: 'שלט אושפיזין',
    idea: 'שלט האושפיזין שתולים בסוכה: מסגרת מקושתת, שבעה עיגולים לשבעת האושפיזין ומגן דוד',
    draw: () => {
      const dots = Array.from({ length: 7 }, (_, i) => {
        const a = ((-180 + i * 30) * Math.PI) / 180;
        return `<circle cx="${r(24 + 7.6 * Math.cos(a))}" cy="${r(25 + 7.6 * Math.sin(a))}" r="1.6" fill="${c('acc')}"/>`;
      }).join('');
      return `
        <path d="M24,4L13.6,15M24,4L34.4,15" stroke="${c('wood2')}" stroke-width="1.2" stroke-linecap="round"/>
        <circle cx="24" cy="4" r="1.5" fill="${c('wood2')}"/>
        <path d="M10.5,22Q10.5,13 24,11Q37.5,13 37.5,22V38.6Q37.5,41.6 34.5,41.6H13.5Q10.5,41.6 10.5,38.6Z" fill="${c('gold')}"/>
        <path d="M13.6,22.6Q13.6,16 24,14.4Q34.4,16 34.4,22.6V37.4Q34.4,38.6 33.2,38.6H14.8Q13.6,38.6 13.6,37.4Z" fill="${c('paper')}"/>
        ${dots}
        <path d="M24,25.8L27.6,32H20.4Z M24,34L20.4,27.8H27.6Z" stroke="${c('ink')}" stroke-width="1.3" stroke-linejoin="round" fill="none"/>
        <circle cx="16" cy="44" r="1.6" fill="${c('wine')}"/><circle cx="24" cy="44.6" r="1.6" fill="${c('gold2')}"/><circle cx="32" cy="44" r="1.6" fill="${c('wine')}"/>
        <path d="M16,41.6V42.4M24,41.6V43M32,41.6V42.4" stroke="${c('wood2')}" stroke-width="1"/>`;
    },
  },
  {
    key: 'species',
    he: 'ארבעת המינים',
    idea: 'לולב, הדסים, ערבות ואתרוג',
    draw: () => {
      const hadas = [14, 18.5, 23, 27.5, 32]
        .map((y, i) => [-1, 1].map((side) => `<ellipse cx="${r(29.6 + side * 2.1 - i * 0.3)}" cy="${y}" rx="1.4" ry="2.5" transform="rotate(${side * 32} ${r(29.6 + side * 2.1 - i * 0.3)} ${y})" fill="${c('leaf')}"/>`).join(''))
        .join('');
      const arava = [12, 17, 22, 27]
        .map((y, i) => [-1, 1].map((side) => `<ellipse cx="${r(18.4 + side * 1.9 + i * 0.25)}" cy="${y}" rx="0.95" ry="3.6" transform="rotate(${side * 22} ${r(18.4 + side * 1.9 + i * 0.25)} ${y})" fill="${c('leaf2')}"/>`).join(''))
        .join('');
      return `
        <path d="M29.6,11V38M18.4,9.6V38" stroke="${c('wood2')}" stroke-width="1" stroke-linecap="round"/>
        ${arava}${hadas}
        <path d="M24,3Q27.2,14 26.6,31L24,42L21.4,31Q20.8,14 24,3Z" fill="${c('leaf2')}"/>
        <path d="M24,6V40" stroke="${c('leaf')}" stroke-width="0.9"/>
        <rect x="19.4" y="32.4" width="11.6" height="3.2" rx="1.2" fill="${c('wood')}"/>
        <ellipse cx="36.4" cy="37" rx="6.6" ry="5.2" transform="rotate(-24 36.4 37)" fill="${c('gold')}"/>
        <ellipse cx="34.2" cy="35.6" rx="2" ry="1.2" transform="rotate(-24 34.2 35.6)" fill="${c('white')}" opacity="0.45"/>
        <path d="M41.6,33.2L43.4,31.6" stroke="${c('wood2')}" stroke-width="1.4" stroke-linecap="round"/>`;
    },
  },
  {
    key: 'door',
    he: 'סוכה מוארת',
    idea: 'פתח הסוכה מואר ופנס תלוי מעליו: האורחים מוזמנים להיכנס',
    draw: () => `
      ${sukkahFrame(15.6)}
      <rect x="18.6" y="26" width="10.8" height="16" rx="1" fill="${c('flame2')}"/>
      <rect x="20.2" y="27.6" width="7.6" height="14.4" fill="${c('flame')}"/>
      <path d="M24,18.4V21" stroke="${c('wood2')}" stroke-width="1"/>
      <rect x="21.6" y="21" width="4.8" height="4" rx="1" fill="${c('gold2')}"/>
      <path d="M12.6,24.6L15.4,24.6M32.6,24.6L35.4,24.6" stroke="${c('wood2')}" stroke-width="1"/>
      <circle cx="14" cy="27.2" r="2.3" fill="${c('wine')}"/><circle cx="34" cy="27.2" r="2.3" fill="${c('gold')}"/>`,
  },
];

// A plate seen from above with a loaf on it.
const plate = () => `
  <circle cx="24" cy="25" r="14.4" fill="${c('metal')}" stroke="${c('metal2')}" stroke-width="1.2"/>
  <circle cx="24" cy="25" r="10" fill="${c('white')}" stroke="${c('metal2')}" stroke-width="0.8"/>`;
// A braided challah centred on (x, y) at scale k.
const challah = (x, y, k = 1) => {
  const P = (dx, dy) => [r(x + dx * k), r(y + dy * k)];
  const [bx, by] = P(0, 1);
  return `<ellipse cx="${bx}" cy="${by}" rx="${r(19 * k)}" ry="${r(7.6 * k)}" fill="${c('gold2')}"/>
    ${[[-12.5, -1, -28], [-4.8, -3.4, -28], [3.4, -3.4, 28], [11.6, -1, 28]].map(([dx, dy, a]) => { const [cx, cy] = P(dx, dy); return `<ellipse cx="${cx}" cy="${cy}" rx="${r(5.4 * k)}" ry="${r(7.4 * k)}" transform="rotate(${a} ${cx} ${cy})" fill="${c('gold')}"/>`; }).join('')}
    ${[[-13.6, -3.6], [-5.6, -6.6], [2.4, -6.6], [10.4, -3.6]].map(([dx, dy]) => { const [cx, cy] = P(dx, dy); return `<ellipse cx="${cx}" cy="${cy}" rx="${r(2 * k)}" ry="${r(1.2 * k)}" fill="${c('white')}" opacity="0.45"/>`; }).join('')}`;
};
// Wheat and a bunch of grapes: the grain and the vine of the seven species.
const wheatAndGrapes = () => {
  const grains = [10, 14, 18, 22]
    .map((y) => [-1, 1].map((side) => `<ellipse cx="${r(15.6 + side * 2.1)}" cy="${y}" rx="1.7" ry="3.1" transform="rotate(${side * 28} ${r(15.6 + side * 2.1)} ${y})" fill="${c('gold')}"/>`).join(''))
    .join('');
  const grapes = [[28, 23], [33, 23], [38, 23], [30.5, 27.4], [35.5, 27.4], [33, 31.8], [30.5, 36], [35.5, 36.2], [33, 40.2]].slice(0, 7);
  return `
    <path d="M15.6,44Q15.4,26 15.8,7" stroke="${c('gold2')}" stroke-width="1.6" stroke-linecap="round" fill="none"/>
    <ellipse cx="15.8" cy="6.6" rx="1.4" ry="2.6" fill="${c('gold')}"/>
    ${grains}
    <path d="M33,19Q33,15 35.6,12.6" stroke="${c('wood2')}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    <path d="M34,14.8Q37.4,8.6 43.4,10.4Q41,16.6 34,14.8Z" fill="${c('leaf')}"/>
    ${grapes.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.9" fill="${c('wine')}"/>`).join('')}
    ${grapes.map(([x, y]) => `<circle cx="${r(x - 0.9)}" cy="${r(y - 0.9)}" r="0.8" fill="${c('white')}" opacity="0.5"/>`).join('')}`;
};
// A glass of water beside an apple: the blessing after water and fruit outside the seven species.
const waterAndApple = () => `
  <path d="M25.5,10H41.5L39.6,41.4Q33.5,43.2 27.4,41.4Z" fill="${c('white')}" stroke="${c('metal2')}" stroke-width="1.2" stroke-linejoin="round"/>
  <path d="M26.6,20.4H40.4L39.6,41.4Q33.5,43.2 27.4,41.4Z" fill="${c('water')}"/>
  <rect x="28.4" y="13" width="1.8" height="25" rx="0.9" fill="${c('white')}" opacity="0.7"/>
  ${apple(16.6, 30, 0.72)}`;

const MEALS = [
  { key: 'today', he: 'היום: חלה', idea: 'החלה של היום, להשוואה', draw: today('meals') },
  {
    key: 'plate',
    he: 'צלחת ערוכה',
    idea: 'צלחת עם לחם, מזלג וסכין',
    draw: () => `
      ${plate()}
      <ellipse cx="24" cy="25" rx="6.4" ry="4.4" fill="${c('gold')}"/>
      <path d="M20.6,23.4Q22,22 23.2,23.8M24.4,23.2Q25.8,21.8 27,23.6" stroke="${c('gold2')}" stroke-width="1" stroke-linecap="round" fill="none"/>
      <path d="M4.6,8V14.8M6.8,8V14.8M9,8V14.8M4.6,14.8Q6.8,18.4 9,14.8M6.8,17V41" stroke="${c('metal2')}" stroke-width="1.7" stroke-linecap="round" fill="none"/>
      <path d="M40.6,8Q44.4,13 43.4,23H40.6Z" fill="${c('metal2')}"/>
      <rect x="40.4" y="22.6" width="3.2" height="18.6" rx="1.6" fill="${c('metal2')}"/>`,
  },
  {
    key: 'breadSalt',
    he: 'לחם ומלח',
    idea: 'כיכר לחם על קרש וקערית מלח: המוציא',
    draw: () => `
      <rect x="3" y="36" width="31" height="5" rx="2.5" fill="${c('wood')}"/>
      <ellipse cx="18.4" cy="29" rx="14.4" ry="8.6" fill="${c('gold2')}"/>
      <ellipse cx="18.4" cy="27.4" rx="13.4" ry="7.4" fill="${c('gold')}"/>
      <path d="M10,26Q12.4,23.2 14.6,26.4M16.4,24.6Q18.8,21.8 21,25M22.8,26Q25.2,23.2 27.4,26.4" stroke="${c('gold2')}" stroke-width="1.3" stroke-linecap="round" fill="none"/>
      <ellipse cx="13" cy="24.6" rx="3" ry="1.4" fill="${c('white')}" opacity="0.4"/>
      <path d="M33.6,33H45Q44.6,41.4 39.3,41.4Q34,41.4 33.6,33Z" fill="${c('metal2')}"/>
      <path d="M34.6,33Q39.3,26.6 44,33Z" fill="${c('white')}" stroke="${c('paper2')}" stroke-width="0.9"/>`,
  },
  {
    key: 'challahCup',
    he: 'חלה וגביע',
    idea: 'חלה קלועה וגביע יין של ברכה',
    draw: () => `
      <path d="M6.5,6.5H19.5L18.4,17.4Q13,21.6 7.6,17.4Z" fill="${c('gold')}"/>
      <ellipse cx="13" cy="7.2" rx="6.4" ry="1.4" fill="${c('wine')}"/>
      <rect x="12" y="19.4" width="2" height="8" fill="${c('gold2')}"/>
      <path d="M8.4,30H17.6L16,27.4H10Z" fill="${c('gold2')}"/>
      ${challah(28, 33, 0.8)}`,
  },
  {
    key: 'bowl',
    he: 'קערה חמה',
    idea: 'קערה מהבילה עם כף',
    draw: () => `
      <path d="M16.6,18.4Q14.4,14.6 16.6,11.4Q18.8,8.2 16.6,4.6M24,18.4Q21.8,14.6 24,11.4Q26.2,8.2 24,4.6M31.4,18.4Q29.2,14.6 31.4,11.4Q33.6,8.2 31.4,4.6" stroke="${c('line')}" stroke-width="1.8" stroke-linecap="round" fill="none"/>
      <path d="M32,23L41.4,9.6" stroke="${c('metal2')}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M5.5,23.4H42.5Q41.4,37.6 24,39.6Q6.6,37.6 5.5,23.4Z" fill="${c('acc')}"/>
      <ellipse cx="24" cy="23.4" rx="18.5" ry="3.4" fill="${c('acc2')}"/>
      <ellipse cx="24" cy="23.6" rx="16.4" ry="2.3" fill="${c('gold')}"/>
      <rect x="16.4" y="38.6" width="15.2" height="3" rx="1.5" fill="${c('acc2')}"/>
      <path d="M10,28Q12,33.6 18,35.6" stroke="${c('white')}" stroke-width="1.4" stroke-linecap="round" fill="none" opacity="0.4"/>`,
  },
  { key: 'species', he: 'שבעת המינים', idea: 'חיטה וענבים משבעת המינים', draw: wheatAndGrapes },
  {
    key: 'perText',
    he: 'לכל ברכה משלה',
    idea: 'הקבוצה: הצלחת. ברכת המזון: החלה, ברכה מעין שלוש: שבעת המינים, בורא נפשות: כוס מים ותפוח',
    draw: () => MEALS.find((o) => o.key === 'plate').draw(),
    byText: {
      birkat_hamazon: today('meals'),
      al_hamichya: wheatAndGrapes,
      borei_nefashot: waterAndApple,
    },
  },
];

// Every text of the siddur tab's general group, in its order, with the options for its own icon. `icon` reuses an icon
// the app already has.
export const GENERAL = [
  {
    text: 'tikkun_haklali',
    options: [
      {
        key: 'lyre',
        he: 'כינור עשרה נימים',
        idea: 'כינור של עשרה מיתרים, כמו עשרת המזמורים וכינור של עשרה נימין',
        draw: () => `
          <path d="M13.6,34Q13.6,43.4 24,43.4Q34.4,43.4 34.4,34Z" fill="${c('wood')}"/>
          <path d="M15.4,35Q7.4,24.6 11,8.4M32.6,35Q40.6,24.6 37,8.4" stroke="${c('gold')}" stroke-width="3.6" stroke-linecap="round" fill="none"/>
          <path d="M9.6,10.4Q24,13.4 38.4,10.4" stroke="${c('wood2')}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
          <path d="${Array.from({ length: 10 }, (_, i) => `M${r(15.6 + i * 1.86)},${r(12.4 - Math.abs(i - 4.5) * 0.1)}V34`).join('')}" stroke="${c('line')}" stroke-width="0.75"/>
          <circle cx="11" cy="7.6" r="2.2" fill="${c('gold2')}"/><circle cx="37" cy="7.6" r="2.2" fill="${c('gold2')}"/>
          <ellipse cx="24" cy="38.6" rx="3.4" ry="1.8" fill="${c('wood2')}"/>`,
      },
      {
        key: 'spring',
        he: 'נחל נובע',
        idea: 'מעיין יוצא מן הסלע: ״נחל נובע מקור חכמה״',
        draw: () => `
          <path d="M4,33Q6,21.6 15.4,22.4Q19.6,13.6 28.6,16.4Q36.4,14.6 40.4,22.8Q45.4,26.6 44.4,33Z" fill="${c('wood')}"/>
          <path d="M15.4,22.4Q19,22.6 20.4,25.4M28.6,16.4Q31.6,18 32.4,21.6" stroke="${c('wood2')}" stroke-width="1.3" stroke-linecap="round" fill="none"/>
          <path d="M20,25.4Q24,26.4 28,25.4Q26.8,33.6 32.4,41.6H15.6Q21.2,33.6 20,25.4Z" fill="${c('water')}"/>
          <ellipse cx="24" cy="41.6" rx="19" ry="3.6" fill="${c('water')}"/>
          <path d="M23.4,29V35.4M13,41.6H19M29,41.2H36" stroke="${c('white')}" stroke-width="1.3" stroke-linecap="round" opacity="0.85"/>
          <path d="M8.4,33Q6.6,27.6 9.6,24.6Q10.6,29 8.4,33ZM40,33Q42.6,28.4 40.4,25Q38.4,29.4 40,33Z" fill="${c('leaf')}"/>`,
      },
      { key: 'harp', he: 'כינור (כמו תהילים)', idea: 'הכינור של תהילים', icon: 'tehillim' },
    ],
  },
  { text: 'tehillim', options: [{ key: 'harp', he: 'כינור דוד', idea: 'הכינור של תהילים, כמו היום בטאב "עוד"', icon: 'tehillim' }] },
  {
    text: 'nishmat',
    options: [
      {
        key: 'eagle',
        he: 'נשר פורש כנפיים',
        idea: '״וידינו פרושות כנשרי שמיים״',
        draw: () => {
          const wing = 'M20.4,23.6C15.6,15.6 9.4,11 3,10.4L6,14.8L3.4,16.4L7.6,19.4L5.2,21.6L9.8,23.8L8.4,26.4L13.4,27.6L13.4,30.6L19.8,31.4Z';
          const mirror = wing.replace(/([\d.]+),([\d.]+)/g, (_, x, y) => `${r(48 - Number(x))},${y}`);
          return `
            <path d="${wing}" fill="${c('wood2')}"/><path d="${mirror}" fill="${c('wood2')}"/>
            <path d="M20.6,22.4C16.8,17.4 12.4,15.2 8.2,14.6C13,17.8 15.8,21.6 17.4,25.8ZM27.4,22.4C31.2,17.4 35.6,15.2 39.8,14.6C35,17.8 32.2,21.6 30.6,25.8Z" fill="${c('wood')}"/>
            <path d="M21.4,34.4L24,41.6L26.6,34.4Z" fill="${c('wood2')}"/>
            <ellipse cx="24" cy="27" rx="5.4" ry="9" fill="${c('wood')}"/>
            <circle cx="24" cy="15.6" r="4.6" fill="${c('white')}" stroke="${c('paper2')}" stroke-width="0.9"/>
            <path d="M22.4,17.4H25.6L24,21.4Z" fill="${c('gold2')}"/>
            <circle cx="22.2" cy="15" r="0.85" fill="${c('ink3')}"/><circle cx="25.8" cy="15" r="0.85" fill="${c('ink3')}"/>
            <path d="M21.6,35.6V38M26.4,35.6V38" stroke="${c('gold2')}" stroke-width="1.6" stroke-linecap="round"/>`;
        },
      },
      {
        key: 'sea',
        he: 'ים, שמש וירח',
        idea: '״אילו פינו מלא שירה כים... ועינינו מאירות כשמש וכירח״',
        draw: () => `
          <circle cx="33.6" cy="13" r="6.6" fill="${c('flame')}" opacity="0.4"/>
          <circle cx="33.6" cy="13" r="4.6" fill="${c('flame2')}"/>
          ${crescent(13.6, 13.6, 5.4, 16.6, 11.4, 4.6, c('gold'))}
          <path d="M3,27.6Q8.5,23.6 14,27.6T25,27.6T36,27.6T47,27.6V33H3Z" fill="${c('water')}"/>
          <path d="M3,33.6Q8.5,29.6 14,33.6T25,33.6T36,33.6T47,33.6V38.6H3Z" fill="${c('blue')}"/>
          <path d="M3,39Q8.5,35 14,39T25,39T36,39T47,39V44H3Z" fill="${c('ink2')}"/>`,
      },
    ],
  },
  { text: 'kriat_shema_al_hamita', options: [{ key: 'night', he: 'מיטה וירח', idea: 'אייקון קריאת שמע על המיטה של המצווה', icon: 'night' }] },
  {
    text: 'tefilat_haderech',
    options: [
      {
        key: 'road',
        he: 'דרך אל האופק',
        idea: 'דרך שנמשכת אל האופק והשמש בקצה',
        draw: () => `
          <path d="M4.23,27A20,20 0 0 1 43.77,27Z" fill="${c('water')}"/>
          <path d="M31,27A5,5 0 0 1 41,27Z" fill="${c('flame2')}"/>
          <path d="M4.23,27A20,20 0 0 0 43.77,27Z" fill="${c('leaf')}"/>
          <path d="M4.23,27Q10,23.6 15.6,26.2Q20.4,23.8 24,27Z" fill="${c('leaf2')}"/>
          <path d="M17,42.8Q21.6,34 23.3,27H24.7Q26.4,34 31,42.8Q24,44.6 17,42.8Z" fill="${c('ink2')}"/>
          <path d="M24,28.6V30.2M24,32.8V35.2M24,38V41.6" stroke="${c('white')}" stroke-width="1.2" stroke-linecap="round"/>`,
      },
      {
        key: 'suitcase',
        he: 'מזוודה',
        idea: 'מזוודה עם תווית: יוצאים לדרך',
        draw: () => `
          <path d="M18.6,15.6V11.4Q18.6,9 21,9H27Q29.4,9 29.4,11.4V15.6" stroke="${c('ink')}" stroke-width="2.4" fill="none"/>
          <rect x="6.5" y="15.4" width="35" height="25.6" rx="4" fill="${c('acc')}"/>
          <rect x="13.6" y="15.4" width="3.2" height="25.6" fill="${c('acc2')}"/>
          <rect x="31.2" y="15.4" width="3.2" height="25.6" fill="${c('acc2')}"/>
          <rect x="9.6" y="41" width="4" height="3" rx="1" fill="${c('ink')}"/><rect x="34.4" y="41" width="4" height="3" rx="1" fill="${c('ink')}"/>
          <path d="M29.4,12.6Q33,15 34.6,19.6" stroke="${c('wood2')}" stroke-width="1" fill="none"/>
          <rect x="31.8" y="19.4" width="7" height="9.6" rx="1.2" transform="rotate(-14 35.3 24.2)" fill="${c('paper')}" stroke="${c('paper2')}" stroke-width="0.9"/>`,
      },
    ],
  },
  { text: 'asher_yatzar', options: [{ key: 'cup', he: 'נטלה', idea: 'הנטלה, אחרי נטילת הידיים', draw: today('brachot') }] },
  {
    text: 'birchot_hanehenin',
    options: [
      { key: 'apple', he: 'תפוח', idea: 'תפוח עם עלה: בורא פרי העץ', draw: () => apple(24, 26, 1.05) },
      {
        key: 'bowl',
        he: 'קערת פירות',
        idea: 'קערה עם תפוח, ענבים ולחם',
        draw: () => `
          <ellipse cx="31.6" cy="20.4" rx="7.4" ry="4.6" transform="rotate(-18 31.6 20.4)" fill="${c('gold')}"/>
          ${[[19.6, 15.4], [23.6, 15.4], [21.6, 19.2], [17.6, 19.2], [25.6, 19.4]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5" fill="${c('ink2')}"/>`).join('')}
          ${apple(13.4, 24, 0.5)}
          <path d="M4.5,26H43.5Q42,41.4 24,42Q6,41.4 4.5,26Z" fill="${c('wood')}"/>
          <rect x="4" y="24.6" width="40" height="3" rx="1.5" fill="${c('wood2')}"/>`,
      },
    ],
  },
  {
    text: 'birchot_hareiya',
    options: [
      {
        key: 'rainbow',
        he: 'קשת בענן',
        idea: 'קשת בענן: זוכר הברית',
        draw: () => `
          ${[[19, 'wine'], [15.6, 'acc'], [12.2, 'gold'], [8.8, 'leaf']].map(([R, role]) => `<path d="M${24 - R},33A${R},${R} 0 0 1 ${24 + R},33" stroke="${c(role)}" stroke-width="3.4" fill="none"/>`).join('')}
          ${[[8.8, 'cloudL'], [39.2, 'cloudR']].map(([x]) => `<path d="M${x - 6.6},38.6Q${x - 8.4},33.4 ${x - 3},32.6Q${x - 2},27.8 ${x + 2},29.4Q${x + 6},28.8 ${x + 6},33Q${x + 8.4},34.4 ${x + 6.4},38.6Z" fill="${c('white')}" stroke="${c('metal2')}" stroke-width="1.1" stroke-linejoin="round"/>`).join('')}`,
      },
      {
        key: 'storm',
        he: 'ברק ורעם',
        idea: 'ענן וברק: שכוחו וגבורתו מלא עולם',
        draw: () => `
          <path d="M9,26.4Q4.4,26 4.6,21Q5,16.4 10,16.8Q11.2,9.4 18.6,10Q22.6,5 29.4,7.6Q35.6,7.4 36.6,14Q43.6,14 43.4,20.4Q43,26.4 37,26.4Z" fill="${c('metal')}" stroke="${c('metal2')}" stroke-width="1.2" stroke-linejoin="round"/>
          <path d="M26.6,23L19.6,34H25L21.6,44.4L32,30.2H26.4L30.4,23Z" fill="${c('flame2')}"/>
          <path d="M11,30.4L9.4,35M15.4,31.4L13.8,36M37.4,30.4L35.8,35M41,31.4L39.4,36" stroke="${c('water')}" stroke-width="1.6" stroke-linecap="round"/>`,
      },
    ],
  },
  {
    text: 'mezuzah',
    options: [
      { key: 'mezuzah', he: 'מזוזה', idea: 'המזוזה של היום עוברת לכאן', draw: today('shema') },
      {
        key: 'door',
        he: 'דלת עם מזוזה',
        idea: 'פתח בית ומזוזה על המשקוף הימני, נטויה פנימה',
        draw: () => `
          <rect x="13.2" y="8" width="21.6" height="36" fill="${c('acc')}"/>
          <rect x="16" y="11.2" width="6.8" height="12.4" rx="1" fill="${c('acc2')}"/>
          <rect x="25.2" y="11.2" width="6.8" height="12.4" rx="1" fill="${c('acc2')}"/>
          <rect x="16" y="27" width="6.8" height="13.4" rx="1" fill="${c('acc2')}"/>
          <rect x="25.2" y="27" width="6.8" height="13.4" rx="1" fill="${c('acc2')}"/>
          <circle cx="16.4" cy="25.4" r="1.4" fill="${c('gold')}"/>
          <rect x="8.4" y="6.2" width="4.8" height="38.4" rx="1" fill="${c('wood')}"/>
          <rect x="34.8" y="6.2" width="4.8" height="38.4" rx="1" fill="${c('wood')}"/>
          <rect x="7" y="3.6" width="34" height="4.6" rx="1.4" fill="${c('wood2')}"/>
          <rect x="4" y="43.4" width="40" height="2.4" rx="1.2" fill="${c('wood2')}"/>
          <g transform="rotate(-22 37.2 19)">
            <rect x="35.2" y="10" width="4" height="18" rx="2" fill="${c('gold')}"/>
            <path d="M36.2,15.6V17.4Q36.2,18.4 37.2,18.4Q38.2,18.4 38.2,17.4V15.6M37.2,15.8V18.2" stroke="${c('ink')}" stroke-width="0.9" stroke-linecap="round" fill="none"/>
          </g>`,
      },
    ],
  },
  { text: 'kiddush_levana', options: [{ key: 'moon', he: 'ירח וכוכבים', idea: 'אייקון קידוש לבנה של המצווה', icon: 'moon' }] },
];

export const TOPICS = [
  { icon: 'shema', he: 'קריאת שמע של שחרית', options: SHEMA },
  { icon: 'brachot', he: 'ברכות השחר', options: BRACHOT },
  { icon: 'sukkah', he: 'אושפיזין', options: USHPIZIN },
  { icon: 'meals', he: 'סעודה', options: MEALS },
];

// Round 8, the same day, on the owner's word ("give me the festivals and celebrations too"): an icon of its own for
// every text of the siddur tab's festivals group, which all show the group's pomegranate today. Each list opens with
// the icon the text's mitzvah already has, where it has one.
// A wine cup centred on x, its rim at y, at scale k.
const cup = (x, y, k = 1) => {
  const p = (dx, dy) => `${r(x + dx * k)},${r(y + dy * k)}`;
  return `<path d="M${p(-6.5, 0)}L${p(6.5, 0)}L${p(5.4, 10.4)}Q${p(0, 14.6)} ${p(-5.4, 10.4)}Z" fill="${c('gold')}"/>
    <ellipse cx="${r(x)}" cy="${r(y + 0.7 * k)}" rx="${r(6.4 * k)}" ry="${r(1.4 * k)}" fill="${c('wine')}"/>
    <rect x="${r(x - 1 * k)}" y="${r(y + 12.6 * k)}" width="${r(2 * k)}" height="${r(6.8 * k)}" fill="${c('gold2')}"/>
    <path d="M${p(-4.6, 22)}L${p(4.6, 22)}L${p(3, 19.2)}L${p(-3, 19.2)}Z" fill="${c('gold2')}"/>
    <rect x="${r(x - 4.2 * k)}" y="${r(y + 2.4 * k)}" width="${r(1.4 * k)}" height="${r(6 * k)}" rx="${r(0.7 * k)}" fill="${c('white')}" opacity="0.45"/>`;
};
// Seven small stars on an arc of radius R about (x, y), from -165 to -15 degrees.
const sevenStars = (x, y, R, s = 1.9) =>
  Array.from({ length: 7 }, (_, i) => {
    const a = ((-165 + i * 25) * Math.PI) / 180;
    return star(r(x + R * Math.cos(a)), r(y + R * Math.sin(a)), i === 3 ? s * 1.35 : s, c('gold'));
  }).join('');

export const OCCASIONS = [
  {
    text: 'sheva_berachot',
    options: [
      {
        key: 'chuppah',
        he: 'חופה',
        idea: 'חופה על ארבעה עמודים, מכוסה טלית, וכוס של ברכה מתחתיה',
        draw: () => `
          <rect x="13.4" y="16" width="1.8" height="26" fill="${c('wood2')}"/>
          <rect x="32.8" y="16" width="1.8" height="26" fill="${c('wood2')}"/>
          <rect x="7.6" y="14.4" width="2.8" height="28.6" rx="1" fill="${c('wood')}"/>
          <rect x="37.6" y="14.4" width="2.8" height="28.6" rx="1" fill="${c('wood')}"/>
          <path d="M5,14.6Q24,5 43,14.6L41.4,18.6Q36.6,21.4 31.6,18.8Q27.8,21.8 24,19.2Q20.2,21.8 16.4,18.8Q11.4,21.4 6.6,18.6Z" fill="${c('paper')}" stroke="${c('paper2')}" stroke-width="1"/>
          <path d="M8.4,15.4Q24,7.6 39.6,15.4" stroke="${c('blue')}" stroke-width="1.3" fill="none"/>
          <path d="M7.4,17.2Q24,9.6 40.6,17.2" stroke="${c('blue')}" stroke-width="0.9" fill="none"/>
          <circle cx="6.6" cy="19.6" r="1.4" fill="${c('gold')}"/><circle cx="41.4" cy="19.6" r="1.4" fill="${c('gold')}"/>
          ${cup(24, 26.6, 0.62)}
          <rect x="4" y="42.6" width="40" height="3" rx="1.5" fill="${c('wood2')}"/>`,
      },
      {
        key: 'cups',
        he: 'שתי כוסות',
        idea: 'שתי כוסות יין: כוס ברכת המזון וכוס שבע הברכות',
        draw: () => `${cup(15.4, 16.4)}${cup(32.6, 16.4)}${star(24, 9.6, 2.6, c('gold'))}${star(29.4, 6, 1.6, c('gold'))}${star(18.6, 6.4, 1.4, c('gold'))}`,
      },
      {
        key: 'rings',
        he: 'טבעות',
        idea: 'שתי טבעות נישואין שלובות',
        draw: () => `
          <circle cx="19" cy="28.6" r="9.6" stroke="${c('gold2')}" stroke-width="3.6" fill="none"/>
          <circle cx="29" cy="23.4" r="9.6" stroke="${c('gold')}" stroke-width="3.6" fill="none"/>
          <path d="M26.4,32.6A9.6,9.6 0 0 0 28.4,28.8" stroke="${c('gold2')}" stroke-width="3.6" fill="none"/>
          <path d="M14.4,22.4A7,7 0 0 1 18.4,20.4" stroke="${c('white')}" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.6"/>
          ${star(38.6, 9.4, 3, c('gold'))}${star(9.6, 11.6, 1.8, c('gold'))}`,
      },
      {
        key: 'sevenStars',
        he: 'כוס ושבעה כוכבים',
        idea: 'כוס של ברכה ושבעה כוכבים מעליה: שבע הברכות',
        draw: () => `${sevenStars(24, 21, 15.4)}${cup(24, 21.4, 1.05)}`,
      },
    ],
  },
  {
    text: 'chanukah_candles',
    options: [
      { key: 'chanukiah', he: 'חנוכייה', idea: 'החנוכייה של מצוות נרות חנוכה', icon: 'chanukiah' },
      {
        key: 'window',
        he: 'חנוכייה בחלון',
        idea: 'חנוכייה דולקת בחלון בלילה: פרסומי ניסא',
        draw: () => {
          const xs = [11.6, 14.6, 17.6, 20.6, 27.4, 30.4, 33.4, 36.4];
          return `
            <rect x="5.5" y="5.5" width="37" height="34.5" rx="2.4" fill="${c('wood')}"/>
            <rect x="8.6" y="8.6" width="30.8" height="31.4" fill="${c('ink')}"/>
            ${crescent(14.4, 14.6, 3.6, 16.4, 13.2, 3.1, c('gold'))}
            ${star(33.6, 13.4, 1.6, c('white'))}${star(26.6, 16.6, 1.1, c('white'))}
            <path d="M10.6,31.6H37.4" stroke="${c('gold')}" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M24,25.6V39.4M19.6,39.6H28.4" stroke="${c('gold')}" stroke-width="1.8" stroke-linecap="round"/>
            ${xs.map((x) => `<rect x="${r(x - 0.75)}" y="27.6" width="1.5" height="4" fill="${c('white')}"/>${flame(x, 23.4, 4)}`).join('')}
            <rect x="23.25" y="21.6" width="1.5" height="4" fill="${c('white')}"/>${flame(24, 17.4, 4)}
            <rect x="3" y="39.6" width="42" height="4.2" rx="1.6" fill="${c('wood2')}"/>`;
        },
      },
      {
        key: 'jar',
        he: 'פך השמן',
        idea: 'פך השמן הקטן שדלק שמונה ימים',
        draw: () => `
          <circle cx="24" cy="10" r="7.4" fill="${c('flame')}" opacity="0.3"/>
          ${flame(24, 2.6, 11)}
          <path d="M31.4,24.6Q38.4,25 37,32.4" stroke="${c('wood2')}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
          <path d="M16.4,22.4Q11.2,29.6 14.6,38.2Q24,43.4 33.4,38.2Q36.8,29.6 31.6,22.4Q28,19.8 24,20.2Q20,19.8 16.4,22.4Z" fill="${c('wood')}"/>
          <rect x="20.2" y="14" width="7.6" height="8" rx="1.6" fill="${c('wood')}"/>
          <rect x="18.8" y="12.4" width="10.4" height="3.2" rx="1.6" fill="${c('wood2')}"/>
          <rect x="20.2" y="18.4" width="7.6" height="2.2" fill="${c('gold')}"/>
          <path d="M17.4,29Q24,32 30.6,29" stroke="${c('gold')}" stroke-width="1.4" stroke-linecap="round" fill="none"/>
          <ellipse cx="18.6" cy="27" rx="1.8" ry="4" transform="rotate(14 18.6 27)" fill="${c('white')}" opacity="0.3"/>`,
      },
    ],
  },
  {
    text: 'selichot',
    options: [
      { key: 'shofar', he: 'שופר', idea: 'השופר של מצוות סליחות', icon: 'shofar' },
      {
        key: 'gate',
        he: 'שערי רחמים',
        idea: 'שער פתוח ואור יוצא ממנו: ״פתח לנו שער בעת נעילת שער״',
        draw: () => `
          <path d="M7,44V20Q7,5 24,5Q41,5 41,20V44Z" fill="${c('ink2')}"/>
          <path d="M11.6,44V20.8Q11.6,9.6 24,9.6Q36.4,9.6 36.4,20.8V44Z" fill="${c('flame')}"/>
          <circle cx="24" cy="25" r="8.6" fill="${c('flame2')}" opacity="0.45"/>
          <path d="M11.6,20.8Q11.6,13.6 16.2,11.6L17,44H11.6ZM36.4,20.8Q36.4,13.6 31.8,11.6L31,44H36.4Z" fill="${c('wood')}"/>
          <path d="M14,26V30M34,26V30" stroke="${c('gold')}" stroke-width="1.4" stroke-linecap="round"/>
          <rect x="3.5" y="43" width="41" height="2.8" rx="1.4" fill="${c('ink3')}"/>`,
      },
    ],
  },
  {
    text: 'ushpizin',
    options: [{ key: 'table', he: 'שולחן וכיסא לאורח', idea: 'האייקון של מצוות אושפיזין', draw: USHPIZIN.find((o) => o.key === 'table').draw }],
  },
];

// The markup of an option: its own drawing, or the drawing of the app icon it reuses.
export const artOf = (option, uid = '__UID__') => (option.icon ? today(option.icon) : option.draw)(uid);
