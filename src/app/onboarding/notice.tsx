import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { AccuracyNotice } from '@/components/AccuracyNotice';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconTile } from '@/components/IconTile';
import { ONBOARDING_STEPS, OnboardingDots } from '@/components/OnboardingDots';
import { scaled } from '@/theme/scale';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useI18n } from '@/i18n';

export default function OnboardingNoticeScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <IconTile name="warning" tone="accent" size={scaled(64)} style={styles.icon} />
        <Text accessibilityRole="header" style={[typography.title, styles.title, { color: colors.text }]}>
          {t('accuracy.title')}
        </Text>
        <Card padded>
          <AccuracyNotice />
        </Card>
      </ScrollView>
      <OnboardingDots step={6} total={ONBOARDING_STEPS} style={styles.dots} />
      <Button label={t('onboarding.noticeAccept')} onPress={() => router.push('/onboarding/ready')} />
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
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: spacing.lg,
  },
  icon: {
    alignSelf: 'center',
  },
  title: {
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
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
