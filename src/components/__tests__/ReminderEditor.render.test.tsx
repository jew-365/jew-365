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
import { ReminderEditor, parseOffsetMinutes } from '../ReminderEditor';
import { WHEEL_ITEM_HEIGHT } from '../WheelPicker';
import { CITIES } from '@/data/cities';
import { customToMitzvah } from '@/data/customMitzvotAdapter';
import { findMitzvah } from '@/data/mitzvot';
import { t } from '@/i18n';
import { useUserStore } from '@/stores/useUserStore';
import { installChokFixture } from '@/testing/chok';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';
import type { Reminder, ReminderAnchor, UserSettings } from '@/types/mitzvah';
import { nextReminderAt } from '@/services/notifications/planners/mitzvot';
import { currentOrNextWindow } from '@/utils/buildDayTimeline';
import { clockOf } from '@/utils/clock';

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

const anchorOption = (anchor: ReminderAnchor) => screen.getByRole('radio', { name: t(`reminder.anchor.${anchor}`) });
const timeInput = () => screen.getByLabelText(t('custom.typeTime'));
const hourWheel = () => screen.getByLabelText(t('custom.pickHour'));
const minuteWheel = () => screen.getByLabelText(t('custom.pickMinute'));
const offsetInput = () => screen.getByLabelText(t('reminder.offset'));
const chooseAnchor = (anchor: ReminderAnchor) => fireEvent.press(anchorOption(anchor));
const save = () => fireEvent.press(screen.getByRole('button', { name: t('common.save') }));
const typeTime = (typed: string) => fireEvent.changeText(timeInput(), typed);

function scrollWheelTo(wheel: ReturnType<typeof hourWheel>, index: number) {
  fireEvent(wheel, 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: 0, y: index * WHEEL_ITEM_HEIGHT } } });
}

function setOffset(anchor: 'start' | 'end' | 'followUp' | 'blockExit', minutes: number) {
  chooseAnchor(anchor);
  fireEvent.changeText(offsetInput(), String(minutes));
}

function setClock(typed: string) {
  chooseAnchor('clock');
  typeTime(typed);
}

