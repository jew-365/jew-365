const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

import { act, fireEvent, screen } from '@testing-library/react-native';
import OnboardingBundlesScreen from '../onboarding/bundles';
import { translate } from '@/i18n';
import { chooseGender, chooseNusach } from '@/stores/taharahOptIn';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';

const he = (key: string) => translate(key, undefined, 'he', null);
const on = (id: string) => useMitzvotStore.getState().activeMitzvot[id]?.enabled === true;
const user = () => useUserStore.getState();
const checked = (testID: string) => screen.getByTestId(testID).props.accessibilityState.checked;

async function open() {
  const view = renderWithTheme(<OnboardingBundlesScreen />);
  await act(async () => {});
  return view;
}

describe('the bundles step of the first setup', () => {
  beforeEach(() => {
    user().reset();
    useUserStore.setState({ language: 'he' });
    useMitzvotStore.getState().reset();
    mockPush.mockClear();
  });

  it('arrives with the recommended bundles ticked and switched on, for a user who only taps Continue', async () => {
    // A fresh install: candle lighting, havdalah, the Omer and the Rosh Chodesh notices start off.
    expect(on('candle_lighting')).toBe(false);
    expect(on('sefirat_haomer')).toBe(false);
    expect(user().roshChodeshEnabled).toBe(false);

    await open();

    for (const id of ['prayer', 'shabbat', 'calendar']) expect(checked(`bundle-${id}`)).toBe(true);
    for (const id of ['learning', 'birchot']) expect(checked(`bundle-${id}`)).toBe(false);
    // An unanswered gender gets candle lighting too.
    for (const id of ['candle_lighting', 'havdalah', 'sefirat_haomer', 'shacharit', 'mincha', 'maariv']) {
      expect(on(id)).toBe(true);
    }
    expect(user().roshChodeshEnabled).toBe(true);
    // Hilulot are a member the calendar bundle does not tick, and the unticked bundles stay off.
    expect(user().hilulotEnabled).toBe(false);
    expect(checked('bundle-member-hilulot')).toBe(false);
    expect(on('birchot_hashachar')).toBe(false);

    fireEvent.press(screen.getByRole('button', { name: he('common.continue') }));
    expect(mockPush).toHaveBeenCalledWith('/onboarding/permissions');
  });

  it('leaves candle lighting off for a man, with havdalah on, and says so', async () => {
    chooseGender('male');
    await open();
    expect(on('candle_lighting')).toBe(false);
    expect(on('havdalah')).toBe(true);
    expect(on('sefirat_haomer')).toBe(true);
    expect(screen.getByText(he('onboarding.bundles.candlesMale'))).toBeOnTheScreen();
  });

  it('ticks candle lighting for a woman and offers her neither tefillin nor Kiddush Levana', async () => {
    chooseGender('female');
    await open();
    expect(on('candle_lighting')).toBe(true);
    expect(screen.queryByTestId('bundle-member-tefillin')).toBeNull();
    expect(screen.queryByTestId('bundle-member-kiddushLevana')).toBeNull();
    expect(screen.queryByText(he('onboarding.bundles.candlesMale'))).toBeNull();
    expect(on('tefillin')).toBe(false);
  });

  it('offers no Ushpizin to a nusach that does not say it', async () => {
    chooseNusach('chabad');
    await open();
    expect(screen.queryByTestId('bundle-member-ushpizin')).toBeNull();
    expect(screen.getByTestId('bundle-member-omer')).toBeOnTheScreen();
  });

  it('removes one member of a ticked bundle and keeps the rest', async () => {
    await open();
    fireEvent.press(screen.getByTestId('bundle-member-omer'));
    expect(on('sefirat_haomer')).toBe(false);
    expect(on('havdalah')).toBe(true);
    expect(checked('bundle-member-omer')).toBe(false);
    expect(checked('bundle-shabbat')).toBe(true);

    fireEvent.press(screen.getByTestId('bundle-member-hilulot'));
    expect(user().hilulotEnabled).toBe(true);
  });

  it('switches a whole bundle off and on again with its tick', async () => {
    await open();
    fireEvent.press(screen.getByTestId('bundle-prayer'));
    for (const id of ['shacharit', 'mincha', 'maariv', 'krias_shma_shacharit', 'tefillin', 'krias_shma_al_hamita']) {
      expect(on(id)).toBe(false);
    }
    expect(checked('bundle-prayer')).toBe(false);
    expect(screen.queryByTestId('bundle-member-prayers')).toBeNull();

    fireEvent.press(screen.getByTestId('bundle-prayer'));
    expect(on('shacharit')).toBe(true);
    expect(on('tefillin')).toBe(true);

    fireEvent.press(screen.getByTestId('bundle-birchot'));
    expect(on('birchot_hashachar')).toBe(true);
  });

  it('offers the habit mitzvot as two bundles that arrive off, and a tick switches on only the recommended members', async () => {
    await open();
    for (const id of ['habits', 'chesed']) expect(checked(`bundle-${id}`)).toBe(false);
    const habits = [
      'tehillim_chapter',
      'two_mishnayot',
      'daily_tzedakah',
      'call_parents',
      'kids_story',
      'shabbat_prep',
    ];
    for (const id of habits) expect(on(id)).toBe(false);
    // The Shabbat bundle is ticked, yet getting ready for Shabbat is the user's to add.
    expect(checked('bundle-member-shabbat_prep')).toBe(false);

    fireEvent.press(screen.getByTestId('bundle-chesed'));
    for (const id of ['daily_tzedakah', 'call_parents', 'gratitude']) expect(on(id)).toBe(true);
    for (const id of ['kids_learning', 'kids_story', 'grandparents_call']) expect(on(id)).toBe(false);

    fireEvent.press(screen.getByTestId('bundle-member-kids_story'));
    expect(on('kids_story')).toBe(true);

    fireEvent.press(screen.getByTestId('bundle-habits'));
    expect(on('tehillim_chapter')).toBe(true);
    expect(on('torah_class')).toBe(false);

    fireEvent.press(screen.getByTestId('bundle-member-shabbat_prep'));
    expect(on('shabbat_prep')).toBe(true);
  });

  it('keeps what the user chose on a second visit, and starts again from the recommendation after a change of gender', async () => {
    const first = await open();
    fireEvent.press(screen.getByTestId('bundle-member-omer'));
    fireEvent.press(screen.getByTestId('bundle-calendar'));
    expect(user().roshChodeshEnabled).toBe(false);
    first.unmount();

    const second = await open();
    expect(on('sefirat_haomer')).toBe(false);
    expect(user().roshChodeshEnabled).toBe(false);
    second.unmount();

    chooseGender('male');
    await open();
    expect(on('sefirat_haomer')).toBe(true);
    expect(user().roshChodeshEnabled).toBe(true);
    expect(on('candle_lighting')).toBe(true); // switched on while the gender was unanswered; nothing is switched off
  });

  it('saves a learning program as wanted and switches nothing on, because it needs a download', async () => {
    await open();
    fireEvent.press(screen.getByTestId('bundle-member-chok'));
    fireEvent.press(screen.getByTestId('bundle-member-halacha'));
    expect(user().discovery.wants).toEqual(['chok', 'halacha']);
    expect(on('chok_leyisrael')).toBe(false);
    expect(checked('bundle-learning')).toBe(true);

    fireEvent.press(screen.getByTestId('bundle-member-chok'));
    expect(user().discovery.wants).toEqual(['halacha']);
    // The bundle's own tick clears what is left.
    fireEvent.press(screen.getByTestId('bundle-learning'));
    expect(user().discovery.wants).toEqual([]);
  });

  it('keeps the full list of mitzvot and the times one tap away', async () => {
    await open();
    fireEvent.press(screen.getByText(he('onboarding.bundles.detail')));
    expect(mockPush).toHaveBeenLastCalledWith('/onboarding/mitzvot');
    fireEvent.press(screen.getByText(he('onboarding.bundles.times')));
    expect(mockPush).toHaveBeenLastCalledWith('/onboarding/zmanim');
  });
});
