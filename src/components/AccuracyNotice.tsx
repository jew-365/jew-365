import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

const PARAGRAPHS = ['accuracy.effort', 'accuracy.responsibility', 'accuracy.report'] as const;

// The notice on the accuracy of the times, shown once in onboarding and kept under About and contact in Settings.
export function AccuracyNotice({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <View style={[styles.column, style]}>
      {PARAGRAPHS.map((key) => (
        <Text key={key} style={[typography.body, { color: colors.textSub }]}>
          {t(key)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    gap: spacing.md,
  },
});
