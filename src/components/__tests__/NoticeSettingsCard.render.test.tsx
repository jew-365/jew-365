import { fireEvent, screen } from '@testing-library/react-native';
import { IconTile } from '../IconTile';
import { NoticeSettingsCard, noticeCaption, type NoticeKindOption } from '../NoticeSettingsCard';
import { translate, type AppLanguage } from '@/i18n';
import type { RoshChodeshWhen } from '@/services/notifications/ids';
import {
  DEFAULT_HILULA_NOTICES as D_H,
  DEFAULT_ROSH_CHODESH_NOTICES as D_RC,
  useUserStore,
  type NoticeSetting,
  type RoshChodeshNotices,
} from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';

const KINDS: NoticeKindOption<RoshChodeshWhen>[] = [
  { kind: 'before', title: 'התראה מוקדמת', defaultDaysBefore: 3 },
  { kind: 'evening', title: 'בערב שלפני' },
  { kind: 'day', title: 'ביום עצמו' },
];

const off = (setting: NoticeSetting): NoticeSetting => ({ ...setting, enabled: false });

function setup(notices: RoshChodeshNotices = D_RC, masterOn = false) {
  const onChange = jest.fn();
  const card = (on: boolean) => (
    <NoticeSettingsCard
      icon="moon"
      topic="ראש חודש"
      kinds={KINDS}
      notices={notices}
      masterOn={on}
      onChange={onChange}
    />
  );
  const { rerender } = renderWithTheme(card(masterOn));
  return { onChange, setMasterOn: (on: boolean) => rerender(card(on)) };
}

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const save = () => press('שמור');
const toggle = (name: string, value: boolean) => fireEvent(screen.getByRole('switch', { name }), 'valueChange', value);
const isSelected = (name: string) => screen.getByRole('button', { name }).props.accessibilityState.selected;

describe('NoticeSettingsCard', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
  });

  it('lists each kind with its caption and a switch that reads its state', () => {
    setup({ ...D_RC, evening: off(D_RC.evening) });
    expect(screen.getByText('התראה מוקדמת')).toBeOnTheScreen();
    expect(screen.getByText('3 ימים לפני, 20:00')).toBeOnTheScreen();
    expect(screen.getByText('בשקיעה')).toBeOnTheScreen();
    expect(screen.getByText('07:00')).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: 'התראה מוקדמת' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'בערב שלפני' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'ביום עצמו' })).toBeChecked();
  });

  it('draws the icon of a kind that is off muted', () => {
    setup({ ...D_RC, before: off(D_RC.before) });
    expect(screen.UNSAFE_getAllByType(IconTile).map((tile) => tile.props.tone)).toEqual(['muted', 'accent', 'accent']);
  });

  describe('the edit sheet', () => {
    it('opens a kind on its clock time and days, and saves the new days and time', () => {
      const { onChange } = setup();
      press('התראה מוקדמת');

      expect(screen.getByRole('radio', { name: 'בשעה קבועה' })).toBeChecked();
      expect(screen.getByLabelText('הקלדה ידנית').props.value).toBe('20:00');
      expect(isSelected('3')).toBe(true);

      press('5');
      fireEvent.changeText(screen.getByLabelText('הקלדה ידנית'), '21:30');
      save();

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('before', {
        enabled: true,
        daysBefore: 5,
        timing: { anchor: 'clock', minutes: 1290 },
      });
      expect(screen.queryByRole('button', { name: 'שמור' })).toBeNull();
    });

    it('opens a kind on the shkia with its lead, and saves a lead before the shkia without days', () => {
      const { onChange } = setup();
      press('בערב שלפני');

      expect(screen.getByRole('radio', { name: 'בשקיעה' })).toBeChecked();
      expect(isSelected('0')).toBe(true);
      expect(screen.queryByText('כמה ימים לפני')).toBeNull();

      press('30');
      save();

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('evening', {
        enabled: true,
        timing: { anchor: 'shkia', offsetMin: -30 },
      });
    });

    it('keeps the kind off when it is edited while off', () => {
      const { onChange } = setup({ ...D_RC, day: off(D_RC.day) });
      press('ביום עצמו');
      fireEvent.changeText(screen.getByLabelText('הקלדה ידנית'), '06:15');
      save();
      expect(onChange).toHaveBeenCalledWith('day', {
        enabled: false,
        timing: { anchor: 'clock', minutes: 375 },
      });
    });

    it('asks for a time when a set time is chosen and none is typed, and saves nothing', () => {
      const { onChange } = setup();
      press('בערב שלפני');
      fireEvent.press(screen.getByRole('radio', { name: 'בשעה קבועה' }));
      save();

      expect(screen.getByText('יש לבחור שעה')).toBeOnTheScreen();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('saves 21:15 typed digit by digit over the 20:00 it opened on', () => {
      const { onChange } = setup();
      press('התראה מוקדמת');
      expect(screen.getByLabelText('הקלדה ידנית').props.selectTextOnFocus).toBe(true);

      fireEvent.changeText(screen.getByLabelText('הקלדה ידנית'), '2');
      fireEvent.changeText(screen.getByLabelText('הקלדה ידנית'), '21');
      fireEvent.changeText(screen.getByLabelText('הקלדה ידנית'), '211');
      expect(screen.getByLabelText('הקלדה ידנית').props.value).toBe('21:1');
      fireEvent.changeText(screen.getByLabelText('הקלדה ידנית'), '21:15');
      save();

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('before', {
        enabled: true,
        daysBefore: 3,
        timing: { anchor: 'clock', minutes: 1275 },
      });
    });
  });

  describe('the last kind', () => {
    const onlyDay: RoshChodeshNotices = { before: off(D_RC.before), evening: off(D_RC.evening), day: D_RC.day };

    it('cannot be switched off while the master switch is on, and says why', () => {
      const { onChange } = setup(onlyDay, true);
      toggle('ביום עצמו', false);

      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByText('יש להשאיר לפחות התראה אחת כל עוד ההתראות פעילות')).toBeOnTheScreen();
    });

    it('can be switched off while the master switch is off', () => {
      const { onChange } = setup(onlyDay, false);
      toggle('ביום עצמו', false);

      expect(onChange).toHaveBeenCalledWith('day', off(D_RC.day));
      expect(screen.queryByText('יש להשאיר לפחות התראה אחת כל עוד ההתראות פעילות')).toBeNull();
    });

    it('clears the message when the master switch goes off, and does not bring it back when it is on again', () => {
      const { setMasterOn } = setup(onlyDay, true);
      toggle('ביום עצמו', false);
      expect(screen.getByText('יש להשאיר לפחות התראה אחת כל עוד ההתראות פעילות')).toBeOnTheScreen();

      setMasterOn(false);
      expect(screen.queryByText('יש להשאיר לפחות התראה אחת כל עוד ההתראות פעילות')).toBeNull();

      setMasterOn(true);
      expect(screen.queryByText('יש להשאיר לפחות התראה אחת כל עוד ההתראות פעילות')).toBeNull();
    });

    it('clears the message once another kind is switched on', () => {
      const { onChange } = setup(onlyDay, true);
      toggle('ביום עצמו', false);
      toggle('בערב שלפני', true);

      expect(onChange).toHaveBeenCalledWith('evening', D_RC.evening);
      expect(screen.queryByText('יש להשאיר לפחות התראה אחת כל עוד ההתראות פעילות')).toBeNull();
    });
  });
});

