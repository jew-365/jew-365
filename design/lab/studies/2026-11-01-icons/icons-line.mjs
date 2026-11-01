// Round 3 of the icon study: the line set, drawn after the coloured illustrations of icons.mjs so the two
// sets read as one family. 48-unit box, one stroke colour, stroke 3 with round caps and joins (set on the
// wrapping <g> by the page), generous corner radii; `f` fills the main shapes (`none` for plain lines, a
// soft tint of the accent for the filled option).
const r = (n) => Math.round(n * 100) / 100;

const flame = (x, top, h, f) => {
  const w = h * 0.36;
  const b = top + h;
  return `<path d="M${r(x)},${r(top)}C${r(x + w * 1.25)},${r(top + h * 0.45)} ${r(x + w)},${r(b - h * 0.08)} ${r(x)},${r(b)}C${r(x - w)},${r(b - h * 0.08)} ${r(x - w * 1.25)},${r(top + h * 0.45)} ${r(x)},${r(top)}Z" fill="${f}"/>`;
};
const star = (x, y, s) => {
  const k = s * 0.3;
  return `<path d="M${r(x)},${r(y - s)}L${r(x + k)},${r(y - k)}L${r(x + s)},${r(y)}L${r(x + k)},${r(y + k)}L${r(x)},${r(y + s)}L${r(x - k)},${r(y + k)}L${r(x - s)},${r(y)}L${r(x - k)},${r(y - k)}Z" stroke-width="2"/>`;
};
const crescent = (cx, cy, R, ox, oy, R2, f) => {
  const dx = ox - cx;
  const dy = oy - cy;
  const d = Math.hypot(dx, dy);
  const a = (R * R - R2 * R2 + d * d) / (2 * d);
  const h = Math.sqrt(R * R - a * a);
  const mx = cx + (a * dx) / d;
  const my = cy + (a * dy) / d;
  const p1 = [mx + (h * dy) / d, my - (h * dx) / d];
  const p2 = [mx - (h * dy) / d, my + (h * dx) / d];
  return `<path d="M${r(p1[0])},${r(p1[1])}A${R},${R} 0 1 0 ${r(p2[0])},${r(p2[1])}A${R2},${R2} 0 0 1 ${r(p1[0])},${r(p1[1])}Z" fill="${f}"/>`;
};
const openBook = (top, f, lines = true) => {
  const b = top + 20;
  return `<path d="M24,${top + 2}Q15,${top - 2} 5.5,${top + 0.5}V${b}Q15,${b - 2.5} 24,${b + 1.5}Q33,${b - 2.5} 42.5,${b}V${top + 0.5}Q33,${top - 2} 24,${top + 2}Z" fill="${f}"/>
    <path d="M24,${top + 2}V${b + 1.5}"/>
    ${lines ? `<path d="M10,${top + 7}Q14.5,${top + 5.8} 19,${top + 7.4}M29,${top + 7.4}Q33.5,${top + 5.8} 38,${top + 7}M10,${top + 12}Q14.5,${top + 10.8} 19,${top + 12.4}M29,${top + 12.4}Q33.5,${top + 10.8} 38,${top + 12}" stroke-width="2.2"/>` : ''}`;
};
const rays = (cx, cy, r1, r2, angles) =>
  `<path d="${angles
    .map((deg) => {
      const a = (deg * Math.PI) / 180;
      return `M${r(cx + r1 * Math.cos(a))},${r(cy + r1 * Math.sin(a))}L${r(cx + r2 * Math.cos(a))},${r(cy + r2 * Math.sin(a))}`;
    })
    .join('')}"/>`;

