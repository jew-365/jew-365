import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type AccessibilityActionEvent,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { AppLogo } from './AppLogo';
import { DaySkyScene } from './DaySkyScene';
import { MitzvahIcon } from './MitzvahIcon';
import { useIsFocused } from '@/hooks/useIsFocused';
import { useRowMirrored } from '@/hooks/useRowMirrored';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { BRAND } from '@/theme/colors';
import { scaled } from '@/theme/scale';
import { radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { clockOf } from '@/utils/clock';
import {
  alphaHex,
  ARC,
  arcFraction,
  arcPoint,
  BACK_ALPHA,
  CHIP_ALPHA,
  chipInk,
  dragMove,
  dragStart,
  groundColors,
  inkFor,
  LAND_OPACITY,
  nextZman,
  relativeLabel,
  skyAt,
  stageOffset,
  stageUnits,
  type ArcPoint,
  type ArcZman,
  type DayFrame,
  type DragState,
  type ZmanId,
} from '@/utils/dayArc';

export const SCENE_MIN = scaled(179);
export const SCENE_MAX = scaled(ARC.height);
export const HERO_CHROME = scaled(168);

export function sceneScale(windowHeight: number): number {
  return Math.min(SCENE_MAX, Math.max(SCENE_MIN, windowHeight / 2 - HERO_CHROME)) / ARC.height;
}

const LOGO = scaled(40);
const HALO = scaled(52);
const GREETING_PAD = scaled(6);
export const BACK_TOUCH = scaled(44);
export const BLOCK_GAP = scaled(17);
const BACK_ICON = scaled(18);
const BACK_HIT_SLOP = scaled(8);
const BORDER = 2;
const CHIP_MIN = scaled(52);
const CHIP_PAD_X = scaled(14);
const CHIP_PAD_Y = scaled(7);
const CHIP_RADIUS = scaled(14);
const GRAB_RADIUS = 30;
const STEP_MS = 15 * 60000;

function BackPill({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={BACK_HIT_SLOP}
      style={({ pressed }) => [
        styles.backPill,
        { backgroundColor: alphaHex(pressed ? colors.surface2 : colors.surface, BACK_ALPHA), borderColor: colors.gold },
      ]}
    >
      <MitzvahIcon name="undo" size={BACK_ICON} color={colors.text} strokeWidth={2.2} />
      <Text style={[typography.captionBold, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

type DragRef = { state: DragState; startPoint: ArcPoint; startPageX: number; startPageY: number };
type Preview = { atMs: number; zman: ZmanId | null };

export type DayArcHeroProps = {
  frame: DayFrame | null;
  now: Date;
  tz: string;
  greeting: string;
  dateLine: string;
  caption: string;
  onScrubChange: (active: boolean) => void;
  onSkyTop: (sky: { color: string; lightInk: boolean } | null) => void;
};

export const DayArcHero = React.memo(function DayArcHero({
  frame,
  now,
  tz,
  greeting,
  dateLine,
  caption,
  onScrubChange,
  onSkyTop,
}: DayArcHeroProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const rtl = useRowMirrored();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const k = sceneScale(windowHeight);
  const units = stageUnits(windowWidth, k);
  const offset = stageOffset(units);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [touched, setTouched] = useState(false);
  const drag = useRef<DragRef | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const chipLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const viewWidth = useRef(0);
  const centredOnce = useRef(false);
  const focused = useIsFocused();
  const frameStart = frame ? frame.start.getTime() : null;
  const hasFrame = frame !== null;
  const onScrubRef = useRef(onScrubChange);
  onScrubRef.current = onScrubChange;

  useEffect(() => {
    setPreview(null);
  }, [frameStart]);

  useEffect(() => {
    if (!focused) setPreview(null);
  }, [focused]);

  useEffect(() => {
    if (hasFrame) return;
    drag.current = null;
    onScrubRef.current(false);
  }, [hasFrame]);

  useEffect(
    () => () => {
      drag.current = null;
      onScrubRef.current(false);
    },
    [],
  );

  const shownMs = preview ? preview.atMs : now.getTime();
  const shown = useMemo(() => new Date(shownMs), [shownMs]);
  const sky = useMemo(() => (frame ? skyAt(frame, shown) : null), [frame, shown]);
  const ink = useMemo(
    () => (sky ? inkFor(sky) : { ink: colors.text, chip: colors.surface, light: false }),
    [sky, colors.text, colors.surface],
  );
  const skyTop = sky ? sky.top : null;
  const chipInks = useMemo(
    () => ({
      plain: sky ? chipInk(sky, colors.surface).ink : colors.text,
      next: sky ? chipInk(sky, colors.goldLight).ink : colors.text,
    }),
    [sky, colors.surface, colors.goldLight, colors.text],
  );

  useEffect(() => {
    onSkyTop(skyTop ? { color: skyTop, lightInk: ink.light } : null);
  }, [skyTop, ink.light, onSkyTop]);

  const nextId = frame ? (nextZman(frame, shown)?.id ?? null) : null;
  const selectedId = preview?.zman ?? null;
  const markedId = selectedId ?? nextId;
  const centreRef = useRef(markedId);
  centreRef.current = markedId;
  const centre = useCallback(() => {
    const id = centreRef.current;
    const place = id ? chipLayouts.current[id] : undefined;
    if (!place || viewWidth.current === 0) return;
    scrollRef.current?.scrollTo({
      x: Math.max(0, place.x + place.width / 2 - viewWidth.current / 2),
      animated: centredOnce.current,
    });
    centredOnce.current = true;
  }, []);
  useEffect(() => {
    centre();
  }, [markedId, centre]);

  const topRow = (
    <View
      testID="home-top-chip"
      style={[styles.topRow, { backgroundColor: ink.chip, flexDirection: rtl ? 'row' : 'row-reverse' }]}
    >
      <View style={styles.greeting}>
        <Text style={[typography.caption, { color: ink.ink }]}>{dateLine}</Text>
        <Text accessibilityRole="header" style={[typography.title, { color: ink.ink }]}>
          {greeting}
        </Text>
      </View>
      <View style={styles.flex} />
      <View testID="home-logo" style={styles.logo}>
        <Svg
          testID="home-logo-halo"
          width={HALO}
          height={HALO}
          viewBox="0 0 100 100"
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <RadialGradient id="homeLogoHalo">
              <Stop offset="0" stopColor={BRAND.white} stopOpacity={0.75} />
              <Stop offset="0.7" stopColor={BRAND.white} stopOpacity={0.55} />
              <Stop offset="1" stopColor={BRAND.white} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx="50" cy="50" r="50" fill="url(#homeLogoHalo)" />
        </Svg>
        <AppLogo variant="icon" size={LOGO} />
      </View>
    </View>
  );

  if (!frame || !sky) {
    return (
      <View
        testID="home-hero"
        accessibilityLabel={t('home.arc.label')}
        style={[styles.root, { backgroundColor: colors.surface2, paddingBottom: spacing.lg }]}
      >
        {topRow}
      </View>
    );
  }

  const { night } = arcFraction(shown, frame);
  const ground = groundColors(sky);
  const selectedZman: ArcZman | null = preview?.zman ? (frame.zmanim.find((z) => z.id === preview.zman) ?? null) : null;
  const target: { name: string; at: Date } = selectedZman
    ? { name: t(`home.zman.${selectedZman.id}.name`), at: selectedZman.at }
    : nextId
      ? { name: t(`home.zman.${nextId}.name`), at: frame.zmanim.find((z) => z.id === nextId)!.at }
      : { name: t('home.zman.alotTomorrow'), at: frame.end };
  const targetText = `${target.name} · ${clockOf(target.at, tz)} ${relativeLabel(target.at, shown, t)}`;

  const clampTo = (ms: number) => Math.min(frame.end.getTime() - 60000, Math.max(frame.start.getTime(), ms));

  const arcPointOf = (e: GestureResponderEvent): ArcPoint => ({
    x: e.nativeEvent.locationX / k + offset,
    y: e.nativeEvent.locationY / k,
  });

  const grab = (
    <View
      testID="home-arc-grab"
      style={StyleSheet.absoluteFill}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={t('home.arc.slider')}
      accessibilityValue={{ text: t('home.arc.sliderValue', { time: clockOf(shown, tz), next: targetText }) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e: AccessibilityActionEvent) => {
        const step =
          e.nativeEvent.actionName === 'increment' ? STEP_MS : e.nativeEvent.actionName === 'decrement' ? -STEP_MS : 0;
        if (step === 0) return;
        setPreview({ atMs: clampTo(shown.getTime() + step), zman: null });
      }}
      onStartShouldSetResponder={(e?: GestureResponderEvent) => {
        if (!e) return true;
        const sun = arcPoint(shown, frame, rtl);
        const touch = arcPointOf(e);
        return Math.hypot(touch.x - sun.x, touch.y - sun.y) <= GRAB_RADIUS;
      }}
      onMoveShouldSetResponder={() => false}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e: GestureResponderEvent) => {
        const p0 = arcPointOf(e);
        drag.current = {
          state: dragStart(p0, shown.getTime(), frame, rtl),
          startPoint: p0,
          startPageX: e.nativeEvent.pageX,
          startPageY: e.nativeEvent.pageY,
        };
        setTouched(true);
        onScrubChange(true);
      }}
      onResponderMove={(e: GestureResponderEvent) => {
        const current = drag.current;
        if (!current) return;
        const p = {
          x: current.startPoint.x + (e.nativeEvent.pageX - current.startPageX) / k,
          y: current.startPoint.y + (e.nativeEvent.pageY - current.startPageY) / k,
        };
        const r = dragMove(current.state, p, frame, rtl);
        if (!r) return;
        current.state = r.state;
        setPreview({ atMs: r.atMs, zman: null });
      }}
      onResponderRelease={() => {
        drag.current = null;
        onScrubChange(false);
      }}
      onResponderTerminate={() => {
        drag.current = null;
        onScrubChange(false);
      }}
    />
  );

  const onChipPress = (z: ArcZman) => {
    if (preview?.zman === z.id) setPreview(null);
    else {
      setPreview({ atMs: z.at.getTime(), zman: z.id });
      setTouched(true);
    }
  };

  return (
    <View testID="home-hero" accessibilityLabel={t('home.arc.label')} style={styles.root}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="homeSky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={sky.top} />
              <Stop offset="0.32" stopColor={sky.mid} />
              <Stop offset="0.6" stopColor={sky.bot} />
              <Stop offset="1" stopColor={sky.bot} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#homeSky)" />
        </Svg>
      </View>
      {topRow}
      <View testID="home-arc-block" style={styles.block}>
        <View style={[styles.land, { top: BLOCK_GAP + 158 * k }]} pointerEvents="none">
          <Svg width="100%" height="100%" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="homeLand" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={ground.shadeTop} stopOpacity={LAND_OPACITY.top} />
                <Stop offset="1" stopColor={ground.shadeBottom} stopOpacity={LAND_OPACITY.bottom} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#homeLand)" />
          </Svg>
        </View>
        <DaySkyScene
          frame={frame}
          shown={shown}
          live={now}
          previewing={preview !== null}
          selected={preview?.zman ?? null}
          rtl={rtl}
          k={k}
          units={units}
          sky={sky}
          ink={ink}
          clock={clockOf(shown, tz)}
          caption={preview ? t('home.arc.preview') : caption}
          hint={!touched && !preview ? t(night ? 'home.arc.dragMoon' : 'home.arc.dragSun') : null}
          edgeStart={{ label: t('home.zman.alot.short'), time: clockOf(frame.start, tz) }}
          edgeEnd={{ label: t('home.zman.tzeit.short'), time: clockOf(frame.tzeit, tz) }}
          grab={grab}
        />
        {preview ? (
          <View testID="home-arc-back" pointerEvents="box-none" style={styles.back}>
            <BackPill label={t('home.arc.back')} onPress={() => setPreview(null)} />
          </View>
        ) : null}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityLabel={t('home.arc.chips')}
          contentContainerStyle={styles.chips}
          onLayout={(e: LayoutChangeEvent) => {
            viewWidth.current = e.nativeEvent.layout.width;
            if (!centredOnce.current) centre();
          }}
        >
          {frame.zmanim.map((z) => {
            const selected = z.id === selectedId;
            const isNextChip = z.id === nextId;
            const marked = z.id === markedId;
            const past = z.at.getTime() <= shown.getTime() && !isNextChip;
            const short = t(`home.zman.${z.id}.short`);
            const time = clockOf(z.at, tz);
            const label = isNextChip ? t('home.arc.chipNext', { name: short }) : short;
            const textColor = selected ? colors.bg : isNextChip ? chipInks.next : chipInks.plain;
            return (
              <Pressable
                key={z.id}
                testID={`home-zman-${z.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${t(`home.zman.${z.id}.name`)}, ${time}`}
                accessibilityState={{ selected }}
                onPress={() => onChipPress(z)}
                onLayout={(e: LayoutChangeEvent) => {
                  chipLayouts.current[z.id] = { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width };
                  if (!centredOnce.current && z.id === centreRef.current) centre();
                }}
                style={[
                  styles.chip,
                  { backgroundColor: alphaHex(isNextChip ? colors.goldLight : colors.surface, CHIP_ALPHA) },
                  marked && { borderColor: colors.gold },
                  selected && { backgroundColor: colors.text },
                ]}
              >
                <Text style={[typography.small, { color: textColor }]}>{label}</Text>
                <Text style={[past ? typography.body : typography.bodyBold, { color: textColor }]}>{time}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { width: '100%', paddingTop: spacing.lg },
  block: { paddingTop: BLOCK_GAP },
  flex: { flex: 1 },
  topRow: {
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: GREETING_PAD,
    borderRadius: radius.xl,
  },
  greeting: { flexShrink: 1 },
  logo: {
    width: HALO,
    height: HALO,
    marginVertical: (LOGO - HALO) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  land: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  back: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    height: BACK_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm - BORDER,
    paddingHorizontal: spacing.md - BORDER,
    borderWidth: BORDER,
    borderRadius: radius.full,
  },
  chips: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    minHeight: CHIP_MIN,
    paddingHorizontal: CHIP_PAD_X,
    paddingVertical: CHIP_PAD_Y,
    borderRadius: CHIP_RADIUS,
    borderWidth: BORDER,
    borderColor: 'transparent',
    justifyContent: 'center',
  },
});
