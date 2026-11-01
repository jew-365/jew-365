import React, { useEffect, useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Mitzvah, NagLevel, Reminder, UserSettings } from '@/types/mitzvah';
import type { Location } from '@/types/zmanim';
import { nagPreview, nextReminderAt } from '@/services/NotificationScheduler';
import { BRAND } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useI18n } from '@/i18n';
import { currentOrNextWindow } from '@/utils/buildDayTimeline';
import { TIME_PATTERN, clockOf, fireTimeText, minutesToTime, timeToMinutes } from '@/utils/clock';
import { appDayKey } from '@/utils/locationDay';
import { reminderLabel } from '@/utils/mitzvahName';
import {
  ReminderTiming,
  minutesError,
  parseMinutes,
  switchTiming,
  timingKinds,
  timingMinutes,
  timingOf,
  withTiming,
} from '@/utils/reminderTiming';
import { skipsIfDone } from '@/utils/skipRules';
import { DEFAULT_NAG_LEVEL, nagFor } from '@/utils/nagging';
import { BottomSheet } from './BottomSheet';
import { ReminderNagFields } from './ReminderNagFields';
import { ReminderTimingFields } from './ReminderTimingFields';
import { SectionLabel } from './SectionLabel';

const BODY_HEIGHT_SHARE = 0.65;

type Translate = (scope: string, options?: Record<string, unknown>) => string;

type SendCheck = { fires: boolean; text: string };

function readValue(
  timing: ReminderTiming,
  minutes: string,
  time: string,
  t: Translate,
): { value: number } | { error: string } {
  if (timing === 'clock') {
    return TIME_PATTERN.test(time) ? { value: timeToMinutes(time) } : { error: t('reminder.errors.timeRequired') };
  }
  const parsed = parseMinutes(minutes);
  if (parsed === null) return { error: t('reminder.errors.offsetInvalid') };
  const problem = minutesError(timing, parsed);
  return problem ? { error: t(problem.key, { max: problem.max }) } : { value: parsed };
}

function checkSend(
  mitzvah: Mitzvah,
  reminder: Reminder,
  location: Location,
  settings: UserSettings,
  t: Translate,
  now: Date,
): SendCheck | null {
  const next = nextReminderAt(mitzvah, [reminder], { now, location, settings, completions: {}, skipped: {} });
  if (next) return { fires: true, text: t('detail.previewNext', { time: fireTimeText(next, location.tz) }) };
  const window = currentOrNextWindow(mitzvah, location, settings, now);
  if (!window) return null;
  const hours = { start: clockOf(window.start, location.tz), end: clockOf(window.end, location.tz) };
  const isToday =
    window.start.getTime() <= now.getTime() || appDayKey(window.start, location) === appDayKey(now, location);
  return {
    fires: false,
    text: isToday
      ? t('reminder.errors.outsideWindowToday', hours)
      : t('reminder.errors.outsideWindowNext', {
          ...hours,
          date: DateTime.fromJSDate(window.start, { zone: location.tz }).toFormat('dd/MM'),
        }),
  };
}

