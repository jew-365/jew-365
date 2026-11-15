// The offers' input read from the stores at one instant (spec .claude/specs/discoverability.md, C2 and C6),
// shared by home's offer, the weekly report's tip and the report notice's planner, so all three judge the same
// facts. The battery exemption is the device's and async, so the caller passes it (null where unknown).

import { findCapability } from '@/data/capabilities';
import { getAllMitzvot } from '@/data/customMitzvotAdapter';
import { taharahOffered } from '@/stores/taharahOptIn';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { NEW_SETUP_HINT } from '@/utils/discovery';
import type { OfferInput } from '@/utils/offers';

export function offerInputAt(now: Date, batteryExempt: boolean | null = null): OfferInput {
  const user = useUserStore.getState();
  const { activeMitzvot } = useMitzvotStore.getState();
  const { completions } = useCompletionsStore.getState();
  const all = getAllMitzvot(user.nusach);
  const offered = new Set(all.map((m) => m.id));
  const enabled = (id: string) => Boolean(activeMitzvot[id]?.enabled);
  return {
    now,
    location: user.location,
    inIsrael: user.inIsrael,
    firstOpenedAt: user.firstOpenedAt,
    offers: user.discovery.offers,
    enabled,
    offered: (id) => offered.has(id),
    hilulotEnabled: user.hilulotEnabled,
    roshChodeshEnabled: user.roshChodeshEnabled,
    gender: user.gender,
    sawNewSetup: user.discovery.hints.includes(NEW_SETUP_HINT),
    wantsOpen: user.discovery.wants.filter((id) => {
      const action = findCapability(id)?.action;
      return action?.kind === 'addon' && !action.ids.filter((m) => offered.has(m)).every(enabled);
    }),
    maritalStatus: user.maritalStatus,
    taharahOffered: taharahOffered(user),
    taharahEnabled: user.taharahEnabled,
    batteryExempt,
    markedDays: Object.values(completions).filter((day) => Object.keys(day).length > 0).length,
    learningOn: all.some((m) => m.category === 'learning' && enabled(m.id)),
  };
}
