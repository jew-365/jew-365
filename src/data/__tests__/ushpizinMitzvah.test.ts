jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

import { DateTime } from 'luxon';
import { CITIES } from '@/data/cities';
import { getAllMitzvot } from '@/data/customMitzvotAdapter';
import { MITZVOT, USHPIZIN_GUESTS, findMitzvah, ushpizOfEvening } from '@/data/mitzvot';
import { rulesFor } from '@/data/taharahPresets';
import { MITZVAH_STANDALONE_TEXT, hasSiddurText, siddurPlace } from '@/data/siddur';
import { setLocale, t } from '@/i18n';
import { HebcalService } from '@/services/HebcalService';
import { holyBlockExit } from '@/services/ZmanimService';
import { MITZVAH_TEXT_CATEGORY } from '@/services/notifications/ids';
import { buildPlan } from '@/services/notifications/plan';
import type { PlanInput } from '@/services/notifications/types';
import { isMensMitzvah } from '@/stores/taharahOptIn';
import { DEFAULT_ON_MITZVOT } from '@/stores/useMitzvotStore';
import { DEFAULT_HILULA_NOTICES, DEFAULT_ROSH_CHODESH_NOTICES } from '@/stores/useUserStore';
import { at, zmanimFor } from '@/testing/zmanim';
import type { Mitzvah, Nusach, UserSettings } from '@/types/mitzvah';
import type { Location } from '@/types/zmanim';
import { appDayWindow } from '@/utils/buildDayTimeline';
import { calendarDay, checkInDeadline, checkInFor } from '@/utils/checkIn';
import { judgeDay } from '@/utils/historyStats';
import { appDayKey } from '@/utils/locationDay';

const JERUSALEM = CITIES[0];
const NEW_YORK = CITIES.find((city) => city.cityId === 'new-york')!;
const SAID_IN: Nusach[] = ['ashkenaz', 'sefard', 'edot_hamizrach'];
const MINUTE = 60_000;
const GUESTS_HE = ['אברהם', 'יצחק', 'יעקב', 'משה', 'אהרן', 'יוסף', 'דוד'];
const GUESTS_EN = ['Avraham', 'Yitzchak', 'Yaakov', 'Moshe', 'Aharon', 'Yosef', 'David'];

const settingsFor = (nusach: Nusach, inIsrael = true): UserSettings => ({
  nusach,
  halachicOpinions: { ksSofZman: 'GRA' },
  inIsrael,
});
const A = settingsFor('ashkenaz');
const A_ABROAD = settingsFor('ashkenaz', false);

const USHPIZIN: Mitzvah = findMitzvah('ushpizin')!;

const ctxFor = (location: Location, iso: string, settings: UserSettings, clock = '12:00') => ({
  date: calendarDay(iso),
  location,
  settings,
  zmanim: zmanimFor(at(location, `${iso}T${clock}`), location),
});
const windowOn = (location: Location, iso: string, settings: UserSettings, clock?: string) =>
  USHPIZIN.computeWindow(ctxFor(location, iso, settings, clock));
const daysFrom = (iso: string, count: number) =>
  Array.from({ length: count }, (_, i) => DateTime.fromISO(iso).plus({ days: i }).toISODate()!);
const windowDays = (location: Location, settings: UserSettings, from: string, count: number) =>
  daysFrom(from, count).filter((iso) => windowOn(location, iso, settings) !== null);
const zmanimOn = (location: Location, iso: string) => zmanimFor(at(location, `${iso}T12:00`), location);
const blockOn = (location: Location, iso: string) => HebcalService.holyBlockOn(at(location, `${iso}T12:00`), location)!;

