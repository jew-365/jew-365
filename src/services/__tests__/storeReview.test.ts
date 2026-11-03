jest.mock('expo-store-review', () => ({ isAvailableAsync: jest.fn(), requestReview: jest.fn() }), { virtual: false });
const mockNativeModule = jest.fn<object | null, [string]>();
jest.mock('expo', () => ({ requireOptionalNativeModule: (name: string) => mockNativeModule(name) }));

import * as fs from 'fs';
import * as path from 'path';
import { AppState, Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';
import {
  NOTIFICATION_MARK_WINDOW_MS,
  RATING_DELAY_MS,
  noteNotificationMark,
  watchForRatingMoment,
} from '../storeReview';
import { CITIES } from '@/data/cities';
import { storage } from '@/services/StorageService';
import { STORE_VERSION } from '@/stores/persistOptions';
import { useCompletionsStore, type Completions } from '@/stores/useCompletionsStore';
import { useUserStore } from '@/stores/useUserStore';
import { RATING_MARKED_DAYS } from '@/utils/rating';
import { at } from '@/testing/zmanim';

const J = CITIES[0];
const NOW = at(J, '2026-10-28T12:00');
const OPENED = at(J, '2026-10-20T12:00').getTime();
const isAvailable = jest.mocked(StoreReview.isAvailableAsync);
const requestReview = jest.mocked(StoreReview.requestReview);

const dayKey = (day: number) => `2026-10-${String(day).padStart(2, '0')}`;

function seedMarkedDays(count: number) {
  const completions: Completions = {};
  for (let day = 1; day <= count; day += 1) completions[dayKey(day)] = { tefillin: 1 };
  useCompletionsStore.setState({ completions });
}

function mark(day: number, id = 'tefillin') {
  useCompletionsStore.setState((state) => ({
    completions: { ...state.completions, [dayKey(day)]: { ...state.completions[dayKey(day)], [id]: Date.now() } },
  }));
}

function setAppState(status: string, target: object = AppState) {
  Object.defineProperty(target, 'currentState', { value: status, configurable: true, writable: true });
}

async function pass(ms: number) {
  await jest.advanceTimersByTimeAsync(ms);
}

describe('watchForRatingMoment', () => {
  let stop: () => void;

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    useUserStore.getState().reset();
    useCompletionsStore.getState().reset();
    useUserStore.setState({ location: J, inIsrael: true, firstOpenedAt: OPENED });
    isAvailable.mockResolvedValue(true);
    requestReview.mockResolvedValue(undefined);
    mockNativeModule.mockImplementation(() => ({}));
    seedMarkedDays(RATING_MARKED_DAYS - 1);
    setAppState('active');
    stop = () => {};
  });

  afterEach(() => {
    stop();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('asks once, a moment after the mark that makes the seventh marked day, stamping before it asks', async () => {
    let stampedWhenAsked: number | null = null;
    requestReview.mockImplementation(async () => {
      stampedWhenAsked = useUserStore.getState().ratingAskedAt;
    });
    stop = watchForRatingMoment();

    mark(RATING_MARKED_DAYS);
    await pass(RATING_DELAY_MS - 1);
    expect(isAvailable).not.toHaveBeenCalled();

    await pass(1);
    expect(isAvailable).toHaveBeenCalledTimes(1);
    expect(requestReview).toHaveBeenCalledTimes(1);
    expect(stampedWhenAsked).toBe(NOW.getTime() + RATING_DELAY_MS);
    expect(useUserStore.getState().ratingAskedAt).toBe(NOW.getTime() + RATING_DELAY_MS);
    expect(isAvailable.mock.invocationCallOrder[0]).toBeLessThan(requestReview.mock.invocationCallOrder[0]);
  });

  it('does not ask again on a later mark', async () => {
    stop = watchForRatingMoment();
    mark(RATING_MARKED_DAYS);
    await pass(RATING_DELAY_MS);
    expect(requestReview).toHaveBeenCalledTimes(1);

    mark(RATING_MARKED_DAYS + 1);
    await pass(RATING_DELAY_MS);
    mark(RATING_MARKED_DAYS + 1, 'mincha');
    await pass(RATING_DELAY_MS);
    expect(requestReview).toHaveBeenCalledTimes(1);
    expect(isAvailable).toHaveBeenCalledTimes(1);
  });

  it('asks nothing while fewer than seven days hold a mark', async () => {
    seedMarkedDays(RATING_MARKED_DAYS - 2);
    stop = watchForRatingMoment();
    mark(RATING_MARKED_DAYS - 1);
    await pass(RATING_DELAY_MS);
    expect(isAvailable).not.toHaveBeenCalled();
    expect(requestReview).not.toHaveBeenCalled();
  });

  it('asks nothing for a growth that follows a notification mark, and the next in-app growth asks', async () => {
    stop = watchForRatingMoment();

    noteNotificationMark();
    mark(RATING_MARKED_DAYS);
    await pass(RATING_DELAY_MS);
    expect(isAvailable).not.toHaveBeenCalled();
    expect(requestReview).not.toHaveBeenCalled();

    mark(RATING_MARKED_DAYS + 1);
    await pass(RATING_DELAY_MS);
    expect(requestReview).toHaveBeenCalledTimes(1);
  });

  it('consumes the note on the growth it meets, so only that growth is skipped', async () => {
    stop = watchForRatingMoment();

    noteNotificationMark();
    mark(RATING_MARKED_DAYS);
    mark(RATING_MARKED_DAYS, 'mincha');
    await pass(RATING_DELAY_MS);
    expect(requestReview).toHaveBeenCalledTimes(1);
  });

  it('lets a note that no growth met expire', async () => {
    stop = watchForRatingMoment();

    noteNotificationMark();
    await pass(NOTIFICATION_MARK_WINDOW_MS + 1);
    mark(RATING_MARKED_DAYS);
    await pass(RATING_DELAY_MS);
    expect(requestReview).toHaveBeenCalledTimes(1);
  });

  it('keeps the ask of an earlier in-app mark when a notification mark follows it', async () => {
    stop = watchForRatingMoment();

    mark(RATING_MARKED_DAYS);
    await pass(RATING_DELAY_MS / 3);
    noteNotificationMark();
    mark(RATING_MARKED_DAYS + 1);
    await pass(RATING_DELAY_MS);
    expect(requestReview).toHaveBeenCalledTimes(1);
  });

  it('asks nothing for a change that adds no mark', async () => {
    seedMarkedDays(RATING_MARKED_DAYS);
    stop = watchForRatingMoment();
    mark(1);
    useCompletionsStore.setState((state) => ({ completions: { ...state.completions } }));
    await pass(RATING_DELAY_MS);
    expect(isAvailable).not.toHaveBeenCalled();
  });

  it('asks nothing for the marks a restore brings back, and the next in-app mark asks', async () => {
    const restored: Completions = {};
    for (let day = 1; day <= RATING_MARKED_DAYS; day += 1) restored[dayKey(day)] = { tefillin: 1 };
    stop = watchForRatingMoment();

    useCompletionsStore.getState().reset();
    storage.set('completions-store', JSON.stringify({ state: { completions: restored }, version: STORE_VERSION }));
    await useCompletionsStore.persist.rehydrate();
    await pass(RATING_DELAY_MS);

    expect(Object.keys(useCompletionsStore.getState().completions)).toHaveLength(RATING_MARKED_DAYS);
    expect(isAvailable).not.toHaveBeenCalled();
    expect(useUserStore.getState().ratingAskedAt).toBeNull();

    mark(RATING_MARKED_DAYS + 1);
    await pass(RATING_DELAY_MS);
    expect(requestReview).toHaveBeenCalledTimes(1);
  });

  it('asks nothing for a mark made on the install first app day', async () => {
    useUserStore.setState({ firstOpenedAt: at(J, '2026-10-28T08:00').getTime() });
    stop = watchForRatingMoment();
    mark(RATING_MARKED_DAYS);
    await pass(RATING_DELAY_MS);
    expect(isAvailable).not.toHaveBeenCalled();
  });

  it('asks nothing inside a holy block', async () => {
    jest.setSystemTime(at(J, '2026-10-31T12:00'));
    stop = watchForRatingMoment();
    mark(RATING_MARKED_DAYS);
    await pass(RATING_DELAY_MS);
    expect(isAvailable).not.toHaveBeenCalled();
    expect(useUserStore.getState().ratingAskedAt).toBeNull();
  });

  it('asks once for marks that come within the delay', async () => {
    stop = watchForRatingMoment();
    mark(RATING_MARKED_DAYS);
    await pass(RATING_DELAY_MS / 2);
    mark(RATING_MARKED_DAYS, 'mincha');
    await pass(RATING_DELAY_MS / 2);
    expect(isAvailable).not.toHaveBeenCalled();
    await pass(RATING_DELAY_MS / 2);
    expect(requestReview).toHaveBeenCalledTimes(1);
  });

  it('stamps nothing when the store review is unavailable, and tries again on the next mark', async () => {
    isAvailable.mockResolvedValue(false);
    stop = watchForRatingMoment();
    mark(RATING_MARKED_DAYS);
    await pass(RATING_DELAY_MS);
    expect(isAvailable).toHaveBeenCalledTimes(1);
    expect(requestReview).not.toHaveBeenCalled();
    expect(useUserStore.getState().ratingAskedAt).toBeNull();

    isAvailable.mockResolvedValue(true);
    mark(RATING_MARKED_DAYS + 1);
    await pass(RATING_DELAY_MS);
    expect(requestReview).toHaveBeenCalledTimes(1);
  });

  it('asks nothing while the app is in the background', async () => {
    setAppState('background');
    stop = watchForRatingMoment();
    mark(RATING_MARKED_DAYS);
    await pass(RATING_DELAY_MS);
    expect(isAvailable).not.toHaveBeenCalled();
    expect(useUserStore.getState().ratingAskedAt).toBeNull();
  });

  it('subscribes to nothing on web', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const subscribe = jest.spyOn(useCompletionsStore, 'subscribe');
    stop = watchForRatingMoment();
    expect(subscribe).not.toHaveBeenCalled();
    mark(RATING_MARKED_DAYS);
    await pass(RATING_DELAY_MS);
    expect(isAvailable).not.toHaveBeenCalled();
    expect(() => stop()).not.toThrow();
  });

  it('stops at the teardown, and drops a pending ask', async () => {
    stop = watchForRatingMoment();
    mark(RATING_MARKED_DAYS);
    await pass(RATING_DELAY_MS / 2);
    stop();
    await pass(RATING_DELAY_MS);
    expect(isAvailable).not.toHaveBeenCalled();

    mark(RATING_MARKED_DAYS + 1);
    await pass(RATING_DELAY_MS);
    expect(isAvailable).not.toHaveBeenCalled();
  });

  it('never throws when the check fails, and warns', async () => {
    isAvailable.mockRejectedValue(new Error('boom'));
    stop = watchForRatingMoment();
    mark(RATING_MARKED_DAYS);
    await pass(RATING_DELAY_MS);
    expect(console.warn).toHaveBeenCalledWith('[storeReview]', expect.any(Error));
    expect(useUserStore.getState().ratingAskedAt).toBeNull();
  });

  it('keeps the stamp when the sheet fails to open', async () => {
    requestReview.mockRejectedValue(new Error('no sheet'));
    stop = watchForRatingMoment();
    mark(RATING_MARKED_DAYS);
    await pass(RATING_DELAY_MS);
    expect(console.warn).toHaveBeenCalledWith('[storeReview]', expect.any(Error));
    expect(useUserStore.getState().ratingAskedAt).toBe(NOW.getTime() + RATING_DELAY_MS);
  });
});

