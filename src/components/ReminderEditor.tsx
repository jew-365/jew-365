import React, { useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Mitzvah, Reminder, ReminderAnchor, UserSettings } from '@/types/mitzvah';
import type { Location } from '@/types/zmanim';
import { nextReminderAt } from '@/services/NotificationScheduler';
import { BRAND } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useI18n } from '@/i18n';
import { currentOrNextWindow } from '@/utils/buildDayTimeline';
import { TIME_PATTERN, clockOf, minutesToTime, timeToMinutes } from '@/utils/clock';
import { appDayKey } from '@/utils/locationDay';
import { reminderLabel } from '@/utils/mitzvahName';
import {
  BLOCK_EXIT_DEFAULT_MIN,
  FOLLOW_UP_DEFAULT_MIN,
  FOLLOW_UP_MAX_MIN,
  HEADS_UP_MAX_MIN,
  skipsIfDone,
} from '@/utils/skipRules';
import { BottomSheet } from './BottomSheet';
import { SegmentedControl } from './SegmentedControl';
import { TimeField } from './TimeField';

const BODY_HEIGHT_SHARE = 0.65;

const MAX_OFFSET_MIN = 720;

const OFFSET_PATTERN = /^[-+]?[0-9]+$/;

export function parseOffsetMinutes(raw: string): number | null {
  const typed = raw.trim();
  if (!OFFSET_PATTERN.test(typed)) return null;
  return Number(typed) || 0;
}

type Props = {
  visible: boolean;
  initialValue?: Reminder | null;
  mitzvah: Mitzvah;
  location: Location;
  settings: UserSettings;
  mitzvahName?: string;
  onClose: () => void;
  onSave: (value: Reminder) => void;
};

