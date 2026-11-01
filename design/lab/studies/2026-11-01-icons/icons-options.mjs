// Round 6 of the icon study (2026-11-01): the owner kept only the open siddur of round 5 ("more options in the open
// siddur direction; everything else is irrelevant, remove it"). Each option is one open siddur, drawn in pack ב's
// style (48-unit box, colour roles of roles.css), used twice: alone as the `siddur` icon, and smaller under the time
// of each prayer as `shacharit` (the sun rising behind the book), `mincha` (the afternoon sun) and `maariv` (the moon).
import { c, crescent, star } from './icons.mjs';

const r = (n) => Math.round(n * 100) / 100;

// A Magen David of radius s at (x, y), two outlined triangles.
const magen = (x, y, s, role = 'gold2', width = 1.3) => {
  const h = s * 0.866;
  return `<path d="M${r(x)},${r(y - s)}L${r(x + h)},${r(y + s / 2)}H${r(x - h)}Z M${r(x)},${r(y + s)}L${r(x - h)},${r(y - s / 2)}H${r(x + h)}Z" stroke="${c(role)}" stroke-width="${width}" stroke-linejoin="round" fill="none"/>`;
};

// One open siddur centred on x = 24: pages from `t` down `h`, each `w` wide. `persp` narrows the top of the pages, as
// a book lying on a table; `layers` stacks page edges under it; the rest are the page's marks.
const openSiddur = ({ t, w, h, persp = false, layers = 0, left = 'lines', right = 'lines', ribbon = false, goldEdge = false, rays = false, lines = 3 }) => {
  const top = persp ? 0.78 : 1; // the share of `w` the pages keep at their top edge
  const edge = (side, y) => 24 + side * w * (top + (1 - top) * ((y - t) / h)); // the outer edge of a page at y
  const page = (side, dy = 0) =>
    `M${r(edge(side, t))},${r(t + dy)}Q${r(24 + (side * w * top) / 2)},${r(t - 3 + dy)} 24,${r(t + 1 + dy)}V${r(t + h + dy)}Q${r(24 + (side * w) / 2)},${r(t + h - 3.5 + dy)} ${r(24 + side * w)},${r(t + h - 1 + dy)}Z`;
  const depth = layers * 2;
  const out = [];
  if (rays) {
    out.push(`<circle cx="24" cy="${t}" r="${w * 0.62}" fill="${c('flame')}" opacity="0.28"/>`);
    out.push(
      `<path d="${[-150, -120, -90, -60, -30]
        .map((deg) => {
          const a = (deg * Math.PI) / 180;
          return `M${r(24 + 5.2 * Math.cos(a))},${r(t - 1 + 5.2 * Math.sin(a))}L${r(24 + 9.4 * Math.cos(a))},${r(t - 1 + 9.4 * Math.sin(a))}`;
        })
        .join('')}" stroke="${c('flame2')}" stroke-width="1.7" stroke-linecap="round"/>`,
    );
  }
  // The cover, a little wider and lower than the pages.
  out.push(
    `<path d="M${r(edge(-1, t) - 1.6)},${r(t + 2)}L${r(24 - w - 1.6)},${r(t + h + 2 + depth)}Q${r(24 - w / 2)},${r(t + h - 1 + depth)} 24,${r(t + h + 3 + depth)}Q${r(24 + w / 2)},${r(t + h - 1 + depth)} ${r(24 + w + 1.6)},${r(t + h + 2 + depth)}L${r(edge(1, t) + 1.6)},${r(t + 2)}Z" fill="${c('ink')}"/>`,
  );
  for (let k = layers; k >= 1; k -= 1) out.push(`<path d="${page(-1, k * 2)}" fill="${c(k === layers ? 'line' : 'paper2')}"/><path d="${page(1, k * 2)}" fill="${c(k === layers ? 'line' : 'paper2')}"/>`);
  out.push(`<path d="${page(-1)}" fill="${c('paper')}"/><path d="${page(1)}" fill="${c('white')}"/>`);
  out.push(`<path d="M24,${r(t + 1)}V${r(t + h)}" stroke="${c('paper2')}" stroke-width="1"/>`);
  if (goldEdge) out.push(`<path d="M${r(edge(-1, t))},${r(t)}Q${r(24 - (w * top) / 2)},${r(t - 3)} 24,${r(t + 1)}Q${r(24 + (w * top) / 2)},${r(t - 3)} ${r(edge(1, t))},${r(t)}" stroke="${c('gold2')}" stroke-width="1.4" stroke-linecap="round" fill="none"/>`);
  // The marks of a page: text lines, a Magen David, or a Magen David in a circle.
  const mark = (side, kind) => {
    const cx = 24 + (side * w) / 2;
    if (kind === 'magen' || kind === 'medallion') {
      const s = Math.min(w, h) * 0.2;
      const cy = t + h * 0.42;
      return `${kind === 'medallion' ? `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(s * 1.55)}" stroke="${c('gold2')}" stroke-width="1.1" fill="none"/>` : ''}${magen(cx, cy, s)}`;
    }
    const gap = (h - 7) / (lines + 0.5);
    return `<g stroke="${c('line')}" stroke-width="1.3" stroke-linecap="round" fill="none">${Array.from({ length: lines }, (_, i) => {
      const y = t + 4.5 + i * gap;
      const outer = edge(side, y) - side * 3;
      const inner = 24 + side * 3;
      return `<path d="M${r(outer)},${r(y - 0.6)}Q${r((outer + inner) / 2)},${r(y - 1.2)} ${r(inner)},${r(y + 0.4)}"/>`;
    }).join('')}</g>`;
  };
  out.push(mark(-1, left), mark(1, right));
  if (ribbon) out.push(`<path d="M24.6,${r(t + h + 0.5)}V${r(t + h + 7.5 + depth)}L26.3,${r(t + h + 5.8 + depth)}L28,${r(t + h + 7.5 + depth)}V${r(t + h - 0.2)}Z" fill="${c('acc')}"/>`);
  return out.join('\n');
};

