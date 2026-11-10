import { ZmanimService } from '@/services/ZmanimService';
import { appDayEnd, locationNoon } from '@/utils/locationDay';
import { BRAND, blendHex, contrastRatio } from '@/theme/colors';
import { SKY, SKY_SCENE, type SkyStop } from '@/theme/sky';
import { formatRemaining } from '@/utils/clock';
import type { HalachicOpinion } from '@/types/mitzvah';
import type { Location } from '@/types/zmanim';
import { ARC_ZMANIM, type ZmanId } from './zmanIds';

export type Translate = (scope: string, options?: Record<string, unknown>) => string;

export { ARC_ZMANIM, type ZmanId } from './zmanIds';

export type ArcZman = { id: ZmanId; at: Date };
export type DayFrame = { start: Date; tzeit: Date; end: Date; zmanim: readonly ArcZman[] };
export type ArcPoint = { x: number; y: number };

export const ARC = { width: 350, height: 286, skyHeight: 216, cx: 175, cy: 158, r: 112 } as const;

export const HALF_LENGTH = Math.PI * ARC.r;

export const stageUnits = (windowWidth: number, k: number): number => windowWidth / k;

export const stageOffset = (units: number): number => ARC.cx - units / 2;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function dayFrameFor(day: Date, location: Location, ks: HalachicOpinion): DayFrame | null {
  const z = ZmanimService.getZmanim(locationNoon(day, location), location);
  if (!z) return null;
  const at: Record<ZmanId, Date> = {
    alot: z.alotHaShachar,
    misheyakir: z.misheyakir,
    netz: z.netzHaChama,
    sofShma: ks === 'MA' ? z.sofZmanShmaMA : z.sofZmanShmaGra,
    sofTfila: z.sofZmanTfilaGra,
    chatzot: z.chatzot,
    minchaGedola: z.minchaGedola,
    plag: z.plagHaMincha,
    shkia: z.shkia,
    tzeit: z.tzeitHakochavim,
    chatzotLayla: z.chatzotLayla,
  };
  const zmanim = ARC_ZMANIM.map((id) => ({ id, at: at[id] }));
  const end = appDayEnd(day, location);
  const times = zmanim.map((x) => x.at.getTime());
  const ordered = times.every((ms, i) => Number.isFinite(ms) && (i === 0 || ms > times[i - 1]));
  if (!ordered || times[times.length - 1] >= end.getTime()) return null;
  return { start: z.alotHaShachar, tzeit: z.tzeitHakochavim, end, zmanim };
}

export function arcFraction(at: Date, f: DayFrame): { night: boolean; fraction: number } {
  const ms = at.getTime();
  const tzeit = f.tzeit.getTime();
  if (ms >= tzeit) return { night: true, fraction: clamp01((ms - tzeit) / (f.end.getTime() - tzeit)) };
  const start = f.start.getTime();
  return { night: false, fraction: clamp01((ms - start) / (tzeit - start)) };
}

export function arcPoint(at: Date, f: DayFrame, rtl: boolean): ArcPoint {
  const { night, fraction } = arcFraction(at, f);
  const angle = Math.PI * fraction;
  const dx = ARC.r * Math.cos(angle);
  const dy = ARC.r * Math.sin(angle);
  const x = night ? ARC.cx - dx : ARC.cx + dx;
  const y = night ? ARC.cy + dy : ARC.cy - dy;
  return { x: rtl ? x : 2 * ARC.cx - x, y };
}

export function timeAtPoint(p: ArcPoint, f: DayFrame, rtl: boolean): { atMs: number; rho: number } {
  const x = rtl ? p.x : 2 * ARC.cx - p.x;
  const start = f.start.getTime();
  const tzeit = f.tzeit.getTime();
  const nu = (x - ARC.cx) / ARC.r;
  const nv = (ARC.cy - p.y) / ARC.r;
  const rho = Math.hypot(nu, nv);
  if (nv >= 0) return { atMs: start + (Math.atan2(nv, nu) / Math.PI) * (tzeit - start), rho };
  return { atMs: tzeit + (Math.atan2(-nv, -nu) / Math.PI) * (f.end.getTime() - tzeit), rho };
}

export const arcLength = (fraction: number): number => HALF_LENGTH * clamp01(fraction);

const ARC_LEFT = ARC.cx - ARC.r;
const ARC_RIGHT = ARC.cx + ARC.r;
const halfPath = (from: number, to: number, sweep: 0 | 1) =>
  `M${from} ${ARC.cy}A${ARC.r} ${ARC.r} 0 0 ${sweep} ${to} ${ARC.cy}`;

