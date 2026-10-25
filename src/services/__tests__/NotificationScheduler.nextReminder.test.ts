jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
  AndroidImportance: { HIGH: 'high' },
  AndroidNotificationVisibility: { PUBLIC: 'public' },
}));
jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
jest.mock('expo-background-task', () => ({
  registerTaskAsync: jest.fn(),
  unregisterTaskAsync: jest.fn(),
  getStatusAsync: jest.fn(),
  BackgroundTaskResult: { Success: 1, Failed: 2 },
  BackgroundTaskStatus: { Restricted: 1, Available: 2 },
}));

import { nextReminderAt } from '../NotificationScheduler';
import * as web from '../NotificationScheduler.web';
import { buildPlan } from '@/services/notifications/plan';
import type { ReminderScope } from '@/services/notifications/planners/mitzvot';
import type { PlanInput } from '@/services/notifications/types';
import { CITIES } from '@/data/cities';
import { customToMitzvah } from '@/data/customMitzvotAdapter';
import { MITZVOT } from '@/data/mitzvot';
import { rulesFor } from '@/data/taharahPresets';
import { HebcalService } from '@/services/HebcalService';
import { useChokStore } from '@/stores/useChokStore';
import { DEFAULT_HILULA_NOTICES, DEFAULT_ROSH_CHODESH_NOTICES } from '@/stores/useUserStore';
import { installChokFixture } from '@/testing/chok';
import { at, zmanimFor } from '@/testing/zmanim';
import type { Mitzvah, Reminder, UserSettings } from '@/types/mitzvah';
import type { Location } from '@/types/zmanim';
import { isQuietAt } from '@/utils/skipRules';

const JERUSALEM = CITIES[0];
const LONDON = CITIES.find((city) => city.cityId === 'london')!;
const LOS_ANGELES = CITIES.find((city) => city.nameEn === 'Los Angeles')!;
const IL: UserSettings = { nusach: 'ashkenaz', halachicOpinions: { ksSofZman: 'GRA' }, inIsrael: true };
const ABROAD: UserSettings = { ...IL, inIsrael: false };
const MARK = 1_000;

const byId = (id: string) => MITZVOT.find((mitzvah) => mitzvah.id === id)!;
const zmanimOn = (iso: string, location: Location = JERUSALEM) => zmanimFor(at(location, `${iso}T12:00`), location);
const minutes = (instant: Date, delta: number) => new Date(instant.getTime() + delta * 60_000);

function scopeAt(now: Date, overrides: Partial<ReminderScope> = {}): ReminderScope {
  return { now, location: JERUSALEM, settings: IL, completions: {}, skipped: {}, ...overrides };
}

const nextFor = (mitzvah: Mitzvah, now: Date, overrides: Partial<ReminderScope> = {}) =>
  nextReminderAt(mitzvah, mitzvah.defaultReminders, scopeAt(now, overrides));

function planInput(mitzvah: Mitzvah, now: Date, overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    now,
    fromDate: now,
    platform: 'android',
    hasPermission: true,
    language: 'he',
    location: JERUSALEM,
    settings: IL,
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
    ...overrides,
  };
}

const plannedNext = (plan: ReturnType<typeof buildPlan>, mitzvahId: string) =>
  plan.find((candidate) => candidate.id.startsWith(`${mitzvahId}__`))?.trigger ?? null;

const TUESDAY = '2026-10-13';
const WEDNESDAY = '2026-10-14';
const FRIDAY = '2026-11-13';
const SATURDAY = '2026-11-14';
const SUNDAY = '2026-11-15';

