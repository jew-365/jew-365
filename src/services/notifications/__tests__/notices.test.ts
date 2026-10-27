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
import { DateTime } from 'luxon';
import { buildPlan } from '../plan';
import { noticeDayLabel, noticePhase } from '../planners/horizon';
import type { PlanInput, ScheduleCandidate } from '../types';
import { CITIES } from '@/data/cities';
import { rulesFor } from '@/data/taharahPresets';
import { setLocale } from '@/i18n';
import {
  DEFAULT_HILULA_NOTICES,
  DEFAULT_ROSH_CHODESH_NOTICES,
  type HilulaNotices,
  type NoticeSetting,
  type RoshChodeshNotices,
} from '@/stores/useUserStore';
import { at, zmanimFor } from '@/testing/zmanim';
import type { Location } from '@/types/zmanim';

const J = CITIES[0];
const D_RC = DEFAULT_ROSH_CHODESH_NOTICES;
const D_H = DEFAULT_HILULA_NOTICES;

const THU = at(J, '2026-10-08T12:00');
const WED = at(J, '2027-04-07T12:00');
const MON = at(J, '2026-10-12T06:00');
const SUN = at(J, '2026-10-11T06:00');
const FRI = at(J, '2026-10-16T06:00');
const TUE = at(J, '2026-10-06T06:00');
const WED_BEFORE = at(J, '2026-10-07T06:00');
const FRI_JAN_1 = at(J, '2027-01-01T06:00');
const FRI_JAN_22 = at(J, '2027-01-22T06:00');

const C1 = new HDate(1, months.CHESHVAN, 5787).abs();
const C3 = new HDate(3, months.CHESHVAN, 5787).abs();
const C7 = new HDate(7, months.CHESHVAN, 5787).abs();
const T30 = new HDate(30, months.TISHREI, 5787).abs();
const N1 = new HDate(1, months.NISAN, 5787).abs();
const R_AND_O = 'רבי ישראל מרוז׳ין, הרב עובדיה יוסף';
const SHAPIRA = 'רבי מאיר שפירא מלובלין';

