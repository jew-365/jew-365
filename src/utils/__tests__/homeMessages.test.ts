import { HDate, months } from '@hebcal/core';
import { DateTime } from 'luxon';
import { CITIES } from '@/data/cities';
import { hilulaDateLabel, hilulotOn } from '@/data/hilulot';
import { roshChodeshLabel, upcomingRoshChodesh } from '@/data/roshChodesh';
import { t } from '@/i18n';
import { HebcalService } from '@/services/HebcalService';
import { ZmanimService } from '@/services/ZmanimService';
import { at } from '@/testing/zmanim';
import { clockOf } from '../clock';
import {
  holyBlockMessage,
  hilulaMessage,
  nextWhatsNew,
  roshChodeshMessage,
  streakMessage,
  whatsNewMessage,
} from '../homeMessages';
import { civilHebrewDayAt } from '../taharah/onot';
import { WHATS_NEW } from '@/data/guide';

const J = CITIES[0];

describe('streakMessage', () => {
  it('1. is null below one day', () => {
    expect(streakMessage(0, t)).toBeNull();
  });

  it('2. names one day and the distance to the first goal', () => {
    expect(streakMessage(1, t)).toEqual({
      id: 'streak',
      icon: 'star',
      title: 'יום אחד ברצף',
      caption: 'עוד 6 ימים ליעד 7',
      href: '/(tabs)/history',
    });
  });

  it('3. says one day left in the singular', () => {
    expect(streakMessage(6, t)!.caption).toBe('עוד יום אחד ליעד 7');
  });

  it('3a. celebrates the day a goal is reached and opens the achievements tab', () => {
    for (const goal of [7, 30, 100, 365]) {
      const m = streakMessage(goal, t)!;
      expect(m.title).toContain('הגעת ליעד');
      expect(m.caption).toBe('לצפייה בהישגים שלך');
      expect(m.href).toEqual({ pathname: '/(tabs)/history', params: { tab: 'achievements' } });
    }
    // The day after a goal is an ordinary countdown to the next goal.
    expect(streakMessage(8, t)!.href).toBe('/(tabs)/history');
    expect(streakMessage(8, t)!.caption).toBe('עוד 22 ימים ליעד 30');
  });
});

describe('whatsNewMessage and nextWhatsNew', () => {
  const DAY = 86_400_000;
  const newest = WHATS_NEW[0].label;

  it('3b. stores the newest label as seen on a fresh install and shows no row', () => {
    const stamped = nextWhatsNew(null, 1000)!;
    expect(stamped).toEqual({ label: newest, since: 1000, seen: true });
    expect(whatsNewMessage(stamped, 1000, t)).toBeNull();
  });

  it('3c. leaves a matching stored state untouched', () => {
    const stored = { label: newest, since: 500, seen: false };
    expect(nextWhatsNew(stored, 9000)).toBe(stored);
  });

  it('3d. stamps a newer label unseen and shows the row for three days', () => {
    const stamped = nextWhatsNew({ label: 'old-0.0.0-0', since: 0, seen: true }, 2000, '9.9.9-9')!;
    expect(stamped).toEqual({ label: '9.9.9-9', since: 2000, seen: false });
    expect(whatsNewMessage(stamped, 2000, t)).toEqual({
      id: 'whatsNew',
      icon: 'guide',
      title: 'מה חדש בעדכון',
      caption: 'מה התחדש באפליקציה',
      href: '/guide',
    });
    expect(whatsNewMessage(stamped, 2000 + DAY, t)).not.toBeNull();
    expect(whatsNewMessage(stamped, 2000 + 3 * DAY, t)).toBeNull();
    expect(whatsNewMessage({ ...stamped, seen: true }, 2000, t)).toBeNull();
  });
});

describe('holyBlockMessage', () => {
  const b = HebcalService.holyBlockOn(at(J, '2026-10-31T12:00'), J)!;
  const times = `הדלקת נרות ${clockOf(b.start, J.tz)} · צאת השבת ${clockOf(b.end, J.tz)}`;
  const thursdayNightfall = HebcalService.nightfall(ZmanimService.getZmanim(at(J, '2026-10-29T12:00'), J)!, J);

  it('4. is absent through the week, Thursday afternoon included', () => {
    expect(holyBlockMessage(at(J, '2026-10-26T12:00'), J, t)).toBeNull();
    expect(holyBlockMessage(at(J, '2026-10-28T20:00'), J, t)).toBeNull();
    expect(holyBlockMessage(new Date(thursdayNightfall.getTime() - 60000), J, t)).toBeNull();
  });

  it('5. shows from Thursday nightfall, naming tomorrow, the lighting and the exit', () => {
    expect(holyBlockMessage(thursdayNightfall, J, t)).toEqual({
      id: 'holyBlock',
      icon: 'candles',
      title: 'שבת',
      caption: `מחר · ${times}`,
      href: null,
    });
    expect(holyBlockMessage(at(J, '2026-10-30T02:00'), J, t)!.caption).toBe(`מחר · ${times}`);
  });

  it('5a. names today on Friday until candle lighting', () => {
    expect(holyBlockMessage(at(J, '2026-10-30T09:00'), J, t)!.caption).toBe(`היום · ${times}`);
    expect(holyBlockMessage(new Date(b.start.getTime() - 60000), J, t)!.caption).toBe(`היום · ${times}`);
  });
});

