import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const CURRENT = {
  gold: {
    bg: '#F6F1E8',
    surface: '#FFFDF9',
    surface2: '#F1EADF',
    text: '#1D2240',
    textSub: '#69645D',
    textMuted: '#6A655E',
    border: '#EBE3D6',
    gold: '#F08A3C',
    onGold: '#2B1608',
    goldLight: '#FDE9D5',
    goldText: '#A04A0C',
    goldWash: '#F08A3C09',
    goldWashStrong: '#F08A3C18',
    urgent: '#CC2A2A',
    onUrgent: '#FFFFFF',
    urgentBg: '#FEF2F2',
    urgentBorder: '#FECACA',
    warning: '#B7791F',
    safe: '#0F9060',
    optional: '#1F5F6E',
    optionalBg: '#E8F2F4',
    minyan: '#6B3FA0',
    tabBg: '#FFFDF9',
    shadow: 'rgba(94,62,28,0.08)',
    shadowStrong: 'rgba(94,62,28,0.18)',
    overlay: 'rgba(29,34,64,0.45)',
  },
  pink: {
    bg: '#F8F0EE',
    surface: '#FFFDF9',
    surface2: '#F3E6E4',
    text: '#2E1D2A',
    textSub: '#6E6068',
    textMuted: '#72646C',
    border: '#EEDFDD',
    gold: '#E2617F',
    onGold: '#2A0C15',
    goldLight: '#FBE3E6',
    goldText: '#A8304F',
    goldWash: '#E2617F09',
    goldWashStrong: '#E2617F18',
    urgent: '#CC2A2A',
    onUrgent: '#FFFFFF',
    urgentBg: '#FEF2F2',
    urgentBorder: '#FECACA',
    warning: '#B7791F',
    safe: '#0F9060',
    optional: '#1F5F6E',
    optionalBg: '#E8F2F4',
    minyan: '#6B3FA0',
    tabBg: '#FFFDF9',
    shadow: 'rgba(110,40,60,0.08)',
    shadowStrong: 'rgba(110,40,60,0.18)',
    overlay: 'rgba(46,29,42,0.45)',
  },
  purple: {
    bg: '#F7F4FE',
    surface: '#FFFFFF',
    surface2: '#ECE6FA',
    text: '#261C3F',
    textSub: '#6E6686',
    textMuted: '#746C8C',
    border: '#DCD2F2',
    gold: '#7538E0',
    onGold: '#FFFFFF',
    goldLight: '#EDE4FF',
    goldText: '#7538E0',
    goldWash: '#7538E009',
    goldWashStrong: '#7538E018',
    urgent: '#CC2A2A',
    onUrgent: '#FFFFFF',
    urgentBg: '#FEF2F2',
    urgentBorder: '#FECACA',
    warning: '#B7791F',
    safe: '#0F9060',
    optional: '#1F5F6E',
    optionalBg: '#E8F2F4',
    minyan: '#0F766E',
    tabBg: '#FFFFFF',
    shadow: 'rgba(74,31,158,0.10)',
    shadowStrong: 'rgba(74,31,158,0.22)',
    overlay: 'rgba(42,19,102,0.5)',
  },
  blue: {
    bg: '#F2F6FC',
    surface: '#FFFFFF',
    surface2: '#E4ECF7',
    text: '#14213D',
    textSub: '#5C6B84',
    textMuted: '#66758C',
    border: '#CDDAEB',
    gold: '#1F5FD0',
    onGold: '#FFFFFF',
    goldLight: '#DEE9FB',
    goldText: '#1F5FD0',
    goldWash: '#1F5FD009',
    goldWashStrong: '#1F5FD018',
    urgent: '#CC2A2A',
    onUrgent: '#FFFFFF',
    urgentBg: '#FEF2F2',
    urgentBorder: '#FECACA',
    warning: '#B7791F',
    safe: '#0F9060',
    optional: '#1F5F6E',
    optionalBg: '#E8F2F4',
    minyan: '#6B3FA0',
    tabBg: '#FFFFFF',
    shadow: 'rgba(27,58,128,0.10)',
    shadowStrong: 'rgba(27,58,128,0.22)',
    overlay: 'rgba(11,26,58,0.5)',
  },
  dark: {
    bg: '#0E1626',
    surface: '#172238',
    surface2: '#1E2B45',
    text: '#EEF1F7',
    textSub: '#9DA9BF',
    textMuted: '#A3AEC3',
    border: '#26334D',
    gold: '#F59A4A',
    onGold: '#1E1006',
    goldLight: '#3A2D26',
    goldText: '#F7A65E',
    goldWash: '#F59A4A09',
    goldWashStrong: '#F59A4A18',
    urgent: '#F45F5F',
    onUrgent: '#0E1626',
    urgentBg: '#2A1515',
    urgentBorder: '#7F1D1D',
    warning: '#FBBF24',
    safe: '#10B981',
    optional: '#8FCFDC',
    optionalBg: '#1C3646',
    minyan: '#C9A8EE',
    tabBg: '#172238',
    shadow: 'rgba(0,0,0,0.35)',
    shadowStrong: 'rgba(0,0,0,0.55)',
    overlay: 'rgba(0,0,0,0.6)',
  },
  plum: {
    bg: '#1A1026',
    surface: '#261735',
    surface2: '#31204A',
    text: '#F4E9F8',
    textSub: '#BBA3CC',
    textMuted: '#C4AED3',
    border: '#3E2A56',
    gold: '#F48FBC',
    onGold: '#2A0F20',
    goldLight: '#3C2238',
    goldText: '#F48FBC',
    goldWash: '#F48FBC09',
    goldWashStrong: '#F48FBC18',
    urgent: '#FF6B6B',
    onUrgent: '#1A1026',
    urgentBg: '#3A1A24',
    urgentBorder: '#7F2A3A',
    warning: '#F5B041',
    safe: '#3DD598',
    optional: '#9DD6E8',
    optionalBg: '#1E3240',
    minyan: '#C9A8EE',
    tabBg: '#261735',
    shadow: 'rgba(0,0,0,0.35)',
    shadowStrong: 'rgba(0,0,0,0.60)',
    overlay: 'rgba(0,0,0,0.6)',
  },
};

