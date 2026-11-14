import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

export function onProductionChannel(): boolean {
  return Updates.channel === 'production';
}

export type UpdateDownload = { id: string; createdAt: string };
export type UpdateRef = { updateId?: string; updateCreatedAt?: string };

export function appVersionLabel(): string {
  return `${Constants.expoConfig?.version ?? ''}-${process.env.EXPO_PUBLIC_UPDATE_NUMBER ?? 0}`;
}

export async function downloadNewUpdate(): Promise<UpdateDownload | null> {
  if (__DEV__ || !Updates.isEnabled) return null;
  const check = await Updates.checkForUpdateAsync();
  if (!check.isAvailable) return null;
  await Updates.fetchUpdateAsync();
  const { manifest } = check;
  return {
    id: manifest.id,
    createdAt: 'createdAt' in manifest ? manifest.createdAt : new Date(manifest.commitTime).toISOString(),
  };
}

export function isUpdateApplied({ updateId, updateCreatedAt }: UpdateRef): boolean {
  if (updateId && Updates.updateId === updateId) return true;
  const announced = updateCreatedAt ? Date.parse(updateCreatedAt) : NaN;
  return Updates.createdAt !== null && Updates.createdAt.getTime() >= announced;
}

export async function reloadIntoUpdate(): Promise<void> {
  try {
    await Updates.reloadAsync();
  } catch {}
}
