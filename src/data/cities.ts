import type { LocationSource } from '@/services/LocationService';
import { Location } from '@/types/zmanim';
import { distanceKm } from '@/utils/compass';

// `sunsetElevation`: a luach city whose printed sunset comes from another height than its sunrise (Jerusalem, the
// luach's "highest place in the city"), fitted on every printed value; absent, the sunset takes `elevation`.
export type City = Location & { cityId: string; sunsetElevation?: number };

// Heights for the zmanim: Jerusalem, Tel Aviv, Haifa and Be'er Sheva carry the effective height that
// matches the printed Ohr HaChaim luach (Tishrei 5781, ZmanimService.ohrHachaim.test.ts); the rest are
// SRTM 30 m at the listed point, Safed's kept.
export const CITIES: City[] = [
  {
    cityId: 'jerusalem',
    name: 'ירושלים',
    nameEn: 'Jerusalem',
    lat: 31.7683,
    lng: 35.2137,
    tz: 'Asia/Jerusalem',
    inIsrael: true,
    elevation: 1150,
    sunsetElevation: 745,
  },
  {
    cityId: 'tel-aviv',
    name: 'תל אביב',
    nameEn: 'Tel Aviv',
    lat: 32.0853,
    lng: 34.7818,
    tz: 'Asia/Jerusalem',
    inIsrael: true,
    elevation: 75,
  },
  {
    cityId: 'haifa',
    name: 'חיפה',
    nameEn: 'Haifa',
    lat: 32.794,
    lng: 34.9896,
    tz: 'Asia/Jerusalem',
    inIsrael: true,
    elevation: 390,
  },
  {
    cityId: 'beer-sheva',
    name: 'באר שבע',
    nameEn: "Be'er Sheva",
    lat: 31.2518,
    lng: 34.7913,
    tz: 'Asia/Jerusalem',
    inIsrael: true,
    elevation: 300,
  },
  {
    cityId: 'netanya',
    name: 'נתניה',
    nameEn: 'Netanya',
    lat: 32.3215,
    lng: 34.8532,
    tz: 'Asia/Jerusalem',
    inIsrael: true,
    elevation: 31,
  },
  {
    cityId: 'ashdod',
    name: 'אשדוד',
    nameEn: 'Ashdod',
    lat: 31.8014,
    lng: 34.6435,
    tz: 'Asia/Jerusalem',
    inIsrael: true,
    elevation: 38,
  },
  {
    cityId: 'petah-tikva',
    name: 'פתח תקווה',
    nameEn: 'Petah Tikva',
    lat: 32.0878,
    lng: 34.8878,
    tz: 'Asia/Jerusalem',
    inIsrael: true,
    elevation: 53,
  },
  {
    cityId: 'bnei-brak',
    name: 'בני ברק',
    nameEn: 'Bnei Brak',
    lat: 32.0807,
    lng: 34.8338,
    tz: 'Asia/Jerusalem',
    inIsrael: true,
    elevation: 50,
  },
  {
    cityId: 'safed',
    name: 'צפת',
    nameEn: 'Safed',
    lat: 32.9646,
    lng: 35.496,
    tz: 'Asia/Jerusalem',
    inIsrael: true,
    elevation: 900,
  },
  {
    cityId: 'eilat',
    name: 'אילת',
    nameEn: 'Eilat',
    lat: 29.5581,
    lng: 34.9482,
    tz: 'Asia/Jerusalem',
    inIsrael: true,
    elevation: 62,
  },
  {
    cityId: 'new-york',
    name: 'ניו יורק',
    nameEn: 'New York',
    lat: 40.7128,
    lng: -74.006,
    tz: 'America/New_York',
    inIsrael: false,
    elevation: 25,
  },
  {
    cityId: 'lakewood',
    name: 'לייקווד',
    nameEn: 'Lakewood',
    lat: 40.0979,
    lng: -74.2176,
    tz: 'America/New_York',
    inIsrael: false,
    elevation: 24,
  },
  {
    cityId: 'los-angeles',
    name: "לוס אנג'לס",
    nameEn: 'Los Angeles',
    lat: 34.0522,
    lng: -118.2437,
    tz: 'America/Los_Angeles',
    inIsrael: false,
    elevation: 91,
  },
  {
    cityId: 'miami',
    name: 'מיאמי',
    nameEn: 'Miami',
    lat: 25.7617,
    lng: -80.1918,
    tz: 'America/New_York',
    inIsrael: false,
    elevation: 45,
  },
  {
    cityId: 'london',
    name: 'לונדון',
    nameEn: 'London',
    lat: 51.5074,
    lng: -0.1278,
    tz: 'Europe/London',
    inIsrael: false,
    elevation: 15,
  },
  {
    cityId: 'paris',
    name: 'פריז',
    nameEn: 'Paris',
    lat: 48.8566,
    lng: 2.3522,
    tz: 'Europe/Paris',
    inIsrael: false,
    elevation: 46,
  },
  {
    cityId: 'antwerp',
    name: 'אנטוורפן',
    nameEn: 'Antwerp',
    lat: 51.2194,
    lng: 4.4025,
    tz: 'Europe/Brussels',
    inIsrael: false,
    elevation: 12,
  },
  {
    cityId: 'melbourne',
    name: 'מלבורן',
    nameEn: 'Melbourne',
    lat: -37.8136,
    lng: 144.9631,
    tz: 'Australia/Melbourne',
    inIsrael: false,
    elevation: 28,
  },
  {
    cityId: 'toronto',
    name: 'טורונטו',
    nameEn: 'Toronto',
    lat: 43.6532,
    lng: -79.3832,
    tz: 'America/Toronto',
    inIsrael: false,
    elevation: 101,
  },
  {
    cityId: 'moscow',
    name: 'מוסקבה',
    nameEn: 'Moscow',
    lat: 55.7558,
    lng: 37.6176,
    tz: 'Europe/Moscow',
    inIsrael: false,
    elevation: 152,
  },
];

