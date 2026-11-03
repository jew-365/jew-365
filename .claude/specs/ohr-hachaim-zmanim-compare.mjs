// The app's zmanim against the Ohr HaChaim luach's definitions, without dependencies.
// Companion of ohr-hachaim-zmanim.md (section 4). Run: node .claude/specs/ohr-hachaim-zmanim-compare.mjs
//
// A NOAA solar calculator (the algorithm kosher-zmanim's NOAACalculator implements), within a minute of
// kosher-zmanim: Jerusalem 2026-01-16 shkia 16:59 (kosher-zmanim 16:58:39), 2026-01-17 tzeit 7.083°
// 17:31 (17:31:17), 2026-01-15 tzeit 17:30 (17:29:36), the values the repo's audit pinned.
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

function julianDay(y, m, d) {
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
}

function solar(jd) {
  const t = (jd - 2451545) / 36525;
  const L0 = (((280.46646 + t * (36000.76983 + t * 0.0003032)) % 360) + 360) % 360;
  const M = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const C =
    Math.sin(rad(M)) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(rad(2 * M)) * (0.019993 - 0.000101 * t) +
    Math.sin(rad(3 * M)) * 0.000289;
  const omega = 125.04 - 1934.136 * t;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(rad(omega));
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(rad(omega));
  const decl = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lambda))));
  const y = Math.tan(rad(eps / 2)) ** 2;
  const eqTime =
    4 *
    deg(
      y * Math.sin(2 * rad(L0)) -
        2 * e * Math.sin(rad(M)) +
        4 * e * y * Math.sin(rad(M)) * Math.cos(2 * rad(L0)) -
        0.5 * y * y * Math.sin(4 * rad(L0)) -
        1.25 * e * e * Math.sin(2 * rad(M)),
    );
  return { decl, eqTime };
}

// Minutes after UTC midnight at which the sun crosses `zenith` degrees, rising or setting; null when it never does.
function crossingUtc(y, m, d, lat, lng, zenith, rising) {
  const jd = julianDay(y, m, d);
  let minutes = 720 - 4 * lng;
  for (let i = 0; i < 3; i++) {
    const { decl, eqTime } = solar(jd + minutes / 1440);
    const cosH =
      (Math.cos(rad(zenith)) - Math.sin(rad(lat)) * Math.sin(rad(decl))) / (Math.cos(rad(lat)) * Math.cos(rad(decl)));
    if (cosH > 1 || cosH < -1) return null;
    const H = deg(Math.acos(cosH));
    minutes = 720 - 4 * (lng + (rising ? H : -H)) - eqTime;
  }
  return minutes;
}

