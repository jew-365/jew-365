const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({ push: mockPush, replace: jest.fn() }),
    useFocusEffect: (effect: () => void) => React.useEffect(effect, [effect]),
  };
});
jest.mock('@/services/NotificationScheduler', () => ({
  NotificationScheduler: { rebuild: jest.fn(async () => {}), cancelAll: jest.fn(async () => {}) },
  requestNotificationPermissions: jest.fn(async () => true),
  syncNotificationPermissionStatus: jest.fn(async () => true),
}));

import { act, fireEvent, screen, within } from '@testing-library/react-native';
import SettingsScreen from '../(tabs)/settings';
import { appVersionLabel } from '@/services/appUpdates';
import { translate } from '@/i18n';
import { CITIES } from '@/data/cities';
import { installChokFixture } from '@/testing/chok';
import { renderWithTheme } from '@/testing/render';
import { installSelichotFixture } from '@/testing/selichot';
import { at } from '@/testing/zmanim';
import { useChokStore } from '@/stores/useChokStore';
import { useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { useUserStore } from '@/stores/useUserStore';
import type { CustomMitzvah } from '@/types/mitzvah';

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

const pinDate = (wallClock: string) => jest.useFakeTimers({ now: at(CITIES[0], wallClock), doNotFake: [...ONLY_DATE] });

const he = (key: string, options?: Record<string, unknown>) => translate(key, options, 'he', null);

async function renderSettings() {
  renderWithTheme(<SettingsScreen />);
  await act(async () => {});
}

const openSection = (key: string) => fireEvent.press(screen.getByText(he(key)));

const search = async (text: string) => {
  await act(async () => {
    fireEvent.changeText(screen.getByLabelText(he('settings.search')), text);
  });
};

describe('Settings layout', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ isOnboarded: true, gender: 'male', maritalStatus: 'single' });
    mockPush.mockClear();
  });

  it('says under each section title what it holds', async () => {
    await renderSettings();
    for (const key of [
      'settings.profileSummary',
      'settings.prayerSummary',
      'settings.deviceSummary',
      'settings.backupSummary',
      'settings.contactSummary',
    ]) {
      expect(screen.getByText(he(key))).toBeOnTheScreen();
    }
  });

  it('names family purity in the summaries of a married user', async () => {
    useUserStore.setState({ maritalStatus: 'married' });
    await renderSettings();
    expect(screen.getByText(he('settings.profileSummaryTaharah'))).toBeOnTheScreen();
    expect(screen.getByText(he('settings.deviceSummaryTaharah'))).toBeOnTheScreen();
  });

  it('keeps the Shema opinion under the nusach in Prayer, not in Device', async () => {
    await renderSettings();
    openSection('settings.device');
    expect(screen.queryByText(he('settings.opinion'))).toBeNull();
    openSection('settings.device');

    openSection('settings.prayer');
    const prayer = screen.getByTestId('settings-anchor-opinion');
    expect(within(prayer).getByText(he('settings.opinion.GRA'))).toBeOnTheScreen();
    fireEvent.press(within(prayer).getByText(he('settings.opinion.MA')));
    expect(useUserStore.getState().halachicOpinions.ksSofZman).toBe('MA');
  });

  it('puts the Chok LeYisrael commentary switch in Prayer, bound to the field the reader writes', async () => {
    await renderSettings();
    openSection('settings.prayer');
    const block = screen.getByTestId('settings-anchor-chokCommentary');
    const toggle = () => within(block).getByLabelText(he('settings.chokCommentaryOpen'));
    expect(toggle().props.value).toBe(false);
    fireEvent(toggle(), 'valueChange', true);
    expect(useUserStore.getState().chokCommentaryOpen).toBe(true);
    act(() => useUserStore.getState().setChokCommentaryOpen(false));
    expect(toggle().props.value).toBe(false);
  });

  it('offers the ליל שישי day in Prayer, bound to the field the reader writes', async () => {
    await renderSettings();
    openSection('settings.prayer');
    const block = screen.getByTestId('settings-anchor-chokThuNightDay');
    const chip = (key: string) => within(block).getByRole('button', { name: he(key) });

    expect(within(block).getByText(he('settings.chokThuNightDay'))).toBeOnTheScreen();
    expect(chip('chok.thuNight.thu')).not.toBeSelected();
    expect(chip('chok.thuNight.fri')).not.toBeSelected();

    fireEvent.press(chip('chok.thuNight.fri'));
    expect(useUserStore.getState().chokThuNightDay).toBe('fri');
    expect(chip('chok.thuNight.fri')).toBeSelected();

    fireEvent.press(chip('chok.thuNight.thu'));
    expect(useUserStore.getState().chokThuNightDay).toBe('thu');
    expect(chip('chok.thuNight.thu')).toBeSelected();
  });

  it('offers the siddur voice in Prayer, bound to the field a change of gender sets', async () => {
    await renderSettings();
    openSection('settings.prayer');
    openSection('settings.profile');
    const voice = screen.getByTestId('settings-anchor-siddurVoice');
    const gender = screen.getByTestId('settings-anchor-gender');
    const chip = (key: string) => within(voice).getByRole('button', { name: he(key) });

    expect(within(voice).getByText(he('settings.siddurVoice'))).toBeOnTheScreen();
    expect(chip('settings.siddurVoice.male')).not.toBeSelected();
    expect(chip('settings.siddurVoice.female')).not.toBeSelected();

    fireEvent.press(chip('settings.siddurVoice.male'));
    expect(useUserStore.getState().siddurVoice).toBe('male');
    expect(chip('settings.siddurVoice.male')).toBeSelected();

    fireEvent.press(within(gender).getByRole('button', { name: he('profile.gender.female') }));
    expect(useUserStore.getState().siddurVoice).toBe('female');
    expect(chip('settings.siddurVoice.female')).toBeSelected();
    expect(chip('settings.siddurVoice.male')).not.toBeSelected();
  });

  it('offers family purity in Profile and under the notifications of Device, one switch for both', async () => {
    useUserStore.setState({ maritalStatus: 'married' });
    await renderSettings();
    openSection('settings.profile');
    openSection('settings.device');

    const inProfile = screen.getByTestId('settings-anchor-taharah');
    const inDevice = screen.getByTestId('settings-anchor-taharahDevice');
    fireEvent(within(inDevice).getByLabelText(he('settings.taharahEnabled')), 'valueChange', true);
    expect(useUserStore.getState().taharahEnabled).toBe(true);
    expect(within(inProfile).getByLabelText(he('settings.taharahEnabled')).props.value).toBe(true);
    expect(within(inProfile).getByText(he('settings.taharahOpen'))).toBeOnTheScreen();
  });

  it('shows no family purity block to a single user', async () => {
    await renderSettings();
    openSection('settings.profile');
    openSection('settings.device');
    expect(screen.queryByText(he('settings.taharah'))).toBeNull();
  });
});

