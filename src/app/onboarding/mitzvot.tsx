import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { MitzvahLibraryList } from '@/components/MitzvahLibraryList';
import { ONBOARDING_STEPS, OnboardingDots } from '@/components/OnboardingDots';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useI18n } from '@/i18n';

export default function OnboardingMitzvotScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const next = () => (from === 'ready' ? router.back() : router.push('/onboarding/location'));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={[typography.title, { color: colors.text }]}>{t('onboarding.mitzvot.title')}</Text>
      <Text style={[typography.body, { color: colors.textSub, marginTop: spacing.xs }]}>
        {t('onboarding.mitzvot.hint')}
      </Text>
      <ScrollView contentContainerStyle={styles.list}>
        <MitzvahLibraryList showMine={false} navigable={false} />
      </ScrollView>
      <OnboardingDots step={3} total={ONBOARDING_STEPS} style={styles.dots} />
      <Button label={t('common.continue')} onPress={next} />
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
