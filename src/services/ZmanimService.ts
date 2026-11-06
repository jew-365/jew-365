// Before any zoned date is built: an hourly cache over Luxon's Intl offset lookups, the launch's heaviest cost.
import './zoneOffsetCache';
import { ComplexZmanimCalendar, GeoLocation } from 'kosher-zmanim';
import { DateTime } from 'luxon';
import { Location, Zmanim } from '@/types/zmanim';

// The zmanim of the Ohr HaChaim luach (the owner's call, 2026-11-03): seasonal minutes of the day
// from sunrise to sunset at the city's height, each rounded to the minute the way the luach prints
// it, and fixed minutes only for candle lighting, the exit of Shabbat and Yom Tov and a fast's end.
const CANDLE_LIGHTING_MIN = 20;
const EXIT_MIN_IN_ISRAEL = 30;
const EXIT_MIN_ABROAD = 40;
const FAST_END_MIN = 20;
const MINUTE = 60_000;

export function isJerusalem(location: Location): boolean {
  return location.cityId === 'jerusalem';
}

export function candleLightingMinutes(location: Location): number {
  return location.candleLightingMinutes ?? CANDLE_LIGHTING_MIN;
}

export function holyBlockExit(zmanim: Pick<Zmanim, 'tzeitShabbat'>): Date {
  return new Date(zmanim.tzeitShabbat);
}

const ZMANIM_CACHE_LIMIT = 400;
const DAY_KEY_BUCKET_MS = 15 * 60_000;
const DAY_KEY_BUCKET_LIMIT = 4000;
const zmanimCache = new Map<string, Zmanim>();
const dayKeysByZone = new Map<string, Map<number, string>>();

function toDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  const candidate =
    value instanceof Date
      ? value
      : ((value as { toDate?: () => Date }).toDate?.() ??
        (value as { toJSDate?: () => Date }).toJSDate?.() ??
        new Date(String(value)));
  return candidate instanceof Date && !Number.isNaN(candidate.getTime()) ? candidate : null;
}

const after = (base: Date, ms: number) => new Date(base.getTime() + ms);

// The luach rounds every zman to the minute on its stringent side: a start later, an end earlier.
const earlier = (date: Date) => new Date(Math.floor(date.getTime() / MINUTE) * MINUTE);
const later = (date: Date) => new Date(Math.ceil(date.getTime() / MINUTE) * MINUTE);
const nearest = (date: Date) => new Date(Math.round(date.getTime() / MINUTE) * MINUTE);

// kosher-zmanim 0.9.0 reads the raw offset of any zone that keeps DST with the wrong sign, so its
// antimeridian check takes Sydney or New Zealand for a zone 20 hours ahead of local mean time and
// computes every zman for the next day. The same check, from the zone's true standard offset:
export function antimeridianAdjustment(loc: Location): -1 | 0 | 1 {
  const january = DateTime.fromObject({ month: 1, day: 1 }, { zone: loc.tz }).offset;
  const july = DateTime.fromObject({ month: 7, day: 1 }, { zone: loc.tz }).offset;
  const localHours = loc.lng / 15 - Math.min(january, july) / 60;
  if (localHours >= 20) return 1;
  return localHours <= -20 ? -1 : 0;
}

function buildCalendar(date: Date, loc: Location): ComplexZmanimCalendar {
  const geo = new GeoLocation(loc.name, loc.lat, loc.lng, loc.elevation ?? 0, loc.tz);
  const adjustment = antimeridianAdjustment(loc);
  geo.getAntimeridianAdjustment = () => adjustment;
  const cal = new ComplexZmanimCalendar(geo);
  // Resolve the calendar day in the LOCATION's zone. kosher-zmanim's setDate materialises a plain
  // Date in the system zone, so a traveller whose device zone differs from their selected city got
  // that city's zmanim for the device's day — every evening, off by one.
  cal.setDate(DateTime.fromJSDate(date).setZone(loc.tz));
  return cal;
}

// Every zone offset and every transition is a whole number of 15-minute steps, so a 15-minute bucket
// never straddles a local midnight and its civil date is the same for all of it.
function civilDayKey(date: Date, tz: string): string {
  let keys = dayKeysByZone.get(tz);
  if (!keys) {
    keys = new Map();
    dayKeysByZone.set(tz, keys);
  }
  const bucket = Math.floor(date.getTime() / DAY_KEY_BUCKET_MS);
  let day = keys.get(bucket);
  if (day === undefined) {
    day =
      DateTime.fromMillis(bucket * DAY_KEY_BUCKET_MS)
        .setZone(tz)
        .toISODate() ?? '';
    if (keys.size >= DAY_KEY_BUCKET_LIMIT) keys.clear();
    keys.set(bucket, day);
  }
  return day;
}

function cacheKey(date: Date, loc: Location): string {
  return [civilDayKey(date, loc.tz), loc.lat, loc.lng, loc.elevation ?? 0, loc.tz, loc.inIsrael].join('|');
}

