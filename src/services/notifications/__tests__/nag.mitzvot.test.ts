jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

jest.mock('@/services/notifications/ids', () => ({
  ...jest.requireActual('@/services/notifications/ids'),
  HORIZON_MAX_DAYS: 2,
}));
jest.mock('@/services/notifications/planners/horizonEnd', () => ({ planHorizonEnd: () => [] }));

import { DateTime } from 'luxon';
import { buildPlan } from '../plan';
import { nextReminderAt, planMitzvot, windowNotificationCount, windowSends } from '../planners/mitzvot';
import { horizonFor } from '../planners/horizon';
import { parseId } from '../ids';
import type { PlanInput, ScheduleCandidate } from '../types';
import { CITIES } from '@/data/cities';
import { MITZVOT } from '@/data/mitzvot';
import { rulesFor } from '@/data/taharahPresets';
import { DEFAULT_HILULA_NOTICES, DEFAULT_ROSH_CHODESH_NOTICES } from '@/stores/useUserStore';
import { at } from '@/testing/zmanim';
import { NUSACH_IDS } from '@/data/nuschaot';
import type { Mitzvah, NagLevel, Reminder, UserSettings } from '@/types/mitzvah';
import { ZmanimService } from '@/services/ZmanimService';
import { locationNoon } from '@/utils/locationDay';
import type { QuietHours } from '@/utils/quietHours';
import { messageOf } from '@/testing/notifications';

const J = CITIES[0];
const ALL_NUSCHAOT: Mitzvah['nuschaotSupported'] = [...NUSACH_IDS];
const SETTINGS: UserSettings = { nusach: 'ashkenaz', halachicOpinions: { ksSofZman: 'GRA' }, inIsrael: true };
// Wednesday 2026-11-11, a plain weekday in Jerusalem.
const NIGHT_BEFORE = at(J, '2026-11-11T00:30');
const MIN = 60_000;

const registry = (id: string) => MITZVOT.find((m) => m.id === id)!;
const SHACHARIT = registry('shacharit');
const BEDTIME_SHEMA = registry('krias_shma_al_hamita');
const CANDLES = registry('candle_lighting');

const r = (anchor: Reminder['anchor'], offsetMin: number): Reminder => ({ anchor, offsetMin, label: 'x' });

// A window from `startMin` to `endMin` minutes after the location's midnight of every day, or of
// `onlyOn` alone.
function fixture(
  id: string,
  startMin: number,
  endMin: number,
  reminders: Reminder[],
  extra: Partial<Mitzvah> & { onlyOn?: string } = {},
): Mitzvah {
  const { onlyOn, ...rest } = extra;
  return {
    id,
    name: { he: id, en: id },
    icon: 'custom',
    timeType: 'range-within-day',
    category: 'daily-morning',
    group: 'mine',
    skipOn: [],
    nuschaotSupported: ALL_NUSCHAOT,
    defaultReminders: reminders,
    computeWindow: ({ zmanim, location }) => {
      const midnight = DateTime.fromJSDate(zmanim.chatzot, { zone: location.tz }).startOf('day');
      if (onlyOn && midnight.toISODate() !== onlyOn) return null;
      return {
        start: midnight.plus({ minutes: startMin }).toJSDate(),
        end: midnight.plus({ minutes: endMin }).toJSDate(),
      };
    },
    ...rest,
  };
}

type Options = {
  level?: NagLevel;
  levels?: Record<string, NagLevel>;
  overrides?: Record<string, Reminder[]>;
  quietHours?: QuietHours;
  completions?: PlanInput['completions'];
  platform?: PlanInput['platform'];
};

function planInput(mitzvot: Mitzvah[], now: Date, options: Options = {}): PlanInput {
  return {
    now,
    fromDate: now,
    platform: options.platform ?? 'android',
    hasPermission: true,
    language: 'he',
    location: J,
    settings: SETTINGS,
    mitzvot,
    reminderOverrides: options.overrides ?? {},
    ...(options.level ? { nagLevel: options.level } : {}),
    ...(options.levels ? { nagLevels: options.levels } : {}),
    completions: options.completions ?? {},
    skipped: {},
    checkIns: {},
    enabledSince: {},
    hilulotEnabled: false,
    roshChodeshEnabled: false,
    hilulaNotices: DEFAULT_HILULA_NOTICES,
    roshChodeshNotices: DEFAULT_ROSH_CHODESH_NOTICES,
    weeklyReportEnabled: false,
    taharahEnabled: false,
    taharah: {
      events: [],
      settings: { preset: 'ashkenaz', rules: rulesFor('ashkenaz'), role: 'woman' },
      discreet: true,
      leads: { hefsekLeadMin: 90, bedikaEveningLeadMin: 60, tevilaPrepLeadMin: 180 },
    },
    ...(options.quietHours ? { quietHours: options.quietHours } : {}),
  };
}

