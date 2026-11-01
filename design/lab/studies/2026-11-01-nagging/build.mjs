// Builds every board of boards/ into out/project/<Name>.dc.html, the DC format of the claude.ai Design Artifact type:
// the board's style, template and script, wrapped with the shared core (core.css with the app's palettes, core.js with
// data.json), the shared markup (the mitzvah screen, the level sheet, the reminder editor, the nag block, the tab bar)
// and the canvas tweaks. `node build.mjs` builds all; `node build.mjs <Name>` builds one.
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

// The nag block (ReminderNagFields, spec 4.3) with its holes under one object path, e.g. <!--NAG:ed.nb-->. A boolean
// hole in `disabled` would render the attribute even when false, so the steppers use aria-disabled and clamp.
const nagBlock = (p) => `<div class="nag" role="group" aria-label="{{${p}.title}}">
<span class="flabel">{{${p}.title}}</span>
<div class="seg" role="radiogroup" aria-label="{{${p}.title}}"><sc-for list="{{${p}.modes}}" as="mo" hint-placeholder-count="3"><button role="radio" aria-checked="{{mo.on}}" onClick="{{mo.pick}}">{{mo.label}}</button></sc-for></div>
<sc-if value="{{${p}.hasCaption}}" hint-placeholder-val="{{ true }}"><p class="nag-cap">{{${p}.caption}}</p></sc-if>
<sc-if value="{{${p}.isCustom}}" hint-placeholder-val="{{ false }}">
<span class="flabel mt">{{${p}.countLabel}}</span>
<div class="stepper"><button onClick="{{${p}.less}}" aria-disabled="{{${p}.lessOff}}" aria-label="{{${p}.lessLabel}}">${svg('minus')}</button><span class="val" aria-live="polite">{{${p}.count}}</span><button onClick="{{${p}.more}}" aria-disabled="{{${p}.moreOff}}" aria-label="{{${p}.moreLabel}}">${svg('plus')}</button></div>
<span class="flabel mt">{{${p}.everyLabel}}</span>
<div class="chips" role="group" aria-label="{{${p}.everyLabel}}"><sc-for list="{{${p}.everyChips}}" as="ec" hint-placeholder-count="4"><button class="chip" aria-pressed="{{ec.on}}" onClick="{{ec.pick}}">{{ec.label}}</button></sc-for></div>
<span class="flabel mt">{{${p}.placeLabel}}</span>
<sc-if value="{{${p}.placeMany}}" hint-placeholder-val="{{ true }}"><div class="seg" role="radiogroup" aria-label="{{${p}.placeLabel}}"><sc-for list="{{${p}.places}}" as="pl" hint-placeholder-count="3"><button role="radio" aria-checked="{{pl.on}}" onClick="{{pl.pick}}">{{pl.label}}</button></sc-for></div></sc-if>
<sc-if value="{{${p}.placeOne}}" hint-placeholder-val="{{ false }}"><p class="nag-only">{{${p}.placeOnly}}</p></sc-if>
</sc-if>
<sc-if value="{{${p}.hasPreview}}" hint-placeholder-val="{{ true }}">
<div class="preview" aria-live="polite">
<sc-if value="{{${p}.hasOk}}" hint-placeholder-val="{{ true }}"><p class="pv-ok">{{${p}.okText}} <b class="num">{{${p}.okTimes}}</b></p></sc-if>
<sc-if value="{{${p}.allDropped}}" hint-placeholder-val="{{ false }}"><p class="pv-drop">{{${p}.allDroppedText}}</p></sc-if>
<sc-for list="{{${p}.drops}}" as="dp" hint-placeholder-count="1"><p class="pv-drop num">{{dp.text}}</p></sc-for>
</div>
</sc-if>
</div>`;

