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
import { nextReminderAt, planMitzvot, windowNotificationCount, windowSends, windowTimeline } from '../planners/mitzvot';
import { horizonFor } from '../planners/horizon';
import { parseId } from '../ids';
import type { PlanInput, ScheduleCandidate } from '../types';
import { CITIES } from '@/data/cities';
import { MITZVOT } from '@/data/mitzvot';
import { rulesFor } from '@/data/taharahPresets';
import { DEFAULT_HILULA_NOTICES, DEFAULT_ROSH_CHODESH_NOTICES } from '@/stores/useUserStore';
import { at } from '@/testing/zmanim';
import { NUSACH_IDS } from '@/data/nuschaot';
import type { ManualNag, Mitzvah, NagLevel, Reminder, UserSettings } from '@/types/mitzvah';
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
  manual?: Record<string, ManualNag[]>;
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
    ...(options.manual ? { manualNagsByMitzvah: options.manual } : {}),
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
  it('go out at level 1 too: Shacharit’s reminder, the zone’s opener, the orange minyan point and the red one', () => {
    const { start, end } = windowOf(SHACHARIT);
    const day = of(plan([SHACHARIT], NIGHT_BEFORE), 'shacharit', DAY);
    expect(reminders(day).map((c) => c.id)).toEqual([`shacharit__${DAY}__0`]);
    const third = end.getTime() - (end.getTime() - start.getTime()) / 3;
    expect(pairs(nags(day))).toEqual([
      [`shacharit__${DAY}__n1`, third],
      [`shacharit__${DAY}__n2`, end.getTime() - 45 * MIN],
      [`shacharit__${DAY}__n3`, end.getTime() - 20 * MIN],
    ]);
    expect(nags(day).map((c) => c.data.nag)).toEqual([
      { k: 1, of: 3, kind: 'open' },
      { k: 2, of: 3, kind: 'lastChance', lastChance: 'minyan' },
      { k: 3, of: 3, kind: 'lastChance', lastChance: 'alone' },
    ]);
    expect(nags(day).map(messageOf)).toEqual([
      'נכנסת לזמן הקריטי, עוד לא סימנת',
      'הזמן האחרון להתחיל במניין',
      'הזמן האחרון להתחיל',
    ]);
    expect(nags(day).every((c) => c.data.skipIfDone)).toBe(true);
  });

  it('give a prayer both points, with a minyan and alone, whatever the prayer mode', () => {
    const { end } = windowOf(MINCHA);
    const day = nags(of(plan([MINCHA], NIGHT_BEFORE), 'mincha', DAY)).filter((c) => c.data.nag?.lastChance);
    expect(day.map((c) => [c.data.nag?.lastChance, c.trigger.getTime()])).toEqual([
      ['minyan', end.getTime() - 20 * MIN],
      ['alone', end.getTime() - 10 * MIN],
    ]);
    expect(day.map(messageOf)).toEqual(['הזמן האחרון להתחיל במניין', 'הזמן האחרון להתחיל']);
  });

  it('take a custom mitzvah’s own minutes, with the orange a quarter of an hour before the red', () => {
    const custom = fixture('custom_x', 600, 720, [r('start', 0)], { performMin: { alone: 30 } });
    const day = nags(of(plan([custom], NIGHT_BEFORE), 'custom_x', DAY));
    // The zone opens half an hour before the last-chance point at the latest: its opener at 11:00.
    expect(times(day)).toEqual([clock(`${DAY}T11:00`), clock(`${DAY}T11:15`), clock(`${DAY}T11:30`)]);
    expect(day.map((c) => c.data.nag?.lastChance)).toEqual([undefined, 'soon', 'alone']);
    expect(messageOf(day[1])).toBe('עוד מעט נגמר הזמן');
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

  it('nags the bedtime Shema in the two hours before chatzot, and nothing from chatzot to alot', () => {
    const { zmanim } = windowOf(BEDTIME_SHEMA);
    const day = of(plan([BEDTIME_SHEMA], NIGHT_BEFORE, { level: 3 }), 'krias_shma_al_hamita', DAY);
    expect(reminders(day)[0].trigger.getTime()).toBe(clock(`${DAY}T21:00`));
    const chatzot = zmanim.chatzotLayla.getTime();
    const byKind = (kind: string) => nags(day).filter((c) => c.data.nag?.kind === kind);
    expect(times(byKind('open'))).toEqual([chatzot - 120 * MIN]);
    expect(byKind('zone')).toHaveLength(2);
    for (const c of byKind('zone')) expect(c.trigger.getTime()).toBeGreaterThan(chatzot - 120 * MIN);
    expect(byKind('sparse')).toEqual([]);
    expect(times(byKind('lastChance'))).toEqual([chatzot - 20 * MIN, chatzot - 5 * MIN]);
    expect(Math.max(...times(nags(day)))).toBe(chatzot - 5 * MIN);
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

  it('nags hours across midnight like a night mitzvah: to chatzot, its last-chance points too, and nothing after', () => {
    const { zmanim } = windowOf(MINCHA);
    // 21:00 to 03:00.
    const custom = fixture('custom_night', 1260, 1620, [r('start', 0)]);
    const day = nags(of(plan([custom], NIGHT_BEFORE, { level: 3 }), 'custom_night', DAY));
    const chatzot = zmanim.chatzotLayla.getTime();
    expect(day.filter((c) => c.data.nag?.kind === 'zone')).toHaveLength(2);
    for (const t of times(day)) expect(t).toBeLessThanOrEqual(chatzot);
    expect(times(day.filter((c) => c.data.nag?.kind === 'lastChance'))).toEqual([
      chatzot - 20 * MIN,
      chatzot - 5 * MIN,
    ]);
  });
});

describe('the plan around the nags', () => {
  it('ignores the per-reminder nag an earlier version stored', () => {
    const legacy = { ...r('start', 0), nag: { count: 3, everyMin: 5, placement: 'after' } } as Reminder;
    const day = of(plan([MINCHA], NIGHT_BEFORE, { overrides: { mincha: [legacy] } }), 'mincha', DAY);
    expect(reminders(day)).toHaveLength(1);
    expect(nags(day).every((c) => c.data.nag?.kind === 'lastChance' || c.data.nag?.kind === 'open')).toBe(true);
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

describe('nags placed by hand on the timeline', () => {
  const placed: ManualNag[] = [
    { anchor: 'end', offsetMin: -10, kind: 'lastChance', lastChance: 'alone' },
    { anchor: 'end', offsetMin: -70, kind: 'zone' },
  ];

  it('are sent instead of the smart nag’s, numbered in time order, worded by their kind', () => {
    const { end } = windowOf(MINCHA);
    const day = of(plan([MINCHA], NIGHT_BEFORE, { level: 4, manual: { mincha: placed } }), 'mincha', DAY);
    expect(pairs(nags(day))).toEqual([
      [`mincha__${DAY}__n1`, end.getTime() - 70 * MIN],
      [`mincha__${DAY}__n2`, end.getTime() - 10 * MIN],
    ]);
    expect(nags(day).map((c) => c.data.nag)).toEqual([
      { k: 1, of: 2, kind: 'zone' },
      { k: 2, of: 2, kind: 'lastChance', lastChance: 'alone' },
    ]);
    expect(nags(day).map(messageOf)).toEqual(['עוד לא סימנת', 'הזמן האחרון להתחיל']);
    // The reminders are the mitzvah’s own, as before.
    const smart = of(plan([MINCHA], NIGHT_BEFORE, { level: 4 }), 'mincha', DAY);
    expect(pairs(reminders(day))).toEqual(pairs(reminders(smart)));
  });

  it('send nothing for an empty list, and only what lands inside the window and the open hours', () => {
    expect(nags(of(plan([MINCHA], NIGHT_BEFORE, { level: 4, manual: { mincha: [] } }), 'mincha', DAY))).toEqual([]);
    const { start, end } = windowOf(MINCHA);
    const outside: ManualNag[] = [
      { anchor: 'start', offsetMin: Math.round((end.getTime() - start.getTime()) / MIN) + 30, kind: 'zone' },
      ...placed,
    ];
    // Quiet hours after 16:00 on the location's clock: the nags near the end have nowhere to move to before it.
    const quietHours = { before: null, after: 16 * 60 };
    const day = of(plan([MINCHA], NIGHT_BEFORE, { manual: { mincha: outside }, quietHours }), 'mincha', DAY);
    expect(nags(day).every((c) => c.trigger.getTime() <= clock(`${DAY}T16:00`))).toBe(true);
    expect(nags(day).every((c) => c.trigger.getTime() <= end.getTime())).toBe(true);
  });

  it('are counted by windowNotificationCount and drawn by windowTimeline with their numbers and stages', () => {
    const date = new Date(2026, 10, 11);
    const scope = { location: J, settings: SETTINGS, nagLevel: 4 as const, manualNags: placed };
    expect(windowNotificationCount(MINCHA, MINCHA.defaultReminders, date, scope)).toEqual({
      total: MINCHA.defaultReminders.length + 2,
      nags: 2,
    });
    const timeline = windowTimeline(MINCHA, MINCHA.defaultReminders, date, scope)!;
    const { start, end } = windowOf(MINCHA);
    expect(timeline.window).toEqual({ start, end });
    expect(timeline.sends.map((send) => send.at)).toEqual(
      [...(windowSends(MINCHA, MINCHA.defaultReminders, date, scope) ?? [])].map((send) => send.at),
    );
    const last = timeline.sends[timeline.sends.length - 1];
    expect(last).toMatchObject({ type: 'nag', k: 2, kind: 'lastChance', lastChance: 'alone', stage: 'red' });
    // A zone nag is plain: only the warning is orange.
    expect(timeline.sends.find((send) => send.type === 'nag' && send.k === 1)?.stage).toBe('green');
    expect(timeline.sends.filter((send) => send.type === 'reminder').map((send) => send.stage)).toEqual(
      MINCHA.defaultReminders.map(() => 'green'),
    );
    // The zone is the last third, clipped to the window.
    const third = end.getTime() - (end.getTime() - start.getTime()) / 3;
    expect(timeline.zone).toEqual([{ start: new Date(third), end }]);
  });

  it('give the timeline the reminder index of each reminder dot', () => {
    const date = new Date(2026, 10, 11);
    const timeline = windowTimeline(SHACHARIT, SHACHARIT.defaultReminders, date, { location: J, settings: SETTINGS })!;
    const dots = timeline.sends.filter((send) => send.type === 'reminder');
    expect(dots.map((send) => (send.type === 'reminder' ? send.index : -1)).sort()).toEqual(
      SHACHARIT.defaultReminders.map((_, index) => index),
    );
    // On Shabbat the window is inside the holy block: the timeline draws it with nothing sent.
    const shabbat = windowTimeline(SHACHARIT, SHACHARIT.defaultReminders, new Date(2026, 10, 14), {
      location: J,
      settings: SETTINGS,
      nagLevel: 4,
    });
    expect(shabbat?.sends).toEqual([]);
  });
});
