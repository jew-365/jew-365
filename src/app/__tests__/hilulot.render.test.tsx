const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

import { ScrollView } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import HilulotScreen from '../hilulot';
import { DEFAULT_HILULA_NOTICES as DEFAULTS, useUserStore, type HilulaNotices } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';

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
});