describe('roshChodeshMessage', () => {
  const at12 = (day: string) => at(J, `${day}T12:00`);

  it('6. counts five days ahead and names the evening it enters', () => {
    const now = at12('2026-11-05');
    const m = upcomingRoshChodesh(civilHebrewDayAt(now, J), 1)[0].month;
    const msg = roshChodeshMessage(now, J, 'he', t)!;
    expect(msg.title).toBe(`ראש חודש ${roshChodeshLabel(m, 'he')} בעוד חמישה ימים`);
    expect(msg.caption).toBe('נכנס ביום שני בשקיעה.');
  });

  it('7. says tomorrow and tonight the day before', () => {
    const msg = roshChodeshMessage(at12('2026-11-09'), J, 'he', t)!;
    expect(msg.title.endsWith(' מחר')).toBe(true);
    expect(msg.caption).toBe('נכנס הערב בשקיעה.');
  });

  it('8. says it has begun after shkia', () => {
    const msg = roshChodeshMessage(at(J, '2026-11-09T20:00'), J, 'he', t)!;
    expect(msg.title.startsWith('היום ראש חודש ')).toBe(true);
    expect(msg.caption).toBe(t('roshChodesh.notice.begun.body'));
  });

  it('9. shows the day text on the first day', () => {
    expect(roshChodeshMessage(at12('2026-11-11'), J, 'he', t)!.caption).toBe('יעלה ויבוא, הלל ומוסף בשחרית.');
  });

  it('10. is gone after the last day ends', () => {
    expect(roshChodeshMessage(at(J, '2026-11-11T20:00'), J, 'he', t)).toBeNull();
  });

  it('11. is null when more than seven days remain', () => {
    expect(roshChodeshMessage(at12('2026-10-29'), J, 'he', t)).toBeNull();
  });

  it('12. opens the Rosh Chodesh screen', () => {
    expect(roshChodeshMessage(at12('2026-11-05'), J, 'he', t)!.href).toBe('/rosh-chodesh');
  });
});

describe('hilulaMessage', () => {
  const hd = new HDate(1, months.AV, 5787);
  const civil = hd.greg();
  const noon = (dayOffset: number) => {
    const d = DateTime.fromObject(
      { year: civil.getFullYear(), month: civil.getMonth() + 1, day: civil.getDate(), hour: 12 },
      { zone: J.tz },
    ).plus({ days: dayOffset });
    return d.toJSDate();
  };

  it('13. says today, tonight or this evening by the clock', () => {
    const today = hilulaMessage(noon(0), J, true, true, 'he', t)!;
    expect(today.title.startsWith('היום: הילולת ')).toBe(true);
    expect(today.title).toContain('אהרן הכהן');
    expect(today.caption).toBe(hilulaDateLabel(hd, 'he'));

    const prevEvening = DateTime.fromJSDate(noon(-1)).setZone(J.tz).set({ hour: 20 }).toJSDate();
    expect(hilulaMessage(prevEvening, J, true, true, 'he', t)!.title.startsWith('הלילה: הילולת ')).toBe(true);

    const quietEve = Array.from(
      { length: 300 },
      (_, i) => new HDate(new HDate(1, months.TISHREI, 5787).abs() + i),
    ).find((d) => hilulotOn(d, true).length && !hilulotOn(d.prev(), true).length)!;
    expect(hilulotOn(quietEve.prev(), true)).toEqual([]);
    const eve = DateTime.fromJSDate(quietEve.prev().greg()).set({ hour: 12 }).setZone(J.tz, { keepLocalTime: true });
    expect(hilulaMessage(eve.toJSDate(), J, true, true, 'he', t)!.title.startsWith('הערב: הילולת ')).toBe(true);
  });

  it('14. is null while the topic is off', () => {
    expect(hilulaMessage(noon(0), J, true, false, 'he', t)).toBeNull();
  });

  it('15. carries ids only for several tzaddikim', () => {
    const { href } = hilulaMessage(noon(0), J, true, true, 'he', t)!;
    const list = hilulotOn(hd, true);
    expect(href).toEqual({
      pathname: '/hilula/[id]',
      params: list.length > 1 ? { id: list[0].id, ids: list.map((h) => h.id).join(',') } : { id: 'aharon_hakohen' },
    });
  });
});
