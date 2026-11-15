import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { CapabilityIcons, CapabilityRow } from '@/components/CapabilityViews';
import { Card } from '@/components/Card';
import { ListRow } from '@/components/ListRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionLabel } from '@/components/SectionLabel';
import { SettingsSection } from '@/components/SettingsSection';
import { BUNDLES, bundleMembers, bundleOn, bundleSelection, type BundleId } from '@/data/bundles';
import {
  CAPABILITIES,
  CAPABILITY_GOALS,
  type Capability,
  type CapabilityAction,
  type CapabilityGoal,
  type CapabilityInput,
  type CapabilityState,
} from '@/data/capabilities';
import { useCapabilityStates } from '@/hooks/useCapabilities';
import { useNeedsReminderDialog } from '@/hooks/useNeedsReminderDialog';
import { useCapabilityAction } from '@/hooks/useOffer';
import { useI18n } from '@/i18n';
import { useUserStore } from '@/stores/useUserStore';
import { BRAND } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

const isGoal = (value: unknown): value is CapabilityGoal =>
  typeof value === 'string' && (CAPABILITY_GOALS as readonly string[]).includes(value);

// What a press on a capability's "turn on" does: an installed add-on switches its mitzvot on, anything else is
// the capability's own action (a download opens the mitzvah screen, which holds it).
const actOf = (cap: Capability, state: CapabilityState): CapabilityAction =>
  cap.action.kind === 'addon' && state === 'off' ? { kind: 'mitzvot', ids: cap.action.ids } : cap.action;

// Whether "turn all on" reaches a capability: one a single tap switches on, with no download and no trip.
const switchable = (cap: Capability, state: CapabilityState): boolean =>
  state === 'off' && (cap.action.kind === 'mitzvot' || cap.action.kind === 'notices' || cap.action.kind === 'addon');

// "All capabilities" (spec .claude/specs/discoverability.md, C4; the owner's pick of 2026-11-15, direction ב of
// the hub study): one folding card per goal with its icon strip, each capability with its state and one action.
// With `bundles` it opens on the goal bundles, the catch-up of A6: nothing changes until the user confirms.
export default function CapabilitiesScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ goal?: string; bundles?: string }>();
  const { input, stateOf } = useCapabilityStates();
  const { run, dialog } = useCapabilityAction();
  const [open, setOpen] = useState<ReadonlySet<CapabilityGoal>>(
    () => new Set(isGoal(params.goal) ? [params.goal] : []),
  );
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/more'));
  const toggle = (goal: CapabilityGoal) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(goal)) next.delete(goal);
      else next.add(goal);
      return next;
    });

  const openCapability = (cap: Capability, state: CapabilityState) => {
    const a = cap.action;
    switch (a.kind) {
      case 'mitzvot':
        // A group of mitzvot opens the library, where each has its own switch; one mitzvah opens its screen.
        router.push(a.ids.length > 1 ? '/mitzvot' : `/mitzvah/${a.ids[0]}`);
        return;
      case 'addon':
      case 'notices':
      case 'route':
        router.push(a.href as never);
        return;
      default:
        run(actOf(cap, state));
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={t('capabilities.title')} subtitle={t('capabilities.subtitle')} onBack={goBack} />
      <ScrollView contentContainerStyle={styles.content}>
        {params.bundles === '1' ? <BundleChooser input={input} stateOf={stateOf} /> : null}
        {CAPABILITY_GOALS.map((goal) => {
          const caps = CAPABILITIES.filter((c) => c.goal === goal)
            .map((cap) => ({ cap, state: stateOf(cap) }))
            .filter(({ state }) => state !== 'unavailable');
          if (!caps.length) return null;
          const on = caps.filter(({ state }) => state === 'on').length;
          const off = caps.filter(({ cap, state }) => switchable(cap, state));
          const title = t(`capability.goal.${goal}`);
          return (
            <View key={goal} testID={`capabilities-goal-${goal}`}>
              <SettingsSection
                title={title}
                subtitle={t('capabilities.goalCount', { on, total: caps.length })}
                headerExtra={
                  <CapabilityIcons
                    items={caps.map(({ cap, state }) => ({ id: cap.id, icon: cap.icon, on: state === 'on' }))}
                  />
                }
                collapsible
                expanded={open.has(goal)}
                onToggle={() => toggle(goal)}
              >
                {off.length ? (
                  <Button
                    variant="secondary"
                    size="compact"
                    label={t('capabilities.allOn')}
                    accessibilityLabel={t('capabilities.allOnLabel', { goal: title })}
                    onPress={() => off.forEach(({ cap, state }) => run(actOf(cap, state)))}
                    style={styles.allOn}
                  />
                ) : null}
                <View style={styles.rows}>
                  {caps.map(({ cap, state }) => (
                    <CapabilityRow
                      key={cap.id}
                      capability={cap}
                      state={state}
                      onOpen={() => openCapability(cap, state)}
                      onAct={() => run(actOf(cap, state))}
                    />
                  ))}
                </View>
              </SettingsSection>
            </View>
          );
        })}
      </ScrollView>
      {dialog}
    </SafeAreaView>
  );
}

