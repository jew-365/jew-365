// What the app has already taught and offered this user (spec .claude/specs/discoverability.md, B4, C2, C7).
// Pure and import-free, so the user store can clean a saved value with it.

export type OfferRecord = { shownAt: number; closedAt?: number };
export type WhatsNewState = { label: string; since: number; seen: boolean };
export type DiscoveryState = {
  // One-time hints the user has learned, by id ('dragSun').
  hints: readonly string[];
  // Each offer key, when it was first shown and when it was accepted or declined.
  offers: Readonly<Record<string, OfferRecord>>;
  // The newest what's-new label this install knows of, since when, and whether it was opened.
  whatsNew: WhatsNewState | null;
};

export const EMPTY_DISCOVERY: DiscoveryState = { hints: [], offers: {}, whatsNew: null };

const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function offerOf(v: unknown): OfferRecord | null {
  if (!isRecord(v) || !isTime(v.shownAt)) return null;
  return isTime(v.closedAt) ? { shownAt: v.shownAt, closedAt: v.closedAt } : { shownAt: v.shownAt };
}

// A saved value cleaned: unknown shapes dropped field by field, so one bad entry never loses the rest.
export function discoveryOf(saved: unknown): DiscoveryState {
  if (!isRecord(saved)) return EMPTY_DISCOVERY;
  const hints = Array.isArray(saved.hints)
    ? [...new Set(saved.hints.filter((h): h is string => typeof h === 'string' && h.length > 0))]
    : [];
  const offers: Record<string, OfferRecord> = {};
  if (isRecord(saved.offers))
    for (const [key, v] of Object.entries(saved.offers)) {
      const offer = offerOf(v);
      if (offer) offers[key] = offer;
    }
  const w = saved.whatsNew;
  const whatsNew =
    isRecord(w) && typeof w.label === 'string' && isTime(w.since) && typeof w.seen === 'boolean'
      ? { label: w.label, since: w.since, seen: w.seen }
      : null;
  return { hints, offers, whatsNew };
}

export const withHint = (d: DiscoveryState, id: string): DiscoveryState =>
  d.hints.includes(id) ? d : { ...d, hints: [...d.hints, id] };