// The mitzvah screen (src/app/mitzvah/[id].tsx): ScreenHeader, the active card, and the reminders card with the level
// row and the reminder rows (spec 4.2). The cards between them in the app (today's window, content, settings) are
// left out so the reminders card is in the first screen.
const MITZVAH = `<div class="mscreen" style="position:absolute;inset:0;display:flex;flex-direction:column">
<header class="sheader">
<div class="sh-top"><button class="backpill" aria-label="{{back}}">${svg('chevronRight', 's16')}<span>{{back}}</span></button></div>
<div class="sh-title"><span class="tile big" aria-hidden="true"><i class="img" style="{{mIconStyle}}"></i></span><h1 class="t-title c-text">{{mName}}</h1><p class="t-cap c-sub num">{{mSub}}</p></div>
<sc-if value="{{mHasNext}}" hint-placeholder-val="{{ true }}"><p class="sh-extra t-small c-gold num">{{mNext}}</p></sc-if>
</header>
<div class="scroll" style="flex:1;min-height:0;overflow-y:auto;padding:0 16px 28px;display:grid;gap:12px;align-content:start">
<div class="card"><div class="listrow" style="min-height:0"><span class="tile" aria-hidden="true"><i class="img" style="{{mIconStyle}}"></i></span><span class="lr-meta"><b class="lr-title">{{activeTitle}}</b><span class="lr-cap">{{activeOn}}</span></span><span class="switch" role="switch" aria-checked="true" aria-label="{{activeTitle}}"><i></i></span></div></div>
<section class="card pad" aria-labelledby="rem-t">
<h2 id="rem-t" class="t-sub c-text" style="margin-bottom:4px">{{remTitle}}</h2>
<button class="listrow lvrow" onClick="{{lvOpen}}" aria-label="{{lvAria}}"><span class="tile" aria-hidden="true">${svg('bell')}</span><span class="lr-meta"><b class="lr-title">{{lvTitle}}</b><span class="lr-cap num">{{lvCaption}}</span></span>${svg('chevronLeft', 's16 chev')}</button>
<ul class="rlist">
<sc-for list="{{mRows}}" as="r" hint-placeholder-count="2"><li class="rrow">
<button class="rr-main" onClick="{{r.open}}"><b class="t-bodyb c-text">{{r.label}}</b><span class="t-small c-muted">{{r.summary}}</span><sc-if value="{{r.hasNext}}" hint-placeholder-val="{{ true }}"><span class="t-small c-gold num">{{r.next}}</span></sc-if><sc-if value="{{r.hasLine}}" hint-placeholder-val="{{ true }}"><span class="{{r.lineCls}}">${svg('repeat')}<span class="num">{{r.line}}</span></span></sc-if></button>
<button class="rr-del" onClick="{{r.del}}" aria-label="{{r.delLabel}}">${svg('close', 's14')}</button>
</li></sc-for>
</ul>
<button class="addrow" onClick="{{addReminder}}"><span class="plus" aria-hidden="true">${svg('plus', 's16')}</span><span>{{addLabel}}</span></button>
<button class="btn secondary" style="margin-top:12px" onClick="{{resetAll}}">{{resetLabel}}</button>
</section>
</div>
</div>`;

const LEVELSHEET = `<sc-if value="{{lsOn}}" hint-placeholder-val="{{ false }}">
<div class="sheetwrap">
<button class="scrim" onClick="{{lsClose}}" aria-label="{{closeLabel}}" tabindex="-1"></button>
<section class="sheet" role="dialog" aria-modal="true" aria-labelledby="ls-t">
<div class="sheet-h"><h2 id="ls-t" class="t-heading c-text">{{lsTitle}}</h2><p class="t-cap c-muted" style="margin-top:4px">{{lsCaption}}</p></div>
<div class="sheet-body"><sc-for list="{{lsItems}}" as="it" hint-placeholder-count="5"><button class="saction" aria-pressed="{{it.on}}" onClick="{{it.pick}}"><span><b class="sa-label">{{it.label}}</b><small class="sa-cap num">{{it.caption}}</small></span></button></sc-for></div>
<button class="sheet-close" onClick="{{lsClose}}">{{closeLabel}}</button>
</section>
</div>
</sc-if>`;

