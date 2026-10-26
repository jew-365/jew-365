import React, { useState } from 'react';
import { Linking, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { scaled } from '@/theme/scale';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

const HIT_SLOP = scaled(8);

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
        hitSlop={HIT_SLOP}
        onPress={() => {
          Linking.openURL(t('chok.licenseUrl')).catch(() => {});
        }}
      >
        <Text style={[typography.captionBold, { color: colors.goldText }]}>{t('chok.license')}</Text>
      </Pressable>
    </View>
  );
}

export function ChokCreditSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <BottomSheet visible={visible} title={t('chok.creditTitle')} onClose={onClose}>
      <NoticeLines />
    </BottomSheet>
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
        hitSlop={HIT_SLOP}
        onPress={() => setOpen(true)}
        style={[styles.short, style]}
      >
        <Text style={[typography.captionBold, { color: colors.goldText }]}>{t('chok.creditShort')}</Text>
      </Pressable>
      <ChokCreditSheet visible={open} onClose={() => setOpen(false)} />
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
