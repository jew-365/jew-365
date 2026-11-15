import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ONBOARDING_STEPS, OnboardingDots } from '@/components/OnboardingDots';
import { PermissionsList, type PermissionStatus } from '@/components/PermissionsList';
import { TimeField } from '@/components/TimeField';
import { askForNotifications } from '@/services/NotificationScheduler';
import { useUserStore } from '@/stores/useUserStore';
import { BRAND } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { minutesToTime, timeToMinutes } from '@/utils/clock';
import { SETUP_QUIET_HINT } from '@/utils/discovery';
import { SETUP_QUIET_AFTER_MIN, SETUP_QUIET_BEFORE_MIN, quietBoundsValid } from '@/utils/quietHours';
import { useI18n } from '@/i18n';

type Quiet = { on: boolean; after: number; before: number };

// What the step shows on its first visit is the recommendation; once Continue has saved a choice, the store's.
function initialQuiet(): Quiet {
  const { quietBefore, quietAfter, discovery } = useUserStore.getState();
  if (!discovery.hints.includes(SETUP_QUIET_HINT)) {
    return { on: true, after: SETUP_QUIET_AFTER_MIN, before: SETUP_QUIET_BEFORE_MIN };
  }
  const on = quietBefore.enabled || quietAfter.enabled;
  return on
    ? { on, after: quietAfter.minutes, before: quietBefore.minutes }
    : { on, after: SETUP_QUIET_AFTER_MIN, before: SETUP_QUIET_BEFORE_MIN };
}

function saveQuiet({ on, after, before }: Quiet): void {
  const user = useUserStore.getState();
  // Off first, so neither setter meets a pair that leaves less than an hour open on the way.
  user.setQuietBefore({ enabled: false, minutes: before });
  user.setQuietAfter({ enabled: on, minutes: after });
  user.setQuietBefore({ enabled: on, minutes: before });
  user.learnHint(SETUP_QUIET_HINT);
}

export default function OnboardingPermissionsScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [quiet, setQuiet] = useState(initialQuiet);
  const [quietError, setQuietError] = useState(false);
  // The notification status, read from the list, so Continue never prompts after the row did.
  const notif = useRef<PermissionStatus>('unknown');

  // A time that would leave less than an hour open is refused, as in Settings.
  const changeQuiet = (next: Quiet) => {
    const valid = quietBoundsValid(
      { enabled: next.on, minutes: next.before },
      { enabled: next.on, minutes: next.after },
    );
    setQuietError(!valid);
    if (valid) setQuiet(next);
  };

  const proceed = async () => {
    if (busy) return;
    saveQuiet(quiet);
    // Only prompt when the OS still can: the list reports 'blocked' once it has been asked and refused.
    if (notif.current === 'missing' || notif.current === 'unknown') {
      setBusy(true);
      await askForNotifications().catch(() => {});
      setBusy(false);
    }
    router.push('/onboarding/ready');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={[typography.title, { color: colors.text }]}>{t('onboarding.permissionsTitle')}</Text>
      <Text style={[typography.body, { color: colors.textSub, marginTop: spacing.xs }]}>
        {t('onboarding.permissionsBody')}
      </Text>
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        <Card padded>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={[typography.bodyBold, { color: colors.text }]}>{t('onboarding.quiet.title')}</Text>
              <Text style={[typography.small, { color: colors.textSub, marginTop: spacing.xs }]}>
                {t('onboarding.quiet.caption')}
              </Text>
            </View>
            <Switch
              testID="setup-quiet"
              accessibilityLabel={t('onboarding.quiet.title')}
              value={quiet.on}
              onValueChange={(on) => changeQuiet({ ...quiet, on })}
              thumbColor={BRAND.white}
              trackColor={{ false: colors.border, true: colors.gold }}
            />
          </View>
          {quiet.on ? (
            <View style={styles.times}>
              <TimeField
                label={t('settings.quietAfterTime')}
                value={minutesToTime(quiet.after)}
                onChange={(value) => changeQuiet({ ...quiet, after: timeToMinutes(value) })}
                error={quietError ? t('settings.quietHoursError') : undefined}
                style={styles.time}
              />
              <TimeField
                label={t('settings.quietBeforeTime')}
                value={minutesToTime(quiet.before)}
                onChange={(value) => changeQuiet({ ...quiet, before: timeToMinutes(value) })}
                error={quietError ? t('settings.quietHoursError') : undefined}
                style={styles.time}
              />
            </View>
          ) : null}
          {quietError ? (
            <Text accessibilityLiveRegion="polite" style={[typography.small, styles.note, { color: colors.urgent }]}>
              {t('settings.quietHoursError')}
            </Text>
          ) : null}
        </Card>
        <PermissionsList onStatuses={(s) => (notif.current = s.notifications)} style={styles.permissions} />
      </ScrollView>
      <OnboardingDots step={4} total={ONBOARDING_STEPS} style={styles.dots} />
      <Button label={t('common.continue')} busy={busy} onPress={proceed} />
      <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.backBtn}>
        <Text style={[typography.small, { color: colors.textSub }]}>{t('common.back')}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    padding: spacing.xl,
  },
  list: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchText: {
    flex: 1,
    paddingEnd: spacing.md,
  },
  times: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  time: {
    flex: 1,
  },
  note: {
    marginTop: spacing.sm,
  },
  permissions: {
    marginTop: spacing.lg,
  },
  dots: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  backBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
});
