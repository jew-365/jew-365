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
import { nextReminderAt } from '../planners/mitzvot';
import type { PlanInput } from '../types';
import { CITIES } from '@/data/cities';
import { rulesFor } from '@/data/taharahPresets';
import { DEFAULT_HILULA_NOTICES, DEFAULT_ROSH_CHODESH_NOTICES } from '@/stores/useUserStore';
import { at } from '@/testing/zmanim';
import type { Mitzvah, Reminder, UserSettings } from '@/types/mitzvah';
import { NO_QUIET_HOURS, type QuietHours } from '@/utils/quietHours';

const J = CITIES[0];
const ALL_NUSCHAOT: Mitzvah['nuschaotSupported'] = ['ashkenaz', 'sefard', 'edot_hamizrach', 'chabad'];
const SETTINGS: UserSettings = { nusach: 'ashkenaz', halachicOpinions: { ksSofZman: 'GRA' }, inIsrael: true };
const N0 = at(J, '2026-11-11T00:30');

const hours = (before: number | null, after: number | null): QuietHours => ({ before, after });
const r = (anchor: Reminder['anchor'], offsetMin: number): Reminder => ({ anchor, offsetMin, label: 'x' });

function fixture(id: string, startMin: number, endMin: number, reminders: Reminder[]): Mitzvah {
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
      return {
        start: midnight.plus({ minutes: startMin }).toJSDate(),
        end: midnight.plus({ minutes: endMin }).toJSDate(),
      };
    },
  };
}

const MORNING = fixture('morning', 300, 720, [r('start', 0), r('start', 90), r('start', 180)]);
const TWINS = fixture('twins', 480, 720, [r('start', 0), r('start', 0)]);
const TWINS_EARLY = fixture('twinsearly', 300, 720, [r('start', 0), r('start', 0)]);
const NIGHT = fixture('night', 1200, 1410, [r('start', 0), r('start', 150)]);
const LONG = fixture('long', 1200, 2160, [r('start', 150)]);
const FOLLOW = fixture('follow', 300, 360, [r('start', 0), r('followUp', 30)]);
const LATE_FOLLOW = fixture('latefollow', 1020, 1080, [r('followUp', 300)]);
const FULL = fixture('full', 0, 1440, [r('start', 0), r('followUp', 60)]);
const DAY = fixture('day', 300, 1380, [r('start', 0)]);

function planInput(mitzvah: Mitzvah, now: Date, quietHours?: QuietHours): PlanInput {
  return {
    now,
    fromDate: now,
    platform: 'android',
    hasPermission: true,
    language: 'he',
    location: J,
    settings: SETTINGS,
    mitzvot: [mitzvah],
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
    ...(quietHours ? { quietHours } : {}),
  };
}

const sum = (plan: ReturnType<typeof buildPlan>, id: string) =>
  plan
    .filter((candidate) => candidate.id.startsWith(`${id}__`))
    .map((candidate) => [candidate.id, candidate.trigger.getTime()]);

const planned = (mitzvah: Mitzvah, now: Date, quietHours?: QuietHours) =>
  sum(buildPlan(planInput(mitzvah, now, quietHours)), mitzvah.id);

const slot = (id: string, windowDay: string, index: number, instant: string): [string, number] => [
  `${id}__2026-11-${windowDay}__${index}`,
  at(J, `2026-11-${instant}`).getTime(),
];

