import {
  alphaHex,
  ARC_ZMANIM,
  arcPoint,
  BACK_ALPHA,
  backBackdrops,
  CHIP_ALPHA,
  chipInk,
  dayFrameFor,
  dayPath,
  dragMove,
  dragStart,
  edgeInk,
  EDGE_SHARES,
  ellipseLength,
  groundColors,
  inkFor,
  LAND_OPACITY,
  nextZman,
  nightPath,
  nightShare,
  relativeLabel,
  skyAt,
  STRIP_SHARES,
  stripBackdrop,
  sunColors,
  timeAtPoint,
  worstContrast,
} from '../dayArc';
import { appDay, appDayEnd, locationNoon } from '../locationDay';
import { CITIES } from '@/data/cities';
import { BRAND, DARK_THEMES, THEME_NAMES, THEMES, blendHex, contrastRatio } from '@/theme/colors';
import { SKY, SKY_SCENE } from '@/theme/sky';
import { at, zmanimFor } from '@/testing/zmanim';
import { t } from '@/i18n';
import { Location } from '@/types/zmanim';

const J = CITIES[0];
const day = appDay(at(J, '2026-10-29T12:30'), J);
const F = dayFrameFor(day, J, 'GRA')!;
const T = at(J, '2026-10-29T12:30');
const zman = (id: string) => F.zmanim.find((z) => z.id === id)!.at;
const mid = (a: Date, b: Date) => new Date((a.getTime() + b.getTime()) / 2);
const shift = (d: Date, ms: number) => new Date(d.getTime() + ms);

describe('dayFrameFor', () => {
  it('lists the eleven zmanim in strictly increasing order', () => {
    expect(F.zmanim.map((z) => z.id)).toEqual(ARC_ZMANIM);
    F.zmanim.forEach((z, i) => {
      if (i > 0) expect(z.at.getTime()).toBeGreaterThan(F.zmanim[i - 1].at.getTime());
    });
  });

  it('starts at alot and ends at the app day end', () => {
    expect(F.start).toEqual(zmanimFor(locationNoon(day, J), J).alotHaShachar);
    expect(F.end).toEqual(appDayEnd(day, J));
  });

  it('follows the Shema opinion', () => {
    const ma = dayFrameFor(day, J, 'MA')!;
    expect(ma.zmanim.find((z) => z.id === 'sofShma')!.at).toEqual(zmanimFor(locationNoon(day, J), J).sofZmanShmaMA);
  });

  it('is null without zmanim', () => {
    const svalbard: Location = { lat: 78.2, lng: 15.6, tz: 'Arctic/Longyearbyen', name: 'Svalbard', inIsrael: false };
    expect(dayFrameFor(new Date(2026, 11, 21), svalbard, 'GRA')).toBeNull();
  });
});

describe('arc geometry', () => {
  it('places the sun and moon rtl', () => {
    const pt = (d: Date) => arcPoint(d, F, true);
    expect(pt(F.start).x).toBeCloseTo(317, 6);
    expect(pt(F.start).y).toBeCloseTo(158, 6);
    const noon = pt(mid(F.start, F.tzeit));
    expect(noon.x).toBeCloseTo(175, 3);
    expect(noon.y).toBeCloseTo(42, 3);
    const dusk = pt(shift(F.tzeit, -1));
    expect(dusk.x).toBeCloseTo(33, 1);
    expect(dusk.y).toBeCloseTo(158, 1);
    const nightMid = pt(mid(F.tzeit, F.end));
    expect(nightMid.x).toBeCloseTo(175, 3);
    expect(nightMid.y).toBeCloseTo(204, 3);
    expect(pt(shift(F.end, -1)).x).toBeCloseTo(275, 1);
    expect(pt(F.tzeit).x).toBeCloseTo(75, 6);
  });

  it('mirrors for ltr', () => {
    expect(arcPoint(F.start, F, false).x).toBeCloseTo(33, 6);
    expect(arcPoint(mid(F.tzeit, F.end), F, false).y).toBeCloseTo(204, 3);
  });

  it.each([true, false])('timeAtPoint inverts arcPoint (rtl %s)', (rtl) => {
    const samples = [
      F.start,
      mid(F.start, F.tzeit),
      shift(F.tzeit, -60000),
      mid(F.tzeit, F.end),
      shift(F.end, -120000),
    ];
    samples.forEach((s) => {
      const hit = timeAtPoint(arcPoint(s, F, rtl), F, rtl);
      expect(Math.abs(hit.atMs - s.getTime())).toBeLessThan(1);
      expect(hit.rho).toBeCloseTo(1, 6);
    });
    expect(timeAtPoint({ x: 175, y: 158 }, F, rtl).rho).toBe(0);
  });

  it('measures the ellipse', () => {
    expect(ellipseLength(142, 116, 1)).toBeCloseTo(406.283, 2);
    expect(ellipseLength(100, 46, 1)).toBeCloseTo(237.242, 2);
    expect(ellipseLength(142, 116, 0.5)).toBeCloseTo(203.146, 2);
  });

  it('writes the paths', () => {
    expect(dayPath(true)).toBe('M317 158A142 116 0 0 0 33 158');
    expect(nightPath(false)).toBe('M275 158A100 46 0 0 1 75 158');
  });
});

