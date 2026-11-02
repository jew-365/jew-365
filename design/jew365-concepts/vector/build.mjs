import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = dirname(fileURLToPath(import.meta.url));

const tidy = (svg) => svg.replace(/-?\d+\.\d{3,}/g, (n) => String(Number(Number(n).toFixed(2))));

const deg = (d) => (d * Math.PI) / 180;
function enclosingCircle(points) {
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pts = [...points];
  for (let i = pts.length - 1; i > 0; i--) {
    const k = Math.floor(rand() * (i + 1));
    [pts[i], pts[k]] = [pts[k], pts[i]];
  }
  const inside = (c, p) => Math.hypot(p[0] - c.x, p[1] - c.y) <= c.r + 1e-6;
  const two = (a, b) => ({ x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, r: Math.hypot(a[0] - b[0], a[1] - b[1]) / 2 });
  const three = (a, b, c) => {
    const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
    if (Math.abs(d) < 1e-9) return [two(a, b), two(a, c), two(b, c)].sort((m, n) => n.r - m.r)[0];
    const sq = (p) => p[0] * p[0] + p[1] * p[1];
    const x = (sq(a) * (b[1] - c[1]) + sq(b) * (c[1] - a[1]) + sq(c) * (a[1] - b[1])) / d;
    const y = (sq(a) * (c[0] - b[0]) + sq(b) * (a[0] - c[0]) + sq(c) * (b[0] - a[0])) / d;
    return { x, y, r: Math.hypot(a[0] - x, a[1] - y) };
  };
  let c = { x: pts[0][0], y: pts[0][1], r: 0 };
  for (let i = 1; i < pts.length; i++) {
    if (inside(c, pts[i])) continue;
    c = { x: pts[i][0], y: pts[i][1], r: 0 };
    for (let j = 0; j < i; j++) {
      if (inside(c, pts[j])) continue;
      c = two(pts[i], pts[j]);
      for (let k = 0; k < j; k++) if (!inside(c, pts[k])) c = three(pts[i], pts[j], pts[k]);
    }
  }
  return c;
}

const at = (c, r, a) => [c[0] + r * Math.cos(deg(a)), c[1] + r * Math.sin(deg(a))];

/* The owner's logo of 2026-11-02 (design/references/2026-11-02/logo.jpg), in its own pixels: every unit below is one
   pixel of that 1254 px image. Letters, bell and book are filled outlines traced from it (even-odd, holes included),
   and the ring is the smooth curve fitted to its traced centre line; trace/trace.py writes them to
   trace/source-paths.json. The ticks, the stopwatch button, the degree sign and the white square are measured. */
const SOURCE = {
  ring: { c: [579.4, 668.5], r: 451, w: 33.5 },
  ticks: {
    w: 30.5,
    segs: [
      [[589.7, 366], [589.8, 293]],
      [[393.8, 408.5], [365.2, 368.2]],
      [[265.3, 540.4], [222, 520]],
      [[232, 694.8], [181, 694.8]],
      [[265.6, 856.6], [233.2, 877.6]],
      [[392.7, 949], [364.8, 990.1]],
      [[588.6, 992.5], [588.6, 1051.5]],
    ],
  },
  crown: { w: 40, bar: [[559, 169], [657, 169]], stem: [[607, 169], [607, 226]] },
  degree: { c: [814.7, 725.2], r: 31.7, w: 25 },
  square: [67, 73, 1112, 1112],
};
const SOURCE_PATHS = JSON.parse(readFileSync(join(OUT, 'trace', 'source-paths.json'), 'utf8'));

const LETTER_ROWS = { top: ['j', 'e', 'w'], bottom: ['three', 'six', 'five'] };

