import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { openSystemSettings } from '@/services/externalFlow';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { setStatusBarStyle } from 'expo-status-bar';
import { Banner, BannerTone } from '@/components/Banner';
import { BottomSheet, SheetAction } from '@/components/BottomSheet';
import { Card } from '@/components/Card';
import { DayArcHero } from '@/components/DayArcHero';
import { HomeTimes } from '@/components/HomeTimes';
import { DayLookEntry, DayLooks } from '@/components/DayLooks';
import { Reveal } from '@/components/Reveal';
import { IconTile } from '@/components/IconTile';
import { ListRow } from '@/components/ListRow';
import { IconName, iconFor } from '@/components/MitzvahIcon';
import { NowCard } from '@/components/NowCard';
import { SectionLabel } from '@/components/SectionLabel';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useSelichotDownloadFlow } from '@/components/SelichotAddonCard';
import { useDayModel } from '@/hooks/useDayModel';
import { useLateMarkDialog } from '@/hooks/useLateMarkDialog';
import { useViewport, ViewportContext } from '@/hooks/useInView';
import { useIsFocused, useReplayKey } from '@/hooks/useIsFocused';
import { useNow } from '@/hooks/useNow';
import { CHOK_TEXT_ID } from '@/data/chok';
import { SHNAYIM_TEXT_ID } from '@/data/shnayim';
import { getLocationName } from '@/data/cities';
import { SELICHOT_TEXT_ID } from '@/data/selichot';
import { hasSiddurText, selichotOfferOn, siddurPlace } from '@/data/siddur';
import { HebcalService } from '@/services/HebcalService';
import { StorageService } from '@/services/StorageService';
import { CompletionService } from '@/services/CompletionService';
import { selichotDownloadSupported } from '@/services/SelichotContentService';
import { dateKey, useCompletionsStore } from '@/stores/useCompletionsStore';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { useTaharahStore } from '@/stores/useTaharahStore';
import { HomeLook, useUserStore } from '@/stores/useUserStore';
import { remindersOf, useMitzvotStore } from '@/stores/useMitzvotStore';
import { windowNotificationCount } from '@/services/notifications/planners/mitzvot';
import { quietHoursOf } from '@/utils/quietHours';
import { useShallow } from 'zustand/react/shallow';
import { scaled } from '@/theme/scale';
import { useTheme } from '@/theme/ThemeProvider';
import { useQuietBlock } from '@/components/ShabbatScreen';
import { typography } from '@/theme/typography';
import { durations, motion, spacing } from '@/theme/tokens';
import { afterPaint } from '@/utils/afterPaint';
import { clockOf, clockRange } from '@/utils/clock';
import { shemaOpinionsFor, shemaOpinionsLine } from '@/utils/shemaOpinions';
import { DayWindow, appDayWindow, currentOrNextWindow } from '@/utils/buildDayTimeline';
import { checkInLastDay, checkInPhraseKey, latestCheckIn, overlapsBlock, trackedOn } from '@/utils/checkIn';
import { Mitzvah } from '@/types/mitzvah';
import { TaharahEvent, TaharahSettings } from '@/types/taharah';
import { Location } from '@/types/zmanim';
import { dayFrameFor, moreZmanimFor, type CardGlass } from '@/utils/dayArc';
import { learnedHabit, markStat, timeChips } from '@/utils/homeTimes';
import { homeCard, markHistory } from '@/utils/homeCard';
import { MITZVOT } from '@/data/mitzvot';
import { offeredMoreZmanim, type ZmanId } from '@/utils/zmanIds';
import { computeStreak } from '@/utils/historyStats';
import { DayEntry, dayEntryStatusText, firstName, greetingKey, heroCaption, orderDayEntries } from '@/utils/homeDay';
import { hilulaMessage, holyBlockMessage, roshChodeshMessage, streakMessage } from '@/utils/homeMessages';
import { appDay, appDayKey, locationNoon } from '@/utils/locationDay';
import { deriveCycle } from '@/utils/taharah/cycle';
import { currentOnah } from '@/utils/taharah/onot';
import { renderHint, stageHint, visibleStage } from '@/utils/taharah/summary';
import { taharahTasksFor } from '@/utils/taharah/tasks';
import { ZmanimService } from '@/services/ZmanimService';
import {
  NotificationScheduler,
  syncNotificationPermissionStatus,
  dismissCompletedPresentedNotifications,
  refreshSchedulingOnForeground,
} from '@/services/NotificationScheduler';
import { clearLastError, reportError, useLastError } from '@/services/errors';
import { formatDate, useI18n } from '@/i18n';

type LiveItem = {
  mitzvah: Mitzvah;
  window: DayWindow;
  pct: number;
  urgent: boolean;
  name: string;
  hasText: boolean;
  marked: boolean;
};

const PROFILE_INTRO_KEY = 'profile:intro-dismissed';

type CompletedItem = {
  id: string;
  name: string;
  icon: IconName;
  timestamp: number;
  wasSkipped: boolean;
  wasLate: boolean;
  date: Date;
  window: DayWindow | null;
};

type SkyTop = { color: string; lightInk: boolean };

