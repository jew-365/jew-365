import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useI18n } from '@/i18n';
import type { HomeLook } from '@/stores/useUserStore';
import { useTheme } from '@/theme/ThemeProvider';
import { LATE_BADGE, doneTone, missedTone, type ThemeColors } from '@/theme/colors';
import { scaled } from '@/theme/scale';
import { radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import {
  dayRingCounts,
  miniRingFraction,
  railNowIndex,
  timeOrderDayEntries,
  ringDashOffset,
  type DayEntry,
  type DayEntryStatus,
} from '@/utils/homeDay';
import { Button } from './Button';
import { Card } from './Card';
import { IconTile } from './IconTile';
import { MitzvahIcon, type IconName } from './MitzvahIcon';
import { Reveal } from './Reveal';

export type DayLookEntry = DayEntry & {
  name: string;
  icon: IconName;
  statusText: string;
  range: string | null;
  startLabel: string | null;
  endLabel: string | null;
};

type Props = {
  look: HomeLook;
  entries: readonly DayLookEntry[];
  now: Date;
  nowLabel: string;
  playKey: number;
  onPress: (e: DayLookEntry) => void;
  onLongPress: (e: DayLookEntry) => void;
  onMark: (e: DayLookEntry) => void;
  onUndo: (e: DayLookEntry) => void;
};

const FIGURE_SIZE = scaled(132);
const MINI_RING_SIZE = scaled(64);
const MINI_ICON_SIZE = scaled(24);
const CARD_TILE_SIZE = scaled(40);
const TIME_COLUMN = scaled(42);
const NODE_COLUMN = scaled(22);
const NODE_SIZE = scaled(16);
const NODE_CHECK_SIZE = scaled(10);
const NOW_DOT_SIZE = scaled(12);
const LEGEND_DOT_SIZE = scaled(10);
const RING_STROKE = 9;
const MINI_RING_LENGTH = 163.36;
const REVEAL_STEP = 30;
const REVEAL_DURATION = 260;
const REVEAL_SHIFT = 25;
const BADGE_PADDING_V = scaled(2);

type Tones = {
  missed: ReturnType<typeof missedTone>;
  done: ReturnType<typeof doneTone>;
};

// A late mark looks done; only its orange label tells it apart (the owner's call, 2026-10-30).
const looksDone = (status: DayEntryStatus) => status === 'done' || status === 'late';

function cardFill(status: DayEntryStatus, colors: ThemeColors, tones: Tones): string {
  if (status === 'active') return colors.goldLight;
  if (looksDone(status)) return tones.done.fill;
  if (status === 'missed') return tones.missed.fill;
  return colors.surface;
}

function statusInk(status: DayEntryStatus, colors: ThemeColors, tones: Tones): string {
  if (status === 'active') return colors.goldText;
  if (looksDone(status)) return tones.done.ink;
  if (status === 'missed') return tones.missed.ink;
  return colors.textSub;
}

function chunk<T>(list: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < list.length; i += size) rows.push(list.slice(i, i + size));
  return rows;
}

