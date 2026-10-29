jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

type ScheduleInput = {
  identifier: string;
  content: {
    title?: string;
    body?: string;
    data: Record<string, unknown>;
    categoryIdentifier?: string;
    autoDismiss?: boolean;
    sticky?: boolean;
    sound?: string;
  };
  trigger?: { channelId?: string } | null;
};

const mockState: {
  pending: ScheduleInput[];
  presented: { request: { identifier: string; content: { data?: Record<string, unknown> } } }[];
} = { pending: [], presented: [] };
const mockSchedule = jest.fn(async (input: ScheduleInput) => {
  mockState.pending = mockState.pending.filter((p) => p.identifier !== input.identifier);
  mockState.pending.push(input);
  return input.identifier;
});
const mockCancelAll = jest.fn(async () => {
  mockState.pending = [];
});
const mockDismiss = jest.fn(async (_id: string) => {});
const mockSetChannel = jest.fn<Promise<unknown>, [string, unknown]>(async () => ({}));

const mockCheck = jest.fn();
const mockFetch = jest.fn(async () => ({ isNew: true }));
const mockUpdates: { isEnabled: boolean; updateId: string | null; createdAt: Date | null } = {
  isEnabled: true,
  updateId: 'running-id',
  createdAt: new Date('2026-10-08T12:00:00.000Z'),
};

jest.mock('expo-updates', () => ({
  get isEnabled() {
    return mockUpdates.isEnabled;
  },
  get updateId() {
    return mockUpdates.updateId;
  },
  get createdAt() {
    return mockUpdates.createdAt;
  },
  checkForUpdateAsync: () => mockCheck(),
  fetchUpdateAsync: () => mockFetch(),
  reloadAsync: jest.fn(async () => {}),
}));

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (i: unknown) => mockSchedule(i as ScheduleInput),
  cancelAllScheduledNotificationsAsync: () => mockCancelAll(),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  getAllScheduledNotificationsAsync: jest.fn(async () => mockState.pending),
  getPresentedNotificationsAsync: jest.fn(async () => mockState.presented),
  dismissNotificationAsync: (id: string) => mockDismiss(id),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: (id: string, channel: unknown) => mockSetChannel(id, channel),
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

import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import {
  DAILY_REBUILD_TASK,
  UPDATE_NOTIFIED_KEY,
  dismissCompletedPresentedNotifications,
  notifyIfUpdateReady,
  shouldSuppressForCompletion,
} from '../NotificationScheduler';
import { StorageService } from '@/services/StorageService';
import { useUserStore } from '@/stores/useUserStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { CITIES } from '@/data/cities';
import { at } from '@/testing/zmanim';
import he from '@/i18n/he.json';

const JERUSALEM = CITIES[0];
const PINNED_NOW = at(JERUSALEM, '2026-11-11T06:00'); // a plain Wednesday in Cheshvan
const SHABBAT_MIDDAY = at(JERUSALEM, '2026-11-14T12:00');
const SUNDAY_MIDDAY = at(JERUSALEM, '2026-11-15T12:00');

const globals = globalThis as { __DEV__?: boolean };
const NEWER = '2026-10-08T14:00:00.000Z';
const OLDER = '2026-10-08T11:00:00.000Z';
const AVAILABLE = (id: string, createdAt = NEWER) => ({ isAvailable: true, manifest: { id, createdAt } });
const NOTHING_NEWER = { isAvailable: false, manifest: undefined, reason: 'noUpdateAvailableOnServer' };

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
afterEach(() => jest.setSystemTime(PINNED_NOW));

const pendingIds = () => mockState.pending.map((p) => p.identifier);
const pendingOf = (identifier: string) => mockState.pending.find((p) => p.identifier === identifier);

