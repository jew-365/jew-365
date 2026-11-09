import type {
  LastChance,
  ManualNag,
  Mitzvah,
  MitzvahCategory,
  NagKind,
  NagLevel,
  PerformMin,
  Reminder,
} from '@/types/mitzvah';

export type { LastChance, ManualNag, NagKind, NagLevel, PerformMin };

// The smart nag (the owner's spec of 2026-11-04, .claude/specs/smart-nag.md): a mitzvah's reminders go out once
// each, and its level adds nags once per window, inside the window's critical zone, plus the last-chance points.

export const NAG_LEVEL_IDS: readonly NagLevel[] = [1, 2, 3, 4];
export const DEFAULT_NAG_LEVEL: NagLevel = 1;

// How many nags a level puts into the critical zone (and again, sparser, after it where the kind has a tail).
export const ZONE_NAGS: Readonly<Record<NagLevel, number>> = { 1: 0, 2: 1, 3: 2, 4: 3 };

// No two notifications of one window closer than this, the reminders included (spec 2.4).
export const NAG_MIN_GAP_MIN = 10;
// The nags after the zone are an hour apart at the least (the owner's answer to Q2).
export const SPARSE_MIN_GAP_MIN = 60;

// The time to perform a mitzvah (spec 2.2, approved as Q3): prayers alone and with a minyan.
export const PERFORM_MIN: Readonly<Record<string, PerformMin>> = {
  shacharit: { alone: 20, minyan: 45 },
  mincha: { alone: 10, minyan: 20 },
  maariv: { alone: 10, minyan: 20 },
  krias_shma_shacharit: { alone: 5 },
  tefillin: { alone: 5 },
  krias_shma_al_hamita: { alone: 5 },
  chok_leyisrael: { alone: 15 },
  shnayim_mikra: { alone: 20 },
};
// A registry mitzvah the table does not name (a blessing, the Omer count, lighting candles) takes minutes.
export const DEFAULT_PERFORM_MIN = 5;
export const CUSTOM_PERFORM_MIN_DEFAULT = 10;
export const CUSTOM_PERFORM_MIN_MAX = 180;

export function performMinOf(mitzvah: Pick<Mitzvah, 'id' | 'performMin'>): PerformMin {
  return mitzvah.performMin ?? PERFORM_MIN[mitzvah.id] ?? { alone: DEFAULT_PERFORM_MIN };
}

export const validPerformMin = (value: number): boolean =>
  Number.isInteger(value) && value >= 1 && value <= CUSTOM_PERFORM_MIN_MAX;

// The critical zone of a kind of mitzvah (spec 2.3):
// - `lastThird`: the last third of the window (a bounded day mitzvah, Selichot before alot, a custom mitzvah);
// - `night`: from the window's start (nightfall) to chatzot halayla;
// - `bedtime`: the `BEDTIME_ZONE_MIN` before chatzot halayla (the bedtime Shema);
// - `firstHour`: the first hour of the window, sparse after it up to chatzot (the Chanukah candles);
// - `lastMinutes`: the last 20 minutes (candle lighting);
// - `evening`: the window's start to chatzot halayla (havdalah);
// - `nights`: nightfall to chatzot of each of the period's last three nights (Kiddush Levana);
// - `preDawn`: the last third of the window up to alot (Selichot);
// - `learning`: shkia to chatzot halayla of the learning day (Chok LeYisrael).
// Nothing but Selichot nags between chatzot halayla and alot (the owner's call, 2026-11-08): the kinds that run past
// chatzot take it as their end (`endsAtChatzot()`), and so do their last-chance points.
export type NagZoneKind =
  | 'lastThird'
  | 'night'
  | 'bedtime'
  | 'firstHour'
  | 'lastMinutes'
  | 'evening'
  | 'nights'
  | 'preDawn'
  | 'learning'
  | 'custom';

