import React, { useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  AppState,
  FlatList,
  GestureResponderEvent,
  I18nManager,
  LayoutChangeEvent,
  Linking,
  PixelRatio,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  ViewToken,
} from 'react-native';
import Animated, {
  AnimatedRef,
  Extrapolation,
  FrameInfo,
  interpolate,
  runOnJS,
  scrollTo,
  useAnimatedProps,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { DateTime } from 'luxon';
import Svg, { Path } from 'react-native-svg';
import { findAnyMitzvah } from '@/data/customMitzvotAdapter';
import { CHOK_PARASHIYOT, CHOK_TEXT_ID } from '@/data/chok';
import { findMitzvah } from '@/data/mitzvot';
import { SELICHOT_TEXT_ID } from '@/data/selichot';
import {
  MITZVAH_STANDALONE_TEXT,
  STANDALONE_TEXTS,
  customSiddurText,
  hasSiddurText,
  hasStandaloneText,
  mitzvahTextEvening,
  mitzvahTextId,
  nextMitzvahTextWindow,
  siddurPlace,
  standalonePeriodEnded,
  standaloneReadingDay,
  standaloneTextDay,
  standaloneTextId,
} from '@/data/siddur';
import { useDayModel } from '@/hooks/useDayModel';
import { useLateMarkDialog } from '@/hooks/useLateMarkDialog';
import { useNow } from '@/hooks/useNow';
import { HDate } from '@hebcal/core';
import { verifyChokInstall } from '@/services/ChokContentService';
import { verifySelichotInstall } from '@/services/SelichotContentService';
import { loadChokParasha, loadSiddurText } from '@/services/SiddurService';
import { HebcalService } from '@/services/HebcalService';
import { useChokStore } from '@/stores/useChokStore';
import { useCompletionsStore, dateKey } from '@/stores/useCompletionsStore';
import { selectActive, useMitzvotStore } from '@/stores/useMitzvotStore';
import { selectSelichotInstalledFor, useSelichotStore } from '@/stores/useSelichotStore';
import {
  textBookmarks,
  textLastPosition,
  useSiddurBookmarksStore,
  type NewBookmark,
} from '@/stores/useSiddurBookmarksStore';
import {
  MaritalStatus,
  PrayerMode,
  SIDDUR_FONT_SIZES,
  SIDDUR_SCROLL_SPEEDS,
  scrollSpeedLevel,
  useUserStore,
} from '@/stores/useUserStore';
import { scaled } from '@/theme/scale';
import { useTheme } from '@/theme/ThemeProvider';
import { Banner } from '@/components/Banner';
import { BottomSheet, SheetAction } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChokLicenseNotice } from '@/components/ChokLicenseNotice';
import { ChokWeekControls } from '@/components/ChokWeekControls';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ListRow } from '@/components/ListRow';
import { MitzvahIcon } from '@/components/MitzvahIcon';
import { PickerCard } from '@/components/PickerCard';
import { HeaderPill, ScreenHeader } from '@/components/ScreenHeader';
import { ScrollSpeedStepper } from '@/components/ScrollSpeedStepper';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useQuietBlock } from '@/components/ShabbatScreen';
import { shadowPresets, shadowStyle } from '@/theme/shadowStyle';
import { radius, spacing } from '@/theme/tokens';
import { fontFamilies, typography } from '@/theme/typography';
import { ChokAsset, ChokDoubleChoice, ChokSectionKind, ChokSlot, ChokThuNightDay, HaftarahVariant } from '@/types/chok';
import {
  PassageLabel,
  Run,
  SiddurLastPosition,
  SiddurPlace,
  SiddurSection,
  SiddurSegment,
  SiddurText,
  SiddurVoice,
  DayFeatures,
} from '@/types/siddur';
import {
  OptionalBlock,
  SectionFolds,
  aloneFolds,
  autoScrollPixelsPerSecond,
  chanukahNightOn,
  dayFeatures,
  firstPlace,
  forMaritalStatus,
  forVoice,
  isTextStart,
  liturgicalDay,
  pickerEntries,
  pickerEntryAt,
  placeAt,
  placeTarget,
  resolveSiddurText,
  segmentLead,
  siddurLineHeight,
} from '@/utils/siddur';
import {
  CHOK_SECTION_KINDS,
  CHOK_SLOTS,
  ChokMakeUpFold,
  HAFTARAH_VARIANT,
  chokBrowsePortion,
  chokChosen,
  chokDoneDay,
  chokOpenMakeUps,
  chokParashaName,
  chokPlaceOf,
  chokReaderPortion,
  chokSlotDay,
  chokSlotsOf,
  chokText,
  chokToday,
  isChokCommentary,
} from '@/utils/chok';
import { currentOrNextWindow, dayWindow, windowDueToday } from '@/utils/buildDayTimeline';
import { afterPaint } from '@/utils/afterPaint';
import { compassPrayerOf } from '@/utils/compass';
import { calendarDay } from '@/utils/checkIn';
import { windowClosed } from '@/utils/lateMarks';
import { appDay } from '@/utils/locationDay';
import { calendarLocale } from '@/utils/weeklyReport';
import { translate, useI18n } from '@/i18n';

const KEEP_AWAKE_TAG = 'siddur-reader';
// Native RN swaps physical left/right under RTL (Android and iOS); react-native-web keeps them literal.
const RIGHT_EDGE = I18nManager.isRTL ? ('left' as const) : ('right' as const);
const LEFT_EDGE = I18nManager.isRTL ? ('right' as const) : ('left' as const);
const SECTION_VIEWABILITY = { viewAreaCoveragePercentThreshold: 2 };
const COMPASS_PROMPT_MS = 5000;
const JUMP_RETRY_MS = 50;
const JUMP_TIMEOUT_MS = 5000;
const LIST_PADDING = spacing.lg;
const SCROLL_REPORT_MS = 250;
const LAST_POSITION_DELAY_MS = 1000;
const SEGMENT_SETTLE_MS = 1000;
const TOAST_MS = 2000;
// iOS cannot present a Modal while another one is still sliding away.
const SHEET_SWAP_MS = 400;
const DELETE_ICON_SIZE = scaled(16);
const DELETE_ICON_STROKE = 2.4;
const AUTO_SCROLL_START_MS = 1000;
const AUTO_SCROLL_RESUME_MS = 700;
const AUTO_SCROLL_DRIFT_PX = 24;
const AUTO_SCROLL_MAX_FRAME_MS = 100;
const DONE_ICON_SIZE = scaled(18);
const PIXEL_RATIO = PixelRatio.get();
const CONTROL_SIZE = scaled(34);
const PLAY_ICON_SIZE = scaled(14);
const CHEVRON_SIZE = scaled(14);
const CHEVRON_STROKE = 2.5;
const PLAY_PATH = 'M8 5v14l11-7z';
const PAUSE_PATH = 'M6.5 5h4v14h-4zM13.5 5h4v14h-4z';
const PRAYER_MODES = ['minyan', 'alone'] as const;
const COMMENTARY_STATES = ['open', 'folded'] as const;
const COMMENTARY_KEY = 'commentary:';
const CHOK_KIND_NAMES = Object.fromEntries(
  CHOK_SECTION_KINDS.map((kind) => [kind, translate(`chok.kind.${kind}`, undefined, 'en')]),
) as Record<ChokSectionKind, string>;
// A Chok LeYisrael section's English title is its kind, so the picker names it by the kind alone.
const CHOK_KIND_BY_NAME = new Map(CHOK_SECTION_KINDS.map((kind) => [CHOK_KIND_NAMES[kind], kind]));
const CHOK_VARIANT_NAMES: Record<HaftarahVariant, string> = {
  sephardi: translate('chok.haftarahVariant.sephardi', undefined, 'en'),
  ashkenazi: translate('chok.haftarahVariant.ashkenazi', undefined, 'en'),
};
// iOS reports every non-animated scrollTo as the end of a fling, and the JS ScrollView then counts
// itself as animating and swallows the next tap. Moving the contentOffset prop scrolls without that.
const SCROLLS_BY_PROP = Platform.OS === 'ios';
const FOLD_DOWN_PX = 12;
const DOUBLE_TAP_GAP_MS = 300;
const TAP_MAX_MS = 250;
const TAP_SLOP = 10;
const DOUBLE_TAP_DISTANCE_PX = 40;
const FOLD_MS = 180;
const COMPACT_FADE_PX = 24;
const JUMP_FREEZE_MS = 600;
const UNFOLD_HOLD_MS = 4000;
const JUMP_NEIGHBOURS = 2;
const PLACEHOLDER_TITLE = '…';

const resolvedSections = new WeakMap<SiddurText, Map<string, SiddurSection[]>>();

// The day's resolution of one loaded text, per day, marital status and voice: a reopened text, or one
// resolved ahead while it loads, is not resolved again.
function resolveForReader(
  text: SiddurText,
  features: DayFeatures,
  maritalStatus: MaritalStatus | null,
  voice: SiddurVoice | null,
): SiddurSection[] {
  let perText = resolvedSections.get(text);
  if (!perText) {
    perText = new Map();
    resolvedSections.set(text, perText);
  }
  const key = `${[...features.flags].sort().join(',')}|${features.omerDay}|${maritalStatus}|${voice}`;
  let sections = perText.get(key);
  if (!sections) {
    sections = forVoice(forMaritalStatus(resolveSiddurText(text, features), maritalStatus), voice);
    perText.set(key, sections);
  }
  return sections;
}

// Folds everything above the text into a compact bar. The bar and the full block overlay the list, which
// keeps a top padding of the full block. Near the top the full block scrolls away with the text (attached);
// past it the bar shows, and a move up brings the full block back over the text (pinned) until the top.
type ReaderFold = ReturnType<typeof useReaderFold>;

