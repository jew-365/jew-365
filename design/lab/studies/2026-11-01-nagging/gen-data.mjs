// Writes data.json: everything the boards and the gallery show, computed at build time by the app's own code.
// The app's TypeScript runs through ts-hooks.mjs: ZmanimService (the zmanim), the mitzvot registry (the windows and
// the default reminders of Shacharit, Maariv and the bedtime Shema), skipRules.reminderFires() (whether a trigger goes
// out), reminderTiming.timingSummary() (the rows' timing line) and customMitzvah.reminderClock() (the custom form's
// clocks). The boards port four small rules to plain JS (the main trigger, whether a repeat fires, the custom clock,
// the timing line); this script checks every port against the app's function over every combination the boards
// offer, and throws on the first disagreement. The copy is the table of section 7 of .claude/specs/nagging-levels.md
// for every key it lists, and the app's he.json for every other key.
import { createRequire, register } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, '..', '..', '..', '..');
register(pathToFileURL(join(here, 'ts-hooks.mjs')).href);
const app = (p) => import(pathToFileURL(join(REPO, 'src', p)).href);

const { ZmanimService } = await app('services/ZmanimService.ts');
const { CITIES } = await app('data/cities.ts');
const { MITZVOT } = await app('data/mitzvot.ts');
const { reminderFires, HEADS_UP_MAX_MIN, FOLLOW_UP_MAX_MIN } = await app('utils/skipRules.ts');
const { timingSummary } = await app('utils/reminderTiming.ts');
const { reminderClock } = await app('utils/customMitzvah.ts');
const req = createRequire(join(REPO, 'package.json'));
const { DateTime } = req('luxon');
const hc = req('@hebcal/core');

// ---- the day: Monday 2 November 2026 in Jerusalem, seen at 05:30, before netz ----
const DATE = '2026-11-02';
const NOW = '05:30';
const location = CITIES.find((c) => c.cityId === 'jerusalem');
const settings = { nusach: 'sefard', halachicOpinions: { ksSofZman: 'GRA' }, inIsrael: true };
const TZ = location.tz;
const midnight = DateTime.fromISO(DATE, { zone: TZ }).startOf('day');
const base = midnight.toMillis();
const msOf = (d) => d.getTime() - base;
const nowDate = new Date(base + (Number(NOW.slice(0, 2)) * 60 + Number(NOW.slice(3))) * 60_000);

