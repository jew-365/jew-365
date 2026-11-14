import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { ONBOARDING_STEPS, OnboardingDots } from '@/components/OnboardingDots';
import { PermissionsList, type PermissionStatus } from '@/components/PermissionsList';
import { askForNotifications } from '@/services/NotificationScheduler';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useI18n } from '@/i18n';

export default function OnboardingPermissionsScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  // The notification status, read from the list, so Continue never prompts after the row did.
  const notif = useRef<PermissionStatus>('unknown');

  const allowAndContinue = async () => {
    if (busy) return;
    // Only prompt when the OS still can: the list reports 'blocked' once it has been asked and refused.
    if (notif.current === 'missing' || notif.current === 'unknown') {
      setBusy(true);
      await askForNotifications().catch(() => {});
      setBusy(false);
    }
    router.push('/onboarding/notice');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={[typography.title, { color: colors.text }]}>{t('onboarding.permissionsTitle')}</Text>
      <Text style={[typography.body, { color: colors.textSub, marginTop: spacing.xs }]}>
        {t('onboarding.permissionsBody')}
      </Text>
      <ScrollView contentContainerStyle={styles.list}>
        <PermissionsList onStatuses={(s) => (notif.current = s.notifications)} />
      </ScrollView>
      <OnboardingDots step={6} total={ONBOARDING_STEPS} style={styles.dots} />
      <Button label={t('common.continue')} busy={busy} onPress={allowAndContinue} />
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
