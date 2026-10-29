jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

jest.mock('@/services/notifications/ids', () => ({
  ...jest.requireActual('@/services/notifications/ids'),
  HORIZON_MAX_DAYS: 2,
}));
jest.mock('@/services/notifications/planners/horizonEnd', () => ({ planHorizonEnd: () => [] }));

import { HDate, months } from '@hebcal/core';
import { buildPlan } from '../plan';
import { TAHARAH_QUIET_POLICY } from '../planners/taharah';
import type { PlanInput, ScheduleCandidate } from '../types';
import { CITIES } from '@/data/cities';
import { MITZVOT } from '@/data/mitzvot';
import { hilulaDateLabel, hilulaNames, hilulotOn } from '@/data/hilulot';
import { rulesFor } from '@/data/taharahPresets';
import { HebcalService } from '@/services/HebcalService';
import { t } from '@/i18n';
import { DEFAULT_HILULA_NOTICES, DEFAULT_ROSH_CHODESH_NOTICES } from '@/stores/useUserStore';
import { at, zmanimFor } from '@/testing/zmanim';
import type { QuietHours } from '@/utils/quietHours';

const J = CITIES[0];

const T30 = new HDate(30, months.TISHREI, 5787).abs();
const C1 = new HDate(1, months.CHESHVAN, 5787).abs();
const C3 = new HDate(3, months.CHESHVAN, 5787).abs();

const byId = (id: string) => MITZVOT.find((mitzvah) => mitzvah.id === id)!;
const hoursOf = (before: number | null, after: number | null): QuietHours => ({ before, after });
const zmanimOn = (iso: string) => zmanimFor(at(J, `${iso}T12:00`), J);
const absOf = (year: number, monthIndex: number, day: number) => new HDate(new Date(year, monthIndex, day)).abs();

