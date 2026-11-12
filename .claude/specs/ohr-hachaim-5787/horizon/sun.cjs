// NOAA solar position (Meeus-based), accurate to ~0.01 deg for modern dates.
const rad = Math.PI / 180, deg = 180 / Math.PI;
function sunPos(date, lat, lng) {
  const jd = date.getTime() / 86400000 + 2440587.5, T = (jd - 2451545) / 36525;
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C = Math.sin(M * rad) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M * rad) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * rad) * 0.000289;
  const trueLong = L0 + C, omega = 125.04 - 1934.136 * T;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * rad);
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * rad);
  const dec = Math.asin(Math.sin(eps * rad) * Math.sin(lambda * rad)) * deg;
  const y = Math.tan(eps * rad / 2) ** 2;
  const eqt = 4 * deg * (y * Math.sin(2 * L0 * rad) - 2 * e * Math.sin(M * rad) + 4 * e * y * Math.sin(M * rad) * Math.cos(2 * L0 * rad) - 0.5 * y * y * Math.sin(4 * L0 * rad) - 1.25 * e * e * Math.sin(2 * M * rad));
  const utcMin = (date.getTime() / 60000) % 1440;
  const tst = ((utcMin + eqt + 4 * lng) % 1440 + 1440) % 1440;
  const ha = tst / 4 - 180;
  const cz = Math.sin(lat * rad) * Math.sin(dec * rad) + Math.cos(lat * rad) * Math.cos(dec * rad) * Math.cos(ha * rad);
  const alt = 90 - Math.acos(Math.max(-1, Math.min(1, cz))) * deg;
  const az = (Math.atan2(Math.sin(ha * rad), Math.cos(ha * rad) * Math.sin(lat * rad) - Math.tan(dec * rad) * Math.cos(lat * rad)) * deg + 180) % 360;
  const R = 0.9999 * (1.000001018 * (1 - e * e)) / (1 + e * Math.cos((M + C) * rad)); // AU approx
  return { alt, az, sd: 0.2666 / R };
}
// Bennett refraction (deg) for apparent altitude ha (deg)
const refr = (h) => 1 / Math.tan((h + 7.31 / (h + 4.4)) * rad) / 60;
module.exports = { sunPos, refr, rad, deg };
