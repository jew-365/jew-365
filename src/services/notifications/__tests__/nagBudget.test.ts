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
// The everyday default-on set: 12 reminders a day on a plain weekday.
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
const mains = (plan: ScheduleCandidate[]) => plan.filter((c) => c.data.mitzvahId && !c.data.repeat);
const repeats = (plan: ScheduleCandidate[]) => plan.filter((c) => c.data.repeat);
const ids = (plan: ScheduleCandidate[]) => plan.map((c) => c.id).sort();
const localDay = (instant: Date) => DateTime.fromJSDate(instant).setZone(J.tz).toISODate();

// The plan with room for everything: the same input on Android, today and tomorrow alone.
const unbounded = (now: Date, level: NagLevel) =>
  buildPlan(planInput(now, 'android', level)).filter((c) => c.data.dateKey === TODAY || c.data.dateKey === TOMORROW);

describe('the keep order inside the cap', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it('has 12, 36 and 48 notifications a day at levels 1, 3 and 4', () => {
    for (const [level, perDay] of [
      [1, 12],
      [3, 36],
      [4, 48],
    ] as const) {
      const full = unbounded(BEFORE_DAWN, level);
      expect(onDay(full, TODAY)).toHaveLength(perDay);
      expect(onDay(full, TOMORROW)).toHaveLength(perDay);
    }
  });

  it('keeps every main of today and tomorrow and cuts tomorrow’s repeats first at level 3 on iOS', () => {
    const plan = buildPlan(planInput(BEFORE_DAWN, 'ios', 3));
    const full = unbounded(BEFORE_DAWN, 3);
    expect(plan).toHaveLength(IOS_ROOM + 1);
    expect(ids(onDay(plan, TODAY))).toEqual(ids(onDay(full, TODAY)));
    expect(ids(mains(onDay(plan, TOMORROW)))).toEqual(ids(mains(onDay(full, TOMORROW))));
    expect(repeats(onDay(plan, TOMORROW))).toHaveLength(IOS_ROOM - 36 - 12);
    // The repeats kept of tomorrow are its nearest.
    const tomorrowRepeats = repeats(onDay(full, TOMORROW)).sort((a, b) => a.trigger.getTime() - b.trigger.getTime());
    expect(ids(repeats(onDay(plan, TOMORROW)))).toEqual(ids(tomorrowRepeats.slice(0, IOS_ROOM - 48)));
    expect(plan.filter((c) => c.data.dateKey && c.data.dateKey > TOMORROW)).toEqual([]);
    expect(localDay(plan.find((c) => c.data.kind === HORIZON_END_KIND)!.trigger)).toBe(TOMORROW);
  });

  it('cuts exactly one repeat of today, the latest, at level 4 on iOS', () => {
    const plan = buildPlan(planInput(BEFORE_DAWN, 'ios', 4));
    const full = unbounded(BEFORE_DAWN, 4);
    expect(plan).toHaveLength(IOS_ROOM + 1);
    expect(ids(mains(onDay(plan, TODAY)))).toEqual(ids(mains(onDay(full, TODAY))));
    expect(ids(mains(onDay(plan, TOMORROW)))).toEqual(ids(mains(onDay(full, TOMORROW))));
    expect(repeats(onDay(plan, TOMORROW))).toEqual([]);
    const todayRepeats = repeats(onDay(full, TODAY)).sort((a, b) => a.trigger.getTime() - b.trigger.getTime());
    const missing = todayRepeats.filter((c) => !plan.some((kept) => kept.id === c.id));
    expect(missing.map((c) => c.id)).toEqual([todayRepeats[todayRepeats.length - 1].id]);
    expect(localDay(plan.find((c) => c.data.kind === HORIZON_END_KIND)!.trigger)).toBe(TOMORROW);
  });

  it('keeps every repeat of the day at level 4 on iOS when the plan is built at 10:00', () => {
    const ten = at(J, '2026-11-10T10:00');
    const plan = buildPlan(planInput(ten, 'ios', 4));
    const full = unbounded(ten, 4);
    expect(repeats(onDay(full, TODAY)).length).toBeGreaterThan(0);
    expect(ids(onDay(plan, TODAY))).toEqual(ids(onDay(full, TODAY)));
  });

  it('cuts nothing on Android at level 4 and keeps one main per window from the third day', () => {
    const plan = buildPlan(planInput(BEFORE_DAWN, 'android', 4));
    expect(warn).not.toHaveBeenCalled();
    expect(onDay(plan, TODAY)).toHaveLength(48);
    expect(onDay(plan, TOMORROW)).toHaveLength(48);
    const later = plan.filter((c) => c.data.dateKey && c.data.dateKey > TOMORROW);
    expect(repeats(later)).toEqual([]);
    const perWindow = new Map<string, number>();
    for (const c of later)
      perWindow.set(
        `${c.data.mitzvahId}|${c.data.dateKey}`,
        (perWindow.get(`${c.data.mitzvahId}|${c.data.dateKey}`) ?? 0) + 1,
      );
    expect([...perWindow.values()].every((n) => n === 1)).toBe(true);
    expect(new Set(later.map((c) => c.data.dateKey)).size).toBeGreaterThanOrEqual(27);
  });
});
