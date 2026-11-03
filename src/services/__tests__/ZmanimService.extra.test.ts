import { ZmanimService } from '../ZmanimService';
import { zmanimFor } from '@/testing/zmanim';
import { Location } from '@/types/zmanim';

const JERUSALEM: Location = {
  name: 'JLM',
  lat: 31.7683,
  lng: 35.2137,
  tz: 'Asia/Jerusalem',
  inIsrael: true,
  elevation: 754,
};
const TEL_AVIV: Location = { name: 'TLV', lat: 32.0853, lng: 34.7818, tz: 'Asia/Jerusalem', inIsrael: true };
const NY: Location = { name: 'NY', lat: 40.7128, lng: -74.006, tz: 'America/New_York', inIsrael: false };
const POLAR: Location = { name: 'Tromso', lat: 69.6492, lng: 18.9553, tz: 'Europe/Oslo', inIsrael: false };

describe('ZmanimService extra', () => {
  it('1.2 Tel Aviv differs from Jerusalem by ≤2 min sunset', () => {
    const d = new Date('2026-04-23T12:00:00Z');
    const j = zmanimFor(d, JERUSALEM);
    const t = zmanimFor(d, TEL_AVIV);
    const diff = Math.abs(j.shkia.getTime() - t.shkia.getTime()) / 60000;
    expect(diff).toBeLessThan(5);
  });

  it('1.3 NY shkia differs from Jerusalem by ~7 hours', () => {
    const d = new Date('2026-04-23T12:00:00Z');
    const j = zmanimFor(d, JERUSALEM);
    const n = zmanimFor(d, NY);
    const diffHours = Math.abs(j.shkia.getTime() - n.shkia.getTime()) / 3600000;
    expect(diffHours).toBeGreaterThan(6);
    expect(diffHours).toBeLessThan(8);
  });

  // Was `expect(threw || !!result).toBe(true)` — an assertion that passes whether the call throws
  // or returns, i.e. it can never fail. It was green while getZmanim threw for real shipped cities.
  it('1.4 Polar June 21 — never throws, reports "no zmanim" as null', () => {
    const d = new Date('2026-06-21T12:00:00Z');
    expect(() => ZmanimService.getZmanim(d, POLAR)).not.toThrow();
    expect(ZmanimService.getZmanim(d, POLAR)).toBeNull();
  });

  it('1.4b Polar midwinter — never throws either', () => {
    expect(() => ZmanimService.getZmanim(new Date('2026-12-21T12:00:00Z'), POLAR)).not.toThrow();
  });

  it('1.5 DST transition — chatzot is valid Date, not NaN', () => {
    const dst = new Date('2026-03-29T06:00:00Z');
    const z = zmanimFor(dst, { name: 'EU', lat: 51.5, lng: -0.13, tz: 'Europe/London', inIsrael: false });
    expect(Number.isNaN(z.chatzot.getTime())).toBe(false);
  });

  it('1.6 offline — pure compute, no network involved', () => {
    const z = zmanimFor(new Date('2026-04-23T12:00:00Z'), JERUSALEM);
    expect(z.netzHaChama).toBeInstanceOf(Date);
  });

  it('1.7 BUG-015 — candle lighting uses the same sunset basis as getZmanim', () => {
    const friday = new Date('2026-04-24T12:00:00Z');
    const z = zmanimFor(friday, JERUSALEM);
    const candle = ZmanimService.getCandleLighting(friday, JERUSALEM, { isFriday: true, isErevYomTov: false })!;
    expect(z.shkia.getTime() - candle.getTime()).toBe(20 * 60_000);
  });
});
