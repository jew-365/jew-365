import {
  appDayWindow,
  buildDayTimeline,
  currentOrNextWindow,
  DayWindow,
  windowStillOpen,
  ZMAN_KEYS,
} from '../buildDayTimeline';
import { locationNoon } from '../locationDay';
import { Mitzvah, UserSettings, Weekday } from '@/types/mitzvah';
import type { Zmanim } from '@/types/zmanim';
import { CITIES } from '@/data/cities';
import { customToMitzvah } from '@/data/customMitzvotAdapter';
import { findMitzvah, omerDayFor } from '@/data/mitzvot';
import { dateKey } from '@/stores/useCompletionsStore';
import { at } from '@/testing/zmanim';

const date = new Date('2026-05-06T08:00:00Z');
const zmanim = Object.fromEntries(
  ZMAN_KEYS.map((key, index) => [key, new Date(date.getTime() + index * 60_000)]),
) as unknown as Zmanim;

const mitzvah: Mitzvah = {
  id: 'sample',
  name: { he: 'בדיקה', en: 'Sample' },
  icon: 'sample',
  timeType: 'range-within-day',
  category: 'daily-morning',
  group: 'daily',
  skipOn: [],
  nuschaotSupported: ['ashkenaz'],
  defaultReminders: [],
  computeWindow: () => ({
    start: new Date('2026-05-06T09:00:00Z'),
    end: new Date('2026-05-06T10:00:00Z'),
  }),
};

describe('buildDayTimeline', () => {
  it('builds zmanim plus mitzvah items in time order', () => {
    const items = buildDayTimeline(
      date,
      [mitzvah],
      { '2026-05-06': { sample: Date.now() } },
      CITIES[0],
      { nusach: 'ashkenaz', halachicOpinions: { ksSofZman: 'GRA' }, inIsrael: true },
      'en',
      (key) => key,
      {},
      zmanim,
    );

    expect(items).toHaveLength(ZMAN_KEYS.length + 1);
    expect(items.find((item) => item.mitzvahId === 'sample')).toMatchObject({
      name: 'Sample',
      type: 'mitzvah',
      done: true,
    });
    expect([...items].sort((a, b) => a.time.getTime() - b.time.getTime())).toEqual(items);
  });

  it('lists a mitzvah only on the days that ended after it was switched on, a multi-day window by its own end', () => {
    const mitzvahIds = (day: Date, mitzvot: Mitzvah[], enabledSince: Record<string, number>) =>
      buildDayTimeline(day, mitzvot, {}, jerusalem, settings, 'he', (key) => key, enabledSince)
        .filter((item) => item.type === 'mitzvah')
        .map((item) => item.mitzvahId);
    const shacharit = findMitzvah('shacharit')!;
    const switchedOn = at(jerusalem, '2026-10-28T09:00').getTime();
    expect(mitzvahIds(new Date(2026, 9, 27), [shacharit], { shacharit: switchedOn })).toEqual([]);
    expect(mitzvahIds(new Date(2026, 9, 28), [shacharit], { shacharit: switchedOn })).toEqual(['shacharit']);
    expect(mitzvahIds(new Date(2026, 9, 27), [shacharit], {})).toEqual(['shacharit']);

    const kiddushLevana = findMitzvah('kiddush_levana')!;
    const firstNight = [...Array(20).keys()]
      .map((offset) => new Date(2026, 9, 10 + offset))
      .find((day) => mitzvahIds(day, [kiddushLevana], {}).length > 0)!;
    const duringPeriod = at(jerusalem, `${dateKey(firstNight)}T12:00`).getTime() + 3 * 24 * 60 * 60_000;
    expect(mitzvahIds(firstNight, [kiddushLevana], { kiddush_levana: duringPeriod })).toEqual(['kiddush_levana']);

    const pastAlot: Mitzvah = {
      ...mitzvah,
      id: 'past_alot',
      computeWindow: () => ({ start: at(jerusalem, '2026-10-27T23:00'), end: at(jerusalem, '2026-10-28T06:30') }),
    };
    const evening = new Date(2026, 9, 27);
    expect(mitzvahIds(evening, [pastAlot], { past_alot: at(jerusalem, '2026-10-28T06:00').getTime() })).toEqual([
      'past_alot',
    ]);
    expect(mitzvahIds(evening, [pastAlot], { past_alot: at(jerusalem, '2026-10-28T07:00').getTime() })).toEqual([]);
  });
});

const jerusalem = CITIES[0];
const settings: UserSettings = { nusach: 'ashkenaz', halachicOpinions: { ksSofZman: 'GRA' }, inIsrael: true };

