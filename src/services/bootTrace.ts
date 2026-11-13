import { StorageService } from '@/services/StorageService';

// How far each launch got, written to MMKV step by step (the owner's report of 2026-11-13: sometimes the logo stays
// until the app is killed). The next launch keeps a launch that never painted, or that needed a fallback, under
// BOOT_STUCK_KEY, and Settings › About and contact prints it, so a hang names the step it stopped after and whether
// the JS thread was still running (`alive`, the last heartbeat) or blocked.
export type BootStage = 'entry' | 'modules' | 'layout' | 'ready' | 'hidden' | 'painted';
export type BootNote = 'fontsTimeout' | 'fontError';
export type BootTrace = {
  startedAt: number;
  stages: Partial<Record<BootStage, number>>;
  alive?: number;
  notes?: BootNote[];
};

export const BOOT_CURRENT_KEY = 'boot:current';
export const BOOT_STUCK_KEY = 'boot:stuck';
const BOOT_STAGES: BootStage[] = ['entry', 'modules', 'layout', 'ready', 'hidden', 'painted'];
// A layout loaded this long after the process started runs in a process a headless launch (a background task, a
// notification action) began, so its own launch starts there.
const REUSED_AFTER_MS = 10_000;
const HEARTBEAT_MS = 1000;
const HEARTBEAT_MAX_MS = 120_000;

const current = () => StorageService.get<BootTrace>(BOOT_CURRENT_KEY);

function update(change: (trace: BootTrace) => BootTrace, now: number): void {
  try {
    StorageService.set(BOOT_CURRENT_KEY, change(current() ?? { startedAt: now, stages: {} }));
  } catch {}
}

/** A UI launch that never painted, or one that needed a fallback; a headless launch (no layout) that ran is neither. */
export function bootWorthKeeping(trace: BootTrace): boolean {
  if (trace.notes?.length) return true;
  if (trace.stages.painted !== undefined) return false;
  return trace.stages.layout !== undefined || trace.stages.modules === undefined;
}

/** The first step of a process: keeps the previous launch when it is worth keeping, then starts a new one. */
export function startBootTrace(now = Date.now()): void {
  try {
    const previous = current();
    if (previous && bootWorthKeeping(previous)) StorageService.set(BOOT_STUCK_KEY, previous);
  } catch {}
  update(() => ({ startedAt: now, stages: { entry: now } }), now);
}

export function markBoot(stage: BootStage, now = Date.now()): void {
  update((trace) => {
    if (stage === 'layout' && now - trace.startedAt > REUSED_AFTER_MS)
      return { startedAt: now, stages: { layout: now } };
    return trace.stages[stage] === undefined ? { ...trace, stages: { ...trace.stages, [stage]: now } } : trace;
  }, now);
}

export function noteBoot(note: BootNote, now = Date.now()): void {
  update((trace) => (trace.notes?.includes(note) ? trace : { ...trace, notes: [...(trace.notes ?? []), note] }), now);
}

/** Writes `alive` every second until the launch has painted, for two minutes at most; returns the stop. */
export function bootHeartbeat(): () => void {
  const started = Date.now();
  const timer = setInterval(() => {
    const now = Date.now();
    if (current()?.stages.painted !== undefined || now - started > HEARTBEAT_MAX_MS) clearInterval(timer);
    else update((trace) => ({ ...trace, alive: now }), now);
  }, HEARTBEAT_MS);
  return () => clearInterval(timer);
}

export function stuckLaunch(): BootTrace | null {
  try {
    return StorageService.get<BootTrace>(BOOT_STUCK_KEY) ?? null;
  } catch {
    return null;
  }
}

/** The last step a launch reached, and the seconds from its start to that step and to its last heartbeat. */
export function bootStoppedAt(trace: BootTrace): { stage: BootStage | null; atSec: number; aliveSec: number | null } {
  const stage = [...BOOT_STAGES].reverse().find((s) => trace.stages[s] !== undefined) ?? null;
  const seconds = (at: number) => Math.round((at - trace.startedAt) / 100) / 10;
  return {
    stage,
    atSec: seconds((stage && trace.stages[stage]) ?? trace.startedAt),
    aliveSec: trace.alive === undefined ? null : seconds(trace.alive),
  };
}
