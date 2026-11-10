import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheet, SheetAction } from '@/components/BottomSheet';
import { MitzvahIcon } from '@/components/MitzvahIcon';
import { SectionLabel } from '@/components/SectionLabel';
import { useI18n } from '@/i18n';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { scaled } from '@/theme/scale';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { suggestedPins } from '@/utils/homeTimes';
import { ARC_ZMANIM, isZmanId, offeredMoreZmanim, type CarouselZmanId } from '@/utils/zmanIds';

const TOUCH = scaled(44);
const ICON = scaled(20);

// The one list the carousel's times are chosen in (the owner's calls of 2026-11-10): the times shown, each with its
// star and a remove button, then the times that can be added, the circle's hidden zmanim and the times the circle
// never shows. Home's + chip opens it in a sheet; the זמני הלכה section of Settings and the onboarding times step
// draw it in place.
export function ZmanimPicker() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const hidden = useUserStore((s) => s.hiddenZmanim);
  const added = useUserStore((s) => s.addedZmanim);
  const pins = useUserStore((s) => s.zmanPins);
  const ks = useUserStore((s) => s.halachicOpinions.ksSofZman);
  const setShown = useUserStore((s) => s.setZmanShown);
  const setPinned = useUserStore((s) => s.setZmanPinned);
  const active = useMitzvotStore((s) => s.activeMitzvot);
  const reasons = useMemo(() => {
    const enabled = new Set(Object.keys(active).filter((id) => active[id].enabled));
    return new Map(suggestedPins(enabled).map((s) => [s.id as CarouselZmanId, s.reason]));
  }, [active]);

  const more = offeredMoreZmanim(ks);
  const shown: CarouselZmanId[] = [
    ...ARC_ZMANIM.filter((id) => !hidden.includes(id)),
    ...more.filter((id) => added.includes(id)),
  ];
  const addable: CarouselZmanId[] = [
    ...ARC_ZMANIM.filter((id) => hidden.includes(id)),
    ...more.filter((id) => !added.includes(id)),
  ];
  const lastOnCircle = ARC_ZMANIM.length - hidden.length <= 1;
  const name = (id: CarouselZmanId) => t(`home.zman.${id}.name`);
  const reason = (id: CarouselZmanId) => {
    const r = reasons.get(id);
    return r ? t(`home.times.reason.${r}`) : null;
  };

  return (
    <View>
      <SectionLabel variant="field" text={t('home.times.pins.shown')} />
      {shown.map((id) => {
        const pinned = pins.includes(id);
        const locked = isZmanId(id) && lastOnCircle;
        const caption = pinned
          ? t('home.times.pins.starred')
          : (reason(id) ?? (isZmanId(id) ? null : t('home.times.pins.notOnArc')));
        return (
          <View key={id} testID={`zmanim-row-${id}`} style={[styles.row, { borderBottomColor: colors.border }]}>
            <View style={styles.text}>
              <Text style={[typography.subheading, { color: colors.text }]}>{name(id)}</Text>
              {caption ? <Text style={[typography.caption, { color: colors.textSub }]}>{caption}</Text> : null}
            </View>
            <Pressable
              testID={`zmanim-star-${id}`}
              accessibilityRole="button"
              accessibilityState={{ selected: pinned }}
              accessibilityLabel={t(pinned ? 'home.times.pins.unstar' : 'home.times.pins.star', { name: name(id) })}
              onPress={() => setPinned(id, !pinned)}
              style={styles.button}
            >
              <MitzvahIcon
                name="star"
                size={ICON}
                color={pinned ? colors.gold : colors.textMuted}
                variant="duotone"
                tint={pinned ? colors.gold : 'transparent'}
              />
            </Pressable>
            <Pressable
              testID={`zmanim-remove-${id}`}
              accessibilityRole="button"
              accessibilityLabel={t('home.times.pins.remove', { name: name(id) })}
              accessibilityHint={locked ? t('home.times.pins.lastOne') : undefined}
              accessibilityState={{ disabled: locked }}
              disabled={locked}
              onPress={() => setShown(id, false)}
              style={[styles.button, locked && styles.disabled]}
            >
              <MitzvahIcon name="close" size={ICON} color={colors.textSub} />
            </Pressable>
          </View>
        );
      })}
      {addable.length ? <SectionLabel variant="field" text={t('home.times.pins.more')} style={styles.label} /> : null}
      {addable.map((id) => (
        <SheetAction
          key={id}
          label={name(id)}
          caption={[t('home.times.pins.add'), reason(id) ?? (isZmanId(id) ? null : t('home.times.pins.notOnArc'))]
            .filter(Boolean)
            .join(' · ')}
          onPress={() => setShown(id, true)}
        />
      ))}
    </View>
  );
}

export function ZmanimSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <BottomSheet
      visible={visible}
      title={t('home.times.pins.title')}
      caption={t('home.times.pins.caption')}
      onClose={onClose}
    >
      <ScrollView style={styles.body}>
        <ZmanimPicker />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { flexShrink: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingStart: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1, minWidth: 0 },
  button: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.35 },
  label: { marginTop: spacing.md },
});
