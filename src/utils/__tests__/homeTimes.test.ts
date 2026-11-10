import {
  learnedHabit,
  markStat,
  pinnedAhead,
  progressShare,
  suggestedPins,
  timeChips,
  zmanPinsOf,
  type TimeChip,
  type TimesInput,
} from '../homeTimes';
import type { ZmanId } from '../zmanIds';

const at = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 12, h, m));
const ZMANIM: { id: ZmanId; at: Date }[] = [
  { id: 'alot', at: at(4, 52) },
  { id: 'netz', at: at(6, 4) },
  { id: 'sofShma', at: at(8, 40) },
  { id: 'sofTfila', at: at(9, 35) },
  { id: 'chatzot', at: at(11, 23) },
  { id: 'plag', at: at(15, 53) },
  { id: 'shkia', at: at(16, 47) },
  { id: 'tzeit', at: at(17, 1) },
];
const base = (over: Partial<TimesInput> = {}): TimesInput => ({
  now: at(8, 15),
  zmanim: ZMANIM,
  extras: [],
  tomorrow: null,
  openWindows: [],
  pins: [],
  learned: null,
  ...over,
});
const keys = (chips: TimeChip[]) => chips.map((c) => c.key);

describe('the live carousel', () => {
  it('puts the upcoming times first and the past after a separator', () => {
    const { chips } = timeChips(base());
    expect(keys(chips)).toEqual([
      'sofShma',
      'sofTfila',
      'chatzot',
      'plag',
      'shkia',
      'tzeit',
      'sep-earlier',
      'alot',
      'netz',
    ]);
  });

  it('marks a time that closes an open window with its progress, the earliest one the lead', () => {
    const { chips, lead } = timeChips(
      base({
        openWindows: [
          { start: at(6, 4), end: at(8, 40) },
          { start: at(6, 4), end: at(9, 35) },
        ],
      }),
    );
    expect(lead).toBe('sofShma');
    const running = chips.filter((c) => c.type === 'time' && c.progress).map((c) => c.key);
    expect(running).toEqual(['sofShma', 'sofTfila']);
  });

  it('places the period times among the day, with their own progress', () => {
    const { chips, lead } = timeChips(
      base({ now: at(15, 30), extras: [{ id: 'candleLighting', at: at(16, 27), from: at(15, 53) }] }),
    );
    expect(keys(chips).slice(0, 4)).toEqual(['plag', 'candleLighting', 'shkia', 'tzeit']);
    // Plag has not come yet, so candle lighting's progress has not begun: plag, the next time, fills from chatzot.
    expect(lead).toBe('plag');
    const plag = chips.find((c) => c.key === 'plag');
    expect(plag && plag.type === 'time' && plag.progress).toEqual({ start: at(11, 23), end: at(15, 53) });
    const later = timeChips(
      base({ now: at(16, 0), extras: [{ id: 'candleLighting', at: at(16, 27), from: at(15, 53) }] }),
    );
    expect(later.lead).toBe('candleLighting');
  });

  it('adds tomorrow morning after tzeit, starred where pinned', () => {
    const tomorrow = ZMANIM.map((z) => ({ id: z.id, at: new Date(z.at.getTime() + 86400000) }));
    const { chips } = timeChips(base({ now: at(20), tomorrow, pins: ['netz'] }));
    expect(keys(chips).slice(0, 3)).toEqual(['sep-tomorrow', 'tomorrow-netz', 'tomorrow-sofShma']);
    const netz = chips.find((c) => c.key === 'tomorrow-netz');
    expect(netz && netz.type === 'time' && netz.pinned).toBe(true);
  });

  it('puts the starred times first, while the lead and the next time follow the clock', () => {
    const { chips, lead, next } = timeChips(
      base({ pins: ['plag'], openWindows: [{ start: at(6, 4), end: at(8, 40) }] }),
    );
    expect(keys(chips).slice(0, 4)).toEqual(['plag', 'sofShma', 'sofTfila', 'chatzot']);
    expect(lead).toBe('sofShma');
    expect(next).toBe('sofShma');
    expect(timeChips(base({ now: at(18) })).next).toBeNull();
  });

  it('places an added time by its time, and at night leads with a starred time of tomorrow', () => {
    const { chips } = timeChips(base({ zmanim: [...ZMANIM, { id: 'minchaKetana', at: at(14, 50) }] }));
    expect(keys(chips).slice(2, 5)).toEqual(['chatzot', 'minchaKetana', 'plag']);
    const tomorrow = ZMANIM.map((z) => ({ id: z.id, at: new Date(z.at.getTime() + 86400000) }));
    const night = timeChips(base({ now: at(20), tomorrow, nextDay: tomorrow, pins: ['chatzot'] }));
    expect(keys(night.chips).slice(0, 6)).toEqual([
      'tomorrow-chatzot',
      'sep-tomorrow',
      'tomorrow-netz',
      'tomorrow-sofShma',
      'tomorrow-sofTfila',
      'sep-earlier',
    ]);
  });

  it("leads with a starred time already past today at tomorrow's time, and keeps it out of the earlier times", () => {
    const nextDay = ZMANIM.map((z) => ({ id: z.id, at: new Date(z.at.getTime() + 86400000) }));
    const { chips, next } = timeChips(base({ pins: ['alot', 'plag'], nextDay }));
    expect(keys(chips).slice(0, 3)).toEqual(['plag', 'tomorrow-alot', 'sofShma']);
    const alot = chips.find((c) => c.key === 'tomorrow-alot');
    expect(alot && alot.type === 'time' && alot.kind === 'tomorrow' && alot.pinned).toBe(true);
    expect(keys(chips)).not.toContain('alot');
    expect(next).toBe('sofShma');
    // Without tomorrow's times a starred time past today stays among the earlier ones.
    expect(keys(timeChips(base({ pins: ['alot'] })).chips)).toContain('alot');
  });

  it('pinnedAhead gives each starred time at its next time, soonest first', () => {
    const nextDay = ZMANIM.map((z) => ({ id: z.id, at: new Date(z.at.getTime() + 86400000) }));
    expect(pinnedAhead({ now: at(8, 15), pins: ['alot', 'chatzot', 'minchaKetana'], zmanim: ZMANIM, nextDay })).toEqual(
      [
        { id: 'chatzot', at: at(11, 23), tomorrow: false },
        { id: 'alot', at: new Date(at(4, 52).getTime() + 86400000), tomorrow: true },
      ],
    );
  });

  it('fills the next time from the one before it when no window of the user closes at a time, and not before alot', () => {
    const { lead, chips } = timeChips(
      base({ now: at(20), zmanim: [...ZMANIM, { id: 'chatzotLayla', at: at(22, 23) }] }),
    );
    expect(lead).toBe('chatzotLayla');
    const night = chips.find((c) => c.key === 'chatzotLayla');
    expect(night && night.type === 'time' && night.progress).toEqual({ start: at(17, 1), end: at(22, 23) });
    expect(timeChips(base({ now: at(4) })).lead).toBeNull();
  });

  it('measures a share of the window, never below a sliver', () => {
    expect(progressShare({ start: at(6), end: at(8) }, at(7))).toBe(0.5);
    expect(progressShare({ start: at(6), end: at(8) }, at(6))).toBe(0.03);
  });
});

