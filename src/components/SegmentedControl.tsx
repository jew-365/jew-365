import React, { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { EASE_IN_OUT, useReduceMotion } from '@/hooks/useMotion';
import { useRowMirrored } from '@/hooks/useRowMirrored';
import { useTheme } from '@/theme/ThemeProvider';
import { scaled } from '@/theme/scale';
import { motion, radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

const HIT_SLOP = scaled(6);

type Props<T extends string> = {
  options: readonly { value: T; label: string; accessibilityLabel?: string }[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  animated?: boolean;
};

export function SegmentedControl<T extends string>({ options, value, onChange, style, animated = false }: Props<T>) {
  const { colors } = useTheme();
  const mirrored = useRowMirrored();
  const reduce = useReduceMotion();
  const [width, setWidth] = useState<number | null>(null);
  const count = options.length;
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const offset = useSharedValue(0);
  const stepRef = useRef(0);
  const stepFor = (trackWidth: number) => (trackWidth - spacing.xs * (count - 1)) / count + spacing.xs;
  const segment = width === null ? 0 : stepFor(width) - spacing.xs;
  useEffect(() => {
    if (!animated) return;
    const target = (mirrored ? -1 : 1) * index * stepRef.current;
    if (reduce) offset.value = target;
    else offset.value = withTiming(target, { duration: motion.indicatorMs, easing: EASE_IN_OUT });
  }, [animated, index, mirrored, reduce, offset]);
  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
  const onLayout = (event: LayoutChangeEvent) => {
    const measured = event.nativeEvent.layout.width;
    stepRef.current = stepFor(measured);
    offset.value = (mirrored ? -1 : 1) * index * stepRef.current;
    setWidth(measured);
  };
  const edge = Platform.OS === 'web' ? (mirrored ? { right: 0 } : { left: 0 }) : { start: 0 };

  return (
    <View style={[styles.track, style]} onLayout={animated ? onLayout : undefined}>
      {animated ? (
        <View style={[StyleSheet.absoluteFill, styles.track]} pointerEvents="none">
          {options.map((option) => (
            <View key={option.value} style={[styles.option, { backgroundColor: colors.surface2 }]} />
          ))}
        </View>
      ) : null}
      {animated && width !== null ? (
        <Animated.View
          testID="segmented-indicator"
          pointerEvents="none"
          style={[
            styles.indicator,
            edge,
            { width: segment, backgroundColor: colors.gold, borderRadius: radius.md },
            indicatorStyle,
          ]}
        />
      ) : null}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityLabel={option.accessibilityLabel}
            accessibilityState={{ selected, checked: selected }}
            aria-checked={selected}
            hitSlop={HIT_SLOP}
            style={[
              styles.option,
              { backgroundColor: animated ? 'transparent' : selected ? colors.gold : colors.surface2 },
            ]}
          >
            <Text style={[typography.captionBold, { color: selected ? colors.onGold : colors.text }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
});
