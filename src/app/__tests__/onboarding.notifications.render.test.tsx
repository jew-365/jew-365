const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/components/PermissionsList', () => ({ PermissionsList: () => null }));
jest.mock('@/services/NotificationScheduler', () => ({
  askForNotifications: jest.fn(async () => 'granted'),
}));

import { act, fireEvent, screen } from '@testing-library/react-native';
import PermissionsScreen from '../onboarding/permissions';
import { translate } from '@/i18n';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { SETUP_QUIET_AFTER_MIN, SETUP_QUIET_BEFORE_MIN } from '@/utils/quietHours';

const he = (key: string) => translate(key, undefined, 'he', null);
const user = () => useUserStore.getState();
const proceed = () => act(async () => fireEvent.press(screen.getByRole('button', { name: he('common.continue') })));

describe('the notification step of the first setup', () => {
  beforeEach(() => {
    user().reset();
    useUserStore.setState({ language: 'he' });
    mockPush.mockClear();
  });

  it('shows the night quiet hours ticked at 23:00 to 06:30, and Continue saves them', async () => {
    expect(SETUP_QUIET_AFTER_MIN).toBe(23 * 60);
    expect(SETUP_QUIET_BEFORE_MIN).toBe(6 * 60 + 30);
    renderWithTheme(<PermissionsScreen />);
    expect(screen.getByText(he('onboarding.quiet.title'))).toBeOnTheScreen();
    expect(screen.getByTestId('setup-quiet').props.value).toBe(true);
    expect(screen.getByText('23:00')).toBeOnTheScreen();
    expect(screen.getByText('06:30')).toBeOnTheScreen();
    // Nothing is stored until Continue.
    expect(user().quietAfter.enabled).toBe(false);

    await proceed();

    expect(user().quietAfter).toEqual({ enabled: true, minutes: 23 * 60 });
    expect(user().quietBefore).toEqual({ enabled: true, minutes: 6 * 60 + 30 });
    expect(mockPush).toHaveBeenCalledWith('/onboarding/ready');
  });

  it('saves no quiet hours when the user switches them off, and remembers that on a second visit', async () => {
    const first = renderWithTheme(<PermissionsScreen />);
    fireEvent(screen.getByTestId('setup-quiet'), 'valueChange', false);
    expect(screen.queryByText('23:00')).toBeNull();
    await proceed();
    expect(user().quietAfter.enabled).toBe(false);
    expect(user().quietBefore.enabled).toBe(false);
    first.unmount();

    renderWithTheme(<PermissionsScreen />);
    expect(screen.getByTestId('setup-quiet').props.value).toBe(false);
  });

  it('shows the hours the user saved on a second visit', async () => {
    const first = renderWithTheme(<PermissionsScreen />);
    await proceed();
    user().setQuietAfter({ enabled: true, minutes: 22 * 60 });
    first.unmount();

    renderWithTheme(<PermissionsScreen />);
    expect(screen.getByTestId('setup-quiet').props.value).toBe(true);
    expect(screen.getByText('22:00')).toBeOnTheScreen();
    expect(screen.getByText('06:30')).toBeOnTheScreen();
  });

  it('says in both languages that a late alert moves to the morning or is not sent', () => {
    expect(he('onboarding.quiet.caption')).toContain('בבוקר');
    expect(translate('onboarding.quiet.caption', undefined, 'en', null)).toMatch(/morning/);
  });
});
