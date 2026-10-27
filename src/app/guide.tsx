import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionLabel } from '@/components/SectionLabel';
import { SettingsSection } from '@/components/SettingsSection';
import {
  guideList,
  latestWhatsNew,
  GUIDE_TOPICS,
  visibleGuideTopics,
  whatsNewHeading,
  type GuideList,
  type GuideTopicId,
} from '@/data/guide';
import { taharahOffered } from '@/stores/taharahOptIn';
import { useUserStore } from '@/stores/useUserStore';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useI18n } from '@/i18n';

export default function GuideScreen() {
  const { colors } = useTheme();
  const { language, t } = useI18n();
  const router = useRouter();
  const nusach = useUserStore((s) => s.nusach);
  const taharahVisible = useUserStore((s) => taharahOffered(s));
  const topic = useLocalSearchParams<{ topic?: string }>().topic;
  const [open, setOpen] = useState<ReadonlySet<GuideTopicId>>(() => new Set());
  // The search opens a topic by its id.
  useEffect(() => {
    if (topic && GUIDE_TOPICS.some((entry) => entry.id === topic)) setOpen(new Set([topic as GuideTopicId]));
  }, [topic]);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'));
  const toggle = (id: GuideTopicId) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={t('guide.title')} subtitle={t('guide.subtitle')} onBack={goBack} />
      <ScrollView contentContainerStyle={styles.list}>
        <SectionLabel text={t('guide.whatsNew')} />
        <Card padded style={styles.whatsNew}>
          {latestWhatsNew().map((entry, index) => (
            <View key={entry.label} style={index > 0 ? styles.entryGap : undefined}>
              <Text style={[typography.captionBold, { color: colors.goldText }]}>
                {whatsNewHeading(entry, language)}
              </Text>
              {entry.items.map((item) => (
                <Text key={item.en} style={[typography.body, styles.item, { color: colors.text }]}>
                  {item[language]}
                </Text>
              ))}
            </View>
          ))}
        </Card>
        <SectionLabel text={t('guide.topics')} />
        {visibleGuideTopics(taharahVisible).map(({ id, icon, title, body, list, action }) => (
          <SettingsSection
            key={id}
            title={title[language]}
            icon={icon}
            collapsible
            expanded={open.has(id)}
            onToggle={() => toggle(id)}
          >
            <View testID={`guide-topic-${id}`}>
              {body.map((paragraph, index) => (
                <Text
                  key={paragraph.en}
                  style={[typography.body, index > 0 && styles.paragraphGap, { color: colors.text }]}
                >
                  {paragraph[language]}
                </Text>
              ))}
              {list ? <GuideListBlock list={guideList(list, language, nusach)} /> : null}
              {action ? (
                <Button label={action.label[language]} onPress={() => router.push(action.href)} style={styles.action} />
              ) : null}
            </View>
          </SettingsSection>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function GuideListBlock({ list }: { list: GuideList }) {
  const { colors } = useTheme();
  return (
    <View style={styles.listBlock}>
      <SectionLabel variant="field" text={list.title} />
      {list.groups.map((group) => (
        <View key={group.key} style={styles.group}>
          {group.label ? <SectionLabel variant="field" text={group.label} /> : null}
          <Text testID={`guide-list-${list.kind}-${group.key}`} style={[typography.body, { color: colors.text }]}>
            {group.items.join(' · ')}
          </Text>
        </View>
      ))}
    </View>
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
  whatsNew: {
    marginBottom: spacing.md,
  },
  entryGap: {
    marginTop: spacing.md,
  },
  item: {
    marginTop: spacing.xs,
  },
  paragraphGap: {
    marginTop: spacing.sm,
  },
  listBlock: {
    marginTop: spacing.md,
  },
  group: {
    marginBottom: spacing.sm,
  },
  action: {
    marginTop: spacing.md,
  },
});
