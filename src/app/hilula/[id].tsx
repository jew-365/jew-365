import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { HDate, gematriya } from '@hebcal/core';
import { HILULOT, hilulaDateLabel, upcomingHilulot, type Hilula } from '@/data/hilulot';
import { hilulaPage, wazeUrl } from '@/data/hilulaPages';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionLabel } from '@/components/SectionLabel';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useNow } from '@/hooks/useNow';
import { HebcalService } from '@/services/HebcalService';
import { useUserStore } from '@/stores/useUserStore';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useI18n } from '@/i18n';

export default function HilulaScreen() {
  const { colors } = useTheme();
  const { language, t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; ids?: string }>();
  const location = useUserStore((s) => s.location);
  const inIsrael = useUserStore((s) => s.inIsrael);
  const scrollRef = useRef<ScrollView>(null);
  const now = useNow();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'));
  const locale = language === 'en' ? 'en' : 'he';

  const routeId = typeof params.id === 'string' ? params.id : '';
  const idsParam = typeof params.ids === 'string' ? params.ids : '';
  const group = useMemo(() => {
    const named = idsParam.split(',');
    const ids = [...new Set(named.includes(routeId) ? named : [routeId, ...named])];
    return ids.flatMap((id) => HILULOT.filter((entry) => entry.id === id));
  }, [routeId, idsParam]);
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => setPicked(null), [routeId, idsParam]);
  const hilula = group.find((entry) => entry.id === picked) ?? group.find((entry) => entry.id === routeId);

  const todayAbs = HebcalService.hebrewDayAt(now, location).abs();
  const upcoming = useMemo(() => upcomingHilulot(new HDate(todayAbs), inIsrael), [todayAbs, inIsrael]);

  if (!hilula) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title={t('errors.generic')} onBack={goBack} />
      </SafeAreaView>
    );
  }

  const nameOf = (entry: Hilula) => entry.name[locale];
  const page = hilulaPage(hilula.id);
  const next = upcoming.find((entry) => entry.hilula.id === hilula.id)?.day;
  const date = next ? hilulaDateLabel(next, locale) : '';
  const subtitle =
    hilula.year === undefined
      ? t('hilula.page.date', { date })
      : t('hilula.page.dateYear', { date, year: language === 'en' ? hilula.year : gematriya(hilula.year) });
  const url = page ? wazeUrl(page.grave) : null;

  const pick = (id: string) => {
    setPicked(id);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={nameOf(hilula)} subtitle={subtitle} onBack={goBack}>
        {group.length > 1 ? (
          <View accessibilityRole="radiogroup" accessibilityLabel={t('hilula.page.pick')}>
            <SegmentedControl
              options={group.map((entry) => ({ value: entry.id, label: nameOf(entry) }))}
              value={hilula.id}
              onChange={pick}
            />
          </View>
        ) : undefined}
      </ScreenHeader>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        {page ? (
          <>
            <SectionLabel text={t('hilula.page.bio')} />
            <Card padded>
              <Text style={[typography.body, { color: colors.text }]}>{page.bio[locale]}</Text>
            </Card>
            <SectionLabel text={t('hilula.page.lessons')} />
            <Card padded>
              <View style={styles.stack}>
                {page.lessons.map((lesson) => (
                  <View key={lesson.title.he}>
                    <Text style={[typography.bodyBold, { color: colors.text }]}>{lesson.title[locale]}</Text>
                    <Text style={[typography.body, { color: colors.text }]}>{lesson.text[locale]}</Text>
                  </View>
                ))}
              </View>
            </Card>
            {!page.biblical && page.works.length > 0 ? (
              <>
                <SectionLabel text={t('hilula.page.works')} />
                <Card padded>
                  <View style={styles.stack}>
                    {page.works.map((work) => (
                      <View key={work.title.he}>
                        <Text style={[typography.bodyBold, { color: colors.text }]}>{work.title[locale]}</Text>
                        <Text style={[typography.caption, { color: colors.textSub }]}>{work.about[locale]}</Text>
                      </View>
                    ))}
                  </View>
                </Card>
              </>
            ) : null}
            <SectionLabel text={t(page.stories.length > 1 ? 'hilula.page.stories' : 'hilula.page.story')} />
            <Card padded>
              <View style={styles.stack}>
                {page.stories.map((story) => (
                  <View key={story.title.he}>
                    <Text style={[typography.bodyBold, { color: colors.text }]}>{story.title[locale]}</Text>
                    <Text style={[typography.body, { color: colors.text }]}>{story.text[locale]}</Text>
                  </View>
                ))}
              </View>
            </Card>
            <SectionLabel text={t('hilula.page.grave')} />
            <Card padded>
              <View style={styles.stack}>
                <Text style={[typography.body, { color: colors.text }]}>{page.grave.place[locale]}</Text>
                {url ? (
                  <Button label={t('hilula.page.waze')} onPress={() => Linking.openURL(url).catch(() => {})} />
                ) : page.grave.noLinkReason ? (
                  <Text style={[typography.caption, { color: colors.textSub }]}>{page.grave.noLinkReason[locale]}</Text>
                ) : null}
              </View>
            </Card>
          </>
        ) : (
          <Card padded>
            <Text style={[typography.body, { color: colors.textSub }]}>{t('hilula.page.missing')}</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  stack: {
    gap: spacing.md,
  },
});
