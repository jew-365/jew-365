import React, { useState } from 'react';
import { Linking, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

function NoticeLines({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <View style={[styles.lines, style]}>
      <Text style={[typography.caption, { color: colors.textSub }]}>{t('chok.credit')}</Text>
      <Text style={[typography.caption, { color: colors.textMuted }]}>{t('chok.shareAlike')}</Text>
      <Pressable
        accessibilityRole="link"
        hitSlop={8}
        onPress={() => {
          Linking.openURL(t('chok.licenseUrl')).catch(() => {});
        }}
      >
        <Text style={[typography.captionBold, { color: colors.goldText }]}>{t('chok.license')}</Text>
      </Pressable>
    </View>
  );
}

export function ChokLicenseNotice({ style, compact = false }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  if (!compact) {
    return <NoticeLines style={style} />;
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('chok.creditOpen')}
        hitSlop={8}
        onPress={() => setOpen(true)}
        style={[styles.short, style]}
      >
        <Text style={[typography.captionBold, { color: colors.goldText }]}>{t('chok.creditShort')}</Text>
      </Pressable>
      <BottomSheet visible={open} title={t('chok.creditTitle')} onClose={() => setOpen(false)}>
        <NoticeLines />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  lines: {
    gap: spacing.xs,
  },
  short: {
    alignSelf: 'flex-start',
  },
});