describe('drag', () => {
  it('follows the point from where it was grabbed', () => {
    const start = dragStart(arcPoint(T, F, true), T.getTime(), F, true);
    const r = dragMove(start, { x: 175, y: 42 }, F, true)!;
    const midpoint = (F.start.getTime() + F.tzeit.getTime()) / 2;
    expect(Math.abs(r.atMs - midpoint)).toBeLessThanOrEqual(2);
    expect(r.state.offsetMs).toBeCloseTo(start.offsetMs * 0.93, 6);
  });

  it('ignores the centre', () => {
    const start = dragStart(arcPoint(T, F, true), T.getTime(), F, true);
    expect(dragMove(start, { x: 175, y: 158 }, F, true)).toBeNull();
  });

  it('snaps a jump over three quarters to the near end', () => {
    const state = { offsetMs: 0, prevMs: F.start.getTime() + 60000 };
    const far = arcPoint(shift(F.end, -120000), F, true);
    expect(dragMove(state, far, F, true)!.atMs).toBe(F.start.getTime());
  });

  it('never passes the end', () => {
    const state = { offsetMs: 0, prevMs: F.end.getTime() - 120000 };
    const r = dragMove(state, arcPoint(shift(F.end, -1), F, true), F, true)!;
    expect(r.atMs).toBeLessThanOrEqual(F.end.getTime() - 60000);
  });
});

describe('next zman and labels', () => {
  it('finds the next zman', () => {
    expect(nextZman(F, T)!.id).toBe('plag');
    expect(nextZman(F, zman('chatzotLayla'))).toBeNull();
  });

  it('words the distance', () => {
    expect(relativeLabel(shift(T, 20000), T, t)).toBe('הגיע הזמן');
    expect(relativeLabel(shift(T, 90 * 60000), T, t)).toBe('בעוד 1:30 שעות');
    expect(relativeLabel(shift(T, -23 * 60000), T, t)).toBe("עבר לפני 23 דק'");
  });
});

describe('sky', () => {
  it('interpolates the scene palette', () => {
    expect(skyAt(F, zman('chatzot'))).toEqual({ top: '#4b9deb', mid: '#6db4f1', bot: '#a8d5f8', cloud: '#ffffff' });
    expect(skyAt(F, F.start).top).toBe('#18215f');
    expect(skyAt(F, mid(zman('chatzot'), zman('plag')))).toEqual({
      top: '#559ee6',
      mid: '#85bded',
      bot: '#cfd7cd',
      cloud: '#fffbf2',
    });
  });

  it('picks ink and chip', () => {
    expect(inkFor(skyAt(F, zman('chatzot')))).toEqual({ ink: '#0A1228', chip: '#FFFFFF2E', light: false });
    expect(inkFor(SKY.night)).toEqual({ ink: '#FFFFFF', chip: '#080E222E', light: true });
    expect(inkFor(SKY.shkia).chip).toBe('#FFFFFF42');
  });

  it('measures the night share', () => {
    expect(nightShare(F, zman('chatzot'))).toBe(0);
    expect(nightShare(F, F.tzeit)).toBeCloseTo(0.5, 6);
    expect(nightShare(F, F.start)).toBeCloseTo(1, 6);
  });

  it('colours the sun and the ground', () => {
    expect(sunColors(F, mid(F.start, F.tzeit)).core).toBe('#ffe27a');
    expect(groundColors(skyAt(F, zman('chatzot')))).toEqual({
      back: '#6885a1',
      front: '#4b607a',
      shadeTop: '#708fac',
      shadeBottom: '#38485f',
    });
  });
});

