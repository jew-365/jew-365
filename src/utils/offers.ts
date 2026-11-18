// The offers: one thing at a time the app suggests on home, picked from the user's own state and the calendar
// (spec .claude/specs/discoverability.md, C2). Pure: the caller passes everything the stores and the device
// hold, and records what was shown in `useUserStore.discovery.offers`. Words: `offer.<id>.title`,
// `offer.<id>.body` and `offer.<id>.accept` in both dictionaries.

import { HDate, months } from '@hebcal/core';
import { upcomingHilulot } from '@/data/hilulot';
import type { IconName } from '@/components/MitzvahIcon';
import { RECOMMENDED_BUNDLES, bundleSelection, type BundleGender } from '@/data/bundles';
import type { CapabilityAction } from '@/data/capabilities';
import type { Location } from '@/types/zmanim';
import type { OfferRecord } from '@/utils/discovery';
import { upcomingHolyBlock } from '@/utils/homeMessages';
import { appDayKey, appDay, locationNoon } from '@/utils/locationDay';
import { quietBlockAt } from '@/utils/skipRules';
import { civilHebrewDayAt } from '@/utils/taharah/onot';

const DAY_MS = 86_400_000;
export const OFFER_SHOW_DAYS = 5;
export const OFFER_GAP_DAYS = 2;
// The tour is offered on the install's first two app days only, so an existing install never sees it.
export const TOUR_DAYS = 2;
export const LEARNING_AFTER_MARKED_DAYS = 5;
export const BIRCHOT_AFTER_MARKED_DAYS = 2;
export const SOON_DAYS = 7;
// A habit mitzvah is offered only to a user who already marks: after this many app days that hold a mark.
export const HABIT_AFTER_MARKED_DAYS = 7;

export type OfferId =
  | 'battery'
  | 'wanted'
  | 'tour'
  | 'catchUp'
  | 'profile'
  | 'taharah'
  | 'candles'
  | 'omer'
  | 'hilulot'
  | 'tracking'
  | 'birchot'
  | 'learning'
  | 'tehillim_chapter'
  | 'two_mishnayot'
  | 'learning_on_the_way'
  | 'torah_class'
  | 'daily_tzedakah'
  | 'call_parents'
  | 'gratitude'
  | 'kids_learning'
  | 'kids_story'
  | 'grandparents_call'
  | 'shabbat_prep'
  | 'daf_yomi'
  | 'mishna_yomit'
  | 'pirkei_avot'
  | 'iggeret_haramban'
  | 'visit_sick'
  | 'friend_call'
  | 'shabbat_guest'
  | 'kind_word'
  | 'child_time'
  | 'cheshbon_nefesh'
  | 'hitbodedut'
  | 'shabbat_shopping'
  | 'mikveh_erev_shabbat';
export type Offer = { id: OfferId; key: string; icon: IconName; action: CapabilityAction };

export type OfferInput = {
  now: Date;
  location: Location;
  inIsrael: boolean;
  // When this install was first opened; nothing is offered before the root layout stamps it.
  firstOpenedAt: number | null;
  offers: Readonly<Record<string, OfferRecord>>;
  enabled: (id: string) => boolean;
  offered: (id: string) => boolean;
  hilulotEnabled: boolean;
  roshChodeshEnabled: boolean;
  gender: BundleGender;
  // Whether this install ran the short setup with the goal bundles (the `newSetup` discovery hint).
  sawNewSetup: boolean;
  // The learning programs asked for in the first setup that are still not switched on (capability ids).
  wantsOpen: readonly string[];
  // The profile answers the short setup no longer asks, and the family-purity opt-in they lead to.
  maritalStatus: 'married' | 'single' | null;
  taharahOffered: boolean;
  taharahEnabled: boolean;
  // false only where the battery exemption is known to be missing (Android); null elsewhere.
  batteryExempt: boolean | null;
  // How many app days hold a mark, and whether any learning mitzvah is switched on.
  markedDays: number;
  learningOn: boolean;
};

const LEARNING_HREF = '/(tabs)/more';
const appDayIndex = (instant: Date, location: Location) => Math.round(appDay(instant, location).getTime() / DAY_MS);

