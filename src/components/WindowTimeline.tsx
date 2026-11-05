import React, { useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useRowMirrored } from '@/hooks/useRowMirrored';
import { useI18n } from '@/i18n';
// The pure planner itself, as NagLevelPicker reads it: the timeline is what the plan sends, never a copy of its rules.
import {
  windowTimeline,
  type TimelineSend,
  type WindowTimeline as Timeline,
} from '@/services/notifications/planners/mitzvot';
import { scaled } from '@/theme/scale';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import type { ManualNag, Mitzvah, NagLevel, Reminder, UserSettings } from '@/types/mitzvah';
import type { Location } from '@/types/zmanim';
import type { DayWindow } from '@/utils/buildDayTimeline';
import { clockOf } from '@/utils/clock';
import { reminderLabel } from '@/utils/mitzvahName';
import type { QuietHours } from '@/utils/quietHours';
import {
  TIMELINE_STEP_MIN,
  clampToWindow,
  nagsEdited,
  reminderAt,
  reminderDraggable,
  reminderMovedTo,
  shareOf,
  timeAtShare,
  timelineView,
  type TimelineNag,
} from '@/utils/timeline';
import { NAG_MIN_GAP_MIN } from '@/utils/nagging';
import { timeLeftLine } from '@/utils/timeLeft';
import { Button } from './Button';
import { Card } from './Card';
import { HeaderPill } from './ScreenHeader';
import { SettingsSection } from './SettingsSection';
import { MitzvahIcon } from './MitzvahIcon';

const AXIS_HEIGHT = scaled(76);
const BAR_TOP = scaled(32);
const BAR_HEIGHT = scaled(10);
const ZONE_INSET = scaled(14);
const DOT_TOUCH = scaled(44);
const DOT_TOP = scaled(16);
const REMINDER_DOT = scaled(30);
const NAG_DOT = scaled(14);
const LAST_DOT = scaled(18);
const DOT_RING = scaled(3);
const BELL_SIZE = scaled(17);
const TIP_TOP = scaled(-14);
const LEGEND_DOT = scaled(10);
const CLOSE_SIZE = scaled(14);
const STEP_WIDTH = scaled(48);
const STEP_HEIGHT = scaled(36);
const LIST_DOT = scaled(10);
const SELECTED_SCALE = 1.25;
// A finger-distance gesture threshold, not a drawn size, so it stays unscaled.
const DRAG_SLOP = 6;
// A left-to-right mark, so a sign stays before its digit in a right-to-left row.
const LRM = '‎';
const MIN = 60_000;

type Selection = { type: 'reminder'; index: number } | { type: 'nag'; at: number };
type Draft = { selection: Selection; from: number; at: number };
type Gesture = { send: TimelineSend; x: number; y: number; mode: 'pending' | 'drag' | 'scroll'; draggable: boolean };

type Props = {
  mitzvah: Mitzvah;
  // The mitzvah's displayed name: the notification's title, and the label of a reminder added on the axis.
  name: string;
  // The window the screen shows (`currentOrNextWindow()`), or null with none ahead.
  window: DayWindow | null;
  reminders: Reminder[];
  manualNags: ManualNag[] | undefined;
  nagLevel: NagLevel;
  location: Location;
  settings: UserSettings;
  quietHours?: QuietHours;
  onRemindersChange: (next: Reminder[]) => void;
  onManualNagsChange: (next: ManualNag[] | null) => void;
  onEditReminder: (index: number) => void;
  onDeleteReminder: (index: number) => void;
  // Whether the reminders or the nags differ from the defaults, and the one reset that brings both back.
  changed: boolean;
  onReset: () => void;
};

// Why the timeline did not do what a gesture asked, said under the axis until the next gesture.
type Notice =
  { kind: 'tooClose' } | { kind: 'quiet' } | { kind: 'moved'; time: string } | { kind: 'nagsDropped'; n: number };