const CUSTOM: CustomMitzvah = {
  id: 'custom_1792000000000_abc123',
  name: 'לימוד משנה',
  startHHMM: '06:00',
  endHHMM: '22:00',
  reminders: [{ anchor: 'start', offsetMin: 0, label: 'לימוד' }],
  skipOn: [],
  createdAt: 1792000000000,
};

afterEach(() => {
  useSelichotStore.getState().reset();
});

describe('Settings search', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ isOnboarded: true, gender: 'male', maritalStatus: 'single' });
    useCustomMitzvotStore.getState().reset();
    useChokStore.getState().reset();
    mockPush.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('replaces the sections with the matches while a query is typed', async () => {
    await renderSettings();
    await search('התראות');

    expect(screen.queryByText(he('settings.profile'))).toBeNull();
    expect(screen.getByText(he('settings.notifications'))).toBeOnTheScreen();

    fireEvent.press(screen.getByLabelText(he('settings.searchClear')));
    expect(screen.getByText(he('settings.profile'))).toBeOnTheScreen();
  });

  it('opens the section of a match and highlights the setting', async () => {
    await renderSettings();
    await search('גרא');
    await act(async () => {
      fireEvent.press(screen.getByText(he('settings.opinion')));
    });

    expect(screen.getByLabelText(he('settings.search')).props.value).toBe('');
    const target = screen.getByTestId('settings-anchor-opinion');
    expect(within(target).getByText(he('settings.opinion.GRA'))).toBeOnTheScreen();
    expect(target.props.style).toBeTruthy();
  });

  it('opens Prayer at the commentary switch for "ברטנורה"', async () => {
    await renderSettings();
    await search('ברטנורה');
    await act(async () => {
      fireEvent.press(screen.getByText(he('settings.chokCommentaryOpen')));
    });
    const target = screen.getByTestId('settings-anchor-chokCommentary');
    expect(target.props.style).toBeTruthy();
    expect(within(target).getByLabelText(he('settings.chokCommentaryOpen'))).toBeOnTheScreen();
  });

  it('opens Prayer at the ליל שישי chips for "ליל שישי"', async () => {
    await renderSettings();
    await search('ליל שישי');
    await act(async () => {
      fireEvent.press(screen.getByText(he('settings.chokThuNightDay')));
    });
    const target = screen.getByTestId('settings-anchor-chokThuNightDay');
    expect(target.props.style).toBeTruthy();
    expect(within(target).getByRole('button', { name: he('chok.thuNight.fri') })).toBeOnTheScreen();
  });

  it('opens Prayer at the siddur voice for "לשון נקבה"', async () => {
    await renderSettings();
    await search('לשון נקבה');
    await act(async () => {
      fireEvent.press(screen.getByText(he('settings.siddurVoice')));
    });
    const target = screen.getByTestId('settings-anchor-siddurVoice');
    expect(target.props.style).toBeTruthy();
    expect(within(target).getByRole('button', { name: he('settings.siddurVoice.female') })).toBeOnTheScreen();
  });

  it('opens the backup, restore and reset section for איפוס and highlights the reset', async () => {
    await renderSettings();
    await search('איפוס');
    await act(async () => {
      fireEvent.press(screen.getByText(he('settings.logout')));
    });

    const target = screen.getByTestId('settings-anchor-reset');
    expect(target.props.style).toBeTruthy();
    expect(within(target).getByRole('button', { name: he('settings.logout') })).toBeOnTheScreen();
    expect(within(target).getByRole('link', { name: he('settings.deleteData') })).toBeOnTheScreen();
    expect(screen.getByText(he('settings.backupExport'))).toBeOnTheScreen();
    expect(screen.queryByText(he('settings.zmanim'))).toBeNull();
  });

  it('opens the contact section for גרסה and highlights the version', async () => {
    await renderSettings();
    await search('גרסה');
    await act(async () => {
      fireEvent.press(screen.getByText(he('settings.searchVersion')));
    });

    const target = screen.getByTestId('settings-anchor-version');
    expect(target.props.style).toBeTruthy();
    expect(within(target).getByText(he('settings.version', { version: appVersionLabel() }))).toBeOnTheScreen();
    expect(screen.getByText(he('settings.contactHint'))).toBeOnTheScreen();
  });

  it('opens about and contact for אודות and shows its links', async () => {
    await renderSettings();
    await search('אודות');
    await act(async () => {
      fireEvent.press(screen.getAllByText(he('settings.contact'))[0]);
    });

    expect(screen.getByLabelText(he('settings.search')).props.value).toBe('');
    expect(screen.getByTestId('settings-anchor-contact').props.style).toBeTruthy();
    expect(screen.getByText(he('settings.linkSupport'))).toBeOnTheScreen();
  });

  it('opens about and contact for קישורים and lands on the links card', async () => {
    await renderSettings();
    await search('קישורים');
    await act(async () => {
      fireEvent.press(screen.getByText(he('settings.links')));
    });

    expect(screen.getByLabelText(he('settings.search')).props.value).toBe('');
    const target = screen.getByTestId('settings-anchor-links');
    expect(target.props.style).toBeTruthy();
    expect(within(target).getByText(he('settings.linkSupport'))).toBeOnTheScreen();
    expect(screen.getByTestId('settings-anchor-contact').props.style).toBeUndefined();
  });

  it('opens the first match on submit', async () => {
    await renderSettings();
    await search('צבע');
    await act(async () => {
      fireEvent(screen.getByLabelText(he('settings.search')), 'submitEditing');
    });
    expect(screen.getByTestId('settings-anchor-theme').props.style).toBeTruthy();
  });

  it('pushes the screen of a match that lives outside Settings', async () => {
    await renderSettings();
    await search('הילולות');
    fireEvent.press(screen.getByText(he('hilulot.title')));
    expect(mockPush).toHaveBeenCalledWith('/hilulot');
  });

  it('takes מדריך to the user guide', async () => {
    await renderSettings();
    await search('מדריך');
    fireEvent.press(screen.getByText(he('guide.title')));
    expect(mockPush).toHaveBeenCalledWith('/guide');
  });

  it('takes "add a mitzvah" to the new custom mitzvah screen', async () => {
    await renderSettings();
    await search('הוספת מצווה');
    fireEvent.press(screen.getByText(he('settings.searchAddMitzvah')));
    expect(mockPush).toHaveBeenCalledWith('/custom-mitzvah');
  });

  it('forgives a typo and a word typed in the other keyboard layout', async () => {
    await renderSettings();
    await search('התרעות');
    expect(screen.getByText(he('settings.notifications'))).toBeOnTheScreen();
    await search('v,rtu,');
    expect(screen.getByText(he('settings.notifications'))).toBeOnTheScreen();
  });

  it('says so when nothing matches', async () => {
    await renderSettings();
    await search('קקקקקק');
    expect(screen.getByText(he('settings.searchEmpty', { query: 'קקקקקק' }))).toBeOnTheScreen();
    expect(screen.getByText(he('settings.searchEmptyHint'))).toBeOnTheScreen();
  });

  it('keeps a profile draft typed before searching', async () => {
    await renderSettings();
    openSection('settings.profile');
    fireEvent.changeText(screen.getByPlaceholderText(he('settings.profileNamePlaceholder')), 'Avraham');
    await search('נוסח');
    expect(useUserStore.getState().profileName).toBe('Avraham');
  });

  it('never offers family purity to a single user', async () => {
    await renderSettings();
    await search('טהרה');
    expect(screen.queryByText(he('settings.taharah'))).toBeNull();
  });

  it('opens a mitzvah found by its name', async () => {
    await renderSettings();
    await search('ערבית');
    fireEvent.press(screen.getByText(he('settings.search.kind.mitzvah')));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/mitzvah/[id]', params: { id: 'maariv' } });
    expect(screen.getByLabelText(he('settings.search')).props.value).toBe('');
  });

  it("opens a prayer's text", async () => {
    await renderSettings();
    await search('ערבית');
    fireEvent.press(screen.getByText(he('settings.search.kind.siddur')));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/siddur/[id]', params: { id: 'maariv' } });
  });

  it('opens a chapter at its section', async () => {
    await renderSettings();
    await search('אשרי');
    fireEvent.press(screen.getByText(he('settings.search.kind.chapter', { text: 'תפילת שחרית' })));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/siddur/[id]',
      params: { id: 'shacharit', section: 'אשרי ובא לציון' },
    });
  });

  it('finds a custom mitzvah added while Settings is open', async () => {
    await renderSettings();
    act(() => useCustomMitzvotStore.getState().add(CUSTOM));
    await search('לימוד משנה');
    fireEvent.press(screen.getByText('לימוד משנה'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/mitzvah/[id]', params: { id: CUSTOM.id } });
  });

  it('lists Chok LeYisrael as a text only once it is installed', async () => {
    await renderSettings();
    await search('חק לישראל');
    expect(screen.queryByText(he('settings.search.kind.siddur'))).toBeNull();
    expect(screen.getByText(he('settings.search.kind.mitzvah'))).toBeOnTheScreen();

    act(() => {
      installChokFixture();
    });
    fireEvent.press(screen.getByText(he('settings.search.kind.siddur')));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/siddur/[id]', params: { id: 'chok_leyisrael' } });
  });

  it('lists Selichot off season as the siddur tab does: with its availability caption, and no way in', async () => {
    installSelichotFixture();
    pinDate('2026-10-28T07:00');
    await renderSettings();
    await search('סליחות');
    expect(screen.queryByText(he('settings.search.kind.siddur'))).toBeNull();
    const caption = screen.getByText('ממוצאי שבת הסליחות עד ערב יום הכיפורים');
    expect(screen.getAllByText('סליחות')).toHaveLength(2);
    expect(screen.getByText(he('settings.search.kind.mitzvah'))).toBeOnTheScreen();
    fireEvent.press(caption);
    expect(mockPush).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent(screen.getByLabelText(he('settings.search')), 'submitEditing');
    });
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/mitzvah/[id]', params: { id: 'selichot' } });
  });

  it('opens the first open match on submit when a closed chapter ranks before it', async () => {
    installSelichotFixture();
    pinDate('2026-10-28T07:00');
    await renderSettings();
    await search('ירושלים');
    expect(screen.getByText(/ממוצאי שבת הסליחות עד ערב יום הכיפורים/)).toBeOnTheScreen();
    await act(async () => {
      fireEvent(screen.getByLabelText(he('settings.search')), 'submitEditing');
    });
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByLabelText(he('settings.search')).props.value).toBe('');
    expect(screen.getByTestId('settings-anchor-location').props.style).toBeTruthy();
  });

  it('lists Kiddush Levana off season under its availability caption', async () => {
    pinDate('2026-10-28T07:00');
    await renderSettings();
    await search('קידוש לבנה');
    expect(screen.getAllByText('קידוש לבנה')).toHaveLength(2);
    expect(screen.getByText('משלושה ימים אחרי המולד עד חצי החודש')).toBeOnTheScreen();
  });

  it('finds only the Selichot mitzvah while the nusach file is missing, and opens the screen that offers the download', async () => {
    pinDate('2026-09-08T12:00');
    await renderSettings();
    await search('סליחות');
    expect(screen.queryByText(he('settings.search.kind.siddur'))).toBeNull();
    expect(screen.queryByText(he('settings.search.kind.chapter'))).toBeNull();
    expect(screen.getAllByText('סליחות')).toHaveLength(1);
    fireEvent.press(screen.getByText('סליחות'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/mitzvah/[id]', params: { id: 'selichot' } });
  });

  it('captions a closed text in English', async () => {
    installSelichotFixture();
    pinDate('2026-10-28T07:00');
    useUserStore.setState({ language: 'en' });
    await renderSettings();
    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Search settings'), 'Selichot');
    });
    expect(screen.getByText('From Leil Selichot to Erev Yom Kippur')).toBeOnTheScreen();
  });

  it('opens Selichot from the search in its season', async () => {
    installSelichotFixture();
    pinDate('2026-09-08T12:00');
    await renderSettings();
    await search('סליחות');
    fireEvent.press(screen.getByText(he('settings.search.kind.siddur')));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/siddur/[id]', params: { id: 'selichot' } });
  });

  it('captions the matches in English', async () => {
    useUserStore.setState({ language: 'en' });
    await renderSettings();
    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Search settings'), 'Maariv');
    });
    expect(screen.getByText('Mitzvah')).toBeOnTheScreen();
    expect(screen.getByText('Siddur')).toBeOnTheScreen();
  });
});