export const LINE_ICONS = {
  tefillin: (f) => `
    <path d="M12,16L17.5,10.5H36L30.5,16Z" fill="${f}"/>
    <path d="M30.5,16L36,10.5V28.5L30.5,34Z" fill="${f}"/>
    <rect x="12" y="16" width="18.5" height="18" rx="2.5" fill="${f}"/>
    <path d="M16.6,20.6V26.2Q16.6,29.4 19.8,29.4H22.6Q25.8,29.4 25.8,26.2V20.6M21.2,21V29.2" stroke-width="2.4"/>
    <rect x="8.5" y="34" width="29" height="5" rx="2.5" fill="${f}"/>
    <path d="M14,39.5C12.5,42.5 10,44 7,44.6M32,39.5C33.5,42.5 36,44 39,44.6"/>`,
  shacharit: (f) => `
    <path d="M9,14.5H39L40,34.5Q35.6,37 31.6,35Q27.8,37 24,35Q20.2,37 16.4,35Q12.4,37 8,34.5Z" fill="${f}"/>
    <rect x="8" y="9" width="32" height="6" rx="3" fill="${f}"/>
    <path d="M9.2,25Q24,26.8 38.8,25M9.4,30Q24,31.8 38.6,30" stroke-width="2.6"/>
    <path d="M10.6,36V42.6M13.4,36.6V43.4M37.4,36V42.6M34.6,36.6V43.4" stroke-width="2.2"/>`,
  mincha: (f) => `
    <circle cx="33.5" cy="10" r="4.6" fill="${f}"/>
    ${rays(33.5, 10, 7.4, 9.4, [-90, -45, 0, 180, -135])}
    ${openBook(19, f)}`,
  maariv: (f) => `
    ${crescent(20, 11, 7.2, 23.6, 8.4, 6.4, f)}
    ${star(34.5, 7.5, 3)}
    ${openBook(21, f)}`,
  shema: (f) => `
    <g transform="rotate(20 24 24)">
      <rect x="18.2" y="4.5" width="11.6" height="39" rx="5.8" fill="${f}"/>
      <path d="M21,13.4V17.6Q21,20 23.4,20H24.6Q27,20 27,17.6V13.4M24,13.8V19.8" stroke-width="2.2"/>
      <path d="M24,35.5V37.5"/>
    </g>`,
  brachot: (f) => `
    <path d="M14.4,18H10.2Q8.6,18 8.6,19.6V25.4Q8.6,27 10.2,27H15.2M33.6,18H37.8Q39.4,18 39.4,19.6V25.4Q39.4,27 37.8,27H32.8"/>
    <path d="M14,13H34L31.6,37.6Q24,40.6 16.4,37.6Z" fill="${f}"/>
    <path d="M12,13H36"/>
    <path d="M17.6,19Q20.8,17.4 24,19Q27.2,20.6 30.4,19" stroke-width="2.4"/>`,
  night: (f) => `
    ${crescent(36, 10.5, 5.6, 39, 8.4, 4.8, f)}
    ${star(23.5, 11, 2.4)}
    <path d="M6.5,19V41M6.5,34H41.5V41"/>
    <rect x="10" y="25.5" width="9" height="6" rx="3" fill="${f}"/>
    <path d="M21.5,34V30Q21.5,27.5 24,27.5H39Q41.5,27.5 41.5,30V34" fill="${f}"/>`,
  candles: (f) => [16, 32].map((x) => `
    ${flame(x, 4.5, 9, f)}
    <rect x="${x - 2.8}" y="17" width="5.6" height="15" rx="1.8" fill="${f}"/>
    <path d="M${x - 5.6},32.5H${x + 5.6}M${x},33V40M${x - 4.6},41H${x + 4.6}"/>`).join(''),
  havdalah: (f) => `
    ${flame(13, 3, 10, f)}
    <rect x="8" y="16" width="10" height="27" rx="2.6" fill="${f}"/>
    <path d="M8.6,21L17.4,25.4M8.6,28.4L17.4,32.8M8.6,35.8L17.4,40.2" stroke-width="2.2"/>
    <path d="M24,17H42V20.5Q42,30 33,30Q24,30 24,20.5Z" fill="${f}"/>
    <path d="M33,30.5V39.5M28,41H38"/>`,
  omer: (f) => {
    const ear = `
      <path d="M24,33V12"/>
      <ellipse cx="24" cy="8.4" rx="2" ry="3.4" fill="${f}" stroke-width="2.2"/>
      ${[13, 18.6].map((y) => `<ellipse cx="21.2" cy="${y}" rx="1.9" ry="3.2" transform="rotate(-34 21.2 ${y})" fill="${f}" stroke-width="2.2"/><ellipse cx="26.8" cy="${y}" rx="1.9" ry="3.2" transform="rotate(34 26.8 ${y})" fill="${f}" stroke-width="2.2"/>`).join('')}`;
    return `
      <g transform="rotate(-30 24 33)">${ear}</g>
      <g transform="rotate(30 24 33)">${ear}</g>
      ${ear}
      <path d="M24,35L19.5,44.5M24,35V45M24,35L28.5,44.5"/>
      <path d="M18.8,32.2Q24,34.6 29.2,32.2" stroke-width="3.4"/>`;
  },
  chanukiah: (f) => {
    const xs = [6, 10.4, 14.8, 19.2, 28.8, 33.2, 37.6, 42];
    return `
      ${xs.map((x) => `${flame(x, 9, 5.4, f).replace('/>', ' stroke-width="1.8"/>')}<path d="M${x},16.5V21.5" stroke-width="2.4"/>`).join('')}
      ${flame(24, 2.6, 6, f).replace('/>', ' stroke-width="1.8"/>')}
      <path d="M24,10.5V36"/>
      <path d="M5,22.5H43"/>
      <path d="M14.5,43.5Q14.5,36.5 24,36.5Q33.5,36.5 33.5,43.5Z" fill="${f}"/>`;
  },
  sukkah: (f) => `
    <path d="M5,16Q7.6,9.6 12.6,12Q16,7.2 21.2,10.4Q25.2,6.8 29.8,10.4Q34.4,7.4 37.8,12Q42.6,10 43,16Z" fill="${f}"/>
    <path d="M9,16.5V42M39,16.5V42M5,42.5H43"/>
    <path d="M18,17V22.6M30,17V21" stroke-width="2.2"/>
    <circle cx="18" cy="25.2" r="2.6" fill="${f}" stroke-width="2.2"/>
    ${star(30, 24.6, 3.2)}`,
  shofar: (f) => `
    <path d="M6.5,41.5C10.4,31.6 19.2,30.8 27.4,25.6C33.4,21.8 36.4,15.8 37.4,8.2L44,10.6C43.4,20.4 39.6,27.6 32,31.8C23.8,36.2 13.4,35.2 6.5,41.5Z" fill="${f}"/>
    <path d="M28.6,25.6Q31,28.8 31.6,31.8M20.4,29.6Q22.4,32.2 22.8,34.8" stroke-width="2.2"/>`,
  moon: (f) => `
    ${crescent(21, 26, 15, 28, 19.6, 13.4, f)}
    ${star(35, 10, 3.6)}
    ${star(40, 22, 2.2)}
    ${star(13.4, 7.6, 2)}`,
  chok: (f) => `
    ${openBook(14, f, false)}
    <path d="M10,21Q14.5,19.8 19,21.4M10,26Q14.5,24.8 19,26.4M10,31Q14.5,29.8 19,31.4" stroke-width="2.2"/>
    <path d="M30.5,13.6V26.6L33.2,24.2L35.9,26.6V12.8" stroke-width="2.4" fill="${f}"/>`,
  siddur: (f) => `
    <path d="M38,5.5H15.5Q11,5.5 11,10V38.5Q11,43 15.5,43H38Z" fill="${f}"/>
    <path d="M11,38.5Q11,35 15,35H38" />
    <path d="M24.5,13.2L30,22.7H19Z M24.5,25.8L19,16.3H30Z" stroke-width="2.2"/>`,
  tehillim: (f) => `
    <path d="M11.5,10C21,10 31,17 39.5,34L11.5,41.5Z" fill="${f}" stroke="none"/>
    <path d="M11.5,10C21,10 31,17 39.5,34"/>
    <path d="M11.5,41.5L39.5,34"/>
    <path d="M11.5,8V42"/>
    <path d="M17.5,11.2V40M23,13V38.4M28.5,16.4V37M33.6,22V35.6" stroke-width="2"/>`,
  meals: (f) => `
    <path d="M5,30Q5,22.5 12,23Q15.5,18 21,19.5Q24,16.5 27,19.5Q32.5,18 36,23Q43,22.5 43,30Q43,35 24,35Q5,35 5,30Z" fill="${f}"/>
    <path d="M13,23.6Q16,28.2 14.2,34.4M21,20Q24.4,27 22.2,34.9M28.8,20.4Q31.8,27 30.6,34.8M36,23.6Q38.4,28.2 37.4,34" stroke-width="2.2"/>
    <path d="M4.5,40H43.5"/>`,
  general: (f) => `
    <path d="M13,10H35M13,38H35"/>
    <rect x="13" y="10" width="22" height="28" fill="${f}" stroke="none"/>
    <path d="M17.4,16H22M26,16H30.6M17.4,21.4H22M26,21.4H30.6M17.4,26.8H22M26,26.8H30.6M17.4,32.2H22M26,32.2H30.6" stroke-width="2.2"/>
    <rect x="6" y="7.5" width="7" height="33" rx="3.5" fill="${f}"/>
    <rect x="35" y="7.5" width="7" height="33" rx="3.5" fill="${f}"/>
    <path d="M9.5,3V7.5M9.5,40.5V45M38.5,3V7.5M38.5,40.5V45"/>`,
  occasions: (f) => `
    <path d="M24,13.2C12,13.2 8.4,22 9.2,29.2C10.2,37.4 17,43 24,43C31,43 37.8,37.4 38.8,29.2C39.6,22 36,13.2 24,13.2Z" fill="${f}"/>
    <path d="M18.4,13.6L17.2,6.8L20.8,9.8L24,5L27.2,9.8L30.8,6.8L29.6,13.6"/>
    <path d="M16,30Q17.4,35.6 23,36.8" stroke-width="2.2"/>`,
  hilula: (f) => `
    ${flame(24, 3.6, 10.5, f)}
    <path d="M13,19H35L33.4,41Q24,44 14.6,41Z" fill="${f}"/>
    <path d="M14,26.5H34"/>
    <path d="M24,16.4V26" stroke-width="2.2"/>`,
};