// A point along the axis, from its start: `start` on native, which follows the layout direction, and the physical edge
// on the web, where react-native-web keeps `start` physical; `offset` centres an element twice that wide on the point.
function along(share: number, mirrored: boolean, offset = 0): ViewStyle {
  const at = `${Number((share * 100).toFixed(3))}%` as `${number}%`;
  const style: ViewStyle = Platform.OS === 'web' ? (mirrored ? { right: at } : { left: at }) : { start: at };
  return offset ? { ...style, transform: [{ translateX: (mirrored ? 1 : -1) * offset }] } : style;
}

const nagsOf = (timeline: Timeline | null): TimelineNag[] =>
  (timeline?.sends ?? []).flatMap((send) =>
    send.type === 'nag'
      ? [{ at: send.at, kind: send.kind, ...(send.lastChance ? { lastChance: send.lastChance } : {}) }]
      : [],
  );

const isSelected = (send: TimelineSend, selection: Selection | null) =>
  selection !== null &&
  (selection.type === 'reminder'
    ? send.type === 'reminder' && send.index === selection.index
    : send.type === 'nag' && send.at === selection.at);

const selectionOf = (send: TimelineSend): Selection =>
  send.type === 'reminder' ? { type: 'reminder', index: send.index } : { type: 'nag', at: send.at };

