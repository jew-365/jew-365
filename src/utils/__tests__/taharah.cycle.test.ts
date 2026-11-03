import { HDate } from '@hebcal/core';
import { CITIES } from '@/data/cities';
import { TAHARAH_PRESETS } from '@/data/taharahPresets';
import { at } from '@/testing/zmanim';
import { TaharahEvent, TaharahRules } from '@/types/taharah';
import {
  earliestTevilaNight,
  hefsekOutcome,
  cleanDayIndex,
  deriveCycle,
  eventDay,
  onsetCountDay,
  sortedEvents,
} from '@/utils/taharah/cycle';

const JERUSALEM = CITIES[0];
const ASHKENAZ = TAHARAH_PRESETS.ashkenaz;
const OVADIA = TAHARAH_PRESETS.sephardi_ovadia;

const absOf = (y: number, m: number, d: number) => new HDate(new Date(y, m - 1, d)).abs();
// 9 Cheshvan 5787, a Tuesday.
const O = absOf(2026, 10, 20);

type Draft<E> = E extends unknown ? Omit<E, 'id' | 'recordedAt'> : never;

const log = (...drafts: Draft<TaharahEvent>[]): TaharahEvent[] =>
  drafts.map((draft, i) => ({ ...draft, id: `e${i + 1}`, recordedAt: i + 1 }) as TaharahEvent);

const onset = (abs = O, kind: 'night' | 'day' = 'day', doubtful?: boolean): Draft<TaharahEvent> => ({
  type: 'onset',
  onah: { abs, kind },
  ...(doubtful === undefined ? {} : { doubtful }),
});
const hefsek = (day: number, result: 'clean' | 'notClean' | 'doubtful' = 'clean'): Draft<TaharahEvent> => ({
  type: 'hefsek',
  day,
  result,
});
const bedika = (
  day: number,
  slot: 'morning' | 'evening',
  result: 'clean' | 'notClean' | 'doubtful' = 'clean',
): Draft<TaharahEvent> => ({
  type: 'bedika',
  day,
  slot,
  result,
});
const tevila = (day: number): Draft<TaharahEvent> => ({ type: 'tevila', day });
const ruling = (day: number, decision: 'continue' | 'restart'): Draft<TaharahEvent> => ({
  type: 'ruling',
  day,
  decision,
});

const state = (events: TaharahEvent[], now: string, rules: TaharahRules = ASHKENAZ) =>
  deriveCycle(events, rules, JERUSALEM, at(JERUSALEM, now));

const civilNoon = (abs: number) => {
  const greg = new HDate(abs).greg();
  const pad = (n: number) => String(n).padStart(2, '0');
  return at(JERUSALEM, `${greg.getFullYear()}-${pad(greg.getMonth() + 1)}-${pad(greg.getDate())}T12:00`);
};

