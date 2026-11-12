import { ComplexZmanimCalendar, GeoLocation } from 'kosher-zmanim';
import { DateTime } from 'luxon';
import { findCityById } from '@/data/cities';
import { Location } from '@/types/zmanim';
import { solarPosition } from '@/utils/solarPosition';
import { horizonProfileFor, visibleSunrise } from '@/utils/visibleSunrise';

const jerusalem = findCityById('jerusalem') as Location;

// kosher-zmanim's sea-level sunrise: the centre 0.833° below a flat horizon (refraction 34′, semidiameter 16′).
const seaLevelSunrise = (loc: Location, day: string) => {
  const cal = new ComplexZmanimCalendar(new GeoLocation(loc.name, loc.lat, loc.lng, 0, loc.tz));
  cal.setDate(DateTime.fromISO(`${day}T12:00`, { zone: loc.tz }));
  return cal.getSeaLevelSunrise()!.toJSDate();
};

describe('solarPosition', () => {
  it.each(['2026-12-21', '2027-03-20', '2027-06-21', '2027-09-23'])(
    'puts the sun 0.833° below the horizon at the sea-level sunrise of %s, east of north',
    (day) => {
      const sun = solarPosition(seaLevelSunrise(jerusalem, day), jerusalem.lat, jerusalem.lng);
      expect(Math.abs(sun.altitude + 0.833)).toBeLessThan(0.02);
      expect(sun.azimuth).toBeGreaterThan(55);
      expect(sun.azimuth).toBeLessThan(125);
      expect(sun.semidiameter).toBeGreaterThan(0.26);
      expect(sun.semidiameter).toBeLessThan(0.275);
    },
  );
});

describe('visibleSunrise', () => {
  const flat = { lat: jerusalem.lat, lng: jerusalem.lng, angleAt: () => 0 };

  it.each(['2026-12-21', '2027-06-21'])('over a flat horizon on %s is the sea-level sunrise', (day) => {
    const sea = seaLevelSunrise(jerusalem, day);
    expect(Math.abs(visibleSunrise(sea, flat)!.getTime() - sea.getTime())).toBeLessThan(30_000);
  });

  it('comes later behind a higher horizon and is null when the sun never clears it', () => {
    const sea = seaLevelSunrise(jerusalem, '2026-12-21');
    const ridge = { ...flat, angleAt: () => 1 };
    expect(visibleSunrise(sea, ridge)!.getTime()).toBeGreaterThan(sea.getTime() + 4 * 60_000);
    expect(visibleSunrise(sea, { ...flat, angleAt: () => 20 })).toBeNull();
  });
});

describe('horizonProfileFor', () => {
  it.each(['jerusalem', 'tel-aviv', 'haifa', 'beer-sheva'])('gives %s, the printed city, its horizon', (id) => {
    const profile = horizonProfileFor(findCityById(id) as Location)!;
    expect(Number.isFinite(profile.angleAt(62))).toBe(true);
    expect(Number.isFinite(profile.angleAt(118))).toBe(true);
    expect(profile.angleAt(140)).toBeNaN();
  });

  it('gives none past 10 km from the city, to a city the luach does not print, or with no city', () => {
    expect(horizonProfileFor({ ...jerusalem, lat: jerusalem.lat + 0.1 })).toBeNull();
    expect(horizonProfileFor(findCityById('new-york') as Location)).toBeNull();
    expect(horizonProfileFor({ ...jerusalem, cityId: undefined })).toBeNull();
  });
});
