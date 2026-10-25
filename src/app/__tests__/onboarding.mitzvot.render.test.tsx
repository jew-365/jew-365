const mockPush = jest.fn();
const mockBack = jest.fn();
const mockParams: Record<string, string | undefined> = {};

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
}));

import { act, fireEvent, screen, within } from '@testing-library/react-native';
import OnboardingMitzvotScreen from '../onboarding/mitzvot';
import { Button } from '@/components/Button';
import { ListRow } from '@/components/ListRow';
import { SectionLabel } from '@/components/SectionLabel';
import { CHOK_TEXT_ID } from '@/data/chok';
import { MITZVOT, findMitzvah } from '@/data/mitzvot';
import { translate } from '@/i18n';
import { CHOK_SIZE_ESTIMATE_MB } from '@/services/ChokContentService';
import { MENS_MITZVOT, chooseGender } from '@/stores/taharahOptIn';
import { useChokStore } from '@/stores/useChokStore';
import { useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { installChokFixture } from '@/testing/chok';
import { renderWithTheme } from '@/testing/render';
import type { Nusach } from '@/types/mitzvah';

const he = (key: string) => translate(key, undefined, 'he', null);

const TEFILLIN = 'הנחת תפילין';
const HAVDALAH = 'הבדלה';
const HILULOT = 'הילולות צדיקים';
const ROSH_CHODESH = 'ראש חודש';
const CHOK = 'חק לישראל';
const NEEDS_REMINDER_TITLE = 'אין התראות';
const NOT_FOR_WOMEN = 'לא נהוג אצל נשים';
const CUSTOM_ID = 'custom_1800000000000_abc';
const CUSTOM_NAME = 'שיעור קבוע';

const switchLabels = () => screen.getAllByRole('switch').map((node) => node.props.accessibilityLabel);
const sectionTitles = () => screen.UNSAFE_getAllByType(SectionLabel).map((node) => node.props.text);
const groupSwitches = (group: string) =>
  within(screen.getByTestId(`library-group-${group}`))
    .getAllByRole('switch')
    .map((node) => node.props.accessibilityLabel);
const names = (ids: string[]) => ids.map((id) => findMitzvah(id)!.name.he);
const addCustom = (id: string, name: string, createdAt: number) =>
  useCustomMitzvotStore.getState().add({
    id,
    name,
    startHHMM: '08:00',
    endHHMM: '09:00',
    reminders: [{ anchor: 'start', offsetMin: 0, label: name }],
    skipOn: [],
    createdAt,
  });
const caption = (title: string) =>
  screen.UNSAFE_getAllByType(ListRow).find((row) => row.props.title === title)!.props.caption;
const continueButton = () => screen.getByRole('button', { name: he('common.continue') });

describe('Onboarding mitzvot step', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useMitzvotStore.getState().reset();
    useChokStore.getState().reset();
    useCustomMitzvotStore.getState().reset();
    useUserStore.setState({ language: 'he', nusach: 'ashkenaz' });
    mockPush.mockReset();
    mockBack.mockReset();
    for (const key of Object.keys(mockParams)) delete mockParams[key];
  });

  it('titles the step and its hint', () => {
    renderWithTheme(<OnboardingMitzvotScreen />);
    expect(screen.getByText('אילו מצוות לעקוב?')).toBeOnTheScreen();
    expect(screen.getByText('אפשר לשנות את זה בכל עת במסך המצוות')).toBeOnTheScreen();
  });

  it('titles the step, hint and sections in English', () => {
    useUserStore.setState({ language: 'en' });
    renderWithTheme(<OnboardingMitzvotScreen />);
    expect(screen.getByText('Which mitzvot to track?')).toBeOnTheScreen();
    expect(screen.getByText('You can change this any time in the mitzvot screen')).toBeOnTheScreen();
    expect(sectionTitles()).toEqual(['Prayers', 'Daily mitzvot', 'Weekly mitzvot', 'Seasonal mitzvot', 'More']);
  });

  it('lists the groups in order with no My mitzvot, even with a custom mitzvah stored', () => {
    addCustom(CUSTOM_ID, CUSTOM_NAME, 1800000000000);
    renderWithTheme(<OnboardingMitzvotScreen />);
    expect(sectionTitles()).toEqual(['תפילות', 'מצוות יומיות', 'מצוות שבועיות', 'מצוות עונתיות', 'עוד']);
    expect(screen.queryByTestId('library-group-mine')).toBeNull();
    expect(screen.queryByText(CUSTOM_NAME)).toBeNull();
  });

  it('lists each registry mitzvah of the nusach under its group, the setting rows last under More, and no Chok LeYisrael', () => {
    renderWithTheme(<OnboardingMitzvotScreen />);
    expect(groupSwitches('prayers')).toEqual(names(['shacharit', 'mincha', 'maariv']));
    expect(groupSwitches('daily')).toEqual(
      names(['tefillin', 'krias_shma_shacharit', 'birchot_hashachar', 'krias_shma_al_hamita']),
    );
    expect(groupSwitches('weekly')).toEqual(names(['candle_lighting', 'havdalah']));
    expect(groupSwitches('seasonal')).toEqual(expect.arrayContaining(names(['sefirat_haomer'])));
    expect(groupSwitches('other').slice(-2)).toEqual([HILULOT, ROSH_CHODESH]);
    expect([...switchLabels()].sort()).toEqual(
      [
        ...MITZVOT.filter(
          (mitzvah) => mitzvah.id !== CHOK_TEXT_ID && mitzvah.nuschaotSupported.includes('ashkenaz'),
        ).map((mitzvah) => mitzvah.name.he),
        HILULOT,
        ROSH_CHODESH,
      ].sort(),
    );
  });

  it('a switch writes the mitzvot store and opens nothing', () => {
    renderWithTheme(<OnboardingMitzvotScreen />);

    fireEvent(screen.getByRole('switch', { name: HAVDALAH }), 'valueChange', true);
    expect(useMitzvotStore.getState().activeMitzvot.havdalah.enabled).toBe(true);
    expect(screen.getByRole('switch', { name: HAVDALAH })).toBeChecked();

    fireEvent(screen.getByRole('switch', { name: TEFILLIN }), 'valueChange', false);
    expect(useMitzvotStore.getState().activeMitzvot.tefillin.enabled).toBe(false);
    expect(screen.getByRole('switch', { name: TEFILLIN })).not.toBeChecked();

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('a setting row switch writes the user store', () => {
    renderWithTheme(<OnboardingMitzvotScreen />);
    fireEvent(screen.getByRole('switch', { name: HILULOT }), 'valueChange', true);
    fireEvent(screen.getByRole('switch', { name: ROSH_CHODESH }), 'valueChange', true);
    expect(useUserStore.getState().hilulotEnabled).toBe(true);
    expect(useUserStore.getState().roshChodeshEnabled).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows a woman the profile's defaults", () => {
    chooseGender('female');
    renderWithTheme(<OnboardingMitzvotScreen />);

    expect(screen.getByRole('switch', { name: TEFILLIN })).not.toBeChecked();
    expect(caption(TEFILLIN)).toBe(NOT_FOR_WOMEN);
    expect(screen.getAllByText(NOT_FOR_WOMEN)).toHaveLength(MENS_MITZVOT.filter((id) => findMitzvah(id)).length);

    fireEvent(screen.getByRole('switch', { name: TEFILLIN }), 'valueChange', true);
    expect(useMitzvotStore.getState().activeMitzvot.tefillin.enabled).toBe(true);
  });

  it('shows a man tefillin on with its time caption', () => {
    chooseGender('male');
    renderWithTheme(<OnboardingMitzvotScreen />);

    expect(screen.getByRole('switch', { name: TEFILLIN })).toBeChecked();
    expect(caption(TEFILLIN)).toBe('בוקר');
    expect(screen.queryByText(NOT_FOR_WOMEN)).toBeNull();
  });

  it('no row is a button and a row press opens nothing', () => {
    renderWithTheme(<OnboardingMitzvotScreen />);

    expect(screen.UNSAFE_getAllByType(ListRow).every((row) => row.props.onPress === undefined)).toBe(true);
    fireEvent.press(screen.getByText(HAVDALAH));
    fireEvent.press(screen.getByText(HILULOT));
    fireEvent.press(screen.getByText(ROSH_CHODESH));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('hides Chok LeYisrael while the add-on is missing, since its download is offered outside onboarding', () => {
    renderWithTheme(<OnboardingMitzvotScreen />);
    expect(screen.queryByText(CHOK)).toBeNull();
    expect(screen.queryByRole('switch', { name: CHOK })).toBeNull();
    expect(screen.queryByText(`תוסף להורדה · כ־${CHOK_SIZE_ESTIMATE_MB} MB`)).toBeNull();
  });

  it('lists Chok LeYisrael last under More and turns it on once the add-on is installed', () => {
    installChokFixture();
    renderWithTheme(<OnboardingMitzvotScreen />);
    expect(groupSwitches('other').slice(-3)).toEqual([CHOK, HILULOT, ROSH_CHODESH]);

    const toggle = screen.getByRole('switch', { name: CHOK });
    expect(toggle).not.toBeChecked();
    fireEvent(toggle, 'valueChange', true);
    expect(useMitzvotStore.getState().activeMitzvot.chok_leyisrael.enabled).toBe(true);
    expect(screen.getByRole('switch', { name: CHOK })).toBeChecked();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('lists only the mitzvot of the chosen nusach', () => {
    const fixtureName = 'מצווה לאשכנזים בלבד';
    const fixture = {
      ...findMitzvah('havdalah')!,
      id: 'ashkenaz_only_fixture',
      name: { he: fixtureName },
      nuschaotSupported: ['ashkenaz'] as Nusach[],
    };
    MITZVOT.push(fixture);
    try {
      renderWithTheme(<OnboardingMitzvotScreen />);
      expect(screen.getByRole('switch', { name: fixtureName })).toBeOnTheScreen();

      act(() => useUserStore.setState({ nusach: 'chabad' }));
      expect(screen.queryByRole('switch', { name: fixtureName })).toBeNull();
      expect(screen.getByRole('switch', { name: HAVDALAH })).toBeOnTheScreen();
    } finally {
      MITZVOT.splice(MITZVOT.indexOf(fixture), 1);
    }
  });

  it('the at-least-one-reminder dialog still asks, and its Settings only closes it', () => {
    useMitzvotStore.getState().setReminders('havdalah', []);
    renderWithTheme(<OnboardingMitzvotScreen />);

    fireEvent(screen.getByRole('switch', { name: HAVDALAH }), 'valueChange', true);
    expect(screen.getByText(NEEDS_REMINDER_TITLE)).toBeOnTheScreen();
    expect(useMitzvotStore.getState().activeMitzvot.havdalah.enabled).toBe(false);

    fireEvent.press(screen.getByRole('button', { name: 'הגדרה' }));
    expect(screen.queryByText(NEEDS_REMINDER_TITLE)).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
    expect(useMitzvotStore.getState().activeMitzvot.havdalah.enabled).toBe(false);
  });

  it('draws no add button', () => {
    renderWithTheme(<OnboardingMitzvotScreen />);
    expect(screen.queryByTestId('library-add')).toBeNull();
    expect(screen.queryByText('הוסף מצווה חדשה')).toBeNull();
    expect(screen.UNSAFE_getAllByType(Button).map((button) => button.props.label)).toEqual([he('common.continue')]);
  });

  it('Continue goes on to the location step', () => {
    renderWithTheme(<OnboardingMitzvotScreen />);
    fireEvent.press(continueButton());
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/onboarding/location');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('Continue returns to the ready step that opened it', () => {
    mockParams.from = 'ready';
    renderWithTheme(<OnboardingMitzvotScreen />);
    fireEvent.press(continueButton());
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('Back returns to the previous step', () => {
    renderWithTheme(<OnboardingMitzvotScreen />);
    fireEvent.press(screen.getByRole('button', { name: he('common.back') }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
