const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));
jest.mock('@/services/NotificationScheduler', () => ({
  NotificationScheduler: {
    cancelForMitzvah: async () => {},
    settleCheckIn: async () => {},
    rebuild: async () => {},
  },
}));

import { fireEvent, screen } from '@testing-library/react-native';
import { DateTime } from 'luxon';
import ScheduleScreen from '../schedule';
import { Card } from '@/components/Card';
import { CITIES } from '@/data/cities';
import { formatDate } from '@/i18n';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { at, zmanimFor } from '@/testing/zmanim';
import { THEMES } from '@/theme/colors';
import { ZMAN_KEYS } from '@/utils/buildDayTimeline';
import { clockOf } from '@/utils/clock';

const JERUSALEM = CITIES[0];
const NEW_YORK = CITIES.find((city) => city.cityId === 'new-york')!;
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

const cursorLabel = (day: number) =>
  formatDate(DateTime.fromObject({ year: 2026, month: 10, day }), 'cccc d LLL', 'he');

describe('schedule', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: at(JERUSALEM, '2026-10-28T10:00'), doNotFake: [...ONLY_DATE] });
    mockPush.mockClear();
    useUserStore.getState().reset();
    useUserStore.setState({
      language: 'he',
      location: JERUSALEM,
      inIsrael: true,
      nusach: 'ashkenaz',
      isOnboarded: true,
      locationStatus: 'ready',
    });
    useCompletionsStore.getState().reset();
    useMitzvotStore.setState({ activeMitzvot: { tefillin: { enabled: true }, shacharit: { enabled: true } } });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('puts the day timeline on one card and the cursor in the text colour', () => {
    renderWithTheme(<ScheduleScreen />);
    expect(screen.UNSAFE_getAllByType(Card)).toHaveLength(1);
    expect(screen.getByText(cursorLabel(28))).toHaveStyle({ color: THEMES.gold.text });
  });

  it('moves the cursor one day forward', () => {
    renderWithTheme(<ScheduleScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'הבא' }));
    expect(screen.getByText(cursorLabel(29))).toBeOnTheScreen();
  });

  it('names the month in the month view header', () => {
    renderWithTheme(<ScheduleScreen />);
    fireEvent.press(screen.getByRole('radio', { name: 'חודש' }));
    expect(screen.getByText('אוקטובר')).toBeOnTheScreen();
  });

  it.each([
    ['he', 'שבוע', 'ראש חודש חשון'],
    ['en', 'Week', 'Rosh Chodesh Cheshvan'],
  ] as const)(
    'names the week view’s occasion in the UI language, without nikud (%s)',
    (language, weekLabel, occasion) => {
      useUserStore.setState({ language });
      jest.useFakeTimers({ now: at(JERUSALEM, '2026-10-14T10:00'), doNotFake: [...ONLY_DATE] });
      renderWithTheme(<ScheduleScreen />);
      fireEvent.press(screen.getByRole('radio', { name: weekLabel }));
      expect(screen.getAllByText(occasion)).toHaveLength(2);
    },
  );

  it('prints the day view’s times on the location’s clock, whatever the device zone', () => {
    useUserStore.setState({ location: NEW_YORK, inIsrael: false });
    jest.useFakeTimers({ now: at(NEW_YORK, '2026-10-28T10:00'), doNotFake: [...ONLY_DATE] });
    renderWithTheme(<ScheduleScreen />);
    const zmanim = zmanimFor(at(NEW_YORK, '2026-10-28T12:00'), NEW_YORK);
    const times = screen.getAllByText(/^\d\d:\d\d$/).map((node) => node.props.children);
    expect(times).toEqual(expect.arrayContaining(ZMAN_KEYS.map((key) => clockOf(zmanim[key], NEW_YORK.tz))));
  });
});
