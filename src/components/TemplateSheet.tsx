import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { BottomSheet } from '@/components/BottomSheet';
import { ListRow } from '@/components/ListRow';
import { iconFor } from '@/components/MitzvahIcon';
import {
  CUSTOM_TEMPLATES,
  CustomTemplate,
  mitzvahFromTemplate,
  templateBenefitKey,
  templateNameKey,
} from '@/data/customTemplates';
import { useI18n } from '@/i18n';
import { makeCustomMitzvahId, useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { appDayKey } from '@/utils/locationDay';

type Props = { visible: boolean; onClose: () => void };

// "Add a mitzvah" (D2): a template is created in one tap and opens on its mitzvah screen, where the add can be
// undone; a template already added opens the mitzvah it made; "my own" opens the full form.
export function TemplateSheet({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const location = useUserStore((s) => s.location);
  const items = useCustomMitzvotStore((s) => s.items);
  const addedId = (template: CustomTemplate) => Object.values(items).find((item) => item.template === template.id)?.id;

  const daysLabel = ({ days }: CustomTemplate) =>
    days.length === 1
      ? t(`weekday.long.${days[0]}`)
      : `${t(`weekday.short.${days[0]}`)}–${t(`weekday.short.${days[days.length - 1]}`)}`;

  const choose = (template: CustomTemplate) => {
    onClose();
    const existing = addedId(template);
    if (existing) {
      router.push({ pathname: '/mitzvah/[id]', params: { id: existing } });
      return;
    }
    const id = makeCustomMitzvahId();
    const name = t(templateNameKey(template.id));
    useCustomMitzvotStore
      .getState()
      .add(mitzvahFromTemplate(template, name, appDayKey(new Date(), location), id, Date.now()));
    useMitzvotStore.getState().setEnabled(id, true);
    router.push({ pathname: '/mitzvah/[id]', params: { id, added: '1' } });
  };

  return (
    <BottomSheet visible={visible} title={t('templates.title')} caption={t('templates.lead')} onClose={onClose}>
      <ScrollView style={styles.body}>
        {CUSTOM_TEMPLATES.map((template) => {
          const hours = t('templates.hours', {
            days: daysLabel(template),
            start: template.startHHMM,
            end: template.endHHMM,
          });
          return (
            <ListRow
              key={template.id}
              icon={iconFor(template.icon)}
              title={t(templateNameKey(template.id))}
              caption={`${t(templateBenefitKey(template.id))}\n${hours}`}
              trailing={
                addedId(template) ? (
                  <Text style={[typography.captionBold, { color: colors.goldText }]}>{t('templates.added')}</Text>
                ) : undefined
              }
              onPress={() => choose(template)}
            />
          );
        })}
        <ListRow
          icon="plus"
          title={t('templates.mine')}
          caption={t('templates.mineCaption')}
          chevron
          onPress={() => {
            onClose();
            router.push('/custom-mitzvah');
          }}
        />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { flexShrink: 1 },
});