const fmt = (min, off) => {
  if (min === null) return '  —  ';
  const total = Math.round(min + off * 60);
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const ZENITH = 90.8333; // the geometric horizon with refraction and the sun's radius
const elevationDip = (meters) => deg(Math.acos(6356.9 / (6356.9 + meters / 1000)));

// `app`: ZmanimService today (sea level, 16.1°, 11.5°, MGA 72 fixed, 6.5 h, 10.75 h, 7.083°, exit +10).
// `ohr`: the luach's definitions at the given elevation (section 3 of the spec), exit +30 in Israel.
export function zmanim(y, m, d, loc, offsetHours, { elevation = 0, inIsrael = true } = {}) {
  const at = (zenith, rising) => crossingUtc(y, m, d, loc.lat, loc.lng, zenith, rising);
  const z = ZENITH + elevationDip(elevation);
  const sunrise = at(z, true);
  const sunset = at(z, false);
  const seaRise = at(ZENITH, true);
  const seaSet = at(ZENITH, false);
  if ([sunrise, sunset, seaRise, seaSet].some((v) => v === null)) return null;
  const hour = (sunset - sunrise) / 12;
  const zm = (n) => (n * hour) / 60;
  const seaHour = (seaSet - seaRise) / 12;
  const app = {
    alot: at(90 + 16.1, true),
    misheyakir: at(90 + 11.5, true),
    netz: seaRise,
    shmaMga: seaRise - 72 + 3 * ((seaSet + 72 - (seaRise - 72)) / 12),
    shmaGra: seaRise + 3 * seaHour,
    tfilaGra: seaRise + 4 * seaHour,
    chatzot: seaRise + 6 * seaHour,
    minchaGedola: seaRise + 6.5 * seaHour,
    minchaKetana: seaRise + 9.5 * seaHour,
    plag: seaRise + 10.75 * seaHour,
    shkia: seaSet,
    tzeit: at(90 + 7.083, false),
  };
  app.exit = app.tzeit === null ? null : app.tzeit + 10;
  const tzeit = sunset + zm(13.5);
  const alot = sunrise - zm(72);
  const ohr = {
    alot,
    misheyakir: sunrise - zm(66),
    netz: sunrise,
    shmaMga: alot + 3 * ((sunset + zm(72) - alot) / 12),
    shmaGra: sunrise + 3 * hour,
    tfilaGra: sunrise + 4 * hour,
    chatzot: sunrise + 6 * hour,
    minchaGedola: sunrise + 6 * hour + Math.max(30, hour / 2),
    minchaKetana: sunrise + 9.5 * hour,
    plag: tzeit - 1.25 * hour,
    shkia: sunset,
    tzeit,
    exit: sunset + (inIsrael ? 30 : 40),
    rabbeinuTam: sunset + zm(72),
  };
  return { app, ohr, hour, fmt: (v) => fmt(v, offsetHours) };
}

const KEYS = [
  'alot',
  'misheyakir',
  'netz',
  'shmaMga',
  'shmaGra',
  'tfilaGra',
  'chatzot',
  'minchaGedola',
  'minchaKetana',
  'plag',
  'shkia',
  'tzeit',
  'exit',
];

function table(title, r) {
  console.log(`\n${title}  (sha'a zmanit ${r.hour.toFixed(1)} min)`);
  console.log('zman           app      luach   delta(min)');
  for (const k of KEYS) {
    const a = r.app[k];
    const o = r.ohr[k];
    const delta = a === null || o === null ? '  ?' : String(Math.round(o - a)).padStart(4);
    console.log(`${k.padEnd(13)} ${r.fmt(a)}   ${r.fmt(o)}   ${delta}`);
  }
  console.log(`rabbeinuTam        —     ${r.fmt(r.ohr.rabbeinuTam)}`);
}

const JERUSALEM = { lat: 31.7683, lng: 35.2137 };
const TEL_AVIV = { lat: 32.0853, lng: 34.7818 };

// Israel: UTC+2, UTC+3 under DST (2026: 2026-03-27 to 2026-10-25; 2027: 2027-03-26 to 2027-10-31).
for (const [iso, off] of [
  ['2026-11-02', 2],
  ['2026-12-21', 2],
  ['2027-03-21', 2],
  ['2027-06-21', 3],
]) {
  const [y, m, d] = iso.split('-').map(Number);
  for (const elevation of [0, 754]) table(`Jerusalem ${iso}, elevation ${elevation} m`, zmanim(y, m, d, JERUSALEM, off, { elevation }));
}

// The luach's printed Tel Aviv Shabbat of 2026-10-02/03 (quoted by Zayit PR #554): candles 18:05,
// Shabbat ends 18:55, Rabbeinu Tam 19:36.
const fri = zmanim(2026, 10, 2, TEL_AVIV, 3, { elevation: 5 });
const sat = zmanim(2026, 10, 3, TEL_AVIV, 3, { elevation: 5 });
console.log(`\nTel Aviv Fri 2026-10-02: shkia ${fri.fmt(fri.ohr.shkia)}, candles (−20) ${fri.fmt(fri.ohr.shkia - 20)} | luach 18:05`);
console.log(
  `Tel Aviv Sat 2026-10-03: shkia ${sat.fmt(sat.ohr.shkia)}, exit (+30) ${sat.fmt(sat.ohr.exit)} | luach 18:55; ` +
    `R"T (72 zmaniyot) ${sat.fmt(sat.ohr.rabbeinuTam)} | luach 19:36; the app's exit today (7.083° + 10) ${sat.fmt(sat.app.exit)}`,
);

// The values the repo pinned with kosher-zmanim, as a check of this calculator.
const c1 = zmanim(2026, 1, 16, JERUSALEM, 2);
const c2 = zmanim(2026, 1, 17, JERUSALEM, 2);
const c3 = zmanim(2026, 1, 15, JERUSALEM, 2);
console.log(
  `\ncheck: 2026-01-16 shkia ${c1.fmt(c1.app.shkia)} (kosher-zmanim 16:58:39); 2026-01-17 tzeit ${c2.fmt(c2.app.tzeit)} (17:31:17); ` +
    `2026-01-15 tzeit ${c3.fmt(c3.app.tzeit)} (17:29:36)`,
);
