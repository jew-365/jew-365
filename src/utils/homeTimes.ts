// Home's times (the owner's pick of 2026-11-10, "גוון התקופה, קרוסלה חיה": round 8 of the design study
// design/lab/studies/2026-11-08-home-schedule): the hero's zmanim strip as a live carousel. Every time of the
// day is printed once: upcoming first, the period's own times (candle lighting, the Chanukah candles, the end
// of a fast) among them, tomorrow's morning after tzeit, the past last. A time that closes a window open now
// carries its progress; the most urgent one fills (the lead), the others fill when touched. Pure: no store,
// no service.
import { ARC_ZMANIM, isZmanId, type ZmanId } from './zmanIds';

export type ExtraId = 'candleLighting' | 'chanukahCandles' | 'fastEnd';
export type TimeChipKind = 'upcoming' | 'tomorrow' | 'past';
export type ChipProgress = { start: Date; end: Date };
export type TimeChip =
  | { type: 'sep'; key: 'sep-tomorrow' | 'sep-earlier' }
  | {
      type: 'time';
      key: string;
      zman: ZmanId | null;
      extra: ExtraId | null;
      at: Date;
      kind: TimeChipKind;
      pinned: boolean;
      learned: boolean;
      progress: ChipProgress | null;
    };
export type TimeChipOf<T extends TimeChip['type']> = Extract<TimeChip, { type: T }>;

export type TimesInput = {
  now: Date;
  // Today's zmanim, the hidden ones already left out.
  zmanim: readonly { id: ZmanId; at: Date }[];
  // The period's times, each with the start its progress counts from (none: no progress).
  extras: readonly { id: ExtraId; at: Date; from: Date | null }[];
  // Tomorrow's morning, given once tonight has begun.
  tomorrow: readonly { id: ZmanId; at: Date }[] | null;
  // The windows of the user's mitzvot open now and not marked: a zman equal to one's end carries its progress.
  openWindows: readonly ChipProgress[];
  pins: readonly ZmanId[];
  learned: ZmanId | null;
};

// The zmanim of tomorrow's morning shown after tzeit.
export const TOMORROW_ZMANIM: readonly ZmanId[] = ['misheyakir', 'netz', 'sofShma', 'sofTfila'];
// A zman closes a window when the two are within this much of each other (both are floored to the minute).
const SAME_TIME_MS = 60 * 1000;
// The least share a running chip shows, so a window just opened is still seen to run.
const MIN_SHARE = 0.03;

export function progressShare(progress: ChipProgress, now: Date): number {
  const span = progress.end.getTime() - progress.start.getTime();
  if (span <= 0) return 1;
  return Math.max(MIN_SHARE, Math.min(1, (now.getTime() - progress.start.getTime()) / span));
}

