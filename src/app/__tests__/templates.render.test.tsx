const mockPush = jest.fn();
let mockParams: { add?: string } = {};

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

jest.mock('react-native-safe-area-context', () => ({
  ...(jest.requireActual('react-native-safe-area-context') as object),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 34, left: 0 }),
}));

import { cleanup, fireEvent, screen } from '@testing-library/react-native';
import MitzvotScreen from '../mitzvot';
import { CITIES } from '@/data/cities';
import { CUSTOM_ICON_CHOICES } from '@/data/customIcons';
import { CUSTOM_TEMPLATES } from '@/data/customTemplates';
import { findAnyMitzvah } from '@/data/customMitzvotAdapter';
import { translate } from '@/i18n';
import { useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';
import { appliesOn } from '@/utils/customMitzvah';

const JERUSALEM = CITIES[0];
const ADD = 'הוסף מצווה חדשה';
const TITLE = 'מה להוסיף?';
// Sunday 2026-11-15 to Saturday 2026-11-21, by weekday.
const WEEK = ['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21'];
const created = () => Object.values(useCustomMitzvotStore.getState().items);
const openSheet = () => {
  renderWithTheme(<MitzvotScreen />);
  fireEvent.press(screen.getByRole('button', { name: ADD }));
};

describe('the template sheet of the mitzvot library', () => {
  beforeEach(() => {
    jest.useFakeTimers({
      now: at(JERUSALEM, '2026-11-18T10:00'),
      doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'],
    });
    useUserStore.getState().reset();
    useUserStore.setState({
      language: 'he',
      location: JERUSALEM,
      inIsrael: true,
      nusach: 'ashkenaz',
      isOnboarded: true,
    });
    useMitzvotStore.getState().reset();
    useCustomMitzvotStore.getState().reset();
    mockPush.mockReset();
    mockParams = {};
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('lists every template with its benefit, days and hours, then "my own"', () => {
    openSheet();
    expect(screen.getByText(TITLE)).toBeTruthy();
    for (const template of CUSTOM_TEMPLATES) {
      expect(screen.getByText(translate(`template.${template.id}.name`, undefined, 'he', null))).toBeTruthy();
      expect(CUSTOM_ICON_CHOICES).toContain(template.icon);
    }
    expect(screen.getByText('נתינה קטנה בכל יום, עוד לפני הצהריים\nא׳–ו׳ · 08:00–14:00')).toBeTruthy();
    expect(screen.getByText('שיחה קצרה לפני שבת\nיום שישי · 09:00–13:00')).toBeTruthy();
    expect(screen.getByText('מצווה משלי')).toBeTruthy();
  });

  it.each(CUSTOM_TEMPLATES.map((template) => [template.id, template] as const))(
    'creates %s in one tap, with its hours, its days from today, one reminder at its start, switched on',
    (_id, template) => {
      const name = translate(`template.${template.id}.name`, undefined, 'he', null);
      openSheet();
      fireEvent.press(screen.getByText(name));
      expect(created()).toHaveLength(1);
      const [item] = created();
      expect(item).toMatchObject({
        name,
        icon: template.icon,
        startHHMM: template.startHHMM,
        endHHMM: template.endHHMM,
        skipOn: ['shabbat', 'yomtov'],
        reminders: [{ anchor: 'start', offsetMin: 0, label: name }],
        schedules: [{ from: '2026-11-18', schedule: { mode: 'weekdays', days: [...template.days] } }],
        template: template.id,
      });
      expect(WEEK.slice(3).filter((key) => appliesOn(item, key))).toEqual(
        WEEK.slice(3).filter((_key, index) => template.days.includes(((index + 3) % 7) as 0)),
      );
      expect(appliesOn(item, '2026-11-17')).toBe(false);
      expect(useMitzvotStore.getState().activeMitzvot[item.id]?.enabled).toBe(true);
      expect(findAnyMitzvah(item.id)?.name.he).toBe(name);
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/mitzvah/[id]', params: { id: item.id, added: '1' } });
      expect(screen.queryByText(TITLE)).toBeNull();
    },
  );

  it('marks an added template and opens the mitzvah it made, never a second one', () => {
    openSheet();
    fireEvent.press(screen.getByText('שיעור תורה'));
    const [item] = created();
    mockPush.mockReset();
    fireEvent.press(screen.getByRole('button', { name: ADD }));
    expect(screen.getAllByText('נוסף')).toHaveLength(1);
    fireEvent.press(screen.getAllByText('שיעור תורה').pop()!);
    expect(created()).toHaveLength(1);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/mitzvah/[id]', params: { id: item.id } });
  });

  it('opens with the sheet up on add=1, and names the templates in English', () => {
    useUserStore.setState({ language: 'en' });
    mockParams = { add: '1' };
    renderWithTheme(<MitzvotScreen />);
    expect(screen.getByText('What would you like to add?')).toBeTruthy();
    fireEvent.press(screen.getByText('Daily tzedakah'));
    expect(created()[0].name).toBe('Daily tzedakah');
  });
});