const nonNull = <T,>(value: T | null): value is T => value !== null;

type Translate = (scope: string, options?: Record<string, unknown>) => string;
type BannerSpec = { tone: BannerTone; text: string; onPress?: () => void };
type TaharahCardData = { title: string; caption: string; concealed: boolean };

function taharahCardFor(
  events: readonly TaharahEvent[],
  settings: TaharahSettings,
  location: Location,
  now: Date,
  language: 'he' | 'en',
  t: Translate,
  lockEnabled: boolean,
): TaharahCardData {
  // The session is always locked while home is showing, so the stage and tasks must not leak onto it.
  if (lockEnabled) return { title: t('taharah.home.title'), caption: t('taharah.home.open'), concealed: true };
  const state = deriveCycle(events, settings.rules, location, now);
  const task = taharahTasksFor(now, events, settings, location, now).find((item) => !item.done && item.end > now);
  return {
    concealed: false,
    title: t(`taharah.stage.${visibleStage(state, settings.role, currentOnah(now, location), location)}`),
    caption: task
      ? `${t(`taharah.task.${task.kind}`)} · ${t('taharah.task.until', { time: clockOf(task.end, location.tz) })}`
      : renderHint(
          stageHint(state, events, settings.rules, settings.role, location, now, {
            date: (civil) => formatDate(civil, 'd LLLL', language),
            clock: (instant) => clockOf(instant, location.tz),
          }),
          t,
        ),
  };
}

type SkyFrameProps = {
  setterRef: React.MutableRefObject<(next: SkyTop | null) => void>;
  focused: boolean;
  quiet: boolean;
  children: React.ReactNode;
};