// The time of each prayer above the smaller book: the sun rising behind it, the afternoon sun, the moon and a star.
const sky = {
  shacharit: (top) => `
    <circle cx="24" cy="${top - 1}" r="9" fill="${c('flame')}" opacity="0.3"/>
    <path d="M18.4,${top - 1}A5.6,5.6 0 0 1 29.6,${top - 1}Z" fill="${c('flame2')}"/>
    <path d="M24,${top - 9.4}V${top - 12}M17.2,${top - 6.2}L15.3,${top - 8.1}M30.8,${top - 6.2}L32.7,${top - 8.1}" stroke="${c('flame2')}" stroke-width="1.6" stroke-linecap="round"/>`,
  mincha: (top) => `
    <circle cx="34.5" cy="${top - 8}" r="7.5" fill="${c('flame')}" opacity="0.3"/>
    <circle cx="34.5" cy="${top - 8}" r="4.8" fill="${c('flame')}"/>
    <circle cx="34.5" cy="${top - 8}" r="4.8" fill="${c('flame2')}" opacity="0.45"/>`,
  maariv: (top) => `
    ${crescent(17, top - 9, 5.6, 19.8, top - 11, 4.8, c('gold'))}
    ${star(31, top - 13, 2.4, c('gold'))}
    ${star(35.5, top - 7.5, 1.5, c('gold'))}`,
};

const VARIANTS = [
  { key: 'classic', he: 'קלאסי', idea: 'מגן דוד בדף הימני ושורות תפילה בדף השמאלי', book: { left: 'lines', right: 'magen' } },
  { key: 'lines', he: 'שורות', idea: 'שורות תפילה בשני הדפים', book: { lines: 4 } },
  { key: 'ribbon', he: 'עם סימנייה', idea: 'שורות בשני הדפים וסימנייה כתומה', book: { ribbon: true } },
  { key: 'thick', he: 'עבה', idea: 'שכבות דפים מתחת לדף הפתוח, כמו סידור מלא', book: { layers: 2, left: 'lines', right: 'magen' } },
  { key: 'medallion', he: 'מדליון', idea: 'מגן דוד בתוך עיגול זהב בדף הימני, ושורות בדף השמאלי', book: { left: 'lines', right: 'medallion' } },
  { key: 'gold', he: 'קצוות זהב', idea: 'דפים עם שוליים מוזהבים ומגן דוד', book: { goldEdge: true, layers: 1, left: 'lines', right: 'magen' } },
  { key: 'light', he: 'אור', idea: 'סידור פתוח וקרני אור מעליו', book: { rays: true } },
  { key: 'table', he: 'על השולחן', idea: 'סידור פתוח שוכב, בפרספקטיבה', book: { persp: true, left: 'lines', right: 'magen' } },
];

// The siddur alone: pages from 12 down 23 (the light variant from 19, to leave room for its rays).
export const SIDDUR_OPTIONS = VARIANTS.map((v) => ({
  key: v.key,
  he: v.he,
  idea: v.idea,
  draw: () => openSiddur({ t: v.book.rays ? 19 : 12, w: 19.5, h: v.book.rays ? 20 : 23, ...v.book }),
}));

// The prayers: the same book, smaller and lower, under the time of the prayer (never with rays: the sky takes their place).
export const PRAYER_OPTIONS = VARIANTS.filter((v) => !v.book.rays).map((v) => ({
  key: v.key,
  he: v.he,
  idea: `${v.idea}, ושמש עולה, שמש של אחר הצהריים או ירח מעליו`,
  draw: Object.fromEntries(
    ['shacharit', 'mincha', 'maariv'].map((id) => [id, () => `${sky[id](21)}\n${openSiddur({ t: 21, w: 17.5, h: 16, ...v.book, ribbon: false, lines: Math.min(v.book.lines ?? 3, 3) })}`]),
  ),
}));
