import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { DateTime } from 'luxon';
import { useShallow } from 'zustand/react/shallow';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatDayLine } from '@/components/DayStepper';
import { IconName, MitzvahIcon, backIcon, forwardIcon } from '@/components/MitzvahIcon';
import { HeaderPill, ScreenHeader } from '@/components/ScreenHeader';
import { useNow } from '@/hooks/useNow';
import { HebcalService } from '@/services/HebcalService';
import { useTaharahStore } from '@/stores/useTaharahStore';
import { useUserStore } from '@/stores/useUserStore';
import { BRAND } from '@/theme/colors';
import { scaled } from '@/theme/scale';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { fontFamilies, typography } from '@/theme/typography';
import { formatDate, useI18n } from '@/i18n';
import { Onah, OnahKind, PerishaOnah, TaharahEvent } from '@/types/taharah';
import { locationNoon } from '@/utils/locationDay';
import { deriveCycle } from '@/utils/taharah/cycle';
import { civilHebrewDayAt } from '@/utils/taharah/onot';
import { eventCellDay, eventDetail } from '@/utils/taharah/summary';
import { perishaOnot } from '@/utils/taharah/vestot';
import { afterPaint } from '@/utils/afterPaint';

type Translate = (scope: string, options?: Record<string, unknown>) => string;

type DayMarks = {
  onsets: OnahKind[];
  cleanIndex: number | null;
  tevila: boolean;
  perisha: PerishaOnah[];
};

type Cell = {
  key: string;
  day: DateTime;
  inMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  abs: number;
  hebrewDay: number;
  marks: DayMarks | undefined;
};

const WEEKS = 6;
// What the day sheet offers to record, the log's own types (a husband: onset and tevila).
const ADD_TYPES = ['onset', 'hefsek', 'tevila', 'pause'] as const;
const HUSBAND_ADD_TYPES: readonly (typeof ADD_TYPES)[number][] = ['onset', 'tevila'];
const HUSBAND_EVENTS = new Set<TaharahEvent['type']>(['onset', 'tevila']);
const ADD_LABEL: Record<(typeof ADD_TYPES)[number], string> = {
  onset: 'taharah.log.onset',
  hefsek: 'taharah.event.hefsek',
  tevila: 'taharah.log.tevila',
  pause: 'taharah.log.pause',
};
const MARK_ICON_SIZE = scaled(14);

// A night onah opens at the previous day's shkia, so it is drawn on the evening cell before its own day.
const cellOf = (onah: Onah) => (onah.kind === 'night' ? onah.abs - 1 : onah.abs);
const markIconOf = (kind: OnahKind): IconName => (kind === 'day' ? 'sun' : 'moon');

function Mark({ icon, color }: { icon: IconName; color: string }) {
  return <MitzvahIcon name={icon} size={MARK_ICON_SIZE} color={color} tint={color} variant="duotone" />;
}

function cellItems(marks: DayMarks, t: Translate) {
  const items: { key: string; title: string; detail: string; disputed: boolean }[] = [];
  marks.onsets.forEach((kind) =>
    items.push({
      key: `onset-${kind}`,
      title: t('taharah.event.onset'),
      detail: t(`taharah.onah.${kind}`),
      disputed: false,
    }),
  );
  if (marks.cleanIndex !== null) {
    items.push({
      key: 'clean',
      title: t('taharah.calendar.legend.clean'),
      detail: t('taharah.cleanDays.day', { index: marks.cleanIndex }),
      disputed: false,
    });
  }
  if (marks.tevila) {
    items.push({ key: 'tevila', title: t('taharah.event.tevila'), detail: t('taharah.onah.night'), disputed: false });
  }
  marks.perisha.forEach((entry) =>
    items.push({
      key: `perisha-${entry.onah.kind}`,
      title: t('taharah.task.perisha'),
      detail: [
        t(`taharah.onah.${entry.onah.kind}`),
        entry.reasons.map((reason) => t(`taharah.reason.${reason}`)).join(' · '),
      ].join(' · '),
      disputed: entry.disputed,
    }),
  );
  return items;
}

