jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

import { HDate } from '@hebcal/core';
import { fireEvent, screen } from '@testing-library/react-native';
import TaharahDashboard from '../taharah/index';
import { CITIES } from '@/data/cities';
import { translate } from '@/i18n';
import { useTaharahStore, type TaharahEventInput } from '@/stores/useTaharahStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { at, zmanimFor } from '@/testing/zmanim';
import type { TaharahEvent } from '@/types/taharah';
import type { Location } from '@/types/zmanim';
import { clockOf } from '@/utils/clock';
import { taharahTasksFor } from '@/utils/taharah/tasks';

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

const JERUSALEM = CITIES[0];
const NEW_YORK = CITIES.find((city) => city.cityId === 'new-york')!;

const absOf = (y: number, m: number, d: number) => new HDate(new Date(y, m - 1, d)).abs();
// 9 Cheshvan 5787, a Tuesday: the anchor of taharah.cycle.test.ts.
const O = absOf(2026, 10, 20);

const he = (key: string, options?: Record<string, unknown>) => translate(key, options, 'he', 'female');

const log = (...drafts: TaharahEventInput[]): TaharahEvent[] =>
  drafts.map((draft, i) => ({ ...draft, id: `e${i + 1}`, recordedAt: i + 1 }) as TaharahEvent);

const lastEvent = () => {
  const { events } = useTaharahStore.getState();
  return events[events.length - 1];
};

function mount(location: Location, wallClock: string, events: TaharahEvent[]) {
  jest.useFakeTimers({ now: at(location, wallClock), doNotFake: [...ONLY_DATE] });
  useUserStore.setState({ language: 'he', location, gender: 'female', maritalStatus: 'married', taharahEnabled: true });
  useTaharahStore.setState({ events, lockEnabled: false });
  renderWithTheme(<TaharahDashboard />);
}

describe('Taharah dashboard', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useTaharahStore.getState().reset();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("a rav's ruling after tzeit", () => {
    it('files a ruling to continue under the Hebrew day that began at tzeit, clearing a missed first day', () => {
      mount(
        JERUSALEM,
        '2026-10-25T20:00',
        log({ type: 'onset', onah: { abs: O, kind: 'day' } }, { type: 'hefsek', day: O + 4, result: 'clean' }),
      );
      expect(screen.getByText(he('taharah.stage.safek'))).toBeOnTheScreen();

      fireEvent.press(screen.getByRole('button', { name: he('taharah.ruling.continue') }));

      expect(lastEvent()).toMatchObject({ type: 'ruling', day: O + 6, decision: 'continue' });
      expect(screen.getByText(he('taharah.stage.shivaNekiim.hint', { day: 2 }))).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: he('taharah.ruling.continue') })).toBeNull();
    });

    it('opens the tevila night once a ruling that evening settles a missed seventh day', () => {
      mount(
        JERUSALEM,
        '2026-10-31T20:00',
        log(
          { type: 'onset', onah: { abs: O, kind: 'day' } },
          { type: 'hefsek', day: O + 4, result: 'clean' },
          { type: 'bedika', day: O + 5, slot: 'morning', result: 'clean' },
        ),
      );
      expect(screen.getByText(he('taharah.stage.safek'))).toBeOnTheScreen();

      fireEvent.press(screen.getByRole('button', { name: he('taharah.ruling.continue') }));

      expect(lastEvent()).toMatchObject({ type: 'ruling', day: O + 12, decision: 'continue' });
      expect(screen.getByText(he('taharah.stage.tevilaNight'))).toBeOnTheScreen();
    });
  });

  describe('the deferred tevila line', () => {
    it('is not shown on the day after a first tevila night that passed with no fast', () => {
      mount(
        JERUSALEM,
        '2026-11-01T12:00',
        log(
          { type: 'onset', onah: { abs: O, kind: 'day' } },
          { type: 'hefsek', day: O + 4, result: 'clean' },
          { type: 'bedika', day: O + 5, slot: 'morning', result: 'clean' },
          { type: 'bedika', day: O + 11, slot: 'evening', result: 'clean' },
        ),
      );
      expect(screen.getByText(he('taharah.stage.awaitingTevila'))).toBeOnTheScreen();
      expect(screen.queryByText(he('taharah.tevilaDeferred'))).toBeNull();
    });

    it('is shown once on a fast night, where the stage hint already says it', () => {
      const H = absOf(2026, 9, 13);
      mount(
        JERUSALEM,
        '2026-09-20T20:00',
        log(
          { type: 'onset', onah: { abs: H - 4, kind: 'day' } },
          { type: 'hefsek', day: H, result: 'clean' },
          ...Array.from({ length: 7 }, (_, i): TaharahEventInput => ({
            type: 'bedika',
            day: H + i + 1,
            slot: 'morning',
            result: 'clean',
          })),
        ),
      );
      expect(screen.getAllByText(he('taharah.tevilaDeferred'))).toHaveLength(1);
    });
  });

  describe("times on the location's clock", () => {
    it("prints the hefsek's until and the stage hint's sunset on the location's clock", () => {
      mount(NEW_YORK, '2026-10-26T04:00', log({ type: 'onset', onah: { abs: O, kind: 'day' } }));
      const shkia = zmanimFor(at(NEW_YORK, '2026-10-26T12:00'), NEW_YORK).shkia;
      const time = clockOf(shkia, NEW_YORK.tz);
      expect(time).not.toBe(clockOf(shkia));

      expect(screen.getByText(he('taharah.stage.awaitingHefsek'))).toBeOnTheScreen();
      expect(screen.getByText(he('taharah.stage.awaitingHefsek.hint', { time }))).toBeOnTheScreen();
      expect(screen.getByText(he('taharah.task.until', { time }))).toBeOnTheScreen();
    });

    it("prints the tevila's from on the location's clock", () => {
      const events = log(
        { type: 'onset', onah: { abs: O + 2, kind: 'day' } },
        { type: 'hefsek', day: O + 6, result: 'clean' },
        { type: 'bedika', day: O + 7, slot: 'morning', result: 'clean' },
      );
      mount(NEW_YORK, '2026-11-02T04:00', events);
      const tevila = taharahTasksFor(
        new Date(2026, 10, 2),
        events,
        useTaharahStore.getState().settings,
        NEW_YORK,
        at(NEW_YORK, '2026-11-02T04:00'),
      ).find((task) => task.kind === 'tevila');
      expect(tevila).toBeDefined();
      const time = clockOf(tevila!.start, NEW_YORK.tz);
      expect(time).not.toBe(clockOf(tevila!.start));

      expect(screen.getByText(he('taharah.stage.shivaNekiim.hint', { day: 7 }))).toBeOnTheScreen();
      expect(screen.getByText(he('taharah.task.from', { time }))).toBeOnTheScreen();
    });
  });
});
