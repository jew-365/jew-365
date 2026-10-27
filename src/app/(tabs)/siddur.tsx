import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { HDate } from '@hebcal/core';
import { DateTime } from 'luxon';
import { MITZVOT } from '@/data/mitzvot';
import { SELICHOT_TEXT_ID } from '@/data/selichot';
import {
  SIDDUR_GROUPS,
  SIDDUR_TEXTS,
  STANDALONE_TEXTS,
  standaloneAvailability,
  hasSiddurText,
  hasStandaloneText,
  mitzvahTextId,
  siddurAsset,
  siddurPlace,
  standaloneHoursAt,
  standalonePeriodEnded,
  standaloneTextDay,
  standaloneTextsIn,
} from '@/data/siddur';
import { Card } from '@/components/Card';
import { ListRow } from '@/components/ListRow';
import { iconFor, type IconName } from '@/components/MitzvahIcon';
import { NavBar } from '@/components/NavBar';
import { selichotAddonCaption, useSelichotDownloadFlow } from '@/components/SelichotAddonCard';
import { SettingsSection } from '@/components/SettingsSection';
import { useDayModel } from '@/hooks/useDayModel';
import { useNow } from '@/hooks/useNow';
import { selichotDownloadSupported } from '@/services/SelichotContentService';
import { dateKey, useCompletionsStore } from '@/stores/useCompletionsStore';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { useUserStore } from '@/stores/useUserStore';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { SiddurGroup, StandaloneTextId } from '@/types/siddur';
import { currentOrNextWindow, windowDueToday } from '@/utils/buildDayTimeline';
import { clockOf } from '@/utils/clock';
import { catalogListsText, dayFeatures } from '@/utils/siddur';
import { formatDate, useI18n } from '@/i18n';

const MITZVAH_TEXTS = MITZVOT.filter((mitzvah) => mitzvahTextId(mitzvah.id));
const PRAYER_IDS = ['shacharit', 'mincha', 'maariv'];

type SectionKey = 'now' | 'prayers' | 'mitzvot' | SiddurGroup;

const OPEN_ON_FOCUS: ReadonlySet<SectionKey> = new Set<SectionKey>(['now']);
const SECTION_ICONS: Record<'now' | 'prayers' | 'mitzvot', IconName> = {
  now: 'sparkle',
  prayers: 'siddur',
  mitzvot: 'tefillin',
};

type CatalogRowProps = {
  id: string;
  icon: IconName;
  iconTone: 'accent' | 'muted';
  title: string;
  caption?: string;
  date?: string;
  testID?: string;
  onOpen: (id: string, date?: string) => void;
};

const CatalogRow = memo(function CatalogRow({
  id,
  icon,
  iconTone,
  title,
  caption,
  date,
  testID,
  onOpen,
}: CatalogRowProps) {
  const card = (
    <Card>
      <ListRow
        icon={icon}
        iconTone={iconTone}
        title={title}
        caption={caption}
        chevron
        onPress={() => onOpen(id, date)}
      />
    </Card>
  );
  return testID ? <View testID={testID}>{card}</View> : card;
});

type CatalogSectionProps = {
  sectionKey: SectionKey;
  title: string;
  icon: IconName;
  open: ReadonlySet<SectionKey>;
  onToggle: (key: SectionKey) => void;
  render: () => React.ReactNode;
  testID?: string;
};

function CatalogSection({ sectionKey, title, icon, open, onToggle, render, testID }: CatalogSectionProps) {
  return (
    <SettingsSection
      title={title}
      icon={icon}
      collapsible
      expanded={open.has(sectionKey)}
      onToggle={() => onToggle(sectionKey)}
    >
      {open.has(sectionKey) ? (
        <View style={styles.rows} testID={testID}>
          {render()}
        </View>
      ) : null}
    </SettingsSection>
  );
}

