const mockPush = jest.fn();
const mockCancel = jest.fn(async (..._args: unknown[]) => {});
const mockNavigation = {
  isFocused: () => true,
  addListener: () => () => {},
};

jest.mock('@/utils/afterPaint', () => ({
  afterPaint: (task: () => void) => {
    queueMicrotask(task);
    return { cancel: () => undefined };
  },
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }), useNavigation: () => mockNavigation }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));
jest.mock('@/services/NotificationScheduler', () => ({
  NotificationScheduler: {
    cancelForMitzvah: (...args: unknown[]) => mockCancel(...args),
    settleCheckIn: async () => {},
    rebuild: async () => {},
  },
  syncNotificationPermissionStatus: async () => {},
  dismissCompletedPresentedNotifications: async () => {},
  refreshSchedulingOnForeground: async () => {},
}));

import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import HomeScreen from '../(tabs)/home';
import { CITIES } from '@/data/cities';
import { useCompletionsStore, dateKey } from '@/stores/useCompletionsStore';
import { useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';

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

const NAME = 'קידוש לבנה';
const NAME_PATTERN = new RegExp(NAME);

function enableOnly(...ids: string[]) {
  useMitzvotStore.setState({ activeMitzvot: Object.fromEntries(ids.map((id) => [id, { enabled: true }])) });
}

function renderAt(wallClock: string) {
  jest.useFakeTimers({ now: at(JERUSALEM, wallClock), doNotFake: [...ONLY_DATE] });
  return renderWithTheme(<HomeScreen />);
}

const completeButton = (name: string) => screen.getByRole('button', { name: `סמן ${name} כהושלם` });
const completions = () => useCompletionsStore.getState().completions;

describe('Kiddush Levana on home', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockCancel.mockClear();
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
    enableOnly('kiddush_levana');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("lists it next-up on its first night's day and not the day before", () => {
    const before = renderAt('2026-10-13T20:00');
    expect(screen.queryByText(NAME_PATTERN)).toBeNull();
    before.unmount();
    renderAt('2026-10-14T12:00');
    expect(screen.getByText(NAME_PATTERN)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: `סמן ${NAME} כהושלם` })).toBeNull();
  });

  it('keeps it current every night and day of the period until its end', () => {
    for (const wallClock of ['2026-10-14T20:00', '2026-10-15T21:00', '2026-10-19T12:00', '2026-10-25T22:00']) {
      const view = renderAt(wallClock);
      expect(completeButton(NAME)).toBeOnTheScreen();
      view.unmount();
    }
    renderAt('2026-10-26T05:00');
    expect(screen.queryByText(NAME_PATTERN)).toBeNull();
  });

  it("files a mark on the fifth night under the first night's day", async () => {
    renderAt('2026-10-18T20:00');
    fireEvent.press(completeButton(NAME));
    expect(Object.keys(completions())).toEqual(['2026-10-14']);
    await waitFor(() => expect(mockCancel).toHaveBeenCalledTimes(1));
    const [id, date] = mockCancel.mock.calls[0] as [string, Date];
    expect(id).toBe('kiddush_levana');
    expect(dateKey(date)).toBe('2026-10-14');
  });

  it('shows a mark made tonight in the completed list only', () => {
    useCompletionsStore.setState({
      completions: { '2026-10-14': { kiddush_levana: at(JERUSALEM, '2026-10-18T20:00').getTime() } },
    });
    const tonight = renderAt('2026-10-18T22:00');
    expect(screen.getByText('בוצעו (1)')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: `סמן ${NAME} כהושלם` })).toBeNull();
    tonight.unmount();
    renderAt('2026-10-20T20:00');
    expect(screen.queryByText(NAME_PATTERN)).toBeNull();
    expect(screen.queryByText('בוצעו (1)')).toBeNull();
  });
});
