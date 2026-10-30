import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { Card } from './Card';
import { ListRow } from './ListRow';
import { MitzvahIcon } from './MitzvahIcon';
import { SectionLabel } from './SectionLabel';
import { CHOK_TEXT_ID } from '@/data/chok';
import { findAnyMitzvah, getAllMitzvot } from '@/data/customMitzvotAdapter';
import { halachaRulingFor } from '@/data/halachaLines';
import { translate, useI18n } from '@/i18n';
import { HebcalService } from '@/services/HebcalService';
import { loadSiddurText } from '@/services/SiddurService';
import { taharahOffered } from '@/stores/taharahOptIn';
import { useChokStore } from '@/stores/useChokStore';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { enabledSinceOf, useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { scaled } from '@/theme/scale';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import type { SiddurTextId } from '@/types/siddur';
import type { Location } from '@/types/zmanim';
import { markTotals } from '@/utils/badges';
import { computeStreak } from '@/utils/historyStats';
import { countLateMarks } from '@/utils/lateMarks';
import { appDayKey } from '@/utils/locationDay';
import {
  SETTINGS_SEARCH_ITEMS,
  appContentItems,
  buildSettingsSearchIndex,
  deepTextOf,
  searchDeep,
  searchTiers,
  settingsContentItems,
  streakItem,
  type DeepText,
  type SearchNamer,
  type SearchTiers,
  type SettingsSearchEntry,
  type SettingsSearchItem,
} from '@/utils/settingsSearch';

const ICON_SIZE = scaled(18);
const CLEAR_SIZE = scaled(16);
const CLEAR_SLOP = scaled(8);
const INPUT_FONT = scaled(16);

const DEEP_DELAY_MS = 250;

const deepTexts = new Map<string, DeepText>();

const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const dedupeAgainst = (items: readonly SettingsSearchItem[], taken: Set<string>) =>
  items.filter((item) => {
    const key = item.id.replace(/^(chapter|section):/, 'text:');
    if (taken.has(key)) return false;
    taken.add(key);
    return true;
  });

// The search index is built on the first keystroke and kept until the day, the profile, the place or
// `visit` (the screen's focus count) changes, so typing never rebuilds it. Its results show at once;
// a deep pass then reads the siddur texts and the current streak in the background, a text at a
// time, and its results join the list when it ends (the owner's call, 2026-10-27).
export function useSettingsSearch(visit: number) {
  const user = useUserStore(
    useShallow((s) => ({
      gender: s.gender,
      nusach: s.nusach,
      siddurVoice: s.siddurVoice,
      maritalStatus: s.maritalStatus,
      location: s.location,
      inIsrael: s.inIsrael,
    })),
  );
  const chokInstalled = useChokStore((s) => s.installed !== null);
  const customMitzvot = useCustomMitzvotStore((s) => s.items);
  const [query, setQuery] = useState('');
  const searching = query.trim().length > 0;
  const cache = useRef<{
    inputs: readonly unknown[];
    index: SettingsSearchEntry[];
    streak: SettingsSearchEntry[] | null;
  } | null>(null);
  const taharah = taharahOffered(user);
  const namer: SearchNamer = (key, params) => ({
    he: translate(key, params, 'he', user.gender),
    en: translate(key, params, 'en', user.gender),
  });

  const indexFor = () => {
    const now = new Date();
    const inputs = [
      user.gender,
      user.nusach,
      user.siddurVoice,
      user.maritalStatus,
      user.location,
      user.inIsrael,
      chokInstalled,
      customMitzvot,
      appDayKey(now, user.location),
      HebcalService.hebrewDayAt(now, user.location).abs(),
      visit,
    ];
    const cached = cache.current;
    if (cached && inputs.every((input, index) => Object.is(input, cached.inputs[index]))) return cached.index;
    const mitzvot = getAllMitzvot(user.nusach);
    const active = useMitzvotStore.getState().activeMitzvot;
    const completions = useCompletionsStore.getState();
    const enabled = mitzvot.filter((mitzvah) => active[mitzvah.id]?.enabled);
    const index = buildSettingsSearchIndex(
      (key) => [translate(key, undefined, 'he', user.gender), translate(key, undefined, 'en', user.gender)],
      [
        ...SETTINGS_SEARCH_ITEMS,
        ...settingsContentItems({
          mitzvot,
          nusach: user.nusach,
          voice: user.siddurVoice,
          maritalStatus: user.maritalStatus,
          chokInstalled,
          now,
          location: user.location,
          inIsrael: user.inIsrael,
        }),
        ...appContentItems({
          name: namer,
          mitzvot,
          nusach: user.nusach,
          ruling: halachaRulingFor(user.nusach),
          taharah,
          stats: {
            achievements: completions.achievements,
            totals: markTotals(completions.completions, completions.archivedMarks),
            lateTotal: countLateMarks({
              find: findAnyMitzvah,
              completions: completions.completions,
              late: completions.late,
            }),
            mitzvot: enabled,
          },
        }),
      ],
    );
    cache.current = { inputs, index, streak: null };
    return index;
  };

  const context = { taharah, backup: Platform.OS !== 'web' };
  const instant = useMemo(
    () => (searching ? searchTiers(query, indexFor(), context) : EMPTY_TIERS),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- indexFor reads the profile and custom mitzvot; its own cache decides when to rebuild
    [query, searching, taharah, user, chokInstalled, customMitzvot],
  );

  const [deep, setDeep] = useState<{ query: string; tiers: SearchTiers } | null>(null);
  useEffect(() => {
    if (!searching) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const index = indexFor();
      const texts: DeepText[] = [];
      for (const { item } of index) {
        const listed = item.kind === 'siddur' ? item : null;
        const href = listed?.href;
        if (!href || typeof href !== 'object' || href.pathname !== '/siddur/[id]') continue;
        const id = href.params.id;
        if (id === CHOK_TEXT_ID) continue;
        const key = `${user.nusach}/${id}/${user.gender ?? ''}`;
        let text = deepTexts.get(key);
        if (!text) {
          try {
            const loaded = await loadSiddurText(user.nusach, id as SiddurTextId);
            if (cancelled) return;
            text = deepTextOf(loaded, id, listed!.title, listed!.icon, namer);
            deepTexts.set(key, text);
          } catch {
            continue;
          }
          await yieldToUi();
          if (cancelled) return;
        }
        texts.push(text);
      }
      const cached = cache.current;
      if (cached && cached.streak === null) {
        cached.streak = buildSettingsSearchIndex(() => [], [streakItem(namer, currentStreak(user.location))]);
        await yieldToUi();
      }
      if (cancelled) return;
      const fromText = searchDeep(query, texts, namer);
      const fromStreak = cached?.streak ? searchTiers(query, cached.streak, context) : EMPTY_TIERS;
      setDeep({
        query,
        tiers: {
          close: [...fromStreak.close, ...fromText.close],
          maybe: [...fromStreak.maybe, ...fromText.maybe],
        },
      });
    }, DEEP_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- indexFor and namer read the same profile the instant pass reads
  }, [query, searching, taharah, user, chokInstalled, customMitzvot]);

  const pending = searching && deep?.query !== query;
  const tiers = useMemo(() => {
    if (!searching) return EMPTY_TIERS;
    const extra = deep?.query === query ? deep.tiers : EMPTY_TIERS;
    const taken = new Set<string>();
    const close = dedupeAgainst([...instant.close, ...extra.close], taken);
    const maybe = dedupeAgainst([...instant.maybe, ...extra.maybe], taken);
    return { close, maybe };
  }, [searching, instant, deep, query]);
  const results = useMemo(() => [...tiers.close, ...tiers.maybe], [tiers]);

  return { query, setQuery, searching, results, tiers, pending };
}

