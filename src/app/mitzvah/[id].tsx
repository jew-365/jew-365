import React, { useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChokAddonCard } from '@/components/ChokAddonCard';
import { ShnayimAddonCard } from '@/components/ShnayimAddonCard';
import { BottomSheet, SheetAction } from '@/components/BottomSheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { IconTile } from '@/components/IconTile';
import { MitzvahIcon, iconFor } from '@/components/MitzvahIcon';
import { ListRow } from '@/components/ListRow';
import { ReminderEditor } from '@/components/ReminderEditor';
import { HeaderPill, ScreenHeader } from '@/components/ScreenHeader';
import { SelichotAddonCard } from '@/components/SelichotAddonCard';
import { WindowTimeline } from '@/components/WindowTimeline';
import { CHOK_TEXT_ID } from '@/data/chok';
import { SHNAYIM_TEXT_ID } from '@/data/shnayim';
import { findAnyMitzvah } from '@/data/customMitzvotAdapter';
import { SELICHOT_TEXT_ID } from '@/data/selichot';
import {
  MITZVAH_STANDALONE_TEXT,
  hasSiddurText,
  isSiddurTextId,
  mitzvahTextId,
  siddurPlace,
  siddurTextPresent,
} from '@/data/siddur';
import { useLateMarkDialog } from '@/hooks/useLateMarkDialog';
import { useNeedsReminderDialog } from '@/hooks/useNeedsReminderDialog';
import { useNow } from '@/hooks/useNow';
import { useChokStore } from '@/stores/useChokStore';
import { useShnayimStore } from '@/stores/useShnayimStore';
import { dateKey, useCompletionsStore } from '@/stores/useCompletionsStore';
import { useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { remindersOf, selectActive, useMitzvotStore } from '@/stores/useMitzvotStore';
import { selectSelichotInstalledFor, useSelichotStore } from '@/stores/useSelichotStore';
import { useUserStore } from '@/stores/useUserStore';
import { BRAND } from '@/theme/colors';
import { scaled } from '@/theme/scale';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { ContentBlock, Reminder, UserSettings } from '@/types/mitzvah';
import { appDayWindow, currentOrNextWindow, windowDueToday } from '@/utils/buildDayTimeline';
import { trackedOn } from '@/utils/checkIn';
import { clockOf, clockRange, fireTimeText } from '@/utils/clock';
import { customStartsOn, scheduleDateLabel } from '@/utils/customMitzvah';
import { appDayKey } from '@/utils/locationDay';
import { windowClosed } from '@/utils/lateMarks';
import { mitzvahName, reminderLabel } from '@/utils/mitzvahName';
import { quietHoursOf } from '@/utils/quietHours';
import { timingSummary } from '@/utils/reminderTiming';
import { shemaOpinionsFor, shemaOpinionsLine } from '@/utils/shemaOpinions';
import { NAG_LEVEL_IDS, remindersPerDay } from '@/utils/nagging';
import { buildTriggerTime, nextReminderAt } from '@/services/NotificationScheduler';
import { useI18n } from '@/i18n';

const DELETE_ICON_SIZE = scaled(16);
const ADD_ICON_SIZE = scaled(18);
const ICON_STROKE = 2.4;

export default function MitzvahDetailScreen() {
  const { colors } = useTheme();
  const { language, t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; highlightContent?: string }>();
  const mitzvah = useMemo(() => findAnyMitzvah(params.id), [params.id]);
  const custom = useCustomMitzvotStore((s) => s.items[params.id]);
  const location = useUserStore((s) => s.location);
  const nusach = useUserStore((s) => s.nusach);
  const ksSofZman = useUserStore((s) => s.halachicOpinions.ksSofZman);
  const inIsrael = useUserStore((s) => s.inIsrael);
  const quietBefore = useUserStore((s) => s.quietBefore);
  const quietAfter = useUserStore((s) => s.quietAfter);
  const appNagLevel = useUserStore((s) => s.nagLevel);
  const completions = useCompletionsStore((s) => s.completions);
  const skipped = useCompletionsStore((s) => s.skipped);
  const late = useCompletionsStore((s) => s.late);
  const unmark = useCompletionsStore((s) => s.unmark);
  const lateMark = useLateMarkDialog();
  const ticked = useNow();
  const active = useMitzvotStore(selectActive(params.id));
  const setReminders = useMitzvotStore((s) => s.setReminders);
  const resetToDefault = useMitzvotStore((s) => s.resetToDefault);
  const setNagLevel = useMitzvotStore((s) => s.setNagLevel);
  const setManualNags = useMitzvotStore((s) => s.setManualNags);
  const [levelSheetVisible, setLevelSheetVisible] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [lastReminderRefused, setLastReminderRefused] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const needsReminder = useNeedsReminderDialog();
  const isChok = mitzvah?.id === CHOK_TEXT_ID;
  const isShnayim = mitzvah?.id === SHNAYIM_TEXT_ID;
  // A weekly learning program, read in the reader on the portion of the moment.
  const isLearning = isChok || isShnayim;
  const chokInstalled = useChokStore((s) => s.installed !== null);
  const shnayimInstalled = useShnayimStore((s) => s.installed !== null);
  const awaitingAddon = (isChok && !chokInstalled) || (isShnayim && !shnayimInstalled);
  const isSelichot = mitzvah?.id === SELICHOT_TEXT_ID;
  const selichotInstalled = useSelichotStore(selectSelichotInstalledFor(nusach));
  const addonMissing = awaitingAddon || (isSelichot && !selichotInstalled);

  const reminders = useMemo(() => remindersOf(active, mitzvah), [active, mitzvah]);
  const includeContentInNotification = reminders.some((reminder) => reminder.includeContentInBody);
  const settings = useMemo<UserSettings>(
    () => ({ nusach, halachicOpinions: { ksSofZman }, inIsrael }),
    [nusach, ksSofZman, inIsrael],
  );
  const quietHours = useMemo(() => quietHoursOf(quietBefore, quietAfter), [quietBefore, quietAfter]);
  // The mitzvah's own nagging level, else the app's: every preview on the screen counts its repeats.
  const nagLevel = active.nagLevel ?? appNagLevel;
  const window = useMemo(
    () => (mitzvah && !addonMissing ? currentOrNextWindow(mitzvah, location, settings) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ticked re-runs the memo on purpose, it reads the clock itself
    [mitzvah, addonMissing, location, settings, ticked],
  );
  const place = siddurPlace(location, inIsrael);
  const textNow = Boolean(mitzvah && window && hasSiddurText(mitzvah, nusach, window.date, place));
  const anytimeTextId =
    mitzvah && !mitzvah.isCustom && !isLearning
      ? (MITZVAH_STANDALONE_TEXT[mitzvah.id] ?? mitzvahTextId(mitzvah.id) ?? null)
      : null;
  const textAnytime = anytimeTextId !== null && !addonMissing && siddurTextPresent(nusach, anytimeTextId);
  const showNext = Boolean(mitzvah) && !addonMissing && active.enabled;
  const nextTrigger = useMemo(
    () =>
      mitzvah && showNext
        ? nextReminderAt(mitzvah, reminders, {
            now: new Date(),
            location,
            settings,
            completions,
            skipped,
            quietHours,
            nagLevel,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ticked re-runs the memo on purpose, it reads the clock itself
    [mitzvah, showNext, reminders, location, settings, completions, skipped, quietHours, nagLevel, ticked],
  );
  // The mark of the window home shows today: offered once it has opened, and asked about once it has closed.
  const todayMark = useMemo(() => {
    if (!mitzvah || addonMissing || !active.enabled) return null;
    const now = new Date();
    const found = appDayWindow(mitzvah, location, settings, now);
    if (!found) return null;
    const key = dateKey(found.date);
    const doneAt = completions[key]?.[mitzvah.id];
    const skippedAt = skipped[key]?.[mitzvah.id];
    const since = active.enabledAt ? { [mitzvah.id]: active.enabledAt } : {};
    if (!trackedOn(mitzvah, found, since, Boolean(doneAt))) return null;
    if (!doneAt && !skippedAt && now.getTime() < found.start.getTime()) return null;
    return {
      window: found,
      doneAt,
      skipped: Boolean(skippedAt),
      late: Boolean(doneAt && late[key]?.[mitzvah.id]),
      closed: windowClosed(found, now),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ticked re-runs the memo on purpose, it reads the clock itself
  }, [mitzvah, addonMissing, active.enabled, active.enabledAt, location, settings, completions, skipped, late, ticked]);
  const reminderRows = useMemo(() => {
    const scope = { now: new Date(), location, settings, completions, skipped, quietHours, nagLevel };
    return reminders
      .map((reminder, index) => ({
        reminder,
        index,
        next: mitzvah && showNext ? nextReminderAt(mitzvah, [reminder], scope) : null,
        order: window ? buildTriggerTime(reminder, window, location).getTime() : index,
      }))
      .sort((a, b) => a.order - b.order || a.index - b.index);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ticked re-runs the memo on purpose, it reads the clock itself
  }, [mitzvah, showNext, reminders, window, location, settings, completions, skipped, quietHours, nagLevel, ticked]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'));

  if (!mitzvah) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title={t('detail.notFound')} onBack={goBack} />
      </SafeAreaView>
    );
  }

  const name = mitzvahName(mitzvah, language);
  const cycle =
    mitzvah.category === 'weekly'
      ? t('mitzvah.cycle.weekly')
      : mitzvah.category === 'seasonal'
        ? t('mitzvah.cycle.seasonal')
        : t('mitzvah.cycle.daily');

  const startsOn = !window && custom ? customStartsOn(custom, appDayKey(new Date(), location)) : null;
  const timeRange = window
    ? clockRange(window.start, window.end, t, location.tz, window.date)
    : startsOn
      ? t('custom.startsOn', {
          date: scheduleDateLabel(startsOn, language),
        })
      : '-';

  const shemaOpinions = window
    ? shemaOpinionsFor(mitzvah.id, window.date, location, settings.halachicOpinions.ksSofZman)
    : null;

  const saveReminder = (value: Reminder) => {
    setLastReminderRefused(false);
    const next = [...reminders];
    if (editIndex === null) next.push(value);
    else next[editIndex] = value;
    setReminders(mitzvah.id, next);
    setEditIndex(null);
  };
  const setIncludeContent = (value: boolean) => {
    setReminders(
      mitzvah.id,
      reminders.map((reminder) => ({ ...reminder, includeContentInBody: value })),
    );
  };
  const confirmDeleteReminder = () => {
    if (deleteIndex === null) return;
    setReminders(
      mitzvah.id,
      reminders.filter((_, itemIndex) => itemIndex !== deleteIndex),
    );
    if (editIndex === deleteIndex) {
      setEditIndex(null);
      setEditorVisible(false);
    }
    setDeleteIndex(null);
  };
  const requestDeleteReminder = (index: number) => {
    if (active.enabled && reminders.length === 1) setLastReminderRefused(true);
    else setDeleteIndex(index);
  };
  const switchEnabled = (value: boolean) => {
    setLastReminderRefused(false);
    needsReminder.setMitzvahEnabled(mitzvah.id, value, () => scrollRef.current?.scrollToEnd({ animated: true }));
  };
  // The timeline's one reset (the owner's call, 2026-11-05): the original reminders (a custom mitzvah's saved ones) and
  // the smart nag, after any change on the timeline or in the reminder editor; the level stays.
  const resetTimeline = () => {
    setLastReminderRefused(false);
    resetToDefault(mitzvah.id);
    setManualNags(mitzvah.id, null);
  };
  const openText = () => {
    const open = (textParams: { id: string; date?: string }) =>
      router.push({ pathname: '/siddur/[id]', params: { ...textParams, from: mitzvah.id } });
    if (textNow && window && isLearning) open({ id: mitzvah.id });
    else if (textNow && window && (mitzvah.isCustom || windowDueToday(window, location, new Date()))) {
      open({ id: mitzvah.id, date: dateKey(window.date) });
    } else if (anytimeTextId) open({ id: anytimeTextId });
  };
  const pendingDeleteReminder = deleteIndex === null ? null : (reminders[deleteIndex] ?? null);
  const perDay = (level: typeof nagLevel) =>
    t('detail.nagLevelPerDay', { n: remindersPerDay(mitzvah, reminders, level) });
  const appLevelLabel = t('detail.nagLevelApp', { name: t(`nag.level.${appNagLevel}.name`), level: appNagLevel });
  const levelLabel = (level: typeof nagLevel) => t('nag.level.title', { name: t(`nag.level.${level}.name`), level });
  const chooseNagLevel = (level: typeof nagLevel | null) => {
    setNagLevel(mitzvah.id, level);
    setLevelSheetVisible(false);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={name}
        subtitle={`${cycle} · ${timeRange}`}
        onBack={goBack}
        leading={<IconTile name={iconFor(mitzvah.icon)} tone="accent" size={scaled(46)} />}
        actions={
          mitzvah.isCustom ? (
            <HeaderPill
              icon="sliders"
              label={t('detail.editCustom')}
              onPress={() => router.push({ pathname: '/custom-mitzvah', params: { id: mitzvah.id } })}
            />
          ) : undefined
        }
      >
        {nextTrigger ? (
          <Text style={[typography.micro, { color: colors.goldText }]}>
            {t('detail.previewNext', { time: fireTimeText(nextTrigger, location.tz) })}
          </Text>
        ) : null}
      </ScreenHeader>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <ListRow
            icon={iconFor(mitzvah.icon)}
            iconTone={active.enabled ? 'accent' : 'muted'}
            title={t('detail.activeTitle')}
            caption={
              awaitingAddon
                ? t(isShnayim ? 'shnayim.addon.enableAfterDownload' : 'chok.addon.enableAfterDownload')
                : active.enabled
                  ? t('detail.activeOn')
                  : t('detail.activeOff')
            }
            trailing={
              <Switch
                value={active.enabled}
                onValueChange={switchEnabled}
                disabled={awaitingAddon}
                accessibilityLabel={t('detail.activeTitle')}
                thumbColor={BRAND.white}
                trackColor={{ false: colors.border, true: colors.gold }}
              />
            }
          />
        </Card>
        {todayMark ? (
          <View testID="mitzvah-today-mark">
            <Card padded>
              <Text style={[typography.subheading, { color: colors.text }]}>{t('detail.today.title')}</Text>
              <Text style={[typography.caption, styles.todayCaption, { color: colors.textSub }]}>
                {todayMark.doneAt
                  ? t(todayMark.late ? 'detail.today.late' : 'detail.today.done', {
                      time: clockOf(new Date(todayMark.doneAt), location.tz),
                    })
                  : todayMark.skipped
                    ? t('state.skipped')
                    : t(todayMark.closed ? 'detail.today.closed' : 'detail.today.open', {
                        time: clockOf(todayMark.window.end, location.tz),
                      })}
              </Text>
              {todayMark.doneAt || todayMark.skipped ? (
                <Button
                  variant="secondary"
                  icon="undo"
                  label={t('home.undo')}
                  accessibilityLabel={t('home.day.undoLabel', { name })}
                  onPress={() => unmark(mitzvah.id, todayMark.window.date)}
                />
              ) : (
                <Button
                  variant="secondary"
                  icon="check"
                  label={t('notifications.markDone')}
                  accessibilityLabel={t('state.completeAction', { name })}
                  onPress={() =>
                    lateMark.mark({ id: mitzvah.id, name, date: todayMark.window.date, window: todayMark.window })
                  }
                />
              )}
            </Card>
          </View>
        ) : null}
        {isChok ? <ChokAddonCard /> : null}
        {isShnayim ? <ShnayimAddonCard /> : null}
        {isSelichot ? <SelichotAddonCard /> : null}
        {textNow || textAnytime ? <Button label={t('siddur.open')} onPress={openText} /> : null}
        <WindowTimeline
          mitzvah={mitzvah}
          name={name}
          window={window}
          reminders={reminders}
          manualNags={active.manualNags}
          nagLevel={nagLevel}
          location={location}
          settings={settings}
          quietHours={quietHours}
          onRemindersChange={(next) => {
            setLastReminderRefused(false);
            setReminders(mitzvah.id, next);
          }}
          onManualNagsChange={(next) => setManualNags(mitzvah.id, next)}
          onEditReminder={(index) => {
            setEditIndex(index);
            setEditorVisible(true);
          }}
          onDeleteReminder={requestDeleteReminder}
          changed={active.customReminders !== undefined || active.manualNags !== undefined}
          onReset={resetTimeline}
        />

        {shemaOpinions ? (
          <View testID="mitzvah-shema-opinions">
            <Card padded>
              <Text style={[typography.subheading, { color: colors.text }]}>{t('shema.opinions.title')}</Text>
              <Text style={[typography.body, styles.shemaLine, { color: colors.text }]}>
                {shemaOpinionsLine(shemaOpinions, location.tz, t)}
              </Text>
              <Text style={[typography.caption, { color: colors.textSub }]}>
                {t('shema.opinions.note', { name: t(`settings.opinion.${shemaOpinions.chosen}`) })}
              </Text>
            </Card>
          </View>
        ) : null}

        {mitzvah.description ? (
          <Card padded>
            <Text style={[typography.body, { color: colors.text }]}>
              {language === 'en' && mitzvah.description.en ? mitzvah.description.en : mitzvah.description.he}
            </Text>
          </Card>
        ) : null}

        {mitzvah.contentBlocks?.length ? (
          <Card padded style={params.highlightContent === '1' ? { backgroundColor: colors.goldLight } : undefined}>
            <Text style={[typography.subheading, { color: colors.text, marginBottom: spacing.md }]}>
              {t('detail.content')}
            </Text>
            {mitzvah.contentBlocks.map((block, index) => (
              <ContentBlockView
                key={`${block.type}-${index}`}
                block={block}
                mitzvahId={mitzvah.id}
                highlighted={params.highlightContent === '1'}
              />
            ))}
            <View style={[styles.row, { marginTop: spacing.md }]}>
              <Text style={[typography.bodyBold, { color: colors.text, flex: 1 }]}>
                {t('detail.includeContentInNotification')}
              </Text>
              <Switch
                value={includeContentInNotification}
                onValueChange={setIncludeContent}
                thumbColor={BRAND.white}
                trackColor={{ false: colors.border, true: colors.gold }}
              />
            </View>
          </Card>
        ) : null}

        <Card padded>
          <Text style={[typography.subheading, { color: colors.text }]}>{t('detail.settings')}</Text>
          <InfoRow label={t('detail.nusach')} value={t(`nusach.${nusach}`)} />
          <InfoRow label={t('detail.cycle')} value={cycle} />
        </Card>

        {!awaitingAddon ? (
          <Card padded>
            <Text style={[typography.subheading, { color: colors.text }]}>{t('detail.reminders')}</Text>
            <ListRow
              icon="bell"
              title={t('detail.nagLevel')}
              caption={`${active.nagLevel ? levelLabel(active.nagLevel) : appLevelLabel} · ${t(
                'detail.nagLevelPerDay',
                {
                  n: remindersPerDay(mitzvah, reminders, nagLevel, active.manualNags),
                },
              )}`}
              chevron
              onPress={() => setLevelSheetVisible(true)}
              accessibilityLabel={t('detail.nagLevel')}
              style={[styles.levelRow, { borderBottomColor: colors.border }]}
            />
            {reminderRows.map(({ reminder, index, next }) => (
              <View
                key={`${index}-${reminder.anchor}-${reminder.offsetMin}`}
                style={[styles.reminderRow, { borderBottomColor: colors.border }]}
              >
                <Pressable
                  onPress={() => {
                    setEditIndex(index);
                    setEditorVisible(true);
                  }}
                  style={{ flex: 1 }}
                >
                  <Text style={[typography.bodyBold, { color: colors.text }]}>{reminderLabel(reminder, name)}</Text>
                  <Text style={[typography.micro, { color: colors.textMuted, marginTop: scaled(2) }]}>
                    {timingSummary(reminder, t)}
                  </Text>
                  {next ? (
                    <Text style={[typography.micro, { color: colors.goldText, marginTop: scaled(2) }]}>
                      {t('detail.reminderNextAt', { time: fireTimeText(next, location.tz) })}
                    </Text>
                  ) : null}
                </Pressable>
                <Pressable
                  onPress={() => requestDeleteReminder(index)}
                  accessibilityRole="button"
                  accessibilityLabel={t('reminder.delete')}
                  hitSlop={scaled(10)}
                  style={[styles.deleteBtn, { backgroundColor: colors.surface2 }]}
                >
                  <MitzvahIcon
                    name="close"
                    size={DELETE_ICON_SIZE}
                    color={colors.textMuted}
                    strokeWidth={ICON_STROKE}
                  />
                </Pressable>
              </View>
            ))}
            {!reminders.length ? (
              <Text style={[typography.body, { color: colors.textMuted, paddingVertical: spacing.md }]}>
                {t('detail.noReminders')}
              </Text>
            ) : null}
            {lastReminderRefused ? (
              <Text style={[typography.small, styles.reminderError, { color: colors.urgent }]}>
                {t('reminder.errors.lastReminder')}
              </Text>
            ) : null}
            <Pressable
              onPress={() => {
                setEditIndex(null);
                setEditorVisible(true);
              }}
              style={[styles.addRow, { borderTopColor: `${colors.gold}44` }]}
            >
              <View style={[styles.plus, { backgroundColor: colors.goldLight }]}>
                <MitzvahIcon name="plus" size={ADD_ICON_SIZE} color={colors.gold} strokeWidth={ICON_STROKE} />
              </View>
              <Text style={[typography.bodyBold, { color: colors.goldText }]}>{t('detail.addReminder')}</Text>
            </Pressable>
          </Card>
        ) : null}
      </ScrollView>

      <ReminderEditor
        visible={editorVisible}
        initialValue={editIndex === null ? null : reminders[editIndex]}
        mitzvah={mitzvah}
        location={location}
        settings={settings}
        mitzvahName={name}
        onClose={() => {
          setEditorVisible(false);
          setEditIndex(null);
        }}
        onSave={saveReminder}
      />
      <BottomSheet
        visible={levelSheetVisible}
        title={t('detail.nagLevel')}
        caption={name}
        onClose={() => setLevelSheetVisible(false)}
      >
        <SheetAction
          label={appLevelLabel}
          caption={perDay(appNagLevel)}
          selected={!active.nagLevel}
          onPress={() => chooseNagLevel(null)}
        />
        {NAG_LEVEL_IDS.map((level) => (
          <SheetAction
            key={level}
            label={levelLabel(level)}
            caption={`${t(`nag.level.${level}.desc`)} · ${perDay(level)}`}
            selected={active.nagLevel === level}
            onPress={() => chooseNagLevel(level)}
          />
        ))}
      </BottomSheet>
      <ConfirmDialog
        visible={deleteIndex !== null}
        title={t('reminder.deleteConfirmTitle')}
        body={t('reminder.deleteConfirmBody', {
          label: pendingDeleteReminder ? reminderLabel(pendingDeleteReminder, name) : t('detail.addReminder'),
        })}
        confirmLabel={t('reminder.deleteConfirmAction')}
        destructive
        onConfirm={confirmDeleteReminder}
        onCancel={() => setDeleteIndex(null)}
      />
      {needsReminder.dialog}
      {lateMark.dialog}
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { marginTop: spacing.md }]}>
      <Text style={[typography.bodyBold, { color: colors.text }]}>{label}</Text>
      <Text style={[typography.body, { color: colors.goldText }]}>{value}</Text>
    </View>
  );
}

function ContentBlockView({
  block,
  mitzvahId,
  highlighted,
}: {
  block: ContentBlock;
  mitzvahId: string;
  highlighted: boolean;
}) {
  const { colors } = useTheme();
  const { language, t } = useI18n();
  const router = useRouter();
  const text = language === 'en' && block.en ? block.en : block.he;
  if (block.type === 'siddur' && !isSiddurTextId(block.textId)) return null;
  if (block.type === 'link' || block.type === 'siddur') {
    const onPress =
      block.type === 'link'
        ? () => Linking.openURL(block.url).catch(() => {})
        : () => router.push({ pathname: '/siddur/[id]', params: { id: block.textId, from: mitzvahId } });
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={[
          styles.contentBlock,
          styles.linkBlock,
          { backgroundColor: colors.surface2, borderColor: colors.border },
        ]}
      >
        <Text style={[typography.bodyBold, { color: colors.goldText, flex: 1 }]}>{text}</Text>
        <Text style={[typography.micro, { color: colors.textMuted }]}>
          {block.type === 'link' ? t('detail.openLink') : t('detail.openSiddur')}
        </Text>
      </Pressable>
    );
  }
  return (
    <View
      style={[
        styles.contentBlock,
        block.type === 'blessing' ? styles.blessingBlock : null,
        {
          backgroundColor: block.type === 'blessing' || highlighted ? colors.goldLight : colors.surface2,
          borderColor: block.type === 'blessing' || highlighted ? colors.gold : colors.border,
        },
      ]}
    >
      <Text style={[typography.body, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  shemaLine: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  todayCaption: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // The level row inside the reminders card, under its title (the owner's pick of 2026-11-02, board ד).
  levelRow: {
    paddingHorizontal: 0,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reminderRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  deleteBtn: {
    width: scaled(24),
    height: scaled(24),
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1.5,
  },
  plus: {
    width: scaled(26),
    height: scaled(26),
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderError: {
    marginTop: spacing.sm,
  },
  contentBlock: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  blessingBlock: {
    borderWidth: 1.5,
  },
  linkBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
