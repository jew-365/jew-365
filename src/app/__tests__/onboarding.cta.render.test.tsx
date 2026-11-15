const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/components/PermissionsList', () => ({ PermissionsList: () => null }));
jest.mock('@/services/NotificationScheduler', () => ({
  requestNotificationPermissions: jest.fn(async () => true),
  askForNotifications: jest.fn(async () => 'granted'),
  presentSampleReminder: jest.fn(async () => 'sent'),
  nextReminderAt: jest.fn(() => null),
  syncNotificationPermissionStatus: jest.fn(async () => {}),
  NotificationScheduler: { rebuild: jest.fn(async () => {}) },
}));

import type { ComponentType } from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import OnboardingBundlesScreen from '../onboarding/bundles';
import WelcomeScreen from '../onboarding/index';
import OnboardingLocationScreen from '../onboarding/location';
import OnboardingMitzvotScreen from '../onboarding/mitzvot';
import NusachScreen from '../onboarding/nusach';
import PermissionsScreen from '../onboarding/permissions';
import ReadyScreen from '../onboarding/ready';
import OnboardingZmanimScreen from '../onboarding/zmanim';
import { ONBOARDING_STEPS, OnboardingDots } from '@/components/OnboardingDots';
import { CITIES, getLocationName } from '@/data/cities';
import { translate } from '@/i18n';
import { NotificationScheduler } from '@/services/NotificationScheduler';
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
    mockBack.mockClear();
  });

  it('lets the welcome step continue with the name and the gender unanswered, the gender marked optional', () => {
    renderWithTheme(<WelcomeScreen />);
    expect(screen.getByLabelText(he('onboarding.genderLabel'))).toHaveProp('accessibilityRole', 'radiogroup');
    expect(he('onboarding.genderLabel')).toContain('לא חובה');

    const next = screen.getByRole('button', { name: he('common.continue') });
    expect(next).toBeEnabled();
    fireEvent.press(next);

    expect(mockPush).toHaveBeenCalledWith('/onboarding/nusach');
    expect(useUserStore.getState().gender).toBeNull();
    expect(useUserStore.getState().maritalStatus).toBeNull();
  });

  it('keeps a gender chosen on the welcome step, with its defaults, and asks nothing about marital status', () => {
    renderWithTheme(<WelcomeScreen />);
    fireEvent.press(screen.getByText(he('profile.gender.female')));
    expect(useUserStore.getState().gender).toBe('female');
    expect(useUserStore.getState().siddurVoice).toBe('female');
    expect(useMitzvotStore.getState().activeMitzvot.tefillin?.enabled).toBe(false);
    expect(screen.queryByText(/משפחתי/)).toBeNull();
    expect(screen.queryByText(he('onboarding.phoneLabel'))).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: he('common.continue') }));
    expect(mockPush).toHaveBeenCalledWith('/onboarding/nusach');
  });

  it('never disables Continue on the location step, so setup goes on without Location Services', async () => {
    useUserStore.setState({ locationStatus: 'missing' });
    renderWithTheme(<OnboardingLocationScreen />);
    await act(async () => {});
    const next = () => screen.getByRole('button', { name: he('common.continue') });
    expect(next()).toBeEnabled();
    expect(
      screen.getByText(
        translate('onboarding.locationContinueHint', { city: getLocationName(CITIES[0], 'he') }, 'he', null),
      ),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByRole('button', {
        name: translate('location.pick.open', { place: getLocationName(CITIES[0], 'he') }, 'he', null),
      }),
    );
    fireEvent.press(screen.getByText(getLocationName(CITIES[1], 'he')));

    expect(next()).toBeEnabled();
    await act(async () => {
      fireEvent.press(next());
    });
    expect(mockPush).toHaveBeenCalledWith('/onboarding/bundles');
  });

  it('Continue on the bundles step goes to the notification step', async () => {
    renderWithTheme(<OnboardingBundlesScreen />);
    await act(async () => {});
    fireEvent.press(screen.getByRole('button', { name: he('common.continue') }));
    expect(mockPush).toHaveBeenCalledWith('/onboarding/permissions');
  });

  it('Continue on the notification step asks for notifications, then goes to the ready step', async () => {
    const { askForNotifications } = jest.requireMock('@/services/NotificationScheduler');
    askForNotifications.mockClear();
    renderWithTheme(<PermissionsScreen />);
    const allow = screen.getByRole('button', { name: he('common.continue') });
    expect(allow).toBeEnabled();
    await act(async () => {
      fireEvent.press(allow);
    });
    expect(askForNotifications).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/onboarding/ready');
  });

  it('has one button before the prompt, which moves on after a refusal too (App Review 5.1.1(iv))', async () => {
    const { askForNotifications } = jest.requireMock('@/services/NotificationScheduler');
    askForNotifications.mockClear();
    askForNotifications.mockResolvedValueOnce('refused');
    useUserStore.setState({ language: 'en' });
    renderWithTheme(<PermissionsScreen />);
    expect(screen.queryByText(/not now|allow/i)).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    });
    expect(askForNotifications).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/onboarding/ready');
  });

  it('Continue on the nusach step goes to the location step', () => {
    renderWithTheme(<NusachScreen />);
    fireEvent.press(screen.getByRole('button', { name: he('common.continue') }));
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/onboarding/location');
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
    // An install that finished this setup is never offered the catch-up.
    expect(useUserStore.getState().discovery.hints).toContain('newSetup');
  });

  it.each<[string, ComponentType, number]>([
    ['welcome', WelcomeScreen, 0],
    ['nusach', NusachScreen, 1],
    ['location', OnboardingLocationScreen, 2],
    ['bundles', OnboardingBundlesScreen, 3],
    ['permissions', PermissionsScreen, 4],
    ['ready', ReadyScreen, 5],
  ])('draws the %s step as dot %i of ONBOARDING_STEPS', async (_name, Screen, step) => {
    renderWithTheme(<Screen />);
    await act(async () => {});
    expect(screen.UNSAFE_getByType(OnboardingDots).props).toMatchObject({ step, total: ONBOARDING_STEPS });
  });

  it('counts six onboarding steps, and the two detail screens draw no dots', async () => {
    expect(ONBOARDING_STEPS).toBe(6);
    for (const Screen of [OnboardingMitzvotScreen, OnboardingZmanimScreen]) {
      const view = renderWithTheme(<Screen />);
      await act(async () => {});
      expect(screen.UNSAFE_queryByType(OnboardingDots)).toBeNull();
      view.unmount();
    }
  });

  it("the times screen: the carousel's list, a star saved, and Continue back to the setup", async () => {
    renderWithTheme(<OnboardingZmanimScreen />);
    await act(async () => {});
    expect(screen.getByText(he('onboarding.zmanim.title'))).toBeOnTheScreen();
    expect(screen.getByTestId('zmanim-row-alot')).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByTestId('zmanim-star-plag')));
    expect(useUserStore.getState().zmanPins).toEqual(['plag']);
    fireEvent.press(screen.getByRole('button', { name: he('common.continue') }));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
