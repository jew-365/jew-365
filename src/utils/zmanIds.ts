// The zmanim home's hero shows, in order, and which of them the user hides (Settings → זמני הלכה, the owner's call,
// 2026-11-08). Pure, with no imports, so the user store can read it and still import no store.
export const ARC_ZMANIM = [
  'alot',
  'misheyakir',
  'netz',
  'sofShma',
  'sofTfila',
  'chatzot',
  'minchaGedola',
  'plag',
  'shkia',
  'tzeit',
  'chatzotLayla',
] as const;

export type ZmanId = (typeof ARC_ZMANIM)[number];

export const isZmanId = (value: unknown): value is ZmanId => ARC_ZMANIM.includes(value as ZmanId);

// A saved list cleaned for this build: known ids only, once each, in order; one that would hide every zman shows all.
export function hiddenZmanimOf(saved: unknown): ZmanId[] {
  if (!Array.isArray(saved)) return [];
  const hidden = ARC_ZMANIM.filter((id) => saved.includes(id));
  return hidden.length === ARC_ZMANIM.length ? [] : hidden;
}

// Hides or shows one zman; hiding the last one shown is refused (the same list comes back).
export function withZmanShown(hidden: readonly ZmanId[], id: ZmanId, shown: boolean): readonly ZmanId[] {
  if (shown) return hidden.includes(id) ? hidden.filter((x) => x !== id) : hidden;
  if (hidden.includes(id) || hidden.length + 1 >= ARC_ZMANIM.length) return hidden;
  return ARC_ZMANIM.filter((x) => x === id || hidden.includes(x));
}

// Times the app computes that the circle never shows: the carousel shows them only once the user adds them
// from the times sheet (the owner's call, 2026-11-10). Each Shema time is offered only under the other opinion,
// since the circle's sofShma already is the chosen one.
export const MORE_ZMANIM = ['minchaKetana', 'sofShmaMga', 'sofShmaGra'] as const;
export type MoreZmanId = (typeof MORE_ZMANIM)[number];
export type CarouselZmanId = ZmanId | MoreZmanId;
export const CAROUSEL_ZMANIM: readonly CarouselZmanId[] = [...ARC_ZMANIM, ...MORE_ZMANIM];

export const isMoreZmanId = (value: unknown): value is MoreZmanId => MORE_ZMANIM.includes(value as MoreZmanId);
export const isCarouselZmanId = (value: unknown): value is CarouselZmanId => isZmanId(value) || isMoreZmanId(value);

// The more times offered under the user's Shema opinion.
export const offeredMoreZmanim = (ks: 'GRA' | 'MA'): MoreZmanId[] =>
  MORE_ZMANIM.filter((id) => id !== (ks === 'MA' ? 'sofShmaMga' : 'sofShmaGra'));

// A saved list of added times cleaned for this build: known ids only, once each, in order.
export const addedZmanimOf = (saved: unknown): MoreZmanId[] =>
  Array.isArray(saved) ? MORE_ZMANIM.filter((id) => saved.includes(id)) : [];
