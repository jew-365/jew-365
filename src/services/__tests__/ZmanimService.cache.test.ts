import { ComplexZmanimCalendar } from 'kosher-zmanim';
import { ZmanimService } from '../ZmanimService';
import { Location } from '@/types/zmanim';

const JERUSALEM: Location = {
  name: 'Jerusalem',
  lat: 31.7683,
  lng: 35.2137,
  tz: 'Asia/Jerusalem',
  inIsrael: true,
};

const LOS_ANGELES: Location = {
  name: 'Los Angeles',
  lat: 34.0522,
  lng: -118.2437,
  tz: 'America/Los_Angeles',
  inIsrael: false,
};

const noonUtc = (offsetDays: number) => new Date(Date.UTC(2031, 0, 1 + offsetDays, 12));

describe('ZmanimService cache', () => {
  let builds: jest.SpyInstance;

  beforeEach(() => {
    builds = jest.spyOn(ComplexZmanimCalendar.prototype, 'getSeaLevelSunrise');
  });

  afterEach(() => {
    builds.mockRestore();
  });

  it('keeps the entry read last through 399 newer ones and drops it once 400 newer ones are read', () => {
    const first = noonUtc(0);
    ZmanimService.getZmanim(first, JERUSALEM);
    for (let day = 1; day < 400; day++) ZmanimService.getZmanim(noonUtc(day), JERUSALEM);
    ZmanimService.getZmanim(first, JERUSALEM);
    for (let day = 400; day < 799; day++) ZmanimService.getZmanim(noonUtc(day), JERUSALEM);
    builds.mockClear();
    ZmanimService.getZmanim(first, JERUSALEM);
    expect(builds).not.toHaveBeenCalled();
    for (let day = 2000; day < 2400; day++) ZmanimService.getZmanim(noonUtc(day), JERUSALEM);
    builds.mockClear();
    ZmanimService.getZmanim(first, JERUSALEM);
    expect(builds).toHaveBeenCalled();
  });

  it('serves a repeat read of more than 90 dates from the cache', () => {
    const days = Array.from({ length: 120 }, (_, day) => noonUtc(900 + day));
    for (const day of days) ZmanimService.getZmanim(day, JERUSALEM);
    builds.mockClear();
    for (const day of days) ZmanimService.getZmanim(day, JERUSALEM);
    expect(builds).not.toHaveBeenCalled();
  });

  it('keys on the location’s civil day, not the device’s, across the zone boundary', () => {
    const lateEveningJerusalem = new Date('2031-06-10T21:30:00Z');
    const nextMorningJerusalem = new Date('2031-06-10T21:00:00Z');
    const a = ZmanimService.getZmanim(lateEveningJerusalem, JERUSALEM);
    const b = ZmanimService.getZmanim(nextMorningJerusalem, JERUSALEM);
    const sameInstantLosAngeles = ZmanimService.getZmanim(lateEveningJerusalem, LOS_ANGELES);
    expect(a?.shkia.getTime()).toBe(b?.shkia.getTime());
    expect(sameInstantLosAngeles?.shkia.getTime()).not.toBe(a?.shkia.getTime());
    const justBeforeMidnight = ZmanimService.getZmanim(new Date('2031-06-10T20:59:00Z'), JERUSALEM);
    expect(justBeforeMidnight?.shkia.getTime()).not.toBe(a?.shkia.getTime());
  });

  it('hands out a copy, so changing a read never changes the cache', () => {
    const date = noonUtc(1000);
    const first = ZmanimService.getZmanim(date, JERUSALEM);
    const original = first!.shkia.getTime();
    first!.shkia.setTime(0);
    expect(ZmanimService.getZmanim(date, JERUSALEM)?.shkia.getTime()).toBe(original);
  });
});
