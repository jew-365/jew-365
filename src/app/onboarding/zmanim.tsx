import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { ONBOARDING_STEPS, OnboardingDots } from '@/components/OnboardingDots';
import { ZmanimPicker } from '@/components/ZmanimSheet';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useI18n } from '@/i18n';

// The carousel's times, chosen once while the user sets the app up (the owner's call, 2026-11-10): the same list as
// the + chip's sheet and the זמני הלכה section of Settings, after the mitzvot, whose choice its suggestions read.
export default function OnboardingZmanimScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={[typography.title, { color: colors.text }]}>{t('onboarding.zmanim.title')}</Text>
      <Text style={[typography.body, { color: colors.textSub, marginTop: spacing.xs }]}>
        {t('onboarding.zmanim.hint')}
      </Text>
      <ScrollView contentContainerStyle={styles.list}>
        <ZmanimPicker />
      </ScrollView>
      <OnboardingDots step={4} total={ONBOARDING_STEPS} style={styles.dots} />
      <Button label={t('common.continue')} onPress={() => router.push('/onboarding/location')} />
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
