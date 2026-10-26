import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { MitzvahIcon } from '@/components/MitzvahIcon';
import { shadowPresets, shadowStyle } from '@/theme/shadowStyle';
import { useTheme } from '@/theme/ThemeProvider';
import { scaled } from '@/theme/scale';
import { radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

const CHEVRON_SIZE = scaled(16);
const CHEVRON_STROKE = 2.5;

type Props = {
  title: string;
  onPress: () => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

export function PickerCard({ title, onPress, accessibilityLabel, style }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.picker,
        { backgroundColor: pressed ? colors.surface2 : colors.surface },
        shadowStyle(colors.shadow, shadowPresets.cardSoft),
        style,
      ]}
    >
      <Text style={[typography.bodyBold, styles.pickerLabel, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      <MitzvahIcon name="chevronDown" size={CHEVRON_SIZE} color={colors.textMuted} strokeWidth={CHEVRON_STROKE} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  picker: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: scaled(48),
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
  },
  pickerLabel: {
    flex: 1,
  },
});