export const NAG_ZONE_KIND: Readonly<Record<string, NagZoneKind>> = {
  maariv: 'night',
  krias_shma_al_hamita: 'bedtime',
  sefirat_haomer: 'night',
  ushpizin: 'night',
  chanukah_candles: 'firstHour',
  candle_lighting: 'lastMinutes',
  havdalah: 'evening',
  kiddush_levana: 'nights',
  selichot: 'preDawn',
  chok_leyisrael: 'learning',
  shnayim_mikra: 'learning',
};

// A custom mitzvah (`custom_<…>`) has its own rule, `customNagZone()`.
export const nagZoneKindOf = (mitzvahId: string): NagZoneKind =>
  NAG_ZONE_KIND[mitzvahId] ?? (mitzvahId.startsWith('custom_') ? 'custom' : 'lastThird');

// The kinds whose zone ends before the window does and that keep nagging, an hour apart, after it.
export const hasSparseTail = (kind: NagZoneKind): boolean => kind === 'firstHour';

// The kinds whose notifications stop at chatzot halayla: their zone, tail and last-chance points end there.
export const endsAtChatzot = (kind: NagZoneKind): boolean =>
  kind === 'night' || kind === 'bedtime' || kind === 'firstHour' || kind === 'evening' || kind === 'learning';

// A kind whose zone opens after its window does, so the smart nag sends the zone's opener.
export const opensLate = (kind: NagZoneKind): boolean => kind !== 'night' && kind !== 'evening' && kind !== 'firstHour';

// The bedtime Shema's zone: the two hours before chatzot halayla.
export const BEDTIME_ZONE_MIN = 120;
// A mitzvah with one duration sends its orange this many minutes before its red (the owner's call, 2026-11-08).
export const ORANGE_LEAD_MIN = 15;
// A window whose ideal time ends at chatzot halayla still sends its red this long before its real end (at least the
// time the mitzvah takes), so the real end is never left bare (the owner's call, 2026-11-08).
export const FINAL_MARGIN_MIN = 30;

// The verb of a mitzvah's last-chance wording (`nag.verb.<key>`): "הזמן האחרון להניח", "לכתחילה לספור עד חצות".
const NAG_VERB_IDS: ReadonlySet<string> = new Set([
  'shacharit',
  'mincha',
  'maariv',
  'tefillin',
  'krias_shma_shacharit',
  'krias_shma_al_hamita',
  'birchot_hashachar',
  'sefirat_haomer',
  'chanukah_candles',
  'candle_lighting',
  'havdalah',
  'chok_leyisrael',
  'shnayim_mikra',
  'ushpizin',
  'selichot',
  'kiddush_levana',
]);
export const nagVerbKey = (mitzvahId: string): string =>
  `nag.verb.${NAG_VERB_IDS.has(mitzvahId) ? mitzvahId : 'default'}`;

// Kiddush Levana's period ends by the molad, often in daylight, so it has no last-chance point: the last
// night's nag is its last notification.
export const hasLastChance = (kind: NagZoneKind): boolean => kind !== 'nights';

export const isNagLevel = (value: unknown): value is NagLevel => NAG_LEVEL_IDS.includes(value as NagLevel);
const levelOf = (level: NagLevel | undefined): NagLevel => (isNagLevel(level) ? level : DEFAULT_NAG_LEVEL);

export type Interval = { start: Date; end: Date };

// A custom mitzvah's critical zone (the owner's call of 2026-11-04, on the smart nag's section 5): the last third of
// its hours, at most `CUSTOM_ZONE_MAX_MIN` and at least `CUSTOM_ZONE_MIN_MIN` before its last-chance point; and for
// hours that cross midnight and last no more than `CUSTOM_NIGHT_MAX_MIN`, a night mitzvah's zone instead: from the
// start to chatzot halayla (`chatzotLayla`), with the sparse tail after it.
export const CUSTOM_ZONE_MAX_MIN = 180;
export const CUSTOM_ZONE_MIN_MIN = 30;
export const CUSTOM_NIGHT_MAX_MIN = 12 * 60;

