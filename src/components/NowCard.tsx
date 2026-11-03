import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { EASE_IN_OUT, EASE_OUT, useReduceMotion } from '@/hooks/useMotion';
import { useI18n } from '@/i18n';
import { BRAND, doneTone } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { scaled } from '@/theme/scale';
import { shadowPresets } from '@/theme/shadowStyle';
import { durations, radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { clockOf, formatRemaining, remainingParts } from '@/utils/clock';
import { ringDashOffset } from '@/utils/homeDay';
import { Button } from './Button';
import { Card } from './Card';
import { IconTile } from './IconTile';
import { MitzvahIcon } from './MitzvahIcon';
import type { IconName } from './MitzvahIcon';

const TILE_SIZE = scaled(44);
const RING_SIZE = scaled(68);
const RING_LENGTH = 157.08;
// The ring does not grow with the phone's font size, so its text stops growing at this share of it.
const RING_TEXT_MAX_SCALE = 1.1;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// The completion, the owner's pick of 2026-11-01 (variant 6 of design/lab/studies/2026-11-01-done-animation): the
// button turns into a green check with sparks, the ring fills to the end in green with a thin check in it, a soft green
// wash spreads from the ring, the end line reads "done at", and the card closes as home lets it go (`durations.stamp`).
const DONE = {
  button: { delay: 0, ms: 150 },
  sparks: { delay: 0, ms: 600 },
  ring: { delay: 80, ms: 440 },
  check: { delay: 320, ms: 360 },
  wash: { delay: 140, ms: 520 },
  line: { delay: 320, ms: 280 },
  close: { delay: 1000, ms: durations.stamp - 1000 },
} as const;
const SPARK_COUNT = 16;
const SPARK_SIZE = scaled(9);
const RING_CHECK_SIZE = scaled(22);
const WASH_ALPHA = '1F';

type Props = {
  name: string;
  icon: IconName;
  start: Date;
  end: Date;
  now: Date;
  tz: string;
  pct: number;
  urgent: boolean;
  stamping: boolean;
  onComplete: () => void;
  onOpenText?: () => void;
  onPress: () => void;
  onLongPress: () => void;
  testID?: string;
};

type Box = { x: number; y: number; width: number; height: number };
const boxOf = (event: LayoutChangeEvent): Box => event.nativeEvent.layout;
const clamp01 = (value: number) => {
  'worklet';
  return Math.min(1, Math.max(0, value));
};

// One spark: it flies out from the button's centre along its angle, shrinks and fades. Its parent centres it, so no
// physical offset is set, which RN would swap under RTL on native and not on the web.
function Spark({ progress, index, color }: { progress: SharedValue<number>; index: number; color: string }) {
  const angle = (index / SPARK_COUNT) * Math.PI * 2 + (index % 2 ? 0.15 : -0.1);
  const distance = scaled(58 + (index % 3) * 16);
  const lead = (index % 3) * 0.03;
  const style = useAnimatedStyle(() => {
    const p = clamp01((progress.value - lead) / (1 - lead));
    return {
      opacity: progress.value <= 0 ? 0 : 1 - p,
      transform: [
        { translateX: Math.cos(angle) * distance * p },
        { translateY: Math.sin(angle) * distance * 0.7 * p },
        { scale: 1 - 0.65 * p },
        { rotate: index % 4 === 0 ? '45deg' : '0deg' },
      ],
    };
  });
  return (
    <Animated.View
      testID="now-card-spark"
      pointerEvents="none"
      style={[styles.spark, { backgroundColor: color, borderRadius: index % 4 === 0 ? 2 : SPARK_SIZE / 2 }, style]}
    />
  );
}

export const NowCard = React.memo(function NowCard({
  name,
  icon,
  start,
  end,
  now,
  tz,
  pct,
  urgent,
  stamping,
  onComplete,
  onOpenText,
  onPress,
  onLongPress,
  testID,
}: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const reduce = useReduceMotion();
  const remaining = end.getTime() - now.getTime();
  const parts = remainingParts(remaining);
  const background = urgent ? colors.urgentBg : colors.surface;
  const ringColor = urgent ? colors.urgent : colors.gold;
  const doneInk = doneTone(colors).ink;

  // The card's size, for the closing height and the wash's reach; the actions row's, for the sparks' layer.
  const [outer, setOuter] = useState<Box | null>(null);
  const [actions, setActions] = useState<Box | null>(null);
  const [doneAt, setDoneAt] = useState('');
  const [closing, setClosing] = useState(false);

  const button = useSharedValue(0);
  const sparks = useSharedValue(0);
  const fill = useSharedValue(0);
  const check = useSharedValue(0);
  const wash = useSharedValue(0);
  const line = useSharedValue(0);
  const close = useSharedValue(0);

  useEffect(() => {
    const values = [button, sparks, fill, check, wash, line, close];
    if (!stamping) {
      values.forEach((value) => (value.value = 0));
      setClosing(false);
      return undefined;
    }
    setDoneAt(clockOf(new Date(), tz));
    const run = (value: SharedValue<number>, step: { delay: number; ms: number }, easing = EASE_OUT) => {
      value.value = withDelay(step.delay, withTiming(1, { duration: step.ms, easing }));
    };
    if (reduce) {
      // Under reduced motion the card shows its done state at once and only fades as it closes; the fade opts out of
      // Reanimated's own reduced motion, which would skip both the wait and the fade.
      [button, fill, check, line].forEach((value) => (value.value = 1));
      close.value = withDelay(
        DONE.close.delay,
        withTiming(1, { duration: DONE.close.ms, reduceMotion: ReduceMotion.Never }),
        ReduceMotion.Never,
      );
      return undefined;
    }
    run(button, DONE.button);
    run(sparks, DONE.sparks);
    run(fill, DONE.ring, EASE_IN_OUT);
    run(check, DONE.check);
    run(wash, DONE.wash);
    run(line, DONE.line);
    run(close, DONE.close, EASE_IN_OUT);
    const timer = setTimeout(() => setClosing(true), DONE.close.delay);
    return () => clearTimeout(timer);
  }, [stamping, reduce, tz, button, sparks, fill, check, wash, line, close]);

  const restOffset = ringDashOffset(RING_LENGTH, pct);
  // The fill turns the ring green by fading a green arc in over it: only numbers animate, since an animated stroke
  // colour is dropped by react-native-svg on web.
  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: restOffset * (1 - fill.value) }));
  const doneArcProps = useAnimatedProps(() => ({
    strokeDashoffset: restOffset * (1 - fill.value),
    opacity: fill.value,
  }));
  const ringTextStyle = useAnimatedStyle(() => ({ opacity: 1 - clamp01(fill.value * 3) }));
  const ringCheckStyle = useAnimatedStyle(() => ({
    opacity: 0.9 * check.value,
    transform: [{ scale: 0.96 + 0.04 * check.value }],
  }));
  const buttonStyle = useAnimatedStyle(() => ({ opacity: button.value }));
  const endStyle = useAnimatedStyle(() => ({ opacity: 1 - clamp01(line.value * 2) }));
  const doneLineStyle = useAnimatedStyle(() => ({ opacity: clamp01(line.value * 2 - 1) }));
  const washStyle = useAnimatedStyle(() => ({ opacity: wash.value > 0 ? 1 : 0, transform: [{ scale: wash.value }] }));
  const outerHeight = outer?.height ?? 0;
  const closeStyle = useAnimatedStyle(() => {
    if (close.value <= 0) return { opacity: 1 };
    const opacity = interpolate(close.value, [0, 1], [1, 0], Extrapolation.CLAMP);
    return reduce || !outerHeight ? { opacity } : { opacity, height: outerHeight * (1 - close.value) };
  });

  // The wash is a disc centred on the ring, wide enough to cover the card; equal offsets on both sides keep it centred
  // whichever way the row runs.
  const washRadius = (outer?.width ?? 0) * 1.2;
  const washOffset = RING_SIZE / 2 - washRadius;

  return (
    <Animated.View
      testID={testID}
      onLayout={(event) => !stamping && setOuter(boxOf(event))}
      style={[closing && styles.clip, closeStyle]}
    >
      <Card padded style={[styles.card, { backgroundColor: background }]}>
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          accessibilityRole="button"
          accessibilityLabel={`${name}, ${t('home.now.ringLabel', { left: formatRemaining(remaining, t) })}`}
          accessibilityActions={[{ name: 'longpress', label: t('home.quick.title') }]}
          onAccessibilityAction={() => onLongPress()}
          style={({ pressed }) => [styles.body, { opacity: pressed ? 0.85 : 1 }]}
        >
          <IconTile name={icon} size={TILE_SIZE} />
          <View style={styles.meta}>
            <Text style={[typography.heading, { color: colors.text }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[typography.caption, { color: colors.textSub }]}>
              {t('home.now.start', { time: clockOf(start, tz) })}
            </Text>
            <View>
              <Animated.Text style={[typography.caption, { color: colors.textSub }, endStyle]}>
                {t('home.now.end', { time: clockOf(end, tz) })}
              </Animated.Text>
              {stamping ? (
                <Animated.Text style={[typography.caption, styles.doneLine, { color: doneInk }, doneLineStyle]}>
                  {t('home.day.status.done', { time: doneAt })}
                </Animated.Text>
              ) : null}
            </View>
          </View>
          <View style={styles.ring} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Svg width={RING_SIZE} height={RING_SIZE} viewBox="0 0 60 60">
              <Circle cx={30} cy={30} r={25} stroke={colors.border} strokeWidth={4} fill="none" />
              <AnimatedCircle
                cx={30}
                cy={30}
                r={25}
                stroke={ringColor}
                strokeWidth={4}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={RING_LENGTH}
                strokeDashoffset={restOffset}
                transform="rotate(-90 30 30)"
                animatedProps={arcProps}
              />
              {stamping ? (
                <AnimatedCircle
                  testID="now-card-done-arc"
                  cx={30}
                  cy={30}
                  r={25}
                  stroke={colors.safe}
                  strokeWidth={4}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={RING_LENGTH}
                  strokeDashoffset={restOffset}
                  opacity={0}
                  transform="rotate(-90 30 30)"
                  animatedProps={doneArcProps}
                />
              ) : null}
            </Svg>
            <Animated.View style={[styles.ringText, ringTextStyle]}>
              <Text
                maxFontSizeMultiplier={RING_TEXT_MAX_SCALE}
                style={[typography.captionBold, { color: urgent ? colors.urgent : colors.text }]}
              >
                {parts.value}
              </Text>
              <Text maxFontSizeMultiplier={RING_TEXT_MAX_SCALE} style={[typography.micro, { color: colors.textSub }]}>
                {t(`time.unit.${parts.unit}`)}
              </Text>
            </Animated.View>
            {stamping && !reduce && washRadius ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.wash,
                  {
                    left: washOffset,
                    right: washOffset,
                    top: washOffset,
                    bottom: washOffset,
                    borderRadius: washRadius,
                    backgroundColor: colors.safe + WASH_ALPHA,
                  },
                  washStyle,
                ]}
              />
            ) : null}
            {stamping ? (
              <Animated.View style={[styles.ringText, ringCheckStyle]} testID="now-card-ring-check">
                <MitzvahIcon name="check" size={RING_CHECK_SIZE} color={colors.safe} strokeWidth={1.6} />
              </Animated.View>
            ) : null}
          </View>
        </Pressable>
        <View testID="now-card-actions" style={styles.actions} onLayout={(event) => setActions(boxOf(event))}>
          <View style={styles.primary}>
            <Button
              variant="primary"
              icon="check"
              label={t('notifications.markDone')}
              accessibilityLabel={t('state.completeAction', { name })}
              onPress={() => {
                if (!stamping) onComplete();
              }}
            />
            {stamping ? (
              <Animated.View
                pointerEvents="none"
                testID="now-card-done-button"
                style={[styles.doneButton, { backgroundColor: colors.safe }, buttonStyle]}
              >
                <MitzvahIcon name="check" size={scaled(20)} color={BRAND.white} strokeWidth={2.6} />
              </Animated.View>
            ) : null}
          </View>
          {onOpenText ? (
            <Button
              variant="secondary"
              icon="siddur"
              label={t('home.now.openText')}
              accessibilityLabel={t('home.now.openTextLabel', { name })}
              onPress={onOpenText}
              style={styles.secondary}
            />
          ) : null}
        </View>
      </Card>
      {stamping && !reduce && actions ? (
        // The sparks' layer copies the actions row over the card (the card clips, this layer does not): the same
        // insets, gap and flex shares, so its first cell sits over the "done" button in either direction. It sits one
        // elevation step above the card, which Android would otherwise draw over it.
        <View
          testID="now-card-spark-row"
          pointerEvents="none"
          style={[styles.sparkRow, { top: actions.y, height: actions.height }]}
        >
          <View style={[styles.primary, styles.sparkCell]}>
            {Array.from({ length: SPARK_COUNT }, (_, index) => (
              <Spark
                key={index}
                progress={sparks}
                index={index}
                color={[colors.gold, colors.safe, colors.goldText][index % 3]}
              />
            ))}
          </View>
          {onOpenText ? <View style={styles.secondary} /> : null}
        </View>
      ) : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  card: { marginBottom: spacing.md },
  body: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  meta: { flex: 1, minWidth: 0 },
  doneLine: { ...StyleSheet.absoluteFillObject },
  ring: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringText: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  primary: { flex: 2 },
  secondary: { flex: 1 },
  doneButton: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wash: { position: 'absolute' },
  sparkRow: {
    position: 'absolute',
    start: spacing.lg,
    end: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    zIndex: 1,
    elevation: shadowPresets.cardSoft.elevation + 1,
  },
  sparkCell: { alignItems: 'center', justifyContent: 'center' },
  spark: { position: 'absolute', width: SPARK_SIZE, height: SPARK_SIZE },
});
