import { KOTEL, arrowAngle, bearingTo, distanceKm, isFacing, nextFacing, normalizeDegrees } from '../compass';

const TEL_AVIV = { lat: 32.0853, lng: 34.7818 };
const NEW_YORK = { lat: 40.7128, lng: -74.006 };
const JERUSALEM_CENTRE = { lat: 31.7833, lng: 35.2167 };

describe('bearingTo the Kotel', () => {
  it.each([
    ['Tel Aviv', TEL_AVIV, 128.7],
    ['New York', NEW_YORK, 54.1],
    ['the centre of Jerusalem', JERUSALEM_CENTRE, 113.6],
  ])('from %s', (_name, point, expected) => {
    expect(Math.abs(bearingTo(point) - expected)).toBeLessThan(0.5);
  });

  it('points due north from a point south of the Kotel on its meridian', () => {
    expect(bearingTo({ lat: 30, lng: KOTEL.lng })).toBeCloseTo(0, 5);
  });

  it('points due south from a point north of it, and stays within 0 to 360', () => {
    expect(bearingTo({ lat: 33, lng: KOTEL.lng })).toBeCloseTo(180, 5);
    for (const lng of [-170, -90, 0, 20, 80, 170]) {
      const bearing = bearingTo({ lat: 10, lng });
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    }
  });

  it('reads west of the Kotel as a bearing near east and east of it as one near west', () => {
    const west = bearingTo({ lat: 31.7767, lng: 30 });
    const east = bearingTo({ lat: 31.7767, lng: 40 });
    expect(west).toBeGreaterThan(80);
    expect(west).toBeLessThan(90);
    expect(east).toBeGreaterThan(270);
    expect(east).toBeLessThan(280);
  });
});

describe('distanceKm to the Kotel', () => {
  it.each([
    ['Tel Aviv', TEL_AVIV, 54.8],
    ['New York', NEW_YORK, 9169.6],
    ['the centre of Jerusalem', JERUSALEM_CENTRE, 1.84],
  ])('from %s', (_name, point, expected) => {
    expect(Math.abs(distanceKm(point) - expected) / expected).toBeLessThan(0.01);
  });

  it('is 0 at the Kotel', () => {
    expect(distanceKm(KOTEL)).toBe(0);
  });
});

describe('arrowAngle', () => {
  it('is the bearing less the heading', () => {
    expect(arrowAngle(120, 30)).toBe(90);
  });

  it('wraps through 0 and 360', () => {
    expect(arrowAngle(10, 350)).toBe(20);
    expect(arrowAngle(350, 10)).toBe(340);
    expect(arrowAngle(0, 0)).toBe(0);
    expect(arrowAngle(0, 360)).toBe(0);
  });
});

describe('normalizeDegrees', () => {
  it('maps any angle into 0 to 360', () => {
    expect(normalizeDegrees(-90)).toBe(270);
    expect(normalizeDegrees(360)).toBe(0);
    expect(normalizeDegrees(725)).toBe(5);
  });
});

describe('isFacing', () => {
  it('holds within 5 degrees either side of the Kotel, across the wrap', () => {
    expect(isFacing(0)).toBe(true);
    expect(isFacing(5)).toBe(true);
    expect(isFacing(355)).toBe(true);
    expect(isFacing(5.1)).toBe(false);
    expect(isFacing(354.9)).toBe(false);
    expect(isFacing(180)).toBe(false);
  });
});

describe('nextFacing', () => {
  it('enters within 5 degrees and holds until the angle passes 10', () => {
    expect(nextFacing(false, 6)).toBe(false);
    expect(nextFacing(false, 5)).toBe(true);
    expect(nextFacing(true, 9)).toBe(true);
    expect(nextFacing(true, 351)).toBe(true);
    expect(nextFacing(true, 10.1)).toBe(false);
    expect(nextFacing(false, 9)).toBe(false);
  });
});
