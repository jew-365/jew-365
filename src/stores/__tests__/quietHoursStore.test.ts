jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
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

jest.mock('@/utils/afterPaint', () => ({
  afterPaint: (task: () => void) => {
    queueMicrotask(task);
    return { cancel: () => undefined };
  },
}));

import { useUserStore } from '../useUserStore';

const store = () => useUserStore.getState();

describe('quiet hours in the user store', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
  });

  it('1. starts with both bounds off at 07:00 and 22:00', () => {
    expect(store().quietBefore).toEqual({ enabled: false, minutes: 420 });
    expect(store().quietAfter).toEqual({ enabled: false, minutes: 1320 });
  });

  it('2. stores a valid bound on each side', () => {
    store().setQuietBefore({ enabled: true, minutes: 420 });
    store().setQuietAfter({ enabled: true, minutes: 1320 });

    expect(store().quietBefore).toEqual({ enabled: true, minutes: 420 });
    expect(store().quietAfter).toEqual({ enabled: true, minutes: 1320 });
  });

  it('3. refuses a last hour that leaves less than an hour open, and stores one that leaves an hour', () => {
    store().setQuietBefore({ enabled: true, minutes: 420 });
    const before = store();

    store().setQuietAfter({ enabled: true, minutes: 450 });
    expect(store()).toBe(before);

    store().setQuietAfter({ enabled: true, minutes: 480 });
    expect(store().quietAfter).toEqual({ enabled: true, minutes: 480 });
  });

  it('4. refuses a first hour that leaves less than an hour before midnight, and any minute outside the day', () => {
    const start = store();

    store().setQuietBefore({ enabled: true, minutes: 1381 });
    expect(store()).toBe(start);

    store().setQuietBefore({ enabled: true, minutes: 1380 });
    expect(store().quietBefore).toEqual({ enabled: true, minutes: 1380 });

    const stored = store();
    store().setQuietBefore({ enabled: true, minutes: 1440 });
    expect(store()).toBe(stored);
    store().setQuietBefore({ enabled: true, minutes: 7.5 });
    expect(store()).toBe(stored);
  });

  it('5. always allows switching a bound off', () => {
    store().setQuietBefore({ enabled: true, minutes: 420 });
    store().setQuietAfter({ enabled: true, minutes: 480 });

    store().setQuietBefore({ enabled: false, minutes: 420 });

    expect(store().quietBefore).toEqual({ enabled: false, minutes: 420 });
  });

  it('6. reset restores both defaults', () => {
    store().setQuietBefore({ enabled: true, minutes: 600 });
    store().setQuietAfter({ enabled: true, minutes: 1200 });

    store().reset();

    expect(store().quietBefore).toEqual({ enabled: false, minutes: 420 });
    expect(store().quietAfter).toEqual({ enabled: false, minutes: 1320 });
  });

  describe('7. merge of a saved payload', () => {
    const merge = useUserStore.persist.getOptions().merge!;
    const merged = (saved: object) => merge(saved, store());

    it('gives the defaults to a payload that predates the fields', () => {
      const state = merged({});

      expect(state.quietBefore).toEqual({ enabled: false, minutes: 420 });
      expect(state.quietAfter).toEqual({ enabled: false, minutes: 1320 });
    });

    it('keeps a saved bound', () => {
      expect(merged({ quietBefore: { enabled: true, minutes: 360 } }).quietBefore).toEqual({
        enabled: true,
        minutes: 360,
      });
    });

    it('repairs a minute outside the day to the default minute', () => {
      expect(merged({ quietBefore: { enabled: true, minutes: 9999 } }).quietBefore).toEqual({
        enabled: true,
        minutes: 420,
      });
    });

    it('switches both bounds off, keeping their minutes, for a pair that leaves less than an hour open', () => {
      const state = merged({
        quietBefore: { enabled: true, minutes: 600 },
        quietAfter: { enabled: true, minutes: 630 },
      });

      expect(state.quietBefore).toEqual({ enabled: false, minutes: 600 });
      expect(state.quietAfter).toEqual({ enabled: false, minutes: 630 });
    });
  });
});