// The reminder editor (src/components/ReminderEditor.tsx) with the nag block between the send-time line and the label.
const EDITOR = `<sc-if value="{{edOn}}" hint-placeholder-val="{{ false }}">
<div class="sheetwrap">
<button class="scrim" onClick="{{ed.close}}" aria-label="{{ed.closeLabel}}" tabindex="-1"></button>
<section class="sheet" role="dialog" aria-modal="true" aria-labelledby="ed-t">
<div class="sheet-h"><h2 id="ed-t" class="t-heading c-text">{{ed.title}}</h2><p class="t-cap c-muted" style="margin-top:4px">{{ed.caption}}</p></div>
<div class="sheet-body" id="ed-body" style="max-height:548px;display:grid;gap:0">
<span class="flabel">{{ed.timingLabel}}</span>
<div class="choices" role="radiogroup" aria-label="{{ed.timingLabel}}"><sc-for list="{{ed.timings}}" as="tm" hint-placeholder-count="4"><button class="choice" role="radio" aria-checked="{{tm.on}}" onClick="{{tm.pick}}"><span class="ch-t"><b class="t-bodyb c-text ch-name">{{tm.name}}</b><span class="t-cap c-sub">{{tm.caption}}</span></span><span class="tick" aria-hidden="true">${svg('check', 's14')}</span></button></sc-for></div>
<div style="margin-top:12px">
<sc-if value="{{ed.isMinutes}}" hint-placeholder-val="{{ true }}"><span class="flabel">{{ed.minutesLabel}}</span><div class="stepper"><button onClick="{{ed.minLess}}" aria-label="{{ed.minLessLabel}}"><span dir="ltr">-5</span></button><span class="val">{{ed.minutes}}</span><button onClick="{{ed.minMore}}" aria-label="{{ed.minMoreLabel}}"><span dir="ltr">+5</span></button></div></sc-if>
<sc-if value="{{ed.isClock}}" hint-placeholder-val="{{ false }}"><label class="flabel" for="ed-time">{{ed.timeLabel}}</label><input id="ed-time" class="input num" type="text" inputmode="numeric" maxlength="5" dir="ltr" placeholder="HH:MM" value="{{ed.time}}" onChange="{{ed.onTime}}"></sc-if>
</div>
<p class="{{ed.sendCls}}" style="margin:8px 0 12px">{{ed.sendText}}</p>
<!--NAG:ed.nb-->
<label class="flabel" for="ed-label" style="margin-top:16px">{{ed.labelLabel}}</label>
<input id="ed-label" class="input" type="text" value="{{ed.label}}" onChange="{{ed.onLabel}}">
<div class="swrow" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)"><span class="sw-meta t-sub c-text">{{ed.skipLabel}}</span><button class="switch" role="switch" aria-checked="{{ed.skip}}" onClick="{{ed.toggleSkip}}" aria-label="{{ed.skipLabel}}"><i></i></button></div>
<button class="btn primary" style="margin-top:12px" onClick="{{ed.save}}">{{ed.saveLabel}}</button>
</div>
<button class="sheet-close" onClick="{{ed.close}}">{{ed.closeLabel}}</button>
</section>
</div>
</sc-if>`;

