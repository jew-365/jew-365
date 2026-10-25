import React, { useMemo, useRef, useState } from 'react';
import { Keyboard, ScrollView, StyleProp, StyleSheet, Switch, Text, TextInput, TextStyle, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { BottomSheet, SheetAction } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { CalendarRangePicker, DateRange } from '@/components/CalendarRangePicker';
import { Card } from '@/components/Card';
import { ChipRow } from '@/components/ChipRow';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ListRow } from '@/components/ListRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionLabel } from '@/components/SectionLabel';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TimeField } from '@/components/TimeField';
import { WeekdayPicker } from '@/components/WeekdayPicker';
import { WheelPicker } from '@/components/WheelPicker';
import { SIDDUR_GROUPS, SIDDUR_TEXTS, standaloneTextsIn } from '@/data/siddur';
import { useCustomMitzvotStore, makeCustomMitzvahId } from '@/stores/useCustomMitzvotStore';
import { effectiveReminders, useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { BRAND } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useI18n } from '@/i18n';
import { TIME_PATTERN, minutesToTime, timeToMinutes } from '@/utils/clock';
import {
  DraftBlock,
  STREAK_DEFAULT_DAYS,
  STREAK_MAX_DAYS,
  WEEKDAYS,
  addDaysToKey,
  categoryForWindow,
  cleanContentBlocks,
  currentSchedule,
  reminderClock,
  scheduleDateLabel,
  scheduleOnSave,
  siddurTextName,
  streakEndedOnSave,
  streakStartOnSave,
  validStreakDays,
} from '@/utils/customMitzvah';
import { appDayKey } from '@/utils/locationDay';
import { reminderLabel } from '@/utils/mitzvahName';
import { FOLLOW_UP_DEFAULT_MIN, FOLLOW_UP_MAX_MIN, HEADS_UP_MAX_MIN } from '@/utils/skipRules';
import { CustomSchedule, Nusach, Reminder, ReminderAnchor, SkipContext, Weekday } from '@/types/mitzvah';
import { MitzvahTextId, SiddurTextId } from '@/types/siddur';

type ScheduleMode = CustomSchedule['mode'];

const CONTENT_TYPES: DraftBlock['type'][] = ['text', 'blessing', 'link', 'siddur'];
const STREAK_CHOICES: readonly number[] = Array.from({ length: STREAK_MAX_DAYS }, (_, index) => index + 1);
function siddurChoices(nusach: Nusach): SiddurTextId[] {
  return [
    ...(Object.keys(SIDDUR_TEXTS) as MitzvahTextId[]),
    ...SIDDUR_GROUPS.flatMap((group) => standaloneTextsIn(group, nusach)),
  ];
}

function emptyReminder(): Reminder {
  return { anchor: 'start', offsetMin: 0, label: '' };
}

