import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import type { CapabilityAction } from '@/data/capabilities';
import { useNeedsReminderDialog } from '@/hooks/useNeedsReminderDialog';
import {
  isIgnoringBatteryOptimizations,
  requestIgnoreBatteryOptimizations,
  supportsBatteryOptimizationSettings,
} from '@/services/deviceSettings';
import { offerInputAt } from '@/services/offerInput';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { afterPaint } from '@/utils/afterPaint';
import { pickOffer, type Offer } from '@/utils/offers';

// Home's one offer (spec .claude/specs/discoverability.md, C2): evaluated after the first paint and again when
// the app day, the offers or what they read change, never on the clock tick. Showing an offer for the first time
// records it, and `close()` records it as closed, accepted or declined, so it is never offered again.
export function useOffer(todayKey: string): { offer: Offer | null; close: (key: string) => void } {
  const offers = useUserStore((s) => s.discovery.offers);
  const hilulotEnabled = useUserStore((s) => s.hilulotEnabled);
  const nusach = useUserStore((s) => s.nusach);
  const firstOpenedAt = useUserStore((s) => s.firstOpenedAt);
  const activeMitzvot = useMitzvotStore((s) => s.activeMitzvot);
  const [battery, setBattery] = useState<boolean | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);

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
  }, [todayKey]);

  useEffect(() => {
    const task = afterPaint(() => {
      const next = pickOffer(offerInputAt(new Date(), battery));
      setOffer(next);
      const store = useUserStore.getState();
      if (next && !(next.key in store.discovery.offers)) store.recordOffer(next.key, { shownAt: Date.now() });
    });
    return () => task.cancel();
  }, [todayKey, offers, hilulotEnabled, nusach, firstOpenedAt, activeMitzvot, battery]);

  const close = useCallback((key: string) => {
    const store = useUserStore.getState();
    store.recordOffer(key, { shownAt: store.discovery.offers[key]?.shownAt ?? Date.now(), closedAt: Date.now() });
  }, []);

  return { offer, close };
}

// Turns a capability on in one or two taps, without a trip to Settings: home's offer and the weekly report's tip
// share it. Mitzvot and notice topics go through the at-least-one-reminder rule, whose dialog the caller renders.
export function useCapabilityAction(): { run: (action: CapabilityAction) => void; dialog: React.ReactElement } {
  const router = useRouter();
  const { setMitzvahEnabled, setNoticesEnabled, dialog } = useNeedsReminderDialog();
  const run = (action: CapabilityAction) => {
    switch (action.kind) {
      case 'mitzvot': {
        const { activeMitzvot } = useMitzvotStore.getState();
        for (const id of action.ids)
          if (!activeMitzvot[id]?.enabled) setMitzvahEnabled(id, true, () => router.push(`/mitzvah/${id}`));
        return;
      }
      case 'notices':
        setNoticesEnabled(action.topic, true, () => router.push(action.href as never));
        return;
      case 'addon':
        router.push(action.href as never);
        return;
      case 'route':
        router.push(action.href as never);
        return;
      case 'setting':
        router.push({ pathname: '/(tabs)/settings', params: { focus: action.focus } });
        return;
      case 'battery':
        requestIgnoreBatteryOptimizations().catch(() => {});
        return;
    }
  };
  return { run, dialog };
}
