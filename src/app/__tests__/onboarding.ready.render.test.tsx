const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSample = jest.fn(async (): Promise<'sent' | 'noPermission' | 'quiet'> => 'sent');

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: mockReplace }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/services/NotificationScheduler', () => ({
  NotificationScheduler: { rebuild: jest.fn(async () => {}) },
  presentSampleReminder: () => mockSample(),
  nextReminderAt: jest.requireActual('@/services/notifications/planners/mitzvot').nextReminderAt,
}));

import { Platform } from 'react-native';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import ReadyScreen from '../onboarding/ready';
import { CITIES } from '@/data/cities';
import { translate } from '@/i18n';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';

const J = CITIES[0];
const he = (key: string, options?: Record<string, unknown>) => translate(key, options, 'he', null);
const WEDNESDAY_NOON = at(J, '2026-11-18T12:30');
const SHABBAT_MORNING = at(J, '2026-11-21T10:00');

// Only Date is pinned: the day rows read the clock once, and nothing here waits on a timer.
beforeAll(() => {
  jest.useFakeTimers({
    now: WEDNESDAY_NOON,
    doNotFake: [
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  });
});
afterAll(() => jest.useRealTimers());

function enable(ids: string[]) {
  const active = Object.fromEntries(
    Object.keys(useMitzvotStore.getState().activeMitzvot).map((id) => [id, { enabled: ids.includes(id) }]),
  );
  useMitzvotStore.setState({
    activeMitzvot: { ...active, ...Object.fromEntries(ids.map((id) => [id, { enabled: true }])) },
  });
}

describe('the ready step of the first setup', () => {
  const realOS = Platform.OS;
  beforeEach(() => {
    jest.setSystemTime(WEDNESDAY_NOON);
    useUserStore.getState().reset();
    useUserStore.setState({ language: 'he' });
    useUserStore.getState().setLocationState(J, 'ready', 'manual');
    useMitzvotStore.getState().reset();
    useCompletionsStore.setState({ completions: {}, skipped: {} });
    mockPush.mockClear();
    mockSample.mockClear();
    mockSample.mockResolvedValue('sent');
  });
  afterEach(() => {
    Platform.OS = realOS;
  });

  it('shows the rest of the day with the real windows, soonest first, and the coming candle lighting', () => {
    enable(['shacharit', 'mincha', 'maariv', 'candle_lighting']);
    renderWithTheme(<ReadyScreen />);

    const day = within(screen.getByTestId('ready-day'));
    expect(screen.getByText(he('onboarding.ready.dayTitle'))).toBeOnTheScreen();
    // Shacharit's time has passed at 12:30 and is left out; Mincha is open, Maariv still to come.
    expect(day.queryByText('תפילת שחרית')).toBeNull();
    expect(day.getByText('תפילת מנחה')).toBeOnTheScreen();
    expect(day.getByText('תפילת ערבית')).toBeOnTheScreen();
    expect(day.getByText(/^פתוח עכשיו · נשארו /)).toBeOnTheScreen();
    expect(day.getByText(/^מהשעה 1[67]:\d\d/)).toBeOnTheScreen();
    // The coming Friday's candle lighting, by its weekday and time.
    expect(day.getByText('הדלקת נרות שבת')).toBeOnTheScreen();
    expect(day.getByText('יום שישי')).toBeOnTheScreen();
    expect(day.getByText(/^1[56]:\d\d$/)).toBeOnTheScreen();
    expect(screen.queryByTestId('ready-names')).toBeNull();
  });

  it('falls back to the names inside a holy block, and when no window is left', () => {
    enable(['shacharit', 'mincha']);
    jest.setSystemTime(SHABBAT_MORNING);
    const shabbat = renderWithTheme(<ReadyScreen />);
    expect(screen.queryByTestId('ready-day')).toBeNull();
    expect(within(screen.getByTestId('ready-names')).getByText('תפילת שחרית · תפילת מנחה')).toBeOnTheScreen();
    shabbat.unmount();

    jest.setSystemTime(WEDNESDAY_NOON);
    enable(['shacharit']);
    renderWithTheme(<ReadyScreen />);
    expect(screen.getByTestId('ready-names')).toBeOnTheScreen();
  });

  it('sends a sample reminder and says where its buttons are, per phone', async () => {
    Platform.OS = 'ios';
    const ios = renderWithTheme(<ReadyScreen />);
    await act(async () => fireEvent.press(screen.getByRole('button', { name: he('onboarding.ready.sample') })));
    expect(mockSample).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('ready-sample-result')).toHaveTextContent(he('onboarding.ready.sampleSent.ios'));
    expect(he('onboarding.ready.sampleSent.ios')).toContain('לחיצה ארוכה');
    ios.unmount();

    Platform.OS = 'android';
    renderWithTheme(<ReadyScreen />);
    await act(async () => fireEvent.press(screen.getByRole('button', { name: he('onboarding.ready.sample') })));
    expect(screen.getByTestId('ready-sample-result')).toHaveTextContent(he('onboarding.ready.sampleSent.android'));
  });

  it('says why no sample came: no permission, or a holy block', async () => {
    mockSample.mockResolvedValue('noPermission');
    const first = renderWithTheme(<ReadyScreen />);
    await act(async () => fireEvent.press(screen.getByRole('button', { name: he('onboarding.ready.sample') })));
    expect(screen.getByTestId('ready-sample-result')).toHaveTextContent(he('onboarding.ready.sampleNoPermission'));
    first.unmount();

    mockSample.mockResolvedValue('quiet');
    renderWithTheme(<ReadyScreen />);
    await act(async () => fireEvent.press(screen.getByRole('button', { name: he('onboarding.ready.sample') })));
    expect(screen.getByTestId('ready-sample-result')).toHaveTextContent(he('onboarding.ready.sampleQuiet'));
    // Setup still ends: the finish button never depends on the sample.
    expect(screen.getByRole('button', { name: he('onboarding.finish') })).toBeEnabled();
  });

  it('keeps the accuracy notice as a card, with the full text one tap away', () => {
    renderWithTheme(<ReadyScreen />);
    expect(screen.getByText(he('accuracy.title'))).toBeOnTheScreen();
    expect(screen.getByText(he('accuracy.responsibility'))).toBeOnTheScreen();
    expect(screen.queryByText(he('accuracy.report'))).toBeNull();

    fireEvent.press(screen.getByText(he('onboarding.ready.noticeMore')));
    expect(screen.getByText(he('accuracy.effort'))).toBeOnTheScreen();
    expect(screen.getByText(he('accuracy.report'))).toBeOnTheScreen();
  });

  it('its edit link opens the full list of mitzvot inside the setup', () => {
    renderWithTheme(<ReadyScreen />);
    fireEvent.press(screen.getByText(he('onboarding.readyEdit')));
    expect(mockPush).toHaveBeenCalledWith('/onboarding/mitzvot');
  });
});
