const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/components/PermissionsList', () => ({ PermissionsList: () => null }));
jest.mock('@/services/NotificationScheduler', () => ({
  requestNotificationPermissions: jest.fn(async () => true),
  syncNotificationPermissionStatus: jest.fn(async () => {}),
  NotificationScheduler: { rebuild: jest.fn(async () => {}) },
}));

import type { ComponentType } from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import WelcomeScreen from '../onboarding/index';
import OnboardingLocationScreen from '../onboarding/location';
import OnboardingMitzvotScreen from '../onboarding/mitzvot';
import NusachScreen from '../onboarding/nusach';
import PermissionsScreen from '../onboarding/permissions';
import ProfileScreen from '../onboarding/profile';
import ReadyScreen from '../onboarding/ready';
import { ONBOARDING_STEPS, OnboardingDots } from '@/components/OnboardingDots';
import { CITIES, getLocationName } from '@/data/cities';
import { translate } from '@/i18n';
import { renderWithTheme } from '@/testing/render';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';

const he = (key: string) => translate(key, undefined, 'he', null);

describe('Onboarding Continue buttons', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ language: 'he' });
    useMitzvotStore.getState().reset();
    mockPush.mockClear();
  });

  it('keeps Continue on the profile step disabled until gender and status are chosen', () => {
    renderWithTheme(<ProfileScreen />);
    const next = () => screen.getByRole('button', { name: he('common.continue') });
    expect(next()).toBeDisabled();

    fireEvent.press(screen.getByText(he('profile.gender.male')));
    fireEvent.press(screen.getByText(he('profile.maritalStatus.married.male')));

    expect(next()).toBeEnabled();
    fireEvent.press(next());
    expect(mockPush).toHaveBeenCalledWith('/onboarding/nusach');
  });

  it('keeps Continue on the location step disabled until the location is confirmed', async () => {
    useUserStore.setState({ locationStatus: 'missing' });
    renderWithTheme(<OnboardingLocationScreen />);
    await act(async () => {});
    const next = () => screen.getByRole('button', { name: he('common.continue') });
    expect(next()).toBeDisabled();
    expect(screen.getByText(he('onboarding.locationRequired'))).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: getLocationName(CITIES[0], 'he') }));

    expect(next()).toBeEnabled();
    fireEvent.press(next());
    expect(mockPush).toHaveBeenCalledWith('/onboarding/permissions');
  });

  it('Continue on the permissions step is enabled and goes to ready', () => {
    renderWithTheme(<PermissionsScreen />);
    const next = screen.getByRole('button', { name: he('common.continue') });
    expect(next).toBeEnabled();
    fireEvent.press(next);
    expect(mockPush).toHaveBeenCalledWith('/onboarding/ready');
  });

  it('Continue on the nusach step goes to the mitzvot step', () => {
    renderWithTheme(<NusachScreen />);
    fireEvent.press(screen.getByRole('button', { name: he('common.continue') }));
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/onboarding/mitzvot');
  });

  it('the ready step lists the enabled mitzvot by name, and its edit link opens the mitzvot step', () => {
    useMitzvotStore.setState({ activeMitzvot: { shacharit: { enabled: true }, mincha: { enabled: true } } });
    renderWithTheme(<ReadyScreen />);
    expect(screen.getByText('תפילת שחרית · תפילת מנחה')).toBeOnTheScreen();

    fireEvent.press(screen.getByText(he('onboarding.readyEdit')));
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/onboarding/mitzvot', params: { from: 'ready' } });
  });

  it.each<[string, ComponentType, number]>([
    ['welcome', WelcomeScreen, 0],
    ['profile', ProfileScreen, 1],
    ['nusach', NusachScreen, 2],
    ['mitzvot', OnboardingMitzvotScreen, 3],
    ['location', OnboardingLocationScreen, 4],
    ['permissions', PermissionsScreen, 5],
    ['ready', ReadyScreen, 6],
  ])('draws the %s step as dot %i of ONBOARDING_STEPS', async (_name, Screen, step) => {
    renderWithTheme(<Screen />);
    await act(async () => {});
    expect(screen.UNSAFE_getByType(OnboardingDots).props).toMatchObject({ step, total: ONBOARDING_STEPS });
  });

  it('counts seven onboarding steps', () => {
    expect(ONBOARDING_STEPS).toBe(7);
  });
});
