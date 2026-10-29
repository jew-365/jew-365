import {
  alphaHex,
  ARC,
  ARC_ZMANIM,
  arcLength,
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
  groundColors,
  HALF_LENGTH,
  inkFor,
  LAND_OPACITY,
  nextZman,
  nightPath,
  nightShare,
  relativeLabel,
  skyAt,
  stageOffset,
  stageUnits,
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
  it('is one regular circle on the horizon, 112 units about the centre', () => {
    expect(ARC).toMatchObject({ cx: 175, cy: 158, r: 112, height: 286 });
    expect(ARC.cy + ARC.r).toBeLessThan(ARC.height);
    expect(ARC.cy - ARC.r).toBe(46);
  });

  it('places the sun on the upper half and the moon on the lower half of the same circle, rtl', () => {
    const pt = (d: Date) => arcPoint(d, F, true);
    expect(pt(F.start).x).toBeCloseTo(287, 6);
    expect(pt(F.start).y).toBeCloseTo(158, 6);
    const noon = pt(mid(F.start, F.tzeit));
    expect(noon.x).toBeCloseTo(175, 3);
    expect(noon.y).toBeCloseTo(46, 3);
    const dusk = pt(shift(F.tzeit, -1));
    expect(dusk.x).toBeCloseTo(63, 1);
    expect(dusk.y).toBeCloseTo(158, 1);
    expect(pt(F.tzeit).x).toBeCloseTo(63, 6);
    expect(pt(F.tzeit).y).toBeCloseTo(158, 6);
    const nightMid = pt(mid(F.tzeit, F.end));
    expect(nightMid.x).toBeCloseTo(175, 3);
    expect(nightMid.y).toBeCloseTo(270, 3);
    expect(pt(shift(F.end, -1)).x).toBeCloseTo(287, 1);
    expect(pt(shift(F.end, -1)).y).toBeCloseTo(158, 1);
  });

  it('puts the first quarter of the night on the lower left and the last on the lower right, rtl', () => {
    const quarter = (share: number) =>
      arcPoint(new Date(F.tzeit.getTime() + share * (F.end.getTime() - F.tzeit.getTime())), F, true);
    const first = quarter(0.25);
    const last = quarter(0.75);
    expect(first.x).toBeCloseTo(175 - 112 * Math.SQRT1_2, 3);
    expect(first.y).toBeCloseTo(158 + 112 * Math.SQRT1_2, 3);
    expect(last.x).toBeCloseTo(175 + 112 * Math.SQRT1_2, 3);
    expect(last.y).toBeCloseTo(158 + 112 * Math.SQRT1_2, 3);
  });

  it('keeps every point of the day on the circle, the day above the horizon and the night below it', () => {
    const span = (a: Date, b: Date, n: number) =>
      Array.from({ length: n + 1 }, (_, i) => new Date(a.getTime() + ((b.getTime() - a.getTime()) * i) / n));
    [true, false].forEach((rtl) => {
      span(F.start, shift(F.tzeit, -1), 40).forEach((d) => {
        const p = arcPoint(d, F, rtl);
        expect(Math.hypot(p.x - ARC.cx, p.y - ARC.cy)).toBeCloseTo(ARC.r, 6);
        expect(p.y).toBeLessThanOrEqual(ARC.cy + 1e-9);
      });
      span(F.tzeit, shift(F.end, -1), 40).forEach((d) => {
        const p = arcPoint(d, F, rtl);
        expect(Math.hypot(p.x - ARC.cx, p.y - ARC.cy)).toBeCloseTo(ARC.r, 6);
        expect(p.y).toBeGreaterThanOrEqual(ARC.cy - 1e-9);
      });
    });
  });

  it('mirrors for ltr', () => {
    expect(arcPoint(F.start, F, false).x).toBeCloseTo(63, 6);
    expect(arcPoint(mid(F.tzeit, F.end), F, false).y).toBeCloseTo(270, 3);
    expect(arcPoint(F.tzeit, F, false).x).toBeCloseTo(287, 6);
  });

  it('draws the day zmanim on the upper half and chatzot halayla on the lower half', () => {
    F.zmanim
      .filter((z) => z.id !== 'chatzotLayla')
      .forEach((z) => expect(arcPoint(z.at, F, true).y).toBeLessThanOrEqual(ARC.cy + 1e-9));
    const layla = arcPoint(zman('chatzotLayla'), F, true);
    expect(layla.y).toBeGreaterThan(ARC.cy + 100);
    expect(Math.hypot(layla.x - ARC.cx, layla.y - ARC.cy)).toBeCloseTo(ARC.r, 6);
    expect(arcPoint(zman('tzeit'), F, true).x).toBeCloseTo(63, 6);
    expect(arcPoint(zman('tzeit'), F, true).y).toBeCloseTo(158, 6);
    expect(arcPoint(zman('chatzot'), F, true).y).toBeLessThan(ARC.cy - 100);
  });

  it.each([true, false])('timeAtPoint inverts arcPoint on both halves (rtl %s)', (rtl) => {
    const nightAt = (share: number) => new Date(F.tzeit.getTime() + share * (F.end.getTime() - F.tzeit.getTime()));
    const samples = [
      F.start,
      mid(F.start, F.tzeit),
      shift(F.tzeit, -60000),
      shift(F.tzeit, 60000),
      nightAt(0.25),
      mid(F.tzeit, F.end),
      zman('chatzotLayla'),
      nightAt(0.75),
      shift(F.end, -120000),
    ];
    samples.forEach((s) => {
      const hit = timeAtPoint(arcPoint(s, F, rtl), F, rtl);
      expect(Math.abs(hit.atMs - s.getTime())).toBeLessThan(1);
      expect(hit.rho).toBeCloseTo(1, 6);
    });
    expect(timeAtPoint({ x: 175, y: 158 }, F, rtl).rho).toBe(0);
  });

  it('reads one time at the tzeit end from either side and a whole day apart at the alot end', () => {
    const above = timeAtPoint({ x: 63, y: 157 }, F, true);
    const below = timeAtPoint({ x: 63, y: 159 }, F, true);
    expect(Math.abs(above.atMs - F.tzeit.getTime())).toBeLessThan(10 * 60000);
    expect(Math.abs(below.atMs - F.tzeit.getTime())).toBeLessThan(10 * 60000);
    expect(below.atMs).toBeGreaterThan(above.atMs);
    const right = timeAtPoint({ x: 287, y: 157 }, F, true);
    const rightBelow = timeAtPoint({ x: 287, y: 159 }, F, true);
    expect(Math.abs(right.atMs - F.start.getTime())).toBeLessThan(10 * 60000);
    expect(Math.abs(rightBelow.atMs - F.end.getTime())).toBeLessThan(10 * 60000);
  });

  it('measures the half circle', () => {
    expect(HALF_LENGTH).toBeCloseTo(Math.PI * 112, 6);
    expect(arcLength(1)).toBeCloseTo(351.858, 3);
    expect(arcLength(0.5)).toBeCloseTo(175.929, 3);
    expect(arcLength(0)).toBe(0);
    expect(arcLength(-1)).toBe(0);
    expect(arcLength(3)).toBeCloseTo(HALF_LENGTH, 6);
  });

  it('writes the two half paths of one closed circle', () => {
    expect(dayPath(true)).toBe('M287 158A112 112 0 0 0 63 158');
    expect(nightPath(true)).toBe('M63 158A112 112 0 0 0 287 158');
    expect(dayPath(false)).toBe('M63 158A112 112 0 0 1 287 158');
    expect(nightPath(false)).toBe('M287 158A112 112 0 0 1 63 158');
    const ends = (d: string) => d.match(/-?\d+ 158/g)!;
    [true, false].forEach((rtl) => {
      const day = ends(dayPath(rtl));
      const night = ends(nightPath(rtl));
      expect(day[1]).toBe(night[0]);
      expect(night[1]).toBe(day[0]);
    });
  });

  it('centres the stage on the circle whatever the window width', () => {
    expect(stageUnits(390, 1)).toBe(390);
    expect(stageUnits(390, 0.5)).toBe(780);
    expect(stageOffset(350)).toBe(0);
    expect(stageOffset(439.5)).toBeCloseTo(175 - 219.75, 6);
    [320, 390, 750].forEach((width) => {
      const units = stageUnits(width, 0.8);
      expect(ARC.cx - stageOffset(units)).toBeCloseTo(units / 2, 9);
    });
  });
});

