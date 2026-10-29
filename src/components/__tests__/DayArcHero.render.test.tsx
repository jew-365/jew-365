import { Dimensions, I18nManager, ScrollView, StyleSheet } from 'react-native';
import type { ComponentProps } from 'react';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { AppLogo } from '../AppLogo';
import { BACK_TOUCH, BLOCK_GAP, DayArcHero, sceneScale } from '../DayArcHero';
import { CITIES } from '@/data/cities';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';
import { useUserStore } from '@/stores/useUserStore';
import { THEMES } from '@/theme/colors';
import { scaled } from '@/theme/scale';
import { radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import {
  alphaHex,
  arcPoint,
  BACK_ALPHA,
  CHIP_ALPHA,
  chipInk,
  dayFrameFor,
  dragMove,
  dragStart,
  edgeInk,
  inkFor,
  nextZman,
  skyAt,
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
    640: [-4.46, 0.54, 18.83, 23.83],
    812: [-0.55, 4.45, 26.78, 31.78],
    844: [1.86, 6.86, 31.67, 36.67],
    915: [5.46, 10.46, 39, 44],
    1000: [5.46, 10.46, 39, 44],
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

  it('drags the sun and keeps the preview after release', () => {
    const { onScrubChange } = setup();
    const k = sceneScale(Dimensions.get('window').height);
    const o = arcPoint(NOON, F, true);
    const grab = screen.getByTestId('home-arc-grab');
    expect(
      fireEvent(grab, 'startShouldSetResponder', { nativeEvent: { locationX: o.x * k, locationY: o.y * k } }),
    ).toBe(true);
    expect(
      fireEvent(grab, 'startShouldSetResponder', { nativeEvent: { locationX: o.x * k + 60 * k, locationY: o.y * k } }),
    ).toBe(false);
    act(() => {
      fireEvent(grab, 'responderGrant', {
        nativeEvent: { locationX: o.x * k, locationY: o.y * k, pageX: 500, pageY: 500 },
      });
    });
    expect(onScrubChange).toHaveBeenLastCalledWith(true);
    act(() => {
      fireEvent(grab, 'responderMove', {
        nativeEvent: { pageX: 500 + (175 - o.x) * k, pageY: 500 + (42 - o.y) * k },
      });
    });
    const expected = dragMove(dragStart(o, NOON.getTime(), F, true), { x: 175, y: 42 }, F, true)!;
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
    const k = sceneScale(Dimensions.get('window').height);
    const o = arcPoint(NOON, F, true);
    act(() => {
      fireEvent(screen.getByTestId('home-arc-grab'), 'responderGrant', {
        nativeEvent: { locationX: o.x * k, locationY: o.y * k, pageX: 500, pageY: 500 },
      });
    });
    expect(onScrubChange).toHaveBeenLastCalledWith(true);
    view.rerender(<DayArcHero {...heroProps(NOON, null, onScrubChange, onSkyTop)} />);
    expect(screen.queryByTestId('home-arc-grab')).toBeNull();
    expect(onScrubChange).toHaveBeenLastCalledWith(false);
  });

  it('releases the scrub on unmount', () => {
    const { view, onScrubChange } = setup();
    const k = sceneScale(Dimensions.get('window').height);
    const o = arcPoint(NOON, F, true);
    act(() => {
      fireEvent(screen.getByTestId('home-arc-grab'), 'responderGrant', {
        nativeEvent: { locationX: o.x * k, locationY: o.y * k, pageX: 500, pageY: 500 },
      });
    });
    expect(onScrubChange).toHaveBeenLastCalledWith(true);
    view.unmount();
    expect(onScrubChange).toHaveBeenLastCalledWith(false);
  });

  it('scales the scene to about half the screen', () => {
    expect(sceneScale(1334)).toBe(1);
    expect(sceneScale(844)).toBeCloseTo(192 / 216, 6);
    expect(sceneScale(600)).toBeCloseTo(150 / 216, 6);
  });
});
