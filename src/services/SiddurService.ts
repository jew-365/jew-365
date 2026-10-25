import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { Nusach } from '@/types/mitzvah';
import { ChokAsset } from '@/types/chok';
import { SiddurText, SiddurTextId } from '@/types/siddur';
import { SELICHOT_TEXT_ID } from '@/data/selichot';
import { siddurAsset } from '@/data/siddur';
import { readAddonJson } from '@/services/addons/addonFiles';
import { chokParashaFile, readChokAsset } from '@/services/chokFiles';
import { selichotTextFile } from '@/services/selichotFiles';
import { useChokStore } from '@/stores/useChokStore';
import { useSelichotStore } from '@/stores/useSelichotStore';

const loaded = new Map<string, Promise<unknown>>();

async function readAsset(moduleId: number): Promise<string> {
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (Platform.OS === 'web') return (await fetch(uri)).text();
  return new File(uri).text();
}

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
