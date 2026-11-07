import { CITIES, City, CITY_HEIGHT_KM } from '@/data/cities';
import { Location } from '@/types/zmanim';
import { distanceKm } from '@/utils/compass';
import { normalizeSearchText } from '@/utils/searchText';

// The places the location picker searches, from assets/places/world.places (scripts/places/build.js):
// every locality of Israel and of Judea and Samaria (Central Bureau of Statistics) and every other city of
// 15,000 people or more (GeoNames), largest first.
export type Place = {
  id: string;
  he: string;
  en: string;
  cc: string;
  admin1: string;
  lat: number;
  lng: number;
  tz: string;
  elevation: number;
  population: number;
  // Another English spelling people search by (the CBS one of an Israeli city), or ''.
  aka: string;
};

type RawPlace = [string, string, string, string, string, number, number, number, number, number, string];

type PlacesFile = {
  zones: string[];
  countries: Record<string, [string, string]>;
  admins: Record<string, string>;
  places: RawPlace[];
};

export type PlaceIndex = {
  places: Place[];
  // Each place's names, normalized, each led by a space so a word start is ` word`.
  keys: string[][];
  countries: Record<string, [string, string]>;
  admins: Record<string, string>;
};

// In Israel for the second day of Yom Tov: every CBS locality (IL, Judea and Samaria included) and every
// GeoNames place of the West Bank (PS).
const ERETZ_YISRAEL = new Set(['IL', 'PS']);
export const PLACE_RESULTS = 30;

export function parsePlaces(text: string): PlaceIndex {
  const file = JSON.parse(text) as PlacesFile;
  const places = file.places.map(([id, he, en, cc, admin1, lat, lng, zone, elevation, population, aka]): Place => ({
    id,
    he,
    en,
    cc,
    admin1,
    lat,
    lng,
    tz: file.zones[zone],
    elevation,
    population,
    aka,
  }));
  return {
    places,
    keys: places.map((place) =>
      [place.he, place.en, place.aka].filter(Boolean).map((name) => ` ${normalizeSearchText(name)}`),
    ),
    countries: file.countries,
    admins: file.admins,
  };
}

// The places whose Hebrew or English name holds the query: a name that is the query first, then one that
// starts with it, then one with a word that starts with it, then any other; the larger place first within
// each. An empty query lists none.
export function searchPlaces(index: PlaceIndex, query: string, limit = PLACE_RESULTS): Place[] {
  const needle = normalizeSearchText(query);
  if (!needle) return [];
  const tiers: Place[][] = [[], [], [], []];
  const word = ` ${needle}`;
  index.keys.forEach((names, at) => {
    const tier = names.includes(word)
      ? 0
      : names.some((name) => name.startsWith(word))
        ? 1
        : names.some((name) => name.includes(word))
          ? 2
          : names.some((name) => name.includes(needle))
            ? 3
            : -1;
    if (tier >= 0 && tiers[tier].length < limit) tiers[tier].push(index.places[at]);
  });
  return tiers.flat().slice(0, limit);
}

export function placeName(place: Place, language: 'he' | 'en'): string {
  return language === 'en' ? place.en || place.he : place.he || place.en;
}

// Where a place is, under its name: its region and country abroad, nothing in Israel and in Judea and
// Samaria.
export function placeCaption(index: PlaceIndex, place: Place, language: 'he' | 'en'): string {
  if (ERETZ_YISRAEL.has(place.cc)) return '';
  const [countryHe, countryEn] = index.countries[place.cc] ?? ['', place.cc];
  const country = language === 'en' ? countryEn : countryHe || countryEn;
  const region = place.admin1 ? index.admins[`${place.cc}.${place.admin1}`] : undefined;
  return [region, country].filter(Boolean).join(', ');
}

// The curated city that stands for a place: the same name within the city's radius. It carries the
// heights fitted to the printed luach and the city's own candle lighting, so it wins.
function curatedCity(place: Place): City | undefined {
  return CITIES.find(
    (city) => (city.name === place.he || city.nameEn === place.en) && distanceKm(city, place) <= CITY_HEIGHT_KM,
  );
}

export function placeLocation(place: Place): Location {
  const city = curatedCity(place);
  if (city) return city;
  return {
    placeId: place.id,
    name: place.he || place.en,
    nameEn: place.en || place.he,
    lat: place.lat,
    lng: place.lng,
    tz: place.tz,
    inIsrael: ERETZ_YISRAEL.has(place.cc),
    elevation: place.elevation,
  };
}
