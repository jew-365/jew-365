const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({ push: mockPush, replace: jest.fn() }),
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
import { Card } from '@/components/Card';
import { IconTile } from '@/components/IconTile';
import { ListRow } from '@/components/ListRow';
import { translate } from '@/i18n';
import { renderWithTheme } from '@/testing/render';
import { findMitzvah } from '@/data/mitzvot';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { THEMES } from '@/theme/colors';

const he = (key: string, options?: Record<string, unknown>) => translate(key, options, 'he', null);

async function renderSettings() {
  renderWithTheme(<SettingsScreen />);
  await act(async () => {});
}

const openSection = (key: string) => fireEvent.press(screen.getByText(he(key)));

const search = async (text: string) => {
  await act(async () => {
    fireEvent.changeText(screen.getByLabelText(he('settings.search')), text);
  });
};

describe('Settings cards, icons and actions', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ isOnboarded: true, gender: 'male', maritalStatus: 'single' });
    mockPush.mockClear();
  });

  it('heads the mitzvot row and each section with its icon', async () => {
    await renderSettings();
    expect(screen.UNSAFE_getAllByType(IconTile).map((tile) => tile.props.name)).toEqual([
      'star',
      'user',
      'siddur',
      'bell',
      'cloud',
      'chat',
    ]);
  });

  it('counts on the mitzvot row only the switched-on mitzvot the nusach offers', async () => {
    useMitzvotStore.getState().reset();
    const registered = Object.entries(useMitzvotStore.getState().activeMitzvot).filter(
      ([id, active]) => active.enabled && findMitzvah(id),
    ).length;
    useUserStore.setState({ nusach: 'ashkenaz' });
    await renderSettings();
    expect(screen.getByText(he('settings.mitzvotCaption', { count: registered }))).toBeOnTheScreen();
    screen.unmount();
    useUserStore.setState({ nusach: 'chabad' });
    await renderSettings();
    expect(screen.getByText(he('settings.mitzvotCaption', { count: registered - 1 }))).toBeOnTheScreen();
  });

  it('draws the search field on a card', async () => {
    await renderSettings();
    const cards = screen.UNSAFE_getAllByType(Card);
    expect(within(cards[0]).getByLabelText(he('settings.search'))).toBeOnTheScreen();
  });

  it('draws the reset as a danger button', async () => {
    await renderSettings();
    openSection('settings.backup');
    expect(screen.getByRole('button', { name: he('settings.logout') })).toHaveStyle({
      backgroundColor: THEMES.gold.urgentBg,
      borderColor: THEMES.gold.urgent,
    });
  });

  it('draws the locate action as a primary button', async () => {
    await renderSettings();
    openSection('settings.device');
    expect(screen.getByRole('button', { name: he('settings.useCurrentLocation') })).toHaveStyle({
      backgroundColor: THEMES.gold.gold,
    });
  });

  it('says whether the location follows the phone or is a city picked by hand', async () => {
    const jerusalem = useUserStore.getState().location;
    useUserStore.getState().setLocationState(jerusalem, 'ready', 'gps');
    await renderSettings();
    openSection('settings.device');
    expect(screen.getByText(he('settings.locationFollows'))).toBeOnTheScreen();
    act(() => useUserStore.getState().setLocationState(jerusalem, 'ready', 'manual'));
    expect(screen.getByText(he('settings.locationFixed'))).toBeOnTheScreen();
    act(() => useUserStore.getState().setLocationStatus('denied'));
    expect(screen.getByText(he('settings.locationStatus.denied'))).toBeOnTheScreen();
  });

  it('labels fields as field labels and keeps the device sub-headings as headings', async () => {
    await renderSettings();
    openSection('settings.prayer');
    expect(screen.getByText(he('settings.nusach'))).toHaveStyle({ color: THEMES.gold.textSub });
    expect(screen.queryByRole('header', { name: he('settings.nusach') })).toBeNull();

    openSection('settings.device');
    expect(screen.getByRole('header', { name: he('settings.zmanim') })).toHaveStyle({ color: THEMES.gold.goldText });
  });

  it('shows the search results on one divided card', async () => {
    await renderSettings();
    await search('התראות');
    const cards = screen.UNSAFE_getAllByType(Card);
    expect(cards).toHaveLength(2);
    expect(cards[1].props.divided).toBe(true);
    const results = screen.UNSAFE_getAllByType(ListRow);
    expect(results.length).toBeGreaterThan(0);
    expect(within(cards[1]).UNSAFE_getAllByType(ListRow)).toHaveLength(results.length);
  });
});
