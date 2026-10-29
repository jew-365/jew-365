import { Dimensions, I18nManager, ScrollView, StyleSheet } from 'react-native';
import type { ComponentProps } from 'react';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { AppLogo } from '../AppLogo';
import { BACK_TOUCH, BLOCK_GAP, DayArcHero, HERO_CHROME, SCENE_MAX, SCENE_MIN, sceneScale } from '../DayArcHero';
import { CITIES } from '@/data/cities';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';
import { useUserStore } from '@/stores/useUserStore';
import { THEMES } from '@/theme/colors';
import { scaled } from '@/theme/scale';
import { SKY_SCENE } from '@/theme/sky';
import { radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import {
  alphaHex,
  ARC,
  arcFraction,
  arcLength,
  arcPoint,
  BACK_ALPHA,
  CHIP_ALPHA,
  chipInk,
  dayFrameFor,
  dayPath,
  dragMove,
  dragStart,
  edgeInk,
  HALF_LENGTH,
  inkFor,
  nextZman,
  nightPath,
  skyAt,
  stageOffset,
  stageUnits,
  type ZmanId,
} from '@/utils/dayArc';
import { clockOf } from '@/utils/clock';
import { appDay } from '@/utils/locationDay';

const J = CITIES[0];
const NOON = at(J, '2026-10-29T12:30');
const NIGHT = at(J, '2026-10-29T20:15');
const COLORS = THEMES.gold;
const HIDDEN = { includeHiddenElements: true };

type Json = { type: string; props: Record<string, unknown>; children: (Json | string)[] | null };
const LAYOUT_STYLE =
  /^(position|top|bottom|start|end|left|right|(min|max)?(width|height)|flex.*|align.*|justifyContent|gap|margin.*|padding.*|border.*Width|overflow|aspectRatio)$/;
const styleOf = (node: { props: Record<string, unknown> }) =>
  (StyleSheet.flatten(node.props.style as never) ?? {}) as Record<string, unknown>;
const flowShape = (node: Json): unknown => [
  node.type,
  Object.fromEntries(Object.entries(styleOf(node)).filter(([key]) => LAYOUT_STYLE.test(key))),
  (node.children ?? [])
    .filter((child): child is Json => typeof child !== 'string' && styleOf(child).position !== 'absolute')
    .map(flowShape),
];
const findJson = (node: Json | string, testID: string): Json | null => {
  if (typeof node === 'string') return null;
  if (node.props.testID === testID) return node;
  for (const child of node.children ?? []) {
    const found = findJson(child, testID);
    if (found) return found;
  }
  return null;
};
const findParentJson = (node: Json | string, testID: string): Json | null => {
  if (typeof node === 'string') return null;
  if ((node.children ?? []).some((child) => typeof child !== 'string' && child.props.testID === testID)) return node;
  for (const child of node.children ?? []) {
    const found = findParentJson(child, testID);
    if (found) return found;
  }
  return null;
};
const heroShape = () => flowShape(findJson(screen.toJSON() as unknown as Json, 'home-hero')!);
const frameAt = (now: Date) => dayFrameFor(appDay(now, J), J, 'GRA')!;
const F = frameAt(NOON);
const ZMAN_IDS: ZmanId[] = F.zmanim.map((z) => z.id);

const heroProps = (
  now: Date,
  frame: ReturnType<typeof frameAt> | null,
  onScrubChange: () => void,
  onSkyTop: () => void,
) =>
  ({
    frame,
    now,
    tz: J.tz,
    greeting: 'צהריים טובים, דוד',
    dateLine: 'יום חמישי · x · ירושלים',
    caption: 'תפילת מנחה · עוד 4:22 שעות',
    onScrubChange,
    onSkyTop,
  }) satisfies ComponentProps<typeof DayArcHero>;

const setup = (now = NOON, frame: ReturnType<typeof frameAt> | null = frameAt(now)) => {
  const onScrubChange = jest.fn();
  const onSkyTop = jest.fn();
  const view = renderWithTheme(
    <DayArcHero
      frame={frame}
      now={now}
      tz={J.tz}
      greeting="צהריים טובים, דוד"
      dateLine="יום חמישי · x · ירושלים"
      caption="תפילת מנחה · עוד 4:22 שעות"
      onScrubChange={onScrubChange}
      onSkyTop={onSkyTop}
    />,
  );
  return { onScrubChange, onSkyTop, view };
};

describe('DayArcHero', () => {
  beforeEach(() => {
    jest.replaceProperty(I18nManager, 'isRTL', true);
    useUserStore.getState().reset();
    useUserStore.setState({ language: 'he', theme: 'gold' });
  });

  it('draws the chrome, the clock and the chips, with no next-zman pill', () => {
    const { onSkyTop } = setup();
    expect(screen.getByText('צהריים טובים, דוד')).toBeOnTheScreen();
    expect(screen.getByText('יום חמישי · x · ירושלים')).toBeOnTheScreen();
    expect(screen.getByText('תפילת מנחה · עוד 4:22 שעות')).toBeOnTheScreen();
    expect(screen.getByTestId('home-arc-clock')).toHaveTextContent('12:30');
    ZMAN_IDS.forEach((id) => expect(screen.getByTestId(`home-zman-${id}`)).toBeOnTheScreen());
    expect(screen.queryByTestId('home-arc-next')).toBeNull();
    expect(screen.queryByText('הבא')).toBeNull();
    expect(onSkyTop).toHaveBeenLastCalledWith({
      color: skyAt(F, NOON).top,
      lightInk: inkFor(skyAt(F, NOON)).light,
    });
  });

  it('keeps the next zman for the slider reader and highlights it in the strip', () => {
    setup();
    const next = nextZman(F, NOON)!.id;
    expect(screen.getByTestId('home-arc-grab').props.accessibilityValue.text).toMatch(
      /^12:30, פלג המנחה · \d\d:\d\d בעוד/,
    );
    expect(screen.getByTestId(`home-zman-${next}`)).toHaveTextContent(/^הבא · /);
    expect(styleOf(screen.getByTestId(`home-zman-${next}`)).borderColor).toBe(COLORS.gold);
  });

  it('merges the greeting and the icon into one full-width glass chip', () => {
    setup();
    const sky = inkFor(skyAt(F, NOON));
    const chip = screen.getByTestId('home-top-chip');
    const style = styleOf(chip);
    expect(style).toMatchObject({ backgroundColor: sky.chip, borderRadius: radius.xl, marginHorizontal: spacing.xl });
    expect(style.width).toBeUndefined();
    expect(style.alignSelf).toBeUndefined();
    const inside = within(chip);
    expect(inside.getByText('צהריים טובים, דוד')).toBeOnTheScreen();
    expect(inside.getByText('יום חמישי · x · ירושלים')).toBeOnTheScreen();
    const logos = screen.UNSAFE_getAllByType(AppLogo);
    expect(logos).toHaveLength(1);
    expect(logos[0].props).toMatchObject({ variant: 'icon', size: scaled(40) });
    expect(inside.getByTestId('home-logo')).toBeOnTheScreen();
    const kids = findJson(screen.toJSON() as unknown as Json, 'home-top-chip')!.children as Json[];
    const order = kids.map((child) =>
      findJson(child, 'home-logo') ? 'logo' : JSON.stringify(child).includes('צהריים טובים, דוד') ? 'greeting' : 'gap',
    );
    expect(order).toEqual(['greeting', 'gap', 'logo']);
    expect(screen.getByText('צהריים טובים, דוד').props.accessibilityRole).toBe('header');
  });

  it('draws the icon bare: no tile and no solid white behind it', () => {
    setup();
    const logo = screen.UNSAFE_getByType(AppLogo);
    let node = logo.parent;
    while (node && node.props.testID !== 'home-hero') {
      if (node.props.testID !== 'home-top-chip') expect(styleOf(node as never).backgroundColor).toBeUndefined();
      node = node.parent;
    }
    const halo = findJson(screen.toJSON() as unknown as Json, 'home-logo-halo')!;
    expect(styleOf(halo).backgroundColor ?? 'transparent').toBe('transparent');
    expect(JSON.stringify(halo)).toContain('RNSVGRadialGradient');
  });

  it.each([
    ['noon', NOON],
    ['night', NIGHT],
  ])('keeps a thin light halo behind the icon at %s', (_name, now) => {
    setup(now);
    expect(within(screen.getByTestId('home-logo')).getByTestId('home-logo-halo', HIDDEN)).toBeTruthy();
  });

  it('previews a zman from a chip and returns to now', () => {
    setup();
    const shkia = F.zmanim.find((z) => z.id === 'shkia')!.at;
    expect(screen.queryByTestId('home-arc-back')).toBeNull();
    fireEvent.press(screen.getByTestId('home-zman-shkia'));
    expect(screen.getByTestId('home-arc-clock')).toHaveTextContent(clockOf(shkia, J.tz));
    expect(screen.getByText('תצוגה בלבד')).toBeOnTheScreen();
    expect(screen.getByText('חזרה לעכשיו')).toBeOnTheScreen();
    expect(screen.getByTestId('home-zman-shkia').props.accessibilityState.selected).toBe(true);

    fireEvent.press(screen.getByTestId('home-zman-shkia'));
    expect(screen.getByTestId('home-arc-clock')).toHaveTextContent('12:30');
    expect(screen.queryByText('חזרה לעכשיו')).toBeNull();

    fireEvent.press(screen.getByTestId('home-zman-shkia'));
    fireEvent.press(screen.getByText('חזרה לעכשיו'));
    expect(screen.getByTestId('home-arc-clock')).toHaveTextContent('12:30');
    expect(screen.queryByTestId('home-arc-back')).toBeNull();
  });

  it('overlays the back control, centred, above the scene without taking any room', () => {
    setup();
    fireEvent.press(screen.getByTestId('home-zman-shkia'));
    const back = screen.getByTestId('home-arc-back');
    expect(styleOf(back)).toMatchObject({
      position: 'absolute',
      top: 0,
      start: 0,
      end: 0,
      height: scaled(44),
      alignItems: 'center',
      justifyContent: 'center',
    });
    expect(styleOf(back).height as number).toBeGreaterThanOrEqual(44);
    expect(BACK_TOUCH).toBe(scaled(44));
    expect(back.props.pointerEvents).toBe('box-none');
    const wrapper = findParentJson(screen.toJSON() as unknown as Json, 'home-arc-back')!;
    const place = (id: string) =>
      wrapper.children!.findIndex((child) => typeof child !== 'string' && findJson(child, id));
    expect(place('home-arc-back')).toBeGreaterThan(place('home-arc'));
    expect(place('home-arc-back')).toBeLessThan(place('home-zman-alot'));
    expect(within(back).getByText('חזרה לעכשיו')).toBeOnTheScreen();
  });

  it('draws the back control translucent at 0.6 with an orange border that adds no height', () => {
    setup();
    fireEvent.press(screen.getByTestId('home-zman-shkia'));
    const pill = within(screen.getByTestId('home-arc-back')).getByRole('button');
    const style = styleOf(pill);
    expect(style).toMatchObject({
      backgroundColor: alphaHex(COLORS.surface, BACK_ALPHA),
      borderColor: COLORS.gold,
      borderWidth: 2,
      borderRadius: radius.full,
    });
    expect(style.paddingVertical).toBe(spacing.sm - 2);
    expect(2 * (style.paddingVertical as number) + 2 * 2 + (typography.captionBold.lineHeight as number)).toBe(
      2 * spacing.sm + (typography.captionBold.lineHeight as number),
    );
    expect(style.shadowOpacity).toBeUndefined();
    expect(StyleSheet.flatten(within(pill).getByText('חזרה לעכשיו').props.style).color).toBe(COLORS.text);
  });

  it('keeps the hero layout identical with and without a preview', () => {
    setup();
    const plain = heroShape();
    fireEvent.press(screen.getByTestId('home-zman-shkia'));
    expect(screen.getByTestId('home-arc-back')).toBeOnTheScreen();
    expect(heroShape()).toEqual(plain);
    fireEvent(screen.getByTestId('home-arc-grab'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(heroShape()).toEqual(plain);
    fireEvent.press(screen.getByText('חזרה לעכשיו'));
    expect(screen.queryByTestId('home-arc-back')).toBeNull();
    expect(heroShape()).toEqual(plain);
  });

  it('always leaves 17 points more between the top chip and the arc, with or without a preview', () => {
    setup();
    expect(BLOCK_GAP).toBe(scaled(17));
    expect(styleOf(screen.getByTestId('home-arc-block')).paddingTop).toBe(scaled(17));
    fireEvent.press(screen.getByTestId('home-zman-shkia'));
    expect(styleOf(screen.getByTestId('home-arc-block')).paddingTop).toBe(scaled(17));
    const k = sceneScale(Dimensions.get('window').height);
    const land = findJson(screen.toJSON() as unknown as Json, 'home-arc-block')!.children!.find(
      (child): child is Json =>
        typeof child !== 'string' && styleOf(child).position === 'absolute' && styleOf(child).bottom === 0,
    )!;
    expect(styleOf(land).top).toBe(scaled(17) + 158 * k);
  });

  const PHONES = [
    [360, 640],
    [375, 812],
    [390, 844],
    [412, 915],
    [412, 1000],
  ] as const;
  const TICK_OUTER = 10;
  const PILL_HEIGHT = 2 * spacing.sm + (typography.captionBold.lineHeight as number);
  const APEX = arcPoint(F.zmanim.find((z) => z.id === 'chatzot')!.at, F, true);
  const standOff = (height: number) => {
    const k = sceneScale(height);
    const tickTop = BLOCK_GAP + (APEX.y - TICK_OUTER) * k;
    const plateTop = BLOCK_GAP + 66 * k;
    const pillBottom = (BACK_TOUCH + PILL_HEIGHT) / 2;
    return {
      k,
      tickFromBox: tickTop - BACK_TOUCH,
      tickFromPill: tickTop - pillBottom,
      plateFromBox: plateTop - BACK_TOUCH,
      plateFromPill: plateTop - pillBottom,
    };
  };
  const STAND_OFF: Record<number, [number, number, number, number]> = {
    640: [-4.19, 0.81, 14.31, 19.31],
    812: [3.33, 8.33, 27.92, 32.92],
    844: [5.37, 10.37, 31.62, 36.62],
    915: [9.45, 14.45, 39, 44],
    1000: [9.45, 14.45, 39, 44],
  };

  it.each(PHONES)(
    'reports where the centred back control stands against the chatzot tick and the clock plate on %s x %s',
    (_width, height) => {
      const r = standOff(height);
      const [tickBox, tickPill, plateBox, platePill] = STAND_OFF[height];
      expect(r.tickFromBox).toBeCloseTo(tickBox, 2);
      expect(r.tickFromPill).toBeCloseTo(tickPill, 2);
      expect(r.plateFromBox).toBeCloseTo(plateBox, 2);
      expect(r.plateFromPill).toBeCloseTo(platePill, 2);
      expect(r.tickFromPill).toBeGreaterThan(0);
      expect(r.plateFromBox).toBeGreaterThan(0);
    },
  );

  const lineHeight = (variant: { lineHeight?: number }) => variant.lineHeight as number;
  const TOP_ROW = lineHeight(typography.caption) + lineHeight(typography.title) + 2 * scaled(6);
  const STRIP =
    spacing.sm + 2 * 2 + 2 * scaled(7) + lineHeight(typography.small) + lineHeight(typography.body) + spacing.md;
  const CHROME = spacing.lg + TOP_ROW + BLOCK_GAP + STRIP;
  const HERO: Record<number, [scene: number, hero: number]> = {
    640: [179, 346],
    812: [238, 405],
    844: [254, 421],
    915: [286, 453],
    1000: [286, 453],
  };

  it('budgets the hero chrome at 168 points, 1 above what the layout tokens add up to', () => {
    expect(CHROME).toBe(167);
    expect(HERO_CHROME).toBe(scaled(168));
    expect(HERO_CHROME).toBeGreaterThanOrEqual(CHROME);
    expect(SCENE_MAX).toBe(scaled(ARC.height));
    expect(SCENE_MIN).toBe(scaled(179));
  });

  it.each(PHONES)(
    'sizes the scene and the hero on %s x %s, within half a screen except on the 640 point phone',
    (_width, height) => {
      const scene = ARC.height * sceneScale(height);
      const [pinnedScene, pinnedHero] = HERO[height];
      expect(scene).toBeCloseTo(pinnedScene, 2);
      expect(scene + CHROME).toBeCloseTo(pinnedHero, 2);
      if (height === 640) expect(scene + CHROME - height / 2).toBeCloseTo(26, 2);
      else expect(scene + CHROME).toBeLessThanOrEqual(height / 2);
    },
  );

  it('keeps the strip height when no zman is next: every chip carries the same border width', () => {
    setup(at(J, '2026-10-29T23:40'));
    expect(nextZman(F, at(J, '2026-10-29T23:40'))).toBeNull();
    ZMAN_IDS.forEach((id) => expect(styleOf(screen.getByTestId(`home-zman-${id}`)).borderWidth).toBe(2));
  });

  it('draws every chip at 0.2 opacity over its colour, the next one keeping its hue', () => {
    setup();
    const next = nextZman(F, NOON)!.id;
    expect(CHIP_ALPHA).toBe(0.2);
    expect(alphaHex(COLORS.surface, CHIP_ALPHA)).toBe(`${COLORS.surface}33`);
    ZMAN_IDS.forEach((id) => {
      const style = styleOf(screen.getByTestId(`home-zman-${id}`));
      expect(style.backgroundColor).toBe(id === next ? `${COLORS.goldLight}33` : `${COLORS.surface}33`);
      expect(style.borderColor).toBe(id === next ? COLORS.gold : 'transparent');
    });
    fireEvent.press(screen.getByTestId('home-zman-shkia'));
    expect(styleOf(screen.getByTestId('home-zman-shkia')).backgroundColor).toBe(COLORS.text);
  });

  const borders = () =>
    Object.fromEntries(ZMAN_IDS.map((id) => [id, styleOf(screen.getByTestId(`home-zman-${id}`)).borderColor]));
  const gilded = () => ZMAN_IDS.filter((id) => borders()[id] === COLORS.gold);

  it('keeps the orange border on the next chip in live mode', () => {
    setup();
    expect(gilded()).toEqual([nextZman(F, NOON)!.id]);
    expect(screen.getByTestId(`home-zman-${nextZman(F, NOON)!.id}`)).toHaveTextContent(/^הבא · /);
  });

  it('moves the orange border to the pressed chip and takes it off the next chip', () => {
    setup();
    const next = nextZman(F, NOON)!.id;
    fireEvent.press(screen.getByTestId('home-zman-shkia'));
    expect(gilded()).toEqual(['shkia']);
    const afterShkia = nextZman(F, F.zmanim.find((z) => z.id === 'shkia')!.at)!.id;
    expect(afterShkia).toBe('tzeit');
    expect(screen.getByTestId(`home-zman-${afterShkia}`)).toHaveTextContent(/^הבא · /);
    expect(styleOf(screen.getByTestId(`home-zman-${afterShkia}`)).borderColor).toBe('transparent');
    expect(styleOf(screen.getByTestId(`home-zman-${next}`)).borderColor).toBe('transparent');
    expect(styleOf(screen.getByTestId('home-zman-shkia'))).toMatchObject({
      backgroundColor: COLORS.text,
      borderColor: COLORS.gold,
    });
    fireEvent.press(screen.getByTestId('home-zman-tzeit'));
    expect(gilded()).toEqual(['tzeit']);
    fireEvent.press(screen.getByTestId('home-zman-tzeit'));
    expect(gilded()).toEqual([next]);
  });

  it('gives the border back to the next chip when the back control returns to now', () => {
    setup();
    const next = nextZman(F, NOON)!.id;
    fireEvent.press(screen.getByTestId('home-zman-shkia'));
    fireEvent.press(screen.getByText('חזרה לעכשיו'));
    expect(gilded()).toEqual([next]);
  });

  it('keeps the border on the next chip of the shown hour while the sun is dragged with no chip pressed', () => {
    setup();
    fireEvent(screen.getByTestId('home-arc-grab'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(gilded()).toEqual([nextZman(F, at(J, '2026-10-29T12:45'))!.id]);
  });

  it('draws one border width on every chip whatever is selected, so the strip never changes height', () => {
    setup();
    const widths = () => ZMAN_IDS.map((id) => styleOf(screen.getByTestId(`home-zman-${id}`)).borderWidth);
    expect(new Set(widths())).toEqual(new Set([2]));
    fireEvent.press(screen.getByTestId('home-zman-shkia'));
    expect(new Set(widths())).toEqual(new Set([2]));
    fireEvent.press(screen.getByText('חזרה לעכשיו'));
    expect(new Set(widths())).toEqual(new Set([2]));
  });

  describe('centring the chip strip', () => {
    const STEP = 110;
    const WIDTH = 100;
    const VIEW = 300;
    let scrollTo: jest.SpyInstance;
    beforeEach(() => {
      scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
    });
    afterEach(() => scrollTo.mockRestore());
    const centred = (index: number) => Math.max(0, index * STEP + WIDTH / 2 - VIEW / 2);
    const layoutStrip = () => {
      fireEvent(screen.getByLabelText('זמני היום'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: VIEW, height: 80 } },
      });
      ZMAN_IDS.forEach((id, index) =>
        fireEvent(screen.getByTestId(`home-zman-${id}`), 'layout', {
          nativeEvent: { layout: { x: index * STEP, y: 0, width: WIDTH, height: 56 } },
        }),
      );
    };

    it('centres the next chip first, then the pressed chip, then the next chip again', () => {
      setup();
      layoutStrip();
      const next = ZMAN_IDS.indexOf(nextZman(F, NOON)!.id);
      expect(scrollTo).toHaveBeenLastCalledWith({ x: centred(next), animated: false });
      fireEvent.press(screen.getByTestId('home-zman-shkia'));
      expect(scrollTo).toHaveBeenLastCalledWith({ x: centred(ZMAN_IDS.indexOf('shkia')), animated: true });
      fireEvent.press(screen.getByTestId('home-zman-netz'));
      expect(scrollTo).toHaveBeenLastCalledWith({ x: centred(ZMAN_IDS.indexOf('netz')), animated: true });
      fireEvent.press(screen.getByTestId('home-zman-netz'));
      expect(scrollTo).toHaveBeenLastCalledWith({ x: centred(next), animated: true });
    });

    it('centres the chip that carries the border, whichever it is', () => {
      setup();
      layoutStrip();
      ZMAN_IDS.forEach((id) => {
        fireEvent.press(screen.getByTestId(`home-zman-${id}`));
        expect(gilded()).toEqual([id]);
        expect(scrollTo).toHaveBeenLastCalledWith({ x: centred(ZMAN_IDS.indexOf(id)), animated: true });
        fireEvent.press(screen.getByTestId(`home-zman-${id}`));
      });
    });

    it('never scrolls before the first chip', () => {
      setup();
      layoutStrip();
      fireEvent.press(screen.getByTestId('home-zman-alot'));
      expect(scrollTo).toHaveBeenLastCalledWith({ x: 0, animated: true });
    });
  });

  it.each([
    ['noon', NOON],
    ['night', NIGHT],
  ])('draws both edge pills at 0.2 over the sky with no shadow, in the readable ink at %s', (_name, now) => {
    const frame = frameAt(now);
    const { ink } = edgeInk(skyAt(frame, now), COLORS.surface);
    setup(now);
    [
      ['home-arc-edge-start', 'עלות', clockOf(frame.start, J.tz)],
      ['home-arc-edge-end', 'צאה״כ', clockOf(frame.tzeit, J.tz)],
    ].forEach(([testID, label, time]) => {
      const pill = screen.getByTestId(testID);
      expect(styleOf(pill)).toMatchObject({ backgroundColor: alphaHex(COLORS.surface, CHIP_ALPHA) });
      expect(styleOf(pill).shadowOpacity).toBeUndefined();
      expect(StyleSheet.flatten(within(pill).getByText(label).props.style).color).toBe(ink);
      expect(StyleSheet.flatten(within(pill).getByText(time).props.style).color).toBe(ink);
    });
  });

  it('flips the edge pill ink between noon and night', () => {
    expect(edgeInk(skyAt(F, NOON), COLORS.surface).ink).not.toBe(edgeInk(skyAt(F, NIGHT), COLORS.surface).ink);
  });

  it.each([
    ['noon', NOON],
    ['night', NIGHT],
  ])('draws the chip text in the readable ink at %s', (_name, now) => {
    setup(now);
    const frame = frameAt(now);
    const sky = skyAt(frame, now);
    const next = nextZman(frame, now)?.id;
    frame.zmanim.forEach((z) => {
      const { ink } = chipInk(sky, z.id === next ? COLORS.goldLight : COLORS.surface);
      const chip = within(screen.getByTestId(`home-zman-${z.id}`));
      const time = clockOf(z.at, J.tz);
      expect(StyleSheet.flatten(chip.getByText(time).props.style).color).toBe(ink);
    });
  });

  it('steps the preview by 15 minutes through the accessibility actions', () => {
    setup();
    const grab = screen.getByTestId('home-arc-grab');
    fireEvent(grab, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(screen.getByTestId('home-arc-clock')).toHaveTextContent('12:45');
    fireEvent(screen.getByTestId('home-arc-grab'), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    fireEvent(screen.getByTestId('home-arc-grab'), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(screen.getByTestId('home-arc-clock')).toHaveTextContent('12:15');
  });

  const WINDOW = Dimensions.get('window');
  const stageK = sceneScale(WINDOW.height);
  const stageShift = stageOffset(stageUnits(WINDOW.width, stageK));
  const touchAt = (p: { x: number; y: number }) => ({
    locationX: (p.x - stageShift) * stageK,
    locationY: p.y * stageK,
  });

  it('drags the sun and keeps the preview after release', () => {
    const { onScrubChange } = setup();
    const k = stageK;
    const o = arcPoint(NOON, F, true);
    const grab = screen.getByTestId('home-arc-grab');
    expect(fireEvent(grab, 'startShouldSetResponder', { nativeEvent: touchAt(o) })).toBe(true);
    expect(fireEvent(grab, 'startShouldSetResponder', { nativeEvent: touchAt({ x: o.x + 60, y: o.y }) })).toBe(false);
    act(() => {
      fireEvent(grab, 'responderGrant', { nativeEvent: { ...touchAt(o), pageX: 500, pageY: 500 } });
    });
    expect(onScrubChange).toHaveBeenLastCalledWith(true);
    act(() => {
      fireEvent(grab, 'responderMove', {
        nativeEvent: { pageX: 500 + (175 - o.x) * k, pageY: 500 + (46 - o.y) * k },
      });
    });
    const expected = dragMove(dragStart(o, NOON.getTime(), F, true), { x: 175, y: 46 }, F, true)!;
    expect(screen.getByTestId('home-arc-clock')).toHaveTextContent(clockOf(new Date(expected.atMs), J.tz));
    act(() => {
      fireEvent(grab, 'responderRelease', { nativeEvent: {} });
    });
    expect(onScrubChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByText('חזרה לעכשיו')).toBeOnTheScreen();
  });

  it('shows the drag hint until the first interaction, and the moon hint at night', () => {
    setup();
    expect(screen.getByText('גררו את השמש')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('home-zman-shkia'));
    expect(screen.queryByText('גררו את השמש')).toBeNull();
  });

  it('names the moon at night', () => {
    setup(at(J, '2026-10-29T20:15'));
    expect(screen.getByText('גררו את הירח')).toBeOnTheScreen();
  });

  it('draws only the top row without a frame', () => {
    const { onSkyTop } = setup(NOON, null);
    expect(screen.queryByTestId('home-arc')).toBeNull();
    expect(screen.queryByTestId('home-zman-alot')).toBeNull();
    expect(screen.getByText('צהריים טובים, דוד')).toBeOnTheScreen();
    expect(onSkyTop).toHaveBeenLastCalledWith(null);
  });

  it('clears the preview when the app day turns', () => {
    const { view, onScrubChange, onSkyTop } = setup();
    fireEvent.press(screen.getByTestId('home-zman-shkia'));
    expect(screen.getByText('חזרה לעכשיו')).toBeOnTheScreen();
    const tomorrow = at(J, '2026-10-30T12:30');
    view.rerender(<DayArcHero {...heroProps(tomorrow, frameAt(tomorrow), onScrubChange, onSkyTop)} />);
    expect(screen.queryByText('חזרה לעכשיו')).toBeNull();
    expect(screen.getByTestId('home-arc-clock')).toHaveTextContent('12:30');
  });

  it('releases the scrub when the frame disappears mid-drag', () => {
    const { view, onScrubChange, onSkyTop } = setup();
    const o = arcPoint(NOON, F, true);
    act(() => {
      fireEvent(screen.getByTestId('home-arc-grab'), 'responderGrant', {
        nativeEvent: { ...touchAt(o), pageX: 500, pageY: 500 },
      });
    });
    expect(onScrubChange).toHaveBeenLastCalledWith(true);
    view.rerender(<DayArcHero {...heroProps(NOON, null, onScrubChange, onSkyTop)} />);
    expect(screen.queryByTestId('home-arc-grab')).toBeNull();
    expect(onScrubChange).toHaveBeenLastCalledWith(false);
  });

  it('releases the scrub on unmount', () => {
    const { view, onScrubChange } = setup();
    const o = arcPoint(NOON, F, true);
    act(() => {
      fireEvent(screen.getByTestId('home-arc-grab'), 'responderGrant', {
        nativeEvent: { ...touchAt(o), pageX: 500, pageY: 500 },
      });
    });
    expect(onScrubChange).toHaveBeenLastCalledWith(true);
    view.unmount();
    expect(onScrubChange).toHaveBeenLastCalledWith(false);
  });

  describe('one circle for the day and the night', () => {
    const arcs = (d: string) => screen.UNSAFE_getAllByType(Path).filter((p) => p.props.d === d);
    const ticks = () =>
      screen.UNSAFE_getAllByType(Circle).filter((c) => c.props.strokeWidth === 2 && [6, 9].includes(c.props.r));
    const orb = (kind: 'sun' | 'moon') =>
      screen
        .UNSAFE_getAllByType(Circle)
        .filter((c) => (kind === 'moon' ? c.props.mask : c.props.r === 15 && c.props.fill))[0];

    it('draws the day half with its progress and the night half with its track only, by day', () => {
      setup();
      const { fraction } = arcFraction(NOON, F);
      const sky = inkFor(skyAt(F, NOON));
      const [dayTrack, dayLit] = arcs(dayPath(true));
      expect(arcs(dayPath(true))).toHaveLength(2);
      expect(arcs(nightPath(true))).toHaveLength(1);
      expect(dayTrack.props).toMatchObject({ stroke: sky.ink, strokeDasharray: '1 8' });
      expect(dayLit.props.strokeDasharray).toBeCloseTo(HALF_LENGTH, 6);
      expect(dayLit.props.strokeDashoffset).toBeCloseTo(HALF_LENGTH - arcLength(fraction), 6);
      expect(arcs(nightPath(true))[0].props).toMatchObject({ stroke: SKY_SCENE.moon, strokeDasharray: '1 8' });
    });

    it('lights the whole day half at night and the night half up to the moon, in the moon colour', () => {
      setup(NIGHT);
      const { night, fraction } = arcFraction(NIGHT, frameAt(NIGHT));
      expect(night).toBe(true);
      const [, dayLit] = arcs(dayPath(true));
      expect(dayLit.props.strokeDashoffset).toBe(0);
      const [nightTrack, nightLit] = arcs(nightPath(true));
      expect(nightTrack.props).toMatchObject({ stroke: SKY_SCENE.moon, strokeDasharray: '1 8' });
      expect(nightLit.props.stroke).toBe(SKY_SCENE.moon);
      expect(nightLit.props.strokeDasharray).toBeCloseTo(HALF_LENGTH, 6);
      expect(nightLit.props.strokeDashoffset).toBeCloseTo(HALF_LENGTH - arcLength(fraction), 6);
    });

    it('rides the sun on the upper half by day', () => {
      setup();
      const sun = arcPoint(NOON, F, true);
      expect(sun.y).toBeLessThan(ARC.cy);
      expect(orb('sun').props).toMatchObject({ cx: sun.x, cy: sun.y });
      expect(screen.UNSAFE_queryAllByType(Circle).filter((c) => c.props.mask)).toHaveLength(0);
    });

    it('rides the moon on the lower half of the same circle by night', () => {
      setup(NIGHT);
      const moon = arcPoint(NIGHT, frameAt(NIGHT), true);
      expect(moon.y).toBeGreaterThan(ARC.cy);
      expect(orb('moon').props).toMatchObject({ cx: moon.x, cy: moon.y, r: 14 });
      expect(Math.hypot(moon.x - ARC.cx, moon.y - ARC.cy)).toBeCloseTo(ARC.r, 6);
    });

    it.each([
      ['noon', NOON],
      ['night', NIGHT],
    ])('keeps the zman ticks on the day half and chatzot halayla on the night half at %s', (_name, now) => {
      setup(now);
      const frame = frameAt(now);
      const drawn = ticks();
      expect(drawn).toHaveLength(frame.zmanim.length);
      frame.zmanim.forEach((z, i) => {
        const p = arcPoint(z.at, frame, true);
        expect(drawn[i].props).toMatchObject({ cx: p.x, cy: p.y });
        if (z.id === 'chatzotLayla') expect(p.y).toBeGreaterThan(ARC.cy + 100);
        else expect(p.y).toBeLessThanOrEqual(ARC.cy);
      });
    });

    it('draws the stage as wide as the window, centred on the circle', () => {
      const width = 390;
      const height = 844;
      const win = { width, height, scale: 3, fontScale: 1 };
      const get = jest.spyOn(Dimensions, 'get').mockReturnValue(win);
      try {
        setup();
        const k = sceneScale(height);
        const units = stageUnits(width, k);
        const viewBox = `${stageOffset(units)} 0 ${units} ${ARC.height}`;
        expect(styleOf(screen.getByTestId('home-arc'))).toMatchObject({ width: units * k, height: ARC.height * k });
        expect(units * k).toBeCloseTo(width, 9);
        expect(stageOffset(units)).toBeCloseTo(175 - width / k / 2, 9);
        const sizes = screen.UNSAFE_getAllByType(Svg).filter((s) => s.props.viewBox === viewBox);
        expect(sizes).toHaveLength(2);
        sizes.forEach((s) => expect(s.props).toMatchObject({ width: units * k, height: ARC.height * k }));
        const hills = screen.UNSAFE_getAllByType(Svg).find((s) => s.props.viewBox === `-20 0 390 ${ARC.skyHeight}`)!;
        expect(hills.props.height).toBeCloseTo(ARC.skyHeight * k, 9);
        ['home-arc-edge-start', 'home-arc-edge-end'].forEach((id) =>
          expect(styleOf(screen.getByTestId(id))).toMatchObject({ top: 166 * k }),
        );
        expect(styleOf(screen.getByTestId('home-arc-edge-start')).start).toBe(spacing.sm);
        expect(styleOf(screen.getByTestId('home-arc-edge-end')).end).toBe(spacing.sm);
      } finally {
        get.mockRestore();
      }
    });

    const drag = (now: Date, to: { x: number; y: number }[]) => {
      setup(now);
      const frame = frameAt(now);
      const origin = arcPoint(now, frame, true);
      const grab = screen.getByTestId('home-arc-grab');
      act(() => {
        fireEvent(grab, 'responderGrant', { nativeEvent: { ...touchAt(origin), pageX: 500, pageY: 500 } });
      });
      let state = dragStart(origin, now.getTime(), frame, true);
      return to.map((p) => {
        act(() => {
          fireEvent(grab, 'responderMove', {
            nativeEvent: { pageX: 500 + (p.x - origin.x) * stageK, pageY: 500 + (p.y - origin.y) * stageK },
          });
        });
        const r = dragMove(state, p, frame, true)!;
        state = r.state;
        return { shown: screen.getByTestId('home-arc-clock').props.children as string, expected: r.atMs, frame };
      });
    };

    it('drags the sun through the tzeit end into the night half and back with the moon', () => {
      const before = at(J, '2026-10-29T17:12');
      const frame = frameAt(before);
      const after = new Date(frame.tzeit.getTime() + 20 * 60000);
      const [across, back] = drag(before, [arcPoint(after, frame, true), arcPoint(before, frame, true)]);
      expect(across.expected).toBeGreaterThan(frame.tzeit.getTime());
      expect(across.shown).toBe(clockOf(new Date(across.expected), J.tz));
      expect(back.shown).toBe(clockOf(new Date(back.expected), J.tz));
      expect(Math.abs(back.expected - before.getTime())).toBeLessThanOrEqual(2);
    });

    it('turns the sun into the moon on the lower half while dragging across the tzeit end', () => {
      const before = at(J, '2026-10-29T17:12');
      const frame = frameAt(before);
      const after = arcPoint(new Date(frame.tzeit.getTime() + 20 * 60000), frame, true);
      expect(after.y).toBeGreaterThan(ARC.cy);
      drag(before, [after]);
      expect(screen.UNSAFE_queryAllByType(Circle).filter((c) => c.props.mask)).toHaveLength(1);
      expect(orb('moon').props.cy).toBeGreaterThan(ARC.cy);
    });

    it('holds at alot when the drag crosses the alot end into the night half', () => {
      const early = at(J, '2026-10-29T04:59');
      const frame = frameAt(early);
      const [held] = drag(early, [arcPoint(new Date(frame.end.getTime() - 20 * 60000), frame, true)]);
      expect(held.expected).toBe(frame.start.getTime());
      expect(held.shown).toBe(clockOf(frame.start, J.tz));
    });

    it('holds just before the next alot when the drag crosses the alot end into the day half', () => {
      const late = at(J, '2026-10-30T04:19');
      const frame = frameAt(late);
      const [held] = drag(late, [arcPoint(new Date(frame.start.getTime() + 20 * 60000), frame, true)]);
      expect(held.expected).toBe(frame.end.getTime() - 60000);
    });
  });

  it('scales the scene to about half the screen, between 179 and 286 points high', () => {
    expect(sceneScale(1334)).toBe(1);
    expect(sceneScale(844)).toBeCloseTo(254 / 286, 6);
    expect(sceneScale(600)).toBeCloseTo(179 / 286, 6);
  });
});
