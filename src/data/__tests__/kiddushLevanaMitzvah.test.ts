jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

import { HDate, months } from '@hebcal/core';
import { DateTime } from 'luxon';
import { CITIES, findCityById } from '@/data/cities';
import { MITZVOT, findMitzvah } from '@/data/mitzvot';
import {
  MITZVAH_STANDALONE_TEXT,
  hasSiddurText,
  hasStandaloneText,
  siddurPlace,
  standaloneHoursAt,
  standalonePeriodEnded,
} from '@/data/siddur';
import { rulesFor } from '@/data/taharahPresets';
import { HebcalService } from '@/services/HebcalService';
import { MITZVAH_TEXT_CATEGORY, buildId, parseId } from '@/services/notifications/ids';
import { buildPlan } from '@/services/notifications/plan';
import { nextReminderAt } from '@/services/notifications/planners/mitzvot';
import type { PlanInput } from '@/services/notifications/types';
import { isMensMitzvah } from '@/stores/taharahOptIn';
import { DEFAULT_HILULA_NOTICES, DEFAULT_ROSH_CHODESH_NOTICES } from '@/stores/useUserStore';
import { at, zmanimFor } from '@/testing/zmanim';
import type { Mitzvah, Nusach, UserSettings } from '@/types/mitzvah';
import type { Location } from '@/types/zmanim';
import { appDayWindow, currentOrNextWindow } from '@/utils/buildDayTimeline';
import { calendarDay, checkInFor } from '@/utils/checkIn';
import { computeStats, computeStreak, judgeDay } from '@/utils/historyStats';
import { dayFeatures, kiddushLevanaPeriod } from '@/utils/siddur';

const JERUSALEM = CITIES[0];
const LOS_ANGELES = findCityById('los-angeles')!;
const NUSCHAOT: Nusach[] = ['ashkenaz', 'sefard', 'edot_hamizrach', 'chabad'];
const MINUTE = 60_000;

const settingsFor = (nusach: Nusach, inIsrael = true): UserSettings => ({
  nusach,
  halachicOpinions: { ksSofZman: 'GRA' },
  inIsrael,
});
const A = settingsFor('ashkenaz');

const KL: Mitzvah = findMitzvah('kiddush_levana')!;

const ctxFor = (location: Location, iso: string, settings: UserSettings, clock = '12:00') => ({
  date: calendarDay(iso),
  location,
  settings,
  zmanim: zmanimFor(at(location, `${iso}T${clock}`), location),
});
const windowOn = (location: Location, iso: string, settings: UserSettings, clock?: string) =>
  KL.computeWindow(ctxFor(location, iso, settings, clock));
const daysFrom = (iso: string, count: number) =>
  Array.from({ length: count }, (_, i) => DateTime.fromISO(iso).plus({ days: i }).toISODate()!);
const windowDays = (location: Location, settings: UserSettings, from: string, count: number) =>
  daysFrom(from, count).filter((iso) => windowOn(location, iso, settings) !== null);
const nightfallOn = (location: Location, iso: string) =>
  HebcalService.nightfall(zmanimFor(at(location, `${iso}T12:00`), location), location);
const blockEndOn = (location: Location, iso: string) =>
  HebcalService.holyBlockOn(at(location, `${iso}T12:00`), location)!.end;
const afterMinutes = (instant: Date, minutes: number) => new Date(instant.getTime() + minutes * MINUTE);

