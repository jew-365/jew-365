const mockPush = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));
jest.mock('@/services/ChokContentService', () => ({
  ...jest.requireActual('@/services/ChokContentService'),
  checkChokUpdate: jest.fn(async () => {}),
}));
jest.mock('@/services/SelichotContentService', () => ({
  ...jest.requireActual('@/services/SelichotContentService'),
  checkSelichotUpdate: jest.fn(async () => {}),
}));
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  getPresentedNotificationsAsync: jest.fn(async () => []),
  dismissNotificationAsync: jest.fn(async () => {}),
  dismissAllNotificationsAsync: jest.fn(async () => {}),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => ({})),
  setNotificationCategoryAsync: jest.fn(async () => ({})),
  registerTaskAsync: jest.fn(async () => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  AndroidImportance: { HIGH: 'high', DEFAULT: 'default', LOW: 'low' },
  AndroidNotificationVisibility: { PUBLIC: 'public', PRIVATE: 'private' },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(async () => false),
  unregisterTaskAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-background-task', () => ({
  registerTaskAsync: jest.fn(),
  unregisterTaskAsync: jest.fn(),
  getStatusAsync: jest.fn(),
  BackgroundTaskResult: { Success: 1, Failed: 2 },
  BackgroundTaskStatus: { Restricted: 1, Available: 2 },
}));

