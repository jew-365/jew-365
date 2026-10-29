import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChipRow } from '@/components/ChipRow';
import { ONBOARDING_STEPS, OnboardingDots } from '@/components/OnboardingDots';
import { LocationService } from '@/services/LocationService';
import { useUserStore } from '@/stores/useUserStore';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useI18n } from '@/i18n';
import { CITIES, findCityByName, getLocationName } from '@/data/cities';

const CITY_NAMES = CITIES.map((city) => city.name);

export default function OnboardingLocationScreen() {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const router = useRouter();
  const user = useUserStore();
  const [busy, setBusy] = useState(false);
  const locationReady = user.locationStatus === 'ready';

  const refreshLocation = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const resolved = await LocationService.getCurrentLocation();
      if (resolved.location) {
        user.setLocationState(resolved.location, resolved.status, resolved.source);
      } else {
        user.setLocationStatus(resolved.status);
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
          {t(`settings.locationStatus.${user.locationStatus}`)}
        </Text>
        <Button
          variant="secondary"
          label={busy ? '...' : t('onboarding.locationRefresh')}
          onPress={refreshLocation}
          style={styles.buttonGap}
        />
      </Card>

      <ChipRow
        values={CITY_NAMES}
        selected={user.location.name}
        onSelect={(name) => {
          const city = findCityByName(name);
          if (city) user.setLocationState(city, 'ready', 'manual');
        }}
        renderLabel={(name) => {
          const city = findCityByName(name);
          return city ? getLocationName(city, language) : name;
        }}
        style={styles.cities}
      />

      <OnboardingDots step={4} total={ONBOARDING_STEPS} style={styles.dots} />
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
  cities: {
    marginTop: spacing.lg,
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
