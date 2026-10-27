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

import { STORE_VERSION } from '../persistOptions';
import {
  DEFAULT_HILULA_NOTICES,
  DEFAULT_ROSH_CHODESH_NOTICES,
  SIDDUR_SCROLL_SPEEDS,
  anyNoticeOn,
  canEnableNotices,
  noticeDaysBefore,
  noticeTimingOf,
  scrollSpeedLevel,
  useUserStore,
  type NoticeSetting,
} from '../useUserStore';
import {
  DEFAULT_ON_MITZVOT,
  INACTIVE,
  canEnable,
  effectiveReminders,
  remindersOf,
  selectActive,
  useMitzvotStore,
} from '../useMitzvotStore';
import { useCompletionsStore, dateKey } from '../useCompletionsStore';
import { useCustomMitzvotStore } from '../useCustomMitzvotStore';
import { useChokStore } from '../useChokStore';
import { useSiddurBookmarksStore } from '../useSiddurBookmarksStore';
import { CITIES } from '@/data/cities';
import { MITZVOT } from '@/data/mitzvot';
import { storage } from '@/services/StorageService';
import { DEFAULT_UI_SCALE, UI_SCALES, readStoredUiScale } from '@/theme/scale';
import { Location } from '@/types/zmanim';
import { Reminder } from '@/types/mitzvah';

const ONE: Reminder = { anchor: 'start', offsetMin: 0, label: 'א' };

describe('stores', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useCompletionsStore.setState({ completions: {}, skipped: {} });
  });

  it.each([
    ['user-store', useUserStore],
    ['mitzvot-store', useMitzvotStore],
    ['completions-store', useCompletionsStore],
    ['custom-mitzvot-store', useCustomMitzvotStore],
    ['siddur-bookmarks-store', useSiddurBookmarksStore],
    ['chok-store', useChokStore],
  ])('%s keeps a persisted state across a version bump (identity migrate)', (name, store) => {
    const options = store.persist.getOptions();
    expect(options.name).toBe(name);
    expect(options.version).toBe(STORE_VERSION);
    const saved = { marker: name };
    expect(options.migrate?.(saved, 0)).toBe(saved);
  });

  it('selectActive returns one frozen object for a missing id, so the detail screen cannot loop', () => {
    const state = useMitzvotStore.getState();
    expect(selectActive('custom_deleted')(state)).toBe(INACTIVE);
    expect(selectActive('custom_deleted')(state)).toBe(selectActive('custom_deleted')(state));
    expect(Object.isFrozen(INACTIVE)).toBe(true);
    expect(selectActive('tefillin')(state)).toBe(state.activeMitzvot.tefillin);
  });

  it('a fresh install reports the default city as missing, not ready', () => {
    useUserStore.getState().reset();
    expect(useUserStore.getState().locationStatus).toBe('missing');
    useUserStore.getState().setLocationState(useUserStore.getState().location, 'ready', 'manual');
    expect(useUserStore.getState().locationStatus).toBe('ready');
  });

  it('4.1 useUserStore setNusach persists', () => {
    useUserStore.getState().setNusach('sefard');
    expect(useUserStore.getState().nusach).toBe('sefard');
  });

  it('4.2 setEnabled tefillin → enabled', () => {
    useMitzvotStore.getState().setEnabled('tefillin', true);
    expect(useMitzvotStore.getState().activeMitzvot.tefillin.enabled).toBe(true);
  });

  it('4.3 resetToDefault drops customReminders', () => {
    useMitzvotStore.getState().setReminders('tefillin', [{ anchor: 'start', offsetMin: 0, label: 'x' }]);
    expect(useMitzvotStore.getState().activeMitzvot.tefillin.customReminders).toBeDefined();
    useMitzvotStore.getState().resetToDefault('tefillin');
    expect(useMitzvotStore.getState().activeMitzvot.tefillin.customReminders).toBeUndefined();
  });

  it('4.4 markDone → isDone true', () => {
    useCompletionsStore.getState().markDone('tefillin');
    expect(useCompletionsStore.getState().isDone('tefillin')).toBe(true);
  });

  it('4.5 unmark → isDone false', () => {
    useCompletionsStore.getState().markDone('tefillin');
    useCompletionsStore.getState().unmark('tefillin');
    expect(useCompletionsStore.getState().isDone('tefillin')).toBe(false);
  });

  it('4.6 markDone today != markDone tomorrow', () => {
    const today = new Date('2026-04-23T10:00:00Z');
    const tomorrow = new Date('2026-04-24T10:00:00Z');
    useCompletionsStore.getState().markDone('tefillin', today);
    expect(useCompletionsStore.getState().isDone('tefillin', today)).toBe(true);
    expect(useCompletionsStore.getState().isDone('tefillin', tomorrow)).toBe(false);
    expect(dateKey(today)).not.toBe(dateKey(tomorrow));
  });

  it('4.7 markSkipped tracks skip without counting as done', () => {
    const today = new Date('2026-04-23T10:00:00Z');
    useCompletionsStore.getState().markSkipped('tefillin', today);
    expect(useCompletionsStore.getState().isSkipped('tefillin', today)).toBe(true);
    expect(useCompletionsStore.getState().isDone('tefillin', today)).toBe(false);
    expect(useCompletionsStore.getState().countForDate(today)).toBe(0);
  });
});

