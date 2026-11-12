// Jerusalem's printed day times against the luach's formulas with one height for the sunrise and another for the
// sunset (its introduction: the sunset from the highest place in the city). Usage: node evening.cjs [lat lng].
// Prints the best (sunrise height, sunset height) pairs over every printed Jerusalem value of the two 5787 pages and
// the 5781 page (ONLY5787=1: the 5787 pages alone), each rounded as the app rounds it, minus the print, in minutes.
const path = require('path');
const { createRequire } = require('module');
const req = createRequire(path.resolve(__dirname, '../../../package.json'));
const { ComplexZmanimCalendar, GeoLocation } = req('kosher-zmanim');
const { DateTime } = req('luxon');
const p = require('./printed.json');
const lat = +(process.argv[2] ?? 31.7683), lng = +(process.argv[3] ?? 35.2137), tz = 'Asia/Jerusalem';
const m = (t) => { const [h, mm] = t.split(':').map(Number); return h * 60 + mm; };
const obs = []; // [day, key, printed minutes]
for (const [d, rows] of Object.entries(p.daily)) rows[0].split(' ').forEach((t, i) => i !== 1 && obs.push([d, p.dailyKeys[i], m(t)]));
for (const [d, w] of Object.entries(p.weekly)) w.values[0].forEach((pair, i) => pair.split(' ').forEach((t, j) => obs.push([j ? w.last : d, p.weeklyKeys[i], m(t)])));
for (const [d, v] of Object.entries(p.candles)) obs.push([d, 'candles', m(v[0])]);
for (const [d, v] of Object.entries(p.exit)) obs.push([d, 'exit', m(v[0])]);
// The 5781 page (src/services/__tests__/ZmanimService.ohrHachaim.test.ts), Jerusalem column.
const D20 = { '2020-09-27': ['05:12', '18:34', '18:48', '08:51', '09:27', '10:28'], '2020-09-28': ['05:13', '18:32', '18:47', '08:51', '09:27', '10:28'], '2020-09-29': ['05:14', '18:31', '18:46', '08:51', '09:27', '10:28'], '2020-09-30': ['05:15', '18:30', '18:44', '08:51', '09:28', '10:28'], '2020-10-01': ['05:15', '18:28', '18:43', '08:52', '09:28', '10:28'], '2020-10-02': ['05:16', '18:27', '18:42', '08:52', '09:28', '10:28'], '2020-10-03': ['05:17', '18:26', '18:40', '08:52', '09:28', '10:28'] };
const K20 = ['alotHaShachar', 'shkia', 'tzeitHakochavim', 'sofZmanShmaMA', 'sofZmanShmaGra', 'sofZmanTfilaGra'];
if (!process.env.ONLY5787) for (const [d, v] of Object.entries(D20)) v.forEach((t, i) => obs.push([d, K20[i], m(t)]));
if (!process.env.ONLY5787) [['misheyakir', '05:19', '05:24'], ['chatzot', '12:30', '12:28'], ['minchaGedola', '13:01', '12:59'], ['minchaKetana', '16:03', '15:57'], ['plagHaMincha', '17:32', '17:26']].forEach(([k, a, b]) => obs.push(['2020-09-27', k, m(a)], ['2020-10-03', k, m(b)]));
if (!process.env.ONLY5787) obs.push(['2020-09-27', 'candles', m('18:14')], ['2020-10-02', 'candles', m('18:07')], ['2020-09-28', 'exit', m('19:03')], ['2020-10-03', 'exit', m('18:57')]);

const days = [...new Set(obs.map((o) => o[0]))];
const local = (date, d) => { const x = DateTime.fromJSDate(date).setZone(tz); return x.hour * 60 + x.minute + x.second / 60 + x.millisecond / 60000; };
const sun = {}; // per day: sunrise and sunset at each height, transit
const [H0, H1, HS] = (process.env.HEIGHTS ?? "0,1500,25").split(",").map(Number);
const H = []; for (let h = H0; h <= H1; h += HS) H.push(h);
for (const d of days) {
  const at = (h) => { const c = new ComplexZmanimCalendar(new GeoLocation('j', lat, lng, h, tz)); c.setDate(DateTime.fromISO(`${d}T12:00`, { zone: tz })); return c; };
  sun[d] = { rise: H.map((h) => local(at(h).getSunrise().toJSDate())), set: H.map((h) => local(at(h).getSunset().toJSDate())), transit: local(at(0).getSunTransit().toJSDate()) };
}
function model(d, key, ri, si) {
  const r = sun[d].rise[ri], s = sun[d].set[si], z = (s - r) / 720, hr = 60 * z, alot = r - 72 * z, tzeit = s + 13.5 * z;
  return { alotHaShachar: alot, misheyakir: r - 66 * z, sofZmanShmaMA: alot + 3 * (s + 72 * z - alot) / 12, sofZmanShmaGra: r + 3 * hr, sofZmanTfilaGra: r + 4 * hr, chatzot: sun[d].transit, minchaGedola: sun[d].transit + Math.max(30, 30 * z), minchaKetana: r + 9.5 * hr, plagHaMincha: tzeit - 1.25 * hr, shkia: s, tzeitHakochavim: tzeit, candles: s - 20, exit: s + 30 }[key];
}
const res = [];
// The app's rounding (ZmanimService): a start later, an end earlier, chatzot to the nearest; candles from the rounded shkia.
const LATER = new Set(['misheyakir', 'minchaGedola', 'minchaKetana', 'plagHaMincha', 'tzeitHakochavim', 'exit']);
const app = (d, k, ri, si) => k === 'candles' ? Math.floor(model(d, 'shkia', ri, si)) - 20 : k === 'chatzot' ? Math.round(model(d, k, ri, si)) : LATER.has(k) ? Math.ceil(model(d, k, ri, si) - 1e-9) : Math.floor(model(d, k, ri, si) + 1e-9);
H.forEach((hr, ri) => H.forEach((hs, si) => { const e = obs.map(([d, k, t]) => app(d, k, ri, si) - t); const a = e.map(Math.abs); res.push({ hr, hs, out: a.filter((x) => x > 1).length, max: Math.max(...a), sum: a.reduce((x, y) => x + y, 0), e }); }));
res.sort((a, b) => a.out - b.out || a.max - b.max || a.sum - b.sum);
const zero = res.filter((r) => r.out === 0);
if (zero.length) console.log(`${zero.length} pairs keep all within a minute: sunrise ${Math.min(...zero.map((r) => r.hr))}-${Math.max(...zero.map((r) => r.hr))} m, sunset ${Math.min(...zero.map((r) => r.hs))}-${Math.max(...zero.map((r) => r.hs))} m`);
console.log(`${obs.length} printed Jerusalem values at ${lat}, ${lng}`);
res.slice(0, 6).forEach((r) => console.log(`sunrise ${r.hr} m, sunset ${r.hs} m: ${r.out} outside a minute, max ${r.max.toFixed(2)}, mean ${(r.sum / obs.length).toFixed(2)}`));
const [CR, CS] = (process.env.PAIR ?? "1150,1150").split(",").map(Number);
const cur = res.find((r) => r.hr === CR && r.hs === CS); if (cur) console.log(`pair ${CR}/${CS}: ${cur.out} outside a minute, max ${cur.max.toFixed(2)}`);
const b = res[0];
console.log('worst of the best:', obs.map((o, i) => [o[0], o[1], b.e[i]]).sort((x, y) => Math.abs(y[2]) - Math.abs(x[2])).slice(0, 8).map((x) => `${x[0]} ${x[1]} ${x[2].toFixed(2)}`).join('; '));
