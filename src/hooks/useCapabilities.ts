import { useEffect, useMemo, useState } from 'react';
import { capabilityState, type Capability, type CapabilityInput, type CapabilityState } from '@/data/capabilities';
import { capabilityInputNow } from '@/services/capabilityInput';
import { isIgnoringBatteryOptimizations, supportsBatteryOptimizationSettings } from '@/services/deviceSettings';
import { useChokStore } from '@/stores/useChokStore';
import { HALACHA_STORES } from '@/stores/useHalachaStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { useShnayimStore } from '@/stores/useShnayimStore';
import { useUserStore } from '@/stores/useUserStore';
import { afterPaint } from '@/utils/afterPaint';

// Whether Android exempts the app from battery optimisation: read after the paint and again whenever `key`
// changes (an app day, a return to the screen); null where the device has no such setting or it is not read yet.
export function useBatteryExempt(key: unknown): boolean | null {
  const [battery, setBattery] = useState<boolean | null>(null);
  useEffect(() => {
    if (!supportsBatteryOptimizationSettings()) return;
    let live = true;
    const task = afterPaint(() => {
      isIgnoringBatteryOptimizations()
        .then((exempt) => live && setBattery(exempt))
        .catch(() => {});
    });
    return () => {
      live = false;
      task.cancel();
    };
  }, [key]);
  return battery;
}

const installedOf = (s: { installed: unknown }) => s.installed !== null;

// The state of every capability for this user (spec .claude/specs/discoverability.md, C4 and C5), recomputed
// when a store it reads changes: the mitzvot switches, the profile, the notice topics, the settings and each
// add-on's install. The capabilities screen and the More tab share it.
export function useCapabilityStates(batteryKey: unknown = 0): {
  input: CapabilityInput;
  stateOf: (cap: Capability) => CapabilityState;
} {
  const battery = useBatteryExempt(batteryKey);
  const activeMitzvot = useMitzvotStore((s) => s.activeMitzvot);
  const nusach = useUserStore((s) => s.nusach);
  const gender = useUserStore((s) => s.gender);
  const halachaTrack = useUserStore((s) => s.halachaTrack);
  const hilulot = useUserStore((s) => s.hilulotEnabled);
  const roshChodesh = useUserStore((s) => s.roshChodeshEnabled);
  const weeklyReport = useUserStore((s) => s.weeklyReportEnabled);
  const quietBefore = useUserStore((s) => s.quietBefore.enabled);
  const quietAfter = useUserStore((s) => s.quietAfter.enabled);
  const chok = useChokStore(installedOf);
  const shnayim = useShnayimStore(installedOf);
  const selichot = useSelichotStore((s) => s.installed);
  const kitzur = HALACHA_STORES.kitzur(installedOf);
  const benIshChai = HALACHA_STORES.ben_ish_chai(installedOf);
  const rambam = HALACHA_STORES.rambam(installedOf);
  const chafetzChaim = HALACHA_STORES.chafetz_chaim(installedOf);
  const shemirat = HALACHA_STORES.shemirat_halashon(installedOf);
  return useMemo(() => {
    const input = capabilityInputNow(battery);
    return { input, stateOf: (cap: Capability) => capabilityState(cap, input) };
    // The stores are read at once inside; the values above are what a change of them is seen through.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    battery,
    activeMitzvot,
    nusach,
    gender,
    halachaTrack,
    hilulot,
    roshChodesh,
    weeklyReport,
    quietBefore,
    quietAfter,
    chok,
    shnayim,
    selichot,
    kitzur,
    benIshChai,
    rambam,
    chafetzChaim,
    shemirat,
  ]);
}
