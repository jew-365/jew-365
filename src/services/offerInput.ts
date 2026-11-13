// The offers' input read from the stores at one instant (spec .claude/specs/discoverability.md, C2 and C6),
// shared by home's offer, the weekly report's tip and the report notice's planner, so all three judge the same
// facts. The battery exemption is the device's and async, so the caller passes it (null where unknown).

import { getAllMitzvot } from '@/data/customMitzvotAdapter';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
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
    batteryExempt,
    markedDays: Object.values(completions).filter((day) => Object.keys(day).length > 0).length,
    learningOn: all.some((m) => m.category === 'learning' && enabled(m.id)),
  };
}
