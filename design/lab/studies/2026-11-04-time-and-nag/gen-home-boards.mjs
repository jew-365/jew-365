// Writes boards/home/<Name>.html: one board per direction for the nagging level shown on home, each a copy of
// home-base.html (the app's home as the 2026-10-29-home-ellipse study rebuilt it, HomeNow) with one slot added after
// the mitzvah's name in the open card and in every My day look (rail, cards, rings), filled by nagOf() for the
// direction in `const NAG`. Never edit the generated boards; edit home-base.html or this file and run it again.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const base = readFileSync(join(here, 'home-base.html'), 'utf8');

export const HOME_DIRS = [
  ['HomeBellDots', 'bellDots', 'פעמון ונקודות'],
  ['HomeWaves', 'waves', 'פעמון וגלי צליל'],
  ['HomeBars', 'bars', 'פסי קליטה'],
  ['HomeCount', 'count', 'פעמון ומספר'],
  ['HomeTimes', 'times', 'מילה: כמה פעמים'],
  ['HomePips', 'pips', 'נקודות בלבד'],
  ['HomeDial', 'dial', 'חוגה קטנה'],
  ['HomeOwnOnly', 'ownOnly', 'רק כשהמצווה חורגת'],
];

const SLOT = (v) =>
  `<sc-if value="{{${v}.nag.on}}" hint-placeholder-val="{{ true }}"><span class="nagi {{${v}.nag.cls}}" role="img" aria-label="{{${v}.nag.aria}}"><i class="ng-a" style="{{${v}.nag.a}}"></i><i class="ng-b" style="{{${v}.nag.b}}"></i><span class="ng-t" dir="auto">{{${v}.nag.text}}</span></span></sc-if>`;

const CSS = `
/* The nagging level beside a mitzvah's name (this study): a slot of two mask layers, ng-a (the quiet part, muted) and
   ng-b (the level, in the accent), and a short text. The slot never takes the place of the name: the name shrinks
   and ellipsizes first. */
.enrow{display:flex;align-items:center;gap:6px;min-width:0}
.enrow>.ename,.enrow>.nname{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rcell .enrow{justify-content:center}
.nagi{position:relative;display:inline-flex;align-items:center;gap:3px;flex:none;color:var(--muted)}
.nagi>.ng-a,.nagi>.ng-b{display:block;flex:none}
.nagi>.ng-a{background:var(--muted)}
.nagi>.ng-b{background:var(--gold);position:absolute;inset-inline-start:0;top:50%;transform:translateY(-50%)}
.nagi.solo>.ng-b{position:static;transform:none}
.nagi>.ng-t{font-size:12px;line-height:16px;font-weight:600;color:var(--goldText);font-variant-numeric:tabular-nums}
.nagi.pill{padding:0 8px;border-radius:999px;background:var(--goldLight);min-height:20px}
.nagi.pill>.ng-t{color:var(--goldText)}
.nagi.dial>.ng-a{border-radius:50%}
.st-done .nagi,.st-late .nagi,.st-missed .nagi{opacity:.55}
`;

