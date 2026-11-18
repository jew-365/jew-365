const mockPush = jest.fn();
const mockParams: { goal?: string; bundles?: string } = {};
const mockRouter = { push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true };

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockParams,
  useRouter: () => mockRouter,
}));

import { fireEvent, screen, within } from '@testing-library/react-native';
import CapabilitiesScreen from '../capabilities';
import { CAPABILITY_GOALS } from '@/data/capabilities';
import { useChokStore } from '@/stores/useChokStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { installChokFixture } from '@/testing/chok';
import { renderWithTheme } from '@/testing/render';

const enabled = (id: string) => Boolean(useMitzvotStore.getState().activeMitzvot[id]?.enabled);
const open = (goal: string) =>
  fireEvent.press(within(screen.getByTestId(`capabilities-goal-${goal}`)).getAllByRole('button')[0]);
const row = (id: string) => within(screen.getByTestId(`capability-row-${id}`));

beforeEach(() => {
  delete mockParams.goal;
  delete mockParams.bundles;
  mockPush.mockReset();
  useUserStore.getState().reset();
  // Both notice topics off, as an install that switched them off: these cases read the switching on.
  useUserStore.setState({ hilulotEnabled: false, roshChodeshEnabled: false });
  useMitzvotStore.getState().reset();
  useChokStore.getState().reset();
});

describe('the capabilities screen', () => {
  it('lists a folding card per goal, closed, with how many of its capabilities are on', () => {
    renderWithTheme(<CapabilitiesScreen />);
    expect(screen.getByRole('header', { name: 'כל היכולות' })).toBeOnTheScreen();
    for (const goal of CAPABILITY_GOALS) expect(screen.getByTestId(`capabilities-goal-${goal}`)).toBeOnTheScreen();
    expect(within(screen.getByTestId('capabilities-goal-calendar')).getByText('1 מתוך 3 פועלים')).toBeOnTheScreen();
    expect(screen.queryByTestId('capability-row-roshChodesh')).toBeNull();
    expect(screen.queryByTestId('capabilities-bundles')).toBeNull();
  });

  it('opens on the goal a tile of the More tab named', () => {
    mockParams.goal = 'calendar';
    renderWithTheme(<CapabilitiesScreen />);
    expect(screen.getByTestId('capability-row-roshChodesh')).toBeOnTheScreen();
    expect(screen.queryByTestId('capability-row-tefillin')).toBeNull();
  });

  it('ignores an unknown goal', () => {
    mockParams.goal = 'nothing';
    renderWithTheme(<CapabilitiesScreen />);
    expect(screen.queryByTestId(/^capability-row-/)).toBeNull();
  });

  it('shows each capability with its state and one action, and turns one on in a tap', () => {
    renderWithTheme(<CapabilitiesScreen />);
    open('prayer');
    expect(row('prayers').getByText('פועל')).toBeOnTheScreen();
    expect(row('birchot').getByText('תזכורת לברכות השחר בבוקר')).toBeOnTheScreen();
    expect(enabled('birchot_hashachar')).toBe(false);
    fireEvent.press(screen.getByRole('button', { name: 'הפעלה: ברכות השחר' }));
    expect(enabled('birchot_hashachar')).toBe(true);
    expect(row('birchot').getByText('פועל')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'הפעלה: ברכות השחר' })).toBeNull();
  });

  it('opens the library from a group of mitzvot and the mitzvah screen from a single one', () => {
    renderWithTheme(<CapabilitiesScreen />);
    open('prayer');
    fireEvent.press(row('prayers').getByText('שחרית, מנחה וערבית'));
    expect(mockPush).toHaveBeenLastCalledWith('/mitzvot');
    fireEvent.press(row('tefillin').getByText('תפילין'));
    expect(mockPush).toHaveBeenLastCalledWith('/mitzvah/tefillin');
  });

  it('opens a screen from its row, with no switch to turn', () => {
    renderWithTheme(<CapabilitiesScreen />);
    open('tools');
    expect(row('compass').queryByText('פועל')).toBeNull();
    fireEvent.press(row('compass').getByText('מצפן תפילה'));
    expect(mockPush).toHaveBeenLastCalledWith('/compass');
    fireEvent.press(row('hotline').getByText('קו הלכה'));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/(tabs)/more', params: { open: 'halacha' } });
  });

  it('offers the download of an add-on that is missing, and a switch once it is installed', () => {
    const view = renderWithTheme(<CapabilitiesScreen />);
    open('learning');
    fireEvent.press(screen.getByRole('button', { name: 'הורדה: חק לישראל' }));
    expect(mockPush).toHaveBeenLastCalledWith('/mitzvah/chok_leyisrael');
    expect(enabled('chok_leyisrael')).toBe(false);
    view.unmount();

    installChokFixture();
    renderWithTheme(<CapabilitiesScreen />);
    open('learning');
    fireEvent.press(screen.getByRole('button', { name: 'הפעלה: חק לישראל' }));
    expect(enabled('chok_leyisrael')).toBe(true);
  });

  it('turns a notice topic on, and opens a setting where it lives', () => {
    renderWithTheme(<CapabilitiesScreen />);
    open('calendar');
    fireEvent.press(screen.getByRole('button', { name: 'הפעלה: הילולות צדיקים' }));
    expect(useUserStore.getState().hilulotEnabled).toBe(true);
    open('personal');
    fireEvent.press(screen.getByRole('button', { name: 'הפעלה: שעות שקטות' }));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/(tabs)/settings', params: { focus: 'quietBefore' } });
  });

  it('turns on everything that is off in a goal, and then offers it no more', () => {
    renderWithTheme(<CapabilitiesScreen />);
    open('shabbat');
    expect(enabled('candle_lighting')).toBe(false);
    fireEvent.press(screen.getByRole('button', { name: 'להפעיל הכול: שבת וחגים' }));
    for (const id of ['candle_lighting', 'havdalah', 'sefirat_haomer']) expect([id, enabled(id)]).toEqual([id, true]);
    // Selichot is a download, which one tap cannot make.
    expect(screen.getByRole('button', { name: 'הורדה: סליחות' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'להפעיל הכול: שבת וחגים' })).toBeNull();
  });

  it('leaves out what the user is not offered', () => {
    useUserStore.setState({ gender: 'female', nusach: 'chabad' });
    renderWithTheme(<CapabilitiesScreen />);
    open('prayer');
    open('shabbat');
    expect(screen.queryByTestId('capability-row-tefillin')).toBeNull();
    expect(screen.queryByTestId('capability-row-kiddushLevana')).toBeNull();
    expect(screen.queryByTestId('capability-row-ushpizin')).toBeNull();
    expect(screen.getByTestId('capability-row-candles')).toBeOnTheScreen();
  });

  it('reads in English', () => {
    useUserStore.setState({ language: 'en' });
    renderWithTheme(<CapabilitiesScreen />);
    open('prayer');
    expect(screen.getByRole('header', { name: 'Everything the app can do' })).toBeOnTheScreen();
    expect(row('prayers').getByText('On')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Turn on: Morning blessings' })).toBeOnTheScreen();
  });
});

