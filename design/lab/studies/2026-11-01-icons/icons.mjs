// Round 2 of the icon study: flat, coloured illustrations on a 48-unit box, drawn in the logo's navy and
// orange with gold, parchment, silver, wood, leaf and wine. Every colour is a role variable (--i-*), so
// one drawing renders in full colour or in the accent's tones (see ROLES and TONAL in site-template.html).
const c = (role) => `var(--i-${role})`;
const r = (n) => Math.round(n * 100) / 100;

// A flame: an outer teardrop and a yellow core, its tip at (x, top), `h` tall.
const flame = (x, top, h) => {
  const w = h * 0.36;
  const b = top + h;
  const ci = top + h * 0.38;
  return `<path d="M${r(x)},${r(top)}C${r(x + w * 1.25)},${r(top + h * 0.45)} ${r(x + w)},${r(b - h * 0.08)} ${r(x)},${r(b)}C${r(x - w)},${r(b - h * 0.08)} ${r(x - w * 1.25)},${r(top + h * 0.45)} ${r(x)},${r(top)}Z" fill="${c('flame2')}"/>
    <path d="M${r(x)},${r(ci)}C${r(x + w * 0.7)},${r(ci + h * 0.3)} ${r(x + w * 0.6)},${r(b - h * 0.1)} ${r(x)},${r(b - h * 0.04)}C${r(x - w * 0.6)},${r(b - h * 0.1)} ${r(x - w * 0.7)},${r(ci + h * 0.3)} ${r(x)},${r(ci)}Z" fill="${c('flame')}"/>`;
};
// A four-point star of radius s at (x, y).
const star = (x, y, s, fill) => {
  const k = s * 0.28;
  return `<path d="M${r(x)},${r(y - s)}L${r(x + k)},${r(y - k)}L${r(x + s)},${r(y)}L${r(x + k)},${r(y + k)}L${r(x)},${r(y + s)}L${r(x - k)},${r(y + k)}L${r(x - s)},${r(y)}L${r(x - k)},${r(y - k)}Z" fill="${fill}"/>`;
};
// A crescent: the disc (cx, cy, R) less the disc (ox, oy, R2), traced through their two crossings.
const crescent = (cx, cy, R, ox, oy, R2, fill) => {
  const dx = ox - cx;
  const dy = oy - cy;
  const d = Math.hypot(dx, dy);
  const a = (R * R - R2 * R2 + d * d) / (2 * d);
  const h = Math.sqrt(R * R - a * a);
  const mx = cx + (a * dx) / d;
  const my = cy + (a * dy) / d;
  const p1 = [mx + (h * dy) / d, my - (h * dx) / d];
  const p2 = [mx - (h * dy) / d, my + (h * dx) / d];
  return `<path d="M${r(p1[0])},${r(p1[1])}A${R},${R} 0 1 0 ${r(p2[0])},${r(p2[1])}A${R2},${R2} 0 0 1 ${r(p1[0])},${r(p1[1])}Z" fill="${fill}"/>`;
};
// An open book: the navy cover under two parchment pages, with text lines.
const openBook = (top, lines = true) => {
  const b = top + 26;
  const text = lines
    ? [0, 4, 8].map((o) => `<path d="M9,${top + 6 + o}Q14,${top + 5 + o} 20,${top + 6.8 + o}M28,${top + 6.8 + o}Q34,${top + 5 + o} 39,${top + 6 + o}"/>`).join('')
    : '';
  return `<path d="M3,${top + 2}V${b + 2}Q14,${b - 1} 24,${b + 3}Q34,${b - 1} 45,${b + 2}V${top + 2}Z" fill="${c('ink')}"/>
    <path d="M5,${top}Q14,${top - 3} 24,${top + 1}V${b}Q14,${b - 3.5} 5,${b - 1}Z" fill="${c('paper')}"/>
    <path d="M43,${top}Q34,${top - 3} 24,${top + 1}V${b}Q34,${b - 3.5} 43,${b - 1}Z" fill="${c('white')}"/>
    <path d="M24,${top + 1}V${b}" stroke="${c('paper2')}" stroke-width="1"/>
    <g stroke="${c('line')}" stroke-width="1.4" stroke-linecap="round" fill="none">${text}</g>`;
};

