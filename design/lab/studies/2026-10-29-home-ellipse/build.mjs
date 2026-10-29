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

const AI = {
  tefillin: '<rect x="8" y="4" width="8" height="8" rx="1.5"></rect><rect x="10" y="6" width="4" height="4" stroke-width="1"></rect><line x1="6" y1="13" x2="18" y2="13"></line><path d="M9,13C9,17 7,17 7,21"></path><path d="M15,13C15,17 17,17 17,21"></path>',
  shema: '<path d="M6,6.3V17.7"></path><path d="M18,6.3V17.7"></path><ellipse cx="12" cy="5" rx="8" ry="2"></ellipse><ellipse cx="12" cy="19" rx="8" ry="2"></ellipse><line x1="9.5" y1="10.5" x2="14.5" y2="10.5"></line><line x1="9.5" y1="14" x2="14.5" y2="14"></line>',
  shacharit: '<path d="M7.5,16A4.5,4.5 0 0 1 16.5,16Z"></path><line x1="3.5" y1="16" x2="20.5" y2="16"></line><line x1="7.5" y1="19.5" x2="16.5" y2="19.5"></line><line x1="12" y1="8.8" x2="12" y2="6.3"></line><line x1="6.91" y1="10.91" x2="5.14" y2="9.14"></line><line x1="17.09" y1="10.91" x2="18.86" y2="9.14"></line>',
  mincha: '<circle cx="12" cy="12" r="3.8"></circle><line x1="18.4" y1="12" x2="21.2" y2="12"></line><line x1="16.53" y1="7.47" x2="18.51" y2="5.49"></line><line x1="12" y1="5.6" x2="12" y2="2.8"></line><line x1="7.47" y1="7.47" x2="5.49" y2="5.49"></line><line x1="5.6" y1="12" x2="2.8" y2="12"></line><line x1="7.47" y1="16.53" x2="5.49" y2="18.51"></line><line x1="12" y1="18.4" x2="12" y2="21.2"></line><line x1="16.53" y1="16.53" x2="18.51" y2="18.51"></line>',
  maariv: '<path d="M16.52,14.51A6.48,6.48 0 1 1 9.47,7.46A5.04,5.04 0 0 0 16.52,14.51Z"></path><path d="M15.8,3.1Q16.48,5.82 19.2,6.5Q16.48,7.18 15.8,9.9Q15.12,7.18 12.4,6.5Q15.12,5.82 15.8,3.1Z"></path><path d="M19.6,9.9Q19.98,11.42 21.5,11.8Q19.98,12.18 19.6,13.7Q19.22,12.18 17.7,11.8Q19.22,11.42 19.6,9.9Z"></path>',
  night: '<path d="M21.6,12.39A9,9 0 1 1 11.81,2.6A7,7 0 0 0 21.6,12.39Z"></path>',
  check: '<path d="M4.5,12.5L9.5,17.5L19.5,6.5"></path>',
  undo: '<path d="M5,13A7,7 0 1 0 7.05,8.05"></path><path d="M7.05,4.05V8.05H11.05"></path>',
  siddur: '<path d="M12,6.5Q8.5,4.5 3.5,5.5V17.5Q8.5,16.5 12,19.5Z"></path><path d="M12,6.5Q15.5,4.5 20.5,5.5V17.5Q15.5,16.5 12,19.5Z"></path>',
  warning: '<path d="M10.8,5.28Q12,3.2 13.2,5.28L20.4,17.72Q21.6,19.8 19.2,19.8H4.8Q2.4,19.8 3.6,17.72Z"></path><line x1="12" y1="9.8" x2="12" y2="13.8"></line><line x1="12" y1="16.7" x2="12" y2="16.8"></line>',
  star: '<path d="M12,3.3L14.53,9.32L21.04,9.86L16.09,14.13L17.58,20.49L12,17.1L6.42,20.49L7.91,14.13L2.96,9.86L9.47,9.32Z"></path>',
  candles: '<rect x="6" y="12.2" width="4" height="7.8" rx="0.8"></rect><rect x="14" y="12.2" width="4" height="7.8" rx="0.8"></rect><path d="M8,3.5C8,3.5 5.8,5.9 5.8,7.5A2.2,2.2 0 0 0 10.2,7.5C10.2,5.9 8,3.5 8,3.5Z"></path><path d="M16,3.5C16,3.5 13.8,5.9 13.8,7.5A2.2,2.2 0 0 0 18.2,7.5C18.2,5.9 16,3.5 16,3.5Z"></path>',
  moon: '<path d="M7.5,3A9,9 0 0 1 7.5,21A12,12 0 0 0 7.5,3Z"></path>',
  hilula: '<path d="M5.5,9V13Q5.5,20.5 12,20.5Q18.5,20.5 18.5,13V9"></path><path d="M12,4.8C12,4.8 9.7,7.2 9.7,8.8A2.3,2.3 0 0 0 14.3,8.8C14.3,7.2 12,4.8 12,4.8Z"></path>',
  sparkle: '<path d="M12,2.8Q13.66,10.34 21.2,12Q13.66,13.66 12,21.2Q10.34,13.66 2.8,12Q10.34,10.34 12,2.8Z"></path>',
  chevronLeft: '<path d="M15,6L9,12L15,18"></path>',
};
const svgA = (name, cls = '') => {
  if (!AI[name]) throw new Error('unknown app icon ' + name);
  return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + AI[name] + '</svg>';
};
const svg = (name, cls = '') => {
  if (!P[name]) throw new Error(`unknown icon ${name}`);
  return `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${P[name]}</svg>`;
};
const branch = (v, pairs, cls, draw = svg) =>
  pairs.map(([flag, icon], i) => `<sc-if value="{{${v}.${flag}}}" hint-placeholder-val="{{ ${i === 0} }}">${draw(icon, cls)}</sc-if>`).join('');
