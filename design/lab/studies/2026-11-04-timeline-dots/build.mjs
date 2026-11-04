// Builds every board of boards/ into out/project/<Name>.dc.html, the DC format of the claude.ai Design Artifact type:
// the board's style, template and script, wrapped with the shared core (core.css with the app's palettes, core.js with
// data.json), the shared markup (the mitzvah screen around the window card, the details, the list, the toast) and the
// canvas tweaks. `node build.mjs` builds all; `node build.mjs <Name>` builds one.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'out', 'project');
mkdirSync(outDir, { recursive: true });
copyFileSync(join(here, '..', '..', 'runtime', 'support.js'), join(outDir, 'support.js'));

const DATA_TEXT = readFileSync(join(here, 'data.json'), 'utf8').trim();
const DATA = JSON.parse(DATA_TEXT);
const CORE_JS = readFileSync(join(here, 'core.js'), 'utf8').replace('/*DATA*/ null', DATA_TEXT);
if (CORE_JS.includes('/*DATA*/')) throw new Error('data not injected');

// The palettes of src/theme/colors.ts as the board's custom properties.
const vars = (p) =>
  `--bg:${p.bg};--surface:${p.surface};--surface2:${p.surface2};--text:${p.text};--sub:${p.textSub};--muted:${p.textMuted};--border:${p.border};--gold:${p.gold};--onGold:${p.onGold};--goldLight:${p.goldLight};--goldText:${p.goldText};--urgent:${p.urgent};--onUrgent:${p.onUrgent};--urgentBg:${p.urgentBg};--safe:${p.safe};--tab:${p.tabBg};--shadowC:${p.shadow};--overlay:${p.overlay};--notif:${DATA.notifColor}`;
const PALETTE_CSS = `.ph{${vars(DATA.palettes.gold)}}\n.ph.t-dark{${vars(DATA.palettes.dark)};--notif:#8FA8F0}`;
const CORE_CSS = readFileSync(join(here, 'core.css'), 'utf8').replace('/*PALETTES*/', PALETTE_CSS).trim();
if (CORE_CSS.includes('/*PALETTES*/')) throw new Error('palettes not injected');

// MitzvahIcon's line drawings (src/components/MitzvahIcon.tsx and BottomTabs.tsx), the ones the boards need.
const P = {
  bell: '<path d="M6,16.5V11A6,6 0 0 1 18,11V16.5L19.5,18H4.5Z"></path><path d="M10,20.5A2.2,2.2 0 0 0 14,20.5"></path>',
  chevronLeft: '<path d="M15,6L9,12L15,18"></path>',
  chevronRight: '<path d="M9,6L15,12L9,18"></path>',
  chevronDown: '<path d="M6,9L12,15L18,9"></path>',
  chevronUp: '<path d="M6,15L12,9L18,15"></path>',
  check: '<path d="M4.5,12.5L9.5,17.5L19.5,6.5"></path>',
  close: '<path d="M6,6L18,18M18,6L6,18"></path>',
  plus: '<path d="M12,5V19M5,12H19"></path>',
  minus: '<path d="M5,12H19"></path>',
  repeat: '<path d="M17 2.5l3 3-3 3"></path><path d="M4 11.5v-1a5 5 0 0 1 5-5h11"></path><path d="M7 21.5l-3-3 3-3"></path><path d="M20 12.5v1a5 5 0 0 1-5 5H4"></path>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"></rect><rect x="14" y="3" width="7" height="7" rx="2"></rect><rect x="3" y="14" width="7" height="7" rx="2"></rect><rect x="14" y="14" width="7" height="7" rx="2"></rect>',
  book: '<path d="M12 6.8C10.2 5.3 7.4 4.7 4 5.2v13c3.4-.5 6.2.1 8 1.6 1.8-1.5 4.6-2.1 8-1.6v-13c-3.4-.5-6.2.1-8 1.6z"></path><path d="M12 6.8v13"></path>',
  home: '<path d="M4 11l8-7 8 7v8.5a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19.5z"></path>',
  chart: '<path d="M4 19V5M4 19H21"></path><rect x="7" y="11" width="3" height="5" rx="1"></rect><rect x="12" y="8" width="3" height="8" rx="1"></rect><rect x="17" y="13" width="3" height="3" rx="1"></rect>',
  sliders: '<path d="M4,7H7M11,7H20M4,12H13M17,12H20M4,17H6M10,17H20"></path><circle cx="9" cy="7" r="2"></circle><circle cx="15" cy="12" r="2"></circle><circle cx="8" cy="17" r="2"></circle>',
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0"></path><path d="M6 12.5a9 9 0 0 1 12 0"></path><path d="M9.5 16a4 4 0 0 1 5 0"></path><circle cx="12" cy="19" r=".8"></circle>',
  battery: '<rect x="2.5" y="7" width="17" height="10" rx="2"></rect><path d="M21.5 10.5v3"></path><rect x="4.5" y="9" width="11" height="6" rx="1"></rect>',
};
const svg = (name, cls = '') => {
  if (!P[name]) throw new Error(`unknown icon ${name}`);
  return `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${P[name]}</svg>`;
};

