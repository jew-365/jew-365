import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { IconTile } from '@/components/IconTile';
import { MitzvahIcon, forwardIcon, type IconName } from '@/components/MitzvahIcon';
import { useTheme } from '@/theme/ThemeProvider';
import { scaled } from '@/theme/scale';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useI18n } from '@/i18n';

const CHEVRON_SIZE = scaled(16);

type Props = {
  icon: IconName;
  iconTone?: 'accent' | 'muted';
  title: string;
  caption?: string;
  trailing?: React.ReactNode;
  chevron?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function ListRow({
  icon,
  iconTone = 'accent',
  title,
  caption,
  trailing,
  chevron = false,
  onPress,
  onLongPress,
  disabled = false,
  accessibilityLabel,
  style,
}: Props) {
  const { colors } = useTheme();
  const { language } = useI18n();
  const dim = { opacity: disabled ? 0.5 : 1 };
  const pressableProps = {
    onPress,
    onLongPress,
    disabled,
    accessibilityRole: onPress ? ('button' as const) : undefined,
    accessibilityLabel,
    android_ripple: onPress ? { color: colors.border } : undefined,
  };
  const content = (
    <>
      <IconTile name={icon} tone={iconTone} />
      <View style={styles.meta}>
        <Text style={[typography.heading, { color: iconTone === 'muted' ? colors.textMuted : colors.text }]}>
          {title}
        </Text>
        {caption ? (
          <Text style={[typography.caption, styles.caption, { color: colors.textSub }]}>{caption}</Text>
        ) : null}
      </View>
    </>
  );
  if (trailing) {
    return (
      <View style={[styles.split, dim, style]}>
        <Pressable {...pressableProps} style={styles.main}>
          {content}
        </Pressable>
        <View style={styles.trailing}>{trailing}</View>
      </View>
    );
  }
  return (
    <Pressable {...pressableProps} style={[styles.row, dim, style]}>
      {content}
      {chevron ? (
        <MitzvahIcon name={forwardIcon(language)} size={CHEVRON_SIZE} color={colors.textMuted} strokeWidth={2.5} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  split: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  main: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingStart: spacing.lg,
    paddingEnd: spacing.md,
    paddingVertical: spacing.lg,
  },
  trailing: {
    justifyContent: 'center',
    paddingEnd: spacing.lg,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  caption: {
    marginTop: scaled(2),
  },
});