const NAMES = ['gold', 'pink', 'purple', 'blue', 'dark', 'plum'];
const LIGHT = ['pink', 'purple', 'blue'];
const DARK = ['dark', 'plum'];
const LABELS = { gold: 'כתום', pink: 'ורוד', purple: 'סגול', blue: 'כחול', dark: 'כהה', plum: 'שזיף' };
const AA = 4.5;
const AAA = 7;
const SHADOW_ALPHA = { shadow: 0.08, shadowStrong: 0.18 };

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const rgbOfHex = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hexOfRgb = (rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
const RGBA = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/;
const rgbaParts = (value) => RGBA.exec(value).slice(1).map(Number);

function oklchOfRgb(rgb) {
  const [r, g, b] = rgb.map((c) => toLinear(c / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

const oklch = (hex) => oklchOfRgb(rgbOfHex(hex));

function linearOfOklch({ L, C, h }) {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (color) => linearOfOklch(color).every((c) => c >= -1e-4 && c <= 1 + 1e-4);

function rgbOfOklch(color) {
  let chroma = color.C;
  if (!inGamut(color)) {
    let low = 0;
    let high = chroma;
    for (let i = 0; i < 32; i++) {
      const mid = (low + high) / 2;
      if (inGamut({ ...color, C: mid })) low = mid;
      else high = mid;
    }
    chroma = low;
  }
  return linearOfOklch({ ...color, C: chroma }).map((c) => Math.round(Math.min(1, Math.max(0, toGamma(c))) * 255));
}

const hexOfOklch = (color) => hexOfRgb(rgbOfOklch(color));

const luminance = (hex) => {
  const [r, g, b] = rgbOfHex(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
};

const hueMidpoint = (a, b) => (a + (((b - a + 540) % 360) - 180) / 2 + 360) % 360;

function reach(hex, backgrounds, min, step) {
  let color = oklch(hex);
  let out = hex;
  while (backgrounds.some((background) => contrast(out, background) < min)) {
    color = { ...color, L: color.L + step };
    if (color.L <= 0 || color.L >= 1) throw new Error(`${hex} cannot reach ${min}:1`);
    out = hexOfOklch(color);
  }
  return out;
}

const GOLD = CURRENT.gold;
const GOLD_LADDER = Object.fromEntries(['bg', 'surface', 'surface2', 'border'].map((t) => [t, oklch(GOLD[t])]));
const GOLD_STEP = {
  page: GOLD_LADDER.surface.L - GOLD_LADDER.bg.L,
  surface2: GOLD_LADDER.surface.L - GOLD_LADDER.surface2.L,
  border: GOLD_LADDER.surface.L - GOLD_LADDER.border.L,
};
const GOLD_SHADOW = oklchOfRgb(rgbaParts(GOLD.shadow).slice(0, 3));
const SHADOW_DEPTH = GOLD_SHADOW.L / GOLD_LADDER.bg.L;
const DARK_TEXT_LIFT = oklch(CURRENT.dark.goldText).L - oklch(CURRENT.dark.gold).L;
const isInk = (hex) => oklch(hex).L < 0.5;

const shadowsOf = (color) => {
  const [r, g, b] = rgbOfOklch(color);
  return Object.fromEntries(Object.entries(SHADOW_ALPHA).map(([token, alpha]) => [token, `rgba(${r},${g},${b},${alpha})`]));
};

function onGoldFor(current) {
  const ink = isInk(current.onGold) ? current.onGold : hexOfOklch({ ...oklch(GOLD.onGold), h: oklch(current.gold).h });
  return contrast(ink, current.gold) >= AA ? ink : '#FFFFFF';
}

function deriveLight(current) {
  const page = oklch(current.bg).h;
  const [bg, surface, surface2, border] = ['bg', 'surface', 'surface2', 'border'].map((token) =>
    hexOfOklch({ ...GOLD_LADDER[token], h: page }),
  );
  const separate = current.goldText !== current.gold && oklch(current.goldText).L < oklch(current.gold).L;
  const goldText = separate
    ? reach(current.goldText, [surface, bg, current.goldLight], AA, -0.002)
    : reach(reach(current.gold, [surface], AAA, -0.002), [surface, bg, current.goldLight], AA, -0.002);
  const accentHue = oklch(current.gold).h;
  return {
    bg,
    surface,
    surface2,
    border,
    goldText,
    tabBg: surface,
    ...shadowsOf({ L: GOLD_SHADOW.L, C: GOLD_SHADOW.C, h: hueMidpoint(accentHue, page) }),
  };
}

function deriveDark(current) {
  const card = oklch(current.surface);
  const lift = (token, step) => hexOfOklch({ ...oklch(current[token]), L: card.L + step });
  const separate = current.goldText !== current.gold;
  const accent = oklch(current.gold);
  const goldText = reach(
    separate ? current.goldText : hexOfOklch({ ...accent, L: accent.L + DARK_TEXT_LIFT }),
    [current.surface, current.bg, current.goldLight],
    AA,
    0.002,
  );
  const page = oklch(current.bg);
  return {
    bg: current.bg,
    surface: current.surface,
    surface2: lift('surface2', GOLD_STEP.surface2),
    border: lift('border', GOLD_STEP.border),
    goldText,
    tabBg: current.surface,
    ...shadowsOf({ L: page.L * SHADOW_DEPTH, C: page.C, h: page.h }),
  };
}

const TEXT_FLOORS = [
  ['text', ['bg', 'surface', 'surface2']],
  ['textSub', ['surface']],
  ['textMuted', ['surface']],
];

function derive(name) {
  const current = CURRENT[name];
  if (name === 'gold') return { ...current };
  const dark = DARK.includes(name);
  const changes = dark ? deriveDark(current) : deriveLight(current);
  const next = { ...current, ...changes, onGold: onGoldFor(current) };
  for (const [token, backgrounds] of TEXT_FLOORS) {
    next[token] = reach(
      next[token],
      backgrounds.map((b) => next[b]),
      AA,
      dark ? 0.002 : -0.002,
    );
  }
  next.goldWash = `${next.gold}09`;
  next.goldWashStrong = `${next.gold}18`;
  return Object.fromEntries(Object.keys(current).map((token) => [token, next[token]]));
}

const PROPOSED = Object.fromEntries(NAMES.map((name) => [name, derive(name)]));

const KEY_PAIRS = [
  ['text', 'surface', 'טקסט על כרטיס'],
  ['textSub', 'surface', 'טקסט משני על כרטיס'],
  ['goldText', 'surface', 'טקסט אקסנט על כרטיס'],
  ['onGold', 'gold', 'תווית על מילוי האקסנט'],
];

const THEME_TEST_PAIRS = [
  ['text', 'bg', 'טקסט על הדף', AA],
  ['text', 'surface2', 'טקסט על משטח משני', AA],
  ['textMuted', 'surface', 'טקסט עמום על כרטיס', AA],
  ['goldText', 'bg', 'טקסט אקסנט על הדף', AA],
  ['goldText', 'goldLight', 'טקסט אקסנט על גוון האקסנט', AA],
  ['onUrgent', 'urgent', 'תווית על מילוי דחוף', AA],
  ['urgent', 'urgentBg', 'דחוף על רקע דחוף', AA],
  ['urgent', 'surface', 'דחוף על כרטיס', AA],
];

const ratioOf = (palette, fg, bg) => contrast(palette[fg], palette[bg]);

for (const name of NAMES) {
  const failing = [...KEY_PAIRS.map(([fg, bg]) => [fg, bg, AA]), ...THEME_TEST_PAIRS]
    .map(([fg, bg, min]) => ({ pair: `${fg}/${bg}`, ratio: ratioOf(PROPOSED[name], fg, bg), min }))
    .filter(({ ratio, min }) => ratio < min);
  if (failing.length) throw new Error(`${name}: ${failing.map((f) => `${f.pair} ${f.ratio.toFixed(2)}`).join(', ')}`);
  if (LIGHT.includes(name) && PROPOSED[name].surface === '#FFFFFF') throw new Error(`${name}: pure white surface`);
}

const NOTES = {
  gold: 'הייחוס: הסולם, המדרגות, הצל והטקסטים של כל שאר הפלטות נגזרים ממנו. ללא שינוי.',
  pink: 'הכרטיס כבר לא הלבן החמים של כתום אלא לבן ורדרד, ולכן כתום וורוד נבדלים גם בבורר. הדף, המשטח המשני והקו עוברים לסולם של כתום בגוון הדף הוורוד. הצל מתקרב לגוון הדף.',
  purple: 'הכרטיס מפסיק להיות לבן טהור, הדף יורד מעט כדי לשמור על מדרגת הכרטיס של כתום, והקו נרגע מ-<code dir="ltr">#DCD2F2</code> הבולט. טקסט האקסנט נפרד מהמילוי ויורד ל-7:1. הצל חוזר ל-0.08/0.18.',
  blue: 'כמו בסגול: כרטיס לבן-כחלחל במקום <code dir="ltr">#FFFFFF</code>, דף במדרגה של כתום, קו רך יותר, טקסט אקסנט נפרד ב-7:1 וצל ב-0.08/0.18.',
  dark: 'הדף והכרטיס נשארים (כלל הלבן לא חל על פלטה כהה). המשטח המשני והקו מתרחקים מהכרטיס במדרגות של כתום. הצל השחור מתחלף בצל כחול-לילה ב-0.08/0.18.',
  plum: 'הדף והכרטיס נשארים. טקסט האקסנט נפרד מהמילוי ובהיר ממנו כמו בכהה, המשטח המשני והקו במדרגות של כתום, וצל בגוון השזיף ב-0.08/0.18.',
};

const DRAW = {
  shacharit:
    '<path d="M7.5,16A4.5,4.5 0 0 1 16.5,16Z"/><path d="M3.5,16H20.5"/><path d="M7.5,19.5H16.5"/><path d="M12,8.8V6.3"/><path d="M6.91,10.91L5.14,9.14"/><path d="M17.09,10.91L18.86,9.14"/>',
  tefillin:
    '<rect x="8" y="4" width="8" height="8" rx="1.5"/><rect x="10" y="6" width="4" height="4" stroke-width="1"/><path d="M6,13H18"/><path d="M9,13C9,17 7,17 7,21"/><path d="M15,13C15,17 17,17 17,21"/>',
  siddur: '<path d="M12,6.5Q8.5,4.5 3.5,5.5V17.5Q8.5,16.5 12,19.5Z"/><path d="M12,6.5Q15.5,4.5 20.5,5.5V17.5Q15.5,16.5 12,19.5Z"/>',
  check: '<path d="M4.5,12.5L9.5,17.5L19.5,6.5"/>',
  chevronDown: '<path d="M6,9L12,15L18,9"/>',
  plus: '<path d="M12,5V19M5,12H19"/>',
  minus: '<path d="M5,12H19"/>',
  home: '<path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z"/>',
  more: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  history:
    '<path d="M4 19V5M4 19H21"/><rect x="7" y="11" width="3" height="5" rx="1"/><rect x="12" y="8" width="3" height="8" rx="1"/><rect x="17" y="4" width="3" height="12" rx="1"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z"/>',
};

const icon = (name, size, token, width = 1.8) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><g style="stroke:var(--c-${token})" fill="none" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${DRAW[name]}</g></svg>`;

const pauseIcon = (token) =>
  `<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path style="fill:var(--c-${token})" d="M6.5 5h4v14h-4zM13.5 5h4v14h-4z"/></svg>`;

const varsOf = (palette) =>
  Object.entries(palette)
    .map(([token, value]) => `--c-${token}:${value}`)
    .join(';');

const TABS = [
  ['more', 'עוד'],
  ['siddur', 'סידור'],
  ['home', 'בית'],
  ['history', 'היסטוריה'],
  ['settings', 'הגדרות'],
];

const tabBar = () =>
  `<div class="strip"><div class="tabbar">${TABS.map(([name, label]) => {
    const focused = name === 'home';
    return `<div class="tab${focused ? ' focused' : ''}"><span class="pill">${icon(name, 22, focused ? 'gold' : 'textMuted')}</span><span class="tab-label">${label}</span><span class="underline"></span></div>`;
  }).join('')}</div></div>`;

const phone = (palette, caption) => `
<figure class="phone-wrap">
  <figcaption>${caption}</figcaption>
  <div class="phone" style="${varsOf(palette)}">
    <div class="screen">
      <header class="nav">
        <div><div class="nav-title">י״ז בחשון</div><div class="nav-sub">יום רביעי · 28.10.2026 · ירושלים</div></div>
        <span class="counter">2/5</span>
      </header>
      <div class="card">
        <div class="m-body">
          <div class="m-row">
            <span class="tile">${icon('shacharit', 22, 'gold')}</span>
            <div class="meta"><div class="m-name">שחרית</div><div class="m-status">עד סוף זמן תפילה · 10:14</div></div>
            <div class="m-actions"><span class="circle">${icon('siddur', 16, 'textSub')}</span><span class="circle">${icon('check', 16, 'textSub', 2.2)}</span></div>
          </div>
          <div class="ribbon"><div class="r-label">נותר: 1:52 שעות</div><div class="track"><div class="fill"></div></div></div>
        </div>
      </div>
      <div class="card done">
        <div class="m-body">
          <div class="m-row">
            <span class="tile">${icon('tefillin', 22, 'textMuted')}</span>
            <div class="meta"><div class="m-name">תפילין</div><div class="m-done">${icon('check', 14, 'safe')}<span>בוצע</span></div></div>
            <div class="m-actions"><span class="done-mark">${icon('check', 16, 'onGold', 2.2)}</span></div>
          </div>
        </div>
      </div>
      <div class="banner">יש כאן מצוות שממתינות לסימון. לסימון</div>
      <div class="btn">סיימתי</div>
      <div class="divider"><span>הקורא</span></div>
      <div class="picker"><span class="picker-label">ברכות השחר</span>${icon('chevronDown', 18, 'textMuted', 2.2)}</div>
      <div class="toolbar">
        <div class="segmented"><span class="seg on">במניין</span><span class="seg">ביחיד</span></div>
        <span class="round" dir="ltr">A+</span>
        <span class="round" dir="ltr">A−</span>
        <span class="stepper"><span class="step">${icon('minus', 16, 'text', 2.8)}</span><span class="level">5</span><span class="step">${icon('plus', 16, 'text', 2.8)}</span></span>
        <span class="round play">${pauseIcon('onGold')}</span>
      </div>
      <div class="card section">
        <div class="s-title">ברכות השחר</div>
        <p class="prayer">מוֹדֶה אֲנִי לְפָנֶיךָ, מֶלֶךְ חַי וְקַיָּם, שֶׁהֶחֱזַרְתָּ בִּי נִשְׁמָתִי בְּחֶמְלָה. רַבָּה אֱמוּנָתֶךָ.</p>
      </div>
    </div>
    ${tabBar()}
  </div>
</figure>`;

const swatch = (palette, withSurface) =>
  `<span class="sw-swatch" style="background:${palette.bg}">${
    withSurface
      ? `<span class="sw-surface" style="background:${palette.surface}"><span class="sw-dot sm" style="background:${palette.gold}"></span></span>`
      : `<span class="sw-dot" style="background:${palette.gold}"></span>`
  }</span>`;

const swatchRow = (source, host, selected, withSurface) =>
  `<div class="sw-row">${NAMES.map(
    (name) =>
      `<span class="sw-ring" title="${LABELS[name]}" style="border-color:${name === selected ? host.gold : host.border}">${swatch(source[name], withSurface)}</span>`,
  ).join('')}</div>`;

const swatchCard = (source, host, selected, withSurface) =>
  `<div class="sw-card" style="background:${host.surface};box-shadow:0 2px 12px ${host.shadow}">${swatchRow(source, host, selected, withSurface)}</div>`;

const ratioCell = (ratio, min = AA) =>
  `<span class="ratio ${ratio >= min ? 'pass' : 'fail'}"><bdi>${ratio.toFixed(2)}:1</bdi><span class="badge">${ratio >= min ? 'עובר' : 'נכשל'}</span></span>`;

const code = (text) => `<code dir="ltr">${text}</code>`;

const NUMBER = /(?<![\w.#])(\d+(?:\.\d+)?:1|\d+\.\d+\/\d+\.\d+|\d+\.\d+)(?!\w|\.\d)/g;
const iso = (prose) => prose.replace(NUMBER, '<bdi dir="ltr">$1</bdi>');

const reference = (name) => name === 'gold';

const columnsHead = (name) =>
  `<thead><tr><th></th>${reference(name) ? '<th>ערך</th>' : '<th>נוכחי</th><th>מוצע</th>'}</tr></thead>`;

const pairRows = (name, pairs) =>
  pairs
    .map(([fg, bg, label, min = AA]) => {
      const before = ratioCell(ratioOf(CURRENT[name], fg, bg), min);
      const after = reference(name) ? '' : `<td>${ratioCell(ratioOf(PROPOSED[name], fg, bg), min)}</td>`;
      return `<tr><th>${label}<div class="pair">${code(`${fg} / ${bg}`)}</div></th><td>${before}</td>${after}</tr>`;
    })
    .join('');

const stepOf = (palette) => Math.abs(oklch(palette.surface).L - oklch(palette.bg).L);

const chip = (value) =>
  `<span class="chip"><span class="chip-color" style="background:${value}"></span><bdi dir="ltr">${value}</bdi></span>`;

const tokenRows = (name) =>
  Object.keys(CURRENT[name])
    .map((token) => {
      const before = CURRENT[name][token];
      const after = PROPOSED[name][token];
      if (reference(name)) return `<tr><th>${code(token)}</th><td>${chip(before)}</td></tr>`;
      const changed = before !== after;
      return `<tr class="${changed ? 'changed' : 'same'}"><th>${code(token)}${changed ? '<span class="tag">שונה</span>' : ''}</th><td>${chip(before)}</td><td>${chip(after)}</td></tr>`;
    })
    .join('');

const changedCount = (name) => Object.keys(CURRENT[name]).filter((t) => CURRENT[name][t] !== PROPOSED[name][t]).length;

const blackOnAccent = (name) => contrast('#000000', CURRENT[name].gold);

const facts = (name) => {
  const current = CURRENT[name];
  const proposed = PROPOSED[name];
  const step = reference(name)
    ? `מדרגת כרטיס-דף (ΔL ב-OKLab): <bdi>${GOLD_STEP.page.toFixed(3)}</bdi>, המדרגה שכל פלטה בהירה מקבלת.`
    : `מדרגת כרטיס-דף (ΔL ב-OKLab): נוכחי <bdi>${stepOf(current).toFixed(3)}</bdi>, מוצע <bdi>${stepOf(proposed).toFixed(3)}</bdi>, כתום <bdi>${GOLD_STEP.page.toFixed(3)}</bdi>.`;
  const label =
    proposed.onGold === '#FFFFFF'
      ? `תווית על האקסנט: גם שחור מלא נותן רק <bdi>${blackOnAccent(name).toFixed(2)}:1</bdi>, לכן לבן.`
      : `תווית על האקסנט: דיו כהה ${code(proposed.onGold)} (<bdi>${ratioOf(proposed, 'onGold', 'gold').toFixed(2)}:1</bdi>).`;
  return `<ul class="facts"><li>${step}</li><li>${label}</li></ul>`;
};

const paletteSection = (name) => `
<section class="palette" id="${name}">
  <header class="p-head">
    <span class="p-dot" style="background:${CURRENT[name].gold};box-shadow:0 0 0 4px ${CURRENT[name].bg}"></span>
    <h2>${LABELS[name]} <bdi class="p-id">${name}</bdi></h2>
    <span class="p-count">${reference(name) ? 'ייחוס · ללא שינוי' : `${changedCount(name)} טוקנים משתנים`}</span>
  </header>
  <p class="p-note">${iso(NOTES[name])}</p>
  <div class="p-grid">
    <div class="phones">
      ${phone(CURRENT[name], reference(name) ? 'הייחוס' : 'נוכחי')}
      ${reference(name) ? '' : phone(PROPOSED[name], 'מוצע')}
    </div>
    <div class="contrast">
      <h3>ניגודיות WCAG</h3>
      <div class="table-scroll"><table class="ratios">${columnsHead(name)}<tbody>${pairRows(name, KEY_PAIRS)}</tbody></table></div>
      <details class="more-pairs"><summary>שאר בדיקות הניגודיות בטסט של הנושא</summary>
        <div class="table-scroll"><table class="ratios">${columnsHead(name)}<tbody>${pairRows(name, THEME_TEST_PAIRS)}</tbody></table></div>
      </details>
      ${facts(name)}
    </div>
  </div>
  <div class="token-block">
    <h3>טוקנים</h3>
    <div class="table-scroll"><table class="tokens">${columnsHead(name)}<tbody>${tokenRows(name)}</tbody></table></div>
  </div>
</section>`;

const summaryTable = () => `
<table class="summary">
  <thead><tr><th>פלטה</th>${KEY_PAIRS.map(([fg, bg, label]) => `<th>${label}<div class="pair">${code(`${fg} / ${bg}`)}</div></th>`).join('')}</tr></thead>
  <tbody>${NAMES.map(
    (name) =>
      `<tr><th><a href="#${name}">${LABELS[name]}</a></th>${KEY_PAIRS.map(([fg, bg]) => {
        const before = ratioOf(CURRENT[name], fg, bg);
        const after = ratioOf(PROPOSED[name], fg, bg);
        return `<td>${name === 'gold' ? ratioCell(before) : `<div class="from">${ratioCell(before)}</div><div class="to">${ratioCell(after)}</div>`}</td>`;
      }).join('')}</tr>`,
  ).join('')}</tbody>
</table>`;

const CSS = `
:root{color-scheme:light;--ink:#1F2328;--ink-sub:#59606A;--ink-muted:#6B7280;--page:#F2F1EE;--card:#FFFFFF;--line:#E3E1DC;--pass:#0F7A4F;--pass-bg:#E6F4EC;--fail:#B42318;--fail-bg:#FDECEA}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--page);color:var(--ink);font-family:Heebo,system-ui,sans-serif;font-size:15px;line-height:1.55}
main{max-width:1240px;margin:0 auto;padding:32px 16px 64px}
h1{font-weight:900;font-size:32px;line-height:1.15;margin:0 0 8px}
h2{font-weight:800;font-size:24px;margin:0}
h3{font-weight:700;font-size:15px;margin:20px 0 8px;color:var(--ink-sub)}
code{font-family:ui-monospace,Consolas,monospace;font-size:12.5px;background:#F1F0EC;border-radius:6px;padding:1px 6px;unicode-bidi:isolate}
.lead{color:var(--ink-sub);max-width:820px;margin:0 0 24px}
.panel{background:var(--card);border-radius:20px;padding:20px 24px;margin-bottom:20px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.rules{margin:0;padding-inline-start:20px}
.rules li{margin-bottom:6px}
.rules .why{color:var(--ink-sub);font-size:13.5px}
.callout{margin-top:14px;padding:12px 16px;border-radius:14px;background:#FFF6E5;color:#5C3B00;font-size:14px}
.jump{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 20px}
.jump a{display:inline-flex;align-items:center;gap:8px;background:var(--card);border-radius:999px;padding:6px 14px;color:var(--ink);text-decoration:none;font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.05)}
.jump i{width:12px;height:12px;border-radius:50%;display:inline-block}
.summary,.ratios,.tokens{border-collapse:collapse;width:100%}
.summary th,.summary td{padding:10px 8px;border-bottom:1px solid var(--line);text-align:start;vertical-align:top;font-weight:400}
.summary thead th{font-weight:700;font-size:13px;color:var(--ink-sub)}
.summary tbody th{font-weight:700}
.summary a{color:var(--ink)}
.table-scroll{overflow-x:auto}
.pair{margin-top:2px}
.ratio{display:inline-flex;align-items:center;gap:6px;font-variant-numeric:tabular-nums;font-weight:600}
.badge{font-size:11px;font-weight:700;border-radius:999px;padding:1px 8px}
.pass .badge{background:var(--pass-bg);color:var(--pass)}
.fail .badge{background:var(--fail-bg);color:var(--fail)}
.from{opacity:.75;font-size:13px}
.from::after{content:'↓';display:block;color:var(--ink-muted);line-height:1.2}
.sw-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
.sw-block h3{margin-top:0}
.sw-card{border-radius:20px;padding:16px;display:inline-block;margin:0 0 8px 8px}
.sw-row{display:flex;flex-wrap:wrap;gap:8px}
.sw-ring{width:40px;height:40px;border-radius:20px;border:2.5px solid;display:inline-flex;align-items:center;justify-content:center;margin:1px}
.sw-swatch{width:31px;height:31px;border-radius:16px;display:inline-flex;align-items:center;justify-content:center}
.sw-surface{width:23px;height:23px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center}
.sw-dot{width:16px;height:16px;border-radius:8px;display:inline-block}
.sw-dot.sm{width:15px;height:15px}
.palette{background:var(--card);border-radius:24px;padding:24px;margin-bottom:24px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.p-head{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.p-dot{width:18px;height:18px;border-radius:50%}
.p-id{font-weight:400;font-size:15px;color:var(--ink-muted);font-family:ui-monospace,Consolas,monospace}
.p-count{margin-inline-start:auto;font-size:13px;color:var(--ink-sub);background:#F1F0EC;border-radius:999px;padding:3px 12px}
.p-note{color:var(--ink-sub);margin:10px 0 20px;max-width:900px}
.p-grid{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start}
.phones{display:flex;flex-wrap:wrap;gap:20px}
.contrast{flex:1 1 340px;min-width:0}
.contrast h3:first-child{margin-top:0}
.token-block{max-width:760px;margin-top:8px}
.ratios th,.ratios td,.tokens th,.tokens td{padding:7px 6px;border-bottom:1px solid var(--line);text-align:start;font-weight:400;vertical-align:middle}
.ratios thead th,.tokens thead th{font-size:12px;font-weight:700;color:var(--ink-muted)}
.ratios tbody th{font-size:13.5px}
.more-pairs{margin-top:8px;font-size:13.5px}
.more-pairs summary{cursor:pointer;color:var(--ink-sub);padding:6px 0}
.facts{margin:12px 0 0;padding-inline-start:18px;font-size:13.5px;color:var(--ink-sub)}
.tokens tr.same{opacity:.55}
.tokens tr.changed th code{background:#FFF1D6}
.tag{font-size:10.5px;font-weight:700;color:#8A5300;margin-inline-start:6px}
.chip{display:inline-flex;align-items:center;gap:6px;font-family:ui-monospace,Consolas,monospace;font-size:12px}
.chip-color{width:22px;height:22px;border-radius:7px;border:1px solid rgba(0,0,0,.12);background-image:none;flex:none;position:relative;overflow:hidden}
.chip-color::before{content:'';position:absolute;inset:0;z-index:-1;background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/8px 8px}
.phone-wrap{margin:0}
.phone-wrap figcaption{font-weight:700;font-size:13px;color:var(--ink-sub);margin:0 4px 8px}
.phone{width:360px;background:var(--c-bg);border-radius:28px;overflow:hidden;box-shadow:0 0 0 1px rgba(0,0,0,.06),0 10px 30px rgba(0,0,0,.10);font-family:Heebo,system-ui,sans-serif;color:var(--c-text)}
.screen{padding:16px 16px 4px}
.nav{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px}
.nav-title{font-weight:900;font-size:28px;line-height:34px;color:var(--c-text)}
.nav-sub{font-size:13px;line-height:18px;color:var(--c-textSub)}
.counter{background:var(--c-goldLight);color:var(--c-goldText);font-weight:700;font-size:15px;line-height:22px;padding:6px 14px;border-radius:999px;flex:none;margin-top:4px}
.card{background:var(--c-surface);border-radius:20px;box-shadow:0 2px 12px var(--c-shadow);margin-bottom:12px}
.m-body{padding:16px}
.m-row{display:flex;align-items:center;gap:12px}
.tile{width:40px;height:40px;border-radius:16px;background:var(--c-goldLight);display:inline-flex;align-items:center;justify-content:center;flex:none}
.meta{flex:1;min-width:0}
.m-name{font-weight:700;font-size:17px;line-height:24px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--c-text)}
.m-status{font-weight:600;font-size:11px;line-height:14px;color:var(--c-textMuted);margin-top:2px}
.m-actions{display:flex;gap:8px;flex:none}
.circle{width:32px;height:32px;border-radius:50%;border:1.5px solid var(--c-border);display:inline-flex;align-items:center;justify-content:center}
.ribbon{margin-top:12px}
.r-label{font-weight:700;font-size:13px;line-height:18px;color:var(--c-goldText);margin-bottom:8px}
.track{height:6px;border-radius:999px;background:var(--c-surface2);overflow:hidden}
.fill{height:100%;width:58%;border-radius:999px;background:var(--c-gold)}
.card.done{background:var(--c-surface2);opacity:.55}
.card.done .tile{background:var(--c-surface2)}
.card.done .m-name{color:var(--c-textSub);text-decoration:line-through}
.m-done{display:flex;align-items:center;gap:4px;margin-top:2px;font-weight:600;font-size:11px;line-height:14px;color:var(--c-safe)}
.done-mark{width:32px;height:32px;border-radius:8px;background:var(--c-gold);display:inline-flex;align-items:center;justify-content:center}
.banner{border-radius:16px;border:1px solid var(--c-gold);background:var(--c-goldLight);color:var(--c-goldText);padding:12px 16px;margin-bottom:12px;font-weight:700;font-size:13px;line-height:18px}
.btn{min-height:48px;border-radius:16px;background:var(--c-gold);color:var(--c-onGold);font-weight:700;font-size:15px;line-height:22px;display:flex;align-items:center;justify-content:center;padding:12px 20px}
.divider{display:flex;align-items:center;gap:8px;margin:20px 0 12px;color:var(--c-textMuted);font-size:11px;line-height:14px}
.divider::before,.divider::after{content:'';flex:1;height:1px;background:var(--c-border)}
.picker{display:flex;align-items:center;gap:8px;min-height:48px;padding:12px 16px;border-radius:20px;background:var(--c-surface);box-shadow:0 2px 12px var(--c-shadow)}
.picker-label{flex:1;font-weight:700;font-size:15px;line-height:22px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.toolbar{display:flex;align-items:center;gap:8px;margin-top:8px}
.segmented{flex:1;min-width:104px;display:flex;gap:4px}
.seg{flex:1;text-align:center;border-radius:12px;padding:8px 0;background:var(--c-surface2);color:var(--c-text);font-weight:700;font-size:13px;line-height:18px}
.seg.on{background:var(--c-gold);color:var(--c-onGold)}
.round{width:34px;height:34px;flex:none;border-radius:50%;background:var(--c-surface2);color:var(--c-text);display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;line-height:18px}
.round.play{background:var(--c-gold)}
.stepper{display:inline-flex;align-items:center;border-radius:999px;background:var(--c-surface2);flex:none}
.step{min-width:26px;min-height:30px;display:inline-flex;align-items:center;justify-content:center}
.level{min-width:16px;text-align:center;font-weight:700;font-size:13px;line-height:18px;color:var(--c-text)}
.card.section{margin-top:16px;padding:16px}
.s-title{font-weight:800;font-size:22px;line-height:28px;color:var(--c-goldText);margin-bottom:8px}
.prayer{margin:0;font-family:'Noto Serif Hebrew',serif;font-size:20px;line-height:1.75;color:var(--c-text)}
.strip{background:var(--c-bg);padding:8px 12px 12px}
.tabbar{display:flex;border-radius:24px;padding:8px 4px;background:var(--c-tabBg);box-shadow:0 4px 20px var(--c-shadow)}
.tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px}
.tab .pill{width:48px;height:32px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center}
.tab-label{font-size:11px;line-height:14px;color:var(--c-textMuted)}
.underline{width:16px;height:3px;border-radius:999px}
.tab.focused .pill{background:var(--c-goldLight)}
.tab.focused .tab-label{color:var(--c-goldText);font-weight:700}
.tab.focused .underline{background:var(--c-gold)}
footer{color:var(--ink-muted);font-size:13px;margin-top:32px}
@media (max-width:420px){main{padding:20px 16px 48px}h1{font-size:26px}.palette{padding:18px 12px}.panel{padding:16px}.phone{zoom:.84}.chip{font-size:11px}.chip bdi{overflow-wrap:anywhere}.ratio{flex-wrap:wrap}}
@media (max-width:350px){.phone{zoom:.74}}
`;

const RULES = [
  [
    'הכרטיס הוא לבן מחומם לכיוון גוון הפלטה, אף פעם לא <code dir="ltr">#FFFFFF</code>, באותה מדרגת כרטיס-דף של כתום.',
    'שלוש הבהירות לוקחות מכתום את הבהירות והכרומה (OKLCH) של הדף, הכרטיס, המשטח המשני והקו, בגוון הדף שלהן. סגול וכחול חייבים לרדת מעט בדף, כי בדף הנוכחי שלהם אין מקום לכרטיס מחומם בהיר יותר במדרגה הזאת.',
  ],
  [
    'טקסט אקסנט (<code dir="ltr">goldText</code>) נפרד וכהה מהמילוי, לפחות 4.5:1 על הכרטיס.',
    'בוורוד הוא כבר כזה ונשאר. בסגול ובכחול המילוי עצמו כבר עובר 4.5, לכן הטון הנפרד יורד עד 7:1 (AAA), כדי שיהיה טון נפרד באמת ולא העתק.',
  ],
  [
    'תווית על המילוי (<code dir="ltr">onGold</code>): דיו כהה בכל מקום שהאקסנט מאפשר 4.5:1, אחרת לבן.',
    'ורוד, כהה ושזיף נשארים בדיו כהה. בסגול ובכחול גם שחור מלא לא מגיע ל-4.5, לכן לבן.',
  ],
  [
    'צללים רכים בגוון הפלטה, ב-0.08 וב-0.18 כמו בכתום.',
    'בבהירות: הבהירות והכרומה של הצל של כתום, בגוון שבין האקסנט לדף (כמו בכתום). בכהות: גוון הדף, כהה ממנו באותו יחס שהצל של כתום כהה מהדף שלו.',
  ],
  [
    '<code dir="ltr">surface2</code> ו-<code dir="ltr">border</code> במרחק מדרגה אחת מהכרטיס.',
    `אותן מדרגות בהירות מהכרטיס כמו בכתום: <bdi dir="ltr">ΔL ${GOLD_STEP.surface2.toFixed(3)}</bdi> למשטח המשני ו-<bdi dir="ltr">ΔL ${GOLD_STEP.border.toFixed(3)}</bdi> לקו. בפלטה כהה הן עולות במקום לרדת.`,
  ],
];

const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>פלטות 2026-10-24</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800;900&family=Noto+Serif+Hebrew:wght@400;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<main>
  <h1>חמש הפלטות ברמה של כתום</h1>
  <p class="lead">כתום הוא הייחוס. לכל פלטה: הטוקנים הנוכחיים מול המוצעים, על אותם רכיבים של האפליקציה: כרטיס מצווה בבית, באנר, כפתור ראשי, סרגל הקורא וסרגל הלשוניות. הגוונים נשארים. שום קוד לא שונה; אחרי אישור, <code dir="ltr">src/theme/colors.ts</code> מתעדכן לפי <code dir="ltr">tokens.json</code> שבתיקייה הזאת.</p>
  <nav class="jump">${NAMES.map((name) => `<a href="#${name}"><i style="background:${CURRENT[name].gold}"></i>${LABELS[name]}</a>`).join('')}</nav>

  <section class="panel">
    <h2>הכללים שעוברים מכתום</h2>
    <ol class="rules">${RULES.map(([rule, why]) => `<li>${iso(rule)}<div class="why">${iso(why)}</div></li>`).join('')}</ol>
    <div class="callout">${iso(`לבחירתך בפלטות הכהות: צל ב-0.08/0.18 על דף כהה כמעט לא נראה, וההפרדה של הכרטיס נשענת שם על מדרגת הבהירות בלבד (כמו היום, שבו גם הצל השחור ב-0.35 כמעט לא נראה). כלל הלבן המחומם לא חל עליהן, ולכן הדף והכרטיס שלהן נשארים, ו-<code dir="ltr">goldText</code> שלהן בהיר מהמילוי ולא כהה ממנו, כמו בכהה היום.`)}</div>
  </section>

  <section class="panel">
    <h2>בורר הפלטות</h2>
    <p class="lead">היום: עיגול בצבע הדף ונקודה בצבע האקסנט, ולכן כתום וורוד נראים כמעט אותו דבר. מוצע: הכרטיס של הפלטה כטבעת בתוך הדף, סביב הנקודה.</p>
    <div class="sw-grid">
      <div class="sw-block"><h3>נוכחי</h3>${swatchCard(CURRENT, CURRENT.gold, 'gold', false)}${swatchCard(CURRENT, CURRENT.dark, 'dark', false)}</div>
      <div class="sw-block"><h3>מוצע</h3>${swatchCard(PROPOSED, PROPOSED.gold, 'gold', true)}${swatchCard(PROPOSED, PROPOSED.dark, 'dark', true)}</div>
    </div>
  </section>

  <section class="panel">
    <h2>ניגודיות בקצרה</h2>
    <p class="lead">${iso('כל יחס מוצע מגיע ל-4.5:1 לפחות (WCAG AA). בכל תא: נוכחי, ומתחתיו מוצע.')}</p>
    <div class="table-scroll">${summaryTable()}</div>
  </section>

  ${NAMES.map(paletteSection).join('')}

  <footer>נבנה על ידי <code dir="ltr">node design/palettes-2026-10-24/build.mjs</code>, שכותב גם את <code dir="ltr">tokens.json</code>. הערכים הנוכחיים הם צילום של <code dir="ltr">colors.ts</code> מ-2026-10-24.</footer>
</main>
</body>
</html>
`;

writeFileSync(join(HERE, 'index.html'), html);
writeFileSync(join(HERE, 'tokens.json'), `${JSON.stringify(PROPOSED, null, 2)}\n`);

for (const name of NAMES) {
  const rows = KEY_PAIRS.map(([fg, bg]) => `${fg}/${bg} ${ratioOf(CURRENT[name], fg, bg).toFixed(2)} -> ${ratioOf(PROPOSED[name], fg, bg).toFixed(2)}`);
  console.log(`${name}: ${rows.join(' | ')}`);
}