describe('NotificationScheduler update notice', () => {
  beforeEach(() => {
    mockState.pending = [];
    mockState.presented = [];
    mockSchedule.mockClear();
    mockCancelAll.mockClear();
    mockDismiss.mockClear();
    mockSetChannel.mockClear();
    mockFetch.mockClear();
    mockCheck.mockReset();
    mockCheck.mockResolvedValue(AVAILABLE('u1'));
    mockUpdates.isEnabled = true;
    mockUpdates.updateId = 'running-id';
    mockUpdates.createdAt = new Date('2026-10-08T12:00:00.000Z');
    useCompletionsStore.setState({ completions: {}, skipped: {}, checkIns: {}, archivedDays: [] });
    useUserStore.getState().reset();
    useUserStore.getState().setLocation(JERUSALEM);
    useUserStore.getState().setOnboarded(true);
    useUserStore.getState().setNotificationsEnabled(true);
    useUserStore.getState().setNotificationPermission('granted');
    const disabled = Object.fromEntries(
      Object.keys(useMitzvotStore.getState().activeMitzvot).map((id) => [id, { enabled: false }]),
    );
    useMitzvotStore.setState({ activeMitzvot: disabled });
    StorageService.delete(UPDATE_NOTIFIED_KEY);
    globals.__DEV__ = false;
  });
  afterEach(() => {
    globals.__DEV__ = true;
  });

  it('1 presents one notice for a downloaded update', async () => {
    await expect(notifyIfUpdateReady(PINNED_NOW)).resolves.toBe(true);

    expect(mockState.pending).toHaveLength(1);
    const [notice] = mockState.pending;
    expect(notice.identifier).toBe('update:u1');
    expect(notice.content.data).toEqual({ kind: 'update', updateId: 'u1', updateCreatedAt: NEWER });
    expect(notice.content.title).toBe(he['update.notice.title']);
    expect(notice.content.body).toBe(he['home.updateReady']);
    expect(notice.content.autoDismiss).toBe(true);
    expect(notice.content.sticky).toBe(false);
    expect(notice.content.categoryIdentifier).toBeUndefined();
    expect(notice.trigger).toBeNull();
    expect(mockSetChannel).not.toHaveBeenCalled();
    expect(StorageService.get(UPDATE_NOTIFIED_KEY)).toBe('u1');
  });

  it('2 on Android the notice goes to the system channel', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      await expect(notifyIfUpdateReady(PINNED_NOW)).resolves.toBe(true);
    } finally {
      restore.restore();
    }

    expect(pendingOf('update:u1')!.trigger).toEqual({ channelId: 'system' });
    expect(mockSetChannel).toHaveBeenCalledWith(
      'system',
      expect.objectContaining({ name: he['notifications.channelSystem'], importance: 'default' }),
    );
  });

  it('3 notifies once per update id', async () => {
    await expect(notifyIfUpdateReady(PINNED_NOW)).resolves.toBe(true);
    await expect(notifyIfUpdateReady(PINNED_NOW)).resolves.toBe(false);
    expect(pendingIds()).toEqual(['update:u1']);
    expect(mockSchedule).toHaveBeenCalledTimes(1);

    mockCheck.mockResolvedValue(AVAILABLE('u2'));
    await expect(notifyIfUpdateReady(PINNED_NOW)).resolves.toBe(true);
    expect(pendingIds()).toEqual(['update:u1', 'update:u2']);
    expect(StorageService.get(UPDATE_NOTIFIED_KEY)).toBe('u2');
  });

  it('3b a newer notice withdraws the previous one before it is presented', async () => {
    await notifyIfUpdateReady(PINNED_NOW);
    expect(mockDismiss).not.toHaveBeenCalled();

    mockCheck.mockResolvedValue(AVAILABLE('u2'));
    await expect(notifyIfUpdateReady(PINNED_NOW)).resolves.toBe(true);

    expect(mockDismiss.mock.calls.map(([id]) => id)).toEqual(['update:u1']);
    expect(mockDismiss.mock.invocationCallOrder[0]).toBeLessThan(mockSchedule.mock.invocationCallOrder[1]);
  });

  it('4 does nothing when the server has nothing newer', async () => {
    mockCheck.mockResolvedValue(NOTHING_NEWER);

    await expect(notifyIfUpdateReady(PINNED_NOW)).resolves.toBe(false);

    expect(mockState.pending).toEqual([]);
    expect(StorageService.get(UPDATE_NOTIFIED_KEY)).toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('5 respects the notifications switch and a denied permission, without consuming the update', async () => {
    useUserStore.getState().setNotificationsEnabled(false);
    await expect(notifyIfUpdateReady(PINNED_NOW)).resolves.toBe(false);
    expect(mockState.pending).toEqual([]);
    expect(StorageService.get(UPDATE_NOTIFIED_KEY)).toBeUndefined();

    useUserStore.getState().setNotificationsEnabled(true);
    useUserStore.getState().setNotificationPermission('denied');
    await expect(notifyIfUpdateReady(PINNED_NOW)).resolves.toBe(false);
    expect(mockState.pending).toEqual([]);
    expect(StorageService.get(UPDATE_NOTIFIED_KEY)).toBeUndefined();

    useUserStore.getState().setNotificationPermission('granted');
    await expect(notifyIfUpdateReady(PINNED_NOW)).resolves.toBe(true);
    expect(pendingIds()).toEqual(['update:u1']);
    expect(StorageService.get(UPDATE_NOTIFIED_KEY)).toBe('u1');
  });

  it('6 waits out a holy block', async () => {
    await expect(notifyIfUpdateReady(SHABBAT_MIDDAY)).resolves.toBe(false);
    expect(mockState.pending).toEqual([]);
    expect(StorageService.get(UPDATE_NOTIFIED_KEY)).toBeUndefined();

    await expect(notifyIfUpdateReady(SUNDAY_MIDDAY)).resolves.toBe(true);
    expect(pendingIds()).toEqual(['update:u1']);
    expect(StorageService.get(UPDATE_NOTIFIED_KEY)).toBe('u1');
  });

  it('6b waits out the quiet hours', async () => {
    useUserStore.getState().setQuietBefore({ enabled: true, minutes: 420 });

    await expect(notifyIfUpdateReady(PINNED_NOW)).resolves.toBe(false);
    expect(mockState.pending).toEqual([]);
    expect(StorageService.get(UPDATE_NOTIFIED_KEY)).toBeUndefined();

    await expect(notifyIfUpdateReady(at(JERUSALEM, '2026-11-11T07:00'))).resolves.toBe(true);
    expect(pendingIds()).toEqual(['update:u1']);
  });

  it('7 a notice for the running update, or an older one, is stale', async () => {
    expect(shouldSuppressForCompletion({ kind: 'update', updateId: 'running-id' })).toBe(true);
    expect(shouldSuppressForCompletion({ kind: 'update', updateId: 'u0', updateCreatedAt: OLDER })).toBe(true);
    expect(shouldSuppressForCompletion({ kind: 'update', updateId: 'u1', updateCreatedAt: NEWER })).toBe(false);
    expect(shouldSuppressForCompletion({ kind: 'update', updateId: 'u1' })).toBe(false);

    mockState.presented = [
      { request: { identifier: 'update:running-id', content: { data: { kind: 'update', updateId: 'running-id' } } } },
      {
        request: {
          identifier: 'update:u0',
          content: { data: { kind: 'update', updateId: 'u0', updateCreatedAt: OLDER } },
        },
      },
      {
        request: {
          identifier: 'update:u1',
          content: { data: { kind: 'update', updateId: 'u1', updateCreatedAt: NEWER } },
        },
      },
    ];
    await dismissCompletedPresentedNotifications();

    expect(mockDismiss.mock.calls.map(([id]) => id)).toEqual(['update:running-id', 'update:u0']);
  });

  it('8 the hourly background task presents the notice and survives a failed check', async () => {
    const task = (TaskManager.defineTask as jest.Mock).mock.calls.find(
      ([name]) => name === DAILY_REBUILD_TASK,
    )![1] as () => Promise<number>;

    await expect(task()).resolves.toBe(1);
    expect(pendingOf('update:u1')).toBeDefined();
    expect(StorageService.get(UPDATE_NOTIFIED_KEY)).toBe('u1');

    mockState.pending = [];
    StorageService.delete(UPDATE_NOTIFIED_KEY);
    mockCheck.mockRejectedValue(new Error('offline'));
    await expect(task()).resolves.toBe(1);
    expect(mockState.pending).toEqual([]);
    expect(StorageService.get(UPDATE_NOTIFIED_KEY)).toBeUndefined();
  });

  it('9 stays silent in development without asking the server', async () => {
    globals.__DEV__ = true;

    await expect(notifyIfUpdateReady(PINNED_NOW)).resolves.toBe(false);

    expect(mockCheck).not.toHaveBeenCalled();
    expect(mockState.pending).toEqual([]);
    expect(StorageService.get(UPDATE_NOTIFIED_KEY)).toBeUndefined();
  });
});