describe('nextReminderAt', () => {
  const shacharit = byId('shacharit');
  const tefillin = byId('tefillin');
  const mincha = byId('mincha');

  it('is the first reminder still ahead in the window that is open', () => {
    const tuesday = zmanimOn(TUESDAY);
    expect(nextFor(shacharit, at(JERUSALEM, `${TUESDAY}T03:00`))?.getTime()).toBe(tuesday.netzHaChama.getTime());
    expect(nextFor(shacharit, minutes(tuesday.netzHaChama, 1))?.getTime()).toBe(
      minutes(tuesday.sofZmanTfilaGra, -45).getTime(),
    );
  });

  it('is strictly after now: a reminder due this very instant has fired', () => {
    const netz = zmanimOn(TUESDAY).netzHaChama;
    expect(nextFor(shacharit, netz)?.getTime()).toBe(minutes(zmanimOn(TUESDAY).sofZmanTfilaGra, -45).getTime());
  });

  it("goes on to tomorrow's first reminder once the last of today's has fired", () => {
    const afterLast = minutes(zmanimOn(TUESDAY).sofZmanTfilaGra, -44);
    expect(nextFor(shacharit, afterLast)?.getTime()).toBe(zmanimOn(WEDNESDAY).netzHaChama.getTime());
    expect(nextFor(shacharit, at(JERUSALEM, `${TUESDAY}T23:30`))?.getTime()).toBe(
      zmanimOn(WEDNESDAY).netzHaChama.getTime(),
    );
  });

  it('does the same on a location whose zone is far from the device', () => {
    const afterLast = minutes(zmanimOn(TUESDAY, LOS_ANGELES).sofZmanTfilaGra, -44);
    expect(nextFor(shacharit, afterLast, { location: LOS_ANGELES, settings: ABROAD })?.getTime()).toBe(
      zmanimOn(WEDNESDAY, LOS_ANGELES).netzHaChama.getTime(),
    );
  });

  it('skips a window already marked done or skipped, and goes on to the next', () => {
    const early = at(JERUSALEM, `${TUESDAY}T03:00`);
    const wednesday = zmanimOn(WEDNESDAY).netzHaChama.getTime();
    expect(nextFor(shacharit, early, { completions: { [TUESDAY]: { shacharit: MARK } } })?.getTime()).toBe(wednesday);
    expect(nextFor(shacharit, early, { skipped: { [TUESDAY]: { shacharit: MARK } } })?.getTime()).toBe(wednesday);
    expect(
      nextFor(shacharit, early, {
        completions: { [TUESDAY]: { shacharit: MARK }, [WEDNESDAY]: { shacharit: MARK } },
      })?.getTime(),
    ).toBe(zmanimOn('2026-10-15').netzHaChama.getTime());
    expect(nextFor(shacharit, early, { completions: { [TUESDAY]: { mincha: MARK } } })?.getTime()).toBe(
      zmanimOn(TUESDAY).netzHaChama.getTime(),
    );
  });

  describe('before Shabbat', () => {
    const block = HebcalService.holyBlockOn(at(JERUSALEM, `${SATURDAY}T12:00`), JERUSALEM)!;
    const friday = zmanimOn(FRIDAY);
    const sunday = zmanimOn(SUNDAY);

    it.each([
      ['shacharit', shacharit, minutes(friday.sofZmanTfilaGra, -44), sunday.netzHaChama],
      ['mincha', mincha, minutes(friday.shkia, -59), sunday.minchaGedola],
      ['tefillin', tefillin, minutes(friday.shkia, -44), sunday.misheyakir],
    ])("goes past the block to Sunday's first %s reminder, never to one inside it", (_name, mitzvah, now, expected) => {
      expect(now.getTime()).toBeLessThan(block.start.getTime());
      const next = nextFor(mitzvah, now)!;
      expect(next.getTime()).toBe(expected.getTime());
      expect(isQuietAt(next, JERUSALEM)).toBe(false);
      expect(next.getTime()).toBeGreaterThan(block.end.getTime());
    });

    it('answers the same from inside the block', () => {
      const inside = minutes(block.start, 60);
      expect(isQuietAt(inside, JERUSALEM)).toBe(true);
      expect(nextFor(shacharit, inside)?.getTime()).toBe(sunday.netzHaChama.getTime());
      expect(nextFor(tefillin, inside)?.getTime()).toBe(sunday.misheyakir.getTime());
    });
  });

  it('looks far enough ahead to clear Sukkot in Israel, where tefillin is off through all of chol hamoed', () => {
    expect(HebcalService.isCholHamoed(at(JERUSALEM, '2027-10-19T12:00'), JERUSALEM)).toBe(true);
    const afterErevSukkot = minutes(zmanimOn('2027-10-15').shkia, -44);
    expect(nextFor(tefillin, afterErevSukkot)?.getTime()).toBe(zmanimOn('2027-10-24').misheyakir.getTime());
  });

  it('is null when there is no reminder, when the window never opens and when none fires in range', () => {
    const now = at(JERUSALEM, `${TUESDAY}T03:00`);
    expect(nextReminderAt(shacharit, [], scopeAt(now))).toBeNull();
    expect(
      nextReminderAt({ ...shacharit, computeWindow: () => null }, shacharit.defaultReminders, scopeAt(now)),
    ).toBeNull();
    const outside: Reminder[] = [{ anchor: 'start', offsetMin: 99_999, label: 'late' }];
    expect(nextReminderAt(shacharit, outside, scopeAt(now))).toBeNull();
  });

  it('uses the reminders it is given, not the registry defaults', () => {
    const now = at(JERUSALEM, `${TUESDAY}T03:00`);
    const custom: Reminder[] = [{ anchor: 'start', offsetMin: 20, label: 'custom' }];
    expect(nextReminderAt(shacharit, custom, scopeAt(now))?.getTime()).toBe(
      minutes(zmanimOn(TUESDAY).netzHaChama, 20).getTime(),
    );
  });

  describe('heads-up reminders and clock reminders before the window', () => {
    const HEADS_UP: Reminder[] = [{ anchor: 'start', offsetMin: -60, label: 'הקדמה' }];

    it('fires a start reminder at -60 an hour before the window opens, as the plan does', () => {
      const now = at(JERUSALEM, `${TUESDAY}T03:00`);
      const expected = minutes(zmanimOn(TUESDAY).netzHaChama, -60).getTime();
      const planned = plannedNext(
        buildPlan(planInput(shacharit, now, { reminderOverrides: { shacharit: HEADS_UP } })),
        'shacharit',
      );
      expect(nextReminderAt(shacharit, HEADS_UP, scopeAt(now))?.getTime()).toBe(expected);
      expect(planned?.getTime()).toBe(expected);
    });

    it('accepts a heads-up of exactly 180 minutes and drops 181, or one past the end', () => {
      const now = at(JERUSALEM, `${TUESDAY}T00:30`);
      const only = (anchor: Reminder['anchor'], offsetMin: number): Reminder[] => [{ anchor, offsetMin, label: 'x' }];
      expect(nextReminderAt(shacharit, only('start', -180), scopeAt(now))?.getTime()).toBe(
        minutes(zmanimOn(TUESDAY).netzHaChama, -180).getTime(),
      );
      expect(nextReminderAt(shacharit, only('start', -181), scopeAt(now))).toBeNull();
      expect(nextReminderAt(shacharit, only('end', 1), scopeAt(now))).toBeNull();
    });

    it('never fires a heads-up inside a holy block', () => {
      const havdalah = byId('havdalah');
      const now = at(JERUSALEM, `${FRIDAY}T08:00`);
      const block = HebcalService.holyBlockOn(at(JERUSALEM, `${SATURDAY}T12:00`), JERUSALEM)!;
      expect(nextReminderAt(havdalah, [{ anchor: 'start', offsetMin: -60, label: 'x' }], scopeAt(now))).toBeNull();
      const atExit = nextReminderAt(havdalah, [{ anchor: 'start', offsetMin: 0, label: 'x' }], scopeAt(now))!;
      expect(atExit).not.toBeNull();
      expect(isQuietAt(atExit, JERUSALEM)).toBe(false);
      expect(atExit.getTime()).toBeGreaterThanOrEqual(block.end.getTime());
    });

    it('schedules a 10:00 birchot hashachar clock reminder at 10:00 on the location clock, past sof zman Shema', () => {
      const birchot = byId('birchot_hashachar');
      const ten: Reminder = { anchor: 'clock', offsetMin: 600, label: 'עשר' };
      const now = at(JERUSALEM, '2026-12-16T07:00');
      const plan = buildPlan(planInput(birchot, now, { reminderOverrides: { birchot_hashachar: [ten] } }));
      const first = plan.find((candidate) => candidate.id.startsWith('birchot_hashachar__'))!;
      const tenOClock = at(JERUSALEM, '2026-12-16T10:00');
      expect(first.id).toBe('birchot_hashachar__2026-12-16__0');
      expect(first.trigger.getTime()).toBe(tenOClock.getTime());
      expect(tenOClock.getTime()).toBeGreaterThan(zmanimOn('2026-12-16').sofZmanShmaGra.getTime());
      expect(nextReminderAt(birchot, [ten], scopeAt(now))?.getTime()).toBe(tenOClock.getTime());
    });
  });

  describe('a follow-up after the window', () => {
    const followUp = (offsetMin: number): Reminder => ({ anchor: 'followUp', offsetMin, label: 'עוד לא סימנת' });
    const custom = (reminder: Reminder, startHHMM = '10:00', endHHMM = '11:00') =>
      customToMitzvah({
        id: 'custom_follow',
        name: 'לימוד',
        startHHMM,
        endHHMM,
        reminders: [reminder],
        skipOn: [],
        createdAt: 1,
      });

    it('fires after the window, as the plan does, and moves to the next day once today is marked done or skipped', () => {
      const mitzvah = custom(followUp(60));
      const now = at(JERUSALEM, '2026-11-11T10:30');
      const today = at(JERUSALEM, '2026-11-11T12:00').getTime();
      const tomorrow = at(JERUSALEM, '2026-11-12T12:00').getTime();
      expect(nextFor(mitzvah, now)?.getTime()).toBe(today);
      expect(plannedNext(buildPlan(planInput(mitzvah, now)), 'custom_follow')?.getTime()).toBe(today);
      const marks = { '2026-11-11': { custom_follow: MARK } };
      expect(nextFor(mitzvah, now, { completions: marks })?.getTime()).toBe(tomorrow);
      expect(nextFor(mitzvah, now, { skipped: marks })?.getTime()).toBe(tomorrow);
    });

    it('reaches a follow-up of a full-day window that opened two days earlier', () => {
      const mitzvah = custom(followUp(720), '20:00', '20:00');
      const now = at(JERUSALEM, '2026-11-13T00:15');
      const expected = at(JERUSALEM, '2026-11-13T08:00').getTime();
      expect(nextFor(mitzvah, now)?.getTime()).toBe(expected);
      expect(plannedNext(buildPlan(planInput(mitzvah, now)), 'custom_follow')?.getTime()).toBe(expected);
    });
  });

  describe('against the scheduler', () => {
    const nows = [
      ['Tuesday before dawn', at(JERUSALEM, `${TUESDAY}T03:00`)],
      ['Tuesday midday', at(JERUSALEM, `${TUESDAY}T12:00`)],
      ['Tuesday night', at(JERUSALEM, `${TUESDAY}T23:00`)],
      ['Friday morning', at(JERUSALEM, `${FRIDAY}T08:00`)],
      ['Friday afternoon', at(JERUSALEM, `${FRIDAY}T14:30`)],
      [
        'Friday just before candle lighting',
        minutes(HebcalService.holyBlockOn(at(JERUSALEM, `${SATURDAY}T12:00`), JERUSALEM)!.start, -5),
      ],
      ['Shabbat midday', at(JERUSALEM, `${SATURDAY}T12:00`)],
      ['Sunday night', at(JERUSALEM, `${SUNDAY}T21:00`)],
    ] as const;

    it.each(nows)('names the first reminder the plan schedules, %s', (_label, now) => {
      for (const mitzvah of [tefillin, shacharit, mincha]) {
        const planned = plannedNext(buildPlan(planInput(mitzvah, now)), mitzvah.id);
        expect(planned).not.toBeNull();
        expect(nextFor(mitzvah, now)?.getTime()).toBe(planned!.getTime());
      }
    });

    it.each(nows)('names the first heads-up reminder the plan schedules, %s', (_label, now) => {
      const headsUp: Reminder[] = [{ anchor: 'start', offsetMin: -60, label: 'הקדמה' }];
      const planned = plannedNext(
        buildPlan(planInput(shacharit, now, { reminderOverrides: { shacharit: headsUp } })),
        'shacharit',
      );
      expect(planned).not.toBeNull();
      expect(nextReminderAt(shacharit, headsUp, scopeAt(now))?.getTime()).toBe(planned!.getTime());
    });

    it('agrees once today is marked done', () => {
      const now = at(JERUSALEM, `${TUESDAY}T03:00`);
      const completions = { [TUESDAY]: { shacharit: MARK } };
      const planned = plannedNext(buildPlan(planInput(shacharit, now, { completions })), 'shacharit');
      expect(planned?.getTime()).toBe(zmanimOn(WEDNESDAY).netzHaChama.getTime());
      expect(nextFor(shacharit, now, { completions })?.getTime()).toBe(planned!.getTime());
    });
  });

  it('is the same function on the web shim', () => {
    expect(web.nextReminderAt).toBe(nextReminderAt);
  });
});