// On a device, Metro reports a throw while it loads a module as fatal before a catch around the require runs, so
// the package must never be required on a binary without its native half.
describe('a binary without the ExpoStoreReview native module', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockNativeModule.mockImplementation(() => null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('never loads the package, stamps nothing and warns once', async () => {
    const mockLoads = jest.fn();
    let stop: () => void = () => {};
    let completions!: typeof useCompletionsStore;
    let user!: typeof useUserStore;
    jest.resetModules();
    jest.isolateModules(() => {
      jest.doMock('expo-store-review', () => {
        mockLoads();
        throw new Error("Cannot find native module 'ExpoStoreReview'");
      });
      completions = require('@/stores/useCompletionsStore').useCompletionsStore;
      user = require('@/stores/useUserStore').useUserStore;
      stop = require('../storeReview').watchForRatingMoment();
    });
    setAppState('active', require('react-native').AppState);
    user.setState({ location: J, inIsrael: true, firstOpenedAt: OPENED });
    const seeded: Completions = {};
    for (let day = 1; day <= RATING_MARKED_DAYS; day += 1) seeded[dayKey(day)] = { tefillin: 1 };

    completions.setState({ completions: seeded });
    await jest.advanceTimersByTimeAsync(RATING_DELAY_MS);
    completions.setState({ completions: { ...seeded, [dayKey(8)]: { tefillin: 1 } } });
    await jest.advanceTimersByTimeAsync(RATING_DELAY_MS);
    stop();

    expect(mockNativeModule).toHaveBeenCalledWith('ExpoStoreReview');
    expect(mockLoads).not.toHaveBeenCalled();
    expect(user.getState().ratingAskedAt).toBeNull();
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith('[storeReview] unavailable in this build');
  });
});

