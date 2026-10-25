jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

import { CITIES } from '../cities';
import { findMitzvah } from '../mitzvot';
import {
  MITZVAH_STANDALONE_TEXT,
  hasSiddurText,
  mitzvahTextEvening,
  mitzvahTextId,
  siddurPlace,
  standaloneTextId,
} from '../siddur';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { installSelichotFixture } from '@/testing/selichot';
import type { Mitzvah, Nusach } from '@/types/mitzvah';

const NUSCHAOT: Nusach[] = ['ashkenaz', 'sefard', 'edot_hamizrach', 'chabad'];
const ISRAEL = siddurPlace(CITIES[0], true);

const linked = (id: string): Mitzvah => ({ ...findMitzvah('maariv')!, id });

describe('MITZVAH_STANDALONE_TEXT', () => {
  it('links the five mitzvot that read an existing standalone text', () => {
    expect(MITZVAH_STANDALONE_TEXT).toEqual({
      krias_shma_al_hamita: 'kriat_shema_al_hamita',
      kiddush_levana: 'kiddush_levana',
      selichot: 'selichot',
      chanukah_candles: 'chanukah_candles',
      ushpizin: 'ushpizin',
    });
  });

  it.each(Object.entries(MITZVAH_STANDALONE_TEXT))('%s has no text of its own and reads %s', (mitzvahId, textId) => {
    expect(mitzvahTextId(mitzvahId)).toBeNull();
    expect(standaloneTextId(textId!)).toBe(textId);
  });
});

describe('mitzvahTextEvening', () => {
  it('is true for a night mitzvah with a text of its own and for every linked mitzvah, false otherwise', () => {
    expect(['maariv', 'shacharit', 'krias_shma_al_hamita', 'selichot', 'custom_1_a'].map(mitzvahTextEvening)).toEqual([
      true,
      false,
      true,
      true,
      false,
    ]);
  });
});

describe('hasSiddurText for a mitzvah linked to a standalone text', () => {
  it.each(NUSCHAOT)('offers the bedtime Shema every night in %s', (nusach) => {
    expect(hasSiddurText(linked('krias_shma_al_hamita'), nusach, new Date(2026, 9, 28), ISRAEL)).toBe(true);
  });

  it('offers the Chanukah candles only on a day whose night falls on Chanukah', () => {
    const candles = linked('chanukah_candles');
    expect(hasSiddurText(candles, 'ashkenaz', new Date(2026, 11, 4), ISRAEL)).toBe(true);
    expect(hasSiddurText(candles, 'ashkenaz', new Date(2026, 11, 7), ISRAEL)).toBe(true);
    expect(hasSiddurText(candles, 'ashkenaz', new Date(2026, 11, 3), ISRAEL)).toBe(false);
    expect(hasSiddurText(candles, 'ashkenaz', new Date(2026, 9, 28), ISRAEL)).toBe(false);
  });

  it("offers Kiddush Levana on the nights of its nusach's period", () => {
    const levana = linked('kiddush_levana');
    expect(hasSiddurText(levana, 'ashkenaz', new Date(2026, 9, 20), ISRAEL)).toBe(true);
    expect(hasSiddurText(levana, 'ashkenaz', new Date(2026, 9, 12), ISRAEL)).toBe(false);
    expect(hasSiddurText(levana, 'sefard', new Date(2026, 9, 14), ISRAEL)).toBe(false);
    expect(hasSiddurText(levana, 'sefard', new Date(2026, 9, 18), ISRAEL)).toBe(true);
  });

  it('offers Selichot on the night that opens a selichot day, by nusach, never into Shabbat', () => {
    installSelichotFixture();
    const selichot = linked('selichot');
    expect(hasSiddurText(selichot, 'ashkenaz', new Date(2026, 8, 5), ISRAEL)).toBe(true);
    expect(hasSiddurText(selichot, 'ashkenaz', new Date(2026, 8, 4), ISRAEL)).toBe(false);
    expect(hasSiddurText(selichot, 'edot_hamizrach', new Date(2026, 7, 15), ISRAEL)).toBe(true);
    expect(hasSiddurText(selichot, 'ashkenaz', new Date(2026, 7, 15), ISRAEL)).toBe(false);
    useSelichotStore.getState().reset();
  });
});