describe('currentOrNextWindow', () => {
  const omer = findMitzvah('sefirat_haomer')!;
  const maariv = findMitzvah('maariv')!;

  it('keeps last night’s omer window after midnight, while it is still open', () => {
    const now = at(jerusalem, '2026-04-20T00:30');
    const window = currentOrNextWindow(omer, jerusalem, settings, now)!;
    expect(window.start.getTime()).toBeLessThan(now.getTime());
    expect(window.end.getTime()).toBeGreaterThan(now.getTime());
    expect(omerDayFor(locationNoon(window.date, jerusalem), jerusalem.tz)).toBe(18);
    expect(dateKey(window.date)).toBe('2026-04-19');
  });

  it('moves to tonight’s window once last night’s has closed', () => {
    const now = at(jerusalem, '2026-04-20T12:00');
    const window = currentOrNextWindow(omer, jerusalem, settings, now)!;
    expect(window.start.getTime()).toBeGreaterThan(now.getTime());
    expect(omerDayFor(locationNoon(window.date, jerusalem), jerusalem.tz)).toBe(19);
    expect(dateKey(window.date)).toBe('2026-04-20');
  });

  it('files last night’s maariv under the evening’s day, as the device-local midnight of that date', () => {
    const window = currentOrNextWindow(maariv, jerusalem, settings, at(jerusalem, '2027-06-15T00:20'))!;
    expect(dateKey(window.date)).toBe('2027-06-14');
    expect(window.date.getHours()).toBe(0);
    expect(window.date.getMinutes()).toBe(0);
  });

  it('reaches a custom range that opens nine days ahead and not one ten days ahead', () => {
    const rangeFrom = (start: string) =>
      customToMitzvah({
        id: 'custom_1_range',
        name: 'לימוד',
        startHHMM: '10:00',
        endHHMM: '11:00',
        reminders: [],
        skipOn: [],
        createdAt: 1,
        schedules: [{ from: '2026-10-28', schedule: { mode: 'range', start, end: '2026-11-30' } }],
      });
    const now = at(jerusalem, '2026-10-28T12:00');
    const nine = currentOrNextWindow(rangeFrom('2026-11-06'), jerusalem, settings, now);
    expect(nine && dateKey(nine.date)).toBe('2026-11-06');
    expect(currentOrNextWindow(rangeFrom('2026-11-07'), jerusalem, settings, now)).toBeNull();
  });
});