// ---- copy: the spec's section 7 for its keys, he.json for every other key ----
const he = JSON.parse(readFileSync(join(REPO, 'src', 'i18n', 'he.json'), 'utf8'));
const spec = {};
const specText = readFileSync(join(REPO, '.claude', 'specs', 'nagging-levels.md'), 'utf8');
const section7 = specText.slice(specText.indexOf('## 7.'), specText.indexOf('## 8.'));
for (const line of section7.split('\n')) {
  const cells = line.split('|').map((c) => c.trim());
  if (cells.length < 4 || !cells[1].startsWith('`')) continue;
  const keys = cells[1].match(/`([^`]+)`/g).map((k) => k.slice(1, -1));
  const value = cells[2];
  if (keys[0] === 'nag.level.1.name') {
    value.split(' · ').forEach((name, i) => (spec[`nag.level.${i + 1}.name`] = name));
  } else if (keys[0] === 'nag.level.n.desc') {
    for (const n of [2, 3, 4]) spec[`nag.level.${n}.desc`] = value;
  } else if (keys.length > 1) {
    const values = value.split(' / ');
    const stem = keys[0].slice(0, keys[0].lastIndexOf('.') + 1);
    keys.forEach((k, i) => (spec[k.includes('.') ? k : stem + k] = values[i]));
  } else {
    spec[keys[0]] = value;
  }
}
const APP_KEYS = [
  'common.save', 'common.close', 'common.back', 'nav.home', 'nav.more', 'nav.history', 'nav.siddur', 'nav.settings',
  'settings.title', 'settings.device', 'settings.deviceSummary', 'settings.notifications', 'settings.notificationsToggle',
  'settings.notificationsActiveHint', 'settings.weeklyReport', 'settings.weeklyReportHint', 'settings.quietBefore',
  'settings.quietBeforeHint', 'settings.quietAfter', 'settings.zmanim',
  'detail.activeTitle', 'detail.activeOn', 'detail.settings', 'detail.nusach', 'detail.cycle', 'mitzvah.cycle.daily',
  'detail.reminders', 'detail.reminderNextAt', 'detail.previewNext', 'detail.addReminder', 'detail.defaultReset',
  'detail.timeRange', 'detail.timeRangeNextDay', 'nusach.sefard',
  'reminder.edit', 'reminder.add', 'reminder.timing', 'reminder.label', 'reminder.skipIfDone', 'reminder.delete', 'reminder.time',
  'reminder.minutes.less', 'reminder.minutes.more', 'reminder.errors.outsideWindowToday',
  ...['beforeStart', 'fromStart', 'beforeEnd', 'clock', 'followUp'].flatMap((k) => [
    `reminder.timing.${k}`, `reminder.timing.${k}.caption`, ...(k === 'clock' ? [] : [`reminder.minutes.${k}`]),
  ]),
  ...['beforeStart', 'fromStart', 'atStart', 'beforeEnd', 'atEnd', 'clock', 'followUp'].map((k) => `reminder.summary.${k}`),
  'reminder.followUp.label',
  'custom.title', 'custom.editTitle', 'custom.name', 'custom.startTime', 'custom.endTime', 'custom.reminders',
  'custom.hint.reminders', 'custom.affects', 'custom.surface.notifications', 'custom.reminderN', 'custom.reminderText',
  'custom.reminderLabelPlaceholder', 'custom.reminderPreview', 'custom.reminderOutsideWindow', 'custom.deleteReminder',
  'custom.addReminder', 'custom.save', 'custom.window.nextDay', 'custom.hint.time',
  'notifications.markDone', 'siddur.open',
  ...[0, 1, 2, 3, 4, 5, 6].map((d) => `weekday.long.${d}`),
  ...Array.from({ length: 12 }, (_, i) => `month.long.${i + 1}`),
];
const STRINGS = {};
const fromSpec = [];
for (const k of APP_KEYS) {
  if (!he[k]) throw new Error(`he.json has no ${k}`);
  STRINGS[k] = he[k];
}
// The spec's table wins for its own keys (the brief: the study shows the copy of spec section 7), so a he.json being
// rewritten beside the study cannot change a board under it; where the app's he.json already words a key differently,
// the difference is listed in data.json (`copyDiffs`) and in the study's AGENTS.md.
const copyDiffs = [];
for (const [k, v] of Object.entries(spec)) {
  STRINGS[k] = v;
  fromSpec.push(k);
  if (he[k] !== undefined && he[k] !== v) copyDiffs.push({ key: k, spec: v, app: he[k] });
}
for (const k of ['settings.nagLevel', 'settings.nagLevelHint', 'settings.nagLevelPerDay', 'nag.level.1.name', 'nag.level.4.desc',
  'detail.nagLevel', 'detail.nagLevelApp', 'detail.nagLevelPerDay', 'nag.title', 'nag.mode.level', 'nag.mode.none',
  'nag.mode.custom', 'nag.mode.levelCaption', 'nag.mode.noneCaption', 'nag.effect', 'nag.count', 'nag.count.less',
  'nag.count.more', 'nag.every', 'nag.every.option', 'nag.placement', 'nag.placement.before', 'nag.placement.after',
  'nag.placement.around', 'nag.placement.beforeOnly', 'nag.preview', 'nag.previewDropped', 'nag.previewAllDropped',
  'nag.row.fromLevel', 'nag.row.custom', 'nag.row.none', 'custom.nagLevel', 'notifications.nag.repeat']) {
  if (!STRINGS[k]) throw new Error(`no copy for ${k}`);
}
const tr = (key, params = {}) => STRINGS[key].replace(/%\{(\w+)\}/g, (_, p) => String(params[p]));

// ---- the windows, from the registry's computeWindow on the app's zmanim ----
const SHOWN = ['shacharit', 'maariv', 'krias_shma_al_hamita'];
const DEFAULT_DAILY = ['tefillin', 'krias_shma_shacharit', 'shacharit', 'mincha', 'maariv', 'krias_shma_al_hamita'];
const windowOn = (mitzvah, iso) => {
  const day = DateTime.fromISO(iso, { zone: TZ }).set({ hour: 12 });
  const zmanim = ZmanimService.getZmanim(day.toJSDate(), location);
  const w = mitzvah.computeWindow({ date: day.toJSDate(), location, settings, zmanim });
  if (!w) throw new Error(`${mitzvah.id}: no window on ${iso}`);
  return { start: w.start, end: w.end };
};
const NEXT = DateTime.fromISO(DATE).plus({ days: 1 }).toISODate();
const hm = (ms) => {
  const m = Math.floor(ms / 60_000);
  const d = ((m % 1440) + 1440) % 1440;
  return String(Math.floor(d / 60)).padStart(2, '0') + ':' + String(d % 60).padStart(2, '0');
};

const mitzvot = {};
for (const id of SHOWN) {
  const m = MITZVOT.find((x) => x.id === id);
  const days = [DATE, NEXT].map((iso) => windowOn(m, iso));
  const w = days.map((x) => ({ start: msOf(x.start), end: msOf(x.end) }));
  mitzvot[id] = {
    id,
    name: m.name.he,
    icon: m.icon,
    windows: w,
    timeRange: tr(Math.floor(w[0].end / 86_400_000) > 0 ? 'detail.timeRangeNextDay' : 'detail.timeRange', { start: hm(w[0].start), end: hm(w[0].end) }),
    reminders: m.defaultReminders.map((r) => ({
      anchor: r.anchor,
      offsetMin: r.offsetMin,
      label: r.label,
      skipIfDone: r.skipIfDone === true,
      bodyVariants: r.bodyVariants ?? [],
    })),
    _dates: days,
  };
}
const daily = DEFAULT_DAILY.map((id) => {
  const m = MITZVOT.find((x) => x.id === id);
  return { id, name: m.name.he, reminders: m.defaultReminders.length };
});
const mainsPerDay = daily.reduce((n, d) => n + d.reminders, 0);

// ---- the ports the boards run, checked against the app ----
// buildTriggerTime() of planners/mitzvot.ts, in milliseconds since the day's midnight (the planner imports the stores, so it
// is mirrored here with its own Luxon steps and the port is checked against the mirror).
const mirrorTrigger = (r, w) => {
  if (r.anchor === 'clock') {
    const after = (from) => {
      const first = DateTime.fromJSDate(from, { zone: TZ }).set({ hour: Math.floor(r.offsetMin / 60), minute: r.offsetMin % 60, second: 0, millisecond: 0 });
      return (first.toMillis() < from.getTime() ? first.plus({ days: 1 }) : first).toJSDate();
    };
    const inWindow = after(w.start);
    if (inWindow.getTime() <= w.end.getTime()) return inWindow;
    return after(new Date(w.start.getTime() - HEADS_UP_MAX_MIN * 60_000));
  }
  return new Date((r.anchor === 'start' ? w.start : w.end).getTime() + r.offsetMin * 60_000);
};
const portTrigger = (r, w) => {
  if (r.anchor === 'clock') {
    const after = (from) => {
      const day = Math.floor(from / 86_400_000) * 86_400_000;
      const first = day + r.offsetMin * 60_000;
      return first < from ? first + 86_400_000 : first;
    };
    const inWindow = after(w.start);
    return inWindow <= w.end ? inWindow : after(w.start - HEADS_UP_MAX_MIN * 60_000);
  }
  return (r.anchor === 'start' ? w.start : w.end) + r.offsetMin * 60_000;
};
const portFires = (ms, w, nowMs, anchor) => {
  if (ms <= nowMs) return false;
  if (anchor === 'followUp') return ms > w.end && ms <= w.end + FOLLOW_UP_MAX_MIN * 60_000;
  return ms >= w.start - HEADS_UP_MAX_MIN * 60_000 && ms <= w.end;
};
const nowMs = msOf(nowDate);
const COUNTS = [1, 2, 3, 4, 5];
const EVERY = [3, 5, 10, 15];
const offsets = (count, every, placement) => {
  const before = placement === 'before' ? count : placement === 'around' && count > 1 ? Math.floor(count / 2) : 0;
  const out = [];
  for (let k = before; k >= 1; k--) out.push(-k * every);
  for (let k = 1; k <= count - before; k++) out.push(k * every);
  return out;
};
let checked = 0;
const probe = (id, r, dayIndex) => {
  const m = mitzvot[id];
  const wd = m._dates[dayIndex];
  const ws = m.windows[dayIndex];
  const main = portTrigger(r, ws);
  const mirror = msOf(mirrorTrigger(r, wd));
  if (Math.abs(main - mirror) > 0) throw new Error(`${id} ${JSON.stringify(r)}: trigger port ${main} != ${mirror}`);
  for (const count of COUNTS) for (const every of EVERY) for (const placement of ['before', 'after', 'around']) {
    for (const off of [0, ...offsets(count, every, placement)]) {
      const ms = main + off * 60_000;
      const real = reminderFires(new Date(base + ms), wd, location, nowDate, r.anchor);
      if (real !== portFires(ms, ws, nowMs, r.anchor)) throw new Error(`${id} ${JSON.stringify(r)} ${off}: fires port disagrees`);
      checked++;
    }
  }
};
for (const id of SHOWN) {
  const extra = [];
  for (let off = -180; off <= 240; off += 5) extra.push({ anchor: 'start', offsetMin: off });
  for (let off = -240; off <= 0; off += 5) extra.push({ anchor: 'end', offsetMin: off });
  for (let c = 0; c < 1440; c += 5) extra.push({ anchor: 'clock', offsetMin: c });
  for (const r of [...mitzvot[id].reminders, ...extra]) for (const d of [0, 1]) probe(id, r, d);
}

// The level table and the placement rule (spec 3.2 and 3.2.1), as the boards carry them, checked against
// src/utils/nagging.ts when the app has it (it is being built beside this study; without it the check is skipped).
const NAG_LEVELS = { 1: { count: 0, everyMin: 0 }, 2: { count: 1, everyMin: 10 }, 3: { count: 2, everyMin: 5 }, 4: { count: 3, everyMin: 5 } };
const portPlacements = (id, anchor) =>
  anchor === 'blockExit' ? ['after'] : anchor === 'end' || id === 'krias_shma_al_hamita' ? ['before'] : ['before', 'after', 'around'];
let nagUtil = null;
try {
  nagUtil = await app('utils/nagging.ts');
} catch {
  nagUtil = null;
}
if (nagUtil) {
  for (const level of [1, 2, 3, 4]) {
    const a = nagUtil.NAG_LEVELS[level];
    if (a.count !== NAG_LEVELS[level].count || (a.count && a.everyMin !== NAG_LEVELS[level].everyMin)) throw new Error(`level ${level} differs from nagging.ts`);
  }
  for (const id of [...SHOWN, 'tefillin', 'custom_x']) for (const anchor of ['start', 'end', 'clock', 'followUp', 'blockExit']) {
    if (nagUtil.nagPlacementsFor(id, { anchor }).join() !== portPlacements(id, anchor).join()) throw new Error(`placements ${id} ${anchor} differ from nagging.ts`);
    checked++;
  }
  for (const count of COUNTS) for (const every of EVERY) for (const placement of ['before', 'after', 'around']) {
    if (nagUtil.repeatOffsets({ count, everyMin: every, placement }).join() !== offsets(count, every, placement).join()) throw new Error(`offsets ${count} ${every} ${placement} differ from nagging.ts`);
    checked++;
  }
}

// timingSummary() of utils/reminderTiming.ts, ported for rows the board edits.
const tFn = (key, params) => tr(key, params);
const portSummary = (r) => {
  const mm = (n) => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
  if (r.anchor === 'clock') return tr('reminder.summary.clock', { time: mm(r.offsetMin) });
  const timing = r.anchor === 'start' ? (r.offsetMin < 0 ? 'beforeStart' : 'fromStart') : r.anchor === 'end' ? 'beforeEnd' : r.anchor;
  const n = Math.abs(r.offsetMin);
  if (n === 0) {
    if (timing === 'beforeStart' || timing === 'fromStart') return tr('reminder.summary.atStart');
    if (timing === 'beforeEnd') return tr('reminder.summary.atEnd');
  }
  return tr(`reminder.summary.${timing}`, { n });
};
const summaryCases = [
  ...[-180, -30, -5, 0, 5, 45, 120, 300].map((o) => ({ anchor: 'start', offsetMin: o })),
  ...[-240, -45, -1, 0].map((o) => ({ anchor: 'end', offsetMin: o })),
  ...[0, 5, 59, 600, 1380, 1439].map((o) => ({ anchor: 'clock', offsetMin: o })),
  ...[1, 60, 720].map((o) => ({ anchor: 'followUp', offsetMin: o })),
];
for (const r of summaryCases) {
  if (timingSummary(r, tFn) !== portSummary(r)) throw new Error(`summary port: ${JSON.stringify(r)} ${timingSummary(r, tFn)} != ${portSummary(r)}`);
  checked++;
}

// reminderClock() of utils/customMitzvah.ts: the custom form's clock for a reminder, and (spec 4.4) for each repeat at
// the same bounds. A repeat is judged as a reminder at its own distance from the hours' start.
const toMin = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
const portDuration = (s, e) => {
  const d = (toMin(e) - toMin(s) + 1440) % 1440;
  return d === 0 ? 1440 : d;
};
const portFromStart = (startHHMM, endHHMM, r) => {
  const start = toMin(startHHMM);
  const duration = portDuration(startHHMM, endHHMM);
  if (r.anchor === 'clock') {
    const after = (r.offsetMin - start + 1440) % 1440;
    return after > duration && after >= 1440 - HEADS_UP_MAX_MIN ? after - 1440 : after;
  }
  return (r.anchor === 'start' ? 0 : duration) + r.offsetMin;
};
const portClock = (startHHMM, endHHMM, fromStart, anchor) => {
  const duration = portDuration(startHHMM, endHHMM);
  const [lo, hi] = anchor === 'followUp' ? [duration + 1, duration + FOLLOW_UP_MAX_MIN] : [-HEADS_UP_MAX_MIN, duration];
  if (!(fromStart >= lo && fromStart <= hi)) return null;
  const m = (((toMin(startHHMM) + fromStart) % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
};
const HOURS = [['21:00', '22:30'], ['06:00', '07:00'], ['22:00', '01:00'], ['04:30', '04:30'], ['23:40', '00:10']];
for (const [s, e] of HOURS) {
  const duration = portDuration(s, e);
  const cases = [
    ...[-180, -60, 0, 30, 90, 200].map((o) => ({ anchor: 'start', offsetMin: o })),
    ...[-30, 0].map((o) => ({ anchor: 'end', offsetMin: o })),
    ...[0, 300, 1290, 1320, 1350, 1439].map((o) => ({ anchor: 'clock', offsetMin: o })),
    ...[1, 60, 720].map((o) => ({ anchor: 'followUp', offsetMin: o })),
  ];
  for (const r of cases) {
    const fromStart = portFromStart(s, e, r);
    if (reminderClock(s, e, r) !== portClock(s, e, fromStart, r.anchor)) throw new Error(`clock port: ${s}-${e} ${JSON.stringify(r)}`);
    checked++;
    for (const off of [-45, -15, -3, 3, 10, 45]) {
      const at = fromStart + off;
      const as = r.anchor === 'followUp' ? { anchor: 'followUp', offsetMin: at - duration } : { anchor: 'start', offsetMin: at };
      if (reminderClock(s, e, as) !== portClock(s, e, at, r.anchor)) throw new Error(`repeat clock port: ${s}-${e} ${JSON.stringify(r)} ${off}`);
      checked++;
    }
  }
}

// ---- the date line, the Hebrew date and the palettes ----
const dt = DateTime.fromISO(DATE, { zone: TZ });
const dateLine = `${STRINGS[`weekday.long.${dt.weekday % 7}`]}, ${dt.day} ב${STRINGS[`month.long.${dt.month}`]} ${dt.year}`;
const plain = (s) => String(s).replace(/[֑-ׇ]/g, '');
const hebDate = plain(new hc.HDate(new Date(dt.year, dt.month - 1, dt.day)).renderGematriya(true));

const colors = readFileSync(join(REPO, 'src', 'theme', 'colors.ts'), 'utf8');
const KEYS = ['bg', 'surface', 'surface2', 'text', 'textSub', 'textMuted', 'border', 'gold', 'onGold', 'goldLight', 'goldText', 'urgent', 'onUrgent', 'urgentBg', 'safe', 'tabBg', 'shadow', 'overlay'];
const palette = (constant) => {
  const block = colors.slice(colors.indexOf(`export const ${constant}:`));
  return Object.fromEntries(KEYS.map((k) => [k, block.match(new RegExp(`\\n  ${k}: '([^']+)'`))[1]]));
};
const PALETTES = { gold: palette('T_LIGHT'), dark: palette('T_DARK') };