// The goal bundles as ticks (spec A3, A6): the recommended ones and those already on arrive ticked, and the
// button switches on what is ticked and still off. A tick never switches anything off, and the learning
// programs, each a download, stay with their rows below.
function BundleChooser({ input, stateOf }: { input: CapabilityInput; stateOf: (cap: Capability) => CapabilityState }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const gender = useUserStore((s) => s.gender);
  const { setMitzvahEnabled, setNoticesEnabled, dialog } = useNeedsReminderDialog();
  const bundles = useMemo(() => BUNDLES.filter((b) => !b.pick && bundleMembers(b, stateOf).length > 0), [stateOf]);
  const [ticked, setTicked] = useState<ReadonlySet<BundleId>>(
    () => new Set(bundles.filter((b) => b.recommended || bundleOn(b, stateOf)).map((b) => b.id)),
  );
  const [result, setResult] = useState<'done' | 'nothing' | null>(null);

  const confirm = () => {
    const { mitzvot, notices } = bundleSelection([...ticked], gender, input.offered);
    const toEnable = mitzvot.filter((id) => !input.enabled(id));
    const topics = notices.filter((topic) => !input.notices[topic]);
    toEnable.forEach((id) => setMitzvahEnabled(id, true, () => router.push(`/mitzvah/${id}`)));
    topics.forEach((topic) =>
      setNoticesEnabled(topic, true, () => router.push(topic === 'hilulot' ? '/hilulot' : '/rosh-chodesh')),
    );
    setResult(toEnable.length || topics.length ? 'done' : 'nothing');
  };

  return (
    <View testID="capabilities-bundles" style={styles.bundles}>
      <SectionLabel text={t('capabilities.bundles.title')} />
      <Text style={[typography.caption, styles.hint, { color: colors.textSub }]}>{t('capabilities.bundles.hint')}</Text>
      <Card divided>
        {bundles.map((bundle) => {
          const on = bundleOn(bundle, stateOf);
          const title = t(`bundle.${bundle.id}.title`);
          return (
            <ListRow
              key={bundle.id}
              icon={bundle.icon}
              iconTone={ticked.has(bundle.id) ? 'accent' : 'muted'}
              title={
                on
                  ? `${title} · ${t('capabilities.bundles.alreadyOn')}`
                  : bundle.recommended
                    ? `${title} · ${t('capabilities.bundles.recommended')}`
                    : title
              }
              caption={t(`bundle.${bundle.id}.caption`)}
              trailing={
                <Switch
                  testID={`bundle-switch-${bundle.id}`}
                  value={ticked.has(bundle.id)}
                  disabled={on}
                  onValueChange={(value) => {
                    setResult(null);
                    setTicked((current) => {
                      const next = new Set(current);
                      if (value) next.add(bundle.id);
                      else next.delete(bundle.id);
                      return next;
                    });
                  }}
                  accessibilityLabel={title}
                  thumbColor={BRAND.white}
                  trackColor={{ false: colors.border, true: colors.gold }}
                />
              }
            />
          );
        })}
      </Card>
      {result ? (
        <Banner
          tone={result === 'done' ? 'safe' : 'info'}
          text={t(result === 'done' ? 'capabilities.bundles.done' : 'capabilities.bundles.nothing')}
          style={styles.result}
        />
      ) : null}
      <Button label={t('capabilities.bundles.confirm')} onPress={confirm} style={styles.confirm} />
      {dialog}
    </View>
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
  rows: {
    marginHorizontal: -spacing.lg,
  },
  allOn: {
    alignSelf: 'flex-start',
  },
  bundles: {
    marginBottom: spacing.lg,
  },
  hint: {
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  result: {
    marginTop: spacing.md,
  },
  confirm: {
    marginTop: spacing.md,
  },
});
