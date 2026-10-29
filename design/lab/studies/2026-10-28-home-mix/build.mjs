import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'out', 'project');
mkdirSync(outDir, { recursive: true });
copyFileSync(join(here, '..', '..', 'runtime', 'support.js'), join(outDir, 'support.js'));

const DATA = readFileSync(join(here, 'data.json'), 'utf8').trim();
const CORE_JS = readFileSync(join(here, 'core.js'), 'utf8').replace('/*DATA*/ null', DATA);
if (CORE_JS.includes('/*DATA*/')) throw new Error('data not injected');
const CORE_CSS = readFileSync(join(here, 'core.css'), 'utf8').trim();
const MOTION = '@media (prefers-reduced-motion:reduce){.ph *,.ph *::before,.ph *::after{animation-duration:.01ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}';

const P = {
  box: '<path d="M8 7.5l4-2 4 2v5l-4 2-4-2z"></path><path d="M8 7.5l4 2 4-2M12 9.5v5"></path><path d="M4 19c2.5-1.6 5-2.3 8-2.3s5.5.7 8 2.3"></path>',
  book: '<path d="M12 6.8C10.2 5.3 7.4 4.7 4 5.2v13c3.4-.5 6.2.1 8 1.6 1.8-1.5 4.6-2.1 8-1.6v-13c-3.4-.5-6.2.1-8 1.6z"></path><path d="M12 6.8v13"></path>',
  sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"></path>',
  moon: '<path d="M19.5 14.5A7.5 7.5 0 1 1 9.5 4.5a6 6 0 0 0 10 10z"></path>',
  check: '<path d="M5 12.5l4.2 4.2L19 7"></path>',
  clock: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
  bell: '<path d="M6 9.5a6 6 0 0 1 12 0c0 5.5 2.5 7 2.5 7h-17S6 15 6 9.5z"></path><path d="M10 20a2 2 0 0 0 4 0"></path>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"></path><path d="M13.5 6.5l4 4"></path>',
  close: '<path d="M6 6l12 12M18 6L6 18"></path>',
  flame: '<path d="M12 3c1 3.5 5 5.6 5 10.2a5 5 0 0 1-10 0c0-2.6 1.4-4.2 2.6-5.2.3 2 1.2 3.1 2.4 3.1-.9-3-.2-5.8 0-8.1z"></path>',
  star: '<path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.4l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"></path>',
  candle: '<path d="M12 3c1.2 1.6 2 2.7 2 3.8a2 2 0 0 1-4 0c0-1.1.8-2.2 2-3.8z"></path><rect x="9" y="10" width="6" height="10" rx="1.2"></rect><path d="M6 20h12"></path>',
  update: '<path d="M20 12a8 8 0 1 1-2.3-5.6"></path><path d="M20 4v4h-4"></path>',
  dawn: '<path d="M3 18h18M6 15a6 6 0 0 1 12 0"></path><path d="M12 6v2.5M5.4 8.9l1.6 1.6M18.6 8.9L17 10.5"></path>',
  sunrise: '<path d="M3 19h18M7 15.5a5 5 0 0 1 10 0"></path><path d="M12 4v6M9.5 6.5L12 4l2.5 2.5"></path>',
  sunset: '<path d="M3 19h18M7 15.5a5 5 0 0 1 10 0"></path><path d="M12 4v6M9.5 7.5L12 10l2.5-2.5"></path>',
  chevron: '<path d="M15 6l-6 6 6 6"></path>',
  undo: '<path d="M15 14l5-5-5-5"></path><path d="M20 9H10a6 6 0 0 0 0 12h2"></path>',
  speaker: '<path d="M5 9.5h3.5L13 5.5v13l-4.5-4H5z"></path><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"></path>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"></path>',
  alert: '<path d="M12 4l9 16H3z"></path><path d="M12 10v4M12 17h.01"></path>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"></rect><path d="M4 10h16M9 3v4M15 3v4"></path>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"></rect><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"></rect><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"></rect><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"></rect>',
  home: '<path d="M4 11l8-7 8 7v8.5a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19.5z"></path>',
  chart: '<path d="M5 20v-8M11 20V5M17 20v-5M3 20h18"></path>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"></path><circle cx="16" cy="7" r="2"></circle><circle cx="10" cy="17" r="2"></circle>',
  play: '<path d="M8 5.5v13l10-6.5z"></path>',
  pause: '<path d="M8 5v14M16 5v14"></path>',
};

const svg = (name, cls = '') => {
  if (!P[name]) throw new Error(`unknown icon ${name}`);
  return `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${P[name]}</svg>`;
};
const branch = (v, pairs, cls) =>
  pairs.map(([flag, icon], i) => `<sc-if value="{{${v}.${flag}}}" hint-placeholder-val="{{ ${i === 0} }}">${svg(icon, cls)}</sc-if>`).join('');
