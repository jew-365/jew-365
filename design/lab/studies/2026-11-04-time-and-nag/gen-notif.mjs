// Writes data/notif.json for the notification boards, computed at build time by the app's own code (ts-hooks.mjs):
// Wednesday 4 November 2026 in Jerusalem, the default daily set (tefillin, the morning Shema, Shacharit, Mincha,
// Maariv, the bedtime Shema) with each mitzvah's window from the registry's computeWindow() on ZmanimService zmanim,
// its default reminders, the instant each one goes out (a mirror of the planner's buildTriggerTime(), which imports
// the stores) and the repeats of nagging levels 2 to 4 (offsets and placements from src/utils/nagging.ts). Every
// main and repeat is checked with the app's reminderFires(); one that does not go out is left out.
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
const { NAG_LEVELS, nagFor, repeatOffsets } = await app('utils/nagging.ts');
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
const KEYS = ['notifications.markDone', 'siddur.open', 'notifications.nag.repeat', 'notifications.timeFor', 'time.unit.minutes', 'time.unit.hours', 'home.now.ringLabel',
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
const notes = [];
for (const id of DAILY) {
  const m = MITZVOT.find((x) => x.id === id);
  const w = m.computeWindow({ date: day.toJSDate(), location, settings, zmanim });
  if (!w) throw new Error(`${id}: no window`);
  mitzvot[id] = { id, name: m.name.he, icon: m.icon, start: msOf(w.start), end: msOf(w.end) };
  m.defaultReminders.forEach((r, index) => {
    const main = triggerOf(r, w);
    if (!reminderFires(main, w, location, nowDate, r.anchor)) return;
    const variants = r.bodyVariants && r.bodyVariants.length ? r.bodyVariants : [r.label];
    // bodyForReminder(): the variant is picked by the main's trigger day; every repeat reads the same text.
    const body = variants[Math.floor(main.getTime() / 86_400_000) % variants.length];
    const repeats = {};
    for (const level of [2, 3, 4]) {
      const nag = nagFor(id, r, level);
      repeats[level] = nag
        ? repeatOffsets(nag)
            .map((off, i, all) => ({ at: msOf(main) + off * 60_000, k: i + 1, of: all.length }))
            .filter((x) => reminderFires(new Date(base + x.at), w, location, nowDate, r.anchor))
        : [];
    }
    notes.push({ id, index, anchor: r.anchor, offsetMin: r.offsetMin, at: msOf(main), body, repeats });
  });
}
notes.sort((a, b) => a.at - b.at);
for (const l of [2, 3, 4]) if (!NAG_LEVELS[l]) throw new Error(`no level ${l}`);

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
const out = { date: DATE, dateLine, hebDate, city: location.name, epochMidnight: base, mitzvot, notes, strings: STRINGS, palettes: PALETTES, icons, notifColor: NOTIF_COLOR };
writeFileSync(join(here, 'data', 'notif.json'), JSON.stringify(out) + '\n');
const hm = (ms) => {
  const mm = Math.floor(ms / 60_000);
  return String(Math.floor(mm / 60) % 24).padStart(2, '0') + ':' + String(((mm % 60) + 60) % 60).padStart(2, '0');
};
console.log(`notif.json: ${DATE} ${dateLine} · ${hebDate}`);
for (const n of notes) {
  const m = mitzvot[n.id];
  console.log(`  ${hm(n.at)} ${m.name} (${hm(m.start)}-${hm(m.end)}) ${n.anchor}${n.offsetMin} "${n.body}" · L3 ${n.repeats[3].map((r) => hm(r.at)).join(',')}`);
}
