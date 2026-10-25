const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

const mockInsets = { top: 0, right: 0, bottom: 34, left: 0 };

jest.mock('react-native-safe-area-context', () => ({
  ...(jest.requireActual('react-native-safe-area-context') as object),
  useSafeAreaInsets: () => mockInsets,
}));

import { ScrollView, StyleSheet } from 'react-native';
import { cleanup, fireEvent, screen, within } from '@testing-library/react-native';
import MitzvotScreen from '../mitzvot';
import { MITZVOT, findMitzvah } from '@/data/mitzvot';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChipRow } from '@/components/ChipRow';
import { IconTile } from '@/components/IconTile';
import { ListRow } from '@/components/ListRow';
import { MitzvahIcon } from '@/components/MitzvahIcon';
import { HeaderPill } from '@/components/ScreenHeader';
import { SectionLabel } from '@/components/SectionLabel';
import { CHOK_SIZE_ESTIMATE_MB } from '@/services/ChokContentService';
import { useChokStore } from '@/stores/useChokStore';
import { useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { installChokFixture } from '@/testing/chok';
import { renderWithTheme } from '@/testing/render';
import { MENS_MITZVOT } from '@/stores/taharahOptIn';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { THEMES } from '@/theme/colors';
import { shadowPresets, shadowStyle } from '@/theme/shadowStyle';
import { spacing } from '@/theme/tokens';
import type { ScheduleEntry } from '@/types/mitzvah';

const TEFILLIN = 'הנחת תפילין';
const HAVDALAH = 'הבדלה';
const HILULOT = 'הילולות צדיקים';
const ROSH_CHODESH = 'ראש חודש';
const NEEDS_REMINDER_TITLE = 'אין התראות';
const NEEDS_REMINDER_BODY = 'יש להגדיר לפחות התראה אחת בשביל להפעיל מעקב על המצווה';
const NEEDS_NOTICES_BODY = 'יש להגדיר לפחות התראה אחת בשביל להפעיל את ההתראות';
const CUSTOM_ID = 'custom_1800000000000_abc';
const CUSTOM_NAME = 'שיעור קבוע';

const ADD = 'הוסף מצווה חדשה';

const switchLabels = () => screen.getAllByRole('switch').map((node) => node.props.accessibilityLabel);
const sectionTitles = () => screen.UNSAFE_getAllByType(SectionLabel).map((node) => node.props.text);
const groupSwitches = (group: string) =>
  within(screen.getByTestId(`library-group-${group}`))
    .getAllByRole('switch')
    .map((node) => node.props.accessibilityLabel);
const names = (ids: string[]) => ids.map((id) => findMitzvah(id)!.name.he);
const addCustom = (id: string, name: string, createdAt: number, schedules?: ScheduleEntry[]) =>
  useCustomMitzvotStore.getState().add({
    id,
    name,
    startHHMM: '08:00',
    endHHMM: '09:00',
    reminders: [{ anchor: 'start', offsetMin: 0, label: name }],
    skipOn: [],
    createdAt,
    schedules,
  });
const ENDED_RANGE: ScheduleEntry[] = [
  { from: '2020-01-01', schedule: { mode: 'range', start: '2020-01-01', end: '2020-01-10' } },
];
const ENDED_STREAK: ScheduleEntry[] = [
  { from: '2020-01-01', schedule: { mode: 'streak', start: '2020-01-01', days: 10 } },
];
const RUNNING_RANGE: ScheduleEntry[] = [
  { from: '2020-01-01', schedule: { mode: 'range', start: '2020-01-01', end: '2099-12-31' } },
];
const caption = (title: string) =>
  screen.UNSAFE_getAllByType(ListRow).find((row) => row.props.title === title)!.props.caption;
const paddingBottom = () =>
  StyleSheet.flatten(screen.UNSAFE_getByType(ScrollView).props.contentContainerStyle).paddingBottom;

describe('Mitzvot library', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useMitzvotStore.getState().reset();
    useChokStore.getState().reset();
    useCustomMitzvotStore.getState().reset();
    mockPush.mockReset();
  });

  it('lists an enabled and a disabled mitzvah, each with its own switch state', () => {
    renderWithTheme(<MitzvotScreen />);
    expect(screen.getByText(TEFILLIN)).toBeOnTheScreen();
    expect(screen.getByText(HAVDALAH)).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: TEFILLIN })).toBeChecked();
    expect(screen.getByRole('switch', { name: HAVDALAH })).not.toBeChecked();
  });

  it('draws one section per group in order, and no My mitzvot section without a custom mitzvah', () => {
    renderWithTheme(<MitzvotScreen />);
    expect(sectionTitles()).toEqual(['תפילות', 'מצוות יומיות', 'מצוות שבועיות', 'מצוות עונתיות', 'עוד']);
    expect(screen.queryByTestId('library-group-mine')).toBeNull();
  });

  it('adds My mitzvot as the last section once a custom mitzvah exists', () => {
    addCustom(CUSTOM_ID, CUSTOM_NAME, 1800000000000);
    renderWithTheme(<MitzvotScreen />);
    expect(sectionTitles()).toEqual(['תפילות', 'מצוות יומיות', 'מצוות שבועיות', 'מצוות עונתיות', 'עוד', 'המצוות שלי']);
  });

  it('titles the sections in English', () => {
    useUserStore.setState({ language: 'en' });
    addCustom(CUSTOM_ID, CUSTOM_NAME, 1800000000000);
    renderWithTheme(<MitzvotScreen />);
    expect(sectionTitles()).toEqual([
      'Prayers',
      'Daily mitzvot',
      'Weekly mitzvot',
      'Seasonal mitzvot',
      'More',
      'My mitzvot',
    ]);
  });

  it('lists each mitzvah under its group in registry order, and the hilulot and Rosh Chodesh rows last under More', () => {
    renderWithTheme(<MitzvotScreen />);
    expect(groupSwitches('prayers')).toEqual(names(['shacharit', 'mincha', 'maariv']));
    expect(groupSwitches('daily')).toEqual(
      names(['tefillin', 'krias_shma_shacharit', 'birchot_hashachar', 'krias_shma_al_hamita']),
    );
    expect(groupSwitches('weekly')).toEqual(names(['candle_lighting', 'havdalah']));
    expect(groupSwitches('seasonal')).toEqual(names(['sefirat_haomer', 'chanukah_candles', 'selichot', 'ushpizin']));
    expect(groupSwitches('other')).toEqual([...names(['kiddush_levana', 'chok_leyisrael']), HILULOT, ROSH_CHODESH]);
  });

  it('lists every registry mitzvah once across the sections', () => {
    renderWithTheme(<MitzvotScreen />);
    expect([...switchLabels()].sort()).toEqual(
      [...MITZVOT.map((mitzvah) => mitzvah.name.he), HILULOT, ROSH_CHODESH].sort(),
    );
  });

  it('leaves Ushpizin out of the library for Chabad', () => {
    useUserStore.setState({ nusach: 'chabad' });
    renderWithTheme(<MitzvotScreen />);
    expect(groupSwitches('seasonal')).toEqual(names(['sefirat_haomer', 'chanukah_candles', 'selichot']));
    expect(switchLabels()).not.toContain('אושפיזין');
  });

  it('lists the custom mitzvot under My mitzvot in the order they were created, and opens the form from a row', () => {
    addCustom('custom_1800000000002_b', 'שיעור ערב', 1800000000002);
    addCustom('custom_1800000000001_a', 'שיעור בוקר', 1800000000001);
    renderWithTheme(<MitzvotScreen />);
    expect(groupSwitches('mine')).toEqual(['שיעור בוקר', 'שיעור ערב']);
    expect(switchLabels().filter((label) => label.startsWith('שיעור'))).toHaveLength(2);
    fireEvent.press(screen.getByText('שיעור בוקר'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/custom-mitzvah', params: { id: 'custom_1800000000001_a' } });
  });

  it('draws each section as one divided card holding all its rows', () => {
    renderWithTheme(<MitzvotScreen />);
    const cards = screen.UNSAFE_getAllByType(Card);
    expect(cards).toHaveLength(5);
    expect(cards.every((card) => card.props.divided === true)).toBe(true);
    const rowsInCards = cards.reduce((sum, card) => sum + within(card).UNSAFE_getAllByType(ListRow).length, 0);
    expect(rowsInCards).toBe(screen.UNSAFE_getAllByType(ListRow).length);
  });

  it('draws no category filter and no header add pill', () => {
    renderWithTheme(<MitzvotScreen />);
    expect(screen.UNSAFE_queryAllByType(ChipRow)).toEqual([]);
    expect(screen.UNSAFE_queryAllByType(HeaderPill)).toEqual([]);
  });

  it('floats the add button over the bottom inset with the soft card shadow', () => {
    renderWithTheme(<MitzvotScreen />);
    expect(StyleSheet.flatten(screen.getByTestId('library-add').props.style)).toMatchObject({
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      bottom: mockInsets.bottom + spacing.md,
    });
    expect(StyleSheet.flatten(screen.UNSAFE_getByType(Button).props.style)).toEqual(
      shadowStyle(THEMES[useUserStore.getState().theme].shadow, shadowPresets.cardSoft),
    );
  });

  it('pads the list by the measured button height and the inset, so the last row clears the button', () => {
    renderWithTheme(<MitzvotScreen />);
    expect(paddingBottom()).toBe(mockInsets.bottom + spacing.xl);
    fireEvent(screen.getByTestId('library-add'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 358, height: 56 } },
    });
    expect(paddingBottom()).toBe(56 + mockInsets.bottom + spacing.xl);
    expect(paddingBottom()).toBeGreaterThanOrEqual(56 + mockInsets.bottom);
  });

  it('offers the Chok LeYisrael download while the add-on is not installed, and its switch opens the screen', () => {
    renderWithTheme(<MitzvotScreen />);
    expect(screen.getByText(`תוסף להורדה · כ־${CHOK_SIZE_ESTIMATE_MB} MB`)).toBeOnTheScreen();
    const toggle = screen.getByRole('switch', { name: 'חק לישראל' });
    expect(toggle).not.toBeChecked();
    fireEvent(toggle, 'valueChange', true);
    expect(mockPush).toHaveBeenCalledWith('/mitzvah/chok_leyisrael');
    expect(useMitzvotStore.getState().activeMitzvot.chok_leyisrael.enabled).toBe(false);
  });

  it('lists Chok LeYisrael as a learning mitzvah once the add-on is installed, and its switch turns it on', () => {
    installChokFixture();
    renderWithTheme(<MitzvotScreen />);
    expect(screen.queryByText(/תוסף להורדה/)).toBeNull();
    expect(screen.getAllByText('לימוד')).toHaveLength(1);
    fireEvent(screen.getByRole('switch', { name: 'חק לישראל' }), 'valueChange', true);
    expect(useMitzvotStore.getState().activeMitzvot.chok_leyisrael.enabled).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('draws a disabled mitzvah with a muted icon and an enabled one with the accent icon', () => {
    renderWithTheme(<MitzvotScreen />);
    const tones = Object.fromEntries(
      screen.UNSAFE_getAllByType(IconTile).map((tile) => [tile.props.name, tile.props.tone]),
    );
    const enabledIcon = MITZVOT.find((mitzvah) => mitzvah.name.he === TEFILLIN)!.icon;
    const disabledIcon = MITZVOT.find((mitzvah) => mitzvah.name.he === HAVDALAH)!.icon;
    expect(tones[enabledIcon]).toBe('accent');
    expect(tones[disabledIcon]).toBe('muted');
  });

  it('opens the custom mitzvah form from the floating add button, drawn with the plus icon and named by its label', () => {
    renderWithTheme(<MitzvotScreen />);
    expect(screen.UNSAFE_getAllByType(Button)).toHaveLength(1);
    expect(screen.UNSAFE_getByType(Button).props).toMatchObject({ label: ADD, icon: 'plus' });
    expect(screen.UNSAFE_getAllByType(MitzvahIcon).filter((icon) => icon.props.name === 'plus')).toHaveLength(1);
    expect(screen.queryByText('+')).toBeNull();
    expect(within(screen.getByTestId('library-scroll')).queryByRole('button', { name: ADD })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: ADD }));
    expect(mockPush).toHaveBeenCalledWith('/custom-mitzvah');
  });

  it('draws no active / available segmented control', () => {
    renderWithTheme(<MitzvotScreen />);
    expect(screen.queryAllByRole('radio')).toEqual([]);
    expect(screen.queryByText('פעילות')).toBeNull();
    expect(screen.queryByText('זמינות')).toBeNull();
  });

  it('draws no active / available segmented control in English either', () => {
    useUserStore.setState({ language: 'en' });
    renderWithTheme(<MitzvotScreen />);
    expect(screen.queryAllByRole('radio')).toEqual([]);
    expect(screen.queryByText('Active')).toBeNull();
    expect(screen.queryByText('Available')).toBeNull();
  });

  it('keeps a row on screen and in place when its switch flips, and writes the mitzvot store', () => {
    renderWithTheme(<MitzvotScreen />);
    const before = switchLabels();

    fireEvent(screen.getByRole('switch', { name: HAVDALAH }), 'valueChange', true);
    expect(useMitzvotStore.getState().activeMitzvot.havdalah.enabled).toBe(true);
    expect(screen.getByText(HAVDALAH)).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: HAVDALAH })).toBeChecked();
    expect(switchLabels()).toEqual(before);

    fireEvent(screen.getByRole('switch', { name: TEFILLIN }), 'valueChange', false);
    expect(useMitzvotStore.getState().activeMitzvot.tefillin.enabled).toBe(false);
    expect(screen.getByText(TEFILLIN)).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: TEFILLIN })).not.toBeChecked();
    expect(switchLabels()).toEqual(before);
  });

  it('opens the mitzvah from its row', () => {
    renderWithTheme(<MitzvotScreen />);
    fireEvent.press(screen.getByText(HAVDALAH));
    expect(mockPush).toHaveBeenCalledWith('/mitzvah/havdalah');
  });

  it('shows the hilulot and Rosh Chodesh rows with their switches off', () => {
    renderWithTheme(<MitzvotScreen />);
    expect(screen.getByRole('switch', { name: HILULOT })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: ROSH_CHODESH })).not.toBeChecked();
  });

  it('shows the hilulot and Rosh Chodesh rows with their switches on', () => {
    useUserStore.setState({ hilulotEnabled: true, roshChodeshEnabled: true });
    renderWithTheme(<MitzvotScreen />);
    expect(screen.getByRole('switch', { name: HILULOT })).toBeChecked();
    expect(screen.getByRole('switch', { name: ROSH_CHODESH })).toBeChecked();
  });

  it('writes the user store from the setting rows and keeps them listed', () => {
    renderWithTheme(<MitzvotScreen />);
    fireEvent(screen.getByRole('switch', { name: HILULOT }), 'valueChange', true);
    fireEvent(screen.getByRole('switch', { name: ROSH_CHODESH }), 'valueChange', true);
    expect(useUserStore.getState().hilulotEnabled).toBe(true);
    expect(useUserStore.getState().roshChodeshEnabled).toBe(true);
    expect(screen.getByText(HILULOT)).toBeOnTheScreen();
    expect(screen.getByText(ROSH_CHODESH)).toBeOnTheScreen();
  });

  it('opens the hilulot and Rosh Chodesh screens from their rows', () => {
    renderWithTheme(<MitzvotScreen />);
    fireEvent.press(screen.getByText(HILULOT));
    expect(mockPush).toHaveBeenLastCalledWith('/hilulot');
    fireEvent.press(screen.getByText(ROSH_CHODESH));
    expect(mockPush).toHaveBeenLastCalledWith('/rosh-chodesh');
  });

  it("captions a men's mitzvah for a woman, and she can still switch it on", () => {
    useUserStore.setState({ gender: 'female' });
    useMitzvotStore.getState().setEnabled('tefillin', false);
    renderWithTheme(<MitzvotScreen />);

    expect(caption(TEFILLIN)).toBe('לא נהוג אצל נשים');
    expect(screen.getAllByText('לא נהוג אצל נשים')).toHaveLength(MENS_MITZVOT.filter((id) => findMitzvah(id)).length);
    expect(caption(names(['shacharit'])[0])).toBe('בוקר');

    fireEvent(screen.getByRole('switch', { name: TEFILLIN }), 'valueChange', true);
    expect(useMitzvotStore.getState().activeMitzvot.tefillin.enabled).toBe(true);
  });

  it.each(['male', null] as const)('keeps the time caption on tefillin for %s', (gender) => {
    useUserStore.setState({ gender });
    renderWithTheme(<MitzvotScreen />);

    expect(caption(TEFILLIN)).toBe('בוקר');
    expect(screen.queryByText('לא נהוג אצל נשים')).toBeNull();
  });

  it("captions a men's mitzvah in English", () => {
    useUserStore.setState({ language: 'en', gender: 'female' });
    renderWithTheme(<MitzvotScreen />);

    expect(caption(findMitzvah('tefillin')!.name.en!)).toBe('Not customary for women');
  });

  describe('an ended custom mitzvah', () => {
    afterEach(() => {
      cleanup();
      useCustomMitzvotStore.getState().reset();
    });

    it.each([
      ['range', ENDED_RANGE],
      ['streak', ENDED_STREAK],
    ])('shows the end date of a %s and an off switch, even while the store still holds it on', (_mode, schedules) => {
      addCustom(CUSTOM_ID, CUSTOM_NAME, 1800000000000, schedules);
      useMitzvotStore.getState().setEnabled(CUSTOM_ID, true);
      expect(useMitzvotStore.getState().activeMitzvot[CUSTOM_ID].enabled).toBe(true);
      renderWithTheme(<MitzvotScreen />);

      expect(caption(CUSTOM_NAME)).toBe('הסתיימה ב־10 ינואר 2020');
      expect(screen.getByRole('switch', { name: CUSTOM_NAME })).not.toBeChecked();
    });

    it('words the end date in English', () => {
      useUserStore.setState({ language: 'en' });
      addCustom(CUSTOM_ID, CUSTOM_NAME, 1800000000000, ENDED_RANGE);
      renderWithTheme(<MitzvotScreen />);

      expect(caption(CUSTOM_NAME)).toBe('Ended on Jan 10, 2020');
    });

    it('opens its edit form from the switch and stays off, with no dialog', () => {
      addCustom(CUSTOM_ID, CUSTOM_NAME, 1800000000000, ENDED_RANGE);
      renderWithTheme(<MitzvotScreen />);

      fireEvent(screen.getByRole('switch', { name: CUSTOM_NAME }), 'valueChange', true);

      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/custom-mitzvah', params: { id: CUSTOM_ID } });
      expect(useMitzvotStore.getState().activeMitzvot[CUSTOM_ID]?.enabled ?? false).toBe(false);
      expect(screen.queryByText(NEEDS_REMINDER_TITLE)).toBeNull();
      expect(screen.getByRole('switch', { name: CUSTOM_NAME })).not.toBeChecked();
    });

    it('leaves a running custom mitzvah as it was: its category caption, and a switch that turns it on', () => {
      addCustom(CUSTOM_ID, CUSTOM_NAME, 1800000000000, RUNNING_RANGE);
      addCustom('custom_1800000000001_a', 'שיעור בוקר', 1800000000001);
      renderWithTheme(<MitzvotScreen />);

      expect(caption(CUSTOM_NAME)).toBe('בוקר');
      expect(caption('שיעור בוקר')).toBe('בוקר');
      expect(screen.queryByText(/הסתיימה/)).toBeNull();

      fireEvent(screen.getByRole('switch', { name: CUSTOM_NAME }), 'valueChange', true);

      expect(useMitzvotStore.getState().activeMitzvot[CUSTOM_ID].enabled).toBe(true);
      expect(screen.getByRole('switch', { name: CUSTOM_NAME })).toBeChecked();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('at least one reminder', () => {
    beforeEach(() => {
      useCustomMitzvotStore.getState().reset();
    });

    afterEach(() => {
      cleanup();
      useCustomMitzvotStore.getState().reset();
    });

    it('switching on a mitzvah whose reminders were emptied opens the dialog, and Cancel leaves it off', () => {
      useMitzvotStore.getState().setReminders('havdalah', []);
      renderWithTheme(<MitzvotScreen />);

      fireEvent(screen.getByRole('switch', { name: HAVDALAH }), 'valueChange', true);

      expect(screen.getByText(NEEDS_REMINDER_TITLE)).toBeOnTheScreen();
      expect(screen.getByText(NEEDS_REMINDER_BODY)).toBeOnTheScreen();
      expect(useMitzvotStore.getState().activeMitzvot.havdalah.enabled).toBe(false);
      expect(screen.getByRole('switch', { name: HAVDALAH })).not.toBeChecked();

      fireEvent.press(screen.getByRole('button', { name: 'ביטול' }));

      expect(screen.queryByText(NEEDS_REMINDER_TITLE)).toBeNull();
      expect(useMitzvotStore.getState().activeMitzvot.havdalah.enabled).toBe(false);
      expect(screen.getByRole('switch', { name: HAVDALAH })).not.toBeChecked();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('Settings on the dialog opens the mitzvah screen and leaves it off', () => {
      useMitzvotStore.getState().setReminders('havdalah', []);
      renderWithTheme(<MitzvotScreen />);

      fireEvent(screen.getByRole('switch', { name: HAVDALAH }), 'valueChange', true);
      fireEvent.press(screen.getByRole('button', { name: 'הגדרה' }));

      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/mitzvah/havdalah');
      expect(screen.queryByText(NEEDS_REMINDER_TITLE)).toBeNull();
      expect(useMitzvotStore.getState().activeMitzvot.havdalah.enabled).toBe(false);
    });

    it.each([
      ['birchot_hashachar', 'daily'],
      ['sefirat_haomer', 'seasonal'],
    ])('switching on %s in the %s section with no reminders opens the dialog and leaves it off', (id) => {
      useMitzvotStore.getState().setReminders(id, []);
      renderWithTheme(<MitzvotScreen />);

      fireEvent(screen.getByRole('switch', { name: findMitzvah(id)!.name.he }), 'valueChange', true);

      expect(screen.getByText(NEEDS_REMINDER_TITLE)).toBeOnTheScreen();
      expect(useMitzvotStore.getState().activeMitzvot[id].enabled).toBe(false);
    });

    it('a custom mitzvah with no reminders asks and Settings opens its mitzvah screen', () => {
      useCustomMitzvotStore.getState().add({
        id: CUSTOM_ID,
        name: CUSTOM_NAME,
        startHHMM: '08:00',
        endHHMM: '09:00',
        reminders: [],
        skipOn: [],
        createdAt: 1800000000000,
      });
      renderWithTheme(<MitzvotScreen />);

      fireEvent(screen.getByRole('switch', { name: CUSTOM_NAME }), 'valueChange', true);
      expect(screen.getByText(NEEDS_REMINDER_TITLE)).toBeOnTheScreen();
      expect(useMitzvotStore.getState().activeMitzvot[CUSTOM_ID]).toBeUndefined();

      fireEvent.press(screen.getByRole('button', { name: 'הגדרה' }));
      expect(mockPush).toHaveBeenCalledWith(`/mitzvah/${CUSTOM_ID}`);
      expect(useMitzvotStore.getState().activeMitzvot[CUSTOM_ID]).toBeUndefined();
    });

    it('a mitzvah with reminders switches on with no dialog', () => {
      renderWithTheme(<MitzvotScreen />);

      fireEvent(screen.getByRole('switch', { name: HAVDALAH }), 'valueChange', true);

      expect(useMitzvotStore.getState().activeMitzvot.havdalah.enabled).toBe(true);
      expect(screen.queryByText(NEEDS_REMINDER_TITLE)).toBeNull();
    });

    it.each<[string, string, 'hilulaNotices' | 'roshChodeshNotices', 'hilulotEnabled' | 'roshChodeshEnabled', string]>([
      ['hilulot', HILULOT, 'hilulaNotices', 'hilulotEnabled', '/hilulot'],
      ['Rosh Chodesh', ROSH_CHODESH, 'roshChodeshNotices', 'roshChodeshEnabled', '/rosh-chodesh'],
    ])(
      'switching on %s with every notice kind off asks, stays off, and Settings opens its screen',
      (_name, label, noticesKey, enabledKey, route) => {
        const notices = useUserStore.getState()[noticesKey];
        useUserStore.setState({
          [noticesKey]: Object.fromEntries(
            Object.entries(notices).map(([kind, setting]) => [kind, { ...setting, enabled: false }]),
          ),
        });
        renderWithTheme(<MitzvotScreen />);

        fireEvent(screen.getByRole('switch', { name: label }), 'valueChange', true);

        expect(screen.getByText(NEEDS_REMINDER_TITLE)).toBeOnTheScreen();
        expect(screen.getByText(NEEDS_NOTICES_BODY)).toBeOnTheScreen();
        expect(useUserStore.getState()[enabledKey]).toBe(false);
        expect(screen.getByRole('switch', { name: label })).not.toBeChecked();
        expect(mockPush).not.toHaveBeenCalled();

        fireEvent.press(screen.getByRole('button', { name: 'הגדרה' }));

        expect(mockPush).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith(route);
        expect(useUserStore.getState()[enabledKey]).toBe(false);
      },
    );

    it('switching off a notice topic never asks', () => {
      useUserStore.setState({ hilulotEnabled: true });
      renderWithTheme(<MitzvotScreen />);

      fireEvent(screen.getByRole('switch', { name: HILULOT }), 'valueChange', false);

      expect(screen.queryByText(NEEDS_REMINDER_TITLE)).toBeNull();
      expect(useUserStore.getState().hilulotEnabled).toBe(false);
    });
  });
});