const MACROS = {
  icItem: [['isSun', 'sun'], ['isBox', 'box'], ['isBook', 'book'], ['isMoon', 'moon']],
  icMsg: [['isBell', 'bell'], ['isFlame', 'flame'], ['isStar', 'star'], ['isCandle', 'candle'], ['isMoon', 'moon'], ['isUpdate', 'update'], ['isCalendar', 'calendar']],
  icZ: [['isDay', 'sun'], ['isDawn', 'dawn'], ['isRise', 'sunrise'], ['isSet', 'sunset'], ['isNight', 'moon']],
  iaItem: [['isTefillin', 'tefillin'], ['isShema', 'shema'], ['isShacharit', 'shacharit'], ['isMincha', 'mincha'], ['isMaariv', 'maariv'], ['isNight', 'night']],
  iaMsg: [['isStar', 'star'], ['isCandles', 'candles'], ['isMoon', 'moon'], ['isHilula', 'hilula']],
};

function expand(markup) {
  return markup.replace(/\[\[(ic|icItem|icMsg|icZ|ia|iaItem|iaMsg):([A-Za-z0-9_.]+)(?::([A-Za-z0-9_ -]+))?\]\]/g, (_, kind, arg, cls) =>
    kind === 'ic' ? svg(arg, cls) : kind === 'ia' ? svgA(arg, cls) : branch(arg, MACROS[kind], cls, kind.startsWith('ia') ? svgA : svg),
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
<button class="tab"><span class="tp"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"></rect><rect x="14" y="3" width="7" height="7" rx="2"></rect><rect x="3" y="14" width="7" height="7" rx="2"></rect><rect x="14" y="14" width="7" height="7" rx="2"></rect></svg></span><span class="tl">עוד</span><i class="tu"></i></button>
<button class="tab"><span class="tp"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12,6.5Q8.5,4.5 3.5,5.5V17.5Q8.5,16.5 12,19.5Z"></path><path d="M12,6.5Q15.5,4.5 20.5,5.5V17.5Q15.5,16.5 12,19.5Z"></path></svg></span><span class="tl">סידור</span><i class="tu"></i></button>
<button class="tab on" aria-current="page"><span class="tp"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z"></path></svg></span><span class="tl">בית</span><i class="tu"></i></button>
<button class="tab"><span class="tp"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 19V5M4 19H21"></path><rect x="7" y="11" width="3" height="5" rx="1"></rect><rect x="12" y="8" width="3" height="8" rx="1"></rect><rect x="17" y="4" width="3" height="12" rx="1"></rect></svg></span><span class="tl">מעקב</span><i class="tu"></i></button>
<button class="tab"><span class="tp"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z"></path></svg></span><span class="tl">הגדרות</span><i class="tu"></i></button>
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
