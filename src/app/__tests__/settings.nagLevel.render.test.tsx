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
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import SettingsScreen from '../(tabs)/settings';
import { CITIES } from '@/data/cities';
import { translate } from '@/i18n';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';

const J = CITIES[0];
const ONLY_DATE = [
  'nextTick',
  'queueMicrotask',
  'setImmediate',
  'clearImmediate',
  'setInterval',
  'clearInterval',
  'setTimeout',
  'clearTimeout',
] as const;
const he = (key: string, params?: Record<string, unknown>) => translate(key, params, 'he', null);
const title = (level: number) => he('nag.level.title', { name: he(`nag.level.${level}.name`), level });
const nameButton = (level: number) => screen.getByRole('button', { name: title(level) });
const slider = () => screen.getByTestId('nag-level-slider');
const touch = (locationX: number, pageX: number, pageY: number) => ({ nativeEvent: { locationX, pageX, pageY } });
const level = () => useUserStore.getState().nagLevel;
// The track runs from 14 to 300 of a 314-wide slider: a third of the way is level 2, the far end level 4.
const layout = () => fireEvent(slider(), 'layout', { nativeEvent: { layout: { width: 314, height: 44 } } });
const pills = (kind: 'main' | 'repeat' | 'dropped') => screen.queryAllByTestId(`nag-example-${kind}`);
const pillTimes = () =>
  within(screen.getByTestId('nag-example'))
    .queryAllByTestId(/^nag-example-(main|repeat|dropped)$/)
    .map((pill) => within(pill).getByText(/\d\d:\d\d/).props.children);

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
    // Wednesday 2026-10-28 at 10:00 in Jerusalem, a plain weekday.
    jest.useFakeTimers({ now: at(J, '2026-10-28T10:00'), doNotFake: [...ONLY_DATE] });
    useUserStore.getState().reset();
    useMitzvotStore.getState().reset();
    useUserStore.setState({ isOnboarded: true, gender: 'male', maritalStatus: 'single', location: J, language: 'he' });
    jest.clearAllMocks();
  });

  afterEach(() => jest.useRealTimers());

  it('sits in the notifications block right after the notifications switch, before the weekly report', async () => {
    await renderDevice();
    const labels = screen.getAllByText(/./).map((node) => node.props.children);
    const indexOf = (text: string) => labels.indexOf(text);
    expect(indexOf(he('settings.nagLevel'))).toBeGreaterThan(indexOf(he('settings.notificationsToggle')));
    expect(indexOf(he('settings.weeklyReport'))).toBeGreaterThan(indexOf(he('settings.nagLevel')));
    expect(screen.getByTestId('settings-anchor-nagLevel')).toBeOnTheScreen();
  });

  it('shows the stored level on the slider, its name, its description, the estimate and the hint', async () => {
    await renderDevice();
    expect(slider()).toHaveAccessibilityValue({ min: 1, max: 4, now: 1, text: title(1) });
    expect(screen.getByTestId('nag-level-name')).toHaveTextContent(he('nag.level.1.name'));
    expect(nameButton(1).props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('settings-nag-line')).toHaveTextContent(`${he('nag.level.1.desc')}.`);
    expect(screen.getByTestId('settings-nag-estimate')).toHaveTextContent(
      he('settings.nagLevelPerDay', { n: ONLY_DAILY }),
    );
    expect(screen.getByText(he('settings.nagLevelHint'))).toBeOnTheScreen();
  });

  it('writes the level a name picks, and the name, description and estimate follow', async () => {
    await renderDevice();
    fireEvent.press(nameButton(3));
    expect(useUserStore.getState().nagLevel).toBe(3);
    expect(slider()).toHaveAccessibilityValue({ min: 1, max: 4, now: 3, text: title(3) });
    expect(screen.getByTestId('nag-level-name')).toHaveTextContent(he('nag.level.3.name'));
    expect(screen.getByTestId('settings-nag-line')).toHaveTextContent(`${he('nag.level.3.desc')}.`);
    expect(screen.getByTestId('settings-nag-estimate')).toHaveTextContent(
      he('settings.nagLevelPerDay', { n: ONLY_DAILY * 3 }),
    );
  });

  it('steps by the slider’s accessibility actions and stops at both ends', async () => {
    await renderDevice();
    fireEvent(slider(), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(useUserStore.getState().nagLevel).toBe(1);
    fireEvent(slider(), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(useUserStore.getState().nagLevel).toBe(2);
    act(() => useUserStore.getState().setNagLevel(4));
    fireEvent(slider(), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(useUserStore.getState().nagLevel).toBe(4);
  });

  it('picks the stop nearest a tap when the finger lifts, not when it lands', async () => {
    await renderDevice();
    layout();
    fireEvent(slider(), 'responderGrant', touch(14 + 286 / 3, 200, 500));
    expect(level()).toBe(1);
    fireEvent(slider(), 'responderMove', touch(14 + 286 / 3, 205, 503));
    expect(level()).toBe(1);
    fireEvent(slider(), 'responderRelease', touch(14 + 286 / 3, 205, 503));
    expect(level()).toBe(2);
  });

  it('follows a horizontal drag to the nearest stop', async () => {
    await renderDevice();
    layout();
    fireEvent(slider(), 'responderGrant', touch(20, 106, 500));
    fireEvent(slider(), 'responderMove', touch(312, 398, 506));
    expect(level()).toBe(4);
    fireEvent(slider(), 'responderMove', touch(0, 86, 510));
    expect(level()).toBe(1);
    fireEvent(slider(), 'responderMove', touch(14 + (286 * 2) / 3, 290, 512));
    expect(level()).toBe(3);
    fireEvent(slider(), 'responderRelease', touch(14 + (286 * 2) / 3, 290, 512));
    expect(level()).toBe(3);
  });

  it('changes nothing when a vertical scroll starts on the slider, or the scroll view takes the touch', async () => {
    await renderDevice();
    layout();
    fireEvent(slider(), 'responderGrant', touch(312, 398, 500));
    expect(level()).toBe(1);
    fireEvent(slider(), 'responderMove', touch(310, 396, 540));
    expect(level()).toBe(1);
    fireEvent(slider(), 'responderMove', touch(100, 186, 545));
    expect(level()).toBe(1);
    fireEvent(slider(), 'responderRelease', touch(100, 186, 545));
    expect(level()).toBe(1);
    fireEvent(slider(), 'responderGrant', touch(312, 398, 500));
    fireEvent(slider(), 'responderTerminate', touch(312, 398, 500));
    expect(level()).toBe(1);
  });

  it('shows today’s Shacharit and bedtime Shema reminders at the chosen level as their send times', async () => {
    await renderDevice();
    expect(screen.getByText(he('settings.nagExample.title', { city: J.name }))).toBeOnTheScreen();
    expect(pills('main')).toHaveLength(3);
    expect(pills('repeat')).toHaveLength(0);

    fireEvent.press(nameButton(3));
    expect(pills('main')).toHaveLength(3);
    expect(pills('repeat')).toHaveLength(6);
    expect(pills('dropped')).toHaveLength(0);
    // The bedtime Shema's 23:00 is preceded by its two repeats, and is the last time shown.
    expect(pillTimes().slice(-3)).toEqual(['22:50', '22:55', '23:00']);
  });

  it('applies the quiet hours to the example', async () => {
    useUserStore.getState().setQuietBefore({ enabled: true, minutes: 8 * 60 });
    useUserStore.getState().setNagLevel(3);
    await renderDevice();
    // Shacharit opens at netz, before 08:00, so its start reminder goes out at 08:00 and nags after it.
    expect(pillTimes().slice(0, 3)).toEqual(['08:00', '08:05', '08:10']);
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
    for (const level of [1, 2, 3, 4]) expect(nameButton(level)).toBeOnTheScreen();
    expect(slider()).toHaveAccessibilityValue({ min: 1, max: 4, now: 1, text: title(1) });
  });
});
