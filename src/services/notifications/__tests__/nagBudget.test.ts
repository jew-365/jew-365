jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

import { buildPlan } from '../plan';
import { HORIZON_END_KIND, IOS_HEADROOM, IOS_MAX } from '../ids';
import type { PlanInput, ScheduleCandidate } from '../types';
import { CITIES } from '@/data/cities';
import { MITZVOT } from '@/data/mitzvot';
import { rulesFor } from '@/data/taharahPresets';
import { DEFAULT_HILULA_NOTICES, DEFAULT_ROSH_CHODESH_NOTICES } from '@/stores/useUserStore';
import { at } from '@/testing/zmanim';
import type { NagLevel } from '@/types/mitzvah';
import { DateTime } from 'luxon';

const J = CITIES[0];
// The everyday default-on set: 6 reminders a day on a plain weekday (one each since the reminder placement of
// 2026-11-08), and the smart nag's notifications on top.
const DAILY = ['tefillin', 'krias_shma_shacharit', 'shacharit', 'mincha', 'maariv', 'krias_shma_al_hamita'];
const MITZVOT_DAILY = MITZVOT.filter((m) => DAILY.includes(m.id));
// Tuesday 2026-11-10 before dawn in Jerusalem: Tuesday and Wednesday are plain weekdays, and no
// check-in of the last Shabbat is still open to take a slot.
const BEFORE_DAWN = at(J, '2026-11-10T03:00');
const TODAY = '2026-11-10';
const TOMORROW = '2026-11-11';
const IOS_ROOM = IOS_MAX - IOS_HEADROOM - 1;

function planInput(now: Date, platform: PlanInput['platform'], nagLevel: NagLevel): PlanInput {
  return {
    now,
    fromDate: now,
    platform,
    hasPermission: true,
    language: 'he',
    location: J,
    settings: { nusach: 'ashkenaz', halachicOpinions: { ksSofZman: 'GRA' }, inIsrael: true },
    mitzvot: MITZVOT_DAILY,
    reminderOverrides: {},
    nagLevel,
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
  };
}

const onDay = (plan: ScheduleCandidate[], day: string) => plan.filter((c) => c.data.dateKey === day);
const mains = (plan: ScheduleCandidate[]) => plan.filter((c) => c.data.mitzvahId && !c.data.nag);
const nags = (plan: ScheduleCandidate[]) => plan.filter((c) => c.data.nag);
const ids = (plan: ScheduleCandidate[]) => plan.map((c) => c.id).sort();
const byTime = (plan: ScheduleCandidate[]) => [...plan].sort((a, b) => a.trigger.getTime() - b.trigger.getTime());
const localDay = (instant: Date) => DateTime.fromJSDate(instant).setZone(J.tz).toISODate();

// The plan with room for everything: the same input on Android, today and tomorrow alone.
const unbounded = (now: Date, level: NagLevel) =>
  buildPlan(planInput(now, 'android', level)).filter((c) => c.data.dateKey === TODAY || c.data.dateKey === TOMORROW);
const perWindow = (plan: ScheduleCandidate[]) => {
  const counts = new Map<string, number>();
  for (const c of plan)
    counts.set(`${c.data.mitzvahId}|${c.data.dateKey}`, (counts.get(`${c.data.mitzvahId}|${c.data.dateKey}`) ?? 0) + 1);
  return [...counts.values()];
};

describe('the keep order inside the cap', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it('sends the 6 reminders a day at every level, and more nags the higher the level', () => {
    let previous = -1;
    for (const level of [1, 2, 3, 4] as const) {
      const full = unbounded(BEFORE_DAWN, level);
      for (const day of [TODAY, TOMORROW]) expect(mains(onDay(full, day))).toHaveLength(6);
      const count = nags(onDay(full, TODAY)).length;
      expect(count).toBeGreaterThan(previous);
      previous = count;
    }
  });

  it('keeps every reminder of today and tomorrow on iOS and gives up the latest nags first', () => {
    for (const level of [1, 3, 4] as const) {
      const plan = buildPlan(planInput(BEFORE_DAWN, 'ios', level));
      const full = unbounded(BEFORE_DAWN, level);
      expect(plan.length).toBeLessThanOrEqual(IOS_ROOM + 1);
      for (const day of [TODAY, TOMORROW]) expect(ids(mains(onDay(plan, day)))).toEqual(ids(mains(onDay(full, day))));
      // The opening's nags kept are its nearest.
      const opening = byTime(nags(full));
      const kept = nags(plan.filter((c) => c.data.dateKey === TODAY || c.data.dateKey === TOMORROW));
      expect(ids(kept)).toEqual(ids(opening.slice(0, kept.length)));
      expect(localDay(plan.find((c) => c.data.kind === HORIZON_END_KIND)!.trigger)! >= TOMORROW).toBe(true);
    }
  });

  it('keeps every nag of the day on iOS at level 4 when the plan is built at 10:00', () => {
    const ten = at(J, '2026-11-10T10:00');
    const plan = buildPlan(planInput(ten, 'ios', 4));
    const full = unbounded(ten, 4);
    expect(nags(onDay(full, TODAY)).length).toBeGreaterThan(0);
    expect(ids(onDay(plan, TODAY))).toEqual(ids(onDay(full, TODAY)));
  });

  it('gives up the nags of the later days before any reminder on Android, at levels 1 and 4', () => {
    for (const level of [1, 4] as const) {
      const plan = buildPlan(planInput(BEFORE_DAWN, 'android', level));
      expect(warn).not.toHaveBeenCalled();
      const full = unbounded(BEFORE_DAWN, level);
      expect(ids(onDay(plan, TODAY))).toEqual(ids(onDay(full, TODAY)));
      expect(ids(onDay(plan, TOMORROW))).toEqual(ids(onDay(full, TOMORROW)));
      const later = plan.filter((c) => c.data.dateKey && c.data.dateKey > TOMORROW);
      expect(nags(later)).toEqual([]);
      // Every reminder of every later day: each window keeps its one reminder.
      expect(perWindow(later).every((n) => n === 1)).toBe(true);
      expect(mains(later).length).toBeGreaterThan(100);
      expect(new Set(later.map((c) => c.data.dateKey)).size).toBeGreaterThanOrEqual(27);
    }
  });
});
