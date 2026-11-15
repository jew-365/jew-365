// The goal bundles (spec .claude/specs/discoverability.md, A3 and A4; the owner's picks of 2026-11-15): five
// groups of capabilities a user switches on by goal, in the first setup and on the capabilities screen. Pure:
// a bundle names capabilities of ./capabilities.ts and holds no state. Its words are `bundle.<id>.title` and
// `bundle.<id>.caption` in both dictionaries.

import type { IconName } from '@/components/MitzvahIcon';
import { CAPABILITIES, type Capability, type CapabilityState } from './capabilities';

export type BundleId = 'prayer' | 'shabbat' | 'calendar' | 'learning' | 'birchot';
export type BundleGender = 'male' | 'female' | null;

export type Bundle = {
  id: BundleId;
  icon: IconName;
  // Capability ids, in the order they are shown.
  members: readonly string[];
  // Arrives ticked in the first setup and in the catch-up (A4).
  recommended: boolean;
  // When present, only these members are ticked with a recommended bundle; the rest are the user's to add.
  recommendedMembers?: readonly string[];
  // Its members are add-ons the user picks one by one; each needs a download, so a tick never switches them on.
  pick?: true;
};

export const BUNDLES: readonly Bundle[] = [
  { id: 'prayer', icon: 'shacharit', members: ['prayers', 'shema', 'tefillin', 'bedtimeShema'], recommended: true },
  {
    id: 'shabbat',
    icon: 'candles',
    members: ['candles', 'omer', 'chanukah', 'ushpizin', 'kiddushLevana'],
    recommended: true,
  },
  {
    id: 'calendar',
    icon: 'moon',
    members: ['roshChodesh', 'hilulot'],
    recommended: true,
    recommendedMembers: ['roshChodesh'],
  },
  {
    id: 'learning',
    icon: 'chok',
    members: ['chok', 'shnayim', 'halacha', 'lashonHara', 'shemiratHalashon'],
    recommended: false,
    pick: true,
  },
  { id: 'birchot', icon: 'brachot', members: ['birchot'], recommended: false },
];

export const findBundle = (id: string): Bundle | undefined => BUNDLES.find((b) => b.id === id);

const CAPABILITY_BY_ID = new Map(CAPABILITIES.map((c) => [c.id, c]));

// A bundle's capabilities, less those this user is not offered (`unavailable`: the nusach or the gender leaves
// every mitzvah of the capability out).
export function bundleMembers(bundle: Bundle, state: (cap: Capability) => CapabilityState): Capability[] {
  return bundle.members.flatMap((id) => {
    const cap = CAPABILITY_BY_ID.get(id);
    return cap && state(cap) !== 'unavailable' ? [cap] : [];
  });
}

// On when every member the user is offered is on; a bundle with no member offered is never on.
export function bundleOn(bundle: Bundle, state: (cap: Capability) => CapabilityState): boolean {
  const members = bundleMembers(bundle, state);
  return members.length > 0 && members.every((cap) => state(cap) === 'on');
}

// Whether a member arrives ticked when its bundle is ticked: never an add-on of a pick bundle, and only the
// recommended members of a bundle that names them.
export function memberTicked(bundle: Bundle, capabilityId: string): boolean {
  if (bundle.pick || !bundle.members.includes(capabilityId)) return false;
  return !bundle.recommendedMembers || bundle.recommendedMembers.includes(capabilityId);
}

// The mitzvot a capability switches on for this gender. The owner's rule of 2026-11-15: candle lighting is
// ticked for a woman and an unanswered gender and off for a man, who still gets the pre-Shabbat notice with the
// lighting time; havdalah, the same capability's other mitzvah, is ticked for everyone, and so is the Omer.
export function memberMitzvot(cap: Capability, gender: BundleGender): readonly string[] {
  if (cap.action.kind !== 'mitzvot') return [];
  return gender === 'male' ? cap.action.ids.filter((id) => id !== 'candle_lighting') : cap.action.ids;
}

export type BundleSelection = { mitzvot: string[]; notices: ('hilulot' | 'roshChodesh')[] };

// What ticking these bundles switches on: the mitzvot the user is offered and the notice topics, add-ons left
// out. `ticked` names the bundles; a bundle's members follow `memberTicked()` and the gender rule.
export function bundleSelection(
  ticked: readonly BundleId[],
  gender: BundleGender,
  offered: (mitzvahId: string) => boolean,
): BundleSelection {
  const mitzvot: string[] = [];
  const notices: BundleSelection['notices'] = [];
  for (const bundle of BUNDLES) {
    if (!ticked.includes(bundle.id)) continue;
    for (const id of bundle.members) {
      const cap = CAPABILITY_BY_ID.get(id);
      if (!cap || !memberTicked(bundle, id)) continue;
      if (cap.action.kind === 'notices') notices.push(cap.action.topic);
      else mitzvot.push(...memberMitzvot(cap, gender).filter(offered));
    }
  }
  return { mitzvot: [...new Set(mitzvot)], notices: [...new Set(notices)] };
}

export const RECOMMENDED_BUNDLES: readonly BundleId[] = BUNDLES.filter((b) => b.recommended).map((b) => b.id);
