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

import { useMitzvotStore } from '../useMitzvotStore';
import type { Reminder } from '@/types/mitzvah';

const user = () => useUserStore.getState();
const mitzvot = () => useMitzvotStore.getState();

describe('the app’s nagging level', () => {
  beforeEach(() => user().reset());

  it('starts at level 1', () => {
    expect(user().nagLevel).toBe(1);
  });

  it('stores each of the four levels', () => {
    for (const level of [1, 2, 3, 4] as const) {
      user().setNagLevel(level);
      expect(user().nagLevel).toBe(level);
    }
  });

  it('refuses anything else without firing a subscriber', () => {
    user().setNagLevel(3);
    const listener = jest.fn();
    const unsubscribe = useUserStore.subscribe(listener);
    for (const bad of [0, 5, 2.5, '2', null]) user().setNagLevel(bad as never);
    unsubscribe();
    expect(listener).not.toHaveBeenCalled();
    expect(user().nagLevel).toBe(3);
  });

  it('returns to level 1 on reset', () => {
    user().setNagLevel(4);
    user().reset();
    expect(user().nagLevel).toBe(1);
  });

  it('reads level 1 for an older payload and repairs a bad saved value', () => {
    const merge = useUserStore.persist.getOptions().merge!;
    expect(merge({}, user()).nagLevel).toBe(1);
    expect(merge({ nagLevel: 4 }, user()).nagLevel).toBe(4);
    expect(merge({ nagLevel: 7 }, user()).nagLevel).toBe(1);
    expect(merge({ nagLevel: 'loud' }, user()).nagLevel).toBe(1);
  });
});

describe('a mitzvah’s nagging level', () => {
  const custom: Reminder[] = [{ anchor: 'start', offsetMin: 10, label: 'x' }];

  beforeEach(() => mitzvot().reset());

  it('is absent, like the app, by default', () => {
    expect(mitzvot().activeMitzvot.shacharit.nagLevel).toBeUndefined();
  });

  it('writes an override and deletes it with null, keeping the rest of the entry', () => {
    mitzvot().setReminders('shacharit', custom);
    mitzvot().setNagLevel('shacharit', 3);
    expect(mitzvot().activeMitzvot.shacharit).toMatchObject({ enabled: true, customReminders: custom, nagLevel: 3 });

    mitzvot().setNagLevel('shacharit', null);
    expect(mitzvot().activeMitzvot.shacharit).toEqual({ enabled: true, customReminders: custom });
    expect('nagLevel' in mitzvot().activeMitzvot.shacharit).toBe(false);
  });

  it('creates an off entry for an id the map lacks', () => {
    mitzvot().setNagLevel('custom_1_ab', 2);
    expect(mitzvot().activeMitzvot.custom_1_ab).toEqual({ enabled: false, nagLevel: 2 });
  });

  it('refuses a bad level and a change to the same value without firing a subscriber', () => {
    mitzvot().setNagLevel('mincha', 2);
    const listener = jest.fn();
    const unsubscribe = useMitzvotStore.subscribe(listener);
    for (const bad of [0, 5, 2.5, '2']) mitzvot().setNagLevel('mincha', bad as never);
    mitzvot().setNagLevel('mincha', 2);
    mitzvot().setNagLevel('maariv', null);
    unsubscribe();
    expect(listener).not.toHaveBeenCalled();
    expect(mitzvot().activeMitzvot.mincha.nagLevel).toBe(2);
  });

  it('keeps the level through resetToDefault and drops it with removeMitzvah', () => {
    mitzvot().setReminders('shacharit', custom);
    mitzvot().setNagLevel('shacharit', 4);
    mitzvot().resetToDefault('shacharit');
    expect(mitzvot().activeMitzvot.shacharit.customReminders).toBeUndefined();
    expect(mitzvot().activeMitzvot.shacharit.nagLevel).toBe(4);

    mitzvot().removeMitzvah('shacharit');
    expect(mitzvot().activeMitzvot.shacharit).toBeUndefined();
  });

  it('forgets every override on reset', () => {
    mitzvot().setNagLevel('shacharit', 4);
    mitzvot().reset();
    expect(mitzvot().activeMitzvot.shacharit.nagLevel).toBeUndefined();
  });

  it('keeps a saved valid level and drops an invalid one in the merge', () => {
    const merge = useMitzvotStore.persist.getOptions().merge!;
    const merged = merge(
      {
        activeMitzvot: {
          shacharit: { enabled: true, nagLevel: 3 },
          mincha: { enabled: true, nagLevel: 9 },
          maariv: { enabled: true, nagLevel: 'x' },
        },
      },
      mitzvot(),
    );
    expect(merged.activeMitzvot.shacharit).toEqual({ enabled: true, nagLevel: 3 });
    expect(merged.activeMitzvot.mincha).toEqual({ enabled: true });
    expect(merged.activeMitzvot.maariv).toEqual({ enabled: true });
  });
});
