import { AppState, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { useCompletionsStore, type Completions } from '@/stores/useCompletionsStore';
import { useUserStore } from '@/stores/useUserStore';
import { shouldAskForRating } from '@/utils/rating';

export const RATING_DELAY_MS = 1500;
export const NOTIFICATION_MARK_WINDOW_MS = 5000;

type StoreReview = typeof import('expo-store-review');

let nativeMissing = false;
let asking = false;
let notificationMarkAt: number | null = null;

export function noteNotificationMark(): void {
  notificationMarkAt = Date.now();
}

function takeNotificationMark(): boolean {
  const noted = notificationMarkAt !== null && Date.now() - notificationMarkAt <= NOTIFICATION_MARK_WINDOW_MS;
  notificationMarkAt = null;
  return noted;
}

function markCount(completions: Completions): number {
  return Object.values(completions).reduce((total, marks) => total + Object.keys(marks).length, 0);
}

// A binary built before this module lacks ExpoStoreReview, and requiring the package there throws while Metro loads it,
// which a release build reports as fatal before any catch around the require runs: ask for the native half first.
function loadStoreReview(): StoreReview | null {
  if (nativeMissing) return null;
  if (!requireOptionalNativeModule('ExpoStoreReview')) {
    nativeMissing = true;
    console.warn('[storeReview] unavailable in this build');
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- call time only, once the native module is known to be in the binary
  return require('expo-store-review') as StoreReview;
}

async function askIfDue(): Promise<void> {
  if (asking) return;
  asking = true;
  try {
    const user = useUserStore.getState();
    const due = shouldAskForRating({
      completions: useCompletionsStore.getState().completions,
      askedAt: user.ratingAskedAt,
      firstOpenedAt: user.firstOpenedAt,
      now: new Date(),
      location: user.location,
      appActive: AppState.currentState === 'active',
    });
    if (!due) return;
    const storeReview = loadStoreReview();
    if (!storeReview || !(await storeReview.isAvailableAsync())) return;
    useUserStore.getState().setRatingAskedAt(Date.now());
    await storeReview.requestReview();
  } catch (error) {
    console.warn('[storeReview]', error);
  } finally {
    asking = false;
  }
}

export function watchForRatingMoment(): () => void {
  if (Platform.OS === 'web') return () => {};
  let marks = markCount(useCompletionsStore.getState().completions);
  let timer: ReturnType<typeof setTimeout> | null = null;
  const unsubscribe = useCompletionsStore.subscribe((state) => {
    const count = markCount(state.completions);
    const grew = count > marks;
    marks = count;
    // A hydrate (a backup restore) brings marks back; it never makes one.
    if (!grew || !useCompletionsStore.persist.hasHydrated() || takeNotificationMark()) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void askIfDue();
    }, RATING_DELAY_MS);
  });
  return () => {
    unsubscribe();
    if (timer) clearTimeout(timer);
    timer = null;
  };
}
