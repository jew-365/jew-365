import React, { useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { findMitzvah } from '@/data/mitzvot';
import { useRowMirrored } from '@/hooks/useRowMirrored';
import { useI18n } from '@/i18n';
// The pure planner itself: the scheduler facade adds nothing to it, and the Settings suites mock the facade.
import { nagChain } from '@/services/notifications/planners/mitzvot';
import { scaled } from '@/theme/scale';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { fontFamilies, typography } from '@/theme/typography';
import type { NagLevel, UserSettings } from '@/types/mitzvah';
import type { Location } from '@/types/zmanim';
import { clockOf } from '@/utils/clock';
import { appDay, appDayEnd } from '@/utils/locationDay';
import { mitzvahName } from '@/utils/mitzvahName';
import { NAG_LEVEL_IDS } from '@/utils/nagging';
import type { QuietHours } from '@/utils/quietHours';
import { timingSummary } from '@/utils/reminderTiming';
import { SectionLabel } from './SectionLabel';

const SLIDER_HEIGHT = scaled(44);
const INSET = scaled(14);
const TRACK_HEIGHT = scaled(4);
const STOP_SIZE = scaled(12);
const THUMB_SIZE = scaled(28);
const THUMB_RING = scaled(4);
const NAME_MIN_WIDTH = scaled(56);
const LEGEND_DOT = scaled(10);
const LAST = NAG_LEVEL_IDS.length - 1;
// A finger-distance gesture threshold, not a drawn size, so it stays unscaled.
const DRAG_SLOP = 8;

const share = (level: NagLevel) => NAG_LEVEL_IDS.indexOf(level) / LAST;

// A point along the track, from the row's start: `start` on native, which follows the layout direction,
// and the physical edge on the web, where react-native-web keeps `start` physical. `offset` centres an
// element of twice that width on the point; a transform is physical everywhere, so it follows the mirroring.
function along(fraction: number, mirrored: boolean, offset = 0): ViewStyle {
  const at = `${Number((fraction * 100).toFixed(2))}%` as `${number}%`;
  const style: ViewStyle = Platform.OS === 'web' ? (mirrored ? { right: at } : { left: at }) : { start: at };
  return offset ? { ...style, transform: [{ translateX: (mirrored ? 1 : -1) * offset }] } : style;
}

type Gesture = { x: number; y: number; mode: 'pending' | 'drag' | 'scroll' };

type PickerProps = { level: NagLevel; onChange: (level: NagLevel) => void; style?: StyleProp<ViewStyle> };

// The app's nagging level (the owner's pick of 2026-11-02, board ג of the nagging study): the field label with
// the chosen level's name, a four-stop slider (a tap, when the finger lifts, or a horizontal drag picks the nearest
// stop; a touch-down or a vertical scroll changes nothing), the names under it as buttons too, and the chosen level's description.
export function NagLevelPicker({ level, onChange, style }: PickerProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const mirrored = useRowMirrored();
  const [width, setWidth] = useState(0);
  const gesture = useRef<Gesture | null>(null);
  const name = (l: NagLevel) => t(`nag.level.${l}.name`);
  const title = (l: NagLevel) => t('nag.level.title', { name: name(l), level: l });

  const pickAt = (event: GestureResponderEvent) => {
    const span = width - 2 * INSET;
    if (span <= 0) return;
    const physical = Math.min(1, Math.max(0, (event.nativeEvent.locationX - INSET) / span));
    const next = NAG_LEVEL_IDS[Math.round((mirrored ? 1 - physical : physical) * LAST)];
    if (next !== level) onChange(next);
  };
  const startGesture = (event: GestureResponderEvent) => {
    gesture.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY, mode: 'pending' };
  };
  const moveGesture = (event: GestureResponderEvent) => {
    const current = gesture.current;
    if (!current || current.mode === 'scroll') return;
    if (current.mode === 'pending') {
      const dx = Math.abs(event.nativeEvent.pageX - current.x);
      const dy = Math.abs(event.nativeEvent.pageY - current.y);
      if (dx <= DRAG_SLOP && dy <= DRAG_SLOP) return;
      current.mode = dx > dy ? 'drag' : 'scroll';
    }
    if (current.mode === 'drag') pickAt(event);
  };
  const endGesture = (event: GestureResponderEvent) => {
    const mode = gesture.current?.mode;
    gesture.current = null;
    if (mode === 'pending' || mode === 'drag') pickAt(event);
  };
  const step = (delta: number) => {
    const next = NAG_LEVEL_IDS[NAG_LEVEL_IDS.indexOf(level) + delta];
    if (next) onChange(next);
  };

  return (
    <View style={style}>
      <View style={styles.head}>
        <SectionLabel variant="field" text={t('settings.nagLevel')} />
        <Text style={[styles.name, { color: colors.goldText }]} testID="nag-level-name">
          {name(level)}
        </Text>
      </View>
      <View
        testID="nag-level-slider"
        style={styles.slider}
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={startGesture}
        onResponderMove={moveGesture}
        onResponderRelease={endGesture}
        onResponderTerminate={() => {
          gesture.current = null;
        }}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={t('settings.nagLevel')}
        accessibilityValue={{ min: 1, max: NAG_LEVEL_IDS.length, now: level, text: title(level) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => step(event.nativeEvent.actionName === 'increment' ? 1 : -1)}
      >
        <View pointerEvents="none" style={[styles.track, { backgroundColor: colors.surface2 }]}>
          <View
            style={[styles.fill, along(0, mirrored), { width: `${share(level) * 100}%`, backgroundColor: colors.gold }]}
          />
        </View>
        <View pointerEvents="none" style={styles.stops}>
          {NAG_LEVEL_IDS.map((l) => (
            <View
              key={l}
              style={[
                styles.stop,
                along(share(l), mirrored, STOP_SIZE / 2),
                l <= level
                  ? { backgroundColor: colors.gold, borderColor: colors.gold }
                  : { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            />
          ))}
          <View
            style={[
              styles.thumb,
              along(share(level), mirrored, THUMB_SIZE / 2),
              { backgroundColor: colors.gold, borderColor: colors.surface },
            ]}
          />
        </View>
      </View>
      <View style={styles.names}>
        {NAG_LEVEL_IDS.map((l) => (
          <Pressable
            key={l}
            onPress={() => onChange(l)}
            accessibilityRole="button"
            accessibilityLabel={title(l)}
            accessibilityState={{ selected: l === level }}
            style={styles.nameButton}
          >
            <Text
              style={[
                typography.small,
                l === level
                  ? { fontFamily: fontFamilies.ui.bold, color: colors.goldText }
                  : { color: colors.textMuted },
              ]}
            >
              {name(l)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={[typography.caption, { color: colors.text }]} testID="settings-nag-line">
        {t(`nag.level.${level}.desc`)}.
      </Text>
    </View>
  );
}

type ExampleProps = {
  level: NagLevel;
  location: Location;
  settings: UserSettings;
  quietHours?: QuietHours;
  style?: StyleProp<ViewStyle>;
};

// The example registry reminders: Shacharit's two and the bedtime Shema's.
const EXAMPLES: readonly [string, number][] = [
  ['shacharit', 0],
  ['shacharit', 1],
  ['krias_shma_al_hamita', 0],
];

type Pill = { at: number; time: string; kind: 'main' | 'repeat' | 'dropped' };

// Today's chains of the example reminders at `level`, as the plan would send them from the start of the app
// day (`nagChain()`, so the quiet hours, the holy blocks and the end of the time all apply): the main filled,
// each repeat outlined, a repeat the plan drops dashed in `urgent`.
export function NagLevelExample({ level, location, settings, quietHours, style }: ExampleProps) {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const rows = useMemo(() => {
    const today = appDay(new Date(), location);
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const scope = {
      now: new Date(appDayEnd(yesterday, location).getTime() - 1),
      location,
      settings,
      completions: {},
      skipped: {},
      quietHours,
      nagLevel: level,
    };
    return EXAMPLES.flatMap(([id, index]) => {
      const mitzvah = findMitzvah(id);
      const reminder = mitzvah?.defaultReminders[index];
      const chain = mitzvah && reminder ? nagChain(mitzvah, reminder, scope) : null;
      if (!mitzvah || !reminder || !chain) return [];
      const pills: Pill[] = [
        { at: chain.main.getTime(), time: clockOf(chain.main, location.tz), kind: 'main' as const },
        ...chain.repeats.map(({ trigger, fires }): Pill => ({
          at: trigger.getTime(),
          time: clockOf(trigger, location.tz),
          kind: fires ? 'repeat' : 'dropped',
        })),
      ].sort((a, b) => a.at - b.at);
      return [
        { key: `${id}-${index}`, label: `${mitzvahName(mitzvah, language)} · ${timingSummary(reminder, t)}`, pills },
      ];
    });
  }, [level, location, settings, quietHours, language, t]);

  if (!rows.length) return null;
  const city = language === 'en' && location.nameEn ? location.nameEn : location.name;
  return (
    <View style={[styles.example, { backgroundColor: colors.surface2 }, style]} testID="nag-example">
      <Text style={[typography.captionBold, { color: colors.text }]}>{t('settings.nagExample.title', { city })}</Text>
      {rows.map((row) => (
        <View key={row.key} style={styles.exampleRow}>
          <Text style={[typography.small, { color: colors.textSub }]}>{row.label}</Text>
          <View style={styles.pills}>
            {row.pills.map((pill, i) => (
              <View
                key={`${pill.at}-${i}`}
                testID={`nag-example-${pill.kind}`}
                accessibilityLabel={pill.kind === 'dropped' ? t('nag.previewSkipped', { time: pill.time }) : pill.time}
                style={[
                  styles.pill,
                  pill.kind === 'main'
                    ? { backgroundColor: colors.gold, borderColor: colors.gold }
                    : pill.kind === 'repeat'
                      ? { backgroundColor: colors.surface, borderColor: colors.gold }
                      : { backgroundColor: colors.surface, borderColor: colors.urgent, borderStyle: 'dashed' },
                ]}
              >
                <Text
                  style={[
                    typography.captionBold,
                    {
                      color:
                        pill.kind === 'main' ? colors.onGold : pill.kind === 'repeat' ? colors.goldText : colors.urgent,
                    },
                  ]}
                >
                  {pill.time}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
      <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.gold, borderColor: colors.gold }]} />
          <Text style={[typography.small, { color: colors.textSub }]}>{t('settings.nagExample.main')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { borderColor: colors.gold }]} />
          <Text style={[typography.small, { color: colors.textSub }]}>{t('settings.nagExample.repeat')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    ...typography.heading,
    fontFamily: fontFamilies.ui.bold,
  },
  slider: {
    height: SLIDER_HEIGHT,
    marginTop: spacing.xs,
  },
  track: {
    position: 'absolute',
    start: INSET,
    end: INSET,
    top: (SLIDER_HEIGHT - TRACK_HEIGHT) / 2,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  stops: {
    position: 'absolute',
    start: INSET,
    end: INSET,
    top: 0,
    bottom: 0,
  },
  stop: {
    position: 'absolute',
    top: (SLIDER_HEIGHT - STOP_SIZE) / 2,
    width: STOP_SIZE,
    height: STOP_SIZE,
    borderRadius: STOP_SIZE / 2,
    borderWidth: 2,
  },
  thumb: {
    position: 'absolute',
    top: (SLIDER_HEIGHT - THUMB_SIZE) / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: THUMB_RING,
  },
  names: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nameButton: {
    minHeight: SLIDER_HEIGHT,
    minWidth: NAME_MIN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  example: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  exampleRow: {
    gap: spacing.xs,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pill: {
    borderRadius: radius.full,
    borderWidth: 1.5,
    paddingHorizontal: spacing.sm,
    paddingVertical: scaled(3),
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: LEGEND_DOT,
    height: LEGEND_DOT,
    borderRadius: LEGEND_DOT / 2,
    borderWidth: 1.5,
  },
});
