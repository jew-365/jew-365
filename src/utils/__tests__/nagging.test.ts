import {
  CUSTOM_PERFORM_MIN_DEFAULT,
  DEFAULT_PERFORM_MIN,
  NAG_LEVEL_IDS,
  NAG_MIN_GAP_MIN,
  PERFORM_MIN,
  ZONE_NAGS,
  countsInDayEstimate,
  hasLastChance,
  hasSparseTail,
  isNagLevel,
  nagZoneKindOf,
  nagsPerWindow,
  performMinOf,
  remindersPerDay,
  smartNagTimes,
  validPerformMin,
  customNagZone,
  isManualNag,
  manualNagAt,
  manualNagFor,
  manualNagTimes,
  type NagInput,
} from '../nagging';

const MIN = 60_000;
// A window from 06:00 to 09:00 of a fixed day, read in minutes after 06:00.
const T0 = Date.UTC(2026, 10, 11, 6, 0);
const atMin = (minutes: number) => new Date(T0 + minutes * MIN);
const minOf = (date: Date) => (date.getTime() - T0) / MIN;
const WINDOW = { start: atMin(0), end: atMin(180) };

function input(overrides: Partial<NagInput> = {}): NagInput {
  return {
    level: 4,
    window: WINDOW,
    zone: [{ start: atMin(120), end: atMin(180) }],
    sparseUntil: null,
    lastChance: { alone: null, minyan: null },
    taken: [atMin(0)],
    accept: (planned) => planned,
    ...overrides,
  };
}

const times = (overrides: Partial<NagInput> = {}) => smartNagTimes(input(overrides)).map(({ at }) => minOf(at));

describe('the levels', () => {
  it('adds no zone nag at level 1 and one, two and three at the levels above', () => {
    expect(NAG_LEVEL_IDS).toEqual([1, 2, 3, 4]);
    expect(ZONE_NAGS).toEqual({ 1: 0, 2: 1, 3: 2, 4: 3 });
    expect(times({ level: 1 })).toEqual([]);
    expect(times({ level: 2 })).toEqual([150]);
    expect(times({ level: 3 })).toEqual([140, 160]);
    expect(times({ level: 4 })).toEqual([135, 150, 165]);
    expect(times({ level: undefined })).toEqual([]);
  });

  it('guards a level', () => {
    expect([0, 1, 4, 5, '2', null].map(isNagLevel)).toEqual([false, true, true, false, false, false]);
  });
});

describe('smartNagTimes', () => {
  it('sends the last-chance points at every level, the minyan one too', () => {
    const lastChance = { alone: atMin(160), minyan: atMin(135) };
    const nags = smartNagTimes(input({ level: 1, lastChance }));
    expect(nags.map(({ at, kind, lastChance: which }) => [minOf(at), kind, which])).toEqual([
      [135, 'lastChance', 'minyan'],
      [160, 'lastChance', 'alone'],
    ]);
  });

  it('ends the zone at the earliest last-chance point inside it', () => {
    // The zone 120-180 ends at the minyan point, 150: two nags at 130 and 140, then 150 and 170.
    const lastChance = { alone: atMin(170), minyan: atMin(150) };
    expect(times({ level: 3, lastChance })).toEqual([130, 140, 150, 170]);
  });

  it(`keeps every notification ${NAG_MIN_GAP_MIN} minutes from the reminders and the nags before it`, () => {
    // A reminder at 152 moves the zone nag at 150 (level 2) to the middle of the widest free stretch, 120-152; at 160
    // it is ten minutes away and both stay; a zone with no stretch of twenty minutes left drops it.
    expect(times({ level: 2, taken: [atMin(0), atMin(152)] })).toEqual([136]);
    expect(times({ level: 2, zone: [{ start: atMin(140), end: atMin(160) }], taken: [atMin(0), atMin(150)] })).toEqual(
      [],
    );
    expect(times({ level: 2, taken: [atMin(0), atMin(160)] })).toEqual([150]);
    // A zone of 20 minutes holds one nag of the three; the last-chance point outranks a zone nag at 9 minutes.
    expect(times({ level: 4, zone: [{ start: atMin(160), end: atMin(180) }] })).toEqual([165, 175]);
    const short = { zone: [{ start: atMin(160), end: atMin(180) }], lastChance: { alone: atMin(179), minyan: null } };
    expect(times({ level: 2, ...short })).toEqual([179]);
  });

  it('never opens the zone before the first reminder, nor sends a nag outside the window', () => {
    expect(times({ level: 2, zone: [{ start: atMin(0), end: atMin(120) }], taken: [atMin(60)] })).toEqual([90]);
    expect(times({ level: 2, zone: [{ start: atMin(170), end: atMin(240) }] })).toEqual([175]);
    expect(times({ level: 1, lastChance: { alone: atMin(-5), minyan: atMin(200) } })).toEqual([]);
  });

  it('follows a zone with a tail by the same count an hour apart at the least, before the last-chance point', () => {
    const night = {
      window: { start: atMin(0), end: atMin(600) },
      zone: [{ start: atMin(0), end: atMin(300) }],
      sparseUntil: atMin(600),
      lastChance: { alone: atMin(590), minyan: null },
    };
    // Zone nags at 75, 150 and 225; the tail 300-590 holds three, spread evenly; then the point.
    expect(times({ ...night, level: 4 })).toEqual([75, 150, 225, 372.5, 445, 517.5, 590]);
    // A tail of 100 minutes holds none: an hour between them leaves no room.
    expect(times({ ...night, level: 4, lastChance: { alone: atMin(400), minyan: null } })).toEqual([75, 150, 225, 400]);
  });

  it('spreads the count over every interval of a zone of several nights', () => {
    const zone = [
      { start: atMin(0), end: atMin(60) },
      { start: atMin(100), end: atMin(160) },
    ];
    expect(times({ level: 3, zone })).toEqual([40, 120]);
  });

  it('drops a nag the rules refuse and takes the instant they move it to', () => {
    const accept = (planned: Date) => (minOf(planned) === 150 ? null : new Date(planned.getTime() + MIN));
    expect(times({ level: 4, accept })).toEqual([136, 166]);
  });
});