type Candidate = {
  id: OfferId;
  icon: IconName;
  installDay?: true;
  key?: (ctx: Ctx) => string;
  eligible: (ctx: Ctx) => boolean;
  action: CapabilityAction;
};
type Ctx = OfferInput & { today: HDate; installAge: number };

const MISHNA_HABITS: readonly string[] = ['mishna_yomit', 'two_mishnayot'];

const HABIT_OFFERS: readonly { id: OfferId; icon: IconName; married?: true }[] = [
  { id: 'tehillim_chapter', icon: 'tehillim' },
  { id: 'two_mishnayot', icon: 'siddur' },
  { id: 'learning_on_the_way', icon: 'suitcase' },
  { id: 'torah_class', icon: 'chok' },
  { id: 'daily_tzedakah', icon: 'sparkle' },
  { id: 'call_parents', icon: 'phone' },
  { id: 'gratitude', icon: 'sun' },
  { id: 'kids_learning', icon: 'user', married: true },
  { id: 'kids_story', icon: 'night', married: true },
  { id: 'grandparents_call', icon: 'chat' },
  { id: 'shabbat_prep', icon: 'challah' },
  { id: 'daf_yomi', icon: 'chok' },
  { id: 'mishna_yomit', icon: 'siddur' },
  { id: 'pirkei_avot', icon: 'guide' },
  { id: 'iggeret_haramban', icon: 'tehillim' },
  { id: 'visit_sick', icon: 'phone' },
  { id: 'friend_call', icon: 'chat' },
  { id: 'shabbat_guest', icon: 'meals' },
  { id: 'kind_word', icon: 'rings', married: true },
  { id: 'child_time', icon: 'user', married: true },
  { id: 'cheshbon_nefesh', icon: 'night' },
  { id: 'hitbodedut', icon: 'sun' },
  { id: 'shabbat_shopping', icon: 'challah' },
  { id: 'mikveh_erev_shabbat', icon: 'waterGlass' },
];

