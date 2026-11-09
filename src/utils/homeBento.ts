// Home's bento (the owner's pick of 2026-11-09, design study 2026-11-08-home-schedule, round 5; the defaults of
// each zone are the spec .claude/specs/home-bento.md): a layout of widgets on a four-column grid inside the hero,
// in place of the zmanim strip. Pure, with no store or React import.
import { ARC_ZMANIM, isZmanId, type ZmanId } from './zmanIds';

export type BentoSize = 's' | 'w' | 'b';
export type BentoWidget =
  { kind: 'next'; size: 'w' | 'b' } | { kind: 'zman'; id: ZmanId; size: BentoSize } | { kind: 'row' };

export const BENTO_COLUMNS = 4;
// At most three rows of tiles above the row, so the cards under the hero keep their room.
export const BENTO_MAX_TILE_ROWS = 3;

const SPAN: Record<BentoSize, { w: number; h: number }> = { s: { w: 1, h: 1 }, w: { w: 2, h: 1 }, b: { w: 2, h: 2 } };

export const widgetKey = (w: BentoWidget): string => (w.kind === 'zman' ? w.id : w.kind);

// The four tiles of the profile: one per daily deadline of the mitzvot the user keeps, else the zman of that hour.
export function defaultFixed(enabled: ReadonlySet<string>): ZmanId[] {
  return [
    enabled.has('krias_shma_shacharit') ? 'sofShma' : 'netz',
    enabled.has('shacharit') ? 'sofTfila' : 'chatzot',
    'shkia',
    'tzeit',
  ];
}

export function defaultBento(enabled: ReadonlySet<string>): BentoWidget[] {
  return [
    { kind: 'next', size: 'b' },
    ...defaultFixed(enabled).map((id): BentoWidget => ({ kind: 'zman', id, size: 's' })),
    { kind: 'row' },
  ];
}

// A saved layout cleaned for this build: known widgets once each, the row last. Anything else is the default.
export function bentoOf(saved: unknown, enabled: ReadonlySet<string>): BentoWidget[] {
  if (!Array.isArray(saved)) return defaultBento(enabled);
  const seen = new Set<string>();
  const out: BentoWidget[] = [];
  let row = false;
  for (const raw of saved as unknown[]) {
    if (!raw || typeof raw !== 'object') continue;
    const w = raw as Record<string, unknown>;
    let widget: BentoWidget | null = null;
    if (w.kind === 'row') row = true;
    else if (w.kind === 'next') widget = { kind: 'next', size: w.size === 'w' ? 'w' : 'b' };
    else if (w.kind === 'zman' && isZmanId(w.id))
      widget = { kind: 'zman', id: w.id, size: w.size === 'w' || w.size === 'b' ? w.size : 's' };
    if (!widget || seen.has(widgetKey(widget))) continue;
    seen.add(widgetKey(widget));
    out.push(widget);
  }
  if (row) out.push({ kind: 'row' });
  return out.length ? out : defaultBento(enabled);
}

export type BentoCell = { key: string; col: number; row: number; w: number; h: number };

// Places the tiles in order on a four-column grid, each in the first free spot that holds it (a dense pack), then
// the row across the full width under them. Columns count from the row's start, so a mirrored row needs no change.
export function packBento(widgets: readonly BentoWidget[]): { cells: BentoCell[]; tileRows: number; rows: number } {
  const taken: boolean[][] = [];
  const free = (r: number, c: number) => !taken[r]?.[c];
  const cells: BentoCell[] = [];
  let tileRows = 0;
  for (const widget of widgets) {
    if (widget.kind === 'row') continue;
    const { w, h } = SPAN[widget.size];
    let placed = false;
    for (let r = 0; !placed; r++) {
      for (let c = 0; c + w <= BENTO_COLUMNS && !placed; c++) {
        let fits = true;
        for (let dr = 0; dr < h && fits; dr++) for (let dc = 0; dc < w && fits; dc++) fits = free(r + dr, c + dc);
        if (!fits) continue;
        for (let dr = 0; dr < h; dr++) {
          taken[r + dr] = taken[r + dr] ?? [];
          for (let dc = 0; dc < w; dc++) taken[r + dr][c + dc] = true;
        }
        cells.push({ key: widgetKey(widget), col: c, row: r, w, h });
        tileRows = Math.max(tileRows, r + h);
        placed = true;
      }
    }
  }
  const hasRow = widgets.some((w) => w.kind === 'row');
  if (hasRow) cells.push({ key: 'row', col: 0, row: tileRows, w: BENTO_COLUMNS, h: 1 });
  return { cells, tileRows, rows: tileRows + (hasRow ? 1 : 0) };
}

const fits = (list: BentoWidget[]) => packBento(list).tileRows <= BENTO_MAX_TILE_ROWS;
// An edit that would pass the row limit is refused: the same list comes back.
const guarded = (before: BentoWidget[], after: BentoWidget[]) => (fits(after) ? after : before);

export function resizeWidget(list: BentoWidget[], key: string): BentoWidget[] {
  return guarded(
    list,
    list.map((w): BentoWidget => {
      if (widgetKey(w) !== key) return w;
      if (w.kind === 'next') return { ...w, size: w.size === 'b' ? 'w' : 'b' };
      if (w.kind === 'zman') return { ...w, size: w.size === 's' ? 'w' : w.size === 'w' ? 'b' : 's' };
      return w;
    }),
  );
}