export default function TaharahCalendar() {
  const { colors } = useTheme();
  const { language, t } = useI18n();
  const router = useRouter();
  const { events, settings } = useTaharahStore(useShallow((s) => ({ events: s.events, settings: s.settings })));
  const removeEvent = useTaharahStore((s) => s.removeEvent);
  // A native modal cannot open over another, so the day sheet closes while the delete is confirmed and reopens after.
  const [deleting, setDeleting] = useState<{ event: TaharahEvent; dayKey: string } | null>(null);
  const location = useUserStore((s) => s.location);
  const husband = settings.role === 'husband';
  const now = useNow();
  const [cursor, setCursor] = useState(() => DateTime.now().startOf('month'));
  const [ready, setReady] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    const task = afterPaint(() => setReady(true));
    return () => task.cancel();
  }, []);

  const marksByDay = useMemo(() => {
    const map = new Map<number, DayMarks>();
    const at = (abs: number) => {
      let marks = map.get(abs);
      if (!marks) {
        marks = { onsets: [], cleanIndex: null, tevila: false, perisha: [] };
        map.set(abs, marks);
      }
      return marks;
    };
    for (const event of events) {
      if (event.type === 'onset') at(cellOf(event.onah)).onsets.push(event.onah.kind);
    }
    const state = deriveCycle(events, settings.rules, location, now);
    if (!husband) state.cleanDays.forEach((day) => (at(day.day).cleanIndex = day.index));
    if (state.tevilaDay !== null) at(state.tevilaDay - 1).tevila = true;
    perishaOnot(events, settings.rules).forEach((entry) => at(cellOf(entry.onah)).perisha.push(entry));
    return map;
  }, [events, settings.rules, location, now, husband]);

  const weeks = useMemo(() => {
    if (!ready) return [];
    const gridStart = cursor.minus({ days: cursor.weekday % 7 });
    const cells = Array.from({ length: WEEKS * 7 }, (_, index): Cell => {
      const day = gridStart.plus({ days: index });
      const date = day.toJSDate();
      const abs = civilHebrewDayAt(locationNoon(date, location), location).abs();
      return {
        key: day.toISODate() ?? String(index),
        day,
        inMonth: day.month === cursor.month,
        isToday: day.hasSame(DateTime.fromJSDate(now), 'day'),
        isFuture: day.startOf('day') > DateTime.fromJSDate(now).startOf('day'),
        abs,
        hebrewDay: HebcalService.getHebrewDate(date).day,
        marks: marksByDay.get(abs),
      };
    });
    return Array.from({ length: WEEKS }, (_, week) => cells.slice(week * 7, week * 7 + 7));
  }, [ready, cursor, location, marksByDay, now]);

  const monthEmpty = ready && !weeks.some((week) => week.some((cell) => cell.inMonth && cell.marks));
  const monthLabel = (month: DateTime) => formatDate(month, 'LLLL yyyy', language);
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/taharah');
  };
  const selected = selectedKey ? (weeks.flat().find((cell) => cell.key === selectedKey) ?? null) : null;
  const items = selected?.marks ? cellItems(selected.marks, t) : [];
  const dayEvents = selected
    ? events.filter((event) => eventCellDay(event) === selected.abs && (!husband || HUSBAND_EVENTS.has(event.type)))
    : [];
  const addTypes = husband ? HUSBAND_ADD_TYPES : ADD_TYPES;
  const addOn = (type: string) => {
    if (!selected) return;
    const date = selected.key;
    setSelectedKey(null);
    router.push({ pathname: '/taharah/log', params: { type, date } });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={t('taharah.calendar.title')} onBack={close}>
        <View style={styles.monthBand}>
          <HeaderPill
            icon={backIcon(language)}
            onPress={() => setCursor((prev) => prev.minus({ months: 1 }))}
            accessibilityLabel={monthLabel(cursor.minus({ months: 1 }))}
          />
          <Text style={[typography.captionBold, { color: colors.text }]}>{monthLabel(cursor)}</Text>
          <HeaderPill
            icon={forwardIcon(language)}
            onPress={() => setCursor((prev) => prev.plus({ months: 1 }))}
            accessibilityLabel={monthLabel(cursor.plus({ months: 1 }))}
          />
        </View>
      </ScreenHeader>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.weekRow}>
          {Array.from({ length: 7 }).map((_, index) => (
            <Text key={index} style={[typography.micro, styles.headerCell, { color: colors.textMuted }]}>
              {t(`weekday.short.${index}`)}
            </Text>
          ))}
        </View>
        {weeks.map((week) => (
          <View key={week[0].key} style={styles.weekRow}>
            {week.map((cell) => (
              <DayCell key={cell.key} cell={cell} onPress={() => setSelectedKey(cell.key)} />
            ))}
          </View>
        ))}

        {monthEmpty ? (
          <Text style={[typography.body, styles.empty, { color: colors.textSub }]}>{t('taharah.calendar.empty')}</Text>
        ) : null}

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.onsetDot, { backgroundColor: colors.gold }]} />
            <Text style={[typography.small, { color: colors.textSub }]}>{t('taharah.event.onset')}</Text>
          </View>
          {husband ? null : (
            <View style={styles.legendItem}>
              <View style={[styles.cleanSample, { borderColor: colors.safe }]} />
              <Text style={[typography.small, { color: colors.textSub }]}>{t('taharah.calendar.legend.clean')}</Text>
            </View>
          )}
          <View style={styles.legendItem}>
            <Mark icon="moon" color={colors.optional} />
            <Text style={[typography.small, { color: colors.textSub }]}>{t('taharah.event.tevila')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.perishaBadge, { backgroundColor: colors.warning }]}>
              <Mark icon="sun" color={BRAND.white} />
              <Mark icon="moon" color={BRAND.white} />
            </View>
            <Text style={[typography.small, { color: colors.textSub }]}>{t('taharah.calendar.legend.perisha')}</Text>
          </View>
        </View>
      </ScrollView>

      <BottomSheet
        visible={selected !== null}
        title={selected ? formatDayLine(selected.day.toJSDate(), language) : undefined}
        caption={selected ? HebcalService.getHebrewDate(selected.day.toJSDate()).hebrewDateStr : undefined}
        onClose={() => setSelectedKey(null)}
      >
        {items.map((item) => (
          <View key={item.key} style={[styles.sheetRow, { borderTopColor: colors.border }]}>
            <Text style={[typography.bodyBold, { color: colors.text }]}>{item.title}</Text>
            <Text style={[typography.caption, { color: colors.textSub }]}>{item.detail}</Text>
            {item.disputed ? (
              <Text style={[typography.captionBold, { color: colors.warning }]}>{t('taharah.disputed')}</Text>
            ) : null}
          </View>
        ))}
        {dayEvents.length ? (
          <Text style={[typography.captionBold, styles.sheetHeading, { color: colors.goldText }]}>
            {t('taharah.calendar.recorded')}
          </Text>
        ) : null}
        {dayEvents.map((event) => (
          <View key={event.id} style={[styles.sheetRow, styles.eventRow, { borderTopColor: colors.border }]}>
            <View style={styles.eventMain}>
              <Text style={[typography.bodyBold, { color: colors.text }]}>{t(`taharah.event.${event.type}`)}</Text>
              <Text style={[typography.caption, { color: colors.textSub }]}>{eventDetail(event, t)}</Text>
            </View>
            <Button
              variant="danger"
              size="compact"
              label={t('common.delete')}
              accessibilityLabel={t('taharah.calendar.deleteEntry', { entry: t(`taharah.event.${event.type}`) })}
              onPress={() => {
                setDeleting({ event, dayKey: selected?.key ?? '' });
                setSelectedKey(null);
              }}
            />
          </View>
        ))}
        {selected && !selected.isFuture ? (
          <>
            <Text style={[typography.captionBold, styles.sheetHeading, { color: colors.goldText }]}>
              {t('taharah.calendar.addOnDay')}
            </Text>
            <View style={styles.addRow}>
              {addTypes.map((type) => (
                <Button
                  key={type}
                  variant={type === 'onset' ? 'primary' : 'secondary'}
                  size="compact"
                  icon="plus"
                  label={t(ADD_LABEL[type])}
                  onPress={() => addOn(type)}
                />
              ))}
            </View>
          </>
        ) : null}
        {selected && selected.isFuture && !items.length ? (
          <Text style={[typography.caption, { color: colors.textSub }]}>{t('taharah.calendar.futureDay')}</Text>
        ) : null}
      </BottomSheet>

      <ConfirmDialog
        visible={deleting !== null}
        title={t('taharah.calendar.deleteTitle')}
        body={deleting ? `${t(`taharah.event.${deleting.event.type}`)} · ${eventDetail(deleting.event, t)}` : undefined}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => {
          if (deleting) {
            removeEvent(deleting.event.id);
            setSelectedKey(deleting.dayKey);
          }
          setDeleting(null);
        }}
        onCancel={() => {
          setSelectedKey(deleting?.dayKey ?? null);
          setDeleting(null);
        }}
      />
    </SafeAreaView>
  );
}

