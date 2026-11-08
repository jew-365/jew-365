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
import NoticeScreen from '../onboarding/notice';
import NusachScreen from '../onboarding/nusach';
import PermissionsScreen from '../onboarding/permissions';
import ProfileScreen from '../onboarding/profile';
import ReadyScreen from '../onboarding/ready';
import { ONBOARDING_STEPS, OnboardingDots } from '@/components/OnboardingDots';
import { CITIES, getLocationName } from '@/data/cities';
import { translate } from '@/i18n';
import { NotificationScheduler } from '@/services/NotificationScheduler';
import { renderWithTheme } from '@/testing/render';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';

const he = (key: string) => translate(key, undefined, 'he', null);
const en = (key: string) => translate(key, undefined, 'en', null);

describe('Onboarding Continue buttons', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ language: 'he' });
    useMitzvotStore.getState().reset();
    mockPush.mockClear();
  });

  it('lets the profile step continue with gender and marital status unanswered, both marked optional', () => {
    renderWithTheme(<ProfileScreen />);
    expect(screen.getByLabelText(he('onboarding.genderLabel'))).toHaveProp('accessibilityRole', 'radiogroup');
    expect(screen.getByLabelText(he('onboarding.maritalStatusLabel'))).toHaveProp('accessibilityRole', 'radiogroup');
    expect(he('onboarding.genderLabel')).toContain('לא חובה');
    expect(he('onboarding.maritalStatusLabel')).toContain('לא חובה');

    const next = screen.getByRole('button', { name: he('common.continue') });
    expect(next).toBeEnabled();
    fireEvent.press(next);

    expect(mockPush).toHaveBeenCalledWith('/onboarding/nusach');
    expect(useUserStore.getState().gender).toBeNull();
    expect(useUserStore.getState().maritalStatus).toBeNull();
  });

  it('continues from the profile step with both answers given and keeps them', () => {
    renderWithTheme(<ProfileScreen />);
    fireEvent.press(screen.getByText(he('profile.gender.male')));
    fireEvent.press(screen.getByText(he('profile.maritalStatus.married.male')));

    fireEvent.press(screen.getByRole('button', { name: he('common.continue') }));

    expect(mockPush).toHaveBeenCalledWith('/onboarding/nusach');
    expect(useUserStore.getState().gender).toBe('male');
    expect(useUserStore.getState().maritalStatus).toBe('married');
  });

  it('keeps Continue on the location step disabled until the location is confirmed', async () => {
    useUserStore.setState({ locationStatus: 'missing' });
    renderWithTheme(<OnboardingLocationScreen />);
    await act(async () => {});
    const next = () => screen.getByRole('button', { name: he('common.continue') });
    expect(next()).toBeDisabled();
    expect(screen.getByText(he('onboarding.locationRequired'))).toBeOnTheScreen();

    fireEvent.press(
      screen.getByRole('button', {
        name: translate('location.pick.open', { place: getLocationName(CITIES[0], 'he') }, 'he', null),
      }),
    );
    fireEvent.press(screen.getByText(getLocationName(CITIES[1], 'he')));

    expect(next()).toBeEnabled();
    fireEvent.press(next());
    expect(mockPush).toHaveBeenCalledWith('/onboarding/permissions');
  });

  it('Continue on the permissions step is enabled and goes to the important notice', () => {
    renderWithTheme(<PermissionsScreen />);
    const next = screen.getByRole('button', { name: he('common.continue') });
    expect(next).toBeEnabled();
    fireEvent.press(next);
    expect(mockPush).toHaveBeenCalledWith('/onboarding/notice');
  });

  it("the important notice says the times are the user's responsibility and where to report a mistake", () => {
    renderWithTheme(<NoticeScreen />);
    expect(screen.getByRole('header', { name: he('accuracy.title') })).toBeOnTheScreen();
    for (const key of ['accuracy.effort', 'accuracy.responsibility', 'accuracy.report']) {
      expect(screen.getByText(he(key))).toBeOnTheScreen();
    }
    expect(he('accuracy.report')).toContain(he('settings.contact'));
    expect(en('accuracy.report')).toContain(en('settings.contact'));
    fireEvent.press(screen.getByRole('button', { name: he('onboarding.noticeAccept') }));
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

  it('the ready step marks onboarding done before it rebuilds the schedule', async () => {
    const seen: boolean[] = [];
    jest.mocked(NotificationScheduler.rebuild).mockImplementationOnce(async () => {
      seen.push(useUserStore.getState().isOnboarded);
    });
    renderWithTheme(<ReadyScreen />);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: he('onboarding.finish') }));
    });

    expect(seen).toEqual([true]);
  });

  it.each<[string, ComponentType, number]>([
    ['welcome', WelcomeScreen, 0],
    ['profile', ProfileScreen, 1],
    ['nusach', NusachScreen, 2],
    ['mitzvot', OnboardingMitzvotScreen, 3],
    ['location', OnboardingLocationScreen, 4],
    ['permissions', PermissionsScreen, 5],
    ['notice', NoticeScreen, 6],
    ['ready', ReadyScreen, 7],
  ])('draws the %s step as dot %i of ONBOARDING_STEPS', async (_name, Screen, step) => {
    renderWithTheme(<Screen />);
    await act(async () => {});
    expect(screen.UNSAFE_getByType(OnboardingDots).props).toMatchObject({ step, total: ONBOARDING_STEPS });
  });

  it('counts eight onboarding steps', () => {
    expect(ONBOARDING_STEPS).toBe(8);
  });
});
