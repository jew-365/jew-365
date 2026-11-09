import { useShnayimStore } from '@/stores/useShnayimStore';

export const SHNAYIM_TEXT_ID = 'shnayim_mikra';

export function shnayimAsset(parasha: string): string | undefined {
  return useShnayimStore.getState().installed?.files[parasha];
}

export function hasShnayimContent(): boolean {
  return useShnayimStore.getState().installed !== null;
}
