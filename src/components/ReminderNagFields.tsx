import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import type { NagLevel, NagPlacement, Reminder, ReminderNag } from '@/types/mitzvah';
import { useTheme } from '@/theme/ThemeProvider';
import { scaled } from '@/theme/scale';
import { radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useI18n } from '@/i18n';
import {
  NAG_MAX_COUNT,
  NAG_INTERVALS_MIN,
  NAG_LEVELS,
  nagFor,
  nagPlacementsFor,
  presetPlacementFor,
  type NagClockEntry,
} from '@/utils/nagging';
import { ChipRow } from './ChipRow';
import { MitzvahIcon } from './MitzvahIcon';
import { SectionLabel } from './SectionLabel';
import { SegmentedControl } from './SegmentedControl';

type Translate = (scope: string, options?: Record<string, unknown>) => string;

export type NagMode = 'level' | 'none' | 'custom';

// A reminder's stored nag as the three states of the control: absent follows the level, `null` is
// none, an object is its own.
export const nagModeOf = (nag: Reminder['nag']): NagMode =>
  nag === undefined ? 'level' : nag === null ? 'none' : 'custom';

// "2 more, every 5 min, after it": what a nag adds, worded once for the editor, the custom form and the
// mitzvah screen's rows. A half-and-half nag of one repeat sends it after, so it says so.
export function nagEffect(nag: ReminderNag | null, t: Translate): string {
  if (!nag) return t('nag.effect.none');
  const placement: NagPlacement = nag.placement === 'around' && nag.count === 1 ? 'after' : nag.placement;
  const params = { count: nag.count, every: nag.everyMin, placement: t(`nag.effect.placement.${placement}`) };
  return t(nag.count === 1 ? 'nag.effect.one' : 'nag.effect', params);
}

type Props = {
  mitzvahId: string;
  anchor: Reminder['anchor'];
  nag: Reminder['nag'];
  // The mitzvah's resolved level: its own, else the app's.
  level: NagLevel;
  onChange: (nag: Reminder['nag']) => void;
  preview?: readonly NagClockEntry[];
  style?: StyleProp<ViewStyle>;
};

// The nag block of a reminder (the owner's batch of 2026-11-01): by the level, none, or its own count,
// interval and placement, with the times it would send. Stateless: the caller owns the draft.
export function ReminderNagFields({ mitzvahId, anchor, nag, level, onChange, preview, style }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const mode = nagModeOf(nag);
  const allowed = nagPlacementsFor(mitzvahId, { anchor });
  const own = nag ? { ...nag, placement: allowed.includes(nag.placement) ? nag.placement : allowed[0] } : null;
  const levelName = t(`nag.level.${level}.name`);

  const choose = (next: NagMode) => {
    if (next === mode) return;
    if (next === 'level') onChange(undefined);
    else if (next === 'none') onChange(null);
    else {
      const preset = NAG_LEVELS[level].count ? NAG_LEVELS[level] : NAG_LEVELS[3];
      onChange({
        count: preset.count,
        everyMin: preset.everyMin,
        placement: presetPlacementFor(mitzvahId, { anchor }),
      });
    }
  };
  const update = (patch: Partial<ReminderNag>) => own && onChange({ ...own, ...patch });
  // The count's stepper (the owner's pick of 2026-11-02, board ה): one fewer and one more, 1 to NAG_MAX_COUNT.
  const step = (icon: 'minus' | 'plus', label: string, count: number) => {
    const disabled = count < 1 || count > NAG_MAX_COUNT;
    return (
      <Pressable
        onPress={() => update({ count })}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.stepButton,
          { backgroundColor: colors.surface2, borderColor: colors.border, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        ]}
      >
        <MitzvahIcon name={icon} size={STEP_ICON_SIZE} color={colors.text} strokeWidth={2.5} />
      </Pressable>
    );
  };

  const kept = preview?.filter((entry) => entry.fires) ?? [];
  const dropped = preview?.filter((entry) => !entry.fires) ?? [];

  return (
    <View style={style}>
      <SectionLabel variant="field" text={t('nag.mode')} />
      <View accessibilityRole="radiogroup" accessibilityLabel={t('nag.mode')}>
        <SegmentedControl
          options={(['level', 'none', 'custom'] as const).map((value) => ({ value, label: t(`nag.mode.${value}`) }))}
          value={mode}
          onChange={choose}
        />
      </View>
      {mode === 'level' ? (
        <Text style={[typography.small, styles.caption, { color: colors.textSub }]}>
          {t('nag.mode.levelCaption', {
            name: levelName,
            level,
            effect: nagEffect(nagFor(mitzvahId, { anchor }, level), t),
          })}
        </Text>
      ) : null}
      {mode === 'none' ? (
        <Text style={[typography.small, styles.caption, { color: colors.textSub }]}>{t('nag.mode.noneCaption')}</Text>
      ) : null}
      {own ? (
        <>
          <SectionLabel variant="field" text={t('nag.count')} style={styles.field} />
          <View style={styles.stepper}>
            {step('minus', t('nag.count.less'), own.count - 1)}
            <View style={[styles.stepValue, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Text
                style={[typography.heading, { color: colors.text }]}
                accessibilityLabel={`${t('nag.count')}: ${own.count}`}
              >
                {own.count}
              </Text>
            </View>
            {step('plus', t('nag.count.more'), own.count + 1)}
          </View>
          <SectionLabel variant="field" text={t('nag.every')} style={styles.field} />
          <ChipRow<number>
            values={NAG_INTERVALS_MIN}
            selected={own.everyMin}
            onSelect={(everyMin) => update({ everyMin })}
            renderLabel={(n) => t('nag.every.option', { n })}
          />
          <SectionLabel variant="field" text={t('nag.placement')} style={styles.field} />
          {allowed.length > 1 ? (
            <View accessibilityRole="radiogroup" accessibilityLabel={t('nag.placement')}>
              <SegmentedControl
                options={allowed.map((value) => ({ value, label: t(`nag.placement.${value}`) }))}
                value={own.placement}
                onChange={(placement) => update({ placement })}
              />
            </View>
          ) : (
            <Text style={[typography.small, { color: colors.textSub }]}>
              {t(allowed[0] === 'before' ? 'nag.placement.beforeOnly' : 'nag.placement.afterOnly')}
            </Text>
          )}
        </>
      ) : null}
      {mode !== 'none' && preview?.length ? (
        <View style={styles.preview} testID="nag-preview">
          {kept.length ? (
            <Text style={[typography.small, { color: colors.goldText }]}>
              {t('nag.preview', { times: kept.map((entry) => entry.time).join(' · ') })}
            </Text>
          ) : (
            <Text style={[typography.small, { color: colors.urgent }]}>{t('nag.previewAllDropped')}</Text>
          )}
          {kept.length
            ? dropped.map((entry, index) => (
                <Text key={`${entry.time}-${index}`} style={[typography.small, { color: colors.urgent }]}>
                  {t(entry.afterEnd ? 'nag.previewDropped' : 'nag.previewSkipped', { time: entry.time })}
                </Text>
              ))
            : null}
        </View>
      ) : null}
    </View>
  );
}

const STEP_ICON_SIZE = scaled(18);
const STEP_WIDTH = scaled(54);
const STEP_HEIGHT = scaled(48);

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepButton: {
    width: STEP_WIDTH,
    height: STEP_HEIGHT,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    flex: 1,
    height: STEP_HEIGHT,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    marginTop: spacing.sm,
  },
  field: {
    marginTop: spacing.md,
  },
  preview: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
});