type Props = {
  visible: boolean;
  initialValue?: Reminder | null;
  mitzvah: Mitzvah;
  location: Location;
  settings: UserSettings;
  mitzvahName?: string;
  // The mitzvah's resolved nagging level (its own, else the app's), for the nag block and its preview.
  nagLevel?: NagLevel;
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
  nagLevel = DEFAULT_NAG_LEVEL,
  onClose,
  onSave,
}: Props) {
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const { t } = useI18n();
  const [timing, setTiming] = useState<ReminderTiming>('fromStart');
  const [minutes, setMinutes] = useState('0');
  const [time, setTime] = useState('');
  const [label, setLabel] = useState('');
  const [skipIfDone, setSkipIfDone] = useState(false);
  const [nag, setNag] = useState<Reminder['nag']>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const initialTiming = initialValue ? timingOf(initialValue) : 'fromStart';
    setTiming(initialTiming);
    setMinutes(initialValue && initialTiming !== 'clock' ? String(timingMinutes(initialValue)) : '0');
    setTime(initialValue?.anchor === 'clock' ? minutesToTime(initialValue.offsetMin) : '');
    setLabel(initialValue?.label ?? '');
    setSkipIfDone(initialValue?.skipIfDone ?? false);
    setNag(initialValue?.nag);
    setError(null);
  }, [initialValue, visible]);

  const followUpLabel = reminderLabel({ anchor: 'followUp', label: '' }, mitzvahName ?? mitzvah.name.he);

  const changeTiming = (next: ReminderTiming) => {
    if (next === timing) return;
    const clockMinutes = TIME_PATTERN.test(time) ? timeToMinutes(time) : 0;
    const value = switchTiming(timing, parseMinutes(minutes) ?? 0, next, clockMinutes);
    if (next !== 'clock') setMinutes(String(value));
    setTiming(next);
  };

  useEffect(() => {
    setError(null);
  }, [timing, minutes, time]);

  const sendCheck = useMemo(() => {
    if (!visible) return null;
    const read = readValue(timing, minutes, time, t);
    if ('error' in read) return null;
    const { anchor, offsetMin } = withTiming(timing, read.value);
    return checkSend(mitzvah, { anchor, offsetMin, label: '', skipIfDone: false }, location, settings, t, new Date());
  }, [visible, timing, minutes, time, mitzvah, location, settings, t]);

  // The repeats the draft's next main would send, from the plan's own rule (`nagPreview()`).
  const repeats = useMemo(() => {
    if (!visible || nag === null) return [];
    const read = readValue(timing, minutes, time, t);
    if ('error' in read) return [];
    const draft: Reminder = { ...withTiming(timing, read.value), label: '', ...(nag ? { nag } : {}) };
    const scope = { now: new Date(), location, settings, completions: {}, skipped: {}, nagLevel };
    return nagPreview(mitzvah, draft, scope).map(({ trigger, fires, afterEnd }) => ({
      time: clockOf(trigger, location.tz),
      fires,
      afterEnd,
    }));
  }, [visible, nag, timing, minutes, time, mitzvah, location, settings, nagLevel, t]);

  const save = () => {
    const read = readValue(timing, minutes, time, t);
    if ('error' in read) {
      setError(read.error);
      return;
    }
    const { anchor, offsetMin } = withTiming(timing, read.value);
    const reminder: Reminder = {
      anchor,
      offsetMin,
      label: label.trim() || (timing === 'followUp' ? '' : mitzvahName || t('detail.addReminder')),
      skipIfDone: skipsIfDone({ anchor, skipIfDone }),
      // An own nag is stored with a placement this timing allows; `null` exempts it; absent follows the level.
      ...(nag === undefined ? {} : { nag: nag && nagFor(mitzvah.id, { anchor, nag }, nagLevel) }),
    };
    const check = checkSend(mitzvah, reminder, location, settings, t, new Date());
    if (check && !check.fires) {
      setError(check.text);
      return;
    }
    setError(null);
    onSave(reminder);
    onClose();
  };

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
        <ReminderTimingFields
          inline
          timing={timing}
          kinds={timingKinds({ custom: Boolean(mitzvah.isCustom), multiDay: Boolean(mitzvah.multiDay) })}
          onTiming={changeTiming}
          minutes={minutes}
          onMinutes={setMinutes}
          time={time}
          onTime={setTime}
          style={styles.timing}
        />
        {sendCheck ? (
          <Text
            style={[typography.small, styles.sendLine, { color: sendCheck.fires ? colors.goldText : colors.urgent }]}
          >
            {sendCheck.text}
          </Text>
        ) : null}
        <ReminderNagFields
          mitzvahId={mitzvah.id}
          anchor={withTiming(timing, 0).anchor}
          nag={nag}
          level={nagLevel}
          onChange={setNag}
          preview={repeats}
          style={styles.nag}
        />
        <SectionLabel variant="field" text={t('reminder.label')} />
        <TextInput
          accessibilityLabel={t('reminder.label')}
          value={label}
          onChangeText={setLabel}
          placeholder={timing === 'followUp' ? followUpLabel : t('detail.addReminder')}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border }]}
        />
        {timing !== 'followUp' ? (
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
        {error && error !== sendCheck?.text ? (
          <Text style={[typography.small, styles.error, { color: colors.urgent }]}>{error}</Text>
        ) : null}
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
  timing: {
    marginBottom: spacing.md,
  },
  sendLine: {
    marginBottom: spacing.md,
  },
  nag: {
    marginBottom: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
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
