const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), back: mockBack, replace: mockReplace, canGoBack: () => mockCanGoBack }),
  useLocalSearchParams: () => mockParams,
}));

import { Modal } from 'react-native';
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
import { t } from '@/i18n';
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
const LABEL_PLACEHOLDER = 'לדוגמה: הגיע הזמן';

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

const openSheet = () => within(screen.UNSAFE_getAllByType(Modal).find((modal) => modal.props.visible)!);
const scheduleSelect = () => screen.getByRole('button', { name: new RegExp(`^${t('custom.schedule')}: `) });
const chooseMode = (title: string) => {
  fireEvent.press(scheduleSelect());
  fireEvent.press(openSheet().getByText(title));
};

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

  it('saves the icon picked from the icon sheet, and keeps it on the next edit', () => {
    storeCustom([ONE]);
    renderForm({ id: STORED_ID });
    const field = () => screen.getByRole('button', { name: `${t('custom.icon')}: ${t('custom.iconName.custom')}` });
    expect(within(field()).UNSAFE_getAllByType(MitzvahIcon)[0].props.name).toBe('custom');
    fireEvent.press(field());
    const sheet = openSheet();
    expect(
      sheet.getByRole('radio', { name: t('custom.iconSelected', { name: t('custom.iconName.custom') }) }),
    ).toBeTruthy();
    expect(sheet.queryByTestId('custom-icon-chevronLeft')).toBeNull();
    fireEvent.press(sheet.getByRole('radio', { name: t('custom.iconName.apple') }));
    const picked = screen.getByRole('button', { name: `${t('custom.icon')}: ${t('custom.iconName.apple')}` });
    expect(within(picked).UNSAFE_getAllByType(MitzvahIcon)[0].props.name).toBe('apple');
    fireEvent.press(screen.getByRole('button', { name: SAVE }));
    expect(list()[0].icon).toBe('apple');
    screen.unmount();

    renderForm({ id: STORED_ID });
    expect(screen.getByRole('button', { name: `${t('custom.icon')}: ${t('custom.iconName.apple')}` })).toBeTruthy();
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

  it('opens a new mitzvah on its own screen, with one reminder at the start of its time labelled its name', () => {
    renderForm();
    fireEvent.changeText(screen.getByPlaceholderText('לדוגמה: לימוד יומי'), 'לימוד');
    fireEvent.press(screen.getByRole('button', { name: SAVE }));
    const [saved] = list();
    expect(saved.reminders).toEqual([{ anchor: 'start', offsetMin: 0, label: 'לימוד' }]);
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/mitzvah/[id]', params: { id: saved.id } });
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('leaves an edit for the library when there is nothing to go back to, and goes back when it can', () => {
    storeCustom([ONE]);
    mockCanGoBack = false;
    renderForm({ id: STORED_ID });
    fireEvent.press(screen.getByRole('button', { name: SAVE }));
    expect(mockReplace).toHaveBeenCalledWith('/mitzvot');
    screen.unmount();
    mockReplace.mockReset();
    mockCanGoBack = true;
    renderForm({ id: STORED_ID });
    fireEvent.press(screen.getByRole('button', { name: SAVE }));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('holds no reminder: they live on the timeline of the mitzvah screen, and a save keeps them and the timeline as they are', () => {
    renderForm();
    expect(screen.getByText(t('custom.hint.reminders'))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: ADD_REMINDER })).toBeNull();
    expect(screen.queryByRole('button', { name: DELETE_REMINDER })).toBeNull();
    expect(screen.queryByPlaceholderText(LABEL_PLACEHOLDER)).toBeNull();
    screen.unmount();

    const stored: Reminder[] = [
      { anchor: 'start', offsetMin: -30, label: 'א' },
      { anchor: 'end', offsetMin: -20, label: 'ב' },
    ];
    storeCustom(stored);
    const onTimeline: Reminder[] = [{ anchor: 'clock', offsetMin: 600, label: 'ג' }];
    useMitzvotStore.getState().setReminders(STORED_ID, onTimeline);
    useMitzvotStore.getState().setManualNags(STORED_ID, [{ anchor: 'end', offsetMin: -15, kind: 'zone' }]);
    renderForm({ id: STORED_ID });
    fireEvent.changeText(screen.getByDisplayValue('לימוד'), 'לימוד יומי');
    fireEvent.press(screen.getByRole('button', { name: SAVE }));
    expect(useCustomMitzvotStore.getState().items[STORED_ID].reminders).toEqual(stored);
    expect(useMitzvotStore.getState().activeMitzvot[STORED_ID].customReminders).toEqual(onTimeline);
    expect(useMitzvotStore.getState().activeMitzvot[STORED_ID].manualNags).toHaveLength(1);
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
  const WEEKDAYS_MODE = 'ימים קבועים בשבוע';
  const RANGE_MODE = 'מתאריך עד תאריך';
  const STREAK_MODE = 'מספר ימים ברצף';
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
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/mitzvah/[id]', params: { id: list()[0].id } });
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

    chooseMode(WEEKDAYS_MODE);
    fireEvent.press(screen.getByRole('checkbox', { name: SATURDAY }));
    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    expect(useCustomMitzvotStore.getState().items[STORED_ID].schedules).toEqual([
      range,
      { from: '2026-10-28', schedule: { mode: 'weekdays', days: [0, 1, 2, 3, 4, 5] } },
    ]);
  });

  it('offers weekdays, a calendar range and a streak in a select, weekdays first and picked', () => {
    renderForm();

    expect(screen.getByText('תזמון המצווה')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: `תזמון המצווה: ${WEEKDAYS_MODE}` })).toBeOnTheScreen();
    expect(screen.queryByRole('radiogroup', { name: 'תזמון המצווה' })).toBeNull();
    expect(screen.getAllByRole('checkbox')).toHaveLength(7);
    expect(screen.queryByText('ימי פעילות')).toBeNull();

    fireEvent.press(scheduleSelect());
    const [first, second, third] = openSheet().getAllByRole('button');
    expect(first).toHaveTextContent(WEEKDAYS_MODE, { exact: false });
    expect(second).toHaveTextContent(RANGE_MODE, { exact: false });
    expect(third).toHaveTextContent(STREAK_MODE, { exact: false });
    expect(first).toBeSelected();
    expect(second).not.toBeSelected();
    expect(third).not.toBeSelected();
  });

  it('shows the caption of each mode in the select and in its sheet', () => {
    const CAPTIONS = {
      [WEEKDAYS_MODE]: 'המצווה חוזרת בימים שבוחרים, בכל שבוע',
      [RANGE_MODE]: 'טווח תאריכים שבוחרים בלוח שנה',
      [STREAK_MODE]: 'מהיום והלאה, למשל 40 יום',
    };
    renderForm();

    expect(screen.getByText(CAPTIONS[WEEKDAYS_MODE])).toBeOnTheScreen();
    fireEvent.press(scheduleSelect());
    Object.entries(CAPTIONS).forEach(([title, caption]) => {
      expect(openSheet().getByText(title)).toBeOnTheScreen();
      expect(openSheet().getByText(caption)).toBeOnTheScreen();
    });
    fireEvent.press(openSheet().getByText(STREAK_MODE));

    expect(screen.getByRole('button', { name: `תזמון המצווה: ${STREAK_MODE}` })).toBeOnTheScreen();
    expect(screen.getByText(CAPTIONS[STREAK_MODE])).toBeOnTheScreen();
    expect(screen.queryByText(CAPTIONS[WEEKDAYS_MODE])).toBeNull();
  });

  it('saves a range picked on the calendar', () => {
    fillNewMitzvah();
    chooseMode(RANGE_MODE);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);

    pickRange('2026-10-29', '2026-10-31');
    expect(screen.getByRole('button', { name: RANGE_FROM_29_TO_31 })).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    expect(list()[0].schedules).toEqual([
      { from: '2026-10-28', schedule: { mode: 'range', start: '2026-10-29', end: '2026-10-31' } },
    ]);
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/mitzvah/[id]', params: { id: list()[0].id } });
  });

  it('refuses a range without both ends', () => {
    fillNewMitzvah();
    chooseMode(RANGE_MODE);
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
    chooseMode(STREAK_MODE);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);

    expect(screen.getByLabelText(STREAK_WHEEL)).toHaveAccessibilityValue({ text: '40' });
    expect(screen.getByText('פעילה מהיום (28 אוקטובר 2026) עד 6 דצמבר 2026')).toBeOnTheScreen();

    settleWheel(10);
    expect(screen.getByText('פעילה מהיום (28 אוקטובר 2026) עד 6 נובמבר 2026')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: SAVE }));

    expect(list()[0].schedules).toEqual([
      { from: '2026-10-28', schedule: { mode: 'streak', start: '2026-10-28', days: 10 } },
    ]);
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/mitzvah/[id]', params: { id: list()[0].id } });
  });

  it('shows a stored streak from its own start until its length changes', () => {
    const stored: ScheduleEntry = {
      from: '2026-10-20',
      schedule: { mode: 'streak', start: '2026-10-20', days: 30 },
    };
    storeWithSchedule({ schedules: [stored] });
    renderForm({ id: STORED_ID });

    expect(screen.getByRole('button', { name: `תזמון המצווה: ${STREAK_MODE}` })).toBeOnTheScreen();
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

    expect(screen.getByRole('button', { name: `תזמון המצווה: ${STREAK_MODE}` })).toBeOnTheScreen();
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

    expect(screen.getByRole('button', { name: `תזמון המצווה: ${RANGE_MODE}` })).toBeOnTheScreen();
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
    chooseMode(RANGE_MODE);
    pickRange('2026-10-29', '2026-10-31');

    chooseMode(WEEKDAYS_MODE);
    chooseMode(RANGE_MODE);

    expect(screen.getByRole('button', { name: RANGE_FROM_29_TO_31 })).toBeOnTheScreen();
  });

  it('writes the schedule lines in English', () => {
    useUserStore.setState({ language: 'en' });
    renderForm();

    chooseMode('A run of days');
    expect(screen.getByText('Active from today (Oct 28, 2026) to Dec 6, 2026')).toBeOnTheScreen();

    chooseMode('From date to date');
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

describe('the nag level and the time it takes in the custom form', () => {
  const nagLevelSelect = () => screen.getByRole('button', { name: new RegExp(`^${t('custom.nagLevel')}: `) });
  const performField = () => screen.getByLabelText(t('custom.performMin'));

  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ language: 'he' });
    useCustomMitzvotStore.getState().reset();
    useMitzvotStore.getState().reset();
    mockBack.mockReset();
    mockReplace.mockReset();
    mockCanGoBack = true;
  });

  it('saves the minutes it takes, 10 by default, and refuses a value out of range', () => {
    renderForm();
    fireEvent.changeText(screen.getByPlaceholderText('לדוגמה: לימוד יומי'), 'לימוד');
    expect(performField()).toHaveDisplayValue('10');
    fireEvent.changeText(performField(), '0');
    fireEvent.press(screen.getByRole('button', { name: SAVE }));
    expect(screen.getByText(t('custom.errors.performMin', { max: 180 }))).toBeOnTheScreen();
    expect(list()).toEqual([]);
    fireEvent.changeText(performField(), '2a5');
    expect(performField()).toHaveDisplayValue('25');
    fireEvent.press(screen.getByRole('button', { name: SAVE }));
    expect(list()[0].performMin).toBe(25);
  });

  it('seeds the minutes from the stored mitzvah', () => {
    storeCustom([ONE]);
    useCustomMitzvotStore.getState().update(STORED_ID, { performMin: 40 });
    renderForm({ id: STORED_ID });
    expect(performField()).toHaveDisplayValue('40');
  });

  it('writes the mitzvah’s level on save, and a save that leaves it alone keeps it', () => {
    storeCustom([ONE]);
    renderForm({ id: STORED_ID });
    expect(nagLevelSelect()).toHaveAccessibleName(
      `${t('custom.nagLevel')}: ${t('detail.nagLevelApp', { name: t('nag.level.1.name'), level: 1 })}`,
    );
    fireEvent.press(nagLevelSelect());
    fireEvent.press(openSheet().getByText(t('nag.level.title', { name: t('nag.level.3.name'), level: 3 })));
    fireEvent.press(screen.getByRole('button', { name: SAVE }));
    expect(useMitzvotStore.getState().activeMitzvot[STORED_ID].nagLevel).toBe(3);
    screen.unmount();

    renderForm({ id: STORED_ID });
    expect(nagLevelSelect()).toHaveAccessibleName(
      `${t('custom.nagLevel')}: ${t('nag.level.title', { name: t('nag.level.3.name'), level: 3 })}`,
    );
    fireEvent.changeText(screen.getByDisplayValue('לימוד'), 'לימוד יומי');
    fireEvent.press(screen.getByRole('button', { name: SAVE }));
    expect(useMitzvotStore.getState().activeMitzvot[STORED_ID].nagLevel).toBe(3);
  });

  it('gives a new mitzvah no level of its own unless one is chosen', () => {
    renderForm();
    fireEvent.changeText(screen.getByPlaceholderText('לדוגמה: לימוד יומי'), 'לימוד');
    fireEvent.press(screen.getByRole('button', { name: SAVE }));
    const [saved] = list();
    expect(useMitzvotStore.getState().activeMitzvot[saved.id]).toEqual(expect.objectContaining({ enabled: true }));
    expect(useMitzvotStore.getState().activeMitzvot[saved.id].nagLevel).toBeUndefined();
  });
});
