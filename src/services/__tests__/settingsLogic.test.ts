jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

import { zmanimFor } from '@/testing/zmanim';
import { ZmanimService } from '../ZmanimService';
import { CITIES } from '@/data/cities';
import { MITZVOT } from '@/data/mitzvot';

const dateAt = (iso: string) => new Date(iso);

describe('Settings logic — halachic opinions + israel/diaspora', () => {
  it('12.6 sofZmanShmaMA differs from sofZmanShmaGra', () => {
    const z = zmanimFor(dateAt('2026-04-23T10:00:00Z'), CITIES[0]);
    expect(z.sofZmanShmaMA.getTime()).not.toBe(z.sofZmanShmaGra.getTime());
    // Diff should be on the order of tens of minutes, not random.
    const diffMin = Math.abs(z.sofZmanShmaMA.getTime() - z.sofZmanShmaGra.getTime()) / 60_000;
    expect(diffMin).toBeGreaterThan(15);
    expect(diffMin).toBeLessThan(120);
  });

  it('12.6 mitzvot.sofZmanShma helper switches based on ksSofZman setting', () => {
    const shacharit = MITZVOT.find((m) => m.id === 'krias_shma_shacharit');
    expect(shacharit).toBeDefined();
    const z = zmanimFor(dateAt('2026-04-23T10:00:00Z'), CITIES[0]);
    const ctxMA = {
      date: dateAt('2026-04-23T10:00:00Z'),
      location: CITIES[0],
      settings: {
        nusach: 'ashkenaz' as const,
        halachicOpinions: { ksSofZman: 'MA' as const },
        language: 'he' as const,
        inIsrael: true,
      },
      zmanim: z,
    };
    const ctxGra = { ...ctxMA, settings: { ...ctxMA.settings, halachicOpinions: { ksSofZman: 'GRA' as const } } };
    const winMA = shacharit!.computeWindow(ctxMA);
    const winGra = shacharit!.computeWindow(ctxGra);
    expect(winMA?.end.getTime()).not.toBe(winGra?.end.getTime());
  });

  it('12.7 candle lighting in Israel defaults to 20min before sunset, as abroad (relative test)', () => {
    const fri = dateAt('2026-04-24T10:00:00Z');
    const israel = CITIES.find((c) => c.nameEn === 'Tel Aviv')!;
    const c20 = ZmanimService.getCandleLighting(fri, israel, { isFriday: true, isErevYomTov: false })!;
    const c0 = ZmanimService.getCandleLighting(fri, israel, { isFriday: true, isErevYomTov: false, minutesBefore: 0 })!;
    expect(c0.getTime() - c20.getTime()).toBe(20 * 60_000);
  });

  it('12.7 candle lighting outside Israel defaults to 20min before sunset', () => {
    const fri = dateAt('2026-04-24T10:00:00Z');
    const ny = CITIES.find((c) => c.name === 'ניו יורק')!;
    const c20 = ZmanimService.getCandleLighting(fri, ny, { isFriday: true, isErevYomTov: false })!;
    const c0 = ZmanimService.getCandleLighting(fri, ny, { isFriday: true, isErevYomTov: false, minutesBefore: 0 })!;
    expect(c0.getTime() - c20.getTime()).toBe(20 * 60_000);
  });

  it('12.7 candle lighting respects custom minutesBefore override', () => {
    const fri = dateAt('2026-04-24T10:00:00Z');
    const c40 = ZmanimService.getCandleLighting(fri, CITIES[0], {
      isFriday: true,
      isErevYomTov: false,
      minutesBefore: 40,
    })!;
    const c0 = ZmanimService.getCandleLighting(fri, CITIES[0], {
      isFriday: true,
      isErevYomTov: false,
      minutesBefore: 0,
    })!;
    expect(c0.getTime() - c40.getTime()).toBe(40 * 60_000);
  });
});