describe('deriveCycle', () => {
  it('anchors the fixtures on 9 Cheshvan 5787', () => {
    expect(new HDate(O).getDate()).toBe(9);
    expect(new HDate(O).getMonthName()).toBe('Cheshvan');
  });

  describe('before the hefsek', () => {
    it('knows nothing without events', () => {
      const result = state([], '2026-10-22T12:00');
      expect(result.stage).toBe('unknown');
      expect(result.onset).toBeNull();
    });

    it('waits through the first days after the onset', () => {
      const result = state(log(onset()), '2026-10-22T12:00');
      expect(result).toMatchObject({
        stage: 'niddah',
        onset: { abs: O, kind: 'day' },
        hefsekEarliestDay: O + 4,
        hefsekDay: null,
        tevilaDay: null,
      });
      expect(result.cleanDays).toEqual([]);
    });

    it('opens the hefsek on the fifth day', () => {
      expect(state(log(onset()), '2026-10-24T12:00').stage).toBe('awaitingHefsek');
      expect(state(log(onset()), '2026-10-23T12:00').stage).toBe('niddah');
    });

    it('opens the hefsek a day earlier under the fourth-day rule', () => {
      const result = state(log(onset()), '2026-10-23T12:00', OVADIA);
      expect(result.stage).toBe('awaitingHefsek');
      expect(result.hefsekEarliestDay).toBe(O + 3);
    });

    it('counts a night onset as the first day of its own Hebrew day', () => {
      expect(state(log(onset(O + 1, 'night')), '2026-10-22T12:00').hefsekEarliestDay).toBe(O + 5);
    });

    it('counts a doubtful onset from the next day', () => {
      const result = state(log(onset(O, 'day', true)), '2026-10-22T12:00');
      expect(result.hefsekEarliestDay).toBe(O + 5);
      expect(result.onsetDoubtful).toBe(true);
      expect(state(log(onset()), '2026-10-22T12:00').onsetDoubtful).toBe(false);
    });
  });

  describe('the hefsek', () => {
    it('opens seven clean days after a clean hefsek', () => {
      const result = state(log(onset(), hefsek(O + 4)), '2026-10-25T12:00');
      expect(result.stage).toBe('shivaNekiim');
      expect(result.hefsekDay).toBe(O + 4);
      expect(result.cleanDays).toHaveLength(7);
      expect(result.cleanDays[0]).toEqual({ index: 1, day: O + 5, morning: null, evening: null });
      expect(result.cleanDays[6].day).toBe(O + 11);
      expect(result.tevilaDay).toBe(O + 12);
      expect(result.tevilaDeferred).toBe(false);
    });

    it('ignores a hefsek made before the earliest day', () => {
      const result = state(log(onset(), hefsek(O + 3)), '2026-10-25T12:00');
      expect(result.stage).toBe('awaitingHefsek');
      expect(result.hefsekDay).toBeNull();
    });

    it('accepts the same hefsek under the fourth-day rule', () => {
      expect(state(log(onset(), hefsek(O + 3)), '2026-10-25T12:00', OVADIA).hefsekDay).toBe(O + 3);
    });

    it('ignores a hefsek that was not clean', () => {
      const result = state(log(onset(), hefsek(O + 4, 'notClean')), '2026-10-25T12:00');
      expect(result.stage).toBe('awaitingHefsek');
      expect(result.hefsekDay).toBeNull();
    });
  });

  describe('bleeding or doubt during the seven clean days', () => {
    it('restarts on a bedika that is not clean, with a new hefsek and no wait', () => {
      const bleeding = [onset(), hefsek(O + 4), bedika(O + 5, 'morning'), bedika(O + 7, 'evening', 'notClean')];
      const result = state(log(...bleeding), '2026-10-27T15:00');
      expect(result.stage).toBe('awaitingHefsek');
      expect(result.hefsekEarliestDay).toBeNull();
      expect(result.hefsekDay).toBeNull();
      expect(result.cleanDays).toEqual([]);

      const restarted = state(log(...bleeding, hefsek(O + 7)), '2026-10-28T12:00');
      expect(restarted.stage).toBe('shivaNekiim');
      expect(restarted.cleanDays[0].day).toBe(O + 8);
    });

    it('holds the cycle for a rav on a doubtful bedika', () => {
      const result = state(log(onset(), hefsek(O + 4), bedika(O + 6, 'morning', 'doubtful')), '2026-10-26T12:00');
      expect(result.stage).toBe('safek');
      expect(result.safekReason).toBe('doubtfulBedika');
    });

    it('continues the count when the rav rules to continue', () => {
      const result = state(
        log(onset(), hefsek(O + 4), bedika(O + 6, 'morning', 'doubtful'), ruling(O + 6, 'continue')),
        '2026-10-26T12:00',
      );
      expect(result.stage).toBe('shivaNekiim');
      expect(result.safekReason).toBeNull();
    });

    it('restarts the count when the rav rules to restart', () => {
      const result = state(
        log(onset(), hefsek(O + 4), bedika(O + 6, 'morning', 'doubtful'), ruling(O + 6, 'restart')),
        '2026-10-26T12:00',
      );
      expect(result.stage).toBe('awaitingHefsek');
      expect(result.hefsekEarliestDay).toBeNull();
      expect(result.hefsekDay).toBeNull();
    });

    it('holds the cycle once the first day ends without a bedika', () => {
      const result = state(log(onset(), hefsek(O + 4)), '2026-10-26T12:00');
      expect(result.stage).toBe('safek');
      expect(result.safekReason).toBe('missedFirstDayBedika');
    });

    it('does not hold the cycle when the first day had its bedika', () => {
      expect(state(log(onset(), hefsek(O + 4), bedika(O + 5, 'morning')), '2026-10-26T12:00').stage).toBe(
        'shivaNekiim',
      );
    });

    it('does not hold the cycle while the first day is still running', () => {
      expect(state(log(onset(), hefsek(O + 4)), '2026-10-25T12:00').stage).toBe('shivaNekiim');
    });

    it('holds the cycle once the seventh day ends without a bedika', () => {
      const events = log(onset(), hefsek(O + 4), bedika(O + 5, 'morning'));
      const result = state(events, '2026-10-31T20:00');
      expect(result.stage).toBe('safek');
      expect(result.safekReason).toBe('missedSeventhDayBedika');
    });
  });

  describe('immersion', () => {
    const complete = () => log(onset(), hefsek(O + 4), bedika(O + 5, 'morning'), bedika(O + 11, 'evening'));

    it('opens the tevila night after a seventh-day bedika', () => {
      const result = state(complete(), '2026-10-31T20:00');
      expect(result.stage).toBe('tevilaNight');
      expect(result.tevilaDay).toBe(O + 12);
      expect(result.tevilaDeferred).toBe(false);
    });

    it('waits for the next night when the day after the seventh is already running', () => {
      const result = state(complete(), '2026-11-01T12:00');
      expect(result.stage).toBe('awaitingTevila');
      expect(result.tevilaDay).toBe(O + 13);
    });

    it('opens the following night when it comes', () => {
      const result = state(complete(), '2026-11-01T22:00');
      expect(result.stage).toBe('tevilaNight');
      expect(result.tevilaDay).toBe(O + 13);
    });

    it('does not call a night after a missed first night deferred', () => {
      expect(state(complete(), '2026-11-01T12:00').tevilaDeferred).toBe(false);
      expect(state(complete(), '2026-11-01T22:00').tevilaDeferred).toBe(false);
    });

    it('is tahor once the tevila is recorded', () => {
      const result = state(
        log(onset(), hefsek(O + 4), bedika(O + 5, 'morning'), bedika(O + 11, 'evening'), tevila(O + 12)),
        '2026-11-05T12:00',
      );
      expect(result.stage).toBe('tahor');
      expect(result.tevilaDay).toBe(O + 12);
    });
  });

  describe('a tevila night that falls on a fast', () => {
    const H = absOf(2026, 9, 13);
    const events = () =>
      log(onset(H - 4), hefsek(H), ...Array.from({ length: 7 }, (_, i) => bedika(H + i + 1, 'morning')));

    it('defers the first night past Yom Kippur while the seven days run', () => {
      const result = state(events(), '2026-09-19T12:00');
      expect(result.stage).toBe('shivaNekiim');
      expect(result.tevilaDay).toBe(absOf(2026, 9, 22));
      expect(result.tevilaDeferred).toBe(true);
    });

    it('offers no immersion on the night of Yom Kippur', () => {
      const result = state(events(), '2026-09-20T20:00');
      expect(result.stage).toBe('awaitingTevila');
      expect(result.tevilaDay).toBe(absOf(2026, 9, 22));
    });

    it('opens the night after Yom Kippur', () => {
      const result = state(events(), '2026-09-21T20:00');
      expect(result.stage).toBe('tevilaNight');
      expect(result.tevilaDay).toBe(absOf(2026, 9, 22));
    });

    it('keeps the deferral from the fast night through the night after it, and drops it once that night passes', () => {
      expect(state(events(), '2026-09-20T20:00').tevilaDeferred).toBe(true);
      expect(state(events(), '2026-09-21T12:00').tevilaDeferred).toBe(true);
      expect(state(events(), '2026-09-21T20:00').tevilaDeferred).toBe(true);
      expect(state(events(), '2026-09-22T12:00').tevilaDeferred).toBe(false);
    });
  });

  describe('a pause', () => {
    it('pauses the cycle for the reason given', () => {
      const result = state(log(onset(), { type: 'pause', day: O + 2, reason: 'pregnancy' }), '2026-10-25T12:00');
      expect(result.stage).toBe('paused');
      expect(result.pauseReason).toBe('pregnancy');
    });

    it('drops the old cycle on resume', () => {
      const events = log(onset(), { type: 'pause', day: O + 2, reason: 'pregnancy' }, { type: 'resume', day: O + 100 });
      const result = state(events, '2026-10-25T12:00');
      expect(result.stage).toBe('unknown');
      expect(result.onset).toBeNull();
      expect(result.pauseReason).toBeNull();
    });

    it('starts a new cycle from the first onset after the resume', () => {
      const events = log(
        onset(),
        { type: 'pause', day: O + 2, reason: 'pregnancy' },
        { type: 'resume', day: O + 100 },
        onset(O + 120),
      );
      const result = deriveCycle(events, ASHKENAZ, JERUSALEM, civilNoon(O + 121));
      expect(result.stage).toBe('niddah');
      expect(result.onset).toEqual({ abs: O + 120, kind: 'day' });
    });
  });

  describe('event order', () => {
    it('sorts by the day an event belongs to, then by when it was recorded', () => {
      const events = log(onset(), hefsek(O + 4), bedika(O + 7, 'evening', 'notClean'), hefsek(O + 7));
      expect(sortedEvents([...events].reverse()).map((e) => e.id)).toEqual(events.map((e) => e.id));
      expect(sortedEvents(events).map((e) => e.id)).toEqual(['e1', 'e2', 'e3', 'e4']);
    });

    it('derives the same state whatever order the events arrive in', () => {
      const events = log(
        onset(),
        hefsek(O + 4),
        bedika(O + 5, 'morning'),
        bedika(O + 7, 'evening', 'notClean'),
        hefsek(O + 7),
      );
      const expected = state(events, '2026-10-28T12:00');
      expect(expected.stage).toBe('shivaNekiim');
      expect(state([...events].reverse(), '2026-10-28T12:00')).toEqual(expected);
      expect(state([events[4], events[0], events[3], events[2], events[1]], '2026-10-28T12:00')).toEqual(expected);
    });

    it('lists the hefsek before the onset without changing the outcome', () => {
      const events = log(onset(), hefsek(O + 4));
      expect(state([events[1], events[0]], '2026-10-25T12:00')).toEqual(state(events, '2026-10-25T12:00'));
    });

    it('files a doubtful onset under the next day', () => {
      const plain = log(onset(O))[0];
      const doubtful = log(onset(O, 'day', true))[0];
      expect(eventDay(plain)).toBe(O);
      expect(eventDay(doubtful)).toBe(O + 1);
      expect(eventDay(log(hefsek(O + 4))[0])).toBe(O + 4);
      expect(onsetCountDay(doubtful as Extract<TaharahEvent, { type: 'onset' }>)).toBe(O + 1);
      expect(onsetCountDay(plain as Extract<TaharahEvent, { type: 'onset' }>)).toBe(O);
    });
  });

  describe('cleanDayIndex', () => {
    it('numbers the clean days and answers null outside them', () => {
      const result = state(log(onset(), hefsek(O + 4)), '2026-10-25T12:00');
      expect(result.stage).toBe('shivaNekiim');
      expect(cleanDayIndex(result, O + 5)).toBe(1);
      expect(cleanDayIndex(result, O + 7)).toBe(3);
      expect(cleanDayIndex(result, O + 11)).toBe(7);
      expect(cleanDayIndex(result, O + 4)).toBeNull();
      expect(cleanDayIndex(result, O + 20)).toBeNull();
    });
  });

  describe('a tevila without a recorded hefsek', () => {
    // The husband records only the onset and the mikveh night; the log screen, not the engine,
    // keeps a woman from skipping the count.
    it('closes the cycle', () => {
      const result = state(log(onset(), tevila(O + 12)), '2026-11-05T12:00');
      expect(result.stage).toBe('tahor');
      expect(result.tevilaDay).toBe(O + 12);
      expect(result.hefsekDay).toBeNull();
    });
  });

  describe('a ruling to continue', () => {
    // It answers the day that was already missed, not every day still to come.
    it('settles the missed first day but not a seventh day missed later', () => {
      const events = log(onset(), hefsek(O + 4), ruling(O + 6, 'continue'));
      expect(state(events, '2026-10-26T12:00').stage).toBe('shivaNekiim');
      const atNight = state(log(...events, bedika(O + 8, 'morning')), '2026-10-31T20:00');
      expect(atNight.stage).toBe('safek');
      expect(atNight.safekReason).toBe('missedSeventhDayBedika');
    });
  });

  describe('hefsekOutcome', () => {
    const outcome = (
      events: TaharahEvent[],
      now: string,
      day: number,
      result: 'clean' | 'notClean' | 'doubtful' = 'clean',
    ) => hefsekOutcome(state(events, now), day, result);

    it('names why a hefsek would be ignored, exactly as the replay ignores it', () => {
      expect(outcome([], '2026-10-22T12:00', O + 4)).toBe('noCycle');
      expect(outcome(log(onset(), { type: 'pause', day: O + 1, reason: 'pregnancy' }), '2026-10-22T12:00', O + 4)).toBe(
        'noCycle',
      );
      expect(outcome(log(onset()), '2026-10-22T12:00', O + 3)).toBe('tooEarly');
      expect(outcome(log(onset()), '2026-10-22T12:00', O + 4, 'notClean')).toBe('notClean');
      expect(outcome(log(onset()), '2026-10-22T12:00', O + 4)).toBe('accepted');
      expect(outcome(log(onset(), hefsek(O + 4)), '2026-10-26T12:00', O + 6)).toBe('restartsCount');
      expect(
        outcome(log(onset(), hefsek(O + 4), bedika(O + 5, 'morning', 'notClean')), '2026-10-26T12:00', O + 6),
      ).toBe('accepted');
      expect(outcome(log(onset(), tevila(O + 12)), '2026-11-05T12:00', O + 14)).toBe('tahor');
    });

    it('is what the replay applies: a second hefsek inside a running count changes nothing', () => {
      const result = state(log(onset(), hefsek(O + 4), bedika(O + 5, 'morning'), hefsek(O + 6)), '2026-10-27T12:00');
      expect(result.hefsekDay).toBe(O + 4);
      expect(cleanDayIndex(result, O + 7)).toBe(3);
    });
  });

  describe('earliestTevilaNight', () => {
    it('is the night after the seventh clean day, skipping a fast night, and null before a hefsek', () => {
      expect(earliestTevilaNight(state(log(onset()), '2026-10-22T12:00'), JERUSALEM)).toBeNull();
      expect(earliestTevilaNight(state(log(onset(), hefsek(O + 4)), '2026-10-25T12:00'), JERUSALEM)).toBe(O + 12);
      const H = absOf(2026, 9, 13);
      const deferred = deriveCycle(log(onset(H - 4), hefsek(H)), ASHKENAZ, JERUSALEM, civilNoon(H + 2));
      expect(earliestTevilaNight(deferred, JERUSALEM)).toBe(absOf(2026, 9, 22));
    });
  });
});
