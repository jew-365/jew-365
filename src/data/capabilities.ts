// What the app can do for a user, one vocabulary for the offers on home, the weekly tip, the hub and the
// capabilities screen (spec .claude/specs/discoverability.md, C1). Each entry points at something that already
// exists (mitzvot, an add-on, a notice topic, a screen, a setting); nothing here holds state of its own. Its
// words are `capability.<id>.title` and `capability.<id>.benefit` in both dictionaries.

import type { IconName } from '@/components/MitzvahIcon';
import type { HalachaBook } from '@/types/halacha';
import type { NoticeTopic } from '@/stores/useUserStore';

export type CapabilityGoal = 'prayer' | 'shabbat' | 'learning' | 'calendar' | 'tracking' | 'personal' | 'tools';
export const CAPABILITY_GOALS: readonly CapabilityGoal[] = [
  'prayer',
  'shabbat',
  'learning',
  'calendar',
  'tracking',
  'personal',
  'tools',
];

export type AddonKey = 'chok' | 'shnayim' | 'selichot' | HalachaBook;

// What turning a capability on means. `mitzvot`: switching those mitzvot on (the ones the user's nusach offers);
// `addon`: the add-on is downloaded first, then the same; `notices`: a notice topic's master switch; `setting`:
// a Settings anchor; `route`: a screen, always available; `battery`: Android's battery exemption.
export type CapabilityAction =
  | { kind: 'mitzvot'; ids: readonly string[] }
  | { kind: 'addon'; addon: AddonKey; ids: readonly string[]; href: string }
  | { kind: 'notices'; topic: NoticeTopic; href: string }
  | { kind: 'setting'; focus: 'weeklyReport' | 'quietBefore' }
  | { kind: 'route'; href: string | { pathname: string; params: Record<string, string> } }
  | { kind: 'battery' };

export type Capability = { id: string; goal: CapabilityGoal; icon: IconName; action: CapabilityAction };

const mitzvot = (...ids: string[]): CapabilityAction => ({ kind: 'mitzvot', ids });
const addon = (key: AddonKey, ids: string[], href: string): CapabilityAction => ({
  kind: 'addon',
  addon: key,
  ids,
  href,
});
const route = (href: string | { pathname: string; params: Record<string, string> }): CapabilityAction => ({
  kind: 'route',
  href,
});