describe('the mitzvot', () => {
  it('times the prayers alone and with a minyan, and the rest', () => {
    expect(PERFORM_MIN.shacharit).toEqual({ alone: 20, minyan: 45 });
    expect(PERFORM_MIN.mincha).toEqual({ alone: 10, minyan: 20 });
    expect(PERFORM_MIN.maariv).toEqual({ alone: 10, minyan: 20 });
    expect(performMinOf({ id: 'chok_leyisrael' })).toEqual({ alone: 15 });
    expect(performMinOf({ id: 'havdalah' })).toEqual({ alone: DEFAULT_PERFORM_MIN });
    expect(performMinOf({ id: 'custom_1', performMin: { alone: 30 } })).toEqual({ alone: 30 });
    expect(CUSTOM_PERFORM_MIN_DEFAULT).toBe(10);
    expect([0, 1, 180, 181, 2.5].map(validPerformMin)).toEqual([false, true, true, false, false]);
  });

  it('names each kind of critical zone', () => {
    expect(['shacharit', 'tefillin', 'custom_1'].map(nagZoneKindOf)).toEqual(['lastThird', 'lastThird', 'custom']);
    expect(['maariv', 'krias_shma_al_hamita', 'sefirat_haomer', 'ushpizin'].map(nagZoneKindOf)).toEqual([
      'night',
      'night',
      'night',
      'night',
    ]);
    expect(nagZoneKindOf('chanukah_candles')).toBe('firstHour');
    expect(nagZoneKindOf('candle_lighting')).toBe('lastMinutes');
    expect(nagZoneKindOf('havdalah')).toBe('evening');
    expect(nagZoneKindOf('kiddush_levana')).toBe('nights');
    expect(nagZoneKindOf('selichot')).toBe('preDawn');
    expect(nagZoneKindOf('chok_leyisrael')).toBe('learning');
    expect(['night', 'firstHour', 'evening', 'learning', 'lastThird'].map((k) => hasSparseTail(k as never))).toEqual([
      true,
      true,
      true,
      true,
      false,
    ]);
    expect(hasLastChance('nights')).toBe(false);
    expect(hasLastChance('lastThird')).toBe(true);
  });

  it('estimates a window: its reminders, its last-chance points and the level, twice with a tail', () => {
    const two = [{ anchor: 'start' as const }, { anchor: 'end' as const }];
    expect(nagsPerWindow({ id: 'shacharit' }, 1)).toBe(2);
    expect(nagsPerWindow({ id: 'shacharit' }, 4)).toBe(5);
    expect(nagsPerWindow({ id: 'maariv' }, 3)).toBe(6);
    expect(nagsPerWindow({ id: 'kiddush_levana' }, 2)).toBe(1);
    expect(remindersPerDay({ id: 'tefillin' }, two, 2)).toBe(4);
    expect(countsInDayEstimate('daily-morning')).toBe(true);
    expect(countsInDayEstimate('learning')).toBe(true);
    expect(countsInDayEstimate('weekly')).toBe(false);
  });
});