function useReaderFold() {
  const progress = useSharedValue(0);
  const folded = useSharedValue(false);
  const pinned = useSharedValue(false);
  const fullHeight = useSharedValue(0);
  const compactHeight = useSharedValue(0);
  const lastY = useSharedValue(0);
  const lastContent = useSharedValue(0);
  const travel = useSharedValue(0);
  const frozenUntil = useSharedValue(0);
  const holdUntil = useSharedValue(0);
  const [space, setSpace] = useState(0);
  const foldedRef = useRef(false);
  const listeners = useRef(new Set<() => void>());
  const sizes = useRef({ full: 0, compact: 0 });

  const mirror = useCallback((next: boolean) => {
    foldedRef.current = next;
    listeners.current.forEach((listener) => listener());
  }, []);
  const subscribe = useCallback((listener: () => void) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);
  const getFolded = useCallback(() => foldedRef.current, []);
  const setTarget = useCallback(
    (next: boolean) => {
      'worklet';
      if (folded.value === next) return;
      folded.value = next;
      pinned.value = !next;
      travel.value = 0;
      if (!next) holdUntil.value = Date.now() + UNFOLD_HOLD_MS;
      progress.value = withTiming(next ? 1 : 0, { duration: FOLD_MS });
      runOnJS(mirror)(next);
    },
    [folded, pinned, travel, holdUntil, progress, mirror],
  );
  // Switches between attached and folded where the two look the same, so it needs no animation.
  const settle = useCallback(
    (next: boolean) => {
      'worklet';
      folded.value = next;
      travel.value = 0;
      progress.value = next ? 1 : 0;
      runOnJS(mirror)(next);
    },
    [folded, travel, progress, mirror],
  );
  const track = useCallback(
    (y: number, autoDriven: boolean, contentHeight: number) => {
      'worklet';
      const delta = y - lastY.value;
      lastY.value = y;
      const resized = contentHeight !== lastContent.value;
      lastContent.value = contentHeight;
      if (fullHeight.value <= 0) {
        if (folded.value) setTarget(false);
        travel.value = 0;
        return;
      }
      if (y <= 0) pinned.value = false;
      if (!pinned.value) {
        if (y < fullHeight.value) {
          if (folded.value) settle(false);
          travel.value = 0;
          return;
        }
        if (!folded.value) {
          settle(true);
          return;
        }
      }
      if (folded.value || Date.now() < frozenUntil.value || y < fullHeight.value || resized) {
        travel.value = 0;
        return;
      }
      if (delta === 0) return;
      if (autoDriven && (delta < 0 || Date.now() < holdUntil.value)) {
        travel.value = 0;
        return;
      }
      travel.value += Math.abs(delta);
      if (travel.value >= FOLD_DOWN_PX) setTarget(true);
    },
    [lastY, lastContent, frozenUntil, fullHeight, folded, pinned, travel, holdUntil, setTarget, settle],
  );
  const beginGesture = useCallback(() => {
    'worklet';
    travel.value = 0;
  }, [travel]);
  const open = useCallback(() => {
    folded.value = false;
    pinned.value = false;
    progress.value = 0;
    lastY.value = 0;
    travel.value = 0;
    mirror(false);
  }, [folded, pinned, progress, lastY, travel, mirror]);
  const unfold = useCallback(() => setTarget(false), [setTarget]);
  const toggle = useCallback(() => {
    if (folded.value) setTarget(false);
    else if (pinned.value && lastY.value >= fullHeight.value) setTarget(true);
  }, [folded, pinned, lastY, fullHeight, setTarget]);
  // A jump keeps what covers the list: an open full block stays over the text where the jump lands.
  const freeze = useCallback(() => {
    frozenUntil.value = Date.now() + JUMP_FREEZE_MS;
    if (!folded.value) pinned.value = true;
  }, [frozenUntil, folded, pinned]);
  const setFull = useCallback(
    (height: number) => {
      const previous = sizes.current.full;
      if (previous > 0 && Math.abs(height - previous) < 1) return 0;
      sizes.current.full = height;
      fullHeight.value = height;
      setSpace(height);
      return previous > 0 ? height - previous : 0;
    },
    [fullHeight],
  );
  const onCompactLayout = useCallback(
    (event: LayoutChangeEvent) => {
      sizes.current.compact = event.nativeEvent.layout.height;
      compactHeight.value = sizes.current.compact;
    },
    [compactHeight],
  );
  const overlayStyle = useAnimatedStyle(() => {
    if (fullHeight.value <= 0 || compactHeight.value <= 0) return {};
    if (!folded.value && !pinned.value) {
      return { height: Math.max(fullHeight.value - Math.max(lastY.value, 0), compactHeight.value) };
    }
    return { height: interpolate(progress.value, [0, 1], [fullHeight.value, compactHeight.value]) };
  });
  const fullStyle = useAnimatedStyle(() =>
    !folded.value && !pinned.value
      ? { opacity: 1, transform: [{ translateY: 0 - Math.min(Math.max(lastY.value, 0), fullHeight.value) }] }
      : {
          opacity: interpolate(progress.value, [0, 0.6], [1, 0], Extrapolation.CLAMP),
          transform: [{ translateY: 0 }],
        },
  );
  const compactStyle = useAnimatedStyle(() =>
    !folded.value && !pinned.value
      ? {
          opacity: interpolate(
            fullHeight.value - Math.max(lastY.value, 0),
            [compactHeight.value, compactHeight.value + COMPACT_FADE_PX],
            [1, 0],
            Extrapolation.CLAMP,
          ),
        }
      : { opacity: interpolate(progress.value, [0.4, 1], [0, 1], Extrapolation.CLAMP) },
  );
  return {
    track,
    beginGesture,
    open,
    unfold,
    toggle,
    freeze,
    subscribe,
    getFolded,
    space,
    fullHeight: () => sizes.current.full,
    inset: () => {
      const { full, compact } = sizes.current;
      if (foldedRef.current) return compact;
      if (pinned.value) return full;
      return Math.max(full - Math.max(lastY.value, 0), compact);
    },
    setFull,
    onCompactLayout,
    overlayStyle,
    fullStyle,
    compactStyle,
  };
}

const TapGuardContext = React.createContext<() => void>(() => {});

// Marks the touch in progress as taken by a control inside the list, so it is no tap on the text.
function TapGuard({ children }: { children: React.ReactNode }) {
  const consume = useContext(TapGuardContext);
  return <View onTouchStart={consume}>{children}</View>;
}

// A short, still touch on the text is a tap, and a second one close by, with no scroll between them, is a
// double tap too. Touch events only observe, so the list keeps its scroll and every passage keeps its own tap.
// A control inside the list calls `consume` from its own touch start (a child's handler runs before the
// list's), which withdraws that one touch from `onTap` and leaves the double tap as it was.
function useTaps(onTap: () => void, onDoubleTap: () => void) {
  const start = useRef<{ x: number; y: number; at: number } | null>(null);
  const lastTap = useRef<{ x: number; y: number; at: number } | null>(null);
  const consumed = useRef(false);
  return {
    consume: () => {
      consumed.current = true;
    },
    onTouchStart: (event: GestureResponderEvent) => {
      const { pageX, pageY, touches } = event.nativeEvent;
      start.current = touches.length > 1 ? null : { x: pageX, y: pageY, at: Date.now() };
      if (!start.current) consumed.current = false;
    },
    onTouchEnd: (event: GestureResponderEvent) => {
      const began = start.current;
      const taken = consumed.current;
      start.current = null;
      consumed.current = false;
      if (!began) return;
      const { pageX, pageY } = event.nativeEvent;
      const now = Date.now();
      const still = Math.hypot(pageX - began.x, pageY - began.y) <= TAP_SLOP;
      if (!still || now - began.at > TAP_MAX_MS) {
        lastTap.current = null;
        return;
      }
      if (!taken) onTap();
      const previous = lastTap.current;
      if (
        previous &&
        now - previous.at <= DOUBLE_TAP_GAP_MS &&
        Math.hypot(pageX - previous.x, pageY - previous.y) <= DOUBLE_TAP_DISTANCE_PX
      ) {
        lastTap.current = null;
        onDoubleTap();
        return;
      }
      lastTap.current = { x: pageX, y: pageY, at: now };
    },
    onTouchCancel: () => {
      start.current = null;
      lastTap.current = null;
      consumed.current = false;
    },
  };
}