describe('the store review module is only ever loaded at call time', () => {
  const SRC_DIR = path.join(__dirname, '..', '..');
  const MODULE = 'expo-store-review';
  const HOME = 'services/storeReview.ts';

  function walk(dir: string): { rel: string; source: string }[] {
    const out: { rel: string; source: string }[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__') out.push(...walk(full));
      } else if (/\.tsx?$/.test(entry.name)) {
        out.push({
          rel: path.relative(SRC_DIR, full).split(path.sep).join('/'),
          source: fs.readFileSync(full, 'utf8'),
        });
      }
    }
    return out;
  }

  const files = walk(SRC_DIR);
  const STATIC_IMPORT = new RegExp(
    `(?:^|\\n)\\s*(?:import|export)\\b[^;]*?from\\s*['"]${MODULE}['"]|import\\s*['"]${MODULE}['"]`,
  );
  const DYNAMIC_IMPORT = new RegExp(`(?<!typeof\\s)\\bimport\\(\\s*['"]${MODULE}['"]`);
  const REQUIRE_LINE = new RegExp(`^.*\\brequire\\(\\s*['"]${MODULE}['"]\\s*\\).*$`, 'gm');

  it('is never imported statically', () => {
    expect(files.filter(({ source }) => STATIC_IMPORT.test(source) || DYNAMIC_IMPORT.test(source))).toEqual([]);
  });

  it('is required in one place only, inside a function, after the native module check', () => {
    const requires = files.flatMap(({ rel, source }) =>
      [...source.matchAll(REQUIRE_LINE)].map(([line]) => ({ rel, line })),
    );
    expect(requires.map(({ rel }) => rel)).toEqual([HOME]);
    expect(requires[0].line).toMatch(/^\s{2,}\S/);
    const home = files.find(({ rel }) => rel === HOME)?.source ?? '';
    const check = home.indexOf("requireOptionalNativeModule('ExpoStoreReview')");
    expect(check).toBeGreaterThan(-1);
    expect(check).toBeLessThan(home.indexOf(`require('${MODULE}')`));
  });
});
