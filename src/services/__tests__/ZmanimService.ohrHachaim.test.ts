import { ComplexZmanimCalendar, GeoLocation } from 'kosher-zmanim';
import { DateTime } from 'luxon';
import { findCityById } from '@/data/cities';
import { HebcalService } from '@/services/HebcalService';
import { ZmanimService } from '@/services/ZmanimService';
import { at, zmanimFor } from '@/testing/zmanim';
import { Location, ZmanimKey } from '@/types/zmanim';

// The printed Ohr HaChaim luach, Tishrei 5781 (page 27: Sunday 2020-09-27 to Shabbat 2020-10-03),
// for Jerusalem, Tel Aviv, Haifa and Be'er Sheva, and the Tel Aviv Shabbat of 2026-10-02/03 its
// 5787 edition prints. The luach rounds to the minute, so every value must land within one minute.
const city = (id: string): Location => {
  const found = findCityById(id);
  if (!found) throw new Error(`no city ${id}`);
  return found;
};
const CITY = { J: city('jerusalem'), T: city('tel-aviv'), H: city('haifa'), B: city('beer-sheva') };
type CityKey = keyof typeof CITY;

// alot, shkia, tzeit, Shema MGA, Shema GRA, tefila GRA (the printed sunrise is the visible one).
const DAILY_KEYS: ZmanimKey[] = [
  'alotHaShachar',
  'shkia',
  'tzeitHakochavim',
  'sofZmanShmaMA',
  'sofZmanShmaGra',
  'sofZmanTfilaGra',
];
const DAILY: Record<string, Record<CityKey, string[]>> = {
  '2020-09-27': {
    J: ['05:12', '18:34', '18:48', '08:51', '09:27', '10:28'],
    T: ['05:18', '18:31', '18:46', '08:55', '09:31', '10:31'],
    H: ['05:16', '18:32', '18:47', '08:53', '09:29', '10:29'],
    B: ['05:17', '18:33', '18:47', '08:54', '09:30', '10:30'],
  },
  '2020-09-28': {
    J: ['05:13', '18:32', '18:47', '08:51', '09:27', '10:28'],
    T: ['05:19', '18:30', '18:44', '08:55', '09:31', '10:31'],
    H: ['05:17', '18:31', '18:45', '08:53', '09:29', '10:29'],
    B: ['05:18', '18:32', '18:46', '08:54', '09:30', '10:30'],
  },
  '2020-09-29': {
    J: ['05:14', '18:31', '18:46', '08:51', '09:27', '10:28'],
    T: ['05:20', '18:28', '18:43', '08:55', '09:31', '10:31'],
    H: ['05:18', '18:29', '18:44', '08:53', '09:29', '10:29'],
    B: ['05:18', '18:30', '18:45', '08:54', '09:30', '10:30'],
  },
  '2020-09-30': {
    J: ['05:15', '18:30', '18:44', '08:51', '09:28', '10:28'],
    T: ['05:21', '18:27', '18:42', '08:55', '09:31', '10:31'],
    H: ['05:18', '18:28', '18:43', '08:54', '09:30', '10:29'],
    B: ['05:19', '18:29', '18:43', '08:55', '09:30', '10:30'],
  },
  '2020-10-01': {
    J: ['05:15', '18:28', '18:43', '08:52', '09:28', '10:28'],
    T: ['05:22', '18:26', '18:40', '08:56', '09:31', '10:31'],
    H: ['05:19', '18:27', '18:41', '08:54', '09:30', '10:29'],
    B: ['05:20', '18:28', '18:42', '08:55', '09:31', '10:30'],
  },
  '2020-10-02': {
    J: ['05:16', '18:27', '18:42', '08:52', '09:28', '10:28'],
    T: ['05:23', '18:25', '18:39', '08:56', '09:31', '10:31'],
    H: ['05:20', '18:25', '18:40', '08:54', '09:30', '10:30'],
    B: ['05:21', '18:26', '18:41', '08:55', '09:31', '10:30'],
  },
  '2020-10-03': {
    J: ['05:17', '18:26', '18:40', '08:52', '09:28', '10:28'],
    T: ['05:23', '18:23', '18:38', '08:56', '09:32', '10:31'],
    H: ['05:21', '18:24', '18:38', '08:55', '09:30', '10:30'],
    B: ['05:22', '18:25', '18:40', '08:55', '09:31', '10:30'],
  },
};