describe('customNagZone', () => {
  const span = (zone: { start: Date; end: Date }[]) => zone.map(({ start, end }) => [minOf(start), minOf(end)]);
  const day = { crossesMidnight: false, chatzotLayla: atMin(1000) };

  it('takes the last third of a short window, up to its last-chance point', () => {
    // 06:00-09:00, the point at 170: the third from 120.
    expect(customNagZone(WINDOW, atMin(170), day)).toEqual({
      zone: [{ start: atMin(120), end: atMin(170) }],
      sparse: false,
    });
  });

  it('keeps at most three hours before the point, and at least half an hour', () => {
    const long = { start: atMin(0), end: atMin(24 * 60) };
    expect(span(customNagZone(long, atMin(24 * 60 - 10), day).zone)).toEqual([[24 * 60 - 190, 24 * 60 - 10]]);
    const hour = { start: atMin(0), end: atMin(60) };
    expect(span(customNagZone(hour, atMin(50), day).zone)).toEqual([[20, 50]]);
  });

  it('nags hours across midnight like a night mitzvah: to chatzot, then a sparse tail', () => {
    const night = { start: atMin(0), end: atMin(240) };
    expect(customNagZone(night, atMin(230), { crossesMidnight: true, chatzotLayla: atMin(100) })).toEqual({
      zone: [{ start: atMin(0), end: atMin(100) }],
      sparse: true,
    });
    // A whole day across midnight is not a night: its last third, capped.
    const whole = { start: atMin(0), end: atMin(24 * 60) };
    expect(customNagZone(whole, atMin(24 * 60 - 10), { crossesMidnight: true, chatzotLayla: atMin(100) }).sparse).toBe(
      false,
    );
  });
});

describe('nags placed by hand', () => {
  const MIN = 60_000;
  const start = new Date('2026-11-11T12:00:00Z');
  const end = new Date('2026-11-11T16:00:00Z');
  const window = { start, end };
  const minutes = (n: number) => new Date(start.getTime() + n * MIN);

  it('keeps a nag by the edge it is nearer to, in whole minutes, and finds its instant again', () => {
    expect(manualNagFor(minutes(30.4), window, 'zone')).toEqual({ anchor: 'start', offsetMin: 30, kind: 'zone' });
    expect(manualNagFor(minutes(200), window, 'lastChance', 'alone')).toEqual({
      anchor: 'end',
      offsetMin: -40,
      kind: 'lastChance',
      lastChance: 'alone',
    });
    // The middle counts as nearer the start.
    expect(manualNagFor(minutes(120), window, 'zone').anchor).toBe('start');
    for (const n of [0, 30, 120, 200, 240]) {
      expect(manualNagAt(manualNagFor(minutes(n), window, 'zone'), window)).toEqual(minutes(n));
    }
    // Against a longer window the nag keeps its distance from its own edge.
    const longer = { start, end: new Date(end.getTime() + 60 * MIN) };
    expect(manualNagAt({ anchor: 'end', offsetMin: -40, kind: 'zone' }, longer)).toEqual(minutes(260));
  });

  it('accepts only a well-formed nag', () => {
    expect(isManualNag({ anchor: 'start', offsetMin: 0, kind: 'sparse' })).toBe(true);
    expect(isManualNag({ anchor: 'end', offsetMin: -5, kind: 'lastChance', lastChance: 'minyan' })).toBe(true);
    for (const bad of [
      null,
      'x',
      { anchor: 'clock', offsetMin: 0, kind: 'zone' },
      { anchor: 'start', offsetMin: -1, kind: 'zone' },
      { anchor: 'end', offsetMin: 1, kind: 'zone' },
      { anchor: 'start', offsetMin: 2.5, kind: 'zone' },
      { anchor: 'start', offsetMin: 5, kind: 'other' },
      { anchor: 'start', offsetMin: 5, kind: 'lastChance', lastChance: 'later' },
    ]) {
      expect(isManualNag(bad)).toBe(false);
    }
  });

  it('sends each inside the window, one per instant, earliest first, through accept', () => {
    const nags = [
      { anchor: 'end' as const, offsetMin: -20, kind: 'lastChance' as const, lastChance: 'alone' as const },
      { anchor: 'start' as const, offsetMin: 60, kind: 'zone' as const },
      { anchor: 'start' as const, offsetMin: 60, kind: 'sparse' as const },
      { anchor: 'end' as const, offsetMin: -300, kind: 'zone' as const },
      { anchor: 'start' as const, offsetMin: 90, kind: 'zone' as const },
    ];
    const accept = (at: Date) => (at.getTime() === minutes(90).getTime() ? null : at);
    expect(manualNagTimes(nags, window, accept)).toEqual([
      { at: minutes(60), kind: 'zone' },
      { at: minutes(220), kind: 'lastChance', lastChance: 'alone' },
    ]);
    // No gap rule: the user put them there.
    const close = [
      { anchor: 'start' as const, offsetMin: 60, kind: 'zone' as const },
      { anchor: 'start' as const, offsetMin: 61, kind: 'zone' as const },
    ];
    expect(manualNagTimes(close, window, (at) => at)).toHaveLength(2);
  });

  it('counts the hand-placed nags in the per-day estimate instead of the level’s', () => {
    const shacharit = { id: 'shacharit' };
    const reminders = [{ anchor: 'start' as const }, { anchor: 'end' as const }];
    expect(remindersPerDay(shacharit, reminders, 4)).toBe(2 + nagsPerWindow(shacharit, 4));
    expect(remindersPerDay(shacharit, reminders, 4, [])).toBe(2);
    expect(remindersPerDay(shacharit, reminders, 1, [{ anchor: 'start', offsetMin: 5, kind: 'zone' }])).toBe(3);
  });
});