// Settings → Device and notifications (src/app/(tabs)/settings.tsx), around the new level control (spec 4.1): the
// section card, the zmanim line, the notifications switch; then, after the board's own block, the weekly report and
// the two quiet-hours switches. Only the level control is live.
const SETTINGS_TOP = `<div class="scroll" style="position:absolute;inset:0;overflow-y:auto;padding:0 16px 120px">
<header class="navbar"><h1 class="t-display c-text">{{stTitle}}</h1></header>
<section class="card pad" aria-labelledby="dev-t" style="margin-top:4px">
<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px"><span class="tile" aria-hidden="true">${svg('bell')}</span><span class="lr-meta"><b id="dev-t" class="lr-title">{{stDevice}}</b><span class="lr-cap">{{stDeviceSub}}</span></span><span class="c-muted">${svg('chevronUp', 's16')}</span></div>
<h3 class="subhead first">{{stZmanim}}</h3>
<p class="t-bodyb c-text">{{stCity}}</p>
<h3 class="subhead">{{stNotif}}</h3>
<div class="swrow"><span class="sw-meta"><b class="t-bodyb c-text">{{stNotifToggle}}</b><span class="hint">{{stNotifHint}}</span></span><span class="switch" role="switch" aria-checked="true" aria-label="{{stNotifToggle}}"><i></i></span></div>`;
const SETTINGS_BOTTOM = `<div class="swrow" style="margin-top:16px"><span class="sw-meta"><b class="t-bodyb c-text">{{stWeekly}}</b><span class="hint">{{stWeeklyHint}}</span></span><span class="switch" role="switch" aria-checked="true" aria-label="{{stWeekly}}"><i></i></span></div>
<div class="swrow" style="margin-top:16px"><span class="sw-meta"><b class="t-bodyb c-text">{{stQuietBefore}}</b><span class="hint">{{stQuietBeforeHint}}</span></span><span class="switch" role="switch" aria-checked="false" aria-label="{{stQuietBefore}}"><i></i></span></div>
<div class="swrow" style="margin-top:16px"><span class="sw-meta"><b class="t-bodyb c-text">{{stQuietAfter}}</b></span><span class="switch" role="switch" aria-checked="false" aria-label="{{stQuietAfter}}"><i></i></span></div>
</section>
</div>
${'<!--TABS-->'}`;

const TOAST = `<sc-if value="{{hasToast}}" hint-placeholder-val="{{ false }}"><div class="toast {{toastCls}}" role="status">{{toastText}}</div></sc-if>`;

const TABS = `<nav class="tabs" aria-label="ניווט ראשי">
<button class="tab">${svg('grid')}<span>{{navMore}}</span></button>
<button class="tab">${svg('book')}<span>{{navSiddur}}</span></button>
<button class="tab">${svg('home')}<span>{{navHome}}</span></button>
<button class="tab">${svg('chart')}<span>{{navHistory}}</span></button>
<button class="tab on" aria-current="page">${svg('sliders')}<span>{{navSettings}}</span></button>
</nav>`;

const MACROS = { '<!--SETTINGS_TOP-->': SETTINGS_TOP, '<!--SETTINGS_BOTTOM-->': SETTINGS_BOTTOM, '<!--MITZVAH-->': MITZVAH, '<!--LEVELSHEET-->': LEVELSHEET, '<!--EDITOR-->': EDITOR, '<!--TOAST-->': TOAST, '<!--TABS-->': TABS };

function expand(markup) {
  for (const [k, v] of Object.entries(MACROS)) markup = markup.split(k).join(v);
  markup = markup.replace(/<!--NAG:([a-zA-Z.]+)-->/g, (_, p) => nagBlock(p));
  return markup.replace(/\[\[ic:([A-Za-z]+)(?::([A-Za-z0-9 -]+))?\]\]/g, (_, name, cls) => svg(name, cls));
}

const PROPS = JSON.stringify({
  theme: { editor: 'enum', options: ['gold', 'dark'], default: 'gold', section: 'תצוגה' },
  level: { editor: 'enum', options: ['1', '2', '3', '4'], default: '1', section: 'רמת האפליקציה' },
  m: { editor: 'enum', options: ['shacharit', 'maariv', 'krias_shma_al_hamita'], default: 'shacharit', section: 'מצווה' },
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
  const leftover = markup.match(/\[\[[^\]]*\]\]|<!--(NAG|MITZVAH|EDITOR|LEVELSHEET|TOAST|TABS|SETTINGS)/);
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