export function moveWidget(list: BentoWidget[], key: string, by: -1 | 1): BentoWidget[] {
  const i = list.findIndex((w) => widgetKey(w) === key);
  const j = i + by;
  if (i < 0 || j < 0 || j >= list.length || list[j].kind === 'row' || list[i].kind === 'row') return list;
  const next = list.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return guarded(list, next);
}

export const removeWidget = (list: BentoWidget[], key: string): BentoWidget[] =>
  list.filter((w) => widgetKey(w) !== key);

export function replaceZman(list: BentoWidget[], key: string, id: ZmanId): BentoWidget[] {
  if (list.some((w) => widgetKey(w) === id)) return list;
  return list.map((w) => (w.kind === 'zman' && w.id === key ? { ...w, id } : w));
}

// A new tile goes after the others, before the row; the next tile goes first.
export function addWidget(list: BentoWidget[], widget: BentoWidget): BentoWidget[] {
  if (list.some((w) => widgetKey(w) === widgetKey(widget))) return list;
  if (widget.kind === 'row') return [...list, widget];
  if (widget.kind === 'next') return guarded(list, [widget, ...list]);
  const at = list.findIndex((w) => w.kind === 'row');
  const next = at < 0 ? [...list, widget] : [...list.slice(0, at), widget, ...list.slice(at)];
  return guarded(list, next);
}

export const sameBento = (a: readonly BentoWidget[], b: readonly BentoWidget[]): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

// Big tile, by the first rule that holds: an open window of an enabled mitzvah not marked that ends within three
// hours; a time of the period today (candle lighting, the Chanukah candles); the next opening of an enabled
// mitzvah; the next zman of the day.
export const NEXT_END_WINDOW_MS = 3 * 60 * 60 * 1000;
export type NextCandidate = { kind: 'end' | 'period' | 'opens' | 'zman'; at: Date; id: string };
export function pickNext(candidates: readonly NextCandidate[], now: Date): NextCandidate | null {
  const ahead = candidates.filter((c) => c.at.getTime() > now.getTime());
  for (const kind of ['end', 'period', 'opens', 'zman'] as const) {
    const of = ahead
      .filter((c) => c.kind === kind && (kind !== 'end' || c.at.getTime() - now.getTime() <= NEXT_END_WINDOW_MS))
      .sort((a, b) => a.at.getTime() - b.at.getTime());
    if (of.length) return of[0];
  }
  return null;
}

// The zmanim of each part of the day, for the row's "now" chips.
export function periodZmanim(at: Date, times: Readonly<Partial<Record<ZmanId, Date>>>): ZmanId[] {
  const t = at.getTime();
  const before = (id: ZmanId) => (times[id] ? t < times[id]!.getTime() : false);
  if (before('netz')) return ['misheyakir', 'netz'];
  if (before('chatzot')) return ['sofTfila', 'sofShma', 'chatzot'];
  if (before('plag')) return ['minchaGedola', 'plag'];
  if (before('tzeit')) return ['shkia', 'tzeit'];
  return ['chatzotLayla'];
}

// The row: up to two zmanim of the moment that no tile shows, then the user's pins, then the rest of the day.
export function rowZmanim(
  at: Date,
  times: Readonly<Partial<Record<ZmanId, Date>>>,
  inTiles: ReadonlySet<string>,
  pins: readonly ZmanId[],
  hidden: readonly ZmanId[],
  nextId: string | null,
): { now: ZmanId[]; mine: ZmanId[]; rest: ZmanId[] } {
  const shown = (id: ZmanId) => Boolean(times[id]) && !hidden.includes(id) && !inTiles.has(id);
  const future = (id: ZmanId) => times[id]!.getTime() > at.getTime();
  const now = periodZmanim(at, times)
    .filter((id) => shown(id) && future(id) && id !== nextId)
    .slice(0, 2);
  const mine = pins.filter((id) => shown(id) && !now.includes(id));
  const used = new Set<string>([...now, ...mine]);
  const rest = ARC_ZMANIM.filter((id) => shown(id) && !used.has(id)).sort(
    (a, b) => Number(!future(a)) - Number(!future(b)) || times[a]!.getTime() - times[b]!.getTime(),
  );
  return { now, mine, rest };
}

// Pins suggested from the mitzvot the user keeps, each with the reason it is suggested.
export function suggestedPins(enabled: ReadonlySet<string>): { id: ZmanId; reason: string }[] {
  const out: { id: ZmanId; reason: string }[] = [];
  if (enabled.has('tefillin')) out.push({ id: 'misheyakir', reason: 'tefillin' });
  if (enabled.has('krias_shma_al_hamita') || enabled.has('maariv')) out.push({ id: 'chatzotLayla', reason: 'night' });
  if (enabled.has('mincha')) out.push({ id: 'plag', reason: 'mincha' });
  return out;
}

export const bentoPinsOf = (saved: unknown): ZmanId[] =>
  Array.isArray(saved) ? ARC_ZMANIM.filter((id) => saved.includes(id)) : [];
