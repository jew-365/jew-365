const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace, canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
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
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  getPresentedNotificationsAsync: jest.fn(async () => []),
  dismissNotificationAsync: jest.fn(async () => {}),
  dismissAllNotificationsAsync: jest.fn(async () => {}),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => ({})),
  setNotificationCategoryAsync: jest.fn(async () => ({})),
  registerTaskAsync: jest.fn(async () => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  AndroidImportance: { HIGH: 'high', DEFAULT: 'default', LOW: 'low' },
  AndroidNotificationVisibility: { PUBLIC: 'public', PRIVATE: 'private' },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(async () => false),
  unregisterTaskAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-background-task', () => ({
  registerTaskAsync: jest.fn(),
  unregisterTaskAsync: jest.fn(),
  getStatusAsync: jest.fn(),
  BackgroundTaskResult: { Success: 1, Failed: 2 },
  BackgroundTaskStatus: { Restricted: 1, Available: 2 },
}));

import { act, cleanup, fireEvent, screen, within } from '@testing-library/react-native';
import { Modal } from 'react-native';
import MitzvahDetailScreen from '../mitzvah/[id]';
import { CITIES } from '@/data/cities';
import { findMitzvah } from '@/data/mitzvot';
import { t } from '@/i18n';
import { useChokStore } from '@/stores/useChokStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { at, zmanimFor } from '@/testing/zmanim';
import { fireTimeText } from '@/utils/clock';

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
const MIN = 60_000;

function renderMitzvah(params: Record<string, string>) {
  mockParams = params;
  return renderWithTheme(<MitzvahDetailScreen />);
}

const levelTitle = (level: number) => t('nag.level.title', { name: t(`nag.level.${level}.name`), level });
const appTitle = (level: number) => t('detail.nagLevelApp', { name: t(`nag.level.${level}.name`), level });
const perDay = (n: number) => t('detail.nagLevelPerDay', { n });
const levelRow = () => screen.getByRole('button', { name: t('detail.nagLevel') });
const sheet = () => within(screen.UNSAFE_getAllByType(Modal).find((modal) => modal.props.visible)!);

