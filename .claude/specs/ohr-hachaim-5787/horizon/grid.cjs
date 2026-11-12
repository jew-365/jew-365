// Grid search for the observer point whose terrain horizon reproduces the printed visible sunrise.
// Usage: node grid.cjs <city> <lat> <lng> <span deg> <step deg> [terrestrial k=0.13]; run fetch-dem.sh first.
// Prints the number of grid points with every printed day within one minute and the five best, each with its per-day error (model minus print, minutes).
const { elev, horizon } = require('./horizon.cjs');
const { sunPos, refr } = require('./sun.cjs');
const p = require('../printed.json');
const off = (d) => (d >= '2026-10-25' && d < '2027-03-26' ? 2 : 3);
const [city, lat0, lng0, span, step, k] = [process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5], +process.argv[6], +(process.argv[7] ?? 0.13)];
const ci = p.cityOrder.indexOf(city);
const days = Object.entries(p.daily).map(([day, rows]) => { const [h, m] = rows[ci].split(' ')[1].split(':').map(Number); return { day, printed: (h - off(day)) * 60 + m, base: Date.parse(`${day}T00:00:00Z`) }; });
const bands = [[58.0, 67.0], [99.0, 111.0]];
function profile(lat, lng, h0) {
  const pts = {};
  for (const [a, b] of bands) for (let az = a; az <= b + 1e-9; az += 0.1) pts[az.toFixed(1)] = horizon(lat, lng, h0, az, k);
  return (az) => { const lo = Math.floor(az * 10) / 10, f = (az - lo) * 10; const A = pts[lo.toFixed(1)], B = pts[(lo + 0.1).toFixed(1)]; return A === undefined || B === undefined ? NaN : A * (1 - f) + B * f; };
}
function rise(d, lat, lng, prof) {
  let lo = (d.printed - 20) * 60000 + d.base, hi = (d.printed + 20) * 60000 + d.base;
  const g = (t) => { const s = sunPos(new Date(t), lat, lng); return s.alt + s.sd + refr(s.alt + s.sd) - prof(s.az); };
  if (!(g(lo) < 0 && g(hi) > 0)) return 99;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; g(m) < 0 ? (lo = m) : (hi = m); }
  return (hi - d.base) / 60000;
}
const res = [];
for (let la = lat0 - span; la <= lat0 + span + 1e-9; la += step) for (let lo = lng0 - span; lo <= lng0 + span + 1e-9; lo += step) {
  const h0 = elev(la, lo) + 2, prof = profile(la, lo, h0);
  const errs = days.map((d) => rise(d, la, lo, prof) - d.printed);
  if (errs.some(Number.isNaN)) continue;
  res.push({ la, lo, h0, max: Math.max(...errs.map(Math.abs)), errs });
}
res.sort((a, b) => a.max - b.max);
const ok = res.filter((r) => r.max <= 1).length;
console.log(city, 'points', res.length, 'with every day within 1 min:', ok);
for (const r of res.slice(0, 5)) console.log(r.la.toFixed(4), r.lo.toFixed(4), r.h0.toFixed(0) + 'm', 'max', r.max.toFixed(2), r.errs.map((e) => e.toFixed(2)).join(' '));
