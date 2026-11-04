// Writes data.json: everything the boards show, computed at build time by the app's own code through ts-hooks.mjs.
// For each mitzvah of the study: its window on the day (the registry's computeWindow() on ZmanimService zmanim, or the
// custom adapter's hours), its default reminders' triggers (a mirror of the planner's buildTriggerTime() for start,
// end and clock anchors), its critical zone (the planner's kindZone() for a registry kind, the app's customNagZone()
// for the custom mitzvah), its last-chance points (end less performMinOf()), and, for every level, the nags the app's
// own smartNagTimes() sends on a plain weekday (no quiet hours, no holy block): the boards' port of that function must
// agree with them, which check.mjs asserts. The copy is the app's he.json.
import { register, createRequire } from 'node:module';
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
const nagging = await app('utils/nagging.ts');
const req = createRequire(join(REPO, 'package.json'));
const { DateTime } = req('luxon');

// ---- the day: Wednesday 4 November 2026 in Jerusalem (the day of the time-and-nag study) ----
const DATE = '2026-11-04';
const location = CITIES.find((c) => c.cityId === 'jerusalem');
const settings = { nusach: 'sefard', halachicOpinions: { ksSofZman: 'GRA' }, inIsrael: true };
const TZ = location.tz;
const midnight = DateTime.fromISO(DATE, { zone: TZ }).startOf('day');
const base = midnight.toMillis();
const msOf = (d) => d.getTime() - base;
const clock = (ms) => DateTime.fromMillis(base + ms, { zone: TZ }).toFormat('HH:mm');
const zmanim = ZmanimService.getZmanim(new Date(base + 12 * 3600_000), location);
const ctx = { date: new Date(2026, 10, 4), location, settings, zmanim };
const he = JSON.parse(readFileSync(join(REPO, 'src', 'i18n', 'he.json'), 'utf8'));

// The planner's buildTriggerTime() for the anchors the study's mitzvot use.
function trigger(r, w) {
  if (r.anchor === 'start') return w.start + r.offsetMin * 60_000;
  if (r.anchor === 'end') return w.end + r.offsetMin * 60_000;
  if (r.anchor === 'clock') {
    let at = r.offsetMin * 60_000;
    while (at < w.start) at += 24 * 3600_000;
    if (at <= w.end) return at;
    at = r.offsetMin * 60_000;
    while (at < w.start - nagging.CUSTOM_ZONE_MAX_MIN * 60_000) at += 24 * 3600_000;
    return at;
  }
  throw new Error(`anchor ${r.anchor} not in the study`);
}

// A sample custom mitzvah: the user's own hours, not zmanim (allowed by the lab's contract).
const CUSTOM = {
  id: 'custom_study',
  name: { he: 'לימוד יומי' },
  icon: 'custom',
  performMin: { alone: 20 },
  hours: { start: 9 * 60, end: 21 * 60 },
  defaultReminders: [
    { anchor: 'start', offsetMin: 0, label: 'זמן ללימוד היומי' },
    { anchor: 'clock', offsetMin: 18 * 60, label: 'עוד לא למדת היום' },
  ],
};