function planInput(overrides: Partial<PlanInput> = {}): PlanInput {
  const now = overrides.now ?? at(JERUSALEM, '2026-10-14T10:00');
  return {
    now,
    fromDate: now,
    platform: 'android',
    hasPermission: true,
    language: 'he',
    location: JERUSALEM,
    settings: A,
    mitzvot: [KL],
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

const levanaPlan = (overrides: Partial<PlanInput> = {}) =>
  buildPlan(planInput(overrides)).filter((candidate) => candidate.id.startsWith('kiddush_levana__'));
const idsAndTriggers = (candidates: ReturnType<typeof levanaPlan>) =>
  candidates.map((candidate) => [candidate.id, candidate.trigger] as const);

describe('the Kiddush Levana registry entry', () => {
  it('is a monthly seasonal mitzvah of every nusach whose window outlasts a day, with two reminders', () => {
    expect(KL).toMatchObject({
      name: { he: 'קידוש לבנה', en: 'Kiddush Levana' },
      icon: 'moon',
      timeType: 'monthly-window',
      category: 'seasonal',
      group: 'other',
      skipOn: [],
      nuschaotSupported: NUSCHAOT,
      multiDay: { maxDays: 16 },
    });
    expect(KL.defaultReminders).toEqual([
      {
        anchor: 'start',
        offsetMin: 0,
        label: 'זמן קידוש לבנה',
        bodyVariants: ['זמן קידוש לבנה', 'מהלילה אפשר לקדש את הלבנה', 'הלבנה מתחדשת, זה הזמן לברך עליה'],
      },
      {
        anchor: 'blockExit',
        offsetMin: 15,
        label: 'קידוש לבנה במוצאי שבת וחג',
        skipIfDone: true,
        bodyVariants: [
          'קידוש לבנה במוצאי שבת וחג',
          'במוצאי שבת וחג נוהגים לקדש את הלבנה',
          'יצאנו לחול, זה זמן טוב לקידוש לבנה',
        ],
      },
    ]);
  });

  it('reads the standalone text, is a men’s mitzvah, sits before Chok LeYisrael and is the only multi-day one', () => {
    expect(MITZVAH_STANDALONE_TEXT.kiddush_levana).toBe('kiddush_levana');
    expect(isMensMitzvah('kiddush_levana')).toBe(true);
    const ids = MITZVOT.map((mitzvah) => mitzvah.id);
    expect(ids.indexOf('kiddush_levana')).toBe(ids.indexOf('chok_leyisrael') - 1);
    expect(MITZVOT.filter((mitzvah) => mitzvah.multiDay).map((mitzvah) => mitzvah.id)).toEqual(['kiddush_levana']);
  });
});

describe('the Kiddush Levana window', () => {
  it.each([
    ['Jerusalem', JERUSALEM, true],
    ['Los Angeles', LOS_ANGELES, false],
  ] as const)("keys one window a month on its first night's day, in %s", (_name, location, inIsrael) => {
    for (const nusach of NUSCHAOT) {
      const settings = settingsFor(nusach, inIsrael);
      expect(windowDays(location, settings, '2026-10-01', 31)).toEqual([
        nusach === 'ashkenaz' ? '2026-10-14' : '2026-10-18',
      ]);
      expect(windowDays(location, settings, '2026-09-12', 19)).toEqual(['2026-09-21']);
      expect(windowDays(location, settings, '2026-07-15', 15)).toEqual(['2026-07-23']);
    }
  });

  it("runs from that night's nightfall to the period end", () => {
    expect(windowOn(JERUSALEM, '2026-10-14', A)).toEqual({
      start: nightfallOn(JERUSALEM, '2026-10-14'),
      end: new Date('2026-10-26T01:44:10.171Z'),
    });
    expect(windowOn(JERUSALEM, '2026-10-18', settingsFor('edot_hamizrach'))).toEqual({
      start: nightfallOn(JERUSALEM, '2026-10-18'),
      end: new Date('2026-10-26T07:22:10.171Z'),
    });
    expect(windowOn(JERUSALEM, '2026-09-21', A)!.start).toEqual(blockEndOn(JERUSALEM, '2026-09-21'));
    expect(windowDays(JERUSALEM, A, '2026-11-08', 10)).toEqual(['2026-11-14']);
    expect(windowOn(JERUSALEM, '2026-11-14', A)!.start).toEqual(blockEndOn(JERUSALEM, '2026-11-14'));
  });

  it('depends only on the day, not on the clock time of ctx.date', () => {
    const noon = windowOn(JERUSALEM, '2026-10-14', A, '12:00');
    expect(noon).not.toBeNull();
    expect(windowOn(JERUSALEM, '2026-10-14', A, '00:30')).toEqual(noon);
    expect(windowOn(JERUSALEM, '2026-10-14', A, '23:30')).toEqual(noon);
  });

  it("stays on home every night and day of its period, under the first night's day", () => {
    const first = calendarDay('2026-10-14');
    const w = windowOn(JERUSALEM, '2026-10-14', A)!;
    const upcoming = appDayWindow(KL, JERUSALEM, A, at(JERUSALEM, '2026-10-14T12:00'));
    expect(upcoming).toMatchObject({ start: w.start, end: w.end, date: first });
    for (const instant of ['2026-10-19T12:00', '2026-10-20T21:00', '2026-10-26T03:00']) {
      expect(appDayWindow(KL, JERUSALEM, A, at(JERUSALEM, instant))).toMatchObject({ start: w.start, date: first });
    }
    expect(appDayWindow(KL, JERUSALEM, A, at(JERUSALEM, '2026-10-13T20:00'))).toBeNull();
    expect(appDayWindow(KL, JERUSALEM, A, at(JERUSALEM, '2026-10-26T05:00'))).toBeNull();
    expect(currentOrNextWindow(KL, JERUSALEM, A, at(JERUSALEM, '2026-10-20T21:00'))!.date).toEqual(first);
    expect(currentOrNextWindow(KL, JERUSALEM, A, at(JERUSALEM, '2026-10-27T12:00'))!.date).toEqual(
      calendarDay('2026-11-14'),
    );
  });
});

describe('Kiddush Levana in history and the check-in', () => {
  const day = calendarDay('2026-10-14');
  const input = { mitzvot: [KL], completions: {}, location: JERUSALEM, settings: A };
  const marked = { ...input, completions: { '2026-10-14': { kiddush_levana: 1 } } };
  const end = windowOn(JERUSALEM, '2026-10-14', A)!.end;

  it('is open until the period ends, then missed, and done when marked', () => {
    expect(judgeDay(day, input, afterMinutes(end, -1)).pending).toEqual(['kiddush_levana']);
    expect(judgeDay(day, input, afterMinutes(end, 1)).missed).toEqual(['kiddush_levana']);
    expect(judgeDay(day, marked, afterMinutes(end, 1)).done).toEqual(['kiddush_levana']);
    for (const iso of daysFrom('2026-10-15', 11)) {
      const verdict = judgeDay(calendarDay(iso), input, afterMinutes(end, 1));
      expect([...verdict.done, ...verdict.missed, ...verdict.pending]).toEqual([]);
    }
  });

  it('counts as one item for the month in the stats', () => {
    const now = at(JERUSALEM, '2026-10-28T10:00');
    const open = computeStats([KL], {}, JERUSALEM, A, 30, now);
    expect(open.perMitzvah.kiddush_levana).toEqual({ done: 0, eligible: 1, pending: 0, percent: 0 });
    expect(open.daily.filter((entry) => entry.totalCount > 0).map((entry) => entry.date)).toEqual(['2026-10-14']);
    const done = computeStats([KL], marked.completions, JERUSALEM, A, 30, now);
    expect(done.perMitzvah.kiddush_levana).toEqual({ done: 1, eligible: 1, pending: 0, percent: 100 });
  });

  it('is judged when switched on mid-period and not when switched on after it', () => {
    const during = { ...input, enabledSince: { kiddush_levana: at(JERUSALEM, '2026-10-19T10:00').getTime() } };
    expect(judgeDay(day, during, afterMinutes(end, 1)).missed).toEqual(['kiddush_levana']);
    const after = { ...input, enabledSince: { kiddush_levana: at(JERUSALEM, '2026-10-27T10:00').getTime() } };
    const verdict = judgeDay(day, after, afterMinutes(end, 1));
    expect([...verdict.done, ...verdict.missed, ...verdict.pending]).toEqual([]);
  });

  it('never waits in the Shabbat check-in it spans', () => {
    const block = HebcalService.holyBlockOn(at(JERUSALEM, '2026-10-17T12:00'), JERUSALEM)!;
    const checkIn = { mitzvot: [KL], completions: {}, checkIns: {}, location: JERUSALEM, settings: A };
    expect(checkInFor(block, checkIn, afterMinutes(block.end, 1))).toBeNull();
    expect(judgeDay(day, input, afterMinutes(block.end, 1)).pending).toEqual(['kiddush_levana']);
  });
});

describe('Kiddush Levana and the streak', () => {
  const shacharit = findMitzvah('shacharit')!;
  const now = at(JERUSALEM, '2026-10-20T10:00');
  const marksExceptFirstNight = Object.fromEntries(
    daysFrom('2026-10-01', 20)
      .filter((iso) => iso !== '2026-10-14')
      .map((iso) => [iso, { shacharit: 1 }]),
  );
  const streakOf = (mitzvot: Mitzvah[], completions: Record<string, Record<string, number>>) =>
    computeStreak({ mitzvot, completions, location: JERUSALEM, settings: A }, now);

  it('does not hide a day whose other items were missed behind the open window of its first night', () => {
    const verdict = judgeDay(
      calendarDay('2026-10-14'),
      { mitzvot: [shacharit, KL], completions: marksExceptFirstNight, location: JERUSALEM, settings: A },
      now,
    );
    expect(verdict).toEqual({ key: '2026-10-14', done: [], missed: ['shacharit'], pending: ['kiddush_levana'] });
    expect(streakOf([shacharit], marksExceptFirstNight)).toBe(6);
    expect(streakOf([shacharit, KL], marksExceptFirstNight)).toBe(6);
  });

  it('keeps that day once Kiddush Levana is marked on it', () => {
    const marked = { ...marksExceptFirstNight, '2026-10-14': { kiddush_levana: now.getTime() } };
    expect(streakOf([shacharit, KL], marked)).toBe(20);
  });

  it('neither counts nor breaks on a day where only its open window is outstanding', () => {
    expect(streakOf([KL], { '2026-10-13': { shacharit: 1 } })).toBe(1);
  });
});

describe('the Kiddush Levana reminders', () => {
  const exit = (iso: string) => afterMinutes(blockEndOn(JERUSALEM, iso), 15);

  it('plans the first night and every Shabbat exit inside the window, and nothing inside a block', () => {
    const plan = levanaPlan();
    expect(idsAndTriggers(plan)).toEqual([
      ['kiddush_levana__2026-10-14__0', nightfallOn(JERUSALEM, '2026-10-14')],
      ['kiddush_levana__2026-10-14__1', exit('2026-10-17')],
      ['kiddush_levana__2026-10-14__1.1', exit('2026-10-24')],
    ]);
    expect(plan.map((candidate) => candidate.data.dateKey)).toEqual(['2026-10-14', '2026-10-14', '2026-10-14']);
    expect(plan.map((candidate) => candidate.data.reminderIndex)).toEqual([0, 1, 1]);
    expect(plan.map((candidate) => candidate.data.skipIfDone)).toEqual([false, true, true]);
    expect(plan.map((candidate) => candidate.categoryIdentifier)).toEqual(Array(3).fill(MITZVAH_TEXT_CATEGORY));
    expect(plan.map((candidate) => candidate.title)).toEqual(Array(3).fill('קידוש לבנה'));
    for (const candidate of plan) {
      expect(KL.defaultReminders[candidate.data.reminderIndex!].bodyVariants).toContain(candidate.body);
    }
    for (const iso of ['2026-10-17', '2026-10-24']) {
      const block = HebcalService.holyBlockOn(at(JERUSALEM, `${iso}T12:00`), JERUSALEM)!;
      const inside = plan.filter(
        (candidate) =>
          candidate.trigger.getTime() > block.start.getTime() && candidate.trigger.getTime() < block.end.getTime(),
      );
      expect(inside).toEqual([]);
    }
  });

  it('plans what remains of a window opened five days ago', () => {
    expect(idsAndTriggers(levanaPlan({ now: at(JERUSALEM, '2026-10-19T10:00') }))).toEqual([
      ['kiddush_levana__2026-10-14__1.1', exit('2026-10-24')],
    ]);
  });

  it.each([
    ['marked', { completions: { '2026-10-14': { kiddush_levana: 1 } } }],
    ['skipped', { skipped: { '2026-10-14': { kiddush_levana: 1 } } }],
  ])('plans nothing for a %s window', (_label, marks) => {
    expect(levanaPlan(marks)).toEqual([]);
  });

  it("gives sefard's window only the second exit", () => {
    const now = at(JERUSALEM, '2026-10-18T10:00');
    expect(idsAndTriggers(levanaPlan({ now, settings: settingsFor('sefard') }))).toEqual([
      ['kiddush_levana__2026-10-18__0', nightfallOn(JERUSALEM, '2026-10-18')],
      ['kiddush_levana__2026-10-18__1', exit('2026-10-24')],
    ]);
  });

  it('reminds Edot HaMizrach in Tishrei 5787 after the first day of Sukkot in Israel only', () => {
    const now = at(JERUSALEM, '2026-09-20T10:00');
    const edot = levanaPlan({ now, settings: settingsFor('edot_hamizrach') });
    expect(idsAndTriggers(edot)).toEqual([
      ['kiddush_levana__2026-09-21__0', blockEndOn(JERUSALEM, '2026-09-21')],
      ['kiddush_levana__2026-09-21__1', exit('2026-09-26')],
    ]);
    const abroad = levanaPlan({
      now: at(LOS_ANGELES, '2026-09-20T10:00'),
      location: LOS_ANGELES,
      settings: settingsFor('edot_hamizrach', false),
    });
    expect(idsAndTriggers(abroad)).toEqual([['kiddush_levana__2026-09-21__0', blockEndOn(LOS_ANGELES, '2026-09-21')]]);
    expect(idsAndTriggers(levanaPlan({ now }))).toEqual([
      ['kiddush_levana__2026-09-21__0', blockEndOn(JERUSALEM, '2026-09-21')],
    ]);
  });

  it('names the next reminder through the window, its Shabbat exits and the next month', () => {
    const scope = (instant: string, completions = {}) => ({
      now: at(JERUSALEM, instant),
      location: JERUSALEM,
      settings: A,
      completions,
      skipped: {},
    });
    const next = (instant: string, completions = {}) =>
      nextReminderAt(KL, KL.defaultReminders, scope(instant, completions));
    expect(next('2026-10-19T10:00')).toEqual(exit('2026-10-24'));
    expect(next('2026-10-25T10:00')).toEqual(blockEndOn(JERUSALEM, '2026-11-14'));
    expect(next('2026-10-19T10:00', { '2026-10-14': { kiddush_levana: 1 } })).toEqual(
      blockEndOn(JERUSALEM, '2026-11-14'),
    );
  });

  it('numbers a further trigger of the same reminder with a dot', () => {
    const date = new Date(2026, 9, 14);
    expect(buildId('kiddush_levana', date, 1, 1)).toBe('kiddush_levana__2026-10-14__1.1');
    expect(buildId('kiddush_levana', date, 1)).toBe('kiddush_levana__2026-10-14__1');
    expect(parseId('kiddush_levana__2026-10-14__1.1')).toEqual({
      mitzvahId: 'kiddush_levana',
      date: '2026-10-14',
      idx: 1,
    });
  });
});

describe('the siddur tab and the mitzvah agree on the nights', () => {
  const firstKey = (nusach: Nusach) => (nusach === 'ashkenaz' ? '2026-10-14' : '2026-10-18');
  const nights = Array.from({ length: 30 }, (_, index) => new HDate(index + 1, months.CHESHVAN, 5787));

  it.each([
    ['Jerusalem', JERUSALEM, true],
    ['Los Angeles', LOS_ANGELES, false],
  ] as const)('offers the text on exactly the window nights, in %s', (_name, location, inIsrael) => {
    const place = siddurPlace(location, inIsrael);
    for (const nusach of NUSCHAOT) {
      const offered = nights.filter((night) => hasStandaloneText('kiddush_levana', nusach, dayFeatures(night, place)));
      expect(offered.map((night) => night.getDate())).toEqual(
        nusach === 'ashkenaz' ? [4, 5, 7, 8, 9, 10, 11, 12, 14, 15] : [8, 9, 10, 11, 12, 14, 15],
      );
      const w = windowOn(location, firstKey(nusach), settingsFor(nusach, inIsrael))!;
      for (const night of offered) {
        const evening = DateTime.fromJSDate(night.prev().greg()).toISODate()!;
        const opens = nightfallOn(location, evening).getTime();
        expect(opens).toBeGreaterThanOrEqual(w.start.getTime());
        expect(opens).toBeLessThan(w.end.getTime());
      }
      expect(hasSiddurText(KL, nusach, calendarDay(firstKey(nusach)), place)).toBe(true);
    }
  });
});

describe('the siddur tab closes Kiddush Levana when its period ends', () => {
  const hoursAt = (nusach: Nusach, instant: Date, location: Location, inIsrael: boolean) =>
    standaloneHoursAt('kiddush_levana', nusach, instant, location, siddurPlace(location, inIsrael));
  const lastNight = new HDate(15, months.CHESHVAN, 5787);

  it("ends the last night's hours at the period end, not at the next alot", () => {
    const { end } = kiddushLevanaPeriod(lastNight, 'ashkenaz', JERUSALEM);
    const alot = zmanimFor(at(JERUSALEM, '2026-10-26T12:00'), JERUSALEM).alotHaShachar;
    expect(end.toISOString()).toBe('2026-10-26T01:44:10.171Z');
    expect(alot.getTime()).toBeGreaterThan(afterMinutes(end, 30).getTime());
    expect(hoursAt('ashkenaz', at(JERUSALEM, '2026-10-25T22:00'), JERUSALEM, true)).toEqual({
      start: nightfallOn(JERUSALEM, '2026-10-25'),
      end,
    });
    expect(hoursAt('ashkenaz', afterMinutes(end, -1), JERUSALEM, true)?.end).toEqual(end);
    for (const instant of [end, afterMinutes(end, 1), afterMinutes(end, 30), at(JERUSALEM, '2026-10-26T04:00')]) {
      expect(hoursAt('ashkenaz', instant, JERUSALEM, true)).toBeNull();
      expect(standalonePeriodEnded('kiddush_levana', 'ashkenaz', instant, JERUSALEM)).toBe(true);
    }
    expect(standalonePeriodEnded('kiddush_levana', 'ashkenaz', afterMinutes(end, -1), JERUSALEM)).toBe(false);
  });

  it("keeps Edot HaMizrach's last night open to alot, because its period ends the next morning", () => {
    const { end } = kiddushLevanaPeriod(lastNight, 'edot_hamizrach', JERUSALEM);
    const alot = zmanimFor(at(JERUSALEM, '2026-10-26T12:00'), JERUSALEM).alotHaShachar;
    const beforeAlot = at(JERUSALEM, '2026-10-26T04:00');
    expect(end.getTime()).toBeGreaterThan(alot.getTime());
    expect(hoursAt('edot_hamizrach', at(JERUSALEM, '2026-10-25T22:00'), JERUSALEM, true)).toEqual({
      start: nightfallOn(JERUSALEM, '2026-10-25'),
      end: alot,
    });
    expect(hoursAt('edot_hamizrach', beforeAlot, JERUSALEM, true)?.end).toEqual(alot);
    expect(standalonePeriodEnded('kiddush_levana', 'edot_hamizrach', beforeAlot, JERUSALEM)).toBe(false);
  });

  it('never offers hours past the period end, in any month of 5787, in each nusach', () => {
    let pastEnd = 0;
    for (const [location, inIsrael] of [
      [JERUSALEM, true],
      [LOS_ANGELES, false],
    ] as const) {
      for (const nusach of NUSCHAOT) {
        for (let month = 1; month <= 12; month++) {
          const { end } = kiddushLevanaPeriod(new HDate(1, month, 5787), nusach, location);
          for (let step = -6; step <= 12; step++) {
            const instant = afterMinutes(end, step * 30);
            const hours = hoursAt(nusach, instant, location, inIsrael);
            if (hours) {
              expect(hours.end.getTime()).toBeLessThanOrEqual(end.getTime());
              expect(standalonePeriodEnded('kiddush_levana', nusach, instant, location)).toBe(false);
            }
            if (step >= 0) {
              expect(hours).toBeNull();
              pastEnd++;
            }
          }
        }
      }
    }
    expect(pastEnd).toBe(2 * 4 * 12 * 13);
  });
});
