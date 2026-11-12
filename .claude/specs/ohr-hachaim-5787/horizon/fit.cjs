// Fits the observer point on the 5787 pages (../printed.json) and scores every fitting point on held-out printed sunrises.
// Usage: node fit.cjs <city> <lat> <lng> <span deg> <step deg> [k=0.13] [--all]; run fetch-dem.sh first.
// --all fits on every printed day (both sets) and prints, for the points that keep all of them within a minute,
// how far they still disagree on the winter solstice, the season no page covers yet.
// Training: the 14 days of ../printed.json. Holdout: holdout-5781.json (2020, another sun azimuth), never used to choose a point.
const { elev, profile, riseNear } = require('./horizon.cjs');
const train = require('../printed.json'), hold = require('./holdout-5781.json');
const args = process.argv.slice(2).filter((a) => a !== '--all'), all = process.argv.includes('--all');
const [city, lat0, lng0, span, step, k] = [args[0], +args[1], +args[2], +args[3], +args[4], +(args[5] ?? 0.13)];
const minutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const day = (d, t, off) => ({ base: Date.parse(`${d}T00:00:00Z`), printed: minutes(t) - off * 60 });
const offOf = (d) => (d >= '2026-10-25' && d < '2027-03-26' ? 2 : 3);
const ci = train.cityOrder.indexOf(city), hi = hold.cityOrder.indexOf(city);
const T = Object.entries(train.daily).map(([d, rows]) => day(d, rows[ci].split(' ')[1], offOf(d)));
const H = Object.entries(hold.netz).map(([d, row]) => day(d, row[hi], hold.utcOffsetHours));
const bands = all ? [[58, 67], [84, 128]] : [[58, 67], [84, 111]];
const W = [day('2026-12-21', '06:40', 2)]; // a probe, not a print: the guess only centres the search
const errs = (days, la, lo, prof) => days.map((d) => riseNear(d.base, d.printed, la, lo, prof) - d.printed);
const maxAbs = (e) => (e.some(Number.isNaN) ? Infinity : Math.max(...e.map(Math.abs)));
const fits = [];
let n = 0;
for (let la = lat0 - span; la <= lat0 + span + 1e-9; la += step)
  for (let lo = lng0 - span; lo <= lng0 + span + 1e-9; lo += step) {
    n++;
    const h0 = elev(la, lo) + 2, prof = profile(la, lo, h0, bands, k), et = errs(all ? T.concat(H) : T, la, lo, prof);
    if (maxAbs(et) <= +(process.env.CUT ?? 1)) fits.push({ la, lo, h0, train: maxAbs(et), et, eh: all ? [] : errs(H, la, lo, prof), winter: all ? riseNear(W[0].base, W[0].printed, la, lo, prof) + 120 : NaN });
  }
for (const f of fits) f.hold = all ? 0 : maxAbs(f.eh);
if (all) {
  fits.sort((a, b) => a.train - b.train);
  const w = fits.map((f) => f.winter).filter(Number.isFinite), fmt = (m) => `${Math.floor(m / 60)}:${(m % 60).toFixed(2).padStart(5, '0')}`;
  console.log(`${city}: ${n} points, ${fits.length} keep all ${T.length + H.length} printed days within 1 min; their 2026-12-21 sunrise spans ${w.length ? fmt(Math.min(...w)) + ' to ' + fmt(Math.max(...w)) : 'n/a'}`);
  fits.slice(0, 8).forEach((f) => console.log(`  ${f.la.toFixed(4)},${f.lo.toFixed(4)} ${f.h0.toFixed(0)}m max ${f.train.toFixed(2)} winter ${fmt(f.winter)}`));
  process.exit(0);
}
const passHold = fits.filter((f) => f.hold <= 1).length;
console.log(`${city}: ${n} points, ${fits.length} fit the 5787 pages within 1 min, of which ${passHold} also keep the 5781 holdout within 1 min`);
const show = (f) => `${f.la.toFixed(4)},${f.lo.toFixed(4)} ${f.h0.toFixed(0)}m train ${f.train.toFixed(2)} holdout ${f.hold.toFixed(2)} [${f.eh.map((e) => e.toFixed(2)).join(' ')}]`;
console.log(' best on training:'); fits.sort((a, b) => a.train - b.train).slice(0, 5).forEach((f) => console.log('  ' + show(f)));
console.log(' holdout of all fitting points: min', Math.min(...fits.map((f) => f.hold)).toFixed(2), 'median', fits.map((f) => f.hold).sort((a, b) => a - b)[Math.floor(fits.length / 2)]?.toFixed(2), 'max', Math.max(...fits.map((f) => f.hold)).toFixed(2));
