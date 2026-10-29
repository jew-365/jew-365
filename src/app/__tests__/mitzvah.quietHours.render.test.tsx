const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace, canGoBack: () => true }),
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

import { act, cleanup, screen } from '@testing-library/react-native';
import MitzvahDetailScreen from '../mitzvah/[id]';
import { CITIES } from '@/data/cities';
import { t } from '@/i18n';
import { useChokStore } from '@/stores/useChokStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { at, zmanimFor } from '@/testing/zmanim';
import { fireTimeText } from '@/utils/clock';

const J = CITIES[0];
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
const FIRST_HOUR = { enabled: true, minutes: 420 };
const HEADER_AT_SEVEN = 'ההתראה הבאה תישלח ב-28/10 07:00';
const ROW_AT_SEVEN = 'הבאה ב-28/10 07:00';

function renderMitzvah(params: Record<string, string>) {
  mockParams = params;
  return renderWithTheme(<MitzvahDetailScreen />);
}

describe('Mitzvah screen with quiet hours', () => {
  const netz = zmanimFor(at(J, '2026-10-28T12:00'), J).netzHaChama;

  beforeEach(() => {
    jest.useFakeTimers({ now: at(J, '2026-10-28T04:00'), doNotFake: [...ONLY_DATE] });
    useUserStore.getState().reset();
    useUserStore.setState({
      language: 'he',
      location: J,
      inIsrael: true,
      nusach: 'ashkenaz',
      isOnboarded: true,
    });
    useMitzvotStore.getState().reset();
    useChokStore.getState().reset();
    mockPush.mockReset();
    mockBack.mockReset();
    mockReplace.mockReset();
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
    useChokStore.getState().reset();
    useSelichotStore.getState().reset();
  });

  it('names the first hour in the header and in the row of a reminder that was due earlier', () => {
    expect(netz.getTime()).toBeLessThan(at(J, '2026-10-28T07:00').getTime());
    useUserStore.getState().setQuietBefore(FIRST_HOUR);
    renderMitzvah({ id: 'shacharit' });
    expect(screen.getByText(HEADER_AT_SEVEN)).toBeOnTheScreen();
    expect(screen.getByText(ROW_AT_SEVEN)).toBeOnTheScreen();
  });

  it('names the reminder at its own time with no quiet hours', () => {
    renderMitzvah({ id: 'shacharit' });
    expect(screen.getByText(t('detail.previewNext', { time: fireTimeText(netz, J.tz) }))).toBeOnTheScreen();
  });

  it('updates the header when the first hour is set while the screen is open', () => {
    renderMitzvah({ id: 'shacharit' });
    expect(screen.queryByText(HEADER_AT_SEVEN)).toBeNull();

    act(() => useUserStore.getState().setQuietBefore(FIRST_HOUR));

    expect(screen.getByText(HEADER_AT_SEVEN)).toBeOnTheScreen();
    expect(screen.getByText(ROW_AT_SEVEN)).toBeOnTheScreen();
  });
});