const MACROS = {
  icItem: [['isSun', 'sun'], ['isBox', 'box'], ['isBook', 'book'], ['isMoon', 'moon']],
  icMsg: [['isBell', 'bell'], ['isFlame', 'flame'], ['isStar', 'star'], ['isCandle', 'candle'], ['isMoon', 'moon'], ['isUpdate', 'update'], ['isCalendar', 'calendar']],
  icZ: [['isDay', 'sun'], ['isDawn', 'dawn'], ['isRise', 'sunrise'], ['isSet', 'sunset'], ['isNight', 'moon']],
};

function expand(markup) {
  return markup.replace(/\[\[(ic|icItem|icMsg|icZ):([A-Za-z0-9_.]+)(?::([A-Za-z0-9_ -]+))?\]\]/g, (_, kind, arg, cls) =>
    kind === 'ic' ? svg(arg, cls) : branch(arg, MACROS[kind], cls),
  );
}

const NAMECARD = `<sc-if value="{{pNeedName}}" hint-placeholder-val="{{ false }}">
<section class="pname" aria-labelledby="pname-t">
<p class="pname-t" id="pname-t">איך לקרוא לך?</p>
<p class="cap">כך נפנה אליך בברכה ובהתראות. אפשר לשנות בכל רגע מהעיפרון.</p>
<div class="pname-row">
<label class="pvh" for="pname-in">השם שלך</label>
<input id="pname-in" class="pinput {{pNameErrCls}}" type="text" value="{{pDraft}}" onChange="{{onPDraft}}" maxlength="20" placeholder="השם שלך" autocomplete="given-name" aria-invalid="{{pNameErr}}">
<button class="pbtn primary" onClick="{{pSaveName}}">שמירה</button>
</div>
<sc-if value="{{pNameErr}}" hint-placeholder-val="{{ false }}"><p class="perr" role="alert">צריך שם כדי לשמור</p></sc-if>
</section>
</sc-if>`;

const NOTE_HEAD = `<div class="pnhead"><span class="pnapp">${svg('bell')}</span><b>יהודי 365</b><span class="pnnow">עכשיו</span></div>`;