const plan = (mitzvot: Mitzvah[], now: Date, options?: Options) => buildPlan(planInput(mitzvot, now, options));
const of = (candidates: ScheduleCandidate[], id: string, day?: string) =>
  candidates.filter((c) => c.id.startsWith(`${id}__${day ?? ''}`));
const pairs = (candidates: ScheduleCandidate[]) => candidates.map((c) => [c.id, c.trigger.getTime()]);
const clock = (instant: string) => at(J, instant).getTime();

const MINCHA = registry('mincha');
const DAY = '2026-11-11';

// The window of `mitzvah` on a location date, as the planner computes it.
function windowOf(mitzvah: Mitzvah, key = DAY) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const zmanim = ZmanimService.getZmanim(locationNoon(date, J), J)!;
  return { ...mitzvah.computeWindow({ date, location: J, settings: SETTINGS, zmanim })!, zmanim };
}
const nags = (candidates: ScheduleCandidate[]) => candidates.filter((c) => c.data.nag);
const reminders = (candidates: ScheduleCandidate[]) => candidates.filter((c) => !c.data.nag);
const times = (candidates: ScheduleCandidate[]) => candidates.map((c) => c.trigger.getTime());
const gaps = (candidates: ScheduleCandidate[]) =>
  times(candidates)
    .sort((a, b) => a - b)
    .slice(1)
    .map((t, i, all) => t - (i ? all[i - 1] : times(candidates).sort((a, b) => a - b)[0]));

describe('the last-chance points', () => {
  it('go out at level 1 too: Shacharit’s reminders once each, then the last time to start alone', () => {
    const { end } = windowOf(SHACHARIT);
    const day = of(plan([SHACHARIT], NIGHT_BEFORE), 'shacharit', DAY);
    expect(reminders(day).map((c) => c.id)).toEqual([`shacharit__${DAY}__0`, `shacharit__${DAY}__1`]);
    // The minyan point, 45 minutes before the end, falls on the before-the-end reminder and is not sent twice.
    expect(pairs(nags(day))).toEqual([[`shacharit__${DAY}__n1`, end.getTime() - 20 * MIN]]);
    expect(nags(day)[0].data.nag).toEqual({ k: 1, of: 1, kind: 'lastChance', lastChance: 'alone' });
    expect(messageOf(nags(day)[0])).toBe('הזמן האחרון להתחיל');
    expect(nags(day)[0].data.skipIfDone).toBe(true);
  });

  it('give a prayer both points, with a minyan and alone, whatever the prayer mode', () => {
    const { end } = windowOf(MINCHA);
    const day = nags(of(plan([MINCHA], NIGHT_BEFORE), 'mincha', DAY));
    expect(day.map((c) => [c.data.nag?.lastChance, c.trigger.getTime()])).toEqual([
      ['minyan', end.getTime() - 20 * MIN],
      ['alone', end.getTime() - 10 * MIN],
    ]);
    expect(day.map(messageOf)).toEqual(['הזמן האחרון להתחיל במניין', 'הזמן האחרון להתחיל']);
  });

  it('take a custom mitzvah’s own minutes', () => {
    const custom = fixture('custom_x', 600, 720, [r('start', 0)], { performMin: { alone: 30 } });
    const day = nags(of(plan([custom], NIGHT_BEFORE), 'custom_x', DAY));
    expect(times(day)).toEqual([clock(`${DAY}T11:30`)]);
  });

  it('are not sent once the day is marked, nor when the end of the time leaves no room', () => {
    const completions = { [DAY]: { mincha: Date.now() } };
    expect(of(plan([MINCHA], NIGHT_BEFORE, { completions }), 'mincha', DAY)).toEqual([]);
    const short = fixture('short', 600, 603, [r('start', 0)]);
    expect(nags(of(plan([short], NIGHT_BEFORE), 'short', DAY))).toEqual([]);
  });

  it('are left to the last night by Kiddush Levana, whose period ends by the molad', () => {
    for (const day of planMitzvot(planInput([registry('kiddush_levana')], NIGHT_BEFORE), horizonFor(NIGHT_BEFORE, J))) {
      expect(day.data.nag?.kind).not.toBe('lastChance');
    }
  });
});

