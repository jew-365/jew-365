// How far apart the given observer points predict visible sunrise on dates the printed pages do not cover.
// Usage: node spread.cjs <lat,lng> <lat,lng> ...
const { elev, visibleSunrise } = require('./horizon.cjs');
const pts = process.argv.slice(2).map((s) => s.split(',').map(Number));
const dates = [['2026-12-21', 2], ['2027-02-01', 2], ['2027-03-20', 2], ['2027-04-20', 3], ['2027-08-15', 3], ['2027-09-20', 3]];
for (const [d, off] of dates) {
  const ts = pts.map(([la, lo]) => (visibleSunrise(d, off, la, lo, elev(la, lo) + 2, 0.13) - Date.parse(`${d}T00:00:00Z`)) / 60000 + off * 60);
  const f = (m) => `${Math.floor(m / 60)}:${String((m % 60).toFixed(1)).padStart(4, '0')}`;
  console.log(d, ts.map(f).join('  '), ' spread', (Math.max(...ts) - Math.min(...ts)).toFixed(1), 'min');
}
