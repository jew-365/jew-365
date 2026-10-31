import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { scaled } from '@/theme/scale';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { clockOf, formatRemaining, remainingParts } from '@/utils/clock';
import { ringDashOffset } from '@/utils/homeDay';
import { Button } from './Button';
import { Card } from './Card';
import { IconTile } from './IconTile';
import { MarkStamp } from './MarkStamp';
import type { IconName } from './MitzvahIcon';

const TILE_SIZE = scaled(44);
const RING_SIZE = scaled(68);
const RING_LENGTH = 157.08;
// The ring does not grow with the phone's font size, so its text stops growing at this share of it.
const RING_TEXT_MAX_SCALE = 1.15;

type Props = {
  name: string;
  icon: IconName;
  start: Date;
  end: Date;
  now: Date;
  tz: string;
  pct: number;
  urgent: boolean;
  stamping: boolean;
  onComplete: () => void;
  onOpenText?: () => void;
  onPress: () => void;
  onLongPress: () => void;
  testID?: string;
};

export const NowCard = React.memo(function NowCard({
  name,
  icon,
  start,
  end,
  now,
  tz,
  pct,
  urgent,
  stamping,
  onComplete,
  onOpenText,
  onPress,
  onLongPress,
  testID,
}: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const remaining = end.getTime() - now.getTime();
  const parts = remainingParts(remaining);
  const background = urgent ? colors.urgentBg : colors.surface;
  const ringColor = urgent ? colors.urgent : colors.gold;

  return (
    <View testID={testID}>
      <Card padded style={[styles.card, { backgroundColor: background }]}>
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          accessibilityRole="button"
          accessibilityLabel={`${name}, ${t('home.now.ringLabel', { left: formatRemaining(remaining, t) })}`}
          accessibilityActions={[{ name: 'longpress', label: t('home.quick.title') }]}
          onAccessibilityAction={() => onLongPress()}
          style={({ pressed }) => [styles.body, { opacity: pressed ? 0.85 : 1 }]}
        >
          <IconTile name={icon} size={TILE_SIZE} />
          <View style={styles.meta}>
            <Text style={[typography.heading, { color: colors.text }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[typography.caption, { color: colors.textSub }]}>
              {t('home.now.start', { time: clockOf(start, tz) })}
            </Text>
            <Text style={[typography.caption, { color: colors.textSub }]}>
              {t('home.now.end', { time: clockOf(end, tz) })}
            </Text>
          </View>
          <View style={styles.ring} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Svg width={RING_SIZE} height={RING_SIZE} viewBox="0 0 60 60">
              <Circle cx={30} cy={30} r={25} stroke={colors.border} strokeWidth={4} fill="none" />
              <Circle
                cx={30}
                cy={30}
                r={25}
                stroke={ringColor}
                strokeWidth={4}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={RING_LENGTH}
                strokeDashoffset={ringDashOffset(RING_LENGTH, pct)}
                transform="rotate(-90 30 30)"
              />
            </Svg>
            <View style={styles.ringText}>
              <Text
                maxFontSizeMultiplier={RING_TEXT_MAX_SCALE}
                style={[typography.captionBold, { color: urgent ? colors.urgent : colors.text }]}
              >
                {parts.value}
              </Text>
              <Text maxFontSizeMultiplier={RING_TEXT_MAX_SCALE} style={[typography.micro, { color: colors.textSub }]}>
                {t(`time.unit.${parts.unit}`)}
              </Text>
            </View>
          </View>
        </Pressable>
        <View style={styles.actions}>
          <Button
            variant="primary"
            icon="check"
            label={t('notifications.markDone')}
            accessibilityLabel={t('state.completeAction', { name })}
            onPress={onComplete}
            style={styles.primary}
          />
          {onOpenText ? (
            <Button
              variant="secondary"
              icon="siddur"
              label={t('home.now.openText')}
              accessibilityLabel={t('home.now.openTextLabel', { name })}
              onPress={onOpenText}
              style={styles.secondary}
            />
          ) : null}
        </View>
        <MarkStamp active={stamping} background={background} />
      </Card>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  body: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  meta: { flex: 1, minWidth: 0 },
  ring: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringText: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  primary: { flex: 2 },
  secondary: { flex: 1 },
});
