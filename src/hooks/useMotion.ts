import { useCallback, useEffect, useState } from 'react';
import {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { motion } from '@/theme/tokens';

const [outX1, outY1, outX2, outY2] = motion.easeOut;
const [inOutX1, inOutY1, inOutX2, inOutY2] = motion.easeInOut;

export const EASE_OUT = Easing.bezier(outX1, outY1, outX2, outY2);
export const EASE_IN_OUT = Easing.bezier(inOutX1, inOutY1, inOutX2, inOutY2);

export function useReduceMotion(): boolean {
  return useReducedMotion();
}

export function useEntrance(delay: number, duration: number, active = true, playKey: unknown = 0): SharedValue<number> {
  const reduce = useReduceMotion();
  const progress = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    if (active) progress.value = withDelay(delay, withTiming(1, { duration, easing: EASE_OUT }));
  }, [delay, duration, active, reduce, playKey, progress]);
  return progress;
}

export function useCountUp(progress: SharedValue<number>, target: number, initial = target): number {
  const reduce = useReduceMotion();
  const [value, setValue] = useState(reduce ? target : initial);
  useAnimatedReaction(
    () => Math.round(target * progress.value),
    (current, previous) => {
      if (current !== previous) scheduleOnRN(setValue, current);
    },
    [target, progress],
  );
  return reduce ? target : value;
}

export function usePressScale() {
  const reduce = useReduceMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = useCallback(() => {
    if (!reduce) scale.value = withTiming(motion.pressScale, { duration: motion.pressInMs, easing: EASE_OUT });
  }, [reduce, scale]);
  const onPressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: reduce ? 0 : motion.pressOutMs, easing: EASE_OUT });
  }, [reduce, scale]);
  return { style, onPressIn, onPressOut };
}