function samplePath(d) {
  const pts = [];
  let cur;
  let start;
  for (const [, cmd, args] of d.matchAll(/([MLQCZ])([^MLQCZ]*)/g)) {
    const nums = args.trim() ? args.trim().split(/[\s,]+/).map(Number) : [];
    const P = Array.from({ length: nums.length / 2 }, (_, i) => [nums[2 * i], nums[2 * i + 1]]);
    if (cmd === 'Z') P.push(start);
    if (cmd === 'M') {
      start = P[0];
      pts.push(start);
    } else {
      for (let u = 0.125; u <= 1.0001; u += 0.125) {
        let q = [cur, ...P];
        while (q.length > 1) q = q.slice(1).map((p, i) => [q[i][0] + (p[0] - q[i][0]) * u, q[i][1] + (p[1] - q[i][1]) * u]);
        pts.push(q[0]);
      }
    }
    cur = P.at(-1);
  }
  return pts;
}

const boxOf = (pts) => {
  const xs = pts.map(([x]) => x);
  const ys = pts.map(([, y]) => y);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
};

const segD = (segs) => segs.map(([p0, p1]) => `M${p0[0]} ${p0[1]}L${p1[0]} ${p1[1]}`).join('');
const segPts = (segs, r) => segs.flat().map(([x, y]) => [x, y, r]);
const GRADIENT_AXIS = [Math.sin(deg(150)), -Math.cos(deg(150))];

const gradientDef = (id, [x1, y1], [x2, y2], stops) =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops
    .map(([o, col]) => `<stop offset="${o}" stop-color="${col}"/>`)
    .join('')}</linearGradient>`;

let renderSeq = 0;

function scene({ letters, degree = null, ring = null, ticks = null, crown = null, glyphs = [] }) {
  const lettersD = letters.join('');
  const extents = [
    ...samplePath(lettersD).map(([x, y]) => [x, y, 0]),
    ...(degree ? Array.from({ length: 36 }, (_, i) => [...at(degree.c, degree.r + degree.w / 2, i * 10), 0]) : []),
    ...(ring ? (ring.pts ?? samplePath(ring.d)).map(([x, y]) => [x, y, ring.w / 2]) : []),
    ...(ticks ? segPts(ticks.segs, ticks.w / 2) : []),
    ...(crown ? segPts([crown.bar, crown.stem], crown.w / 2) : []),
    ...glyphs.flatMap((g) => samplePath(g.d).map(([x, y]) => [x, y, 0])),
  ];
  const x0 = Math.min(...extents.map(([x, , r]) => x - r));
  const y0 = Math.min(...extents.map(([, y, r]) => y - r));
  const x1 = Math.max(...extents.map(([x, , r]) => x + r));
  const y1 = Math.max(...extents.map(([, y, r]) => y + r));
  const glyphBoxes = glyphs.map((g) => boxOf(samplePath(g.box ?? g.d)));
  const render = (colors) => {
    const id = `og${++renderSeq}`;
    const defs = [];
    const paint = (key, stops, from, to) => {
      if (!stops) return colors[key] ?? colors.sun;
      defs.push(gradientDef(`${id}g${defs.length}`, from, to, stops));
      return `url(#${id}g${defs.length - 1})`;
    };
    const els = [];
    if (crown) {
      const crownPaint = colors.crown ?? colors.ink;
      els.push(
        `<path d="${segD([crown.stem])}" stroke="${crownPaint}" stroke-width="${crown.w}"/><path d="${segD([crown.bar])}" stroke="${crownPaint}" stroke-width="${crown.w}" stroke-linecap="round"/>`,
      );
    }
    if (ring) {
      const [ax, ay] = GRADIENT_AXIS;
      const ringPaint = paint('ink', colors.ring, [ring.c[0] - ring.r * ax, ring.c[1] - ring.r * ay], [ring.c[0] + ring.r * ax, ring.c[1] + ring.r * ay]);
      els.push(`<path d="${ring.d}" fill="none" stroke="${ringPaint}" stroke-width="${ring.w}" stroke-linecap="round"/>`);
    }
    if (ticks) {
      const ys = ticks.segs.flat().map(([, y]) => y);
      const tickPaint = paint('ink', colors.ticks, [0, Math.min(...ys)], [0, Math.max(...ys)]);
      els.push(`<path d="${segD(ticks.segs)}" fill="none" stroke="${tickPaint}" stroke-width="${ticks.w}" stroke-linecap="round"/>`);
    }
    els.push(`<path d="${lettersD}" fill="${colors.ink}" fill-rule="evenodd"/>`);
    if (degree) {
      els.push(`<circle cx="${degree.c[0]}" cy="${degree.c[1]}" r="${degree.r}" fill="none" stroke="${colors.degree ?? colors.sun}" stroke-width="${degree.w}"/>`);
    }
    glyphs.forEach((g, i) => {
      const b = glyphBoxes[i];
      const fill = paint('sun', colors[g.paint], [b.x, b.y], [b.x + b.w, b.y + b.h]);
      els.push(`<path d="${g.d}" fill="${fill}" fill-rule="evenodd"/>`);
    });
    return `${defs.length ? `<defs>${defs.join('')}</defs>` : ''}${els.join('')}`;
  };
  const shape = enclosingCircle(extents.flatMap(([x, y, r]) => (r ? Array.from({ length: 24 }, (_, k) => at([x, y], r, k * 15)) : [[x, y]])));
  return {
    box: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 },
    center: [shape.x, shape.y],
    reach: (cx, cy) => Math.max(...extents.map(([x, y, r]) => Math.hypot(x - cx, y - cy) + r)),
    render,
  };
}