describe('the pins', () => {
  it('suggests from the mitzvot kept and cleans what was saved', () => {
    expect(suggestedPins(new Set(['tefillin', 'mincha'])).map((s) => s.id)).toEqual(['misheyakir', 'plag']);
    expect(zmanPinsOf(['plag', 'nope', 'alot'])).toEqual(['alot', 'plag']);
    expect(zmanPinsOf('plag')).toEqual([]);
    expect(zmanPinsOf(['sofShmaGra', 'minchaKetana', 'plag'])).toEqual(['plag', 'minchaKetana', 'sofShmaGra']);
  });
});

describe('what the marks teach', () => {
  const z = { alot: at(5), sofShma: at(8, 40), chatzot: at(11), plag: at(15) };
  const keeps = { shema: true, shacharit: true, mincha: true };
  const done = { shema: false, mincha: false };
  it('counts the marks after the time', () => {
    expect(
      markStat([
        { mark: 10, after: new Date(5) },
        { mark: 1, after: new Date(5) },
        { mark: undefined, after: new Date(5) },
      ]),
    ).toEqual({ after: 1, of: 2 });
  });
  it('teaches a late Shacharit in the morning, and Mincha after plag in the afternoon', () => {
    const shacharit = { after: 3, of: 5 };
    const mincha = { after: 4, of: 6 };
    expect(learnedHabit({ now: at(7), z, shacharit, mincha, keeps, done })?.id).toBe('shacharitLate');
    expect(learnedHabit({ now: at(13), z, shacharit, mincha, keeps, done })).toEqual({
      id: 'minchaAfterPlag',
      zman: 'plag',
      after: 4,
      of: 6,
    });
    expect(learnedHabit({ now: at(7), z, shacharit: { after: 2, of: 5 }, mincha, keeps, done })).toBeNull();
    expect(learnedHabit({ now: at(7), z, shacharit, mincha, keeps, done: { ...done, shema: true } })).toBeNull();
  });
});
