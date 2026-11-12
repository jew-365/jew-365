import { cityInside } from '@/data/cities';
import { HORIZON_FROM_AZ, HORIZON_PROFILES, HORIZON_STEP_DEG } from '@/data/horizonProfiles';
import { Location } from '@/types/zmanim';
import { refraction, solarPosition } from '@/utils/solarPosition';

// The visible sunrise the Ohr HaChaim luach prints for its four cities (Bikurei Yosef's): the instant the sun's
// upper limb clears the terrain horizon of the city's observer point (the owner's bar of 2026-11-12: within a
// minute of the print; the fit is .claude/specs/ohr-hachaim-5787/README.md, Horizon reconstruction).
export type HorizonProfile = { lat: number; lng: number; angleAt: (azimuth: number) => number };

const SEARCH_MS = 30 * 60_000;
const parsed = new Map<string, HorizonProfile>();

function profileOf(cityId: string): HorizonProfile | null {
  const raw = HORIZON_PROFILES[cityId];
  if (!raw) return null;
  let profile = parsed.get(cityId);
  if (!profile) {
    const angles = raw.angles.split(',').map((a) => Number(a) / 1000);
    const angleAt = (azimuth: number) => {
      const x = (azimuth - HORIZON_FROM_AZ) / HORIZON_STEP_DEG;
      const i = Math.floor(x);
      return i < 0 || i + 1 >= angles.length ? NaN : angles[i] + (angles[i + 1] - angles[i]) * (x - i);
    };
    profile = { lat: raw.lat, lng: raw.lng, angleAt };
    parsed.set(cityId, profile);
  }
  return profile;
}

/** The horizon of a printed city, for a location inside it (the radius its fitted height reaches), else null. */
export function horizonProfileFor(location: Location): HorizonProfile | null {
  const city = cityInside(location);
  return city ? profileOf(city.cityId) : null;
}

/** The instant the upper limb clears the profile's horizon, searched 30 minutes either side of `estimate`. */
export function visibleSunrise(estimate: Date, profile: HorizonProfile): Date | null {
  const clearance = (ms: number) => {
    const sun = solarPosition(new Date(ms), profile.lat, profile.lng);
    const limb = sun.altitude + sun.semidiameter;
    return limb + refraction(limb) - profile.angleAt(sun.azimuth);
  };
  let lo = estimate.getTime() - SEARCH_MS;
  let hi = estimate.getTime() + SEARCH_MS;
  if (!(clearance(lo) < 0 && clearance(hi) > 0)) return null;
  while (hi - lo > 1000) {
    const mid = (lo + hi) / 2;
    if (clearance(mid) < 0) lo = mid;
    else hi = mid;
  }
  return new Date(hi);
}
