import React, { useId, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { BottomSheet, SheetAction } from '@/components/BottomSheet';
import { ListRow } from '@/components/ListRow';
import { MitzvahIcon } from '@/components/MitzvahIcon';
import { SectionLabel } from '@/components/SectionLabel';
import { useI18n } from '@/i18n';
import { BRAND } from '@/theme/colors';
import { PERIOD_TONES, TONE_FILL_ALPHA } from '@/theme/periodTone';
import { scaled } from '@/theme/scale';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { clockOf, formatRemaining } from '@/utils/clock';
import { alphaHex, CHIP_ALPHA } from '@/utils/dayArc';
import type { CardModel } from '@/utils/homeCard';
import {
  CARD_PAGES,
  MINE_FACTS,
  MINE_MAX,
  progressShare,
  type CardPageId,
  type MineFactId,
  type TimeChip,
} from '@/utils/homeTimes';
import { ARC_ZMANIM, type ZmanId } from '@/utils/zmanIds';

const CHIP_MIN = scaled(44);
const CHIP_PAD_X = scaled(14);
const CHIP_PAD_Y = scaled(3);
const CHIP_RADIUS = scaled(14);
const LIVE_MIN_WIDTH = scaled(150);
const BAR_HEIGHT = scaled(3);
const MARK_ICON = scaled(13);
const TITLE_ICON = scaled(16);
const TAB_HEIGHT = scaled(28);
const CHIPS_TOP = scaled(6);
const LABEL_LINE = scaled(14);
const TIME_LINE = scaled(18);
const TAB_SLOP = { top: scaled(10), bottom: scaled(10), left: scaled(4), right: scaled(4) };
const BORDER = 2;

export type HomeTimesProps = {
  card: CardModel;
  // The page the user chose and kept, or null for the smart choice.
  page: CardPageId | null;
  onPage: (page: CardPageId | null) => void;
  chips: readonly TimeChip[];
  lead: string | null;
  now: Date;
  tz: string;
  inks: { plain: string; next: string };
  selected: ZmanId | null;
  onPickZman: (id: ZmanId) => void;
  pins: readonly ZmanId[];
  suggestions: readonly { id: ZmanId; reason: string }[];
  hidden: readonly ZmanId[];
  onPinsChange: (pins: ZmanId[]) => void;
  mine: readonly MineFactId[];
  onMineChange: (facts: MineFactId[]) => void;
  learn: boolean;
  onLearnChange: (on: boolean) => void;
};

export function HomeTimes(props: HomeTimesProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const gradientId = `homeTone${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [focus, setFocus] = useState<string | null>(null);
  const [pinsOpen, setPinsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [tabsWidth, setTabsWidth] = useState(0);
  const { card, now, tz } = props;
  const tone = PERIOD_TONES[card.tone];
  const pageId = props.page ?? card.smart;
  const page = card.pages[pageId];
  const nextPage = CARD_PAGES[(CARD_PAGES.indexOf(pageId) + 1) % CARD_PAGES.length];

  const running = useMemo(
    () => new Set(props.chips.filter((c) => c.type === 'time' && c.progress).map((c) => c.key)),
    [props.chips],
  );
  const focused = focus && running.has(focus) ? focus : props.lead;
  const firstUpcoming = props.chips.find((c) => c.type === 'time' && c.kind === 'upcoming')?.key ?? null;

  const chipLabel = (c: Extract<TimeChip, { type: 'time' }>) =>
    c.zman ? t(`home.zman.${c.zman}.short`) : t(`home.times.extra.${c.extra}`);
  const chipName = (c: Extract<TimeChip, { type: 'time' }>) =>
    c.zman ? t(`home.zman.${c.zman}.name`) : t(`home.times.extra.${c.extra}`);

  const pinChoices = ARC_ZMANIM.filter((id) => !props.hidden.includes(id));
  const suggested = props.suggestions.filter((s) => pinChoices.includes(s.id));
  const togglePin = (id: ZmanId) =>
    props.onPinsChange(props.pins.includes(id) ? props.pins.filter((p) => p !== id) : [...props.pins, id]);
  const toggleMine = (id: MineFactId) => {
    if (props.mine.includes(id)) props.onMineChange(props.mine.filter((m) => m !== id));
    else if (props.mine.length < MINE_MAX) props.onMineChange([...props.mine, id]);
  };

  return (
    <View testID="home-times">
      <View testID="home-card" style={styles.card} accessibilityLabel={t('home.card.label')}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" pointerEvents="none">
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={tone.from} />
              <Stop offset="1" stopColor={tone.to} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
        </Svg>
        <View style={styles.row}>
          <Pressable
            testID={`home-card-page-${page.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${page.title}. ${page.facts.map((f) => `${f.label} ${f.value}`).join('. ')}. ${t('home.card.next')}`}
            onPress={() => props.onPage(nextPage)}
            style={({ pressed }) => [styles.main, pressed && styles.pressed]}
          >
            <View style={[styles.titleRow, { paddingEnd: tabsWidth }]}>
              <MitzvahIcon name={page.icon} size={TITLE_ICON} color={BRAND.white} />
              <Text style={[typography.bodyBold, styles.white, styles.shrink]} numberOfLines={1}>
                {page.title}
              </Text>
            </View>
            <View style={styles.facts}>
              {page.facts.map((f, i) => (
                <View key={f.label} style={[styles.fact, i > 0 && styles.factDivider, i === 0 && styles.factFirst]}>
                  <Text style={[typography.micro, styles.white, styles.dim]} numberOfLines={1}>
                    {f.label}
                  </Text>
                  <Text style={[typography.captionBold, styles.white]} numberOfLines={1}>
                    {f.value}
                  </Text>
                </View>
              ))}
            </View>
          </Pressable>
          <View style={styles.side} onLayout={(e) => setTabsWidth(e.nativeEvent.layout.width)}>
            <View accessibilityRole="tablist" accessibilityLabel={t('home.card.pages')} style={styles.tabs}>
              {CARD_PAGES.map((id) => {
                const on = id === pageId;
                return (
                  <Pressable
                    key={id}
                    testID={`home-card-tab-${id}`}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    hitSlop={TAB_SLOP}
                    onPress={() => props.onPage(id)}
                    style={[styles.tab, on && styles.tabOn]}
                  >
                    {id === card.smart ? <View style={styles.smartDot} /> : null}
                    <Text style={[on ? typography.captionBold : typography.small, styles.white]}>
                      {t(`home.card.page.${id}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              testID="home-card-more"
              accessibilityRole="button"
              accessibilityLabel={t('home.card.more')}
              hitSlop={TAB_SLOP}
              onPress={() => setMoreOpen(true)}
              style={styles.more}
            >
              <View style={styles.dot} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel={t('home.times.chips')}
        contentContainerStyle={styles.chips}
      >
        {props.chips.map((c) => {
          if (c.type === 'sep') {
            return (
              <View key={c.key} style={styles.sep} accessibilityRole="text">
                <View style={[styles.sepLine, { backgroundColor: props.inks.plain }]} />
                <Text style={[typography.micro, { color: props.inks.plain }]}>
                  {t(c.key === 'sep-tomorrow' ? 'home.times.tomorrow' : 'home.times.earlier')}
                </Text>
              </View>
            );
          }
          const live = c.key === focused && c.progress !== null;
          const share = c.progress ? progressShare(c.progress, now) : 0;
          const time = clockOf(c.at, tz);
          const selected = c.zman !== null && c.kind !== 'tomorrow' && c.zman === props.selected;
          const marked = live || (!focused && c.key === firstUpcoming);
          const ink = selected ? colors.bg : c.extra || live ? props.inks.next : props.inks.plain;
          const label =
            live && c.progress
              ? t('home.times.live', {
                  label: chipLabel(c),
                  time: formatRemaining(c.progress.end.getTime() - now.getTime(), t),
                })
              : chipLabel(c);
          const extras = [c.pinned ? t('home.times.pinned') : null, c.learned ? t('home.times.learned') : null].filter(
            Boolean,
          );
          const aria = c.progress
            ? t('home.times.progressA11y', {
                name: chipName(c),
                time,
                left: formatRemaining(c.progress.end.getTime() - now.getTime(), t),
                pct: Math.round(share * 100),
              }) + (live ? '' : `. ${t('home.times.touchProgress')}`)
            : c.kind === 'tomorrow'
              ? t('home.times.tomorrowA11y', { name: chipName(c), time })
              : `${chipName(c)}, ${time}`;
          const onPress = c.progress
            ? () => setFocus(live && c.key !== props.lead ? null : c.key)
            : c.zman && c.kind !== 'tomorrow'
              ? () => props.onPickZman(c.zman as ZmanId)
              : undefined;
          return (
            <Pressable
              key={c.key}
              testID={`home-times-${c.key}`}
              accessibilityRole={onPress ? 'button' : 'text'}
              accessibilityLabel={[aria, ...extras].join(', ')}
              accessibilityState={{ selected }}
              disabled={!onPress}
              onPress={onPress}
              style={[
                styles.chip,
                {
                  backgroundColor: alphaHex(c.extra || live ? colors.goldLight : colors.surface, CHIP_ALPHA),
                  borderColor: marked ? (live ? tone.bar : colors.gold) : 'transparent',
                },
                live && styles.liveChip,
                c.kind === 'past' && styles.past,
                selected && { backgroundColor: colors.text },
              ]}
            >
              {live ? (
                <View
                  testID="home-times-fill"
                  pointerEvents="none"
                  style={[
                    styles.fill,
                    { width: `${share * 100}%`, backgroundColor: alphaHex(tone.fill, TONE_FILL_ALPHA) },
                  ]}
                />
              ) : null}
              <View style={styles.chipLabel}>
                {c.pinned ? <MitzvahIcon name="star" size={MARK_ICON} color={colors.gold} /> : null}
                {c.learned ? <MitzvahIcon name="sparkle" size={MARK_ICON} color={colors.gold} /> : null}
                <Text
                  style={[live ? typography.captionBold : typography.small, { color: ink, lineHeight: LABEL_LINE }]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </View>
              <Text
                style={[
                  c.kind === 'past' ? typography.body : typography.bodyBold,
                  { color: ink, lineHeight: TIME_LINE },
                ]}
              >
                {time}
              </Text>
              {c.progress && !live ? (
                <View style={styles.track} pointerEvents="none">
                  <View style={[styles.bar, { width: `${share * 100}%`, backgroundColor: tone.bar }]} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
        <Pressable
          testID="home-times-pin"
          accessibilityRole="button"
          accessibilityLabel={t('home.times.addPin')}
          onPress={() => setPinsOpen(true)}
          style={[styles.chip, styles.addChip, { borderColor: props.inks.plain }]}
        >
          <View style={styles.chipLabel}>
            <MitzvahIcon name="star" size={MARK_ICON} color={colors.gold} />
            <Text style={[typography.small, { color: props.inks.plain, lineHeight: LABEL_LINE }]}>
              {t('home.times.pinsChip')}
            </Text>
          </View>
          <MitzvahIcon name="plus" size={MARK_ICON} color={props.inks.plain} />
        </Pressable>
      </ScrollView>

      <BottomSheet
        visible={pinsOpen}
        title={t('home.times.pins.title')}
        caption={t('home.times.pins.caption')}
        onClose={() => setPinsOpen(false)}
      >
        <ScrollView style={styles.sheetBody}>
          {suggested.length ? <SectionLabel variant="field" text={t('home.times.pins.suggested')} /> : null}
          {suggested.map((s) => (
            <SheetAction
              key={`s-${s.id}`}
              label={t(`home.zman.${s.id}.name`)}
              caption={t(`home.times.reason.${s.reason}`)}
              selected={props.pins.includes(s.id)}
              onPress={() => togglePin(s.id)}
            />
          ))}
          <SectionLabel variant="field" text={t('home.times.pins.more')} />
          {pinChoices
            .filter((id) => !suggested.some((s) => s.id === id))
            .map((id) => (
              <SheetAction
                key={id}
                label={t(`home.zman.${id}.name`)}
                selected={props.pins.includes(id)}
                onPress={() => togglePin(id)}
              />
            ))}
        </ScrollView>
      </BottomSheet>

      <BottomSheet visible={moreOpen} title={t('home.card.more')} onClose={() => setMoreOpen(false)}>
        <ScrollView style={styles.sheetBody}>
          <SheetAction
            label={t('home.card.smart')}
            caption={t('home.card.smartCaption')}
            selected={props.page === null}
            onPress={() => props.onPage(null)}
          />
          <ListRow
            icon="sparkle"
            title={t('home.card.learn')}
            caption={t('home.card.learnCaption')}
            trailing={
              <Switch
                testID="home-card-learn"
                accessibilityLabel={t('home.card.learn')}
                value={props.learn}
                onValueChange={props.onLearnChange}
                trackColor={{ true: colors.gold, false: colors.surface2 }}
              />
            }
          />
          <SectionLabel variant="field" text={t('home.card.mineTitle')} />
          {MINE_FACTS.map((id) => (
            <SheetAction
              key={id}
              label={t(`home.card.mineFact.${id}`)}
              caption={t(
                props.mine.includes(id)
                  ? 'home.card.shown'
                  : props.mine.length < MINE_MAX
                    ? 'home.card.add'
                    : 'home.card.mineFull',
              )}
              selected={props.mine.includes(id)}
              onPress={() => toggleMine(id)}
            />
          ))}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing.lg, borderRadius: radius.xl, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  main: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingStart: spacing.lg,
    paddingEnd: spacing.lg,
  },
  pressed: { opacity: 0.85 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: TAB_HEIGHT },
  shrink: { flexShrink: 1 },
  white: { color: BRAND.white },
  dim: { opacity: 0.78 },
  facts: { flexDirection: 'row' },
  fact: { flex: 1, minWidth: 0, paddingHorizontal: spacing.sm },
  factFirst: { flex: 1.5, paddingStart: 0 },
  factDivider: { borderStartWidth: StyleSheet.hairlineWidth, borderStartColor: alphaHex(BRAND.white, 0.3) },
  // The tabs sit on the title's line, at its end, so the card is two rows (the owner's pick of 2026-11-10).
  side: { position: 'absolute', top: spacing.sm, end: spacing.sm, flexDirection: 'row', alignItems: 'center' },
  tabs: { flexDirection: 'row', gap: 1 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: TAB_HEIGHT,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  tabOn: { backgroundColor: alphaHex(BRAND.white, 0.22) },
  smartDot: { width: scaled(5), height: scaled(5), borderRadius: radius.full, backgroundColor: BRAND.gold },
  more: {
    flexDirection: 'row',
    gap: scaled(3),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TAB_HEIGHT,
    paddingHorizontal: spacing.sm,
  },
  dot: { width: scaled(4), height: scaled(4), borderRadius: radius.full, backgroundColor: BRAND.white },
  chips: {
    paddingHorizontal: spacing.lg,
    paddingTop: CHIPS_TOP,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  chip: {
    minHeight: CHIP_MIN,
    paddingHorizontal: CHIP_PAD_X,
    paddingVertical: CHIP_PAD_Y,
    borderRadius: CHIP_RADIUS,
    borderWidth: BORDER,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  liveChip: { minWidth: LIVE_MIN_WIDTH },
  past: { opacity: 0.55 },
  chipLabel: { flexDirection: 'row', alignItems: 'center', gap: scaled(3) },
  fill: { position: 'absolute', top: 0, bottom: 0, start: 0 },
  track: {
    position: 'absolute',
    bottom: scaled(4),
    start: CHIP_PAD_X,
    end: CHIP_PAD_X,
    height: BAR_HEIGHT,
    borderRadius: radius.full,
    backgroundColor: alphaHex(BRAND.white, 0.22),
    overflow: 'hidden',
  },
  bar: { height: '100%', borderRadius: radius.full },
  sep: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs },
  sepLine: { width: StyleSheet.hairlineWidth, height: scaled(28), opacity: 0.4 },
  addChip: { alignItems: 'center', minWidth: CHIP_MIN, borderStyle: 'dashed', gap: scaled(2) },
  sheetBody: { maxHeight: scaled(460) },
});
