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

import { HDate } from '@hebcal/core';
import { act, fireEvent, screen } from '@testing-library/react-native';
import SettingsScreen from '../(tabs)/settings';
import { translate } from '@/i18n';
import { renderWithTheme } from '@/testing/render';
import { useUserStore } from '@/stores/useUserStore';
import { benIshChaiYearOf } from '@/utils/halacha';

const he = (key: string, params?: Record<string, string>) => translate(key, params, 'he', null);
const chip = (book: string) => screen.getByRole('button', { name: he(`halacha.book.${book}`) });
const swap = () => screen.queryByLabelText(he('settings.benIshChaiYearSwapped'));

async function renderPrayer() {
  renderWithTheme(<SettingsScreen />);
  await act(async () => {});
  fireEvent.press(screen.getByText(he('settings.prayer')));
}

describe('Settings › Prayer › the daily halacha book', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ isOnboarded: true, gender: 'male', maritalStatus: 'single', nusach: 'ashkenaz' });
  });

  it("shows the nusach's book chosen while the user has not chosen, and names it as the default", async () => {
    await renderPrayer();
    expect(screen.getByText(he('settings.halachaTrack'))).toBeOnTheScreen();
    expect(chip('kitzur').props.accessibilityState).toEqual({ selected: true });
    expect(chip('rambam').props.accessibilityState).toEqual({ selected: false });
    expect(screen.getByText(he('settings.halachaTrackHint', { book: he('halacha.book.kitzur') }))).toBeOnTheScreen();
    expect(swap()).toBeNull();
  });

  it('follows a change of nusach until a book is chosen, and keeps the choice after', async () => {
    useUserStore.setState({ nusach: 'chabad' });
    await renderPrayer();
    expect(chip('rambam').props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(chip('kitzur'));
    expect(useUserStore.getState().halachaTrack).toBe('kitzur');
    act(() => useUserStore.setState({ nusach: 'edot_hamizrach' }));
    expect(chip('kitzur').props.accessibilityState).toEqual({ selected: true });
  });

  it("stores no choice when the nusach's own book is picked, so it follows the nusach again", async () => {
    useUserStore.setState({ halachaTrack: 'rambam' });
    await renderPrayer();
    fireEvent.press(chip('kitzur'));
    expect(useUserStore.getState().halachaTrack).toBeNull();
  });

  it("offers the swap of Ben Ish Chai's years only for Ben Ish Chai, naming the year this year reads", async () => {
    await renderPrayer();
    fireEvent.press(chip('ben_ish_chai'));
    expect(useUserStore.getState().halachaTrack).toBe('ben_ish_chai');
    expect(swap()).toBeOnTheScreen();
    const year = benIshChaiYearOf(new HDate(), false);
    expect(
      screen.getByText(he('settings.benIshChaiYearHint', { year: he(`settings.benIshChaiYear.${year}`) })),
    ).toBeOnTheScreen();
    await act(async () => fireEvent(swap()!, 'valueChange', true));
    expect(useUserStore.getState().benIshChaiYearSwapped).toBe(true);
    expect(
      screen.getByText(he('settings.benIshChaiYearHint', { year: he(`settings.benIshChaiYear.${3 - year}`) })),
    ).toBeOnTheScreen();
  });
});