function DayCell({ cell, onPress }: { cell: Cell; onPress: () => void }) {
  const { colors } = useTheme();
  const { language } = useI18n();
  const { marks, isToday } = cell;
  const clean = marks?.cleanIndex ?? null;
  const perishaKinds = new Set(marks?.perisha.map((entry) => entry.onah.kind));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={formatDayLine(cell.day.toJSDate(), language)}
      style={[
        styles.cell,
        {
          backgroundColor: isToday ? colors.goldLight : colors.surface,
          borderColor: colors.safe,
          borderWidth: clean !== null ? 2 : 0,
          opacity: cell.inMonth ? 1 : 0.45,
        },
      ]}
    >
      {clean !== null ? (
        <View style={[styles.indexBadge, { backgroundColor: colors.safe }]}>
          <Text style={[typography.micro, styles.badgeText]}>{clean}</Text>
        </View>
      ) : null}
      <Text style={[typography.captionBold, { color: colors.text }]}>{cell.day.day}</Text>
      <Text style={[typography.micro, { color: colors.textMuted }]}>{cell.hebrewDay}</Text>
      <View style={styles.marks}>
        {marks?.onsets.length ? <View style={[styles.onsetDot, { backgroundColor: colors.gold }]} /> : null}
        {marks?.tevila ? <Mark icon="moon" color={colors.optional} /> : null}
        {(['day', 'night'] as const)
          .filter((kind) => perishaKinds.has(kind))
          .map((kind) => (
            <View key={kind} style={[styles.perishaBadge, { backgroundColor: colors.warning }]}>
              <Mark icon={markIconOf(kind)} color={BRAND.white} />
            </View>
          ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  monthBand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  weekRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerCell: {
    flex: 1,
    textAlign: 'center',
  },
  cell: {
    flex: 1,
    aspectRatio: 0.85,
    borderRadius: radius.md,
    padding: spacing.xs,
    position: 'relative',
  },
  indexBadge: {
    position: 'absolute',
    top: scaled(3),
    end: scaled(3),
    minWidth: scaled(15),
    height: scaled(15),
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaled(3),
  },
  badgeText: {
    color: BRAND.white,
    fontFamily: fontFamilies.ui.bold,
  },
  marks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: scaled(3),
    marginTop: 'auto',
  },
  onsetDot: {
    width: scaled(7),
    height: scaled(7),
    borderRadius: radius.sm,
  },
  perishaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    paddingHorizontal: scaled(3),
    paddingVertical: scaled(1),
  },
  empty: {
    textAlign: 'center',
    paddingTop: spacing.lg,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    justifyContent: 'center',
    paddingTop: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cleanSample: {
    width: scaled(14),
    height: scaled(14),
    borderRadius: radius.xs,
    borderWidth: 2,
  },
  sheetHeading: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  eventMain: {
    flex: 1,
    gap: scaled(2),
  },
  addRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sheetRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
    gap: scaled(2),
  },
});
