const mockPush = jest.fn();
const mockNavigation = { isFocused: () => true, addListener: () => () => {} };

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }), useNavigation: () => mockNavigation }));
jest.mock('expo-status-bar', () => ({ setStatusBarStyle: jest.fn() }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));
jest.mock('@/services/NotificationScheduler', () => ({
  NotificationScheduler: { cancelForMitzvah: async () => {}, settleCheckIn: async () => {}, rebuild: async () => {} },
  syncNotificationPermissionStatus: async () => {},
  dismissCompletedPresentedNotifications: async () => {},
  refreshSchedulingOnForeground: async () => {},
}));

import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import HomeScreen from '../(tabs)/home';
import { CITIES } from '@/data/cities';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';
import * as timeline from '@/utils/buildDayTimeline';

const JERUSALEM = CITIES[0];
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

describe('home on a mark', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({
      language: 'he',
      location: JERUSALEM,
      inIsrael: true,
      nusach: 'ashkenaz',
      isOnboarded: true,
      locationStatus: 'ready',
      locationSource: 'manual',
      notificationsEnabled: true,
      notificationPermission: 'granted',
      gender: 'male',
      maritalStatus: 'single',
    });
    useCompletionsStore.getState().reset();
    useCustomMitzvotStore.getState().reset();
    useMitzvotStore.setState({ activeMitzvot: { maariv: { enabled: true } } });
    jest.useFakeTimers({ now: at(JERUSALEM, '2027-06-15T00:20'), doNotFake: [...ONLY_DATE] });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('computes the day model once for a mark, the stamp start and the stamp end included', async () => {
    const windows = jest.spyOn(timeline, 'appDayWindow');
    renderWithTheme(<HomeScreen />);
    const settled = windows.mock.calls.length;
    expect(settled).toBeGreaterThan(0);

    fireEvent.press(screen.getByRole('button', { name: 'סמן תפילת ערבית כהושלם' }));
    expect(screen.getByText('נעשה!')).toBeOnTheScreen();
    expect(windows.mock.calls.length - settled).toBe(1);

    await waitFor(() => expect(screen.queryByText('נעשה!')).toBeNull(), { timeout: 3000 });
    expect(windows.mock.calls.length - settled).toBe(1);
    expect(screen.getByRole('button', { name: 'ביטול סימון — תפילת ערבית' })).toBeOnTheScreen();
  });
});
