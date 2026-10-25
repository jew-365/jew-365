jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

type Presented = {
  date?: number;
  request: { identifier: string; content: { data: Record<string, unknown> } };
};

const mockState: { presented: Presented[] } = { presented: [] };
const mockCancelAll = jest.fn(async () => {});
const mockDismiss = jest.fn(async (_id: string) => {});

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(async (input: { identifier: string }) => input.identifier),
  cancelAllScheduledNotificationsAsync: () => mockCancelAll(),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  getPresentedNotificationsAsync: jest.fn(async () => mockState.presented),
  dismissNotificationAsync: (id: string) => mockDismiss(id),
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

import * as TaskManager from 'expo-task-manager';
import { HDate } from '@hebcal/core';
import {
  DAILY_REBUILD_TASK,
  LAST_REBUILD_KEY,
  NotificationScheduler,
  dismissCompletedPresentedNotifications,
  initNotificationHandlers,
} from '../NotificationScheduler';
import { StorageService } from '@/services/StorageService';
import { useUserStore } from '@/stores/useUserStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useCompletionsStore, dateKey } from '@/stores/useCompletionsStore';
import { CITIES } from '@/data/cities';
import { appDayEnd } from '@/utils/locationDay';
import { at } from '@/testing/zmanim';

const JERUSALEM = CITIES[0];
const PINNED_NOW = at(JERUSALEM, '2026-11-11T06:00'); // a plain Wednesday in Cheshvan
const MINUTE = 60_000;
const later = (instant: Date, minutes: number) => new Date(instant.getTime() + minutes * MINUTE);
const YESTERDAY_END = appDayEnd(new Date(2026, 10, 10), JERUSALEM);
const TODAY_END = appDayEnd(new Date(2026, 10, 11), JERUSALEM);
const ABS = new HDate(new Date(2026, 10, 9)).abs();

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

function reminder(mitzvahId: string, key: string, shownAt?: Date, index = '0'): Presented {
  return {
    date: shownAt?.getTime(),
    request: {
      identifier: `${mitzvahId}__${key}__${index}`,
      content: { data: { mitzvahId, dateKey: key, reminderIndex: Number.parseInt(index, 10) } },
    },
  };
}

function notice(identifier: string, data: Record<string, unknown>): Presented {
  return {
    date: at(JERUSALEM, '2026-11-09T20:00').getTime(),
    request: { identifier, content: { data } },
  };
}

const dismissed = () => mockDismiss.mock.calls.map(([id]) => id).sort();

const settled = async () => {
  await new Promise((resolve) => setImmediate(resolve));
  while (NotificationScheduler.inFlight) await NotificationScheduler.inFlight;
  await new Promise((resolve) => setImmediate(resolve));
};

const runDailyTask = () => {
  const [, body] = (TaskManager.defineTask as jest.Mock).mock.calls.find(([name]) => name === DAILY_REBUILD_TASK)!;
  return (body as () => Promise<number>)();
};

