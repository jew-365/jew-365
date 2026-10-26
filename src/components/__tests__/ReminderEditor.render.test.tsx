jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
  AndroidImportance: { HIGH: 'high' },
  AndroidNotificationVisibility: { PUBLIC: 'public' },
}));
jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
jest.mock('expo-background-task', () => ({
  registerTaskAsync: jest.fn(),
  unregisterTaskAsync: jest.fn(),
  getStatusAsync: jest.fn(),
  BackgroundTaskResult: { Success: 1, Failed: 2 },
  BackgroundTaskStatus: { Restricted: 1, Available: 2 },
}));
import React from 'react';
import { Dimensions, Modal, Platform, ScrollView, StyleSheet } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { ReminderEditor } from '../ReminderEditor';
import { WHEEL_ITEM_HEIGHT } from '../WheelPicker';
import { CITIES } from '@/data/cities';
import { customToMitzvah } from '@/data/customMitzvotAdapter';
import { findMitzvah } from '@/data/mitzvot';
import { t } from '@/i18n';
import { useUserStore } from '@/stores/useUserStore';
import { installChokFixture } from '@/testing/chok';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';
import type { Reminder, UserSettings } from '@/types/mitzvah';
import { nextReminderAt } from '@/services/notifications/planners/mitzvot';
import { currentOrNextWindow } from '@/utils/buildDayTimeline';
import { THEMES } from '@/theme/colors';
import { clockOf, fireTimeText } from '@/utils/clock';
import type { ReminderTiming } from '@/utils/reminderTiming';

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

type MinutesTiming = Exclude<ReminderTiming, 'clock'>;

const JERUSALEM = CITIES[0];
const SETTINGS: UserSettings = { nusach: 'ashkenaz', halachicOpinions: { ksSofZman: 'GRA' }, inIsrael: true };
const CHOK = findMitzvah('chok_leyisrael')!;
const LEVANA = findMitzvah('kiddush_levana')!;

beforeAll(() => {
  installChokFixture();
});
const SHACHARIT = findMitzvah('shacharit')!;
const OMER = findMitzvah('sefirat_haomer')!;
const BIRCHOT = findMitzvah('birchot_hashachar')!;
const CANDLE_LIGHTING = findMitzvah('candle_lighting')!;
const CUSTOM = customToMitzvah({
  id: 'custom_1',
  name: 'x',
  startHHMM: '09:00',
  endHHMM: '10:00',
  reminders: [],
  skipOn: [],
  createdAt: 1,
});
const OUTSIDE = /^החלון היום פתוח מ\u05BE\d\d:\d\d עד \d\d:\d\d; בשעה הזו התזכורת לא תישלח$/;
const CUSTOM_OUTSIDE = 'החלון היום פתוח מ\u05BE09:00 עד 10:00; בשעה הזו התזכורת לא תישלח';
const NEXT_OUTSIDE = /^החלון הבא פתוח ב-\d\d\/\d\d מ\u05BE\d\d:\d\d עד \d\d:\d\d; בשעה הזו התזכורת לא תישלח$/;
const NAME = 'חק לישראל';
const EVENING: Reminder = { anchor: 'clock', offsetMin: 20 * 60 + 30, label: 'ערב', skipIfDone: true };
const WEDNESDAY = at(JERUSALEM, '2026-12-16T10:00');
const WEDNESDAY_MORNING = at(JERUSALEM, '2026-12-16T07:00');
const WEDNESDAY_IN_CUSTOM = at(JERUSALEM, '2026-12-16T09:15');
const FRIDAY = at(JERUSALEM, '2026-12-18T10:00');

type EditorProps = Partial<React.ComponentProps<typeof ReminderEditor>>;

function renderEditor(props: EditorProps = {}) {
  const onSave = jest.fn();
  const onClose = jest.fn();
  renderWithTheme(
    <ReminderEditor
      visible
      mitzvah={CHOK}
      location={JERUSALEM}
      settings={SETTINGS}
      mitzvahName={NAME}
      onClose={onClose}
      onSave={onSave}
      {...props}
    />,
  );
  return { onSave, onClose };
}

const timingOption = (timing: ReminderTiming) => screen.getByRole('radio', { name: t(`reminder.timing.${timing}`) });
const timeInput = () => screen.getByLabelText(t('custom.typeTime'));
const hourWheel = () => screen.getByLabelText(t('custom.pickHour'));
const minuteWheel = () => screen.getByLabelText(t('custom.pickMinute'));
const minutesInput = (timing: MinutesTiming) => screen.getByLabelText(t(`reminder.minutes.${timing}`));
const chooseTiming = (timing: ReminderTiming) => fireEvent.press(timingOption(timing));
const save = () => fireEvent.press(screen.getByRole('button', { name: t('common.save') }));
const typeTime = (typed: string) => fireEvent.changeText(timeInput(), typed);
const step = (direction: 'less' | 'more') => fireEvent.press(screen.getByLabelText(t(`reminder.minutes.${direction}`)));

function scrollWheelTo(wheel: ReturnType<typeof hourWheel>, index: number) {
  fireEvent(wheel, 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: 0, y: index * WHEEL_ITEM_HEIGHT } } });
}

function setMinutes(timing: MinutesTiming, minutes: number | string) {
  chooseTiming(timing);
  fireEvent.changeText(minutesInput(timing), String(minutes));
}

function setClock(typed: string) {
  chooseTiming('clock');
  typeTime(typed);
}

const radioStates = () => screen.getAllByRole('radio').map((radio) => radio.props.accessibilityState.selected);

