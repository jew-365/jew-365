import React, { useLayoutEffect } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewProps,
  useWindowDimensions,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { EASE_OUT, useReduceMotion } from '@/hooks/useMotion';
import { useTheme } from '@/theme/ThemeProvider';
import { scaled } from '@/theme/scale';
import { motion, radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useI18n } from '@/i18n';
import { useQuietBlock } from './ShabbatScreen';

type BottomSheetProps = {
  visible: boolean;
  title?: string;
  caption?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function BottomSheet({ visible, title, caption, onClose, children }: BottomSheetProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const quiet = useQuietBlock() !== null;
  const shown = visible && !quiet;
  const { height } = useWindowDimensions();
  const reduce = useReduceMotion();
  // The modal fades, so the backdrop appears in place; only the sheet rises from the bottom (the owner's call, 2026-10-31).
  const rise = useSharedValue(reduce ? 0 : height);
  useLayoutEffect(() => {
    if (!shown) return;
    if (reduce) {
      rise.value = 0;
      return;
    }
    rise.value = height;
    rise.value = withTiming(0, { duration: motion.sheetMs, easing: EASE_OUT });
  }, [shown, reduce, height, rise]);
  const sheetMotion = useAnimatedStyle(() => ({ transform: [{ translateY: rise.value }] }));

  return (
    <Modal visible={shown} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
          <Animated.View testID="bottom-sheet" style={[styles.sheet, { backgroundColor: colors.surface }, sheetMotion]}>
            {title || caption ? (
              <View style={styles.heading}>
                {title ? <Text style={[typography.heading, { color: colors.text }]}>{title}</Text> : null}
                {caption ? (
                  <Text style={[typography.caption, styles.caption, { color: colors.textMuted }]}>{caption}</Text>
                ) : null}
              </View>
            ) : null}
            {children}
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              style={[styles.closeBtn, { backgroundColor: colors.surface2 }]}
            >
              <Text style={[typography.bodyBold, { color: colors.text }]}>{t('common.close')}</Text>
            </Pressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type SheetActionProps = {
  label: string;
  caption?: string;
  onPress: () => void;
  destructive?: boolean;
  selected?: boolean;
  onLayout?: ViewProps['onLayout'];
};

export function SheetAction({
  label,
  caption,
  onPress,
  destructive = false,
  selected = false,
  onLayout,
}: SheetActionProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityState={selected ? { selected: true } : undefined}
      style={[styles.action, { borderBottomColor: colors.border }]}
    >
      <View style={[styles.actionBody, selected ? { backgroundColor: colors.goldLight } : null]}>
        <Text style={[typography.subheading, { color: destructive ? colors.urgent : colors.text }]}>{label}</Text>
        {caption ? (
          <Text style={[typography.caption, styles.actionCaption, { color: colors.textSub }]}>{caption}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  sheet: {
    borderRadius: radius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  heading: {
    marginBottom: spacing.lg,
  },
  caption: {
    marginTop: spacing.xs,
  },
  closeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  action: {
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  // The fill sits on an inner view: Android drops the corner radius of a background whose view has a one-sided border.
  actionBody: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
  },
  actionCaption: {
    marginTop: scaled(2),
  },
});
