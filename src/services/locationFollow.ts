import { useUserStore } from '@/stores/useUserStore';
import { distanceKm } from '@/utils/compass';
import { LocationService } from './LocationService';

// A move shorter than this keeps the saved place: GPS drift would otherwise rewrite the store, and
// rebuild the schedule, on every return to the app. The zmanim shift by about a minute per 15 km.
export const FOLLOW_MIN_KM = 1;

let running: Promise<boolean> | null = null;

// The location follows the phone (the owner's calls, 2026-10-31): on launch and on every return to the
// app the zmanim move to where the user is now, a city picked by hand included. No permission is ever
// asked for here, so without one the saved place stays. Resolves true when it wrote a new location;
// never rejects.
export function followDeviceLocation(): Promise<boolean> {
  running ??= follow().finally(() => {
    running = null;
  });
  return running;
}

async function follow(): Promise<boolean> {
  try {
    const before = useUserStore.getState().location;
    if ((await LocationService.getPermissionStatus()) !== 'ready') return false;
    const point = (await LocationService.getLastKnownPoint()) ?? (await LocationService.getPrecisePoint());
    if (!point) return false;
    const user = useUserStore.getState();
    // A place written while the fix was on its way (a city picked, "locate me") wins over this fix.
    if (user.location !== before) return false;
    if (user.locationStatus === 'ready' && distanceKm(user.location, point) < FOLLOW_MIN_KM) return false;
    user.setLocationState(LocationService.locationAt(point.lat, point.lng), 'ready', 'gps');
    return true;
  } catch {
    return false;
  }
}
