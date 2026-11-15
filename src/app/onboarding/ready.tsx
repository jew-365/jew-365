import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { DateTime } from 'luxon';
import { AccuracyNotice } from '@/components/AccuracyNotice';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconTile } from '@/components/IconTile';
import { ListRow } from '@/components/ListRow';
import { iconFor } from '@/components/MitzvahIcon';
import { ONBOARDING_STEPS, OnboardingDots } from '@/components/OnboardingDots';
import { SectionLabel } from '@/components/SectionLabel';
import { useDayModel } from '@/hooks/useDayModel';
import { NotificationScheduler, nextReminderAt, presentSampleReminder } from '@/services/NotificationScheduler';
import { reportError } from '@/services/errors';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { remindersOf, useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { scaled } from '@/theme/scale';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { currentOrNextWindow } from '@/utils/buildDayTimeline';
import { clockOf, clockRange, formatRemaining } from '@/utils/clock';
import { NEW_SETUP_HINT } from '@/utils/discovery';
import { quietHoursOf } from '@/utils/quietHours';
import { restOfDay } from '@/utils/setupDay';
import { formatDate, useI18n } from '@/i18n';

type SampleResult = 'sent' | 'noPermission' | 'quiet';

// The last step (spec A5): the rest of the user's day with its real windows and next reminders, the coming
// candle lighting, a sample reminder, and the accuracy notice as a card with the full text one tap away. With
// no window to show (a holy block, a polar day) it lists the names of what was switched on.
export default function ReadyScreen() {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const router = useRouter();
  const setOnboarded = useUserStore((s) => s.setOnboarded);
  const { enabled, nameFor, location, settings } = useDayModel();
  const [sample, setSample] = useState<SampleResult | null>(null);
  const [sending, setSending] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const editMitzvot = () => router.push('/onboarding/mitzvot');

  const day = useMemo(() => {
    const now = new Date();
    const user = useUserStore.getState();
    const { completions, skipped } = useCompletionsStore.getState();
    const { activeMitzvot } = useMitzvotStore.getState();
    const scope = {
      now,
      location,
      settings,
      completions,
      skipped,
      quietHours: quietHoursOf(user.quietBefore, user.quietAfter),
      nagLevel: user.nagLevel,
    };
    const rows = restOfDay(enabled, location, settings, now).map((row) => ({
      ...row,
      left: row.window.end.getTime() - now.getTime(),
      next: nextReminderAt(row.mitzvah, remindersOf(activeMitzvot[row.mitzvah.id], row.mitzvah), scope),
    }));
    const candles = enabled.find((m) => m.id === 'candle_lighting');
    const lighting =
      rows.length && candles && !rows.some((row) => row.mitzvah.id === candles.id)
        ? currentOrNextWindow(candles, location, settings, now)
        : null;
    return { rows, candles, lighting };
  }, [enabled, location, settings]);

  const sendSample = async () => {
    if (sending) return;
    setSending(true);
    setSample(await presentSampleReminder().catch((): SampleResult => 'noPermission'));
    setSending(false);
  };

  const finish = async () => {
    const user = useUserStore.getState();
    // An install that finished this setup is never offered the catch-up (spec A6).
    user.learnHint(NEW_SETUP_HINT);
    setOnboarded(true);
    await NotificationScheduler.rebuild().catch((error) => reportError('schedule', error));
    router.replace('/(tabs)/home');
  };

  const sampleText =
    sample === 'sent'
      ? t(Platform.OS === 'ios' ? 'onboarding.ready.sampleSent.ios' : 'onboarding.ready.sampleSent.android')
      : sample === 'quiet'
        ? t('onboarding.ready.sampleQuiet')
        : sample === 'noPermission'
          ? t('onboarding.ready.sampleNoPermission')
          : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconTile name="check" tone="accent" size={scaled(64)} />
          <Text style={[typography.title, { color: colors.text, marginTop: spacing.lg }]}>
            {t('onboarding.readyTitle')}
          </Text>
          <Text style={[typography.body, styles.centered, { color: colors.textSub, marginTop: spacing.sm }]}>
            {t('onboarding.readyBody')}
          </Text>
        </View>

        {day.rows.length ? (
          <View testID="ready-day">
            <SectionLabel text={t('onboarding.ready.dayTitle')} />
            <Card divided>
              {day.rows.map(({ mitzvah, window, open, left, next }) => {
                const state = open
                  ? t('onboarding.ready.openNow', { left: formatRemaining(left, t) })
                  : t('onboarding.ready.from', { time: clockOf(window.start, location.tz) });
                const reminder = next
                  ? ` · ${t('onboarding.ready.nextReminder', { time: clockOf(next, location.tz) })}`
                  : '';
                return (
                  <ListRow
                    key={mitzvah.id}
                    icon={iconFor(mitzvah.icon)}
                    iconTone={open ? 'accent' : 'muted'}
                    title={nameFor(mitzvah)}
                    caption={`${state}${reminder}`}
                    trailing={
                      <Text style={[typography.caption, { color: colors.textSub }]}>
                        {clockRange(window.start, window.end, t, location.tz)}
                      </Text>
                    }
                  />
                );
              })}
              {day.candles && day.lighting ? (
                <ListRow
                  icon={iconFor(day.candles.icon)}
                  iconTone="muted"
                  title={nameFor(day.candles)}
                  caption={formatDate(DateTime.fromJSDate(day.lighting.start, { zone: location.tz }), 'cccc', language)}
                  trailing={
                    <Text style={[typography.caption, { color: colors.textSub }]}>
                      {clockOf(day.lighting.start, location.tz)}
                    </Text>
                  }
                />
              ) : null}
            </Card>
          </View>
        ) : (
          <View testID="ready-names" style={styles.names}>
            <Text style={[typography.captionBold, { color: colors.textSub }]}>{t('onboarding.readyList')}</Text>
            <Text style={[typography.body, styles.centered, { color: colors.text, marginTop: spacing.xs }]}>
              {enabled.map((mitzvah) => nameFor(mitzvah)).join(' · ')}
            </Text>
          </View>
        )}
        <Pressable onPress={editMitzvot} accessibilityRole="link" hitSlop={scaled(8)} style={styles.editLink}>
          <Text style={[typography.bodyBold, { color: colors.goldText }]}>{t('onboarding.readyEdit')}</Text>
        </Pressable>

        <Button
          variant="secondary"
          icon="bell"
          label={t('onboarding.ready.sample')}
          onPress={sendSample}
          busy={sending}
        />
        {sampleText ? (
          <Text
            testID="ready-sample-result"
            accessibilityLiveRegion="polite"
            style={[typography.small, styles.centered, styles.sampleNote, { color: colors.textSub }]}
          >
            {sampleText}
          </Text>
        ) : null}

        <Card padded style={styles.notice}>
          <Text style={[typography.bodyBold, { color: colors.text }]}>{t('accuracy.title')}</Text>
          <Text style={[typography.small, { color: colors.textSub, marginTop: spacing.xs }]}>
            {t('accuracy.responsibility')}
          </Text>
          <Pressable
            onPress={() => setNoticeOpen(true)}
            accessibilityRole="button"
            hitSlop={scaled(8)}
            style={styles.noticeLink}
          >
            <Text style={[typography.captionBold, { color: colors.goldText }]}>{t('onboarding.ready.noticeMore')}</Text>
          </Pressable>
        </Card>
        <OnboardingDots step={5} total={ONBOARDING_STEPS} style={styles.dots} />
      </ScrollView>
      <Button label={t('onboarding.finish')} onPress={finish} />
      <BottomSheet visible={noticeOpen} title={t('accuracy.title')} onClose={() => setNoticeOpen(false)}>
        <AccuracyNotice />
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    padding: spacing.xl,
  },
  content: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  centered: {
    textAlign: 'center',
  },
  names: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  editLink: {
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  sampleNote: {
    marginTop: spacing.sm,
  },
  notice: {
    marginTop: spacing.lg,
  },
  noticeLink: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  dots: {
    marginTop: spacing.xl,
  },
});
