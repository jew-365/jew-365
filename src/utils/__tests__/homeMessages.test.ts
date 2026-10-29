import { HDate, months } from '@hebcal/core';
import { DateTime } from 'luxon';
import { CITIES } from '@/data/cities';
import { hilulaDateLabel, hilulotOn } from '@/data/hilulot';
import { roshChodeshLabel, upcomingRoshChodesh } from '@/data/roshChodesh';
import { t } from '@/i18n';
import { HebcalService } from '@/services/HebcalService';
import { at } from '@/testing/zmanim';
import { clockOf } from '../clock';
import { holyBlockMessage, hilulaMessage, roshChodeshMessage, streakMessage } from '../homeMessages';
import { civilHebrewDayAt } from '../taharah/onot';

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
});

describe('holyBlockMessage', () => {
  it('4. names tomorrow, the lighting and the exit', () => {
    const b = HebcalService.holyBlockOn(at(J, '2026-10-31T12:00'), J)!;
    expect(holyBlockMessage(at(J, '2026-10-29T12:00'), J, 'he', t)).toEqual({
      id: 'holyBlock',
      icon: 'candles',
      title: 'שבת',
      caption: `מחר · הדלקת נרות ${clockOf(b.start, J.tz)} · צאת השבת ${clockOf(b.end, J.tz)}`,
      href: null,
    });
  });

  it('5. names the weekday from two days out', () => {
    expect(holyBlockMessage(at(J, '2026-10-30T20:00'), J, 'he', t)!.caption.startsWith('יום שישי · ')).toBe(true);
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
