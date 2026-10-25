jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

import { HDate, months } from '@hebcal/core';
import { buildPlan } from '../plan';
import {
  IOS_HEADROOM,
  IOS_MAX,
  MITZVAH_REMINDER_CATEGORY,
  MITZVAH_TEXT_CATEGORY,
  PENDING_LIMIT,
  TAHARAH_KIND,
} from '../ids';
import type { PlanInput } from '../types';
import { CITIES } from '@/data/cities';
import { customToMitzvah } from '@/data/customMitzvotAdapter';
import { MITZVOT } from '@/data/mitzvot';
import { rulesFor } from '@/data/taharahPresets';
import { HebcalService } from '@/services/HebcalService';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { DEFAULT_HILULA_NOTICES, DEFAULT_ROSH_CHODESH_NOTICES } from '@/stores/useUserStore';
import { installSelichotFixture } from '@/testing/selichot';
import { at, zmanimFor } from '@/testing/zmanim';
import { setLocale, t } from '@/i18n';
import type { Mitzvah } from '@/types/mitzvah';
import { checkInDeadline } from '@/utils/checkIn';

const JERUSALEM = CITIES[0];
const ALL_NUSCHAOT: Mitzvah['nuschaotSupported'] = ['ashkenaz', 'sefard', 'edot_hamizrach', 'chabad'];

// Tuesday, 2 Cheshvan 5787: the hilula of 3 Cheshvan opens that evening.
const TUESDAY = at(JERUSALEM, '2026-10-13T05:00');
const FRIDAY = at(JERUSALEM, '2026-11-13T06:00');
const WEDNESDAY = at(JERUSALEM, '2026-11-11T05:00');
const CHESHVAN_3 = new HDate(3, months.CHESHVAN, 5787).abs();

const zmanimOn = (iso: string) => zmanimFor(at(JERUSALEM, `${iso}T12:00`), JERUSALEM);
const minutes = (instant: Date, delta: number) => instant.getTime() + delta * 60_000;
const byId = (id: string) => MITZVOT.find((mitzvah) => mitzvah.id === id)!;

const STUDY: Mitzvah = {
  id: 'custom_1_study',
  name: { he: 'לימוד', en: 'Study' },
  icon: 'custom',
  isCustom: true,
  timeType: 'range-within-day',
  category: 'daily-morning',
  group: 'mine',
  skipOn: [],
  nuschaotSupported: ALL_NUSCHAOT,
  defaultReminders: [{ anchor: 'start', offsetMin: 15, label: 'להתיישב ללמוד' }],
  contentBlocks: [{ type: 'blessing', he: 'ברכה' }],
  computeWindow: ({ zmanim }) => ({ start: zmanim.shkia, end: new Date(zmanim.shkia.getTime() + 2 * 3_600_000) }),
};

