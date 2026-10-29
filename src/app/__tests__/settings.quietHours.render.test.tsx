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

import { act, fireEvent, screen, within } from '@testing-library/react-native';
import SettingsScreen from '../(tabs)/settings';
import { translate } from '@/i18n';
import { renderWithTheme } from '@/testing/render';
import { useUserStore } from '@/stores/useUserStore';

const he = (key: string) => translate(key, undefined, 'he', null);

const beforeSwitch = () => screen.getByLabelText(he('settings.quietBefore'));
const afterSwitch = () => screen.getByLabelText(he('settings.quietAfter'));
const beforeField = () => screen.getByRole('button', { name: he('settings.quietBeforeTime') });
const afterField = () => screen.getByRole('button', { name: he('settings.quietAfterTime') });
const typeInSheet = (text: string) => fireEvent.changeText(screen.getByLabelText(he('custom.typeTime')), text);
const closeSheet = () => fireEvent.press(screen.getByRole('button', { name: he('common.close') }));
const flip = (node: ReturnType<typeof screen.getByLabelText>, value: boolean) => fireEvent(node, 'valueChange', value);

async function renderDevice() {
  renderWithTheme(<SettingsScreen />);
  await act(async () => {});
  fireEvent.press(screen.getByText(he('settings.device')));
  await act(async () => {});
}

describe('Settings quiet hours', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ isOnboarded: true, gender: 'male', maritalStatus: 'single' });
    jest.clearAllMocks();
  });

  it('sits in the notifications block after the weekly report and before the permissions card', async () => {
    await renderDevice();
    const labels = screen.getAllByText(/./).map((node) => node.props.children);
    const at = (text: string) => labels.indexOf(text);
    expect(at(he('settings.weeklyReport'))).toBeGreaterThan(-1);
    expect(at(he('settings.quietBefore'))).toBeGreaterThan(at(he('settings.weeklyReport')));
    expect(at(he('settings.quietAfter'))).toBeGreaterThan(at(he('settings.quietBefore')));
    expect(at(he('permissions.title'))).toBeGreaterThan(at(he('settings.quietAfter')));
  });

  it('starts with both switches off, no time field and no note, under their hints', async () => {
    await renderDevice();
    expect(beforeSwitch().props.value).toBe(false);
    expect(afterSwitch().props.value).toBe(false);
    expect(screen.queryByRole('button', { name: he('settings.quietBeforeTime') })).toBeNull();
    expect(screen.queryByRole('button', { name: he('settings.quietAfterTime') })).toBeNull();
    expect(screen.getByText(he('settings.quietBeforeHint'))).toBeOnTheScreen();
    expect(screen.getByText(he('settings.quietAfterHint'))).toBeOnTheScreen();
    expect(screen.queryByText(he('settings.quietHoursNote'))).toBeNull();
  });

  it('switches the first hour on at 07:00 and shows the note', async () => {
    await renderDevice();
    flip(beforeSwitch(), true);
    expect(useUserStore.getState().quietBefore).toEqual({ enabled: true, minutes: 420 });
    expect(beforeSwitch().props.value).toBe(true);
    expect(beforeField()).toHaveAccessibilityValue({ text: '07:00' });
    expect(screen.getByText(he('settings.quietHoursNote'))).toBeOnTheScreen();
  });

  it('switches the last hour on at 22:00', async () => {
    await renderDevice();
    flip(afterSwitch(), true);
    expect(useUserStore.getState().quietAfter).toEqual({ enabled: true, minutes: 1320 });
    expect(afterField()).toHaveAccessibilityValue({ text: '22:00' });
    expect(within(afterField()).getByText('22:00')).toBeOnTheScreen();
  });

  it('stores a time typed in the sheet and shows it after the sheet closes', async () => {
    useUserStore.setState({ quietBefore: { enabled: true, minutes: 420 } });
    await renderDevice();
    fireEvent.press(beforeField());
    typeInSheet('0830');
    expect(useUserStore.getState().quietBefore).toEqual({ enabled: true, minutes: 510 });
    closeSheet();
    expect(within(beforeField()).getByText('08:30')).toBeOnTheScreen();
  });

  it('refuses a time that leaves less than an hour open, with the error in the sheet and under the rows', async () => {
    useUserStore.setState({
      quietBefore: { enabled: true, minutes: 420 },
      quietAfter: { enabled: true, minutes: 1320 },
    });
    await renderDevice();
    expect(screen.queryAllByText(he('settings.quietHoursError'))).toHaveLength(0);
    fireEvent.press(afterField());
    typeInSheet('0730');
    expect(useUserStore.getState().quietAfter).toEqual({ enabled: true, minutes: 1320 });
    expect(screen.getAllByText(he('settings.quietHoursError'))).toHaveLength(2);
    typeInSheet('0800');
    expect(useUserStore.getState().quietAfter).toEqual({ enabled: true, minutes: 480 });
    expect(screen.queryAllByText(he('settings.quietHoursError'))).toHaveLength(0);
  });

  it('refuses a switch that leaves less than an hour open and shows the error once', async () => {
    useUserStore.setState({ quietAfter: { enabled: true, minutes: 60 } });
    await renderDevice();
    flip(beforeSwitch(), true);
    expect(useUserStore.getState().quietBefore).toEqual({ enabled: false, minutes: 420 });
    expect(beforeSwitch().props.value).toBe(false);
    expect(screen.queryByRole('button', { name: he('settings.quietBeforeTime') })).toBeNull();
    expect(screen.getAllByText(he('settings.quietHoursError'))).toHaveLength(1);
  });

  it('switches the first hour off, drops its field and drops the note once both are off', async () => {
    useUserStore.setState({ quietBefore: { enabled: true, minutes: 420 } });
    await renderDevice();
    expect(beforeField()).toBeOnTheScreen();
    flip(beforeSwitch(), false);
    expect(useUserStore.getState().quietBefore).toEqual({ enabled: false, minutes: 420 });
    expect(screen.queryByRole('button', { name: he('settings.quietBeforeTime') })).toBeNull();
    expect(screen.queryByText(he('settings.quietHoursNote'))).toBeNull();
  });

  it('names the family purity exemptions only for a married user who tracks it', async () => {
    useUserStore.setState({
      gender: 'female',
      maritalStatus: 'married',
      taharahEnabled: true,
      quietBefore: { enabled: true, minutes: 420 },
    });
    await renderDevice();
    expect(screen.getByText(he('settings.quietHoursTaharahNote'))).toBeOnTheScreen();
    screen.unmount();

    useUserStore.setState({ taharahEnabled: false });
    await renderDevice();
    expect(screen.queryByText(he('settings.quietHoursTaharahNote'))).toBeNull();
    expect(screen.getByText(he('settings.quietHoursNote'))).toBeOnTheScreen();
  });

  it('is found by the settings search and opens the device section on its row', async () => {
    await renderDevice();
    fireEvent.press(screen.getByText(he('settings.device')));
    await act(async () => {
      fireEvent.changeText(screen.getByLabelText(he('settings.search')), 'שעות שקטות');
    });
    await act(async () => {
      fireEvent.press(screen.getByText(he('settings.quietBefore')));
    });
    expect(screen.getByTestId('settings-anchor-quietBefore')).toBeOnTheScreen();
    expect(screen.getByTestId('settings-anchor-quietAfter')).toBeOnTheScreen();
  });
});