// The mitzvah screen's time window card with every notification of the window on its axis (the owner's pick of
// 2026-11-05, direction א of design/lab/studies/2026-11-04-timeline-dots): a gold bell dot per reminder, a dot per nag
// and a diamond per last-chance point, in the stage colour, over the critical zone's band. A reminder drags and the
// smart nag follows it; a nag drags too, and the mitzvah's nags are then the user's until "חזרה לנודניק החכם"; a tap
// opens the values, a tap on an empty stretch adds a reminder there, and the list under the card names every send.
export function WindowTimeline(props: Props) {
  const { mitzvah, name, window, reminders, manualNags, nagLevel, location, settings, quietHours } = props;
  const { colors } = useTheme();
  const { t } = useI18n();
  const mirrored = useRowMirrored();
  const [width, setWidth] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const axisGesture = useRef<{ x: number; y: number } | null>(null);

  const scope = useMemo(
    () => ({ location, settings, quietHours, nagLevel }),
    [location, settings, quietHours, nagLevel],
  );
  const base = useMemo(
    () => (window ? windowTimeline(mitzvah, reminders, window.date, { ...scope, manualNags }) : null),
    [mitzvah, reminders, window, scope, manualNags],
  );
  // What an edit in progress or about to be saved leaves: the reminders and the user's nags.
  const edited = (change: Draft): { reminders: Reminder[]; manualNags: ManualNag[] | undefined } => {
    if (!window || !base) return { reminders, manualNags };
    if (change.selection.type === 'reminder') {
      const { index } = change.selection;
      return {
        reminders: reminders.map((reminder, i) =>
          i === index ? reminderMovedTo(reminder, new Date(change.at), window, location.tz) : reminder,
        ),
        manualNags,
      };
    }
    return { reminders, manualNags: nagsEdited(nagsOf(base), window, change.from, new Date(change.at)) };
  };
  const shown = useMemo(() => {
    if (!draft || !window) return base;
    const next = edited(draft);
    return windowTimeline(mitzvah, next.reminders, window.date, { ...scope, manualNags: next.manualNags });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `edited` reads the same inputs, listed here
  }, [draft, base, window, mitzvah, reminders, manualNags, scope, location.tz]);

  const view = window && shown ? timelineView(window, shown.zone, zoomed) : null;
  const viewLength = view ? view.end.getTime() - view.start.getTime() : 0;
  const sends = shown?.sends ?? [];
  // While a nag is dragged it is the one at the draft's instant; a dragged reminder keeps its index.
  const activeSelection: Selection | null = draft
    ? draft.selection.type === 'nag'
      ? { type: 'nag', at: draft.at }
      : draft.selection
    : selection;
  // A dot's element key stays put through a drag, or the element would remount and lose the touch: a reminder's by its
  // index, a nag's by the instant it had when the drag began.
  const keyOf = (send: TimelineSend) =>
    send.type === 'reminder'
      ? `r${send.index}.${send.occurrence}`
      : `n@${draft?.selection.type === 'nag' && send.at === draft.at ? draft.from : send.at}`;
  const idOf = (send: TimelineSend) => (send.type === 'reminder' ? `r${send.index}.${send.occurrence}` : `n${send.k}`);
  const selected = sends.find((send) => isSelected(send, activeSelection)) ?? null;

  const kindName = (send: TimelineSend) =>
    send.type === 'reminder'
      ? t('detail.timeline.kind.reminder')
      : send.kind === 'lastChance'
        ? t(send.lastChance === 'minyan' ? 'detail.timeline.kind.minyan' : 'detail.timeline.kind.alone')
        : t(send.kind === 'sparse' ? 'detail.timeline.kind.sparse' : 'detail.timeline.kind.zone');
  const messageOf = (send: TimelineSend) => {
    if (send.type === 'reminder') return reminderLabel(reminders[send.index] ?? { anchor: 'start', label: '' }, name);
    if (send.kind !== 'lastChance') return t('notifications.nag.notMarked');
    return t(send.lastChance === 'minyan' ? 'notifications.nag.lastChanceMinyan' : 'notifications.nag.lastChance');
  };
  const stageColor = (send: TimelineSend) =>
    send.stage === 'red' ? colors.urgent : send.stage === 'orange' ? colors.warning : colors.safe;
  const draggable = (send: TimelineSend) =>
    Boolean(window) &&
    (send.type === 'nag'
      ? true
      : reminderDraggable(reminders[send.index] ?? { anchor: 'followUp', offsetMin: 0, label: '' }, window!));
  const inView = (send: TimelineSend) =>
    view !== null && send.at >= view.start.getTime() && send.at <= view.end.getTime();

  // ---- the 10-minute rule (the smart nag's spec 2.4) and what a change leaves ----
  // The sends that stay where they are while `selection` moves: for a nag every other send, for a reminder the other
  // reminders and the user's own nags (the smart nag's nags rearrange around it).
  const blockers = (moving: Selection | null) =>
    (base?.sends ?? []).filter((send) => {
      if (moving?.type === 'nag') return !(send.type === 'nag' && send.at === moving.at);
      if (send.type === 'nag') return Boolean(manualNags);
      return !(moving?.type === 'reminder' && send.index === moving.index);
    });
  const allowedAt = (at: number, moving: Selection | null) =>
    blockers(moving).every((send) => Math.abs(send.at - at) >= NAG_MIN_GAP_MIN * MIN);
  // What the saved change sends, said when it is not what the gesture asked: a send the quiet hours or a holy block
  // moved or dropped, or nags the smart nag had no room for.
  const explain = (
    asked: number,
    next: { reminders: Reminder[]; manualNags: ManualNag[] | undefined },
    target: Selection,
  ) => {
    if (!window) return;
    const after = windowTimeline(mitzvah, next.reminders, window.date, { ...scope, manualNags: next.manualNags });
    const sends = after?.sends ?? [];
    const landed =
      target.type === 'reminder'
        ? sends.find((send) => send.type === 'reminder' && send.index === target.index)
        : sends.find((send) => send.type === 'nag' && send.at === asked);
    if (!landed) {
      setNotice({ kind: 'quiet' });
      return;
    }
    if (landed && landed.at !== asked) {
      setNotice({ kind: 'moved', time: clockOf(new Date(landed.at), location.tz) });
      return;
    }
    const dropped = nagsOf(base).length - sends.filter((send) => send.type === 'nag').length;
    if (target.type === 'reminder' && dropped > 0) setNotice({ kind: 'nagsDropped', n: dropped });
  };

  // ---- saving an edit ----
  const commit = (change: Draft) => {
    if (!window) return;
    const at = clampToWindow(change.at, window).getTime();
    const next = edited({ ...change, at });
    if (change.selection.type === 'reminder') {
      props.onRemindersChange(next.reminders);
      setSelection(change.selection);
    } else {
      props.onManualNagsChange(next.manualNags ?? null);
      setSelection({ type: 'nag', at });
    }
    explain(at, next, change.selection);
  };
  const step = (send: TimelineSend, minutes: number) => {
    setNotice(null);
    const at = window ? clampToWindow(send.at + minutes * MIN, window).getTime() : send.at;
    if (!allowedAt(at, selectionOf(send))) {
      setNotice({ kind: 'tooClose' });
      return;
    }
    commit({ selection: selectionOf(send), from: send.at, at });
  };
  const remove = (send: TimelineSend) => {
    setSelection(null);
    if (send.type === 'reminder') props.onDeleteReminder(send.index);
    else if (window) props.onManualNagsChange(nagsEdited(nagsOf(base), window, send.at, null));
  };
  const select = (send: TimelineSend) =>
    setSelection((current) => (current && isSelected(send, current) ? null : selectionOf(send)));

  // ---- the gestures: a dot takes the touch through the responder system, as the nagging level's slider does ----
  const shareDelta = (dx: number) => (width > 0 ? ((mirrored ? -1 : 1) * dx) / width : 0);
  const dotHandlers = (send: TimelineSend) => ({
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => gesture.current?.mode !== 'drag',
    onResponderGrant: (event: GestureResponderEvent) => {
      setNotice(null);
      gesture.current = {
        send,
        x: event.nativeEvent.pageX,
        y: event.nativeEvent.pageY,
        mode: 'pending',
        draggable: draggable(send),
      };
    },
    onResponderMove: (event: GestureResponderEvent) => {
      const current = gesture.current;
      if (!current || current.mode === 'scroll' || !view) return;
      const dx = event.nativeEvent.pageX - current.x;
      if (current.mode === 'pending') {
        const dy = event.nativeEvent.pageY - current.y;
        if (Math.abs(dx) <= DRAG_SLOP && Math.abs(dy) <= DRAG_SLOP) return;
        current.mode = Math.abs(dx) > Math.abs(dy) && current.draggable ? 'drag' : 'scroll';
        if (current.mode === 'scroll') return;
      }
      const moving = selectionOf(current.send);
      const at = clampToWindow(current.send.at + shareDelta(dx) * viewLength, window!).getTime();
      // A spot within 10 minutes of another notification is refused: the dot stays at its last allowed place.
      if (!allowedAt(at, moving)) {
        setNotice({ kind: 'tooClose' });
        if (!draft) setDraft({ selection: moving, from: current.send.at, at: current.send.at });
        return;
      }
      setNotice(null);
      setDraft({ selection: moving, from: current.send.at, at });
    },
    onResponderRelease: () => {
      const current = gesture.current;
      gesture.current = null;
      if (current?.mode === 'pending') select(current.send);
      else if (current?.mode === 'drag' && draft && draft.at !== draft.from) commit(draft);
      setDraft(null);
    },
    onResponderTerminate: () => {
      gesture.current = null;
      setDraft(null);
    },
  });
  const axisHandlers = {
    onStartShouldSetResponder: () => Boolean(window && view),
    onResponderTerminationRequest: () => true,
    onResponderGrant: (event: GestureResponderEvent) => {
      setNotice(null);
      axisGesture.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
    },
    onResponderRelease: (event: GestureResponderEvent) => {
      const start = axisGesture.current;
      axisGesture.current = null;
      if (!start || !window || !view || width <= 0) return;
      const moved = Math.max(Math.abs(event.nativeEvent.pageX - start.x), Math.abs(event.nativeEvent.pageY - start.y));
      if (moved > DRAG_SLOP) return;
      const physical = Math.min(1, Math.max(0, event.nativeEvent.locationX / width));
      const at = timeAtShare(mirrored ? 1 - physical : physical, view);
      const added = reminderAt(at, window, name);
      const addedAt = clampToWindow(at.getTime(), window).getTime();
      if (!allowedAt(addedAt, null)) {
        setNotice({ kind: 'tooClose' });
        return;
      }
      const next = [...reminders, added];
      props.onRemindersChange(next);
      setSelection({ type: 'reminder', index: reminders.length });
      explain(addedAt, { reminders: next, manualNags }, { type: 'reminder', index: reminders.length });
    },
    onResponderTerminate: () => {
      axisGesture.current = null;
    },
  };

  const count = sends.length;
  const time = (at: number) => clockOf(new Date(at), location.tz);
  const steppable = selected !== null && inView(selected) && draggable(selected);

  return (
    <>
      <Card padded>
        <View style={styles.head}>
          <Text style={[typography.captionBold, styles.title, { color: colors.textSub }]}>
            {t('detail.timeWindow')}
          </Text>
          {window ? (
            <Text style={[typography.small, { color: colors.textSub }]} testID="timeline-count">
              {count === 1 ? t('detail.timeline.count.once') : t('detail.timeline.count', { n: count })}
            </Text>
          ) : null}
        </View>
        {shown?.zone.length ? (
          <View style={styles.zoomRow}>
            <HeaderPill
              label={zoomed ? t('detail.timeline.zoomOut') : t('detail.timeline.zoom')}
              selected={zoomed}
              onPress={() => setZoomed((value) => !value)}
            />
          </View>
        ) : null}
        <View
          testID="timeline-axis"
          style={styles.axis}
          onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
          {...axisHandlers}
        >
          {view
            ? shown!.zone.map((part, index) => {
                const from = Math.max(0, shareOf(part.start.getTime(), view));
                const to = Math.min(1, shareOf(part.end.getTime(), view));
                if (to <= from) return null;
                return (
                  <View
                    key={`zone-${index}`}
                    pointerEvents="none"
                    testID="timeline-zone"
                    style={[
                      styles.zone,
                      along(from, mirrored),
                      {
                        width: `${(to - from) * 100}%`,
                        backgroundColor: colors.goldWashStrong,
                        borderColor: colors.gold,
                      },
                    ]}
                  />
                );
              })
            : null}
          {view && draft
            ? blockers(draft.selection.type === 'nag' ? { type: 'nag', at: draft.from } : draft.selection).map(
                (send) => {
                  const gap = NAG_MIN_GAP_MIN * MIN;
                  const from = Math.max(0, shareOf(send.at - gap, view));
                  const to = Math.min(1, shareOf(send.at + gap, view));
                  if (to <= from) return null;
                  return (
                    <View
                      key={`gap-${send.at}`}
                      pointerEvents="none"
                      testID="timeline-gap"
                      style={[
                        styles.gap,
                        along(from, mirrored),
                        { width: `${(to - from) * 100}%`, backgroundColor: colors.urgent },
                      ]}
                    />
                  );
                },
              )
            : null}
          <View pointerEvents="none" style={styles.bar}>
            <Svg width="100%" height={BAR_HEIGHT} viewBox="0 0 100 10" preserveAspectRatio="none">
              <Defs>
                <LinearGradient id="timelineGradient" x1={mirrored ? '100%' : '0%'} x2={mirrored ? '0%' : '100%'}>
                  <Stop offset="0%" stopColor={colors.safe} />
                  <Stop offset="40%" stopColor={colors.warning} />
                  <Stop offset="100%" stopColor={colors.urgent} />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width={100} height={10} rx={5} fill="url(#timelineGradient)" />
            </Svg>
          </View>
          {view
            ? sends.filter(inView).map((send) => {
                const on = isSelected(send, activeSelection);
                const label = t('detail.timeline.dot', { kind: kindName(send), time: time(send.at) });
                return (
                  <View
                    key={keyOf(send)}
                    testID={`timeline-dot-${idOf(send)}`}
                    style={[
                      styles.dot,
                      along(shareOf(send.at, view), mirrored, DOT_TOUCH / 2),
                      on ? styles.dotOn : null,
                    ]}
                    accessible
                    accessibilityRole="adjustable"
                    accessibilityLabel={label}
                    accessibilityState={{ selected: on }}
                    accessibilityActions={[{ name: 'activate' }, { name: 'increment' }, { name: 'decrement' }]}
                    onAccessibilityAction={(event) => {
                      const action = event.nativeEvent.actionName;
                      if (action === 'activate') select(send);
                      else if (draggable(send))
                        step(send, action === 'increment' ? TIMELINE_STEP_MIN : -TIMELINE_STEP_MIN);
                    }}
                    {...dotHandlers(send)}
                  >
                    {send.type === 'reminder' ? (
                      <View
                        pointerEvents="none"
                        style={[
                          styles.reminderDot,
                          { backgroundColor: colors.gold, borderColor: colors.surface },
                          on ? styles.grown : null,
                        ]}
                      >
                        <MitzvahIcon name="bell" size={BELL_SIZE} color={colors.onGold} />
                      </View>
                    ) : send.kind === 'lastChance' ? (
                      <View
                        pointerEvents="none"
                        style={[
                          styles.lastDot,
                          { backgroundColor: stageColor(send), borderColor: colors.surface },
                          on ? styles.lastGrown : null,
                        ]}
                      />
                    ) : (
                      <View
                        pointerEvents="none"
                        style={[
                          styles.nagDot,
                          { backgroundColor: stageColor(send), borderColor: colors.surface },
                          on ? styles.grown : null,
                        ]}
                      />
                    )}
                    {on ? (
                      <View pointerEvents="none" style={[styles.tip, { backgroundColor: colors.text }]}>
                        <Text style={[typography.small, { color: colors.bg }]}>{time(send.at)}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })
            : null}
        </View>
        <View style={styles.ends}>
          <Text style={[typography.micro, { color: colors.textMuted }]}>
            {view ? clockOf(view.start, location.tz) : '--:--'}
          </Text>
          <Text style={[typography.micro, { color: colors.textMuted }]}>
            {view ? clockOf(view.end, location.tz) : '--:--'}
          </Text>
        </View>
        <View style={styles.legend}>
          {(
            [
              ['detail.timeline.legend.reminder', colors.gold, 'round'],
              ['detail.timeline.legend.nag', colors.warning, 'round'],
              ['detail.timeline.legend.lastChance', colors.urgent, 'diamond'],
              ['detail.timeline.legend.zone', colors.goldWashStrong, 'band'],
            ] as const
          ).map(([key, color, shape]) => (
            <View key={key} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  shape === 'diamond' ? styles.legendDiamond : shape === 'band' ? styles.legendBand : null,
                  { backgroundColor: color, borderColor: colors.gold },
                ]}
              />
              <Text style={[typography.micro, { color: colors.textSub }]}>{t(key)}</Text>
            </View>
          ))}
        </View>
        {!window ? (
          <Text style={[typography.small, styles.note, { color: colors.textMuted }]}>
            {t('detail.timeline.noWindow')}
          </Text>
        ) : count === 0 ? (
          <Text style={[typography.small, styles.note, { color: colors.textMuted }]}>{t('detail.timeline.empty')}</Text>
        ) : (
          <Text style={[typography.small, styles.note, { color: colors.textMuted }]}>{t('detail.timeline.hint')}</Text>
        )}
        {notice ? (
          <Text
            testID="timeline-notice"
            accessibilityLiveRegion="polite"
            style={[
              typography.small,
              styles.note,
              { color: notice.kind === 'tooClose' ? colors.urgent : colors.textSub },
            ]}
          >
            {notice.kind === 'tooClose'
              ? t('detail.timeline.notice.tooClose', { min: NAG_MIN_GAP_MIN })
              : notice.kind === 'quiet'
                ? t('detail.timeline.notice.quiet')
                : notice.kind === 'moved'
                  ? t('detail.timeline.notice.moved', { time: notice.time })
                  : t(
                      notice.n === 1 ? 'detail.timeline.notice.nagsDropped.once' : 'detail.timeline.notice.nagsDropped',
                      {
                        n: notice.n,
                        min: NAG_MIN_GAP_MIN,
                      },
                    )}
          </Text>
        ) : null}
        {props.changed ? (
          <View style={styles.manual} testID="timeline-manual">
            <Text style={[typography.small, { color: colors.textSub }]}>
              {manualNags ? t('detail.timeline.manualNote') : t('detail.timeline.changedNote')}
            </Text>
            <Button
              variant="secondary"
              size="compact"
              icon="repeat"
              label={t('detail.timeline.reset')}
              onPress={() => {
                setSelection(null);
                setNotice(null);
                props.onReset();
              }}
            />
          </View>
        ) : null}
        {selected && window ? (
          <View
            testID="timeline-panel"
            style={[styles.panel, { backgroundColor: colors.surface, borderColor: stageColor(selected) }]}
          >
            <View style={styles.panelHead}>
              <Text style={[typography.bodyBold, styles.title, { color: colors.text }]}>{kindName(selected)}</Text>
              <Text style={[typography.bodyBold, { color: colors.goldText }]}>{time(selected.at)}</Text>
              <Pressable
                onPress={() => setSelection(null)}
                accessibilityRole="button"
                accessibilityLabel={t('detail.timeline.closePanel')}
                hitSlop={scaled(10)}
                style={styles.close}
              >
                <MitzvahIcon name="close" size={CLOSE_SIZE} color={colors.textMuted} />
              </Pressable>
            </View>
            <View style={[styles.preview, { backgroundColor: colors.surface2 }]} testID="timeline-preview">
              <Text style={[typography.micro, { color: colors.textMuted }]}>{t('detail.timeline.preview')}</Text>
              <Text style={[typography.small, { color: colors.text }]}>
                {timeLeftLine(new Date(selected.at), window, location.tz, t, selected.stage)}
              </Text>
              <Text style={[typography.bodyBold, { color: colors.text }]}>{name}</Text>
              <Text style={[typography.caption, { color: colors.textSub }]}>{messageOf(selected)}</Text>
            </View>
            {steppable ? (
              <View style={[styles.stepper, { backgroundColor: colors.surface2 }]}>
                <Pressable
                  onPress={() => step(selected, -TIMELINE_STEP_MIN)}
                  accessibilityRole="button"
                  accessibilityLabel={t('detail.timeline.earlier')}
                  style={styles.step}
                >
                  <Text style={[typography.bodyBold, { color: colors.text }]}>{`${LRM}-${TIMELINE_STEP_MIN}`}</Text>
                </Pressable>
                <Text style={[typography.bodyBold, { color: colors.text }]}>{time(selected.at)}</Text>
                <Pressable
                  onPress={() => step(selected, TIMELINE_STEP_MIN)}
                  accessibilityRole="button"
                  accessibilityLabel={t('detail.timeline.later')}
                  style={styles.step}
                >
                  <Text style={[typography.bodyBold, { color: colors.text }]}>{`${LRM}+${TIMELINE_STEP_MIN}`}</Text>
                </Pressable>
              </View>
            ) : null}
            <View style={styles.actions}>
              {selected.type === 'reminder' ? (
                <Button
                  variant="secondary"
                  size="compact"
                  label={t('detail.timeline.fullEdit')}
                  onPress={() => props.onEditReminder(selected.index)}
                  style={styles.action}
                />
              ) : null}
              <Button
                variant="danger"
                size="compact"
                label={t('detail.timeline.delete')}
                onPress={() => remove(selected)}
                style={styles.action}
              />
            </View>
          </View>
        ) : null}
      </Card>
      {count ? (
        <SettingsSection
          title={t('detail.timeline.listTitle')}
          subtitle={count === 1 ? t('detail.timeline.count.once') : t('detail.timeline.count', { n: count })}
          icon="bell"
          collapsible
          expanded={listOpen}
          onToggle={() => setListOpen((open) => !open)}
        >
          {sends.map((send) => {
            const on = isSelected(send, activeSelection);
            return (
              <Pressable
                key={keyOf(send)}
                testID={`timeline-row-${idOf(send)}`}
                onPress={() => select(send)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t('detail.timeline.dot', { kind: kindName(send), time: time(send.at) })}
                style={[
                  styles.row,
                  { borderBottomColor: colors.border },
                  on ? { backgroundColor: colors.goldWash } : null,
                ]}
              >
                <View
                  style={[
                    styles.listDot,
                    { backgroundColor: send.type === 'reminder' ? colors.gold : stageColor(send) },
                  ]}
                />
                <View style={styles.rowText}>
                  <Text style={[typography.bodyBold, { color: colors.text }]}>{kindName(send)}</Text>
                  <Text style={[typography.small, { color: colors.textSub }]}>{messageOf(send)}</Text>
                </View>
                <Text style={[typography.bodyBold, { color: colors.text }]}>{time(send.at)}</Text>
              </Pressable>
            );
          })}
        </SettingsSection>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  title: { flex: 1 },
  zoomRow: { flexDirection: 'row', marginBottom: spacing.xs },
  axis: { height: AXIS_HEIGHT, marginHorizontal: spacing.xs },
  gap: { position: 'absolute', top: ZONE_INSET, bottom: ZONE_INSET, opacity: 0.18, borderRadius: radius.xs },
  zone: {
    position: 'absolute',
    top: ZONE_INSET,
    bottom: ZONE_INSET,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  bar: { position: 'absolute', top: BAR_TOP, start: 0, end: 0, height: BAR_HEIGHT },
  dot: {
    position: 'absolute',
    top: DOT_TOP,
    width: DOT_TOUCH,
    height: DOT_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { zIndex: 2 },
  reminderDot: {
    width: REMINDER_DOT,
    height: REMINDER_DOT,
    borderRadius: REMINDER_DOT / 2,
    borderWidth: DOT_RING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nagDot: {
    width: NAG_DOT + 2 * DOT_RING,
    height: NAG_DOT + 2 * DOT_RING,
    borderRadius: radius.full,
    borderWidth: DOT_RING,
  },
  lastDot: {
    width: LAST_DOT,
    height: LAST_DOT,
    borderRadius: radius.xs,
    borderWidth: DOT_RING,
    transform: [{ rotate: '45deg' }],
  },
  grown: { transform: [{ scale: SELECTED_SCALE }] },
  lastGrown: { transform: [{ rotate: '45deg' }, { scale: SELECTED_SCALE }] },
  tip: { position: 'absolute', top: TIP_TOP, paddingHorizontal: spacing.sm, borderRadius: radius.md },
  ends: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: LEGEND_DOT, height: LEGEND_DOT, borderRadius: radius.full },
  legendDiamond: { borderRadius: scaled(2), transform: [{ rotate: '45deg' }] },
  legendBand: { borderRadius: scaled(2), borderWidth: 1, borderStyle: 'dashed' },
  note: { marginTop: spacing.sm },
  manual: { marginTop: spacing.md, gap: spacing.sm },
  panel: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, gap: spacing.sm },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  close: { padding: spacing.xs },
  preview: { padding: spacing.md, borderRadius: radius.md, gap: scaled(2) },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'center',
    borderRadius: radius.full,
    gap: spacing.md,
  },
  step: { width: STEP_WIDTH, height: STEP_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listDot: { width: LIST_DOT, height: LIST_DOT, borderRadius: radius.full },
  rowText: { flex: 1 },
});