// In priority order: a blocked delivery first (spec G1), then the tour, the seasonal and calendar offers, then
// the ones that wait for some use of the app.
const CANDIDATES: readonly Candidate[] = [
  {
    id: 'battery',
    icon: 'sliders',
    installDay: true,
    eligible: (c) => c.batteryExempt === false,
    action: { kind: 'battery' },
  },
  {
    // What the user asked for in the first setup (spec A3): a learning program needs a download and its size
    // confirmation, which live outside onboarding, so home offers them first, on the install day too.
    id: 'wanted',
    icon: 'chok',
    installDay: true,
    eligible: (c) => c.wantsOpen.length > 0,
    action: { kind: 'route', href: { pathname: '/capabilities', params: { goal: 'learning' } } },
  },
  {
    id: 'tour',
    icon: 'guide',
    installDay: true,
    eligible: (c) => c.installAge < TOUR_DAYS,
    action: { kind: 'route', href: { pathname: '/guide', params: { topic: 'home' } } },
  },
  {
    // The catch-up (spec A6): an install that never saw the short setup is offered its bundles once, while a
    // recommended one still has something off. It opens the capabilities screen; nothing changes until the
    // user confirms there.
    id: 'catchUp',
    icon: 'sparkle',
    eligible: (c) => {
      if (c.sawNewSetup) return false;
      const { mitzvot, notices } = bundleSelection(RECOMMENDED_BUNDLES, c.gender, c.offered);
      return (
        mitzvot.some((id) => !c.enabled(id)) ||
        notices.some((topic) => !(topic === 'hilulot' ? c.hilulotEnabled : c.roshChodeshEnabled))
      );
    },
    action: { kind: 'route', href: { pathname: '/capabilities', params: { bundles: '1' } } },
  },
  {
    // The questions the short setup left out (spec A2): the gender and the marital status, in Settings.
    id: 'profile',
    icon: 'user',
    eligible: (c) => c.gender === null || c.maritalStatus === null,
    action: { kind: 'route', href: { pathname: '/(tabs)/settings', params: { focus: 'gender' } } },
  },
  {
    // Family purity tracking, only for a user it is offered to (married, the gender answered), so a single
    // user never meets the topic.
    id: 'taharah',
    icon: 'calendar',
    eligible: (c) => c.taharahOffered && !c.taharahEnabled,
    action: { kind: 'route', href: { pathname: '/(tabs)/settings', params: { focus: 'taharah' } } },
  },
  {
    id: 'candles',
    icon: 'candles',
    eligible: (c) =>
      c.offered('candle_lighting') &&
      !(c.enabled('candle_lighting') && c.enabled('havdalah')) &&
      upcomingHolyBlock(c.now, c.location) !== null,
    action: { kind: 'mitzvot', ids: ['candle_lighting', 'havdalah'] },
  },
  {
    id: 'omer',
    icon: 'omer',
    // Once a year, the week before the first night of the Omer (the evening of 15 Nisan).
    key: (c) => `omer:${omerYear(c.today)}`,
    eligible: (c) => {
      if (!c.offered('sefirat_haomer') || c.enabled('sefirat_haomer')) return false;
      const days = new HDate(15, months.NISAN, omerYear(c.today)).abs() - c.today.abs();
      return days >= 0 && days <= SOON_DAYS;
    },
    action: { kind: 'mitzvot', ids: ['sefirat_haomer'] },
  },
  {
    id: 'hilulot',
    icon: 'hilula',
    eligible: (c) =>
      !c.hilulotEnabled &&
      upcomingHilulot(c.today, c.inIsrael).some(({ day }) => day.abs() - c.today.abs() <= SOON_DAYS),
    action: { kind: 'notices', topic: 'hilulot', href: '/hilulot' },
  },
  {
    id: 'tracking',
    icon: 'star',
    eligible: (c) => c.installAge >= 1 && c.markedDays >= 1,
    action: { kind: 'route', href: '/(tabs)/history' },
  },
  {
    id: 'birchot',
    icon: 'brachot',
    eligible: (c) =>
      c.offered('birchot_hashachar') && !c.enabled('birchot_hashachar') && c.markedDays >= BIRCHOT_AFTER_MARKED_DAYS,
    action: { kind: 'mitzvot', ids: ['birchot_hashachar'] },
  },
  {
    id: 'learning',
    icon: 'chok',
    eligible: (c) => !c.learningOn && c.markedDays >= LEARNING_AFTER_MARKED_DAYS,
    action: { kind: 'route', href: LEARNING_HREF },
  },
  // The habit mitzvot the user has not switched on (the owner's call, 2026-11-18), last: one at a time like every
  // offer, to a user who already marks, and those about a spouse or children only to a married user.
  ...HABIT_OFFERS.map(({ id, icon, married }): Candidate => ({
    id,
    icon,
    eligible: (c) =>
      c.offered(id) &&
      !c.enabled(id) &&
      c.markedDays >= HABIT_AFTER_MARKED_DAYS &&
      (!married || c.maritalStatus === 'married'),
    // The two Mishnah habits read a downloadable add-on, so their offer opens the mitzvah screen with its download.
    action: MISHNA_HABITS.includes(id)
      ? { kind: 'addon', addon: 'mishna', ids: [id], href: `/mitzvah/${id}` }
      : { kind: 'mitzvot', ids: [id] },
  })),
];

// The Hebrew year whose Nisan is next: this year's until its 15 Nisan has passed, else the next year's.
function omerYear(today: HDate): number {
  const year = today.getFullYear();
  return new HDate(15, months.NISAN, year).abs() >= today.abs() ? year : year + 1;
}

// A candidate as an offer with its key (a seasonal offer's key carries its year); null when it does not apply,
// unless `force` (the weekly tip, which judged the candidate itself).
function eligibleOffersFrom(c: Candidate, ctx: Ctx, force = false): (Offer & { installDay: boolean }) | null {
  if (!force && !c.eligible(ctx)) return null;
  return {
    id: c.id,
    key: c.key ? c.key(ctx) : c.id,
    icon: c.icon,
    action: c.action,
    installDay: Boolean(c.installDay),
  };
}