function planInput(overrides: Partial<PlanInput> = {}): PlanInput {
  const now = overrides.now ?? at(J, '2026-10-11T00:30');
  return {
    now,
    fromDate: now,
    platform: 'android',
    hasPermission: true,
    language: 'he',
    location: J,
    settings: { nusach: 'ashkenaz', halachicOpinions: { ksSofZman: 'GRA' }, inIsrael: true },
    mitzvot: [],
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

const only = (plan: ScheduleCandidate[], prefix: string) => plan.filter((c) => c.id.startsWith(prefix));
const sum = (plan: ScheduleCandidate[], prefix: string) => only(plan, prefix).map((c) => [c.id, c.trigger.getTime()]);
const candidate = (plan: ScheduleCandidate[], id: string) => plan.find((c) => c.id === id)!;
const minutes = (instant: Date, delta: number) => instant.getTime() + delta * 60_000;

describe('quiet hours on the notices', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  describe('Rosh Chodesh', () => {
    const rc = (quietHours: QuietHours | undefined, now: Date) =>
      buildPlan(planInput({ now, roshChodeshEnabled: true, quietHours }));

    it('1 moves the notices of the day to the first open hour, and drops them when the last hour is past', () => {
      const now = at(J, '2026-10-11T00:30');

      expect(sum(rc(hoursOf(480, null), now), 'roshChodesh:')).toEqual([
        [`roshChodesh:${T30}:day`, at(J, '2026-10-11T08:00').getTime()],
        [`roshChodesh:${C1}:day`, at(J, '2026-10-12T08:00').getTime()],
      ]);
      expect(sum(rc(undefined, now), 'roshChodesh:')).toEqual([
        [`roshChodesh:${T30}:day`, at(J, '2026-10-11T07:00').getTime()],
        [`roshChodesh:${C1}:day`, at(J, '2026-10-12T07:00').getTime()],
      ]);
      expect(only(rc(hoursOf(null, 360), now), 'roshChodesh:')).toEqual([]);
    });

    it('2 keeps a notice moved past now, which its planned time would have lost', () => {
      const now = at(J, '2026-10-11T07:30');

      expect(sum(rc(hoursOf(480, null), now), `roshChodesh:${T30}`)).toEqual([
        [`roshChodesh:${T30}:day`, at(J, '2026-10-11T08:00').getTime()],
      ]);
      expect(only(rc(undefined, now), `roshChodesh:${T30}`)).toEqual([]);
    });
  });

  describe('hilulot', () => {
    it('3 moves both notices to the first open hour and words them from the moved phase', () => {
      const plan = buildPlan(
        planInput({ now: at(J, '2026-10-12T00:30'), hilulotEnabled: true, quietHours: hoursOf(1140, null) }),
      );
      const day = new HDate(3, months.CHESHVAN, 5787);

      expect(zmanimOn('2026-10-12').shkia.getTime()).toBeLessThan(at(J, '2026-10-12T19:00').getTime());
      expect(zmanimOn('2026-10-13').shkia.getTime()).toBeLessThan(at(J, '2026-10-13T19:00').getTime());
      expect(sum(plan, 'hilula:')).toEqual([
        [`hilula:${C3}:before`, at(J, '2026-10-12T19:00').getTime()],
        [`hilula:${C3}:evening`, at(J, '2026-10-13T19:00').getTime()],
      ]);
      const evening = candidate(plan, `hilula:${C3}:evening`);
      expect(evening.title).toBe(
        t('hilulot.notice.evening.titleBegun', { names: hilulaNames(hilulotOn(day, true), 'he') }),
      );
      expect(evening.body).toBe(t('hilulot.notice.evening.bodyBegun', { date: hilulaDateLabel(day, 'he') }));
    });
  });

  describe('the weekly report', () => {
    const reportAt = (quietHours: QuietHours) =>
      sum(buildPlan(planInput({ now: at(J, '2026-10-08T12:00'), weeklyReportEnabled: true, quietHours })), 'report:');

    it('4 moves with the hours: kept while the last hour is later, dropped when it passed', () => {
      const end = HebcalService.holyBlockAt(at(J, '2026-10-10T12:00'), J)!.end;
      const planned = minutes(end, 45);

      expect(planned).toBeGreaterThan(at(J, '2026-10-10T18:00').getTime());
      expect(reportAt(hoursOf(null, 1320))).toEqual([['report:2026-10-10', planned]]);
      expect(reportAt(hoursOf(null, 1080))).toEqual([]);
      expect(reportAt(hoursOf(420, 1080))).toEqual([]);
    });
  });

  describe('taharah', () => {
    it('5 pins the policy of every task kind', () => {
      expect(TAHARAH_QUIET_POLICY).toEqual({
        hefsek: 'exempt',
        bedikaMorning: 'moveOrKeep',
        bedikaEvening: 'exempt',
        tevila: 'exempt',
        tevilaPrep: 'exempt',
        perisha: 'exempt',
        bedikaVeset: 'exempt',
        expectOnset: 'move',
        postBlock: 'move',
        preBlock: 'exempt',
      });
    });

    it('6 never moves the hefsek, even into the quiet evening', () => {
      const onsetDay = new HDate(new Date(2026, 10, 8)).abs();
      const events: PlanInput['taharah']['events'] = [
        { id: 'e1', recordedAt: 1, type: 'onset', onah: { abs: onsetDay, kind: 'day' } },
      ];
      const plan = buildPlan(
        planInput({
          now: at(J, '2026-11-11T05:00'),
          taharahEnabled: true,
          taharah: { ...planInput().taharah, events },
          quietHours: hoursOf(null, 840),
        }),
      );
      const hefsek = minutes(zmanimOn('2026-11-12').shkia, -90);

      expect(hefsek).toBeGreaterThan(at(J, '2026-11-12T14:00').getTime());
      expect(sum(plan, 'taharah:')).toEqual([[`taharah:hefsek:${onsetDay + 4}`, hefsek]]);
    });

    describe('the morning bedika', () => {
      const events: PlanInput['taharah']['events'] = [
        { id: 'e1', recordedAt: 1, type: 'onset', onah: { abs: absOf(2026, 10, 2), kind: 'day' } },
        { id: 'e2', recordedAt: 2, type: 'hefsek', day: absOf(2026, 10, 6), result: 'clean' },
        { id: 'e3', recordedAt: 3, type: 'bedika', day: absOf(2026, 10, 7), slot: 'morning', result: 'clean' },
      ];
      const planWith = (quietHours: QuietHours) =>
        buildPlan(
          planInput({
            now: at(J, '2026-11-08T00:30'),
            taharahEnabled: true,
            taharah: { ...planInput().taharah, events },
            quietHours,
          }),
        );
      const morning = (day: number) => `taharah:bedikaMorning:${absOf(2026, 10, day)}`;
      const evening = (day: number) => `taharah:bedikaEvening:${absOf(2026, 10, day)}`;
      const eveningTriggers = [
        [evening(8), minutes(zmanimOn('2026-11-08').shkia, -60)],
        [evening(9), minutes(zmanimOn('2026-11-09').shkia, -60)],
      ];

      it('7a moves to the first open hour while it is before midday, and leaves the evening one', () => {
        const plan = planWith(hoursOf(420, null));

        expect(minutes(zmanimOn('2026-11-08').netzHaChama, 30)).toBeLessThan(at(J, '2026-11-08T07:00').getTime());
        expect(zmanimOn('2026-11-08').chatzot.getTime()).toBeGreaterThan(at(J, '2026-11-08T07:00').getTime());
        expect(zmanimOn('2026-11-08').chatzot.getTime()).toBeLessThan(at(J, '2026-11-08T13:00').getTime());
        expect(sum(plan, 'taharah:bedikaMorning:')).toEqual([
          [morning(8), at(J, '2026-11-08T07:00').getTime()],
          [morning(9), at(J, '2026-11-09T07:00').getTime()],
        ]);
        expect(sum(plan, 'taharah:bedikaEvening:')).toEqual(eveningTriggers);
      });

      it('7b keeps its own time when the first open hour is past midday', () => {
        const plan = planWith(hoursOf(780, null));

        expect(sum(plan, 'taharah:bedikaMorning:')).toEqual([
          [morning(8), minutes(zmanimOn('2026-11-08').netzHaChama, 30)],
          [morning(9), minutes(zmanimOn('2026-11-09').netzHaChama, 30)],
        ]);
        expect(sum(plan, 'taharah:bedikaEvening:')).toEqual(eveningTriggers);
      });
    });
  });

  describe('the notices that never move', () => {
    it('8 plans the pre-block notice and the check-in reminders as without quiet hours', () => {
      const now = at(J, '2026-11-13T06:00');
      const mitzvot = [byId('shacharit'), byId('mincha')];
      const kept = (quietHours?: QuietHours) => {
        const plan = buildPlan(planInput({ now, mitzvot, quietHours }));
        return [...sum(plan, 'blockNotice:'), ...sum(plan, 'checkin:')];
      };

      const without = kept(undefined);

      expect(without.filter(([id]) => String(id).startsWith('blockNotice:')).length).toBeGreaterThan(0);
      expect(without.filter(([id]) => String(id).startsWith('checkin:')).length).toBeGreaterThan(0);
      expect(kept(hoursOf(1080, 1140))).toEqual(without);
    });
  });
});