export default function SiddurScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { settings, location, nusach, inIsrael, language, nameFor, selichotInstalled } = useDayModel();
  const router = useRouter();
  const selichotDownload = useSelichotStore((state) => state.download);
  const selichotFlow = useSelichotDownloadFlow();
  const now = useNow();
  const completions = useCompletionsStore((state) => state.completions);
  const siddurVoice = useUserStore((state) => state.siddurVoice);
  const [open, setOpen] = useState<ReadonlySet<SectionKey>>(OPEN_ON_FOCUS);

  const navigation = useNavigation();
  const tabKey = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const state = navigation.getState();
      tabKey.current = state?.routes[state.index]?.key ?? null;
    }, [navigation]),
  );

  useEffect(
    () =>
      navigation.addListener('blur', () => {
        const state = navigation.getState();
        if (state?.routes[state.index]?.key !== tabKey.current) setOpen(OPEN_ON_FOCUS);
      }),
    [navigation],
  );

  const toggle = useCallback(
    (key: SectionKey) =>
      setOpen((current) => {
        const next = new Set(current);
        if (!next.delete(key)) next.add(key);
        return next;
      }),
    [],
  );
  const openText = useCallback(
    (id: string, date?: string) => router.push({ pathname: '/siddur/[id]', params: date ? { id, date } : { id } }),
    [router],
  );

  const groups = useMemo(
    () =>
      SIDDUR_GROUPS.map((group) => ({ group, ids: standaloneTextsIn(group, nusach) })).filter(({ ids }) => ids.length),
    [nusach],
  );
  // Keyed by each text's day number, so the clock tick re-checks availability only when a day turns.
  const dayKey = useMemo(
    () => groups.flatMap(({ ids }) => ids.map((id) => standaloneTextDay(id, now, location).abs())).join(','),
    [groups, now, location],
  );
  const available = useMemo(() => {
    const place = siddurPlace(location, inIsrael);
    const days = dayKey.split(',').map(Number);
    const ids = groups.flatMap((entry) => entry.ids);
    return new Map(
      ids.map((id, index) => [id, hasStandaloneText(id, nusach, dayFeatures(new HDate(days[index]), place))]),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selichotInstalled re-runs the memo on purpose: hasStandaloneText() reads the Selichot install from its store
  }, [dayKey, groups, location, inIsrael, nusach, selichotInstalled]);
  const today = useMemo(() => {
    const place = siddurPlace(location, inIsrael);
    return MITZVAH_TEXTS.filter((mitzvah) => catalogListsText(mitzvahTextId(mitzvah.id)!, siddurVoice))
      .map((mitzvah) => {
        const window = currentOrNextWindow(mitzvah, location, settings, now);
        const hasText = window !== null && hasSiddurText(mitzvah, nusach, window.date, place);
        return { mitzvah, window, hasText, openNow: hasText && window.start.getTime() <= now.getTime() };
      })
      .sort(
        (a, b) =>
          (a.window?.start.getTime() ?? Number.POSITIVE_INFINITY) -
          (b.window?.start.getTime() ?? Number.POSITIVE_INFINITY),
      );
  }, [nusach, settings, inIsrael, location, now, siddurVoice]);
  const label = (entry: { he: string; en: string }) => (language === 'en' ? entry.en : entry.he);
  // The day belongs to the instant whose clock is printed, so it is read off `start`, not off the window's
  // date, and both are read on the location's clock, never the device's.
  const laterCaption = (start: Date) => {
    const zone = location.tz;
    const startDay = DateTime.fromJSDate(start, { zone });
    const today = DateTime.fromJSDate(now, { zone });
    if (startDay.toISODate() === today.toISODate()) return t('siddur.today.later', { time: clockOf(start, zone) });
    const isTomorrow = startDay.toISODate() === today.plus({ days: 1 }).toISODate();
    const day = isTomorrow ? t('common.tomorrow') : formatDate(startDay, 'cccc', language);
    return t('siddur.today.laterOn', { day, time: clockOf(start, zone) });
  };
  const standaloneNow = useMemo(() => {
    const place = siddurPlace(location, inIsrael);
    return groups.flatMap(({ group, ids }) =>
      ids.flatMap((id) => {
        const hours = standaloneHoursAt(id, nusach, now, location, place);
        return hours ? [{ id, group, hours }] : [];
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selichotInstalled re-runs the memo on purpose: hasStandaloneText() reads the Selichot install from its store
  }, [groups, nusach, now, location, inIsrael, selichotInstalled]);
  // What is said now: the mitzvah texts whose window is open and not yet marked done, and the standalone
  // texts whose hours hold, by opening time, so later windows never share the card with the one open now.
  type NowEntry =
    | { start: Date; mitzvah: (typeof today)[number]; standalone?: undefined }
    | { start: Date; standalone: (typeof standaloneNow)[number]; mitzvah?: undefined };
  const openNow: NowEntry[] = [
    ...today
      .filter((entry) => entry.openNow && !completions[dateKey(entry.window!.date)]?.[entry.mitzvah.id])
      .map((entry) => ({ start: entry.window!.start, mitzvah: entry })),
    ...standaloneNow.map((entry) => ({ start: entry.hours.start, standalone: entry })),
  ].sort((a, b) => a.start.getTime() - b.start.getTime());
  const prayers = PRAYER_IDS.flatMap((id) => today.filter(({ mitzvah }) => mitzvah.id === id));
  const mitzvotTexts = MITZVAH_TEXTS.filter(({ id }) => !PRAYER_IDS.includes(id)).flatMap(({ id }) =>
    today.filter(
      ({ mitzvah }) =>
        mitzvah.id === id &&
        mitzvah.nuschaotSupported.includes(nusach) &&
        siddurAsset(nusach, mitzvahTextId(id)!) !== undefined,
    ),
  );

  const mitzvahRow = ({ mitzvah, window, hasText, openNow }: (typeof today)[number]) => {
    const { availableLabel } = SIDDUR_TEXTS[mitzvahTextId(mitzvah.id)!];
    return (
      <CatalogRow
        key={mitzvah.id}
        testID={`siddur-row-${mitzvah.id}`}
        id={mitzvah.id}
        icon={iconFor(mitzvah.icon)}
        iconTone={hasText ? 'accent' : 'muted'}
        title={nameFor(mitzvah)}
        caption={
          openNow
            ? t('siddur.today.open')
            : hasText && window
              ? laterCaption(window.start)
              : availableLabel
                ? label(availableLabel)
                : t('siddur.catalog.notToday')
        }
        date={hasText && window && windowDueToday(window, location, now) ? dateKey(window.date) : undefined}
        onOpen={openText}
      />
    );
  };

  const nowRow = (entry: NowEntry) => {
    if (entry.mitzvah) {
      const { mitzvah, window } = entry.mitzvah;
      return (
        <CatalogRow
          key={mitzvah.id}
          id={mitzvah.id}
          icon={iconFor(mitzvah.icon)}
          iconTone="accent"
          title={nameFor(mitzvah)}
          caption={t('siddur.now.until', { time: clockOf(window!.end) })}
          date={dateKey(window!.date)}
          onOpen={openText}
        />
      );
    }
    const { id, group, hours } = entry.standalone;
    return (
      <CatalogRow
        key={id}
        id={id}
        icon={group}
        iconTone="accent"
        title={label(STANDALONE_TEXTS[id].name)}
        caption={t('siddur.now.until', { time: clockOf(hours.end) })}
        onOpen={openText}
      />
    );
  };

  const openSelichotDownload = () => {
    if (!selichotDownloadSupported() || selichotDownload.status === 'downloading') {
      router.push(`/mitzvah/${SELICHOT_TEXT_ID}`);
      return;
    }
    void selichotFlow.prepare();
  };

  const row = (id: StandaloneTextId, group: SiddurGroup) => {
    const { name } = STANDALONE_TEXTS[id];
    if (id === SELICHOT_TEXT_ID && !selichotInstalled) {
      return (
        <Card key={id}>
          <ListRow
            icon={group}
            iconTone="muted"
            title={label(name)}
            caption={selichotAddonCaption(selichotDownload, t(`nusach.${nusach}`), t)}
            chevron
            disabled={selichotFlow.preparing}
            onPress={openSelichotDownload}
          />
        </Card>
      );
    }
    const { availableLabel } = standaloneAvailability(id, nusach);
    const saidToday = (available.get(id) ?? false) && !standalonePeriodEnded(id, nusach, now, location);
    return (
      <CatalogRow
        key={id}
        testID={`siddur-row-${id}`}
        id={id}
        icon={group}
        iconTone={saidToday ? 'accent' : 'muted'}
        title={label(name)}
        caption={saidToday ? undefined : availableLabel ? label(availableLabel) : t('siddur.catalog.notToday')}
        onOpen={openText}
      />
    );
  };

  const standaloneSection = ({ group, ids }: (typeof groups)[number]) => (
    <CatalogSection
      key={group}
      sectionKey={group}
      title={t(`siddur.group.${group}`)}
      icon={group}
      open={open}
      onToggle={toggle}
      render={() => ids.map((id) => row(id, group))}
    />
  );
  const mealGroups = groups.filter(({ group }) => group === 'meals');
  const otherGroups = groups.filter(({ group }) => group !== 'meals');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <NavBar
        title={t('siddur.catalog.title')}
        subtitle={`${t('siddur.catalog.subtitle')} · ${t(`nusach.${nusach}`)}`}
      />
      <ScrollView contentContainerStyle={styles.list}>
        {openNow.length > 0 && (
          <CatalogSection
            sectionKey="now"
            title={t('siddur.group.now')}
            icon={SECTION_ICONS.now}
            open={open}
            onToggle={toggle}
            testID="siddur-now"
            render={() => openNow.map(nowRow)}
          />
        )}
        {mealGroups.map(standaloneSection)}
        <CatalogSection
          sectionKey="prayers"
          title={t('siddur.group.prayers')}
          icon={SECTION_ICONS.prayers}
          open={open}
          onToggle={toggle}
          render={() => prayers.map(mitzvahRow)}
        />
        {mitzvotTexts.length > 0 && (
          <CatalogSection
            sectionKey="mitzvot"
            title={t('siddur.group.mitzvot')}
            icon={SECTION_ICONS.mitzvot}
            open={open}
            onToggle={toggle}
            testID="siddur-mitzvot"
            render={() => mitzvotTexts.map(mitzvahRow)}
          />
        )}
        {otherGroups.map(standaloneSection)}
      </ScrollView>
      {selichotFlow.dialog}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  rows: {
    gap: spacing.sm,
  },
});
