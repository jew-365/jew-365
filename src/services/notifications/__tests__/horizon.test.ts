jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

import { DateTime } from 'luxon';
import { buildPlan } from '../plan';
import { HORIZON_END_KIND, HORIZON_MAX_DAYS, IOS_HEADROOM, IOS_MAX, PENDING_LIMIT } from '../ids';
import type { PlanInput } from '../types';
import { CITIES } from '@/data/cities';
import { MITZVOT } from '@/data/mitzvot';
import { rulesFor } from '@/data/taharahPresets';
import { HebcalService } from '@/services/HebcalService';
import { DEFAULT_ON_MITZVOT } from '@/stores/useMitzvotStore';
import { DEFAULT_HILULA_NOTICES, DEFAULT_ROSH_CHODESH_NOTICES } from '@/stores/useUserStore';
import { at } from '@/testing/zmanim';
import { t } from '@/i18n';
import { isQuietAt } from '@/utils/skipRules';
import type { QuietHours } from '@/utils/quietHours';
import type { Mitzvah } from '@/types/mitzvah';
import { planHorizonEnd } from '../planners/horizonEnd';

const JERUSALEM = CITIES[0];
const SUNDAY = at(JERUSALEM, '2026-11-08T05:00');
const DEFAULT_MITZVOT = MITZVOT.filter((mitzvah) => DEFAULT_ON_MITZVOT.includes(mitzvah.id));
const IOS_ROOM = IOS_MAX - IOS_HEADROOM - 1;

function planInput(overrides: Partial<PlanInput> = {}): PlanInput {
  const now = overrides.now ?? SUNDAY;
  return {
    now,
    fromDate: now,
    platform: 'android',
    hasPermission: true,
    language: 'he',
    location: JERUSALEM,
    settings: { nusach: 'ashkenaz', halachicOpinions: { ksSofZman: 'GRA' }, inIsrael: true },
    mitzvot: DEFAULT_MITZVOT,
    reminderOverrides: {},
    completions: {},
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
    ...overrides,
  };
}

const dayOf = (instant: Date) => DateTime.fromJSDate(instant).setZone(JERUSALEM.tz).toISODate()!;
const mitzvahDay = (id: string) => id.split('__')[1];
const endNotice = (plan: ReturnType<typeof buildPlan>) => plan.find(({ data }) => data.kind === HORIZON_END_KIND);

describe('the planning horizon', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it('reaches HORIZON_MAX_DAYS on Android, keeps every reminder and is not thinned', () => {
    const plan = buildPlan(planInput());
    const days = new Set(plan.filter(({ id }) => id.includes('__')).map(({ id }) => mitzvahDay(id)));

    expect(plan.length).toBeLessThanOrEqual(PENDING_LIMIT);
    expect(days.has('2026-11-08')).toBe(true);
    expect(days.has('2026-12-06')).toBe(true);
    expect(warn).not.toHaveBeenCalled();
    expect(plan.filter(({ id }) => id.startsWith('shacharit__2026-11-20')).length).toBe(2);
  });

  it('fills the iOS slots and keeps every reminder of days one and two', () => {
    const ios = buildPlan(planInput({ platform: 'ios' }));
    const android = buildPlan(planInput());
    const ofDays = (plan: typeof ios, days: string[]) =>
      plan.filter(({ id }) => id.includes('__') && days.includes(mitzvahDay(id))).map(({ id }) => id);

    expect(ios).toHaveLength(IOS_ROOM + 1);
    expect(ofDays(ios, ['2026-11-08', '2026-11-09'])).toEqual(ofDays(android, ['2026-11-08', '2026-11-09']));
  });

  it('keeps one reminder per mitzvah window from day three on, the latest one before the window ends', () => {
    const plan = buildPlan(planInput({ platform: 'ios' }));
    const windowsFrom = (key: string) => {
      const counts = new Map<string, number>();
      for (const { id, data } of plan) {
        if (!id.includes('__') || mitzvahDay(id) !== key) continue;
        counts.set(data.mitzvahId!, (counts.get(data.mitzvahId!) ?? 0) + 1);
      }
      return [...counts.values()];
    };

    expect(Math.max(...windowsFrom('2026-11-10'))).toBe(1);
    expect(Math.max(...windowsFrom('2026-11-08'))).toBeGreaterThan(1);
    for (const { id, trigger, data } of plan) {
      if (id.includes('__') && mitzvahDay(id) >= '2026-11-10') {
        expect(trigger.getTime()).toBeLessThanOrEqual(new Date(data.windowEnd!).getTime());
      }
    }
  });

  it('plans nothing strictly inside a holy block', () => {
    const plan = buildPlan(planInput());

    expect(plan.filter(({ trigger }) => isQuietAt(trigger, JERUSALEM)).map(({ id }) => id)).toEqual([]);
    const shabbat = HebcalService.holyBlockAt(at(JERUSALEM, '2026-11-14T12:00'), JERUSALEM)!;
    expect(
      plan.filter(
        ({ trigger }) => trigger.getTime() > shabbat.start.getTime() && trigger.getTime() < shabbat.end.getTime(),
      ),
    ).toEqual([]);
  });

  it('is ordered by trigger', () => {
    const triggers = buildPlan(planInput({ platform: 'ios' })).map(({ trigger }) => trigger.getTime());

    expect([...triggers].sort((a, b) => a - b)).toEqual(triggers);
  });
});

