const mockPush = jest.fn();
const mockParams: { open?: string } = {};
const mockRouter = { push: mockPush, setParams: jest.fn() };

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => mockRouter,
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

import { Linking } from 'react-native';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import MoreScreen from '../(tabs)/more';
import { CITIES } from '@/data/cities';
import { CAPABILITY_GOALS } from '@/data/capabilities';
import { checkChokUpdate } from '@/services/ChokContentService';
import { checkSelichotUpdate } from '@/services/SelichotContentService';
import { useChokStore } from '@/stores/useChokStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { installChokFixture } from '@/testing/chok';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';
import { useUserStore } from '@/stores/useUserStore';

const JERUSALEM = CITIES[0];
const mockCheck = jest.mocked(checkChokUpdate);
const mockSelichotCheck = jest.mocked(checkSelichotUpdate);
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

// The offers are picked after the paint, so each render lets that frame pass.
function renderAt(wallClock: string) {
  jest.useFakeTimers({ now: at(JERUSALEM, wallClock), doNotFake: [...ONLY_DATE] });
  return renderWithTheme(<MoreScreen />);
}
const DAY = 86_400_000;
const stamp = (wallClock: string, daysAgo: number) => at(JERUSALEM, wallClock).getTime() - daysAgo * DAY;

afterEach(() => {
  useChokStore.getState().reset();
  useSelichotStore.getState().reset();
});