function cloneZmanim(zmanim: Zmanim): Zmanim {
  return {
    alotHaShachar: new Date(zmanim.alotHaShachar),
    misheyakir: new Date(zmanim.misheyakir),
    netzHaChama: new Date(zmanim.netzHaChama),
    sofZmanShmaGra: new Date(zmanim.sofZmanShmaGra),
    sofZmanShmaMA: new Date(zmanim.sofZmanShmaMA),
    sofZmanTfilaGra: new Date(zmanim.sofZmanTfilaGra),
    chatzot: new Date(zmanim.chatzot),
    chatzotLayla: new Date(zmanim.chatzotLayla),
    minchaGedola: new Date(zmanim.minchaGedola),
    minchaKetana: new Date(zmanim.minchaKetana),
    plagHaMincha: new Date(zmanim.plagHaMincha),
    shkia: new Date(zmanim.shkia),
    tzeitHakochavim: new Date(zmanim.tzeitHakochavim),
    tzeitShabbat: new Date(zmanim.tzeitShabbat),
    tzeitTaanit: new Date(zmanim.tzeitTaanit),
  };
}

function cacheZmanim(key: string, value: Zmanim): void {
  if (zmanimCache.size >= ZMANIM_CACHE_LIMIT) {
    const oldest = zmanimCache.keys().next().value;
    if (oldest) zmanimCache.delete(oldest);
  }
  zmanimCache.set(key, cloneZmanim(value));
}

export type CandleLightingOptions = {
  isFriday: boolean;
  isErevYomTov: boolean;
  minutesBefore?: number;
};

export const ZmanimService = {
  // Returns null only when the sun does not rise or set at all on this date (polar day/night).
  getZmanim(date: Date, loc: Location): Zmanim | null {
    const key = cacheKey(date, loc);
    const cached = zmanimCache.get(key);
    if (cached) {
      zmanimCache.delete(key);
      zmanimCache.set(key, cached);
      return cloneZmanim(cached);
    }

    const cal = buildCalendar(date, loc);
    const sunrise = toDateOrNull(cal.getSunrise());
    const sunset = toDateOrNull(cal.getSunset());
    // The luach prints the visible sunrise, which no formula gives; sea level stands in for it.
    const visibleSunrise = toDateOrNull(cal.getSeaLevelSunrise());
    const transit = toDateOrNull(cal.getSunTransit());
    if (!sunrise || !sunset || !visibleSunrise || !transit) return null;

    const hour = (sunset.getTime() - sunrise.getTime()) / 12;
    const zmaniyot = (minutes: number) => (minutes * hour) / 60;
    const alot = after(sunrise, -zmaniyot(72));
    const tzeit = after(sunset, zmaniyot(13.5));
    const mgaHour = (after(sunset, zmaniyot(72)).getTime() - alot.getTime()) / 12;

    const zmanim: Zmanim = {
      alotHaShachar: earlier(alot),
      misheyakir: later(after(sunrise, -zmaniyot(66))),
      netzHaChama: later(visibleSunrise),
      sofZmanShmaGra: earlier(after(sunrise, 3 * hour)),
      sofZmanShmaMA: earlier(after(alot, 3 * mgaHour)),
      sofZmanTfilaGra: earlier(after(sunrise, 4 * hour)),
      chatzot: nearest(transit),
      // Chatzot halayla — the solar midnight of the night that FOLLOWS this day, so it belongs to
      // the next civil date. Never derive it by adding a calendar day to midday chatzot.
      chatzotLayla: later(toDateOrNull(cal.getSolarMidnight()) ?? after(transit, 12 * 3_600_000)),
      minchaGedola: later(after(transit, Math.max(30 * MINUTE, zmaniyot(30)))),
      minchaKetana: later(after(sunrise, 9.5 * hour)),
      plagHaMincha: later(after(tzeit, -1.25 * hour)),
      shkia: earlier(sunset),
      tzeitHakochavim: later(tzeit),
      tzeitShabbat: later(after(sunset, (loc.inIsrael ? EXIT_MIN_IN_ISRAEL : EXIT_MIN_ABROAD) * MINUTE)),
      tzeitTaanit: later(after(sunset, FAST_END_MIN * MINUTE)),
    };

    cacheZmanim(key, zmanim);
    return cloneZmanim(zmanim);
  },

  getCandleLighting(date: Date, loc: Location, opts: CandleLightingOptions): Date | null {
    const shkia = ZmanimService.getZmanim(date, loc)?.shkia;
    if (!shkia) return null;
    return after(shkia, -(opts.minutesBefore ?? candleLightingMinutes(loc)) * MINUTE);
  },

  getHavdalah(date: Date, loc: Location): Date | null {
    const zmanim = ZmanimService.getZmanim(date, loc);
    return zmanim ? holyBlockExit(zmanim) : null;
  },
};