describe('useUserStore auto-scroll', () => {
  beforeEach(() => useUserStore.getState().reset());

  it('starts off at the middle speed and resets to it', () => {
    expect(useUserStore.getState().siddurAutoScroll).toBe(false);
    expect(useUserStore.getState().siddurScrollSpeed).toBe(5);
    useUserStore.getState().setSiddurAutoScroll(true);
    useUserStore.getState().setSiddurScrollSpeed(8);
    expect(useUserStore.getState().siddurAutoScroll).toBe(true);
    expect(useUserStore.getState().siddurScrollSpeed).toBe(8);
    useUserStore.getState().reset();
    expect(useUserStore.getState().siddurAutoScroll).toBe(false);
    expect(useUserStore.getState().siddurScrollSpeed).toBe(5);
  });

  it('keeps a stored speed inside the offered levels', () => {
    useUserStore.getState().setSiddurScrollSpeed(0);
    expect(useUserStore.getState().siddurScrollSpeed).toBe(1);
    useUserStore.getState().setSiddurScrollSpeed(SIDDUR_SCROLL_SPEEDS.length + 3);
    expect(useUserStore.getState().siddurScrollSpeed).toBe(SIDDUR_SCROLL_SPEEDS.length);
    useUserStore.getState().setSiddurScrollSpeed(3.4);
    expect(useUserStore.getState().siddurScrollSpeed).toBe(3);
    useUserStore.getState().setSiddurScrollSpeed(Number.NaN);
    expect(useUserStore.getState().siddurScrollSpeed).toBe(5);
  });

  it('reads any saved speed as an offered level', () => {
    expect(scrollSpeedLevel(Number.POSITIVE_INFINITY)).toBe(5);
    expect(scrollSpeedLevel(-4)).toBe(1);
    expect(scrollSpeedLevel(10)).toBe(10);
    expect(scrollSpeedLevel(15)).toBe(15);
    expect(scrollSpeedLevel(16)).toBe(15);
  });

  it('keeps hilula notices off until switched on, and reset turns them off', () => {
    expect(useUserStore.getState().hilulotEnabled).toBe(false);
    useUserStore.getState().setHilulotEnabled(true);
    expect(useUserStore.getState().hilulotEnabled).toBe(true);
    useUserStore.getState().reset();
    expect(useUserStore.getState().hilulotEnabled).toBe(false);
  });

  it('keeps Rosh Chodesh notices off until switched on, and reset turns them off', () => {
    expect(useUserStore.getState().roshChodeshEnabled).toBe(false);
    useUserStore.getState().setRoshChodeshEnabled(true);
    expect(useUserStore.getState().roshChodeshEnabled).toBe(true);
    expect(useUserStore.getState().hilulotEnabled).toBe(false);
    useUserStore.getState().reset();
    expect(useUserStore.getState().roshChodeshEnabled).toBe(false);
  });

  describe('notice kinds', () => {
    const user = () => useUserStore.getState();
    const off = (setting: NoticeSetting): NoticeSetting => ({ ...setting, enabled: false });
    const ROSH_CHODESH_DEFAULTS = {
      before: { enabled: true, daysBefore: 3, timing: { anchor: 'clock', minutes: 1200 } },
      evening: { enabled: true, timing: { anchor: 'shkia', offsetMin: 0 } },
      day: { enabled: true, timing: { anchor: 'clock', minutes: 420 } },
    };
    const HILULA_DEFAULTS = {
      before: { enabled: true, daysBefore: 1, timing: { anchor: 'shkia', offsetMin: 0 } },
      evening: { enabled: true, timing: { anchor: 'shkia', offsetMin: 0 } },
    };

    it('starts with every kind on, and reset restores them after a change', () => {
      expect(user().roshChodeshNotices).toEqual(ROSH_CHODESH_DEFAULTS);
      expect(user().hilulaNotices).toEqual(HILULA_DEFAULTS);
      user().setRoshChodeshNotice('day', { enabled: true, timing: { anchor: 'clock', minutes: 360 } });
      user().setHilulaNotice('before', { enabled: false, daysBefore: 5, timing: { anchor: 'clock', minutes: 600 } });
      expect(user().roshChodeshNotices.day.timing).toEqual({ anchor: 'clock', minutes: 360 });
      expect(user().hilulaNotices.before.daysBefore).toBe(5);
      user().reset();
      expect(user().roshChodeshNotices).toEqual(ROSH_CHODESH_DEFAULTS);
      expect(user().hilulaNotices).toEqual(HILULA_DEFAULTS);
    });

    it('keeps at least one Rosh Chodesh kind on while the switch is on, and refuses the switch with none', () => {
      const { roshChodeshNotices: kinds } = user();
      user().setRoshChodeshNotice('before', off(kinds.before));
      user().setRoshChodeshNotice('evening', off(kinds.evening));
      user().setRoshChodeshNotice('day', off(kinds.day));
      expect(anyNoticeOn(user().roshChodeshNotices)).toBe(false);

      user().setRoshChodeshEnabled(true);
      expect(user().roshChodeshEnabled).toBe(false);
      expect(canEnableNotices('roshChodesh')).toBe(false);

      user().setRoshChodeshNotice('day', kinds.day);
      expect(canEnableNotices('roshChodesh')).toBe(true);
      user().setRoshChodeshEnabled(true);
      expect(user().roshChodeshEnabled).toBe(true);

      user().setRoshChodeshNotice('day', off(kinds.day));
      expect(user().roshChodeshNotices.day.enabled).toBe(true);

      user().setRoshChodeshEnabled(false);
      expect(user().roshChodeshEnabled).toBe(false);
    });

    it('keeps at least one hilula kind on while the switch is on, and refuses the switch with none', () => {
      const { hilulaNotices: kinds } = user();
      user().setHilulaNotice('before', off(kinds.before));
      user().setHilulaNotice('evening', off(kinds.evening));
      expect(anyNoticeOn(user().hilulaNotices)).toBe(false);

      user().setHilulotEnabled(true);
      expect(user().hilulotEnabled).toBe(false);
      expect(canEnableNotices('hilulot')).toBe(false);

      user().setHilulaNotice('before', kinds.before);
      expect(canEnableNotices('hilulot')).toBe(true);
      user().setHilulotEnabled(true);
      expect(user().hilulotEnabled).toBe(true);

      user().setHilulaNotice('before', off(kinds.before));
      expect(user().hilulaNotices.before.enabled).toBe(true);

      user().setHilulotEnabled(false);
      expect(user().hilulotEnabled).toBe(false);
    });

    it('merge fills a missing map or kind from the defaults and drops a kind this build does not know', () => {
      const { merge } = useUserStore.persist.getOptions();
      const current = user();
      const saved: NoticeSetting = { enabled: true, daysBefore: 4, timing: { anchor: 'clock', minutes: 600 } };

      expect(merge!({ nusach: 'sefard' }, current).roshChodeshNotices).toEqual(DEFAULT_ROSH_CHODESH_NOTICES);
      expect(merge!({ nusach: 'sefard' }, current).hilulaNotices).toEqual(DEFAULT_HILULA_NOTICES);
      expect(merge!({ hilulaNotices: { before: saved } }, current).hilulaNotices).toEqual({
        before: saved,
        evening: DEFAULT_HILULA_NOTICES.evening,
      });
      const withExtra = merge!({ roshChodeshNotices: { ...DEFAULT_ROSH_CHODESH_NOTICES, week: saved } }, current);
      expect(Object.keys(withExtra.roshChodeshNotices)).toEqual(['before', 'evening', 'day']);
    });

    it('merge restores the defaults of a switch that is on with every kind off', () => {
      const { merge } = useUserStore.persist.getOptions();
      const current = user();
      const merged = merge!(
        {
          hilulotEnabled: true,
          hilulaNotices: { before: off(DEFAULT_HILULA_NOTICES.before), evening: off(DEFAULT_HILULA_NOTICES.evening) },
        },
        current,
      );
      expect(merged.hilulotEnabled).toBe(true);
      expect(merged.hilulaNotices).toEqual(DEFAULT_HILULA_NOTICES);
    });

    it('keeps a saved topic with every kind off while its switch is off', () => {
      const { merge } = useUserStore.persist.getOptions();
      const allOff = { before: off(DEFAULT_HILULA_NOTICES.before), evening: off(DEFAULT_HILULA_NOTICES.evening) };
      expect(merge!({ hilulaNotices: allOff }, user()).hilulaNotices).toEqual(allOff);
    });

    it('reads a saved number of days ahead as a whole day from one to seven', () => {
      const days = (daysBefore?: number) =>
        noticeDaysBefore({ enabled: true, daysBefore, timing: { anchor: 'shkia', offsetMin: 0 } }, 3);
      expect(days(0)).toBe(1);
      expect(days(9)).toBe(7);
      expect(days(2.6)).toBe(3);
      expect(days(5)).toBe(5);
      expect(days(undefined)).toBe(3);
      expect(days(Number.NaN)).toBe(3);
    });

    it('reads a saved timing as a lead of at most 180 minutes before the shkia or a minute of the day', () => {
      const shkia = (offsetMin: number): NoticeSetting => ({ enabled: true, timing: { anchor: 'shkia', offsetMin } });
      const onClock = (minutes: number): NoticeSetting => ({ enabled: true, timing: { anchor: 'clock', minutes } });
      expect(noticeTimingOf(shkia(30))).toEqual({ anchor: 'shkia', offsetMin: 0 });
      expect(noticeTimingOf(shkia(-0))).toEqual({ anchor: 'shkia', offsetMin: 0 });
      expect(noticeTimingOf(shkia(-45))).toEqual({ anchor: 'shkia', offsetMin: -45 });
      expect(noticeTimingOf(shkia(-500))).toEqual({ anchor: 'shkia', offsetMin: -180 });
      expect(noticeTimingOf(shkia(Number.NaN))).toEqual({ anchor: 'shkia', offsetMin: 0 });
      expect(noticeTimingOf(onClock(1500))).toEqual({ anchor: 'clock', minutes: 1439 });
      expect(noticeTimingOf(onClock(-5))).toEqual({ anchor: 'clock', minutes: 0 });
      expect(noticeTimingOf(onClock(Number.NaN))).toEqual({ anchor: 'clock', minutes: 0 });
      expect(noticeTimingOf({ enabled: true, timing: undefined } as unknown as NoticeSetting)).toEqual({
        anchor: 'shkia',
        offsetMin: 0,
      });
    });
  });

  it('keeps the weekly report on until switched off, and reset turns it back on', () => {
    expect(useUserStore.getState().weeklyReportEnabled).toBe(true);
    useUserStore.getState().setWeeklyReportEnabled(false);
    expect(useUserStore.getState().weeklyReportEnabled).toBe(false);
    expect(useUserStore.getState().roshChodeshEnabled).toBe(false);
    useUserStore.getState().reset();
    expect(useUserStore.getState().weeklyReportEnabled).toBe(true);
  });

  it('merge turns the weekly report on for an install saved before it existed, and keeps a saved off', () => {
    const { merge } = useUserStore.persist.getOptions();
    const current = useUserStore.getState();
    expect(merge!({ nusach: 'sefard' }, current).weeklyReportEnabled).toBe(true);
    expect(merge!({ weeklyReportEnabled: false }, current).weeklyReportEnabled).toBe(false);
  });

  it('offers speeds that rise from level to level', () => {
    SIDDUR_SCROLL_SPEEDS.forEach((pace, index) => {
      if (index > 0) expect(pace).toBeGreaterThan(SIDDUR_SCROLL_SPEEDS[index - 1]);
    });
  });

  it('offers fifteen levels from 5 to 150 lines per minute', () => {
    expect(SIDDUR_SCROLL_SPEEDS).toHaveLength(15);
    expect(SIDDUR_SCROLL_SPEEDS[0]).toBe(5);
    expect(SIDDUR_SCROLL_SPEEDS[14]).toBe(150);
  });

  it('clamps the speed at the fifteenth level', () => {
    useUserStore.getState().setSiddurScrollSpeed(15);
    expect(useUserStore.getState().siddurScrollSpeed).toBe(15);
    useUserStore.getState().setSiddurScrollSpeed(16);
    expect(useUserStore.getState().siddurScrollSpeed).toBe(15);
  });
});

