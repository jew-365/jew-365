#!/usr/bin/env node
// Independent printed evidence; this intentionally reports discrepancies instead of blessing HEAD.
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const crypto = require('crypto');
const { createRequire } = require('module');
const root = path.resolve(__dirname, '../../..');
const req = createRequire(path.join(root, 'package.json'));
const ts = req('typescript');
const { DateTime } = req('luxon');
const { ComplexZmanimCalendar, GeoLocation } = req('kosher-zmanim');
const fixture = require('./printed.json');
const modules = new Map();
function load(relative) {
  if (modules.has(relative)) return modules.get(relative);
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(
    (name) =>
      name.startsWith('@/')
        ? load(`src/${name.slice(2)}.ts`)
        : name.startsWith('.')
          ? load(`${path.posix.join(path.posix.dirname(relative), name)}.ts`)
          : req(name),
    module,
    module.exports,
  );
  modules.set(relative, module.exports);
  return module.exports;
}
const { ZmanimService: service } = load('src/services/ZmanimService.ts');
const { findCityById, refreshSavedLocation, heightAt } = load('src/data/cities.ts');
const baselineCities = fixture.cityOrder.map(findCityById);
const candidateHeights = process.argv
  .find((arg) => arg.startsWith('--candidate-heights='))
  ?.split('=')[1]
  .split(',')
  .map(Number);
if (candidateHeights)
  assert(candidateHeights.length === 4 && candidateHeights.every((n) => Number.isFinite(n) && n >= 0));
const cities = baselineCities.map((city, i) => (candidateHeights ? { ...city, elevation: candidateHeights[i] } : city));
const noon = (day, city) => DateTime.fromISO(`${day}T12:00`, { zone: city.tz }).toJSDate();
const minutes = (text) => {
  assert.match(text, /^\d\d:\d\d(?:\.(?:25|5|75))?$/);
  const [h, m] = text.split(':').map(Number);
  assert(h >= 0 && h < 24 && m >= 0 && m < 60);
  return h * 60 + m;
};
const format = (date, city) => DateTime.fromJSDate(date).setZone(city.tz).toFormat('HH:mm');
const rows = [];
function record(day, index, key, printed, actual, kind = 'app') {
  const current = format(actual, cities[index]);
  rows.push({
    day,
    city: fixture.cityOrder[index],
    key,
    kind,
    printed,
    current,
    deltaMinutes: minutes(current) - minutes(printed),
  });
}
for (const [day, values] of Object.entries(fixture.daily)) {
  assert.equal(values.length, 4);
  values.forEach((line, i) => {
    const printed = line.split(' ');
    assert.equal(printed.length, fixture.dailyKeys.length);
    const z = service.getZmanim(noon(day, cities[i]), cities[i]);
    fixture.dailyKeys.forEach((key, k) => record(day, i, key, printed[k], z[key]));
  });
}
for (const [first, { last, values }] of Object.entries(fixture.weekly)) {
  assert.equal(values.length, 4);
  values.forEach((cityValues, i) => {
    assert.equal(cityValues.length, fixture.weeklyKeys.length);
    cityValues.forEach((pair, k) => {
      const printed = pair.split(' ');
      assert.equal(printed.length, 2);
      [first, last].forEach((day, end) =>
        record(
          day,
          i,
          fixture.weeklyKeys[k],
          printed[end],
          service.getZmanim(noon(day, cities[i]), cities[i])[fixture.weeklyKeys[k]],
        ),
      );
    });
  });
}
for (const [day, values] of Object.entries(fixture.candles))
  values.forEach((printed, i) =>
    record(
      day,
      i,
      'candleLighting',
      printed,
      service.getCandleLighting(noon(day, cities[i]), cities[i], {
        isFriday: DateTime.fromISO(day).weekday === 5,
        isErevYomTov: day === '2027-06-10',
      }),
    ),
  );
for (const [day, values] of Object.entries(fixture.exit))
  values.forEach((printed, i) =>
    record(day, i, 'tzeitShabbat', printed, service.getHavdalah(noon(day, cities[i]), cities[i])),
  );