export const CAPABILITIES: readonly Capability[] = [
  { id: 'prayers', goal: 'prayer', icon: 'shacharit', action: mitzvot('shacharit', 'mincha', 'maariv') },
  { id: 'shema', goal: 'prayer', icon: 'shema', action: mitzvot('krias_shma_shacharit') },
  { id: 'tefillin', goal: 'prayer', icon: 'tefillin', action: mitzvot('tefillin') },
  { id: 'birchot', goal: 'prayer', icon: 'brachot', action: mitzvot('birchot_hashachar') },
  { id: 'bedtimeShema', goal: 'prayer', icon: 'night', action: mitzvot('krias_shma_al_hamita') },
  { id: 'candles', goal: 'shabbat', icon: 'candles', action: mitzvot('candle_lighting', 'havdalah') },
  { id: 'omer', goal: 'shabbat', icon: 'omer', action: mitzvot('sefirat_haomer') },
  { id: 'chanukah', goal: 'shabbat', icon: 'chanukiah', action: mitzvot('chanukah_candles') },
  { id: 'selichot', goal: 'shabbat', icon: 'shofar', action: addon('selichot', ['selichot'], '/mitzvah/selichot') },
  { id: 'ushpizin', goal: 'shabbat', icon: 'sukkah', action: mitzvot('ushpizin') },
  { id: 'kiddushLevana', goal: 'shabbat', icon: 'moon', action: mitzvot('kiddush_levana') },
  {
    id: 'chok',
    goal: 'learning',
    icon: 'chok',
    action: addon('chok', ['chok_leyisrael'], '/mitzvah/chok_leyisrael'),
  },
  {
    id: 'shnayim',
    goal: 'learning',
    icon: 'chok',
    action: addon('shnayim', ['shnayim_mikra'], '/mitzvah/shnayim_mikra'),
  },
  {
    id: 'halacha',
    goal: 'learning',
    icon: 'general',
    // The user's track: the add-on key is resolved per user (`capabilityAddon()`).
    action: addon('kitzur', ['halacha_yomit', 'hilchot_hachag'], '/mitzvah/halacha_yomit'),
  },
  {
    id: 'lashonHara',
    goal: 'learning',
    icon: 'general',
    action: addon('chafetz_chaim', ['lashon_hara'], '/mitzvah/lashon_hara'),
  },
  {
    id: 'shemiratHalashon',
    goal: 'learning',
    icon: 'general',
    action: addon('shemirat_halashon', ['shemirat_halashon'], '/mitzvah/shemirat_halashon'),
  },
  {
    id: 'tehillim',
    goal: 'learning',
    icon: 'tehillim',
    action: route({ pathname: '/siddur/[id]', params: { id: 'tehillim' } }),
  },
  {
    id: 'roshChodesh',
    goal: 'calendar',
    icon: 'moon',
    action: { kind: 'notices', topic: 'roshChodesh', href: '/rosh-chodesh' },
  },
  { id: 'hilulot', goal: 'calendar', icon: 'hilula', action: { kind: 'notices', topic: 'hilulot', href: '/hilulot' } },
  { id: 'schedule', goal: 'calendar', icon: 'calendar', action: route('/schedule') },
  { id: 'tracking', goal: 'tracking', icon: 'star', action: route('/(tabs)/history') },
  { id: 'weeklyReport', goal: 'tracking', icon: 'night', action: { kind: 'setting', focus: 'weeklyReport' } },
  { id: 'custom', goal: 'personal', icon: 'custom', action: route('/custom-mitzvah') },
  { id: 'quietHours', goal: 'personal', icon: 'bell', action: { kind: 'setting', focus: 'quietBefore' } },
  { id: 'compass', goal: 'tools', icon: 'compass', action: route('/compass') },
  {
    id: 'hotline',
    goal: 'tools',
    icon: 'phone',
    action: route({ pathname: '/(tabs)/more', params: { open: 'halacha' } }),
  },
  { id: 'guide', goal: 'tools', icon: 'guide', action: route('/guide') },
  { id: 'battery', goal: 'tools', icon: 'sliders', action: { kind: 'battery' } },
];

export const findCapability = (id: string): Capability | undefined => CAPABILITIES.find((c) => c.id === id);

export type CapabilityState = 'on' | 'off' | 'notInstalled' | 'unavailable';

// Everything the state of a capability reads, built by the caller from the stores and the device.
export type CapabilityInput = {
  // Whether a mitzvah is switched on, and whether the user's nusach (and gender) offers it.
  enabled: (id: string) => boolean;
  offered: (id: string) => boolean;
  // Whether an add-on is installed; the halacha track is the user's (`halachaTrack`).
  installed: (addon: AddonKey) => boolean;
  halachaTrack: HalachaBook;
  notices: Readonly<Record<NoticeTopic, boolean>>;
  weeklyReport: boolean;
  quietHours: boolean;
  // null where the device has no battery exemption (iOS, web) or it could not be read.
  batteryExempt: boolean | null;
};

// The add-on a capability downloads for this user: the halacha capability reads the user's own track.
export const capabilityAddon = (cap: Capability, track: HalachaBook): AddonKey | null =>
  cap.action.kind !== 'addon' ? null : cap.id === 'halacha' ? track : cap.action.addon;

export function capabilityState(cap: Capability, input: CapabilityInput): CapabilityState {
  const a = cap.action;
  const mitzvahState = (ids: readonly string[]): CapabilityState => {
    const offered = ids.filter(input.offered);
    if (!offered.length) return 'unavailable';
    return offered.every(input.enabled) ? 'on' : 'off';
  };
  switch (a.kind) {
    case 'mitzvot':
      return mitzvahState(a.ids);
    case 'addon':
      return input.installed(capabilityAddon(cap, input.halachaTrack)!) ? mitzvahState(a.ids) : 'notInstalled';
    case 'notices':
      return input.notices[a.topic] ? 'on' : 'off';
    case 'setting':
      return (a.focus === 'weeklyReport' ? input.weeklyReport : input.quietHours) ? 'on' : 'off';
    case 'battery':
      return input.batteryExempt === null ? 'unavailable' : input.batteryExempt ? 'on' : 'off';
    case 'route':
      return 'on';
  }
}
