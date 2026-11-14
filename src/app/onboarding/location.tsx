import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ONBOARDING_STEPS, OnboardingDots } from '@/components/OnboardingDots';
import { PlacePicker } from '@/components/PlacePicker';
import { LocationService } from '@/services/LocationService';
import { useUserStore } from '@/stores/useUserStore';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useI18n } from '@/i18n';
import { getLocationName } from '@/data/cities';

export default function OnboardingLocationScreen() {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const router = useRouter();
  const user = useUserStore();
  const [busy, setBusy] = useState(false);
  const locationReady = user.locationStatus === 'ready';
  const placeName = getLocationName(user.location, language);

  const proceed = async () => {
    if (busy) return;
    if (useUserStore.getState().locationStatus !== 'ready') {
      setBusy(true);
      try {
        const resolved = await LocationService.getCurrentLocation().catch(() => null);
        const state = useUserStore.getState();
        if (resolved?.location) state.setLocationState(resolved.location, resolved.status, resolved.source);
        else if (resolved && state.locationStatus !== 'ready') state.setLocationStatus(resolved.status);
      } finally {
        setBusy(false);
      }
    }
    router.push('/onboarding/permissions');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={[typography.title, { color: colors.text }]}>{t('onboarding.locationTitle')}</Text>
      <Text style={[typography.body, { color: colors.textSub, marginTop: spacing.xs }]}>
        {t('onboarding.locationBody')}
      </Text>

      <Card padded style={styles.cardGap}>
        <Text style={[typography.bodyBold, { color: colors.text }]}>{placeName}</Text>
        <Text style={[typography.small, { color: colors.textMuted, marginTop: spacing.xs }]}>
          {t(
            !locationReady
              ? `settings.locationStatus.${user.locationStatus}`
              : user.locationSource === 'gps'
                ? 'settings.locationFollows'
                : 'settings.locationPicked',
          )}
        </Text>
      </Card>

      <Text style={[typography.captionBold, styles.pickLabel, { color: colors.textSub }]}>
        {t('onboarding.locationPickLabel')}
      </Text>
      <PlacePicker location={user.location} onPick={(location) => user.setLocationState(location, 'ready', 'manual')} />

      <OnboardingDots step={5} total={ONBOARDING_STEPS} style={styles.dots} />
      <Button label={t('common.continue')} onPress={proceed} busy={busy} />
      {locationReady ? null : (
        <Text style={[typography.small, styles.locationHint, { color: colors.textMuted }]}>
          {t('onboarding.locationContinueHint', { city: placeName })}
        </Text>
      )}
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
  cardGap: {
    marginTop: spacing.xl,
  },
  pickLabel: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  dots: {
    marginTop: 'auto',
    marginBottom: spacing.md,
  },
  locationHint: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  backBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
});
