jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  dismissAllNotificationsAsync: jest.fn(),
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

const mockReload = jest.fn();
jest.mock('@/services/appReload', () => ({ reloadApp: () => mockReload() }));

const mockDeleteChokFiles = jest.fn();
jest.mock('@/services/chokFiles', () => ({
  ...jest.requireActual('@/services/chokFiles'),
  deleteChokFiles: () => mockDeleteChokFiles(),
}));

const mockDeleteSelichotFiles = jest.fn();
jest.mock('@/services/selichotFiles', () => ({
  ...jest.requireActual('@/services/selichotFiles'),
  deleteSelichotFiles: () => mockDeleteSelichotFiles(),
}));

import { AppResetService } from '../AppResetService';
import { taharahStorage } from '../TaharahStorage';
import { useUserStore } from '@/stores/useUserStore';
import { DEFAULT_UI_SCALE, __setUiScaleForTests } from '@/theme/scale';
import { useTaharahStore } from '@/stores/useTaharahStore';
import { useChokStore } from '@/stores/useChokStore';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { useSiddurBookmarksStore } from '@/stores/useSiddurBookmarksStore';
import { EMPTY_MARK_COUNTS, useCompletionsStore } from '@/stores/useCompletionsStore';
import { DEFAULT_ON_MITZVOT, enabledSinceOf, useMitzvotStore } from '@/stores/useMitzvotStore';
import { findCityById } from '@/data/cities';
import { findMitzvah } from '@/data/mitzvot';
import { installChokFixture } from '@/testing/chok';
import { at } from '@/testing/zmanim';
import { latestCheckIn } from '@/utils/checkIn';
import { installSelichotFixture } from '@/testing/selichot';

const SecureStore = require('expo-secure-store');
const JERUSALEM = findCityById('jerusalem')!;