export const DayLooks = React.memo(function DayLooks({
  look,
  entries,
  now,
  nowLabel,
  playKey,
  onPress,
  onLongPress,
  onMark,
  onUndo,
}: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const tones: Tones = { missed: missedTone(colors), done: doneTone(colors) };
  const lateLabel = t('home.day.lateBadge');

  const renderAction = (e: DayLookEntry) => {
    if (e.status === 'missed') {
      return (
        <Button
          size="compact"
          variant="secondary"
          icon="check"
          label={t('notifications.markDone')}
          accessibilityLabel={t('state.completeAction', { name: e.name })}
          onPress={() => onMark(e)}
          style={styles.action}
        />
      );
    }
    if (looksDone(e.status) || e.status === 'skipped') {
      return (
        <Button
          size="compact"
          variant="secondary"
          icon="undo"
          label={t('home.undo')}
          accessibilityLabel={t('home.day.undoLabel', { name: e.name })}
          onPress={() => onUndo(e)}
          style={styles.action}
        />
      );
    }
    return null;
  };

  const renderBody = (e: DayLookEntry, content: React.ReactNode) => (
    <Pressable
      onPress={() => onPress(e)}
      onLongPress={() => onLongPress(e)}
      accessibilityRole="button"
      accessibilityLabel={[e.name, e.statusText, e.status === 'late' ? lateLabel : null].filter(Boolean).join(', ')}
      accessibilityActions={[{ name: 'longpress', label: t('home.quick.title') }]}
      onAccessibilityAction={() => onLongPress(e)}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      {content}
    </Pressable>
  );

  const renderCard = (e: DayLookEntry, content: React.ReactNode) => (
    <View testID={`home-day-${e.id}`}>
      <Card
        padded
        style={{
          backgroundColor: cardFill(e.status, colors, tones),
          opacity: e.status === 'upcoming' || e.status === 'skipped' ? 0.85 : 1,
        }}
      >
        {renderBody(e, content)}
        {renderAction(e)}
      </Card>
    </View>
  );

  const statusLine = (e: DayLookEntry, centered: boolean) => (
    <>
      <Text
        style={[typography.captionBold, { color: statusInk(e.status, colors, tones) }, centered && styles.centerText]}
      >
        {e.statusText}
      </Text>
      {e.status === 'late' ? (
        <View testID={`home-day-late-${e.id}`} style={[styles.lateBadge, centered && styles.centerSelf]}>
          <Text style={[typography.captionBold, { color: LATE_BADGE.ink }]}>{lateLabel}</Text>
        </View>
      ) : null}
    </>
  );

  const rangeLine = (e: DayLookEntry, centered: boolean) =>
    e.range ? (
      <Text style={[typography.small, { color: colors.textSub }, centered && styles.centerText]}>{e.range}</Text>
    ) : null;

  const miniRingColor = (status: DayEntryStatus): string => {
    if (status === 'active') return colors.gold;
    if (looksDone(status)) return colors.safe;
    if (status === 'missed') return tones.missed.ring;
    return colors.textMuted;
  };

  const miniIcon = (e: DayLookEntry): { name: IconName; color: string } => {
    if (looksDone(e.status)) return { name: 'check', color: colors.safe };
    if (e.status === 'missed') return { name: 'warning', color: tones.missed.ink };
    if (e.status === 'active') return { name: e.icon, color: colors.goldText };
    return { name: e.icon, color: colors.textMuted };
  };

  const ringCellBody = (e: DayLookEntry) => {
    const fraction = miniRingFraction(e, now);
    const icon = miniIcon(e);
    const upcoming = e.status === 'upcoming';
    return (
      <View style={styles.ringCell}>
        <View style={styles.miniRing}>
          <Svg width={MINI_RING_SIZE} height={MINI_RING_SIZE} viewBox="0 0 64 64">
            <Circle
              cx={32}
              cy={32}
              r={26}
              stroke={upcoming ? colors.textMuted : colors.border}
              strokeWidth={6}
              fill="none"
              strokeDasharray={upcoming ? '3 6' : undefined}
              strokeOpacity={upcoming ? 0.7 : 1}
            />
            {fraction > 0 ? (
              <Circle
                cx={32}
                cy={32}
                r={26}
                stroke={miniRingColor(e.status)}
                strokeWidth={6}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={MINI_RING_LENGTH}
                strokeDashoffset={ringDashOffset(MINI_RING_LENGTH, fraction)}
                transform="rotate(-90 32 32)"
              />
            ) : null}
          </Svg>
          <View style={styles.miniIcon}>
            <MitzvahIcon name={icon.name} size={MINI_ICON_SIZE} color={icon.color} />
          </View>
        </View>
        <Text style={[typography.bodyBold, styles.centerText, { color: colors.text }]} numberOfLines={2}>
          {e.name}
        </Text>
        {statusLine(e, true)}
        {rangeLine(e, true)}
      </View>
    );
  };

  const cardsCellBody = (e: DayLookEntry) => (
    <View>
      <View style={styles.tileRow}>
        <IconTile
          name={e.icon}
          size={CARD_TILE_SIZE}
          tone={e.status === 'active' ? 'accent' : looksDone(e.status) ? 'done' : 'muted'}
        />
        <View style={styles.meta}>
          <Text style={[typography.bodyBold, { color: colors.text }]} numberOfLines={2}>
            {e.name}
          </Text>
          {statusLine(e, false)}
        </View>
      </View>
      {rangeLine(e, false)}
    </View>
  );

  const reveal = (e: DayLookEntry, index: number, child: React.ReactNode) => (
    <Reveal key={e.id} delay={index * REVEAL_STEP} duration={REVEAL_DURATION} shift={REVEAL_SHIFT} playKey={playKey}>
      {child}
    </Reveal>
  );

  const grid = (cell: (e: DayLookEntry) => React.ReactNode) =>
    chunk(entries, 2).map((row, rowIndex) => (
      <View key={row[0].id} style={styles.gridRow}>
        {row.map((e, i) => (
          <View key={e.id} style={styles.gridCell}>
            {reveal(e, rowIndex * 2 + i, renderCard(e, cell(e)))}
          </View>
        ))}
        {row.length === 1 ? <View style={styles.gridCell} /> : null}
      </View>
    ));

  const summary = () => {
    const counts = dayRingCounts(entries);
    const share = (n: number) => (counts.total > 0 ? n / counts.total : 0);
    const rings = [
      { r: 58, n: counts.done, color: colors.safe, legend: 'done' },
      { r: 46, n: counts.open, color: colors.gold, legend: 'open' },
      { r: 34, n: counts.missed, color: tones.missed.ring, legend: 'missed' },
    ] as const;
    return (
      <View testID="home-rings-summary">
        <Card padded style={styles.summary}>
          <View style={styles.summaryRow}>
            <View
              style={styles.figure}
              accessible
              accessibilityRole="image"
              accessibilityLabel={t('home.day.ringsLabel', {
                done: counts.done,
                open: counts.open,
                missed: counts.missed,
                total: counts.total,
              })}
            >
              <Svg width={FIGURE_SIZE} height={FIGURE_SIZE} viewBox="0 0 132 132">
                {rings.map((ring) => {
                  const length = 2 * Math.PI * ring.r;
                  return (
                    <React.Fragment key={ring.legend}>
                      <Circle cx={66} cy={66} r={ring.r} stroke={colors.border} strokeWidth={RING_STROKE} fill="none" />
                      <Circle
                        cx={66}
                        cy={66}
                        r={ring.r}
                        stroke={ring.color}
                        strokeWidth={RING_STROKE}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={length}
                        strokeDashoffset={ringDashOffset(length, share(ring.n))}
                        opacity={ring.n === 0 ? 0 : 1}
                        transform="rotate(-90 66 66)"
                      />
                    </React.Fragment>
                  );
                })}
              </Svg>
              <View style={styles.figureCenter}>
                <Text style={[typography.title, { color: colors.text }]}>{String(counts.done)}</Text>
                <Text style={[typography.small, { color: colors.textSub }]}>
                  {t('home.day.ofTotal', { total: counts.total })}
                </Text>
              </View>
            </View>
            <View style={styles.legend}>
              {rings.map((ring) => (
                <View key={ring.legend} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: ring.color }]} />
                  <Text style={[typography.captionBold, styles.legendLabel, { color: colors.text }]}>
                    {t(`home.day.legend.${ring.legend}`)}
                  </Text>
                  <Text style={[typography.bodyBold, { color: colors.text }]}>{ring.n}</Text>
                </View>
              ))}
            </View>
          </View>
        </Card>
      </View>
    );
  };

  const nodeStyle = (status: DayEntryStatus) => {
    if (status === 'active') return { borderColor: colors.gold, backgroundColor: colors.goldLight };
    if (looksDone(status)) return { borderColor: colors.safe, backgroundColor: colors.safe };
    if (status === 'missed') return { borderColor: tones.missed.ring, backgroundColor: tones.missed.fill };
    if (status === 'upcoming') {
      return { borderColor: colors.textMuted, backgroundColor: colors.bg, borderStyle: 'dashed' as const };
    }
    return { borderColor: colors.textMuted, backgroundColor: colors.bg };
  };

  const railRows = () => {
    const timed = timeOrderDayEntries(entries);
    const nowIndex = railNowIndex(timed, now);
    const rows: React.ReactNode[] = [];
    const nowRow = (
      <View key="rail-now" testID="home-rail-now" style={styles.railRow}>
        <View style={styles.timeColumn} />
        <View style={styles.nodeColumnNow}>
          <View style={[styles.nowDot, { backgroundColor: colors.gold }]} />
        </View>
        <Text style={[typography.captionBold, { color: colors.goldText }]}>
          {t('home.day.now', { time: nowLabel })}
        </Text>
        <View style={[styles.nowLine, { borderColor: colors.gold }]} />
      </View>
    );
    timed.forEach((e, index) => {
      if (nowIndex === index) {
        rows.push(nowRow);
      }
      rows.push(
        reveal(
          e,
          index,
          <View style={styles.railRow}>
            <View style={styles.timeColumn}>
              {e.startLabel ? (
                <Text style={[typography.captionBold, { color: colors.text }]}>{e.startLabel}</Text>
              ) : null}
              {e.endLabel ? <Text style={[typography.small, { color: colors.textSub }]}>{e.endLabel}</Text> : null}
            </View>
            <View style={styles.nodeColumn}>
              <View style={[styles.railLine, { backgroundColor: colors.border }]} />
              <View style={[styles.node, nodeStyle(e.status)]}>
                {looksDone(e.status) ? (
                  <MitzvahIcon name="check" size={NODE_CHECK_SIZE} color={colors.surface} />
                ) : null}
              </View>
            </View>
            <View style={styles.railCard}>{renderCard(e, cardsCellBody(e))}</View>
          </View>,
        ),
      );
    });
    if (nowIndex === timed.length) rows.push(nowRow);
    return rows;
  };

  return (
    <View testID={`home-look-${look}`}>
      {look === 'rings' ? (
        <>
          {summary()}
          {grid(ringCellBody)}
        </>
      ) : null}
      {look === 'cards' ? grid(cardsCellBody) : null}
      {look === 'rail' ? railRows() : null}
    </View>
  );
});