// The mitzvah screen around the window card (src/app/mitzvah/[id].tsx): ScreenHeader with the mitzvah's name and
// hours, then the card "חלון הזמן" with the level as a SegmentedControl (the mitzvah's own level, for the demo), the
// board's axis between WINDOW_TOP and WINDOW_BOTTOM, the zone and the ends, the reset to the smart nag while a nag was
// moved by hand, the selected notification's values, and a card listing every notification of the window in order.
const WINDOW_TOP = `<div class="scroll" style="position:absolute;inset:0;overflow-y:auto;padding:0 16px 32px">
<header class="sheader">
<div class="sh-top"><button class="backpill" aria-label="חזרה">${svg('chevronRight', 's16')}<span>חזרה</span></button></div>
<div class="sh-title"><span class="tile big" aria-hidden="true">${svg('bell')}</span><h1 class="t-title c-text">{{mName}}</h1><p class="t-cap c-sub num">{{mRange}}</p></div>
</header>
<section class="card pad wcard" aria-labelledby="w-t">
<div class="w-head"><h2 id="w-t" class="t-sub c-text">חלון הזמן</h2><span class="t-small c-sub num">{{count}}</span></div>
<button class="chip zoomchip" aria-pressed="{{zoomOn}}" onClick="{{toggleZoom}}">{{zoomLabel}}</button>
<div class="seg lvseg" role="radiogroup" aria-label="{{levelTitle}}"><sc-for list="{{levels}}" as="lv" hint-placeholder-count="4"><button role="radio" aria-checked="{{lv.on}}" onClick="{{lv.pick}}">{{lv.label}}</button></sc-for></div>`;

const WINDOW_BOTTOM = `<div class="ends num" aria-hidden="true"><span>{{startClock}}</span><span>{{endClock}}</span></div>
<div class="legend" aria-hidden="true"><span class="lg rem"><i></i>תזכורת</span><span class="lg nag"><i></i>נודניק</span><span class="lg last"><i></i>הזמן האחרון</span><span class="lg zone"><i></i>{{zoneLabel}}</span></div>
<sc-if value="{{manual}}" hint-placeholder-val="{{ false }}"><div class="manual"><p class="t-small c-sub">{{manualNote}}</p><button class="btn secondary sm" onClick="{{resetSmart}}">${svg('repeat', 's16')}<span>חזרה לנודניק החכם</span></button></div></sc-if>
<sc-if value="{{hasSel}}" hint-placeholder-val="{{ false }}">
<div class="{{selCls}}" role="group" aria-label="{{sel.kindName}}">
<div class="d-head"><b class="t-bodyb c-text">{{sel.kindName}}</b><b class="d-time num">{{sel.time}}</b><button class="d-x" onClick="{{selClose}}" aria-label="סגירה">${svg('close', 's14')}</button></div>
<div class="d-notif"><span class="dn-sub num">{{sel.line}}</span><b class="dn-title">{{mName}}</b><span class="dn-body">{{sel.body}}</span></div>
<div class="d-acts"><div class="stepper"><button onClick="{{selLess}}" aria-label="5 דקות מוקדם יותר"><span dir="ltr">-5</span></button><span class="val num">{{sel.time}}</span><button onClick="{{selMore}}" aria-label="5 דקות מאוחר יותר"><span dir="ltr">+5</span></button></div>
<sc-if value="{{selIsReminder}}" hint-placeholder-val="{{ true }}"><button class="btn secondary sm" onClick="{{selEdit}}">עריכה מלאה</button></sc-if>
<button class="btn danger sm" onClick="{{selDel}}">מחיקה</button></div>
</div>
</sc-if>
</section>
<section class="card pad" style="margin-top:12px" aria-labelledby="l-t">
<h2 id="l-t" class="t-sub c-text" style="margin-bottom:8px">ההתראות שיישלחו</h2>
<ul class="slist"><sc-for list="{{rows}}" as="r" hint-placeholder-count="5"><li><button class="{{r.cls}}" onClick="{{r.pick}}" aria-pressed="{{r.on}}"><span class="s-dot" aria-hidden="true"></span><span class="s-meta"><b class="t-bodyb c-text">{{r.kindName}}</b><span class="t-small c-sub">{{r.body}}</span></span><b class="s-time num">{{r.time}}</b></button></li></sc-for></ul>
</section>
</div>`;