export const dayPath = (rtl: boolean) => (rtl ? halfPath(ARC_RIGHT, ARC_LEFT, 0) : halfPath(ARC_LEFT, ARC_RIGHT, 1));

export const nightPath = (rtl: boolean) => (rtl ? halfPath(ARC_LEFT, ARC_RIGHT, 0) : halfPath(ARC_RIGHT, ARC_LEFT, 1));

export type DragState = { offsetMs: number; prevMs: number };

export function dragStart(p: ArcPoint, shownMs: number, f: DayFrame, rtl: boolean): DragState {
  return { offsetMs: timeAtPoint(p, f, rtl).atMs - shownMs, prevMs: shownMs };
}

export function dragMove(
  s: DragState,
  p: ArcPoint,
  f: DayFrame,
  rtl: boolean,
): { state: DragState; atMs: number } | null {
  const hit = timeAtPoint(p, f, rtl);
  if (hit.rho < 0.15) return null;
  const lo = f.start.getTime();
  const span = f.end.getTime() - lo;
  // A full turn: past the alot end the hour wraps to the other end of the same app day, never into another day.
  const at = Math.min(f.end.getTime() - 60000, lo + ((((hit.atMs - s.offsetMs - lo) % span) + span) % span));
  return { state: { offsetMs: s.offsetMs * 0.93, prevMs: at }, atMs: at };
}

// The zmanim the hero draws: the frame's, less those the user hid (the sky still reads every one of the frame's).
export const shownZmanim = (f: DayFrame, hidden: readonly ZmanId[] = []): readonly ArcZman[] =>
  hidden.length ? f.zmanim.filter((z) => !hidden.includes(z.id)) : f.zmanim;

export function nextZman(f: DayFrame, at: Date, hidden: readonly ZmanId[] = []): ArcZman | null {
  return shownZmanim(f, hidden).find((z) => z.at.getTime() > at.getTime()) ?? null;
}

export function relativeLabel(target: Date, at: Date, t: Translate): string {
  const d = target.getTime() - at.getTime();
  if (Math.abs(d) < 30000) return t('home.arc.at');
  if (d > 0) return t('home.arc.in', { time: formatRemaining(d, t) });
  return t('home.arc.ago', { time: formatRemaining(-d, t) });
}

const zmanAt = (f: DayFrame, id: ZmanId): number => f.zmanim.find((z) => z.id === id)!.at.getTime();

export function skyAt(f: DayFrame, at: Date): SkyStop {
  const start = f.start.getTime();
  const end = f.end.getTime();
  const netz = zmanAt(f, 'netz');
  const chatzot = zmanAt(f, 'chatzot');
  const tzeit = f.tzeit.getTime();
  const keys: [number, SkyStop][] = [
    [start, SKY.alot],
    [netz, SKY.netz],
    [netz + (chatzot - netz) * 0.3, SKY.morning],
    [chatzot, SKY.chatzot],
    [zmanAt(f, 'plag'), SKY.plag],
    [zmanAt(f, 'shkia'), SKY.shkia],
    [tzeit, SKY.tzeit],
    [tzeit + (zmanAt(f, 'chatzotLayla') - tzeit) * 0.25, SKY.night],
    [end - (netz - start) * 0.7, SKY.predawn],
    [end, SKY.alot],
  ];
  const ms = at.getTime();
  let i = 0;
  keys.forEach(([key], index) => {
    if (ms >= key && index <= keys.length - 2) i = index;
  });
  const k = clamp01((ms - keys[i][0]) / (keys[i + 1][0] - keys[i][0]));
  const e = k * k * (3 - 2 * k);
  const mix = (channel: keyof SkyStop) => blendHex(keys[i + 1][1][channel], keys[i][1][channel], e);
  return { top: mix('top'), mid: mix('mid'), bot: mix('bot'), cloud: mix('cloud') };
}

export const alphaHex = (hex: string, alpha: number): string =>
  hex +
  Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();

export function inkFor(s: SkyStop): { ink: string; chip: string; light: boolean } {
  const zones = [s.top, blendHex(s.mid, s.top, 0.6), s.mid, s.bot];
  const worst = (c: string) => Math.min(...zones.map((z) => contrastRatio(z, c)));
  const light = worst(BRAND.white) > worst(SKY_SCENE.inkDark);
  const ink = light ? BRAND.white : SKY_SCENE.inkDark;
  const opp = light ? SKY_SCENE.chipDark : BRAND.white;
  let n = 0;
  for (; n < 16; n++) {
    const a = 0.18 + 0.04 * n;
    if (Math.min(...zones.map((z) => contrastRatio(blendHex(opp, z, a), ink))) >= 5.2) break;
  }
  const alpha = Math.round((0.18 + 0.04 * n) * 100) / 100;
  return { ink, chip: alphaHex(opp, alpha), light };
}

