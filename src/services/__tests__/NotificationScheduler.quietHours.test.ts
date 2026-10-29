jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

jest.mock('@/services/notifications/ids', () => ({
  ...jest.requireActual('@/services/notifications/ids'),
  HORIZON_MAX_DAYS: 2,
}));
jest.mock('@/services/notifications/planners/horizonEnd', () => ({ planHorizonEnd: () => [] }));

type ScheduleInput = {
  identifier: string;
  content: {
    title?: string;
    body?: string;
    data: Record<string, unknown>;
    categoryIdentifier?: string;
  };
  trigger?: { type: string; date: Date; channelId?: string };
};

const mockState: { pending: ScheduleInput[] } = { pending: [] };
const mockWithoutHash = (input: ScheduleInput): ScheduleInput => ({
  ...input,
  content: {
    ...input.content,
    data: Object.fromEntries(Object.entries(input.content.data).filter(([key]) => key !== 'contentHash')),
  },
});
const mockSchedule = jest.fn(async (input: ScheduleInput) => {
  mockState.pending = mockState.pending.filter((p) => p.identifier !== input.identifier);
  mockState.pending.push(input);
  return input.identifier;
});

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (i: unknown) => mockSchedule(mockWithoutHash(i as ScheduleInput)),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {
    mockState.pending = [];
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockState.pending = mockState.pending.filter((p) => p.identifier !== id);
  }),
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

import { HDate, months } from '@hebcal/core';
import { NotificationScheduler, initNotificationHandlers } from '../NotificationScheduler';
import { useUserStore } from '@/stores/useUserStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { CITIES } from '@/data/cities';
import { at } from '@/testing/zmanim';

const JERUSALEM = CITIES[0];
const THURSDAY = at(JERUSALEM, '2026-10-08T12:00');
const TISHREI_30 = new HDate(30, months.TISHREI, 5787).abs();

beforeAll(() => {
  jest.useFakeTimers({
    now: THURSDAY,
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
afterEach(() => jest.setSystemTime(THURSDAY));

const pendingOf = (identifier: string) => mockState.pending.find((p) => p.identifier === identifier);
const rebuildAt = async (wallClock: string) => {
  jest.setSystemTime(at(JERUSALEM, wallClock));
  await NotificationScheduler.rebuild();
};

describe('NotificationScheduler quiet hours', () => {
  beforeEach(() => {
    mockState.pending = [];
    mockSchedule.mockClear();
    useCompletionsStore.setState({ completions: {}, skipped: {}, checkIns: {}, archivedDays: [] });
    useUserStore.getState().reset();
    useUserStore.getState().setNotificationPermission('granted');
    useUserStore.getState().setLocation(JERUSALEM);
    const disabled = Object.fromEntries(
      Object.keys(useMitzvotStore.getState().activeMitzvot).map((id) => [id, { enabled: false }]),
    );
    useMitzvotStore.setState({ activeMitzvot: disabled });
  });

  it('1 rebuilds when a bound changes, not when the setter refuses, and the teardown unsubscribes', () => {
    const rebuild = jest.spyOn(NotificationScheduler, 'rebuild').mockResolvedValue();
    const teardown = initNotificationHandlers();
    rebuild.mockClear();

    useUserStore.getState().setQuietBefore({ enabled: true, minutes: 420 });
    expect(rebuild).toHaveBeenCalledTimes(1);
    useUserStore.getState().setQuietAfter({ enabled: true, minutes: 1320 });
    expect(rebuild).toHaveBeenCalledTimes(2);
    useUserStore.getState().setQuietAfter({ enabled: true, minutes: 450 });
    expect(rebuild).toHaveBeenCalledTimes(2);

    teardown();
    useUserStore.getState().setQuietBefore({ enabled: false, minutes: 420 });
    expect(rebuild).toHaveBeenCalledTimes(2);
    rebuild.mockRestore();
  });

  it('2 schedules a Rosh Chodesh notice at the first open hour, and keeps it on a rebuild after the planned time', async () => {
    jest.setSystemTime(at(JERUSALEM, '2026-10-11T00:30'));
    useUserStore.getState().setRoshChodeshEnabled(true);
    useUserStore.getState().setQuietBefore({ enabled: true, minutes: 480 });

    await NotificationScheduler.rebuild();
    const notice = `roshChodesh:${TISHREI_30}:day`;
    expect(pendingOf(notice)!.trigger!.date.getTime()).toBe(at(JERUSALEM, '2026-10-11T08:00').getTime());

    await rebuildAt('2026-10-11T07:30');
    expect(pendingOf(notice)!.trigger!.date.getTime()).toBe(at(JERUSALEM, '2026-10-11T08:00').getTime());
  });
});