function SkyFrame({ setterRef, focused, quiet, children }: SkyFrameProps) {
  const { colors, isDark } = useTheme();
  const [sky, setSky] = useState<SkyTop | null>(null);
  setterRef.current = (next) =>
    setSky((prev) => (prev?.color === next?.color && prev?.lightInk === next?.lightInk ? prev : next));
  const barStyle = sky ? (sky.lightInk ? 'light' : 'dark') : isDark ? 'light' : 'dark';

  useEffect(() => {
    if (!focused || quiet) return;
    const fallback = isDark ? 'light' : 'dark';
    setStatusBarStyle(barStyle);
    return () => setStatusBarStyle(fallback);
  }, [focused, quiet, barStyle, isDark]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: sky?.color ?? colors.surface2 }]} edges={['top']}>
      {children}
    </SafeAreaView>
  );
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const focused = useIsFocused();
  const quiet = useQuietBlock() !== null;
  const { t } = useI18n();
  const {
    allMitzvot,
    enabled,
    location,
    nusach,
    inIsrael,
    language,
    settings,
    nameFor,
    checkInInput,
    selichotInstalled,
    enabledSince,
  } = useDayModel();
  const router = useRouter();
  const playKey = useReplayKey();
  const viewport = useViewport();
  const user = useUserStore(
    useShallow((s) => ({
      locationStatus: s.locationStatus,
      notificationPermission: s.notificationPermission,
    })),
  );
  const isOnboarded = useUserStore((s) => s.isOnboarded);
  const gender = useUserStore((s) => s.gender);
  const maritalStatus = useUserStore((s) => s.maritalStatus);
  const taharahEnabled = useUserStore((s) => s.taharahEnabled);
  const profileName = useUserStore((s) => s.profileName);
  const hilulotEnabled = useUserStore((s) => s.hilulotEnabled);
  const homeLook = useUserStore((s) => s.homeLook);
  const hiddenZmanim = useUserStore((s) => s.hiddenZmanim);
  const zmanPins = useUserStore((s) => s.zmanPins);
  const addedZmanim = useUserStore((s) => s.addedZmanim);
  const homeCardPage = useUserStore((s) => s.homeCardPage);
  const homeCardMine = useUserStore((s) => s.homeCardMine);
  const homeLearn = useUserStore((s) => s.homeLearn);
  const setHomeCardPage = useUserStore((s) => s.setHomeCardPage);
  const setHomeCardMine = useUserStore((s) => s.setHomeCardMine);
  const setHomeLearn = useUserStore((s) => s.setHomeLearn);
  // The bell beside each mitzvah's name: how many notifications its window sends in all, its reminders and their
  // repeats at its own nagging level, else the app's (the owner's call of 2026-11-04), shown while the nag sends any
  // repeat. Counted once per window for as long as the inputs hold.
  const appNagLevel = useUserStore((s) => s.nagLevel);
  const quietBefore = useUserStore((s) => s.quietBefore);
  const quietAfter = useUserStore((s) => s.quietAfter);
  const activeMitzvot = useMitzvotStore((s) => s.activeMitzvot);
  const ksOpinion = settings.halachicOpinions.ksSofZman;
  const shemaNote = (id: string, date: Date) => {
    const opinions = shemaOpinionsFor(id, date, location, ksOpinion);
    return opinions ? shemaOpinionsLine(opinions, location.tz, t) : null;
  };
  const nagCountOf = useMemo(() => {
    const quietHours = quietHoursOf(quietBefore, quietAfter);
    const byId = new Map(allMitzvot.map((mitzvah) => [mitzvah.id, mitzvah]));
    const counted = new Map<string, number | null>();
    return (id: string, date: Date | null): number | null => {
      const mitzvah = byId.get(id);
      if (!mitzvah || !date) return null;
      const key = `${id}|${dateKey(date)}`;
      if (!counted.has(key)) {
        let total: number | null = null;
        try {
          const own = activeMitzvot[id]?.nagLevel;
          const manualNags = activeMitzvot[id]?.manualNags;
          // The bell marks only a mitzvah whose own level differs from the app's (the owner's call, 2026-11-04), or
          // whose nags were placed by hand on its timeline.
          if (!manualNags && (own === undefined || own === appNagLevel)) {
            counted.set(key, null);
            return null;
          }
          const nagLevel = own ?? appNagLevel;
          const reminders = remindersOf(activeMitzvot[id], mitzvah);
          const count = windowNotificationCount(mitzvah, reminders, date, {
            location,
            settings,
            quietHours,
            nagLevel,
            manualNags,
          });
          // It counts every notification of the window: the reminders and the nags.
          total = count ? count.total : null;
        } catch {
          total = null;
        }
        counted.set(key, total);
      }
      return counted.get(key) ?? null;
    };
  }, [allMitzvot, activeMitzvot, appNagLevel, location, settings, quietBefore, quietAfter]);
  const setHomeLook = useUserStore((s) => s.setHomeLook);
  const taharahEvents = useTaharahStore((s) => s.events);
  const taharahSettings = useTaharahStore((s) => s.settings);
  const taharahLockEnabled = useTaharahStore((s) => s.lockEnabled);
  const completions = useCompletionsStore((s) => s.completions);
  const checkIns = useCompletionsStore((s) => s.checkIns);
  const skipped = useCompletionsStore((s) => s.skipped);
  const late = useCompletionsStore((s) => s.late);
  const archivedDays = useCompletionsStore((s) => s.archivedDays);
  const lateMark = useLateMarkDialog();
  const [tick, setTick] = useState(0);
  // Only a memo dependency: each tick re-runs the memo, which reads the time itself.
  const tickedAt = useNow();
  const [stampingIds, setStampingIds] = useState<readonly string[]>([]);
  const [heldOpenIds, setHeldOpenIds] = useState<readonly string[]>([]);
  const stampTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const lastError = useLastError();
  const [introDismissed, setIntroDismissed] = useState(() => StorageService.get<boolean>(PROFILE_INTRO_KEY) === true);
  const skySetter = useRef<(next: SkyTop | null) => void>(() => {});

  const {
    allCurrent,
    allMissed,
    allCompleted,
    upcoming,
    totalActive,
    now,
    frame,
    dateLine,
    todayKey,
    zmanimUnavailable,
    checkIn,
    taharahCard,
    today,
    windowDays,
  } = useMemo(() => {
    const now = new Date();
    const today = appDay(now, location);
    const hebrew = HebcalService.getHebrewDateAt(now, location);

    const place = siddurPlace(location, inIsrael);
    const found = latestCheckIn(checkInInput(), now);
    const openCheckIn = found?.open ? found : null;
    const currentItems: LiveItem[] = [];
    const upcomingItems: LiveItem[] = [];
    const missedItems: LiveItem[] = [];
    // Counts what actually applies in this app day: enabled, has a window, and not skipped for
    // Shabbat/Yom Tov. Using `enabled.length` made Shabbat read "5/6" with everything applicable done.
    // A mark is filed under the day of the mitzvah's window, which after midnight is yesterday's date.
    const windowDays = new Map<string, Date>();
    const windowsById = new Map<string, DayWindow>();
    for (const mitzvah of enabled) {
      const window = appDayWindow(mitzvah, location, settings, now);
      if (!window) continue;
      const key = dateKey(window.date);
      if (!trackedOn(mitzvah, window, enabledSince, Boolean(completions[key]?.[mitzvah.id]))) continue;
      const markedAt = completions[key]?.[mitzvah.id] ?? skipped[key]?.[mitzvah.id];
      if (mitzvah.multiDay && markedAt !== undefined && appDayKey(new Date(markedAt), location) !== dateKey(today)) {
        continue;
      }
      windowDays.set(mitzvah.id, window.date);
      windowsById.set(mitzvah.id, window);
      const totalMs = window.end.getTime() - window.start.getTime();
      const remainingMs = window.end.getTime() - now.getTime();
      const item: LiveItem = {
        mitzvah,
        window,
        pct: totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0,
        urgent: remainingMs <= 45 * 60 * 1000,
        name: nameFor(mitzvah),
        hasText: hasSiddurText(mitzvah, nusach, window.date, place),
        marked: Boolean(completions[key]?.[mitzvah.id] || skipped[key]?.[mitzvah.id]),
      };
      if (now > window.end) {
        // Waiting in the check-in of the block that just ended, not missed.
        // Judged by the window itself, not by a date key, which differs once the device's zone is not
        // the location's.
        if (!openCheckIn || !overlapsBlock(window, openCheckIn.block)) missedItems.push(item);
      } else if (now >= window.start && now <= window.end) {
        currentItems.push(item);
      } else if (now < window.start) {
        if (!item.marked) upcomingItems.push(item);
      }
    }

    currentItems.sort((a, b) => a.window.end.getTime() - b.window.end.getTime());
    upcomingItems.sort((a, b) => a.window.start.getTime() - b.window.start.getTime());
    missedItems.sort((a, b) => b.window.end.getTime() - a.window.end.getTime());

    // Done and skipped share the list, so a skip is visible and has the same undo as a completion.
    const completedItems = allMitzvot
      .flatMap((mitzvah): CompletedItem[] => {
        const date = windowDays.get(mitzvah.id) ?? today;
        const key = dateKey(date);
        const done = completions[key]?.[mitzvah.id];
        const timestamp = done ?? skipped[key]?.[mitzvah.id];
        if (!timestamp) return [];
        return [
          {
            id: mitzvah.id,
            name: nameFor(mitzvah),
            icon: iconFor(mitzvah.icon),
            timestamp,
            wasSkipped: !done,
            wasLate: Boolean(done && late[key]?.[mitzvah.id]),
            date,
            window: windowsById.get(mitzvah.id) ?? null,
          },
        ];
      })
      .sort((a, b) => b.timestamp - a.timestamp);

    return {
      allCurrent: currentItems,
      allMissed: missedItems,
      allCompleted: completedItems,
      upcoming: upcomingItems,
      totalActive: windowDays.size,
      now,
      frame: dayFrameFor(today, location, settings.halachicOpinions.ksSofZman),
      dateLine: [formatDate(today, 'cccc', language), hebrew.hebrewDateStr, getLocationName(location, language)].join(
        ' · ',
      ),
      todayKey: dateKey(today),
      zmanimUnavailable: ZmanimService.getZmanim(locationNoon(today, location), location) === null,
      checkIn: openCheckIn,
      taharahCard:
        taharahEnabled && !quiet
          ? taharahCardFor(taharahEvents, taharahSettings, location, now, language, t, taharahLockEnabled)
          : null,
      today,
      windowDays,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick and tickedAt re-run the memo on purpose, it reads the clock itself; checkIns is a trigger too, checkInInput() reads it from the store
  }, [
    allMitzvot,
    enabled,
    enabledSince,
    nameFor,
    checkInInput,
    settings,
    completions,
    skipped,
    late,
    checkIns,
    language,
    t,
    location,
    tick,
    nusach,
    inIsrael,
    taharahEnabled,
    taharahEvents,
    taharahSettings,
    taharahLockEnabled,
    quiet,
    tickedAt,
  ]);

  const streak = useMemo(
    () =>
      computeStreak(
        { mitzvot: enabled, completions, skipped, checkIns, archivedDays, enabledSince, location, settings },
        new Date(),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- todayKey re-runs the streak when the app day turns
    [enabled, completions, skipped, checkIns, archivedDays, enabledSince, location, settings, todayKey],
  );
  const messages = useMemo(
    () =>
      [
        streakMessage(streak, t),
        holyBlockMessage(now, location, t),
        roshChodeshMessage(now, location, language, t),
        hilulaMessage(now, location, inIsrael, hilulotEnabled, language, t),
      ].filter(nonNull),
    [streak, now, location, language, inIsrael, hilulotEnabled, t],
  );

  const stamping = useMemo(() => new Set(stampingIds), [stampingIds]);
  const heldOpen = useMemo(() => new Set(heldOpenIds), [heldOpenIds]);
  const current = useMemo(
    () =>
      [
        ...allCurrent.filter((item) => !item.marked || stamping.has(item.mitzvah.id)),
        ...allMissed.filter((item) => heldOpen.has(item.mitzvah.id)),
      ].sort((a, b) => a.window.end.getTime() - b.window.end.getTime()),
    [allCurrent, allMissed, stamping, heldOpen],
  );
  const completed = useMemo(() => allCompleted.filter((item) => !stamping.has(item.id)), [allCompleted, stamping]);
  const doneCount = completed.filter((item) => !item.wasSkipped && windowDays.has(item.id)).length;

  const entries = useMemo(() => {
    const raw: DayEntry[] = [
      ...current.map((item) => ({
        id: item.mitzvah.id,
        status: 'active' as const,
        start: item.window.start,
        end: item.window.end,
        markedAt: null,
        date: item.window.date,
      })),
      ...upcoming.map((item) => ({
        id: item.mitzvah.id,
        status: 'upcoming' as const,
        start: item.window.start,
        end: item.window.end,
        markedAt: null,
        date: item.window.date,
      })),
      ...allMissed
        .filter((item) => !heldOpen.has(item.mitzvah.id) && (!item.marked || stamping.has(item.mitzvah.id)))
        .map((item) => ({
          id: item.mitzvah.id,
          status: 'missed' as const,
          start: item.window.start,
          end: item.window.end,
          markedAt: null,
          date: item.window.date,
        })),
      ...completed.map((item) => ({
        id: item.id,
        status: item.wasSkipped ? ('skipped' as const) : item.wasLate ? ('late' as const) : ('done' as const),
        start: item.window?.start ?? null,
        end: item.window?.end ?? null,
        markedAt: item.timestamp,
        date: item.date,
      })),
    ];
    const meta = new Map<string, { name: string; icon: IconName }>();
    for (const item of [...allCurrent, ...upcoming, ...allMissed]) {
      meta.set(item.mitzvah.id, { name: item.name, icon: iconFor(item.mitzvah.icon) });
    }
    for (const item of completed) meta.set(item.id, { name: item.name, icon: item.icon });
    return orderDayEntries(raw).map((entry): DayLookEntry => {
      const info = meta.get(entry.id);
      return {
        ...entry,
        name: info?.name ?? entry.id,
        icon: info?.icon ?? 'star',
        nagCount: nagCountOf(entry.id, entry.date),
        statusText: dayEntryStatusText(entry, now, location.tz, t),
        range: entry.start && entry.end ? clockRange(entry.start, entry.end, t, location.tz, entry.date) : null,
        startLabel: entry.start
          ? clockOf(entry.start, location.tz)
          : entry.markedAt
            ? clockOf(new Date(entry.markedAt), location.tz)
            : null,
        endLabel: entry.end ? clockOf(entry.end, location.tz) : null,
      };
    });
  }, [current, allCurrent, upcoming, allMissed, completed, stamping, heldOpen, now, location.tz, t, nagCountOf]);

  const name = firstName(profileName);
  const greeting = t(greetingKey(now, location.tz, name !== ''), { name });
  const caption = heroCaption(
    current[0] ? { name: current[0].name, end: current[0].window.end } : null,
    upcoming[0] ? { name: upcoming[0].name, start: upcoming[0].window.start } : null,
    allCompleted.length > 0 && allMissed.every((item) => item.marked),
    now,
    location.tz,
    t,
  );

  const onSkyTop = useCallback((next: SkyTop | null) => skySetter.current(next), []);

  // The board in the hero (the owner's pick of 2026-11-10, "גוון התקופה, קרוסלה חיה"): the period's card over
  // the live carousel of the day's times.
  const enabledIds = useMemo(() => new Set(enabled.map((m) => m.id)), [enabled]);
  const board = useMemo(() => {
    if (!frame) return null;
    const isOn = (id: string) => enabledIds.has(id);
    const doneToday = (id: string) => allCurrent.some((item) => item.mitzvah.id === id && item.marked);
    const history = markHistory(
      completions,
      now,
      location,
      settings.halachicOpinions.ksSofZman === 'MA' ? 'MA' : 'GRA',
    );
    const zAt = (id: ZmanId) => frame.zmanim.find((z) => z.id === id)!.at;
    const habit = homeLearn
      ? learnedHabit({
          now,
          z: { alot: zAt('alot'), sofShma: zAt('sofShma'), chatzot: zAt('chatzot'), plag: zAt('plag') },
          shacharit: markStat(history.shacharit),
          mincha: markStat(history.mincha),
          keeps: { shema: isOn('krias_shma_shacharit'), shacharit: isOn('shacharit'), mincha: isOn('mincha') },
          done: { shema: doneToday('krias_shma_shacharit'), mincha: doneToday('mincha') },
        })
      : null;
    // Kiddush Levana's window while it is kept and not marked.
    const kl = MITZVOT.find((m) => m.id === 'kiddush_levana');
    const klOpenWindow = kl && isOn(kl.id) ? currentOrNextWindow(kl, location, settings, now) : null;
    const klWindow = klOpenWindow && !completions[dateKey(klOpenWindow.date)]?.kiddush_levana ? klOpenWindow : null;
    const card = homeCard({
      now,
      location,
      inIsrael,
      nusach,
      language,
      t,
      habit,
      mine: homeCardMine,
      pinNames: zmanPins.map((id) => t(`home.zman.${id}.name`)),
      kiddushLevana: klWindow,
    });
    // The Chanukah candles of the day, while the user keeps them.
    const chanukahWindow =
      [...allCurrent, ...upcoming].find((item) => item.mitzvah.id === 'chanukah_candles')?.window ?? null;
    const tomorrowFrame =
      now.getTime() >= frame.tzeit.getTime()
        ? dayFrameFor(
            new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
            location,
            settings.halachicOpinions.ksSofZman,
          )
        : null;
    // The times the user added, under the Shema opinion in force (the circle never shows them).
    const ks = settings.halachicOpinions.ksSofZman;
    const added = offeredMoreZmanim(ks).filter((id) => addedZmanim.includes(id));
    const { chips, lead, next } = timeChips({
      now,
      zmanim: [...frame.zmanim.filter((z) => !hiddenZmanim.includes(z.id)), ...moreZmanimFor(today, location, added)],
      extras: [
        ...(card.candleLighting
          ? [{ id: 'candleLighting' as const, at: card.candleLighting.at, from: card.candleLighting.from }]
          : []),
        ...(chanukahWindow ? [{ id: 'chanukahCandles' as const, at: chanukahWindow.start, from: null }] : []),
        ...(card.fastEnd ? [{ id: 'fastEnd' as const, at: card.fastEnd.at, from: card.fastEnd.from }] : []),
      ],
      tomorrow: tomorrowFrame
        ? [
            ...tomorrowFrame.zmanim.filter((z) => !hiddenZmanim.includes(z.id)),
            ...moreZmanimFor(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1), location, added),
          ]
        : null,
      openWindows: allCurrent
        .filter((item) => !item.marked)
        .map((item) => ({ start: item.window.start, end: item.window.end })),
      pins: zmanPins,
      learned: habit?.zman ?? null,
    });
    return { card, chips, lead, next };
  }, [
    frame,
    enabledIds,
    allCurrent,
    upcoming,
    completions,
    now,
    location,
    settings,
    homeLearn,
    inIsrael,
    nusach,
    language,
    t,
    homeCardMine,
    zmanPins,
    today,
    hiddenZmanim,
    addedZmanim,
  ]);
  const renderBoard = useCallback(
    ({
      pick,
      selected,
      inks,
      glass,
    }: {
      pick: (id: ZmanId) => void;
      selected: ZmanId | null;
      inks: { plain: string; next: string };
      glass: CardGlass;
    }) =>
      board ? (
        <HomeTimes
          card={board.card}
          page={homeCardPage}
          onPage={setHomeCardPage}
          chips={board.chips}
          lead={board.lead}
          next={board.next}
          now={now}
          tz={location.tz}
          inks={inks}
          glass={glass}
          selected={selected}
          onPickZman={pick}
          mine={homeCardMine}
          onMineChange={setHomeCardMine}
          learn={homeLearn}
          onLearnChange={setHomeLearn}
        />
      ) : null,
    [board, homeCardPage, setHomeCardPage, now, location.tz, homeCardMine, setHomeCardMine, homeLearn, setHomeLearn],
  );

  const todayTime = today.getTime();
  const selichotOffer = useMemo(
    () => selichotOfferOn(new Date(todayTime), nusach, siddurPlace(location, inIsrael)),
    [todayTime, nusach, location, inIsrael],
  );
  const selichotDismissed = useSelichotStore((s) => s.dismissedSeason);
  const selichotDownload = useSelichotStore((s) => s.download);
  const selichotFlow = useSelichotDownloadFlow({
    cancelLabel: t('selichot.banner.notNow'),
    onCancel: () => {
      if (selichotOffer) useSelichotStore.getState().dismissSeason(selichotOffer.year);
    },
  });

  // Persist first — the stamp is decoration. Deferring the write behind the 1.3s animation meant
  // leaving the screen mid-animation silently discarded the completion, and a single stamping gate
  // dropped every other card tapped during it. Each card is held on screen while it animates.
  const dayFor = (id: string) => windowDays.get(id) ?? today;

  // An open card answers with its own completion; a missed entry's mark plays the shared one, which has its haptic.
  const stamp = (id: string, fromOpen: boolean) => {
    if (fromOpen) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSelectedId(null);
    setStampingIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    if (fromOpen) setHeldOpenIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  };

  // Each hold is timed from the commit that starts its card's own close, never from the tap: the render between them
  // would end the stamp before the card has closed, and a second tap would hold it after.
  useEffect(() => {
    const timers = stampTimers.current;
    for (const id of stampingIds) {
      if (timers.has(id)) continue;
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id);
          setStampingIds((ids) => ids.filter((other) => other !== id));
          setHeldOpenIds((ids) => ids.filter((other) => other !== id));
        }, durations.stamp),
      );
    }
  }, [stampingIds]);

  useEffect(() => {
    const timers = stampTimers.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  // An open card is marked at once; one whose window closed since the last tick asks first, as a missed entry does.
  const completeOpen = (item: LiveItem) => {
    if (stamping.has(item.mitzvah.id)) return;
    lateMark.mark(
      { id: item.mitzvah.id, name: item.name, date: item.window.date, window: item.window },
      () => stamp(item.mitzvah.id, true),
      { celebrate: false },
    );
  };

  // A missed entry's window has closed, so the dialog asks when it was done before marking it.
  const completeMissed = (entry: DayLookEntry) => {
    if (stamping.has(entry.id)) return;
    lateMark.mark(
      {
        id: entry.id,
        name: entry.name,
        date: entry.date,
        window: entry.start && entry.end ? { start: entry.start, end: entry.end } : null,
      },
      () => stamp(entry.id, false),
    );
  };

  const skipToday = async (id: string) => {
    await CompletionService.markSkipped(id, dayFor(id)).catch(() => {});
    setSelectedId(null);
  };

  const undoComplete = async (id: string, date: Date) => {
    Haptics.selectionAsync().catch(() => {});
    await CompletionService.unmark(id, date).catch(() => {});
  };

  const openProfileIntro = () => {
    StorageService.set(PROFILE_INTRO_KEY, true);
    setIntroDismissed(true);
    router.push('/(tabs)/settings');
  };

  const openSelichotOffer = () => {
    if (selichotDownload.status === 'downloading') router.push(`/mitzvah/${SELICHOT_TEXT_ID}`);
    else void selichotFlow.prepare();
  };

  const pickBanner = (): BannerSpec | null => {
    if (zmanimUnavailable) {
      return { tone: 'warning', text: t('home.zmanimUnavailable'), onPress: () => router.push('/(tabs)/settings') };
    }
    if (user.notificationPermission !== 'granted') {
      return {
        tone: 'urgent',
        text: t('home.notificationsDenied'),
        onPress: () => openSystemSettings(),
      };
    }
    if (checkIn) {
      return {
        tone: 'accent',
        text: t('checkin.banner', {
          in: t(checkInPhraseKey(checkIn.block)),
          deadline: t('checkin.deadline', {
            day: formatDate(checkInLastDay(checkIn.block), 'cccc', language),
          }),
        }),
        onPress: () => router.push('/checkin'),
      };
    }
    if (user.locationStatus === 'missing') {
      return { tone: 'warning', text: t('home.noLocation'), onPress: () => router.push('/(tabs)/settings') };
    }
    if (user.locationStatus === 'timeout') return { tone: 'warning', text: t('home.gpsTimeout') };
    if (isOnboarded && (gender === null || maritalStatus === null) && !introDismissed) {
      return { tone: 'accent', text: t('home.completeProfile'), onPress: openProfileIntro };
    }
    if (
      selichotOffer &&
      !selichotInstalled &&
      selichotDismissed !== selichotOffer.year &&
      selichotDownloadSupported()
    ) {
      let text: string;
      if (selichotDownload.status === 'downloading') {
        text = t('selichot.banner.downloading', { nusach: t(`nusach.${nusach}`) });
      } else if (selichotDownload.status === 'failed') {
        text = t('selichot.banner.failed');
      } else if (selichotOffer.begun) {
        text = t('selichot.banner.during');
      } else {
        text = t('selichot.banner.upcoming', {
          date: formatDate(selichotOffer.first, language === 'he' ? 'd LLLL' : 'LLLL d', language),
        });
      }
      return { tone: 'accent', text, onPress: selichotFlow.preparing ? undefined : openSelichotOffer };
    }
    return null;
  };
  const banner = pickBanner();

  const errorScope = lastError?.scope === 'schedule' || lastError?.scope === 'reset' ? lastError.scope : null;
  const retryLastError = () => {
    clearLastError();
    if (errorScope === 'schedule') NotificationScheduler.rebuild().catch((error) => reportError('schedule', error));
  };

  const openText = (item: LiveItem) =>
    item.hasText
      ? () =>
          router.push({
            pathname: '/siddur/[id]',
            params:
              item.mitzvah.id === CHOK_TEXT_ID || item.mitzvah.id === SHNAYIM_TEXT_ID
                ? { id: item.mitzvah.id }
                : { id: item.mitzvah.id, date: dateKey(item.window.date) },
          })
      : undefined;

  const openDetail = (id: string) => router.push(`/mitzvah/${id}`);

  const selectedMitzvah = selectedId ? allMitzvot.find((item) => item.id === selectedId) : undefined;
  const selectedName = selectedMitzvah ? nameFor(selectedMitzvah) : undefined;

  useEffect(() => {
    syncNotificationPermissionStatus().catch((error) => reportError('schedule', error));
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setTick((value) => value + 1);
        afterPaint(() => {
          syncNotificationPermissionStatus().catch((error) => reportError('schedule', error));
          dismissCompletedPresentedNotifications().catch(() => {});
          refreshSchedulingOnForeground().catch((error) => reportError('schedule', error));
        });
      }
    });
    return () => sub.remove();
  }, []);

  const nextUpcoming = upcoming[0];
  const messageCount = (errorScope ? 1 : 0) + (banner ? 1 : 0) + messages.length;
  // Nothing open now: the messages take the open-now slot (the owner's call, 2026-11-09).
  const messagesFirst = current.length === 0 && messageCount > 0;
  const messagesBlock = messageCount ? (
    <>
      <SectionLabel text={t('home.messages')} count={messageCount} />
      {errorScope ? (
        <Banner
          tone="warning"
          text={t('home.lastError', { what: t(`errors.scope.${errorScope}`) })}
          onPress={retryLastError}
        />
      ) : null}
      {banner ? <Banner tone={banner.tone} text={banner.text} onPress={banner.onPress} /> : null}
      {messages.length ? (
        <View testID="home-messages">
          <Card divided>
            {messages.map((message) => (
              <ListRow
                key={message.id}
                icon={message.icon}
                title={message.title}
                caption={message.caption}
                onPress={message.href ? () => router.push(message.href as never) : undefined}
                chevron={Boolean(message.href)}
              />
            ))}
          </Card>
        </View>
      ) : null}
    </>
  ) : null;

  return (
    <SkyFrame setterRef={skySetter} focused={focused} quiet={quiet}>
      <ViewportContext.Provider value={viewport.bus}>
        <ScrollView
          ref={viewport.ref}
          scrollEnabled={!scrubbing}
          contentContainerStyle={[styles.content, { backgroundColor: colors.bg }]}
          onScroll={viewport.notify}
          onContentSizeChange={viewport.notify}
          scrollEventThrottle={motion.inViewThrottleMs}
        >
          <DayArcHero
            frame={frame}
            now={now}
            tz={location.tz}
            greeting={greeting}
            dateLine={dateLine}
            caption={board?.lead && current[0] ? current[0].name : caption}
            hiddenZmanim={hiddenZmanim}
            board={renderBoard}
            onScrubChange={setScrubbing}
            onSkyTop={onSkyTop}
          />
          <View style={styles.body}>
            {messagesFirst ? (
              <View style={styles.openNowLabel}>{messagesBlock}</View>
            ) : (
              <SectionLabel text={t('home.openNow')} count={current.length} style={styles.openNowLabel} />
            )}
            {messagesFirst ? null : current.length ? (
              current.map((item, index) => (
                <Reveal key={item.mitzvah.id} delay={index * 40} duration={280} shift={25} playKey={playKey}>
                  <NowCard
                    testID={`home-now-${item.mitzvah.id}`}
                    name={item.name}
                    icon={iconFor(item.mitzvah.icon)}
                    nagCount={nagCountOf(item.mitzvah.id, item.window.date)}
                    start={item.window.start}
                    end={item.window.end}
                    now={now}
                    tz={location.tz}
                    pct={item.pct}
                    note={shemaNote(item.mitzvah.id, item.window.date)}
                    urgent={item.urgent}
                    stamping={stamping.has(item.mitzvah.id)}
                    onComplete={() => completeOpen(item)}
                    onOpenText={openText(item)}
                    onPress={() => openDetail(item.mitzvah.id)}
                    onLongPress={() => setSelectedId(item.mitzvah.id)}
                  />
                </Reveal>
              ))
            ) : (
              <View style={styles.emptyWrap}>
                <IconTile name="sparkle" tone="accent" size={scaled(48)} style={styles.emptyIcon} />
                <Text style={[typography.body, { color: colors.textSub, textAlign: 'center' }]}>
                  {doneCount >= totalActive && totalActive > 0 ? t('home.allDone') : t('home.noActive')}
                </Text>
                {nextUpcoming ? (
                  <Text style={[typography.caption, styles.nextCaption, { color: colors.textSub }]}>
                    {t('home.now.nextCaption', {
                      name: nextUpcoming.name,
                      time: clockOf(nextUpcoming.window.start, location.tz),
                    })}
                  </Text>
                ) : null}
              </View>
            )}

            {entries.length ? (
              <>
                <SectionLabel text={t('home.myDay')} />
                <View accessibilityRole="radiogroup" accessibilityLabel={t('home.look.label')}>
                  <SegmentedControl<HomeLook>
                    options={[
                      { value: 'rail', label: t('home.look.rail') },
                      { value: 'cards', label: t('home.look.cards') },
                      { value: 'rings', label: t('home.look.rings') },
                    ]}
                    value={homeLook}
                    onChange={setHomeLook}
                  />
                </View>
                <View style={styles.looks}>
                  <DayLooks
                    look={homeLook}
                    entries={entries}
                    now={now}
                    nowLabel={clockOf(now, location.tz)}
                    playKey={playKey}
                    onPress={(entry) => openDetail(entry.id)}
                    onLongPress={(entry) => setSelectedId(entry.id)}
                    onMark={completeMissed}
                    onUndo={(entry) => undoComplete(entry.id, entry.date)}
                  />
                </View>
              </>
            ) : null}

            {messagesFirst ? null : messagesBlock}

            {taharahCard ? (
              <Card style={styles.taharahCard}>
                <Pressable
                  onPress={() => router.push('/taharah')}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.taharahBody, { opacity: pressed ? 0.85 : 1 }]}
                >
                  {taharahCard.concealed ? null : (
                    <Text style={[typography.captionBold, styles.cardLabel, { color: colors.textSub }]}>
                      {t('taharah.home.title')}
                    </Text>
                  )}
                  <Text style={[typography.heading, { color: colors.text }]}>{taharahCard.title}</Text>
                  {taharahCard.caption ? (
                    <Text style={[typography.caption, styles.cardCaption, { color: colors.textMuted }]}>
                      {taharahCard.caption}
                    </Text>
                  ) : null}
                </Pressable>
              </Card>
            ) : null}
          </View>
        </ScrollView>
      </ViewportContext.Provider>

      <BottomSheet
        visible={Boolean(selectedMitzvah)}
        title={t('home.quick.title')}
        caption={selectedName}
        onClose={() => setSelectedId(null)}
      >
        <SheetAction
          label={t('home.quick.details')}
          onPress={() => {
            if (!selectedId) return;
            setSelectedId(null);
            openDetail(selectedId);
          }}
        />
        <SheetAction
          label={t('home.quick.skipToday')}
          onPress={() => {
            if (!selectedId) return;
            skipToday(selectedId);
          }}
        />
      </BottomSheet>
      {selichotFlow.dialog}
      {lateMark.dialog}
    </SkyFrame>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  body: {
    paddingHorizontal: spacing.lg,
  },
  openNowLabel: {
    marginTop: spacing.sm,
  },
  looks: {
    marginTop: spacing.md,
  },
  taharahCard: {
    marginTop: spacing.lg,
  },
  taharahBody: {
    padding: spacing.lg,
  },
  cardLabel: {
    marginBottom: spacing.sm,
  },
  cardCaption: {
    marginTop: spacing.xs,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    marginBottom: spacing.md,
  },
  nextCaption: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
