import { HDate, HebrewCalendar } from '@hebcal/core';
import { CITIES } from '@/data/cities';
import { ZmanimService } from '@/services/ZmanimService';
import { Place } from '@/types/siddur';
import { dayFeatures } from '../siddur';

const JERUSALEM = CITIES[0];
const NEW_YORK = CITIES.find((city) => city.cityId === 'new-york') ?? CITIES.find((city) => !city.inIsrael)!;

const jerusalem: Place = { inIsrael: true, jerusalem: true, location: JERUSALEM };
const newYork: Place = { inIsrael: false, jerusalem: false, location: NEW_YORK };
const day = new HDate(15, 7, 5787);

describe('dayFeatures cache', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the cached features for the same day and place without calling hebcal or zmanim again', () => {
    const first = dayFeatures(day, jerusalem);
    const hallel = jest.spyOn(HebrewCalendar, 'hallel');
    const zmanim = jest.spyOn(ZmanimService, 'getZmanim');
    const again = dayFeatures(new HDate(day.abs()), { ...jerusalem, location: { ...JERUSALEM } });
    expect(again).toBe(first);
    expect(hallel).not.toHaveBeenCalled();
    expect(zmanim).not.toHaveBeenCalled();
  });

  it('keys on the place', () => {
    const inIsrael = dayFeatures(day, jerusalem);
    const abroad = dayFeatures(day, newYork);
    expect(abroad).not.toBe(inIsrael);
    expect(inIsrael.flags.has('inIsrael')).toBe(true);
    expect(abroad.flags.has('inIsrael')).toBe(false);
    expect(dayFeatures(day, { inIsrael: true, jerusalem: false, location: JERUSALEM })).not.toBe(inIsrael);
    expect(dayFeatures(day, { inIsrael: true, jerusalem: true })).not.toBe(inIsrael);
  });

  it('keys on the Hebrew day', () => {
    expect(dayFeatures(day.next(), jerusalem)).not.toBe(dayFeatures(day, jerusalem));
  });

  it('stays bounded and still answers after thousands of days', () => {
    for (let offset = 0; offset < 1000; offset++) dayFeatures(day.add(offset), jerusalem);
    const hallel = jest.spyOn(HebrewCalendar, 'hallel');
    const again = dayFeatures(day, jerusalem);
    expect(hallel).toHaveBeenCalledTimes(1);
    expect(again.flags.has('sukkotNight')).toBe(true);
  });
});