function planInput(overrides: Partial<PlanInput> = {}): PlanInput {
  const now = overrides.now ?? TUESDAY;
  return {
    now,
    fromDate: now,
    platform: 'android',
    hasPermission: true,
    language: 'he',
    location: JERUSALEM,
    settings: { nusach: 'ashkenaz', halachicOpinions: { ksSofZman: 'GRA' }, inIsrael: true },
    mitzvot: [byId('shacharit'), byId('mincha'), STUDY],
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

const summary = (plan: ReturnType<typeof buildPlan>) =>
  plan.map((candidate) => [candidate.id, candidate.trigger.getTime()]);

describe('buildPlan', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it('plans every enabled mitzvah on both horizon days, soonest first, and the hilula notice beside them', () => {
    const plan = buildPlan(planInput({ hilulotEnabled: true }));

    const expected: [string, number][] = [];
    for (const day of ['2026-10-13', '2026-10-14']) {
      const zmanim = zmanimOn(day);
      expected.push(
        [`shacharit__${day}__0`, zmanim.netzHaChama.getTime()],
        [`shacharit__${day}__1`, minutes(zmanim.sofZmanTfilaGra, -45)],
        [`mincha__${day}__0`, zmanim.minchaGedola.getTime()],
        [`mincha__${day}__1`, minutes(zmanim.shkia, -60)],
        [`${STUDY.id}__${day}__0`, minutes(zmanim.shkia, 15)],
      );
    }
    expected.push([`hilula:${CHESHVAN_3}:evening`, zmanimOn('2026-10-13').shkia.getTime()]);
    expected.sort((a, b) => a[1] - b[1]);

    expect(summary(plan)).toEqual(expected);
  });

  it('routes each kind to its own channel and attaches the mitzvah payload', () => {
    const plan = buildPlan(planInput({ hilulotEnabled: true }));
    const channelOf = (prefix: string) => [
      ...new Set(plan.filter((candidate) => candidate.id.startsWith(prefix)).map((candidate) => candidate.channel)),
    ];

    expect(channelOf('shacharit__')).toEqual(['mitzvot']);
    expect(channelOf('mincha__')).toEqual(['mitzvot']);
    expect(channelOf(STUDY.id)).toEqual(['mitzvot']);
    expect(channelOf('hilula:')).toEqual(['hilulot']);

    const study = plan.find((candidate) => candidate.id === `${STUDY.id}__2026-10-13__0`)!;
    expect(study.categoryIdentifier).toBe(MITZVAH_TEXT_CATEGORY);
    expect(study.title).toBe('לימוד');
    expect(study.data).toEqual({
      mitzvahId: STUDY.id,
      windowEnd: new Date(minutes(zmanimOn('2026-10-13').shkia, 120)).toISOString(),
      dateKey: '2026-10-13',
      reminderIndex: 0,
      customId: `${STUDY.id}__2026-10-13__0`,
      skipIfDone: false,
      hasText: true,
      fullContent: STUDY.contentBlocks,
    });
  });

  it('gives a mitzvah with no text the mark-done-only category', () => {
    const plain: Mitzvah = { ...STUDY, id: 'custom_2_plain', contentBlocks: undefined };
    const plan = buildPlan(planInput({ mitzvot: [plain] }));

    expect(plan.length).toBeGreaterThan(0);
    for (const candidate of plan) {
      expect(candidate.categoryIdentifier).toBe(MITZVAH_REMINDER_CATEGORY);
      expect(candidate.data.hasText).toBe(false);
    }
  });

  it('names a mitzvah in English when the input language is English', () => {
    const plan = buildPlan(planInput({ language: 'en', mitzvot: [STUDY] }));
    expect(plan.map((candidate) => candidate.title)).toEqual(['Study', 'Study']);
  });

  it('leaves out the hilula notices while the setting is off', () => {
    const plan = buildPlan(planInput({ hilulotEnabled: false }));
    expect(plan.filter((candidate) => candidate.id.startsWith('hilula:'))).toEqual([]);
  });

  it('plans the Rosh Chodesh notices on their own channel and leaves them out while the setting is off', () => {
    const sunday = at(JERUSALEM, '2026-10-11T06:00');
    const noticesOf = (roshChodeshEnabled: boolean) =>
      buildPlan(planInput({ now: sunday, mitzvot: [], roshChodeshEnabled })).filter((candidate) =>
        candidate.id.startsWith('roshChodesh:'),
      );

    expect(noticesOf(false)).toEqual([]);
    const notices = noticesOf(true);
    expect(notices.map((candidate) => candidate.id)).toEqual([
      `roshChodesh:${new HDate(30, months.TISHREI, 5787).abs()}:day`,
      `roshChodesh:${new HDate(1, months.CHESHVAN, 5787).abs()}:day`,
    ]);
    expect(notices.map((candidate) => candidate.trigger.getTime())).toEqual([
      at(JERUSALEM, '2026-10-11T07:00').getTime(),
      at(JERUSALEM, '2026-10-12T07:00').getTime(),
    ]);
    for (const notice of notices) {
      expect(notice.channel).toBe('roshChodesh');
      expect(notice.categoryIdentifier).toBeUndefined();
    }
  });

  it('plans nothing without notification permission', () => {
    expect(buildPlan(planInput({ hasPermission: false }))).toEqual([]);
  });

  it('skips a mitzvah that is done or skipped on a day, and keeps its other days', () => {
    const plan = buildPlan(
      planInput({
        completions: { '2026-10-13': { shacharit: 1 } },
        skipped: { '2026-10-14': { mincha: 1 } },
      }),
    );
    const ids = plan.map((candidate) => candidate.id);

    expect(ids.filter((id) => id.startsWith('shacharit__'))).toEqual([
      'shacharit__2026-10-14__0',
      'shacharit__2026-10-14__1',
    ]);
    expect(ids.filter((id) => id.startsWith('mincha__'))).toEqual(['mincha__2026-10-13__0', 'mincha__2026-10-13__1']);
  });

  it('plans a date-range custom mitzvah only on the days of its range', () => {
    const ranged = (id: string, start: string, end: string) =>
      customToMitzvah({
        id,
        name: 'לימוד',
        startHHMM: '08:00',
        endHHMM: '09:00',
        reminders: [{ anchor: 'start', offsetMin: 0, label: 'התחלה' }],
        skipOn: [],
        createdAt: 1,
        schedules: [{ from: '2026-10-01', schedule: { mode: 'range', start, end } }],
      });
    const mitzvot = [
      ranged('custom_3_ending', '2026-10-01', '2026-10-13'),
      ranged('custom_4_starting', '2026-10-14', '2026-10-30'),
      ranged('custom_5_later', '2026-10-15', '2026-10-30'),
    ];

    expect(summary(buildPlan(planInput({ mitzvot })))).toEqual([
      ['custom_3_ending__2026-10-13__0', at(JERUSALEM, '2026-10-13T08:00').getTime()],
      ['custom_4_starting__2026-10-14__0', at(JERUSALEM, '2026-10-14T08:00').getTime()],
    ]);
  });

  it('keys a custom window between midnight and alot by the evening it belongs to', () => {
    const night = customToMitzvah({
      id: 'custom_6_night',
      name: 'לימוד לילה',
      startHHMM: '03:29',
      endHHMM: '03:31',
      reminders: [{ anchor: 'start', offsetMin: 0, label: 'לימוד לילה' }],
      skipOn: [],
      createdAt: 1,
    });
    expect(summary(buildPlan(planInput({ now: at(JERUSALEM, '2026-10-27T20:00'), mitzvot: [night] })))).toEqual([
      ['custom_6_night__2026-10-27__0', at(JERUSALEM, '2026-10-28T03:29').getTime()],
      ['custom_6_night__2026-10-28__0', at(JERUSALEM, '2026-10-29T03:29').getTime()],
    ]);
    expect(summary(buildPlan(planInput({ now: at(JERUSALEM, '2026-10-28T03:00'), mitzvot: [night] })))).toEqual([
      ['custom_6_night__2026-10-27__0', at(JERUSALEM, '2026-10-28T03:29').getTime()],
      ['custom_6_night__2026-10-28__0', at(JERUSALEM, '2026-10-29T03:29').getTime()],
      ['custom_6_night__2026-10-29__0', at(JERUSALEM, '2026-10-30T03:29').getTime()],
    ]);
  });

  it("uses a mitzvah's own reminders when the user edited them", () => {
    const plan = buildPlan(
      planInput({
        mitzvot: [byId('mincha')],
        reminderOverrides: { mincha: [{ anchor: 'start', offsetMin: 10, label: 'x' }] },
      }),
    );

    expect(summary(plan)).toEqual([
      ['mincha__2026-10-13__0', minutes(zmanimOn('2026-10-13').minchaGedola, 10)],
      ['mincha__2026-10-14__0', minutes(zmanimOn('2026-10-14').minchaGedola, 10)],
    ]);
  });

  it('reads the clock from the input: a reminder already due at `now` is dropped', () => {
    const afterNetz = at(JERUSALEM, '2026-10-13T07:00');
    const plan = buildPlan(planInput({ now: afterNetz, mitzvot: [byId('shacharit')] }));

    expect(plan.map((candidate) => candidate.id)).toEqual([
      'shacharit__2026-10-13__1',
      'shacharit__2026-10-14__0',
      'shacharit__2026-10-14__1',
    ]);
  });

  it('keeps the other mitzvot when one throws', () => {
    const exploding: Mitzvah = {
      ...STUDY,
      id: 'exploding',
      computeWindow: () => {
        throw new Error('zmanim blew up');
      },
    };
    const plan = buildPlan(planInput({ mitzvot: [exploding, byId('mincha')] }));

    expect(plan.map((candidate) => candidate.id)).toEqual([
      'mincha__2026-10-13__0',
      'mincha__2026-10-13__1',
      'mincha__2026-10-14__0',
      'mincha__2026-10-14__1',
    ]);
    expect(warn).toHaveBeenCalledWith('[notifications] scheduling failed', 'exploding', expect.any(Error));
  });

  describe('the slot cap', () => {
    // Seventy mitzvot whose single reminder falls one minute apart, on each of the two horizon days.
    const bulk = (index: number): Mitzvah => ({
      ...STUDY,
      id: `bulk_${index}`,
      contentBlocks: undefined,
      defaultReminders: [{ anchor: 'start', offsetMin: 0, label: 'x' }],
      computeWindow: ({ zmanim }) => ({
        start: new Date(minutes(zmanim.netzHaChama, index + 1)),
        end: new Date(minutes(zmanim.netzHaChama, 600)),
      }),
    });
    const many = Array.from({ length: 70 }, (_, index) => bulk(index));
    const earliest = Array.from({ length: PENDING_LIMIT }, (_, index) => `bulk_${index}__2026-10-13__0`);

    it('keeps the soonest reminders and warns about the rest', () => {
      const plan = buildPlan(planInput({ mitzvot: many }));

      expect(plan.map((candidate) => candidate.id)).toEqual(earliest);
      expect(warn).toHaveBeenCalledWith(
        `[notifications] ${140 - PENDING_LIMIT} reminder(s) beyond the ${PENDING_LIMIT} slot cap were not scheduled`,
      );
    });

    it('leaves iOS the headroom its 64 pending requests need, and caps elsewhere at the pending limit', () => {
      expect(buildPlan(planInput({ mitzvot: many, platform: 'ios' }))).toHaveLength(IOS_MAX - IOS_HEADROOM);
      expect(buildPlan(planInput({ mitzvot: many, platform: 'android' }))).toHaveLength(PENDING_LIMIT);
    });
  });

  describe('a Shabbat in the horizon', () => {
    const shabbat = () => HebcalService.holyBlockAt(at(JERUSALEM, '2026-11-14T12:00'), JERUSALEM)!;
    const plan = () => buildPlan(planInput({ now: FRIDAY, mitzvot: [byId('shacharit'), byId('mincha')] }));

    it('sends the pre-block notice an hour before candle lighting, on the mitzvot channel with no category', () => {
      const notice = plan().find((candidate) => candidate.id === 'blockNotice:2026-11-14')!;

      expect(notice.trigger.getTime()).toBe(minutes(shabbat().start, -60));
      expect(notice.channel).toBe('mitzvot');
      expect(notice.title).toBe(t('holyBlock.title.shabbat'));
      expect(notice.categoryIdentifier).toBeUndefined();
      expect(notice.data).toEqual({ kind: 'blockNotice' });
    });

    it('sends the check-in nudges at tzeit, two hours later and the next evening, on the system channel', () => {
      const nudges = plan().filter((candidate) => candidate.id.startsWith('checkin:'));

      expect(summary(nudges)).toEqual([
        ['checkin:2026-11-14:0', shabbat().end.getTime()],
        ['checkin:2026-11-14:1', minutes(shabbat().end, 120)],
        ['checkin:2026-11-14:2', at(JERUSALEM, '2026-11-15T20:00').getTime()],
      ]);
      for (const nudge of nudges) {
        expect(nudge.channel).toBe('system');
        expect(nudge.categoryIdentifier).toBeUndefined();
        expect(nudge.data).toEqual({ kind: 'checkin', blockId: '2026-11-14' });
      }
    });

    it('plans every check-in nudge before the check-in closes at alot, and none once it has', () => {
      const deadline = checkInDeadline(shabbat(), JERUSALEM);
      const nudgesAt = (now: Date) =>
        buildPlan(planInput({ now, mitzvot: [byId('shacharit'), byId('mincha')] })).filter((candidate) =>
          candidate.id.startsWith('checkin:'),
        );

      const all = nudgesAt(FRIDAY);
      expect(all).toHaveLength(3);
      for (const nudge of all) expect(nudge.trigger.getTime()).toBeLessThan(deadline.getTime());
      expect(nudgesAt(new Date(deadline.getTime() - 1))).toEqual([]);
      expect(nudgesAt(deadline)).toEqual([]);
    });

    it('sends the weekly report between the first and second check-in nudge, on the system channel', () => {
      const withReport = () =>
        buildPlan(planInput({ now: FRIDAY, mitzvot: [byId('shacharit'), byId('mincha')], weeklyReportEnabled: true }));
      const sequence = withReport().filter((candidate) => /^(checkin|report):/.test(candidate.id));

      expect(summary(sequence)).toEqual([
        ['checkin:2026-11-14:0', shabbat().end.getTime()],
        ['report:2026-11-14', minutes(shabbat().end, 45)],
        ['checkin:2026-11-14:1', minutes(shabbat().end, 120)],
        ['checkin:2026-11-14:2', at(JERUSALEM, '2026-11-15T20:00').getTime()],
      ]);
      const report = sequence[1];
      expect(report.channel).toBe('system');
      expect(report.categoryIdentifier).toBeUndefined();
      expect(report.title).toBe(t('report.notice.title'));
      expect(report.body).toBe(t('report.notice.body'));
      expect(report.data).toEqual({ kind: 'report', report: { week: '2026-11-14' } });
    });

    it('leaves the weekly report out while its setting is off', () => {
      expect(plan().filter((candidate) => candidate.id.startsWith('report:'))).toEqual([]);
    });

    it('plans nothing strictly inside the block', () => {
      const { start, end } = shabbat();
      const inside = plan().filter(
        (candidate) => candidate.trigger.getTime() > start.getTime() && candidate.trigger.getTime() < end.getTime(),
      );
      expect(inside.map((candidate) => candidate.id)).toEqual([]);
    });

    it('keeps maariv out of the block and leaves the pre-block notice as it was', () => {
      const { start, end } = shabbat();
      const withMaariv = buildPlan(
        planInput({ now: FRIDAY, mitzvot: [byId('shacharit'), byId('mincha'), byId('maariv')] }),
      );
      const maariv = withMaariv.filter((candidate) => candidate.id.startsWith('maariv__'));
      expect(maariv.filter((candidate) => candidate.id.startsWith('maariv__2026-11-13__'))).toEqual([]);
      expect(
        maariv.filter(
          (candidate) => candidate.trigger.getTime() > start.getTime() && candidate.trigger.getTime() < end.getTime(),
        ),
      ).toEqual([]);
      const saturdayNight = maariv.find((candidate) => candidate.id === 'maariv__2026-11-14__0')!;
      expect(saturdayNight.trigger.getTime()).toBe(end.getTime());
      expect(saturdayNight.data.windowEnd).toBe(zmanimOn('2026-11-15').alotHaShachar.toISOString());
      const notice = (candidates: ReturnType<typeof buildPlan>) =>
        candidates.find((candidate) => candidate.id === 'blockNotice:2026-11-14');
      expect(notice(withMaariv)).toEqual(notice(plan()));
    });
  });

  describe('the bedtime Shema (R3)', () => {
    const bedtime = () => byId('krias_shma_al_hamita');
    const bedtimeOf = (candidates: ReturnType<typeof buildPlan>) =>
      candidates.filter((candidate) => candidate.id.startsWith('krias_shma_al_hamita__'));

    it('reminds at 22:30 on a weeknight with the open-text category', () => {
      const plan = bedtimeOf(buildPlan(planInput({ now: WEDNESDAY, mitzvot: [bedtime()] })));
      expect(summary(plan)).toEqual([
        ['krias_shma_al_hamita__2026-11-11__0', at(JERUSALEM, '2026-11-11T22:30').getTime()],
        ['krias_shma_al_hamita__2026-11-12__0', at(JERUSALEM, '2026-11-12T22:30').getTime()],
      ]);
      const [first] = plan;
      expect(first.channel).toBe('mitzvot');
      expect(first.categoryIdentifier).toBe(MITZVAH_TEXT_CATEGORY);
      expect(first.title).toBe('קריאת שמע על המיטה');
      expect(bedtime().defaultReminders[0].bodyVariants).toContain(first.body);
      expect(first.data).toEqual({
        mitzvahId: 'krias_shma_al_hamita',
        windowEnd: zmanimOn('2026-11-12').alotHaShachar.toISOString(),
        dateKey: '2026-11-11',
        reminderIndex: 0,
        customId: 'krias_shma_al_hamita__2026-11-11__0',
        skipIfDone: false,
        hasText: true,
        fullContent: null,
      });
    });

    it('reminds at 22:30 on the clock of the location abroad', () => {
      const losAngeles = CITIES.find((city) => city.nameEn === 'Los Angeles')!;
      const plan = bedtimeOf(
        buildPlan(
          planInput({
            now: at(losAngeles, '2026-11-11T09:00'),
            location: losAngeles,
            settings: { nusach: 'ashkenaz', halachicOpinions: { ksSofZman: 'GRA' }, inIsrael: false },
            mitzvot: [bedtime()],
          }),
        ),
      );
      expect(summary(plan)).toEqual([
        ['krias_shma_al_hamita__2026-11-11__0', at(losAngeles, '2026-11-11T22:30').getTime()],
        ['krias_shma_al_hamita__2026-11-12__0', at(losAngeles, '2026-11-12T22:30').getTime()],
      ]);
    });

    it('sends nothing on Friday night, inside Shabbat, and reminds again from motzaei Shabbat', () => {
      const { start, end } = HebcalService.holyBlockAt(at(JERUSALEM, '2026-11-14T12:00'), JERUSALEM)!;
      const weekdayMitzvot = [byId('shacharit'), byId('mincha')];
      const withBedtime = buildPlan(planInput({ now: FRIDAY, mitzvot: [...weekdayMitzvot, bedtime()] }));
      const plan = bedtimeOf(withBedtime);
      expect(summary(plan)).toEqual([
        ['krias_shma_al_hamita__2026-11-14__0', at(JERUSALEM, '2026-11-14T22:30').getTime()],
        ['krias_shma_al_hamita__2026-11-15__0', at(JERUSALEM, '2026-11-15T22:30').getTime()],
      ]);
      expect(
        plan.filter(
          (candidate) => candidate.trigger.getTime() > start.getTime() && candidate.trigger.getTime() < end.getTime(),
        ),
      ).toEqual([]);
      expect(plan[0].categoryIdentifier).toBe(MITZVAH_TEXT_CATEGORY);
      const notice = (candidates: ReturnType<typeof buildPlan>) =>
        candidates.find((candidate) => candidate.id === 'blockNotice:2026-11-14');
      expect(notice(withBedtime)).toEqual(notice(buildPlan(planInput({ now: FRIDAY, mitzvot: weekdayMitzvot }))));
    });

    describe('where nightfall is after 22:30, Antwerp in June', () => {
      const antwerp = CITIES.find((city) => city.nameEn === 'Antwerp')!;
      const settings = { nusach: 'ashkenaz', halachicOpinions: { ksSofZman: 'GRA' }, inIsrael: false } as const;
      const nightfallOn = (iso: string) =>
        HebcalService.nightfall(zmanimFor(at(antwerp, `${iso}T12:00`), antwerp), antwerp);
      const planFrom = (iso: string) =>
        bedtimeOf(buildPlan(planInput({ now: at(antwerp, iso), location: antwerp, settings, mitzvot: [bedtime()] })));

      it('fires at 22:30 before the window opens, as a heads-up', () => {
        const plan = planFrom('2027-06-21T05:00');
        expect(summary(plan)).toEqual([
          ['krias_shma_al_hamita__2027-06-21__0', at(antwerp, '2027-06-21T22:30').getTime()],
          ['krias_shma_al_hamita__2027-06-22__0', at(antwerp, '2027-06-22T22:30').getTime()],
        ]);
        expect(plan[0].trigger.getTime()).toBeLessThan(nightfallOn('2027-06-21').getTime());
      });

      it('sends nothing on a motzaei Shabbat whose exit is after 22:30, when 22:30 falls inside the block', () => {
        const { start, end } = HebcalService.holyBlockAt(at(antwerp, '2027-06-19T12:00'), antwerp)!;
        const plan = planFrom('2027-06-18T06:00');
        expect(at(antwerp, '2027-06-19T22:30').getTime()).toBeGreaterThan(start.getTime());
        expect(at(antwerp, '2027-06-19T22:30').getTime()).toBeLessThan(end.getTime());
        expect(summary(plan)).toEqual([
          ['krias_shma_al_hamita__2027-06-20__0', at(antwerp, '2027-06-20T22:30').getTime()],
        ]);
      });
    });
  });

  describe('Selichot (R2)', () => {
    const selichot = () => byId('selichot');
    const selichotOf = (candidates: ReturnType<typeof buildPlan>) =>
      candidates.filter((candidate) => candidate.id.startsWith('selichot__'));
    const nusachSettings = (nusach: PlanInput['settings']['nusach']): PlanInput['settings'] => ({
      nusach,
      halachicOpinions: { ksSofZman: 'GRA' },
      inIsrael: true,
    });
    const planFor = (now: Date, nusach: PlanInput['settings']['nusach'] = 'ashkenaz') =>
      selichotOf(buildPlan(planInput({ now, settings: nusachSettings(nusach), mitzvot: [selichot()] })));

    beforeEach(() => {
      installSelichotFixture();
    });

    afterEach(() => {
      useSelichotStore.getState().reset();
    });

    it('reminds at chatzot halayla each night of the season, with the open-text category', () => {
      const now = at(JERUSALEM, '2025-09-15T14:00');
      const plan = planFor(now);
      expect(summary(plan)).toEqual([
        ['selichot__2025-09-15__0', zmanimOn('2025-09-15').chatzotLayla.getTime()],
        ['selichot__2025-09-16__0', zmanimOn('2025-09-16').chatzotLayla.getTime()],
      ]);
      const [first] = plan;
      expect(first.channel).toBe('mitzvot');
      expect(first.categoryIdentifier).toBe(MITZVAH_TEXT_CATEGORY);
      expect(first.title).toBe('סליחות');
      expect(selichot().defaultReminders[0].bodyVariants).toContain(first.body);
      expect(first.data).toEqual({
        mitzvahId: 'selichot',
        windowEnd: zmanimOn('2025-09-16').sofZmanTfilaGra.toISOString(),
        dateKey: '2025-09-15',
        reminderIndex: 0,
        customId: 'selichot__2025-09-15__0',
        skipIfDone: false,
        hasText: true,
        fullContent: null,
      });
      try {
        setLocale('en');
        const [english] = selichotOf(buildPlan(planInput({ now, language: 'en', mitzvot: [selichot()] })));
        expect([english.title, english.body]).toEqual(['Selichot', 'Time for Selichot']);
      } finally {
        setLocale('he');
      }
    });

    it('starts Edot HaMizrach on the night of 2 Elul and the other nuschaot only from Leil Selichot', () => {
      const now = at(JERUSALEM, '2025-08-25T14:00');
      expect(summary(planFor(now, 'edot_hamizrach'))).toEqual([
        ['selichot__2025-08-25__0', zmanimOn('2025-08-25').chatzotLayla.getTime()],
        ['selichot__2025-08-26__0', zmanimOn('2025-08-26').chatzotLayla.getTime()],
      ]);
      for (const nusach of ['ashkenaz', 'sefard', 'chabad'] as const) {
        expect(planFor(now, nusach)).toEqual([]);
      }
    });

    it('sends nothing on the night that opens Shabbat and reminds again at chatzot of motzaei Shabbat', () => {
      const block = HebcalService.holyBlockAt(at(JERUSALEM, '2025-09-20T12:00'), JERUSALEM)!;
      const plan = planFor(at(JERUSALEM, '2025-09-19T06:00'));
      expect(plan.map((candidate) => candidate.id)).toEqual(['selichot__2025-09-20__0', 'selichot__2025-09-21__0']);
      expect(
        plan.filter(
          (candidate) =>
            candidate.trigger.getTime() > block.start.getTime() && candidate.trigger.getTime() < block.end.getTime(),
        ),
      ).toEqual([]);
      expect(plan[0].trigger.getTime()).toBeGreaterThan(block.end.getTime());
    });

    it('reminds at chatzot on the clock of the location abroad', () => {
      const losAngeles = CITIES.find((city) => city.nameEn === 'Los Angeles')!;
      const plan = selichotOf(
        buildPlan(
          planInput({
            now: at(losAngeles, '2025-09-15T14:00'),
            location: losAngeles,
            settings: { ...nusachSettings('ashkenaz'), inIsrael: false },
            mitzvot: [selichot()],
          }),
        ),
      );
      expect(summary(plan)).toEqual(
        ['2025-09-15', '2025-09-16'].map((day) => [
          `selichot__${day}__0`,
          zmanimFor(at(losAngeles, `${day}T12:00`), losAngeles).chatzotLayla.getTime(),
        ]),
      );
    });

    it('ends the season on the night before Erev Yom Kippur', () => {
      expect(summary(planFor(at(JERUSALEM, '2025-09-30T14:00')))).toEqual([
        ['selichot__2025-09-30__0', zmanimOn('2025-09-30').chatzotLayla.getTime()],
      ]);
    });

    it('plans nothing for a nusach whose file is missing', () => {
      installSelichotFixture(['sefard']);
      const now = at(JERUSALEM, '2025-09-15T14:00');
      expect(planFor(now, 'ashkenaz')).toEqual([]);
      expect(planFor(now, 'sefard').length).toBeGreaterThan(0);
    });
  });

  describe('Chanukah candles (R4)', () => {
    const candles = () => byId('chanukah_candles');
    const candlesOf = (candidates: ReturnType<typeof buildPlan>) =>
      candidates.filter((candidate) => candidate.id.startsWith('chanukah_candles__'));
    const nightBodies = (night: number) =>
      candles().defaultReminders[0].bodyVariants!.map((variant) => variant.replace('%{n}', String(night)));
    const nusachSettings = (nusach: PlanInput['settings']['nusach']): PlanInput['settings'] => ({
      nusach,
      halachicOpinions: { ksSofZman: 'GRA' },
      inIsrael: true,
    });
    const planFor = (now: Date, nusach: PlanInput['settings']['nusach'] = 'ashkenaz') =>
      candlesOf(buildPlan(planInput({ now, settings: nusachSettings(nusach), mitzvot: [candles()] })));

    it('reminds at tzeit and names the night, with the open-text category', () => {
      const now = at(JERUSALEM, '2025-12-15T06:00');
      const plan = planFor(now);
      expect(summary(plan)).toEqual([
        ['chanukah_candles__2025-12-15__0', zmanimOn('2025-12-15').tzeitHakochavim.getTime()],
        ['chanukah_candles__2025-12-16__0', zmanimOn('2025-12-16').tzeitHakochavim.getTime()],
      ]);
      expect(nightBodies(2)).toContain(plan[0].body);
      expect(nightBodies(3)).toContain(plan[1].body);
      expect(plan[0].body).toContain('הנר ה־2');
      expect(plan[0]).toMatchObject({
        channel: 'mitzvot',
        categoryIdentifier: MITZVAH_TEXT_CATEGORY,
        title: 'נרות חנוכה',
      });
      expect(plan[0].data).toEqual({
        mitzvahId: 'chanukah_candles',
        windowEnd: zmanimOn('2025-12-16').alotHaShachar.toISOString(),
        dateKey: '2025-12-15',
        reminderIndex: 0,
        customId: 'chanukah_candles__2025-12-15__0',
        skipIfDone: false,
        hasText: true,
        fullContent: null,
      });
      try {
        setLocale('en');
        const english = candlesOf(buildPlan(planInput({ now, language: 'en', mitzvot: [candles()] })));
        expect(english.map((candidate) => [candidate.title, candidate.body])).toEqual([
          ['Chanukah candles', 'Time for Chanukah candles: night 2'],
          ['Chanukah candles', 'Time for Chanukah candles: night 3'],
        ]);
      } finally {
        setLocale('he');
      }
    });

    it('reminds at plag hamincha on Friday and at the exit on motzaei Shabbat, and nothing inside Shabbat', () => {
      const block = HebcalService.holyBlockAt(at(JERUSALEM, '2026-12-05T12:00'), JERUSALEM)!;
      const plan = planFor(at(JERUSALEM, '2026-12-04T06:00'));
      expect(summary(plan)).toEqual([
        ['chanukah_candles__2026-12-04__0', zmanimOn('2026-12-04').plagHaMincha.getTime()],
        ['chanukah_candles__2026-12-05__0', block.end.getTime()],
        ['chanukah_candles__2026-12-06__0', zmanimOn('2026-12-06').tzeitHakochavim.getTime()],
      ]);
      expect(plan.map((candidate) => candidate.data.windowEnd)).toEqual([
        block.start.toISOString(),
        zmanimOn('2026-12-06').alotHaShachar.toISOString(),
        zmanimOn('2026-12-07').alotHaShachar.toISOString(),
      ]);
      expect(plan.map((candidate, index) => nightBodies(index + 1).includes(candidate.body))).toEqual([
        true,
        true,
        true,
      ]);
      expect(
        plan.filter(
          (candidate) =>
            candidate.trigger.getTime() > block.start.getTime() && candidate.trigger.getTime() < block.end.getTime(),
        ),
      ).toEqual([]);
      expect(plan.map((candidate) => candidate.categoryIdentifier)).toEqual([
        MITZVAH_TEXT_CATEGORY,
        MITZVAH_TEXT_CATEGORY,
        MITZVAH_TEXT_CATEGORY,
      ]);
    });

    it('lights Chabad from shkia on weeknights, and still from plag and the exit around Shabbat', () => {
      const block = HebcalService.holyBlockAt(at(JERUSALEM, '2026-12-05T12:00'), JERUSALEM)!;
      expect(summary(planFor(at(JERUSALEM, '2026-12-04T06:00'), 'chabad'))).toEqual([
        ['chanukah_candles__2026-12-04__0', zmanimOn('2026-12-04').plagHaMincha.getTime()],
        ['chanukah_candles__2026-12-05__0', block.end.getTime()],
        ['chanukah_candles__2026-12-06__0', zmanimOn('2026-12-06').shkia.getTime()],
      ]);
    });

    it('reminds at tzeit on the clock of the location abroad', () => {
      const newYork = CITIES.find((city) => city.cityId === 'new-york')!;
      const plan = candlesOf(
        buildPlan(
          planInput({
            now: at(newYork, '2025-12-15T06:00'),
            location: newYork,
            settings: { ...nusachSettings('ashkenaz'), inIsrael: false },
            mitzvot: [candles()],
          }),
        ),
      );
      expect(summary(plan)).toEqual(
        ['2025-12-15', '2025-12-16'].map((day) => [
          `chanukah_candles__${day}__0`,
          zmanimFor(at(newYork, `${day}T12:00`), newYork).tzeitHakochavim.getTime(),
        ]),
      );
    });

    it('names the night in an edited reminder too, in both languages', () => {
      const now = at(JERUSALEM, '2025-12-15T06:00');
      const reminderOverrides = {
        chanukah_candles: [{ anchor: 'start' as const, offsetMin: 15, label: 'זמן הדלקת נרות חנוכה' }],
      };
      const edited = candlesOf(buildPlan(planInput({ now, reminderOverrides, mitzvot: [candles()] })));
      expect(edited.map((candidate) => candidate.body)).toEqual(['זמן נרות חנוכה: הנר ה־2', 'זמן נרות חנוכה: הנר ה־3']);
      expect(edited.map((candidate) => candidate.trigger.getTime())).toEqual(
        ['2025-12-15', '2025-12-16'].map((day) => zmanimOn(day).tzeitHakochavim.getTime() + 15 * 60_000),
      );
      try {
        setLocale('en');
        const english = candlesOf(
          buildPlan(planInput({ now, reminderOverrides, language: 'en', mitzvot: [candles()] })),
        );
        expect(english.map((candidate) => candidate.body)).toEqual([
          'Time for Chanukah candles: night 2',
          'Time for Chanukah candles: night 3',
        ]);
      } finally {
        setLocale('he');
      }
    });

    it('sends a label the user typed on an added reminder as typed, and fills its %{n}', () => {
      const now = at(JERUSALEM, '2025-12-15T06:00');
      const reminderOverrides: PlanInput['reminderOverrides'] = {
        chanukah_candles: [
          candles().defaultReminders[0],
          { anchor: 'start', offsetMin: 30, label: 'להכין חנוכייה' },
          { anchor: 'start', offsetMin: 45, label: 'נר %{n}' },
          { anchor: 'start', offsetMin: 60, label: 'נרות חנוכה' },
        ],
      };
      const plan = candlesOf(buildPlan(planInput({ now, reminderOverrides, mitzvot: [candles()] })));
      const bodiesOf = (index: number) =>
        ['2025-12-15', '2025-12-16'].map(
          (day) => plan.find((candidate) => candidate.id === `chanukah_candles__${day}__${index}`)?.body,
        );
      expect(plan).toHaveLength(8);
      const [second, third] = bodiesOf(0);
      expect(nightBodies(2)).toContain(second);
      expect(nightBodies(3)).toContain(third);
      expect(bodiesOf(1)).toEqual(['להכין חנוכייה', 'להכין חנוכייה']);
      expect(bodiesOf(2)).toEqual(['נר 2', 'נר 3']);
      expect(bodiesOf(3)).toEqual(['זמן נרות חנוכה: הנר ה־2', 'זמן נרות חנוכה: הנר ה־3']);
    });

    it('plans nothing outside Chanukah', () => {
      expect(planFor(at(JERUSALEM, '2026-12-02T06:00'))).toEqual([]);
      expect(planFor(at(JERUSALEM, '2026-12-13T06:00'))).toEqual([]);
    });
  });

  describe('taharah reminders', () => {
    const onsetDay = new HDate(new Date(2026, 10, 8)).abs();
    const events: PlanInput['taharah']['events'] = [
      { id: 'e1', recordedAt: 1, type: 'onset', onah: { abs: onsetDay, kind: 'day' } },
    ];

    it('plans none while the feature is off', () => {
      const plan = buildPlan(
        planInput({ now: WEDNESDAY, mitzvot: [], taharahEnabled: false, taharah: { ...planInput().taharah, events } }),
      );
      expect(plan).toEqual([]);
    });

    it('plans the hefsek on the taharah channel, discreet, at shkia minus the lead', () => {
      const plan = buildPlan(
        planInput({ now: WEDNESDAY, mitzvot: [], taharahEnabled: true, taharah: { ...planInput().taharah, events } }),
      );

      expect(plan).toHaveLength(1);
      const [hefsek] = plan;
      expect(hefsek.id).toBe(`${TAHARAH_KIND}:hefsek:${onsetDay + 4}`);
      expect(hefsek.trigger.getTime()).toBe(minutes(zmanimOn('2026-11-12').shkia, -90));
      expect(hefsek.channel).toBe('taharah');
      expect(hefsek.title).toBe(t('taharah.notify.discreetTitle'));
      expect(hefsek.categoryIdentifier).toBeUndefined();
      expect(hefsek.data).toEqual({ kind: TAHARAH_KIND, taharah: { task: 'hefsek', day: onsetDay + 4 } });
    });
  });
});