const OVERLAYS = `<sc-if value="{{showBack}}" hint-placeholder-val="{{ false }}">
<button class="backpill" onClick="{{back}}" aria-label="{{backLabel}}"><i aria-hidden="true"></i><span class="num">{{scrubLabel}}</span><b>{{backLabel}}</b></button>
</sc-if>
<sc-if value="{{isHoly}}" hint-placeholder-val="{{ false }}">
<section class="holy" role="dialog" aria-modal="true" aria-labelledby="holy-t">
<div class="holy-stars" aria-hidden="true"></div>
<div class="holy-candles" aria-hidden="true"><span></span><span></span></div>
<h2 class="holy-t" id="holy-t">שבת שלום</h2>
<p class="holy-sub">{{holyTitle}}</p>
<p class="holy-exit num">{{holyBody}}</p>
<p class="holy-note">האפליקציה שקטה בשבת ובחג. נתראה ביציאה.</p>
<button class="holy-peek" onClick="{{holyPeek}}">להציץ ביום חול לדוגמה</button>
</section>
</sc-if>
<sc-if value="{{hasToast}}" hint-placeholder-val="{{ false }}">
<div class="toast {{toastCls}}" role="status">
<span>{{toastText}}</span>
<sc-if value="{{toastUndo}}" hint-placeholder-val="{{ false }}"><button onClick="{{undoToast}}">ביטול</button></sc-if>
</div>
</sc-if>
<sc-if value="{{pSheetOn}}" hint-placeholder-val="{{ false }}">
<button class="pscrim {{pSheetCls}}" onClick="{{pClose}}" aria-label="סגירת ההודעות האישיות" tabindex="-1"></button>
<section class="psheet {{pSheetCls}}" role="dialog" aria-modal="true" aria-labelledby="psheet-t">
<div class="psheet-head">
<span class="pgrab" aria-hidden="true"></span>
<h2 class="psheet-t" id="psheet-t">ההודעות שלך</h2>
<button class="pclose" onClick="{{pClose}}" aria-label="סגירה">${svg('close')}</button>
</div>
<div class="psheet-body">
<div class="pprev" aria-live="polite"><div class="pnote {{pNoteCls}}">${NOTE_HEAD}<p class="pntitle">{{pPrevTitle}}</p><p class="pnbody">{{pPrevBody}}</p></div></div>
<div class="pgrid2">
<div class="pfield"><label class="plabel" for="psheet-name">שם לפנייה</label><input id="psheet-name" class="pinput" type="text" value="{{pNameVal}}" onChange="{{onPName}}" maxlength="20" placeholder="בלי שם" autocomplete="given-name"></div>
<div class="pfield"><span class="plabel" id="psheet-g">לשון פנייה</span><div class="pseg" role="radiogroup" aria-labelledby="psheet-g"><button role="radio" aria-checked="{{pGenderM}}" onClick="{{pPickM}}">זכר</button><button role="radio" aria-checked="{{pGenderF}}" onClick="{{pPickF}}">נקבה</button></div></div>
</div>
<p class="plabel" id="psheet-tone">סגנון ההודעות</p>
<div class="pchips" role="radiogroup" aria-labelledby="psheet-tone">
<sc-for list="{{pTones}}" as="tn" hint-placeholder-count="5"><button class="pchip" role="radio" aria-checked="{{tn.on}}" onClick="{{tn.pick}}">{{tn.name}}</button></sc-for>
</div>
<p class="plabel" id="psheet-m">ההתראה של</p>
<div class="pchips" role="radiogroup" aria-labelledby="psheet-m">
<sc-for list="{{pMitzChips}}" as="c" hint-placeholder-count="6"><button class="pchip" role="radio" aria-checked="{{c.on}}" onClick="{{c.pick}}">{{c.chip}}</button></sc-for>
</div>
<sc-if value="{{pIsCustom}}" hint-placeholder-val="{{ false }}">
<label class="plabel" for="psheet-text">הטקסט שלך ל{{pPrevTitle}}</label>
<textarea id="psheet-text" class="pta {{pTaErr}}" value="{{pCustomText}}" onChange="{{onPCustom}}" maxlength="120" aria-invalid="{{pCustomEmpty}}"></textarea>
<span class="cap num">{{pCustomCount}}/120</span>
<sc-if value="{{pCustomEmpty}}" hint-placeholder-val="{{ false }}"><p class="perr" role="alert">צריך טקסט. בינתיים נשלח את הנוסח הקצר.</p></sc-if>
<div class="ptoks"><sc-for list="{{pTokens}}" as="tb" hint-placeholder-count="4"><button class="ptok" onClick="{{tb.add}}" aria-label="{{tb.aria}}">+ {{tb.label}}</button></sc-for></div>
</sc-if>
<sc-if value="{{pNotCustom}}" hint-placeholder-val="{{ true }}"><button class="plink" onClick="{{pWriteOwn}}">לכתוב את ההודעה בעצמי</button></sc-if>
<div class="pactions"><button class="pbtn" onClick="{{pSendTest}}">שלח לי ניסיון</button><button class="pbtn primary" onClick="{{pClose}}">סיום</button></div>
</div>
</section>
</sc-if>
<sc-if value="{{pHasDrop}}" hint-placeholder-val="{{ false }}">
<div class="pdrop {{pDropCls}}" role="status">${NOTE_HEAD}<p class="pntitle">{{pDropTitle}}</p><p class="pnbody">{{pDropBody}}</p></div>
</sc-if>`;

const TABS = `<nav class="tabs" aria-label="ניווט ראשי">
<button class="tab">${svg('grid')}<span>עוד</span></button>
<button class="tab">${svg('book')}<span>סידור</span></button>
<button class="tab on" aria-current="page">${svg('home')}<span>בית</span></button>
<button class="tab">${svg('chart')}<span>היסטוריה</span></button>
<button class="tab">${svg('sliders')}<span>הגדרות</span></button>
</nav>`;

const PROPS = JSON.stringify({
  theme: { editor: 'enum', options: ['gold', 'rose', 'night'], default: 'gold', section: 'תצוגה' },
  bigText: { editor: 'boolean', default: false, section: 'תצוגה' },
  startTime: { editor: 'enum', options: ['live', '07:42', '08:15', '12:30', '20:15'], default: 'live', section: 'שעה' },
  userName: { editor: 'text', default: 'דוד', section: 'אישי' },
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
  if (!markup.includes('<!--NAMECARD-->')) throw new Error(`${name}: markup needs <!--NAMECARD-->`);
  if (!script.includes('/*CORE*/')) throw new Error(`${name}: script needs /*CORE*/`);
  if (/<x-dc|<helmet|class="ph[ "]/.test(markup)) throw new Error(`${name}: markup must not contain the shell (.ph, x-dc, helmet)`);
  markup = expand(markup.replace('<!--NAMECARD-->', NAMECARD));
  script = script.replace('/*CORE*/', CORE_JS.trimEnd());
  const leftover = markup.match(/\[\[[^\]]*\]\]/);
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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&amp;family=Frank+Ruhl+Libre:wght@400;500;700;900&amp;display=swap">
<style>
${CORE_CSS}
${css}
${MOTION}
</style>
</helmet>
<div class="ph {{phCls}}" dir="rtl" lang="he" style="width: 390px; height: 844px; position: relative; overflow: hidden; background: var(--bg); color: var(--text)">
${markup}
${OVERLAYS}
${TABS}
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
