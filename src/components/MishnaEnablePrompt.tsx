import React from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { findAnyMitzvah } from '@/data/customMitzvotAdapter';
import { useI18n } from '@/i18n';
import { switchMishnaOn } from '@/services/MishnaContentService';
import { useMishnaStore } from '@/stores/useMishnaStore';
import { mitzvahName } from '@/utils/mitzvahName';

// After a first Mishnah download from a mitzvah's screen while that mitzvah is off: switch it on? (as
// ShnayimEnablePrompt does).
export function MishnaEnablePrompt() {
  const { t, language } = useI18n();
  const pending = useMishnaStore((s) => s.enablePrompt);
  const mitzvah = pending ? findAnyMitzvah(pending) : undefined;
  const close = () => useMishnaStore.getState().setEnablePrompt(null);

  return (
    <ConfirmDialog
      visible={mitzvah !== undefined}
      title={t('mishna.enablePrompt.title')}
      body={t('mishna.enablePrompt.body', { name: mitzvah ? mitzvahName(mitzvah, language) : '' })}
      confirmLabel={t('common.yes')}
      cancelLabel={t('common.no')}
      onConfirm={() => {
        close();
        if (pending) switchMishnaOn(pending);
      }}
      onCancel={close}
    />
  );
}