describe('zmanim chip strip', () => {
  it('writes an 8-digit hex alpha', () => {
    expect(alphaHex('#FFFDF9', CHIP_ALPHA)).toBe('#FFFDF933');
    expect(alphaHex('#FFFDF9', BACK_ALPHA)).toBe('#FFFDF999');
    expect(alphaHex('#080E22', 1)).toBe('#080E22FF');
    expect(alphaHex('#000000', 0)).toBe('#00000000');
  });

  it('draws the chips and the edge pills at 0.2 and the back control at 0.6', () => {
    expect(CHIP_ALPHA).toBe(0.2);
    expect(BACK_ALPHA).toBe(0.6);
  });

  it('lays the land gradient over the bottom of the sky', () => {
    const ground = groundColors(SKY.chatzot);
    expect(stripBackdrop(SKY.chatzot, 0)).toBe(blendHex(ground.shadeTop, SKY.chatzot.bot, LAND_OPACITY.top));
    expect(stripBackdrop(SKY.chatzot, 1)).toBe(blendHex(ground.shadeBottom, SKY.chatzot.bot, LAND_OPACITY.bottom));
  });

  it('samples the edge pills above the chip strip on the land gradient', () => {
    expect(Math.max(...EDGE_SHARES)).toBeLessThan(Math.min(...STRIP_SHARES));
  });

  it('reads the sky behind the back control from the top towards the middle of the sky', () => {
    expect(backBackdrops(SKY.chatzot)).toEqual([
      blendHex(SKY.chatzot.mid, SKY.chatzot.top, 0.6),
      SKY.chatzot.mid,
      blendHex(SKY.chatzot.bot, SKY.chatzot.mid, 0.2),
    ]);
  });

  const KEYS = Object.keys(SKY) as (keyof typeof SKY)[];
  const NAMED = { dawn: 'alot', noon: 'chatzot', sunset: 'shkia', night: 'night' } as const;
  type Named = keyof typeof NAMED;
  const NAMES = Object.keys(NAMED) as Named[];
  const FILLS = ['surface', 'goldLight'] as const;
  type Class = 'light' | 'dark';
  const classOf = (theme: (typeof THEME_NAMES)[number]): Class => (DARK_THEMES.includes(theme) ? 'dark' : 'light');
  const inkName = (ink: string) => (ink === BRAND.white ? 'white' : 'dark');
  const SHARES = { chip: STRIP_SHARES, edge: EDGE_SHARES } as const;
  const INK_OF = { chip: chipInk, edge: edgeInk } as const;
  const rows = THEME_NAMES.flatMap((theme) =>
    KEYS.flatMap((key) =>
      (['chip', 'edge'] as const).flatMap((kind) =>
        (kind === 'chip' ? FILLS : (['surface'] as const)).map(
          (fill) => [kind, theme, key, fill, THEMES[theme][fill]] as const,
        ),
      ),
    ),
  );

  it.each(rows)(
    'picks the better ink for the %s over the %s palette, %s sky, %s fill',
    (kind, _theme, key, _fill, colour) => {
      const { ink, ratio } = INK_OF[kind](SKY[key], colour);
      const worst = (c: string) =>
        Math.min(
          ...SHARES[kind].map((share) =>
            contrastRatio(blendHex(colour, stripBackdrop(SKY[key], share), CHIP_ALPHA), c),
          ),
        );
      const other = ink === BRAND.white ? SKY_SCENE.inkDark : BRAND.white;
      expect(worst(ink)).toBeCloseTo(ratio, 6);
      expect(worst(ink)).toBeGreaterThanOrEqual(worst(other));
      expect([BRAND.white, SKY_SCENE.inkDark]).toContain(ink);
    },
  );

  type Pin = readonly [ink: 'white' | 'dark', floor: number];
  const CHIP_PINNED: Record<Class, Record<(typeof FILLS)[number], Record<Named, Pin>>> = {
    light: {
      surface: { dawn: ['white', 4.52], noon: ['dark', 4.41], sunset: ['dark', 4.07], night: ['white', 8.57] },
      goldLight: { dawn: ['white', 4.74], noon: ['dark', 4.17], sunset: ['dark', 3.83], night: ['white', 9.09] },
    },
    dark: {
      surface: { dawn: ['white', 8.77], noon: ['white', 4.58], sunset: ['white', 5.19], night: ['white', 15.97] },
      goldLight: { dawn: ['white', 8.4], noon: ['white', 4.44], sunset: ['white', 4.95], night: ['white', 15.6] },
    },
  };
  const EDGE_PINNED: Record<Class, Record<Named, Pin>> = {
    light: { dawn: ['dark', 4.32], noon: ['dark', 7.81], sunset: ['dark', 7.02], night: ['white', 8.06] },
    dark: { dawn: ['white', 7.22], noon: ['dark', 4.4], sunset: ['dark', 3.91], night: ['white', 15.19] },
  };
  const BACK_PINNED: Record<Class, Record<Named, number>> = {
    light: { dawn: 7.04, noon: 10.89, sunset: 9.36, night: 5.94 },
    dark: { dawn: 10.7, noon: 5.86, sunset: 6.85, night: 14.2 },
  };
  const DAY_FLOOR = {
    chip: { light: { surface: 3.54, goldLight: 3.51 }, dark: { surface: 3.8, goldLight: 3.63 } },
    edge: { light: 4.07, dark: 3.89 },
    back: { light: 5.86, dark: 4.84 },
  } as const;
  const PALETTE_SPREAD = 0.25;
  const pinned = (value: number, floor: number) => {
    expect(value).toBeGreaterThanOrEqual(floor);
    expect(value).toBeLessThan(Math.max(floor + PALETTE_SPREAD, floor * 1.05));
  };

  it.each(THEME_NAMES.flatMap((theme) => NAMES.flatMap((name) => FILLS.map((fill) => [theme, name, fill] as const))))(
    'pins the chip ink and floor of the %s palette at %s, %s fill',
    (theme, name, fill) => {
      const [ink, floor] = CHIP_PINNED[classOf(theme)][fill][name];
      const result = chipInk(SKY[NAMED[name]], THEMES[theme][fill]);
      expect(inkName(result.ink)).toBe(ink);
      pinned(result.ratio, floor);
    },
  );

  const themeNames = THEME_NAMES.flatMap((theme) => NAMES.map((name) => [theme, name] as const));

  it.each(themeNames)('pins the edge pill ink and floor of the %s palette at %s', (theme, name) => {
    const [ink, floor] = EDGE_PINNED[classOf(theme)][name];
    const result = edgeInk(SKY[NAMED[name]], THEMES[theme].surface);
    expect(inkName(result.ink)).toBe(ink);
    pinned(result.ratio, floor);
  });

  it.each(themeNames)('keeps the back control text of the %s palette readable at %s', (theme, name) => {
    const ratio = worstContrast(backBackdrops(SKY[NAMED[name]]), THEMES[theme].surface, BACK_ALPHA, THEMES[theme].text);
    expect(ratio).toBeGreaterThanOrEqual(BACK_PINNED[classOf(theme)][name]);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  const dayMin = (ratioAt: (sky: ReturnType<typeof skyAt>) => number) => {
    let min = Infinity;
    for (let ms = F.start.getTime(); ms < F.end.getTime(); ms += 60000) {
      min = Math.min(min, ratioAt(skyAt(F, new Date(ms))));
    }
    return min;
  };

  it.each(THEME_NAMES.flatMap((theme) => FILLS.map((fill) => [theme, fill] as const)))(
    'holds the measured whole-day chip floor of the %s palette, %s fill, which is under 4.5:1 for part of the day',
    (theme, fill) => {
      const min = dayMin((sky) => chipInk(sky, THEMES[theme][fill]).ratio);
      pinned(min, DAY_FLOOR.chip[classOf(theme)][fill]);
      expect(min).toBeLessThan(4.5);
    },
  );

  it.each(THEME_NAMES)('holds the measured whole-day edge pill floor of the %s palette', (theme) => {
    pinned(
      dayMin((sky) => edgeInk(sky, THEMES[theme].surface).ratio),
      DAY_FLOOR.edge[classOf(theme)],
    );
  });

  it.each(THEME_NAMES)('keeps the back control text of the %s palette above 4.5:1 through the whole day', (theme) => {
    const min = dayMin((sky) =>
      worstContrast(backBackdrops(sky), THEMES[theme].surface, BACK_ALPHA, THEMES[theme].text),
    );
    pinned(min, DAY_FLOOR.back[classOf(theme)]);
    expect(min).toBeGreaterThanOrEqual(4.5);
  });
});
