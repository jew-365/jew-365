import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { scaled } from '@/theme/scale';
import { shadowPresets, shadowStyle } from '@/theme/shadowStyle';
import { radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { MitzvahIcon } from './MitzvahIcon';

const TICK_ICON_SIZE = scaled(14);

type Props = {
  label: string;
  caption?: string;
  selected: boolean;
  onPress: () => void;
};

export function ChoiceRow({ label, caption, selected, onPress }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      aria-checked={selected}
      style={[
        styles.row,
        {
          borderColor: selected ? colors.gold : 'transparent',
          backgroundColor: selected ? colors.goldLight : colors.surface,
        },
        shadowStyle(colors.shadow, shadowPresets.cardSoft),
      ]}
    >
      <View style={styles.text}>
        <Text style={[typography.bodyBold, { color: selected ? colors.goldText : colors.text }]}>{label}</Text>
        {caption ? (
          <Text style={[typography.caption, styles.caption, { color: colors.textSub }]}>{caption}</Text>
        ) : null}
      </View>
      {selected ? (
        <View style={[styles.tick, { backgroundColor: colors.gold }]}>
          <MitzvahIcon name="check" size={TICK_ICON_SIZE} color={colors.onGold} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    flex: 1,
  },
  caption: {
    marginTop: scaled(2),
  },
  tick: {
    width: scaled(22),
    height: scaled(22),
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