function make(name, nag, title) {
  let s = base;
  const swap = (from, to, all = false) => {
    if (!s.includes(from)) throw new Error(`${name}: missing ${from.slice(0, 60)}`);
    s = all ? s.split(from).join(to) : s.replace(from, to);
  };
  swap('<!--board title="היום · כמו באפליקציה"-->', `<!--board title="רמת נודניקיות בבית · ${title}"-->`);
  swap('</style>', CSS + '</style>');
  swap('<span class="ename">{{e.name}}</span>', `<span class="enrow"><span class="ename">{{e.name}}</span>${SLOT('e')}</span>`, true);
  swap('<span class="nname">{{it.name}}</span>', `<span class="enrow"><span class="nname">{{it.name}}</span>${SLOT('it')}</span>`);
  swap("const SHAPE = 'now';", `const SHAPE = 'now';\nconst NAG = '${nag}';`);
  swap('        [flag]: true,', '        [flag]: true,\n        nag: this.nagOf(appId),');
  swap("        pick: () => this.showToast({ text: 'פותח את ' + name + '…' }),", "        pick: () => this.showToast({ text: 'פותח את ' + name + ' · ' + this.nagOf(appId).aria }),");
  swap('  boardState() {', `  // The nagging level of one mitzvah: its own level (OWN, the demo's: the morning Shema 4, Shacharit 3, the bedtime
  // Shema 2) or the app's (the gallery's level, else 1). Level n repeats each reminder n - 1 times (src/utils/nagging.ts).
  nagOf(appId) {
    const OWN = { krias_shma_shacharit: 4, shacharit: 3, krias_shma_al_hamita: 2 };
    const NAMES = ['', 'רגיל', 'עדין', 'בינוני', 'נודניק'];
    const appLevel = [1, 2, 3, 4].includes(Number(this.opt('level'))) ? Number(this.opt('level')) : 1;
    const own = OWN[appId] || null;
    const L = own || appLevel;
    const reps = L - 1;
    const aria = 'נודניק: ' + NAMES[L] + (own && own !== appLevel ? ', רמה של המצווה' : '') + (reps ? ', כל תזכורת נשלחת ' + (reps + 1) + ' פעמים' : ', בלי חזרות');
    const enc = (svg) => 'url("data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" ' + svg + '</svg>') + '")';
    const mask = (svg, w, h) => 'width:' + w + 'px;height:' + h + 'px;-webkit-mask:' + enc(svg) + ' center/contain no-repeat;mask:' + enc(svg) + ' center/contain no-repeat';
    const BELL = (x) => '<g transform="translate(' + x + ' 0)" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6,16.5V11A6,6 0 0 1 18,11V16.5L19.5,18H4.5Z"/><path d="M10,20.5A2.2,2.2 0 0 0 14,20.5"/></g>';
    const res = { on: false, cls: '', a: 'display:none', b: 'display:none', text: '', aria };
    const dots = (n, cx, gap, cy, r) => Array.from({ length: n }, (_, i) => '<circle cx="' + (cx - i * gap) + '" cy="' + cy + '" r="' + r + '"/>').join('');
    if (NAG === 'bellDots' || (NAG === 'ownOnly' && own && own !== appLevel)) {
      if (!reps) return res;
      return { ...res, on: true, a: mask('viewBox="0 0 36 24">' + BELL(12), 33, 22), b: mask('viewBox="0 0 36 24">' + dots(reps, 13, 5, 19, 2.3), 33, 22) };
    }
    if (NAG === 'ownOnly') return res;
    if (NAG === 'waves') {
      if (!reps) return res;
      const arc = (r) => { const a = (35 * Math.PI) / 180; const cx = 24; const cy = 11; return '<path d="M' + (cx - r * Math.cos(a)).toFixed(2) + ',' + (cy - r * Math.sin(a)).toFixed(2) + 'A' + r + ',' + r + ' 0 0 0 ' + (cx - r * Math.cos(a)).toFixed(2) + ',' + (cy + r * Math.sin(a)).toFixed(2) + '"/>'; };
      const arcs = [10.5, 14, 17.5].slice(0, reps).map(arc).join('');
      return { ...res, on: true, a: mask('viewBox="0 0 36 24">' + BELL(12), 33, 22), b: mask('viewBox="0 0 36 24"><g fill="none" stroke="#000" stroke-width="2" stroke-linecap="round">' + arcs + '</g>', 33, 22) };
    }
    if (NAG === 'bars') {
      const bar = (i) => '<rect x="' + (1 + i * 5) + '" y="' + (15 - (5 + i * 3)) + '" width="3" height="' + (5 + i * 3) + '" rx="1"/>';
      const all = [0, 1, 2, 3].map(bar).join('');
      const lit = [0, 1, 2, 3].slice(0, L).map(bar).join('');
      return { ...res, on: true, a: mask('viewBox="0 0 20 16">' + all, 20, 16) + ';background:var(--border)', b: mask('viewBox="0 0 20 16">' + lit, 20, 16) };
    }
    if (NAG === 'count') {
      if (!reps) return res;
      return { ...res, on: true, cls: 'solo', a: mask('viewBox="0 0 24 24">' + BELL(0), 18, 18), b: 'display:none', text: '×' + (reps + 1) };
    }
    if (NAG === 'times') {
      if (!reps) return res;
      return { ...res, on: true, cls: 'pill', text: reps === 1 ? 'פעמיים' : reps + 1 + ' פעמים' };
    }
    if (NAG === 'pips') {
      if (!reps) return res;
      return { ...res, on: true, cls: 'solo', b: mask('viewBox="0 0 18 8">' + dots(reps, 14, 5, 4, 2.2), 20, 9) };
    }
    if (NAG === 'dial') {
      if (!reps) return res;
      const p = Math.round((reps / 3) * 100);
      return { ...res, on: true, cls: 'dial solo', a: 'width:16px;height:16px;background:conic-gradient(var(--gold) 0 ' + p + '%,var(--border) ' + p + '% 100%);-webkit-mask:radial-gradient(circle,transparent 4px,#000 4.6px);mask:radial-gradient(circle,transparent 4px,#000 4.6px)' };
    }
    return res;
  }

  boardState() {`);
  for (const k of ['[[', '{{']) if (!s.includes(k)) throw new Error(`${name}: lost ${k}`);
  return s;
}

mkdirSync(join(here, 'boards', 'home'), { recursive: true });
for (const [name, nag, title] of HOME_DIRS) {
  writeFileSync(join(here, 'boards', 'home', `${name}.html`), make(name, nag, title));
  console.log('home board', name);
}