describe('the end notice', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it('is one candidate on the system channel with no category, worded in both dictionaries', () => {
    const notice = endNotice(buildPlan(planInput({ platform: 'ios' })))!;

    expect(notice.id).toBe(`${HORIZON_END_KIND}:${dayOf(notice.trigger)}`);
    expect(notice.id).not.toContain('__');
    expect(notice.channel).toBe('system');
    expect(notice.categoryIdentifier).toBeUndefined();
    expect(notice.data).toEqual({ kind: HORIZON_END_KIND });
    expect(notice.title).toBe(t('notifications.horizonEnd.title'));
    expect(notice.body).toBe(t('notifications.horizonEnd.body'));
    expect(notice.title).toBe('התזכורות עומדות להיגמר');
    expect(notice.body).toBe('כדי שהתזכורות ימשיכו, פתחו את האפליקציה');
  });

  it('lands at 20:00 on the last day of a full 30-day Android plan', () => {
    const plan = buildPlan(planInput());
    const notice = endNotice(plan)!;
    const lastDay = DateTime.fromJSDate(SUNDAY)
      .setZone(JERUSALEM.tz)
      .plus({ days: HORIZON_MAX_DAYS - 1 })
      .set({ hour: 20, minute: 0, second: 0, millisecond: 0 });

    expect(plan.length).toBeLessThanOrEqual(PENDING_LIMIT);
    expect(lastDay.toISODate()).toBe('2026-12-07');
    expect(notice.trigger.getTime()).toBe(lastDay.toMillis());
  });

  it('lands at 20:00 of the last day whose reminders all fit, on iOS', () => {
    const plan = buildPlan(planInput({ platform: 'ios' }));
    const notice = endNotice(plan)!;
    const lastFull = dayOf(notice.trigger);
    const reminderDays = plan.filter(({ id }) => id.includes('__')).map(({ id }) => mitzvahDay(id));

    expect(plan).toHaveLength(IOS_ROOM + 1);
    expect(DateTime.fromJSDate(notice.trigger).setZone(JERUSALEM.tz).toFormat('HH:mm')).toBe('20:00');
    expect(reminderDays).toContain(lastFull);
    expect(lastFull > '2026-11-12').toBe(true);
    expect(lastFull < '2026-11-24').toBe(true);
  });

  it('moves to the exit of the block that covers 20:00', () => {
    const friday = new Date(2026, 10, 13);
    const shabbat = HebcalService.holyBlockAt(at(JERUSALEM, '2026-11-14T12:00'), JERUSALEM)!;

    const [notice] = planHorizonEnd(planInput(), friday);

    expect(notice.trigger.getTime()).toBe(shabbat.end.getTime());
    expect(notice.id).toBe(`${HORIZON_END_KIND}:2026-11-13`);
  });

  it('stays at 20:00 on a weekday', () => {
    const [notice] = planHorizonEnd(planInput(), new Date(2026, 10, 10));

    expect(notice.trigger.getTime()).toBe(at(JERUSALEM, '2026-11-10T20:00').getTime());
  });

  it('is left out when its time has already passed', () => {
    expect(planHorizonEnd(planInput({ now: at(JERUSALEM, '2026-11-10T21:00') }), new Date(2026, 10, 10))).toEqual([]);
  });

  it('is absent without notification permission', () => {
    expect(buildPlan(planInput({ hasPermission: false }))).toEqual([]);
  });
});

