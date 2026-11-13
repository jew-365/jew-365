import {
  BOOT_CURRENT_KEY,
  BOOT_STUCK_KEY,
  bootHeartbeat,
  bootStoppedAt,
  bootWorthKeeping,
  markBoot,
  noteBoot,
  startBootTrace,
  stuckLaunch,
  type BootTrace,
} from '@/services/bootTrace';
import { StorageService } from '@/services/StorageService';

const T0 = Date.UTC(2026, 10, 13, 7, 42);
const current = () => StorageService.get<BootTrace>(BOOT_CURRENT_KEY);

// One launch, step by step: `entry` at T0, then each named step a second apart.
function launch(stages: ('modules' | 'layout' | 'ready' | 'hidden' | 'painted')[], start = T0) {
  startBootTrace(start);
  stages.forEach((stage, i) => markBoot(stage, start + (i + 1) * 1000));
}

describe('the launch trace', () => {
  beforeEach(() => {
    StorageService.delete(BOOT_CURRENT_KEY);
    StorageService.delete(BOOT_STUCK_KEY);
  });

  it('records each step once, at the instant it was first reached', () => {
    launch(['modules', 'layout']);
    markBoot('layout', T0 + 5000);
    expect(current()).toEqual({ startedAt: T0, stages: { entry: T0, modules: T0 + 1000, layout: T0 + 2000 } });
  });

  it('keeps a launch that loaded the layout and never painted for the next one, and only that', () => {
    launch(['modules', 'layout', 'ready', 'hidden']);
    expect(stuckLaunch()).toBeNull();
    startBootTrace(T0 + 60_000);
    expect(stuckLaunch()).toEqual({
      startedAt: T0,
      stages: { entry: T0, modules: T0 + 1000, layout: T0 + 2000, ready: T0 + 3000, hidden: T0 + 4000 },
    });
    expect(current()).toEqual({ startedAt: T0 + 60_000, stages: { entry: T0 + 60_000 } });
  });

  it('keeps no painted launch and no headless one, and leaves the kept one in place', () => {
    launch(['modules', 'layout']);
    launch(['modules', 'layout', 'ready', 'hidden', 'painted'], T0 + 60_000);
    const kept = stuckLaunch();
    expect(kept?.startedAt).toBe(T0);
    launch(['modules'], T0 + 120_000);
    startBootTrace(T0 + 180_000);
    expect(stuckLaunch()).toEqual(kept);
  });

  it('keeps a launch that stopped while its modules loaded, and a painted one that needed a fallback', () => {
    expect(bootWorthKeeping({ startedAt: T0, stages: { entry: T0 } })).toBe(true);
    expect(bootWorthKeeping({ startedAt: T0, stages: { entry: T0, modules: T0 } })).toBe(false);
    expect(
      bootWorthKeeping({ startedAt: T0, stages: { entry: T0, layout: T0, painted: T0 }, notes: ['fontsTimeout'] }),
    ).toBe(true);
    expect(bootWorthKeeping({ startedAt: T0, stages: { entry: T0, layout: T0, painted: T0 } })).toBe(false);
  });

  it('starts over at the layout when a headless launch began the process long before', () => {
    launch(['modules']);
    markBoot('layout', T0 + 3_600_000);
    expect(current()).toEqual({ startedAt: T0 + 3_600_000, stages: { layout: T0 + 3_600_000 } });
  });

  it('adds each note once', () => {
    launch(['modules', 'layout']);
    noteBoot('fontsTimeout');
    noteBoot('fontsTimeout');
    noteBoot('fontError');
    expect(current()?.notes).toEqual(['fontsTimeout', 'fontError']);
  });

  it('names the last step, its second and the last heartbeat', () => {
    const trace: BootTrace = {
      startedAt: T0,
      stages: { entry: T0, layout: T0 + 1200, ready: T0 + 6040 },
      alive: T0 + 45_000,
    };
    expect(bootStoppedAt(trace)).toEqual({ stage: 'ready', atSec: 6, aliveSec: 45 });
    expect(bootStoppedAt({ startedAt: T0, stages: {} })).toEqual({ stage: null, atSec: 0, aliveSec: null });
  });

  describe('the heartbeat', () => {
    beforeEach(() => jest.useFakeTimers({ now: T0, doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'] }));
    afterEach(() => jest.useRealTimers());

    it('writes alive every second until the launch has painted', () => {
      launch(['modules', 'layout']);
      const stop = bootHeartbeat();
      jest.advanceTimersByTime(3000);
      expect(current()?.alive).toBe(T0 + 3000);
      markBoot('painted');
      jest.advanceTimersByTime(3000);
      expect(current()?.alive).toBe(T0 + 3000);
      stop();
    });

    it('stops after two minutes and when stopped', () => {
      launch(['modules', 'layout']);
      bootHeartbeat();
      jest.advanceTimersByTime(180_000);
      expect(current()?.alive).toBe(T0 + 120_000);
      const stop = bootHeartbeat();
      stop();
      jest.advanceTimersByTime(5000);
      expect(current()?.alive).toBe(T0 + 120_000);
    });
  });
});
