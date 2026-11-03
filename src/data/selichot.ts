import { NUSACH_IDS } from '@/data/nuschaot';
import { selectSelichotInstalledFor, useSelichotStore } from '@/stores/useSelichotStore';
import { Nusach } from '@/types/mitzvah';

export const SELICHOT_TEXT_ID = 'selichot' as const;

export const SELICHOT_NUSCHAOT: readonly Nusach[] = NUSACH_IDS;

export function hasSelichotContent(nusach: Nusach): boolean {
  return selectSelichotInstalledFor(nusach)(useSelichotStore.getState());
}
