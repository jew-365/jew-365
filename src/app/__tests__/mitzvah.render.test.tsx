const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace, canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));
jest.mock('@/services/ChokContentService', () => ({
  ...jest.requireActual('@/services/ChokContentService'),
  checkChokUpdate: jest.fn(async () => {}),
}));
jest.mock('@/services/SelichotContentService', () => ({
  ...jest.requireActual('@/services/SelichotContentService'),
  checkSelichotUpdate: jest.fn(async () => {}),
}));
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  getPresentedNotificationsAsync: jest.fn(async () => []),
  dismissNotificationAsync: jest.fn(async () => {}),
  dismissAllNotificationsAsync: jest.fn(async () => {}),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => ({})),
  setNotificationCategoryAsync: jest.fn(async () => ({})),
  registerTaskAsync: jest.fn(async () => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  AndroidImportance: { HIGH: 'high', DEFAULT: 'default', LOW: 'low' },
  AndroidNotificationVisibility: { PUBLIC: 'public', PRIVATE: 'private' },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(async () => false),
  unregisterTaskAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-background-task', () => ({
  registerTaskAsync: jest.fn(),
  unregisterTaskAsync: jest.fn(),
  getStatusAsync: jest.fn(),
  BackgroundTaskResult: { Success: 1, Failed: 2 },
  BackgroundTaskStatus: { Restricted: 1, Available: 2 },
}));

