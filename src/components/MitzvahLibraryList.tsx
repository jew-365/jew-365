import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Card } from '@/components/Card';
import { chokAddonCaption } from '@/components/ChokAddonCard';
import { ListRow } from '@/components/ListRow';
import { iconFor, type IconName } from '@/components/MitzvahIcon';
import { SectionLabel } from '@/components/SectionLabel';
import { CHOK_TEXT_ID } from '@/data/chok';
import { LIBRARY_GROUPS } from '@/data/mitzvot';
import { useDayModel } from '@/hooks/useDayModel';
import { useNeedsReminderDialog } from '@/hooks/useNeedsReminderDialog';
import { useChokStore } from '@/stores/useChokStore';
import { useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { isMensMitzvah } from '@/stores/taharahOptIn';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore, type NoticeTopic } from '@/stores/useUserStore';
import { BRAND } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { useI18n } from '@/i18n';
import { LibraryGroup, Mitzvah } from '@/types/mitzvah';
import { customEndedOn, scheduleDateLabel } from '@/utils/customMitzvah';
import { appDayKey } from '@/utils/locationDay';

const SETTING_ROWS_GROUP: LibraryGroup = 'other';
const MINE_GROUP: LibraryGroup = 'mine';
const NOTHING = () => {};

type SettingRow = {
  key: string;
  icon: IconName;
  title: string;
  caption: string;
  route: Href;
  enabled: boolean;
  topic: NoticeTopic;
};

export type MitzvahLibraryListProps = { showMine: boolean; navigable: boolean };

export function MitzvahLibraryList({ showMine, navigable }: MitzvahLibraryListProps) {
  const { t } = useI18n();
  const { allMitzvot, nameFor, chokInstalled, location, language } = useDayModel();
  const router = useRouter();
  const needsReminder = useNeedsReminderDialog();
  const active = useMitzvotStore((s) => s.activeMitzvot);
  const chokDownload = useChokStore((s) => s.download);
  const customItems = useCustomMitzvotStore((s) => s.items);
  const hilulotEnabled = useUserStore((s) => s.hilulotEnabled);
  const roshChodeshEnabled = useUserStore((s) => s.roshChodeshEnabled);
  const gender = useUserStore((s) => s.gender);
  const todayKey = appDayKey(new Date(), location);
  const opener = (href: Href) => (navigable ? () => router.push(href) : NOTHING);
  const listed = (item: Mitzvah) => navigable || chokInstalled || item.id !== CHOK_TEXT_ID;

  const settingRows: SettingRow[] = [
    {
      key: 'hilulot',
      icon: 'hilula',
      title: t('hilulot.title'),
      caption: t('hilulot.caption'),
      route: '/hilulot',
      enabled: hilulotEnabled,
      topic: 'hilulot',
    },
    {
      key: 'roshChodesh',
      icon: 'moon',
      title: t('roshChodesh.title'),
      caption: t('roshChodesh.caption'),
      route: '/rosh-chodesh',
      enabled: roshChodeshEnabled,
      topic: 'roshChodesh',
    },
  ];

  const sections = LIBRARY_GROUPS.filter((group) => showMine || group !== MINE_GROUP)
    .map((group) => ({
      group,
      mitzvot: allMitzvot.filter((item) => item.group === group && listed(item)),
      settings: group === SETTING_ROWS_GROUP ? settingRows : [],
    }))
    .filter((section) => section.mitzvot.length + section.settings.length > 0);

  const mitzvahRow = (item: Mitzvah) => {
    const awaitingAddon = item.id === CHOK_TEXT_ID && !chokInstalled;
    const custom = item.isCustom ? customItems[item.id] : undefined;
    const endedOn = custom ? customEndedOn(custom, todayKey) : null;
    const enabled = !awaitingAddon && endedOn === null && (active[item.id]?.enabled ?? false);
    const label = nameFor(item);
    const mitzvahScreen = opener(`/mitzvah/${item.id}`);
    const openEditor = item.isCustom ? opener({ pathname: '/custom-mitzvah', params: { id: item.id } }) : mitzvahScreen;
    return (
      <ListRow
        key={item.id}
        icon={iconFor(item.icon)}
        iconTone={enabled ? 'accent' : 'muted'}
        title={label}
        caption={
          endedOn !== null
            ? t('custom.ended', { date: scheduleDateLabel(endedOn, language) })
            : awaitingAddon
              ? chokAddonCaption(chokDownload, t)
              : gender === 'female' && isMensMitzvah(item.id)
                ? t('library.notForWomen')
                : t(`library.category.${item.category}`)
        }
        onPress={navigable ? openEditor : undefined}
        trailing={
          <EnabledSwitch
            value={enabled}
            label={label}
            onChange={
              endedOn !== null
                ? openEditor
                : awaitingAddon
                  ? mitzvahScreen
                  : () => needsReminder.setMitzvahEnabled(item.id, !enabled, mitzvahScreen)
            }
          />
        }
      />
    );
  };

  const settingRow = (row: SettingRow) => (
    <ListRow
      key={row.key}
      icon={row.icon}
      iconTone={row.enabled ? 'accent' : 'muted'}
      title={row.title}
      caption={row.caption}
      onPress={navigable ? opener(row.route) : undefined}
      trailing={
        <EnabledSwitch
          value={row.enabled}
          label={row.title}
          onChange={() => needsReminder.setNoticesEnabled(row.topic, !row.enabled, opener(row.route))}
        />
      }
    />
  );

  return (
    <>
      {sections.map((section) => (
        <View key={section.group} testID={`library-group-${section.group}`}>
          <SectionLabel text={t(`library.group.${section.group}`)} />
          <Card divided style={styles.cardGap}>
            {section.mitzvot.map((item) => mitzvahRow(item))}
            {section.settings.map((row) => settingRow(row))}
          </Card>
        </View>
      ))}
      {needsReminder.dialog}
    </>
  );
}

function EnabledSwitch({ value, onChange, label }: { value: boolean; onChange: () => void; label: string }) {
  const { colors } = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      thumbColor={BRAND.white}
      trackColor={{ false: colors.border, true: colors.gold }}
      accessibilityLabel={label}
    />
  );
}

const styles = StyleSheet.create({
  cardGap: {
    marginBottom: spacing.lg,
  },
});
