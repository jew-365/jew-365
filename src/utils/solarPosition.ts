// The sun's place in the sky by the NOAA / Meeus formulas (about 0.01° for this century): enough to
// find the instant the upper limb clears a terrain horizon, which no zmanim library exposes.
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export type SolarPosition = {
  /** Geometric altitude of the sun's centre, degrees, no refraction. */
  altitude: number;
  /** Azimuth from true north through east, degrees in [0, 360). */
  azimuth: number;
  /** Apparent semidiameter, degrees. */
  semidiameter: number;
};

export function solarPosition(instant: Date, lat: number, lng: number): SolarPosition {
  const T = (instant.getTime() / 86_400_000 + 2_440_587.5 - 2_451_545) / 36_525;
  const L0 = (280.46646 + T * (36_000.76983 + T * 0.0003032)) % 360;
  const M = 357.52911 + T * (35_999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C =
    Math.sin(M * RAD) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * M * RAD) * (0.019993 - 0.000101 * T) +
    Math.sin(3 * M * RAD) * 0.000289;
  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * RAD);
  const dec = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD)) * DEG;
  const y = Math.tan((eps * RAD) / 2) ** 2;
  const equationOfTime =
    4 *
    DEG *
    (y * Math.sin(2 * L0 * RAD) -
      2 * e * Math.sin(M * RAD) +
      4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD) -
      0.5 * y * y * Math.sin(4 * L0 * RAD) -
      1.25 * e * e * Math.sin(2 * M * RAD));
  const utcMinutes = (instant.getTime() / 60_000) % 1440;
  const hourAngle = ((((utcMinutes + equationOfTime + 4 * lng) % 1440) + 1440) % 1440) / 4 - 180;
  const cosZenith =
    Math.sin(lat * RAD) * Math.sin(dec * RAD) + Math.cos(lat * RAD) * Math.cos(dec * RAD) * Math.cos(hourAngle * RAD);
  const altitude = 90 - Math.acos(Math.max(-1, Math.min(1, cosZenith))) * DEG;
  const azimuth =
    (Math.atan2(
      Math.sin(hourAngle * RAD),
      Math.cos(hourAngle * RAD) * Math.sin(lat * RAD) - Math.tan(dec * RAD) * Math.cos(lat * RAD),
    ) *
      DEG +
      180) %
    360;
  const distanceAu = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos((M + C) * RAD));
  return { altitude, azimuth, semidiameter: 0.2666 / distanceAu };
}

/** Saemundsson's atmospheric refraction, degrees, for a true (geometric) altitude in degrees. */
export function refraction(trueAltitude: number): number {
  return 1.02 / Math.tan((trueAltitude + 10.3 / (trueAltitude + 5.11)) * RAD) / 60;
}
