// The first setup's bundles step over the stores (spec .claude/specs/discoverability.md, A3 and A4): what a
// member of a bundle means for this user, whether it is ticked, and the recommended bundles applied once. The
// ticks are the stores themselves, so the detailed mitzvot list one tap away and this step never disagree.

import {
  RECOMMENDED_BUNDLES,
  bundleSelection,
  memberMitzvot,
  memberTicked,
  type Bundle,
  type BundleGender,
} from '@/data/bundles';
import type { Capability, CapabilityInput } from '@/data/capabilities';
import { canEnable, useMitzvotStore } from '@/stores/useMitzvotStore';
import { canEnableNotices, useUserStore, type NoticeTopic } from '@/stores/useUserStore';
import { setupBundlesHint } from '@/utils/discovery';

export type MemberTarget =
  { kind: 'mitzvot'; ids: readonly string[] } | { kind: 'notices'; topic: NoticeTopic } | { kind: 'want'; id: string };

// What ticking a member switches: its mitzvot this user is offered (the gender rule of `memberMitzvot()`), its
// notice topic, or, for an add-on, the wish to download it after setup. null for anything else.
export function memberTarget(cap: Capability, gender: BundleGender, input: CapabilityInput): MemberTarget | null {
  const a = cap.action;
  if (a.kind === 'mitzvot') return { kind: 'mitzvot', ids: memberMitzvot(cap, gender).filter(input.offered) };
  if (a.kind === 'notices') return { kind: 'notices', topic: a.topic };
  if (a.kind === 'addon') return { kind: 'want', id: cap.id };
  return null;
}

export function memberOn(target: MemberTarget | null, input: CapabilityInput, wants: readonly string[]): boolean {
  if (!target) return false;
  if (target.kind === 'mitzvot') return target.ids.length > 0 && target.ids.every(input.enabled);
  if (target.kind === 'notices') return input.notices[target.topic];
  return wants.includes(target.id);
}

// The members a bundle's own tick switches on: all of them, or the ones it recommends; never an add-on.
export const bundleDefaultMembers = (bundle: Bundle): readonly string[] =>
  bundle.members.filter((id) => memberTicked(bundle, id));

// The recommended bundles switched on, once per gender answer (A4): a later visit to the step keeps what the
// user chose, and a changed gender starts from that gender's recommendation again. Nothing is switched off,
// and a mitzvah or a topic that cannot be switched on (no reminder, every notice kind off) is left alone.
export function applyRecommendedBundlesOnce(gender: BundleGender, offered: (id: string) => boolean): boolean {
  const user = useUserStore.getState();
  const hint = setupBundlesHint(gender);
  if (user.discovery.hints.includes(hint)) return false;
  const { mitzvot, notices } = bundleSelection(RECOMMENDED_BUNDLES, gender, offered);
  const store = useMitzvotStore.getState();
  for (const id of mitzvot) if (canEnable(id)) store.setEnabled(id, true);
  for (const topic of notices) {
    if (!canEnableNotices(topic)) continue;
    if (topic === 'hilulot') user.setHilulotEnabled(true);
    else user.setRoshChodeshEnabled(true);
  }
  user.learnHint(hint);
  return true;
}
