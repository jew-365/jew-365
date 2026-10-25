import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, useWindowDimensions } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChipRow } from '@/components/ChipRow';
import { ListRow } from '@/components/ListRow';
import type { IconName } from '@/components/MitzvahIcon';
import { SectionLabel } from '@/components/SectionLabel';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TimeField } from '@/components/TimeField';
import { useI18n } from '@/i18n';
import {
  NOTICE_DAYS_BEFORE,
  NOTICE_SHKIA_LEADS_MIN,
  noticeChangeAllowed,
  noticeDaysBefore,
  noticeTimingOf,
  type NoticeSetting,
  type NoticeTiming,
} from '@/stores/useUserStore';
import { BRAND } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { TIME_PATTERN, minutesToTime, timeToMinutes } from '@/utils/clock';

const BODY_HEIGHT_SHARE = 0.65;

export type NoticeKindOption<K extends string> = { kind: K; title: string; defaultDaysBefore?: number };

type Props<K extends string> = {
  icon: IconName;
  topic: string;
  kinds: readonly NoticeKindOption<K>[];
  notices: Record<K, NoticeSetting>;
  masterOn: boolean;
  onChange: (kind: K, setting: NoticeSetting) => void;
};

export function noticeCaption(
  setting: NoticeSetting,
  defaultDaysBefore: number | undefined,
  t: (key: string, o?: Record<string, unknown>) => string,
): string {
  const timing = noticeTimingOf(setting);
  const inline = defaultDaysBefore !== undefined;
  const time =
    timing.anchor === 'clock'
      ? minutesToTime(timing.minutes)
      : timing.offsetMin === 0
        ? t(inline ? 'notices.time.atShkiaInline' : 'notices.time.atShkia')
        : t('notices.time.beforeShkia', { minutes: 0 - timing.offsetMin });
  if (!inline) return time;
  const days = noticeDaysBefore(setting, defaultDaysBefore);
  return t(days === 1 ? 'notices.days.one' : days === 2 ? 'notices.days.two' : 'notices.days.many', {
    count: days,
    time,
  });
}

export function NoticeSettingsCard<K extends string>({
  icon,
  topic,
  kinds,
  notices,
  masterOn,
  onChange,
}: Props<K>): React.ReactElement {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { height: windowHeight } = useWindowDimensions();
  const [refused, setRefused] = useState(false);
  const [editing, setEditing] = useState<K | null>(null);
  const [anchor, setAnchor] = useState<NoticeTiming['anchor']>('shkia');
  const [lead, setLead] = useState(0);
  const [time, setTime] = useState('');
  const [days, setDays] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const option = kinds.find((candidate) => candidate.kind === editing);

  useEffect(() => {
    if (!masterOn) setRefused(false);
  }, [masterOn]);

  const toggle = (kind: K, value: boolean) => {
    const next = { ...notices[kind], enabled: value };
    if (!noticeChangeAllowed(masterOn, notices, kind, next)) {
      setRefused(true);
      return;
    }
    setRefused(false);
    onChange(kind, next);
  };

  const open = (target: NoticeKindOption<K>) => {
    const setting = notices[target.kind];
    const timing = noticeTimingOf(setting);
    setAnchor(timing.anchor);
    setLead(timing.anchor === 'shkia' ? 0 - timing.offsetMin : 0);
    setTime(timing.anchor === 'clock' ? minutesToTime(timing.minutes) : '');
    setDays(target.defaultDaysBefore === undefined ? 0 : noticeDaysBefore(setting, target.defaultDaysBefore));
    setError(null);
    setEditing(target.kind);
  };

  const save = () => {
    if (!option) return;
    if (anchor === 'clock' && !TIME_PATTERN.test(time)) {
      setError(t('reminder.errors.timeRequired'));
      return;
    }
    const timing: NoticeTiming =
      anchor === 'clock'
        ? { anchor: 'clock', minutes: timeToMinutes(time) }
        : { anchor: 'shkia', offsetMin: lead > 0 ? -lead : 0 };
    onChange(option.kind, {
      enabled: notices[option.kind].enabled,
      timing,
      ...(option.defaultDaysBefore !== undefined ? { daysBefore: days } : {}),
    });
    setEditing(null);
  };

  return (
    <>
      <Card divided>
        {kinds.map((candidate) => {
          const setting = notices[candidate.kind];
          return (
            <ListRow
              key={candidate.kind}
              icon={icon}
              iconTone={setting.enabled ? 'accent' : 'muted'}
              title={candidate.title}
              caption={noticeCaption(setting, candidate.defaultDaysBefore, t)}
              onPress={() => open(candidate)}
              trailing={
                <Switch
                  value={setting.enabled}
                  onValueChange={(value) => toggle(candidate.kind, value)}
                  accessibilityLabel={candidate.title}
                  thumbColor={BRAND.white}
                  trackColor={{ false: colors.border, true: colors.gold }}
                />
              }
            />
          );
        })}
      </Card>
      {refused ? (
        <Text style={[typography.small, styles.error, { color: colors.urgent }]}>{t('notices.errors.lastKind')}</Text>
      ) : null}
      <BottomSheet visible={editing !== null} title={option?.title} caption={topic} onClose={() => setEditing(null)}>
        <ScrollView
          style={{ maxHeight: windowHeight * BODY_HEIGHT_SHARE }}
          contentContainerStyle={styles.fields}
          keyboardShouldPersistTaps="handled"
        >
          <SegmentedControl
            options={[
              { value: 'shkia', label: t('notices.time.atShkia') },
              { value: 'clock', label: t('reminder.anchor.clock') },
            ]}
            value={anchor}
            onChange={setAnchor}
            style={styles.anchor}
          />
          {anchor === 'shkia' ? (
            <>
              <SectionLabel variant="field" text={t('notices.leadLabel')} />
              <ChipRow values={NOTICE_SHKIA_LEADS_MIN} selected={lead} onSelect={setLead} renderLabel={String} />
            </>
          ) : (
            <TimeField inline label={t('reminder.time')} value={time} onChange={setTime} />
          )}
          {option?.defaultDaysBefore !== undefined ? (
            <>
              <SectionLabel variant="field" text={t('notices.daysLabel')} />
              <ChipRow values={NOTICE_DAYS_BEFORE} selected={days} onSelect={setDays} renderLabel={String} />
            </>
          ) : null}
          {error ? <Text style={[typography.small, styles.error, { color: colors.urgent }]}>{error}</Text> : null}
          <Button label={t('common.save')} onPress={save} style={styles.save} />
        </ScrollView>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: spacing.sm,
  },
  anchor: {
    marginBottom: spacing.md,
  },
  error: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  save: {
    marginTop: spacing.md,
  },
});