describe('useUserStore display size', () => {
  beforeEach(() => useUserStore.getState().reset());

  it('starts at the default step', () => {
    expect(useUserStore.getState().uiScale).toBe(DEFAULT_UI_SCALE);
    expect(useUserStore.getState().uiScale).toBe(1);
  });

  it('takes every step of the scale', () => {
    for (const step of UI_SCALES) {
      useUserStore.getState().setUiScale(step);
      expect(useUserStore.getState().uiScale).toBe(step);
    }
  });

  it('refuses a value that is not a step and keeps the one it had', () => {
    useUserStore.getState().setUiScale(1.1);
    for (const value of [1.05, 0.5, 2, 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      useUserStore.getState().setUiScale(value);
      expect(useUserStore.getState().uiScale).toBe(1.1);
    }
  });

  it('goes back to the default on reset', () => {
    useUserStore.getState().setUiScale(0.8);
    useUserStore.getState().reset();
    expect(useUserStore.getState().uiScale).toBe(DEFAULT_UI_SCALE);
  });

  it('merge gives an install saved before the field existed the default, and keeps a saved step', () => {
    const { merge } = useUserStore.persist.getOptions();
    const current = useUserStore.getState();
    expect((merge!({ nusach: 'sefard' }, current) as typeof current).uiScale).toBe(DEFAULT_UI_SCALE);
    expect((merge!({ uiScale: 0.9 }, current) as typeof current).uiScale).toBe(0.9);
  });

  it('merge repairs a saved value that is not a step', () => {
    const { merge } = useUserStore.persist.getOptions();
    const current = useUserStore.getState();
    for (const uiScale of [1.05, 3, 'big', null]) {
      expect((merge!({ uiScale }, current) as typeof current).uiScale).toBe(DEFAULT_UI_SCALE);
    }
  });

  it('writes the step into the persisted user store, where the launch scale reads it', () => {
    useUserStore.getState().setUiScale(1.2);
    const raw = JSON.parse(storage.getString('user-store')!);
    expect(raw.state.uiScale).toBe(1.2);
    expect(readStoredUiScale(() => storage.getString('user-store'))).toBe(1.2);
  });
});

describe('useUserStore prayer mode', () => {
  beforeEach(() => useUserStore.getState().reset());

  it('starts with a minyan, switches to alone and resets to a minyan', () => {
    expect(useUserStore.getState().prayerMode).toBe('minyan');
    useUserStore.getState().setPrayerMode('alone');
    expect(useUserStore.getState().prayerMode).toBe('alone');
    useUserStore.getState().reset();
    expect(useUserStore.getState().prayerMode).toBe('minyan');
  });

  it('keeps the default for a payload saved before the field existed', () => {
    const { merge } = useUserStore.persist.getOptions();
    const current = useUserStore.getState();
    expect(merge!({ nusach: 'sefard' }, current).prayerMode).toBe('minyan');
    expect(merge!({ prayerMode: 'alone' }, current).prayerMode).toBe('alone');
  });
});

describe('useUserStore double-week choice', () => {
  beforeEach(() => useUserStore.getState().reset());

  it('starts unanswered, keeps a choice and resets to unanswered', () => {
    expect(useUserStore.getState().chokDoubleChoice).toBeNull();
    useUserStore.getState().setChokDoubleChoice('both');
    expect(useUserStore.getState().chokDoubleChoice).toBe('both');
    useUserStore.getState().reset();
    expect(useUserStore.getState().chokDoubleChoice).toBeNull();
  });

  it('stays unanswered for a payload saved before the field existed and keeps a saved choice', () => {
    const { merge } = useUserStore.persist.getOptions();
    const current = useUserStore.getState();
    expect(merge!({ nusach: 'sefard' }, current).chokDoubleChoice).toBeNull();
    expect(merge!({ chokDoubleChoice: 'second' }, current).chokDoubleChoice).toBe('second');
  });
});

describe('useUserStore Chok commentary', () => {
  beforeEach(() => useUserStore.getState().reset());

  it('starts folded, opens and resets to folded', () => {
    expect(useUserStore.getState().chokCommentaryOpen).toBe(false);
    useUserStore.getState().setChokCommentaryOpen(true);
    expect(useUserStore.getState().chokCommentaryOpen).toBe(true);
    useUserStore.getState().reset();
    expect(useUserStore.getState().chokCommentaryOpen).toBe(false);
  });

  it('stays folded for a payload saved before the field existed and keeps a saved choice', () => {
    const { merge } = useUserStore.persist.getOptions();
    const current = useUserStore.getState();
    expect(merge!({ nusach: 'sefard' }, current).chokCommentaryOpen).toBe(false);
    expect(merge!({ chokCommentaryOpen: true }, current).chokCommentaryOpen).toBe(true);
  });
});

describe('useUserStore Thursday-night day', () => {
  beforeEach(() => useUserStore.getState().reset());

  it('starts unanswered, takes a day and resets to unanswered', () => {
    expect(useUserStore.getState().chokThuNightDay).toBeNull();
    useUserStore.getState().setChokThuNightDay('fri');
    expect(useUserStore.getState().chokThuNightDay).toBe('fri');
    useUserStore.getState().reset();
    expect(useUserStore.getState().chokThuNightDay).toBeNull();
  });

  it('stays unanswered for a payload saved before the field existed and keeps a saved day', () => {
    const { merge } = useUserStore.persist.getOptions();
    const current = useUserStore.getState();
    expect(merge!({ nusach: 'sefard' }, current).chokThuNightDay).toBeNull();
    expect(merge!({ chokThuNightDay: 'thu' }, current).chokThuNightDay).toBe('thu');
  });
});

describe('useMitzvotStore merge', () => {
  it('prunes a retired mitzvah from a persisted map and keeps every other entry, custom ones included', () => {
    const { merge } = useMitzvotStore.persist.getOptions();
    const current = useMitzvotStore.getState();
    const saved = {
      activeMitzvot: {
        tzitzit: { enabled: true },
        tefillin: { enabled: false },
        custom_1_a: { enabled: true },
      },
    };

    const clock = jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    const merged = merge!(saved, current).activeMitzvot;
    clock.mockRestore();

    expect(merged).not.toHaveProperty('tzitzit');
    expect(merged.tefillin).toEqual({ enabled: false });
    expect(merged.custom_1_a).toEqual({ enabled: true });
    expect(merged.shacharit).toEqual({ enabled: true, enabledAt: 1_800_000_000_000 });
    expect(merged.havdalah).toEqual({ enabled: false });
  });

  it('turns a persisted empty reminder list into the defaults and keeps a non-empty one', () => {
    const { merge } = useMitzvotStore.persist.getOptions();
    const current = useMitzvotStore.getState();
    const saved = {
      activeMitzvot: {
        tefillin: { enabled: true, customReminders: [], enabledAt: 5 },
        havdalah: { enabled: false, customReminders: [ONE] },
        custom_1_a: { enabled: true, customReminders: [] },
      },
    };

    const merged = merge!(saved, current).activeMitzvot;

    expect(merged.tefillin).toEqual({ enabled: true, enabledAt: 5 });
    expect(merged.tefillin).not.toHaveProperty('customReminders');
    expect(merged.havdalah.customReminders).toEqual([ONE]);
    expect(merged.custom_1_a).not.toHaveProperty('customReminders');

    useMitzvotStore.setState({ activeMitzvot: merged });
    expect(effectiveReminders('tefillin')).toBe(MITZVOT.find((m) => m.id === 'tefillin')!.defaultReminders);
    useMitzvotStore.getState().reset();
  });

  it('resets to the registered default-on mitzvot, unstamped and without tzitzit', () => {
    useMitzvotStore.getState().reset();
    expect(useMitzvotStore.getState().activeMitzvot).not.toHaveProperty('tzitzit');
    expect(DEFAULT_ON_MITZVOT).toEqual([
      'tefillin',
      'krias_shma_shacharit',
      'shacharit',
      'mincha',
      'maariv',
      'krias_shma_al_hamita',
      'kiddush_levana',
      'selichot',
      'chanukah_candles',
      'ushpizin',
    ]);
    const registered = DEFAULT_ON_MITZVOT.filter((id) => MITZVOT.some((m) => m.id === id));
    expect(registered).toEqual(
      expect.arrayContaining([
        'tefillin',
        'krias_shma_shacharit',
        'shacharit',
        'mincha',
        'maariv',
        'krias_shma_al_hamita',
        'kiddush_levana',
        'selichot',
        'chanukah_candles',
        'ushpizin',
      ]),
    );
    expect(useMitzvotStore.getState().getEnabledIds().sort()).toEqual([...registered].sort());
    Object.values(useMitzvotStore.getState().activeMitzvot).forEach((state) => expect(state.enabledAt).toBeUndefined());
  });
});

describe('useMitzvotStore at least one reminder', () => {
  const havdalah = MITZVOT.find((m) => m.id === 'havdalah')!;
  const stored = (id: string) => useMitzvotStore.getState().activeMitzvot[id];
  const addCustom = (id: string, reminders: Reminder[]) =>
    useCustomMitzvotStore.getState().add({
      id,
      name: 'שיעור קבוע',
      startHHMM: '08:00',
      endHHMM: '09:00',
      reminders,
      skipOn: [],
      createdAt: 1800000000000,
    });

  beforeEach(() => {
    useMitzvotStore.getState().reset();
    useCustomMitzvotStore.getState().reset();
  });

  it('remindersOf prefers the override, then the defaults, then none', () => {
    expect(remindersOf(undefined, havdalah)).toBe(havdalah.defaultReminders);
    expect(remindersOf({ enabled: true }, havdalah)).toBe(havdalah.defaultReminders);
    expect(remindersOf({ enabled: true, customReminders: [ONE] }, havdalah)).toEqual([ONE]);
    expect(remindersOf({ enabled: true, customReminders: [] }, havdalah)).toEqual([]);
    expect(remindersOf(undefined, undefined)).toEqual([]);
  });

  it('effectiveReminders reads a registry mitzvah, its override and a custom mitzvah', () => {
    expect(effectiveReminders('havdalah')).toBe(havdalah.defaultReminders);
    expect(canEnable('havdalah')).toBe(true);

    useMitzvotStore.getState().setReminders('havdalah', [ONE]);
    expect(effectiveReminders('havdalah')).toEqual([ONE]);

    addCustom('custom_1800000000000_abc', [ONE]);
    expect(effectiveReminders('custom_1800000000000_abc')).toEqual([ONE]);
    expect(canEnable('custom_1800000000000_abc')).toBe(true);

    expect(effectiveReminders('custom_missing')).toEqual([]);
    expect(canEnable('custom_missing')).toBe(false);
  });

  it('setEnabled and toggleEnabled refuse to switch on a mitzvah whose reminders were emptied', () => {
    useMitzvotStore.getState().setReminders('havdalah', []);

    useMitzvotStore.getState().setEnabled('havdalah', true);
    expect(stored('havdalah')).toEqual({ enabled: false, customReminders: [] });

    useMitzvotStore.getState().toggleEnabled('havdalah');
    expect(stored('havdalah')).toEqual({ enabled: false, customReminders: [] });
  });

  it('a custom mitzvah switches on only with a reminder', () => {
    addCustom('custom_1800000000000_none', []);
    useMitzvotStore.getState().setEnabled('custom_1800000000000_none', true);
    expect(stored('custom_1800000000000_none')).toBeUndefined();

    addCustom('custom_1800000000000_one', [ONE]);
    useMitzvotStore.getState().setEnabled('custom_1800000000000_one', true);
    expect(stored('custom_1800000000000_one').enabled).toBe(true);
  });

  it('setReminders refuses an empty list while the mitzvah is on and takes it while it is off', () => {
    useMitzvotStore.getState().setReminders('tefillin', []);
    expect(stored('tefillin').enabled).toBe(true);
    expect(stored('tefillin').customReminders).toBeUndefined();

    useMitzvotStore.getState().setEnabled('tefillin', false);
    useMitzvotStore.getState().setReminders('tefillin', []);
    expect(stored('tefillin').customReminders).toEqual([]);
  });

  it('switching off is never refused', () => {
    useMitzvotStore.setState({
      activeMitzvot: { ...useMitzvotStore.getState().activeMitzvot, tefillin: { enabled: true, customReminders: [] } },
    });
    useMitzvotStore.getState().setEnabled('tefillin', false);
    expect(stored('tefillin').enabled).toBe(false);
  });
});

const coldStart = (state: object, colorScheme: 'light' | 'dark' | null = null) => {
  let started: ReturnType<typeof useUserStore.getState> | undefined;
  jest.isolateModules(() => {
    const { Appearance } = require('react-native');
    const appearance = jest.spyOn(Appearance, 'getColorScheme').mockReturnValue(colorScheme);
    try {
      const { storage: freshStorage } = require('@/services/StorageService');
      freshStorage.set('user-store', JSON.stringify({ version: STORE_VERSION, state }));
      started = require('../useUserStore').useUserStore.getState();
    } finally {
      appearance.mockRestore();
    }
  });
  return started!;
};

describe('useUserStore theme', () => {
  beforeEach(() => useUserStore.getState().reset());

  it('defaults to gold and resets to it', () => {
    expect(useUserStore.getState().theme).toBe('gold');
    useUserStore.getState().setTheme('plum');
    expect(useUserStore.getState().theme).toBe('plum');
    useUserStore.getState().reset();
    expect(useUserStore.getState().theme).toBe('gold');
  });

  it('a cold start keeps a saved palette name', () => {
    expect(coldStart({ theme: 'plum' }).theme).toBe('plum');
  });

  it('a cold start maps the legacy light theme to gold', () => {
    expect(coldStart({ theme: 'light' }, 'dark').theme).toBe('gold');
  });

  it('a cold start keeps the legacy dark theme', () => {
    expect(coldStart({ theme: 'dark' }, 'light').theme).toBe('dark');
  });

  it('a cold start maps the legacy system theme by the OS appearance', () => {
    expect(coldStart({ theme: 'system' }, 'dark').theme).toBe('dark');
    expect(coldStart({ theme: 'system' }, 'light').theme).toBe('gold');
  });

  it('a cold start maps an unknown theme to gold', () => {
    expect(coldStart({ theme: 'neon' }).theme).toBe('gold');
    expect(coldStart({ theme: 'toString' }).theme).toBe('gold');
    expect(coldStart({ theme: 7 }).theme).toBe('gold');
  });

  it('merge maps a retired palette to gold and keeps a live one', () => {
    const { merge } = useUserStore.persist.getOptions();
    const current = useUserStore.getState();
    expect(merge!({ theme: 'sepia' }, current).theme).toBe('gold');
    // Pink, purple and blue were retired on 2026-10-09 and restored on 2026-10-10: a saved pick survives.
    expect(merge!({ theme: 'pink' }, current).theme).toBe('pink');
    expect(merge!({ theme: 'plum' }, current).theme).toBe('plum');
  });

  it('a payload without a theme keeps the default', () => {
    const started = coldStart({ nusach: 'sefard' });
    expect(started.theme).toBe('gold');
    expect(started.nusach).toBe('sefard');
  });
});

describe('useUserStore saved city', () => {
  const JERUSALEM = CITIES[0];
  const HAIFA = CITIES[2];
  const TEL_AVIV = CITIES[1];
  const staleJerusalem: Location = {
    name: 'ירושלים',
    nameEn: 'Jerusalem',
    lat: 31.5,
    lng: 35.0,
    tz: 'Asia/Jerusalem',
    inIsrael: true,
    elevation: 700,
  };
  const johannesburg: Location = {
    name: 'מיקום נוכחי',
    nameEn: 'Current location',
    lat: -26.2041,
    lng: 28.0473,
    tz: 'Africa/Johannesburg',
    inIsrael: false,
  };
  const hydrate = (saved: object) => {
    const { merge } = useUserStore.persist.getOptions();
    return merge!(saved, useUserStore.getState());
  };

  beforeEach(() => useUserStore.getState().reset());

  it('an old Jerusalem snapshot with a stale latitude and no id hydrates to the current entry and its id', () => {
    const merged = hydrate({ location: staleJerusalem, locationSource: 'manual', locationStatus: 'ready' });
    expect(merged.location).toEqual(JERUSALEM);
    expect(merged.location.cityId).toBe('jerusalem');
    expect(merged.location.lat).toBe(JERUSALEM.lat);
    expect(merged.locationStatus).toBe('ready');
  });

  it('a payload saved before locations existed hydrates to the default city', () => {
    const merged = hydrate({ nusach: 'sefard' });
    expect(merged.location).toEqual(JERUSALEM);
    expect(merged.inIsrael).toBe(true);
  });

  it('a city picked by id picks up a changed elevation and candle-lighting minutes', () => {
    const original = { ...HAIFA };
    const saved = { ...original, elevation: 100 };
    try {
      HAIFA.elevation = 260;
      HAIFA.candleLightingMinutes = 30;
      const merged = hydrate({ location: saved, locationSource: 'manual' });
      expect(merged.location.cityId).toBe('haifa');
      expect(merged.location.elevation).toBe(260);
      expect(merged.location.candleLightingMinutes).toBe(30);
    } finally {
      Object.assign(HAIFA, original);
      delete HAIFA.candleLightingMinutes;
    }
    expect(hydrate({ location: saved, locationSource: 'manual' }).location).toEqual(original);
  });

  it('a GPS fix near Tel Aviv keeps its coordinates and refreshes the city fields', () => {
    const fix: Location = {
      ...staleJerusalem,
      name: 'תל אביב',
      nameEn: 'Tel Aviv',
      lat: 32.1,
      lng: 34.8,
      tz: 'Asia/Tel_Aviv',
      elevation: 99,
    };
    const merged = hydrate({ location: fix, locationSource: 'gps' });
    expect(merged.location).toEqual({ ...TEL_AVIV, lat: 32.1, lng: 34.8 });
    expect(merged.location.cityId).toBe('tel-aviv');
    expect(merged.location.tz).toBe('Asia/Jerusalem');
    expect(merged.location.elevation).toBe(5);
  });

  it('a location that matches no city is untouched', () => {
    const merged = hydrate({ location: johannesburg, locationSource: 'gps', inIsrael: false });
    expect(merged.location).toBe(johannesburg);
    expect(merged.inIsrael).toBe(false);
  });

  it('inIsrael follows the refreshed location, not the saved flag', () => {
    expect(hydrate({ location: staleJerusalem, locationSource: 'manual', inIsrael: false }).inIsrael).toBe(true);
    expect(hydrate({ location: johannesburg, locationSource: 'gps', inIsrael: true }).inIsrael).toBe(false);
    expect(
      hydrate({ location: { ...staleJerusalem, name: 'ניו יורק', nameEn: 'New York' }, locationSource: 'manual' })
        .inIsrael,
    ).toBe(false);
  });

  it('a cold start re-resolves the persisted city from the data', () => {
    const started = coldStart({
      location: staleJerusalem,
      locationSource: 'manual',
      locationStatus: 'ready',
      inIsrael: false,
    });
    expect(started.location).toEqual(JERUSALEM);
    expect(started.inIsrael).toBe(true);
    expect(started.locationStatus).toBe('ready');
  });

  it('a city pick carries its id, and a pick survives the next hydrate', () => {
    useUserStore.getState().setLocationState(HAIFA, 'ready', 'manual');
    expect(useUserStore.getState().location.cityId).toBe('haifa');
    expect(hydrate({ location: useUserStore.getState().location, locationSource: 'manual' }).location).toBe(HAIFA);
  });
});