import { Modal, Platform, ScrollView } from 'react-native';
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react-native';
import { DateTime } from 'luxon';
import MitzvahDetailScreen from '../mitzvah/[id]';
import { CITIES } from '@/data/cities';
import { t } from '@/i18n';
import { HebcalService } from '@/services/HebcalService';
import { useChokStore } from '@/stores/useChokStore';
import { installChokFixture } from '@/testing/chok';
import { renderWithTheme } from '@/testing/render';
import { installSelichotFixture } from '@/testing/selichot';
import { at, zmanimFor } from '@/testing/zmanim';
import { useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { useUserStore } from '@/stores/useUserStore';
import { THEMES } from '@/theme/colors';
import type { Reminder } from '@/types/mitzvah';
import { clockOf } from '@/utils/clock';

const JERUSALEM = CITIES[0];
const SETTINGS_SWITCH = 'המצווה פעילה';
const NEEDS_REMINDER_TITLE = 'אין התראות';
const NEEDS_REMINDER_BODY = 'יש להגדיר לפחות התראה אחת בשביל להפעיל מעקב על המצווה';
const LAST_REMINDER_ERROR = 'יש להשאיר לפחות התראה אחת כל עוד המצווה פעילה';
const DELETE_REMINDER = 'מחק תזכורת';
const DELETE_TITLE = 'למחוק את ההתראה?';
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

function renderMitzvah(params: Record<string, string>) {
  mockParams = params;
  return renderWithTheme(<MitzvahDetailScreen />);
}

describe('Mitzvah screen', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: at(JERUSALEM, '2026-10-28T07:00'), doNotFake: [...ONLY_DATE] });
    useUserStore.getState().reset();
    useUserStore.setState({
      language: 'he',
      location: JERUSALEM,
      inIsrael: true,
      nusach: 'ashkenaz',
      isOnboarded: true,
    });
    useMitzvotStore.getState().reset();
    useChokStore.getState().reset();
    mockPush.mockReset();
    mockBack.mockReset();
    mockReplace.mockReset();
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
    useChokStore.getState().reset();
    useSelichotStore.getState().reset();
  });

  it('gives an unknown id a header with a way back', () => {
    renderMitzvah({ id: 'nope' });
    expect(screen.getByText('המצווה לא נמצאה')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'חזור' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('opens the text from a primary button', () => {
    renderMitzvah({ id: 'shacharit' });
    const open = screen.getByRole('button', { name: 'פתח נוסח' });
    expect(open).toHaveStyle({ backgroundColor: THEMES.gold.gold });
    fireEvent.press(open);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/siddur/[id]',
      params: { id: 'shacharit', date: '2026-10-28', from: 'shacharit' },
    });
  });

  it("shows Kiddush Levana's period with its dates and its two reminders", () => {
    jest.setSystemTime(at(JERUSALEM, '2026-10-19T12:00'));
    const opens = HebcalService.nightfall(zmanimFor(at(JERUSALEM, '2026-10-14T12:00'), JERUSALEM), JERUSALEM);
    renderMitzvah({ id: 'kiddush_levana' });
    expect(screen.getByText(`עונתי · 14/10 ${clockOf(opens, JERUSALEM.tz)} עד 26/10 03:44`)).toBeOnTheScreen();
    expect(screen.getByText('זמן קידוש לבנה')).toBeOnTheScreen();
    expect(screen.getByText('קידוש לבנה במוצאי שבת וחג')).toBeOnTheScreen();
    expect(screen.getByText('15 דק׳ אחרי צאת שבת או חג')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'פתח נוסח' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/siddur/[id]',
      params: { id: 'kiddush_levana', date: '2026-10-14', from: 'kiddush_levana' },
    });
  });

  it('prints the next reminder in the accent text colour', () => {
    renderMitzvah({ id: 'shacharit' });
    expect(screen.getByText(/^ההתראה הבאה תישלח ב-/)).toHaveStyle({ color: THEMES.gold.goldText });
  });

  it('lets the first tap on a sheet button through while the keyboard is open', () => {
    renderMitzvah({ id: 'shacharit' });
    expect(screen.UNSAFE_getByType(ScrollView).props.keyboardShouldPersistTaps).toBe('handled');
  });

  describe('the next reminder follows the switch', () => {
    const HEADER_NEXT = /^ההתראה הבאה תישלח ב-/;
    const ROW_NEXT = /^הבאה ב-/;
    const flip = (value: boolean) =>
      fireEvent(screen.getByRole('switch', { name: SETTINGS_SWITCH }), 'valueChange', value);

    it('a switched-off mitzvah names no next reminder in the header and none in its rows, and switching it on shows both', () => {
      renderMitzvah({ id: 'havdalah' });
      expect(screen.getByRole('switch', { name: SETTINGS_SWITCH })).not.toBeChecked();
      expect(screen.getByText('זמן הבדלה')).toBeOnTheScreen();
      expect(screen.queryByText(HEADER_NEXT)).toBeNull();
      expect(screen.queryByText(ROW_NEXT)).toBeNull();

      flip(true);

      expect(screen.getByText(HEADER_NEXT)).toBeOnTheScreen();
      expect(screen.getAllByText(ROW_NEXT)).toHaveLength(1);

      flip(false);

      expect(screen.queryByText(HEADER_NEXT)).toBeNull();
      expect(screen.queryByText(ROW_NEXT)).toBeNull();
    });

    it('an enabled mitzvah names the next reminder in the header and in every row', () => {
      renderMitzvah({ id: 'tefillin' });
      expect(screen.getByRole('switch', { name: SETTINGS_SWITCH })).toBeChecked();
      expect(screen.getByText(HEADER_NEXT)).toBeOnTheScreen();
      expect(screen.getAllByText(ROW_NEXT).length).toBeGreaterThan(0);
    });
  });

  it('resets the reminders from a secondary button', () => {
    renderMitzvah({ id: 'shacharit' });
    expect(screen.getByRole('button', { name: 'חזרה לברירת מחדל' })).toHaveStyle({
      backgroundColor: THEMES.gold.surface2,
    });
  });

  describe('at least one reminder', () => {
    const stored = (id: string) => useMitzvotStore.getState().activeMitzvot[id];
    const flip = (value: boolean) =>
      fireEvent(screen.getByRole('switch', { name: SETTINGS_SWITCH }), 'valueChange', value);

    it('switching on a mitzvah whose reminders were emptied opens the dialog, and Cancel leaves it off', () => {
      useMitzvotStore.getState().setReminders('havdalah', []);
      renderMitzvah({ id: 'havdalah' });

      flip(true);

      expect(screen.getByText(NEEDS_REMINDER_TITLE)).toBeOnTheScreen();
      expect(screen.getByText(NEEDS_REMINDER_BODY)).toBeOnTheScreen();
      expect(stored('havdalah').enabled).toBe(false);
      expect(screen.getByRole('switch', { name: SETTINGS_SWITCH })).not.toBeChecked();

      fireEvent.press(screen.getByRole('button', { name: 'ביטול' }));

      expect(screen.queryByText(NEEDS_REMINDER_TITLE)).toBeNull();
      expect(stored('havdalah').enabled).toBe(false);
      expect(screen.getByRole('switch', { name: SETTINGS_SWITCH })).not.toBeChecked();
    });

    it('Settings on the dialog keeps it off and scrolls to the reminders card', () => {
      const spy = jest.spyOn(ScrollView.prototype, 'scrollToEnd');
      useMitzvotStore.getState().setReminders('havdalah', []);
      renderMitzvah({ id: 'havdalah' });

      flip(true);
      fireEvent.press(screen.getByRole('button', { name: 'הגדרה' }));

      expect(screen.queryByText(NEEDS_REMINDER_TITLE)).toBeNull();
      expect(stored('havdalah').enabled).toBe(false);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith({ animated: true });
      expect(mockPush).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('a mitzvah with reminders switches on with no dialog', () => {
      renderMitzvah({ id: 'havdalah' });

      flip(true);

      expect(stored('havdalah').enabled).toBe(true);
      expect(screen.queryByText(NEEDS_REMINDER_TITLE)).toBeNull();
    });

    it('deleting the last reminder of an enabled mitzvah shows the error and keeps the reminder', () => {
      useMitzvotStore.getState().setEnabled('havdalah', true);
      renderMitzvah({ id: 'havdalah' });
      expect(screen.queryByText(LAST_REMINDER_ERROR)).toBeNull();

      fireEvent.press(screen.getByRole('button', { name: DELETE_REMINDER }));

      expect(screen.getByText(LAST_REMINDER_ERROR)).toBeOnTheScreen();
      expect(screen.getByText(LAST_REMINDER_ERROR)).toHaveStyle({ color: THEMES.gold.urgent });
      expect(screen.queryByText(DELETE_TITLE)).toBeNull();
      expect(stored('havdalah').customReminders).toBeUndefined();
      expect(screen.getByText('זמן הבדלה')).toBeOnTheScreen();

      flip(false);

      expect(screen.queryByText(LAST_REMINDER_ERROR)).toBeNull();
    });

    it('a reset clears the last-reminder error', () => {
      useMitzvotStore.getState().setEnabled('havdalah', true);
      renderMitzvah({ id: 'havdalah' });
      fireEvent.press(screen.getByRole('button', { name: DELETE_REMINDER }));
      expect(screen.getByText(LAST_REMINDER_ERROR)).toBeOnTheScreen();

      fireEvent.press(screen.getByRole('button', { name: 'חזרה לברירת מחדל' }));

      expect(screen.queryByText(LAST_REMINDER_ERROR)).toBeNull();
    });

    it('deleting the last reminder while the mitzvah is off asks, deletes, and the switch then asks for a reminder', () => {
      renderMitzvah({ id: 'havdalah' });

      fireEvent.press(screen.getByRole('button', { name: DELETE_REMINDER }));
      expect(screen.getByText(DELETE_TITLE)).toBeOnTheScreen();
      expect(screen.queryByText(LAST_REMINDER_ERROR)).toBeNull();
      fireEvent.press(screen.getByRole('button', { name: 'כן, מחק' }));

      expect(stored('havdalah').customReminders).toEqual([]);
      expect(screen.getByText('אין תזכורות מותאמות למצווה זו.')).toBeOnTheScreen();

      flip(true);

      expect(screen.getByText(NEEDS_REMINDER_TITLE)).toBeOnTheScreen();
      expect(stored('havdalah').enabled).toBe(false);
    });

    it('deleting one of several reminders of an enabled mitzvah still asks and deletes', () => {
      renderMitzvah({ id: 'tefillin' });
      expect(stored('tefillin').enabled).toBe(true);

      fireEvent.press(screen.getAllByRole('button', { name: DELETE_REMINDER })[0]);
      expect(screen.getByText(DELETE_TITLE)).toBeOnTheScreen();
      fireEvent.press(screen.getByRole('button', { name: 'כן, מחק' }));

      expect(stored('tefillin').customReminders).toHaveLength(2);
      expect(screen.queryByText(LAST_REMINDER_ERROR)).toBeNull();
    });
  });

  describe('the reminders list', () => {
    const fmt = (instant: Date) => DateTime.fromJSDate(instant, { zone: JERUSALEM.tz }).toFormat('dd/MM HH:mm');
    const zmanimOn = (iso: string) => zmanimFor(at(JERUSALEM, `${iso}T12:00`), JERUSALEM);
    const texts = (pattern: RegExp) => screen.getAllByText(pattern).map((node) => node.props.children);

    beforeEach(() => {
      useMitzvotStore.getState().setReminders('shacharit', [
        { anchor: 'end', offsetMin: -30, label: 'סוף' },
        { anchor: 'clock', offsetMin: 480, label: 'שמונה' },
        { anchor: 'start', offsetMin: -60, label: 'הקדמה' },
      ]);
    });

    it('lists the reminders in trigger order, each with its own next fire time on the location clock', () => {
      renderMitzvah({ id: 'shacharit' });

      expect(texts(/^(הקדמה|שמונה|סוף)$/)).toEqual(['הקדמה', 'שמונה', 'סוף']);
      expect(texts(/^הבאה ב-/)).toEqual([
        `הבאה ב-${fmt(new Date(zmanimOn('2026-10-29').netzHaChama.getTime() - 60 * 60_000))}`,
        'הבאה ב-28/10 08:00',
        `הבאה ב-${fmt(new Date(zmanimOn('2026-10-28').sofZmanTfilaGra.getTime() - 30 * 60_000))}`,
      ]);
      expect(screen.getByText('ההתראה הבאה תישלח ב-28/10 08:00')).toBeOnTheScreen();
    });

    it('edits and deletes the reminder pressed, whatever its place in the list', () => {
      renderMitzvah({ id: 'shacharit' });

      fireEvent.press(screen.getByText('סוף'));
      expect(screen.getByDisplayValue('סוף')).toBeOnTheScreen();
      fireEvent.press(screen.getByRole('button', { name: 'סגור' }));

      fireEvent.press(screen.getAllByRole('button', { name: DELETE_REMINDER })[0]);
      expect(screen.getByText(/"הקדמה"/)).toBeOnTheScreen();
      fireEvent.press(screen.getByRole('button', { name: 'כן, מחק' }));

      expect(useMitzvotStore.getState().activeMitzvot.shacharit.customReminders?.map((r) => r.label)).toEqual([
        'סוף',
        'שמונה',
      ]);
    });

    it('lists a follow-up of a custom mitzvah after the window, with its label and next fire time', () => {
      useCustomMitzvotStore.getState().reset();
      useCustomMitzvotStore.getState().add({
        id: 'custom_1800000000000_abc',
        name: 'לימוד',
        startHHMM: '10:00',
        endHHMM: '11:00',
        reminders: [
          { anchor: 'followUp', offsetMin: 60, label: 'אחרי' },
          { anchor: 'start', offsetMin: 0, label: 'התחלה' },
        ],
        skipOn: [],
        createdAt: 1800000000000,
      });
      useMitzvotStore.getState().setEnabled('custom_1800000000000_abc', true);
      renderMitzvah({ id: 'custom_1800000000000_abc' });

      expect(texts(/^(התחלה|אחרי)$/)).toEqual(['התחלה', 'אחרי']);
      expect(screen.getByText('60 דק׳ אחרי סוף הזמן, אם לא סימנת')).toBeOnTheScreen();
      expect(texts(/^הבאה ב-/)).toEqual(['הבאה ב-28/10 10:00', 'הבאה ב-28/10 12:00']);
      cleanup();
      useCustomMitzvotStore.getState().reset();
    });

    describe('a follow-up saved with no label', () => {
      const id = 'custom_1800000000000_abc';
      const storeFollowUp = (name: string) => {
        useCustomMitzvotStore.getState().reset();
        useCustomMitzvotStore.getState().add({
          id,
          name,
          startHHMM: '10:00',
          endHHMM: '11:00',
          reminders: [
            { anchor: 'start', offsetMin: 0, label: 'התחלה' },
            { anchor: 'followUp', offsetMin: 60, label: '' },
          ],
          skipOn: [],
          createdAt: 1800000000000,
        });
      };
      afterEach(() => {
        cleanup();
        useCustomMitzvotStore.getState().reset();
      });

      it('shows the resolved default text in its row and in the delete confirmation', () => {
        storeFollowUp('לימוד');
        renderMitzvah({ id });

        expect(screen.getByText('עוד לא סימנת: לימוד')).toBeOnTheScreen();
        fireEvent.press(screen.getAllByRole('button', { name: DELETE_REMINDER })[1]);
        expect(screen.getByText(/"עוד לא סימנת: לימוד"/)).toBeOnTheScreen();
      });

      it('follows a rename of the mitzvah', () => {
        storeFollowUp('לימוד');
        useCustomMitzvotStore.getState().update(id, { name: 'שיעור' });
        renderMitzvah({ id });

        expect(screen.getByText('עוד לא סימנת: שיעור')).toBeOnTheScreen();
        expect(screen.queryByText('עוד לא סימנת: לימוד')).toBeNull();
      });
    });

    it('shows a typed follow-up label as it is', () => {
      const id = 'custom_1800000000000_abc';
      useCustomMitzvotStore.getState().reset();
      useCustomMitzvotStore.getState().add({
        id,
        name: 'לימוד',
        startHHMM: '10:00',
        endHHMM: '11:00',
        reminders: [{ anchor: 'followUp', offsetMin: 60, label: 'חזור ללמוד' }],
        skipOn: [],
        createdAt: 1800000000000,
      });
      renderMitzvah({ id });

      expect(screen.getByText('חזור ללמוד')).toBeOnTheScreen();
      expect(screen.queryByText(/עוד לא סימנת/)).toBeNull();
      cleanup();
      useCustomMitzvotStore.getState().reset();
    });

    describe('a row names its timing in the words of the reminder editor', () => {
      const id = 'custom_1800000000000_abc';
      const storeReminder = (reminder: Omit<Reminder, 'label'>) => {
        useCustomMitzvotStore.getState().reset();
        useCustomMitzvotStore.getState().add({
          id,
          name: 'לימוד',
          startHHMM: '10:00',
          endHHMM: '11:00',
          reminders: [{ ...reminder, label: 'תזכורת' }],
          skipOn: [],
          createdAt: 1800000000000,
        });
      };

      afterEach(() => {
        cleanup();
        useCustomMitzvotStore.getState().reset();
      });

      it.each([
        ['at the start', { anchor: 'start', offsetMin: 0 }, 'בתחילת הזמן'],
        ['10 minutes before the start', { anchor: 'start', offsetMin: -10 }, '10 דק׳ לפני תחילת הזמן'],
        ['15 minutes before the end', { anchor: 'end', offsetMin: -15 }, '15 דק׳ לפני סוף הזמן'],
        ['a set time', { anchor: 'clock', offsetMin: 22 * 60 + 30 }, 'בשעה 22:30'],
        ['a follow-up', { anchor: 'followUp', offsetMin: 30 }, '30 דק׳ אחרי סוף הזמן, אם לא סימנת'],
      ] as const)('%s', (_name, reminder, caption) => {
        storeReminder(reminder);
        renderMitzvah({ id });

        expect(screen.getByText('תזכורת')).toBeOnTheScreen();
        expect(screen.getByText(caption)).toBeOnTheScreen();
      });

      it('15 minutes after the exit of Shabbat and Yom Tov, for Kiddush Levana', () => {
        renderMitzvah({ id: 'kiddush_levana' });

        expect(screen.getByText('15 דק׳ אחרי צאת שבת או חג')).toBeOnTheScreen();
      });

      it('in English when the language is English', () => {
        useUserStore.setState({ language: 'en' });
        storeReminder({ anchor: 'clock', offsetMin: 22 * 60 + 30 });
        renderMitzvah({ id });

        expect(screen.getByText('At 22:30')).toBeOnTheScreen();
      });
    });
  });

  describe('the reminder editor', () => {
    const CUSTOM_ID = 'custom_1800000000000_abc';
    const editor = () => within(screen.UNSAFE_getAllByType(Modal).find((modal) => modal.props.visible)!);
    const openEditor = () => fireEvent.press(screen.getByText(t('detail.addReminder')));
    const timingRadio = (timing: string) => editor().getByRole('radio', { name: t(`reminder.timing.${timing}`) });
    const minutesField = (timing: string) => editor().getByLabelText(t(`reminder.minutes.${timing}`));
    const saveEditor = () => fireEvent.press(editor().getByRole('button', { name: t('common.save') }));
    const saved = (id: string) => useMitzvotStore.getState().activeMitzvot[id]?.customReminders;
    const storeCustom = () => {
      useCustomMitzvotStore.getState().reset();
      useCustomMitzvotStore.getState().add({
        id: CUSTOM_ID,
        name: 'לימוד',
        startHHMM: '10:00',
        endHHMM: '11:00',
        reminders: [{ anchor: 'start', offsetMin: 0, label: 'התחלה' }],
        skipOn: [],
        createdAt: 1800000000000,
      });
      useMitzvotStore.getState().setEnabled(CUSTOM_ID, true);
    };

    afterEach(() => {
      cleanup();
      jest.restoreAllMocks();
      useCustomMitzvotStore.getState().reset();
    });

    it('offers a registry mitzvah the four timings, inline in the sheet, from the start picked', () => {
      renderMitzvah({ id: 'shacharit' });
      openEditor();

      expect(editor().getAllByRole('radio')).toHaveLength(4);
      (['beforeStart', 'fromStart', 'beforeEnd', 'clock'] as const).forEach((timing) => {
        expect(timingRadio(timing)).toBeOnTheScreen();
      });
      expect(timingRadio('fromStart')).toBeChecked();
      expect(screen.UNSAFE_getAllByType(Modal).filter((modal) => modal.props.visible)).toHaveLength(1);
    });

    it('adds the follow-up for a custom mitzvah', () => {
      storeCustom();
      renderMitzvah({ id: CUSTOM_ID });
      openEditor();

      expect(editor().getAllByRole('radio')).toHaveLength(5);
      expect(timingRadio('followUp')).toBeOnTheScreen();
    });

    it('adds the exit of Shabbat and Yom Tov for Kiddush Levana', () => {
      renderMitzvah({ id: 'kiddush_levana' });
      openEditor();

      expect(editor().getAllByRole('radio')).toHaveLength(5);
      expect(timingRadio('blockExit')).toBeOnTheScreen();
      expect(editor().queryByRole('radio', { name: t('reminder.timing.followUp') })).toBeNull();
    });

    it('saves 10 minutes before the start as a start offset of -10', () => {
      renderMitzvah({ id: 'shacharit' });
      openEditor();
      fireEvent.press(timingRadio('beforeStart'));
      fireEvent.changeText(minutesField('beforeStart'), '10');
      saveEditor();

      expect(saved('shacharit')?.at(-1)).toEqual({
        anchor: 'start',
        offsetMin: -10,
        label: 'תפילת שחרית',
        skipIfDone: false,
      });
    });

    it('refuses 181 minutes before the start and saves nothing', () => {
      renderMitzvah({ id: 'shacharit' });
      openEditor();
      fireEvent.press(timingRadio('beforeStart'));
      fireEvent.changeText(minutesField('beforeStart'), '181');
      saveEditor();

      expect(editor().getByText(t('reminder.errors.headsUpRange', { max: 180 }))).toBeOnTheScreen();
      expect(saved('shacharit')).toBeUndefined();
    });

    it.each(['android', 'ios'] as const)('opens the number pad for the minutes on %s', (os) => {
      jest.replaceProperty(Platform, 'OS', os);
      renderMitzvah({ id: 'shacharit' });
      openEditor();

      expect(minutesField('fromStart').props.keyboardType).toBe('number-pad');
    });

    it('never lets a character that is not a digit into the minutes field, and refuses an empty one', () => {
      renderMitzvah({ id: 'shacharit' });
      openEditor();
      fireEvent.changeText(minutesField('fromStart'), '-6a0.');
      expect(minutesField('fromStart')).toHaveDisplayValue('60');

      fireEvent.changeText(minutesField('fromStart'), '');
      saveEditor();

      expect(editor().getByText(t('reminder.errors.offsetInvalid'))).toBeOnTheScreen();
      expect(saved('shacharit')).toBeUndefined();
    });

    it('opens an existing heads-up as before the start, counted as a positive number', () => {
      useMitzvotStore
        .getState()
        .setReminders('shacharit', [{ anchor: 'start', offsetMin: -60, label: 'הקדמה', skipIfDone: false }]);
      renderMitzvah({ id: 'shacharit' });
      fireEvent.press(screen.getByText('הקדמה'));

      expect(timingRadio('beforeStart')).toBeChecked();
      expect(minutesField('beforeStart')).toHaveDisplayValue('60');
    });
  });

  describe('the window shown', () => {
    it("prints the subtitle and the clocks beside the ribbon on the location's clock", () => {
      const zmanim = zmanimFor(at(JERUSALEM, '2026-10-28T12:00'), JERUSALEM);
      const clock = (instant: Date) => DateTime.fromJSDate(instant, { zone: JERUSALEM.tz }).toFormat('HH:mm');
      const start = clock(zmanim.netzHaChama);
      const end = clock(zmanim.sofZmanTfilaGra);
      renderMitzvah({ id: 'shacharit' });

      expect(screen.getByText(`יומי · ${start} עד ${end}`)).toBeOnTheScreen();
      expect(screen.getByText(start)).toBeOnTheScreen();
      expect(screen.getByText(end)).toBeOnTheScreen();
    });

    it('runs maariv to the next alot and prints its description in Hebrew', () => {
      const clock = (instant: Date) => DateTime.fromJSDate(instant, { zone: JERUSALEM.tz }).toFormat('HH:mm');
      const start = clock(zmanimFor(at(JERUSALEM, '2026-10-28T12:00'), JERUSALEM).tzeitHakochavim);
      const end = clock(zmanimFor(at(JERUSALEM, '2026-10-29T12:00'), JERUSALEM).alotHaShachar);
      renderMitzvah({ id: 'maariv' });
      expect(screen.getByText(`יומי · ${start} עד ${end} למחרת`)).toBeOnTheScreen();
      expect(screen.getByText('לכתחילה עד חצות הלילה')).toBeOnTheScreen();
    });

    it('prints the maariv description in English', () => {
      useUserStore.setState({ language: 'en' });
      renderMitzvah({ id: 'maariv' });
      expect(screen.getByText('Ideally before chatzot (halachic midnight)')).toBeOnTheScreen();
    });

    it('runs the bedtime Shema to the next alot, prints its description and 23:00 reminder, and opens its text', () => {
      const clock = (instant: Date) => DateTime.fromJSDate(instant, { zone: JERUSALEM.tz }).toFormat('HH:mm');
      const start = clock(zmanimFor(at(JERUSALEM, '2026-10-28T12:00'), JERUSALEM).tzeitHakochavim);
      const end = clock(zmanimFor(at(JERUSALEM, '2026-10-29T12:00'), JERUSALEM).alotHaShachar);
      renderMitzvah({ id: 'krias_shma_al_hamita' });
      expect(screen.getByText(`יומי · ${start} עד ${end} למחרת`)).toBeOnTheScreen();
      expect(screen.getByText('לכתחילה לפני חצות הלילה')).toBeOnTheScreen();
      expect(screen.getByText('זמן קריאת שמע על המיטה')).toBeOnTheScreen();
      expect(screen.getByText('ההתראה הבאה תישלח ב-28/10 23:00')).toBeOnTheScreen();
      expect(screen.getByText('הבאה ב-28/10 23:00')).toBeOnTheScreen();
      fireEvent.press(screen.getByRole('button', { name: 'פתח נוסח' }));
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/siddur/[id]',
        params: { id: 'krias_shma_al_hamita', date: '2026-10-28', from: 'krias_shma_al_hamita' },
      });
    });

    it('runs Selichot in its season from chatzot halayla to the end of the time for Shacharit, and opens its text for that night', () => {
      installSelichotFixture();
      jest.setSystemTime(at(JERUSALEM, '2025-09-15T14:00'));
      const clock = (instant: Date) => DateTime.fromJSDate(instant, { zone: JERUSALEM.tz }).toFormat('HH:mm');
      const chatzot = zmanimFor(at(JERUSALEM, '2025-09-15T12:00'), JERUSALEM).chatzotLayla;
      const end = clock(zmanimFor(at(JERUSALEM, '2025-09-16T12:00'), JERUSALEM).sofZmanTfilaGra);
      renderMitzvah({ id: 'selichot' });
      expect(screen.getByText(`עונתי · ${clock(chatzot)} עד ${end} למחרת`)).toBeOnTheScreen();
      expect(screen.getByText('זמן אמירת סליחות')).toBeOnTheScreen();
      const next = DateTime.fromJSDate(chatzot, { zone: JERUSALEM.tz }).toFormat('dd/MM HH:mm');
      expect(screen.getByText(`ההתראה הבאה תישלח ב-${next}`)).toBeOnTheScreen();
      fireEvent.press(screen.getByRole('button', { name: 'פתח נוסח' }));
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/siddur/[id]',
        params: { id: 'selichot', date: '2025-09-15', from: 'selichot' },
      });
    });

    it('has no window and no text outside the Selichot season', () => {
      renderMitzvah({ id: 'selichot' });
      expect(screen.getByText('עונתי · -')).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'פתח נוסח' })).toBeNull();
    });

    it("offers the download of the user's nusach and shows no window while it is missing", () => {
      jest.setSystemTime(at(JERUSALEM, '2025-09-15T14:00'));
      renderMitzvah({ id: 'selichot' });
      expect(screen.getByText('עונתי · -')).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'פתח נוסח' })).toBeNull();
      expect(screen.getByText('תוסף הסליחות')).toBeOnTheScreen();
      expect(screen.getByRole('switch').props.disabled).toBeFalsy();
      expect(screen.queryByText(/ההתראה הבאה תישלח/)).toBeNull();
    });

    it('shows the window and the next reminder the moment the nusach file installs on the screen', () => {
      jest.setSystemTime(at(JERUSALEM, '2025-09-15T14:00'));
      const chatzot = zmanimFor(at(JERUSALEM, '2025-09-15T12:00'), JERUSALEM).chatzotLayla;
      renderMitzvah({ id: 'selichot' });
      expect(screen.getByText('עונתי · -')).toBeOnTheScreen();
      act(() => {
        installSelichotFixture(['ashkenaz']);
      });
      expect(screen.queryByText('עונתי · -')).toBeNull();
      const next = DateTime.fromJSDate(chatzot, { zone: JERUSALEM.tz }).toFormat('dd/MM HH:mm');
      expect(screen.getByText(`ההתראה הבאה תישלח ב-${next}`)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'פתח נוסח' })).toBeOnTheScreen();
    });

    it('runs the Chanukah candles from tzeit to the next alot, shows its reminder label without a placeholder, and opens its text for that night', () => {
      jest.setSystemTime(at(JERUSALEM, '2025-12-15T14:00'));
      const clock = (instant: Date) => DateTime.fromJSDate(instant, { zone: JERUSALEM.tz }).toFormat('HH:mm');
      const tzeit = zmanimFor(at(JERUSALEM, '2025-12-15T12:00'), JERUSALEM).tzeitHakochavim;
      const end = clock(zmanimFor(at(JERUSALEM, '2025-12-16T12:00'), JERUSALEM).alotHaShachar);
      renderMitzvah({ id: 'chanukah_candles' });
      expect(screen.getByText(`עונתי · ${clock(tzeit)} עד ${end} למחרת`)).toBeOnTheScreen();
      expect(screen.getByText('זמן הדלקת נרות חנוכה')).toBeOnTheScreen();
      expect(screen.queryByText(/%\{/)).toBeNull();
      const next = DateTime.fromJSDate(tzeit, { zone: JERUSALEM.tz }).toFormat('dd/MM HH:mm');
      expect(screen.getByText(`ההתראה הבאה תישלח ב-${next}`)).toBeOnTheScreen();
      fireEvent.press(screen.getByRole('button', { name: 'פתח נוסח' }));
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/siddur/[id]',
        params: { id: 'chanukah_candles', date: '2025-12-15', from: 'chanukah_candles' },
      });
    });

    it('has no window outside Chanukah but still opens its text, with no date', () => {
      renderMitzvah({ id: 'chanukah_candles' });
      expect(screen.getByText('עונתי · -')).toBeOnTheScreen();
      fireEvent.press(screen.getByRole('button', { name: 'פתח נוסח' }));
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/siddur/[id]',
        params: { id: 'chanukah_candles', from: 'chanukah_candles' },
      });
    });

    const CUSTOM_ID = 'custom_1800000000000_abc';
    const storeRange = (start: string, end: string) =>
      useCustomMitzvotStore.getState().add({
        id: CUSTOM_ID,
        name: 'לימוד',
        startHHMM: '10:00',
        endHHMM: '11:00',
        reminders: [{ anchor: 'start', offsetMin: 0, label: 'התחלה' }],
        skipOn: [],
        createdAt: 1800000000000,
        schedules: [{ from: '2026-10-28', schedule: { mode: 'range', start, end } }],
      });

    afterEach(() => {
      cleanup();
      useCustomMitzvotStore.getState().reset();
    });

    it('names the start day of a range beyond the look-ahead', () => {
      storeRange('2026-11-20', '2026-11-25');
      renderMitzvah({ id: CUSTOM_ID });
      expect(screen.getByText('יומי · מתחילה ב־20 נובמבר 2026')).toBeOnTheScreen();
    });

    it('names the start day of a range beyond the look-ahead in English', () => {
      storeRange('2026-11-20', '2026-11-25');
      useUserStore.setState({ language: 'en' });
      renderMitzvah({ id: CUSTOM_ID });
      expect(screen.getByText('Daily · Starts on Nov 20, 2026')).toBeOnTheScreen();
    });

    it('keeps the time range for a range inside the look-ahead', () => {
      storeRange('2026-11-02', '2026-11-05');
      renderMitzvah({ id: CUSTOM_ID });
      expect(screen.getByText('יומי · 10:00 עד 11:00')).toBeOnTheScreen();
      expect(screen.queryByText(/מתחילה/)).toBeNull();
    });

    it('shows no start day for an ended range', () => {
      storeRange('2026-10-01', '2026-10-20');
      renderMitzvah({ id: CUSTOM_ID });
      expect(screen.getByText('יומי · -')).toBeOnTheScreen();
    });
  });

  describe('Chok LeYisrael', () => {
    it('offers the download and holds back the switch, the reminders and the text while not installed', () => {
      renderMitzvah({ id: 'chok_leyisrael' });
      expect(screen.getByRole('button', { name: 'הורדה' })).toBeOnTheScreen();
      expect(screen.getByRole('switch').props.disabled).toBe(true);
      expect(screen.getByText('אפשר להפעיל את המצווה אחרי ההורדה.')).toBeOnTheScreen();
      expect(screen.queryByText('תזכורות')).toBeNull();
      expect(screen.queryByRole('button', { name: 'פתח נוסח' })).toBeNull();
    });

    it('shows the add-on, the 09:00 reminder and an enabled switch once installed', () => {
      jest.setSystemTime(at(JERUSALEM, '2026-11-16T10:00'));
      installChokFixture();
      renderMitzvah({ id: 'chok_leyisrael' });
      expect(screen.getByText(/^התוסף מותקן/)).toBeOnTheScreen();
      expect(screen.getByText('תזכורות')).toBeOnTheScreen();
      expect(screen.getByText('בשעה 09:00')).toBeOnTheScreen();
      const monAlot = zmanimFor(at(JERUSALEM, '2026-11-16T12:00'), JERUSALEM).alotHaShachar;
      const tueAlot = zmanimFor(at(JERUSALEM, '2026-11-17T12:00'), JERUSALEM).alotHaShachar;
      expect(
        screen.getByText(`יומי · ${clockOf(monAlot, JERUSALEM.tz)} עד ${clockOf(tueAlot, JERUSALEM.tz)} למחרת`),
      ).toBeOnTheScreen();
      expect(screen.getByRole('switch').props.disabled).toBeFalsy();
      expect(screen.queryByText('אפשר להפעיל את המצווה אחרי ההורדה.')).toBeNull();
    });

    it.each(['2026-11-18T12:00', '2026-11-18T20:00', '2026-11-19T02:00', '2026-11-19T21:00'])(
      'opens the reader with no date, on its own learning day, at %s',
      (wallClock) => {
        jest.setSystemTime(at(JERUSALEM, wallClock));
        installChokFixture();
        renderMitzvah({ id: 'chok_leyisrael' });
        fireEvent.press(screen.getByRole('button', { name: 'פתח נוסח' }));
        expect(mockPush).toHaveBeenCalledTimes(1);
        expect(mockPush.mock.calls[0][0]).toStrictEqual({
          pathname: '/siddur/[id]',
          params: { id: 'chok_leyisrael', from: 'chok_leyisrael' },
        });
      },
    );
  });
});
