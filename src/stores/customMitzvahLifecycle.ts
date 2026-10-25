import { endedCustomIds } from '@/utils/customMitzvah';
import { appDayKey } from '@/utils/locationDay';
import { useCustomMitzvotStore } from './useCustomMitzvotStore';
import { useMitzvotStore } from './useMitzvotStore';
import { useUserStore } from './useUserStore';

export function reconcileEndedCustomMitzvot(now: Date = new Date()): string[] {
  const { activeMitzvot, setEnabled } = useMitzvotStore.getState();
  const todayKey = appDayKey(now, useUserStore.getState().location);
  const ended = endedCustomIds(useCustomMitzvotStore.getState().list(), activeMitzvot, todayKey);
  ended.forEach((id) => setEnabled(id, false));
  return ended;
}
