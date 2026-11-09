import React, { useMemo, useState } from 'react';
import {
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { BottomSheet, SheetAction } from './BottomSheet';
import { HeaderPill } from './ScreenHeader';
import { SectionLabel } from './SectionLabel';
import { backIcon, forwardIcon } from './MitzvahIcon';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { scaled } from '@/theme/scale';
import { radius, spacing } from '@/theme/tokens';
import { fontFamilies, typography } from '@/theme/typography';
import { clockOf, formatRemaining } from '@/utils/clock';
import { alphaHex, type DayFrame } from '@/utils/dayArc';
import {
  addWidget,
  BENTO_COLUMNS,
  moveWidget,
  packBento,
  removeWidget,
  replaceZman,
  resizeWidget,
  rowZmanim,
  widgetKey,
  type BentoWidget,
} from '@/utils/homeBento';
import { ARC_ZMANIM, type ZmanId } from '@/utils/zmanIds';

// Home's bento, inside the hero in place of the zmanim strip (the owner's pick of 2026-11-09; the defaults of each
// zone: .claude/specs/home-bento.md). The big tile is the next time that matters, the small ones the user's fixed
// zmanim, and one row holds the zmanim of the moment, the user's pins and, a sideways scroll away, the rest.
const ROW = scaled(46);
const STRIP = scaled(50);
const GAP = spacing.sm - 2;
const RING = scaled(32);
const TILE_ALPHA = 0.9;
const RING_SPAN_MS = 3 * 60 * 60 * 1000;

export type BentoNext = { label: string; at: Date; kind: 'end' | 'period' | 'opens' | 'zman'; onPress: () => void };
type Sheet = { mode: 'add' } | { mode: 'replace'; key: string } | { mode: 'pins' } | null;

export type HomeBentoProps = {
  widgets: readonly BentoWidget[];
  frame: DayFrame;
  now: Date;
  tz: string;
  hidden: readonly ZmanId[];
  pins: readonly ZmanId[];
  suggestions: readonly { id: ZmanId; reason: string }[];
  next: BentoNext | null;
  selected: ZmanId | null;
  onPick: (id: ZmanId) => void;
  onLayoutChange: (widgets: readonly BentoWidget[] | null) => void;
  onPinsChange: (pins: readonly ZmanId[]) => void;
  onEditingChange?: (editing: boolean) => void;
};

export function HomeBento({
  widgets,
  frame,
  now,
  tz,
  hidden,
  pins,
  suggestions,
  next,
  selected,
  onPick,
  onLayoutChange,
  onPinsChange,
  onEditingChange,
}: HomeBentoProps) {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const window = useWindowDimensions();
  // Starts from the window less the hero's side padding, so the first frame already has its tiles.
  const [width, setWidth] = useState(window.width - 2 * spacing.lg);
  const [editing, setEditing] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const times = useMemo(
    () => Object.fromEntries(frame.zmanim.map((z) => [z.id, z.at])) as Partial<Record<ZmanId, Date>>,
    [frame],
  );
  const inTiles = useMemo(() => new Set(widgets.flatMap((w) => (w.kind === 'zman' ? [w.id] : []))), [widgets]);
  const nextZmanId =
    next?.kind === 'zman' ? (ARC_ZMANIM.find((id) => times[id]?.getTime() === next.at.getTime()) ?? null) : null;
  const row = rowZmanim(now, times, inTiles, pins, hidden, nextZmanId);
  const { cells, rows } = packBento(widgets);
  const cellW = width > 0 ? (width - GAP * (BENTO_COLUMNS - 1)) / BENTO_COLUMNS : 0;
  const tileRows = rows - (widgets.some((w) => w.kind === 'row') ? 1 : 0);
  const height =
    tileRows * ROW + Math.max(0, tileRows - 1) * GAP + (rows > tileRows ? (tileRows ? GAP : 0) + STRIP : 0);
  const glass = alphaHex(colors.surface, TILE_ALPHA);
  const name = (id: ZmanId) => t(`home.zman.${id}.name`);
  const short = (id: ZmanId) => t(`home.zman.${id}.short`);
  const left = (at: Date) =>
    at.getTime() > now.getTime()
      ? t('home.bento.in', { time: formatRemaining(at.getTime() - now.getTime(), t) })
      : t('home.bento.passed');

  const setEdit = (on: boolean) => {
    setEditing(on);
    setChosen(null);
    onEditingChange?.(on);
  };
  const change = (nextList: BentoWidget[]) => {
    if (nextList !== widgets) onLayoutChange(nextList);
  };
  const chosenWidget = chosen ? widgets.find((w) => widgetKey(w) === chosen) : undefined;
  const sizeKey = chosenWidget && chosenWidget.kind !== 'row' ? chosenWidget.size : null;

  const tile = (w: BentoWidget) => {
    const key = widgetKey(w);
    const isChosen = editing && chosen === key;
    const border = isChosen ? { borderColor: colors.gold } : null;
    if (w.kind === 'next') {
      const ms = next ? next.at.getTime() - now.getTime() : 0;
      const share = next ? Math.max(0.04, Math.min(1, 1 - ms / RING_SPAN_MS)) : 0;
      const r = 13;
      const len = 2 * Math.PI * r;
      return (
        <Pressable
          testID="home-bento-next"
          accessibilityRole="button"
          accessibilityLabel={
            next
              ? `${t('home.bento.next')}, ${next.label}, ${clockOf(next.at, tz)}, ${left(next.at)}`
              : t('home.bento.none')
          }
          onPress={editing ? () => setChosen(key) : next?.onPress}
          style={[styles.tile, styles.big, { backgroundColor: alphaHex(colors.goldLight, 0.94) }, border]}
        >
          {w.size === 'b' ? (
            <Svg width={RING} height={RING} viewBox="0 0 32 32" style={styles.ring} accessible={false}>
              <Circle cx="16" cy="16" r={r} stroke={colors.surface2} strokeWidth={4} fill="none" />
              <Circle
                cx="16"
                cy="16"
                r={r}
                stroke={colors.gold}
                strokeWidth={4}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${len}`}
                strokeDashoffset={len * (1 - share)}
                transform="rotate(-90 16 16)"
              />
            </Svg>
          ) : null}
          <Text
            style={[typography.small, w.size === 'b' && styles.besideRing, { color: colors.textSub }]}
            numberOfLines={1}
          >
            {next ? `${t('home.bento.next')} · ${t(`home.bento.kind.${next.kind}`)}` : t('home.bento.next')}
          </Text>
          <Text
            style={[typography.bodyBold, w.size === 'b' && styles.besideRing, { color: colors.goldText }]}
            numberOfLines={1}
          >
            {next ? next.label : t('home.bento.none')}
          </Text>
          {next ? (
            <Text style={[w.size === 'b' ? styles.bigTime : typography.heading, { color: colors.text }]}>
              {clockOf(next.at, tz)}
            </Text>
          ) : null}
          {next && w.size === 'b' ? (
            <Text style={[typography.small, { color: colors.textSub }]} numberOfLines={1}>
              {left(next.at)}
            </Text>
          ) : null}
        </Pressable>
      );
    }
    if (w.kind === 'zman') {
      const at = times[w.id];
      const past = at ? at.getTime() <= now.getTime() : false;
      const isNext = nextZmanId === w.id || (!nextZmanId && next?.at.getTime() === at?.getTime());
      const marked = selected === w.id;
      return (
        <Pressable
          testID={`home-bento-zman-${w.id}`}
          accessibilityRole="button"
          accessibilityState={{ selected: editing ? isChosen : marked }}
          accessibilityLabel={at ? `${name(w.id)}, ${clockOf(at, tz)}, ${left(at)}` : name(w.id)}
          onPress={() => (editing ? setChosen(key) : onPick(w.id))}
          style={[
            styles.tile,
            w.size === 'w' && styles.wide,
            { backgroundColor: marked ? colors.text : glass },
            isNext && !editing && { borderColor: colors.gold },
            border,
            past && styles.past,
          ]}
        >
          <Text style={[typography.small, { color: marked ? colors.bg : colors.textSub }]} numberOfLines={1}>
            {w.size === 's' ? short(w.id) : name(w.id)}
          </Text>
          <Text
            style={[
              w.size === 'b' ? styles.bigTime : past ? typography.body : typography.heading,
              { color: marked ? colors.bg : colors.text },
            ]}
          >
            {at ? clockOf(at, tz) : '--:--'}
          </Text>
          {w.size === 'b' && at ? <Text style={[typography.small, { color: colors.textSub }]}>{left(at)}</Text> : null}
        </Pressable>
      );
    }
    const chip = (id: ZmanId, kind: 'now' | 'mine' | 'rest') => {
      const at = times[id]!;
      const past = at.getTime() <= now.getTime();
      return (
        <Pressable
          key={`${kind}-${id}`}
          testID={`home-bento-${kind}-${id}`}
          accessibilityRole="button"
          accessibilityLabel={`${name(id)}, ${clockOf(at, tz)}, ${t(`home.bento.${kind}`)}`}
          onPress={() => onPick(id)}
          style={[
            styles.chip,
            kind === 'now' && { backgroundColor: colors.goldLight },
            kind === 'mine' && { borderColor: colors.border, backgroundColor: colors.surface },
            kind === 'rest' && { backgroundColor: colors.surface2 },
            past && styles.past,
          ]}
        >
          <Text style={[typography.caption, { color: kind === 'now' ? colors.goldText : colors.text }]}>
            {short(id)}
          </Text>
          <Text style={[typography.bodyBold, { color: kind === 'now' ? colors.goldText : colors.text }]}>
            {clockOf(at, tz)}
          </Text>
        </Pressable>
      );
    };
    return (
      <View style={[styles.tile, styles.strip, { backgroundColor: glass }, border]}>
        {editing ? (
          <Pressable
            testID="home-bento-row"
            accessibilityRole="button"
            accessibilityLabel={t('home.bento.widget.row')}
            onPress={() => setChosen(key)}
            style={styles.rowPick}
          >
            <Text style={[typography.captionBold, { color: colors.text }]}>{t('home.bento.widget.row')}</Text>
          </Pressable>
        ) : (
          <ScrollView
            testID="home-bento-row"
            horizontal
            showsHorizontalScrollIndicator={false}
            accessibilityLabel={t('home.bento.widget.row')}
            contentContainerStyle={styles.rowContent}
          >
            {row.now.map((id) => chip(id, 'now'))}
            {row.mine.map((id) => chip(id, 'mine'))}
            <Pressable
              testID="home-bento-pin"
              accessibilityRole="button"
              accessibilityLabel={t('home.bento.addPin')}
              onPress={() => setSheet({ mode: 'pins' })}
              style={[styles.chip, styles.add, { borderColor: colors.gold }]}
            >
              <Text style={[typography.heading, { color: colors.goldText }]}>+</Text>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            {row.rest.map((id) => chip(id, 'rest'))}
          </ScrollView>
        )}
      </View>
    );
  };

  const close = () => setSheet(null);
  const used = new Set(widgets.map(widgetKey));
  const shownZmanim = ARC_ZMANIM.filter((id) => !hidden.includes(id) && times[id]);

  return (
    <View testID="home-bento" style={styles.root}>
      <View style={styles.bar}>
        {editing ? (
          <>
            <HeaderPill label={t('home.bento.reset')} onPress={() => onLayoutChange(null)} />
            <HeaderPill label={t('home.bento.addTile')} onPress={() => setSheet({ mode: 'add' })} />
          </>
        ) : null}
        <View style={styles.flex} />
        <HeaderPill
          label={editing ? t('home.bento.done') : t('home.bento.edit')}
          selected={editing}
          onPress={() => setEdit(!editing)}
        />
      </View>
      <View
        style={{ height }}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        accessibilityLabel={t('home.bento.label')}
      >
        {cellW > 0
          ? cells.map((c) => {
              const w = widgets.find((x) => widgetKey(x) === c.key)!;
              const top = c.row * (ROW + GAP);
              const isRow = w.kind === 'row';
              return (
                <View
                  key={c.key}
                  style={[
                    styles.cell,
                    {
                      top,
                      start: c.col * (cellW + GAP),
                      width: c.w * cellW + (c.w - 1) * GAP,
                      height: isRow ? STRIP : c.h * ROW + (c.h - 1) * GAP,
                    },
                  ]}
                >
                  {tile(w)}
                </View>
              );
            })
          : null}
      </View>
      {editing ? (
        <View testID="home-bento-tools" style={[styles.tools, { backgroundColor: glass }]}>
          {chosenWidget ? (
            <>
              <Text style={[typography.captionBold, styles.toolName, { color: colors.text }]}>
                {chosenWidget.kind === 'zman' ? name(chosenWidget.id) : t(`home.bento.widget.${chosenWidget.kind}`)}
              </Text>
              {chosenWidget.kind === 'zman' ? (
                <HeaderPill
                  label={t('home.bento.replace')}
                  onPress={() => setSheet({ mode: 'replace', key: chosenWidget.id })}
                />
              ) : null}
              {sizeKey ? (
                <HeaderPill
                  label={t('home.bento.size', { size: t(`home.bento.size.${sizeKey}`) })}
                  onPress={() => change(resizeWidget([...widgets], chosen!))}
                />
              ) : null}
              <HeaderPill
                icon={backIcon(language)}
                accessibilityLabel={t('home.bento.moveEarlier')}
                onPress={() => change(moveWidget([...widgets], chosen!, -1))}
              />
              <HeaderPill
                icon={forwardIcon(language)}
                accessibilityLabel={t('home.bento.moveLater')}
                onPress={() => change(moveWidget([...widgets], chosen!, 1))}
              />
              <HeaderPill
                label={t('home.bento.remove')}
                onPress={() => {
                  change(removeWidget([...widgets], chosen!));
                  setChosen(null);
                }}
              />
            </>
          ) : (
            <Text style={[typography.small, { color: colors.textSub }]}>{t('home.bento.selectHint')}</Text>
          )}
        </View>
      ) : null}
      <BottomSheet
        visible={sheet !== null && sheet.mode !== 'pins'}
        title={sheet?.mode === 'replace' ? t('home.bento.sheet.replace') : t('home.bento.sheet.add')}
        onClose={close}
      >
        <ScrollView style={styles.sheetList}>
          {sheet?.mode === 'add' && !used.has('next') ? (
            <SheetAction
              label={t('home.bento.widget.next')}
              caption={t('home.bento.widget.nextCaption')}
              onPress={() => {
                change(addWidget([...widgets], { kind: 'next', size: 'b' }));
                close();
              }}
            />
          ) : null}
          {sheet?.mode === 'add' && !used.has('row') ? (
            <SheetAction
              label={t('home.bento.widget.row')}
              caption={t('home.bento.widget.rowCaption')}
              onPress={() => {
                change(addWidget([...widgets], { kind: 'row' }));
                close();
              }}
            />
          ) : null}
          {shownZmanim
            .filter((id) => !used.has(id))
            .map((id) => (
              <SheetAction
                key={id}
                label={name(id)}
                caption={clockOf(times[id]!, tz)}
                onPress={() => {
                  if (sheet?.mode === 'replace') {
                    change(replaceZman([...widgets], sheet.key, id));
                    setChosen(id);
                  } else {
                    const after = addWidget([...widgets], { kind: 'zman', id, size: 's' });
                    change(after);
                    if (after !== widgets) setChosen(id);
                  }
                  close();
                }}
              />
            ))}
        </ScrollView>
      </BottomSheet>
      <BottomSheet
        visible={sheet?.mode === 'pins'}
        title={t('home.bento.pins.title')}
        caption={t('home.bento.pins.caption')}
        onClose={close}
      >
        <ScrollView style={styles.sheetList}>
          {suggestions.length ? <SectionLabel variant="field" text={t('home.bento.pins.suggested')} /> : null}
          {suggestions.map((s) => (
            <SheetAction
              key={`s-${s.id}`}
              label={name(s.id)}
              caption={`${times[s.id] ? clockOf(times[s.id]!, tz) : ''} · ${t(`home.bento.reason.${s.reason}`)}`}
              selected={pins.includes(s.id)}
              onPress={() => onPinsChange(pins.includes(s.id) ? pins.filter((p) => p !== s.id) : [...pins, s.id])}
            />
          ))}
          <SectionLabel variant="field" text={t('home.bento.pins.more')} />
          {shownZmanim
            .filter((id) => !suggestions.some((s) => s.id === id))
            .map((id) => (
              <SheetAction
                key={id}
                label={name(id)}
                caption={inTiles.has(id) ? t('home.bento.inTile') : clockOf(times[id]!, tz)}
                selected={pins.includes(id)}
                onPress={() => onPinsChange(pins.includes(id) ? pins.filter((p) => p !== id) : [...pins, id])}
              />
            ))}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, gap: spacing.xs },
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  flex: { flex: 1 },
  cell: { position: 'absolute' },
  tile: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  big: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  wide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  strip: { paddingHorizontal: 0, paddingVertical: 0 },
  rowContent: { alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs },
  rowPick: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chip: {
    minHeight: scaled(40),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  add: { borderStyle: 'dashed', borderWidth: 1.5, minWidth: scaled(40), justifyContent: 'center' },
  divider: { width: 1, alignSelf: 'stretch', marginVertical: spacing.sm },
  past: { opacity: 0.62 },
  ring: { position: 'absolute', top: spacing.sm, end: spacing.sm },
  besideRing: { marginEnd: RING + spacing.xs },
  bigTime: { fontFamily: fontFamilies.ui.black, fontSize: scaled(26), lineHeight: scaled(30) },
  tools: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.lg,
  },
  toolName: { flexBasis: '100%' },
  sheetList: { maxHeight: scaled(420) },
});