describe('More tab', () => {
  const NOON = '2026-11-18T12:00';
  const FRIDAY = '2026-11-20T10:00';

  beforeEach(() => {
    delete mockParams.open;
    useUserStore.getState().reset();
    useMitzvotStore.getState().reset();
    // An install of two weeks, so the offers are not held to the install day.
    useUserStore.setState({ location: JERUSALEM, inIsrael: true, firstOpenedAt: stamp(NOON, 14) });
    mockPush.mockReset();
    mockCheck.mockClear();
    mockSelichotCheck.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens with the search, then a tile per goal and the all-mitzvot tile', () => {
    renderAt(NOON);
    expect(screen.getByLabelText('חיפוש בכל האפליקציה')).toBeOnTheScreen();
    for (const goal of CAPABILITY_GOALS) expect(screen.getByTestId(`more-goal-${goal}`)).toBeOnTheScreen();
    expect(within(screen.getByTestId('more-goal-shabbat')).getByText('שבת וחגים')).toBeOnTheScreen();
    expect(within(screen.getByTestId('more-library')).getByText('כל המצוות')).toBeOnTheScreen();
  });

  it('opens the capabilities screen on a goal from its tile, and the full list from the link', () => {
    renderAt(NOON);
    fireEvent.press(screen.getByTestId('more-goal-learning'));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/capabilities', params: { goal: 'learning' } });
    fireEvent.press(screen.getByRole('button', { name: 'הכול ברשימה' }));
    expect(mockPush).toHaveBeenLastCalledWith('/capabilities');
  });

  it('lights the icon of a capability that is on and mutes one that is off', () => {
    renderAt(NOON);
    const prayer = within(screen.getByTestId('more-goal-prayer'));
    // The prayers are on by default; Birchot HaShachar is not.
    expect(prayer.getByTestId('capability-icon-prayers-on', { includeHiddenElements: true })).toBeTruthy();
    expect(prayer.getByTestId('capability-icon-birchot-off', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId('more-goal-prayer').props.accessibilityLabel).toMatch(/^תפילה: \d+ מתוך 7 פועלים$/);
  });

  it('leaves a capability the user is not offered out of its tile', () => {
    useUserStore.setState({ gender: 'female' });
    renderAt(NOON);
    const prayer = within(screen.getByTestId('more-goal-prayer'));
    expect(prayer.queryByTestId(/capability-icon-tefillin/, { includeHiddenElements: true })).toBeNull();
    expect(screen.getByTestId('more-goal-prayer').props.accessibilityLabel).toMatch(/מתוך 6 פועלים$/);
  });

  it('counts the mitzvot in use on the all-mitzvot tile and opens the library', () => {
    renderAt(NOON);
    const count = Object.values(useMitzvotStore.getState().activeMitzvot).filter((m) => m.enabled).length;
    expect(screen.getByText(`${count} פעילות · הוספת מצווה משלך`)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('more-library'));
    expect(mockPush).toHaveBeenLastCalledWith('/mitzvot');
  });

  it('offers up to three things worth trying, and an accepted one runs and is closed for good', () => {
    // No setup with the bundles yet, and candle lighting is off on a Friday morning.
    renderAt(FRIDAY);
    const strip = within(screen.getByTestId('more-offers'));
    expect(screen.getByText('כדאי לנסות')).toBeOnTheScreen();
    expect(strip.getByTestId('more-offer-catchUp')).toBeOnTheScreen();
    expect(strip.getByTestId('more-offer-candles')).toBeOnTheScreen();
    expect(strip.getAllByRole('button').length).toBeLessThanOrEqual(3);

    fireEvent.press(strip.getByRole('button', { name: 'לבחירה: מה חשוב לך?' }));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/capabilities', params: { bundles: '1' } });
    expect(useUserStore.getState().discovery.offers.catchUp.closedAt).toEqual(expect.any(Number));
    expect(screen.queryByTestId('more-offer-catchUp')).toBeNull();
  });

  it('switches a mitzvah on from its offer', () => {
    renderAt(FRIDAY);
    fireEvent.press(screen.getByRole('button', { name: 'להפעלת התזכורות: תזכורת לנרות שבת ולהבדלה' }));
    const { activeMitzvot } = useMitzvotStore.getState();
    expect(activeMitzvot.candle_lighting.enabled).toBe(true);
    expect(activeMitzvot.havdalah.enabled).toBe(true);
  });

  it('shows no strip when nothing is worth trying, and none before the install is stamped', () => {
    useUserStore.setState({ firstOpenedAt: null });
    renderAt(NOON);
    expect(screen.queryByText('כדאי לנסות')).toBeNull();
    expect(screen.queryByTestId('more-offers')).toBeNull();
    expect(screen.getByTestId('more-goal-tools')).toBeOnTheScreen();
  });

  it('reads in English', () => {
    useUserStore.setState({ language: 'en' });
    renderAt(NOON);
    expect(screen.getByLabelText('Search the whole app')).toBeOnTheScreen();
    expect(screen.getByText('Worth trying')).toBeOnTheScreen();
    expect(screen.getByText('All mitzvot')).toBeOnTheScreen();
    expect(screen.getByText('Daily learning')).toBeOnTheScreen();
  });

  it('checks for newer add-on versions when the tab is focused', () => {
    installChokFixture();
    renderAt(NOON);
    expect(mockCheck).toHaveBeenCalled();
    expect(mockSelichotCheck).toHaveBeenCalled();
  });
});

describe('Halacha hotline', () => {
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ location: JERUSALEM, inIsrael: true });
    useChokStore.getState().reset();
    mockPush.mockReset();
    // The sheet opens from the capabilities screen's row and from the search, both through `open=halacha`.
    mockParams.open = 'halacha';
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    delete mockParams.open;
    openURL.mockRestore();
    jest.useRealTimers();
  });

  it('offers the Ashkenazi lines, by phone only, to every nusach but Edot HaMizrach', () => {
    for (const nusach of ['ashkenaz', 'sefard', 'chabad'] as const) {
      useUserStore.setState({ nusach });
      const { unmount } = renderAt('2026-11-16T12:00');
      expect(screen.getByText('שאלה לרב, לפי פסקי אשכנז')).toBeOnTheScreen();
      expect(screen.getByText('בית ההוראה של הרב נסים קרליץ זצ״ל')).toBeOnTheScreen();
      expect(screen.getByText('חיוג: 072-215-2222')).toBeOnTheScreen();
      expect(screen.getByText('חיוג: 073-724-6000')).toBeOnTheScreen();
      expect(screen.getByText('חיוג: 03-6161616')).toBeOnTheScreen();
      expect(screen.getByText('חיוג: 02-5363333')).toBeOnTheScreen();
      expect(screen.queryByText(/וואטסאפ/)).toBeNull();
      unmount();
    }
  });

  it('dials the chosen Ashkenazi line', () => {
    renderAt('2026-11-16T12:00');
    fireEvent.press(screen.getByText('חיוג: 073-724-6000'));
    expect(openURL).toHaveBeenCalledWith('tel:0737246000');
  });

  it('shows the number when the device cannot place the call (an iPad)', async () => {
    openURL.mockRejectedValue(new Error('E_UNABLE_TO_OPEN_URL'));
    renderAt('2026-11-16T12:00');
    await act(async () => {
      fireEvent.press(screen.getByText('חיוג: 073-724-6000'));
    });
    expect(screen.getByText('אי אפשר להתקשר מהמכשיר הזה. המספר: 073-724-6000')).toBeOnTheScreen();
  });

  it('offers Edot HaMizrach the Sephardi line by phone or WhatsApp', () => {
    useUserStore.setState({ nusach: 'edot_hamizrach' });
    renderAt('2026-11-16T12:00');
    expect(screen.getByText('שאלה לרב, לפי פסקי מרן')).toBeOnTheScreen();
    expect(screen.queryByText('חיוג: 072-215-2222')).toBeNull();

    fireEvent.press(screen.getByText('חיוג: 073-786-0860'));
    expect(openURL).toHaveBeenLastCalledWith('tel:0737860860');

    fireEvent.press(screen.getByText('וואטסאפ: 073-786-0860'));
    expect(openURL).toHaveBeenLastCalledWith('https://wa.me/972737860860');
  });

  it('offers Teiman the Sephardi line too (R14.6)', () => {
    useUserStore.setState({ nusach: 'teiman' });
    renderAt('2026-11-16T12:00');
    expect(screen.getByText('שאלה לרב, לפי פסקי מרן')).toBeOnTheScreen();
    expect(screen.queryByText('חיוג: 072-215-2222')).toBeNull();
    expect(screen.getByText('חיוג: 073-786-0860')).toBeOnTheScreen();
  });

  it('names the hotline in English', () => {
    useUserStore.setState({ language: 'en', nusach: 'edot_hamizrach' });
    renderAt('2026-11-16T12:00');
    expect(screen.getByText('Halacha hotline')).toBeOnTheScreen();
    expect(screen.getByText('WhatsApp 073-786-0860')).toBeOnTheScreen();
  });

  describe('the search', () => {
    beforeEach(() => {
      delete mockParams.open;
    });

    const type = (text: string) => fireEvent.changeText(screen.getByLabelText('חיפוש בכל האפליקציה'), text);

    it('opens a setting on its section in Settings', () => {
      renderAt('2026-11-16T12:00');
      type('שפה');
      expect(screen.getByTestId('more-hub', { includeHiddenElements: true })).toHaveStyle({ display: 'none' });
      fireEvent.press(screen.getAllByText('שפה')[0]);
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/(tabs)/settings', params: { focus: 'language' } });
      expect(screen.getByLabelText('חיפוש בכל האפליקציה').props.value).toBe('');
    });

    it('opens a text where the Settings search would', () => {
      renderAt('2026-11-16T12:00');
      type('תהילים');
      fireEvent(screen.getByLabelText('חיפוש בכל האפליקציה'), 'submitEditing');
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/siddur/[id]', params: { id: 'tehillim' } });
    });

    it('searches the prayers in the background, then says when nothing matches', async () => {
      renderAt('2026-11-16T12:00');
      type('קקקקקקקקק');
      expect(screen.getByText('מחפש גם בתוך התפילות…')).toBeOnTheScreen();
      expect(await screen.findByText(/^לא נמצא/, {}, { timeout: 10000 })).toBeOnTheScreen();
    });
  });
});
