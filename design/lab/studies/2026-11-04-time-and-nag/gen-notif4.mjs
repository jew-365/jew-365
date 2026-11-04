// Round 4 (the owner's question of 2026-11-04 on the room inside a notification): writes data/notif4.json with the
// app's own code (ts-hooks.mjs), on the smart nag that replaced the repeats of data/notif.json. Wednesday 4 November
// 2026 in Jerusalem, the default daily set: each window from the registry's computeWindow() on ZmanimService zmanim,
// its default reminders (a mirror of the planner's buildTriggerTime() and of bodyForReminder()'s variant), and at
// levels 1 and 3 every send of the window from the app's smartNagTimes() (its zone as the planner's kindZone() draws
// it), each with the app's stage (sendStage()) and the time-left line the app writes (timeLeftLine()).
import { createRequire, register } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, '..', '..', '..', '..');
register(pathToFileURL(join(here, 'ts-hooks.mjs')).href);
const app = (p) => import(pathToFileURL(join(REPO, 'src', p)).href);

const { ZmanimService } = await app('services/ZmanimService.ts');
const { CITIES } = await app('data/cities.ts');
const { MITZVOT } = await app('data/mitzvot.ts');
const { reminderFires } = await app('utils/skipRules.ts');
const nagging = await app('utils/nagging.ts');
const { sendStage, timeLeftLine } = await app('utils/timeLeft.ts');
const req = createRequire(join(REPO, 'package.json'));
const { DateTime } = req('luxon');
const hc = req('@hebcal/core');

const DATE = '2026-11-04';
const location = CITIES.find((c) => c.cityId === 'jerusalem');
const settings = { nusach: 'sefard', halachicOpinions: { ksSofZman: 'GRA' }, inIsrael: true };
const TZ = location.tz;
const midnight = DateTime.fromISO(DATE, { zone: TZ }).startOf('day');
const base = midnight.toMillis();
const msOf = (d) => d.getTime() - base;
// Everything is judged from the day's first minute, so every reminder of the day counts as still to come.
const nowDate = new Date(base);

const he = JSON.parse(readFileSync(join(REPO, 'src', 'i18n', 'he.json'), 'utf8'));
const KEYS = ['notifications.markDone', 'siddur.open', 'time.unit.minutes', 'time.unit.hours', 'time.unit.days',
  'notifications.timeLeft.line', 'notifications.timeLeft.startsIn', 'notifications.timeLeft.ended',
  'notifications.nag.lastChance', 'notifications.nag.lastChanceMinyan', 'notifications.nag.notMarked',
  ...[0, 1, 2, 3, 4, 5, 6].map((d) => `weekday.long.${d}`), ...Array.from({ length: 12 }, (_, i) => `month.long.${i + 1}`),
  ...[1, 2, 3, 4].map((l) => `nag.level.${l}.name`)];
const STRINGS = {};
for (const k of KEYS) {
  if (!he[k]) throw new Error(`he.json has no ${k}`);
  STRINGS[k] = he[k];
}

const DAILY = ['tefillin', 'krias_shma_shacharit', 'shacharit', 'mincha', 'maariv', 'krias_shma_al_hamita'];
const day = midnight.set({ hour: 12 });
const zmanim = ZmanimService.getZmanim(day.toJSDate(), location);
const t = (key, params) => String(he[key]).replace(/%\{(\w+)\}/g, (m, k) => (params && k in params ? params[k] : m));

// buildTriggerTime() of planners/mitzvot.ts with its own Luxon steps.
const triggerOf = (r, w) => {
  if (r.anchor === 'clock') {
    const after = (from) => {
      const first = DateTime.fromJSDate(from, { zone: TZ }).set({ hour: Math.floor(r.offsetMin / 60), minute: r.offsetMin % 60, second: 0, millisecond: 0 });
      return (first.toMillis() < from.getTime() ? first.plus({ days: 1 }) : first).toJSDate();
    };
    const inWindow = after(w.start);
    return inWindow.getTime() <= w.end.getTime() ? inWindow : after(new Date(w.start.getTime() - 180 * 60_000));
  }
  return new Date((r.anchor === 'start' ? w.start : w.end).getTime() + r.offsetMin * 60_000);
};