// Rabbeinu Tam is not currently exposed by the app; evaluate the documented formula separately.
for (const [day, values] of Object.entries(fixture.rabbeinuTam))
  values.forEach((printed, i) => {
    const c = cities[i],
      cal = new ComplexZmanimCalendar(new GeoLocation(c.name, c.lat, c.lng, c.elevation, c.tz));
    cal.setDate(DateTime.fromISO(`${day}T12:00`, { zone: c.tz }));
    const rise = cal.getSunrise().toMillis(),
      set = cal.getSunset().toMillis();
    record(
      day,
      i,
      'rabbeinuTam',
      printed,
      new Date(Math.ceil((set + (set - rise) / 10) / 60000) * 60000),
      'formula-only',
    );
  });
assert.equal(rows.length, 500);
// Cover the whole year, not only the supplied dates: ordering, cache copies and location offset.
let invariantDays = 0;
for (let day = DateTime.fromISO('2026-09-01'); day < DateTime.fromISO('2027-09-01'); day = day.plus({ days: 1 })) {
  for (const city of cities) {
    const instant = noon(day.toISODate(), city),
      z = service.getZmanim(instant, city);
    for (const [a, b] of [
      ['alotHaShachar', 'misheyakir'],
      ['misheyakir', 'netzHaChama'],
      ['netzHaChama', 'sofZmanShmaMA'],
      ['sofZmanShmaMA', 'sofZmanShmaGra'],
      ['sofZmanShmaGra', 'sofZmanTfilaGra'],
      ['sofZmanTfilaGra', 'chatzot'],
      ['chatzot', 'minchaGedola'],
      ['minchaGedola', 'minchaKetana'],
      ['minchaKetana', 'plagHaMincha'],
      ['plagHaMincha', 'shkia'],
      ['shkia', 'tzeitHakochavim'],
      ['tzeitHakochavim', 'tzeitShabbat'],
    ])
      assert(z[a] < z[b], `${day} ${city.cityId}: ${a} >= ${b}`);
    const again = service.getZmanim(instant, city);
    assert.notEqual(again.shkia, z.shkia);
    assert.equal(again.shkia.getTime(), z.shkia.getTime());
    z.shkia.setTime(0);
    assert.equal(service.getZmanim(instant, city).shkia.getTime(), again.shkia.getTime());
    invariantDays++;
  }
}
for (const [day, expected] of [
  ['2026-10-24', 180],
  ['2026-10-25', 120],
  ['2027-03-25', 120],
  ['2027-03-26', 180],
  ['2027-06-06', 180],
])
  assert.equal(DateTime.fromJSDate(noon(day, cities[0])).setZone(cities[0].tz).offset, expected);
for (const city of baselineCities) {
  const stale = { ...city, elevation: 0, candleLightingMinutes: 40 };
  assert.equal(refreshSavedLocation(stale, 'manual'), city);
  const gps = refreshSavedLocation(stale, 'gps');
  assert.equal(gps.elevation, city.elevation);
  assert.equal(gps.candleLightingMinutes, city.candleLightingMinutes);
  assert.equal(heightAt(city, { ...city, lat: city.lat + 0.1 }), undefined);
}
const summary = Object.fromEntries(
  [...new Set(rows.map((r) => r.key))].map((key) => {
    const deltas = rows.filter((r) => r.key === key).map((r) => r.deltaMinutes);
    return [
      key,
      {
        count: deltas.length,
        exact: deltas.filter((d) => d === 0).length,
        withinOneMinute: deltas.filter((d) => Math.abs(d) <= 1).length,
        min: Math.min(...deltas),
        max: Math.max(...deltas),
      },
    ];
  }),
);
const result = {
  candidateHeights: candidateHeights ?? null,
  deviceZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  comparisons: rows.length,
  appComparisons: rows.filter((r) => r.kind === 'app').length,
  invariantCityDays: invariantDays,
  digest: crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
  summary,
  rows,
};
const output = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6);
if (output) {
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(result, null, 2) + '\n');
  fs.writeFileSync(
    path.join(output, 'comparison.csv'),
    ['day,city,key,kind,printed,current,deltaMinutes', ...rows.map((r) => Object.values(r).join(','))].join('\n') +
      '\n',
  );
}
console.log(JSON.stringify({ ...result, rows: undefined }, null, 2));
if (process.argv.includes('--strict') && rows.some((r) => Math.abs(r.deltaMinutes) > 1)) process.exitCode = 1;
