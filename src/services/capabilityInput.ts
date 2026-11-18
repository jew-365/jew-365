// The capabilities' input read from the stores at one instant (spec .claude/specs/discoverability.md, C4 and
// C5), shared by the capabilities screen and the More tab, so both show the same state for the same thing. The
// battery exemption is the device's and async, so the caller passes it (null where unknown).

import { getAllMitzvot } from '@/data/customMitzvotAdapter';
import type { AddonKey, CapabilityInput } from '@/data/capabilities';
import { hasChokContent } from '@/data/chok';
import { effectiveHalachaTrack } from '@/data/halacha';
import { hasSelichotContent } from '@/data/selichot';
import { hasShnayimContent } from '@/data/shnayim';
import { hasMishnaContent } from '@/data/mishna';
import { HALACHA_STORES } from '@/stores/useHalachaStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { isMensMitzvah } from '@/stores/taharahOptIn';
import { useUserStore } from '@/stores/useUserStore';

export function capabilityInputNow(batteryExempt: boolean | null = null): CapabilityInput {
  const user = useUserStore.getState();
  const { activeMitzvot } = useMitzvotStore.getState();
  const offered = new Set(getAllMitzvot(user.nusach).map((m) => m.id));
  const installed = (addon: AddonKey): boolean =>
    addon === 'chok'
      ? hasChokContent()
      : addon === 'shnayim'
        ? hasShnayimContent()
        : addon === 'mishna'
          ? hasMishnaContent()
          : addon === 'selichot'
            ? hasSelichotContent(user.nusach)
            : HALACHA_STORES[addon].getState().installed !== null;
  return {
    enabled: (id) => Boolean(activeMitzvot[id]?.enabled),
    // A woman is not offered the men's mitzvot (tefillin, Kiddush Levana), as the library's defaults hold.
    offered: (id) => offered.has(id) && !(user.gender === 'female' && isMensMitzvah(id)),
    installed,
    halachaTrack: effectiveHalachaTrack(user.halachaTrack, user.nusach),
    notices: { hilulot: user.hilulotEnabled, roshChodesh: user.roshChodeshEnabled },
    weeklyReport: user.weeklyReportEnabled,
    quietHours: user.quietBefore.enabled || user.quietAfter.enabled,
    batteryExempt,
  };
}