import { cleanup, fireEvent, screen } from '@testing-library/react-native';
import MitzvahDetailScreen from '../mitzvah/[id]';
import { CITIES } from '@/data/cities';
import { useChokStore } from '@/stores/useChokStore';
import { useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { useUserStore } from '@/stores/useUserStore';
import { installChokFixture } from '@/testing/chok';
import { renderWithTheme } from '@/testing/render';
import { installSelichotFixture } from '@/testing/selichot';
import { at } from '@/testing/zmanim';
import type { ContentBlock, Nusach } from '@/types/mitzvah';

const JERUSALEM = CITIES[0];
const OPEN_TEXT = 'פתח נוסח';
const ONLY_DATE = [
  'nextTick',
  'queueMicrotask',
  'setImmediate',
  'clearImmediate',
  'setInterval',
  'clearInterval',
  'setTimeout',
  'clearTimeout',
] as const;

function renderAt(wallClock: string, id: string, nusach: Nusach = 'ashkenaz') {
  jest.setSystemTime(at(JERUSALEM, wallClock));
  useUserStore.setState({ nusach });
  mockParams = { id };
  return renderWithTheme(<MitzvahDetailScreen />);
}

const openButton = () => screen.queryByRole('button', { name: OPEN_TEXT });

describe('the open-text button of the mitzvah screen', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: at(JERUSALEM, '2026-10-28T07:00'), doNotFake: [...ONLY_DATE] });
    useUserStore.getState().reset();
    useUserStore.setState({ language: 'he', location: JERUSALEM, inIsrael: true, isOnboarded: true });
    useMitzvotStore.getState().reset();
    useCustomMitzvotStore.getState().reset();
    useChokStore.getState().reset();
    useSelichotStore.getState().reset();
    mockPush.mockClear();
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
    useChokStore.getState().reset();
    useSelichotStore.getState().reset();
    useCustomMitzvotStore.getState().reset();
  });

  describe('a text with no window ahead', () => {
    it('opens the Chanukah candles in Cheshvan with no date, from this mitzvah', () => {
      renderAt('2026-10-28T07:00', 'chanukah_candles');
      expect(screen.getByText('עונתי · -')).toBeOnTheScreen();
      fireEvent.press(screen.getByRole('button', { name: OPEN_TEXT }));
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush.mock.calls[0][0]).toStrictEqual({
        pathname: '/siddur/[id]',
        params: { id: 'chanukah_candles', from: 'chanukah_candles' },
      });
    });

    it('opens it with the window’s day on a Chanukah night', () => {
      renderAt('2025-12-15T14:00', 'chanukah_candles');
      fireEvent.press(screen.getByRole('button', { name: OPEN_TEXT }));
      expect(mockPush.mock.calls[0][0]).toStrictEqual({
        pathname: '/siddur/[id]',
        params: { id: 'chanukah_candles', date: '2025-12-15', from: 'chanukah_candles' },
      });
    });

    it('opens Sefirat HaOmer in Tammuz with no date', () => {
      renderAt('2026-07-08T12:00', 'sefirat_haomer');
      expect(screen.getByText('עונתי · -')).toBeOnTheScreen();
      fireEvent.press(screen.getByRole('button', { name: OPEN_TEXT }));
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush.mock.calls[0][0]).toStrictEqual({
        pathname: '/siddur/[id]',
        params: { id: 'sefirat_haomer', from: 'sefirat_haomer' },
      });
    });

    it('opens Ushpizin off season for a nusach that says it', () => {
      renderAt('2026-10-28T07:00', 'ushpizin');
      fireEvent.press(screen.getByRole('button', { name: OPEN_TEXT }));
      expect(mockPush.mock.calls[0][0]).toStrictEqual({
        pathname: '/siddur/[id]',
        params: { id: 'ushpizin', from: 'ushpizin' },
      });
    });

    it.each(['2026-10-28T07:00', '2026-09-28T21:00'])('offers no Ushpizin text in Chabad, at %s', (wallClock) => {
      renderAt(wallClock, 'ushpizin', 'chabad');
      expect(openButton()).toBeNull();
    });
  });

  describe('Selichot', () => {
    it('has no button while the add-on is missing', () => {
      renderAt('2026-10-28T07:00', 'selichot');
      expect(screen.getByText('תוסף הסליחות')).toBeOnTheScreen();
      expect(openButton()).toBeNull();
    });

    it('has no button while only another nusach is installed', () => {
      installSelichotFixture(['sefard']);
      renderAt('2026-10-28T07:00', 'selichot');
      expect(openButton()).toBeNull();
    });

    it('opens the text out of season once the user’s nusach is installed', () => {
      installSelichotFixture();
      renderAt('2026-10-28T07:00', 'selichot');
      expect(screen.getByText('עונתי · -')).toBeOnTheScreen();
      fireEvent.press(screen.getByRole('button', { name: OPEN_TEXT }));
      expect(mockPush.mock.calls[0][0]).toStrictEqual({
        pathname: '/siddur/[id]',
        params: { id: 'selichot', from: 'selichot' },
      });
    });

    it('opens it with the night’s day in season', () => {
      installSelichotFixture();
      renderAt('2025-09-15T14:00', 'selichot');
      fireEvent.press(screen.getByRole('button', { name: OPEN_TEXT }));
      expect(mockPush.mock.calls[0][0]).toStrictEqual({
        pathname: '/siddur/[id]',
        params: { id: 'selichot', date: '2025-09-15', from: 'selichot' },
      });
    });
  });

  describe('a text with a window', () => {
    it('keeps passing the window’s day, and now the mitzvah it came from', () => {
      renderAt('2026-10-28T07:00', 'shacharit');
      fireEvent.press(screen.getByRole('button', { name: OPEN_TEXT }));
      expect(mockPush.mock.calls[0][0]).toStrictEqual({
        pathname: '/siddur/[id]',
        params: { id: 'shacharit', date: '2026-10-28', from: 'shacharit' },
      });
    });

    it('keeps the window’s day for shacharit at 09:00 on a weekday', () => {
      renderAt('2026-10-28T09:00', 'shacharit');
      fireEvent.press(screen.getByRole('button', { name: OPEN_TEXT }));
      expect(mockPush.mock.calls[0][0]).toStrictEqual({
        pathname: '/siddur/[id]',
        params: { id: 'shacharit', date: '2026-10-28', from: 'shacharit' },
      });
    });

    it('opens candle lighting on a Wednesday with no date, since its window is Friday’s and a date would offer a mark ahead of time', () => {
      renderAt('2026-10-28T07:00', 'candle_lighting');
      fireEvent.press(screen.getByRole('button', { name: OPEN_TEXT }));
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush.mock.calls[0][0]).toStrictEqual({
        pathname: '/siddur/[id]',
        params: { id: 'candle_lighting', from: 'candle_lighting' },
      });
    });

    it('passes the date of candle lighting once Friday is the day in effect', () => {
      renderAt('2026-10-30T10:00', 'candle_lighting');
      fireEvent.press(screen.getByRole('button', { name: OPEN_TEXT }));
      expect(mockPush.mock.calls[0][0]).toStrictEqual({
        pathname: '/siddur/[id]',
        params: { id: 'candle_lighting', date: '2026-10-30', from: 'candle_lighting' },
      });
    });

    it('opens a text linked to a mitzvah by the mitzvah’s id when the window has it', () => {
      renderAt('2026-10-28T07:00', 'krias_shma_al_hamita');
      fireEvent.press(screen.getByRole('button', { name: OPEN_TEXT }));
      expect(mockPush.mock.calls[0][0]).toStrictEqual({
        pathname: '/siddur/[id]',
        params: { id: 'krias_shma_al_hamita', date: '2026-10-28', from: 'krias_shma_al_hamita' },
      });
    });
  });

  describe('a custom mitzvah', () => {
    const CUSTOM_ID = 'custom_1800000000000_abc';
    const addCustom = (contentBlocks?: ContentBlock[]) =>
      useCustomMitzvotStore.getState().add({
        id: CUSTOM_ID,
        name: 'לימוד',
        startHHMM: '10:00',
        endHHMM: '11:00',
        reminders: [{ anchor: 'start', offsetMin: 0, label: 'התחלה' }],
        skipOn: [],
        createdAt: 1800000000000,
        contentBlocks,
      });

    it('offers the button for a text block and opens it with its window’s day', () => {
      addCustom([{ type: 'text', he: 'נוסח אישי' }]);
      renderAt('2026-10-28T07:00', CUSTOM_ID);
      fireEvent.press(screen.getByRole('button', { name: OPEN_TEXT }));
      expect(mockPush.mock.calls[0][0]).toStrictEqual({
        pathname: '/siddur/[id]',
        params: { id: CUSTOM_ID, date: '2026-10-28', from: CUSTOM_ID },
      });
    });

    it('offers no button without a content block', () => {
      addCustom();
      renderAt('2026-10-28T07:00', CUSTOM_ID);
      expect(openButton()).toBeNull();
    });

    it('offers no button for a link or a siddur block, which never make a text', () => {
      addCustom([
        { type: 'link', he: 'קישור', url: 'https://example.com' },
        { type: 'siddur', he: 'ברכת המזון', textId: 'birkat_hamazon' },
      ]);
      renderAt('2026-10-28T07:00', CUSTOM_ID);
      expect(screen.getByText('פתח בסידור')).toBeOnTheScreen();
      expect(openButton()).toBeNull();
    });

    it('opens a siddur content block from the mitzvah it sits in', () => {
      addCustom([{ type: 'siddur', he: 'ברכת המזון', textId: 'birkat_hamazon' }]);
      renderAt('2026-10-28T07:00', CUSTOM_ID);
      fireEvent.press(screen.getByText('פתח בסידור'));
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush.mock.calls[0][0]).toStrictEqual({
        pathname: '/siddur/[id]',
        params: { id: 'birkat_hamazon', from: CUSTOM_ID },
      });
    });
  });

  describe('Chok LeYisrael', () => {
    it('has no button until the add-on is installed', () => {
      renderAt('2026-11-18T12:00', 'chok_leyisrael');
      expect(openButton()).toBeNull();
    });

    it('opens the reader with no date, from this mitzvah, once installed', () => {
      installChokFixture();
      renderAt('2026-11-18T12:00', 'chok_leyisrael');
      fireEvent.press(screen.getByRole('button', { name: OPEN_TEXT }));
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush.mock.calls[0][0]).toStrictEqual({
        pathname: '/siddur/[id]',
        params: { id: 'chok_leyisrael', from: 'chok_leyisrael' },
      });
    });
  });
});
