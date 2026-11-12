import { CITIES } from '@/data/cities';
import { setLocale, t } from '@/i18n';
import { at } from '@/testing/zmanim';
import { homeCard, markHistory, mineFactsOf, DEFAULT_MINE, type CardInput } from '../homeCard';
import { markStat } from '../homeTimes';

const J = CITIES[0];
const card = (wallClock: string, over: Partial<CardInput> = {}) =>
  homeCard({
    now: at(J, wallClock),
    location: J,
    inIsrael: true,
    nusach: 'sefard',
    language: 'he',
    t,
    habit: null,
    mine: DEFAULT_MINE,
    pinNext: null,
    kiddushLevana: null,
    ...over,
  });

describe('the smart card', () => {
  beforeEach(() => setLocale('he'));

  it('a plain Thursday: the weekday, the Torah reading, Tehillim and the coming Shabbat', () => {
    const m = card('2026-11-12T08:15');
    expect(m.pages.day.title).toBe('יום חמישי');
    expect(m.pages.day.facts).toEqual([
      { label: 'בתפילה', value: 'קריאת התורה' },
      { label: 'תהילים היום', value: 'פרקים צ–קו' },
    ]);
    expect(m.pages.week.title).toBe('פרשת תולדות');
    expect(m.pages.week.facts).toEqual([
      { label: 'כניסה', value: 'ו׳ 16:25' },
      { label: 'יציאה', value: 'ש׳ 17:15' },
    ]);
    expect(m.smart).toBe('day');
    expect(m.candleLighting).toBeNull();
  });

  it('turns to the week from Thursday night', () => {
    expect(card('2026-11-12T20:00').smart).toBe('week');
  });

  it('erev Shabbat: the title, candle lighting for the carousel and a countdown in the week', () => {
    const m = card('2026-11-13T12:30');
    expect(m.pages.day.title).toBe('ערב שבת פרשת תולדות');
    expect(m.candleLighting).not.toBeNull();
    expect(m.pages.week.facts[0]).toEqual({ label: 'כניסה', value: 'בעוד 3:55 שעות' });
  });

  it('Rosh Chodesh, Chanukah and a fast name the day and what the prayer adds', () => {
    const rc = card('2026-11-10T09:00');
    expect(rc.pages.day.title).toBe('ראש חודש כסלו');
    expect(rc.pages.day.facts[0].value).toBe('יעלה ויבוא · חצי הלל · מוסף');
    const chanukah = card('2026-12-06T15:30');
    expect(chanukah.pages.day.title).toBe('חנוכה · ג׳ נרות');
    expect(chanukah.pages.day.facts[0].value).toBe('על הניסים · הלל שלם');
    expect(chanukah.pages.week.facts[2]).toEqual({ label: 'ראש חודש', value: 'טבת · יום חמישי' });
    const fast = card('2026-12-20T12:00');
    expect(fast.pages.day.title).toBe('עשרה בטבת');
    expect(fast.pages.day.facts[0].value).toBe('עננו');
    expect(fast.fastEnd).not.toBeNull();
  });

  it('names Shabbat Mevarchim with the molad, and a named Shabbat', () => {
    expect(card('2026-12-03T10:00').pages.week.facts[2]).toEqual({
      label: 'שבת מברכים',
      value: 'מולד טבת · רביעי 11:11 ו-4 חל׳',
    });
    expect(card('2027-03-16T10:00').pages.week.facts[2]).toEqual({ label: 'השבת', value: 'שבת זכור' });
  });

  it('counts the Omer by day and by night', () => {
    expect(card('2027-05-05T10:00').pages.day.title).toBe('היום 13 לעומר');
    expect(card('2027-05-05T21:00').pages.day.title).toBe('הלילה סופרים 14 לעומר');
  });

  it('shows what the marks taught in the day', () => {
    const m = card('2026-11-12T07:00', { habit: { id: 'shacharitLate', zman: 'sofShma', after: 3, of: 5 } });
    expect(m.pages.day.facts[1]).toEqual({ label: '✦ למדנו: שחרית מאוחרת', value: 'לקרוא שמע קודם' });
    expect(m.smart).toBe('day');
  });

  it('mine: what the user picked, an empty pick saying where to pick', () => {
    const m = card('2026-11-12T08:15', {
      mine: ['toShabbat', 'pins'],
      pinNext: { name: 'חצות לילה', at: at(J, '2026-11-12T23:23') },
    });
    expect(m.pages.mine.facts).toEqual([
      { label: 'עד השבת', value: '32:10 שעות' },
      { label: 'עד חצות לילה', value: '15:08 שעות' },
    ]);
    expect(card('2026-11-12T08:15', { mine: [] }).pages.mine.facts).toEqual([
      { label: 'עוד לא בחרת', value: 'בוחרים ב⋯' },
    ]);
    expect(mineFactsOf(['pins', 'x', 'toShabbat'])).toEqual(['toShabbat', 'pins']);
    expect(mineFactsOf(null)).toEqual(DEFAULT_MINE);
  });

  it('mine: shows every chosen fact, with a plain value when it has nothing near', () => {
    const m = card('2026-11-12T08:15', { mine: ['kiddushLevana', 'hilula', 'tehillim'] });
    expect(m.pages.mine.facts.map((f) => f.label)).toEqual(['קידוש לבנה', 'הילולא קרובה', 'תהילים היום']);
    expect(m.pages.mine.facts[0].value).toBe('לא בימים הקרובים');
    expect(m.pages.mine.facts[2].value).toBe('פרקים צ–קו');
    expect(card('2026-11-12T08:15', { mine: ['pins'] }).pages.mine.facts).toEqual([
      { label: 'המועדף הבא', value: 'מסמנים ב⭐ בקרוסלה' },
    ]);
  });

  it('reads in English too', () => {
    setLocale('en');
    const m = card('2026-11-10T09:00', { language: 'en' });
    expect(m.pages.day.facts[0].value).toBe("Ya'aleh Veyavo · Half Hallel · Musaf");
    expect(m.pages.week.facts[0]).toEqual({ label: 'Begins', value: 'Fri 16:25' });
  });
});

describe('the marks of the last days', () => {
  it('reads each day against its own time', () => {
    const now = at(J, '2026-11-12T08:00');
    const late = at(J, '2026-11-11T09:30').getTime();
    const early = at(J, '2026-11-10T07:00').getTime();
    const history = markHistory(
      { '2026-11-11': { shacharit: late }, '2026-11-10': { shacharit: early } },
      now,
      J,
      'GRA',
    );
    expect(markStat(history.shacharit)).toEqual({ after: 1, of: 2 });
    expect(markStat(history.mincha)).toEqual({ after: 0, of: 0 });
  });
});