describe('appDayWindow', () => {
  const maariv = findMitzvah('maariv')!;
  const shacharit = findMitzvah('shacharit')!;
  const tefillin = findMitzvah('tefillin')!;
  const omer = findMitzvah('sefirat_haomer')!;
  const custom = (id: string, startHHMM: string, endHHMM: string, activeDays?: Weekday[]) =>
    customToMitzvah({ id, name: id, startHHMM, endHHMM, reminders: [], skipOn: [], activeDays, createdAt: 1 });

  const state = (window: DayWindow, now: Date) => {
    if (window.end.getTime() <= now.getTime()) return 'ended';
    return window.start.getTime() <= now.getTime() ? 'open' : 'upcoming';
  };
  const shown = (mitzvah: Mitzvah, wallClock: string) => {
    const now = at(jerusalem, wallClock);
    const window = appDayWindow(mitzvah, jerusalem, settings, now);
    return window && { key: dateKey(window.date), state: state(window, now) };
  };

  it('(a) keeps last night’s maariv open until alot, then shows tonight’s', () => {
    expect(shown(maariv, '2027-06-15T00:20')).toEqual({ key: '2027-06-14', state: 'open' });
    expect(shown(maariv, '2027-06-15T01:30')).toEqual({ key: '2027-06-14', state: 'open' });
    expect(shown(maariv, '2027-06-15T03:30')).toEqual({ key: '2027-06-14', state: 'open' });
    expect(shown(maariv, '2027-06-15T04:30')).toEqual({ key: '2027-06-15', state: 'upcoming' });
  });

  it('(b) keeps yesterday’s shacharit as ended until alot, then shows the coming morning', () => {
    expect(shown(shacharit, '2027-06-15T01:30')).toEqual({ key: '2027-06-14', state: 'ended' });
    expect(shown(shacharit, '2027-06-15T04:30')).toEqual({ key: '2027-06-15', state: 'upcoming' });
  });

  it('(c) keeps the omer night open past midnight, filed under its evening', () => {
    expect(shown(omer, '2027-05-12T01:00')).toEqual({ key: '2027-05-11', state: 'open' });
    expect(shown(omer, '2027-05-12T04:45')).toEqual({ key: '2027-05-12', state: 'upcoming' });
  });

  it('(d) a custom window across midnight belongs to the evening it starts on', () => {
    const night = custom('night', '22:00', '01:00');
    expect(shown(night, '2027-06-14T23:00')).toEqual({ key: '2027-06-14', state: 'open' });
    expect(shown(night, '2027-06-15T00:30')).toEqual({ key: '2027-06-14', state: 'open' });
    expect(shown(night, '2027-06-15T02:00')).toEqual({ key: '2027-06-14', state: 'ended' });
    expect(shown(night, '2027-06-15T04:30')).toEqual({ key: '2027-06-15', state: 'upcoming' });
  });

  it('(e) a custom window after midnight belongs to the evening before its date', () => {
    const chatzot = custom('chatzot', '00:30', '01:30');
    expect(shown(chatzot, '2027-06-14T12:00')).toEqual({ key: '2027-06-14', state: 'upcoming' });
    expect(shown(chatzot, '2027-06-14T23:00')).toEqual({ key: '2027-06-14', state: 'upcoming' });
    expect(shown(chatzot, '2027-06-15T00:45')).toEqual({ key: '2027-06-14', state: 'open' });
    expect(shown(chatzot, '2027-06-15T02:00')).toEqual({ key: '2027-06-14', state: 'ended' });
    expect(shown(chatzot, '2027-06-15T04:30')).toEqual({ key: '2027-06-15', state: 'upcoming' });
  });

  it('(f) honours activeDays on the evening the window belongs to', () => {
    const tuesdays = custom('chatzot_tue', '00:30', '01:30', [2]);
    expect(shown(tuesdays, '2027-06-14T23:00')).toBeNull();
    expect(shown(tuesdays, '2027-06-15T12:00')).toEqual({ key: '2027-06-15', state: 'upcoming' });
    expect(shown(tuesdays, '2027-06-16T00:45')).toEqual({ key: '2027-06-15', state: 'open' });
  });

  it('(g) a custom window that ends after alot stays open until it ends', () => {
    const longNight = custom('long_night', '23:00', '06:00');
    expect(shown(longNight, '2027-06-15T05:00')).toEqual({ key: '2027-06-14', state: 'open' });
    expect(shown(longNight, '2027-06-15T07:00')).toEqual({ key: '2027-06-15', state: 'upcoming' });
  });

  it('(h) shows nothing for a mitzvah skipped on Shabbat', () => {
    expect(shown(tefillin, '2026-10-24T12:00')).toBeNull();
  });

  it('(i) files the extra hour of the fall-back night under the evening before', () => {
    expect(shown(maariv, '2026-10-25T00:10')).toEqual({ key: '2026-10-24', state: 'open' });
    expect(shown(maariv, '2026-10-25T03:00')).toEqual({ key: '2026-10-24', state: 'open' });
    expect(shown(maariv, '2026-10-25T05:00')).toEqual({ key: '2026-10-25', state: 'upcoming' });
  });

  it('(j) keeps last night’s bedtime Shema open until alot, filed under the evening, then shows tonight’s', () => {
    const bedtime = findMitzvah('krias_shma_al_hamita')!;
    expect(shown(bedtime, '2027-06-15T00:20')).toEqual({ key: '2027-06-14', state: 'open' });
    expect(shown(bedtime, '2027-06-15T03:30')).toEqual({ key: '2027-06-14', state: 'open' });
    expect(shown(bedtime, '2027-06-15T04:30')).toEqual({ key: '2027-06-15', state: 'upcoming' });
  });
});

describe('a window that outlasts a day', () => {
  const synthetic = (key: string, end: string, multiDay?: Mitzvah['multiDay']): Mitzvah => ({
    ...findMitzvah('maariv')!,
    id: 'long',
    multiDay,
    computeWindow: (ctx) =>
      dateKey(ctx.date) === key ? { start: ctx.zmanim.tzeitHakochavim, end: new Date(end) } : null,
  });
  const MULTI = { maxDays: 16 };
  const first = (multiDay?: Mitzvah['multiDay']) => synthetic('2026-10-14', '2026-10-26T01:44:10.171Z', multiDay);
  const second = (multiDay?: Mitzvah['multiDay']) => synthetic('2026-11-14', '2026-11-26T01:44:10.171Z', multiDay);

  it('stays the window of home on every day of its period, under its first night', () => {
    const now = at(jerusalem, '2026-10-20T21:00');
    expect(dateKey(appDayWindow(first(MULTI), jerusalem, settings, now)!.date)).toBe('2026-10-14');
    expect(appDayWindow(first(), jerusalem, settings, now)).toBeNull();
  });

  it('is found by currentOrNextWindow up to forty-five days ahead, where a one-day mitzvah reaches nine', () => {
    const now = at(jerusalem, '2026-10-27T12:00');
    expect(dateKey(currentOrNextWindow(second(MULTI), jerusalem, settings, now)!.date)).toBe('2026-11-14');
    expect(currentOrNextWindow(second(), jerusalem, settings, now)).toBeNull();
  });
});

describe('windowStillOpen', () => {
  const now = new Date('2026-10-18T20:00:00Z');

  it('is true only for a window that ends after now', () => {
    expect(windowStillOpen({ windowEnd: new Date(now.getTime() + 1) }, now)).toBe(true);
    expect(windowStillOpen({ windowEnd: now }, now)).toBe(false);
    expect(windowStillOpen({}, now)).toBe(false);
  });
});
