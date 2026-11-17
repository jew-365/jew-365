let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (effect: () => void) => React.useEffect(() => effect(), [effect]),
  };
});
jest.mock('@/services/NotificationScheduler', () => ({
  NotificationScheduler: { rebuild: jest.fn(async () => {}), cancelAll: jest.fn(async () => {}) },
  requestNotificationPermissions: jest.fn(async () => true),
  availableNotificationSounds: jest.fn(async () => ['bells']),
  previewNotificationSound: jest.fn(async () => true),
  syncNotificationPermissionStatus: jest.fn(async () => true),
  notificationPermissionState: jest.fn(async () => 'granted'),
}));
jest.mock('@/services/PlacesService', () => ({
  loadPlaces: jest.fn(async () => jest.requireActual('@/testing/places').placesIndex()),
}));
jest.mock('@/services/backgroundLocation', () => ({
  backgroundLocationSupported: jest.fn(async () => true),
  backgroundLocationActive: jest.fn(async () => false),
  enableBackgroundLocation: jest.fn(async () => 'on'),
  disableBackgroundLocation: jest.fn(async () => {}),
  syncBackgroundLocation: jest.fn(async () => {}),
}));

import { act, fireEvent, screen, within } from '@testing-library/react-native';
import SettingsScreen from '../(tabs)/settings';
import { CITIES } from '@/data/cities';
import { translate } from '@/i18n';
import { LocationService } from '@/services/LocationService';
import { renderWithTheme } from '@/testing/render';
import { useUserStore } from '@/stores/useUserStore';

const service = jest.requireMock('@/services/backgroundLocation') as Record<string, jest.Mock>;
const he = (key: string) => translate(key, undefined, 'he', null);
const LABEL = 'לעדכן את המיקום גם כשהאפליקציה סגורה';
const row = () => screen.queryByTestId('settings-background-location');
const toggle = () => screen.getByRole('switch', { name: LABEL });

async function openLocation(status: 'ready' | 'missing' | 'denied' = 'ready', source: 'gps' | 'manual' = 'gps') {
  jest.spyOn(LocationService, 'getPermissionStatus').mockResolvedValue(status);
  useUserStore.getState().setLocationState(CITIES[0], 'ready', source);
  renderWithTheme(<SettingsScreen />);
  await act(async () => {});
  fireEvent.press(screen.getByText(he('settings.device')));
  await act(async () => {});
}

describe('Settings › my location while the app is closed', () => {
  beforeEach(() => {
    mockParams = {};
    useUserStore.getState().reset();
    useUserStore.setState({ isOnboarded: true, gender: 'male', maritalStatus: 'single', language: 'he' });
    service.backgroundLocationSupported.mockResolvedValue(true);
    service.backgroundLocationActive.mockResolvedValue(false);
    service.enableBackgroundLocation.mockClear().mockResolvedValue('on');
    service.disableBackgroundLocation.mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it('offers the switch, off, under "my location" once location access is granted', async () => {
    await openLocation();
    expect(row()).not.toBeNull();
    expect(toggle()).not.toBeChecked();
    expect(within(row()!).getByText(he('settings.backgroundLocationHint'))).toBeOnTheScreen();
  });

  it.each([
    [
      'on a binary without the permission',
      () => service.backgroundLocationSupported.mockResolvedValue(false),
      'ready',
      'gps',
    ],
    ['without location access', () => {}, 'missing', 'gps'],
    ['for a place picked by hand', () => {}, 'ready', 'manual'],
  ] as const)('shows nothing %s', async (_name, arrange, status, source) => {
    arrange();
    await openLocation(status, source);
    expect(row()).toBeNull();
  });

  it('discloses the background use before the system prompt, with Continue, and turns on only after it', async () => {
    await openLocation();
    fireEvent(toggle(), 'valueChange', true);
    expect(screen.getByText('מיקום ברקע')).toBeOnTheScreen();
    expect(screen.getByText(/גם כשהאפליקציה סגורה או לא בשימוש/)).toBeOnTheScreen();
    expect(service.enableBackgroundLocation).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /אפשר|הפעל|Allow/ })).toBeNull();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'המשך' })));
    expect(service.enableBackgroundLocation).toHaveBeenCalledTimes(1);
    expect(toggle()).toBeChecked();
  });

  it('asks nothing when the disclosure is cancelled', async () => {
    await openLocation();
    fireEvent(toggle(), 'valueChange', true);
    fireEvent.press(screen.getByRole('button', { name: 'ביטול' }));
    expect(service.enableBackgroundLocation).not.toHaveBeenCalled();
    expect(toggle()).not.toBeChecked();
  });

  it('stays off after a refusal and says how to change it', async () => {
    service.enableBackgroundLocation.mockResolvedValue('denied');
    await openLocation();
    fireEvent(toggle(), 'valueChange', true);
    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'המשך' })));
    expect(toggle()).not.toBeChecked();
    expect(within(row()!).getByText(he('settings.backgroundLocationDenied'))).toBeOnTheScreen();
  });

  it('shows a running setting as on, and switching it off stops it with no dialog', async () => {
    service.backgroundLocationActive.mockResolvedValue(true);
    await openLocation();
    expect(toggle()).toBeChecked();
    await act(async () => fireEvent(toggle(), 'valueChange', false));
    expect(service.disableBackgroundLocation).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('מיקום ברקע')).toBeNull();
    expect(toggle()).not.toBeChecked();
  });
});