const IDS = ['shacharit', 'mincha', 'maariv', 'krias_shma_al_hamita', CUSTOM.id];
const mitzvot = {};
for (const id of IDS) {
  const m = id === CUSTOM.id ? CUSTOM : MITZVOT.find((x) => x.id === id);
  const win =
    id === CUSTOM.id
      ? { start: CUSTOM.hours.start * 60_000, end: CUSTOM.hours.end * 60_000 }
      : (() => {
          const w = m.computeWindow(ctx);
          return { start: msOf(w.start), end: msOf(w.end) };
        })();
  const kind = nagging.nagZoneKindOf(id);
  const perform = nagging.performMinOf(m);
  const lc = (min) => (min && nagging.hasLastChance(kind) ? win.end - min * 60_000 : null);
  const lastChance = { alone: lc(perform.alone), minyan: lc(perform.minyan) };
  let zone;
  let sparse;
  if (kind === 'custom') {
    const z = nagging.customNagZone(
      { start: new Date(base + win.start), end: new Date(base + win.end) },
      new Date(base + lastChance.alone),
      { crossesMidnight: clock(win.start) > clock(win.end), chatzotLayla: zmanim.chatzotLayla },
    );
    zone = z.zone.map((i) => ({ start: msOf(i.start), end: msOf(i.end) }));
    sparse = z.sparse;
  } else if (kind === 'night') {
    zone = [{ start: win.start, end: msOf(zmanim.chatzotLayla) }];
    sparse = true;
  } else if (kind === 'lastThird') {
    zone = [{ start: win.end - (win.end - win.start) / 3, end: win.end }];
    sparse = false;
  } else throw new Error(`kind ${kind} not in the study`);

  const reminders = m.defaultReminders.map((r) => ({ label: r.label, at: trigger(r, win) }));
  // The app's smartNagTimes() at every level, for check.mjs to hold the boards' port to.
  const expect = {};
  for (const level of [1, 2, 3, 4]) {
    expect[level] = nagging
      .smartNagTimes({
        level,
        window: { start: new Date(base + win.start), end: new Date(base + win.end) },
        zone: zone.map((i) => ({ start: new Date(base + i.start), end: new Date(base + i.end) })),
        sparseUntil: sparse ? new Date(base + win.end) : null,
        lastChance: {
          alone: lastChance.alone === null ? null : new Date(base + lastChance.alone),
          minyan: lastChance.minyan === null ? null : new Date(base + lastChance.minyan),
        },
        taken: reminders.map((r) => new Date(base + r.at)),
        accept: (planned) => planned,
      })
      .map((n) => ({ at: msOf(n.at), kind: n.kind, ...(n.lastChance ? { lastChance: n.lastChance } : {}) }));
  }
  mitzvot[id] = {
    id,
    name: m.name.he,
    window: win,
    timeRange: `${clock(win.start)} עד ${clock(win.end)}${clock(win.end) < clock(win.start) ? ' למחרת' : ''}`,
    zone,
    sparse,
    lastChance,
    performMin: perform,
    reminders,
    expect,
  };
}

const keys = [
  'notifications.timeLeft.line',
  'notifications.nag.lastChance',
  'notifications.nag.lastChanceMinyan',
  'notifications.nag.notMarked',
  'time.unit.minutes',
  'time.unit.hours',
  'time.unit.days',
  'detail.nagLevel',
  'nag.level.1.name',
  'nag.level.2.name',
  'nag.level.3.name',
  'nag.level.4.name',
  'detail.timeRange',
  'detail.addReminder',
  'reminder.delete',
];
const copy = Object.fromEntries(keys.map((k) => [k, he[k]]));
for (const k of keys) if (!copy[k]) throw new Error(`he.json lacks ${k}`);

const { THEMES } = await app('theme/colors.ts');
const notifPlugin = JSON.parse(readFileSync(join(REPO, 'app.json'), 'utf8')).expo.plugins.find(
  (p) => Array.isArray(p) && p[0] === 'expo-notifications',
);

const data = {
  date: DATE,
  dateLine: 'יום רביעי, 4 בנובמבר 2026',
  hebDate: 'כ״ד חשון תשפ״ז',
  city: location.name,
  epochMidnight: base,
  tz: TZ,
  minGapMin: nagging.NAG_MIN_GAP_MIN,
  sparseGapMin: nagging.SPARSE_MIN_GAP_MIN,
  zoneNags: nagging.ZONE_NAGS,
  mitzvot,
  copy,
  palettes: { gold: THEMES.gold, dark: THEMES.dark },
  notifColor: notifPlugin[1].color,
};
writeFileSync(join(here, 'data.json'), JSON.stringify(data) + '\n');
for (const m of Object.values(mitzvot)) {
  console.log(m.name, m.timeRange, 'nags at 4:', m.expect[4].map((n) => clock(n.at) + n.kind[0]).join(' '));
}
