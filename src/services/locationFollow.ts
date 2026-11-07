import { useUserStore } from '@/stores/useUserStore';
import { distanceKm } from '@/utils/compass';
import { LocationService } from './LocationService';

// A move shorter than this keeps the saved place: GPS drift would otherwise rewrite the store, and
// rebuild the schedule, on every return to the app. The zmanim shift by about a minute per 15 km.
export const FOLLOW_MIN_KM = 1;

// How often the location is read again while the app is open in the foreground (the owner's call,
// 2026-11-07). JS timers do not run in the background, so a return to the app reads it as well.
export const FOLLOW_INTERVAL_MS = 30_000;

let running: Promise<boolean> | null = null;

// The location follows the phone unless the user picked a place by hand (`locationSource` 'manual' with a
// `ready` status; the default place, never confirmed, follows too): on launch
// and on every return to the app the zmanim move to where the user is now. A place picked by hand stays
// until the user switches back (the owner's call, 2026-11-05, replacing that of 2026-10-31, which moved a
// picked city too). No permission is ever asked for here, so without one the saved place stays. Resolves
// true when it wrote a new location; never rejects. `fresh` (the half-minute tick) asks the phone for a
// new fix instead of its last known one, which may be up to half an hour old.
export function followDeviceLocation({ fresh = false }: { fresh?: boolean } = {}): Promise<boolean> {
  running ??= follow(fresh).finally(() => {
    running = null;
  });
  return running;
}

async function follow(fresh: boolean): Promise<boolean> {
  try {
    const before = useUserStore.getState().location;
    const { locationSource, locationStatus } = useUserStore.getState();
    // A place the user picked stays; the default nobody confirmed does not.
    if (locationSource === 'manual' && locationStatus === 'ready') return false;
    if ((await LocationService.getPermissionStatus()) !== 'ready') return false;
    const point = fresh
      ? await LocationService.getCurrentPoint()
      : ((await LocationService.getLastKnownPoint()) ?? (await LocationService.getPrecisePoint()));
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