export const ICONS = [
  {
    id: 'tefillin',
    he: 'הנחת תפילין',
    idea: 'בית תפילין שחור עם ש׳ מוזהבת, תיתורא ורצועות',
    draw: () => `
      <path d="M14,39C12.5,42.5 9.5,44.5 6,45.5M34,39C35.5,42.5 38.5,44.5 42,45.5" stroke="${c('ink')}" stroke-width="3" stroke-linecap="round" fill="none"/>
      <rect x="8" y="34" width="32" height="6" rx="1.6" fill="${c('ink')}"/>
      <path d="M12,15L18,9H38L32,15Z" fill="${c('ink2')}"/>
      <path d="M32,15L38,9V29L32,35Z" fill="${c('ink3')}"/>
      <rect x="12" y="15" width="20" height="20" rx="1.2" fill="${c('ink')}"/>
      <path d="M16.6,19.6V26.6Q16.6,30 20,30H24Q27.4,30 27.4,26.6V19.6M22,20.2V29.8" stroke="${c('gold')}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },
  {
    id: 'shacharit',
    he: 'תפילת שחרית',
    idea: 'טלית לבנה נופלת בקפלים, עטרה מוזהבת, פסים כחולים וציציות קשורות',
    draw: () => `
      <path d="M8,13.5H40L41.4,35.4Q37,38 32.4,35.8Q28.2,38 24,35.8Q19.8,38 15.6,35.8Q11,38 6.6,35.4Z" fill="${c('white')}" stroke="${c('paper2')}" stroke-width="1.1" stroke-linejoin="round"/>
      <path d="M14.6,14V35.6Q15.2,36.2 15.6,35.8L17.6,14Z M30.4,14L32.4,35.8Q32.8,36.2 33.4,35.6V14Z" fill="${c('paper')}"/>
      <path d="M7.4,25.6Q24,27.6 40.6,25.6L40.8,29Q24,31 7.2,29Z" fill="${c('ink')}"/>
      <path d="M7.1,31.2Q24,33.2 40.9,31.2L41,32.8Q24,34.8 7,32.8Z" fill="${c('ink')}"/>
      <rect x="7" y="9.5" width="34" height="5.6" rx="1.6" fill="${c('gold')}"/>
      <path d="M10,12.3H38" stroke="${c('gold2')}" stroke-width="1.2" stroke-dasharray="2 1.6"/>
      ${[8.6, 39.4].map((x) => `
        <rect x="${x - 1.6}" y="35" width="3.2" height="3.2" rx="1" fill="${c('metal2')}"/>
        <path d="M${x - 1},38V45.4M${x},38V46M${x + 1},38V45.4" stroke="${c('metal2')}" stroke-width="0.9" stroke-linecap="round"/>
        <rect x="${x - 1.4}" y="40.6" width="2.8" height="1.4" rx="0.7" fill="${c('metal2')}"/>`).join('')}`,
  },
  {
    id: 'mincha',
    he: 'תפילת מנחה',
    idea: 'סידור פתוח ושמש של אחר הצהריים',
    draw: () => `
      <circle cx="31" cy="14" r="10" fill="${c('flame')}" opacity="0.28"/>
      <circle cx="31" cy="14" r="6.6" fill="${c('flame')}"/>
      <circle cx="31" cy="14" r="6.6" fill="${c('flame2')}" opacity="0.35"/>
      ${openBook(19)}`,
  },
  {
    id: 'maariv',
    he: 'תפילת ערבית',
    idea: 'סידור פתוח, ירח וכוכבים',
    draw: () => `
      ${crescent(21, 12, 8.5, 25.5, 9, 7.4, c('gold'))}
      ${star(35, 8, 3, c('gold'))}
      ${star(39.5, 15.5, 1.8, c('gold'))}
      ${openBook(21)}`,
  },
  {
    id: 'shema',
    he: 'קריאת שמע',
    idea: 'מזוזה מוזהבת עם ש׳ (קריאת שמע כתובה בה)',
    draw: () => `
      <g transform="rotate(20 24 24)">
        <rect x="18.5" y="4.5" width="11" height="39" rx="5.5" fill="${c('gold')}"/>
        <rect x="18.5" y="4.5" width="5.5" height="39" rx="2.75" fill="${c('gold2')}" opacity="0.5"/>
        <rect x="25.2" y="8" width="1.8" height="32" rx="0.9" fill="${c('white')}" opacity="0.55"/>
        <path d="M20.8,13V17.8Q20.8,20 23,20H25Q27.2,20 27.2,17.8V13M24,13.4V19.8" stroke="${c('ink')}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="24" cy="8" r="1.1" fill="${c('gold2')}"/>
        <circle cx="24" cy="40" r="1.1" fill="${c('gold2')}"/>
      </g>`,
  },
  {
    id: 'brachot',
    he: 'ברכות השחר',
    idea: 'נטלה מלאה מים לנטילת ידיים',
    draw: () => `
      <path d="M14.4,18H9.5V28H15.2M33.6,18H38.5V28H32.8" stroke="${c('metal2')}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <path d="M13.5,12H34.5L31.8,38.5Q24,41.6 16.2,38.5Z" fill="${c('metal')}"/>
      <path d="M24,12H34.5L31.8,38.5Q28,40 24,40.4Z" fill="${c('metal2')}" opacity="0.55"/>
      <rect x="16.5" y="15" width="2.2" height="20" rx="1.1" fill="${c('white')}" opacity="0.7"/>
      <rect x="12" y="9.6" width="24" height="4.4" rx="2.2" fill="${c('metal2')}"/>
      <ellipse cx="24" cy="11.8" rx="10" ry="1.4" fill="${c('water')}"/>`,
  },
  {
    id: 'night',
    he: 'קריאת שמע על המיטה',
    idea: 'מיטה עם כרית ושמיכה, וירח',
    draw: () => `
      ${crescent(35, 11, 6.5, 38.5, 8.6, 5.6, c('gold'))}
      ${star(25, 9, 2, c('gold'))}
      <rect x="5" y="19" width="5.5" height="25" rx="2" fill="${c('wood')}"/>
      <rect x="40" y="36" width="3.5" height="8" rx="1.2" fill="${c('wood2')}"/>
      <rect x="10" y="33" width="34" height="5" rx="1.5" fill="${c('wood')}"/>
      <rect x="11.5" y="25" width="11" height="7.5" rx="3.6" fill="${c('white')}" stroke="${c('paper2')}" stroke-width="1"/>
      <path d="M20,28.5Q20,26.5 22,26.5H41Q43,26.5 43,28.5V33H20Z" fill="${c('acc')}"/>
      <path d="M20,30.5H43V33H20Z" fill="${c('acc2')}" opacity="0.6"/>`,
  },
  {
    id: 'candles',
    he: 'הדלקת נרות שבת',
    idea: 'שני נרות דולקים בפמוטי כסף',
    draw: () => {
      const one = (x) => `
        <circle cx="${x}" cy="10.5" r="6.5" fill="${c('flame')}" opacity="0.25"/>
        ${flame(x, 4, 10.5)}
        <path d="M${x},14.4V16.2" stroke="${c('ink')}" stroke-width="1.2" stroke-linecap="round"/>
        <rect x="${x - 2.8}" y="16" width="5.6" height="16.5" rx="1.2" fill="${c('white')}" stroke="${c('paper2')}" stroke-width="1"/>
        <path d="M${x - 5.2},32.5H${x + 5.2}L${x + 3.2},35.6H${x - 3.2}Z" fill="${c('metal')}"/>
        <rect x="${x - 1.3}" y="35.4" width="2.6" height="5.8" fill="${c('metal2')}"/>
        <rect x="${x - 5.6}" y="40.6" width="11.2" height="3.2" rx="1.6" fill="${c('metal')}"/>`;
      return one(16) + one(32);
    },
  },
  {
    id: 'havdalah',
    he: 'הבדלה',
    idea: 'נר הבדלה קלוע בכחול ולבן וגביע יין',
    draw: () => `
      <circle cx="13" cy="9" r="7" fill="${c('flame')}" opacity="0.25"/>
      ${flame(13, 2.2, 12.5)}
      <rect x="8" y="15" width="10" height="28" rx="2" fill="${c('white')}" stroke="${c('paper2')}" stroke-width="1"/>
      <path d="M8.5,19L17.5,23.6V27.4L8.5,22.8ZM8.5,26.6L17.5,31.2V35L8.5,30.4ZM8.5,34.2L17.5,38.8V42.5H16L8.5,38Z" fill="${c('blue')}"/>
      <path d="M24,17H42V20.5Q42,30 33,30Q24,30 24,20.5Z" fill="${c('metal')}"/>
      <path d="M25.6,20.2H40.4Q40.4,28.2 33,28.4Q25.6,28.2 25.6,20.2Z" fill="${c('wine')}"/>
      <rect x="31.7" y="29.6" width="2.6" height="9.6" fill="${c('metal2')}"/>
      <rect x="27" y="39" width="12" height="3.6" rx="1.8" fill="${c('metal')}"/>`,
  },
  {
    id: 'omer',
    he: 'ספירת העומר',
    idea: 'אלומת שעורים מוזהבת קשורה בסרט',
    draw: () => {
      const ear = `
        <path d="M24,33V11" stroke="${c('gold2')}" stroke-width="1.6" stroke-linecap="round"/>
        <ellipse cx="24" cy="7.6" rx="1.9" ry="3.2" fill="${c('gold')}"/>
        ${[11.4, 15.4, 19.4].map((y) => `<ellipse cx="21.6" cy="${y}" rx="1.8" ry="3" transform="rotate(-32 21.6 ${y})" fill="${c('gold')}"/><ellipse cx="26.4" cy="${y}" rx="1.8" ry="3" transform="rotate(32 26.4 ${y})" fill="${c('gold')}"/>`).join('')}`;
      return `
        <g transform="rotate(-24 24 33)">${ear}</g>
        <g transform="rotate(24 24 33)">${ear}</g>
        ${ear}
        <path d="M24,34L19,45M24,34L24,45.5M24,34L29,45" stroke="${c('gold2')}" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M18.6,31.4Q24,34 29.4,31.4L30,35.4Q24,38 18,35.4Z" fill="${c('acc')}"/>`;
    },
  },
  {
    id: 'chanukiah',
    he: 'נרות חנוכה',
    idea: 'חנוכייה מוזהבת עם שמונה נרות דולקים ושמש',
    draw: () => {
      const xs = [5.5, 9.8, 14.1, 18.4, 29.6, 33.9, 38.2, 42.5];
      const candle = (x, y) => `
        ${flame(x, y - 6.4, 6)}
        <rect x="${r(x - 0.95)}" y="${y}" width="1.9" height="5.2" fill="${c('white')}" stroke="${c('paper2')}" stroke-width="0.6"/>
        <rect x="${r(x - 1.8)}" y="${y + 5}" width="3.6" height="2.6" rx="0.8" fill="${c('gold2')}"/>`;
      return `
        ${xs.map((x) => candle(x, 15)).join('')}
        ${candle(24, 8.5)}
        <rect x="22.6" y="18" width="2.8" height="6" fill="${c('gold')}"/>
        <rect x="3.5" y="22.4" width="41" height="3.2" rx="1.6" fill="${c('gold')}"/>
        <rect x="22.4" y="25" width="3.2" height="11" fill="${c('gold')}"/>
        <path d="M13.5,43.6Q13.5,36 24,36Q34.5,36 34.5,43.6Z" fill="${c('gold2')}"/>
        <rect x="23.2" y="26" width="1" height="9.4" fill="${c('white')}" opacity="0.5"/>`;
    },
  },
  {
    id: 'sukkah',
    he: 'אושפיזין',
    idea: 'סוכה מעץ עם סכך ירוק וקישוטים',
    draw: () => `
      <rect x="9.5" y="18" width="29" height="24" fill="${c('paper')}"/>
      <rect x="7" y="16.5" width="3.4" height="27" rx="1" fill="${c('wood')}"/>
      <rect x="37.6" y="16.5" width="3.4" height="27" rx="1" fill="${c('wood')}"/>
      <rect x="4" y="42" width="40" height="3.4" rx="1.7" fill="${c('wood2')}"/>
      <rect x="5.5" y="15.6" width="37" height="2.8" rx="1" fill="${c('wood')}"/>
      <ellipse cx="10.5" cy="13.5" rx="6.5" ry="4.2" fill="${c('leaf')}"/>
      <ellipse cx="20" cy="11.6" rx="7.5" ry="4.8" fill="${c('leaf2')}"/>
      <ellipse cx="29" cy="12" rx="7.5" ry="4.6" fill="${c('leaf')}"/>
      <ellipse cx="38" cy="13.6" rx="6.5" ry="4.2" fill="${c('leaf2')}"/>
      <ellipse cx="24.5" cy="14.4" rx="6" ry="2.8" fill="${c('leaf')}"/>
      <path d="M17,18.4V24M31,18.4V22.4M24,18.4V27" stroke="${c('wood2')}" stroke-width="1" fill="none"/>
      <circle cx="17" cy="26.4" r="2.6" fill="${c('wine')}"/>
      <circle cx="31" cy="24.8" r="2.5" fill="${c('gold')}"/>
      ${star(24, 29.6, 2.8, c('acc'))}`,
  },
  {
    id: 'shofar',
    he: 'סליחות',
    idea: 'שופר של איל, מהקצה הכהה אל הפה הבהיר',
    draw: (uid) => `
      <defs><linearGradient id="${uid}" x1="6" y1="42" x2="42" y2="9" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${c('wood2')}"/><stop offset="0.55" stop-color="${c('wood')}"/><stop offset="1" stop-color="${c('horn')}"/>
      </linearGradient></defs>
      <path d="M5.5,42C9.5,31.5 19,30.6 27.4,25.4C33.6,21.6 36.6,15.6 37.6,7.6L44.6,10.2C44,20.2 40,27.6 32.2,31.8C23.8,36.2 13,35 7.6,43.6Z" fill="url(#${uid})"/>
      <ellipse cx="41.1" cy="8.9" rx="3.7" ry="1.7" transform="rotate(20 41.1 8.9)" fill="${c('wood2')}"/>
      <path d="M29,25.2Q31.6,28.6 32.2,31.6M21,29.2Q23,31.8 23.4,34.6M13.6,33.4Q15,35.4 15.2,37.6" stroke="${c('wood2')}" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.6"/>`,
  },
  {
    id: 'moon',
    he: 'קידוש לבנה',
    idea: 'ירח מוזהב בשמי לילה עם כוכבים',
    draw: () => `
      <circle cx="24" cy="24" r="20" fill="${c('ink')}"/>
      ${crescent(22, 25, 12, 28, 20, 10.6, c('gold'))}
      ${star(34, 13, 2.6, c('white'))}
      ${star(37.5, 26, 1.6, c('white'))}
      ${star(13, 13, 1.4, c('white'))}`,
  },
  {
    id: 'chok',
    he: 'חק לישראל',
    idea: 'ספר לימוד פתוח עם סימנייה כתומה',
    draw: () => `
      ${openBook(12)}
      <path d="M31,10.6V25L33.2,22.6L35.4,25V10.2Z" fill="${c('acc')}"/>`,
  },
  {
    id: 'siddur',
    he: 'סידור',
    idea: 'סידור כחול עם מגן דוד מוזהב',
    draw: () => `
      <rect x="9" y="8.5" width="27" height="34" rx="2" fill="${c('paper')}" stroke="${c('paper2')}" stroke-width="1"/>
      <rect x="12" y="5.5" width="27" height="35.5" rx="3" fill="${c('ink')}"/>
      <rect x="34" y="5.5" width="5" height="35.5" rx="2.2" fill="${c('ink3')}"/>
      <rect x="15" y="8.6" width="16" height="29.2" rx="1.4" stroke="${c('gold2')}" stroke-width="1" fill="none"/>
      <path d="M23,16.4L29.24,27.2H16.76Z M23,30.8L16.76,20H29.24Z" stroke="${c('gold')}" stroke-width="1.8" stroke-linejoin="round" fill="none"/>`,
  },
  {
    id: 'tehillim',
    he: 'תהילים',
    idea: 'כינור מוזהב של דוד המלך',
    draw: () => `
      <path d="M12,10C21,10 31,17 39.5,34" stroke="${c('gold')}" stroke-width="4.2" stroke-linecap="round" fill="none"/>
      <path d="M12,41.5L39.5,34" stroke="${c('gold2')}" stroke-width="5" stroke-linecap="round"/>
      <g stroke="${c('line2')}" stroke-width="1.1" stroke-linecap="round">
        <path d="M16.5,10.8V40.3M21.5,12.4V38.9M26.5,15.2V37.6M31.5,19.6V36.2M35.8,25.4V35"/>
      </g>
      <rect x="8.4" y="8" width="5.6" height="35.5" rx="2.8" fill="${c('gold2')}"/>
      <circle cx="11.2" cy="7.4" r="3" fill="${c('gold')}"/>`,
  },
  {
    id: 'meals',
    he: 'סעודות וברכת המזון',
    idea: 'חלה קלועה על קרש',
    draw: () => `
      <rect x="3.5" y="35.5" width="41" height="5.5" rx="2.75" fill="${c('wood')}"/>
      <ellipse cx="24" cy="29" rx="19" ry="7.6" fill="${c('gold2')}"/>
      ${[[11.5, 28, -28], [19.2, 25.6, -28], [27.4, 25.6, 28], [35.6, 28, 28]].map(([x, y, a]) => `<ellipse cx="${x}" cy="${y}" rx="5.4" ry="7.4" transform="rotate(${a} ${x} ${y})" fill="${c('gold')}"/>`).join('')}
      ${[[10.4, 25.4], [18.4, 22.4], [26.4, 22.4], [34.4, 25.4]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2" ry="1.2" fill="${c('white')}" opacity="0.45"/>`).join('')}`,
  },
  {
    id: 'general',
    he: 'תפילות כלליות',
    idea: 'ספר תורה עם עצי חיים וכתרים',
    draw: () => `
      <rect x="12" y="9" width="24" height="30" fill="${c('paper')}"/>
      ${[13.4, 17, 20.6, 24.2, 27.8, 31.4, 35].map((y) => `<path d="M16,${y}H22.6M25.4,${y}H32" stroke="${c('line')}" stroke-width="1.3" stroke-linecap="round"/>`).join('')}
      ${[10, 38].map((x) => `
        <rect x="${x - 1.2}" y="2.5" width="2.4" height="6" fill="${c('wood2')}"/>
        <rect x="${x - 1.2}" y="39.5" width="2.4" height="6" fill="${c('wood2')}"/>
        <rect x="${x - 4}" y="7" width="8" height="34" rx="4" fill="${c('wood')}"/>
        <rect x="${x - 2.4}" y="9" width="1.8" height="30" rx="0.9" fill="${c('white')}" opacity="0.3"/>
        <circle cx="${x}" cy="2.8" r="2.2" fill="${c('gold')}"/>`).join('')}`,
  },
  {
    id: 'occasions',
    he: 'חגים ומועדים',
    idea: 'רימון עם כתר ועלה',
    draw: () => `
      <path d="M31,9Q37.5,4.6 42,8.6Q36.6,13.2 31,9Z" fill="${c('leaf')}"/>
      <path d="M18,14.5L16.8,6.8L20.6,10L24,5L27.4,10L31.2,6.8L30,14.5Z" fill="${c('wine2')}"/>
      <circle cx="24" cy="28" r="15.5" fill="${c('wine')}"/>
      ${crescent(24, 28, 15.5, 19, 23, 15.5, c('wine2'))}
      <ellipse cx="17.6" cy="21.4" rx="4.2" ry="2.4" transform="rotate(-38 17.6 21.4)" fill="${c('white')}" opacity="0.35"/>`,
  },
  {
    id: 'hilula',
    he: 'הילולות',
    idea: 'נר נשמה דולק בכוס זכוכית',
    draw: () => `
      <circle cx="24" cy="11" r="8" fill="${c('flame')}" opacity="0.25"/>
      ${flame(24, 3.6, 13)}
      <path d="M12.5,19H35.5L33.8,42.4Q24,45 14.2,42.4Z" fill="${c('metal')}" opacity="0.65" stroke="${c('metal2')}" stroke-width="1.2"/>
      <path d="M14,26H34L33.2,41.4Q24,43.6 14.8,41.4Z" fill="${c('white')}"/>
      <path d="M24,16.6V26" stroke="${c('ink')}" stroke-width="1.3" stroke-linecap="round"/>
      <rect x="16" y="21" width="2.2" height="18.6" rx="1.1" fill="${c('white')}" opacity="0.8"/>`,
  },
];