// The week's box: the first and the last day of each.
const WEEKLY_KEYS: ZmanimKey[] = ['misheyakir', 'chatzot', 'minchaGedola', 'minchaKetana', 'plagHaMincha'];
const WEEKLY: Record<CityKey, [string, string][]> = {
  J: [
    ['05:19', '05:24'],
    ['12:30', '12:28'],
    ['13:01', '12:59'],
    ['16:03', '15:57'],
    ['17:32', '17:26'],
  ],
  T: [
    ['05:25', '05:30'],
    ['12:32', '12:30'],
    ['13:02', '13:00'],
    ['16:02', '15:57'],
    ['17:31', '17:24'],
  ],
  H: [
    ['05:23', '05:28'],
    ['12:31', '12:29'],
    ['13:02', '12:59'],
    ['16:02', '15:57'],
    ['17:31', '17:24'],
  ],
  B: [
    ['05:24', '05:29'],
    ['12:32', '12:30'],
    ['13:02', '13:00'],
    ['16:03', '15:58'],
    ['17:32', '17:25'],
  ],
};

// Candle lighting on the two erevs of the page, and the exit of Yom Kippur and of the first day of Sukkot.
const CANDLES: Record<string, Record<CityKey, string>> = {
  '2020-09-27': { J: '18:14', T: '18:11', H: '18:12', B: '18:13' },
  '2020-10-02': { J: '18:07', T: '18:05', H: '18:05', B: '18:06' },
};
const EXIT: Record<string, Record<CityKey, string>> = {
  '2020-09-28': { J: '19:03', T: '19:01', H: '19:02', B: '19:03' },
  '2020-10-03': { J: '18:57', T: '18:54', H: '18:55', B: '18:56' },
};

// The printed visible sunrise (זריחה) of the 5781 page above and of the two 5787 pages in
// .claude/specs/ohr-hachaim-5787/printed.json; a decimal is a fraction of a minute (Jerusalem prints quarters).
const NETZ: Record<string, Record<CityKey, string>> = {
  '2020-09-27': { J: '06:30', T: '06:37', H: '06:30', B: '06:36' },
  '2020-09-28': { J: '06:30.5', T: '06:38', H: '06:31', B: '06:36' },
  '2020-09-29': { J: '06:31.25', T: '06:38', H: '06:32', B: '06:36' },
  '2020-09-30': { J: '06:31.75', T: '06:39', H: '06:32', B: '06:37' },
  '2020-10-01': { J: '06:32.5', T: '06:40', H: '06:33', B: '06:38' },
  '2020-10-02': { J: '06:33', T: '06:41', H: '06:34', B: '06:38' },
  '2020-10-03': { J: '06:33.75', T: '06:41', H: '06:35', B: '06:39' },
  '2026-10-25': { J: '05:48.75', T: '05:58', H: '05:52', B: '05:54' },
  '2026-10-26': { J: '05:49.25', T: '05:58', H: '05:52', B: '05:55' },
  '2026-10-27': { J: '05:50', T: '05:59', H: '05:53', B: '05:55' },
  '2026-10-28': { J: '05:51', T: '06:00', H: '05:54', B: '05:56' },
  '2026-10-29': { J: '05:51.75', T: '06:01', H: '05:55', B: '05:57' },
  '2026-10-30': { J: '05:52.5', T: '06:02', H: '05:55', B: '05:58' },
  '2026-10-31': { J: '05:53.75', T: '06:03', H: '05:56', B: '05:59' },
  '2027-06-06': { J: '05:33.5', T: '05:39', H: '05:35', B: '05:42' },
  '2027-06-07': { J: '05:33.5', T: '05:38', H: '05:35', B: '05:42' },
  '2027-06-08': { J: '05:33.5', T: '05:38', H: '05:35', B: '05:42' },
  '2027-06-09': { J: '05:33', T: '05:38', H: '05:34', B: '05:42' },
  '2027-06-10': { J: '05:33', T: '05:38', H: '05:34', B: '05:42' },
  '2027-06-11': { J: '05:33', T: '05:38', H: '05:34', B: '05:41' },
  '2027-06-12': { J: '05:33', T: '05:38', H: '05:34', B: '05:41' },
};