const lettersOf = (rows) => rows.flatMap((row) => LETTER_ROWS[row]).map((key) => SOURCE_PATHS.letters[key]);

const markO = scene({
  letters: lettersOf(['top', 'bottom']),
  degree: SOURCE.degree,
  ring: { ...SOURCE.ring, d: SOURCE_PATHS.ring },
  ticks: SOURCE.ticks,
  crown: SOURCE.crown,
  glyphs: [
    { d: SOURCE_PATHS.bell, paint: 'bell' },
    { d: SOURCE_PATHS.book, paint: 'book' },
    { d: SOURCE_PATHS.bookLines, paint: 'lines', box: SOURCE_PATHS.book },
  ],
});

function notifMark({ ringW = 78, ringGap = 5, crownThick = 0.2, crownLen = 0.56, crownGap = 0.8 } = {}) {
  const letters = lettersOf(['bottom']);
  const ink = samplePath(letters.join(''));
  const mec = enclosingCircle(ink);
  const c = [mec.x, mec.y];
  const R = Math.max(...ink.map(([x, y]) => Math.hypot(x - c[0], y - c[1]))) + ringGap + ringW / 2;
  const b = Math.round(R * crownThick);
  const half = (R * crownLen - b) / 2;
  const yBar = c[1] - R - ringW / 2 - b * crownGap - b / 2;
  const ring = {
    c,
    r: R,
    w: ringW,
    d: `M${c[0] - R} ${c[1]}A${R} ${R} 0 1 1 ${c[0] + R} ${c[1]}A${R} ${R} 0 1 1 ${c[0] - R} ${c[1]}`,
    pts: Array.from({ length: 72 }, (_, i) => at(c, R, i * 5)),
  };
  return scene({ letters, ring, crown: { w: b, bar: [[c[0] - half, yBar], [c[0] + half, yBar]], stem: [[c[0], yBar], [c[0], c[1] - R]] } });
}

const oOut = {
  icon: markO,
  notif: notifMark(),
  word: scene({ letters: lettersOf(['top', 'bottom']), degree: SOURCE.degree }),
};

