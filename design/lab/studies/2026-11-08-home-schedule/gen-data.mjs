// Writes data.json from the app's own code: zmanim (the Ohr HaChaim rules of ZmanimService), every
// static mitzvah's window (dayWindow() over MITZVOT), the holy blocks (HebcalService.holyBlockOn) and
// the Hebrew calendar's events. Run with the loader that lets Node read the app's TypeScript:
//   TZ=Asia/Jerusalem node --import ./ts-loader/register.mjs gen-data.mjs
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, '../../../../');
if (process.env.TZ !== 'Asia/Jerusalem') throw new Error('run with TZ=Asia/Jerusalem, so the device day is the location day');
const app = (p) => import(pathToFileURL(join(REPO, 'src', p)).href);
const hc = createRequire(join(REPO, 'package.json'))('@hebcal/core');

const { ZmanimService } = await app('services/ZmanimService.ts');
const { HebcalService } = await app('services/HebcalService.ts');
const { MITZVOT } = await app('data/mitzvot.ts');
const { CITIES } = await app('data/cities.ts');
const { dayWindow } = await app('utils/buildDayTimeline.ts');
const { hilulotOn } = await app('data/hilulot.ts');
const { dayFeatures, liturgicalDay, matchesCondition } = await app('utils/siddur.ts');
const { siddurPlace, standaloneAvailability } = await app('data/siddur.ts');

const loc = CITIES.find((c) => c.cityId === 'jerusalem');
const settings = { nusach: 'sefard', halachicOpinions: { ksSofZman: 'gra' }, inIsrael: true };
const FIRST = [2026, 10, 25];
const DAYS = 75;
// Sample weeks of other seasons, for the calendar's smart lines: Shabbat Zachor, the Omer, Selichot.
const EXTRA = [[2027, 3, 14, 9], [2027, 5, 2, 9], [2027, 9, 24, 8]];
const WIN_IDS = ['tefillin', 'krias_shma_shacharit', 'shacharit', 'mincha', 'maariv', 'krias_shma_al_hamita', 'candle_lighting', 'havdalah', 'chanukah_candles', 'kiddush_levana', 'sefirat_haomer'];

const plain = (s) => String(s).replace(/\u05BE/g, ' ').replace(/[֑-ׇ]/g, '').replace(/\s+/g, ' ').trim();
const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
// Minutes from the device-local midnight of `day` (the location's, under TZ=Asia/Jerusalem), floored as clockOf() shows them.
const minOf = (day, d) => (d ? Math.floor((d.getTime() - day.getTime()) / 60000) : null);

