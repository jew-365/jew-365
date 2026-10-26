import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { scaled } from '@/theme/scale';
import { radius, spacing } from '@/theme/tokens';

export const ONBOARDING_STEPS = 6;

const DOT_SIZE = scaled(7);
const ACTIVE_DOT_WIDTH = scaled(22);

export function OnboardingDots({ step, total, style }: { step: number; total: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.dots, style]}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              width: index === step ? ACTIVE_DOT_WIDTH : DOT_SIZE,
              backgroundColor: index === step ? colors.gold : colors.border,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignSelf: 'center',
  },
  dot: {
    height: DOT_SIZE,
    borderRadius: radius.xs,
  },
});