// The eligible offers in priority order.
const eligibleOffers = (ctx: Ctx) => CANDIDATES.flatMap((c) => eligibleOffersFrom(c, ctx) ?? []);

function contextOf(input: OfferInput): Ctx | null {
  if (input.firstOpenedAt === null) return null;
  const today = civilHebrewDayAt(locationNoon(appDay(input.now, input.location), input.location), input.location);
  const installAge =
    appDayIndex(input.now, input.location) - appDayIndex(new Date(input.firstOpenedAt), input.location);
  return { ...input, today, installAge };
}

// One offer or none (spec C2): an offer stays while it is open and eligible, for `OFFER_SHOW_DAYS` at most;
// after one ends (closed, run out, or no longer eligible) nothing new comes for `OFFER_GAP_DAYS`; each key is
// offered once; on the install's first app day only the install-day offers come; nothing inside a holy block.
export function pickOffer(input: OfferInput): Offer | null {
  const ctx = contextOf(input);
  if (!ctx || quietBlockAt(input.now, input.location)) return null;
  const eligible = eligibleOffers(ctx);
  const now = input.now.getTime();
  const latest = Object.entries(input.offers).sort((a, b) => b[1].shownAt - a[1].shownAt)[0];
  if (latest) {
    const [key, record] = latest;
    const current = eligible.find((o) => o.key === key);
    if (record.closedAt === undefined && current && now - record.shownAt < OFFER_SHOW_DAYS * DAY_MS) {
      return strip(current);
    }
    const end = record.closedAt ?? (current ? record.shownAt + OFFER_SHOW_DAYS * DAY_MS : record.shownAt);
    if (now - end < OFFER_GAP_DAYS * DAY_MS) return null;
  }
  const installDay = appDayKey(new Date(input.firstOpenedAt!), input.location) === appDayKey(input.now, input.location);
  const next = eligible.find((o) => !(o.key in input.offers) && (!installDay || o.installDay));
  return next ? strip(next) : null;
}

const strip = ({ id, key, icon, action }: Offer): Offer => ({ id, key, icon, action });

const CANDLES = CANDIDATES.find((c) => c.id === 'candles')!;
const TIP_EXCLUDED: ReadonlySet<OfferId> = new Set([
  'tour',
  'battery',
  'wanted',
  'catchUp',
  'profile',
  'taharah',
  'tracking',
  'candles',
]);

// The weekly report's tip (spec C6): the first offer that still applies whatever the day, never one the user
// already closed, and never the tour, the battery or the Tracking tab (the tip is about next week's mitzvot and
// calendar, and the report is the tracking itself).
export function weeklyTip(input: OfferInput): Offer | null {
  const ctx = contextOf(input);
  if (!ctx) return null;
  const tip = CANDIDATES.filter((c) => !TIP_EXCLUDED.has(c.id)).find((c) => {
    const key = c.key ? c.key(ctx) : c.id;
    return input.offers[key]?.closedAt === undefined && c.eligible(ctx);
  });
  // Candle lighting and havdalah are offered on the report, which goes out at motzaei Shabbat, whenever off.
  const candles =
    ctx.offered('candle_lighting') &&
    !(ctx.enabled('candle_lighting') && ctx.enabled('havdalah')) &&
    input.offers.candles?.closedAt === undefined;
  if (candles) return strip(eligibleOffersFrom(CANDLES, ctx, true)!);
  return tip ? strip(eligibleOffersFrom(tip, ctx, true)!) : null;
}

export const HUB_OFFERS_MAX = 3;

// The More tab's "worth trying" strip (spec C5): up to three offers that apply now and that the user has not
// closed, in priority order, whatever home's one-at-a-time pacing says; the user came here to explore. Never
// the tour, which is home's, and nothing inside a holy block or before the install is stamped.
export function hubOffers(input: OfferInput, max = HUB_OFFERS_MAX): Offer[] {
  const ctx = contextOf(input);
  if (!ctx || quietBlockAt(input.now, input.location)) return [];
  return eligibleOffers(ctx)
    .filter((o) => o.id !== 'tour' && input.offers[o.key]?.closedAt === undefined)
    .slice(0, max)
    .map(strip);
}
