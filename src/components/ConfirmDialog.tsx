import React, { useEffect, useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { scaled } from '@/theme/scale';
import { radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useI18n } from '@/i18n';
import { useReduceMotion } from '@/hooks/useMotion';
import { useRowMirrored } from '@/hooks/useRowMirrored';
import { useQuietBlock } from './ShabbatScreen';

type Props = {
  visible: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  countdownMs?: number;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive = false,
  busy = false,
  countdownMs,
  onConfirm,
  onCancel,
}: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const quiet = useQuietBlock() !== null;
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;
  useEffect(() => {
    if (!visible || countdownMs === undefined) return undefined;
    const timer = setTimeout(() => cancelRef.current(), countdownMs);
    return () => clearTimeout(timer);
  }, [visible, countdownMs]);

  return (
    <Modal visible={visible && !quiet} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        {/* A sibling of the card, not its ancestor: a plain child View does not stop a tap reaching a parent Pressable. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessible={false} />
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[typography.heading, { color: colors.text }]}>{title}</Text>
          {body ? <Text style={[typography.body, styles.body, { color: colors.textSub }]}>{body}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              disabled={busy}
              accessibilityRole="button"
              style={[styles.button, { backgroundColor: colors.surface2 }]}
            >
              <Text style={[typography.bodyBold, { color: colors.text }]}>{cancelLabel ?? t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={busy}
              accessibilityRole="button"
              style={[
                styles.button,
                { backgroundColor: destructive ? colors.urgent : colors.gold, opacity: busy ? 0.6 : 1 },
              ]}
            >
              <Text style={[typography.bodyBold, { color: destructive ? colors.onUrgent : colors.onGold }]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
          {countdownMs !== undefined ? <DialogCountdown duration={countdownMs} /> : null}
        </View>
      </View>
    </Modal>
  );
}

const COUNTDOWN_HEIGHT = scaled(4);
const COUNTDOWN_STEP_MS = 1000;

function DialogCountdown({ duration }: { duration: number }) {
  const { colors } = useTheme();
  const mirrored = useRowMirrored();
  const reduce = useReduceMotion();
  const remaining = useSharedValue(1);
  useEffect(() => {
    remaining.value = 1;
    if (reduce) {
      const started = Date.now();
      const tick = setInterval(() => {
        remaining.value = Math.max(0, 1 - (Date.now() - started) / duration);
      }, COUNTDOWN_STEP_MS);
      return () => clearInterval(tick);
    }
    remaining.value = withTiming(0, { duration, easing: Easing.linear });
    return () => cancelAnimation(remaining);
  }, [duration, reduce, remaining]);
  const drain = useAnimatedStyle(() => ({ transform: [{ scaleX: remaining.value }] }));
  return (
    <View
      style={[styles.countdownTrack, { backgroundColor: colors.surface2 }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        testID="confirm-dialog-countdown"
        style={[
          styles.countdownFill,
          { backgroundColor: colors.gold, transformOrigin: mirrored ? 'right' : 'left' },
          drain,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: scaled(360),
    borderRadius: radius.xxl,
    padding: spacing.xl,
  },
  body: {
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    paddingVertical: spacing.md,
  },
  countdownTrack: {
    height: COUNTDOWN_HEIGHT,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginTop: spacing.lg,
  },
  countdownFill: {
    width: '100%',
    height: '100%',
    borderRadius: radius.full,
  },
});
