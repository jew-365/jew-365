import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CompletedRow } from '@/components/CompletedRow';
import { formatDayLine } from '@/components/DayStepper';
import { iconFor } from '@/components/MitzvahIcon';
import { MitzvahCard } from '@/components/MitzvahCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionLabel } from '@/components/SectionLabel';
import { useDayModel } from '@/hooks/useDayModel';
import { useViewport, ViewportContext } from '@/hooks/useInView';
import { StorageService } from '@/services/StorageService';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useTheme } from '@/theme/ThemeProvider';
import { motion, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { HolyBlock } from '@/types/zmanim';
import {
  CHECK_IN_PROMPTED_KEY,
  CheckInItem,
  checkInFor,
  checkInLastDay,
  checkInPhraseKey,
  latestCheckIn,
} from '@/utils/checkIn';
import { clockOf } from '@/utils/clock';
import { onTimeMarkAt, windowClosed } from '@/utils/lateMarks';
import { formatDate, useI18n } from '@/i18n';

// Marks for the days of a Shabbat / Yom Tov block, written after it ends. The one route allowed to
// write a past day: those days could not be marked while they happened.
export default function CheckInRoute() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { language, nameFor, checkInInput } = useDayModel();
  const router = useRouter();
  const viewport = useViewport();
  const completions = useCompletionsStore((s) => s.completions);
  const skipped = useCompletionsStore((s) => s.skipped);
  const late = useCompletionsStore((s) => s.late);
  const unmark = useCompletionsStore((s) => s.unmark);
  const markDone = useCompletionsStore((s) => s.markDone);
  const finishCheckIn = useCompletionsStore((s) => s.finishCheckIn);

  // The block whose check-in was open on arrival. It stays on screen after the last mark, which
  // finishes the check-in, so the user sees the list complete rather than an empty page.
  const [block] = useState<HolyBlock | null>(() => {
    const open = latestCheckIn(checkInInput());
    return open?.open ? open.block : null;
  });
  const checkIn = useMemo(
    () => (block ? checkInFor(block, { ...checkInInput(), checkIns: {} }, new Date()) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- completions and skipped re-run the memo on purpose; checkInInput() reads them from the store
    [block, checkInInput, completions, skipped],
  );

  const checkInId = checkIn?.id;
  useEffect(() => {
    if (checkInId) StorageService.set(CHECK_IN_PROMPTED_KEY, checkInId);
  }, [checkInId]);

  // Leaving with everything marked is the same as "done": nothing is left to remind about.
  const allMarked = Boolean(checkIn?.days.every((day) => day.items.every((item) => item.done)));
  const leaveState = useRef({ id: checkIn?.id, allMarked });
  leaveState.current = { id: checkIn?.id, allMarked };
  useEffect(
    () => () => {
      const { id, allMarked: marked } = leaveState.current;
      if (id && marked) finishCheckIn(id);
    },
    [finishCheckIn],
  );

  // Past the deadline a mark would rewrite a day that is already decided — and revive a broken streak.
  // Nothing could be marked during the block, so a closed window is filed as a mark in time, never asked about
  // (the owner's call, 2026-10-31).
  const mark = (item: CheckInItem, date: Date) => {
    if (!checkIn || Date.now() >= checkIn.deadline.getTime()) {
      close();
      return;
    }
    markDone(
      item.mitzvah.id,
      date,
      windowClosed(item.window, new Date()) ? { at: onTimeMarkAt(item.window) } : undefined,
    );
  };

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/home');
  };

  const finish = () => {
    if (checkIn) finishCheckIn(checkIn.id);
    close();
  };

  const title = checkIn ? t('checkin.title', { in: t(checkInPhraseKey(checkIn.block)) }) : t('checkin.empty');
  const deadline = checkIn
    ? t('checkin.deadline', {
        day: formatDate(checkInLastDay(checkIn.block), 'cccc', language),
      })
    : '';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={title} subtitle={checkIn ? t('checkin.subtitle', { deadline }) : undefined} onBack={close} />
      {checkIn ? (
        <>
          <ViewportContext.Provider value={viewport.bus}>
            <ScrollView
              contentContainerStyle={styles.content}
              onScroll={viewport.notify}
              onContentSizeChange={viewport.notify}
              scrollEventThrottle={motion.inViewThrottleMs}
            >
              {checkIn.days.map((day) => (
                <View key={day.key} style={styles.day}>
                  <SectionLabel text={formatDayLine(day.date, language)} />
                  <View style={styles.list}>
                    {day.items
                      .filter((item) => !item.done)
                      .map((item) => (
                        <MitzvahCard
                          key={item.mitzvah.id}
                          icon={iconFor(item.mitzvah.icon)}
                          name={nameFor(item.mitzvah)}
                          timeLeft=""
                          pct={0}
                          hideProgress
                          statusText={t('checkin.pending')}
                          onPress={() => mark(item, day.date)}
                          onComplete={() => mark(item, day.date)}
                        />
                      ))}
                  </View>
                  {day.items.some((item) => item.done) ? (
                    <Card divided style={styles.doneGap}>
                      {day.items
                        .filter((item) => item.done)
                        .map((item) => (
                          <CompletedRow
                            key={item.mitzvah.id}
                            name={nameFor(item.mitzvah)}
                            time={
                              late[day.key]?.[item.mitzvah.id]
                                ? `${clockOf(item.window.start)} · ${t('state.markedLate')}`
                                : clockOf(item.window.start)
                            }
                            onUndo={() => unmark(item.mitzvah.id, day.date)}
                            undoLabel={t('home.undo')}
                          />
                        ))}
                    </Card>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </ViewportContext.Provider>
          <View style={styles.footer}>
            <Button label={t('checkin.finish')} onPress={finish} />
          </View>
        </>
      ) : (
        <Text style={[typography.body, { color: colors.textSub, textAlign: 'center', paddingTop: spacing.xxl }]}>
          {t('checkin.empty')}
        </Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  day: {
    marginBottom: spacing.lg,
  },
  list: {
    gap: spacing.sm,
  },
  doneGap: {
    marginTop: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
});
