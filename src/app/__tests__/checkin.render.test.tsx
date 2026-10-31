const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ back: mockBack, replace: mockReplace, push: jest.fn(), canGoBack: () => true }),
}));
jest.mock('@/services/NotificationScheduler', () => ({
  NotificationScheduler: {
    cancelForMitzvah: jest.fn(async () => {}),
    settleCheckIn: jest.fn(async () => {}),
    rebuild: jest.fn(async () => {}),
    cancelCheckIn: jest.fn(async () => {}),
  },
}));

import { act, fireEvent, screen } from '@testing-library/react-native';
import CheckInRoute from '../checkin';
import { MitzvahCard } from '@/components/MitzvahCard';
import { CITIES } from '@/data/cities';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';

const JERUSALEM = CITIES[0];
const SUNDAY_AFTER_SHABBAT = '2026-11-15T10:00';
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

describe('check-in', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: at(JERUSALEM, SUNDAY_AFTER_SHABBAT), doNotFake: [...ONLY_DATE] });
    mockBack.mockClear();
    mockReplace.mockClear();
    useUserStore.getState().reset();
    useUserStore.setState({
      language: 'he',
      location: JERUSALEM,
      inIsrael: true,
      nusach: 'ashkenaz',
      isOnboarded: true,
      locationStatus: 'ready',
    });
    useMitzvotStore.getState().reset();
    useCompletionsStore.getState().reset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('finishes the check-in from a real button', async () => {
    renderWithTheme(<CheckInRoute />);
    await screen.findByText(/מה עשית בשבת/);
    fireEvent.press(screen.getByRole('button', { name: 'סיימתי' }));
    expect(Object.keys(useCompletionsStore.getState().checkIns)).toHaveLength(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('draws each card with its mitzvah icon', async () => {
    renderWithTheme(<CheckInRoute />);
    await screen.findByText(/מה עשית בשבת/);
    const cards = screen.UNSAFE_getAllByType(MitzvahCard);
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.some((card) => card.props.icon === 'custom')).toBe(false);
  });

  it("lists Friday night's bedtime Shema with the night icon and files its mark under Friday, in time, without asking", async () => {
    renderWithTheme(<CheckInRoute />);
    await screen.findByText(/מה עשית בשבת/);
    const card = screen.UNSAFE_getAllByType(MitzvahCard).find((node) => node.props.name === 'קריאת שמע על המיטה');
    expect(card?.props.icon).toBe('night');
    act(() => card!.props.onComplete());
    expect(screen.queryByText('מתי עשית?')).toBeNull();
    const filed = useCompletionsStore.getState().completions['2026-11-13']?.krias_shma_al_hamita;
    // One minute before the window closed at Saturday's alot: a mark in time, never a late one.
    expect(filed).toBeGreaterThan(at(JERUSALEM, '2026-11-14T04:00').getTime());
    expect(filed).toBeLessThan(at(JERUSALEM, '2026-11-14T06:00').getTime());
    expect(useCompletionsStore.getState().late).toEqual({});
  });

  it('writes nothing after the deadline', async () => {
    renderWithTheme(<CheckInRoute />);
    await screen.findByText(/מה עשית בשבת/);
    const card = screen.UNSAFE_getAllByType(MitzvahCard).find((node) => node.props.name === 'קריאת שמע על המיטה');
    jest.setSystemTime(at(JERUSALEM, '2026-11-16T07:00'));
    act(() => card!.props.onComplete());
    expect(useCompletionsStore.getState().completions).toEqual({});
    expect(useCompletionsStore.getState().late).toEqual({});
  });
});