describe('ReminderEditor', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    jest.useFakeTimers({ now: WEDNESDAY, doNotFake: [...ONLY_DATE] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the anchor choice', () => {
    it('offers start, end and a set time for a registry mitzvah, start first', () => {
      renderEditor();
      expect(screen.getAllByRole('radio').map((radio) => radio.props.accessibilityState.selected)).toEqual([
        true,
        false,
        false,
      ]);
      expect(anchorOption('clock')).toBeOnTheScreen();
      expect(t('reminder.anchor.clock')).not.toBe('reminder.anchor.clock');
    });

    it('offers the three anchors and a fourth, after the end, for a custom mitzvah', () => {
      renderEditor({ mitzvah: CUSTOM });
      expect(screen.getAllByRole('radio')).toHaveLength(4);
      expect(anchorOption('clock')).toBeOnTheScreen();
      expect(anchorOption('followUp')).toBeOnTheScreen();
    });

    it('shows no follow-up option for a registry mitzvah', () => {
      renderEditor({ mitzvah: SHACHARIT });
      expect(screen.getAllByRole('radio')).toHaveLength(3);
      expect(screen.queryByRole('radio', { name: t('reminder.anchor.followUp') })).toBeNull();
    });

    it('names the third option in both languages', () => {
      expect(t('reminder.anchor.clock')).toBe('בשעה קבועה');
      useUserStore.setState({ language: 'en' });
      expect(t('reminder.anchor.clock')).toBe('At a set time');
      expect(t('reminder.time')).toBe('Time');
    });

    it('names the follow-up option and its default text in both languages', () => {
      expect(t('reminder.anchor.followUp')).toBe('אחרי הסוף, אם לא בוצע');
      expect(t('reminder.followUp.label', { name: 'לימוד' })).toBe('עוד לא סימנת: לימוד');
      useUserStore.setState({ language: 'en' });
      expect(t('reminder.anchor.followUp')).toBe('After the end, if not done');
      expect(t('reminder.followUp.label', { name: 'Study' })).toBe('Not marked yet: Study');
    });
  });

  describe('a follow-up after the end', () => {
    it('opens on 60 minutes with its hint, no skip-if-done switch and the default text as placeholder, and saves an empty label', () => {
      const { onSave, onClose } = renderEditor({ mitzvah: CUSTOM, mitzvahName: 'לימוד' });
      chooseAnchor('followUp');
      expect(anchorOption('followUp')).toBeSelected();
      expect(offsetInput()).toHaveDisplayValue('60');
      expect(screen.getByText(t('reminder.followUp.hint', { max: 720 }))).toBeOnTheScreen();
      expect(screen.queryByText(t('reminder.headsUpHint', { max: 180 }))).toBeNull();
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
      chooseAnchor('followUp');
      fireEvent.changeText(screen.getByLabelText(t('reminder.label')), 'עדיין לא');
      save();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'followUp', label: 'עדיין לא' }));
    });

    it.each(['0', '-5', '721'])('refuses %s minutes, and takes 720', (typed) => {
      const { onSave } = renderEditor({ mitzvah: CUSTOM, mitzvahName: 'לימוד' });
      chooseAnchor('followUp');
      fireEvent.changeText(offsetInput(), typed);
      save();
      expect(screen.getByText(t('reminder.errors.followUpRange', { max: 720 }))).toBeOnTheScreen();
      expect(onSave).not.toHaveBeenCalled();
      fireEvent.changeText(offsetInput(), '720');
      save();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'followUp', offsetMin: 720 }));
    });

    it('opens on an existing follow-up, goes back to 0 when it leaves and to 60 when it returns', () => {
      renderEditor({
        mitzvah: CUSTOM,
        initialValue: { anchor: 'followUp', offsetMin: 90, label: 'x', skipIfDone: true },
      });
      expect(anchorOption('followUp')).toBeSelected();
      expect(offsetInput()).toHaveDisplayValue('90');
      chooseAnchor('end');
      expect(offsetInput()).toHaveDisplayValue('0');
      expect(screen.getByText(t('reminder.skipIfDone'))).toBeOnTheScreen();
      chooseAnchor('followUp');
      expect(offsetInput()).toHaveDisplayValue('60');
    });
  });

  describe('a multi-day mitzvah', () => {
    const renderLevana = () => renderEditor({ mitzvah: LEVANA, mitzvahName: 'קידוש לבנה' });

    it('offers a fourth option, after Shabbat and Yom Tov, and no follow-up', () => {
      renderLevana();
      expect(screen.getAllByRole('radio')).toHaveLength(4);
      expect(anchorOption('blockExit')).toBeOnTheScreen();
      expect(screen.queryByRole('radio', { name: t('reminder.anchor.followUp') })).toBeNull();
    });

    it('opens that option on 15 minutes with its hint', () => {
      renderLevana();
      chooseAnchor('blockExit');
      expect(anchorOption('blockExit')).toBeSelected();
      expect(offsetInput()).toHaveDisplayValue('15');
      expect(screen.getByText(t('reminder.blockExit.hint', { max: 720 }))).toBeOnTheScreen();
    });

    it('refuses a negative offset', () => {
      const { onSave } = renderLevana();
      setOffset('blockExit', -5);
      save();
      expect(screen.getByText(t('reminder.errors.blockExitRange', { max: 720 }))).toBeOnTheScreen();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('saves a reminder after Shabbat and Yom Tov with its default 15 minutes', () => {
      const { onSave, onClose } = renderLevana();
      chooseAnchor('blockExit');
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
      expect(offsetInput()).toHaveDisplayValue('30');
      chooseAnchor('end');
      expect(offsetInput()).toHaveDisplayValue('0');
    });

    it('names the option in both languages', () => {
      expect(t('reminder.anchor.blockExit')).toBe('במוצאי שבת וחג');
      useUserStore.setState({ language: 'en' });
      expect(t('reminder.anchor.blockExit')).toBe('After Shabbat and Yom Tov');
    });
  });

  describe('the heads-up before the window', () => {
    it('explains it under a start offset only', () => {
      renderEditor();
      const hint = t('reminder.headsUpHint', { max: 180 });
      expect(screen.getByText(hint)).toBeOnTheScreen();
      chooseAnchor('end');
      expect(screen.queryByText(hint)).toBeNull();
      chooseAnchor('clock');
      expect(screen.queryByText(hint)).toBeNull();
    });

    it.each([-60, -180])('accepts a start offset of %d on shacharit', (minutes) => {
      const { onSave } = renderEditor({ mitzvah: SHACHARIT });
      setOffset('start', minutes);
      save();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'start', offsetMin: minutes }));
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
      fireEvent.press(anchorOption('clock'));
      const body = screen.UNSAFE_getAllByType(ScrollView).find((view) => view.props.keyboardShouldPersistTaps);
      expect(body).toBeDefined();
      expect(StyleSheet.flatten(body!.props.style)).toEqual({ maxHeight: height * 0.65 });
    });
  });

  describe('a start or end reminder', () => {
    it('keeps the minutes input and has no time field', () => {
      renderEditor({ initialValue: { anchor: 'start', offsetMin: 30, label: 'x' } });
      expect(offsetInput()).toHaveDisplayValue('30');
      expect(screen.queryByLabelText(t('custom.typeTime'))).toBeNull();
      expect(screen.queryByLabelText(t('custom.pickHour'))).toBeNull();
    });

    it('saves the offset as typed, with its anchor', () => {
      const { onSave, onClose } = renderEditor({ initialValue: { anchor: 'end', offsetMin: -45, label: 'x' } });
      save();
      expect(onSave).toHaveBeenCalledWith({ anchor: 'end', offsetMin: -45, label: 'x', skipIfDone: false });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('the offset keyboard', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('opens the number pad, which keeps the minus key, on Android', () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      renderEditor();
      expect(offsetInput().props.keyboardType).toBe('numeric');
    });

    it.each(['ios', 'web'] as const)('keeps the numbers-and-punctuation keyboard on %s', (os) => {
      jest.replaceProperty(Platform, 'OS', os);
      renderEditor();
      expect(offsetInput().props.keyboardType).toBe('numbers-and-punctuation');
    });

    it('saves a -60 offset typed on Android', () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      const { onSave } = renderEditor({ mitzvah: SHACHARIT });
      setOffset('start', -60);
      save();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'start', offsetMin: -60 }));
    });
  });

  describe('a malformed offset', () => {
    const invalid = () => screen.queryByText(t('reminder.errors.offsetInvalid'));

    it('refuses -60-600, saves nothing, and saves -60 once it is fixed', () => {
      const { onSave, onClose } = renderEditor({ mitzvah: SHACHARIT });
      fireEvent.changeText(offsetInput(), '-60-600');
      save();
      expect(invalid()).toBeOnTheScreen();
      expect(onSave).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      fireEvent.changeText(offsetInput(), '-60');
      save();
      expect(invalid()).toBeNull();
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'start', offsetMin: -60 }));
    });

    it.each(['', '   ', '-', '12.5', '1e2', '6O', '--5'])('refuses %j on a start reminder', (typed) => {
      const { onSave } = renderEditor({ mitzvah: SHACHARIT });
      fireEvent.changeText(offsetInput(), typed);
      save();
      expect(invalid()).toBeOnTheScreen();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('refuses it on an end reminder', () => {
      const { onSave } = renderEditor({ mitzvah: SHACHARIT });
      chooseAnchor('end');
      fireEvent.changeText(offsetInput(), '-30-');
      save();
      expect(invalid()).toBeOnTheScreen();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('refuses it on a follow-up before the follow-up range', () => {
      const { onSave } = renderEditor({ mitzvah: CUSTOM, mitzvahName: 'לימוד' });
      chooseAnchor('followUp');
      fireEvent.changeText(offsetInput(), '-60-600');
      save();
      expect(invalid()).toBeOnTheScreen();
      expect(screen.queryByText(t('reminder.errors.followUpRange', { max: 720 }))).toBeNull();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('refuses it after Shabbat and Yom Tov, where zero would be in range', () => {
      const { onSave } = renderEditor({ mitzvah: LEVANA, mitzvahName: 'קידוש לבנה' });
      chooseAnchor('blockExit');
      fireEvent.changeText(offsetInput(), 'abc');
      save();
      expect(invalid()).toBeOnTheScreen();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('steps from zero on a value that is not a whole number', () => {
      renderEditor({ mitzvah: SHACHARIT });
      fireEvent.changeText(offsetInput(), '12.5');
      fireEvent.press(screen.getByText('+5'));
      expect(offsetInput()).toHaveDisplayValue('5');
      fireEvent.changeText(offsetInput(), '-60');
      fireEvent.press(screen.getByText('-5'));
      expect(offsetInput()).toHaveDisplayValue('-65');
    });

    it('words the error in both languages', () => {
      expect(t('reminder.errors.offsetInvalid')).toBe('ההיסט חייב להיות מספר שלם של דקות');
      useUserStore.setState({ language: 'en' });
      expect(t('reminder.errors.offsetInvalid')).toBe('Offset must be a whole number of minutes');
    });
  });

  describe('choosing the clock option', () => {
    it('swaps the minutes input for the time field, wheels included, named by the time label', () => {
      renderEditor({ initialValue: { anchor: 'start', offsetMin: 30, label: 'x' } });
      chooseAnchor('clock');
      expect(anchorOption('clock')).toBeSelected();
      expect(screen.queryByLabelText(t('reminder.offset'))).toBeNull();
      expect(screen.queryByText('-5')).toBeNull();
      expect(screen.queryByText('+5')).toBeNull();
      expect(screen.getByText(t('reminder.time'))).toBeOnTheScreen();
      expect(timeInput()).toHaveDisplayValue('');
      expect(timeInput().props.placeholder).toBe('HH:MM');
    });

    it('shows the wheels in the sheet at once, with no button to open a second sheet', () => {
      renderEditor();
      chooseAnchor('clock');
      expect(hourWheel()).toBeOnTheScreen();
      expect(minuteWheel()).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: t('reminder.time') })).toBeNull();
      expect(screen.UNSAFE_getAllByType(Modal)).toHaveLength(1);
      expect(screen.getAllByRole('button', { name: t('common.close') })).toHaveLength(1);
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
      chooseAnchor('clock');
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
    it.each(['start', 'end'] as const)('resets the offset to zero when it goes back to %s', (back) => {
      const { onSave } = renderEditor({ initialValue: { anchor: 'start', offsetMin: 30, label: 'x' } });
      expect(offsetInput()).toHaveDisplayValue('30');
      setClock('0800');
      chooseAnchor(back);
      expect(offsetInput()).toHaveDisplayValue('0');
      save();
      expect(onSave).toHaveBeenCalledWith({ anchor: back, offsetMin: 0, label: 'x', skipIfDone: false });
    });

    it('resets the offset to zero for a reminder that was a clock one when it opened', () => {
      const { onSave } = renderEditor({ initialValue: EVENING });
      chooseAnchor('end');
      expect(offsetInput()).toHaveDisplayValue('0');
      save();
      expect(onSave).toHaveBeenCalledWith({ anchor: 'end', offsetMin: 0, label: 'ערב', skipIfDone: true });
    });

    it('keeps the offset when it only moves between start and end', () => {
      renderEditor({ initialValue: { anchor: 'start', offsetMin: 30, label: 'x' } });
      chooseAnchor('end');
      expect(offsetInput()).toHaveDisplayValue('30');
    });

    it('remembers the time picked when it goes to the clock option again', () => {
      renderEditor();
      setClock('2045');
      chooseAnchor('start');
      chooseAnchor('clock');
      expect(timeInput()).toHaveDisplayValue('20:45');
      expect(hourWheel()).toHaveAccessibilityValue({ text: '20' });
      expect(minuteWheel()).toHaveAccessibilityValue({ text: '45' });
    });
  });

  describe('a clock reminder that already exists', () => {
    it('opens on the option and its time, in the input and on the wheels', () => {
      renderEditor({ initialValue: EVENING });
      expect(anchorOption('clock')).toBeSelected();
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

  describe('against every window the scheduler looks at', () => {
    it('refuses an offset past the range before it judges any window', () => {
      const { onSave } = renderEditor();
      setOffset('start', 721);
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

      it('saves an offset that Friday window ends before, because a later window carries it', () => {
        const { onSave } = renderEditor();
        setOffset('start', 700);
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
        ['end', 30],
        ['start', -181],
      ] as const)('refuses an offset from the %s that lands outside every window (%d)', (anchor, minutes) => {
        const { onSave } = renderEditor({ mitzvah: SHACHARIT });
        setOffset(anchor, minutes);
        save();
        expect(screen.getByText(OUTSIDE)).toBeOnTheScreen();
        expect(onSave).not.toHaveBeenCalled();
      });

      it.each([
        ['start', 30],
        ['end', -30],
      ] as const)('accepts an offset from the %s that lands inside a window (%d)', (anchor, minutes) => {
        const { onSave } = renderEditor({ mitzvah: SHACHARIT });
        setOffset(anchor, minutes);
        save();
        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor, offsetMin: minutes }));
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
      setOffset('start', 90);
      save();
      expect(screen.getByText(CUSTOM_OUTSIDE)).toBeOnTheScreen();
      expect(onSave).not.toHaveBeenCalled();
      fireEvent.changeText(offsetInput(), '30');
      save();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'start', offsetMin: 30 }));
    });
  });
});

describe('parseOffsetMinutes', () => {
  it.each([
    ['-60', -60],
    ['60', 60],
    ['+30', 30],
    [' -60 ', -60],
    ['007', 7],
    ['0', 0],
    ['-0', 0],
    ['721', 721],
  ])('reads %j as %d', (typed, minutes) => {
    expect(parseOffsetMinutes(typed)).toBe(minutes);
  });

  it.each(['-60-600', '', '   ', '-', '+', '12.5', '1e2', '0x10', '--5', '6O', '60 0'])(
    'reads %j as no number',
    (typed) => {
      expect(parseOffsetMinutes(typed)).toBeNull();
    },
  );
});
