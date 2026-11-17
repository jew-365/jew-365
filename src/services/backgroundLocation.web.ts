// Web has no background location: the same exports as backgroundLocation.ts, doing nothing.
export const BACKGROUND_LOCATION_TASK = 'jew-365-background-location';
export const BACKGROUND_LOCATION_INTERVAL_MS = 10 * 60 * 1000;
export const BACKGROUND_LOCATION_DISTANCE_M = 1000;

export async function handleBackgroundFix(_point: { lat: number; lng: number }, _now?: Date): Promise<boolean> {
  return false;
}

export async function backgroundLocationSupported(): Promise<boolean> {
  return false;
}

export async function enableBackgroundLocation(): Promise<'on' | 'denied' | 'unsupported'> {
  return 'unsupported';
}

export async function disableBackgroundLocation(): Promise<void> {}

export async function syncBackgroundLocation(): Promise<void> {}

export async function backgroundLocationActive(): Promise<boolean> {
  return false;
}
