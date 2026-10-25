const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), back: mockBack, replace: mockReplace, canGoBack: () => mockCanGoBack }),
  useLocalSearchParams: () => mockParams,
}));

import { fireEvent, screen, within } from '@testing-library/react-native';
import CustomMitzvahScreen from '../custom-mitzvah';
import { MitzvahIcon } from '@/components/MitzvahIcon';
import { WHEEL_ITEM_HEIGHT } from '@/components/WheelPicker';
import { CITIES } from '@/data/cities';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';
import { useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { THEMES } from '@/theme/colors';
import { CustomMitzvah, Reminder, ScheduleEntry } from '@/types/mitzvah';
import { SCHEDULE_ORIGIN } from '@/utils/customMitzvah';

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
const ONE: Reminder = { anchor: 'start', offsetMin: 0, label: 'א' };
const DELETE_REMINDER = 'מחיקת התראה';
const ADD_REMINDER = 'הוסף התראה';
const SAVE = 'שמור';
const DELETE = 'מחק מצווה';
const STORED_ID = 'custom_1800000000000_abc';
const SET_TIME = 'בשעה קבועה';
const TIME_BUTTON = 'שעה';
const FOLLOW_UP = 'אחרי הסוף, אם לא בוצע';
const BEFORE_END = 'לפני סוף הזמן';
const FOLLOW_UP_HINT = 'הדקות נספרות מסוף הזמן, עד 720. ההתראה נשלחת רק אם המצווה לא סומנה';
const OUTSIDE_NOTE = 'התזכורת מוקדמת ביותר מ־3 שעות לפני תחילת השעות, או אחרי סופן, ולכן לא תישלח';
const OUTSIDE_ERROR = 'יש תזכורת מוקדמת ביותר מ־3 שעות לפני תחילת השעות, או אחרי סופן';
const FOLLOW_UP_RANGE = 'בתזכורת אחרי הסוף יש לבחור בין 1 ל-720 דקות';

const list = () => Object.values(useCustomMitzvotStore.getState().items);

function storeCustom(reminders: Reminder[]) {
  useCustomMitzvotStore.getState().add({
    id: STORED_ID,
    name: 'לימוד',
    startHHMM: '08:00',
    endHHMM: '12:00',
    reminders,
    skipOn: [],
    createdAt: 1800000000000,
  });
}

function renderForm(params: Record<string, string> = {}) {
  mockParams = params;
  return renderWithTheme(<CustomMitzvahScreen />);
}

describe('Custom mitzvah form', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ language: 'he' });
    useCustomMitzvotStore.getState().reset();
    useMitzvotStore.getState().reset();
    mockBack.mockReset();
    mockReplace.mockReset();
    mockCanGoBack = true;
  });

  it('adds a reminder from the plus button', () => {
    renderForm();
    expect(screen.getAllByRole('button', { name: DELETE_REMINDER })).toHaveLength(1);
    const add = screen.getByRole('button', { name: ADD_REMINDER });
    expect(within(add).UNSAFE_getByType(MitzvahIcon).props.name).toBe('plus');
    expect(screen.queryByText(/^\+ /)).toBeNull();
    fireEvent.press(add);
    expect(screen.getAllByRole('button', { name: DELETE_REMINDER })).toHaveLength(2);
  });

  it('draws the reminder delete as a compact danger button', () => {
    renderForm();
    expect(screen.getAllByRole('button', { name: DELETE_REMINDER })[0]).toHaveStyle({
      backgroundColor: THEMES.gold.urgentBg,
      minHeight: 40,
    });
  });

  it('saves from a primary button and deletes from a danger one', () => {
    renderForm();
    expect(screen.getByRole('button', { name: SAVE })).toHaveStyle({ backgroundColor: THEMES.gold.gold });
    expect(screen.queryByRole('button', { name: DELETE })).toBeNull();
    screen.unmount();

    useCustomMitzvotStore.getState().add({
      id: STORED_ID,
      name: 'לימוד',
      startHHMM: '08:00',
      endHHMM: '12:00',
      reminders: [],
      skipOn: [],
      createdAt: 1800000000000,
    });
    renderForm({ id: STORED_ID });
    expect(screen.getByRole('button', { name: DELETE })).toHaveStyle({ backgroundColor: THEMES.gold.urgentBg });
  });

  it("seeds the edit form from the mitzvah screen's reminders", () => {
    useCustomMitzvotStore.getState().add({
      id: STORED_ID,
      name: 'לימוד',
      startHHMM: '08:00',
      endHHMM: '12:00',
      reminders: [ONE],
      skipOn: [],
      createdAt: 1800000000000,
    });
    renderForm({ id: STORED_ID });
    expect(screen.getAllByRole('button', { name: DELETE_REMINDER })).toHaveLength(1);
    screen.unmount();

    useMitzvotStore.getState().setReminders(STORED_ID, [ONE, { anchor: 'end', offsetMin: -10, label: 'ב' }]);
    renderForm({ id: STORED_ID });
    expect(screen.getAllByRole('button', { name: DELETE_REMINDER })).toHaveLength(2);
    expect(screen.getByDisplayValue('ב')).toBeOnTheScreen();
  });

  it('offers a set time beside start and end, and saves a clock reminder', () => {
    renderForm();
    fireEvent.changeText(screen.getByPlaceholderText('לדוגמה: לימוד יומי'), 'לימוד');
    fireEvent.changeText(screen.getByPlaceholderText('לדוגמה: הגיע הזמן'), 'עשר');
    fireEvent.press(screen.getByRole('radio', { name: SET_TIME }));
    expect(screen.queryByLabelText('דקות')).toBeNull();

    const time = screen.getByRole('button', { name: TIME_BUTTON });
    expect(time).toHaveAccessibilityValue({ text: '08:00' });
    fireEvent.press(time);
    fireEvent.changeText(screen.getByLabelText('הקלדה ידנית'), '1000');
    fireEvent.press(screen.getByRole('button', { name: 'סגור' }));
    expect(screen.getByText('תישלח בשעה 10:00')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    expect(list()[0].reminders).toEqual([{ anchor: 'clock', offsetMin: 600, label: 'עשר' }]);
    expect(useMitzvotStore.getState().activeMitzvot[list()[0].id].enabled).toBe(true);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('keeps a clock reminder and a heads-up set on the mitzvah screen when the form saves again', () => {
    storeCustom([ONE]);
    const kept: Reminder[] = [
      { anchor: 'clock', offsetMin: 420, label: 'ב' },
      { anchor: 'start', offsetMin: -60, label: 'ג' },
    ];
    useMitzvotStore.getState().setReminders(STORED_ID, kept);
    renderForm({ id: STORED_ID });

    const setTimeRadios = screen.getAllByRole('radio', { name: SET_TIME });
    expect(setTimeRadios[0]).toBeSelected();
    expect(setTimeRadios[1]).not.toBeSelected();
    expect(screen.getByRole('button', { name: TIME_BUTTON })).toHaveAccessibilityValue({ text: '07:00' });
    expect(screen.getByDisplayValue('-60')).toBeOnTheScreen();
    expect(screen.getAllByText('תישלח בשעה 07:00')).toHaveLength(2);
    expect(screen.queryByText(OUTSIDE_NOTE)).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    expect(useCustomMitzvotStore.getState().items[STORED_ID].reminders).toEqual(kept);
    expect(useMitzvotStore.getState().activeMitzvot[STORED_ID]?.customReminders).toBeUndefined();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('edits the size of a heads-up offset without flipping its sign, up to 180 minutes early', () => {
    storeCustom([{ anchor: 'start', offsetMin: -60, label: 'ג' }]);
    renderForm({ id: STORED_ID });

    fireEvent.changeText(screen.getByDisplayValue('-60'), '90');
    expect(screen.getByDisplayValue('-90')).toBeOnTheScreen();
    expect(screen.getByText('תישלח בשעה 06:30')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByDisplayValue('-90'), '500');
    expect(screen.getByDisplayValue('-180')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    expect(useCustomMitzvotStore.getState().items[STORED_ID].reminders).toEqual([
      { anchor: 'start', offsetMin: -180, label: 'ג' },
    ]);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('keeps a start offset positive and an end offset before the end while their minutes are edited', () => {
    storeCustom([
      { anchor: 'start', offsetMin: 15, label: 'א' },
      { anchor: 'end', offsetMin: -30, label: 'ב' },
    ]);
    renderForm({ id: STORED_ID });

    fireEvent.changeText(screen.getByDisplayValue('15'), '40');
    fireEvent.changeText(screen.getByDisplayValue('30'), '45');
    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    expect(useCustomMitzvotStore.getState().items[STORED_ID].reminders).toEqual([
      { anchor: 'start', offsetMin: 40, label: 'א' },
      { anchor: 'end', offsetMin: -45, label: 'ב' },
    ]);
  });

  it('offers a follow-up after the end as a fourth anchor and saves it', () => {
    storeCustom([ONE]);
    renderForm({ id: STORED_ID });

    fireEvent.press(screen.getByRole('radio', { name: FOLLOW_UP }));

    expect(screen.getByRole('radio', { name: FOLLOW_UP })).toBeSelected();
    expect(screen.getByDisplayValue('60')).toBeOnTheScreen();
    expect(screen.getByText('תישלח בשעה 13:00')).toBeOnTheScreen();
    expect(screen.getByText(FOLLOW_UP_HINT)).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    expect(useCustomMitzvotStore.getState().items[STORED_ID].reminders).toEqual([
      { anchor: 'followUp', offsetMin: 60, label: 'א' },
    ]);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('saves a follow-up with no label as an empty label and shows the default text as its placeholder', () => {
    renderForm();
    fireEvent.changeText(screen.getByPlaceholderText('לדוגמה: לימוד יומי'), 'לימוד');
    fireEvent.press(screen.getByRole('button', { name: SAVE }));
    expect(screen.getByText('לכל התראה צריך טקסט')).toBeOnTheScreen();
    expect(list()).toHaveLength(0);

    fireEvent.press(screen.getByRole('radio', { name: FOLLOW_UP }));
    expect(screen.getByPlaceholderText('עוד לא סימנת: לימוד')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    expect(list()[0].reminders).toEqual([{ anchor: 'followUp', offsetMin: 60, label: '' }]);
    expect(useMitzvotStore.getState().activeMitzvot[list()[0].id].enabled).toBe(true);
  });

  it('follows the mitzvah name in the follow-up placeholder, and keeps a typed label verbatim', () => {
    renderForm();
    fireEvent.changeText(screen.getByPlaceholderText('לדוגמה: לימוד יומי'), 'לימוד');
    fireEvent.press(screen.getByRole('radio', { name: FOLLOW_UP }));
    expect(screen.getByPlaceholderText('עוד לא סימנת: לימוד')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByPlaceholderText('לדוגמה: לימוד יומי'), 'שיעור');
    expect(screen.getByPlaceholderText('עוד לא סימנת: שיעור')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByPlaceholderText('עוד לא סימנת: שיעור'), 'חזור ללמוד');
    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    expect(list()[0].reminders).toEqual([{ anchor: 'followUp', offsetMin: 60, label: 'חזור ללמוד' }]);
  });

  it('keeps a follow-up within 720 minutes and refuses one at 0 with the follow-up range copy', () => {
    storeCustom([{ anchor: 'followUp', offsetMin: 60, label: 'ה' }]);
    renderForm({ id: STORED_ID });

    fireEvent.changeText(screen.getByDisplayValue('60'), '900');
    expect(screen.getByDisplayValue('720')).toBeOnTheScreen();
    expect(screen.getByText('תישלח בשעה 00:00')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByDisplayValue('720'), '0');
    expect(screen.getAllByText(FOLLOW_UP_RANGE)).toHaveLength(1);
    expect(screen.queryByText(OUTSIDE_NOTE)).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    expect(screen.getAllByText(FOLLOW_UP_RANGE)).toHaveLength(2);
    expect(screen.queryByText(OUTSIDE_ERROR)).toBeNull();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('leaving a follow-up sets 0 for start or end and the start time for a set time', () => {
    storeCustom([{ anchor: 'followUp', offsetMin: 60, label: 'ה' }]);
    renderForm({ id: STORED_ID });

    fireEvent.press(screen.getByRole('radio', { name: BEFORE_END }));
    expect(screen.getByDisplayValue('0')).toBeOnTheScreen();
    expect(screen.getByText('תישלח בשעה 12:00')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('radio', { name: FOLLOW_UP }));
    expect(screen.getByDisplayValue('60')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('radio', { name: SET_TIME }));
    expect(screen.getByRole('button', { name: TIME_BUTTON })).toHaveAccessibilityValue({ text: '08:00' });
  });

  it('refuses a clock time more than 180 minutes before the hours', () => {
    storeCustom([{ anchor: 'clock', offsetMin: 299, label: 'ד' }]);
    renderForm({ id: STORED_ID });

    expect(screen.getByText(OUTSIDE_NOTE)).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    expect(screen.getByText(OUTSIDE_ERROR)).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('leaves for the library after a save when there is nothing to go back to, and goes back when it can', () => {
    const fillAndSave = () => {
      renderForm();
      fireEvent.changeText(screen.getByPlaceholderText('לדוגמה: לימוד יומי'), 'לימוד');
      fireEvent.changeText(screen.getByPlaceholderText('לדוגמה: הגיע הזמן'), 'עכשיו');
      fireEvent.press(screen.getByRole('button', { name: SAVE }));
    };

    mockCanGoBack = false;
    fillAndSave();
    expect(list()).toHaveLength(1);
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/mitzvot');
    expect(mockBack).not.toHaveBeenCalled();

    screen.unmount();
    mockReplace.mockReset();
    mockCanGoBack = true;
    fillAndSave();
    expect(list()).toHaveLength(2);
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('leaves for the library after a delete when there is nothing to go back to', () => {
    storeCustom([ONE]);
    mockCanGoBack = false;
    renderForm({ id: STORED_ID });

    fireEvent.press(screen.getByRole('button', { name: DELETE }));
    fireEvent.press(screen.getByRole('button', { name: 'מחק' }));

    expect(useCustomMitzvotStore.getState().items[STORED_ID]).toBeUndefined();
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/mitzvot');
    expect(mockBack).not.toHaveBeenCalled();
  });
});

describe('the schedule it saves', () => {
  const SATURDAY = 'ש׳';
  const FRIDAY = 'ו׳';
  const SUNDAY = 'א׳';
  const MONDAY = 'ב׳';
  const WEDNESDAY = 'ד׳';
  const WEEKDAYS_MODE = 'הגדר לפי ימי פעילות';
  const RANGE_MODE = 'בחירה ביומן';
  const STREAK_MODE = 'בחירת ימים ברצף';
  const PICK_DATES = 'בחירת תאריכים';
  const STREAK_WHEEL = 'מספר ימים';
  const RANGE_FROM_29_TO_31 = 'מ־29 אוקטובר 2026 עד 31 אוקטובר 2026';
  const ALL_WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  const ENDED_STREAK: ScheduleEntry = {
    from: '2026-10-01',
    schedule: { mode: 'streak', start: '2026-10-01', days: 10 },
  };
  const ENDED_LINE = 'הייתה פעילה מ־1 אוקטובר 2026 עד 10 אוקטובר 2026 והסתיימה';

  const calendarDay = (key: string) => screen.getByTestId(`calendar-day-${key}`);
  const settleWheel = (value: number) =>
    fireEvent(screen.getByLabelText(STREAK_WHEEL), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 0, y: (value - 1) * WHEEL_ITEM_HEIGHT } },
    });
  const pickRange = (from: string, to: string) => {
    fireEvent.press(screen.getByRole('button', { name: PICK_DATES }));
    fireEvent.press(calendarDay(from));
    fireEvent.press(calendarDay(to));
    fireEvent.press(screen.getByRole('button', { name: 'סגור' }));
  };
  const fillNewMitzvah = () => {
    renderForm();
    fireEvent.changeText(screen.getByPlaceholderText('לדוגמה: לימוד יומי'), 'לימוד');
    fireEvent.changeText(screen.getByPlaceholderText('לדוגמה: הגיע הזמן'), 'עכשיו');
  };
  const storeWithSchedule = (fields: Partial<CustomMitzvah>) =>
    useCustomMitzvotStore.getState().add({
      id: STORED_ID,
      name: 'לימוד',
      startHHMM: '08:00',
      endHHMM: '12:00',
      reminders: [ONE],
      skipOn: [],
      createdAt: 1800000000000,
      ...fields,
    });

  beforeEach(() => {
    jest.useFakeTimers({ now: at(J, '2026-10-28T10:00'), doNotFake: [...ONLY_DATE] });
    useUserStore.getState().reset();
    useUserStore.setState({ language: 'he', location: J });
    useCustomMitzvotStore.getState().reset();
    useMitzvotStore.getState().reset();
    mockBack.mockReset();
    mockReplace.mockReset();
    mockCanGoBack = true;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("saves a new mitzvah as one weekdays entry from today's app day", () => {
    fillNewMitzvah();
    fireEvent.press(screen.getByRole('checkbox', { name: SATURDAY }));
    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    expect(list()[0].schedules).toEqual([
      { from: '2026-10-28', schedule: { mode: 'weekdays', days: [0, 1, 2, 3, 4, 5] } },
    ]);
    expect(list()[0].activeDays).toBeUndefined();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('files a save between midnight and alot under the evening before', () => {
    jest.setSystemTime(at(J, '2026-10-29T02:00'));
    fillNewMitzvah();
    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    expect(list()[0].schedules).toEqual([
      { from: '2026-10-28', schedule: { mode: 'weekdays', days: [0, 1, 2, 3, 4, 5, 6] } },
    ]);
  });

  it('seeds the days from the current weekdays schedule and keeps the entries when only the name changes', () => {
    const schedules: ScheduleEntry[] = [{ from: '2026-10-01', schedule: { mode: 'weekdays', days: [1, 3] } }];
    storeWithSchedule({ schedules });
    renderForm({ id: STORED_ID });

    expect(screen.getByRole('checkbox', { name: MONDAY })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: WEDNESDAY })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: SUNDAY })).not.toBeChecked();

    fireEvent.changeText(screen.getByDisplayValue('לימוד'), 'שיעור');
    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    expect(useCustomMitzvotStore.getState().items[STORED_ID].schedules).toEqual(schedules);
    expect(useCustomMitzvotStore.getState().items[STORED_ID].name).toBe('שיעור');
  });

  it('appends an entry from today when the days change, keeping the earlier one', () => {
    storeWithSchedule({ activeDays: [0, 1, 2, 3, 4] });
    renderForm({ id: STORED_ID });

    fireEvent.press(screen.getByRole('checkbox', { name: FRIDAY }));
    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    const saved = useCustomMitzvotStore.getState().items[STORED_ID];
    expect(saved.schedules).toEqual([
      { from: SCHEDULE_ORIGIN, schedule: { mode: 'weekdays', days: [0, 1, 2, 3, 4] } },
      { from: '2026-10-28', schedule: { mode: 'weekdays', days: [0, 1, 2, 3, 4, 5] } },
    ]);
    expect(saved.activeDays).toBeUndefined();
  });

  it('keeps a stored range as it is when only the name changes', () => {
    const schedules: ScheduleEntry[] = [
      { from: '2026-10-01', schedule: { mode: 'range', start: '2026-11-20', end: '2026-11-25' } },
    ];
    storeWithSchedule({ schedules });
    renderForm({ id: STORED_ID });

    fireEvent.changeText(screen.getByDisplayValue('לימוד'), 'שיעור');
    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    const saved = useCustomMitzvotStore.getState().items[STORED_ID];
    expect(saved.schedules).toEqual(schedules);
    expect(saved.name).toBe('שיעור');
  });

  it('keeps a stored streak and its start day when only the name changes', () => {
    const schedules: ScheduleEntry[] = [
      { from: '2026-10-20', schedule: { mode: 'streak', start: '2026-10-20', days: 30 } },
    ];
    storeWithSchedule({ schedules });
    renderForm({ id: STORED_ID });
    expect(screen.getByText('פעילה מ־20 אוקטובר 2026 עד 18 נובמבר 2026')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByDisplayValue('לימוד'), 'שיעור');
    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    expect(useCustomMitzvotStore.getState().items[STORED_ID].schedules).toEqual(schedules);
    expect(useCustomMitzvotStore.getState().items[STORED_ID].name).toBe('שיעור');
  });

  it('replaces a stored range with a weekdays entry from today once weekdays are chosen', () => {
    const range: ScheduleEntry = {
      from: '2026-10-01',
      schedule: { mode: 'range', start: '2026-11-20', end: '2026-11-25' },
    };
    storeWithSchedule({ schedules: [range] });
    renderForm({ id: STORED_ID });

    fireEvent.press(screen.getByRole('radio', { name: WEEKDAYS_MODE }));
    fireEvent.press(screen.getByRole('checkbox', { name: SATURDAY }));
    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    expect(useCustomMitzvotStore.getState().items[STORED_ID].schedules).toEqual([
      range,
      { from: '2026-10-28', schedule: { mode: 'weekdays', days: [0, 1, 2, 3, 4, 5] } },
    ]);
  });

  it('offers weekdays, a calendar range and a streak, weekdays first', () => {
    renderForm();

    expect(screen.getByText('תזמון המצווה')).toBeOnTheScreen();
    const [first, second, third] = screen.getAllByRole('radio');
    expect(first).toHaveTextContent(WEEKDAYS_MODE);
    expect(second).toHaveTextContent(RANGE_MODE);
    expect(third).toHaveTextContent(STREAK_MODE);
    expect(screen.getByRole('radio', { name: WEEKDAYS_MODE })).toBeSelected();
    expect(screen.getByRole('radio', { name: RANGE_MODE })).not.toBeSelected();
    expect(screen.getByRole('radio', { name: STREAK_MODE })).not.toBeSelected();
    expect(screen.getAllByRole('checkbox')).toHaveLength(7);
    expect(screen.queryByText('ימי פעילות')).toBeNull();
  });

  it('saves a range picked on the calendar', () => {
    fillNewMitzvah();
    fireEvent.press(screen.getByRole('radio', { name: RANGE_MODE }));
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);

    pickRange('2026-10-29', '2026-10-31');
    expect(screen.getByRole('button', { name: RANGE_FROM_29_TO_31 })).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    expect(list()[0].schedules).toEqual([
      { from: '2026-10-28', schedule: { mode: 'range', start: '2026-10-29', end: '2026-10-31' } },
    ]);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('refuses a range without both ends', () => {
    fillNewMitzvah();
    fireEvent.press(screen.getByRole('radio', { name: RANGE_MODE }));
    fireEvent.press(screen.getByRole('button', { name: SAVE }));
    expect(screen.getByText('יש לבחור יום התחלה ויום סיום')).toBeOnTheScreen();
    expect(list()).toHaveLength(0);

    fireEvent.press(screen.getByRole('button', { name: PICK_DATES }));
    fireEvent.press(calendarDay('2026-10-29'));
    fireEvent.press(screen.getByRole('button', { name: 'סגור' }));
    expect(screen.getByRole('button', { name: 'מ־29 אוקטובר 2026, עוד לא נבחר יום סיום' })).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: SAVE }));
    expect(screen.getByText('יש לבחור יום התחלה ויום סיום')).toBeOnTheScreen();
    expect(list()).toHaveLength(0);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('saves a streak from today with its summary line', () => {
    fillNewMitzvah();
    fireEvent.press(screen.getByRole('radio', { name: STREAK_MODE }));
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);

    expect(screen.getByLabelText(STREAK_WHEEL)).toHaveAccessibilityValue({ text: '40' });
    expect(screen.getByText('פעילה מהיום (28 אוקטובר 2026) עד 6 דצמבר 2026')).toBeOnTheScreen();

    settleWheel(10);
    expect(screen.getByText('פעילה מהיום (28 אוקטובר 2026) עד 6 נובמבר 2026')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    expect(list()[0].schedules).toEqual([
      { from: '2026-10-28', schedule: { mode: 'streak', start: '2026-10-28', days: 10 } },
    ]);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('shows a stored streak from its own start until its length changes', () => {
    const stored: ScheduleEntry = {
      from: '2026-10-20',
      schedule: { mode: 'streak', start: '2026-10-20', days: 30 },
    };
    storeWithSchedule({ schedules: [stored] });
    renderForm({ id: STORED_ID });

    expect(screen.getByRole('radio', { name: STREAK_MODE })).toBeSelected();
    expect(screen.getByText('פעילה מ־20 אוקטובר 2026 עד 18 נובמבר 2026')).toBeOnTheScreen();

    settleWheel(31);
    expect(screen.getByText('פעילה מהיום (28 אוקטובר 2026) עד 27 נובמבר 2026')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    expect(useCustomMitzvotStore.getState().items[STORED_ID].schedules).toEqual([
      stored,
      { from: '2026-10-28', schedule: { mode: 'streak', start: '2026-10-28', days: 31 } },
    ]);
  });

  it('keeps an ended streak ended, with its old dates and its switch off, when only the name changes', () => {
    storeWithSchedule({ schedules: [ENDED_STREAK] });
    useMitzvotStore.getState().setEnabled(STORED_ID, false);
    renderForm({ id: STORED_ID });

    expect(screen.getByRole('radio', { name: STREAK_MODE })).toBeSelected();
    expect(screen.getByText(ENDED_LINE)).toBeOnTheScreen();

    fireEvent.changeText(screen.getByDisplayValue('לימוד'), 'שיעור');
    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    const saved = useCustomMitzvotStore.getState().items[STORED_ID];
    expect(saved.schedules).toEqual([ENDED_STREAK]);
    expect(saved.name).toBe('שיעור');
    expect(useMitzvotStore.getState().activeMitzvot[STORED_ID]?.enabled).toBe(false);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('restarts an ended streak from today once its length changes, and shows it ended again at the stored length', () => {
    storeWithSchedule({ schedules: [ENDED_STREAK] });
    renderForm({ id: STORED_ID });

    settleWheel(12);
    expect(screen.getByText('פעילה מהיום (28 אוקטובר 2026) עד 8 נובמבר 2026')).toBeOnTheScreen();

    settleWheel(10);
    expect(screen.getByText(ENDED_LINE)).toBeOnTheScreen();

    settleWheel(12);
    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    expect(useCustomMitzvotStore.getState().items[STORED_ID].schedules).toEqual([
      ENDED_STREAK,
      { from: '2026-10-28', schedule: { mode: 'streak', start: '2026-10-28', days: 12 } },
    ]);
  });

  it('refuses a streak outside 1 to 365 days', () => {
    const schedules: ScheduleEntry[] = [
      { from: '2026-10-20', schedule: { mode: 'streak', start: '2026-10-20', days: 400 } },
    ];
    storeWithSchedule({ schedules });
    renderForm({ id: STORED_ID });

    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    expect(screen.getByText('מספר הימים ברצף צריך להיות בין 1 ל־365')).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
    expect(useCustomMitzvotStore.getState().items[STORED_ID].schedules).toEqual(schedules);
  });

  it('seeds a stored range into the summary row', () => {
    storeWithSchedule({
      schedules: [{ from: '2026-10-01', schedule: { mode: 'range', start: '2026-11-20', end: '2026-11-25' } }],
    });
    renderForm({ id: STORED_ID });

    expect(screen.getByRole('radio', { name: RANGE_MODE })).toBeSelected();
    expect(screen.getByRole('button', { name: 'מ־20 נובמבר 2026 עד 25 נובמבר 2026' })).toBeOnTheScreen();
  });

  it('refuses weekdays with no day left', () => {
    fillNewMitzvah();
    ALL_WEEKDAYS.forEach((label) => fireEvent.press(screen.getByRole('checkbox', { name: label })));
    expect(screen.queryAllByRole('checkbox', { checked: true })).toHaveLength(0);

    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    expect(screen.getByText('יש לבחור לפחות יום אחד')).toBeOnTheScreen();
    expect(list()).toHaveLength(0);
  });

  it("keeps each mode's draft while another is shown", () => {
    fillNewMitzvah();
    fireEvent.press(screen.getByRole('radio', { name: RANGE_MODE }));
    pickRange('2026-10-29', '2026-10-31');

    fireEvent.press(screen.getByRole('radio', { name: WEEKDAYS_MODE }));
    fireEvent.press(screen.getByRole('radio', { name: RANGE_MODE }));

    expect(screen.getByRole('button', { name: RANGE_FROM_29_TO_31 })).toBeOnTheScreen();
  });

  it('writes the schedule lines in English', () => {
    useUserStore.setState({ language: 'en' });
    renderForm();

    fireEvent.press(screen.getByRole('radio', { name: 'Days in a row' }));
    expect(screen.getByText('Active from today (Oct 28, 2026) to Dec 6, 2026')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('radio', { name: 'Pick on a calendar' }));
    expect(screen.getByRole('button', { name: 'Pick dates' })).toBeOnTheScreen();
  });

  it('offers a siddur text only in the nusach that ships it, so Chabad is never offered Ushpizin', () => {
    const offered = (nusach: 'ashkenaz' | 'chabad') => {
      useUserStore.setState({ nusach });
      const view = renderForm();
      fireEvent.press(screen.getByRole('button', { name: 'הוסף בלוק תוכן' }));
      fireEvent.press(screen.getByRole('button', { name: 'מהסידור' }));
      fireEvent.press(screen.getByRole('button', { name: 'בחירת תפילה או ברכה' }));
      const names = ['אושפיזין', 'הדלקת נרות חנוכה'].filter((name) => screen.queryByText(name) !== null);
      view.unmount();
      return names;
    };
    expect(offered('ashkenaz')).toEqual(['אושפיזין', 'הדלקת נרות חנוכה']);
    expect(offered('chabad')).toEqual(['הדלקת נרות חנוכה']);
  });

  it('writes the ended streak line in English', () => {
    useUserStore.setState({ language: 'en' });
    storeWithSchedule({ schedules: [ENDED_STREAK] });
    renderForm({ id: STORED_ID });

    expect(screen.getByText('Was active from Oct 1, 2026 to Oct 10, 2026 and has ended')).toBeOnTheScreen();
  });
});
