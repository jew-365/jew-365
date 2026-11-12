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
import { translate } from '@/i18n';
import { renderWithTheme } from '@/testing/render';
import { useUserStore } from '@/stores/useUserStore';
import { ARC_ZMANIM } from '@/utils/zmanIds';

const he = (key: string) => translate(key, undefined, 'he', null);

async function renderSection() {
  renderWithTheme(<SettingsScreen />);
  await act(async () => {});
  fireEvent.press(screen.getByText(he('settings.halachaTimes')));
}

describe('Settings › זמני הלכה', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ isOnboarded: true, gender: 'male', maritalStatus: 'single' });
  });

  it('is its own section, after Prayer and before Device, with its summary', async () => {
    renderWithTheme(<SettingsScreen />);
    await act(async () => {});
    const texts = screen.getAllByText(/./).map((node) => node.props.children);
    expect(he('settings.halachaTimes')).toBe('זמני הלכה');
    expect(texts.indexOf(he('settings.halachaTimes'))).toBeGreaterThan(texts.indexOf(he('settings.prayer')));
    expect(texts.indexOf(he('settings.device'))).toBeGreaterThan(texts.indexOf(he('settings.halachaTimes')));
    expect(screen.getByText(he('settings.halachaTimesSummary'))).toBeOnTheScreen();
    expect(screen.queryByTestId('zmanim-row-alot')).toBeNull();
  });

  it("lists the carousel's times in place, every zman of the circle shown by default, misheyakir as זמן תו״ט", async () => {
    await renderSection();
    expect(screen.getByText(he('settings.zmanimShownHint'))).toBeOnTheScreen();
    ARC_ZMANIM.forEach((id) => {
      expect(screen.getByTestId(`zmanim-row-${id}`)).toBeOnTheScreen();
      expect(screen.getByText(he(`home.zman.${id}.name`))).toBeOnTheScreen();
    });
    expect(screen.getByText('זמן תו״ט')).toBeOnTheScreen();
    expect(screen.queryByText('משיכיר')).toBeNull();
  });

  it('hides a zman, shows it again, adds a time and stars it', async () => {
    await renderSection();
    await act(async () => fireEvent.press(screen.getByTestId('zmanim-remove-plag')));
    expect(useUserStore.getState().hiddenZmanim).toEqual(['plag']);
    expect(screen.queryByTestId('zmanim-row-plag')).toBeNull();
    await act(async () => fireEvent.press(screen.getByText(he('home.zman.plag.name'))));
    expect(useUserStore.getState().hiddenZmanim).toEqual([]);
    await act(async () => fireEvent.press(screen.getByText(he('home.zman.minchaKetana.name'))));
    await act(async () => fireEvent.press(screen.getByTestId('zmanim-star-minchaKetana')));
    expect(useUserStore.getState().addedZmanim).toEqual(['minchaKetana']);
    expect(useUserStore.getState().zmanPins).toEqual(['minchaKetana']);
  });

  it('keeps the last zman of the circle: its remove button is disabled', async () => {
    useUserStore.setState({ hiddenZmanim: ARC_ZMANIM.filter((id) => id !== 'shkia') });
    await renderSection();
    expect(screen.getByTestId('zmanim-remove-shkia').props.accessibilityState).toMatchObject({ disabled: true });
  });
});
