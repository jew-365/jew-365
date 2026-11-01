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

import { Platform } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import SettingsScreen from '../(tabs)/settings';
import { translate } from '@/i18n';
import { renderWithTheme } from '@/testing/render';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';

const he = (key: string, params?: Record<string, unknown>) => translate(key, params, 'he', null);
const levelRadio = (level: number) =>
  screen.getByRole('radio', { name: he('nag.level.title', { name: he(`nag.level.${level}.name`), level }) });
const line = (level: number) =>
  he('nag.level.line', { name: he(`nag.level.${level}.name`), level, desc: he(`nag.level.${level}.desc`) });

async function renderDevice() {
  renderWithTheme(<SettingsScreen />);
  await act(async () => {});
  fireEvent.press(screen.getByText(he('settings.device')));
  await act(async () => {});
}

// The everyday default-on set: tefillin 3, the morning Shema 2, Shacharit 2, Mincha 2, Maariv 2 and the
// bedtime Shema 1. Kiddush Levana, Selichot, the Chanukah candles and Ushpizin are on too but seasonal.
const ONLY_DAILY = 12;

describe('Settings › the nagging level', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useMitzvotStore.getState().reset();
    useUserStore.setState({ isOnboarded: true, gender: 'male', maritalStatus: 'single' });
    jest.clearAllMocks();
  });

  it('sits in the notifications block right after the notifications switch, before the weekly report', async () => {
    await renderDevice();
    const labels = screen.getAllByText(/./).map((node) => node.props.children);
    const at = (text: string) => labels.indexOf(text);
    expect(at(he('settings.nagLevel'))).toBeGreaterThan(at(he('settings.notificationsToggle')));
    expect(at(he('settings.weeklyReport'))).toBeGreaterThan(at(he('settings.nagLevel')));
    expect(screen.getByTestId('settings-anchor-nagLevel')).toBeOnTheScreen();
  });

  it('shows the stored level, its line, the estimate and the hint', async () => {
    await renderDevice();
    expect(levelRadio(1).props.accessibilityState.selected).toBe(true);
    for (const level of [2, 3, 4]) expect(levelRadio(level).props.accessibilityState.selected).toBe(false);
    expect(screen.getByTestId('settings-nag-line')).toHaveTextContent(line(1));
    expect(screen.getByTestId('settings-nag-estimate')).toHaveTextContent(
      he('settings.nagLevelPerDay', { n: ONLY_DAILY }),
    );
    expect(screen.getByText(he('settings.nagLevelHint'))).toBeOnTheScreen();
  });

  it('writes the level a tap picks, and the line and the estimate follow', async () => {
    await renderDevice();
    fireEvent.press(levelRadio(3));
    expect(useUserStore.getState().nagLevel).toBe(3);
    expect(levelRadio(3).props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('settings-nag-line')).toHaveTextContent(line(3));
    expect(screen.getByTestId('settings-nag-estimate')).toHaveTextContent(
      he('settings.nagLevelPerDay', { n: ONLY_DAILY * 3 }),
    );
  });

  it('counts a mitzvah at its own level and leaves out one that is off', async () => {
    useMitzvotStore.getState().setNagLevel('shacharit', 4);
    useMitzvotStore.getState().setEnabled('tefillin', false);
    await renderDevice();
    // 12 less tefillin's 3, with Shacharit's 2 reminders at three repeats each.
    expect(screen.getByTestId('settings-nag-estimate')).toHaveTextContent(
      he('settings.nagLevelPerDay', { n: ONLY_DAILY - 3 + 2 * 3 }),
    );
  });

  it.each(['ios', 'android'] as const)('offers the same four levels on %s', async (os) => {
    jest.replaceProperty(Platform, 'OS', os);
    await renderDevice();
    for (const level of [1, 2, 3, 4]) expect(levelRadio(level)).toBeOnTheScreen();
    expect(screen.queryByRole('radio', { name: /\(5\)/ })).toBeNull();
  });
});