const mitzvot = {};
const sends = { 1: [], 3: [] };
for (const id of DAILY) {
  const m = MITZVOT.find((x) => x.id === id);
  const w = m.computeWindow({ date: day.toJSDate(), location, settings, zmanim });
  if (!w) throw new Error(`${id}: no window`);
  mitzvot[id] = { id, name: m.name.he, icon: m.icon, start: msOf(w.start), end: msOf(w.end) };
  const reminders = m.defaultReminders
    .map((r) => {
      const at = triggerOf(r, w);
      const variants = r.bodyVariants && r.bodyVariants.length ? r.bodyVariants : [r.label];
      return { at, body: variants[Math.floor(at.getTime() / 86_400_000) % variants.length] };
    })
    .filter(({ at }) => reminderFires(at, w, location, nowDate, 'start'));
  const kind = nagging.nagZoneKindOf(id);
  const zone =
    kind === 'night'
      ? [{ start: w.start, end: zmanim.chatzotLayla }]
      : kind === 'lastThird'
        ? [{ start: new Date(w.end.getTime() - (w.end.getTime() - w.start.getTime()) / 3), end: w.end }]
        : null;
  if (!zone) throw new Error(`${id}: zone kind ${kind} not in the study`);
  const perform = nagging.performMinOf(m);
  const lc = (min) => (min ? new Date(w.end.getTime() - min * 60_000) : null);
  for (const level of [1, 3]) {
    const nags = nagging.smartNagTimes({
      level,
      window: w,
      zone,
      sparseUntil: nagging.hasSparseTail(kind) ? w.end : null,
      lastChance: { alone: lc(perform.alone), minyan: lc(perform.minyan) },
      taken: reminders.map((r) => r.at),
      accept: (planned) => (reminderFires(planned, w, location, nowDate, 'start') ? planned : null),
    });
    const list = reminders
      .map((r) => ({ at: r.at, kind: 'reminder', body: r.body, short: r.body }))
      .concat(
        nags.map((n) => {
          const body = n.lastChance
            ? t(n.lastChance === 'alone' ? 'notifications.nag.lastChance' : 'notifications.nag.lastChanceMinyan')
            : t('notifications.nag.notMarked', { name: m.name.he });
          return { at: n.at, kind: n.kind, lastChance: n.lastChance, body, short: n.lastChance ? body : 'עוד לא סימנת' };
        }),
      )
      .sort((a, b) => a.at - b.at);
    list.forEach((s, i) => {
      const sendKind = s.kind === 'reminder' ? 'reminder' : s.lastChance === 'alone' ? 'lastChanceAlone' : 'nag';
      const stage = sendStage(sendKind, i === list.length - 1);
      sends[level].push({
        id,
        at: msOf(s.at),
        kind: s.kind,
        lastChance: s.lastChance || null,
        stage,
        line: timeLeftLine(s.at, w, TZ, t, stage),
        plainLine: timeLeftLine(s.at, w, TZ, t),
        body: s.body,
        short: s.short,
        gone: Math.max(0, Math.min(1, (s.at.getTime() - w.start.getTime()) / (w.end.getTime() - w.start.getTime()))),
      });
    });
  }
}
for (const l of [1, 3]) sends[l].sort((a, b) => a.at - b.at);

const dt = DateTime.fromISO(DATE, { zone: TZ });
const dateLine = `${STRINGS[`weekday.long.${dt.weekday % 7}`]}, ${dt.day} ב${STRINGS[`month.long.${dt.month}`]}`;
const plain = (s) => String(s).replace(/[֑-ׇ]/g, '');
const hebDate = plain(new hc.HDate(new Date(dt.year, dt.month - 1, dt.day)).renderGematriya(true));

const colors = readFileSync(join(REPO, 'src', 'theme', 'colors.ts'), 'utf8');
const PKEYS = ['bg', 'surface', 'surface2', 'text', 'textSub', 'textMuted', 'border', 'gold', 'onGold', 'goldLight', 'goldText', 'urgent', 'onUrgent', 'urgentBg', 'safe', 'tabBg', 'shadow', 'overlay'];
const palette = (constant) => {
  const block = colors.slice(colors.indexOf(`export const ${constant}:`));
  return Object.fromEntries(PKEYS.map((k) => [k, block.match(new RegExp(`\\n  ${k}: '([^']+)'`))[1]]));
};
const PALETTES = { gold: palette('T_LIGHT'), dark: palette('T_DARK') };

const uri = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
const vector = (f) => readFileSync(join(REPO, 'design', 'jew365-concepts', 'vector', f), 'utf8').replace(/<title>[^<]*<\/title>/, '');
const appJson = JSON.parse(readFileSync(join(REPO, 'app.json'), 'utf8'));
const NOTIF_COLOR = appJson.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-notifications')[1].color;
const notif = vector('mark-o-notif.svg');
const icons = {
  // The Android status-bar silhouette, recoloured per notification by the board (it is a mask there).
  notifMask: uri(notif),
  // The iPhone shows the app icon itself.
  appIcon: uri(vector('mark-o-icon.svg')),
};

mkdirSync(join(here, 'data'), { recursive: true });
const out = { date: DATE, dateLine, hebDate, city: location.name, epochMidnight: base, mitzvot, sends, strings: STRINGS, palettes: PALETTES, icons, notifColor: NOTIF_COLOR };
writeFileSync(join(here, 'data', 'notif4.json'), JSON.stringify(out) + '\n');
const hm = (ms) => {
  const mm = Math.floor(ms / 60_000);
  return String(Math.floor(mm / 60) % 24).padStart(2, '0') + ':' + String(((mm % 60) + 60) % 60).padStart(2, '0');
};
console.log(`notif4.json: ${DATE} ${dateLine} · ${hebDate}`);
for (const s of sends[3]) console.log(`  ${hm(s.at)} ${mitzvot[s.id].name} ${s.kind}${s.lastChance ? ':' + s.lastChance : ''} ${s.stage} | ${s.line} | ${s.body}`);
