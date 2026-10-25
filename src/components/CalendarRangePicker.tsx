import React, { useMemo, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { DateTime } from 'luxon';
import { HebcalService } from '@/services/HebcalService';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { formatDate, useI18n } from '@/i18n';
import { formatDayLine } from './DayStepper';
import { backIcon, forwardIcon } from './MitzvahIcon';
import { HeaderPill } from './ScreenHeader';

export type DateRange = { start: string | null; end: string | null };

export const RANGE_MAX_YEARS = 2;

const WEEKS = 6;
const TODAY_RING = 2;
const DISABLED_OPACITY = 0.5;

type Cell = { key: string; inMonth: boolean; day: number; hebrewDay: number; date: Date };

export function rangeMaxKey(todayKey: string): string {
  return DateTime.fromISO(todayKey).plus({ years: RANGE_MAX_YEARS }).toISODate() ?? todayKey;
}

export function nextRange(value: DateRange, day: string): DateRange {
  if (value.start === null || value.end !== null || day < value.start) return { start: day, end: null };
  return { start: value.start, end: day };
}

const shiftMonth = (month: string, months: number) =>
  DateTime.fromISO(`${month}-01`).plus({ months }).toISODate()?.slice(0, 7) ?? month;

function monthWeeks(month: string): Cell[][] {
  const first = DateTime.fromISO(`${month}-01`);
  const gridStart = first.minus({ days: first.weekday % 7 });
  const cells = Array.from({ length: WEEKS * 7 }, (_, index): Cell => {
    const day = gridStart.plus({ days: index });
    return {
      key: day.toISODate() ?? String(index),
      inMonth: day.month === first.month,
      day: day.day,
      hebrewDay: HebcalService.getHebrewDate(day.toJSDate()).day,
      date: day.toJSDate(),
    };
  });
  return Array.from({ length: WEEKS }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

type Props = {
  value: DateRange;
  todayKey: string;
  onChange: (next: DateRange) => void;
  style?: StyleProp<ViewStyle>;
};

export function CalendarRangePicker({ value, todayKey, onChange, style }: Props) {
  const { colors } = useTheme();
  const { language, t } = useI18n();
  const maxKey = rangeMaxKey(todayKey);
  const firstMonth = todayKey.slice(0, 7);
  const lastMonth = maxKey.slice(0, 7);
  const [cursor, setCursor] = useState(() => {
    const month = value.start && value.start > todayKey ? value.start.slice(0, 7) : firstMonth;
    return month < firstMonth ? firstMonth : month > lastMonth ? lastMonth : month;
  });
  const weeks = useMemo(() => monthWeeks(cursor), [cursor]);
  const monthLabel = (month: string) => formatDate(DateTime.fromISO(`${month}-01`), 'LLLL yyyy', language);

  return (
    <View style={style}>
      <View style={styles.monthBand}>
        <HeaderPill
          icon={backIcon(language)}
          onPress={() => setCursor(shiftMonth(cursor, -1))}
          accessibilityLabel={monthLabel(shiftMonth(cursor, -1))}
          disabled={cursor <= firstMonth}
        />
        <Text style={[typography.captionBold, { color: colors.text }]}>{monthLabel(cursor)}</Text>
        <HeaderPill
          icon={forwardIcon(language)}
          onPress={() => setCursor(shiftMonth(cursor, 1))}
          accessibilityLabel={monthLabel(shiftMonth(cursor, 1))}
          disabled={cursor >= lastMonth}
        />
      </View>
      <View style={styles.weekRow}>
        {Array.from({ length: 7 }, (_, index) => (
          <Text key={index} style={[typography.micro, styles.headerCell, { color: colors.textMuted }]}>
            {t(`weekday.short.${index}`)}
          </Text>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0].key} style={styles.weekRow}>
          {week.map((cell) => {
            if (!cell.inMonth) return <View key={cell.key} style={styles.cell} />;
            const disabled = cell.key < todayKey || cell.key > maxKey;
            const endpoint = cell.key === value.start || cell.key === value.end;
            const inRange =
              endpoint ||
              (value.start !== null && value.end !== null && cell.key > value.start && cell.key < value.end);
            return (
              <Pressable
                key={cell.key}
                testID={`calendar-day-${cell.key}`}
                onPress={() => onChange(nextRange(value, cell.key))}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={formatDayLine(cell.date, language)}
                accessibilityState={{ disabled, selected: inRange }}
                style={[
                  styles.cell,
                  {
                    backgroundColor: endpoint ? colors.gold : inRange ? colors.goldWashStrong : 'transparent',
                    borderColor: colors.goldText,
                    borderWidth: cell.key === todayKey ? TODAY_RING : 0,
                    opacity: disabled ? DISABLED_OPACITY : 1,
                  },
                ]}
              >
                <Text style={[typography.captionBold, { color: endpoint ? colors.onGold : colors.text }]}>
                  {String(cell.day)}
                </Text>
                <Text style={[typography.micro, { color: endpoint ? colors.onGold : colors.textSub }]}>
                  {String(cell.hebrewDay)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  monthBand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  weekRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  headerCell: {
    flex: 1,
    textAlign: 'center',
  },
  cell: {
    flex: 1,
    aspectRatio: 0.85,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