function planInput(overrides: Partial<PlanInput> = {}): PlanInput {
  const now = overrides.now ?? THU;
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
    hilulaNotices: D_H,
    roshChodeshNotices: D_RC,
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

const off = (setting: NoticeSetting): NoticeSetting => ({ ...setting, enabled: false });
const clock = (minutes: number, daysBefore?: number): NoticeSetting => ({
  enabled: true,
  ...(daysBefore === undefined ? {} : { daysBefore }),
  timing: { anchor: 'clock', minutes },
});
const shkiaLead = (offsetMin: number, daysBefore?: number): NoticeSetting => ({
  enabled: true,
  ...(daysBefore === undefined ? {} : { daysBefore }),
  timing: { anchor: 'shkia', offsetMin },
});

const rc = (notices: Partial<RoshChodeshNotices>, now: Date, language: PlanInput['language'] = 'he') =>
  buildPlan(planInput({ now, language, roshChodeshEnabled: true, roshChodeshNotices: { ...D_RC, ...notices } }));
const h = (notices: Partial<HilulaNotices>, now: Date, language: PlanInput['language'] = 'he') =>
  buildPlan(planInput({ now, language, hilulotEnabled: true, hilulaNotices: { ...D_H, ...notices } }));

const only = (plan: ScheduleCandidate[], prefix: string) => plan.filter((c) => c.id.startsWith(prefix));
const ids = (plan: ScheduleCandidate[], prefix: string) => only(plan, prefix).map((c) => c.id);
const summary = (plan: ScheduleCandidate[], prefix: string) =>
  only(plan, prefix).map((c) => [c.id, c.trigger.getTime()]);
const candidate = (plan: ScheduleCandidate[], id: string) => plan.find((c) => c.id === id)!;
const lines = (plan: ScheduleCandidate[], id: string) => candidate(plan, id).body.split('\n');
const shkiaOn = (iso: string) => zmanimFor(at(J, `${iso}T12:00`), J).shkia;

const rcId = (abs: number, when: 'before' | 'evening' | 'day') => `roshChodesh:${abs}:${when}`;
const hId = (abs: number, when: 'before' | 'evening') => `hilula:${abs}:${when}`;

describe('Rosh Chodesh notice kinds', () => {
  it('1 plans the defaults as before: three days ahead at 20:00 and on the day at 07:00', () => {
    const plan = rc({}, THU);

    expect(summary(plan, 'roshChodesh:')).toEqual([
      [rcId(C1, 'before'), at(J, '2026-10-08T20:00').getTime()],
      [rcId(T30, 'day'), at(J, '2026-10-11T07:00').getTime()],
    ]);
    expect(candidate(plan, rcId(C1, 'before')).title).toBe('ראש חודש חשון בעוד שלושה ימים');
    expect(candidate(plan, rcId(T30, 'day')).title).toBe('היום ראש חודש חשון');
    expect(candidate(plan, rcId(C1, 'before')).body).toBe('נכנס ביום שבת בשקיעה.');
    expect(lines(plan, 'blockNotice:2026-10-10')).toContain('ראש חודש חשון נכנס ביום שבת בשקיעה');
  });

  it('2 leaves the notice before out while it is off and still names the swallowed evening in the pre-block notice', () => {
    const plan = rc({ before: off(D_RC.before) }, THU);

    expect(ids(plan, 'roshChodesh:')).toEqual([rcId(T30, 'day')]);
    expect(lines(plan, 'blockNotice:2026-10-10')).toContain('ראש חודש חשון נכנס ביום שבת בשקיעה');
  });

  it('3 leaves the notice of the day out while it is off', () => {
    expect(ids(rc({ day: off(D_RC.day) }, THU), 'roshChodesh:')).toEqual([rcId(C1, 'before')]);
  });

  it('4 drops the pre-block line with the evening notice that would have been swallowed', () => {
    const plan = rc({ evening: off(D_RC.evening) }, THU);

    expect(ids(plan, 'roshChodesh:')).toEqual([rcId(C1, 'before'), rcId(T30, 'day')]);
    expect(lines(plan, 'blockNotice:2026-10-10')).toHaveLength(1);
  });

  it('5 fires the evening notice of a one-day Rosh Chodesh only while it is on', () => {
    expect(ids(rc({}, WED), 'roshChodesh:')).toEqual([rcId(N1, 'evening'), rcId(N1, 'day')]);
    expect(ids(rc({ evening: off(D_RC.evening) }, WED), 'roshChodesh:')).toEqual([rcId(N1, 'day')]);
  });

  it('6 moves the notice before to the chosen days and time and words the title with the days left', () => {
    const plan = rc({ before: clock(570, 2) }, THU);

    expect(summary(plan, 'roshChodesh:')).toEqual([
      [rcId(C1, 'before'), at(J, '2026-10-09T09:30').getTime()],
      [rcId(T30, 'day'), at(J, '2026-10-11T07:00').getTime()],
    ]);
    expect(candidate(plan, rcId(C1, 'before')).title).toBe('ראש חודש חשון בעוד יומיים');
  });

  it('7 fires the evening notice before the shkia by the chosen minutes', () => {
    const plan = rc({ evening: shkiaLead(-30) }, WED);

    expect(candidate(plan, rcId(N1, 'evening')).trigger.getTime()).toBe(shkiaOn('2027-04-07').getTime() - 30 * 60_000);
    expect(candidate(plan, rcId(N1, 'evening')).title).toBe('הערב נכנס ראש חודש ניסן');
  });

  it('8 fires the notice of the day at the chosen clock time on the location clock', () => {
    const plan = rc({ day: clock(375) }, WED);
    expect(candidate(plan, rcId(N1, 'day')).trigger.getTime()).toBe(at(J, '2027-04-08T06:15').getTime());
  });

  it('9 words the title with the days left in English', () => {
    try {
      setLocale('en');
      expect(candidate(rc({ before: clock(570, 2) }, THU, 'en'), rcId(C1, 'before')).title).toBe(
        'Rosh Chodesh Cheshvan in two days',
      );
      expect(candidate(rc({}, THU, 'en'), rcId(C1, 'before')).title).toBe('Rosh Chodesh Cheshvan in three days');
    } finally {
      setLocale('he');
    }
  });

  it('10 reads a stored zero of days ahead as one day', () => {
    const plan = rc({ before: clock(20 * 60, 0) }, THU);

    expect(candidate(plan, rcId(C1, 'before')).trigger.getTime()).toBe(at(J, '2026-10-10T20:00').getTime());
    expect(candidate(plan, rcId(C1, 'before')).title).toBe('היום ראש חודש חשון');
    expect(candidate(plan, rcId(C1, 'before')).body).toBe('נכנס היום בשקיעה. יעלה ויבוא בתפילה ובברכת המזון.');
  });

  it('11 names the date, not a bare weekday, of a Rosh Chodesh a block swallows that begins a week after the erev', () => {
    const plan = rc({ before: clock(600, 7) }, FRI_JAN_1);

    expect(ids(plan, 'roshChodesh:')).toEqual([]);
    expect(lines(plan, 'blockNotice:2027-01-02')).toContain('ראש חודש שבט נכנס ביום שישי 8 ינואר בשקיעה');
  });

  it('12 names the date of that evening in English too', () => {
    try {
      setLocale('en');
      expect(lines(rc({ before: clock(600, 7) }, FRI_JAN_1, 'en'), 'blockNotice:2027-01-02')).toContain(
        "Rosh Chodesh Sh'vat begins on Friday, Jan 8 at sunset",
      );
    } finally {
      setLocale('he');
    }
  });

  it('13 says a notice one day ahead up to the shkia enters tonight', () => {
    const early = candidate(rc({ before: clock(900, 1) }, WED), rcId(N1, 'before'));
    const atShkia = candidate(rc({ before: shkiaLead(0, 1) }, WED), rcId(N1, 'before'));

    expect(early.trigger.getTime()).toBe(at(J, '2027-04-07T15:00').getTime());
    expect(early.trigger.getTime()).toBeLessThan(shkiaOn('2027-04-07').getTime());
    expect([early.title, early.body]).toEqual(['ראש חודש ניסן מחר', 'נכנס הערב בשקיעה.']);
    expect(atShkia.trigger.getTime()).toBe(shkiaOn('2027-04-07').getTime());
    expect([atShkia.title, atShkia.body]).toEqual(['ראש חודש ניסן מחר', 'נכנס הערב בשקיעה.']);
  });

  it('14 says a notice one day ahead after the shkia that the month has begun', () => {
    const late = candidate(rc({ before: clock(1200, 1) }, WED), rcId(N1, 'before'));

    expect(late.trigger.getTime()).toBe(at(J, '2027-04-07T20:00').getTime());
    expect(late.trigger.getTime()).toBeGreaterThan(shkiaOn('2027-04-07').getTime());
    expect([late.title, late.body]).toEqual([
      'היום ראש חודש ניסן',
      'נכנס היום בשקיעה. יעלה ויבוא בתפילה ובברכת המזון.',
    ]);
  });

  it('15 says an evening notice at a clock time after the shkia that the month has begun', () => {
    const late = candidate(rc({ evening: clock(1260) }, WED), rcId(N1, 'evening'));

    expect(late.trigger.getTime()).toBe(at(J, '2027-04-07T21:00').getTime());
    expect([late.title, late.body]).toEqual([
      'היום ראש חודש ניסן',
      'נכנס היום בשקיעה. יעלה ויבוא בתפילה ובברכת המזון.',
    ]);
  });

  it('16 keeps the evening wording before the shkia and at it', () => {
    const early = candidate(rc({ evening: clock(900) }, WED), rcId(N1, 'evening'));
    const atShkia = candidate(rc({}, WED), rcId(N1, 'evening'));

    expect(early.trigger.getTime()).toBeLessThan(shkiaOn('2027-04-07').getTime());
    expect(atShkia.trigger.getTime()).toBe(shkiaOn('2027-04-07').getTime());
    for (const notice of [early, atShkia])
      expect([notice.title, notice.body]).toEqual(['הערב נכנס ראש חודש ניסן', 'יעלה ויבוא בתפילה ובברכת המזון מהערב.']);
  });

  it('17 keeps the notice of the day late in the evening of a one-day Rosh Chodesh', () => {
    const late = candidate(rc({ day: clock(1380) }, WED), rcId(N1, 'day'));

    expect(late.trigger.getTime()).toBe(at(J, '2027-04-08T23:00').getTime());
    expect([late.title, late.body]).toEqual(['היום ראש חודש ניסן', 'יעלה ויבוא, הלל ומוסף בשחרית.']);
  });

  it('18 words each side of the shkia in English', () => {
    const words = (notices: Partial<RoshChodeshNotices>, when: 'before' | 'evening') => {
      const notice = candidate(rc(notices, WED, 'en'), rcId(N1, when));
      return [notice.title, notice.body];
    };
    const begun = [
      'Today is Rosh Chodesh Nisan',
      "It began at sunset today. Ya'aleh Veyavo in the Amidah and in Birkat Hamazon.",
    ];
    try {
      setLocale('en');
      expect(words({ before: clock(900, 1) }, 'before')).toEqual([
        'Rosh Chodesh Nisan tomorrow',
        'It begins tonight at sunset.',
      ]);
      expect(words({ before: clock(1200, 1) }, 'before')).toEqual(begun);
      expect(words({ evening: clock(1260) }, 'evening')).toEqual(begun);
      expect(words({ evening: clock(900) }, 'evening')).toEqual([
        'Rosh Chodesh Nisan begins tonight',
        "Ya'aleh Veyavo in the Amidah and in Birkat Hamazon from tonight.",
      ]);
    } finally {
      setLocale('he');
    }
  });
});

describe('hilula notice kinds', () => {
  it('1 plans the defaults as before: a day ahead and as the date opens, both at the shkia', () => {
    const plan = h({}, MON);

    expect(summary(plan, 'hilula:')).toEqual([
      [hId(C3, 'before'), shkiaOn('2026-10-12').getTime()],
      [hId(C3, 'evening'), shkiaOn('2026-10-13').getTime()],
    ]);
    expect(candidate(plan, hId(C3, 'before')).title).toBe(`מחר בערב: הילולת ${R_AND_O}`);
    expect(candidate(plan, hId(C3, 'evening')).title).toBe(`הערב: הילולת ${R_AND_O}`);
    expect(candidate(plan, hId(C3, 'before')).body).toBe('יום ההילולה, ג׳ חשון, נכנס מחר בשקיעה.');
    expect(candidate(plan, hId(C3, 'evening')).body).toBe('יום ההילולה, ג׳ חשון, נכנס עכשיו עם השקיעה.');
  });

  it('2 leaves the notice before out while it is off', () => {
    expect(ids(h({ before: off(D_H.before) }, MON), 'hilula:')).toEqual([hId(C3, 'evening')]);
  });

  it('3 leaves the evening notice out while it is off', () => {
    expect(ids(h({ evening: off(D_H.evening) }, MON), 'hilula:')).toEqual([hId(C3, 'before')]);
  });

  it('4 counts the days ahead from the evening the date opens and names the weekday it opens on', () => {
    const plan = h({ before: clock(600, 2) }, SUN);

    expect(summary(plan, 'hilula:')).toEqual([[hId(C3, 'before'), at(J, '2026-10-11T10:00').getTime()]]);
    expect(candidate(plan, hId(C3, 'before')).title).toBe(`הילולת ${R_AND_O} נכנסת ביום שלישי בערב`);
    expect(candidate(plan, hId(C3, 'before')).body).toBe('יום ההילולה, ג׳ חשון, נכנס ביום שלישי בשקיעה.');
  });

  it('5 keeps the notice before a day apart from the evening notice at its smallest choice', () => {
    const plan = h({ before: shkiaLead(0, 1) }, MON);

    expect(summary(plan, 'hilula:')).toEqual([
      [hId(C3, 'before'), shkiaOn('2026-10-12').getTime()],
      [hId(C3, 'evening'), shkiaOn('2026-10-13').getTime()],
    ]);
    expect(candidate(plan, hId(C3, 'before')).title).toBe(`מחר בערב: הילולת ${R_AND_O}`);
  });

  it('6 fires before the shkia by the chosen minutes and no longer says it begins now', () => {
    const plan = h({ evening: shkiaLead(-30) }, MON);

    expect(candidate(plan, hId(C3, 'evening')).trigger.getTime()).toBe(shkiaOn('2026-10-13').getTime() - 30 * 60_000);
    expect(candidate(plan, hId(C3, 'evening')).body).toBe('יום ההילולה, ג׳ חשון, נכנס הערב בשקיעה.');
  });

  it('7 names a notice the Shabbat swallows in the pre-block notice with the defaults', () => {
    const plan = h({}, FRI);

    expect(ids(plan, 'hilula:')).toEqual([]);
    expect(lines(plan, 'blockNotice:2026-10-17')).toContain(`הילולת ${SHAPIRA} נכנסת ביום שבת בערב`);
  });

  it('8 follows the settings: a notice moved out of the block is scheduled, and a kind off leaves no line', () => {
    const plan = h({ before: clock(600, 1), evening: off(D_H.evening) }, FRI);

    expect(summary(plan, 'hilula:')).toEqual([[hId(C7, 'before'), at(J, '2026-10-16T10:00').getTime()]]);
    expect(candidate(plan, hId(C7, 'before')).title).toBe(`מחר בערב: הילולת ${SHAPIRA}`);
    expect(lines(plan, 'blockNotice:2026-10-17')).toHaveLength(1);
  });

  it('9 names the date, not a bare weekday, when the notice comes a week ahead', () => {
    const plan = h({ before: clock(600, 7) }, TUE);

    expect(summary(plan, 'hilula:')).toEqual([[hId(C3, 'before'), at(J, '2026-10-06T10:00').getTime()]]);
    expect(candidate(plan, hId(C3, 'before')).title).toBe(`הילולת ${R_AND_O} נכנסת ביום שלישי 13 אוקטובר בערב`);
    expect(candidate(plan, hId(C3, 'before')).body).toBe('יום ההילולה, ג׳ חשון, נכנס ביום שלישי 13 אוקטובר בשקיעה.');
  });

  it('10 keeps the bare weekday up to six days ahead', () => {
    const plan = h({ before: clock(600, 6) }, WED_BEFORE);

    expect(candidate(plan, hId(C3, 'before')).title).toBe(`הילולת ${R_AND_O} נכנסת ביום שלישי בערב`);
    expect(candidate(plan, hId(C3, 'before')).body).toBe('יום ההילולה, ג׳ חשון, נכנס ביום שלישי בשקיעה.');
  });

  it('11 words the date of a notice a week ahead in English', () => {
    try {
      setLocale('en');
      const plan = buildPlan(
        planInput({
          now: TUE,
          language: 'en',
          hilulotEnabled: true,
          hilulaNotices: { ...D_H, before: clock(600, 7) },
        }),
      );
      expect(candidate(plan, hId(C3, 'before')).title).toBe(
        'The hilula of Rebbe Yisrael of Ruzhin, Rabbi Ovadia Yosef begins on the evening of Tuesday, Oct 13',
      );
    } finally {
      setLocale('he');
    }
  });

  it('12 names the date of a swallowed notice that opens a week or more after the erev', () => {
    const plan = h({ before: clock(20 * 60, 7), evening: off(D_H.evening) }, FRI_JAN_22);

    expect(ids(plan, 'hilula:')).toEqual([]);
    expect(lines(plan, 'blockNotice:2027-01-23')).toContain('הילולת הרבי מקוצק נכנסת ביום שישי 29 ינואר בערב');
  });

  it('13 says an evening notice at a clock time after the shkia that the date has begun', () => {
    const late = candidate(h({ evening: clock(1320) }, MON), hId(C3, 'evening'));

    expect(late.trigger.getTime()).toBe(at(J, '2026-10-13T22:00').getTime());
    expect(late.trigger.getTime()).toBeGreaterThan(shkiaOn('2026-10-13').getTime());
    expect([late.title, late.body]).toEqual([`הלילה: הילולת ${R_AND_O}`, 'יום ההילולה, ג׳ חשון, נכנס היום בשקיעה.']);
  });

  it('14 says an evening notice at a clock time before the shkia that the date enters tonight', () => {
    const early = candidate(h({ evening: clock(900) }, MON), hId(C3, 'evening'));

    expect(early.trigger.getTime()).toBe(at(J, '2026-10-13T15:00').getTime());
    expect(early.trigger.getTime()).toBeLessThan(shkiaOn('2026-10-13').getTime());
    expect([early.title, early.body]).toEqual([`הערב: הילולת ${R_AND_O}`, 'יום ההילולה, ג׳ חשון, נכנס הערב בשקיעה.']);
  });

  it('15 keeps the notice before a day ahead even at its latest time', () => {
    const late = candidate(h({ before: clock(1439, 1) }, MON), hId(C3, 'before'));

    expect(late.trigger.getTime()).toBe(at(J, '2026-10-12T23:59').getTime());
    expect([late.title, late.body]).toEqual([`מחר בערב: הילולת ${R_AND_O}`, 'יום ההילולה, ג׳ חשון, נכנס מחר בשקיעה.']);
  });

  it('16 words each side of the shkia in English', () => {
    const evening = (notices: Partial<HilulaNotices>) => candidate(h(notices, MON, 'en'), hId(C3, 'evening'));
    try {
      setLocale('en');
      const begun = evening({ evening: clock(1320) });
      expect([begun.title, begun.body]).toEqual([
        'Tonight: hilula of Rebbe Yisrael of Ruzhin, Rabbi Ovadia Yosef',
        'The hilula, 3rd of Cheshvan, began at sunset today.',
      ]);
      expect(evening({ evening: clock(900) }).body).toBe('The hilula, 3rd of Cheshvan, begins tonight at sunset.');
      expect(evening({}).body).toBe('The hilula, 3rd of Cheshvan, begins now at sunset.');
    } finally {
      setLocale('he');
    }
  });

  it('17 names the date of a swallowed notice on the evening it opens in English', () => {
    try {
      setLocale('en');
      const plan = h({ before: clock(1200, 7), evening: off(D_H.evening) }, FRI_JAN_22, 'en');
      expect(lines(plan, 'blockNotice:2027-01-23')).toContain(
        'The hilula of Kotzker Rebbe begins on the evening of Friday, Jan 29',
      );
    } finally {
      setLocale('he');
    }
  });
});

describe('noticePhase', () => {
  it('is ahead before the shkia of the opening day, opening at it and open after it', () => {
    const opens = DateTime.fromISO('2026-10-13', { zone: J.tz });
    const shkia = shkiaOn('2026-10-13').getTime();

    expect(noticePhase(new Date(shkia - 60_000), opens, J)).toBe('ahead');
    expect(noticePhase(new Date(shkia), opens, J)).toBe('opening');
    expect(noticePhase(new Date(shkia + 60_000), opens, J)).toBe('open');
  });

  it('is ahead where the sun does not set on the opening day', () => {
    const tromso: Location = { name: 'Tromso', lat: 69.6492, lng: 18.9553, tz: 'Europe/Oslo', inIsrael: false };
    const opens = DateTime.fromISO('2026-06-21', { zone: tromso.tz });

    expect(noticePhase(at(tromso, '2026-06-21T23:00'), opens, tromso)).toBe('ahead');
  });
});

describe('noticeDayLabel', () => {
  const from = DateTime.fromISO('2026-10-16', { zone: J.tz });
  const opens = (days: number) => from.plus({ days });

  it.each([
    [0, 'יום שישי', 'Friday'],
    [6, 'יום חמישי', 'Thursday'],
    [7, 'יום שישי 23 אוקטובר', 'Friday, Oct 23'],
    [9, 'יום ראשון 25 אוקטובר', 'Sunday, Oct 25'],
  ])('words an evening %i days away', (days, he, en) => {
    expect(noticeDayLabel(opens(days), from, 'he')).toBe(he);
    expect(noticeDayLabel(opens(days), from, 'en')).toBe(en);
  });

  it('counts civil days across the end of daylight saving time', () => {
    const start = DateTime.fromISO('2026-10-28', { zone: 'America/Los_Angeles' });
    expect(noticeDayLabel(start.plus({ days: 7 }), start, 'en')).toBe('Wednesday, Nov 4');
    expect(noticeDayLabel(start.plus({ days: 6 }), start, 'en')).toBe('Tuesday');
  });
});
