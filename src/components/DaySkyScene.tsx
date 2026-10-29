import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Mask,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { BRAND } from '@/theme/colors';
import { scaled } from '@/theme/scale';
import { SKY_SCENE, type SkyStop } from '@/theme/sky';
import { radius, spacing } from '@/theme/tokens';
import { fontFamilies, typography } from '@/theme/typography';
import {
  alphaHex,
  ARC,
  arcFraction,
  arcLength,
  arcPoint,
  CHIP_ALPHA,
  dayPath,
  edgeInk,
  groundColors,
  HALF_LENGTH,
  nextZman,
  nightPath,
  nightShare,
  stageOffset,
  sunColors,
  type DayFrame,
  type ZmanId,
} from '@/utils/dayArc';

const CLOCK_SIZE = scaled(40);
const CLOCK_LINE = scaled(44);
const CAPTION_MAX = scaled(230);

const STARS: readonly (readonly [number, number, number])[] = [
  [46, 40, 2.6],
  [92, 20, 2],
  [128, 62, 2],
  [224, 28, 3],
  [262, 60, 2],
  [302, 34, 2.6],
  [22, 94, 2],
  [330, 92, 2],
  [64, 122, 1.8],
  [288, 122, 1.8],
  [20, 18, 1.8],
  [172, 10, 1.8],
  [200, 52, 1.6],
  [334, 20, 1.8],
  [112, 34, 1.6],
  [48, 70, 1.6],
  [308, 76, 1.6],
  [14, 140, 1.6],
  [338, 140, 1.6],
];

const CLOUDS: readonly (readonly [number, number, number, number])[] = [
  [20, 34, 84, 0.85],
  [196, 84, 120, 0.8],
  [268, 122, 70, 0.7],
];

type Edge = { label: string; time: string };

type DaySkySceneProps = {
  frame: DayFrame;
  shown: Date;
  live: Date;
  previewing: boolean;
  selected: ZmanId | null;
  rtl: boolean;
  k: number;
  units: number;
  sky: SkyStop;
  ink: { ink: string; chip: string };
  clock: string;
  caption: string;
  hint: string | null;
  edgeStart: Edge;
  edgeEnd: Edge;
  grab: React.ReactNode;
};

