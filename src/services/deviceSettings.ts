import { Linking, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

// Exact alarms are necessary but not sufficient: OEM battery managers still defer or kill scheduled
// work. The owner chose on 2026-10-28 to ask for REQUEST_IGNORE_BATTERY_OPTIMIZATIONS (app.json),
// whose system dialog sets "Unrestricted" in one tap, accepting Google Play's review of it; the
// settings list stays the fallback for a binary without the module and a ROM without the dialog.
const BATTERY_SETTINGS_INTENT = 'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS';
const UNUSED_APP_RESTRICTIONS_MIN_API = 30;

export type UnusedAppRestrictionsStatus = 'disabled' | 'enabled' | 'unavailable' | 'error';
export type BackgroundRefreshStatus = 'available' | 'restricted';

type PowerSettingsModule = {
  isIgnoringBatteryOptimizations(): Promise<boolean>;
  requestIgnoreBatteryOptimizations(): Promise<boolean>;
  openSamsungNeverSleeping(): Promise<boolean>;
  unusedAppRestrictionsStatus(): Promise<UnusedAppRestrictionsStatus>;
  openUnusedAppRestrictions(): Promise<boolean>;
};

function powerSettings(): PowerSettingsModule | null {
  if (Platform.OS !== 'android') return null;
  return requireOptionalNativeModule<PowerSettingsModule>('PowerSettings');
}

export function hasPowerSettingsModule(): boolean {
  return powerSettings() !== null;
}

export async function openAppSettings(): Promise<void> {
  await Linking.openSettings().catch(() => {});
}

export function supportsBatteryOptimizationSettings(): boolean {
  return Platform.OS === 'android';
}

export async function openBatteryOptimizationSettings(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    await openAppSettings();
    return false;
  }
  try {
    await Linking.sendIntent(BATTERY_SETTINGS_INTENT);
    return true;
  } catch {
    await openAppSettings();
    return false;
  }
}

export async function isIgnoringBatteryOptimizations(): Promise<boolean | null> {
  const native = powerSettings();
  if (!native) return null;
  return native.isIgnoringBatteryOptimizations().catch(() => null);
}

export async function requestIgnoreBatteryOptimizations(): Promise<boolean> {
  const native = powerSettings();
  const opened = native ? await native.requestIgnoreBatteryOptimizations().catch(() => false) : false;
  if (opened) return true;
  await openBatteryOptimizationSettings();
  return false;
}

export function isSamsungDevice(): boolean {
  return (
    Platform.OS === 'android' &&
    (Platform.constants as { Manufacturer?: string }).Manufacturer?.toLowerCase() === 'samsung'
  );
}

export async function openSamsungNeverSleeping(): Promise<boolean> {
  const native = powerSettings();
  const opened = native ? await native.openSamsungNeverSleeping().catch(() => false) : false;
  if (opened) return true;
  await openAppSettings();
  return false;
}

export function supportsUnusedAppRestrictions(): boolean {
  return Platform.OS === 'android' && Number(Platform.Version) >= UNUSED_APP_RESTRICTIONS_MIN_API;
}

export async function unusedAppRestrictionsStatus(): Promise<UnusedAppRestrictionsStatus | null> {
  const native = supportsUnusedAppRestrictions() ? powerSettings() : null;
  return native ? native.unusedAppRestrictionsStatus().catch(() => null) : null;
}

export async function openUnusedAppRestrictions(): Promise<boolean> {
  const native = powerSettings();
  const opened = native ? await native.openUnusedAppRestrictions().catch(() => false) : false;
  if (opened) return true;
  await openAppSettings();
  return false;
}

export function supportsBackgroundRefreshStatus(): boolean {
  return Platform.OS === 'ios';
}

export async function backgroundRefreshStatus(): Promise<BackgroundRefreshStatus | null> {
  if (!supportsBackgroundRefreshStatus()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy: the native task module is absent from Jest and web
    const BackgroundTask = require('expo-background-task') as typeof import('expo-background-task');
    const status = await BackgroundTask.getStatusAsync();
    if (status === BackgroundTask.BackgroundTaskStatus.Available) return 'available';
    if (status === BackgroundTask.BackgroundTaskStatus.Restricted) return 'restricted';
    return null;
  } catch {
    return null;
  }
}
