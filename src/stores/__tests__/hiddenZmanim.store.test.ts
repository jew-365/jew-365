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
import { ARC_ZMANIM } from '@/utils/zmanIds';

const user = () => useUserStore.getState();

describe('the zmanim home shows', () => {
  beforeEach(() => user().reset());

  it('shows every zman by default', () => {
    expect(user().hiddenZmanim).toEqual([]);
  });

  it('hides and shows a zman, and a reset shows them all again', () => {
    user().setZmanShown('plag', false);
    user().setZmanShown('alot', false);
    expect(user().hiddenZmanim).toEqual(['alot', 'plag']);
    user().setZmanShown('alot', true);
    expect(user().hiddenZmanim).toEqual(['plag']);
    user().reset();
    expect(user().hiddenZmanim).toEqual([]);
  });

  it('refuses to hide the last zman shown without firing a subscriber', () => {
    ARC_ZMANIM.slice(1).forEach((id) => user().setZmanShown(id, false));
    expect(user().hiddenZmanim).toHaveLength(ARC_ZMANIM.length - 1);
    const listener = jest.fn();
    const unsubscribe = useUserStore.subscribe(listener);
    user().setZmanShown('alot', false);
    user().setZmanShown('plag', false);
    unsubscribe();
    expect(listener).not.toHaveBeenCalled();
    expect(user().hiddenZmanim).not.toContain('alot');
  });

  it('merges a saved list clean: none for an older payload, unknown ids dropped, never every one', () => {
    const merge = useUserStore.persist.getOptions().merge!;
    expect(merge({}, user()).hiddenZmanim).toEqual([]);
    expect(merge({ hiddenZmanim: ['tzeit', 'gone', 'netz'] }, user()).hiddenZmanim).toEqual(['netz', 'tzeit']);
    expect(merge({ hiddenZmanim: 'plag' }, user()).hiddenZmanim).toEqual([]);
    expect(merge({ hiddenZmanim: [...ARC_ZMANIM] }, user()).hiddenZmanim).toEqual([]);
  });
});