describe('drag', () => {
  it('follows the point from where it was grabbed', () => {
    const start = dragStart(arcPoint(T, F, true), T.getTime(), F, true);
    const r = dragMove(start, { x: 175, y: 46 }, F, true)!;
    const midpoint = (F.start.getTime() + F.tzeit.getTime()) / 2;
    expect(Math.abs(r.atMs - midpoint)).toBeLessThanOrEqual(2);
    expect(r.state.offsetMs).toBeCloseTo(start.offsetMs * 0.93, 6);
  });

  it('follows the point onto the lower half and back, grabbed where the moon is', () => {
    const night = at(J, '2026-10-29T20:15');
    const start = dragStart(arcPoint(night, F, true), night.getTime(), F, true);
    expect(Math.abs(start.offsetMs)).toBeLessThan(2);
    const bottom = dragMove(start, { x: 175, y: 270 }, F, true)!;
    const midpoint = (F.tzeit.getTime() + F.end.getTime()) / 2;
    expect(Math.abs(bottom.atMs - midpoint)).toBeLessThanOrEqual(2);
    const back = dragMove(bottom.state, arcPoint(zman('plag'), F, true), F, true)!;
    expect(Math.abs(back.atMs - zman('plag').getTime())).toBeLessThanOrEqual(2);
  });

  it('crosses the tzeit end from day into night and back with no jump', () => {
    const justBefore = shift(F.tzeit, -20 * 60000);
    const justAfter = shift(F.tzeit, 20 * 60000);
    const start = dragStart(arcPoint(justBefore, F, true), justBefore.getTime(), F, true);
    const across = dragMove(start, arcPoint(justAfter, F, true), F, true)!;
    expect(Math.abs(across.atMs - justAfter.getTime())).toBeLessThanOrEqual(2);
    const back = dragMove(across.state, arcPoint(justBefore, F, true), F, true)!;
    expect(Math.abs(back.atMs - justBefore.getTime())).toBeLessThanOrEqual(2);
    let state = start;
    let last = justBefore.getTime();
    [-10, -5, -1, 1, 5, 10].forEach((minutes) => {
      const r = dragMove(state, arcPoint(shift(F.tzeit, minutes * 60000), F, true), F, true)!;
      expect(r.atMs).toBeGreaterThan(last);
      expect(r.atMs - last).toBeLessThan(15 * 60000);
      state = r.state;
      last = r.atMs;
    });
  });

  it('crosses the tzeit end the same way in ltr', () => {
    const justBefore = shift(F.tzeit, -20 * 60000);
    const justAfter = shift(F.tzeit, 20 * 60000);
    const start = dragStart(arcPoint(justBefore, F, false), justBefore.getTime(), F, false);
    const across = dragMove(start, arcPoint(justAfter, F, false), F, false)!;
    expect(Math.abs(across.atMs - justAfter.getTime())).toBeLessThanOrEqual(2);
  });

  it('holds at alot when the point crosses the alot end from the day side into the night half', () => {
    const state = { offsetMs: 0, prevMs: F.start.getTime() + 20 * 60000 };
    const below = arcPoint(shift(F.end, -20 * 60000), F, true);
    expect(dragMove(state, below, F, true)!.atMs).toBe(F.start.getTime());
  });

  it('holds at the next alot when the point crosses the alot end from the night half into the day side', () => {
    const state = { offsetMs: 0, prevMs: F.end.getTime() - 20 * 60000 };
    const above = arcPoint(shift(F.start, 20 * 60000), F, true);
    expect(dragMove(state, above, F, true)!.atMs).toBe(F.end.getTime() - 60000);
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