export function customNagZone(
  window: Interval,
  lastChance: Date,
  night: { crossesMidnight: boolean; chatzotLayla: Date },
): { zone: Interval[]; sparse: boolean; night?: boolean } {
  const { start, end } = window;
  const length = end.getTime() - start.getTime();
  if (night.crossesMidnight && length <= CUSTOM_NIGHT_MAX_MIN * 60_000) {
    // A night mitzvah: nothing from chatzot on, its last-chance points included.
    return { zone: [{ start, end: night.chatzotLayla }], sparse: false, night: true };
  }
  const point = lastChance.getTime();
  const third = end.getTime() - length / 3;
  const from = Math.min(Math.max(third, point - CUSTOM_ZONE_MAX_MIN * 60_000), point - CUSTOM_ZONE_MIN_MIN * 60_000);
  return { zone: [{ start: new Date(from), end: lastChance }], sparse: false };
}
export type NagTime = { at: Date; kind: NagKind; lastChance?: LastChance };

export type NagInput = {
  level: NagLevel | undefined;
  window: Interval;
  // The critical zone, one interval or several (Kiddush Levana's nights), in order.
  zone: Interval[];
  // With a sparse tail: where it ends (chatzot halayla, or the window's end); `null` for a kind without one.
  sparseUntil: Date | null;
  // The last-chance points: `alone` the red, `minyan` or `soon` the orange; `null` where there is none.
  // With `chatzot` (a window past chatzot halayla): `chatzot` the orange and `chatzotMinyan` plain, the ideal latest
  // times, which end the zone, and `alone` the red near the real end.
  lastChance: {
    alone: Date | null;
    minyan: Date | null;
    soon?: Date | null;
    chatzot?: Date | null;
    chatzotMinyan?: Date | null;
  };
  // The instants the window's reminders go out at: always kept, and a nag keeps its distance from them. The zone
  // and its tail start no earlier than the first of them, so a nag never comes before the mitzvah's own first
  // reminder (the bedtime Shema's 23:00 rather than nightfall).
  taken: readonly Date[];
  // The rules a nag passes before it counts (the quiet hours, the holy blocks): its final instant, or `null`.
  accept: (planned: Date) => Date | null;
};

const MIN = 60_000;

// The instant at `share` (0..1) of the zone's whole length, read across its intervals.
function alongZone(zone: Interval[], share: number): Date {
  const total = zone.reduce((sum, { start, end }) => sum + (end.getTime() - start.getTime()), 0);
  let left = total * share;
  for (const { start, end } of zone) {
    const length = end.getTime() - start.getTime();
    if (left <= length) return new Date(start.getTime() + left);
    left -= length;
  }
  return zone[zone.length - 1].end;
}

