import { CITIES } from '../cities';
import { customToMitzvah } from '../customMitzvotAdapter';
import { HebcalService } from '@/services/HebcalService';
import { Completions, dateKey } from '@/stores/useCompletionsStore';
import { at, zmanimFor } from '@/testing/zmanim';
import type { CustomMitzvah, Mitzvah, UserSettings } from '@/types/mitzvah';
import type { Location } from '@/types/zmanim';
import { appDayWindow, buildDayTimeline } from '@/utils/buildDayTimeline';
import { checkInFor } from '@/utils/checkIn';
import { computeStats } from '@/utils/historyStats';
import { appDayEnd, appDayKey, locationNoon } from '@/utils/locationDay';

const JERUSALEM = CITIES[0];
const LOS_ANGELES = CITIES.find((city) => city.tz === 'America/Los_Angeles')!;
const SETTINGS: UserSettings = { nusach: 'ashkenaz', halachicOpinions: { ksSofZman: 'GRA' }, inIsrael: true };
const NIGHT_ID = 'custom_1800000000000_night';
const BEFORE_ALOT = '2026-10-28T03:30';
const AFTER_ALOT = '2026-10-28T05:00';

const custom = (overrides: Partial<CustomMitzvah> = {}): Mitzvah =>
  customToMitzvah({
    id: NIGHT_ID,
    name: 'לימוד לילה',
    startHHMM: '03:29',
    endHHMM: '03:31',
    reminders: [{ anchor: 'start', offsetMin: 0, label: 'לימוד לילה' }],
    skipOn: [],
    createdAt: 1800000000000,
    ...overrides,
  });

const windowOf = (mitzvah: Mitzvah, day: Date, location: Location = JERUSALEM) =>
  mitzvah.computeWindow({
    date: day,
    location,
    settings: SETTINGS,
    zmanim: zmanimFor(locationNoon(day, location), location),
  });

const timelineItem = (day: Date, completions: Completions) =>
  buildDayTimeline(day, [custom()], completions, JERUSALEM, SETTINGS, 'he', (key) => key).find(
    (item) => item.mitzvahId === NIGHT_ID,
  );

const markFromHome = (): Completions => {
  const now = at(JERUSALEM, BEFORE_ALOT);
  const window = appDayWindow(custom(), JERUSALEM, SETTINGS, now)!;
  return { [dateKey(window.date)]: { [NIGHT_ID]: now.getTime() } };
};