function Hint({ text, style }: { text: string; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  return <Text style={[typography.small, styles.hint, { color: colors.textMuted }, style]}>{text}</Text>;
}

type Surface = 'home' | 'schedule' | 'notifications' | 'history' | 'library' | 'details' | 'siddur';

const DAY_SURFACES: readonly Surface[] = ['home', 'schedule', 'notifications', 'history'];
const CATEGORY_SURFACES: readonly Surface[] = ['library'];
const REMINDER_SURFACES: readonly Surface[] = ['notifications'];
const CONTENT_SURFACES: readonly Surface[] = ['details', 'siddur', 'notifications'];

function Affects({ surfaces, style }: { surfaces: readonly Surface[]; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const names = surfaces.map((surface) => t(`custom.surface.${surface}`)).join(' · ');
  return (
    <Text accessibilityRole="text" style={[typography.small, styles.affects, { color: colors.goldText }, style]}>
      {t('custom.affects', { surfaces: names })}
    </Text>
  );
}

export default function CustomMitzvahScreen() {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const router = useRouter();
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const editingId = typeof rawId === 'string' && rawId.length > 0 ? rawId : null;

  const existing = useCustomMitzvotStore((s) => (editingId ? s.items[editingId] : undefined));
  const addCustom = useCustomMitzvotStore((s) => s.add);
  const updateCustom = useCustomMitzvotStore((s) => s.update);
  const removeCustom = useCustomMitzvotStore((s) => s.remove);
  const setEnabled = useMitzvotStore((s) => s.setEnabled);
  const removeFromActive = useMitzvotStore((s) => s.removeMitzvah);
  const location = useUserStore((s) => s.location);
  const nusach = useUserStore((s) => s.nusach);

  const [name, setName] = useState(existing?.name ?? '');
  const [startTime, setStartTime] = useState(existing?.startHHMM ?? '08:00');
  const [endTime, setEndTime] = useState(existing?.endHHMM ?? '12:00');
  const [initialSchedule] = useState(() => (existing ? currentSchedule(existing) : null));
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>(initialSchedule?.mode ?? 'weekdays');
  const [activeDays, setActiveDays] = useState<Weekday[]>(() =>
    initialSchedule?.mode === 'weekdays' ? [...initialSchedule.days] : [...WEEKDAYS],
  );
  const [range, setRange] = useState<DateRange>(() =>
    initialSchedule?.mode === 'range'
      ? { start: initialSchedule.start, end: initialSchedule.end }
      : { start: null, end: null },
  );
  const [streakDays, setStreakDays] = useState(
    initialSchedule?.mode === 'streak' ? initialSchedule.days : STREAK_DEFAULT_DAYS,
  );
  const [rangeOpen, setRangeOpen] = useState(false);
  const [skipShabbat, setSkipShabbat] = useState(existing?.skipOn.includes('shabbat') ?? false);
  const [skipYomtov, setSkipYomtov] = useState(existing?.skipOn.includes('yomtov') ?? false);
  const [reminders, setReminders] = useState<Reminder[]>(() =>
    existing ? effectiveReminders(existing.id) : [emptyReminder()],
  );
  const [contentBlocks, setContentBlocks] = useState<DraftBlock[]>(existing?.contentBlocks ?? []);
  const [pickingBlockIndex, setPickingBlockIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const pickerRef = useRef<ScrollView>(null);

  const titleText = useMemo(() => (editingId ? t('custom.editTitle') : t('custom.title')), [editingId, t]);
  const timesValid = TIME_PATTERN.test(startTime) && TIME_PATTERN.test(endTime);
  const endMinusStart = timesValid ? timeToMinutes(endTime) - timeToMinutes(startTime) : 1;
  const windowNote =
    endMinusStart < 0
      ? t('custom.window.nextDay', { time: endTime })
      : endMinusStart === 0
        ? t('custom.window.fullDay', { time: endTime })
        : null;
  const pickingBlock = pickingBlockIndex === null ? undefined : contentBlocks[pickingBlockIndex];
  const pickedTextId = pickingBlock?.type === 'siddur' ? pickingBlock.textId : null;
  const todayKey = appDayKey(new Date(), location);
  const rangeSummary =
    range.start && range.end
      ? t('custom.schedule.rangeSummary', {
          from: scheduleDateLabel(range.start, language),
          to: scheduleDateLabel(range.end, language),
        })
      : range.start
        ? t('custom.schedule.rangeStartOnly', { from: scheduleDateLabel(range.start, language) })
        : t('custom.schedule.rangeEmpty');
  const streakStart = streakStartOnSave(existing, streakDays, todayKey);
  const streakSummaryKey =
    streakEndedOnSave(existing, streakDays, todayKey) !== null
      ? 'custom.schedule.streakEnded'
      : streakStart === todayKey
        ? 'custom.schedule.streakSummary'
        : 'custom.schedule.streakKept';
  const streakSummary = t(streakSummaryKey, {
    from: scheduleDateLabel(streakStart, language),
    to: scheduleDateLabel(addDaysToKey(streakStart, streakDays - 1), language),
  });
  const openRange = () => {
    Keyboard.dismiss();
    setRangeOpen(true);
  };

  const outsideCopy = (
    reminder: Reminder,
    key: 'custom.reminderOutsideWindow' | 'custom.errors.reminderOutsideWindow',
  ) =>
    reminder.anchor === 'followUp'
      ? t('reminder.errors.followUpRange', { max: FOLLOW_UP_MAX_MIN })
      : t(key, { hours: HEADS_UP_MAX_MIN / 60 });

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/mitzvot'));

  const onSave = () => {
    setError(null);
    if (!name.trim()) {
      setError(t('custom.errors.nameRequired'));
      return;
    }
    if (!timesValid) {
      setError(t('custom.errors.timeInvalid'));
      return;
    }
    const todayOnSave = appDayKey(new Date(), location);
    let schedule: CustomSchedule;
    if (scheduleMode === 'weekdays') {
      if (!activeDays.length) {
        setError(t('custom.errors.daysRequired'));
        return;
      }
      schedule = { mode: 'weekdays', days: activeDays };
    } else if (scheduleMode === 'range') {
      if (!range.start || !range.end) {
        setError(t('custom.errors.rangeRequired'));
        return;
      }
      schedule = { mode: 'range', start: range.start, end: range.end };
    } else {
      if (!validStreakDays(streakDays)) {
        setError(t('custom.errors.streakRange', { max: STREAK_MAX_DAYS }));
        return;
      }
      schedule = { mode: 'streak', start: todayOnSave, days: streakDays };
    }
    const skipOn: SkipContext[] = [];
    if (skipShabbat) skipOn.push('shabbat');
    if (skipYomtov) skipOn.push('yomtov');
    if (!reminders.length) {
      setError(t('custom.errors.reminderRequired'));
      return;
    }
    const cleanedReminders = reminders.map(({ bodyVariants: _dropped, ...r }) => ({
      ...r,
      label: r.label.trim(),
    }));
    if (cleanedReminders.some((r) => r.anchor !== 'followUp' && !r.label)) {
      setError(t('custom.errors.reminderLabelRequired'));
      return;
    }
    const outside = cleanedReminders.find((r) => reminderClock(startTime, endTime, r) === null);
    if (outside) {
      setError(outsideCopy(outside, 'custom.errors.reminderOutsideWindow'));
      return;
    }
    const fields = {
      name: name.trim(),
      startHHMM: startTime,
      endHHMM: endTime,
      skipOn,
      activeDays: undefined,
      schedules: scheduleOnSave(existing, schedule, todayOnSave),
      reminders: cleanedReminders,
      contentBlocks: cleanContentBlocks(contentBlocks),
    };
    if (editingId && existing) {
      updateCustom(editingId, fields);
      useMitzvotStore.getState().resetToDefault(editingId);
    } else {
      const id = makeCustomMitzvahId();
      addCustom({ id, ...fields, createdAt: Date.now() });
      setEnabled(id, true);
    }
    leave();
  };

  const onDelete = () => {
    if (!editingId) return;
    removeCustom(editingId);
    removeFromActive(editingId);
    setDeleteVisible(false);
    leave();
  };

  const toggleDay = (day: number) => {
    const weekday = WEEKDAYS.find((candidate) => candidate === day);
    if (weekday === undefined) return;
    setActiveDays((prev) => (prev.includes(weekday) ? prev.filter((d) => d !== weekday) : [...prev, weekday]));
  };
  const updateReminder = (idx: number, patch: Partial<Reminder>) => {
    setReminders((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const changeAnchor = (idx: number, anchor: ReminderAnchor) => {
    setReminders((prev) =>
      prev.map((r, i) => {
        if (i !== idx || r.anchor === anchor) return r;
        if (anchor === 'followUp') return { ...r, anchor, offsetMin: FOLLOW_UP_DEFAULT_MIN };
        if (anchor === 'clock') {
          const fires = r.anchor === 'followUp' ? null : reminderClock(startTime, endTime, r);
          return { ...r, anchor, offsetMin: fires ? timeToMinutes(fires) : timesValid ? timeToMinutes(startTime) : 0 };
        }
        if (r.anchor === 'clock' || r.anchor === 'followUp') return { ...r, anchor, offsetMin: 0 };
        return { ...r, anchor, offsetMin: anchor === 'end' ? -Math.abs(r.offsetMin) : Math.abs(r.offsetMin) };
      }),
    );
  };
  const removeReminder = (idx: number) => {
    setReminders((prev) => prev.filter((_, i) => i !== idx));
  };
  const addReminder = () => {
    setReminders((prev) => [...prev, emptyReminder()]);
  };
  const addContentBlock = () => {
    setContentBlocks((prev) => [...prev, { type: 'text', he: '' }]);
  };
  const removeContentBlock = (idx: number) => {
    setContentBlocks((prev) => prev.filter((_, i) => i !== idx));
  };
  const updateContentBlock = (idx: number, next: DraftBlock) => {
    setContentBlocks((prev) => prev.map((block, i) => (i === idx ? next : block)));
  };
  const changeContentType = (idx: number, type: DraftBlock['type']) => {
    setContentBlocks((prev) =>
      prev.map((block, i): DraftBlock => {
        if (i !== idx || block.type === type) return block;
        const he = block.type === 'siddur' || type === 'siddur' ? '' : block.he;
        if (type === 'link') return { type, he, url: block.type === 'link' ? block.url : '' };
        if (type === 'siddur') return { type, he, textId: null };
        return { type, he };
      }),
    );
  };
  const pickSiddurText = (textId: SiddurTextId) => {
    if (pickingBlockIndex === null) return;
    updateContentBlock(pickingBlockIndex, {
      type: 'siddur',
      he: siddurTextName(textId, 'he') ?? '',
      en: siddurTextName(textId, 'en') ?? undefined,
      textId,
    });
    setPickingBlockIndex(null);
  };

  const inputDir = language === 'he' ? 'rtl' : 'ltr';
  const anchorOptions: { value: ReminderAnchor; label: string }[] = [
    { value: 'start', label: t('custom.anchor.fromStart') },
    { value: 'end', label: t('custom.anchor.beforeEnd') },
    { value: 'clock', label: t('reminder.anchor.clock') },
    { value: 'followUp', label: t('reminder.anchor.followUp') },
  ];
  const scheduleOptions: { value: ScheduleMode; label: string }[] = [
    { value: 'weekdays', label: t('custom.schedule.weekdays') },
    { value: 'range', label: t('custom.schedule.range') },
    { value: 'streak', label: t('custom.schedule.streak') },
  ];
  const categoryLabel = timesValid ? t(`library.category.${categoryForWindow(startTime, endTime)}`) : null;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <Stack.Screen options={{ title: titleText, headerShown: false }} />
      <ScreenHeader title={titleText} onBack={goBack} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SectionLabel variant="field" text={t('custom.name')} />
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('custom.namePlaceholder')}
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: colors.surface2,
              color: colors.text,
              borderColor: colors.border,
              writingDirection: inputDir,
            },
          ]}
        />

        <View style={[styles.row, styles.section]}>
          <TimeField label={t('custom.startTime')} value={startTime} onChange={setStartTime} style={styles.timeField} />
          <TimeField label={t('custom.endTime')} value={endTime} onChange={setEndTime} style={styles.timeField} />
        </View>
        {windowNote ? (
          <Text style={[typography.small, styles.note, { color: colors.goldText }]}>{windowNote}</Text>
        ) : null}
        <Hint text={t('custom.hint.time')} />
        <Affects surfaces={DAY_SURFACES} />

        <View style={styles.section}>
          <SectionLabel variant="field" text={t('custom.category')} />
          {categoryLabel ? (
            <View
              accessible
              accessibilityLabel={`${t('custom.category')}: ${categoryLabel}`}
              style={[styles.pill, { backgroundColor: colors.surface2 }]}
            >
              <Text style={[typography.small, { color: colors.textSub }]}>{categoryLabel}</Text>
            </View>
          ) : null}
          <Hint text={t('custom.hint.category')} />
          <Affects surfaces={CATEGORY_SURFACES} />
        </View>

        <View style={styles.section}>
          <SectionLabel variant="field" text={t('custom.schedule')} />
          <SegmentedControl
            options={scheduleOptions}
            value={scheduleMode}
            onChange={setScheduleMode}
            style={styles.scheduleMode}
          />
          {scheduleMode === 'weekdays' ? (
            <>
              <WeekdayPicker selected={activeDays} onToggle={toggleDay} />
              <Hint text={t('custom.hint.days')} />
            </>
          ) : scheduleMode === 'range' ? (
            <>
              <Card>
                <ListRow
                  icon="calendar"
                  title={rangeSummary}
                  accessibilityLabel={rangeSummary}
                  chevron
                  onPress={openRange}
                />
              </Card>
              <Hint text={t('custom.hint.range')} />
            </>
          ) : (
            <>
              <SectionLabel variant="field" text={t('custom.schedule.streakDays')} />
              <WheelPicker
                values={STREAK_CHOICES}
                selected={streakDays}
                onChange={setStreakDays}
                accessibilityLabel={t('custom.schedule.streakDays')}
                style={styles.streakWheel}
              />
              <Text style={[typography.small, styles.note, { color: colors.goldText }]}>{streakSummary}</Text>
              <Hint text={t('custom.hint.streak')} />
            </>
          )}
          <Affects surfaces={DAY_SURFACES} />
        </View>

        <View style={[styles.switchRow, styles.section]}>
          <Text style={[typography.bodyBold, { color: colors.text }]}>{t('custom.skipShabbat')}</Text>
          <Switch
            value={skipShabbat}
            onValueChange={setSkipShabbat}
            thumbColor={BRAND.white}
            trackColor={{ false: colors.border, true: colors.gold }}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={[typography.bodyBold, { color: colors.text }]}>{t('custom.skipYomtov')}</Text>
          <Switch
            value={skipYomtov}
            onValueChange={setSkipYomtov}
            thumbColor={BRAND.white}
            trackColor={{ false: colors.border, true: colors.gold }}
          />
        </View>
        <Hint text={t('custom.hint.skip')} style={styles.tightHint} />
        <Affects surfaces={DAY_SURFACES} />

        <Text style={[typography.subheading, styles.section, { color: colors.text }]}>{t('custom.reminders')}</Text>
        <Hint text={t('custom.hint.reminders')} style={styles.tightHint} />
        <Affects surfaces={REMINDER_SURFACES} style={styles.headingAffects} />
        {reminders.map((r, idx) => {
          const clock = reminderClock(startTime, endTime, r);
          return (
            <Card key={idx} padded style={styles.itemCard}>
              <TextInput
                value={r.label}
                onChangeText={(v) => updateReminder(idx, { label: v })}
                placeholder={
                  r.anchor === 'followUp'
                    ? reminderLabel({ anchor: r.anchor, label: '' }, name.trim())
                    : t('custom.reminderLabelPlaceholder')
                }
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface2,
                    color: colors.text,
                    borderColor: colors.border,
                    writingDirection: inputDir,
                    marginBottom: spacing.md,
                  },
                ]}
              />
              <SegmentedControl
                options={anchorOptions}
                value={r.anchor}
                onChange={(v) => changeAnchor(idx, v)}
                style={styles.anchor}
              />
              {r.anchor === 'clock' ? (
                <TimeField
                  label={t('reminder.time')}
                  value={minutesToTime(r.offsetMin)}
                  onChange={(value) => updateReminder(idx, { offsetMin: timeToMinutes(value) })}
                />
              ) : (
                <View style={styles.reminderRow}>
                  <TextInput
                    value={String(r.anchor === 'end' ? Math.abs(r.offsetMin) : r.offsetMin)}
                    onChangeText={(v) => {
                      const early = r.anchor === 'end' || r.offsetMin < 0;
                      const max = r.anchor === 'start' && early ? HEADS_UP_MAX_MIN : 720;
                      const num = Math.min(max, Number(v.replace(/[^0-9]/g, '')) || 0);
                      updateReminder(idx, { offsetMin: early ? -num : num });
                    }}
                    accessibilityLabel={t('custom.offsetMinutes')}
                    keyboardType="number-pad"
                    style={[
                      styles.input,
                      styles.offsetInput,
                      {
                        backgroundColor: colors.surface2,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    maxLength={4}
                  />
                  <Text style={[typography.caption, styles.offsetWord, { color: colors.textSub }]}>
                    {t('custom.offsetMinutes')}
                  </Text>
                </View>
              )}
              {clock ? (
                <Text style={[typography.small, styles.note, { color: colors.goldText }]}>
                  {t('custom.reminderPreview', { time: clock })}
                </Text>
              ) : timesValid ? (
                <Text style={[typography.small, styles.note, { color: colors.urgent }]}>
                  {outsideCopy(r, 'custom.reminderOutsideWindow')}
                </Text>
              ) : null}
              <Hint
                text={
                  r.anchor === 'followUp'
                    ? t('reminder.followUp.hint', { max: FOLLOW_UP_MAX_MIN })
                    : t('custom.hint.reminderAnchor', { max: HEADS_UP_MAX_MIN })
                }
                style={styles.tightHint}
              />
              <Button
                variant="danger"
                size="compact"
                label={t('custom.deleteReminder')}
                onPress={() => removeReminder(idx)}
                style={styles.itemAction}
              />
            </Card>
          );
        })}
        <Button
          variant="secondary"
          icon="plus"
          label={t('custom.addReminder')}
          onPress={addReminder}
          style={styles.addAction}
        />

        <View style={[styles.editorSection, { borderColor: colors.border }]}>
          <Text style={[typography.subheading, { color: colors.text }]}>{t('custom.contentBlocks')}</Text>
          <Hint text={t('custom.hint.content')} style={styles.tightHint} />
          <Affects surfaces={CONTENT_SURFACES} style={styles.headingAffects} />
          {contentBlocks.map((block, idx) => (
            <Card key={idx} padded style={styles.itemCard}>
              <ChipRow
                values={CONTENT_TYPES}
                selected={block.type}
                onSelect={(type) => changeContentType(idx, type)}
                renderLabel={(type) => t(`custom.contentType.${type}`)}
              />
              {block.type === 'siddur' ? (
                <Button
                  variant="secondary"
                  label={
                    block.textId
                      ? (siddurTextName(block.textId, language) ??
                        (language === 'en' && block.en ? block.en : block.he))
                      : t('custom.pickSiddurText')
                  }
                  onPress={() => {
                    Keyboard.dismiss();
                    setPickingBlockIndex(idx);
                  }}
                  style={styles.itemAction}
                />
              ) : (
                <>
                  <TextInput
                    value={block.he}
                    onChangeText={(value) => updateContentBlock(idx, { ...block, he: value })}
                    placeholder={t('custom.contentTextPlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    multiline
                    style={[
                      styles.input,
                      styles.multiInput,
                      {
                        backgroundColor: colors.surface2,
                        color: colors.text,
                        borderColor: colors.border,
                        writingDirection: inputDir,
                        marginTop: spacing.md,
                      },
                    ]}
                  />
                  {block.type === 'link' ? (
                    <TextInput
                      value={block.url}
                      onChangeText={(value) => updateContentBlock(idx, { ...block, url: value })}
                      placeholder={t('custom.contentUrlPlaceholder')}
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      keyboardType="url"
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.surface2,
                          color: colors.text,
                          borderColor: colors.border,
                          writingDirection: 'ltr',
                          textAlign: 'left',
                          marginTop: spacing.md,
                        },
                      ]}
                    />
                  ) : null}
                </>
              )}
              <Button
                variant="danger"
                size="compact"
                label={t('custom.deleteContentBlock')}
                onPress={() => removeContentBlock(idx)}
                style={styles.itemAction}
              />
            </Card>
          ))}
          <Button
            variant="secondary"
            icon="plus"
            label={t('custom.addContentBlock')}
            onPress={addContentBlock}
            style={styles.addAction}
          />
        </View>

        {error ? (
          <Text style={[typography.captionBold, { color: colors.urgent, marginTop: spacing.lg, textAlign: 'center' }]}>
            {error}
          </Text>
        ) : null}

        <Button label={t('custom.save')} onPress={onSave} style={styles.saveAction} />

        {editingId ? (
          <Button
            variant="danger"
            label={t('custom.delete')}
            onPress={() => setDeleteVisible(true)}
            style={styles.itemAction}
          />
        ) : null}
      </ScrollView>

      <BottomSheet
        visible={pickingBlockIndex !== null}
        title={t('custom.pickSiddurText')}
        onClose={() => setPickingBlockIndex(null)}
      >
        <ScrollView ref={pickerRef} style={styles.sheetList}>
          {siddurChoices(nusach).map((id) => {
            const selected = id === pickedTextId;
            return (
              <SheetAction
                key={id}
                label={siddurTextName(id, language) ?? ''}
                selected={selected}
                onLayout={
                  selected
                    ? (event) =>
                        pickerRef.current?.scrollTo({
                          y: Math.max(0, event.nativeEvent.layout.y - 96),
                          animated: false,
                        })
                    : undefined
                }
                onPress={() => pickSiddurText(id)}
              />
            );
          })}
        </ScrollView>
      </BottomSheet>
      <BottomSheet
        visible={rangeOpen}
        title={t('custom.schedule.range')}
        caption={t('custom.schedule.rangeHint')}
        onClose={() => setRangeOpen(false)}
      >
        <CalendarRangePicker value={range} todayKey={todayKey} onChange={setRange} />
      </BottomSheet>
      <ConfirmDialog
        visible={deleteVisible}
        title={t('custom.deleteConfirmTitle')}
        body={t('custom.deleteConfirmBody')}
        confirmLabel={t('common.delete')}
        destructive
        onConfirm={onDelete}
        onCancel={() => setDeleteVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  section: { marginTop: spacing.xl },
  hint: { marginTop: spacing.sm },
  tightHint: { marginTop: spacing.xs },
  affects: { marginTop: spacing.xs },
  headingAffects: { marginTop: spacing.xs, marginBottom: spacing.md },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
  },
  multiInput: {
    minHeight: 86,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-end' },
  timeField: { flex: 1 },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  anchor: { marginBottom: spacing.md },
  scheduleMode: { marginBottom: spacing.md },
  streakWheel: { width: 96, alignSelf: 'center' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  itemCard: { marginBottom: spacing.md },
  itemAction: { marginTop: spacing.md },
  addAction: { marginTop: spacing.sm },
  saveAction: { marginTop: spacing.xl },
  reminderRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  offsetInput: { width: 72, textAlign: 'center' },
  offsetWord: { flexShrink: 0 },
  note: { marginTop: spacing.sm },
  editorSection: {
    borderTopWidth: 1,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
  },
  sheetList: {
    maxHeight: 420,
  },
});
