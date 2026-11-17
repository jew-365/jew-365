import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { MitzvahLibraryList } from '@/components/MitzvahLibraryList';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TemplateSheet } from '@/components/TemplateSheet';
import { shadowPresets, shadowStyle } from '@/theme/shadowStyle';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { useI18n } from '@/i18n';

export default function MitzvotScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [addHeight, setAddHeight] = useState(0);
  // `add=1` (the capabilities screen's personal goal, a template found by the search) opens the template sheet.
  const { add } = useLocalSearchParams<{ add?: string }>();
  const [templatesOpen, setTemplatesOpen] = useState(add === '1');
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={t('library.title')} subtitle={t('library.subtitle')} onBack={goBack} />
      <ScrollView
        testID="library-scroll"
        style={styles.listScroll}
        contentContainerStyle={[styles.list, { paddingBottom: addHeight + insets.bottom + spacing.xl }]}
      >
        <MitzvahLibraryList showMine navigable />
      </ScrollView>
      <View
        testID="library-add"
        pointerEvents="box-none"
        style={[styles.floatingAdd, { bottom: insets.bottom + spacing.md }]}
        onLayout={(event) => setAddHeight(event.nativeEvent.layout.height)}
      >
        <Button
          label={t('library.addCustom')}
          icon="plus"
          onPress={() => setTemplatesOpen(true)}
          style={shadowStyle(colors.shadow, shadowPresets.cardSoft)}
        />
      </View>
      <TemplateSheet visible={templatesOpen} onClose={() => setTemplatesOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  listScroll: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.lg,
  },
  floatingAdd: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
  },
});