describe('thinning edges and the end notice fallback', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  const window = (index = 0): Mitzvah => ({
    id: `edge_${index}`,
    name: { he: `בדיקה ${index}`, en: `Edge ${index}` },
    icon: 'custom',
    isCustom: true,
    timeType: 'range-within-day',
    category: 'daily-morning',
    group: 'mine',
    skipOn: [],
    nuschaotSupported: ['ashkenaz', 'sefard', 'edot_hamizrach', 'chabad'],
    defaultReminders: [{ anchor: 'start', offsetMin: 0, label: 'x' }],
    computeWindow: ({ zmanim }) => ({
      start: new Date(zmanim.netzHaChama.getTime() + (index + 1) * 60_000),
      end: new Date(zmanim.netzHaChama.getTime() + 600 * 60_000),
    }),
  });

  it('does not thin the weekday after a Shabbat the opening stretched through', () => {
    const friday = at(JERUSALEM, '2026-11-13T08:00');
    const sundayIds = (plan: ReturnType<typeof buildPlan>) =>
      plan.filter(({ id }) => id.includes('__') && mitzvahDay(id) === '2026-11-15').map(({ id }) => id);

    const ios = buildPlan(planInput({ now: friday, platform: 'ios' }));
    const android = buildPlan(planInput({ now: friday }));

    expect(sundayIds(android).length).toBeGreaterThan(0);
    expect(sundayIds(ios)).toEqual(sundayIds(android));
  });

  it('keeps the earliest trigger of a thinned window that holds only a follow-up', () => {
    const followUpOnly: Mitzvah = {
      ...window(0),
      id: 'edge_followup',
      defaultReminders: [{ anchor: 'followUp', offsetMin: 60, label: 'x' }],
    };

    const plan = buildPlan(planInput({ platform: 'ios', mitzvot: [...DEFAULT_MITZVOT, followUpOnly] }));

    expect(plan.some(({ id }) => id === 'edge_followup__2026-11-11__0')).toBe(true);
  });

  it('sends the end notice at the last kept trigger when the cut lands tomorrow and 20:00 has passed', () => {
    const tuesdayNight = at(JERUSALEM, '2026-11-10T21:00');
    const many = Array.from({ length: 100 }, (_, index) => window(index));

    const plan = buildPlan(planInput({ now: tuesdayNight, platform: 'ios', mitzvot: many }));
    const notice = endNotice(plan)!;
    const others = plan.filter(({ data }) => data.kind !== HORIZON_END_KIND);

    expect(plan).toHaveLength(IOS_ROOM + 1);
    expect(notice).toBeDefined();
    expect(notice.trigger.getTime()).toBe(others[others.length - 1].trigger.getTime());
    expect(notice.id).toBe(`${HORIZON_END_KIND}:2026-11-10`);
  });

  it('falls back to a few minutes from now when the last kept trigger has passed, and never inside a block', () => {
    const now = at(JERUSALEM, '2026-11-10T21:00');
    const day = new Date(2026, 10, 10);

    const [soon] = planHorizonEnd(planInput({ now }), day, at(JERUSALEM, '2026-11-10T20:30'));
    const shabbat = HebcalService.holyBlockAt(at(JERUSALEM, '2026-11-14T12:00'), JERUSALEM)!;
    const [moved] = planHorizonEnd(planInput({ now }), day, at(JERUSALEM, '2026-11-13T22:00'));

    expect(soon.trigger.getTime()).toBe(now.getTime() + 5 * 60_000);
    expect(moved.trigger.getTime()).toBe(shabbat.end.getTime());
  });
});

describe('the end notice in quiet hours', () => {
  const hoursOf = (before: number | null, after: number | null): QuietHours => ({ before, after });
  const triggerOf = (quietHours: QuietHours, day: Date, { now, fallbackAt }: { now?: Date; fallbackAt?: Date } = {}) =>
    planHorizonEnd(planInput({ quietHours, ...(now && { now }) }), day, fallbackAt).map((n) => n.trigger.getTime());
  const TUESDAY = new Date(2026, 10, 10);
  const FRIDAY = new Date(2026, 10, 13);

  it('1 moves 20:00 back to the last open hour', () => {
    expect(triggerOf(hoursOf(null, 1140), TUESDAY)).toEqual([at(JERUSALEM, '2026-11-10T19:00').getTime()]);
  });

  it('2 moves 20:00 forward to the first open hour', () => {
    expect(triggerOf(hoursOf(1260, null), TUESDAY)).toEqual([at(JERUSALEM, '2026-11-10T21:00').getTime()]);
  });

  it('3 keeps 20:00 when the open hours hold it', () => {
    expect(triggerOf(hoursOf(420, 1320), TUESDAY)).toEqual([at(JERUSALEM, '2026-11-10T20:00').getTime()]);
  });

  it('4 moves the exit of the block that covers the hour to the next day, or drops it with no day to wait for', () => {
    const exit = HebcalService.holyBlockAt(at(JERUSALEM, '2026-11-14T12:00'), JERUSALEM)!.end;

    expect(exit.getTime()).toBeGreaterThan(at(JERUSALEM, '2026-11-14T17:00').getTime());
    expect(triggerOf(hoursOf(null, 1020), FRIDAY)).toEqual([at(JERUSALEM, '2026-11-15T17:00').getTime()]);
    expect(triggerOf(hoursOf(420, 1020), FRIDAY)).toEqual([at(JERUSALEM, '2026-11-15T07:00').getTime()]);
  });

  it('5 moves a fallback inside the quiet night to the first open hour', () => {
    const now = at(JERUSALEM, '2026-11-10T22:30');

    expect(triggerOf(hoursOf(420, 1320), TUESDAY, { now, fallbackAt: at(JERUSALEM, '2026-11-10T22:40') })).toEqual([
      at(JERUSALEM, '2026-11-11T07:00').getTime(),
    ]);
  });

  it('6 is left out when the next hour it could wait for falls inside a block', () => {
    const now = at(JERUSALEM, '2026-11-12T23:00');

    expect(
      triggerOf(hoursOf(null, 1140), new Date(2026, 10, 12), { now, fallbackAt: at(JERUSALEM, '2026-11-12T23:10') }),
    ).toEqual([]);
  });
});
