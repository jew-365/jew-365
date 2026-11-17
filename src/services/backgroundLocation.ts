import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useUserStore } from '@/stores/useUserStore';
import { quietBlockAt } from '@/utils/skipRules';
import { holdScreenOnReturn } from './externalFlow';
import { followDevicePoint } from './locationFollow';
import { NotificationScheduler } from './NotificationScheduler';

// "My location" while the app is closed (the owner's call, 2026-11-17): the OS hands the app a fix when the
// phone has moved, the saved place follows it by the rule of locationFollow.ts and the reminders are planned
// again for the new place. Android only for now: iOS needs the `location` background mode, which no build
// carries. The OS sets the cadence (a few fixes an hour on Android without a foreground service, which the
// app does not run), and the request below is only the app's wish.
export const BACKGROUND_LOCATION_TASK = 'jew-365-background-location';
export const BACKGROUND_LOCATION_INTERVAL_MS = 10 * 60 * 1000;
// A city-scale move is what changes the zmanim; a shorter one never wakes the app.
export const BACKGROUND_LOCATION_DISTANCE_M = 1000;

type LocationTaskData = { locations?: { coords: { latitude: number; longitude: number } }[] };

// Defined at module scope and imported by the root index.js: a fix that arrives while the app is killed is a
// headless launch, which never loads the router tree.
TaskManager.defineTask<LocationTaskData>(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  const fix = data?.locations?.[data.locations.length - 1];
  if (error || !fix) return;
  await handleBackgroundFix({ lat: fix.coords.latitude, lng: fix.coords.longitude });
});

// Nothing moves inside a holy block, where the app is never active, before onboarding, or once the setting
// is off; a move rebuilds the schedule, since a headless launch has no store subscription to do it.
export async function handleBackgroundFix(point: { lat: number; lng: number }, now = new Date()): Promise<boolean> {
  const { isOnboarded, backgroundLocation, location } = useUserStore.getState();
  if (!isOnboarded || !backgroundLocation || quietBlockAt(now, location)) return false;
  if (!followDevicePoint(point)) return false;
  await NotificationScheduler.rebuild().catch(() => {});
  return true;
}

// Whether this binary declares the background location permission: expo-location throws on a manifest
// without it, and the JavaScript reaches such binaries over the air.
export async function backgroundLocationSupported(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    await Location.getBackgroundPermissionsAsync();
    return true;
  } catch {
    return false;
  }
}

async function backgroundGranted(): Promise<boolean> {
  try {
    return (await Location.getBackgroundPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

async function start(): Promise<void> {
  if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) return;
  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: BACKGROUND_LOCATION_INTERVAL_MS,
    distanceInterval: BACKGROUND_LOCATION_DISTANCE_M,
  });
}

async function stop(): Promise<void> {
  if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}

// The switch in Settings: asks for "Allow all the time" (Android opens its settings page for it, so the
// return keeps the screen) and starts the updates. `denied` leaves the setting off.
export async function enableBackgroundLocation(): Promise<'on' | 'denied' | 'unsupported'> {
  if (!(await backgroundLocationSupported())) return 'unsupported';
  try {
    if (!(await Location.getForegroundPermissionsAsync()).granted) return 'denied';
    holdScreenOnReturn();
    if (!(await Location.requestBackgroundPermissionsAsync()).granted) return 'denied';
    useUserStore.getState().setBackgroundLocation(true);
    await start();
    return 'on';
  } catch {
    useUserStore.getState().setBackgroundLocation(false);
    return 'denied';
  }
}

export async function disableBackgroundLocation(): Promise<void> {
  useUserStore.getState().setBackgroundLocation(false);
  await stop().catch(() => {});
}

// On launch and on every return to the app: the updates run exactly while the setting is on, the user
// follows "my location" and the permission still stands; a permission withdrawn in the system settings
// stops them and leaves the setting as it is, so granting it again resumes.
export async function syncBackgroundLocation(): Promise<void> {
  try {
    if (!(await backgroundLocationSupported())) return;
    const { backgroundLocation, locationSource, isOnboarded } = useUserStore.getState();
    const wanted = isOnboarded && backgroundLocation && locationSource === 'gps' && (await backgroundGranted());
    await (wanted ? start() : stop());
  } catch {}
}

// Whether the updates would run now, for the switch in Settings.
export async function backgroundLocationActive(): Promise<boolean> {
  return useUserStore.getState().backgroundLocation && (await backgroundGranted());
}
