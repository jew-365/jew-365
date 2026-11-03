import {
  BedikaResult,
  CleanDay,
  CycleState,
  Onah,
  PauseReason,
  SafekReason,
  TaharahEvent,
  TaharahRules,
} from '@/types/taharah';
import { Location } from '@/types/zmanim';
import { currentOnah, nextTevilaNight, tevilaBlockedOnNight } from './onot';

export const CLEAN_DAYS = 7;
// The husband records no hefsek, so his tevila night is estimated from the earliest hefsek day
// and offered for this many nights before the estimate is let go.
export const HUSBAND_TEVILA_WINDOW_NIGHTS = 3;

// The Hebrew day an event belongs to, for ordering. A doubtful onset (bein hashmashot) is counted
// from the next day: the stricter reading for the hefsek wait.
export function eventDay(event: TaharahEvent): number {
  return event.type === 'onset' ? onsetCountDay(event) : event.day;
}

export function onsetCountDay(event: Extract<TaharahEvent, { type: 'onset' }>): number {
  return event.doubtful ? event.onah.abs + 1 : event.onah.abs;
}

export function sortedEvents(events: readonly TaharahEvent[]): TaharahEvent[] {
  return [...events].sort((a, b) => eventDay(a) - eventDay(b) || a.recordedAt - b.recordedAt);
}

type Cycle = {
  onsetId: string;
  onset: Onah;
  onsetDoubtful: boolean;
  countDay: number;
  restarted: boolean;
  hefsekDay: number | null;
  cleanDays: CleanDay[];
  safek: SafekReason | null;
  rulingContinueDay: number | null;
  tevilaDay: number | null;
};

// What the replay settled for one onset: the one answer to "which hefsek counted" that the vestot
// read too, so a hefsek the cycle rejected never anchors a Chabad haflaga.
export type CycleRecord = {
  onsetId: string;
  onset: Onah;
  onsetDoubtful: boolean;
  hefsekDay: number | null;
  tevilaDay: number | null;
};

export type HefsekOutcome = 'accepted' | 'noCycle' | 'tahor' | 'notClean' | 'tooEarly' | 'restartsCount';

type HefsekContext = { hasCycle: boolean; tahor: boolean; earliest: number | null; hefsekDay: number | null };

// The one rule for whether a hefsek counts, read by the replay and by the log screen's guard, so
// the screen never saves an entry the engine would ignore.
function judgeHefsek(context: HefsekContext, day: number, result: BedikaResult): HefsekOutcome {
  if (!context.hasCycle) return 'noCycle';
  if (context.tahor) return 'tahor';
  if (result !== 'clean') return 'notClean';
  if (context.earliest !== null && day < context.earliest) return 'tooEarly';
  if (context.hefsekDay !== null) return 'restartsCount';
  return 'accepted';
}

export function hefsekOutcome(state: CycleState, day: number, result: BedikaResult): HefsekOutcome {
  return judgeHefsek(
    {
      hasCycle: state.onset !== null && state.stage !== 'paused',
      tahor: state.stage === 'tahor',
      earliest: state.hefsekEarliestDay,
      hefsekDay: state.hefsekDay,
    },
    day,
    result,
  );
}

function freshCleanDays(hefsekDay: number): CleanDay[] {
  return Array.from({ length: CLEAN_DAYS }, (_, i) => ({
    index: i + 1,
    day: hefsekDay + i + 1,
    morning: null,
    evening: null,
  }));
}

function earliestHefsekDay(cycle: Cycle, rules: TaharahRules): number | null {
  return cycle.restarted ? null : cycle.countDay + rules.hefsekEarliestDay - 1;
}

function restart(cycle: Cycle): void {
  cycle.hefsekDay = null;
  cycle.cleanDays = [];
  cycle.safek = null;
  cycle.rulingContinueDay = null;
  cycle.restarted = true;
}

function hasBedika(day: CleanDay): boolean {
  return day.morning !== null || day.evening !== null;
}

type Replay = { cycles: Cycle[]; pause: PauseReason | null };

// Replays the raw events into the cycles since the last pause. Bleeding found on a bedika restarts
// the count with a new hefsek and no wait; a doubtful bedika holds the cycle for a rav until a
// ruling says to continue or restart. A pause (pregnancy, nursing, menopause) drops every cycle:
// whatever follows starts with a fresh onset. A tevila closes the cycle even without a recorded
// hefsek: the husband records only the onset and the mikveh night, and the log screen is what
// keeps a woman from skipping the count.
function replay(events: readonly TaharahEvent[], rules: TaharahRules): Replay {
  const cycles: Cycle[] = [];
  let cycle: Cycle | null = null;
  let pause: PauseReason | null = null;

  for (const event of sortedEvents(events)) {
    switch (event.type) {
      case 'pause':
        pause = event.reason;
        cycle = null;
        cycles.length = 0;
        break;
      case 'resume':
        pause = null;
        break;
      case 'onset':
        pause = null;
        cycle = {
          onsetId: event.id,
          onset: event.onah,
          onsetDoubtful: Boolean(event.doubtful),
          countDay: onsetCountDay(event),
          restarted: false,
          hefsekDay: null,
          cleanDays: [],
          safek: null,
          rulingContinueDay: null,
          tevilaDay: null,
        };
        cycles.push(cycle);
        break;
      case 'hefsek': {
        const context: HefsekContext = cycle
          ? {
              hasCycle: true,
              tahor: cycle.tevilaDay !== null,
              earliest: earliestHefsekDay(cycle, rules),
              hefsekDay: cycle.hefsekDay,
            }
          : { hasCycle: false, tahor: false, earliest: null, hefsekDay: null };
        if (!cycle || judgeHefsek(context, event.day, event.result) !== 'accepted') break;
        cycle.hefsekDay = event.day;
        cycle.cleanDays = freshCleanDays(event.day);
        cycle.safek = null;
        cycle.rulingContinueDay = null;
        break;
      }
      case 'bedika': {
        const day = cycle?.cleanDays.find((d) => d.day === event.day);
        if (!cycle || !day) break;
        day[event.slot] = event.result;
        if (event.result === 'notClean') restart(cycle);
        else if (event.result === 'doubtful') cycle.safek = 'doubtfulBedika';
        break;
      }
      case 'ruling':
        if (!cycle) break;
        if (event.decision === 'restart') restart(cycle);
        else {
          cycle.safek = null;
          cycle.rulingContinueDay = event.day;
        }
        break;
      case 'tevila':
        if (cycle) cycle.tevilaDay = event.day;
        break;
    }
  }
  return { cycles, pause };
}

