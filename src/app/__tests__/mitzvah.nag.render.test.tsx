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

import { cleanup, fireEvent, screen, within } from '@testing-library/react-native';
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
    expect(screen.getByText(`${appTitle(2)} · ${perDay(4)}`)).toBeOnTheScreen();
  });

  it('writes the mitzvah’s own level from the sheet, and the row and estimate follow', () => {
    renderMitzvah({ id: 'shacharit' });
    fireEvent.press(levelRow());
    expect(sheet().getByText(appTitle(1))).toBeOnTheScreen();
    fireEvent.press(sheet().getByText(levelTitle(4)));
    expect(useMitzvotStore.getState().activeMitzvot.shacharit.nagLevel).toBe(4);
    expect(screen.getByText(`${levelTitle(4)} · ${perDay(8)}`)).toBeOnTheScreen();
  });

  it('clears the override with “like the app”', () => {
    useMitzvotStore.getState().setNagLevel('shacharit', 3);
    renderMitzvah({ id: 'shacharit' });
    fireEvent.press(levelRow());
    fireEvent.press(sheet().getByText(appTitle(1)));
    expect(useMitzvotStore.getState().activeMitzvot.shacharit.nagLevel).toBeUndefined();
    expect(screen.getByText(`${appTitle(1)} · ${perDay(2)}`)).toBeOnTheScreen();
  });

  it('keeps the level when the reminders go back to the defaults', () => {
    useMitzvotStore.getState().setNagLevel('shacharit', 3);
    renderMitzvah({ id: 'shacharit' });
    fireEvent.press(screen.getByRole('button', { name: t('detail.defaultReset') }));
    expect(useMitzvotStore.getState().activeMitzvot.shacharit.nagLevel).toBe(3);
  });

  it('says on each reminder what will repeat: from the level, its own, or none', () => {
    useMitzvotStore.getState().setNagLevel('shacharit', 3);
    const [start, end] = findMitzvah('shacharit')!.defaultReminders;
    useMitzvotStore
      .getState()
      .setReminders('shacharit', [
        start,
        { ...end, nag: { count: 3, everyMin: 5, placement: 'before' } },
        { anchor: 'start', offsetMin: 60, label: 'שקט', nag: null },
      ]);
    renderMitzvah({ id: 'shacharit' });
    expect(screen.getByTestId('reminder-nag-0')).toHaveTextContent(
      t('nag.row.fromLevel', {
        effect: t('nag.effect', { count: 2, every: 5, placement: t('nag.effect.placement.after') }),
      }),
    );
    expect(screen.getByTestId('reminder-nag-1')).toHaveTextContent(
      t('nag.row.custom', {
        effect: t('nag.effect', { count: 3, every: 5, placement: t('nag.effect.placement.before') }),
      }),
    );
    expect(screen.getByTestId('reminder-nag-2')).toHaveTextContent(t('nag.row.none'));
  });

  it('names no nag line at level 1', () => {
    renderMitzvah({ id: 'shacharit' });
    expect(screen.queryByTestId('reminder-nag-0')).toBeNull();
    expect(screen.queryByTestId('reminder-nag-1')).toBeNull();
  });

  it('names a repeat in the header once the main has gone out', () => {
    useMitzvotStore.getState().setNagLevel('shacharit', 3);
    jest.setSystemTime(new Date(netz.getTime() + MIN));
    renderMitzvah({ id: 'shacharit' });
    const repeat = fireTimeText(new Date(netz.getTime() + 5 * MIN), J.tz);
    expect(screen.getByText(t('detail.previewNext', { time: repeat }))).toBeOnTheScreen();
  });
});