export function DaySkyScene({
  frame,
  shown,
  live,
  previewing,
  selected,
  rtl,
  k,
  units,
  sky,
  ink,
  clock,
  caption,
  hint,
  edgeStart,
  edgeEnd,
  grab,
}: DaySkySceneProps) {
  const { colors } = useTheme();
  const { night, fraction } = arcFraction(shown, frame);
  const p = arcPoint(shown, frame, rtl);
  const { core, edge } = sunColors(frame, shown);
  const ground = groundColors(sky);
  const share = nightShare(frame, shown);
  const nextId = nextZman(frame, shown)?.id ?? null;
  const ghost = previewing && Math.abs(live.getTime() - shown.getTime()) > 240000 ? arcPoint(live, frame, rtl) : null;
  const originX = stageOffset(units);
  const width = units * k;
  const height = ARC.height * k;
  const box = { width, height };
  const viewBox = `${originX} 0 ${units} ${ARC.height}`;
  const dayDash = night ? 0 : HALF_LENGTH - arcLength(fraction);
  const nightDash = HALF_LENGTH - arcLength(fraction);
  const track = {
    stroke: ink.ink,
    strokeOpacity: 0.45,
    strokeWidth: 3,
    strokeDasharray: '1 8',
    strokeLinecap: 'round',
  } as const;
  const edgeColor = edgeInk(sky, colors.surface).ink;
  const edgePill = [styles.edge, { backgroundColor: alphaHex(colors.surface, CHIP_ALPHA), top: 166 * k }];
  const arcStart = ARC.cx + (rtl ? ARC.r : -ARC.r);
  const arcEnd = ARC.cx + (rtl ? -ARC.r : ARC.r);

  return (
    <View style={[styles.outer, { height }]}>
      <Svg
        width={width}
        height={height}
        viewBox={viewBox}
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={styles.backSvg}
      >
        <Defs>
          <LinearGradient id="homeArcGradient" gradientUnits="userSpaceOnUse" x1={arcStart} y1="0" x2={arcEnd} y2="0">
            {SKY_SCENE.arcStops.map(([offset, color]) => (
              <Stop key={offset} offset={offset} stopColor={color} />
            ))}
          </LinearGradient>
          <RadialGradient id="homeAura">
            <Stop offset="0" stopColor={core} stopOpacity={0.5} />
            <Stop offset="0.6" stopColor={core} stopOpacity={0.16} />
            <Stop offset="1" stopColor={core} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="homeSun" cx="38%" cy="34%" fx="38%" fy="34%" r="66%">
            <Stop offset="0" stopColor={SKY_SCENE.sunCenter} />
            <Stop offset="0.58" stopColor={core} />
            <Stop offset="1" stopColor={edge} />
          </RadialGradient>
          <Mask id="homeMoonMask" x={originX} y="0" width={units} height={ARC.height} maskUnits="userSpaceOnUse">
            <Rect x={originX} y="0" width={units} height={ARC.height} fill={BRAND.white} />
            <Circle cx={p.x + (rtl ? 9 : -9)} cy={p.y - 4} r={14} fill="#000000" />
          </Mask>
        </Defs>
        <G opacity={share * 0.6}>
          {STARS.map(([x, y, size]) => (
            <Circle key={`${x}-${y}`} cx={x} cy={y} r={size / 2} fill={BRAND.white} />
          ))}
        </G>
        <G opacity={(1 - share) * 0.9} fill={sky.cloud}>
          {CLOUDS.map(([x, y, w, opacity]) => (
            <G key={`${x}-${y}`} opacity={opacity} transform={`translate(${x} ${y}) scale(${w / 120})`}>
              <Ellipse cx={30} cy={34} rx={26} ry={14} />
              <Ellipse cx={62} cy={26} rx={28} ry={20} />
              <Ellipse cx={92} cy={34} rx={24} ry={13} />
              <Rect x={30} y={30} width={62} height={17} rx={8} />
            </G>
          ))}
        </G>
        <Path d={dayPath(rtl)} fill="none" {...track} />
        <Path
          d={dayPath(rtl)}
          fill="none"
          stroke="url(#homeArcGradient)"
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeDasharray={HALF_LENGTH}
          strokeDashoffset={dayDash}
        />
        <Path d={nightPath(rtl)} fill="none" {...track} stroke={SKY_SCENE.moon} />
        {night ? (
          <Path
            d={nightPath(rtl)}
            fill="none"
            stroke={SKY_SCENE.moon}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={HALF_LENGTH}
            strokeDashoffset={nightDash}
          />
        ) : null}
        {night ? (
          <Circle cx={p.x} cy={p.y} r={14} fill={SKY_SCENE.moon} mask="url(#homeMoonMask)" />
        ) : (
          <G>
            <Circle cx={p.x} cy={p.y} r={70} fill="url(#homeAura)" />
            <Circle cx={p.x} cy={p.y} r={27} fill={core} opacity={0.25} />
            <Circle cx={p.x} cy={p.y} r={21} fill={core} opacity={0.24} />
            <Circle cx={p.x} cy={p.y} r={15} fill="url(#homeSun)" />
          </G>
        )}
      </Svg>

      <Svg
        viewBox={`-20 0 390 ${ARC.skyHeight}`}
        preserveAspectRatio="none"
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        width="100%"
        height={ARC.skyHeight * k}
        style={styles.hills}
      >
        <Path d="M-20 158V142Q45 128 95 140T200 138T290 134T370 142V158Z" fill={ground.back} />
        <Path d="M-20 158V150Q60 140 120 150T250 148T370 150V158Z" fill={ground.front} />
        <Path d="M-20 158H370" stroke={ink.ink} strokeOpacity={0.35} strokeWidth={1.2} />
      </Svg>

      <View testID="home-arc" style={[styles.stage, box]}>
        <Svg
          width={width}
          height={height}
          viewBox={viewBox}
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={StyleSheet.absoluteFill}
        >
          {frame.zmanim.map((z) => {
            const pt = arcPoint(z.at, frame, rtl);
            const past = z.at.getTime() <= shown.getTime();
            const isNext = z.id === nextId;
            const isSelected = z.id === selected;
            return (
              <Circle
                key={z.id}
                cx={pt.x}
                cy={pt.y}
                r={isSelected ? 9 : 6}
                fill={past ? colors.gold : BRAND.white}
                stroke={isSelected ? BRAND.navy : past || isNext ? colors.gold : SKY_SCENE.tickRing}
                strokeWidth={2}
              />
            );
          })}
          {ghost ? (
            <Rect
              x={ghost.x - 5}
              y={ghost.y - 5}
              width={10}
              height={10}
              transform={`rotate(45 ${ghost.x} ${ghost.y})`}
              fill={ink.chip}
              stroke={ink.ink}
              strokeWidth={2}
              strokeDasharray="2 2"
            />
          ) : null}
        </Svg>

        <View pointerEvents="none" style={[styles.plate, { top: 66 * k }]}>
          <View style={[styles.plateInner, { backgroundColor: ink.chip }]}>
            <Text
              testID="home-arc-clock"
              style={{
                fontFamily: previewing ? fontFamilies.heebo.semibold : fontFamilies.heebo.regular,
                fontSize: CLOCK_SIZE,
                lineHeight: CLOCK_LINE,
                color: ink.ink,
                textAlign: 'center',
              }}
            >
              {clock}
            </Text>
            {caption ? (
              <Text style={[typography.captionBold, styles.caption, { color: ink.ink }]}>{caption}</Text>
            ) : null}
          </View>
        </View>

        {hint ? (
          <View pointerEvents="none" style={[styles.hint, { top: 172 * k }]}>
            <View style={[styles.hintPill, { backgroundColor: colors.surface }]}>
              <Text style={[typography.micro, { color: colors.text }]}>{hint}</Text>
            </View>
          </View>
        ) : null}

        <View testID="home-arc-edge-start" style={[edgePill, { start: spacing.sm }]}>
          <Text style={[typography.micro, { color: edgeColor }]}>{edgeStart.label}</Text>
          <Text style={[typography.captionBold, { color: edgeColor }]}>{edgeStart.time}</Text>
        </View>
        <View testID="home-arc-edge-end" style={[edgePill, { end: spacing.sm }]}>
          <Text style={[typography.micro, { color: edgeColor }]}>{edgeEnd.label}</Text>
          <Text style={[typography.captionBold, { color: edgeColor }]}>{edgeEnd.time}</Text>
        </View>

        {grab}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { width: '100%', alignItems: 'center' },
  backSvg: { position: 'absolute', top: 0, alignSelf: 'center' },
  hills: { position: 'absolute', left: 0, right: 0, top: 0 },
  stage: { alignSelf: 'center' },
  plate: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  plateInner: {
    alignItems: 'center',
    borderRadius: radius.xxl,
    paddingHorizontal: scaled(18),
    paddingVertical: spacing.sm,
  },
  caption: { textAlign: 'center', maxWidth: CAPTION_MAX },
  hint: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  hintPill: { paddingHorizontal: spacing.md, borderRadius: radius.full },
  edge: {
    position: 'absolute',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
});