// ---- the mitzvah icons the app draws (jewishIcons.generated.ts, painted by MitzvahIcon's toneOf()) ----
const icons = readFileSync(join(REPO, 'src', 'components', 'jewishIcons.generated.ts'), 'utf8');
const literal = (marker) => {
  const start = icons.indexOf(marker) + marker.length;
  return new Function(`return ${icons.slice(start, icons.indexOf('};', start) + 1)}`)();
};
const ICONS = literal('JewishIconNode[]> = ');
const TONES = literal('{ share: number; with: string }> = ');
// MitzvahIcon's hex(): a three-digit colour is expanded first.
const hex = (v) => {
  const h = v.replace('#', '');
  const full = h.length === 3 ? [...h].map((d) => d + d).join('') : h.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};
const toneOf = (color, role) => {
  const tone = TONES[role];
  if (!tone) return color;
  const o = hex(tone.with);
  return '#' + hex(color).map((c, i) => Math.round(c * tone.share + o[i] * (1 - tone.share)).toString(16).padStart(2, '0')).join('');
};
const kebab = (k) => (k === 'viewBox' ? k : k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()));
const svgOf = (name, color, gid) => {
  const paint = (v) => (v === undefined ? undefined : v === 'none' ? 'none' : v.url ? `url(#${gid})` : toneOf(color, v.role));
  const node = ({ t, c, id, fill, stroke, stopColor, ...attrs }) => {
    const a = { ...attrs };
    if (paint(fill) !== undefined) a.fill = paint(fill);
    if (paint(stroke) !== undefined) a.stroke = paint(stroke);
    if (paint(stopColor) !== undefined) a.stopColor = paint(stopColor);
    if (id) a.id = gid;
    const tag = t === 'linearGradient' ? 'linearGradient' : t;
    const at = Object.entries(a).map(([k, v]) => ` ${kebab(k)}="${String(v).replace(/"/g, '&quot;')}"`).join('');
    return `<${tag}${at}>${(c || []).map(node).join('')}</${tag}>`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="2 2 44 44">${ICONS[name].map(node).join('')}</svg>`;
};
const uri = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
const ICON_URIS = {};
for (const name of ['shacharit', 'maariv', 'night']) {
  ICON_URIS[name] = Object.fromEntries(Object.entries(PALETTES).map(([p, c]) => [p, uri(svgOf(name, c.gold, `g-${name}-${p}`))]));
}
const notif = readFileSync(join(REPO, 'design', 'jew365-concepts', 'vector', 'mark-o-notif.svg'), 'utf8').replace(/<title>[^<]*<\/title>/, '');
const appJson = JSON.parse(readFileSync(join(REPO, 'app.json'), 'utf8'));
const notifPlugin = appJson.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-notifications');
const NOTIF_COLOR = notifPlugin[1].color;
// The notification silhouette in app.json's notification colour; on the dark shade, the same blue lifted to read there.
ICON_URIS.notif = { gold: uri(notif.replace(/#000000/g, NOTIF_COLOR)), dark: uri(notif.replace(/#000000/g, '#8FA8F0')) };

for (const m of Object.values(mitzvot)) delete m._dates;
const out = {
  date: DATE,
  dateLine,
  hebDate,
  city: location.name,
  now: NOW,
  nowMs,
  epochMidnight: base,
  headsUpMax: HEADS_UP_MAX_MIN,
  followUpMax: FOLLOW_UP_MAX_MIN,
  mitzvot,
  daily,
  mainsPerDay,
  nagLevels: NAG_LEVELS,
  checkedAgainstNaggingTs: Boolean(nagUtil),
  strings: STRINGS,
  fromSpec,
  copyDiffs,
  palettes: PALETTES,
  icons: ICON_URIS,
  notifColor: NOTIF_COLOR,
};
writeFileSync(join(here, 'data.json'), JSON.stringify(out) + '\n');
console.log(`data.json: ${DATE} ${dateLine} · ${hebDate} · now ${NOW}`);
for (const m of Object.values(mitzvot)) {
  console.log(`  ${m.name}: ${m.windows.map((w) => hm(w.start) + '-' + hm(w.end)).join(' | ')} · reminders ${m.reminders.map((r) => r.anchor + r.offsetMin).join(', ')}`);
}
console.log(`  mains a day (default daily set): ${mainsPerDay} (${daily.map((d) => d.id + ' ' + d.reminders).join(', ')})`);
console.log(`  ports checked against the app: ${checked} cases${nagUtil ? ' (nagging.ts included)' : ' (no nagging.ts yet)'} · copy from the spec: ${fromSpec.length} keys, ${copyDiffs.length} worded differently in he.json now`);
