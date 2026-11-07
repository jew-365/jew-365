import { CITIES, cityOf, refreshSavedLocation } from '@/data/cities';
import { placeCaption, placeLocation, placeName, PLACE_RESULTS, searchPlaces } from '@/data/places';
import { placesIndex } from '@/testing/places';

const index = placesIndex();
const first = (query: string) => searchPlaces(index, query)[0];

describe('the places list', () => {
  it('holds every Israeli locality with a Hebrew name and the world’s cities', () => {
    const local = index.places.filter((place) => place.cc === 'IL');
    expect(local.length).toBeGreaterThan(1200);
    expect(local.every((place) => place.he && place.tz === 'Asia/Jerusalem')).toBe(true);
    expect(index.places.length).toBeGreaterThan(30000);
    expect(new Set(index.places.map((place) => place.id)).size).toBe(index.places.length);
    for (const place of index.places) {
      expect(Math.abs(place.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(place.lng)).toBeLessThanOrEqual(180);
      expect(place.tz).toMatch(/^[A-Za-z_]+\/[A-Za-z_\-/]+$|^UTC$/);
    }
  });

  it.each([
    ['ביתר עילית', 'Betar Illit', 31.694, 35.112],
    ['אלעד', "El'ad", 32.051, 34.956],
    ['כפר חב"ד', 'Kefar Habad', 31.99, 34.849],
    ['עמנואל', "Immanu'el", 32.162, 35.138],
    ['יצהר', 'Yizhar', 32.168, 35.237],
    ['מודיעין עילית', 'Modiin Ilit', 31.93, 35.04],
    ['קצרין', 'Qazrin', 32.992, 35.686],
  ])('finds %s by its Hebrew name, where it is', (he, en, lat, lng) => {
    const place = first(he);
    expect(place).toMatchObject({ he, en, cc: 'IL' });
    expect(place.lat).toBeCloseTo(lat, 1);
    expect(place.lng).toBeCloseTo(lng, 1);
  });

  it('finds a city abroad in Hebrew and in English, and names its region and country', () => {
    expect(first('ניו יורק')).toMatchObject({ en: 'New York City', cc: 'US', tz: 'America/New_York' });
    expect(first('antwerp')).toMatchObject({ he: 'אנטוורפן', cc: 'BE' });
    const lakewood = searchPlaces(index, 'Lakewood').find((place) => place.admin1 === 'NJ');
    expect(lakewood).toBeDefined();
    expect(placeCaption(index, lakewood!, 'en')).toBe('New Jersey, United States');
    expect(placeCaption(index, lakewood!, 'he')).toBe('New Jersey, ארה״ב');
    expect(placeCaption(index, first('ביתר עילית'), 'he')).toBe('');
  });

  it('orders a name that starts with the query before one that only holds it, the larger first', () => {
    const names = searchPlaces(index, 'ירושלים').map((place) => place.he);
    expect(names[0]).toBe('ירושלים');
    expect(
      searchPlaces(index, 'בני')
        .slice(0, 3)
        .map((place) => place.he),
    ).toContain('בני ברק');
    const tiers = searchPlaces(index, 'ברק').map((place) => (place.he.startsWith('ברק') ? 0 : 1));
    expect(tiers).toEqual([...tiers].sort());
  });

  it('ignores nikud, quotes, final letters and case, and lists nothing for an empty query', () => {
    expect(first('כפר חבד')?.he).toBe('כפר חב"ד');
    expect(first('בְּנֵי בְּרַק')?.he).toBe('בני ברק');
    expect(first('BNEI BRAK')?.he).toBe('בני ברק');
    expect(first('Bene Beraq')?.he).toBe('בני ברק');
    expect(first('Safed')?.he).toBe('צפת');
    expect(searchPlaces(index, '  ')).toEqual([]);
    expect(searchPlaces(index, 'a').length).toBe(PLACE_RESULTS);
  });

  it('names a place in the UI language, the other name when one is missing', () => {
    const place = first('ביתר עילית');
    expect(placeName(place, 'he')).toBe('ביתר עילית');
    expect(placeName(place, 'en')).toBe('Betar Illit');
    expect(placeName({ ...place, en: '' }, 'en')).toBe('ביתר עילית');
  });
});

describe('a picked place as the saved location', () => {
  it('keeps the place’s own name, zone, height and Israel flag', () => {
    expect(placeLocation(first('ביתר עילית'))).toEqual({
      placeId: 'c3780',
      name: 'ביתר עילית',
      nameEn: 'Betar Illit',
      lat: 31.6944,
      lng: 35.1118,
      tz: 'Asia/Jerusalem',
      inIsrael: true,
      elevation: 702,
    });
    expect(placeLocation(first('Bnei Brak'))).toMatchObject({ nameEn: 'Bnei Brak', name: 'בני ברק' });
    expect(placeLocation(first('Monsey'))).toMatchObject({ inIsrael: false, tz: 'America/New_York' });
    expect(placeLocation(searchPlaces(index, 'Nablus')[0])).toMatchObject({ inIsrael: true });
  });

  it('is the curated city where there is one, with its fitted height', () => {
    const jerusalem = CITIES.find((city) => city.cityId === 'jerusalem')!;
    expect(placeLocation(first('ירושלים'))).toBe(jerusalem);
  });

  it('is never swapped for a curated city of the same name on the next launch', () => {
    const london = searchPlaces(index, 'London').find((place) => place.cc === 'CA')!;
    const saved = placeLocation(london);
    expect(saved.placeId).toBe(london.id);
    expect(cityOf(saved)).toBeUndefined();
    expect(refreshSavedLocation(saved, 'manual')).toBe(saved);
  });
});
