import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useEntrance } from '@/hooks/useMotion';
import { useRowMirrored } from '@/hooks/useRowMirrored';
import { useTheme } from '@/theme/ThemeProvider';
import { scaled } from '@/theme/scale';
import { motion, radius } from '@/theme/tokens';

const DEFAULT_HEIGHT = scaled(6);
const TICK_WIDTH = scaled(2);
const TICK_HEIGHT = scaled(14);
const DASH_WIDTH = 1.5;

type Props = {
  percent: number;
  height?: number;
  opacity?: number;
  dashed?: boolean;
  tick?: number | null;
  delay?: number;
  active?: boolean;
  playKey?: unknown;
  testID?: string;
};

export function ProgressBar({
  percent,
  height = DEFAULT_HEIGHT,
  opacity = 1,
  dashed = false,
  tick = null,
  delay = 0,
  active = true,
  playKey = 0,
  testID,
}: Props) {
  const { colors } = useTheme();
  const mirrored = useRowMirrored();
  const growth = useEntrance(delay, motion.barMs, active, playKey);
  const tickFade = useEntrance(delay + motion.barMs / 2, motion.barMs, active, playKey);
  const grow = useAnimatedStyle(() => ({ transform: [{ scaleX: growth.value }] }));
  const fade = useAnimatedStyle(() => ({ opacity: tickFade.value }));
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <View>
      <View style={[styles.track, { height, backgroundColor: colors.surface2 }]}>
        <Animated.View
          testID={testID}
          style={[
            { height, width: `${clamped}%`, borderRadius: radius.full, transformOrigin: mirrored ? 'right' : 'left' },
            dashed
              ? { borderWidth: DASH_WIDTH, borderColor: colors.gold, borderStyle: 'dashed' }
              : { backgroundColor: colors.gold, opacity },
            grow,
          ]}
        />
      </View>
      {tick !== null ? (
        <Animated.View
          testID="progress-bar-tick"
          pointerEvents="none"
          style={[styles.tickLayer, { top: (height - TICK_HEIGHT) / 2 }, fade]}
        >
          <View style={{ width: `${Math.min(100, Math.max(0, tick))}%` }} />
          <View style={[styles.tick, { backgroundColor: colors.text }]} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: radius.full, overflow: 'hidden', alignItems: 'flex-start' },
  tickLayer: { position: 'absolute', start: 0, end: 0, flexDirection: 'row' },
  tick: { marginStart: -TICK_WIDTH / 2, width: TICK_WIDTH, height: TICK_HEIGHT, borderRadius: radius.full },
});
