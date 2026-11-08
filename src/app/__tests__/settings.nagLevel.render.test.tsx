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
const pills = (kind: 'reminder' | 'nag' | 'warning' | 'lastChance') => screen.queryAllByTestId(`nag-example-${kind}`);
const pillTimes = () =>
  within(screen.getByTestId('nag-example'))
    .queryAllByTestId(/^nag-example-(reminder|nag|lastChance)$/)
    .map((pill) => within(pill).getByText(/\d\d:\d\d/).props.children);

async function renderDevice() {
  renderWithTheme(<SettingsScreen />);
  await act(async () => {});
  fireEvent.press(screen.getByText(he('settings.device')));
  await act(async () => {});
}

// The everyday default-on set: one reminder each of tefillin, the morning Shema, Shacharit, Mincha, Maariv and the
// bedtime Shema (6); each window's orange and red (12); and the opener of every zone that starts after its window
// does (5, all but Maariv's). Kiddush Levana, Selichot, the Chanukah candles and Ushpizin are on too but seasonal.
const ONLY_DAILY = 24;
// At level 3, two nags in the zone of each of the six.
const DAILY_AT_3 = ONLY_DAILY + 6 * 2;

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
      he('settings.nagLevelPerDay', { n: DAILY_AT_3 }),
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

  it('shows today’s Shacharit and bedtime Shema windows at the chosen level as their send times', async () => {
    await renderDevice();
    expect(screen.getByText(he('settings.nagExample.title', { city: J.name }))).toBeOnTheScreen();
    // Level 1: one reminder each, the opener of each zone, and each window's orange and red.
    expect(pills('reminder')).toHaveLength(2);
    expect(pills('nag')).toHaveLength(2);
    expect(pills('warning')).toHaveLength(2);
    expect(pills('lastChance')).toHaveLength(2);

    fireEvent.press(nameButton(3));
    expect(pills('reminder')).toHaveLength(2);
    expect(pills('nag').length).toBeGreaterThan(2);
    // The bedtime Shema's nags come after its 21:00 reminder, never before it.
    const times = pillTimes();
    const shema = times.slice(times.indexOf('21:00'));
    expect(shema.length).toBeGreaterThan(2);
    for (const legend of ['main', 'repeat', 'warning', 'lastChance']) {
      const legendText = he(`settings.nagExample.${legend}`);
      expect(
        within(screen.getByTestId('nag-example')).getByText(legendText, { includeHiddenElements: true }),
      ).toBeOnTheScreen();
    }
  });

  it('applies the quiet hours to the example', async () => {
    useUserStore.getState().setQuietBefore({ enabled: true, minutes: 8 * 60 });
    await renderDevice();
    // Shacharit opens at netz, before 08:00, so its start reminder goes out at 08:00; its red stays, while the bedtime
    // Shema's red before alot would move past the end of its time and is dropped, its orange before chatzot kept.
    expect(pillTimes()[0]).toBe('08:00');
    expect(pills('lastChance')).toHaveLength(1);
    expect(pills('warning').length).toBeGreaterThan(0);
  });

  it('counts a mitzvah at its own level and leaves out one that is off', async () => {
    useMitzvotStore.getState().setNagLevel('shacharit', 4);
    useMitzvotStore.getState().setEnabled('tefillin', false);
    await renderDevice();
    // Less tefillin's 3 reminders and its last-chance point, with Shacharit's three zone nags.
    expect(screen.getByTestId('settings-nag-estimate')).toHaveTextContent(
      he('settings.nagLevelPerDay', { n: ONLY_DAILY - 4 + 3 }),
    );
  });

  it.each(['ios', 'android'] as const)('offers the same four levels on %s', async (os) => {
    jest.replaceProperty(Platform, 'OS', os);
    await renderDevice();
    for (const level of [1, 2, 3, 4]) expect(nameButton(level)).toBeOnTheScreen();
    expect(slider()).toHaveAccessibilityValue({ min: 1, max: 4, now: 1, text: title(1) });
  });
});