describe('the critical zone', () => {
  it('puts the level’s nags into the last third of a day window, before the earliest last-chance point', () => {
    const { start, end } = windowOf(MINCHA);
    const third = end.getTime() - (end.getTime() - start.getTime()) / 3;
    for (const level of [2, 3, 4] as const) {
      const day = of(plan([MINCHA], NIGHT_BEFORE, { level }), 'mincha', DAY);
      const zone = nags(day).filter((c) => c.data.nag?.kind === 'zone');
      expect(zone.length).toBeGreaterThan(0);
      expect(zone.length).toBeLessThanOrEqual(level - 1);
      for (const c of zone) {
        expect(c.trigger.getTime()).toBeGreaterThanOrEqual(third);
        expect(c.trigger.getTime()).toBeLessThan(end.getTime() - 20 * MIN);
        // The title names the mitzvah, so the body does not repeat it.
        expect(messageOf(c)).toBe('עוד לא סימנת');
      }
      // No two notifications of the window closer than ten minutes, the reminders included.
      for (const gap of gaps(day)) expect(gap).toBeGreaterThanOrEqual(10 * MIN);
      // Numbered in time order.
      expect(nags(day).map((c) => c.data.nag?.k)).toEqual(nags(day).map((_, i) => i + 1));
      expect(nags(day).map((c) => c.id)).toEqual(nags(day).map((_, i) => `mincha__${DAY}__n${i + 1}`));
    }
  });

  it('takes a mitzvah’s own level over the app’s', () => {
    const own = of(plan([MINCHA], NIGHT_BEFORE, { level: 1, levels: { mincha: 4 } }), 'mincha', DAY);
    const app = of(plan([MINCHA], NIGHT_BEFORE, { level: 4 }), 'mincha', DAY);
    expect(pairs(own)).toEqual(pairs(app));
    expect(nags(own).length).toBeGreaterThan(2);
  });

  it('nags the bedtime Shema from its 23:00 reminder to chatzot, an hour apart after it, then before alot', () => {
    const { end, zmanim } = windowOf(BEDTIME_SHEMA);
    const day = of(plan([BEDTIME_SHEMA], NIGHT_BEFORE, { level: 3 }), 'krias_shma_al_hamita', DAY);
    const reminder = reminders(day)[0].trigger.getTime();
    expect(reminder).toBe(clock(`${DAY}T23:00`));
    const byKind = (kind: string) => nags(day).filter((c) => c.data.nag?.kind === kind);
    for (const c of byKind('zone')) {
      expect(c.trigger.getTime()).toBeGreaterThan(reminder);
      expect(c.trigger.getTime()).toBeLessThanOrEqual(zmanim.chatzotLayla.getTime());
    }
    const tail = times(byKind('sparse'));
    expect(tail.length).toBe(2);
    for (const t of tail) expect(t).toBeGreaterThan(zmanim.chatzotLayla.getTime());
    expect(tail[1] - tail[0]).toBeGreaterThanOrEqual(60 * MIN);
    expect(times(byKind('lastChance'))).toEqual([end.getTime() - 5 * MIN]);
  });

  it('sends nothing inside a holy block: candle lighting has no nag, Friday’s mincha none after it', () => {
    const friday = at(J, '2026-11-13T00:30');
    const day = plan([CANDLES, MINCHA], friday, { level: 4 });
    const lighting = windowOf(CANDLES, '2026-11-13').start.getTime();
    expect(nags(day.filter((c) => c.data.mitzvahId === 'candle_lighting'))).toEqual([]);
    const mincha = nags(day.filter((c) => c.data.mitzvahId === 'mincha' && c.data.dateKey === '2026-11-13'));
    expect(mincha.length).toBeGreaterThan(0);
    for (const t of times(mincha)) expect(t).toBeLessThanOrEqual(lighting);
  });

  it('moves a nag out of the quiet hours, and drops one the move would take past the end', () => {
    const quietHours: QuietHours = { before: 7 * 60, after: null };
    const day = of(plan([BEDTIME_SHEMA], NIGHT_BEFORE, { level: 3, quietHours }), 'krias_shma_al_hamita', DAY);
    // Everything after midnight and before alot would move to 07:00, after the end of the time.
    const midnight = clock('2026-11-12T00:00');
    for (const t of times(nags(day))) expect(t).toBeLessThan(midnight);
  });
});

describe('a custom mitzvah’s critical zone', () => {
  it('keeps the zone of a long window to the three hours before its last-chance point', () => {
    // 06:00 to 22:00, ten minutes to perform: the point at 21:50, the zone no earlier than 18:50.
    const custom = fixture('custom_long', 360, 1320, [r('start', 0)]);
    const zone = nags(of(plan([custom], NIGHT_BEFORE, { level: 4 }), 'custom_long', DAY)).filter(
      (c) => c.data.nag?.kind === 'zone',
    );
    expect(zone).toHaveLength(3);
    for (const t of times(zone)) {
      expect(t).toBeGreaterThanOrEqual(clock(`${DAY}T18:50`));
      expect(t).toBeLessThan(clock(`${DAY}T21:50`));
    }
  });

  it('nags hours across midnight like a night mitzvah: to chatzot, then an hour apart at the least', () => {
    const { zmanim } = windowOf(MINCHA);
    // 21:00 to 03:00.
    const custom = fixture('custom_night', 1260, 1620, [r('start', 0)]);
    const day = nags(of(plan([custom], NIGHT_BEFORE, { level: 3 }), 'custom_night', DAY));
    const byKind = (kind: string) => times(day.filter((c) => c.data.nag?.kind === kind));
    for (const t of byKind('zone')) expect(t).toBeLessThanOrEqual(zmanim.chatzotLayla.getTime());
    const tail = byKind('sparse');
    expect(tail.length).toBeGreaterThan(0);
    for (const t of tail) expect(t).toBeGreaterThan(zmanim.chatzotLayla.getTime());
  });
});

