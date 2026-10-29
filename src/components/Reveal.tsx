import React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useInView } from '@/hooks/useInView';
import { useEntrance } from '@/hooks/useMotion';
import { motion } from '@/theme/tokens';

type Props = {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  shift?: number;
  active?: boolean;
  playKey?: unknown;
  share?: number;
  testID?: string;
};

export function Reveal({
  children,
  delay = 0,
  duration = motion.lineMs,
  shift = motion.lineShift,
  active = true,
  playKey = 0,
  share,
  testID,
}: Props) {
  const view = useInView({ share, resetKey: playKey });
  const progress = useEntrance(delay, duration, active && view.inView, playKey);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * shift }],
  }));
  return (
    <View ref={view.ref} onLayout={view.onLayout} testID={testID}>
      <Animated.View style={style}>{children}</Animated.View>
    </View>
  );
}
