import { DateTime, IANAZone } from 'luxon';
import { Luxon as KosherLuxon } from 'kosher-zmanim';
import '../zoneOffsetCache';

// The offset straight from Intl, as Luxon computes it without the cache.
const formats = new Map<string, Intl.DateTimeFormat>();
const formatFor = (zone: string) => {
  let format = formats.get(zone);
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formats.set(zone, format);
  }
  return format;
};

function intlOffset(zone: string, ts: number): number {
  const parts = formatFor(zone).formatToParts(new Date(ts));
  const part = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'));
  return Math.round((asUtc - Math.floor(ts / 1000) * 1000) / 60_000);
}

const ZONES = ['Asia/Jerusalem', 'America/New_York', 'Australia/Lord_Howe', 'America/St_Johns', 'Pacific/Kiritimati'];
const YEAR_START = Date.UTC(2026, 0, 1);
const YEAR_END = Date.UTC(2027, 0, 1);

describe('zone offset cache', () => {
  it.each(ZONES)('gives Intl’s offset at every instant of a year in %s, transitions included', (zone) => {
    const luxon3 = IANAZone.create(zone);
    const luxon1 = KosherLuxon.IANAZone.create(zone);
    // 17-minute steps from an odd start land in every hour of the year, the transition hours too.
    const wrong: string[] = [];
    for (let ts = YEAR_START + 61_001; ts < YEAR_END; ts += 17 * 60_000 + 13) {
      const expected = intlOffset(zone, ts);
      if (luxon3.offset(ts) !== expected || luxon1.offset(ts) !== expected) wrong.push(new Date(ts).toISOString());
    }
    expect(wrong).toEqual([]);
  });

  it('keeps the minute on each side of a transition: New York, 2026-03-08 02:00 and 2026-11-01 02:00', () => {
    const spring = DateTime.fromISO('2026-03-08T07:00:00Z').toMillis();
    const fall = DateTime.fromISO('2026-11-01T06:00:00Z').toMillis();
    const ny = IANAZone.create('America/New_York');
    expect([ny.offset(spring - 1), ny.offset(spring)]).toEqual([-300, -240]);
    expect([ny.offset(fall - 1), ny.offset(fall)]).toEqual([-240, -300]);
    expect(DateTime.fromMillis(spring - 1, { zone: 'America/New_York' }).toISO()).toBe('2026-03-08T01:59:59.999-05:00');
    expect(DateTime.fromMillis(spring, { zone: 'America/New_York' }).toISO()).toBe('2026-03-08T03:00:00.000-04:00');
  });

  it('asks Intl once per zone and hour, so a second pass over the same hours asks nothing', () => {
    const proto = Intl.DateTimeFormat.prototype;
    const original = proto.formatToParts;
    let calls = 0;
    proto.formatToParts = function (this: Intl.DateTimeFormat, ...args: [Date?]) {
      calls += 1;
      return original.apply(this, args);
    };
    try {
      const start = Date.UTC(2031, 5, 1);
      const pass = () => {
        let hours = 0;
        for (let i = 0; i < 2000; i++) hours += DateTime.fromMillis(start + i * 60_000, { zone: 'Asia/Tokyo' }).hour;
        return hours;
      };
      pass();
      expect(calls).toBeLessThanOrEqual(2 * 35);
      calls = 0;
      pass();
      expect(calls).toBe(0);
    } finally {
      proto.formatToParts = original;
    }
  });

  it('leaves an invalid zone and a NaN instant to Luxon', () => {
    expect(Number.isNaN(IANAZone.create('Not/AZone').offset(Date.now()))).toBe(true);
    expect(Number.isNaN(IANAZone.create('Asia/Jerusalem').offset(NaN))).toBe(true);
  });

  it('is installed on both Luxon copies by ZmanimService, which every zoned surface loads', () => {
    jest.isolateModules(() => {
      require('../ZmanimService');
      const cached = Symbol.for('jew365.zoneOffsetCache');
      expect((require('luxon').IANAZone.prototype as Record<symbol, unknown>)[cached]).toBe(true);
      expect((require('kosher-zmanim').Luxon.IANAZone.prototype as Record<symbol, unknown>)[cached]).toBe(true);
    });
  });
});
