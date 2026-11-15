import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconTile } from '@/components/IconTile';
import { ListRow } from '@/components/ListRow';
import { MitzvahIcon, type IconName } from '@/components/MitzvahIcon';
import type { Capability, CapabilityState } from '@/data/capabilities';
import { useI18n } from '@/i18n';
import { scaled } from '@/theme/scale';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

// The pieces the More tab and the capabilities screen share (spec .claude/specs/discoverability.md, C4 and C5;
// the owner's picks of 2026-11-15, direction ב of the hub study): the icon strip of a goal, the goal tile, the
// offer card of the "worth trying" strip and a capability's row.

const STRIP_ICON = scaled(20);
const STATE_ICON = scaled(14);
const OFFER_WIDTH = scaled(240);
const TILE_MIN_HEIGHT = scaled(96);

// A goal's capabilities as small icons: in the accent while on, muted otherwise. Decorative; the caller's
// label says how many are on.
export function CapabilityIcons({ items }: { items: readonly { icon: IconName; on: boolean; id: string }[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.strip} accessible={false} importantForAccessibility="no-hide-descendants">
      {items.map((item) => (
        <View key={item.id} testID={`capability-icon-${item.id}-${item.on ? 'on' : 'off'}`}>
          <MitzvahIcon name={item.icon} size={STRIP_ICON} color={item.on ? colors.gold : colors.textMuted} />
        </View>
      ))}
    </View>
  );
}

// One goal of the More tab: its name, an optional caption and its icon strip, the whole tile one button.
export function GoalTile({
  title,
  caption,
  icons,
  accessibilityLabel,
  onPress,
  testID,
}: {
  title: string;
  caption?: string;
  icons?: readonly { icon: IconName; on: boolean; id: string }[];
  accessibilityLabel: string;
  onPress: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Card style={styles.tile}>
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        android_ripple={{ color: colors.border }}
        style={({ pressed }) => [styles.tileBody, { opacity: pressed ? 0.75 : 1 }]}
      >
        <Text style={[typography.heading, { color: colors.text }]}>{title}</Text>
        {caption ? <Text style={[typography.caption, { color: colors.textSub }]}>{caption}</Text> : null}
        {icons ? <CapabilityIcons items={icons} /> : null}
      </Pressable>
    </Card>
  );
}

// One offer of the "worth trying" strip: its icon and title, its one-line benefit and its one action.
export function OfferCard({
  icon,
  title,
  body,
  accept,
  onAccept,
  testID,
}: {
  icon: IconName;
  title: string;
  body: string;
  accept: string;
  onAccept: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Card padded style={styles.offer}>
      <View testID={testID} style={styles.offerBody}>
        <View style={styles.offerHead}>
          <IconTile name={icon} />
          <Text style={[typography.heading, styles.offerTitle, { color: colors.text }]}>{title}</Text>
        </View>
        <Text style={[typography.caption, styles.offerText, { color: colors.textSub }]}>{body}</Text>
        <Button label={accept} size="compact" onPress={onAccept} accessibilityLabel={`${accept}: ${title}`} />
      </View>
    </Card>
  );
}

// A capability as a row: accent while on, with "on", "turn on", "download" or a chevron at its end. The row
// opens the capability's own place; the trailing button is its one action.
export function CapabilityRow({
  capability,
  state,
  onOpen,
  onAct,
}: {
  capability: Capability;
  state: CapabilityState;
  onOpen: () => void;
  onAct: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const title = t(`capability.${capability.id}.title`);
  const opens = capability.action.kind === 'route';
  const trailing = opens ? undefined : state === 'on' ? (
    <View style={styles.stateOn} testID={`capability-on-${capability.id}`}>
      <MitzvahIcon name="check" size={STATE_ICON} color={colors.safe} />
      <Text style={[typography.captionBold, { color: colors.safe }]}>{t('capabilities.on')}</Text>
    </View>
  ) : (
    <Button
      size="compact"
      variant="secondary"
      icon={state === 'notInstalled' ? 'cloud' : undefined}
      label={t(state === 'notInstalled' ? 'capabilities.download' : 'capabilities.turnOn')}
      accessibilityLabel={`${t(state === 'notInstalled' ? 'capabilities.download' : 'capabilities.turnOn')}: ${title}`}
      onPress={onAct}
    />
  );
  return (
    <View testID={`capability-row-${capability.id}`}>
      <ListRow
        icon={capability.icon}
        iconTone={state === 'on' ? 'accent' : 'muted'}
        title={title}
        caption={t(`capability.${capability.id}.benefit`)}
        trailing={trailing}
        chevron={opens}
        onPress={onOpen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  tile: {
    flexBasis: '40%',
    flexGrow: 1,
    minHeight: TILE_MIN_HEIGHT,
  },
  tileBody: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  offer: {
    width: OFFER_WIDTH,
  },
  offerBody: {
    flex: 1,
    gap: spacing.sm,
  },
  offerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  offerTitle: {
    flex: 1,
  },
  offerText: {
    flex: 1,
  },
  stateOn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