describe('nextReminderAt for Chok LeYisrael', () => {
  beforeAll(() => {
    installChokFixture();
  });
  afterAll(() => {
    useChokStore.getState().reset();
  });

  const CHOK = byId('chok_leyisrael');
  const morning = (iso: string) => at(JERUSALEM, `${iso}T09:00`);
  const nextChok = (now: Date, overrides: Partial<ReminderScope> = {}) =>
    nextReminderAt(CHOK, CHOK.defaultReminders, scopeAt(now, overrides));

  it('is the 09:00 reminder while the day has not started, and the next day once it has fired', () => {
    expect(nextChok(at(JERUSALEM, '2026-12-14T04:00'))?.getTime()).toBe(morning('2026-12-14').getTime());
    expect(nextChok(minutes(morning('2026-12-14'), 1))?.getTime()).toBe(morning('2026-12-15').getTime());
    expect(nextChok(at(JERUSALEM, '2026-12-15T02:00'))?.getTime()).toBe(morning('2026-12-15').getTime());
  });

  it('goes past Shabbat: Thursday to Friday, and Friday to Sunday', () => {
    expect(nextChok(minutes(morning('2026-12-17'), 1))?.getTime()).toBe(morning('2026-12-18').getTime());
    const sunday = nextChok(minutes(morning('2026-12-18'), 1))!;
    expect(sunday.getTime()).toBe(morning('2026-12-20').getTime());
    expect(isQuietAt(sunday, JERUSALEM)).toBe(false);
  });

  it('skips a day marked done', () => {
    const now = at(JERUSALEM, '2026-12-14T04:00');
    expect(nextChok(now, { completions: { '2026-12-14': { chok_leyisrael: MARK } } })?.getTime()).toBe(
      morning('2026-12-15').getTime(),
    );
  });

  it('names the 09:00 reminder on the clock of the location, the Friday one too', () => {
    const london = { location: LONDON, settings: ABROAD };
    const londonMorning = (iso: string) => at(LONDON, `${iso}T09:00`);
    expect(nextChok(at(LONDON, '2027-06-17T04:00'), london)?.getTime()).toBe(londonMorning('2027-06-17').getTime());
    expect(nextChok(minutes(londonMorning('2027-06-17'), 1), london)?.getTime()).toBe(
      londonMorning('2027-06-18').getTime(),
    );
    expect(nextChok(minutes(londonMorning('2027-06-18'), 1), london)?.getTime()).toBe(
      londonMorning('2027-06-20').getTime(),
    );
    for (const now of [
      at(LONDON, '2027-06-17T04:00'),
      minutes(londonMorning('2027-06-17'), 1),
      minutes(londonMorning('2027-06-18'), 1),
    ]) {
      const planned = plannedNext(buildPlan(planInput(CHOK, now, london)), 'chok_leyisrael');
      expect(nextChok(now, london)?.getTime()).toBe(planned!.getTime());
    }
  });

  it("is the earliest trigger across windows: tomorrow's heads-up before tonight's last reminder", () => {
    const reminders: Reminder[] = [
      { anchor: 'end', offsetMin: -30, label: 'אחרון' },
      { anchor: 'start', offsetMin: -60, label: 'הקדמה' },
    ];
    const now = at(JERUSALEM, '2026-12-14T12:00');
    const expected = minutes(zmanimOn('2026-12-15').alotHaShachar, -60).getTime();
    const planned = plannedNext(
      buildPlan(planInput(CHOK, now, { reminderOverrides: { chok_leyisrael: reminders } })),
      'chok_leyisrael',
    );
    expect(nextReminderAt(CHOK, reminders, scopeAt(now))?.getTime()).toBe(expected);
    expect(planned?.getTime()).toBe(expected);
  });

  it('files a 03:00 clock reminder under the window still open at 03:00, not the one that has not opened', () => {
    const night: Reminder[] = [{ anchor: 'clock', offsetMin: 180, label: 'לילה' }];
    const now = at(JERUSALEM, '2026-12-14T12:00');
    const first = buildPlan(planInput(CHOK, now, { reminderOverrides: { chok_leyisrael: night } })).find((candidate) =>
      candidate.id.startsWith('chok_leyisrael__'),
    )!;
    expect(first.id).toBe('chok_leyisrael__2026-12-14__0');
    expect(first.trigger.getTime()).toBe(at(JERUSALEM, '2026-12-15T03:00').getTime());
    expect(nextReminderAt(CHOK, night, scopeAt(now))?.getTime()).toBe(first.trigger.getTime());
  });

  describe('a 03:00 clock reminder on the Friday short window', () => {
    const night: Reminder[] = [{ anchor: 'clock', offsetMin: 180, label: 'לילה' }];
    const now = at(JERUSALEM, '2026-12-17T12:00');
    const fridayThreeAm = at(JERUSALEM, '2026-12-18T03:00').getTime();
    const chokAtFridayThreeAm = (overrides: Partial<PlanInput> = {}) =>
      buildPlan(planInput(CHOK, now, { reminderOverrides: { chok_leyisrael: night }, ...overrides })).filter(
        (candidate) => candidate.id.startsWith('chok_leyisrael__') && candidate.trigger.getTime() === fridayThreeAm,
      );

    it("is one notification, filed under Thursday's window that is still open at 03:00", () => {
      expect(chokAtFridayThreeAm().map((candidate) => candidate.id)).toEqual(['chok_leyisrael__2026-12-17__0']);
    });

    it("moves to Friday's own window once Thursday is marked done", () => {
      const done = { completions: { '2026-12-17': { chok_leyisrael: MARK } } };
      expect(chokAtFridayThreeAm(done).map((candidate) => candidate.id)).toEqual(['chok_leyisrael__2026-12-18__0']);
    });
  });

  it('agrees with the plan', () => {
    for (const now of [
      at(JERUSALEM, '2026-12-14T04:00'),
      minutes(morning('2026-12-14'), 1),
      minutes(morning('2026-12-17'), 1),
      minutes(morning('2026-12-18'), 1),
    ]) {
      const planned = plannedNext(buildPlan(planInput(CHOK, now)), 'chok_leyisrael');
      expect(nextChok(now)?.getTime()).toBe(planned!.getTime());
    }
  });
});