describe('noticeCaption', () => {
  const caption = (setting: NoticeSetting, defaultDaysBefore: number | undefined, language: AppLanguage): string =>
    noticeCaption(setting, defaultDaysBefore, (key, options) => translate(key, options, language, null));
  const shkia = (offsetMin: number, daysBefore?: number): NoticeSetting => ({
    enabled: true,
    ...(daysBefore === undefined ? {} : { daysBefore }),
    timing: { anchor: 'shkia', offsetMin },
  });

  it.each<[string, NoticeSetting, number | undefined, string, string]>([
    ['three days before at a clock time', D_RC.before, 3, '3 ימים לפני, 20:00', '3 days before, 20:00'],
    ['a day before at the shkia', shkia(0, 1), 3, 'יום לפני, בשקיעה', 'A day before, at sunset'],
    [
      'two days before a lead ahead of the shkia',
      shkia(-45, 2),
      3,
      "יומיים לפני, 45 דק' לפני השקיעה",
      'Two days before, 45 min before sunset',
    ],
    ['the hilula default', D_H.before, 1, 'יום לפני, בשקיעה', 'A day before, at sunset'],
    ['the shkia without days', shkia(0), undefined, 'בשקיעה', 'At sunset'],
    ['a lead without days', shkia(-15), undefined, "15 דק' לפני השקיעה", '15 min before sunset'],
    ['a clock time without days', D_RC.day, undefined, '07:00', '07:00'],
  ])('words %s', (_name, setting, defaultDaysBefore, he, en) => {
    expect(caption(setting, defaultDaysBefore, 'he')).toBe(he);
    expect(caption(setting, defaultDaysBefore, 'en')).toBe(en);
  });

  it('reads a stored number of days outside one to seven as the nearest day', () => {
    expect(caption(shkia(0, 12), 3, 'en')).toBe('7 days before, at sunset');
  });
});