function ReaderOverlay({
  fold,
  compact,
  onFullLayout,
  children,
}: {
  fold: ReaderFold;
  compact: React.ReactNode;
  onFullLayout: (event: LayoutChangeEvent) => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const isFolded = useSyncExternalStore(fold.subscribe, fold.getFolded);
  return (
    <Animated.View
      testID="siddur-header-overlay"
      style={[styles.overlay, { backgroundColor: colors.bg }, fold.overlayStyle]}
    >
      <Animated.View
        testID="siddur-header-full"
        onLayout={onFullLayout}
        style={fold.fullStyle}
        pointerEvents={isFolded ? 'none' : 'auto'}
        accessibilityElementsHidden={isFolded}
        importantForAccessibility={isFolded ? 'no-hide-descendants' : 'auto'}
      >
        {children}
      </Animated.View>
      <Animated.View
        testID="siddur-header-compact"
        onLayout={fold.onCompactLayout}
        style={[styles.compactBar, { backgroundColor: colors.bg }, fold.compactStyle]}
        pointerEvents={isFolded ? 'auto' : 'none'}
        accessibilityElementsHidden={!isFolded}
        importantForAccessibility={isFolded ? 'auto' : 'no-hide-descendants'}
      >
        {compact}
      </Animated.View>
    </Animated.View>
  );
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; text: SiddurText }
  | { status: 'chok'; assets: readonly ChokAsset[] }
  | { status: 'error' };

type LayoutNode = { y: number; parent: LayoutNode | null };
type SegmentLayouts = Map<string, { y: number; parent: LayoutNode | null }>;
const LayoutNodeContext = React.createContext<LayoutNode | null>(null);

function MeasuredView({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const parent = useContext(LayoutNodeContext);
  const node = useMemo<LayoutNode>(() => ({ y: 0, parent }), [parent]);
  return (
    <LayoutNodeContext.Provider value={node}>
      <View
        style={style}
        onLayout={(event) => {
          node.y = event.nativeEvent.layout.y;
        }}
      >
        {children}
      </View>
    </LayoutNodeContext.Provider>
  );
}

function parseSlotParam(value: string | undefined): ChokSlot | null {
  return CHOK_SLOTS.find((slot) => slot === value) ?? null;
}

function parseDateParam(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = DateTime.fromISO(value);
  return parsed.isValid ? parsed.toJSDate() : null;
}

// A segment is "added today" when its condition names a flag (required, or one of several) that the
// section's other segments do not all share.
function flagsOf(segment: SiddurSegment): string[] {
  return [...(segment.when?.all ?? []), ...(segment.when?.any ?? [])];
}

function isAddedForToday(segment: SiddurSegment, section: SiddurSection): boolean {
  if (segment.when?.omerDay !== undefined) return true;
  const sharedFlags = section.segments
    .map(flagsOf)
    .reduce((shared, flags) => shared.filter((flag) => flags.includes(flag)));
  return flagsOf(segment).some((flag) => !sharedFlags.includes(flag));
}

// Scrolls on the UI thread, so the pace holds while the JS thread renders more sections. A drag, a
// fling or any scroll it did not make itself pauses it, and it resumes from wherever the text was left.
function useAutoScroll(
  listRef: AnimatedRef<FlatList<SiddurSection>>,
  running: boolean,
  pixelsPerSecond: number,
  onDragStart: () => void,
  onScrollReport: (offsetY: number) => void,
  fold: ReaderFold,
) {
  const { track: trackFold, beginGesture, open: openFold } = fold;
  const speed = useSharedValue(pixelsPerSecond);
  const offset = useSharedValue(0);
  const reportedAt = useSharedValue(0);
  const end = useSharedValue(0);
  const position = useSharedValue(-1);
  const sentPixel = useSharedValue(-1);
  const propOffset = useSharedValue(-1);
  const holdMs = useSharedValue(0);
  const pressed = useSharedValue(false);
  const dragging = useSharedValue(false);
  const flinging = useSharedValue(false);
  const userUntil = useSharedValue(0);
  const sizes = useRef({ content: 0, viewport: 0 });

  const advance = useCallback(
    (frame: FrameInfo) => {
      'worklet';
      const elapsed = Math.min(frame.timeSincePreviousFrame ?? 0, AUTO_SCROLL_MAX_FRAME_MS);
      if (position.value >= 0 && Math.abs(offset.value - position.value) > AUTO_SCROLL_DRIFT_PX) {
        holdMs.value = Math.max(holdMs.value, AUTO_SCROLL_RESUME_MS);
      }
      const held = pressed.value || dragging.value || flinging.value;
      if (held || holdMs.value > 0) {
        if (!held) holdMs.value -= elapsed;
        position.value = -1;
        return;
      }
      if (position.value < 0) position.value = offset.value;
      if (position.value >= end.value) return;
      position.value = Math.min(end.value, position.value + (speed.value * elapsed) / 1000);
      const pixel = Math.round(position.value * PIXEL_RATIO);
      if (pixel === sentPixel.value) return;
      sentPixel.value = pixel;
      if (SCROLLS_BY_PROP) propOffset.value = pixel / PIXEL_RATIO;
      else scrollTo(listRef, 0, pixel / PIXEL_RATIO, false);
    },
    [listRef, speed, offset, end, position, sentPixel, propOffset, holdMs, pressed, dragging, flinging],
  );
  const frame = useFrameCallback(advance, false);
  const animatedProps = useAnimatedProps<{ contentOffset: { x: number; y: number } }>(() =>
    propOffset.value < 0 ? {} : { contentOffset: { x: 0, y: propOffset.value } },
  );

  useEffect(() => {
    speed.value = pixelsPerSecond;
  }, [speed, pixelsPerSecond]);

  useEffect(() => {
    if (!running) return undefined;
    holdMs.value = AUTO_SCROLL_START_MS;
    position.value = -1;
    frame.setActive(true);
    // Leaving the app mid-touch (the system back or home gesture starts on the list) delivers a drag
    // or fling start with no end, which held the scroll until the next manual drag. Coming back clears
    // every hold and restarts the frame loop.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      pressed.value = false;
      dragging.value = false;
      flinging.value = false;
      holdMs.value = AUTO_SCROLL_START_MS;
      position.value = -1;
      frame.setActive(false);
      frame.setActive(true);
    });
    return () => {
      subscription.remove();
      frame.setActive(false);
    };
  }, [running, frame, holdMs, position, pressed, dragging, flinging]);

  const scrollHandler = useAnimatedScrollHandler(
    {
      onScroll: (event) => {
        offset.value = event.contentOffset.y;
        end.value = Math.max(0, event.contentSize.height - event.layoutMeasurement.height);
        const userDriven = pressed.value || dragging.value || flinging.value || Date.now() < userUntil.value;
        trackFold(event.contentOffset.y, !userDriven, event.contentSize.height);
        const now = Date.now();
        if (now - reportedAt.value >= SCROLL_REPORT_MS) {
          reportedAt.value = now;
          runOnJS(onScrollReport)(event.contentOffset.y);
        }
      },
      onBeginDrag: () => {
        dragging.value = true;
        flinging.value = false;
        beginGesture();
        runOnJS(onDragStart)();
      },
      onEndDrag: () => {
        dragging.value = false;
        holdMs.value = AUTO_SCROLL_RESUME_MS;
      },
      onMomentumBegin: () => {
        flinging.value = true;
      },
      // iOS also reports a momentum end after every programmatic scroll, with no begin before it.
      onMomentumEnd: () => {
        if (!flinging.value) return;
        flinging.value = false;
        holdMs.value = AUTO_SCROLL_RESUME_MS;
      },
    },
    [onDragStart, onScrollReport, trackFold, beginGesture],
  );
  const updateEnd = () => {
    end.value = Math.max(0, sizes.current.content - sizes.current.viewport);
  };
  const release = () => {
    pressed.value = false;
    holdMs.value = AUTO_SCROLL_RESUME_MS;
  };
  // A list that mounts again starts at the top and sends no scroll event, so nothing else clears these.
  const reset = useCallback(() => {
    offset.value = 0;
    position.value = -1;
    sentPixel.value = -1;
    propOffset.value = -1;
    holdMs.value = AUTO_SCROLL_RESUME_MS;
    openFold();
  }, [offset, position, sentPixel, propOffset, holdMs, openFold]);
  // react-native-web sends no drag or momentum events, so a touch or a wheel pauses it instead.
  const webInput: Partial<Record<'onWheel' | 'onTouchStart' | 'onTouchEnd' | 'onTouchCancel', () => void>> =
    Platform.OS === 'web'
      ? {
          onWheel: () => {
            holdMs.value = AUTO_SCROLL_RESUME_MS;
            userUntil.value = Date.now() + AUTO_SCROLL_RESUME_MS;
          },
          onTouchStart: () => {
            pressed.value = true;
            onDragStart();
          },
          onTouchEnd: release,
          onTouchCancel: release,
        }
      : {};
  return {
    scrollHandler,
    offset,
    reset,
    animatedProps: SCROLLS_BY_PROP ? animatedProps : undefined,
    webInput,
    gesturing: () => pressed.value || dragging.value || flinging.value,
    hold: (ms: number) => {
      holdMs.value = ms;
    },
    onLayout: (event: LayoutChangeEvent) => {
      sizes.current.viewport = event.nativeEvent.layout.height;
      updateEnd();
    },
    onContentSizeChange: (_width: number, height: number) => {
      sizes.current.content = height;
      updateEnd();
    },
  };
}

