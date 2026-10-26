const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

import { ScrollView } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import HilulotScreen from '../hilulot';
import { CITIES } from '@/data/cities';
import { DEFAULT_HILULA_NOTICES as DEFAULTS, useUserStore, type HilulaNotices } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';

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

const MASTER = 'התראות על הילולות';
const NEEDS_REMINDER_TITLE = 'אין התראות';

const ALL_OFF: HilulaNotices = {
  before: { ...DEFAULTS.before, enabled: false },
  evening: { ...DEFAULTS.evening, enabled: false },
};

const flip = (name: string, value: boolean) => fireEvent(screen.getByRole('switch', { name }), 'valueChange', value);
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

describe('Hilulot screen notice kinds', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    mockPush.mockReset();
  });

  it('lists the two kinds with their times, each switched on', () => {
    renderWithTheme(<HilulotScreen />);
    for (const text of ['מתי להתריע', 'התראה מוקדמת', 'יום לפני, בשקיעה', 'בכניסת ההילולה', 'בשקיעה']) {
      expect(screen.getByText(text)).toBeOnTheScreen();
    }
    expect(screen.getByRole('switch', { name: 'התראה מוקדמת' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'בכניסת ההילולה' })).toBeChecked();
  });

  it('opens the dialog instead of switching on while every kind is off', () => {
    useUserStore.setState({ hilulaNotices: ALL_OFF });
    renderWithTheme(<HilulotScreen />);
    flip(MASTER, true);

    expect(screen.getByText(NEEDS_REMINDER_TITLE)).toBeOnTheScreen();
    expect(useUserStore.getState().hilulotEnabled).toBe(false);
    expect(screen.getByRole('switch', { name: MASTER })).not.toBeChecked();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('moves the evening notice to a set time through its sheet and shows it in the row', () => {
    renderWithTheme(<HilulotScreen />);
    press('בכניסת ההילולה');
    fireEvent.press(screen.getByRole('radio', { name: 'בשעה קבועה' }));
    fireEvent.changeText(screen.getByLabelText('הקלדה ידנית'), '19:00');
    press('שמור');

    expect(useUserStore.getState().hilulaNotices.evening).toEqual({
      enabled: true,
      timing: { anchor: 'clock', minutes: 1140 },
    });
    expect(screen.getByText('19:00')).toBeOnTheScreen();
  });

  it('lets the first tap on a sheet button through while the keyboard is open', () => {
    renderWithTheme(<HilulotScreen />);
    expect(screen.UNSAFE_getByType(ScrollView).props.keyboardShouldPersistTaps).toBe('handled');
  });

  it('opens the page of a tzaddik from his row, named by the tzaddik', () => {
    renderWithTheme(<HilulotScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'הרמ״א, פתיחת הדף' }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/hilula/[id]', params: { id: 'rema' } });
  });

  it('names a row in English in the English UI and opens the same page', () => {
    useUserStore.setState({ language: 'en' });
    renderWithTheme(<HilulotScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Rabbi Shimon bar Yochai, open the page' }));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/hilula/[id]', params: { id: 'rashbi' } });
  });

  describe('on a pinned day', () => {
    beforeAll(() => {
      jest.useFakeTimers({ now: at(CITIES[0], '2026-10-12T06:00'), doNotFake: [...ONLY_DATE] });
    });
    afterAll(() => jest.useRealTimers());
    beforeEach(() => useUserStore.getState().setLocation(CITIES[0]));

    it('keeps the when label beside a row that opens a page', () => {
      renderWithTheme(<HilulotScreen />);

      expect(screen.getByText('בעוד 6 ימים')).toBeOnTheScreen();
      fireEvent.press(screen.getByRole('button', { name: 'רבי מאיר שפירא מלובלין, פתיחת הדף' }));
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/hilula/[id]', params: { id: 'meir_shapiro' } });
    });
  });
});
