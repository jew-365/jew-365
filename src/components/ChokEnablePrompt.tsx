import React from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useI18n } from '@/i18n';
import { switchChokOn } from '@/services/ChokContentService';
import { useChokStore } from '@/stores/useChokStore';

export function ChokEnablePrompt() {
  const { t } = useI18n();
  const pending = useChokStore((s) => s.enablePrompt);
  const close = () => useChokStore.getState().setEnablePrompt(false);

  return (
    <ConfirmDialog
      visible={pending}
      title={t('chok.enablePrompt.title')}
      body={t('chok.enablePrompt.body')}
      confirmLabel={t('common.yes')}
      cancelLabel={t('common.no')}
      onConfirm={() => {
        close();
        switchChokOn();
      }}
      onCancel={close}
    />
  );
}
