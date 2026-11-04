import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MitzvahIcon } from './MitzvahIcon';
import { useI18n } from '@/i18n';
import { scaled } from '@/theme/scale';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilies } from '@/theme/typography';

// A mitzvah's nagging on home (the owner's pick of 2026-11-04, direction ד of the study design/lab/studies/2026-11-04-
// time-and-nag, with the number inside the bell; the number became the total on the same day): a small bell beside
// the name with how many notifications the mitzvah's time sends in all, its reminders and their repeats. Without a
// count (no repeat to send) it shows nothing.
const BELL_SIZE = scaled(26);
const NUMBER_SIZE = scaled(11);
// Two digits (a mitzvah of three reminders at the top level sends 12) sit a little tighter, inside the bell's body.
const TWO_DIGIT_SPACING = scaled(-0.5);

type Translate = (scope: string, options?: Record<string, unknown>) => string;

// What the bell says, for the accessibility label of the card that holds it; null without a count.
export function nagBellLabel(count: number | null | undefined, t: Translate): string | null {
  if (count == null) return null;
  return t('home.nag.label', { n: count });
}

export function NagBell({ count, style }: { count: number | null | undefined; style?: object }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const label = nagBellLabel(count, t);
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
      <Text
        style={[styles.number, { color: colors.goldText }, (count ?? 0) >= 10 ? styles.twoDigits : null]}
        allowFontScaling={false}
      >
        {String(count)}
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
  twoDigits: { letterSpacing: TWO_DIGIT_SPACING },
});
