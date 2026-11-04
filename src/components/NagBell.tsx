import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MitzvahIcon } from './MitzvahIcon';
import { useI18n } from '@/i18n';
import { scaled } from '@/theme/scale';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilies } from '@/theme/typography';

// A mitzvah's nagging on home (the owner's picks of 2026-11-04 in the study design/lab/studies/2026-11-04-time-and-nag:
// direction ד with the number inside the bell, the number made the total, and round 3's bell א): a soft bell, filled
// goldLight with its outline and number in goldText, the number centred in its body, beside the name, with how many
// notifications the mitzvah's time sends in all, its reminders and their repeats. Without a count it shows nothing.
const BELL_SIZE = scaled(30);
const NUMBER_SIZE = scaled(12);
// Two digits (a mitzvah of three reminders at the top level sends 12) take a smaller size, inside the bell's body.
const TWO_DIGIT_SIZE = scaled(10);
// The number's box, centred on the bell's body (the dome and the rim, about 49% down the drawing).
const NUMBER_BOX = scaled(16);
const NUMBER_TOP = BELL_SIZE * 0.49 - NUMBER_BOX / 2;

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
      <MitzvahIcon
        name="bell"
        size={BELL_SIZE}
        color={colors.goldText}
        tint={colors.goldLight}
        variant="duotone"
        strokeWidth={1.7}
      />
      <View style={styles.numberBox} pointerEvents="none">
        <Text
          style={[styles.number, { color: colors.goldText }, (count ?? 0) >= 10 ? styles.twoDigits : null]}
          allowFontScaling={false}
        >
          {String(count)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: BELL_SIZE, height: BELL_SIZE, alignItems: 'center', justifyContent: 'center' },
  numberBox: {
    position: 'absolute',
    top: NUMBER_TOP,
    left: 0,
    right: 0,
    height: NUMBER_BOX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: { fontFamily: fontFamilies.ui.bold, fontSize: NUMBER_SIZE, lineHeight: NUMBER_BOX, textAlign: 'center' },
  twoDigits: { fontSize: TWO_DIGIT_SIZE },
});
