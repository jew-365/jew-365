import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { gematriya } from '@hebcal/core';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconTile } from '@/components/IconTile';
import { Landscape } from '@/components/Landscape';
import { ListRow } from '@/components/ListRow';
import { MitzvahIcon, backIcon, forwardIcon, iconFor, type IconName } from '@/components/MitzvahIcon';
import { NavBar } from '@/components/NavBar';
import { ProgressBar } from '@/components/ProgressBar';
import { Reveal } from '@/components/Reveal';
import { HeaderPill } from '@/components/ScreenHeader';
import { SectionLabel } from '@/components/SectionLabel';
import { SegmentedControl } from '@/components/SegmentedControl';
import { StreakRing } from '@/components/StreakRing';
import { useDayModel } from '@/hooks/useDayModel';
import { useInView, useViewport, ViewportContext } from '@/hooks/useInView';
import { useIsFocused, useReplayKey } from '@/hooks/useIsFocused';
import { useNow } from '@/hooks/useNow';
import { useCountUp, useEntrance, usePop, usePressScale } from '@/hooks/useMotion';
import { useRowMirrored } from '@/hooks/useRowMirrored';
import { formatDate, useI18n } from '@/i18n';
import { findAnyMitzvah } from '@/data/customMitzvotAdapter';
import { MITZVOT } from '@/data/mitzvot';
import { Achievements, BadgeId, useCompletionsStore } from '@/stores/useCompletionsStore';
import { useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { enabledSinceOf, useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { CALENDAR_PARTIAL_SHARES, blendHex, lateTone, readableOn } from '@/theme/colors';
import { scaled } from '@/theme/scale';
import { useTheme } from '@/theme/ThemeProvider';
import { motion, radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { HebcalService } from '@/services/HebcalService';
import { afterPaint } from '@/utils/afterPaint';
import {
  MarkTotals,
  badgeKind,
  earnedBadgeList,
  foldAchievements,
  markTotals,
  nextBadges,
  type FoldResult,
} from '@/utils/badges';
import { blockForDay } from '@/utils/checkIn';
import { clockOf } from '@/utils/clock';
import {
  DayJudge,
  HistoryInput,
  HistoryStats,
  JudgedItem,
  addDays,
  computeStats,
  createDayJudge,
  isTrackedInRange,
  judgeDayItems,
} from '@/utils/historyStats';
import {
  CalendarCell,
  CalendarLevel,
  CalendarMonth,
  MitzvahTrend,
  PeriodPercents,
  WeekName,
  WeekPoint,
  WeekdayChart,
  calendarInsight,
  calendarMonth,
  civilRangeLabel,
  formatCount,
  hebrewDayLabel,
  hebrewRangeLabel,
  holyDayName,
  lateByMitzvah,
  lateWeeksInsight,
  leaderInsight,
  mitzvahTrends,
  onTimePercent,
  periodPercents,
  tallyOf,
  trendInsight,
  weekName,
  weekSeries,
  weekdayChart,
  weekdayInsight,
  weeksInsight,
} from '@/utils/historyTrends';
import { lateImprove, type LateImprove } from '@/utils/lateMarks';
import { appDay, appDayKey } from '@/utils/locationDay';
import { firstName } from '@/utils/homeDay';
import { nextStreakGoal } from '@/utils/streakGoal';
import { shabbatOf } from '@/utils/weeklyReport';

const HISTORY_DAYS = 30;
const HERO_HEIGHT = scaled(360);
const RING_SIZE = scaled(200);
const PERIOD_RING = scaled(100);
const WEEK_CHART_HEIGHT = scaled(120);
const WEEKDAY_BAR_HEIGHT = scaled(10);
const MINI_BAR_WIDTH = scaled(56);
const AXIS_GUTTER = scaled(30);
const INSIGHT_ICON = scaled(14);
const BADGE_TILE = scaled(52);
const CAL_CELL_HEIGHT = scaled(46);
const WEEKDAY_NAME_WIDTH = scaled(80);
const PERCENT_MIN_WIDTH = scaled(36);
const RECORD_VALUE_WIDTH = scaled(56);
const CHEVRON = scaled(16);
const MUTED_BAR_OPACITY = 0.45;
const REPORTS_RECENT = 5;
const BADGES_PER_ROW = 3;
const SUNDAY = new Date(2024, 0, 7);

type Tab = 'summary' | 'trends' | 'achievements';
const TAB_ORDER: readonly Tab[] = ['summary', 'trends', 'achievements'];

type LiveRuns = FoldResult['live'];

type ViewModel = {
  stats: HistoryStats;
  live: LiveRuns;
  achievements: Achievements | null;
  totals: MarkTotals;
  improve: LateImprove | null;
  lateByMitzvah: Record<string, number>;
  periods: PeriodPercents;
  month: CalendarMonth;
  weeks: WeekPoint[];
  weekdays: WeekdayChart;
  trends: MitzvahTrend[];
};

type Computation = { judge: DayJudge; input: HistoryInput; now: Date };

type BadgeInfo = {
  id: BadgeId;
  icon: IconName;
  title: string;
  description: string;
  on?: string;
  done?: number;
  goal?: number;
  left?: string;
};

function useBatchSlot() {
  const batch = useRef({ at: 0, count: 0 });
  return useCallback(() => {
    const current = Date.now();
    if (current - batch.current.at > motion.batchWindowMs) batch.current = { at: current, count: 0 };
    return batch.current.count++;
  }, []);
}

function useSeenDelay(inView: boolean, takeSlot: () => number, step: number): number | null {
  const [delay, setDelay] = useState<number | null>(null);
  useEffect(() => {
    if (inView && delay === null) setDelay(takeSlot() * step);
  }, [inView, delay, takeSlot, step]);
  return delay;
}

function Insight({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.insight}>
      <MitzvahIcon name="sparkle" size={INSIGHT_ICON} color={colors.goldText} />
      <Text style={[typography.caption, styles.insightText, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

function PressableScale({
  testID,
  onPress,
  children,
  style,
  accessibilityLabel,
}: {
  testID?: string;
  onPress: () => void;
  children: React.ReactNode;
  style?: object;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const press = usePressScale();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: colors.border }}
    >
      <Animated.View style={[style, press.style]}>{children}</Animated.View>
    </Pressable>
  );
}

function SlideIn({ enterFrom, children }: { enterFrom: number; children: React.ReactNode }) {
  const mirrored = useRowMirrored();
  const view = useInView({ share: 0 });
  const fade = useEntrance(0, motion.tabFadeMs, view.inView);
  const slide = useEntrance(0, motion.tabSlideMs, view.inView);
  const from = enterFrom * motion.tabShift * (mirrored ? 1 : -1);
  const style = useAnimatedStyle(() => ({
    opacity: enterFrom === 0 ? 1 : fade.value,
    transform: [{ translateX: (1 - slide.value) * from }],
  }));
  return (
    <View ref={view.ref} onLayout={view.onLayout}>
      <Animated.View style={style}>{children}</Animated.View>
    </View>
  );
}

function useDayPalette() {
  const { colors } = useTheme();
  return useMemo(() => {
    const inks = [colors.text, colors.onGold];
    const fills: Record<CalendarLevel, string> = {
      full: colors.gold,
      p3: blendHex(colors.gold, colors.bg, CALENDAR_PARTIAL_SHARES.p3),
      p2: blendHex(colors.gold, colors.bg, CALENDAR_PARTIAL_SHARES.p2),
      p1: blendHex(colors.gold, colors.bg, CALENDAR_PARTIAL_SHARES.p1),
      none: colors.surface2,
      waiting: colors.bg,
      empty: colors.bg,
      future: colors.bg,
    };
    const ink = (level: CalendarLevel) =>
      level === 'future'
        ? colors.textMuted
        : level === 'none' || level === 'empty'
          ? colors.textSub
          : level === 'waiting'
            ? colors.text
            : readableOn(fills[level], inks);
    return { fills, ink };
  }, [colors]);
}

function CalendarCellView({
  cell,
  order,
  lastOrder,
  animate,
  active,
  summary,
  label,
  onPress,
}: {
  cell: CalendarCell;
  order: number;
  lastOrder: number;
  animate: boolean;
  active: boolean;
  summary: string;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { language } = useI18n();
  const palette = useDayPalette();
  const total = lastOrder * motion.calCellStagger + motion.gridCellMs;
  const entrance = useEntrance(animate ? order * motion.calCellStagger : 0, animate ? motion.gridCellMs : 0, active);
  const ring = useEntrance(animate ? total : 0, animate ? motion.todayRingMs : 0, active);
  const press = usePressScale();
  const cellStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ scale: motion.gridCellFrom + (1 - motion.gridCellFrom) * entrance.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.value,
    transform: [{ scale: motion.todayRingFrom - (motion.todayRingFrom - 1) * ring.value }],
  }));
  const ink = palette.ink(cell.level);
  const future = cell.level === 'future';
  return (
    <Animated.View style={[styles.flex, cellStyle]}>
      <Animated.View style={press.style}>
        <Pressable
          testID={`history-day-${cell.key}`}
          onPress={onPress}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
          disabled={future}
          accessibilityRole="button"
          accessibilityState={{ disabled: future }}
          accessibilityLabel={`${label}, ${cell.civilDay}.${cell.date.getMonth() + 1}, ${summary}`}
          style={[
            styles.calCell,
            { backgroundColor: palette.fills[cell.level] },
            cell.level === 'waiting' && { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.gold },
          ]}
        >
          <Text style={[typography.captionBold, { color: ink }]}>
            {language === 'he' ? gematriya(cell.hebrewDay) : cell.hebrewDay}
          </Text>
          <Text style={[typography.micro, { color: ink }]}>{cell.civilDay}</Text>
          {cell.today ? (
            <Animated.View pointerEvents="none" style={[styles.todayRing, { borderColor: colors.text }, ringStyle]} />
          ) : null}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

function MonthCalendar({
  month,
  travel,
  onPrevious,
  onNext,
  onOpen,
}: {
  month: CalendarMonth;
  travel: number;
  onPrevious: () => void;
  onNext: () => void;
  onOpen: (cell: CalendarCell) => void;
}) {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const palette = useDayPalette();
  const view = useInView();
  const cells: (CalendarCell | null)[] = [...Array<null>(month.leading).fill(null), ...month.days];
  while (cells.length % 7) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));
  const firstVisit = travel === 0;
  const insight = calendarInsight(month);
  const summaryOf = (cell: CalendarCell) =>
    cell.level === 'future'
      ? t('history.calendar.cell.future')
      : cell.level === 'waiting'
        ? t('history.calendar.legend.waiting')
        : cell.level === 'empty'
          ? t('history.calendar.cell.empty')
          : t('history.calendar.cell.doneOf', { done: cell.done, due: cell.due });
  return (
    <>
      <View style={styles.calHeader}>
        <HeaderPill
          icon={backIcon(language)}
          accessibilityLabel={t('history.calendar.previous')}
          disabled={month.previousStartKey === null}
          onPress={onPrevious}
        />
        <View style={styles.calTitle}>
          <Text style={[typography.heading, { color: colors.text }]}>{month.title[language]}</Text>
          <Text style={[typography.small, { color: colors.textSub }]}>{month.civilRange}</Text>
        </View>
        <HeaderPill
          icon={forwardIcon(language)}
          accessibilityLabel={t('history.calendar.next')}
          disabled={month.isCurrent}
          onPress={onNext}
        />
      </View>
      <View style={styles.calWeekdays}>
        {Array.from({ length: 7 }, (_, i) => (
          <Text key={i} style={[typography.captionBold, styles.calWeekday, { color: colors.textSub }]}>
            {formatDate(addDays(SUNDAY, i), 'ccc', language)}
          </Text>
        ))}
      </View>
      <View ref={view.ref} onLayout={view.onLayout}>
        <SlideIn key={month.startKey} enterFrom={travel}>
          <View testID="history-calendar" style={styles.calGrid}>
            {rows.map((row, r) => (
              <View key={r} style={styles.calRow}>
                {row.map((cell, c) =>
                  cell ? (
                    <CalendarCellView
                      key={cell.key}
                      cell={cell}
                      order={cell.hebrewDay - 1}
                      lastOrder={month.days.length - 1}
                      animate={firstVisit}
                      active={view.inView}
                      summary={summaryOf(cell)}
                      label={hebrewDayLabel(cell.key, language, false)}
                      onPress={() => onOpen(cell)}
                    />
                  ) : (
                    <View key={`blank-${r}-${c}`} style={styles.flex} />
                  ),
                )}
              </View>
            ))}
          </View>
        </SlideIn>
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.fills.full }]} />
          <Text style={[typography.small, { color: colors.textSub }]}>{t('history.calendar.legend.full')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendSteps}>
            {(['p3', 'p2', 'p1'] as const).map((step) => (
              <View key={step} style={[styles.legendStep, { backgroundColor: palette.fills[step] }]} />
            ))}
          </View>
          <Text style={[typography.small, { color: colors.textSub }]}>{t('history.calendar.legend.partial')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.fills.none }]} />
          <Text style={[typography.small, { color: colors.textSub }]}>{t('history.calendar.legend.none')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDashed, { borderColor: colors.gold }]} />
          <Text style={[typography.small, { color: colors.textSub }]}>{t('history.calendar.legend.waiting')}</Text>
        </View>
      </View>
      {insight ? (
        <Reveal
          key={month.startKey}
          active={view.inView}
          delay={firstVisit ? (month.days.length - 1) * motion.calCellStagger + motion.gridCellMs : 0}
        >
          <Insight
            text={t(insight.current ? 'history.calendar.insightCurrent' : 'history.calendar.insightPast', {
              marked: insight.marked,
              past: insight.past,
              month: month.monthName[language],
            })}
          />
        </Reveal>
      ) : null}
    </>
  );
}

