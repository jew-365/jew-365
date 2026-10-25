jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

type ScheduleInput = { identifier: string; content: { data: Record<string, unknown> }; trigger?: unknown };

const mockState: { pending: ScheduleInput[] } = { pending: [] };
const mockSchedule = jest.fn(async (input: ScheduleInput) => {
  mockState.pending = mockState.pending.filter((p) => p.identifier !== input.identifier);
  mockState.pending.push(input);
  return input.identifier;
});
const mockCancelAll = jest.fn(async () => {
  mockState.pending = [];
});

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (i: unknown) => mockSchedule(i as ScheduleInput),
  cancelAllScheduledNotificationsAsync: () => mockCancelAll(),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  getAllScheduledNotificationsAsync: jest.fn(async () => mockState.pending),
  getPresentedNotificationsAsync: jest.fn(async () => []),
  dismissNotificationAsync: jest.fn(async () => {}),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => ({})),
  setNotificationCategoryAsync: jest.fn(async () => ({})),
  registerTaskAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  AndroidImportance: { HIGH: 'high', DEFAULT: 'default' },
  AndroidNotificationVisibility: { PUBLIC: 'public', PRIVATE: 'private' },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
jest.mock('expo-background-task', () => ({
  registerTaskAsync: jest.fn(),
  unregisterTaskAsync: jest.fn(),
  getStatusAsync: jest.fn(),
  BackgroundTaskResult: { Success: 1, Failed: 2 },
  BackgroundTaskStatus: { Restricted: 1, Available: 2 },
}));

import { CITIES } from '@/data/cities';
import { LAST_REBUILD_KEY, SCHEDULE_FORMAT, SCHEDULE_FORMAT_KEY } from '@/services/notifications/ids';
import { dateKey } from '@/stores/useCompletionsStore';
import { STORE_VERSION } from '@/stores/persistOptions';
import type { ActiveMitzvahState } from '@/stores/useMitzvotStore';
import { at } from '@/testing/zmanim';

type Launch = {
  storage: (typeof import('@/services/StorageService'))['storage'];
  scheduler: typeof import('../NotificationScheduler');
  mitzvot: typeof import('@/stores/useMitzvotStore');
  user: typeof import('@/stores/useUserStore');
  optIn: typeof import('@/stores/taharahOptIn');
  defineTask: jest.Mock;
};

const PINNED_NOW = at(CITIES[0], '2026-11-11T06:00');
const SAVED_WITHOUT_TEFILLIN: Record<string, ActiveMitzvahState> = {
  krias_shma_shacharit: { enabled: true },
  shacharit: { enabled: true },
  mincha: { enabled: true },
  maariv: { enabled: true },
};

function launchHeadless(
  gender: 'female' | 'male',
  savedVersion: number = STORE_VERSION,
  seed?: (storage: Launch['storage']) => void,
): Launch {
  let launch!: Launch;
  jest.isolateModules(() => {
    const { storage } = require('@/services/StorageService');
    storage.set(
      'user-store',
      JSON.stringify({
        version: STORE_VERSION,
        state: { gender, isOnboarded: true, notificationPermission: 'granted' },
      }),
    );
    storage.set(
      'mitzvot-store',
      JSON.stringify({ version: savedVersion, state: { activeMitzvot: SAVED_WITHOUT_TEFILLIN } }),
    );
    seed?.(storage);
    launch = {
      storage,
      scheduler: require('../NotificationScheduler'),
      mitzvot: require('@/stores/useMitzvotStore'),
      user: require('@/stores/useUserStore'),
      optIn: require('@/stores/taharahOptIn'),
      defineTask: require('expo-task-manager').defineTask,
    };
  });
  return launch;
}

const persistedOf = (launch: Launch): Record<string, ActiveMitzvahState> =>
  JSON.parse(launch.storage.getString('mitzvot-store')!).state.activeMitzvot;

const pendingFor = (mitzvahId: string) =>
  mockState.pending.map(({ identifier }) => identifier).filter((identifier) => identifier.startsWith(`${mitzvahId}__`));

function runDailyTask(launch: Launch): Promise<unknown> {
  const [, task] = launch.defineTask.mock.calls.find(([name]) => name === launch.scheduler.DAILY_REBUILD_TASK)!;
  return (task as () => Promise<unknown>)();
}

const PENDING_FROM_PREVIOUS_BUNDLE: ScheduleInput = {
  identifier: 'shacharit__2026-11-12__0',
  content: { data: { mitzvahId: 'shacharit', dateKey: '2026-11-12', reminderIndex: 0 } },
};

function currentSchedule(storage: Launch['storage']): void {
  storage.set(SCHEDULE_FORMAT_KEY, JSON.stringify(SCHEDULE_FORMAT));
  storage.set(LAST_REBUILD_KEY, JSON.stringify(dateKey(new Date())));
}

const carriedFrom = (previous: Launch) => (storage: Launch['storage']) =>
  previous.storage.getAllKeys().forEach((key) => storage.set(key, previous.storage.getString(key)!));

