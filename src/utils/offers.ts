// The offers: one thing at a time the app suggests on home, picked from the user's own state and the calendar
// (spec .claude/specs/discoverability.md, C2). Pure: the caller passes everything the stores and the device
// hold, and records what was shown in `useUserStore.discovery.offers`. Words: `offer.<id>.title`,
// `offer.<id>.body` and `offer.<id>.accept` in both dictionaries.

import { HDate, months } from '@hebcal/core';
import { upcomingHilulot } from '@/data/hilulot';
import type { IconName } from '@/components/MitzvahIcon';
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

export type OfferId = 'battery' | 'tour' | 'candles' | 'omer' | 'hilulot' | 'tracking' | 'birchot' | 'learning';
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
    id: 'tour',
    icon: 'guide',
    installDay: true,
    eligible: (c) => c.installAge < TOUR_DAYS,
    action: { kind: 'route', href: { pathname: '/guide', params: { topic: 'home' } } },
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
const TIP_EXCLUDED: ReadonlySet<OfferId> = new Set(['tour', 'battery', 'tracking', 'candles']);

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
