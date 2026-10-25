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
  };
  trigger?: { type: string; date: Date; channelId?: string };
};

const mockState: { pending: ScheduleInput[] } = { pending: [] };
const mockSchedule = jest.fn(async (input: ScheduleInput) => {
  mockState.pending = mockState.pending.filter((p) => p.identifier !== input.identifier);
  mockState.pending.push(input);
  return input.identifier;
});

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (i: unknown) => mockSchedule(i as ScheduleInput),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {
    mockState.pending = [];
  }),
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

import { HDate, months } from '@hebcal/core';
import { DateTime } from 'luxon';
import { NotificationScheduler, initNotificationHandlers } from '../NotificationScheduler';
import { useUserStore } from '@/stores/useUserStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { CITIES } from '@/data/cities';
import { at, zmanimFor } from '@/testing/zmanim';
import { formatDate, t } from '@/i18n';

const JERUSALEM = CITIES[0];
const PINNED_NOW = at(JERUSALEM, '2026-10-12T06:00'); // Monday, 1 Cheshvan 5787

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

const shkiaOn = (iso: string) => zmanimFor(at(JERUSALEM, `${iso}T12:00`), JERUSALEM).shkia;
const hilulaPending = () => mockState.pending.filter((p) => p.identifier.startsWith('hilula:'));
const pendingOf = (identifier: string) => mockState.pending.find((p) => p.identifier === identifier);
const weekday = (iso: string) => formatDate(DateTime.fromISO(iso), 'cccc', 'he');

const CHESHVAN_3 = new HDate(3, months.CHESHVAN, 5787).abs(); // Wednesday 2026-10-14
const RUZHIN_AND_OVADIA = 'רבי ישראל מרוז׳ין, הרב עובדיה יוסף';

