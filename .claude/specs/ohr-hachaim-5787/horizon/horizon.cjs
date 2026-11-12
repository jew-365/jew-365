// Visible sunrise from the SRTM terrain: the apparent horizon angle per azimuth (terrestrial refraction k on an effective Earth radius) and the first instant the sun's upper limb, with Bennett refraction, clears it.
const fs = require('fs');
const path = require('path');
const { sunPos, refr, rad, deg } = require('./sun.cjs');
const tiles = {};
function tile(la, lo) {
  const k = `N${la}E0${lo}`;
  if (!(k in tiles)) {
    const file = path.join(__dirname, 'dem', `${k}.hgt`);
    // Only the open sea west of 34E has no tile; anything else missing would silently flatten a horizon.
    if (!fs.existsSync(file) && lo >= 34) throw new Error(`missing DEM tile ${k}: run fetch-dem.sh`);
    tiles[k] = fs.existsSync(file) ? fs.readFileSync(file) : null;
  }
  return tiles[k];
}
function raw(b, r, c) { const v = b.readInt16BE((r * 3601 + c) * 2); return v === -32768 ? 0 : v; }
function elev(lat, lng) {
  const la = Math.floor(lat), lo = Math.floor(lng), b = tile(la, lo);
  if (!b) return 0;
  const y = (la + 1 - lat) * 3600, x = (lng - lo) * 3600, r = Math.min(3599, Math.floor(y)), c = Math.min(3599, Math.floor(x)), fy = y - r, fx = x - c;
  return raw(b, r, c) * (1 - fx) * (1 - fy) + raw(b, r, c + 1) * fx * (1 - fy) + raw(b, r + 1, c) * (1 - fx) * fy + raw(b, r + 1, c + 1) * fx * fy;
}
const R = 6371000;
// apparent elevation angle (deg) of the terrain horizon at azimuth az, terrestrial refraction k
function horizon(lat, lng, hObs, az, k = 0.13, maxKm = 160) {
  const Re = R / (1 - k); let best = -90;
  for (let d = 200; d <= maxKm * 1000; d += d < 5000 ? 30 : 60) {
    const dlat = (d * Math.cos(az * rad)) / 111320, dlng = (d * Math.sin(az * rad)) / (111320 * Math.cos(lat * rad));
    const h = elev(lat + dlat, lng + dlng);
    const a = Math.atan((h - hObs - (d * d) / (2 * Re)) / d) * deg;
    if (a > best) best = a;
  }
  return best;
}
// predicted visible sunrise (ms) near a guess
function visibleSunrise(day, offH, lat, lng, hObs, k) {
  let t = Date.parse(`${day}T00:00:00Z`) + (5.5 - offH) * 3600000 - 3 * 3600000; // scan from ~02:30 local
  for (let i = 0; i < 6 * 3600; i += 5) {
    const s = sunPos(new Date(t + i * 1000), lat, lng);
    if (s.alt < -3) continue;
    const app = s.alt + s.sd + refr(s.alt + s.sd);
    if (app >= horizon(lat, lng, hObs, s.az, k)) return t + i * 1000;
  }
  return NaN;
}
module.exports = { elev, horizon, visibleSunrise };