describe('ReminderEditor', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    jest.useFakeTimers({ now: WEDNESDAY, doNotFake: [...ONLY_DATE] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the timing choice', () => {
    it('offers before the start, from the start, before the end and a set time for a registry mitzvah, from the start first picked', () => {
      renderEditor();
      expect(radioStates()).toEqual([false, true, false, false]);
      (['beforeStart', 'fromStart', 'beforeEnd', 'clock'] as const).forEach((timing) => {
        expect(timingOption(timing)).toBeOnTheScreen();
        expect(screen.getByText(t(`reminder.timing.${timing}.caption`, { max: 180 }))).toBeOnTheScreen();
      });
      expect(screen.getByRole('radio', { name: 'בשעה קבועה' })).toBeOnTheScreen();
    });

    it('draws the timing choice under its own label, as a radiogroup', () => {
      renderEditor();
      expect(screen.getByText(t('reminder.timing'))).toBeOnTheScreen();
      expect(screen.getByLabelText(t('reminder.timing')).props.accessibilityRole).toBe('radiogroup');
    });

    it('says how far ahead the heads-up may go in the caption of its option', () => {
      renderEditor();
      expect(screen.getByText('עד 180 דקות לפני שהזמן מתחיל')).toBeOnTheScreen();
    });

    it('offers the four kinds for a registry mitzvah and no follow-up', () => {
      renderEditor({ mitzvah: SHACHARIT });
      expect(screen.getAllByRole('radio')).toHaveLength(4);
      expect(screen.queryByRole('radio', { name: t('reminder.timing.followUp') })).toBeNull();
      expect(screen.queryByRole('radio', { name: t('reminder.timing.blockExit') })).toBeNull();
    });

    it('adds the follow-up for a custom mitzvah', () => {
      renderEditor({ mitzvah: CUSTOM });
      expect(screen.getAllByRole('radio')).toHaveLength(5);
      expect(timingOption('clock')).toBeOnTheScreen();
      expect(timingOption('followUp')).toBeOnTheScreen();
      expect(screen.queryByRole('radio', { name: t('reminder.timing.blockExit') })).toBeNull();
    });

    it('adds the exit of Shabbat and Yom Tov, and no follow-up, for a multi-day mitzvah', () => {
      renderEditor({ mitzvah: LEVANA });
      expect(screen.getAllByRole('radio')).toHaveLength(5);
      expect(timingOption('blockExit')).toBeOnTheScreen();
      expect(screen.queryByRole('radio', { name: t('reminder.timing.followUp') })).toBeNull();
    });

    it('names the options in both languages', () => {
      expect(t('reminder.timing.clock')).toBe('בשעה קבועה');
      expect(t('reminder.timing.beforeStart')).toBe('לפני תחילת הזמן');
      useUserStore.setState({ language: 'en' });
      expect(t('reminder.timing.clock')).toBe('At a set time');
      expect(t('reminder.timing.beforeStart')).toBe('Before the time starts');
      expect(t('reminder.time')).toBe('Time');
    });

    it('names the follow-up option and its default text in both languages', () => {
      expect(t('reminder.timing.followUp')).toBe('אחרי סוף הזמן, אם לא סימנת');
      expect(t('reminder.followUp.label', { name: 'לימוד' })).toBe('עוד לא סימנת: לימוד');
      useUserStore.setState({ language: 'en' });
      expect(t('reminder.timing.followUp')).toBe('After the end, if not marked');
      expect(t('reminder.followUp.label', { name: 'Study' })).toBe('Not marked yet: Study');
    });

    it('draws the English options with their captions', () => {
      useUserStore.setState({ language: 'en' });
      renderEditor({ mitzvah: CUSTOM });
      expect(screen.getByText('When to send')).toBeOnTheScreen();
      expect(screen.getByText('Up to 180 minutes before the time starts')).toBeOnTheScreen();
      expect(screen.getByRole('radio', { name: 'At the start or after it' })).toBeOnTheScreen();
    });
  });

  describe('a follow-up after the end', () => {
    it('opens on 60 minutes with its labelled field, no skip-if-done switch and the default text as placeholder, and saves an empty label', () => {
      const { onSave, onClose } = renderEditor({ mitzvah: CUSTOM, mitzvahName: 'לימוד' });
      chooseTiming('followUp');
      expect(timingOption('followUp')).toBeSelected();
      expect(minutesInput('followUp')).toHaveDisplayValue('60');
      expect(screen.getAllByText(t('reminder.minutes.followUp'))).toHaveLength(1);
      expect(screen.queryByText(t('reminder.skipIfDone'))).toBeNull();
      expect(screen.getByLabelText(t('reminder.label')).props.placeholder).toBe('עוד לא סימנת: לימוד');
      save();
      expect(onSave).toHaveBeenCalledWith({
        anchor: 'followUp',
        offsetMin: 60,
        label: '',
        skipIfDone: true,
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('keeps a label the user typed', () => {
      const { onSave } = renderEditor({ mitzvah: CUSTOM, mitzvahName: 'לימוד' });
      chooseTiming('followUp');
      fireEvent.changeText(screen.getByLabelText(t('reminder.label')), 'עדיין לא');
      save();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'followUp', label: 'עדיין לא' }));
    });

    it.each(['0', '721'])('refuses %s minutes, and takes 720', (typed) => {
      const { onSave } = renderEditor({ mitzvah: CUSTOM, mitzvahName: 'לימוד' });
      chooseTiming('followUp');
      fireEvent.changeText(minutesInput('followUp'), typed);
      save();
      expect(screen.getByText(t('reminder.errors.followUpRange', { max: 720 }))).toBeOnTheScreen();
      expect(onSave).not.toHaveBeenCalled();
      fireEvent.changeText(minutesInput('followUp'), '720');
      save();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'followUp', offsetMin: 720 }));
    });

    it('takes a single minute', () => {
      const { onSave } = renderEditor({ mitzvah: CUSTOM, mitzvahName: 'לימוד' });
      setMinutes('followUp', 1);
      save();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'followUp', offsetMin: 1 }));
    });

    it('opens on an existing follow-up, goes back to 0 when it leaves and to 60 when it returns', () => {
      renderEditor({
        mitzvah: CUSTOM,
        initialValue: { anchor: 'followUp', offsetMin: 90, label: 'x', skipIfDone: true },
      });
      expect(timingOption('followUp')).toBeSelected();
      expect(minutesInput('followUp')).toHaveDisplayValue('90');
      chooseTiming('beforeEnd');
      expect(minutesInput('beforeEnd')).toHaveDisplayValue('0');
      expect(screen.getByText(t('reminder.skipIfDone'))).toBeOnTheScreen();
      chooseTiming('followUp');
      expect(minutesInput('followUp')).toHaveDisplayValue('60');
    });
  });

  describe('a multi-day mitzvah', () => {
    const renderLevana = () => renderEditor({ mitzvah: LEVANA, mitzvahName: 'קידוש לבנה' });

    it('opens that option on 15 minutes under its own label', () => {
      renderLevana();
      chooseTiming('blockExit');
      expect(timingOption('blockExit')).toBeSelected();
      expect(minutesInput('blockExit')).toHaveDisplayValue('15');
      expect(screen.getAllByText(t('reminder.minutes.blockExit'))).toHaveLength(1);
    });

    it('refuses 721 minutes, takes 720 and takes zero', () => {
      const { onSave } = renderLevana();
      setMinutes('blockExit', 721);
      save();
      expect(screen.getByText(t('reminder.errors.blockExitRange', { max: 720 }))).toBeOnTheScreen();
      expect(onSave).not.toHaveBeenCalled();
      fireEvent.changeText(minutesInput('blockExit'), '720');
      save();
      expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ anchor: 'blockExit', offsetMin: 720 }));
      fireEvent.changeText(minutesInput('blockExit'), '0');
      save();
      expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ anchor: 'blockExit', offsetMin: 0 }));
    });

    it('saves a reminder after Shabbat and Yom Tov with its default 15 minutes', () => {
      const { onSave, onClose } = renderLevana();
      chooseTiming('blockExit');
      save();
      expect(onSave).toHaveBeenCalledWith({
        anchor: 'blockExit',
        offsetMin: 15,
        label: 'קידוש לבנה',
        skipIfDone: false,
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('saves an untouched start reminder, which the next period carries', () => {
      const start: Reminder = { anchor: 'start', offsetMin: 0, label: 'קידוש לבנה', skipIfDone: false };
      const next = nextReminderAt(LEVANA, [start], {
        now: new Date(),
        location: JERUSALEM,
        settings: SETTINGS,
        completions: {},
        skipped: {},
      });
      expect(next!.toISOString().slice(0, 10)).toBe('2027-01-11');
      const { onSave } = renderLevana();
      save();
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'start', offsetMin: 0 }));
    });

    it('goes back to 0 when the option leaves', () => {
      renderEditor({
        mitzvah: LEVANA,
        initialValue: { anchor: 'blockExit', offsetMin: 30, label: 'x', skipIfDone: true },
      });
      expect(minutesInput('blockExit')).toHaveDisplayValue('30');
      chooseTiming('beforeEnd');
      expect(minutesInput('beforeEnd')).toHaveDisplayValue('0');
    });

    it('names the option in both languages', () => {
      expect(t('reminder.timing.blockExit')).toBe('אחרי צאת שבת או חג');
      useUserStore.setState({ language: 'en' });
      expect(t('reminder.timing.blockExit')).toBe('After Shabbat or Yom Tov ends');
    });
  });

  describe('the heads-up before the window', () => {
    it('saves 10 minutes before the start as a start offset of -10', () => {
      const { onSave } = renderEditor({ mitzvah: SHACHARIT });
      setMinutes('beforeStart', 10);
      save();
      expect(onSave).toHaveBeenCalledWith({ anchor: 'start', offsetMin: -10, label: NAME, skipIfDone: false });
    });

    it('labels its field by what is counted', () => {
      renderEditor();
      chooseTiming('beforeStart');
      expect(screen.getAllByText(t('reminder.minutes.beforeStart'))).toHaveLength(1);
      expect(t('reminder.minutes.beforeStart')).toBe('כמה דקות לפני תחילת הזמן');
    });

    it.each([60, 180])('accepts %d minutes before the start on shacharit', (minutes) => {
      const { onSave } = renderEditor({ mitzvah: SHACHARIT });
      setMinutes('beforeStart', minutes);
      save();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'start', offsetMin: -minutes }));
    });

    it('refuses 181 minutes before the start with the heads-up range, and saves nothing', () => {
      const { onSave, onClose } = renderEditor({ mitzvah: SHACHARIT });
      setMinutes('beforeStart', 181);
      save();
      expect(screen.getByText(t('reminder.errors.headsUpRange', { max: 180 }))).toBeOnTheScreen();
      expect(onSave).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('keeps the option on before the start while the field holds 0, and saves it as a start offset of 0', () => {
      const { onSave } = renderEditor({ mitzvah: SHACHARIT });
      chooseTiming('beforeStart');
      fireEvent.changeText(minutesInput('beforeStart'), '0');
      expect(timingOption('beforeStart')).toBeSelected();
      expect(minutesInput('beforeStart')).toHaveDisplayValue('0');
      save();
      expect(onSave).toHaveBeenCalledWith({ anchor: 'start', offsetMin: 0, label: NAME, skipIfDone: false });
    });

    it('saves a clock reminder on a custom mitzvah', () => {
      const { onSave } = renderEditor({ mitzvah: CUSTOM });
      setClock('0930');
      save();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'clock', offsetMin: 570 }));
    });

    it("saves a clock time up to 180 minutes before a custom mitzvah's hours and names its hours past that", () => {
      jest.setSystemTime(WEDNESDAY_IN_CUSTOM);
      const { onSave } = renderEditor({ mitzvah: CUSTOM });
      setClock('0559');
      save();
      expect(screen.getByText(CUSTOM_OUTSIDE)).toBeOnTheScreen();
      expect(onSave).not.toHaveBeenCalled();
      typeTime('0600');
      save();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'clock', offsetMin: 360 }));
    });

    it('saves a 10:00 clock reminder on birchot hashachar, whose window runs to chatzot', () => {
      jest.setSystemTime(WEDNESDAY_MORNING);
      const { onSave } = renderEditor({ mitzvah: BIRCHOT });
      setClock('1000');
      save();
      expect(screen.queryByText(OUTSIDE)).toBeNull();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'clock', offsetMin: 600 }));
    });
  });

  describe('on a short screen', () => {
    it('scrolls its body inside 65% of the window height, so the sheet never runs off the top', () => {
      const { height } = Dimensions.get('window');
      renderEditor();
      chooseTiming('clock');
      const body = screen.UNSAFE_getAllByType(ScrollView).find((view) => view.props.keyboardShouldPersistTaps);
      expect(body).toBeDefined();
      expect(StyleSheet.flatten(body!.props.style)).toEqual({ maxHeight: height * 0.65 });
    });
  });

  describe('a start or end reminder that already exists', () => {
    it('opens a positive start offset as from the start, with its minutes and no time field', () => {
      renderEditor({ initialValue: { anchor: 'start', offsetMin: 30, label: 'x' } });
      expect(timingOption('fromStart')).toBeSelected();
      expect(minutesInput('fromStart')).toHaveDisplayValue('30');
      expect(screen.queryByLabelText(t('custom.typeTime'))).toBeNull();
      expect(screen.queryByLabelText(t('custom.pickHour'))).toBeNull();
    });

    it('opens a negative start offset as before the start, counted as a positive number', () => {
      const { onSave } = renderEditor({ initialValue: { anchor: 'start', offsetMin: -30, label: 'x' } });
      expect(timingOption('beforeStart')).toBeSelected();
      expect(minutesInput('beforeStart')).toHaveDisplayValue('30');
      save();
      expect(onSave).toHaveBeenCalledWith({ anchor: 'start', offsetMin: -30, label: 'x', skipIfDone: false });
    });

    it('saves an end offset as typed, with its anchor', () => {
      const { onSave, onClose } = renderEditor({ initialValue: { anchor: 'end', offsetMin: -45, label: 'x' } });
      expect(timingOption('beforeEnd')).toBeSelected();
      expect(minutesInput('beforeEnd')).toHaveDisplayValue('45');
      save();
      expect(onSave).toHaveBeenCalledWith({ anchor: 'end', offsetMin: -45, label: 'x', skipIfDone: false });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('writes the minutes before the end as a negative end offset', () => {
      const { onSave } = renderEditor({ mitzvah: SHACHARIT });
      setMinutes('beforeEnd', 20);
      save();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'end', offsetMin: -20 }));
    });

    it('reads an end offset stored as positive as before the end, and saves it negative', () => {
      const { onSave } = renderEditor({ initialValue: { anchor: 'end', offsetMin: 15, label: 'x' } });
      expect(timingOption('beforeEnd')).toBeSelected();
      expect(minutesInput('beforeEnd')).toHaveDisplayValue('15');
      save();
      expect(onSave).toHaveBeenCalledWith({ anchor: 'end', offsetMin: -15, label: 'x', skipIfDone: false });
    });

    it('writes the minutes after the start as a positive start offset', () => {
      const { onSave } = renderEditor({ mitzvah: SHACHARIT });
      setMinutes('fromStart', 15);
      save();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'start', offsetMin: 15 }));
    });
  });

  describe('the minutes keyboard', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it.each(['android', 'ios', 'web'] as const)('opens the number pad on %s', (os) => {
      jest.replaceProperty(Platform, 'OS', os);
      renderEditor();
      expect(minutesInput('fromStart').props.keyboardType).toBe('number-pad');
    });

    it('allows three digits at most', () => {
      renderEditor();
      expect(minutesInput('fromStart').props.maxLength).toBe(3);
    });

    it('saves 60 minutes before the start typed on Android', () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      const { onSave } = renderEditor({ mitzvah: SHACHARIT });
      setMinutes('beforeStart', 60);
      save();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'start', offsetMin: -60 }));
    });
  });

  describe('the steppers', () => {
    it('step by five from the typed value', () => {
      renderEditor({ mitzvah: SHACHARIT });
      fireEvent.changeText(minutesInput('fromStart'), '20');
      step('more');
      expect(minutesInput('fromStart')).toHaveDisplayValue('25');
      step('less');
      step('less');
      expect(minutesInput('fromStart')).toHaveDisplayValue('15');
    });

    it('stop at zero going down', () => {
      renderEditor({ mitzvah: SHACHARIT });
      fireEvent.changeText(minutesInput('fromStart'), '3');
      step('less');
      expect(minutesInput('fromStart')).toHaveDisplayValue('0');
      step('less');
      expect(minutesInput('fromStart')).toHaveDisplayValue('0');
    });

    it.each([
      ['beforeStart', 178, 180],
      ['fromStart', 718, 720],
      ['beforeEnd', 719, 720],
    ] as const)('stop at the top of %s going up', (timing, from, top) => {
      renderEditor({ mitzvah: SHACHARIT });
      setMinutes(timing, from);
      step('more');
      expect(minutesInput(timing)).toHaveDisplayValue(String(top));
      step('more');
      expect(minutesInput(timing)).toHaveDisplayValue(String(top));
    });

    it('stop at one for a follow-up and at 720 going up', () => {
      renderEditor({ mitzvah: CUSTOM });
      setMinutes('followUp', 3);
      step('less');
      expect(minutesInput('followUp')).toHaveDisplayValue('1');
      fireEvent.changeText(minutesInput('followUp'), '718');
      step('more');
      expect(minutesInput('followUp')).toHaveDisplayValue('720');
    });

    it('step from zero on an empty field', () => {
      renderEditor({ mitzvah: SHACHARIT });
      fireEvent.changeText(minutesInput('fromStart'), '');
      step('more');
      expect(minutesInput('fromStart')).toHaveDisplayValue('5');
    });

    it('carry the sign through to the saved offset', () => {
      const { onSave } = renderEditor({ mitzvah: SHACHARIT });
      setMinutes('beforeStart', 10);
      step('more');
      save();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'start', offsetMin: -15 }));
    });

    it('are named in both languages', () => {
      expect(t('reminder.minutes.less')).toBe('5 דקות פחות');
      expect(t('reminder.minutes.more')).toBe('5 דקות יותר');
      useUserStore.setState({ language: 'en' });
      expect(t('reminder.minutes.less')).toBe('5 minutes less');
      expect(t('reminder.minutes.more')).toBe('5 minutes more');
    });
  });

  describe('a malformed value', () => {
    const invalid = () => screen.queryByText(t('reminder.errors.offsetInvalid'));

    it.each([
      ['-60-600', '60600'],
      ['-5', '5'],
      ['12.5', '125'],
      ['1e2', '12'],
      ['6O', '6'],
      ['--5', '5'],
      ['+30', '30'],
      ['abc', ''],
      ['   ', ''],
    ])('never lets the characters of %j through: the field holds %j', (typed, shown) => {
      renderEditor({ mitzvah: SHACHARIT });
      fireEvent.changeText(minutesInput('fromStart'), typed);
      expect(minutesInput('fromStart')).toHaveDisplayValue(shown);
    });

    it('refuses an empty field on every timing, and saves nothing', () => {
      const { onSave, onClose } = renderEditor({ mitzvah: LEVANA, initialValue: null });
      (['beforeStart', 'fromStart', 'beforeEnd', 'blockExit'] as const).forEach((timing) => {
        setMinutes(timing, '');
        save();
        expect(invalid()).toBeOnTheScreen();
      });
      expect(onSave).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('refuses an empty follow-up before the follow-up range', () => {
      const { onSave } = renderEditor({ mitzvah: CUSTOM, mitzvahName: 'לימוד' });
      setMinutes('followUp', '');
      save();
      expect(invalid()).toBeOnTheScreen();
      expect(screen.queryByText(t('reminder.errors.followUpRange', { max: 720 }))).toBeNull();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('refuses 60600 as out of range, and saves 60 minutes before the start once it is fixed', () => {
      const { onSave, onClose } = renderEditor({ mitzvah: SHACHARIT });
      setMinutes('beforeStart', '-60-600');
      expect(minutesInput('beforeStart')).toHaveDisplayValue('60600');
      save();
      expect(screen.getByText(t('reminder.errors.headsUpRange', { max: 180 }))).toBeOnTheScreen();
      expect(onSave).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      fireEvent.changeText(minutesInput('beforeStart'), '-60');
      save();
      expect(screen.queryByText(t('reminder.errors.headsUpRange', { max: 180 }))).toBeNull();
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'start', offsetMin: -60 }));
    });

    it('words the error in both languages', () => {
      expect(t('reminder.errors.offsetInvalid')).toBe('יש להזין מספר שלם של דקות');
      useUserStore.setState({ language: 'en' });
      expect(t('reminder.errors.offsetInvalid')).toBe('Enter a whole number of minutes');
    });
  });

  describe('choosing the clock option', () => {
    it('swaps the minutes field for the time field, wheels included, named by the time label', () => {
      renderEditor({ initialValue: { anchor: 'start', offsetMin: 30, label: 'x' } });
      expect(screen.getByText('\u200E-5')).toBeOnTheScreen();
      expect(screen.getByText('\u200E+5')).toBeOnTheScreen();
      chooseTiming('clock');
      expect(timingOption('clock')).toBeSelected();
      expect(screen.queryByLabelText(t('reminder.minutes.fromStart'))).toBeNull();
      expect(screen.queryByText('\u200E-5')).toBeNull();
      expect(screen.queryByText('\u200E+5')).toBeNull();
      expect(screen.getByText(t('reminder.time'))).toBeOnTheScreen();
      expect(timeInput()).toHaveDisplayValue('');
      expect(timeInput().props.placeholder).toBe('HH:MM');
    });

    it('shows the wheels in the sheet at once, with no button to open a second sheet', () => {
      renderEditor();
      chooseTiming('clock');
      expect(hourWheel()).toBeOnTheScreen();
      expect(minuteWheel()).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: t('reminder.time') })).toBeNull();
      expect(screen.UNSAFE_getAllByType(Modal)).toHaveLength(1);
      expect(screen.getAllByRole('button', { name: t('common.close') })).toHaveLength(1);
    });

    it('opens no second sheet for the timing choice either', () => {
      renderEditor({ mitzvah: CUSTOM });
      expect(screen.UNSAFE_getAllByType(Modal)).toHaveLength(1);
    });

    it('writes the picked time as minutes after midnight', () => {
      const { onSave, onClose } = renderEditor();
      setClock('2045');
      expect(timeInput()).toHaveDisplayValue('20:45');
      save();
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith({ anchor: 'clock', offsetMin: 20 * 60 + 45, label: NAME, skipIfDone: false });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('writes the time the wheels settle on', () => {
      const { onSave } = renderEditor();
      setClock('0800');
      scrollWheelTo(hourWheel(), 9);
      scrollWheelTo(minuteWheel(), 15);
      expect(timeInput()).toHaveDisplayValue('09:15');
      save();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'clock', offsetMin: 9 * 60 + 15 }));
    });

    it.each([
      ['00:00', 0],
      ['00:30', 30],
      ['09:05', 545],
      ['23:59', 1439],
    ])('writes %s as %d', (typed, minutes) => {
      const { onSave } = renderEditor();
      setClock(typed);
      save();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'clock', offsetMin: minutes }));
    });

    it('refuses to save without a time', () => {
      const { onSave, onClose } = renderEditor();
      chooseTiming('clock');
      save();
      expect(screen.getByText(t('reminder.errors.timeRequired'))).toBeOnTheScreen();
      expect(onSave).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not take a half-typed time for a time', () => {
      const { onSave } = renderEditor();
      setClock('20:');
      save();
      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByText(t('reminder.errors.timeRequired'))).toBeOnTheScreen();
    });
  });

  describe('switching back from the clock option', () => {
    it.each([
      ['fromStart', 'start', 0],
      ['beforeEnd', 'end', 0],
      ['beforeStart', 'start', -10],
    ] as const)('starts %s on its own default coming back', (back, anchor, offsetMin) => {
      const { onSave } = renderEditor({ initialValue: { anchor: 'start', offsetMin: 30, label: 'x' } });
      expect(minutesInput('fromStart')).toHaveDisplayValue('30');
      setClock('0800');
      chooseTiming(back);
      expect(minutesInput(back)).toHaveDisplayValue(String(Math.abs(offsetMin)));
      save();
      expect(onSave).toHaveBeenCalledWith({ anchor, offsetMin, label: 'x', skipIfDone: false });
    });

    it('resets the minutes to zero for a reminder that was a clock one when it opened', () => {
      const { onSave } = renderEditor({ initialValue: EVENING });
      chooseTiming('beforeEnd');
      expect(minutesInput('beforeEnd')).toHaveDisplayValue('0');
      save();
      expect(onSave).toHaveBeenCalledWith({ anchor: 'end', offsetMin: 0, label: 'ערב', skipIfDone: true });
    });

    it('keeps the minutes when it only moves between before the end and from the start', () => {
      renderEditor({ initialValue: { anchor: 'start', offsetMin: 30, label: 'x' } });
      chooseTiming('beforeEnd');
      expect(minutesInput('beforeEnd')).toHaveDisplayValue('30');
      chooseTiming('fromStart');
      expect(minutesInput('fromStart')).toHaveDisplayValue('30');
    });

    it('keeps the minutes going to before the start, up to the heads-up range, and starts at ten from zero', () => {
      renderEditor({ initialValue: { anchor: 'start', offsetMin: 30, label: 'x' } });
      chooseTiming('beforeStart');
      expect(minutesInput('beforeStart')).toHaveDisplayValue('30');
      chooseTiming('fromStart');
      fireEvent.changeText(minutesInput('fromStart'), '500');
      chooseTiming('beforeStart');
      expect(minutesInput('beforeStart')).toHaveDisplayValue('180');
      chooseTiming('fromStart');
      fireEvent.changeText(minutesInput('fromStart'), '0');
      chooseTiming('beforeStart');
      expect(minutesInput('beforeStart')).toHaveDisplayValue('10');
    });

    it('remembers the time picked when it goes to the clock option again', () => {
      renderEditor();
      setClock('2045');
      chooseTiming('fromStart');
      chooseTiming('clock');
      expect(timeInput()).toHaveDisplayValue('20:45');
      expect(hourWheel()).toHaveAccessibilityValue({ text: '20' });
      expect(minuteWheel()).toHaveAccessibilityValue({ text: '45' });
    });
  });

  describe('a clock reminder that already exists', () => {
    it('opens on the option and its time, in the input and on the wheels', () => {
      renderEditor({ initialValue: EVENING });
      expect(timingOption('clock')).toBeSelected();
      expect(timeInput()).toHaveDisplayValue('20:30');
      expect(hourWheel()).toHaveAccessibilityValue({ text: '20' });
      expect(minuteWheel()).toHaveAccessibilityValue({ text: '30' });
    });

    it('is saved back unchanged when only the label is edited', () => {
      const { onSave } = renderEditor({ initialValue: EVENING });
      fireEvent.changeText(screen.getByLabelText(t('reminder.label')), 'חדש');
      save();
      expect(onSave).toHaveBeenCalledWith({ anchor: 'clock', offsetMin: 1230, label: 'חדש', skipIfDone: true });
    });

    it('writes the new time when it is changed', () => {
      const { onSave } = renderEditor({ initialValue: EVENING });
      typeTime('2115');
      save();
      expect(onSave).toHaveBeenCalledWith({ anchor: 'clock', offsetMin: 21 * 60 + 15, label: 'ערב', skipIfDone: true });
    });
  });

  describe('the line that says when the reminder goes out', () => {
    const NEXT_LINE = /^ההתראה הבאה תישלח ב-/;
    const nextLine = (date: Date) => t('detail.previewNext', { time: fireTimeText(date, JERUSALEM.tz) });

    beforeEach(() => {
      jest.setSystemTime(WEDNESDAY_MORNING);
    });

    it('names the fire time of a heads-up of 30 minutes before the start, in the accent text colour', () => {
      jest.setSystemTime(at(JERUSALEM, '2026-12-16T05:00'));
      const window = currentOrNextWindow(SHACHARIT, JERUSALEM, SETTINGS, new Date())!;
      renderEditor({ mitzvah: SHACHARIT });
      setMinutes('beforeStart', 30);
      const line = screen.getByText(nextLine(new Date(window.start.getTime() - 30 * 60_000)));
      expect(line).toHaveStyle({ color: THEMES.gold.goldText });
    });

    it('is already there for the untouched sheet, naming the start of the window', () => {
      jest.setSystemTime(at(JERUSALEM, '2026-12-16T05:00'));
      const window = currentOrNextWindow(SHACHARIT, JERUSALEM, SETTINGS, new Date())!;
      renderEditor({ mitzvah: SHACHARIT });
      expect(screen.getByText(nextLine(window.start))).toBeOnTheScreen();
    });

    it('follows the minutes as they change', () => {
      jest.setSystemTime(at(JERUSALEM, '2026-12-16T05:00'));
      const window = currentOrNextWindow(SHACHARIT, JERUSALEM, SETTINGS, new Date())!;
      renderEditor({ mitzvah: SHACHARIT });
      setMinutes('fromStart', 20);
      expect(screen.getByText(nextLine(new Date(window.start.getTime() + 20 * 60_000)))).toBeOnTheScreen();
      fireEvent.changeText(minutesInput('fromStart'), '45');
      expect(screen.getByText(nextLine(new Date(window.start.getTime() + 45 * 60_000)))).toBeOnTheScreen();
      expect(screen.getAllByText(NEXT_LINE)).toHaveLength(1);
    });

    it('names the time of a set clock time', () => {
      renderEditor({ mitzvah: SHACHARIT });
      setClock('0800');
      expect(screen.getByText(nextLine(at(JERUSALEM, '2026-12-16T08:00')))).toHaveStyle({
        color: THEMES.gold.goldText,
      });
    });

    it('draws no line for a clock time that is not whole yet', () => {
      renderEditor({ mitzvah: SHACHARIT });
      chooseTiming('clock');
      expect(screen.queryByText(NEXT_LINE)).toBeNull();
      typeTime('08:');
      expect(screen.queryByText(NEXT_LINE)).toBeNull();
      expect(screen.queryByText(OUTSIDE)).toBeNull();
    });

    it('says in the urgent colour that a value outside the window will not go out, before anything is saved', () => {
      const { onSave } = renderEditor({ mitzvah: SHACHARIT });
      setClock('2300');
      expect(screen.getByText(OUTSIDE)).toHaveStyle({ color: THEMES.gold.urgent });
      expect(screen.queryByText(NEXT_LINE)).toBeNull();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('names the next window and its date when the open one is over', () => {
      jest.setSystemTime(WEDNESDAY);
      renderEditor({ mitzvah: SHACHARIT });
      setClock('2300');
      expect(screen.getByText(NEXT_OUTSIDE)).toHaveStyle({ color: THEMES.gold.urgent });
    });

    it.each(['', '181'])('draws no line for %j minutes before the start', (typed) => {
      renderEditor({ mitzvah: SHACHARIT });
      setMinutes('beforeStart', typed);
      expect(screen.queryByText(NEXT_LINE)).toBeNull();
      expect(screen.queryByText(OUTSIDE)).toBeNull();
    });

    it('draws no line for a mitzvah with no window ahead', () => {
      renderEditor({ mitzvah: OMER });
      setClock('1200');
      expect(screen.queryByText(NEXT_LINE)).toBeNull();
      expect(screen.queryByText(OUTSIDE)).toBeNull();
    });

    it('reads the reminder it opens on', () => {
      renderEditor({ mitzvah: SHACHARIT, initialValue: { anchor: 'clock', offsetMin: 8 * 60, label: 'x' } });
      expect(screen.getByText(nextLine(at(JERUSALEM, '2026-12-16T08:00')))).toBeOnTheScreen();
    });

    it('is not repeated as an error when a save is refused for the same reason', () => {
      const { onSave } = renderEditor({ mitzvah: SHACHARIT });
      setClock('2300');
      save();
      expect(screen.getAllByText(OUTSIDE)).toHaveLength(1);
      expect(onSave).not.toHaveBeenCalled();
    });

    it('leaves no refused save’s error beside the line once the value is fixed', () => {
      renderEditor({ mitzvah: SHACHARIT });
      setClock('2300');
      save();
      typeTime('0800');
      expect(screen.queryByText(OUTSIDE)).toBeNull();
      expect(screen.getByText(nextLine(at(JERUSALEM, '2026-12-16T08:00')))).toBeOnTheScreen();
    });

    it('still shows the range error of a value the line has no word for', () => {
      renderEditor({ mitzvah: SHACHARIT });
      setMinutes('beforeStart', 181);
      save();
      expect(screen.getByText(t('reminder.errors.headsUpRange', { max: 180 }))).toBeOnTheScreen();
      expect(screen.queryByText(NEXT_LINE)).toBeNull();
    });
  });

  describe('against every window the scheduler looks at', () => {
    it('refuses minutes past the range before it judges any window', () => {
      const { onSave } = renderEditor();
      setMinutes('fromStart', 721);
      save();
      expect(screen.getByText(t('reminder.errors.offsetRange', { max: 720 }))).toBeOnTheScreen();
      expect(onSave).not.toHaveBeenCalled();
    });

    describe('on a Friday, when the window shown ends at candle lighting', () => {
      beforeEach(() => {
        jest.setSystemTime(FRIDAY);
      });

      it('saves the Chok LeYisrael evening reminder at 20:30, which Sunday carries', () => {
        const { onSave } = renderEditor();
        setClock('2030');
        save();
        expect(screen.queryByText(OUTSIDE)).toBeNull();
        expect(onSave).toHaveBeenCalledWith({ anchor: 'clock', offsetMin: 1230, label: NAME, skipIfDone: false });
      });

      it('saves the evening reminder it opened with after only its label changed', () => {
        const { onSave } = renderEditor({ initialValue: EVENING });
        fireEvent.changeText(screen.getByLabelText(t('reminder.label')), 'חדש');
        save();
        expect(onSave).toHaveBeenCalledWith({ anchor: 'clock', offsetMin: 1230, label: 'חדש', skipIfDone: true });
      });

      it('saves minutes after the start that Friday window ends before, because a later window carries it', () => {
        const { onSave } = renderEditor();
        setMinutes('fromStart', 700);
        save();
        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'start', offsetMin: 700 }));
      });

      it('judges a time before the window start by the day it moves on to', () => {
        const { onSave } = renderEditor();
        setClock('0300');
        save();
        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'clock', offsetMin: 180 }));
      });
    });

    describe('for a short window', () => {
      beforeEach(() => {
        jest.setSystemTime(WEDNESDAY_MORNING);
      });

      it('refuses a clock time that falls in no window of the coming days', () => {
        const { onSave, onClose } = renderEditor({ mitzvah: SHACHARIT });
        setClock('2300');
        save();
        expect(screen.getByText(OUTSIDE)).toBeOnTheScreen();
        expect(onSave).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
      });

      it('names the window it judged by, on the location clock', () => {
        const window = currentOrNextWindow(SHACHARIT, JERUSALEM, SETTINGS, new Date())!;
        renderEditor({ mitzvah: SHACHARIT });
        setClock('2300');
        save();
        expect(
          screen.getByText(
            t('reminder.errors.outsideWindowToday', {
              start: clockOf(window.start, JERUSALEM.tz),
              end: clockOf(window.end, JERUSALEM.tz),
            }),
          ),
        ).toBeOnTheScreen();
      });

      it("calls a window that has yet to open later today today's", () => {
        jest.setSystemTime(at(JERUSALEM, '2026-12-16T05:45'));
        const { onSave } = renderEditor({ mitzvah: SHACHARIT });
        setClock('2300');
        save();
        expect(screen.getByText(OUTSIDE)).toBeOnTheScreen();
        expect(onSave).not.toHaveBeenCalled();
      });

      it('names the next window and its date once the window of the day has closed', () => {
        jest.setSystemTime(WEDNESDAY);
        const window = currentOrNextWindow(SHACHARIT, JERUSALEM, SETTINGS, new Date())!;
        const { onSave } = renderEditor({ mitzvah: SHACHARIT });
        setClock('2300');
        save();
        expect(screen.queryByText(OUTSIDE)).toBeNull();
        expect(
          screen.getByText(
            t('reminder.errors.outsideWindowNext', {
              date: '17/12',
              start: clockOf(window.start, JERUSALEM.tz),
              end: clockOf(window.end, JERUSALEM.tz),
            }),
          ),
        ).toBeOnTheScreen();
        expect(screen.getByText(NEXT_OUTSIDE)).toBeOnTheScreen();
        expect(onSave).not.toHaveBeenCalled();
      });

      it('names the date of a window that opens days ahead, as the candle lighting one does', () => {
        jest.setSystemTime(WEDNESDAY);
        renderEditor({ mitzvah: CANDLE_LIGHTING });
        setClock('0200');
        save();
        expect(screen.getByText(/^החלון הבא פתוח ב-18\/12 /)).toBeOnTheScreen();
        expect(screen.getByText(NEXT_OUTSIDE)).toBeOnTheScreen();
      });

      it('refuses a time more than 180 minutes before the window opens', () => {
        const { onSave } = renderEditor({ mitzvah: SHACHARIT });
        setClock('0300');
        save();
        expect(screen.getByText(OUTSIDE)).toBeOnTheScreen();
        expect(onSave).not.toHaveBeenCalled();
      });

      it('accepts a time inside it', () => {
        const { onSave } = renderEditor({ mitzvah: SHACHARIT });
        setClock('0800');
        save();
        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'clock', offsetMin: 480 }));
      });

      it('accepts a time inside it on a Friday too', () => {
        jest.setSystemTime(FRIDAY);
        const { onSave } = renderEditor({ mitzvah: SHACHARIT });
        setClock('0800');
        save();
        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'clock', offsetMin: 480 }));
      });

      it.each([
        ['fromStart', 720],
        ['beforeEnd', 720],
      ] as const)('refuses %s at %d minutes, which lands outside every window', (timing, minutes) => {
        const { onSave } = renderEditor({ mitzvah: SHACHARIT });
        setMinutes(timing, minutes);
        save();
        expect(screen.getByText(OUTSIDE)).toBeOnTheScreen();
        expect(onSave).not.toHaveBeenCalled();
      });

      it.each([
        ['fromStart', 30, 'start', 30],
        ['beforeEnd', 30, 'end', -30],
        ['beforeStart', 60, 'start', -60],
      ] as const)('accepts %s at %d minutes, which lands inside a window', (timing, minutes, anchor, offsetMin) => {
        const { onSave } = renderEditor({ mitzvah: SHACHARIT });
        setMinutes(timing, minutes);
        save();
        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor, offsetMin }));
      });

      it('clears the error once a valid reminder is saved', () => {
        const { onSave } = renderEditor({ mitzvah: SHACHARIT });
        setClock('2300');
        save();
        expect(screen.getByText(OUTSIDE)).toBeOnTheScreen();
        typeTime('0800');
        save();
        expect(screen.queryByText(OUTSIDE)).toBeNull();
        expect(onSave).toHaveBeenCalledTimes(1);
      });
    });

    it('judges nothing for a mitzvah with no window ahead, such as the Omer out of its season', () => {
      const { onSave } = renderEditor({ mitzvah: OMER });
      setClock('1200');
      save();
      expect(screen.queryByText(OUTSIDE)).toBeNull();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'clock', offsetMin: 720 }));
    });

    it('judges a custom mitzvah through its own window and the same rule', () => {
      jest.setSystemTime(WEDNESDAY_IN_CUSTOM);
      const { onSave } = renderEditor({ mitzvah: CUSTOM });
      setMinutes('fromStart', 90);
      save();
      expect(screen.getByText(CUSTOM_OUTSIDE)).toBeOnTheScreen();
      expect(onSave).not.toHaveBeenCalled();
      fireEvent.changeText(minutesInput('fromStart'), '30');
      save();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'start', offsetMin: 30 }));
    });
  });
});
