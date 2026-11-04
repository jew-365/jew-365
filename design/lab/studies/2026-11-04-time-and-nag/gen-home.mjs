// Writes data/home.json for the home boards: 68 days of Jerusalem from 25 October 2026, the demo day 4 November
// 2026. A copy of the 2026-10-29-home-ellipse generator with one change: the zmanim, candle lighting and the exit come
// from the app's own ZmanimService (the Ohr HaChaim method of 2026-11-03), loaded through ts-hooks.mjs, floored to the
// minute as the app's clockOf() prints them.
import { createRequire, register } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const REPO = fileURLToPath(new URL('../../../../', import.meta.url));
register(pathToFileURL(join(here, 'ts-hooks.mjs')).href);
const app = (p) => import(pathToFileURL(join(REPO, 'src', p)).href);
const { ZmanimService, candleLightingMinutes } = await app('services/ZmanimService.ts');
const { CITIES } = await app('data/cities.ts');
const { hilulotOn } = await app('data/hilulot.ts');
const req = createRequire(join(REPO, 'package.json'));
const { DateTime } = req('luxon');
const hc = req('@hebcal/core');

const location = CITIES.find((c) => c.cityId === 'jerusalem');
const TZ = location.tz;
const hcLoc = new hc.Location(location.lat, location.lng, true, TZ, 'Jerusalem', 'IL', undefined, location.elevation ?? 0);
const FIRST = DateTime.fromISO('2026-10-25', { zone: TZ });
const DEMO = '2026-11-04';
const DAYS = 68;

const plain = (s) => String(s).replace(/[\u0591-\u05C7]/g, '').replace(/\s+/g, ' ').trim();
const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

function hebParts(hd) {
  const t = plain(hd.renderGematriya(true)).split(' ');
  return { day: t[0], month: t.slice(1, -1).join(' '), year: t[t.length - 1] };
}

function zmanimFor(date) {
  const z = ZmanimService.getZmanim(date.set({ hour: 12 }).toJSDate(), location);
  const midnight = date.startOf('day');
  const min = (d) => Math.floor(DateTime.fromJSDate(d).setZone(TZ).diff(midnight, 'minutes').minutes);
  return {
    alot: min(z.alotHaShachar),
    misheyakir: min(z.misheyakir),
    netz: min(z.netzHaChama),
    sofShma: min(z.sofZmanShmaGra),
    sofTfila: min(z.sofZmanTfilaGra),
    chatzot: min(z.chatzot),
    minchaG: min(z.minchaGedola),
    plag: min(z.plagHaMincha),
    shkia: min(z.shkia),
    tzeit: min(z.tzeitHakochavim),
    chatzotL: min(z.chatzotLayla),
    candle: min(z.shkia) - candleLightingMinutes(location),
    exit: min(z.tzeitShabbat),
  };
}

const days = {};
const holyDates = [];
const events = [];
for (let i = 0; i < DAYS; i++) {
  const date = FIRST.plus({ days: i });
  const key = date.toISODate();
  const jsLocal = new Date(date.year, date.month - 1, date.day);
  const hd = new hc.HDate(jsLocal);
  const hdNight = hd.next();
  const p = hebParts(hd);
  const pn = hebParts(hdNight);
  const z = zmanimFor(date);
  const zNext = zmanimFor(date.plus({ days: 1 }));
  const sedra = new hc.Sedra(hd.getFullYear(), true);
  const shabbat = hd.onOrAfter(6);
  const parashaRaw = sedra.lookup(shabbat);
  const parasha = parashaRaw && !parashaRaw.chag ? 'פרשת ' + plain(sedra.getString(shabbat, 'he')).replace(/^פרשת /, '') : '';
  const evs = hc.HebrewCalendar.calendar({ start: jsLocal, end: jsLocal, il: true, location: hcLoc, noMinorFast: false, noModern: true, noSpecialShabbat: true });
  const chag = evs.some((e) => e.getFlags() & hc.flags.CHAG);
  const isHoly = date.weekday === 6 || chag;
  if (isHoly) holyDates.push(key);
  for (const e of evs) {
    const f = e.getFlags();
    if (f & (hc.flags.ROSH_CHODESH | hc.flags.CHANUKAH_CANDLES | hc.flags.MINOR_FAST | hc.flags.MAJOR_FAST | hc.flags.CHAG | hc.flags.MINOR_HOLIDAY)) {
      events.push({ d: key, title: plain(e.render('he')), rc: Boolean(f & hc.flags.ROSH_CHODESH), chanukah: Boolean(f & hc.flags.CHANUKAH_CANDLES) });
    }
  }
  const hil = (h) => hilulotOn(h, true).map((x) => x.name.he);
  days[key] = {
    wd: date.weekday % 7,
    weekday: 'יום ' + WEEKDAYS[date.weekday % 7],
    greg: date.day + ' ב' + MONTHS[date.month - 1] + ' ' + date.year,
    gregShort: date.day + ' ב' + MONTHS[date.month - 1],
    hebDay: p.day + ' ב' + p.month,
    hebYear: p.year,
    hebNight: pn.day + ' ב' + pn.month,
    hebFull: hd.renderGematriya(),
    hebNightFull: hdNight.renderGematriya(),
    hebLbl: hd.renderGematriya(true).replace(/ [^ ]+$/, ''),
    hebNightLbl: hdNight.renderGematriya(true).replace(/ [^ ]+$/, ''),
    parasha,
    z,
    nextAlot: zNext.alot + 1440,
    hilulaToday: hil(hd),
    hilulaTonight: hil(hdNight),
  };
}

const blocks = [];
for (const key of holyDates) {
  const prev = DateTime.fromISO(key, { zone: TZ }).minus({ days: 1 }).toISODate();
  const last = blocks[blocks.length - 1];
  if (last && last.lastDate === prev) {
    last.lastDate = key;
    continue;
  }
  blocks.push({ erev: prev, lastDate: key });
}
const blockOut = blocks
  .filter((b) => days[b.erev] && days[b.lastDate])
  .map((b) => {
    const exitDay = days[b.lastDate];
    const title = exitDay.wd === 6 && exitDay.parasha ? 'שבת ' + exitDay.parasha : 'שבת';
    return {
      erev: b.erev,
      startMin: days[b.erev].z.candle,
      end: b.lastDate,
      endMin: exitDay.z.exit,
      title,
      candle: days[b.erev].z.candle,
      exit: exitDay.z.exit,
    };
  });

const out = { city: 'ירושלים', first: FIRST.toISODate(), demo: DEMO, days, blocks: blockOut, events };
mkdirSync(join(here, 'data'), { recursive: true });
writeFileSync(join(here, 'data', 'home.json'), JSON.stringify(out));
const d = days[DEMO];
const hm = (m) => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
console.log('days', Object.keys(days).length, 'blocks', blockOut.length, 'events', events.length, 'bytes', JSON.stringify(out).length);
console.log(DEMO, d.weekday, d.hebDay, d.hebYear, d.hebNight, d.parasha, Object.entries(d.z).map(([k, v]) => k + '=' + hm(v)).join(' '), 'hil', d.hilulaToday, d.hilulaTonight);
console.log('blocks', blockOut.slice(0, 2).map((b) => b.erev + ' ' + hm(b.candle) + ' → ' + b.end + ' ' + hm(b.exit) + ' ' + b.title));
console.log('events', events.map((e) => e.d + ' ' + e.title).join(' | '));
