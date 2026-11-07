import React, { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { EASE_IN_OUT, EASE_OUT, useReduceMotion } from '@/hooks/useMotion';
import { BRAND } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { scaled } from '@/theme/scale';
import { durations, spacing } from '@/theme/tokens';
import { MarkStamp } from './MarkStamp';
import { MitzvahIcon } from './MitzvahIcon';

// The completion every mark plays wherever it is made (the owner's call, 2026-11-07): home's own pieces, the green
// check, the sparks and the wash, around the stamp the cards had before, centred over whatever screen is open.
// `celebrateMark()` plays it on the one host the root layout mounts and resolves when it ends, so a screen that
// leaves after a mark (the reader's "סיימתי") leaves only then; with no host mounted it resolves at once.
const listeners = new Set<() => void>();

export function celebrateMark(): Promise<void> {
  if (!listeners.size) return Promise.resolve();
  listeners.forEach((listener) => listener());
  return new Promise((resolve) => setTimeout(resolve, durations.stamp));
}

const STEPS = {
  disc: { delay: 0, ms: 260 },
  check: { delay: 120, ms: 220 },
  sparks: { delay: 0, ms: 600 },
  wash: { delay: 60, ms: 520 },
  fade: { delay: 1000, ms: durations.stamp - 1000 },
} as const;
const DISC_SIZE = scaled(84);
const CHECK_SIZE = scaled(44);
const SPARK_COUNT = 16;
const SPARK_SIZE = scaled(10);
const STAMP_BOX = scaled(72);
const WASH_ALPHA = '1F';

const clamp01 = (value: number) => {
  'worklet';
  return Math.min(1, Math.max(0, value));
};

// One spark flies out from the disc's centre along its angle, shrinks and fades; centred by its parent, so no
// physical offset is set.
function Spark({ progress, index, color }: { progress: SharedValue<number>; index: number; color: string }) {
  const angle = (index / SPARK_COUNT) * Math.PI * 2 + (index % 2 ? 0.15 : -0.1);
  const distance = scaled(80 + (index % 3) * 22);
  const lead = (index % 3) * 0.03;
  const style = useAnimatedStyle(() => {
    const p = clamp01((progress.value - lead) / (1 - lead));
    return {
      opacity: progress.value <= 0 ? 0 : 1 - p,
      transform: [
        { translateX: Math.cos(angle) * distance * p },
        { translateY: Math.sin(angle) * distance * p },
        { scale: 1 - 0.65 * p },
        { rotate: index % 4 === 0 ? '45deg' : '0deg' },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.spark, { backgroundColor: color, borderRadius: index % 4 === 0 ? 2 : SPARK_SIZE / 2 }, style]}
    />
  );
}

function Burst({ onEnd }: { onEnd: () => void }) {
  const { colors } = useTheme();
  const reduce = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const disc = useSharedValue(0);
  const check = useSharedValue(0);
  const sparks = useSharedValue(0);
  const wash = useSharedValue(0);
  const fade = useSharedValue(0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const run = (value: SharedValue<number>, step: { delay: number; ms: number }, easing = EASE_OUT) => {
      value.value = withDelay(step.delay, withTiming(1, { duration: step.ms, easing }));
    };
    if (reduce) {
      disc.value = 1;
      check.value = 1;
    } else {
      run(disc, STEPS.disc);
      run(check, STEPS.check);
      run(sparks, STEPS.sparks);
      run(wash, STEPS.wash);
    }
    // The fade opts out of Reanimated's own reduced motion, which would skip both the wait and the fade.
    fade.value = withDelay(
      STEPS.fade.delay,
      withTiming(1, { duration: STEPS.fade.ms, easing: EASE_IN_OUT, reduceMotion: ReduceMotion.Never }),
      ReduceMotion.Never,
    );
    const timer = setTimeout(onEnd, durations.stamp);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one burst per mount
  }, []);

  const rootStyle = useAnimatedStyle(() => ({ opacity: 1 - fade.value }));
  const discStyle = useAnimatedStyle(() => ({
    opacity: clamp01(disc.value * 2),
    transform: [{ scale: 0.4 + 0.6 * disc.value }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: check.value,
    transform: [{ scale: 0.7 + 0.3 * check.value }],
  }));
  // The wash is a disc the size of the check's, scaled to reach every corner: a transform never changes the layout,
  // where a disc wider than the window would push the page aside.
  const washReach = (2 * Math.hypot(width, height)) / DISC_SIZE;
  const washStyle = useAnimatedStyle(() => ({
    opacity: wash.value > 0 ? 1 : 0,
    transform: [{ scale: washReach * wash.value }],
  }));

  return (
    <Animated.View testID="mark-celebration" pointerEvents="none" style={[styles.root, rootStyle]}>
      {reduce ? null : (
        <Animated.View style={[styles.wash, { backgroundColor: colors.safe + WASH_ALPHA }, washStyle]} />
      )}
      <View style={styles.center}>
        {reduce ? null : (
          <View style={styles.sparks}>
            {Array.from({ length: SPARK_COUNT }, (_, index) => (
              <Spark
                key={index}
                progress={sparks}
                index={index}
                color={[colors.gold, colors.safe, colors.goldText][index % 3]}
              />
            ))}
          </View>
        )}
        <Animated.View style={[styles.disc, { backgroundColor: colors.safe }, discStyle]}>
          <Animated.View style={checkStyle}>
            <MitzvahIcon name="check" size={CHECK_SIZE} color={BRAND.white} strokeWidth={2.6} />
          </Animated.View>
        </Animated.View>
        {reduce ? null : (
          <View style={styles.stampBox}>
            <MarkStamp active />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// Mounted once by the root layout, above the screens; it never takes a touch.
export function MarkCelebrationHost() {
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    const listener = () => setBurst((count) => count + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return burst ? <Burst key={burst} onEnd={() => setBurst(0)} /> : null;
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 50,
  },
  wash: { position: 'absolute', width: DISC_SIZE, height: DISC_SIZE, borderRadius: DISC_SIZE / 2 },
  center: { alignItems: 'center', justifyContent: 'center' },
  sparks: { position: 'absolute', top: DISC_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  spark: { position: 'absolute', width: SPARK_SIZE, height: SPARK_SIZE },
  disc: {
    width: DISC_SIZE,
    height: DISC_SIZE,
    borderRadius: DISC_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampBox: { width: '100%', minWidth: scaled(220), height: STAMP_BOX, marginTop: spacing.md },
});
