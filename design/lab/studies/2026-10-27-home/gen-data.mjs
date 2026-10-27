import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('../../../../', import.meta.url));
const req = createRequire(join(REPO, 'package.json'));
const kz = req('kosher-zmanim');
const { DateTime } = req('luxon');
const hc = req('@hebcal/core');
const { hilulotOn } = await import(pathToFileURL(join(REPO, 'src/data/hilulot.ts')).href);

const here = dirname(fileURLToPath(import.meta.url));
const TZ = 'Asia/Jerusalem';
const geo = new kz.GeoLocation('Jerusalem', 31.7683, 35.2137, 754, TZ);
const hcLoc = new hc.Location(31.7683, 35.2137, true, TZ, 'Jerusalem', 'IL', undefined, 754);
const FIRST = DateTime.fromISO('2026-10-25', { zone: TZ });
const DAYS = 68;
const CANDLE_MIN = 40;
const EXIT_MIN = 10;

const plain = (s) => String(s).replace(/[\u0591-\u05C7]/g, '').replace(/\s+/g, ' ').trim();
const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

function hebParts(hd) {
  const t = plain(hd.renderGematriya(true)).split(' ');
  return { day: t[0], month: t.slice(1, -1).join(' '), year: t[t.length - 1] };
}

function zmanimFor(date) {
  const cal = new kz.ComplexZmanimCalendar(geo);
  cal.setDate(date.set({ hour: 12 }));
  const midnight = date.startOf('day');
  const min = (d) => {
    if (!d) return null;
    const dt = DateTime.fromJSDate(d instanceof Date ? d : d.toJSDate()).setZone(TZ);
    return Math.round(dt.diff(midnight, 'minutes').minutes);
  };
  const sunrise = cal.getSeaLevelSunrise();
  const sunset = cal.getSeaLevelSunset();
  const chatzot = min(cal.getChatzos());
  return {
    alot: min(cal.getAlosHashachar()),
    misheyakir: min(cal.getMisheyakir11Point5Degrees()),
    netz: min(sunrise),
    sofShma: min(cal.getSofZmanShmaGRA()),
    sofTfila: min(cal.getSofZmanTfilaGRA()),
    chatzot,
    minchaG: min(cal.getMinchaGedola()),
    plag: min(cal.getPlagHamincha(sunrise, sunset)),
    shkia: min(sunset),
    tzeit: min(cal.getTzaisGeonim7Point083Degrees()),
    chatzotL: chatzot + 720,
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
      startMin: days[b.erev].z.shkia - CANDLE_MIN,
      end: b.lastDate,
      endMin: exitDay.z.tzeit + EXIT_MIN,
      title,
      candle: days[b.erev].z.shkia - CANDLE_MIN,
      exit: exitDay.z.tzeit + EXIT_MIN,
    };
  });

mkdirSync(here, { recursive: true });
const out = { city: 'ירושלים', first: FIRST.toISODate(), demo: '2026-10-27', days, blocks: blockOut, events };
writeFileSync(join(here, 'data.json'), JSON.stringify(out));
const d = days['2026-10-27'];
const hm = (m) => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
console.log('days', Object.keys(days).length, 'blocks', blockOut.length, 'events', events.length, 'bytes', JSON.stringify(out).length);
console.log('27.10', d.weekday, d.hebDay, d.hebYear, d.hebNight, d.parasha, Object.entries(d.z).map(([k, v]) => k + '=' + hm(v)).join(' '), 'hil', d.hilulaToday, d.hilulaTonight);
console.log('blocks', blockOut.slice(0, 2).map((b) => b.erev + ' ' + hm(b.candle) + ' → ' + b.end + ' ' + hm(b.exit) + ' ' + b.title));
console.log('events', events.map((e) => e.d + ' ' + e.title).join(' | '));
