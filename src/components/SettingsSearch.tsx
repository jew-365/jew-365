import React, { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { Card } from './Card';
import { ListRow } from './ListRow';
import { MitzvahIcon } from './MitzvahIcon';
import { getAllMitzvot } from '@/data/customMitzvotAdapter';
import { translate, useI18n } from '@/i18n';
import { HebcalService } from '@/services/HebcalService';
import { supportsBatteryOptimizationSettings } from '@/services/deviceSettings';
import { taharahOffered } from '@/stores/taharahOptIn';
import { useChokStore } from '@/stores/useChokStore';
import { useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { scaled } from '@/theme/scale';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { appDayKey } from '@/utils/locationDay';
import {
  SETTINGS_SEARCH_ITEMS,
  buildSettingsSearchIndex,
  searchSettings,
  settingsContentItems,
  type SettingsSearchEntry,
  type SettingsSearchItem,
} from '@/utils/settingsSearch';

const ICON_SIZE = scaled(18);
const CLEAR_SIZE = scaled(16);
const CLEAR_SLOP = scaled(8);
const INPUT_FONT = scaled(16);

// The search index is built on the first keystroke and kept until the day, the profile, the place or
// `visit` (the screen's focus count) changes, so typing never rebuilds it.
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
  const cache = useRef<{ inputs: readonly unknown[]; index: SettingsSearchEntry[] } | null>(null);
  const taharah = taharahOffered(user);

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
    const index = buildSettingsSearchIndex(
      (key) => [translate(key, undefined, 'he', user.gender), translate(key, undefined, 'en', user.gender)],
      [
        ...SETTINGS_SEARCH_ITEMS,
        ...settingsContentItems({
          mitzvot: getAllMitzvot(user.nusach),
          nusach: user.nusach,
          voice: user.siddurVoice,
          maritalStatus: user.maritalStatus,
          chokInstalled,
          now,
          location: user.location,
          inIsrael: user.inIsrael,
        }),
      ],
    );
    cache.current = { inputs, index };
    return index;
  };

  const results = useMemo(
    () =>
      searching
        ? searchSettings(query, indexFor(), {
            taharah,
            backup: Platform.OS !== 'web',
            battery: supportsBatteryOptimizationSettings(),
          })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- indexFor reads the profile and custom mitzvot; its own cache decides when to rebuild
    [query, searching, taharah, user, chokInstalled, customMitzvot],
  );

  return { query, setQuery, searching, results };
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
  results,
  onChoose,
}: {
  query: string;
  results: readonly SettingsSearchItem[];
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
    if (item.kind) return notTodayCaption ?? t(`settings.search.kind.${item.kind}`);
    return item.section ? t(`settings.${item.section}`) : t('settings.searchScreen');
  };

  if (!results.length) {
    return (
      <View style={styles.empty} accessibilityLiveRegion="polite">
        <Text style={[typography.bodyBold, { color: colors.text }]}>
          {t('settings.searchEmpty', { query: query.trim() })}
        </Text>
        <Text style={[typography.small, styles.hint, { color: colors.textMuted }]}>
          {t('settings.searchEmptyHint')}
        </Text>
      </View>
    );
  }
  return (
    <Card divided style={styles.gap}>
      {results.map((item) => (
        <ListRow
          key={item.id}
          icon={item.icon}
          iconTone={notTodayOf(item) ? 'muted' : 'accent'}
          title={item.kind ? inLanguage(item.title) : t(item.titleKey)}
          caption={captionOf(item)}
          onPress={() => onChoose(item)}
          chevron
        />
      ))}
    </Card>
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
});