// The nags of one window (spec 2.2 to 2.4 and the placement of 2026-11-08), earliest first: the red and the orange,
// then the one that opens the zone, at every level, then the level's count spread evenly inside the zone (which ends
// at the red, the latest last-chance point, and opens no earlier than the first reminder; one that lands too close to
// another moves to the middle of the widest free stretch), then the same count spread after a zone with a tail, an
// hour apart at the least and before the red. Each is judged by `accept`, and one closer than `NAG_MIN_GAP_MIN` to a
// reminder or a nag already kept is dropped, in that order of priority, so a short zone sends fewer.
export function smartNagTimes(input: NagInput): NagTime[] {
  const { window, accept } = input;
  const count = ZONE_NAGS[levelOf(input.level)];
  const inWindow = (at: Date | null): at is Date =>
    at !== null && at.getTime() >= window.start.getTime() && at.getTime() <= window.end.getTime();
  const points: { planned: Date; kind: NagKind; lastChance?: LastChance }[] = [];
  const { alone, minyan, soon = null, chatzot = null, chatzotMinyan = null } = input.lastChance;
  if (inWindow(alone)) points.push({ planned: alone, kind: 'lastChance', lastChance: 'alone' });
  if (inWindow(chatzot)) {
    points.push({ planned: chatzot, kind: 'lastChance', lastChance: 'chatzot' });
    if (inWindow(chatzotMinyan))
      points.push({ planned: chatzotMinyan, kind: 'lastChance', lastChance: 'chatzotMinyan' });
  } else if (inWindow(minyan)) points.push({ planned: minyan, kind: 'lastChance', lastChance: 'minyan' });
  else if (inWindow(soon)) points.push({ planned: soon, kind: 'lastChance', lastChance: 'soon' });
  const ends = inWindow(chatzot) ? [chatzot, chatzotMinyan] : [alone, minyan];
  const latest = ends.filter(inWindow).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  const firstReminder = Math.min(...input.taken.map((at) => at.getTime()));
  const opens = Math.max(window.start.getTime(), Number.isFinite(firstReminder) ? firstReminder : -Infinity);
  const zone = input.zone
    .map(({ start, end }) => ({
      start: new Date(Math.max(start.getTime(), opens)),
      end: new Date(Math.min(end.getTime(), window.end.getTime(), latest?.getTime() ?? Infinity)),
    }))
    .filter(({ start, end }) => end.getTime() > start.getTime());
  if (zone.length && zone[0].start.getTime() > window.start.getTime()) {
    points.push({ planned: zone[0].start, kind: 'open' });
  }
  if (count && zone.length) {
    for (let k = 1; k <= count; k++) points.push({ planned: alongZone(zone, k / (count + 1)), kind: 'zone' });
  }
  const zoneEnd = input.zone.length ? input.zone[input.zone.length - 1].end : null;
  if (count && input.sparseUntil && zoneEnd) {
    const from = Math.max(zoneEnd.getTime(), opens);
    const until = Math.min(input.sparseUntil.getTime(), window.end.getTime(), latest?.getTime() ?? Infinity);
    const n = Math.max(0, Math.min(count, Math.floor((until - from) / (SPARSE_MIN_GAP_MIN * MIN)) - 1));
    for (let k = 1; k <= n; k++)
      points.push({ planned: new Date(from + ((until - from) * k) / (n + 1)), kind: 'sparse' });
  }

  const kept: number[] = input.taken.map((at) => at.getTime());
  const nags: NagTime[] = [];
  const clear = (at: number) => kept.every((other) => Math.abs(other - at) >= NAG_MIN_GAP_MIN * MIN);
  for (const { planned, kind, lastChance } of points) {
    let at = accept(planned);
    // A zone nag that lands too close to a reminder or a nag moves to the middle of the zone's widest free stretch.
    if (at && !clear(at.getTime()) && kind === 'zone') {
      const middle = widestGapMiddle(zone, kept);
      at = middle ? accept(middle) : null;
    }
    if (!at || !clear(at.getTime())) continue;
    kept.push(at.getTime());
    nags.push({ at, kind, ...(lastChance ? { lastChance } : {}) });
  }
  return nags.sort((a, b) => a.at.getTime() - b.at.getTime());
}

// The middle of the widest stretch of the zone between the instants already kept, when it leaves the gap on both sides.
function widestGapMiddle(zone: Interval[], kept: number[]): Date | null {
  let best: { from: number; to: number } | null = null;
  for (const { start, end } of zone) {
    const marks = [
      start.getTime(),
      ...kept.filter((t) => t > start.getTime() && t < end.getTime()).sort((a, b) => a - b),
      end.getTime(),
    ];
    for (let i = 1; i < marks.length; i++) {
      if (!best || marks[i] - marks[i - 1] > best.to - best.from) best = { from: marks[i - 1], to: marks[i] };
    }
  }
  if (!best || best.to - best.from < 2 * NAG_MIN_GAP_MIN * MIN) return null;
  return new Date((best.from + best.to) / 2);
}

// ---- Nags placed by hand (the timeline on the mitzvah screen, the owner's pick of 2026-11-05) ----

// The instant a hand-placed nag stands for in a window: its minutes from that edge.
export function manualNagAt(nag: ManualNag, window: Interval): Date {
  const edge = nag.anchor === 'start' ? window.start : window.end;
  return new Date(edge.getTime() + nag.offsetMin * MIN);
}

