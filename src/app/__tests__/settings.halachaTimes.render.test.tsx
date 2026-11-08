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
const toggle = (id: string) => screen.getByTestId(`settings-zman-${id}`);

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
    expect(screen.queryByTestId('settings-zman-alot')).toBeNull();
  });

  it('lists every zman on by default, misheyakir as זמן תו״ט', async () => {
    await renderSection();
    expect(screen.getByText(he('settings.zmanimShownHint'))).toBeOnTheScreen();
    ARC_ZMANIM.forEach((id) => {
      expect(toggle(id).props.value).toBe(true);
      expect(screen.getByText(he(`home.zman.${id}.name`))).toBeOnTheScreen();
    });
    expect(screen.getByText('זמן תו״ט')).toBeOnTheScreen();
    expect(screen.queryByText('משיכיר')).toBeNull();
  });

  it('hides a zman and shows it again', async () => {
    await renderSection();
    await act(async () => fireEvent(toggle('plag'), 'valueChange', false));
    expect(useUserStore.getState().hiddenZmanim).toEqual(['plag']);
    expect(toggle('plag').props.value).toBe(false);
    await act(async () => fireEvent(toggle('plag'), 'valueChange', true));
    expect(useUserStore.getState().hiddenZmanim).toEqual([]);
  });

  it('keeps the last zman shown: its switch is disabled', async () => {
    useUserStore.setState({ hiddenZmanim: ARC_ZMANIM.filter((id) => id !== 'shkia') });
    await renderSection();
    expect(toggle('shkia').props.value).toBe(true);
    expect(toggle('shkia').props.disabled).toBe(true);
    expect(toggle('alot').props.disabled).toBeFalsy();
  });
});
