import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { lateTone } from '@/theme/colors';
import { scaled } from '@/theme/scale';
import { fontFamilies, typography } from '@/theme/typography';
import { radius, spacing } from '@/theme/tokens';
import { Card } from './Card';
import { IconTile } from './IconTile';
import { MarkStamp } from './MarkStamp';
import { MitzvahIcon, type IconName } from './MitzvahIcon';
import { TimeRibbon } from './TimeRibbon';
import { useI18n } from '@/i18n';

const TILE_SIZE = scaled(40);
const BUTTON_SIZE = scaled(32);
const BUTTON_ICON_SIZE = scaled(16);
const BUTTON_HIT_SLOP = scaled(8);
const LINE_GAP = scaled(2);
const BUTTON_ICON_STROKE = 2.2;
const DONE_LINE_ICON_SIZE = scaled(14);
const URGENT_LINE_ICON_SIZE = scaled(12);
const URGENT_LINE_ICON_STROKE = 2;

type Props = {
  name: string;
  icon?: IconName;
  timeLeft: string;
  pct: number;
  urgent?: boolean;
  done?: boolean;
  // A done mark made after the window had passed: the done line says so.
  late?: boolean;
  stamping?: boolean;
  readOnly?: boolean;
  statusText?: string;
  statusTone?: 'muted' | 'safe' | 'urgent';
  hideProgress?: boolean;
  onComplete?: () => void;
  onLongPress?: () => void;
  onPress?: () => void;
  onOpenText?: () => void;
};

export function MitzvahCard({
  name,
  icon = 'custom',
  timeLeft,
  pct,
  urgent,
  done,
  late,
  stamping,
  readOnly,
  statusText,
  statusTone = 'muted',
  hideProgress,
  onComplete,
  onLongPress,
  onPress,
  onOpenText,
}: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const bg = done ? colors.surface2 : urgent ? colors.urgentBg : colors.surface;
  const statusColor = statusTone === 'urgent' ? colors.urgent : statusTone === 'safe' ? colors.safe : colors.textMuted;
  const buttonTone = urgent ? colors.urgent : colors.textSub;
  const ringColor = urgent ? colors.urgent : colors.border;
  const canComplete = !readOnly && !done && Boolean(onComplete);
  const buttonCount = (onOpenText ? 1 : 0) + (canComplete || done ? 1 : 0);
  const [rowHeight, setRowHeight] = useState(TILE_SIZE);
  const doneLabel = late ? t('state.markedLate') : t('state.completed');
  const doneInk = late ? lateTone(colors).ink : colors.safe;

  return (
    <Card style={[styles.card, { backgroundColor: bg, opacity: done ? 0.55 : 1 }]}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={!onPress && !onLongPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={[name, statusText, done ? doneLabel : timeLeft].filter(Boolean).join(', ')}
        // Without this the long-press menu — the only way to skip a mitzvah for the day without
        // falsely marking it done — is unreachable with a screen reader.
        accessibilityActions={onLongPress ? [{ name: 'longpress', label: t('home.quick.title') }] : undefined}
        onAccessibilityAction={onLongPress ? () => onLongPress() : undefined}
        style={({ pressed }) => [styles.body, { opacity: !done && pressed && onPress ? 0.85 : 1 }]}
      >
        <View
          style={[styles.row, { paddingEnd: buttonCount * (BUTTON_SIZE + spacing.sm) }]}
          onLayout={(event) => setRowHeight(event.nativeEvent.layout.height)}
        >
          <IconTile name={icon} tone={done ? 'done' : 'accent'} size={TILE_SIZE} />
          <View style={styles.meta}>
            <Text
              style={[
                typography.heading,
                {
                  color: done ? colors.textSub : colors.text,
                  textDecorationLine: done ? 'line-through' : 'none',
                },
              ]}
              numberOfLines={1}
            >
              {name}
            </Text>
            {done && (
              <View style={styles.iconLine}>
                <MitzvahIcon name="check" size={DONE_LINE_ICON_SIZE} color={doneInk} />
                <Text style={[typography.micro, { color: doneInk, fontFamily: fontFamilies.heebo.semibold }]}>
                  {doneLabel}
                </Text>
              </View>
            )}
            {!done && statusText ? (
              <Text
                style={[
                  typography.micro,
                  { color: statusColor, fontFamily: fontFamilies.heebo.semibold, marginTop: LINE_GAP },
                ]}
              >
                {statusText}
              </Text>
            ) : null}
            {urgent && !done && !statusText && (
              <View style={styles.iconLine}>
                <MitzvahIcon
                  name="warning"
                  size={URGENT_LINE_ICON_SIZE}
                  color={colors.urgent}
                  strokeWidth={URGENT_LINE_ICON_STROKE}
                />
                <Text style={[typography.micro, { color: colors.urgent, fontFamily: fontFamilies.heebo.semibold }]}>
                  {t('state.urgentSoon')}
                </Text>
              </View>
            )}
            {readOnly && !done && !statusText && (
              <Text
                style={[
                  typography.micro,
                  { color: colors.textMuted, fontFamily: fontFamilies.heebo.semibold, marginTop: LINE_GAP },
                ]}
              >
                {t('state.readOnly')}
              </Text>
            )}
          </View>
        </View>
        {!done && !hideProgress ? <TimeRibbon pct={pct} timeLeft={timeLeft} urgent={urgent} /> : null}
      </Pressable>
      {buttonCount > 0 ? (
        // The buttons are siblings of the body, laid over its reserved end padding: a button inside the
        // body's button is invalid DOM on the web and unreachable to a screen reader on native.
        <View pointerEvents="box-none" style={[styles.actions, { height: rowHeight }]}>
          {onOpenText ? (
            <Pressable
              onPress={onOpenText}
              accessibilityRole="button"
              accessibilityLabel={t('siddur.open')}
              hitSlop={BUTTON_HIT_SLOP}
              style={[styles.circleButton, { borderColor: ringColor }]}
            >
              <MitzvahIcon name="siddur" size={BUTTON_ICON_SIZE} color={buttonTone} />
            </Pressable>
          ) : null}
          {canComplete ? (
            <Pressable
              onPress={onComplete}
              onLongPress={onLongPress}
              accessibilityRole="button"
              accessibilityLabel={t('state.completeAction', { name })}
              hitSlop={BUTTON_HIT_SLOP}
              style={[styles.circleButton, { borderColor: ringColor }]}
            >
              <MitzvahIcon name="check" size={BUTTON_ICON_SIZE} color={buttonTone} strokeWidth={BUTTON_ICON_STROKE} />
            </Pressable>
          ) : done ? (
            <View pointerEvents="none" style={[styles.doneMark, { backgroundColor: colors.gold }]}>
              <MitzvahIcon
                name="check"
                size={BUTTON_ICON_SIZE}
                color={colors.onGold}
                strokeWidth={BUTTON_ICON_STROKE}
              />
            </View>
          ) : null}
        </View>
      ) : null}
      <MarkStamp active={Boolean(stamping)} background={bg} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  body: { padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  meta: { flex: 1, minWidth: 0 },
  iconLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: LINE_GAP },
  actions: {
    position: 'absolute',
    top: spacing.lg,
    end: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  circleButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneMark: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
