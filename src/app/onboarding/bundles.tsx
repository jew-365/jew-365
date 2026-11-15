import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconTile } from '@/components/IconTile';
import { MitzvahIcon } from '@/components/MitzvahIcon';
import { ONBOARDING_STEPS, OnboardingDots } from '@/components/OnboardingDots';
import { BUNDLES, bundleMembers, type Bundle } from '@/data/bundles';
import type { Capability } from '@/data/capabilities';
import { useCapabilityStates } from '@/hooks/useCapabilities';
import { useNeedsReminderDialog } from '@/hooks/useNeedsReminderDialog';
import {
  applyRecommendedBundlesOnce,
  bundleDefaultMembers,
  memberOn,
  memberTarget,
  type MemberTarget,
} from '@/services/setupBundles';
import { useUserStore } from '@/stores/useUserStore';
import { scaled } from '@/theme/scale';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useI18n } from '@/i18n';

const TICK_SIZE = scaled(24);
const TICK_ICON = scaled(14);
const CHIP_ICON = scaled(12);

// "What matters to you" (spec A3, the owner's pick of 2026-11-15, direction א): five goal cards. The
// recommended ones arrive ticked, a tick switches a whole group, and inside a ticked card each member can be
// removed. The ticks are the stores themselves; a learning program is only saved as wanted, because its
// download and size confirmation live outside setup.
export default function OnboardingBundlesScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const gender = useUserStore((s) => s.gender);
  const wants = useUserStore((s) => s.discovery.wants);
  const setWants = useUserStore((s) => s.setWants);
  const { input, stateOf } = useCapabilityStates();
  const { setMitzvahEnabled, setNoticesEnabled, dialog } = useNeedsReminderDialog();
  const openDetail = () => router.push('/onboarding/mitzvot');

  useEffect(() => {
    applyRecommendedBundlesOnce(gender, input.offered);
    // Once per gender answer; the stores it writes are read again through `useCapabilityStates()`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gender]);

  const targetOf = (cap: Capability) => memberTarget(cap, gender, input);
  const isOn = (cap: Capability) => memberOn(targetOf(cap), input, wants);
  const setTarget = (target: MemberTarget | null, on: boolean) => {
    if (!target) return;
    if (target.kind === 'mitzvot') for (const id of target.ids) setMitzvahEnabled(id, on, openDetail);
    else if (target.kind === 'notices') setNoticesEnabled(target.topic, on, openDetail);
    else {
      const current = useUserStore.getState().discovery.wants;
      setWants(on ? [...current, target.id] : current.filter((id) => id !== target.id));
    }
  };
  const toggleBundle = (bundle: Bundle, members: Capability[], on: boolean) => {
    if (on) for (const cap of members) setTarget(targetOf(cap), false);
    else {
      const defaults = bundleDefaultMembers(bundle);
      for (const cap of members) if (defaults.includes(cap.id)) setTarget(targetOf(cap), true);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={[typography.title, { color: colors.text }]}>{t('onboarding.bundles.title')}</Text>
      <Text style={[typography.body, { color: colors.textSub, marginTop: spacing.xs }]}>
        {t('onboarding.bundles.body')}
      </Text>
      <ScrollView contentContainerStyle={styles.list}>
        {BUNDLES.map((bundle) => {
          const members = bundleMembers(bundle, stateOf);
          if (!members.length) return null;
          const on = members.some(isOn);
          const title = t(`bundle.${bundle.id}.title`);
          return (
            <Card key={bundle.id} padded>
              <Pressable
                testID={`bundle-${bundle.id}`}
                onPress={() => toggleBundle(bundle, members, on)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                aria-checked={on}
                accessibilityLabel={bundle.recommended ? `${title}, ${t('onboarding.bundles.recommended')}` : title}
                style={styles.head}
              >
                <IconTile name={bundle.icon} tone={on ? 'accent' : 'muted'} />
                <View style={styles.meta}>
                  <Text style={[typography.bodyBold, { color: colors.text }]}>
                    {title}
                    {bundle.recommended ? (
                      <Text style={[typography.caption, { color: colors.goldText }]}>
                        {` · ${t('onboarding.bundles.recommended')}`}
                      </Text>
                    ) : null}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSub, marginTop: spacing.xs }]}>
                    {t(bundle.pick ? 'onboarding.bundles.learningCaption' : `bundle.${bundle.id}.caption`)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.tick,
                    {
                      borderColor: on ? colors.gold : colors.border,
                      backgroundColor: on ? colors.gold : 'transparent',
                    },
                  ]}
                >
                  {on ? <MitzvahIcon name="check" size={TICK_ICON} color={colors.onGold} /> : null}
                </View>
              </Pressable>
              {on || bundle.pick ? (
                <View style={styles.members}>
                  {members.map((cap) => {
                    const memberIsOn = isOn(cap);
                    return (
                      <Pressable
                        key={cap.id}
                        testID={`bundle-member-${cap.id}`}
                        onPress={() => setTarget(targetOf(cap), !memberIsOn)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: memberIsOn }}
                        aria-checked={memberIsOn}
                        accessibilityLabel={t(`capability.${cap.id}.title`)}
                        style={[styles.chip, { backgroundColor: memberIsOn ? colors.goldLight : colors.surface2 }]}
                      >
                        <MitzvahIcon
                          name={memberIsOn ? 'check' : 'plus'}
                          size={CHIP_ICON}
                          color={memberIsOn ? colors.goldText : colors.textMuted}
                        />
                        <Text
                          style={[
                            memberIsOn ? typography.captionBold : typography.caption,
                            { color: memberIsOn ? colors.goldText : colors.textSub },
                          ]}
                        >
                          {t(`capability.${cap.id}.title`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
              {bundle.id === 'shabbat' && on && gender === 'male' ? (
                <Text style={[typography.small, styles.note, { color: colors.textMuted }]}>
                  {t('onboarding.bundles.candlesMale')}
                </Text>
              ) : null}
            </Card>
          );
        })}
        <View style={styles.links}>
          <Pressable onPress={openDetail} accessibilityRole="link" hitSlop={scaled(8)}>
            <Text style={[typography.bodyBold, { color: colors.goldText }]}>{t('onboarding.bundles.detail')}</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/onboarding/zmanim')} accessibilityRole="link" hitSlop={scaled(8)}>
            <Text style={[typography.bodyBold, { color: colors.goldText }]}>{t('onboarding.bundles.times')}</Text>
          </Pressable>
        </View>
      </ScrollView>
      <OnboardingDots step={3} total={ONBOARDING_STEPS} style={styles.dots} />
      <Button label={t('common.continue')} onPress={() => router.push('/onboarding/permissions')} />
      <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.backBtn}>
        <Text style={[typography.small, { color: colors.textSub }]}>{t('common.back')}</Text>
      </Pressable>
      {dialog}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    padding: spacing.xl,
  },
  list: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  meta: {
    flex: 1,
  },
  tick: {
    width: TICK_SIZE,
    height: TICK_SIZE,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  members: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  note: {
    marginTop: spacing.md,
  },
  links: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  dots: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  backBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
});