function planInput(overrides: Partial<PlanInput> = {}): PlanInput {
  const now = overrides.now ?? at(JERUSALEM, '2026-09-27T10:00');
  return {
    now,
    fromDate: now,
    platform: 'android',
    hasPermission: true,
    language: 'he',
    location: JERUSALEM,
    settings: A,
    mitzvot: [USHPIZIN],
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

const ushpizinPlan = (overrides: Partial<PlanInput> = {}) =>
  buildPlan(planInput(overrides)).filter((candidate) => candidate.id.startsWith('ushpizin__'));
const noticeBody = (block: string, overrides: Partial<PlanInput> = {}) =>
  buildPlan(planInput(overrides))
    .find((candidate) => candidate.id === `blockNotice:${block}`)
    ?.body.split('\n') ?? [];

afterEach(() => setLocale('he'));

describe('the Ushpizin registry entry', () => {
  it('is a seasonal mitzvah of Ashkenaz, Sefard and Edot HaMizrach with one reminder at its start that names the guest', () => {
    expect(USHPIZIN).toMatchObject({
      name: { he: 'אושפיזין', en: 'Ushpizin' },
      icon: 'sukkah',
      timeType: 'annual-seasonal',
      category: 'seasonal',
      group: 'seasonal',
      skipOn: [],
      nuschaotSupported: SAID_IN,
      bodyKey: 'notifications.ushpizinNight',
    });
    expect(USHPIZIN.multiDay).toBeUndefined();
    expect(USHPIZIN.defaultReminders).toEqual([
      {
        anchor: 'start',
        offsetMin: 0,
        label: 'זמן אושפיזין',
        bodyVariants: [
          'זמן אושפיזין: %{guest}',
          'הלילה מזמינים לסוכה את %{guest}',
          'חג שמח, האושפיז של הלילה הוא %{guest}',
        ],
      },
    ]);
    expect(MITZVAH_STANDALONE_TEXT.ushpizin).toBe('ushpizin');
  });

  it('names the guests in R5’s order', () => {
    expect(USHPIZIN_GUESTS.map((guest) => guest.he)).toEqual(GUESTS_HE);
    expect(USHPIZIN_GUESTS.map((guest) => guest.en)).toEqual(GUESTS_EN);
    expect(daysFrom('2026-09-25', 7).map((iso) => ushpizOfEvening(calendarDay(iso))?.he)).toEqual(GUESTS_HE);
    expect(ushpizOfEvening(calendarDay('2026-09-24'))).toBeNull();
    expect(ushpizOfEvening(calendarDay('2026-10-02'))).toBeNull();
  });

  it('is on by default for men and women, last of the seasonal group, and never offered to Chabad', () => {
    expect(DEFAULT_ON_MITZVOT).toContain('ushpizin');
    expect(isMensMitzvah('ushpizin')).toBe(false);
    expect(MITZVOT.filter((mitzvah) => mitzvah.group === 'seasonal').map((mitzvah) => mitzvah.id)).toEqual([
      'sefirat_haomer',
      'chanukah_candles',
      'selichot',
      'ushpizin',
    ]);
    for (const nusach of SAID_IN) expect(getAllMitzvot(nusach).map((mitzvah) => mitzvah.id)).toContain('ushpizin');
    expect(getAllMitzvot('chabad').map((mitzvah) => mitzvah.id)).not.toContain('ushpizin');
  });
});

describe('the Ushpizin window', () => {
  it.each([
    ['Jerusalem', JERUSALEM, A],
    ['New York', NEW_YORK, A_ABROAD],
  ] as const)('opens on the seven evenings of Sukkot in 5786 and 5787 in %s', (_name, location, settings) => {
    expect(windowDays(location, settings, '2025-09-30', 20)).toEqual(daysFrom('2025-10-06', 7));
    expect(windowDays(location, settings, '2026-09-20', 20)).toEqual(daysFrom('2026-09-25', 7));
  });

  it('runs from nightfall to the next alot, and from the exit on the evening that closes a block', () => {
    expect(windowOn(JERUSALEM, '2026-09-25', A)).toEqual({
      start: zmanimOn(JERUSALEM, '2026-09-25').tzeitHakochavim,
      end: zmanimOn(JERUSALEM, '2026-09-26').alotHaShachar,
    });
    expect(windowOn(JERUSALEM, '2026-09-26', A)).toEqual({
      start: holyBlockExit(zmanimOn(JERUSALEM, '2026-09-26')),
      end: zmanimOn(JERUSALEM, '2026-09-27').alotHaShachar,
    });
    expect(windowOn(JERUSALEM, '2026-09-28', A)).toEqual({
      start: zmanimOn(JERUSALEM, '2026-09-28').tzeitHakochavim,
      end: zmanimOn(JERUSALEM, '2026-09-29').alotHaShachar,
    });
    expect(windowOn(NEW_YORK, '2026-09-26', A_ABROAD)!.start).toEqual(zmanimOn(NEW_YORK, '2026-09-26').tzeitHakochavim);
    expect(windowOn(NEW_YORK, '2026-09-27', A_ABROAD)!.start).toEqual(blockOn(NEW_YORK, '2026-09-27').end);
    expect(windowOn(JERUSALEM, '2025-10-11', A)!.start).toEqual(blockOn(JERUSALEM, '2025-10-11').end);
  });

  it('names the night’s guest through bodyParams, and nothing outside Sukkot', () => {
    expect(daysFrom('2026-09-25', 7).map((iso) => USHPIZIN.bodyParams!(ctxFor(JERUSALEM, iso, A)))).toEqual(
      GUESTS_HE.map((he, index) => ({ guest: { he, en: GUESTS_EN[index] } })),
    );
    for (const iso of ['2026-09-24', '2026-10-02', '2026-12-08']) {
      expect(USHPIZIN.bodyParams!(ctxFor(JERUSALEM, iso, A))).toBeNull();
    }
  });

  it('depends only on the day, not on the clock time of ctx.date', () => {
    const noon = windowOn(JERUSALEM, '2026-09-28', A);
    expect(noon).not.toBeNull();
    expect(windowOn(JERUSALEM, '2026-09-28', A, '00:30')).toEqual(noon);
    expect(windowOn(JERUSALEM, '2026-09-28', A, '23:30')).toEqual(noon);
  });

  it('stays on home past midnight until alot, under the day whose evening opened it', () => {
    const w = windowOn(JERUSALEM, '2026-09-28', A)!;
    const late = at(JERUSALEM, '2026-09-29T02:00');
    expect(appDayKey(late, JERUSALEM)).toBe('2026-09-28');
    expect(appDayWindow(USHPIZIN, JERUSALEM, A, late)).toMatchObject({
      start: w.start,
      end: w.end,
      date: calendarDay('2026-09-28'),
    });
  });

  it.each(SAID_IN)('%s: offers the text on the seven nights only', (nusach) => {
    const place = siddurPlace(JERUSALEM, true);
    for (const iso of daysFrom('2026-09-25', 7))
      expect(hasSiddurText(USHPIZIN, nusach, calendarDay(iso), place)).toBe(true);
    for (const iso of ['2026-09-24', '2026-10-02']) {
      expect(hasSiddurText(USHPIZIN, nusach, calendarDay(iso), place)).toBe(false);
    }
    expect(hasSiddurText(USHPIZIN, 'chabad', calendarDay('2026-09-28'), place)).toBe(false);
  });
});

describe('Ushpizin in history and the check-in', () => {
  const inputFor = (location: Location, settings: UserSettings) => ({
    mitzvot: [USHPIZIN],
    completions: {},
    checkIns: {},
    location,
    settings,
  });
  const listed = (location: Location, settings: UserSettings, blockDay: string) => {
    const block = blockOn(location, blockDay);
    return checkInFor(block, inputFor(location, settings), new Date(block.end.getTime() + MINUTE))!.days.map((day) => [
      day.key,
      day.items.map((item) => item.mitzvah.id),
    ]);
  };

  it('is open on a weeknight until alot, then missed, and done when marked', () => {
    const w = windowOn(JERUSALEM, '2026-09-28', A)!;
    const input = inputFor(JERUSALEM, A);
    const day = calendarDay('2026-09-28');
    expect(judgeDay(day, input, new Date(w.end.getTime() - MINUTE)).pending).toEqual(['ushpizin']);
    expect(judgeDay(day, input, new Date(w.end.getTime() + MINUTE)).missed).toEqual(['ushpizin']);
    const marked = { ...input, completions: { '2026-09-28': { ushpizin: 1 } } };
    expect(judgeDay(day, marked, new Date(w.end.getTime() + MINUTE)).done).toEqual(['ushpizin']);
  });

  it('lists the Yom Tov nights in the check-in after the first Yom Tov, in Israel and abroad', () => {
    expect(listed(JERUSALEM, A, '2026-09-26')).toEqual([['2026-09-25', ['ushpizin']]]);
    expect(listed(NEW_YORK, A_ABROAD, '2026-09-26')).toEqual([
      ['2026-09-25', ['ushpizin']],
      ['2026-09-26', ['ushpizin']],
    ]);
  });

  it('lists the Friday night of Shabbat Chol HaMoed in its check-in', () => {
    expect(listed(JERUSALEM, A, '2025-10-11')).toEqual([['2025-10-10', ['ushpizin']]]);
  });

  it('waits until the check-in deadline, then is missed', () => {
    const block = blockOn(JERUSALEM, '2026-09-26');
    const input = inputFor(JERUSALEM, A);
    const day = calendarDay('2026-09-25');
    expect(judgeDay(day, input, new Date(block.end.getTime() + MINUTE)).pending).toEqual(['ushpizin']);
    const afterDeadline = new Date(checkInDeadline(block, JERUSALEM).getTime() + MINUTE);
    expect(judgeDay(day, input, afterDeadline).missed).toEqual(['ushpizin']);
  });
});

describe('the Ushpizin reminders', () => {
  it('plans the Chol HaMoed nights at nightfall, each naming its own guest, with the text button', () => {
    const plan = ushpizinPlan();
    expect(plan.map((candidate) => [candidate.id, candidate.trigger])).toEqual([
      ['ushpizin__2026-09-27__0', zmanimOn(JERUSALEM, '2026-09-27').tzeitHakochavim],
      ['ushpizin__2026-09-28__0', zmanimOn(JERUSALEM, '2026-09-28').tzeitHakochavim],
    ]);
    expect(plan.map((candidate) => candidate.body)).toEqual([
      expect.stringContaining('יעקב'),
      expect.stringContaining('משה'),
    ]);
    for (const candidate of plan) {
      expect(candidate.categoryIdentifier).toBe(MITZVAH_TEXT_CATEGORY);
      expect(candidate.title).toBe('אושפיזין');
    }
  });

  it('names every night’s own guest in every body variant', () => {
    const nights = daysFrom('2026-09-27', 5);
    const bodies = nights.map(
      (iso) => ushpizinPlan({ now: at(JERUSALEM, `${iso}T10:00`) }).find((c) => c.id === `ushpizin__${iso}__0`)!.body,
    );
    bodies.forEach((body, index) => {
      expect(body).toContain(GUESTS_HE[index + 2]);
      for (const other of GUESTS_HE.filter((_, n) => n !== index + 2)) expect(body).not.toContain(other);
    });
  });

  it('writes the English body with the English name of the guest', () => {
    setLocale('en');
    const [first] = ushpizinPlan({ language: 'en' });
    expect(first.body).toBe('Time for Ushpizin: Yaakov');
  });

  it('plans nothing inside the Yom Tov block, and the night after it at the exit', () => {
    const plan = ushpizinPlan({ now: at(JERUSALEM, '2026-09-24T10:00') });
    expect(plan.map((candidate) => candidate.id)).not.toContain('ushpizin__2026-09-25__0');
    expect(plan.find((candidate) => candidate.id === 'ushpizin__2026-09-26__0')?.trigger).toEqual(
      blockOn(JERUSALEM, '2026-09-26').end,
    );
    const abroad = ushpizinPlan({ now: at(NEW_YORK, '2026-09-24T10:00'), location: NEW_YORK, settings: A_ABROAD });
    expect(abroad.map((candidate) => candidate.id).filter((id) => /2026-09-2[56]/.test(id))).toEqual([]);
    expect(abroad.find((candidate) => candidate.id === 'ushpizin__2026-09-27__0')?.trigger).toEqual(
      blockOn(NEW_YORK, '2026-09-27').end,
    );
  });

  it('puts the Yom Tov nights’ guests in the pre-block notice, one line per night', () => {
    const israel = noticeBody('2026-09-26', { now: at(JERUSALEM, '2026-09-24T10:00') });
    expect(israel).toContain(t('holyBlock.notice.ushpizinTonight', { name: 'אברהם' }));
    expect(israel).toContain('הלילה אושפיזין: אברהם');
    expect(israel.filter((line) => line.includes('אושפיזין'))).toHaveLength(1);

    const abroad = noticeBody('2026-09-26', {
      now: at(NEW_YORK, '2026-09-24T10:00'),
      location: NEW_YORK,
      settings: A_ABROAD,
    });
    expect(abroad.filter((line) => line.includes('אושפיזין'))).toEqual([
      'הלילה אושפיזין: אברהם',
      'אושפיזין ביום שבת בערב: יצחק',
    ]);
  });

  it('names the Friday night guest in the notice before Shabbat Chol HaMoed', () => {
    expect(noticeBody('2025-10-11', { now: at(JERUSALEM, '2025-10-09T10:00') })).toContain('הלילה אושפיזין: אהרן');
  });

  it('writes the notice lines in English for an English user', () => {
    setLocale('en');
    const abroad = noticeBody('2026-09-26', {
      now: at(NEW_YORK, '2026-09-24T10:00'),
      location: NEW_YORK,
      settings: A_ABROAD,
      language: 'en',
    });
    expect(abroad.filter((line) => line.includes('Ushpizin'))).toEqual([
      'Ushpizin tonight: Avraham',
      'Ushpizin on Saturday evening: Yitzchak',
    ]);
  });

  it('leaves the notice without Ushpizin lines while the mitzvah is off, and for Chabad', () => {
    const now = at(JERUSALEM, '2026-09-24T10:00');
    expect(noticeBody('2026-09-26', { now, mitzvot: [] }).join('\n')).not.toContain('אושפיזין');
    const chabad = settingsFor('chabad');
    expect(
      noticeBody('2026-09-26', { now, settings: chabad, mitzvot: getAllMitzvot('chabad') }).join('\n'),
    ).not.toContain('אושפיזין');
    expect(noticeBody('2026-09-26', { now, mitzvot: getAllMitzvot('ashkenaz') }).join('\n')).toContain(
      'הלילה אושפיזין: אברהם',
    );
  });
});
