const mockPush = jest.fn();
const mockNavigation = { isFocused: () => true, addListener: () => () => {} };

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }), useNavigation: () => mockNavigation }));
jest.mock('expo-status-bar', () => ({ setStatusBarStyle: jest.fn() }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));
jest.mock('@/services/NotificationScheduler', () => ({
  NotificationScheduler: { cancelForMitzvah: async () => {}, settleCheckIn: async () => {}, rebuild: async () => {} },
  syncNotificationPermissionStatus: async () => {},
  dismissCompletedPresentedNotifications: async () => {},
  refreshSchedulingOnForeground: async () => {},
}));

import { fireEvent, screen, within } from '@testing-library/react-native';
import HomeScreen from '../(tabs)/home';
import { CITIES } from '@/data/cities';
import { findMitzvah } from '@/data/mitzvot';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';
import { dayWindow } from '@/utils/buildDayTimeline';
import { ON_TIME_LEAD_MS } from '@/utils/lateMarks';

const JERUSALEM = CITIES[0];
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
const SETTINGS = { nusach: 'ashkenaz' as const, halachicOpinions: { ksSofZman: 'GRA' as const }, inIsrael: true };
const WINDOW = dayWindow(findMitzvah('shacharit')!, new Date(2026, 9, 28), JERUSALEM, SETTINGS)!;
const state = () => useCompletionsStore.getState();

function renderAt(instant: Date) {
  jest.useFakeTimers({ now: instant, doNotFake: [...ONLY_DATE] });
  renderWithTheme(<HomeScreen />);
}

describe('home on a mark after the window closed', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({
      language: 'he',
      location: JERUSALEM,
      inIsrael: true,
      nusach: 'ashkenaz',
      isOnboarded: true,
      locationStatus: 'ready',
      locationSource: 'manual',
      notificationsEnabled: true,
      notificationPermission: 'granted',
      gender: 'male',
      maritalStatus: 'single',
    });
    useCompletionsStore.getState().reset();
    useCustomMitzvotStore.getState().reset();
    useMitzvotStore.setState({ activeMitzvot: { shacharit: { enabled: true } } });
  });

  afterEach(() => jest.useRealTimers());

  it('asks from the open card whose window closed since the screen last ticked', () => {
    renderAt(new Date(WINDOW.end.getTime() - 10_000));
    const card = within(screen.getByTestId('home-now-shacharit'));
    jest.setSystemTime(new Date(WINDOW.end.getTime() + 20_000));
    fireEvent.press(card.getByText('עשיתי'));
    expect(screen.getByText('מתי עשית?')).toBeOnTheScreen();
    expect(state().completions).toEqual({});
    fireEvent.press(screen.getByText('עשיתי אחרי שעבר הזמן'));
    expect(state().late['2026-10-28'].shacharit).toBe(Date.now());
  });

  it('marks an open card at once', () => {
    renderAt(new Date(WINDOW.end.getTime() - 10_000));
    fireEvent.press(within(screen.getByTestId('home-now-shacharit')).getByText('עשיתי'));
    expect(screen.queryByText('מתי עשית?')).toBeNull();
    expect(state().completions['2026-10-28'].shacharit).toBe(Date.now());
  });

  it("asks from My day's missed entry and files in time one minute before the end", () => {
    renderAt(at(JERUSALEM, '2026-10-28T12:00'));
    fireEvent.press(within(screen.getByTestId('home-day-shacharit')).getByText('עשיתי'));
    fireEvent.press(screen.getByText('עשיתי בזמן ולא סימנתי'));
    expect(state().completions['2026-10-28'].shacharit).toBe(WINDOW.end.getTime() - ON_TIME_LEAD_MS);
    expect(state().late).toEqual({});
  });
});
