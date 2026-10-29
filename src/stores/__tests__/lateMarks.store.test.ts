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

import {
  EMPTY_MARK_COUNTS,
  RETENTION_DAYS,
  archiveMarkCounts,
  dateKey,
  lateMarksOf,
  useCompletionsStore,
} from '../useCompletionsStore';

const DAY = new Date(2026, 4, 6);
const KEY = '2026-05-06';
const TAPPED = 1_778_000_000_000;

describe('late marks in the completions store', () => {
  beforeEach(() => {
    useCompletionsStore.getState().reset();
    jest.spyOn(Date, 'now').mockReturnValue(TAPPED);
  });

  afterEach(() => jest.restoreAllMocks());

  it('files a late mark as done and as late, both at the tap', () => {
    useCompletionsStore.getState().markDone('shacharit', DAY, { late: true });
    const { completions, late } = useCompletionsStore.getState();
    expect(completions[KEY]).toEqual({ shacharit: TAPPED });
    expect(late[KEY]).toEqual({ shacharit: TAPPED });
  });

  it('files a mark in time at the given instant and never as late', () => {
    useCompletionsStore.getState().markDone('shacharit', DAY, { at: TAPPED - 3_600_000 });
    const { completions, late } = useCompletionsStore.getState();
    expect(completions[KEY]).toEqual({ shacharit: TAPPED - 3_600_000 });
    expect(late).toEqual({});
  });

  it('drops the late flag when the day is marked again in time, skipped or unmarked', () => {
    const store = useCompletionsStore.getState();
    store.markDone('shacharit', DAY, { late: true });
    store.markDone('shacharit', DAY);
    expect(useCompletionsStore.getState().late).toEqual({});

    store.markDone('mincha', DAY, { late: true });
    store.markSkipped('mincha', DAY);
    expect(useCompletionsStore.getState().late).toEqual({});
    expect(useCompletionsStore.getState().completions[KEY]).toEqual({ shacharit: TAPPED });

    store.markDone('maariv', DAY, { late: true });
    store.unmark('maariv', DAY);
    expect(useCompletionsStore.getState().late).toEqual({});
  });

  it('keeps the other mitzvot of the day late when one is unmarked', () => {
    const store = useCompletionsStore.getState();
    store.markDone('shacharit', DAY, { late: true });
    store.markDone('mincha', DAY, { late: true });
    store.unmark('shacharit', DAY);
    expect(useCompletionsStore.getState().late).toEqual({ [KEY]: { mincha: TAPPED } });
  });

  it('clears the late marks on reset', () => {
    useCompletionsStore.getState().markDone('shacharit', DAY, { late: true });
    useCompletionsStore.getState().reset();
    expect(useCompletionsStore.getState().late).toEqual({});
  });

  it('keeps only late marks that have a done mark beside them', () => {
    expect(
      lateMarksOf(
        { [KEY]: { shacharit: 1, mincha: 2 }, '2026-05-05': { maariv: 3 } },
        { [KEY]: { shacharit: 1 }, '2026-05-05': {} },
      ),
    ).toEqual({ [KEY]: { shacharit: 1 } });
  });

  it('reads an older payload without late marks as none, and drops orphaned and expired ones on hydrate', () => {
    const merge = useCompletionsStore.persist.getOptions().merge!;
    const current = useCompletionsStore.getState();
    expect(merge({ completions: { [KEY]: { shacharit: 1 } } }, current).late).toEqual({});

    const today = new Date();
    const expired = dateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - RETENTION_DAYS - 5));
    const recent = dateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2));
    const merged = merge(
      {
        completions: { [recent]: { shacharit: 1 }, [expired]: { shacharit: 1 } },
        late: { [recent]: { shacharit: 1, mincha: 1 }, [expired]: { shacharit: 1 } },
      },
      current,
    );
    expect(merged.late).toEqual({ [recent]: { shacharit: 1 } });
    expect(merged.archivedMarks.total).toBe(0);
  });

  it('never archives a late mark as a mark', () => {
    const counts = archiveMarkCounts(
      EMPTY_MARK_COUNTS,
      { '2020-01-01': { shacharit: 1, mincha: 1 } },
      new Date(2026, 4, 6),
      { '2020-01-01': { mincha: 1 } },
    );
    expect(counts).toEqual({ lastKey: '2020-01-01', total: 1, byMitzvah: { shacharit: 1 } });
  });
});