// A nag placed at `at`, kept by the window edge it is nearer to, in whole minutes, so it keeps its place against that
// edge on a day whose window is longer or shorter.
export function manualNagFor(at: Date, window: Interval, kind: NagKind, lastChance?: LastChance): ManualNag {
  const fromStart = Math.max(0, Math.round((at.getTime() - window.start.getTime()) / MIN));
  const toEnd = Math.max(0, Math.round((window.end.getTime() - at.getTime()) / MIN));
  const anchor = fromStart <= toEnd ? 'start' : 'end';
  return {
    anchor,
    offsetMin: anchor === 'start' ? fromStart : -toEnd || 0,
    kind,
    ...(lastChance ? { lastChance } : {}),
  };
}

const NAG_KINDS: readonly NagKind[] = ['open', 'zone', 'sparse', 'lastChance'];

const LAST_CHANCES: readonly LastChance[] = ['alone', 'minyan', 'soon', 'chatzot', 'chatzotMinyan'];

export const isManualNag = (value: unknown): value is ManualNag => {
  if (!value || typeof value !== 'object') return false;
  const { anchor, offsetMin, kind, lastChance } = value as Partial<ManualNag>;
  if (anchor !== 'start' && anchor !== 'end') return false;
  if (typeof offsetMin !== 'number' || !Number.isInteger(offsetMin)) return false;
  if (anchor === 'start' ? offsetMin < 0 : offsetMin > 0) return false;
  if (!NAG_KINDS.includes(kind as NagKind)) return false;
  return lastChance === undefined || LAST_CHANCES.includes(lastChance);
};

// The hand-placed nags of one window, earliest first: each inside the window and passing `accept` (the quiet hours,
// the holy blocks), one per instant. No gap rule: the user put them there.
export function manualNagTimes(
  nags: readonly ManualNag[],
  window: Interval,
  accept: (planned: Date) => Date | null,
): NagTime[] {
  const seen = new Set<number>();
  const times: NagTime[] = [];
  for (const nag of nags) {
    const planned = manualNagAt(nag, window);
    if (planned.getTime() < window.start.getTime() || planned.getTime() > window.end.getTime()) continue;
    const at = accept(planned);
    if (!at || seen.has(at.getTime())) continue;
    seen.add(at.getTime());
    times.push({ at, kind: nag.kind, ...(nag.lastChance ? { lastChance: nag.lastChance } : {}) });
  }
  return times.sort((a, b) => a.at.getTime() - b.at.getTime());
}

// The most nags a window of the mitzvah sends at `level`: its last-chance points and the level's count, twice for a
// kind with a tail. The screens print it in their per-day estimate.
export function nagsPerWindow(mitzvah: Pick<Mitzvah, 'id' | 'performMin'>, level: NagLevel | undefined): number {
  const kind = nagZoneKindOf(mitzvah.id);
  const perform = performMinOf(mitzvah);
  // The red and the orange (the minyan point, or `soon`), and the opener of a zone that starts after the window does;
  // a kind that ends at chatzot sends its ideal points there (the minyan one too) and its red near the real end.
  const points = endsAtChatzot(kind) && perform.minyan ? 3 : 2;
  const lastChance = hasLastChance(kind) && perform.alone > 0 ? points : 0;
  const opener = opensLate(kind) ? 1 : 0;
  const count = ZONE_NAGS[levelOf(level)];
  return lastChance + opener + count * (hasSparseTail(kind) ? 2 : 1);
}

// The per-day estimate the screens print: each reminder once, plus the window's nags, or the ones placed by hand.
export const remindersPerDay = (
  mitzvah: Pick<Mitzvah, 'id' | 'performMin'>,
  reminders: readonly Pick<Reminder, 'anchor'>[],
  level: NagLevel | undefined,
  manual?: readonly ManualNag[],
): number => reminders.length + (manual ? manual.length : nagsPerWindow(mitzvah, level));

// A mitzvah counted in the app's per-day estimate: one with a window on a plain weekday, not a weekly
// or seasonal one (candle lighting, Kiddush Levana, Selichot) that would inflate it.
export const countsInDayEstimate = (category: MitzvahCategory): boolean =>
  category.startsWith('daily') || category === 'learning';
