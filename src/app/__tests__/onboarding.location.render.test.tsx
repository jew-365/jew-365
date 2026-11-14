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
import { Keyboard } from 'react-native';
import OnboardingLocationScreen from '../onboarding/location';
import { CITIES, findCityById, getLocationName } from '@/data/cities';
import { translate } from '@/i18n';
import { LocationService } from '@/services/LocationService';
import { renderWithTheme } from '@/testing/render';
import { useUserStore } from '@/stores/useUserStore';

const he = (key: string, params?: Record<string, string>) => translate(key, params, 'he', null);
const en = (key: string, params?: Record<string, string>) => translate(key, params, 'en', null);
const continueButton = () => screen.getByRole('button', { name: he('common.continue') });
const openPicker = (place: string) =>
  fireEvent.press(screen.getByRole('button', { name: he('location.pick.open', { place }) }));
const continueHint = () => he('onboarding.locationContinueHint', { city: getLocationName(CITIES[0], 'he') });

describe('the onboarding location step', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ language: 'he', locationStatus: 'missing' });
    mockPush.mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it('asks for the location on Continue, and with it the times follow the phone', async () => {
    const telAviv = findCityById('tel-aviv')!;
    const lookup = jest
      .spyOn(LocationService, 'getCurrentLocation')
      .mockResolvedValue({ location: telAviv, status: 'ready', source: 'gps' });
    renderWithTheme(<OnboardingLocationScreen />);
    expect(continueButton()).toBeEnabled();
    expect(screen.getByText(continueHint())).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(continueButton());
    });
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(useUserStore.getState()).toMatchObject({
      location: telAviv,
      locationStatus: 'ready',
      locationSource: 'gps',
    });
    expect(mockPush).toHaveBeenCalledWith('/onboarding/permissions');
  });

  it('continues with the default place when the location is refused', async () => {
    jest
      .spyOn(LocationService, 'getCurrentLocation')
      .mockResolvedValue({ location: null, status: 'denied', source: 'manual' });
    renderWithTheme(<OnboardingLocationScreen />);
    await act(async () => {
      fireEvent.press(continueButton());
    });
    expect(useUserStore.getState()).toMatchObject({ location: CITIES[0], locationStatus: 'denied' });
    expect(mockPush).toHaveBeenCalledWith('/onboarding/permissions');
  });

  it('continues when the lookup itself fails', async () => {
    jest.spyOn(LocationService, 'getCurrentLocation').mockRejectedValue(new Error('no location services'));
    renderWithTheme(<OnboardingLocationScreen />);
    await act(async () => {
      fireEvent.press(continueButton());
    });
    expect(useUserStore.getState()).toMatchObject({ location: CITIES[0], locationStatus: 'missing' });
    expect(mockPush).toHaveBeenCalledWith('/onboarding/permissions');
  });

  it('a place picked by searching for it continues without asking for the location', async () => {
    const lookup = jest.spyOn(LocationService, 'getCurrentLocation');
    renderWithTheme(<OnboardingLocationScreen />);
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
    expect(screen.queryByText(continueHint())).toBeNull();
    await act(async () => {
      fireEvent.press(continueButton());
    });
    expect(lookup).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/onboarding/permissions');
  });

  it('has no button that asks to allow before the system prompt (App Review 5.1.1(iv))', () => {
    useUserStore.setState({ language: 'en' });
    renderWithTheme(<OnboardingLocationScreen />);
    const names = screen.getAllByRole('button').map((button) => String(button.props.accessibilityLabel ?? ''));
    expect(names.join(' | ')).not.toMatch(/allow|enable|grant/i);
    expect(screen.queryByText(/allow|enable|grant/i)).toBeNull();
    expect(screen.getByRole('button', { name: en('common.continue') })).toBeEnabled();
  });

  it('drops the hint and the sources line while the keyboard is up, so the results keep the room', async () => {
    const listeners: Record<string, () => void> = {};
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, listener: () => void) => {
      listeners[event] = listener;
      return { remove: jest.fn() };
    }) as never);
    renderWithTheme(<OnboardingLocationScreen />);
    openPicker(getLocationName(CITIES[0], 'he'));
    await act(async () => {});
    expect(screen.getByText(he('location.pick.hint'))).toBeOnTheScreen();
    expect(screen.getByText(he('location.pick.credit'))).toBeOnTheScreen();
    act(() => listeners.keyboardDidShow());
    expect(screen.queryByText(he('location.pick.hint'))).toBeNull();
    expect(screen.queryByText(he('location.pick.credit'))).toBeNull();
    act(() => listeners.keyboardDidHide());
    expect(screen.getByText(he('location.pick.credit'))).toBeOnTheScreen();
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
