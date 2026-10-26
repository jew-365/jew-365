import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { IconTile } from './IconTile';
import { MitzvahIcon, type IconName } from './MitzvahIcon';
import { useTheme } from '@/theme/ThemeProvider';
import { scaled } from '@/theme/scale';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  children: React.ReactNode;
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
};

const CHEVRON_SIZE = scaled(16);
const HIT_SLOP = scaled(6);
const CHEVRON_STROKE = 2.5;

export function SettingsSection({
  title,
  subtitle,
  icon,
  children,
  collapsible = false,
  expanded = false,
  onToggle,
}: Props) {
  const { colors } = useTheme();
  const heading = (
    <>
      {icon ? <IconTile name={icon} /> : null}
      <View style={styles.headerTitle}>
        <Text style={[typography.heading, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[typography.caption, styles.subtitle, { color: colors.textSub }]}>{subtitle}</Text>
        ) : null}
      </View>
    </>
  );
  return (
    <Card padded style={styles.section}>
      {collapsible ? (
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          aria-expanded={expanded}
          hitSlop={HIT_SLOP}
          style={({ pressed }) => [
            styles.header,
            { marginBottom: expanded ? spacing.md : 0, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          {heading}
          <MitzvahIcon
            name={expanded ? 'chevronUp' : 'chevronDown'}
            size={CHEVRON_SIZE}
            color={colors.textMuted}
            strokeWidth={CHEVRON_STROKE}
          />
        </Pressable>
      ) : (
        <View style={[styles.header, styles.staticHeader]}>{heading}</View>
      )}
      {collapsible && !expanded ? null : children}
    </Card>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  staticHeader: {
    marginBottom: spacing.md,
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
  },
  subtitle: {
    marginTop: scaled(2),
  },
});