export function replayCycles(events: readonly TaharahEvent[], rules: TaharahRules): CycleRecord[] {
  return replay(events, rules).cycles.map(({ onsetId, onset, onsetDoubtful, hefsekDay, tevilaDay }) => ({
    onsetId,
    onset,
    onsetDoubtful,
    hefsekDay,
    tevilaDay,
  }));
}

export function deriveCycle(
  events: readonly TaharahEvent[],
  rules: TaharahRules,
  location: Location,
  now: Date,
): CycleState {
  const { cycles, pause } = replay(events, rules);
  const cycle = cycles[cycles.length - 1] ?? null;

  const empty: CycleState = {
    stage: 'unknown',
    onset: null,
    onsetDoubtful: false,
    hefsekEarliestDay: null,
    hefsekDay: null,
    cleanDays: [],
    tevilaDay: null,
    tevilaDeferred: false,
    tevilaEstimatedDay: null,
    safekReason: null,
    pauseReason: pause,
  };
  if (pause) return { ...empty, stage: 'paused' };
  if (!cycle) return empty;

  const earliest = earliestHefsekDay(cycle, rules);
  const base: CycleState = {
    ...empty,
    onset: cycle.onset,
    onsetDoubtful: cycle.onsetDoubtful,
    hefsekEarliestDay: earliest,
    hefsekDay: cycle.hefsekDay,
    cleanDays: cycle.cleanDays,
    tevilaDay: cycle.tevilaDay,
    tevilaEstimatedDay:
      cycle.hefsekDay === null && cycle.tevilaDay === null && earliest !== null
        ? nextTevilaNight(earliest + CLEAN_DAYS + 1, location)
        : null,
  };
  const today = currentOnah(now, location);

  if (cycle.tevilaDay !== null) return { ...base, stage: 'tahor' };

  if (cycle.hefsekDay === null) {
    return { ...base, stage: earliest !== null && today.abs < earliest ? 'niddah' : 'awaitingHefsek' };
  }

  const firstTevila = cycle.hefsekDay + CLEAN_DAYS + 1;
  const [first, seventh] = [cycle.cleanDays[0], cycle.cleanDays[CLEAN_DAYS - 1]];
  // A ruling to continue settles only the days that were already missed when it was given.
  const ruled = cycle.rulingContinueDay;
  const settledByRuling = (day: CleanDay) => ruled !== null && day.day < ruled;
  if (cycle.safek === null) {
    if (today.abs > first.day && !hasBedika(first) && !settledByRuling(first)) cycle.safek = 'missedFirstDayBedika';
    else if (today.abs > seventh.day && !hasBedika(seventh) && !settledByRuling(seventh))
      cycle.safek = 'missedSeventhDayBedika';
  }
  if (cycle.safek) return { ...base, stage: 'safek', safekReason: cycle.safek };

  const scheduled = nextTevilaNight(firstTevila, location);
  if (today.abs < firstTevila) {
    return { ...base, stage: 'shivaNekiim', tevilaDay: scheduled, tevilaDeferred: scheduled !== firstTevila };
  }
  const tonight = today.kind === 'night' ? today.abs : today.abs + 1;
  const night = nextTevilaNight(tonight, location);
  const stage = today.kind === 'night' && night === today.abs ? 'tevilaNight' : 'awaitingTevila';
  return { ...base, stage, tevilaDay: night, tevilaDeferred: night === scheduled && scheduled !== firstTevila };
}

// The first night a tevila may follow the recorded hefsek, for a screen that must refuse an
// earlier entry; null before any hefsek.
export function earliestTevilaNight(state: CycleState, location: Location): number | null {
  return state.hefsekDay === null ? null : nextTevilaNight(state.hefsekDay + CLEAN_DAYS + 1, location);
}

// The night the husband's device treats as the mikveh night: the estimate, or the first allowed
// night after it, while the estimate window is open and no tevila was recorded.
export function husbandTevilaNight(state: CycleState, today: Onah, location: Location): number | null {
  const estimate = state.tevilaEstimatedDay;
  if (estimate === null || state.tevilaDay !== null) return null;
  const tonight = today.kind === 'night' ? today.abs : today.abs + 1;
  if (tonight < estimate) return null;
  const night = nextTevilaNight(tonight, location);
  return night < estimate + HUSBAND_TEVILA_WINDOW_NIGHTS ? night : null;
}

export function husbandTevilaOn(state: CycleState, nightAbs: number, location: Location): boolean {
  const estimate = state.tevilaEstimatedDay;
  if (estimate === null || state.tevilaDay !== null) return false;
  return (
    nightAbs >= estimate &&
    nightAbs < estimate + HUSBAND_TEVILA_WINDOW_NIGHTS &&
    !tevilaBlockedOnNight(nightAbs, location)
  );
}

export function cleanDayIndex(state: CycleState, abs: number): number | null {
  const day = state.cleanDays.find((d) => d.day === abs);
  return day ? day.index : null;
}
