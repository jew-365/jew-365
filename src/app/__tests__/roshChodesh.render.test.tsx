const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

import { ScrollView } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import RoshChodeshScreen from '../rosh-chodesh';
import {
  DEFAULT_ROSH_CHODESH_NOTICES as DEFAULTS,
  useUserStore,
  type NoticeSetting,
  type RoshChodeshNotices,
} from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';

const MASTER = 'התראות ראש חודש';
const NEEDS_REMINDER_TITLE = 'אין התראות';
const LAST_KIND_ERROR = 'יש להשאיר לפחות התראה אחת כל עוד ההתראות פעילות';

const off = (setting: NoticeSetting): NoticeSetting => ({ ...setting, enabled: false });
const ALL_OFF: RoshChodeshNotices = {
  before: off(DEFAULTS.before),
  evening: off(DEFAULTS.evening),
  day: off(DEFAULTS.day),
};
const ONLY_DAY: RoshChodeshNotices = { ...ALL_OFF, day: DEFAULTS.day };

const flip = (name: string, value: boolean) => fireEvent(screen.getByRole('switch', { name }), 'valueChange', value);
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const notices = () => useUserStore.getState().roshChodeshNotices;

describe('Rosh Chodesh screen notice kinds', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    mockPush.mockReset();
  });

  it('lists the three kinds with their times in Hebrew, each switched on', () => {
    renderWithTheme(<RoshChodeshScreen />);
    for (const text of [
      'מתי להתריע',
      'התראה מוקדמת',
      '3 ימים לפני, 20:00',
      'בערב שלפני',
      'בשקיעה',
      'ביום עצמו',
      '07:00',
    ]) {
      expect(screen.getByText(text)).toBeOnTheScreen();
    }
    for (const name of ['התראה מוקדמת', 'בערב שלפני', 'ביום עצמו']) {
      expect(screen.getByRole('switch', { name })).toBeChecked();
    }
  });

  it('lists the three kinds with their times in English', () => {
    useUserStore.setState({ language: 'en' });
    renderWithTheme(<RoshChodeshScreen />);
    for (const text of ['Early notice', '3 days before, 20:00', 'The evening before', 'At sunset', 'On the day']) {
      expect(screen.getByText(text)).toBeOnTheScreen();
    }
  });

  it('switches a kind off in the store and leaves its switch unchecked', () => {
    renderWithTheme(<RoshChodeshScreen />);
    flip('ביום עצמו', false);
    expect(notices().day.enabled).toBe(false);
    expect(notices().before.enabled).toBe(true);
    expect(screen.getByRole('switch', { name: 'ביום עצמו' })).not.toBeChecked();
  });

  it('edits the days of the notice before through its sheet and shows them in the row', () => {
    renderWithTheme(<RoshChodeshScreen />);
    press('התראה מוקדמת');
    press('2');
    press('שמור');

    expect(notices().before).toEqual({ enabled: true, daysBefore: 2, timing: { anchor: 'clock', minutes: 1200 } });
    expect(screen.getByText('יומיים לפני, 20:00')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'שמור' })).toBeNull();
  });

  describe('the master switch with every kind off', () => {
    beforeEach(() => {
      useUserStore.setState({ roshChodeshNotices: ALL_OFF });
    });

    it('opens the dialog instead of switching on, and Cancel closes it', () => {
      renderWithTheme(<RoshChodeshScreen />);
      flip(MASTER, true);

      expect(screen.getByText(NEEDS_REMINDER_TITLE)).toBeOnTheScreen();
      expect(useUserStore.getState().roshChodeshEnabled).toBe(false);
      expect(screen.getByRole('switch', { name: MASTER })).not.toBeChecked();

      press('ביטול');
      expect(screen.queryByText(NEEDS_REMINDER_TITLE)).toBeNull();
      expect(useUserStore.getState().roshChodeshEnabled).toBe(false);
    });

    it('stays on the page and scrolls to the top on Settings', () => {
      const spy = jest.spyOn(ScrollView.prototype, 'scrollTo');
      renderWithTheme(<RoshChodeshScreen />);
      flip(MASTER, true);
      press('הגדרה');

      expect(screen.queryByText(NEEDS_REMINDER_TITLE)).toBeNull();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith({ y: 0, animated: true });
      expect(mockPush).not.toHaveBeenCalled();
      expect(useUserStore.getState().roshChodeshEnabled).toBe(false);
      spy.mockRestore();
    });

    it('switches on once a kind is on', () => {
      renderWithTheme(<RoshChodeshScreen />);
      flip('ביום עצמו', true);
      flip(MASTER, true);

      expect(screen.queryByText(NEEDS_REMINDER_TITLE)).toBeNull();
      expect(useUserStore.getState().roshChodeshEnabled).toBe(true);
    });
  });

  it('refuses to switch the last kind off while the master switch is on and says why', () => {
    useUserStore.setState({ roshChodeshEnabled: true, roshChodeshNotices: ONLY_DAY });
    renderWithTheme(<RoshChodeshScreen />);
    expect(screen.queryByText(LAST_KIND_ERROR)).toBeNull();

    flip('ביום עצמו', false);

    expect(screen.getByText(LAST_KIND_ERROR)).toBeOnTheScreen();
    expect(notices()).toEqual(ONLY_DAY);
    expect(screen.getByRole('switch', { name: 'ביום עצמו' })).toBeChecked();
  });

  it('lets the first tap on a sheet button through while the keyboard is open', () => {
    renderWithTheme(<RoshChodeshScreen />);
    expect(screen.UNSAFE_getByType(ScrollView).props.keyboardShouldPersistTaps).toBe('handled');
  });
});
