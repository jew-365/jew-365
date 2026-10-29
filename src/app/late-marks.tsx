import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Banner } from '@/components/Banner';
import { Card } from '@/components/Card';
import { iconFor } from '@/components/MitzvahIcon';
import { ListRow } from '@/components/ListRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionLabel } from '@/components/SectionLabel';
import { findAnyMitzvah } from '@/data/customMitzvotAdapter';
import { useDayModel } from '@/hooks/useDayModel';
import { useNow } from '@/hooks/useNow';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { clockOf, formatRemaining } from '@/utils/clock';
import { hebrewDayLabel } from '@/utils/historyTrends';
import { LATE_RECENT_DAYS, lateMarkReport } from '@/utils/lateMarks';
import { formatDate, useI18n } from '@/i18n';

// Every mitzvah marked after its time had passed, with when it happened, per mitzvah and in total.
export default function LateMarksScreen() {
  const { colors } = useTheme();
  const { language, t } = useI18n();
  const router = useRouter();
  const { location, settings, nameFor } = useDayModel();
  const completions = useCompletionsStore((s) => s.completions);
  const late = useCompletionsStore((s) => s.late);
  const now = useNow();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/history'));

  const report = useMemo(
    () => lateMarkReport({ find: findAnyMitzvah, completions, late, location, settings }, now),
    [completions, late, location, settings, now],
  );

  const delayText = (ms: number | null) => (ms === null ? null : formatRemaining(ms, t));
  const timesText = (count: number) => t(count === 1 ? 'late.times.once' : 'late.times', { count });
  const dayText = (key: string, date: Date) =>
    `${formatDate(date, language === 'he' ? 'cccc d LLLL' : 'cccc, LLL d', language)} · ${hebrewDayLabel(key, language, false)}`;
  const top = report.byMitzvah[0];
  const topMitzvah = top ? findAnyMitzvah(top.id) : undefined;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={t('late.title')} subtitle={t('late.subtitle')} onBack={goBack} />
      <ScrollView contentContainerStyle={styles.list}>
        <Banner tone="info" text={report.total ? t('late.note') : t('late.empty')} style={styles.cardGap} />
        {report.total ? (
          <>
            <SectionLabel text={t('late.summary')} />
            <Card divided style={styles.cardGap}>
              <ListRow
                icon="calendar"
                title={t(report.total === 1 ? 'late.total.once' : 'late.total', { count: report.total })}
                caption={t('late.recent', { count: report.recent, days: LATE_RECENT_DAYS })}
              />
              {report.averageDelayMs !== null ? (
                <ListRow
                  icon="undo"
                  title={t('late.averageDelay', { delay: delayText(report.averageDelayMs) })}
                  caption={t('late.averageDelayCaption')}
                />
              ) : null}
              {top && topMitzvah ? (
                <ListRow
                  icon={iconFor(topMitzvah.icon)}
                  title={t('late.top', { name: nameFor(topMitzvah) })}
                  caption={timesText(top.count)}
                />
              ) : null}
            </Card>

            <SectionLabel text={t('late.byMitzvah')} />
            <Card divided style={styles.cardGap}>
              {report.byMitzvah.flatMap((stat) => {
                const mitzvah = findAnyMitzvah(stat.id);
                if (!mitzvah) return [];
                const delay = delayText(stat.averageDelayMs);
                return [
                  <View key={stat.id} testID={`late-mitzvah-${stat.id}`}>
                    <ListRow
                      icon={iconFor(mitzvah.icon)}
                      title={nameFor(mitzvah)}
                      caption={
                        delay
                          ? t('late.mitzvahCaption', { times: timesText(stat.count), delay })
                          : timesText(stat.count)
                      }
                      chevron
                      onPress={() => router.push({ pathname: '/mitzvah/[id]', params: { id: stat.id } })}
                    />
                  </View>,
                ];
              })}
            </Card>

            <SectionLabel text={t('late.all')} />
            <Card divided style={styles.cardGap}>
              {report.entries.flatMap((entry) => {
                const mitzvah = findAnyMitzvah(entry.id);
                if (!mitzvah) return [];
                const date = dayText(entry.key, entry.date);
                const marked = clockOf(new Date(entry.markedAt), location.tz);
                return [
                  <View key={`${entry.key}:${entry.id}`} testID={`late-entry-${entry.key}-${entry.id}`}>
                    <ListRow
                      icon={iconFor(mitzvah.icon)}
                      iconTone="muted"
                      title={nameFor(mitzvah)}
                      caption={
                        entry.windowEnd
                          ? t('late.entryCaption', {
                              date,
                              end: clockOf(entry.windowEnd, location.tz),
                              marked,
                              delay: delayText(entry.delayMs),
                            })
                          : t('late.entryCaptionNoEnd', { date, marked })
                      }
                      chevron
                      onPress={() => router.push({ pathname: '/day/[date]', params: { date: entry.key } })}
                    />
                  </View>,
                ];
              })}
            </Card>
          </>
        ) : null}
      </ScrollView>
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
  cardGap: {
    marginBottom: spacing.lg,
  },
});
