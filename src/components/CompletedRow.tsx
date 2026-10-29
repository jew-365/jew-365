import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { scaled } from '@/theme/scale';
import { radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useI18n } from '@/i18n';
import { MitzvahIcon } from './MitzvahIcon';
import { Reveal } from './Reveal';

const TICK_ICON_SIZE = scaled(16);
const TICK_ICON_STROKE = 2.2;
const UNDO_ICON_SIZE = scaled(16);
const UNDO_ICON_STROKE = 2.2;
const UNDO_HIT_SLOP = scaled(8);

type Props = {
  name: string;
  time: string;
  onPress?: () => void;
  onUndo?: () => void;
  undoLabel?: string;
  playKey?: unknown;
};

export function CompletedRow({ name, time, onPress, onUndo, undoLabel, playKey }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const content = (
    <View style={styles.row}>
      <View style={[styles.tick, { backgroundColor: colors.gold }]}>
        <MitzvahIcon name="check" size={TICK_ICON_SIZE} color={colors.onGold} strokeWidth={TICK_ICON_STROKE} />
      </View>
      <Text style={[typography.body, styles.name, { color: colors.text }]}>{name}</Text>
      <Text style={[typography.caption, { color: colors.textSub }]}>{time}</Text>
      {onUndo ? (
        <Pressable
          onPress={onUndo}
          accessibilityRole="button"
          accessibilityLabel={undoLabel ?? t('home.undo')}
          hitSlop={UNDO_HIT_SLOP}
          style={[styles.undoPill, { backgroundColor: colors.goldLight }]}
        >
          {undoLabel ? (
            <Text style={[typography.captionBold, { color: colors.goldText }]}>{undoLabel}</Text>
          ) : (
            <MitzvahIcon name="undo" size={UNDO_ICON_SIZE} color={colors.goldText} strokeWidth={UNDO_ICON_STROKE} />
          )}
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <Reveal duration={300} shift={7} playKey={playKey}>
      {onPress ? (
        <Pressable onPress={onPress} android_ripple={{ color: colors.border }}>
          {content}
        </Pressable>
      ) : (
        content
      )}
    </Reveal>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  tick: {
    width: scaled(28),
    height: scaled(28),
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { flex: 1 },
  undoPill: {
    minWidth: scaled(48),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
});
