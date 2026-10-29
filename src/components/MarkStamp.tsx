import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { scaled } from '@/theme/scale';
import { shadowPresets, shadowStyle } from '@/theme/shadowStyle';
import { fontFamilies } from '@/theme/typography';
import { durations, radius, spacing } from '@/theme/tokens';
import { useI18n } from '@/i18n';

type Props = {
  active: boolean;
  background: string;
};

export function MarkStamp({ active, background }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const stampOpacity = useSharedValue(0);
  const stampScale = useSharedValue(2.8);
  const stampRotate = useSharedValue(-18);

  useEffect(() => {
    if (active) {
      stampOpacity.value = 0;
      stampScale.value = 2.8;
      stampRotate.value = -18;
      stampOpacity.value = withSequence(
        withTiming(1, { duration: durations.stamp * 0.2 }),
        withDelay(durations.stamp * 0.5, withTiming(0, { duration: durations.stamp * 0.3 })),
      );
      stampScale.value = withSequence(
        withTiming(1.06, { duration: durations.stamp * 0.2 }),
        withTiming(1, { duration: durations.stamp * 0.52 }),
        withTiming(0.96, { duration: durations.stamp * 0.28 }),
      );
      stampRotate.value = withTiming(-12, { duration: durations.stamp * 0.2 });
    }
  }, [active, stampOpacity, stampScale, stampRotate]);

  const stampStyle = useAnimatedStyle(() => ({
    opacity: stampOpacity.value,
    transform: [{ scale: stampScale.value }, { rotate: `${stampRotate.value}deg` }],
  }));

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.stampOverlay, { backgroundColor: background + 'BB' }]}>
        <Animated.View
          style={[
            styles.stamp,
            {
              borderColor: colors.goldText,
            },
            shadowStyle(colors.goldLight, shadowPresets.glow),
            stampStyle,
          ]}
        >
          <Text style={[styles.stampText, { color: colors.goldText }]}>{t('state.stamped')}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stampOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stamp: {
    borderWidth: scaled(3),
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.sm,
  },
  stampText: {
    fontSize: scaled(21),
    fontFamily: fontFamilies.heebo.black,
    letterSpacing: scaled(3),
  },
});