function markSvg(layout, colors, { pad = 0, bg, title, attrs = '' } = {}) {
  const b = layout.box;
  const vb = `${b.x - pad} ${b.y - pad} ${b.w + pad * 2} ${b.h + pad * 2}`;
  const bgRect = bg ? `<rect x="${b.x - pad}" y="${b.y - pad}" width="${b.w + pad * 2}" height="${b.h + pad * 2}" fill="${bg}"/>` : '';
  const t = title ? `<title>${title}</title>` : '';
  return tidy(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" ${attrs}>${t}${bgRect}${layout.render(colors)}</svg>`);
}

function adaptiveIcon(layout, colors, bg, { guides = false, safe = 32 } = {}) {
  const b = layout.box;
  const [cx, cy] = layout.center;
  const k = safe / layout.reach(cx, cy);
  const nested = `<svg x="${54 - (cx - b.x) * k}" y="${54 - (cy - b.y) * k}" width="${b.w * k}" height="${b.h * k}" viewBox="${b.x} ${b.y} ${b.w} ${b.h}">${layout.render(colors)}</svg>`;
  const guide = guides
    ? `<circle cx="54" cy="54" r="33" fill="none" stroke="#FF3B6B" stroke-width="0.6" stroke-dasharray="2 1.5"/>`
    : '';
  return tidy(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="18 18 72 72"><rect x="0" y="0" width="108" height="108" fill="${bg}"/>${nested}${guide}</svg>`);
}

const BLUE_ORANGE = {
  id: 'blue-orange',
  label: 'כחול הדרגתי וכתום',
  bg: '#FFFFFF',
  ink: '#002767',
  sun: '#FF3B03',
  crown: '#0060FC',
  ring: [
    [0, '#0069FD'],
    [0.07, '#0070FC'],
    [0.25, '#0086FB'],
    [0.5, '#1C98FC'],
    [0.75, '#33A5FC'],
    [0.93, '#65C1FC'],
    [1, '#80CEFD'],
  ],
  ticks: [
    [0, '#0085FC'],
    [0.3, '#0F8DFC'],
    [0.53, '#1F9AFC'],
    [0.76, '#2DA1FC'],
    [1, '#3AA9FC'],
  ],
  hero: '#0E1626',
  heroInk: '#F4F7FF',
  heroSun: '#FF8A5C',
  heroRing: [
    [0, '#5B8CFF'],
    [0.5, '#8CBEFF'],
    [1, '#CFE8FF'],
  ],
  heroTicks: [
    [0, '#6F9BFF'],
    [1, '#BFE0FF'],
  ],
};
const hexToHsl = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
};
const hslToHex = (h, s, l) => {
  const a = s * Math.min(l, 1 - l);
  const channel = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return `#${[0, 8, 4].map((n) => Math.round(channel(n) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
};
const RED_ROTATION = 140;
const toRed = (hex) => {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex((h + RED_ROTATION) % 360, s, l);
};
const toRedStops = (stops) => stops.map(([offset, hex]) => [offset, toRed(hex)]);
const tone = (hex, dh, dl) => {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex((h + dh) % 360, s, Math.min(0.95, l + dl));
};
const sunTones = (sun) => ({
  degree: tone(sun, 5, 0),
  bell: [
    [0, tone(sun, 14, 0.06)],
    [0.45, tone(sun, 12, 0.01)],
    [1, sun],
  ],
  book: [
    [0, tone(sun, 13, 0.02)],
    [0.5, tone(sun, 4, 0)],
    [0.7, sun],
    [1, sun],
  ],
  lines: [
    [0, tone(sun, 15, 0.21)],
    [1, tone(sun, 12, 0.17)],
  ],
});

const RED_ORANGE = {
  ...BLUE_ORANGE,
  id: 'red-orange',
  label: 'אדום הדרגתי וכתום',
  ink: toRed(BLUE_ORANGE.ink),
  crown: toRed(BLUE_ORANGE.crown),
  ring: toRedStops(BLUE_ORANGE.ring),
  ticks: toRedStops(BLUE_ORANGE.ticks),
  heroRing: toRedStops(BLUE_ORANGE.heroRing),
  heroTicks: toRedStops(BLUE_ORANGE.heroTicks),
};

const lightColors = (p) => ({ ink: p.ink, sun: p.sun, crown: p.crown, ring: p.ring, ticks: p.ticks, ...sunTones(p.sun) });
const darkColors = (p) => ({ ink: p.heroInk, sun: p.heroSun, crown: p.heroRing[0][1], ring: p.heroRing, ticks: p.heroTicks, ...sunTones(p.heroSun) });

const O_LIGHT = lightColors(BLUE_ORANGE);
const O_DARK = darkColors(BLUE_ORANGE);
const P_LIGHT = lightColors(RED_ORANGE);
const P_DARK = darkColors(RED_ORANGE);
const O_SILHOUETTE = { ink: '#000000', sun: '#000000' };
const oSvgs = {
  'mark-o.svg': markSvg(markO, O_LIGHT, { pad: 20, title: 'Jew 365 mark o' }),
  'mark-o-mono.svg': markSvg(markO, O_SILHOUETTE, { pad: 20, title: 'Jew 365 mark o mono' }),
  'mark-o-dark.svg': markSvg(markO, O_DARK, { pad: 20, title: 'Jew 365 mark o on dark' }),
  'mark-o-icon.svg': markSvg(oOut.icon, O_LIGHT, { pad: 20, title: 'Jew 365 launcher icon' }),
  'mark-o-icon-mono.svg': markSvg(oOut.icon, O_SILHOUETTE, { pad: 20, title: 'Jew 365 launcher icon, single colour' }),
  'mark-o-notif.svg': markSvg(oOut.notif, O_SILHOUETTE, { pad: 7, title: 'Jew 365 notification silhouette' }),
  'wordmark-o.svg': markSvg(oOut.word, O_LIGHT, { pad: 10, title: 'JEW 365 wordmark o' }),
  'wordmark-o-dark.svg': markSvg(oOut.word, O_DARK, { pad: 10, title: 'JEW 365 wordmark o on dark' }),
};
for (const [name, svg] of Object.entries(oSvgs)) writeFileSync(join(OUT, name), svg + '\n');
const round2 = (n) => Number(n.toFixed(2));
const metaOf = (layout) => {
  const [cx, cy] = layout.center;
  return { center: [round2(cx), round2(cy)], reach: round2(layout.reach(cx, cy)), box: [layout.box.x, layout.box.y, layout.box.w, layout.box.h].map(round2) };
};
writeFileSync(
  join(OUT, 'mark-o-meta.json'),
  JSON.stringify({ mark: metaOf(markO), icon: { ...metaOf(oOut.icon), frame: SOURCE.square }, notif: metaOf(oOut.notif), wordmark: metaOf(oOut.word) }, null, 2) + '\n',
);

const MONO = { ink: '#000', sun: '#000' };
const silhouettes = (entries) =>
  entries
    .map(
      (e) => `<figure class="sil">
      <div class="sil-blur">${markSvg(e.layout, MONO, { attrs: 'class="mk"' })}</div>
      <figcaption>${e.name}</figcaption>
    </figure>`,
    )
    .join('');

const SIZES = [16, 24, 32, 48, 72, 128];
const sizeRows = (entries) =>
  entries
    .map(
      (e) => `<div class="sizes-row"><span class="sizes-label">${e.name}</span>${SIZES.map(
        (px) => `<span class="sz" style="height:${px}px">${markSvg(e.layout, e.light, { attrs: `style="height:${px}px;width:auto"` })}</span>`,
      ).join('')}</div>`,
    )
    .join('');

const MASKS = [
  { id: 'circle', label: 'עיגול (Pixel)' },
  { id: 'squircle', label: 'סקווירקל (Samsung)' },
  { id: 'rounded', label: 'ריבוע מעוגל' },
];
const iconRows = (entries) =>
  entries
    .map(
      (e) => `<div class="icons-row"><span class="sizes-label">${e.name}</span>
      ${MASKS.map((m) => `<figure class="ic"><div class="mask ${m.id}">${adaptiveIcon(e.layout, e.main.colors, e.main.bg)}</div><figcaption>${m.label}</figcaption></figure>`).join('')}
      <figure class="ic"><div class="mask square">${adaptiveIcon(e.layout, e.main.colors, e.main.bg, { guides: true })}</div><figcaption>אזור בטוח 66dp</figcaption></figure>
      <figure class="ic"><div class="mask circle light">${adaptiveIcon(e.layout, e.alt.colors, e.alt.bg)}</div><figcaption>${e.alt.label}</figcaption></figure>
    </div>`,
    )
    .join('');

const CREAM = '#F6F1E8';
const NIGHT = '#0E1626';
const oIconEntries = [
  {
    name: 'אייקון משגר · פעמון וספר',
    layout: oOut.icon,
    light: O_LIGHT,
    main: { colors: O_LIGHT, bg: BLUE_ORANGE.bg },
    alt: { colors: O_DARK, bg: NIGHT, label: 'רקע לילה' },
  },
];
const oNotifEntry = { name: 'התראה · טבעת וכתר', layout: oOut.notif, light: { ink: '#111111', sun: '#111111' } };
const oNotif = (px) => markSvg(oOut.notif, { ink: '#FFFFFF', sun: '#FFFFFF' }, { attrs: `style="height:${px}px;width:auto;display:block"` });

const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>לוגו יהודי 365</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800&display=swap" rel="stylesheet">
<style>
  :root{color-scheme:light;--bg:#F5F3F8;--surface:#FFFFFF;--text:#1C1429;--sub:#4A4258;--border:#DCD6E5}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);font-family:'Heebo',system-ui,'Segoe UI',Arial,sans-serif;line-height:1.55;-webkit-font-smoothing:antialiased}
  .page{max-width:1180px;margin:0 auto;padding:32px 16px 72px}
  h1{font-size:30px;font-weight:800;margin:0 0 6px}
  .lead{margin:0 0 28px;color:var(--sub);font-size:15px;max-width:780px}
  .mk{width:100%;height:100%;display:block}
  .sils{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
  .sil{margin:0;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;text-align:center}
  .sil-blur{height:120px;display:grid;place-items:center;filter:blur(7px)}
  .sil-blur .mk{width:auto;height:110px}
  .sil figcaption{font-size:13px;color:var(--sub);margin-top:8px}
  .panel{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:16px;overflow-x:auto}
  .sizes-row,.icons-row{display:flex;align-items:flex-end;gap:20px;padding:12px 0;border-bottom:1px solid var(--border);min-width:max-content}
  .sizes-row:last-child,.icons-row:last-child{border-bottom:0}
  .sizes-label{width:120px;flex:none;font-size:13px;font-weight:700;align-self:center}
  .sz{display:inline-flex;direction:ltr}
  .ic{margin:0;text-align:center}
  .ic figcaption{font-size:11px;color:var(--sub);margin-top:6px}
  .mask{width:88px;height:88px;overflow:hidden;box-shadow:0 1px 3px rgba(28,20,41,.18)}
  .mask svg{width:100%;height:100%;display:block}
  .mask.circle{border-radius:50%}
  .mask.squircle{border-radius:32%}
  .mask.rounded{border-radius:22%}
  .mask.square{border-radius:4px}
  .statusbar{direction:ltr;background:#1B1B1F;color:#FFF;border-radius:14px;height:40px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;font-size:14px;max-width:420px}
  .sb-icons{display:flex;gap:14px;align-items:center}
  .lk-word{height:64px;width:auto;max-width:100%}
  .o-pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:12px}
  .o-pair figure{margin:0}
  .o-pair figcaption{font-size:13px;color:var(--sub);margin-top:6px}
  .o-tile{border-radius:14px;border:1px solid var(--border);aspect-ratio:1;display:grid;place-items:center;padding:6%}
  .o-ref{width:100%;height:100%;object-fit:contain;display:block}
  .o-sub{font-size:16px;font-weight:700;margin:28px 0 8px}
  .o-notif-big{direction:ltr;background:#1B1B1F;border-radius:14px;padding:16px;display:flex;gap:24px;align-items:center;max-width:420px;margin-top:10px}
  .o-words{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:12px}
  .o-word{direction:ltr;border-radius:18px;border:1px solid var(--border);padding:28px;display:grid;place-items:center}
  .o-word .lk-word{height:150px}
  footer{margin-top:56px;font-size:13px;color:var(--sub)}
  code{font-family:ui-monospace,Consolas,monospace;font-size:12px}
</style>
</head>
<body>
<main class="page">
  <h1>לוגו יהודי 365</h1>
  <p class="lead">הסימן המלא שנוצר מהקוד ליד הרפרנס שהבעלים בחר, ועל רקע לילה. בהמשך: אייקון המשגר, צללית ההתראה והלוגוטייפ.</p>
  <div class="o-pair">
    <figure><div class="o-tile" style="background:#FFFFFF">${markSvg(markO, O_LIGHT, { attrs: 'class="mk"' })}</div><figcaption>הסימן שנוצר</figcaption></figure>
    <figure><div class="o-tile" style="background:#FFFFFF"><img class="o-ref" src="../../references/2026-11-02/logo.jpg" alt="הרפרנס שנבחר"></div><figcaption>הרפרנס</figcaption></figure>
    <figure><div class="o-tile" style="background:${NIGHT}">${markSvg(markO, O_DARK, { attrs: 'class="mk"' })}</div><figcaption>על רקע לילה</figcaption></figure>
  </div>
  <h3 class="o-sub">צללית</h3>
  <div class="sils">${silhouettes([...oIconEntries, oNotifEntry])}</div>
  <h3 class="o-sub">גדלים</h3>
  <div class="panel">${sizeRows([...oIconEntries, oNotifEntry])}</div>
  <h3 class="o-sub">אייקון אפליקציה (Android adaptive)</h3>
  <div class="panel">${iconRows(oIconEntries)}</div>
  <h3 class="o-sub">אייקון התראה, 24 פיקסלים בלבן על כהה</h3>
  <div class="statusbar"><span class="sb-time">07:42</span><span class="sb-icons">${oNotif(24)}${oNotif(24)}</span></div>
  <div class="o-notif-big">${oNotif(48)}${oNotif(96)}</div>
  <h3 class="o-sub">לוגוטייפ</h3>
  <div class="o-words">
    <div class="o-word" style="background:${CREAM}">${markSvg(oOut.word, O_LIGHT, { attrs: 'class="lk-word"' })}</div>
    <div class="o-word" style="background:${NIGHT}">${markSvg(oOut.word, O_DARK, { attrs: 'class="lk-word"' })}</div>
  </div>

  <footer>נבנה מ-<code>design/jew365-concepts/vector/build.mjs</code> · <code>node design/jew365-concepts/vector/build.mjs</code> מייצר מחדש את הלוח ואת קובצי ה-SVG.</footer>
</main>
</body>
</html>
`;

writeFileSync(join(OUT, 'index.html'), html);

const previewSvgs = {
  'mark-o-preview.svg': markSvg(markO, P_LIGHT, { pad: 20, title: 'Jew 365 P mark o' }),
  'mark-o-preview-dark.svg': markSvg(markO, P_DARK, { pad: 20, title: 'Jew 365 P mark o on dark' }),
};
for (const [name, svg] of Object.entries(previewSvgs)) writeFileSync(join(OUT, name), svg + '\n');
console.log('wrote', [...Object.keys(oSvgs), ...Object.keys(previewSvgs)].join(', '), 'mark-o-meta.json index.html');
