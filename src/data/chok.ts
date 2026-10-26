import { parshiot } from '@hebcal/core';
import { useChokStore } from '@/stores/useChokStore';

export const CHOK_TEXT_ID = 'chok_leyisrael';

export const CHOK_PARASHIYOT: readonly string[] = [...parshiot, 'Vezot Haberakhah'];

export const CHOK_BOOKS: readonly {
  key: 'bereshit' | 'shemot' | 'vayikra' | 'bamidbar' | 'devarim';
  parashiyot: readonly string[];
}[] = [
  { key: 'bereshit', parashiyot: CHOK_PARASHIYOT.slice(0, 12) },
  { key: 'shemot', parashiyot: CHOK_PARASHIYOT.slice(12, 23) },
  { key: 'vayikra', parashiyot: CHOK_PARASHIYOT.slice(23, 33) },
  { key: 'bamidbar', parashiyot: CHOK_PARASHIYOT.slice(33, 43) },
  { key: 'devarim', parashiyot: CHOK_PARASHIYOT.slice(43, 54) },
];

export function chokAsset(parasha: string): string | undefined {
  return useChokStore.getState().installed?.files[parasha];
}

export function hasChokContent(): boolean {
  return useChokStore.getState().installed !== null;
}
