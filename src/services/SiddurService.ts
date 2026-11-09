import { Nusach } from '@/types/mitzvah';
import { ChokAsset } from '@/types/chok';
import { SiddurText, SiddurTextId } from '@/types/siddur';
import { SELICHOT_TEXT_ID } from '@/data/selichot';
import { siddurAsset } from '@/data/siddur';
import { readAddonJson } from '@/services/addons/addonFiles';
import { readBundledAsset as readAsset } from '@/services/bundledAsset';
import { chokParashaFile, readChokAsset } from '@/services/chokFiles';
import { selichotTextFile } from '@/services/selichotFiles';
import { readShnayimAsset, shnayimParashaFile } from '@/services/shnayimFiles';
import { useShnayimStore } from '@/stores/useShnayimStore';
import { shnayimAsChok } from '@/utils/shnayim';
import { useChokStore } from '@/stores/useChokStore';
import { useSelichotStore } from '@/stores/useSelichotStore';

const loaded = new Map<string, Promise<unknown>>();

function loadOnce<T>(key: string, load: () => Promise<T>): Promise<T> {
  const cached = loaded.get(key);
  if (cached) return cached as Promise<T>;
  const pending = load();
  loaded.set(key, pending);
  pending.catch(() => loaded.delete(key));
  return pending;
}

export function loadSiddurText(nusach: Nusach, id: SiddurTextId): Promise<SiddurText> {
  if (id === SELICHOT_TEXT_ID) {
    const install = useSelichotStore.getState().installed;
    const file = install ? selichotTextFile(install, nusach) : null;
    if (!install || !file) return Promise.reject(new Error(`no siddur text ${nusach}/selichot`));
    return loadOnce(`selichot/${install.version}/${nusach}`, () => readAddonJson<SiddurText>(file));
  }
  const moduleId = siddurAsset(nusach, id);
  if (moduleId === undefined) return Promise.reject(new Error(`no siddur text ${nusach}/${id}`));
  return loadOnce(`${nusach}/${id}`, () => readAsset(moduleId).then((raw) => JSON.parse(raw) as SiddurText));
}

export function loadChokParasha(parasha: string): Promise<ChokAsset> {
  const install = useChokStore.getState().installed;
  const file = install ? chokParashaFile(install, parasha) : null;
  if (!install || !file) return Promise.reject(new Error(`no chok text ${parasha}`));
  return loadOnce(`chok/${install.version}/${parasha}`, () => readChokAsset(file));
}

// A Shnayim Mikra parasha in the shape the Chok LeYisrael reader reads: one slot per day, its aliyot.
export function loadShnayimParasha(parasha: string): Promise<ChokAsset> {
  const install = useShnayimStore.getState().installed;
  const file = install ? shnayimParashaFile(install, parasha) : null;
  if (!install || !file) return Promise.reject(new Error(`no shnayim text ${parasha}`));
  return loadOnce(`shnayim/${install.version}/${parasha}`, () => readShnayimAsset(file).then(shnayimAsChok));
}

export function clearShnayimCache(): void {
  for (const key of [...loaded.keys()]) {
    if (key.startsWith('shnayim/')) loaded.delete(key);
  }
}

export function clearChokCache(): void {
  for (const key of [...loaded.keys()]) {
    if (key.startsWith('chok/')) loaded.delete(key);
  }
}

export function clearSelichotCache(): void {
  for (const key of [...loaded.keys()]) {
    if (key.startsWith('selichot/')) loaded.delete(key);
  }
}
