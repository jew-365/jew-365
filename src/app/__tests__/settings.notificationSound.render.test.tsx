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
  availableNotificationSounds: jest.fn(async () => [
    'bells',
    'call',
    'harp',
    'drop',
    'chime',
    'glass',
    'kalimba',
    'dew',
    'music_box',
    'flute',
    'bowl',
    'piano',
  ]),
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

const ROLES = ['regular', 'soon', 'last'] as const;
const field = (role: (typeof ROLES)[number], sound: string) =>
  screen.getByRole('button', {
    name: `${he(`settings.notificationSound.role.${role}`)}: ${he(`settings.notificationSound.${sound}`)}`,
  });

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

  it('offers a sound for the plain, the orange and the last notification, each on its default', async () => {
    await renderDevice();
    expect(screen.getByText(he('settings.notificationSound'))).toBeTruthy();
    expect(field('regular', 'bells')).toBeTruthy();
    expect(field('soon', 'kalimba')).toBeTruthy();
    expect(field('last', 'music_box')).toBeTruthy();
    expect(screen.getByText(he('settings.notificationSound.hint'))).toBeTruthy();
  });

  it('saves the sound chosen for one role, plays it, and plays a role again from its own button', async () => {
    await renderDevice();
    fireEvent.press(field('last', 'music_box'));
    fireEvent.press(screen.getByText(he('settings.notificationSound.bowl')));
    await act(async () => {});
    expect(useUserStore.getState().notificationSounds).toEqual({ regular: 'bells', soon: 'kalimba', last: 'bowl' });
    expect(Scheduler.previewNotificationSound).toHaveBeenCalledWith('last');

    const playSoon = `${he('settings.notificationSound.preview')}: ${he('settings.notificationSound.role.soon')}`;
    fireEvent.press(screen.getByRole('button', { name: playSoon }));
    expect(Scheduler.previewNotificationSound).toHaveBeenLastCalledWith('soon');
  });

  it('offers only the sounds the build carries, showing a role whose choice it lacks on what it plays', async () => {
    (Scheduler.availableNotificationSounds as jest.Mock).mockResolvedValue(['bells', 'call', 'harp', 'drop']);
    await renderDevice();
    expect(field('soon', 'bells')).toBeTruthy();
    fireEvent.press(field('regular', 'bells'));
    expect(screen.queryByText(he('settings.notificationSound.piano'))).toBeNull();
    expect(screen.getAllByText(he('settings.notificationSound.harp')).length).toBeGreaterThan(0);
  });

  it('keeps the choice and plays nothing on a build without the sound files, and says so', async () => {
    (Scheduler.availableNotificationSounds as jest.Mock).mockResolvedValue([]);
    await renderDevice();
    for (const role of ROLES) expect(screen.queryByTestId(`settings-sound-${role}`)).toBeNull();
    expect(screen.getByText(he('settings.notificationSound.needsBuild'))).toBeTruthy();
    expect(Scheduler.previewNotificationSound).not.toHaveBeenCalled();
  });
});