describe('NotificationScheduler hilula notices', () => {
  beforeEach(() => {
    mockState.pending = [];
    mockSchedule.mockClear();
    useCompletionsStore.setState({ completions: {}, skipped: {}, checkIns: {}, archivedDays: [] });
    useUserStore.getState().reset();
    useUserStore.getState().setNotificationPermission('granted');
    useUserStore.getState().setLocation(JERUSALEM);
    useUserStore.getState().setHilulotEnabled(true);
    const disabled = Object.fromEntries(
      Object.keys(useMitzvotStore.getState().activeMitzvot).map((id) => [id, { enabled: false }]),
    );
    useMitzvotStore.setState({ activeMitzvot: disabled });
  });

  it('1 schedules nothing while the setting is off', async () => {
    useUserStore.getState().setHilulotEnabled(false);
    await NotificationScheduler.rebuild();
    expect(hilulaPending()).toEqual([]);
  });

  it('2 notifies at the shkia a day before the date opens and at the shkia that opens it, with no mark-done button', async () => {
    await NotificationScheduler.rebuild();

    expect(hilulaPending().map((p) => p.identifier)).toEqual([
      `hilula:${CHESHVAN_3}:before`,
      `hilula:${CHESHVAN_3}:evening`,
    ]);

    const before = pendingOf(`hilula:${CHESHVAN_3}:before`)!;
    expect(before.trigger!.date.getTime()).toBe(shkiaOn('2026-10-12').getTime());
    expect(before.trigger!.channelId).toBe('hilulot');
    expect(before.content.title).toBe(t('hilulot.notice.before.title', { names: RUZHIN_AND_OVADIA }));
    expect(before.content.body).toBe(t('hilulot.notice.before.body', { date: 'ג׳ חשון' }));
    expect(before.content.categoryIdentifier).toBeUndefined();
    expect(before.content.data).toEqual({ kind: 'hilula', hilula: { day: CHESHVAN_3, when: 'before' } });

    const evening = pendingOf(`hilula:${CHESHVAN_3}:evening`)!;
    expect(evening.trigger!.date.getTime()).toBe(shkiaOn('2026-10-13').getTime());
    expect(evening.content.title).toBe(t('hilulot.notice.evening.title', { names: RUZHIN_AND_OVADIA }));
    expect(evening.content.body).toBe(t('hilulot.notice.evening.body', { date: 'ג׳ חשון' }));
    expect(evening.content.categoryIdentifier).toBeUndefined();
    expect(evening.trigger!.channelId).toBe('hilulot');
  });

  it('3 drops a notice whose shkia has passed', async () => {
    jest.setSystemTime(at(JERUSALEM, '2026-10-12T21:00'));
    await NotificationScheduler.rebuild();
    expect(hilulaPending().map((p) => p.identifier)).toEqual([`hilula:${CHESHVAN_3}:evening`]);
  });

  it('4 names the hilulot in English in the English UI', async () => {
    useUserStore.getState().setLanguage('en');
    await NotificationScheduler.rebuild();
    const before = pendingOf(`hilula:${CHESHVAN_3}:before`)!;
    expect(before.content.title).toBe('Tomorrow evening: hilula of Rebbe Yisrael of Ruzhin, Rabbi Ovadia Yosef');
    expect(before.content.body).toBe('The hilula, 3rd of Cheshvan, begins tomorrow at sunset.');
  });

  describe('Shabbat', () => {
    // 7 Cheshvan 5787 opens at Saturday's shkia: the notice a day before falls on Friday after
    // candle lighting and the evening one before tzeit, both inside the block.
    beforeEach(() => jest.setSystemTime(at(JERUSALEM, '2026-10-16T06:00')));

    it('5 fires nothing inside the block and names the hilula in the pre-block notice', async () => {
      await NotificationScheduler.rebuild();

      expect(hilulaPending()).toEqual([]);
      const notice = pendingOf('blockNotice:2026-10-17')!;
      expect(notice.content.body!.split('\n')).toContain(
        t('holyBlock.notice.hilulaOn', { names: 'רבי מאיר שפירא מלובלין', day: weekday('2026-10-17') }),
      );
    });

    it('6 leaves the pre-block notice without hilulot while the setting is off', async () => {
      useUserStore.getState().setHilulotEnabled(false);
      await NotificationScheduler.rebuild();
      expect(pendingOf('blockNotice:2026-10-17')!.content.body!.split('\n')).toHaveLength(1);
    });
  });

  describe('Shavuot', () => {
    // 6 Sivan 5787 is Friday 2027-06-11: Shavuot, then Shabbat. The hilula opens at the erev's shkia.
    const SIVAN_6 = new HDate(6, months.SIVAN, 5787).abs();
    beforeEach(() => jest.setSystemTime(at(JERUSALEM, '2027-06-09T06:00')));

    it('7 fires the notice a day before as usual and folds the erev one into the pre-block notice as tonight', async () => {
      await NotificationScheduler.rebuild();

      expect(hilulaPending().map((p) => p.identifier)).toEqual([`hilula:${SIVAN_6}:before`]);
      expect(pendingOf(`hilula:${SIVAN_6}:before`)!.trigger!.date.getTime()).toBe(shkiaOn('2027-06-09').getTime());
      const notice = pendingOf('blockNotice:2027-06-11')!;
      expect(notice.content.body!.split('\n')).toContain(
        t('holyBlock.notice.hilulaTonight', { names: 'דוד המלך, הבעל שם טוב' }),
      );
    });
  });

  it('9 keeps the date where shkia comes before noon, as in an Arctic winter', async () => {
    const vorkuta = { name: 'וורקוטה', nameEn: 'Vorkuta', lat: 67.5, lng: 64.06, tz: 'Europe/Moscow', inIsrael: false };
    useUserStore.getState().setLocation(vorkuta);
    jest.setSystemTime(at(vorkuta, '2026-12-28T06:00'));
    const shkia = (iso: string) => zmanimFor(at(vorkuta, `${iso}T12:00`), vorkuta).shkia;
    expect(DateTime.fromJSDate(shkia('2026-12-28')).setZone('Europe/Moscow').hour).toBeLessThan(12);

    await NotificationScheduler.rebuild();

    const tevet20 = new HDate(20, months.TEVET, 5787).abs(); // Wednesday 2026-12-30, opens at Tuesday's shkia
    expect(hilulaPending().map((p) => p.identifier)).toEqual([`hilula:${tevet20}:before`, `hilula:${tevet20}:evening`]);
    expect(pendingOf(`hilula:${tevet20}:before`)!.trigger!.date.getTime()).toBe(shkia('2026-12-28').getTime());
    expect(pendingOf(`hilula:${tevet20}:evening`)!.trigger!.date.getTime()).toBe(shkia('2026-12-29').getTime());
  });

  it('8 rebuilds when the setting is switched, and the teardown unsubscribes', () => {
    const rebuild = jest.spyOn(NotificationScheduler, 'rebuild').mockResolvedValue();
    const teardown = initNotificationHandlers();
    rebuild.mockClear();

    useUserStore.getState().setHilulotEnabled(false);
    expect(rebuild).toHaveBeenCalledTimes(1);
    useUserStore.getState().setHilulotEnabled(true);
    expect(rebuild).toHaveBeenCalledTimes(2);

    teardown();
    useUserStore.getState().setHilulotEnabled(false);
    expect(rebuild).toHaveBeenCalledTimes(2);
    rebuild.mockRestore();
  });

  it('10 rebuilds when a notice kind changes', () => {
    const rebuild = jest.spyOn(NotificationScheduler, 'rebuild').mockResolvedValue();
    const teardown = initNotificationHandlers();
    rebuild.mockClear();

    const { evening } = useUserStore.getState().hilulaNotices;
    useUserStore.getState().setHilulaNotice('evening', { ...evening, timing: { anchor: 'clock', minutes: 1140 } });
    expect(rebuild).toHaveBeenCalledTimes(1);

    teardown();
    rebuild.mockRestore();
  });

  it('11 leaves out a kind switched off', async () => {
    const { before } = useUserStore.getState().hilulaNotices;
    useUserStore.getState().setHilulaNotice('before', { ...before, enabled: false });
    await NotificationScheduler.rebuild();
    expect(hilulaPending().map((p) => p.identifier)).toEqual([`hilula:${CHESHVAN_3}:evening`]);
  });
});