const MINUTE = 60_000;
const minutesOff = (actual: Date, loc: Location, day: string, printed: string) =>
  (actual.getTime() - at(loc, `${day}T${printed}`).getTime()) / MINUTE;
const keys = Object.keys(CITY) as CityKey[];
const printedAt = (loc: Location, day: string, printed: string) => {
  const [clock, fraction = '0'] = printed.split('.');
  return new Date(at(loc, `${day}T${clock}`).getTime() + Number(`0.${fraction}`) * MINUTE);
};

describe('the zmanim of the printed Ohr HaChaim luach', () => {
  describe.each(Object.keys(DAILY))('%s', (day) => {
    it.each(keys)('%s: alot, shkia, tzeit and the Shema and tefila times', (k) => {
      const zmanim = zmanimFor(at(CITY[k], `${day}T12:00`), CITY[k]);
      DAILY_KEYS.forEach((key, i) => {
        expect({ key, off: Math.abs(minutesOff(zmanim[key] as Date, CITY[k], day, DAILY[day][k][i])) <= 1 }).toEqual({
          key,
          off: true,
        });
      });
    });
  });

  it.each(keys)('%s: the visible sunrise over the city horizon, on 21 printed days in three seasons', (k) => {
    Object.entries(NETZ).forEach(([day, byCity]) => {
      const netz = zmanimFor(at(CITY[k], `${day}T12:00`), CITY[k]).netzHaChama;
      const off = (netz.getTime() - printedAt(CITY[k], day, byCity[k]).getTime()) / MINUTE;
      expect({ day, off: Math.abs(off) <= 1 }).toEqual({ day, off: true });
    });
  });

  it.each(keys)('%s: misheyakir, chatzot, mincha and plag over the week', (k) => {
    (['2020-09-27', '2020-10-03'] as const).forEach((day, end) => {
      const zmanim = zmanimFor(at(CITY[k], `${day}T12:00`), CITY[k]);
      WEEKLY_KEYS.forEach((key, i) => {
        const off = minutesOff(zmanim[key] as Date, CITY[k], day, WEEKLY[k][i][end]);
        expect({ key, day, off: Math.abs(off) <= 1 }).toEqual({ key, day, off: true });
      });
    });
  });

  it.each(keys)('%s: candle lighting, 20 minutes before shkia, opens the block', (k) => {
    Object.entries(CANDLES).forEach(([day, byCity]) => {
      const candles = ZmanimService.getCandleLighting(at(CITY[k], `${day}T12:00`), CITY[k], {
        isFriday: false,
        isErevYomTov: true,
      });
      expect(Math.abs(minutesOff(candles as Date, CITY[k], day, byCity[k]))).toBeLessThanOrEqual(1);
      const next = at(CITY[k], `${day}T12:00`).getTime() + 24 * 3_600_000;
      expect(HebcalService.holyBlockOn(new Date(next), CITY[k])?.start.getTime()).toBe(candles?.getTime());
    });
  });

  it.each(keys)('%s: Shabbat, Yom Tov and Yom Kippur end 30 minutes after shkia', (k) => {
    Object.entries(EXIT).forEach(([day, byCity]) => {
      const exit = ZmanimService.getHavdalah(at(CITY[k], `${day}T12:00`), CITY[k]);
      expect(Math.abs(minutesOff(exit as Date, CITY[k], day, byCity[k]))).toBeLessThanOrEqual(1);
      expect(HebcalService.holyBlockOn(at(CITY[k], `${day}T12:00`), CITY[k])?.end.getTime()).toBe(exit?.getTime());
    });
  });

  it('Tel Aviv, Shabbat 2026-10-02/03: candles 18:05 and the exit 18:55', () => {
    const t = CITY.T;
    const candles = ZmanimService.getCandleLighting(at(t, '2026-10-02T12:00'), t, {
      isFriday: true,
      isErevYomTov: false,
    });
    expect(Math.abs(minutesOff(candles as Date, t, '2026-10-02', '18:05'))).toBeLessThanOrEqual(1);
    expect(
      Math.abs(minutesOff(ZmanimService.getHavdalah(at(t, '2026-10-03T12:00'), t) as Date, t, '2026-10-03', '18:55')),
    ).toBeLessThanOrEqual(1);
  });
});