export const CHIP_ALPHA = 0.2;
export const BACK_ALPHA = 0.6;
export const LAND_OPACITY = { top: 0.55, bottom: 0.92 } as const;
export const STRIP_SHARES = [0.43, 0.67, 0.91] as const;
export const EDGE_SHARES = [0.05, 0.18, 0.32] as const;

export function stripBackdrop(s: SkyStop, share: number): string {
  const g = groundColors(s);
  const opacity = LAND_OPACITY.top + (LAND_OPACITY.bottom - LAND_OPACITY.top) * share;
  return blendHex(blendHex(g.shadeBottom, g.shadeTop, share), s.bot, opacity);
}

export function backBackdrops(s: SkyStop): string[] {
  return [blendHex(s.mid, s.top, 0.6), s.mid, blendHex(s.bot, s.mid, 0.2)];
}

export function worstContrast(backdrops: readonly string[], fill: string, alpha: number, ink: string): number {
  return Math.min(...backdrops.map((b) => contrastRatio(blendHex(fill, b, alpha), ink)));
}

function glassInk(backdrops: readonly string[], fill: string): { ink: string; ratio: number } {
  const white = worstContrast(backdrops, fill, CHIP_ALPHA, BRAND.white);
  const dark = worstContrast(backdrops, fill, CHIP_ALPHA, SKY_SCENE.inkDark);
  return white > dark ? { ink: BRAND.white, ratio: white } : { ink: SKY_SCENE.inkDark, ratio: dark };
}

// Home's smart card (the owner's call of 2026-11-10): a glass of the sky's own colour, never a palette of its own. On
// a sky that takes white ink it leans toward the night ink, on one that takes dark ink toward white, a CARD_MIX of
// the way from the sky's middle colour, drawn at CARD_ALPHA over the land; its text is that ink, which holds 4.5:1 on
// the glass at every hour (pinned in the suite), and a hairline of the ink at CARD_EDGE_ALPHA sets it off the sky.
export const CARD_MIX = 0.55;
export const CARD_ALPHA = 0.62;
export const CARD_EDGE_ALPHA = 0.28;
export type CardGlass = { fill: string; ink: string; edge: string };
export function cardGlass(s: SkyStop): CardGlass {
  const light = inkFor(s).light;
  const ink = light ? BRAND.white : SKY_SCENE.inkDark;
  const fill = blendHex(light ? SKY_SCENE.inkDark : BRAND.white, s.mid, CARD_MIX);
  return { fill: alphaHex(fill, CARD_ALPHA), ink, edge: alphaHex(ink, CARD_EDGE_ALPHA) };
}

export const chipInk = (s: SkyStop, fill: string) =>
  glassInk(
    STRIP_SHARES.map((share) => stripBackdrop(s, share)),
    fill,
  );

export const edgeInk = (s: SkyStop, fill: string) =>
  glassInk(
    EDGE_SHARES.map((share) => stripBackdrop(s, share)),
    fill,
  );

export function nightShare(f: DayFrame, at: Date): number {
  const ms = at.getTime();
  const shkia = zmanAt(f, 'shkia');
  const netz = zmanAt(f, 'netz');
  const tzeit = f.tzeit.getTime();
  let x = 0;
  if (ms >= shkia) x = clamp01((ms - shkia) / (2 * (tzeit - shkia)));
  else if (ms <= netz) x = clamp01((netz - ms) / (netz - f.start.getTime()));
  return x * x * (3 - 2 * x);
}

export function sunColors(f: DayFrame, at: Date): { core: string; edge: string } {
  const start = f.start.getTime();
  const dayFraction = clamp01((at.getTime() - start) / (f.tzeit.getTime() - start));
  const hgt = clamp01(Math.sin(Math.PI * dayFraction) / 0.55);
  return {
    core: blendHex(SKY_SCENE.sunHigh, SKY_SCENE.sunLow, hgt),
    edge: blendHex(SKY_SCENE.sunEdgeHigh, SKY_SCENE.sunEdgeLow, hgt),
  };
}

export function groundColors(s: SkyStop): { back: string; front: string; shadeTop: string; shadeBottom: string } {
  return {
    back: blendHex(SKY_SCENE.ground, s.bot, 0.4),
    front: blendHex(SKY_SCENE.ground, s.bot, 0.58),
    shadeTop: blendHex(SKY_SCENE.ground, s.bot, 0.35),
    shadeBottom: blendHex(SKY_SCENE.ground, s.bot, 0.7),
  };
}