describe('the plan around the nags', () => {
  it('ignores the per-reminder nag an earlier version stored', () => {
    const legacy = { ...r('start', 0), nag: { count: 3, everyMin: 5, placement: 'after' } } as Reminder;
    const day = of(plan([MINCHA], NIGHT_BEFORE, { overrides: { mincha: [legacy] } }), 'mincha', DAY);
    expect(reminders(day)).toHaveLength(1);
    expect(nags(day).every((c) => c.data.nag?.kind === 'lastChance')).toBe(true);
  });

  it('keeps the nags still due once the reminders have gone out', () => {
    const all = of(plan([MINCHA], NIGHT_BEFORE, { level: 4 }), 'mincha', DAY);
    const lastReminder = Math.max(...times(reminders(all)));
    const later = of(plan([MINCHA], new Date(lastReminder + MIN), { level: 4 }), 'mincha', DAY);
    expect(pairs(later)).toEqual(pairs(all.filter((c) => c.trigger.getTime() > lastReminder + MIN)));
    expect(later.every((c) => c.data.nag)).toBe(true);
  });

  it('drops the nags before the reminders where the plan is thinned', () => {
    const horizon = horizonFor(NIGHT_BEFORE, J);
    const input = planInput([MINCHA], NIGHT_BEFORE, { level: 4 });
    const full = planMitzvot(input, horizon);
    const withoutNags = planMitzvot(input, horizon, horizon.days[0], 'nags');
    const one = planMitzvot(input, horizon, horizon.days[0], 'one');
    expect(nags(full).length).toBeGreaterThan(0);
    expect(pairs(withoutNags)).toEqual(pairs(reminders(full)));
    expect(nags(one)).toEqual([]);
  });

  it('never names a nag as the next reminder', () => {
    const all = of(plan([MINCHA], NIGHT_BEFORE, { level: 4 }), 'mincha', DAY);
    const lastReminder = Math.max(...times(reminders(all)));
    const scope = { ...planInput([MINCHA], new Date(lastReminder + MIN)), nagLevel: 4 as NagLevel };
    const next = nextReminderAt(MINCHA, MINCHA.defaultReminders, scope)!;
    expect(next.getTime()).toBeGreaterThan(clock('2026-11-12T00:00'));
    expect(parseId(of(plan([MINCHA], new Date(lastReminder + MIN)), 'mincha', '2026-11-12')[0].id)?.date).toBe(
      '2026-11-12',
    );
  });

  it('keeps a mark’s cancel by mitzvah and date reaching every nag', () => {
    for (const c of nags(of(plan([MINCHA], NIGHT_BEFORE, { level: 4 }), 'mincha', DAY))) {
      expect(parseId(c.id)).toMatchObject({ mitzvahId: 'mincha', date: DAY });
    }
  });
});

describe('the total a window sends, for the bell on home', () => {
  const scope = (level: NagLevel) => ({ location: J, settings: SETTINGS, nagLevel: level });
  const date = new Date(2026, 10, 11);

  it('equals what the plan schedules for that window, ahead of it, at every level', () => {
    for (const mitzvah of [SHACHARIT, MINCHA, BEDTIME_SHEMA]) {
      for (const level of [1, 2, 3, 4] as const) {
        const day = of(plan([mitzvah], NIGHT_BEFORE, { level }), mitzvah.id, DAY);
        expect(windowNotificationCount(mitzvah, mitzvah.defaultReminders, date, scope(level))).toEqual({
          total: day.length,
          nags: nags(day).length,
        });
        expect(windowSends(mitzvah, mitzvah.defaultReminders, date, scope(level))?.map(({ at: t }) => t)).toEqual(
          times(day),
        );
      }
    }
  });

  it('keeps counting the whole window whatever is marked or already sent', () => {
    const before = windowNotificationCount(MINCHA, MINCHA.defaultReminders, date, scope(4));
    expect(before!.total).toBeGreaterThan(3);
    expect(windowNotificationCount(MINCHA, MINCHA.defaultReminders, date, scope(4))).toEqual(before);
  });

  it('is null on a day with no window', () => {
    expect(windowNotificationCount(CANDLES, CANDLES.defaultReminders, date, scope(4))).toBeNull();
  });
});