const TOAST = `<sc-if value="{{hasToast}}" hint-placeholder-val="{{ false }}"><div class="toast" role="status">{{toastText}}</div></sc-if>`;

const MACROS = { '<!--WINDOW_TOP-->': WINDOW_TOP, '<!--WINDOW_BOTTOM-->': WINDOW_BOTTOM, '<!--TOAST-->': TOAST };

function expand(markup) {
  for (const [k, v] of Object.entries(MACROS)) markup = markup.split(k).join(v);
  return markup.replace(/\[\[ic:([A-Za-z]+)(?::([A-Za-z0-9 -]+))?\]\]/g, (_, name, cls) => svg(name, cls));
}

const PROPS = JSON.stringify({
  theme: { editor: 'enum', options: ['gold', 'dark'], default: 'gold', section: 'תצוגה' },
  level: { editor: 'enum', options: ['1', '2', '3', '4'], default: '3', section: 'רמת נודניקיות' },
  m: { editor: 'enum', options: Object.keys(DATA.mitzvot), default: 'maariv', section: 'מצווה' },
  $preview: { width: 390, height: 844 },
});

function part(src, re, what, name) {
  const m = src.match(re);
  if (!m) throw new Error(`${name}: missing ${what}`);
  return m[1];
}

function build(name) {
  const src = readFileSync(join(here, 'boards', `${name}.html`), 'utf8');
  const title = part(src, /<!--board title="([^"]+)"-->/, 'title comment', name);
  const css = part(src, /<style>([\s\S]*?)<\/style>/, '<style>', name).trim();
  let markup = part(src, /<template>([\s\S]*?)<\/template>/, '<template>', name).trim();
  let script = part(src, /<script>([\s\S]*?)<\/script>/, '<script>', name).trim();
  if (!script.includes('/*CORE*/')) throw new Error(`${name}: script needs /*CORE*/`);
  if (/<x-dc|<helmet|class="ph[ "]/.test(markup)) throw new Error(`${name}: markup must not contain the shell (.ph, x-dc, helmet)`);
  markup = expand(markup);
  script = script.replace('/*CORE*/', CORE_JS.trimEnd());
  const leftover = markup.match(/\[\[[^\]]*\]\]|<!--(WINDOW|TOAST)/);
  if (leftover) throw new Error(`${name}: unknown macro ${leftover[0]}`);
  const opens = (markup.match(/\{\{/g) || []).length;
  const closes = (markup.match(/\}\}/g) || []).length;
  if (opens !== closes) throw new Error(`${name}: unbalanced holes ${opens}/${closes}`);
  const html = `<!doctype html>
<html lang="he">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&amp;display=swap">
<style>
${CORE_CSS}
${css}
</style>
</helmet>
<div class="ph {{phCls}}" dir="rtl" lang="he" style="width: 390px; height: 844px; position: relative; overflow: hidden; background: var(--bg); color: var(--text)">
${markup}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='${PROPS}'>
${script}
</script>
</body>
</html>
`;
  writeFileSync(join(outDir, `${name}.dc.html`), html);
  return html.length;
}

const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(join(here, 'boards')).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5));
for (const n of names) console.log('built', n, build(n));
