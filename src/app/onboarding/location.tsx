import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ONBOARDING_STEPS, OnboardingDots } from '@/components/OnboardingDots';
import { PlacePicker } from '@/components/PlacePicker';
import { LocationService, type LocationStatus } from '@/services/LocationService';
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
  // Why the last request for the phone's location found none; a place picked since clears it.
  const [failure, setFailure] = useState<LocationStatus | null>(null);
  const locationReady = user.locationStatus === 'ready';

  const refreshLocation = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const resolved = await LocationService.getCurrentLocation();
      if (resolved.location) {
        user.setLocationState(resolved.location, resolved.status, resolved.source);
        setFailure(null);
      } else {
        // A place already picked stays the place: a refused permission only says so.
        if (useUserStore.getState().locationStatus !== 'ready') user.setLocationStatus(resolved.status);
        setFailure(resolved.status);
      }
    } finally {
      // Without this a rejection left the button reading "..." forever, dead-ending onboarding.
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={[typography.title, { color: colors.text }]}>{t('onboarding.locationTitle')}</Text>
      <Text style={[typography.body, { color: colors.textSub, marginTop: spacing.xs }]}>
        {t('onboarding.locationBody')}
      </Text>

      <Card padded style={styles.cardGap}>
        <Text style={[typography.bodyBold, { color: colors.text }]}>{getLocationName(user.location, language)}</Text>
        <Text style={[typography.small, { color: colors.textMuted, marginTop: spacing.xs }]}>
          {t(
            failure
              ? `settings.locationStatus.${failure}`
              : user.locationStatus !== 'ready'
                ? `settings.locationStatus.${user.locationStatus}`
                : user.locationSource === 'gps'
                  ? 'settings.locationFollows'
                  : 'settings.locationPicked',
          )}
        </Text>
        <Button label={t('onboarding.locationAllow')} onPress={refreshLocation} busy={busy} style={styles.buttonGap} />
        <Text style={[typography.small, styles.allowHint, { color: colors.textSub }]}>
          {t('onboarding.locationAllowHint')}
        </Text>
      </Card>

      <Text style={[typography.captionBold, styles.or, { color: colors.textSub }]}>{t('onboarding.locationOr')}</Text>
      <PlacePicker
        location={user.location}
        onPick={(location) => {
          user.setLocationState(location, 'ready', 'manual');
          setFailure(null);
        }}
      />

      <OnboardingDots step={5} total={ONBOARDING_STEPS} style={styles.dots} />
      <Button
        label={t('common.continue')}
        onPress={() => router.push('/onboarding/permissions')}
        disabled={!locationReady}
      />
      {locationReady ? null : (
        <Text style={[typography.small, styles.locationHint, { color: colors.textMuted }]}>
          {t('onboarding.locationRequired')}
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
  buttonGap: {
    marginTop: spacing.md,
  },
  allowHint: {
    marginTop: spacing.sm,
  },
  or: {
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
