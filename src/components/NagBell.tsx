import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MitzvahIcon } from './MitzvahIcon';
import { useI18n } from '@/i18n';
import { scaled } from '@/theme/scale';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilies } from '@/theme/typography';
import type { NagLevel } from '@/utils/nagging';

// A mitzvah's nagging level on home (the owner's pick of 2026-11-04, the study design/lab/studies/2026-11-04-time-
// and-nag, direction ד with the number inside the bell): a small bell beside the name with how many times each
// reminder is sent at that level. Level 1 sends each reminder once and shows nothing.
const BELL_SIZE = scaled(26);
const NUMBER_SIZE = scaled(11);

type Translate = (scope: string, options?: Record<string, unknown>) => string;

// What the bell says, for the accessibility label of the card that holds it; null at level 1.
export function nagBellLabel(level: NagLevel | undefined, t: Translate): string | null {
  if (!level || level < 2) return null;
  return t('home.nag.label', { name: t(`nag.level.${level}.name`), n: level });
}

export function NagBell({ level, style }: { level: NagLevel | undefined; style?: object }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const label = nagBellLabel(level, t);
  if (!label) return null;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      testID="nag-bell"
      style={[styles.wrap, style]}
    >
      <MitzvahIcon name="bell" size={BELL_SIZE} color={colors.textSub} strokeWidth={1.6} />
      <Text style={[styles.number, { color: colors.goldText }]} allowFontScaling={false}>
        {String(level)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: BELL_SIZE, height: BELL_SIZE, alignItems: 'center', justifyContent: 'center' },
  number: {
    position: 'absolute',
    top: BELL_SIZE * 0.29,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: fontFamilies.ui.bold,
    fontSize: NUMBER_SIZE,
    lineHeight: NUMBER_SIZE * 1.15,
  },
});
