import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { DateTime } from 'luxon';
import { Banner } from '@/components/Banner';
import { Card } from '@/components/Card';
import { iconFor } from '@/components/MitzvahIcon';
import { ListRow } from '@/components/ListRow';
import { HeaderPill, ScreenHeader } from '@/components/ScreenHeader';
import { OfferSheet } from '@/components/OfferSheet';
import { SectionLabel } from '@/components/SectionLabel';
import { useDayModel } from '@/hooks/useDayModel';
import { useNow } from '@/hooks/useNow';
import { useCapabilityAction } from '@/hooks/useOffer';
import { offerInputAt } from '@/services/offerInput';
import { weeklyTip } from '@/utils/offers';
import { HebcalService } from '@/services/HebcalService';
import { parseDateKey } from '@/services/notifications/ids';
import { RETENTION_DAYS, dateKey, useCompletionsStore } from '@/stores/useCompletionsStore';
import { enabledSinceOf, useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { addDays } from '@/utils/historyStats';
import {
  calendarLocale,
  nextWeekEnd,
  previousWeekEnd,
  reportWeekEnd,
  shabbatOf,
  upcomingWeek,
  weekStartFor,
  weekSummary,
} from '@/utils/weeklyReport';
import { formatDate, useI18n } from '@/i18n';

export default function ReportScreen() {
  const { colors } = useTheme();
  const { language, t } = useI18n();
  const router = useRouter();
  const { week } = useLocalSearchParams<{ week?: string }>();
  const { enabled, location, settings, inIsrael, nameFor } = useDayModel();
  const hilulotEnabled = useUserStore((s) => s.hilulotEnabled);
  const activeMap = useMitzvotStore((s) => s.activeMitzvot);
  const completions = useCompletionsStore((s) => s.completions);
  const checkIns = useCompletionsStore((s) => s.checkIns);
  const archivedDays = useCompletionsStore((s) => s.archivedDays);
  const skipped = useCompletionsStore((s) => s.skipped);
  const late = useCompletionsStore((s) => s.late);
  const now = useNow();
  const [chosen, setChosen] = useState(week);
  useEffect(() => setChosen(week), [week]);
  const locale = language === 'en' ? 'en' : 'he';
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'));
  // "A tip for next week" (spec C6): the report notice's tip, recomputed as the user acts on it.
  const offers = useUserStore((s) => s.discovery.offers);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- offers, activeMap and completions re-read the stores
  const tip = useMemo(() => weeklyTip(offerInputAt(new Date())), [offers, activeMap, hilulotEnabled, completions]);
  const [tipOpen, setTipOpen] = useState(false);
  const { run: runCapability, dialog: capabilityDialog } = useCapabilityAction();

  const nav = useMemo(() => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = reportWeekEnd(chosen ? parseDateKey(chosen) : null, location, now);
    if (!weekEnd) return { weekEnd, weekStart: null, previous: null, next: null };
    const previous = previousWeekEnd(weekEnd, location, now);
    const reachable =
      previous && weekStartFor(previous, location, now).getTime() >= addDays(today, -RETENTION_DAYS).getTime();
    return {
      weekEnd,
      weekStart: weekStartFor(weekEnd, location, now),
      previous: reachable ? previous : null,
      next: nextWeekEnd(weekEnd, location, now),
    };
  }, [chosen, location, now]);
  const { weekEnd, weekStart, previous, next } = nav;

  const summary = useMemo(
    () =>
      weekEnd && weekStart
        ? weekSummary(
            {
              mitzvot: enabled,
              completions,
              checkIns,
              archivedDays,
              skipped,
              late,
              enabledSince: enabledSinceOf(activeMap),
              location,
              settings,
            },
            weekStart,
            weekEnd,
            now,
          )
        : null,
    [
      weekStart,
      weekEnd,
      enabled,
      completions,
      checkIns,
      archivedDays,
      skipped,
      late,
      activeMap,
      location,
      settings,
      now,
    ],
  );
  const events = useMemo(
    () => (weekEnd ? upcomingWeek(weekEnd, location, locale, { inIsrael, enabled: hilulotEnabled }) : []),
    [weekEnd, location, locale, inIsrael, hilulotEnabled],
  );

  const dayLabel = (iso: string, pattern: string) => formatDate(DateTime.fromISO(iso), pattern, locale);
  const parasha = useMemo(
    () => (weekEnd ? HebcalService.getParasha(shabbatOf(weekEnd), location, calendarLocale(locale)) : undefined),
    [weekEnd, location, locale],
  );
  const range =
    weekEnd && weekStart
      ? `${DateTime.fromJSDate(weekStart).toFormat('d.M')} – ${DateTime.fromJSDate(weekEnd).toFormat('d.M')}`
      : '';
  const subtitle = parasha ? `${range} · ${parasha}` : range;

  const mitzvahOf = (id: string) => enabled.find((item) => item.id === id);
  const improved = summary?.improve ? mitzvahOf(summary.improve.id) : undefined;
  const lateMitzvah = summary?.lateTop ? mitzvahOf(summary.lateTop.id) : undefined;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={t('report.title')}
        subtitle={subtitle}
        onBack={goBack}
        actions={
          <>
            <HeaderPill
              label={t('report.prevWeek')}
              accessibilityLabel={t('report.prevWeek')}
              disabled={!previous}
              onPress={() => previous && setChosen(dateKey(previous))}
            />
            <HeaderPill
              label={t('report.nextWeek')}
              accessibilityLabel={t('report.nextWeek')}
              disabled={!next}
              onPress={() => next && setChosen(dateKey(next))}
            />
          </>
        }
      />
      <ScrollView contentContainerStyle={styles.list}>
        {summary && summary.perMitzvah.length ? (
          <>
            <SectionLabel text={t('report.summary')} />
            {summary.checkInPending ? (
              <Banner
                tone="accent"
                text={t(summary.checkInPending === 1 ? 'report.pendingLine.once' : 'report.pendingLine', {
                  count: summary.checkInPending,
                })}
                onPress={() => router.push('/checkin')}
              />
            ) : null}
            <Card divided style={styles.cardGap}>
              <ListRow
                icon="check"
                title={t('report.doneOf', { done: summary.done, total: summary.done + summary.missed })}
              />
              {summary.late ? (
                <ListRow
                  icon="calendar"
                  title={t(summary.late === 1 ? 'report.lateLine.once' : 'report.lateLine', { count: summary.late })}
                  chevron
                  onPress={() => router.push('/late-marks')}
                />
              ) : null}
              <ListRow
                icon="candles"
                title={t(summary.streak === 1 ? 'report.streak.once' : 'report.streak', { count: summary.streak })}
              />
              {summary.bestDay ? (
                <ListRow icon="sparkle" title={t('report.bestDay', { day: dayLabel(summary.bestDay, 'cccc') })} />
              ) : null}
            </Card>

            <SectionLabel text={t('report.perMitzvah')} />
            <Card divided style={styles.cardGap}>
              {summary.perMitzvah.flatMap((entry) => {
                const mitzvah = mitzvahOf(entry.id);
                if (!mitzvah) return [];
                return (
                  <ListRow
                    key={entry.id}
                    icon={iconFor(mitzvah.icon)}
                    iconTone={entry.missed > entry.done ? 'muted' : 'accent'}
                    title={nameFor(mitzvah)}
                    caption={t('report.mitzvahLine', { done: entry.done, missed: entry.missed })}
                  />
                );
              })}
            </Card>

            {(summary.improve && improved) || (summary.lateTop && lateMitzvah) ? (
              <>
                <SectionLabel text={t('report.improve')} />
                {summary.improve && improved ? (
                  <Banner
                    tone="warning"
                    text={t(summary.improve.missed === 1 ? 'report.improveLine.once' : 'report.improveLine', {
                      name: nameFor(improved),
                      count: summary.improve.missed,
                    })}
                    onPress={() => router.push({ pathname: '/mitzvah/[id]', params: { id: improved.id } })}
                  />
                ) : null}
                {summary.lateTop && lateMitzvah ? (
                  <View testID="report-late-top" style={styles.stackGap}>
                    <Banner
                      tone="info"
                      text={t(summary.lateTop.late === 1 ? 'report.lateTopLine.once' : 'report.lateTopLine', {
                        name: nameFor(lateMitzvah),
                        count: summary.lateTop.late,
                      })}
                      onPress={() => router.push({ pathname: '/mitzvah/[id]', params: { id: lateMitzvah.id } })}
                    />
                  </View>
                ) : null}
              </>
            ) : null}
          </>
        ) : (
          <Banner tone="info" text={t('report.empty')} />
        )}

        <SectionLabel text={t('report.upcoming')} />
        {events.length ? (
          <Card divided style={styles.cardGap}>
            {events.map((event) => (
              <ListRow
                key={event.key}
                icon="night"
                title={dayLabel(event.key, 'cccc · d.M')}
                caption={event.labels.join(' · ')}
              />
            ))}
          </Card>
        ) : (
          <Banner tone="info" text={t('report.nextWeekNone')} />
        )}

        {tip ? (
          <View testID="report-tip">
            <SectionLabel text={t('report.tip')} />
            <Card style={styles.cardGap}>
              <ListRow
                icon={tip.icon}
                title={t(`offer.${tip.id}.title`)}
                caption={t(`offer.${tip.id}.body`)}
                onPress={() => setTipOpen(true)}
                chevron
              />
            </Card>
          </View>
        ) : null}
      </ScrollView>
      <OfferSheet
        offer={tip}
        visible={tipOpen}
        onClose={() => setTipOpen(false)}
        onChoose={(chosen, accepted) => {
          setTipOpen(false);
          const store = useUserStore.getState();
          store.recordOffer(chosen.key, {
            shownAt: store.discovery.offers[chosen.key]?.shownAt ?? Date.now(),
            closedAt: Date.now(),
          });
          if (accepted) runCapability(chosen.action);
        }}
      />
      {capabilityDialog}
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
  stackGap: {
    marginTop: spacing.sm,
  },
});