describe('withdrawing reminders of an ended day', () => {
  beforeEach(() => {
    jest.setSystemTime(PINNED_NOW);
    mockState.presented = [];
    mockDismiss.mockClear();
    mockCancelAll.mockClear();
    useCompletionsStore.setState({ completions: {}, skipped: {}, checkIns: {}, archivedDays: [] });
    useUserStore.getState().reset();
    useUserStore.getState().setLocation(JERUSALEM);
    const disabled = Object.fromEntries(
      Object.keys(useMitzvotStore.getState().activeMitzvot).map((id) => [id, { enabled: false }]),
    );
    useMitzvotStore.setState({ activeMitzvot: disabled });
  });

  it("yesterday ends at Wednesday's alot and today at Thursday's", () => {
    expect(YESTERDAY_END.getTime()).toBeGreaterThan(at(JERUSALEM, '2026-11-11T04:00').getTime());
    expect(YESTERDAY_END.getTime()).toBeLessThan(at(JERUSALEM, '2026-11-11T05:30').getTime());
    expect(TODAY_END.getTime()).toBeGreaterThan(at(JERUSALEM, '2026-11-12T04:00').getTime());
    expect(TODAY_END.getTime()).toBeLessThan(at(JERUSALEM, '2026-11-12T05:30').getTime());
  });

  it("a foreground sweep after yesterday's app day withdraws yesterday's reminders and keeps today's", async () => {
    mockState.presented = [
      reminder('mincha', '2026-11-10', at(JERUSALEM, '2026-11-10T16:30')),
      reminder('maariv', '2026-11-10', at(JERUSALEM, '2026-11-10T20:00')),
      reminder('tefillin', '2026-11-11', at(JERUSALEM, '2026-11-11T05:50')),
      reminder('shacharit', '2026-11-11'),
    ];

    await dismissCompletedPresentedNotifications(PINNED_NOW);

    expect(dismissed()).toEqual(['maariv__2026-11-10__0', 'mincha__2026-11-10__0']);
  });

  it("keeps yesterday's reminders until the alot that ends yesterday", async () => {
    mockState.presented = [reminder('maariv', '2026-11-10', at(JERUSALEM, '2026-11-10T20:00'))];

    await dismissCompletedPresentedNotifications(later(YESTERDAY_END, -1));
    expect(mockDismiss).not.toHaveBeenCalled();

    await dismissCompletedPresentedNotifications(YESTERDAY_END);
    expect(dismissed()).toEqual(['maariv__2026-11-10__0']);
  });

  it("keeps a reminder shown after its window's day through the app day it was shown on", async () => {
    const shown = later(YESTERDAY_END, 30);
    mockState.presented = [
      reminder('custom_follow', '2026-11-10', shown),
      reminder('kiddush_levana', '2026-11-01', shown, '1.1'),
    ];

    await dismissCompletedPresentedNotifications(later(YESTERDAY_END, 60));
    expect(mockDismiss).not.toHaveBeenCalled();

    await dismissCompletedPresentedNotifications(TODAY_END);
    expect(dismissed()).toEqual(['custom_follow__2026-11-10__0', 'kiddush_levana__2026-11-01__1.1']);
  });

  it('reads a delivery date given in seconds, as iOS reports it', async () => {
    mockState.presented = [
      {
        ...reminder('custom_follow', '2026-11-10'),
        date: Math.floor(later(YESTERDAY_END, 30).getTime() / 1000),
      },
    ];

    await dismissCompletedPresentedNotifications(later(YESTERDAY_END, 60));

    expect(mockDismiss).not.toHaveBeenCalled();
  });

  it('leaves every other kind to its own rule', async () => {
    mockState.presented = [
      notice(`hilula:${ABS}:evening`, { kind: 'hilula', hilula: { day: ABS, when: 'evening' } }),
      notice(`roshChodesh:${ABS}:day`, { kind: 'roshChodesh', roshChodesh: { day: ABS, when: 'day' } }),
      notice('report:2026-11-07', { kind: 'report', report: { week: '2026-11-07' } }),
      notice('blockNotice:2026-11-07', { kind: 'blockNotice' }),
      notice(`taharah:perisha:${ABS}:night`, {
        kind: 'taharah',
        taharah: { task: 'perisha', day: ABS, onah: 'night' },
      }),
    ];

    await dismissCompletedPresentedNotifications(PINNED_NOW);

    expect(mockDismiss).not.toHaveBeenCalled();
  });

  it('never reads a notice as a mitzvah reminder, even when its data carries a mitzvah target', async () => {
    mockState.presented = [
      notice(`hilula:${ABS}:evening`, { kind: 'hilula', mitzvahId: 'maariv', dateKey: '2026-11-10' }),
    ];

    await dismissCompletedPresentedNotifications(PINNED_NOW);

    expect(mockDismiss).not.toHaveBeenCalled();
  });

  it('the launch path withdraws them', async () => {
    mockState.presented = [
      reminder('maariv', '2026-11-10', at(JERUSALEM, '2026-11-10T20:00')),
      reminder('tefillin', '2026-11-11', at(JERUSALEM, '2026-11-11T05:50')),
    ];

    const teardown = initNotificationHandlers();
    try {
      await settled();
      expect(dismissed()).toEqual(['maariv__2026-11-10__0']);
    } finally {
      teardown();
    }
  });

  it('the hourly task withdraws them on every run, also when no rebuild is due, and leaves the other rules to the launch sweep', async () => {
    StorageService.set(LAST_REBUILD_KEY, dateKey(new Date()));
    useCompletionsStore.setState({ checkIns: { '2026-11-07': 1 } });
    mockState.presented = [
      reminder('maariv', '2026-11-10', at(JERUSALEM, '2026-11-10T20:00')),
      reminder('tefillin', '2026-11-11', at(JERUSALEM, '2026-11-11T05:50')),
      notice('checkin:2026-11-07:2', { kind: 'checkin', blockId: '2026-11-07' }),
    ];

    await expect(runDailyTask()).resolves.toBe(1);

    expect(dismissed()).toEqual(['maariv__2026-11-10__0']);
    expect(mockCancelAll).not.toHaveBeenCalled();
  });
});
