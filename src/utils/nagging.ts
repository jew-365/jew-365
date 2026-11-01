import type { NagLevel, NagPlacement, Reminder, ReminderNag } from '@/types/mitzvah';

export type { NagLevel, NagPlacement, ReminderNag };

export const NAG_LEVEL_IDS: readonly NagLevel[] = [1, 2, 3, 4];
export const DEFAULT_NAG_LEVEL: NagLevel = 1;

// The presets (the owner's table of 2026-11-01). A preset's placement follows the reminder's anchor.
export const NAG_LEVELS: Readonly<Record<NagLevel, { count: number; everyMin: number }>> = {
  1: { count: 0, everyMin: 0 },
  2: { count: 1, everyMin: 10 },
  3: { count: 2, everyMin: 5 },
  4: { count: 3, everyMin: 5 },
};

export const NAG_MAX_COUNT = 5;
export const NAG_INTERVALS_MIN = [3, 5, 10, 15] as const;
// Every reminder of these mitzvot nags only before itself (the owner's call: the bedtime Shema).
export const BEFORE_ONLY_MITZVOT: readonly string[] = ['krias_shma_al_hamita'];

const ANY_PLACEMENT: readonly NagPlacement[] = ['before', 'after', 'around'];
const BEFORE_ONLY: readonly NagPlacement[] = ['before'];
const AFTER_ONLY: readonly NagPlacement[] = ['after'];

// The placements a reminder may take (spec 3.2.1): a repeat before a block's exit is inside the block,
// and a before-the-end reminder and the bedtime Shema send nothing after their own time.
export function nagPlacementsFor(mitzvahId: string, reminder: Pick<Reminder, 'anchor'>): readonly NagPlacement[] {
  if (reminder.anchor === 'blockExit') return AFTER_ONLY;
  if (reminder.anchor === 'end' || BEFORE_ONLY_MITZVOT.includes(mitzvahId)) return BEFORE_ONLY;
  return ANY_PLACEMENT;
}

// A level's preset goes after a reminder that allows it, else to its one placement.
export function presetPlacementFor(mitzvahId: string, reminder: Pick<Reminder, 'anchor'>): NagPlacement {
  const allowed = nagPlacementsFor(mitzvahId, reminder);
  return allowed.includes('after') ? 'after' : allowed[0];
}

export const isNagLevel = (value: unknown): value is NagLevel => NAG_LEVEL_IDS.includes(value as NagLevel);

export function isReminderNag(value: unknown): value is ReminderNag {
  if (!value || typeof value !== 'object') return false;
  const { count, everyMin, placement } = value as Partial<ReminderNag>;
  return (
    Number.isInteger(count) &&
    count! >= 1 &&
    count! <= NAG_MAX_COUNT &&
    (NAG_INTERVALS_MIN as readonly number[]).includes(everyMin as number) &&
    ANY_PLACEMENT.includes(placement as NagPlacement)
  );
}

// The nag one reminder of one mitzvah carries (spec 3.3): its own when valid (a placement it may not
// take coerced to the first it may), none for `null`, else the level's preset; `null` means no repeats.
export function nagFor(
  mitzvahId: string,
  reminder: Pick<Reminder, 'anchor' | 'nag'>,
  level: NagLevel | undefined,
): ReminderNag | null {
  if (reminder.nag === null) return null;
  const allowed = nagPlacementsFor(mitzvahId, reminder);
  if (isReminderNag(reminder.nag)) {
    return allowed.includes(reminder.nag.placement) ? reminder.nag : { ...reminder.nag, placement: allowed[0] };
  }
  const preset = NAG_LEVELS[isNagLevel(level) ? level : DEFAULT_NAG_LEVEL];
  return preset.count ? { ...preset, placement: presetPlacementFor(mitzvahId, reminder) } : null;
}

// Minutes from the main to each repeat, earliest first: repeat k (1-based) is the k-th of them.
export function repeatOffsets(nag: ReminderNag): number[] {
  const before = nag.placement === 'before' ? nag.count : nag.placement === 'around' ? Math.floor(nag.count / 2) : 0;
  return Array.from({ length: nag.count }, (_, i) => (i < before ? i - before : i - before + 1) * nag.everyMin);
}

export const repeatsPerReminder = (
  mitzvahId: string,
  reminder: Pick<Reminder, 'anchor' | 'nag'>,
  level: NagLevel | undefined,
): number => nagFor(mitzvahId, reminder, level)?.count ?? 0;

// The per-day estimate the screens print: each reminder once, plus its repeats.
export const remindersPerDay = (
  mitzvahId: string,
  reminders: readonly Pick<Reminder, 'anchor' | 'nag'>[],
  level: NagLevel | undefined,
): number => reminders.reduce((sum, reminder) => sum + 1 + repeatsPerReminder(mitzvahId, reminder, level), 0);
