jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
    useLocalSearchParams: () => ({}),
    useFocusEffect: (effect: () => void) => React.useEffect(effect, [effect]),
  };
});
jest.mock('@/services/NotificationScheduler', () => ({
  NotificationScheduler: { rebuild: jest.fn(async () => {}), cancelAll: jest.fn(async () => {}) },
  requestNotificationPermissions: jest.fn(async () => true),
  notificationSoundsAvailable: jest.fn(async () => true),
  previewNotificationSound: jest.fn(async () => true),
  syncNotificationPermissionStatus: jest.fn(async () => true),
  notificationPermissionState: jest.fn(async () => 'granted'),
}));

import { act, fireEvent, screen } from '@testing-library/react-native';
import SettingsScreen from '../(tabs)/settings';
import { CITIES } from '@/data/cities';
import { translate } from '@/i18n';
import { renderWithTheme } from '@/testing/render';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';

import * as Scheduler from '@/services/NotificationScheduler';

const he = (key: string) => translate(key, undefined, 'he', null);

async function renderDevice() {
  renderWithTheme(<SettingsScreen />);
  await act(async () => {});
  fireEvent.press(screen.getByText(he('settings.device')));
  await act(async () => {});
}

describe('Settings › the notification sound', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useMitzvotStore.getState().reset();
    useUserStore.setState({
      isOnboarded: true,
      gender: 'male',
      maritalStatus: 'single',
      location: CITIES[0],
      language: 'he',
    });
    jest.clearAllMocks();
  });

  it('offers the four sounds with the bells chosen, and a choice saves and plays it', async () => {
    await renderDevice();
    expect(screen.getByText(he('settings.notificationSound'))).toBeTruthy();
    for (const sound of ['bells', 'call', 'harp', 'drop']) {
      expect(screen.getByText(he(`settings.notificationSound.${sound}`))).toBeTruthy();
    }
    expect(
      screen.getByRole('button', { name: he('settings.notificationSound.bells') }).props.accessibilityState,
    ).toMatchObject({ selected: true });

    fireEvent.press(screen.getByText(he('settings.notificationSound.harp')));
    await act(async () => {});
    expect(useUserStore.getState().notificationSound).toBe('harp');
    expect(Scheduler.previewNotificationSound).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText(he('settings.notificationSound.preview')));
    expect(Scheduler.previewNotificationSound).toHaveBeenCalledTimes(2);
    expect(screen.getByText(he('settings.notificationSound.hint'))).toBeTruthy();
  });

  it('keeps the choice but plays nothing on a build without the sound files, and says so', async () => {
    (Scheduler.notificationSoundsAvailable as jest.Mock).mockResolvedValue(false);
    await renderDevice();
    expect(screen.queryByText(he('settings.notificationSound.preview'))).toBeNull();
    expect(screen.getByText(he('settings.notificationSound.needsBuild'))).toBeTruthy();
    fireEvent.press(screen.getByText(he('settings.notificationSound.drop')));
    await act(async () => {});
    expect(useUserStore.getState().notificationSound).toBe('drop');
    expect(Scheduler.previewNotificationSound).not.toHaveBeenCalled();
  });
});
