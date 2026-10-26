import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { scaled } from '@/theme/scale';
import { radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useI18n } from '@/i18n';
import { TIMING_MINUTES, parseMinutes, type ReminderTiming } from '@/utils/reminderTiming';
import { HEADS_UP_MAX_MIN } from '@/utils/skipRules';
import { OptionSelect } from './OptionSelect';
import { SectionLabel } from './SectionLabel';
import { TimeField } from './TimeField';

const MINUTES_STEP = 5;
const LRM = '\u200E';

type Props = {
  timing: ReminderTiming;
  kinds: readonly ReminderTiming[];
  onTiming: (timing: ReminderTiming) => void;
  minutes: string;
  onMinutes: (digits: string) => void;
  time: string;
  onTime: (time: string) => void;
  inline?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ReminderTimingFields({
  timing,
  kinds,
  onTiming,
  minutes,
  onMinutes,
  time,
  onTime,
  inline = false,
  style,
}: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const options = kinds.map((kind) => ({
    value: kind,
    title: t(`reminder.timing.${kind}`),
    caption: t(`reminder.timing.${kind}.caption`, { max: HEADS_UP_MAX_MIN }),
  }));
  const fieldLabel = timing === 'clock' ? '' : t(`reminder.minutes.${timing}`);
  const step = (delta: number) => {
    if (timing === 'clock') return;
    const { min, max } = TIMING_MINUTES[timing];
    onMinutes(String(Math.min(max, Math.max(min, (parseMinutes(minutes) ?? 0) + delta))));
  };

  return (
    <View style={style}>
      <OptionSelect label={t('reminder.timing')} options={options} value={timing} onChange={onTiming} inline={inline} />
      <View style={styles.field}>
        {timing === 'clock' ? (
          <TimeField inline={inline} label={t('reminder.time')} value={time} onChange={onTime} />
        ) : (
          <>
            <SectionLabel variant="field" text={fieldLabel} />
            <View style={styles.row}>
              <Pressable
                onPress={() => step(-MINUTES_STEP)}
                accessibilityRole="button"
                accessibilityLabel={t('reminder.minutes.less')}
                style={[styles.stepper, { backgroundColor: colors.surface2, borderColor: colors.border }]}
              >
                <Text style={[typography.bodyBold, { color: colors.text }]}>{`${LRM}-${MINUTES_STEP}`}</Text>
              </Pressable>
              <TextInput
                accessibilityLabel={fieldLabel}
                keyboardType="number-pad"
                value={minutes}
                onChangeText={(text) => onMinutes(text.replace(/[^0-9]/g, ''))}
                maxLength={3}
                style={[
                  styles.input,
                  { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border },
                ]}
              />
              <Pressable
                onPress={() => step(MINUTES_STEP)}
                accessibilityRole="button"
                accessibilityLabel={t('reminder.minutes.more')}
                style={[styles.stepper, { backgroundColor: colors.surface2, borderColor: colors.border }]}
              >
                <Text style={[typography.bodyBold, { color: colors.text }]}>{`${LRM}+${MINUTES_STEP}`}</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepper: {
    width: scaled(54),
    height: scaled(48),
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
});
