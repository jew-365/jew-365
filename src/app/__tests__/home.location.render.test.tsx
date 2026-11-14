const mockPush = jest.fn();
const mockNavigation = { isFocused: () => true, addListener: () => () => {} };

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }), useNavigation: () => mockNavigation }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));
jest.mock('@/services/NotificationScheduler', () => ({
  NotificationScheduler: {
    cancelForMitzvah: async () => {},
    settleCheckIn: async () => {},
    rebuild: async () => {},
  },
  syncNotificationPermissionStatus: async () => {},
  dismissCompletedPresentedNotifications: async () => {},
  refreshSchedulingOnForeground: async () => {},
}));

import { fireEvent, screen } from '@testing-library/react-native';
import HomeScreen from '../(tabs)/home';
import { CITIES, getLocationName } from '@/data/cities';
import { translate } from '@/i18n';
import type { LocationStatus } from '@/services/LocationService';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';

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

const banner = (language: 'he' | 'en') =>
  translate('home.noLocation', { city: getLocationName(JERUSALEM, language) }, language, null);

function renderWith(locationStatus: LocationStatus, language: 'he' | 'en' = 'he') {
  useUserStore.setState({ locationStatus, language });
  jest.useFakeTimers({ now: at(JERUSALEM, '2026-10-28T12:00'), doNotFake: [...ONLY_DATE] });
  return renderWithTheme(<HomeScreen />);
}

describe('home without a confirmed place', () => {
  beforeEach(() => {
    mockPush.mockClear();
    useUserStore.getState().reset();
    useUserStore.setState({
      location: JERUSALEM,
      inIsrael: true,
      nusach: 'ashkenaz',
      isOnboarded: true,
      locationSource: 'manual',
      notificationsEnabled: true,
      notificationPermission: 'granted',
      gender: 'male',
      maritalStatus: 'single',
    });
    useCompletionsStore.getState().reset();
    useCustomMitzvotStore.getState().reset();
    useMitzvotStore.setState({ activeMitzvot: { maariv: { enabled: true } } });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each<LocationStatus>(['denied', 'missing'])(
    'names the place the times follow when the location is %s, and opens the place setting',
    (status) => {
      renderWith(status);
      fireEvent.press(screen.getByText(banner('he')));
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/(tabs)/settings', params: { focus: 'location' } });
    },
  );

  it('says it in English too', () => {
    renderWith('denied', 'en');
    expect(screen.getByText(banner('en'))).toBeOnTheScreen();
  });

  it('shows no such banner once a place is confirmed', () => {
    renderWith('ready');
    expect(screen.queryByText(banner('he'))).toBeNull();
  });
});
