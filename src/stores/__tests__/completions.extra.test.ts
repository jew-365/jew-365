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

import { archiveMarkedDays, isArchivedDay, pruneCheckIns, useCompletionsStore, dateKey } from '../useCompletionsStore';

describe('CompletionsStore extras', () => {
  beforeEach(() => {
    useCompletionsStore.setState({ completions: {}, skipped: {} });
  });

  it('4.x dateKey produces YYYY-MM-DD locale day boundary', () => {
    const d = new Date(2026, 3, 23, 14, 0, 0); // local Apr 23 2026
    expect(dateKey(d)).toBe('2026-04-23');
  });

  it('4.x dateKey pads month + day with leading zero', () => {
    const jan = new Date(2026, 0, 5); // Jan 5
    expect(dateKey(jan)).toBe('2026-01-05');
  });

  it('4.x countForDate returns count of done', () => {
    const d = new Date('2026-04-23T10:00:00Z');
    useCompletionsStore.getState().markDone('tefillin', d);
    useCompletionsStore.getState().markDone('shacharit', d);
    expect(useCompletionsStore.getState().countForDate(d)).toBe(2);
  });

  it('4.x markDone idempotent — same day same id only counts once', () => {
    const d = new Date('2026-04-23T10:00:00Z');
    useCompletionsStore.getState().markDone('tefillin', d);
    useCompletionsStore.getState().markDone('tefillin', d);
    expect(useCompletionsStore.getState().countForDate(d)).toBe(1);
  });

  it('4.x unmark on missing id no-op', () => {
    const d = new Date('2026-04-23T10:00:00Z');
    expect(() => useCompletionsStore.getState().unmark('nope', d)).not.toThrow();
    expect(useCompletionsStore.getState().countForDate(d)).toBe(0);
  });

  it('4.x completionsForDate returns map of id→ts', () => {
    const d = new Date('2026-04-23T10:00:00Z');
    useCompletionsStore.getState().markDone('tefillin', d);
    const m = useCompletionsStore.getState().completionsForDate(d);
    expect(m).toHaveProperty('tefillin');
    expect(typeof m.tefillin).toBe('number');
  });

  it('4.x markSkipped removes done state for same day', () => {
    const d = new Date('2026-04-23T10:00:00Z');
    useCompletionsStore.getState().markDone('tefillin', d);
    useCompletionsStore.getState().markSkipped('tefillin', d);
    expect(useCompletionsStore.getState().isDone('tefillin', d)).toBe(false);
    expect(useCompletionsStore.getState().isSkipped('tefillin', d)).toBe(true);
  });

  it('16.9 100-day history scales (no exception, finite memory)', () => {
    const baseTime = new Date('2026-01-01T10:00:00Z').getTime();
    for (let i = 0; i < 100; i++) {
      const d = new Date(baseTime + i * 86400_000);
      useCompletionsStore.getState().markDone('tefillin', d);
    }
    const all = useCompletionsStore.getState().completions;
    expect(Object.keys(all).length).toBe(100);
  });
});

describe('check-ins and the archive of kept days', () => {
  beforeEach(() => {
    useCompletionsStore.getState().reset();
  });

  it('records a finished check-in once and resets it with the store', () => {
    useCompletionsStore.getState().finishCheckIn('2026-11-14');
    const first = useCompletionsStore.getState().checkIns['2026-11-14'];
    expect(first).toBeGreaterThan(0);
    useCompletionsStore.getState().finishCheckIn('2026-11-14');
    expect(useCompletionsStore.getState().checkIns['2026-11-14']).toBe(first);
    useCompletionsStore.getState().reset();
    expect(useCompletionsStore.getState().checkIns).toEqual({});
    expect(useCompletionsStore.getState().archivedDays).toEqual([]);
  });

  it('folds the days retention drops into runs, merging touching ones', () => {
    const today = new Date(2026, 10, 15);
    const completions = {
      '2025-01-01': { a: 1 },
      '2025-01-02': { a: 1 },
      '2025-01-04': { a: 1 },
      '2025-01-05': {},
      '2026-11-15': { a: 1 },
    };
    const archive = archiveMarkedDays([['2024-12-20', '2024-12-31']], completions, today);
    expect(archive).toEqual([
      ['2024-12-20', '2025-01-02'],
      ['2025-01-04', '2025-01-04'],
    ]);
    expect(isArchivedDay(archive, '2024-12-25')).toBe(true);
    expect(isArchivedDay(archive, '2025-01-03')).toBe(false);
    expect(isArchivedDay(archive, '2025-01-05')).toBe(false);
    // Nothing old enough: the archive is returned untouched.
    expect(archiveMarkedDays(archive, { '2026-11-15': { a: 1 } }, today)).toBe(archive);
  });

  it('prunes finished check-ins with the same retention as the completions', () => {
    const today = new Date(2026, 10, 15);
    const checkIns = { '2024-01-06': 1, '2026-11-14': 2 };
    expect(pruneCheckIns(checkIns, today)).toEqual({ '2026-11-14': 2 });
    expect(pruneCheckIns({ '2026-11-14': 2 }, today)).toEqual({ '2026-11-14': 2 });
  });
});