function DayItemRow({
  item,
  name,
  icon,
  blockKind,
  zone,
  onPress,
}: {
  item: JudgedItem;
  name: string;
  icon: IconName;
  blockKind: string | null;
  zone: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const late = lateTone(colors);
  const label =
    item.state === 'done'
      ? item.inCheckIn
        ? t('history.day.state.doneInCheckIn')
        : t('history.day.state.doneAt', { time: clockOf(new Date(item.markedAt ?? 0), zone) })
      : item.state === 'late'
        ? t('history.day.state.late', { time: clockOf(new Date(item.markedAt ?? 0), zone) })
        : item.state === 'waiting'
          ? t(blockKind === 'shabbat' ? 'history.day.state.waitingShabbat' : 'history.day.state.waitingYomTov')
          : t(`history.day.state.${item.state}`);
  const tone =
    item.state === 'late'
      ? late.ink
      : item.state === 'done' || item.state === 'open' || item.state === 'waiting'
        ? colors.goldText
        : item.state === 'missed'
          ? colors.textSub
          : colors.textMuted;
  return (
    <Pressable
      testID={`history-day-item-${item.id}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('history.day.itemLabel', { name, state: label })}
      style={styles.dayItem}
    >
      <MitzvahIcon name={icon} size={scaled(18)} color={colors.goldText} />
      <Text style={[typography.body, styles.flex, { color: colors.text }]} numberOfLines={1}>
        {name}
      </Text>
      <View
        style={[
          styles.dayState,
          item.state === 'done' && { backgroundColor: colors.goldLight },
          item.state === 'late' && { backgroundColor: late.fill },
          item.state === 'waiting' && { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.gold },
        ]}
      >
        {item.state === 'done' || item.state === 'late' ? (
          <MitzvahIcon name="check" size={scaled(12)} color={tone} strokeWidth={2.5} />
        ) : null}
        <Text style={[typography.small, { color: tone }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

type OpenDay = { cell: CalendarCell; items: JudgedItem[]; blockKind: string | null };

function DaySheet({
  day,
  onClose,
  onFullDay,
  onOpenMitzvah,
}: {
  day: OpenDay | null;
  onClose: () => void;
  onFullDay: (key: string) => void;
  onOpenMitzvah: (id: string) => void;
}) {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const { allMitzvot, location, nameFor } = useDayModel();
  const [shown, setShown] = useState(day);
  useEffect(() => {
    if (day) setShown(day);
  }, [day]);
  const holy = shown ? holyDayName(shown.cell.date, location) : null;
  const holyText = !holy
    ? null
    : holy.kind === 'shabbat'
      ? t('history.day.shabbat', {
          name: t(holy.name.kind === 'parasha' ? 'history.week.parasha' : 'history.week.festival', {
            name: holy.name[language],
          }),
        })
      : holy[language];
  const caption = (() => {
    if (!shown) return '';
    const tally = tallyOf({ key: shown.cell.key, items: shown.items });
    const civil = `${shown.cell.civilDay}.${shown.cell.date.getMonth() + 1}.${shown.cell.date.getFullYear()}`;
    const tail =
      tally.waiting > 0
        ? t(tally.waiting === 1 ? 'history.day.waiting.once' : 'history.day.waiting', { count: tally.waiting })
        : tally.due === 0
          ? t('history.day.nothingDue')
          : t('history.day.doneOf', { done: tally.done, due: tally.due });
    return `${civil} · ${tail}`;
  })();
  return (
    <BottomSheet visible={day !== null} onClose={onClose}>
      {shown ? (
        <View style={styles.daySheet}>
          {holyText ? (
            <View style={[styles.holyStrip, { backgroundColor: colors.goldLight }]}>
              <MitzvahIcon name="candles" size={scaled(18)} color={colors.goldText} />
              <Text style={[typography.captionBold, { color: colors.goldText }]}>{holyText}</Text>
            </View>
          ) : null}
          <Text style={[typography.heading, { color: colors.text }]}>
            {`${formatDate(shown.cell.date, 'cccc', language)}, ${hebrewDayLabel(shown.cell.key, language, true)}`}
          </Text>
          <Text style={[typography.caption, { color: colors.textSub }]}>{caption}</Text>
          <View style={[styles.dayList, { borderColor: colors.border }]}>
            {shown.items.length ? (
              shown.items.map((item) => {
                const mitzvah = allMitzvot.find((m) => m.id === item.id);
                return (
                  <DayItemRow
                    key={item.id}
                    item={item}
                    name={mitzvah ? nameFor(mitzvah) : item.id}
                    icon={mitzvah ? iconFor(mitzvah.icon) : 'custom'}
                    blockKind={shown.blockKind}
                    zone={location.tz}
                    onPress={() => onOpenMitzvah(item.id)}
                  />
                );
              })
            ) : (
              <Text style={[typography.body, styles.dayEmpty, { color: colors.textMuted }]}>
                {t('history.day.nothingDue')}
              </Text>
            )}
          </View>
          <Button
            label={t('history.day.full')}
            variant="secondary"
            icon="calendar"
            onPress={() => onFullDay(shown.cell.key)}
          />
        </View>
      ) : null}
    </BottomSheet>
  );
}

function StreakChip({ streak, delay, active }: { streak: number; delay: number; active: boolean }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const pop = usePop(delay, motion.chipFrom, active);
  return (
    <Animated.View style={[styles.chip, { backgroundColor: streak ? colors.goldLight : colors.surface2 }, pop]}>
      <MitzvahIcon name="sparkle" size={scaled(12)} color={streak ? colors.goldText : colors.textMuted} />
      <Text style={[typography.small, { color: streak ? colors.goldText : colors.textMuted }]}>
        {streak ? t('history.chip.streak', { count: streak }) : t('history.chip.none')}
      </Text>
    </Animated.View>
  );
}

type ConsistencyItem = {
  id: string;
  name: string;
  summary: string;
  percent: number | null;
  streak: number;
  lateText: string | null;
};

function ConsistencyRow({
  item,
  takeSlot,
  onPress,
}: {
  item: ConsistencyItem;
  takeSlot: () => number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const view = useInView();
  const delay = useSeenDelay(view.inView, takeSlot, motion.rowBarStagger);
  const active = view.inView && delay !== null;
  const start = delay ?? 0;
  const progress = useEntrance(start, motion.barMs, active);
  const shown = useCountUp(progress, item.percent ?? 0);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.summary}`}
      onPress={onPress}
      style={styles.statRow}
    >
      <View ref={view.ref} onLayout={view.onLayout} style={styles.statInner}>
        <View style={styles.statTop}>
          <Text style={[typography.bodyBold, styles.flex, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.percent === null ? null : (
            <StreakChip streak={item.streak} delay={start + motion.barMs * 0.7} active={active} />
          )}
          {item.percent === null ? null : (
            <Text
              accessibilityLabel={`${item.percent}%`}
              style={[typography.captionBold, styles.percent, { color: colors.goldText }]}
            >{`${shown}%`}</Text>
          )}
        </View>
        {item.percent === null ? (
          <Text testID={`history-new-${item.id}`} style={[typography.caption, { color: colors.textSub }]}>
            {item.summary}
          </Text>
        ) : (
          <ProgressBar testID={`history-bar-${item.id}`} percent={item.percent} delay={start} active={active} />
        )}
        {item.percent !== null && item.lateText ? (
          <Text testID={`history-late-${item.id}`} style={[typography.small, { color: lateTone(colors).ink }]}>
            {item.lateText}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function SelectionDetail({
  id,
  title,
  caption,
  percent,
  value,
}: {
  id: string;
  title: string;
  caption: string;
  percent: number | null;
  value?: string;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <Reveal key={id} duration={motion.detailFadeMs} shift={0}>
      <View style={[styles.detail, { backgroundColor: colors.goldWash }]} accessibilityLiveRegion="polite">
        <View style={styles.flex}>
          <Text style={[typography.bodyBold, { color: colors.text }]}>{title}</Text>
          <Text style={[typography.caption, { color: colors.textSub }]}>{caption}</Text>
        </View>
        <Text style={[typography.heading, { color: colors.goldText }]}>
          {value ?? (percent === null ? t('history.percentNone') : `${percent}%`)}
        </Text>
      </View>
    </Reveal>
  );
}

function WeekBar({
  week,
  title,
  index,
  selected,
  labelled,
  onSelect,
  metric = 'percent',
  max = 1,
}: {
  week: WeekPoint;
  title: string;
  index: number;
  selected: boolean;
  labelled: boolean;
  onSelect: () => void;
  metric?: 'percent' | 'late';
  max?: number;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const view = useInView();
  const progress = useEntrance(index * motion.weekBarStagger, motion.barMs, view.inView);
  const grow = useAnimatedStyle(() => ({ transform: [{ scaleY: progress.value }] }));
  const isLate = metric === 'late';
  if (isLate ? week.due === 0 : week.percent === null) return <View style={styles.weekColumn} />;
  const tone = lateTone(colors);
  const label = isLate ? String(week.late) : `${week.percent}%`;
  const height = isLate
    ? (WEEK_CHART_HEIGHT * week.late) / Math.max(1, max)
    : (WEEK_CHART_HEIGHT * (week.percent ?? 0)) / 100;
  const fill = isLate ? tone.fill : colors.goldLight;
  const ring = isLate ? tone.ring : colors.gold;
  const solid = ring;
  const ink = isLate ? tone.ink : colors.goldText;
  const prefix = isLate ? 'history-late-week' : 'history-week';
  return (
    <Pressable
      ref={view.ref}
      onLayout={view.onLayout}
      testID={`${prefix}-${week.weekEnd}`}
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityLabel={
        isLate
          ? t('history.lateWeeks.barLabel', { title, count: week.late })
          : t('history.weeks.barLabel', { title, percent: week.percent })
      }
      accessibilityState={{ selected }}
      hitSlop={{ top: spacing.md, bottom: spacing.md, left: spacing.xs / 2, right: spacing.xs / 2 }}
      style={styles.weekColumn}
    >
      {labelled ? (
        <View style={styles.weekLabelSlot}>
          <Text
            testID={`${prefix}-label-${week.weekEnd}`}
            numberOfLines={1}
            style={[
              selected ? typography.captionBold : typography.micro,
              styles.weekLabel,
              { color: selected || week.current ? ink : colors.textSub },
            ]}
          >
            {label}
          </Text>
        </View>
      ) : null}
      <Animated.View
        style={[
          styles.weekBar,
          { height },
          week.current
            ? {
                backgroundColor: fill,
                borderWidth: selected ? 2 : 1.5,
                borderColor: ring,
                borderStyle: 'dashed',
              }
            : { backgroundColor: solid, opacity: selected ? 1 : MUTED_BAR_OPACITY },
          grow,
        ]}
      />
    </Pressable>
  );
}

function WeekdayRow({
  testID,
  name,
  percent,
  index,
  selected,
  highlighted,
  holy,
  onSelect,
}: {
  testID: string;
  name: string;
  percent: number | null;
  index: number;
  selected: boolean;
  highlighted: boolean;
  holy: boolean;
  onSelect: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const shown = percent ?? 0;
  return (
    <Pressable
      testID={testID}
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityLabel={percent === null ? name : t('history.weekday.rowLabel', { name, percent })}
      accessibilityState={{ selected }}
      style={[styles.weekdayRow, selected && { backgroundColor: colors.goldWash }]}
    >
      <Text
        style={[
          selected ? typography.captionBold : typography.caption,
          styles.weekdayName,
          { color: holy && !selected ? colors.textSub : colors.text },
        ]}
      >
        {name}
      </Text>
      <View style={styles.flex}>
        <ProgressBar
          percent={shown}
          height={WEEKDAY_BAR_HEIGHT}
          opacity={highlighted ? 1 : MUTED_BAR_OPACITY}
          delay={index * motion.rowBarStagger}
          dashed={holy}
        />
      </View>
      <Text style={[typography.captionBold, styles.percent, { color: highlighted ? colors.goldText : colors.textSub }]}>
        {percent === null ? t('history.percentNone') : `${percent}%`}
      </Text>
    </Pressable>
  );
}

function EarnedTile({ badge, takeSlot, onPress }: { badge: BadgeInfo; takeSlot: () => number; onPress: () => void }) {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const view = useInView();
  const delay = useSeenDelay(view.inView, takeSlot, motion.badgeStagger);
  const pop = usePop(delay ?? 0, motion.badgeFrom, view.inView && delay !== null);
  const press = usePressScale();
  const date = hebrewDayLabel(badge.on ?? '', language, true);
  return (
    <View ref={view.ref} onLayout={view.onLayout} style={styles.flex}>
      <Animated.View style={pop}>
        <Pressable
          testID={`history-badge-${badge.id}`}
          onPress={onPress}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
          accessibilityRole="button"
          accessibilityLabel={t('history.badges.tileLabel', { title: badge.title, date })}
        >
          <Animated.View style={press.style}>
            <Card padded>
              <View style={styles.badgeInner}>
                <IconTile name={badge.icon} size={BADGE_TILE} />
                <Text style={[typography.captionBold, styles.center, { color: colors.text }]} numberOfLines={2}>
                  {badge.title}
                </Text>
                <Text style={[typography.micro, styles.center, { color: colors.textSub }]}>{date}</Text>
              </View>
            </Card>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function BadgeSheet({ badge, onClose }: { badge: BadgeInfo | null; onClose: () => void }) {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const [shown, setShown] = useState(badge);
  useEffect(() => {
    if (badge) setShown(badge);
  }, [badge]);
  const earned = shown && shown.on ? shown : null;
  const next = shown && shown.goal !== undefined ? shown : null;
  return (
    <BottomSheet visible={badge !== null} title={shown?.title} caption={shown?.description} onClose={onClose}>
      {shown ? (
        <View style={styles.sheetBody}>
          <IconTile name={shown.icon} tone={earned ? 'accent' : 'muted'} size={BADGE_TILE} />
          <View style={[styles.flex, styles.nextText]}>
            {earned ? (
              <Text style={[typography.bodyBold, { color: colors.text }]}>
                {t('history.badges.earnedOn', { date: hebrewDayLabel(earned.on ?? '', language, true) })}
              </Text>
            ) : null}
            {next ? (
              <>
                <Text style={[typography.bodyBold, { color: colors.text }]}>{next.left}</Text>
                <ProgressBar percent={Math.round(((next.done ?? 0) / (next.goal ?? 1)) * 100)} />
                <Text style={[typography.small, { color: colors.textSub }]}>
                  {t('history.badges.progress', {
                    done: formatCount(next.done ?? 0),
                    goal: formatCount(next.goal ?? 0),
                  })}
                </Text>
              </>
            ) : null}
          </View>
        </View>
      ) : null}
    </BottomSheet>
  );
}

const EMPTY_STATS: HistoryStats = { streak: 0, daily: [], perMitzvah: {}, missedYesterday: [] };

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const { allMitzvot, enabled, location, settings, nameFor } = useDayModel();
  const router = useRouter();
  const profileName = useUserStore((s) => s.profileName);
  const activeMap = useMitzvotStore((s) => s.activeMitzvot);
  const completions = useCompletionsStore((s) => s.completions);
  const checkIns = useCompletionsStore((s) => s.checkIns);
  const archivedDays = useCompletionsStore((s) => s.archivedDays);
  const skipped = useCompletionsStore((s) => s.skipped);
  const late = useCompletionsStore((s) => s.late);
  const [model, setModel] = useState<ViewModel | null>(null);
  const focused = useIsFocused();
  const computedFor = useRef<readonly unknown[] | null>(null);
  const computation = useRef<Computation | null>(null);
  const customItems = useCustomMitzvotStore((s) => s.items);
  const knownIds = useRef<string[]>([]);
  knownIds.current = [...MITZVOT.map((m) => m.id), ...Object.values(customItems).map((m) => m.id)];
  const ticked = useNow();
  const [dayKey, setDayKey] = useState(() => appDayKey(new Date(), location));
  const [tab, setTab] = useState<Tab>('summary');
  const [tabsPinned, setTabsPinned] = useState(false);
  const [enterFrom, setEnterFrom] = useState(0);
  const [monthStart, setMonthStart] = useState<string | null>(null);
  const [travel, setTravel] = useState(0);
  const [openDay, setOpenDay] = useState<OpenDay | null>(null);
  const [badge, setBadge] = useState<BadgeInfo | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [selectedLateWeek, setSelectedLateWeek] = useState<string | null>(null);
  const [selectedWeekday, setSelectedWeekday] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const takeSlot = useBatchSlot();
  const playKey = useReplayKey(() => {
    setTravel(0);
    setMonthStart(null);
  });
  const viewport = useViewport();

  useEffect(() => {
    setDayKey(appDayKey(ticked, location));
  }, [ticked, location]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setDayKey(appDayKey(new Date(), location));
    });
    return () => subscription.remove();
  }, [location]);

  useEffect(() => {
    if (!focused) return;
    const inputs = [enabled, completions, checkIns, archivedDays, skipped, late, activeMap, location, settings, dayKey];
    const last = computedFor.current;
    if (last && inputs.every((input, index) => Object.is(input, last[index]))) return;
    let cancelled = false;
    const task = afterPaint(() => {
      const now = new Date();
      const input: HistoryInput = {
        mitzvot: enabled,
        completions,
        checkIns,
        archivedDays,
        skipped,
        late,
        enabledSince: enabledSinceOf(activeMap),
        location,
        settings,
      };
      const judge = createDayJudge(input, now);
      const stats = computeStats(enabled, completions, location, settings, HISTORY_DAYS, now, {
        checkIns,
        archivedDays,
        skipped,
        late,
        enabledSince: input.enabledSince,
        judge,
      });
      const store = useCompletionsStore.getState();
      const fold = foldAchievements(
        input,
        store.achievements,
        store.archivedMarks,
        stats.streak,
        now,
        judge,
        knownIds.current,
      );
      store.saveAchievements(fold.next);
      const weeks = weekSeries(input, now, judge);
      const weekdays = weekdayChart(weeks, input, now, judge);
      const next: ViewModel = {
        stats,
        live: fold.live,
        achievements: useCompletionsStore.getState().achievements,
        totals: markTotals(completions, store.archivedMarks),
        improve: lateImprove({ find: findAnyMitzvah, completions, late, location }, now),
        lateByMitzvah: lateByMitzvah(input, now, judge, HISTORY_DAYS),
        periods: periodPercents(input, now, judge),
        month: calendarMonth(null, input, now, judge),
        weeks,
        weekdays,
        trends: mitzvahTrends(input, now, judge, stats.perMitzvah),
      };
      if (!cancelled) {
        computation.current = { judge, input, now };
        computedFor.current = inputs;
        setModel(next);
      }
    });
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [focused, enabled, completions, checkIns, archivedDays, skipped, late, activeMap, location, settings, dayKey]);

  const month = useMemo(() => {
    if (!model) return null;
    const current = computation.current;
    return monthStart && current ? calendarMonth(monthStart, current.input, current.now, current.judge) : model.month;
  }, [model, monthStart]);

  const changeTab = useCallback(
    (next: Tab) => {
      if (next === tab) return;
      setEnterFrom(Math.sign(TAB_ORDER.indexOf(next) - TAB_ORDER.indexOf(tab)));
      setTravel(0);
      setMonthStart(null);
      setTab(next);
      if (scrollY.current > HERO_HEIGHT) {
        requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: HERO_HEIGHT, animated: false }));
      }
    },
    [tab],
  );
  // The search sends a card or a figure here as `tab`: switch to it once, then drop the param.
  const tabParam = useLocalSearchParams<{ tab?: string }>().tab;
  useEffect(() => {
    if (!tabParam) return;
    if ((TAB_ORDER as readonly string[]).includes(tabParam)) changeTab(tabParam as Tab);
    router.setParams({ tab: undefined });
  }, [tabParam, changeTab, router]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
    const pinned = scrollY.current >= HERO_HEIGHT;
    if (pinned !== tabsPinned) setTabsPinned(pinned);
    viewport.notify();
  };

  const nameForId = (id: string) => {
    const mitzvah = allMitzvot.find((item) => item.id === id);
    return mitzvah ? nameFor(mitzvah) : id;
  };

  const stats = model?.stats ?? EMPTY_STATS;
  const now = new Date();
  const today = appDay(now, location);
  const name = firstName(profileName);
  const greeting = name ? t('history.greeting', { name }) : t('history.greetingNeutral');
  const dateLine = `${formatDate(today, 'cccc', language)}, ${HebcalService.getHebrewDateAt(now, location).hebrewDateStr}`;
  const goal = nextStreakGoal(stats.streak);
  const remaining = goal - stats.streak;
  const goalCaption = t(remaining === 1 ? 'history.goalCaption.once' : 'history.goalCaption', {
    count: remaining,
    goal,
  });

  const weekTitleOf = (name: WeekName) =>
    t(name.kind === 'parasha' ? 'history.week.parasha' : 'history.week.festival', { name: name[language] });
  const weekdayName = (weekday: number) => formatDate(addDays(SUNDAY, weekday), 'cccc', language);

  const badgeInfo = (id: BadgeId): BadgeInfo => {
    const kind = badgeKind(id);
    if (kind.kind === 'streak') {
      return {
        id,
        icon: kind.days === 7 || kind.days === 100 ? 'star' : 'sparkle',
        title: t('history.badge.streak.title', { count: kind.days }),
        description: t('history.badge.streak.description', { count: kind.days }),
      };
    }
    if (kind.kind === 'fullWeek') {
      return {
        id,
        icon: 'calendar',
        title: t('history.badge.fullWeek.title'),
        description: t('history.badge.fullWeek.description'),
      };
    }
    if (kind.kind === 'fullMonth') {
      return {
        id,
        icon: 'moon',
        title: t('history.badge.fullMonth.title'),
        description: t('history.badge.fullMonth.description'),
      };
    }
    if (kind.kind === 'punctualWeek') {
      return {
        id,
        icon: 'sun',
        title: t('history.badge.punctualWeek.title'),
        description: t('history.badge.punctualWeek.description'),
      };
    }
    if (kind.kind === 'punctualMonth') {
      return {
        id,
        icon: 'night',
        title: t('history.badge.punctualMonth.title'),
        description: t('history.badge.punctualMonth.description'),
      };
    }
    if (kind.kind === 'fewerLate') {
      return {
        id,
        icon: 'undo',
        title: t('history.badge.fewerLate.title'),
        description: t('history.badge.fewerLate.description'),
      };
    }
    if (kind.kind === 'thousand') {
      return {
        id,
        icon: 'check',
        title: t('history.badge.thousand.title'),
        description: t('history.badge.thousand.description'),
      };
    }
    const mitzvah = allMitzvot.find((m) => m.id === kind.mitzvahId);
    const name = mitzvah ? nameFor(mitzvah) : t('history.badge.deletedMitzvah');
    return {
      id,
      icon: mitzvah ? iconFor(mitzvah.icon) : 'custom',
      title: t('history.badge.hundred.title', { name }),
      description: t('history.badge.hundred.description', { name }),
    };
  };

  const leftText = (id: BadgeId, remainingCount: number) => {
    const kind = badgeKind(id).kind;
    const base = kind === 'streak' ? 'days' : kind === 'thousand' ? 'marks' : 'times';
    return t(remainingCount === 1 ? `history.badge.left.${base}.once` : `history.badge.left.${base}`, {
      count: remainingCount,
    });
  };

  const openCell = (cell: CalendarCell) => {
    const current = computation.current;
    if (!current) return;
    const items = judgeDayItems(cell.date, current.input, new Date(), { checkInFlags: true }).items.sort(
      (a, b) => a.window.start.getTime() - b.window.start.getTime(),
    );
    setOpenDay({ cell, items, blockKind: blockForDay(cell.date, location)?.kind ?? null });
  };

  const renderSummary = (data: ViewModel, shownMonth: CalendarMonth) => {
    const earned = earnedBadgeList(data.achievements);
    const bestDays = Math.max(data.achievements?.bestStreak?.days ?? 0, data.live.run.days);
    const upcoming = nextBadges(
      data.achievements,
      data.totals,
      data.stats.streak,
      enabled.map((m) => m.id),
    )[0];
    const countText = earned.length
      ? t(earned.length === 1 ? 'history.achievements.count.once' : 'history.achievements.count', {
          count: earned.length,
        })
      : t('history.achievements.count.none');
    const bestText = bestDays
      ? t(bestDays === 1 ? 'history.achievements.best.once' : 'history.achievements.best', { count: bestDays })
      : null;
    const nextInfo = upcoming ? badgeInfo(upcoming.id) : null;
    const nextCaption =
      upcoming && nextInfo
        ? t('history.achievements.next', {
            title: nextInfo.title,
            left: leftText(upcoming.id, upcoming.goal - upcoming.done),
          })
        : undefined;
    const onTimeText = (done: number, lateCount: number) => {
      const percent = onTimePercent(done, lateCount);
      if (lateCount === 0) return t('history.period.onTime', { percent });
      return lateCount === 1
        ? t('history.period.onTimeLate.once', { percent })
        : t('history.period.onTimeLate', { percent, count: lateCount });
    };
    const periods: { id: 'day' | 'week' | 'month'; tally: PeriodPercents['day']; caption: string }[] = [
      { id: 'day', tally: data.periods.day, caption: t('history.period.dayCaption') },
      { id: 'week', tally: data.periods.week, caption: t('history.period.weekCaption') },
      {
        id: 'month',
        tally: data.periods.month,
        caption: t('history.period.monthCaption', { month: data.month.monthName[language] }),
      },
    ];
    const rows = enabled
      .flatMap((mitzvah) => {
        const stat = data.stats.perMitzvah[mitzvah.id];
        return stat && isTrackedInRange(stat) ? [{ mitzvah, stat }] : [];
      })
      .sort((a, b) => Number(a.stat.eligible === 0) - Number(b.stat.eligible === 0) || a.stat.percent - b.stat.percent);
    const topMitzvah = data.improve?.top ? findAnyMitzvah(data.improve.top.id) : undefined;
    const improveTitle = !data.improve
      ? ''
      : data.improve.top
        ? t(data.improve.top.count === 1 ? 'history.improve.top.once' : 'history.improve.top', {
            name: topMitzvah ? nameFor(topMitzvah) : data.improve.top.id,
            count: data.improve.top.count,
            days: data.improve.days,
          })
        : t('history.improve.noneRecent', { days: data.improve.days });
    const leader = leaderInsight(
      data.stats.perMitzvah,
      enabled.map((m) => m.id),
    );
    return (
      <>
        <View style={styles.periodRow}>
          {periods.map((period, i) => (
            <View key={period.id} style={styles.period}>
              <View testID={`history-period-${period.id}`}>
                <StreakRing
                  percent={{ done: period.tally.done, total: period.tally.due }}
                  size={PERIOD_RING}
                  animate
                  delay={i * motion.periodRingStagger}
                />
              </View>
              <Text style={[typography.bodyBold, { color: colors.text }]}>{t(`history.period.${period.id}`)}</Text>
              <Text style={[typography.small, styles.center, { color: colors.textSub }]}>{period.caption}</Text>
              {period.tally.done > 0 ? (
                <Text
                  testID={`history-period-ontime-${period.id}`}
                  style={[typography.small, styles.center, { color: colors.textSub }]}
                >
                  {onTimeText(period.tally.done, period.tally.late)}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
        <Text style={[typography.small, styles.center, styles.periodHint, { color: colors.textSub }]}>
          {t('history.period.hint')}
        </Text>

        <Card divided>
          <View testID="history-achievements-link">
            <ListRow
              icon="star"
              title={bestText ? `${countText} · ${bestText}` : countText}
              caption={nextCaption}
              chevron
              onPress={() => changeTab('achievements')}
            />
          </View>
        </Card>

        {data.improve ? (
          <>
            <SectionLabel text={t('history.improve.title')} />
            <Card divided>
              <View testID="history-improve-card">
                <ListRow
                  icon={topMitzvah ? iconFor(topMitzvah.icon) : 'calendar'}
                  title={improveTitle}
                  caption={t(data.improve.total === 1 ? 'history.improve.total.once' : 'history.improve.total', {
                    count: data.improve.total,
                  })}
                  chevron
                  onPress={() => router.push('/late-marks')}
                />
              </View>
            </Card>
          </>
        ) : null}

        <MonthCalendar
          month={shownMonth}
          travel={travel}
          onPrevious={() => {
            setTravel(-1);
            setMonthStart(shownMonth.previousStartKey);
          }}
          onNext={() => {
            setTravel(1);
            setMonthStart(shownMonth.nextStartKey);
          }}
          onOpen={openCell}
        />

        <SectionLabel text={t('history.perMitzvah')} />
        <Text style={[typography.small, styles.sectionHint, { color: colors.textSub }]}>
          {t('history.perMitzvahHint')}
        </Text>
        <Card divided>
          {rows.map(({ mitzvah, stat }) => {
            const lateCount = data.lateByMitzvah[mitzvah.id] ?? 0;
            const summary =
              stat.eligible === 0
                ? t('history.newMitzvah')
                : lateCount
                  ? t(lateCount === 1 ? 'history.percentLate.once' : 'history.percentLate', {
                      percent: stat.percent,
                      count: lateCount,
                    })
                  : t('history.percent', { percent: stat.percent });
            return (
              <ConsistencyRow
                key={mitzvah.id}
                takeSlot={takeSlot}
                onPress={() => router.push({ pathname: '/mitzvah/[id]', params: { id: mitzvah.id } })}
                item={{
                  id: mitzvah.id,
                  name: nameFor(mitzvah),
                  summary,
                  percent: stat.eligible === 0 ? null : stat.percent,
                  streak: data.live.mitzvahRuns[mitzvah.id]?.days ?? 0,
                  lateText: lateCount
                    ? t(lateCount === 1 ? 'history.perMitzvah.late.once' : 'history.perMitzvah.late', {
                        count: lateCount,
                      })
                    : null,
                }}
              />
            );
          })}
          {!rows.length ? (
            <Text style={[typography.body, styles.emptyText, { color: colors.textMuted }]}>{t('history.empty')}</Text>
          ) : null}
        </Card>
        {leader ? (
          <Reveal>
            <Insight text={t('history.insight.leader', { name: nameForId(leader.id), percent: leader.percent })} />
          </Reveal>
        ) : null}
      </>
    );
  };

  const renderTrends = (data: ViewModel) => {
    const { weeks, weekdays, trends } = data;
    const allEmpty = weeks.every((w) => w.percent === null);
    const finished = weeks.filter((w) => !w.current && w.percent !== null);
    const best = finished.reduce<WeekPoint | null>(
      (top, w) => (top === null || (w.percent ?? 0) >= (top.percent ?? 0) ? w : top),
      null,
    );
    const defaultWeek = best ?? weeks[weeks.length - 1];
    const chosen = weeks.find((w) => w.weekEnd === selectedWeek && w.percent !== null) ?? defaultWeek;
    const weekTitle = (w: WeekPoint) => (w.current ? t('history.week.current') : weekTitleOf(w.name));
    const insightOfWeeks = weeksInsight(weeks);
    const weeksText = !insightOfWeeks
      ? null
      : insightOfWeeks.kind === 'bestLast'
        ? t('history.insight.weeksBest', { percent: insightOfWeeks.percent, name: insightOfWeeks.name[language] })
        : insightOfWeeks.kind === 'run'
          ? t('history.insight.weeksRun', { count: insightOfWeeks.weeks })
          : insightOfWeeks.kind === 'rising'
            ? t('history.insight.weeksRising', { percent: insightOfWeeks.percent, delta: insightOfWeeks.delta })
            : t('history.insight.weeksAverage', { percent: insightOfWeeks.percent });

    const strongest = weekdays.days.reduce<(typeof weekdays.days)[number] | null>(
      (top, d) => (d.percent !== null && (top === null || d.percent > (top.percent ?? 0)) ? d : top),
      null,
    );
    const selectedDay = selectedWeekday ?? (strongest ? String(strongest.weekday) : '0');
    const holySelected = selectedDay === 'holy';
    const chosenDay = weekdays.days.find((d) => String(d.weekday) === selectedDay) ?? weekdays.days[0];
    const dayInsight = weekdayInsight(weekdays);
    const dayInsightText = !dayInsight
      ? null
      : dayInsight.kind === 'strong'
        ? t('history.insight.weekdayStrong', { day: weekdayName(dayInsight.weekday), percent: dayInsight.percent })
        : t('history.insight.weekdayBalanced', { min: dayInsight.min, max: dayInsight.max });

    const tInsight = trendInsight(trends);
    const trendText = !tInsight
      ? null
      : tInsight.kind === 'rise'
        ? t('history.insight.trendRise', {
            name: nameForId(tInsight.id),
            delta: tInsight.delta,
            percent: tInsight.percent,
          })
        : tInsight.kind === 'steady'
          ? t('history.insight.trendSteady', { name: nameForId(tInsight.id), percent: tInsight.percent })
          : t('history.insight.trendAverage', { percent: tInsight.percent });

    const reportable = weeks.filter((w) => !w.current && w.due > 0).reverse();
    const recent = reportable.slice(0, REPORTS_RECENT);
    const older = reportable.slice(REPORTS_RECENT);
    const currentWeek = weeks[weeks.length - 1];
    const openReport = (weekEnd: string) => router.push({ pathname: '/report', params: { week: weekEnd } });
    const rangeOf = (w: WeekPoint) => civilRangeLabel(w.weekStart, w.weekEnd, false);
    const lateMax = Math.max(1, ...weeks.map((w) => w.late));
    const mostLate = weeks.reduce<WeekPoint | null>(
      (top, w) => (!w.current && w.due > 0 && w.late > 0 && (top === null || w.late >= top.late) ? w : top),
      null,
    );
    const chosenLate =
      weeks.find((w) => w.weekEnd === selectedLateWeek && w.due > 0) ?? mostLate ?? weeks[weeks.length - 1];
    const lateInsight = lateWeeksInsight(weeks);
    const lateText = !lateInsight
      ? null
      : lateInsight.kind === 'none'
        ? t('history.insight.lateNone')
        : lateInsight.kind === 'falling'
          ? t('history.insight.lateFalling', { recent: lateInsight.recent, before: lateInsight.before })
          : lateInsight.kind === 'rising'
            ? t('history.insight.lateRising', { recent: lateInsight.recent, before: lateInsight.before })
            : t(lateInsight.count === 1 ? 'history.insight.lateTotal.once' : 'history.insight.lateTotal', {
                count: lateInsight.count,
              });

    return (
      <>
        {allEmpty ? (
          <Text style={[typography.body, styles.emptyText, { color: colors.textMuted }]}>
            {t('history.trends.empty')}
          </Text>
        ) : (
          <>
            <SectionLabel text={t('history.weeks.title')} />
            <Text style={[typography.small, styles.sectionHint, { color: colors.textSub }]}>
              {t('history.weeks.hint')}
            </Text>
            <Card padded>
              <View style={styles.weekChart}>
                <View style={[styles.gridLine, { top: 0, backgroundColor: colors.border }]} />
                <View style={[styles.gridLine, { top: WEEK_CHART_HEIGHT / 2, backgroundColor: colors.border }]} />
                <View style={[styles.gridLine, { bottom: 0, backgroundColor: colors.border }]} />
                {weeks.map((w, i) => (
                  <WeekBar
                    key={w.weekEnd}
                    week={w}
                    title={weekTitle(w)}
                    index={i}
                    selected={w.weekEnd === chosen.weekEnd}
                    labelled={w.weekEnd === chosen.weekEnd || (w.current && weeks.indexOf(chosen) < weeks.length - 2)}
                    onSelect={() => setSelectedWeek(w.weekEnd)}
                  />
                ))}
                <Text style={[typography.micro, styles.axisTop, { color: colors.textSub }]}>100%</Text>
                <Text style={[typography.micro, styles.axisMid, { color: colors.textSub }]}>50%</Text>
              </View>
              <View style={styles.axisRow}>
                <Text style={[typography.small, { color: colors.textSub }]}>{weeks[0].name[language]}</Text>
                <Text style={[typography.small, { color: colors.goldText }]}>{t('history.weeks.nowLabel')}</Text>
              </View>
              <SelectionDetail
                id={chosen.weekEnd}
                title={
                  chosen.current
                    ? t('history.week.currentWithName', { title: weekTitleOf(chosen.name) })
                    : weekTitleOf(chosen.name)
                }
                caption={`${t('history.weeks.detail', { range: rangeOf(chosen), done: chosen.done, due: chosen.due })}${
                  best && chosen.weekEnd === best.weekEnd ? ` ${t('history.weeks.best')}` : ''
                }`}
                percent={chosen.percent}
              />
            </Card>
            {weeksText ? (
              <Reveal>
                <Insight text={weeksText} />
              </Reveal>
            ) : null}

            <SectionLabel text={t('history.lateWeeks.title')} />
            <Text style={[typography.small, styles.sectionHint, { color: colors.textSub }]}>
              {t('history.lateWeeks.hint')}
            </Text>
            <Card padded>
              <View testID="history-late-chart" style={styles.weekChart}>
                <View style={[styles.gridLine, { top: 0, backgroundColor: colors.border }]} />
                <View style={[styles.gridLine, { top: WEEK_CHART_HEIGHT / 2, backgroundColor: colors.border }]} />
                <View style={[styles.gridLine, { bottom: 0, backgroundColor: colors.border }]} />
                {weeks.map((w, i) => (
                  <WeekBar
                    key={w.weekEnd}
                    week={w}
                    title={weekTitle(w)}
                    index={i}
                    metric="late"
                    max={lateMax}
                    selected={w.weekEnd === chosenLate.weekEnd}
                    labelled={w.weekEnd === chosenLate.weekEnd}
                    onSelect={() => setSelectedLateWeek(w.weekEnd)}
                  />
                ))}
                <Text style={[typography.micro, styles.axisTop, { color: colors.textSub }]}>{String(lateMax)}</Text>
              </View>
              <View style={styles.axisRow}>
                <Text style={[typography.small, { color: colors.textSub }]}>{weeks[0].name[language]}</Text>
                <Text style={[typography.small, { color: colors.goldText }]}>{t('history.weeks.nowLabel')}</Text>
              </View>
              <SelectionDetail
                id={`late-${chosenLate.weekEnd}`}
                title={
                  chosenLate.current
                    ? t('history.week.currentWithName', { title: weekTitleOf(chosenLate.name) })
                    : weekTitleOf(chosenLate.name)
                }
                caption={t('history.lateWeeks.detail', {
                  range: rangeOf(chosenLate),
                  late: chosenLate.late,
                  done: chosenLate.done,
                })}
                percent={null}
                value={String(chosenLate.late)}
              />
            </Card>
            {lateText ? (
              <Reveal>
                <Insight text={lateText} />
              </Reveal>
            ) : null}

            <SectionLabel text={t('history.weekday.title')} />
            <Card padded>
              <View style={styles.weekdayList}>
                {weekdays.days.map((d, i) => (
                  <WeekdayRow
                    key={d.weekday}
                    testID={`history-weekday-${d.weekday}`}
                    name={weekdayName(d.weekday)}
                    percent={d.percent}
                    index={i}
                    selected={String(d.weekday) === selectedDay}
                    highlighted={String(d.weekday) === selectedDay || strongest?.weekday === d.weekday}
                    holy={false}
                    onSelect={() => setSelectedWeekday(String(d.weekday))}
                  />
                ))}
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <WeekdayRow
                  testID="history-weekday-holy"
                  name={t('history.weekday.holy')}
                  percent={weekdays.holy.percent}
                  index={weekdays.days.length}
                  selected={holySelected}
                  highlighted={holySelected}
                  holy
                  onSelect={() => setSelectedWeekday('holy')}
                />
                <Text style={[typography.small, { color: colors.textSub }]}>{t('history.weekday.holyNote')}</Text>
                <SelectionDetail
                  id={selectedDay}
                  title={holySelected ? t('history.weekday.holyDetail') : weekdayName(chosenDay.weekday)}
                  caption={t('history.weekday.detail', {
                    done: holySelected ? weekdays.holy.done : chosenDay.done,
                    due: holySelected ? weekdays.holy.due : chosenDay.due,
                  })}
                  percent={holySelected ? weekdays.holy.percent : chosenDay.percent}
                />
              </View>
            </Card>
            {dayInsightText ? (
              <Reveal>
                <Insight text={dayInsightText} />
              </Reveal>
            ) : null}
          </>
        )}

        <SectionLabel text={t('history.trend.title')} />
        <Text style={[typography.small, styles.sectionHint, { color: colors.textSub }]}>{t('history.trend.hint')}</Text>
        <Card divided>
          {trends.map((trend, i) => {
            const name = nameForId(trend.id);
            return (
              <View
                key={trend.id}
                testID={`history-trend-${trend.id}`}
                style={styles.statRow}
                accessible
                accessibilityLabel={
                  trend.previous
                    ? t('history.trend.rowLabel', {
                        name,
                        previous: trend.previous.percent,
                        percent: trend.current.percent,
                      })
                    : t('history.trend.rowLabelNew', { name, percent: trend.current.percent })
                }
              >
                <View style={styles.statTop}>
                  <Text style={[typography.bodyBold, styles.flex, { color: colors.text }]} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSub }]}>
                    {trend.previous ? `${trend.previous.percent}%` : t('history.percentNone')}
                  </Text>
                  <MitzvahIcon name={forwardIcon(language)} size={scaled(12)} color={colors.textSub} />
                  <Text
                    style={[typography.captionBold, { color: colors.goldText }]}
                  >{`${trend.current.percent}%`}</Text>
                </View>
                <ProgressBar
                  percent={trend.current.percent}
                  tick={trend.previous?.percent ?? null}
                  delay={i * motion.rowBarStagger}
                />
              </View>
            );
          })}
        </Card>
        {trendText ? (
          <Reveal>
            <Insight text={trendText} />
          </Reveal>
        ) : null}

        <SectionLabel text={t('history.reports.title')} />
        <Card divided>
          <View
            testID={`history-report-${currentWeek.weekEnd}`}
            style={styles.reportRow}
            accessible
            accessibilityLabel={`${
              currentWeek.percent === null
                ? t('history.week.current')
                : t('history.reports.rowLabel', { title: t('history.week.current'), percent: currentWeek.percent })
            }, ${t('history.reports.closesAfterShabbat')}`}
          >
            <View style={styles.flex}>
              <Text style={[typography.bodyBold, { color: colors.text }]}>{t('history.week.current')}</Text>
              <Text style={[typography.caption, { color: colors.textSub }]}>
                {t('history.reports.captionCurrent', {
                  title: weekTitleOf(currentWeek.name),
                  range: rangeOf(currentWeek),
                  done: currentWeek.done,
                  due: currentWeek.due,
                })}
              </Text>
              <Text style={[typography.small, { color: colors.goldText }]}>
                {t('history.reports.closesAfterShabbat')}
              </Text>
            </View>
            <View style={styles.reportMeter}>
              <Text style={[typography.captionBold, { color: colors.goldText }]}>
                {currentWeek.percent === null ? t('history.percentNone') : `${currentWeek.percent}%`}
              </Text>
              <View style={{ width: MINI_BAR_WIDTH }}>
                <ProgressBar percent={currentWeek.percent ?? 0} />
              </View>
            </View>
          </View>
          {recent.map((w, i) => (
            <PressableScale
              key={w.weekEnd}
              testID={`history-report-${w.weekEnd}`}
              accessibilityLabel={t('history.reports.rowLabel', {
                title: weekTitleOf(w.name),
                percent: w.percent ?? 0,
              })}
              onPress={() => openReport(w.weekEnd)}
              style={styles.reportRow}
            >
              <View style={styles.flex}>
                <Text style={[typography.bodyBold, { color: colors.text }]}>{weekTitleOf(w.name)}</Text>
                <Text style={[typography.caption, { color: colors.textSub }]}>
                  {t('history.reports.caption', { range: rangeOf(w), done: w.done, due: w.due })}
                </Text>
              </View>
              <View style={styles.reportMeter}>
                <Text style={[typography.captionBold, { color: colors.goldText }]}>{`${w.percent ?? 0}%`}</Text>
                <View style={{ width: MINI_BAR_WIDTH }}>
                  <ProgressBar percent={w.percent ?? 0} delay={i * motion.rowBarStagger} />
                </View>
              </View>
              <MitzvahIcon name={forwardIcon(language)} size={CHEVRON} color={colors.textMuted} strokeWidth={2.5} />
            </PressableScale>
          ))}
          {older.length ? (
            <View testID="history-report-older">
              <ListRow
                icon="calendar"
                iconTone="muted"
                title={t('history.reports.older')}
                caption={t('history.reports.olderCaption', { title: weekTitleOf(older[0].name) })}
                chevron
                onPress={() => openReport(older[0].weekEnd)}
              />
            </View>
          ) : null}
        </Card>
      </>
    );
  };

  const renderAchievements = (data: ViewModel) => {
    const earned = earnedBadgeList(data.achievements).map(({ id, on }) => ({ ...badgeInfo(id), on }));
    const upcoming = nextBadges(
      data.achievements,
      data.totals,
      data.stats.streak,
      enabled.map((m) => m.id),
    );
    const tileRows = Array.from({ length: Math.ceil(earned.length / BADGES_PER_ROW) }, (_, r) =>
      earned.slice(r * BADGES_PER_ROW, r * BADGES_PER_ROW + BADGES_PER_ROW),
    );
    const bestStreak = data.achievements?.bestStreak ?? null;
    const run = data.live.run;
    const longest =
      run.days > (bestStreak?.days ?? 0) && run.from && run.to
        ? { days: run.days, from: run.from, to: run.to }
        : bestStreak;
    const bestWeek = data.achievements?.bestWeek ?? null;
    const records = enabled
      .map((mitzvah) => ({
        mitzvah,
        best: Math.max(
          data.achievements?.mitzvahBest[mitzvah.id]?.days ?? 0,
          data.live.mitzvahRuns[mitzvah.id]?.days ?? 0,
        ),
        now: data.live.mitzvahRuns[mitzvah.id]?.days ?? 0,
      }))
      .filter((record) => record.best > 0)
      .sort((a, b) => b.best - a.best);
    const daysText = (count: number) =>
      t(count === 1 ? 'history.records.days.once' : 'history.records.days', { count });
    return (
      <>
        <SectionLabel text={t('history.badges.earned')} count={earned.length} />
        {earned.length ? (
          <View style={styles.badgeGrid}>
            {tileRows.map((row, r) => (
              <View key={r} style={styles.badgeRow}>
                {row.map((info, i) => (
                  <EarnedTile key={info.id} badge={info} takeSlot={takeSlot} onPress={() => setBadge(info)} />
                ))}
                {Array.from({ length: BADGES_PER_ROW - row.length }, (_, k) => (
                  <View key={`pad-${k}`} style={styles.flex} />
                ))}
              </View>
            ))}
          </View>
        ) : (
          <Text style={[typography.body, styles.emptyText, { color: colors.textMuted }]}>
            {t('history.badges.none')}
          </Text>
        )}

        <SectionLabel text={t('history.badges.next')} />
        <Card divided>
          {upcoming.map((item, i) => {
            const info = {
              ...badgeInfo(item.id),
              done: item.done,
              goal: item.goal,
              left: leftText(item.id, item.goal - item.done),
            };
            return (
              <PressableScale
                key={item.id}
                testID={`history-next-${item.id}`}
                onPress={() => setBadge(info)}
                accessibilityLabel={t('history.badges.nextLabel', { title: info.title, left: info.left })}
                style={styles.nextRow}
              >
                <IconTile name={info.icon} tone="muted" />
                <View style={[styles.flex, styles.nextText]}>
                  <View style={styles.statTop}>
                    <Text style={[typography.bodyBold, styles.flex, { color: colors.text }]}>{info.title}</Text>
                    <Text style={[typography.caption, { color: colors.textSub }]}>{info.left}</Text>
                  </View>
                  <ProgressBar
                    percent={Math.round((item.done / item.goal) * 100)}
                    delay={earned.length * motion.badgeStagger + i * motion.rowBarStagger}
                  />
                  <Text style={[typography.small, { color: colors.textSub }]}>
                    {t('history.badges.progress', { done: formatCount(item.done), goal: formatCount(item.goal) })}
                  </Text>
                </View>
              </PressableScale>
            );
          })}
        </Card>

        <SectionLabel text={t('history.records.title')} />
        <Card divided>
          {longest ? (
            <View testID="history-record-streak">
              <ListRow
                icon="star"
                title={t(longest.days === 1 ? 'history.streak.once' : 'history.streak', { count: longest.days })}
                caption={t('history.records.streakCaption', {
                  from: hebrewDayLabel(longest.from, language, false),
                  to: hebrewDayLabel(longest.to, language, false),
                })}
              />
            </View>
          ) : null}
          {bestWeek ? (
            <View testID="history-record-week">
              <ListRow
                icon="calendar"
                title={t('history.records.weekTitle', { percent: bestWeek.percent })}
                caption={t('history.records.weekCaption', {
                  title: weekTitleOf(weekName(shabbatOf(new Date(`${bestWeek.weekEnd}T12:00:00`)), location)),
                  range: hebrewRangeLabel(bestWeek.weekStart, bestWeek.weekEnd, language),
                })}
              />
            </View>
          ) : null}
          {!longest && !bestWeek ? (
            <Text style={[typography.body, styles.emptyText, { color: colors.textMuted }]}>
              {t('history.records.none')}
            </Text>
          ) : null}
        </Card>

        {records.length ? (
          <>
            <SectionLabel text={t('history.records.perMitzvah')} />
            <Card divided>
              {records.map(({ mitzvah, best, now: current }) => (
                <View
                  key={mitzvah.id}
                  testID={`history-record-${mitzvah.id}`}
                  style={styles.recordRow}
                  accessible
                  accessibilityLabel={t('history.records.rowLabel', {
                    name: nameFor(mitzvah),
                    best: daysText(best),
                    now: t('history.records.now', { count: current }),
                  })}
                >
                  <MitzvahIcon name={iconFor(mitzvah.icon)} size={scaled(20)} color={colors.goldText} />
                  <Text style={[typography.body, styles.flex, { color: colors.text }]} numberOfLines={1}>
                    {nameFor(mitzvah)}
                  </Text>
                  <Text style={[typography.small, { color: colors.textSub }]}>
                    {t('history.records.now', { count: current })}
                  </Text>
                  <Text style={[typography.bodyBold, styles.recordValue, { color: colors.goldText }]}>
                    {daysText(best)}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}
      </>
    );
  };

  const tabOptions = [
    { value: 'summary' as const, label: t('history.tab.summary') },
    { value: 'trends' as const, label: t('history.tab.trends') },
    { value: 'achievements' as const, label: t('history.tab.achievements') },
  ];

  return (
    <ViewportContext.Provider value={viewport.bus}>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.flex}>
          <ScrollView
            ref={scrollRef}
            testID="history-scroll"
            contentContainerStyle={styles.content}
            onScroll={onScroll}
            onContentSizeChange={viewport.notify}
            scrollEventThrottle={16}
          >
            <View style={styles.hero}>
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Landscape height={HERO_HEIGHT} />
              </View>
              <View style={styles.heroTop}>
                <NavBar title={greeting} subtitle={dateLine} />
              </View>
              <StreakRing key={`ring-${playKey}-${model !== null}`} streak={stats.streak} size={RING_SIZE} animate />
              {model ? (
                <Text style={[typography.subheading, styles.center, { color: colors.text }]}>{goalCaption}</Text>
              ) : null}
              <Text style={[typography.small, styles.center, styles.explain, { color: colors.textSub }]}>
                {t('history.streakExplain')}
              </Text>
            </View>

            <View
              accessibilityRole="radiogroup"
              accessibilityLabel={t('history.tabs')}
              accessibilityElementsHidden={tabsPinned}
              importantForAccessibility={tabsPinned ? 'no-hide-descendants' : 'auto'}
              style={[styles.tabs, { backgroundColor: colors.bg }]}
            >
              <SegmentedControl animated options={tabOptions} value={tab} onChange={changeTab} />
            </View>

            <View style={[styles.body, { minHeight: Dimensions.get('window').height }]}>
              {model && month ? (
                <SlideIn key={`${tab}-${playKey}`} enterFrom={enterFrom}>
                  {tab === 'summary' ? renderSummary(model, month) : null}
                  {tab === 'trends' ? renderTrends(model) : null}
                  {tab === 'achievements' ? renderAchievements(model) : null}
                </SlideIn>
              ) : null}
            </View>
          </ScrollView>
          {tabsPinned ? (
            <View
              testID="history-tabs-pinned"
              accessibilityRole="radiogroup"
              accessibilityLabel={t('history.tabs')}
              style={[styles.tabs, styles.tabsPinned, { backgroundColor: colors.bg }]}
            >
              <SegmentedControl animated options={tabOptions} value={tab} onChange={changeTab} />
            </View>
          ) : null}
        </View>
        <BadgeSheet badge={badge} onClose={() => setBadge(null)} />
        <DaySheet
          day={openDay}
          onClose={() => setOpenDay(null)}
          onFullDay={(key) => {
            setOpenDay(null);
            router.push({ pathname: '/day/[date]', params: { date: key } });
          }}
          onOpenMitzvah={(id) => {
            setOpenDay(null);
            router.push({ pathname: '/mitzvah/[id]', params: { id } });
          }}
        />
      </SafeAreaView>
    </ViewportContext.Provider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingBottom: spacing.xxxl },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  hero: { height: HERO_HEIGHT, alignItems: 'center' },
  heroTop: { alignSelf: 'stretch' },
  explain: { marginTop: spacing.xs, paddingHorizontal: spacing.xxl },
  tabs: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  tabsPinned: { position: 'absolute', top: 0, start: 0, end: 0, zIndex: 1 },
  body: { paddingHorizontal: spacing.lg },
  periodRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.md },
  period: { flex: 1, alignItems: 'center', gap: spacing.xs },
  periodHint: { marginTop: spacing.md, marginBottom: spacing.lg, paddingHorizontal: spacing.lg },
  insight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  insightText: { flex: 1 },
  emptyText: { padding: spacing.lg },
  sectionHint: { paddingHorizontal: spacing.xs, marginBottom: spacing.sm },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  calTitle: { alignItems: 'center' },
  calWeekdays: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.xs },
  calWeekday: { flex: 1, textAlign: 'center' },
  calGrid: { gap: spacing.xs },
  calRow: { flexDirection: 'row', gap: spacing.xs },
  calCell: {
    height: CAL_CELL_HEIGHT,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayRing: { ...StyleSheet.absoluteFillObject, borderWidth: 1.5, borderRadius: radius.md },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: scaled(10), height: scaled(10), borderRadius: radius.full },
  legendSteps: { flexDirection: 'row' },
  legendStep: { width: scaled(7), height: scaled(10) },
  legendDashed: { borderWidth: 1, borderStyle: 'dashed' },
  daySheet: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.xs },
  holyStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginBottom: spacing.xs,
  },
  dayList: { marginVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  dayEmpty: { paddingVertical: spacing.md },
  dayItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  dayState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaled(3),
    paddingHorizontal: spacing.sm,
    paddingVertical: scaled(2),
    borderRadius: radius.full,
  },
  statRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  statInner: { gap: spacing.sm },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaled(3),
    paddingHorizontal: spacing.sm,
    paddingVertical: scaled(2),
    borderRadius: radius.full,
  },
  percent: { minWidth: PERCENT_MIN_WIDTH },
  weekChart: {
    height: WEEK_CHART_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    paddingEnd: AXIS_GUTTER,
    marginTop: spacing.lg,
  },
  gridLine: { position: 'absolute', start: 0, end: AXIS_GUTTER, height: StyleSheet.hairlineWidth },
  axisTop: { position: 'absolute', end: 0, top: -scaled(7) },
  axisMid: { position: 'absolute', end: 0, top: WEEK_CHART_HEIGHT / 2 - scaled(7) },
  weekLabelSlot: { width: 0, alignSelf: 'center', alignItems: 'center' },
  weekLabel: { width: scaled(48), textAlign: 'center' },
  weekColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: scaled(2) },
  weekBar: {
    alignSelf: 'stretch',
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    transformOrigin: 'bottom',
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingEnd: AXIS_GUTTER,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  weekdayList: { gap: spacing.sm },
  weekdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    marginHorizontal: -spacing.xs,
    borderRadius: radius.sm,
  },
  weekdayName: { width: WEEKDAY_NAME_WIDTH },
  divider: { height: StyleSheet.hairlineWidth },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  reportMeter: { alignItems: 'flex-end', gap: spacing.xs },
  badgeGrid: { gap: spacing.sm },
  badgeRow: { flexDirection: 'row', gap: spacing.sm },
  badgeInner: { alignItems: 'center', gap: spacing.xs },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  nextText: { gap: spacing.xs },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  recordValue: { minWidth: RECORD_VALUE_WIDTH },
  sheetBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