const EMPTY_TIERS: SearchTiers = { close: [], maybe: [] };

function currentStreak(location: Location): number {
  const user = useUserStore.getState();
  const active = useMitzvotStore.getState().activeMitzvot;
  const store = useCompletionsStore.getState();
  return computeStreak({
    mitzvot: getAllMitzvot(user.nusach).filter((mitzvah) => active[mitzvah.id]?.enabled),
    completions: store.completions,
    checkIns: store.checkIns,
    archivedDays: store.archivedDays,
    skipped: store.skipped,
    enabledSince: enabledSinceOf(active),
    location,
    settings: { nusach: user.nusach, halachicOpinions: user.halachicOpinions, inIsrael: user.inIsrael },
  });
}

export function SettingsSearchBox({
  query,
  onChangeQuery,
  onSubmit,
  labelKey = 'settings.search',
  placeholderKey = 'settings.searchPlaceholder',
}: {
  query: string;
  onChangeQuery: (next: string) => void;
  onSubmit: () => void;
  labelKey?: string;
  placeholderKey?: string;
}) {
  const { colors } = useTheme();
  const { language, t } = useI18n();
  return (
    <Card style={styles.gap}>
      <View style={styles.row}>
        <MitzvahIcon name="search" size={ICON_SIZE} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          onSubmitEditing={onSubmit}
          placeholder={t(placeholderKey)}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={t(labelKey)}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          style={[styles.input, { color: colors.text, writingDirection: language === 'he' ? 'rtl' : 'ltr' }]}
        />
        {query ? (
          <Pressable
            onPress={() => onChangeQuery('')}
            accessibilityRole="button"
            accessibilityLabel={t('settings.searchClear')}
            hitSlop={CLEAR_SLOP}
          >
            <MitzvahIcon name="close" size={CLEAR_SIZE} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

export function SettingsSearchResults({
  query,
  tiers,
  pending = false,
  onChoose,
}: {
  query: string;
  tiers: SearchTiers;
  pending?: boolean;
  onChoose: (item: SettingsSearchItem) => void;
}) {
  const { colors } = useTheme();
  const { language, t } = useI18n();
  const inLanguage = (name: { he: string; en: string }) => (language === 'en' ? name.en : name.he);
  const notTodayOf = (item: SettingsSearchItem) => (item.kind ? item.notToday : undefined);
  const captionOf = (item: SettingsSearchItem) => {
    const notToday = notTodayOf(item);
    const notTodayCaption = notToday
      ? notToday.label
        ? inLanguage(notToday.label)
        : t('siddur.catalog.notToday')
      : null;
    if (item.kind === 'chapter') {
      const caption = t('settings.search.kind.chapter', { text: inLanguage(item.textName) });
      return notTodayCaption ? `${caption} · ${notTodayCaption}` : caption;
    }
    if (item.kind === 'hilula') return `${t('settings.search.kind.hilula')} · ${inLanguage(item.caption)}`;
    if (item.kind && 'caption' in item) return inLanguage(item.caption);
    if (item.kind) return notTodayCaption ?? t(`settings.search.kind.${item.kind}`);
    return item.section ? t(`settings.${item.section}`) : t('settings.searchScreen');
  };
  const rows = (items: readonly SettingsSearchItem[]) =>
    items.map((item) => (
      <ListRow
        key={item.id}
        icon={item.icon}
        iconTone={notTodayOf(item) ? 'muted' : 'accent'}
        title={item.kind ? inLanguage(item.title) : t(item.titleKey)}
        caption={captionOf(item)}
        onPress={() => onChoose(item)}
        chevron
      />
    ));

  if (!tiers.close.length && !tiers.maybe.length) {
    return (
      <View style={styles.empty} accessibilityLiveRegion="polite">
        <Text style={[typography.bodyBold, { color: colors.text }]}>
          {pending ? t('settings.search.deep') : t('settings.searchEmpty', { query: query.trim() })}
        </Text>
        {pending ? null : (
          <Text style={[typography.small, styles.hint, { color: colors.textMuted }]}>
            {t('settings.searchEmptyHint')}
          </Text>
        )}
      </View>
    );
  }
  return (
    <View>
      {tiers.close.length ? (
        <Card divided style={styles.gap}>
          {rows(tiers.close)}
        </Card>
      ) : null}
      {pending ? (
        <Text style={[typography.small, styles.deep, { color: colors.textMuted }]} accessibilityLiveRegion="polite">
          {t('settings.search.deep')}
        </Text>
      ) : null}
      {tiers.maybe.length ? (
        <>
          <SectionLabel text={t('settings.search.maybe')} style={styles.maybeLabel} />
          <Card divided style={styles.gap}>
            {rows(tiers.maybe)}
          </Card>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: INPUT_FONT,
  },
  empty: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  hint: {
    marginTop: spacing.xs,
  },
  deep: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  maybeLabel: {
    marginBottom: spacing.sm,
  },
});