const days = {};
const blocks = new Map();
const events = [];
const DATES = [];
for (let i = 0; i < DAYS; i++) DATES.push(new Date(FIRST[0], FIRST[1] - 1, FIRST[2] + i));
for (const [y, mo, d, n] of EXTRA) for (let i = 0; i < n; i++) DATES.push(new Date(y, mo - 1, d + i));
const place = siddurPlace(loc, true);
const omerOf = (h) => { const n = h.abs() - new hc.HDate(15, 'Nisan', h.getFullYear()).abs(); return n >= 1 && n <= 49 ? n : null; };
for (const day of DATES) {
  const key = iso(day);
  const noon = new Date(day.getTime() + 12 * 3600000);
  const z = ZmanimService.getZmanim(noon, loc);
  const zn = ZmanimService.getZmanim(new Date(noon.getTime() + 86400000), loc);
  const m = (d) => minOf(day, d);
  const hd = new hc.HDate(day);
  const hdNight = hd.next();
  const win = {};
  for (const id of WIN_IDS) {
    const mz = MITZVOT.find((x) => x.id === id);
    const w = mz && dayWindow(mz, day, loc, settings);
    if (w) win[id] = [m(w.start), m(w.end)];
  }
  const block = HebcalService.holyBlockOn(day, loc);
  if (block) blocks.set(block.start.getTime(), block);
  for (const e of hc.HebrewCalendar.calendar({ start: day, end: day, il: true, noModern: true, noSpecialShabbat: true })) {
    const f = e.getFlags();
    if (f & (hc.flags.ROSH_CHODESH | hc.flags.CHANUKAH_CANDLES | hc.flags.MINOR_FAST | hc.flags.MAJOR_FAST | hc.flags.CHAG | hc.flags.MINOR_HOLIDAY)) {
      events.push({ d: key, title: plain(e.render('he')), rc: Boolean(f & hc.flags.ROSH_CHODESH), chanukah: Boolean(f & hc.flags.CHANUKAH_CANDLES), fast: Boolean(f & (hc.flags.MINOR_FAST | hc.flags.MAJOR_FAST)) });
    }
  }
  const sedra = new hc.Sedra(hd.getFullYear(), true);
  const shabbat = hd.onOrAfter(6);
  const parashaRaw = sedra.lookup(shabbat);
  const parasha = parashaRaw && !parashaRaw.chag ? 'פרשת ' + plain(sedra.getString(shabbat, 'he')).replace(/^פרשת /, '') : '';
  const hil = (h) => hilulotOn(h, true).map((x) => x.name.he);
  days[key] = {
    wd: day.getDay(),
    weekday: 'יום ' + WEEKDAYS[day.getDay()],
    greg: day.getDate() + ' ב' + MONTHS[day.getMonth()] + ' ' + day.getFullYear(),
    gregShort: day.getDate() + ' ב' + MONTHS[day.getMonth()],
    hebDay: plain(hd.renderGematriya(true)).replace(/ [^ ]+$/, '').replace(/^(\S+) /, '$1 ב'),
    hebYear: plain(hd.renderGematriya(true)).split(' ').pop(),
    hebNight: plain(hdNight.renderGematriya(true)).replace(/ [^ ]+$/, '').replace(/^(\S+) /, '$1 ב'),
    hebFull: hd.renderGematriya(),
    hebNightFull: hdNight.renderGematriya(),
    hebLbl: plain(hd.renderGematriya(true)).replace(/ [^ ]+$/, ''),
    hebNightLbl: plain(hdNight.renderGematriya(true)).replace(/ [^ ]+$/, ''),
    parasha,
    z: {
      alot: m(z.alotHaShachar),
      misheyakir: m(z.misheyakir),
      netz: m(z.netzHaChama),
      sofShma: m(z.sofZmanShmaGra),
      sofShmaMA: m(z.sofZmanShmaMA),
      sofTfila: m(z.sofZmanTfilaGra),
      chatzot: m(z.chatzot),
      minchaG: m(z.minchaGedola),
      plag: m(z.plagHaMincha),
      shkia: m(z.shkia),
      tzeit: m(z.tzeitHakochavim),
      tzeitTaanit: m(z.tzeitTaanit),
      chatzotL: m(z.chatzotLayla),
    },
    nextAlot: m(zn.alotHaShachar),
    win,
    hilulaToday: hil(hd),
    hilulaTonight: hil(hdNight),
    omerTonight: omerOf(hdNight),
    omerToday: omerOf(hd),
    selichotTonight: matchesCondition(standaloneAvailability('selichot', 'sefard').available, dayFeatures(liturgicalDay(day, true), place)),
    special: day.getDay() === 6 ? (hc.HebrewCalendar.calendar({ start: day, end: day, il: true }).filter((e) => e.getFlags() & hc.flags.SPECIAL_SHABBAT).map((e) => plain(e.render('he')))[0] || '') : '',
  };
}

const blockOut = [...blocks.values()]
  .map((b) => {
    const erev = iso(new Date(b.start.getFullYear(), b.start.getMonth(), b.start.getDate()));
    const end = iso(new Date(b.end.getFullYear(), b.end.getMonth(), b.end.getDate()));
    if (!days[erev] || !days[end]) return null;
    const startMin = minOf(new Date(erev + 'T00:00'), b.start);
    const endMin = minOf(new Date(end + 'T00:00'), b.end);
    const ex = days[end];
    const title = b.kind === 'shabbat' && ex.parasha ? 'שבת ' + ex.parasha : b.kind === 'shabbat' ? 'שבת' : 'חג';
    return { erev, startMin, end, endMin, kind: b.kind, title, candle: startMin, exit: endMin };
  })
  .filter(Boolean);

// The molad of each month the data reaches, as the app's calendar library renders it.
const molad = [];
for (const [y, mo] of [[5787, 8], [5787, 9], [5787, 10], [5787, 11]]) {
  const m = new hc.Molad(y, mo);
  molad.push({ he: plain(m.render('he')) });
}
const out = { molad, city: 'ירושלים', first: iso(new Date(...[FIRST[0], FIRST[1] - 1, FIRST[2]])), demo: '2026-11-09', days, blocks: blockOut, events };
writeFileSync(join(here, 'data.json'), JSON.stringify(out));
const hm = (v) => String(Math.floor(v / 60) % 24).padStart(2, '0') + ':' + String(v % 60).padStart(2, '0');
console.log('days', Object.keys(days).length, 'blocks', blockOut.length, 'events', events.length, 'bytes', JSON.stringify(out).length);
for (const k of ['2026-11-09', '2026-11-13', '2026-12-06', '2026-12-11']) {
  const d = days[k];
  console.log(k, d.hebLbl, Object.entries(d.z).map(([a, v]) => a + '=' + hm(v)).join(' '));
  console.log('   win', Object.entries(d.win).map(([a, [s, e]]) => a + ' ' + hm(s) + '-' + hm(e) + (e >= 1440 ? '+' + Math.floor(e / 1440) : '')).join(' | '));
}
console.log('blocks', blockOut.map((b) => b.erev + ' ' + hm(b.candle) + ' → ' + b.end + ' ' + hm(b.exit) + ' ' + b.title).join('\n  '));
console.log('events', events.map((e) => e.d + ' ' + e.title).join(' | '));
