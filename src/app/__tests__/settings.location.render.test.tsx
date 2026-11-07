const mockPush = jest.fn();
const mockSetParams = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({ push: mockPush, replace: jest.fn(), setParams: mockSetParams }),
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (effect: () => void) => React.useEffect(() => effect(), [effect]),
  };
});
jest.mock('@/services/NotificationScheduler', () => ({
  NotificationScheduler: { rebuild: jest.fn(async () => {}), cancelAll: jest.fn(async () => {}) },
  requestNotificationPermissions: jest.fn(async () => true),
  syncNotificationPermissionStatus: jest.fn(async () => true),
  notificationPermissionState: jest.fn(async () => 'granted'),
}));
jest.mock('@/services/PlacesService', () => ({
  loadPlaces: jest.fn(async () => jest.requireActual('@/testing/places').placesIndex()),
}));

import { Linking } from 'react-native';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import SettingsScreen from '../(tabs)/settings';
import { CITIES, findCityById, getLocationName } from '@/data/cities';
import { translate } from '@/i18n';
import { LocationService } from '@/services/LocationService';
import { renderWithTheme } from '@/testing/render';
import { useUserStore } from '@/stores/useUserStore';

const he = (key: string, params?: Record<string, string>) => translate(key, params, 'he', null);
const permission = (status: 'ready' | 'missing' | 'denied') =>
  jest.spyOn(LocationService, 'getPermissionStatus').mockResolvedValue(status);
const block = () => within(screen.getByTestId('settings-location'));
const mode = (key: 'settings.locationGps' | 'settings.locationManual') => block().getByRole('radio', { name: he(key) });

async function openLocation() {
  renderWithTheme(<SettingsScreen />);
  await act(async () => {});
  fireEvent.press(screen.getByText(he('settings.device')));
  await act(async () => {});
}

describe('Settings › where the times are calculated', () => {
  beforeEach(() => {
    mockParams = {};
    mockPush.mockClear();
    useUserStore.getState().reset();
    useUserStore.setState({ isOnboarded: true, gender: 'male', maritalStatus: 'single', language: 'he' });
  });
  afterEach(() => jest.restoreAllMocks());

  it('follows the phone in "my location", and switches to a place picked by hand and back', async () => {
    const telAviv = findCityById('tel-aviv')!;
    permission('ready');
    const lookup = jest
      .spyOn(LocationService, 'getCurrentLocation')
      .mockResolvedValue({ location: telAviv, status: 'ready', source: 'gps' });
    useUserStore.getState().setLocationState(CITIES[0], 'ready', 'gps');
    await openLocation();
    expect(block().getByText(he('settings.locationFollows'))).toBeOnTheScreen();
    expect(mode('settings.locationGps')).toBeSelected();

    fireEvent.press(mode('settings.locationManual'));
    expect(useUserStore.getState()).toMatchObject({ location: CITIES[0], locationSource: 'manual' });
    expect(block().getByText(he('settings.locationPicked'))).toBeOnTheScreen();
    expect(block().getByText(he('settings.locationRevokeHint'))).toBeOnTheScreen();

    fireEvent.press(block().getByRole('button', { name: he('location.pick.open', { place: CITIES[0].name }) }));
    fireEvent.press(screen.getByText(getLocationName(CITIES[2], 'he')));
    expect(useUserStore.getState()).toMatchObject({ location: CITIES[2], locationSource: 'manual' });

    await act(async () => {
      fireEvent.press(mode('settings.locationGps'));
    });
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(useUserStore.getState()).toMatchObject({ location: telAviv, locationSource: 'gps' });
    expect(block().getByText(he('settings.gpsUpdated'))).toBeOnTheScreen();
  });

  it('sends the user to the phone settings to remove the permission, or to give it once blocked', async () => {
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    permission('ready');
    useUserStore.getState().setLocationState(CITIES[0], 'ready', 'manual');
    await openLocation();
    fireEvent.press(block().getByRole('link', { name: he('settings.locationOpenSettings') }));
    expect(open).toHaveBeenCalledTimes(1);
    screen.unmount();

    permission('denied');
    const lookup = jest.spyOn(LocationService, 'getCurrentLocation');
    useUserStore.getState().setLocationState(CITIES[0], 'ready', 'gps');
    await openLocation();
    expect(block().getByText(he('settings.locationNoPermission'))).toBeOnTheScreen();
    fireEvent.press(block().getByRole('button', { name: he('settings.locationOpenSettings') }));
    expect(open).toHaveBeenCalledTimes(2);
    await act(async () => {
      fireEvent.press(block().getByRole('button', { name: he('settings.useCurrentLocation') }));
    });
    expect(lookup).not.toHaveBeenCalled();
    expect(block().getByText(he('settings.locationBlocked'))).toBeOnTheScreen();
  });

  it('keeps the place when "my location" is refused', async () => {
    permission('missing');
    jest
      .spyOn(LocationService, 'getCurrentLocation')
      .mockResolvedValue({ location: null, status: 'denied', source: 'manual' });
    useUserStore.getState().setLocationState(CITIES[3], 'ready', 'manual');
    await openLocation();
    await act(async () => {
      fireEvent.press(mode('settings.locationGps'));
    });
    expect(useUserStore.getState()).toMatchObject({
      location: CITIES[3],
      locationStatus: 'ready',
      locationSource: 'manual',
    });
    expect(block().getByText(he('settings.locationBlocked'))).toBeOnTheScreen();
  });

  it('opens the picker on the place the app search found, that place first, a curated city as itself', async () => {
    permission('missing');
    mockParams = { focus: 'location', place: 'g5100280' };
    useUserStore.getState().setLocationState(CITIES[0], 'ready', 'gps');
    renderWithTheme(<SettingsScreen />);
    await act(async () => {});
    await act(async () => {});
    expect(screen.getByLabelText(he('location.pick.search')).props.value).toBe('לייקווד');
    const results = within(screen.getByTestId('place-results'));
    fireEvent.press(results.getAllByText('לייקווד')[0]);
    expect(useUserStore.getState()).toMatchObject({
      location: findCityById('lakewood'),
      locationSource: 'manual',
    });
    expect(mockSetParams).toHaveBeenCalledWith({ focus: undefined, place: undefined });
  });
});