beforeAll(() => {
  jest.useFakeTimers({
    now: PINNED_NOW,
    doNotFake: [
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  });
});
afterAll(() => jest.useRealTimers());
beforeEach(() => {
  mockState.pending = [];
  mockSchedule.mockClear();
  mockCancelAll.mockClear();
});

describe('gender defaults in a headless launch', () => {
  it.each([STORE_VERSION, STORE_VERSION - 1])(
    "leaves a men's mitzvah the hydrate adds off for a woman when only the scheduler module loads (saved version %i)",
    (savedVersion) => {
      const launch = launchHeadless('female', savedVersion);
      const active = launch.mitzvot.useMitzvotStore.getState().activeMitzvot;

      expect(launch.user.useUserStore.persist.hasHydrated()).toBe(true);
      expect(launch.mitzvot.useMitzvotStore.persist.hasHydrated()).toBe(true);
      expect(active.tefillin.enabled).toBe(false);
      expect(active.shacharit).toEqual({ enabled: true });
      expect(active.krias_shma_al_hamita).toEqual({ enabled: true, enabledAt: PINNED_NOW.getTime() });
      expect(persistedOf(launch).tefillin.enabled).toBe(false);
      expect(persistedOf(launch).krias_shma_al_hamita).toEqual({ enabled: true, enabledAt: PINNED_NOW.getTime() });
      expect(launch.mitzvot.takeAddedOnHydrate()).toEqual([]);
    },
  );

  it('schedules nothing for it from the hourly background task, and the rest as usual', async () => {
    const launch = launchHeadless('female');

    await expect(runDailyTask(launch)).resolves.toBe(1);

    expect(pendingFor('tefillin')).toEqual([]);
    expect(pendingFor('shacharit').length).toBeGreaterThan(0);
  });

  it('keeps it on and schedules it for a man', async () => {
    const launch = launchHeadless('male');

    expect(launch.mitzvot.useMitzvotStore.getState().activeMitzvot.tefillin).toEqual({
      enabled: true,
      enabledAt: PINNED_NOW.getTime(),
    });
    await expect(runDailyTask(launch)).resolves.toBe(1);

    expect(pendingFor('tefillin').length).toBeGreaterThan(0);
  });

  it('leaves a later call in the same process, as the root layout makes, without effect', () => {
    const launch = launchHeadless('female');
    launch.mitzvot.useMitzvotStore.getState().setEnabled('tefillin', true);

    launch.optIn.applyGenderDefaultsToNew();

    expect(launch.mitzvot.useMitzvotStore.getState().activeMitzvot.tefillin.enabled).toBe(true);
  });
});

describe('a mitzvah the hydrate adds, without a format raise', () => {
  beforeEach(() => {
    mockState.pending = [PENDING_FROM_PREVIOUS_BUNDLE];
  });

  it('rebuilds once on the first foreground and schedules it, with the stored format current and reminders pending', async () => {
    const launch = launchHeadless('male', STORE_VERSION, currentSchedule);
    expect(pendingFor('tefillin')).toEqual([]);

    await launch.scheduler.refreshSchedulingOnForeground();

    expect(mockCancelAll).toHaveBeenCalledTimes(1);
    expect(pendingFor('tefillin').length).toBeGreaterThan(0);
    expect(launch.storage.getString(SCHEDULE_FORMAT_KEY)).toBe(JSON.stringify(SCHEDULE_FORMAT));

    await launch.scheduler.refreshSchedulingOnForeground();
    expect(mockCancelAll).toHaveBeenCalledTimes(1);
  });

  it("schedules the added bedtime Shema for a woman from that rebuild, and not the men's mitzvah", async () => {
    const launch = launchHeadless('female', STORE_VERSION, currentSchedule);

    await launch.scheduler.refreshSchedulingOnForeground();

    expect(mockCancelAll).toHaveBeenCalledTimes(1);
    expect(pendingFor('krias_shma_al_hamita').length).toBeGreaterThan(0);
    expect(pendingFor('tefillin')).toEqual([]);
  });

  it('rebuilds on the next launch after a headless launch took the added ids without rebuilding', async () => {
    const headless = launchHeadless('male', STORE_VERSION, currentSchedule);
    await expect(runDailyTask(headless)).resolves.toBe(1);
    expect(mockCancelAll).not.toHaveBeenCalled();
    expect(persistedOf(headless).tefillin).toEqual({ enabled: true, enabledAt: PINNED_NOW.getTime() });

    const foreground = launchHeadless('male', STORE_VERSION, carriedFrom(headless));
    await foreground.scheduler.refreshSchedulingOnForeground();

    expect(mockCancelAll).toHaveBeenCalledTimes(1);
    expect(pendingFor('tefillin').length).toBeGreaterThan(0);
  });

  it('leaves a current schedule alone on a launch whose hydrate adds nothing', async () => {
    const first = launchHeadless('male', STORE_VERSION, currentSchedule);
    const next = launchHeadless('male', STORE_VERSION, (storage) => {
      carriedFrom(first)(storage);
      currentSchedule(storage);
    });

    await next.scheduler.refreshSchedulingOnForeground();

    expect(mockCancelAll).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
    expect(mockState.pending).toEqual([PENDING_FROM_PREVIOUS_BUNDLE]);
  });
});