export function timeChips(input: TimesInput): { chips: TimeChip[]; lead: string | null } {
  const t = input.now.getTime();
  const running = (at: Date): ChipProgress | null => {
    const window = input.openWindows.find(
      (w) => w.start.getTime() <= t && Math.abs(w.end.getTime() - at.getTime()) < SAME_TIME_MS,
    );
    return window && at.getTime() > t ? { start: window.start, end: at } : null;
  };
  const day: TimeChipOf<'time'>[] = [
    ...input.zmanim.map((z) => ({
      type: 'time' as const,
      key: z.id,
      zman: z.id,
      extra: null,
      at: z.at,
      kind: (z.at.getTime() > t ? 'upcoming' : 'past') as TimeChipKind,
      pinned: input.pins.includes(z.id),
      learned: input.learned === z.id,
      progress: running(z.at),
    })),
    ...input.extras.map((x) => ({
      type: 'time' as const,
      key: x.id,
      zman: null,
      extra: x.id,
      at: x.at,
      kind: (x.at.getTime() > t ? 'upcoming' : 'past') as TimeChipKind,
      pinned: false,
      learned: false,
      progress: x.from && x.from.getTime() <= t && x.at.getTime() > t ? { start: x.from, end: x.at } : null,
    })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());
  const upcoming = day.filter((c) => c.kind === 'upcoming');
  const past = day.filter((c) => c.kind === 'past');
  const tomorrow: TimeChipOf<'time'>[] = (input.tomorrow ?? [])
    .filter((z) => TOMORROW_ZMANIM.includes(z.id))
    .map((z) => ({
      type: 'time',
      key: 'tomorrow-' + z.id,
      zman: z.id,
      extra: null,
      at: z.at,
      kind: 'tomorrow',
      pinned: input.pins.includes(z.id),
      learned: false,
      progress: null,
    }));
  const chips: TimeChip[] = [...upcoming];
  if (tomorrow.length) chips.push({ type: 'sep', key: 'sep-tomorrow' }, ...tomorrow);
  if (past.length) chips.push({ type: 'sep', key: 'sep-earlier' }, ...past);
  const lead = upcoming.find((c) => c.progress) ?? null;
  return { chips, lead: lead ? lead.key : null };
}

// Pins suggested from the mitzvot the user keeps, each with the reason it is suggested.
export function suggestedPins(enabled: ReadonlySet<string>): { id: ZmanId; reason: string }[] {
  const out: { id: ZmanId; reason: string }[] = [];
  if (enabled.has('tefillin')) out.push({ id: 'misheyakir', reason: 'tefillin' });
  if (enabled.has('krias_shma_al_hamita') || enabled.has('maariv')) out.push({ id: 'chatzotLayla', reason: 'night' });
  if (enabled.has('mincha')) out.push({ id: 'plag', reason: 'mincha' });
  return out;
}

export const zmanPinsOf = (saved: unknown): ZmanId[] =>
  Array.isArray(saved) ? ARC_ZMANIM.filter((id) => saved.some((x) => isZmanId(x) && x === id)) : [];

// The card's colour: the day's kind first, else the part of the day.
export type PeriodTone =
  'dawn' | 'morning' | 'noon' | 'evening' | 'night' | 'shabbat' | 'chanukah' | 'fast' | 'roshChodesh';
export function periodTone(
  now: Date,
  z: { netz: Date; chatzot: Date; plag: Date; tzeit: Date },
  day: { erev: boolean; chanukah: boolean; fast: boolean; roshChodesh: boolean },
): PeriodTone {
  if (day.erev) return 'shabbat';
  if (day.chanukah) return 'chanukah';
  if (day.fast) return 'fast';
  if (day.roshChodesh) return 'roshChodesh';
  const t = now.getTime();
  if (t < z.netz.getTime()) return 'dawn';
  if (t < z.chatzot.getTime()) return 'morning';
  if (t < z.plag.getTime()) return 'noon';
  if (t < z.tzeit.getTime()) return 'evening';
  return 'night';
}

// What the user's marks teach: how many of the recent marks came after a time (Shacharit after the end of the
// Shema, Mincha after plag), and the habit it makes once enough of them do.
export type MarkStat = { after: number; of: number };
export type Habit = { id: 'shacharitLate' | 'minchaAfterPlag'; zman: ZmanId; after: number; of: number };
export const HABIT_MIN = { shacharitLate: 3, minchaAfterPlag: 4 } as const;

export function learnedHabit(input: {
  now: Date;
  z: { alot: Date; sofShma: Date; chatzot: Date; plag: Date };
  shacharit: MarkStat;
  mincha: MarkStat;
  keeps: { shema: boolean; shacharit: boolean; mincha: boolean };
  done: { shema: boolean; mincha: boolean };
}): Habit | null {
  const t = input.now.getTime();
  const holds = (s: MarkStat, min: number) => s.after >= min && s.after * 2 > s.of;
  if (
    input.keeps.shema &&
    input.keeps.shacharit &&
    !input.done.shema &&
    t >= input.z.alot.getTime() &&
    t < input.z.sofShma.getTime() &&
    holds(input.shacharit, HABIT_MIN.shacharitLate)
  )
    return { id: 'shacharitLate', zman: 'sofShma', ...input.shacharit };
  if (
    input.keeps.mincha &&
    !input.done.mincha &&
    t >= input.z.chatzot.getTime() &&
    t < input.z.plag.getTime() &&
    holds(input.mincha, HABIT_MIN.minchaAfterPlag)
  )
    return { id: 'minchaAfterPlag', zman: 'plag', ...input.mincha };
  return null;
}

// Counts, over the given days, how many marks came after that day's time.
export function markStat(days: readonly { mark: number | undefined; after: Date | null }[]): MarkStat {
  let after = 0;
  let of = 0;
  for (const d of days) {
    if (d.mark === undefined || !d.after) continue;
    of += 1;
    if (d.mark > d.after.getTime()) after += 1;
  }
  return { after, of };
}

// The card's pages and what "mine" can show (the card itself: homeCard.ts).
export type CardPageId = 'day' | 'week' | 'mine';
export const CARD_PAGES: readonly CardPageId[] = ['day', 'week', 'mine'];
export const isCardPage = (value: unknown): value is CardPageId => CARD_PAGES.includes(value as CardPageId);

// What "mine" can show, each a fact none of the other pages prints.
export type MineFactId = 'toShabbat' | 'kiddushLevana' | 'hilula' | 'tehillim' | 'pins';
export const MINE_FACTS: readonly MineFactId[] = ['toShabbat', 'kiddushLevana', 'hilula', 'tehillim', 'pins'];
export const DEFAULT_MINE: readonly MineFactId[] = ['toShabbat', 'hilula', 'pins'];
export const MINE_MAX = 3;
export const mineFactsOf = (saved: unknown): MineFactId[] =>
  Array.isArray(saved) ? MINE_FACTS.filter((id) => saved.includes(id)).slice(0, MINE_MAX) : [...DEFAULT_MINE];