describe('Mitzvah screen › the nagging level', () => {
  // Wednesday 2026-10-28 at 04:00 in Jerusalem, before Shacharit's netz.
  const netz = zmanimFor(at(J, '2026-10-28T12:00'), J).netzHaChama;

  beforeEach(() => {
    jest.useFakeTimers({ now: at(J, '2026-10-28T04:00'), doNotFake: [...ONLY_DATE] });
    useUserStore.getState().reset();
    useUserStore.setState({ language: 'he', location: J, inIsrael: true, nusach: 'ashkenaz', isOnboarded: true });
    useMitzvotStore.getState().reset();
    useChokStore.getState().reset();
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
    useChokStore.getState().reset();
    useSelichotStore.getState().reset();
  });

  it('reads like the app, with the app’s level and this mitzvah’s estimate', () => {
    useUserStore.getState().setNagLevel(2);
    renderMitzvah({ id: 'shacharit' });
    // Two reminders, the two last-chance points and the level's one nag.
    expect(screen.getByText(`${appTitle(2)} · ${perDay(5)}`)).toBeOnTheScreen();
  });

  it('writes the mitzvah’s own level from the sheet, and the row and estimate follow', () => {
    renderMitzvah({ id: 'shacharit' });
    fireEvent.press(levelRow());
    expect(sheet().getByText(appTitle(1))).toBeOnTheScreen();
    fireEvent.press(sheet().getByText(levelTitle(4)));
    expect(useMitzvotStore.getState().activeMitzvot.shacharit.nagLevel).toBe(4);
    expect(screen.getByText(`${levelTitle(4)} · ${perDay(7)}`)).toBeOnTheScreen();
  });

  it('clears the override with “like the app”', () => {
    useMitzvotStore.getState().setNagLevel('shacharit', 3);
    renderMitzvah({ id: 'shacharit' });
    fireEvent.press(levelRow());
    fireEvent.press(sheet().getByText(appTitle(1)));
    expect(useMitzvotStore.getState().activeMitzvot.shacharit.nagLevel).toBeUndefined();
    expect(screen.getByText(`${appTitle(1)} · ${perDay(4)}`)).toBeOnTheScreen();
  });

  it('keeps the level when the timeline is reset', () => {
    useMitzvotStore.getState().setNagLevel('shacharit', 3);
    useMitzvotStore.getState().setReminders('shacharit', [{ anchor: 'start', offsetMin: 0, label: 'יחידה' }]);
    renderMitzvah({ id: 'shacharit' });
    fireEvent.press(screen.getByRole('button', { name: t('detail.timeline.reset') }));
    expect(useMitzvotStore.getState().activeMitzvot.shacharit.nagLevel).toBe(3);
    expect(useMitzvotStore.getState().activeMitzvot.shacharit.customReminders).toBeUndefined();
  });

  it('shows the reset only after a change, and the one reset gives back both the reminders and the smart nag', () => {
    renderMitzvah({ id: 'shacharit' });
    expect(screen.queryByTestId('timeline-manual')).toBeNull();
    act(() => {
      useMitzvotStore.getState().setReminders('shacharit', [{ anchor: 'start', offsetMin: 0, label: 'יחידה' }]);
      useMitzvotStore.getState().setManualNags('shacharit', [{ anchor: 'end', offsetMin: -30, kind: 'zone' }]);
    });
    expect(screen.getByTestId('timeline-manual')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: t('detail.timeline.reset') }));
    const entry = useMitzvotStore.getState().activeMitzvot.shacharit;
    expect(entry.customReminders).toBeUndefined();
    expect(entry.manualNags).toBeUndefined();
    expect(screen.queryByTestId('timeline-manual')).toBeNull();
  });

  it('shows no nag line on a reminder row: the level nags the window, not a reminder', () => {
    useMitzvotStore.getState().setNagLevel('shacharit', 4);
    renderMitzvah({ id: 'shacharit' });
    expect(screen.queryByTestId('reminder-nag-0')).toBeNull();
    expect(screen.queryByTestId('reminder-nag-1')).toBeNull();
  });

  it('names the next reminder in the header, never a nag', () => {
    useMitzvotStore.getState().setNagLevel('shacharit', 4);
    jest.setSystemTime(new Date(netz.getTime() + MIN));
    renderMitzvah({ id: 'shacharit' });
    const [, end] = findMitzvah('shacharit')!.defaultReminders;
    const sof = zmanimFor(at(J, '2026-10-28T12:00'), J).sofZmanTfilaGra;
    const next = fireTimeText(new Date(sof.getTime() + end.offsetMin * MIN), J.tz);
    expect(screen.getByText(t('detail.previewNext', { time: next }))).toBeOnTheScreen();
  });

  describe('the timeline on the time window card', () => {
    const tapDot = (testID: string) => {
      const dot = screen.getByTestId(testID);
      fireEvent(dot, 'responderGrant', { nativeEvent: { pageX: 10, pageY: 10 } });
      fireEvent(dot, 'responderRelease', { nativeEvent: { pageX: 10, pageY: 10 } });
    };

    it('saves a stepped nag as the mitzvah’s own, counts it, and gives the smart nag back', () => {
      useMitzvotStore.getState().setNagLevel('shacharit', 3);
      renderMitzvah({ id: 'shacharit' });
      // The nags the window sends at level 3, which become the user's.
      const nags = screen.getAllByTestId(/^timeline-dot-n\d+$/).length;
      expect(nags).toBeGreaterThan(1);
      tapDot('timeline-dot-n1');
      fireEvent.press(screen.getByRole('button', { name: t('detail.timeline.later') }));
      const manual = useMitzvotStore.getState().activeMitzvot.shacharit.manualNags;
      expect(manual).toHaveLength(nags);
      expect(screen.getByTestId('timeline-manual')).toBeOnTheScreen();
      // The level row counts the user's nags beside the two reminders.
      expect(screen.getByText(`${levelTitle(3)} · ${perDay(2 + nags)}`)).toBeOnTheScreen();
      fireEvent.press(screen.getByRole('button', { name: t('detail.timeline.reset') }));
      expect(useMitzvotStore.getState().activeMitzvot.shacharit.manualNags).toBeUndefined();
      expect(screen.queryByTestId('timeline-manual')).toBeNull();
    });

    it('gives way to a level chosen in the sheet', () => {
      useMitzvotStore.getState().setManualNags('shacharit', [{ anchor: 'end', offsetMin: -30, kind: 'zone' }]);
      renderMitzvah({ id: 'shacharit' });
      fireEvent.press(levelRow());
      fireEvent.press(sheet().getByText(levelTitle(2)));
      expect(useMitzvotStore.getState().activeMitzvot.shacharit.manualNags).toBeUndefined();
      expect(useMitzvotStore.getState().activeMitzvot.shacharit.nagLevel).toBe(2);
    });

    it('opens the reminder editor from a reminder’s full edit, and deletes through the screen’s rule', () => {
      useMitzvotStore.getState().setEnabled('shacharit', true);
      useMitzvotStore.getState().setReminders('shacharit', [{ anchor: 'start', offsetMin: 0, label: 'יחידה' }]);
      renderMitzvah({ id: 'shacharit' });
      tapDot('timeline-dot-r0.0');
      fireEvent.press(screen.getByRole('button', { name: t('detail.timeline.delete') }));
      // The last reminder of an enabled mitzvah is kept, with the screen's error.
      expect(useMitzvotStore.getState().activeMitzvot.shacharit.customReminders).toHaveLength(1);
      expect(screen.getByText(t('reminder.errors.lastReminder'))).toBeOnTheScreen();
      tapDot('timeline-dot-r0.0');
      fireEvent.press(screen.getByRole('button', { name: t('detail.timeline.fullEdit') }));
      expect(sheet().getByDisplayValue('יחידה')).toBeOnTheScreen();
    });
  });
});