describe('AppResetService.reset', () => {
  beforeEach(() => {
    // The stock MMKV mock warns that it cannot recrypt.
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
    mockReload.mockReset();
    __setUiScaleForTests(DEFAULT_UI_SCALE);
  });

  it('reloads the app when the running display size is not the default, after the stores are reset', async () => {
    useUserStore.getState().setUiScale(1.2);
    __setUiScaleForTests(1.2);
    mockReload.mockImplementationOnce(() => expect(useUserStore.getState().uiScale).toBe(DEFAULT_UI_SCALE));

    await AppResetService.reset();

    expect(mockReload).toHaveBeenCalledTimes(1);
    expect(mockReload.mock.results[0].type).toBe('return');
  });

  it('does not reload when the running display size is the default', async () => {
    await AppResetService.reset();

    expect(mockReload).not.toHaveBeenCalled();
  });

  it('wipes the taharah log, settings and persisted bytes, and replaces the key', async () => {
    useUserStore.getState().setNusach('chabad');
    useUserStore.getState().setTheme('plum');
    useUserStore.getState().setGender('female');
    useUserStore.getState().setMaritalStatus('married');
    useUserStore.getState().setTaharahEnabled(true);
    useTaharahStore.getState().addEvent({ type: 'onset', onah: { abs: 740000, kind: 'night' } });
    useTaharahStore.getState().setPreset('chabad');
    expect(taharahStorage.getString('taharah-store')).toContain('onset');
    const keyBefore = SecureStore.__store.get('taharah-mmkv-key');

    await AppResetService.reset();

    expect(useUserStore.getState().nusach).toBe('ashkenaz');
    expect(useUserStore.getState().theme).toBe('gold');
    expect(useUserStore.getState().gender).toBeNull();
    expect(useUserStore.getState().maritalStatus).toBeNull();
    expect(useUserStore.getState().taharahEnabled).toBe(false);
    expect(useTaharahStore.getState().events).toEqual([]);
    expect(useTaharahStore.getState().settings.preset).toBe('ashkenaz');
    expect(taharahStorage.getString('taharah-store')).toBeUndefined();
    expect(SecureStore.__store.get('taharah-mmkv-key')).toMatch(/^[A-Za-z0-9_-]{16}$/);
    expect(SecureStore.__store.get('taharah-mmkv-key')).not.toBe(keyBefore);
  });

  it('forgets the Chok LeYisrael add-on and deletes its files', async () => {
    installChokFixture();
    mockDeleteChokFiles.mockClear();

    await AppResetService.reset();

    expect(useChokStore.getState().installed).toBeNull();
    expect(mockDeleteChokFiles).toHaveBeenCalledTimes(1);
  });

  it('hydrates the mitzvot store as a fresh install: default-on mitzvot stamped with the reset, no check-in for the Shabbat before it', async () => {
    const SUNDAY = at(JERUSALEM, '2026-11-15T09:00');
    const defaultOn = DEFAULT_ON_MITZVOT.filter((id) => findMitzvah(id) !== undefined);
    useUserStore.setState({ isOnboarded: true });
    useMitzvotStore.setState({
      activeMitzvot: {
        ...useMitzvotStore.getState().activeMitzvot,
        tefillin: { enabled: false },
        havdalah: { enabled: true, enabledAt: 1 },
        custom_1_ab: { enabled: true },
      },
    });
    jest.spyOn(Date, 'now').mockReturnValue(SUNDAY.getTime());

    await AppResetService.reset();

    const active = useMitzvotStore.getState().activeMitzvot;
    defaultOn.forEach((id) => expect(active[id]).toEqual({ enabled: true, enabledAt: SUNDAY.getTime() }));
    expect(active.havdalah).toEqual({ enabled: false });
    expect(active).not.toHaveProperty('custom_1_ab');
    expect(
      latestCheckIn(
        {
          mitzvot: defaultOn.map((id) => findMitzvah(id)!),
          completions: {},
          checkIns: {},
          location: JERUSALEM,
          settings: { nusach: 'ashkenaz', halachicOpinions: { ksSofZman: 'GRA' }, inIsrael: true },
          enabledSince: enabledSinceOf(active),
        },
        SUNDAY,
      ),
    ).toBeNull();
  });

  it('forgets the Selichot add-on and deletes its files', async () => {
    installSelichotFixture();
    mockDeleteSelichotFiles.mockClear();

    await AppResetService.reset();

    expect(useSelichotStore.getState().installed).toBeNull();
    expect(mockDeleteSelichotFiles).toHaveBeenCalledTimes(1);
  });

  it('clears the achievements and archived mark counts', async () => {
    useCompletionsStore.setState({
      achievements: {
        badges: { streak7: '2026-10-18' },
        bestStreak: null,
        bestWeek: null,
        mitzvahBest: {},
        fold: null,
      },
      archivedMarks: { lastKey: '2025-01-02', total: 3, byMitzvah: { a: 3 } },
    });

    await AppResetService.reset();

    expect(useCompletionsStore.getState().achievements).toBeNull();
    expect(useCompletionsStore.getState().archivedMarks).toEqual(EMPTY_MARK_COUNTS);
  });

  it('clears the siddur bookmarks and last positions', async () => {
    useSiddurBookmarksStore.getState().addBookmark({
      textId: 'tehillim',
      nusach: null,
      sectionTitle: 'ליום ראשון',
      segmentKey: 'abcdefghij',
      label: 'ליום ראשון · אַשְׁרֵי הָאִישׁ',
    });
    useSiddurBookmarksStore.getState().saveLastPosition('tehillim', {
      nusach: null,
      sectionTitle: 'ליום ראשון',
      segmentKey: 'abcdefghij',
      appDay: '2026-10-28',
      savedAt: 1,
    });

    await AppResetService.reset();

    expect(useSiddurBookmarksStore.getState().bookmarks).toEqual([]);
    expect(useSiddurBookmarksStore.getState().lastPositions).toEqual({});
  });
});
