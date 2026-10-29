export type GeoPoint = { lat: number; lng: number };

export const KOTEL: GeoPoint = { lat: 31.7767, lng: 35.2345 };

export const FACING_TOLERANCE_DEG = 5;

export const FACING_REARM_DEG = 10;

const EARTH_RADIUS_KM = 6371;

const toRad = (degrees: number) => (degrees * Math.PI) / 180;
const toDeg = (radians: number) => (radians * 180) / Math.PI;

export function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

export function bearingTo(from: GeoPoint, to: GeoPoint = KOTEL): number {
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return normalizeDegrees(toDeg(Math.atan2(y, x)));
}

export function distanceKm(from: GeoPoint, to: GeoPoint = KOTEL): number {
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function arrowAngle(bearing: number, heading: number): number {
  return normalizeDegrees(bearing - heading);
}

export function angularOffset(angle: number): number {
  const off = normalizeDegrees(angle);
  return Math.min(off, 360 - off);
}

export function isFacing(angle: number): boolean {
  return angularOffset(angle) <= FACING_TOLERANCE_DEG;
}

export function nextFacing(wasFacing: boolean, angle: number): boolean {
  return angularOffset(angle) <= (wasFacing ? FACING_REARM_DEG : FACING_TOLERANCE_DEG);
}

export const COMPASS_PRAYERS = ['shacharit', 'mincha', 'maariv'] as const;

export type CompassPrayer = (typeof COMPASS_PRAYERS)[number];

export function compassPrayerOf(id: string | undefined): CompassPrayer | null {
  return COMPASS_PRAYERS.find((prayer) => prayer === id) ?? null;
}
