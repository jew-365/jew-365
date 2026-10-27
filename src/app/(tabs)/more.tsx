import React, { useCallback, useEffect, useState } from 'react';
import { Keyboard, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { BottomSheet, SheetAction } from '@/components/BottomSheet';
import { Card } from '@/components/Card';
import { chokAddonCaption, useChokDownloadFlow } from '@/components/ChokAddonCard';
import { ListRow } from '@/components/ListRow';
import { NavBar } from '@/components/NavBar';
import { SectionLabel } from '@/components/SectionLabel';
import { SettingsSearchBox, SettingsSearchResults, useSettingsSearch } from '@/components/SettingsSearch';
import { selichotAddonCaption, useSelichotDownloadFlow } from '@/components/SelichotAddonCard';
import { CHOK_TEXT_ID } from '@/data/chok';
import { SELICHOT_TEXT_ID } from '@/data/selichot';
import { STANDALONE_TEXTS } from '@/data/siddur';
import { HALACHA_LINES, callUrl, halachaRulingFor, phoneLabel, whatsappUrl } from '@/data/halachaLines';
import { useNow } from '@/hooks/useNow';
import { checkChokUpdate, chokDownloadSupported } from '@/services/ChokContentService';
import { checkSelichotUpdate, selichotDownloadSupported } from '@/services/SelichotContentService';
import { useChokStore } from '@/stores/useChokStore';
import { selectSelichotInstalledFor, useSelichotStore } from '@/stores/useSelichotStore';
import { useUserStore } from '@/stores/useUserStore';
import { scaled } from '@/theme/scale';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { chokPortionAt, chokWeekName } from '@/utils/chok';
import type { SettingsSearchItem } from '@/utils/settingsSearch';
import { useI18n } from '@/i18n';

export default function MoreScreen() {
  const { colors } = useTheme();
  const { language, t } = useI18n();
  const router = useRouter();
  const now = useNow();
  const location = useUserStore((s) => s.location);
  const inIsrael = useUserStore((s) => s.inIsrael);
  const nusach = useUserStore((s) => s.nusach);
  const [halachaOpen, setHalachaOpen] = useState(false);
  const ruling = halachaRulingFor(nusach);
  const chokInstall = useChokStore((s) => s.installed);
  const chokDownload = useChokStore((s) => s.download);
  const { preparing, prepare, dialog: chokDialog } = useChokDownloadFlow();
  const selichotInstalled = useSelichotStore(selectSelichotInstalledFor(nusach));
  const selichotDownload = useSelichotStore((s) => s.download);
  const selichotFlow = useSelichotDownloadFlow();
  const [visit, setVisit] = useState(0);
  const { query, setQuery, searching, results, tiers, pending } = useSettingsSearch(visit);
  useFocusEffect(
    useCallback(() => {
      setVisit((count) => count + 1);
      setQuery('');
      void checkChokUpdate();
      void checkSelichotUpdate();
    }, [setQuery]),
  );
  // The search elsewhere sends a halacha line here as `open=halacha`: open the sheet once.
  const params = useLocalSearchParams<{ open?: string }>();
  useEffect(() => {
    if (params.open !== 'halacha') return;
    setHalachaOpen(true);
    router.setParams({ open: undefined });
  }, [params.open, router]);
  // A setting opens Settings on its section; everything else opens where the Settings search sends it.
  const chooseResult = (item: SettingsSearchItem) => {
    Keyboard.dismiss();
    setQuery('');
    if (item.kind && typeof item.href === 'object' && item.href.pathname === '/(tabs)/more') setHalachaOpen(true);
    else if (item.kind) router.push(item.href);
    else if (item.route) router.push(item.route);
    else router.push({ pathname: '/(tabs)/settings', params: { focus: item.id } });
  };
  const openChok = () => {
    if (chokInstall) router.push({ pathname: '/siddur/[id]', params: { id: CHOK_TEXT_ID } });
    else if (!chokDownloadSupported() || chokDownload.status === 'downloading') router.push(`/mitzvah/${CHOK_TEXT_ID}`);
    else void prepare();
  };
  const openSelichot = () => {
    if (selichotInstalled || !selichotDownloadSupported() || selichotDownload.status === 'downloading') {
      router.push(`/mitzvah/${SELICHOT_TEXT_ID}`);
    } else {
      void selichotFlow.prepare();
    }
  };
  const portion = chokInstall ? chokPortionAt(now, location, inIsrael) : null;
  const chokCaption = portion
    ? `${t('chok.parashaOf', { name: chokWeekName(portion.parashiyot, language) })} · ${t(`chok.slot.${portion.slot}`)}`
    : t('chok.nothingToday');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <NavBar title={t('more.title')} />
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        <SettingsSearchBox
          query={query}
          onChangeQuery={setQuery}
          labelKey="more.search"
          placeholderKey="more.searchPlaceholder"
          onSubmit={() => {
            if (results[0]) chooseResult(results[0]);
          }}
        />
        {searching ? (
          <SettingsSearchResults query={query} tiers={tiers} pending={pending} onChoose={chooseResult} />
        ) : null}
        <Card divided style={searching ? styles.hidden : undefined}>
          <ListRow
            icon="calendar"
            title={t('schedule.title')}
            caption={t('more.scheduleCaption')}
            chevron
            onPress={() => router.push('/schedule')}
          />
          <ListRow
            icon="chok"
            iconTone={chokInstall ? 'accent' : 'muted'}
            title={t('chok.title')}
            caption={chokInstall ? chokCaption : chokAddonCaption(chokDownload, t)}
            chevron
            disabled={preparing}
            onPress={openChok}
          />
          <ListRow
            icon="shofar"
            iconTone={selichotInstalled ? 'accent' : 'muted'}
            title={STANDALONE_TEXTS.selichot.name[language]}
            caption={
              selichotInstalled
                ? t('selichot.addon.installedShort', { nusach: t(`nusach.${nusach}`) })
                : selichotAddonCaption(selichotDownload, t(`nusach.${nusach}`), t)
            }
            chevron
            disabled={selichotFlow.preparing}
            onPress={openSelichot}
          />
          <ListRow
            icon="tehillim"
            title={STANDALONE_TEXTS.tehillim.name[language]}
            caption={t('more.tehillimCaption')}
            chevron
            onPress={() => router.push({ pathname: '/siddur/[id]', params: { id: 'tehillim' } })}
          />
          <ListRow
            icon="hilula"
            title={t('hilulot.title')}
            caption={t('hilulot.subtitle')}
            chevron
            onPress={() => router.push('/hilulot')}
          />
          <ListRow
            icon="compass"
            title={t('compass.title')}
            caption={t('compass.caption')}
            chevron
            onPress={() => router.push('/compass')}
          />
          <ListRow
            icon="phone"
            title={t('more.halacha.title')}
            caption={t(`more.halacha.caption.${ruling}`)}
            chevron
            onPress={() => setHalachaOpen(true)}
          />
          <ListRow
            icon="guide"
            title={t('guide.title')}
            caption={t('more.guideCaption')}
            chevron
            onPress={() => router.push('/guide')}
          />
        </Card>
      </ScrollView>

      {chokDialog}
      {selichotFlow.dialog}

      <BottomSheet
        visible={halachaOpen}
        title={t('more.halacha.title')}
        caption={t(`more.halacha.caption.${ruling}`)}
        onClose={() => setHalachaOpen(false)}
      >
        <ScrollView style={styles.lines}>
          {HALACHA_LINES[ruling].map((line) => {
            const whatsapp = whatsappUrl(line);
            const number = phoneLabel(line.phone);
            return (
              <View key={line.id} style={styles.line}>
                <SectionLabel text={line.name[language]} style={styles.lineName} />
                {line.hours ? (
                  <Text style={[typography.small, { color: colors.textMuted }]}>{line.hours[language]}</Text>
                ) : null}
                <SheetAction label={t('more.halacha.call', { number })} onPress={() => openLink(callUrl(line))} />
                {whatsapp ? (
                  <SheetAction label={t('more.halacha.whatsapp', { number })} onPress={() => openLink(whatsapp)} />
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

function openLink(url: string) {
  Linking.openURL(url).catch(() => {});
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
  lines: {
    maxHeight: scaled(420),
  },
  hidden: {
    display: 'none',
  },
  line: {
    marginBottom: spacing.md,
  },
  lineName: {
    paddingHorizontal: 0,
    marginBottom: spacing.xs,
  },
});