describe('the luach rules', () => {
  const j = CITY.J;
  const z = () => zmanimFor(at(j, '2026-11-02T12:00'), j);

  it('rounds every zman to a whole minute', () => {
    Object.values(z()).forEach((value) => expect((value as Date).getTime() % MINUTE).toBe(0));
  });

  it('reads the visible sunrise from the printed city horizon only inside the city', () => {
    const seaLevelNetz = (loc: Location, day: string) => {
      const cal = new ComplexZmanimCalendar(new GeoLocation(loc.name, loc.lat, loc.lng, loc.elevation ?? 0, loc.tz));
      cal.setDate(DateTime.fromISO(`${day}T12:00`, { zone: loc.tz }));
      return Math.ceil(cal.getSeaLevelSunrise()!.toJSDate().getTime() / MINUTE) * MINUTE;
    };
    // In the city the horizon decides, not sea level (the printed days above pin the minutes).
    expect(z().netzHaChama.getTime()).not.toBe(seaLevelNetz(j, '2026-11-02'));
    // Outside the printed cities, and 15 km from one, sea level stands in, as before.
    const ny = city('new-york');
    expect(zmanimFor(at(ny, '2026-11-02T12:00'), ny).netzHaChama.getTime()).toBe(seaLevelNetz(ny, '2026-11-02'));
    const beyond: Location = { ...j, lat: j.lat + 0.135, elevation: undefined };
    expect(zmanimFor(at(beyond, '2026-11-02T12:00'), beyond).netzHaChama.getTime()).toBe(
      seaLevelNetz(beyond, '2026-11-02'),
    );
  });

  it('ends Shabbat 40 minutes after shkia abroad', () => {
    const ny = city('new-york');
    const zm = zmanimFor(at(ny, '2026-11-07T12:00'), ny);
    const off = (zm.tzeitShabbat.getTime() - zm.shkia.getTime()) / MINUTE;
    expect(off).toBeGreaterThanOrEqual(40);
    expect(off).toBeLessThanOrEqual(41);
  });

  it('ends a fast 20 minutes after shkia', () => {
    const off = (z().tzeitTaanit.getTime() - z().shkia.getTime()) / MINUTE;
    expect(off).toBeGreaterThanOrEqual(20);
    expect(off).toBeLessThanOrEqual(21);
  });

  it('keeps every zman in the order of the day', () => {
    const d = z();
    const order: ZmanimKey[] = [
      'alotHaShachar',
      'misheyakir',
      'netzHaChama',
      'sofZmanShmaMA',
      'sofZmanShmaGra',
      'sofZmanTfilaGra',
      'chatzot',
      'minchaGedola',
      'minchaKetana',
      'plagHaMincha',
      'shkia',
      'tzeitHakochavim',
      'tzeitShabbat',
    ];
    order
      .slice(1)
      .forEach((key, i) => expect((d[key] as Date).getTime()).toBeGreaterThanOrEqual((d[order[i]] as Date).getTime()));
  });
});