export function findCityByName(name: string): City | undefined {
  return CITIES.find((c) => c.name === name || c.nameEn === name);
}

export function findCityById(cityId: string): City | undefined {
  return CITIES.find((c) => c.cityId === cityId);
}

export function cityOf(location: Location): City | undefined {
  if (location.cityId) return findCityById(location.cityId);
  // A place picked from the places list is its own: London, Ontario never turns into London.
  if (location.placeId) return undefined;
  return (
    CITIES.find((c) => c.name === location.name) ??
    CITIES.find((c) => location.nameEn !== undefined && c.nameEn === location.nameEn)
  );
}

// A fix takes a city's height only inside the city: the luach cities' heights are fitted, not
// measured, and a town 20 km away can sit hundreds of metres higher or lower.
export const CITY_HEIGHT_KM = 10;

export function heightAt(city: City, point: { lat: number; lng: number }): number | undefined {
  return distanceKm(point, city) <= CITY_HEIGHT_KM ? city.elevation : undefined;
}

/** The luach city a location lies inside (its `cityId`, within `CITY_HEIGHT_KM` of its point), whose fitted values it takes. */
export function cityInside(location: Location): City | undefined {
  const city = location.cityId ? findCityById(location.cityId) : undefined;
  return city && distanceKm(location, city) <= CITY_HEIGHT_KM ? city : undefined;
}

export function refreshSavedLocation(saved: Location, source: LocationSource): Location {
  const city = cityOf(saved);
  if (!city) return saved;
  return source === 'manual' ? city : { ...city, lat: saved.lat, lng: saved.lng, elevation: heightAt(city, saved) };
}

export function getLocationName(location: Location, language: 'he' | 'en'): string {
  return language === 'en' ? (location.nameEn ?? location.name) : location.name;
}