export default function SiddurScreen() {
  const { colors } = useTheme();
  const quiet = useQuietBlock() !== null;
  const { language, t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    date?: string;
    slot?: string;
    section?: string;
    segment?: string;
    from?: string;
    fromCompass?: string;
  }>();
  const chok = params.id === CHOK_TEXT_ID;
  const textOnly = !chok && !params.date && standaloneTextId(params.id) !== null;
  const mitzvah = useMemo(
    () => (chok || textOnly ? undefined : findAnyMitzvah(params.id)),
    [chok, textOnly, params.id],
  );
  const nusach = useUserStore((s) => s.nusach);
  const location = useUserStore((s) => s.location);
  const inIsrael = useUserStore((s) => s.inIsrael);
  const fontSize = useUserStore((s) => s.siddurFontSize);
  const textSize = scaled(fontSize);
  const setFontSize = useUserStore((s) => s.setSiddurFontSize);
  const autoScrollOn = useUserStore((s) => s.siddurAutoScroll);
  const setAutoScroll = useUserStore((s) => s.setSiddurAutoScroll);
  const scrollSpeed = useUserStore((s) => s.siddurScrollSpeed);
  const setScrollSpeed = useUserStore((s) => s.setSiddurScrollSpeed);
  const prayerMode = useUserStore((s) => s.prayerMode);
  const setPrayerMode = useUserStore((s) => s.setPrayerMode);
  const maritalStatus = useUserStore((s) => s.maritalStatus);
  const siddurVoice = useUserStore((s) => s.siddurVoice);
  const chokInstall = useChokStore((s) => s.installed);
  const selichotInstalled = useSelichotStore(selectSelichotInstalledFor(nusach));
  const selichotVersion = useSelichotStore((s) => s.installed?.version ?? null);
  const doubleChoice = useUserStore((s) => s.chokDoubleChoice);
  const setDoubleChoice = useUserStore((s) => s.setChokDoubleChoice);
  const commentaryOpen = useUserStore((s) => s.chokCommentaryOpen);
  const setCommentaryOpen = useUserStore((s) => s.setChokCommentaryOpen);
  const thuNightDay = useUserStore((s) => s.chokThuNightDay);
  const setThuNightDay = useUserStore((s) => s.setChokThuNightDay);
  const allBookmarks = useSiddurBookmarksStore((s) => s.bookmarks);
  const lastPositions = useSiddurBookmarksStore((s) => s.lastPositions);
  const addBookmark = useSiddurBookmarksStore((s) => s.addBookmark);
  const removeBookmark = useSiddurBookmarksStore((s) => s.removeBookmark);
  const replaceBookmark = useSiddurBookmarksStore((s) => s.replaceBookmark);
  const saveLastPosition = useSiddurBookmarksStore((s) => s.saveLastPosition);
  const clearLastPosition = useSiddurBookmarksStore((s) => s.clearLastPosition);
  const standalone = mitzvah || chok ? null : standaloneTextId(params.id);
  const linkedMitzvah = standalone
    ? Object.keys(MITZVAH_STANDALONE_TEXT).find((id) => MITZVAH_STANDALONE_TEXT[id] === standalone)
    : undefined;
  const settingsTarget = chok
    ? CHOK_TEXT_ID
    : mitzvah
      ? mitzvah.id
      : linkedMitzvah && findMitzvah(linkedMitzvah)?.nuschaotSupported.includes(nusach)
        ? linkedMitzvah
        : null;
  const compassPrayer =
    Platform.OS === 'web' ? null : compassPrayerOf(mitzvah && !mitzvah.isCustom ? mitzvah.id : undefined);
  const [compassPromptOpen, setCompassPromptOpen] = useState(
    () => compassPrayer !== null && params.fromCompass !== '1' && useUserStore.getState().siddurCompassPrompt,
  );
  const requestedDate = useMemo(() => parseDateParam(params.date), [params.date]);
  const { settings } = useDayModel();
  const place = useMemo(() => siddurPlace(location, inIsrael), [location, inIsrael]);
  const windowChoice = useMemo(() => {
    if (requestedDate) return { date: requestedDate, offSeason: false, passed: false };
    const opened = new Date();
    const current = mitzvah ? currentOrNextWindow(mitzvah, location, settings, opened) : null;
    if (mitzvah && !mitzvah.isCustom) {
      const dueToday =
        current !== null &&
        hasSiddurText(mitzvah, nusach, current.date, place) &&
        windowDueToday(current, location, opened);
      if (!dueToday) {
        // Today by the location's calendar, not the app day, so the night before alot still opens the coming morning.
        const civil = DateTime.fromJSDate(opened, { zone: location.tz });
        const today = dayWindow(mitzvah, new Date(civil.year, civil.month - 1, civil.day), location, settings);
        if (today && today.end.getTime() <= opened.getTime() && hasSiddurText(mitzvah, nusach, today.date, place)) {
          return { date: today.date, offSeason: false, passed: true };
        }
      }
      const next = dueToday ? null : nextMitzvahTextWindow(mitzvah, nusach, location, settings, place, opened);
      if (next) return { date: next.date, offSeason: true, passed: false };
    }
    return { date: current?.date ?? appDay(opened, location), offSeason: false, passed: false };
  }, [requestedDate, mitzvah, location, settings, nusach, place]);
  const windowDate = windowChoice.date;
  const mitzvahText = mitzvah && !mitzvah.isCustom ? mitzvahTextId(mitzvah.id) : null;
  const linkedText = mitzvah && !mitzvah.isCustom ? (MITZVAH_STANDALONE_TEXT[mitzvah.id] ?? null) : null;
  const textId = mitzvahText ?? linkedText ?? standalone;
  const evening =
    mitzvah && !mitzvah.isCustom
      ? mitzvahTextEvening(mitzvah.id)
      : Boolean(standalone && STANDALONE_TEXTS[standalone].evening);
  // A standalone text with no date follows the clock (`standaloneTextDay()`). Keyed by the day
  // number so the 30-second tick re-resolves the text only when the day turns.
  const now = useNow();
  const todayAbs = standalone && !requestedDate ? standaloneTextDay(standalone, now, location).abs() : null;
  const periodEnded = standalone && !requestedDate ? standalonePeriodEnded(standalone, nusach, now, location) : false;
  const reading = useMemo(
    () =>
      standalone && todayAbs !== null
        ? standaloneReadingDay(standalone, nusach, new HDate(todayAbs), periodEnded, place)
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a Selichot file that arrives decides whether that text is present
    [todayAbs, periodEnded, standalone, nusach, place, selichotInstalled],
  );
  const offSeason = reading?.offSeason === true || windowChoice.offSeason;
  const customWindowStart = useMemo(
    () => (mitzvah?.isCustom ? (dayWindow(mitzvah, windowDate, location, settings)?.start ?? null) : null),
    [mitzvah, windowDate, location, settings],
  );
  const hebrewDay = useMemo(
    () =>
      reading
        ? reading.day
        : todayAbs !== null
          ? new HDate(todayAbs)
          : customWindowStart
            ? HebcalService.hebrewDayAt(customWindowStart, location)
            : liturgicalDay(windowDate, evening),
    [reading, todayAbs, customWindowStart, location, windowDate, evening],
  );
  const [chokSlot, setChokSlot] = useState<ChokSlot | null>(() => parseSlotParam(params.slot));
  const [browsing, setBrowsing] = useState<string | null>(null);
  const browse = (parasha: string | null) => {
    if (parasha === null && browsing !== null) setChokSlot(null);
    setBrowsing(parasha);
  };
  const weekPortion = useMemo(
    () => (chok ? chokReaderPortion({ now, date: requestedDate, slot: chokSlot }, location, inIsrael) : null),
    [chok, now, requestedDate, chokSlot, location, inIsrael],
  );
  const chokPortion = useMemo(
    () => (weekPortion && browsing ? chokBrowsePortion(browsing, weekPortion, chokSlot) : weekPortion),
    [weekPortion, browsing, chokSlot],
  );
  const chokWeekKey = chokPortion ? chokPortion.parashiyot.join('|') : '';
  const chokWeek = useMemo(() => (chokWeekKey ? chokWeekKey.split('|') : []), [chokWeekKey]);
  const shownSlot = chokPortion?.slot ?? null;
  const [asking, setAsking] = useState(false);
  const [askingThuNight, setAskingThuNight] = useState(false);
  const asked = useRef(false);
  const features = useMemo(() => dayFeatures(hebrewDay, place), [hebrewDay, place]);
  const resolveInput = useRef({ features, maritalStatus, siddurVoice });
  resolveInput.current = { features, maritalStatus, siddurVoice };
  const available = chok
    ? chokInstall !== null &&
      chokWeek.length > 0 &&
      chokWeek.every((parasha) => chokInstall.files[parasha] !== undefined)
    : standalone
      ? requestedDate
        ? hasStandaloneText(standalone, nusach, features)
        : reading !== null
      : Boolean(mitzvah && hasSiddurText(mitzvah, nusach, windowDate, place));
  const done = useCompletionsStore((s) => Boolean(mitzvah && s.completions[dateKey(windowDate)]?.[mitzvah.id]));
  const lateMark = useLateMarkDialog();
  const chokActive = useMitzvotStore(selectActive(CHOK_TEXT_ID));
  const chokMarks = useCompletionsStore((s) => (chok ? s.completions : null));
  const chokTodayKey = useMemo(
    () => (chok ? dateKey(chokToday(now, location, inIsrael)) : ''),
    [chok, now, location, inIsrael],
  );
  const chokTodayDate = useMemo(() => (chokTodayKey ? calendarDay(chokTodayKey) : null), [chokTodayKey]);
  const chokDoneDate =
    chokPortion && chokTodayDate && chokActive.enabled && browsing === null
      ? chokDoneDay(chokPortion, chokTodayDate, thuNightDay ?? 'thu')
      : null;
  const thuNightUnanswered = chokPortion?.slot === 'thuNight' && thuNightDay === null;
  const showMakeUps =
    chokActive.enabled &&
    browsing === null &&
    chokPortion !== null &&
    dateKey(chokSlotDay(chokPortion)) === chokTodayKey;
  const makeUpFolds = useMemo(
    (): ChokMakeUpFold[] =>
      showMakeUps && chokTodayDate && chokMarks
        ? chokOpenMakeUps(chokTodayDate, location, inIsrael, chokMarks, chokActive.enabledAt).map((makeUp) => ({
            dateKey: makeUp.dateKey,
            slot: makeUp.slot,
            label: {
              he: translate('chok.makeUp', { day: translate(`chok.slot.${makeUp.slot}`, undefined, 'he') }, 'he'),
              en: translate('chok.makeUp', { day: translate(`chok.slot.${makeUp.slot}`, undefined, 'en') }, 'en'),
            },
          }))
        : [],
    [showMakeUps, chokTodayDate, chokMarks, location, inIsrael, chokActive.enabledAt],
  );
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const listRef = useAnimatedRef<FlatList<SiddurSection>>();
  const pickerRef = useRef<ScrollView>(null);
  const [shownSection, setShownSection] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [renderUpTo, setRenderUpTo] = useState<number | null>(null);
  const fold = useReaderFold();
  const toggleAutoScroll = () => {
    Haptics.selectionAsync().catch(() => {});
    setAutoScroll(!autoScrollOn);
  };
  const taps = useTaps(toggleAutoScroll, fold.toggle);
  const topSectionRef = useRef<(fallback: number) => number>((fallback) => fallback);
  const { subscribe: subscribeFold } = fold;
  useEffect(() => subscribeFold(() => setShownSection((previous) => topSectionRef.current(previous))), [subscribeFold]);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [resumeOffer, setResumeOffer] = useState<SiddurLastPosition | null>(null);
  const [pendingPlace, setPendingPlace] = useState<SiddurPlace | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState<NewBookmark | null>(null);
  const jumpMissed = useRef(false);
  const jumpTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const landedSection = useRef(false);
  const segmentLayouts = useRef<SegmentLayouts>(new Map());
  const sectionHeights = useRef(new Map<string, number>());
  const headerHeight = useRef(0);
  const moved = useRef(false);
  const finished = useRef(false);
  const offered = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const swapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const persistRef = useRef<() => void>(() => {});
  // Keys of the blocks the reader flipped away from their default (closed, or open for a passage said
  // alone), so a mode switch clears it and every default applies again.
  const [toggled, setToggled] = useState<ReadonlySet<string>>(() => new Set());
  const toggleBlock = (key: string) =>
    setToggled((flipped) => {
      const next = new Set(flipped);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  const isOpen = (key: string, openByDefault = false) => openByDefault !== toggled.has(key);
  const changePrayerMode = (mode: PrayerMode) => {
    setPrayerMode(mode);
    setToggled(new Set());
  };
  const changeCommentaryOpen = (open: boolean) => {
    setCommentaryOpen(open);
    setToggled((flipped) => new Set([...flipped].filter((key) => !key.startsWith(COMMENTARY_KEY))));
  };
  const cancelJump = useCallback(() => {
    clearTimeout(jumpTimer.current);
    setRenderUpTo(null);
  }, []);
  const onUserScroll = useCallback(() => {
    cancelJump();
    setResumeOffer(null);
  }, [cancelJump]);
  const onScrollReport = useCallback((y: number) => {
    if (y > 0) moved.current = true;
    setShownSection((previous) => topSectionRef.current(previous));
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistRef.current(), LAST_POSITION_DELAY_MS);
  }, []);
  const onViewableSectionsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken<SiddurSection>[] }) => {
    const top = viewableItems[0]?.index;
    if (top != null) setShownSection(topSectionRef.current(top));
  }).current;

  const [focused, setFocused] = useState(true);
  const [screenReader, setScreenReader] = useState(false);

  useEffect(() => {
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
      clearTimeout(jumpTimer.current);
      clearTimeout(saveTimer.current);
      clearTimeout(toastTimer.current);
      clearTimeout(swapTimer.current);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        persistRef.current();
      };
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') persistRef.current();
    });
    return () => subscription.remove();
  }, []);

  // A screen reader scrolls by page, which a running auto-scroll would cut short. react-native-web
  // always answers that one is on, so only native asks.
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    AccessibilityInfo.isScreenReaderEnabled()
      .then(setScreenReader)
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!available) return undefined;
    if (chok) {
      let active = true;
      setLoad({ status: 'loading' });
      const task = afterPaint(() => {
        Promise.all(chokWeek.map(loadChokParasha))
          .then((assets) => active && setLoad({ status: 'chok', assets }))
          .catch((error: unknown) => {
            if (!active) return;
            verifyChokInstall(error);
            setLoad({ status: 'error' });
          });
      });
      return () => {
        active = false;
        task.cancel();
      };
    }
    if (mitzvah?.isCustom) {
      const text = customSiddurText(mitzvah, nusach);
      setLoad(text ? { status: 'ready', text } : { status: 'error' });
      return undefined;
    }
    if (!textId) return undefined;
    let active = true;
    setLoad({ status: 'loading' });
    const task = afterPaint(() => {
      loadSiddurText(nusach, textId)
        .then((text) => {
          if (!active) return;
          const { features: day, maritalStatus: status, siddurVoice: voice } = resolveInput.current;
          resolveForReader(text, day, status, voice);
          setLoad({ status: 'ready', text });
        })
        .catch((error: unknown) => {
          if (!active) return;
          if (textId === SELICHOT_TEXT_ID) verifySelichotInstall(error);
          setLoad({ status: 'error' });
        });
    });
    return () => {
      active = false;
      task.cancel();
    };
  }, [mitzvah, available, nusach, textId, attempt, chok, chokWeek, chokInstall?.version, selichotVersion]);

  useEffect(() => {
    if (chokWeek.length < 2 || doubleChoice !== null || asked.current) return;
    asked.current = true;
    setAsking(true);
  }, [chokWeek, doubleChoice]);

  const loadStale = load.status === 'chok' && load.assets.map((asset) => asset.parasha).join('|') !== chokWeekKey;
  const loadStatus = loadStale ? 'loading' : load.status;
  const readyText = useMemo(() => {
    if (load.status === 'ready') return load.text;
    if (load.status !== 'chok' || loadStale || !shownSlot) return null;
    return chokText(load.assets, {
      slot: shownSlot,
      choice: doubleChoice ?? 'first',
      variant: HAFTARAH_VARIANT[nusach],
      kindNames: CHOK_KIND_NAMES,
      variantNames: CHOK_VARIANT_NAMES,
      makeUps: makeUpFolds,
    });
  }, [load, loadStale, shownSlot, doubleChoice, nusach, makeUpFolds]);

  const sections = useMemo(
    () => (readyText ? resolveForReader(readyText, features, maritalStatus, siddurVoice) : []),
    [readyText, features, maritalStatus, siddurVoice],
  );
  const bookmarkTextId: string | null = chok ? CHOK_TEXT_ID : textId;
  const placeNusach = readyText?.nusach ?? null;
  const dailyText = textId !== null && mitzvahTextId(textId) !== null;
  const shownBookmarks = useMemo(
    () => (bookmarkTextId && readyText ? textBookmarks(allBookmarks, bookmarkTextId, placeNusach) : []),
    [allBookmarks, bookmarkTextId, readyText, placeNusach],
  );
  const lastPlace = bookmarkTextId && readyText ? textLastPosition(lastPositions, bookmarkTextId, placeNusach) : null;
  const shownParashiyot = useMemo(() => chokChosen(chokWeek, doubleChoice ?? 'first'), [chokWeek, doubleChoice]);
  const sectionKeys = useMemo(
    () => new Set(sections.flatMap((section) => section.segments.map((segment) => segment.key))),
    [sections],
  );
  const placeAway = useCallback(
    (segmentKey: string) => {
      const there = chok && !sectionKeys.has(segmentKey) ? chokPlaceOf(segmentKey) : null;
      return there && !(there.slot === shownSlot && shownParashiyot.includes(there.parasha)) ? there : null;
    },
    [chok, sectionKeys, shownSlot, shownParashiyot],
  );
  const placeText = (there: { parasha: string; slot: ChokSlot }) =>
    t('chok.place', { name: chokParashaName(there.parasha, language), day: t(`chok.slot.${there.slot}`) });

  useEffect(() => {
    if (offered.current || !bookmarkTextId || !readyText || !sections.length) return;
    offered.current = true;
    if (params.section || params.segment) return;
    const last = textLastPosition(useSiddurBookmarksStore.getState().lastPositions, bookmarkTextId, placeNusach);
    if (!last) return;
    const away = placeAway(last.segmentKey);
    if (away ? chokInstall?.files[away.parasha] === undefined : !placeTarget(sections, last)) return;
    if (dailyText && last.appDay !== dateKey(appDay(new Date(), location))) return;
    setResumeOffer(last);
  }, [
    bookmarkTextId,
    readyText,
    sections,
    placeNusach,
    dailyText,
    location,
    params.section,
    params.segment,
    placeAway,
    chokInstall,
  ]);

  const hasMinyanPassages = useMemo(
    () => sections.some((section) => section.minyanOnly || section.segments.some((segment) => segment.minyan)),
    [sections],
  );
  const hasCommentaryPassages = useMemo(
    () => chok && sections.some((section) => section.segments.some((segment) => isChokCommentary(segment.optional))),
    [chok, sections],
  );

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'));
  const openCompass = () => {
    if (!compassPrayer) return;
    setCompassPromptOpen(false);
    router.push({
      pathname: '/compass',
      params: { prayer: compassPrayer, ...(params.date ? { date: params.date } : {}) },
    });
  };

  const openMitzvahSettings = () => {
    if (!settingsTarget) return;
    if (params.from === settingsTarget && router.canGoBack()) router.back();
    else router.push({ pathname: '/mitzvah/[id]', params: { id: settingsTarget } });
  };
  // A mark whose window has closed (the time passed today, a make-up day) asks when it was done first.
  const markTarget = (mitzvahId: string, date: Date) => {
    const target = findAnyMitzvah(mitzvahId);
    return {
      id: mitzvahId,
      name: mitzvahId === CHOK_TEXT_ID ? t('chok.title') : target ? nameOf(target.name) : '',
      date,
      window: target ? dayWindow(target, date, location, settings) : null,
    };
  };
  // Done ends the session with the text: mark it, then land on home whatever opened the reader (a
  // home card, the mitzvah screen, a notification on a cold start).
  const finish = (mitzvahId: string, date: Date = windowDate) =>
    lateMark.mark(markTarget(mitzvahId, date), () => {
      if (bookmarkTextId) {
        finished.current = true;
        clearLastPosition(bookmarkTextId);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      if (router.canDismiss()) {
        router.dismissAll();
        router.navigate('/(tabs)/home');
      } else {
        router.replace('/(tabs)/home');
      }
    });
  const finishMakeUp = (makeUp: ChokMakeUpFold) =>
    lateMark.mark(markTarget(CHOK_TEXT_ID, calendarDay(makeUp.dateKey)), () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    });
  const doneTarget = mitzvah
    ? offSeason
      ? null
      : { id: mitzvah.id, date: windowDate, done }
    : chokDoneDate
      ? {
          id: CHOK_TEXT_ID,
          date: chokDoneDate,
          done: !thuNightUnanswered && Boolean(chokMarks?.[dateKey(chokDoneDate)]?.[CHOK_TEXT_ID]),
        }
      : null;
  const nameOf = (entry: { he: string; en?: string }) => (language === 'en' && entry.en ? entry.en : entry.he);
  const name = chok
    ? t('chok.title')
    : mitzvah
      ? nameOf(mitzvah.name)
      : standalone
        ? nameOf(STANDALONE_TEXTS[standalone].name)
        : '';
  const hebrewDateLabel = language === 'he' ? hebrewDay.renderGematriya(true) : hebrewDay.render('en');
  const candleDay = reading?.offSeason
    ? evening
      ? new HDate(reading.day.abs() - 1).greg()
      : reading.day.greg()
    : todayAbs !== null
      ? appDay(now, location)
      : windowDate;
  const candleNight = chanukahNightOn(candleDay);
  const subtitle = useMemo(() => {
    if (chokPortion) return undefined;
    const occasions = [
      ...HebcalService.getHolidays(hebrewDay.greg(), location, calendarLocale(language), {
        omitChanukahCandles: true,
        omitChanukahDay: candleNight !== null,
      }),
      ...(candleNight === null ? [] : [translate('siddur.chanukahNight', { n: candleNight }, language)]),
    ];
    return [translate(`nusach.${nusach}`, undefined, language), hebrewDateLabel, ...occasions].join(' · ');
  }, [chokPortion, hebrewDay, location, language, candleNight, nusach, hebrewDateLabel]);
  const chooseDouble = (choice: ChokDoubleChoice) => {
    setDoubleChoice(choice);
    setAsking(false);
  };
  const chooseThuNightDay = (day: ChokThuNightDay) => {
    setThuNightDay(day);
    setAskingThuNight(false);
    const date = chokPortion && chokTodayDate ? chokDoneDay(chokPortion, chokTodayDate, day) : null;
    if (!date) return;
    const { window } = markTarget(CHOK_TEXT_ID, date);
    // A closed window asks in a sheet of its own, which waits until this one has gone.
    if (window && windowClosed(window, new Date())) {
      swapTimer.current = setTimeout(() => finish(CHOK_TEXT_ID, date), SHEET_SWAP_MS);
    } else {
      finish(CHOK_TEXT_ID, date);
    }
  };
  const listExtraData = useMemo(
    () => ({ textSize, language, colors, toggled, prayerMode, commentaryOpen }),
    [textSize, language, colors, toggled, prayerMode, commentaryOpen],
  );
  const titleOf = (titled: { title: { he: string; en: string } }) =>
    language === 'en' ? titled.title.en : titled.title.he;
  const entryTitle = (entry: { title: { he: string; en: string } }) => {
    const kind = chok ? CHOK_KIND_BY_NAME.get(entry.title.en) : undefined;
    return kind ? t(`chok.kind.${kind}`) : titleOf(entry);
  };
  const labelOf = (label: PassageLabel) => (language === 'en' ? label.en : label.he);
  const labeledEdge = (language === 'he') === I18nManager.isRTL ? styles.labeledLeftEdge : styles.labeledRightEdge;
  const segmentViews = (section: SiddurSection, segments: SiddurSegment[], start: number, color: string) => {
    const runs: { added: boolean; start: number; segments: SiddurSegment[] }[] = [];
    segments.forEach((segment, offset) => {
      const added = isAddedForToday(segment, section);
      const previous = runs[runs.length - 1];
      if (previous?.added === added) previous.segments.push(segment);
      else runs.push({ added, start: start + offset, segments: [segment] });
    });
    return runs.flatMap((run) => {
      const views = run.segments.map((segment, offset) => (
        <SegmentView
          key={run.start + offset}
          segment={segment}
          fontSize={textSize}
          showEnglish={language === 'en'}
          color={color}
          layouts={segmentLayouts.current}
        />
      ));
      if (!run.added) return views;
      return [
        <MeasuredView
          key={`added#${run.start}`}
          style={[styles.addedToday, { backgroundColor: colors.goldLight, borderColor: colors.gold }]}
        >
          <Text style={[typography.micro, styles.addedTodayLabel, { color: colors.goldText }]}>
            {t(offSeason ? 'siddur.addedOnDay' : 'siddur.addedToday')}
          </Text>
          {views}
        </MeasuredView>,
      ];
    });
  };
  const minyanViews = (section: SiddurSection, block: OptionalBlock, color: string) =>
    block.minyanBlocks.flatMap((inner) => {
      if (!inner.label) return segmentViews(section, inner.segments, inner.start, color);
      const minyanText = () => segmentViews(section, inner.segments, inner.start, colors.minyan);
      if (!inner.folded) {
        return [
          <MeasuredView
            key={`minyan#${inner.start}`}
            style={[styles.labeledBody, labeledEdge, { borderColor: colors.minyan }]}
          >
            <Text style={[typography.captionBold, styles.minyanLabel, { color: colors.minyan }]}>
              {labelOf(inner.label)}
            </Text>
            {minyanText()}
          </MeasuredView>,
        ];
      }
      const key = `minyan:${section.title.he}#${inner.start}`;
      const expanded = isOpen(key);
      return [
        <MeasuredView key={key}>
          <OptionalToggle
            tone="minyan"
            label={labelOf(inner.label)}
            expanded={expanded}
            onPress={() => toggleBlock(key)}
          />
          {expanded ? (
            <MeasuredView style={[styles.labeledBody, labeledEdge, { borderColor: colors.minyan }]}>
              {minyanText()}
            </MeasuredView>
          ) : null}
        </MeasuredView>,
      ];
    });
  const sectionBody = (section: SiddurSection, folds: SectionFolds, color: string) =>
    folds.blocks.flatMap((block) => {
      if (!block.label) return minyanViews(section, block, color);
      const commentary = chok && isChokCommentary(block.label);
      const key = `${commentary ? COMMENTARY_KEY : ''}${section.title.he}#${block.start}`;
      const expanded = isOpen(key, commentary ? commentaryOpen : block.openByDefault);
      return [
        <MeasuredView key={key}>
          <OptionalToggle label={labelOf(block.label)} expanded={expanded} onPress={() => toggleBlock(key)} />
          {expanded ? (
            <MeasuredView style={[styles.labeledBody, labeledEdge, { borderColor: colors.optional }]}>
              {minyanViews(section, block, colors.optional)}
            </MeasuredView>
          ) : null}
        </MeasuredView>,
      ];
    });
  const makeUpDone = (section: SiddurSection) => {
    const makeUp = makeUpFolds.find((fold) => fold.label.he === section.title.he);
    if (!makeUp) return null;
    return (
      <TapGuard>
        <Button
          label={t('chok.makeUpDone', { day: t(`chok.slot.${makeUp.slot}`) })}
          onPress={() => finishMakeUp(makeUp)}
          style={styles.doneAction}
        />
      </TapGuard>
    );
  };
  const optionalSection = (
    section: SiddurSection,
    optional: PassageLabel,
    folds: SectionFolds,
    footer: React.ReactNode = null,
  ) => {
    const expanded = isOpen(section.title.he, folds.optionalOpen);
    return (
      <>
        <OptionalToggle
          large
          label={labelOf(optional)}
          expanded={expanded}
          onPress={() => toggleBlock(section.title.he)}
        />
        {expanded ? (
          <MeasuredView style={[styles.labeledBody, labeledEdge, { borderColor: colors.optional }]}>
            {sectionBody(section, folds, colors.optional)}
            {footer}
          </MeasuredView>
        ) : null}
      </>
    );
  };
  const sectionCard = (section: SiddurSection) => {
    const folds = aloneFolds(section, prayerMode);
    if (folds.minyanFolded) {
      const key = `minyan:${section.title.he}`;
      const expanded = isOpen(key);
      return (
        <>
          <OptionalToggle
            large
            tone="minyan"
            label={titleOf(section)}
            caption={t('siddur.minyanOnly')}
            expanded={expanded}
            onPress={() => toggleBlock(key)}
          />
          {expanded ? (
            <MeasuredView style={[styles.labeledBody, labeledEdge, { borderColor: colors.minyan }]}>
              {section.optional
                ? optionalSection(section, section.optional, folds)
                : sectionBody(section, folds, colors.minyan)}
            </MeasuredView>
          ) : null}
        </>
      );
    }
    if (section.optional) return optionalSection(section, section.optional, folds, makeUpDone(section));
    return (
      <>
        <Text style={[typography.title, styles.sectionTitle, { color: colors.goldText }]}>{titleOf(section)}</Text>
        {sectionBody(section, folds, colors.text)}
      </>
    );
  };
  const contentStyle = useMemo(() => [styles.content, { paddingTop: LIST_PADDING + fold.space }], [fold.space]);
  const picker = useMemo(() => pickerEntries(sections), [sections]);
  const currentEntry = pickerEntryAt(picker, sections, Math.min(shownSection, sections.length - 1));
  const segmentOffset = (key: string) => {
    const entry = segmentLayouts.current.get(key);
    if (!entry) return undefined;
    let y = entry.y;
    for (let node = entry.parent; node; node = node.parent) y += node.y;
    return y;
  };
  const holdForJump = () => {
    autoScroll.hold(AUTO_SCROLL_RESUME_MS);
    fold.freeze();
  };
  // The target lands just under whatever covers the top of the list, the full block or the compact bar.
  const landing = (offset: number | undefined) => {
    const inset = fold.inset();
    if (offset === undefined) return inset === 0 ? {} : { viewOffset: inset };
    return { viewOffset: inset === 0 ? -offset : inset - offset };
  };
  const settleOnSegment = (index: number, segmentKey: string, deadline: number) => {
    jumpTimer.current = setTimeout(() => {
      const offset = segmentOffset(segmentKey);
      if (offset !== undefined) {
        holdForJump();
        listRef.current?.scrollToIndex({ index, animated: false, ...landing(offset) });
      } else if (Date.now() < deadline) {
        settleOnSegment(index, segmentKey, deadline);
      }
    }, JUMP_RETRY_MS);
  };
  const jumpTo = (index: number, deadline = Date.now() + JUMP_TIMEOUT_MS, segmentKey: string | null = null) => {
    const list = listRef.current;
    clearTimeout(jumpTimer.current);
    if (!list) return;
    holdForJump();
    jumpMissed.current = false;
    const offset = segmentKey ? segmentOffset(segmentKey) : undefined;
    list.scrollToIndex({ index, animated: false, ...landing(offset) });
    if (!jumpMissed.current) {
      setShownSection(index);
      setRenderUpTo(null);
      if (segmentKey && offset === undefined) settleOnSegment(index, segmentKey, Date.now() + SEGMENT_SETTLE_MS);
    } else if (Date.now() < deadline) {
      setRenderUpTo(index);
      jumpTimer.current = setTimeout(() => jumpTo(index, deadline, segmentKey), JUMP_RETRY_MS);
    } else {
      setRenderUpTo(null);
    }
  };
  const sizeIndex = SIDDUR_FONT_SIZES.findIndex((size) => size >= fontSize);
  const currentIndex = sizeIndex === -1 ? SIDDUR_FONT_SIZES.length - 1 : sizeIndex;

  const body = (() => {
    if (!mitzvah && !standalone && !chok) return <Message text={t('errors.generic')} />;
    if (chok && chokInstall === null) {
      return (
        <View style={styles.center}>
          <Text style={[typography.body, { color: colors.textSub }]}>{t('chok.addon.readerMissing')}</Text>
          <Button
            label={t('chok.addon.goDownload')}
            onPress={() => router.push(`/mitzvah/${CHOK_TEXT_ID}`)}
            style={styles.retryAction}
          />
        </View>
      );
    }
    if (textId === SELICHOT_TEXT_ID && !selichotInstalled) {
      return (
        <View style={styles.center}>
          <Text style={[typography.body, { color: colors.textSub }]}>
            {t('selichot.addon.readerMissing', { nusach: t(`nusach.${nusach}`) })}
          </Text>
          <Button
            label={t('selichot.addon.goDownload')}
            onPress={() => router.push(`/mitzvah/${SELICHOT_TEXT_ID}`)}
            style={styles.retryAction}
          />
        </View>
      );
    }
    if (!available) return <Message text={t('siddur.unavailable')} />;
    if (loadStatus === 'loading') {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} />
          <Text style={[typography.body, { color: colors.textSub, marginTop: spacing.md }]}>{t('siddur.loading')}</Text>
        </View>
      );
    }
    if (loadStatus === 'error') {
      return (
        <View style={styles.center}>
          <Text style={[typography.body, { color: colors.textSub }]}>{t('siddur.error')}</Text>
          <Button
            label={t('errors.retry')}
            onPress={() => setAttempt((value) => value + 1)}
            style={styles.retryAction}
          />
        </View>
      );
    }
    if (!sections.length) return <Message text={t('siddur.unavailable')} />;
    return null;
  })();
  const autoScroll = useAutoScroll(
    listRef,
    autoScrollOn &&
      focused &&
      !screenReader &&
      !body &&
      !pickerOpen &&
      !quiet &&
      !bookmarksOpen &&
      saving === null &&
      resumeOffer === null &&
      !compassPromptOpen &&
      !lateMark.open,
    autoScrollPixelsPerSecond(SIDDUR_SCROLL_SPEEDS[scrollSpeedLevel(scrollSpeed) - 1], textSize),
    onUserScroll,
    onScrollReport,
    fold,
  );
  const pendingShift = useRef(0);
  const { gesturing } = autoScroll;
  const onFullLayout = (event: LayoutChangeEvent) => {
    const previous = fold.fullHeight();
    const delta = fold.setFull(event.nativeEvent.layout.height);
    if (delta !== 0 && autoScroll.offset.value > previous) pendingShift.current = delta;
  };
  useEffect(() => {
    if (pendingShift.current === 0) return;
    const offset = autoScroll.offset.value + pendingShift.current;
    pendingShift.current = 0;
    if (gesturing()) return;
    fold.freeze();
    listRef.current?.scrollToOffset({ offset, animated: false });
  }, [fold, autoScroll.offset, gesturing, listRef]);
  const placeholder = body !== null && loadStatus === 'loading' && available;
  const bookmarkable = bookmarkTextId !== null && (!body || placeholder);
  const placeInView = () =>
    placeAt(
      sections,
      (title) => sectionHeights.current.get(title),
      segmentOffset,
      LIST_PADDING + fold.fullHeight() + headerHeight.current,
      autoScroll.offset.value + fold.inset(),
    );
  const currentPlace = () =>
    placeInView() ?? (sections.length ? firstPlace(sections[Math.min(shownSection, sections.length - 1)]) : null);
  topSectionRef.current = (fallback) => {
    if (fold.inset() === 0) return fallback;
    const title = placeInView()?.sectionTitle;
    const index = title === undefined ? -1 : sections.findIndex((section) => section.title.he === title);
    return index >= 0 ? index : fallback;
  };
  persistRef.current = () => {
    clearTimeout(saveTimer.current);
    if (!bookmarkTextId || finished.current || !sections.length) return;
    if (!moved.current && autoScroll.offset.value <= 0) return;
    const place = currentPlace();
    if (!place) return;
    if (isTextStart(sections, place)) {
      clearLastPosition(bookmarkTextId);
      return;
    }
    saveLastPosition(bookmarkTextId, {
      nusach: placeNusach,
      sectionTitle: place.sectionTitle,
      segmentKey: place.segmentKey,
      appDay: dateKey(appDay(new Date(), location)),
      savedAt: Date.now(),
    });
  };
  const showToast = (text: string) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
    AccessibilityInfo.announceForAccessibility(text);
  };
  const bookmarkHere = (): NewBookmark | null => {
    const place = bookmarkTextId ? currentPlace() : null;
    const section = place && sections.find((candidate) => candidate.title.he === place.sectionTitle);
    const segment = place && section?.segments.find((candidate) => candidate.key === place.segmentKey);
    if (!bookmarkTextId || !place || !section || !segment) return null;
    return {
      textId: bookmarkTextId,
      nusach: placeNusach,
      sectionTitle: place.sectionTitle,
      segmentKey: place.segmentKey,
      label: [titleOf(section), segmentLead(segment)].filter(Boolean).join(' · '),
    };
  };
  const saveNew = (entry: NewBookmark) => {
    setSaving(null);
    Haptics.selectionAsync().catch(() => {});
    addBookmark(entry);
    showToast(t('siddur.bookmarks.added'));
  };
  const saveOver = (id: string, entry: NewBookmark) => {
    setSaving(null);
    Haptics.selectionAsync().catch(() => {});
    replaceBookmark(id, entry);
    showToast(t('siddur.bookmarks.replaced'));
  };
  // With bookmarks already in this text, the star asks whether to add one or move one of them here.
  const addBookmarkHere = () => {
    const entry = bookmarkHere();
    if (!entry) return;
    if (shownBookmarks.length) setSaving(entry);
    else saveNew(entry);
  };
  const goToPlace = (target: SiddurPlace) => {
    setBookmarksOpen(false);
    const away = placeAway(target.segmentKey);
    if (away) {
      if (chokInstall?.files[away.parasha] === undefined) return;
      const inWeek =
        weekPortion !== null && chokChosen(weekPortion.parashiyot, doubleChoice ?? 'first').includes(away.parasha);
      setBrowsing(inWeek ? null : away.parasha);
      setChokSlot(away.slot);
      setPendingPlace(target);
      return;
    }
    const found = placeTarget(sections, target);
    if (found) jumpTo(found.index, Date.now() + JUMP_TIMEOUT_MS, found.segmentKey);
  };
  const resume = () => {
    if (!resumeOffer) return;
    setResumeOffer(null);
    goToPlace(resumeOffer);
  };
  const resumePlace = resumeOffer ? placeAway(resumeOffer.segmentKey) : null;
  const rowOf = (place: SiddurPlace, titled: boolean) => {
    const there = chok ? chokPlaceOf(place.segmentKey) : null;
    if (there) return { caption: placeText(there), disabled: chokInstall?.files[there.parasha] === undefined };
    const target = placeTarget(sections, place);
    return {
      caption: target ? (titled ? titleOf(sections[target.index]) : undefined) : t('siddur.bookmarks.notToday'),
      disabled: !target,
    };
  };
  const lastRow = lastPlace ? rowOf(lastPlace, true) : null;
  const listShown = body === null;
  const resetScroll = autoScroll.reset;
  useEffect(() => {
    if (listShown) return;
    moved.current = false;
    resetScroll();
  }, [listShown, resetScroll]);

  useEffect(() => {
    if (!chok) return;
    setToggled(new Set());
    setShownSection(0);
    moved.current = false;
    resetScroll();
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [chok, chokWeekKey, shownSlot, doubleChoice, listRef, resetScroll]);

  useEffect(() => {
    if (landedSection.current || (!params.section && !params.segment) || !listShown) return;
    landedSection.current = true;
    // The search lands on a passage by its segment key, or on a section the picker may not list.
    if (params.segment) {
      const index = sections.findIndex((section) => section.segments.some((seg) => seg.key === params.segment));
      if (index >= 0) jumpTo(index, Date.now() + JUMP_TIMEOUT_MS, params.segment);
      return;
    }
    const entry = picker.find((candidate) => candidate.title.he === params.section);
    const index = entry ? entry.index : sections.findIndex((section) => section.title.he === params.section);
    if (index >= 0) jumpTo(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- jumpTo is rebuilt on every render; the ref lands once per open
  }, [params.section, params.segment, listShown, picker, sections]);

  useEffect(() => {
    if (!pendingPlace || load.status !== 'chok' || loadStale) return;
    setPendingPlace(null);
    const index = sections.findIndex((section) =>
      section.segments.some((segment) => segment.key === pendingPlace.segmentKey),
    );
    if (index >= 0) jumpTo(index, Date.now() + JUMP_TIMEOUT_MS, pendingPlace.segmentKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- jumpTo is rebuilt on every render; the place lands once
  }, [pendingPlace, load.status, loadStale, sections]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.stage}>
        <ReaderOverlay
          fold={fold}
          onFullLayout={onFullLayout}
          compact={
            <ScreenHeader
              compact
              title={name}
              onBack={goBack}
              onCompactPress={fold.unfold}
              compactLabel={t('siddur.compact.expand')}
              actions={
                <>
                  <PlayToggle
                    on={autoScrollOn}
                    onPress={toggleAutoScroll}
                    accessibilityLabel={t('siddur.autoScroll')}
                  />
                  <HeaderPill
                    icon="chevronDown"
                    label={t('siddur.compact.tools')}
                    accessibilityLabel={t('siddur.compact.expand')}
                    onPress={fold.unfold}
                  />
                </>
              }
            />
          }
        >
          <ScreenHeader
            title={name}
            subtitle={subtitle}
            onBack={goBack}
            actions={
              settingsTarget || bookmarkable || compassPrayer ? (
                <>
                  {settingsTarget ? (
                    <HeaderPill
                      icon="sliders"
                      accessibilityLabel={t('siddur.mitzvahSettings')}
                      onPress={openMitzvahSettings}
                    />
                  ) : null}
                  {compassPrayer ? (
                    <HeaderPill icon="compass" accessibilityLabel={t('siddur.openCompass')} onPress={openCompass} />
                  ) : null}
                  {bookmarkable ? (
                    <>
                      <HeaderPill
                        icon="star"
                        accessibilityLabel={t('siddur.bookmarks.add')}
                        onPress={addBookmarkHere}
                        disabled={placeholder}
                      />
                      <HeaderPill
                        label={t('siddur.bookmarks')}
                        onPress={() => setBookmarksOpen(true)}
                        disabled={placeholder}
                      />
                    </>
                  ) : null}
                </>
              ) : undefined
            }
          >
            <View style={styles.toolbarStack}>
              {weekPortion && chokPortion && available ? (
                <ChokWeekControls
                  week={weekPortion.parashiyot}
                  browsing={browsing}
                  onBrowse={browse}
                  offered={CHOK_PARASHIYOT.filter((parasha) => chokInstall?.files[parasha] !== undefined)}
                  slots={chokSlotsOf(chokPortion.parashiyot[0])}
                  slot={chokPortion.slot}
                  onSlot={setChokSlot}
                  names={chokPortion.parashiyot.map((parasha) => chokParashaName(parasha, language))}
                  choice={doubleChoice ?? 'first'}
                  onChoice={chooseDouble}
                  asking={asking}
                  onAskClose={() => setAsking(false)}
                />
              ) : null}
              {placeholder || hasCommentaryPassages || (picker.length > 1 && currentEntry) ? (
                <View style={styles.pickerRow}>
                  {placeholder ? (
                    <PickerCard
                      title={PLACEHOLDER_TITLE}
                      accessibilityLabel={`${t('siddur.pickSection')}: ${PLACEHOLDER_TITLE}`}
                      onPress={() => {}}
                      style={styles.pickerBeside}
                    />
                  ) : picker.length > 1 && currentEntry ? (
                    <PickerCard
                      title={entryTitle(currentEntry)}
                      accessibilityLabel={`${t('siddur.pickSection')}: ${entryTitle(currentEntry)}`}
                      onPress={() => setPickerOpen(true)}
                      style={styles.pickerBeside}
                    />
                  ) : null}
                  {hasCommentaryPassages ? (
                    <View
                      accessibilityRole="radiogroup"
                      accessibilityLabel={t('chok.commentary')}
                      style={styles.commentaryBeside}
                    >
                      <SegmentedControl
                        options={COMMENTARY_STATES.map((state) => ({
                          value: state,
                          label: t(`chok.commentary.${state}`),
                        }))}
                        value={commentaryOpen ? 'open' : 'folded'}
                        onChange={(state) => changeCommentaryOpen(state === 'open')}
                        style={styles.commentaryControl}
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}
              <View style={styles.toolbar}>
                {hasMinyanPassages || (placeholder && mitzvah?.group === 'prayers') ? (
                  <View
                    accessibilityRole="radiogroup"
                    accessibilityLabel={t('settings.prayerMode')}
                    style={styles.prayerMode}
                  >
                    <SegmentedControl
                      options={PRAYER_MODES.map((mode) => ({ value: mode, label: t(`prayerMode.${mode}`) }))}
                      value={prayerMode}
                      onChange={changePrayerMode}
                    />
                  </View>
                ) : null}
                <SizeButton
                  label="A+"
                  accessibilityLabel={t('siddur.larger')}
                  disabled={currentIndex === SIDDUR_FONT_SIZES.length - 1}
                  onPress={() =>
                    setFontSize(SIDDUR_FONT_SIZES[Math.min(SIDDUR_FONT_SIZES.length - 1, currentIndex + 1)])
                  }
                />
                <SizeButton
                  label="A−"
                  accessibilityLabel={t('siddur.smaller')}
                  disabled={currentIndex === 0}
                  onPress={() => setFontSize(SIDDUR_FONT_SIZES[Math.max(0, currentIndex - 1)])}
                />
                <ScrollSpeedStepper compact level={scrollSpeed} onChange={setScrollSpeed} />
                <PlayToggle on={autoScrollOn} onPress={toggleAutoScroll} accessibilityLabel={t('siddur.autoScroll')} />
              </View>
            </View>
          </ScreenHeader>

          {(offSeason || windowChoice.passed) && !body ? (
            <View style={styles.resume}>
              <Banner
                tone="info"
                text={t(offSeason ? 'siddur.offSeason' : 'siddur.timePassed')}
                style={styles.resumeBanner}
              />
            </View>
          ) : null}

          {resumeOffer && !body ? (
            <View style={styles.resume}>
              <Banner
                tone="accent"
                text={resumePlace ? t('chok.resume', { place: placeText(resumePlace) }) : t('siddur.resume')}
                style={styles.resumeBanner}
              />
              <View style={styles.resumeActions}>
                <Button
                  size="compact"
                  label={t('siddur.resume.continue')}
                  onPress={resume}
                  style={styles.resumeAction}
                />
                <Button
                  size="compact"
                  variant="secondary"
                  label={t('siddur.resume.fromStart')}
                  onPress={() => setResumeOffer(null)}
                  style={styles.resumeAction}
                />
              </View>
            </View>
          ) : null}
        </ReaderOverlay>

        {body ? (
          <View style={[styles.bodyWrap, { paddingTop: fold.space }]}>{body}</View>
        ) : (
          <TapGuardContext.Provider value={taps.consume}>
            <Animated.FlatList
              ref={listRef}
              testID="siddur-list"
              data={sections}
              extraData={listExtraData}
              keyExtractor={(section) => section.title.he}
              initialNumToRender={4}
              windowSize={renderUpTo !== null ? Number.POSITIVE_INFINITY : undefined}
              maxToRenderPerBatch={
                renderUpTo !== null ? Math.min(sections.length, renderUpTo + JUMP_NEIGHBOURS) : undefined
              }
              viewabilityConfig={SECTION_VIEWABILITY}
              onViewableItemsChanged={onViewableSectionsChanged}
              contentContainerStyle={contentStyle}
              ListHeaderComponent={
                chok ? (
                  <View
                    onTouchStart={taps.consume}
                    onLayout={(event) => {
                      headerHeight.current = event.nativeEvent.layout.height;
                    }}
                  >
                    <ChokLicenseNotice style={styles.licenseNotice} />
                  </View>
                ) : null
              }
              onScrollToIndexFailed={() => {
                jumpMissed.current = true;
              }}
              onScroll={autoScroll.scrollHandler}
              animatedProps={autoScroll.animatedProps}
              {...(autoScroll.webInput.onWheel ? { onWheel: autoScroll.webInput.onWheel } : {})}
              onTouchStart={(event) => {
                autoScroll.webInput.onTouchStart?.();
                taps.onTouchStart(event);
              }}
              onTouchEnd={(event) => {
                autoScroll.webInput.onTouchEnd?.();
                taps.onTouchEnd(event);
              }}
              onTouchCancel={() => {
                autoScroll.webInput.onTouchCancel?.();
                taps.onTouchCancel();
              }}
              scrollEventThrottle={16}
              onLayout={autoScroll.onLayout}
              onContentSizeChange={autoScroll.onContentSizeChange}
              renderItem={({ item: section }) => (
                <View
                  testID={`siddur-section-${section.title.he}`}
                  onLayout={(event) => sectionHeights.current.set(section.title.he, event.nativeEvent.layout.height)}
                >
                  {section.headings?.map((heading) => (
                    <Text
                      key={heading.he}
                      accessibilityRole="header"
                      style={[
                        heading.level === 1 ? typography.title : typography.heading,
                        styles.sectionHeading,
                        { color: colors.goldText },
                      ]}
                    >
                      {nameOf(heading)}
                    </Text>
                  ))}
                  <MeasuredView>
                    <Card padded style={styles.sectionCard}>
                      {sectionCard(section)}
                    </Card>
                  </MeasuredView>
                </View>
              )}
              ListFooterComponent={
                <>
                  {browsing ? (
                    <View style={styles.browsingFooter}>
                      <Text style={[typography.caption, styles.browsingNote, { color: colors.textSub }]}>
                        {t('chok.browsing.note')}
                      </Text>
                      <TapGuard>
                        <Button
                          variant="secondary"
                          label={t('chok.browsing.back')}
                          onPress={() => browse(null)}
                          style={styles.doneAction}
                        />
                      </TapGuard>
                    </View>
                  ) : doneTarget ? (
                    doneTarget.done ? (
                      <View style={styles.doneRow}>
                        <MitzvahIcon name="check" size={DONE_ICON_SIZE} color={colors.safe} />
                        <Text style={[typography.bodyBold, { color: colors.safe }]}>{t('siddur.doneAlready')}</Text>
                      </View>
                    ) : (
                      <TapGuard>
                        <Button
                          label={t('siddur.done')}
                          onPress={() =>
                            thuNightUnanswered ? setAskingThuNight(true) : finish(doneTarget.id, doneTarget.date)
                          }
                          style={styles.doneAction}
                        />
                      </TapGuard>
                    )
                  ) : null}

                  {readyText?.dedication ? (
                    <Text style={[typography.caption, styles.dedication, { color: colors.textSub }]}>
                      {readyText.dedication}
                    </Text>
                  ) : null}

                  {readyText?.credits.length ? (
                    <View style={styles.credits}>
                      <Text style={[typography.captionBold, { color: colors.textSub }]}>{t('siddur.sources')}</Text>
                      <Text style={[typography.caption, { color: colors.textMuted, marginTop: scaled(2) }]}>
                        {t('siddur.adapted')}
                      </Text>
                      {readyText.credits.map((credit) => (
                        <Pressable
                          key={credit.title}
                          onPress={() => Linking.openURL(credit.url).catch(() => {})}
                          onTouchStart={taps.consume}
                          accessibilityRole="link"
                        >
                          <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
                            {credit.title} · {credit.license}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </>
              }
            />
          </TapGuardContext.Provider>
        )}
      </View>

      <BottomSheet visible={pickerOpen} title={t('siddur.pickSection')} onClose={() => setPickerOpen(false)}>
        <ScrollView ref={pickerRef} style={styles.sheetList}>
          {picker.map((entry) => {
            const selected = entry.index === currentEntry?.index;
            return (
              <SheetAction
                key={entry.index}
                label={entryTitle(entry)}
                selected={selected}
                onLayout={
                  selected
                    ? (event) =>
                        pickerRef.current?.scrollTo({
                          y: Math.max(0, event.nativeEvent.layout.y - scaled(96)),
                          animated: false,
                        })
                    : undefined
                }
                onPress={() => {
                  setPickerOpen(false);
                  jumpTo(entry.index);
                }}
              />
            );
          })}
        </ScrollView>
      </BottomSheet>

      <BottomSheet
        visible={bookmarksOpen}
        title={t('siddur.bookmarks')}
        caption={!lastPlace && !shownBookmarks.length ? t('siddur.bookmarks.empty') : undefined}
        onClose={() => setBookmarksOpen(false)}
      >
        {lastPlace || shownBookmarks.length ? (
          <ScrollView style={styles.sheetList}>
            {lastPlace && lastRow ? (
              <ListRow
                icon="siddur"
                title={t('siddur.bookmarks.lastPlace')}
                caption={lastRow.caption}
                disabled={lastRow.disabled}
                onPress={() => goToPlace(lastPlace)}
                style={styles.sheetRow}
              />
            ) : null}
            {shownBookmarks.map((bookmark) => {
              const row = rowOf(bookmark, false);
              return (
                <View key={bookmark.id} testID={`siddur-bookmark-${bookmark.id}`} style={styles.bookmarkRow}>
                  <ListRow
                    icon="star"
                    title={bookmark.label}
                    caption={row.caption}
                    disabled={row.disabled}
                    onPress={() => goToPlace(bookmark)}
                    style={[styles.sheetRow, styles.bookmarkMain]}
                  />
                  <Pressable
                    onPress={() => removeBookmark(bookmark.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t('siddur.bookmarks.delete')}
                    hitSlop={scaled(10)}
                    style={[styles.deleteBtn, { backgroundColor: colors.surface2 }]}
                  >
                    <MitzvahIcon
                      name="close"
                      size={DELETE_ICON_SIZE}
                      color={colors.textMuted}
                      strokeWidth={DELETE_ICON_STROKE}
                    />
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        ) : null}
      </BottomSheet>

      <BottomSheet
        visible={saving !== null}
        title={t('siddur.bookmarks.saveTitle')}
        caption={t('siddur.bookmarks.saveCaption')}
        onClose={() => setSaving(null)}
      >
        <ScrollView style={styles.sheetList}>
          <SheetAction label={t('siddur.bookmarks.new')} onPress={() => saving && saveNew(saving)} />
          {shownBookmarks.map((bookmark) => (
            <SheetAction
              key={bookmark.id}
              label={bookmark.label}
              caption={t('siddur.bookmarks.replaceCaption')}
              onPress={() => saving && saveOver(bookmark.id, saving)}
            />
          ))}
        </ScrollView>
      </BottomSheet>

      <BottomSheet visible={askingThuNight} title={t('chok.thuNight.ask')} onClose={() => setAskingThuNight(false)}>
        <SheetAction label={t('chok.thuNight.thu')} onPress={() => chooseThuNightDay('thu')} />
        <SheetAction label={t('chok.thuNight.fri')} onPress={() => chooseThuNightDay('fri')} />
      </BottomSheet>

      {lateMark.dialog}

      <ConfirmDialog
        visible={compassPromptOpen}
        title={t('siddur.compassPrompt.title')}
        body={t('siddur.compassPrompt.body')}
        confirmLabel={t('common.yes')}
        cancelLabel={t('common.no')}
        countdownMs={screenReader ? undefined : COMPASS_PROMPT_MS}
        onConfirm={openCompass}
        onCancel={() => setCompassPromptOpen(false)}
      />

      {toast ? (
        <View pointerEvents="none" accessibilityLiveRegion="polite" style={styles.toast}>
          <View
            style={[
              styles.toastPanel,
              { backgroundColor: colors.surface },
              shadowStyle(colors.shadowStrong, shadowPresets.raised),
            ]}
          >
            <Banner tone="safe" text={toast} style={styles.toastBanner} />
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function Message({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <Text style={[typography.body, { color: colors.textSub, textAlign: 'center' }]}>{text}</Text>
    </View>
  );
}

function SizeButton({
  label,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={scaled(6)}
      style={[styles.sizeBtn, { backgroundColor: colors.surface2, opacity: disabled ? 0.4 : 1 }]}
    >
      <Text style={[typography.captionBold, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

function PlayToggle({
  on,
  onPress,
  accessibilityLabel,
}: {
  on: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: on }}
      hitSlop={scaled(6)}
      style={({ pressed }) => [
        styles.roundBtn,
        { backgroundColor: on ? colors.gold : colors.surface2 },
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Svg width={PLAY_ICON_SIZE} height={PLAY_ICON_SIZE} viewBox="0 0 24 24">
        <Path d={on ? PAUSE_PATH : PLAY_PATH} fill={on ? colors.onGold : colors.text} />
      </Svg>
    </Pressable>
  );
}

function OptionalToggle({
  label,
  caption,
  expanded,
  onPress,
  large = false,
  tone = 'optional',
}: {
  label: string;
  caption?: string;
  expanded: boolean;
  onPress: () => void;
  large?: boolean;
  tone?: 'optional' | 'minyan';
}) {
  const { colors } = useTheme();
  const consume = useContext(TapGuardContext);
  const accent = tone === 'minyan' ? colors.minyan : colors.optional;
  return (
    <Pressable
      onPress={onPress}
      onTouchStart={consume}
      accessibilityRole="button"
      aria-expanded={expanded}
      style={({ pressed }) => [
        styles.optionalToggle,
        { backgroundColor: tone === 'minyan' ? colors.surface2 : colors.optionalBg, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <View style={styles.optionalLabel}>
        <Text style={[large ? typography.heading : typography.bodyBold, { color: accent }]}>{label}</Text>
        {caption ? <Text style={[typography.caption, { color: accent }]}>{caption}</Text> : null}
      </View>
      <MitzvahIcon
        name={expanded ? 'chevronUp' : 'chevronDown'}
        size={CHEVRON_SIZE}
        color={accent}
        strokeWidth={CHEVRON_STROKE}
      />
    </Pressable>
  );
}

function SegmentView({
  segment,
  fontSize,
  showEnglish,
  color,
  layouts,
}: {
  segment: SiddurSegment;
  fontSize: number;
  showEnglish: boolean;
  color: string;
  layouts: SegmentLayouts;
}) {
  const { colors } = useTheme();
  const parent = useContext(LayoutNodeContext);
  const key = segment.key;
  useEffect(() => {
    if (!key) return undefined;
    return () => {
      layouts.delete(key);
    };
  }, [key, layouts]);
  const runStyle = (run: Run) => {
    if (run.s === 'n') {
      return { fontFamily: fontFamilies.heebo.regular, fontSize: Math.round(fontSize * 0.62), color: colors.textMuted };
    }
    if (run.s === 'b') return { fontFamily: fontFamilies.siddur.bold };
    if (run.s === 't') return { fontSize: Math.round(fontSize * 0.82), color: colors.textSub };
    return null;
  };
  return (
    <View
      style={styles.segment}
      testID={key ? `siddur-segment-${key}` : undefined}
      onLayout={key ? (event) => layouts.set(key, { y: event.nativeEvent.layout.y, parent }) : undefined}
    >
      {segment.he.map((runs, index) => (
        <Text
          key={index}
          style={[
            styles.hebrew,
            { fontFamily: fontFamilies.siddur.regular, fontSize, lineHeight: siddurLineHeight(fontSize), color },
          ]}
        >
          {runs.map((run, runIndex) => (
            <Text key={runIndex} style={runStyle(run)}>
              {run.t}
            </Text>
          ))}
        </Text>
      ))}
      {showEnglish && segment.en ? (
        <Text
          style={[
            styles.english,
            { fontSize: Math.round(fontSize * 0.68), lineHeight: Math.round(fontSize * 1.05), color: colors.textSub },
          ]}
        >
          {segment.en}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  roundBtn: {
    flexShrink: 0,
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeBtn: {
    flexShrink: 0,
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarStack: {
    gap: spacing.sm,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pickerBeside: {
    flexGrow: 1,
    flexBasis: scaled(110),
  },
  commentaryBeside: {
    flexGrow: 1.4,
    flexBasis: scaled(170),
  },
  commentaryControl: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: spacing.sm,
    rowGap: spacing.sm,
  },
  prayerMode: {
    flex: 1,
    minWidth: scaled(96),
  },
  content: {
    padding: LIST_PADDING,
    paddingBottom: spacing.xxxl,
  },
  stage: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    zIndex: 10,
    overflow: 'hidden',
  },
  compactBar: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
  },
  bodyWrap: {
    flex: 1,
  },
  sectionCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  sectionHeading: {
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  segment: {
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  addedToday: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  addedTodayLabel: {
    textAlign: RIGHT_EDGE,
    paddingHorizontal: spacing.sm,
    marginBottom: scaled(2),
  },
  optionalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  optionalLabel: {
    flex: 1,
  },
  labeledBody: {
    marginBottom: spacing.sm,
  },
  labeledLeftEdge: {
    borderLeftWidth: 2,
    paddingLeft: spacing.xs,
  },
  labeledRightEdge: {
    borderRightWidth: 2,
    paddingRight: spacing.xs,
  },
  minyanLabel: {
    paddingHorizontal: spacing.sm,
    marginBottom: scaled(2),
  },
  hebrew: {
    textAlign: RIGHT_EDGE,
    writingDirection: 'rtl',
  },
  english: {
    fontFamily: fontFamilies.heebo.regular,
    textAlign: LEFT_EDGE,
    writingDirection: 'ltr',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  doneAction: {
    marginTop: spacing.sm,
  },
  retryAction: {
    marginTop: spacing.md,
    alignSelf: 'center',
  },
  licenseNotice: {
    marginBottom: spacing.md,
  },
  browsingFooter: {
    paddingVertical: spacing.lg,
  },
  browsingNote: {
    textAlign: 'center',
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  dedication: {
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  credits: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  sheetList: {
    maxHeight: scaled(420),
  },
  resume: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  resumeBanner: {
    marginBottom: spacing.sm,
  },
  resumeActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  resumeAction: {
    flexGrow: 1,
  },
  sheetRow: {
    paddingHorizontal: 0,
  },
  bookmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  bookmarkMain: {
    flex: 1,
  },
  deleteBtn: {
    width: scaled(24),
    height: scaled(24),
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toast: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    zIndex: 900,
    elevation: 900,
  },
  toastPanel: {
    borderRadius: radius.lg,
  },
  toastBanner: {
    marginBottom: 0,
  },
});