const styles = StyleSheet.create({
  action: { marginTop: spacing.sm },
  centerText: { textAlign: 'center' },
  centerSelf: { alignSelf: 'center' },
  lateBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: BADGE_PADDING_V,
    borderRadius: radius.full,
    backgroundColor: LATE_BADGE.fill,
  },
  summary: { marginBottom: spacing.sm },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  figure: { width: FIGURE_SIZE, height: FIGURE_SIZE, alignItems: 'center', justifyContent: 'center' },
  figureCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  legend: { flex: 1, gap: spacing.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: LEGEND_DOT_SIZE, height: LEGEND_DOT_SIZE, borderRadius: radius.full },
  legendLabel: { flex: 1 },
  gridRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  gridCell: { flex: 1 },
  ringCell: { alignItems: 'center', gap: spacing.xs },
  miniRing: { width: MINI_RING_SIZE, height: MINI_RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  miniIcon: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  tileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { flex: 1, minWidth: 0 },
  railRow: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.xs, marginBottom: spacing.sm },
  timeColumn: { width: TIME_COLUMN, paddingTop: spacing.lg },
  nodeColumn: { width: NODE_COLUMN, alignItems: 'center', paddingTop: spacing.lg },
  nodeColumnNow: { width: NODE_COLUMN, alignItems: 'center', justifyContent: 'center' },
  railLine: { position: 'absolute', width: 2, top: 0, bottom: -spacing.sm },
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railCard: { flex: 1 },
  nowDot: { width: NOW_DOT_SIZE, height: NOW_DOT_SIZE, borderRadius: radius.full },
  nowLine: { flex: 1, alignSelf: 'center', borderTopWidth: 2, borderStyle: 'dashed', opacity: 0.6 },
});
