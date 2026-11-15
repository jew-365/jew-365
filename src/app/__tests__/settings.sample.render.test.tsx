const mockSample = jest.fn(async (): Promise<'sent' | 'noPermission' | 'quiet'> => 'sent');

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
  availableNotificationSounds: jest.fn(async () => []),
  previewNotificationSound: jest.fn(async () => true),
  presentSampleReminder: () => mockSample(),
  syncNotificationPermissionStatus: jest.fn(async () => true),
  notificationPermissionState: jest.fn(async () => 'granted'),
}));

import { act, fireEvent, screen } from '@testing-library/react-native';
import SettingsScreen from '../(tabs)/settings';
import { translate } from '@/i18n';
import { renderWithTheme } from '@/testing/render';
import { useUserStore } from '@/stores/useUserStore';
import { SETTINGS_SEARCH_ITEMS, buildSettingsSearchIndex, searchSettings } from '@/utils/settingsSearch';

const he = (key: string) => translate(key, undefined, 'he', null);

async function renderDevice() {
  renderWithTheme(<SettingsScreen />);
  await act(async () => {});
  fireEvent.press(screen.getByText(he('settings.device')));
  await act(async () => {});
}
const send = () =>
  act(async () => fireEvent.press(screen.getByRole('button', { name: he('settings.sampleReminder') })));

describe('Settings: the sample reminder', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ isOnboarded: true, gender: 'male', maritalStatus: 'single', language: 'he' });
    mockSample.mockClear();
    mockSample.mockResolvedValue('sent');
  });

  it('sits in the notifications block with its hint, and sends one sample per press', async () => {
    await renderDevice();
    expect(screen.getByTestId('settings-anchor-sampleReminder')).toBeOnTheScreen();
    expect(screen.getByTestId('settings-sample-result')).toHaveTextContent(he('settings.sampleReminderHint'));

    await send();

    expect(mockSample).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('settings-sample-result')).not.toHaveTextContent(he('settings.sampleReminderHint'));
    expect(screen.getByTestId('settings-sample-result')).toHaveTextContent(/נשלחה/);
  });

  it('says why nothing came without the permission or inside a holy block', async () => {
    mockSample.mockResolvedValue('noPermission');
    await renderDevice();
    await send();
    expect(screen.getByTestId('settings-sample-result')).toHaveTextContent(he('onboarding.ready.sampleNoPermission'));

    mockSample.mockResolvedValue('quiet');
    await send();
    expect(screen.getByTestId('settings-sample-result')).toHaveTextContent(he('onboarding.ready.sampleQuiet'));
  });

  it('is found by the search, in Hebrew and English', () => {
    const item = SETTINGS_SEARCH_ITEMS.find((entry) => entry.id === 'sampleReminder')!;
    expect(item.section).toBe('device');
    const index = buildSettingsSearchIndex((key) => [
      translate(key, undefined, 'he', null),
      translate(key, undefined, 'en', null),
    ]);
    for (const query of ['תזכורת לדוגמה', 'בדיקת התראות', 'sample reminder', 'test notification']) {
      const found = searchSettings(query, index, { taharah: false, backup: true }).map((entry) => entry.id);
      expect(found).toContain('sampleReminder');
    }
  });
});
