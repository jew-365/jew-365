const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/services/PlacesService', () => ({
  loadPlaces: jest.fn(async () => jest.requireActual('@/testing/places').placesIndex()),
}));

import { act, fireEvent, screen } from '@testing-library/react-native';
import OnboardingLocationScreen from '../onboarding/location';
import { CITIES, findCityById, getLocationName } from '@/data/cities';
import { translate } from '@/i18n';
import { LocationService } from '@/services/LocationService';
import { renderWithTheme } from '@/testing/render';
import { useUserStore } from '@/stores/useUserStore';

const he = (key: string, params?: Record<string, string>) => translate(key, params, 'he', null);
const continueButton = () => screen.getByRole('button', { name: he('common.continue') });
const allow = () => screen.getByRole('button', { name: he('onboarding.locationAllow') });
const openPicker = (place: string) =>
  fireEvent.press(screen.getByRole('button', { name: he('location.pick.open', { place }) }));

describe('the onboarding location step', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ language: 'he', locationStatus: 'missing' });
    mockPush.mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it('asks for the location first, and with it the times follow the phone', async () => {
    const telAviv = findCityById('tel-aviv')!;
    const lookup = jest
      .spyOn(LocationService, 'getCurrentLocation')
      .mockResolvedValue({ location: telAviv, status: 'ready', source: 'gps' });
    renderWithTheme(<OnboardingLocationScreen />);
    expect(continueButton()).toBeDisabled();
    expect(screen.getByText(he('onboarding.locationAllowHint'))).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(allow());
    });
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(useUserStore.getState()).toMatchObject({
      location: telAviv,
      locationStatus: 'ready',
      locationSource: 'gps',
    });
    expect(screen.getByText(he('settings.locationFollows'))).toBeOnTheScreen();
    expect(continueButton()).toBeEnabled();
  });

  it('without the permission, any place is picked by searching for it', async () => {
    jest
      .spyOn(LocationService, 'getCurrentLocation')
      .mockResolvedValue({ location: null, status: 'denied', source: 'manual' });
    renderWithTheme(<OnboardingLocationScreen />);
    await act(async () => {
      fireEvent.press(allow());
    });
    expect(screen.getByText(he('settings.locationStatus.denied'))).toBeOnTheScreen();
    expect(continueButton()).toBeDisabled();

    openPicker(getLocationName(CITIES[0], 'he'));
    await act(async () => {});
    fireEvent.changeText(screen.getByLabelText(he('location.pick.search')), 'ביתר עילית');
    await act(async () => {});
    fireEvent.press(screen.getByText('ביתר עילית'));

    expect(useUserStore.getState()).toMatchObject({
      location: { placeId: 'c3780', name: 'ביתר עילית', tz: 'Asia/Jerusalem', inIsrael: true },
      locationStatus: 'ready',
      locationSource: 'manual',
    });
    expect(screen.getByText(he('settings.locationPicked'))).toBeOnTheScreen();
    expect(continueButton()).toBeEnabled();
  });

  it('keeps a place already picked when the location is then refused', async () => {
    jest
      .spyOn(LocationService, 'getCurrentLocation')
      .mockResolvedValue({ location: null, status: 'denied', source: 'manual' });
    renderWithTheme(<OnboardingLocationScreen />);
    openPicker(getLocationName(CITIES[0], 'he'));
    fireEvent.press(screen.getByText(getLocationName(CITIES[1], 'he')));
    await act(async () => {
      fireEvent.press(allow());
    });
    expect(useUserStore.getState()).toMatchObject({ location: CITIES[1], locationStatus: 'ready' });
    expect(continueButton()).toBeEnabled();
  });

  it('says so when no place has that name', async () => {
    renderWithTheme(<OnboardingLocationScreen />);
    openPicker(getLocationName(CITIES[0], 'he'));
    await act(async () => {});
    fireEvent.changeText(screen.getByLabelText(he('location.pick.search')), 'ןןןןזזז');
    await act(async () => {});
    expect(screen.getByText(he('location.pick.none'))).toBeOnTheScreen();
  });
});