describe('quiet hours in the mitzvah planner', () => {
  it('moves the early reminders of a morning window to the first hour and keeps one of two that land together', () => {
    expect(planned(MORNING, N0, hours(420, null))).toEqual([
      slot('morning', '11', 0, '11T07:00'),
      slot('morning', '11', 2, '11T08:00'),
      slot('morning', '12', 0, '12T07:00'),
      slot('morning', '12', 2, '12T08:00'),
    ]);
  });

  it('plans a reminder that was moved from before now, and the plain schedule drops it', () => {
    const now = at(J, '2026-11-11T06:45');
    expect(planned(MORNING, now, hours(420, null))).toEqual([
      slot('morning', '11', 0, '11T07:00'),
      slot('morning', '11', 2, '11T08:00'),
      slot('morning', '12', 0, '12T07:00'),
      slot('morning', '12', 2, '12T08:00'),
    ]);
    expect(planned(MORNING, now)).toEqual([
      slot('morning', '11', 2, '11T08:00'),
      slot('morning', '12', 0, '12T05:00'),
      slot('morning', '12', 1, '12T06:30'),
      slot('morning', '12', 2, '12T08:00'),
    ]);
  });

  it('keeps two reminders that coincide on their own and reduces two that were moved onto one instant', () => {
    expect(planned(TWINS, N0, hours(420, null))).toEqual([
      slot('twins', '11', 0, '11T08:00'),
      slot('twins', '11', 1, '11T08:00'),
      slot('twins', '12', 0, '12T08:00'),
      slot('twins', '12', 1, '12T08:00'),
    ]);
    expect(planned(TWINS_EARLY, N0, hours(420, null))).toEqual([
      slot('twinsearly', '11', 0, '11T07:00'),
      slot('twinsearly', '12', 0, '12T07:00'),
    ]);
  });

  it('drops a late reminder: it cannot move to the next morning inside the window', () => {
    const expected = [slot('night', '11', 0, '11T20:00'), slot('night', '12', 0, '12T20:00')];
    expect(planned(NIGHT, N0, hours(null, 1320))).toEqual(expected);
    expect(planned(NIGHT, N0, hours(420, 1320))).toEqual(expected);
  });

  it('moves a late reminder of a window that runs into the morning to that morning', () => {
    expect(planned(LONG, N0, hours(420, 1320))).toEqual([
      slot('long', '10', 0, '11T07:00'),
      slot('long', '11', 0, '12T07:00'),
      slot('long', '12', 0, '13T07:00'),
    ]);
    expect(planned(LONG, N0, hours(null, 1320))).toEqual([]);
  });

  it('moves a follow-up inside the twelve hours after the window and drops one that cannot', () => {
    expect(planned(FOLLOW, N0, hours(420, null))).toEqual([
      slot('follow', '11', 1, '11T07:00'),
      slot('follow', '12', 1, '12T07:00'),
    ]);
    expect(planned(LATE_FOLLOW, N0, hours(420, 1320))).toEqual([]);
  });

  it('keeps the later window day when the follow-up of one day and the start of the next land together', () => {
    expect(planned(FULL, N0, hours(420, null))).toEqual([
      slot('full', '11', 0, '11T07:00'),
      slot('full', '12', 0, '12T07:00'),
      slot('full', '12', 1, '13T07:00'),
    ]);
  });

  it('drops a reminder moved into Shabbat and moves a Sunday one', () => {
    const friday = at(J, '2026-11-13T00:30');
    expect(planned(DAY, friday, hours(1020, null))).toEqual([slot('day', '15', 0, '15T17:00')]);
    expect(planned(DAY, friday, hours(420, null))).toEqual([
      slot('day', '13', 0, '13T07:00'),
      slot('day', '15', 0, '15T07:00'),
    ]);
  });

  it('plans the same with no quiet hours, with none set, and with an invalid pair', () => {
    const plain = planned(MORNING, N0);
    expect(plain).toEqual([
      slot('morning', '11', 0, '11T05:00'),
      slot('morning', '11', 1, '11T06:30'),
      slot('morning', '11', 2, '11T08:00'),
      slot('morning', '12', 0, '12T05:00'),
      slot('morning', '12', 1, '12T06:30'),
      slot('morning', '12', 2, '12T08:00'),
    ]);
    expect(buildPlan(planInput(MORNING, N0, NO_QUIET_HOURS))).toEqual(buildPlan(planInput(MORNING, N0)));
    expect(buildPlan(planInput(MORNING, N0, hours(600, 630)))).toEqual(buildPlan(planInput(MORNING, N0)));
  });

  describe('the next-reminder preview agrees with the plan', () => {
    const next = (mitzvah: Mitzvah, now: Date, quietHours?: QuietHours) =>
      nextReminderAt(mitzvah, mitzvah.defaultReminders, {
        now,
        location: J,
        settings: SETTINGS,
        completions: {},
        skipped: {},
        quietHours,
      });

    const CASES: [string, Mitzvah, Date, QuietHours | undefined, string][] = [
      ['MORNING with a first hour', MORNING, N0, hours(420, null), '2026-11-11T07:00'],
      ['NIGHT with a last hour', NIGHT, at(J, '2026-11-11T21:00'), hours(null, 1320), '2026-11-12T20:00'],
      ['LONG with both', LONG, N0, hours(420, 1320), '2026-11-11T07:00'],
      ['FULL with a first hour', FULL, N0, hours(420, null), '2026-11-11T07:00'],
      ['MORNING with none', MORNING, N0, undefined, '2026-11-11T05:00'],
    ];

    it.each(CASES)('%s', (_label, mitzvah, now, quietHours, expected) => {
      const first = next(mitzvah, now, quietHours);
      expect(first).toEqual(at(J, expected));
      expect(first?.getTime()).toBe(planned(mitzvah, now, quietHours)[0][1]);
    });
  });
});