export function ReminderEditor({
  visible,
  initialValue,
  mitzvah,
  location,
  settings,
  mitzvahName,
  onClose,
  onSave,
}: Props) {
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const { t } = useI18n();
  const [anchor, setAnchor] = useState<ReminderAnchor>('start');
  const [offsetMin, setOffsetMin] = useState('0');
  const [time, setTime] = useState('');
  const [label, setLabel] = useState('');
  const [skipIfDone, setSkipIfDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const startsOnClock = initialValue?.anchor === 'clock';
    setAnchor(initialValue?.anchor ?? 'start');
    setOffsetMin(startsOnClock ? '0' : String(initialValue?.offsetMin ?? 0));
    setTime(startsOnClock ? minutesToTime(initialValue.offsetMin) : '');
    setLabel(initialValue?.label ?? '');
    setSkipIfDone(initialValue?.skipIfDone ?? false);
    setError(null);
  }, [initialValue, visible]);

  const followUpLabel = reminderLabel({ anchor: 'followUp', label: '' }, mitzvahName ?? mitzvah.name.he);

  const changeAnchor = (next: ReminderAnchor) => {
    if (next === anchor) return;
    if (next === 'followUp') setOffsetMin(String(FOLLOW_UP_DEFAULT_MIN));
    else if (next === 'blockExit') setOffsetMin(String(BLOCK_EXIT_DEFAULT_MIN));
    else if (anchor === 'clock' || anchor === 'followUp' || anchor === 'blockExit') setOffsetMin('0');
    setAnchor(next);
  };

  const save = () => {
    const onClock = anchor === 'clock';
    if (onClock && !TIME_PATTERN.test(time)) {
      setError(t('reminder.errors.timeRequired'));
      return;
    }
    const minutes = onClock ? timeToMinutes(time) : parseOffsetMinutes(offsetMin);
    if (minutes === null) {
      setError(t('reminder.errors.offsetInvalid'));
      return;
    }
    if (anchor === 'followUp' && !(minutes >= 1 && minutes <= FOLLOW_UP_MAX_MIN)) {
      setError(t('reminder.errors.followUpRange', { max: FOLLOW_UP_MAX_MIN }));
      return;
    }
    if (anchor === 'blockExit' && !(minutes >= 0 && minutes <= MAX_OFFSET_MIN)) {
      setError(t('reminder.errors.blockExitRange', { max: MAX_OFFSET_MIN }));
      return;
    }
    if (!onClock && Math.abs(minutes) > MAX_OFFSET_MIN) {
      setError(t('reminder.errors.offsetRange', { max: MAX_OFFSET_MIN }));
      return;
    }
    const reminder: Reminder = {
      anchor,
      offsetMin: minutes,
      label: label.trim() || (anchor === 'followUp' ? '' : mitzvahName || t('detail.addReminder')),
      skipIfDone: skipsIfDone({ anchor, skipIfDone }),
    };
    const now = new Date();
    const window = currentOrNextWindow(mitzvah, location, settings, now);
    if (
      window &&
      nextReminderAt(mitzvah, [reminder], { now, location, settings, completions: {}, skipped: {} }) === null
    ) {
      const hours = { start: clockOf(window.start, location.tz), end: clockOf(window.end, location.tz) };
      const isToday =
        window.start.getTime() <= now.getTime() || appDayKey(window.start, location) === appDayKey(now, location);
      setError(
        isToday
          ? t('reminder.errors.outsideWindowToday', hours)
          : t('reminder.errors.outsideWindowNext', {
              ...hours,
              date: DateTime.fromJSDate(window.start, { zone: location.tz }).toFormat('dd/MM'),
            }),
      );
      return;
    }
    setError(null);
    onSave(reminder);
    onClose();
  };

  const anchorOptions: { value: ReminderAnchor; label: string }[] = [
    { value: 'start', label: t('reminder.anchor.start') },
    { value: 'end', label: t('reminder.anchor.end') },
    { value: 'clock', label: t('reminder.anchor.clock') },
    ...(mitzvah.isCustom ? [{ value: 'followUp' as const, label: t('reminder.anchor.followUp') }] : []),
    ...(mitzvah.multiDay ? [{ value: 'blockExit' as const, label: t('reminder.anchor.blockExit') }] : []),
  ];
  const offsetHint =
    anchor === 'start'
      ? t('reminder.headsUpHint', { max: HEADS_UP_MAX_MIN })
      : anchor === 'followUp'
        ? t('reminder.followUp.hint', { max: FOLLOW_UP_MAX_MIN })
        : anchor === 'blockExit'
          ? t('reminder.blockExit.hint', { max: MAX_OFFSET_MIN })
          : null;

  return (
    <BottomSheet
      visible={visible}
      title={initialValue ? t('reminder.edit') : t('reminder.add')}
      caption={mitzvahName}
      onClose={onClose}
    >
      <ScrollView
        style={{ maxHeight: windowHeight * BODY_HEIGHT_SHARE }}
        contentContainerStyle={styles.fields}
        keyboardShouldPersistTaps="handled"
      >
        <SegmentedControl options={anchorOptions} value={anchor} onChange={changeAnchor} style={styles.anchor} />
        <Text style={[typography.captionBold, styles.fieldLabel, { color: colors.text }]}>{t('reminder.label')}</Text>
        <TextInput
          accessibilityLabel={t('reminder.label')}
          value={label}
          onChangeText={setLabel}
          placeholder={anchor === 'followUp' ? followUpLabel : t('detail.addReminder')}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border }]}
        />
        {anchor === 'clock' ? (
          <TimeField inline label={t('reminder.time')} value={time} onChange={setTime} />
        ) : (
          <>
            <Text style={[typography.captionBold, styles.fieldLabel, { color: colors.text }]}>
              {t('reminder.offset')}
            </Text>
            <View style={styles.offsetRow}>
              <Pressable
                onPress={() => setOffsetMin(String((parseOffsetMinutes(offsetMin) ?? 0) - 5))}
                style={[styles.stepper, { backgroundColor: colors.surface2, borderColor: colors.border }]}
              >
                <Text style={[typography.bodyBold, { color: colors.text }]}>-5</Text>
              </Pressable>
              <TextInput
                accessibilityLabel={t('reminder.offset')}
                keyboardType={Platform.OS === 'android' ? 'numeric' : 'numbers-and-punctuation'}
                value={offsetMin}
                onChangeText={setOffsetMin}
                style={[
                  styles.input,
                  styles.offsetInput,
                  { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border },
                ]}
              />
              <Pressable
                onPress={() => setOffsetMin(String((parseOffsetMinutes(offsetMin) ?? 0) + 5))}
                style={[styles.stepper, { backgroundColor: colors.surface2, borderColor: colors.border }]}
              >
                <Text style={[typography.bodyBold, { color: colors.text }]}>+5</Text>
              </Pressable>
            </View>
            {offsetHint ? (
              <Text style={[typography.small, styles.hint, { color: colors.textMuted }]}>{offsetHint}</Text>
            ) : null}
          </>
        )}
        {anchor !== 'followUp' ? (
          <View style={[styles.switchRow, { borderTopColor: colors.border }]}>
            <View style={styles.switchLabel}>
              <Text style={[typography.subheading, { color: colors.text }]}>{t('reminder.skipIfDone')}</Text>
            </View>
            <Switch
              value={skipIfDone}
              onValueChange={setSkipIfDone}
              thumbColor={BRAND.white}
              trackColor={{ false: colors.border, true: colors.gold }}
            />
          </View>
        ) : null}
        {error ? <Text style={[typography.small, styles.error, { color: colors.urgent }]}>{error}</Text> : null}
        <Pressable onPress={save} accessibilityRole="button" style={[styles.saveBtn, { backgroundColor: colors.gold }]}>
          <Text style={[typography.bodyBold, { color: colors.onGold }]}>{t('common.save')}</Text>
        </Pressable>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: spacing.sm,
  },
  anchor: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  offsetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepper: {
    width: 54,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offsetInput: {
    flex: 1,
    minWidth: 0,
    marginBottom: 0,
    textAlign: 'center',
  },
  hint: {
    marginTop: spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  switchLabel: {
    flex: 1,
  },
  error: {
    marginTop: spacing.xs,
  },
  saveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
});