describe('a custom mitzvah between midnight and alot (03:29–03:31)', () => {
  it.each([
    ['a plain Tuesday', new Date(2026, 9, 27), '2026-10-28T03:29', '2026-10-28T03:31'],
    ['the Saturday before the fall-back night', new Date(2026, 9, 24), '2026-10-25T03:29', '2026-10-25T03:31'],
  ])('puts the hours of %s on the next date, inside its app day', (_name, day, startClock, endClock) => {
    const window = windowOf(custom(), day)!;
    expect(window.start.getTime()).toBe(at(JERUSALEM, startClock).getTime());
    expect(window.end.getTime()).toBe(at(JERUSALEM, endClock).getTime());
    expect(appDayKey(window.start, JERUSALEM)).toBe(dateKey(day));
  });

  it('shows home the window of the app day, before and after alot', () => {
    const before = at(JERUSALEM, BEFORE_ALOT);
    expect(appDayKey(before, JERUSALEM)).toBe('2026-10-27');
    const night = appDayWindow(custom(), JERUSALEM, SETTINGS, before)!;
    expect(dateKey(night.date)).toBe('2026-10-27');
    expect(night.start.getTime()).toBe(at(JERUSALEM, '2026-10-28T03:29').getTime());

    const after = at(JERUSALEM, AFTER_ALOT);
    expect(appDayKey(after, JERUSALEM)).toBe('2026-10-28');
    const next = appDayWindow(custom(), JERUSALEM, SETTINGS, after)!;
    expect(dateKey(next.date)).toBe('2026-10-28');
    expect(next.start.getTime()).toBe(at(JERUSALEM, '2026-10-29T03:29').getTime());
  });

  it('lists the window in the day view of its evening, done under the key home filed it', () => {
    const marks = markFromHome();
    expect(timelineItem(new Date(2026, 9, 27), marks)).toMatchObject({
      time: at(JERUSALEM, '2026-10-28T03:29'),
      done: true,
    });
    expect(timelineItem(new Date(2026, 9, 28), marks)).toMatchObject({
      time: at(JERUSALEM, '2026-10-29T03:29'),
      done: false,
    });
  });

  it('counts a mark made between midnight and alot for the previous day in history', () => {
    const marks = markFromHome();
    const beforeAlot = computeStats([custom()], marks, JERUSALEM, SETTINGS, 30, at(JERUSALEM, BEFORE_ALOT));
    expect(beforeAlot.daily.slice(-1)).toEqual([{ date: '2026-10-27', doneCount: 1, totalCount: 1, pendingCount: 0 }]);
    expect(beforeAlot.streak).toBe(1);

    const afterAlot = computeStats([custom()], marks, JERUSALEM, SETTINGS, 30, at(JERUSALEM, AFTER_ALOT));
    expect(afterAlot.daily.slice(-2)).toEqual([
      { date: '2026-10-27', doneCount: 1, totalCount: 1, pendingCount: 0 },
      { date: '2026-10-28', doneCount: 0, totalCount: 1, pendingCount: 1 },
    ]);
    expect(afterAlot.streak).toBe(1);
    expect(afterAlot.missedYesterday).toEqual([]);
  });

  it('judges its weekdays and its range on the evening it belongs to', () => {
    const tuesdays = custom({ activeDays: [2] });
    expect(windowOf(tuesdays, new Date(2026, 9, 26))).toBeNull();
    expect(windowOf(tuesdays, new Date(2026, 9, 27))?.start.getTime()).toBe(
      at(JERUSALEM, '2026-10-28T03:29').getTime(),
    );
    expect(windowOf(tuesdays, new Date(2026, 9, 28))).toBeNull();

    const ranged = custom({
      schedules: [{ from: '2026-10-01', schedule: { mode: 'range', start: '2026-10-27', end: '2026-10-27' } }],
    });
    expect(windowOf(ranged, new Date(2026, 9, 27))?.start.getTime()).toBe(at(JERUSALEM, '2026-10-28T03:29').getTime());
    expect(windowOf(ranged, new Date(2026, 9, 28))).toBeNull();
  });

  it('waits in the check-in of the Shabbat its night falls in, under the Friday', () => {
    const block = HebcalService.holyBlockOn(locationNoon(new Date(2026, 9, 31), JERUSALEM), JERUSALEM)!;
    expect(block.days).toEqual(['2026-10-31']);
    const checkIn = checkInFor(
      block,
      { mitzvot: [custom()], completions: {}, checkIns: {}, location: JERUSALEM, settings: SETTINGS },
      block.end,
    )!;
    expect(checkIn.days.map((day) => [day.key, day.items.map((item) => item.window.start.getTime())])).toEqual([
      ['2026-10-30', [at(JERUSALEM, '2026-10-31T03:29').getTime()]],
    ]);
  });

  it('has no window on the app day whose hours the fall-back night skips, so no instant counts twice', () => {
    const dawn = custom({ startHHMM: '05:00', endHHMM: '05:15' });
    expect(windowOf(dawn, new Date(2026, 9, 23))?.start.getTime()).toBe(at(JERUSALEM, '2026-10-24T05:00').getTime());
    expect(windowOf(dawn, new Date(2026, 9, 24))).toBeNull();
    expect(windowOf(dawn, new Date(2026, 9, 25))?.start.getTime()).toBe(at(JERUSALEM, '2026-10-25T05:00').getTime());
  });

  it.each([
    ['Jerusalem', JERUSALEM],
    ['Los Angeles', LOS_ANGELES],
  ])(
    'gives every app day one window that overlaps it and keys no instant twice, across the fall-back nights, in %s',
    (_name, location) => {
      const days = Array.from({ length: 15 }, (_, offset) => new Date(2026, 9, 20 + offset));
      const hours = [
        ['00:00', '00:30'],
        ['03:29', '03:31'],
        ['04:30', '05:00'],
        ['05:00', '05:30'],
        ['05:30', '06:00'],
        ['04:00', '06:00'],
        ['22:00', '01:00'],
        ['00:00', '23:59'],
      ];
      for (const [startHHMM, endHHMM] of hours) {
        const mitzvah = custom({ startHHMM, endHHMM });
        const windows = days.flatMap((day) => {
          const window = windowOf(mitzvah, day, location);
          return window ? [{ day, window }] : [];
        });
        for (const { day, window } of windows) {
          const alot = HebcalService.dawnAt(locationNoon(day, location), location);
          expect(window.start.getTime()).toBeLessThan(appDayEnd(day, location).getTime());
          expect(window.end.getTime()).toBeGreaterThan(alot.getTime());
        }
        const starts = windows.map(({ window }) => window.start.getTime());
        expect(new Set(starts).size).toBe(starts.length);
        expect(starts.length).toBeGreaterThanOrEqual(days.length - 1);
      }
    },
  );
});

