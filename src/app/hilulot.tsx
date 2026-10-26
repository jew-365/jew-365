import React, { useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { HDate } from '@hebcal/core';
import { hilulaDateLabel, upcomingHilulot } from '@/data/hilulot';
import { Card } from '@/components/Card';
import { ListRow } from '@/components/ListRow';
import { NoticeSettingsCard, type NoticeKindOption } from '@/components/NoticeSettingsCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionLabel } from '@/components/SectionLabel';
import { SettingsSection } from '@/components/SettingsSection';
import { useNeedsReminderDialog } from '@/hooks/useNeedsReminderDialog';
import { useNow } from '@/hooks/useNow';
import { HebcalService } from '@/services/HebcalService';
import type { HilulaWhen } from '@/services/notifications/ids';
import { HILULA_BEFORE_DAYS, useUserStore } from '@/stores/useUserStore';
import { BRAND } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { formatDate, useI18n } from '@/i18n';

export default function HilulotScreen() {
  const { colors } = useTheme();
  const { language, t } = useI18n();
  const router = useRouter();
  const location = useUserStore((s) => s.location);
  const inIsrael = useUserStore((s) => s.inIsrael);
  const enabled = useUserStore((s) => s.hilulotEnabled);
  const notices = useUserStore((s) => s.hilulaNotices);
  const setNotice = useUserStore((s) => s.setHilulaNotice);
  const needsReminder = useNeedsReminderDialog();
  const scrollRef = useRef<ScrollView>(null);
  const now = useNow();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'));
  // The Hebrew day in effect now, so a hilula that began at this evening's shkia reads as today.
  const todayAbs = HebcalService.hebrewDayAt(now, location).abs();
  const upcoming = useMemo(() => upcomingHilulot(new HDate(todayAbs), inIsrael), [todayAbs, inIsrael]);
  const locale = language === 'en' ? 'en' : 'he';

  const whenLabel = (dayAbs: number) => {
    const days = dayAbs - todayAbs;
    if (days === 0) return t('hilulot.today');
    if (days === 1) return t('hilulot.tomorrow');
    return t('hilulot.inDays', { count: days });
  };

  const kinds: NoticeKindOption<HilulaWhen>[] = [
    { kind: 'before', title: t('hilulot.kind.before'), defaultDaysBefore: HILULA_BEFORE_DAYS },
    { kind: 'evening', title: t('hilulot.kind.evening') },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={t('hilulot.title')} subtitle={t('hilulot.subtitle')} onBack={goBack} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        <SettingsSection title={t('hilulot.notifications')}>
          <View style={styles.switchRow}>
            <Text style={[typography.small, styles.switchHint, { color: colors.textMuted }]}>
              {t('hilulot.notificationsHint')}
            </Text>
            <Switch
              value={enabled}
              onValueChange={(value) =>
                needsReminder.setNoticesEnabled('hilulot', value, () =>
                  scrollRef.current?.scrollTo({ y: 0, animated: true }),
                )
              }
              accessibilityLabel={t('hilulot.notifications')}
              thumbColor={BRAND.white}
              trackColor={{ false: colors.border, true: colors.gold }}
            />
          </View>
        </SettingsSection>
        <SectionLabel text={t('notices.kinds')} />
        <NoticeSettingsCard
          icon="hilula"
          topic={t('hilulot.title')}
          kinds={kinds}
          notices={notices}
          masterOn={enabled}
          onChange={setNotice}
        />
        <SectionLabel text={t('hilulot.upcoming')} />
        <Card divided>
          {upcoming.map(({ hilula, day }) => {
            const name = language === 'en' ? hilula.name.en : hilula.name.he;
            return (
              <ListRow
                key={hilula.id}
                icon="hilula"
                title={name}
                caption={`${hilulaDateLabel(day, locale)} · ${formatDate(day.greg(), 'ccc d.M', locale)}`}
                trailing={
                  <Text style={[typography.captionBold, { color: colors.goldText }]}>{whenLabel(day.abs())}</Text>
                }
                accessibilityLabel={t('hilula.page.open', { name })}
                onPress={() => router.push({ pathname: '/hilula/[id]', params: { id: hilula.id } })}
              />
            );
          })}
        </Card>
      </ScrollView>
      {needsReminder.dialog}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchHint: {
    flex: 1,
    paddingEnd: spacing.md,
  },
});
