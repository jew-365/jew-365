import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text, View } from 'react-native';
import { openExternalUrl, tryOpenExternalUrl } from '@/services/externalFlow';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Banner } from '@/components/Banner';
import { BottomSheet, SheetAction } from '@/components/BottomSheet';
import { GoalTile, OfferCard } from '@/components/CapabilityViews';
import { NavBar } from '@/components/NavBar';
import { HeaderPill } from '@/components/ScreenHeader';
import { SectionLabel } from '@/components/SectionLabel';
import { SettingsSearchBox, SettingsSearchResults, useSettingsSearch } from '@/components/SettingsSearch';
import { HALACHA_LINES, callUrl, halachaRulingFor, phoneLabel, whatsappUrl } from '@/data/halachaLines';
import { CAPABILITIES, CAPABILITY_GOALS } from '@/data/capabilities';
import { useBatteryExempt, useCapabilityStates } from '@/hooks/useCapabilities';
import { useNow } from '@/hooks/useNow';
import { useCapabilityAction } from '@/hooks/useOffer';
import { offerInputAt } from '@/services/offerInput';
import { selectEnabledCount, useMitzvotStore } from '@/stores/useMitzvotStore';
import { appDayKey } from '@/utils/locationDay';
import { hubOffers, type Offer } from '@/utils/offers';
import { checkChokUpdate } from '@/services/ChokContentService';
import { checkShnayimUpdate } from '@/services/ShnayimContentService';
import { checkHalachaUpdate } from '@/services/HalachaContentService';
import { HALACHA_PACKS } from '@/stores/useHalachaStore';
import { checkSelichotUpdate } from '@/services/SelichotContentService';
import { useUserStore } from '@/stores/useUserStore';
import { scaled } from '@/theme/scale';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import type { SettingsSearchItem } from '@/utils/settingsSearch';
import { useI18n } from '@/i18n';
import { useDeferredTab } from '@/hooks/useDeferredTab';

function MoreScreenContent() {
  const { colors } = useTheme();
  const { language, t } = useI18n();
  const router = useRouter();
  const now = useNow();
  const nusach = useUserStore((s) => s.nusach);
  const location = useUserStore((s) => s.location);
  const [halachaOpen, setHalachaOpen] = useState(false);
  const [callNote, setCallNote] = useState<string | null>(null);
  const ruling = halachaRulingFor(nusach);
  const todayKey = appDayKey(now, location);
  const { stateOf } = useCapabilityStates(todayKey);
  const battery = useBatteryExempt(todayKey);
  const { run, dialog } = useCapabilityAction();
  const enabledCount = useMitzvotStore(selectEnabledCount(nusach));
  const closedOffers = useUserStore((s) => s.discovery.offers);
  const activeMitzvot = useMitzvotStore((s) => s.activeMitzvot);
  const hilulotEnabled = useUserStore((s) => s.hilulotEnabled);
  const roshChodeshEnabled = useUserStore((s) => s.roshChodeshEnabled);
  // Up to three offers that apply now (spec C5): by the app day and what they read, never by the clock tick.
  const offers = useMemo(
    () => hubOffers(offerInputAt(new Date(), battery)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the stores are read at once; these are their changes
    [todayKey, battery, closedOffers, activeMitzvot, hilulotEnabled, roshChodeshEnabled, nusach],
  );
  // An offer accepted here is closed for good, as on home; its action runs through the shared path.
  const acceptOffer = (offer: Offer) => {
    const store = useUserStore.getState();
    store.recordOffer(offer.key, {
      shownAt: store.discovery.offers[offer.key]?.shownAt ?? Date.now(),
      closedAt: Date.now(),
    });
    run(offer.action);
  };
  const [visit, setVisit] = useState(0);
  const { query, setQuery, searching, results, tiers, pending } = useSettingsSearch(visit);
  useFocusEffect(
    useCallback(() => {
      setVisit((count) => count + 1);
      setQuery('');
      void checkChokUpdate();
      void checkShnayimUpdate();
      void checkSelichotUpdate();
      for (const pack of HALACHA_PACKS) void checkHalachaUpdate(pack);
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
        <View style={searching ? styles.hidden : undefined} testID="more-hub">
          {offers.length ? (
            <>
              <SectionLabel text={t('more.worth')} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.offers}
                style={styles.offerStrip}
                testID="more-offers"
              >
                {offers.map((offer) => (
                  <OfferCard
                    key={offer.key}
                    testID={`more-offer-${offer.id}`}
                    icon={offer.icon}
                    title={t(`offer.${offer.id}.title`)}
                    body={t(`offer.${offer.id}.body`)}
                    accept={t(`offer.${offer.id}.accept`)}
                    onAccept={() => acceptOffer(offer)}
                  />
                ))}
              </ScrollView>
            </>
          ) : null}
          <View style={styles.allRow}>
            <SectionLabel text={t('more.all')} style={styles.allLabel} />
            <HeaderPill label={t('more.allLink')} onPress={() => router.push('/capabilities')} />
          </View>
          <View style={styles.goals}>
            {CAPABILITY_GOALS.map((goal) => {
              const caps = CAPABILITIES.filter((c) => c.goal === goal)
                .map((cap) => ({ id: cap.id, icon: cap.icon, on: stateOf(cap) === 'on', state: stateOf(cap) }))
                .filter((cap) => cap.state !== 'unavailable');
              if (!caps.length) return null;
              const title = t(`capability.goal.${goal}`);
              return (
                <GoalTile
                  key={goal}
                  testID={`more-goal-${goal}`}
                  title={title}
                  icons={caps}
                  accessibilityLabel={t('more.goalLabel', {
                    goal: title,
                    on: caps.filter((cap) => cap.on).length,
                    total: caps.length,
                  })}
                  onPress={() => router.push({ pathname: '/capabilities', params: { goal } })}
                />
              );
            })}
            <GoalTile
              testID="more-library"
              title={t('more.library')}
              caption={t('more.libraryCaption', { count: enabledCount })}
              accessibilityLabel={`${t('more.library')}: ${t('more.libraryCaption', { count: enabledCount })}`}
              onPress={() => router.push('/mitzvot')}
            />
          </View>
        </View>
      </ScrollView>

      {dialog}

      <BottomSheet
        visible={halachaOpen}
        title={t('more.halacha.title')}
        caption={t(`more.halacha.caption.${ruling}`)}
        onClose={() => {
          setHalachaOpen(false);
          setCallNote(null);
        }}
      >
        {callNote ? <Banner tone="info" text={callNote} /> : null}
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
                <SheetAction
                  label={t('more.halacha.call', { number })}
                  onPress={async () => {
                    if (!(await tryOpenExternalUrl(callUrl(line)))) {
                      setCallNote(t('more.halacha.callUnavailable', { number }));
                    }
                  }}
                />
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
  openExternalUrl(url);
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
  offerStrip: {
    marginHorizontal: -spacing.lg,
  },
  offers: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  allRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  allLabel: {
    flex: 1,
  },
  goals: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  line: {
    marginBottom: spacing.md,
  },
  lineName: {
    paddingHorizontal: 0,
    marginBottom: spacing.xs,
  },
});

// Mounts after the tab shown at launch has painted, or when it gains focus ([useDeferredTab](../../hooks/useDeferredTab.ts)).
export default function MoreScreen() {
  return useDeferredTab() ? <MoreScreenContent /> : null;
}