describe('the bundles of the catch-up (A6)', () => {
  const bundleSwitch = (id: string) => screen.getByTestId(`bundle-switch-${id}`);

  beforeEach(() => {
    mockParams.bundles = '1';
  });

  it('arrives with the recommended bundles ticked and changes nothing until confirmed', () => {
    renderWithTheme(<CapabilitiesScreen />);
    expect(screen.getByText('מה חשוב לך?')).toBeOnTheScreen();
    expect(bundleSwitch('shabbat').props.value).toBe(true);
    expect(bundleSwitch('calendar').props.value).toBe(true);
    expect(bundleSwitch('birchot').props.value).toBe(false);
    // The learning programs are downloads, each with its own row below.
    expect(screen.queryByTestId('bundle-switch-learning')).toBeNull();
    expect(enabled('candle_lighting')).toBe(false);
    expect(useUserStore.getState().roshChodeshEnabled).toBe(false);
  });

  it('switches on what is ticked: Shabbat and the festivals and the Rosh Chodesh and hilula notices', () => {
    renderWithTheme(<CapabilitiesScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'הפעלת המסומנים' }));
    for (const id of ['candle_lighting', 'havdalah', 'sefirat_haomer', 'chanukah_candles'])
      expect([id, enabled(id)]).toEqual([id, true]);
    expect(useUserStore.getState().roshChodeshEnabled).toBe(true);
    expect(useUserStore.getState().hilulotEnabled).toBe(true);
    expect(enabled('birchot_hashachar')).toBe(false);
    expect(screen.getByText('הופעל. אפשר לשנות הכול בכל רגע, כאן וברשימת המצוות.')).toBeOnTheScreen();
  });

  it('leaves candle lighting off for a man and switches havdalah on', () => {
    useUserStore.setState({ gender: 'male' });
    renderWithTheme(<CapabilitiesScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'הפעלת המסומנים' }));
    expect(enabled('candle_lighting')).toBe(false);
    expect(enabled('havdalah')).toBe(true);
    expect(enabled('sefirat_haomer')).toBe(true);
  });

  it('follows the ticks: one taken off stays off, one added goes on', () => {
    renderWithTheme(<CapabilitiesScreen />);
    fireEvent(bundleSwitch('shabbat'), 'valueChange', false);
    fireEvent(bundleSwitch('birchot'), 'valueChange', true);
    fireEvent.press(screen.getByRole('button', { name: 'הפעלת המסומנים' }));
    expect(enabled('candle_lighting')).toBe(false);
    expect(enabled('sefirat_haomer')).toBe(false);
    expect(enabled('birchot_hashachar')).toBe(true);
  });

  it('never switches anything off, and says so when everything ticked is already on', () => {
    renderWithTheme(<CapabilitiesScreen />);
    fireEvent(bundleSwitch('shabbat'), 'valueChange', false);
    fireEvent(bundleSwitch('calendar'), 'valueChange', false);
    // The prayers bundle is on by default: its tick is locked and nothing is left to do.
    expect(bundleSwitch('prayer').props.disabled).toBe(true);
    fireEvent.press(screen.getByRole('button', { name: 'הפעלת המסומנים' }));
    expect(enabled('shacharit')).toBe(true);
    expect(screen.getByText('כל מה שסימנתם כבר פועל.')).toBeOnTheScreen();
  });
});