describe('a custom mitzvah whose hours are not wholly before alot', () => {
  const startOf = (mitzvah: Mitzvah, day: Date) => windowOf(mitzvah, day)?.start.getTime() ?? null;

  it.each([
    ['January', new Date(2026, 0, 4)],
    ['June', new Date(2026, 5, 14)],
  ])('keeps a Sunday to Thursday morning window on its own weekdays in %s', (_month, sunday) => {
    const morning = custom({ startHHMM: '05:00', endHHMM: '07:00', activeDays: [0, 1, 2, 3, 4] });
    const days = Array.from({ length: 7 }, (_, offset) => new Date(2026, sunday.getMonth(), sunday.getDate() + offset));
    expect(sunday.getDay()).toBe(0);
    expect(days.map((day) => startOf(morning, day))).toEqual(
      days.map((day) => (day.getDay() <= 4 ? at(JERUSALEM, `${dateKey(day)}T05:00`).getTime() : null)),
    );
  });

  it('keeps an all-day window of one weekday on that day', () => {
    const tuesday = custom({ startHHMM: '00:00', endHHMM: '23:59', activeDays: [2] });
    const window = windowOf(tuesday, new Date(2026, 0, 6))!;
    expect(window.start.getTime()).toBe(at(JERUSALEM, '2026-01-06T00:00').getTime());
    expect(window.end.getTime()).toBe(at(JERUSALEM, '2026-01-06T23:59').getTime());
    expect(windowOf(tuesday, new Date(2026, 0, 5))).toBeNull();
    expect(windowOf(tuesday, new Date(2026, 0, 7))).toBeNull();
  });

  it('puts the hours on the evening before only while they end at or before alot', () => {
    const wholly = custom({ startHHMM: '04:30', endHHMM: '05:15' });
    const straddling = custom({ startHHMM: '04:30', endHHMM: '05:30' });
    const winterAlot = HebcalService.dawnAt(locationNoon(new Date(2026, 0, 5), JERUSALEM), JERUSALEM).getTime();
    expect(winterAlot).toBeGreaterThan(at(JERUSALEM, '2026-01-05T05:15').getTime());
    expect(winterAlot).toBeLessThan(at(JERUSALEM, '2026-01-05T05:30').getTime());
    expect(startOf(wholly, new Date(2026, 0, 4))).toBe(at(JERUSALEM, '2026-01-05T04:30').getTime());
    expect(startOf(straddling, new Date(2026, 0, 5))).toBe(at(JERUSALEM, '2026-01-05T04:30').getTime());
    const summerAlot = HebcalService.dawnAt(locationNoon(new Date(2026, 5, 15), JERUSALEM), JERUSALEM).getTime();
    expect(summerAlot).toBeLessThan(at(JERUSALEM, '2026-06-15T04:30').getTime());
    expect(startOf(wholly, new Date(2026, 5, 15))).toBe(at(JERUSALEM, '2026-06-15T04:30').getTime());
  });
});
