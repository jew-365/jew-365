const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  dismissAll: jest.fn(),
  canDismiss: () => false,
};

jest.mock('expo-router', () => {
  const { View } = require('react-native');
  const Stack = Object.assign(() => <View testID="stack" />, { Screen: () => null });
  return { Stack, useRouter: () => mockRouter, useSegments: () => ['(tabs)', 'home'] };
});
jest.mock('react-native-safe-area-context', () => ({
  ...(jest.requireActual('react-native-safe-area-context') as object),
  SafeAreaProvider: ({ children }: { children?: unknown }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('expo-dev-client', () => ({}));
jest.mock('react-native-gesture-handler', () => ({ GestureHandlerRootView: require('react-native').View }));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: () => Promise.resolve(),
  hideAsync: () => Promise.resolve(),
}));
jest.mock('expo-updates', () => ({
  useUpdates: () => ({ isUpdatePending: false }),
  reloadAsync: () => Promise.resolve(),
  isEnabled: false,
}));
jest.mock('@sentry/react-native', () => ({ wrap: (component: unknown) => component }));
jest.mock('@expo-google-fonts/heebo', () => ({ useFonts: () => [true, null] }));
jest.mock('@expo-google-fonts/noto-serif-hebrew', () => ({}));
jest.mock('@/services/NotificationScheduler', () => ({ initNotificationHandlers: () => () => {} }));
jest.mock('@/services/ChokContentService', () => ({ reconcileChokInstall: () => {} }));
jest.mock('@/services/SelichotContentService', () => ({ reconcileSelichotInstall: () => {} }));
const mockFollow = jest.fn(async () => false);
jest.mock('@/services/locationFollow', () => ({ followDeviceLocation: () => mockFollow() }));
jest.mock('@/services/notificationResponseHandler', () => ({
  initNotificationResponseHandler: () => ({ remove: () => {} }),
  consumePendingNotificationRoute: () => {},
  openLaunchNotificationResponse: () => {},
}));

import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import RootLayout from '../_layout';
import { CITIES } from '@/data/cities';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useChokStore } from '@/stores/useChokStore';
import { useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';
import { CustomMitzvah } from '@/types/mitzvah';

const J = CITIES[0];
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
const ENDED = 'custom_1_ended';
const ENDING_TODAY = 'custom_2_today';

const enabled = (id: string) => Boolean(useMitzvotStore.getState().activeMitzvot[id]?.enabled);

function addRange(id: string, end: string) {
  const custom: CustomMitzvah = {
    id,
    name: 'לימוד',
    startHHMM: '08:00',
    endHHMM: '09:00',
    reminders: [{ anchor: 'start', offsetMin: 0, label: 'א' }],
    skipOn: [],
    createdAt: 1,
    schedules: [{ from: '2026-10-01', schedule: { mode: 'range', start: '2026-10-20', end } }],
  };
  useCustomMitzvotStore.getState().add(custom);
  useMitzvotStore.getState().setEnabled(id, true);
}

describe('the root layout and the ended custom mitzvot', () => {
  let listeners: ((state: string) => void)[] = [];

  beforeEach(() => {
    jest.useFakeTimers({ now: at(J, '2026-10-28T07:00'), doNotFake: [...ONLY_DATE] });
    useUserStore.getState().reset();
    useMitzvotStore.getState().reset();
    useCompletionsStore.getState().reset();
    useCustomMitzvotStore.getState().reset();
    useUserStore.setState({ language: 'he', location: J, inIsrael: true, nusach: 'ashkenaz', isOnboarded: true });
    listeners = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      listeners.push(listener as (state: string) => void);
      return { remove: jest.fn() } as never;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('switches off a range that ended before today when the app opens, and keeps one that ends today', async () => {
    addRange(ENDED, '2026-10-27');
    addRange(ENDING_TODAY, '2026-10-28');
    renderWithTheme(<RootLayout />);
    await screen.findByTestId('stack');

    await waitFor(() => expect(enabled(ENDED)).toBe(false));
    expect(enabled(ENDING_TODAY)).toBe(true);
    expect(useCustomMitzvotStore.getState().items[ENDED]).toBeDefined();
  });

  it('switches off a range whose last day passed while the app was in the background, on the return to the foreground', async () => {
    addRange(ENDING_TODAY, '2026-10-28');
    renderWithTheme(<RootLayout />);
    await screen.findByTestId('stack');
    expect(enabled(ENDING_TODAY)).toBe(true);

    jest.setSystemTime(at(J, '2026-10-29T07:00'));
    act(() => listeners.forEach((listener) => listener('active')));

    await waitFor(() => expect(enabled(ENDING_TODAY)).toBe(false));
  });
});

describe('the root layout and the location', () => {
  let listeners: ((state: string) => void)[] = [];

  beforeEach(() => {
    jest.useFakeTimers({ now: at(J, '2026-10-28T07:00'), doNotFake: [...ONLY_DATE] });
    useUserStore.getState().reset();
    useUserStore.setState({ language: 'he', location: J, inIsrael: true, nusach: 'ashkenaz', isOnboarded: true });
    mockFollow.mockClear();
    listeners = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      listeners.push(listener as (state: string) => void);
      return { remove: jest.fn() } as never;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('follows the phone when the app opens and again on every return to it', async () => {
    renderWithTheme(<RootLayout />);
    await screen.findByTestId('stack');
    await waitFor(() => expect(mockFollow).toHaveBeenCalledTimes(1));

    jest.setSystemTime(at(J, '2026-10-28T09:00'));
    act(() => listeners.forEach((listener) => listener('active')));
    await waitFor(() => expect(mockFollow).toHaveBeenCalledTimes(2));
  });

  it('never follows before onboarding', async () => {
    useUserStore.setState({ isOnboarded: false });
    renderWithTheme(<RootLayout />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(mockFollow).not.toHaveBeenCalled();
  });
});

describe('the root layout and the Chok LeYisrael prompt', () => {
  const TITLE = 'חק לישראל הותקן';
  const BODY = 'האם להפעיל התראות ומעקב אחרי המצווה?';

  beforeEach(() => {
    jest.useFakeTimers({ now: at(J, '2026-10-28T07:00'), doNotFake: [...ONLY_DATE] });
    useUserStore.getState().reset();
    useMitzvotStore.getState().reset();
    useChokStore.getState().reset();
    useUserStore.setState({ language: 'he', location: J, inIsrael: true, nusach: 'ashkenaz', isOnboarded: true });
    jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }) as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    act(() => useChokStore.getState().reset());
  });

  it('asks when a download finishes while no Chok LeYisrael screen is open, and "לא" closes it for good', async () => {
    renderWithTheme(<RootLayout />);
    await screen.findByTestId('stack');
    expect(screen.queryByText(TITLE)).toBeNull();

    act(() => useChokStore.getState().setEnablePrompt(true));
    expect(screen.getByText(TITLE)).toBeTruthy();
    expect(screen.getByText(BODY)).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'לא' }));
    expect(screen.queryByText(TITLE)).toBeNull();
    expect(useChokStore.getState().enablePrompt).toBe(false);
    expect(enabled('chok_leyisrael')).toBe(false);
  });

  it('keeps the question behind the Shabbat screen and keeps it pending', async () => {
    jest.setSystemTime(at(J, '2026-10-31T12:00'));
    useChokStore.getState().setEnablePrompt(true);
    renderWithTheme(<RootLayout />);
    await screen.findByText('שבת שלום');
    expect(screen.queryByText(TITLE, { includeHiddenElements: true })).toBeNull();
    expect(useChokStore.getState().enablePrompt).toBe(true);
  });

  it('never asks before onboarding', async () => {
    useUserStore.setState({ isOnboarded: false });
    useChokStore.getState().setEnablePrompt(true);
    renderWithTheme(<RootLayout />);
    await screen.findByTestId('stack');
    expect(screen.queryByText(TITLE)).toBeNull();
  });
});
