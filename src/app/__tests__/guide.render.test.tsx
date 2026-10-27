const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

import { fireEvent, screen, within } from '@testing-library/react-native';
import GuideScreen from '../guide';
import { MitzvahLibraryList } from '@/components/MitzvahLibraryList';
import { SettingsSection } from '@/components/SettingsSection';
import { GUIDE_TOPICS, latestWhatsNew, visibleGuideTopics, whatsNewHeading } from '@/data/guide';
import { LIBRARY_GROUPS } from '@/data/mitzvot';
import { SIDDUR_GROUPS, STANDALONE_TEXTS, standaloneTextsIn } from '@/data/siddur';
import { translate } from '@/i18n';
import { useChokStore } from '@/stores/useChokStore';
import { useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { THEME_NAMES } from '@/theme/colors';

const he = (key: string) => translate(key, undefined, 'he', null);
const topic = (id: string) => GUIDE_TOPICS.find((item) => item.id === id)!;
const open = (id: string, language: 'he' | 'en' = 'he') => fireEvent.press(screen.getByText(topic(id).title[language]));
const titles = () => screen.UNSAFE_getAllByType(SettingsSection).map((section) => section.props.title);
const listed = (testID: string) => String(screen.getByTestId(testID).props.children);

describe('User guide screen', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useMitzvotStore.getState().reset();
    useCustomMitzvotStore.getState().reset();
    useChokStore.getState().reset();
    mockPush.mockReset();
  });

  it("shows the latest what's-new entries with their headings", () => {
    renderWithTheme(<GuideScreen />);
    for (const entry of latestWhatsNew()) {
      expect(screen.getByText(whatsNewHeading(entry, 'he'))).toBeOnTheScreen();
      for (const item of entry.items) expect(screen.getByText(item.he)).toBeOnTheScreen();
    }
  });

  it('lists the topics closed, without family purity for a single user', () => {
    useUserStore.setState({ gender: 'male', maritalStatus: 'single' });
    renderWithTheme(<GuideScreen />);
    expect(titles()).toEqual(visibleGuideTopics(false).map((item) => item.title.he));
    expect(screen.queryByText(GUIDE_TOPICS[0].body[0].he)).toBeNull();
  });

  it('adds family purity for a married user who answered the gender question', () => {
    useUserStore.setState({ gender: 'female', maritalStatus: 'married' });
    renderWithTheme(<GuideScreen />);
    expect(titles()).toEqual(GUIDE_TOPICS.map((item) => item.title.he));
  });

  it('opens a topic on tap and its action opens its screen', () => {
    renderWithTheme(<GuideScreen />);
    open('library');
    for (const paragraph of topic('library').body) expect(screen.getByText(paragraph.he)).toBeOnTheScreen();
    fireEvent.press(screen.getByText('לפתיחת המצוות שלי'));
    expect(mockPush).toHaveBeenLastCalledWith('/mitzvot');

    open('tehillim');
    fireEvent.press(screen.getByText('לפתיחת תהילים'));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/siddur/[id]', params: { id: 'tehillim' } });
  });

  it('closes a topic again on a second tap', () => {
    renderWithTheme(<GuideScreen />);
    open('home');
    expect(screen.getByText(topic('home').body[0].he)).toBeOnTheScreen();
    open('home');
    expect(screen.queryByText(topic('home').body[0].he)).toBeNull();
  });

  it.each(['ashkenaz', 'chabad'] as const)('lists the mitzvot of each group as the library does in %s', (nusach) => {
    useUserStore.setState({ nusach });
    useCustomMitzvotStore.getState().add({
      id: 'custom_1800000000000_abc',
      name: 'שיעור קבוע',
      startHHMM: '08:00',
      endHHMM: '09:00',
      reminders: [{ anchor: 'start', offsetMin: 0, label: 'שיעור קבוע' }],
      skipOn: [],
      createdAt: 1800000000000,
    });
    const library = renderWithTheme(<MitzvahLibraryList showMine navigable />);
    const groups = LIBRARY_GROUPS.filter((group) => group !== 'mine');
    const inLibrary: Record<string, string[]> = {};
    for (const group of groups) {
      const section = screen.queryByTestId(`library-group-${group}`);
      if (!section) continue;
      const names = within(section)
        .getAllByRole('switch')
        .map((node) => node.props.accessibilityLabel as string)
        .filter((name) => name !== he('hilulot.title') && name !== he('roshChodesh.title'));
      if (names.length > 0) inLibrary[group] = names;
    }
    library.unmount();

    renderWithTheme(<GuideScreen />);
    open('library');
    const inGuide: Record<string, string[]> = {};
    for (const group of groups) {
      const node = screen.queryByTestId(`guide-list-mitzvot-${group}`);
      if (node) inGuide[group] = String(node.props.children).split(' · ');
    }
    expect(Object.keys(inLibrary).length).toBeGreaterThan(3);
    expect(inGuide).toEqual(inLibrary);
    expect(screen.queryByTestId('guide-list-mitzvot-mine')).toBeNull();
  });

  it('lists the siddur texts by group and the palettes', () => {
    renderWithTheme(<GuideScreen />);
    open('siddur');
    for (const group of SIDDUR_GROUPS) {
      expect(listed(`guide-list-texts-${group}`)).toBe(
        standaloneTextsIn(group)
          .map((id) => STANDALONE_TEXTS[id].name.he)
          .join(' · '),
      );
    }
    open('settings');
    expect(listed('guide-list-palettes-palettes')).toBe(
      THEME_NAMES.map((name) => he(`settings.theme.${name}`)).join(' · '),
    );
  });

  it('reads in English', () => {
    useUserStore.setState({ language: 'en' });
    renderWithTheme(<GuideScreen />);
    expect(screen.getByText('User guide')).toBeOnTheScreen();
    open('home', 'en');
    expect(screen.getByText(GUIDE_TOPICS[1].body[0].en)).toBeOnTheScreen();
  });
});
